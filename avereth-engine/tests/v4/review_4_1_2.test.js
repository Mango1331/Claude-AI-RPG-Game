// The review of 4.1.2 (ChatGPT, 30.09.2026), each counterexample reproduced on 4.1.2 (0814ab5) and fixed in 4.1.3
// (docs/INTEGRATION_4_1.md §10): the kill count held quest.ready back, but the turn-in still completed a hunt on the
// trophies in hand; every ATTACK/DEFEAT objective made a contract a hunt, so mixed work lost the proof of its other
// parts; with "*I shout*" the V4 parser read only the starred parts and missed "I attack the wolf." before them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { contractReady, isHunt as isHuntOf, boardRequest } from '../../src/v4/guild.js';
import { setFactEvents } from '../../src/knowledge.js';
import { deedsOf, parseIntent } from '../../src/intent.js';
import { questXp } from '../../src/progression.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const g0 = new Chat4(content, { listings: gold.board_generator.listings });
await g0.player('Warrior');
await g0.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
const base = g0.state();

const HALL = 'loc.redmarch.guild_hall';
const at = (s, place, location) => { s.scene.at = place; s.scene.location = location; s.scene.present = ['pc']; return s; };
function after(state, ctx = null) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: ctx?.resolutions || [], expected_keys: ctx?.expectedKeys || {}, conditionals: ctx?.conditionals || [],
        booked: ctx?.booked || { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120, ...(ctx?.auth || {}) } } };
    return s;
}
function play(state, commands) {
    const s = structuredClone(state);
    const events = [];
    const ctx = resolveCommands(s, content, commands, (e) => { applyEvent(s, e); events.push(e); });
    return { s, ctx, events };
}
/** A Guild contract he took this turn: `objectives` with their verbs, `proof` as the generator lists it. */
function contract(s, objectives, proof = []) {
    s.quests['quest.x'] = { id: 'quest.x', title: 'Wolves at the Fold', kind: 'guild_contract', status: 'active', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 90, client: 'a shepherd',
        desired_end_state: 'the fold is safe', details: [], notes: [], proof, objectives: objectives.map((o, i) => ({ id: `o${i + 1}`, qty: null, unit: null, where: null, status: 'open', ...o })),
        history: [{ turn: s.turn, minute: s.clock.minute, status: 'active' }], source: { board: HALL, branch: 'loc.redmarch' } };
    s.guild.membership = { rank: 'Novice', since: { turn: 1, minute: 0 }, branch: 'loc.redmarch' };
    return s;
}
function killed(s, n) {
    for (let i = 0; i < n; i++) {
        const id = `mon.wolf_${i}`;
        s.entities[id] = { id, kind: 'creature', species: 'grey wolf', anchor: 'wolf', name: null, descriptors: ['grey wolf'], status: 'alive', location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: 0 }, source: { kind: 'narration' }, card: {} };
        for (const e of setFactEvents(s, { s: id, p: 'status', o: 'dead', source: { kind: 'combat' } })) applyEvent(s, e);
    }
    return s;
}
const ears = (s, qty) => { s.objects['obj.ears'] = { id: 'obj.ears', name: 'wolf ears', kind: 'trophy', qty, unit: 'pair', holder: { entity: 'pc' }, marks: [] }; return s; };
/** Four pairs of ears in hand, `kills` wolves dead; a hunt for four wolves whose listed proof is the four pairs. */
const hunt = (kills) => ears(killed(contract(structuredClone(base), [{ verb: 'FIND', what: 'the wolf pack' }, { verb: 'DEFEAT', what: 'wolves', qty: 4 }], [{ id: 'p1', kind: 'object', what: 'wolf ears', qty: 4, unit: 'pair' }]), kills), 4);
const TURN_IN = [{ seq: 1, type: 'quest.turn_in', quest: 'quest.x', quote: 'I turn in the wolf contract' }];
const coin = (s) => s.entities.pc.sheet.coin_cp;
const ready = (s, alternative) => applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.x', note: 'four wolves dead, the fold is safe', alternative }] }, { msg: 9 });

// ------------------------------------------------------------------------------------------------ 1. the second way
test('the desk does not pay a hunt on the trophies in hand when the engine counts fewer kills (3 of 4, four pairs of ears)', () => {
    const s = at(hunt(3), HALL, 'loc.redmarch');
    const r = play(s, TURN_IN);
    assert.equal(r.ctx.resolutions[0].status, 'refused', '4.1.2 completed it by the proof and paid 90 cp');
    assert.match(r.ctx.resolutions[0].reason, /engine counts 3 of 4 wolves defeated/);
    assert.deepEqual([coin(r.s), r.s.quests['quest.x'].status, r.s.entities.pc.sheet.xp], [coin(s), 'active', s.entities.pc.sheet.xp]);
    assert.deepEqual(r.events.filter((e) => e.t === 'proof.checked').map((e) => e.d.mode), ['count_short']);
    assert.equal(r.s.objects['obj.ears'].qty, 4, 'the trophies stay his');
});

test('the turn-in on arriving at the hall makes the same check; its line says so beforehand', () => {
    const road = at(hunt(3), 'realm.veyrhold', 'realm.veyrhold');
    const p = play(road, [{ seq: 1, type: 'go', to: HALL, quote: 'I walk back to the hall' }, { seq: 2, type: 'quest.turn_in', quest: 'quest.x', quote: 'and turn in the wolf contract' }]);
    assert.equal(p.ctx.resolutions[1].status, 'conditional');
    const w = applyWorld(after(p.s, p.ctx), content, { expected: { 1: { arrived: true, at: HALL, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null }] }, { msg: 9 });
    assert.equal(w.state.scene.at, HALL);
    assert.ok(w.system.some((x) => /TURN-IN REFUSED — Wolves at the Fold: the engine counts 3 of 4 wolves defeated/.test(x)), w.system.join(' | '));
    assert.deepEqual([coin(w.state), w.state.quests['quest.x'].status], [coin(road), 'active']);
    assert.match(p.ctx.actions.join(' '), /TURNS IN, when he reaches the Guild hall — "Wolves at the Fold": the desk will refuse it: the engine counts 3 of 4 wolves defeated/);
});

test('one check for every way: a readiness booked without the count (a campaign of 4.1.1) is not paid either, nor shown as ready', () => {
    const s = at(hunt(3), HALL, 'loc.redmarch');
    delete s.objects['obj.ears'];
    applyEvent(s, { t: 'quest.ready', d: { id: 'quest.x', note: 'four adults, all told' } });
    assert.equal(s.quests['quest.x'].ready, true);
    assert.deepEqual([contractReady(s, content, s.quests['quest.x']).ok, contractReady(s, content, s.quests['quest.x']).mode], [false, 'count_short']);
    assert.equal(play(s, TURN_IN).ctx.resolutions[0].status, 'refused');
    const info = buildCatalog(s, content).quests.find((q) => q.id === 'quest.x').info;
    assert.match(info, /defeated \(engine count\): 3 of 4 wolves/);
    assert.ok(!/(?<!NOT )READY FOR TURN-IN:/.test(info) && /NOT READY FOR TURN-IN/.test(info), info);
});

test('a way the story establishes otherwise still completes it, once: the alternative stays with the contract', () => {
    const s = at(hunt(3), HALL, 'loc.redmarch');
    assert.deepEqual(ready(s, null).events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule), ['quest_count']);
    const r = ready(s, 'the fourth wolf, the old leader\'s mate, fled the valley for good after the pack broke');
    const q = r.state.quests['quest.x'];
    assert.equal(q.ready, true);
    assert.match(q.ready_alternative, /fled the valley for good/);
    assert.match(buildCatalog(r.state, content).quests.find((x) => x.id === 'quest.x').info, /READY FOR TURN-IN: four wolves dead, the fold is safe — the fourth wolf/);
    const paid = play(r.state, TURN_IN);
    assert.equal(paid.ctx.resolutions[0].status, 'resolved');
    assert.equal(coin(paid.s), coin(s) + 90);
    assert.equal(paid.events.filter((e) => e.t === 'coin.changed').length, 1);
    assert.equal(paid.s.entities.pc.sheet.xp, s.entities.pc.sheet.xp + questXp(1, 'standard', content), 'Quest XP once');
    assert.equal(paid.s.quests['quest.x'].status, 'completed');
    const again = play(paid.s, TURN_IN);
    assert.equal(again.ctx.resolutions[0].reason, 'already_completed');
    assert.equal(coin(again.s), coin(paid.s), 'no second payout');
});

test('the full count completes a hunt by its proof as before; work without a number is not counted at all', () => {
    const full = play(at(hunt(4), HALL, 'loc.redmarch'), TURN_IN);
    assert.equal(full.ctx.resolutions[0].status, 'resolved');
    assert.deepEqual(full.events.filter((e) => e.t === 'proof.checked').map((e) => e.d.mode), ['legacy_verification']);
    assert.deepEqual(full.s.objects['obj.ears'].holder, { consumed: 'guild' }, 'the listed trophies are handed over');
    // a basket of herbs: no DEFEAT, no count; the proof in hand completes it
    const herbs = contract(at(structuredClone(base), HALL, 'loc.redmarch'), [{ verb: 'GATHER', what: 'marshmint', qty: 1, unit: 'basket' }], [{ id: 'p1', kind: 'object', what: 'marshmint', qty: 1, unit: 'basket' }]);
    herbs.objects['obj.mint'] = { id: 'obj.mint', name: 'marshmint', kind: 'resource', qty: 1, unit: 'basket', holder: { entity: 'pc' }, marks: [] };
    assert.equal(play(herbs, TURN_IN).ctx.resolutions[0].status, 'resolved');
    // a DEFEAT without a number ("the weasel"): the story's readiness alone
    const weasel = contract(at(structuredClone(base), HALL, 'loc.redmarch'), [{ verb: 'DEFEAT', what: 'the weasel' }]);
    applyEvent(weasel, { t: 'quest.ready', d: { id: 'quest.x', note: 'the weasel is dead' } });
    assert.equal(play(weasel, TURN_IN).ctx.resolutions[0].status, 'resolved');
});

// ------------------------------------------------------------------------------------------------ 2. hunt or mixed
test('a hunt is kill work: FIND/GO to reach the targets and DEFEND what they threaten go with it; other work makes it mixed', () => {
    const verbs = (...v) => ({ objectives: v.map((verb) => ({ verb, what: 'wolves' })) });
    const isHunt = (c, q) => isHuntOf(q, c);
    assert.equal(isHunt(content, verbs('FIND', 'DEFEAT', 'DEFEND')), true, 'the bog striders of the live run');
    assert.equal(isHunt(content, verbs('FIND', 'DEFEAT')), true);
    assert.equal(isHunt(content, verbs('ATTACK')), true);
    assert.equal(isHunt(content, verbs('REPAIR', 'DEFEAT')), false, 'the watch post and what nests in it');
    assert.equal(isHunt(content, verbs('DEFEAT', 'DELIVER')), false);
    assert.equal(isHunt(content, verbs('TALK', 'DEFEAT')), false);
    assert.equal(isHunt(content, verbs('ESCORT', 'DEFEND')), false, 'no kill work');
    assert.equal(isHunt(content, verbs()), false);
});

test('mixed work keeps the proof of its other parts: the watch captain\'s inspection stays, no "no signature" line; its kills are still counted', () => {
    const s = contract(structuredClone(base), [{ verb: 'REPAIR', what: 'the old watch post' }, { verb: 'DEFEAT', what: 'giant rats', qty: 3 }], [{ id: 'p1', kind: 'mark', what: 'signed by the watch captain', on: 'contract slip' }]);
    const note = 'The watch captain must inspect the repaired post and sign the slip before payment.';
    const r = applyWorld(after(s), content, { expected: {}, deltas: [{ seq: 1, type: 'quest.detail', quest: 'quest.x', note, schedule: null }] }, { msg: 9 });
    assert.deepEqual(r.state.quests['quest.x'].details.map((x) => x.note), [note], '4.1.2 refused the whole note');
    assert.ok(!r.corrections.some((c) => /hunt contract/.test(c)));
    const listed = at(structuredClone(s), HALL, 'loc.redmarch');
    Object.assign(listed.quests['quest.x'], { status: 'listed', history: [] });
    const acc = play(listed, [{ seq: 1, type: 'quest.accept', quest: 'quest.x', quote: 'I take the watch post job' }]);
    assert.equal(acc.ctx.resolutions[0].status, 'resolved');
    assert.ok(!/no local inspection/.test(acc.ctx.actions.join(' ')), acc.ctx.actions.join(' '));
    // the count is no hunt matter: three rats named, one dead, the story says done without saying how
    const counted = killed(structuredClone(s), 0);
    assert.deepEqual(ready(counted, null).events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule), ['quest_count']);
});

test('a hunt without listed proof names trophies of the kills (4.1.2 wrote "Proof: no fixed verification listed brought to a Guild hall")', () => {
    const s = at(contract(structuredClone(base), [{ verb: 'DEFEAT', what: 'wolves', qty: 2 }]), HALL, 'loc.redmarch');
    Object.assign(s.quests['quest.x'], { status: 'listed', history: [] });
    const line = play(s, [{ seq: 1, type: 'quest.accept', quest: 'quest.x', quote: 'I take the wolves' }]).ctx.actions.join(' ');
    assert.match(line, /Proof: trophies of the kills brought to a Guild hall; no local inspection, witness or signature is required\./);
});

test('the Board generator is told the difference, and its version says the prompt changed', async () => {
    const need = { branch: 'loc.redmarch', rank: 'Novice', missing: 5, day: 1, have: [] };
    const req = boardRequest(base, content, need);
    const text = JSON.stringify(req);
    assert.match(text, /Mixed work \(repair the old watch post and clear out what nests in it\) keeps a fitting proof for each part/);
    const { BOARD_VERSION } = await import('../../src/v4/guild.js');
    assert.notEqual(BOARD_VERSION, 'board-4.4', '4.1.2 changed the prompt and schema (task, hunt proof) and kept board-4.4');
    assert.match(fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8'), /Mixed work keeps the proof its other parts need/);
});

// ------------------------------------------------------------------------------------------------ 3. the deeds of a message
test('"I attack the wolf. *I shout* Get back!": the declared attack counts; a report, a threat or a question outside the stars does not', () => {
    const s = after(structuredClone(base));
    const w = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: 'the wolf', species: 'grey wolf', anchor: 'wolf', desc: [], count: 1, present: true, band: 'SHORT' }] }, { msg: 9 }).state;
    const wolf = Object.values(w.entities).find((e) => e.kind === 'creature').id;
    const intent = (m) => { const i = parseIntent(m, w, content); return [i.kind, i.target ?? null]; };
    assert.deepEqual(intent('I attack the wolf. *I shout* Get back!'), ['attack', wolf], '4.1.2: narrative');
    // what stays speech (review of 4.1.3: the words after a speech tag are said, 4.1.3 read these two as attacks)
    assert.equal(intent('Get back! *I shout* and I slash at the wolf')[0], 'narrative');
    assert.equal(intent('*i say* I strike the wolf.')[0], 'narrative');
    assert.equal(intent('found 3 killed 2 *i say calmly* is that enough for you to sign my proof? or do i have to hunt more?')[0], 'narrative');
    assert.equal(intent('I found three and killed two *i say calmly*')[0], 'narrative', 'a report in the past tense');
    assert.equal(intent('I killed two of them *i say*')[0], 'narrative');
    assert.equal(intent('I will kill you all! *i shout*')[0], 'narrative', 'a threat is no commitment (Core #23)');
    assert.equal(intent('I have killed two *i say*')[0], 'narrative');
    // no speech convention: the whole message as before
    assert.deepEqual(intent('I attack the wolf.'), ['attack', wolf]);
    assert.deepEqual(intent('*I attack the wolf*'), ['attack', wolf]);
    assert.equal(deedsOf('I attack the wolf. *I shout* Get back!'), 'I attack the wolf. I shout');
    assert.equal(deedsOf('I quietly draw my sword. *i whisper* stay back'), 'I quietly draw my sword. i whisper');
});
