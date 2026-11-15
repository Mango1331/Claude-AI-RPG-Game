import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadProductContent,Game} from '../helpers.js';
import {itemProfile,gearOfferProfile,gearRetailPrice,itemTraits} from '../../src/v4/items.js';
import {deriveCharacter} from '../../src/derived.js';
import {applyEvent} from '../../src/state.js';
import {playerTurnV4} from '../../src/v4/turn.js';
import {lootEvents} from '../../src/v4/loot.js';
import {character} from '../../tools/sim/combat.mjs';
import {scaleCreature} from '../../src/npcgen.js';
import {initEncounter,attackAction} from '../../src/combat.js';
import {Dice} from '../../src/rng.js';
const c=await loadProductContent(),qs=['crude','common','fine','superior','exceptional'];
const p=(name,q='fine',rank='F',balance=true)=>itemProfile(c,{name:`${q} ${rank}-Rank ${name}`,balance});
function equip(s,profile){const o={id:'shield',name:'fine shield',kind:'item',qty:1,holder:{entity:'pc'},...itemTraits(c,{name:'fine shield'},s.clock.minute,profile)};applyEvent(s,{t:'object.created',d:{object:o}});const r=playerTurnV4(s,c,'I equip my shield',{c:true,commands:[{seq:1,type:'equip',object:'shield',quote:'I equip my shield'}],msg:20});assert.ok(r.events.some(e=>e.t==='item.equipped'));return r.state;}
test('198: all F shield names have the complete approved quality sequence and guide/retail prices',()=>{
 for(const name of ['shield','buckler','kite shield','tower shield'])for(const balance of [false,true])for(const [i,q] of qs.entries()){
 const a=p(name,q,'F',balance);assert.deepEqual([a.def,a.mdef,a.value_cp],[[3,2,40],[4,3,56],[5,3,64],[5,4,72],[6,5,88]][i]);assert.equal(a.slot,'offhand');assert.equal(a.atk+a.matk,0);assert.equal(gearRetailPrice(c,a),a.value_cp);
 }
});
test('198: every other shield rank and every armor profile remains byte-identical to .197',()=>{
 const profiles=[];for(const rank of c.rules.ranks.order)for(const q of qs)for(const name of ['shield','heavy armor','robes'])if(!(rank==='F'&&name==='shield'))profiles.push(p(name,q,rank));
 assert.equal(createHash('sha256').update(JSON.stringify(profiles)).digest('hex'),'e479ed308443409c3f7fa81702a13e9710abad8ca5aaf213516ff2661e7cee29');
});
test('198: shop and real bossloot book the same fine shield, with no extra effect',()=>{
 const expected=p('shield');assert.deepEqual(gearOfferProfile(c,{base:'shield',quality:'fine'}),{...expected,title:'shield'});
 const cc=structuredClone(c),cfg=cc.monsters.loot.special;cfg.class_chance=1;cfg.class_pool.warrior=['shield'];Object.assign(cfg.tiers.boss.first,{stone:0,types:{gear:100},quality:{fine:100}});
 const s=new Game(cc,{ruleset:2}).state;s.entities.pc.sheet.class='warrior';s.entities.foe={id:'foe',kind:'creature',name:'Warden',status:'dead',profile:{anchor:'goblin',rank:'F',level:9,type:'boss'},slot:{dungeon:'d',floor:1,cycle:1,id:'boss',role:'boss'}};
 const enc={id:'enc.shield',combatants:{pc:{id:'pc',side:'pc',current:{hp:20}},foe:{id:'foe',side:'hostile',current:{hp:0}}}};
 const r=lootEvents(s,cc,enc),o=r.events.find(e=>e.t==='object.created'&&e.d.object.profile?.kind==='gear').d.object;assert.deepEqual(o.profile,expected);assert.equal(o.profile.def,5);assert.equal(o.profile.value_cp,64);
});
test('198: the actual offhand equip event adds exactly DEF5/MDEF3 and preserves the weapon',()=>{
 const s=new Game(c,{ruleset:2}).state,before=deriveCharacter(s.entities.pc.sheet,c),weapon=structuredClone(s.entities.pc.sheet.equipment.weapon),after=equip(s,p('shield')),sh=after.entities.pc.sheet,d=deriveCharacter(sh,c);
 assert.deepEqual(sh.equipment.weapon,weapon);assert.equal(sh.equipment.offhand.def,5);assert.equal(d.def-before.def,5);assert.equal(d.mdef-before.mdef,3);assert.deepEqual(after.objects.shield.holder,{consumed:'equipped'});
});
test('198: actual physical hits decrease with fine vs common, magical hits and RNG consumption remain equal',()=>{
 function hit(q,anchor,seed){let s=character(c,{class:'warrior',level:5,stats:{STR:2,VIT:2,AGI:1},skills:['warrior.heavy_slash','warrior.guard']});s=equip(s,p('shield',q));s.entities.foe={id:'foe',kind:'creature',name:anchor,status:'alive',location:s.scene.location,profile:scaleCreature(c.anchors.get(anchor),6,'elite',c)};s.scene.positions.foe={band:'ENGAGED',cover:'none'};s.scene.awareness.foe='aware';const dice=new Dice(seed),enc=initEncounter(s,c,dice,{actor:'pc',target:'foe',engage:true},[{id:'foe',side:'hostile'}],'test.shield',{c:true}),r=attackAction({state:s,content:c,dice,enc,c:true},'foe','pc',null);assert.ok(!r.illegal,r.illegal);assert.equal(r.strikes.length,1);return {strike:r.strikes[0],n:dice.n};}
 let physicalReduction=0;for(let seed=7001;seed<=7100;seed++)for(const anchor of ['bear','spirit']){const a=hit('common',anchor,seed),b=hit('fine',anchor,seed);assert.equal(a.n,b.n);assert.equal(a.strike.power,b.strike.power);if(anchor==='spirit')assert.deepEqual(a,b);else{assert.equal(a.strike.post_def-b.strike.post_def,1);assert.ok(b.strike.final<=a.strike.final);physicalReduction+=a.strike.final-b.strike.final;}}
 assert.ok(physicalReduction>=90&&physicalReduction<=110,physicalReduction);
});
