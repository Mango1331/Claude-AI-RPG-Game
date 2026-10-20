// Patch 7.2B (4.3.0-c.6.6.21): identity resolution and group cardinality. A group's name (entity.group) is who they
// are; how many of them act is the delta's own word (scope). Live Glimmerdeep (tests/v4/live_1020.json): one scarred
// beetle lunged at Alaric, the extractor wrote the swarm's ref, and the engine set eleven beetles on him. Now a group's
// ref commits all of it only with scope "all"; one creature is named by its own handle; a part of a group the engine
// cannot tell apart ("three of the twelve") commits no one, and the narrator hears why.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { groupMembers, resolveRef } from '../../src/v4/identity.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020.json'), 'utf8'));
const BEETLE = (n) => `mon.crystal_beetle_swarm_${n}`;
const ALIVE = [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12];
const SWARM = 'crystal_beetle_swarm';

function live(n = 37) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function watch(g) {
    g.chat.push({ mes: '*i hold still and watch them*', is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'wait', what: 'watching the beetles', minutes: 1, until: null, quote: 'i hold still and watch them' }] })];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
}
/** The reply `prose` with the extractor's `deltas`; the fighters it put on Alaric and the record. */
async function reply(g, prose, deltas) {
    const r = await g.reply(prose, { expected: {}, deltas: deltas.map((d, i) => ({ seq: i + 1, ...d })) });
    const enc = g.state().encounter;
    // the attackers this reply committed: the engine's commitments (Core #23 pending, then opened) and those who joined a
    // running fight; read from the record, the fight they open may already be over (eleven beetles on a level-1 Mage)
    const ev = r.record?.events || [];
    const foes = [...new Set([...ev.filter((e) => e.t === 'combat.pending').map((e) => e.d.by), ...Object.keys(enc?.combatants || {}).filter((id) => id !== 'pc' && enc.combatants[id].side === 'hostile' && ev.some((e) => e.t === 'encounter.combatant_added' && e.d?.id === id))])];
    return { foes: foes.sort(), record: r.record, corrections: r.record?.corrections || [], rejected: r.record?.rejected || [] };
}
const sorted = (ns) => ns.map(BEETLE).sort();

test('patch 7.2B (1, 6): twelve beetles are one group of eleven living here; the group\'s ref names them, but without scope "all" it commits no one', async () => {
    const g = live();
    await watch(g);
    const s = g.state();
    assert.equal(new Set(ALIVE.map((n) => s.entities[BEETLE(n)].group)).size, 1);
    assert.deepEqual(groupMembers(s, content, SWARM).sort(), sorted(ALIVE));
    const single = (x) => x;
    for (const scope of [null, 'part']) assert.equal(resolveRef(s, content, SWARM, { scope, single }).kind, 'unclear', String(scope));
    assert.deepEqual(resolveRef(s, content, SWARM, { scope: 'all', single }).ids.sort(), sorted(ALIVE));
    assert.deepEqual(resolveRef(s, content, BEETLE(1), { scope: 'all', single }), { kind: 'single', ids: [BEETLE(1)] }, 'a handle is one, whatever the scope');
});

test('patch 7.2B (2): the live case: one scarred beetle lunges; the swarm\'s ref without scope sets no swarm on him; its own handle sets that one beetle', async () => {
    // the live answer: hostile by the swarm's ref for one beetle's lunge
    const g = live();
    await watch(g);
    const bad = await reply(g, 'The beetle with the notched shell lunges at Alaric, mandibles wide.', [{ type: 'hostile', by: [`mon.${SWARM}`], scope: null, evidence: null }]);
    assert.deepEqual(bad.foes, [], 'eleven beetles are not set on him');
    assert.ok(bad.rejected.some((x) => x.rule === 'group_unclear'), 'audited');
    assert.ok(bad.corrections.some((c) => /was not booked: .*names a group of 11, not that all of it does this/.test(c)), bad.corrections.join('\n'));
    // the same reply as the contract asks for it: the one beetle by its handle
    const h = live();
    await watch(h);
    const one = await reply(h, 'The beetle with the notched shell lunges at Alaric, mandibles wide.', [{ type: 'hostile', by: [BEETLE(1)], scope: null, evidence: null }]);
    assert.deepEqual(one.foes, [BEETLE(1)]);
});

test('patch 7.2B (3): the whole swarm attacking together: all eleven, by the group\'s ref with scope all; no cap on a group\'s size', async () => {
    const g = live();
    await watch(g);
    const r = await reply(g, 'Then the whole swarm surges off the vein at once, eleven shells clattering toward him.', [{ type: 'hostile', by: [SWARM], scope: 'all', evidence: 'the whole swarm surges off the vein at once, eleven shells' }]);
    assert.deepEqual(r.foes, sorted(ALIVE));
    // an evidence quote the reply does not hold, or one that counts another number, commits no one
    for (const evidence of ['the beetles all attack', 'three shells clatter toward him']) {
        const h = live();
        await watch(h);
        const x = await reply(h, 'Then the whole swarm surges off the vein at once, three shells clatter toward him first.', [{ type: 'hostile', by: [SWARM], scope: 'all', evidence }]);
        assert.deepEqual(x.foes, [], evidence);
        assert.ok(x.rejected.some((y) => y.rule === 'group_unclear'), evidence);
    }
});

test('patch 7.2B (4, 5): a named part (A, C and F) is exactly those three; "three of them" the engine cannot tell apart commits none and the narrator hears why', async () => {
    const g = live();
    await watch(g);
    const r = await reply(g, 'Beetles A, C and F charge; the others back off along the vein.', [{ type: 'hostile', by: [BEETLE(1), BEETLE(3), BEETLE(7)], scope: null, evidence: null }]);
    assert.deepEqual(r.foes, [BEETLE(1), BEETLE(3), BEETLE(7)].sort());
    for (const d of [{ by: ['three beetles'], scope: null }, { by: [SWARM], scope: 'part' }]) {
        const h = live();
        await watch(h);
        const x = await reply(h, 'Three of the beetles break from the vein and come at him.', [{ type: 'hostile', evidence: null, ...d }]);
        assert.deepEqual(x.foes, [], JSON.stringify(d));
        assert.ok(x.corrections.some((c) => /was not booked/.test(c) && /name each attacker by its handle/.test(c)), JSON.stringify(d));
    }
});

test('patch 7.2B (6): intent, aware and position follow the same rule: a group\'s ref moves, warns or turns all of it only with scope all', async () => {
    const g = live();
    await watch(g);
    await g.reply('The beetles go still, all of them, heads down against the stone.', { expected: {}, deltas: [
        { seq: 1, type: 'position', who: SWARM, band: 'MEDIUM', cover: null, cluster: null, scope: null, evidence: null },
        { seq: 2, type: 'aware', who: SWARM, level: 'unaware', scope: 'part', evidence: null },
    ] });
    let s = g.state();
    assert.equal(s.scene.positions[BEETLE(2)].band, 'SHORT', 'no scope: nobody moved');
    await watch(g);
    await g.reply('The whole swarm draws back along the vein, all of them, to the far wall.', { expected: {}, deltas: [
        { seq: 1, type: 'position', who: SWARM, band: 'MEDIUM', cover: null, cluster: null, scope: 'all', evidence: 'The whole swarm draws back along the vein' },
    ] });
    s = g.state();
    assert.deepEqual(ALIVE.map((n) => s.scene.positions[BEETLE(n)].band), ALIVE.map(() => 'MEDIUM'));
});

test('patch 7.2B (7): two separate groups of one kind: "the goblins" over both is no one; each group by its own ref with scope all is that group', async () => {
    const g = live();
    await watch(g);
    await g.reply('Two bands of tunnel goblins spill in, three from the side passage and two from the main way.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'side goblins', species: 'tunnel goblin', anchor: 'goblin', desc: ['from the side passage'], count: 3, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: null, more: true },
        { seq: 2, type: 'creature.new', ref: 'main goblins', species: 'tunnel goblin', anchor: 'goblin', desc: ['from the main way'], count: 2, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: null, more: true },
    ] });
    const s = g.state();
    const side = Object.keys(s.entities).filter((id) => s.entities[id].group === 'side goblins');
    assert.equal(side.length, 3);
    assert.equal(resolveRef(s, content, 'the goblins', { scope: 'all', single: (x) => x }).kind, 'unclear', 'a kind over two groups');
    await watch(g);
    const r = await reply(g, 'The three from the side passage rush him together.', [{ type: 'hostile', by: ['side goblins'], scope: 'all', evidence: 'The three from the side passage rush him together' }]);
    assert.deepEqual(r.foes.filter((id) => id.includes('goblin')).sort(), side.sort());
});

test('patch 7.2B (8, 9, 10): a newcomer joins its group and the group\'s ref with scope all then means it too; a returning beetle stays itself; a vague singular names no one', async () => {
    const g = live();
    await watch(g);
    await g.reply('A twelfth beetle crawls out of a crack and joins the swarm on the vein.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: SWARM, species: 'crystal beetle', anchor: 'arthropod', desc: ['fist-sized, grey-blue shell'], count: 1, present: true, band: 'SHORT', cluster: null, stronger: null, threat: null, more: true },
    ] });
    let s = g.state();
    const all = groupMembers(s, content, SWARM);
    assert.equal(all.length, 12, 'the newcomer is one of the swarm');
    const newcomer = all.find((id) => !ALIVE.map(BEETLE).includes(id));
    assert.ok(newcomer && !ALIVE.map(BEETLE).includes(newcomer));
    // the dead beetle E (#33) is no member and never comes back as the newcomer
    assert.ok(!all.includes(BEETLE(5)));
    // a vague singular ("the beetle" among eleven) is nobody in particular: not booked
    await watch(g);
    const vague = await reply(g, 'The beetle lunges.', [{ type: 'hostile', by: ['the beetle'], scope: null, evidence: null }]);
    assert.deepEqual(vague.foes, []);
    // the newcomer and beetle A by their handles: exactly those two
    s = g.state();
    const two = await reply(g, 'The newcomer and the notched one come at him.', [{ type: 'hostile', by: [newcomer, BEETLE(1)], scope: null, evidence: null }]);
    assert.deepEqual(two.foes, [newcomer, BEETLE(1)].sort());
    assert.equal(g.state().entities[BEETLE(1)].profile.max_hp, s.entities[BEETLE(1)].profile.max_hp, 'its own profile, as fixed at first sight');
});
