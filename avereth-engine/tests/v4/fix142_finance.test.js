// Build .142 – finance consolidation (patch_plans_10b/PATCH_PAYMENT_CONSOLIDATION.md, PAYMENT_SYSTEM_AUDIT.md §§12–13):
// meaning (model contract cmd-1.8 / delta-1.13), evidence (src/v4/finance_evidence.js), bindingness (terms) and booking
// kept apart. Every case runs the product's own path – guard → resolveCommands, applyWorld, or the host – with the
// answer a fresh model gives in the finance contract. The file uses only entry points .141 has as well: run against the
// unchanged .141 tree, the extra fields are ignored there and the cases show its actual wrong events (red); the
// positive controls are green on both. Cases that need the new module directly import it inside the test.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyEvent, fold } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { guardContext, buildCatalog } from '../../src/v4/catalog.js';
import { validateState } from '../../src/validate.js';
import { openCards, payCard, payAllCards } from './pay_card.js';

const content = await loadProductContent();
const gz = (name) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
const R = gz('batch20_finance138.json.gz').records; // batch 20 (build .137): #52 #58 #64 #99 #106 #110 #116 #123 #218 #382
const B = gz('batch20_finance142.json.gz').records; // batch 20: the chain #380 → #381 → #382 and #438
const clone = structuredClone;
const coins = (events) => events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);
const offersOf = (res) => res.events.filter((e) => e.t === 'offer.created').map((e) => e.d.offer);

// ------------------------------------------------------------------------------------------------ the player's coin
const T50 = R[99]; // the Guild hall after the nest contract: Tam the crateman present, the planner's wrong pay of 50 cp
const TAM = T50.commands[0].to;
const PORTER = 'npc.test_porter';
function hall(coin = 200) {
    const s = clone(T50.state);
    s.entities.pc.sheet.coin_cp = coin;
    s.entities[PORTER] = { ...clone(s.entities[TAM]), id: PORTER, name: 'Wim', descriptors: ['porter'] };
    s.scene.present.push(PORTER);
    return s;
}
/** A pay command as cmd-1.8 has it. */
const PAY = (to, cp, quote, money = null, more = {}) => ({ seq: 1, type: 'pay', to, amount_cp: cp, for: null, quote,
    money: money ? { quote: money, currency_quote: null } : null, recipient_quote: null, ...more });
/** One player message through the product's order: the agency guard, then the commands. */
function turn(s, message, commands, msg = 600) {
    const g = guardCommands(message, commands, guardContext(s, content, buildCatalog(s, content, { known: true, c: true })));
    const events = [];
    const ctx = resolveCommands(s, content, g.kept, (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg, text: message });
    s.last = { ...(s.last || {}), outcome: { auth: ctx.auth, conditionals: ctx.conditionals, expected_keys: ctx.expectedKeys, resolutions: ctx.resolutions, booked: ctx.booked, c: true } };
    return { events, ctx, dropped: g.dropped, state: s };
}
/** The next message: a new turn of the same scene. */
const next = (s) => { s.turn += 1; return s; };

test('.142 pay direction: the eight .141 counterexamples move no coin, with enough coin and a planner pay of 50 cp', () => {
    for (const [message, money] of [
        ['I give Tam two plates for the fifty copper.', 'the fifty copper'],
        ['I hand Tam the plates for fifty copper and leave.', 'fifty copper'],
        ['I slide the plates across for fifty copper.', 'fifty copper'],
        ['I put the fifty copper in my purse.', 'the fifty copper'],
        ['I put the change in my pocket.', null],
        ['I count out the fifty copper he gave me.', 'the fifty copper'],
        ["Here's the receipt for fifty copper, Tam.", 'fifty copper'],
        ['I pass Tam the receipt for fifty copper.', 'fifty copper'],
    ]) {
        const r = turn(hall(), message, [PAY(TAM, 50, message, money)]);
        assert.deepEqual(coins(r.events), [], message);
        assert.equal(r.events.some((e) => e.t === 'transaction.completed'), false, message);
    }
});

test('.142 pay direction: a goods price of five copper is no payment; receipts, possessions and received coin neither', () => {
    for (const [message, money] of [
        ['I sell Tam the plates for five copper.', 'five copper'],
        ['I give Tam two plates for five copper.', 'five copper'],
        ['I keep the five copper he paid me.', 'the five copper'],
        ['I show Tam the five copper in my pouch.', 'the five copper'],
    ]) assert.deepEqual(coins(turn(hall(), message, [PAY(TAM, 5, message, money)]).events), [], message);
});

test('.142 pay direction: a claim for his wage beside a separate tip pays only the tip', () => {
    const message = 'I collect my wages and tip the porter a copper.';
    const s = hall();
    const r = turn(s, message, [PAY(TAM, 50, 'I collect my wages', null), { ...PAY(PORTER, 1, 'tip the porter a copper', 'a copper'), seq: 2 }]);
    // Build .144 (S1): the tip is a card, the claim none; his #pay pays the tip only
    assert.deepEqual(coins(r.events), []);
    assert.deepEqual(openCards(s).map((d) => [d.seller, d.amount_cp]), [[PORTER, 1]]);
    assert.deepEqual(payAllCards(s, content).flatMap((x) => x.events).filter((e) => e.t === 'transaction.completed').map((e) => [e.d.to, e.d.cp]), [[PORTER, 1]]);
});

// Build .144 (S1): his own clear payment is a card at once (no words of confirmation needed); his #pay books it once
test('.142 positive controls: his own clear payments are one card each; #pay books exactly it once', () => {
    for (const [message, money, cp] of [
        ['I pay Tam five copper for his trouble.', 'five copper', 5],
        ['I tip Tam two copper.', 'two copper', 2],
        ['Here are five copper, Tam.', 'five copper', 5],
        ['I give back the five copper I owe him.', 'the five copper', 5],
        ['I hand Tam one silver and five copper.', 'one silver and five copper', 15],
    ]) {
        const s = hall();
        const r = turn(s, message, [PAY(TAM, cp, message, money)]);
        assert.deepEqual(coins(r.events), [], message);
        assert.deepEqual(openCards(s).map((d) => d.amount_cp), [cp], message);
        const paid = payAllCards(s, content).flatMap((x) => x.events);
        assert.deepEqual(coins(paid), [-cp], message);
        assert.equal(paid.filter((e) => e.t === 'transaction.completed').length, 1, message);
    }
});

test('.142 completeness: an incomplete handover is never booked as its first part', () => {
    for (const [message, money, cp] of [
        ['I hand Tam three copper and the silver.', 'three copper', 3],
        ['I hand Tam three copper and the silver.', 'three copper and the silver', 3],
        ['I give Tam four copper and the silver for the lot.', 'four copper', 4],
        ['I pay Tam three coppers, then a few more.', 'three coppers', 3],
    ]) assert.deepEqual(coins(turn(hall(), message, [PAY(TAM, cp, message, money)]).events), [], `${message} / ${money}`);
});

test('.142 a pay beside an open offer of the same amount does not buy it when his words do not pay', () => {
    const s = hall();
    s.offers['offer.test.plates'] = { id: 'offer.test.plates', seller: TAM, at: s.scene.at, status: 'open', canon: false, turn: s.turn,
        lines: [{ id: 'l1', what: 'two crate plates', kind: 'goods', service: null, qty: 1, price_cp: 50 }] };
    const message = 'I give Tam two plates for the fifty copper.';
    const r = turn(s, message, [PAY(TAM, 50, message, 'the fifty copper')]);
    assert.deepEqual(coins(r.events), []);
    assert.equal(r.state.offers['offer.test.plates'].status, 'open');
    // his clear payment of it is the purchase (known obligation, §5.1)
    const t = hall();
    t.offers['offer.test.plates'] = clone(s.offers['offer.test.plates']);
    t.offers['offer.test.plates'].status = 'open';
    const paid = turn(t, 'I pay Tam the fifty copper for the plates.', [PAY(TAM, 50, 'I pay Tam the fifty copper for the plates.', 'the fifty copper', { for: 'two crate plates' })]);
    assert.deepEqual(coins(paid.events), [-50]);
    assert.equal(paid.state.offers['offer.test.plates'].status, 'accepted');
});

// ------------------------------------------------------------------------------------------------ confirmation
// Build .144 (S1): the card is concrete and visible; words never confirm it; "#pay <id>" pays it once, also after a fold
test('.142 confirmation (.144): a payment is a concrete card; only #pay pays it, once; words in the next message lapse it', () => {
    const s = hall();
    const message = 'I leave five copper on the crate for Tam.';
    const first = turn(s, message, [PAY(TAM, 5, message, 'five copper')]);
    assert.deepEqual(coins(first.events), [], 'nothing changes hands with the card');
    const dec = first.events.find((e) => e.t === 'decision.opened' && e.d.decision.kind === 'payment')?.d.decision;
    assert.ok(dec, 'a concrete payment card');
    assert.deepEqual([dec.seller, dec.amount_cp, dec.state, dec.route], [TAM, 5, 'needs_confirmation', 'free']);
    assert.match(first.ctx.actions[0], new RegExp(`NOT PAID — payment card ${dec.id.replace(/\./g, '\\.')}: pay .* 5 cp\\. Wallet 200 cp → 195 cp\\. Nothing changed hands\\. Only the player's own message "#pay ${dec.id.replace(/\./g, '\\.')}"`));
    const paid = payCard(s, content, dec.id);
    assert.deepEqual(coins(paid.events), [-5]);
    assert.equal(paid.events.find((e) => e.t === 'transaction.completed').d.decision, dec.id);
    // the same #pay again: no second payment
    assert.equal(payCard(s, content, dec.id).paid, false);
    // fold of the stored events reproduces the state
    const replay = fold([...first.events, ...paid.events].map((e) => JSON.parse(JSON.stringify(e))), hall());
    assert.equal(replay.entities.pc.sheet.coin_cp, 195);
    // words confirm nothing, and his next acting message lapses the card
    const t = hall();
    const id = turn(t, message, [PAY(TAM, 5, message, 'five copper')]).events.find((e) => e.t === 'decision.opened').d.decision.id;
    assert.deepEqual(coins(turn(next(t), 'Yes, pay him the five copper.', [PAY(TAM, 5, 'Yes, pay him the five copper.', null)], 601).events), []);
    assert.equal(payCard(t, content, id).paid, false);
});

// Build .144 (S1): #pay pays nothing for a card of an earlier message, another place, an absent payee or an unknown id
test('.142 confirmation (.144): #pay after a later message, at another place, without the payee or with no such card pays nothing', () => {
    const proposal = () => {
        const s = hall();
        const r = turn(s, 'I leave five copper on the crate for Tam.', [PAY(TAM, 5, 'I leave five copper on the crate for Tam.', 'five copper')]);
        return { s, id: r.events.find((e) => e.t === 'decision.opened').d.decision.id };
    };
    const cases = [
        ['a later acting message', (s, id) => { turn(next(s), 'I look around.', [], 601); return id; }],
        ['a later turn without the engine closing it', (s, id) => { next(s); return id; }],
        ['another place', (s, id) => { s.scene.at = 'loc.elsewhere'; return id; }],
        ['the payee gone', (s, id) => { s.scene.present = s.scene.present.filter((x) => x !== TAM); return id; }],
        ['no such card', () => 'dec.pay.t1.9'],
        ['a card that is no free payment', (s) => { s.decisions.push({ id: 'dec.gate.x', kind: 'payment', what: 'the entry fee', offer: 'offer.gate', at: s.scene.at, turn: s.turn, price_cp: 5 }); return 'dec.gate.x'; }],
        ['not enough coin', (s, id) => { s.entities.pc.sheet.coin_cp = 4; return id; }],
    ];
    for (const [name, make] of cases) {
        const { s, id } = proposal();
        const target = make(s, id);
        const before = s.entities.pc.sheet.coin_cp;
        const r = payCard(s, content, target);
        assert.equal(r.paid, false, name);
        assert.equal(s.entities.pc.sheet.coin_cp, before, name);
    }
});

// ------------------------------------------------------------------------------------------------ price basis
const PLATES = R[116]; // the smith, fourteen plates (ENC40) of his
const ENC37 = 'obj.loot.crystal_beetle.chitin.f.enc_t37';
const ENC40 = 'obj.loot.crystal_beetle.chitin.f.enc_t40';
/** The smith's bid in the reply `prose`, as a fresh answer gives it; with Alaric's consent in advance to sell (min). */
function bidReply(prose, { price, pricing, phase = 'firm', condition = null, lines = [{ object: ENC40, qty: 14 }], said = null, consent = 50 } = {}) {
    const s = clone(PLATES.state), raw = clone(PLATES.raw);
    const bid = raw.deltas.find((d) => d.type === 'bid');
    Object.assign(bid, { lines, price_cp: price, said: said ?? prose, phase, condition, pricing });
    raw.deltas = [bid]; raw.expected = {};
    if (consent !== null) s.decisions.push({ id: 'dec.test.sale', kind: 'sale', turn: s.turn, at: s.scene.at, seller: bid.buyer, object: lines[0].object, qty: lines[0].qty, min_cp: consent, seq: 1 });
    return applyWorld(s, content, raw, { msg: 116, prose });
}
const TOTAL = (quote, currency_quote = null) => ({ basis: 'total', quote, currency_quote });
const UNIT = (quote, currency_quote = null) => ({ basis: 'unit', quote, currency_quote });

// Build .144 (S2): a rate per piece for several pieces is no bid (the total is asked for); the total binds
test('.142 price basis (.144): "four copper each" for fourteen is no bid; "fifty-six copper for all fourteen" is 56; the unit price 4 is never the lot price', () => {
    const prose = 'The smith weighs a plate. "Four copper each, and I take all fourteen."';
    const unit = bidReply(prose, { price: 56, pricing: UNIT('Four copper') });
    assert.deepEqual(offersOf(unit), []);
    assert.deepEqual(coins(unit.events), []);
    assert.ok(unit.system.some((x) => /^PRICE OPEN — .* for 14 /.test(x)), unit.system.join('\n'));
    assert.ok(unit.corrections.some((x) => /^PRICE CONTRACT: .*names one total|says one total/.test(x)), unit.corrections.join('\n'));
    const total = bidReply('The smith weighs a plate. "Fifty-six copper for all fourteen."', { price: 56, pricing: TOTAL('Fifty-six copper') });
    assert.deepEqual(offersOf(total).map((o) => o.price_cp), [56]);
    assert.deepEqual(coins(total.events), [56], 'his consent in advance (at least 50) sells at the binding 56');
    const lot = bidReply(prose, { price: 4, pricing: TOTAL('Four copper') });
    assert.deepEqual(offersOf(lot).filter((o) => o.terms === 'firm' || o.terms === undefined).map((o) => o.price_cp), []);
    assert.deepEqual(coins(lot.events), []);
});

test('.142 price basis (.144): stacks 7+14 bind by their named total (84), never by the rate; a different quality is no shared rate', () => {
    const lines = [{ object: ENC37, qty: 7 }, { object: ENC40, qty: 14 }];
    const prose = '"I\'ll give you four copper the plate. That\'s eighty-four copper for all of them."';
    assert.deepEqual(offersOf(bidReply(prose, { price: 84, pricing: UNIT('four copper'), lines, consent: null })).map((o) => o.price_cp), []);
    assert.deepEqual(offersOf(bidReply(prose, { price: 84, pricing: TOTAL('eighty-four copper'), lines, consent: null })).map((o) => o.price_cp), [84]);
    const s = clone(PLATES.state);
    s.objects[ENC37] = { ...s.objects[ENC37], quality: 'fine' };
    const raw = clone(PLATES.raw);
    const bid = raw.deltas.find((d) => d.type === 'bid');
    Object.assign(bid, { lines, price_cp: 84, said: null, phase: 'firm', condition: null, pricing: UNIT('four copper') });
    raw.deltas = [bid]; raw.expected = {};
    assert.deepEqual(offersOf(applyWorld(s, content, raw, { msg: 116, prose })).map((o) => o.price_cp), [], 'different goods never share one rate');
});

// Build .144 (S2): part prices are not added up from prose: no bid, the total is asked for
test('.142 price basis (.144): T26 positions 24+6+4 store no bid; the total is asked for', () => {
    const r = R[52], raw = clone(r.raw);
    const bid = raw.deltas.find((d) => d.type === 'bid');
    Object.assign(bid, { phase: 'firm', condition: null, pricing: { basis: 'positions', positions: [
        { line: 1, basis: 'total', quote: 'twenty-four', currency_quote: 'copper' },
        { line: 2, basis: 'total', quote: 'Gland at six', currency_quote: 'copper' },
        { line: 3, basis: 'total', quote: 'Gel at four', currency_quote: 'copper' }] } });
    const res = applyWorld(clone(r.state), content, raw, { msg: 52, prose: r.prose });
    assert.deepEqual(offersOf(res).filter((o) => o.bid), []);
    assert.ok(res.system.some((x) => /^PRICE OPEN — /.test(x)));
    // the same bare "six" with no coin in its words and the two silver of another article beside it: no price
    const bare = clone(raw);
    bare.deltas.find((d) => d.type === 'bid').said = null;
    const prose = r.prose.replace('Plates at four copper each, so twenty-four for the six.', 'Plates, twenty-four for the six.');
    assert.deepEqual(offersOf(applyWorld(clone(r.state), content, bare, { msg: 52, prose })).filter((o) => o.bid), []);
});

test('.142 price basis: equivalents confirm one sum; a range, another article or his purse is no price', () => {
    // binding: terms firm (a build without terms – .141 – stored only what it held binding)
    const lot = (prose, pricing, price = 56) => offersOf(bidReply(prose, { price, pricing, consent: null })).filter((o) => (o.terms ?? 'firm') === 'firm').map((o) => o.price_cp);
    assert.deepEqual(lot('"Fifty-six copper — five silver six — for the lot."', TOTAL('Fifty-six copper')), [56]);
    assert.deepEqual(lot('"A copper or two per plate."', UNIT('A copper'), 14), []);
    assert.deepEqual(lot('"Fifty-six for the lot." He has sixty copper in his till.', TOTAL('sixty copper'), 56), [], 'the till is not the price');
    // a report that converted its own coin words wrongly is corrected to them (§3.1), as before (amount.corrected)
    assert.deepEqual(lot('"Two silver, ten copper for the lot."', TOTAL('Two silver, ten copper'), 25), [30]);
    assert.deepEqual(lot('"He has not named a price yet," the clerk says.', TOTAL('Fifty-six copper')), [], 'no invented amount');
    assert.deepEqual(lot('He lays fifty-six nails on the bench. "That is my offer on the table."', TOTAL('fifty-six nails')), [], 'nails are no coin');
});

// ------------------------------------------------------------------------------------------------ bindingness
test('.142 binding: real open conditions before, after or in the next sentence are never binding, also against a wrong phase:firm', () => {
    for (const prose of [
        '"Four copper each once the appraiser approves," he says.',
        '"Four copper each, when the appraiser has seen them," he says.',
        '"Four copper each, after I check them," he says.',
        '"Four copper each, as soon as the master agrees," he says.',
        '"Four copper each — subject to the guild\'s approval," he says.',
        '"Four copper each, assuming they are whole," he says.',
        '"Four copper each, but only for whole ones," he says.',
        '"Fifty-six copper for the lot, pending the appraiser," he says.',
        '"Fifty-six copper the lot," he says. "The appraiser has to approve first."',
        '"If the appraiser approves, four copper each," he says.',
    ]) {
        const pricing = /Fifty-six/.test(prose) ? TOTAL('Fifty-six copper') : UNIT(/^"If/.test(prose) ? 'four copper' : 'Four copper');
        for (const phase of ['firm', 'conditional']) {
            const res = bidReply(prose, { price: 56, pricing, phase, condition: phase === 'conditional' ? 'an open condition' : null });
            assert.deepEqual(offersOf(res).filter((o) => o.terms === 'firm' || o.terms === undefined).map((o) => o.price_cp), [], `${phase}: ${prose}`);
            assert.deepEqual(coins(res.events), [], `${phase}: ${prose}`);
        }
    }
});

test('.142 binding (.144 totals): a firm offer and a plain cash choice bind and sell at once; a past approval is no open condition', () => {
    for (const prose of ['"Fifty-six copper for the fourteen."', '"Fifty-six copper for the fourteen, if you would rather have coin than credit."', '"Fifty-six copper for the fourteen. The appraiser approved them yesterday."']) {
        const res = bidReply(prose, { price: 56, pricing: TOTAL('Fifty-six copper') });
        assert.deepEqual(offersOf(res).map((o) => [o.price_cp, o.terms ?? 'firm']), [[56, 'firm']], prose);
        assert.deepEqual(coins(res.events), [56], prose);
    }
});

test('.142 binding: a fresh answer without the new fields books nothing at once (no phase, no pricing)', () => {
    const res = bidReply('"Four copper each, fifty-six the lot."', { price: 56, pricing: undefined, phase: undefined });
    assert.deepEqual(coins(res.events), []);
    assert.deepEqual(offersOf(res).filter((o) => o.terms === 'firm' || o.terms === undefined), []);
});

test('.142 #438 (.144): "venom glands three silver each, if they\'re not burst" is no bid at all, never binding', () => {
    const r = B[438], raw = clone(r.raw);
    Object.assign(raw.deltas.find((d) => d.type === 'bid'), { phase: 'conditional', condition: "the glands are not burst", pricing: { basis: 'positions', positions: [
        { line: 1, basis: 'unit', quote: 'two copper', currency_quote: null }, { line: 2, basis: 'unit', quote: 'three silver', currency_quote: null }] } });
    const res = applyWorld(clone(r.state), content, raw, { msg: 438, prose: r.prose });
    // Build .144 (S2): rates per piece for several lines are no price at all: nothing stored, nothing binding
    assert.deepEqual(offersOf(res), []);
    assert.deepEqual(coins(res.events), []);
    assert.ok(res.corrections.some((x) => /^PRICE CONTRACT: /.test(x)));
});

// ------------------------------------------------------------------------------------------------ the original chain
test('.142 #380 → #381 → #382: the explicit 150 cp lot bid is stored, his plan sells both positions once for 150, the narrated coin pays nothing again', () => {
    const raw = clone(B[380].raw);
    Object.assign(raw.deltas.find((d) => d.type === 'bid'), { phase: 'firm', condition: null, pricing: TOTAL('One hundred fifty copper') });
    const r380 = applyWorld(clone(B[380].state), content, raw, { msg: 380, prose: B[380].prose });
    assert.deepEqual(offersOf(r380).map((o) => [o.price_cp, o.terms]), [[150, 'firm']], '.141 refused it ("no sum the reply names")');
    const s = r380.state, coin = s.entities.pc.sheet.coin_cp;
    const commands = B[381].commands.map((c) => ({ ...c, price_evidence: TOTAL('150 copper') }));
    const events = [];
    const ctx = resolveCommands(s, content, commands, (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg: 381, text: B[381].message });
    assert.equal(s.entities.pc.sheet.coin_cp, coin + 150);
    assert.deepEqual(events.filter((e) => e.t === 'transaction.completed').map((e) => e.d.cp), [150]);
    assert.equal(s.objects['obj.loot.bog_strider.chitin.f']?.holder?.entity === 'pc', false, 'fifteen plates sold');
    assert.equal(s.objects['obj.loot.bog_strider.venom.f']?.holder?.entity === 'pc', false, 'four glands sold');
    s.last = { ...s.last, outcome: { auth: ctx.auth, conditionals: ctx.conditionals, expected_keys: ctx.expectedKeys, resolutions: ctx.resolutions, booked: ctx.booked, c: true } };
    for (const relation of ['trade_settlement', 'independent', 'unclear']) {
        const r382 = clone(B[382].raw);
        Object.assign(r382.deltas.find((d) => d.type === 'coin.gift'), { phase: 'transferred', relation, money: { quote: 'one hundred fifty copper', currency_quote: null } });
        const res = applyWorld(clone(s), content, r382, { msg: 382, prose: B[382].prose });
        assert.equal(res.state.entities.pc.sheet.coin_cp, coin + 150, relation);
    }
});

// ------------------------------------------------------------------------------------------------ gifts
const GIFT = (from, cp, said, money, relation = 'independent', more = {}) => ({ seq: 1, type: 'coin.gift', from, cp, why: 'thanks', said, repeat_of: null, phase: 'transferred', relation, money: { quote: money, currency_quote: null }, ...more });
test('.142 gifts: a real thanks alone or beside a trade with the same person pays; proceeds, recounts and promises do not', () => {
    const s = hall();
    const gift = (deltas, prose, state = s) => applyWorld(clone(state), content, { scene: 'here', expected: {}, deltas }, { msg: 700, prose });
    const base = s.entities.pc.sheet.coin_cp;
    const thanks = gift([GIFT(TAM, 5, 'Tam presses five copper into his hand.', 'five copper')], 'Tam presses five copper into his hand. "For the nest."');
    assert.equal(thanks.state.entities.pc.sheet.coin_cp, base + 5);
    const traded = clone(s);
    traded.last.outcome = { ...(traded.last.outcome || {}), booked: { sellers: [TAM] } };
    assert.equal(gift([GIFT(TAM, 5, 'Tam presses five copper into his hand.', 'five copper')], 'Tam presses five copper into his hand as thanks.', traded).state.entities.pc.sheet.coin_cp, base + 5, 'a trade partner may still thank');
    for (const [relation, phase] of [['trade_settlement', 'transferred'], ['recount', 'transferred'], ['independent', 'promised'], ['unclear', 'transferred']])
        assert.equal(gift([GIFT(TAM, 5, 'Tam presses five copper into his hand.', 'five copper', relation, { phase })], 'Tam presses five copper into his hand.').state.entities.pc.sheet.coin_cp, base, `${relation}/${phase}`);
    // the same handover reported twice in one reply pays once; a second real handover of the same amount pays again
    const twice = gift([GIFT(TAM, 5, 'Tam presses five copper into his hand.', 'five copper'), { ...GIFT(TAM, 5, 'presses five copper into his hand', 'five copper'), seq: 2 }], 'Tam presses five copper into his hand.');
    assert.equal(twice.state.entities.pc.sheet.coin_cp, base + 5);
    const later = gift([GIFT(TAM, 5, 'Tam presses another five copper into his hand.', 'another five copper')], 'Tam presses another five copper into his hand.', thanks.state);
    assert.equal(later.state.entities.pc.sheet.coin_cp, base + 10);
    // nobody here gives coin
    const away = clone(s);
    away.scene.present = away.scene.present.filter((id) => id !== TAM);
    assert.equal(gift([GIFT(TAM, 5, 'Tam presses five copper into his hand.', 'five copper')], 'Tam presses five copper into his hand.', away).state.entities.pc.sheet.coin_cp, base);
});

test('.142 T109 (#218): "Three coppers, then a fourth added" pays 4; the words cut before the fourth pay nothing', () => {
    const r = R[218];
    const at = (money) => {
        const raw = clone(r.raw);
        Object.assign(raw.deltas.find((d) => d.type === 'coin.gift'), { phase: 'transferred', relation: 'independent', money: { quote: money, currency_quote: null } });
        return coins(applyWorld(clone(r.state), content, raw, { msg: 218, prose: r.prose }).events);
    };
    assert.deepEqual(at('Three coppers, then a fourth added'), [4]);
    assert.ok(!at('Three coppers').includes(3), 'never the partial 3');
});

// ------------------------------------------------------------------------------------------------ persistence
test('.142 persistence: terms and evidence of a stored bid survive the event fold and validate', () => {
    const res = bidReply('"Four copper each, fifty-six copper the lot."', { price: 56, pricing: TOTAL('fifty-six copper'), consent: null });
    const replay = fold(JSON.parse(JSON.stringify(res.events)), clone(PLATES.state));
    assert.deepEqual(replay.offers, res.state.offers);
    assert.deepEqual(validateState(replay, content), []);
    const o = Object.values(replay.offers).find((x) => x.bid && x.status === 'open');
    assert.deepEqual([o.terms, o.evidence?.basis, o.evidence?.derived_cp], ['firm', 'total', 56]);
});

// ------------------------------------------------------------------------------------------------ the evidence module
test('.142 evidence module: role checks of money words (the readers that replace tradePrice and paysOut)', async () => {
    const F = await import('../../src/v4/finance_evidence.js');
    const lit = (src, q, o = {}) => F.moneyLiteral(src, q, { content, ...o });
    assert.equal(lit('I have three silver—I\'ll give two to Bree.', 'two', { currencyQuote: 'silver' }).cp, 20);
    assert.equal(lit('Two copper or two silver, he says.', 'two', { currencyQuote: 'silver' }).state, 'missing', 'no free inheritance of one of two coins');
    assert.equal(lit('eight copper and a single silver piece', 'eight copper and a single silver piece').cp, 18);
    assert.equal(lit('Five copper and five copper.', 'Five copper and five copper').state, 'contradicted');
    assert.equal(lit('three copper and the silver', 'three copper').state, 'incomplete');
    assert.equal(lit('A copper or two per plate.', 'A copper').state, 'contradicted');
    assert.equal(F.priceEvidence(TOTAL('two copper'), { source: 'two copper a pelt', within: F.findQuote('two copper a pelt','two copper a pelt'), content, units: 4, goods: ['wolf pelt'] }).reason, 'unit_price_as_total');
    assert.equal(F.priceEvidence(TOTAL('Two silver'), { source: 'Two silver a fair deal.', within: F.findQuote('Two silver a fair deal.','Two silver a fair deal.'), content, units: 3, goods: ['wolf pelt'] }).cp, 20);
    const act = (m, money) => F.payArgument(m, { to: 'npc.tam', amount_cp: null, quote: m, money: { quote: money, currency_quote: null } }, { content, present: [{ id: 'npc.tam', names: ['Tam'] }] }).act;
    assert.equal(act('I hand Tam five copper.', 'five copper'), 'outgoing');
    assert.equal(act('I hand over five copper.', 'five copper'), 'outgoing');
    assert.equal(act('I give Tam two plates for five copper.', 'five copper'), 'unclear');
    assert.equal(act("I'll take that five copper now.", 'five copper'), 'claim');
});
