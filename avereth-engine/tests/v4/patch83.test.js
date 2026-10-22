// Patch 8.3 (docs/PATCH8_3_DUNGEON_FLOORS_CULLS.md): Dungeon floor identity, reachable cull quests and the quest
// context, against the live test of 22.10.2026 02:00 (tests/v4/live_1022a.json, build .27, GLM-5.3-Flash): the stair
// down from the gate of the Old Crown Catacombs booked "Old Crown Catacombs, level 1" as level 2 (behind level 1's
// seal), and "Skeletons in the Burial Galleries (3)" asked 3 restless skeletons of a level whose cycle held 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { prepareGenerationAsync, processReplyAny } from '../../src/v4/runtime.js';
import { levelVia } from '../../src/v4/dungeon.js';
import { floorAt, levelSpan, sealRefusal, runNow, syncEvents } from '../../src/v4/living.js';
import { parseBoard, bookBoard, defeatTally, goalText, contractReady, boardRequest } from '../../src/v4/guild.js';
import { Chat4 } from './harness.js';
import { campaign, say, walk, inject, living, ahead, slotDelta, delve, hero, fightAll, linesOf, way, GO, CATA, GROTTO } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022a.json'), 'utf8'));
const ROOM = 'loc.old_crown_catacombs.old_crown_catacombs_level_1';
const SKELETONS = 'quest.skeletons_in_the_burial_galleries';
const raw = (n) => fx.messages[n].extra.avereth.extraction.raw;
const newRoom = (name, parent = CATA) => ({ new: { name, kind: 'interior', parent } });

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** Delve on until the level's encounters are met and fought (as tests/v4/patch8.test.js clearLevel). */
async function clearLevel(g, floor, { root = CATA, names = 'Part', max = 8 } = {}) {
    for (let i = 0; i < max; i++) {
        if (living(g, root).run.floors[floor].cleared) return;
        await delve(g, `${names} ${floor}.${i + 1}`, { root });
        await fightAll(g);
    }
    assert.fail(`level ${floor} not cleared`);
}
/** A creature of the story or of an encounter, dead (the engine's death: its status fact). */
function dead(s, id, e) {
    s.entities[id] = { id, kind: 'creature', status: 'dead', ...e };
    s.facts[`f.${id}.status`] = { id: `f.${id}.status`, s: id, p: 'status', o: 'dead', since: { turn: s.turn, minute: s.clock.minute }, until: null, hard: true, visibility: 'public', importance: 0.9, source: { kind: 'engine' } };
}
const NEED = { branch: 'loc.alderwatch', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
/** The live board of #11 (its five listings as the generator wrote them, numbers as booked) booked again on its state. */
function liveBoard(s = structuredClone(foldChat(fx.messages, 11).state)) {
    const listings = rec(fx.messages[11]).events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest)
        .map((q) => ({ title: q.title, client: q.client, rank: q.rank, level: q.level, qtype: q.qtype, payout_cp: q.payout_cp, task: q.task, desired_end_state: q.desired_end_state, objectives: q.objectives.map(({ id, status, ...o }) => o), proof: q.proof.map(({ id, ...p }) => p) }));
    return book(s, listings);
}
function book(s, listings) {
    const p = parseBoard(JSON.stringify({ listings }), content, NEED, s);
    const events = [];
    bookBoard(s, content, NEED, p.listings, (e) => events.push(e));
    return { p, s, quests: events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest), events };
}
const active = (q, s) => ({ ...q, status: 'active', taker: 'pc', history: [...q.history, { turn: s.turn, minute: s.clock.minute, status: 'active' }] });

// ------------------------------------------------------------------------------------------------ A. floor identity
test('8.3 floor 1 (live #16): the stair down from the gate of the Catacombs reaches level 1, not level 2 behind its seal; the live save keeps its stored level 2; reading the reply again (a regenerate) books level 1, once', async () => {
    // the live run as stored: the room "level 1" on level 2, and level 1's seal in front of it (a dead end)
    const old = foldChat(fx.messages).state;
    assert.equal(old.places[ROOM].level, 2, 'the stored place.created of .27 is not repaired by the code');
    assert.match(sealRefusal(old, ROOM), /sealed until the guardian of level 1 falls/);
    // the same reply read again under this build (its regenerate or swipe with the same answer)
    const g = live(16);
    const r = await g.reply(fx.messages[16].mes, raw(16));
    const s = g.state();
    assert.equal(s.scene.at, CATA, 'at the gate');
    assert.equal(s.places[ROOM].level, 1, 'the first level below the gate');
    assert.equal(floorAt(s, ROOM), 1);
    assert.equal(sealRefusal(s, ROOM), null, 'nothing above level 1 to seal it');
    assert.deepEqual(levelSpan(s, ROOM), s.dungeons[CATA].floors[1].spans.minion, 'its foes are level 1\'s');
    const link = Object.values(s.links).find((l) => l.b === ROOM);
    assert.equal(link.a, CATA);
    assert.equal(link.dir, 'down');
    assert.equal(link.feature, 'feat.1', 'the crumbled flight still bars it');
    const made = r.record.events.filter((e) => e.t === 'place.created' && e.d.place.id === ROOM);
    assert.equal(made.length, 1);
    assert.equal(made[0].d.place.level, 1);
    // replay is the same state, and receiving the reply again changes nothing (no second room, no second event)
    assert.equal(JSON.stringify(foldChat(g.chat).state), JSON.stringify(s));
    assert.deepEqual(processReplyAny(g.chat, r.id, content, {}), { changed: false });
});

test('8.3 floor 2 (Old Crown, played): gate → stair down → level 1 with level 1\'s encounter; its seal holds the stair to level 2 until level 1 is cleared (his credit); back to the gate and in again; then level 2', async () => {
    const g = await campaign(content);
    hero(g);
    await walk(g, CATA, { text: '*I go to the Old Crown Catacombs*', prose: 'The ruined chapel; a stair goes down.' });
    // the stair down from the gate, shown and taken in one reply (13B in one answer)
    await say(g, '*I take the stair down*', GO({ new: 'the stair down' }, 'I take the stair down'));
    const a = ahead(g);
    assert.equal(a.floor, 1, 'the engine\'s first encounter is level 1\'s');
    await g.reply('He goes down the stair into the upper gallery.', { expected: { 1: { arrived: true, at: newRoom('Upper gallery'), with: null } }, deltas: [way(newRoom('Upper gallery'), { dir: 'down', name: 'stair down' }), slotDelta(a.slot)] });
    let s = g.state();
    const upper = s.scene.at;
    assert.notEqual(upper, CATA, 'in, not turned back by a seal (.27: level 2 behind level 1\'s seal)');
    assert.equal(s.places[upper].level, 1);
    const foes = s.dungeons[CATA].run.floors[1].slots[0].entities;
    assert.equal(foes.length, a.slot.count);
    const span = s.dungeons[CATA].floors[1].spans.minion;
    for (const id of foes) assert.ok(s.entities[id].profile.level >= span[0] && s.entities[id].profile.level <= span[1], 'a foe of level 1\'s window');
    await fightAll(g);
    // the stair down from level 1 before level 1 is cleared: level 2, sealed
    await say(g, '*I take the stair down*', GO({ new: 'the stair down' }, 'I take the stair down'));
    await g.reply('He goes down the stair into the deep ossuary.', { expected: { 1: { arrived: true, at: newRoom('Deep ossuary'), with: null } }, deltas: [way(newRoom('Deep ossuary'), { dir: 'down', name: 'stair down' })] });
    s = g.state();
    assert.equal(s.scene.at, upper, 'the seal holds');
    const deep = Object.values(s.places).find((p) => p.name === 'Deep ossuary');
    assert.equal(deep.level, 2);
    // level 1 cleared by him
    await clearLevel(g, 1);
    const x = living(g);
    assert.ok(x.clears.some((c) => c.floor === 1 && c.credit === 'pc'), 'his credit');
    // the way back: out to the gate and in again by the known room (still level 1)
    const at1 = g.state().scene.at;
    await say(g, '*I go back up to the chapel*', GO(CATA, 'I go back up to the chapel'));
    await g.reply('He climbs back up into the daylight of the chapel.', { expected: { 1: { arrived: true, at: CATA, with: null } }, deltas: [] });
    assert.equal(g.state().scene.at, CATA);
    await say(g, '*I go back down to the upper gallery*', GO(upper, 'I go back down to the upper gallery'));
    await g.reply('He goes back down into the upper gallery.', { expected: { 1: { arrived: true, at: upper, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(s.scene.at, upper);
    assert.equal(s.places[upper].level, 1);
    assert.ok(at1);
    // the stair to level 2 is open now
    await say(g, '*I take the stair down to the deep ossuary*', GO(deep.id, 'I take the stair down to the deep ossuary'));
    assert.equal(ahead(g).floor, 2);
    await g.reply('He goes down into the deep ossuary.', { expected: { 1: { arrived: true, at: deep.id, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(s.scene.at, deep.id);
    assert.equal(floorAt(s, deep.id), 2);
});

test('8.3 floor 3 (Glimmerdeep, a part beside its gate): a way from the gate without a stair reaches level 1, and so does a way up; the encounter there is level 1\'s', async () => {
    const g = await campaign(content, { greeting: 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Glassmere, Caelreth`' });
    hero(g);
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.glassmere', power_rank: 'F' } }]);
    await walk(g, GROTTO, { text: '*I go to the Glimmerdeep Grotto*', prose: 'The cleft in the hills.' });
    // in by the gate's fee (Patch 8.1), then on into a part beside it
    const fee = Object.values(g.state().offers).find((o) => o.gate === GROTTO && o.status === 'open');
    if (fee) {
        await say(g, '*I pay the fee*', { type: 'offer.accept', offer: fee.id, lines: ['l1'], qty: null, quote: 'I pay the fee' });
        await g.reply('He pays.', { expected: {}, deltas: [] });
    }
    const first = await delve(g, 'Outer Gallery', { root: GROTTO });
    const s = g.state();
    const outer = Object.values(s.places).find((p) => p.name === 'Outer Gallery');
    assert.equal(s.scene.at, outer.id);
    assert.equal(outer.level, 1);
    assert.ok(first.slot, 'an encounter placed ahead');
    assert.ok(s.dungeons[GROTTO].run.floors[1].slots.some((sl) => sl.id === first.slot.id), 'one of level 1\'s');
    // every way from a gate into its Dungeon reaches level 1, beside it, down or up
    for (const dir of [null, 'down', 'up']) assert.equal(levelVia(s, GROTTO, { a: GROTTO, dir }), 1, String(dir));
    assert.equal(levelVia(s, outer.id, { a: outer.id, dir: 'down' }), 2, 'one down from level 1 is level 2');
    assert.equal(levelVia(s, outer.id, { a: outer.id, dir: null }), 1);
});

test('8.3 floor 4: a building or cave explored room by room that is no true Dungeon keeps its own place as level 1 (its cellar is level 2, as before)', () => {
    const s = {
        places: {
            'loc.town': { id: 'loc.town', kind: 'settlement', parent: null },
            'loc.town.inn': { id: 'loc.town.inn', kind: 'site', parent: 'loc.town', rooms: true },
            'loc.cata': { id: 'loc.cata', kind: 'site', parent: null, rooms: true, dungeon: { real: true } },
            'loc.cata.hall': { id: 'loc.cata.hall', kind: 'interior', parent: 'loc.cata', level: 1 },
            'loc.cata.ossuary': { id: 'loc.cata.ossuary', kind: 'interior', parent: 'loc.cata', level: 2 },
        },
        links: {},
    };
    assert.equal(levelVia(s, 'loc.town.inn', { a: 'loc.town.inn', dir: 'down' }), 2, 'the inn\'s cellar');
    assert.equal(levelVia(s, 'loc.town.inn', { a: 'loc.town.inn', dir: null }), 1);
    assert.equal(levelVia(s, 'loc.cata', { a: 'loc.cata', dir: 'down' }), 1, 'the gate of a true Dungeon');
    assert.equal(levelVia(s, 'loc.cata.hall', { a: 'loc.cata.hall', dir: 'down' }), 2);
    assert.equal(levelVia(s, 'loc.cata.ossuary', { a: 'loc.cata.ossuary', dir: 'up' }), 1);
    assert.equal(levelVia(s, 'loc.cata.ossuary', { a: 'loc.cata.hall', dir: 'down' }), 1, 'the way back up from level 2');
});

// ------------------------------------------------------------------------------------------------ B. reachable culls
test('8.3 cull 1 (live #11): the board\'s skeleton cull asks the 2 restless skeletons the level\'s cycle holds (live: 3, of 2 restless skeletons and 2 risen bones), its end state says that count; the other listings keep theirs; the taken live contract keeps its 3', () => {
    const { quests, s } = liveBoard();
    const q = quests.find((x) => x.id === SKELETONS);
    assert.equal(q.objectives.find((o) => o.verb === 'DEFEAT').qty, 2);
    assert.equal(q.dungeon, CATA);
    assert.equal(q.floor, 1);
    assert.equal(q.clear, undefined, 'a cull, not a clearance');
    assert.equal(goalText(s, content, q, { board: true }), ' (2)');
    assert.match(q.desired_end_state, /^2 restless skeletons of level 1 of Old Crown Catacombs defeated or driven off \(a cull: done at that count/);
    assert.doesNotMatch(q.desired_end_state, /\bclear(ed)?\b/i, 'no cleared level promised');
    // the hunts outside keep their numbers and their words
    const live11 = Object.fromEntries(rec(fx.messages[11]).events.filter((e) => e.t === 'quest.created').map((e) => [e.d.quest.id, e.d.quest]));
    for (const id of ['quest.wolves_at_the_sheepfolds', 'quest.bog_striders_at_the_eel_weirs']) {
        const b = quests.find((x) => x.id === id);
        assert.deepEqual(b.objectives, live11[id].objectives);
        assert.equal(b.desired_end_state, live11[id].desired_end_state);
    }
    // the count the board read is the population he meets: the cycle the Catacombs were established with at #15
    const predicted = runNow(s, content, CATA).floors[1].slots.map((sl) => [sl.species, sl.count, sl.role]);
    const met = foldChat(fx.messages).state.dungeons[CATA].run.floors[1].slots.map((sl) => [sl.species, sl.count, sl.role]);
    assert.deepEqual(predicted, met);
    assert.deepEqual(met, [['risen bones', 2, 'minion'], ['restless skeleton', 2, 'minion'], ['armoured skeleton', 1, 'guard']]);
    assert.ok(!s.dungeons?.[CATA], 'nothing established by reading the board');
    // a contract already taken is not changed by the new rule
    assert.equal(foldChat(fx.messages).state.quests[SKELETONS].objectives.find((o) => o.verb === 'DEFEAT').qty, 3);
});

test('8.3 cull 2: one rule for the number asked and the kills counted: every foe of the live cycle\'s level 1 dead makes 2/2 (risen bones and the Gallery Warden are no restless skeletons); a contract that names the guardian counts him, asked and killed', () => {
    const { quests } = liveBoard();
    const s = structuredClone(foldChat(fx.messages).state);
    const q = active(quests.find((x) => x.id === SKELETONS), s);
    s.quests[q.id] = q;
    const run = s.dungeons[CATA].run.floors[1];
    for (const sl of run.slots) for (let i = 0; i < sl.count; i++) {
        dead(s, `mon.${sl.id}_${i}`, { species: sl.species, anchor: sl.anchor, slot: { dungeon: CATA, cycle: 1, floor: 1, id: sl.id, role: sl.role }, met_at: ROOM });
    }
    assert.deepEqual(defeatTally(s, content, q), [{ what: 'restless skeletons', qty: 2, done: 2, killed: 2, driven: 0 }]);
    assert.equal(goalText(s, content, q), ' — 2/2 defeated');
    // the guardian, by its own name: asked twice, the level holds him once (a cull of its level 1, named in the task;
    // an objective of one on "level 1" would be a clearance)
    const warden = { title: 'Put Down the Gallery Warden', client: 'Temple Wardens of Alderwatch', rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 120, task: 'Put down the Gallery Warden on level 1 of the Old Crown Catacombs.', desired_end_state: 'The Gallery Warden of the Old Crown Catacombs is destroyed.', objectives: [{ verb: 'DEFEAT', what: 'the Gallery Warden', qty: 2, unit: null, where: 'the Old Crown Catacombs' }], proof: [] };
    const w = book(structuredClone(foldChat(fx.messages, 11).state), [warden]).quests[0];
    assert.equal(w.objectives[0].qty, 1, 'one guardian on level 1');
    assert.equal(w.clear, undefined);
    assert.equal(w.floor, 1);
    const wq = active(w, s);
    s.quests[wq.id] = wq;
    assert.deepEqual(defeatTally(s, content, wq).map((t) => [t.qty, t.done]), [[1, 1]], 'the Gallery Warden counts where he is meant (8.1: never, his kind is no "Gallery Warden")');
});

test('8.3 cull 3: a Dungeon cull counts kills in its Dungeon and on its level only; a hunt outside counts in its branch\'s land, as before', () => {
    const { quests } = liveBoard();
    const s = structuredClone(foldChat(fx.messages).state);
    const q = active(quests.find((x) => x.id === SKELETONS), s);
    s.quests[q.id] = q;
    const skeleton = { species: 'restless skeleton', anchor: 'skeleton' };
    dead(s, 'mon.town_skeleton', { ...skeleton, met_at: 'loc.alderwatch' }); // in the same realm, outside the Dungeon
    dead(s, 'mon.gate_skeleton', { ...skeleton, met_at: CATA }); // at the gate, no level
    dead(s, 'mon.deep_skeleton', { ...skeleton, slot: { dungeon: CATA, cycle: 1, floor: 2, id: 'ghouls', role: 'minion' }, met_at: ROOM }); // an encounter of level 2
    assert.equal(defeatTally(s, content, q)[0].done, 0, 'none of them is level 1\'s (8.2: the town\'s and the gate\'s counted, by the realm)');
    dead(s, 'mon.l1_skeleton', { ...skeleton, met_at: ROOM, at: ROOM }); // the story's own, met on level 1
    s.places[ROOM].level = 1;
    assert.equal(defeatTally(s, content, q)[0].done, 1);
    // the wolves of the board: Valedorn's count, Caelreth's not
    const wolves = active(quests.find((x) => x.id === 'quest.wolves_at_the_sheepfolds'), s);
    s.quests[wolves.id] = wolves;
    dead(s, 'mon.wolf_downs', { species: 'grey wolf', anchor: 'wolf', met_at: 'loc.alderwatch' });
    dead(s, 'mon.wolf_far', { species: 'grey wolf', anchor: 'wolf', met_at: 'loc.glassmere' });
    assert.equal(defeatTally(s, content, wolves)[0].done, 1);
});

test('8.3 cull 4: the board reads the cycle the Dungeon holds at the time: after a reset falls due (not booked yet) the next cycle\'s draw, the same the reset books when he comes', () => {
    const s = structuredClone(foldChat(fx.messages).state);
    const x = s.dungeons[CATA];
    s.scene.at = 'loc.alderwatch.guild_hall';
    s.clock.minute = x.cycle_start + x.reset_min + 30;
    const predicted = runNow(s, content, CATA);
    const events = [];
    syncEvents(s, content, (e) => events.push(e));
    const reset = events.find((e) => e.t === 'dungeon.reset' && e.d.id === CATA);
    assert.equal(reset.d.cycle, 2);
    assert.deepEqual(predicted.floors, reset.d.floors);
    assert.deepEqual(runNow(foldChat(fx.messages).state, content, CATA), foldChat(fx.messages).state.dungeons[CATA].run, 'within its cycle, the cycle it holds');
});

// ------------------------------------------------------------------------------------------------ C. cull or clear
test('8.3 clear 1: a clearance of level 1 (no number) stays a Floor-Clear (quest.clear, its own end state, "Clear … level 1", turn-in by the level\'s state); a cull of the same level keeps its number and is turned in by its count; the generator is told one or the other', () => {
    const s = structuredClone(foldChat(fx.messages, 11).state);
    const base = { client: 'Temple Wardens of Alderwatch', rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 120, proof: [] };
    const clearL = { ...base, title: 'Clear the Upper Galleries', task: 'Clear level 1 of the Old Crown Catacombs.', desired_end_state: 'Level 1 of the Old Crown Catacombs is cleared of the restless dead.', objectives: [{ verb: 'DEFEAT', what: 'the restless dead', qty: null, unit: null, where: 'level 1 of the Old Crown Catacombs' }] };
    const cullL = { ...base, title: 'Thin the Restless Skeletons', task: 'Cull the restless skeletons of level 1 of the Old Crown Catacombs.', desired_end_state: 'Three restless skeletons destroyed.', objectives: [{ verb: 'DEFEAT', what: 'restless skeletons', qty: 3, unit: null, where: 'level 1 of the Old Crown Catacombs' }] };
    // one Dungeon job on a board (Patch 7): each on its own board. "The restless dead" names no kind the level holds:
    // a clearance is no cull, so that is no refusal (8.1 refused it)
    const [clear] = book(structuredClone(s), [clearL]).quests;
    const [cull] = book(structuredClone(s), [cullL]).quests;
    assert.deepEqual(clear.clear, { dungeon: CATA, floor: 1 });
    assert.equal(clear.objectives[0].qty, null, 'no number for a clearance');
    assert.equal(clear.desired_end_state, clearL.desired_end_state, 'its own words');
    assert.equal(goalText(s, content, clear, { board: true }), ' — Clear Old Crown Catacombs, level 1');
    assert.equal(cull.clear, undefined);
    assert.equal(cull.objectives[0].qty, 2);
    assert.equal(goalText(s, content, cull, { board: true }), ' (2)');
    assert.match(cull.desired_end_state, /^2 restless skeletons of level 1 of Old Crown Catacombs defeated \(/);
    const t = structuredClone(foldChat(fx.messages).state);
    for (const q of [clear, cull]) t.quests[q.id] = active(q, t);
    assert.equal(contractReady(t, content, t.quests[clear.id], { c: true }).mode, 'not_cleared');
    assert.equal(goalText(t, content, t.quests[clear.id]), ' — Clear Old Crown Catacombs, level 1: not cleared yet');
    assert.notEqual(contractReady(t, content, t.quests[cull.id], { c: true }).mode, 'not_cleared');
    assert.equal(goalText(t, content, t.quests[cull.id]), ' — 0/2 defeated');
    assert.match(JSON.stringify(boardRequest(s, content, NEED)), /One listing is one of the two, never both/);
});

// ------------------------------------------------------------------------------------------------ D. quest context
test('8.3 context 1: the Guild pays, its client and the locals never (no local sign-off suggested); QUEST PLAY: for a contract in a Living Dungeon the Dungeon is its complication, no further hurdle on the way in, a hazard of the place stays possible; a contract outside keeps the general line', () => {
    const s = foldChat(fx.messages, 16).state;
    const text = buildContext(s, content, { input: 'Skeletons in the Burial Galleries' }).text;
    assert.doesNotMatch(text, /locals confirm/);
    assert.match(text, /paid by the Guild when turned in at a front desk, never by its client or other locals/);
    assert.match(text, /For a contract in a Living Dungeon \(Old Crown Catacombs\) the Dungeon itself is that complication: its foes, dangerous parts, guardian and seals, which the engine places; invent no further hurdle for the contract in front of it or on the way in\. A hazard the place plausibly holds of itself \(a trap, a damaged stair\) stays possible\./);
    const t = structuredClone(s);
    t.quests[SKELETONS].status = 'listed';
    t.quests['quest.wolves_at_the_sheepfolds'] = active(t.quests['quest.wolves_at_the_sheepfolds'], t);
    const outside = buildContext(t, content, { input: 'wolves' }).text;
    assert.match(outside, /QUEST PLAY: only when the current scene\/action is actually pursuing a nontrivial active Quest/);
    assert.doesNotMatch(outside, /Living Dungeon \(/);
});

test('8.3 blocked 1 (live #17): "i enter it" stays BLOCKED by the crumbled flight: he may come up to it and see it, never past or over it, and no attempt is made; he stays at the gate', async () => {
    const g = live(17);
    const r = await say(g, '*i enter it*', GO(ROOM, 'i enter it'));
    assert.equal(r.action, 'context');
    const lines = linesOf(g);
    assert.match(lines, /BLOCKED — the way to Old Crown Catacombs, level 1 is barred by crumbled stair flight \(feat\.1\): going there does not get him past it\./);
    assert.match(lines, /He may come up to it and see it, but he does not get past or over it and makes no attempt on it: he stays on this side, where he is/);
    assert.equal(g.state().scene.at, CATA);
    // the same turn read again (a regenerate): the same record, no second resolution
    const before = JSON.stringify(rec(g.chat.at(-1)).events);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.equal(JSON.stringify(rec(g.chat.at(-1)).events), before);
});
