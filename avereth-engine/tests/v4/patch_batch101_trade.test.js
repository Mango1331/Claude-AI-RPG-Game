import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { bookSale } from '../../src/v4/trade.js';
import { applyEvent } from '../../src/state.js';
const content = await loadProductContent();
const f = JSON.parse(fs.readFileSync(new URL('./fixtures/run22_prebatch.json', import.meta.url)));
const base = () => { const s = applyWorld(structuredClone(f.purchase.state), content, structuredClone(f.purchase.answers[0]), { msg: f.purchase.i, prose: f.purchase.prose }).state; s.offers = {}; return s; };
const buyer = 'npc.npclodging_clerk', object = 'obj.loot.bog_strider.chitin.f';
const turn = (s, commands) => playerTurnV4(s, content, 'I sell this chitin for at least five copper.', { c: true, msg: 500, commands }).state;
const sell = { seq: 1, type: 'sell', object, qty: 1, to: buyer, min_cp: 5 };
const bid = (cp, at) => ({ seq: 1, type: 'bid', buyer, lines: [{ object, qty: 1 }], price_cp: cp, said: `I will pay ${cp} copper for this plate.`, scene: at });
for (const mode of ['too cheap', 'absent buyer', 'no bid']) test(`101 sale: Expected cannot pay with ${mode}`, () => {
    const s = turn(base(), [sell]);
    const deltas = mode === 'too cheap' ? [bid(3, s.scene.at)] : mode === 'absent buyer' ? [{ seq: 1, type: 'leave', who: buyer, scene: s.scene.at }] : [];
    const r = applyWorld(s, content, { scene: s.scene.at, expected: { 1: { sold: true, price_cp: 5 } }, deltas }, { prose: 'The clerk offers three copper, then leaves without buying.', msg: 501 });
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp);
    assert.equal(r.state.objects[object].qty, s.objects[object].qty);
    assert.ok(!r.events.some(e => e.t === 'transaction.completed'));
});
test('101 sale: a matching current bid commits once at its actual price and survives replay', () => {
    const s = turn(base(), [sell]);
    const r = applyWorld(s, content, { scene: s.scene.at, expected: { 1: { sold: true, price_cp: 5 } }, deltas: [bid(7, s.scene.at), { seq: 2, type: 'leave', who: buyer, scene: s.scene.at }] }, { msg: 501, prose: 'The clerk pays seven copper, then leaves.' });
    assert.equal(r.state.entities.pc.sheet.coin_cp, s.entities.pc.sheet.coin_cp + 7);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1);
    const replay = structuredClone(s); for (const e of JSON.parse(JSON.stringify(r.events))) applyEvent(replay, e); assert.deepEqual(replay, r.state);
});
for (const mode of ['missing second item', 'duplicate item', 'absent buyer']) test(`101 shared sale preflight: ${mode} emits nothing`, () => {
    const s = base(), events = [], before = structuredClone(s);
    const items = [{ ref: object, units: 1, splitId: 'obj.split' }];
    if (mode === 'missing second item') items.push({ ref: 'obj.absent', units: 1 });
    if (mode === 'duplicate item') items.push({ ...items[0] });
    const r = bookSale(s, e => { events.push(e); applyEvent(s, e); }, { items, buyer: mode === 'absent buyer' ? 'npc.absent' : buyer, cp: 5, what: 'lot' });
    assert.ok(r?.error); assert.equal(events.length, 0); assert.deepEqual(s, before);
});
test('101 trade consent: a previous-turn room limit cannot buy a new offer', () => {
    const s = structuredClone(f.purchase.state); for (const d of s.decisions) if (d.kind === 'purchase') d.turn = s.turn - 1;
    const r = applyWorld(s, content, structuredClone(f.purchase.answers[0]), { msg: 502, prose: f.purchase.prose });
    assert.ok(!r.events.some(e => e.t === 'transaction.completed'));
    assert.ok(!r.state.decisions.some(d => d.kind === 'purchase'));
});

function destinationTrade({ price = 6, arrive = true, ambiguous = false } = {}) {
    const s = base(), at = 'loc.alderwatch.test_inn';
    s.places[at] = { id: at, name: 'Test Inn', kind: 'site', parent: 'loc.alderwatch', realm: 'realm.valedorn_crown', tags: [] };
    const t = turn(s, [{ seq: 1, type: 'go', to: at }, { seq: 2, type: 'buy', what: 'a corner room', from: ambiguous ? null : buyer, max_cp: 10 }]);
    const offer = (seller, seq) => ({ seq, type: 'offer', seller, scene: at, lines: [{ what: 'a corner room', kind: 'service', service: 'lodging', qty: 1, price_cp: price, said: `A corner room costs ${price} copper.`, equipment: false }] });
    const deltas = arrive ? [{ seq: 1, type: 'arrive', at, with: [], forced_by: null }, { seq: 2, type: 'enter', who: buyer, scene: at }, offer(buyer, 3)] : [offer(buyer, 3)];
    if (ambiguous) deltas.push({ seq: 4, type: 'person.new', ref: 'second_clerk', name: 'Nella', role: 'innkeeper', desc: [], at, present: true, relevant: true, scene: at }, offer('second_clerk', 5));
    const r = applyWorld(t, content, { scene: at, expected: { 1: { arrived: arrive, at: arrive ? at : null, with: [] }, 2: { priced: true, taken_anyway: false } }, deltas }, { msg: 502, prose: `The innkeeper offers a corner room for ${price} copper.` });
    return { t, r };
}
test('101 destination purchase: GO then room within limit buys once after actual arrival', () => {
    const { t, r } = destinationTrade(); assert.equal(r.state.entities.pc.sheet.coin_cp, t.entities.pc.sheet.coin_cp - 6);
    assert.equal(r.events.filter(e => e.t === 'transaction.completed').length, 1); assert.equal(r.events.filter(e => e.t === 'service.granted').length, 1);
});
for (const [name, opts] of [['no arrival', { arrive: false }], ['too costly', { price: 11 }], ['ambiguous seller', { ambiguous: true }]]) {
    test(`101 destination purchase: ${name} never charges`, () => {
        const { t, r } = destinationTrade(opts); assert.equal(r.state.entities.pc.sheet.coin_cp, t.entities.pc.sheet.coin_cp);
        assert.ok(!r.events.some(e => e.t === 'transaction.completed'));
    });
}
