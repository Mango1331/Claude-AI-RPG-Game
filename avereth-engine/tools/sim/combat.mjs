import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadContentPack,skillOf} from '../../src/content.js';
import {startCampaign} from '../../src/engine.js';
import {fold,applyEvent} from '../../src/state.js';
import {selectClass,selectSkills} from '../../src/creation.js';
import {awardXp,assignStat} from '../../src/progression.js';
import {deriveCharacter} from '../../src/derived.js';
import {scaleCreature} from '../../src/npcgen.js';
import {Dice} from '../../src/rng.js';
import {initEncounter,runCombat,terminal,attackAction,skillAction,alive} from '../../src/combat.js';
import {classDrafts,offerClass,acceptClass} from '../../src/v4/class_growth.js';
import {ENGINE_VERSION} from '../../src/util.js';
let sourceHash;
export const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function load(){return loadContentPack(async n=>JSON.parse(fs.readFileSync(path.join(ROOT,'content',n),'utf8')));}
const book=(s,events)=>events.forEach(e=>applyEvent(s,e));
export function character(c,b){
 if(![1,5,10,14,15].includes(b.level))throw Error('supported levels: 1,5,10,14,15');
 const s=fold(startCampaign(c,{seed:1,ruleset:2}));
 for(const result of [()=>selectClass(s,c,b.class),()=>selectSkills(s,c,b.skills)]){const r=result();if(r.errors)throw Error(r.errors.join(';'));book(s,r.events);}
 const xp=Array.from({length:b.level-1},(_,i)=>(i+1)*c.rules.progression.xp_to_next_per_level).reduce((a,b)=>a+b,0);
 book(s,awardXp(s.entities.pc.sheet,xp,c,'synthetic simulation setup'));
 const sh=s.entities.pc.sheet,weights=b.stats||Object.fromEntries(c.classes.get(b.class).favored.map(k=>[k,1]));
 if(Object.values(weights).some(v=>!Number.isFinite(v)||v<=0))throw Error('positive stat weights required');
 const total=Object.values(weights).reduce((a,b)=>a+b,0),free=sh.free_points;let left=free;
 for(const [i,[stat,w]] of Object.entries(Object.entries(weights))){const n=Number(i)===Object.keys(weights).length-1?left:Math.floor(free*w/total);if(n){const r=assignStat(sh,stat,n,c);if(r.errors)throw Error(r.errors.join(';'));book(s,r.events);left-=n;}}
 if(b.evolution){if(b.level!==15||!['normal','rare'].includes(b.evolution))throw Error('E profiles require level15 and normal/rare');
  if(b.evolution==='rare')book(s,[{t:'career.recorded',d:{source:'sim:synthetic',feats:[{key:'sim:giant',kind:'giant',context:'sim:synthetic',facts:{gap:5}}]}}]);
  book(s,offerClass(s,c,classDrafts(s,c)).events);const option=s.decisions.find(d=>d.kind==='class')?.options.find(o=>o.direction===(b.direction||'offense'));
  if(!option)throw Error('requested class direction not offered');const r=acceptClass(s,c,option.id);if(r.refuse)throw Error(r.refuse);book(s,r.events);
 }
 const dv=deriveCharacter(sh,c);Object.assign(sh,{hp:dv.maxHp,mp:dv.maxMp,sta:dv.maxSta});return s;
}
export function setup(c,scenario,seed){
 if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('seed must be uint32');
 if(!['ENGAGED','SHORT','MEDIUM','LONG'].includes(scenario.band))throw Error('invalid band');
 const s=character(c,scenario.pc),ids=[];
 if(scenario.opponent.class){const other=character(c,scenario.opponent);s.entities.foe={id:'foe',kind:'npc',name:scenario.opponent.class,sheet:other.entities.pc.sheet,status:'alive',location:s.scene.location};ids.push('foe');}
 else {const a=c.anchors.get(scenario.opponent.anchor);if(!a)throw Error('unknown real anchor');if(!Number.isInteger(scenario.opponent.level)||scenario.opponent.level<1||!['normal','elite','boss'].includes(scenario.opponent.type||'normal'))throw Error('invalid monster level/type');const count=scenario.opponent.count||1;if(!Number.isInteger(count)||count<1||count>8)throw Error('group size 1..8');
  for(let i=0;i<count;i++){const id='foe'+i;s.entities[id]={id,kind:'creature',name:a.name,anchor:a.id,profile:scaleCreature(a,scenario.opponent.level,scenario.opponent.type||'normal',c),status:'alive',location:s.scene.location};ids.push(id);}}
 for(const id of ids){s.scene.positions[id]={band:scenario.band,cover:'none'};s.scene.awareness[id]='aware';}
 const dice=new Dice(seed),trigger={actor:'pc',target:ids[0],engage:true};
 const enc=initEncounter(s,c,dice,trigger,ids.map(id=>({id,side:'hostile'})),scenario.id,{c:true});
 return {state:s,content:c,dice,enc,c:true};
}
export function choose(ctx,tactic='skill'){
 if(!['basic','skill','defensive','resource'].includes(tactic))throw Error('unknown tactic');
 const me=ctx.enc.combatants.pc,target=Object.values(ctx.enc.combatants).find(x=>x.side==='hostile'&&alive(x));if(!target)return null;
 const known=Object.keys(me.fixed.actions).map(id=>skillOf(ctx.content,id,ctx.state)).filter(Boolean);
 const basic=known.filter(k=>k.basic||k.weapon_attack),attacks=known.filter(k=>k.attack&&!k.basic&&!k.weapon_attack);
 const candidates=[];
 if(tactic==='defensive'&&ctx.enc.log.findLast(r=>r.actor==='pc')?.kind!=='skill')for(const k of known.filter(k=>!k.attack&&k.effects?.some(e=>['temp_def','temp_mdef','barrier'].includes(e.kind))))candidates.push({kind:'skill',skill:k.id});
 const preferred=tactic==='basic'||(tactic==='resource'&&Math.min(me.current.sta/Math.max(1,me.fixed.max_sta),me.current.mp/Math.max(1,me.fixed.max_mp))<0.3)?[...basic,...attacks]:[...attacks,...basic];
 for(const k of preferred)candidates.push({kind:'attack',skill:k.id,target:target.id,move:'closer'});
 for(const act of candidates){const trial={...ctx,enc:structuredClone(ctx.enc),state:structuredClone(ctx.state),dice:new Dice(ctx.dice.seed,ctx.dice.n)};const r=act.kind==='attack'?attackAction(trial,'pc',act.target,act.skill,{move:act.move}):skillAction(trial,'pc',act.skill);if(!r.illegal)return act;}
 return {kind:'move',dir:'closer',target:target.id};
}
export function simulate(c,scenario,seed,{detail=false,maxRounds=100}={}){
 const ctx=setup(c,scenario,seed),records=[],errors=[];let steps=0;
 while(!terminal(ctx.enc)&&ctx.enc.round<=maxRounds&&steps++<maxRounds*3){const r=runCombat(ctx,choose(ctx,scenario.tactic));records.push(...r.records);errors.push(...r.records.filter(x=>x.illegal).map(x=>x.illegal));if(r.illegal){errors.push(r.illegal);break;}}
 const pc=ctx.enc.combatants.pc,hostiles=Object.values(ctx.enc.combatants).filter(x=>x.side==='hostile');
 const outcome=pc.current.escaped?'escape':pc.current.defeated?'opponent':hostiles.every(x=>!alive(x))?'pc':'draw';
 const combatants=Object.fromEntries(Object.values(ctx.enc.combatants).map(x=>{const own=records.filter(r=>r.actor===x.id);return [x.id,{name:x.name,model:x.model,fixed:x.fixed,escaped:!!x.current.escaped,surrendered:!!x.current.surrendered,defeated:!!x.current.defeated,hp:x.current.hp,mp:x.current.mp??null,sta:x.current.sta??null,damage:own.flatMap(r=>r.strikes||[]).reduce((n,k)=>n+Math.max(0,(k.hp_before??0)-(k.hp_after??0)),0),spent:{mp:own.filter(r=>r.cost?.resource==='mp').reduce((n,r)=>n+r.cost.amount,0),sta:own.filter(r=>r.cost?.resource==='sta').reduce((n,r)=>n+r.cost.amount,0)},skills:own.reduce((a,r)=>{if(r.skill)a[r.skill]=(a[r.skill]||0)+1;return a;},{})}];}));
 // Default output keeps resolved stats, not full action libraries or full combat logs.
 if(!detail)for(const v of Object.values(combatants))delete v.fixed.actions;
 return {engine:ENGINE_VERSION,source_sha256:fingerprint(),scenario:scenario.id,seed,outcome,rounds:ctx.enc.round,complete:!!terminal(ctx.enc),combatants,errors,...(detail?{records,dice:ctx.dice.log}: {})};
}
export function fingerprint(){if(sourceHash)return sourceHash;const h=createHash('sha256');for(const dir of ['src','content']){const walk=d=>{for(const n of fs.readdirSync(d).sort()){const p=path.join(d,n);if(fs.statSync(p).isDirectory())walk(p);else{h.update(path.relative(ROOT,p));h.update(fs.readFileSync(p));}}};walk(path.join(ROOT,dir));}return sourceHash=h.digest('hex');}
export async function main(args=process.argv.slice(2)){
 const arg=(k,d)=>{const i=args.indexOf('--'+k);if(i<0)return d;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('missing '+k);return args[i+1];};
 const unknown=args.filter((x,i)=>x.startsWith('--')&&!['--smoke','--detail','--config','--matrix','--scenario','--seed','--runs','--out'].includes(x));if(unknown.length)throw Error('unknown argument '+unknown[0]);
 const config=JSON.parse(fs.readFileSync(arg('config',path.join(ROOT,'tools/sim/baseline.json')),'utf8'));
 if(arg('matrix','baseline')!=='baseline')throw Error('use --config for custom matrices');
 const smoke=args.includes('--smoke'),runs=Number(arg('runs',1)),seed=Number(arg('seed',7));if(!Number.isInteger(runs)||runs<1)throw Error('positive runs required');
 let scenarios=config.scenarios;if(arg('scenario',null))scenarios=scenarios.filter(x=>x.id===arg('scenario'));else if(smoke)scenarios=scenarios.filter(x=>config.smoke.includes(x.id));if(!scenarios.length)throw Error('no scenarios selected');
 if(!Number.isInteger(seed)||seed<0||seed+runs-1>0xffffffff)throw Error('seed range must fit uint32');if(new Set(scenarios.map(x=>x.id)).size!==scenarios.length||scenarios.some(x=>!/^[a-zA-Z0-9_-]+$/.test(x.id)))throw Error('unique CSV-safe scenario ids required');
 const c=await load(),out=path.resolve(arg('out','sim-results'));fs.mkdirSync(out,{recursive:true});
 const results=fs.openSync(path.join(out,'results.jsonl'),'w');const rows=['scenario,runs,pc_wins,opponent_wins,draws,escapes,mean_rounds,errors'];
 try{for(const scenario of scenarios){const counts={pc:0,opponent:0,draw:0,escape:0};let rounds=0,errors=0;for(let i=0;i<runs;i++){const r=simulate(c,scenario,seed+i,{detail:args.includes('--detail')});counts[r.outcome]++;rounds+=r.rounds;errors+=r.errors.length;fs.writeSync(results,JSON.stringify(r)+'\n');}rows.push([scenario.id,runs,counts.pc,counts.opponent,counts.draw,counts.escape,rounds/runs,errors].join(','));}}finally{fs.closeSync(results);}
 fs.writeFileSync(path.join(out,'summary.csv'),rows.join('\n')+'\n');fs.writeFileSync(path.join(out,'metadata.json'),JSON.stringify({engine:JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'))).version,node:process.version,ruleset:2,source_sha256:fingerprint(),seed,runs,scenarios,npc_policy:'native engine; asymmetric PC/NPC, mirrored scenarios required'},null,2));console.log(`Wrote ${scenarios.length*runs} fights to ${out}`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
