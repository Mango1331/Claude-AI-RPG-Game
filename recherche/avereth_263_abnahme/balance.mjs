// Invoke with the product's avereth-engine directory. The historical simulator supplies the
// original player policy, fight, party and rest routines. Insert the scenario fixture before initiative.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]);
const imp=p=>import(pathToFileURL(path.join(root,p)));
const {composeSkill,developSkill}=await imp('src/skill_composer.js');
const {defineSkill,learnSkill}=await imp('src/skills.js');
const {definePassive,gainPassive}=await imp('src/passives.js');
const {attackAction}=await imp('src/combat.js');
const {applyEvent}=await imp('src/state.js');
const {skillOf}=await imp('src/content.js');
const {spansFor}=await imp('src/v4/living.js');
const original=fs.readFileSync(new URL('../claude_262_e_balance/simlib.mjs',import.meta.url),'utf8');
const hook='const s = pc(sc); const ids = [];';
assert(original.includes(hook) && original.includes('function lib(root)'));
const withFixture=original.replace('function lib(root)','function lib(root, prepare)').replace(hook,hook+' prepare(s,sc,c);').replace('return { E, c, pc, fight,','return { setup, E, c, pc, fight,');
const {lib}=await import('data:text/javascript;base64,'+Buffer.from(withFixture).toString('base64'));
function prepare(s,sc,c){
    if(!sc.developed) return;
    const sh=s.entities.pc.sheet;
    const book=r=>{assert.deepEqual(r.errors,[]);r.events.forEach(e=>applyEvent(s,e));};
    const passive={id:'dyn.passive_iron_hide',name:'Iron Hide',description:'Tough skin.',rank:'F',origin:{kind:'training'},scope:'always',effects:[{kind:'stat_bonus',stat:'DEF',value:2}]};
    book(definePassive(s,c,passive));book(gainPassive(s,c,'pc',passive.id,'prepared legacy passive'));
    const base=skillOf(c,{warrior:'warrior.heavy_slash',mage:'mage.flame_lance',rogue:'rogue.piercing_thrust'}[sc.cls],s);
    const evolved=developSkill(s,c,base,'rank',{origin:{kind:'evolution',note:'prepared mastered technique'}});
    assert.deepEqual(evolved.errors,[]);
    book(defineSkill(s,c,evolved.def));sh.skills[base.id].prof=5;
    applyEvent(s,{t:'skill.evolved',d:{id:'pc',from:base.id,to:evolved.def.id,prof:5,pp:0}});
    const fresh=composeSkill(s,c,{fn:sc.cls==='mage'?'bolt':'strike',rank:'E',origin:{kind:'stone'},aspects:['Ice']});
    assert.deepEqual(fresh.errors,[]);book(defineSkill(s,c,fresh.def));book(learnSkill(s,c,'pc',fresh.def.id));
}
const L=await lib(root,prepare),rows=[];
for(const cls of ['warrior','mage','rogue']) for(const level of [5,10,14,15,20,24,29]){
    const band={warrior:'ENGAGED',rogue:'SHORT',mage:'MEDIUM'}[cls];
    const evo={warrior:'offense',mage:'arcane',rogue:'precision'}[cls];
    const base={cls,level,band,gear:level<=15?'fine':{rank:'E',weapon:'fine',armor:'fine'},build:'aoe',learned:true,learnedProf:3,prof:level<10?1:3,potions:2,developed:level>=20,...(level>=15?{evolution:['normal',evo]}:{})};
    for(const [kind,more,foe] of [
        ['single',{}, {anchor:'wolf',level}],
        ['group',{ally:cls==='mage'?'warrior':'mage'}, {anchor:'wolf',level,count:2}],
        ['elite',{band:'LONG',...(cls==='warrior'&&level>=15?{evolution:['rare','defense']}:{})},{anchor:'wolf',type:'elite',level}]
    ]){
        const sc={...base,...more,foe};rows.push({cls,level,kind,band:sc.band,party:!!sc.ally,quality:sc.evolution||null,n:5,...L.rate(sc,5)});
    }
}
const dungeon=[];
for(const d of JSON.parse(fs.readFileSync(path.join(root,'content/lore.json'))).dungeons) for(const [floor,f] of Object.entries(d.living?.floors || {})){
    const rank=(d.levels?.[floor]||d.rank)?.min;if(rank!=='E')continue;
    const spans=spansFor(L.c,{min:rank,max:rank});
    const steps=f.slots.map(sl=>({anchor:sl.anchor,type:L.c.rules.living.role_type[sl.role],level:Math.round((spans[sl.role][0]+spans[sl.role][1])/2),count:Array.isArray(sl.count)?Math.ceil((sl.count[0]+sl.count[1])/2):1}));
    for(const restHours of [0,1]) for(const ally of [null,'warrior']){
        const base={cls:'mage',level:24,band:'MEDIUM',build:'aoe',learned:true,developed:true,prof:5,evolution:['normal','arcane'],gear:{rank:'E',weapon:'fine',armor:'fine'},potions:2,ally};
        dungeon.push({name:d.name,floor,steps,ally,restHours,n:5,...L.chain(base,steps,{n:5,restHours})});
    }
}
const resource=[];
for(const cls of ['warrior','rogue','mage']) for(const rank of ['F','E']) for(const prof of [1,3,5]){
    let hits=0,spent=0,totalDamage=0,pool=0,skill;
    for(let seed=1;seed<=20;seed++){
        const sc={cls,level:20,band:cls==='mage'?'MEDIUM':'ENGAGED',gear:{rank:'E',weapon:'fine',armor:'fine'},build:'aoe',learned:true,prof,learnedProf:prof,developed:rank==='E',evolution:['normal',{warrior:'offense',rogue:'precision',mage:'arcane'}[cls]],foe:{anchor:'wolf',level:20}};
        const ctx=L.setup(sc,seed),sh=ctx.state.entities.pc.sheet,me=ctx.enc.combatants.pc;
        const id=rank==='E'?sh.skill_history.at(-1).evolved_to:{warrior:'warrior.heavy_slash',rogue:'rogue.piercing_thrust',mage:'mage.flame_lance'}[cls];
        skill=skillOf(L.c,id,ctx.state);
        // Reset proficiency for the isolated efficiency comparison. Natural evolution itself retains P5.
        me.fixed.actions[id].prof=prof;sh.skills[id].prof=prof;
        const res=skill.cost.resource,foe=ctx.enc.combatants.foe0_0;
        const hp=foe.current.hp,energy=me.current[res];pool=me.fixed['max_'+res];
        const r=attackAction(ctx,'pc',foe.id,id,{});assert(!r.illegal,r.illegal);
        const damage=hp-foe.current.hp;totalDamage+=damage;hits+=Number(damage>0);spent+=energy-me.current[res];
    }
    const cost=spent/20;
    resource.push({cls,rank,prof,skill:skill.name,cost,hits,n:20,meanDamage:totalDamage/20,damagePerPoint:totalDamage/spent,usesFromFull:Math.floor(pool/cost)});
}
console.log(JSON.stringify({rows,dungeon,resource},null,1));
