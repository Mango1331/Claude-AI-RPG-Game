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

/** "two", "twenty-five", "a hundred", "3", "a dozen" -> number, or null. */
function numberOf(words) {
    const w = words.filter((x) => x && x !== 'and');
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

/**
 * The coin an amount in words names, in copper: "two silver" -> 20, "a silver and five coppers" -> 15. Null when the
 * words name no amount of the currency (or a part of a coin: "half a silver").
 */
export function coinFromWords(text, content) {
    const cps = content.rules.currency.copper_per_silver;
    const spg = content.rules.currency.silver_per_gold;
    const t = String(text ?? '').toLowerCase().replace(/(\d)\s*(cp|c|s|g)\b/g, '$1 $2').replace(/[-–]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ');
    if (/\bhalf\b/.test(t)) return null;
    const unit = /\b(gold|golds|g|silver|silvers|s|copper|coppers|cp|c)\b/;
    const tokens = t.split(/\s+/).filter(Boolean);
    let total = 0;
    let found = false;
    let i = 0;
    while (i < tokens.length) {
        if (!unit.test(tokens[i])) { i++; continue; }
        // the number words right before the unit ("twenty five copper", "a silver")
        let j = i;
        while (j > 0 && (/^\d+$/.test(tokens[j - 1]) || SMALL[tokens[j - 1]] !== undefined || ['hundred', 'and'].includes(tokens[j - 1]))) j--;
        while (j < i && tokens[j] === 'and') j++;
        const n = numberOf(tokens.slice(j, i));
        if (n === null) return null;
        const u = tokens[i][0];
        total += u === 'g' ? n * cps * spg : u === 's' ? n * cps : n;
        found = true;
        i++;
    }
    return found ? total : null;
}

/** Every amount of coin a text names, one per mention ("Twelve coppers ..., two silver to take it" -> [12, 20]). */
export function coinMentions(text, content) {
    const t = String(text ?? '').toLowerCase().replace(/(\d)\s*(cp|c|s|g)\b/g, '$1 $2').replace(/[-–]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ');
    const tokens = t.split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
        if (!/^(?:gold|golds|silver|silvers|copper|coppers|cp)$/.test(tokens[i])) continue;
        let j = i;
        while (j > 0 && (/^\d+$/.test(tokens[j - 1]) || SMALL[tokens[j - 1]] !== undefined || tokens[j - 1] === 'hundred')) j--;
        if (j === i) continue;
        const v = coinFromWords(tokens.slice(j, i + 1).join(' '), content);
        if (v !== null) out.push(v);
    }
    return out;
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
