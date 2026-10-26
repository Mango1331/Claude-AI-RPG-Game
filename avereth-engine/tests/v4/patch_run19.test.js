import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { fold, applyEvent } from '../../src/state.js';
import { setRec, rec, foldChat } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, withContentSkills, parsePlan } from '../../src/v4/planner.js';
import { acceptanceWhy } from '../../src/v4/trade.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { hallOf } from '../../src/v4/domain.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run19.json', import.meta.url)));
const before = i => fold(f.records.filter(r=>r.i<i).flatMap(r=>r.events));
const ctx = s => withContentSkills(planContext(s,content,buildCatalog(s,content,{c:true})),content,s);
function run(s,commands) { s=structuredClone(s);const events=[];const result=resolveCommands(s,content,structuredClone(commands),e=>{events.push(e);applyEvent(s,e);},{c:true,msg:177});return {state:s,events,...result}; }
async function act(plans,input=f.cases[89].input) {
 const chat=Array.from({length:178},()=>({mes:'',extra:{},is_user:false}));
 for(const r of f.records) {if(r.i<177)setRec(chat[r.i],{events:structuredClone(r.events)});}
 chat[177]={mes:input,is_user:true,extra:{}};let calls=0;
 const result=await prepareGenerationAsync(chat,content,{settings:{planner:true},llm:async()=>{const p=plans[Math.min(calls++,plans.length-1)];if(p instanceof Error)throw p;return JSON.stringify(p);}});
 return {result,record:rec(chat[177]),state:foldChat(chat).state,chat,calls};
}

test('Run19 T82: current bed and soup have separate explicit prices',()=>{
 const s=before(163), p=f.cases[82].plans[0];assert.deepEqual(parsePlan(JSON.stringify(p),content.commandVocab,ctx(s),f.cases[82].input).errors,[]);
 const r=run(s,p.commands);assert.deepEqual(r.events.filter(e=>e.t==='coin.changed').map(e=>e.d.delta),[-3]);
});
test('Run19 positional prices cannot hide a wrong item price or discount',()=>{
 const o=before(163).offers['offer.t162.7'];
 for(const quote of ['Two copper for the soup and a copper for the bed. I take both.', 'Two copper for the bed and two copper for the soup. I take both.', "I take both for two copper.","I want a discount: two copper for the bed and a copper for the soup."])
  assert.ok(acceptanceWhy({lines:['l1','l2'],quote},o,'Widow Hale',content.rules.currency),quote);
});
test('Run19 explicit total and mixed currency remain valid',()=>{
 const o=before(163).offers['offer.t162.7'];assert.equal(acceptanceWhy({lines:['l1','l2'],quote:'I take both for three copper.'},o,'Widow Hale',content.rules.currency),null);
 const x={...o,lines:[{...o.lines[0],price_cp:15}]};assert.equal(acceptanceWhy({lines:['l1'],quote:'I take it for one silver and five copper.'},x,'Widow Hale',content.rules.currency),null);
});
test('Run19 original T89 two invalid scopes become a safe panel, with no booking',async()=>{
 const r=await act(f.cases[89].plans);assert.equal(r.result.action,'panels');assert.equal(r.record.plan.failed,false);assert.equal(r.record.events.length,0);assert.equal(r.state.entities.pc.sheet.coin_cp,289);assert.match(r.result.text||r.result.panel||r.record.command?.panels?.join('')||JSON.stringify(r.result),/CLARIFY/);
 assert.equal(r.calls,2);assert.deepEqual(foldChat(JSON.parse(JSON.stringify(r.chat))).state,r.state);
});
test('Run19 malformed plans still abort rather than becoming a success panel',async()=>{
 const r=await act([{commands:[{type:'made.up'}]}]);assert.equal(r.result.action,'abort');assert.equal(r.record.plan.failed,true);assert.equal(r.record.events.length,0);
});
test('Run19 bed only now: two copper, no prepaid breakfast, dependent sleep works',async()=>{
 const p=structuredClone(f.cases[89].plans[0]);p.commands[0].lines=['l1'];p.commands[0].agreed_cp=2;
 p.commands.splice(1,1);p.commands[1]={seq:2,type:'activity',kind:'sleep',until:'dawn',quote:'sleep until the sixth bell',needs:1};
 const r=await act([p]);assert.equal(r.record.plan.failed,false);assert.deepEqual(r.record.events.filter(e=>e.t==='coin.changed').map(e=>e.d.delta),[-2]);assert.equal(r.record.events.filter(e=>e.t==='service.granted'&&e.d.service==='meal').length,0);assert.equal(r.record.events.some(e=>e.t==='time.advanced'),true);
 assert.deepEqual(foldChat(JSON.parse(JSON.stringify(r.chat))).state,r.state);
 const saved=structuredClone(r.record.events);await prepareGenerationAsync(r.chat,content,{type:'regenerate',settings:{planner:true},llm:()=>{throw Error('must reuse')}});assert.deepEqual(rec(r.chat[177]).events,saved);
 r.chat[177].mes='I ask about the weather.';
 await prepareGenerationAsync(r.chat,content,{type:'regenerate',settings:{planner:true},llm:async()=>JSON.stringify({commands:[]})});
 assert.equal(foldChat(r.chat).state.entities.pc.sheet.coin_cp,289);
});
test('Run19 T59 Guild landmark stays an inn, never a foreign Hall',()=>{
 for(const name of ['an inn near the Guild hall','a shop next to the Guild hall','lodging opposite the Guild office','an inn behind the Guild branch in Asterhall']){
  const r=run(before(117),[{seq:1,type:'go',to:{new:name},quote:'I find '+name}]);assert.equal(r.auth.gos[0].to,null,name);assert.equal(r.auth.gos[0].newName,name);
 }
});
test('Run19 explicit settlement cannot be replaced by contract branch',()=>{
 const r=run(before(117),[{seq:1,type:'go',to:{new:'Guild hall in Thornbury'},quote:'I enter the Guild hall in Thornbury'}]);assert.equal(r.auth.gos.length,0);assert.equal(r.resolutions[0].status,'refused');
 const a=run(before(117),[{seq:1,type:'go',to:{new:'Guild branch in Asterhall'},quote:'I go to the Guild branch in Asterhall'}]);assert.equal(a.auth.gos[0].to,'loc.asterhall.guild_hall');
});
test('Run19 T20 original Guild branch resolves to existing Hall without parallel place',()=>{
 const x=f.cases[20],s=before(x.i+1);const r=applyWorld(s,content,x.answer,{msg:x.i+1,prose:x.prose});assert.equal(r.state.scene.at,'loc.asterhall.guild_hall');assert.equal(r.events.some(e=>e.t==='place.created'&&/guild_branch/.test(e.d.place.id)),false);
 assert.deepEqual(fold(r.events,s),r.state);
});
test('Run19 new Hall aliases and real interiors, but no fabricated branch',()=>{
 const s=before(39);s.scene.at='loc.asterhall';
 for(const name of ['Guild branch','Guild reception','Guild counter','Asterhall Guild branch']){
  const r=applyWorld(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at:{new:{name,kind:'site',parent:'loc.asterhall'}},forced_by:null,with:null}]},{msg:200});
  assert.equal(r.events.some(e=>e.t==='place.created'&&e.d.place.name===name),false,name);
 }
 assert.equal(hallOf(s,'loc.asterhall.guild_hall'),'loc.asterhall.guild_hall');assert.equal(hallOf(s,'loc.asterhall'),null);
 const x=f.cases[75],r=applyWorld(before(x.i+1),content,x.answer,{msg:x.i+1,prose:x.prose});assert.equal(r.events.some(e=>e.t==='coin.changed'&&e.d.delta===90),false);assert.equal(r.state.scene.at,'loc.marrowbridge');
});

test('Run19 trade conflict followed by malformed repair stays a hard failure',async()=>{
 const r=await act([f.cases[89].plans[0],{commands:[{type:'made.up'}]}]);assert.equal(r.result.action,'abort');assert.equal(r.record.plan.failed,true);assert.equal(r.record.events.length,0);
});
test('Run19 a trade conflict cannot conceal another invalid command',async()=>{
 const p=structuredClone(f.cases[89].plans[0]);p.commands.push({seq:4,type:'made.up'});
 const r=await act([p]);assert.equal(r.result.action,'abort');assert.equal(r.record.plan.failed,true);
});
test('Run19 true Guild interiors keep their Hall ancestor and anonymous return still works',()=>{
 const s=before(177);const r=run(s,[{seq:1,type:'go',to:{new:'the Guild hall'},quote:'I go to the Guild hall'}]);assert.equal(r.auth.gos[0].to,'loc.asterhall.guild_hall');
 s.scene.at='loc.asterhall.guild_hall';
 const w=applyWorld(s,content,{scene:'here',expected:{},deltas:[{seq:1,type:'arrive',at:{new:{name:'clerk archive',kind:'interior',parent:s.scene.at}},forced_by:null,with:null}]},{msg:200});
 const room=Object.values(w.state.places).find(p=>p.name==='clerk archive');assert.ok(room);assert.equal(hallOf(w.state,room.id),'loc.asterhall.guild_hall');
});
test('Run19 positional evidence respects quantities and counterparty',()=>{
 const o=before(163).offers['offer.t162.7'];
 assert.ok(acceptanceWhy({lines:['l1','l2'],quote:'Two copper for the bed and a copper for the soup.',party_words:'someone else'},o,'Widow Hale',content.rules.currency));
 assert.ok(acceptanceWhy({lines:['l1','l2'],qty:2,quote:'Two copper for the bed and a copper for the soup.'},o,'Widow Hale',content.rules.currency));
});

test('Run19 a transport failure after trade repair is not a clarification',async()=>{
 const r=await act([f.cases[89].plans[0],new Error('provider unavailable')]);assert.equal(r.result.action,'abort');assert.equal(r.record.plan.failed,true);assert.equal(r.record.events.length,0);
});
