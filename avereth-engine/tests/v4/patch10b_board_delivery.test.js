import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { parseBoard, boardRequest, contractReady } from '../../src/v4/guild.js';
import { applyEvent } from '../../src/state.js';
import { deliveryStatus } from '../../src/v4/delivery.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';

const content = await loadProductContent();
const base = (await campaign(content)).state();
const original = JSON.parse(fs.readFileSync(new URL('./fixtures/run10_satchel.json', import.meta.url)));
const need = { branch: 'loc.alderwatch', rank: 'Novice', missing: 5, have: [], day: 1, c: true };
const obj = (verb, what, qty, where) => ({ verb, what, qty, unit: null, where });
const listing = (title, objectives, more = {}) => ({ title, client: 'local residents', task: null, rank: 'Novice', level: 1, qtype: 'minor', payout_cp: 30, desired_end_state: title, objectives, proof: [], ...more });
const hunt = (name, qty = 1) => listing(name, [obj('DEFEAT', 'feral wolf', qty, 'the west pasture')]);
const delivery = name => listing(name, [obj('DELIVER', 'sealed medicine parcel', 1, 'Gretha at Thornhollow')]);
const dungeon = () => listing('Clear Old Crown Catacombs', [obj('DEFEAT', 'restless skeletons', null, 'Old Crown Catacombs, level 1')], { task: 'Clear level 1 of Old Crown Catacombs. Danger: groups of foes; solo entry is risky.' });
const board = () => [hunt('Wolf at pasture'), hunt('Beasts near mill', 2), delivery('Medicines'), delivery('Ledger'), dungeon()];
const parse = (listings, s = base, n = need) => parseBoard(JSON.stringify({ listings }), content, n, s);

test('board: reject an escort in the new automatic board, retain a valid five-listing fallback', () => {
    assert.equal(parse(board()).listings.length, 5);
    const s = structuredClone(base);
    for (const p of Object.values(s.places)) delete p.dungeon;
    const fallback = board(); fallback[4] = hunt('Road beast', 2);
    assert.equal(parse(fallback, s).listings.length, 5);
    const b = board(); b[2] = listing('Escort a wagon', [obj('ESCORT', 'wagon', 1, 'Millbrook')]);
    assert.ok(parse(b).refused.some(r => /escort|board|delivery/i.test(r.why)));
});
test('board: reject duplicate DELIVER/GIVE, physical proof and unsupported delivery destinations before publishing', () => {
    for (const change of [
        l => l.objectives.push(obj('GIVE', 'the parcel', 1, 'Gretha at Thornhollow')),
        l => l.proof.push({ kind: 'object', what: 'signed receipt', qty: 1, unit: null, on: null, consume: false }),
        l => l.objectives[0].where = 'somewhere',
    ]) {
        const b = board(); change(b[2]); assert.ok(parse(b).refused.length, JSON.stringify(b[2]));
    }
});
test('board: exact family counts and an introductory single-foe option are validated', () => {
    let b = board(); b[2] = hunt('Another hunt'); assert.ok(parse(b).errors.length || parse(b).refused.length);
    b = board(); b[0].objectives[0].qty = 3; assert.ok(parse(b).errors.length || parse(b).refused.length);
});
test('board: extra rejected listings cannot bypass the family counts', () => {
    const b = board(); b[2] = hunt('Excess hunt');
    b.push(listing('Escort distraction', [obj('ESCORT', 'cart', 1, 'River Ford')]));
    assert.ok(parse(b).errors.length);
});
test('board: delivery contract text is derived from its sole objective, without extra duties', () => {
    const b = board(); b[2].task = 'Deliver it and return the empty box with a signature.';
    b[2].desired_end_state = 'Delivery plus returned empty box.';
    const l = parse(b).listings.find(l => l.title === 'Medicines');
    assert.ok(l); assert.doesNotMatch(`${l.task} ${l.desired_end_state}`, /return|signature/i);
    assert.match(l.task, /Gretha at Thornhollow/);
});
test('board: generator requests the fixed families and preserves free choice', () => {
    const req = boardRequest(base, content, need);
    assert.match(req.system, /2.*deliver|deliver.*2/i);
    assert.match(req.system, /single|one foe/i);
    assert.match(req.system, /no.*escort|escort.*not/i);
});
test('board: a partial refill counts the existing notices and preserves the beginner option', () => {
    const s = structuredClone(base), bs = board();
    for (const [i, q] of bs.slice(0, 4).entries()) s.quests[`existing${i}`] = { ...q, status: 'listed', source: { branch: need.branch } };
    const n = { ...need, missing: 1, have: bs.slice(0, 4).map(q => q.title) };
    assert.equal(parse([bs[4]], s, n).listings.length, 1);
    assert.ok(parse([hunt('Wrong replacement')], s, n).errors.length);
});
test('board: Legacy still accepts escort listings; spontaneous private escorts remain possible', () => {
    const escort = listing('Escort the wagon', [obj('ESCORT', 'wagon', 1, 'River Ford')]);
    const s = structuredClone(base); s.meta.ruleset = 1;
    assert.equal(parse([escort], s, { ...need, missing: 1 }).listings.length, 1);
    s.meta.ruleset = 2;
    s.entities['npc.driver'] = { id: 'npc.driver', kind: 'npc', name: 'Driver', descriptors: ['driver'], status: 'alive', at: s.scene.at };
    s.scene.present.push('npc.driver'); s.last.outcome = { c: true, auth: { c: true } };
    const r = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'quest.offer', giver: 'npc.driver', title: 'Escort my wagon', reward_cp: 10, objectives: ['Escort the wagon safely to River Ford'], proof: [] }] }, { prose: 'The driver offers ten copper to escort his wagon safely to River Ford.' });
    assert.ok(Object.values(r.state.quests).some(q => q.kind === 'private' && q.title === 'Escort my wagon'));
});
test('board: Dungeon notice has an authoritative level-clear outcome and risk warning', () => {
    const b = board(); b[4].task = 'Clear the place, then fetch a signature.';
    const l = parse(b).listings.find(l => /Catacombs/.test(l.title));
    assert.match(l.task, /Risk: groups/); assert.equal(l.desired_end_state, 'Level 1 of Old Crown Catacombs is clear.');
    assert.doesNotMatch(l.task, /signature/);
    b[4].objectives[0].where = 'Old Crown Catacombs, level 2';
    assert.ok(parse(b).refused.length, 'E-rank level remains unavailable on a Novice board');
});

function delivered() {
    const s = structuredClone(base), f = structuredClone(original);
    Object.assign(s.places, f.places); s.scene = f.scene;
    s.entities[f.recipient.id] = f.recipient; s.objects[f.object.id] = f.object; s.quests[f.quest.id] = f.quest;
    return s;
}
test('delivery: Run 10 original recorded handover satisfies its redundant DELIVER/GIVE, including at the Guild', () => {
    const s = delivered(), q = s.quests[original.quest.id];
    assert.equal(deliveryStatus(q, s), null);
    s.scene.at = 'loc.alderwatch.guild_hall'; s.scene.present = ['pc'];
    assert.equal(contractReady(s, content, q, { c: true }).ok, true);
    const events = [], emit = e => { events.push(e); applyEvent(s, e); };
    resolveCommands(s, content, [{ seq: 1, type: 'quest.turn_in', quest: q.id, quote: 'I turn in the completed delivery.' }], emit, { c: true, msg: 900 });
    const money = s.entities.pc.sheet.coin_cp;
    resolveCommands(s, content, [{ seq: 1, type: 'quest.turn_in', quest: q.id, quote: 'I turn it in again.' }], emit, { c: true, msg: 901 });
    assert.equal(s.entities.pc.sheet.coin_cp, money);
    assert.equal(q.deliveries.length, 1, 'no duplicate receipt or capacity credit');
    assert.equal(events.filter(e => e.t === 'transaction.completed').length, 1);
});
test('delivery: receipt aliasing never covers another good, recipient, quantity, place or repeated DELIVER', () => {
    for (const change of [
        o => o.what = 'sealed surgical tools', o => o.where = 'Brenna at Other Camp',
        o => o.qty = 2, o => o.where = 'Gretha at Other Camp', o => o.verb = 'DELIVER',
    ]) {
        const s = delivered(), q = s.quests[original.quest.id]; change(q.objectives[1]);
        assert.equal(contractReady(s, content, q, { c: true }).ok, false);
    }
});
test('delivery: original receipt remains sufficient after JSON reload and event replay', () => {
    const s = delivered(), q = s.quests[original.quest.id]; const loaded = JSON.parse(JSON.stringify(s));
    assert.equal(contractReady(loaded, content, loaded.quests[q.id], { c: true }).ok, true);
    const receipt = q.deliveries[0]; delete q.deliveries;
    const e = { t: 'quest.delivered', d: { id: q.id, receipt } };
    applyEvent(s, e); applyEvent(s, JSON.parse(JSON.stringify(e)));
    assert.equal(q.deliveries.length, 1); assert.equal(contractReady(s, content, q, { c: true }).ok, true);
});
test('delivery: a new real handover proves both legacy descriptions but returning the unit gives no extra credit', () => {
    const s = delivered(), q = s.quests[original.quest.id], x = s.objects[original.object.id];
    q.deliveries = []; x.holder = { entity: 'pc' };
    assert.equal(contractReady(s, content, q, { c: true }).ok, false);
    const command = { seq: 1, type: 'give', object: x.id, qty: 1, to: 'npc.gretha', quote: 'I give Gretha the satchel.' };
    const give = () => resolveCommands(s, content, [command], e => applyEvent(s, e), { c: true, msg: 900 });
    give(); assert.equal(contractReady(s, content, q, { c: true }).ok, true);
    applyEvent(s, { t: 'object.moved', d: { id: x.id, to: { entity: 'pc' } } });
    give(); assert.equal(q.deliveries.length, 1); assert.equal(q.deliveries[0].qty, 1);
});
test('delivery: a generated deposit contract works only at its named existing place, without furniture or signatures', () => {
    for (const valid of [false, true]) {
        const s = delivered(), q = s.quests[original.quest.id], x = s.objects[original.object.id];
        const bs = board(); bs[2].objectives[0].what = x.name; bs[2].objectives[0].where = 'deposit at Receiving Shed';
        const l = parse(bs).listings.find(l => l.title === 'Medicines');
        Object.assign(q, { task: l.task, desired_end_state: l.desired_end_state, objectives: l.objectives.map(o => ({ ...o, id: 'o1' })), deliveries: [] });
        s.places.shed = { id: 'shed', name: 'Receiving Shed', kind: 'site', parent: 'loc.thornhollow' };
        x.holder = { entity: 'pc' }; if (valid) s.scene.at = 'shed';
        resolveCommands(s, content, [{ seq: 1, type: 'drop', object: x.id, qty: 1, quote: 'I deposit the satchel here.' }], e => applyEvent(s, e), { c: true, msg: 901 });
        assert.equal(contractReady(s, content, q, { c: true }).ok, valid);
        assert.equal(q.deliveries.length, valid ? 1 : 0);
    }
});
