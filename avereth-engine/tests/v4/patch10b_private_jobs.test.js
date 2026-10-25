import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign, inject, say } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { foldChat } from '../../src/host.js';
import { scaleCreature } from '../../src/npcgen.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const base = (await campaign(content, { legacyPrivateQuests: true })).state();
const JOB = 'quest.cart';
const close = { seq: 3, type: 'quest.close', quest: JOB, status: 'completed', by: 'npc.farmer' };
const pay = { seq: 4, type: 'coin.gift', from: 'npc.farmer', cp: 3, said: 'three copper', why: 'promised wages for the cart job', job: JOB };
function scene() {
    const s = structuredClone(base);
    s.places.yard = { id: 'yard', name: 'Terrace yard', kind: 'site', parent: s.scene.location };
    s.places.market = { id: 'market', name: 'Market square', kind: 'site', parent: s.scene.location };
    s.scene.at = 'yard'; s.scene.present = ['pc', 'npc.farmer'];
    s.entities['npc.farmer'] = { id: 'npc.farmer', kind: 'npc', name: 'Farmer', descriptors: ['farmer'], status: 'alive', at: 'yard', location: s.scene.location };
    s.quests[JOB] = { id: JOB, title: 'Push the cart to market', kind: 'private', giver: 'npc.farmer', status: 'offered', payout_cp: 3, objectives: [{ id: 'o1', what: 'Free the cart and push it to the market', status: 'open' }], history: [], notes: [], progress: [] };
    return s;
}
function run(s, commands, input) {
    s.turn++; const events = [];
    const o = resolveCommands(s, content, commands, e => { events.push(e); applyEvent(s, e); }, { c: true, msg: 500 });
    s.last = { ...s.last, input, outcome: { ...o, c: true }, rejected: [] };
    return events;
}
const accept = { seq: 1, type: 'quest.accept', quest: JOB, quote: 'I accept the cart job.' };
const go = { seq: 2, type: 'go', to: 'market', job: JOB, quote: 'I push the cart to the market.' };
const arrival = { seq: 1, type: 'arrive', at: 'market', with: ['npc.farmer'], forced_by: null };
const arrived = { 2: { arrived: true, at: 'market', with: ['npc.farmer'] } };
const world = (s, deltas, expected = {}, prose = 'The farmer confirms the cart arrived and hands him three copper.') => applyWorld(s, content, { expected, deltas }, { msg: 501, prose });

test('PJ1: acceptance alone cannot perform the Run-10 journey, finish the job or earn wages', () => {
    const s = scene(), money = s.entities.pc.sheet.coin_cp, minute = s.clock.minute;
    run(s, [accept], accept.quote);
    const r = world(s, [arrival, { seq: 2, type: 'time', minutes: 45 }, close, pay]);
    assert.equal(r.state.scene.at, 'yard'); assert.equal(r.state.quests[JOB].status, 'active');
    assert.equal(r.state.entities.pc.sheet.coin_cp, money); assert.equal(r.state.clock.minute, minute);
    assert.ok(r.rejected.some(x => x.rule === 'no_go'));
});
for (const paymentFirst of [false, true]) test(`PJ2: one natural accept-and-push input pays once, paymentFirst=${paymentFirst}`, () => {
    const s = scene(), money = s.entities.pc.sheet.coin_cp;
    run(s, [accept, go], `${accept.quote} ${go.quote}`);
    const r = world(s, [arrival, ...(paymentFirst ? [{ ...pay, seq: 2 }, close] : [close, pay])], arrived);
    assert.equal(r.state.scene.at, 'market'); assert.equal(r.state.quests[JOB].status, 'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp, money + 3);
    assert.equal(r.state.quests[JOB].payment.cp, 3);
    const replay = structuredClone(s); for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
    const loaded = JSON.parse(JSON.stringify(r.state));
    run(loaded, [], 'I ask whether the account is settled.');
    const again = world(loaded, [close, pay]);
    assert.equal(again.state.entities.pc.sheet.coin_cp, money + 3);
});
test('PJ3: unrelated travel or an uncompleted journey proves no cart work', () => {
    for (const related of [false, true]) {
        const s = scene(); run(s, [accept], accept.quote);
        const action = related ? go : { ...go, job: null, quote: 'I walk to the market to shop.' };
        run(s, [action], action.quote);
        const r = world(s, [...(!related ? [arrival] : []), close, pay], related ? { 2: { arrived: false, at: null, with: null } } : arrived);
        assert.equal(r.state.quests[JOB].status, 'active'); assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
    }
});
test('PJ4: actual work survives a later turn; completion and payment may happen separately', () => {
    const s = scene(); run(s, [accept, go], `${accept.quote} ${go.quote}`);
    const moved = world(s, [arrival], arrived).state;
    run(moved, [], 'I ask the farmer to check the cart.');
    const completed = world(moved, [close]).state;
    assert.equal(completed.quests[JOB].status, 'completed'); assert.equal(completed.quests[JOB].payment, undefined);
    run(completed, [], 'I ask for my agreed wages.');
    const paid = world(completed, [pay]);
    assert.equal(paid.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 3);
});
test('PJ5: same giver and same amount can still be a genuine independent gift', () => {
    const s = scene(); run(s, [accept], accept.quote);
    const gift = { ...pay, job: null, why: 'a birthday gift unrelated to any work' };
    const r = world(s, [gift], {}, 'The farmer gives Alaric three copper as a birthday present, independent of the cart job.');
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 3);
    assert.equal(r.state.quests[JOB].status, 'active');
});
for (const type of ['other', 'activity', 'information']) test(`PJ6: local ${type} work may complete without GO or a separate acceptance phrase`, () => {
    const s = scene(); s.quests[JOB].title = 'Mend the harness'; s.quests[JOB].objectives[0].what = 'Mend the harness here';
    if (type === 'information') { s.quests[JOB].title = 'Locate the cart'; s.quests[JOB].objectives[0].what = 'Report where the missing cart is'; }
    const action = type === 'information' ? { seq: 1, type: 'other', what: 'report the missing cart location', quote: 'I tell the farmer the missing cart is behind the mill.', job: JOB }
        : type === 'other' ? { seq: 1, type, what: 'mend the harness', quote: 'I mend the harness.', job: JOB }
        : { seq: 1, type, kind: 'work', what: 'mending the harness', minutes: 30, until: null, quote: 'I work on mending the harness for half an hour.', job: JOB };
    run(s, [action], action.quote);
    const r = world(s, [close, pay], {}, 'The farmer inspects the mended harness and pays three copper.');
    assert.equal(r.state.quests[JOB].status, 'completed'); assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 3);
});
test('PJ7: progress text and a giver claim alone are not work; unlabelled explicit wages cannot bypass the gate', () => {
    const s = scene(); run(s, [accept], accept.quote);
    const r = world(s, [{ seq: 1, type: 'quest.progress', quest: JOB, objective: 'cart delivered', status: 'done' }, close, { ...pay, job: undefined }]);
    assert.equal(r.state.quests[JOB].status, 'active'); assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
});
test('PJ8: planner product path retains a private job on the explicitly chosen journey', async () => {
    const g = await campaign(content, { legacyPrivateQuests: true }), s = scene();
    inject(g, [{ t: 'quest.created', d: { quest: s.quests[JOB] } }, { t: 'place.created', d: { place: s.places.market } }]);
    await say(g, go.quote, go);
    const r = await g.reply('Alaric pushes the cart to Market square.', { expected: arrived, deltas: [] });
    assert.equal(g.state().quests[JOB].work?.type, 'go');
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
});

test('PJ9: original Run-10 acceptance and extractor answer cannot book the invented work', () => {
    const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run10_private_cart.json', import.meta.url)));
    const s = scene(); s.places = f.places; s.scene = f.scene;
    s.entities[f.giver.id] = f.giver; s.quests = { [f.quest.id]: f.quest };
    s.last = { ...s.last, input: f.input, outcome: f.outcome };
    const money = s.entities.pc.sheet.coin_cp, minute = s.clock.minute;
    // Replay the four original mechanical claims; unrelated family facts/people
    // need the rest of the historical world and are outside this job regression.
    const answer = { ...f.answer, deltas: f.answer.deltas.filter(d => ['arrive', 'time', 'quest.close', 'coin.gift'].includes(d.type)) };
    const r = applyWorld(s, content, answer, { msg: f.reply, prose: f.prose });
    assert.equal(r.state.scene.at, f.scene.at);
    assert.equal(r.state.quests[f.quest.id].status, 'active');
    assert.equal(r.state.clock.minute, minute);
    assert.equal(r.state.entities.pc.sheet.coin_cp, money);
    assert.ok(r.rejected.some(x => x.rule === 'private_work'));
    assert.ok(r.rejected.some(x => x.rule === 'private_payment'));
});
test('PJ10: unpriced bread money works, while a different fixed reward does not', () => {
    for (const price of [null, 4]) {
        const s = scene(); s.quests[JOB].payout_cp = price;
        run(s, [accept, go], `${accept.quote} ${go.quote}`);
        const r = world(s, [arrival, close, pay], arrived);
        assert.equal(r.state.quests[JOB].status, 'completed');
        assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + (price === null ? 3 : 0));
    }
});
test('PJ11: an unrelated payment from the same giver and a later genuine tip remain possible', () => {
    const s = scene(); run(s, [accept], accept.quote);
    const r = world(s, [{ ...pay, job: null, why: 'payment for useful road news' }], {}, 'The farmer pays him three copper for useful road news, unrelated to the cart.');
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 3);
    assert.equal(r.state.quests[JOB].payment, undefined);
    run(r.state, [go], go.quote);
    const paid = world(r.state, [arrival, close, pay], arrived).state;
    run(paid, [], 'I thank the farmer.');
    const repeated = world(paid, [{ ...pay, job: null, why: 'wages' }]);
    assert.equal(repeated.state.entities.pc.sheet.coin_cp, paid.entities.pc.sheet.coin_cp);
    const tip = world(paid, [{ ...pay, job: null, why: 'a separate tip' }], {}, 'The farmer gives him three copper as a separate tip.');
    assert.equal(tip.state.entities.pc.sheet.coin_cp, paid.entities.pc.sheet.coin_cp + 3);
});
test('PJ12: ambiguous wages, a wrong giver and unknown job cannot pay', () => {
    for (const mode of ['ambiguous', 'giver', 'unknown']) {
        const s = scene(); run(s, [accept, go], `${accept.quote} ${go.quote}`);
        const done = world(s, [arrival, close], arrived).state;
        let wage = { ...pay };
        if (mode === 'ambiguous') {
            done.quests['quest.second'] = { ...structuredClone(done.quests[JOB]), id: 'quest.second', title: 'Another job' };
            wage = { ...pay, job: null };
        } else if (mode === 'giver') {
            done.entities['npc.other'] = { ...done.entities['npc.farmer'], id: 'npc.other', name: 'Other farmer' };
            done.scene.present.push('npc.other'); wage.from = 'npc.other';
        } else wage.job = 'quest.missing';
        run(done, [], 'I ask for the payment.');
        const r = world(done, [...(mode === 'ambiguous' ? [close, { ...close, quest: 'quest.second', seq: 2 }] : []), wage]);
        assert.equal(r.state.entities.pc.sheet.coin_cp, done.entities.pc.sheet.coin_cp);
        assert.equal(r.state.quests[JOB].payment, undefined);
    }
});
test('PJ13: undurated local work uses actual story time; no work time means no proof', () => {
    for (const minutes of [0, 20]) {
        const s = scene(); const a = { seq: 1, type: 'activity', kind: 'work', what: 'repair the harness', minutes: null, until: null, quote: 'I repair the harness.', job: JOB };
        run(s, [a], a.quote);
        const r = world(s, [...(minutes ? [{ seq: 1, type: 'time', minutes }] : []), close, pay], { 1: { done: minutes > 0, minutes } });
        assert.equal(r.state.quests[JOB].status, minutes ? 'completed' : 'offered');
    }
});
test('PJ14: a failed feature check is not work success; a mundane attempt needs no fictitious check', () => {
    for (const feature of [null, 'feature.harness']) {
        const s = scene();
        s.features['feature.harness'] = { id: 'feature.harness', name: 'Tangled harness', kind: 'obstacle', status: 'active', at: s.scene.at, hidden: false, difficulty: 'impossible', history: [] };
        s.last.check = { seq: 1, success: true }; // stale previous roll must not rescue failure
        const a = { seq: 1, type: 'attempt', feature, aim: 'disable', approach: 'untangle the harness', stat: 'INT', tool: null, possible: true, quote: 'I untangle the harness.', job: JOB };
        run(s, [a], a.quote); const r = world(s, [close, pay]);
        assert.equal(r.state.quests[JOB].status, feature ? 'offered' : 'completed');
    }
});
test('PJ15: Legacy keeps its existing semantic private-job completion', () => {
    const s = scene(); s.meta.ruleset = 1; run(s, [accept], accept.quote);
    const r = world(s, [close, { ...pay, job: undefined }]);
    assert.equal(r.state.quests[JOB].status, 'completed');
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 3);
    assert.equal(r.state.quests[JOB].work, undefined);
});
test('PJ16: a real chosen combat skill counts, a second unexecuted job skill does not', async () => {
    for (const actual of [true, false]) {
        const g = await campaign(content, { legacyPrivateQuests: true }), s = g.state();
        const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
        inject(g, [
            { t: 'quest.created', d: { quest: scene().quests[JOB] } },
            { t: 'entity.created', d: { entity: { id: 'wolf', kind: 'creature', species: 'wolf', anchor: 'wolf', status: 'alive', location: s.scene.location, profile: p } } },
            { t: 'scene.entered', d: { id: 'wolf', band: 'SHORT', cover: 'none' } },
            { t: 'scene.awareness', d: { id: 'wolf', level: 'aware' } },
        ]);
        const a = { type: 'use_skill', skill: 'mage.flame_lance', target: 'wolf', quote: 'I cast Flame Lance on the wolf.', ...(actual ? { job: JOB } : {}) };
        await say(g, a.quote + (actual ? '' : ' Then I cast it again for the job.'), a,
            ...(!actual ? [{ ...a, seq: 2, job: JOB, quote: 'Then I cast it again for the job.' }] : []));
        await g.reply('The cast resolves.', { expected: {}, deltas: [] });
        assert.equal(!!g.state().quests[JOB].work, actual);
        assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
    }
});
test('PJ17: GO and conditional GIVE finish a private errand only after the real handover', () => {
    for (const handover of [false, true]) {
        const s = scene(); s.scene.present = ['pc'];
        s.entities['npc.farmer'].at = 'market';
        s.objects.parcel = { id: 'parcel', name: 'Harness parcel', kind: 'item', qty: 1, holder: { entity: 'pc' }, marks: [], for_quests: [] };
        const walk = { ...go, seq: 1, job: undefined };
        const give = { seq: 2, type: 'give', object: 'parcel', qty: 1, to: 'npc.farmer', quote: 'I hand the harness parcel to the farmer.', job: JOB };
        run(s, [walk, give], `${walk.quote} ${give.quote}`);
        const r = world(s, [{ ...arrival, with: [] }, { seq: 2, type: 'enter', who: 'npc.farmer', band: 'SHORT' }, ...(handover ? [{ seq: 3, type: 'object.move', object: 'parcel', to: 'npc.farmer', qty: 1 }] : []), { ...close, seq: 4 }, { ...pay, seq: 5 }],
            { 1: { arrived: true, at: 'market', with: [] } });
        assert.equal(r.state.quests[JOB].status, handover ? 'completed' : 'offered', JSON.stringify({rejected:r.rejected,resolutions:s.last.outcome.resolutions,events:r.events.filter(e=>e.t.startsWith('cmd.'))}));
        assert.equal(r.state.objects.parcel.holder.entity, handover ? 'npc.farmer' : 'pc');
    }
});
test('PJ18: extraction rerun and switching paid swipes retain exactly one job payout', async () => {
    const g = await campaign(content, { legacyPrivateQuests: true }), before = g.state();
    const farmer = { ...scene().entities['npc.farmer'], at: before.scene.at, location: before.scene.location };
    inject(g, [{ t: 'entity.created', d: { entity: farmer } }, { t: 'scene.entered', d: { id: farmer.id, band: 'SHORT', cover: 'none' } },
        { t: 'quest.created', d: { quest: scene().quests[JOB] } }]);
    const a = { type: 'other', what: 'repair the harness', quote: 'I repair the harness.', job: JOB };
    await say(g, a.quote, a);
    const first = await g.reply('The farmer checks the repaired harness and pays three copper.', { expected: {}, deltas: [close, pay] });
    const original = structuredClone(g.chat[first.id]);
    assert.equal(g.state().entities.pc.sheet.coin_cp, before.entities.pc.sheet.coin_cp + 3);
    assert.equal((await runExtraction(g.chat, first.id, content, g.llm)).changed, false);
    g.chat[first.id].mes = 'The farmer approves the harness and hands him three copper.';
    g.chat[first.id].swipe_id = 1;
    processReplyAny(g.chat, first.id, content);
    await runExtraction(g.chat, first.id, content, g.llm);
    assert.equal(g.state().entities.pc.sheet.coin_cp, before.entities.pc.sheet.coin_cp + 3);
    g.chat[first.id] = { ...original, swipe_id: 0 };
    assert.equal(g.state().entities.pc.sheet.coin_cp, before.entities.pc.sheet.coin_cp + 3);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
});
