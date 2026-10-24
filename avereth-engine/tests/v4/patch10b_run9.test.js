import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, GO, outcomeOf, inject, WARRENS } from './patch8_lib.js';
import { applyWorld } from '../../src/v4/world.js';

const content = await loadProductContent();
const ASHBRIDGE = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

test('Run 9: physically crossing Dungeon gate with extractor arrived:false books floor 1 and engine scouts', async () => {
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
        expected: { 1: { arrived: false, at: null, with: null } }, deltas: [] });
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
