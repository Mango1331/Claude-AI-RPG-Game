// Patch 8.4.3 (docs/PATCH8_4_3_FINAL_DUNGEON_CONSISTENCY.md): the automated Living Dungeon live test, 22.10.2026 09:00
// (tests/v4/live_1022e.json, build .31, GLM-5.3-Flash via Featherless, tools/st_live/live): with Alaric inside
// Glimmerdeep Grotto (capacity 6), Wren Company (2) and Ashen Hands (4) both came in (#36): 7 of 6. Turn 20 (#39) "I back
// away quietly between the columns and slip back through the cleft, away from the queen, before she notices me" came as
// flee outside a fight: story fiction, the narrator told the walk out to the Second Chamber, the arrival was refused
// (no_go), and he rested six hours in the Queen's Crystal Bowl.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { syncEvents, occupancy, hudRows } from '../../src/v4/living.js';
import { MECH_RULES, MECH_EXAMPLES, mapPlan, retreatGo } from '../../src/v4/planner.js';
import { Chat4 } from './harness.js';
import { say, linesOf, inject, campaign, walk, delve, living, GO } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022e.json'), 'utf8'));
const G = 'loc.glimmerdeep_grotto';
const BOWL = 'loc.glimmerdeep_grotto.third_gallery_of_glimmerdeep.queens_crystal_bowl';
const THIRD = 'loc.glimmerdeep_grotto.third_gallery_of_glimmerdeep';
const SECOND = 'loc.glimmerdeep_grotto.second_chamber_of_glimmerdeep';
const RETREAT = fx.messages[39].mes;

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
const userEvents = (g) => rec(g.chat.findLast((m) => m.is_user)).events;
const acts = (g) => (rec(g.chat.findLast((m) => m.is_user)).ir?.acts || []).map((a) => [a.act, a.to ?? null]);
/** The steps the engine resolved for the last message (the planner's commands as mapped). */
const resolved = (g) => userEvents(g).filter((e) => e.t === 'cmd.resolved').map((e) => [e.d.type, e.d.status]);

/** The live state before reply #36 (Alaric in the Second Chamber), its clock set to the minute after it (805). */
function before36(edit = null) {
    const s = structuredClone(foldChat(fx.messages, 36).state);
    s.clock.minute = foldChat(fx.messages, 37).state.clock.minute;
    if (edit) edit(s);
    const out = [];
    syncEvents(s, content, (e) => { out.push(e); applyEvent(s, e); });
    return { s, enters: out.filter((e) => e.t === 'dungeon.party' && e.d.kind === 'enter').map((e) => e.d.party), o: occupancy(s, s.dungeons[G]) };
}

// ------------------------------------------------------------------------------------------------ A1. Capacity
test('8.4.3 capacity 1 (live #36): with Alaric inside, Wren Company (2) comes in, Ashen Hands (4) does not: 3 of 6, never 7', () => {
    const live36 = foldChat(fx.messages, 37).state;
    assert.deepEqual(Object.keys(live36.dungeons[G].inside).sort(), ['party.ashen_hands', 'party.wren_company'], 'the .31 run: both came in');
    assert.equal(occupancy(live36, live36.dungeons[G]).total, 7);
    const { s, enters, o } = before36();
    assert.equal(s.dungeons[G].capacity, 6);
    assert.deepEqual(enters, ['party.wren_company']);
    assert.deepEqual(o, { parties: 2, pc: 1, total: 3 });
    assert.match(Object.fromEntries(hudRows(s))['Dungeon cycle'], /inside: 3\/6/);
});

test('8.4.3 capacity 2: his place is counted once: outside, both companies fit (6 of 6); inside, a company of five still fits beside him (6 of 6)', () => {
    const out = before36((s) => { s.scene.at = 'loc.glassmere.guild_hall'; });
    assert.deepEqual(out.enters.sort(), ['party.ashen_hands', 'party.wren_company']);
    assert.deepEqual(out.o, { parties: 6, pc: 0, total: 6 });
    const five = before36((s) => { s.dungeons[G].parties = s.dungeons[G].parties.map((p) => (p.id === 'party.wren_company' ? { ...p, size: 5 } : p)); });
    assert.deepEqual(five.enters, ['party.wren_company']);
    assert.deepEqual(five.o, { parties: 5, pc: 1, total: 6 });
});

// ------------------------------------------------------------------------------------------------ A2. Retreat
test('8.4.3 retreat 0: the planner\'s rule: outside a fight a getaway to a place is go, flee only when he names none; an example without a fight', () => {
    assert.match(MECH_RULES, /in a fight, getting away from it is flee; outside a fight, getting away to another place \(back the way he came, through a way he knows, to a room or place\) is go, also when he calls it fleeing, backing away or withdrawing/);
    assert.match(MECH_EXAMPLES, /\(no fight\) "I back away from the sleeping bear and slip back out to the old mill" → \{"commands":\[\{"seq":1,"type":"go","to":"loc\.mill"/);
});

test('8.4.3 retreat 1 (live #39): the getaway as the planner now reads it, go to the Second Chamber, is booked on the ordinary way back through the rooms he knows; the reply\'s arrival there is taken, engine and story agree', async () => {
    const g = live(39);
    assert.equal(g.state().scene.at, BOWL);
    assert.equal(g.state().encounter, null);
    await say(g, RETREAT, { type: 'go', to: SECOND, quote: RETREAT });
    assert.deepEqual(acts(g), [['go', SECOND]]);
    assert.match(linesOf(g), /^1\. GOES — to Second Chamber of Glimmerdeep/m);
    const r = await g.reply(fx.messages[40].mes, { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: SECOND, with: null, forced_by: null }] });
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'no_go'), 'the .31 run: "Alaric arrives somewhere only after his own travel/roaming action"');
    assert.equal(g.state().scene.at, SECOND);
    assert.equal(foldChat(g.chat, g.chat.length).state.scene.at, SECOND, 'the replay agrees');
});

test('8.4.3 retreat 2 (live #39 as live, flee): the getaway "back through" is a go to the room he came from (the Third Gallery), on the ordinary way; the queen stays behind', async () => {
    const g = live(39);
    assert.deepEqual(rec(fx.messages[39]).ir.acts.map((a) => a.act), ['flee'], 'what the live planner gave');
    assert.deepEqual(retreatGo(g.state(), { seq: 1, type: 'flee', quote: RETREAT }), { seq: 1, type: 'go', to: THIRD, quote: RETREAT });
    await say(g, RETREAT, { type: 'flee', quote: RETREAT });
    assert.deepEqual(acts(g), [['flee', null]], 'the planner\'s command, as recorded');
    assert.deepEqual(resolved(g), [['go', 'authorized']], 'the step the engine took');
    assert.match(linesOf(g), /^1\. GOES — to Third Gallery of Glimmerdeep/m);
    assert.doesNotMatch(linesOf(g), /NOTHING TO BOOK/);
    await g.reply('He backs away between the columns into the gallery beyond, the queen still at her crystal.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: THIRD, with: null, forced_by: null }] });
    assert.equal(g.state().scene.at, THIRD);
    assert.equal(foldChat(g.chat, g.chat.length).state.scene.at, THIRD);
});

test('8.4.3 retreat 3: the same words in the fight with the queen (live #49) stay the fight\'s flee, unchanged', async () => {
    const g = live(49);
    assert.ok(g.state().encounter, 'the queen fight runs');
    const plan = mapPlan([{ seq: 1, type: 'flee', quote: RETREAT }], { fight: true, opponents: [], catalog: { present: [] }, route: [] }, content, RETREAT, g.state());
    assert.equal(plan.route, 'v3');
    assert.equal(plan.intent.kind, 'flee');
    await say(g, RETREAT, { type: 'flee', quote: RETREAT });
    assert.ok(!acts(g).some(([a]) => a === 'go'));
    assert.ok(!userEvents(g).some((e) => e.t === 'scene.moved'));
});

test('8.4.3 retreat 4: a getaway that names no place, or one he does not know ("back to …"), gets no place: no go, and an arrival the story tells is refused', async () => {
    const s = foldChat(fx.messages, 39).state;
    for (const quote of ['I run from here as fast as I can!', 'I slip back to the Fourth Grotto before she sees me', 'I flee', 'I back away from her slowly']) assert.equal(retreatGo(s, { seq: 1, type: 'flee', quote }), null, quote);
    assert.deepEqual(retreatGo(s, { seq: 1, type: 'flee', quote: 'I slip away back to the Second Chamber' }), { seq: 1, type: 'go', to: SECOND, quote: 'I slip away back to the Second Chamber' }, 'a known room he names');
    const g = live(39);
    await say(g, 'I run from here as fast as I can!', { type: 'flee', quote: 'I run from here as fast as I can!' });
    assert.deepEqual(acts(g), [['flee', null]]);
    assert.ok(!resolved(g).some(([t]) => t === 'go'));
    assert.match(linesOf(g), /NOTHING TO BOOK/, 'unchanged: story fiction');
    const r = await g.reply('He runs back into the Second Chamber.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: SECOND, with: null, forced_by: null }] });
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'no_go'));
    assert.equal(g.state().scene.at, BOWL);
});

test('8.4.3 retreat 5: the way back barred by an obstacle: the go is refused by the dungeon\'s own rule, he stays', async () => {
    const g = live(39);
    const link = Object.values(g.state().links).find((l) => [l.a, l.b].includes(BOWL));
    inject(g, [
        { t: 'feature.set', d: { feature: { id: 'feat.test_slab', kind: 'obstacle', status: 'active', name: 'a fallen crystal slab', at: BOWL, difficulty: 'hard', hidden: false, since: { turn: 19, minute: 815 } } } },
        { t: 'link.set', d: { link: { ...link, feature: 'feat.test_slab' } } },
    ]);
    await say(g, RETREAT, { type: 'flee', quote: RETREAT });
    assert.equal(resolved(g)[0][0], 'go');
    assert.notEqual(resolved(g)[0][1], 'authorized');
    assert.match(linesOf(g), /fallen crystal slab/);
    assert.ok(!userEvents(g).some((e) => e.t === 'scene.moved'));
    assert.equal(g.state().scene.at, BOWL);
});

// ------------------------------------------------------------------------------------------------ D. The paid gate
test('8.4.3 gate (D2, no waiving contract): the fee once per entry: paid, the pass holds while he is inside; out again, the pass is over and the next entry asks the fee again, paid once more', async () => {
    const g = await campaign(content, { greeting: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`' });
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.glassmere', power_rank: 'F' } }]);
    await walk(g, G, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft.' });
    await say(g, '*I go in*', GO(G, 'I go in'));
    assert.match(linesOf(g), /ENTRY FEE — the academy's gate-warden asks 10 cp/);
    const coin = g.state().entities.pc.sheet.coin_cp;
    const offer = () => Object.values(g.state().offers).find((o) => o.gate === G && o.status === 'open');
    await say(g, '*I pay the fee*', { type: 'offer.accept', offer: offer().id, lines: ['l1'], qty: null, quote: 'I pay the fee' });
    await g.reply('He pays.', { expected: {}, deltas: [] });
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin - 10);
    await delve(g, 'Outer grotto', { root: G });
    assert.equal(living(g, G).pass.inside, true, 'the pass holds while he is inside');
    // out again: the pass is over
    await walk(g, G, { text: '*I walk back out to the cleft*', prose: 'Back at the cleft.' });
    assert.equal(g.state().scene.at, G);
    assert.equal(living(g, G).pass, null);
    // the next entry asks the fee again, and is paid once
    await say(g, '*I go in again*', GO(G, 'I go in again'));
    assert.match(linesOf(g), /ENTRY FEE — the academy's gate-warden asks 10 cp/);
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin - 10, 'asking is no payment');
    await say(g, '*I pay the fee*', { type: 'offer.accept', offer: offer().id, lines: ['l1'], qty: null, quote: 'I pay the fee' });
    await g.reply('He pays again.', { expected: {}, deltas: [] });
    assert.equal(g.state().entities.pc.sheet.coin_cp, coin - 20);
    const fees = g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'coin.changed' && e.d.delta < 0).map((e) => e.d.delta);
    assert.deepEqual(fees, [-10, -10], 'one payment per entry');
});

