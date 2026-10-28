import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { parseExtraction } from '../../src/v4/extract.js';
import { reportedTarget } from '../../src/v4/known.js';
import { resolveCommands } from '../../src/v4/commands.js';
const content = await loadProductContent();
const earlier = JSON.parse(fs.readFileSync(new URL('./fixtures/run12_e146.json', import.meta.url)));
const tail = JSON.parse(fs.readFileSync(new URL('./fixtures/run12_world_tail.json', import.meta.url)));
const clone = x => JSON.parse(JSON.stringify(x));
function pre(i = 197) {
 const s = clone(earlier.state);
 for (const e of tail.bridge) applyEvent(s,e);
 for (const e of tail[String(i)].record.events) applyEvent(s,e);
 return s;
}
const smith='loc.the_smiths_yard', camp='loc.mossback_warrens';
const here = s => ({scene:s.scene.at,expected:{},deltas:[]});
const call=(s,a)=>applyWorld(s,content,a,{msg:200,prose:tail['200'].text});

test('new extractor protocol refuses unanchored local claims, but supports old parser mode',()=>{
 const a=tail['200'].record.extraction.raw;
 const ids={places:Object.keys(pre().places),quests:Object.keys(pre().quests)};
 const old=parseExtraction(JSON.stringify(a),content.deltaVocab,ids,{});
 assert.equal(old.valid,true);
 const strict=parseExtraction(JSON.stringify(a),content.deltaVocab,ids,{}, {sceneRequired:true});
 assert.equal(strict.valid,false);
 assert.match(strict.errors.join(' '),/scene/);
 const scoped=parseExtraction(JSON.stringify({...a,scene:camp}),content.deltaVocab,ids,{}, {sceneRequired:true});
 assert.equal(scoped.valid,true,scoped.errors.join('; '));
 const malformed=parseExtraction(JSON.stringify({expected:{},deltas:{}}),content.deltaVocab,ids,{}, {sceneRequired:true});
 assert.equal(malformed.valid,false);
});
test('original E197-E200: unreached camp introduces no local captives, foes or READY',()=>{
 const start=pre();assert.equal(start.scene.at,smith);
 const a198={...clone(tail['198'].record.extraction.raw),scene:{new:{name:'Pine edge above the camp',kind:'wilderness',parent:camp}}};
 const r198=call(start,a198);assert.equal(r198.state.scene.at,smith);
 const s199=clone(r198.state);for(const e of tail['199'].record.events)applyEvent(s199,e);
 const a200={...clone(tail['200'].record.extraction.raw),scene:{new:{name:'Ledge above the goblin camp',kind:'wilderness',parent:camp}}};
 const r=call(s199,a200);
 assert.equal(r.events.filter(e=>['entity.created','scene.entered','quest.ready','quest.progressed'].includes(e.t)).length,0);
 assert.equal(r.state.scene.at,smith);
 const replay=clone(s199);for(const e of clone(r.events))applyEvent(replay,e);assert.deepEqual(clone(replay),clone(r.state));
});
test('explicit authorized 45-minute intermediate stop is booked, false end arrival stays false',()=>{
 const s=pre(), raw=clone(tail['198'].record.extraction.raw);
 const stop={new:{name:'Pine edge above the camp',kind:'wilderness',parent:'realm.duskreach'}};
 raw.scene=stop;raw.deltas=raw.deltas.map(d=>({...d,seq:d.seq+1}));
 raw.deltas.unshift({seq:1,type:'arrive',at:stop,with:['npc.marta']});
 const r=call(s,raw);
 assert.notEqual(r.state.scene.at,smith);assert.notEqual(r.state.scene.at,camp);
 assert.equal(r.state.clock.minute-s.clock.minute,45);
 assert.equal(raw.expected['3'].arrived,false);
});
test('new explicit stop is not collapsed onto a reported end destination',()=>{
 const s=pre();s.places[camp].known='reported';
 const auth={gos:[{seq:1,to:camp}]},expected={1:{arrived:true}};
 assert.equal(reportedTarget(s,auth,expected,{new:{name:'Pine edge',kind:'wilderness',parent:'realm.duskreach'}},1,{new:{name:'Pine edge',kind:'wilderness',parent:'realm.duskreach'}}),null);
 assert.equal(reportedTarget(s,auth,expected,null,1),camp);
});
test('known exact destination in new wrapper reuses its ID',()=>{
 const s=pre();const r=resolveCommands(s,content,[{seq:1,type:'go',to:{new:'Mossback Warrens'},quote:'I go to Mossback Warrens'}],e=>applyEvent(s,e),{c:true});
 const o=r.outcome||r;assert.equal(o.auth.go.to,camp);
});
test('spontaneous local NPC, offscreen NPC and accepted information may satisfy a private discovery',()=>{
 const s=pre(199);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const q=Object.values(s.quests).find(q=>q.kind==='private' && q.status==='active');assert.ok(q);
 const r=call(s,{scene:smith,expected:{},deltas:[
  {seq:1,type:'person.new',ref:'npc.witness',name:'Witness',role:'traveller',present:true,desc:['road dust']},
  {seq:2,type:'person.new',ref:'npc.remote',name:'Remote',role:'farmer',present:false,at:camp,desc:[]},
  {seq:3,type:'fact',s:'npc.witness',p:'reports',o:'Trud is alive in the camp'},
  {seq:4,type:'quest.ready',quest:q.id,note:'His fate is learned from the witness',depends_on:['3']}
 ]});
 assert.ok(r.state.entities['npc.witness']);assert.ok(r.state.scene.present.includes('npc.witness'));
 assert.ok(r.state.entities['npc.remote']);assert.ok(!r.state.scene.present.includes('npc.remote'));
 assert.equal(r.state.quests[q.id].ready,true);
});
test('rejected source cannot authorize quest READY at the valid current scene',()=>{
 const s=pre(199),q=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 const r=call(s,{scene:smith,expected:{},deltas:[
  {seq:1,type:'person.new',ref:'npc.trud',name:'Trud',role:'captive',present:true,desc:[],scene:camp},
  {seq:2,type:'quest.ready',quest:q.id,note:'Trud is here',depends_on:['1']}
 ]});
 assert.equal(r.events.filter(e=>e.t==='quest.ready').length,0);
});
test('several arrivals use per-step scene; the final scene is not retroactive',()=>{
 const s=pre();s.last.outcome.auth.gos=[{seq:1,to:null}];
 const r=call(s,{scene:camp,expected:{},deltas:[
  {seq:1,type:'fact',s:'npc.marta',p:'says',o:'We leave now',scene:smith},
  {seq:2,type:'arrive',at:'realm.duskreach',with:['npc.marta']},
  {seq:3,type:'person.new',ref:'npc.road',name:'Roadman',role:'traveller',present:true,desc:[],scene:'realm.duskreach'},
  {seq:4,type:'arrive',at:camp,with:['npc.marta']},
  {seq:5,type:'fact',s:'npc.marta',p:'says',o:'We have arrived'}
 ]});
 assert.equal(r.rejected.filter(x=>x.rule==='scene_context').length,0);
 assert.equal(r.events.filter(e=>e.t==='fact.asserted').length,3); // occupation plus two statements
 assert.equal(r.state.scene.at,camp);
});

test('scene label alone never creates a place or moves the player; Legacy keeps its old semantics',()=>{
 const s=pre(199),count=Object.keys(s.places).length;
 const r=call(s,{scene:{new:{name:'Unreached ledge',kind:'wilderness',parent:camp}},expected:{},deltas:[]});
 assert.equal(r.state.scene.at,smith);assert.equal(Object.keys(r.state.places).length,count);
 s.meta.ruleset=1;
 const old=call(s,{scene:camp,expected:{},deltas:[{seq:1,type:'person.new',ref:'npc.visitor',name:'Visitor',role:'traveller',present:true,desc:[]}]});
 assert.ok(old.state.scene.present.includes('npc.visitor'));
});
test('rejected scene also blocks an unsupported READY without dependency references',()=>{
 const s=pre(199),q=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 const r=call(s,{scene:smith,expected:{},deltas:[
  {seq:1,type:'person.new',ref:'npc.trud',name:'Trud',role:'captive',present:true,desc:[],scene:camp},
  {seq:2,type:'quest.ready',quest:q.id,note:'Trud is found'}
 ]});assert.equal(r.events.filter(e=>e.t==='quest.ready').length,0);
});
for(const future of [false,true]) test(`quest evidence cannot cite ambiguous/forward step: future=${future}`,()=>{
 const s=pre(199),q=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 const fact={seq:1,type:'fact',s:'npc.marta',p:'says',o:'Trud is alive'};
 const deltas=future?[{seq:1,type:'quest.ready',quest:q.id,note:'Trud is found',depends_on:['2']},{...fact,seq:2}]:[fact,{...fact},{seq:2,type:'quest.ready',quest:q.id,note:'Trud is found',depends_on:['1']}];
 assert.equal(call(s,{scene:smith,expected:{},deltas}).events.filter(e=>e.t==='quest.ready').length,0);
});
test('finding someone does not automatically complete a separate rescue quest or pay money',()=>{
 const s=pre(199),find=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 s.quests['quest.rescue']={...clone(find),id:'quest.rescue',title:'Rescue Trud',ready:false,objectives:[{what:'Bring Trud safely back',status:'open'}]};
 const r=call(s,{scene:smith,expected:{},deltas:[{seq:1,type:'fact',s:'npc.marta',p:'reports',o:'Trud is alive'},
 {seq:2,type:'quest.ready',quest:find.id,note:'His fate is learned',depends_on:['1']}]});
 assert.equal(r.state.quests[find.id].ready,true);assert.equal(r.state.quests['quest.rescue'].ready,false);
 assert.equal(r.events.filter(e=>['coin.changed','transaction.completed','quest.status'].includes(e.t)).length,0);
});

import { campaign, say } from './patch8_lib.js';
import { rec, foldChat } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
test('new protocol repairs missing scene once; swipe/reload never duplicate entities or player actions', async()=>{
 const g=await campaign(content);await say(g,'I greet the traveller.',{type:'other',what:'greet the traveller',quote:'I greet the traveller'});
 const answer={expected:{},deltas:[{seq:1,type:'person.new',ref:'npc.witness',name:'Witness',role:'traveller',present:true,desc:[]}]};
 const baseLLM=g.llm,calls=[];
 g.llm=async req=>{
  if(!req.purpose.startsWith('extract'))return baseLLM(req);
  calls.push(req.purpose);return JSON.stringify(calls.length===1?answer:{scene:'here',...answer});
 };
 const r=await g.reply('A traveller named Witness greets him.');
 assert.equal(r.record.extraction.status,'applied');assert.deepEqual(calls,['extract','extract_repair']);
 const original=clone(g.chat[r.id]);assert.equal(r.record.events.filter(e=>e.t==='entity.created').length,1);
 assert.equal((await runExtraction(g.chat,r.id,content,g.llm)).changed,false);
 g.chat[r.id].mes='Witness, the traveller, returns his greeting.';g.chat[r.id].swipe_id=1;
 processReplyAny(g.chat,r.id,content);await runExtraction(g.chat,r.id,content,g.llm);
 assert.equal(Object.values(g.state().entities).filter(e=>e.name==='Witness').length,1);
 g.chat[r.id]={...original,swipe_id:0};
 assert.deepEqual(clone(foldChat(clone(g.chat)).state),clone(g.state()));
 assert.equal(rec(g.chat[r.id]).events.filter(e=>e.t==='extract.applied').length,1);
});

test('local NPC initiative can still start a genuine ambush without PC GO',()=>{
 const s=pre(199);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const r=applyWorld(s,content,{scene:smith,expected:{},deltas:[
  {seq:1,type:'person.new',ref:'scarred footpad',name:null,role:'bandit',armed:'knife',desc:['knife drawn'],present:true,band:'SHORT'},
  {seq:2,type:'hostile',by:['scarred footpad']}
 ]},{msg:200,prose:'A scarred footpad leaps from hiding and stabs at Alaric.'});
 assert.ok(r.events.some(e=>['combat.pending','encounter.started'].includes(e.t)));
});
test('a refused voluntary arrival cannot make its scene valid; real forced relocation remains possible',()=>{
 const s=pre(199);s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const target={new:{name:'Roadside ditch',kind:'wilderness',parent:'realm.duskreach'}};
 const deltas=[{seq:1,type:'arrive',at:target},{seq:2,type:'person.new',ref:'npc.helper',name:'Helper',role:'traveller',present:true,desc:[]}];
 const no=call(s,{scene:target,expected:{},deltas});
 assert.equal(no.state.scene.at,smith);assert.equal(no.events.filter(e=>e.t==='entity.created').length,0);
 // Build .107: the involuntary relocation is narrated by the reply, not only named in forced_by
 const flood={...deltas[0],forced_by:'a flood carries him into the ditch'};
 const unnarrated=call(s,{scene:target,expected:{},deltas:[flood,deltas[1]]});
 assert.equal(unnarrated.state.scene.at,smith);
 const yes=applyWorld(s,content,{scene:target,expected:{},deltas:[flood,deltas[1]]},{msg:200,prose:'The bank gives way. A flood carries him into the ditch, and a traveller hauls him out of the water.'});
 assert.notEqual(yes.state.scene.at,smith);assert.ok(yes.state.scene.present.includes('npc.helper'));
});
test('facts about Goblins leaving do not move canonical entities',()=>{
 const s=clone(earlier.state);for(const e of tail.bridge)applyEvent(s,e);
 const goblins=Object.values(s.entities).filter(e=>e.kind==='creature' && e.slot?.dungeon===camp);
 const r=call(s,{scene:'here',expected:{},deltas:[{seq:1,type:'fact',s:camp,p:'goblins',o:'They have gone elsewhere'}]});
 assert.deepEqual(goblins.map(e=>({id:e.id,at:e.at,left:e.left})),goblins.map(e=>({id:e.id,at:r.state.entities[e.id].at,left:r.state.entities[e.id].left})));
 assert.equal(r.events.filter(e=>['scene.left','scene.entered'].includes(e.t)).length,0);
});

test('a later real arrival permits an independent discovery after an earlier refused scene',()=>{
 const s=pre(),q=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 const r=call(s,{scene:camp,expected:{},deltas:[
  {seq:1,type:'person.new',ref:'npc.stranger',name:'Stranger',role:'traveller',present:true,desc:[],scene:{new:{name:'Another valley',kind:'wilderness',parent:'realm.duskreach'}}},
  {seq:2,type:'arrive',at:camp,with:['npc.marta']},
  {seq:3,type:'person.new',ref:'npc.trud',name:'Trud',role:'captive',present:true,desc:[]},
  {seq:4,type:'quest.ready',quest:q.id,note:'Trud is found here'}
 ]});
 assert.ok(r.rejected.some(x=>x.seq===1&&x.rule==='scene_context'));
 assert.equal(r.state.scene.at,camp);assert.equal(r.state.quests[q.id].ready,true);
});

// .82: a source is evidence only after its delayed domain validation succeeds.
function evidenceScene() {
 const s=pre(199);
 s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const template=Object.values(s.quests).find(q=>q.kind==='private'&&q.status==='active');
 for(const id of ['quest.source','quest.dependent','quest.last']) {
  s.quests[id]={...clone(template),id,giver:'npc.marta',ready:false,progress:[]};
  delete s.quests[id].work;
 }
 return s;
}
const dependent=(seq=2,source='1',quest='quest.dependent')=>({seq,type:'quest.ready',quest,note:'The preceding event supplies the proof',depends_on:[source]});
function replayResult(s,r) {
 const replay=clone(s);for(const e of clone(r.events))applyEvent(replay,e);
 assert.deepEqual(replay,clone(r.state));
}
for(const source of ['private-close','guild-ready','wages']) for(const valid of [false,true])
 test(`final evidence: ${source}, valid=${valid}`,()=>{
  const s=evidenceScene(),q=s.quests['quest.source'];let first;
  if(source==='private-close') {
   if(valid)q.work={turn:s.turn,seq:1,type:'other',quote:'I repair the harness',at:s.scene.at};
   first={seq:1,type:'quest.close',quest:q.id,status:'completed',by:q.giver};
  } else if(source==='guild-ready') {
   q.kind='guild_contract';q.objectives=[{id:'o1',verb:'DELIVER',what:'sealed ledger',qty:1,where:'Priory'}];
   q.deliveries=valid?[{key:'existing',objective:'o1',object:'ledger',origin:'ledger',qty:1}]:[];
   first={seq:1,type:'quest.ready',quest:q.id,note:'The ledger arrived'};
  } else {
   q.status='completed';q.payout_cp=3;
   if(valid)q.work={turn:s.turn,seq:1,type:'other',quote:'I repair the harness',at:s.scene.at};
   first={seq:1,type:'coin.gift',from:q.giver,cp:3,why:'wages',job:q.id};
  }
  const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[first,dependent()]},{msg:202});
  assert.equal(r.state.quests['quest.dependent'].ready,valid);
  assert.equal(r.rejected.some(x=>x.seq===2&&x.rule==='quest_dependency'),!valid);
  assert.equal(r.events.filter(e=>e.t==='coin.changed').length,source==='wages'&&valid?1:0);
  replayResult(s,r);
 });
for(const valid of [false,true]) test(`final evidence: transitive progress/close chain, valid=${valid}`,()=>{
 const s=evidenceScene();
 if(valid)s.quests['quest.source'].work={turn:s.turn,seq:1,type:'other',quote:'I repair the harness',at:s.scene.at};
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'quest.close',quest:'quest.source',status:'completed',by:'npc.marta'},
  {seq:2,type:'quest.progress',quest:'quest.dependent',objective:'First task verified',status:'done',depends_on:['1']},
  {seq:3,type:'quest.close',quest:'quest.dependent',status:'failed',by:'npc.marta',depends_on:['2']},
  dependent(4,'3','quest.last')
 ]},{msg:202});
 assert.equal(r.state.quests['quest.dependent'].progress.some(p=>p.objective==='First task verified'),valid);
 assert.equal(r.state.quests['quest.dependent'].status,valid?'failed':'active');
 assert.equal(r.state.quests['quest.last'].ready,valid);
 replayResult(s,r);
});
test('final evidence: successful private close may depend on a validated Guild delivery and still pay once',()=>{
 const s=evidenceScene(),delivery=s.quests['quest.source'],job=s.quests['quest.dependent'];
 delivery.kind='guild_contract';delivery.objectives=[{id:'o1',verb:'DELIVER',what:'sealed ledger',qty:1,where:'Priory'}];
 delivery.deliveries=[{key:'existing',objective:'o1',object:'ledger',origin:'ledger',qty:1}];
 job.work={turn:s.turn,seq:1,type:'other',quote:'I confirm the receipt',at:s.scene.at};job.payout_cp=3;
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'quest.ready',quest:delivery.id,note:'Delivered'},
  {seq:2,type:'quest.close',quest:job.id,status:'completed',by:'npc.marta',depends_on:['1']},
  {seq:3,type:'coin.gift',from:'npc.marta',cp:3,why:'wages',job:job.id},
  dependent(4,'3','quest.last')
 ]},{msg:202});
 assert.equal(r.state.quests[job.id].status,'completed');assert.equal(r.state.quests['quest.last'].ready,true);
 assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,1);
 replayResult(s,r);
});
for(const sourceSeq of [1,2]) test(`final evidence: hand-over before its purchase offer, source seq=${sourceSeq}`,()=>{
 const s=evidenceScene();s.entities.pc.sheet.coin_cp=20;
 const command={seq:1,type:'buy',what:'brass compass',from:'npc.marta',qty:1,max_cp:3,quote:'I buy a brass compass for at most three copper.'};
 const o=resolveCommands(s,content,[command],e=>applyEvent(s,e),{c:true,msg:201});
 s.last={...s.last,input:command.quote,outcome:{...o,c:true}};
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'object.new',name:'brass compass',kind:'item',qty:1,holder:'npc.marta'},
  {seq:2,type:'object.move',object:{new:'brass compass'},to:'pc'},
  dependent(3,String(sourceSeq)),
  {seq:4,type:'offer',seller:'npc.marta',lines:[{what:'brass compass',kind:'goods',qty:1,price_cp:3}]},
  dependent(5,'4','quest.last')
 ]},{msg:202});
 assert.ok(r.rejected.some(x=>x.seq===sourceSeq&&x.rule==='engine_booked'));
 assert.equal(r.state.quests['quest.dependent'].ready,false);
 assert.equal(r.state.quests['quest.last'].ready,true,'the genuine offer itself remains accepted');
 assert.equal(Object.values(r.state.objects).filter(o=>o.name==='brass compass'&&o.holder?.entity==='pc').length,1);
 assert.equal(r.events.filter(e=>e.t==='coin.changed').length,1);
 replayResult(s,r);
});

test('final evidence: wages preceding their private close still support a later claim once settled',()=>{
 const s=evidenceScene(),q=s.quests['quest.source'];q.payout_cp=3;
 q.work={turn:s.turn,seq:1,type:'other',quote:'I repair the harness',at:s.scene.at};
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'coin.gift',from:q.giver,cp:3,why:'wages',job:q.id},
  dependent(2,'1'),
  {seq:3,type:'quest.close',quest:q.id,status:'completed',by:q.giver}
 ]},{msg:202});
 assert.equal(r.state.quests['quest.dependent'].ready,true);
 assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,1);
 replayResult(s,r);
});
test('final evidence: a completion cannot be proven by the wages that require that completion',()=>{
 const s=evidenceScene(),q=s.quests['quest.source'];q.payout_cp=3;
 q.work={turn:s.turn,seq:1,type:'other',quote:'I repair the harness',at:s.scene.at};
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'coin.gift',from:q.giver,cp:3,why:'wages',job:q.id},
  {seq:2,type:'quest.close',quest:q.id,status:'completed',by:q.giver,depends_on:['1']},
  dependent(3,'2')
 ]},{msg:202});
 assert.equal(r.state.quests[q.id].status,'active');assert.equal(r.state.quests['quest.dependent'].ready,false);
 assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,0);
 replayResult(s,r);
});
test('final evidence: a deferred genuine gift remains evidence when an overpriced offer is not bought',()=>{
 const s=evidenceScene();s.entities.pc.sheet.coin_cp=20;
 const c={seq:1,type:'buy',what:'brass compass',from:'npc.marta',qty:1,max_cp:3,quote:'I buy a brass compass for at most three copper.'};
 const o=resolveCommands(s,content,[c],e=>applyEvent(s,e),{c:true,msg:201});s.last={...s.last,input:c.quote,outcome:{...o,c:true}};
 const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[
  {seq:1,type:'object.new',name:'brass compass',kind:'item',qty:1,holder:'npc.marta'},
  {seq:2,type:'object.move',object:{new:'brass compass'},to:'pc'},
  dependent(3,'2'),
  {seq:4,type:'offer',seller:'npc.marta',lines:[{what:'brass compass',kind:'goods',qty:1,price_cp:5}]}
 ]},{msg:202});
 assert.equal(r.state.quests['quest.dependent'].ready,true);
 assert.equal(r.events.filter(e=>e.t==='coin.changed').length,0);
 assert.equal(Object.values(r.state.objects).filter(o=>o.name==='brass compass'&&o.holder?.entity==='pc').length,1);
 replayResult(s,r);
});
