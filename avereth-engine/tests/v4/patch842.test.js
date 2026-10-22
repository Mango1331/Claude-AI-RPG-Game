// Patch 8.4.2 (docs/PATCH8_4_2_FINAL_INTEGRATION.md): the second automated live test, 22.10.2026 07:49
// (tests/v4/live_1022d.json, build .30, GLM-5.3-Flash via Featherless, tools/st_live/live): turn 5 offered one silver for
// the Guild registration and the engine booked it as a payment to the clerk while the registration (2 silver) stayed
// open; turn 6 paid the fee as well: 30 cp for a 20 cp fee. The extractor resolved the strider threads by "t10.1" for
// thread.t10.1 (replies #40 and #48): refused as unknown, the threat stayed under Here after the last strider died. The
// HUD showed the dead striders at ENGAGED.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { rec } from '../../src/host.js';
import { threadEvents, threadById } from '../../src/threads.js';
import { worldRows } from '../../src/hud.js';
import { REGISTRATION_OFFER } from '../../src/v4/guild.js';
import { Chat4 } from './harness.js';
import { say, linesOf } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022d.json'), 'utf8'));
const CLERK = 'npc.w_guild_clerk';

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** The player message n as the live planner read it (its commands). */
const planned = (n) => (rec(fx.messages[n]).interp?.commands || []).map(({ seq, ...c }) => c);
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const userEvents = (g) => rec(g.chat.findLast((m) => m.is_user)).events;
const paid = (g) => g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'coin.changed' && e.d.delta < 0);
const playerPanel = (g, id) => String(g.chat[id].extra?.display_text || '').replace(/<[^>]+>/g, '\n').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const here = (g) => Object.fromEntries(worldRows(g.state(), content)).Here || '';

// ------------------------------------------------------------------------------------------------ A1. Registration fee
test('8.4.2 fee 1 (live #9/#11, turns 5 and 6): one silver for the 2 silver fee is NOT PAID, the registration stays open at 20 cp; the fee paid next registers him once: 30 cp left', async () => {
    const g = live(9);
    assert.equal(coin(g), 50);
    assert.deepEqual(planned(9), [{ type: 'pay', to: CLERK, amount_cp: 10, for: 'Guild registration', quote: 'I put one silver on the counter' }, { type: 'guild.register', quote: 'give her my name as Alaric, and place my hand on the measuring stone' }]);
    await say(g, fx.messages[9].mes, ...planned(9));
    assert.ok(!userEvents(g).some((e) => e.t === 'coin.changed' || e.t === 'transaction.completed'), 'the .30 run: coin.changed −10 "paid the guild registration clerk", transaction.completed');
    assert.equal(coin(g), 50);
    const lines = linesOf(g);
    assert.match(lines, /^1\. NOT PAID — 10 cp \(1 Silver\) is not the Guild's registration fee \(2 silver \(20 cp\), one-time\): nothing is paid, his coin stays 50 cp \(5 Silver\)\. Let the clerk name the fee; he has not paid it\./m);
    assert.match(lines, /^2\. REGISTERS — pending: the Guild's registration fee is 2 silver \(20 cp\), one-time/m);
    assert.equal(g.state().offers[REGISTRATION_OFFER].status, 'open');
    assert.equal(g.state().offers[REGISTRATION_OFFER].lines[0].price_cp, 20);
    const r = await g.reply(fx.messages[10].mes, { expected: {}, deltas: [] });
    assert.match(playerPanel(g, r.id), /ACTION NOT POSSIBLE — .*the Guild's registration fee is 2 silver \(20 cp\), not 10 cp \(1 Silver\); nothing was paid/);
    // turn 6 as live: the fee
    await say(g, fx.messages[11].mes, ...planned(11));
    assert.equal(userEvents(g).find((e) => e.t === 'guild.registered')?.d.rank, 'Novice');
    assert.equal(coin(g), 30);
    assert.deepEqual(paid(g).map((e) => e.d.delta), [-20], 'one payment, the fee');
});

test('8.4.2 fee 2: a higher amount for the registration is no payment either; the fee then registers him once', async () => {
    const g = live(9);
    await say(g, '*I put three silver on the counter to register*', { type: 'pay', to: CLERK, amount_cp: 30, for: 'Guild registration', quote: 'I put three silver on the counter' }, { type: 'guild.register', quote: 'to register' });
    assert.equal(coin(g), 50);
    assert.match(linesOf(g), /NOT PAID — 30 cp \(3 Silver\) is not the Guild's registration fee \(2 silver \(20 cp\)/);
    await g.reply('"Two silver," she says, and pushes one coin back.', { expected: {}, deltas: [] });
    await say(g, '*I pay the two silver fee*', { type: 'pay', to: CLERK, amount_cp: 20, for: 'Guild registration fee', quote: 'I pay the two silver fee' });
    assert.ok(userEvents(g).some((e) => e.t === 'guild.registered'));
    assert.equal(coin(g), 30);
    assert.deepEqual(paid(g).map((e) => e.d.delta), [-20]);
});

test('8.4.2 fee 3: the fee itself registers at once (unchanged); a tip that names its own purpose stays an ordinary payment, in the same message and after it', async () => {
    const g = live(9);
    await say(g, '*I pay the two silver and register, and leave her five copper for her trouble*', { type: 'pay', to: CLERK, amount_cp: 20, for: 'Guild registration', quote: 'I pay the two silver' }, { type: 'guild.register', quote: 'and register' }, { type: 'pay', to: CLERK, amount_cp: 5, for: 'a tip for her trouble', quote: 'leave her five copper for her trouble' });
    assert.ok(userEvents(g).some((e) => e.t === 'guild.registered'));
    assert.deepEqual(paid(g).map((e) => [e.d.delta, e.d.why]), [[-20, 'Guild registration fee'], [-5, 'paid the guild registration clerk for a tip for her trouble']]);
    assert.equal(coin(g), 25);
    // a member pays the clerk for something else: an ordinary payment
    await say(g, '*I give her two copper for the directions*', { type: 'pay', to: CLERK, amount_cp: 2, for: 'the directions', quote: 'I give her two copper' });
    assert.equal(coin(g), 23);
    // before he registers, a tip without a registration in the message is ordinary as well
    const h = live(9);
    await say(h, '*I slide her a copper for the help*', { type: 'pay', to: CLERK, amount_cp: 1, for: 'her help', quote: 'I slide her a copper' });
    assert.equal(coin(h), 49);
});

// ------------------------------------------------------------------------------------------------ A2. Thread ids
test('8.4.2 threads 1: a thread by its own id or without the "thread." prefix is the same thread; an unknown id is refused; a second resolution changes nothing', () => {
    const state = { turn: 20, clock: { minute: 700 }, scene: { at: 'loc.x' }, threads: { 'thread.t10.1': { id: 'thread.t10.1', text: 'The last strider stands on the causeway.', kind: 'threat', status: 'open', since: { turn: 10 }, updated: { turn: 10 }, at: 'loc.x' } } };
    const t = state.threads['thread.t10.1'];
    assert.equal(threadById(state, 't10.1'), t);
    assert.equal(threadById(state, 'thread.t10.1'), t);
    assert.equal(threadById(state, 't10.2'), null);
    const at = { turn: 20, minute: 700 };
    const short = threadEvents(state, { id: 't10.1', text: 'The strider is dead.', kind: 'threat', status: 'resolved', resolution: 'killed' }, { at, src: { kind: 'narration' } });
    assert.equal(short.reject, undefined);
    assert.equal(short.events[0].d.thread.id, 'thread.t10.1', 'the thread that exists, no new one');
    assert.equal(short.events[0].d.thread.status, 'resolved');
    assert.equal(short.events[0].d.thread.text, 'The last strider stands on the causeway.', 'a resolution keeps the matter\'s words');
    const update = threadEvents(state, { id: 't10.1', text: 'The last strider circles wide.', kind: 'threat', status: 'open' }, { at, src: { kind: 'narration' } });
    assert.equal(update.events[0].d.thread.id, 'thread.t10.1');
    assert.match(threadEvents(state, { id: 't99.1', text: 'x', status: 'resolved' }, { at, src: {} }).reject, /unknown thread t99\.1/);
    const done = { ...state, threads: { 'thread.t10.1': { ...t, status: 'resolved' } } };
    assert.deepEqual(threadEvents(done, { id: 't10.1', text: 'dead', status: 'resolved' }, { at, src: {} }).events, []);
});

test('8.4.2 threads 2 (live #48): the reply after the last strider died resolves its threat and the cull\'s by "t10.1" and "t9.1": they leave Here', async () => {
    const g = live(48);
    assert.match(here(g), /The last unhurt bog strider circled wide and came around behind Alaric/, 'the stale threat of the .30 run');
    const items = rec(fx.messages[48]).events.filter((e) => e.t === 'delta.rejected' && e.d.item?.type === 'thread').map((e) => e.d.item);
    assert.deepEqual(items.map((x) => [x.id, x.status, e2r(fx, 48, x.id)]), [['t10.1', 'resolved', 'unknown thread t10.1'], ['t9.1', 'resolved', 'unknown thread t9.1']]);
    const r = await g.reply(fx.messages[48].mes, { expected: {}, deltas: items });
    assert.ok(!r.record.events.some((e) => e.t === 'delta.rejected' && e.d.item?.type === 'thread'));
    const s = g.state();
    assert.equal(s.threads['thread.t10.1'].status, 'resolved');
    assert.equal(s.threads['thread.t9.1'].status, 'resolved');
    assert.equal(Object.keys(s.threads).length, 3, 'no new thread');
    assert.doesNotMatch(here(g), /bog strider/i);
});

test('8.4.2 threads 3 (live #40): the resolutions of reply #40 by short ids are taken as well', async () => {
    const g = live(40);
    const items = rec(fx.messages[40]).events.filter((e) => e.t === 'delta.rejected' && e.d.item?.type === 'thread').map((e) => e.d.item);
    assert.deepEqual(items.map((x) => x.id), ['t10.1', 't11.1']);
    await g.reply(fx.messages[40].mes, { expected: {}, deltas: items });
    assert.equal(g.state().threads['thread.t10.1'].status, 'resolved');
    assert.equal(g.state().threads['thread.t11.1'].status, 'resolved');
});

// ------------------------------------------------------------------------------------------------ A3. The dead in the HUD
test('8.4.2 HUD (live #52, after the cull): the dead striders are listed dead at no range band; the living keep theirs', () => {
    const present = Object.fromEntries(worldRows(live(52).state(), content)).Present;
    assert.match(present, /Bog Strider A \(dead\) · Bog Strider B \(dead\) · Bog Strider C \(dead\) · Bog Strider D \(dead\)/, 'the .30 HUD: (dead, SHORT), (dead, ENGAGED)');
    assert.match(present, /Fisher Mending Net \(fisher mending net, SHORT\)/);
});

function e2r(f, n, id) {
    return rec(f.messages[n]).events.find((e) => e.t === 'delta.rejected' && e.d.item?.id === id)?.d.reason;
}
