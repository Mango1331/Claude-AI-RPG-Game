import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { combatTruth } from '../../src/v4/combat_truth.js';
import { turnBlock, foldChat, rec } from '../../src/host.js';
import { extractionRequest } from '../../src/v4/runtime.js';
import { applyEvent } from '../../src/state.js';
import { playerTurn } from '../../src/engine.js';
import { slotForNew, sealRefusal } from '../../src/v4/living.js';
import { campaign, say, walk, delve, hero, living, CATA } from './patch8_lib.js';

const content = await loadProductContent();
const run1 = JSON.parse(fs.readFileSync(new URL('./fixtures/run1_attack_truth.json', import.meta.url)));
const run8 = JSON.parse(fs.readFileSync(new URL('./fixtures/run8_creative_warden.json', import.meta.url)));
const base = (await campaign(content)).state();
function scene() {
    const s = structuredClone(base);
    s.entities['npc.rask'] = { id: 'npc.rask', kind: 'npc', name: 'Rask', descriptors: ['bandit'], traits: '', status: 'alive', location: s.scene.location, at: s.scene.at, template: 'bandit', card: {}, created: { turn: 1, minute: 0 } };
    s.scene.present.push('npc.rask');
    s.scene.positions['npc.rask'] = { band: 'SHORT', cover: 'none' };
    s.last.outcome = { kind: 'v4', actions: [], extra: [], resolutions: [], auth: { c: true } };
    return s;
}
const hostile = { seq: 1, type: 'hostile', by: ['npc.rask'] };
const world = (s, prose, deltas = [hostile]) => applyWorld(s, content, { expected: {}, deltas }, { prose, msg: 99 });
const opens = (r) => r.events.some((e) => ['combat.pending', 'encounter.started'].includes(e.t));

for (const prose of [
    'Rask blocks the wagon with his bow raised. "Leave the cargo or we shoot," he says. The other bandits keep their bows aimed at Alaric.',
    'Rask threatens to attack unless Alaric gives him the wagon.',
    'Rask draws his sword and waits for an answer.',
]) test(`3A: threat stays negotiable: ${prose.slice(0, 42)}`, () => {
    const r = world(scene(), prose);
    assert.equal(opens(r), false);
    assert.ok(r.rejected.some((x) => x.rule === 'attack_commitment'));
    assert.equal(r.state.entities.pc.sheet.hp, base.entities.pc.sheet.hp);
});

test('3A: attack intent cannot turn a conditional threat into First Strike', () => {
    const r = world(scene(), 'Rask says "One more step and I attack."', [{ seq: 1, type: 'intent', who: 'npc.rask', intent: 'attack' }]);
    assert.equal(opens(r), false);
    assert.notEqual(r.state.pending_intents['npc.rask'], 'attack');
});
for (const prose of ['Rask looses an arrow at Alaric.', 'Rask lunges at Alaric with his knife.', 'Rask attacks without waiting for a reply.']) test(`3A: genuine NPC initiative: ${prose}`, () => {
    assert.equal(opens(world(scene(), prose)), true);
});
test('3A: an actual new ambusher can attack, but forged evidence cannot authorize it', () => {
    const born = { seq: 1, type: 'person.new', ref: 'scarred footpad', name: null, role: 'bandit', desc: ['knife drawn'], present: true, band: 'SHORT' };
    const attack = { ...hostile, seq: 2, by: ['scarred footpad'] };
    assert.equal(opens(world(scene(), 'A scarred footpad leaps from hiding and stabs at Alaric.', [born, attack])), true);
    assert.equal(opens(world(scene(), 'Rask watches the wagon.', [{ ...hostile, evidence: 'Rask attacks Alaric.' }])), false);
});

const bolt = (round, targets = ['npc.rask']) => ({ round, actor: 'pc', kind: 'attack', skill: 'mage.arcane_bolt', skill_name: 'Arcane Bolt', strikes: targets.map((target) => ({ target, final: 4, hp_before: 20, hp_after: 16 })) });
function combatState(records = [bolt(1)]) {
    const s = scene();
    s.last.outcome = { kind: 'combat', started: {}, c: true, records, board: { hp: [], labels: {} } };
    return s;
}
test('3A: false cast count is removed clause by clause from lasting memory', () => {
    const r = world(combatState(), '', [{ seq: 1, type: 'memory', text: 'Alaric cast three Arcane Bolts in this fight. Rask wore a red cloak.', about: ['pc', 'npc.rask'], weight: 1 }]);
    const text = JSON.stringify(r.state.memories);
    assert.doesNotMatch(text, /three Arcane Bolts/);
    assert.match(text, /red cloak/);
    assert.ok(r.corrections.some((x) => /Arcane Bolt/i.test(x)));
});
test('3A: one multi-hit/AoE action is one cast; legitimate three casts and subjective claims stay', () => {
    const one = combatTruth(combatState([bolt(1, ['npc.rask', 'npc.other', 'npc.third'])]), content);
    assert.ok(one('Alaric cast three Arcane Bolts in this fight.'));
    assert.equal(one('Alaric cast one Arcane Bolt that struck three foes.'), null);
    const three = combatTruth(combatState([bolt(1), bolt(2), bolt(3)]), content);
    assert.equal(three('Alaric cast three Arcane Bolts in this fight.'), null);
    assert.equal(one('Rask claims Alaric cast three Arcane Bolts.'), null);
    assert.equal(one('Three sparks trail from the Arcane Bolt.'), null);
});

test('3A: encounter history beyond log cap reaches narrator and extractor without duplicate snapshot actions', async () => {
    const g = await campaign(content);
    await say(g, '*I watch*');
    const records = Array.from({ length: 25 }, (_, i) => bolt(i + 1));
    const enc = { id: 'enc.truth', combatants: {}, log: records.slice(0, 5) };
    const r = rec(g.chat.findLast((m) => m.is_user));
    r.events.push({ t: 'encounter.started', d: { encounter: enc } });
    for (let i = 5; i <= 25; i += 5) r.events.push({ t: 'encounter.updated', d: { encounter: { ...enc, log: records.slice(Math.max(0, i - 20), i) } } });
    r.events.push({ t: 'encounter.ended', d: { summary: {} } }, { t: 'outcome.recorded', d: { outcome: { kind: 'combat', c: true, records: [records.at(-1)], board: { hp: [], labels: {}, pc: { mp: 1, max_mp: 1, sta: 1, max_sta: 1 } }, ended: { defeated: [], escaped: [] } }, situations: [] } });
    const u = g.chat.length - 1;
    const text = turnBlock(g.chat, u, content).context.text;
    assert.match(text, /COMBAT CHRONICLE/);
    assert.match(text, /Arcane Bolt: 25/);
    await g.reply('He remembers the battle.', { expected: {}, deltas: [] });
    // A fresh pending reply uses the same saved events, not a mutable global counter.
    const reply = g.chat.at(-1);
    rec(reply).extraction.status = 'pending';
    const req = extractionRequest(g.chat, g.chat.length - 1, content);
    assert.match(req.actions, /Arcane Bolt: 25/);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
});

async function dungeon() {
    const g = await campaign(content); hero(g);
    await walk(g, CATA);
    await delve(g, 'First Burial Gallery', { bring: false });
    return g;
}
const creative = { seq: 1, type: 'creature.new', ref: 'cr.patched_greater_skeleton', species: 'patched greater skeleton', anchor: 'skeleton', desc: ['extra vertebrae and a crutchblade; a patrolling guardian', 'a ring of old keys'], count: 1, present: true, band: 'MEDIUM', stronger: true, threat: null, more: null };
test('3A: Run 8 shape: free Warden binds despite earlier living Gravekeeper, with locked slot power', async () => {
    const g = await dungeon();
    const s = g.state(); const x = living(g); s.dungeons[CATA] = x;
    x.ahead = null;
    const slots = x.run.floors[1].slots;
    for (const sl of slots.filter((a) => a.role === 'minion')) {
        sl.entities = [`mon.${sl.id}`];
        s.entities[sl.entities[0]] = { id: sl.entities[0], kind: 'creature', species: sl.species, anchor: sl.anchor, status: sl === slots[0] ? 'dead' : 'alive', at: s.scene.at, location: s.scene.location };
    }
    const guard = slots.find((a) => a.role === 'guard');
    const r = world(s, 'A patched greater skeleton stands guard here, carrying old keys.', [creative]);
    const ids = r.state.dungeons[CATA].run.floors[1].slots.find((a) => a.id === guard.id).entities;
    assert.equal(ids.length, 1);
    const e = r.state.entities[ids[0]];
    assert.equal(e.profile.level, guard.levels[0]);
    assert.equal(e.profile.type, 'elite');
    assert.equal(e.slot.id, guard.id);
    assert.equal(r.state.dungeons[CATA].run.floors[1].cleared, null);
    r.state.places['loc.lower_test'] = { id: 'loc.lower_test', name: 'Lower test', kind: 'interior', parent: CATA, level: 2 };
    assert.ok(sealRefusal(r.state, 'loc.lower_test', 2), 'living earlier minion still blocks the seal');
    assert.equal(slotForNew(r.state, content, creative, s.scene.at).existing, true, 'the same story ref reuses its existing identity, not its budget');
    assert.deepEqual(foldChat(g.chat).state.dungeons[CATA].run.floors[1].slots, g.state().dungeons[CATA].run.floors[1].slots);
});
test('3A: ambiguous/unseen/incompatible new foes cannot spend arbitrary slots; no fabricated key gate', async () => {
    const g = await dungeon(); const s = g.state(); s.dungeons[CATA].ahead = null;
    for (const sl of s.dungeons[CATA].run.floors[1].slots) { sl.anchor = 'skeleton'; sl.count = 1; }
    assert.equal(slotForNew(s, content, creative, s.scene.at), null, 'three compatible slots, no unique assignment');
    assert.equal(slotForNew(s, content, { ...creative, present: false }, s.scene.at), null);
    const r = world(s, 'Something huge waits here; its keys are the only way down.', [{ ...creative, anchor: 'dragon', species: 'dragon' }]);
    assert.ok(r.rejected.some((a) => a.rule === 'dungeon_foe'));
    assert.ok(r.corrections.some((a) => /key|gate/i.test(a)));
});


test('3A: original Run 1 ultimatum creates five actors, no attack or free damage', () => {
    const r = world(scene(), run1.threatProse, run1.deltas);
    assert.equal(Object.values(r.state.entities).filter((e) => e.id.includes('ford_robber')).length, 5);
    assert.equal(opens(r), false);
    assert.equal(r.state.entities.pc.sheet.hp, base.entities.pc.sheet.hp);
});
test('3A: original Run 1 false three-impact memory is not persisted', () => {
    const r = world(combatState(run1.records), '', [run1.memory]);
    assert.doesNotMatch(JSON.stringify(r.state.memories), /three bolts struck/);
    assert.ok(r.corrections.some((c) => /impact/.test(c)));
    const check = combatTruth(combatState([bolt(1, ['npc.rask', 'npc.two', 'npc.three'])]), content);
    assert.equal(check('Three bolts struck the three foes.'), null);
});
test('3A: original Run 8 extraction binds the free Level-4 Warden once and makes it targetable', () => {
    const s = scene();
    Object.assign(s, { turn: run8.turn, clock: run8.clock, scene: run8.scene });
    Object.assign(s.places, structuredClone(run8.places));
    Object.assign(s.entities, structuredClone(run8.entities));
    s.dungeons = { [CATA]: structuredClone(run8.dungeon) };
    const answer = { expected: {}, deltas: run8.answer.deltas };
    const r = world(s, run8.prose, answer.deltas);
    const slot = r.state.dungeons[CATA].run.floors[1].slots.find((x) => x.id === 'warden');
    assert.equal(slot.entities.length, 1);
    const id = slot.entities[0];
    assert.ok(r.state.scene.present.includes(id));
    assert.equal(r.state.entities[id].profile.level, 4);
    assert.equal(r.state.entities[id].profile.type, 'elite');
    assert.equal(r.state.entities[id].status, 'alive');
    assert.equal(r.state.dungeons[CATA].run.floors[1].slots.find((x) => x.id === 'gallery').entities.length, 1);
    const attack = playerTurn(r.state, content, '*I use Arcane Bolt on Gallery Warden*', { c: true });
    assert.ok(attack.outcome.records?.some((a) => a.actor === 'pc' && a.kind === 'attack'), JSON.stringify(attack.outcome));
    const again = world(r.state, run8.prose, answer.deltas);
    assert.equal(again.rejected.some((a) => a.rule === 'dungeon_foe'), false);
    assert.deepEqual(again.state.dungeons[CATA].run.floors[1].slots.find((x) => x.id === 'warden').entities, [id]);
    assert.equal(Object.values(again.state.entities).filter((x) => x.slot?.id === 'warden').length, 1);
});
test("3A: another actor attacking does not turn Rask's own ultimatum into an attack", () => {
    assert.equal(opens(world(scene(), 'Rask aims his bow and waits. A wolf lunges at Alaric.')), false);
});
test('3A: three bone heaps cannot erase a skeleton the engine still has alive', () => {
    const s = combatState();
    for (let i = 0; i < 3; i++) {
        const id = `mon.bones${i}`;
        s.entities[id] = { id, kind: 'creature', anchor: 'skeleton', species: 'skeleton', status: i === 2 ? 'alive' : 'dead', location: s.scene.location, at: s.scene.at };
        s.scene.present.push(id);
    }
    const r = world(s, '', [{ seq: 1, type: 'memory', text: 'Three heaps of bone lay on the floor. The gallery smelled of dust.', who: ['pc'], imp: 5 }]);
    assert.doesNotMatch(JSON.stringify(r.state.memories), /Three heaps/);
    assert.match(JSON.stringify(r.state.memories), /dust/);
    s.last.outcome = { kind: 'v4', actions: [], auth: { c: true } };
    assert.equal(combatTruth(s, content)('Three heaps of bone lay in the ancient tomb.'), null, 'unrelated environmental bones are free fiction');
});

test('3A: pronoun continuation can commit, while evidence fragments cannot conceal a conditional', () => {
    assert.equal(opens(world(scene(), 'Rask raises his bow. He looses an arrow at Alaric.')), true);
    assert.equal(opens(world(scene(), 'Rask attacks if Alaric refuses.', [{ ...hostile, evidence: 'Rask attacks' }])), false);
    assert.equal(opens(world(scene(), 'Rask does not attack.')), false);
});
test('3A: the same false combat count is excluded from facts and objective threads', () => {
    const r = world(combatState(), '', [
        { seq: 1, type: 'fact', s: 'pc', p: 'cast', o: 'three Arcane Bolts in this fight' },
        { seq: 2, type: 'thread', id: null, kind: 'threat', text: 'Alaric cast three Arcane Bolts in this fight. Rask still blocks the door.', status: 'open', resolution: null },
        { seq: 3, type: 'thread', id: null, kind: 'rumor', text: 'Rask claims Alaric cast three Arcane Bolts.', status: 'open', resolution: null },
    ]);
    assert.equal(r.events.some((e) => e.t === 'fact.asserted' && /three Arcane/.test(JSON.stringify(e))), false);
    const text = JSON.stringify(r.state.threads);
    assert.doesNotMatch(text, /in this fight/);
    assert.match(text, /still blocks the door/);
    assert.match(text, /claims Alaric/);
});
test('3A: rejected foe cannot leave a mandatory phantom key in memory; atmosphere and rumor stay', async () => {
    const g = await dungeon(); const s = g.state(); s.dungeons[CATA].ahead = null;
    const r = world(s, 'A dragon guards the stair with the only key.', [
        { ...creative, species: 'dragon', anchor: 'dragon', ref: 'cr.dragon' },
        { seq: 2, type: 'memory', text: 'A dragon guards the stair with the required key. Cold air moves through the gallery.', who: ['pc'], imp: 5 },
        { seq: 3, type: 'thread', id: null, kind: 'rumor', text: 'Travelers claim a dragon guards the stair.', status: 'open', resolution: null },
    ]);
    assert.doesNotMatch(JSON.stringify(r.state.memories), /required key/);
    assert.match(JSON.stringify(r.state.memories), /Cold air/);
    assert.match(JSON.stringify(r.state.threads), /Travelers claim/);
});
function originalDungeon() {
    const s = scene();
    Object.assign(s, structuredClone({ turn: run8.turn, clock: run8.clock, scene: run8.scene }));
    Object.assign(s.places, structuredClone(run8.places));
    Object.assign(s.entities, structuredClone(run8.entities));
    s.dungeons = { [CATA]: structuredClone(run8.dungeon) };
    return s;
}
test('3A: slot boundaries, current-ahead precedence and peaceful visitors', () => {
    const s = originalDungeon();
    const x = s.dungeons[CATA]; const guard = x.run.floors[1].slots.find((a) => a.id === 'warden');
    assert.equal(slotForNew(s, content, { ...creative, present: false }, s.scene.at), null);
    assert.equal(slotForNew(s, content, { ...creative, threat: false }, s.scene.at), null);
    assert.equal(slotForNew(s, content, { ...creative, more: true }, s.scene.at), null);
    assert.equal(slotForNew(s, content, { ...creative, count: 2 }, s.scene.at), null);
    guard.taken = { party: 'party.someone', minute: 1 };
    assert.equal(slotForNew(s, content, creative, s.scene.at), null);
    guard.taken = null;
    s.places['loc.lower_test'] = { id: 'loc.lower_test', name: 'Lower', kind: 'interior', parent: CATA, level: 2 };
    assert.equal(slotForNew(s, content, creative, 'loc.lower_test'), null);
    const gallery = x.run.floors[1].slots.find((a) => a.id === 'gallery');
    gallery.entities = [];
    x.ahead = { turn: s.turn, cycle: x.cycle, floor: 1, slot: gallery.id };
    assert.equal(slotForNew(s, content, creative, s.scene.at).slot.id, 'gallery', 'the advertised encounter takes priority');
});
test('3A: slot alias is replayable, cannot revive a defeated Warden, and does not clear its living predecessor', () => {
    const s = originalDungeon();
    const r = world(s, run8.prose, run8.answer.deltas);
    const replay = structuredClone(s);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay.dungeons[CATA], r.state.dungeons[CATA]);
    const guard = replay.dungeons[CATA].run.floors[1].slots.find((a) => a.id === 'warden');
    replay.entities[guard.entities[0]].status = 'dead';
    const again = world(replay, run8.prose, run8.answer.deltas);
    assert.ok(again.rejected.some((x) => x.rule === 'dungeon_slot'));
    assert.equal(again.state.dungeons[CATA].run.floors[1].cleared, null);
    assert.equal(again.events.some((e) => e.t === 'xp.awarded'), false);
});
