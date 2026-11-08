// PULSE package B (.167; patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md §6 B, §12.5, §14.2, §16): the window
// inside a Living Dungeon. Its danger is only ever a free minion slot of his level and cycle (living.js wanderSlot),
// bound for the reply by the existing dungeon.ahead (wander) with the draw and met only by a valid creature
// (dungeon.slot); DUNGEON AHEAD turns draw nothing; a turn holds one encounter reference in every order of steps;
// pacing, clears and the guardian are as without it. Host path: planner turns, narrator replies, extractor answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, delve, hero, fightAll, living, inject, outcomeOf, lastUser, linesOf, slotDelta, GO, CATA } from './patch8_lib.js';
import { wanderSlot, slotMet, resolved, nextSlot, applyLivingEvent } from '../../src/v4/living.js';
import { aheadReserved, pulseBegin } from '../../src/v4/pulse.js';
import { resolveCommands, recoveryEvents } from '../../src/v4/commands.js';
import { applyEvent } from '../../src/state.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { validateState } from '../../src/validate.js';
import { clone } from '../../src/util.js';
import { Dice } from '../../src/rng.js';

const content = await loadProductContent();
const LOOK = { type: 'other', what: 'look around', quote: 'I look around the gallery' };
const REST = (minutes = 120, quote = 'I rest against the wall') => ({ type: 'activity', kind: 'rest', what: null, minutes, until: null, quote });
const DEEPER = GO({ new: 'deeper' }, 'then go on deeper');
const ev = (r, t) => (r?.events || []).filter((e) => e.t === t);
const mins = (events) => events.filter((e) => e.t === 'time.advanced').reduce((a, e) => a + e.d.minutes, 0);
async function withForce(force, fn) {
    const was = content.rules.pulse.force;
    content.rules.pulse.force = force;
    try { return await fn(); } finally { content.rules.pulse.force = was; }
}
const DANGER = { open: true, kind: 'danger' };
const floor1 = (g) => living(g).run.floors[1];
const slotOf = (g, id) => floor1(g).slots.find((sl) => sl.id === id);

/** In the First Burial Gallery of level 1, its first encounter fought: the gallery minion free, the warden after it. */
async function gallery() {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The chapel; a stair goes down.' });
    await delve(g, 'First Burial Gallery');
    await fightAll(g);
    assert.equal(g.state().encounter, null);
    assert.deepEqual(floor1(g).slots.map((sl) => [sl.id, sl.role, slotMet(sl)]), [['bones', 'minion', true], ['gallery', 'minion', false], ['warden', 'guard', false]]);
    return g;
}

// ------------------------------------------------------------------------------------------------ the slot
test('PULSE B3: wanderSlot: the first free minion of his level and cycle; never a met, taken or filled slot, a guard or a boss, another level', async () => {
    const g = await gallery();
    const s = g.state();
    assert.equal(wanderSlot(s, CATA, 1).id, 'gallery');
    assert.equal(wanderSlot(s, CATA, 2).id, 'ghouls', 'only the level asked for (level 2 has its own)');
    assert.equal(wanderSlot(s, CATA, 0), null, 'the gate has none');
    const t = clone(s); t.dungeons[CATA].run.floors[1].slots[1].taken = { party: 'party.x' };
    assert.equal(wanderSlot(t, CATA, 1), null, 'a slot a company took: none (the guard never wanders)');
    const f = clone(s); f.dungeons[CATA].run.floors[1].slots[1].entities = ['cr.x'];
    assert.equal(wanderSlot(f, CATA, 1), null, 'a slot with creatures of its own');
    const b = clone(s); b.dungeons[CATA].run.floors[2].slots[0].at = 'somewhere';
    assert.equal(wanderSlot(b, CATA, 2), null, 'the boss never wanders');
    // a renewal: the new cycle's run (the slots of this cycle only)
    const r = clone(s);
    const floors = { 1: { ...clone(r.dungeons[CATA].run.floors[1]), slots: r.dungeons[CATA].run.floors[1].slots.map((sl) => ({ ...sl, ref: sl.ref.replace('_c1_', '_c2_'), at: null, met_turn: null, entities: [] })) } };
    applyLivingEvent(r, { t: 'dungeon.reset', d: { id: CATA, cycle: 2, cycle_start: r.clock.minute, floors } });
    assert.equal(wanderSlot(r, CATA, 1).ref, floors[1].slots[0].ref);
});

// ------------------------------------------------------------------------------------------------ exploring
test('PULSE B1/B4/B7: looking around with a danger window: the free minion comes to him here, bound by one dungeon.ahead; the reply\'s creature fills its slot at its levels; the fight is the usual one', async () => {
    const g = await gallery();
    const parts = floor1(g).parts;
    await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK));
    const u = lastUser(g);
    const p = outcomeOf(g).auth.pulse;
    assert.deepEqual([p.rolled, p.frame, p.kind, p.governs], [true, 'dungeon', 'danger', false]);
    const aheads = ev(u, 'dungeon.ahead');
    assert.equal(aheads.length, 1);
    assert.deepEqual(aheads[0].d.ahead, { turn: g.state().turn, cycle: living(g).cycle, floor: 1, slot: 'gallery', ref: slotOf(g, 'gallery').ref, wander: true });
    assert.match(linesOf(g), /PULSE \(the engine's; level 1\) — DANGER: 2 restless skeletons of this level come to him here/);
    assert.doesNotMatch(linesOf(g), /DUNGEON AHEAD/);
    const cat = extractorCatalog(g.state(), content, { c: true }).text;
    assert.match(cat, /when the reply shows the restless skeletons coming to him here, report creature\.new ref/);
    const sl = slotOf(g, 'gallery');
    await g.reply('Two restless skeletons shamble out of a side niche toward him.', { expected: {}, deltas: [slotDelta(sl, 1)] });
    const met = slotOf(g, 'gallery');
    assert.ok(slotMet(met) && met.entities.length === 2);
    for (const [i, id] of met.entities.entries()) assert.equal(g.state().entities[id].profile.level, sl.levels[i], 'the slot\'s levels');
    assert.equal(floor1(g).parts, parts, 'no new part: run.parts unchanged');
    await fightAll(g);
    assert.ok(resolved(g.state(), slotOf(g, 'gallery')));
    assert.deepEqual(validateState(g.state(), content), []);
});

test('PULSE B2: a peaceful window (trace) reserves nothing and is no fight; a search draws as well; without a free minion no danger', async () => {
    const g = await gallery();
    await withForce({ open: true, kind: 'trace' }, () => say(g, '*I look around the gallery*', LOOK));
    assert.equal(ev(lastUser(g), 'dungeon.ahead').length, 0);
    assert.match(linesOf(g), /PULSE \(the engine's; level 1\) — ONE thing happens around him that he notices: a TRACE or FIND.*No foe: the level's foes come only as the engine adds them/);
    await g.reply('Old scratches on the floor.', { expected: {}, deltas: [] });
    await withForce({ open: false }, () => say(g, '*I search the niches*', { type: 'activity', kind: 'search', what: 'the niches', minutes: null, until: null, quote: 'I search the niches' }));
    assert.equal(outcomeOf(g).auth.pulse.rolled, true, 'a search in the Dungeon draws');
    await g.reply('Dust and bones.', { expected: {}, deltas: [] });
    // the free minion gone: a forced danger draws no danger (its share falls away), no reservation
    inject(g, [{ t: 'dungeon.slot', d: { id: CATA, cycle: living(g).cycle, floor: 1, slot: 'gallery', set: { taken: { party: 'party.test' } } } }]);
    await withForce(DANGER, () => say(g, '*I look around again*', { ...LOOK, quote: 'I look around again' }));
    const p = outcomeOf(g).auth.pulse;
    assert.notEqual(p.kind, 'danger');
    assert.equal(ev(lastUser(g), 'dungeon.ahead').length, 0);
});

test('PULSE B4: an untold danger meets nothing (the slot stays free); a creature of no slot stays refused (dungeon_foe); a creature already here is held (no draw)', async () => {
    const g = await gallery();
    await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK));
    await g.reply('He listens; nothing comes.', { expected: {}, deltas: [] });
    assert.ok(!slotMet(slotOf(g, 'gallery')) && !slotOf(g, 'gallery').entities.length, 'not met, not consumed');
    assert.ok(rec(g.chat.at(-1)).corrections.every((c) => !/did not show what/.test(c)), 'no rest cut, no rest correction');
    await withForce(DANGER, () => say(g, '*I look around once more*', { ...LOOK, quote: 'I look around once more' }));
    const r = await g.reply('A ghoul lurches in.', { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'ghoul', species: 'ghoul', anchor: 'ghoul', desc: ['ghoul'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: true, more: null }] });
    assert.ok(ev(r.record, 'delta.rejected').some((e) => e.d.rule === 'dungeon_foe'), 'a ghoul is no encounter of this level');
    // the wandering minion now met and present: the next turn is held (no draw)
    await withForce(DANGER, () => say(g, '*I look around a third time*', { ...LOOK, quote: 'I look around a third time' }));
    await g.reply('They come.', { expected: {}, deltas: [slotDelta(slotOf(g, 'gallery'), 1)] });
    if (!g.state().encounter) {
        await say(g, '*I watch them*', { ...LOOK, quote: 'I watch them' });
        assert.ok(['held', 'combat'].includes(outcomeOf(g).auth.pulse.reason), JSON.stringify(outcomeOf(g).auth.pulse));
    }
});

test('PULSE B1: a DUNGEON AHEAD turn draws nothing and holds exactly the engine\'s one reference', async () => {
    const g = await gallery();
    await withForce(DANGER, () => say(g, '*I go on deeper*', GO({ new: 'deeper' }, 'I go on deeper')));
    const u = lastUser(g);
    assert.equal(ev(u, 'pulse.rolled').length, 0);
    assert.equal(outcomeOf(g).auth.pulse.reason, 'dungeon_ahead');
    assert.equal(ev(u, 'dungeon.ahead').length, 1);
    assert.equal(ev(u, 'dungeon.ahead')[0].d.ahead?.wander, undefined);
});

// ------------------------------------------------------------------------------------------------ pacing, clear, XP
async function toWarden(g, { wander }) {
    const log = [];
    if (wander) {
        await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK));
        await g.reply('Two restless skeletons come out of a niche.', { expected: {}, deltas: [slotDelta(slotOf(g, 'gallery'), 1)] });
        await fightAll(g);
        log.push('wander gallery');
    }
    for (let i = 0; i < 6 && !floor1(g).cleared; i++) {
        const r = await withForce({ open: false }, () => delve(g, `Part 1.${i + 2}`));
        log.push(r.slot ? `delve ${r.slot.id}` : 'delve quiet');
        await fightAll(g);
    }
    return log;
}
test('PULSE B5: a minion that wandered early: no extra encounter, the same foes and levels, one clear by him, the same XP; the parts to the warden as without it', async () => {
    const a = await gallery();
    const withWander = await toWarden(a, { wander: true });
    const b = await gallery();
    const without = await toWarden(b, { wander: false });
    assert.deepEqual(withWander, ['wander gallery', 'delve quiet', 'delve quiet', 'delve warden']);
    assert.deepEqual(without, ['delve gallery', 'delve quiet', 'delve warden']);
    for (const g of [a, b]) {
        const f = floor1(g);
        assert.ok(f.cleared && f.cleared.credit === 'pc');
        assert.equal(living(g).clears.filter((c) => c.floor === 1).length, 1, 'one clear');
        assert.ok(f.slots.every((sl) => resolved(g.state(), sl)));
        assert.equal(f.parts, 4, 'run.parts counts the parts he went into, nothing for the wanderer');
    }
    const foes = (g) => Object.values(g.state().entities).filter((e) => e.slot?.dungeon === CATA && e.slot.floor === 1).map((e) => `${e.slot.id}:${e.profile.level}`).sort();
    assert.deepEqual(foes(a), foes(b), 'the same individuals by slot and level');
    assert.equal(a.state().entities.pc.sheet.xp, b.state().entities.pc.sheet.xp, 'the same XP');
    assert.equal(a.state().entities.pc.sheet.level, b.state().entities.pc.sheet.level);
});

// ------------------------------------------------------------------------------------------------ rest (package C)
async function restThenGo(force) {
    const g = await gallery();
    const before = clone(g.state());
    await withForce(force, () => say(g, '*I rest, then go on deeper*', REST(120, 'I rest against the wall'), DEEPER));
    const u = lastUser(g);
    return { g, before, u, o: outcomeOf(g), aheads: ev(u, 'dungeon.ahead') };
}
test('PULSE B6 (1): rest then GO with a Dungeon danger: the wanderer reserved at the claim, the rest cut short with it as cause, the GO "rest interrupted", no DUNGEON AHEAD', async () => {
    const { g, before, u, o, aheads } = await restThenGo(DANGER);
    const x = o.auth.pulse.interrupt;
    assert.ok(x && !x.at_end && x.who === '2 restless skeletons');
    assert.equal(aheads.length, 1);
    assert.equal(aheads[0].d.ahead.wander, true);
    const order = u.events.map((e) => e.t);
    assert.ok(order.indexOf('dungeon.ahead') < order.indexOf('time.advanced'), 'reserved at the claim, before the booking');
    assert.equal(o.resolutions[1].reason, 'rest interrupted');
    assert.doesNotMatch(linesOf(g), /DUNGEON AHEAD/);
    assert.match(linesOf(g), /REST INTERRUPTED \(the engine's; level 1\) — .*2 restless skeletons of this level come upon him/);
    assert.equal(mins(u.events), x.after_min);
    const gains = Object.fromEntries(ev(u, 'resource.changed').map((e) => [e.d.resource, e.d.value]));
    assert.deepEqual(gains, Object.fromEntries(recoveryEvents(before, content, x.after_min, 'rest').events.map((e) => [e.d.resource, e.d.value])));
    // the reply brings them: the slot is met; the next turn has the C fact line once
    await g.reply('Mid-rest, two restless skeletons rise out of the niches.', { expected: {}, deltas: [slotDelta(slotOf(g, 'gallery'), 1), { seq: 2, type: 'time', minutes: 120 }] });
    assert.ok(slotMet(slotOf(g, 'gallery')));
    assert.equal(mins(rec(g.chat.at(-1)).events), 0, 'the cut stays (package C .165/.166)');
    g.chat.push({ mes: '*I raise my staff*', is_user: true, is_system: false, extra: {} });
    const ctx = JSON.stringify(turnBlock(g.chat, g.chat.length - 1, content).context);
    assert.equal((ctx.match(/REST CUT SHORT \(the engine's, last turn\).*?2 restless skeletons of this level came upon him/g) || []).length, 1);
    g.chat.pop();
});

test('PULSE B6 (2, 3): rest then GO with a peaceful or a closed window: no wanderer; the GO gets its DUNGEON AHEAD, one reference', async () => {
    for (const force of [{ open: true, kind: 'trace' }, { open: false }]) {
        const { g, o, aheads } = await restThenGo(force);
        assert.equal(o.auth.pulse.interrupt, undefined);
        assert.equal(aheads.length, 1, JSON.stringify(force));
        assert.equal(aheads[0].d.ahead?.wander, undefined);
        assert.equal(o.resolutions[1].status, 'authorized');
        assert.match(linesOf(g), /DUNGEON AHEAD \(the engine's\)/);
        if (force.open) assert.match(linesOf(g), /at the end of step 1, before his next steps/);
    }
});

test('PULSE B6 (4): GO then rest: DUNGEON AHEAD, the rest "arrival pending", no draw, one reference', async () => {
    const g = await gallery();
    await withForce(DANGER, () => say(g, '*I go on deeper and rest there*', GO({ new: 'deeper' }, 'I go on deeper'), REST(120, 'and rest there')));
    const u = lastUser(g), o = outcomeOf(g);
    assert.equal(o.resolutions[1].reason, 'arrival pending');
    assert.equal(ev(u, 'pulse.rolled').length, 0);
    assert.equal(ev(u, 'dungeon.ahead').length, 1);
    assert.equal(ev(u, 'dungeon.ahead')[0].d.ahead?.wander, undefined);
});

test('PULSE B6: the defensive invariant: with a reservation of this turn a GO places no second one', async () => {
    const g = await gallery();
    const s = clone(g.state());
    const events = [];
    const emit = (e) => { applyEvent(s, e); events.push(e); };
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: 'inv', input: 'I go on deeper' } });
    emit({ t: 'dungeon.ahead', d: { id: CATA, ahead: { turn: s.turn, cycle: s.dungeons[CATA].cycle, floor: 1, slot: 'gallery', ref: s.dungeons[CATA].run.floors[1].slots[1].ref, wander: true } } });
    assert.equal(aheadReserved(s, { pulse: null }, CATA), true);
    const n = events.length;
    const ctx = resolveCommands(s, content, [{ seq: 1, ...GO({ new: 'deeper' }, 'I go on deeper') }], emit, { c: true, msg: 1, dice: Dice.from(s) });
    assert.equal(events.slice(n).filter((e) => e.t === 'dungeon.ahead').length, 0, 'no second reference');
    assert.ok(!ctx.extra.some((l) => /DUNGEON AHEAD/.test(l)));
    assert.equal(s.dungeons[CATA].ahead.wander, true, 'the reservation is not overwritten');
    assert.equal(aheadReserved(s, { pulse: { reservedAhead: null } }, 'loc.other'), false);
});

// ------------------------------------------------------------------------------------------------ persistence
test('PULSE B persistence: swipe, regenerate and reload keep one reservation and one slot fill; an edit draws the same; the fold is identical', async () => {
    const g = await gallery();
    await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK));
    const first = JSON.stringify([outcomeOf(g).auth.pulse, ev(lastUser(g), 'dungeon.ahead')]);
    for (const type of ['swipe', 'regenerate']) {
        await prepareGenerationAsync(g.chat, g.content, { type, settings: { planner: true }, llm: g.llm });
        assert.equal(JSON.stringify([outcomeOf(g).auth.pulse, ev(lastUser(g), 'dungeon.ahead')]), first, type);
    }
    g.chat.at(-1).mes = '*I look about the gallery*';
    g.plans = [JSON.stringify({ commands: [{ seq: 1, ...LOOK, quote: 'I look about the gallery' }] })];
    await withForce(DANGER, () => prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm }));
    assert.equal(outcomeOf(g).auth.pulse.roll, JSON.parse(first)[0].roll);
    await g.reply('Two restless skeletons come for him.', { expected: {}, deltas: [slotDelta(slotOf(g, 'gallery'), 1)] });
    // a second reply to the same message (regenerate of the reply): the slot is filled once
    g.chat.pop();
    await prepareGenerationAsync(g.chat, g.content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    await g.reply('Two restless skeletons rise and come for him.', { expected: {}, deltas: [slotDelta(slotOf(g, 'gallery'), 1)] });
    const fills = g.chat.flatMap((m) => ev(rec(m), 'dungeon.slot')).filter((e) => e.d.slot === 'gallery');
    assert.equal(fills.length, 1);
    const folded = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(folded.dungeons, g.state().dungeons);
    assert.deepEqual(folded, g.state());
});

test('PULSE B persistence: a renewal between the draw and the reply drops the reservation: no foe outside the new cycle\'s slots, nothing of the old cycle met', async () => {
    const g = await gallery();
    await withForce(DANGER, () => say(g, '*I look around the gallery*', LOOK));
    const old = clone(slotOf(g, 'gallery'));
    const x = living(g);
    const floors = Object.fromEntries(Object.entries(x.run.floors).map(([n, f]) => [n, { ...clone(f), parts: 0, cleared: null, slots: f.slots.map((sl) => ({ ...sl, ref: sl.ref.replace(`_c${x.cycle}_`, `_c${x.cycle + 1}_`), at: null, met_turn: null, entities: [], taken: null })) }]));
    inject(g, [{ t: 'dungeon.reset', d: { id: CATA, cycle: x.cycle + 1, cycle_start: g.state().clock.minute, floors } }]);
    assert.equal(living(g).ahead, null);
    await g.reply('Two restless skeletons come for him.', { expected: {}, deltas: [slotDelta(old, 1)] });
    const s = g.state();
    for (const e of Object.values(s.entities).filter((y) => y.slot?.dungeon === CATA && y.status !== 'dead')) assert.equal(e.slot.cycle, x.cycle + 1, 'only a slot of the new cycle');
    assert.ok(!Object.values(s.entities).some((y) => y.slot?.cycle === x.cycle && y.slot.id === 'gallery'), 'the old cycle\'s gallery is never met');
    assert.deepEqual(validateState(s, content), []);
});

test('PULSE B: no window at the gate\'s own rules change; a Dungeon without a living record keeps package A\'s exclusion', async () => {
    const g = await gallery();
    const s = clone(g.state());
    // the fight ended on the same skill twice (a technical repeat since .168): a new input for this check
    s.inputs.at(-1).input = 'I look around the gallery';
    const P = pulseBegin(s, content, [LOOK], { c: true });
    assert.deepEqual([P.reason, P.governs, P.dungeon], [null, false, CATA]);
    const t = clone(s); delete t.dungeons[CATA];
    assert.equal(pulseBegin(t, content, [LOOK], { c: true }).reason, 'dungeon');
});

test('PULSE B6/C5: a Dungeon rest cut short by the wanderer whom the reply does not show: the correction names it; the slot stays free for later', async () => {
    const { g } = await restThenGo(DANGER);
    await g.reply('He rests and gets up after a while.', { expected: {}, deltas: [] });
    const r = rec(g.chat.at(-1));
    assert.ok(r.corrections.some((c) => /did not show what cut his rest short .*2 restless skeletons of this level came upon him/.test(c)), JSON.stringify(r.corrections));
    assert.ok(!slotMet(slotOf(g, 'gallery')), 'nothing met invisibly');
    const out = ev(r, 'pulse.outcome')[0]?.d;
    assert.equal(out?.persisted?.slots, 0);
});
