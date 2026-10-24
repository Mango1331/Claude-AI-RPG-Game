import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { classFixture } from './patch9d_fixtures.js';
import { inject, say, lastUser } from './patch8_lib.js';
import { awardXp } from '../../src/progression.js';
import { classDrafts, classOffer } from '../../src/v4/class_growth.js';
import { foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
async function offered() {
    const g = await classFixture(content, {profile:'experienced'});
    inject(g, awardXp(g.state().entities.pc.sheet, 1, content, 'test final XP'));
    const options = classDrafts(g.state(),content).filter((d)=>['offense','defense'].includes(d.def.direction)).map((d)=>({...d.def,name:d.def.direction==='offense'?'Ironbound Fury':'Unbroken Bulwark'}));
    assert.equal(options.length,2);
    inject(g,[{t:'decision.opened',d:{decision:{id:'dec.class.e',kind:'class',rank:'E',at:null,options,evidence:{}}}}]);
    return g;
}

test('9D live: the original named class choice resolves both the fabricated child id and group id without a repair call',async()=>{
    for(const offer of ['dec.class.e.offense','dec.class.e']) {
        const g=await offered(),text='I choose Ironbound Fury as my class.';
        await say(g,text,{type:'development.accept',offer,replace:null,quote:text});
        assert.equal(g.state().entities.pc.sheet.evolution?.name,'Ironbound Fury');
        assert.equal(classOffer(g.state()),null);
        assert.equal(lastUser(g).plan.repaired,false);
        assert.deepEqual(foldChat(structuredClone(g.chat)).state,g.state());
        assert.deepEqual(validateState(g.state(),content),[]);
    }
});

test('9D live: questions, wishes, later plans, negated choices and unknown or ambiguous names never grant a class',async()=>{
    for(const text of ['Can I choose Ironbound Fury as my class?','I would like to choose Ironbound Fury as my class.','Tomorrow I will choose Ironbound Fury as my class.',"I do not choose Ironbound Fury as my class.",'I choose Unknown King as my class.','I choose Ironbound Fury King as my class.','I choose Ironbound Fury or Unbroken Bulwark as my class.']) {
        const g=await offered(),before=structuredClone(classOffer(g.state()));
        await say(g,text,{type:'development.accept',offer:'dec.class.e',replace:null,quote:text});
        assert.equal(g.state().entities.pc.sheet.evolution,undefined,text);
        assert.deepEqual(classOffer(g.state()),before,text);
    }
});
