import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { parseBoard } from '../../src/v4/guild.js';
import { applyWorld } from '../../src/v4/world.js';
import { deliveryTarget, deliveryStatus, transferCargo, deliveryWhere, genericRecipient } from '../../src/v4/delivery.js';

const content = await loadProductContent();
const base = (await campaign(content)).state();
const Q = 'quest.deliver_bandages_to_the_quarry_camp';
const recipient = 'Recipient at the Quarry Camp Infirmary';
const receiver = { entity: 'npc.marta' };
function scene({ interior = false, where = recipient, role = 'healer' } = {}) {
    const s = structuredClone(base);
    s.places.camp = { id: 'camp', name: 'Quarry Camp', kind: 'site', parent: s.scene.location };
    if (interior) s.places.infirmary = { id: 'infirmary', name: 'Quarry Camp Infirmary', kind: 'interior', parent: 'camp' };
    s.scene.at = interior ? 'infirmary' : 'camp';
    s.scene.present = [...new Set([...s.scene.present, 'npc.marta'])];
    s.entities['npc.marta'] = { id: 'npc.marta', kind: 'npc', name: 'Marta', status: 'alive',
        descriptors: [role], at: s.scene.at, location: s.scene.location };
    s.quests[Q] = { id: Q, title: 'Quarry bandages', kind: 'guild_contract',
        status: 'active', rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 20,
        task: 'Deliver the bandages.', desired_end_state: 'Bandages delivered to ' + where + '.',
        objectives: [{ id: 'o1', verb: 'DELIVER', what: 'bundle of linen bandages', qty: 1, unit: null, where }],
        deliveries: [], history: [], proof: [], progress: [] };
    s.objects.bandages = { id: 'bandages', kind: 'item', name: 'bundle of linen bandages', qty: 1,
        holder: { entity: 'pc' }, for_quests: [Q], marks: [] };
    return s;
}
const goal = s => s.quests[Q].objectives[0];
function give(s, object = 'bandages') {
    const events = [], emit = e => { events.push(e); applyEvent(s, e); };
    transferCargo(s, content, emit, s.objects[object], receiver, 1, 1);
    return events;
}
const obj = (verb, what, qty, where) => ({ verb, what, qty, unit: null, where });
const listing = (title, objectives) => ({ title, client: 'locals', rank: 'Novice', level: 1,
    qtype: 'minor', payout_cp: 30, task: null, desired_end_state: title, proof: [], objectives });
const board = to => [
    listing('Wolf pasture', [obj('DEFEAT', 'wolf', 1, 'the west pasture')]),
    listing('Road wolves', [obj('DEFEAT', 'wolf', 2, 'the old road')]),
    listing('Bandages', [obj('DELIVER', 'bundle of linen bandages', 1, to)]),
    listing('Ledger', [obj('DELIVER', 'sealed ledger', 1, 'Gretha at Thornhollow')]),
    listing('Clear Old Crown Catacombs', [obj('DEFEAT', 'skeletons', null, 'Old Crown Catacombs, level 1')]),
];
function parse(to) {
    const need = { branch: 'loc.alderwatch', rank: 'Novice', missing: 5, have: [], day: 1, c: true };
    return parseBoard(JSON.stringify({ listings: board(to) }), content, need, base);
}

test('Run11 board: rejects a generic recipient, permits a healer, named person or deposit', () => {
    for (const generic of ['Recipient', 'someone', 'anyone', 'staff', 'the person', 'representative', 'authorized person']) {
        assert.equal(genericRecipient(generic), true, generic);
        assert.ok(parse(generic + ' at Quarry Camp Infirmary').refused.some(x => x.title === 'Bandages'), generic);
    }
    assert.ok(parse('Healer at Quarry Camp Infirmary').listings?.some(x => x.title === 'Bandages'));
    assert.ok(parse('Marta at Quarry Camp Infirmary').listings?.some(x => x.title === 'Bandages'));
    assert.ok(parse('deposit at Receiving Shed').listings?.some(x => x.title === 'Bandages'));
    assert.equal(deliveryWhere('Healer at Quarry Camp Infirmary').place, 'Quarry Camp Infirmary');
});

test('Run11 E83: unknown interior is not the parent camp, even with a correct receiving role', () => {
    for (const where of [recipient, 'Healer at the Quarry Camp Infirmary']) {
        const s = scene({ where });
        assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), false);
        const events = give(s);
        assert.equal(events.filter(e => e.t === 'object.moved').length, 1, 'physical transfer remains');
        assert.equal(events.filter(e => e.t === 'quest.delivered').length, 0);
        assert.equal(s.objects.bandages.holder.entity, receiver.entity);
        assert.ok(deliveryStatus(s.quests[Q], s));
    }
});

test('Run11 E165: valid healer at known infirmary produces exactly one replayable receipt', () => {
    for (const where of [recipient, 'Healer at Quarry Camp Infirmary']) {
        const s = scene({ interior: true, where }), before = structuredClone(s);
        const events = give(s);
        assert.equal(events.filter(e => e.t === 'quest.delivered').length, 1);
        assert.equal(deliveryStatus(s.quests[Q], s), null);
        const replay = structuredClone(before);
        for (const e of JSON.parse(JSON.stringify(events))) applyEvent(replay, e);
        assert.deepEqual(replay.quests[Q].deliveries, s.quests[Q].deliveries);
        const loaded = JSON.parse(JSON.stringify(s));
        assert.equal(deliveryStatus(loaded.quests[Q], loaded), null);
        applyEvent(s, { t: 'quest.delivered', d: { id: Q, receipt: s.quests[Q].deliveries[0] } });
        assert.equal(s.quests[Q].deliveries.length, 1);
    }
});

test('Run11 destinations: composed parent/child valid, ambiguous or merely parent is not', () => {
    const s = scene({ interior: true, where: 'Healer at Quarry Camp Infirmary' });
    s.places.infirmary.name = 'Infirmary';
    assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), true);
    s.places.other = { id: 'other', name: 'Infirmary', kind: 'interior', parent: 'camp' };
    assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), false);
    delete s.places.other;
    s.scene.at = 'camp';
    assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver, s.scene.at), false);
});

test('Run11 receiver: visitors, wrong occupation, wrong name and non-medical institution are refused', () => {
    for (const role of ['visitor', 'miner', 'messenger']) {
        const s = scene({ interior: true, role });
        assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), false);
        assert.equal(give(s).filter(e => e.t === 'quest.delivered').length, 0);
    }
    const named = scene({ interior: true, where: 'Gretha at Quarry Camp Infirmary' });
    assert.equal(deliveryTarget(named, named.quests[Q], goal(named), receiver), false);
    const notMedical = scene({ interior: true, where: 'Recipient at Quarry Camp Workshop' });
    notMedical.places.infirmary.name = 'Quarry Camp Workshop';
    assert.equal(deliveryTarget(notMedical, notMedical.quests[Q], goal(notMedical), receiver), false);
});

test('Run11 provenance: a returned unit gives no second receipt, a second genuine unit does', () => {
    const s = scene({ interior: true, where: 'Healer at Quarry Camp Infirmary' });
    s.quests[Q].objectives[0].qty = 2;
    assert.equal(give(s).filter(e => e.t === 'quest.delivered').length, 1);
    assert.ok(deliveryStatus(s.quests[Q], s));
    applyEvent(s, { t: 'object.moved', d: { id: 'bandages', to: { entity: 'pc' } } });
    assert.equal(give(s).filter(e => e.t === 'quest.delivered').length, 0);
    s.objects.second = { ...structuredClone(s.objects.bandages), id: 'second', holder: { entity: 'pc' },
        delivery_origin: 'second', delivery_capacity: 1 };
    assert.equal(give(s, 'second').filter(e => e.t === 'quest.delivered').length, 1);
    assert.equal(deliveryStatus(s.quests[Q], s), null);
});

test('Run11 cargo: a lookalike cannot substitute for quest-bound physical goods', () => {
    const s = scene({ interior: true });
    s.objects.copy = { ...structuredClone(s.objects.bandages), id: 'copy', for_quests: [], holder: { entity: 'pc' } };
    assert.equal(give(s, 'copy').filter(e => e.t === 'quest.delivered').length, 0);
    assert.ok(deliveryStatus(s.quests[Q], s));
});

test('Run11 E158: person.named rejected, its unknown NPC fact cannot be saved', () => {
    const s = structuredClone(base);
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, resolutions: [] };
    const r = applyWorld(s, content, { expected: {}, deltas: [
        { seq: 1, type: 'person.named', who: 'npc.mara_clerk', name: 'Mara' },
        { seq: 2, type: 'fact', s: 'npc.mara_clerk', p: 'takes_contract_slip', o: 'yes' },
    ] }, { msg: 158, prose: 'Mara takes the Guild contract slip.' });
    assert.ok(r.rejected.some(x => x.rule === 'world_rule'));
    assert.ok(r.rejected.some(x => x.rule === 'entity_fact'));
    assert.ok(!r.events.some(e => e.t === 'fact.asserted' && e.d.fact?.s === 'npc.mara_clerk'));
    assert.ok(!validateState(r.state, content).some(e => /npc\.mara_clerk/.test(e)));
});

test('Run11 fact/learn: dangling reserved NPC and monster references are rejected', () => {
    for (const unknown of ['npc.absent', 'mon.absent']) {
        const s = structuredClone(base);
        const r = applyWorld(s, content, { expected: {}, deltas: [
            { seq: 1, type: 'fact', s: 'pc', p: 'saw', o: unknown },
            { seq: 2, type: 'learn', who: unknown, s: 'pc', p: 'heard', o: 'a road rumour', how: 'heard' },
            { seq: 3, type: 'learn', who: 'pc', s: unknown, p: 'heard', o: 'a road rumour', how: 'heard' },
        ] }, { msg: 159, prose: 'A traveller recalls a road rumour.' });
        assert.equal(r.rejected.filter(x => x.rule === 'entity_fact').length, 3, unknown);
        assert.ok(!r.events.some(e => e.t === 'fact.asserted' && e.d.fact?.o === unknown));
    }
});

test('Run11 references: existing NPC, known place and free lore are not blocked', () => {
    const s = scene({ interior: true });
    const r = applyWorld(s, content, { expected: {}, deltas: [
        { seq: 1, type: 'fact', s: 'npc.marta', p: 'occupation', o: 'healer' },
        { seq: 2, type: 'fact', s: 'infirmary', p: 'purpose', o: 'treats workers' },
        { seq: 3, type: 'fact', s: 'the west road', p: 'condition', o: 'muddy' },
    ] }, { msg: 160, prose: 'Marta works as healer at the Infirmary. The west road is muddy.' });
    assert.equal(r.rejected.filter(x => x.rule === 'entity_fact').length, 0);
    assert.ok(r.events.some(e => e.t === 'fact.asserted' && e.d.fact?.s === 'npc.marta'));
});

test('Run11 ruleset 1: legacy GIVE retains physical movement without new receipts', () => {
    const s = scene({ interior: true });
    s.meta.ruleset = 1;
    const events = give(s);
    assert.equal(events.filter(e => e.t === 'object.moved').length, 1);
    assert.equal(events.filter(e => e.t === 'quest.delivered').length, 0);
});

test('Run11 compatibility: old Quarry Camp healer Brenna target and receipt still work', () => {
    const s = scene({ where: 'Quarry Camp healer Brenna', role: 'healer' });
    s.entities['npc.marta'].name = 'Brenna';
    assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), true);
    const events = give(s);
    assert.equal(events.filter(e => e.t === 'quest.delivered').length, 1);
    assert.equal(deliveryStatus(s.quests[Q], s), null);
});

test('Run11 compatibility: old prose mentioning a chapel keeper hut is not canonical Role at Place', () => {
    const s = scene({ where: "chapel keeper's hut at the ruined chapel", role: 'chapel keeper' });
    s.places.camp.name = 'the ruined chapel';
    s.quests[Q].desired_end_state = 'Marta receives the bandages at the ruined chapel.';
    assert.equal(deliveryTarget(s, s.quests[Q], goal(s), receiver), true);
    const events = give(s);
    assert.equal(events.filter(e => e.t === 'quest.delivered').length, 1);
    assert.equal(deliveryStatus(s.quests[Q], s), null);
});
