import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { coinFromWords } from '../../src/economy.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';
import { extractorCatalog, buildCatalog } from '../../src/v4/catalog.js';
import { planContext } from '../../src/v4/planner.js';
import { planMessage } from '../../src/v4/runtime.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json', import.meta.url)));
const clone = structuredClone;
const run = x => applyWorld(clone(x.state), content, clone(x.answer), { prose: x.prose, msg: 500 });
const parsed = x => { const cat = extractorCatalog(x.state,content,{c:true}); return parseExtraction(JSON.stringify(x.answer), worldVocab(content.deltaVocab,x.state),cat,x.state.last.outcome.expected_keys,{sceneRequired:true,startScene:x.state.scene.at,state:x.state,content}); };
for (const [words, cp] of [['a copper a plate at most',1],['one silver',10],['one silver eight',18],['One silver eight — yes, done.',18],['1 silver 8',18],['one silver and eight copper',18],['one silver eighteen',null],['one silver eight days',null],['two gold five',null]])
 test(`Batch2 money: ${words}`,()=> assert.equal(coinFromWords(words,content),cp));

test('Batch2 C386: two independent bids from Corr coexist; overlapping lots replace whole old lots',()=>{
 const x=clone(f['005_119']);x.answer.deltas=x.answer.deltas.filter(d=>d.type==='bid');
 const r=run(x), bids=Object.values(r.state.offers).filter(o=>o.status==='open'&&o.bid&&o.seller==='npc.corr');
 assert.equal(bids.length,2);assert.deepEqual(bids.map(o=>o.price_cp).sort((a,b)=>a-b),[10,60]);
 const one=bids.find(o=>o.price_cp===60), egg=bids.find(o=>o.price_cp===10);
 const next={seq:1,type:'bid',buyer:'npc.corr',lines:[one.lines[0]],price_cp:20,said:'Twenty copper for the tooth.'};
 const q=applyWorld(r.state,content,{scene:r.state.scene.at,expected:{},deltas:[next]},{prose:'Twenty copper for the tooth.',msg:501});
 assert.equal(q.state.offers[one.id].status,'expired');assert.equal(q.state.offers[egg.id].status,'open');
 const replay=clone(x.state);for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);assert.deepEqual(replay,r.state);
});

test('Batch2 C394/T122: a reversed sale offer is repaired/rejected, cannot debit the PC or create a bought tooth',()=>{
 const x=f['005_121']; const p=parsed(x);assert.equal(p.valid,false);assert.match(p.errors.join(';'),/use bid/);
 const r=run(x);assert.ok(r.rejected.some(e=>e.rule==='trade_direction'));
 assert.ok(!r.events.some(e=>e.t==='offer.created'));
 const t=playerTurnV4(r.state,content,f['005_122'].player,{c:true,commands:[{seq:1,type:'offer.accept',offer:'offer.t242.8',lines:['l1'],agreed_cp:20,quote:'Tooth at two silver — yes.'}]}).state;
 assert.equal(t.entities.pc.sheet.coin_cp,x.state.entities.pc.sheet.coin_cp);
 assert.ok(!Object.values(t.objects).some(o=>o.source?.turn===t.turn&&o.source?.how==='bought'));
});

test('Batch2 corrected bids sell the original tooth once; a genuine purchase is still allowed',()=>{
 const x=clone(f['005_121']), tooth='obj.t230.needle_tooth';
 x.answer.deltas=[{seq:1,type:'bid',buyer:'npc.corr',lines:[{object:tooth,qty:1}],price_cp:20,said:'Tooth — two silver'}];
 const r=run(x), bid=Object.values(r.state.offers).find(o=>o.bid&&o.status==='open'&&o.lines.some(l=>l.object===tooth));
 const t=playerTurnV4(r.state,content,'I sell the tooth for two silver.',{c:true,commands:[{seq:1,type:'offer.accept',offer:bid.id,lines:['l1'],agreed_cp:20,quote:'I sell the tooth for two silver.'}]}).state;
 assert.equal(t.entities.pc.sheet.coin_cp,x.state.entities.pc.sheet.coin_cp+20);assert.equal(t.objects[tooth].holder.entity,'npc.corr');
 const again=playerTurnV4(t,content,'I sell the tooth again.',{c:true,commands:[{seq:1,type:'offer.accept',offer:bid.id,lines:['l1'],quote:'I sell the tooth again.'}]}).state;
 assert.equal(again.entities.pc.sheet.coin_cp,t.entities.pc.sheet.coin_cp);
 const buy=clone(x);buy.state.decisions=[];assert.ok(run(buy).events.some(e=>e.t==='offer.created'));
});

test('Batch2 T123 original two Planner answers produce a playable clarification with no commands booked',async()=>{
 const x=f['005_123'], ctx=planContext(x.state,content,buildCatalog(x.state,content,{c:true}));let calls=0;
 const p=await planMessage(async()=>x.plan[calls++]||'',content,ctx,x.player);
 assert.equal(p.failed,false);assert.equal(p.commands.length,1);assert.equal(p.commands[0].type,'clarify');assert.equal(calls,2);
});

for(const key of ['004_24','005_26']) test(`Batch2 ${key}: original reintroduction requests repair, explicit arrival preserves identity and history`,()=>{
 const x=clone(f[key]), p=parsed(x);assert.equal(p.valid,false);assert.match(p.errors.join(';'),/known.*last at/);
 const d=x.answer.deltas.find(d=>d.type==='person.new'&&d.name);const known=Object.values(x.state.entities).find(e=>e.name===d.name||e.known_name===d.name);
 assert.ok(known);assert.notEqual(known.at,d.at);
 const oldFacts=clone(x.state.facts);x.answer.deltas=x.answer.deltas.map(a=>a===d?{seq:a.seq,type:'enter',who:known.id,scene:a.scene}:a);
 const r=run(x);assert.ok(r.state.scene.present.includes(known.id));assert.equal(r.state.entities[known.id].at,r.state.scene.at);
 assert.equal(Object.values(r.state.entities).filter(e=>e.name===known.name).length,1);
 for(const [id,fact] of Object.entries(oldFacts)) if(fact.s===known.id)assert.deepEqual({...r.state.facts[id],until:fact.until},fact);
 const replay=clone(x.state);for(const e of JSON.parse(JSON.stringify(r.events)))applyEvent(replay,e);assert.deepEqual(replay,r.state);
});

test('Batch2 known NPC observation at the same canonical place needs no NPC move; wrong scene and dead NPC stay excluded',()=>{
 const x=clone(f['004_24']);x.state.entities['npc.brenna'].at=x.state.scene.at;x.answer={scene:x.state.scene.at,expected:{},deltas:[{seq:1,type:'person.new',ref:'npc.brenna',name:'Brenna',role:'miller',present:true,desc:[]}]};
 assert.ok(run(x).state.scene.present.includes('npc.brenna'));
 x.state.entities['npc.brenna'].status='dead';assert.ok(!run(x).state.scene.present.includes('npc.brenna'));
 x.state.entities['npc.brenna'].status='alive';x.answer.deltas=[{seq:1,type:'enter',who:'npc.brenna',scene:'loc.another_place'}];assert.ok(!run(x).state.scene.present.includes('npc.brenna'));
});

test('Batch2 sale direction does not depend on an exact goods spelling; explicit buying remains available',()=>{
 const x=clone(f['005_121']);x.answer.deltas=x.answer.deltas.filter(d=>d.type==='offer');x.answer.deltas[0].lines[0].what='small pale tooth';
 assert.ok(!run(x).events.some(e=>e.t==='offer.created'));
 x.state.decisions.push({id:'dec.buy',kind:'purchase',turn:x.state.turn,at:x.state.scene.at,seller:'npc.corr',what:'small pale tooth',max_cp:0,seq:9});
 assert.ok(run(x).events.some(e=>e.t==='offer.created'));
});
