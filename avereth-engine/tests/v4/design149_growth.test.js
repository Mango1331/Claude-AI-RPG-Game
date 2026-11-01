import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent, Game } from '../helpers.js';
import { noteUse, fightProgress, fightQualifies } from '../../src/skills.js';
import { developmentEvents, skillEvidence, skillDrafts, offerSkills, acceptSkill } from '../../src/v4/skill_growth.js';
import { applyEvent } from '../../src/state.js';
import { growthOf, goalText } from '../../src/v4/growth.js';
const content = await loadProductContent();
const fixture = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch22_growth149.json.gz', import.meta.url))));
const sid = 'mage.arcane_bolt';
function context(level = 10, foeLevel = 6) {
    const g = new Game(content);g.input('Mage');g.input('Arcane Bolt + Arcane Ward');
    const pc = { id:'pc', side:'pc', fixed:{ level, rank:level < 15 ? 'F' : 'E', actions:{ [sid]:{prof:1},'mage.arcane_ward':{prof:1} } }, current:{} };
    const foe = (id,n) => ({ id,side:'hostile',fixed:{level:n},current:{band:'MEDIUM',defeated:true} });
    return { state:g.state, content, enc:{id:'enc.design149',combatants:{pc,foe:foe('foe',foeLevel),spectator:foe('spectator',level)},pp:{used:{},threatened:false},log:[]} };
}
const hit = (x, target = 'foe') => noteUse(x, {actor:'pc',kind:'attack',skill:sid,target,strikes:[{target}],move:{bands:1}});
for (const gap of [2,3,4,5]) test(`offensive F window PC-${gap}: real target qualifies exactly through four levels`, () => {
    const x=context(10,10-gap);hit(x);const es=fightProgress(x.state,content,x.enc);
    assert.equal(es.length,gap<=4?1:0);if(es.length)assert.equal(es[0].d.gained,18);
    assert.equal(fightQualifies(x.state,content,x.enc),false);
});
test('strong spectators, unexecuted attacks and repeated actions cannot create extra offensive awards', () => {
    const x=context(10,5);hit(x);assert.deepEqual(fightProgress(x.state,content,x.enc),[]);
    noteUse(x,{actor:'pc',kind:'attack',skill:sid,illegal:'range',strikes:[{target:'spectator'}]});assert.deepEqual(fightProgress(x.state,content,x.enc),[]);
    hit(x,'spectator');hit(x,'spectator');const es=fightProgress(x.state,content,x.enc);assert.equal(es.length,1);
    es.forEach(e=>applyEvent(x.state,e));assert.deepEqual(fightProgress(x.state,content,x.enc),[]);
});
test('E-rank PC and non-F skill do not acquire the expanded F offensive window', () => {
    const x=context(15,11);hit(x);assert.deepEqual(fightProgress(x.state,content,x.enc),[]);
    const y=context();y.state.skill_defs={ 'dyn.e':{...structuredClone(content.skills.get(sid)),id:'dyn.e',rank:'E'} };
    y.state.entities.pc.sheet.skills['dyn.e']={prof:1,pp:0};y.enc.combatants.pc.fixed.actions['dyn.e']={prof:1};
    noteUse(y,{actor:'pc',kind:'attack',skill:'dyn.e',target:'foe',strikes:[{target:'foe'}]});assert.deepEqual(fightProgress(y.state,content,y.enc),[]);
});
for (const flag of ['defeated','escaped']) test(`${flag} yields neither offensive PP nor development notes`,()=>{
    const x=context();hit(x);x.enc.combatants.pc.current[flag]=true;
    assert.deepEqual(fightProgress(x.state,content,x.enc),[]);assert.deepEqual(developmentEvents(x.state,content,x.enc),[]);
});
test('defense and mixed combinations keep their own effective-use/challenge gates',()=>{
    const x=context();x.enc.pp.used['mage.arcane_ward']='an effective defense';x.enc.pp.marks={'mage.arcane_ward':['layered']};
    x.enc.pp.threatened=true;delete x.enc.combatants.spectator;
    assert.equal(fightQualifies(x.state,content,x.enc),false);assert.deepEqual(developmentEvents(x.state,content,x.enc),[]);
    hit(x);x.enc.pp.pairs=[['mage.arcane_ward',sid].sort().join('+')];
    const noted=developmentEvents(x.state,content,x.enc).find(e=>e.t==='growth.noted');
    assert.deepEqual(noted.d.pairs,undefined);assert.equal(noted.d.marks['mage.arcane_ward'],undefined);
});
for (const id of ['enc.t8','enc.t48','enc.t53']) test(`Batch22 ${id}: recorded qualifying instant victory retains its actual closing pattern`,()=>{
    const f=fixture.cases.find(c=>c.enc.id===id);assert.ok(f);assert.equal(f.enc.pp.threatened,false);
    const es=developmentEvents(f.before,content,f.enc),noted=es.find(e=>e.t==='growth.noted');
    assert.ok(noted);assert.ok(Object.values(noted.d.marks).some(m=>m.patterns.includes('closing')));
    const s=structuredClone(f.before);es.forEach(e=>applyEvent(s,JSON.parse(JSON.stringify(e))));
    assert.deepEqual(developmentEvents(s,content,f.enc),[]);
});
test('Batch22 all 21 recorded victories: wider gate gives 13 real Thrust target qualifications, not six',()=>{
    assert.equal(fixture.cases.length,21);let qualifies=0;
    for(const f of fixture.cases){const enc=structuredClone(f.enc);enc.pp={used:{},threatened:false};
        for(const r of f.records)noteUse({state:f.before,content,enc},r);
        if(enc.pp.offense?.['rogue.piercing_thrust'])qualifies++;
    }
    assert.equal(qualifies,13); // Fixed recorded actions, not a resimulated campaign or promised outcome.
});
function experienced(prof=5) {
    const x=context();x.state.entities.pc.sheet.skills[sid]={prof,pp:8};
    for(const fight of ['enc.early1','enc.early2'])applyEvent(x.state,{t:'growth.noted',d:{fight,marks:{[sid]:{prof:2,patterns:['reach']}}}});
    return x.state;
}
test('two pre-P5 encounters can support evolution only at P5, with an offer and explicit acceptance',()=>{
    const s=experienced(4);assert.deepEqual(skillEvidence(s,content),[]);
    s.entities.pc.sheet.skills[sid].prof=5;
    const evidence=skillEvidence(s,content);assert.equal(evidence.length,1);
    evidence.forEach(e=>applyEvent(s,e));assert.ok(s.entities.pc.sheet.skills[sid]);assert.deepEqual(skillEvidence(s,content),[]);
    const offered=offerSkills(s,content,skillDrafts(s,content));assert.equal(offered.offers.length,1);
    offered.events.forEach(e=>applyEvent(s,e));assert.ok(s.entities.pc.sheet.skills[sid]);
    const r=acceptSkill(s,content,offered.offers[0].id);assert.equal(r.refuse,undefined);
    const reloaded=JSON.parse(JSON.stringify(s));r.events.forEach(e=>applyEvent(reloaded,e));
    assert.equal(reloaded.entities.pc.sheet.skills[sid],undefined);assert.equal(reloaded.entities.pc.sheet.skills[r.booked.skill].prof,5);
    assert.equal(reloaded.entities.pc.sheet.skills[r.booked.skill].pp,0);assert.deepEqual(acceptSkill(reloaded,content,offered.offers[0].id).events,undefined);
    assert.deepEqual(skillEvidence(reloaded,content),[]);
});
test('one encounter is insufficient; spent evidence and successor identities do not reuse old marks',()=>{
    const s=experienced();growthOf(s).marks[sid].pop();assert.deepEqual(skillEvidence(s,content),[]);
    assert.throws(()=>applyEvent(s,{t:'growth.noted',d:{fight:'enc.early1',marks:{[sid]:{prof:2,patterns:['reach']}}}}),/twice/);
});
test('learning goals remain visible as progress from a source, with no manual-as-progress rule',()=>{
    assert.match(goalText({target:{fn:'guard',tags:['Defense']},source:{name:'Guard manual'},lp:40,need:100}),/40\/100 LP.*learn|learning.*40\/100 LP/i);
    assert.equal(content.rules.proficiency.award.base_pp,12);assert.equal(content.rules.proficiency.award.challenge.levels_below,2);
});

test('host: practice reaching P5 offers existing early evidence; reload/swipe do not grant or accept twice', async()=>{
    const { campaign, say, inject, lastUser } = await import('./patch8_lib.js');
    const { foldChat } = await import('../../src/host.js');
    const g = await campaign(content,{cls:'Mage',skills:'Arcane Bolt + Arcane Ward'});
    inject(g,[{t:'skill.progress',d:{id:'pc',skill:sid,gained:0,from:{prof:1,pp:0},to:{prof:4,pp:49},why:'mastery precondition'}}]);
    for(const fight of ['enc.hostearly1','enc.hostearly2'])inject(g,[{t:'growth.noted',d:{fight,marks:{[sid]:{prof:2,patterns:['reach']}}}}]);
    const text='I practise Arcane Bolt for one hour.';
    await say(g,text,{type:'activity',kind:'train',what:'Arcane Bolt',minutes:60,until:null,learn:sid,teacher:null,tags:null,aspects:null,material:null,quote:text});
    const events=lastUser(g).events;assert.ok(events.some(e=>e.t==='skill.progress'&&e.d.to.prof===5));
    assert.ok(events.some(e=>e.t==='growth.evidence'&&e.d.evidence.kind==='evolution'));
    assert.ok(events.some(e=>e.t==='decision.opened'&&e.d.decision.kind==='skill'));
    assert.equal(events.some(e=>e.t==='skill.evolved'),false);
    const saved=JSON.parse(JSON.stringify(g.chat)),folded=foldChat(saved);assert.deepEqual(folded.errors,[]);assert.equal(folded.state.entities.pc.sheet.skills[sid].prof,5);
    saved.at(-1).mes='Different narration of the same already-booked practice.';
    assert.deepEqual(foldChat(saved).state.entities.pc.sheet.skills,folded.state.entities.pc.sheet.skills);
});

test('the fight that reaches P5 can use one earlier matching encounter immediately, without an extra fight', async()=>{
    const { endEncounterEvents } = await import('../../src/combat.js');
    const f=fixture.cases.find(c=>c.enc.id==='enc.t48'),s=structuredClone(f.before),enc=structuredClone(f.enc),id='rogue.piercing_thrust';
    s.entities.pc.sheet.skills[id]={prof:4,pp:49};enc.combatants.pc.fixed.actions[id].prof=4;
    growthOf(s).marks={};
    applyEvent(s,{t:'growth.noted',d:{fight:'enc.realearly',marks:{[id]:{prof:2,patterns:['closing']}}}});
    const r=endEncounterEvents(s,content,enc);
    assert.ok(r.events.some(e=>e.t==='skill.progress'&&e.d.skill===id&&e.d.to.prof===5));
    assert.ok(r.events.some(e=>e.t==='growth.evidence'&&e.d.evidence.kind==='evolution'&&e.d.evidence.fights.includes('enc.realearly')));
    assert.equal(r.events.some(e=>e.t==='skill.evolved'),false);
});
