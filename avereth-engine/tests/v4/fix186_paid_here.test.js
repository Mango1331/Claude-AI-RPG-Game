// Build .186 package 1 – PAID HERE attribution (patch_plans_10b/REVIEW_STABILIZATION_185_PRODUKTDIFF_GPT.md §3 R1):
// .185's paidLodging gave every bed service of a seller here the last accepted lodging offer of that seller, so two
// nights bought apart (3 cp, then 5 cp) were both "another night … 5 cp" for narrator, planner and extractor. A granted
// service now carries its own offer and line, fixed when the event folds (src/v4/domain.js; from the offer it was sold
// under, still open then). The events are unchanged, so old chats get it on their next fold; a service whose line the
// fold cannot tell apart keeps none, and PAID HERE then names neither a price nor a service text.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, lastUser } from './patch8_lib.js';
import { foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { buildContext } from '../../src/context.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { paidLodging, paidAgainWhy } from '../../src/v4/trade.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const WREN = { seq: 1, type: 'person.new', ref: 'wren', name: 'Wren', role: 'innkeeper', desc: ['wiry innkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const LINE = (what, price_cp, said, more = {}) => ({ what, kind: 'goods', service: null, qty: 1, price_cp, said, effect: null, teaches: null, equipment: false,
    phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: null }, ...more });
const ROOM = (price, said, what) => LINE(what, price, said, { kind: 'service', service: 'lodging' });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const wren = (g) => Object.keys(g.state().entities).find((id) => g.state().entities[id].name === 'Wren');
const open = (g, pred = () => true) => Object.values(g.state().offers).filter((o) => o.status === 'open' && pred(o));
const accept = (g, offer, lines, cp, quote) => say(g, quote, { type: 'offer.accept', offer: offer.id, lines, qty: null, party_words: null, agreed_cp: cp, quote,
    price_evidence: { basis: 'total', quote: quote.match(/(\w+ copper)/)[1], currency_quote: null } });
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}
async function inn(lines) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the inn*', at: { new: { name: 'The Hearthstone', kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [WREN, { seq: 2, type: 'offer', seller: 'wren', lines }], prose: `He goes in. Wren looks up. ${lines.map((l) => `"${l.what}, ${l.said}."`).join(' ')}` });
    return g;
}
/** Two nights bought apart from Wren: the small room (3 cp), then another night (5 cp). */
async function twoNights() {
    const g = await inn([ROOM(3, 'three copper', 'a small room for the night')]);
    await accept(g, open(g)[0], ['l1'], 3, 'I take the room, three copper.');
    await g.reply('Wren takes the coppers.', { expected: {}, deltas: [] });
    await g.reply('"Another night is five copper," Wren says.', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [ROOM(5, 'five copper', 'another night in the room')] }] });
    await accept(g, open(g)[0], ['l1'], 5, 'Another night, then: five copper.');
    await g.reply('Wren nods.', { expected: {}, deltas: [] });
    return g;
}

test('.186 P1 (GPT .185 R1): two nights bought apart are PAID HERE each with its own price and words (.185: both "another night … 5 cp")', async () => {
    const g = await twoNights();
    const paid = paidLodging(g.state()).map((p) => `${p.what} ${p.cp}`);
    assert.deepEqual(paid, ['a small room for the night 3', 'another night in the room 5']);
    const text = buildContext(g.state(), content, { input: 'x', outcome: { c: true }, budget: 8000 }).text;
    assert.match(text, /PAID HERE \(booked by the engine\): a small room for the night, 3 cp to Wren · another night in the room, 5 cp to Wren\./);
    assert.match(catalogText(buildCatalog(g.state(), content, { c: true })), /PAID HERE: a small room for the night, 3 cp to [^·]*· another night in the room, 5 cp to /);
    const again = reloaded(g);
    assert.deepEqual(paidLodging(again).map((p) => `${p.what} ${p.cp}`), paid, 'the same after reload');
    const svc = again.services.filter((x) => x.service === 'lodging');
    assert.deepEqual(svc.map((x) => [x.offer, x.line]), [[Object.values(again.offers)[0].id, 'l1'], [Object.values(again.offers).at(-1).id, 'l1']]);
});

test('.186 P1: one offer with two bed lines (two rooms) bought together gives each service its own line', async () => {
    const g = await inn([ROOM(3, 'three copper for the small room', 'the small room'), ROOM(4, 'four copper for the attic room', 'the attic room')]);
    const before = coin(g);
    await say(g, 'I take both rooms.', { type: 'offer.accept', offer: open(g)[0].id, lines: ['l1', 'l2'], qty: null, party_words: null, agreed_cp: null, quote: 'I take both rooms.', price_evidence: null });
    assert.equal(coin(g), before - 7);
    assert.deepEqual(paidLodging(g.state()).map((p) => `${p.what} ${p.cp} ${p.line}`), ['the small room 3 l1', 'the attic room 4 l2']);
    reloaded(g);
});

test('.186 P1 against: a service the fold cannot tell apart (an old state, or two open lines with the same words) names no price and no service text', () => {
    const s = { turn: 3, clock: { minute: 600 }, scene: { at: 'loc.inn' }, services: [{ service: 'lodging', by: 'npc.wren', at: 'loc.inn', turn: 3, minute: 590 }],
        offers: { 'offer.t2.1': { id: 'offer.t2.1', seller: 'npc.wren', at: 'loc.inn', status: 'accepted', lines: [{ id: 'l1', what: 'a room', kind: 'service', service: 'lodging', price_cp: 3 }] } } };
    assert.deepEqual(paidLodging(s), [{ by: 'npc.wren', what: null, cp: null, minute: 590, offer: null, line: null }], 'an old service without its line: no price taken from an offer');
    const fold = { ...structuredClone(s), services: [], offers: {
        'offer.t2.1': { id: 'offer.t2.1', seller: 'npc.wren', at: 'loc.inn', status: 'open', lines: [{ id: 'l1', what: 'a room', kind: 'service', service: 'lodging', price_cp: 3 }] },
        'offer.t2.2': { id: 'offer.t2.2', seller: 'npc.wren', at: 'loc.inn', status: 'open', lines: [{ id: 'l1', what: 'a room', kind: 'service', service: 'lodging', price_cp: 5 }] } } };
    applyEvent(fold, { t: 'service.granted', d: { service: 'lodging', what: 'a room', by: 'npc.wren', at: 'loc.inn', turn: 3 } });
    assert.equal(fold.services[0].offer, undefined, 'two open offers with the same line: none chosen');
    assert.deepEqual(paidLodging(fold).map((p) => [p.what, p.cp]), [[null, null]]);
});

test('.186 P1 against: the double-booking guard of .185 keeps working with the attributed services, also for an unattributed one', async () => {
    const g = await twoNights();
    const s = g.state();
    const offer = { seller: wren(g) };
    const picks = [{ line: { what: 'stew and bread', kind: 'goods' }, units: 1 }, { line: { what: 'the room', kind: 'service', service: 'lodging' }, units: 1 }];
    assert.match(paidAgainWhy(s, offer, picks), /^another night in the room is paid already \(5 cp, booked by the engine\): this purchase of stew and bread, the room takes it in again/);
    const old = structuredClone(s);
    for (const x of old.services) { delete x.offer; delete x.line; }
    assert.match(paidAgainWhy(old, offer, picks), /^a bed here is paid already \(booked by the engine\): this purchase of stew and bread, the room takes it in again/);
    assert.equal(paidAgainWhy(s, offer, [picks[1]]), null, 'a bed alone stays a purchase');
});
