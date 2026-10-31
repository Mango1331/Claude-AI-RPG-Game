// Build .138 (finance patch): price reading, complete handovers and payment direction, from the originals of
// testrun_10b/batch-20261031-140346Z (warrior, build .137) and the review there (§7/§8). The fixture holds the state
// folded from the stored events before each record and the recorded model answers; nothing is re-asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { tradePrice, sameGoods, rateUnits, acceptanceWhy } from '../../src/v4/trade.js';
import { coinEvidence } from '../../src/economy.js';
import { guardCommands, paysOut } from '../../src/v4/agency.js';
import { guardContext, buildCatalog } from '../../src/v4/catalog.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { planContext, withContentSkills, parsePlan, priceConflictNote } from '../../src/v4/planner.js';
import { planMessage } from '../../src/v4/runtime.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';

const content = await loadProductContent();
const FIX = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch20_finance138.json.gz', import.meta.url))));
const R = FIX.records;
const world = (i, raw = R[i].raw) => applyWorld(structuredClone(R[i].state), content, structuredClone(raw), { msg: Number(i), prose: R[i].prose });
const offers = (res) => res.events.filter((e) => e.t === 'offer.created').map((e) => e.d.offer);
const rejected = (res, type) => res.events.filter((e) => e.t === 'delta.rejected' && e.d.item.type === type);
const coin = (res) => res.events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);
// the bid or offer words of another (world.js reads them so); his own words keep the rate-only condition reading
const price = (said, qty) => tradePrice(null, said, qty, content, { npc: true }).cp;
const ENC37 = 'obj.loot.crystal_beetle.chitin.f.enc_t37';
const ENC40 = 'obj.loot.crystal_beetle.chitin.f.enc_t40';

// ------------------------------------------------------------------------------------------------ original records
test('.138 #106/T53: 84 cp for the two stacks 7+14 at "four copper the plate … eight silver and four" is one bid, ids and units kept', () => {
    assert.match(R[106].original.find((e) => e.t === 'delta.rejected' && e.d.item.type === 'bid').d.reason, /84 cp is no sum the reply names/, '.137 refused it');
    const res = world(106);
    assert.deepEqual(rejected(res, 'bid'), []);
    const [o] = offers(res);
    assert.equal(o.price_cp, 84);
    assert.equal(o.bid, true);
    assert.deepEqual(o.lines.map((l) => [l.object, l.qty]), [[ENC37, 7], [ENC40, 14]]);
    assert.deepEqual(coin(res), [], 'a bid pays nothing before his acceptance');
});

test('.138 #110/T55: "four copper each, if you want the coin more than the credit" is 28 cp for seven; nothing credited', () => {
    assert.ok(R[110].original.some((e) => e.t === 'delta.rejected' && e.d.item.type === 'bid'), '.137 refused it');
    const res = world(110);
    const [o] = offers(res);
    assert.equal(o.price_cp, 28);
    assert.deepEqual(o.lines.map((l) => [l.object, l.qty]), [[ENC37, 7]]);
    assert.deepEqual(coin(res), []);
    assert.equal(res.events.some((e) => /credit/.test(e.t)), false);
});

test('.138 #116/T58: "Four copper the plate, fifty-six the lot" stores 56 cp for fourteen, never the 4 cp shadow price', () => {
    assert.equal(R[116].original.find((e) => e.t === 'offer.created').d.offer.price_cp, 4, '.137 stored 4 cp');
    const res = world(116);
    const [o] = offers(res);
    assert.equal(o.price_cp, 56);
    assert.deepEqual(o.lines.map((l) => [l.object, l.qty]), [[ENC40, 14]]);
    // the narrated seven-plate sale of the same reply stays unpaid: a gift and a sale summary are no sale
    assert.equal(rejected(res, 'coin.gift').length, 1);
    assert.match(rejected(res, 'expected')[0].d.reason, /accepted matching bid/);
    assert.deepEqual(coin(res), []);
});

test('.138 T62 after #116: his 56 cp acceptance of the stored bid books exactly 14 plates for 56 cp, once', () => {
    const s = world(116).state;
    const offer = Object.values(s.offers).find((o) => o.bid && o.status === 'open' && o.lines.some((l) => l.object === ENC40));
    const quote = "I accept the smith's standing bid: four copper per plate, fifty-six copper for all fourteen";
    const c = { seq: 1, type: 'offer.accept', offer: offer.id, lines: null, qty: null, party_words: null, agreed_cp: 56, quote };
    assert.equal(acceptanceWhy(c, offer, 'the smith', content.rules.currency, rateUnits(offer.lines, (id) => s.objects[id])), null);
    const before = s.entities.pc.sheet.coin_cp;
    const events = [];
    resolveCommands(s, content, [c], (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg: 123 });
    assert.equal(s.entities.pc.sheet.coin_cp, before + 56);
    assert.equal(events.filter((e) => e.t === 'transaction.completed').length, 1);
    assert.equal(s.objects[ENC40].holder.entity === 'pc', false);
    assert.equal(s.objects[ENC37].holder.entity, 'pc', 'the other stack stays his');
    // a second acceptance of the same bid books nothing
    const again = [];
    resolveCommands(s, content, [{ ...c, seq: 2 }], (e) => { again.push(e); applyEvent(s, e); }, { c: true, msg: 124 });
    assert.equal(again.filter((e) => e.t === 'coin.changed').length, 0);
});

test('.138 #218/T109: "Three coppers, then a fourth added" pays 4, not 3', () => {
    assert.equal(R[218].original.find((e) => e.t === 'coin.changed').d.delta, 3, '.137 booked 3');
    const res = world(218);
    assert.deepEqual(coin(res), [4]);
    assert.equal(res.events.filter((e) => e.t === 'transaction.completed').length, 1);
});

// ------------------------------------------------------------------------------------------------ price reading
test('.138 price reading: rate × units, confirmed totals, equivalent coins, other sums and conditions', () => {
    assert.equal(price('Four copper each, fifty-six copper total.', 14), 56);
    assert.equal(price("I'll give you four copper each. That's eighty-four copper.", 21), 84);
    assert.equal(price("140 copper — that's 1 gold 4 silver", 1), 140, 'one sum said twice counts once');
    assert.equal(price('The sword costs 140 copper; I have 193 copper.', 1), null, 'his purse is no part of the price');
    assert.equal(price('Four copper each, and the gland I had at six copper.', 14), null, 'another article’s price is not added');
    assert.equal(price('Four copper each, if the appraiser approves.', 14), null, 'a pending approval keeps the price open');
    assert.equal(price('Four copper each, unless they are chipped.', 14), null);
    assert.equal(price('Four copper each, if you would rather have coin than credit.', 14), 56, 'a payment choice is no price condition');
    assert.equal(price('Four copper each, or three if chipped.', 14), null, 'an alternative amount stays open');
    // review of .138: an open buyer condition keeps a total open too, and a payment choice does not cover another condition
    assert.equal(price('Four copper each, fifty-six copper total, if the appraiser approves.', 14), null);
    assert.equal(price('Four copper each, if you want cash and the appraiser approves.', 14), null);
    assert.equal(price('Fifty-six copper the lot, if you want coin or credit.', 14), 56);
    // second review: the whole condition, before the price, after a comma, and work still to be done
    assert.equal(price('Four copper each, if you want cash, and the appraiser approves.', 14), null);
    assert.equal(price('If the appraiser approves, four copper each, fifty-six copper total.', 14), null);
    assert.equal(price('Four copper each, if you finish the work tomorrow.', 14), null);
    assert.equal(price('Four copper each, if you can wait for the appraiser.', 14), null);
    // the addressee's own choice to take it stays a price (corpus: "a copper a bowl, if you're wanting it")
    assert.equal(price("Thirty-four copper the lot, if you're leaving them together", 4), 34);
    assert.equal(price("A copper a bowl, if you're wanting it", 1), 1);
    assert.equal(price("Four copper a plate, if you want them, and I'll take all fourteen.", 14), 56);
    assert.equal(tradePrice(6, "Six if you'd sleep by this fire down here, six copper.", 1, content, { npc: true }).cp, 6, 'a variant he takes by accepting');
    assert.equal(tradePrice(2, "Supper's two more if you want it—stew and ale", 1, content, { npc: true }).cp, 2, 'the goods described after the condition');
    assert.equal(price("Four copper each, if you want cash, and the master says yes.", 14), null);
    // his own limit is no open condition of a seller (.51: "a room if it's no more than 6 copper")
    assert.equal(tradePrice(null, "I take a room if it's no more than 6 copper", 1, content).handled, false);
    assert.equal(price('Four copper each, but fifty copper for the lot.', 14), 50, 'an explicit lot price may differ from the rate');
    assert.equal(price('Fifty-six copper the lot, or sixty copper the lot with the gland.', 14), null, 'two lot prices are open');
    // .139: a condition before the price counts too; a quality the buyer has not checked yet keeps it open
    assert.equal(price("If they're all of a match, I'd give you eight copper apiece. Fifty-six the lot.", 7), null);
    assert.equal(price("I'd give you eight copper apiece. Fifty-six the lot.", 7), 56);
    assert.equal(price('Two silver a fair deal.', 3), tradePrice(null, 'Two silver a fair deal.', 3, content, { npc: true }).cp);
    assert.notEqual(price('Two silver a fair deal.', 3), 60, '.107: a judgement is no rate');
    assert.notEqual(price('Five silver the pair.', 4), 200, 'a collective unit is no unit rate');
    // different goods never share one rate (the engine passes 0 units for them)
    assert.equal(price('Plates at four copper each, so twenty-four for the six. Gland at six. Gel at four.', 0), null);
});

test('.138 same goods: stacks share a rate only when every own property agrees; ids and units stay per line', () => {
    const s = R[106].state;
    assert.equal(sameGoods(s.objects[ENC37], s.objects[ENC40]), true);
    const lines = [{ object: ENC37, qty: 7 }, { object: ENC40, qty: 14 }];
    assert.equal(rateUnits(lines, (id) => s.objects[id]), 21);
    const finer = { ...s.objects[ENC40], quality: 'fine' };
    const level = { ...s.objects[ENC40], level: 4 };
    const unit = { ...s.objects[ENC40], unit: 'bundle' };
    for (const other of [finer, level, unit]) assert.equal(rateUnits(lines, (id) => (id === ENC40 ? other : s.objects[id])), 0);
    assert.equal(rateUnits([{ object: ENC40, qty: 14 }], () => null), 14, 'one line keeps its own units');
});

test('.138 handover amounts: additions to the same handover, unrelated later numbers, sentence boundaries', () => {
    const ev = (t) => coinEvidence(t, content);
    assert.deepEqual([ev("Three coppers, then a fourth added after a moment's thought.").cp, ev("Three coppers, then a fourth added after a moment's thought.").complete], [4, true]);
    assert.deepEqual([ev('Three copper, then he visits the fourth stall.').cp, ev('Three copper, then he visits the fourth stall.').complete], [3, true]);
    assert.equal(ev('Three coppers, then two more.').cp, 5);
    assert.equal(ev('Three coppers, and a few more.').complete, false, 'an unresolved addition is no complete sum');
    assert.equal(ev('Five pelts, nine fangs. Ten and eighteen. Forty copper.').cp, 40, 'numbers of the sentence before are other prices');
    assert.deepEqual(ev('eighty-four copper—eight silver and four.').sums.map((x) => x.cp), [84, 84]);
    assert.equal(ev('two silver and four plates').cp, 20);
    assert.equal(ev('one silver and five copper').cp, 15);
    assert.equal(ev('one silver eight').cp, 18);
});

test('.138 gifts and handovers: an unresolved addition is not booked as a part; ordinary gifts unchanged', () => {
    const base = R[218].raw;
    const vague = structuredClone(base);
    const gift = vague.deltas.find((d) => d.type === 'coin.gift');
    const said = gift.said;
    gift.said = 'Three coppers, and a few more';
    const prose = R[218].prose.replace(said, gift.said);
    const res = applyWorld(structuredClone(R[218].state), content, vague, { msg: 218, prose });
    assert.deepEqual(coin(res), [], 'no silent partial payment');
    assert.equal(rejected(res, 'coin.gift').length, 1);
});

// ------------------------------------------------------------------------------------------------ payment direction
const T50 = R[99];
const t50Context = (state = T50.state) => guardContext(state, content, buildCatalog(state, content, { known: true, c: true }));

test('.138 T50: "I\'ll take that fifty copper now" pays nobody, also with enough coin', () => {
    assert.equal(T50.commands[0].type, 'pay');
    const rich = structuredClone(T50.state);
    rich.entities.pc.sheet.coin_cp = 200;
    // red on .137: the command layer pays it whenever the guard lets it through
    const events = [];
    resolveCommands(structuredClone(rich), content, T50.commands, (e) => events.push(e), { c: true, msg: 99 });
    assert.deepEqual(events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta), [-50]);
    const g = guardCommands(T50.message, T50.commands, t50Context(rich));
    assert.deepEqual(g.kept, []);
    assert.deepEqual(g.dropped.map((d) => d.rule), ['not_paying']);
});

test('.138 payment direction: his own payments stay possible; claims for money owed to him are no pay', () => {
    const tam = T50.commands[0].to;
    const pay = (quote, message = quote) => guardCommands(message, [{ seq: 1, type: 'pay', to: tam, amount_cp: 5, for: null, quote }], t50Context());
    for (const q of ['I pay him five copper for his trouble', 'I hand Tam five copper', 'I toss him five copper', 'Here are five copper, Tam', 'Take these five coins, Tam', 'I leave five copper on the crate for him', 'I settle up with Tam: five copper', 'I give back the five copper I owe him'])
        assert.equal(pay(q).kept.length, 1, q);
    for (const q of ["I'll take that fifty copper now", 'Pay up, Tam', 'Pay me the five copper', 'I collect my wages now', 'Give me my five copper', 'You owe me five copper'])
        assert.equal(pay(q).kept.length, 0, q);
    // review of .138: leaving or pocketing a receipt is no payment beside a claim for his wage
    for (const q of ["I'll take my fifty copper and leave.", 'Pay me fifty copper, then I leave.', 'I collect my wages and put the receipt in my bag.'])
        assert.equal(pay(q).kept.length, 0, q);
    // second review: an ambiguous verb is no money act; the act must move money
    for (const q of ['I settle on the bench and collect my fifty copper.', 'I pay attention to Tam and collect my fifty copper.', 'I tip my hat to Tam and collect my wages.'])
        assert.equal(pay(q).kept.length, 0, q);
    for (const q of ['I settle up with Tam: five copper', 'I settle the bill with five copper', 'I tip him five copper'])
        assert.equal(pay(q).kept.length, 1, q);
    // a separate tip after asking for his wage stays possible; the wrong pay to Tam in the same words does not ride on it
    const boy = (T50.state.scene.present || []).find((id) => id !== 'pc' && id !== tam);
    const both = 'I collect my wages and pay the porter a copper.';
    assert.equal(guardCommands(both, [{ seq: 1, type: 'pay', to: tam, amount_cp: 50, for: null, quote: both }], t50Context()).kept.length, 0);
    if (boy) assert.equal(guardCommands(both, [{ seq: 1, type: 'pay', to: boy, amount_cp: 1, for: null, quote: 'pay the porter a copper' }], t50Context()).kept.length, 1);
    assert.equal(pay('I put five copper on the crate for him').kept.length, 1);
    assert.equal(pay('I give him one silver and five copper', 'I give him one silver and five copper').kept.length, 0, 'another amount than the command’s is not this payment');
    // a quote without the act in a message that pays: the message's act stands, unless the quote claims money for him
    assert.equal(pay('the five copper', 'I agree to the fee and pay the five copper.').kept.length, 1);
    assert.equal(pay("I'll take my five copper now", "I'll take my five copper now and pay the boy a copper.").kept.length, 0);
    assert.equal(paysOut('I refuse to pay'), true, 'negation is the existing negation rule, not this one');
});

// ------------------------------------------------------------------------------------------------ clarification
test('.138 T62 (#123): a known price conflict is named in the safe clarification; nothing is executed', async () => {
    const s = R[123].state;
    const catalog = buildCatalog(s, content, { known: true, c: true });
    const ctx = withContentSkills(planContext(s, content, catalog), content, s);
    const first = parsePlan(R[123].plan_raw[0], content.commandVocab, ctx, R[123].message);
    assert.equal(first.tradeConflict, true);
    assert.match(first.tradeNote, /standing bid is 4 Copper for 14 × F-Rank Crystal Beetle Chitin Plate; you named 5 Silver 6 Copper\. Nothing changed hands\./);
    const answers = [...R[123].plan_raw];
    const p = await planMessage(async () => answers.shift(), content, ctx, R[123].message);
    assert.equal(p.commands.length, 1);
    assert.equal(p.commands[0].type, 'clarify');
    assert.equal(p.commands[0].question, first.tradeNote);
    assert.doesNotMatch(p.commands[0].question, /agreed_cp|\$\.commands/);
});

test('.138 clarification: the general question stays for a conflict without a known price', async () => {
    const s = R[123].state;
    const ctx = withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s);
    const offer = Object.values(s.offers).find((o) => o.bid && o.status === 'open');
    const answer = JSON.stringify({ commands: [{ seq: 1, type: 'offer.accept', offer: offer.id, lines: null, qty: null, party_words: 'Bram', agreed_cp: null, quote: 'I accept' }] });
    const answers = [answer, answer];
    const p = await planMessage(async () => answers.shift(), content, ctx, 'I accept');
    assert.match(p.commands[0].question, /^Do you buy or sell, which goods, with whom, and at what total price\?/);
    assert.match(priceConflictNote({ seller: 'Doss, the steward', bid: false, lines: [{ what: 'Rope', qty: 1 }] }, 20, 15, content.rules.currency), /^Doss's standing offer is 2 Silver for Rope; you named 1 Silver 5 Copper/);
});

// ------------------------------------------------------------------------------------------------ sale stays sale
const issues = (i, raw = R[i].raw) => {
    const s = R[i].state;
    const ids = { places: Object.keys(s.places), quests: Object.keys(s.quests || {}), objects: Object.keys(s.objects || {}) };
    return parseExtraction(JSON.stringify(raw), worldVocab(content.deltaVocab, s), ids, R[i].expected_keys, { sceneRequired: true, startScene: s.scene.at, state: s, content, explicitArrivals: true })
        .issues.filter((x) => /goods Alaric sells/.test(x.why));
};

test('.138 extractor: sale proceeds reported as coin.gift ask the existing repair for the bid (crystal T26/T29/T32, T58, #382)', () => {
    for (const i of [52, 58, 64, 116, 382]) assert.equal(issues(i).length, 1, `#${i}`);
    // a recount, a thanks beside the sale and a bid that covers the goods ask nothing
    const recount = structuredClone(R[64].raw);
    recount.deltas.find((d) => d.type === 'coin.gift').repeat_of = 'credit.26.7fc89b24';
    assert.equal(issues(64, recount).length, 0);
    const thanks = structuredClone(R[64].raw);
    Object.assign(thanks.deltas.find((d) => d.type === 'coin.gift'), { why: 'thanks for the clean work on the shard' });
    assert.equal(issues(64, thanks).length, 0);
    const covered = structuredClone(R[64].raw);
    const shard = Object.values(R[64].state.objects).find((o) => o.holder?.entity === 'pc' && /crystal shard/.test(o.name));
    covered.deltas.push({ scene: null, seq: 9, type: 'bid', buyer: 'npc.doss', lines: [{ object: shard.id, qty: 1 }], price_cp: 100, said: 'Ten silver, as agreed.' });
    assert.equal(issues(64, covered).length, 0);
});

test('.138 #382: the bid is created at 150 cp and the gift beside it pays nothing; his explicit acceptance then pays 150 exactly once', () => {
    const raw = structuredClone(R[382].raw);
    const gift = raw.deltas.find((d) => d.type === 'coin.gift');
    raw.deltas.push({ scene: null, seq: 9, type: 'bid', buyer: gift.from, lines: [{ object: 'obj.loot.bog_strider.chitin.f', qty: 15 }, { object: 'obj.loot.bog_strider.venom.f', qty: 4 }], price_cp: 150, said: gift.said });
    const res = applyWorld(structuredClone(R[382].state), content, raw, { msg: 382, prose: R[382].prose });
    const [o] = offers(res);
    assert.equal(o.price_cp, 150);
    assert.deepEqual(o.lines.map((l) => l.qty), [15, 4]);
    // the reply itself completes no sale: the planner wrote 150 cp as minimum of each of the two positions (300 together),
    // so the bid stays open; nothing is paid in this reply
    assert.deepEqual(coin(res), []);
    assert.equal(res.events.some((e) => e.t === 'transaction.completed'), false);
    assert.equal(rejected(res, 'coin.gift').length, 1, 'the gift is no payment');
    const s = res.state;
    const before = s.entities.pc.sheet.coin_cp;
    const c = { seq: 1, type: 'offer.accept', offer: o.id, lines: null, qty: null, party_words: null, agreed_cp: 150, quote: 'I accept the 150 copper for the plates and glands.' };
    const events = [];
    resolveCommands(s, content, [c], (e) => { events.push(e); applyEvent(s, e); }, { c: true, msg: 383 });
    assert.equal(s.entities.pc.sheet.coin_cp, before + 150);
    assert.equal(events.filter((e) => e.t === 'transaction.completed').length, 1);
    const again = [];
    resolveCommands(s, content, [{ ...c, seq: 2 }], (e) => { again.push(e); applyEvent(s, e); }, { c: true, msg: 384 });
    assert.equal(again.filter((e) => e.t === 'coin.changed').length, 0, 'sold once');
});

test('.138 refusal reasons claim no payment that did not happen (T26 and T32 of the crystal shard)', () => {
    const t26 = rejected(world(52), 'coin.gift')[0].d.reason;
    assert.doesNotMatch(t26, /booked this turn/);
    assert.match(t26, /accepted bid/);
    const t32 = rejected(world(64), 'coin.gift')[0].d.reason;
    assert.doesNotMatch(t32, /these sale proceeds are already in his purse/);
    assert.match(t32, /F-Rank Crystal Beetle Chitin Plate.*34 cp/);
});

test('.138 review: an original bid under an open condition stores no binding price; the payment choice alone does', () => {
    for (const [said, want] of [['Four copper each, fifty-six copper total, if the appraiser approves.', null], ['Four copper each, if you want cash and the appraiser approves.', null],
        ['Four copper each, if you want cash, and the appraiser approves.', null], ['If the appraiser approves, four copper each, fifty-six copper total.', null],
        ['Four copper each, if you finish the work tomorrow.', null], ['Four copper each, if you want the coin more than the credit.', 56]]) {
        const raw = structuredClone(R[116].raw);
        const bid = raw.deltas.find((d) => d.type === 'bid');
        const prose = R[116].prose.replace(bid.said, said);
        bid.said = said;
        const res = applyWorld(structuredClone(R[116].state), content, raw, { msg: 116, prose });
        assert.deepEqual(offers(res).map((o) => o.price_cp), want === null ? [] : [want], said);
        assert.deepEqual(coin(res), [], said);
    }
});

// ------------------------------------------------------------------------------------------------ amount of the act
test('.139 corpus b17-rogue#19: "I have three silver—I\'ll give two to Bree" pays the 20 cp of the act, not the 30 cp he holds', async () => {
    const R = await import('../../tools/replay/replay.mjs');
    const { prepareGenerationAsync } = await import('../../src/v4/runtime.js');
    const { rec } = await import('../../src/host.js');
    const run = R.loadRun('b17-rogue');
    const answers = run.answers[19].map((a) => a.content);
    assert.deepEqual(answers.map((a) => JSON.parse(a).commands[0].amount_cp), [20, 30], 'recorded: 20 first, the repair 30');
    const chat = run.chat.slice(0, 20);
    chat[19] = structuredClone(chat[19]);
    delete chat[19].extra.avereth;
    const asked = [];
    await prepareGenerationAsync(chat, content, { type: 'normal', settings: {}, llm: async ({ purpose }) => { asked.push(purpose); return answers.shift(); } });
    const r = rec(chat[19]);
    assert.deepEqual(asked, ['plan'], 'the correct first answer stands; no repair toward his purse');
    assert.deepEqual(r.events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta), [-20]);
    // the planner's amount check and the guard read the same act
    const { amountErrors } = await import('../../src/v4/interpret.js');
    const quote = "I have three silver—I'll give two to Bree for the days she can't work";
    const cmd = (amount_cp) => [{ seq: 1, type: 'pay', to: 'npc.bree', amount_cp, for: null, quote }];
    assert.deepEqual(amountErrors(cmd(20), content.rules.currency), []);
    assert.equal(amountErrors(cmd(30), content.rules.currency).length, 1);
    const ctx = { present: [{ id: 'npc.bree', names: ['Bree'] }], currency: content.rules.currency };
    assert.equal(guardCommands(quote, cmd(30), ctx).kept.length, 0, 'the 30 cp he holds are not what he gives');
    assert.equal(guardCommands(quote, cmd(20), ctx).kept.length, 1);
});
