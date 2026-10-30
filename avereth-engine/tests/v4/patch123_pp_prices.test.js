import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent, Game } from '../helpers.js';
import { noteUse, fightProgress, fightQualifies } from '../../src/skills.js';
import { applyEvent, emptyState } from '../../src/state.js';
import { startCampaign } from '../../src/engine.js';
import { applyWorld } from '../../src/v4/world.js';
import { itemProfile, openEquipmentStock } from '../../src/v4/items.js';
import { bookPurchase, pickLines } from '../../src/v4/trade.js';
const c = await loadProductContent();
function combat() {
    const g = new Game(c); g.input('Mage'); g.input('Arcane Bolt + Arcane Ward');
    g.state.meta.f_balance = true;
    const pc = { id:'pc', fixed:{level:10, actions:{'mage.arcane_bolt':{}, 'mage.arcane_ward':{}}}, current:{} };
    const foe = (id, level) => ({id,side:'hostile',fixed:{level},current:{band:'MEDIUM',defeated:true}});
    return {state:g.state,content:c,enc:{id:'enc.pp123',combatants:{pc,strong:foe('strong',8),weak:foe('weak',1)},pp:{used:{},threatened:false},log:[]}};
}
const hit = (ctx, target='strong') => noteUse(ctx,{actor:'pc',kind:'attack',skill:'mage.arcane_bolt',target,strikes:[{target}]});
test('offensive PP: an appropriate immediate victory counts, without changing shared fight qualification',()=>{
    const x=combat();hit(x);assert.equal(fightQualifies(x.state,c,x.enc),false);
    assert.equal(fightProgress(x.state,c,x.enc)[0]?.d.gained,18);
});
test('offensive PP: a strong spectator cannot qualify a skill aimed only at trivial foes, even after retaliation',()=>{
    const x=combat();x.enc.pp.threatened=true;hit(x,'weak');assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
});
test('offensive PP: one qualifying AoE target is enough; repeated use, truncated log and reload keep a single award',()=>{
    const x=combat();hit(x,'weak');hit(x);hit(x);x.enc.log=[];
    const y=JSON.parse(JSON.stringify(x.enc));const es=fightProgress(x.state,c,y);assert.equal(es.length,1);
    es.forEach(e=>applyEvent(x.state,e));assert.deepEqual(fightProgress(x.state,c,y),[]);
});
for(const condition of ['defeated','escaped'])test(`offensive PP: ${condition} gives none`,()=>{const x=combat();hit(x);x.enc.combatants.pc.current[condition]=true;assert.deepEqual(fightProgress(x.state,c,x.enc),[]);});
test('defensive PP still needs retaliation; old encounters and Rule1 keep their former qualification',()=>{
    const x=combat();x.enc.pp.used['mage.arcane_ward']='a defense under attack';assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
    x.enc.pp.threatened=true;assert.equal(fightProgress(x.state,c,x.enc).length,1);
    x.state.meta.ruleset=1;hit(x);assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
});
function shop(){const s=emptyState();for(const e of startCampaign(c,{runtime:'v4',ruleset:2,seed:11}))applyEvent(s,e);
    s.scene.at='loc.shop';s.places['loc.shop']={id:'loc.shop',name:'Alda smith workshop',kind:'interior'};
    s.entities['npc.alda']={id:'npc.alda',kind:'npc',name:'Alda',at:'loc.shop',status:'alive',descriptors:['smith']};
    s.scene.present=['npc.alda'];s.entities.pc.sheet.coin_cp=2000;s.last.outcome={c:true};return s;}
function publish(s,what='superior F-Rank sword',price=60,qty=1){return applyWorld(s,c,{scene:s.scene.at,expected:{},deltas:[{seq:1,type:'offer',seller:'npc.alda',lines:[{what,kind:'goods',equipment:true,qty,price_cp:price,said:`I offer ${qty} ${what} for ${price} copper.`}]}]},{msg:20,prose:`I offer ${qty} ${what} for ${price} copper.`});}
const offered = r=>r.events.find(e=>e.t==='offer.created' && !e.d.offer.stock)?.d.offer;
for(const [quality,price] of [['fine',140],['superior',260],['exceptional',480]])test(`new ${quality} F weapon has the same retail price as specialist stock`,()=>{
    const s=shop(),r=publish(s,`${quality} F-Rank sword`);assert.equal(offered(r).lines[0].price_cp,price);
    const es=[];openEquipmentStock(s,c,e=>{es.push(e);applyEvent(s,e);});assert.equal(es.find(e=>e.d.offer.lines[0].profile.quality===quality).d.offer.lines[0].price_cp,price);
});
test('armor uses profile value; quantities use unit retail; E gear is not forced into F prices',()=>{
    assert.equal(offered(publish(shop(),'fine F-Rank plate armor')).lines[0].price_cp,itemProfile(c,{name:'fine F-Rank plate armor',balance:true}).value_cp);
    assert.equal(offered(publish(shop(),'superior F-Rank sword',60,2)).lines[0].price_cp,520);
    assert.equal(offered(publish(shop(),'superior E-Rank sword')).lines[0].price_cp,60);
});
for(const any_price of [false,true])test(`corrected price requires fresh consent, even with ${any_price?'any price':'a generous limit'}`,()=>{
    const s=shop();s.decisions=[{id:'dec.buy',kind:'purchase',turn:s.turn,seq:1,at:s.scene.at,seller:'npc.alda',what:'superior F-Rank sword',qty:1,max_cp:1000,any_price}];
    const r=publish(s);assert.ok(offered(r));assert.equal(r.state.entities.pc.sheet.coin_cp,2000);assert.ok(!r.events.some(e=>e.t==='transaction.completed'));
    const o=offered(r),sel=pickLines(o),events=[];const base=structuredClone(r.state);const emit=e=>{events.push(e);applyEvent(r.state,e);};
    assert.equal(bookPurchase(r.state,emit,{offer:o,picks:sel.picks,cp:sel.cp,content:c,objectId:()=> 'obj.sword'}).error,undefined);
    assert.equal(r.state.entities.pc.sheet.coin_cp,1740);assert.ok(bookPurchase(r.state,emit,{offer:o,picks:sel.picks,cp:sel.cp,content:c,objectId:()=> 'obj.again'}).error);
    for(const e of JSON.parse(JSON.stringify(events)))applyEvent(base,e);assert.deepEqual(base,r.state);
});
test('repeated prose never reprices an already stored same-goods bargain',()=>{
    const s=shop();const old={id:'offer.old',seller:'npc.alda',at:s.scene.at,status:'open',canon:false,turn:s.turn,lines:[{id:'l1',what:'superior F-Rank sword',kind:'goods',equipment:true,qty:1,price_cp:60,profile:itemProfile(c,{name:'superior F-Rank sword',balance:true})}]};s.offers[old.id]=structuredClone(old);
    const r=publish(s);assert.deepEqual(r.state.offers[old.id],old);assert.ok(!offered(r));
    const sel=pickLines(old),es=[];assert.equal(bookPurchase(r.state,e=>{es.push(e);applyEvent(r.state,e);},{offer:old,picks:sel.picks,cp:60,content:c,objectId:()=> 'obj.old'}).error,undefined);assert.equal(r.state.entities.pc.sheet.coin_cp,1940);
});
test('historical balance policy leaves new narrated prices flexible',()=>{const s=shop();delete s.meta.f_balance;assert.equal(offered(publish(s)).lines[0].price_cp,60);});
test('a mixed AoE records the worthy target independently of its primary target',()=>{
 const x=combat();noteUse(x,{actor:'pc',kind:'attack',skill:'mage.arcane_bolt',target:'weak',strikes:[{target:'weak'},{target:'strong'}]});assert.equal(fightProgress(x.state,c,x.enc).length,1);
});
test('illegal attacks, living opposition and historical offensive encounters do not gain the new award',()=>{
 const x=combat();noteUse(x,{actor:'pc',kind:'attack',skill:'mage.arcane_bolt',illegal:'out of range',strikes:[{target:'strong'}]});assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
 hit(x);x.enc.combatants.strong.current.defeated=false;assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
 x.enc.combatants.strong.current.defeated=true;delete x.state.meta.f_balance;assert.deepEqual(fightProgress(x.state,c,x.enc),[]);
});
test('an already correct new price can fulfill explicit advance consent normally',()=>{
 const s=shop();s.decisions=[{id:'dec.buy',kind:'purchase',turn:s.turn,seq:1,at:s.scene.at,seller:'npc.alda',what:'superior F-Rank sword',qty:1,max_cp:260,any_price:false}];
 const r=publish(s,'superior F-Rank sword',260);assert.equal(r.events.filter(e=>e.t==='transaction.completed').length,1);assert.equal(r.state.entities.pc.sheet.coin_cp,1740);
});
test('non-gear goods and lodging retain their narrated prices',()=>{
 const s=shop();const deltas=[{seq:1,type:'offer',seller:'npc.alda',lines:[{what:'healing potion',kind:'goods',qty:1,price_cp:7,said:'Seven copper for the potion.'},{what:'a room',kind:'service',service:'lodging',qty:1,price_cp:9,said:'Nine copper for the room.'}]}];
 const r=applyWorld(s,c,{scene:s.scene.at,expected:{},deltas},{msg:20,prose:'Seven copper for the potion. Nine copper for the room.'});assert.deepEqual(offered(r).lines.map(l=>l.price_cp),[7,9]);
});
test('real first strike victory books PP through combat end while LP/development stay behind the old gate',async()=>{
 const { initEncounter, runCombat, endEncounterEvents }=await import('../../src/combat.js');
 const { scaleCreature }=await import('../../src/npcgen.js');const { scriptedDice }=await import('../helpers.js');
 const g=new Game(c);g.input('Mage');g.input('Arcane Bolt + Arcane Ward');g.state.meta.f_balance=true;
 for(const e of [{t:'entity.created',d:{entity:{id:'mon.test',kind:'creature',name:'Wolf',descriptors:['wolf'],anchor:'wolf',species:'wolf',status:'alive',location:g.state.scene.location,profile:{...scaleCreature(c.anchors.get('wolf'),1,'normal',c),hp:1,max_hp:1}}}},{t:'scene.entered',d:{id:'mon.test',band:'MEDIUM',cover:'none'}},{t:'scene.awareness',d:{id:'mon.test',level:'aware'}}])applyEvent(g.state,e);
 const dice=scriptedDice({variance:[1,1,1]});const enc=initEncounter(g.state,c,dice,{actor:'pc',target:'mon.test',skill:'mage.arcane_bolt'},[{id:'mon.test',side:'hostile'}],'enc.actual123');
 runCombat({state:g.state,content:c,dice,enc,c:true},{kind:'attack',target:'mon.test',skill:'mage.arcane_bolt'});
 assert.equal(enc.combatants['mon.test'].current.defeated,true);assert.equal(enc.pp.threatened,false);
 const result=endEncounterEvents(g.state,c,enc);assert.equal(result.events.filter(e=>e.t==='skill.progress').length,1);
 assert.ok(!result.events.some(e=>e.t==='growth.noted'||e.t==='growth.progress'||e.t==='growth.evidence'));
});
test('a corrected line blocks the whole advance package; no partial charge or free equipment',()=>{
 const s=shop();s.decisions=[{id:'dec.buy',kind:'purchase',turn:s.turn,seq:1,at:s.scene.at,seller:'npc.alda',what:'superior F-Rank sword and fine F-Rank plate armor',qty:null,max_cp:1000,any_price:true}];
 const r=applyWorld(s,c,{scene:s.scene.at,expected:{},deltas:[{seq:1,type:'offer',seller:'npc.alda',lines:[{what:'superior F-Rank sword',kind:'goods',equipment:true,qty:1,price_cp:60,said:'Sixty copper for the sword.'},{what:'fine F-Rank plate armor',kind:'goods',equipment:true,qty:1,price_cp:30,said:'Thirty copper for the armor.'}]}]},{msg:20,prose:'Sixty copper for the sword. Thirty copper for the armor.'});
 assert.equal(r.state.entities.pc.sheet.coin_cp,2000);assert.ok(!r.events.some(e=>e.t==='transaction.completed'||e.t==='object.created'));
 assert.deepEqual(offered(r).lines.map(l=>l.price_cp),[260,72]);
});
