import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { applyEvent } from '../../src/state.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { entranceOf } from '../../src/v4/living.js';
import { placeIdentity, placeParent } from '../../src/v4/place_refs.js';
import { parseExtraction } from '../../src/v4/extract.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run22_prebatch.json', import.meta.url)));
export const base = () => applyWorld(structuredClone(f.purchase.state), content, structuredClone(f.purchase.answers[0]), { msg: f.purchase.i, prose: f.purchase.prose }).state;
const go = (s, to) => playerTurnV4(s, content, 'I go there.', { c: true, msg: 500, commands: [{ seq: 1, type: 'go', to, quote: 'I go there.' }] }).state;
const apply = (s, a) => applyWorld(s, content, a, { msg: 501, prose: 'He walks on.' });
const arrival = (at, seq = 1) => ({ seq, type: 'arrive', at, with: [], forced_by: null });
const person = (scene, seq = 2) => ({ seq, type: 'person.new', ref: 'vel', name: 'Vel', role: 'merchant', desc: [], at: scene, present: true, relevant: true, scene });
const expected = at => ({ 1: { arrived: true, at, with: [] } });
const parse = (s, a) => {
    const cat = extractorCatalog(s, content, { c: true });
    return parseExtraction(JSON.stringify(a), content.deltaVocab, { places: cat.places, objects: cat.objects, quests: cat.quests }, s.last.outcome.expected_keys,
        { sceneRequired: true, explicitArrivals: true, startScene: s.scene.at, state: s, content });
};
test('101 World: expected-only arrival is a repair diagnostic and cannot move or introduce target NPCs', () => {
    const s = go(base(), 'loc.alderwatch');
    const a = { scene: 'loc.alderwatch', expected: expected('loc.alderwatch'), deltas: [person('loc.alderwatch')] };
    assert.ok(parse(s, a).issues.some(x => /arrive/.test(x.why)));
    const r = apply(s, a); assert.equal(r.state.scene.at, s.scene.at);
    assert.ok(!Object.values(r.state.entities).some(e => e.name === 'Vel'));
    assert.ok(r.rejected.some(x => /arrival|arrive/.test(x.why)));
});
for (const refKind of ['id', 'new', 'reordered']) test(`101 World: canonical ${refKind} scene after an explicit arrival`, () => {
    const s = go(base(), 'loc.alderwatch'), p = s.places['loc.alderwatch'];
    const ref = { new: { name: p.name, kind: p.kind, parent: p.parent } };
    const scene = refKind === 'id' ? p.id : refKind === 'new' ? ref : { new: { parent: p.parent, kind: p.kind, name: p.name } };
    const a = { scene, expected: expected(ref), deltas: [arrival(ref), person(scene)] };
    const r = apply(s, a); assert.equal(r.state.scene.at, p.id);
    assert.ok(Object.values(r.state.entities).some(e => e.name === 'Vel' && r.state.scene.present.includes(e.id)));
    const replay = structuredClone(s); for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e);
    assert.deepEqual(replay, r.state);
});
test('101 World: elapsed travel time alone does not move the party before a local gift', () => {
    const s = go(base(), 'loc.glassmere'), at = s.scene.at;
    const a = { scene: at, expected: { 1: { arrived: false, at: null, with: [] } }, deltas: [
        { seq: 1, type: 'object.new', name: 'Fresh travel apple', kind: 'item', qty: 1, holder: 'npc.npclodging_clerk', scene: at },
        { seq: 2, type: 'object.move', object: { new: 'Fresh travel apple' }, to: 'pc', qty: 1, scene: at },
        { seq: 3, type: 'time', minutes: 60 }
    ] };
    const r = apply(s, a); assert.equal(r.state.scene.at, at);
    assert.ok(Object.values(r.state.objects).some(o => o.name === 'Fresh travel apple' && o.holder?.entity === 'pc'));
    const road = 'realm.valedorn_crown'; a.scene = road; a.deltas.push(arrival(road, 4), person(road, 5));
    const onRoad = apply(s, a); assert.equal(onRoad.state.scene.at, road);
    assert.ok(Object.values(onRoad.state.objects).some(o => o.name === 'Fresh travel apple' && o.holder?.entity === 'pc'));
});
test('101 World: a wilderness part stays under its fixed population site; comparison cannot create places', () => {
    const s = base(), id = 'loc.test_habitat';
    s.places[id] = { id, name: 'Reed habitat', kind: 'site', parent: 'realm.valedorn_crown', realm: 'realm.valedorn_crown', population: { anchor: 'wolf', species: 'wolf', levels: [1, 2] } };
    const turn = go(s, id), ref = { new: { name: 'Northern reeds', kind: 'wilderness', parent: id } };
    const r = apply(turn, { scene: ref, expected: { 1: { arrived: false, at: null, with: [] } }, deltas: [arrival(ref)] });
    assert.equal(r.state.places[r.state.scene.at].parent, id);
    const before = structuredClone(turn);
    parse(turn, { scene: ref, expected: {}, deltas: [person(ref)] }); assert.deepEqual(turn, before);
});
test('101 World: explicit arrival without GO remains refused', () => {
    const s = base(); s.last.outcome.auth.gos = []; s.last.outcome.auth.go = false;
    const r = apply(s, { scene: 'loc.glassmere', expected: {}, deltas: [arrival('loc.glassmere')] });
    assert.equal(r.state.scene.at, s.scene.at);
});

test('101 places: exact known gate alias is realm-scoped and ambiguity fails closed', () => {
    const s = base(), root = 'loc.test_gate', realm = 'realm.valedorn_crown';
    s.places[root] = {id: root, name: 'Glass Vault', kind: 'site', parent: realm, realm, dungeon: {real: true}};
    s.dungeons ||= {};
    s.dungeons[root] = {gate: {names: ['Cracked amber portal']}};
    const ref = parent => ({new: {name: 'Cracked amber portal', kind: 'site', parent}});
    assert.equal(entranceOf(s, content, ref(realm)), root);
    assert.equal(placeIdentity(s, ref(realm), content), root);
    assert.equal(entranceOf(s, content, ref('realm.elsewhere')), null);
    const other = 'loc.other_gate'; s.places[other] = {...s.places[root], id: other, name: 'Second Vault'}; s.dungeons[other] = structuredClone(s.dungeons[root]);
    assert.equal(entranceOf(s, content, ref(realm)), null);
});
test('101 places: nested habitat sections retain their ancestor; ordinary building wilderness still normalizes', () => {
    const s = base(), realm = 'realm.valedorn_crown';
    s.places['loc.habitat'] = {id:'loc.habitat', kind:'site', parent:realm, population:{anchor:'wolf'}};
    s.places['loc.section'] = {id:'loc.section', kind:'site', parent:'loc.habitat'};
    s.places['loc.ordinary'] = {id:'loc.ordinary', kind:'site', parent:realm};
    assert.equal(placeParent(s, 'wilderness', 'loc.section', true), 'loc.section');
    assert.equal(placeParent(s, 'wilderness', 'loc.ordinary', true), realm);
});
