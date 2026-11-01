// Build .138 (finance patch): price reading, complete handovers and payment direction, from the originals of
// testrun_10b/batch-20261031-140346Z (warrior, build .137) and the review there (§7/§8). The fixture holds the state
// folded from the stored events before each record and the recorded model answers; nothing is re-asked.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { applyWorldLegacy as applyWorld, legacyCommands } from './finance_legacy.js'; // Build .142: recorded pre-delta-1.13/cmd-1.8 answers
import { applyEvent } from '../../src/state.js';
import { applyWorld as applyWorldNow } from '../../src/v4/world.js';
import { sameGoods, rateUnits, acceptanceWhy } from '../../src/v4/trade.js';
import { financeText } from '../../tools/replay/contract_f.mjs';
import { priceEvidence, openConditionNear, payArgument, findQuote } from '../../src/v4/finance_evidence.js';
import { coinEvidence } from '../../src/economy.js';
import { guardCommands } from '../../src/v4/agency.js';
import { guardContext, buildCatalog } from '../../src/v4/catalog.js';
import { resolveCommandsLegacy as resolveCommands } from './finance_legacy.js';
import { planContext, withContentSkills, parsePlan, priceConflictNote } from '../../src/v4/planner.js';
import { planMessage } from '../../src/v4/runtime.js';
import { parseExtraction, worldVocab } from '../../src/v4/extract.js';

const content = await loadProductContent();
// Build .142 (finance consolidation): the recorded answers of these chains predate the finance contract; they run through
// the disclosed translation (tests/v4/finance_legacy.js → tools/replay/contract_f.mjs). The readers .138–.141 tested
// directly (tradePrice's NPC mode, agency.paysOut) are removed; their phrases are checked here against the readers
// that replace them (finance_evidence.priceEvidence / openConditionNear / payArgument). Fresh-answer classification:
// tests/v4/fix142_finance.test.js.
const FIX = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/batch20_finance138.json.gz', import.meta.url))));
const R = FIX.records;
const world = (i, raw = R[i].raw) => applyWorld(structuredClone(R[i].state), content, structuredClone(raw), { msg: Number(i), prose: R[i].prose });
const offers = (res) => res.events.filter((e) => e.t === 'offer.created').map((e) => e.d.offer);
const rejected = (res, type) => res.events.filter((e) => e.t === 'delta.rejected' && e.d.item.type === type);
const coin = (res) => res.events.filter((e) => e.t === 'coin.changed').map((e) => e.d.delta);
// Build .142: the reading of another's price words is the role the answer gives them (pricing), verified against the
// words; an open condition around them makes it non-binding (open:…)
const T = (quote) => ({ basis: 'total', quote, currency_quote: null }), U = (quote) => ({ basis: 'unit', quote, currency_quote: null });
function read(said, units, pricing, goods = []) {
    const ev = priceEvidence(pricing, { source: said, within: findQuote(said, said), content, units, goods });
    if (ev.state !== 'verified') return null;
    const at = ev.source?.ranges?.[0];
    return at && openConditionNear(said, at.start, at.end) ? `open:${ev.cp}` : ev.cp;
}
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

// Build .144 (S2): a rate per piece for several pieces is no binding bid (no 28, no 4); a total the reply names is
// ("fifty-six the lot", the coin word of its sentence). The recorded old answers report the rate: they now store no
// bid and the engine asks for the total; a fresh answer with the total stores 56 and sells once.
// plan §7.1: the total carries its own coin word; "fifty-six the lot" (copper taken from the sentence) binds nothing
const fresh116 = (own = true) => {
    const raw = structuredClone(R[116].raw);
    const bid = raw.deltas.find((d) => d.type === 'bid');
    const said = own ? bid.said.replace('fifty-six the lot', 'fifty-six copper the lot') : bid.said;
    Object.assign(bid, { said, phase: 'firm', condition: null, pricing: own ? { basis: 'total', quote: 'fifty-six copper', currency_quote: null } : { basis: 'total', quote: 'fifty-six', currency_quote: 'copper' } });
    return applyWorldNow(structuredClone(R[116].state), content, raw, { msg: 116, prose: R[116].prose.replace(R[116].raw.deltas.find((d) => d.type === 'bid').said, said) });
};
test('.138 #110/T55 (.144): "four copper each" for seven is no binding bid; the total is asked for; nothing credited', () => {
    assert.ok(R[110].original.some((e) => e.t === 'delta.rejected' && e.d.item.type === 'bid'), '.137 refused it');
    const res = world(110);
    assert.deepEqual(offers(res).filter((o) => o.terms === 'firm' || o.terms === undefined), []);
    assert.ok(res.system.some((x) => /^PRICE OPEN — /.test(x)), res.system.join('\n'));
    assert.deepEqual(coin(res), []);
    assert.equal(res.events.some((e) => /credit/.test(e.t)), false);
});

test('.138 #116/T58 (.144): "fifty-six copper the lot" stores 56 cp for fourteen, never the 4 cp shadow price; the recorded words bind nothing', () => {
    assert.equal(R[116].original.find((e) => e.t === 'offer.created').d.offer.price_cp, 4, '.137 stored 4 cp');
    assert.deepEqual(offers(world(116)).filter((o) => o.terms === 'firm' || o.terms === undefined).map((o) => o.price_cp), [], 'the recorded rate answer: no bid');
    assert.deepEqual(offers(fresh116(false)).filter((o) => o.terms === 'firm' || o.terms === undefined).map((o) => o.price_cp), [], 'the recorded "fifty-six the lot" has no coin of its own');
    const res = fresh116();
    const [o] = offers(res);
    assert.equal(o.price_cp, 56);
    assert.deepEqual(o.lines.map((l) => [l.object, l.qty]), [[ENC40, 14]]);
    // the narrated seven-plate sale of the same reply stays unpaid: a gift and a sale summary are no sale
    assert.equal(rejected(res, 'coin.gift').length, 1);
    assert.match(rejected(res, 'expected')[0].d.reason, /accepted matching bid/);
    assert.deepEqual(coin(res), []);
});

test('.138 T62 after #116: his 56 cp acceptance of the stored bid books exactly 14 plates for 56 cp, once', () => {
    const s = fresh116().state;
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
// Build .144 (S2): a rate per piece for several pieces is no price any more (total_required); totals, equivalent coins,
// other sums and conditions read as before
test('.138 price reading (.144 totals only): confirmed totals, equivalent coins, other sums and conditions; a rate × units binds nothing', () => {
    for (const [said, total] of [['Fifty-six copper for the fourteen, if the appraiser approves.', 'Fifty-six copper'], ['Fifty-six copper for the fourteen, unless they are chipped.', 'Fifty-six copper'], ['Fifty-six copper for the fourteen, if you finish the work tomorrow.', 'Fifty-six copper']])
        assert.equal(read(said, 14, T(total)), 'open:56', said);
    assert.equal(read('Fifty-six copper for the fourteen, if you would rather have coin than credit.', 14, T('Fifty-six copper')), 56, 'a payment choice is no price condition');
    assert.equal(read('Four copper each, fifty-six copper total.', 14, T('fifty-six copper')), 56);
    assert.equal(read('Four copper each, fifty-six copper total.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, fifty-six copper total.', 14, T('Four copper')), null, 'the unit price is no total of fourteen (gate 2)');
    assert.equal(read("I'll give you four copper each. That's eighty-four copper.", 21, T('eighty-four copper')), 84);
    assert.equal(read("140 copper — that's 1 gold 4 silver", 1, T('140 copper')), 140, 'one sum said twice counts once');
    assert.equal(read('The sword costs 140 copper; I have 193 copper.', 1, T('140 copper')), 140, 'his purse is no part of the price');
    assert.equal(read('Four copper each, and the gland I had at six copper.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, if the appraiser approves.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, unless they are chipped.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, if you would rather have coin than credit.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, fifty-six copper total, if the appraiser approves.', 14, T('fifty-six copper')), 'open:56');
    assert.equal(read('Four copper each, if you want cash and the appraiser approves.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Fifty-six copper the lot, if you want coin or credit.', 14, T('Fifty-six copper')), 56);
    assert.equal(read('If the appraiser approves, four copper each, fifty-six copper total.', 14, T('fifty-six copper')), 'open:56');
    assert.equal(read('Four copper each, if you finish the work tomorrow.', 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read("Thirty-four copper the lot, if you're leaving them together", 4, T('Thirty-four copper')), 34);
    assert.equal(read("A copper a bowl, if you're wanting it", 1, T('A copper')), 1);
    assert.equal(read("Four copper a plate, if you want them, and I'll take all fourteen.", 14, U('Four copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Four copper each, but fifty copper for the lot.', 14, T('fifty copper')), 50, 'an explicit lot price may differ from the rate');
    assert.equal(read("If they're all of a match, I'd give you eight copper apiece. Fifty-six the lot.", 7, U('eight copper')), null, '.144: a rate per piece for several pieces binds nothing');
    assert.equal(read('Two silver a fair deal.', 3, T('Two silver')), 20, '.107: a judgement is no rate');
    assert.equal(read('Five silver the pair.', 2, T('Five silver')), 50);
    assert.equal(read('Plates at four copper each, so twenty-four for the six. Gland at six. Gel at four.', 0, U('four copper')), null, 'different goods never share one rate');
    assert.equal(read('A copper or two per plate.', 4, U('A copper')), null, 'a range is no price');
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
    // Build .142: the handler itself reads the act (payArgument) – a claim for his own money pays nobody, whether or not
    // a guard ran before it (.137 paid −50 here whenever the guard let it through)
    const events = [];
    const ctx = resolveCommands(structuredClone(rich), content, T50.commands, (e) => events.push(e), { c: true, msg: 99, text: T50.message });
    assert.deepEqual(events.filter((e) => e.t === 'coin.changed'), []);
    assert.equal(ctx.resolutions[0].status, 'refused');
    const g = guardCommands(T50.message, legacyCommands(T50.commands, content), t50Context(rich));
    assert.deepEqual(g.kept, []);
    assert.deepEqual(g.dropped.map((d) => d.rule), ['not_paying']);
});

test('.138 payment direction (now .142 payArgument): his own payments stay possible; claims for money owed to him are no pay', () => {
    const tam = T50.commands[0].to;
    const present = (T50.state.scene.present || []).filter((id) => id !== 'pc' && T50.state.entities[id]).map((id) => ({ id, names: [T50.state.entities[id].name, ...(T50.state.entities[id].descriptors || [])].filter(Boolean) }));
    // the money words a fresh answer names (cmd-1.8 money), read in the whole act
    const act = (message, money = 'five copper', amount = 5, to = tam) => payArgument(message, { to, amount_cp: amount, quote: message, money: money ? { quote: money, currency_quote: null } : null }, { content, present }).act;
    for (const q of ['I pay him five copper for his trouble', 'I hand Tam five copper', 'I toss him five copper', 'Here are five copper, Tam', 'Take these five copper, Tam', 'I tip him five copper', 'I put five copper on the counter for him'])
        assert.equal(act(q), 'outgoing', q);
    for (const q of ["I'll take that five copper now", 'Pay me the five copper', 'Give me my five copper', 'You owe me five copper'])
        assert.equal(act(q), 'claim', q);
    for (const q of ['Pay up, Tam', 'I collect my wages now']) assert.equal(act(q, null), 'claim', q);
    // outside the narrow core: no payment now, a concrete proposal (§5.2) – never a payment because a verb and a number stand somewhere
    for (const q of ['I leave five copper on the crate for him', 'I put five copper on the crate for him', 'I settle up with Tam: five copper'])
        assert.equal(act(q), 'unclear', q);
    assert.equal(act('I give back the five copper I owe him'), 'outgoing');
    // another amount than the command's is not this payment
    assert.equal(payArgument('I give him one silver and five copper', { to: tam, amount_cp: 5, quote: 'I give him one silver and five copper', money: { quote: 'one silver and five copper', currency_quote: null } }, { content, present }).state, 'contradicted');
    // a separate tip after asking for his wage stays possible; the claim does not ride on it
    const boy = present.find((p) => p.id !== tam);
    const both = 'I collect my wages and pay the porter a copper.';
    assert.equal(guardCommands(both, [{ seq: 1, type: 'pay', to: tam, amount_cp: 50, for: null, quote: both, money: null, recipient_quote: null }], t50Context()).kept.length, 0);
    if (boy) assert.equal(guardCommands(both, [{ seq: 1, type: 'pay', to: boy.id, amount_cp: 1, for: null, quote: 'pay the porter a copper', money: { quote: 'a copper', currency_quote: null }, recipient_quote: null }], t50Context()).kept.length, 1);
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
    // Build .142: the recorded answers cannot say what the coin is for (translated relation "unclear") – the refusal says
    // so and claims no booking; a fresh answer's relation gives the concrete reason
    for (const i of [52, 64]) {
        const why = rejected(world(i), 'coin.gift')[0].d.reason;
        assert.doesNotMatch(why, /booked this turn|already in his purse/, `#${i}`);
    }
    const fresh = (i, relation) => {
        const raw = structuredClone(R[i].raw);
        const g = raw.deltas.find((d) => d.type === 'coin.gift');
        Object.assign(g, { phase: 'transferred', relation, money: { quote: g.said, currency_quote: null } });
        return rejected(applyWorld(structuredClone(R[i].state), content, raw, { msg: i, prose: R[i].prose }), 'coin.gift')[0]?.d.reason;
    };
    assert.match(fresh(52, 'trade_settlement'), /accepted bid/);
    assert.doesNotMatch(fresh(52, 'trade_settlement'), /booked this turn/);
    // reported as independent while its own why names the goods: T26 the shard he still holds, T32 the sale credited
    assert.match(fresh(52, 'independent'), /crystal shard, which Alaric still holds.*accepted bid/);
    assert.match(fresh(64, 'independent'), /F-Rank Crystal Beetle Chitin Plate.*34 cp/);
});

test('.138 review: an original bid under an open condition stores no binding price; the payment choice alone does', () => {
    for (const [said, want] of [['Four copper each, fifty-six copper total, if the appraiser approves.', null], ['Four copper each, if you want cash and the appraiser approves.', null],
        ['Four copper each, if you want cash, and the appraiser approves.', null], ['If the appraiser approves, four copper each, fifty-six copper total.', null],
        ['Four copper each, if you finish the work tomorrow.', null], ['Four copper each, if you want the coin more than the credit.', null],
        // Build .144 (S2): the same conditions around the total; only the plain payment choice binds
        ['Fifty-six copper for the fourteen, if the appraiser approves.', null], ['Fifty-six copper for the fourteen, if you finish the work tomorrow.', null],
        ['Fifty-six copper for the fourteen, if you want the coin more than the credit.', 56]]) {
        const raw = structuredClone(R[116].raw);
        const bid = raw.deltas.find((d) => d.type === 'bid');
        const prose = R[116].prose.replace(bid.said, said);
        bid.said = said;
        if (said.startsWith('Fifty-six')) Object.assign(bid, { phase: /appraiser|tomorrow/.test(said) ? 'conditional' : 'firm', condition: /appraiser|tomorrow/.test(said) ? 'a condition' : null, pricing: { basis: 'total', quote: 'Fifty-six copper', currency_quote: null } });
        const res = (said.startsWith('Fifty-six') ? applyWorldNow : applyWorld)(structuredClone(R[116].state), content, raw, { msg: 116, prose });
        // Build .142 (§6.1): a price under an open condition may stay visible, but never binding (terms not firm)
        const firm = offers(res).filter((o) => o.terms === 'firm');
        assert.deepEqual(firm.map((o) => o.price_cp), want === null ? [] : [want], said);
        assert.deepEqual(coin(res), [], said);
    }
});

// ------------------------------------------------------------------------------------------------ amount of the act
test('.139 corpus b17-rogue#19: "I have three silver—I\'ll give two to Bree" pays the 20 cp of the act, not the 30 cp he holds', async () => {
    const RP = await import('../../tools/replay/replay.mjs');
    const { prepareGenerationAsync } = await import('../../src/v4/runtime.js');
    const { rec } = await import('../../src/host.js');
    const run = RP.loadRun('b17-rogue');
    const recorded = run.answers[19].map((a) => a.content);
    assert.deepEqual(recorded.map((a) => JSON.parse(a).commands[0].amount_cp), [20, 30], 'recorded: 20 first, the repair 30');
    const play = async (answer) => {
        const chat = run.chat.slice(0, 20);
        chat[19] = structuredClone(chat[19]);
        delete chat[19].extra.avereth;
        const answers = [...answer], asked = [];
        await prepareGenerationAsync(chat, content, { type: 'normal', settings: {}, llm: async ({ purpose }) => { asked.push(purpose); return answers.shift(); } });
        return { asked, r: rec(chat[19]) };
    };
    // Build .142: the recorded answers through the disclosed translation: "two" takes the one coin of its sentence
    // (§3.2, the Bree rule: money "two", currency_quote "silver") – the first answer stands, he pays the 20 cp of his act
    const old = await play(recorded.map((a) => financeText(a, 'plan', null, content, { message: run.chat[19].mes })));
    assert.deepEqual(old.asked, ['plan'], 'the first answer stands; no repair toward his purse');
    // Build .144 (S1): the act is a payment card of exactly 20 cp, paid only by his #pay; no coin moves from words
    const card = (r) => r.events.filter((e) => e.t === 'decision.opened' && e.d.decision.state === 'needs_confirmation').map((e) => e.d.decision.amount_cp);
    assert.deepEqual(old.r.events.filter((e) => e.t === 'coin.changed'), []);
    assert.deepEqual(card(old.r), [20]);
    // the recorded repair alone (the three silver he holds, 30 cp) is valid, but not the coin of his act: nothing paid
    const repairOnly = await play([financeText(recorded[1], 'plan', null, content, { message: run.chat[19].mes })]);
    assert.deepEqual(repairOnly.r.events.filter((e) => e.t === 'coin.changed'), []);
    // the recorded repair carries no money words for its 30 cp: at most the planner's visible card, never a debit
    // the same first answer in the finance contract: "two" with the sentence's coin (currency_quote) pays 20 at once
    const fresh = JSON.parse(recorded[0]);
    Object.assign(fresh.commands[0], { money: { quote: 'two', currency_quote: 'silver' }, recipient_quote: 'Bree' });
    const now = await play([JSON.stringify(fresh)]);
    assert.deepEqual(now.asked, ['plan']);
    assert.deepEqual(card(now.r), [20]);
    // the planner's amount check and the handler read the same act
    const { amountErrors } = await import('../../src/v4/interpret.js');
    const quote = "I have three silver—I'll give two to Bree for the days she can't work";
    const cmd = (amount_cp) => [{ seq: 1, type: 'pay', to: 'npc.bree', amount_cp, for: null, quote, money: { quote: 'two', currency_quote: 'silver' }, recipient_quote: null }];
    const catalog = { present: [{ id: 'npc.bree', handle: 'Bree' }] };
    assert.deepEqual(amountErrors(cmd(20), content.rules.currency, catalog, quote), []);
    assert.equal(amountErrors(cmd(30), content.rules.currency, catalog, quote).length, 1, 'the 30 cp he holds are not what he gives');
});

// .141: a quantity of goods is not coin, and linked conditions retain their prerequisites.
test('.141 non-money acts never carry a pay, but cash and an inherited coin unit do', () => {
    const s = structuredClone(T50.state); s.entities.pc.sheet.coin_cp = 200;
    const ctx = t50Context(s);
    for (const quote of ['I give Tam two loaves and collect my fifty copper.', 'I put my hood up and collect my fifty copper.', 'I hand Tam two plates and collect my wages.']) {
        const g = guardCommands(quote, [{ ...T50.commands[0], quote }], ctx);
        const events = [];
        resolveCommands(structuredClone(s), content, g.kept, e => events.push(e), { c: true, text: quote });
        assert.equal(g.kept.length, 0, quote);
        assert.equal(events.some(e => e.t === 'coin.changed'), false, quote);
    }
    for (const quote of ['I hand Tam five copper.', 'I settle up with Tam: five copper', 'I settle up with Tam.'])
        assert.equal(guardCommands(quote, [{ ...T50.commands[0], amount_cp: 5, quote }], ctx).kept.length, 1, quote);
});

test('.141 all linked NPC conditions are checked, including speaker prerequisites and a second unless', () => {
    const quotes = [
        "Four copper each, if you want cash and I must obtain the appraiser's approval.",
        'Four copper each, if you want the coin, unless the plates are cracked.',
        'Four copper each, if you want cash and I must obtain approval for fifty-six copper.',
    ];
    for (const said of quotes) {
        const s = structuredClone(R[116].state), raw = structuredClone(R[116].raw);
        const bid = raw.deltas.find(d => d.type === 'bid');
        bid.said = said; raw.deltas = [bid]; raw.expected = {};
        s.decisions.push({ id: 'dec.review.sale', kind: 'sale', turn: s.turn, at: s.scene.at,
            seller: bid.buyer, object: bid.lines[0].object, qty: 14, min_cp: 56, seq: 1 });
        const res = applyWorld(s, content, raw, { msg: 116, prose: said });
        assert.deepEqual(offers(res).filter((o) => o.terms === 'firm'), [], said);
        assert.deepEqual(coin(res), [], said);
    }
    // Build .144 (S2): the payment choice is still no condition – but a rate per piece binds nothing; the total does
    assert.equal(read("Four copper each, if you want cash and I'll take all fourteen.", 14, U('Four copper')), null);
    assert.equal(read("Fifty-six copper for all fourteen, if you want cash.", 14, T('Fifty-six copper')), 56);
});
