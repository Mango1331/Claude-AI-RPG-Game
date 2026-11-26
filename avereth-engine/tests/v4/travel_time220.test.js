import test from 'node:test';
import assert from 'node:assert/strict';
import { campaign, inject, say, outcomeOf } from './patch8_lib.js';
import { loadProductContent } from '../helpers.js';
import { foldChat } from '../../src/host.js';
import { prepareGenerationAsync, runExtraction } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const who = 'npc.ossen', bridge = 'loc.alderwatch.stone_bridge', ferry = 'loc.alderwatch.west_ferry';
const delay = 'The flooded road blocked the crossing for two hours.';
const wait = 'I will wait here.';
const follow = 'I will follow you.';
const road = minutes => ({ type:'time', during:'travel', minutes });
const arrive = (at, group = []) => ({ type:'arrive', at, with:group, forced_by:null });
const event = evidence => ({ type:'time', during:'event', minutes:120, evidence });

async function journey({ mode, open = false, two = false, rest = false } = {}) {
    const rules = structuredClone(content);
    rules.rules.pulse.force = { open, kind:'danger', when:'Stone Bridge' };
    const g = await campaign(rules);
    const start = g.state().scene.at;
    const sheet = structuredClone(g.state().entities.pc.sheet);
    Object.assign(sheet.stats,{INT:30,WIL:4}); sheet.mp = 0;
    const place = (id,name) => ({ t:'place.created', d:{ place:{ id,name,kind:'site',parent:'realm.valedorn_crown' } } });
    inject(g,[place(bridge,'Stone Bridge'),place(ferry,'West Ferry'),{t:'entity.updated',d:{id:'pc',set:{sheet}}}]);
    if (mode) {
        const npcSheet = structuredClone(sheet);
        Object.assign(npcSheet.stats,{INT:10,WIL:0});
        inject(g,[{t:'entity.created',d:{entity:{id:who,name:'Ossen',kind:'npc',status:'alive',at:mode === 'wait' ? bridge : start,sheet:npcSheet}}},
            ...(mode === 'wait' ? [] : [{t:'scene.entered',d:{id:who,band:'SHORT'}}]),
            {t:'party.member',d:{who,mode,at:mode === 'wait' ? bridge : start,previous:0}}]);
    }
    const first = 'I walk to Stone Bridge', second = 'then I go on to West Ferry';
    const go = (to,quote) => ({type:'go',to,quote});
    const pause = 'I rest for an hour';
    const commands = [go(bridge,first)];
    if (two) commands.push(go(ferry,second));
    if (rest) commands.unshift({type:'activity',kind:'rest',what:null,minutes:60,until:null,quote:pause});
    await say(g,[...(rest ? [pause] : []),first,...(two ? [second] : [])].join(', '),...commands);
    assert.equal(outcomeOf(g).auth.gos.length,two ? 2 : 1);
    assert.equal(outcomeOf(g).auth.pulse.open,open);
    return g;
}
async function finish(g,deltas,{ two = false, prose = '', reached = true, rest = false } = {}) {
    const expected = {1:{arrived:reached,at:reached ? bridge : null,with:null}};
    if (two) expected[2] = {arrived:true,at:ferry,with:null};
    if (rest) { expected[2] = expected[1]; expected[1] = {done:true, minutes:60}; }
    const answer = {scene:'here',expected,deltas:deltas.map((d,i)=>({...d,seq:i+1}))};
    const { record,id } = await g.reply(prose || 'Alaric crossed the bridge and reached the ferry.',answer);
    assert.equal(record.extraction.status,'applied');
    const original = g.state();
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state,original);
    await runExtraction(g.chat,id,g.content,async()=>assert.fail('Applied extraction called twice'));
    assert.deepEqual(g.state(),original);
    return {clock:record.events.filter(e=>e.t==='time.advanced').map(e=>[e.d.minutes,e.d.why,e.d.travellers]),
        state:original,rejected:record.events.filter(e=>e.t==='delta.rejected').map(e=>e.d.rule)};
}

test('runtime: arrival, real PULSE delay and unsupported event time remain distinct', async () => {
    for (const [open,evidence,elapsed] of [[true,delay,120],[true,'The ferry stopped for hours.',0],[false,delay,0]]) {
        const g = await journey({open});
        const {clock,state,rejected} = await finish(g,[road(60),arrive(bridge),event(evidence)],{prose:'Alaric reached Stone Bridge. '+delay});
        assert.equal(state.scene.at,bridge);
        assert.deepEqual(clock,[[60,'travel',['pc']],...(elapsed ? [[120,'event',undefined]] : [])]);
        assert.equal(state.entities.pc.sheet.mp,12);
        assert.equal(rejected.includes('time_authority'),!elapsed);
    }
});

test('runtime: each reported leg recovers mana only for the companions who travelled it', async () => {
    for (const [mode,act,firstGroup,secondGroup,npcMP] of [
        ['follow','wait',[who],[],4], ['wait','follow',[],[who],4], ['follow',null,[who],[who],8],
    ]) {
        const g = await journey({mode,two:true});
        const quote = act === 'wait' ? wait : follow;
        const change = act ? [{type:'party',scene:bridge,who,act,quote}] : [];
        const {clock,state} = await finish(g,[road(60),arrive(bridge,firstGroup),...change,road(60),arrive(ferry,secondGroup)],{
            two:true,prose:'Alaric reached Stone Bridge. Ossen says, "'+quote+'" Alaric then reached West Ferry.',
        });
        assert.equal(state.scene.at,ferry);
        assert.equal(state.party.members[who].mode,act || mode);
        assert.deepEqual(clock,[[60,'travel',['pc',...firstGroup]],[60,'travel',['pc',...secondGroup]]]);
        assert.equal(state.entities.pc.sheet.mp,25);
        assert.equal(state.entities[who].sheet.mp,npcMP);
        assert.equal(state.scene.present.includes(who),secondGroup.includes(who));
    }
});

test('runtime: the travel floor covers just the unmeasured road, never the delay', async () => {
    for (const minutes of [0,30,60]) {
        const g = await journey({open:true});
        const {clock,state} = await finish(g,[...(minutes ? [road(minutes)] : []),arrive(bridge),event(delay)],{
            prose:'Alaric reached Stone Bridge. '+delay,
        });
        assert.equal(clock.filter(e=>e[1]==='travel').reduce((n,e)=>n+e[0],0),60);
        assert.equal(clock.filter(e=>e[1]==='event').reduce((n,e)=>n+e[0],0),120);
        assert.equal(state.entities.pc.sheet.mp,12);
    }
});

test('runtime: arrival cannot authorize another unexplained stay', async () => {
    for (const during of [null,'scene','event']) {
        const g = await journey();
        const {clock,rejected} = await finish(g,[road(60),arrive(bridge),{type:'time',minutes:120,during}]);
        assert.deepEqual(clock,[[60,'travel',['pc']]]);
        assert.ok(rejected.includes('time_authority'));
    }
});

test('runtime: PULSE stops the journey after the travelled portion', async () => {
    const g = await journey({open:true,mode:'follow'});
    const evidence = 'They walked along the road for half an hour';
    const {clock,state} = await finish(g,[{...road(30),evidence},event(delay)],{
        reached:false,prose:evidence+'. '+delay,
    });
    assert.notEqual(state.scene.at,bridge);
    assert.equal(state.entities.pc.sheet.mp,6);
    assert.equal(state.entities[who].sheet.mp,2);
    assert.deepEqual(clock,[[30,'travel',['pc',who]],[120,'event',undefined]]);
});

test('runtime: explicitly chosen rest and travel have separate clocks and recovery', async () => {
    const g = await journey({rest:true});
    const before = g.state();
    assert.equal(before.entities.pc.sheet.mp,38);
    const {clock,state} = await finish(g,[road(60),arrive(bridge),{type:'time',during:'scene',minutes:60}],{rest:true});
    assert.equal(state.clock.minute-before.clock.minute,60);
    assert.deepEqual(clock,[[60,'travel',['pc']]]);
    assert.equal(state.entities.pc.sheet.mp,50);
});

test('runtime: alternate replies and regeneration replace the elapsed road and event exactly once', async () => {
    const g = await journey({open:true,mode:'follow'});
    const origin = g.state();
    const prose = 'They reached Stone Bridge. '+delay;
    const run = async (minutes, blocked) => finish(g,[road(minutes),arrive(bridge,[who]),...(blocked ? [event(delay)] : [])],{prose});
    const first = await run(60,true);
    assert.equal(first.state.clock.minute-origin.clock.minute,180);
    for (const [type,minutes,blocked] of [['swipe',120,false],['regenerate',60,true]]) {
        g.chat.pop();
        await prepareGenerationAsync(g.chat,g.content,{type,settings:{planner:true},llm:async()=>assert.fail('Planner on a revised reply')});
        const {state} = await run(minutes,blocked);
        assert.equal(state.clock.minute-origin.clock.minute,blocked ? 180 : 120);
        assert.equal(state.entities.pc.sheet.mp,minutes===60 ? 12 : 25);
        assert.equal(state.entities[who].sheet.mp,minutes===60 ? 4 : 8);
    }
});
