import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductContent} from '../helpers.js';
import {emptyState,applyEvent} from '../../src/state.js';
import {startCampaign} from '../../src/engine.js';
import {resolveCommands} from '../../src/v4/commands.js';
import {acceptanceWhy} from '../../src/v4/trade.js';
const c=await loadProductContent();
const offer={id:'offer.test',seller:'npc.smith',at:'loc.shop',status:'open',canon:false,lines:[{id:'sword',what:'fine F-Rank sword',kind:'goods',qty:1,price_cp:140},{id:'armor',what:'fine F-Rank plate armor',kind:'goods',qty:1,price_cp:72}]};
const accept=(quote,lines)=>({seq:1,type:'offer.accept',offer:offer.id,quote,lines,qty:null});
for(const quote of ['I buy the sword and the armor.','I accept the sword plus the armor.'])test(`reject incomplete explicit article selection: ${quote}`,()=>{assert.ok(acceptanceWhy(accept(quote,['sword']),offer,'Alda',c.rules.currency));});
for(const quote of ['I buy only the sword.','I buy the sword, not the armor.','I buy the sword without the armor.'])test(`retain explicit single purchase: ${quote}`,()=>{assert.equal(acceptanceWhy(accept(quote,['sword']),offer,'Alda',c.rules.currency),null);});
test('explicit complete selection and generic acceptance remain valid',()=>{for(const quote of ['I buy the sword and armor.','Deal.'])assert.equal(acceptanceWhy(accept(quote,['sword','armor']),offer,'Alda',c.rules.currency),null);});
function state(){const s=emptyState();startCampaign(c,{runtime:'v4',ruleset:2,seed:11}).forEach(e=>applyEvent(s,e));s.scene.at='loc.shop';s.places['loc.shop']={id:'loc.shop',name:'shop',kind:'interior'};s.entities['npc.smith']={id:'npc.smith',kind:'npc',name:'Alda',at:s.scene.at,status:'alive'};s.scene.present=['npc.smith'];s.entities.pc.sheet.coin_cp=1000;return s;}
function run(s,command){const events=[];const ctx=resolveCommands(s,c,[command],e=>{events.push(e);applyEvent(s,e);},{c:true,msg:20});return {ctx,events,s};}
test('offer.accept cannot book only the sword from an explicitly accepted pair; replay stays unchanged',()=>{const s=state();s.offers[offer.id]=structuredClone(offer);const before=structuredClone(s);const r=run(s,accept('I buy the sword and the armor.',['sword']));assert.equal(s.entities.pc.sheet.coin_cp,1000);assert.equal(r.events.filter(e=>['transaction.completed','object.created','coin.changed'].includes(e.t)).length,0);r.events.forEach(e=>applyEvent(before,JSON.parse(JSON.stringify(e))));assert.deepEqual(before,s);assert.equal(s.offers[offer.id].status,'open');});
test('buy any_price plus max_cp announces a bounded consent',()=>{const r=run(state(),{seq:1,type:'buy',what:'sword',from:'npc.smith',qty:1,max_cp:200,any_price:true,quote:'I buy a sword up to two hundred copper.'});const text=JSON.stringify(r.ctx);assert.match(text,/at most 200 cp/);assert.doesNotMatch(text,/at any price/);assert.equal(r.s.decisions.at(-1).max_cp,200);});
test('unlimited consent without a limit remains available',()=>{const r=run(state(),{seq:1,type:'buy',what:'sword',from:'npc.smith',qty:1,max_cp:null,any_price:true,quote:'I buy a sword at any price.'});assert.match(JSON.stringify(r.ctx),/at any price/);});
// .135: a separate comment about another article is not an order for it.
const singleWithComment = "I'll buy the sword. The armor is too expensive.";
for(const quote of [singleWithComment,"The armor is too expensive. I'll buy the sword."])test(`single order with a separate article comment: ${quote}`,()=>{assert.equal(acceptanceWhy(accept(quote,['sword']),offer,'Alda',c.rules.currency),null);});
test('a comment cannot authorize adding armor to the actual sword order',()=>{assert.ok(acceptanceWhy(accept(singleWithComment,['sword','armor']),offer,'Alda',c.rules.currency));});
test('single order plus comment buys exactly the selected sword',()=>{const s=state();s.offers[offer.id]=structuredClone(offer);const r=run(s,accept(singleWithComment,['sword']));assert.equal(s.entities.pc.sheet.coin_cp,860);assert.equal(r.events.filter(e=>e.t==='object.created').length,1);assert.match(r.events.find(e=>e.t==='object.created').d.object.name,/sword/);});
test('orders in two sentences still require both selected articles',()=>{assert.ok(acceptanceWhy(accept("I'll buy the sword. I'll take the armor too.",['sword']),offer,'Alda',c.rules.currency));});
test('a bare multi-article order still requires the full selection',()=>{assert.ok(acceptanceWhy(accept('The sword and armor, please.',['sword']),offer,'Alda',c.rules.currency));});
test('short article continuations remain part of a multi-article order',()=>{for(const quote of ["I'll buy the sword. The armor, please.","I'll buy the sword. The armor too."])assert.ok(acceptanceWhy(accept(quote,['sword']),offer,'Alda',c.rules.currency));});
// .136: an explicit imperative adds an article, unlike a comment about it.
for(const quote of ["I'll buy the sword. Please add the armor.","I'll buy the sword. Add the armor too."])test(`explicit add request cannot be dropped: ${quote}`,()=>{assert.ok(acceptanceWhy(accept(quote,['sword']),offer,'Alda',c.rules.currency));});
test('the complete selection satisfies an explicit add request',()=>{assert.equal(acceptanceWhy(accept("I'll buy the sword. Please add the armor.",['sword','armor']),offer,'Alda',c.rules.currency),null);});
test('offer.accept refuses a partial selection when the player asks to add armor',()=>{const s=state();s.offers[offer.id]=structuredClone(offer);const r=run(s,accept("I'll buy the sword. Please add the armor.",['sword']));assert.equal(s.entities.pc.sheet.coin_cp,1000);assert.equal(r.events.filter(e=>['transaction.completed','object.created','coin.changed'].includes(e.t)).length,0);assert.equal(s.offers[offer.id].status,'open');});
test('an add verb in a separate descriptive comment is not a purchase request',()=>{assert.equal(acceptanceWhy(accept("I'll buy the sword. The armor will add protection.",['sword']),offer,'Alda',c.rules.currency),null);});
