// Gen 3.5, selective persistence (docs/ARCHITECTURE_GEN35.md §2.4): what the story says about the fighters while a fight
// runs (wounds, moves, demeanour) describes state the fight owns; it lives as long as that fight. Read-time: the log
// keeps every fact, only its currency ends. Everything said outside a fight, and a known combatant's own lasting
// attributes, keep their lifetime.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { Chat4 } from './harness.js';
import { replayRun } from './replay_lib.js';
import { applyWorld } from '../../src/v4/world.js';
import { currentFacts, truth, factLive, knowledgeOf } from '../../src/knowledge.js';

const content = await loadContent();
const gold = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/testrun_v12/gold_v4.json'), 'utf8'));
const g0 = new Chat4(content, { listings: gold.board_generator.listings });
await g0.player('Warrior');
await g0.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
const base = g0.state();
function after(state) {
    const s = structuredClone(state);
    s.last = { ...s.last, input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, search_checks: [], check_die: null,
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, timeCap: 120 } } };
    return s;
}
const world = (s, deltas) => applyWorld(after(s), content, { expected: {}, deltas }, { msg: 9 }).state;
const wolf = (id) => ({ id, kind: 'creature', name: null, descriptors: ['grey wolf'], traits: '', status: 'alive', location: base.scene.location, at: base.scene.at, card: {}, species: 'grey wolf', anchor: 'wolf', created: { turn: 1, minute: 0 } });
/** Two wolves turn on him: the fight runs after this reply. */
function fight() {
    const s = structuredClone(base);
    for (const id of ['mon.wolf_a', 'mon.wolf_b']) { s.entities[id] = wolf(id); s.scene.present.push(id); s.scene.positions[id] = { band: 'SHORT', cover: 'none' }; }
    const f = world(s, [{ seq: 1, type: 'hostile', by: ['mon.wolf_a', 'mon.wolf_b'] }]);
    assert.ok(f.encounter, 'the fight runs');
    return f;
}
const ended = (s) => { const x = structuredClone(s); x.encounter = null; return x; };
const fact = (s, p) => Object.values(s.facts).find((f) => f.s === p.s && f.p === p.p);

test('the story\'s words about a fighter during the fight live as long as the fight; the log keeps them', () => {
    const f = fight();
    // a combatant's condition is the engine's (its HP): the older world rule refuses it outright, as before
    const cond = world(f, [{ seq: 1, type: 'fact', s: 'mon.wolf_a', p: 'condition', o: 'bleeding from the shoulder' }]);
    assert.equal(fact(cond, { s: 'mon.wolf_a', p: 'condition' }), undefined);
    // what else the story says about it while the fight runs is kept, for that fight
    const s = world(f, [{ seq: 1, type: 'fact', s: 'mon.wolf_a', p: 'gait', o: 'favouring a hind leg' }]);
    const x = fact(s, { s: 'mon.wolf_a', p: 'gait' });
    assert.ok(x, 'stored');
    assert.deepEqual(x.scope, { fight: f.encounter.id });
    assert.equal(factLive(s, x), true, 'while the fight runs');
    assert.equal(truth(s, 'mon.wolf_a', 'gait').length, 1);
    assert.equal(currentFacts(ended(s), (y) => y.id === x.id).length, 0, 'after the fight it is no current fact');
    assert.equal(truth(ended(s), 'mon.wolf_a', 'gait').length, 0);
    assert.ok(ended(s).facts[x.id], 'the log keeps it');
});

test('"the wolves", "the last wolf": the kind of the opponents still fighting is the fight\'s too', () => {
    const f = fight();
    const s = world(f, [{ seq: 1, type: 'fact', s: 'the wolves', p: 'behavior', o: 'circling, one feinting at his left side' }]);
    const x = Object.values(s.facts).find((y) => y.p === 'behavior');
    assert.ok(x, 'stored');
    assert.deepEqual(x.scope, { fight: f.encounter.id });
    assert.equal(currentFacts(ended(s), (y) => y.id === x.id).length, 0);
});

test('a known fighter\'s own lasting attributes, and everything said outside a fight, keep their lifetime', () => {
    const f = fight();
    const look = world(f, [{ seq: 1, type: 'fact', s: 'mon.wolf_b', p: 'appearance', o: 'a torn left ear, grey muzzle' }]);
    const a = fact(look, { s: 'mon.wolf_b', p: 'appearance' });
    assert.ok(a && !a.scope, 'its look outlives the fight');
    assert.equal(truth(ended(look), 'mon.wolf_b', 'appearance').length, 1);
    // the same words outside a fight
    const calm = structuredClone(base);
    calm.entities['mon.wolf_a'] = wolf('mon.wolf_a');
    calm.scene.present.push('mon.wolf_a');
    const s = world(calm, [{ seq: 1, type: 'fact', s: 'mon.wolf_a', p: 'condition', o: 'starving, ribs showing' }, { seq: 2, type: 'fact', s: 'the mill', p: 'has', o: 'a broken wheel' }]);
    assert.ok(Object.values(s.facts).filter((y) => ['condition', 'has'].includes(y.p)).every((y) => !y.scope));
});

test('who knew a fight-scoped fact knows something outdated after the fight', () => {
    const f = fight();
    const s = world(f, [{ seq: 1, type: 'fact', s: 'the wolves', p: 'behavior', o: 'circling' }]);
    const x = Object.values(s.facts).find((y) => y.p === 'behavior');
    s.knowledge['npc.x'] = { [x.id]: { stance: 'knows', source: 'witnessed', turn: s.turn, minute: s.clock.minute } };
    assert.equal(knowledgeOf(s, 'npc.x')[0].outdated, false);
    assert.equal(knowledgeOf(ended(s), 'npc.x')[0].outdated, true);
});

test('the recorded live runs: only the fights\' narration is scoped, nothing said outside a fight', async () => {
    let scoped = 0;
    let all = 0;
    for (const f of ['live_0930.json', 'live_0930b.json', 'live_0930c.json']) {
        const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4', f), 'utf8'));
        let before = null;
        await replayRun(content, fx, {
            onPlayer: (st) => { before = st.state; },
            onReply: (st) => {
                for (const e of (st.record?.events || []).filter((x) => x.t === 'fact.asserted')) {
                    all += 1;
                    if (!e.d.fact.scope) continue;
                    scoped += 1;
                    assert.ok(before?.encounter, `${f}: a scoped fact outside a fight: ${e.d.fact.s} ${e.d.fact.p}`);
                    assert.equal(e.d.fact.scope.fight, before.encounter.id);
                }
            },
        });
    }
    assert.ok(scoped >= 5 && scoped <= all / 4, `${scoped} of ${all} facts scoped`);
});
