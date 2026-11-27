// .199: approved encounter plan A01–A20; synthetic boundaries plus unchanged .191 answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { E, reply191, eventsOf, before191, run191 } from './batch191_lib.js';
import { applyWorld } from '../../src/v4/world.js';
import { startCampaign } from '../../src/engine.js';
import { emptyState, applyEvent } from '../../src/state.js';
function base(){
 const s=emptyState();for(const e of startCampaign(E.content,{runtime:'v4',ruleset:2,planner:true,seed:7}))applyEvent(s,e);
 s.places['loc.moor']={id:'loc.moor',name:'Red moor',kind:'wilderness',parent:'realm.valedorn_crown',realm:'realm.valedorn_crown',tags:[]};
 s.scene.at='loc.moor';s.mode='story';s.entities.pc.sheet.coin_cp=100;
 s.last.outcome={kind:'v4',c:true,auth:{c:true,gos:[],pulse:{v:1,governs:true,rolled:true,open:false,exposure:'scene'}},expected_keys:{}};
 return s;
}
const apply=(s,deltas,prose)=>applyWorld(s,E.content,{scene:'here',expected:{},deltas:deltas.map((d,i)=>({seq:i+1,...d}))},{msg:50,prose});
const newPerson={type:'person.new',ref:'robber',name:'Rask',role:'bandit',desc:['armed bandit'],present:true,relevant:true,at:null,band:'SHORT'};
const take=(by)=>({type:'coerce',by,kind:'robbery',coin_cp:10,object:null,because:'at knife point'});

function known(){const s=base();s.entities['npc.rask']={id:'npc.rask',kind:'npc',name:'Rask',status:'alive',descriptors:['bandit'],template:'bandit',at:null,card:{}};s.scene.present=['pc'];return s;}
const enter={type:'enter',who:'npc.rask',evidence:'Rask stood beside him.'};
const prose='Rask stood beside him. Rask lunges at him with his knife. The bandit took ten copper from his purse at knife point.';
test('A01 known arrival cannot take',()=>{const r=apply(known(),[enter,take('npc.rask')],prose);assert.equal(r.state.entities.pc.sheet.coin_cp,100);assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));});
test('A07 known arrival cannot attack in a closed window',()=>{const r=apply(known(),[enter,{type:'hostile',by:['npc.rask']}],prose);assert.ok(r.rejected.some(x=>x.rule==='pulse'));});
test('A11 original widow',async()=>{const r=await reply191('r191',26);assert.ok(r.state().scene.present.includes('npc.widow_hesse'));});
test('A15 original sign',async()=>{const r=await reply191('w191',42);const d=eventsOf(r.record,'pulse.outcome')[0].d;assert.equal(d.persisted.threads,1);assert.equal(d.narrated,'likely');});
const diag=r=>r.events.find(e=>e.t==='pulse.outcome').d;
test('A02/A06 established actors keep rights, including leave/return and duplicate enter',()=>{
 for(const prefix of [[],[enter],[{type:'leave',who:'npc.rask'},enter]]){const s=known();s.scene.present.push('npc.rask');const r=apply(s,[...prefix,take('npc.rask')],prose);assert.equal(r.state.entities.pc.sheet.coin_cp,90);assert.equal(diag(r).persisted.npc_reentries,0);}
 const r=apply(base(),[newPerson,take('robber')],prose);assert.equal(r.state.entities.pc.sheet.coin_cp,100);
});
test('A03 guard fine/confiscation; A04 identity reuse; A16 deduplication',()=>{
 for(const kind of ['robbery','fine','confiscation'])for(const route of ['enter','reuse']){
  const s=known();s.entities['npc.rask'].at=s.scene.at;s.entities['npc.rask'].descriptors=['guard'];
  const intro=route==='enter'?enter:{...newPerson,ref:'npc.rask',role:'guard'};
  const r=apply(s,[intro,enter,{...take('npc.rask'),kind}],prose);
  assert.equal(r.state.entities.pc.sheet.coin_cp,100);assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));assert.equal(diag(r).persisted.npc_reentries,1);
 }
});
test('A05 mention, invalid presence, absent introduction and dead actor are not returns',()=>{
 for(const [deltas,story] of [[[], 'Rask was mentioned.'],[[{...newPerson,ref:'npc.rask',present:false}], 'Rask is elsewhere.']]){const r=apply(known(),deltas,story);assert.equal(diag(r).persisted.npc_reentries,0);}
 const s=known();s.entities['npc.rask'].status='dead';assert.equal(diag(apply(s,[enter],prose)).persisted.npc_reentries,0);
});
test('A07/A08 closed and peaceful windows forbid new attack; danger does not grant neutral NPC privileges',()=>{
 for(const kind of ['meeting','trouble','danger']){
  const s=known();Object.assign(s.last.outcome.auth.pulse,{open:true,kind});
  const r=apply(s,[enter,{type:'hostile',by:['npc.rask']}],prose);
  assert.equal(r.rejected.some(x=>x.rule==='pulse'),kind!=='danger');
  if(kind==='danger')assert.ok(r.state.encounter || r.state.pending_combat.length);
 }
 const s=known();s.entities['npc.rask'].descriptors=['clerk'];s.entities['npc.rask'].template='commoner';Object.assign(s.last.outcome.auth.pulse,{open:true,kind:'danger'});
 const r=apply(s,[enter,{type:'hostile',by:['npc.rask']}],prose);assert.ok(!r.state.encounter && !r.state.pending_combat.length);
});
test('A09 pending actors retain rights, newcomer becomes established next reply',()=>{
 const s=known();s.pending_combat=[{by:'npc.rask'}];const r=apply(s,[enter,take('npc.rask')],prose);assert.equal(r.state.entities.pc.sheet.coin_cp,90);
 const first=apply(known(),[enter,take('npc.rask')],prose);const next=apply(first.state,[take('npc.rask')],prose);assert.equal(next.state.entities.pc.sheet.coin_cp,90);
});
test('A16/A17 accepted threads count, rejected ones and episodes do not; closed window stays null',()=>{
 const d={type:'thread',kind:'sign',text:'Fresh tracks lead into the reeds.',status:'open'};
 for(const open of [true,false]){const s=known();Object.assign(s.last.outcome.auth.pulse,{open,kind:open?'trace':null});const r=apply(s,[d],'Fresh tracks lead into the reeds.');assert.equal(diag(r).persisted.threads,1);assert.equal(diag(r).narrated,open?'likely':null);}
 const s=known();s.last.outcome.auth.pulse.open=true;const r=apply(s,[{...d,id:'thread.missing',status:'resolved'}],'The tracks were gone.');assert.equal(diag(r).persisted.threads,0);assert.equal(diag(r).narrated,'none');
});
test('A20 original reply replay is deterministic and does not advance dice',async()=>{
 const a=await reply191('r191',26),b=await reply191('r191',26);assert.deepEqual(a.state(),b.state());assert.equal(eventsOf(a.record,'scene.entered').filter(e=>e.d.id==='npc.widow_hesse').length,1);
});
test('A04 unnamed service identity reuse is protected',()=>{
 const s=known();s.entities['npc.rask'].at=s.scene.at;s.entities['npc.rask'].descriptors=['merchant'];
 const r=apply(s,[{...newPerson,name:null,ref:'guard',role:'merchant'},{...take('guard'),kind:'fine'}],prose);
 assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));assert.equal(diag(r).persisted.npc_reentries,1);
});
test('A18 a thread cannot substitute for missing mechanical rest interruption cause',()=>{
 const s=known();Object.assign(s.last.outcome.auth.pulse,{open:true,kind:'trouble',interrupt:{cause:'trouble',kind:'sleep',of_min:60,after_min:15,minute:600}});
 const r=apply(s,[{type:'thread',kind:'sign',text:'Fresh tracks outside.',status:'open'}],'Fresh tracks outside.');
 assert.equal(diag(r).persisted.threads,1);assert.ok(r.corrections.some(x=>x.startsWith('REST INTERRUPTED')));
});
test('A03 object confiscation is also blocked before transfer',()=>{
 const s=known();s.entities['npc.rask'].descriptors=['guard'];
 applyEvent(s,{t:'object.created',d:{object:{id:'obj.token',name:'Token',qty:1,holder:{entity:'pc'}}}});
 const r=apply(s,[enter,{...take('npc.rask'),kind:'confiscation',coin_cp:0,object:'obj.token'}],prose);
 assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));assert.equal(r.state.objects['obj.token'].holder.entity,'pc');
});
test('A09 active combat presence restoration is not a fresh PULSE arrival',()=>{
 const s=known();s.scene.present.push('npc.rask');const fighting=apply(s,[{type:'hostile',by:['npc.rask']}],prose).state;
 assert.ok(fighting.encounter || fighting.pending_combat.length);fighting.scene.present=fighting.scene.present.filter(id=>id!=='npc.rask');
 const r=apply(fighting,[enter,take('npc.rask')],prose);assert.ok(!r.rejected.some(x=>x.rule==='pulse_take'));
});
test('A04 absent variant of original met protects against immediate coercion',()=>{
 const s=before191('r191',26);s.scene.present=s.scene.present.filter(id=>id!=='npc.widow_hesse');
 const answer=JSON.parse(run191('r191').answers[26][0].content);answer.deltas.push({seq:99,...take('npc.widow_hesse')});
 const r=applyWorld(s,E.content,answer,{msg:26,prose:run191('r191').chat[26].mes});
 assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));assert.ok(r.state.scene.present.includes('npc.widow_hesse'));
});
test('A09 a new attack in this reply cannot grant a later returnee taking rights',()=>{
 for(const first of [true,false]){
 const s=known();Object.assign(s.last.outcome.auth.pulse,{open:true,kind:'danger'});
 const attack=[{...newPerson,name:'Venn',ref:'venn'},{type:'hostile',by:['venn']}];
 const r=apply(s,first?[...attack,enter,take('npc.rask')]:[enter,...attack,take('npc.rask')],prose+' Venn lunges at him with his knife.');
 assert.ok(r.rejected.some(x=>x.rule==='pulse_take'));assert.equal(r.state.entities.pc.sheet.coin_cp,100);
 }
});
test('A17 thread updates and resolutions are accepted booking signals',()=>{
 const s=known();Object.assign(s.last.outcome.auth.pulse,{open:true,kind:'trace'});
 const first=apply(s,[{type:'thread',kind:'sign',text:'Fresh tracks in the mud.',status:'open'}],'Fresh tracks in the mud.');
 const id=Object.keys(first.state.threads)[0];
 for(const status of ['open','resolved']){const r=apply(first.state,[{type:'thread',id,kind:'sign',text:'Fresh tracks in the mud.',status,resolution:status==='resolved'?'The rain washed them away.':null}],'The rain washed them away.');assert.equal(diag(r).persisted.threads,1);assert.equal(diag(r).narrated,'likely');}
});
