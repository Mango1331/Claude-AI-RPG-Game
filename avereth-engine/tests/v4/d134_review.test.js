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
