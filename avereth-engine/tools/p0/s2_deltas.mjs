// Runtime V4, P0 / S2: world-delta strategy, variant A against variant B (plan §16 S2, §5.6, §9) on 41 recorded story
// turns of the runs V8–V12 (tests/eval/deltas.jsonl, prompts in tests/eval/s2_requests.json).
//
//   A        the recovery extractor reads each recorded reply (always-extraction): 41 calls
//   B-gen    the narrator writes prose + <avereth> block with the V4 prompt (PLAYER ACTIONS, WORLD DELTAS); a missing,
//            invalid or incomplete block goes to the recovery extractor: 41 calls + one per failed block
//   B-block  the narrator, in its own context, writes only the block for the recorded reply: 41 calls. This makes B's
//            semantic accuracy comparable with A on the same prose and the same gold
//   decision (plan §5.6): B if the B-gen block is valid and complete in ≥ 80 % of the turns and B's semantic accuracy is
//            at most 5 points below A's; otherwise A.
//
//   node tools/p0/s2_deltas.mjs                   A and B through SillyTavern (default; the key stays there)
//   node tools/p0/s2_deltas.mjs --variant a       only A      (--variant b: only B; the decision needs both)
//   node tools/p0/s2_deltas.mjs --dry-run         no calls: V4 prompts of three turns to p0_out/s2/requests_sample.json
//   node tools/p0/s2_deltas.mjs --variant a --vocab v4 --out p0_out/s2_v4
//                                                 after P0: A with the product's extractor (src/v4/extract.js,
//                                                 content/deltas.json) and its domain/authority firewall
//                                                 (src/v4/firewall.js); scored raw and as committed
// Options: --turns id,id  --runs V11,V12  --limit N  --concurrency 2  --agreement (extra call per B-gen turn: the
//          extractor on B's own prose, to compare)  --mode json_schema|plain  --reasoning <value>|keep  --timeout 300
//          --backend direct|st  --st-url <url>  --profile "<name>"  --out <dir>
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { structuredCall, callTokens, chatWithRetry } from './lib/structured.mjs';
import {
    loadDeltaVocab, deltaSchema, blockInstruction, BLOCK_FINAL, recoverySystem, recoveryUser, RECOVERY_PLAIN_FORMAT,
    splitBlock, checkBlock, scoreDeltas, goldMatch,
} from './lib/deltas.mjs';
import {
    ENGINE_ROOT, OUT_ROOT, parseArgs, intArg, pool, percentile, mean, round, pct, readJson, readJsonl, readDecision,
    writeJson, writeText, nowIso, progress, mdTable, assertNoSecrets, scrub, estimateTokens,
} from './lib/util.mjs';
import { firewallContextFromTurn } from './lib/deltas.mjs';
import * as v4x from '../../src/v4/extract.js';
import { firewall } from '../../src/v4/firewall.js';

export const TOOL = 's2_deltas';
export const TOOL_VERSION = 1;
export const DATA_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 'deltas.jsonl');
export const REQUESTS_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 's2_requests.json');
export const PRODUCT_DELTA_FILE = path.join(ENGINE_ROOT, 'content', 'deltas.json');
export const RULE = { block_ok_pct: 80, semantic_margin_pp: 5 };
/** Checked on every turn: an official contract never enters through quest.offer (plan §6.4, D3). */
export const GLOBAL_FORBIDDEN = [{ type: 'quest.offer', giver: '/guild|board|desk|clerk/i' }];
const BLOCK_ONLY = '(Engine: the story text above is your reply to this turn. Now write only its <avereth>{"expected":{…},"deltas":[…]}</avereth> block as WORLD DELTAS defines it. Nothing else.)';

// ------------------------------------------------------------------------------------------------ V4 prompt
const CONTRACT_V4 = [
    [/- Right after the story text of every reply write the fact report requested by the engine block \(<avereth>\{\.\.\.\}<\/avereth>\): only what THIS reply newly established, never a restatement of known state\./,
        '- Right after the story text of every reply write the <avereth> block the engine\'s WORLD DELTAS section asks for: only what THIS reply newly established, in story order, never a decision of Alaric\'s.'],
    [/"new" with name and traits \(their look\); "facts" occupation \/ voice when shown;/, 'person.new with name, role and look; a fact for occupation / voice when shown;'],
    [/"attitude" with why;/, 'attitude with why;'],
    [/about Alaric: "learn";/, 'about Alaric: learn;'],
    [/"facts" p "agenda" \(o "none" when it ends\);/, 'a fact with p "agenda" (o "none" when it ends);'],
    [/"memory" with imp 6-10;/, 'memory with imp 6-10;'],
    [/The only structured output is the hidden <avereth> fact report directly after the story text/, 'The only structured output is the hidden <avereth> block of world deltas directly after the story text'],
    [/12\. Did I write the <avereth> fact report right after the story text, with only this reply's new facts, and no tracker, sheet or dossier block\?/,
        '12. Did I write the <avereth> block right after the story text, answering every expected key, with only this reply\'s world deltas, and no tracker, sheet or dossier block?'],
];

/** The 3.1 contract with the fact report replaced by the V4 block (the part of "Vertrag v4" that S2 needs). */
export function v4Contract(text) {
    let out = text;
    const missed = [];
    for (const [re, rep] of CONTRACT_V4) {
        if (re.test(out)) out = out.replace(re, rep); else missed.push(String(re).slice(1, 40));
    }
    if (missed.length) out += '\n\nNOTE: the fact report of earlier versions is replaced by the <avereth> block of world deltas that the engine block asks for.';
    return { text: out, missed };
}

/** The 3.1 engine block with CORRECTIONS removed and RESOLVED/FACT REPORT replaced by PLAYER ACTIONS + WORLD DELTAS. */
export function v4EngineBlock(text, turn, vocab) {
    const noCorrections = text.replace(/\nCORRECTIONS \([^\n]*\):\n(?:- [^\n]*\n?)*/g, '\n');
    const at = noCorrections.indexOf('RESOLVED THIS TURN (binding):');
    const head = (at >= 0 ? noCorrections.slice(0, at) : noCorrections).trimEnd();
    const die = (text.match(/d100 = (\d+)/) || [])[1];
    return [
        head,
        '',
        'PLAYER ACTIONS (the engine resolved Alaric\'s message; narrate exactly these, in this order; he decides nothing else):',
        turn.actions,
        ...(die ? [`CHECK DIE for this reply: d100 = ${die}. Use it only if a Core #7 check is genuinely needed (uncertain AND consequential): Chance% = Actor ÷ (Actor + Opposition) × 100 (Actor = relevant stat + explicit bonuses; situational ±10/20/35 %); success if ${die} ≤ Chance%. Then add a "check" delta.`] : []),
        '',
        blockInstruction(vocab, turn.expected_keys),
    ].join('\n');
}

const LORE_V4 = [
    [/The <avereth> fact report still carries the Quest's hidden level \(the Engine's Quest XP basis: the Level the task suits; for a Guild contract it lies inside its Quest Rank's band\) and its type \(minor\/standard\/dangerous\/major scope\)\./,
        'Official Guild contracts come only from the engine\'s BOARD, with their hidden level and type already set; private work someone offers is reported as quest.offer.'],
];

/** Lore entries that still mention the 3.1 fact report (the quest-structure entry of Lorebook v0.12). */
export function v4Lore(text) {
    let out = text;
    for (const [re, rep] of LORE_V4) out = out.replace(re, rep);
    return out;
}

/** Rebuild the recorded narrator request and turn it into the V4 prompt of variant B. */
export function v4Messages(requests, turn, vocab) {
    const req = requests.turns[turn.id];
    if (!req) throw new Error(`no recorded request for ${turn.id}`);
    const notes = [];
    const messages = req.messages.map(({ role, b }) => {
        const content = requests.blocks[b];
        if (role === 'system' && content.startsWith('AVERETH RPG — SANDBOX NARRATOR CONTRACT')) {
            const c = v4Contract(content);
            if (c.missed.length) notes.push(`contract patterns not found: ${c.missed.join(', ')}`);
            return { role, content: c.text };
        }
        if (role === 'system' && content.startsWith('[AVERETH ENGINE')) return { role, content: v4EngineBlock(content, turn, vocab) };
        if (role === 'system' && content.startsWith('OUTPUT FORMAT (final instruction)')) return { role, content: BLOCK_FINAL };
        if (role === 'system' && content.includes('ENGINE NOTE:')) return { role, content: v4Lore(content) };
        return { role, content };
    });
    return { messages, params: req.params, notes };
}

// ------------------------------------------------------------------------------------------------ scoring helpers
/** Number of gold items of a turn (expected fields + critical deltas); an invalid answer scores 0 of them. */
export const goldItems = (turn) => (turn.gold.critical || []).length + Object.keys(turn.gold.expected || {}).length;

export function scoreTurn(turn, value) {
    const gold = { ...turn.gold, forbidden: [...(turn.gold.forbidden || []), ...GLOBAL_FORBIDDEN] };
    return scoreDeltas(gold, value);
}

function extractionCall(provider, turn, vocab, reply, o, errors) {
    if (o.kit === 'v4') {
        // the product's extractor: its system prompt, user message, schema and format line (src/v4/extract.js)
        return structuredCall(provider, {
            name: 'world_deltas', schema: v4x.deltaSchema(vocab, turn.catalog, turn.expected_keys), system: v4x.extractorSystem(vocab),
            user: v4x.extractorUser({ catalog: turn.catalog.text, actions: turn.actions, player: turn.player, expectedKeys: turn.expected_keys, vocab, reply }),
            mode: o.mode, plainInstruction: v4x.EXTRACT_PLAIN_FORMAT, reasoning: o.reasoning, maxTokens: o.extractMaxTokens, temperature: 0.1, timeoutMs: o.timeoutMs, ...o.retry,
        });
    }
    return structuredCall(provider, {
        name: 'world_deltas', schema: deltaSchema(vocab, turn.catalog, turn.expected_keys), system: recoverySystem(vocab),
        user: recoveryUser({ catalog: turn.catalog.text, actions: turn.actions, expectedKeys: turn.expected_keys, vocab, reply, errors }),
        mode: o.mode, plainInstruction: RECOVERY_PLAIN_FORMAT, reasoning: o.reasoning, maxTokens: o.extractMaxTokens, temperature: 0.1, timeoutMs: o.timeoutMs, ...o.retry,
    });
}

function completeKeys(value, expectedKeys) {
    const exp = value && typeof value.expected === 'object' && value.expected ? value.expected : {};
    return Object.keys(expectedKeys || {}).every((k) => exp[k] && typeof exp[k] === 'object');
}

// ------------------------------------------------------------------------------------------------ mock (tests)
function concrete(v) {
    if (Array.isArray(v)) return concrete(v[0]);
    if (typeof v === 'string') {
        const m = v.match(/^\/(.*)\/[a-z]*$/s);
        return m ? m[1].split('|')[0].replace(/[^\w' -]/g, '') : v;
    }
    if (v && typeof v === 'object') {
        if (Array.isArray(v.$range)) return Math.round((v.$range[0] + v.$range[1]) / 2);
        if (Array.isArray(v.$has)) return v.$has.map(concrete);
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, concrete(x)]));
    }
    return v;
}

function placeFor(v, catalog) {
    if (typeof v === 'string' && catalog.places.includes(v)) return v;
    return { new: { name: String(v || 'somewhere'), kind: 'site', parent: catalog.places[0] || null } };
}

const TEXT_FIELDS = ['role', 'name', 'species', 'what', 'mark', 'o', 'why', 'because', 'note', 'title', 'text'];

/** A schema-valid delta from a gold pattern (for the mock backend and the self-test). */
export function concreteDelta(pattern, seq, vocab, catalog) {
    const spec = vocab.deltas.find((d) => d.type === pattern.type);
    const c = concrete(pattern);
    const d = { seq, type: pattern.type };
    for (const [k, f] of Object.entries(spec.fields)) {
        if (k in c && k !== '$any') d[k] = f.ref === 'place' ? placeFor(c[k], catalog) : c[k];
        else if (f.ref === 'person') d[k] = c.$any ? String(c.$any) : 'someone';
        else if (f.nullable) d[k] = null;
        else if (f.enum) d[k] = f.enum[0];
        else if (f.array === 'offer_line') d[k] = [{ what: 'x', kind: 'goods', service: null, qty: 1, price_cp: 1 }];
        else if (f.array) d[k] = [];
        else if (f.type === 'integer') d[k] = f.min ?? 1;
        else if (f.type === 'boolean') d[k] = false;
        else if (f.ref === 'place') d[k] = placeFor(null, catalog);
        else if (f.ref) d[k] = { new: 'x' };
        else d[k] = 'x';
    }
    if (c.$any) {
        const k = TEXT_FIELDS.find((f) => spec.fields[f] && !spec.fields[f].ref);
        if (k) d[k] = String(c.$any);
    }
    if (pattern.type === 'offer' && c.lines) d.lines = c.lines.map((l) => ({ what: 'item', kind: 'goods', service: null, qty: 1, price_cp: 1, ...l }));
    return d;
}

export function goldAnswer(turn, vocab) {
    const expected = {};
    for (const [k, t] of Object.entries(turn.expected_keys)) {
        const g = concrete(turn.gold.expected[k] || {});
        if (t === 'go') expected[k] = { arrived: g.arrived ?? true, at: g.at === undefined ? null : placeFor(g.at, turn.catalog) };
        else if (t === 'activity') expected[k] = { minutes: g.minutes ?? 60, done: g.done ?? false };
        else if (t === 'take') expected[k] = { taken: g.taken ?? true };
        else expected[k] = vocab.expected?.[t]?.shape?.taken_anyway !== undefined ? { priced: g.priced ?? false, taken_anyway: g.taken_anyway ?? false } : { priced: g.priced ?? false };
    }
    return { expected, deltas: (turn.gold.critical || []).map((p, i) => concreteDelta(p, i + 1, vocab, turn.catalog)) };
}

export function s2MockResponder(turns, vocab, { noBlock = [], badBlock = [] } = {}) {
    return async (req) => {
        const all = req.messages.map((m) => m.content).join('\n');
        const last = req.messages[req.messages.length - 1].content;
        if (req.messages[0].content.startsWith('You read one reply')) {
            const t = turns.find((x) => all.includes(x.reply.slice(0, 300)) && all.includes(x.actions));
            return { content: JSON.stringify(t ? goldAnswer(t, vocab) : { expected: {}, deltas: [] }) };
        }
        const users = req.messages.filter((m) => m.role === 'user').map((m) => m.content);
        const t = turns.find((x) => users.includes(x.player) && all.includes(x.actions));
        if (!t) return { content: 'The story goes on. <avereth>{"expected":{},"deltas":[]}</avereth>' };
        const block = JSON.stringify(goldAnswer(t, vocab));
        if (last === BLOCK_ONLY) return { content: `<avereth>${block}</avereth>` };
        if (noBlock.includes(t.id)) return { content: t.reply };
        if (badBlock.includes(t.id)) return { content: `${t.reply}\n\n<avereth>{"expected": {}, "deltas": [{"seq": "one"}]}</avereth>` };
        return { content: `${t.reply}\n\n<avereth>${block}</avereth>` };
    };
}

// ------------------------------------------------------------------------------------------------ runs
async function runA(provider, turns, vocab, o, note) {
    let done = 0;
    return pool(turns.map((t) => async () => {
        const r = await extractionCall(provider, t, vocab, t.reply, o);
        const raw = r.valid_final ? r.value : null;
        // v4: what the engine commits is what its domain/authority firewall accepts; the raw answer is scored beside it
        const fw = raw && o.kit === 'v4' ? firewall(raw.deltas, firewallContextFromTurn(t)) : null;
        const value = raw && fw ? { ...raw, deltas: fw.accept } : raw;
        const rec = {
            id: t.id, ok: r.ok, error: r.ok ? null : scrub(r.error, o.secrets), valid_first: r.valid_first, valid_final: r.valid_final,
            complete: value ? completeKeys(value, t.expected_keys) : false, score: value ? scoreTurn(t, value) : null, items: goldItems(t),
            ms: r.attempts[0]?.ms ?? null, tokens: callTokens(r), value, errors: r.errors_final,
            ...(fw ? { raw_value: raw, score_raw: scoreTurn(t, raw), refused: fw.reject.map((x) => ({ rule: x.rule, delta: x.delta })), corrections: fw.corrections } : {}),
            // an invalid answer is kept (shortened) for diagnosis: the sample run of 27.09. kept only its error paths
            answer: r.ok && !value ? scrub(String(r.content).slice(0, 2000), o.secrets) : undefined,
        };
        note(`[A ${++done}/${turns.length}] ${t.id}: ${!r.ok ? `Fehler (${rec.error})` : !value ? 'ungültig' : `Semantik ${round(rec.score.semantic * 100, 0)} %`} · ${round((rec.ms ?? 0) / 1000, 1)} s`);
        return rec;
    }), o.concurrency);
}

async function runB(provider, turns, vocab, requests, o, note) {
    let done = 0;
    const total = turns.length * 2;
    const gen = await pool(turns.map((t) => async () => {
        const { messages, params } = v4Messages(requests, t, vocab);
        const r = await chatWithRetry(provider, { messages, maxTokens: params.max_tokens, temperature: params.temperature, topP: params.top_p, timeoutMs: o.timeoutMs }, o.retry);
        const rec = { id: t.id, ok: r.ok, error: r.ok ? null : scrub(r.error, o.secrets), ms: r.ms ?? null, usage: r.usage ?? null, finish: r.finish ?? null };
        if (r.ok) {
            const { prose, block } = splitBlock(r.content);
            const schema = deltaSchema(vocab, t.catalog, t.expected_keys);
            const chk = checkBlock(block, schema, t.expected_keys);
            Object.assign(rec, {
                prose_chars: prose.length, block_chars: block ? block.length : 0, block_tokens_est: block ? estimateTokens(block) : 0,
                block: { present: chk.present, valid: chk.valid, complete: chk.complete, errors: chk.errors, missing: chk.missing },
                value: chk.value, prose: prose.slice(0, 4000),
            });
            const reason = !chk.present ? 'missing' : !chk.valid ? 'invalid' : !chk.complete ? 'incomplete' : null;
            rec.recovery_reason = reason;
            if (reason) {
                const rr = await extractionCall(provider, t, vocab, prose, o, [...chk.errors, ...chk.missing.map((k) => `expected key "${k}" not answered`)]);
                rec.recovery = { ok: rr.ok, valid_final: rr.valid_final, complete: rr.valid_final ? completeKeys(rr.value, t.expected_keys) : false, ms: rr.attempts[0]?.ms ?? null, tokens: callTokens(rr), value: rr.valid_final ? rr.value : null, error: rr.ok ? null : scrub(rr.error, o.secrets) };
            }
            if (o.agreement) {
                const ar = await extractionCall(provider, t, vocab, prose, o);
                rec.agreement = ar.valid_final && chk.value ? agreement(chk.value, ar.value) : null;
            }
        }
        note(`[B ${++done}/${total}] ${t.id} Erzähler: ${!r.ok ? `Fehler (${rec.error})` : rec.recovery_reason ? `Block ${rec.recovery_reason} → Recovery ${rec.recovery?.valid_final ? 'ok' : 'gescheitert'}` : 'Block gültig und vollständig'} · ${round((rec.ms ?? 0) / 1000, 1)} s`);
        return rec;
    }), o.concurrency);
    const blockOnly = await pool(turns.map((t) => async () => {
        const { messages, params } = v4Messages(requests, t, vocab);
        const r = await chatWithRetry(provider, { messages: [...messages, { role: 'assistant', content: t.reply }, { role: 'user', content: BLOCK_ONLY }], maxTokens: 2500, temperature: params.temperature, topP: params.top_p, timeoutMs: o.timeoutMs }, o.retry);
        const rec = { id: t.id, ok: r.ok, error: r.ok ? null : scrub(r.error, o.secrets), ms: r.ms ?? null, usage: r.usage ?? null, items: goldItems(t) };
        if (r.ok) {
            const { block } = splitBlock(r.content);
            const chk = checkBlock(block ?? r.content, deltaSchema(vocab, t.catalog, t.expected_keys), t.expected_keys);
            Object.assign(rec, { present: chk.present, valid: chk.valid, complete: chk.complete, errors: chk.errors, missing: chk.missing, value: chk.value, score: chk.value ? scoreTurn(t, chk.value) : null });
        }
        note(`[B ${++done}/${total}] ${t.id} Block zur aufgezeichneten Prosa: ${!r.ok ? `Fehler (${rec.error})` : rec.score ? `Semantik ${round(rec.score.semantic * 100, 0)} %` : 'kein gültiger Block'} · ${round((rec.ms ?? 0) / 1000, 1)} s`);
        return rec;
    }), Math.max(1, Math.floor(o.concurrency / 2)));
    return { gen, block: blockOnly };
}

function agreement(a, b) {
    const types = (v) => (v?.deltas || []).map((d) => d.type).sort();
    const ta = types(a);
    const tb = types(b);
    const inter = ta.filter((x) => { const i = tb.indexOf(x); if (i >= 0) { tb.splice(i, 1); return true; } return false; }).length;
    const union = types(a).length + types(b).length - inter;
    const keys = Object.keys(a?.expected || {});
    const same = keys.filter((k) => goldMatch(a.expected[k], b?.expected?.[k])).length;
    return { delta_types_jaccard: union ? round(inter / union, 2) : 1, expected_same: `${same}/${keys.length}` };
}

// ------------------------------------------------------------------------------------------------ report
const sec = (ms) => round((ms ?? 0) / 1000, 1);
/** semantic_v2 of a stored score; scores of the runs of 27.09. predate it and are recomputed from their counts. */
function rescoreTurnValue(x) {
    if (x.semantic_v2 !== undefined) return x.semantic_v2;
    const items = (x.expected_total ?? 0) + (x.critical_total ?? 0);
    const denom = items + (x.forbidden_hits?.length ?? 0);
    return denom ? ((x.expected_ok ?? 0) + (x.critical_found ?? 0)) / denom : null;
}
function semStats(recs) {
    const scored = recs.filter((r) => r.score);
    const s = scored.map((r) => r.score);
    const sum = (f) => s.reduce((n, x) => n + f(x), 0);
    return {
        turns: recs.length, answered: recs.filter((r) => r.ok).length, valid_pct: pct(scored.length, recs.length),
        complete_pct: pct(recs.filter((r) => r.complete ?? (r.value && r.score)).length, recs.length),
        semantic_pct: s.length ? round(100 * mean(s.map((x) => x.semantic)), 1) : null,
        semantic_all_pct: recs.length ? round((100 * sum((x) => x.semantic)) / recs.length, 1) : null,
        critical: `${sum((x) => x.critical_found)}/${sum((x) => x.critical_total)}`, critical_pct: pct(sum((x) => x.critical_found), sum((x) => x.critical_total)),
        expected: `${sum((x) => x.expected_ok)}/${sum((x) => x.expected_total)}`, expected_pct: pct(sum((x) => x.expected_ok), sum((x) => x.expected_total)),
        forbidden_hits: sum((x) => x.forbidden_hits.length),
        // items-weighted: every expected field and critical delta counts once, a forbidden delta counts as a miss
        semantic_micro_pct: pct(sum((x) => x.expected_ok + x.critical_found), recs.reduce((n, r) => n + (r.items ?? 0), 0) + sum((x) => x.forbidden_hits.length)),
        // P0 correction (docs/P0_BERICHT.md §4): the per-turn mean without the turns that have nothing to score
        semantic_turns_v2_pct: (() => {
            const v = s.map((x) => rescoreTurnValue(x)).filter((x) => x !== null);
            return v.length ? round(100 * mean(v), 1) : null;
        })(),
        turns_without_items: s.filter((x) => rescoreTurnValue(x) === null).length,
        deltas_total: sum((x) => x.deltas ?? 0),
        extraneous_total: sum((x) => (x.extraneous ? x.extraneous.length : 0)),
    };
}

export function decide(a, b) {
    if (!a || !b) return null;
    const semA = semStats(a.records).semantic_micro_pct;
    const semB = semStats(b.block).semantic_micro_pct;
    const gen = b.gen.filter((r) => r.ok);
    const okPct = pct(gen.filter((r) => r.block?.valid && r.block?.complete).length, b.gen.length);
    const pass1 = (okPct ?? 0) >= RULE.block_ok_pct;
    const pass2 = semB !== null && semA !== null && semB >= semA - RULE.semantic_margin_pp;
    return {
        choice: pass1 && pass2 ? 'B' : 'A',
        block_ok_pct: okPct, semantic_a_pct: semA, semantic_b_pct: semB,
        reasons: [
            `Block gültig und vollständig in ${okPct ?? '–'} % der B-Antworten (Schwelle ≥ ${RULE.block_ok_pct} %): ${pass1 ? 'erfüllt' : 'nicht erfüllt'}`,
            `Semantische Genauigkeit B ${semB ?? '–'} % gegen A ${semA ?? '–'} % (B darf höchstens ${RULE.semantic_margin_pp} Punkte darunter liegen): ${pass2 ? 'erfüllt' : 'nicht erfüllt'}`,
        ],
    };
}

function costs(a, b, vocab, turns) {
    if (!a || !b) return null;
    const gen = b.gen.filter((r) => r.ok && r.usage);
    const instr = mean(turns.map((t) => estimateTokens(blockInstruction(vocab, t.expected_keys)))) || 0;
    const genPrompt = mean(gen.map((r) => r.usage.prompt_tokens ?? 0)) || 0;
    const genOut = mean(gen.map((r) => r.usage.completion_tokens ?? 0)) || 0;
    const blockTok = mean(gen.map((r) => r.block_tokens_est || 0)) || 0;
    const rec = b.gen.filter((r) => r.recovery);
    const r = b.gen.length ? rec.length / b.gen.length : 0;
    const recTok = mean(rec.map((x) => x.recovery.tokens.prompt + x.recovery.tokens.completion)) || 0;
    const aTok = mean(a.records.filter((x) => x.tokens.reported).map((x) => x.tokens.prompt + x.tokens.completion)) || 0;
    const genMs = percentile(gen.map((x) => x.ms), 50) || 0;
    const outShare = genOut ? Math.max(0, (genOut - blockTok) / genOut) : 1;
    return {
        recovery_rate_pct: round(100 * r, 1),
        tokens_a: Math.round(genPrompt - instr + (genOut - blockTok) + aTok),
        tokens_b: Math.round(genPrompt + genOut + r * recTok),
        narrator_prompt_b: Math.round(genPrompt), narrator_out_b: Math.round(genOut), block_tokens: Math.round(blockTok), instruction_tokens: Math.round(instr),
        extraction_tokens: Math.round(aTok), recovery_tokens: Math.round(recTok),
        blocking_a_s: sec(genMs * outShare), blocking_b_s: sec(genMs),
        background_a_s: sec(percentile(a.records.map((x) => x.ms), 50)), background_b_s: rec.length ? sec(percentile(rec.map((x) => x.recovery.ms), 50)) : 0,
    };
}

function summaryMarkdown({ meta, a, b, turns, vocab }) {
    const L = ['# P0 / S2 World-Delta-Strategie: Ergebnis', ''];
    L.push(`- Datum: ${meta.finished} · Werkzeug ${TOOL} v${TOOL_VERSION} · Delta-Vokabular ${vocab.version}${meta.kit === 'v4' ? ' (Produkt-Extraktor + Firewall)' : ''} · ${turns.length} Züge (${[...new Set(turns.map((t) => t.run))].join(', ')})`);
    L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model} · Extraktor: ${meta.mode}, Reasoning ${meta.reasoning ?? 'wie konfiguriert'} (${meta.mode_source}) · Erzähler: Parameter der Läufe (temperature 0.9, top_p 0.95)`);
    L.push(`- Varianten in diesem Ergebnis: ${[a ? `A (${a.meta.finished})` : null, b ? `B (${b.meta.finished})` : null].filter(Boolean).join(' und ')}`);
    if (a) {
        const s = semStats(a.records);
        L.push('', '## Variante A: Extraktion nach jeder Antwort (aufgezeichnete Prosa)', '');
        L.push(mdTable(['Kennzahl', 'Wert'], [
            ['Antwort gültig (Schema) / vollständig', `${s.valid_pct ?? '–'} % / ${pct(a.records.filter((r) => r.complete).length, a.records.length) ?? '–'} %`],
            ['**Semantische Genauigkeit** (je Gold-Element; Mittel je Zug)', `**${s.semantic_micro_pct ?? '–'} %** (${s.semantic_all_pct ?? '–'} %)`],
            ['Mittel je Zug, korrigiert (ohne die Züge ohne Gold-Element)', `${s.semantic_turns_v2_pct ?? '–'} % (${s.turns_without_items} Züge ohne Gold-Element)`],
            ['Kritische Deltas gefunden', `${s.critical} (${s.critical_pct ?? '–'} %)`],
            ['expected-Felder richtig', `${s.expected} (${s.expected_pct ?? '–'} %)`],
            ['Verbotene Deltas (falsch gemeldet)', `${s.forbidden_hits}`],
            ['Deltas gesamt / davon von keinem Gold-Element erfasst (weder richtig noch falsch bewertet)', `${s.deltas_total} / ${s.extraneous_total}`],
            ['Token je Aufruf (Prompt / Output)', `${round(mean(a.records.filter((r) => r.tokens.reported).map((r) => r.tokens.prompt)), 0) ?? '?'} / ${round(mean(a.records.filter((r) => r.tokens.reported).map((r) => r.tokens.completion)), 0) ?? '?'}`],
            ['Latenz p50 / p90', `${sec(percentile(a.records.map((r) => r.ms), 50))} / ${sec(percentile(a.records.map((r) => r.ms), 90))} s`],
        ]));
    }
    if (a && a.records.some((r) => r.score_raw)) {
        const rawRecs = a.records.map((r) => ({ ...r, score: r.score_raw ?? null }));
        const sr = semStats(rawRecs);
        const sc = semStats(a.records);
        const refused = a.records.flatMap((r) => (r.refused || []).map((x) => ({ id: r.id, ...x })));
        const byRule = {};
        for (const x of refused) byRule[x.rule] = (byRule[x.rule] || 0) + 1;
        L.push('', '## Produktpfad: roh gegen committet (Domain-/Authority-Firewall, src/v4/firewall.js)', '');
        L.push(mdTable(['Kennzahl', 'Extraktor roh', 'nach der Firewall (committet)'], [
            ['Semantische Genauigkeit (je Gold-Element)', `${sr.semantic_micro_pct ?? '–'} %`, `**${sc.semantic_micro_pct ?? '–'} %**`],
            ['Kritische Deltas gefunden', sr.critical, sc.critical],
            ['expected-Felder richtig', sr.expected, sc.expected],
            ['Verbotene Deltas', `${sr.forbidden_hits}`, `**${sc.forbidden_hits}**`],
            ['Deltas gesamt', `${sr.deltas_total}`, `${sc.deltas_total}`],
        ]));
        L.push('', `Verworfen: ${refused.length}${refused.length ? ` (${Object.entries(byRule).map(([k, n]) => `${k} ${n}`).join(', ')})` : ''}.`);
        for (const x of refused.slice(0, 60)) L.push(`- ${x.id} · ${x.rule} · ${JSON.stringify(Object.fromEntries(Object.entries(x.delta).filter(([k]) => k !== 'seq'))).slice(0, 160)}`);
    }
    if (b) {
        const gen = b.gen;
        const okGen = gen.filter((r) => r.ok);
        const s = semStats(b.block);
        L.push('', '## Variante B: Erzähler schreibt Prosa + Block, Recovery nur bei Bedarf', '');
        L.push(mdTable(['Kennzahl', 'Wert'], [
            ['Erzähler-Antworten', `${okGen.length}/${gen.length}`],
            ['Block vorhanden / gültig / vollständig', `${pct(okGen.filter((r) => r.block?.present).length, gen.length) ?? '–'} % / ${pct(okGen.filter((r) => r.block?.valid).length, gen.length) ?? '–'} % / ${pct(okGen.filter((r) => r.block?.complete).length, gen.length) ?? '–'} %`],
            ['**Block gültig und vollständig**', `**${pct(okGen.filter((r) => r.block?.valid && r.block?.complete).length, gen.length) ?? '–'} %** (Schwelle ≥ ${RULE.block_ok_pct} %)`],
            ['Recovery-Quote r (fehlend / ungültig / unvollständig)', `${pct(gen.filter((r) => r.recovery).length, gen.length) ?? '–'} % (${['missing', 'invalid', 'incomplete'].map((k) => gen.filter((r) => r.recovery_reason === k).length).join(' / ')})`],
            ['Recovery erfolgreich', `${gen.filter((r) => r.recovery?.valid_final).length}/${gen.filter((r) => r.recovery).length}`],
            ['Erzähler: Prompt- / Output-Token je Zug (davon Block, geschätzt)', `${round(mean(okGen.filter((r) => r.usage).map((r) => r.usage.prompt_tokens)), 0) ?? '?'} / ${round(mean(okGen.filter((r) => r.usage).map((r) => r.usage.completion_tokens)), 0) ?? '?'} (${round(mean(okGen.map((r) => r.block_tokens_est || 0)), 0)})`],
            ['Erzähler-Latenz p50 / p90', `${sec(percentile(okGen.map((r) => r.ms), 50))} / ${sec(percentile(okGen.map((r) => r.ms), 90))} s`],
            ['Block zur aufgezeichneten Prosa: gültig und vollständig', `${pct(b.block.filter((r) => r.valid && r.complete).length, b.block.length) ?? '–'} %`],
            ['**Semantische Genauigkeit B** (Block zur aufgezeichneten Prosa; je Gold-Element; Mittel je Zug)', `**${s.semantic_micro_pct ?? '–'} %** (${s.semantic_all_pct ?? '–'} %)`],
            ['Mittel je Zug B, korrigiert (ohne die Züge ohne Gold-Element)', `${s.semantic_turns_v2_pct ?? '–'} %`],
            ['Kritische Deltas gefunden / expected richtig / verbotene Deltas', `${s.critical} / ${s.expected} / ${s.forbidden_hits}`],
            ...(gen.some((r) => r.agreement) ? [['Übereinstimmung Block ↔ Extraktion derselben Prosa (Delta-Typen, Jaccard)', `${round(mean(gen.filter((r) => r.agreement).map((r) => r.agreement.delta_types_jaccard)), 2)}`]] : []),
        ]));
    }
    const d = decide(a, b);
    const c = costs(a, b, vocab, turns);
    L.push('', '## Entscheidung D2 (Regel §5.6)', '');
    if (meta.kit === 'v4') L.push('- D2 = A ist seit P0 entschieden (docs/P0_BERICHT.md §4); dieser Lauf misst den Produktpfad.');
    else if (!d) L.push('- Noch keine Entscheidung: Es fehlt eine Variante. Den fehlenden Teil mit `--variant a` bzw. `--variant b` nachholen; das Werkzeug führt beide Ergebnisse zusammen.');
    else {
        L.push(`- **Empfehlung: Variante ${d.choice}** (${d.choice === 'B' ? 'Erzähler schreibt den Block, Extraktion nur als Recovery' : 'Extraktion nach jeder Antwort'})`);
        for (const r of d.reasons) L.push(`- ${r}`);
    }
    if (c) {
        L.push('', '### Token und Latenz je Story-Zug (gemessen, Hochrechnung wie Plan §9)', '');
        L.push(mdTable(['', 'Variante A', 'Variante B'], [
            ['Token je Zug (Erzähler + Extraktion bzw. Recovery × r)', c.tokens_a, c.tokens_b],
            ['blockierend bis Antwort vollständig (p50)', `${c.blocking_a_s} s`, `${c.blocking_b_s} s`],
            ['im Hintergrund (p50)', `${c.background_a_s} s nach jeder Antwort`, `${c.background_b_s} s in ${c.recovery_rate_pct} % der Züge`],
        ]));
        L.push('', `Bausteine: Erzähler-Prompt B ≈ ${c.narrator_prompt_b} Token (davon WORLD-DELTAS-Anweisung ≈ ${c.instruction_tokens}), Erzähler-Output B ≈ ${c.narrator_out_b} (Block ≈ ${c.block_tokens}), Extraktion ≈ ${c.extraction_tokens}, Recovery ≈ ${c.recovery_tokens} Token.`);
    }
    const worst = [...(a?.records || []).map((r) => ['A', r]), ...(b?.block || []).map((r) => ['B', r])].filter(([, r]) => !r.score || r.score.semantic < 1);
    if (worst.length) {
        L.push('', `## Abweichungen je Zug (${worst.length}, höchstens 50)`, '');
        for (const [v, r] of worst.slice(0, 50)) {
            if (!r.score) { L.push(`- ${v} · ${r.id}: keine gültige Antwort ${r.error ? `(${r.error})` : `(${(r.errors || []).slice(0, 2).join('; ')})`}`); continue; }
            const parts = [];
            if (r.score.expected_wrong.length) parts.push(`expected falsch: ${r.score.expected_wrong.join(', ')}`);
            if (r.score.critical_missing.length) parts.push(`fehlt: ${r.score.critical_missing.map((p) => `${p.type}${p.$any ? ` ${p.$any}` : p.at ? ` ${JSON.stringify(p.at)}` : ''}`).join(', ')}`);
            if (r.score.forbidden_hits.length) parts.push(`verboten gemeldet: ${r.score.forbidden_hits.map((h) => h.delta.type).join(', ')}`);
            L.push(`- ${v} · ${r.id}: ${parts.join(' · ')}`);
        }
    }
    const failures = (b?.gen || []).filter((r) => r.recovery_reason);
    if (failures.length) {
        L.push('', '## B: Blöcke, die eine Recovery brauchten', '');
        for (const r of failures.slice(0, 41)) L.push(`- ${r.id}: ${r.recovery_reason}${r.block?.errors?.length ? ` (${r.block.errors.slice(0, 2).join('; ')})` : ''}${r.block?.missing?.length ? ` · fehlende expected: ${r.block.missing.join(', ')}` : ''}`);
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

// ------------------------------------------------------------------------------------------------ main
export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const started = Date.now();
    const log = deps.log ?? ((t) => console.log(t));
    const note = deps.progress ?? progress;
    const kit = a.vocab && a.vocab !== true ? String(a.vocab).toLowerCase() : 'p0';
    if (!['p0', 'v4'].includes(kit)) throw new Error('--vocab ist p0 oder v4');
    const vocab = kit === 'v4' ? loadDeltaVocab(PRODUCT_DELTA_FILE) : loadDeltaVocab();
    let turns = deps.turns ?? readJsonl(DATA_FILE);
    const requests = deps.requests ?? readJson(REQUESTS_FILE);
    if (a.turns && a.turns !== true) { const ids = String(a.turns).split(','); turns = turns.filter((t) => ids.includes(t.id)); }
    if (a.runs && a.runs !== true) { const runs = String(a.runs).toUpperCase().split(','); turns = turns.filter((t) => runs.includes(t.run)); }
    if (a.limit) turns = turns.slice(0, intArg(a.limit, turns.length));
    const variant = a.variant && a.variant !== true ? String(a.variant).toLowerCase() : kit === 'v4' ? 'a' : 'both';
    if (!['a', 'b', 'both'].includes(variant)) throw new Error('--variant ist a, b oder both');
    // D2 = A: the inline block (B) exists only in the P0 draft; the product has no <avereth> block
    if (kit === 'v4' && variant !== 'a') throw new Error('--vocab v4 gibt es nur für Variante A (D2 = A: das Produkt hat keinen Block im Erzähltext)');
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, 's2');
    const decision = deps.decision !== undefined ? deps.decision : readDecision();
    const mode = a.mode && a.mode !== true ? String(a.mode) : decision?.structured_mode || 'plain';
    let reasoning;
    if (a.reasoning !== undefined && a.reasoning !== true) reasoning = String(a.reasoning) === 'keep' ? undefined : String(a.reasoning);
    else reasoning = decision?.reasoning ?? undefined;
    const modeSource = a.mode || a.reasoning !== undefined ? 'Kommandozeile' : decision ? 'aus S0' : 'Standard, S0 nicht gefunden';
    const o = { kit, mode, reasoning, concurrency: intArg(a.concurrency, 2), timeoutMs: intArg(a.timeout, 300) * 1000, extractMaxTokens: intArg(a['max-tokens'], 2500), agreement: !!a.agreement, retry: deps.retry, secrets: [] };
    const nA = variant !== 'b' ? turns.length : 0;
    const nB = variant !== 'a' ? turns.length * 2 : 0;

    if (a['dry-run']) {
        const sample = turns.slice(0, 3).map((t) => {
            const { messages, params, notes } = v4Messages(requests, t, vocab);
            return { turn: t.id, b_messages: messages.map((m) => ({ role: m.role, chars: m.content.length, content: m.role === 'system' && m.content.includes('WORLD DELTAS') ? m.content : m.content.slice(0, 300) })), params, notes, a_user: recoveryUser({ catalog: t.catalog.text, actions: t.actions, expectedKeys: t.expected_keys, vocab, reply: t.reply }) };
        });
        writeJson(path.join(outDir, 'requests_sample.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), note: 'dry run: no call was made', a_system: recoverySystem(vocab), sample });
        const bPrompt = round(mean(turns.map((t) => estimateTokens(v4Messages(requests, t, vocab).messages.map((m) => m.content).join('\n')))), 0);
        log(`S2 Probelauf (Variante ${variant}): ${turns.length} Züge → A ${nA} Aufrufe, B ${nB} Aufrufe (+ je fehlerhaftem Block 1 Recovery${o.agreement ? ', + 1 Vergleichs-Extraktion je Zug' : ''}).`);
        log(`Erzähler-Prompt B ≈ ${bPrompt} Token (Schätzung); Extraktor-Prompt ≈ ${round(mean(turns.map((t) => estimateTokens(recoverySystem(vocab) + recoveryUser({ catalog: t.catalog.text, actions: t.actions, expectedKeys: t.expected_keys, vocab, reply: t.reply })))), 0)} Token.`);
        log(`Beispielanfragen: ${path.join(outDir, 'requests_sample.json')}`);
        return 0;
    }

    let provider;
    try {
        provider = deps.provider ?? await openProvider({ backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs: o.timeoutMs, mock: a.backend === 'mock' ? s2MockResponder(turns, vocab) : undefined });
    } catch (err) {
        log(`FEHLER: ${err.message}`);
        return 1;
    }
    o.secrets = provider.secrets || [];
    const d = provider.describe();
    log(`S2 World Deltas · Backend ${d.backend} · Modell ${d.model} · Variante ${variant} · Vokabular ${vocab.version} (${kit === 'v4' ? 'Produkt-Extraktor + Firewall' : 'P0-Entwurf'}) · Extraktor ${mode}, Reasoning ${reasoning ?? 'wie konfiguriert'} (${modeSource})`);
    log(`Plan: ${turns.length} Züge → A ${nA} Aufrufe, B ${nB} Aufrufe (+ Recovery je fehlerhaftem Block${o.agreement ? ', + Vergleichs-Extraktion' : ''}), ${o.concurrency} gleichzeitig.`);
    const meta = (extra) => ({ tool: TOOL, version: TOOL_VERSION, started: new Date(started).toISOString(), finished: nowIso(), node: process.version, provider: d, mode, reasoning: reasoning ?? null, mode_source: modeSource, vocab: vocab.version, kit, turns: turns.map((t) => t.id), ...extra });
    let A = null;
    let B = null;
    if (variant !== 'b') {
        const records = await runA(provider, turns, vocab, o, note);
        A = { meta: meta({ variant: 'a' }), records };
        assertNoSecrets(JSON.stringify(A), o.secrets);
        writeJson(path.join(outDir, 'a.json'), A);
    }
    if (variant !== 'a') {
        const r = await runB(provider, turns, vocab, requests, o, note);
        B = { meta: meta({ variant: 'b' }), ...r };
        assertNoSecrets(JSON.stringify(B), o.secrets);
        writeJson(path.join(outDir, 'b.json'), B);
    }
    // merge with an earlier run of the other variant (same turns)
    if (!A) try { A = readJson(path.join(outDir, 'a.json')); } catch { /* not run yet */ }
    if (!B) try { B = readJson(path.join(outDir, 'b.json')); } catch { /* not run yet */ }
    const ids = turns.map((t) => t.id).join(',');
    if (A && (A.meta.turns.join(',') !== ids || (A.meta.kit || 'p0') !== kit)) A = null;
    if (B && B.meta.turns.join(',') !== ids) B = null;
    const summary = summaryMarkdown({ meta: meta({}), a: A, b: B, turns, vocab });
    const dec = decide(A, B);
    assertNoSecrets(summary, o.secrets);
    writeText(path.join(outDir, 'summary.md'), summary);
    if (dec && kit === 'p0') writeJson(path.join(outDir, 'decision.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), d2: dec.choice, ...dec, costs: costs(A, B, vocab, turns) });
    log('');
    log(summary.split('\n## Abweichungen')[0]);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')} (zum Zurückschicken), a.json, b.json${dec ? ', decision.json' : ''}`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.stack || err.message}`); process.exit(1); });
}
