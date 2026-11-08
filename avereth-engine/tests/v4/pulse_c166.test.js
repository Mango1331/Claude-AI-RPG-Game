// .166 (patch_plans_10b/REVIEW_PULSE165_PRODUKTDIFF_GPT.md §2, P2): the protection of a cut pause must not swallow the
// time of an independent step. A reply that keeps to the cut tells the meal and the minutes he slept; its time is
// what actually passed and is booked. Only what the reply's own account of the pause (expected.<seq>.minutes, the
// extractor's existing per-action answer) claims beyond the cut is the cut-away time; a pure pause stays protected
// whatever the extractor says. Real path: planner turn, narrator reply, extractor answer, world applier.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, walk, inject, CATA } from './patch8_lib.js';
import { recoveryEvents } from '../../src/v4/commands.js';
import { foldChat, rec } from '../../src/host.js';

const content = await loadProductContent();
const ACT = (kind, minutes, quote) => ({ type: 'activity', kind, what: null, minutes, until: null, quote });
const MEAL = { type: 'other', what: 'cook a meal', quote: 'I cook a meal over the fire' };
const mins = (events) => (events || []).filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0);
const gains = (events) => Object.fromEntries((events || []).filter((e) => e.t === 'resource.changed' && e.d.id === 'pc').map((e) => [e.d.resource, e.d.value]));
const TIME = (minutes, seq) => ({ seq, type: 'time', minutes });

/** Out in the land, wounded; the message's pause gets a forced DANGER window; returns the cut and the reply's answer. */
async function turn(commands, reply, { deltas, pauseMinutes, force = { open: true, kind: 'danger' } }) {
    const g = await campaign(content);
    await walk(g, CATA, { text: '*I walk to the Old Crown Catacombs*', prose: 'He reaches the old gate.' });
    inject(g, [['hp', 5], ['mp', 0], ['sta', 0]].map(([resource, value]) => ({ t: 'resource.changed', d: { id: 'pc', resource, value, why: 'test: wounded' } })));
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    const before = structuredClone(g.state());
    try { await say(g, '*I make camp here*', ...commands); } finally { content.rules.pulse.force = was; }
    const user = rec(g.chat.at(-1));
    const o = outcomeOf(g);
    const x = o.auth.pulse.interrupt;
    const m = x?.after_min;
    // the extractor answers every expected key; the pause's own minutes as the reply tells them
    const expected = Object.fromEntries(Object.entries(o.expected_keys || {}).map(([k, t]) => [k, t === 'activity' ? { minutes: Number(k) === x?.seq ? pauseMinutes(m) : 60, done: Number(k) !== x?.seq } : { done: true }]));
    await g.reply(reply(m), { expected, deltas: deltas(m) });
    const answer = rec(g.chat.at(-1));
    return { g, before, user, answer, m, x, total: mins(user.events) + mins(answer.events), rejected: (answer.events || []).filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule) };
}

test('.166 P2: meal, then the cut sleep, told as it happened; the extractor reports 60 + m: 60 + m in all, recovery for m', async () => {
    const r = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], (m) => `He cooks for an hour, then sleeps; after ${m} minutes something wakes him.`,
        { deltas: (m) => [TIME(60 + m, 1)], pauseMinutes: (m) => m });
    assert.ok(r.x && !r.x.at_end);
    assert.equal(r.total, 60 + r.m, `booked ${mins(r.user.events)} + reply ${mins(r.answer.events)}`);
    assert.deepEqual(gains(r.user.events), gains(recoveryEvents(r.before, content, r.m, 'sleep').events), 'recovery of the sleep minutes only');
    assert.equal(gains(r.answer.events).hp, undefined);
    assert.ok(!r.rejected.includes('rest_cut'));
});

test('.166 P2: the same with separate time deltas (meal 60, then sleep m): 60 + m in all', async () => {
    const r = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], (m) => `He cooks for an hour, then sleeps; after ${m} minutes he is woken.`,
        { deltas: (m) => [TIME(60, 1), TIME(m, 2)], pauseMinutes: (m) => m });
    assert.equal(r.total, 60 + r.m);
    assert.ok(!r.rejected.includes('rest_cut'));
});

test('.166: time is the reply\'s whole story time (content/deltas.json): a report of the meal alone (60) is read as 60 in all, as for any booked activity since Prototype C, with or without a cut', async () => {
    const r = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], (m) => `He cooks for an hour, then sleeps; after ${m} minutes he is woken.`,
        { deltas: () => [TIME(60, 1)], pauseMinutes: (m) => m });
    assert.equal(r.total, Math.max(60, r.m), 'the larger of the engine\'s booking and the reported story time');
    assert.ok(!r.rejected.includes('rest_cut'), 'nothing of it is taken as cut-away time');
});

test('.166: still guarded: the meal and a full night against the cut (time 540, sleep reported as 480): 60 + m', async () => {
    const r = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], () => 'He cooks for an hour, then sleeps through the night.',
        { deltas: () => [TIME(540, 1)], pauseMinutes: () => 480 });
    assert.equal(r.total, 60 + r.m);
    assert.ok(r.rejected.includes('rest_cut'));
    // separate deltas, the same story: 60 + m
    const s = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], () => 'He cooks for an hour, then sleeps through the night.',
        { deltas: () => [TIME(60, 1), TIME(480, 2)], pauseMinutes: () => 480 });
    assert.equal(s.total, 60 + s.m);
});

test('.166: a pure cut pause stays m whatever the extractor says (full night with its own account or a contradicting one); 30 -> 15 stays 15', async () => {
    for (const pauseMinutes of [() => 480, (m) => m]) {
        const r = await turn([ACT('sleep', 480, 'I sleep for eight hours')], () => 'He sleeps through the night by the gate.', { deltas: () => [TIME(480, 1)], pauseMinutes });
        assert.equal(r.total, r.m, `sleep reported as ${pauseMinutes(r.m)}`);
    }
    const h = await turn([ACT('rest', 30, 'I rest for half an hour')], () => 'He rests for half an hour.', { deltas: () => [TIME(30, 1)], pauseMinutes: () => 30 });
    assert.deepEqual([h.m, h.total], [15, 15]);
});

test('.166: no cut, the same meal and night: 540 as before; the fold is identical after the fix', async () => {
    const r = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], () => 'He cooks for an hour, then sleeps through the night.',
        { deltas: () => [TIME(540, 1)], pauseMinutes: () => 480, force: { open: false } });
    assert.equal(r.x, undefined);
    assert.equal(r.total, 540);
    const c = await turn([MEAL, ACT('sleep', 480, 'then sleep for eight hours')], (m) => `He cooks for an hour, then sleeps ${m} minutes.`,
        { deltas: (m) => [TIME(60 + m, 1)], pauseMinutes: (m) => m });
    assert.deepEqual(foldChat(structuredClone(c.g.chat)).state, c.g.state());
});
