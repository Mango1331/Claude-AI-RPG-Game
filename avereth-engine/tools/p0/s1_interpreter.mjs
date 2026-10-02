// Runtime V4, P0 / S1: the prototype interpreter against the command corpus (plan §16 S1, §11.2, gate §11.7).
//
//   node tools/p0/s1_interpreter.mjs                      all cases of tests/eval/commands.jsonl, through SillyTavern
//   node tools/p0/s1_interpreter.mjs --sample 60          a stratified sample (quick run)
//   node tools/p0/s1_interpreter.mjs --backend direct     straight to the provider (environment variables)
//   node tools/p0/s1_interpreter.mjs --dry-run            no calls: prompt sizes and three sample requests
//
// Options: --mode json_schema|plain  --reasoning <value>|keep  (default: the S0 decision in p0_out/s0/decision.json)
//          --prompt v4|p0   v4 (default): the product's interpreter (src/v4/interpret.js, content/commands.json cmd-0.2);
//                           p0: the P0 prompt of 27.09. (tools/p0/lib/interpreter.mjs, draft cmd-0.1), to compare
//          --guard on|off   the product's agency guard (src/v4/agency.js) on the answers; on by default with v4.
//                           The summary shows the interpreter alone and interpreter + guard; the gates use the latter.
//          --corpus <file>  another corpus, e.g. tests/eval/commands_holdout.jsonl or commands_holdout2.jsonl
//          --concurrency 3  --max-tokens 2500  --temperature 0.1  --timeout 120 (s)  --reps 1
//          --cases id,id  --tags tag,tag  --limit N  --no-examples  --out <dir>  --st-url <url>  --profile "<name>"
// One call per case (+ at most one repair call for an invalid answer). Output: p0_out/s1/summary.md (to send back),
// results.json.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { structuredCall, callTokens } from './lib/structured.mjs';
import { loadVocabulary, loadScenes, interpreterSystem, interpreterUser, interpreterSchema, PLAIN_FORMAT, guardContextFromScene } from './lib/interpreter.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { guardCommands } from '../../src/v4/agency.js';
import { scoreCase, aggregate, COMMITMENTS } from './lib/score.mjs';
import {
    ENGINE_ROOT, OUT_ROOT, parseArgs, intArg, pool, percentile, mean, round, pct, readJsonl, readDecision, writeJson, writeText,
    nowIso, progress, mdTable, assertNoSecrets, scrub, estimateTokens,
} from './lib/util.mjs';

export const TOOL = 's1_interpreter';
// v2 (02.10.): the summary also shows the end-to-end figures (docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §16); the measurement is unchanged
export const TOOL_VERSION = 2;
export const CORPUS_FILE = path.join(ENGINE_ROOT, 'tests', 'eval', 'commands.jsonl');
export const PRODUCT_VOCAB_FILE = path.join(ENGINE_ROOT, 'content', 'commands.json');

/** The two prompt versions: v4 = the product's interpreter (cmd-0.2), p0 = the P0 run of 27.09. (cmd-0.1-draft). */
export function promptKit(which, vocabOverride = null) {
    if (which === 'p0') {
        const vocab = vocabOverride ?? loadVocabulary();
        return { name: 'p0', vocab, system: (o) => interpreterSystem(vocab, o), user: interpreterUser, schema: (scene) => interpreterSchema(vocab, scene), plain: PLAIN_FORMAT };
    }
    const vocab = vocabOverride ?? loadVocabulary(PRODUCT_VOCAB_FILE);
    return { name: 'v4', vocab, system: (o) => v4.interpreterSystem(vocab, o), user: v4.interpreterUser, schema: (scene) => v4.interpreterSchema(vocab, scene), plain: v4.PLAIN_FORMAT };
}
export const GATES = { negative_precision_pct: 98, recall_pct: 90, p50_s: 6 };

const NEG_CATEGORIES = ['question', 'thought', 'hypothetical', 'plan', 'memory', 'negation', 'npc_action', 'quoted_speech', 'speech', 'neutral'];

/** Stratified sample: every command type and every negative category keeps a share; deterministic. */
export function sampleCases(cases, n) {
    if (!n || n >= cases.length) return cases;
    const key = (c) => (c.expect.length ? `pos:${c.tags.find((t) => t.includes('.') || ['go', 'activity', 'pay', 'buy', 'sell', 'take', 'drop', 'give', 'use', 'equip', 'unequip'].includes(t)) || 'other'}` : `neg:${c.tags.find((t) => NEG_CATEGORIES.includes(t)) || 'other'}`);
    const groups = new Map();
    for (const c of cases) {
        const k = key(c);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(c);
    }
    const out = [];
    const lists = [...groups.values()];
    for (let round_ = 0; out.length < n; round_++) {
        let added = false;
        for (const l of lists) {
            if (round_ < l.length && out.length < n) { out.push(l[round_]); added = true; }
        }
        if (!added) break;
    }
    const order = new Map(cases.map((c, i) => [c.id, i]));
    return out.sort((a, b) => order.get(a.id) - order.get(b.id));
}

// ------------------------------------------------------------------------------------------------ gold → answer (mock)
function concrete(v) {
    if (Array.isArray(v)) return concrete(v[0]);
    if (typeof v === 'string') {
        const m = v.match(/^\/(.*)\/[a-z]*$/s);
        return m ? m[1].split('|')[0].replace(/[^\w' -]/g, '') : v;
    }
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, concrete(x)]));
    return v;
}

function defaultArg(spec) {
    if (spec.nullable) return null;
    if (spec.ref) return { new: 'something' };
    if (spec.enum) return spec.enum[0];
    if (spec.type === 'boolean') return false;
    if (spec.type === 'integer') return spec.min ?? 0;
    if (spec.array) return [];
    return 'something';
}

/** The answer a perfect interpreter would give for a case (first alternative of every gold choice). */
export function goldAnswer(vocab, kase) {
    const byType = new Map(vocab.commands.map((c) => [c.type, c]));
    const commands = kase.expect.map((g, i) => {
        const pick = g.anyOf ? g.anyOf[0] : g;
        const spec = byType.get(pick.type);
        const cmd = { seq: i + 1, type: pick.type };
        for (const [k, a] of Object.entries(spec.args || {})) {
            if (k in pick) {
                let v = concrete(pick[k]);
                if (a.ref && typeof v === 'string' && !/^[a-z]+\.[\w.]+$/.test(v)) v = { new: v };
                cmd[k] = v;
            } else cmd[k] = defaultArg(a);
        }
        cmd.quote = kase.text.slice(0, 40);
        return cmd;
    });
    return { commands };
}

export function s1MockResponder(cases, scenes, vocab, { wrong = [], invalid = [], user = interpreterUser } = {}) {
    const byUser = new Map(cases.map((c) => [user(scenes[c.scene], c.text), c]));
    return async (req) => {
        const users = req.messages.filter((m) => m.role === 'user');
        const c = byUser.get(users[0]?.content);
        if (!c) return { content: '{"commands": []}' };
        if (invalid.includes(c.id) && users.length === 1) return { content: '{"commands": [{"seq": "first"}' };
        if (wrong.includes(c.id)) return { content: JSON.stringify({ commands: [{ seq: 1, type: 'pay', to: { new: 'someone' }, amount_cp: 5, for: null, quote: 'x' }] }) };
        return { content: JSON.stringify(goldAnswer(vocab, c)) };
    };
}

// ------------------------------------------------------------------------------------------------ report
const s = (ms) => (ms === null || ms === undefined ? null : round(ms / 1000, 1));
const fmtCmd = (c) => {
    if (!c) return '–';
    const args = Object.entries(c).filter(([k]) => !['seq', 'type', 'quote', '_i'].includes(k) && c[k] !== null && c[k] !== undefined && c[k] !== false)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    return `${c.type}${args.length ? ` {${args.join(', ')}}` : ''}`;
};
const fmtGold = (g) => (g.anyOf ? g.anyOf.map(fmtGold).join(' | ') : fmtCmd(g));
// the figures above are conditional on a valid answer; end to end a case without one is an empty plan (score.mjs endToEnd)
const e2eRecall = (a) => (a.end_to_end ? `${a.end_to_end.recall_pct ?? '–'} % (${a.end_to_end.full_commands}/${a.end_to_end.gold_commands})` : '–');
const e2eExact = (a) => (a.end_to_end ? `${a.end_to_end.exact_cases_pct ?? '–'} % (${a.end_to_end.exact_cases}/${a.end_to_end.cases})` : '–');

function summaryMarkdown(run) {
    const { meta, agg, lat, tok, records, gates } = run;
    const L = [];
    L.push('# P0 / S1 Interpreter: Ergebnis', '');
    L.push(`- Datum: ${meta.finished} · Dauer ${meta.duration_s} s · Werkzeug ${TOOL} v${TOOL_VERSION} · Vokabular ${meta.vocab_version} · Korpus ${meta.corpus_cases} Fälle${meta.sampled ? `, davon ${meta.cases} ausgewählt` : ''}`);
    L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model}${meta.provider.profile ? ` · Profil: ${meta.provider.profile}` : ''}`);
    L.push(`- Prompt: ${meta.prompt ?? 'p0'} · Agency-Guard: ${meta.guard ? 'an (Kennzahlen unten nach dem Guard; der Interpreter allein steht in der Vergleichstabelle)' : 'aus'}`);
    L.push(`- Modus: ${meta.mode} · Reasoning: ${meta.reasoning ?? 'wie konfiguriert'} (${meta.mode_source}) · temperature ${meta.temperature} · Beispiele im Prompt: ${meta.examples ? 'ja' : 'nein'}`);
    L.push(`- Aufrufe: ${meta.calls} (davon ${meta.repairs} Reparatur) · Prompt ≈ ${meta.prompt_tokens_est} Token (Schätzung, System + Katalog + Nachricht)`);
    L.push('', '## Schwellen (Go/No-Go P0, Plan §16)', '');
    L.push(mdTable(['Kennzahl', 'Wert', 'Schwelle', 'erfüllt'], [
        ['Präzision auf Negativfällen (keine falsche Agency)', `${agg.negative_precision_pct ?? '–'} % (${agg.negative_ok}/${agg.negative_cases})`, `≥ ${GATES.negative_precision_pct} %`, gates.negative ? 'ja' : 'NEIN'],
        ['Recall (Typ und Argumente, nur gültige Antworten)', `${agg.recall_pct ?? '–'} % von ${agg.gold_commands} Befehlen`, `≥ ${GATES.recall_pct} %`, gates.recall ? 'ja' : 'NEIN'],
        ['p50 Latenz', `${lat.p50_s ?? '–'} s`, `≤ ${GATES.p50_s} s`, gates.p50 ? 'ja' : 'NEIN'],
    ]));
    if (run.agg_raw) {
        const r = run.agg_raw;
        L.push('', '## Interpreter allein gegen Interpreter + Agency-Guard', '');
        L.push(mdTable(['Kennzahl', 'Interpreter allein', '+ Guard'], [
            ['Negativ-Präzision', `${r.negative_precision_pct} % (${r.negative_ok}/${r.negative_cases})`, `${agg.negative_precision_pct} % (${agg.negative_ok}/${agg.negative_cases})`],
            ['Recall Typ + Argumente', `${r.recall_pct} %`, `${agg.recall_pct} %`],
            ['falsche Befehle / Festlegungen', `${r.false_commands} / ${r.false_commitments}`, `${agg.false_commands} / ${agg.false_commitments}`],
            ['Fälle exakt', `${r.exact_cases_pct} %`, `${agg.exact_cases_pct} %`],
            ['Reihenfolge / Referenzen', `${r.order_ok_pct} % / ${r.reference_ok_pct} %`, `${agg.order_ok_pct} % / ${agg.reference_ok_pct} %`],
        ]));
        const dropped = records.flatMap((x) => (x.dropped || []).map((d) => ({ id: x.id, ...d })));
        if (dropped.length) {
            L.push('', `Vom Guard verworfen (${dropped.length}):`);
            for (const d of dropped.slice(0, 40)) L.push(`- ${d.id}: ${d.type} „${String(d.quote || '').slice(0, 80)}“ → ${d.rule}`);
        }
    }
    L.push('', '## Weitere Kennzahlen', '');
    L.push(mdTable(['Kennzahl', 'Wert'], [
        ['Recall nur Befehlstyp', `${agg.type_recall_pct ?? '–'} %`],
        ['Präzision aller Befehle', `${agg.command_precision_pct ?? '–'} %`],
        ['falsche Befehle gesamt / davon Festlegungen (pay, buy, accept …)', `${agg.false_commands} / ${agg.false_commitments}`],
        ['Fälle exakt richtig (nur gültige Antworten)', `${agg.exact_cases_pct ?? '–'} %`],
        ['Reihenfolge bei Mehrfachhandlungen', `${agg.order_ok_pct ?? '–'} % von ${agg.order_cases}`],
        ['Referenzen richtig aufgelöst', `${agg.reference_ok_pct ?? '–'} % von ${agg.reference_args}`],
        ['gültig im 1. Versuch / nach Reparatur', `${run.valid.first_pct ?? '–'} % / ${run.valid.final_pct ?? '–'} %`],
        ['Fehler (keine Antwort)', `${agg.failed}`],
        ['Recall Ende-zu-Ende (Fall ohne gültige Antwort: alle Befehle verpasst)', e2eRecall(agg)],
        ['Fälle exakt Ende-zu-Ende', e2eExact(agg)],
        ['Latenz p50 / p90 / Mittel', `${lat.p50_s ?? '–'} / ${lat.p90_s ?? '–'} / ${lat.mean_s ?? '–'} s`],
        ['Token je Aufruf (Prompt / Output / Reasoning)', `${tok.prompt ?? '?'} / ${tok.completion ?? '?'} / ${tok.reasoning ?? '–'}`],
    ]));
    L.push('', '## Fehler pro Befehlstyp', '');
    L.push(mdTable(['Typ', 'Gold', 'richtig', 'falsches Argument', 'fehlt', 'falsch erzeugt'],
        Object.entries(agg.per_type).sort((a, b) => b[1].gold - a[1].gold).map(([t, x]) => [t, x.gold, x.full, x.wrong_args, x.missing, x.false])));
    L.push('', '## Negativfälle nach Art', '');
    const negRows = NEG_CATEGORIES.map((cat) => {
        const rr = records.filter((r) => r.score && r.score.negative && r.tags.includes(cat));
        return [cat, rr.length, rr.filter((r) => r.score.negative_ok).length];
    }).filter((r) => r[1] > 0);
    L.push(mdTable(['Art', 'Fälle', 'ohne falschen Befehl'], negRows));
    L.push('', '## Echte vs. synthetische Nachrichten', '');
    L.push(mdTable(['Quelle', 'Fälle', 'exakt richtig', 'Negativ-Präzision'], ['real', 'synthetic'].map((src) => {
        const rr = records.filter((r) => r.score && r.tags.includes(src));
        const neg = rr.filter((r) => r.score.negative);
        return [src, rr.length, `${pct(rr.filter((r) => r.score.exact).length, rr.length) ?? '–'} %`, `${pct(neg.filter((r) => r.score.negative_ok).length, neg.length) ?? '–'} %`];
    })));
    const bad = records.filter((r) => !r.score || !r.score.exact);
    if (bad.length) {
        L.push('', `## Abweichungen (${bad.length}, höchstens 60)`, '');
        for (const r of bad.slice(0, 60)) {
            if (!r.score) { L.push(`- **${r.id}** · keine gültige Antwort: ${r.error || (r.errors_final || []).slice(0, 2).join('; ')}`); continue; }
            const parts = [];
            for (const m of r.score.matches) if (m.kind !== 'full') parts.push(`${m.kind === 'missing' ? 'fehlt' : `falsches ${m.bad.join('/')}`}: ${fmtGold(m.gold)}${m.kind === 'type' ? ` → ${fmtCmd(r.predicted[m.pred_index] ?? r.predicted_sorted?.[m.pred_index])}` : ''}`);
            for (const f of r.score.false_commands) parts.push(`falsch${COMMITMENTS.has(f.type) ? ' (Festlegung)' : ''}: ${fmtCmd(f)}`);
            if (r.score.order_ok === false) parts.push('Reihenfolge falsch');
            L.push(`- **${r.id}** (${r.scene}) „${r.text.slice(0, 110)}${r.text.length > 110 ? '…' : ''}“ · ${parts.join(' · ')}`);
        }
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
    const which = a.prompt && a.prompt !== true ? String(a.prompt) : 'v4';
    if (!['v4', 'p0'].includes(which)) throw new Error('--prompt ist v4 oder p0');
    const kit = promptKit(which, deps.vocab ?? null);
    const vocab = kit.vocab;
    const guardOn = a.guard !== undefined ? String(a.guard) !== 'off' : which === 'v4';
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
    const maxTokens = intArg(a['max-tokens'], 2500);
    const temperature = a.temperature !== undefined ? Number(a.temperature) : 0.1;
    const timeoutMs = intArg(a.timeout, 120) * 1000;
    const examples = !a['no-examples'];
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, 's1');
    const decision = deps.decision !== undefined ? deps.decision : readDecision();
    const mode = a.mode && a.mode !== true ? String(a.mode) : decision?.structured_mode || 'plain';
    if (!['json_schema', 'plain'].includes(mode)) throw new Error('--mode ist json_schema oder plain');
    let reasoning;
    if (a.reasoning !== undefined && a.reasoning !== true) reasoning = String(a.reasoning) === 'keep' ? undefined : String(a.reasoning);
    else reasoning = decision?.reasoning ?? undefined;
    const modeSource = a.mode || a.reasoning !== undefined ? 'Kommandozeile' : decision ? 'aus S0' : 'Standard, S0 nicht gefunden';
    const system = kit.system({ examples });
    const promptTokensEst = Math.round(mean(cases.map((c) => estimateTokens(system) + estimateTokens(kit.user(scenes[c.scene], c.text)) + (mode === 'plain' ? estimateTokens(kit.plain) : 0))) || 0);

    if (a['dry-run']) {
        const sample = cases.slice(0, 3).map((c) => {
            const schema = kit.schema(scenes[c.scene]);
            return { case: c.id, messages: [{ role: 'system', content: mode === 'plain' ? `${system}\n\n${kit.plain}` : system }, { role: 'user', content: kit.user(scenes[c.scene], c.text) }], json_schema: mode === 'json_schema' ? { name: 'interpreter', strict: true, schema } : null };
        });
        writeJson(path.join(outDir, 'requests_sample.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), note: 'dry run: no call was made', mode, reasoning: reasoning ?? 'keep', sample });
        log(`S1 Probelauf: ${cases.length} Fälle × ${reps} = ${cases.length * reps} Aufrufe geplant (+ höchstens 1 Reparatur je ungültiger Antwort). Modus ${mode}, Reasoning ${reasoning ?? 'wie konfiguriert'} (${modeSource}).`);
        log(`Prompt ≈ ${promptTokensEst} Token je Aufruf (Schätzung) → ≈ ${Math.round((promptTokensEst * cases.length * reps) / 1000)}k Prompt-Token gesamt.`);
        log(`Beispielanfragen: ${path.join(outDir, 'requests_sample.json')}`);
        return 0;
    }

    let provider;
    try {
        provider = deps.provider ?? await openProvider({
            backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs,
            mock: a.backend === 'mock' ? s1MockResponder(corpus, scenes, vocab, { user: kit.user }) : undefined,
        });
    } catch (err) {
        log(`FEHLER: ${err.message}`);
        return 1;
    }
    const secrets = provider.secrets || [];
    const d = provider.describe();
    const total = cases.length * reps;
    log(`S1 Interpreter · Prompt ${kit.name} (${vocab.version}) · Guard ${guardOn ? 'an' : 'aus'} · Backend ${d.backend} · Modell ${d.model} · Modus ${mode} · Reasoning ${reasoning ?? 'wie konfiguriert'} (${modeSource})`);
    log(`Plan: ${cases.length} Fälle × ${reps} = ${total} Aufrufe, ${concurrency} gleichzeitig; Prompt ≈ ${promptTokensEst} Token je Aufruf.`);
    let done = 0;
    let calls = 0;
    const tasks = [];
    for (let rep = 1; rep <= reps; rep++) {
        for (const c of cases) {
            tasks.push(async () => {
                const scene = scenes[c.scene];
                const r = await structuredCall(provider, {
                    name: 'interpreter', schema: kit.schema(scene), system, user: kit.user(scene, c.text), mode,
                    plainInstruction: kit.plain, reasoning, maxTokens, temperature, timeoutMs, ...deps.retry,
                });
                calls += r.attempts.length;
                const raw = r.valid_final && Array.isArray(r.value?.commands) ? r.value.commands : null;
                // the product's agency guard (src/v4/agency.js) on the answer: what the engine would go on to resolve
                const guarded = raw && guardOn ? guardCommands(c.text, raw, guardContextFromScene(scene)) : null;
                const predicted = guarded ? guarded.kept : raw;
                const score = predicted ? scoreCase(c, predicted) : null;
                const scoreRaw = raw && guarded ? scoreCase(c, raw) : null;
                const predicted_sorted = predicted ? [...predicted].sort((x, y) => (x.seq ?? 0) - (y.seq ?? 0)) : null;
                const rec = {
                    id: c.id, rep, scene: c.scene, text: c.text, tags: c.tags, expect: c.expect, allow: c.allow || [],
                    ok: r.ok, error: r.ok ? null : scrub(r.error, secrets), valid_first: r.valid_first, valid_final: r.valid_final, repaired: r.repaired,
                    errors_final: r.errors_final, predicted: predicted_sorted, predicted_count: predicted ? predicted.length : 0, score,
                    ...(guarded ? { raw: [...raw].sort((x, y) => (x.seq ?? 0) - (y.seq ?? 0)), raw_count: raw.length, score_raw: scoreRaw, dropped: guarded.dropped.map((x) => ({ type: x.command.type, rule: x.rule, quote: x.command.quote })) } : {}),
                    ms: r.attempts[0]?.ms ?? null, tokens: callTokens(r), finish: r.attempts[0]?.finish ?? null,
                    answer: r.ok && !predicted ? String(r.content).slice(0, 1500) : undefined,
                };
                done += 1;
                note(`[${done}/${total}] ${c.id}: ${!r.ok ? `Fehler (${rec.error})` : !score ? 'ungültige Antwort' : score.exact ? 'richtig' : score.negative ? `falsch erzeugt: ${score.false_commands.map((x) => x.type).join(', ')}` : `abweichend (${score.full}/${score.gold}${score.false_commands.length ? `, +${score.false_commands.length} falsch` : ''})`} · ${s(rec.ms)} s`);
                return rec;
            });
        }
    }
    const records = await pool(tasks, concurrency);
    const agg = aggregate(records.map((r) => ({ score: r.score, predicted_count: r.predicted_count, gold: r.expect.length })));
    const aggRaw = guardOn ? aggregate(records.map((r) => ({ score: r.score_raw ?? r.score, predicted_count: r.raw_count ?? r.predicted_count, gold: r.expect.length }))) : null;
    const answered = records.filter((r) => r.ok);
    const lats = answered.map((r) => r.ms).filter(Number.isFinite);
    const lat = { p50_s: s(percentile(lats, 50)), p90_s: s(percentile(lats, 90)), mean_s: s(mean(lats)) };
    const toks = answered.map((r) => r.tokens).filter((t) => t.reported);
    const tok = {
        prompt: round(mean(toks.map((t) => t.prompt)), 0), completion: round(mean(toks.map((t) => t.completion)), 0),
        reasoning: toks.some((t) => t.reasoning > 0) ? round(mean(toks.map((t) => t.reasoning)), 0) : null,
    };
    const valid = { first_pct: pct(answered.filter((r) => r.valid_first).length, answered.length), final_pct: pct(answered.filter((r) => r.valid_final).length, answered.length) };
    const gates = {
        negative: (agg.negative_precision_pct ?? 0) >= GATES.negative_precision_pct,
        recall: (agg.recall_pct ?? 0) >= GATES.recall_pct,
        p50: lat.p50_s !== null && lat.p50_s <= GATES.p50_s,
    };
    const meta = {
        tool: TOOL, version: TOOL_VERSION, started: new Date(started).toISOString(), finished: nowIso(), duration_s: round((Date.now() - started) / 1000, 0),
        node: process.version, provider: d, mode, reasoning: reasoning ?? null, mode_source: modeSource, temperature, max_tokens: maxTokens, examples,
        prompt: kit.name, guard: guardOn,
        vocab_version: vocab.version, corpus_cases: corpus.length, cases: cases.length, sampled: cases.length !== corpus.length, reps,
        calls, repairs: records.filter((r) => r.repaired).length, prompt_tokens_est: promptTokensEst,
    };
    const run = { meta, gates, agg, agg_raw: aggRaw, lat, tok, valid, records };
    const summary = summaryMarkdown(run);
    for (const text of [JSON.stringify(run), summary]) assertNoSecrets(text, secrets);
    writeJson(path.join(outDir, 'results.json'), run);
    writeText(path.join(outDir, 'summary.md'), summary);
    log('');
    log(summary.split('\n## Abweichungen')[0]);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')} (zum Zurückschicken, mit allen Abweichungen), results.json`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.message}`); process.exit(1); });
}
