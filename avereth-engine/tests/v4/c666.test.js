// c.6.6.6: the live test of 18.10.2026 ("Branch #3" of the campaign of 15.10.2026, played under c.6.6.5): the four pups
// lost from the scene when Alaric stepped into their den, an Arcane Burst that struck the one hound in the fight and not
// the three ENGAGED beside it, a hunt contract that counted 0 of 4 after two kills and stored its progress twice, the
// sale of 280 cp that left no trace in the System block, and steps among a group that only the story told.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { defeatTally, tallyText, countShort, drivesOff } from '../../src/v4/guild.js';
import { namesKind, sameKinds, namesYoung, progressKey } from '../../src/v4/domain.js';
import { areaCaught, approachedBy } from '../../src/v4/scene_handles.js';
import { bystanderEvents } from '../../src/v4/settlement.js';
import { applyEvent } from '../../src/state.js';
import { scaleCreature } from '../../src/npcgen.js';
import { addCombatant, attackAction } from '../../src/combat.js';
import { Dice } from '../../src/rng.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018.json'), 'utf8'));
const QUEST = 'quest.clear_the_feral_hounds_from_the_tannery_row_alleys';
const A = 'mon.hound_pair_1';
const B = 'mon.hound_pair_2';
const C = 'mon.monhound_bitch_leader';
const D = 'mon.monhound_young';
const PUPS = [1, 2, 3, 4].map((n) => `mon.monhound_pups_${n}`);
const DEN = 'loc.ashbridge.tannery_row_alleys.hound_den_under_the_lean_to';
const BURST = { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'i arcane burst' };
// the live extractor's answer to #118 (CMD logger): the den, no one "with" him
const LIVE_DEN = {
    expected: { 1: { arrived: true, at: { new: { name: 'Hound Den under the Lean-to', kind: 'interior', parent: 'loc.ashbridge.tannery_row_alleys' } }, with: null } },
    deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'Hound Den under the Lean-to', kind: 'interior', parent: 'loc.ashbridge.tannery_row_alleys' } }, forced_by: null, with: null },
        { seq: 2, type: 'fact', s: 'feral hound pack', p: 'remaining members', o: 'two hounds dead in the lane, two fled long gone toward the scrap-heaps; the pups are the pack\'s last living pieces' },
    ],
};

/** The live chat up to message `n` (exclusive), played on with a scripted planner (Prototype C on). */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
}
const lastUser = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => lastUser(g).events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
/** Events added to the last message's record, as if its reply had established them (a scene the live run did not have). */
function inject(g, events) {
    const m = g.chat.at(-1);
    m.extra.avereth.events.splice(-1, 0, ...events);
}
const burstOf = (g) => outcomeOf(g).records.find((r) => r.actor === 'pc' && r.kind === 'attack' && r.skill === 'mage.arcane_burst');

// ------------------------------------------------------------------------------------------------ P0 presence
test('c.6.6.6 presence (test 1): stepping into the den toward the pups keeps the four pups in his scene; the dead hounds and whoever he did not go to stay behind', async () => {
    const g = live(117);
    const before = g.state();
    assert.deepEqual(PUPS.filter((id) => before.scene.present.includes(id)), PUPS, 'the four pups in the alley scene');
    await say(g, fx.messages[117].mes, { type: 'go', to: { new: 'into the dark toward the pups' }, quote: 'i walk into the dark looking for the pups' });
    await g.reply(fx.messages[118].mes, LIVE_DEN);
    const s = g.state();
    assert.equal(s.scene.at, DEN);
    assert.equal(s.places[DEN].parent, 'loc.ashbridge.tannery_row_alleys');
    assert.deepEqual(PUPS.filter((id) => s.scene.present.includes(id)), PUPS, 'live: "PRESENT: nobody besides Alaric"');
    for (const id of PUPS) assert.equal(s.scene.positions[id].band, 'SHORT');
    assert.ok(![A, C].some((id) => s.scene.present.includes(id)), 'the dead hounds lie in the lane');
    // nobody is moved into the den wholesale: a step into the lean-to that does not go to them leaves them where they were
    const h = live(117);
    await say(h, '*i duck into the lean-to to get out of the wind*', { type: 'go', to: { new: 'the lean-to' }, quote: 'i duck into the lean-to' });
    await h.reply('He ducked under the lean-to.', LIVE_DEN);
    assert.ok(!PUPS.some((id) => h.state().scene.present.includes(id)));
    // the story says they are there with him (arrive.with, the extractor rule): they are, whatever his words
    const w = live(117);
    await say(w, '*i duck into the lean-to to get out of the wind*', { type: 'go', to: { new: 'the lean-to' }, quote: 'i duck into the lean-to' });
    await w.reply('He ducked under the lean-to; the pups were there.', { ...LIVE_DEN, deltas: [{ ...LIVE_DEN.deltas[0], with: PUPS }] });
    assert.deepEqual(PUPS.filter((id) => w.state().scene.present.includes(id)), PUPS);
});

test('c.6.6.6 presence + AoE (tests 1, 3, 4): in the den, "I walk in front of them and then Arcane Burst" steps in and strikes the four pups with one cast; without the step nobody is ENGAGED and nothing is spent', async () => {
    const g = live(117);
    await say(g, fx.messages[117].mes, { type: 'go', to: { new: 'into the dark toward the pups' }, quote: 'i walk into the dark looking for the pups' });
    await g.reply(fx.messages[118].mes, LIVE_DEN);
    const mp = g.state().entities.pc.sheet.mp;
    // the live planner's answer (no step): the pups are at SHORT, the burst reaches ENGAGED only
    const r0 = await say(g, fx.messages[119].mes, BURST);
    assert.ok(!(r0.panels || []).some((p) => /TARGET NEEDED/.test(p)), 'no "ATTACK — TARGET NEEDED"');
    assert.ok(!g.state().encounter, 'nobody ENGAGED: no fight');
    assert.equal(g.state().entities.pc.sheet.mp, mp, 'nothing spent');
    assert.match(outcomeOf(g).illegal, /Arcane Burst needs a valid target ENGAGED with Alaric after the declared movement/);
    // with the step he said he takes
    const h = live(117);
    await say(h, fx.messages[117].mes, { type: 'go', to: { new: 'into the dark toward the pups' }, quote: 'i walk into the dark looking for the pups' });
    await h.reply(fx.messages[118].mes, LIVE_DEN);
    await say(h, fx.messages[119].mes, { type: 'move', dir: 'closer', target: null, quote: 'i walk in front of them' }, BURST);
    const burst = burstOf(h);
    assert.ok(burst, 'the burst happened');
    assert.deepEqual(burst.strikes.map((k) => k.target).sort(), [...PUPS].sort(), 'each pup ENGAGED after the step');
    assert.deepEqual(burst.cost, { resource: 'mp', amount: 14, before: mp, after: mp - 14 }, 'one cost for the cast');
    assert.equal(h.state().entities.pc.sheet.mp, mp - 14);
    assert.ok(!burst.strikes.some((k) => k.target === 'pc'), 'no self-hit: the area is centred on the caster');
    // review: the pups are no foes of his (threat: false); they enter as neutral and the burst is still resolved when
    // they are awake (no Ambush opening) in a fight that has no foe yet; nobody is a foe for being caught
    const w = live(117);
    await say(w, fx.messages[117].mes, { type: 'go', to: { new: 'into the dark toward the pups' }, quote: 'i walk into the dark looking for the pups' });
    await w.reply(fx.messages[118].mes, LIVE_DEN);
    inject(w, PUPS.map((id) => ({ t: 'scene.awareness', d: { id, level: 'aware' } })));
    await say(w, fx.messages[119].mes, { type: 'move', dir: 'closer', target: null, quote: 'i walk in front of them' }, BURST);
    const open = lastUser(w).events.find((e) => e.t === 'encounter.started')?.d.encounter;
    assert.equal(open.ambush, false);
    assert.deepEqual(PUPS.map((id) => open.combatants[id].side), PUPS.map(() => 'neutral'));
    assert.deepEqual(burstOf(w).strikes.map((k) => k.target).sort(), [...PUPS].sort(), 'resolved, not ended before his attack');
});

// ------------------------------------------------------------------------------------------------ P0 AoE
test('c.6.6.6 AoE (tests 2, 3, 4): the live burst at #111 strikes Hound A in the fight and Hounds B, C and D ENGAGED beside it, with one cost; the pups at MEDIUM are not struck', async () => {
    const g = live(111);
    const s0 = g.state();
    assert.deepEqual(Object.keys(s0.encounter.combatants).sort(), ['mon.hound_pair_1', 'pc'], 'the live fight held only Hound A');
    assert.deepEqual([B, C, D].map((id) => s0.scene.positions[id].band), ['ENGAGED', 'ENGAGED', 'ENGAGED']);
    assert.deepEqual(areaCaught(s0).sort(), [B, C, D].sort(), 'ENGAGED is a distance, not a membership');
    await say(g, fx.messages[111].mes, BURST);
    const burst = burstOf(g);
    assert.deepEqual(burst.strikes.map((k) => k.target).sort(), [A, B, C, D].sort());
    assert.ok(!burst.strikes.some((k) => PUPS.includes(k.target)), 'the pups at MEDIUM are out of reach');
    assert.equal(burst.cost.amount, 14);
    assert.equal(g.state().entities.pc.sheet.mp, s0.entities.pc.sheet.mp - 14, 'one MP cost for four targets');
    const started = outcomeOf(g).started;
    assert.deepEqual([...started.joined].sort(), [B, C, D].sort());
    assert.match(started.reason, /caught in Arcane Burst/);
    // damage, death and the fight are the engine's for every one struck
    const s = g.state();
    for (const k of burst.strikes) {
        assert.ok(k.final > 0 && k.hp_after === Math.max(0, k.hp_before - k.final), JSON.stringify(k));
        if (k.defeated) assert.equal(s.entities[k.target].status, 'dead', `${k.target} died`);
    }
    const fighters = s.encounter ? Object.keys(s.encounter.combatants) : [];
    for (const id of [B, C, D].filter((x) => s.entities[x].status !== 'dead' && s.encounter)) assert.ok(fighters.includes(id), `${id} fights on`);
});

test('c.6.6.6 AoE friendly fire (test 2): a neutral townsperson ENGAGED beside the hounds is struck too and enters the fight; one at SHORT is not', async () => {
    const g = live(111);
    const s0 = g.state();
    const near = bystanderEvents(s0, content, { ref: 'tanner\'s boy' });
    near.events.find((e) => e.t === 'scene.entered').d.band = 'ENGAGED';
    const far = bystanderEvents({ ...s0, entities: { ...s0.entities, [near.ids[0]]: {} } }, content, { ref: 'carter' });
    inject(g, [...near.events, ...far.events]);
    const s1 = g.state();
    assert.equal(s1.scene.positions[near.ids[0]].band, 'ENGAGED');
    assert.equal(s1.scene.positions[far.ids[0]].band, 'SHORT');
    assert.ok(!s1.scene.threats.includes(near.ids[0]), 'no foe');
    await say(g, fx.messages[111].mes, BURST);
    const struck = burstOf(g).strikes.map((k) => k.target);
    assert.ok(struck.includes(near.ids[0]), 'friendly fire: the boy at arm\'s length is struck');
    assert.ok(!struck.includes(far.ids[0]), 'the carter at SHORT is not');
    assert.ok(outcomeOf(g).started.joined.includes(near.ids[0]), 'struck, he is in the fight: he acts for himself on his Turns');
});

// ------------------------------------------------------------------------------------------------ review: every side
const DOG = 'mon.brindle';
/** Alaric's war dog, already fighting at his side (side ally), ENGAGED beside Hound A; the other hounds where given. */
function withAlly(g, { bands = null } = {}) {
    const s0 = g.state();
    const made = [
        { t: 'entity.created', d: { entity: { id: DOG, kind: 'creature', name: 'Brindle', species: 'war dog', anchor: 'wolf', descriptors: ['Alaric\'s war dog'], status: 'alive', location: s0.scene.location, at: s0.scene.at, created: { turn: s0.turn, minute: s0.clock.minute }, source: { kind: 'engine', why: 'test' }, card: {}, profile: scaleCreature(content.anchors.get('wolf'), 1, 'normal', content) } } },
        { t: 'scene.entered', d: { id: DOG, band: 'ENGAGED' } },
        ...Object.entries(bands || {}).map(([id, band]) => ({ t: 'scene.position', d: { id, band, cover: 'none' } })),
    ];
    const s1 = structuredClone(s0);
    for (const e of made) applyEvent(s1, e);
    const enc = structuredClone(s1.encounter);
    addCombatant(enc, s1, content, DOG, 'ally', null, { c: true });
    for (const [id, band] of Object.entries(bands || {})) if (enc.combatants[id]) enc.combatants[id].current.band = band;
    inject(g, [...made, { t: 'encounter.updated', d: { encounter: enc } }]);
    return g.state();
}

test('c.6.6.6 review: Arcane Burst strikes a companion already fighting at Alaric\'s side, ENGAGED beside a foe; it stays on his side, locks no XP and answers by stepping back; the caster is never struck', async () => {
    const g = live(111);
    const s1 = withAlly(g);
    assert.equal(s1.encounter.combatants[DOG].side, 'ally');
    assert.equal(s1.encounter.combatants[DOG].current.band, 'ENGAGED');
    const mp = s1.entities.pc.sheet.mp;
    await say(g, fx.messages[111].mes, BURST);
    const burst = burstOf(g);
    const struck = burst.strikes.map((k) => k.target);
    assert.ok(struck.includes(DOG), 'the companion beside the hound is struck (c.6.6.6: filtered out as no opponent)');
    assert.ok(struck.includes(A), 'and the hound in the fight');
    assert.ok(!struck.includes('pc'), 'not the caster');
    assert.equal(burst.cost.amount, 14);
    assert.equal(g.state().entities.pc.sheet.mp, mp - 14, 'one cost for every one struck');
    const dog = burst.strikes.find((k) => k.target === DOG);
    assert.ok(dog.final > 0 && dog.hp_after === Math.max(0, dog.hp_before - dog.final), 'damage as for anyone');
    const s = g.state();
    const c = s.encounter?.combatants?.[DOG];
    if (c) {
        assert.equal(c.side, 'ally', 'struck is not switched to the monsters\' side');
        assert.equal(c.fixed.defeat_xp, undefined, 'no Defeat XP for a companion');
        const own = outcomeOf(g).records.filter((r) => r.actor === DOG);
        assert.ok(own.every((r) => !r.turned && r.kind !== 'attack'), JSON.stringify(own));
        if (own.length) assert.match(own[0].why, /on Alaric's side, struck by his Arcane Burst/);
    }
    // what the narrator reads: on his side, no foe
    if (s.encounter) {
        const { combatBlock } = await import('../../src/context.js');
        assert.match(combatBlock(s), /Brindle: .*ON ALARIC'S SIDE \(no foe\)/);
    }
});

test('c.6.6.6 review (validation): with only the companion in reach and the hounds at SHORT, the burst is legal and strikes the companion alone; on path A the same burst finds no target', async () => {
    const g = live(111);
    const far = { [A]: 'SHORT', [B]: 'SHORT', [C]: 'SHORT', [D]: 'SHORT' };
    const s1 = withAlly(g, { bands: far });
    assert.deepEqual(areaCaught(s1), [], 'no one outside the fight in reach');
    await say(g, fx.messages[111].mes, BURST);
    const burst = burstOf(g);
    assert.ok(burst, outcomeOf(g).illegal);
    assert.deepEqual(burst.strikes.map((k) => k.target), [DOG]);
    // the area check itself, before any strike: C (planner) counts everyone in reach; A only opponents
    const enc = structuredClone(s1.encounter);
    const ctx = (c) => ({ enc: structuredClone(enc), content, dice: new Dice(1, 0), state: s1, c });
    assert.ok(!attackAction(ctx(true), 'pc', A, 'mage.arcane_burst').illegal);
    assert.match(attackAction(ctx(false), 'pc', A, 'mage.arcane_burst').illegal, /at SHORT; Arcane Burst reaches ENGAGED at most/, 'A as before: its nominal target out of reach');
});

test('c.6.6.6 review: a townsperson caught in the burst enters the fight as no foe; only a Turn in which they fight him makes them his foe; the story may turn a companion', async () => {
    const g = live(111);
    const near = bystanderEvents(g.state(), content, { ref: 'tanner\'s boy' });
    near.events.find((e) => e.t === 'scene.entered').d.band = 'ENGAGED';
    inject(g, near.events);
    await say(g, fx.messages[111].mes, BURST);
    const boy = near.ids[0];
    const out = outcomeOf(g);
    assert.ok(out.started.joined.includes(boy));
    const opened = lastUser(g).events.find((e) => e.t === 'encounter.updated')?.d.encounter;
    const own = out.records.filter((r) => r.actor === boy);
    const turned = own.some((r) => r.turned);
    assert.equal(opened.combatants[boy].side, turned ? 'hostile' : 'neutral', JSON.stringify(own));
    assert.equal(typeof opened.combatants[boy].fixed.defeat_xp === 'number', turned, 'Defeat XP only once he is a foe');
    for (const r of own.filter((x) => x.turned)) assert.equal(r.turned, 'struck by his Arcane Burst');
    // the story turns a companion on him: from its next Turn it fights him
    const h = live(111);
    withAlly(h);
    await say(h, '*i hold my ground*', { type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'i hold my ground' });
    assert.equal(h.state().encounter.combatants[DOG].side, 'ally');
    assert.ok(outcomeOf(h).records.filter((r) => r.actor === DOG).every((r) => r.kind === 'hold'), 'unstruck, it keeps out of it');
    const x = await h.reply('Brindle snarls and lunges at Alaric.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: [DOG] }] });
    assert.ok(x.record.events.some((e) => e.t === 'combat.intent' && e.d.who === DOG && e.d.intent === 'attack'));
    await say(h, '*i hold my ground*', { type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'i hold my ground' });
    const turn = outcomeOf(h).records.find((r) => r.actor === DOG);
    assert.equal(turn.turned, 'as the story has it');
    assert.equal(h.state().encounter.combatants[DOG].side, 'hostile');
});

// ------------------------------------------------------------------------------------------------ P1 group movement
test('c.6.6.6 movement: "I walk into the middle of them" before a fight sets the engine\'s distances one band nearer to the hounds; the pups and the dead stay; a step inside a fight brings him nearer to B, C and D outside it too', async () => {
    const g = live(105);
    const s0 = g.state();
    await say(g, fx.messages[105].mes, { type: 'move', dir: 'closer', target: null, quote: 'i walk into the middle of them' });
    const out = outcomeOf(g);
    assert.equal(out.resolutions[0].type, 'move');
    assert.match(out.actions[0], /^1\. MOVES — one step closer to /);
    const s = g.state();
    for (const id of [A, B].filter((x) => s0.scene.positions[x])) {
        const want = ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'][Math.max(0, ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'].indexOf(s0.scene.positions[id].band) - 1)];
        assert.equal(s.scene.positions[id].band, want, id);
    }
    assert.ok(!s.encounter, 'a step opens no fight');
    // in the fight (#109): Hound A is the fight's; B, C and D outside it come one band nearer as well
    const f = live(109);
    const f0 = f.state();
    await say(f, fx.messages[109].mes, { type: 'move', dir: 'closer', target: null, quote: 'i walk in range of Feral Hound B and C and D' });
    const f1 = f.state();
    for (const id of [B, C, D]) {
        const from = f0.scene.positions[id].band;
        assert.equal(f1.scene.positions[id].band, ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'][Math.max(0, ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'].indexOf(from) - 1)], id);
    }
    for (const id of PUPS) assert.equal(f1.scene.positions[id].band, f0.scene.positions[id].band, 'the pups are not among the foes he steps toward');
    assert.deepEqual(approachedBy(f0, { move: 'closer', moveTarget: PUPS[0] }).map((x) => x.id), [PUPS[0]], 'a step toward one names that one');
});

// ------------------------------------------------------------------------------------------------ P0 quest count
test('c.6.6.6 quest (tests 5, 6): the hunt counts its two kills (2 of 4, live 0 of 4), not the pups; one entry per objective; the live chat folds to it as it is', () => {
    const s = foldChat(structuredClone(fx.messages)).state;
    const q = s.quests[QUEST];
    assert.deepEqual(defeatTally(s, content, q), [{ what: 'feral dogs of the pack', qty: 4, done: 2, killed: 2, driven: 0 }]);
    assert.equal(tallyText(defeatTally(s, content, q)), '2 of 4 feral dogs of the pack');
    // the cause: "feral dogs of the pack" (unit "hounds") and the species "feral hound" are one kind
    assert.equal(namesKind('feral dogs of the pack', 'feral hound', content.anchors.get('wolf')), false, 'without the content\'s kind words');
    assert.equal(namesKind('feral dogs of the pack', 'feral hound', content.anchors.get('wolf'), sameKinds(content)), true);
    assert.equal(namesKind('hounds', 'feral hound pups', content.anchors.get('wolf'), sameKinds(content)), true);
    // each way on its own: the kind words without the unit, the unit when the words name only "the pack"
    const words = structuredClone(q);
    words.objectives[1].unit = null;
    assert.equal(defeatTally(s, content, words)[0].done, 2, 'dogs are hounds');
    const unit = structuredClone(q);
    unit.objectives[1].what = 'the pack';
    assert.equal(defeatTally(s, content, unit)[0].done, 2, 'its unit: hounds');
    assert.equal(namesYoung(content, 'feral hound pups'), true);
    assert.equal(namesYoung(content, 'feral hound'), false);
    // the pups are no extra targets and no kills of the count
    const pups = structuredClone(s);
    for (const id of PUPS) pups.facts[`f.${id}.status.x`] = { id: `f.${id}.status.x`, s: id, p: 'status', o: 'dead', since: { turn: s.turn, minute: s.clock.minute }, until: null, hard: true, visibility: 'public', importance: 0.9, source: { kind: 'engine' } };
    assert.equal(defeatTally(pups, content, pups.quests[QUEST])[0].done, 2);
    // a contract that names the young counts them
    const brood = structuredClone(pups.quests[QUEST]);
    brood.objectives[1] = { ...brood.objectives[1], what: 'the pack\'s pups', unit: 'pups', qty: 4 };
    assert.equal(defeatTally(pups, content, brood)[0].done, 4);
    // one entry per objective (live: "DEFEAT 4 hounds …: open" at turns 49 and 53)
    assert.deepEqual(q.progress.map((p) => [p.objective, p.status]), [
        ['FIND the feral dogs\' den behind the lime vats at Tannery Row back alleys', 'done'],
        ['DEFEAT 4 hounds feral dogs of the pack at Tannery Row alleys', 'open'],
    ]);
    assert.equal(progressKey(q, q.progress[1].objective), 'objective:o2');
    assert.equal(q.notes.filter((n) => /^DEFEAT 4 hounds/.test(n)).length, 1);
    assert.equal(q.status, 'active');
});

test('c.6.6.6 quest (tests 5, 6): a hound that flees a fight is driven off where the contract allows it; one the story walks out of the scene is not; READY needs the outcome; no pay before the Guild', async () => {
    // #119 and #120 (the refused burst and its panel) left out: the den, as the live run left it
    const g = live(119);
    const s0 = g.state();
    const q0 = s0.quests[QUEST];
    assert.equal(drivesOff(content, q0), true, '"driven off or destroyed"');
    assert.equal(drivesOff(content, { title: 'Cull the Mudwyrm Brood', desired_end_state: 'The brood is culled.' }), false);
    // the live run: B and D left the lane in the story only (scene.left): not confirmed, the count stays short
    assert.ok([B, D].every((id) => s0.entities[id].status !== 'dead' && !s0.scene.present.includes(id) && !s0.entities[id].fled));
    assert.equal(countShort(s0, content, q0).length, 1);
    await say(g, '*i look over the lane once more*');
    let x = await g.reply('The lane is quiet.', { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: QUEST, note: 'The lane is clear.', alternative: null }] });
    assert.ok(!x.record.events.some((e) => e.t === 'quest.ready'), 'no READY on a story departure alone');
    assert.ok((x.record.rejected || []).some((r) => r.rule === 'quest_count'));
    // the same two fled a fight with him (the engine's escape): driven off, 4 of 4, READY on the outcome alone
    const h = live(119);
    inject(h, [B, D].map((id) => ({ t: 'entity.updated', d: { id, set: { fled: { turn: s0.turn, encounter: 'enc.t55' } } } })));
    const s1 = h.state();
    assert.deepEqual(defeatTally(s1, content, s1.quests[QUEST]), [{ what: 'feral dogs of the pack', qty: 4, done: 4, killed: 2, driven: 2 }]);
    assert.equal(tallyText(defeatTally(s1, content, s1.quests[QUEST])), '4 of 4 feral dogs of the pack (2 killed, 2 driven off)');
    const coin = s1.entities.pc.sheet.coin_cp;
    const xp = s1.entities.pc.sheet.xp;
    await say(h, '*i look over the lane once more*');
    x = await h.reply('The lane is quiet.', { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: QUEST, note: 'The lane is clear.', alternative: null }] });
    assert.ok(x.record.events.some((e) => e.t === 'quest.ready'));
    const s2 = h.state();
    assert.equal(s2.quests[QUEST].status, 'active', 'READY, not completed');
    assert.equal(s2.entities.pc.sheet.coin_cp, coin, 'no payout before the Guild turn-in');
    assert.equal(s2.entities.pc.sheet.xp, xp, 'no Quest XP before the Guild turn-in');
    // a contract that does not allow driving off counts only kills
    const strict = structuredClone(s1.quests[QUEST]);
    strict.title = 'Put Down the Feral Hounds of Tannery Row';
    strict.desired_end_state = 'The four feral hounds are dead.';
    assert.equal(defeatTally(s1, content, strict)[0].done, 2);
});

test('c.6.6.6 quest (test 6): the same progress again is no news; a new word on an objective replaces its entry', async () => {
    const g = live(119);
    await say(g, '*i look over the lane once more*');
    let x = await g.reply('The lane is quiet.', { expected: {}, deltas: [{ seq: 1, type: 'quest.progress', quest: QUEST, objective: 'DEFEAT 4 hounds feral dogs of the pack at Tannery Row alleys', status: 'open' }] });
    assert.ok(!x.record.events.some((e) => e.t === 'quest.progressed'));
    await say(g, '*i nod*');
    x = await g.reply('He nods.', { expected: {}, deltas: [{ seq: 1, type: 'quest.progress', quest: QUEST, objective: 'DEFEAT 4 hounds feral dogs of the pack at Tannery Row alleys', status: 'done' }] });
    assert.ok(x.record.events.some((e) => e.t === 'quest.progressed'));
    const q = g.state().quests[QUEST];
    assert.deepEqual(q.progress.map((p) => p.status), ['done', 'done']);
    assert.equal(q.progress.length, 2);
});

test('c.6.6.6 the engine records a foe that fled the fight as driven off (fled), not one Alaric left behind', async () => {
    const g = live(111);
    const s0 = g.state();
    const enc = structuredClone(s0.encounter);
    enc.combatants[A].current.band = 'LONG';
    enc.intents[A] = 'flee';
    inject(g, [{ t: 'encounter.updated', d: { encounter: enc } }]);
    await say(g, '*i hold my ground and watch it*', { type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'i hold my ground' });
    const s = g.state();
    assert.ok(!s.encounter, 'the fight is over: its one foe got away');
    assert.equal(s.entities[A].fled?.encounter, enc.id);
    assert.ok(!s.scene.present.includes(A));
    assert.equal(defeatTally(s, content, s.quests[QUEST])[0].driven, 1);
});

// ------------------------------------------------------------------------------------------------ P1 coin display
test('c.6.6.6 coin (test 7): the live sale books +280 cp and its System block shows SALE COMPLETE · +280 copper and 337 → 617; the purchase -240; an offer or a bid alone shows none', async () => {
    const g = live(91);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 337);
    await say(g, fx.messages[91].mes, { type: 'offer.accept', offer: 'offer.t90.5', lines: null, qty: null, quote: 'i accept *i say and sell it all*' });
    assert.deepEqual(outcomeOf(g).coin, [{ kind: 'sale', delta: 280, before: 337, after: 617, why: 'sold F-Rank Mudwyrm Skin ×2, F-Rank Mudwyrm Fang ×2, F-Rank Mudwyrm Venom Sac ×2, F-Rank Mudwyrm Scale Plate ×3' }]);
    const x = await g.reply(fx.messages[92].mes);
    assert.match(x.record.panel, /`SALE COMPLETE · \+280 copper · sold F-Rank Mudwyrm Skin ×2/);
    assert.match(x.record.panel, /`COIN: 337 → 617 copper`/);
    assert.equal(g.state().entities.pc.sheet.coin_cp, 617);
    // the purchase at #97
    const p = live(97);
    await say(p, fx.messages[97].mes, { type: 'offer.accept', offer: 'offer.t96.6', lines: ['l1', 'l2'], qty: null, quote: 'i nod and pay for both' });
    assert.deepEqual(outcomeOf(p).coin.map((k) => [k.kind, k.delta, k.before, k.after]), [['purchase', -240, 617, 377]]);
    const y = await p.reply(fx.messages[98].mes);
    assert.match(y.record.panel, /`PURCHASE COMPLETE · -240 copper/);
    assert.match(y.record.panel, /`COIN: 617 → 377 copper`/);
    // laying the parts out and her bid: no coin, no line
    const b = live(89);
    await say(b, fx.messages[89].mes);
    assert.equal(outcomeOf(b).coin, undefined);
    const z = await b.reply(fx.messages[90].mes, { expected: {}, deltas: [{ seq: 1, type: 'bid', buyer: 'npc.npctaxidermist_shopkeeper', lines: [{ object: 'obj.loot.mudwyrm.skin.f', qty: 2 }], price_cp: 280 }] });
    assert.ok(!/SALE COMPLETE|COIN:/.test(z.record.panel));
    assert.equal(b.state().entities.pc.sheet.coin_cp, 337);
});
