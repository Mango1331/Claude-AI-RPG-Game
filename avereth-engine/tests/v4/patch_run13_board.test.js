import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseBoard, boardRequest, bookBoard, completeContract, contractReady } from '../../src/v4/guild.js';
import { generateBoard } from '../../src/v4/runtime.js';
import { applyEvent } from '../../src/state.js';
import { resolveCommands } from '../../src/v4/commands.js';
const content=await loadProductContent(),fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/run13_boards.json',import.meta.url)));
const clone=structuredClone;
const need=s=>({branch:'loc.glassmere',rank:'Novice',missing:5,have:[],day:Math.floor(s.clock.minute/1440)+1,c:true});
const original=()=>JSON.parse(fixture.boards[0].answer).listings;
const parse=(s,ls,n=need(s))=>parseBoard(JSON.stringify({listings:ls}),content,n,s);
for(const f of fixture.boards) test(`Run 13 board original call ${f.call}: ${f.repair?'reject wrong repaired distribution':'publish hunt plus clearance'}`,()=>{
 const s=clone(fixture.states[f.turn]),r=parseBoard(f.answer,content,need(s),s);
 if(f.repair){assert.equal(r.listings,null);assert.match(r.errors.join(' '),/board requires/);}
 else {assert.equal(r.listings?.length,5,JSON.stringify(r));assert.equal(r.refused.length,0);}
});
test('Run 13 board: two real clearances are rejected, including an existing notice on partial refill',()=>{
 const s=clone(fixture.states[8]),ls=original();ls[0]=clone(ls[4]);ls[0].title='Another full clearance';
 const r=parse(s,ls);assert.ok(r.refused.length||r.errors.length);
 const retained=clone(original()[4]);s.quests.keep={...retained,id:'keep',status:'listed',kind:'guild_contract',source:{branch:'loc.glassmere'}};
 const n={...need(s),missing:1,have:[retained.title]};assert.ok(parse(s,[ls[4]],n).refused.length);
});
test('Run 13 board: a retained numbered dungeon hunt does not consume the clearance category',()=>{
 const s=clone(fixture.states[8]),ls=original(),kept=ls.slice(0,4);
 for(const [i,l] of kept.entries())s.quests['keep'+i]={...l,id:'keep'+i,status:'listed',kind:'guild_contract',source:{branch:'loc.glassmere'}};
 const n={...need(s),missing:1,have:kept.map(l=>l.title)},r=parse(s,[ls[4]],n);assert.equal(r.listings?.length,1,JSON.stringify(r));
 assert.doesNotMatch(boardRequest(s,content,n).user,/write no other work in them/);
});
test('Run 13 board: absent suitable known dungeon uses three hunts, never invents a clearance',()=>{
 const s=clone(fixture.states[8]);for(const p of Object.values(s.places))delete p.dungeon;
 const ls=original();ls[0].objectives[0].where='western meadow';ls[0].title='Meadow beetles';ls[0].task='Cull meadow beetles';ls[0].desired_end_state='Beetles culled';ls[0].objectives=ls[0].objectives.slice(0,1);
 ls[4]={...clone(ls[1]),title:'Pasture wolves',task:'Cull pasture wolves',desired_end_state:'Pasture safe',objectives:[{verb:'DEFEAT',what:'wolf',where:'western pasture',qty:1,unit:null}]};
 assert.equal(parse(s,ls).listings?.length,5);
 ls[4]=original()[4];assert.ok(parse(s,ls).refused.length||parse(s,ls).errors.length);
});
test('Run 13 board: legacy retains its old one-dungeon-job constraint',()=>{
 const s=clone(fixture.states[8]);s.meta.ruleset=1;const r=parse(s,original());assert.equal(r.listings.length,4);assert.match(r.refused[0].why,/at most one Dungeon job/);
});
test('Run 13 board: original generation publishes once, accepts a real listing and uses unchanged turn-in/payout',async()=>{
 const s=clone(fixture.states[8]),n=need(s),calls=[];
 const g=await generateBoard(async req=>{calls.push(req);return fixture.boards[0].answer;},s,content,n);
 assert.equal(calls.length,1);assert.equal(g.listings?.length,5,JSON.stringify(g));
 const ev=[],emit=e=>{ev.push(e);applyEvent(s,e);};bookBoard(s,content,n,g.listings,emit);
 const q=Object.values(s.quests).find(q=>q.kind==='guild_contract'&&q.objectives.some(o=>o.verb==='DEFEAT'&&o.qty===1));assert.ok(q);
 resolveCommands(s,content,[{seq:1,type:'quest.accept',quest:q.id,quote:'I accept this Guild contract.'}],emit,{c:true});assert.equal(q.status,'active');
 // Engine-owned result as precondition: ordinary hunt achieved by a recorded story alternative, no counterfeit kills.
 emit({t:'quest.ready',d:{id:q.id,note:'The colony dispersed permanently',alternative:'The colony dispersed permanently'}});
 assert.equal(contractReady(s,content,q,{c:true}).ok,true);const money=s.entities.pc.sheet.coin_cp;
 resolveCommands(s,content,[{seq:2,type:'quest.turn_in',quest:q.id,quote:'I turn in this Guild contract.'}],emit,{c:true});
 assert.equal(q.status,'completed');assert.equal(s.entities.pc.sheet.coin_cp,money+q.payout_cp);assert.ok(ev.some(e=>e.t==='xp.changed'));
 resolveCommands(s,content,[{seq:3,type:'quest.turn_in',quest:q.id,quote:'I turn in this Guild contract again.'}],emit,{c:true});assert.equal(s.entities.pc.sheet.coin_cp,money+q.payout_cp);
 const replay=clone(fixture.states[8]);for(const e of JSON.parse(JSON.stringify(ev)))applyEvent(replay,e);assert.deepEqual(JSON.parse(JSON.stringify(replay)),JSON.parse(JSON.stringify(s)));
});
test('Run 13 board: rank-incompatible floors and nonexistent cull populations remain invalid', () => {
 const s=clone(fixture.states[8]),ls=original();
 ls[4]=JSON.parse(JSON.stringify(ls[4]).replaceAll('level 1','level 99'));
 const root=s.places['loc.glimmerdeep_grotto'].dungeon;
 root.rank={min:'F',max:'S'};root.levels[99]={min:'S',max:'S'};root.known_by ||= {};

 assert.ok(parse(s,ls).refused.some(r=>/level 99/.test(r.why)));
 const bad=original();bad[0].objectives[0].what='ordinary chickens';bad[0].objectives[0].unit=null;
 assert.ok(parse(clone(fixture.states[8]),bad).refused.some(r=>/no cull/.test(r.why)));
});
test('Run 13 board: repair still has one chance and cannot publish the original wrong distribution', async () => {
 const s=clone(fixture.states[8]),calls=[];
 const r=await generateBoard(async req=>{calls.push(req);return calls.length===1?'not JSON':fixture.boards[1].answer;},s,content,need(s));
 assert.equal(calls.length,2);assert.equal(r.listings.length,0);assert.match(JSON.stringify(r),/board requires/);
});
