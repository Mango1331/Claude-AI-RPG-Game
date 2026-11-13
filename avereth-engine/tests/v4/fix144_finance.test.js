// .144 – finance simplification S1+S2 (patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md §6, §7 Pflichtfälle, §10.4).
// S1: a free payment is a payment card; only the player's own "#pay <id>" pays it. S2: a new NPC price binds only as
// one total in its words; his acceptance of a stored price is not re-read from his words; his limits are totals.
// Every case runs through the product's command/world path up to the booking events.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { applyWorld } from '../../src/v4/world.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { guardCommands } from '../../src/v4/agency.js';
import { guardContext, buildCatalog, openDecisionTexts } from '../../src/v4/catalog.js';
import { pickLines, acceptanceWhy } from '../../src/v4/trade.js';
import { parsePlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildContext } from '../../src/context.js';
import { REGISTRATION_OFFER } from '../../src/v4/guild.js';
import { openCards, payCard } from './pay_card.js';

const content = await loadProductContent();
const gz = (name) => JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
const R = gz('batch20_finance138.json.gz').records;
const clone = structuredClone;
const coins = (events) => events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);
const offersOf = (res) => res.events.filter((e) => e.t === 'offer.created').map((e) => e.d.offer);

const T50 = R[99]; // the Guild hall: Tam the crateman present
const TAM = T50.commands[0].to;
const PORTER = 'npc.test_porter';
function hall(coin = 200) {
    const s = clone(T50.state);
    s.entities.pc.sheet.coin_cp = coin;
    s.entities[PORTER] = { ...clone(s.entities[TAM]), id: PORTER, name: 'Wim', descriptors: ['porter'] };
    s.scene.present.push(PORTER);
    return s;
}
const PAY = (to, cp, quote, money = null, more = {}) => ({ seq: 1, type: 'pay', to, amount_cp: cp, for: null, quote,
    money: money ? { quote: money, currency_quote: null } : null, recipient_quote: null, ...more });
function turn(s, message, commands, msg = 600) {
    const g = guardCommands(message, commands, guardContext(s, content, buildCatalog(s, content, { known: true, c: true })));
    const events = [];
    const ctx = resolveCommands(s, content, g.kept, (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg, text: message });
    return { events, ctx, state: s };
}
const next = (s) => { s.turn += 1; return s; };
const coin = (s) => s.entities.pc.sheet.coin_cp;

// ------------------------------------------------------------------------------------------------ S1 payment cards
test('.144 S1 Q5: confirming words plus a direct pay with another purpose, either order: nothing from words, one card, one #pay, one debit', () => {
    for (const reverse of [false, true]) {
        const s = hall();
        const m0 = 'I leave five copper on the crate for Tam.';
        turn(s, m0, [PAY(TAM, 5, m0, 'five copper')]);
        const first = openCards(s)[0].id;
        next(s);
        const m = 'Yes. I pay Tam five copper for his trouble.';
        let cs = [PAY(TAM, 5, 'Yes.', null), PAY(TAM, 5, 'I pay Tam five copper for his trouble.', 'five copper', { for: 'his trouble' })];
        if (reverse) cs.reverse();
        cs = cs.map((c, i) => ({ ...c, seq: i + 1 }));
        const r = turn(s, m, cs);
        assert.deepEqual(coins(r.events), [], 'words pay nothing');
        assert.equal(openCards(s).length, 1, 'exactly one card');
        assert.equal(payCard(s, content, first).paid, false, 'the earlier card is gone');
        const id = openCards(s)[0].id;
        assert.deepEqual(coins(payCard(s, content, id).events), [-5]);
        assert.equal(payCard(s, content, id).paid, false, 'a second #pay pays nothing');
        assert.equal(coin(s), 195);
    }
});

test('.144 S1: every normal way to say a payment makes the same card; no wording pays at once', () => {
    for (const m of ['I pay Tam five copper now.', 'I tip Tam five copper too.', 'I hand Tam five copper with a nod.', 'I pay Tam five copper because he helped.', 'I pay Tam five copper.', 'Here are five copper, Tam.']) {
        const s = hall();
        const r = turn(s, m, [PAY(TAM, 5, m, 'five copper')]);
        assert.deepEqual(coins(r.events), [], m);
        assert.deepEqual(openCards(s).map((d) => [d.seller, d.amount_cp, d.route]), [[TAM, 5, 'free']], m);
        assert.match(r.ctx.actions[0], /NOT PAID — payment card dec\.pay\.t\d+\.1: .*Only the player's own message "#pay dec\.pay\.t\d+\.1"/, m);
    }
});

test('.144 S1: two people get two cards, paid one after the other; the same payment reported twice is one card; different payments to one person are a question', () => {
    const s = hall(6);
    const m = 'I leave five copper for Tam and two copper for Wim. I also collect my fifty copper wage.';
    turn(s, m, [PAY(TAM, 5, 'I leave five copper for Tam', 'five copper'), { ...PAY(PORTER, 2, 'two copper for Wim', 'two copper'), seq: 2 },
        { ...PAY(TAM, 5, 'I leave five copper for Tam', 'five copper'), seq: 3 }, { ...PAY(TAM, 50, 'I also collect my fifty copper wage', null), seq: 4 }]);
    const cards = openCards(s);
    assert.deepEqual(cards.map((d) => [d.seller, d.amount_cp]), [[TAM, 5], [PORTER, 2]], 'the repeated report is the same card; the wage claim makes none');
    assert.equal(payCard(s, content, cards[0].id).paid, true);
    assert.equal(payCard(s, content, cards[1].id).paid, false, 'coin is checked again after each payment (6 − 5 = 1 < 2)');
    const t = hall();
    const c = 'I leave five copper for Tam, then three copper more for Tam.';
    const r = turn(t, c, [PAY(TAM, 5, 'I leave five copper for Tam', 'five copper'), { ...PAY(TAM, 3, 'then three copper more for Tam', 'three copper'), seq: 2 }]);
    assert.deepEqual(openCards(t), [], 'no card, no sum, no "last one wins"');
    assert.match(r.ctx.actions.join('\n'), /different payments to .* in one message; no payment card was made/);
});

test('.144 S1: #pay refuses a card without amount, a gate fee, a closed or unknown id, another place, an absent payee and too little coin', () => {
    const base = () => { const s = hall(); turn(s, 'I leave five copper on the crate for Tam.', [PAY(TAM, 5, 'I leave five copper on the crate for Tam.', 'five copper')]); return s; };
    const amountless = hall();
    turn(amountless, 'I pay Tam for his help.', [PAY(TAM, null, 'I pay Tam for his help.', null, { for: 'his help' })]);
    const noAmount = amountless.decisions.find((d) => d.kind === 'payment');
    assert.equal(noAmount.state, 'needs_amount');
    assert.equal(payCard(amountless, content, noAmount.id).paid, false);
    const cases = [
        ['a gate fee', (s) => { s.decisions.push({ id: 'dec.gate.x', kind: 'payment', what: 'entry', offer: 'offer.gate.x', at: s.scene.at, turn: s.turn, price_cp: 10 }); return 'dec.gate.x'; }],
        ['an unknown id', () => 'dec.pay.t1.7'],
        ['his next acting message', (s) => { const id = openCards(s)[0].id; turn(next(s), 'I look around.', []); return id; }],
        ['another place', (s) => { s.scene.at = 'loc.elsewhere'; return openCards(s)[0].id; }],
        ['the payee gone', (s) => { s.scene.present = s.scene.present.filter((x) => x !== TAM); return openCards(s)[0].id; }],
        ['too little coin', (s) => { s.entities.pc.sheet.coin_cp = 3; return openCards(s)[0].id; }],
    ];
    for (const [name, make] of cases) {
        const s = base();
        const id = make(s);
        const before = coin(s);
        assert.equal(payCard(s, content, id).paid, false, name);
        assert.equal(coin(s), before, name);
    }
});

test('.144 S1: the planner learns the card by its id, words never confirm it; an old answer with confirmation is read as the plain pay', () => {
    const s = hall();
    turn(s, 'I leave five copper on the crate for Tam.', [PAY(TAM, 5, 'I leave five copper on the crate for Tam.', 'five copper')]);
    const id = openCards(s)[0].id;
    assert.match(openDecisionTexts(s).join('\n'), new RegExp(`PAYMENT CARD ${id.replace(/\./g, '\\.')}: .*only the player's own message "#pay ${id.replace(/\./g, '\\.')}" pays it; no command pays or confirms it`));
    assert.equal(content.commandVocab.version, 'cmd-1.9');
    assert.equal(content.commandVocab.commands.find((c) => c.type === 'pay').args.confirmation, undefined);
    const ctx = withContentSkills(planContext(next(s), content, buildCatalog(s, content, { known: true, c: true })), content, s);
    const p = parsePlan(JSON.stringify({ commands: [{ seq: 1, type: 'pay', to: TAM, amount_cp: 5, for: null, quote: 'Yes.', money: null, recipient_quote: null, confirmation: id }] }), content.commandVocab, ctx, 'Yes.');
    assert.equal(p.errors.length, 0, p.errors.join('; '));
    assert.equal(p.commands[0].confirmation, undefined);
});

test('.144 S1 B15: an open registration alone does not make a tip of another amount the fee; the fee itself still is', () => {
    const tip = 'I leave five copper on the crate for Tam.';
    const s = hall();
    s.guild.membership = null;
    s.offers[REGISTRATION_OFFER] = { id: REGISTRATION_OFFER, seller: 'guild', at: s.scene.at, status: 'open', canon: true, turn: s.turn, lines: [{ id: 'l1', what: 'Guild registration fee', kind: 'service', service: 'guild_registration', qty: 1, price_cp: 20 }] };
    const r = turn(s, tip, [PAY(TAM, 5, tip, 'five copper')]);
    assert.doesNotMatch(r.ctx.actions.join('\n'), /NOT REGISTERED/);
    assert.deepEqual(openCards(s).map((d) => d.amount_cp), [5]);
});

// ------------------------------------------------------------------------------------------------ S2 prices
const PLATES = R[116];
const ENC40 = 'obj.loot.crystal_beetle.chitin.f.enc_t40';
function bidReply(prose, { price, pricing, said = null, phase = 'firm' }) {
    const s = clone(PLATES.state), raw = clone(PLATES.raw);
    const bid = raw.deltas.find((d) => d.type === 'bid');
    Object.assign(bid, { lines: [{ object: ENC40, qty: 14 }], price_cp: price, said: said ?? prose, phase, condition: null, pricing });
    raw.deltas = [bid]; raw.expected = {};
    return applyWorld(s, content, raw, { msg: 116, prose });
}
const TOTAL = (quote, currency_quote = null) => ({ basis: 'total', quote, currency_quote });
const UNIT = (quote) => ({ basis: 'unit', quote, currency_quote: null });

test('.144 S2: "four each" or part prices for fourteen plates are no bid and ask for the total; the named total binds', () => {
    for (const [prose, pricing] of [['"Four copper each, and I take all fourteen."', UNIT('Four copper')],
        ['"Four copper each, and I take all fourteen."', TOTAL('Four copper')],
        ['"Twenty-four for six, thirty-two for the rest."', { basis: 'positions', positions: [{ line: 1, basis: 'total', quote: 'Twenty-four', currency_quote: 'copper' }] }]]) {
        const r = bidReply(prose, { price: 56, pricing });
        assert.deepEqual(offersOf(r).filter((o) => (o.terms ?? 'firm') === 'firm'), [], prose);
        assert.deepEqual(coins(r.events), []);
    }
    const open = bidReply('"Four copper each, and I take all fourteen."', { price: 56, pricing: UNIT('Four copper') });
    assert.ok(open.system.some((x) => /^PRICE OPEN — .* for 14 F-Rank Crystal Beetle Chitin Plate: no binding total was named\. Nothing was sold; ask for the total price/.test(x)), open.system.join('\n'));
    assert.ok(open.corrections.some((x) => /^PRICE CONTRACT: .* says one total in coin for exactly these goods/.test(x)));
    assert.deepEqual(offersOf(bidReply('"Fifty-six copper for all fourteen."', { price: 56, pricing: TOTAL('Fifty-six copper') })).map((o) => [o.price_cp, o.terms]), [[56, 'firm']]);
});

test('.144 S2: agreeing without the sum binds nothing; agreeing with the sum said again binds it', () => {
    const done = bidReply('Alaric: "Sixty copper for the lot?" The smith: "Done."', { price: 60, said: 'Done.', pricing: TOTAL('Sixty copper') });
    assert.deepEqual(offersOf(done), []);
    const said = bidReply('Alaric: "Sixty copper for the lot?" The smith: "Sixty copper it is."', { price: 60, said: 'Sixty copper it is.', pricing: TOTAL('Sixty copper') });
    assert.deepEqual(offersOf(said).map((o) => o.price_cp), [60]);
});

test('.144 S2 extractor contract delta-1.14: pricing is a total or unknown; an old unit price of one unit is its total, else unknown without a repair', async () => {
    const { parseExtraction, worldVocab } = await import('../../src/v4/extract.js');
    assert.ok(['delta-1.14', 'delta-1.15'].includes(content.deltaVocab.version), 'delta-1.14, or delta-1.15 (.186: creature.new armed, pricing unchanged)');
    const s = PLATES.state;
    const ids = { places: Object.keys(s.places), quests: Object.keys(s.quests || {}), objects: Object.keys(s.objects || {}) };
    const bid = { ...clone(PLATES.raw.deltas.find((d) => d.type === 'bid')), lines: [{ object: ENC40, qty: 14 }], price_cp: 56, phase: 'firm', condition: null, said: 'Four copper the plate', pricing: UNIT('Four copper') };
    const p = parseExtraction(JSON.stringify({ scene: 'here', expected: {}, deltas: [bid] }), worldVocab(content.deltaVocab, s), ids, {}, { sceneRequired: true, startScene: s.scene.at, state: s, content, reply: 'Four copper the plate, he says.' });
    assert.equal(p.valid, true, (p.errors || []).join('; '));
    const d = p.value.deltas[0];
    assert.deepEqual(d.pricing, { basis: 'unknown' }, 'a rate for fourteen is no price');
    assert.equal(d.phase, 'unclear', 'and no firm phase, so no repair is asked');
});

test('.144 S2 B9: his acceptance is not priced again from his words; an explicit other total, a limit or a discount still stops it', () => {
    const sword = (s) => { s.offers['offer.test.sword'] = { id: 'offer.test.sword', seller: TAM, at: s.scene.at, status: 'open', canon: false, turn: s.turn, terms: 'firm', lines: [{ id: 'l1', what: 'superior longsword', kind: 'goods', service: null, qty: 1, price_cp: 260, terms: 'firm' }] }; return s; };
    const accept = (more) => ({ seq: 1, type: 'offer.accept', offer: 'offer.test.sword', lines: ['l1'], qty: null, party_words: null, agreed_cp: null, price_evidence: null, ...more });
    const q = 'I have 300 copper. I buy the superior longsword.';
    const s = sword(hall(300));
    const r = turn(s, q, [accept({ quote: q })]);
    assert.deepEqual(coins(r.events), [-260], 'his purse is no counteroffer');
    assert.equal(turn(s, q, [accept({ quote: q })]).events.filter((e) => e.t === 'coin.changed').length, 0, 'booked once');
    for (const [more, why] of [[{ quote: 'I buy it for two hundred fifty copper.', agreed_cp: 250, price_evidence: TOTAL('two hundred fifty copper') }, /agreed price 250 cp differs/],
        [{ quote: 'I buy it if it costs at most two hundred fifty copper.', max_cp: 250 }, /above his price limit/],
        [{ quote: 'I buy it at a discount.' }, /discount/]]) {
        const t = sword(hall(300));
        assert.match(acceptanceWhy(accept(more), t.offers['offer.test.sword'], 'Tam', content.rules.currency) || '', why);
        assert.deepEqual(coins(turn(t, more.quote, [accept(more)]).events), [], more.quote);
    }
});

test('.144 S2: engine arithmetic of stored prices stays (3 × 6 = 18, 260 + 160 = 420); one quantity for several positions is a question', () => {
    const offer = { lines: [{ id: 'l1', what: 'healing draught', qty: 1, price_cp: 6 }, { id: 'l2', what: 'superior longsword', qty: 1, price_cp: 260 }, { id: 'l3', what: 'fine shield', qty: 1, price_cp: 160 }] };
    assert.equal(pickLines(offer, ['l1'], 3).cp, 18);
    assert.equal(pickLines(offer, ['l2', 'l3']).cp, 420);
    assert.ok(pickLines({ lines: [{ id: 'l1', what: 'flasks', qty: 3, price_cp: 10 }] }, ['l1'], 2).error, 'an indivisible lot is not rounded');
    assert.match(acceptanceWhy({ lines: ['l2', 'l3'], qty: 2, quote: 'I take both.' }, offer, 'Tam', content.rules.currency), /one quantity for several positions/);
});

test('.144 S2: a limit is his total; a price per unit for several units stops the booking and asks for the total (no limit, no consent in advance)', () => {
    const s = hall(200);
    const unit = turn(s, 'I buy three torches, at most four copper each.', [{ seq: 1, type: 'buy', what: 'torch', from: TAM, qty: 3, max_cp: 12, any_price: false, quote: 'I buy three torches, at most four copper each.', price_evidence: UNIT('four copper') }]);
    // plan §7.3: the booking stops with a concrete question; no limit of 12, no purchase without one
    assert.match(unit.ctx.actions[0], /NOT BOUGHT — "four copper" is a price per unit, not his total for 3 torch: name the total limit/);
    assert.equal(unit.ctx.resolutions[0].status, 'clarify');
    assert.equal(s.decisions.some((d) => d.kind === 'purchase'), false);
    const t = hall(200);
    const total = turn(t, 'I buy three torches for at most twelve copper.', [{ seq: 1, type: 'buy', what: 'torch', from: TAM, qty: 3, max_cp: 12, any_price: false, quote: 'I buy three torches for at most twelve copper.', price_evidence: TOTAL('twelve copper') }]);
    assert.match(total.ctx.actions[0], /BUYS — torch if the price is at most 12 cp/);
});

test('.144 S2: the narrator hears the one price contract wherever a trade is in play, without displacing scene sections', () => {
    const s = clone(PLATES.state);
    const text = buildContext(s, content, { input: 'I show him the plates.', situations: ['trade'], outcome: { c: true } }).text;
    assert.match(text, /PRICES — a price binds only as ONE total in coin for exactly the goods or service named/);
    assert.match(text, /Whoever agrees to a price says the total again/);
    const quiet = buildContext(hall(), content, { input: 'I look at the sky.', situations: [], outcome: { c: true } }).text;
    assert.doesNotMatch(quiet, /PRICES — /);
});
