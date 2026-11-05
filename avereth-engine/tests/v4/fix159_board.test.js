import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import zlib from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {foldChat} from '../../src/host.js';
import {generateBoard} from '../../src/v4/runtime.js';
import {parseBoard} from '../../src/v4/guild.js';
import {playerTurnV4,replyTurnV4} from '../../src/v4/turn.js';
import {applyEvent} from '../../src/state.js';
import {setFactEvents} from '../../src/knowledge.js';
const content=await loadProductContent();
const f=JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user03_board158.json.gz',import.meta.url))));
const before=()=>foldChat(structuredClone(f.prefix)).state;
const need={branch:'loc.ashbridge',rank:'Novice',missing:5,have:[],c:true,profile:'count_hunt_clear',progression:true,day:0};
function legal(raw){const x=JSON.parse(raw),l=x.listings.find(l=>l.level===1);for(const k of ['title','task','desired_end_state'])if(l[k])l[k]=l[k].replace(/boars?/gi,'giant rat');l.objectives[0].what='giant rat';l.objectives[0].qty=1;l.habitat={...l.habitat,species:'giant rat',anchor:'rat',min_level:1,max_level:1};return JSON.stringify(x);}
for(const [i,pair]of f.attempts.entries())test(`159 original board attempt ${i+1}: repair names weak anchors/limits and accepts lawful correction`,async()=>{
 const s=before();let calls=0;
 const r=await generateBoard(async req=>{calls++;if(calls===1)return pair[0];const text=req.messages.at(-1).content;assert.match(text,/rat/);assert.match(text,/HP.*35/);assert.match(text,/ATK.*10/);assert.match(text,/boar/);assert.match(text,/41/);assert.match(text,/11/);return legal(pair[1]);},s,content,need);
 assert.equal(calls,2);assert.equal(r.listings.length,5);assert.ok(!r.failed);
});
test('159 unchanged strong boar stays invalid, two failures publish no partial board',async()=>{
 const s=before(),pair=f.attempts[1];let n=0;const r=await generateBoard(async()=>pair[n++],s,content,need);assert.equal(n,2);assert.deepEqual(r.listings,[]);assert.ok(r.failed);
 const p=parseBoard(pair[1],content,need,s);assert.ok(!p.listings||p.listings.length<5);
});
function failed(){const s=before();return playerTurnV4(s,content,'I read the board',{c:true,commands:[{seq:1,type:'board.read',rank:null,quote:'I read the board'}],board:{...need,listings:[],failed:'invalid intro'}});}
test('159 original post_schedule is refused after technical failure; unrelated Guild facts survive',()=>{
 const s=failed().state,raw=structuredClone(f.extraction);raw.deltas.push({seq:4,type:'fact',s:'loc.ashbridge.guild_hall',p:'building_hours',o:'the hall opens at dawn'},{seq:5,type:'fact',s:'npc.npcashbridge_clerk',p:'occupation',o:'contract posting clerk'});
 const r=replyTurnV4(s,content,raw,{prose:f.reply});assert.ok(r.rejected.some(x=>x.rule==='board_availability'));assert.ok(!Object.values(r.state.facts).some(x=>x.p==='post_schedule'));assert.ok(Object.values(r.state.facts).some(x=>x.p==='building_hours'));assert.ok(Object.values(r.state.facts).some(x=>x.p==='occupation'&&x.o==='contract posting clerk'));
});
test('159 established real posting schedules remain; without failure ordinary schedule facts remain legal',()=>{
 const s=failed().state,d=f.extraction.deltas.find(d=>d.p==='post_schedule');
 for(const mode of ['known','no failure']){const state=structuredClone(s);if(mode==='known')setFactEvents(state,{s:d.s,p:d.p,o:d.o,source:{kind:'narration'}}).forEach(e=>applyEvent(state,e));else state.last.outcome.board.failed=false;
 const r=replyTurnV4(state,content,{scene:'here',expected:{},deltas:[d]},{prose:f.reply});assert.ok(!r.rejected.some(x=>x.rule==='board_availability'));assert.ok(Object.values(r.state.facts).some(x=>x.p==='post_schedule'));}
});
test('159 narrator receives technical failure and retry guidance, never an in-world closure',()=>{
 const r=failed();assert.match(r.outcome.actions.join('\n'),/technical/i);assert.match(r.outcome.actions.join('\n'),/wait|schedule/i);assert.ok(r.events.some(e=>e.t==='board.failed'));
});
test('159 malformed responses remain bounded failures, not exceptions from repair guidance',async()=>{
 for(const raw of ['{"listings":{}}','{"listings":[{"level":1,"objectives":{},"habitat":null}]}','no JSON']){let n=0;const r=await generateBoard(async()=>{n++;return raw;},before(),content,need);assert.equal(n,2);assert.deepEqual(r.listings,[]);assert.ok(r.failed);}
});
test('159 a legal initial board needs no extra call and preserves fixed intro stats',async()=>{
 let n=0;const r=await generateBoard(async()=>{n++;return legal(f.attempts[0][1]);},before(),content,need);assert.equal(n,1);assert.equal(r.listings.length,5);assert.equal(content.anchors.get('boar').hp,41);assert.equal(content.anchors.get('boar').atk,11);
});
