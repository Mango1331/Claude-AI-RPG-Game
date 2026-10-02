// P0 / S4: the GM-tools experiment (Prototype B) on the S1 command corpus (docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §11.1).
// The question it answers with the real model: does the Narrator, given the GM tools (src/gm/tools.js) instead of a
// pre-parser, commit Alaric to the same hard actions as the dedicated interpreter (S1), no more (false agency on
// questions, plans, someone else's deeds) and no fewer, and at what cost in calls, tokens and time?
//
//   node tools/p0/s4_gm_tools.mjs                          all cases of tests/eval/commands.jsonl, through SillyTavern
//   node tools/p0/s4_gm_tools.mjs --sample 60              a stratified sample (the same one S1 --sample 60 draws)
//   node tools/p0/s4_gm_tools.mjs --compare p0_out/s1/results.json   side by side with an S1 run (same cases)
//   node tools/p0/s4_gm_tools.mjs --dry-run                no calls: prompt sizes and three sample requests
//
// Options: --temperature 0.9 (the Narrator's, as in the live runs)  --max-tokens 900  --reasoning <value>|keep
//          --rounds 3 (a lookup or a refused malformed command gets its tool result and another call, as in B)
//          --concurrency 3  --timeout 180 (s)  --reps 1  --cases id,id  --tags tag,tag  --limit N  --corpus <file>
//          --backend st|direct|mock  --st-url <url>  --profile "<name>"  --out <dir>
// Each case: the Narrator contract v4 + the GM-mode note as system, the scene catalog + the player message as user,
// the five GM tools offered (tool_choice auto). Scored like S1 (tests/eval/commands.jsonl gold, tools/p0/lib/score.mjs):
// the hard commands it resolves through avereth_resolve_story, plus every combat or ability call as a commitment.
// It does not generate the prose that follows (B needs one more call for it after any tool). Output: p0_out/s4/
// summary.md (to send back), results.json. No key, header or endpoint URL is written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { loadVocabulary, loadScenes, guardContextFromScene } from './lib/interpreter.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { guardCommands } from '../../src/v4/agency.js';
import { gmToolRegistrations } from '../../src/gm/tools.js';
import { GM_MODE_NOTE } from '../../src/gm/host.js';
import { scoreCase, aggregate, COMMITMENTS } from './lib/score.mjs';
import { sampleCases, goldAnswer, CORPUS_FILE, PRODUCT_VOCAB_FILE } from './s1_interpreter.mjs';
import {
    ENGINE_ROOT, OUT_ROOT, parseArgs, intArg, pool, percentile, mean, round, pct, readJsonl, readJson, writeJson, writeText,
    nowIso, progress, mdTable, assertNoSecrets, scrub, estimateTokens,
} from './lib/util.mjs';

export const TOOL = 's4_gm_tools';
export const TOOL_VERSION = 2;
const CONTRACT_FILE = path.join(ENGINE_ROOT, 'content', 'narrator', 'Avereth_Narrator_Contract_v4.txt');
const NEG_CATEGORIES = ['question', 'thought', 'hypothetical', 'plan', 'memory', 'negation', 'npc_action', 'quoted_speech', 'speech', 'neutral'];

// ------------------------------------------------------------------------------------------------ prompt and tools
/** The five GM tools as the provider receives them (SillyTavern sends the same shape). */
export function gmTools() {
    return gmToolRegistrations({}, () => true).map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
}

/** System: the Narrator contract (its {{user}} is Alaric) and the GM-mode rule B adds to the Engine block. */
export function gmSystem(contract = fs.readFileSync(CONTRACT_FILE, 'utf8')) {
    return `${contract.replace(/\{\{user\}\}/g, 'Alaric')}\n\n${GM_MODE_NOTE}`;
}

/** User: what the engine knows of the scene (the catalog S1's interpreter gets) and the player message. */
export function gmUser(scene, text) {
    return `[AVERETH ENGINE — current scene]\n${v4.catalogText(scene)}\n\nPLAYER MESSAGE:\n${text}`;
}

function parseArgsJson(raw) {
    if (raw && typeof raw === 'object') return { args: raw, error: null };
    try {
        const v = JSON.parse(String(raw ?? ''));
        return v && typeof v === 'object' ? { args: v, error: null } : { args: {}, error: 'arguments are not an object' };
    } catch (err) {
        return { args: {}, error: `arguments are not JSON (${err.message})` };
    }
}

/**
 * What one answer decides. story: the commands of avereth_resolve_story calls; other: combat and ability calls (each a
 * commitment of Alaric); lookups and world commits are counted, not scored.
 */
export function readAnswer(answer) {
    const calls = (answer.tool_calls || []).map((c) => ({ id: c.id, name: c.name, ...parseArgsJson(c.arguments) }));
    const story = [];
    const other = [];
    for (const c of calls) {
        if (c.name === 'avereth_resolve_story') for (const cmd of Array.isArray(c.args.commands) ? c.args.commands : []) if (cmd && typeof cmd === 'object') story.push({ ...cmd, _call: c.id });
        if (c.name === 'avereth_resolve_combat') other.push({ type: `combat.${c.args.action || '?'}`, skill: c.args.skill ?? null, target: c.args.target ?? null, _call: c.id });
        if (c.name === 'avereth_use_ability_on_world') other.push({ type: 'ability_on_world', skill: c.args.skill ?? null, target: c.args.target_description ?? null, _call: c.id });
    }
    return {
        calls,
        story,
        other,
        lookups: calls.filter((c) => c.name === 'avereth_lookup').length,
        commits: calls.filter((c) => c.name === 'avereth_commit_world').length,
        prose: String(answer.content || '').trim().length > 0,
    };
}

/** expected_args of B's invalid_commands answer (src/gm/runtime.js resolveStory): the arguments of each named type. */
function expectedArgs(vocab, story) {
    return Object.fromEntries([...new Set(story.map((c) => c.type))].map((t) => [t, { ...(vocab.commands.find((x) => x.type === t)?.args || {}), quote: 'the player\'s exact words' }]));
}

/** The tool result B's runtime would give a lookup here: the scene as the engine knows it. */
function lookupResult(scene, args) {
    return { ok: true, kind: args.kind || 'scene', catalog: v4.catalogText(scene) };
}

// ------------------------------------------------------------------------------------------------ mock (tests)
/** A perfect Narrator: the gold commands through resolve_story, prose for a case without a hard action. */
export function s4MockResponder(cases, scenes, vocab, { wrong = [], lookupFirst = [], malformedFirst = [] } = {}) {
    const byUser = new Map(cases.map((c) => [gmUser(scenes[c.scene], c.text), c]));
    let seq = 0;
    const call = (name, args) => ({ id: `call_${++seq}`, name, arguments: JSON.stringify(args) });
    return async (req) => {
        const c = byUser.get(req.messages.find((m) => m.role === 'user')?.content);
        if (!c) return { content: 'The world waits.' };
        const round_ = req.messages.filter((m) => m.role === 'assistant').length;
        if (lookupFirst.includes(c.id) && round_ === 0) return { tool_calls: [call('avereth_lookup', { kind: 'scene' })] };
        if (malformedFirst.includes(c.id) && round_ === 0) return { tool_calls: [call('avereth_resolve_story', { commands: [{ type: 'go', destination: 'somewhere' }] })] };
        if (wrong.includes(c.id)) return { tool_calls: [call('avereth_resolve_story', { commands: [{ type: 'pay', to: { new: 'someone' }, amount_cp: 5, for: null, quote: c.text.slice(0, 20) }] })] };
        const gold = goldAnswer(vocab, c).commands;
        if (!gold.length) return { content: 'He takes it in quietly.' };
        return { tool_calls: [call('avereth_resolve_story', { commands: gold.map((g) => ({ ...g, quote: c.text })) })] };
    };
}

// ------------------------------------------------------------------------------------------------ one case
async function runCase(provider, c, scene, { system, tools, vocab, reasoning, maxTokens, temperature, timeoutMs, rounds }) {
    const messages = [{ role: 'system', content: system }, { role: 'user', content: gmUser(scene, c.text) }];
    const trace = [];
    let accepted = [];
    let other = [];
    let rejectedStory = 0;
    let lookups = 0;
    let commits = 0;
    let prose = false;
    let error = null;
    for (let i = 0; i < rounds; i++) {
        const r = await provider.chat({ messages, tools, toolChoice: 'auto', reasoning, maxTokens, temperature, timeoutMs });
        if (!r.ok) { error = r.error; trace.push({ round: i + 1, ok: false, ms: r.ms ?? null }); break; }
        const a = readAnswer(r);
        lookups += a.lookups;
        commits += a.commits;
        prose = prose || a.prose;
        other = other.concat(a.other);
        // B's runtime refuses a malformed story command (schema of the product interpreter) and the model may retry
        let storyValid = null;
        let storyErrors = [];
        if (a.story.length) {
            // as resolveStory (src/gm/runtime.js): seq defaults to the order, everything else must fit the schema
            const p = v4.parseInterpretation(JSON.stringify({ commands: a.story.map(({ _call, ...x }, k) => ({ ...x, seq: x.seq ?? k + 1 })) }), vocab, scene);
            storyValid = !p.errors.length;
            storyErrors = p.errors;
            if (storyValid) accepted = accepted.concat(p.commands);
            else rejectedStory += 1;
        }
        trace.push({
            round: i + 1, ok: true, ms: r.ms, usage: r.usage || null, finish: r.finish,
            calls: a.calls.map((x) => ({ name: x.name, args: x.args, error: x.error })), prose: a.prose ? String(r.content).slice(0, 300) : null,
            story_valid: storyValid, story_errors: storyErrors.slice(0, 4),
        });
        if (!a.calls.length) break;
        // a decision was made (a valid primary action, a combat/ability call, a world commit): B narrates next
        const decided = (a.story.length && storyValid) || a.other.length || a.commits;
        if (decided) break;
        // only lookups and/or a refused command: B answers them and calls the model again
        messages.push({ role: 'assistant', content: r.content || '', tool_calls: a.calls.map((x) => ({ id: x.id, type: 'function', function: { name: x.name, arguments: JSON.stringify(x.args) } })) });
        for (const x of a.calls) {
            const result = x.name === 'avereth_lookup' ? lookupResult(scene, x.args)
                // the same answer as resolveStory in src/gm/runtime.js (until v1 of this tool sent no expected_args)
                : x.name === 'avereth_resolve_story' ? { ok: false, code: 'invalid_commands', message: `Fix the commands and call again: ${storyErrors.join('; ')}`, expected_args: expectedArgs(vocab, a.story) }
                    : { ok: false, code: 'not_simulated' };
            messages.push({ role: 'tool', tool_call_id: x.id, content: JSON.stringify(result) });
        }
    }
    return { trace, accepted, other, rejectedStory, lookups, commits, prose, error };
}

// ------------------------------------------------------------------------------------------------ report
const sec = (ms) => (ms === null || ms === undefined ? null : round(ms / 1000, 1));
const fmtCmd = (c) => {
    if (!c) return '–';
    const args = Object.entries(c).filter(([k]) => !['seq', 'type', 'quote', '_i', '_call'].includes(k) && c[k] !== null && c[k] !== undefined && c[k] !== false)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    return `${c.type}${args.length ? ` {${args.join(', ')}}` : ''}`;
};
const fmtGold = (g) => (g.anyOf ? g.anyOf.map(fmtGold).join(' | ') : fmtCmd(g));

function aggRow(a) {
    return [`${a.negative_precision_pct ?? '–'} % (${a.negative_ok}/${a.negative_cases})`, `${a.recall_pct ?? '–'} %`, `${a.false_commands} / ${a.false_commitments}`, `${a.exact_cases_pct ?? '–'} %`];
}

function summaryMarkdown(run) {
    const { meta, agg, aggRaw, lat, tok, records, rounds, compare } = run;
    const L = [];
    L.push('# P0 / S4 GM-Tools (Prototyp B): Ergebnis', '');
    L.push(`- Datum: ${meta.finished} · Dauer ${meta.duration_s} s · Werkzeug ${TOOL} v${TOOL_VERSION} · Vokabular ${meta.vocab_version} · Korpus ${meta.corpus_cases} Fälle${meta.sampled ? `, davon ${meta.cases} ausgewählt` : ''}`);
    L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model}${meta.provider.profile ? ` · Profil: ${meta.provider.profile}` : ''}`);
    L.push(`- Erzähler: Vertrag v4 + GM-Modus-Hinweis · ${meta.tools} Tools · temperature ${meta.temperature} · Reasoning ${meta.reasoning ?? 'wie konfiguriert'} · höchstens ${meta.rounds} Runden je Fall`);
    L.push(`- Aufrufe: ${meta.calls} · Prompt ≈ ${meta.prompt_tokens_est} Token je erster Anfrage (Schätzung, ohne Tool-Schemata ≈ ${meta.tools_tokens_est} Token)`);
    L.push('', '## Kennzahlen (wie S1; nach dem Agency-Guard, den B jetzt anwendet)', '');
    L.push(mdTable(['Kennzahl', 'B: Erzähler + Tools', 'B ohne Guard'], [
        ['Negativ-Präzision (keine falsche Agency)', aggRow(agg)[0], aggRow(aggRaw)[0]],
        ['Recall (Typ und Argumente)', aggRow(agg)[1], aggRow(aggRaw)[1]],
        ['falsche Befehle / Festlegungen', aggRow(agg)[2], aggRow(aggRaw)[2]],
        ['Fälle exakt', aggRow(agg)[3], aggRow(aggRaw)[3]],
    ]));
    if (compare) {
        L.push('', `## Gegen S1 (dieselben ${compare.cases} Fälle; S1: ${compare.s1_meta})`, '');
        L.push(mdTable(['Kennzahl', 'A: Interpreter + Guard (S1)', 'B: Erzähler + Tools + Guard'], [
            ['Negativ-Präzision', aggRow(compare.a)[0], aggRow(compare.b)[0]],
            ['Recall (Typ und Argumente)', aggRow(compare.a)[1], aggRow(compare.b)[1]],
            ['falsche Befehle / Festlegungen', aggRow(compare.a)[2], aggRow(compare.b)[2]],
            ['Fälle exakt', aggRow(compare.a)[3], aggRow(compare.b)[3]],
            ['Latenz p50 bis zur Entscheidung', `${compare.a_p50_s ?? '–'} s`, `${compare.b_p50_s ?? '–'} s (+ der Prosa-Aufruf)`],
            ['Prompt-Token je Fall (Mittel)', `${compare.a_prompt ?? '?'} (+ Erzähler-Aufruf)`, `${compare.b_prompt ?? '?'} (+ Prosa-Aufruf)`],
        ]));
        L.push('', `Nur A richtig: ${compare.only_a.length} · nur B richtig: ${compare.only_b.length} · beide falsch: ${compare.both_wrong.length}`);
        for (const [title, list] of [['Nur A richtig', compare.only_a], ['Nur B richtig', compare.only_b]]) {
            if (!list.length) continue;
            L.push('', `### ${title} (höchstens 30)`);
            for (const x of list.slice(0, 30)) L.push(`- ${x.id} „${x.text.slice(0, 90)}${x.text.length > 90 ? '…' : ''}“ · A: ${x.a} · B: ${x.b}`);
        }
    }
    L.push('', '## Verhalten der Tools', '');
    L.push(mdTable(['Kennzahl', 'Wert'], [
        ['Fälle mit mindestens einem Tool-Aufruf: positiv / negativ', `${rounds.tool_pos} / ${rounds.tool_neg}`],
        ['Runden je Fall bis zur Entscheidung (Mittel / max)', `${rounds.mean} / ${rounds.max}`],
        ['Fälle mit Lookup vor der Entscheidung', `${rounds.lookup_cases}`],
        ['abgewiesene (schemawidrige) resolve_story-Aufrufe', `${rounds.rejected_story}`],
        ['Kampf-/Fähigkeitsaufrufe (im Korpus nie erwartet)', `${rounds.other_calls}`],
        ['commit_world vor jeder Prosa', `${rounds.commit_cases}`],
        ['Fehler (keine Antwort)', `${agg.failed}`],
        ['Latenz bis zur Entscheidung p50 / p90 / Mittel', `${lat.p50_s ?? '–'} / ${lat.p90_s ?? '–'} / ${lat.mean_s ?? '–'} s`],
        ['Token je Fall (Prompt / Output / Reasoning, alle Runden)', `${tok.prompt ?? '?'} / ${tok.completion ?? '?'} / ${tok.reasoning ?? '–'}`],
    ]));
    L.push('', '## Negativfälle nach Art', '');
    L.push(mdTable(['Art', 'Fälle', 'ohne falschen Befehl'], NEG_CATEGORIES.map((cat) => {
        const rr = records.filter((r) => r.score && r.score.negative && r.tags.includes(cat));
        return [cat, rr.length, rr.filter((r) => r.score.negative_ok).length];
    }).filter((r) => r[1] > 0)));
    const bad = records.filter((r) => !r.score || !r.score.exact);
    if (bad.length) {
        L.push('', `## Abweichungen (${bad.length}, höchstens 60)`, '');
        for (const r of bad.slice(0, 60)) {
            if (!r.score) { L.push(`- **${r.id}** · keine Antwort: ${r.error}`); continue; }
            const parts = [];
            for (const m of r.score.matches) if (m.kind !== 'full') parts.push(`${m.kind === 'missing' ? 'fehlt' : `falsches ${m.bad.join('/')}`}: ${fmtGold(m.gold)}`);
            for (const f of r.score.false_commands) parts.push(`falsch${COMMITMENTS.has(f.type) || /^combat\.|^ability/.test(f.type) ? ' (Festlegung)' : ''}: ${fmtCmd(f)}`);
            L.push(`- **${r.id}** (${r.scene}) „${r.text.slice(0, 110)}${r.text.length > 110 ? '…' : ''}“ · ${parts.join(' · ')}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

export function compareWithS1(s1, records) {
    if (!s1?.records) return null;
    const a = new Map(s1.records.filter((r) => (r.rep ?? 1) === 1).map((r) => [r.id, r]));
    const both = records.filter((r) => r.rep === 1 && a.has(r.id));
    if (!both.length) return null;
    const verdict = (score) => (!score ? 'keine Antwort' : score.exact ? 'richtig' : score.negative ? `falsch: ${score.false_commands.map((x) => x.type).join(', ')}` : `${score.full}/${score.gold}${score.false_commands.length ? ` +${score.false_commands.length} falsch` : ''}`);
    const rows = both.map((b) => ({ id: b.id, text: b.text, a: a.get(b.id), b }));
    const lats = rows.map((x) => x.a.ms).filter(Number.isFinite);
    const blats = rows.map((x) => x.b.ms).filter(Number.isFinite);
    const prom = (list) => round(mean(list.filter((t) => t?.reported).map((t) => t.prompt)), 0);
    return {
        cases: rows.length,
        s1_meta: `${s1.meta?.provider?.model ?? '?'}, Prompt ${s1.meta?.prompt ?? '?'}, Guard ${s1.meta?.guard ? 'an' : 'aus'}`,
        a: aggregate(rows.map((x) => ({ score: x.a.score, predicted_count: x.a.predicted_count }))),
        b: aggregate(rows.map((x) => ({ score: x.b.score, predicted_count: x.b.predicted_count }))),
        a_p50_s: sec(percentile(lats, 50)),
        b_p50_s: sec(percentile(blats, 50)),
        a_prompt: prom(rows.map((x) => x.a.tokens)),
        b_prompt: prom(rows.map((x) => x.b.tokens)),
        only_a: rows.filter((x) => x.a.score?.exact && !x.b.score?.exact).map((x) => ({ id: x.id, text: x.text, a: verdict(x.a.score), b: verdict(x.b.score) })),
        only_b: rows.filter((x) => !x.a.score?.exact && x.b.score?.exact).map((x) => ({ id: x.id, text: x.text, a: verdict(x.a.score), b: verdict(x.b.score) })),
        both_wrong: rows.filter((x) => !x.a.score?.exact && !x.b.score?.exact).map((x) => x.id),
    };
}

// ------------------------------------------------------------------------------------------------ main
export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const started = Date.now();
    const log = deps.log ?? ((t) => console.log(t));
    const note = deps.progress ?? progress;
    const vocab = deps.vocab ?? loadVocabulary(PRODUCT_VOCAB_FILE);
    const scenes = deps.scenes ?? loadScenes();
    const corpus = deps.corpus ?? readJsonl(a.corpus ? path.resolve(String(a.corpus)) : CORPUS_FILE);
    for (const c of corpus) if (!scenes[c.scene]) throw new Error(`Fall ${c.id}: Szene ${c.scene} fehlt`);
    let cases = corpus;
    if (a.cases && a.cases !== true) { const ids = String(a.cases).split(','); cases = cases.filter((c) => ids.includes(c.id)); }
    if (a.tags && a.tags !== true) { const tags = String(a.tags).split(','); cases = cases.filter((c) => c.tags.some((t) => tags.includes(t))); }
    if (a.sample) cases = sampleCases(cases, intArg(a.sample, cases.length));
    if (a.limit) cases = cases.slice(0, intArg(a.limit, cases.length));
    const reps = intArg(a.reps, 1);
    const concurrency = intArg(a.concurrency, 3);
    const maxTokens = intArg(a['max-tokens'], 900);
    const temperature = a.temperature !== undefined ? Number(a.temperature) : 0.9;
    const timeoutMs = intArg(a.timeout, 180) * 1000;
    const rounds = intArg(a.rounds, 3);
    let reasoning;
    if (a.reasoning !== undefined && a.reasoning !== true) reasoning = String(a.reasoning) === 'keep' ? undefined : String(a.reasoning);
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, 's4');
    const system = deps.system ?? gmSystem();
    const tools = gmTools();
    const toolsTokens = estimateTokens(JSON.stringify(tools));
    const promptTokensEst = Math.round(mean(cases.map((c) => estimateTokens(system) + estimateTokens(gmUser(scenes[c.scene], c.text)) + toolsTokens)) || 0);

    if (a['dry-run']) {
        const sample = cases.slice(0, 3).map((c) => ({ case: c.id, messages: [{ role: 'system', content: system }, { role: 'user', content: gmUser(scenes[c.scene], c.text) }], tools, tool_choice: 'auto' }));
        writeJson(path.join(outDir, 'requests_sample.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), note: 'dry run: no call was made', sample });
        log(`S4 Probelauf: ${cases.length} Fälle × ${reps} = ${cases.length * reps} Fälle, je 1–${rounds} Aufrufe. Prompt ≈ ${promptTokensEst} Token je erster Anfrage (davon Tools ≈ ${toolsTokens}) → ≈ ${Math.round((promptTokensEst * cases.length * reps) / 1000)}k Prompt-Token mindestens.`);
        log(`Beispielanfragen: ${path.join(outDir, 'requests_sample.json')}`);
        return 0;
    }

    let provider;
    try {
        provider = deps.provider ?? await openProvider({
            backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs,
            mock: a.backend === 'mock' ? s4MockResponder(corpus, scenes, vocab) : undefined,
        });
    } catch (err) {
        log(`FEHLER: ${err.message}`);
        return 1;
    }
    const secrets = provider.secrets || [];
    const d = provider.describe();
    const total = cases.length * reps;
    log(`S4 GM-Tools · Backend ${d.backend} · Modell ${d.model} · temperature ${temperature} · Reasoning ${reasoning ?? 'wie konfiguriert'} · ${tools.length} Tools`);
    log(`Plan: ${cases.length} Fälle × ${reps} = ${total}, ${concurrency} gleichzeitig; Prompt ≈ ${promptTokensEst} Token je erster Anfrage.`);
    let done = 0;
    let calls = 0;
    const tasks = [];
    for (let rep = 1; rep <= reps; rep++) {
        for (const c of cases) {
            tasks.push(async () => {
                const scene = scenes[c.scene];
                const out = await runCase(provider, c, scene, { system, tools, vocab, reasoning, maxTokens, temperature, timeoutMs, rounds });
                calls += out.trace.length;
                const answered = !out.error;
                const story = out.accepted.map((x, i) => ({ ...x, seq: x.seq ?? i + 1 }));
                const guarded = guardCommands(c.text, story, guardContextFromScene(scene));
                const predicted = answered ? [...guarded.kept, ...out.other] : null;
                const raw = answered ? [...story, ...out.other] : null;
                const tokens = { prompt: 0, completion: 0, reasoning: 0, reported: false };
                for (const t of out.trace) {
                    if (!t.usage) continue;
                    tokens.reported = true;
                    tokens.prompt += t.usage.prompt_tokens ?? 0;
                    tokens.completion += t.usage.completion_tokens ?? 0;
                    tokens.reasoning += t.usage.reasoning_tokens ?? 0;
                }
                const rec = {
                    id: c.id, rep, scene: c.scene, text: c.text, tags: c.tags, expect: c.expect, allow: c.allow || [],
                    ok: answered, error: answered ? null : scrub(out.error, secrets),
                    predicted, predicted_count: predicted ? predicted.length : 0, score: predicted ? scoreCase(c, predicted) : null,
                    raw, raw_count: raw ? raw.length : 0, score_raw: raw ? scoreCase(c, raw) : null,
                    dropped: guarded.dropped.map((x) => ({ type: x.command.type, rule: x.rule, quote: x.command.quote })),
                    rounds: out.trace.length, lookups: out.lookups, commits: out.commits, rejected_story: out.rejectedStory, other: out.other.length, prose: out.prose,
                    tool_used: out.trace.some((t) => (t.calls || []).length),
                    ms: out.trace.reduce((n, t) => n + (t.ms ?? 0), 0), tokens, trace: out.trace,
                };
                done += 1;
                const sc = rec.score;
                note(`[${done}/${total}] ${c.id}: ${!answered ? `Fehler (${rec.error})` : sc.exact ? 'richtig' : sc.negative ? `falsch erzeugt: ${sc.false_commands.map((x) => x.type).join(', ')}` : `abweichend (${sc.full}/${sc.gold}${sc.false_commands.length ? `, +${sc.false_commands.length} falsch` : ''})`} · ${rec.rounds} Runde(n) · ${sec(rec.ms)} s`);
                return rec;
            });
        }
    }
    const records = await pool(tasks, concurrency);
    const agg = aggregate(records.map((r) => ({ score: r.score, predicted_count: r.predicted_count })));
    const aggRaw = aggregate(records.map((r) => ({ score: r.score_raw, predicted_count: r.raw_count })));
    const answered = records.filter((r) => r.ok);
    const lats = answered.map((r) => r.ms).filter(Number.isFinite);
    const lat = { p50_s: sec(percentile(lats, 50)), p90_s: sec(percentile(lats, 90)), mean_s: sec(mean(lats)) };
    const toks = answered.map((r) => r.tokens).filter((t) => t.reported);
    const tok = {
        prompt: round(mean(toks.map((t) => t.prompt)), 0), completion: round(mean(toks.map((t) => t.completion)), 0),
        reasoning: toks.some((t) => t.reasoning > 0) ? round(mean(toks.map((t) => t.reasoning)), 0) : null,
    };
    const roundsAgg = {
        tool_pos: answered.filter((r) => r.expect.length && r.tool_used).length,
        tool_neg: answered.filter((r) => !r.expect.length && r.tool_used).length,
        mean: round(mean(answered.map((r) => r.rounds)), 2),
        max: Math.max(0, ...answered.map((r) => r.rounds)),
        lookup_cases: answered.filter((r) => r.lookups).length,
        rejected_story: answered.reduce((n, r) => n + r.rejected_story, 0),
        other_calls: answered.reduce((n, r) => n + r.other, 0),
        commit_cases: answered.filter((r) => r.commits).length,
    };
    const s1 = a.compare && a.compare !== true ? readJson(path.resolve(String(a.compare))) : null;
    if (a.compare && a.compare !== true && !s1) log(`Hinweis: ${a.compare} ließ sich nicht lesen; kein Vergleich mit S1.`);
    const compare = compareWithS1(s1, records);
    const meta = {
        tool: TOOL, version: TOOL_VERSION, started: new Date(started).toISOString(), finished: nowIso(), duration_s: round((Date.now() - started) / 1000, 0),
        node: process.version, provider: d, temperature, max_tokens: maxTokens, reasoning: reasoning ?? null, rounds, tools: tools.length,
        vocab_version: vocab.version, corpus_cases: corpus.length, cases: cases.length, sampled: cases.length !== corpus.length, reps,
        calls, prompt_tokens_est: promptTokensEst, tools_tokens_est: toolsTokens,
    };
    const run = { meta, agg, aggRaw, lat, tok, rounds: roundsAgg, compare, records };
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
