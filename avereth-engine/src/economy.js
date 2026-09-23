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
