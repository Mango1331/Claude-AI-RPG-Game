import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../../architecture201/fixtures.mjs';
import { loadProductContent } from '../../../avereth-engine/tests/helpers.js';
import { configure, foldChat, content, prepare } from '../../../avereth-gm-alpha/gm/engine.js';
import { DynamicGM } from '../../../avereth-gm-alpha/gm/runtime.js';
import { Journal } from '../../../avereth-gm-alpha/gm/storage.js';
import { Scheduler, requestDiagnostics } from '../../../avereth-gm-alpha/gm/scheduler.js';
import { obligations } from '../../../avereth-gm-alpha/gm/player.js';
import { prepareGenerationAsync } from '../../../avereth-engine/src/v4/runtime.js';
import { compactSchema, normalizeReferences } from '../../../avereth-gm-alpha/gm/interface.js';
import { buildCatalog } from '../../../avereth-gm-alpha/src/v4/catalog.js';
import { interpreterSchema } from '../../../avereth-gm-alpha/src/v4/interpret.js';
import { validateSchema } from '../../../avereth-gm-alpha/src/validate.js';
import { courseBase, courseSteps, potion, tam } from './course-fixtures.mjs';

configure(await loadProductContent());
const copy=structuredClone;
const fixture=name=>copy(fixtures().find(f=>f.name===name));
// Actual Alpha-2 terminal response, line 48; only response 2 adds within:null.
// Original: 88473ff644d59a292042d412a93f64dd746ca39f56d9642f3e4e9f699872ba3c.
export const guildInput='*i walk into the city ahead of me and make my way over to the adventurers guild*';
export const guildResponse={op:'resolve',commands:[{seq:1,type:'go',quote:guildInput.slice(1,-1),to:{ref:'loc.alderwatch.guild_hall'}}]};
const arrival={op:'finish',narration:'Alaric entered Alderwatch and arrived inside the Adventurers Guild hall.',world:{scene:'loc.alderwatch.guild_hall',expected:{1:{arrived:true,at:'loc.alderwatch.guild_hall',with:null,met:null}},deltas:[{seq:1,type:'arrive',at:'loc.alderwatch.guild_hall',forced_by:null,with:null}]}};
class MemoryStore {data={};async read(n){return copy(this.data[n]||null);}async write(n,x){this.data[n]=copy(x);}}
export async function harness(base=fixture('forest200').base,store=new MemoryStore()) {
 const host={epoch:0,id:()=> 'origin',token(){return {id:this.id(),epoch:this.epoch};},current(t){return t.id===this.id()&&t.epoch===this.epoch;}};
 const journal=await Journal.open(store,'j',{revision:0,originChatId:'origin',world:{revision:0,chat:base},turns:{}});
 const ledger=await Journal.open(store,'l',{revision:0,leases:{}}),scheduler=new Scheduler(ledger);
 const published=[];const publication={host,async publish(id,token){assert.ok(host.current(token));await journal.update(d=>{d.turns[id].phase='published';});published.push(copy(journal.read().world));}};
 const gm=new DynamicGM(journal,scheduler,publication);
 return {store,host,journal,ledger,scheduler,gm,published};
}
export function script(answers,requests=[]) {return async r=>{requests.push(copy({id:r.id,messages:r.messages}));assert.ok(answers.length,'unexpected physical model request');return JSON.stringify(answers.shift());};}

test('first prompt supplies canonical references and relevant .200 context',async()=>{
 const h=await harness();await h.gm.begin('g',guildInput);const p=JSON.parse(h.gm.prompt(h.journal.read().turns.g)[1].content);
 assert.ok(p.catalog.valid_places?.includes('loc.alderwatch.guild_hall'));
 assert.ok(p.engineContext?.includes('WHERE') || p.engineContext?.includes('authoritative'));
 assert.doesNotMatch(JSON.stringify(p.commandSchemas),/"to":\{"ref":"place"\}/);
 assert.match(JSON.stringify(p.worldContract),/loc\.alderwatch\.verge/);
});
for(const within of [false,true])test(`original failed guild response ${within?2:1} reaches the hall without repair request`,async()=>{
 const h=await harness(),requests=[];await h.gm.begin('g',guildInput);const a=copy(guildResponse);if(within)a.commands[0].within=null;
 await h.gm.run('g',script([a,copy(arrival)],requests));
 assert.equal(foldChat(h.journal.read().world.chat).state.scene.at,'loc.alderwatch.guild_hall');assert.equal(requests.length,2);
});
test('invalid world proposal is corrected after the received answer, preserving prepared mechanics',async()=>{
 const x=fixture('npc_promise'),h=await harness(x.base),requests=[];await h.gm.begin('p',x.input);
 const invalid={op:'finish',narration:x.narration,world:{scene:'not.a.place',expected:{},deltas:[]}};
 await h.gm.run('p',script([invalid,{op:'finish',narration:x.narration,world:x.world}],requests));
 assert.equal(requests.length,2);assert.equal(h.journal.read().world.revision,1);
 assert.ok(JSON.parse(requests[1].messages[1].content).correction);
});
test('#system uses one model answer rather than publishing its internal instructions',async()=>{
 const h=await harness(),requests=[];await h.gm.begin('s','#system How does my Basic Attack damage work?');
 const before=foldChat(h.journal.read().world.chat).state;
 await h.gm.run('s',script([{op:'answer',text:'Basic Attack uses the weapon and class formula shown in the supplied rules.'}],requests));
 const db=h.journal.read();assert.equal(requests.length,1);assert.equal(db.world.chat.at(-1).mes,'Basic Attack uses the weapon and class formula shown in the supplied rules.');
 const after=foldChat(db.world.chat).state;assert.deepEqual(after.clock,before.clock);assert.deepEqual(after.rng,before.rng);
});

test('reference alias is local, exact and canonical; original payload is retained',()=>{
 const state=foldChat(courseBase()).state,cat=buildCatalog(state,content,{known:true,c:true});
 const commands=[copy(guildResponse.commands[0]),{type:'go',to:{ref:'unknown'}},{type:'go',to:{ref:'loc.alderwatch',extra:true}},{type:'go',to:{new:'forest'}},{type:'person.new',ref:'loc.alderwatch'}];
 const n=normalizeReferences(commands,content,cat);assert.equal(n.changes.length,1);assert.equal(n.commands[0].to,'loc.alderwatch.guild_hall');
 assert.deepEqual(n.commands.slice(1),commands.slice(1));assert.equal(typeof commands[0].to,'object');
});
test('factored model schema expands exactly to the original validator schema',()=>{
 const cat=buildCatalog(foldChat(courseBase()).state,content,{known:true,c:true});
 const original=interpreterSchema(content.commandVocab,cat),small=compactSchema(original);
 const expand=x=>Array.isArray(x)?x.map(expand):x&&typeof x==='object'?x.$ref?expand(small.$defs[x.$ref.split('/').at(-1)]):Object.fromEntries(Object.entries(x).filter(([k])=>k!=='$defs').map(([k,v])=>[k,expand(v)])):x;
 assert.deepEqual(expand(small),original);assert.ok(JSON.stringify(small).length<JSON.stringify(original).length);
 for(const value of [{commands:[]},{commands:[{seq:1,type:'go',to:'loc.alderwatch',quote:'I go to Alderwatch',within:null}]},{commands:[guildResponse.commands[0]]}])assert.deepEqual(validateSchema(value,small),validateSchema(value,original));
});
test('stop after mechanical checkpoint resumes the same response without reroll or request',async()=>{
 const h=await harness(),requests=[];await h.gm.begin('g',guildInput);
 await assert.rejects(h.gm.run('g',script([copy(guildResponse)],requests),{hook:async p=>{if(p==='after_prepared')h.host.epoch++;}}),/Stopped/);
 const checkpoint=copy(h.journal.read().turns.g.prepared),before=foldChat(checkpoint.chat).state;
 assert.equal(h.journal.read().world.revision,0);
 await h.gm.run('g',script([copy(arrival)],requests));
 assert.equal(requests.length,2);assert.deepEqual(h.journal.read().turns.g.prepared,checkpoint);
 assert.equal(foldChat(h.journal.read().world.chat).state.rng.n,before.rng.n);
});
test('correction survives journal reopening; confirmed transport is not the validity of its proposal',async()=>{
 const h=await harness(),requests=[];await h.gm.begin('g',guildInput);
 const bad=copy(guildResponse);bad.commands[0].to={ref:'loc.invented'};
 await assert.rejects(h.gm.run('g',script([bad],requests),{hook:async p=>{if(p==='after_rejection')throw Error('simulated reload');}}),/simulated reload/);
 assert.equal(h.scheduler.occupancy(),0);assert.equal(h.journal.read().world.revision,0);
 const reopened=await harness(undefined,h.store);
 await reopened.gm.run('g',script([copy(guildResponse),copy(arrival)],requests));
 assert.equal(requests.length,3);assert.equal(reopened.journal.read().world.revision,1);
 assert.equal(reopened.journal.read().turns.g.proposals.filter(p=>p.status==='rejected').length,1);
});
test('two invalid proposals end correction and Resume cannot issue an endless chain',async()=>{
 const h=await harness(),requests=[];await h.gm.begin('g',guildInput);const bad={op:'invented'};
 await assert.rejects(h.gm.run('g',script([bad,bad],requests)),/correction exhausted/);
 await assert.rejects(h.gm.run('g',script([],requests)),/correction exhausted/);
 assert.equal(requests.length,2);assert.equal(h.journal.read().world.revision,0);assert.equal(h.published.length,0);
});
test('ambiguous held-item use can ask the engine clarification in one request',async()=>{
 const h=await harness(),before=foldChat(h.journal.read().world.chat).state,requests=[];
 await h.gm.begin('q','I use it.');await h.gm.run('q',script([{op:'resolve',commands:[{seq:1,type:'clarify',about:'action',question:'Which item do you want to use?',options:['a held item','cancel']}]}],requests));
 const after=foldChat(h.journal.read().world.chat).state;assert.equal(requests.length,1);assert.match(h.journal.read().world.chat.at(-1).mes,/Which item/);
 assert.deepEqual(after.rng,before.rng);assert.deepEqual(after.entities.pc.sheet,before.entities.pc.sheet);
});
test('negated movement cannot be turned into a successful trip, correction stays in place',async()=>{
 const h=await harness(),before=foldChat(h.journal.read().world.chat).state,requests=[];const input='I do not go to Alderwatch.';
 await h.gm.begin('n',input);await h.gm.run('n',script([{op:'resolve',commands:[{seq:1,type:'go',quote:input,to:'loc.alderwatch'}]},
  {op:'finish',narration:'The city gate stood beyond the roadside verge.',world:{scene:before.scene.at,expected:{},deltas:[]}}],requests));
 assert.equal(requests.length,2);assert.equal(foldChat(h.journal.read().world.chat).state.scene.at,before.scene.at);
});
test('full-health potion refusal preserves the item and asks for no corrective model request',async()=>{
 const chat=courseBase({injured:false});chat.findLast(m=>m.extra?.avereth?.events).extra.avereth.events.push({t:'object.created',d:{object:{id:'obj.potion',name:'healing potion',kind:'item',qty:1,holder:{entity:'pc'},effect:'heal',marks:[]}}});
 const h=await harness(chat),before=foldChat(chat).state,requests=[];await h.gm.begin('u','I drink the healing potion.');
 await h.gm.run('u',script([{op:'resolve',commands:[{seq:1,type:'use',quote:'I drink the healing potion.',object:'obj.potion',qty:1}]},
 {op:'finish',narration:'Alaric was unhurt. The healing potion remained unused.',world:{scene:before.scene.at,expected:{},deltas:[]}}],requests));
 const after=foldChat(h.journal.read().world.chat).state;assert.deepEqual(after.objects['obj.potion'],before.objects['obj.potion']);assert.equal(after.entities.pc.sheet.hp,before.entities.pc.sheet.hp);assert.equal(requests.length,2);
});
test('negative/future hints are not obligations; an independent positive movement remains required',()=>{
 const s=foldChat(courseBase()).state;
 for(const input of ['I do not go to Alderwatch.','Tomorrow I will go to Alderwatch.'])assert.deepEqual(obligations(input,s),[]);
 assert.ok(obligations('I do not go to the forest. I go to Alderwatch.',s).some(o=>o.kind==='travel'));
});
test('diagnostics remain chronological when an older failed request still has a lease',()=>{
 const ledger={diagnostics:[{id:'new',startedAt:200}],leases:{failed:{id:'old',sentAt:100,diagnostic:{id:'old'}},pending:{id:'current',sentAt:300,status:'sent'}}};
 const before=copy(ledger);assert.deepEqual(requestDiagnostics(ledger).map(x=>x.id),['old','new','current']);assert.deepEqual(ledger,before);
});
test('movement and potion preparation equal the direct .200 engine path on identical copied states',async()=>{
 const base=courseBase();base.findLast(m=>m.extra?.avereth?.events).extra.avereth.events.push({t:'object.created',d:{object:{id:'obj.potion',name:'healing potion',kind:'item',qty:1,holder:{entity:'pc'},effect:'heal',marks:[]}}});
 for(const [input,commands] of [[guildInput,[{...guildResponse.commands[0],to:'loc.alderwatch.guild_hall'}]],['I drink the healing potion.',[{seq:1,type:'use',quote:'I drink the healing potion.',object:'obj.potion',qty:1}]]]) {
  const old=copy(base);old.push({mes:input,name:'Alaric',is_user:true,extra:{}});
  await prepareGenerationAsync(old,content,{settings:{planner:true},llm:async req=>{assert.equal(req.purpose,'plan');return JSON.stringify({commands});}});
  const current=await prepare(base,input,commands);assert.deepEqual(foldChat(current.chat).state,foldChat(old).state);
 }
});
test('connected arc: original guild failure → promise → gift/use → return/memory resolution',async()=>{
 const h=await harness(courseBase()),counts=[];
 for(const step of courseSteps()){
  const before=foldChat(h.journal.read().world.chat).state;
  await h.gm.begin(step.name,step.input);const prompt=JSON.parse(h.gm.prompt(h.journal.read().turns[step.name])[1].content);
  if(step.name==='recall') {
   assert.ok(prompt.recentDialogue.every(m=>!m.text.includes('Next time you return')),'original promise dialogue absent');
   assert.match(prompt.engineContext,/safer path/,'promise retrieved from persistent memory');
  }
  const requests=[];await h.gm.run(step.name,script(step.answers(before),requests));counts.push(requests.length);
  const after=foldChat(h.journal.read().world.chat).state;
  if(step.name==='guild')assert.ok(tam(after));
  if(step.name==='promise')assert.equal(Object.values(after.threads).filter(t=>t.text.includes('safer path')).length,1);
  if(step.name==='use'){assert.ok(after.entities.pc.sheet.hp>before.entities.pc.sheet.hp);assert.ok(!potion(after));}
  if(step.name==='return')assert.ok(after.scene.present.includes(tam(after)));
  if(step.name==='recall')assert.equal(Object.values(after.threads).find(t=>t.text.includes('safer path')).status,'resolved');
 }
 assert.deepEqual(counts,[2,1,1,2,2,1,2,1]);assert.equal(h.journal.read().world.revision,8);
});
