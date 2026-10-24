import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load,simulate,setup,choose,ROOT,character} from '../../tools/sim/combat.mjs';
import {runCombat,attackAction} from '../../src/combat.js';
import {validateState} from '../../src/validate.js';
const c=await load(),cfg=JSON.parse(fs.readFileSync(ROOT+'/tools/sim/baseline.json'));
test('all configured builds are legal, full and have no unspent points, including engine-generated E profiles',()=>{
 for(const x of cfg.scenarios){const s=character(c,x.pc);assert.deepEqual(validateState(s,c),[]);assert.equal(s.entities.pc.sheet.free_points,0);}
});
test('three classes, a monster and mirrored class matchups at different ranges replay exactly without illegal actions',()=>{
 const ids=[...cfg.smoke,'duel-mage-warrior-1-LONG','warrior-E-normal','warrior-E-rare'];
 for(const id of ids){const s=cfg.scenarios.find(x=>x.id===id),a=simulate(c,s,7,{detail:true});assert.deepEqual(simulate(c,s,7,{detail:true}),a);assert.deepEqual(a.errors,[]);for(const p of Object.values(a.combatants)){assert.ok(p.hp>=0);if(p.mp!==null)assert.ok(p.mp>=0);if(p.sta!==null)assert.ok(p.sta>=0);}}
});
test('selection does not change state, resources or RNG; first attack agrees with direct engine combat resolver used by 9A tests',()=>{
 const scenario=cfg.scenarios[0],ctx=setup(c,scenario,19),before=JSON.stringify(ctx.enc),n=ctx.dice.n;
 const act=choose(ctx,'skill');assert.equal(JSON.stringify(ctx.enc),before);assert.equal(ctx.dice.n,n);
 const direct=setup(c,scenario,19);for(const x of [ctx,direct]){x.dice.variance=()=>1;x.dice.d100=()=>50;}const hit=attackAction(direct,'pc',act.target,act.skill,{move:act.move});
 const result=runCombat(ctx,act);const first=result.records.find(x=>x.actor==='pc');assert.deepEqual(first.strikes,hit.strikes);assert.deepEqual(first.cost,hit.cost);
});
