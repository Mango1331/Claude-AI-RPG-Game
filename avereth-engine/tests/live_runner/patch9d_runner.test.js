import { roleOf } from '../../tools/st_live/live/calls.mjs';
import { classForgeRequest } from '../../src/v4/forge.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeClassFixture } from '../../tools/st_live/live/class_fixture.mjs';
import { options } from '../../tools/st_live/live/run_live.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { evaluate, finished } from '../../tools/st_live/live/evaluator.mjs';
import { foldChat } from '../../src/host.js';
import { loadProductContent } from '../helpers.js';
import { classFixture } from '../v4/patch9d_fixtures.js';
import { say, inject } from '../v4/patch8_lib.js';
import { awardXp } from '../../src/progression.js';
import { classOptions } from '../../src/v4/class_growth.js';
import { scaleCreature } from '../../src/npcgen.js';

test('9D runner fixture is explicitly selected, deterministic, Level 14, labelled synthetic and never already evolved',async()=>{
    assert.equal(roleOf({messages:classForgeRequest([]),max_tokens:1500}),'forge');
    assert.equal(options(['--config','missing','--fixture','9d-rare'],{}).fixture,'9d-rare');
    assert.throws(()=>options(['--config','missing','--fixture','anything'],{}),/Unknown fixture/);
    const a=await makeClassFixture('9d-rare',19,'Fixture Narrator'),b=await makeClassFixture('9d-rare',19,'Fixture Narrator');
    assert.deepEqual(a,b);const s=foldChat(a).state;
    assert.equal(s.entities.pc.sheet.level,14);assert.equal(s.entities.pc.sheet.evolution,undefined);
    assert.ok(a.some(m=>(m.extra?.avereth?.events||[]).some(e=>e.t==='note'&&e.d.synthetic_history)));
    assert.ok(a.filter(m=>!m.is_user).every(m=>m.name==='Fixture Narrator'));
});

test('9D live evaluator requires accepted class, BOTH answered panels and a later combat snapshot/use; prose does not finish it',async()=>{
    const c=await loadProductContent(),g=await classFixture(c,{profile:'experienced'}),guide=loadGuide('current_test');
    inject(g,awardXp(g.state().entities.pc.sheet,1,c,'fixture final XP'));
    await say(g,'*I rest for ten minutes*',{type:'activity',kind:'rest',what:null,minutes:10,until:null,quote:'I rest for ten minutes'});
    assert.equal(finished(evaluate(g.chat,{guide})),false);
    await g.reply('He rests.',{expected:{},deltas:[]});
    const option=classOptions(g.state()).find(o=>o.direction==='offense');
    await say(g,'I choose this class.',{type:'development.accept',offer:option.id,replace:null,quote:'I choose this class'});
    await g.reply('The class settles.',{expected:{},deltas:[]});
    assert.equal(finished(evaluate(g.chat,{guide})),false);
    await say(g,'#class');assert.equal(evaluate(g.chat,{guide}).reached.class_verified,undefined);
    await say(g,'#feats');assert.ok(evaluate(g.chat,{guide}).reached.class_verified);
    assert.equal(finished(evaluate(g.chat,{guide})),false);
    const p=scaleCreature(c.anchors.get('wolf'),1,'normal',c);
    inject(g,[{t:'entity.created',d:{entity:{id:'mon.fixture',kind:'creature',anchor:'wolf',species:'wolf',profile:{...p,hp:250,max_hp:250},status:'alive',location:g.state().scene.location}}},{t:'scene.entered',d:{id:'mon.fixture',band:'ENGAGED',cover:'none'}},{t:'scene.awareness',d:{id:'mon.fixture',level:'aware'}}]);
    await say(g,'*I heavy slash it*',{type:'use_skill',skill:'warrior.heavy_slash',target:'mon.fixture',quote:'I heavy slash it'});
    assert.equal(finished(evaluate(g.chat,{guide})),true);
    assert.equal(evaluate(g.chat,{guide}).reached.class_trait_used.name,option.name);
});
