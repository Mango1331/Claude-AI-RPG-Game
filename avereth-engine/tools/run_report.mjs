// Measures a play session from SillyTavern's own logs (docs/TEST5_PLAN.md): every request split into prompt categories
// (preset, Megumin dossier instructions and NPC bank, tracker templates, tracker blocks in the history, narrator
// contract, world lore, engine block, chat history) and every reply into reasoning / story / fact report / tracker
// blocks, with the generation time from the chat file. Rows are matched by the player's message, never by position (a
// discarded attempt or a regeneration is a request of its own).
//
// With --replay <fixture.json> it also rebuilds each request of an old run the way this engine version would send it
// (engine block and history window), once with the Megumin preset unchanged and once with the checklist of
// docs/RUNTIME_V3.md §9 applied. The before/after tables in RUNTIME_V3 §6 come from:
//   node tools/run_report.mjs <Testrun-4 server log> --replay tests/testrun_v4/fixture.json
//
// Usage: node tools/run_report.mjs <server log> [<chat .jsonl>] [--replay <fixture.json>]
//   <server log>: SillyTavern's console output with "Chat Completion request:" / "Chat Completion response:" lines.
//   A streamed reply is not logged there (only its request): prompt tokens are then estimated from characters (~) and
//   the output split is unknown, so measure with streaming off.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stripTrackerBlocks } from '../src/util.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CHARS_PER_TOKEN = 4.3; // GLM on the Testruns (4.27-4.35); only used when a request has no usage
export const CATEGORIES = {
    preset: 'Preset (Megumin-Basis bzw. Standard-Preset)',
    dossier: 'NPC-Dossier/Update-Anweisungen',
    npcBank: 'NPC-Bank (Injektion)',
    trackerTemplate: 'Tracker-Templates (<Blocks>)',
    trackerHistory: 'Tracker-Blöcke im Verlauf',
    contract: 'Erzähler-Vertrag',
    lore: 'Lore (World Info)',
    engine: 'Engine-Block',
    history: 'Chat-Verlauf (Prosa + Spielernachrichten)',
};
const MARK = {
    dossier: ['### NPC DOSSIER:', '<banlist>'], // includes NPC UPDATES and the injected "[CRITICAL RULE: DO NOT generate a dossier"
    npcBank: ['[RELEVANT NPCs]', '</retrieved_npcs>'],
    trackerTemplate: ['## At the end of your response, output exactly one <Blocks> section.', '</Blocks>'],
    contract: ['ROLE & PURPOSE', 'Correct any violation before output.'],
};
const CONTRACT_TITLE = 'AVERETH RPG — SANDBOX NARRATOR CONTRACT';

// ------------------------------------------------------------------------------------------------ server log
function literalAt(text, from) {
    let depth = 0;
    let quote = null;
    for (let i = from; i < text.length; i++) {
        const ch = text[i];
        if (quote) {
            if (ch === '\\') i += 1;
            else if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{' || ch === '[') depth += 1;
        else if (ch === '}' || ch === ']') {
            depth -= 1;
            if (depth === 0) return text.slice(from, i + 1);
        }
    }
    return null;
}

/**
 * Requests and responses in log order. SillyTavern logs them with util.inspect (a JavaScript literal, not JSON); a
 * literal is evaluated in an empty context. The log is the player's own file.
 */
export function parseServerLog(text) {
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    const seq = [];
    const re = /^Chat Completion (request|response): /gm;
    let m;
    while ((m = re.exec(clean))) {
        const start = clean.indexOf('{', m.index + m[0].length);
        const lit = start >= 0 ? literalAt(clean, start) : null;
        let obj = null;
        let error = lit ? null : 'no object';
        if (lit) {
            try {
                obj = JSON.parse(lit);
            } catch {
                try { obj = vm.runInNewContext(`(${lit})`, Object.create(null), { timeout: 5000 }); } catch (e) { error = String(e?.message || e); }
            }
        }
        seq.push({ kind: m[1], obj, error });
    }
    // a response belongs to the request right before it; a streamed request has none
    const pairs = [];
    for (const [i, x] of seq.entries()) {
        if (x.kind === 'request' && x.obj) pairs.push({ req: x.obj, resp: seq[i + 1]?.kind === 'response' ? seq[i + 1].obj : null });
    }
    return { pairs, errors: seq.filter((x) => x.error).map((x) => `${x.kind}: ${x.error}`) };
}

const trackerChars = (text) => text.length - stripTrackerBlocks(text).length;
export const lastInput = (messages) => String([...messages].reverse().find((m) => m.role === 'user')?.content ?? '');
const normInput = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Characters per prompt category. lore: the lorebook entry texts to look for. */
export function promptParts(messages, lore = []) {
    const parts = Object.fromEntries(Object.keys(CATEGORIES).map((c) => [c, 0]));
    for (const m of messages) {
        const c = String(m.content ?? '');
        if (m.role === 'user' || m.role === 'assistant') {
            const t = trackerChars(c);
            parts.trackerHistory += t;
            parts.history += c.length - t;
            continue;
        }
        if (c.startsWith('[AVERETH ENGINE')) {
            parts.engine += c.length;
            continue;
        }
        let rest = c.length;
        const take = (cat, [open, close]) => {
            const a = c.indexOf(open);
            const b = a >= 0 ? c.indexOf(close, a) : -1;
            if (a < 0 || b < 0) return;
            let from = a;
            if (cat === 'contract') {
                const title = c.lastIndexOf(CONTRACT_TITLE, a);
                if (title >= 0 && a - title < 200) from = title;
            }
            parts[cat] += b + close.length - from;
            rest -= b + close.length - from;
        };
        for (const cat of ['dossier', 'npcBank', 'trackerTemplate', 'contract']) take(cat, MARK[cat]);
        for (const e of lore) {
            if (e && c.includes(e)) {
                parts.lore += e.length;
                rest -= e.length;
            }
        }
        parts.preset += rest;
    }
    return parts;
}

/** Characters of a reply: reasoning, story, fact report, tracker blocks. */
export function outputParts(resp) {
    const msg = resp?.choices?.[0]?.message || {};
    const content = String(msg.content ?? '');
    const reasoning = String(msg.reasoning ?? msg.reasoning_content ?? '');
    const report = (content.match(/<avereth>[\s\S]*?(?:<\/avereth>|$)/) || [''])[0].length;
    const tracker = trackerChars(content);
    return { reasoning: reasoning.length, prose: Math.max(0, content.length - report - tracker), report, tracker };
}

// ------------------------------------------------------------------------------------------------ chat file
function letters(s) {
    return stripTrackerBlocks(String(s)).replace(/<avereth>[\s\S]*?(?:<\/avereth>|$)/g, '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 200);
}

/** Every generation the chat kept (all swipes), with the player's message before it and its duration. */
export function chatGenerations(jsonlText) {
    const msgs = jsonlText.split('\n').filter((l) => l.trim()).slice(1).map((l) => JSON.parse(l));
    const gens = [];
    for (const [i, m] of msgs.entries()) {
        if (m.is_user || m.is_system) continue;
        const input = [...msgs.slice(0, i)].reverse().find((x) => x.is_user)?.mes ?? '';
        const swipes = Array.isArray(m.swipes) && m.swipes.length ? m.swipes.map((text, k) => ({ text, info: m.swipe_info?.[k] || {} })) : [{ text: m.mes, info: m }];
        for (const s of swipes) {
            const seconds = (Date.parse(s.info.gen_finished) - Date.parse(s.info.gen_started)) / 1000;
            if (Number.isFinite(seconds)) gens.push({ input: normInput(input), key: letters(s.text), seconds, used: false });
        }
    }
    return gens;
}

function matchGeneration(gens, input, respText) {
    const key = respText == null ? null : letters(respText);
    let best = null;
    let bestScore = 0;
    for (const g of gens) {
        if (g.used || g.input !== input) continue;
        let score = 1;
        if (key) {
            let n = 0;
            while (n < key.length && key[n] === g.key[n]) n += 1;
            if (n < 30 && n < key.length) continue;
            score = 1 + n;
        }
        if (score > bestScore) [best, bestScore] = [g, score];
    }
    if (best) best.used = true;
    return best;
}

// ------------------------------------------------------------------------------------------------ Runtime V3 replay
/** Engine block and history window of this engine version for every turn of a fixture, keyed by the player's message. */
export async function replayFixture(fixture) {
    const { loadContentPack } = await import('../src/content.js');
    const { prepareGeneration, processReply, projectPromptHistory } = await import('../src/host.js');
    const { parseSwaps } = await import('../src/util.js');
    const content = await loadContentPack(async (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', name), 'utf8')));
    const swaps = parseSwaps('ledger=register');
    const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
    const chat = [ai(fixture.greeting)];
    processReply(chat, 0, content, { seed: fixture.seed, swaps });
    const turns = new Map();
    for (const t of fixture.turns) {
        chat.push({ is_user: true, is_system: false, mes: t.input, extra: {} });
        // as the extension runs it: recent turns bounded by the window, world lore from the card's lorebook
        const gen = prepareGeneration(chat, content, { type: 'normal', settings: { recentTurns: 4, engineLore: false } });
        const core = chat.map((m) => ({ ...m }));
        projectPromptHistory(core, { keepTurns: 4 });
        turns.set(normInput(t.input), { engine: gen.context?.text?.length || 0, history: core.reduce((a, m) => a + m.mes.length, 0) });
        chat.push(ai(t.reply));
        processReply(chat, chat.length - 1, content, { swaps });
    }
    return { turns, contract: content.narrator.contract_text.length };
}

// ------------------------------------------------------------------------------------------------ report
/** One row per request: prompt categories (tokens), output split (tokens), duration. */
export function measure(pairs, { lore = [], gens = [] } = {}) {
    return pairs.map((p, i) => {
        const messages = p.req.messages || [];
        const chars = promptParts(messages, lore);
        const total = Object.values(chars).reduce((a, b) => a + b, 0);
        const usage = p.resp?.usage;
        const ratio = usage?.prompt_tokens ? total / usage.prompt_tokens : CHARS_PER_TOKEN;
        const out = p.resp ? outputParts(p.resp) : null;
        const outChars = out ? Object.values(out).reduce((a, b) => a + b, 0) : 0;
        const outTokens = usage?.completion_tokens ?? null;
        const input = lastInput(messages);
        const gen = matchGeneration(gens, normInput(input), p.resp ? String(p.resp.choices?.[0]?.message?.content ?? '') : null);
        return {
            n: i + 1, input, chars, ratio, estimated: !usage?.prompt_tokens,
            prompt: usage?.prompt_tokens ?? Math.round(total / CHARS_PER_TOKEN),
            parts: Object.fromEntries(Object.entries(chars).map(([k, v]) => [k, Math.round(v / ratio)])),
            completion: outTokens,
            output: out && outTokens ? Object.fromEntries(Object.entries(out).map(([k, v]) => [k, outChars ? Math.round((outTokens * v) / outChars) : 0])) : null,
            seconds: gen?.seconds ?? null, effort: p.req.reasoning_effort ?? null, stream: !!p.req.stream, finish: p.resp?.choices?.[0]?.finish_reason ?? null,
        };
    });
}

/** The same request as this engine version would send it: Megumin unchanged, and with the RUNTIME_V3 §9 checklist. */
export function v3Columns(row, replay) {
    const t = replay.turns.get(normInput(row.input));
    if (!t) return null;
    const tok = (c) => Math.round(c / row.ratio);
    const engineOnly = { ...row.parts, trackerHistory: 0, contract: tok(replay.contract), engine: tok(t.engine), history: tok(t.history) };
    const withMegumin = { ...engineOnly, dossier: 0, npcBank: 0, trackerTemplate: 0 };
    return { engineOnly, withMegumin };
}

const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const fmt = (v) => (v == null ? '–' : Math.round(v).toLocaleString('de-DE'));
const short = (s) => JSON.stringify(s.replace(/\s+/g, ' ').slice(0, 48));

function printReport(rows, replay) {
    const cats = Object.keys(CATEGORIES);
    console.log('## Prompt je Anfrage (Token; ~ = aus Zeichen geschätzt, kein Usage im Log)\n');
    console.log(`| # | Eingabe | Prompt | ${cats.map((c) => CATEGORIES[c]).join(' | ')} |`);
    console.log(`|---|---|---:|${cats.map(() => '---:').join('|')}|`);
    for (const r of rows) console.log(`| ${r.n} | ${short(r.input)} | ${r.estimated ? '~' : ''}${fmt(r.prompt)} | ${cats.map((c) => fmt(r.parts[c])).join(' | ')} |`);
    console.log('\n## Output je Antwort (Token, nach Zeichenanteil aufgeteilt) und Dauer\n');
    console.log('| # | Eingabe | Output | Reasoning | Prosa | Report | Tracker | Dauer s | Reasoning-Stufe | Stream | Ende |');
    console.log('|---|---|---:|---:|---:|---:|---:|---:|---|---|---|');
    for (const r of rows) {
        const o = r.output || {};
        console.log(`| ${r.n} | ${short(r.input)} | ${fmt(r.completion)} | ${fmt(o.reasoning)} | ${fmt(o.prose)} | ${fmt(o.report)} | ${fmt(o.tracker)} | ${r.seconds == null ? '–' : r.seconds.toFixed(1)} | ${r.effort ?? '–'} | ${r.stream ? 'ja' : 'nein'} | ${r.finish ?? '–'} |`);
    }
    const withOut = rows.filter((r) => r.output);
    if (withOut.length) {
        const avg = (f) => withOut.reduce((a, r) => a + f(r), 0) / withOut.length;
        const secs = rows.filter((r) => r.seconds != null).map((r) => r.seconds).sort((x, y) => x - y);
        const median = secs.length ? (secs[(secs.length - 1) >> 1] + secs[secs.length >> 1]) / 2 : null;
        console.log(`\nMittel über ${withOut.length} Antworten: Prompt ${fmt(avg((r) => r.prompt))} · Output ${fmt(avg((r) => r.completion))} (Reasoning ${fmt(avg((r) => r.output.reasoning))}, Prosa ${fmt(avg((r) => r.output.prose))}, Report ${fmt(avg((r) => r.output.report))}, Tracker ${fmt(avg((r) => r.output.tracker))})${secs.length ? ` · Dauer Mittel ${(secs.reduce((x, y) => x + y, 0) / secs.length).toFixed(1)} s, Median ${median.toFixed(1)} s (${secs.length} zugeordnet)` : ''}`);
    }
    if (!replay) return;
    console.log('\n## Runtime-V3-Nachbau derselben Anfragen (Token)\n');
    console.log('| # | Eingabe | Vorher | Engine V3 allein (Megumin unverändert) | V3 + Megumin-Checkliste |');
    console.log('|---|---|---:|---:|---:|');
    for (const r of rows) {
        const v = v3Columns(r, replay);
        if (!v) {
            console.log(`| ${r.n} | ${short(r.input)} | ${fmt(r.prompt)} | nicht im Fixture (verworfener Versuch?) | |`);
            continue;
        }
        const b = sum(r.parts);
        const pct = (x) => `${fmt(x)} (−${100 - Math.round((100 * x) / b)} %)`;
        console.log(`| ${r.n} | ${short(r.input)} | ${fmt(b)} | ${pct(sum(v.engineOnly))} | ${pct(sum(v.withMegumin))} |`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const at = args.indexOf('--replay');
    const replayFile = at >= 0 ? args.splice(at, 2)[1] : null;
    const detail = args.indexOf('--detail');
    const detailTurns = detail >= 0 ? args.splice(detail, 2)[1].split(',').map(Number) : [];
    const [logFile, chatFile] = args;
    if (!logFile) {
        console.error('usage: node tools/run_report.mjs <server log> [<chat .jsonl>] [--replay <fixture.json>] [--detail 7,9]');
        process.exit(2);
    }
    const { pairs, errors } = parseServerLog(fs.readFileSync(logFile, 'utf8'));
    const lorebook = JSON.parse(fs.readFileSync(path.join(ROOT, 'lorebook/Avereth_World_Lore_v0.11.json'), 'utf8'));
    const lore = Object.values(lorebook.entries).map((e) => String(e.content || '').trim()).filter((s) => s.length > 40);
    const gens = chatFile ? chatGenerations(fs.readFileSync(chatFile, 'utf8')) : [];
    const rows = measure(pairs, { lore, gens });
    const replay = replayFile ? await replayFixture(JSON.parse(fs.readFileSync(replayFile, 'utf8'))) : null;
    console.log(`${pairs.length} Anfragen, ${pairs.filter((p) => p.resp).length} mit Antwort im Log${errors.length ? `, ${errors.length} nicht lesbar: ${errors.slice(0, 3).join('; ')}` : ''}\n`);
    printReport(rows, replay);
    for (const n of detailTurns) {
        const r = rows.find((x) => x.n === n);
        if (!r) continue;
        const v = replay ? v3Columns(r, replay) : null;
        console.log(`\n### Anfrage ${n}: ${short(r.input)} (${r.ratio.toFixed(2)} Zeichen/Token)\n`);
        console.log(`| Kategorie | Vorher${v ? ' | Engine V3 allein | V3 + Megumin-Checkliste' : ''} |`);
        console.log(`|---|---:${v ? '|---:|---:' : ''}|`);
        for (const c of Object.keys(CATEGORIES)) console.log(`| ${CATEGORIES[c]} | ${fmt(r.parts[c])}${v ? ` | ${fmt(v.engineOnly[c])} | ${fmt(v.withMegumin[c])}` : ''} |`);
        console.log(`| **Summe** | **${fmt(sum(r.parts))}**${v ? ` | **${fmt(sum(v.engineOnly))}** | **${fmt(sum(v.withMegumin))}**` : ''} |`);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
