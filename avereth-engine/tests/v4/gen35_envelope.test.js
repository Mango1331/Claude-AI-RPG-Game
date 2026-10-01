// Gen 3.5, the World/Reaction Envelope (docs/ARCHITECTURE_GEN35.md §2.3): computed from the state before the narrator
// writes, shown as the engine block's WORLD ENVELOPE (only its limits), and asked again by the world applier about what
// the extractor reported, at the state of each step. One constraint, two uses; its violence policy is the fight's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { applyWorld } from '../../src/v4/world.js';
import { envelopeLines, envelopeBlock, reactionEnvelope, mayOpenFight } from '../../src/v4/envelope.js';
import { opensViolence } from '../../src/policy.js';
import { npcDecide } from '../../src/combat.js';
import { buildContext } from '../../src/context.js';
import { turnBlock } from '../../src/host.js';
import { replayRun } from './replay_lib.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));

async function created(cls = 'Warrior') {
    const g = new Chat4(content, { listings: gold.board_generator.listings });
    await g.player(cls);
    const c = content.classes.get(cls.toLowerCase());
    await g.player(c.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    return g;
}
const base = (await created()).state();
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
const npc = (id, name, descriptors, template) => ({ id, kind: 'npc', name, descriptors, traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, template, created: { turn: 1, minute: 0 } });
const creature = (id, species, anchor) => ({ id, kind: 'creature', name: null, descriptors: [species], traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, species, anchor, created: { turn: 1, minute: 0 } });
/** A scene with the given actors present, at the given bands. */
function scene(actors, bands = {}) {
    const s = structuredClone(base);
    for (const a of actors) { s.entities[a.id] = a; s.scene.present.push(a.id); s.scene.positions[a.id] = { band: bands[a.id] || 'MEDIUM', cover: 'none' }; }
    return s;
}
const world = (s, deltas) => applyWorld(after(s), content, { expected: {}, deltas }, { msg: 9 });
const rules = (r) => r.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const committed = (r) => r.events.some((e) => e.t === 'combat.pending' || e.t === 'encounter.started');
const BREN = npc('npc.bren', 'Bren', ['barkeep'], 'commoner');
const HOBB = npc('npc.hobb', 'Hobb', ['watch sergeant'], 'guard');
const RASK = npc('npc.rask', 'Rask', ['bandit'], 'bandit');
const DEER = creature('mon.deer', 'red deer', 'deer');
const WOLF = creature('mon.wolf', 'grey wolf', 'wolf');
const ADDER = creature('mon.adder', 'marsh adder', 'serpent');

// ------------------------------------------------------------------------------------------------ the policy
test('one violence policy: npcDecide in a fight and the envelope before the story ask the same function', () => {
    // npcDecide: a sapient combatant that is not hostile, not hurt, not attacked and not aggressive does not open with violence
    const decide = (temperament, attitude, hp = 20) => {
        const me = { id: 'npc.x', model: 'character', side: 'hostile', fixed: { max_hp: 20, temperament, sapient: true, actions: {} }, current: { hp, band: 'ENGAGED', cover: 'none', effects: [] } };
        const pc = { id: 'pc', model: 'character', side: 'pc', fixed: { max_hp: 30, sapient: true, actions: {} }, current: { hp: 30, band: null, cover: 'none', effects: [] } };
        const enc = { combatants: { pc, 'npc.x': me }, intents: {}, log: [] };
        const state = { relations: attitude === null ? {} : { 'rel.npc.x.attitude.pc': { value: attitude } } };
        return npcDecide({ enc, content, state }, 'npc.x').kind;
    };
    for (const temperament of ['cautious', 'skittish', 'aggressive', 'defensive']) {
        for (const attitude of [null, 0, -19, -20, -25, -60]) {
            for (const hp of [20, 12]) {
                const policy = opensViolence({ sapient: true, temperament, attitude: attitude ?? 0, harmed: hp < 20 });
                // both ways: at arm's length and fit to fight, npcDecide strikes exactly when the policy allows it
                const kind = decide(temperament, attitude, hp);
                assert.equal(['attack', 'close_and_attack'].includes(kind), policy.ok, `${temperament} attitude ${attitude} hp ${hp}: npcDecide ${kind}, the policy ${policy.why}`);
            }
        }
    }
    // the animals: npcDecide's own temperament branches decide in a fight; the policy says the same of every band (a
    // strike that landed on it is what "harmed" means to a skittish one)
    const beast = (temperament, band, hit) => {
        const me = { id: 'mon.x', model: 'creature', side: 'hostile', fixed: { max_hp: 20, temperament, sapient: false, attack: { range: 'ENGAGED' } }, current: { hp: 20, band, cover: 'none', effects: [] } };
        const pc = { id: 'pc', model: 'character', side: 'pc', fixed: { max_hp: 30, sapient: true, actions: {} }, current: { hp: 30, band: null, cover: 'none', effects: [] } };
        const log = hit ? [{ actor: 'pc', kind: 'attack', target: 'mon.x', strikes: [{ target: 'mon.x' }] }] : [];
        return npcDecide({ enc: { combatants: { pc, 'mon.x': me }, intents: {}, log }, content, state: { relations: {} } }, 'mon.x').kind;
    };
    for (const temperament of ['skittish', 'defensive', 'aggressive', 'cautious']) {
        for (const band of ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG']) {
            for (const hit of [false, true]) {
                // a cautious animal shot from range takes cover first: a tactic inside the fight, not a refusal to fight
                if (temperament === 'cautious' && hit) continue;
                const violent = ['attack', 'close_and_attack'].includes(beast(temperament, band, hit));
                assert.equal(opensViolence({ sapient: false, temperament, band, harmed: hit }).ok, violent, `${temperament} at ${band}${hit ? ', hit' : ''}`);
            }
        }
    }
    assert.equal(opensViolence({ sapient: true, temperament: 'cautious', attitude: 0 }).rule, 'provoked_only');
    assert.equal(opensViolence({ sapient: true, temperament: 'cautious', attitude: -20 }).ok, true, 'hostile at -20, as npcDecide');
    assert.equal(opensViolence({ sapient: false, temperament: 'skittish', band: 'MEDIUM' }).rule, 'cornered_only');
    assert.equal(opensViolence({ sapient: false, temperament: 'skittish', band: 'ENGAGED' }).ok, true);
    assert.equal(opensViolence({ sapient: false, temperament: 'skittish', band: 'ENGAGED', harmed: true }).ok, false, 'hurt, it flees (npcDecide)');
    assert.equal(opensViolence({ sapient: false, temperament: 'defensive', band: 'SHORT' }).rule, 'reach_only');
});

// ------------------------------------------------------------------------------------------------ before the story
test('the narrator sees only the limits: peaceful people, skittish and defensive animals, who may take his things', () => {
    const s = scene([BREN, HOBB, RASK, DEER, WOLF, ADDER]);
    const lines = envelopeLines(s, content);
    assert.equal(lines.length, 4, lines.join('\n'));
    assert.match(lines[0], /^Violent only once the story gives them cause first .*: Bren\.$/);
    assert.match(lines[1], /^Flee from threats; fight only when cornered \(ENGAGED\): Red Deer A\.$/);
    assert.match(lines[2], /^Fight only what comes within reach \(ENGAGED\): Marsh Adder A\.$/);
    assert.match(lines[3], /^Only Hobb \(a fine or confiscation\) and Rask \(a robbery\) may take Alaric's coin or things\.$/);
    assert.ok(!lines.join(' ').includes('Grey Wolf'), 'an aggressive animal has no limit');
    // nothing to say: no section
    assert.deepEqual(envelopeLines(scene([WOLF]), content), []);
    assert.equal(envelopeBlock(scene([WOLF]), content), '');
    // in a fight the fight's block rules
    const fight = scene([BREN]);
    fight.encounter = { id: 'enc.x', combatants: { pc: {}, 'npc.bren': {} } };
    assert.deepEqual(envelopeLines(fight, content), []);
    assert.equal(reactionEnvelope(fight, content).fight, 'running');
    // V3 campaigns have no envelope
    const v3 = scene([BREN]);
    v3.meta = { ...v3.meta, runtime: 'v3' };
    assert.deepEqual(envelopeLines(v3, content), []);
});

test('the engine block carries the WORLD ENVELOPE before the corrections and PLAYER ACTIONS, kept at any budget', () => {
    const s = scene([BREN]);
    const opts = { input: 'I lean on the bar.', outcome: { kind: 'v4', actions: ['1. NOTHING TO BOOK'] }, corrections: ['c'] };
    const ctx = buildContext(s, content, opts);
    const names = ctx.sections.map((x) => x.name);
    assert.ok(names.indexOf('envelope') >= 0 && names.indexOf('envelope') < names.indexOf('corrections') && names.indexOf('corrections') < names.indexOf('resolved'), names.join(','));
    // binding like PLAYER ACTIONS: a tight budget drops retrieval and corrections, never the envelope
    const tight = buildContext(s, content, { ...opts, budget: 200 }).sections.map((x) => x.name);
    assert.ok(tight.includes('envelope') && tight.includes('resolved'), tight.join(','));
    assert.match(ctx.text, /WORLD ENVELOPE \(causal limits for this reply; inside them the story is free\):\n- Violent only once the story gives them cause first/);
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /WORLD ENVELOPE in the engine block \(when present\) names the few causal limits of this reply/);
});

test('the envelope has its own allowance: in no story turn of the recorded runs does it displace a retrieved section', async () => {
    let turns = 0;
    let shown = 0;
    for (const f of ['live_0930.json', 'live_0930b.json', 'live_0930c.json']) {
        const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', f), 'utf8'));
        await replayRun(content, fx, {
            onPlayer: (st, g) => {
                if (st.action !== 'context') return;
                const withIt = turnBlock(g.chat, st.u, content, {}).context;
                const without = turnBlock(g.chat, st.u, content, { engineEnvelope: false }).context;
                turns += 1;
                if (withIt.sections.some((x) => x.name === 'envelope')) shown += 1;
                // the same memories, lore and corrections, the same dropped sections: the block plus the envelope
                assert.deepEqual(withIt.sections.filter((x) => x.name !== 'envelope'), without.sections, `${f} #${st.i}`);
                assert.deepEqual(withIt.dropped, without.dropped, `${f} #${st.i}`);
                assert.equal(withIt.text.replace(/\n\nWORLD ENVELOPE \([^\n]*(?:\n- [^\n]*)*/, ''), without.text, `${f} #${st.i}`);
            },
        });
    }
    assert.ok(turns >= 50 && shown >= 20, `${shown} of ${turns} story turns with an envelope`);
});

// ------------------------------------------------------------------------------------------------ after the story
test('the same envelope checks the reply: the barkeep does not turn on him unprovoked; the wolf does; an ambush is free', () => {
    const s = scene([BREN, WOLF]);
    const r = world(s, [{ seq: 1, type: 'hostile', by: ['npc.bren'] }]);
    assert.deepEqual(rules(r), ['envelope']);
    assert.equal(committed(r), false);
    assert.ok(r.corrections.some((c) => /^Bren did not turn on Alaric in the last reply \(not hostile toward Alaric and not harmed by him\); no fight started\./.test(c)), r.corrections.join(' | '));
    // a cause the reply establishes first is a cause: the insult lowers his attitude, then he attacks
    const provoked = world(s, [{ seq: 1, type: 'attitude', who: 'npc.bren', delta: -40, why: 'Alaric spat in his ale' }, { seq: 2, type: 'hostile', by: ['npc.bren'] }]);
    assert.deepEqual(rules(provoked), []);
    assert.equal(committed(provoked), true);
    // an aggressive animal needs no cause
    assert.equal(committed(world(s, [{ seq: 1, type: 'hostile', by: ['mon.wolf'] }])), true);
    // whom the same reply introduces as an attacker (an ambush) is the world's move
    const ambush = world(s, [{ seq: 1, type: 'person.new', ref: 'a scarred footpad', name: null, role: 'footpad', desc: ['knife drawn'], present: true, at: null, band: 'SHORT' }, { seq: 2, type: 'hostile', by: ['a scarred footpad'] }]);
    assert.deepEqual(rules(ambush), []);
    assert.equal(committed(ambush), true);
});

test('a skittish animal fights only when cornered; a defensive one only within reach; an attack intent is the same decision', () => {
    assert.deepEqual(rules(world(scene([DEER]), [{ seq: 1, type: 'hostile', by: ['mon.deer'] }])), ['envelope']);
    assert.equal(committed(world(scene([DEER], { 'mon.deer': 'ENGAGED' }), [{ seq: 1, type: 'hostile', by: ['mon.deer'] }])), true, 'cornered');
    assert.deepEqual(rules(world(scene([ADDER]), [{ seq: 1, type: 'hostile', by: ['mon.adder'] }])), ['envelope']);
    // the reply brings it within reach first: the step's state decides
    const reach = world(scene([ADDER]), [{ seq: 1, type: 'position', who: 'mon.adder', band: 'ENGAGED', cover: null }, { seq: 2, type: 'hostile', by: ['mon.adder'] }]);
    assert.equal(committed(reach), true);
    // intents: attack is turning on him; flee or hold are free
    assert.deepEqual(rules(world(scene([BREN]), [{ seq: 1, type: 'intent', who: 'npc.bren', intent: 'attack' }])), ['envelope']);
    const flee = world(scene([BREN]), [{ seq: 1, type: 'intent', who: 'npc.bren', intent: 'flee' }]);
    assert.deepEqual(rules(flee), []);
    assert.equal(flee.state.pending_intents['npc.bren'], 'flee');
});

test('who may take his coin or things is the envelope\'s too (the old coercion rule, unchanged in its verdicts)', () => {
    const s = scene([BREN, HOBB, RASK]);
    s.entities.pc.sheet.coin_cp = 50;
    const take = (by, kind) => world(s, [{ seq: 1, type: 'coerce', kind, by, coin_cp: 10, object: null, because: 'he says so' }]);
    assert.deepEqual(rules(take('npc.bren', 'robbery')), ['coerce']);
    assert.deepEqual(rules(take('npc.bren', 'fine')), ['coerce']);
    assert.deepEqual(rules(take('npc.hobb', 'fine')), []);
    assert.deepEqual(rules(take('npc.rask', 'robbery')), []);
    assert.equal(take('npc.rask', 'robbery').state.entities.pc.sheet.coin_cp, 40);
});

test('one constraint, two uses: whom the block names as restricted is exactly whom the check refuses without a cause', () => {
    const cast = [BREN, HOBB, RASK, DEER, WOLF, ADDER];
    for (const band of ['MEDIUM', 'ENGAGED']) {
        const s = scene(cast, Object.fromEntries(cast.map((a) => [a.id, band])));
        const shown = new Set(reactionEnvelope(s, content).actors.filter((a) => !a.fight.ok).map((a) => a.id));
        for (const a of cast) {
            const refused = rules(world(s, [{ seq: 1, type: 'hostile', by: [a.id] }])).includes('envelope');
            assert.equal(refused, shown.has(a.id), `${a.id} at ${band}: shown ${shown.has(a.id)}, refused ${refused}`);
            assert.equal(mayOpenFight(s, content, a.id).ok, !shown.has(a.id));
        }
    }
});

test('the recorded live runs: the envelope refuses nothing they did; their fights open as before', async () => {
    for (const f of ['live_0930.json', 'live_0930b.json', 'live_0930c.json']) {
        const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', f), 'utf8'));
        const { steps } = await replayRun(content, fx);
        const refused = steps.filter((x) => x.kind === 'reply').flatMap((x) => x.record?.rejected || []).filter((r) => r.rule === 'envelope');
        assert.deepEqual(refused, [], f);
        const hostile = fx.turns.filter((t) => (t.answer?.deltas || []).some((d) => d.type === 'hostile')).length;
        const opened = steps.filter((x) => x.kind === 'reply' && (x.record?.events || []).some((e) => e.t === 'encounter.started' || e.t === 'combat.pending')).length;
        assert.ok(hostile >= 1 && opened >= 1, `${f}: ${hostile} hostile replies, ${opened} fights opened`);
    }
});
