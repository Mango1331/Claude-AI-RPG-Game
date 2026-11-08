// PULSE package C (.164, W7a; patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md §5.3, §6 C, §12.4, §14.2):
// a rest, sleep or wait outside a safe lodging can be cut short. The pause's handler decides the turn's one window
// before it books time and recovery; from 30 booked minutes on a cut books m in [15, M-15] minutes and their recovery
// only, below that the pause is booked in full and the event meets him as it ends. Either way every later step of the
// message is refused ('rest interrupted'), unbooked. The engine names the cause; the next turn gets one binding fact
// line, and a reply that did not show a cause with a figure gets a correction from the event.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, outcomeOf, lastUser, walk, CATA } from './patch8_lib.js';
import { resolveCommands, recoveryEvents } from '../../src/v4/commands.js';
import { pulseBegin, pauseSafety, restCutFacts } from '../../src/v4/pulse.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';
import { clone, formatClock } from '../../src/util.js';
import { Dice } from '../../src/rng.js';

const content = await loadProductContent();
const REALM = 'realm.valedorn_crown', TOWN = 'loc.alderwatch', HALL = 'loc.alderwatch.guild_hall';
const ACT = (kind, minutes, quote = `I ${kind}`) => ({ type: 'activity', kind, what: null, minutes, until: null, quote });
const GO = (to, quote = 'I go') => ({ type: 'go', to, quote });
const TAKE = (what = 'the keys', more = {}) => ({ type: 'take', object: { new: what }, quote: `I take ${what}`, ...more });
const LOOK = { type: 'other', what: 'look around', quote: 'I look around' };
const rolled = (events) => events.filter((e) => e.t === 'pulse.rolled');
const minutes = (events) => events.filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0);
const gains = (events) => Object.fromEntries(events.filter((e) => e.t === 'resource.changed' && e.d.id === 'pc').map((e) => [e.d.resource, e.d.value]));

/** A turn resolved on a copy of the state, as playerTurnV4 runs it (turn begun first). */
function turn(s0, commands, { turnNo = null, input = 'I rest', clock = null, at = null } = {}) {
    const s = clone(s0);
    const events = [];
    const emit = (e) => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: turnNo ?? s.turn + 1, input_hash: 'c164', input } });
    if (clock != null) s.clock.minute = Math.floor(s.clock.minute / 1440) * 1440 + clock;
    if (at) s.scene.at = at;
    const before = clone(s);
    const ctx = resolveCommands(s, content, commands.map((c, i) => ({ seq: i + 1, ...c })), emit, { c: true, msg: 1, dice: Dice.from(s) });
    return { s, before, ctx, events, pulse: ctx.auth.pulse, extra: ctx.extra, actions: ctx.actions, res: ctx.resolutions };
}
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}
const DANGER = { open: true, kind: 'danger' };
/** A wounded hero out in the land (recovery shows), at 10:00. */
async function wild() {
    const g = await campaign(content);
    const s = clone(g.state());
    s.scene.at = REALM;
    s.clock.minute = Math.floor(s.clock.minute / 1440) * 1440 + 600;
    const sh = s.entities.pc.sheet;
    sh.hp = 1; sh.mp = 0; sh.sta = 0;
    return s;
}

// ------------------------------------------------------------------------------------------------ C2 time and recovery
test('PULSE C2: 1/5/15/20/29 min are booked in full with the event at their end; 30 cuts at 15, 31 at 15 or 16; recovery only for the booked minutes', async () => {
    const s = await wild();
    await withForce(DANGER, () => {
        for (const M of [1, 5, 15, 20, 29]) {
            const t = turn(s, [ACT('rest', M)]);
            const x = t.pulse.interrupt;
            assert.deepEqual({ at_end: x.at_end, after: x.after_min, of: x.of_min, cause: x.cause }, { at_end: true, after: M, of: M, cause: 'danger' }, `${M} min`);
            assert.equal(minutes(t.events), M, `${M} min booked in full`);
            assert.deepEqual(gains(t.events), gains(recoveryEvents(t.before, content, M, 'rest').events), `${M} min: the recovery of ${M} minutes`);
            assert.ok(t.extra.some((l) => l.startsWith('REST INTERRUPTED') && l.includes(`at the end of his ${M} min rest`)), t.extra.join('\n'));
        }
        const thirty = turn(s, [ACT('rest', 30)]);
        assert.deepEqual([thirty.pulse.interrupt.at_end, thirty.pulse.interrupt.after_min], [false, 15]);
        assert.equal(minutes(thirty.events), 15);
        const seen = new Set();
        for (let n = 1; n <= 40; n++) {
            const t = turn(s, [ACT('rest', 31)], { turnNo: s.turn + n });
            seen.add(t.pulse.interrupt.after_min);
            assert.equal(minutes(t.events), t.pulse.interrupt.after_min);
        }
        assert.deepEqual([...seen].sort(), [15, 16], 'both minutes 15 and 16 occur for 31');
    });
});

test('PULSE C2: a long rest is cut at a deterministic minute in [15, M-15]; never negative, never more time or recovery than booked; full rest recovers more', async () => {
    const s = await wild();
    const full = await withForce({ open: false }, () => turn(s, [ACT('sleep', 480)]));
    assert.equal(minutes(full.events), 480);
    const fullHp = gains(full.events).hp;
    await withForce(DANGER, () => {
        let shorter = 0;
        for (let n = 1; n <= 60; n++) {
            const t = turn(s, [ACT('sleep', 480)], { turnNo: s.turn + n });
            const m = t.pulse.interrupt.after_min;
            assert.ok(m >= 15 && m <= 465, `m=${m}`);
            assert.equal(minutes(t.events), m);
            assert.ok(t.events.filter((e) => e.t === 'time.advanced').every((e) => e.d.minutes > 0));
            assert.deepEqual(gains(t.events), gains(recoveryEvents(t.before, content, m, 'sleep').events), 'the existing recovery of those minutes');
            if ((gains(t.events).hp ?? 0) < fullHp) shorter++;
            assert.equal(t.s.clock.minute, t.before.clock.minute + m);
            // the same seed and turn: the same minute
            assert.equal(turn(s, [ACT('sleep', 480)], { turnNo: s.turn + n }).pulse.interrupt.after_min, m);
        }
        assert.ok(shorter > 50, 'a cut rest recovers less than the full one');
    });
});

test('PULSE C2: over midnight the cut minute is the clock\'s own (the day turns, the day part follows the clock)', async () => {
    const s = await wild();
    await withForce(DANGER, () => {
        const t = turn(s, [ACT('sleep', 480)], { clock: 23 * 60 + 50, turnNo: s.turn + 7 });
        const x = t.pulse.interrupt;
        assert.equal(x.minute, t.before.clock.minute + x.after_min);
        assert.equal(t.s.clock.minute, x.minute);
        assert.ok(t.extra.some((l) => l.includes(`at ${formatClock(x.minute)}, after ${x.after_min} of the 480 min`)), t.extra.join('\n'));
        assert.equal(t.pulse.phase, 'night');
        if (x.after_min > 10) assert.ok(Math.floor(t.s.clock.minute / 1440) > Math.floor(t.before.clock.minute / 1440), 'the day turned');
    });
});

// ------------------------------------------------------------------------------------------------ C3 where he pauses
test('PULSE C3: a safe lodging is never cut short (no danger, obstacle or trouble; peaceful events stay possible); a wild camp is', async () => {
    const s = await wild();
    assert.equal(pauseSafety(s, content, HALL), 'safe');
    assert.equal(pauseSafety(s, content, TOWN), 'street');
    assert.equal(pauseSafety(s, content, REALM), 'exposed');
    await withForce(DANGER, () => {
        const inn = turn(s, [ACT('sleep', 480)], { at: HALL });
        assert.equal(inn.pulse.interrupt, undefined);
        assert.ok(!['danger', 'obstacle', 'trouble'].includes(inn.pulse.kind), inn.pulse.kind);
        assert.equal(minutes(inn.events), 480);
        assert.deepEqual(gains(inn.events), gains(recoveryEvents(inn.before, content, 480, 'sleep').events));
        assert.ok(inn.extra.some((l) => /before he settles or as his sleep ends/.test(l)), 'a peaceful event before he settles or as he wakes');
    });
    await withForce({ open: true }, () => {
        for (let n = 1; n <= 40; n++) {
            const t = turn(s, [ACT('sleep', 480)], { at: HALL, turnNo: s.turn + n });
            assert.equal(t.pulse.interrupt, undefined);
            assert.equal(minutes(t.events), 480);
        }
    });
    await withForce({ open: true, kind: 'obstacle' }, () => {
        const camp = turn(s, [ACT('sleep', 480)]);
        assert.equal(camp.pulse.safety, 'exposed');
        assert.equal(camp.pulse.interrupt.cause, 'obstacle');
        assert.ok(minutes(camp.events) < 480);
    });
    await withForce({ open: true, kind: 'strange' }, () => assert.equal(turn(s, [ACT('rest', 60)]).pulse.interrupt.cause, 'strange'));
    // what does not cut short out in the land: a meeting or a trace happens before he settles or as it ends
    await withForce({ open: true, kind: 'trace' }, () => {
        const t = turn(s, [ACT('rest', 60)]);
        assert.equal(t.pulse.interrupt, undefined);
        assert.equal(minutes(t.events), 60);
    });
});

test('PULSE C3: a street pause is cut short only by trouble (nobody takes or strikes first), never by danger', async () => {
    const s = await wild();
    await withForce({ open: true, kind: 'trouble' }, () => {
        const t = turn(s, [ACT('wait', 60)], { at: TOWN });
        assert.equal(t.pulse.safety, 'street');
        assert.equal(t.pulse.interrupt.cause, 'trouble');
        assert.ok(t.extra.some((l) => /nobody takes anything of his or strikes first/.test(l)));
        assert.equal(t.events.filter((e) => e.t === 'resource.changed').length, 0, 'waiting recovers nothing');
    });
    await withForce(DANGER, () => {
        for (let n = 1; n <= 20; n++) {
            const t = turn(s, [ACT('wait', 60)], { at: TOWN, turnNo: s.turn + n });
            assert.notEqual(t.pulse.kind, 'danger');
            if (t.pulse.interrupt) assert.equal(t.pulse.interrupt.cause, 'trouble');
        }
    });
});

test('PULSE C3: no cut inside a Dungeon without a living record (the package A exclusion; a Living Dungeon: tests/v4/pulse_b.test.js), with a threat present (held) or in a fight: booked in full, no roll', async () => {
    const s = await wild();
    await withForce(DANGER, () => {
        const d = clone(s);
        d.places['loc.cave'] = { id: 'loc.cave', name: 'Cave', kind: 'site', parent: REALM, realm: REALM, tags: [], dungeon: { real: true } };
        d.places['loc.cave.hall'] = { id: 'loc.cave.hall', name: 'Hall', kind: 'interior', parent: 'loc.cave', realm: REALM, tags: [] };
        const inside = turn(d, [ACT('rest', 120)], { at: 'loc.cave.hall' });
        assert.equal(rolled(inside.events).length, 0);
        assert.equal(minutes(inside.events), 120);
        assert.equal(inside.pulse?.interrupt, undefined);
        const h = clone(s);
        h.entities['cr.wolf'] = { id: 'cr.wolf', kind: 'creature', species: 'grey wolf', status: 'alive', threat: true };
        h.scene.present = ['pc', 'cr.wolf'];
        const held = turn(h, [ACT('rest', 120)]);
        assert.equal(held.pulse.reason, 'held');
        assert.equal(rolled(held.events).length, 0);
        assert.equal(minutes(held.events), 120);
        const f = clone(s); f.encounter = { id: 'enc.x' };
        assert.equal(pulseBegin(f, content, [ACT('rest', 60)], { c: true }).reason, 'combat');
    });
});

// ------------------------------------------------------------------------------------------------ C4 later steps
const statuses = (t) => t.res.map((r) => `${r.status}${r.reason ? `:${r.reason}` : ''}`);
test('PULSE C4: rest alone and rest with steps after it are equally dangerous: the same cut, later steps refused and unbooked, steps that need them too', async () => {
    const s = await wild();
    await withForce(DANGER, () => {
        const alone = turn(s, [ACT('rest', 180)]);
        for (const later of [[LOOK], [TAKE()], [GO(TOWN, 'then go to Alderwatch')], [TAKE(), GO(TOWN, 'and head to Alderwatch')], [TAKE(), { ...GO(TOWN, 'and head on'), needs: 2 }]]) {
            const t = turn(s, [ACT('rest', 180), ...later]);
            const { later: n, ...cut } = t.pulse.interrupt;
            const { later: none, ...cutAlone } = alone.pulse.interrupt;
            assert.deepEqual(cut, cutAlone, JSON.stringify(later));
            assert.deepEqual([none, n], [0, later.length], 'the cut counts the later steps it stops');
            assert.equal(minutes(t.events), alone.pulse.interrupt.after_min);
            assert.deepEqual(statuses(t).slice(1), later.map(() => 'refused:rest interrupted'));
            assert.deepEqual(t.ctx.auth.take, []);
            assert.deepEqual(t.ctx.auth.gos, []);
            assert.equal(t.ctx.auth.road, undefined, 'no leg was authorized');
            assert.ok(t.actions.slice(1).every((l) => /NOT DONE — .*REST INTERRUPTED.*he decides again/.test(l)), t.actions.join('\n'));
            assert.ok(t.extra.some((l) => /his later steps of this message wait \(NOT DONE\)/.test(l)));
            assert.ok(!alone.extra.some((l) => /later steps/.test(l)), 'rest alone: no later steps to name');
            assert.equal(rolled(t.events).length, 1);
        }
    });
});

test('PULSE C4 (§14.2): wait 5 + GO and rest 20 + take: danger at the pause\'s end stops the later step; a peaceful window or none lets it run', async () => {
    const s = await wild();
    for (const [pause, next] of [[ACT('wait', 5, 'I wait five minutes'), GO(TOWN, 'then set out for Alderwatch')], [ACT('rest', 20, 'I rest twenty minutes'), TAKE()]]) {
        const danger = await withForce(DANGER, () => turn(s, [pause, next]));
        assert.equal(danger.pulse.interrupt.at_end, true);
        assert.equal(minutes(danger.events), pause.minutes, 'the short pause is booked in full');
        assert.deepEqual(statuses(danger).slice(1), ['refused:rest interrupted']);
        assert.deepEqual([danger.ctx.auth.gos.length, danger.ctx.auth.take.length], [0, 0]);
        assert.match(danger.actions[1], /^2\. NOT DONE/);
        const peaceful = await withForce({ open: true, kind: 'meeting' }, () => turn(s, [pause, next]));
        assert.equal(peaceful.pulse.interrupt, undefined);
        assert.ok(['authorized', 'resolved'].includes(peaceful.res[1].status), statuses(peaceful).join());
        assert.ok(peaceful.extra.some((l) => /at the end of step 1, before his next steps/.test(l)));
        const none = await withForce({ open: false }, () => turn(s, [pause, next]));
        assert.ok(['authorized', 'resolved'].includes(none.res[1].status));
        assert.equal(none.extra.filter((l) => /PULSE|REST INTERRUPTED/.test(l)).length, 0);
    }
});

test('PULSE C4: GO before a rest keeps "arrival pending" (no pause claim); an unbooked rest (no duration) claims nothing', async () => {
    const s = await wild();
    await withForce(DANGER, () => {
        const t = turn(s, [GO(TOWN, 'I go to Alderwatch'), ACT('rest', 60, 'and rest there')]);
        assert.deepEqual(statuses(t).slice(1), ['refused:arrival pending']);
        assert.equal(t.pulse.exposure, 'travel');
        assert.equal(t.pulse.interrupt, undefined);
        const ask = turn(s, [{ type: 'activity', kind: 'rest', what: null, minutes: null, until: null, quote: 'I rest a while' }]);
        assert.equal(ask.res[0].status, 'clarify');
        assert.equal(ask.pulse.exposure, 'scene');
        assert.equal(ask.pulse.interrupt, undefined);
        assert.equal(minutes(ask.events), 0);
    });
});

// ------------------------------------------------------------------------------------------------ one draw
test('PULSE C1: exactly one draw per message: the pause claims it, pulseFinish draws no second; two pauses, one draw; the streak moves once', async () => {
    const s = await wild();
    s.pulse = { v: 1, misses: 3, recent: [], pause: null };
    const closed = await withForce({ open: false }, () => turn(s, [ACT('rest', 60), ACT('wait', 30), LOOK]));
    assert.equal(rolled(closed.events).length, 1);
    assert.equal(closed.s.pulse.misses, 4);
    assert.equal(minutes(closed.events), 90, 'without a window both pauses run in full');
    assert.equal(closed.pulse.exposure, 'pause');
    const cut = await withForce(DANGER, () => turn(s, [ACT('rest', 60), ACT('wait', 30)]));
    assert.equal(rolled(cut.events).length, 1);
    assert.equal(cut.s.pulse.misses, 0);
    assert.deepEqual(statuses(cut), ['resolved', 'refused:rest interrupted']);
    // the event is in the record before the pause's time and recovery
    const order = cut.events.map((e) => e.t);
    assert.ok(order.indexOf('pulse.rolled') < order.indexOf('time.advanced'));
    assert.equal(rolled(cut.events)[0].d.interrupt.after_min, cut.pulse.interrupt.after_min);
    // the unforced draw: the same key as package A (seed|turn|pulse), the cut minute its own key
    const real = turn(s, [ACT('rest', 60)]);
    assert.equal(rolled(real.events).length, 1);
    assert.equal(real.pulse.exposure, 'pause');
});

test('PULSE C1: the pause block and split waiting: one window per block; a cut pause is not cut again in the next turn of the block', async () => {
    let s = await wild();
    const first = await withForce({ open: true, kind: 'strange' }, () => turn(s, [ACT('rest', 120)]));
    assert.ok(first.pulse.interrupt);
    s = first.s;
    for (let k = 0; k < 5; k++) {
        const t = await withForce(DANGER, () => turn(s, [ACT('wait', 1)], { input: `I wait a minute ${k}` }));
        assert.equal(t.pulse.reason, 'pause_block');
        assert.equal(rolled(t.events).length, 0);
        assert.equal(minutes(t.events), 1);
        s = t.s;
    }
});

// ------------------------------------------------------------------------------------------------ host: records, fact line, correction
/** Out in the land: before the gate of the Old Crown Catacombs (the gate is the land outside), a camp for the night. */
async function campRest(force = DANGER) {
    const g = await campaign(content);
    await walk(g, CATA, { text: '*I walk to the Old Crown Catacombs*', prose: 'He reaches the old gate.' });
    assert.equal(g.state().scene.at, CATA);
    assert.equal(pauseSafety(g.state(), content), 'exposed', g.state().scene.at);
    content.rules.pulse.force = force;
    await say(g, '*I make camp and sleep for eight hours*', ACT('sleep', 480, 'I make camp and sleep for eight hours'));
    return g;
}

test('PULSE C persistence: swipe, regenerate, edit and reload give the same cut, the same minutes and the same recovery; the fold is identical', async () => {
    const was = content.rules.pulse.force;
    try {
        const g = await campRest();
        const evs = () => lastUser(g).events;
        const first = outcomeOf(g).auth.pulse;
        assert.ok(first.interrupt, JSON.stringify(first));
        const sig = () => JSON.stringify([outcomeOf(g).auth.pulse, minutes(evs()), gains(evs())]);
        const want = sig();
        for (const type of ['swipe', 'regenerate']) {
            await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
            assert.equal(sig(), want, type);
        }
        g.chat.at(-1).mes = '*I make a camp and sleep the night*';
        g.plans = [JSON.stringify({ commands: [{ seq: 1, ...ACT('sleep', 480, 'I make a camp and sleep the night') }] })];
        await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
        assert.equal(sig(), want, 'edit of the last message: the same state, the same draw, the same cut');
        await g.reply('Steel rings in the dark; he is up at once.', { expected: {}, deltas: [] });
        const folded = foldChat(structuredClone(g.chat)).state;
        assert.deepEqual(folded, g.state());
        assert.deepEqual(validateState(folded, content), []);
        assert.equal(rec(g.chat.at(-2)).events.filter((e) => e.t === 'pulse.rolled').length, 1);
    } finally { content.rules.pulse.force = was; }
});

test('PULSE C5: the narrator hears the cause, the planned and booked minutes and the booked recovery; the next turn has the fact line once', async () => {
    const was = content.rules.pulse.force;
    try {
        const g = await campRest();
        const o = outcomeOf(g);
        const x = o.auth.pulse.interrupt;
        const all = [...o.actions, ...o.extra].join('\n');
        assert.match(all, new RegExp(`CUT SHORT by the engine after ${x.after_min} of the 480 minutes`));
        assert.match(all, /Recovery booked: /);
        assert.match(all, new RegExp(`REST INTERRUPTED \\(the engine's; night|REST INTERRUPTED \\(the engine's; (day|evening)`));
        assert.match(all, new RegExp(`after ${x.after_min} of the 480 min he chose for his sleep \\(booked: ${x.after_min} min, recovery for those minutes only\\): ONE group of this land's people or creatures comes upon him`));
        assert.match(all, /what he does now is his decision/);
        content.rules.pulse.force = null;
        await g.reply('At the edge of the firelight three bandits draw steel and attack him.', { expected: {}, deltas: [
            { seq: 1, type: 'person.new', ref: 'bandits', name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
            { seq: 2, type: 'hostile', by: ['bandits'] }] });
        assert.ok(g.state().encounter || (g.state().pending_combat || []).length, 'the danger group may attack (the existing firewall)');
        const fact = (u) => JSON.stringify(turnBlock(g.chat, u, content).context);
        g.chat.push({ mes: '*I draw my blade*', is_user: true, is_system: false, extra: {} });
        const next = fact(g.chat.length - 1);
        assert.equal((next.match(/REST CUT SHORT \(the engine's, last turn\)/g) || []).length, 1, next.slice(0, 400));
        assert.ok(next.includes(`after ${x.after_min} of 480 min of his sleep`));
        assert.ok(!/REST INTERRUPTED \(the engine's, last turn\)/.test(next), 'the reply showed the cause: no correction');
        g.chat.pop();
        assert.deepEqual(restCutFacts([]), []);
    } finally { content.rules.pulse.force = was; }
});

test('PULSE C5: a reply that did not show a cause with a figure gets a correction from the event; obstacle needs none; no new fight is made for it', async () => {
    const was = content.rules.pulse.force;
    try {
        const g = await campRest();
        content.rules.pulse.force = null;
        await g.reply('He sleeps on and wakes at dawn, rested.', { expected: {}, deltas: [] });
        const r = rec(g.chat.at(-1));
        const x = outcomeOf(g).auth.pulse.interrupt;
        assert.ok(r.corrections.some((c) => c.startsWith(`REST INTERRUPTED (the engine's, last turn): the last reply did not show what cut his sleep short at ${formatClock(x.minute)}`) && /bring in no new attacker or fight/.test(c)), JSON.stringify(r.corrections));
        assert.equal(g.state().encounter, null);
        g.chat.push({ mes: '*I look around*', is_user: true, is_system: false, extra: {} });
        const ctx = JSON.stringify(turnBlock(g.chat, g.chat.length - 1, content).context);
        assert.equal((ctx.match(/REST CUT SHORT/g) || []).length, 1);
        assert.equal((ctx.match(/did not show what cut his sleep short/g) || []).length, 1);
        g.chat.pop();
        const ob = await campRest({ open: true, kind: 'obstacle' });
        content.rules.pulse.force = null;
        await ob.reply('He sleeps on and wakes at dawn.', { expected: {}, deltas: [] });
        assert.ok(!rec(ob.chat.at(-1)).corrections.some((c) => /did not show what/.test(c)));
    } finally { content.rules.pulse.force = was; }
});

test('PULSE C5: the fact line is once: the turn after the next has none', async () => {
    const was = content.rules.pulse.force;
    try {
        const g = await campRest();
        content.rules.pulse.force = null;
        await g.reply('Bandits! He is up.', { expected: {}, deltas: [] });
        await say(g, '*I look around*', LOOK);
        await g.reply('The night is still.', { expected: {}, deltas: [] });
        g.chat.push({ mes: '*I walk on*', is_user: true, is_system: false, extra: {} });
        const ctx = JSON.stringify(turnBlock(g.chat, g.chat.length - 1, content).context);
        assert.ok(!/REST CUT SHORT/.test(ctx));
        g.chat.pop();
    } finally { content.rules.pulse.force = was; }
});

test('PULSE C: a trouble cut in the street lets nobody new take his things or strike first (the A firewall)', async () => {
    const s = await wild();
    const t = await withForce({ open: true, kind: 'trouble' }, () => turn(s, [ACT('wait', 60)], { at: TOWN }));
    t.s.last.outcome = { c: true, kind: 'v4', auth: { ...t.ctx.auth, c: true }, expected_keys: {} };
    t.s.mode = 'story';
    const r = applyWorld(t.s, content, { scene: 'here', expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'thief', name: null, role: 'thief', desc: ['ragged thief'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
        { seq: 2, type: 'hostile', by: ['thief'] }] }, { msg: 60, prose: 'A ragged thief lunges at him.' });
    assert.ok(r.rejected.some((x) => x.rule === 'pulse'), JSON.stringify(r.rejected));
    assert.equal(r.state.encounter, null);
});

test('PULSE C3: out in the land a roof is a safe lodging (a millhouse, a hearth room, a granted lodging); willows and a fold\'s edge are exposed', async () => {
    const s = await wild();
    const site = (id, name, kind = 'site') => { s.places[id] = { id, name, kind, parent: REALM, realm: REALM, tags: [] }; return id; };
    for (const [name, safety] of [['the Millrace millhouse', 'safe'], ['the orchard house at Thornhollow', 'safe'], ['the hearth room', 'safe'], ['an old woodcutter\'s hut', 'safe'],
        ['the willows over the next slide', 'exposed'], ['oak fold\'s edge', 'exposed'], ['the mushroom ring', 'exposed'], ['a shuttered market', 'exposed']])
        assert.equal(pauseSafety(s, content, site(`loc.t${name.length}${safety}`, name)), safety, name);
    assert.equal(pauseSafety(s, content, site('loc.dark', 'the dark', 'interior')), 'safe', 'a place the story made an interior');
    const camp = site('loc.camp', 'a clearing');
    assert.equal(pauseSafety(s, content, camp), 'exposed');
    s.services = [...(s.services || []), { service: 'lodging', at: camp, minute: s.clock.minute, turn: s.turn }];
    assert.equal(pauseSafety(s, content, camp), 'safe', 'a lodging he was granted here');
    await withForce(DANGER, () => {
        const t = turn(s, [ACT('sleep', 480)], { at: site('loc.mill', 'the Millrace millhouse') });
        assert.equal(t.pulse.frame, 'wild', 'the frame stays package A\'s');
        assert.equal(t.pulse.safety, 'safe');
        assert.equal(t.pulse.interrupt, undefined);
        assert.equal(minutes(t.events), 480);
    });
});
