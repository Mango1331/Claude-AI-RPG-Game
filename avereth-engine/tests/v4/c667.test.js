// c.6.6.7: combat initiation and reaction continuity. An open attack that starts a fight is resolved first, without an
// Ambush bonus, as its maker's action of Round 1 (First Strike; live 18.10.2026: "*i arcane burst*" among four aware
// hounds struck all four after C and D had closed from SHORT in their Turns before his); someone who is no foe of his
// and was struck answers the strike before the fight ends. Scenes from the live chat of 18.10.2026 (Branch #3).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { bystanderEvents } from '../../src/v4/settlement.js';
import { scaleCreature } from '../../src/npcgen.js';
import { applyEvent } from '../../src/state.js';
import { addCombatant } from '../../src/combat.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018.json'), 'utf8'));
const A = 'mon.hound_pair_1';
const B = 'mon.hound_pair_2';
const C = 'mon.monhound_bitch_leader';
const D = 'mon.monhound_young';
const HORSE = 'mon.packhorse';
const BURST = { type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'i arcane burst' };

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
const opened = (g) => lastUser(g).events.find((e) => e.t === 'encounter.started')?.d.encounter;
function inject(g, events) {
    const m = g.chat.findLast((x) => x.extra?.avereth?.events);
    m.extra.avereth.events.splice(-1, 0, ...events);
}
/** The hounds of Tannery Row after #104, no fight yet: where they stand and whether they noticed him. */
function hounds(bands, level = 'aware') {
    const g = live(105);
    inject(g, Object.entries(bands).flatMap(([id, band]) => [{ t: 'scene.position', d: { id, band, cover: 'none' } }, { t: 'scene.awareness', d: { id, level } }]));
    return g;
}
const pcRecords = (o) => o.records.filter((r) => r.actor === 'pc');
const struckBy = (r) => (r?.strikes || []).map((k) => k.target).sort();
function horseEvents(s, band = 'ENGAGED') {
    return [
        { t: 'entity.created', d: { entity: { id: HORSE, kind: 'creature', name: null, species: 'packhorse', anchor: 'horse', descriptors: ['tethered packhorse'], status: 'alive', threat: false, location: s.scene.location, at: s.scene.at, created: { turn: s.turn, minute: s.clock.minute }, source: { kind: 'engine', why: 'test' }, card: {}, profile: scaleCreature(content.anchors.get('horse'), 1, 'normal', content) } } },
        { t: 'scene.entered', d: { id: HORSE, band } },
    ];
}
/** A town guard standing by, no foe of his (attitude 0), aggressive by temperament. */
function guardEvents(s, band = 'ENGAGED', level = 6) {
    const made = bystanderEvents(s, content, { ref: 'town guard' });
    const e = made.events.find((x) => x.t === 'entity.created').d.entity;
    e.template = 'guard';
    e.level = level;
    made.events.find((x) => x.t === 'scene.entered').d.band = band;
    return { events: made.events, id: made.ids[0] };
}

// ------------------------------------------------------------------------------------------------ First Strike
test('c.6.6.7 A: among four aware hounds (A, B ENGAGED; C, D SHORT) his Arcane Burst opens the fight first: A and B struck, one cost of 14 MP, no Ambush crit; C and D close in their own Turns after it; Alaric acts once', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'ENGAGED', [C]: 'SHORT', [D]: 'SHORT' });
    const mp = g.state().entities.pc.sheet.mp;
    await say(g, '*i arcane burst*', BURST);
    const o = outcomeOf(g);
    const enc = opened(g);
    assert.equal(enc.ambush, false, 'they had noticed him: no Ambush');
    assert.equal(enc.first_strike, true);
    assert.match(o.started.reason, /First Strike: no Ambush bonus; it is his action of Round 1/);
    const first = o.records[0];
    assert.equal(first.actor, 'pc', 'his burst before anyone acts');
    assert.equal(first.first_strike, true);
    assert.ok(!first.opening);
    assert.deepEqual(struckBy(first), [A, B].sort(), 'exactly the two in reach when he cast it (live: all four)');
    assert.ok(first.strikes.every((k) => !k.crit?.ambush), 'no Ambush Critical Hit');
    assert.deepEqual(first.cost, { resource: 'mp', amount: 14, before: mp, after: mp - 14 });
    assert.equal(g.state().entities.pc.sheet.mp, mp - 14, 'one cost');
    assert.equal(pcRecords(o).length, 1, 'no second action of his from his place in the Turn order');
    // C and D close in their own Turns, after the burst; the dead do not act
    const later = o.records.slice(1);
    for (const id of [C, D]) {
        const own = later.filter((r) => r.actor === id);
        assert.ok(own.length >= 1, id);
        assert.equal(own[0].move?.from, 'SHORT', `${id} was at SHORT when he cast`);
    }
    const dead = first.strikes.filter((k) => k.defeated).map((k) => k.target);
    assert.ok(!later.some((r) => dead.includes(r.actor)), 'the defeated do not act');
    assert.match(o.next, /^Alaric's Turn \(Round 2\)$/, 'Round 1 was his First Strike; his next action is in Round 2');
    assert.ok(!g.state().encounter.spent?.pc, 'his place in Round 1 was passed over once');
    // what the narrator and the player read
    const u = g.chat.findLastIndex((m) => m.is_user);
    assert.match(turnBlock(g.chat, u, content).context.text, /Alaric: Arcane Burst \(FIRST STRIKE: opens the fight before the Turn order; no Ambush bonus\)/);
    const x = await g.reply('The burst cracks out.');
    assert.match(x.record.panel, /— First Strike \(no Ambush\) —/);
});

test('c.6.6.7 B: a single-target Flame Lance at an aware hound opens the fight first, without an Ambush bonus; then the Turn order runs and the hound answers', async () => {
    const g = hounds({ [A]: 'MEDIUM', [B]: 'MEDIUM' });
    await say(g, '*i flame lance hound A*', { type: 'use_skill', skill: 'mage.flame_lance', target: A, quote: 'i flame lance hound A' });
    const o = outcomeOf(g);
    assert.equal(o.records[0].actor, 'pc');
    assert.equal(o.records[0].first_strike, true);
    assert.deepEqual(struckBy(o.records[0]), [A]);
    assert.ok(!o.records[0].strikes[0].crit?.ambush);
    assert.equal(pcRecords(o).length, 1);
    if (g.state().entities[A].status !== 'dead') assert.ok(o.records.slice(1).some((r) => r.actor === A), 'the hound answers in its Turn');
});

test('c.6.6.7 C: a hound that has not noticed him is still an Ambush: Opening Action with the Critical Hit, and his Round 1 Turn stays his', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'MEDIUM' }, 'unaware');
    await say(g, '*i flame lance hound A*', { type: 'use_skill', skill: 'mage.flame_lance', target: A, quote: 'i flame lance hound A' });
    const o = outcomeOf(g);
    const enc = opened(g);
    assert.equal(enc.ambush, true);
    assert.ok(!enc.first_strike, 'an Ambush is no First Strike');
    assert.equal(o.records[0].opening, true);
    assert.ok(!o.records[0].first_strike);
    assert.ok(o.records[0].strikes.every((k) => k.crit?.ambush), 'the Ambush Critical Hit');
    assert.equal(o.records[0].cost.amount, 16);
    if (g.state().encounter) assert.match(o.next, /\(Round 1\)$/, 'the Opening Action is extra: his Round 1 Turn is still to come');
});

test('c.6.6.7 D: a hound that already committed its attack keeps it: it strikes first, and Alaric\'s attack after it is an ordinary Turn, no First Strike of his', async () => {
    // committed in the reply: the fight opens at once with the hound's open attack
    const g = hounds({ [A]: 'ENGAGED', [B]: 'SHORT' });
    await say(g, '*i watch them*');
    const x = await g.reply('The big hound lunges at him.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: [A] }] });
    const opener = x.record.events.find((e) => e.t === 'encounter.started')?.d.encounter;
    assert.ok(opener, 'the reply opened the fight');
    assert.equal(opener.trigger.actor, A);
    const pre = opener.log;
    assert.equal(pre[0].actor, A, 'the hound\'s committed attack comes first');
    assert.equal(pre[0].first_strike, true);
    assert.ok(!pre.some((r) => r.actor === 'pc'));
    await say(g, '*i arcane burst*', BURST);
    const o = outcomeOf(g);
    assert.ok(pcRecords(o).length <= 1);
    assert.ok(pcRecords(o).every((r) => !r.first_strike), 'no First Strike of his in a fight already opened');
    // still pending when he speaks (no reply opened it): the hound's attack goes first all the same
    const h = hounds({ [A]: 'ENGAGED', [B]: 'SHORT' });
    const s0 = h.state();
    inject(h, [{ t: 'combat.pending', d: { by: A, target: 'pc', turn: s0.turn, minute: s0.clock.minute } }]);
    await say(h, '*i arcane burst*', BURST);
    const p = outcomeOf(h);
    assert.equal(p.records[0].actor, A, 'the commitment is not overtaken');
    assert.equal(p.records[0].first_strike, true);
    assert.ok(pcRecords(p).every((r) => !r.first_strike));
});

test('c.6.6.7 E: a step combined with the burst is taken with it, before anyone acts: the bands are those at the moment it is cast; a step in an earlier message starts no fight by itself', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'SHORT', [C]: 'SHORT', [D]: 'MEDIUM' });
    await say(g, '*i step in among them and arcane burst*', { type: 'move', dir: 'closer', target: null, quote: 'i step in among them' }, { ...BURST, quote: 'arcane burst' });
    const first = outcomeOf(g).records[0];
    assert.equal(first.actor, 'pc');
    assert.equal(first.first_strike, true);
    assert.ok(first.move, 'the step is part of his action');
    assert.deepEqual(struckBy(first), [A, B, C].sort(), 'ENGAGED after his one-band step; D was at MEDIUM');
    // the step on its own, the message before: the distances change, nobody attacks for it
    const h = hounds({ [A]: 'SHORT', [B]: 'SHORT', [C]: 'MEDIUM', [D]: 'MEDIUM' });
    await say(h, '*i step closer*', { type: 'move', dir: 'closer', target: null, quote: 'i step closer' });
    const s = h.state();
    assert.ok(!s.encounter, 'no fight from a step');
    assert.ok(!(s.pending_combat || []).length);
    assert.equal(s.scene.positions[A].band, 'ENGAGED');
    await h.reply('He edges closer; the hounds bristle but hold.');
    await say(h, '*i arcane burst*', BURST);
    assert.deepEqual(struckBy(outcomeOf(h).records[0]), [A, B].sort(), 'those ENGAGED now');
});

test('c.6.6.7 F: an impossible First Strike commits nothing: no MP, no step, no fight', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'SHORT' });
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: 5 } }]);
    const before = structuredClone(g.state());
    await say(g, '*i step in and arcane burst*', { type: 'move', dir: 'closer', target: null, quote: 'i step in' }, { ...BURST, quote: 'arcane burst' });
    const s = g.state();
    assert.ok(!s.encounter);
    assert.equal(s.entities.pc.sheet.mp, 5);
    assert.deepEqual(s.scene.positions, before.scene.positions, 'no step taken');
    assert.match(outcomeOf(g).illegal, /lacks MP/);
    // out of reach: the same
    const h = hounds({ [A]: 'MEDIUM', [B]: 'LONG' });
    const mp = h.state().entities.pc.sheet.mp;
    await say(h, '*i arcane burst*', BURST);
    assert.ok(!h.state().encounter);
    assert.equal(h.state().entities.pc.sheet.mp, mp);
});

test('c.6.6.7 path A unchanged: the planner-off burst among aware hounds still waits for his place in the Turn order', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'ENGAGED', [C]: 'SHORT', [D]: 'SHORT' });
    await g.player('I cast Arcane Burst at Feral Hound A', []);
    const o = outcomeOf(g);
    const enc = opened(g);
    assert.ok(enc && !enc.first_strike);
    assert.notEqual(o.records[0].actor, 'pc', 'A: the hounds ahead of him in the order act first');
});

// ------------------------------------------------------------------------------------------------ reactions
test('c.6.6.7 G: a burst that strikes only a bystander (a packhorse, no foe): the strike, its answer (it backs away), then the fight is over; no XP', async () => {
    const g = live(119);
    inject(g, horseEvents(g.state()));
    const xp = g.state().entities.pc.sheet.xp;
    await say(g, '*i arcane burst*', BURST);
    const o = outcomeOf(g);
    assert.equal(o.records[0].actor, 'pc');
    assert.deepEqual(struckBy(o.records[0]), [HORSE]);
    const answer = o.records.filter((r) => r.actor === HORSE);
    if (g.state().entities[HORSE].status !== 'dead') {
        assert.equal(answer.length, 1, 'one answer');
        assert.equal(answer[0].reaction, true);
        assert.ok(!answer[0].turned, 'a skittish animal flees what hurt it');
        assert.match(answer[0].why, /no foe of his, struck by his Arcane Burst: steps back out of reach/);
    }
    assert.ok(o.ended, 'no foe, no answer still due: over');
    assert.ok(!g.state().encounter);
    assert.equal(g.state().entities.pc.sheet.xp, xp, 'no XP for a bystander');
    // an aggressive bystander answers with an attack: from then on it is his foe and the fight goes on
    const h = live(119);
    const guard = guardEvents(h.state(), 'ENGAGED', 1);
    inject(h, guard.events);
    await say(h, '*i arcane burst*', BURST);
    const p = outcomeOf(h);
    const turn = p.records.find((r) => r.actor === guard.id);
    const rounds = p.records.filter((r) => r.actor === guard.id).map((r) => r.round);
    assert.equal(new Set(rounds).size, rounds.length, `one action of the guard per Round: ${rounds}`);
    if (h.state().entities[guard.id].status !== 'dead') {
        assert.equal(turn.turned, 'struck by his Arcane Burst');
        assert.equal(turn.reaction, true);
        assert.ok(!p.ended);
        assert.match(p.next, /^Alaric's Turn \(Round 2\)$/);
        assert.equal(h.state().encounter.combatants[guard.id].side, 'hostile');
        assert.equal(typeof h.state().encounter.combatants[guard.id].fixed.defeat_xp, 'number');
    }
});

test('c.6.6.7 H: the burst kills the last hound and hurts a packhorse beside it: the horse still answers before the fight ends; a guard who answers with an attack keeps it going', async () => {
    const g = live(111);
    const s0 = g.state();
    inject(g, [...[B, C, D].map((id) => ({ t: 'scene.position', d: { id, band: 'SHORT', cover: 'none' } })), ...horseEvents(s0)]);
    await say(g, fx.messages[111].mes, BURST);
    const o = outcomeOf(g);
    const burst = o.records.find((r) => r.actor === 'pc');
    assert.deepEqual(struckBy(burst), [A, HORSE].sort());
    assert.equal(g.state().entities[A].status, 'dead');
    const answer = o.records.filter((r) => r.actor === HORSE);
    assert.equal(answer.length, 1, 'live (c.6.6.6): the fight ended without it');
    assert.equal(answer[0].reaction, true);
    assert.ok(o.ended);
    assert.deepEqual(o.ended.defeated, [A]);
    assert.equal(o.ended.xp_awarded, s0.encounter.combatants[A].fixed.defeat_xp, 'XP for the hound only');
    // a guard caught beside the last hound answers with an attack: the fight goes on with him as Alaric's foe
    const h = live(111);
    const guard = guardEvents(h.state());
    inject(h, [...[B, C, D].map((id) => ({ t: 'scene.position', d: { id, band: 'SHORT', cover: 'none' } })), ...guard.events]);
    await say(h, fx.messages[111].mes, BURST);
    const p = outcomeOf(h);
    if (h.state().entities[guard.id].status !== 'dead') {
        const turn = p.records.filter((r) => r.actor === guard.id);
        assert.equal(turn.length, 1);
        assert.equal(turn[0].turned, 'struck by his Arcane Burst');
        assert.ok(!p.ended);
        assert.match(p.next, /^Alaric's Turn/);
    }
});

test('c.6.6.7 I: nothing left to answer, the fight ends at once; a companion answers a strike once, never an old one again', async () => {
    // a companion fighting at his side, the last hound beside it: one answer, then the end, no empty Turns
    const g = live(111);
    const s0 = g.state();
    const dog = 'mon.brindle';
    const made = [
        { t: 'entity.created', d: { entity: { id: dog, kind: 'creature', name: 'Brindle', species: 'war dog', anchor: 'wolf', descriptors: ['Alaric\'s war dog'], status: 'alive', location: s0.scene.location, at: s0.scene.at, created: { turn: s0.turn, minute: s0.clock.minute }, source: { kind: 'engine', why: 'test' }, card: {}, profile: scaleCreature(content.anchors.get('wolf'), 3, 'normal', content) } } },
        { t: 'scene.entered', d: { id: dog, band: 'ENGAGED' } },
        ...[B, C, D].map((id) => ({ t: 'scene.position', d: { id, band: 'SHORT', cover: 'none' } })),
    ];
    const s1 = structuredClone(s0);
    for (const e of made) applyEvent(s1, e);
    const enc = structuredClone(s1.encounter);
    addCombatant(enc, s1, content, dog, 'ally', null, { c: true });
    inject(g, [...made, { t: 'encounter.updated', d: { encounter: enc } }]);
    await say(g, fx.messages[111].mes, BURST);
    const o = outcomeOf(g);
    assert.deepEqual(o.records.map((r) => `${r.actor}:${r.kind}`), ['pc:attack', `${dog}:move`], 'his burst and its one answer, nothing else');
    assert.equal(o.records[1].reaction, true);
    assert.match(o.records[1].why, /on Alaric's side, struck by his Arcane Burst: steps back out of reach/);
    assert.ok(o.ended);
    // no fight, no answer due: nothing more happens
    assert.ok(!g.state().encounter);
    // in a fight that goes on, an answered strike is not answered again
    const h = live(111);
    const t0 = h.state();
    const m2 = [made[0], made[1]];
    const t1 = structuredClone(t0);
    for (const e of m2) applyEvent(t1, e);
    const enc2 = structuredClone(t1.encounter);
    addCombatant(enc2, t1, content, dog, 'ally', null, { c: true });
    enc2.combatants[A].current.hp = 400; // the hound lives through the burst: the fight goes on
    inject(h, [...m2, { t: 'encounter.updated', d: { encounter: enc2 } }]);
    await say(h, fx.messages[111].mes, BURST);
    assert.ok(h.state().encounter, 'the fight goes on');
    const first = outcomeOf(h).records.filter((r) => r.actor === dog);
    assert.equal(first.length, 1, 'its own Turn answers the fresh strike');
    assert.match(first[0].why, /struck by his Arcane Burst: steps back out of reach/);
    await say(h, '*i hold my ground*', { type: 'activity', kind: 'wait', what: null, minutes: null, until: null, quote: 'i hold my ground' });
    const next = outcomeOf(h).records.filter((r) => r.actor === dog);
    assert.ok(next.length >= 1);
    assert.ok(next.every((r) => r.kind === 'hold' && /keeps out of the fight/.test(r.why)), JSON.stringify(next));
});

// ------------------------------------------------------------------------------------------------ P2 narration
test('c.6.6.7 P2: the narrator reads each hound\'s step before its bite, in order, and where everyone stands once the steps are done', async () => {
    const g = hounds({ [A]: 'ENGAGED', [B]: 'ENGAGED', [C]: 'SHORT', [D]: 'SHORT' });
    await say(g, '*i arcane burst*', BURST);
    const u = g.chat.findLastIndex((m) => m.is_user);
    const block = turnBlock(g.chat, u, content).context.text;
    assert.match(block, /Feral Hound C: first moves SHORT -> ENGAGED \(now ENGAGED\), then Bite -> Alaric/);
    const stand = block.split('\n').find((l) => l.startsWith('- Where everyone stands after these steps'));
    assert.ok(stand, block);
    assert.match(stand, /Feral Hound C ENGAGED/);
    assert.ok(!/Feral Hound A /.test(stand) || g.state().entities[A].status !== 'dead', 'the dead are not listed as standing');
});
