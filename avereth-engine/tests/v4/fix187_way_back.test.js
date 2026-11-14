// Build .187 stage 2 (P2) – the Warrior's drift past a refused arrival (testrun_10b/npc-20261114-094810Z/REVIEW.md §9,
// GEGENREVIEW_OPUS.md §4; natural batch 14.11.2026 on .186, Warrior #117–#128). Original chat #0–#122 as fixture.
//  #117 "I keep backing up the dark track toward the gate palisade …": the planner's own answer (n162) was
//       move away from Goblin A – who stood at LONG already, so the step moved him nowhere and fell to story fiction
//       (NOTHING TO BOOK). The narrator took him to the gate anyway; #118/#120 arrivals no_go, the gate's people
//       scene_context; #121 GO to a new "watch-house" under the realm, refused (an interior needs a site).
// Fix: a step back that moves him nowhere in the scene, said as the way back ("backing up the track"), is the way back
// (retreatGo, as a flight outside a fight already is); a step that moves him stays a tactical step. The stay correction
// names where he is and the place he never reached. Topology unchanged: an interior out in the open stays refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { mapPlan } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { validateState } from '../../src/validate.js';
import { Chat4 } from './harness.js';
import { say, outcomeOf, linesOf } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch186_warrior_drift.json.gz', import.meta.url))));
const A = 'mon.goblintrack_ambush_1';
const Q117 = 'I keep backing up the dark track toward the gate palisade, sword raised and eyes on the tallest goblin';
const M117 = { type: 'move', dir: 'away', target: A, quote: Q117 }; // the planner's original answer (n162)
const at = (i) => foldChat(structuredClone(fx.chat), i).state;
const plan = (i, cmds, fight = false) => { const s = at(i); return mapPlan(cmds.map((c, k) => ({ seq: k + 1, ...c })), { fight, opponents: [], catalog: buildCatalog(s, content, { c: true }) }, content, fx.chat[i].mes, s); };
function chatAt(n) {
    const g = new Chat4(content);
    g.chat = fx.chat.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** The original refused extractor deltas of a reply (they are in its record's delta.rejected items). */
const refusedOf = (i) => rec(fx.chat[i]).events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.item).filter((d) => d && d.type !== 'expected');

test('.187 P2 #117 (original state and planner answer): the step back from Goblin A, already at LONG, is the way back to Mossback Warrens (.186: story fiction)', () => {
    const s = at(117);
    assert.equal(s.scene.positions[A].band, 'LONG', 'nobody to step back from');
    const r = plan(117, [M117]);
    assert.deepEqual(r.commands.map((c) => [c.type, c.to]), [['go', 'loc.mossback_warrens']]);
    assert.deepEqual(r.free, []);
});

test('.187 P2 #117 host path: the turn books GOES back to Mossback Warrens, not NOTHING TO BOOK; the original arrival there is then accepted', async () => {
    const g = chatAt(117);
    await say(g, fx.chat[117].mes, M117);
    assert.match(linesOf(g), /GOES — to Mossback Warrens/);
    assert.doesNotMatch(linesOf(g), /NOTHING TO BOOK/);
    const arrive = refusedOf(118).find((d) => d.type === 'arrive');
    assert.equal(arrive.at, 'loc.mossback_warrens', 'the original extractor answer of #118');
    const r = await g.reply(fx.chat[118].mes, { expected: { 1: { arrived: true, at: 'loc.mossback_warrens', with: null } }, deltas: [{ ...arrive, seq: 1 }] });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    assert.equal(g.state().scene.at, 'loc.mossback_warrens');
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
});

test('.187 P2 against: a step that moves him (#113, SHORT → MEDIUM) stays the tactical step; a step back without the way stays fiction; in a fight nothing changes', () => {
    const s113 = plan(113, [{ type: 'move', dir: 'away', target: null, quote: 'I raise my sword between us and back slowly up the track, away from the hut, giving ground without ever turning my back on their spears.' }]);
    assert.deepEqual(s113.commands.map((c) => [c.type, c.dir]), [['move', 'away']], '#113 original');
    const bare = plan(117, [{ type: 'move', dir: 'away', target: A, quote: 'I keep backing up' }]);
    assert.deepEqual(bare.commands, [], 'no way named: nothing booked');
    assert.equal(bare.free.length, 1);
    const fight = plan(117, [M117], true);
    assert.ok(!(fight.commands || []).some((c) => c.type === 'go'), 'a fight keeps its own rules');
    const withGo = plan(117, [M117, { type: 'go', to: 'loc.charcoal_burners_hut_at_the_second_bend', quote: 'toward the gate palisade' }]);
    assert.deepEqual(withGo.commands.filter((c) => c.type === 'go').map((c) => c.to), ['loc.charcoal_burners_hut_at_the_second_bend'], 'his own GO stays the one GO');
});

test('.187 P2 #119 (original): an arrival the story tells without a GO stays refused, nothing of the gate is kept, and the correction names both places', async () => {
    const g = chatAt(119);
    await say(g, fx.chat[119].mes);
    assert.match(linesOf(g), /NOTHING TO BOOK/);
    const deltas = refusedOf(120).map((d, k) => ({ ...d, seq: k + 1 }));
    assert.ok(deltas.some((d) => d.type === 'arrive') && deltas.some((d) => d.type === 'person.new'));
    const before = g.state();
    const r = await g.reply(fx.chat[120].mes, { expected: {}, deltas });
    const s = g.state();
    assert.equal(s.scene.at, before.scene.at, 'not moved');
    assert.ok(!Object.values(s.entities).some((e) => e.kind === 'npc' && !before.entities[e.id]), 'no person of the unreached gate');
    const rules = (r.record.rejected || []).map((x) => x.rule);
    assert.ok(rules.includes('no_go') && rules.includes('scene_context'), rules.join(','));
    const stay = (r.record.corrections || []).find((c) => c.startsWith('Alaric did not voluntarily travel'));
    assert.match(stay, /He is still at [^;]+; he has not reached charcoal-burner's hut at the second bend, and what the last reply had happen to him there did not happen\. The next reply continues at /);
});

test('.187 P2 #121 (original): the authorized GO to a new watch-house under the realm stays refused (an interior needs a site); under a reached site it is accepted', async () => {
    const g = chatAt(121);
    await say(g, fx.chat[121].mes, { type: 'go', to: { new: 'the watch-house' }, within: null, quote: 'I follow the keeper\'s direction to the watch-house' });
    const arrive = refusedOf(122).find((d) => d.type === 'arrive');
    assert.equal(arrive.at.new.parent, 'realm.duskreach', 'the original wrong parent');
    const before = g.state().scene.at;
    const r = await g.reply(fx.chat[122].mes, { expected: { 1: { arrived: true, at: arrive.at, with: null } }, deltas: [{ ...arrive, seq: 1 }] });
    assert.equal(g.state().scene.at, before);
    assert.ok((r.record.rejected || []).some((x) => x.rule === 'place' && /an? interior cannot lie in Duskreach/.test(x.why)), JSON.stringify(r.record.rejected));
    // the same GO after the way back reached Mossback Warrens: the watch-house is a room of a site
    const h = chatAt(117);
    await say(h, fx.chat[117].mes, M117);
    await h.reply(fx.chat[118].mes, { expected: { 1: { arrived: true, at: 'loc.mossback_warrens', with: null } }, deltas: [{ ...refusedOf(118).find((d) => d.type === 'arrive'), seq: 1 }] });
    await say(h, 'I follow the keeper\'s direction to the watch-house.', { type: 'go', to: { new: 'the watch-house' }, within: null, quote: 'I follow the keeper\'s direction to the watch-house' });
    const room = { new: { name: 'watch-house by the gate', kind: 'interior', parent: 'loc.mossback_warrens' } };
    await h.reply('He goes into the watch-house by the gate.', { expected: { 1: { arrived: true, at: room, with: null } }, deltas: [{ seq: 1, type: 'arrive', at: room, forced_by: null, with: null }] });
    assert.equal(h.state().places[h.state().scene.at]?.parent, 'loc.mossback_warrens');
});
