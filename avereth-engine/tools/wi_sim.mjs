// SillyTavern World Info activation, re-implemented for audits and tests of the Avereth lorebook (lorebook/).
// Mirrors checkWorldInfo() of SillyTavern's release branch (public/scripts/world-info.js) for keyword entries:
//   * key matching (WorldInfoBuffer.matchKeys): case-insensitive; with "match whole words" a single-word key needs
//     non-word characters around it, a multi-word key matches as a plain substring;
//   * the scan text is the last `depth` chat messages (newest first) plus scan-enabled extension prompts (the
//     engine's Lore Bridge);
//   * entries are processed by Insertion Order, highest first; constant entries always activate;
//   * recursion: content of newly activated entries (unless "prevent further recursion") is scanned in the next
//     step; "exclude from recursion" entries cannot activate from it; at most maxSteps scan steps;
//   * budget: activated content is added in order until it would reach the budget; that entry and every later one
//     are dropped (no gap filling).
// Tokens are estimated like the engine does for GLM (chars / 4.3); the real tokenizer differs slightly.
import { readFileSync } from 'node:fs';

export const tokens = (s) => Math.ceil(String(s).length / 4.3);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function matchKey(haystack, key) {
    const h = String(haystack).toLowerCase();
    const k = String(key).trim().toLowerCase();
    if (!k) return false;
    if (k.split(/\s+/).length > 1) return h.includes(k);
    return new RegExp(`(?:^|\\W)(${esc(k)})(?:$|\\W)`).test(h);
}

/** Entries of a SillyTavern World Info export, enabled ones only, sorted like SillyTavern (order descending). */
export function loadLorebook(path) {
    return lorebookEntries(JSON.parse(readFileSync(path, 'utf8')));
}

export function lorebookEntries(book) {
    return Object.values(book.entries).filter((e) => !e.disable).sort((a, b) => b.order - a.order);
}

/**
 * @param {object[]} entries sorted entries
 * @param {string[]} messages chat message texts, oldest first (the scan uses the last `depth`)
 * @returns {{kept: {e, how, key}[], cut: {e, how, key}[], tokens: number}}
 */
export function activate(entries, messages, { depth = 2, recursive = false, maxSteps = 2, budget = 1800, inject = [] } = {}) {
    const recent = messages.slice(-depth).reverse();
    const base = `\x01${recent.join('\n\x01')}${inject.length ? `\n\x01${inject.join('\n\x01')}` : ''}`;
    const recurse = [];
    const active = new Map();
    const cut = [];
    let overflow = false;
    let steps = 0;
    let recursion = false;
    let activatedText = '';
    for (;;) {
        if (maxSteps && steps >= maxSteps) break;
        steps += 1;
        const now = [];
        const text = recurse.length ? `${base}\n\x01${recurse.join('\n\x01')}` : base;
        for (const e of entries) {
            if (active.has(e.uid) || cut.some((x) => x.e === e)) continue;
            if (recursion && e.excludeRecursion) continue;
            if (e.constant) { now.push({ e, how: 'constant' }); continue; }
            const key = (e.key || []).find((k) => matchKey(text, k));
            if (!key) continue;
            const direct = (e.key || []).find((k) => matchKey(base, k));
            now.push({ e, how: direct ? 'direct' : 'recursion', key: direct || key });
        }
        let added = '';
        const kept = [];
        for (const x of now) {
            if (overflow) { cut.push(x); continue; }
            added += `${x.e.content}\n`;
            if (tokens(activatedText) + tokens(added) >= budget) { overflow = true; cut.push(x); continue; }
            active.set(x.e.uid, x);
            kept.push(x);
        }
        activatedText += kept.map((x) => `${x.e.content}\n`).join('');
        const next = kept.filter((x) => !x.e.preventRecursion);
        for (const x of next) recurse.push(x.e.content);
        if (!recursive || overflow || !next.length) break;
        recursion = true;
    }
    const kept = [...active.values()];
    return { kept, cut, tokens: kept.reduce((a, x) => a + tokens(x.e.content), 0) };
}
