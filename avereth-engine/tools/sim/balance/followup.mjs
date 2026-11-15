// Targeted tactic/proficiency controls after the broad matrix; uses exactly the same engine adapter and seeds.
// node tools/sim/balance/followup.mjs <engine root> <artifact dir>
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {engine} from './engine.mjs';
const root=path.resolve(process.argv[2]||new URL('../../..',import.meta.url).pathname),out=path.resolve(process.argv[3]||'/tmp/avereth-balance-196-198'),E=await engine(root),scenarios=[];
const add=(id,cls,level,foe,extra={})=>scenarios.push({id,cls,level,style:'balanced',gear:'mixed',prof:1,band:'SHORT',tactic:'max',foe,...extra});
for(const cls of ['warrior','mage','rogue']){
 for(const anchor of ['goblin','armored_beast','bear','spirit']){
  for(const tactic of ['max','defensive'])add(`worldtactic-${cls}-${anchor}-${tactic}`,cls,10,{anchor,level:9,type:'boss'},{tactic,group:'boss_world_tactic'});
  add(`plus5-optimal-${cls}-${anchor}`,cls,10,{anchor,level:15,type:'normal'},{group:'normal_plus5_tactic'});
  add(`plus5-extreme-${cls}-${anchor}`,cls,10,{anchor,level:15,type:'normal'},{style:'offensive',gear:{weapon:'exceptional',armor:'exceptional',armorBase:'heavy armor',offhand:'exceptional'},prof:5,group:'normal_plus5_extreme',extreme:true});
 }
 add(`guardian-optimal-${cls}`,cls,5,{anchor:'armored_beast',level:6,type:'elite'},{group:'elite_world_tactic'});
}
fs.mkdirSync(out,{recursive:true});const raw=fs.openSync(`${out}/followup-results.jsonl`,'w'),rows=[],samples={};
try{for(const sc of scenarios){const rr=[];for(let seed=7001;seed<=7100;seed++){const r=E.fight(sc,seed);rr.push(r);fs.writeSync(raw,JSON.stringify(r)+'\n');if(!samples[sc.id]&&((r.outcome==='win'&&r.rounds<=2)||seed===7100))samples[sc.id]={scenario:sc,...E.fight(sc,seed,true)};}
 const wins=rr.filter(r=>r.outcome==='win'),fast=wins.filter(r=>r.rounds<=2).length;rows.push({...E.summarize(sc,rr),escapes:rr.filter(r=>r.outcome==='escape').length,fastWins:fast,fastWinPct:wins.length?100*fast/wins.length:null});
}}finally{fs.closeSync(raw);}
for(const [name,data] of Object.entries({summary:rows,scenarios,samples,metadata:{build:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,node:process.version,seeds:[7001,7100],scenarios:scenarios.length,fights:scenarios.length*100,runner_sha256:createHash('sha256').update(fs.readFileSync(import.meta.filename)).digest('hex')}}))fs.writeFileSync(`${out}/followup-${name}.json`,JSON.stringify(data,null,2));
console.log('DONE',rows.length,rows.reduce((n,r)=>n+r.aborts,0),'aborts',rows.reduce((n,r)=>n+r.errors,0),'errors');if(rows.some(r=>r.aborts||r.errors))process.exitCode=1;
