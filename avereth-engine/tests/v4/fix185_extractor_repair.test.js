// Build .185 – Rogue T41–T43 (testrun_10b/npc-20261113-135417Z/REVIEW.md, recherche/PAYMENT_TIEFENANALYSE_183.md §2.1
// and §6 Z3.4, GPT Gegenreview: GO): three extractor answers in a row lost the envelope – the expected answers "1"/"2"
// at the top level, an offer as an object of its own without type and seq, own field names (price, unit, phase), no
// scene – and the one repair named only the first eight violations, not the form. The batch ZIP is not in the
// repository: the answers are rebuilt in the forms the review documents. The repair now carries the required JSON form
// (this turn's expected keys with their fields) and per violation what is missing, what does not exist and what the
// type has. The schema, the parse and the number of repairs are unchanged: the broken answer is still refused.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { parseExtraction, extractorRequest, repairForm } from '../../src/v4/extract.js';
import { campaign, say } from './patch8_lib.js';

const content = await loadProductContent();
const vocab = content.deltaVocab;
const KEYS = { 1: 'buy', 2: 'pay' };
// T41/T42 form: the answers on top, the offer without type/seq and with its own price words; T43 form: a delta with no
// type at all and an expected answer in a field the key does not have
const T41 = JSON.stringify({ 1: { bought: false, priced: true }, 2: { paid: false }, deltas: [{ type: 'offer', seller: 'npc.innkeeper', price: 7, unit: 'cp', phase: 'firm' }] });
const T43 = JSON.stringify({ scene: 'here', expected: { 1: { bought: false }, 2: { priced: true, taken_anyway: false } }, deltas: [{ offer: { seller: 'npc.innkeeper', price_cp: 7 } }] });
const FORM = 'Required form: {"scene": <place-ref or "here">, "expected": {"1": {"priced": true|false, "taken_anyway": true|false}, "2": {"priced": true|false, "taken_anyway": true|false}}, "deltas": [{"seq": 1, "type": "<one listed delta type>", <only that type\'s fields>}]}.';
const errorsOf = (raw, keys = KEYS) => parseExtraction(raw, vocab, {}, keys, { sceneRequired: true }).errors;
const repairText = (raw, keys = KEYS) => extractorRequest(vocab, { catalog: 'CATALOG: –', actions: 'none', expectedKeys: keys, reply: 'x' }, { previous: raw, errors: errorsOf(raw, keys) }).messages.at(-1).content;

test('.185 T41/T42 form: the repair gives the required form and names the misplaced answers and the offer\'s fields (.184: the errors only)', () => {
    const text = repairText(T41);
    assert.ok(text.startsWith('Your answer was not valid: $: unexpected property "1"'), 'the errors stay first');
    assert.ok(text.includes(FORM), text);
    assert.match(text, /To correct: "1", "2" are answers of "expected": put them inside "expected", never at the top level;/);
    assert.match(text, /deltas\[0\] \(offer\) lacks "seq", "lines"; has no field "price", "unit", "phase"; the fields of offer: "seq", "type", "seller", "lines"/);
    assert.match(text, /Keep what was valid; invent no field and no event\./);
});

test('.185 T43 form: a delta without type and an expected answer with a field its key does not have', () => {
    const text = repairText(T43);
    assert.ok(text.includes(FORM));
    assert.match(text, /expected "1" \(buy\) is \{"priced": true\|false, "taken_anyway": true\|false\}, without "bought"/);
    assert.match(text, /deltas\[0\] needs "seq" and "type" \(one of the listed delta types\), its fields beside them/);
    assert.doesNotMatch(text, /expected "2"/, 'a valid answer is not named');
});

test('.185 against: no schema loosening – the broken answers are still invalid, nothing is lifted or invented; no expected keys, no answers in the form', () => {
    for (const raw of [T41, T43]) {
        const p = parseExtraction(raw, vocab, {}, KEYS, { sceneRequired: true });
        assert.equal(p.valid && p.complete, false, raw);
    }
    assert.ok(errorsOf(T41).includes('$: unexpected property "1"'), 'a top-level answer is not read as expected');
    assert.equal(repairForm(vocab, {}, ['$.scene: actual narrative setting required for world changes']),
        ' Required form: {"scene": <place-ref or "here">, "expected": {}, "deltas": [{"seq": 1, "type": "<one listed delta type>", <only that type\'s fields>}]}. Keep what was valid; invent no field and no event.');
    const empty = extractorRequest(vocab, { catalog: '', actions: '', expectedKeys: KEYS, reply: 'x' }, { previous: '', errors: ['no JSON text'] }).messages.at(-1).content;
    assert.match(empty, /^Your previous answer was empty/, 'the empty-answer repair is unchanged');
});

/** A buy that leaves an open decision (expected key 1: buy), with the extractor's answers scripted. */
async function buying(answers) {
    const g = await campaign(content);
    const ask = g.llm, asked = [];
    g.llm = async (req) => {
        if (req.purpose.startsWith('extract')) { asked.push(req); return answers.shift() ?? null; }
        return ask(req);
    };
    await say(g, 'I buy a loaf of bread from the baker.', { type: 'buy', what: 'a loaf of bread', from: null, max_cp: null, any_price: false, qty: null, quote: 'I buy a loaf of bread from the baker.' });
    assert.deepEqual(g.state().last.outcome.expected_keys, { 1: 'buy' });
    const r = await g.reply('The baker wipes his hands. "Two copper the loaf," he says.');
    return { g, r, asked };
}

test('.185 host path: the repair after a T41-form answer carries the form; the corrected answer is applied (one repair)', async () => {
    const bad = JSON.stringify({ 1: { bought: false, priced: true }, deltas: [{ type: 'offer', seller: 'baker', price: 2, unit: 'cp' }] });
    const good = JSON.stringify({ scene: 'here', expected: { 1: { priced: true, taken_anyway: false } }, deltas: [] });
    const { r, asked } = await buying([bad, good]);
    assert.deepEqual(asked.map((x) => x.purpose), ['extract', 'extract_repair']);
    const repair = asked[1].messages.at(-1).content;
    assert.ok(repair.includes('Required form: {"scene": <place-ref or "here">, "expected": {"1": {"priced": true|false, "taken_anyway": true|false}}'), repair);
    assert.match(repair, /"1" is an answer of "expected": put it inside "expected", never at the top level/);
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
});

test('.185 host path against: a valid first answer asks no repair; two broken answers stay a failure (no third call)', async () => {
    const good = JSON.stringify({ scene: 'here', expected: { 1: { priced: true, taken_anyway: false } }, deltas: [] });
    const ok = await buying([good]);
    assert.deepEqual(ok.asked.map((x) => x.purpose), ['extract']);
    const bad = JSON.stringify({ 1: { bought: false }, deltas: [{ offer: { seller: 'baker' } }] });
    const ko = await buying([bad, bad, bad]);
    assert.deepEqual(ko.asked.map((x) => x.purpose), ['extract', 'extract_repair']);
    assert.notEqual(ko.r.record.extraction.status, 'applied');
});
