// Patch 8.4 (docs/PATCH8_4_GROUP_AWARENESS_CULLS.md): group awareness on an open attack and the count of a Dungeon
// cull said alike everywhere, against the live test of 22.10.2026 03:42 (tests/v4/live_1022b.json, build .28,
// GLM-5.3-Flash): four glass beetles of one encounter, unaware of him and none hidden from (scene.concealed empty), each
// killed by a Flame Lance that was a new Ambush of its own while the other three stayed out and unaware; and "Cull the
// Crystal Beetles of the Outer Grottos (4)", its task "Cull at least six crystal beetles …".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { groupJoiners } from '../../src/v4/group_combat.js';
import { parseBoard, bookBoard, goalText, objectiveText, amountText } from '../../src/v4/guild.js';
import { Chat4 } from './harness.js';
import { say, outcomeOf, hero, fightAll, inject } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1022b.json'), 'utf8'));
const [A, B, C, D] = [1, 2, 3, 4].map((n) => `mon.glimmerdeep_grotto_c1_l1_e1_${n}`);
const GROTTO = 'loc.glimmerdeep_grotto';
const BEETLES = 'quest.cull_the_crystal_beetles_of_the_outer_grottos';
const lance = (target, quote = 'i flame Lance it') => ({ type: 'use_skill', skill: 'mage.flame_lance', target, quote });

/** The live chat up to message n (exclusive), played on with a scripted planner; `edit` changes its state first. */
function live(n, edit = null) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    if (edit) inject(g, edit(g.state()));
    return g;
}
const userEvents = (g) => rec(g.chat.findLast((m) => m.is_user)).events;
const opening = (g) => (outcomeOf(g).records || []).filter((r) => r.opening);

// ------------------------------------------------------------------------------------------------ A. group awareness
test('8.4 group 1 (live #19): the open Flame Lance at unaware Glass Beetle D (none hidden from) opens one fight of all four: D\'s Ambush is its one Opening Action, the fight goes on past D\'s death, A, B and C act on their own Turns; all four are aware; the next Lance is no new Ambush; one encounter to its end', async () => {
    const before = foldChat(fx.messages, 19).state;
    assert.deepEqual(before.scene.concealed, []);
    assert.ok([A, B, C, D].every((id) => before.scene.awareness[id] === 'unaware'));
    const g = live(19);
    await say(g, '*i flame Lance Beetle D', lance(D, 'i flame Lance Beetle D'));
    let s = g.state();
    const out = outcomeOf(g);
    assert.equal(out.started.ambush, true, 'the unaware target keeps its Ambush');
    assert.deepEqual(Object.keys(s.encounter.combatants).sort(), ['pc', A, B, C, D].sort(), 'in the fight from its start');
    assert.equal(s.entities[D].status, 'dead');
    assert.ok(s.encounter && !out.ended, 'the fight goes on past the first target the opening killed (.28: it ended there)');
    const opens = opening(g);
    assert.equal(opens.length, 1);
    assert.equal(opens[0].actor, 'pc');
    assert.equal(opens[0].target, D);
    for (const id of [A, B, C]) {
        const own = out.records.filter((r) => r.actor === id);
        assert.ok(own.length >= 1, `${id} acts on its Turn`);
        assert.ok(own.every((r) => r.round === 1 && !r.opening), 'on its own Turn of Round 1, never in the opening');
    }
    for (const id of [A, B, C, D]) assert.equal(s.scene.awareness[id], 'aware');
    // the story keeps the others feeding: not while they fight him
    const r = await g.reply('The other beetles keep grinding at the vein.', { expected: {}, deltas: [{ seq: 1, type: 'aware', who: A, level: 'unaware', scope: null, evidence: 'the other beetles keep grinding at the vein' }] });
    assert.ok(r.record.events.some((e) => e.t === 'delta.rejected' && /aware/.test(e.d.reason)));
    assert.equal(g.state().scene.awareness[A], 'aware');
    // the second Lance (#21): the same fight, no new Ambush
    await say(g, '*i flame Lance Beetle A*', lance(A, 'i flame Lance Beetle A'));
    assert.ok(!userEvents(g).some((e) => e.t === 'encounter.started'));
    assert.ok(userEvents(g).some((e) => e.t === 'encounter.updated'));
    assert.equal(opening(g).length, 0);
    assert.ok(!(outcomeOf(g).records || []).some((x) => x.actor === 'pc' && (x.strikes || []).some((k) => k.crit?.ambush)), 'no Ambush critical');
    // to its end (a strong Alaric): one encounter, and nobody of the group is left unaware of him
    hero(g);
    await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    await fightAll(g);
    s = g.state();
    assert.equal(s.encounter, null);
    const started = g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'encounter.started');
    assert.equal(started.length, 1, 'one fight, not four');
    for (const id of [A, B, C, D]) assert.notEqual(s.scene.awareness[id], 'unaware');
});

test('8.4 group 2: an opening that does not kill its target: the same one fight, the target and the others act on their Turns after it, one Opening Action', async () => {
    const g = live(19, (s) => [{ t: 'entity.updated', d: { id: D, set: { profile: { ...s.entities[D].profile, hp: 300, max_hp: 300 } } } }]);
    await say(g, '*i flame Lance Beetle D', lance(D, 'i flame Lance Beetle D'));
    const s = g.state();
    const out = outcomeOf(g);
    assert.equal(out.started.ambush, true);
    assert.ok(s.encounter.combatants[D].current.hp > 0, 'D lives');
    assert.deepEqual(Object.keys(s.encounter.combatants).sort(), ['pc', A, B, C, D].sort());
    assert.equal(opening(g).length, 1);
    for (const id of [A, B, C, D]) assert.ok(out.records.some((r) => r.actor === id && r.round === 1 && !r.opening), `${id} on its Turn`);
    assert.doesNotMatch(out.started.reason, /alerted by it/, 'no one joins late: all were in from the start');
});

test('8.4 group 3 (stealth): hidden by his stealth (scene.concealed), the unnoticed kill of one stays its own: the others stay out, unaware and not wary; a fight that goes on past the opening still brings them in after it (8.1)', async () => {
    const hide = () => [{ t: 'scene.concealed', d: { ids: ['pc'] } }];
    const g = live(19, hide);
    await say(g, '*i flame Lance Beetle D from hiding*', lance(D, 'i flame Lance Beetle D from hiding'));
    let s = g.state();
    assert.equal(outcomeOf(g).started.ambush, true);
    assert.ok(outcomeOf(g).ended, 'the opening ended it');
    assert.equal(s.entities[D].status, 'dead');
    for (const id of [A, B, C]) {
        assert.equal(s.scene.awareness[id], 'unaware');
        assert.ok(!s.entities[id].wary);
    }
    assert.ok(!userEvents(g).some((e) => e.t === 'encounter.started' && e.d.encounter.combatants[A]), 'A was never forced into it');
    // the tough one: the fight goes on, the others come in after the opening, alerted by it
    const h = live(19, (t) => [...hide(), { t: 'entity.updated', d: { id: D, set: { profile: { ...t.entities[D].profile, hp: 300, max_hp: 300 } } } }]);
    await say(h, '*i flame Lance Beetle D from hiding*', lance(D, 'i flame Lance Beetle D from hiding'));
    s = h.state();
    assert.ok(s.encounter.combatants[A] && s.encounter.combatants[B] && s.encounter.combatants[C]);
    assert.match(outcomeOf(h).started.reason, /join the fight, alerted by it/);
});

test('8.4 group 4: who stays out stays out: a member the story marked no threat, one fleeing or parleying; a group of peaceful people does not join for an open attack on one of them', async () => {
    const g = live(19, () => [{ t: 'entity.updated', d: { id: B, set: { threat: false } } }]);
    // C's own intent as the story booked it (the engine reads s.pending_intents)
    const s1 = structuredClone(g.state());
    s1.pending_intents = { ...(s1.pending_intents || {}), [C]: 'flee' };
    const j = groupJoiners(s1, content, [D], { c: true, pcAttacks: true });
    assert.deepEqual(j, { now: [A], later: [] }, 'A only: B is no threat, C flees');
    s1.pending_intents[C] = 'parley';
    assert.deepEqual(groupJoiners(s1, content, [D], { c: true, pcAttacks: true }).now, [A]);
    // through the product path: B (no threat) is not fought
    await say(g, '*i flame Lance Beetle D', lance(D, 'i flame Lance Beetle D'));
    const s = g.state();
    assert.ok(s.encounter.combatants[A]);
    assert.ok(!s.encounter.combatants[B], 'no threat');
    assert.equal(s.scene.awareness[B], 'unaware', 'its own awareness, as the story has it (unchanged)');
    // peaceful people of one group: an open attack on one brings no other in
    const p = structuredClone(foldChat(fx.messages, 19).state);
    for (const id of ['npc.miner_a', 'npc.miner_b']) {
        p.entities[id] = { id, kind: 'npc', name: null, descriptors: ['miner'], status: 'alive', group: 'miners', template: 'commoner', card: {} };
        p.scene.present.push(id);
        p.scene.awareness[id] = 'unaware';
    }
    assert.deepEqual(groupJoiners(p, content, ['npc.miner_a'], { c: true, pcAttacks: true }), { now: [], later: [] });
});

test('8.4 group 5: an attack refused before any fight (out of reach) opens nothing and alerts no one; the attack turn read again (regenerate) and the chat folded again change nothing', async () => {
    const g = live(19, () => [{ t: 'scene.position', d: { id: D, band: 'LONG', cover: 'none' } }]);
    await say(g, '*i basic attack Beetle D*', { type: 'use_skill', skill: 'mage.basic_attack', target: D, quote: 'i basic attack Beetle D' });
    const ev = userEvents(g);
    assert.ok(!ev.some((e) => e.t === 'encounter.started'));
    assert.ok(!ev.some((e) => e.t === 'scene.awareness'));
    for (const id of [A, B, C, D]) assert.equal(g.state().scene.awareness[id], 'unaware');
    // the open attack, then its regenerate: the same record, no second fight; a replay is the same state
    const h = live(19);
    await say(h, '*i flame Lance Beetle D', lance(D, 'i flame Lance Beetle D'));
    const once = JSON.stringify(rec(h.chat.at(-1)).events);
    await prepareGenerationAsync(h.chat, content, { type: 'regenerate', settings: { planner: true }, llm: h.llm });
    assert.equal(JSON.stringify(rec(h.chat.at(-1)).events), once);
    assert.equal(JSON.stringify(foldChat(h.chat).state), JSON.stringify(h.state()));
    // the reply received and swiped (read again): the fight's events stay on the player's message, once
    await h.reply('The beetles rear.', { expected: {}, deltas: [] });
    await prepareGenerationAsync(h.chat, content, { type: 'swipe', settings: { planner: true }, llm: h.llm });
    assert.equal(h.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'encounter.started' && e.d.encounter.combatants[D]).length, 1);
});

// ------------------------------------------------------------------------------------------------ B. the cull's count
const NEED = { branch: 'loc.glassmere', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
/** The live board of #11 as the generator wrote it (its server log: the beetle cull's DEFEAT 6; its task as written). */
function generated() {
    return rec(fx.messages[11]).events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest).map((q) => ({
        title: q.title, client: q.client, rank: q.rank, level: q.level, qtype: q.qtype, payout_cp: q.payout_cp, task: q.task,
        desired_end_state: q.id === BEETLES ? 'At least six crystal beetles of the outer galleries are dead and the apprentices resume their gathering lessons.' : q.desired_end_state,
        objectives: q.objectives.map(({ id, status, ...o }) => (q.id === BEETLES && o.verb === 'DEFEAT' ? { ...o, qty: 6 } : o)),
        proof: q.proof.map(({ id, ...p }) => p),
    }));
}
function book(listings, s = structuredClone(foldChat(fx.messages, 11).state)) {
    const p = parseBoard(JSON.stringify({ listings }), content, NEED, s);
    const events = [];
    bookBoard(s, content, NEED, p.listings, (e) => events.push(e));
    return { p, s, quests: events.filter((e) => e.t === 'quest.created').map((e) => e.d.quest) };
}
const beetleListing = (more = {}) => ({ ...generated()[0], ...more });

test('8.4 cull 1 (live #11): the beetle cull says four everywhere: its task ("Cull four crystal beetles …", its place, level and purpose kept), its objective, its end state, the board and the HUD; the other listings keep their words', async () => {
    const { quests, s } = book(generated());
    const q = quests.find((x) => x.id === BEETLES);
    assert.equal(q.objectives.find((o) => o.verb === 'DEFEAT').qty, 4);
    assert.equal(q.task, 'Cull four crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, so the academy\'s apprentices can resume their gathering lessons in the cleft.');
    assert.match(q.desired_end_state, /^4 crystal beetles in the outer galleries of level 1 of Glimmerdeep Grotto defeated/);
    assert.equal(goalText(s, content, q, { board: true }), ' (4)');
    assert.doesNotMatch(`${q.task} ${q.desired_end_state}`, /\bsix\b|\b6\b/);
    // the other four listings: as the generator wrote them ("two wool carts" and the dogs' own count untouched)
    const live11 = Object.fromEntries(rec(fx.messages[11]).events.filter((e) => e.t === 'quest.created').map((e) => [e.d.quest.id, e.d.quest]));
    for (const x of quests.filter((y) => y.id !== BEETLES)) {
        assert.equal(x.task, live11[x.id].task, x.id);
        assert.equal(x.desired_end_state, live11[x.id].desired_end_state, x.id);
    }
    // the board read through the host, then the HUD of the contract taken
    const listings = generated().map((l, i) => ({ id: `quest.l${i}`, ...l }));
    const g = new Chat4(content, { listings, greeting: fx.messages[0].mes });
    g.chat = fx.messages.slice(0, 11).map((m) => structuredClone(m));
    g.listings = listings;
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    await say(g, fx.messages[11].mes, { type: 'board.read', rank: null, quote: 'i walk over to the board and look at it' });
    const card = (outcomeOf(g).engine_lines || []).join('\n');
    assert.match(card, /Cull the Crystal Beetles of the Outer Grottos \(4\) · Novice · .* · Cull four crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1/);
    assert.match(outcomeOf(g).actions[0], /\*\*Cull the Crystal Beetles of the Outer Grottos\*\* \(4\) — .* · Cull four crystal beetles/);
    await g.reply('He reads the board.', { expected: {}, deltas: [] });
    const id = Object.values(g.state().quests).find((x) => x.title === 'Cull the Crystal Beetles of the Outer Grottos').id;
    await say(g, '*i take the Cull the Crystal Beetles quest*', { type: 'quest.accept', quest: id, quote: 'i take the Cull the Crystal Beetles quest' });
    const t = g.state();
    assert.equal(goalText(t, content, t.quests[id]), ' — 0/4 defeated');
    // the job memory names the amount once (.28: "DEFEAT 4 beetles crystal beetles in the outer galleries")
    assert.match(objectiveText(t.quests[id]), /DEFEAT 4 crystal beetles in the outer galleries at Glimmerdeep Grotto, level 1/);
});

test('8.4 cull 2: a mixed Dungeon contract keeps every obligation (8.3 replaced its end state by the kill count): the beetles and the pump; a guarding cull keeps its other outcome and only its count follows', () => {
    const mixed = beetleListing({
        title: 'Beetles and the Academy Pump', task: 'Kill six crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, and repair the academy\'s water pump at the vein.',
        desired_end_state: 'Six crystal beetles of the outer galleries are dead and the academy\'s water pump runs again.',
        objectives: [{ verb: 'DEFEAT', what: 'crystal beetles in the outer galleries', qty: 6, unit: null, where: 'Glimmerdeep Grotto, level 1' }, { verb: 'REPAIR', what: 'the academy\'s water pump', qty: null, unit: null, where: 'Glimmerdeep Grotto, level 1' }],
    });
    const [m] = book([mixed]).quests;
    assert.equal(m.desired_end_state, mixed.desired_end_state, 'the pump stays in it');
    assert.equal(m.task, mixed.task);
    assert.deepEqual(m.objectives.map((o) => [o.verb, o.qty]), [['DEFEAT', 6], ['REPAIR', null]], 'no hunt, no count fixed by the Dungeon (as before)');
    const guarding = beetleListing({
        title: 'Guard the Apprentices', task: 'Cull six crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, and guard the apprentices at the vein.',
        desired_end_state: 'Six crystal beetles are dead and the apprentices at the vein come to no harm.',
        objectives: [{ verb: 'DEFEAT', what: 'crystal beetles in the outer galleries', qty: 6, unit: null, where: 'Glimmerdeep Grotto, level 1' }, { verb: 'DEFEND', what: 'the apprentices at the vein', qty: null, unit: null, where: 'Glimmerdeep Grotto, level 1' }],
    });
    const [gq] = book([guarding]).quests;
    assert.equal(gq.objectives[0].qty, 4);
    assert.equal(gq.desired_end_state, 'Four crystal beetles are dead and the apprentices at the vein come to no harm.', 'the count follows, the apprentices stay');
    assert.equal(gq.task, guarding.task, 'not a pure cull: its notice keeps its words');
});

test('8.4 cull 3: only the cull\'s own count changes: "level 1", other amounts and digits stay; a count said twice is ambiguous and the task is the engine\'s plain one; digits stay digits, a capital stays', () => {
    const task = (t) => book([beetleListing({ task: t })]).quests[0].task;
    assert.equal(task('Cull at least 6 crystal beetles on level 1 of Glimmerdeep Grotto for the academy\'s 3 apprentices.'), 'Cull 4 crystal beetles on level 1 of Glimmerdeep Grotto for the academy\'s 3 apprentices.');
    assert.equal(task('Six crystal beetles foul the outer galleries of Glimmerdeep Grotto, level 1: cull them.'), 'Four crystal beetles foul the outer galleries of Glimmerdeep Grotto, level 1: cull them.');
    assert.equal(task('Cull half a dozen beetles in the outer galleries of Glimmerdeep Grotto, level 1.'), 'Cull four beetles in the outer galleries of Glimmerdeep Grotto, level 1.');
    assert.equal(task('Cull the crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, before the academy\'s two lessons.'), 'Cull the crystal beetles in the outer galleries of Glimmerdeep Grotto, level 1, before the academy\'s two lessons.', 'no count of the kind: nothing to contradict');
    assert.equal(task('Cull six crystal beetles in Glimmerdeep Grotto, level 1, then six more beetles at the vein.'), 'Cull 4 crystal beetles in the outer galleries on level 1 of Glimmerdeep Grotto.', 'ambiguous: the engine\'s plain task');
});

test('8.4 text 1: an amount is said once where the what names its unit; a unit of its own stays', () => {
    assert.equal(amountText({ verb: 'DEFEAT', what: 'crystal beetles in the outer galleries', qty: 4, unit: 'beetles' }), '4 crystal beetles in the outer galleries');
    assert.equal(amountText({ verb: 'DEFEAT', what: 'feral dogs of the tannery pack', qty: 4, unit: 'dogs' }), '4 feral dogs of the tannery pack');
    assert.equal(amountText({ verb: 'DEFEAT', what: 'crystal beetles', qty: 4, unit: 'beetle' }), '4 crystal beetles', 'a unit in the singular');
    assert.equal(amountText({ verb: 'DEFEAT', what: 'grey wolves', qty: 3, unit: 'wolf' }), '3 grey wolves');
    assert.equal(amountText({ verb: 'DELIVER', what: 'the sealed ledger satchel', qty: 1, unit: 'satchel' }), 'the sealed ledger satchel (1)');
    assert.equal(amountText({ verb: 'GATHER', what: 'moonwort', qty: 3, unit: 'bundles' }), '3 bundles moonwort');
    assert.equal(amountText({ verb: 'GO', what: 'the eel-weirs', qty: null, unit: null }), 'the eel-weirs');
    const s = foldChat(fx.messages).state;
    assert.equal(objectiveText(s.quests['quest.ledgers_to_the_salt_house_at_brackwick']), 'GET the sealed ledger satchel from Halloran\'s counting room (1) at Glassmere, chandlers\' row; DELIVER the sealed ledger satchel (1) at the salt house, Brackwick hamlet');
});
