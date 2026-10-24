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
import { buildReport } from '../../tools/st_live/live/report.mjs';

test('9D runner fixture is explicitly selected, deterministic, Level 14, labelled synthetic and never already evolved',async()=>{
    assert.equal(roleOf({messages:classForgeRequest([]),max_tokens:1500}),'forge');
    assert.equal(options(['--config','missing','--fixture','9d-rare'],{}).fixture,'9d-rare');
    assert.throws(()=>options(['--config','missing','--fixture','anything'],{}),/Unknown fixture/);
    const a=await makeClassFixture('9d-rare',19,'Fixture Narrator'),b=await makeClassFixture('9d-rare',19,'Fixture Narrator');
    assert.deepEqual(a,b);const s=foldChat(a).state;
    assert.equal(s.entities.pc.sheet.level,14);assert.equal(s.entities.pc.sheet.evolution,undefined);
    assert.equal(s.entities.pc.sheet.free_points,0,'old fixture levels are already assigned; the actual Level 15 still grants new points');
    assert.ok(a.some(m=>(m.extra?.avereth?.events||[]).some(e=>e.t==='note'&&e.d.synthetic_history)));
    assert.ok(a.filter(m=>!m.is_user).every(m=>m.name==='Fixture Narrator'));
});

test('9D review: the report summary labels the synthetic fixture, seed and actual reload result; ordinary runs have no fixture label',()=>{
    const guide=loadGuide('patch9d_fixture');
    const base={runId:'fixture-test',stub:false,guide,player:{type:'scripted',steps:0},end:{kind:'limit'},ev:evaluate([],{guide}),calls:[],
        setup:{card:'test',world:'test'},imp:{preset:{name:'test',unsaved:[],vsRepo:[]},generation:{},dropped:[],warnings:[],read:[]},
        git:null,build:'test',st:{version:'1.19',dir:'/test',port:8123},browser:{name:'test',version:'test'},
        turnsLog:[],playerLog:[],driverNotes:[],toasts:[],pageErrors:[],serverErrors:[],files:[],startedAt:0,endedAt:0,
        protection:{unchanged:true,changedRead:[],files:0,tree:{same:true}},scan:{files:0,hits:[]}};
    const text=buildReport({...base,fixture:'9d-rare',seed:7,fixtureReload:true});
    assert.match(text.split('## Etappen')[0],/FIXTURE.*9d-rare.*Seed 7.*Level 14.*synthetisch/);
    assert.match(text,/Reload.*bestanden/);
    assert.match(buildReport({...base,fixture:'9d-rare',seed:7,fixtureReload:null}),/Reload.*nicht durchgeführt/);
    assert.doesNotMatch(buildReport(base),/FIXTURE/);
    const diagnostic=buildReport({...base,turnsLog:[{turn:1,ms:2000,decideMs:1000,ok:true,text:'#status'},{turn:2,ms:3000,decideMs:1500,ok:true,text:'#feats'},{turn:17,ms:251860,decideMs:92726,ok:true,text:'I choose this class.'}]});
    assert.match(diagnostic,/Auffällige Einzelzeiten/);
    assert.match(diagnostic,/\| Spieler \| 17 \|/);assert.match(diagnostic,/\| Spiel \| 17 \|/);
});

test('9D live evaluator requires accepted class, BOTH answered panels and a later combat snapshot/use; prose does not finish it',async()=>{
    const c=await loadProductContent(),g=await classFixture(c,{profile:'experienced'}),guide=loadGuide('patch9d_fixture');
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
