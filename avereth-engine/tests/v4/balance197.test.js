import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductContent,loadContent,Game} from '../helpers.js';
import {humanSheet} from '../../src/npcgen.js';
import {materialise} from '../../src/engine.js';
import {applyEvent} from '../../src/state.js';
import {deriveCharacter} from '../../src/derived.js';
import {Dice} from '../../src/rng.js';
const c=await loadProductContent(),legacy=await loadContent();
const sum=s=>Object.values(s.stats).reduce((a,b)=>a+b,0);
const expected14={warrior:{STR:32,VIT:32,AGI:18,INT:5,PER:5,WIL:5},mage:{STR:5,VIT:5,AGI:5,INT:32,PER:18,WIL:32},rogue:{STR:5,VIT:18,AGI:32,INT:5,PER:32,WIL:5}};
for(const cls of ['warrior','mage','rogue'])test(`197 ${cls}: ruleset 2 once-only favored, five distributed points, exact priorities and level14 budget`,()=>{
 const tpl=c.npcTemplates[2].get('adventurer');
 for(const level of [1,2,5,10,14,15,20]){const sh=humanSheet(tpl,{level,class:cls,key:'fixed'},c);assert.equal(sum(sh),32+5*(level-1));assert.equal(sh.free_points,0);assert.equal(sh.class,cls);assert.equal(sh.training,'trained');assert.equal(Object.keys(sh.skills).length,3);if(level===14)assert.deepEqual(sh.stats,expected14[cls]);
 if(level===1)for(const stat of c.rules.stats)assert.equal(sh.stats[stat],5+Number(c.classes.get(cls).favored.includes(stat)));
 const d=deriveCharacter(sh,c);assert.equal(sh.hp,d.maxHp);assert.equal(sh.mp,d.maxMp);assert.equal(sh.sta,100);
 }
});
test('197: every legacy human template also has only five points per later level; priorities and class remain',()=>{
 for(const tpl of legacy.templates.values())for(const level of [1,2,14,20]){
 const sh=humanSheet(tpl,{level},legacy),start=humanSheet(tpl,{level:1},legacy);assert.equal(sum(sh),32+5*(level-1),`${tpl.id} L${level}`);
 const priority=tpl.priority||tpl.priority_by_class?.[sh.class]||['STR','VIT','AGI'];
 for(const stat of c.rules.stats)assert.equal(sh.stats[stat]-start.stats[stat],(level-1)*([2,2,1][priority.indexOf(stat)]||0));
 assert.deepEqual(sh.skills,start.skills);assert.deepEqual(sh.equipment,start.equipment);assert.equal(sh.class,start.class);
 }
});
test('197: unclassified people use stat_basis once, without inventing a class or combat training',()=>{
 for(const id of ['commoner','laborer']){const t=c.npcTemplates[2].get(id),s=humanSheet(t,{level:14},c);assert.equal(sum(s),97);assert.equal(s.class,null);assert.equal(s.training,'untrained');assert.deepEqual(s.skills,{});assert.deepEqual(s.generated.stat_basis,t.stat_basis);assert.equal(s.stats.STR,32);assert.equal(s.stats.VIT,32);assert.equal(s.stats.AGI,18);}
});
test('197: real materialisation books the corrected stats with kit, skills, signature and stable replay identity',()=>{
 for(const cls of ['warrior','mage','rogue']){
 const s=new Game(c,{ruleset:2,seed:7001}).state;s.entities.n={id:'n',name:'Veteran',kind:'npc',template:'adventurer',class:cls,level:14,status:'alive',location:s.scene.location};const before=structuredClone(s),events=[];
 const emit=e=>{events.push(e);applyEvent(s,e);};materialise(s,c,new Dice(7001),emit,'n');
 const sh=s.entities.n.sheet;assert.deepEqual(sh.stats,expected14[cls]);assert.ok(sh.equipment.weapon);assert.equal(sh.class,cls);assert.equal(sh.training,'trained');assert.ok(sh.generated.signature);assert.ok(sh.skills[sh.generated.signature]);assert.equal(Object.keys(sh.skills).length,4);
 for(const e of events)applyEvent(before,e);assert.deepEqual(before,s);
 const repeated=[];materialise(s,c,new Dice(7001),e=>repeated.push(e),'n');assert.deepEqual(repeated,[]);
 }
});
