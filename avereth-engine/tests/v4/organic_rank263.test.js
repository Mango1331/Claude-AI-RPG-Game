import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProductContent} from '../helpers.js';
import {character} from '../../tools/sim/combat.mjs';
import {applyEvent} from '../../src/state.js';
import {skillOf} from '../../src/content.js';
import {defineSkill, learnSkill, skillDefErrors} from '../../src/skills.js';
import {composeSkill,developSkill} from '../../src/skill_composer.js';
import {skillEvidence,skillDrafts,offerSkills,acceptSkill} from '../../src/v4/skill_growth.js';
import {stoneActivation,learningActivity,knownTechnique,trainingOfferWhy,openGoals} from '../../src/v4/growth.js';
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

test('a Proven student keeps the actual source and rank across days; payments and substitutions require qualified teachers',()=>{
    const s=mage(20), id='npc.instructor', sh=mage(18).entities.pc.sheet;
    sh.training='trained';
    const request={fn:'bolt',tags:null,aspects:['Ice'],rank:'E',origin:{kind:'stone'}};
    const {def}=composeSkill(s,content,request);
    const object=defineSkill(s,content,def);assert.deepEqual(object.errors,[]);book(s,object.events);
    s.entities[id]={id,kind:'npc',name:'Instructor',status:'alive',at:s.scene.at,sheet:sh};
    s.scene.present.push(id);
    s.services=[{service:'training',by:id,turn:1,minute:0}];
    const line={kind:'service',service:'training',what:'E-Rank bolt lesson'};
    assert.ok(trainingOfferWhy(s,content,id,line));
    const train={kind:'train',learn:'bolt',learn_rank:'E',teacher:id,tags:def.tags,aspects:def.aspects};
    assert.equal(learningActivity(s,content,train,60,0).status,'refused');
    sh.skills[def.id]={prof:1,pp:0};
    assert.equal(trainingOfferWhy(s,content,id,line),null);
    const first=learningActivity(s,content,train,60,0);assert.equal(first.status,'resolved',first.line);book(s,first.events);
    const saved=JSON.parse(JSON.stringify(s)), goal=openGoals(saved)[0];
    assert.equal(goal.target.rank,'E');assert.equal(goal.source.who,id);
    delete saved.entities[id].sheet.skills[def.id];
    assert.equal(learningActivity(saved,content,{kind:'train',learn:goal.id,teacher:id},60,1440).status,'refused');
    assert.equal(openGoals(saved)[0].target.rank,'E');
});
