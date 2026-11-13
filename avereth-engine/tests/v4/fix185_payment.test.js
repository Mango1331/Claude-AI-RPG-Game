// Build .185 – payment and offers after the natural batch of 13.11.2026 (recherche/PAYMENT_TIEFENANALYSE_183.md §2, §6
// Z1–Z3; GPT Gegenreview: Z1.1/Z1.3 GO, Z2 with E-1 yes, Z3.1 with one bounded repair, Z3.3 with the Guild's documents
// protected, E-3 for the multi-position case). The batch ZIP is not in the repository: Rogue T38–T43 (the Hearthstone)
// and Mage T23/T24 (the Guild bunk) are rebuilt with the review's wording on the product's host path
// (tests/v4/patch8_lib.js), at an inn of Alderwatch with Wren as innkeeper. No rule of the payment authority changes:
// #pay, the price evidence, the firewall's other rules and the booking time of a conditional purchase stay.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, walk, outcomeOf, lastUser, linesOf } from './patch8_lib.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { buildContext } from '../../src/context.js';
import { buildCatalog, extractorCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { firewall } from '../../src/v4/firewall.js';
import { parseExtraction } from '../../src/v4/extract.js';

const content = await loadProductContent();
const WREN = { seq: 1, type: 'person.new', ref: 'wren', name: 'Wren', role: 'innkeeper', desc: ['wiry innkeeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' };
const LINE = (what, price_cp, said, more = {}) => ({ what, kind: 'goods', service: null, qty: 1, price_cp, said, effect: null, teaches: null, equipment: false,
    phase: 'firm', condition: null, pricing: { basis: 'total', quote: said, currency_quote: null }, ...more });
const ROOM = (price = 3, said = 'three copper', what = 'a small room for the night') => LINE(what, price, said, { kind: 'service', service: 'lodging' });
const coin = (g) => g.state().entities.pc.sheet.coin_cp;
const wren = (g) => Object.keys(g.state().entities).find((id) => g.state().entities[id].name === 'Wren');
const open = (g, pred = () => true) => Object.values(g.state().offers).filter((o) => o.status === 'open' && pred(o));
const panel = (g) => String(g.chat.findLast((m) => !m.is_user && !m.is_system)?.extra?.display_text || '');
const narratorText = (g, input = 'I look around.') => buildContext(g.state(), content, { input, outcome: { c: true }, budget: 8000 }).text;
function reloaded(g) {
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state());
    assert.deepEqual(validateState(again, content), []);
    return again;
}
/** Alaric at the Hearthstone with Wren; the reply offers `lines`. */
async function inn(lines = []) {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const prose = `He goes in. Wren looks up from the counter. ${lines.map((l) => `"${l.what}, ${l.said}."`).join(' ')}`;
    await walk(g, 'loc.alderwatch', { text: '*i walk into town to the inn*', at: { new: { name: 'The Hearthstone', kind: 'site', parent: 'loc.alderwatch' } },
        deltas: [WREN, ...(lines.length ? [{ seq: 2, type: 'offer', seller: 'wren', lines }] : [])], prose });
    return g;
}
/** T39: the room taken at its stored offer (3 cp, booked before the narration). */
async function roomPaid() {
    const g = await inn([ROOM()]);
    const offer = open(g)[0];
    await say(g, 'I take the room, three copper.', { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: 3, quote: 'I take the room, three copper.', price_evidence: { basis: 'total', quote: 'three copper', currency_quote: null } });
    assert.ok(lastUser(g).events.some((e) => e.t === 'service.granted' && e.d.service === 'lodging'));
    await g.reply('Wren takes the three coppers and hands him a key.', { expected: {}, deltas: [] });
    return g;
}
const BUY = (what, max, quote, evidence) => ({ type: 'buy', what, from: null, qty: null, max_cp: max, any_price: false, quote,
    price_evidence: evidence ? { basis: 'total', quote: evidence, currency_quote: null } : null });

// ------------------------------------------------------------------------------------------------ Z1.1 the card on the panel
test('.185 Z1.1 Rogue T40: the open payment card stands in the player\'s panel with amount, purpose, payee, wallet and "#pay <id>" (.184: only in the narrator\'s lines)', async () => {
    const g = await inn();
    const before = coin(g);
    const msg = 'I set four copper on the counter for Wren. "For your trouble."';
    await say(g, msg, { type: 'pay', to: wren(g), amount_cp: 4, for: 'her trouble', money: { quote: 'four copper', currency_quote: null }, recipient_quote: 'Wren', quote: msg });
    const card = g.state().decisions.find((d) => d.kind === 'payment' && d.state === 'needs_confirmation');
    assert.ok(card, 'a card');
    await g.reply('Wren eyes the coins but does not take them yet.', { expected: {}, deltas: [] });
    assert.ok(panel(g).includes(`PAYMENT CARD — NOT PAID: 4 cp to Wren for her trouble · wallet ${before} cp → ${before - 4} cp · to pay exactly this, send on its own: #pay ${card.id}`), panel(g));
    assert.equal(coin(g), before, 'the panel pays nothing');
    assert.equal(reloaded(g).entities.pc.sheet.coin_cp, before);
});

test('.185 Z1.1 against: a lapsed card (his next acting message) is shown no more; a card stays payable only by #pay', async () => {
    const g = await inn();
    const msg = 'I set four copper on the counter for Wren.';
    await say(g, msg, { type: 'pay', to: wren(g), amount_cp: 4, for: 'her trouble', money: { quote: 'four copper', currency_quote: null }, recipient_quote: 'Wren', quote: msg });
    const card = g.state().decisions.find((d) => d.kind === 'payment').id;
    await g.reply('Wren waits.', { expected: {}, deltas: [] });
    await say(g, '*I look around the common room*');
    await g.reply('The fire crackles.', { expected: {}, deltas: [] });
    assert.ok(!g.state().decisions.some((d) => d.id === card), 'lapsed');
    assert.doesNotMatch(panel(g), /PAYMENT CARD|#pay/);
});

// ------------------------------------------------------------------------------------------------ Z2 conditional purchase
test('.185 Z2 Rogue T39 / Mage T24: a conditional purchase lets the seller name the total and shows no hand-over (.184: "he pays it and takes it")', async () => {
    const g = await inn();
    const msg = 'A bowl of that stew and bread, then — four copper.';
    await say(g, msg, BUY('a bowl of stew and bread', 4, msg, 'four copper'));
    const lines = linesOf(g);
    assert.doesNotMatch(lines, /he pays it and takes it/);
    assert.match(lines, /BUYS — a bowl of stew and bread if the price is at most 4 cp: the seller may name ONE total in coin for exactly it \("four copper for the stew and bread"\); no coin and nothing of it changes hands in this reply\. The engine books the purchase after the reply when that total is within his limit; the next reply shows the hand-over; above the limit he declines\./);
    assert.match(lines, /OPEN DECISION — Alaric has agreed in advance to buy a bowl of stew and bread if the price is at most 4 cp, but has NOT paid: let the seller say the one total in coin, then stop; narrate no coin and no a bowl of stew and bread handed over in this reply\./);
});

test('.185 Z2: a total within the limit is booked after the reply as before; the panel shows it at once, the next narrator block knows it is done', async () => {
    const g = await inn();
    const before = coin(g);
    const msg = 'A bowl of that stew and bread, then — four copper.';
    await say(g, msg, BUY('a bowl of stew and bread', 4, msg, 'four copper'));
    await g.reply('"Four copper for the stew and bread," Wren says.', { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [LINE('a bowl of stew and bread', 4, 'Four copper for the stew and bread')] }] });
    assert.equal(coin(g), before - 4, 'booked at the end of the reply (unchanged)');
    assert.match(panel(g), /BOUGHT — a bowl of stew and bread for 4 cp from Wren \(booked after the reply, within the price he had agreed to\)/);
    const corrections = rec(g.chat.at(-1)).corrections || [];
    assert.ok(corrections.some((c) => c.startsWith('BOUGHT AFTER THE LAST REPLY')), JSON.stringify(corrections));
    assert.match(buildContext(g.state(), content, { input: 'I eat.', outcome: { c: true }, corrections, budget: 8000 }).text, /BOUGHT AFTER THE LAST REPLY — Alaric paid Wren 4 cp for a bowl of stew and bread \(the engine booked it after that reply, within the price he had agreed to\): it is done\. Show the hand-over now if the last reply did not; he pays nothing more for it and does not buy it again\./);
    assert.equal(reloaded(g).entities.pc.sheet.coin_cp, before - 4);
});

test('.185 Z2/Z1.3 against: above the limit nothing is booked; no total named gives the true reason, not the Guild shop\'s', async () => {
    const g = await inn();
    const before = coin(g);
    const msg = 'A bowl of that stew and bread, then — four copper.';
    await say(g, msg, BUY('a bowl of stew and bread', 4, msg, 'four copper'));
    await g.reply('"Six copper for the stew and bread," Wren says.', { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [LINE('a bowl of stew and bread', 6, 'Six copper for the stew and bread')] }] });
    assert.equal(coin(g), before);
    assert.match(panel(g), /NOT BOUGHT — a bowl of stew and bread: 6 cp is above his limit of 4 cp/);
    const h = await inn();
    await say(h, msg, BUY('a bowl of stew and bread', 4, msg, 'four copper'));
    await h.reply('Wren nods toward the pot.', { expected: { 1: { priced: false, taken_anyway: false } }, deltas: [] });
    assert.match(panel(h), /NOT BOUGHT — a bowl of stew and bread: the seller named no binding total in coin for it in this reply \(one total, for example "four copper for the stew and bread"\)/);
    assert.doesNotMatch(panel(h), /no single valid canonical offer/);
});

// ------------------------------------------------------------------------------------------------ Z1.3 pay without hand-over
test('.185 Z1.3 Rogue T42: a payment for the room without a hand-over the engine finds says what is missing (.184: "confirm the purchase with the seller")', async () => {
    const g = await inn();
    const before = coin(g);
    const msg = 'Seven copper for the stew, bread and room, then.';
    await say(g, msg, { type: 'pay', to: wren(g), amount_cp: 7, for: 'stew, bread and room', money: { quote: 'Seven copper', currency_quote: null }, recipient_quote: null, quote: msg });
    assert.doesNotMatch(linesOf(g), /confirm the purchase with the seller/);
    assert.match(linesOf(g), /NOT PAID — stew, bread and room: his words name the money but the engine finds no hand-over of it to the seller now \("I pay her", "I give him", "I count it out onto the counter"\)\. Nothing changed hands and no payment card was made\./);
    assert.equal(coin(g), before);
});

// ------------------------------------------------------------------------------------------------ Z3.1 priced without offer
test('.185 Z3.1 Rogue T38: "priced: true" with no offer asks the one repair for the seller\'s offer (or priced false); with the offer, or one open for it, no repair', () => {
    const state = (decs, offers = {}) => ({ turn: 5, scene: { at: 'loc.inn', present: ['pc', 'npc.wren'] }, decisions: decs, offers, entities: { 'npc.wren': { kind: 'npc' } } });
    const dec = { id: 'dec.t5.1', kind: 'purchase', what: 'stew and bread', seq: 1, turn: 5, at: 'loc.inn' };
    const issues = (s, a) => parseExtraction(JSON.stringify(a), content.deltaVocab, {}, { 1: 'buy' }, { state: s, content }).issues.map((x) => x.why).filter((w) => /priced is true/.test(w));
    const T38 = { scene: 'here', expected: { 1: { priced: true, taken_anyway: false } }, deltas: [] };
    assert.deepEqual(issues(state([dec]), T38), ['expected.1.priced is true, but no offer reports that price: if this reply has the seller name one binding total in coin for stew and bread, report that offer (seller, lines with price_cp, said and pricing in the reply\'s own words); otherwise priced is false. Never make up an offer or a price']);
    assert.deepEqual(issues(state([dec]), { ...T38, expected: { 1: { priced: false, taken_anyway: false } } }), []);
    assert.deepEqual(issues(state([dec]), { ...T38, deltas: [{ seq: 1, type: 'offer', seller: 'npc.wren', lines: [LINE('stew and bread', 4, 'four copper the pair')] }] }), []);
    assert.deepEqual(issues(state([dec], { 'offer.t3.1': { id: 'offer.t3.1', seller: 'npc.wren', at: 'loc.inn', status: 'open', lines: [LINE('stew and bread', 4, 'four copper')] } }), T38), [], 'an open offer for it: nothing to repair');
    assert.deepEqual(issues(state([]), T38), [], 'no purchase of this turn');
});

// ------------------------------------------------------------------------------------------------ Z3.3 Guild bunk
test('.185 Z3.3 Mage T23: the Guild clerk\'s bunk "for traveling members" is an ordinary offer (.184: guild_canon_price); fees and documents stay the engine\'s', () => {
    const v = (lines) => { const r = firewall([{ seq: 1, type: 'offer', seller: 'npc.guild_clerk', lines }], { inGuildHall: true, contracts: [], booked: {}, auth: {} }); return r.reject.map((x) => x.rule); };
    const bunk = LINE('bunk for traveling members', 1, 'One copper', { kind: 'service', service: 'lodging' });
    assert.deepEqual(v([bunk]), []);
    assert.deepEqual(v([LINE('supper for members', 2, 'two copper', { kind: 'service', service: 'meal' })]), []);
    for (const l of [
        LINE('Guild registration (plate, first stamp)', 20, 'two silver', { kind: 'service', service: 'other' }),
        LINE('registration and a bunk for members', 21, 'twenty-one copper', { kind: 'service', service: 'lodging' }),
        LINE('members\' badge', 5, 'five copper', { kind: 'service', service: 'lodging' }),
        LINE('membership fee', 20, 'two silver', { kind: 'service', service: 'meal' }),
        LINE('a copy of the contract slip', 2, 'two copper', { kind: 'goods' }),
    ]) assert.deepEqual(v([l]), ['guild_canon_price'], l.what);
    assert.deepEqual(v([bunk, LINE('Guild plate', 5, 'five copper')]), ['guild_canon_price'], 'a fee line beside the bunk keeps the offer the engine\'s');
});

// ------------------------------------------------------------------------------------------------ Z1.2 paid here
test('.185 Z1.2 Rogue T40–T42: the room paid in T39 is PAID HERE for the narrator, the planner and the extractor (.184: in none of them)', async () => {
    const g = await roomPaid();
    const s = g.state();
    assert.match(narratorText(g), /PAID HERE \(booked by the engine\): a small room for the night, 3 cp to Wren\. Settled: nobody asks for it, quotes it or charges it again; a price named now is for something else\./);
    assert.match(catalogText(buildCatalog(s, content, { c: true, known: true })), /\nPAID HERE: a small room for the night, 3 cp to [^\n]*\(npc\.wren\): paid, booked by the engine; not owed, quoted or charged again/);
    assert.match(extractorCatalog(s, content, { c: true }).text, /\nPAID HERE: a small room for the night, 3 cp to /);
});

test('.185 Z1.2 against: nothing paid, nothing PAID HERE; after the 24 hours of the stay it is no longer named', async () => {
    const g = await inn([ROOM()]);
    assert.doesNotMatch(narratorText(g), /PAID HERE/);
    const paid = await roomPaid();
    const s = paid.state();
    s.clock.minute += 1441;
    assert.doesNotMatch(buildContext(s, content, { input: 'x', outcome: { c: true }, budget: 8000 }).text, /PAID HERE/);
    assert.doesNotMatch(catalogText(buildCatalog(s, content, { c: true })), /PAID HERE/);
});

// ------------------------------------------------------------------------------------------------ E-3 multi-position
test('.185 E-3 Rogue T42/T43 (latent): stew 4 + room 3 after the room was paid is neither charged 7 nor cut to 4 – it is clarified', async () => {
    const g = await roomPaid();
    const before = coin(g);
    await g.reply('"Four copper for the stew and bread, three copper for the room," Wren says.', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [LINE('stew and bread', 4, 'Four copper for the stew and bread'), ROOM(3, 'three copper for the room', 'the room')] }] });
    const offer = open(g, (o) => o.lines.length === 2)[0];
    if (!offer) return assert.fail(`the two-line offer was not stored: ${JSON.stringify(rec(g.chat.at(-1)).rejected || null)}`);
    await say(g, 'I take both, seven copper.', { type: 'offer.accept', offer: offer.id, lines: offer.lines.map((l) => l.id), qty: null, party_words: null, agreed_cp: 7, quote: 'I take both, seven copper.', price_evidence: { basis: 'total', quote: 'seven copper', currency_quote: null } });
    assert.equal(coin(g), before, 'not charged again, nothing taken off');
    const r = lastUser(g);
    assert.deepEqual(r.events, [], 'nothing booked, no story turn');
    assert.equal(r.command.panels[0], '[SYSTEM // CLARIFY]\nNOT BOUGHT: a small room for the night is paid already (3 cp, booked by the engine): this purchase of stew and bread, the room takes it in again, so nothing was booked and nothing was taken off; the seller names one total in coin for what is still unpaid. Nothing changes hands.\nNothing was booked; name it and send the message again.');
    reloaded(g);
});

test('.185 E-3 against: the stew alone is bought; a room alone (another night may be meant) is bought as before; no lock without a paid room', async () => {
    const g = await roomPaid();
    const before = coin(g);
    await g.reply('"Four copper the stew, three copper the room," Wren says.', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [LINE('stew and bread', 4, 'Four copper the stew'), ROOM(3, 'three copper the room', 'the room')] }] });
    const offer = open(g, (o) => o.lines.length === 2)[0];
    await say(g, 'Just the stew, four copper.', { type: 'offer.accept', offer: offer.id, lines: [offer.lines[0].id], qty: null, party_words: null, agreed_cp: 4, quote: 'Just the stew, four copper.', price_evidence: { basis: 'total', quote: 'four copper', currency_quote: null } });
    assert.equal(coin(g), before - 4);
    const h = await roomPaid();
    const hb = coin(h);
    await h.reply('"Another night is three copper," Wren says.', { expected: {}, deltas: [{ seq: 1, type: 'offer', seller: wren(h), lines: [ROOM(3, 'three copper', 'another night in the small room')] }] });
    const night = open(h, (o) => o.lines.length === 1 && /another night/.test(o.lines[0].what))[0];
    await say(h, 'Another night, then: three copper.', { type: 'offer.accept', offer: night.id, lines: ['l1'], qty: null, party_words: null, agreed_cp: 3, quote: 'Another night, then: three copper.', price_evidence: { basis: 'total', quote: 'three copper', currency_quote: null } });
    assert.equal(coin(h), hb - 3);
    const k = await inn([LINE('stew and bread', 4, 'four copper for the stew'), ROOM(3, 'three copper for the room', 'the room')]);
    const kb = coin(k);
    const both = open(k)[0];
    await say(k, 'Both, seven copper.', { type: 'offer.accept', offer: both.id, lines: both.lines.map((l) => l.id), qty: null, party_words: null, agreed_cp: 7, quote: 'Both, seven copper.', price_evidence: { basis: 'total', quote: 'seven copper', currency_quote: null } });
    assert.equal(coin(k), kb - 7, 'no paid room: the two positions are bought as before');
});

test('.185 E-3 the latent T42/T43 path itself: a conditional purchase "stew, bread and room" for at most 7 is not booked after the reply when the room is paid', async () => {
    const g = await roomPaid();
    const before = coin(g);
    const msg = 'Stew, bread and the room, seven copper all told.';
    await say(g, msg, BUY('stew, bread and the room', 7, msg, 'seven copper'));
    await g.reply('"Four copper for the stew and bread, three copper for the room," Wren says.', { expected: { 1: { priced: true, taken_anyway: false } }, deltas: [{ seq: 1, type: 'offer', seller: wren(g), lines: [LINE('stew and bread', 4, 'Four copper for the stew and bread'), ROOM(3, 'three copper for the room', 'the room')] }] });
    assert.equal(coin(g), before, 'neither 7 nor 4');
    assert.match(panel(g), /NOT BOUGHT — a small room for the night is paid already \(3 cp, booked by the engine\): this purchase of stew and bread, the room takes it in again/);
    assert.ok((rec(g.chat.at(-1)).corrections || []).some((c) => /^NOT BOUGHT — a small room for the night is paid already/.test(c)), 'the narrator is told');
    reloaded(g);
});
