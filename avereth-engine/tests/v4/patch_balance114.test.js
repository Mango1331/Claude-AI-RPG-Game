import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import * as items from '../../src/v4/items.js';
import { advancePp, fightQualifies } from '../../src/skills.js';
import { startCampaign } from '../../src/engine.js';
import { emptyState, applyEvent } from '../../src/state.js';
import { bookPurchase, pickLines } from '../../src/v4/trade.js';
const c = await loadProductContent();
for (const [quality, value] of [['crude',6],['common',10],['fine',14],['superior',18],['exceptional',22]]) test(`F weapon ${quality}`, () => {
 for(const kind of ['staff','sword']) {const p=items.itemProfile(c,{name:`${quality} ${kind}`,balance:true});assert.equal(p[kind==='staff'?'matk':'atk'],value);assert.equal(items.priceAudit(c,p,p.value_cp),null);}
});
test('E and armor keep their existing profiles',()=>{assert.equal(items.itemProfile(c,{name:'exceptional E-Rank staff'}).matk,20);assert.equal(items.itemProfile(c,{name:'fine robes'}).def,3);});
test('C1 reaches P5 after twelve qualified 18PP awards; carryover survives lower thresholds',()=>{let x={prof:1,pp:0};for(let i=0;i<12;i++)x=advancePp(c,x,{complexity:1},18,{meta:{f_balance:true}});assert.equal(x.prof,5);assert.deepEqual(advancePp(c,{prof:1,pp:70},{complexity:1},18,{meta:{f_balance:true}}),{prof:2,pp:38});});
test('LP daily limits and primers change while hourly rates stay fixed',()=>{assert.deepEqual(c.rules.f_balance.lp_day_cap,{teacher:60,self:40});assert.equal(c.rules.f_balance.guild_manual_cp,80);assert.deepEqual(c.rules.growth.lp_per_hour,{teacher:20,self:10});});
function shop(){const s=emptyState();for(const e of startCampaign(c,{runtime:'v4',ruleset:2,seed:11}))applyEvent(s,e);s.scene.at='loc.shop';s.places['loc.shop']={id:'loc.shop',name:'Alda staffmaker workshop',kind:'interior'};s.entities['npc.alda']={id:'npc.alda',kind:'npc',name:'Alda',at:'loc.shop',status:'alive',descriptors:['staffmaker']};s.scene.present=['npc.alda'];s.entities.pc.sheet.coin_cp=1000;return s;}
test('present specialist stock is stable and bought once through normal purchase and replay',()=>{assert.equal(typeof items.openEquipmentStock,'function');const s=shop(),base=structuredClone(s),events=[];const emit=e=>{events.push(structuredClone(e));applyEvent(s,e);};items.openEquipmentStock(s,c,emit);const os=Object.values(s.offers);assert.equal(os.length,3);items.openEquipmentStock(s,c,emit);assert.equal(Object.keys(s.offers).length,3);const o=os.find(o=>o.lines[0].profile.matk===18),sel=pickLines(o);assert.equal(bookPurchase(s,emit,{offer:o,picks:sel.picks,cp:sel.cp,objectId:()=> 'obj.staff',content:c}).error,undefined);assert.ok(bookPurchase(s,emit,{offer:o,picks:sel.picks,cp:sel.cp,objectId:()=> 'obj.again',content:c}).error);for(const e of events)applyEvent(base,e);assert.deepEqual(base,s);});
test('absent or non-specialist NPC gives no equipment stock',()=>{const s=shop();assert.equal(typeof items.openEquipmentStock,'function');s.scene.present=[];items.openEquipmentStock(s,c,e=>applyEvent(s,e));assert.equal(Object.keys(s.offers).length,0);s.scene.present=['npc.alda'];s.entities['npc.alda'].descriptors=['innkeeper'];s.places['loc.shop'].name='Inn';items.openEquipmentStock(s,c,e=>applyEvent(s,e));assert.equal(Object.keys(s.offers).length,0);});
test('trivial fights remain ineligible for PP',()=>{assert.equal(fightQualifies({meta:{ruleset:2}},c,{pp:{threatened:true},combatants:{pc:{fixed:{level:10},current:{}},foe:{side:'hostile',fixed:{level:1}}}}),false);});

// B1 (.130): the F balance values are the current rules of every campaign, not a persisted switch
test('B1: new campaigns persist no balance switch; the current balance values apply to them',()=>{const s=shop();assert.equal('f_balance' in s.meta,false);for(const ruleset of [1,2])assert.equal('f_balance' in startCampaign(c,{runtime:'v4',ruleset})[0].d,false);assert.equal(items.itemProfile(c,{name:'fine staff'}).matk,8);assert.deepEqual(advancePp(c,{prof:1,pp:0},{complexity:1},54),{prof:2,pp:4});});
test('stock never permits remote purchase or low funds',()=>{const s=shop();items.openEquipmentStock(s,c,e=>applyEvent(s,e));const o=Object.values(s.offers)[0],sel=pickLines(o);s.scene.present=[];let writes=0;assert.ok(bookPurchase(s,()=>writes++,{offer:o,picks:sel.picks,cp:sel.cp,objectId:()=> 'obj.bad',content:c}).error);s.scene.present=['npc.alda'];s.entities.pc.sheet.coin_cp=0;assert.ok(bookPurchase(s,()=>writes++,{offer:o,picks:sel.picks,cp:sel.cp,objectId:()=> 'obj.bad',content:c}).error);assert.equal(writes,0);});
test('world completion publishes local specialist stock',async()=>{const {applyWorld}=await import('../../src/v4/world.js');const s=shop();s.last.outcome={c:true};const r=applyWorld(s,c,{v:'delta-1.0',deltas:[]},{text:'Alda works in her shop.',c:true,msg:2});assert.equal(Object.values(r.state.offers).filter(o=>o.stock==='f_gear').length,3);});
test('Guild request supplies the new nonbinding payout guidance',async()=>{const {boardRequest,openGuildManuals}=await import('../../src/v4/guild.js');const s=shop();s.guild={rank:'Novice',boards:{}};s.places['loc.shop'].realm='realm.caelreth';const need={branch:'loc.glassmere',rank:'Novice',day:1,have:[],missing:5,c:true,progression:true,profile:'count_hunt_clear'};const r=boardRequest(s,c,need);assert.match(r.system,/350–600/);assert.match(r.system,/guidelines, not validation limits/);});

test('new daily LP ceiling changes booked learning, not hours (B1: no state flag selects it)', async () => {
    const { learningActivity } = await import('../../src/v4/growth.js');
    const s = shop();
    const modern = learningActivity(s, c, { kind: 'train', learn: 'STR', what: 'strength' }, 240, s.clock.minute);
    assert.equal(modern.events.filter(e => e.t === 'growth.progress').reduce((n,e) => n+e.d.lp,0), 40);
    // B1 (.130): a stale f_balance:false in a state changes nothing; the ceiling is the current rule
    const stale = structuredClone(s); stale.meta.f_balance = false;
    const same = learningActivity(stale, c, { kind: 'train', learn: 'STR', what: 'strength' }, 240, stale.clock.minute);
    assert.equal(same.events.filter(e => e.t === 'growth.progress').reduce((n,e) => n+e.d.lp,0), 40);
});
