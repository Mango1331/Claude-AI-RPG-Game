// Build .142 – finance consolidation, the short trade integration of the acceptance (PATCH_PAYMENT_CONSOLIDATION.md §10
// step 4): played through the product's host path (tests/v4/patch8_lib.js: planner → narrator reply → extractor, each
// record stored on its chat message) up to the stored record, then reloaded by folding the chat. Fresh answers in the
// finance contract (cmd-1.8 / delta-1.13): a clear transaction, a false pay report, a conditional offer, a gift beside a
// sale and the same acceptance twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf, lastUser, inject } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const KEEPER = { seq: 1, type: 'person.new', ref: 'keeper', name: 'Odo', role: 'shopkeeper', desc: ['lean shopkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const LINE = (what, price_cp, said, more = {}) => ({ what, kind: 'goods', service: null, qty: 1, price_cp, said, effect: null, teaches: null, equipment: false,
    phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: null }, ...more });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const ODO = (g) => Object.keys(g.state().entities).find((id) => g.state().entities[id].name === 'Odo');
const statuses = (g) => outcomeOf(g).resolutions.map((r) => [r.type, r.status]);
const open = (g, pred = () => true) => Object.values(g.state().offers).filter((o) => o.status === 'open' && pred(o));
/** Alaric at Odo's shop; the reply offers `lines` (none: no offer). */
async function shop(lines = []) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const prose = `He goes in. Odo looks up from the counter. ${lines.map((l) => `"${l.what}, ${l.said}."`).join(' ')}`;
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the shop*', at: { new: { name: "Odo's Sundries", kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [KEEPER, ...(lines.length ? [{ seq: 2, type: 'offer', seller: 'keeper', lines }] : [])], prose });
    return g;
}
/** The chat reloaded from its stored records: the same state, valid. */
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}

test('.142 host: a clear purchase is booked at once and stays booked after reload', async () => {
    const g = await shop([LINE('a torch', 2, 'two copper')]);
    const before = coin(g);
    const offer = open(g)[0];
    assert.equal(offer.lines[0].terms, 'firm');
    await say(g, 'I buy the torch for two copper.', { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: 2, quote: 'I buy the torch for two copper.', price_evidence: { basis: 'total', quote: 'two copper', currency_quote: null } });
    assert.deepEqual(statuses(g), [['offer.accept', 'resolved']]);
    assert.equal(coin(g), before - 2);
    assert.ok(rec(g.chat.findLast((m) => m.is_user)).events.some((e) => e.t === 'transaction.completed' && e.d.cp === 2));
    assert.equal(reloaded(g).entities.pc.sheet.coin_cp, before - 2);
});

test('.142 host: a false pay report beside a goods price moves no coin; the open decision is stored', async () => {
    const g = await shop();
    const before = coin(g);
    await say(g, 'I give Odo my spare rope for five copper.', { type: 'pay', to: ODO(g), amount_cp: 5, for: null, quote: 'I give Odo my spare rope for five copper.', money: { quote: 'five copper', currency_quote: null }, recipient_quote: 'Odo', confirmation: null });
    assert.equal(coin(g), before);
    assert.deepEqual(statuses(g), [['pay', 'pending']]);
    const r = lastUser(g);
    assert.ok(!r.events.some((e) => e.t === 'coin.changed' || e.t === 'transaction.completed'));
    assert.ok(r.events.some((e) => e.t === 'decision.opened' && e.d.decision.kind === 'payment'));
    assert.equal(reloaded(g).entities.pc.sheet.coin_cp, before);
});

test('.142 host: a conditional offer is stored but cannot be bought; a later firm offer can', async () => {
    const g = await shop([LINE('a lantern', 8, 'eight copper, once my apprentice finds one', { phase: 'conditional', condition: 'the apprentice finds one', pricing: { basis: 'total', quote: 'eight copper', currency_quote: null } })]);
    const before = coin(g);
    const offer = open(g)[0];
    assert.equal(offer.lines[0].terms, 'conditional');
    // not a buyable position in the planner's catalog (§6.1): his "I buy the lantern" is a purchase wish, nothing is paid
    await say(g, 'I buy the lantern.', { type: 'buy', what: 'a lantern', from: ODO(g), qty: null, max_cp: null, any_price: false, quote: 'I buy the lantern.', price_evidence: null });
    assert.deepEqual(statuses(g), [['buy', 'refused']]);
    assert.match(outcomeOf(g).actions[0], /NOT AGREED — a lantern: the price is conditional \(the apprentice finds one\)/);
    assert.equal(coin(g), before);
    await g.reply('Odo shrugs.', { expected: {}, deltas: [] });
    await g.reply('The apprentice comes back with a lantern. "Eight copper," Odo says.', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: ODO(g), lines: [LINE('a lantern', 8, 'Eight copper')] }] });
    const firm = open(g, (o) => o.lines.some((l) => l.terms === 'firm'))[0];
    await say(g, 'I buy the lantern.', { type: 'offer.accept', offer: firm.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: null, quote: 'I buy the lantern.', price_evidence: null });
    assert.equal(coin(g), before - 8);
    reloaded(g);
});

test('.142 host: a sale through its bid pays once; a thanks beside it pays, the narrated proceeds do not; the same acceptance twice sells once', async () => {
    const g = await shop();
    // a wolf pelt of his (the precondition, as an engine event at the end of the last record)
    inject(g, [{ t: 'object.created', d: { object: { id: 'obj.test.pelt', name: 'wolf pelt', kind: 'resource', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [], source: { how: 'test' } } } }]);
    const item = 'obj.test.pelt';
    const before = coin(g);
    await g.reply('Odo turns it over. "Six copper for it," he says.', { expected: {}, deltas: [{ seq: 1, type: 'bid', buyer: ODO(g), lines: [{ object: item, qty: 1 }], price_cp: 6, said: 'Six copper for it',
        phase: 'firm', condition: null, pricing: { basis: 'total', quote: 'Six copper', currency_quote: null } }] });
    const bid = open(g, (o) => o.bid)[0];
    assert.ok(bid, 'the bid is stored');
    assert.equal(bid.terms, 'firm');
    await say(g, 'Done, I sell it to you for six copper.', { type: 'offer.accept', offer: bid.id, lines: null, qty: null, party_words: null, agreed_cp: 6, quote: 'Done, I sell it to you for six copper.', price_evidence: { basis: 'total', quote: 'six copper', currency_quote: null } });
    assert.equal(coin(g), before + 6);
    // the reply tells the coin counted out (the proceeds) and a separate copper as thanks
    await g.reply('Odo counts six copper onto the counter, then slides one more across. "And a copper for the good condition."', { expected: {}, deltas: [
        { seq: 1, type: 'coin.gift', from: ODO(g), cp: 6, why: 'payment for the item', said: 'Odo counts six copper onto the counter', repeat_of: null, phase: 'transferred', relation: 'trade_settlement', money: { quote: 'six copper', currency_quote: null } },
        { seq: 2, type: 'coin.gift', from: ODO(g), cp: 1, why: 'thanks for the good condition', said: 'And a copper for the good condition', repeat_of: null, phase: 'transferred', relation: 'independent', money: { quote: 'a copper', currency_quote: null } },
    ] });
    assert.equal(coin(g), before + 7, 'the sale once, the thanks once');
    await say(g, 'Done, I sell it to you for six copper.', { type: 'offer.accept', offer: bid.id, lines: null, qty: null, party_words: null, agreed_cp: 6, quote: 'Done, I sell it to you for six copper.', price_evidence: { basis: 'total', quote: 'six copper', currency_quote: null } });
    assert.equal(coin(g), before + 7, 'the same acceptance again sells nothing');
    assert.equal(reloaded(g).entities.pc.sheet.coin_cp, before + 7);
});
