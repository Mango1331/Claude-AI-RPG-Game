import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { startCampaign, playerTurn } from '../../src/engine.js';
import { selectClass, selectSkills } from '../../src/creation.js';
import { applyEvent, fold } from '../../src/state.js';
import { awardXp, assignStat } from '../../src/progression.js';
import { rankOf } from '../../src/derived.js';
import { humanSheet } from '../../src/npcgen.js';

const content = await loadProductContent();
const total = sheet => Object.values(sheet.stats).reduce((a,b)=>a+b,0)+sheet.free_points;
function hero(cls) {
    const events=startCampaign(content,{seed:7,runtime:'v4',ruleset:2}), state=fold(events);
    const add=es=>{events.push(...es);es.forEach(e=>applyEvent(state,e));};
    const initial=structuredClone(state.entities.pc.sheet.stats);
    add(selectClass(state,content,cls).events);
    add(selectSkills(state,content,content.classes.get(cls).skill_pool.slice(0,2)).events);
    return {state,sheet:state.entities.pc.sheet,events,initial,add};
}
for(const cls of ['warrior','mage','rogue']) {
    test(`195 ${cls}: base five and only two once-only starting favored points`,()=>{
        const {state,sheet,initial,add}=hero(cls),favored=content.classes.get(cls).favored;
        assert.deepEqual(initial,Object.fromEntries(content.rules.stats.map(k=>[k,5])));
        assert.equal(total(sheet),32); assert.equal(sheet.free_points,0);
        for(const k of content.rules.stats) assert.equal(sheet.stats[k],favored.includes(k)?6:5);
        assert.equal(favored.length,2); const before=structuredClone(sheet);
        assert.ok(selectClass(state,content,cls).errors); assert.deepEqual(sheet,before);
    });
    test(`195 ${cls}: level 1 to 2 books five free points without automatic attributes or refill`,()=>{
        const {sheet,add}=hero(cls),before=structuredClone(sheet);
        sheet.hp-=3;sheet.mp-=4;sheet.sta-=5; const resources=[sheet.hp,sheet.mp,sheet.sta];
        const events=awardXp(sheet,125,content,'195 single');add(events);
        assert.equal(content.rules.progression.favored_growth_per_level,0);
        assert.deepEqual(events.find(e=>e.t==='level.up').d.favored,[]);
        assert.deepEqual(sheet.stats,before.stats);assert.equal(sheet.free_points,5);assert.equal(total(sheet),37);
        assert.equal(sheet.level,2);assert.equal(sheet.xp,25);assert.deepEqual([sheet.hp,sheet.mp,sheet.sta],resources);
        assert.equal(sheet.class,cls);assert.equal(sheet.evolution,undefined);
    });
    test(`195 ${cls}: one XP award with three level-ups yields exactly fifteen unassigned points`,()=>{
        const {sheet,events,add,state}=hero(cls),before=structuredClone(sheet.stats);
        const award=awardXp(sheet,650,content,'195 multi');add(award);
        assert.deepEqual(award.filter(e=>e.t==='level.up').map(e=>[e.d.level,e.d.xp_after,e.d.free_points,e.d.favored]),[[2,550,5,[]],[3,350,5,[]],[4,50,5,[]]]);
        assert.equal(sheet.free_points,15);assert.equal(total(sheet),47);assert.deepEqual(sheet.stats,before);
        assert.equal(sheet.xp,50);assert.equal(sheet.level,4);assert.deepEqual(fold(events),state);
    });
    test(`195 ${cls}: all five points can be assigned manually, including nonfavored stats`,()=>{
        const {sheet,add}=hero(cls);add(awardXp(sheet,100,content,'195 assign'));
        const stat=content.rules.stats.find(k=>!content.classes.get(cls).favored.includes(k)),before=sheet.stats[stat];
        add(assignStat(sheet,stat,5,content).events);
        assert.equal(sheet.stats[stat],before+5);assert.equal(sheet.free_points,0);assert.equal(total(sheet),37);
        assert.ok(assignStat(sheet,stat,1,content).errors);
        assert.ok(assignStat(sheet,stat,0,content).errors);
    });
}
test('195: XP thresholds/carryover and rank transitions are unchanged; no automatic class evolution',()=>{
    for(const [level,rank] of [[14,'E'],[29,'D'],[44,'C'],[59,'B'],[74,'A'],[89,'S']]) {
        const {sheet,add}=hero('mage');sheet.level=level;sheet.xp=level*100-1;
        const stats=structuredClone(sheet.stats);const events=awardXp(sheet,2,content,'195 rank');add(events);
        assert.equal(sheet.level,level+1);assert.equal(sheet.xp,1);assert.equal(rankOf(sheet.level,content),rank);
        assert.deepEqual(sheet.stats,stats);assert.equal(sheet.free_points,5);
        assert.equal(sheet.class,'mage');assert.equal(sheet.evolution,undefined);
        assert.deepEqual(events.map(e=>e.t),['xp.changed','level.up']);
    }
});
test('195: generated NPC strength and class favored assignments are untouched',()=>{
    const prior={...content,rules:{...content.rules,progression:{...content.rules.progression,favored_growth_per_level:1}}};
    for(const t of content.npcTemplates[2].values()) for(const level of [1,7,15]) {
        assert.deepEqual(humanSheet(t,{level,key:'195'},content),humanSheet(t,{level,key:'195'},prior));
    }
});
test('195: #class explains one-time favored selection and five freely allocated points without per-level bonuses',()=>{
    for(const cls of ['warrior','mage','rogue']) {
        const {state}=hero(cls),r=playerTurn(state,content,'#class');
        const text=(r.command?.panels||[]).join('\n');
        assert.match(text,/5 free Stat Points per Level/);assert.match(text,/no automatic/);
        assert.ok(content.classes.get(cls).favored.every(k=>text.includes(k)));
        assert.doesNotMatch(text,/then on each later Level gained/);
    }
});
