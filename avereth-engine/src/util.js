// Small shared helpers. Zero dependencies; runs in the browser (SillyTavern) and in Node (tests).

export const BANDS = ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'];

export function bandIndex(band) {
    const i = BANDS.indexOf(band);
    if (i < 0) throw new Error(`unknown Range Band: ${band}`);
    return i;
}

export function bandName(index) {
    return BANDS[Math.max(0, Math.min(BANDS.length - 1, index))];
}

export function clone(value) {
    if (value === undefined) return undefined;
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function clamp(x, lo, hi) {
    return Math.max(lo, Math.min(hi, x));
}

/** Round half away from zero (Core #11: round ONCE to the nearest whole number). */
export function roundHalfUp(x) {
    return x < 0 ? -Math.round(-x) : Math.round(x);
}

/** Keep full precision but strip binary noise for display (3.7500000000000004 -> 3.75). */
export function num(x) {
    return Math.round(x * 1e9) / 1e9;
}

export function slug(text) {
    return String(text).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '_');
}

/** Normalise user/LLM text for matching: lower case, straight quotes, single spaces. */
export function normText(text) {
    return String(text ?? '')
        .replace(/[‘’‛′]/g, "'")
        .replace(/[“”‟″]/g, '"')
        .replace(/[–—−]/g, '-')
        .replace(/…/g, '...')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

/** 32-bit FNV-1a hash as 8-char hex; used to fingerprint user input (swipe safety). */
export function hash32(text) {
    let h = 0x811c9dc5;
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

const STOPWORDS = new Set(('a an and are as at be but by for from has have he her his i in into is it its me my of on or ' +
    'our she so than that the their them then there they this to was we were what when where which who will with you your ' +
    'him not no do does did can could would should up down out over under again very just also only why').split(' '));

/** Tokeniser for lexical retrieval (BM25). Keeps words >= 2 chars, light plural stemming. */
export function tokenize(text) {
    const out = [];
    for (const raw of normText(text).split(/[^a-z0-9']+/)) {
        let w = raw.replace(/^'+|'+$/g, '').replace(/'s$/, '');
        if (w.length < 2 || STOPWORDS.has(w)) continue;
        if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
        else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
        out.push(w);
    }
    return out;
}

/** Rough token estimate. Calibrated on Testrun-v1 (GLM-5.3-Flash, English prompts): 4.24-4.47 chars/token. */
export function estimateTokens(text) {
    return Math.ceil(String(text).length / 4.3);
}

export function formatClock(minute) {
    const day = Math.floor(minute / 1440) + 1;
    const m = ((minute % 1440) + 1440) % 1440;
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const hour = Math.floor(m / 60);
    const part = hour < 5 ? 'night' : hour < 9 ? 'early morning' : hour < 12 ? 'morning' : hour < 14 ? 'midday'
        : hour < 18 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
    return `Day ${day}, ${hh}:${mm} (${part})`;
}

/**
 * Word replacements for the narrator's text ("ledger=register, tapestry=weave"): whole words, plural -s kept, case
 * kept. A word the model overuses stays overused when a ban list names it (priming); replacing it keeps it out of the
 * chat and so out of the next prompt (Testrun 4: "ledger" three times in a Guild hall despite the preset's ban list).
 */
export function parseSwaps(spec) {
    return String(spec || '').split(/[,;\n]+/).map((x) => x.split('=').map((w) => w.trim())).filter(([a, b]) => /^[A-Za-z][A-Za-z' -]*$/.test(a || '') && /^[A-Za-z][A-Za-z' -]*$/.test(b || ''));
}

export function swapWords(text, swaps = []) {
    let out = String(text);
    for (const [from, to] of swaps) {
        out = out.replace(new RegExp(`\\b(${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(s?)\\b`, 'gi'), (m, w, plural) => {
            const cased = w.length > 1 && w === w.toUpperCase() ? to.toUpperCase() : w[0] === w[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to;
            return cased + plural;
        });
    }
    return out;
}

/** Display name of an item: the content pack's, else the name the narrator gave it (state.item_names), else its id. */
export function itemLabel(state, content, id) {
    return content.items.get(id)?.name || state?.item_names?.[id] || String(id).replace(/_/g, ' ');
}

export function uniq(list) {
    return [...new Set(list)];
}

export function joinList(list, empty = 'none') {
    return list && list.length ? list.join(', ') : empty;
}
