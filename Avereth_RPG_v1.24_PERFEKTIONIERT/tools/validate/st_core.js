// Faithful port of the SillyTavern World Info matching primitives used for validation.
// Source: SillyTavern public/scripts/world-info.js (WorldInfoBuffer.get / matchKeys, parseRegexFromString,
// inclusion-group prioritisation, budget accounting). Only the parts relevant to Avereth are ported.
'use strict';

function escapeRegex(string) { return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&'); }

function parseRegexFromString(input) {
    let match = input.match(/^\/([\w\W]+?)\/([gimsuy]*)$/);
    if (!match) return null;
    let [, pattern, flags] = match;
    if (pattern.match(/(^|[^\\])\//)) return null;
    pattern = pattern.replace('\\/', '/');
    try { return new RegExp(pattern, flags); } catch (e) { return null; }
}

// messages: array, LATEST FIRST (same order ST passes to checkWorldInfo)
function buildBuffer(messages, depth) {
    const MATCHER = '\x01';
    const JOINER = '\n' + MATCHER;
    return MATCHER + messages.slice(0, depth).map(m => m.trim()).join(JOINER);
}

function matchKeys(haystack, needle, entry, globals) {
    const keyRegex = parseRegexFromString(needle);
    if (keyRegex) return keyRegex.test(haystack);
    const caseSensitive = entry.caseSensitive ?? globals.caseSensitive;
    const tr = s => caseSensitive ? s : s.toLowerCase();
    haystack = tr(haystack);
    const t = tr(needle);
    const mww = entry.matchWholeWords ?? globals.matchWholeWords;
    if (mww) {
        const words = t.split(/\s+/);
        if (words.length > 1) return haystack.includes(t);
        const regex = new RegExp(`(?:^|\\W)(${escapeRegex(t)})(?:$|\\W)`);
        return regex.test(haystack);
    }
    return haystack.includes(t);
}

const LOGIC = { AND_ANY: 0, NOT_ALL: 1, NOT_ANY: 2, AND_ALL: 3 };

// Returns {active:boolean, reason}
function entryActivates(entry, messages, globals) {
    if (entry.disable) return { active: false, reason: 'disabled' };
    if (entry.constant) return { active: true, reason: 'constant' };
    const depth = entry.scanDepth ?? globals.scanDepth;
    const text = buildBuffer(messages, depth);
    const keys = (entry.key || []).map(k => k.trim()).filter(Boolean);
    let primary = null;
    for (const k of keys) { if (matchKeys(text, k, entry, globals)) { primary = k; break; } }
    if (!primary) return { active: false, reason: 'no primary' };
    const sec = (entry.keysecondary || []).map(k => k.trim()).filter(Boolean);
    const selective = entry.selective ?? true;
    if (!selective || sec.length === 0) return { active: true, reason: 'primary:' + primary };
    const logic = entry.selectiveLogic ?? 0;
    let hasAny = false, hasAll = true, firstHit = null;
    for (const s of sec) {
        const m = matchKeys(text, s, entry, globals);
        if (m) { hasAny = true; if (!firstHit) firstHit = s; } else { hasAll = false; }
    }
    if (logic === LOGIC.AND_ANY) return hasAny ? { active: true, reason: 'primary+sec' } : { active: false, reason: 'AND_ANY miss' };
    if (logic === LOGIC.NOT_ANY) return !hasAny ? { active: true, reason: 'primary:' + primary } : { active: false, reason: 'NOT_ANY blocked by ' + firstHit };
    if (logic === LOGIC.AND_ALL) return hasAll ? { active: true, reason: 'primary+all' } : { active: false, reason: 'AND_ALL miss' };
    if (logic === LOGIC.NOT_ALL) return !hasAll ? { active: true, reason: 'primary' } : { active: false, reason: 'NOT_ALL blocked' };
    return { active: false, reason: 'unknown logic' };
}

// Full activation for one generation: key matching, inclusion groups (prioritised by order), budget.
// tokens(): estimate used for the budget (chars/4 unless a function is supplied).
function activate(entries, messages, globals, tokens) {
    tokens = tokens || (s => Math.ceil(s.length / 4));
    const cand = [];
    for (const e of entries) {
        const r = entryActivates(e, messages, globals);
        if (r.active) cand.push(Object.assign({ _reason: r.reason }, e));
    }
    // inclusion groups: groupOverride -> highest order wins
    const groups = {};
    for (const e of cand) if (e.group) (groups[e.group] = groups[e.group] || []).push(e);
    const removed = new Set();
    for (const [g, arr] of Object.entries(groups)) {
        if (arr.length <= 1) continue;
        const prios = arr.filter(x => x.groupOverride).sort((a, b) => b.order - a.order);
        const winner = prios.length ? prios[0] : arr[0];
        for (const e of arr) if (e !== winner) removed.add(e.uid);
    }
    let act = cand.filter(e => !removed.has(e.uid)).sort((a, b) => b.order - a.order);
    // budget (ST: newContent accumulates every processed entry; overflow skips non-ignoreBudget entries)
    const budget = globals.budget;
    let newContent = '', overflow = false; const final = [], dropped = [];
    let ignoresLeft = act.filter(e => e.ignoreBudget).length;
    for (const e of act) {
        ignoresLeft -= e.ignoreBudget ? 1 : 0;
        if (overflow && !e.ignoreBudget) { dropped.push(e); if (ignoresLeft > 0) continue; else { continue; } }
        newContent += e.content + '\n';
        if (!e.ignoreBudget && tokens(newContent) >= budget) { overflow = true; dropped.push(e); continue; }
        final.push(e);
    }
    return { final, dropped, groupsRemoved: [...removed], totalChars: final.reduce((a, e) => a + e.content.length, 0) };
}

module.exports = { parseRegexFromString, buildBuffer, matchKeys, entryActivates, activate, LOGIC };
