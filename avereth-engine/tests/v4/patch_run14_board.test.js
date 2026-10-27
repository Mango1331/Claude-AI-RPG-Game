import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseBoard, boardRequest, bookBoard } from '../../src/v4/guild.js';
import { boardFor, generateBoard } from '../../src/v4/runtime.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
const c=await loadProductContent(),f=JSON.parse(fs.readFileSync(new URL('./fixtures/run13_boards.json',import.meta.url)));
const clone=structuredClone;
const old=()=>JSON.parse(f.boards[0].answer).listings;
function state(){const s=clone(f.states[8]);s.guild.boards={};return s;}
const legacyNeed=s=>({branch:'loc.glassmere',rank:'Novice',day:Math.floor(s.clock.minute/1440)+1,have:[],missing:5,c:true});
const need=s=>({...legacyNeed(s),profile:'hunt_clear'});
const hunt=(title,qty=1)=>({title,client:'local farmer',rank:'Novice',level:1,qtype:'minor',payout_cp:30,task:'Cull a feral wolf at the western pasture.',desired_end_state:'The feral wolf at the western pasture is defeated.',objectives:[{verb:'DEFEAT',what:'feral wolf',qty,unit:null,where:'western pasture'}],proof:[]});
function board(){const ls=old();ls[2]=hunt('Wolf near the mill');ls[3]=hunt('Wolf by the western pasture',2);return ls;}
const parse=(s,ls,n=need(s))=>parseBoard(JSON.stringify({listings:ls}),c,n,s);

test('Run14 board: live V4-C requests select the new profile, while A/Ruleset1 remain legacy',()=>{
 const s=state(),cmds=[{seq:1,type:'board.read',rank:'Novice'}];
 assert.equal(boardFor(s,c,cmds,{c:true}).profile,'count_hunt_clear');
 assert.equal(boardFor(s,c,cmds,{c:false}).profile,undefined);
 s.meta.ruleset=1;assert.equal(boardFor(s,c,cmds,{c:true}).profile,undefined);
});
test('Run14 board: four hunts and one clearance, including a numbered dungeon hunt',()=>{
 const s=state(),r=parse(s,board());assert.equal(r.listings?.length,5,JSON.stringify(r));assert.equal(r.refused.length,0);
 const req=boardRequest(s,c,need(s));assert.match(req.system,/4 monster hunts, 0 deliveries, 1 Dungeon clearance/);
 assert.doesNotMatch(req.system,/Each delivery objective MUST/);
});
test('Run14 board: no suitable known dungeon means five hunts, never new deliveries',()=>{
 const s=state();for(const p of Object.values(s.places))delete p.dungeon;
 const ls=Array.from({length:5},(_,i)=>hunt('Pasture hunt '+i,i+1));
 assert.equal(parse(s,ls).listings?.length,5);assert.match(boardRequest(s,c,need(s)).system,/5 monster hunts, 0 deliveries, 0 Dungeon clearance/);
 assert.ok(parse(s,old()).refused.length||parse(s,old()).errors.length);
});
test('Run14 board: new delivery replacements, missing introductory hunt and duplicate clearances are rejected',()=>{
 const s=state();assert.ok(parse(s,old()).refused.some(r=>/delivery.*suspended/i.test(r.why)));
 let ls=board();for(const l of ls)for(const o of l.objectives)if(o.qty!==null)o.qty=2;
 assert.match(parse(s,ls).errors.join(' '),/introductory/);
 ls=board();ls[3]=clone(ls[4]);ls[3].title='Second clearance';assert.ok(parse(s,ls).refused.some(r=>/one Dungeon clearance/.test(r.why)));
});
test('Run14 board: unsuitable dungeon floor and unavailable cull population remain blocked',()=>{
 const s=state(),ls=board();ls[0].objectives[0].what='ordinary chickens';ls[0].objectives[0].unit=null;
 assert.ok(parse(s,ls).refused.some(r=>/no cull/.test(r.why)));
 ls[4]=JSON.parse(JSON.stringify(ls[4]).replaceAll('level 1','level 99'));s.places['loc.glimmerdeep_grotto'].dungeon.rank={min:'F',max:'S'};
 assert.ok(parse(s,ls).refused.some(r=>/level 99/.test(r.why)));
});
test('Run14 board: generator and one repair obey the same profile',async()=>{
 const s=state(),n=boardFor(s,c,[{seq:1,type:'board.read',rank:'Novice'}],{c:true}),calls=[];
 const r=await generateBoard(async req=>{calls.push(req);return JSON.stringify({listings:calls.length===1?old():board().map(l=>({...l,objectives:l.objectives.filter(o=>o.verb==='DEFEAT')}))});},s,c,n);
 assert.equal(calls.length,2);assert.equal(r.listings.length,5);assert.equal(r.profile,'count_hunt_clear');
 assert.match(calls[1].messages.at(-1).content,/suspended|valid listing/);
 let count=0;const failed=await generateBoard(async()=>{count++;return JSON.stringify({listings:old()});},s,c,n);
 assert.equal(count,2);assert.equal(failed.listings.length,0);assert.ok(failed.failed);
});
test('Run14 board: an already published legacy board remains unchanged and needs no regeneration',()=>{
 const s=state(),ls=parse(s,old(),legacyNeed(s)).listings;assert.equal(ls.length,5);
 bookBoard(s,c,legacyNeed(s),ls,e=>applyEvent(s,e));const snapshot=clone(s);
 assert.equal(boardFor(s,c,[{seq:1,type:'board.read',rank:'Novice'}],{c:true}),null);assert.deepEqual(s,snapshot);
 assert.equal(Object.values(s.quests).filter(q=>q.objectives.some(o=>o.verb==='DELIVER')).length,2);
});
test('Run14 board: partial refill retains published deliveries but never generates another',()=>{
 const s=state(),oldList=parse(s,old(),legacyNeed(s)).listings;
 const kept=[oldList[0],oldList[2],oldList[3],oldList[4]];
 for(const [i,l]of kept.entries())s.quests['keep'+i]={...l,id:'keep'+i,status:'listed',kind:'guild_contract',source:{branch:'loc.glassmere'}};
 const n={...need(s),have:kept.map(l=>l.title),missing:1};
 assert.equal(parse(s,[hunt('Roadside wolf')],n).listings?.length,1);
 assert.ok(parse(s,[oldList[2]],n).refused.some(r=>/suspended/i.test(r.why)));
});
test('Run14 board: cached unversioned 2+2+1 requests and old rulesets keep their validation',()=>{
 const s=state();assert.equal(parse(s,old(),legacyNeed(s)).listings.length,5);
 s.meta.ruleset=1;assert.equal(parse(s,old()).listings.length,4);
});
test('Run14 board: a published delivery still accepts, transfers real cargo, reaches READY and pays exactly once with replay',()=>{
 let s=state();const ls=parse(s,old(),legacyNeed(s)).listings;
 bookBoard(s,c,legacyNeed(s),ls,e=>applyEvent(s,e));
 const q=Object.values(s.quests).find(q=>q.objectives[0].verb==='DELIVER'),hall=s.scene.at;
 resolveCommands(s,c,[{seq:1,type:'quest.accept',quest:q.id,quote:'I accept this Guild delivery.'}],e=>applyEvent(s,e),{c:true});assert.equal(q.status,'active');
 const o=q.objectives[0],dest='loc.delivery_destination',who='npc.delivery_receiver';
 s.places[dest]={id:dest,name:o.delivery.place,kind:'site',parent:'loc.glassmere'};s.scene.at=dest;s.scene.present=['pc',who];
 s.entities[who]={id:who,kind:'npc',name:o.delivery.recipient,descriptors:[o.delivery.recipient],status:'alive',location:s.scene.location};
 s.objects.cargo={id:'cargo',name:o.what,qty:o.qty,kind:'item',holder:{entity:'pc'},for_quests:[q.id]};
 const before=clone(s),events=[],emit=e=>{events.push(e);applyEvent(s,e);};
 resolveCommands(s,c,[{seq:2,type:'give',object:'cargo',qty:o.qty,to:who,quote:'I hand over the cargo.'}],emit,{c:true});
 assert.equal(s.objects.cargo.holder.entity,who);assert.equal(s.quests[q.id].deliveries.length,1);
 s.last.outcome={c:true,auth:{c:true,gos:[]},expected_keys:{}};
 const r=applyWorld(s,c,{scene:dest,expected:{},deltas:[{seq:1,type:'quest.ready',quest:q.id,note:'The agreed cargo was handed over.',depends_on:[]}]},{msg:48});
 s=r.state;events.push(...r.events);assert.equal(s.quests[q.id].ready,true);
 s.scene.at=hall;const money=s.entities.pc.sheet.coin_cp;
 resolveCommands(s,c,[{seq:3,type:'quest.turn_in',quest:q.id,quote:'I turn in the contract.'}],emit,{c:true});
 assert.equal(s.quests[q.id].status,'completed');assert.equal(s.entities.pc.sheet.coin_cp,money+q.payout_cp);assert.ok(events.some(e=>e.t==='xp.changed'));
 resolveCommands(s,c,[{seq:4,type:'quest.turn_in',quest:q.id,quote:'I turn it in again.'}],emit,{c:true});assert.equal(s.entities.pc.sheet.coin_cp,money+q.payout_cp);
 const replay=clone(before);for(const e of JSON.parse(JSON.stringify(events)))applyEvent(replay,e);
 for(const key of ['quests','objects','guild'])assert.deepEqual(JSON.parse(JSON.stringify(replay[key])),JSON.parse(JSON.stringify(s[key])));
 assert.deepEqual(replay.entities.pc.sheet,s.entities.pc.sheet);
});
