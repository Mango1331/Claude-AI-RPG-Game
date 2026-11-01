// Build .142 – finance consolidation (patch_plans_10b/PATCH_PAYMENT_CONSOLIDATION.md §9.3): the disclosed syntactic
// translation of a recorded model answer written before the finance contract (cmd-1.8 / delta-1.13), for the offline
// replay (tools/replay/replay.mjs) and for scripted test answers (tests/v4/harness.js).
//
// What it does and what it does not claim:
//   - The old contract encoded "this price binds now" by reporting a bid/offer at all ("Never invent a seller
//     commitment", "possible future prices … are not fixed prices") and "coin changed hands now" by reporting
//     coin.gift ("Alaric receives coin: someone gives it to him"). An old answer is therefore translated to
//     phase "firm" / "transferred" – the old contract's own meaning, NOT a new proof of it.
//   - pricing / money / price_evidence are added only where the recorded words carry the recorded number by a
//     single plain reading: one money group equal to the number (total), or one group times the units (unit).
//     Anything else stays "unknown"/null, and the engine then treats it as unproven – so the replay shows exactly
//     where the old answers lack evidence. The recorded words of a bid or offer line are its `said`; the old contract
//     let `said` be null. Build .143 leaves that missing anchor unverified; it never invents said from prose.
//   - A gift from someone with a trade in the same record, or in the same answer, gets relation "unclear" (the old
//     contract could not say whether it was proceeds); a recount (repeat_of) gets "recount".
//   - Answers that already carry the new fields are left as they are. The archive and the recorded answers stay
//     unchanged; this runs on the copy handed to the engine.
// The new classification of fresh model answers is tested separately (tests/v4/fix142_finance.test.js); this adapter
// is no evidence for it.
import { extractJsonObject } from '../../src/v4/json.js';
import { coinEvidence, numberRuns } from '../../src/economy.js';
import { rateUnits } from '../../src/v4/trade.js';
import { findQuote } from '../../src/v4/finance_evidence.js';

/** Does this vocabulary hold the finance contract? */
export const hasFinanceContract = (vocab) => !!vocab?.deltas?.find((d) => d.type === 'bid')?.fields?.phase;

/** The money groups of a text, each with its words, sentence by sentence (a whole reply is no one handover). */
function groups(text, content) {
    const raw = String(text ?? '');
    const out = [];
    for (const m of raw.matchAll(/[^.!?;\n]+[.!?;]*/g)) {
        const sen = m[0];
        const ev = coinEvidence(sen, content);
        // a sentence the reader leaves open as a whole ("eighty-five copper, or eight silver five") by its clauses
        const parts = ev.sums?.length || !ev.mentions?.length ? [sen] : sen.split(/[,—–]|\bor\b/);
        for (const part of parts) for (const x of (part === sen ? ev : coinEvidence(part, content)).sums || []) out.push({ cp: x.cp, quote: part.slice(x.raw_start, x.raw_end) });
    }
    return out;
}

const KIND_RE = /\b(gold|silver|coppers?|cp)\b/gi;
/**
 * A bare number ("hot bath two more") equal to `target`, in a sentence that names exactly one coin kind: the coin of its
 * own sentence (§3.2, the Bree rule) – exactly one such place, quoted with as many words before it as make it unique in
 * the reply. Else null.
 */
function bareReading(words, target, reply, content) {
    if (!Number.isInteger(target) || target <= 0) return null;
    const found = [];
    for (const sen of String(words).split(/(?<=[.!?;])\s+|\n+/)) {
        const kinds = [...sen.matchAll(KIND_RE)];
        if (new Set(kinds.map((m) => (m[1].toLowerCase().startsWith('c') ? 'copper' : m[1].toLowerCase()))).size !== 1) continue;
        const toks = [...sen.matchAll(/[A-Za-z0-9'-]+/g)];
        for (let i = 0; i < toks.length;) {
            let j = i;
            while (j < toks.length && !/^(?:a|an|single)$/i.test(toks[j][0]) && numberRuns(toks[j][0]).length === 1 && /^(?:\d+|[a-z-]+)$/i.test(toks[j][0])) j++;
            if (j === i) { i += 1; continue; }
            const end = toks[j - 1].index + toks[j - 1][0].length;
            const run = numberRuns(sen.slice(toks[i].index, end));
            // its value in the coin of its sentence ("two" beside "three silver" is 20 cp)
            const value = run.length === 1 ? coinEvidence(`${run[0]} ${kinds[0][0]}`, content).cp : null;
            if (value === target && !/^\s*(?:gold|silver|coppers?|cp)\b/i.test(sen.slice(end))) {
                let k = i;
                let quote = sen.slice(toks[k].index, end);
                while (findQuote(reply, quote).state === 'ambiguous' && k > 0 && i - k < 3) { k -= 1; quote = sen.slice(toks[k].index, end); }
                if (findQuote(reply, quote).state === 'found') found.push({ quote, currency_quote: kinds[0][0] });
            }
            i = j;
        }
    }
    return found.length === 1 ? found[0] : null;
}

/** Does `words` name a number beside `money` that may be another price ("… and two for the blade"), not a count of goods
 * ("thirty plates, seventeen claws")? */
function otherPrice(words, money) {
    const rest = String(words).replace(money, ' ');
    for (const m of rest.matchAll(/\b(\d+|(?:[a-z]+-)?[a-z]+)\b(?=(?:\s+([a-z']+))?)/gi)) {
        if (numberRuns(m[1]).length !== 1 || /^(?:a|an|single)$/i.test(m[1])) continue;
        if (!m[2] || /^(?:for|each|apiece|more|copper|coppers|silver|gold|cp|or|and|the|a|if|to)$/i.test(m[2])) return true;
    }
    return false;
}

/**
 * pricing by the one plain reading of the recorded words (said, else the reply), else unknown. One unit with its own
 * words naming exactly one sum is that sum even where the recorded number differs: the old engine took the words over
 * the number (amount.corrected), and for a single unit total and unit price are the same reading.
 */
function pricingOf(said, price, units, content, prose = null) {
    // the line's own words, unless they hold no money at all ("Eighty-five the lot"): then, as the old engine did, the reply
    const ownWords = typeof said === 'string' && said.trim() ? said : null;
    const own = ownWords && groups(ownWords, content).length ? ownWords : null;
    const words = ownWords; // .143: historical missing anchors stay missing; never invent said from prose.
    if (!Number.isInteger(price) || !words) return { basis: 'unknown' };
    const g = groups(words, content);
    // the same sum said twice ("eighty-four copper—eight silver and four") is still one reading of it
    const total = g.filter((x) => x.cp === price);
    if (total.length) return { basis: 'total', quote: total[0].quote, currency_quote: null };
    const rate = !total.length && Number.isInteger(units) && units > 1 ? g.filter((x) => x.cp * units === price) : [];
    if (rate.length === 1) return { basis: 'unit', quote: rate[0].quote, currency_quote: null };
    // the one sum a plain coin-unit slip away ("two silver" reported as 200): the old engine corrected it so
    // (amount.corrected), and so does the new one (world.js dealTerms)
    const slip = !total.length && !rate.length ? g.filter((x) => [10, 100].some((k) => x.cp * k === price || price * k === x.cp)) : [];
    if (slip.length === 1) return { basis: 'total', quote: slip[0].quote, currency_quote: null };
    // (only where those words name no further number: "three silver for it, and two for the blade" is two prices)
    if (own && !total.length && units === 1 && g.length === 1 && numberRuns(own).length === numberRuns(g[0].quote).length) return { basis: 'total', quote: g[0].quote, currency_quote: null };
    // a lot's own words naming exactly one sum in silver or gold that the report converted wrongly ("two silver, ten
    // copper" reported as 25): the words, as the old engine read them; the engine corrects the conversion (§3.1)
    if (own && !total.length && !rate.length && g.length === 1 && /\b(?:silver|gold)/i.test(g[0].quote) && !otherPrice(own, g[0].quote))
        return { basis: 'total', quote: g[0].quote, currency_quote: null };
    const reply = typeof prose === 'string' ? prose : words;
    const bare = !g.some((x) => x.cp === price) && (bareReading(ownWords ?? words, price, reply, content) || (ownWords && prose ? bareReading(prose, price, reply, content) : null));
    if (bare) return { basis: 'total', ...bare };
    return { basis: 'unknown' };
}

/** A recorded extractor answer (object) in the finance contract; state: the fold the reply is applied to; prose: the
 * reply it reports (optional). */
export function financeAnswer(value, state, content, { prose = null } = {}) {
    if (!value || !Array.isArray(value.deltas)) return value;
    const v = structuredClone(value);
    const traded = new Set([
        ...v.deltas.filter((d) => d?.type === 'bid').map((d) => d.buyer),
        ...v.deltas.filter((d) => d?.type === 'offer').map((d) => d.seller),
        ...(state?.last?.outcome?.booked?.sellers || []),
        ...(state?.decisions || []).filter((x) => x.kind === 'sale' && x.turn === state.turn).map((x) => x.seller || '*'),
        ...(state?.credits || []).filter((c) => !c.gift && c.turn === state?.turn).map((c) => c.from),
    ]);
    for (const d of v.deltas) {
        if (!d || typeof d !== 'object') continue;
        if (d.type === 'bid' && d.phase === undefined) {
            const units = state ? rateUnits((d.lines || []).map((l) => ({ object: l.object, qty: l.qty ?? state.objects?.[l.object]?.qty ?? 1 })), (id) => state.objects?.[id]) : 0;
            Object.assign(d, { phase: 'firm', condition: null, pricing: pricingOf(d.said, d.price_cp, units, content, prose) });
        }
        if (d.type === 'offer' && Array.isArray(d.lines)) {
            d.lines = d.lines.map((l) => (l && typeof l === 'object' && l.phase === undefined
                ? { ...l, phase: 'firm', condition: null, pricing: pricingOf(l.said, l.price_cp, l.qty ?? 1, content, prose) } : l));
            // words found in the reply for a line without its own: the same words for two lines name neither of them
            const quotes = d.lines.filter((l) => l?.pricing?.quote).map((l) => l.pricing.quote);
            for (const l of d.lines) if (l?.pricing?.quote && !(typeof l.said === 'string' && l.said.includes(l.pricing.quote)) && quotes.filter((q) => q === l.pricing.quote).length > 1) l.pricing = { basis: 'unknown' };
        }
        if (d.type === 'coin.gift' && d.phase === undefined) {
            // the money of the handover is its recorded words (said) where they hold one complete amount ("Three
            // coppers, then a fourth added" is 4 as a whole); a shorter group would cut such an addition off
            const ev = typeof d.said === 'string' ? coinEvidence(d.said, content) : null;
            const g = groups(d.said, content);
            const values = [...new Set(g.map((x) => x.cp))];
            Object.assign(d, {
                phase: 'transferred',
                relation: d.repeat_of != null ? 'recount' : traded.has(d.from) || traded.has('*') ? 'unclear' : 'independent',
                money: ev && ev.cp !== null && ev.complete && values.length <= 1 ? { quote: d.said, currency_quote: null }
                    : values.length === 1 ? { quote: g[0].quote, currency_quote: null } : (typeof d.said === 'string' ? { quote: d.said, currency_quote: null } : null),
            });
        }
    }
    return v;
}

/**
 * A recorded planner/interpreter answer (object) in the finance contract. message: the player's message (optional) –
 * where the command's quote holds no money at all, its number is read there, by the same single plain reading;
 * state: the fold before it (optional), for the units of a sale.
 */
export function financePlan(value, content, { message = null, state = null } = {}) {
    if (!value || !Array.isArray(value.commands)) return value;
    const v = structuredClone(value);
    const field = { buy: 'max_cp', sell: 'min_cp', 'offer.accept': 'agreed_cp' };
    const wordsOf = (c) => (groups(c.quote, content).length || typeof message !== 'string' ? c.quote : message);
    for (const c of v.commands) {
        if (!c || typeof c !== 'object') continue;
        if (c.type === 'pay' && c.money === undefined) {
            const g = groups(wordsOf(c), content).filter((x) => x.cp === c.amount_cp);
            // or a bare number with the one coin of its sentence ("I have three silver—I'll give two")
            const bare = !g.length ? bareReading(wordsOf(c), c.amount_cp, typeof message === 'string' ? message : wordsOf(c), content) : null;
            Object.assign(c, { money: g.length === 1 ? { quote: g[0].quote, currency_quote: null } : bare, recipient_quote: null });
        }
        const f = field[c.type];
        if (f && c.price_evidence === undefined) {
            const n = c[f];
            const units = c.qty ?? (c.type === 'sell' ? state?.objects?.[c.object]?.qty ?? 1 : 1);
            const g = Number.isInteger(n) ? groups(wordsOf(c), content) : [];
            const total = g.filter((x) => x.cp === n);
            const unit = units > 1 ? g.filter((x) => x.cp * units === n) : [];
            const reply = typeof message === 'string' ? message : wordsOf(c);
            const bareTotal = !total.length && !unit.length && Number.isInteger(n) ? bareReading(wordsOf(c), n, reply, content) : null;
            const bareUnit = !total.length && !unit.length && !bareTotal && Number.isInteger(n) && units > 1 && n % units === 0 ? bareReading(wordsOf(c), n / units, reply, content) : null;
            c.price_evidence = total.length === 1 ? { basis: 'total', quote: total[0].quote, currency_quote: null }
                : unit.length === 1 ? { basis: 'unit', quote: unit[0].quote, currency_quote: null }
                    : bareTotal ? { basis: 'total', ...bareTotal } : bareUnit ? { basis: 'unit', ...bareUnit } : null;
        }
    }
    return v;
}

/** The same for answers as recorded text; text that holds no JSON object stays as it is. */
export function financeText(text, purpose, state, content, { prose = null, message = null } = {}) {
    if (typeof text !== 'string') return text;
    const { value } = extractJsonObject(text);
    if (!value || typeof value !== 'object') return text;
    if (/^extract/.test(purpose) && Array.isArray(value.deltas) && value.deltas.some((d) => ['bid', 'offer', 'coin.gift'].includes(d?.type))) return JSON.stringify(financeAnswer(value, state, content, { prose }));
    if (/^(?:plan|interpret)/.test(purpose) && Array.isArray(value.commands) && value.commands.some((c) => ['pay', 'buy', 'sell', 'offer.accept'].includes(c?.type))) return JSON.stringify(financePlan(value, content, { message, state }));
    return text;
}
