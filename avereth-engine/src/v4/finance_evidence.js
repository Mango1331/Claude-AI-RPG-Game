// Build .142 – finance consolidation (patch_plans_10b/PATCH_PAYMENT_CONSOLIDATION.md §3, §5.2): the one pure check of
// money claims against the text they come from. No state, no provider, no hidden chat history. It finds the words a
// claim quotes, reads their complete money group (economy.coinEvidence), and does only the calculation the claim
// names (since .144 S2 only one total; a unit price only for one unit). Every result says what it is:
//   verified      the amount is complete and carried by the named calculation;
//   missing       no source, no unique place of the words, or no amount in them (never "0 cp");
//   incomplete    the money continues ("and the silver", "then a fourth") or cannot be finished;
//   contradicted  the assigned figures disagree, so no single amount is left.
// Only verified can move money; the caller decides the rest (repair, clarification, nothing). Meaning – who pays whom,
// whether an offer binds – is the model's; this file only says whether its words carry its numbers. A weaker or
// missing result never falls back to a looser search of the whole text.
import { coinEvidence, numberRuns } from '../economy.js';

export const EVIDENCE = Object.freeze({ VERIFIED: 'verified', MISSING: 'missing', INCOMPLETE: 'incomplete', CONTRADICTED: 'contradicted' });
const result = (state, extra = {}) => ({ state, cp: null, reported_cp: null, reported_mismatch: false, reason: null, source: null, calculation: null, ...extra });

/** Letters and digits kept (lowercase, accents dropped), every other run one space; each kept place knows its raw offset. */
function view(text) {
    const raw = String(text ?? '');
    let flat = '';
    const at = [];
    let gap = true;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i].normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
        if (/^[a-z0-9]$/.test(ch)) { flat += ch; at.push(i); gap = false; }
        else if (!gap) { flat += ' '; at.push(i); gap = true; }
    }
    if (flat.endsWith(' ')) { flat = flat.slice(0, -1); at.pop(); }
    return { flat, at, raw };
}
const flatten = (text) => view(text).flat.trim();

/**
 * Where the quoted words stand in the source (raw offsets), searched inside `within` when given. Found once: found;
 * nowhere: missing; more than once: ambiguous (which act it belongs to is then not known).
 */
export function findQuote(source, quote, within = null) {
    if (within && (!Number.isInteger(within.start) || !Number.isInteger(within.end))) return { state: 'missing' };
    const q = flatten(quote);
    if (!q) return { state: 'missing' };
    const v = view(source);
    const hits = [];
    for (let k = v.flat.indexOf(q); k >= 0; k = v.flat.indexOf(q, k + 1)) {
        // whole words only
        if ((k > 0 && v.flat[k - 1] !== ' ') || (k + q.length < v.flat.length && v.flat[k + q.length] !== ' ')) continue;
        const start = v.at[k];
        const end = v.at[k + q.length - 1] + 1;
        if (start > 1 && /[-–]/.test(v.raw[start - 1]) && /[a-z0-9]/i.test(v.raw[start - 2])) continue;
        if (within && (start < within.start || end > within.end)) continue;
        hits.push({ start, end });
    }
    if (!hits.length) return { state: 'missing' };
    if (hits.length > 1) return { state: 'ambiguous', hits };
    return { state: 'found', ...hits[0] };
}

/** The sentence (raw range) around a range: from after the last . ! ? ; or line break before it to the next one. */
export function sentenceOf(source, start, end = start) {
    const raw = String(source ?? '');
    let a = start;
    while (a > 0 && !/[.!?;\n]/.test(raw[a - 1])) a--;
    let b = end;
    while (b < raw.length && !/[.!?;\n]/.test(raw[b])) b++;
    return { start: a, end: b };
}

const KIND = { copper: 'copper', coppers: 'copper', cp: 'copper', silver: 'silver', silvers: 'silver', gold: 'gold', golds: 'gold' };
const kindsIn = (text) => new Set([...String(text).toLowerCase().matchAll(/\b(copper|coppers|cp|silver|silvers|gold|golds)\b/g)].map((m) => KIND[m[1]]));
// the money goes on right after the quoted words: "three copper and the silver", "…, then a fourth added"
const NUMBER_WORD = String.raw`(?:\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|a\s+few|several)`;
const RANGE_AFTER = new RegExp(String.raw`^\s*(?:(?:or|to)\s+${NUMBER_WORD}\b|[-–]\s*\d|or\s+so\b|or\s+(?:more|less|thereabouts)\b)`, 'i');
const RANGE_BEFORE = new RegExp(String.raw`(?:\b${NUMBER_WORD}\s+(?:or|to)\s+|\d\s*[-–]\s*)$`, 'i');
const CONTINUES = /^\s*,?\s*(?:and|plus|with|then)\s+(?:(?:the|some|a|an|his|her|my|your|that|this|those|these|few|couple|another|more)\s+)*(?:gold|silver|copper|coins?|coppers|silvers|golds|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|more)\b/i;

/**
 * The complete money group a claim quotes. `currencyQuote` may name the coin of a bare number ("two") when the same
 * sentence names exactly one coin ("I have three silver—I'll give two"): the coin is inherited, never the number.
 */
export function moneyLiteral(source, quote, { content, currencyQuote = null, within = null, scope = null } = {}) {
    if (typeof quote !== 'string' || !quote.trim()) return result(EVIDENCE.MISSING, { reason: 'no_money_quote' });
    const q = findQuote(source, quote, within);
    // the same money words said more than once ("Seventeen copper for everything. … Seventeen copper, four pelts, nine
    // fangs. Done?") are that amount only if every place reads it alike; each place is kept for the later checks
    if (q.state === 'ambiguous') {
        const each = q.hits.map((h) => moneyLiteral(source, quote, { content, currencyQuote, within: h, scope: within }));
        if (each.every((r) => r.state === EVIDENCE.VERIFIED && r.cp === each[0].cp))
            return result(EVIDENCE.VERIFIED, { cp: each[0].cp, reason: each[0].reason, source: { ranges: each.flatMap((r) => r.source?.ranges || []), money: each.flatMap((r) => moneyRanges(r)) }, calculation: each[0].calculation });
        return result(EVIDENCE.MISSING, { reason: 'quote_ambiguous' });
    }
    if (q.state !== 'found') return result(EVIDENCE.MISSING, { reason: 'quote_not_found' });
    const raw = String(source);
    // A quoted prefix/suffix of one mixed-currency group is never a complete handover.
    const sen = sentenceOf(raw, q.start, q.end);
    for (const sum of coinEvidence(raw.slice(sen.start, sen.end), content).sums || []) {
        let start = sen.start + sum.raw_start;
        // A preceding goods count ("a fine one, forty copper") is not a coin constituent.
        if (start < q.start && !kindsIn(raw.slice(start, q.start)).size) start = q.start;
        let end = Math.min(sen.end, sen.start + sum.raw_end);
        while (end > start && /[^a-z0-9]/i.test(raw[end - 1])) end--;
        if (start < q.end && q.start < end && (start < q.start || end > q.end))
            return result(EVIDENCE.INCOMPLETE, { reason: 'partial_money_group', source: { ranges: [{ start, end }] } });
    }
    const text = raw.slice(q.start, q.end);
    const range = { start: q.start, end: q.end };
    const sentence = sentenceOf(raw, q.start, q.end);
    if (CONTINUES.test(raw.slice(q.end, sentence.end))) return result(EVIDENCE.INCOMPLETE, { reason: 'money_continues', source: { ranges: [range] } });
    // a range or an estimate is no single amount: "a copper or two per plate", "two to three silver", "five or so"
    if (RANGE_AFTER.test(raw.slice(q.end, sentence.end)) || RANGE_BEFORE.test(raw.slice(sentence.start, q.start)))
        return result(EVIDENCE.CONTRADICTED, { reason: 'price_range', source: { ranges: [range] } });
    const ev = coinEvidence(text, content);
    if (!ev.complete) return result(EVIDENCE.INCOMPLETE, { reason: 'money_incomplete', source: { ranges: [range] } });
    const sums = ev.sums || [];
    if (!sums.length) {
        const numbers = numberRuns(text);
        if (numbers.length !== 1) return result(EVIDENCE.MISSING, { reason: numbers.length ? 'several_numbers' : 'no_amount', source: { ranges: [range] } });
        if (typeof currencyQuote !== 'string' || !currencyQuote.trim()) return result(EVIDENCE.MISSING, { reason: 'currency_missing', source: { ranges: [range] } });
        // the coin of a bare number comes from its own sentence, or from the delta's own commercial words around it (its
        // said: "Plates at four copper each … Gland at six. Gel at four."), and only where exactly one coin kind stands
        const around = scope || within;
        const zone = around && around.start <= q.start && q.end <= around.end
            ? around : sentence;
        // the coin word may stand more than once there ("four copper … another copper"): it is the same coin
        const cq = findQuote(raw, currencyQuote, zone);
        const c = cq.state === 'ambiguous' ? cq.hits[0] : cq;
        const kinds = cq.state !== 'missing' ? kindsIn(raw.slice(c.start, c.end)) : new Set();
        if (kinds.size !== 1 || kindsIn(raw.slice(zone.start, zone.end)).size !== 1) return result(EVIDENCE.MISSING, { reason: 'currency_not_unique', source: { ranges: [range] } });
        const cp = coinEvidence(`${numbers[0]} ${[...kinds][0]}`, content).cp;
        return result(EVIDENCE.VERIFIED, { cp, reason: 'coin_from_sentence', source: { ranges: [range, { start: c.start, end: c.end }], money: [range] }, calculation: { basis: 'literal', amounts: [cp] } });
    }
    const values = [...new Set(sums.map((x) => x.cp))];
    // the same sum said twice ("eighty-four copper—eight silver and four") is that sum
    // coins of different kinds joined only by "and"/"plus" are one handful ("eight copper and a single silver piece" =
    // 18); anything else between them (a comma, a dash, "or", "that is") may be an equivalent, an alternative or
    // another price
    const gaps = sums.slice(1).map((x, i) => text.slice(sums[i].raw_end, x.raw_start));
    const units = sums.flatMap((x) => [...kindsIn(text.slice(x.raw_start, x.raw_end))]);
    const joined = sums.length > 1 && gaps.every((g) => /^\s+(?:and|plus)\s+$/i.test(g));
    if (joined && values.length > 1 && new Set(units).size === units.length && units.length === sums.length && ev.cp === sums.reduce((a, x) => a + x.cp, 0))
        return result(EVIDENCE.VERIFIED, { cp: ev.cp, reason: 'literal_handful', source: { ranges: [range] }, calculation: { basis: 'literal', amounts: sums.map((x) => x.cp) } });
    // "five copper and five copper" is no single reading (ten, or the same five twice): never the partial five
    if (joined && new Set(units).size !== units.length) return result(EVIDENCE.CONTRADICTED, { reason: 'several_amounts', source: { ranges: [range] }, calculation: { basis: 'literal', amounts: sums.map((x) => x.cp) } });
    if (values.length > 1) return result(EVIDENCE.CONTRADICTED, { reason: 'several_amounts', source: { ranges: [range] }, calculation: { basis: 'literal', amounts: values } });
    return result(EVIDENCE.VERIFIED, { cp: values[0], reason: 'literal', source: { ranges: [range] }, calculation: { basis: 'literal', amounts: values } });
}

/**
 * A price claim of the model against the reply (§3.3): basis total (the quoted money is the price of exactly this
 * lot or line), unit (only for one unit: its total) or unknown; a unit price for several units and the positions of a
 * lot are no price any more (Build .144 S2, total_required). `within`: the
 * place of the delta's own commercial words (`said`), searched first. The reported number is kept beside the result.
 */
// a rate right after the money ("four copper a plate", "two silver each", "one silver five a night", "per pelt"): those
// words make the literal a unit price, never the total of more than one unit (gate 2; §3.3 "14 × 4 cp = 56, a lot total
// of 4 is not proven by the unit price 4"). "a <noun>" counts only with a word of the goods themselves ("a fair deal" is
// no rate).
const RATE = /^\s*,?\s*(?:each|apiece|a\s+piece|per\s+[a-z'-]+|a\s+(?:head|night|day|week|hour|month)|(?:a|an|the|for\s+each|for\s+every)\s+([a-z'-]+))\b/i;
const stem = (w) => String(w).toLowerCase().replace(/(?:es|s)$/, '');
// the places of the money words themselves (not of the coin word a bare number takes from its sentence)
const moneyRanges = (r) => r?.source?.money || (r?.source?.ranges || []).slice(0, 1);
function rateAfter(source, end, goods = []) {
    const m = String(source ?? '').slice(end, end + 48).match(RATE);
    if (!m) return null;
    if (!m[1]) return m[0].trim();
    const words = new Set(goods.flatMap((g) => String(g || '').toLowerCase().split(/[^a-z]+/)).filter((x) => x.length > 2).map(stem));
    return words.has(stem(m[1])) || ['piece', 'unit', 'item'].includes(stem(m[1])) ? m[0].trim() : null;
}

export function priceEvidence(pricing, { source, content, units = 1, lines = null, reported = null, within = null, goods = [] } = {}) {
    const done = (r) => ({ ...r, reported_cp: Number.isInteger(reported) ? reported : null, reported_mismatch: r.state === EVIDENCE.VERIFIED && Number.isInteger(reported) && r.cp !== reported });
    if (!pricing || typeof pricing !== 'object' || !pricing.basis || pricing.basis === 'unknown') return done(result(EVIDENCE.MISSING, { reason: 'pricing_unknown' }));
    const literal = (p) => {
        const near = within ? moneyLiteral(source, p.quote, { content, currencyQuote: p.currency_quote ?? null, within }) : null;
        return near || result(EVIDENCE.MISSING, { reason: 'no_action_anchor' });
    };
    // Build .144 (finance simplification S2): a new price binds only as ONE total in its own words for exactly these
    // units. A price per unit is that total only for one unit; for more units, and for a sum of part prices
    // (positions), nothing is multiplied or added up from prose: the price stays open (total_required) until a total is
    // named. Stored engine prices and their arithmetic (trade.linePrice, pickLines) are not read here.
    if (pricing.basis === 'unit' && units !== 1) return done(result(EVIDENCE.MISSING, { reason: 'total_required' }));
    if (pricing.basis === 'positions') return done(result(EVIDENCE.MISSING, { reason: 'total_required' }));
    if (pricing.basis === 'total' || pricing.basis === 'unit') {
        const m = literal(pricing);
        if (m.state !== EVIDENCE.VERIFIED) return done(m);
        const rate = units !== 1 ? moneyRanges(m).map((r) => rateAfter(source, r.end, goods)).find(Boolean) ?? null : null;
        if (rate) return done(result(EVIDENCE.CONTRADICTED, { reason: 'unit_price_as_total', source: m.source, calculation: { basis: 'total', amounts: [m.cp], rate } }));
        return done({ ...m, calculation: { basis: 'total', amounts: [m.cp], quantities: [] } });
    }
    return done(result(EVIDENCE.MISSING, { reason: 'pricing_unknown' }));
}

/**
 * A condition the narration states around a price that the model may have missed (§4.2): only strong open-condition
 * words, in the sentence of the price and the next one. This can only make an offer non-binding (and ask the existing
 * repair); it never proves that an offer binds. A plain choice ("if you want it") is no such word.
 */
// connectors of a condition still to happen (an approval, a time, a delivery, an inspection: the cases reproduced on
// .141, §4.2), never a past one ("the appraiser approved yesterday") and never the addressee's own choice ("when you want")
// (a told past is no condition: "she said when he caught her eye", "once he had paid")
const PAST = String.raw`(?:[a-z]+ed|was|were|had|did|caught|saw|came|went|took|gave|said|paid|made|got|left|found|told|knew|brought|sold|bought|held|kept|set|put|ran|sat|stood|began|spoke|met|heard|felt|lay|led|meant|rose|fell|threw|wore|won|wrote|drew|grew|struck|swung|broke|chose|drove|ate|drank|hung|shook|spent|sent|built|lost|thought|caught)`;
const SUBJECT = String.raw`(?:the|he|she|they|it|i|we|my|his|her|our|their)`;
const OPEN_CONDITION = new RegExp(String.raw`\b(?:unless|pending|provided(?:\s+that)?|providing|assuming|subject\s+to|as\s+soon\s+as|depending\s+on|(?:once|after)\s+(?:${SUBJECT}|you)\b(?!\s+(?:[a-z'-]+\s+)?${PAST}\b)|when\s+${SUBJECT}\b(?!\s+(?:[a-z'-]+\s+)?${PAST}\b)|only\s+(?:if|for|when|once)\b|approv(?:e|es|al|ing)\b|tomorrow)\b`, 'i');
export function openConditionNear(source, start, end) {
    const raw = String(source ?? '');
    const a = sentenceOf(raw, start, end);
    // the next sentence carries a condition of this price only when it names no price of its own ("Fifty-six copper the
    // lot. The appraiser has to approve first." – but not "Core, two silver tonight or … when they come down")
    const following = a.end < raw.length ? sentenceOf(raw, Math.min(raw.length, a.end + 1)) : null;
    const next = following && !kindsIn(raw.slice(following.start, following.end)).size ? following : null;
    const text = raw.slice(a.start, next ? next.end : a.end);
    const m = text.match(OPEN_CONDITION);
    return m ? m[0] : null;
}

// --------------------------------------------------------------------------------------------------- outgoing coin
// §5.2: the narrow core of an act in which Alaric himself hands over coin, its money argument directly after the
// verb (and a recipient): "I pay Tam five copper", "give two to Bree", "here are the two silver", "tip the boy a
// copper". Anything else is not proven here and stays unclear for the handler (a concrete clarification), never a
// payment because some verb and some number stand somewhere in the message.
const GIVING = String.raw`(?:pay|pays|paying|paid|repay|repays|repaying|repaid|tip|tips|tipping|tipped|give|gives|giving|hand|hands|handing|toss|tosses|tossing|slide|slides|sliding|press|presses|pressing)`;
const LEAD = String.raw`(?:(?:^|[^a-z'])(?:i|we)\s+)?(?:(?:'ll|will|now|then|just|quickly|gladly|also|simply)\s+)*`;
const DET = String.raw`(?:(?:the|my|these|those|this|that|your|his|her|their)\s+)?`;
const HANDING = new RegExp(String.raw`(?:^|["“\s])(?:here(?:'s|\s+is|\s+are)|take\s+(?:this|these|them|it))\s*,?\s*${DET}$`, 'i');
// money a sentence claims for Alaric: "pay me", "I'll take that fifty copper", "collect my wages", "you owe me"
const CLAIM = /\b(?:pay|give|hand)\s+(?:me|us)\b|\bpay\s+up\b|\bowe[sd]?\s+(?:me|us)\b|\b(?:take|takes|taking|collect|collects|collecting|get|gets|getting|receive|receives|receiving|claim|claims|claiming|want|wants|need|needs|expect|expects)\b[^.;!?]{0,30}\b(?:coins?|coppers?|silvers?|golds?|cp|wages?|pay|payment|fee|money|reward|share|cut|due)\b/i;
const IMPERATIVE_TAKE = /(?:^|["“,.;!?:]\s*)take\s+(?:this|these|it|them|the|my)\b/gi;
export const claimsMoney = (text) => CLAIM.test(String(text || '').replace(/[‘’]/g, "'").replace(IMPERATIVE_TAKE, ' '));

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const label = (n) => String(n || '').toLowerCase().split(',')[0].replace(/^the\s+/, '').trim();

/**
 * Is `money.quote` the coin Alaric hands over in this act, to this payee, and for how much (§5)?
 * names: [{id, names[]}] of present people; payee: the command's `to`. Returns
 *   { state: verified|missing|incomplete|contradicted, act: outgoing|claim|other|unclear, cp, reason }.
 * `act: outgoing` only for the narrow core; `claim` when the act asks for his own money; `other` when it pays
 * someone else or another amount. A payment verb alone without money ("I pay for the room") is `act: will` with
 * state missing: a known obligation may give its price, never an invented one.
 */
export function payArgument(message, c, { content, present = [] } = {}) {
    const raw = String(message ?? '');
    const quoteAt = typeof c?.quote === 'string' ? findQuote(raw, c.quote) : { state: 'missing' };
    const within = quoteAt.state === 'found' ? quoteAt : null;
    const payee = (present.find((p) => p.id === c?.to)?.names || []).map(label).filter((n) => n.length >= 2);
    const others = present.filter((p) => p.id !== c?.to).flatMap((p) => p.names.map(label)).filter((n) => n.length >= 3 && !payee.includes(n));
    const recipientWords = String.raw`(?:him|her|them|you|it|${[...payee, ...others].map((n) => escape(n).replace(/\s+/g, '\\s+')).join('|') || 'x^'}|the\s+[a-z'-]+(?:\s+[a-z'-]+)?)`;
    // the particles of the same verbs ("hand over", "pay back", "give back") belong to them; no further verbs
    const CORE = new RegExp(String.raw`${LEAD}${GIVING}\s+(?:(?:back|over)\s+)?(?:${recipientWords}\s+)?(?:(?:back|over)\s+)?${DET}$`, 'i');
    const money = c?.money && typeof c.money === 'object' ? c.money : null;
    const actText = within ? raw.slice(within.start, within.end) : String(c?.quote || '');
    if (!within) return { state: EVIDENCE.MISSING, act: 'unclear', cp: null, reason: 'no_action_anchor' };
    if (!money) {
        const will = new RegExp(String.raw`(?:^|[^a-z'])(?:pay|pays|paying|repay|repays|settle\s+up|settle\s+(?:the|my)\s+(?:bill|debt|tab|account))\b(?!\s+(?:me|us|up|attention|heed|a\s+visit|respects?|mind|homage|no\s+mind)\b)`, 'i').test(actText);
        return { state: EVIDENCE.MISSING, act: claimsMoney(actText) ? 'claim' : will ? 'will' : 'unclear', cp: null, reason: 'no_money_argument' };
    }
    const m = findQuote(raw, money.quote, within) ;
    const at = within ? m : { state: 'missing' };
    if (at.state !== 'found') return { state: EVIDENCE.MISSING, act: claimsMoney(actText) ? 'claim' : 'unclear', cp: null, reason: at.state === 'ambiguous' ? 'money_ambiguous' : 'money_not_found' };
    const sentence = sentenceOf(raw, at.start, at.end);
    const lit = moneyLiteral(raw, money.quote, { content, currencyQuote: money.currency_quote ?? null, within: sentence });
    // the act around the money: from the clause start (last , ; — before the verb is allowed) to the clause end
    const before = raw.slice(sentence.start, at.start).toLowerCase().replace(/[‘’]/g, "'");
    const after = raw.slice(at.end, sentence.end).toLowerCase();
    const clauseAfter = after.split(/[,;—–]/)[0];
    const act = `${before} ${raw.slice(at.start, at.end)} ${clauseAfter}`;
    // coin laid down for the other side: "I put two silver on the counter", "slide the coins across the desk"
    const laid = new RegExp(String.raw`${LEAD}(?:put|puts|putting|place|places|placing|lay|lays|laying|set|sets|setting|push|pushes|pushing|slide|slides|sliding)\s+${DET}$`, 'i').test(before)
        && /^\s*(?:down\s+)?(?:on|onto|across|over)\s+(?:the|his|her|their)\s+(?:counter|desk|table|bar|board|ledger|tray)\b/.test(after);
    let kind = CORE.test(before) || HANDING.test(before) || laid ? 'outgoing' : 'unclear';
    // Positive argument boundary, not a blacklist of goods/material names.
    if (!/^\s*(?:(?:coins?|pieces?|fee|payment)\b\s*)?(?:$|[,;.!?—–*]|(?:to|for|toward|towards|on|onto|across|over|as|and|then|i|we)\b)/i.test(after)) kind = 'unclear';
    // into his own purse, or coin someone gave him: not his outgoing coin
    if (kind === 'outgoing' && (/^\s*(?:back\s+)?(?:in|into|to)\s+(?:my|myself|his own|her own)\b/.test(after) || /^\s*(?:that\s+|which\s+)?(?:he|she|they|you)\s+(?:gave|paid|handed)\s+(?:me|us)\b/.test(after))) kind = 'unclear';
    if (claimsMoney(act) && kind !== 'outgoing') kind = 'claim';
    if (c?.recipient_quote) {
        const r = findQuote(raw, c.recipient_quote, sentence);
        const words = r.state === 'found' ? label(raw.slice(r.start, r.end)) : null;
        if (!words || (payee.length && !payee.some((n) => words.includes(n) || n.includes(words)) && !/^(?:him|her|them|you)$/.test(words))) kind = kind === 'claim' ? 'claim' : 'other';
    }
    // the act pays someone else who is present and named, not the payee
    const actLow = act.toLowerCase();
    if (kind === 'outgoing' && others.some((n) => new RegExp(`\\b${escape(n)}\\b`).test(actLow)) && !payee.some((n) => new RegExp(`\\b${escape(n)}\\b`).test(actLow))) kind = 'other';
    if (lit.state !== EVIDENCE.VERIFIED) return { state: lit.state, act: kind, cp: null, reason: lit.reason };
    if (Number.isInteger(c?.amount_cp) && lit.cp !== c.amount_cp) return { state: EVIDENCE.CONTRADICTED, act: kind === 'outgoing' ? 'other' : kind, cp: lit.cp, reason: 'amount_differs' };
    return { state: EVIDENCE.VERIFIED, act: kind, cp: lit.cp, reason: lit.reason, source: { start: at.start, end: at.end } };
}

/** A player's own price words for a limit or an agreed price (§4.1): total or unit × the selected units. */
export function playerPrice(message, evidence, { content, units = 1, goods = [] } = {}) {
    if (!evidence || typeof evidence !== 'object') return result(EVIDENCE.MISSING, { reason: 'no_price_evidence' });
    return priceEvidence({ basis: evidence.basis, quote: evidence.quote, currency_quote: evidence.currency_quote ?? null }, { source: message, content, units, goods, within: findQuote(message, evidence.quote) });
}
