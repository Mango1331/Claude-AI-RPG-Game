// Prototype C, build 4.3.0-c.4 (docs/PROTOTYPE_C.md §12): a creature's temperament is a strong tendency, not a law.
// The story establishes an intent (the cornered Quarry Strider mate of the live run of 03.10.2026 23:43,
// tests/v4/live_1003b.json: its raw planner and extractor answers verbatim); the engine checks it mechanically and
// resolves it on the creature's own turn, damage included. Without an intent npcDecide falls back on the temperament:
// a skittish one no longer flees forever. People keep their rule (provoked only). With the planner off, A is unchanged
// (tests/v4/gen35_envelope.test.js unchanged, tools/c_flag_off_diff.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT, Game } from '../helpers.js';
import { Chat4 } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { applyWorld } from '../../src/v4/world.js';
import { envelopeLines, mayOpenFight } from '../../src/v4/envelope.js';
import { buildContext } from '../../src/context.js';
import { applyEvent } from '../../src/state.js';
import { scaleCreature } from '../../src/npcgen.js';
import { initEncounter, runCombat, npcDecide } from '../../src/combat.js';
import { Dice } from '../../src/rng.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1003b.json'), 'utf8'));
const SKITTISH = 'skittish: it flees from threats and fights only when cornered';

// ------------------------------------------------------------------------------------------------ helpers
async function created() {
    const g = new Chat4(content);
    await g.player('Warrior');
    await g.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g.state();
}
const base = await created();
const actor = (id, kind, fields) => ({ id, kind, name: null, descriptors: [], traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, created: { turn: 1, minute: 0 }, ...fields });
const DEER = actor('mon.deer', 'creature', { descriptors: ['red deer'], species: 'red deer', anchor: 'deer' });
const ADDER = actor('mon.adder', 'creature', { descriptors: ['marsh adder'], species: 'marsh adder', anchor: 'serpent' });
const BREN = actor('npc.bren', 'npc', { name: 'Bren', descriptors: ['barkeep'], template: 'commoner' });
/** A V4 scene with the given actors present, at the given bands. */
function scene(actors, bands = {}) {
    const s = structuredClone(base);
    for (const a of actors) { s.entities[a.id] = structuredClone(a); s.scene.present.push(a.id); s.scene.positions[a.id] = { band: bands[a.id] || 'MEDIUM', cover: 'none' }; }
    return s;
}
/**
 * The state after a player turn read by the planner: a story turn ('c', its auth.c) or a V3-routed one ('v3c', the
 * outcome's c); 'a' is the same turn without the planner.
 */
function after(state, way = 'c') {
    const s = structuredClone(state);
    const auth = { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120, ...(way === 'c' ? { c: true, booked_min: 0, recovered: false } : {}) };
    const story = { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null, auth };
    s.last = { ...s.last, input: 'x', outcome: way === 'v3c' ? { kind: 'narrative', c: true } : story };
    return s;
}
const world = (s, deltas, way = 'c') => applyWorld(after(s, way), content, { expected: {}, deltas }, { msg: 9 });
const refused = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => [e.d.rule, e.d.reason]);
const pcHp = (s) => s.entities.pc.sheet.hp;
/** What every strike the engine resolved on Alaric in these combat records took from his HP. */
const strikesOnPc = (records) => records.flatMap((r) => (r.strikes || []).filter((k) => k.target === 'pc').map((k) => k.hp_before - k.hp_after));

/** npcDecide for one creature at arm's length or further, with or without an intent (the gen35 test's minimal fight). */
function decide({ c = true, temperament = 'skittish', band = 'MEDIUM', log = [], intent = null, trigger = { actor: 'pc', target: 'mon.x' } } = {}) {
    const me = { id: 'mon.x', model: 'creature', side: 'hostile', fixed: { max_hp: 20, temperament, sapient: false, attack: { range: 'ENGAGED' } }, current: { hp: 20, band, cover: 'none', effects: [] } };
    const pc = { id: 'pc', model: 'character', side: 'pc', fixed: { max_hp: 30, sapient: true, actions: {} }, current: { hp: 30, band: null, cover: 'none', effects: [] } };
    const enc = { combatants: { pc, 'mon.x': me }, intents: intent ? { 'mon.x': intent } : {}, log, trigger };
    return npcDecide({ enc, content, state: { relations: {} }, c }, 'mon.x');
}
const OWN_MOVE = { actor: 'mon.x', kind: 'move', dir: 'away' };
const PC_HIT = { actor: 'pc', kind: 'attack', target: 'mon.x', strikes: [{ target: 'mon.x' }] };

/** A real fight (V3 engine): Alaric, a ranger, against one creature of this body plan, the fight his. */
function fight(c, { anchor = 'deer', band = 'MEDIUM', seed = 11 } = {}) {
    const g = new Game(content).ranger();
    const p = scaleCreature(content.anchors.get(anchor), 1, 'normal', content);
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'mon.x', kind: 'creature', name: null, descriptors: [anchor], anchor, species: anchor, status: 'alive', location: g.state.scene.location, profile: p } } });
    applyEvent(g.state, { t: 'scene.entered', d: { id: 'mon.x', band, cover: 'none' } });
    applyEvent(g.state, { t: 'scene.awareness', d: { id: 'mon.x', level: 'aware' } });
    const dice = new Dice(seed, 0);
    const enc = initEncounter(g.state, content, dice, { actor: 'pc', target: 'mon.x', engage: true }, [{ id: 'mon.x', side: 'hostile' }], 'enc.c4');
    return { enc, content, dice, state: g.state, c };
}

/** The live run up to reply 44: messages 0-42 as recorded, 43 resolved again (by the planner unless off), 44 extracted. */
async function live({ planner = true } = {}) {
    const g = new Chat4(content);
    g.chat = fx.messages.map((m, i) => ({ mes: i === 42 ? fx.recent : m.user ? '(player)' : '(reply)', is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: m.events } } : {} }));
    const plans = [...fx.plan];
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? plans.shift() ?? null : ask(req));
    g.chat.push({ mes: fx.player, is_user: true, is_system: false, extra: {} });
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner }, llm: g.llm });
    const before = g.state();
    const x = await g.reply(fx.reply, fx.extract);
    return { g, before, record: x.record, after: g.state() };
}

// ------------------------------------------------------------------------------------------------ 1. no intent
test('1. a skittish creature without an intent: a deterministic fallback; a pursuit that only closes in ends at arm\'s length, not in a flee-and-chase loop', () => {
    // the fallback on the planner path, by situation: startled by the fight Alaric opened, it seeks distance; left alone
    // it holds, wary; attacked since its own last turn, it seeks distance again; at arm's length it fights back, hurt or not
    const kind = (o) => `${o.kind}${o.why ? ` (${o.why})` : ''}`;
    for (const band of ['SHORT', 'MEDIUM', 'LONG']) {
        assert.equal(kind(decide({ band })), 'flee (skittish, threatened)', `${band}, its first turn in Alaric's fight`);
        assert.equal(kind(decide({ band, log: [OWN_MOVE] })), 'hold (skittish, wary)', `${band}, nobody pressed it since its last turn`);
        assert.equal(kind(decide({ band, log: [OWN_MOVE, PC_HIT] })), 'flee (skittish, threatened)', `${band}, attacked since its last turn`);
        assert.deepEqual(decide({ band, log: [OWN_MOVE] }), decide({ band, log: [OWN_MOVE] }), 'deterministic');
    }
    for (const log of [[], [OWN_MOVE], [OWN_MOVE, PC_HIT], [PC_HIT, OWN_MOVE, PC_HIT]]) assert.equal(kind(decide({ band: 'ENGAGED', log })), 'attack (cornered)');
    // without the planner A decides as before: hit once, it flees for the rest of the fight, at arm's length too
    assert.equal(kind(decide({ c: false, band: 'ENGAGED', log: [PC_HIT] })), 'flee (skittish, threatened)');
    assert.equal(kind(decide({ c: false, band: 'MEDIUM', log: [OWN_MOVE] })), 'flee (skittish)');

    // the loop of A in a real fight: Alaric only closes in, the deer flees each turn and is never caught, never gone
    const chase = (c) => {
        const ctx = fight(c);
        for (let i = 0; i < 6; i++) runCombat(ctx, { kind: 'move', dir: 'closer' });
        return { ctx, mine: ctx.enc.log.filter((r) => r.actor === 'mon.x') };
    };
    const a = chase(false);
    assert.ok(a.mine.length >= 6 && a.mine.every((r) => r.kind === 'move' && r.dir === 'away'), a.mine.map((r) => r.kind).join(','));
    assert.ok(!a.ctx.enc.combatants['mon.x'].current.escaped && a.ctx.enc.combatants['mon.x'].current.band !== 'ENGAGED', 'A: neither caught nor gone');
    // the planner path: it flees once (startled), then holds while only followed; at arm's length it fights back
    const c = chase(true);
    const kinds = c.mine.map((r) => r.kind);
    assert.equal(kinds.filter((k) => k === 'move').length, 1, kinds.join(','));
    assert.equal(kinds[0], 'move');
    assert.ok(kinds.includes('hold') && kinds.includes('attack'), kinds.join(','));
    assert.equal(c.mine.find((r) => r.kind === 'attack').why, undefined, 'an engine attack record (the fallback: cornered)');
    assert.equal(c.ctx.enc.combatants['mon.x'].current.band, 'ENGAGED');
    // the same fight, the same records
    assert.deepEqual(chase(true).mine, c.mine);
});

// ------------------------------------------------------------------------------------------------ 2. flee intent
test('2. a skittish creature with an established flee intent flees, also where its fallback would fight', () => {
    for (const c of [true, false]) {
        for (const band of ['ENGAGED', 'SHORT', 'MEDIUM']) assert.deepEqual(decide({ c, band, intent: 'flee', log: [OWN_MOVE] }), { kind: 'flee', why: 'narrated intent' }, `${c ? 'C' : 'A'} ${band}`);
    }
    // outside a fight the story's flee intent is accepted as it always was, for the creature's next turn
    const r = world(scene([DEER]), [{ seq: 1, type: 'intent', who: 'mon.deer', intent: 'flee' }]);
    assert.deepEqual(refused(r), []);
    assert.equal(r.state.pending_intents['mon.deer'], 'flee');
});

// ------------------------------------------------------------------------------------------------ 3. attack intent
test('3. a skittish creature with an attack intent and a cause in the story: not refused for being skittish; the engine attacks on its turn, its damage the engine\'s', () => {
    const cause = { seq: 1, type: 'fact', s: 'mon.deer', p: 'calf_killed_by', o: 'Alaric' };
    const turned = [cause, { seq: 2, type: 'hostile', by: ['mon.deer'] }, { seq: 3, type: 'intent', who: 'mon.deer', intent: 'attack' }];
    const s = scene([DEER], { 'mon.deer': 'SHORT' });
    for (const way of ['c', 'v3c']) {
        const r = world(s, turned, way);
        assert.deepEqual(refused(r), [], way);
        assert.equal(r.opened?.kind, 'started', `${way}: the fight opens`);
        const enc = r.state.encounter;
        const mine = enc.log.filter((x) => x.actor === 'mon.deer');
        // its attack is a record of its own turn in Initiative order, or waits for it as its intent
        if (mine.length) assert.equal(mine[0].kind, 'attack', way);
        else assert.equal(enc.intents['mon.deer'], 'attack', way);
        assert.equal(pcHp(r.state), pcHp(s) - strikesOnPc(enc.log).reduce((a, b) => a + b, 0), `${way}: only the engine's strikes cost HP`);
    }
    // the decision itself: within reach an attack, from further away it closes in first
    assert.deepEqual(decide({ band: 'ENGAGED', intent: 'attack', log: [OWN_MOVE] }), { kind: 'attack' });
    assert.deepEqual(decide({ band: 'MEDIUM', intent: 'attack', log: [OWN_MOVE] }), { kind: 'close_and_attack' });
    // every attacker the reply committed carries its attack into its turn, not only the first (A arms only the first)
    const DOE = { ...DEER, id: 'mon.doe' };
    const two = world(scene([DEER, DOE]), [{ seq: 1, type: 'hostile', by: ['mon.deer', 'mon.doe'] }]);
    assert.deepEqual(refused(two), []);
    for (const id of ['mon.deer', 'mon.doe']) {
        const first = two.state.encounter.log.find((x) => x.actor === id);
        if (first) assert.ok(first.kind === 'attack' || first.why === 'closing distance', `${id}: ${first.kind} (${first.why})`);
        else assert.equal(two.state.encounter.intents[id], 'attack', id);
    }
    assert.ok(two.state.encounter.log.some((x) => x.actor === 'mon.doe'), 'the second one acted in the opening (fixed dice)');
    // the same reply without the planner: A refuses it as before
    const a = world(s, turned, 'a');
    assert.deepEqual(refused(a), [['envelope', `mon.deer does not turn on Alaric: ${SKITTISH}`], ['envelope', `mon.deer does not turn on Alaric: ${SKITTISH}`]]);
    assert.equal(a.opened, null);
    // a defensive one alike: reach is its tendency, not a limit, on the planner path
    assert.deepEqual(refused(world(scene([ADDER]), [{ seq: 1, type: 'hostile', by: ['mon.adder'] }])), []);
    assert.deepEqual(refused(world(scene([ADDER]), [{ seq: 1, type: 'hostile', by: ['mon.adder'] }], 'a')).map((x) => x[0]), ['envelope']);
});

test('3b. still refused on the planner path: a dead creature, one elsewhere; the narrator learns the tendency, not a law', () => {
    const dead = scene([{ ...DEER, status: 'dead' }], { 'mon.deer': 'SHORT' });
    const r = world(dead, [{ seq: 1, type: 'hostile', by: ['mon.deer'] }, { seq: 2, type: 'intent', who: 'mon.deer', intent: 'attack' }]);
    assert.deepEqual(refused(r).map((x) => x[0]), ['world_rule']);
    assert.match(refused(r)[0][1], /mon\.deer is dead/);
    assert.equal(r.opened, null);
    const away = structuredClone(scene([DEER]));
    away.scene.present = away.scene.present.filter((id) => id !== 'mon.deer');
    const r2 = world(away, [{ seq: 1, type: 'hostile', by: ['mon.deer'] }]);
    assert.match(refused(r2)[0][1], /mon\.deer is not in the scene/);
    assert.equal(r2.opened, null);
    // the WORLD ENVELOPE: the same animals, named as a tendency; people keep their limit; A's lines as before
    const s = scene([BREN, DEER, ADDER]);
    const c = envelopeLines(s, content, { c: true });
    assert.deepEqual(c, [
        'Violent only once the story gives them cause first (an insult, a threat, harm): Bren.',
        'Skittish by nature, a tendency and not a law: they flee from threats and fight when cornered or given cause: Red Deer A.',
        'Defensive by nature, a tendency and not a law: they fight what comes within reach, or when given cause: Marsh Adder A.',
    ]);
    assert.deepEqual(envelopeLines(s, content).slice(0, 3), [
        'Violent only once the story gives them cause first (an insult, a threat, harm): Bren.',
        'Flee from threats; fight only when cornered (ENGAGED): Red Deer A.',
        'Fight only what comes within reach (ENGAGED): Marsh Adder A.',
    ]);
    // the engine block of a turn the planner read carries the tendency
    const block = (outcome) => buildContext(s, content, { input: 'I watch them.', outcome }).text;
    assert.match(block({ kind: 'v4', actions: ['1. NOTHING TO BOOK'], auth: { c: true } }), /- Skittish by nature, a tendency and not a law: .*Red Deer A\./);
    assert.match(block({ kind: 'narrative', c: true }), /- Skittish by nature, a tendency and not a law/);
    assert.match(block({ kind: 'v4', actions: ['1. NOTHING TO BOOK'], auth: {} }), /- Flee from threats; fight only when cornered \(ENGAGED\): Red Deer A\./);
    assert.deepEqual(mayOpenFight(s, content, 'mon.deer', { c: true }), { ok: true, rule: 'cornered_only', why: SKITTISH, tendency: true });
});

// ------------------------------------------------------------------------------------------------ 4. no narrated damage
test('4. no narrated damage: an intent never changes HP; only the engine\'s strikes do', () => {
    // the extractor has no delta that takes HP: the one HP field is a recovery while resting (min 0)
    const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/deltas.json'), 'utf8'));
    const hpFields = vocab.deltas.flatMap((d) => Object.keys(d.fields || {}).filter((f) => /hp|damage|wound|hit/i.test(f)).map((f) => `${d.type}.${f}`));
    assert.deepEqual(hpFields, ['recover.hp']);
    assert.equal(vocab.deltas.find((d) => d.type === 'recover').fields.hp.min, 0);
    // an attack intent alone, and a wound the story claims: accepted as story, no fight, no HP
    const s = scene([DEER], { 'mon.deer': 'SHORT' });
    const r = world(s, [{ seq: 1, type: 'intent', who: 'mon.deer', intent: 'attack' }, { seq: 2, type: 'fact', s: 'pc', p: 'gored_by', o: 'the red deer' }]);
    assert.equal(r.state.pending_intents['mon.deer'], 'attack');
    assert.equal(r.state.encounter, null);
    assert.equal(pcHp(r.state), pcHp(s));
    assert.equal(r.events.filter((e) => e.t === 'resource.changed').length, 0);
});

// ------------------------------------------------------------------------------------------------ 5. the live case
test('5. live 03.10.2026 23:43 #45: the cornered Quarry Strider mate turns on Alaric; c.3 refused it as skittish, now its attack is the engine\'s on its own turn', async () => {
    const { before, record, after: s } = await live();
    // the turn before: the planner's (a V3-routed fight turn), the sentry killed
    const o43 = before.last.outcome;
    assert.equal(o43.kind, 'combat');
    assert.equal(o43.c, true);
    assert.ok(o43.ended?.defeated.includes('mon.strider_sentry'));
    assert.equal(before.encounter, null);
    assert.equal(before.scene.positions['mon.strider_mate'].band, 'MEDIUM');
    // the reply's hostile and attack intent: accepted, nothing refused for "skittish"
    assert.deepEqual(record.rejected || [], []);
    assert.ok(!(record.corrections || []).some((c) => /did not turn on Alaric/.test(c)), record.corrections?.join(' | '));
    const t = record.events.map((e) => e.t);
    assert.ok(t.includes('combat.pending') && t.includes('combat.intent') && t.includes('encounter.started'), t.join(', '));
    // the fight: the mate fights, its attack resolved by the engine on its own turn of the Initiative order
    const enc = s.encounter;
    assert.ok(enc.combatants['mon.strider_mate']);
    const mine = enc.log.filter((r) => r.actor === 'mon.strider_mate');
    if (enc.order[0] === 'mon.strider_mate') {
        assert.equal(mine[0].kind, 'attack');
        assert.equal(mine[0].why, undefined);
    } else assert.equal(enc.intents['mon.strider_mate'], 'attack', 'reserved for its turn');
    // the prose's charge ("claws first, straight across the open floor at him") cost nothing: only the engine's strikes
    assert.equal(pcHp(s), pcHp(before) - strikesOnPc(enc.log).reduce((a, b) => a + b, 0));
    // c.3's refusal, word for word, for the same answer to the same turn without the planner's mark (A's rule)
    const a = structuredClone(before);
    delete a.last.outcome.c;
    const r = applyWorld(a, content, fx.extract, { msg: 44, prose: fx.reply });
    assert.deepEqual(r.rejected.map((x) => ({ seq: x.seq, type: x.type, rule: x.rule, why: x.why })), fx.c3_rejected);
});

test('5b. live, one turn on: Alaric steps back from the mate; on the planner path it keeps its distance, wary (A: it flees, skittish)', async () => {
    const step = { commands: [{ seq: 1, type: 'move', dir: 'away', target: 'mon.strider_mate', quote: 'i step back' }] };
    const next = async (planner) => {
        const { g } = await live({ planner: true });
        const ask = g.llm;
        g.llm = async (req) => (req.purpose.startsWith('plan') ? JSON.stringify(step) : ask(req));
        g.chat.push({ mes: '*i step back from it, staff up*', is_user: true, is_system: false, extra: {} });
        await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner }, llm: g.llm });
        const enc = g.state().encounter;
        return enc.log.filter((r) => r.actor === 'mon.strider_mate').at(-1);
    };
    const c = await next(true);
    assert.equal(`${c.kind} (${c.why})`, 'hold (skittish, wary)');
    const a = await next(false);
    assert.equal(`${a.kind} ${a.dir} (${a.why})`, 'move away (skittish)');
});

// ------------------------------------------------------------------------------------------------ 6. people
test('6. a peaceful sapient NPC keeps its rule on the planner path: violent only after a cause the story establishes', () => {
    const s = scene([BREN]);
    for (const way of ['c', 'v3c']) {
        const r = world(s, [{ seq: 1, type: 'hostile', by: ['npc.bren'] }], way);
        assert.deepEqual(refused(r), [['envelope', 'npc.bren does not turn on Alaric: not hostile toward Alaric and not harmed by him']], way);
        assert.equal(r.opened, null);
        assert.ok(r.corrections.some((c) => /^Bren did not turn on Alaric in the last reply .*Only a cause the story establishes first \(an insult, a threat, harm\) turns them against him\./.test(c)), r.corrections.join(' | '));
        assert.deepEqual(refused(world(s, [{ seq: 1, type: 'intent', who: 'npc.bren', intent: 'attack' }], way)).map((x) => x[0]), ['envelope']);
        // the cause first, in the same reply: then he may
        const provoked = world(s, [{ seq: 1, type: 'attitude', who: 'npc.bren', delta: -40, why: 'Alaric spat in his ale' }, { seq: 2, type: 'hostile', by: ['npc.bren'] }], way);
        assert.deepEqual(refused(provoked), []);
        assert.equal(provoked.opened?.kind, 'started');
    }
    assert.deepEqual(mayOpenFight(s, content, 'npc.bren', { c: true }), { ok: false, rule: 'provoked_only', why: 'not hostile toward Alaric and not harmed by him' });
    // in a fight without an intent: not hostile and unharmed, he does not open with violence (as in A)
    const person = (c) => {
        const me = { id: 'npc.x', model: 'character', side: 'hostile', fixed: { max_hp: 20, temperament: 'cautious', sapient: true, actions: {} }, current: { hp: 20, band: 'ENGAGED', cover: 'none', effects: [] } };
        const pc = { id: 'pc', model: 'character', side: 'pc', fixed: { max_hp: 30, sapient: true, actions: {} }, current: { hp: 30, band: null, cover: 'none', effects: [] } };
        return npcDecide({ enc: { combatants: { pc, 'npc.x': me }, intents: {}, log: [], trigger: { actor: 'pc', target: 'npc.x' } }, content, state: { relations: {} }, c }, 'npc.x');
    };
    assert.deepEqual(person(true), person(false));
    assert.equal(person(true).kind, 'hold');
});
