// Usage: node tools/sim/balance/run.mjs --engine <engine root> --stage final --out <artifact dir>
// Paired stages additionally require --stage 196|197|198 --before <previous engine root>.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {engine} from './engine.mjs';
const args=process.argv.slice(2),opt=(k,fallback)=>args.includes(k)?args[args.indexOf(k)+1]:fallback;
const root=path.resolve(opt('--engine',new URL('../../..',import.meta.url).pathname)),stage=opt('--stage','final'),out=path.resolve(opt('--out','/tmp/avereth-balance-196-198'));
assert(['196','197','198','final'].includes(stage));
if(stage!=='final')assert(opt('--before'),'paired comparison requires --before');
const E=await engine(root),before=stage==='final'?null:await engine(path.resolve(opt('--before')));
fs.mkdirSync(out,{recursive:true});
const scenarios=[],classes=['warrior','mage','rogue'],bodies=['goblin','armored_beast','bear','spirit'];
const add=(id,cls,level,foe,extra={})=>scenarios.push({id,cls,level,style:'balanced',gear:'fine',prof:1,band:'SHORT',tactic:'skill',foe,...extra});
const ordinaryGear=level=>level===1?'starter':level<10?'fine':level<15?'mixed':{weapon:'fine',armor:'fine',rank:'E'};
if(stage==='196'){
 for(const cls of classes)for(const q of ['fine','superior','exceptional'])for(const level of [15,20])add(`E-${cls}-${q}-elite${level}`,cls,15,{anchor:'bear',level,type:'elite'},{gear:{weapon:q,weaponRank:'E',armor:'exceptional',armorRank:'F'}});
 for(const cls of classes)add(`F-control-${cls}`,cls,15,{anchor:'bear',level:15,type:'elite'},{gear:'exceptional'});
}
if(stage==='197'||stage==='final')for(const cls of classes)for(const level of [5,10,14,15])for(const delta of [0,5])for(const kit of ['native','matched','veteran'])add(`human-${cls}-${level}-plus${delta}-${kit}`,cls,level,{npc:'adventurer',class:cls,level:level+delta,...(kit==='matched'?{matched:true}:kit==='veteran'?{gear:{weapon:'superior',armor:'fine',rank:level+delta>=15?'E':'F'},prof:3}:{})},{gear:level>=15?{weapon:'fine',armor:'fine',rank:'E'}:'fine',tactic:cls==='rogue'?'max':'skill',group:delta?'human_plus5':'human_equal'});
if(stage==='198')for(const cls of classes)for(const anchor of ['bear','spirit'])for(const q of ['common','fine','superior'])add(`shield-${cls}-${anchor}-${q}`,cls,5,{anchor,level:6,type:'elite'},{gear:{weapon:'fine',armor:'fine',offhand:q},tactic:'max'});
if(stage==='final'){
 // Six distinct groups, with all five PC levels and four real body plans; no simulated evolution or rank bypass.
 for(const cls of classes)for(const level of [1,5,10,14,15])for(const anchor of bodies)for(const type of ['normal','elite','boss'])for(const delta of [0,5])add(`${type}-${cls}-${level}-${anchor}-plus${delta}`,cls,level,{anchor,level:level+delta,type},{gear:ordinaryGear(level),group:`${type}_${delta?'plus5':'equal'}`});
 // The .195 upper-F boss and early guardian comparisons, at actual independent world levels.
 for(const cls of classes)for(const anchor of bodies)add(`worldboss-${cls}-${anchor}`,cls,10,{anchor,level:9,type:'boss'},{gear:'mixed',group:'boss_world'});
 for(const cls of classes)add(`guardian-${cls}`,cls,5,{anchor:'armored_beast',level:6,type:'elite'},{gear:'mixed',group:'elite_world'});
 // Ordinary alternatives versus a heavily armored/strong/magical target; distinguish tactics from raw gear.
 for(const cls of classes)for(const anchor of ['armored_beast','bear','spirit'])for(const tactic of ['max','defensive'])add(`tactic-${cls}-${anchor}-${tactic}`,cls,10,{anchor,level:15,type:'boss'},{gear:'mixed',tactic,group:'boss_plus5_tactic'});
 for(const cls of classes)for(const anchor of bodies)add(`exceptional-${cls}-${anchor}`,cls,10,{anchor,level:15,type:'boss'},{style:'offensive',gear:{weapon:'exceptional',armor:'exceptional',armorBase:'heavy armor',offhand:'exceptional'},prof:5,tactic:'max',group:'boss_plus5_extreme',extreme:true});
 // A real high-quality humanoid description uses the fixed monster loadout, not human item multipliers.
 for(const cls of classes)for(const type of ['elite','boss'])add(`armed-${cls}-${type}`,cls,10,{anchor:'goblin',level:15,type,armed:'exceptional E-Rank longsword'},{gear:'mixed',group:'humanoid_quality_control'});
 // Range and ammunition are real: these are tactical alternatives, not added class benefits.
 for(const band of ['ENGAGED','SHORT','MEDIUM','LONG'])for(const anchor of ['goblin','bear'])add(`bow-${band}-${anchor}`,'rogue',10,{anchor,level:15,type:'boss'},{gear:{weapon:'superior',armor:'fine',bow:true},band,tactic:'bow',group:'boss_plus5_bow'});
}
function summary(sc,rr){const r=E.summarize(sc,rr),wins=rr.filter(r=>r.outcome==='win');return {...r,escapes:rr.filter(r=>r.outcome==='escape').length,fastWins:wins.filter(r=>r.rounds<=2).length,fastWinPct:wins.length?100*wins.filter(r=>r.rounds<=2).length/wins.length:null};}
const rows=[],samples={},raw=fs.openSync(`${out}/${stage}-results.jsonl`,'w'),t0=Date.now();
try {for(const [i,sc] of scenarios.entries()){
 const aa=[],bb=[];for(let seed=7001;seed<=7100;seed++){
  const b=E.fight(sc,seed);bb.push(b);
  if(before){const a=before.fight(sc,seed);aa.push(a);if(sc.id.startsWith('F-control')||stage==='198'&&(sc.foe.anchor==='spirit'||sc.gear.offhand!=='fine'))assert.deepEqual(a,b,sc.id+' unchanged control');fs.writeSync(raw,JSON.stringify({id:sc.id,seed,before:a,after:b})+'\n');}
  else fs.writeSync(raw,JSON.stringify(b)+'\n');
  if(!samples[sc.id]&&(seed===7001||!b.complete||b.errors.length))samples[sc.id]={scenario:sc,...E.fight(sc,seed,true)};
 }
 rows.push(before?{scenario:sc,before:summary(sc,aa),after:summary(sc,bb)}:summary(sc,bb));
 if(i%25===0)console.log(i+1,scenarios.length,sc.id);
}} finally {fs.closeSync(raw);}
fs.writeFileSync(`${out}/${stage}-summary.json`,JSON.stringify(rows,null,2));fs.writeFileSync(`${out}/${stage}-scenarios.json`,JSON.stringify(scenarios,null,2));fs.writeFileSync(`${out}/${stage}-samples.json`,JSON.stringify(samples,null,2));
const digest=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(`${out}/${stage}-metadata.json`,JSON.stringify({stage,node:process.version,engine_root:root,before_root:opt('--before',null),build:JSON.parse(fs.readFileSync(path.join(root,'package.json'))).version,seeds:[7001,7100],scenarios:scenarios.length,fights:scenarios.length*100*(before?2:1),seconds:(Date.now()-t0)/1000,runner_sha256:digest(fileURLToPath(import.meta.url)),adapter_sha256:digest(fileURLToPath(new URL('./engine.mjs',import.meta.url))),source_files:Object.fromEntries(['src/combat.js','src/npcgen.js','src/v4/items.js','content/gear.json','content/rules.json'].map(f=>[f,digest(path.join(root,f))]))},null,2));
const all=rows.flatMap(r=>before?[r.before,r.after]:[r]);console.log('DONE',scenarios.length,all.reduce((n,r)=>n+r.aborts,0),'aborts',all.reduce((n,r)=>n+r.errors,0),'errors');
if(all.some(r=>r.aborts||r.errors))process.exitCode=1;
