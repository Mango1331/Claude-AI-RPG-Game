import {OriginHost as ST119Mock} from './publication.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {Journal,copy,digest} from '../architecture201/journal.mjs';import {Scheduler} from '../architecture201/scheduler.mjs';import {HeldPublication} from '../architecture201/host.mjs';import {fixtures} from '../architecture201/fixtures.mjs';import {foldChat,rec,content} from '../architecture201/engine.mjs';import {DynamicGM,recall} from './runtime.mjs';
export const f=n=>copy(fixtures().find(x=>x.name===n));
export function setup(x){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gm-safe-'));const j=new Journal(path.join(dir,'j.json'),x.base),s=new Scheduler(j,{now:()=>100}),h=new ST119Mock(path.join(dir,'h.json')),p=new HeldPublication(j,h),g=new DynamicGM(j,s,p);g.begin('t',x.input);return {j,s,h,p,g};}
const finish=x=>({op:'finish',narration:x.narration,world:x.world});
const script=arr=>async r=>JSON.stringify(arr[Number(r.phase.split(':')[1])]);
const state=h=>foldChat(h.j.read().world.chat).state;
for(const stage of ['pending','published'])test(`A durable origin rejects wrong chat resume: ${stage}`,async()=>{
 const x=f('npc_promise'),h=setup(x);if(stage==='published')await h.g.run('t',script([finish(x)]));h.h.switchChat('other');
 const g=new DynamicGM(new Journal(h.j.file),new Scheduler(h.j),h.p);
 await assert.rejects(g.run('t',script([finish(x)])),/chat/);assert.equal(h.h.dom.size,0);assert.equal(h.h.readChat().length,0);
 h.h.switchChat('fixture');h.h.reload();await g.run('t',script([finish(x)]));assert.equal(h.h.dom.size,1);assert.equal(h.j.read().requests.length,1);
});
for(const action of ['stop','switch'])test(`B invalidation during before_commit prevents world write: ${action}`,async()=>{
 const x=f('npc_promise'),h=setup(x);await assert.rejects(h.g.run('t',script([finish(x)]),{hook:async where=>{if(where==='before_commit'){await Promise.resolve();if(action==='stop')h.h.stop();else h.h.switchChat('other');}}}),/stale|chat/);
 assert.equal(h.j.read().world.revision,0);assert.equal(h.h.dom.size,0);h.h.switchChat('fixture');h.h.reload();await h.g.run('t',script([finish(x)]));assert.equal(h.j.read().requests.length,1);
});
function gift(){const x=f('npc_promise');x.narration='Wat handed Alaric a plain wooden token as a gift.';x.world={scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]};return x;}
const promise={id:'ford',speaker:'npc.wat',text:'I will show you the old ford tomorrow.',to:['pc'],promise:true};
const continuation={op:'finish',continuation:true,narration:'Wat looked toward the reeds, then lowered his voice.',speech:[promise]};
const mechanical=s=>JSON.stringify({...s,threads:null});
for(const op of ['world','finish'])test(`complete validated gift needs one request: ${op}`,async()=>{const x=gift(),h=setup(x);await h.g.run('t',script([{...finish(x),op}]));assert.equal(h.j.read().requests.length,1);assert.ok(Object.values(state(h).objects).some(o=>o.name==='plain wooden token'&&o.holder?.entity==='pc'));});

test('true creative continuation appends new promise without clock/RNG/PULSE/loot repetition',async()=>{
 const x=gift(),h=setup(x);await h.g.run('t',script([{...finish(x),op:'world',continue:true},continuation]));
 const t=h.j.read().turns.t;assert.equal(h.j.read().requests.length,2);assert.equal(mechanical(state(h)),mechanical(foldChat(t.candidate).state));
 assert.ok(Object.values(state(h).threads).some(th=>th.text.includes(promise.text)));assert.ok(t.chat.at(-1).mes.startsWith(x.narration));assert.match(t.chat.at(-1).mes,/lowered his voice/);
 assert.equal(rec(t.chat.at(-1)).events.filter(e=>e.t==='object.moved').length,1);
 await h.g.run('t',()=>{throw Error('duplicate');});assert.equal(h.j.read().requests.length,2);
});
for(const bad of [{world:{}},{claims:{at:'loc.somewhere'}},{use_result:true,narration:'Replacement'}])test(`continuation cannot revise mechanics ${JSON.stringify(bad)}`,async()=>{
 const x=gift(),h=setup(x);await assert.rejects(h.g.run('t',script([{...finish(x),op:'world',continue:true},{...continuation,...bad}])),/replace|contradictory|alter/);assert.equal(h.j.read().world.revision,0);assert.ok(h.j.read().turns.t.candidate);
});
for(const point of ['after_tool','before_commit','save_after','after_display'])test(`creative continuation recovery ${point}`,async()=>{
 const x=gift(),h=setup(x),a=[{...finish(x),op:'world',continue:true},continuation];let fired=false;
 await assert.rejects(h.g.run('t',script(a),{hook:where=>{if(fired)return;if(point==='save_after'&&where==='before_commit'){fired=true;h.j.fail='after';}else if(point===where){fired=true;throw Error('crash');}}}));
 await new DynamicGM(new Journal(h.j.file),new Scheduler(h.j),h.p).run('t',script(a));assert.equal(h.j.read().requests.length,2);assert.equal(Object.values(state(h).threads).filter(th=>th.text.includes(promise.text)).length,1);assert.equal(h.h.dom.size,1);
});
function inject(x,event){rec(x.base.findLast(m=>rec(m))).events.push(event);return x;}
function potion(){const x=f('npc_promise');x.input='I drink the healing potion.';return inject(x,{t:'object.created',d:{object:{id:'obj.test.potion',name:'healing potion',kind:'item',use:'consumable',effect:'heal',qty:1,holder:{entity:'pc'},marks:[]}}});}
for(const batch of [false,true])test(`omitted held potion cannot silently finish (empty resolve=${batch})`,async()=>{
 const x=potion(),h=setup(x);await assert.rejects(h.g.run('t',script(batch?[{op:'resolve',commands:[]},finish(x)]:[finish(x)])),/unresolved player action/);assert.equal(h.j.read().world.revision,0);assert.equal(state(h).objects['obj.test.potion'].qty,1);
});
test('selected potion use resolves through real engine and completes once',async()=>{
 const x=potion(),h=setup(x);await h.g.run('t',script([{op:'resolve',commands:[{seq:1,type:'use',object:'obj.test.potion',qty:1,quote:'I drink the healing potion'}]},{op:'finish',narration:'Alaric drank the healing potion.',world:{scene:foldChat(x.base).state.scene.at,expected:{},deltas:[]}}]));
 assert.equal(state(h).objects['obj.test.potion'].holder.consumed,'pc');assert.equal(h.j.read().requests.length,2);
});
for(const input of ['I do not drink the healing potion.','"I drink the healing potion," Wat says.'])test(`no automatic use for ${input}`,async()=>{
 const x=potion();x.input=input;const h=setup(x);try{await h.g.run('t',script([finish(x)]));}catch(e){assert.match(e.message,/unresolved/);}assert.equal(state(h).objects['obj.test.potion'].qty,1);
});
for(const held of [false,true])test(`G3 supported take then needs-go, NPC retains object=${held}`,async()=>{
 const x=f('forest200');x.input='I take the wooden key and go to Alderwatch.';const s=foldChat(x.base).state;
 inject(x,{t:'object.created',d:{object:{id:'obj.key',name:'wooden key',kind:'item',qty:1,holder:held?{entity:'npc.guard'}:{loc:s.scene.at},marks:[]}}});
 if(held){inject(x,{t:'entity.created',d:{entity:{id:'npc.guard',name:'Guard',kind:'npc',status:'alive',at:s.scene.at,location:s.scene.location,descriptors:['guard']}}});inject(x,{t:'scene.entered',d:{id:'npc.guard'}});}
 const h=setup(x),commands=[{seq:1,type:'take',object:'obj.key',qty:1,quote:'I take the wooden key'},{seq:2,type:'go',to:'loc.alderwatch',needs:1,quote:'go to Alderwatch'}];
 const world=held?{scene:s.scene.at,expected:{},deltas:[]}:{scene:'loc.alderwatch',expected:{2:{arrived:true,at:'loc.alderwatch',with:null,met:null}},deltas:[{seq:1,type:'arrive',at:'loc.alderwatch',forced_by:null,with:null}]};
 await h.g.run('t',script([{op:'resolve',commands},{op:'finish',narration:held?'The guard kept the key. Alaric remained at the verge.':'Alaric took the wooden key and arrived in Alderwatch.',world}]));
 const resolutions=foldChat(h.j.read().turns.t.prepared.chat).state.last.outcome.resolutions;
 assert.deepEqual(resolutions.map(r=>r.status),held?['refused','refused']:['resolved','authorized']);assert.equal(state(h).objects['obj.key'].holder.entity,held?'npc.guard':'pc');assert.equal(state(h).scene.at,held?s.scene.at:'loc.alderwatch');
 const stable=digest(state(h));await h.g.run('t',()=>{throw Error('retry');});assert.equal(digest(state(h)),stable);
});

test('structured NPC promise shares one speech source with persisted thread',async()=>{
 const x=f('npc_promise'),h=setup(x);await h.g.run('t',script([{op:'finish',narration:'Wat smiled.',speech:[promise],world:{scene:foldChat(x.base).state.scene.at,expected:{},deltas:[]}}]));assert.ok(Object.values(state(h).threads).some(th=>th.text.includes(promise.text)));assert.match([...h.h.dom.values()][0],/old ford tomorrow/);
});
test('structured invented PC consent and conflicting arrival claims are rejected',async()=>{
 const x=f('npc_promise'),h=setup(x);await assert.rejects(h.g.run('t',script([{...finish(x),speech:[{id:'yes',speaker:'pc',text:'I agree.'}]}])),/unauthorized PC/);
 const y=setup(x);await assert.rejects(y.g.run('t',script([{...finish(x),claims:{at:'loc.other'}}])),/contradictory structured/);
});
test('two present NPC perspectives remain separate; GM nevertheless sees both, semantic leak stays open',()=>{
 const x=f('npc_promise'),s=foldChat(x.base).state,other=s.scene.present.find(id=>id!=='pc'&&id!=='npc.wat');assert.ok(other);
 for(const [id,secret] of [['npc.wat','WAT_SECRET'],[other,'OTHER_SECRET']]){s.claims[secret]={id:secret,s:id,p:'secret',o:secret};s.knowledge[id]={[secret]:{stance:'believes'}};}
 assert.ok(!JSON.stringify(recall(s,'npc.wat')).includes('OTHER_SECRET'));assert.ok(!JSON.stringify(recall(s,other)).includes('WAT_SECRET'));
 // This deliberately demonstrates the single-GM visibility boundary, not a guarantee against prose leakage.
 const combined=JSON.stringify([recall(s,'npc.wat'),recall(s,other)]);assert.match(combined,/WAT_SECRET/);assert.match(combined,/OTHER_SECRET/);
});

test('bound publication resume also rejects wrong chat after completed save',async()=>{
 const x=f('npc_promise'),h=setup(x);await h.g.run('t',script([finish(x)]));h.h.switchChat('wrong');await assert.rejects(h.g.publication.resume('t'),/chat/);assert.equal(h.h.readChat().length,0);
});
test('typed NPC speech cannot cite a secret owned by another present actor',async()=>{
 const x=f('npc_promise'),s=foldChat(x.base).state,other=s.scene.present.find(id=>!['pc','npc.wat'].includes(id));
 inject(x,{t:'claim.created',d:{claim:{id:'claim.other.secret',s:other,p:'secret',o:'OTHER_SECRET',truth:'unknown'}}});
 inject(x,{t:'knowledge.gained',d:{who:other,about:'claim.other.secret',stance:'believes',source:'told',turn:s.turn,minute:s.clock.minute}});
 const h=setup(x);await assert.rejects(h.g.run('t',script([{...finish(x),speech:[{id:'leak',speaker:'npc.wat',text:'I know the secret.',knowledgeRefs:['claim.other.secret']}]}])),/lacks referenced knowledge/);assert.equal(h.j.read().world.revision,0);
});
test('COUNTEREXAMPLE continuation can still contradict its immutable prefix in untyped prose',async()=>{
 const x=gift(),h=setup(x);await h.g.run('t',script([{...finish(x),op:'world',continue:true},{op:'finish',continuation:true,narration:'Wat never handed Alaric any token.'}]));
 assert.ok(Object.values(state(h).objects).some(o=>o.name==='plain wooden token'&&o.holder.entity==='pc'));assert.match([...h.h.dom.values()][0],/never handed/);
});

test('chat switch inside asynchronous save targets only the origin, never active replacement chat',async()=>{
 const x=f('npc_promise'),h=setup(x),save=h.h.saveChatFor.bind(h.h);let target;
 h.h.saveChatFor=async(id,args)=>{target=id;await Promise.resolve();h.h.switchChat('other');return save(id,args);};
 await assert.rejects(h.g.run('t',script([finish(x)])),/changed|stale/);assert.equal(target,'fixture');assert.equal(h.h.readChatFor('other').length,0);assert.ok(h.h.readChatFor('fixture').length);assert.equal(h.h.dom.size,0);
 h.h.switchChat('fixture');h.h.reload();await h.g.run('t',()=>{throw Error('no new request');});assert.equal(h.j.read().requests.length,1);assert.equal(h.h.dom.size,1);
});
