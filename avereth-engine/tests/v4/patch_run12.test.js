import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, walk, delve, hero, CATA } from './patch8_lib.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { deliveryTarget } from '../../src/v4/delivery.js';
const content = await loadProductContent();
const base = (await campaign(content)).state();
const world = (s,d) => applyWorld(s,content,contractValue({expected:{},deltas:d}, s, content),{msg:146,prose:'Three skeletons stand in the chamber beyond the crawl.'});
test('Run12 distant exact slot creates one population, then enters once and replays', async () => {
 const g=await campaign(content); hero(g); await walk(g,CATA); await delve(g,'First Burial Gallery',{bring:false});
 const s=g.state(), x=s.dungeons[CATA], sl=x.run.floors[1].slots.find(a=>!a.entities.length && !a.taken);
 sl.count=3; sl.levels=[4,3,2]; x.ahead={turn:s.turn,cycle:x.cycle,floor:1,slot:sl.id};
 const d={seq:1,type:'creature.new',ref:sl.ref,species:sl.species,anchor:sl.anchor,count:3,desc:[],present:false};
 const r=world(s,[d]); const ids=r.state.dungeons[CATA].run.floors[1].slots.find(a=>a.id===sl.id).entities;
 assert.equal(ids.length,3); assert.equal(r.events.filter(e=>e.t==='entity.created' && e.d.entity.kind==='creature').length,3);
 assert.ok(ids.every(id=>!r.state.scene.present.includes(id)));
 const repeat=world(r.state,[d]); assert.equal(repeat.events.filter(e=>e.t==='entity.created').length,0);
 const enter=world(repeat.state,[{...d,present:true}]); assert.ok(ids.every(id=>enter.state.scene.present.includes(id)));
 assert.equal(enter.events.filter(e=>e.t==='entity.created').length,0);
 const replay=structuredClone(s); for(const e of JSON.parse(JSON.stringify([...r.events,...repeat.events,...enter.events]))) applyEvent(replay,e);
 assert.deepEqual(JSON.parse(JSON.stringify(replay)),JSON.parse(JSON.stringify(enter.state)));
 enter.state.places.other={id:'other',kind:'interior',name:'Other',parent:CATA,level:1}; enter.state.scene.at='other'; enter.state.scene.present=[];
 const elsewhere=world(enter.state,[{...d,present:true}]); assert.ok(ids.every(id=>!elsewhere.state.scene.present.includes(id)));
});
test('distant world creature is not local',()=>{
 const r=world(base,[{seq:1,type:'creature.new',ref:'cre.remote_wolf',species:'wolf',anchor:'wolf',count:1,desc:[],present:false}]);
 const id=r.events.find(e=>e.t==='entity.created')?.d.entity.id; assert.ok(id); assert.ok(!r.state.scene.present.includes(id));
});
function delivery(receiver) {
 const s=structuredClone(base); s.places.shed={id:'shed',name:'Receiving Shed',kind:'interior'};s.scene.at='shed';s.scene.present=['npc.other'];
 s.entities['npc.other']={id:'npc.other',kind:'npc',name:'Odell',descriptors:['clerk'],status:'alive'};
 const o={id:'o1',verb:'DELIVER',what:'ledger',qty:1,where:'Clerk Fenwick at Receiving Shed',delivery:{v:1,mode:'give',recipient_kind:'name',recipient:receiver,place:'Receiving Shed'}};
 return {s,o,q:{objectives:[o],desired_end_state:'Delivered'}};
}
test('typed named receiver never falls back to another clerk',()=>{
 const {s,q,o}=delivery('Fenwick'); assert.equal(deliveryTarget(s,q,o,{entity:'npc.other'}),false);
 s.entities['npc.other'].name='Fenwick'; assert.equal(deliveryTarget(s,q,o,{entity:'npc.other'}),true);
});
test('typed role is independent of display where and survives JSON',()=>{
 const {s,q,o}=delivery('clerk');o.delivery.recipient_kind='role';o.where='display only';
 assert.equal(deliveryTarget(s,q,o,{entity:'npc.other'}),true);
 const copy=JSON.parse(JSON.stringify({s,q,o})); assert.equal(deliveryTarget(copy.s,copy.q,copy.o,{entity:'npc.other'}),true);
});

import fs from 'node:fs';
import { parseBoard, bookBoard } from '../../src/v4/guild.js';
import { transferCargo } from '../../src/v4/delivery.js';
// Package C (.132): original answers predate the population contract; the documented conversion (tools/replay/contract_c.mjs)
import { contractValue } from '../../tools/replay/contract_c.mjs';
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/run12_e146.json',import.meta.url)));
const boards = JSON.parse(fs.readFileSync(new URL('./fixtures/run12_boards.json',import.meta.url)));
const need={branch:'loc.ashbridge',rank:'Novice',missing:5,have:[],day:1,c:true};
test('original E146: six-body path becomes exactly three distant slot identities',()=>{
 const r=applyWorld(original.state,content,contractValue(original.raw, original.state, content),{msg:146,prose:'Three goblins stand beyond the crawl.'});
 const created=r.events.filter(e=>e.t==='entity.created' && e.d.entity.kind==='creature').map(e=>e.d.entity.id);
 assert.equal(created.length,3); assert.ok(created.every(id=>r.state.entities[id].slot && !r.state.scene.present.includes(id)));
 assert.equal(r.events.filter(e=>e.t==='dungeon.slot' && e.d.set.entities).length,1);
});
for(const [i,b] of boards.entries()) test(`original board ${i}: field-specific repair and typed publication to receipt`,()=>{
 const bad=parseBoard(b,content,need,original.state); assert.equal(bad.refused.length,2);
 assert.ok(bad.refused.every(x=>x.why.includes('separator')));
 const answer=JSON.parse(b);
 for(const l of answer.listings) for(const o of l.objectives) if(o.verb==='DELIVER') {
  o.delivery={v:1,mode:'give',recipient_kind:'role',recipient:'granary keeper',place:'Receiving Shed'};
 }
 const parsed=parseBoard(JSON.stringify(answer),content,need,original.state);assert.equal(parsed.listings.length,5);
 const s=structuredClone(base),events=[],emit=e=>{events.push(e);applyEvent(s,e);};
 bookBoard(s,content,need,parsed.listings,emit);
 const q=Object.values(s.quests).find(q=>q.objectives.some(o=>o.verb==='DELIVER'));q.status='active';const o=q.objectives[0];
 s.places.shed={id:'shed',name:'Receiving Shed',kind:'interior'};s.scene.at='shed';s.scene.present=['npc.keeper'];
 s.entities['npc.keeper']={id:'npc.keeper',kind:'npc',name:'Odell',descriptors:['granary keeper'],status:'alive'};
 s.objects.cargo={id:'cargo',kind:'item',name:o.what,qty:o.qty,holder:{entity:'pc'},for_quests:[q.id]};
 transferCargo(s,content,emit,s.objects.cargo,{entity:'npc.keeper'},o.qty,1);
 assert.equal(q.deliveries.length,1);assert.equal(q.deliveries[0].qty,o.qty);
 const replay=structuredClone(base);for(const e of events.filter(e=>e.t==='quest.created'))applyEvent(replay,JSON.parse(JSON.stringify(e)));
 assert.deepEqual(replay.quests[q.id].objectives[0].delivery,o.delivery);
});
test('typed delivery: parent, wrong role and floor drop cannot replace exact receiver',()=>{
 const {s,q,o}=delivery('granary keeper');o.delivery.recipient_kind='role';
 s.places.parent={id:'parent',name:'Granary',kind:'site'};s.places.shed.parent='parent';
 assert.equal(deliveryTarget(s,q,o,{entity:'npc.other'}),false);
 s.entities['npc.other'].descriptors=['granary keeper'];s.scene.at='parent';assert.equal(deliveryTarget(s,q,o,{entity:'npc.other'}),false);
 s.scene.at='shed';assert.equal(deliveryTarget(s,q,o,{loc:'shed'},'shed',{drop:true}),false);
 o.delivery={v:1,mode:'drop',recipient_kind:null,recipient:null,place:'Receiving Shed'};
 assert.equal(deliveryTarget(s,q,o,{loc:'shed'},'shed',{drop:true}),true);
});
