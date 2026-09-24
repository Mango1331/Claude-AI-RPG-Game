// Offline narrator comparison (docs/NARRATOR_AB.md). The logged Test-5 requests are sent again with three prompt
// layers; nothing else changes:
//   A  the request exactly as SillyTavern sent it (Megumin V10 Shura after the RUNTIME_V3 §9 checklist)
//   B  Megumin's share replaced by presets/Avereth Narrator.json: its style prompt first, its output contract last
//   C  no narrator style at all: only the Avereth layers (lore, contract, persona, chat history with the player's
//      message, engine block) and the same output contract
// Lore, contract, persona, chat history and engine block keep their exact text, and every request parameter (model,
// reasoning effort, temperature, top_p, max tokens, provider extras such as clear_thinking) stays as logged. Only the
// message boundaries follow each layer: A as Megumin squashed them, B and C unsquashed, as the new preset sends them.
//
// The engine judges every reply against the state the narrator saw: the events the run recorded in its chat file
// (--chat), up to the player's message of that turn.
//
// Usage (docs/NARRATOR_AB.md):
//   node tools/narrator_ab.mjs --log <server log> --chat <chat .jsonl> [--log … --chat …] --dry-run [--write <dir>]
//   AVERETH_AB_API_BASE=<OpenAI-compatible base URL> AVERETH_AB_API_KEY=<key> \
//     node tools/narrator_ab.mjs --log <server log> --chat <chat .jsonl> [--log … --chat …] [--reps 2]
//       [--turns default|all] [--variants A,B,C] [--concurrency 2] [--out narrator_ab_out] [--seed 1]
// The key is read from the environment only; it is never written anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseServerLog, lastInput, isReportRequest, outputParts, CONTRACT_TITLE, CONTRACT_END } from './run_report.mjs';
import { extractReport } from '../src/delta.js';
import { prepareGeneration, processReply } from '../src/host.js';
import { loadContentPack } from '../src/content.js';
import { parseSwaps } from '../src/util.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const PRESET_FILE = path.join(ROOT, 'presets', 'Avereth Narrator.json');
// Representative turns of both Test 5 runs, found in the logs by the start of the player's message.
export const DEFAULT_TURNS = [
    { kind: 'arrival', input: '*i walk to the Gate of the City in front of me*' },
    { kind: 'dialogue', input: 'Hello im Alaric and im newly awakend' },
    { kind: 'dialogue, name given', input: 'I dont have a family name but if you need one' },
    { kind: 'payment', input: '*i give her one Silver and say*' },
    { kind: 'registration', input: 'Alaric Red 18 no prior membershit' },
    { kind: 'quest', input: '*i take the Boletus Clearing Tannery Row Quest' },
    { kind: 'quiet follow-up', input: '*i nod at her and walk to the door' },
    { kind: 'encounter start', input: '*i go to Mol mark it with him and then go down' },
    { kind: 'combat, engine asks for a target', input: '*i dash at the nearest one' },
];
const VARIANTS = ['A', 'B', 'C'];
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------------------------------------ prompt layers
/** The two texts of the Avereth Narrator preset: the style prompt (main) and the output contract (post-history). */
export function loadNarrator(file = PRESET_FILE) {
    const preset = JSON.parse(fs.readFileSync(file, 'utf8'));
    const get = (id) => preset.prompts.find((p) => p.identifier === id)?.content || '';
    const style = get('main');
    const output = get('jailbreak');
    if (!style || !output) throw new Error(`${file}: main (style) and jailbreak (output contract) prompts are required`);
    return { style, output, preset };
}

// Megumin's own wrappers around the Avereth layers, as SillyTavern sent them (squash joins messages with one "\n")
const MEG = {
    cardOpen: /<character_sheet>\nhere is the lore and character's, [^\n]*:\n/,
    cardClose: '\n</character_sheet>',
    personaOpen: /<user_persona>\nhere the PC\/Reader [^\n]*persona:\n/,
    personaClose: '\n</user_persona>',
    thinking: '## your thinking steps:',
    historyClose: '\n</history>',
};

/**
 * Split a logged Megumin request into Megumin's share and the Avereth layers. Throws when a marker is missing: a
 * request of another shape is never guessed at.
 */
export function splitMegumin(messages) {
    const fail = (why) => { throw new Error(`not a Megumin request as logged in Test 5: ${why}`); };
    const first = messages?.[0];
    if (first?.role !== 'system') fail('the first message is not a system message');
    const s = String(first.content);
    const open = MEG.cardOpen.exec(s);
    if (!open) fail('no <character_sheet> wrapper');
    const cardStart = open.index + open[0].length;
    const cardEnd = s.indexOf(MEG.cardClose, cardStart);
    if (cardEnd < 0) fail('no </character_sheet>');
    const card = s.slice(cardStart, cardEnd);
    const t = card.indexOf(CONTRACT_TITLE);
    const e = t < 0 ? -1 : card.indexOf(CONTRACT_END, t);
    if (e < 0) fail('no Avereth narrator contract inside <character_sheet>');
    const rest = s.slice(cardEnd + MEG.cardClose.length);
    const p = MEG.personaOpen.exec(rest);
    if (!p) fail('no <user_persona> wrapper');
    const pEnd = rest.indexOf(MEG.personaClose, p.index + p[0].length);
    if (pEnd < 0) fail('no </user_persona>');
    if (!rest.slice(pEnd + MEG.personaClose.length).trimStart().startsWith('<history>')) fail('no <history> after the persona');
    const last = messages.at(-1);
    const lc = String(last?.content ?? '');
    if (last?.role !== 'system' || !lc.startsWith('[AVERETH ENGINE')) fail('the last message is not the engine block');
    const h = lc.lastIndexOf(MEG.historyClose);
    if (h < 0) fail('no </history> after the engine block');
    const middle = messages.slice(1, -1);
    const thinking = middle.filter((m) => m.role === 'system' && String(m.content).startsWith(MEG.thinking));
    if (thinking.length !== 1) fail(`Megumin's thinking prompt found ${thinking.length} times, expected once`);
    return {
        style: s.slice(0, open.index),
        loreBefore: card.slice(0, t).replace(/\n$/, ''),
        contract: card.slice(t, e + CONTRACT_END.length),
        loreAfter: card.slice(e + CONTRACT_END.length).replace(/^\n/, ''),
        persona: rest.slice(p.index + p[0].length, pEnd).replace(/^\n+/, ''),
        history: middle.filter((m) => m !== thinking[0]), // starts with SillyTavern's "[Start a new Chat]"
        thinking: thinking[0].content,
        engine: lc.slice(0, h),
        tail: lc.slice(h),
    };
}

/** The three request bodies for one logged request: A unchanged, B and C with their layer. Parameters are identical. */
export function buildVariants(req, narrator) {
    const parts = splitMegumin(req.messages);
    const sys = (content) => ({ role: 'system', content });
    const avereth = [parts.loreBefore, parts.contract, parts.loreAfter, parts.persona].filter(Boolean).map(sys);
    const layer = (style) => [...(style ? [sys(style)] : []), ...avereth, ...parts.history.map((m) => ({ ...m })), sys(parts.engine), sys(narrator.output)];
    const params = Object.fromEntries(Object.entries(req).filter(([k]) => k !== 'messages'));
    return {
        parts,
        A: { ...params, stream: false, messages: req.messages },
        B: { ...params, stream: false, messages: layer(narrator.style) },
        C: { ...params, stream: false, messages: layer(null) },
    };
}

/** What differs between the variants, message by message, and whether the Avereth layers stayed byte-identical. */
export function diffVariants(v, narrator) {
    const p = v.parts;
    const label = (m) => {
        const c = String(m.content);
        if (m.role !== 'system') return m.role;
        if (c === narrator.style) return 'style';
        if (c === narrator.output) return 'output-contract';
        if (c === p.contract) return 'contract';
        if (c === p.loreBefore || c === p.loreAfter) return 'lore';
        if (c === p.persona) return 'persona';
        if (c === p.engine) return 'engine';
        if (c === p.thinking) return 'megumin-thinking';
        if (c.startsWith(p.engine) && c.endsWith(p.tail)) return 'engine+megumin-tail';
        if (c.startsWith(p.style) && c.includes(p.contract)) return 'megumin+lore+contract+persona';
        return 'system';
    };
    const shape = Object.fromEntries(VARIANTS.map((k) => [k, v[k].messages.map((m) => `${label(m)}(${String(m.content).length})`)]));
    const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const params = (body) => JSON.stringify(Object.entries(body).filter(([k]) => k !== 'messages'));
    const a0 = String(v.A.messages[0].content);
    // the chat history of B and C sits between the Avereth layers and the engine block
    const layers = [p.loreBefore, p.contract, p.loreAfter, p.persona].filter(Boolean).length;
    const historyOf = (k) => v[k].messages.slice((k === 'B' ? 1 : 0) + layers, -2);
    const megumin = /<character_sheet>|<user_persona>|<history>|<\/history>|## your thinking steps:|never stop or refuse/;
    const checks = {
        'lore, contract, persona verbatim in A': [p.loreBefore, p.contract, p.loreAfter, p.persona].every((x) => !x || a0.includes(x)),
        'engine block verbatim in A': String(v.A.messages.at(-1).content).startsWith(p.engine),
        'chat history identical (A without the thinking prompt)': same(v.A.messages.slice(1, -1).filter((m) => m.content !== p.thinking), p.history) && same(historyOf('B'), p.history) && same(historyOf('C'), p.history),
        'player message identical': VARIANTS.every((k) => lastInput(v[k].messages) === lastInput(v.A.messages)),
        'parameters identical': params(v.B) === params(v.A) && params(v.C) === params(v.A),
        'B and C differ only in the style message': same(v.B.messages.slice(1), v.C.messages) && v.B.messages[0].content === narrator.style,
        'output contract is the last message of B and C, after the engine block': ['B', 'C'].every((k) => v[k].messages.at(-1).content === narrator.output && v[k].messages.at(-2).content === p.engine),
        'no Megumin text in B and C': ['B', 'C'].every((k) => v[k].messages.every((m) => !megumin.test(String(m.content)) && !(p.style && String(m.content).includes(p.style)))),
    };
    return { shape, checks, ok: Object.values(checks).every(Boolean) };
}

// ------------------------------------------------------------------------------------------------ turn selection
/** The requests to compare: the default turns (by the start of the player's message) or every narration request. */
export function selectTurns(pairs, which = 'default') {
    const narration = pairs.filter((p) => !isReportRequest(p.req.messages) && !p.repeatOf);
    if (which === 'all') return narration.map((p) => ({ kind: 'turn', input: lastInput(p.req.messages), pair: p }));
    const out = [];
    for (const t of DEFAULT_TURNS) {
        // the last request with that message: a regeneration replaces an earlier attempt
        const pair = [...narration].reverse().find((p) => norm(lastInput(p.req.messages)).startsWith(norm(t.input)));
        if (pair) out.push({ kind: t.kind, input: lastInput(pair.req.messages), pair });
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ engine state
/** A chat file as SillyTavern saves it: the metadata line, then one message per line with its recorded events. */
export function readChat(file) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
    return { file, messages: lines[0]?.chat_metadata ? lines.slice(1) : lines };
}

/**
 * The recorded chat up to the player's message of a turn: the state the narrator saw. The engine block rendered from it
 * must open like the logged one (turn number, time, place); the rest may differ in presentation only, where this
 * engine version prints the same state differently.
 */
export function stateFor(input, engineBlock, chats, content) {
    for (const c of chats) {
        const u = c.messages.findLastIndex((m) => m.is_user && norm(m.mes) === norm(input));
        if (u < 0) continue;
        const chat = c.messages.slice(0, u + 1);
        const text = prepareGeneration(structuredClone(chat), content, { type: 'normal', settings: { recentTurns: 4, engineLore: false } }).context?.text || '';
        const head = (s) => s.split('\n').slice(0, 2).join('\n');
        const now = text.split('\n');
        const logged = String(engineBlock).split('\n');
        return {
            chat, source: `${path.basename(c.file)}#${u}`,
            matches: !!text && head(text) === head(engineBlock),
            identical: text === String(engineBlock),
            changed: [...logged.filter((l) => !now.includes(l)).map((l) => `- ${l}`), ...now.filter((l) => !logged.includes(l)).map((l) => `+ ${l}`)],
        };
    }
    return null;
}

// ------------------------------------------------------------------------------------------------ metrics
const isSubject = (s, state, content) => s === 'pc' || !!state.entities[s] || content.locations.has(s) || content.factions.has(s);

/** How the engine takes a reply: processReply on a copy of the recorded chat at that turn (the extension's own path). */
export function validateReply(snapshot, text, content) {
    const chat = structuredClone(snapshot);
    chat.push({ is_user: false, is_system: false, mes: text, swipe_id: 0, swipes: [text], swipe_info: [{ extra: {} }], extra: {} });
    const res = processReply(chat, chat.length - 1, content, { swaps: parseSwaps('ledger=register') }).result;
    const reasons = res.rejected.map((r) => r.reason);
    const count = (re) => reasons.filter((r) => re.test(r)).length;
    const created = res.events.filter((e) => e.t === 'entity.created' && e.d.entity.kind === 'npc');
    return {
        accepted: res.accepted.length,
        rejected: reasons.length,
        reasons,
        // Alaric doing, paying, moving or accepting what the player did not choose
        ownership: count(/^PLAYER OWNERSHIP/),
        // values and outcomes the engine owns: rejected report parts, and numbers or speech in the prose that contradict it
        engineConflicts: count(/engine|contradicts|combatant|ACTIVE combat|is dead|dead do not|CHECK DIE|frozen|System-only/i)
            + res.corrections.filter((c) => /^Tracker drift|^Combat silence broken/.test(c)).length,
        // someone learning what they could not have witnessed, or a secret by other means
        knowledgeLeaks: count(/cannot have witnessed|is a secret/),
        unknownRefs: count(/unknown/i),
        unresolvedSubjects: res.events.filter((e) => e.t === 'fact.asserted' && !isSubject(e.d.fact.s, res.state, content)).map((e) => e.d.fact.s),
        newNpcs: created.length,
        newNamedNpcs: created.filter((e) => e.d.entity.name).map((e) => e.d.entity.name),
        corrections: res.corrections,
    };
}

/** Everything that can be counted without a human: the report's form, the engine's verdict, size and time. */
export function replyMetrics(resp, { ms = null, snapshot = null, content = null } = {}) {
    const text = String(resp?.choices?.[0]?.message?.content ?? '');
    const ex = extractReport(text);
    let strict = false;
    if (ex.raw != null) {
        try {
            const v = JSON.parse(String(ex.raw));
            strict = !!v && typeof v === 'object' && !Array.isArray(v);
        } catch { /* repaired or broken */ }
    }
    const closeAt = text.toLowerCase().lastIndexOf('</avereth>');
    const usage = resp?.usage || {};
    const parts = outputParts(resp);
    const partChars = Object.values(parts).reduce((a, b) => a + b, 0);
    const share = (k) => (usage.completion_tokens && partChars ? Math.round((usage.completion_tokens * parts[k]) / partChars) : null);
    return {
        report: /<avereth>/i.test(text),
        reports: (text.match(/<avereth>/gi) || []).length,
        parsed: !!ex.report,
        strictJson: strict,
        trailing: closeAt >= 0 && text.slice(closeAt + '</avereth>'.length).trim().length > 0,
        words: (ex.clean.match(/\S+/g) || []).length,
        promptTokens: usage.prompt_tokens ?? null,
        completionTokens: usage.completion_tokens ?? null,
        reasoningTokens: share('reasoning'),
        proseTokens: share('prose'),
        reportTokens: share('report'),
        ms,
        finish: resp?.choices?.[0]?.finish_reason ?? null,
        engine: snapshot && content ? validateReply(snapshot, text, content) : null,
    };
}

/** Per variant: rates and means over all replies (errors counted apart). */
export function summarize(results) {
    const rows = [];
    for (const k of VARIANTS) {
        const all = results.filter((r) => r.variant === k);
        if (!all.length) continue;
        const ok = all.filter((r) => r.metrics);
        const rate = (f) => (ok.length ? `${Math.round((100 * ok.filter(f).length) / ok.length)} %` : '–');
        const mean = (f) => {
            const xs = ok.map(f).filter((x) => typeof x === 'number');
            return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
        };
        const median = (f) => {
            const xs = ok.map(f).filter((x) => typeof x === 'number').sort((a, b) => a - b);
            return xs.length ? (xs[(xs.length - 1) >> 1] + xs[xs.length >> 1]) / 2 : null;
        };
        const eng = ok.filter((r) => r.metrics.engine);
        const sum = (f) => eng.reduce((a, r) => a + f(r.metrics.engine), 0);
        rows.push({
            variant: k, replies: ok.length, errors: all.length - ok.length,
            report: rate((r) => r.metrics.report), exactlyOne: rate((r) => r.metrics.reports === 1), parsed: rate((r) => r.metrics.parsed),
            strictJson: rate((r) => r.metrics.strictJson), trailing: rate((r) => r.metrics.trailing),
            accepted: mean((r) => r.metrics.engine?.accepted), rejected: mean((r) => r.metrics.engine?.rejected),
            ownership: sum((e) => e.ownership), engineConflicts: sum((e) => e.engineConflicts), knowledgeLeaks: sum((e) => e.knowledgeLeaks),
            unknownRefs: sum((e) => e.unknownRefs), unresolvedSubjects: sum((e) => e.unresolvedSubjects.length), newNamedNpcs: sum((e) => e.newNamedNpcs.length),
            promptTokens: mean((r) => r.metrics.promptTokens), completionTokens: mean((r) => r.metrics.completionTokens),
            reasoningTokens: mean((r) => r.metrics.reasoningTokens), words: mean((r) => r.metrics.words),
            msMedian: median((r) => r.metrics.ms), msMean: mean((r) => r.metrics.ms),
        });
    }
    return rows;
}

export function summaryMarkdown(rows) {
    const cols = [
        ['variant', 'Variante'], ['replies', 'Antworten'], ['errors', 'Fehler'], ['report', 'Report da'], ['exactlyOne', 'genau einer'],
        ['parsed', 'lesbar'], ['strictJson', 'JSON ohne Reparatur'], ['trailing', 'Text nach </avereth>'], ['accepted', 'angenommen Ø'],
        ['rejected', 'abgelehnt Ø'], ['ownership', 'Alaric-Übergriff Σ'], ['engineConflicts', 'Engine-Widerspruch Σ'], ['knowledgeLeaks', 'Wissensleck Σ'],
        ['unknownRefs', 'unbekannte Referenz Σ'], ['unresolvedSubjects', 'Subjekt unaufgelöst Σ'], ['newNamedNpcs', 'neue benannte NPCs Σ'],
        ['promptTokens', 'Prompt-Token Ø'], ['completionTokens', 'Output-Token Ø'], ['reasoningTokens', 'Reasoning Ø'], ['words', 'Wörter Ø'],
        ['msMedian', 'Dauer Median ms'], ['msMean', 'Dauer Ø ms'],
    ];
    const lines = [`| ${cols.map((c) => c[1]).join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`];
    for (const r of rows) lines.push(`| ${cols.map(([k]) => (r[k] == null ? '–' : r[k])).join(' | ')} |`);
    return lines.join('\n');
}

// ------------------------------------------------------------------------------------------------ blind export
function rng(seed) {
    let x = (Number(seed) >>> 0) || 1;
    return () => {
        x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
        return x / 0x100000000;
    };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One block per turn and repetition, the variants' replies in random order under neutral labels; the key apart. */
export function blindExport(results, turns, seed = 1) {
    const rand = rng(seed);
    const key = {};
    const blocks = [];
    for (const [ti, t] of turns.entries()) {
        const reps = [...new Set(results.filter((r) => r.turn === ti).map((r) => r.rep))].sort((a, b) => a - b);
        for (const rep of reps) {
            const items = results.filter((r) => r.turn === ti && r.rep === rep && r.metrics);
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(rand() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            const id = `T${ti + 1}-R${rep + 1}`;
            key[id] = Object.fromEntries(items.map((r, i) => [String.fromCharCode(88 + i), r.variant])); // X, Y, Z
            const prev = [...t.pair.req.messages].reverse().find((m) => m.role === 'assistant')?.content || '';
            const resolved = (String(t.engineBlock).match(/RESOLVED THIS TURN \(binding\):\n([\s\S]*?)(?:\n\n|$)/) || [])[1] || '';
            const cols = items.map((r, i) => {
                const ex = extractReport(r.content);
                const prose = esc(ex.clean).split(/\n{2,}/).map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`).join('');
                const report = ex.raw != null ? esc(ex.raw) : (/<avereth>/i.test(r.content) ? 'unlesbar' : 'kein Report');
                return `<div class="col"><h3>${String.fromCharCode(88 + i)}</h3>${prose}<details><summary>Fakten-Report</summary><pre>${report}</pre></details></div>`;
            }).join('');
            blocks.push(`<section><h2>${id} · ${esc(t.kind)}</h2><p class="ctx"><b>Spieler:</b> ${esc(t.input)}</p>${resolved ? `<p class="ctx"><b>Engine (RESOLVED):</b> ${esc(resolved)}</p>` : ''}<details class="ctx"><summary>vorige Erzählerantwort</summary><p>${esc(prev).replace(/\n/g, '<br>')}</p></details><div class="grid">${cols}</div></section>`);
        }
    }
    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Narrator-Blindvergleich</title><style>
body{font:15px/1.5 Georgia,serif;margin:16px;max-width:1500px}h2{font:600 16px sans-serif;margin-top:2em;border-top:1px solid #999;padding-top:1em}
.ctx{font:13px sans-serif;color:#444}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}.col{border:1px solid #ccc;padding:0 12px 12px}
h3{font:600 14px sans-serif}pre{white-space:pre-wrap;font-size:12px}
</style></head><body><h1>Narrator-Blindvergleich</h1><p class="ctx">Je Zug und Durchgang stehen die Antworten der Varianten in zufälliger Reihenfolge unter X, Y, Z. Die Zuordnung steht in blind_key.json; erst nach dem Bewerten öffnen.</p>${blocks.join('\n')}</body></html>`;
    return { html, key };
}

// ------------------------------------------------------------------------------------------------ API
async function callApi(body, { base, key, timeoutMs = 240000 }) {
    const url = new URL('chat/completions', base.endsWith('/') ? base : `${base}/`);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const started = Date.now();
    try {
        const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` }, body: JSON.stringify(body), signal: ctl.signal });
        const ms = Date.now() - started;
        const textBody = await res.text();
        let json = null;
        try { json = JSON.parse(textBody); } catch { /* not JSON */ }
        if (!res.ok || !json?.choices) return { error: `HTTP ${res.status}: ${textBody.slice(0, 300)}`, ms };
        return { json, ms };
    } catch (err) {
        return { error: String(err?.message || err), ms: Date.now() - started };
    } finally {
        clearTimeout(timer);
    }
}

async function pool(tasks, n) {
    const out = new Array(tasks.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.max(1, n) }, async () => {
        while (i < tasks.length) {
            const k = i++;
            out[k] = await tasks[k]();
        }
    }));
    return out;
}

// ------------------------------------------------------------------------------------------------ main
function parseArgs(argv) {
    const o = { logs: [], chats: [], turns: 'default', variants: VARIANTS, reps: 2, concurrency: 2, out: 'narrator_ab_out', seed: null, dryRun: false, write: null, preset: PRESET_FILE };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === '--log') o.logs.push(next());
        else if (a === '--chat') o.chats.push(next());
        else if (a === '--turns') o.turns = next();
        else if (a === '--variants') o.variants = next().split(',').map((s) => s.trim().toUpperCase()).filter((s) => VARIANTS.includes(s));
        else if (a === '--reps') o.reps = Math.max(1, Number(next()) || 1);
        else if (a === '--concurrency') o.concurrency = Math.max(1, Number(next()) || 1);
        else if (a === '--out') o.out = next();
        else if (a === '--seed') o.seed = Number(next());
        else if (a === '--dry-run') o.dryRun = true;
        else if (a === '--write') o.write = next();
        else if (a === '--preset') o.preset = next();
        else throw new Error(`unknown argument ${a}`);
    }
    if (!o.logs.length) throw new Error('usage: node tools/narrator_ab.mjs --log <server log> --chat <chat .jsonl> [--log … --chat …] (--dry-run [--write <dir>] | with AVERETH_AB_API_BASE and AVERETH_AB_API_KEY set)');
    return o;
}

/** Load the logs, pick the turns, build A/B/C and find each turn's recorded engine state in the chat files. */
export async function prepare({ logs, chats = [], turns = 'default', preset = PRESET_FILE }) {
    const narrator = loadNarrator(preset);
    const content = await loadContentPack(async (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', name), 'utf8')));
    const pairs = logs.flatMap((f) => parseServerLog(fs.readFileSync(f, 'utf8')).pairs);
    const recorded = chats.map(readChat);
    const out = selectTurns(pairs, turns).map((t) => {
        const v = buildVariants(t.pair.req, narrator);
        const state = stateFor(t.input, v.parts.engine, recorded, content);
        return { ...t, variants: v, diff: diffVariants(v, narrator), engineBlock: v.parts.engine, state, snapshot: state?.matches ? state.chat : null };
    });
    return { narrator, turns: out, content, pairs: pairs.length };
}

const verdict = (m) => `Report ${m.report ? (m.parsed ? 'lesbar' : 'unlesbar') : 'fehlt'}${m.engine ? `; Engine: ${m.engine.accepted} angenommen, ${m.engine.rejected} abgelehnt${m.engine.reasons.length ? ` (${m.engine.reasons.map((r) => r.slice(0, 70)).join(' | ')})` : ''}` : ''}`;

function dryRunReport(prep) {
    const lines = [`${prep.turns.length} Züge aus ${prep.pairs} Anfragen; Avereth Narrator: Stil ${prep.narrator.style.length} Zeichen, Output-Vertrag ${prep.narrator.output.length} Zeichen`];
    let ok = true;
    for (const [i, t] of prep.turns.entries()) {
        const a = t.pair.req;
        const ratio = a.messages.reduce((n, m) => n + String(m.content).length, 0) / (t.pair.resp?.usage?.prompt_tokens || NaN);
        const est = (body) => {
            const chars = body.messages.reduce((n, m) => n + String(m.content).length, 0);
            return Number.isFinite(ratio) ? Math.round(chars / ratio) : Math.round(chars / 4.3);
        };
        lines.push(`\n## T${i + 1} · ${t.kind} · "${t.input.slice(0, 60)}"`);
        for (const k of VARIANTS) lines.push(`${k} (≈ ${est(t.variants[k]).toLocaleString('de-DE')} Token): ${t.diff.shape[k].join(' ')}`);
        for (const [name, pass] of Object.entries(t.diff.checks)) lines.push(`  ${pass ? '✓' : '✗'} ${name}`);
        if (!t.state) lines.push('  – Engine-Zustand: keine Chat-Datei mit diesem Zug (--chat), nur Textmetriken');
        else {
            const shown = t.state.identical ? '; Block byte-gleich' : `; ${t.state.changed.length} Zeilen stellt diese Engine-Version anders dar:`;
            lines.push(`  ${t.state.matches ? '✓' : '✗'} Engine-Zustand aus ${t.state.source}: Zug, Zeit und Ort wie im geloggten Block${shown}`);
            for (const l of t.state.changed.slice(0, 8)) lines.push(`      ${l.slice(0, 110)}`);
        }
        if (t.pair.resp) lines.push(`  Geloggte Antwort (A im Lauf): ${verdict(replyMetrics(t.pair.resp, { snapshot: t.snapshot, content: prep.content }))}`);
        ok = ok && t.diff.ok && (!t.state || t.state.matches);
    }
    return { text: lines.join('\n'), ok };
}

async function main() {
    const o = parseArgs(process.argv.slice(2));
    const prep = await prepare(o);
    if (!prep.turns.length) throw new Error('none of the turns was found in the given logs (see DEFAULT_TURNS, or --turns all)');
    const dry = dryRunReport(prep);
    if (o.dryRun) {
        console.log(dry.text);
        if (o.write) {
            fs.mkdirSync(o.write, { recursive: true });
            for (const [i, t] of prep.turns.entries()) for (const k of VARIANTS) fs.writeFileSync(path.join(o.write, `T${i + 1}_${k}.json`), JSON.stringify(t.variants[k], null, 1));
            console.log(`\nAnfragen geschrieben nach ${o.write}`);
        }
        console.log(dry.ok ? '\nDRY RUN: OK' : '\nDRY RUN: FAILED');
        process.exit(dry.ok ? 0 : 1);
    }
    if (!dry.ok) throw new Error(`a turn is not ready (its variants or its engine state):\n${dry.text}`);
    const base = process.env.AVERETH_AB_API_BASE;
    const key = process.env.AVERETH_AB_API_KEY;
    if (!base || !key) throw new Error('set AVERETH_AB_API_BASE and AVERETH_AB_API_KEY, or use --dry-run');
    const jobs = [];
    for (const [ti, t] of prep.turns.entries()) {
        for (let rep = 0; rep < o.reps; rep++) {
            for (const k of o.variants) jobs.push({ ti, t, rep, k });
        }
    }
    let done = 0;
    const results = await pool(jobs.map((j) => async () => {
        const r = await callApi(j.t.variants[j.k], { base, key });
        done += 1;
        console.error(`${done}/${jobs.length} T${j.ti + 1} ${j.k} #${j.rep + 1}: ${r.error ? `error ${r.error.slice(0, 80)}` : `${r.ms} ms`}`);
        const base0 = { turn: j.ti, kind: j.t.kind, input: j.t.input, variant: j.k, rep: j.rep, ms: r.ms };
        if (r.error) return { ...base0, error: r.error };
        const msg = r.json.choices[0].message || {};
        return { ...base0, content: String(msg.content ?? ''), reasoning: String(msg.reasoning ?? msg.reasoning_content ?? ''), usage: r.json.usage || null, metrics: replyMetrics(r.json, { ms: r.ms, snapshot: j.t.snapshot, content: prep.content }) };
    }), o.concurrency);
    fs.mkdirSync(o.out, { recursive: true });
    const seed = o.seed ?? Math.floor(Math.random() * 1e9);
    const rows = summarize(results);
    const md = `# Narrator A/B/C\n\n${prep.turns.length} Züge × ${o.reps} Durchgänge; A = Megumin (wie geloggt), B = Avereth Narrator, C = ohne Stil-Layer.\n\n${summaryMarkdown(rows)}\n`;
    const blind = blindExport(results, prep.turns, seed);
    fs.writeFileSync(path.join(o.out, 'results.json'), JSON.stringify({ seed, turns: prep.turns.map((t) => ({ kind: t.kind, input: t.input, state: t.state?.source ?? null })), results }, null, 1));
    fs.writeFileSync(path.join(o.out, 'summary.md'), md);
    fs.writeFileSync(path.join(o.out, 'blind.html'), blind.html);
    fs.writeFileSync(path.join(o.out, 'blind_key.json'), JSON.stringify({ seed, key: blind.key }, null, 1));
    console.log(md);
    console.log(`Ergebnisse, Blindvergleich (blind.html) und Schlüssel (blind_key.json) in ${o.out}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().catch((err) => {
        console.error(err.message);
        process.exit(1);
    });
}
