// Coin arithmetic (Core #22): whole Copper, exact transactions, normalisation, no invented change.

export function splitCoin(cp, content) {
    const cps = content.rules.currency.copper_per_silver;
    const spg = content.rules.currency.silver_per_gold;
    const gold = Math.floor(cp / (cps * spg));
    const silver = Math.floor((cp % (cps * spg)) / cps);
    const copper = cp % cps;
    return { gold, silver, copper };
}

export function formatCoin(cp, content) {
    const { gold, silver, copper } = splitCoin(cp, content);
    const parts = [];
    if (gold) parts.push(`${gold} Gold`);
    if (silver) parts.push(`${silver} Silver`);
    if (copper || !parts.length) parts.push(`${copper} Copper`);
    return parts.join(' ');
}

/** Parse "5 Silver", "2 gold 3 copper", "12c", "1s 5c" into Copper. Returns null if unparseable. */
export function parseCoin(text, content) {
    const cps = content.rules.currency.copper_per_silver;
    const spg = content.rules.currency.silver_per_gold;
    const re = /(-?\d+)\s*(gold|g|silver|s|copper|c|cp)\b/gi;
    let m;
    let total = 0;
    let found = false;
    while ((m = re.exec(String(text)))) {
        found = true;
        const n = parseInt(m[1], 10);
        const u = m[2].toLowerCase();
        total += u.startsWith('g') ? n * cps * spg : u.startsWith('s') ? n * cps : n;
    }
    return found ? total : null;
}

/** Validate a coin delta for an entity; returns {ok, value, error}. */
export function applyCoin(currentCp, deltaCp) {
    if (!Number.isInteger(deltaCp)) return { ok: false, error: 'coin amounts must be whole Copper' };
    const value = currentCp + deltaCp;
    if (value < 0) return { ok: false, error: `insufficient coin (${currentCp} cp, needs ${-deltaCp} cp)` };
    return { ok: true, value };
}

// Patch 3 (live 18.10.2026: the chartmaker asked "two silver", the extractor wrote 200 cp, the engine read two gold
// and the story rewrote the price to fit): an amount the story says in words is read by the engine itself, in its own
// units. Numbers as digits or words ("two silver", "a silver and five coppers", "twelve coppers", "a dozen copper").
const SMALL = { a: 1, an: 1, one: 1, single: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, dozen: 12, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

const ORDINAL = { second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };

/** "two", "twenty-five", "a hundred", "3", "a dozen" -> number, or null. */
function numberOf(words) {
    const w = words.filter((x, i) => x && x !== 'and' && !(['a', 'an'].includes(x) && words[i + 1] === 'single'));
    if (!w.length) return null;
    if (w.length === 1 && /^\d+$/.test(w[0])) return Number(w[0]);
    let total = 0;
    let cur = 0;
    for (const x of w) {
        if (/^\d+$/.test(x)) cur += Number(x);
        else if (x === 'hundred') cur = (cur || 1) * 100;
        else if (x === 'dozen') cur = (cur || 1) * 12;
        else if (SMALL[x] !== undefined) cur += SMALL[x];
        else return null;
    }
    total += cur;
    return total || null;
}

/** Numeric/word amounts share one tokenizer; apostrophes inside words are never currency separators. */
export function coinEvidence(text, content) {
    const clean = String(text ?? '').toLowerCase().replace(/[‘’‛′]/g, "'")
        .replace(/(\d)\s*(cp|c|s|g)\b/g, '$1 $2').replace(/[-–—]/g, ' ');
    const tokens = [...clean.matchAll(/[a-z0-9]+(?:'[a-z0-9]+)*/g)].map(m => ({ word: m[0], start: m.index, end: m.index + m[0].length }));
    const parts = [];
    let complete = true;
    const currency = content.rules.currency;
    for (let i = 0; i < tokens.length; i++) {
        if (!/^(?:gold|golds|g|silver|silvers|s|copper|coppers|cp|c)$/.test(tokens[i].word)) continue;
        let j = i;
        // Build .138 (corpus b17-warrior#134: "Ten and eighteen. Forty copper." read as 68): the amount's number words
        // end at a sentence boundary; numbers of the sentence before are other prices
        while (j > 0 && (/^\d+$/.test(tokens[j - 1].word) || SMALL[tokens[j - 1].word] !== undefined || ['hundred', 'and'].includes(tokens[j - 1].word))
            && !/[.;!?]/.test(clean.slice(tokens[j - 1].end, tokens[j].start))) j--;
        while (j < i && tokens[j].word === 'and') j++;
        const n = numberOf(tokens.slice(j, i).map(t => t.word));
        if (n === null) {
            // An unquantified currency is not zero: "eight copper and the silver" is only a partial sum.
            if (/^(?:gold|golds|silver|silvers|copper|coppers|cp)$/.test(tokens[i].word)) complete = false;
            continue; // a gold necklace or a person's initial names no price
        }
        // Build .107 (audit of .106: "five silver and not a copper less" read as two prices): "not a (single) copper"
        // names no sum of its own; it insists on the other one
        if (tokens[j - 1]?.word === 'not' || (tokens[j - 1]?.word === 'single' && tokens[j - 3]?.word === 'not')) continue;
        const unit = tokens[i].word[0];
        const factor = unit === 'g' ? currency.copper_per_silver * currency.silver_per_gold : unit === 's' ? currency.copper_per_silver : 1;
        let amount = n * factor, end = tokens[i].end;
        // Common silver shorthand: "one silver eight" = one silver + eight copper.
        // Never silently ignore a dangling numeric suffix or invent its unit elsewhere.
        const next = tokens[i + 1], after = tokens[i + 2];
        const small = (t) => !!t && (/^\d+$/.test(t.word) || (SMALL[t.word] !== undefined && !['a', 'an'].includes(t.word)));
        if (small(next) && !/^(?:gold|golds|silver|silvers|copper|coppers|cp|c|s|g)$/.test(after?.word || '')) {
            const lower = numberOf([next.word]);
            // Build .107: "one silver five a night" is the same shorthand before a rate
            const boundary = !after || /[,;.!?]/.test(clean.slice(next.end, after.start)) || /^(?:for|each|yes|done|please|a|an|per|apiece)$/.test(after.word);
            if (unit !== 's' || lower === null || lower >= currency.copper_per_silver || !boundary)
                return { cp: null, mentions: [amount], compound: false, complete, sums: [] };
            amount += lower; end = next.end;
        } else if (unit === 's' && next?.word === 'and' && small(after) && clean.slice(next.end, after.start).trim() === ''
            && (!tokens[i + 3] || /[,;.!?]/.test(clean.slice(after.end, tokens[i + 3].start)))) {
            // Build .138 (batch 20 #106: "eighty-four copper—eight silver and four"): the same shorthand with "and" at
            // the end of the phrase; "two silver and four plates" names no copper
            const lower = numberOf([after.word]);
            if (lower !== null && lower < currency.copper_per_silver) { amount += lower; end = after.end; }
        }
        // Build .138 (batch 20 #218: "Three coppers, then a fourth added after a moment's thought" was booked as 3): a
        // coin added to the same handover. "a fourth added" counts to four; "two more" adds two; any other addition
        // ("a few more") leaves the sum unresolved. A later unrelated number ("the fourth stall") adds nothing.
        const tail = clean.slice(end).split(/[.;!?]/)[0];
        const ordinal = tail.match(/^[\s,]*(?:then|and|plus|with)\s+(?:a|an)\s+(second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)(?:\s+(?:one|coin|piece))?\s+(?:added|on top|more|besides|for good measure)\b/);
        const more = tail.match(/^[\s,]*(?:then|and|plus)\s+([a-z0-9]+(?: (?!more\b)[a-z]+)?|another)(?:\s+more)?(?:\s+(?:coins?|pieces?))?(?=\s*(?:,|$|added\b|on top\b|for good measure\b))/);
        const vague = /^[\s,]*(?:then|and|plus)\s+(?:a few|some|several|a couple)\s+more\b/.test(tail);
        if (ordinal) {
            const count = ORDINAL[ordinal[1]];
            if (count === n + 1) amount += factor; else complete = false;
        } else if (more && (more[1] === 'another' || /\bmore\b/.test(more[0]))) {
            const extra = more[1] === 'another' ? 1 : numberOf(more[1].split(' '));
            if (extra === null) complete = false; else amount += extra * factor;
        } else if (vague) complete = false;
        parts.push({ cp: amount, unit, start: tokens[j].start, end });
    }
    const cp = parts.length && !tokens.some(t => t.word === 'half') ? parts.reduce((n, p) => n + p.cp, 0) : null;
    // "one silver and five copper" is one sum; two prices with intervening prose are not.
    // Build .138: one mixed sum runs from the higher unit to the lower ("eighty-four copper—eight silver" is two sums)
    const rank = { g: 3, s: 2, c: 1 };
    const compound = cp !== null && new Set(parts.map(p => p.unit)).size === parts.length
        && parts.every((p, i) => !i || (rank[p.unit] < rank[parts[i - 1].unit] && /^[\s,]*(?:and\s*)?$/.test(clean.slice(parts[i - 1].end, p.start))));
    // Build .138: the sums the text says, each mixed-currency sum ("one gold four silver") once, in falling units; the
    // trade reading compares them ("140 copper — that's 1 gold 4 silver" says one sum twice)
    const sums = [];
    for (const [i, p] of parts.entries()) {
        const prev = parts[i - 1];
        if (prev && rank[p.unit] < rank[prev.unit] && /^[\s,]*(?:and\s*)?$/.test(clean.slice(prev.end, p.start))) {
            const last = sums.at(-1);
            last.cp += p.cp; last.end = p.end;
        } else sums.push({ cp: p.cp, start: p.start, end: p.end });
    }
    return { cp, mentions: parts.map(p => p.cp), compound, complete, sums };
}

/** "two silver" -> 20; "a silver and five coppers" -> 15; no stated whole-coin amount -> null. */
export function coinFromWords(text, content) {
    return coinEvidence(text, content).cp;
}

/** Every explicit amount, including abbreviations; components of a mixed-currency sum stay separate. */
export function coinMentions(text, content) {
    return coinEvidence(text, content).mentions;
}

/** Every number a text says, in digits or words ("two", "twelve", "twenty five", "200"). */
export function numbersIn(text) {
    const tokens = String(text ?? '').toLowerCase().replace(/[-–]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
    const out = new Set();
    let run = [];
    const flush = () => { if (run.length) { const n = numberOf(run); if (n !== null) out.add(n); for (const w of run) { const m = numberOf([w]); if (m !== null && !['a', 'an'].includes(w)) out.add(m); } } run = []; };
    for (const w of tokens) {
        if (/^\d+$/.test(w) || (SMALL[w] !== undefined && !['a', 'an', 'single'].includes(w)) || w === 'hundred') run.push(w);
        else flush();
    }
    flush();
    return out;
}

/** Build .138: the number a text ends with, in digits or words ("…, fifty-six" -> 56), or null. */
export function trailingNumber(text) {
    const words = String(text ?? '').toLowerCase().replace(/[-–]/g, ' ').split(/[^a-z0-9]+/).filter(Boolean);
    const run = [];
    while (words.length && (/^\d+$/.test(words.at(-1)) || (SMALL[words.at(-1)] !== undefined && !['a', 'an', 'single'].includes(words.at(-1))) || ['hundred', 'and'].includes(words.at(-1)))) run.unshift(words.pop());
    while (run[0] === 'and') run.shift();
    return run.length ? numberOf(run) : null;
}
