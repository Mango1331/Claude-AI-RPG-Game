import test from 'node:test';
import assert from 'node:assert/strict';
import { amountErrors,catalogText } from '../../src/v4/interpret.js';
import { tradePrice } from '../../src/v4/trade.js';
import { extractorRequest } from '../../src/v4/extract.js';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec } from '../../src/host.js';
const content=await loadProductContent(),currency=content.rules.currency;
const sell=(quote,qty,min_cp)=>({seq:1,type:'sell',object:'obj.pelts',quote,qty,min_cp});
for(const [quote,qty,cp] of [['two copper a pelt',4,8],['a copper apiece for the fangs',9,9],['two silver each',3,60],['one silver and eight copper each',2,36]])
 test(`price: total ${cp} from ${quote}`,()=>assert.deepEqual(amountErrors([sell(quote,qty,cp)],currency),[]));
for(const c of [sell('two copper a pelt',4,2),sell('a copper apiece for the fangs',9,1),sell('two copper a pelt, a copper apiece for the fangs',4,3)])
 test(`price: rejects underprice or ambiguous scope ${c.quote}`,()=>assert.ok(amountErrors([c],currency).length));
test('price: missing qty uses whole held stack, not a single unit',()=>{
 assert.deepEqual(amountErrors([sell('two copper a pelt',null,8)],currency,{objects:[{id:'obj.pelts',qty:4}]}),[]);
 assert.ok(amountErrors([sell('two copper a pelt',null,2)],currency,{objects:[{id:'obj.pelts',qty:4}]}).length);
});
test('price: apiece and ambiguous multiple rates share World evidence semantics',()=>{
 assert.deepEqual(tradePrice(null,'a copper apiece',9,content),{handled:true,cp:9});
 assert.equal(tradePrice(null,'two copper a pelt, a copper apiece for the fangs',4,content).cp,null);
});
test('repair: place-ref diagnostic states full shape and preserves valid scene',()=>{
 const r=extractorRequest(content.deltaVocab,{catalog:'',actions:'',expectedKeys:{},reply:'A traveller waits.',startScene:'loc.glassmere'}, {previous:'{"scene":"here","expected":{},"deltas":[]}',errors:['$.deltas[1] (person.new): .at: matches none of anyOf']});
 assert.match(r.messages.at(-1).content,/parent/);assert.match(r.messages.at(-1).content,/Preserve.*valid.*scene/i);
});
test('catalog: offer line id is distinct from item name',()=>{
 const text=catalogText({offers:[{id:'offer.primer',seller:'Guild',lines:[{id:'guard',what:'Primer of Guard',price_cp:120}]}]});
 assert.match(text,/line_id="guard"/);assert.match(text,/item="Primer of Guard"/);
});
test('review: unknown coded exception is not eligible for model continuation',async()=>{
 const g=await campaign(content);g.chat.push({mes:'I wait.',is_user:true,extra:{}});
 const r=await prepareGenerationAsync(g.chat,content,{settings:{planner:true},llm:async()=>{throw Object.assign(Error('invalid argument'),{code:'ERR_INVALID_ARG_TYPE'});}});
 assert.equal(r.action,'abort');assert.equal(rec(g.chat.at(-1)).continuation,undefined);
});

import fs from 'node:fs';
import {parseExtraction,worldVocab,placeRef} from '../../src/v4/extract.js';
import {validate} from '../../src/v4/schema.js';
const original=JSON.parse(fs.readFileSync(new URL('./fixtures/batch4_place_repair.json',import.meta.url)));
for(const x of original.answers)test(`Batch4 original C${x.call}: reject malformed refs with precise repair, preserve original`,()=>{
 const value=JSON.parse(x.text), snapshot=structuredClone(value);
 const p=parseExtraction(x.text,worldVocab(content.deltaVocab,{meta:{ruleset:2,private_quests:false}}),original.ids,original.expectedKeys,{sceneRequired:true,startScene:original.startScene});
 assert.equal(p.valid,false);assert.match(p.errors.join(';'),/Place reference/);
 assert.deepEqual(value,snapshot);
 if(x.call===130){assert.deepEqual(validate(value.scene,placeRef(original.ids.places)),[]);assert.ok(!p.errors.some(e=>/^\$\.scene:/.test(e)));}
});
for(const [quote,qty,cp] of [['eight copper for the lot',4,8],['one silver and eight copper',2,18],['between two and four copper each',4,null],['two copper a pelt, three if matched sets',4,null]])
 test(`price control: ${quote}`,()=>{
 const r=amountErrors([sell(quote,qty,cp??8)],currency);
 if(cp===null) assert.ok(r.length);else assert.deepEqual(r,[]);
 });
test('price control: pay and buy limits keep currency and total semantics',()=>{
 assert.deepEqual(amountErrors([{type:'pay',seq:1,amount_cp:20,quote:'I pay two silver.'}],currency),[]);
 assert.ok(amountErrors([{type:'pay',seq:1,amount_cp:200,quote:'I pay two silver.'}],currency).length);
 assert.deepEqual(amountErrors([{type:'buy',seq:1,qty:4,max_cp:8,quote:'two copper apiece'}],currency),[]);
});

import {parsePlan} from '../../src/v4/planner.js';
import {playerTurnV4} from '../../src/v4/turn.js';
import {applyEvent} from '../../src/state.js';
const sale=JSON.parse(fs.readFileSync(new URL('./fixtures/batch4_sale_scope.json',import.meta.url)));
for(const x of sale.plans)test(`Batch4 original C${x.n}: malformed sale stays unbookable, no guessed three-copper sum`,()=>{
 const p=parsePlan(JSON.stringify(x.plan),content.commandVocab,sale.ctx,sale.message);
 assert.equal(p.commands,null);assert.match(p.errors.join(';'),/8 cp total|ambiguous price/);
});
test('Batch4 corrected control: original exact clauses produce total minima eight and nine',()=>{
 const p=parsePlan(JSON.stringify(sale.corrected),content.commandVocab,sale.ctx,sale.message);
 assert.deepEqual(p.commands.map(c=>c.min_cp),[8,9]);
});
test('offer control: malformed id names valid choices; exact id books once and replays',()=>{
 const f=JSON.parse(fs.readFileSync(new URL('./fixtures/batch2_trade_people.json',import.meta.url))),s=structuredClone(f['005_121'].state);
 s.decisions=[];s.entities.pc.sheet.coin_cp=1000;
 s.offers['offer.test']={id:'offer.test',seller:'npc.corr',at:s.scene.at,status:'open',lines:[{id:'guard',what:'Primer of Guard',kind:'goods',qty:1,price_cp:120}]};
 const command={seq:1,type:'offer.accept',offer:'offer.test',lines:['guard Primer of Guard'],quote:'I buy the Primer of Guard.'};
 const refused=playerTurnV4(s,content,command.quote,{c:true,commands:[command]});
 assert.equal(refused.state.entities.pc.sheet.coin_cp,1000);assert.match(refused.outcome.actions.join(';'),/Available positions: guard: Primer of Guard/);
 const bought=playerTurnV4(s,content,command.quote,{c:true,commands:[{...command,lines:['guard']}]});
 assert.equal(bought.state.entities.pc.sheet.coin_cp,880);
 const twice=playerTurnV4(bought.state,content,command.quote,{c:true,commands:[{...command,lines:['guard']}]});
 assert.equal(twice.state.entities.pc.sheet.coin_cp,880);
 const replay=structuredClone(s);for(const e of JSON.parse(JSON.stringify(bought.events)))applyEvent(replay,e);assert.deepEqual(replay,bought.state);
});
