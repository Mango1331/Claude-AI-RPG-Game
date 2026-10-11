// c.6.6.1: material Guild deliveries and interrupted long-distance travel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { firewall } from '../../src/v4/firewall.js';
import { seedPlaces } from '../../src/v4/domain.js';

const content = await loadContent();
const QID = 'quest.lighthouse_test';
const quest = () => ({
    id: QID, title: 'Letters to the Lighthouse Keeper', kind: 'guild_contract',
    status: 'active', payout_cp: 60, notes: [], details: [], proof: [],
    desired_end_state: 'The sealed satchel and oil requisition are delivered.',
    objectives: [
        { id: 'o1', verb: 'DELIVER', what: 'sealed satchel of harbor letters', qty: 1, status: 'open' },
        { id: 'o2', verb: 'GIVE', what: 'oil requisition slip', qty: 1, status: 'open' },
    ],
});
function setup() {
    const g = new Game(content);
    g.turn('Mage');
    g.turn('Flame Lance + Arcane Burst');
    const s = g.state;
    applyEvent(s, { t: 'quest.created', d: { quest: quest() } });
    for (const name of ['sealed satchel of harbor letters', 'oil requisition slip']) {
        applyEvent(s, { t: 'object.created', d: { object: {
            id: name.startsWith('sealed') ? 'obj.satchel' : 'obj.oil',
            name, kind: 'document', stack: false, qty: 1, unit: null,
            holder: { entity: 'pc' }, marks: [], for_quests: [QID], source: { how: 'story' },
        } } });
    }
    s.last = {
        input: '*I complete the delivery*', rejected: [],
        outcome: { kind: 'v4', auth: { c: true, gos: [], timeCap: 720, booked_min: 0 }, expected_keys: {} },
    };
    return s;
}
function ready(s) {
    return applyWorld(s, content, { expected: {}, deltas: [{
        seq: 1, type: 'quest.ready', quest: QID, note: 'Both items have arrived', alternative: null,
    }] }, { msg: 101, prose: 'The keeper thanks Alaric for the delivery.' });
}
test('firewall: a Guild contract slip is not the distinct oil requisition slip', () => {
    const ctx = { booked: { grants: ['contract slip'] }, contracts: [quest()] };
    const oil = { seq: 1, type: 'object.new', name: 'oil requisition slip', kind: 'document', qty: 1, unit: null, holder: 'npc.clerk', for_quest: QID };
    const duplicate = { ...oil, name: 'Guild contract slip: Letters to the Lighthouse Keeper' };
    assert.deepEqual(firewall([oil], ctx).reject, []);
    assert.equal(firewall([duplicate], ctx).reject[0].rule, 'engine_booked');
});
test('c.6.6.1: each physical delivery requires its own engine-booked transfer', () => {
    const s = setup();
    applyEvent(s, { t: 'object.moved', d: { id: 'obj.satchel', to: { entity: 'npc.keeper' } } });
    assert.equal(s.quests[QID].delivery_receipts.o1.object, 'obj.satchel');
    assert.equal(s.quests[QID].delivery_receipts.o2, undefined);
    const blocked = ready(s);
    assert.equal(blocked.state.quests[QID].ready, undefined);
    assert.ok(blocked.rejected.some((x) => x.rule === 'quest_delivery'));

    applyEvent(s, { t: 'object.moved', d: { id: 'obj.oil', to: { entity: 'npc.keeper' } } });
    const accepted = ready(s);
    assert.equal(accepted.state.quests[QID].ready, true);
    assert.ok(!accepted.rejected.some((x) => x.rule === 'quest_delivery'));
});
test('c.6.6.1: observing a distant destination does not leave Alaric at the origin after hours of travel', () => {
    const s = setup();
    // Game's lightweight unit harness has no V4 place tree; a real V4 campaign always seeds it.
    const location = content.locations.get('loc.tidecross');
    for (const place of seedPlaces(content, location, 'public roadside verge outside Tidecross').places) {
        applyEvent(s, { t: 'place.created', d: { place } });
    }
    applyEvent(s, { t: 'scene.moved', d: { at: 'loc.tidecross.guild_hall', location: 'loc.tidecross', place: "Adventurers' Guild hall, Tidecross", reset_present: true } });
    s.last.input = '*I set off for Gullspire Point lighthouse*';
    s.last.outcome.auth.gos = [{ seq: 1, to: null, name: 'Gullspire Point lighthouse', newName: 'Gullspire Point lighthouse' }];
    const x = applyWorld(s, content, {
        expected: { '1': { arrived: false } },
        deltas: [{ seq: 1, type: 'time', minutes: 210 }],
    }, { msg: 102, prose: 'After three and a half hours on the coast path the lighthouse comes into view beyond a blocked crossing.' });
    assert.equal(x.state.scene.at, 'realm.solmere', JSON.stringify({auth:s.last.outcome.auth, startAt:s.scene.at, timeUsed:x.state.clock.minute-s.clock.minute, events:x.events.filter((e)=>/time.advanced|scene.moved|delta.rejected/.test(e.t)), realm:s.places['loc.tidecross.guild_hall']?.realm, city:s.places['loc.tidecross'], realmPlace:s.places['realm.solmere'], scene:s.scene.location, cityKeys:Object.keys(s.places).slice(0,12)}));
    assert.match(x.state.scene.place, /On the way to Gullspire Point lighthouse/);
    assert.ok(!x.state.scene.present.some((id) => id !== 'pc'));
    assert.ok(!x.events.some((e) => e.t === 'scene.moved' && e.d.at === 'loc.gullspire_point_lighthouse'));
});
