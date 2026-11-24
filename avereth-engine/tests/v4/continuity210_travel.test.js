import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {foldChat, rec} from '../../src/host.js';
import {prepareGenerationAsync, processReplyAny, runExtraction} from '../../src/v4/runtime.js';

const content = await loadProductContent();
const cases = JSON.parse(gunzipSync(fs.readFileSync(new URL('./fixtures/continuity210_travel_prefixes.json.gz', import.meta.url))));
const go = (seq, to, quote, needs) => ({seq, type:'go', to, quote, ...(needs ? {needs} : {})});
const cottage = {new:{name:'the chapel cottage', kind:'site', parent:'loc.old_crown_road_near_the_ruined_chapel'}};
const road = 'loc.the_water_meadows';
const arrival = (at, party) => ({seq:1, type:'arrive', at, with:party, forced_by:null});
const progress = (arrived, at, party) => ({arrived, at, with:party, met:null});

// The planner proposals and matching narrator/extractor replies below are controlled mocks.
// The three incoming messages, active preceding replies, and folded states come from the original chats.
async function play(c, commands, prose, report, input = c.input) {
    const chat = structuredClone(c.chat), origin = foldChat(chat).state.scene.at;
    chat.push({is_user:true, is_system:false, mes:input, extra:{}});
    const requests = [];
    const plan = await prepareGenerationAsync(chat, content, {type:'normal', llm:async request => {
        requests.push(request);
        assert.equal(request.purpose,'plan');
        return JSON.stringify({commands});
    }});
    assert.equal(plan.action, 'context');
    const planner = requests[0].messages;
    assert.match(planner[0].content,/Does Alaric choose to set out this turn\?/);
    assert.ok(planner.at(-1).content.endsWith(input));
    const player = rec(chat.at(-1));
    const outcome = player.events.find(e => e.t === 'outcome.recorded').d.outcome;
    const j = chat.length;
    chat.push({is_user:false, is_system:false, mes:prose, extra:{}});
    assert.ok(processReplyAny(chat,j,content).extract);
    await runExtraction(chat,j,content,async request => {
        requests.push(request);
        assert.equal(request.purpose,'extract');
        return JSON.stringify(report);
    });
    assert.deepEqual(requests.map(x=>x.purpose), ['plan','extract']);
    const reply = rec(chat[j]);
    assert.equal(reply.extraction.status,'applied');
    const stored = foldChat(JSON.parse(JSON.stringify(chat)));
    assert.deepEqual(stored.failures,[]);
    return {origin, state:stored.state, player, reply, outcome, context:planner.at(-1).content};
}

test('Bren T9: explicit shared leg can end at the nearby cottage, without entering the dungeon',async()=>{
    const party = ['npc.bren','mon.crebren_dog'];
    const p = [go(1,{new:'the chapel cottage'},'lets go ill help you out for the part')];
    const x = {scene:cottage, expected:{1:progress(true,cottage,party)}, deltas:[arrival(cottage,party)]};
    const r = await play(cases.Bren,p,'Supporting Bren, Alaric walks with him to the chapel cottage. The dog follows them. They stop outside.',x);
    assert.deepEqual(cases.Bren.historical_plan,[]);
    assert.match(r.context,/My girl.s at the chapel cottage/i);
    assert.equal(r.state.places[r.state.scene.at].name,'the chapel cottage');
    assert.ok(r.state.scene.present.includes('npc.bren'));
    assert.ok(!r.reply.rejected?.length);
    assert.ok(r.outcome.auth.go);
});

test('Tam B15: first wait and work, then start the agreed journey; the toll stop is not the town',async()=>{
    const p = [...cases.Tam.historical_plan,go(3,'loc.ashbridge','take my share of the hauling down to Ashbridge',2)];
    const expected = {1:{minutes:30,done:true},2:{minutes:60,done:false},3:progress(false,road,null)};
    const x = {scene:road, expected, deltas:[arrival(road,null)]};
    const r = await play(cases.Tam,p,'After the loading bell Alaric carries his share toward Ashbridge with Tam. At the water meadows a toll collector stops the cart.',x);
    assert.match(r.context,/sitting in the yard waiting/);
    assert.equal(r.outcome.auth.gos[0].to,'loc.ashbridge');
    assert.equal(r.state.scene.at,road);
    assert.ok(!r.reply.rejected?.some(d=>d.type==='arrive'));
});

test('Wren C9: agreeing to a later errand preserves present meals and the current scene',async()=>{
    const p = cases.Wren.historical_plan.filter(x=>x.type!=='go');
    const r = await play(cases.Wren,p,'Alaric finishes the bread. Marta explains the crossing from her seat across the table.',{scene:'here', expected:{}, deltas:[]});
    assert.deepEqual(p.map(x=>x.type),['use','use']);
    assert.ok(!r.outcome.auth.go);
    assert.equal(r.state.scene.at,r.origin);
    assert.ok(!r.reply.rejected?.length);
});

test('an invitation, a question, a deferral or a refusal supplies no travel permission', async()=>{
    for (const input of ['He can tell me about the cottage.', 'Where is the cottage?', "I will help tomorrow. For now I stay here.", 'I decline and stay with the cart.']) {
        const x = {scene:cottage, expected:{}, deltas:[arrival(cottage,['npc.bren'])]};
        const r = await play(cases.Bren,[],'Alaric and Bren arrive at the cottage.',x,input);
        assert.ok(r.reply.rejected.some(d=>d.type==='arrive' && d.rule==='no_go'));
        assert.equal(r.state.scene.at,r.origin);
    }
});
