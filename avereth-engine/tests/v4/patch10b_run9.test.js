import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, GO, outcomeOf, inject, WARRENS } from './patch8_lib.js';
import { applyWorld } from '../../src/v4/world.js';
import { unbookedDungeonThreat } from '../../src/v4/run9_evidence.js';

const content = await loadProductContent();
const ASHBRIDGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

test('Run 9: extractor-confirmed Dungeon entry books floor 1 and engine scouts', async () => {
    // Run 9 starts at Ashbridge, not the patch8 helper's default Alderwatch.
    // Mossback admission requires Guild membership; the original player was a Novice.
    const g = await campaign(content, { greeting: ASHBRIDGE });
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.ashbridge', power_rank: 'F' } }]);
    await walk(g, WARRENS, { text: '*I go to Mossback Warrens*', prose: 'He arrives at the gate of Mossback Warrens.' });
    const s0 = g.state();
    assert.equal(s0.scene.at, WARRENS);
    await say(g, '*I enter the warrens, to where the daylight gives out*', GO({ new: 'into the warrens, to where the daylight gives out' }));
    const a = g.state().dungeons[WARRENS]?.ahead;
    assert.equal(a?.floor, 1);
    await g.reply('Alaric stepped through the gate. Inside, the mouth tunnel smelled of earth and smoke.', {
        expected: { 1: { arrived: true, at: { new: { name: 'Mouth tunnel', kind: 'interior', parent: WARRENS } }, with: null } }, deltas: [] });
    const s = g.state();
    assert.notEqual(s.scene.at, WARRENS);
    assert.equal(s.places[s.scene.at]?.level, 1);
    const scouts = s.dungeons[WARRENS].run.floors[1].slots.find((x) => x.id === 'scouts');
    assert.equal(scouts.entities.length, scouts.count);
});

test('Run 9: GO before attack on not-yet-present foe remains, without a free attack', async () => {
    const g = await campaign(content);
    const text = 'I step into the fire chamber and use Flame Lance on the goblin there.';
    await say(g, text,
        { type: 'go', to: { new: 'the fire chamber' }, quote: 'I step into the fire chamber' },
        { type: 'use_skill', skill: 'mage.flame_lance', target: { new: 'the goblin there' }, quote: 'use Flame Lance on the goblin there' });
    const o = outcomeOf(g);
    assert.equal(o.kind, 'v4');
    assert.ok(o.actions.some((x) => /GOES/.test(x)));
    assert.equal(g.state().encounter, null);
});

test('Run 9: nonexistent mon.* encounter/group is rejected as a fact subject', async () => {
    const g = await campaign(content);
    const s = g.state();
    s.last.outcome = { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, auth: { c: true, gos: [] } };
    const bad = 'mon.mossback_warrens_c1_l1_e1';
    const r = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'fact', s: bad, p: 'behavior', o: 'disarmed him' }] }, { prose: 'The goblins disarm him.' });
    assert.ok(r.rejected.some((x) => x.rule === 'group_fact'));
    assert.equal(r.events.some((x) => x.t === 'fact.asserted' && x.d.fact?.s === bad), false);
});

test('Run 9 review .73: phantom shapes are not equivalent to trader reports', () => {
    const refused = [{ species: 'goblin scout', count: 1 }, { species: 'goblin warrior', count: 1 }, { species: 'goblin', count: 1 }];
    assert.equal(unbookedDungeonThreat('Three goblins in the firelit chamber past the bend', refused), true);
    assert.equal(unbookedDungeonThreat('Three shapes in the firelit chamber', refused), true);
    assert.equal(unbookedDungeonThreat('Goblin traders report that wolves threaten the road', refused), false);
    assert.equal(unbookedDungeonThreat('Three wolves in the firelit chamber', refused), false);
    assert.equal(unbookedDungeonThreat('Goblins raid travelers far from the dungeon', refused), false);
});
async function atMossbackGate() {
    const g = await campaign(content, { greeting: ASHBRIDGE });
    inject(g, [{ t: 'guild.registered', d: { rank: 'Novice', branch: 'loc.ashbridge', power_rank: 'F' } }]);
    await walk(g, WARRENS, { text: '*I go to Mossback Warrens*', prose: 'He arrives at the gate of Mossback Warrens.' });
    assert.equal(g.state().scene.at, WARRENS);
    return g;
}
test('Run 9 review .74: structured arrived:false always prevents Dungeon entry', async () => {
    for (const prose of [
        'Alaric stepped through the gate yesterday. Today he remains outside. Inside, someone coughed.',
        'The guard said, "Alaric stepped through the gate." Inside, someone coughed.',
        'Alaric stepped through the gate but then walked back out. Inside, someone coughed.',
        'A goblin walked through the gate. Inside, its companions waited. Alaric remained outside.',
        'Alaric almost stepped through the gate, but stopped outside. Inside, a fire burned.',
        'Alaric stepped through the gate. Inside, the mouth tunnel smelled of earth and smoke.',
    ]) {
        const g = await atMossbackGate();
        await say(g, '*I enter the warrens*', GO({ new: 'into the warrens' }));
        await g.reply(prose, { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
        assert.equal(g.state().scene.at, WARRENS);
        assert.ok(g.state().dungeons[WARRENS].run.floors[1].slots.every((sl) => sl.entities.length === 0));
    }
});
test('Run 9 review .73: rejected goblins do not create a generic local threat thread', async () => {
    for (const [threadText, rejected] of [
        ['Three shapes in the firelit chamber', true],
        ['Goblin traders report that wolves threaten the road', false],
    ]) {
        const g = await atMossbackGate();
        await say(g, '*I peer toward the firelight*');
        const deltas = [
            { seq: 1, type: 'creature.new', ref: 'gob_scout_fire', species: 'goblin scout', anchor: 'goblin', desc: ['at fire'], count: 1, present: true, band: 'MEDIUM', threat: null },
            { seq: 2, type: 'creature.new', ref: 'gob_hatchet_fire', species: 'goblin warrior', anchor: 'goblin', desc: ['at fire'], count: 1, present: true, band: 'MEDIUM', threat: null },
            { seq: 3, type: 'creature.new', ref: 'gob_armlet_wall', species: 'goblin', anchor: 'goblin', desc: ['at wall'], count: 1, present: true, band: 'MEDIUM', threat: null },
            { seq: 4, type: 'thread', id: null, text: threadText, kind: 'threat', status: 'open', resolution: null },
        ];
        const reply = await g.reply('The firelit chamber lies just beyond the bend.', { expected: {}, deltas });
        assert.ok(reply.record.rejected.some((r) => r.rule === 'dungeon_foe'));
        const kept = Object.values(g.state().threads || {}).some((x) => x.text === threadText && x.status === 'open');
        assert.equal(kept, !rejected, threadText);
    }
});

test('Run 9 review .74: GO extraction guidance distinguishes current Dungeon interior from a quoted crossing', () => {
    const rule = content.deltaVocab.expected.go.summary;
    assert.match(rule, /END of this reply/);
    assert.match(rule, /first interior or mouth tunnel/);
    assert.match(rule, /quoted, hypothetical/);
    assert.match(rule, /returned outside/);
});
