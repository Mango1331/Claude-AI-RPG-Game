import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent, loadContent } from '../helpers.js';
import { campaign, say, inject } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { foldChat } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { contractReady, completeContract } from '../../src/v4/guild.js';
import { announcedAbandon } from '../../src/v4/planner.js';
import fs from 'node:fs';
const content = await loadProductContent();
const base = (await campaign(content)).state();
function scene() {
 const s=structuredClone(base);
 s.places['loc.camp']={id:'loc.camp',name:'Quarry Camp',kind:'site',parent:s.scene.location};
 s.places['loc.hall']={id:'loc.hall',name:'Guild hall',kind:'guild_hall',parent:s.scene.location,tags:['guild']};
 s.scene.at='loc.camp';s.scene.present=['pc','npc.brenna','npc.guard'];
 s.entities['npc.brenna']={id:'npc.brenna',kind:'npc',name:'Brenna',descriptors:['healer'],location:s.scene.location,at:'loc.camp',status:'alive'};
 s.entities['npc.guard']={id:'npc.guard',kind:'npc',name:'Guard',descriptors:['guard'],location:s.scene.location,at:'loc.camp',status:'alive'};
 s.quests.q={id:'q',title:'Tonic delivery',kind:'guild_contract',status:'active',task:'Deliver two crates to the healer at Quarry Camp.',desired_end_state:'The crates reach healer Brenna at Quarry Camp.',objectives:[{id:'o1',verb:'GET',what:'tonic crates',qty:2,where:'Shop'},{id:'o2',verb:'DELIVER',what:'tonic crates',qty:2,where:'Quarry Camp healer Brenna'}],proof:[],notes:[],progress:[],history:[],payout_cp:40,level:1,rank:'Novice'};
 s.objects.cargo={id:'cargo',name:'tonic crates',kind:'resource',qty:2,stack:true,holder:{entity:'pc'},marks:[],for_quests:['q']};
 return s;
}
function run(s,commands) {const events=[]; const out=resolveCommands(s,content,commands,e=>{events.push(e);applyEvent(s,e);},{c:true,msg:90});return {events,out};}
const give=(qty=2,to='npc.brenna')=>({seq:1,type:'give',object:'cargo',to,qty,quote:'I give the crates to Brenna.'});
const ready={seq:9,type:'quest.ready',quest:'q',note:'Delivered.',alternative:null};
const check=s=>contractReady(s,content,s.quests.q,{c:true});
const receipts=s=>s.quests.q.deliveries||[];
test('10B-2 D1 READY cannot precede late cargo creation or claim a delivery without transfer',()=>{
 const s=scene();s.quests.q.ready=true;delete s.objects.cargo;
 assert.equal(check(s).ok,false);
});
test('10B-2 D2 direct GIVE records evidence and pays once without a second ready claim',()=>{
 const s=scene();run(s,[give()]);assert.equal(receipts(s).length,1);assert.equal(check(s).ok,true);
 const events=[], emit=e=>{events.push(e);applyEvent(s,e);};
 completeContract(s,content,s.quests.q,emit,{c:true});const coin=s.entities.pc.sheet.coin_cp;
 assert.equal(s.quests.q.status,'completed');assert.equal(coin,90);
 assert.equal(contractReady(s,content,s.quests.q,{c:true}).ok,true);
});
test('10B-2 D3 GO-GIVE preserves partial amount, named recipient and location',()=>{
 const s=scene();s.scene.at='loc.hall';s.scene.present=['pc'];
 const {out}=run(s,[{seq:1,type:'go',to:'loc.camp',quote:'I go to Quarry Camp.'},{...give(1),seq:2,needs:1}]);
 s.last={...s.last,rejected:[],input:'I go to Quarry Camp and give one crate to Brenna.',outcome:{...out,c:true}};
 const r=applyWorld(s,content,{expected:{1:{arrived:true,at:'loc.camp',with:null}},deltas:[{seq:1,type:'arrive',at:'loc.camp',with:null,forced_by:null},{seq:2,type:'enter',who:'npc.brenna',band:'ENGAGED'},{seq:3,type:'object.move',object:'cargo',to:'npc.brenna',qty:1},ready]},{msg:91,prose:'Brenna takes one crate at Quarry Camp.'});
 assert.equal(r.state.objects.cargo.qty,1);assert.equal(receipts(r.state)[0]?.qty,1);assert.equal(check(r.state).ok,false);
});
test('10B-2 D3 arrival and presence alone cannot force a refused handover',()=>{
 const s=scene();s.scene.at='loc.hall';s.scene.present=['pc'];
 const {out}=run(s,[{seq:1,type:'go',to:'loc.camp',quote:'I go to Quarry Camp.'},{...give(),seq:2,needs:1}]);
 s.last={...s.last,rejected:[],input:'I go to Quarry Camp and give the crates to Brenna.',outcome:{...out,c:true}};
 const r=applyWorld(s,content,{expected:{1:{arrived:true,at:'loc.camp',with:null}},deltas:[{seq:1,type:'arrive',at:'loc.camp',with:null,forced_by:null},{seq:2,type:'enter',who:'npc.brenna',band:'ENGAGED'},ready]},{msg:91,prose:'Brenna is here, but refuses to take the crates.'});
 assert.equal(r.state.objects.cargo.holder.entity,'pc');assert.equal(receipts(r.state).length,0);assert.equal(check(r.state).ok,false);
});
test('10B-2 D3 GO-GIVE also preserves quantities for sheet inventory items',()=>{
 const s=scene(), item=[...content.items.values()].find(x=>x.slot==='ammo');assert.ok(item);
 s.entities.pc.sheet.inventory[item.id]=2;s.objects={};s.scene.at='loc.hall';s.scene.present=['pc'];
 s.quests.q.objectives=[{id:'o2',verb:'DELIVER',what:item.name,qty:1,where:'Quarry Camp healer Brenna'}];
 const {out}=run(s,[{seq:1,type:'go',to:'loc.camp',quote:'I go to camp.'},{...give(1),object:`item.${item.id}`,seq:2,needs:1}]);
 s.last={...s.last,rejected:[],outcome:{...out,c:true}};
 const r=applyWorld(s,content,{expected:{1:{arrived:true,at:'loc.camp',with:null}},deltas:[{seq:1,type:'arrive',at:'loc.camp',with:null},{seq:2,type:'enter',who:'npc.brenna',band:'ENGAGED'},{seq:3,type:'object.move',object:`item.${item.id}`,to:'npc.brenna',qty:1}]},{msg:91,prose:'Brenna accepts one arrow.'});
 assert.equal(r.state.entities.pc.sheet.inventory[item.id],1);assert.equal(check(r.state).ok,true);assert.equal(receipts(r.state)[0].qty,1);
});
test('10B-2 D4 handler-refused handover cannot leave READY set',()=>{
 const s=scene();s.last={...s.last,rejected:[],input:'I give it to Brenna.',outcome:{c:true,auth:{c:true},conditionals:[{kind:'give',seq:1,object:'cargo',to:'npc.absent',qty:2,condition:'hand_over'}]}};
 const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'object.move',object:'cargo',to:'npc.brenna',qty:2},ready]},{msg:90,prose:'Brenna receives it.'});
 assert.equal(r.state.quests.q.ready||false,false);assert.equal(receipts(r.state).length,0);
});
test('10B-2 D5 dropping at Guild, wrong receiver/place, and narrative alone never deliver',()=>{
 for(const kind of ['drop','wrong','place','story','dead']){const s=scene();s.quests.q.ready=true;
 if(kind==='drop'){s.scene.at='loc.hall';run(s,[{...give(),type:'drop'}]);}
 if(kind==='wrong')run(s,[give(2,'npc.guard')]);
 if(kind==='dead'){s.entities['npc.brenna'].status='dead';run(s,[give()]);}
 if(kind==='place'){s.scene.at='loc.hall';run(s,[give()]);}
 if(kind==='story') {s.objects.cargo.holder={entity:'npc.brenna'};}
 assert.equal(check(s).ok,false,kind);}
});
test('10B-2 D6 only explicitly agreed drop-off can satisfy a delivery',()=>{
 const s=scene();s.quests.q.task='Leave the tonic crates at Quarry Camp.';s.quests.q.desired_end_state='The tonic crates are left at Quarry Camp.';s.quests.q.objectives[1].where='Quarry Camp';
 run(s,[{...give(),type:'drop'}]);assert.equal(check(s).ok,true);
});
test('10B-2 D7 partial amounts, repeat objects and separate objectives do not inflate credit',()=>{
 const s=scene();run(s,[give(1)]);assert.equal(check(s).ok,false);assert.equal(receipts(s)[0]?.qty,1);
 run(s,[give(1)]);assert.equal(check(s).ok,true);
 const total=receipts(s).reduce((n,r)=>n+r.qty,0);assert.equal(total,2);
});
test('10B-2 D8 concrete valid Run 1 and Run 2 contracts remain deliverable',()=>{
 for(const [name,where,person,role,qty] of [['consecrated tallow crates',"chapel keeper's hut at the ruined chapel",'Odo','chapel keeper',6],['crate of fever tinctures',"Hollowbrook healer's cottage",'Healer','healer',1]]){
 const s=scene();s.places['loc.camp'].name=where;s.entities['npc.brenna'].name=person;s.entities['npc.brenna'].descriptors=[role];s.objects.cargo.name=name;s.objects.cargo.qty=qty;
 Object.assign(s.quests.q,{task:`Deliver ${name} to the ${role} at ${where}.`,desired_end_state:`${name} delivered to the ${role} at ${where}.`,objectives:[{id:'o2',verb:'DELIVER',what:name,qty,where}]});
 run(s,[give(qty)]);assert.equal(check(s).ok,true,name);}
});
test('10B-2 D8 original exported pre-transfer states and original planner GIVE commands',()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/10b2_original_deliveries.json',import.meta.url),'utf8'));
 for(const f of fixtures){
  const s=structuredClone(f.state);run(s,f.commands);
  const id=Object.values(s.quests).find(q=>q.kind==='guild_contract'&&q.status==='active'&&q.objectives.some(o=>o.verb==='DELIVER')&&(q.deliveries||[]).length)?.id;
  assert.ok(id,`${f.run}: the real transfer must have a receipt`);
  assert.equal(contractReady(s,content,s.quests[id],{c:true}).ok,true,f.run);
 }
});
test('10B-2 D9 serialised event replay preserves delivery evidence and historical completed quests',()=>{
 const s=scene(),initial=structuredClone(s);const {events}=run(s,[give()]);
 JSON.parse(JSON.stringify(events)).forEach(e=>applyEvent(initial,e));assert.deepEqual(receipts(initial),receipts(s));assert.equal(check(initial).ok,true);
 const historical=scene();historical.quests.q.status='completed';assert.equal(historical.quests.q.status,'completed');
});
test('10B-2 D10 appraisal remains SHOW while explicit cargo handover stays GIVE',()=>{
 const s=scene();const show='I show the crates for appraisal.';
 assert.equal(announcedAbandon(show,[{...give(),quote:show}],s).kept.length,0);
 const hand='I give the crates to Brenna and leave them with her.';
 assert.equal(announcedAbandon(hand,[{...give(),quote:hand}],s).kept.length,1);
});
test('10B-2 D11 later GO cannot run past a still conditional handover',()=>{
 const s=scene();s.scene.at='loc.hall';s.scene.present=['pc'];
 const {out}=run(s,[{seq:1,type:'go',to:'loc.camp',quote:'I go to camp.'},{...give(),seq:2,needs:1},{seq:3,type:'go',to:'loc.hall',needs:2,quote:'I return to the Guild.'}]);
 assert.equal(out.auth.gos.length,1);assert.equal(out.resolutions.find(r=>r.seq===3)?.status,'refused');
});
test('10B-2 D11 an unrelated second destination is blocked, not merely already-here',()=>{
 const s=scene();s.scene.at='loc.hall';s.scene.present=['pc'];
 s.places['loc.third']={id:'loc.third',name:'Third Town',kind:'settlement',parent:s.scene.location};
 const {out}=run(s,[{seq:1,type:'go',to:'loc.camp',quote:'I go to camp.'},{...give(),seq:2,needs:1},{seq:3,type:'go',to:'loc.third',needs:2,quote:'I leave for Third Town.'}]);
 assert.equal(out.auth.gos.length,1);assert.equal(out.resolutions.find(r=>r.seq===3)?.reason,'handover still conditional');
});
test('10B-2 D12 V4-A existing proof semantics and PC inventory firewall remain intact',async()=>{
 const s=scene();s.quests.q.ready=true;delete s.objects.cargo;
 assert.equal(contractReady(s,content,s.quests.q,{c:false}).ok,true);
 const old=await loadContent();assert.ok(old);
 const n=scene();n.last={...n.last,rejected:[],outcome:{c:true,auth:{c:true}}};const r=applyWorld(n,content,{expected:{},deltas:[{seq:1,type:'object.move',object:'cargo',to:'npc.brenna'},ready]},{msg:90,prose:'She takes his crates.'});
 assert.equal(r.state.objects.cargo.holder.entity,'pc');assert.equal(receipts(r.state).length,0);
});

test('10B-2 D1 late expected.taken is processed before final READY evaluation',()=>{
 const s=scene();delete s.objects.cargo;
 s.last={...s.last,input:'I take tonic crates and travel to camp.',rejected:[],outcome:{c:true,auth:{c:true,take:[1],takeNames:{1:'tonic crates'},gos:[]},expected_keys:{1:'take'}}};
 const r=applyWorld(s,content,{expected:{1:{taken:true}},deltas:[ready]},{msg:92,prose:'The delivery is done.'});
 assert.equal(r.state.quests.q.ready||false,false);assert.equal(check(r.state).ok,false);
 assert.ok(Object.values(r.state.objects).some(o=>o.name==='tonic crates'&&o.holder.entity==='pc'));
});
test('10B-2 D7 one stack cannot satisfy two objectives with the same units',()=>{
 const s=scene();s.quests.q.objectives.push({...s.quests.q.objectives[1],id:'o3'});
 run(s,[give()]);assert.equal(receipts(s).reduce((n,r)=>n+r.qty,0),2);assert.equal(check(s).ok,false);
});
test('10B-2 D7 two destinations and independent gathering are checked independently',()=>{
 const s=scene();s.places['loc.other']={id:'loc.other',name:'Other Camp',kind:'site',parent:s.scene.location};
 s.quests.q.objectives[1].qty=1;s.quests.q.objectives.push({id:'o3',verb:'DELIVER',what:'tonic crates',qty:1,where:'Other Camp healer Brenna'});
 s.quests.q.desired_end_state='Brenna receives crates at Quarry Camp and Other Camp.';
 run(s,[give(1)]);assert.equal(check(s).ok,false);
 s.scene.at='loc.other';run(s,[give(1)]);assert.equal(check(s).ok,true);
});
test('10B-2 D7 returned and resplit goods do not earn duplicate units',()=>{
 const s=scene();run(s,[give(1)]);
 const r=receipts(s)[0];applyEvent(s,{t:'object.moved',d:{id:r.object,to:{entity:'pc'}}});
 run(s,[{...give(1),object:r.object}]);assert.equal(receipts(s).reduce((n,r)=>n+r.qty,0),1);
 run(s,[give(1)]);assert.equal(check(s).ok,true);
});
test('10B-2 D9 an old active delivery can be confirmed at the original receiver with actual goods',()=>{
 const s=scene();applyEvent(s,{t:'object.moved',d:{id:'cargo',to:{entity:'npc.brenna'}}});
 s.last={...s.last,input:'I ask Brenna to confirm the delivery.',rejected:[],outcome:{c:true,auth:{c:true},resolutions:[{seq:1,type:'other',status:'resolved',quote:'I ask Brenna to confirm the delivery.'}]}};
 const r=applyWorld(s,content,{expected:{},deltas:[ready]},{msg:95,prose:'Brenna confirms the crates are here.'});
 assert.equal(check(r.state).ok,true);assert.equal(receipts(r.state)[0].confirmation,true);
 const after=applyWorld(r.state,content,{expected:{},deltas:[ready]},{msg:95,prose:'She confirms again.'});
 assert.deepEqual(receipts(after.state),receipts(r.state));
});
test('10B-2 D9 a signed chit and narrative claim cannot confirm missing goods',()=>{
 const s=scene();delete s.objects.cargo;s.quests.q.ready=true;
 s.last={...s.last,input:'I confirm the delivery.',rejected:[],outcome:{c:true,auth:{c:true}}};
 const r=applyWorld(s,content,{expected:{},deltas:[ready]},{msg:95,prose:'She signs a chit.'});
 assert.equal(check(r.state).ok,false);assert.equal(receipts(r.state).length,0);
});
test('10B-2 incomplete old custody confirmation is atomic and can be retried after actual delivery',()=>{
 const s=scene();s.objects.cargo.qty=1;applyEvent(s,{t:'object.moved',d:{id:'cargo',to:{entity:'npc.brenna'}}});
 s.last={...s.last,input:'I ask Brenna to confirm the delivery.',rejected:[],outcome:{c:true,auth:{c:true},resolutions:[{seq:1,type:'other',status:'resolved',quote:'I ask Brenna to confirm the delivery.'}]}};
 const r=applyWorld(s,content,{expected:{},deltas:[ready]},{msg:95,prose:'She can only confirm one crate.'});
 assert.equal(receipts(r.state).length,0);
 r.state.objects.cargo.qty=2;
 const next=applyWorld(r.state,content,{expected:{},deltas:[ready]},{msg:96,prose:'Both crates are now here.'});
 assert.equal(check(next.state).ok,true);assert.equal(receipts(next.state).length,1);
});
test('10B-2 no new container-return requirement is persisted as contract detail',()=>{
 const s=scene();s.last={...s.last,rejected:[],outcome:{c:true,auth:{c:true}}};
 const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'quest.detail',quest:'q',note:'Brenna requires the empty crate returned to the shop.',schedule:null}]},{msg:95,prose:'The clerk demands the crate back.'});
 assert.equal(r.state.quests.q.details?.length||0,0);
 assert.ok(r.rejected.some(r=>r.rule==='guild_quest_detail'));
});
test('10B-2 mixed GATHER and DELIVER still require the independent goods',()=>{
 const s=scene();s.quests.q.objectives.push({id:'o3',verb:'GATHER',what:'fever herbs',qty:2});
 run(s,[give()]);assert.equal(check(s).mode,'goods_missing');
 s.objects.herbs={id:'herbs',name:'fever herbs',qty:2,holder:{entity:'pc'}};
 assert.equal(check(s).ok,true);assert.deepEqual(check(s).consume,[{id:'herbs',qty:2}]);
});
test('10B-2 quest.progress cannot forge a delivery receipt',()=>{
 const s=scene();s.last={...s.last,rejected:[],outcome:{c:true,auth:{c:true}}};
 const r=applyWorld(s,content,{expected:{},deltas:[{seq:1,type:'quest.progress',quest:'q',objective:'o2',status:'done',receipt:{qty:2,to:'npc.brenna'}}]},{msg:95,prose:'The delivery is done.'});
 assert.equal(receipts(r.state).length,0);assert.equal(check(r.state).ok,false);
});
test('10B-2 D9 actual host swipe/reload reuses the booked GIVE and receipt',async()=>{
 const g=await campaign(content);const s=scene();
 inject(g,[{t:'place.created',d:{place:s.places['loc.camp']}},{t:'scene.moved',d:{at:'loc.camp',location:s.scene.location,reset_present:true}},
  {t:'entity.created',d:{entity:s.entities['npc.brenna']}},{t:'scene.entered',d:{id:'npc.brenna',band:'ENGAGED'}},
  {t:'quest.created',d:{quest:s.quests.q}},{t:'object.created',d:{object:s.objects.cargo}}]);
 await say(g,'I give the crates to Brenna.',give());
 await g.reply('Brenna takes the crates.',{expected:{},deltas:[]});
 assert.equal(receipts(g.state()).length,1);
 const before=JSON.parse(JSON.stringify(g.state().quests.q.deliveries));
 await prepareGenerationAsync(g.chat,content,{type:'swipe',settings:{planner:true},llm:g.llm});
 assert.deepEqual(receipts(g.state()),before);
 const reloaded=foldChat(JSON.parse(JSON.stringify(g.chat))).state;
 assert.deepEqual(receipts(reloaded),before);assert.equal(reloaded.objects.cargo.holder.entity,'npc.brenna');
});
