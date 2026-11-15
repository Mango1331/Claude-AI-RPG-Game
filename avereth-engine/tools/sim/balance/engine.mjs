// Separate offline balance analysis: actual product character generation and combat, no copied damage formula.
// Accept a checkout root so every stage can be compared without modifying the product or replay originals.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
export async function engine(root) {
 const mod=p=>import(pathToFileURL(path.resolve(root,p)).href);
 const {load,character,setup:originalSetup,choose}=await mod('tools/sim/combat.mjs');
 const {deriveCharacter}=await mod('src/derived.js');
 const {scaleCreature}=await mod('src/npcgen.js');
 const {itemProfile,rankRefusal}=await mod('src/v4/items.js');
 const {initEncounter,runCombat,terminal,alive,attackAction,damagePreview}=await mod('src/combat.js');
 const {Dice}=await mod('src/rng.js');
 const {materialise}=await mod('src/engine.js');
 const {applyEvent}=await mod('src/state.js');
 const c=await load();
 const templates=JSON.parse(fs.readFileSync(path.resolve(root,'content/npc_templates.json'))).ruleset_2.templates;
const builds={
 warrior:{skills:['warrior.heavy_slash','warrior.guard'],offensive:{STR:3,VIT:1,AGI:1},balanced:{STR:2,VIT:2,AGI:1},defensive:{STR:1,VIT:3,WIL:1}},
 mage:{skills:['mage.arcane_bolt','mage.arcane_ward'],offensive:{INT:3,WIL:1,VIT:1},balanced:{INT:2,WIL:1,VIT:2},defensive:{INT:1,WIL:2,VIT:2}},
 rogue:{skills:['rogue.razor_cut','rogue.piercing_thrust'],offensive:{AGI:3,PER:1,VIT:1},balanced:{AGI:2,PER:1,VIT:2},defensive:{AGI:1,VIT:3,WIL:1}}
};
function profile(base,q='fine',rank='F'){
 const p=itemProfile(c,{name:`${q} ${rank}-Rank ${base}`,balance:true});assert(p?.kind==='gear');return p;
}
function gear(sh,g='starter'){
 if(g==='starter')return;
 const cls=sh.class;let spec=typeof g==='object'?g:g==='mixed'?{weapon:'superior',armor:'fine'}:{weapon:g,armor:g};
 const rank=spec.rank||'F';
 for(const [slot,q] of Object.entries(spec)){
  if(!['weapon','armor','offhand'].includes(slot)||q==='starter')continue;
  if(q==='none'){delete sh.equipment[slot];continue;}
  const base=slot==='weapon'?(spec.bow?'bow':cls==='mage'?'staff':cls==='rogue'?'dagger':'longsword'):slot==='armor'?(spec.armorBase||(cls==='warrior'?'heavy armor':'robes')):'shield';
  const p=profile(base,q,spec[slot+'Rank']||rank);assert.equal(rankRefusal(c,sh.level,p),null);
  sh.equipment[slot]={...p,id:'analysis_'+slot,name:`${q} ${rank} ${base}`};
 }
 if(spec.bow)sh.inventory.standard_arrow=20;
}
function refill(sh){const d=deriveCharacter(sh,c);Object.assign(sh,{hp:d.maxHp,mp:d.maxMp,sta:d.maxSta});}
function pcSheet(cls,level,style='balanced',g='starter',prof=1){
 const s=character(c,{class:cls,level,skills:builds[cls].skills,stats:builds[cls][style]});const sh=s.entities.pc.sheet;
 for(const k of Object.values(sh.skills))k.prof=prof;
 gear(sh,g);refill(sh);return s;
}
function setup(sc,seed){
 if(sc.original)return originalSetup(c,sc.original,seed);
 const s=pcSheet(sc.cls,sc.level,sc.style,sc.gear,sc.prof);
 const ids=[],o=sc.foe;
 if(o.npc){
  const t=templates.find(t=>t.id===o.npc);assert(t);
  s.rng.seed=seed;
  s.entities.foe0={id:'foe0',kind:'npc',name:`${o.npc} ${o.class||sc.cls}`,template:o.npc,class:o.class||sc.cls,level:o.level,status:'alive',location:s.scene.location};
  materialise(s,c,new Dice(seed),e=>applyEvent(s,e),'foe0');
  let sh=s.entities.foe0.sheet;
  if(o.matched){const pc=s.entities.pc.sheet;sh.skills=structuredClone(pc.skills);sh.equipment=structuredClone(pc.equipment);sh.inventory=structuredClone(pc.inventory);}
  if(o.gear)gear(sh,o.gear);
  if(o.prof)for(const sk of Object.values(sh.skills))sk.prof=o.prof;
  refill(sh);s.entities.foe0={id:'foe0',kind:'npc',name:`${o.npc} ${sh.class}`,sheet:sh,status:'alive',location:s.scene.location};
  // Actual mutual hostility: prevents first-turn abstention from being mistaken for stat parity.
  s.relations['rel.foe0.attitude.pc']={value:-100};ids.push('foe0');
 }else{
  const a=c.anchors.get(o.anchor);assert(a);
  for(let i=0;i<(o.count||1);i++){const id='foe'+i;ids.push(id);s.entities[id]={id,kind:'creature',name:a.name,anchor:a.id,profile:scaleCreature(a,o.level,o.type||'normal',c),status:'alive',location:s.scene.location};if(o.armed){delete s.entities[id].profile;Object.assign(s.entities[id],{level:o.level,type:o.type||'normal',armed:o.armed});materialise(s,c,new Dice(seed),e=>applyEvent(s,e),id);}}
 }
 for(const id of ids){s.scene.positions[id]={band:sc.band||'SHORT',cover:'none'};s.scene.awareness[id]='aware';}
 const dice=new Dice(seed);const enc=initEncounter(s,c,dice,{actor:'pc',target:ids[0],engage:true},ids.map(id=>({id,side:'hostile'})),sc.id,{c:true});
 return{state:s,content:c,dice,enc,c:true};
}
function policy(ctx,sc){
 const tactic=sc.original?.tactic||sc.tactic||'skill';
 if(['max','bow'].includes(tactic)){
  const target=Object.values(ctx.enc.combatants).find(x=>x.side==='hostile'&&alive(x));if(!target)return null;
  const list=damagePreview(ctx.enc,c,target.id,ctx.state).filter(p=>tactic!=='bow'||p.skill==='weapon.bow_shot').sort((a,b)=>(b.min+b.max)*b.strikes-(a.min+a.max)*a.strikes);
  for(const p of list){const act={kind:'attack',skill:p.skill,target:target.id,move:'closer'};const trial={...ctx,state:structuredClone(ctx.state),enc:structuredClone(ctx.enc),dice:new Dice(ctx.dice.seed,ctx.dice.n)};if(!attackAction(trial,'pc',target.id,p.skill,{move:'closer'}).illegal)return act;}
  if(tactic==='bow')return{kind:'move',dir:'closer',target:target.id};
 }
 return choose(ctx,['basic','defensive','resource'].includes(tactic)?tactic:'skill');
}
function fight(sc,seed,detail=false){
 const ctx=setup(sc,seed),records=[],errors=[];let steps=0;
 while(!terminal(ctx.enc)&&ctx.enc.round<=100&&steps++<300){const r=runCombat(ctx,policy(ctx,sc));records.push(...r.records);errors.push(...r.records.filter(r=>r.illegal).map(r=>r.illegal));if(r.illegal){errors.push(r.illegal);break;}}
 const pc=ctx.enc.combatants.pc,hostiles=Object.values(ctx.enc.combatants).filter(x=>x.side==='hostile'),own=records.filter(r=>r.actor==='pc'),other=records.filter(r=>r.actor!=='pc');
 const attacks=own.filter(r=>r.strikes?.length),strikes=attacks.flatMap(r=>r.strikes),incoming=other.flatMap(r=>r.strikes||[]).filter(r=>r.target==='pc');
 const damage=rr=>rr.reduce((n,k)=>n+Math.max(0,(k.hp_before??0)-(k.hp_after??0)),0),sum=(rr,k)=>rr.reduce((n,r)=>n+(r[k]||0),0);
 const complete=!!terminal(ctx.enc),outcome=pc.current.defeated?'loss':hostiles.every(x=>!alive(x))?'win':pc.current.escaped?'escape':'abort';
 return{scenario:sc.id,seed,outcome,complete,rounds:Math.max(0,...records.map(r=>r.round||0)),engineRoundCounter:ctx.enc.round,hp:pc.current.hp,hpPct:pc.current.hp/pc.fixed.max_hp*100,dealt:damage(strikes),taken:damage(incoming),turns:own.length,attacks:attacks.length,strikes:strikes.length,incoming:incoming.length,rolledDamage:sum(strikes,'final'),incomingFinal:sum(incoming,'final'),incomingPower:sum(incoming,'power'),postDef:sum(incoming,'post_def'),spentMp:sum(own.filter(r=>r.cost?.resource==='mp').map(r=>r.cost),'amount'),spentSta:sum(own.filter(r=>r.cost?.resource==='sta').map(r=>r.cost),'amount'),arrows:sum(own.map(r=>r.ammo||{}),'used'),errors,...(detail?{records,combatants:ctx.enc.combatants,dice:ctx.dice.log}:{})};
}
function summarize(sc,rr){
 const sum=k=>rr.reduce((n,r)=>n+r[k],0),avg=k=>sum(k)/rr.length,ww=rr.filter(r=>r.outcome==='win'),rounds=rr.map(r=>r.rounds).sort((a,b)=>a-b);
 return{...sc,runs:rr.length,wins:ww.length,losses:rr.filter(r=>r.outcome==='loss').length,aborts:rr.filter(r=>!r.complete).length,errors:rr.reduce((n,r)=>n+r.errors.length,0),meanRounds:avg('rounds'),medianRounds:rounds[Math.floor(rounds.length/2)],winHp:ww.reduce((n,r)=>n+r.hp,0)/ww.length,winHpPct:ww.reduce((n,r)=>n+r.hpPct,0)/ww.length,dealt:avg('dealt'),taken:avg('taken'),mp:avg('spentMp'),sta:avg('spentSta'),arrows:avg('arrows'),damagePerAttack:sum('rolledDamage')/sum('attacks'),damagePerTurn:sum('rolledDamage')/sum('turns'),damageTakenPerStrike:sum('incomingFinal')/sum('incoming'),mitigation:100*(1-sum('postDef')/sum('incomingPower'))};
}
return {c,builds,profile,gear,pcSheet,setup,policy,fight,summarize};
}
