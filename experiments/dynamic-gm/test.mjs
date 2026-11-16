import {OriginHost as ST119Mock} from './publication.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Journal,copy,digest} from '../architecture201/journal.mjs';import {Scheduler} from '../architecture201/scheduler.mjs';import {HeldPublication} from '../architecture201/host.mjs';
import {fixtures} from '../architecture201/fixtures.mjs';import {foldChat,prepare,validate,content} from '../architecture201/engine.mjs';import {DynamicGM,recall} from './runtime.mjs';
import {harness,semantic} from '../architecture201/harness.mjs';
const f=n=>copy(fixtures().find(x=>x.name===n));
function setup(x){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dynamic-gm-'));const j=new Journal(path.join(dir,'j.json'),x.base),s=new Scheduler(j,{now:()=>100}),h=new ST119Mock(path.join(dir,'h.json')),p=new HeldPublication(j,h),g=new DynamicGM(j,s,p);g.begin('t',x.input);return {j,s,h,p,g};}
const script=arr=>async r=>{const a=arr[Number(r.phase.split(':')[1])];if(!a)throw Error('missing script');return JSON.stringify(a);};
const finish=x=>({op:'finish',narration:x.narration,world:x.world});
const travel=x=>[{op:'resolve',commands:JSON.parse(x.plans[0]).commands},{...finish(x),op:'world',continue:true},{op:'finish',use_result:true}];
const state=h=>semantic(foldChat(h.j.read().world.chat).state);
const promises=s=>Object.values(s.threads).filter(t=>/old ford tomorrow/.test(t.text));

test('G1 direct creative promise: one physical request, no extractor, B equivalent, reload dedup',async()=>{
 const x=f('npc_promise'),h=setup(x);await h.g.run('t',script([finish(x)]));const a=state(h);assert.equal(promises(a).length,1);assert.equal(h.j.read().requests.length,1);
 await new DynamicGM(new Journal(h.j.file),new Scheduler(h.j),h.p).run('t',()=>{throw Error('no repeat');});assert.deepEqual(state(h),a);
 const b=harness(x,'B');await b.prototype.run('t1',x,b.transport);assert.deepEqual(a,semantic(foldChat(b.journal.read().world.chat).state));assert.equal(b.journal.read().requests.length,3);
 const next=new DynamicGM(h.j,h.s,h.p);next.begin('next','I greet Wat again.');
 const messages=next.prompt(h.j.read().turns.next);assert.ok(!JSON.stringify(messages).includes(x.narration));
 await next.run('next',script([{op:'recall',who:'npc.wat'},{op:'finish',narration:'Wat grinned at Alaric.',world:{scene:a.scene.at,expected:{},deltas:[]}}]));
 const req=h.j.read().requests.at(-1);assert.match(JSON.stringify(req.messages),/old ford tomorrow/);assert.match(JSON.stringify(req.messages),/voice/);
});

test('G2 original forest: GM chooses GO, world tool resolves actual new place; 3 requests once',async()=>{
 const x=f('forest200'),h=setup(x);await h.g.run('t',script(travel(x)));assert.equal(h.j.read().requests.length,3);assert.notEqual(state(h).scene.at,foldChat(x.base).state.scene.at);
 assert.equal(h.j.read().turns.t.prepared.chat.at(-1).extra.avereth.events.filter(e=>e.t==='turn.begun').length,1);
 const b=harness(x,'B');await b.prototype.run('t1',x,b.transport);assert.deepEqual(state(h),semantic(foldChat(b.journal.read().world.chat).state));
});

test('G2 partial travel: explicitly not arrived keeps original position',async()=>{
 const x=f('forest200'),h=setup(x),w={scene:foldChat(x.base).state.scene.at,expected:{1:{arrived:false,at:null,with:null,met:null}},deltas:[]};
 await h.g.run('t',script([{op:'resolve',commands:JSON.parse(x.plans[0]).commands},{op:'world',continue:true,narration:'Alaric remained at the roadside verge; he had not reached the forest.',world:w},{op:'finish',use_result:true}]));assert.equal(state(h).scene.at,foldChat(x.base).state.scene.at);
});

test('G3 unsupported distraction/theft is blocked rather than inventing a rule or condition result',async()=>{
 for(const input of ['I distract Wat and take the key only if he looks away.','I do not distract Wat or take the key.']){
 const x=f('npc_promise');x.input=input;const h=setup(x);await assert.rejects(h.g.run('t',script([{op:'resolve',commands:[{seq:1,type:'distract',who:'npc.wat',quote:input},{seq:2,type:'steal',needs:1,object:'key',quote:input}]}])),/preparation|generator/);assert.equal(h.j.read().world.revision,0);assert.equal(h.h.dom.size,0);
 }
});

test('G4 NPC gift: actual object transfer through existing world rules, 2 physical requests',async()=>{
 const x=f('npc_promise');x.narration='Wat handed Alaric a plain wooden token as a gift.';
 x.world={scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]};
 const h=setup(x);await h.g.run('t',script([{...finish(x),op:'world',continue:true},{op:'finish',use_result:true}]));assert.equal(h.j.read().requests.length,2);assert.ok(Object.values(state(h).objects).some(o=>o.name==='plain wooden token'&&o.holder?.entity==='pc'));
});

test('G4 invalid transfer and second mechanical batch cannot commit',async()=>{
 const x=f('npc_promise'),h=setup(x);await assert.rejects(h.g.run('t',script([{op:'world',continue:true,narration:'Wat gave Alaric a sword.',world:{scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.move',object:'missing.sword',qty:1,to:'pc'}]}}])),/schema|rejected/);assert.equal(h.j.read().world.revision,0);
 const t=setup(x);await assert.rejects(t.g.run('t',script([{op:'resolve',commands:[]},{op:'resolve',commands:[]}])),/already resolved/);assert.equal(t.j.read().world.revision,0);
});

for(const point of ['after_response','after_tool','before_commit','save_during','save_after','after_commit','after_host_save','after_display'])test(`durable recovery ${point}: no re-request of completed phase, no reroll`,async()=>{
 const x=f('forest200'),h=setup(x),reference=setup(x);await reference.g.run('t',script(travel(x)));let fired=false;
 await assert.rejects(h.g.run('t',script(travel(x)),{hook:where=>{if(fired)return;if(point.startsWith('save_')&&where==='before_commit'){fired=true;h.j.fail=point==='save_during'?'during':'after';}else if(where===point){fired=true;throw Error('crash');}}}));
 const j=new Journal(h.j.file),g=new DynamicGM(j,new Scheduler(j),h.p);await g.run('t',script(travel(x)));assert.deepEqual(state(h),state(reference));assert.equal(j.read().requests.length,3);assert.equal(h.h.dom.size,1);
});

test('timeout after engineer result retains capacity and continuation resumes without replay',async()=>{
 const x=f('forest200'),h=setup(x);await assert.rejects(h.g.run('t',async r=>{if(r.phase==='gm:2')throw Error('timeout');return script(travel(x))(r);}),/timeout/);
 const candidate=digest(h.j.read().turns.t.candidate);assert.equal(h.s.occupancy(),4);await assert.rejects(h.g.run('t',script(travel(x))),/backoff|capacity/);
 h.s.remoteComplete('t:gm:2:attempt:1');h.s.now=()=>200;await h.g.run('t',script(travel(x)));assert.equal(digest(h.j.read().turns.t.candidate),candidate);assert.equal(h.j.read().requests.length,4);
});

test('COUNTEREXAMPLES: omitted promise and prose contradiction remain semantic failures',async()=>{
 const x=f('npc_promise'),h=setup(x);x.world.deltas=[];await h.g.run('t',script([finish(x)]));assert.equal(promises(state(h)).length,0);
 const y=f('known_move');y.narration='Alaric did not go to Alderwatch. He stayed at the roadside verge.';const t=setup(y);await t.g.run('t',script(travel(y)));assert.equal(state(t).scene.at,'loc.alderwatch');assert.match([...t.h.dom.values()][0],/did not go/);
});

test('recall filters knowledge by actor, but cannot prove prose knowledge or PC consent',()=>{
 const s=foldChat(f('npc_promise').base).state;s.claims.secret={id:'secret',s:'pc',p:'secret',o:'private code'};s.knowledge.pc={secret:{stance:'knows'}};assert.ok(!JSON.stringify(recall(s,'npc.wat')).includes('private code'));
});

test('G4 newcomer attack is refused by existing closed PULSE window',async()=>{
 const x=f('npc_promise'),h=setup(x),person=f('new_person').world.deltas[0];
 Object.assign(person,{ref:'rask',name:'Rask',role:'bandit',at:foldChat(x.base).state.scene.at,desc:['bandit'],threat:true});
 await assert.rejects(h.g.run('t',script([{op:'world',continue:true,narration:'Rask the bandit came over and attacked Alaric with his knife.',world:{scene:foldChat(x.base).state.scene.at,expected:{},deltas:[person,{seq:2,type:'hostile',by:['rask'],scope:null,evidence:'Rask the bandit came over and attacked Alaric with his knife.'}]}}])),/pulse/);
 assert.equal(h.j.read().world.revision,0);
});

test('COUNTEREXAMPLE: invented PC consent is not semantically detected in free prose',async()=>{
 const x=f('npc_promise'),h=setup(x);x.narration+=' Alaric agreed to pay Wat tomorrow.';await h.g.run('t',script([finish(x)]));assert.match([...h.h.dom.values()][0],/Alaric agreed/);
});

test('G4 timeout after transfer calculation: resume reuses the object events once',async()=>{
 const x=f('npc_promise');x.narration='Wat handed Alaric a plain wooden token as a gift.';x.world={scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]};
 const h=setup(x),a=[{...finish(x),op:'world',continue:true},{op:'finish',use_result:true}];
 await assert.rejects(h.g.run('t',r=>r.phase==='gm:1'?Promise.reject(Error('timeout')):script(a)(r)),/timeout/);
 const candidate=digest(h.j.read().turns.t.candidate);assert.equal(h.s.occupancy(),4);assert.equal(h.j.read().world.revision,0);
 h.s.remoteComplete('t:gm:1:attempt:1');h.s.now=()=>200;await h.g.run('t',script(a));await h.g.run('t',()=>{throw Error('no repeat');});
 assert.equal(digest(h.j.read().turns.t.candidate),candidate);assert.equal(Object.values(state(h).objects).filter(o=>o.name==='plain wooden token'&&o.holder?.entity==='pc').length,1);assert.equal(h.j.read().requests.length,3);
});

test('situational schema lookup is a counted continuation, not an invisible planner',async()=>{
 const x=f('npc_promise'),h=setup(x);await h.g.run('t',script([{op:'describe',domain:'commands',types:['go']},finish(x)]));assert.equal(h.j.read().requests.length,2);assert.equal(JSON.parse(h.j.read().requests[1].messages[1].content).results[0].schema[0].type,'go');
});
