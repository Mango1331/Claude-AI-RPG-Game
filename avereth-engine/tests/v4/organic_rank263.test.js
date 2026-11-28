import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductContent} from '../helpers.js';
import {character} from '../../tools/sim/combat.mjs';
import {applyEvent} from '../../src/state.js';
import {skillOf} from '../../src/content.js';
import {defineSkill, learnSkill, skillDefErrors} from '../../src/skills.js';
import {composeSkill,developSkill} from '../../src/skill_composer.js';
import {skillEvidence,skillDrafts,offerSkills,acceptSkill} from '../../src/v4/skill_growth.js';
import {stoneActivation,learningActivity,knownTechnique} from '../../src/v4/growth.js';
import {itemTraits} from '../../src/v4/items.js';

const content = await loadProductContent();
const mage = level => character(content,{class:'mage',skills:['mage.arcane_bolt','mage.arcane_ward'],level});
const book = (s,events) => events.forEach(e=>applyEvent(s,e));
const source = (rank,kind) => {
    const name = rank+'-Rank '+(kind==='stone'?'Skill Stone':'Manual');
    return {id:'obj.'+rank+kind,name,holder:{entity:'pc'},qty:1,...itemTraits(content,{name,kind:'item',teaches:{source:kind,fn:'bolt',aspects:['Fire']}},0)};
};

test('source rank controls eligibility and separates equivalent F and E techniques',()=>{
    const s=mage(14), stone=source('E','stone'), older=source('F','stone');
    assert.ok(stoneActivation(s,content,stone).refuse);
    const veteran=mage(15);
    for(const item of [older,stone]){
        const {target,refuse}=stoneActivation(veteran,content,item);
        assert.equal(refuse,undefined);
        const {def}=composeSkill(veteran,content,{...target,origin:{kind:'stone'}});
        const result=defineSkill(veteran,content,def);
        assert.deepEqual(result.errors,[]);
        book(veteran,result.events);
        book(veteran,learnSkill(veteran,content,'pc',def.id).events);
        assert.ok(knownTechnique(veteran,target,content));
        assert.ok(stoneActivation(veteran,content,item).refuse);
    }
    const f=source('F','manual');
    veteran.objects[f.id]=f;
    assert.equal(learningActivity(veteran,content,{kind:'study',learn:'bolt',material:f.id,learn_rank:'E'},60,0).reason,'source rank');
});

for(const complexity of [1,2,3]) test('rank evolution from C'+complexity+' requires earned evidence, acceptance and preserves mastery on reload',()=>{
    const s=mage(20);
    let base=content.skills.get('mage.arcane_bolt');
    for (const step of ['reach','cover'].slice(0,complexity-1)){
        const {def,errors}=developSkill(s,content,base,step,{origin:{kind:'evolution',note:'test history'}});
        assert.deepEqual(errors,[]);
        book(s,defineSkill(s,content,def).events);
        book(s,learnSkill(s,content,'pc',def.id).events);
        base=skillOf(content,def.id,s);
    }
    assert.equal(base.complexity || 1,complexity);
    const id=base.id;
    book(s,[{t:'skill.progress',d:{id:'pc',skill:id,to:{prof:5,pp:0}}}]);
    assert.deepEqual(skillEvidence(s,content),[]);
    for(const fight of ['first','second']){
        book(s,[{t:'growth.noted',d:{fight,marks:{[id]:{prof:5,patterns:[]}}}}]);
        if(fight==='first') assert.deepEqual(skillEvidence(s,content),[]);
    }
    const ev=skillEvidence(s,content);
    assert.equal(ev[0]?.d.evidence.step,'rank');
    book(s,ev);
    const result=offerSkills(s,content,skillDrafts(s,content));
    book(s,result.events);
    const view=JSON.parse(JSON.stringify(s));
    const offer=view.decisions.find(d=>d.kind==='skill');
    assert.ok(offer);
    assert.equal(view.entities.pc.sheet.skills[offer.skill.id],undefined);
    assert.equal(offer.skill.rank,'E');assert.equal(offer.skill.complexity,complexity);
    assert.deepEqual(skillDefErrors(offer.skill,content),[]);
    const accept=acceptSkill(view,content,offer.id);
    assert.ok(accept.events,accept.refuse);
    book(view,accept.events);
    assert.equal(view.entities.pc.sheet.skills[id],undefined);
    assert.deepEqual(view.entities.pc.sheet.skills[offer.skill.id],{prof:5,pp:0});
    assert.ok(acceptSkill(view,content,offer.id).refuse);
    assert.deepEqual(skillEvidence(view,content),[]);
});
