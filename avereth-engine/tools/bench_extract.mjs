// Patch 8.2 (docs/PATCH8_2_LLM_PERFORMANCE.md): offline extractor benchmark. The extractor requests a live run logged
// (SillyTavern's console output, "Chat Completion request:" lines, tools/run_report.mjs parseServerLog) are sent again
// exactly as logged, in three variants; nothing else changes:
//   A0  the logged request without reasoning_effort (GLM-5.3-Flash then reasons at its default, "max")
//   A   the logged request unchanged (the preset's reasoning_effort, e.g. "low", and every other extra as logged)
//   C   A with one closing instruction to decide promptly (CONCISE below), as the 8.1 repair of an empty answer asks
// Each answer is judged by the engine against the state the live extractor saw: the run's chat file (--chat: a fixture
// or SillyTavern's .jsonl) up to that reply, the reply's extraction set pending again, the answer parsed and committed
// as the runtime commits it (runtime.js applyExtraction), and the resulting world compared with what the live answer
// made of the same reply (worldSummary). The variants run interleaved (their order rotates per round and request), so a
// provider's slow minute does not land on one variant alone.
//
// Usage:
//   node tools/bench_extract.mjs --log <server log> --chat <chat .jsonl | fixture .json> --dry-run
//   AVERETH_BENCH_API_BASE=<OpenAI-compatible base URL> AVERETH_BENCH_API_KEY=<key> \
//     node tools/bench_extract.mjs --log <server log> --chat <chat> [--rounds 3] [--variants A0,A,C] [--only 12,14]
//       [--out bench_extract_out.json]
// --dry-run sends nothing: it checks that each logged request is found in the chat, rebuilds it with this engine
// version (identical or not) and judges the logged answer (the live A) against the live result.
// The key is read from the environment only; it is never written anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseServerLog } from './run_report.mjs';
import { loadContentPack } from '../src/content.js';
import { foldChat, rec, setRec } from '../src/host.js';
import { extractionRequest, applyExtraction, LLM } from '../src/v4/runtime.js';
import { parseExtraction, extractorSystem, EXTRACTOR_VERSION } from '../src/v4/extract.js';
import { hash32 } from '../src/util.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const VARIANTS = ['A0', 'A', 'C'];
export const CONCISE = 'Decide promptly. Report what this reply plainly establishes; leave out optional deltas you are unsure of instead of weighing them at length (a few minutes of time, small facts). An empty deltas list is a valid answer.';

// ------------------------------------------------------------------------------------------------ requests
/** The chat a run recorded: a fixture ({messages}) or SillyTavern's .jsonl (its first line is the chat's header). */
export function readChat(file) {
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.jsonl')) return text.split('\n').filter(Boolean).map((l) => JSON.parse(l)).slice(1);
    const x = JSON.parse(text);
    return Array.isArray(x) ? x : x.messages;
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const userText = (req) => String(req.messages?.find((m) => m.role === 'user')?.content ?? '');

/**
 * The logged extractor requests (first calls, not their repairs: system + user only), each with the reply of the chat
 * it read. A request whose reply is not in the chat is kept with id null (it can be timed, not judged).
 */
export function extractorRequests(pairs, chat, content) {
    const head = extractorSystem(content.deltaVocab).slice(0, 160);
    const out = [];
    for (const [n, p] of pairs.entries()) {
        const m = p.req?.messages;
        if (!Array.isArray(m) || m.length !== 2 || !String(m[0].content).startsWith(head)) continue;
        const u = userText(p.req);
        const id = chat.findIndex((x) => !x.is_user && !x.is_system && String(x.mes).trim() && u.includes(String(x.mes).slice(0, 300)));
        out.push({ n, body: p.req, resp: p.resp, id: id >= 0 ? id : null });
    }
    return out;
}

/** The chat up to reply id with that reply's extraction pending again, as the runtime had it before the live answer. */
export function pendingChat(chat, id) {
    const c = clone(chat.slice(0, id + 1)).map((m) => ({ mes: m.mes, is_user: !!m.is_user, is_system: !!m.is_system, extra: m.extra?.avereth ? { avereth: m.extra.avereth } : {} }));
    const r = rec(c[id]);
    setRec(c[id], { v: r?.v ?? 3, events: [], text_hash: hash32(c[id].mes), extraction: { status: 'pending', version: EXTRACTOR_VERSION }, corrections: [] });
    return c;
}

/** The three variants of one logged request body (everything else exactly as logged). */
export function variantBody(body, variant) {
    const b = clone(body);
    for (const k of Object.keys(b)) if (b[k] === undefined) delete b[k];
    if (variant === 'A0') delete b.reasoning_effort;
    if (variant === 'C') b.messages = [...b.messages, { role: 'user', content: CONCISE }];
    return b;
}

// ------------------------------------------------------------------------------------------------ judging
/** What of a state a reply's extraction can change, in a form two runs of the same reply can be compared by. */
export function worldSummary(state) {
    const ents = Object.fromEntries(Object.values(state.entities || {}).map((e) => [e.id, [e.kind, e.status, e.location ?? null, e.group ?? null].join('|')]));
    return {
        at: state.scene?.at ?? null,
        present: [...(state.scene?.present || [])].sort(),
        minute: state.clock?.minute ?? null,
        entities: ents,
        places: Object.keys(state.places || {}).sort(),
        links: Object.keys(state.links || {}).length,
        quests: Object.fromEntries(Object.values(state.quests || {}).map((q) => [q.id, `${q.status}${q.ready ? '+ready' : ''}`])),
        objects: Object.fromEntries(Object.values(state.objects || {}).map((o) => [o.id, JSON.stringify(o.holder ?? null)])),
        awareness: { ...(state.scene?.awareness || {}) },
        facts: Object.fromEntries(Object.values(state.facts || {}).map((f) => [f.id, `${f.p}=${f.o}${f.until ? ' (ended)' : ''}`])),
        memories: (state.memories || []).length,
        threads: Object.fromEntries(Object.values(state.threads || {}).map((t) => [t.id, t.status])),
        encounter: state.encounter ? `${state.encounter.id}:${state.encounter.phase}` : null,
    };
}

/** The keys in which two summaries differ ("entities.npc.x", "minute", "facts"). */
export function summaryDiff(a, b) {
    const out = [];
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const x = a[k];
        const y = b[k];
        if (x && y && typeof x === 'object' && !Array.isArray(x)) {
            for (const j of new Set([...Object.keys(x), ...Object.keys(y)])) if (x[j] !== y[j]) out.push(`${k}.${j}`);
        } else if (JSON.stringify(x) !== JSON.stringify(y)) out.push(k);
    }
    return out;
}

/**
 * Judge one answer to request item: parsed and committed as the runtime does, its world compared with the live one.
 * @returns {{valid: boolean, errors?: string[], deltas?: number, rejected?: number, diff?: string[]}}
 */
export function judge(item, answerText, content, chat) {
    if (item.id === null) return { valid: false, errors: ['reply not in the chat'] };
    const c = pendingChat(chat, item.id);
    const req = extractionRequest(c, item.id, content);
    if (!req) return { valid: false, errors: ['no extraction request'] };
    const parsed = parseExtraction(String(answerText ?? ''), content.deltaVocab, req.ids, req.expectedKeys);
    if (!parsed.valid) return { valid: false, errors: parsed.errors.slice(0, 3) };
    applyExtraction(c, item.id, content, parsed, { hash: req.hash });
    const live = worldSummary(foldChat(chat.slice(0, item.id + 1)).state);
    const r = rec(c[item.id]);
    return { valid: true, complete: parsed.complete, deltas: (parsed.value.deltas || []).length, rejected: (r.rejected || []).length, diff: summaryDiff(live, worldSummary(foldChat(c).state)) };
}

/** Is the request this engine version builds for the reply the logged one (system and user text byte-identical)? */
export function rebuiltIdentical(item, content, chat) {
    if (item.id === null) return null;
    const req = extractionRequest(pendingChat(chat, item.id), item.id, content);
    if (!req) return false;
    return req.messages.length === item.body.messages.length && req.messages.every((m, i) => m.role === item.body.messages[i].role && m.content === item.body.messages[i].content);
}

// ------------------------------------------------------------------------------------------------ the run
/** The order the variants run in: rotated per round and request, so no variant always goes first. */
export function schedule(items, variants, rounds) {
    const out = [];
    for (let r = 0; r < rounds; r++) {
        for (const [i, item] of items.entries()) {
            for (let k = 0; k < variants.length; k++) out.push({ round: r, item, variant: variants[(k + r + i) % variants.length] });
        }
    }
    return out;
}

/** One answer's measures from the provider's response (what it reported; nothing estimated). */
export function measures(json, ms) {
    const ch = json?.choices?.[0] || {};
    const m = ch.message || {};
    const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((x) => x?.text || '').join('') : '';
    const u = json?.usage || {};
    const num = (v) => (Number.isFinite(v) ? v : null);
    return {
        ms, finish: ch.finish_reason ?? null, empty: !text.trim(), text,
        prompt: num(u.prompt_tokens), cached: num(u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens), completion: num(u.completion_tokens),
        reasoning_chars: typeof m.reasoning === 'string' ? m.reasoning.length : typeof m.reasoning_content === 'string' ? m.reasoning_content.length : null,
    };
}

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };
const p90 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * 0.9) - 1)] : null; };
const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

/** Per variant: time (median, p90), tokens, ends at the limit, empty and invalid answers, the world changes taken and
 * refused, how far from the live world. */
export function summarize(results, variants) {
    return variants.map((v) => {
        const r = results.filter((x) => x.variant === v && !x.error);
        const judged = r.filter((x) => x.judged);
        return {
            variant: v, n: r.length, errors: results.filter((x) => x.variant === v && x.error).length,
            median_ms: median(r.map((x) => x.ms)), p90_ms: p90(r.map((x) => x.ms)),
            completion: mean(r.map((x) => x.completion).filter(Number.isFinite)), length: r.filter((x) => x.finish === 'length').length,
            empty: r.filter((x) => x.empty).length, invalid: judged.filter((x) => !x.judged.valid).length,
            // the world changes the engine took and refused over all valid answers (the variants answer the same requests)
            accepted: sum(judged.filter((x) => x.judged.valid).map((x) => (x.judged.deltas || 0) - (x.judged.rejected || 0))),
            rejected: sum(judged.filter((x) => x.judged.valid).map((x) => x.judged.rejected || 0)),
            diff_mean: mean(judged.filter((x) => x.judged.valid).map((x) => x.judged.diff.length)),
            identical_world: judged.filter((x) => x.judged.valid && !x.judged.diff.length).length,
        };
    });
}

export function summaryText(rows) {
    const L = ['| Variante | n | Median | p90 | Ausgabe-Token Ø | am Limit | leer | ungültig | Deltas übernommen | Deltas abgelehnt | Abweichung zur Live-Welt Ø | gleiche Welt |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
    const s = (ms) => (ms === null ? '–' : `${(ms / 1000).toFixed(1)} s`);
    for (const r of rows) L.push(`| ${r.variant} | ${r.n}${r.errors ? ` (+${r.errors} Fehler)` : ''} | ${s(r.median_ms)} | ${s(r.p90_ms)} | ${r.completion ?? '–'} | ${r.length} | ${r.empty} | ${r.invalid} | ${r.accepted} | ${r.rejected} | ${r.diff_mean ?? '–'} | ${r.identical_world} |`);
    return L.join('\n');
}

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

/** Load the log and the chat; the extractor requests with their replies (only: the reply indices to keep). */
export async function prepare({ log, chat: chatFile, only = null }) {
    const content = await loadContentPack(async (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', name), 'utf8')));
    const { pairs } = parseServerLog(fs.readFileSync(log, 'utf8'));
    const chat = readChat(chatFile);
    let items = extractorRequests(pairs, chat, content);
    if (only) items = items.filter((x) => only.includes(x.id));
    return { content, chat, items };
}

/** The dry run: each request found, rebuilt (identical?) and the logged answer judged against the live world. */
export function dryRun({ content, chat, items }) {
    return items.map((item) => {
        const logged = item.resp ? measures(item.resp, null) : null;
        return { n: item.n, id: item.id, identical: rebuiltIdentical(item, content, chat), logged: logged && { finish: logged.finish, completion: logged.completion, empty: logged.empty }, judged: logged ? judge(item, logged.text, content, chat) : null };
    });
}

function parseArgs(argv) {
    const o = { log: null, chat: null, rounds: 3, variants: VARIANTS, only: null, out: 'bench_extract_out.json', dryRun: false, concurrency: 1 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === '--log') o.log = next();
        else if (a === '--chat') o.chat = next();
        else if (a === '--rounds') o.rounds = Math.max(1, Number(next()) || 1);
        else if (a === '--variants') o.variants = next().split(',').map((s) => s.trim().toUpperCase()).filter((s) => VARIANTS.includes(s));
        else if (a === '--only') o.only = next().split(',').map(Number).filter(Number.isInteger);
        else if (a === '--out') o.out = next();
        else if (a === '--dry-run') o.dryRun = true;
        else if (a === '--concurrency') o.concurrency = Math.max(1, Number(next()) || 1);
        else throw new Error(`unknown argument ${a}`);
    }
    if (!o.log || !o.chat) throw new Error('usage: node tools/bench_extract.mjs --log <server log> --chat <chat .jsonl | fixture .json> (--dry-run | with AVERETH_BENCH_API_BASE and AVERETH_BENCH_API_KEY) [--rounds 3] [--variants A0,A,C] [--only 12,14] [--out file]');
    return o;
}

async function main() {
    const o = parseArgs(process.argv.slice(2));
    const prep = await prepare(o);
    console.log(`${prep.items.length} Extractor-Anfragen im Log, ${prep.items.filter((x) => x.id !== null).length} davon einer Antwort im Chat zugeordnet.`);
    if (o.dryRun) {
        for (const r of dryRun(prep)) {
            const j = r.judged;
            console.log(`#${r.n} → Nachricht ${r.id ?? '–'} · neu gebaut ${r.identical === null ? '–' : r.identical ? 'byte-gleich' : 'ABWEICHEND'} · geloggt: ${r.logged ? `${r.logged.finish}, ${r.logged.completion ?? '?'} Token${r.logged.empty ? ', leer' : ''}` : '–'} · Bewertung: ${!j ? '–' : j.valid ? `${j.deltas} Deltas, ${j.rejected} abgelehnt, ${j.diff.length ? `Welt weicht ab in ${j.diff.slice(0, 4).join(', ')}` : 'Welt wie live'}` : `ungültig (${(j.errors || []).join('; ').slice(0, 80)})`}`);
        }
        return;
    }
    const base = process.env.AVERETH_BENCH_API_BASE || process.env.AVERETH_AB_API_BASE;
    const key = process.env.AVERETH_BENCH_API_KEY || process.env.AVERETH_AB_API_KEY;
    if (!base || !key) throw new Error('set AVERETH_BENCH_API_BASE and AVERETH_BENCH_API_KEY (or use --dry-run)');
    const runs = schedule(prep.items, o.variants, o.rounds);
    const results = new Array(runs.length);
    let next = 0;
    await Promise.all(Array.from({ length: o.concurrency }, async () => {
        while (next < runs.length) {
            const k = next++;
            const { round, item, variant } = runs[k];
            const res = await callApi(variantBody(item.body, variant), { base, key });
            if (res.error) { results[k] = { round, n: item.n, id: item.id, variant, ms: res.ms, error: res.error }; continue; }
            const m = measures(res.json, res.ms);
            results[k] = { round, n: item.n, id: item.id, variant, ...m, text: undefined, judged: judge(item, m.text, prep.content, prep.chat) };
            console.log(`R${round + 1} #${item.n} ${variant}: ${(m.ms / 1000).toFixed(1)} s, ${m.completion ?? '?'} Token, ${m.finish}${m.empty ? ', leer' : ''}`);
        }
    }));
    const rows = summarize(results, o.variants);
    console.log(`\n${summaryText(rows)}`);
    fs.writeFileSync(o.out, JSON.stringify({ model: prep.items[0]?.body?.model ?? null, rounds: o.rounds, variants: o.variants, concise: CONCISE, summary: rows, results }, null, 1));
    console.log(`\nErgebnisse: ${o.out}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main().catch((err) => { console.error(err.message); process.exit(1); });
export { LLM };
