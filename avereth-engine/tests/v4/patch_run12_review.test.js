import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { setFactEvents } from '../../src/knowledge.js';
import { nextSlot, aheadEvents, catalogLines, floorText, syncEvents, sealRefusal } from '../../src/v4/living.js';
import { deliveryTarget, transferCargo } from '../../src/v4/delivery.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/run12_e146.json', import.meta.url)));
const json = x => JSON.parse(JSON.stringify(x));
const root = 'loc.mossback_warrens';
const world = (s, answer) => applyWorld(s, content, answer, { msg: 146, prose: 'Three goblins stand beyond the crawl.' });
const slotOf = s => s.dungeons[root].run.floors[1].slots.find(sl => sl.id === 'warband');
function reserve() { return world(original.state, original.raw); }
function actualArrival(s, { repeat = false, name = 'Actual warband chamber' } = {}) {
    const copy = json(s);
    copy.turn++;
    copy.last.outcome = { c: true, auth: { c: true, gos: [{ seq: 1, to: null }], timeCap: 120 }, expected_keys: { 1: 'go' } };
    const a = aheadEvents(copy, content, { into: true });
    for (const e of a.events) applyEvent(copy, e);
    const at = { new: { name, kind: 'interior', parent: root } };
    const deltas = repeat ? [{ ...original.raw.deltas.find(d => d.type === 'creature.new'), present: repeat !== 'distant' }] : [];
    return { before: copy, result: world(copy, { expected: { 1: { arrived: true, at, with: null } }, deltas }) };
}

test('reserved slot stays next; unresolved minions still block guardian', () => {
    const { state } = reserve(), d = state.dungeons[root];
    assert.equal(nextSlot(state, d, 1)?.id, 'warband');
    assert.equal(d.run.floors[1].cleared, null);
    // Existing guardian gate is still effective even after every minion has a real encounter location.
    for (const sl of d.run.floors[1].slots.filter(x => x.role === 'minion')) sl.at = state.scene.at;
    assert.equal(nextSlot(state, d, 1), null);
    state.places.lower = { id: 'lower', name: 'Lower', kind: 'interior', parent: root, level: 2 };
    d.floors[1].sealed = true;
    assert.ok(sealRefusal(state, 'lower'));
});

test('remote slot is known but not described as met; extractor keeps its canonical encounter', () => {
    const { state } = reserve(), d = state.dungeons[root];
    const text = floorText(state, d, 1);
    assert.match(text, /known, not met/);
    assert.doesNotMatch(text, /3 of 3 alive/);
    const a = aheadEvents(state, content, { into: true });
    assert.equal(a.events[0].d.ahead?.slot, 'warband');
    a.events.forEach(e => applyEvent(state, e));
    assert.ok(catalogLines(state, { extractor: true }).some(l => l.includes('ENGINE ENCOUNTER') && l.includes(slotOf(state).ref)));
});

for (const repeat of [false, true]) test(`reserved population meets once on real arrival, narrator supplies creatures=${repeat}`, () => {
    const reserved = reserve(), ids = [...slotOf(reserved.state).entities];
    assert.equal(ids.length, 3);
    assert.ok(ids.every(id => !reserved.state.scene.present.includes(id)));
    assert.equal(slotOf(reserved.state).at, null);
    assert.equal(slotOf(reserved.state).met_turn, undefined);
    const { before, result } = actualArrival(reserved.state, { repeat });
    assert.ok(ids.every(id => result.state.scene.present.includes(id)));
    assert.deepEqual(slotOf(result.state).entities, ids);
    assert.equal(result.events.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').length, 0);
    assert.equal(slotOf(result.state).met_turn, before.turn);
    assert.match(floorText(result.state, result.state.dungeons[root], 1), /3 of 3 alive/);
    const replay = json(before);
    for (const e of json(result.events)) applyEvent(replay, e);
    assert.deepEqual(json(replay), json(result.state));
    assert.deepEqual(validateState(replay, content), []);
    const again = world(json(result.state), { expected: {}, deltas: [{ ...original.raw.deltas[2], present: true }] });
    assert.equal(again.events.filter(e => e.t === 'entity.created').length, 0);
    assert.deepEqual(slotOf(again.state).entities, ids);
    // Resolve other minions as a deterministic precondition; our warband still blocks guardian.
    const d = again.state.dungeons[root];
    for (const sl of d.run.floors[1].slots.filter(x => x.role === 'minion' && x.id !== 'warband')) sl.entities.forEach(id => applyEvent(again.state, { t: 'entity.status', d: { id, status: 'dead' } }));
    assert.equal(nextSlot(again.state, d, 1), null);
    for (const id of ids) applyEvent(again.state, { t: 'entity.status', d: { id, status: 'dead' } });
    const guardian = nextSlot(again.state, d, 1);
    assert.equal((guardian?.slot || guardian)?.role, 'guard');
    const deaths = [], emit = e => { deaths.push(e); applyEvent(again.state, e); };
    syncEvents(again.state, content, emit);
    assert.equal(d.run.floors[1].cleared, null);
});

function receiving({ descriptor = 'granary keeper', occupation = null, typed = true } = {}) {
    const s = json(original.state);
    s.scene.at = 'shed'; s.places.shed = { id: 'shed', name: 'Receiving Shed', kind: 'interior' };
    s.scene.present = ['npc.odell']; s.entities['npc.odell'] = { id: 'npc.odell', kind: 'npc', name: 'Odell', descriptors: [descriptor], status: 'alive' };
    if (occupation !== null) setFactEvents(s, { s: 'npc.odell', p: 'occupation', o: occupation }).forEach(e => applyEvent(s, e));
    const o = { id: 'o1', verb: 'DELIVER', what: 'barley sacks', qty: 1, where: 'granary keeper at Receiving Shed',
        ...(typed ? { delivery: { v: 1, mode: 'give', recipient_kind: 'role', recipient: 'granary keeper', place: 'Receiving Shed' } } : {}) };
    const q = { id: 'quest.role', kind: 'guild_contract', status: 'active', objectives: [o], desired_end_state: 'Goods delivered', deliveries: [] };
    s.quests[q.id] = q;
    s.objects.cargo = { id: 'cargo', name: 'barley sacks', kind: 'item', qty: 1, holder: { entity: 'pc' }, for_quests: [q.id] };
    return { s, q, o };
}
for (const role of ['former granary keeper', 'not a granary keeper', 'friend of the granary keeper', 'retired granary keeper']) test(`typed receiver rejects historical/indirect role: ${role}`, () => {
    for (const occupation of [null, role]) {
        const { s, q, o } = receiving({ descriptor: role, occupation });
        assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), false);
    }
});
test('current occupation overrides stale descriptors and ends previous role, including replay', () => {
    const { s, q, o } = receiving({ occupation: 'granary keeper' }), events = [];
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), true);
    const before = json(s);
    for (const e of setFactEvents(s, { s: 'npc.odell', p: 'occupation', o: 'ferryman' })) { events.push(e); applyEvent(s, e); }
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), false);
    for (const e of json(events)) applyEvent(before, e);
    assert.equal(deliveryTarget(before, q, o, { entity: 'npc.odell' }), false);
});
test('role descriptor fallback, authoritative current role, names and legacy remain valid', () => {
    for (const args of [{}, { descriptor: 'retired granary keeper', occupation: 'granary keeper' }]) {
        const { s, q, o } = receiving(args);
        assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), true);
        const ev = [], emit = e => { ev.push(e); applyEvent(s, e); };
        transferCargo(s, content, emit, s.objects.cargo, { entity: 'npc.odell' }, 1, 1);
        assert.equal(ev.filter(e => e.t === 'quest.delivered').length, 1);
    }
    const { s, q, o } = receiving({ typed: false });
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), true, 'historical free-text matching is unchanged');
    o.delivery = { v: 1, mode: 'give', recipient_kind: 'name', recipient: 'Fenwick', place: 'Receiving Shed' };
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), false);
    o.delivery.recipient = 'Odell';
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), true, 'named contract is not a role contract');
});
test('an incidental later descriptor is not the NPC role', () => {
    const { s, q, o } = receiving({ descriptor: 'visitor' });
    s.entities['npc.odell'].descriptors.push('granary keeper');
    assert.equal(deliveryTarget(s, q, o, { entity: 'npc.odell' }), false);
});


test('repeated distant report on a new part defers first presence without skipping or duplication', () => {
    const initial = reserve(), ids = [...slotOf(initial.state).entities];
    const distant = actualArrival(initial.state, { repeat: 'distant' }).result;
    assert.ok(ids.every(id => !distant.state.scene.present.includes(id)));
    assert.equal(slotOf(distant.state).met_turn, undefined);
    assert.equal(nextSlot(distant.state, distant.state.dungeons[root], 1)?.id, 'warband');
    const met = actualArrival(distant.state, { name: 'Further warband chamber' }).result;
    assert.ok(ids.every(id => met.state.scene.present.includes(id)));
    assert.deepEqual(slotOf(met.state).entities, ids);
    assert.equal(met.events.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').length, 0);
});

for (const [floor, role] of [[1, 'guard'], [2, 'boss']]) test(`distant ${role} remains pending after previous threats are resolved`, () => {
    const s = json(original.state), d = s.dungeons[root], run = d.run.floors[floor];
    const head = run.slots.find(sl => sl.role === role);
    assert.ok(head);
    for (const sl of run.slots.filter(sl => sl.role === 'minion')) sl.taken = { party: 'party.test', minute: s.clock.minute };
    run.parts = 100;
    s.places.viewpoint = { id: 'viewpoint', name: 'Viewpoint', kind: 'interior', parent: root, level: floor };
    s.scene.at = 'viewpoint'; s.scene.present = [];
    const r = world(s, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref: head.ref, species: head.species, anchor: head.anchor, count: head.count, desc: [], present: false }] });
    assert.equal(nextSlot(r.state, r.state.dungeons[root], floor)?.id, head.id);
    assert.match(floorText(r.state, r.state.dungeons[root], floor), /known, not met/);
    assert.doesNotMatch(floorText(r.state, r.state.dungeons[root], floor), /met, alive/);
});

test('a newly introduced NPC role works through world events, physical transfer and replay', () => {
    const { s, q, o } = receiving();
    delete s.entities['npc.odell']; s.scene.present = [];
    const r = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'npc.new_keeper', name: 'Odell', role: 'granary keeper', desc: ['old spectacles'], present: true, relevant: false, threat: false }] }, { msg: 201, prose: 'Odell, the granary keeper, greets Alaric.' });
    const id = r.events.find(e => e.t === 'entity.created').d.entity.id;
    assert.equal(deliveryTarget(r.state, q, o, { entity: id }), true);
    const before = json(r.state), transfers = [];
    transferCargo(r.state, content, e => { transfers.push(e); applyEvent(r.state, e); }, r.state.objects.cargo, { entity: id }, 1, 1);
    assert.equal(transfers.filter(e => e.t === 'quest.delivered').length, 1);
    for (const e of json(transfers)) applyEvent(before, e);
    assert.deepEqual(before.quests[q.id].deliveries, r.state.quests[q.id].deliveries);
});
