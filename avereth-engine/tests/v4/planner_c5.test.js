// Prototype C, build 4.3.0-c.5 (docs/PROTOTYPE_C.md §13): ordered multi-actions of one message. The live run of
// 04.10.2026 01:48 (tests/v4/live_1004.json: its events up to message 38, both versions of message 39 with their raw
// planner, narrator and extractor answers) went wrong twice: "go back to the guild and look at the quest board again"
// read the board against the roadside verge he started at (CANNOT READ, the narrator made him illiterate); "go back to
// the guild and take the Cull the Bog Striders quest ... make my way over to the eel weirs" had no id for the contract
// he had read that morning (the planner's catalog showed the board only inside the hall), the accept was refused, he
// set off for its site anyway and the narrator invented two new official listings that were stored as facts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, turnBlock } from '../../src/host.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { parsePlan, planContext, withContentSkills, plannerSystem } from '../../src/v4/planner.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1004.json'), 'utf8'));
const BOG = 'quest.cull_the_bog_striders_at_the_reed_flats_eel_weirs';
const HOUNDS = 'quest.clear_the_feral_hounds_from_the_tannery_row_bone_pits';
const HALL = 'loc.alderwatch.guild_hall';
const SLIP = `obj.slip.${BOG.slice('quest.'.length)}`;
const TAKE = fx.take.player; // "*i next go back to the guild and take the  Cull the Bog Striders quest and register it ad make my way over to the eel weirs*"

/** The live chat up to message 38 (Alaric resting on the verge outside Alderwatch, day 1, 14:59), the planner on. */
function live() {
    const g = new Chat4(content);
    g.chat = fx.messages.map((m, i) => ({ mes: i === 38 ? fx.recent : m.user ? '(player)' : '(reply)', is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    const ask = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('plan')) return ask(req);
        g.planRequest = req;
        const a = g.plans.shift();
        return a === undefined ? null : typeof a === 'string' ? a : JSON.stringify(a);
    };
    return g;
}
/** Events of the world before message 39 (added to the record of reply 38). */
const before = (g, ...events) => g.chat[38].extra.avereth.events.push(...events);
/** A player message with the planner's answer(s); `planner: false` plays it on A. */
async function say(g, text, plans, { planner = true, commands = [] } = {}) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [...plans];
    g.commands = commands;
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const last = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => last(g).events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
const block = (g) => turnBlock(g.chat, g.chat.findLastIndex((m) => m.is_user), content).context.text;
const plan = (...commands) => ({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const goHall = { type: 'go', to: HALL, quote: 'i next go back to the guild' };
const arrives = (...places) => ({ expected: Object.fromEntries(places.map(([k, at]) => [k, { arrived: true, at, with: null }])), deltas: [] });
const EEL_WEIRS = { new: { name: 'Eel Weirs', kind: 'site', parent: 'loc.alderwatch' } };
const takePlan = (needs = 2, quest = BOG) => plan(goHall, { type: 'quest.accept', quest, quote: 'take the  Cull the Bog Striders quest and register it' },
    { type: 'go', to: { new: 'the eel weirs' }, ...(needs ? { needs } : {}), quote: 'make my way over to the eel weirs' });

// ------------------------------------------------------------------------------------------------ 1. GO -> board.read
test('1. live #39 "go back to the guild and look at the quest board again": the board of the hall he goes to, read on arrival, never CANNOT READ', async () => {
    const g = live();
    await say(g, fx.board.player, fx.board.plan);
    // the planner's live answer, in its order
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.seq, r.type, r.status]), [[1, 'go', 'authorized'], [2, 'board.read', 'conditional']]);
    const [go, read] = outcomeOf(g).actions;
    assert.match(go, /^1\. GOES — to Adventurers' Guild hall, Alderwatch/);
    assert.match(read, /^2\. READS the Novice board, when he reaches the Guild hall — BOARD \(these listings now become canonical/);
    // the real canonical board of that hall: the four listings still on it (the hounds are his, not on the board)
    const listed = Object.values(g.state().quests).filter((q) => q.status === 'listed');
    assert.equal(listed.length, 4);
    for (const q of listed) assert.ok(read.includes(`**${q.title}**`), q.title);
    assert.ok(!read.includes('Clear the Feral Hounds'));
    assert.ok(!/CANNOT READ/.test(block(g)), 'the narrator is never told he cannot read');
    assert.equal(last(g).events.filter((e) => e.t === 'board.shown').length, 0, 'nothing seen before he gets there');
    // the reply brings him there: he sees the board; its listings are protected in that reply as on any first reading
    const x = await g.reply('He went back into the hall and read the board.', { ...arrives([1, HALL]), deltas: [{ seq: 1, type: 'listing.gone', listing: BOG, why: 'taken_by_other' }] });
    const t = x.record.events.map((e) => e.t);
    assert.ok(t.indexOf('scene.moved') < t.indexOf('board.shown'));
    assert.deepEqual(x.record.events.find((e) => e.t === 'cmd.completed').d, { seq: 2, ok: true, reason: null });
    assert.deepEqual((x.record.rejected || []).map((r) => r.rule), ['board_first_display']);
    assert.equal(g.state().quests[BOG].status, 'listed');
    // the same with the arrival as the extractor's own arrive delta (Decision Ownership: the arrival fires the read)
    const e = live();
    await say(e, fx.board.player, fx.board.plan);
    const w = await e.reply('He went back into the hall and read the board.', { ...arrives([1, HALL]), deltas: [{ seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null }] });
    assert.equal(w.record.events.filter((ev) => ev.t === 'board.shown').length, 1);
    // a reply that does not get him there: he has seen nothing
    const h = live();
    await say(h, fx.board.player, fx.board.plan);
    const y = await h.reply('He sat on in the grass a while longer.');
    assert.equal(y.record.events.filter((e) => e.t === 'board.shown').length, 0);
    assert.deepEqual(y.record.events.find((e) => e.t === 'cmd.expired').d, { seq: 2, reason: 'the condition did not happen in this reply' });
    // no Guild hall here and none ahead: where the board is, never whether he can read
    const n = live();
    await say(n, '*i look at the quest board*', [plan({ type: 'board.read', rank: null, quote: 'i look at the quest board' })]);
    assert.match(outcomeOf(n).actions[0], /^1\. NO BOARD HERE — the Guild's contract board hangs inside a Guild hall and he is not in one; he sees no listing this turn\.$/);
});

// ------------------------------------------------------------------------------------------------ 2. a known contract
test('2. the Bog Strider contract he read that morning: the planner knows its id outside the hall; it is taken only at that hall', async () => {
    const g = live();
    await say(g, TAKE, [takePlan()]);
    const user = g.planRequest.messages.at(-1).content;
    // identity: known by its id (live: the catalog had only the hounds under QUESTS, so the planner wrote {"new": ...})
    const known = user.split('\n').find((l) => l.startsWith('KNOWN CONTRACTS'));
    assert.match(known, /^KNOWN CONTRACTS \(listed on a Guild board elsewhere; taken only at that board's Guild hall, if still listed\): quest\.cull_the_bog_striders_at_the_reed_flats_eel_weirs \(Cull the Bog Striders at the Reed Flats Eel-Weirs · Guild contract · Novice · 120 cp · on the board of Adventurers' Guild hall, Alderwatch\)/);
    assert.ok(!known.includes(HOUNDS), 'his own contract is under QUESTS');
    const live39 = fx.messages.length;
    assert.equal(fx.take.plan[0].includes('{"new":"Cull the Bog Striders"}'), true, 'the live answer without the id');
    // the id is a valid answer now; it was not in the c.4 catalog
    const ctx = withContentSkills(planContext(g.state(live39), content, buildCatalog(g.state(live39), content, { known: true })), content);
    assert.deepEqual(parsePlan(JSON.stringify(takePlan()), content.commandVocab, ctx, TAKE).errors, []);
    const old = withContentSkills(planContext(g.state(live39), content, buildCatalog(g.state(live39), content)), content);
    assert.ok(parsePlan(JSON.stringify(takePlan()), content.commandVocab, old, TAKE).errors.length, 'without the known list the id is refused');
    // availability: nothing is booked on the verge; the accept waits for the hall
    assert.equal(g.state().quests[BOG].status, 'listed');
    assert.equal(g.state().objects[SLIP], undefined);
    assert.deepEqual(outcomeOf(g).conditionals.find((c) => c.kind === 'accept'), { seq: 2, kind: 'accept', quest: BOG, condition: 'arrive_guild_hall', hall: HALL });
    // knowing it is not taking it from anywhere: on the verge, without going there, refused
    const h = live();
    await say(h, '*i take the Bog Strider quest*', [plan({ type: 'quest.accept', quest: BOG, quote: 'i take the Bog Strider quest' })]);
    assert.match(outcomeOf(h).actions[0], /^1\. CANNOT ACCEPT — "Cull the Bog Striders at the Reed Flats Eel-Weirs" is taken at the Guild hall of Alderwatch\.$/);
    assert.equal(h.state().quests[BOG].status, 'listed');
    // nor at the hall of another branch he is heading for (the resolver itself: the planner's catalog on the verge lists
    // no other town's hall)
    const r = playerTurnV4(g.state(live39), content, '*i go to the Redmarch guild and take the Bog Strider quest*', { msg: live39, c: true, commands: [
        { seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'i go to the Redmarch guild' }, { seq: 2, type: 'quest.accept', quest: BOG, quote: 'take the Bog Strider quest' }] });
    assert.match(r.events.find((e) => e.t === 'outcome.recorded').d.outcome.actions[1], /^2\. CANNOT ACCEPT — "Cull the Bog Striders at the Reed Flats Eel-Weirs" is taken at the Guild hall of Alderwatch\.$/);
    // A's catalog is unchanged: no known list
    assert.ok(!catalogText(buildCatalog(g.state(live39), content)).includes('KNOWN CONTRACTS'));
    assert.match(plannerSystem(content.commandVocab), /the go needs the quest\.accept/);
});

// ------------------------------------------------------------------------------------------------ 3. GO -> accept -> GO
test('3. the live sentence: arrive at the Guild hall, take the contract (active, slip), then set off for the eel weirs, in that order', async () => {
    const g = live();
    await say(g, TAKE, [takePlan()]);
    const a = outcomeOf(g).actions;
    assert.match(a[1], /^2\. ACCEPTS, when he reaches the Guild hall — "Cull the Bog Striders at the Reed Flats Eel-Weirs": the clerk logs it and hands him its contract slip\..* If the reply does not reach the hall, nothing is accepted\.$/s);
    assert.match(a[2], /^3\. GOES — to the eel weirs/);
    const x = await g.reply(fx.take.reply.slice(0, 40), arrives([1, HALL], [3, EEL_WEIRS]));
    const ev = x.record.events;
    const at = (pred) => ev.findIndex(pred);
    const hall = at((e) => e.t === 'scene.moved' && e.d.at === HALL);
    const active = at((e) => e.t === 'quest.status' && e.d.id === BOG && e.d.to === 'active');
    const slip = at((e) => e.t === 'object.created' && e.d.object.id === SLIP);
    const weirs = at((e) => e.t === 'scene.moved' && e.d.at !== HALL);
    assert.ok(hall >= 0 && hall < active && active < slip && slip < weirs, `${hall} < ${active} < ${slip} < ${weirs}`);
    const s = g.state();
    assert.equal(s.quests[BOG].status, 'active');
    assert.equal(s.objects[SLIP].holder.entity, 'pc');
    assert.equal(s.scene.place, 'Eel Weirs');
    // the extractor's own slip and status claims stay the engine's
    const h = live();
    await say(h, TAKE, [takePlan()]);
    const y = await h.reply('The clerk wrote it in and gave him the slip.', { ...arrives([1, HALL]), deltas: [
        { seq: 1, type: 'object.new', name: 'Guild contract slip: Cull the Bog Striders', kind: 'document', qty: 1, unit: null, holder: 'pc', for_quest: BOG },
    ] });
    assert.deepEqual((y.record.rejected || []).map((r) => r.rule), ['engine_booked']);
    assert.equal(Object.values(h.state().objects).filter((o) => (o.for_quests || []).includes(BOG)).length, 1);
    // nor does a "somebody took it" of that reply take it from him before he gets there: the order of the deltas
    // decides nothing
    const k = live();
    await say(k, TAKE, [takePlan()]);
    const z = await k.reply('Another company had taken it that morning, the clerk said as he came in.', { ...arrives([1, HALL]), deltas: [
        { seq: 1, type: 'listing.gone', listing: BOG, why: 'taken_by_other' },
        { seq: 2, type: 'arrive', at: HALL, forced_by: null, with: null },
    ] });
    assert.deepEqual((z.record.rejected || []).map((r) => [r.seq, r.rule]), [[1, 'engine_booked']]);
    assert.equal(k.state().quests[BOG].status, 'active');
    // it waits for the hall of its board, not the first Guild hall the reply reaches (resolver and world applier
    // themselves: the planner's catalog on the verge lists no other town's hall)
    const m = live().state(fx.messages.length);
    for (const e of playerTurnV4(structuredClone(m), content, '*i go to the Redmarch guild, then back to the guild here and take the Bog Strider quest*', { msg: fx.messages.length, c: true, commands: [
        { seq: 1, type: 'go', to: 'loc.redmarch.guild_hall', quote: 'i go to the Redmarch guild' }, { ...goHall, seq: 2, quote: 'then back to the guild here' },
        { seq: 3, type: 'quest.accept', quest: BOG, quote: 'take the Bog Strider quest' }] }).events) applyEvent(m, e);
    const n = applyWorld(m, content, arrives([1, 'loc.redmarch.guild_hall'], [2, HALL]), { msg: fx.messages.length + 1 });
    assert.deepEqual(n.events.filter((e) => e.t === 'scene.moved' || e.t === 'quest.status').map((e) => [e.t, e.d.at]),
        [['scene.moved', 'loc.redmarch.guild_hall'], ['scene.moved', HALL], ['quest.status', HALL]]);
});

// ------------------------------------------------------------------------------------------------ 4. a failing middle step
test('4. the contract is gone: no acceptance, no claim that it is his, and the step that needed it is not taken', async () => {
    const g = live();
    before(g, { t: 'quest.status', d: { id: BOG, from: 'listed', to: 'taken_by_other', by: 'world' } }); // another company took it
    // no longer a known contract: the planner has no id for it and writes the live {"new": ...}
    await say(g, TAKE, [takePlan(2, { new: 'Cull the Bog Striders' })]);
    assert.ok(!g.planRequest.messages.at(-1).content.includes(`${BOG} (`), 'not offered as known');
    const a = outcomeOf(g).actions;
    assert.match(a[1], /^2\. CANNOT ACCEPT — no such contract \("Cull the Bog Striders"\) is on offer\.$/);
    assert.equal(a[2], '3. NOT DONE — "make my way over to the eel weirs": it was to follow step 2, which did not happen.');
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => r.status), ['authorized', 'refused', 'refused']);
    const x = await g.reply('The clerk shook her head: the job had gone to another company that morning.', { ...arrives([1, HALL]), deltas: [
        { seq: 1, type: 'fact', s: BOG, p: 'status', o: 'active, taken by Alaric' },
    ] });
    assert.deepEqual((x.record.rejected || []).map((r) => r.rule), ['engine_owned_fact']);
    const s = g.state();
    assert.equal(s.quests[BOG].status, 'taken_by_other');
    assert.equal(s.objects[SLIP], undefined);
    assert.equal(s.scene.at, HALL);
    // the desk looks again when he arrives: a contract no longer listed by then is not taken (the world applier itself)
    const w = live().state(fx.messages.length);
    for (const e of playerTurnV4(structuredClone(w), content, TAKE, { msg: fx.messages.length, c: true, commands: takePlan().commands }).events) applyEvent(w, e);
    applyEvent(w, { t: 'quest.status', d: { id: BOG, from: 'listed', to: 'taken_by_other', by: 'world' } });
    const late = applyWorld(w, content, arrives([1, HALL]), { msg: fx.messages.length + 1 });
    assert.deepEqual(late.events.find((e) => e.t === 'cmd.completed' && e.d.seq === 2).d, { seq: 2, ok: false, reason: 'the contract is no longer on the board' });
    assert.deepEqual(late.system, ['NOT ACCEPTED — Cull the Bog Striders at the Reed Flats Eel-Weirs: it is no longer on the board']);
    assert.ok(late.corrections.includes('"Cull the Bog Striders at the Reed Flats Eel-Weirs" was not taken: it is no longer on the board; he holds no slip for it.'));
    assert.equal(late.state.quests[BOG].status, 'taken_by_other');
    assert.equal(late.state.objects[SLIP], undefined);
    // a listing seen on an earlier day is not frozen as available: since 4.3.0-c.6 the board is the day's (it was a
    // re-roll of other adventurers' takes in c.5), so the next day it came down with its day; known, not to be taken
    const h = live();
    before(h, { t: 'time.advanced', d: { minutes: 1440, why: 'test' } }); // the next day
    await say(h, TAKE, [takePlan()]);
    assert.match(outcomeOf(h).actions[1], /^2\. CANNOT ACCEPT — "Cull the Bog Striders at the Reed Flats Eel-Weirs" is no longer on the board: the Guild renews its board every day/);
    assert.match(outcomeOf(h).actions[2], /^3\. NOT DONE/);
    assert.equal(h.state().objects[SLIP], undefined);
});

// ------------------------------------------------------------------------------------------------ 5. independent steps
test('5. steps that stand on their own keep going: a refused drop or accept does not stop an unmarked walk; a goal true already counts as done', async () => {
    const g = live();
    await say(g, '*i drop the broken cup and walk into the city*', [plan({ type: 'drop', object: { new: 'broken cup' }, qty: null, quote: 'i drop the broken cup' }, { type: 'go', to: 'loc.alderwatch', quote: 'walk into the city' })]);
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.type, r.status]), [['go', 'authorized']]);
    assert.deepEqual(last(g).plan.dropped.map((x) => x.type), ['drop'], 'the drop of a cup he does not hold never became a step');
    // the same contract sentence without "needs": the walk is his own (the planner did not tie it to the contract)
    const h = live();
    before(h, { t: 'quest.status', d: { id: BOG, from: 'listed', to: 'withdrawn', by: 'world' } });
    await say(h, TAKE, [takePlan(null, { new: 'Cull the Bog Striders' })]);
    assert.deepEqual(outcomeOf(h).resolutions.map((r) => r.status), ['authorized', 'refused', 'authorized']);
    // a step whose prerequisite found its goal true already ("he is already here") is taken
    const k = live();
    await say(k, TAKE, [takePlan()]);
    await k.reply('He went in.', arrives([1, HALL]));
    await say(k, '*i go to the guild hall and read the board*', [plan({ type: 'go', to: HALL, quote: 'i go to the guild hall' }, { type: 'board.read', rank: null, needs: 1, quote: 'read the board' })]);
    assert.deepEqual(outcomeOf(k).resolutions.map((r) => [r.type, r.status, r.reason ?? null]), [['go', 'refused', 'already here'], ['board.read', 'resolved', null]]);
    // the contract his already: he sets off for its site; the contract he has turned in: he does not
    for (const [to, then] of [['active', ['authorized', null]], ['completed', ['refused', 'needs step 2']]]) {
        const q = live();
        before(q, { t: 'quest.status', d: { id: BOG, from: 'listed', to: 'active', by: 'world' } }, ...(to === 'completed' ? [{ t: 'quest.status', d: { id: BOG, from: 'active', to: 'completed', by: 'world' } }] : []));
        await say(q, TAKE, [takePlan()]);
        assert.deepEqual(outcomeOf(q).resolutions.map((r) => [r.status, r.reason ?? null]), [['authorized', null], ['refused', `already ${to}`], then], to);
    }
    // "needs" must point back at an earlier step of the answer
    const ctx = withContentSkills(planContext(g.state(), content, buildCatalog(g.state(), content, { known: true })), content);
    const bad = parsePlan(JSON.stringify(plan({ type: 'go', to: HALL, needs: 2, quote: 'walk into the city' }, { type: 'drop', object: { new: 'cup' }, qty: null, quote: 'i drop the broken cup' })), content.commandVocab, ctx, '*i drop the broken cup and walk into the city*');
    assert.match(bad.errors.join(' | '), /"needs" must be the seq of an earlier command of this answer/);
});

// ------------------------------------------------------------------------------------------------ 6. board authority
test('6. official listings come only from the engine\'s board: the invented ones of the live reply are refused, not stored', async () => {
    const g = live();
    await say(g, TAKE, fx.take.plan); // the live answer: {"new": "Cull the Bog Striders"}, refused as in the run
    assert.match(outcomeOf(g).actions[1], /CANNOT ACCEPT — no such contract \("Cull the Bog Striders"\) is on offer\./);
    const x = await g.reply(fx.take.reply, fx.take.extract);
    const refused = (x.record.rejected || []).filter((r) => r.rule === 'guild_listing').map((r) => r.seq);
    assert.deepEqual(refused, [3, 4], 'Rat Cull, Meadowfever Herb');
    assert.ok(x.record.corrections.includes('Official Guild contracts come only from the board the engine shows; the contract the last reply showed does not exist.'));
    const stored = Object.values(g.state().facts || {}).map((f) => `${f.s} ${f.p} ${f.o}`).join('\n');
    assert.ok(!/Rat Cull|Meadowfever/.test(stored), 'not in the state');
    // the board's real listings and what the board looks like are no inventions
    const h = live();
    await say(h, fx.board.player, fx.board.plan);
    const y = await h.reply('The board.', { ...arrives([1, HALL]), deltas: [
        { seq: 1, type: 'fact', s: 'Novice board', p: 'lists', o: 'Cull the Bog Striders at the Reed Flats Eel-Weirs, 120 cp' },
        { seq: 2, type: 'fact', s: 'Novice quest board', p: 'ranked by', o: 'colored pins' },
        { seq: 3, type: 'quest.offer', title: 'Rat Cull', giver: 'the Novice board', reward_cp: 40, objectives: ['thin the rats below the granary'], proof: ['rat tails'] },
    ] });
    assert.deepEqual((y.record.rejected || []).map((r) => [r.seq, r.rule]), [[3, 'guild_listing']]);
    // not only inside the hall (where any "board" is the Guild's desk): on the verge, a job the Novice board posts is
    // no Guild contract either
    const v = live();
    await say(v, '*i sit on the verge and think about the Novice board*', [{ commands: [] }]);
    const u = await v.reply('He remembered a rat cull on the Novice board.', { expected: {}, deltas: [
        { seq: 1, type: 'quest.offer', title: 'Rat Cull', giver: 'the Novice board', reward_cp: 40, objectives: ['thin the rats below the granary'], proof: ['rat tails'] },
    ] });
    assert.deepEqual((u.record.rejected || []).map((r) => [r.seq, r.rule]), [[1, 'guild_listing']]);
    assert.ok(!Object.values(v.state().quests).some((q) => q.title === 'Rat Cull'));
    // A: the two invented listings on the same turn without the planner keep their old behaviour (no such guard there;
    // the live answer itself is no valid answer on A, its expected keys are C's)
    const a = live();
    await say(a, TAKE, [], { planner: false, commands: [{ seq: 1, type: 'go', to: HALL, quote: 'i next go back to the guild' }] });
    const listings = fx.take.extract.deltas.filter((d) => d.s === 'Novice board').map((d, i) => ({ ...d, seq: i + 1 }));
    assert.equal(listings.length, 2);
    const z = await a.reply(fx.take.reply, { ...arrives([1, HALL]), deltas: listings });
    assert.ok(!z.record.events.some((e) => e.t === 'extract.failed'));
    assert.deepEqual((z.record.rejected || []).filter((r) => r.rule === 'guild_listing'), []);
});

// ------------------------------------------------------------------------------------------------ registration
test('the same cause, registration: "go to the Guild and register" opens the fee at the hall he goes to', async () => {
    const g = new Chat4(content);
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? JSON.stringify(g.plans.shift()) : ask(req));
    await g.player('Warrior');
    await g.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    const hall = 'loc.redmarch.guild_hall';
    await say(g, '*i walk into Redmarch to the guild and register*', [plan({ type: 'go', to: hall, quote: 'i walk into Redmarch to the guild' }, { type: 'guild.register', quote: 'register' })]);
    assert.match(outcomeOf(g).actions[1], /^2\. REGISTERS, when he reaches the Guild hall — pending: the Guild's registration fee is 2 silver \(20 cp\)/);
    assert.equal(g.state().offers['offer.registration'].at, hall);
    await g.reply('He reached the Guild hall; the clerk named the fee.', arrives([1, hall]));
    // a step that needs the registration while its fee is still open is not taken
    await say(g, '*i register and then read the board*', [plan({ type: 'guild.register', quote: 'i register' }, { type: 'board.read', rank: null, needs: 1, quote: 'then read the board' })]);
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.type, r.status]), [['guild.register', 'pending'], ['board.read', 'refused']]);
    await g.reply('The clerk waited for the coin.', { expected: {}, deltas: [] });
    await say(g, '*i register, pay the fee and read the board*', [plan({ type: 'guild.register', quote: 'i register' }, { type: 'offer.accept', offer: 'offer.registration', lines: ['l1'], qty: null, quote: 'pay the fee' },
        { type: 'board.read', rank: null, needs: 1, quote: 'read the board' })]);
    assert.match(outcomeOf(g).actions[0], /^2\. PAYS — the Guild registration fee, 20 cp: registered at Guild Rank Novice/);
    // the read that needed the registration: the guard dropped the second "register" (paying completes it), and the fee
    // paid in between registered him
    assert.deepEqual(last(g).plan.dropped.map((x) => [x.type, x.rule]), [['guild.register', 'redundant']]);
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.type, r.status]), [['offer.accept', 'resolved'], ['board.read', 'resolved']]);
});
