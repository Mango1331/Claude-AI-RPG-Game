// P0 / S4a: the semantic core of the GM-tools hypothesis, without the tool interface (docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §15).
// S4 mixed three things: what the player means, which internal command and field names avereth_resolve_story expects
// (the tool lists neither), and whether the Narrator calls a tool at all. S4a keeps only the first: the same cases,
// scenes and model as S1, the same user message (catalog + player message), the same output interface (the command
// list with its arguments, the plain JSON format, local schema check with one repair call, the agency guard, the S1
// scorer). Only the system context differs: the Narrator contract with a GM planning step instead of the interpreter's
// role. No function calling, no narration, no commit_world, no engine run.
//
//   node tools/p0/s4a_gm_semantics.mjs --sample 80 --compare p0_out/s1_now/results.json --concurrency 1
//
// Arms (--arm):
//   gm        (default) Narrator contract + GM planning step + the command interface. Without the interpreter's agency
//             rules and contrastive examples: can the general GM context tell the player's actions as well?
//   gm_rules  the same plus the interpreter's rules and examples: does the Narrator context itself cost accuracy, when
//             the specialisation is there too?
// Options: --temperature 0.1 (as S1)  --max-tokens 2500 (as S1)  --reasoning <value>|keep  --concurrency 1
//          --cases id,id  --tags tag,tag  --limit N  --sample N  --corpus <file>  --backend st|direct|mock  --st-url <url>
//          --profile "<name>"  --out <dir> (default p0_out/s4a_<arm>)  --dry-run
// Output: summary.md (to send back), results.json. No key, header or endpoint URL is written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { structuredCall, callTokens } from './lib/structured.mjs';
import { loadVocabulary, loadScenes, guardContextFromScene } from './lib/interpreter.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { guardCommands } from '../../src/v4/agency.js';
import { scoreCase, aggregate, COMMITMENTS } from './lib/score.mjs';
import { sampleCases, s1MockResponder, CORPUS_FILE, PRODUCT_VOCAB_FILE } from './s1_interpreter.mjs';
import { compareWithS1 } from './s4_gm_tools.mjs';
import {
    ENGINE_ROOT, OUT_ROOT, parseArgs, intArg, pool, percentile, mean, round, pct, readJsonl, readJson, writeJson, writeText,
    nowIso, progress, mdTable, assertNoSecrets, scrub, estimateTokens,
} from './lib/util.mjs';

export const TOOL = 's4a_gm_semantics';
export const TOOL_VERSION = 1;
export const ARMS = ['gm', 'gm_rules'];
const CONTRACT_FILE = path.join(ENGINE_ROOT, 'content', 'narrator', 'Avereth_Narrator_Contract_v4.txt');

/** The planning step a GM planner would take before narrating; it adds no rule the interpreter's first line lacks. */
export const GM_PLANNING_STEP = [
    'GM PLANNING STEP — Before you narrate this turn, decide which actions Alaric himself takes in the PLAYER MESSAGE that the Avereth engine must resolve. You own the reading of the message; the engine owns the outcome.',
    'In this step you do not narrate. Answer only with the plan: the engine actions below, in the order he takes them, each with the exact words of the message that commit him to it. Everything else (speech, looking, thoughts, other characters, soft fiction) you will narrate freely afterwards and it does not go into the plan; an empty plan is a valid answer.',
].join('\n');

/**
 * The system prompt of an arm. The interface part (command list + answer line) is the interpreter's, word for word;
 * the plain-format line is added by structuredCall exactly as in S1.
 */
export function s4aSystem(vocab, arm = 'gm', contract = fs.readFileSync(CONTRACT_FILE, 'utf8')) {
    if (!ARMS.includes(arm)) throw new Error(`--arm ist ${ARMS.join(' oder ')}`);
    const interpreter = v4.interpreterSystem(vocab, { examples: true });
    // the interpreter's own pieces, cut from its prompt so S4a never drifts from S1
    const rules = interpreter.slice(interpreter.indexOf('Rules:'), interpreter.indexOf('Commands:')).trim();
    const examples = interpreter.slice(interpreter.indexOf('Examples ('), interpreter.lastIndexOf('Answer with')).trim();
    return [
        contract.replace(/\{\{user\}\}/g, 'Alaric'),
        '',
        GM_PLANNING_STEP,
        '',
        ...(arm === 'gm_rules' ? [rules, ''] : []),
        'Engine actions (Commands):',
        v4.vocabularyText(vocab),
        '',
        ...(arm === 'gm_rules' ? [examples, ''] : []),
        'Answer with {"commands": [...]}; an empty list when the message contains no such action.',
    ].join('\n');
}

const sec = (ms) => (ms === null || ms === undefined ? null : round(ms / 1000, 1));
const fmtCmd = (c) => {
    if (!c) return '–';
    const args = Object.entries(c).filter(([k]) => !['seq', 'type', 'quote', '_i'].includes(k) && c[k] !== null && c[k] !== undefined && c[k] !== false)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    return `${c.type}${args.length ? ` {${args.join(', ')}}` : ''}`;
};
const fmtGold = (g) => (g.anyOf ? g.anyOf.map(fmtGold).join(' | ') : fmtCmd(g));
const aggRow = (a) => [`${a.negative_precision_pct ?? '–'} % (${a.negative_ok}/${a.negative_cases})`, `${a.recall_pct ?? '–'} %`, `${a.type_recall_pct ?? '–'} %`, `${a.false_commands} / ${a.false_commitments}`, `${a.exact_cases_pct ?? '–'} %`];

function summaryMarkdown(run) {
    const { meta, agg, aggRaw, lat, tok, valid, records, compare } = run;
    const L = [];
    L.push(`# P0 / S4a GM-Semantik ohne Tools (Arm ${meta.arm}): Ergebnis`, '');
    L.push(`- Datum: ${meta.finished} · Dauer ${meta.duration_s} s · Werkzeug ${TOOL} v${TOOL_VERSION} · Vokabular ${meta.vocab_version} · Korpus ${meta.corpus_cases} Fälle${meta.sampled ? `, davon ${meta.cases} ausgewählt` : ''}`);
    L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model}${meta.provider.profile ? ` · Profil: ${meta.provider.profile}` : ''}`);
    L.push(`- System: Erzählervertrag v4 + GM-Planungsschritt + Befehlsliste${meta.arm === 'gm_rules' ? ' + Regeln und Beispiele des Interpreters' : ' (ohne Regeln und Beispiele des Interpreters)'} · User und Format wie S1 · temperature ${meta.temperature} · Reasoning ${meta.reasoning ?? 'wie konfiguriert'} · ${meta.concurrency} gleichzeitig`);
    L.push(`- Aufrufe: ${meta.calls} (davon ${meta.repairs} Reparatur) · Prompt ≈ ${meta.prompt_tokens_est} Token (Schätzung)`);
    L.push('', '## Kennzahlen (Scoring wie S1)', '');
    L.push(mdTable(['Kennzahl', 'nach Agency-Guard', 'ohne Guard'], [
        ['Negativ-Präzision', aggRow(agg)[0], aggRow(aggRaw)[0]],
        ['Recall (Typ und Argumente)', aggRow(agg)[1], aggRow(aggRaw)[1]],
        ['Recall nur Befehlstyp', aggRow(agg)[2], aggRow(aggRaw)[2]],
        ['falsche Befehle / Festlegungen', aggRow(agg)[3], aggRow(aggRaw)[3]],
        ['Fälle exakt', aggRow(agg)[4], aggRow(aggRaw)[4]],
        ['gültig im 1. Versuch / nach Reparatur', `${valid.first_pct ?? '–'} % / ${valid.final_pct ?? '–'} %`, ''],
        ['Latenz p50 / p90', `${lat.p50_s ?? '–'} / ${lat.p90_s ?? '–'} s`, ''],
        ['Token je Fall (Prompt / Output)', `${tok.prompt ?? '?'} / ${tok.completion ?? '?'}`, ''],
    ]));
    if (compare) {
        L.push('', `## Gegen S1 (dieselben ${compare.cases} Fälle; S1: ${compare.s1_meta})`, '');
        L.push(mdTable(['Kennzahl', 'A: Interpreter + Guard (S1)', `S4a ${meta.arm} + Guard`], [
            ['Negativ-Präzision', aggRow(compare.a)[0], aggRow(compare.b)[0]],
            ['Recall (Typ und Argumente)', aggRow(compare.a)[1], aggRow(compare.b)[1]],
            ['Recall nur Befehlstyp', aggRow(compare.a)[2], aggRow(compare.b)[2]],
            ['falsche Befehle / Festlegungen', aggRow(compare.a)[3], aggRow(compare.b)[3]],
            ['Fälle exakt', aggRow(compare.a)[4], aggRow(compare.b)[4]],
            ['Latenz p50', `${compare.a_p50_s ?? '–'} s`, `${compare.b_p50_s ?? '–'} s`],
            ['Prompt-Token je Fall', `${compare.a_prompt ?? '?'}`, `${compare.b_prompt ?? '?'}`],
        ]));
        L.push('', `Nur A richtig: ${compare.only_a.length} · nur S4a richtig: ${compare.only_b.length} · beide falsch: ${compare.both_wrong.length}`);
        for (const [title, list] of [['Nur A richtig', compare.only_a], ['Nur S4a richtig', compare.only_b]]) {
            if (!list.length) continue;
            L.push('', `### ${title}`);
            for (const x of list) L.push(`- ${x.id} „${x.text.slice(0, 90)}${x.text.length > 90 ? '…' : ''}“ · A: ${x.a} · S4a: ${x.b}`);
        }
    }
    const dropped = records.flatMap((r) => (r.dropped || []).map((d) => ({ id: r.id, ...d })));
    if (dropped.length) {
        L.push('', `Vom Guard verworfen (${dropped.length}):`);
        for (const d of dropped) L.push(`- ${d.id}: ${d.type} „${String(d.quote || '').slice(0, 80)}“ → ${d.rule}`);
    }
    const bad = records.filter((r) => !r.score || !r.score.exact);
    if (bad.length) {
        L.push('', `## Abweichungen (${bad.length})`, '');
        for (const r of bad) {
            if (!r.score) { L.push(`- **${r.id}** · keine gültige Antwort: ${r.error || (r.errors_final || []).slice(0, 2).join('; ')}`); continue; }
            const parts = [];
            for (const m of r.score.matches) if (m.kind !== 'full') parts.push(`${m.kind === 'missing' ? 'fehlt' : `falsches ${m.bad.join('/')}`}: ${fmtGold(m.gold)}${m.kind === 'type' ? ` → ${fmtCmd(r.predicted[m.pred_index])}` : ''}`);
            for (const f of r.score.false_commands) parts.push(`falsch${COMMITMENTS.has(f.type) ? ' (Festlegung)' : ''}: ${fmtCmd(f)}`);
            L.push(`- **${r.id}** (${r.scene}) „${r.text.slice(0, 110)}${r.text.length > 110 ? '…' : ''}“ · ${parts.join(' · ')}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const started = Date.now();
    const log = deps.log ?? ((t) => console.log(t));
    const note = deps.progress ?? progress;
    const arm = a.arm && a.arm !== true ? String(a.arm) : 'gm';
    const vocab = deps.vocab ?? loadVocabulary(PRODUCT_VOCAB_FILE);
    const scenes = deps.scenes ?? loadScenes();
    const corpus = deps.corpus ?? readJsonl(a.corpus ? path.resolve(String(a.corpus)) : CORPUS_FILE);
    for (const c of corpus) if (!scenes[c.scene]) throw new Error(`Fall ${c.id}: Szene ${c.scene} fehlt`);
    let cases = corpus;
    if (a.cases && a.cases !== true) { const ids = String(a.cases).split(','); cases = cases.filter((c) => ids.includes(c.id)); }
    if (a.tags && a.tags !== true) { const tags = String(a.tags).split(','); cases = cases.filter((c) => c.tags.some((t) => tags.includes(t))); }
    if (a.sample) cases = sampleCases(cases, intArg(a.sample, cases.length));
    if (a.limit) cases = cases.slice(0, intArg(a.limit, cases.length));
    const concurrency = intArg(a.concurrency, 1);
    const maxTokens = intArg(a['max-tokens'], 2500);
    const temperature = a.temperature !== undefined ? Number(a.temperature) : 0.1;
    const timeoutMs = intArg(a.timeout, 120) * 1000;
    let reasoning;
    if (a.reasoning !== undefined && a.reasoning !== true) reasoning = String(a.reasoning) === 'keep' ? undefined : String(a.reasoning);
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, `s4a_${arm}`);
    const system = s4aSystem(vocab, arm, deps.contract);
    const promptTokensEst = Math.round(mean(cases.map((c) => estimateTokens(system) + estimateTokens(v4.interpreterUser(scenes[c.scene], c.text)) + estimateTokens(v4.PLAIN_FORMAT))) || 0);

    if (a['dry-run']) {
        const sample = cases.slice(0, 3).map((c) => ({ case: c.id, messages: [{ role: 'system', content: `${system}\n\n${v4.PLAIN_FORMAT}` }, { role: 'user', content: v4.interpreterUser(scenes[c.scene], c.text) }] }));
        writeJson(path.join(outDir, 'requests_sample.json'), { tool: TOOL, version: TOOL_VERSION, arm, created: nowIso(), note: 'dry run: no call was made', sample });
        log(`S4a Probelauf (Arm ${arm}): ${cases.length} Fälle, je 1 Aufruf (+ höchstens 1 Reparatur). Prompt ≈ ${promptTokensEst} Token → ≈ ${Math.round((promptTokensEst * cases.length) / 1000)}k Prompt-Token.`);
        log(`Beispielanfragen: ${path.join(outDir, 'requests_sample.json')}`);
        return 0;
    }

    let provider;
    try {
        provider = deps.provider ?? await openProvider({
            backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs,
            mock: a.backend === 'mock' ? s1MockResponder(corpus, scenes, vocab, { user: v4.interpreterUser }) : undefined,
        });
    } catch (err) {
        log(`FEHLER: ${err.message}`);
        return 1;
    }
    const secrets = provider.secrets || [];
    const d = provider.describe();
    log(`S4a GM-Semantik · Arm ${arm} · Backend ${d.backend} · Modell ${d.model} · temperature ${temperature} · Reasoning ${reasoning ?? 'wie konfiguriert'} · ${concurrency} gleichzeitig`);
    log(`Plan: ${cases.length} Fälle; Prompt ≈ ${promptTokensEst} Token je Aufruf.`);
    let done = 0;
    let calls = 0;
    const tasks = cases.map((c) => async () => {
        const scene = scenes[c.scene];
        const r = await structuredCall(provider, {
            name: 'gm_plan', schema: v4.interpreterSchema(vocab, scene), system, user: v4.interpreterUser(scene, c.text), mode: 'plain',
            plainInstruction: v4.PLAIN_FORMAT, reasoning, maxTokens, temperature, timeoutMs, ...deps.retry,
        });
        calls += r.attempts.length;
        const raw = r.valid_final && Array.isArray(r.value?.commands) ? r.value.commands : null;
        const guarded = raw ? guardCommands(c.text, raw, guardContextFromScene(scene)) : null;
        const predicted = guarded ? guarded.kept : null;
        const sort = (l) => (l ? [...l].sort((x, y) => (x.seq ?? 0) - (y.seq ?? 0)) : null);
        const rec = {
            id: c.id, rep: 1, scene: c.scene, text: c.text, tags: c.tags, expect: c.expect, allow: c.allow || [],
            ok: r.ok, error: r.ok ? null : scrub(r.error, secrets), valid_first: r.valid_first, valid_final: r.valid_final, repaired: r.repaired,
            errors_final: r.errors_final, predicted: sort(predicted), predicted_count: predicted ? predicted.length : 0, score: predicted ? scoreCase(c, predicted) : null,
            raw: sort(raw), raw_count: raw ? raw.length : 0, score_raw: raw ? scoreCase(c, raw) : null,
            dropped: guarded ? guarded.dropped.map((x) => ({ type: x.command.type, rule: x.rule, quote: x.command.quote })) : [],
            ms: r.attempts[0]?.ms ?? null, tokens: callTokens(r), finish: r.attempts[0]?.finish ?? null,
            answer: r.ok && !predicted ? String(r.content).slice(0, 1500) : undefined,
        };
        done += 1;
        const sc = rec.score;
        note(`[${done}/${cases.length}] ${c.id}: ${!r.ok ? `Fehler (${rec.error})` : !sc ? 'ungültige Antwort' : sc.exact ? 'richtig' : sc.negative ? `falsch erzeugt: ${sc.false_commands.map((x) => x.type).join(', ')}` : `abweichend (${sc.full}/${sc.gold})`} · ${sec(rec.ms)} s`);
        return rec;
    });
    const records = await pool(tasks, concurrency);
    const agg = aggregate(records.map((r) => ({ score: r.score, predicted_count: r.predicted_count })));
    const aggRaw = aggregate(records.map((r) => ({ score: r.score_raw, predicted_count: r.raw_count })));
    const answered = records.filter((r) => r.ok);
    const lats = answered.map((r) => r.ms).filter(Number.isFinite);
    const lat = { p50_s: sec(percentile(lats, 50)), p90_s: sec(percentile(lats, 90)), mean_s: sec(mean(lats)) };
    const toks = answered.map((r) => r.tokens).filter((t) => t.reported);
    const tok = { prompt: round(mean(toks.map((t) => t.prompt)), 0), completion: round(mean(toks.map((t) => t.completion)), 0) };
    const valid = { first_pct: pct(answered.filter((r) => r.valid_first).length, answered.length), final_pct: pct(answered.filter((r) => r.valid_final).length, answered.length) };
    const s1 = a.compare && a.compare !== true ? readJson(path.resolve(String(a.compare))) : null;
    if (a.compare && a.compare !== true && !s1) log(`Hinweis: ${a.compare} ließ sich nicht lesen; kein Vergleich mit S1.`);
    const compare = compareWithS1(s1, records);
    const meta = {
        tool: TOOL, version: TOOL_VERSION, arm, started: new Date(started).toISOString(), finished: nowIso(), duration_s: round((Date.now() - started) / 1000, 0),
        node: process.version, provider: d, mode: 'plain', temperature, max_tokens: maxTokens, reasoning: reasoning ?? null, concurrency,
        vocab_version: vocab.version, corpus_cases: corpus.length, cases: cases.length, sampled: cases.length !== corpus.length,
        calls, repairs: records.filter((r) => r.repaired).length, prompt_tokens_est: promptTokensEst,
    };
    const run = { meta, agg, aggRaw, lat, tok, valid, compare, records };
    const summary = summaryMarkdown(run);
    for (const text of [JSON.stringify(run), summary]) assertNoSecrets(text, secrets);
    writeJson(path.join(outDir, 'results.json'), run);
    writeText(path.join(outDir, 'summary.md'), summary);
    log('');
    log(summary.split('\n## Abweichungen')[0]);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')} (zum Zurückschicken), results.json`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.message}`); process.exit(1); });
}
