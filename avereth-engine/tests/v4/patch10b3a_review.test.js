import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const base = (await campaign(content)).state();
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/run8_creative_warden.json', import.meta.url)));
const apply = (s, prose, deltas) => applyWorld(s, content, { expected: {}, deltas }, { prose, msg: 900 });
const opens = (r) => r.events.some((e) => e.t === 'combat.pending' || e.t === 'encounter.started');
function people() {
    const s = structuredClone(base);
    for (const name of ['Rask', 'Bren']) {
        const id = `npc.${name.toLowerCase()}`;
        s.entities[id] = { id, kind: 'npc', name, descriptors: ['bandit'], traits: '', status: 'alive', location: s.scene.location, at: s.scene.at, template: 'bandit', card: {}, created: { turn: 1, minute: 0 } };
        s.scene.present.push(id); s.scene.positions[id] = { band: 'SHORT', cover: 'none' };
    }
    s.last.outcome = { kind: 'v4', actions: [], resolutions: [], auth: { c: true } };
    return s;
}
const hostile = { seq: 1, type: 'hostile', by: ['npc.rask'] };
for (const type of ['hostile', 'intent']) test(`review: neutral smiles cannot authorize ${type}`, () => {
    const d = type === 'hostile' ? hostile : { seq: 1, type, who: 'npc.rask', intent: 'attack' };
    const r = apply(people(), 'Rask smiles at Alaric.', [d]);
    assert.equal(opens(r), false);
    assert.notEqual(r.state.pending_intents['npc.rask'], 'attack');
    assert.ok(r.rejected.some((x) => x.rule === 'attack_commitment'));
});
for (const prose of ['', 'Bren lunges at Alaric.', 'Rask smiles while Bren lunges at Alaric.', 'Bren drives his blade toward Rask.']) test(`review: missing/wrong actor evidence: ${prose}`, () => {
    assert.equal(opens(apply(people(), prose, [hostile])), false);
});
for (const prose of ['Rask hurls his knife at Alaric.', 'Rask brings his axe down at Alaric.', 'Rask raises his bow. He looses an arrow at Alaric.', 'Rask lunges. Bren watches.', "From Rask's bow an arrow tears toward Alaric."]) test(`review: positive immediate commitment: ${prose}`, () => {
    assert.equal(opens(apply(people(), prose, [hostile])), true);
});
test('review: unrelated evidence quote cannot authorize Rask; conditional fragment is insufficient', () => {
    assert.equal(opens(apply(people(), 'Rask smiles. Bren attacks Alaric.', [{ ...hostile, evidence: 'Bren attacks Alaric' }])), false);
    assert.equal(opens(apply(people(), 'Rask attacks if Alaric refuses.', [{ ...hostile, evidence: 'Rask attacks' }])), false);
});
const ROOT = 'loc.old_crown_catacombs';
const story = fixture.answer.deltas.find((d) => d.type === 'creature.new');
function bound() {
    const s = people();
    Object.assign(s, structuredClone({ turn: fixture.turn, clock: fixture.clock, scene: fixture.scene }));
    Object.assign(s.places, structuredClone(fixture.places));
    Object.assign(s.entities, structuredClone(fixture.entities));
    s.dungeons = { [ROOT]: structuredClone(fixture.dungeon) };
    return apply(s, fixture.prose, [story]).state;
}
const warden = (s) => s.dungeons[ROOT].run.floors[1].slots.find((sl) => sl.id === 'warden');
function movePlayer(s, to, withIds = []) {
    if (!s.places[to]) s.places[to] = { id: to, name: 'Other gallery', parent: ROOT, kind: 'interior', level: 1 };
    const from = s.scene.at;
    // Existing arrival bookkeeping: creatures left behind retain their last actual room.
    for (const id of s.scene.present.filter((id) => id !== 'pc' && !withIds.includes(id))) applyEvent(s, { t: 'entity.updated', d: { id, set: { left: { at: from, turn: s.turn, minute: s.clock.minute, leg: false } } } });
    applyEvent(s, { t: 'scene.moved', d: { at: to, reset_present: true } });
    for (const id of withIds) applyEvent(s, { t: 'scene.entered', d: { id, band: 'SHORT' } });
}
test('review: same story_ref in a different room cannot teleport the Warden', () => {
    const s = bound(); const id = warden(s).entities[0]; const origin = s.scene.at;
    movePlayer(s, 'loc.review.other');
    const r = apply(s, 'The Warden remains in its original hall.', [story]);
    assert.equal(r.state.scene.present.includes(id), false);
    assert.equal(r.events.some((e) => e.t === 'scene.entered' && e.d.id === id), false);
    assert.equal(r.state.entities[id].left.at, origin);
    assert.deepEqual(warden(r.state).entities, [id]);
    assert.ok(r.rejected.some((x) => x.rule === 'dungeon_presence'));
});
test('review: repeated same-room reference creates no redundant entry', () => {
    const s = bound(); const id = warden(s).entities[0];
    const r = apply(s, fixture.prose, [story]);
    assert.equal(r.state.scene.present.includes(id), true);
    assert.equal(r.events.some((e) => e.t === 'scene.entered' && e.d.id === id), false);
});
test('review: returning to the actual room permits a real reunion with the same HP and identity', () => {
    const s = bound(); const id = warden(s).entities[0]; const origin = s.scene.at;
    const profile = structuredClone(s.entities[id].profile);
    movePlayer(s, 'loc.review.other'); movePlayer(s, origin);
    const r = apply(s, fixture.prose, [story]);
    assert.equal(r.state.scene.present.includes(id), true);
    assert.deepEqual(r.state.entities[id].profile, profile);
    assert.deepEqual(warden(r.state).entities, [id]);
});
test('review: explicit enter permits pursuit, persists for reload and later reunion', () => {
    const s = bound(); const id = warden(s).entities[0];
    movePlayer(s, 'loc.review.other');
    const ds = [{ seq: 1, type: 'enter', who: id }, { ...story, seq: 2 }];
    const r = apply(s, 'The Warden follows through the doorway into this gallery.', ds);
    assert.equal(r.state.scene.present.includes(id), true);
    assert.equal(r.events.filter((e) => e.t === 'scene.entered' && e.d.id === id).length, 1);
    const replay = structuredClone(s);
    for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay.scene, r.state.scene);
    const loaded = JSON.parse(JSON.stringify(r.state));
    movePlayer(loaded, 'loc.review.third'); movePlayer(loaded, 'loc.review.other');
    const reunion = apply(loaded, 'The same Warden is still here.', [story]);
    assert.equal(reunion.state.scene.present.includes(id), true);
    assert.equal(Object.values(reunion.state.entities).filter((e) => e.slot?.id === 'warden').length, 1);
    assert.deepEqual(apply(s, 'The Warden follows through the doorway into this gallery.', ds).events, r.events, 'swipe from the same pre-state is deterministic');
});

for (const prose of ['Rask drives his cart along the road.', 'Rask brings the price down.', 'Rask discusses an attack.', 'Rask attacks Bren.']) test(`review: a non-attack or attack on someone else is not an attack on Alaric: ${prose}`, () => {
    assert.equal(opens(apply(people(), prose, [hostile])), false);
});
test('review: explicitly coordinated attackers both commit', () => {
    const r = apply(people(), 'Rask and Bren lunge at Alaric.', [{ ...hostile, by: ['npc.rask', 'npc.bren'] }]);
    assert.ok(r.state.encounter?.combatants['npc.rask']);
    assert.ok(r.state.encounter?.combatants['npc.bren']);
});
