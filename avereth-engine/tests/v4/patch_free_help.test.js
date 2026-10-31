import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject } from './patch8_lib.js';
import { startCampaign } from '../../src/engine.js';
import { applyEvent, fold } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { planContext, plannerRequest } from '../../src/v4/planner.js';
import * as extraction from '../../src/v4/extract.js';
import { runCommands } from '../../src/commands.js';
import { foldChat, rec } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
const content=await loadProductContent(),base=(await campaign(content)).state();
const clone=x=>JSON.parse(JSON.stringify(x));
function scene({legacy=false}={}) {
 const s=clone(base);if(legacy)delete s.meta.private_quests;else s.meta.private_quests=false;
 s.entities['npc.mira']={id:'npc.mira',kind:'npc',name:'Mira',descriptors:['merchant'],status:'alive',at:s.scene.at,location:s.scene.location};
 s.scene.present.push('npc.mira');
 s.last={...s.last,input:'I repair the broken wheel.',outcome:{c:true,auth:{c:true},expected_keys:{},resolutions:[{seq:1,type:'other',status:'resolved',quote:'I repair the broken wheel.'}]}};
 return s;
}
const offer={seq:1,type:'quest.offer',giver:'npc.mira',title:'Repair the wheel',objectives:['Repair the wheel'],reward_cp:30,proof:[]};
const gift=(cp=30,said='Mira places three silver in his hand.',more={})=>({seq:1,type:'coin.gift',from:'npc.mira',cp,said,why:'thanks for helping',repeat_of:null,...more});
const world=(s,deltas,prose='Mira places three silver in his hand.',extra={})=>applyWorld(s,content,{scene:'here',expected:{},deltas,...extra},{msg:501,prose});
const replay=(s,r)=>{const x=clone(s);for(const e of clone(r.events))applyEvent(x,e);assert.deepEqual(x,clone(r.state));};
function oldJob(s) {s.quests['quest.wheel']={id:'quest.wheel',title:'Repair the wheel',kind:'private',status:'offered',giver:'npc.mira',payout_cp:30,objectives:[{what:'Repair the wheel',status:'open'}],notes:[],history:[],progress:[]};return s.quests['quest.wheel'];}

test('free help: new campaigns persist the policy; old campaign events retain their original metadata',()=>{
 for(const runtime of ['v3','v4'])for(const ruleset of [1,2]){
  const events=startCampaign(content,{seed:7,runtime,ruleset});assert.equal(events[0].d.private_quests,false);
  const s=fold(events);assert.equal(s.meta.private_quests,false);
  const old=clone(events);delete old[0].d.private_quests;assert.equal(fold(old).meta.private_quests,undefined);
 }
});
test('free help: a request creates no private quest and employer-paid work is never sold to the player',()=>{
 const s=scene(),money=s.entities.pc.sheet.coin_cp;
 const r=world(s,[offer,{seq:2,type:'offer',seller:'npc.mira',lines:[{what:'wheel repair work',kind:'service',service:'other',qty:1,price_cp:30}]}], 'Mira says, "I need you to work on this wheel. I will pay you three silver."');
 assert.equal(Object.values(r.state.quests).filter(q=>q.kind==='private').length,0);
 assert.equal(r.state.entities.pc.sheet.coin_cp,money);assert.equal(Object.values(r.state.offers).filter(o=>o.seller==='npc.mira').length,0);
 assert.ok(r.rejected.some(x=>x.rule==='private_quests_disabled'));
});
test('free help: facts, relationships, memories and physical gifts remain ordinary world events',()=>{
 const s=scene();const r=world(s,[
  {seq:1,type:'fact',s:'npc.mira',p:'request',o:'Her son is missing near the mill'},
  {seq:2,type:'fact',s:'npc.mira',p:'son',o:'returned safely with Alaric'},
  {seq:3,type:'memory',text:'Mira is relieved that her son is home safely',who:['npc.mira','pc'],imp:8},
  {seq:4,type:'object.new',name:'warm wool scarf',kind:'item',holder:'npc.mira',qty:1},
  {seq:5,type:'object.move',object:{new:'warm wool scarf'},to:'pc'}
 ],'Mira thanks him for bringing her son home and gives him a warm wool scarf.');
 assert.equal(r.rejected.length,0,JSON.stringify(r.rejected));assert.ok(r.events.some(e=>e.t==='fact.asserted'));
 assert.ok(Object.values(r.state.objects).some(o=>o.name==='warm wool scarf'&&o.holder.entity==='pc'));
 assert.equal(r.events.filter(e=>e.t.startsWith('quest.')).length,0);replay(s,r);
});
for(const [said,reported,expected] of [['Mira gives him one silver.',100,10],['Mira gives him two silver.',200,20],['Mira gives him five silver and eight copper.',508,58]])
 test(`free help: actual voluntary payment is grounded in its quoted currency: ${expected} cp`,()=>{
  const s=scene(),money=s.entities.pc.sheet.coin_cp;const r=world(s,[gift(reported,said)],said);
  assert.equal(r.state.entities.pc.sheet.coin_cp,money+expected);
  assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,1);
  assert.equal(r.events.filter(e=>e.t.startsWith('quest.')||e.t==='xp.changed').length,0);replay(s,r);
 });
for(const said of ['Mira promises to give him three silver tomorrow.','Mira says she will pay him three silver.','Mira reminds him she already gave him three silver yesterday.'])
 test(`free help: a promise or recount is no current payment: ${said}`,()=>{
  const s=scene(),money=s.entities.pc.sheet.coin_cp;const r=world(s,[gift(30,said)],said);
  assert.equal(r.state.entities.pc.sheet.coin_cp,money);assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,0);
 });
test('free help: a fabricated quote or an ungrounded numeric gift cannot create money',()=>{
 for(const d of [gift(),gift(30,null)]){
  const s=scene();const r=world(s,[d],'Mira thanks him and returns to her shop.');assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp);
 }
});
test('free help: wages and thanks need no quest, job status, employer identity or acceptance',()=>{
 const s=scene();const r=world(s,[gift(30,undefined,{why:'wages for helping the steward'})]);
 assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp+30);assert.equal(Object.keys(r.state.quests).length,Object.keys(s.quests).length);
});
test('free help: one gift is recorded once, repeat references and reload never pay it again',()=>{
 const s=scene(),d=gift();const r=world(s,[d]);replay(s,r);
 const receipt=r.events.find(e=>e.t==='transaction.completed')?.d.gift;assert.ok(receipt?.id);
 const repeated=world(clone(r.state),[gift(30,'Mira recalls the payment.',{repeat_of:receipt.id})],'Mira recalls the payment.');
 assert.equal(repeated.state.entities.pc.sheet.coin_cp,r.state.entities.pc.sheet.coin_cp);
 const duplicate=world(clone(r.state),[d]);assert.equal(duplicate.state.entities.pc.sheet.coin_cp,r.state.entities.pc.sheet.coin_cp);
 assert.match(extractorCatalog(r.state,content).text,/RECENT COIN HANDOVERS/);
 replay(r.state,repeated);
});
test('free help: an independent second gift of the same amount remains possible',()=>{
 const s=scene(),r=world(s,[gift(),gift(30,'Mira gives him another three silver.',{seq:2})], 'Mira places three silver in his hand. Mira gives him another three silver.');
 assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp+60);assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,2);replay(s,r);
});
test('free help: no offscreen giver, invented journey or Guild payout can pass as a gift',()=>{
 const s=scene();s.scene.present=s.scene.present.filter(id=>id!=='npc.mira');const r=world(s,[gift()]);assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp);
 const away=world(scene(),[gift()],undefined,{scene:{new:{name:'Unreached town',kind:'settlement',parent:'realm.valedorn'}}});assert.ok(away.rejected.some(x=>x.rule==='scene_context'));
 const trade=scene();trade.last.outcome.booked={sellers:['npc.mira']};assert.ok(world(trade,[gift()]).rejected.some(x=>x.rule==='engine_booked'));
});
test('free help: stale private commands and claims do not recreate formal progression or displays',()=>{
 const s=scene(),q=oldJob(s),before=s.entities.pc.sheet.xp;
 const c=resolveCommands(s,content,[{seq:1,type:'quest.accept',quest:q.id,quote:'I agree to help.'}],e=>applyEvent(s,e),{c:true});assert.equal(c.resolutions[0].status,'refused');
 const r=world(s,[{seq:1,type:'quest.progress',quest:q.id,objective:'wheel repaired',status:'done'},{seq:2,type:'quest.ready',quest:q.id,note:'done'},{seq:3,type:'quest.close',quest:q.id,status:'completed',by:'npc.mira'}]);
 assert.equal(r.state.quests[q.id].status,'offered');assert.equal(r.state.entities.pc.sheet.xp,before);assert.equal(r.events.filter(e=>e.t==='quest.ready'||e.t==='quest.progressed'||e.t==='quest.status').length,0);
 assert.equal(buildCatalog(s,content).quests.some(x=>x.id===q.id),false);
 assert.doesNotMatch(runCommands(s,content,'#quests').panels.join('\n'),/Repair the wheel/);
});
test('free help: scoped prompts omit private offer/job instructions; Legacy vocabulary is unchanged',()=>{
 const s=scene();oldJob(s);const cat=buildCatalog(s,content),ctx=planContext(s,content,cat);
 assert.equal(ctx.jobs.length,0);const request=plannerRequest(content.commandVocab,ctx,'I agree to help.');assert.doesNotMatch(request.system,/Private jobs:|optional job:/);
 assert.match(request.system,/ordinary world|free help/i);
 assert.equal(typeof extraction.worldVocab,'function');
 const before=JSON.stringify(content.deltaVocab),v=extraction.worldVocab(content.deltaVocab,s);
 assert.ok(!v.deltas.some(d=>d.type==='quest.offer'));assert.ok(!v.deltas.find(d=>d.type==='coin.gift').fields.job);
 assert.ok(v.deltas.find(d=>d.type==='coin.gift').fields.repeat_of);assert.equal(JSON.stringify(content.deltaVocab),before);
 // B1 (.130): the area delta is no campaign variant any more; the legacy vocabulary is the content's own
 assert.deepEqual(extraction.worldVocab(content.deltaVocab,scene({legacy:true})),content.deltaVocab);
});
test('free help: old private jobs still accept, finish authorized work and pay once',()=>{
 const s=scene({legacy:true}),q=oldJob(s);resolveCommands(s,content,[{seq:1,type:'quest.accept',quest:q.id}],e=>applyEvent(s,e),{c:true});
 s.last.outcome.resolutions[0].job=q.id;
 const d=gift(30,'Mira places three silver in his hand.',{job:q.id});delete d.repeat_of;
 const r=world(s,[{seq:1,type:'quest.close',quest:q.id,status:'completed',by:q.giver},{...d,seq:2}]);
 assert.equal(r.state.quests[q.id].status,'completed');assert.equal(r.state.quests[q.id].payment.cp,30);replay(s,r);
});
test('free help: product reply, swipe and JSONL reload preserve exactly one actual gift',async()=>{
 const g=await campaign(content);inject(g,[{t:'entity.created',d:{entity:scene().entities['npc.mira']}},{t:'scene.entered',d:{id:'npc.mira',band:'SHORT'}}]);
 await say(g,'I repair the broken wheel.',{type:'other',what:'repair wheel',quote:'I repair the broken wheel.'});
 const answer={scene:'here',expected:{},deltas:[gift()]};const r=await g.reply('Mira places three silver in his hand.',answer);
 assert.equal(r.record.extraction.status,'applied');assert.equal(r.record.events.filter(e=>e.t==='coin.changed').length,1);
 assert.equal((await runExtraction(g.chat,r.id,content,g.llm)).changed,false);
 const original=clone(g.chat[r.id]);g.chat[r.id].mes='Mira gives him three silver for the repair.';g.chat[r.id].swipe_id=1;
 g.answer={scene:'here',expected:{},deltas:[gift(30,g.chat[r.id].mes)]};processReplyAny(g.chat,r.id,content);await runExtraction(g.chat,r.id,content,g.llm);
 assert.equal(rec(g.chat[r.id]).events.filter(e=>e.t==='coin.changed').length,1);
 g.chat[r.id]={...original,swipe_id:0};assert.deepEqual(clone(foldChat(clone(g.chat)).state),clone(g.state()));
});

import { reportToEvents } from '../../src/delta.js';
import { completeContract, contractReady } from '../../src/v4/guild.js';
test('free help: the V3 adapter cannot create a private quest or award its Quest XP',()=>{
 const s=scene(),xp=s.entities.pc.sheet.xp;
 const r=reportToEvents({quests:[{title:'Find the son',status:'offered',giver:'npc.mira',level:1,type:'minor',reward:'three silver'}]},s,content,{prose:'I help Mira.'});
 assert.equal(r.events.filter(e=>e.t==='quest.set'||e.t==='quest.created'||e.t==='xp.changed').length,0);assert.equal(s.entities.pc.sheet.xp,xp);
});
test('free help: duplicated extraction of one quoted handover and unknown repeats cannot pay twice',()=>{
 const s=scene(),r=world(s,[gift(),gift(30,undefined,{seq:2})]);
 assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp+30);assert.equal(r.events.filter(e=>e.t==='coin.changed').length,1);
 const unknown=world(s,[gift(30,undefined,{repeat_of:'gift.older.record'})]);assert.equal(unknown.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp);replay(s,r);
});
test('free help: Guild delivery, READY, payout and Quest XP keep their existing engine path',()=>{
 const s=scene(),branch=s.scene.location,at=s.scene.at;
 s.places[at].tags=[...(s.places[at].tags||[]),'guild_hall'];s.guild.membership={rank:'Novice',branch};
 const q={id:'quest.guild_parcel',kind:'guild_contract',title:'Medicine parcel',client:'Mira',status:'active',rank:'Novice',level:1,rec_level:1,qtype:'minor',payout_cp:30,objectives:[{id:'delivery',verb:'DELIVER',what:'medicine parcel',qty:1,where:s.places[at].name,delivery:{v:1,mode:'give',recipient_kind:'name',recipient:'Mira',place:s.places[at].name}}],proof:[],notes:[],history:[],progress:[]};
 s.quests[q.id]=q;s.objects.parcel={id:'parcel',name:'medicine parcel',kind:'item',qty:1,holder:{entity:'pc'},for_quests:[q.id],marks:[]};
 const events=[],emit=e=>{events.push(e);applyEvent(s,e);};
 resolveCommands(s,content,[{seq:1,type:'give',object:'parcel',qty:1,to:'npc.mira',quote:'I give Mira the medicine parcel.'}],emit,{c:true});
 assert.equal(contractReady(s,content,q,{c:true}).ok,true);
 const money=s.entities.pc.sheet.coin_cp;const done=completeContract(s,content,q,emit,{c:true});assert.equal(done.ok,true);assert.equal(s.entities.pc.sheet.coin_cp,money+30);
 assert.ok(events.some(e=>e.t==='xp.changed'));resolveCommands(s,content,[{seq:2,type:'quest.turn_in',quest:q.id,quote:'I turn in the parcel contract again.'}],emit,{c:true});assert.equal(s.entities.pc.sheet.coin_cp,money+30);assert.equal(events.filter(e=>e.t==='coin.changed').length,1);
});

for(const said of ['As promised yesterday, Mira hands him three silver.','Will gives him three silver.'])
 test(`free help: an actual gift remains valid despite a prior promise or a giver named Will: ${said}`,()=>{
  const s=scene();if(said.startsWith('Will'))s.entities['npc.mira'].name='Will';
  const r=world(s,[gift(30,said)],said);assert.equal(r.state.entities.pc.sheet.coin_cp,s.entities.pc.sheet.coin_cp+30);
  assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,1);replay(s,r);
 });
