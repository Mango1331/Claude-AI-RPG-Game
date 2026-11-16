import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixtures } from '../../architecture201/fixtures.mjs';
import { loadProductContent } from '../../../avereth-engine/tests/helpers.js';
import { configure, foldChat } from '../../../avereth-gm-alpha/gm/engine.js';
import { DynamicGM } from '../../../avereth-gm-alpha/gm/runtime.js';
import { Journal } from '../../../avereth-gm-alpha/gm/storage.js';
import { Scheduler } from '../../../avereth-gm-alpha/gm/scheduler.js';
import { ensureCampaign } from '../../../avereth-gm-alpha/src/host.js';
import { sameTranscript } from '../../../avereth-gm-alpha/gm/host.js';
configure(await loadProductContent());
const copy=structuredClone,fixture=n=>copy(fixtures().find(f=>f.name===n));
const finish=x=>({op:'finish',narration:x.narration,world:x.world});
class MemoryStore { data={}; async read(n){return copy(this.data[n]||null);} async write(n,x){this.data[n]=copy(x);} }
async function harness(x) {
 const store=new MemoryStore(),host={chatId:'origin',epoch:0,id(){return this.chatId;},token(){return {id:this.chatId,epoch:this.epoch};},current(t){return t.id===this.chatId&&t.epoch===this.epoch;}};
 const j=await Journal.open(store,'j',{revision:0,originChatId:'origin',world:{revision:0,chat:x.base},turns:{}});
 const ledger=await Journal.open(store,'l',{revision:0,leases:{}}),scheduler=new Scheduler(ledger,{timeout:20});
 const pub={host,async publish(id,t){assert.ok(host.current(t));await j.update(d=>{d.turns[id].phase='published';});}};
 const g=new DynamicGM(j,scheduler,pub);await g.begin('t',x.input);
 return {g,j,ledger,scheduler,host,store};
}
const script=answers=>async r=>JSON.stringify(answers[Number(r.id.match(/:gm:(\d+)/)[1])]);
for(const name of ['npc_promise','forest200','known_move'])test(`Alpha ${name} commits through unchanged engine`,async()=>{
 const x=fixture(name),h=await harness(x),answers=name==='npc_promise'?[finish(x)]:[{op:'resolve',commands:JSON.parse(x.plans[0]).commands},finish(x)];
 await h.g.run('t',script(answers));assert.equal(h.j.read().world.revision,1);assert.equal(h.j.read().turns.t.phase,'published');
 const before=copy(h.j.read().world);await h.g.run('t',()=>{throw Error('repeat');});assert.deepEqual(h.j.read().world,before);
});
test('creation and #status are local, preserve class/skills and HUD',async()=>{
 const base=[{name:'Avereth',mes:'Location: Public roadside verge outside Alderwatch, Kingdom of Valdorn',is_user:false,extra:{}}];
 ensureCampaign(base,await loadProductContent(),{seed:1,runtime:'v4',planner:true,ruleset:2});
 let chat=base;
 for(const input of ['Warrior','Heavy Slash and Guard','#status']){
  const h=await harness({base:chat,input});await h.g.run('t',()=>{throw Error('no model');});chat=h.j.read().world.chat;
  assert.equal(Object.keys(h.ledger.read().leases).length,0);assert.match(chat.at(-1).extra.display_text,/avereth/);
 }
 const state=foldChat(chat).state;assert.equal(state.mode,'story');assert.equal(state.entities.pc.sheet.class,'warrior');
 assert.deepEqual(state.entities.pc.sheet.stats,{STR:6,VIT:6,AGI:5,INT:5,PER:5,WIL:5});
});
test('stop immediately before commit prevents world advancement; same-chat receipt resumes',async()=>{
 const x=fixture('npc_promise'),h=await harness(x);
 await assert.rejects(h.g.run('t',script([finish(x)]),{hook:async p=>{if(p==='before_commit')h.host.epoch++;}}),/Stopped/);
 assert.equal(h.j.read().world.revision,0);
 h.host.chatId='other';await assert.rejects(h.g.run('t',()=>{}),/origin/);h.host.chatId='origin';
 await h.g.run('t',()=>{throw Error('repeat request');});assert.equal(h.j.read().world.revision,1);
});
test('timeout persists capacity across instances; late answer permits explicit resume only',async()=>{
 const x=fixture('npc_promise'),h=await harness(x);let complete;
 await assert.rejects(h.g.run('t',()=>new Promise(r=>complete=r)),/timeout/);
 assert.equal(new Scheduler(await Journal.open(h.store,'l')).occupancy(),4);
 await assert.rejects(h.g.run('t',()=>{throw Error('must not dispatch');}),/capacity/);
 complete(JSON.stringify(finish(x)));await new Promise(r=>setTimeout(r,5));assert.equal(h.j.read().world.revision,0);
 await h.g.run('t',()=>{throw Error('receipt');});assert.equal(h.j.read().world.revision,1);
});
test('gift continuation transfers once and adds promise without time/RNG rerun',async()=>{
 const x=fixture('npc_promise');x.narration='Wat handed Alaric a plain wooden token as a gift.';
 x.world={scene:foldChat(x.base).state.scene.at,expected:{},deltas:[{seq:1,type:'object.new',name:'plain wooden token',kind:'item',qty:1,holder:'npc.wat',effect:null,unit:null,for_quest:null,in:null,teaches:null},{seq:2,type:'object.move',object:{new:'plain wooden token'},qty:1,to:'pc'}]};
 const h=await harness(x);await h.g.run('t',script([{...finish(x),op:'world',continue:true},{op:'finish',continuation:true,narration:'Wat smiled.',speech:[{id:'promise',speaker:'npc.wat',text:'I will show you the ford tomorrow.',to:['pc'],promise:true}]}]));
 const t=h.j.read().turns.t,a=foldChat(t.candidate).state,b=foldChat(t.chat).state;
 assert.equal(a.rng.n,b.rng.n);assert.equal(a.clock.minute,b.clock.minute);assert.ok(Object.values(b.threads).some(t=>t.text.includes('ford tomorrow')));
 assert.match(t.chat.at(-1).extra.display_text,/Wat smiled/);
});
test('package contains no Node imports, core/content files are byte-identical .200',()=>{
 const root=new URL('../../../avereth-gm-alpha/',import.meta.url),proof=JSON.parse(fs.readFileSync(new URL('ENGINE_PROVENANCE.json',root)));
 for(const file of Object.keys(proof.sha256))assert.deepEqual(fs.readFileSync(new URL(file,root)),fs.readFileSync(new URL('../../../avereth-engine/'+file,import.meta.url)));
 for(const file of fs.readdirSync(new URL('gm/',root)))assert.doesNotMatch(fs.readFileSync(new URL('gm/'+file,root),'utf8'),/from ['"](?:node:|.*\.mjs)/);
});
test('ST swipe decoration is ignored, actual prose/roles/event edits never are',()=>{
 const a=[{mes:'A',name:'GM',is_user:false,extra:{avereth:{events:[{t:'example'}]}}}],b=copy(a);
 b[0].swipes=['A'];b[0].swipe_id=0;b[0].swipe_info=[{extra:copy(b[0].extra)}];assert.equal(sameTranscript(a,b),true);
 b[0].mes='B';assert.equal(sameTranscript(a,b),false);b[0].mes='A';b[0].extra.avereth.events=[];assert.equal(sameTranscript(a,b),false);
});
test('ST text-completion prompt mutation cannot alter journalled request identity',async()=>{
 const x=fixture('npc_promise'),h=await harness(x),prompt=[{role:'user',content:'original'}];
 assert.equal(await h.scheduler.request('r',prompt,async({messages})=>{messages.unshift({role:'system',content:'template'});return 'answer';}),'answer');
 assert.deepEqual(prompt,[{role:'user',content:'original'}]);assert.deepEqual(h.ledger.read().leases['r:attempt:1'].messages,prompt);
 assert.equal(await h.scheduler.request('r',prompt,()=>{throw Error('no replay');}),'answer');
});
test('missing potion use and typed invented consent are blocked',async()=>{
 const x=fixture('npc_promise'),last=x.base.findLast(m=>m.extra?.avereth?.events),at=foldChat(x.base).state.scene.at;
 last.extra.avereth.events.push({t:'object.created',d:{object:{id:'obj.potion',name:'healing potion',kind:'item',qty:1,holder:{entity:'pc'},effect:'heal',marks:[]}}});
 x.input='I drink the healing potion.';const h=await harness(x);
 await assert.rejects(h.g.run('t',script([{op:'finish',narration:'Wat smiled.',world:{scene:at,expected:{},deltas:[]}}])),/unresolved player action/);
 const y=fixture('npc_promise'),z=await harness(y);await assert.rejects(z.g.run('t',script([{...finish(y),speech:[{id:'consent',speaker:'pc',text:'I agree.',to:['npc.wat']}]}])),/unauthorized PC/);
});
