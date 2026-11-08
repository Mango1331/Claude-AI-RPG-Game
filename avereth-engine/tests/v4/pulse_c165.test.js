// .165 (patch_plans_10b/REVIEW_PULSE164_PRODUKTDIFF_GPT.md §2, P2): a pause the engine cut short stays cut short
// against the extractor. The reply's time delta covers the engine's booked minutes first; the minutes of the planned
// pause the cut took away are covered too (never booked again), so a reply that tells the full rest adds nothing,
// while time of an independent step before the rest still counts. Real path: planner turn (playerTurnV4), narrator
// reply, extractor answer, world applier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, walk, inject, CATA } from './patch8_lib.js';
import { recoveryEvents } from '../../src/v4/commands.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const ACT = (kind, minutes, quote) => ({ type: 'activity', kind, what: null, minutes, until: null, quote });
const mins = (events) => (events || []).filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0);
const gains = (events) => Object.fromEntries((events || []).filter((e) => e.t === 'resource.changed' && e.d.id === 'pc').map((e) => [e.d.resource, e.d.value]));
const TIME = (minutes, seq = 1) => ({ seq, type: 'time', minutes });

/** Out in the land (before the Catacombs' gate), wounded; a forced window for the pause message. */
async function atCamp(force) {
    const g = await campaign(content);
    await walk(g, CATA, { text: '*I walk to the Old Crown Catacombs*', prose: 'He reaches the old gate.' });
    inject(g, [['hp', 5], ['mp', 0], ['sta', 0]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value, why: 'test: wounded' } })));
    content.rules.pulse.force = force;
    return g;
}
async function pause(g, commands, reply, deltas) {
    const before = structuredClone(g.state());
    await say(g, '*I make camp here*', ...commands);
    const user = rec(g.chat.at(-1));
    content.rules.pulse.force = null;
    await g.reply(reply, { expected: {}, deltas });
    const answer = rec(g.chat.at(-1));
    return { before, user, answer, auth: outcomeOf(g).auth, total: mins(user.events) + mins(answer.events), rejected: (answer.events || []).filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule) };
}
const DANGER = { open: true, kind: 'danger' };
async function guarded(fn) {
    const was = content.rules.pulse.force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}

test('.165 P2: 30 min cut at 15, the extractor reports 30: 15 minutes in all, recovery for 15', () => guarded(async () => {
    const g = await atCamp(DANGER);
    const r = await pause(g, [ACT('rest', 30, 'I rest for half an hour')], 'He rests by the gate for half an hour.', [TIME(30)]);
    assert.deepEqual([r.auth.pulse.interrupt.after_min, r.auth.pulse.interrupt.at_end], [15, false]);
    assert.equal(r.total, 15, `booked ${mins(r.user.events)} + reply ${mins(r.answer.events)}`);
    assert.equal(g.state().clock.minute, r.before.clock.minute + 15);
    assert.deepEqual(gains(r.user.events), gains(recoveryEvents(r.before, content, 15, 'rest').events));
    assert.equal(gains(r.answer.events).hp, undefined, 'the reply books no recovery');
}));

test('.165 P2: 480 min cut at m, the extractor reports 480: m minutes in all, no remainder', () => guarded(async () => {
    const g = await atCamp(DANGER);
    const r = await pause(g, [ACT('sleep', 480, 'I sleep for eight hours')], 'He sleeps through the night by the gate.', [TIME(480)]);
    const m = r.auth.pulse.interrupt.after_min;
    assert.ok(m >= 15 && m <= 465);
    assert.equal(r.total, m);
    assert.ok(r.rejected.includes('rest_cut'), JSON.stringify(r.rejected));
    assert.deepEqual(validateState(g.state(), content), []);
}));

test('.165 P2: a short pause booked in full with its event at the end (5 and 20 min): the reported time is not booked twice', () => guarded(async () => {
    for (const M of [5, 20]) {
        const g = await atCamp(DANGER);
        const r = await pause(g, [ACT('wait', M, `I wait ${M} minutes`)], `He waits ${M} minutes.`, [TIME(M)]);
        assert.equal(r.auth.pulse.interrupt.at_end, true);
        assert.equal(r.total, M, `${M} min`);
    }
}));

test('.165 P2: an independent step before the cut rest keeps its own time; only the rest\'s lost minutes are not booked again', () => guarded(async () => {
    const g = await atCamp(DANGER);
    const r = await pause(g, [{ type: 'other', what: 'cook a meal', quote: 'I cook a meal over the fire' }, ACT('sleep', 480, 'then sleep for eight hours')],
        'He cooks a meal over the fire for an hour, then sleeps through the night.', [TIME(540)]);
    assert.ok(['resolved', 'authorized'].includes(r.user.events.find((e) => e.t === 'cmd.resolved' && e.d.seq === 1)?.d.status));
    const m = r.auth.pulse.interrupt.after_min;
    assert.equal(r.total, m + 60, 'the meal\'s hour stands, the night\'s rest after the cut does not');
    // no cut: the same message books the whole night and the meal as before (.164)
    const h = await atCamp({ open: false });
    const full = await pause(h, [{ type: 'other', what: 'cook a meal', quote: 'I cook a meal over the fire' }, ACT('sleep', 480, 'then sleep for eight hours')],
        'He cooks a meal over the fire for an hour, then sleeps through the night.', [TIME(540)]);
    assert.equal(full.auth.pulse.interrupt, undefined);
    assert.equal(full.total, 540);
}));

test('.165 P2: the danger group and a contradicting time delta: the fight stands, no extra pause minutes', () => guarded(async () => {
    const g = await atCamp(DANGER);
    const r = await pause(g, [ACT('sleep', 480, 'I sleep for eight hours')], 'Near dawn three bandits draw steel and attack him at the edge of his camp; he had slept the whole night.', [
        { seq: 1, type: 'person.new', ref: 'bandits', name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
        { seq: 2, type: 'hostile', by: ['bandits'] }, TIME(480, 3)]);
    // the fight opens as without the time delta (the hero is wounded here: the event, not the state, is checked)
    assert.ok(r.answer.events.some((e) => e.t === 'encounter.started'), JSON.stringify(r.rejected));
    assert.deepEqual(r.rejected, ['rest_cut'], 'only the cut-away minutes are refused');
    assert.equal(r.total, r.auth.pulse.interrupt.after_min);
    assert.ok(!r.answer.corrections.some((c) => /did not show what/.test(c)), 'the cause was shown');
}));

test('.165 P2: swipe of the reply, regenerate and reload keep the cut minutes; the fold is identical', () => guarded(async () => {
    const g = await atCamp(DANGER);
    const r = await pause(g, [ACT('sleep', 480, 'I sleep for eight hours')], 'He sleeps through the night.', [TIME(480)]);
    const m = r.auth.pulse.interrupt.after_min;
    const clock = g.state().clock.minute;
    // regenerate the reply: the player record is reused, the new reply's extraction again books nothing more
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    await g.reply('He sleeps on until dawn.', { expected: {}, deltas: [TIME(480)] });
    assert.equal(g.state().clock.minute, clock);
    assert.equal(mins(rec(g.chat.at(-2)).events) + mins(rec(g.chat.at(-1)).events), m);
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded, g.state());
    assert.equal(folded.clock.minute, r.before.clock.minute + m);
}));
