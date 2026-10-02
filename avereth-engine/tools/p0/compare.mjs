// P0 follow-up: compare recorded interpreter/planner runs offline, on the cases they share (S1, S4 and S4a
// results.json; docs/ARCHITECTURE_REVIEW_GM_TOOLS.md §16). No call is made and no run is changed.
//
// Per run: the figures conditional on a valid answer (as in its own summary) next to the end-to-end ones (a case
// without a valid answer is an empty plan), and every answer that never became valid, read again with the product's
// validator (src/v4/interpret.js parseInterpretation). Its typed error separates a format failure (a missing "quote",
// a bare name instead of a reference …) from a wrong reading. When a missing "quote" is the only error, the answer is
// scored once more with the player's message as its quote (agency guard included): if it is then exact, the reading
// was right and only the format failed. Every other invalid answer is listed for reading by hand.
// Per pair of runs: the cases only one of them got exactly right (end to end; also with the quote-only failures
// counted as right) and the exact sign test on them.
//
//   node tools/p0/compare.mjs p0_out/s1_now/results.json p0_out/s4a_gm/results.json p0_out/s4a_gm_rules/results.json
//   … --out p0_out/compare     also writes summary.md and results.json there
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, readJson, writeJson, writeText, mdTable, nowIso, pct, extractJsonObject } from './lib/util.mjs';
import { scoreCase, aggregate, signTestP, fmtP } from './lib/score.mjs';
import { loadVocabulary, loadScenes, guardContextFromScene } from './lib/interpreter.mjs';
import { PRODUCT_VOCAB_FILE } from './s1_interpreter.mjs';
import * as v4 from '../../src/v4/interpret.js';
import { guardCommands } from '../../src/v4/agency.js';

export const TOOL = 'p0_compare';
export const TOOL_VERSION = 1;

export const runLabel = (run, file = '') => `${run.meta?.tool ?? path.basename(path.dirname(file))}${run.meta?.arm ? ` ${run.meta.arm}` : ''}`;

/** Why a recorded answer never became valid: no_answer | not_recorded | valid_for_product | quote_only | format. */
export function diagnoseInvalid(rec, vocab, scenes) {
    const base = { id: rec.id, gold: rec.expect.length };
    if (!rec.ok) return { ...base, kind: 'no_answer', errors: [String(rec.error ?? '')] };
    const scene = scenes[rec.scene];
    if (!rec.answer || !scene) return { ...base, kind: 'not_recorded', errors: rec.errors_final || [] };
    const product = v4.parseInterpretation(rec.answer, vocab, scene);
    // the harness checks with the generic schema validator and does not fill left-out nullable arguments: stricter
    if (product.commands) return { ...base, kind: 'valid_for_product', errors: [] };
    const errors = product.errors;
    const { value } = extractJsonObject(rec.answer);
    if (!errors.every((e) => /missing required "quote"/.test(e)) || !Array.isArray(value?.commands)) return { ...base, kind: 'format', errors };
    const commands = value.commands.map((c) => (c && typeof c === 'object' && c.quote === undefined ? { ...c, quote: rec.text } : c));
    const again = v4.parseInterpretation(JSON.stringify({ ...value, commands }), vocab, scene);
    if (!again.commands) return { ...base, kind: 'format', errors };
    const kept = guardCommands(rec.text, again.commands, guardContextFromScene(scene)).kept;
    const score = scoreCase(rec, kept);
    return { ...base, kind: 'quote_only', errors, exact_with_quote: score.exact, full_with_quote: score.full };
}

/** entries: [{label, run}] → the shared cases, per-run figures, pairwise discordance and sign tests. */
export function compareRuns(entries, { vocab = loadVocabulary(PRODUCT_VOCAB_FILE), scenes = loadScenes() } = {}) {
    const sets = entries.map(({ label, run }) => ({ label, byId: new Map(run.records.filter((r) => (r.rep ?? 1) === 1).map((r) => [r.id, r])) }));
    const ids = [...sets[0].byId.keys()].filter((id) => sets.every((s) => s.byId.has(id)));
    for (const s of sets) {
        s.recs = ids.map((id) => s.byId.get(id));
        s.diag = new Map(s.recs.filter((r) => !r.score).map((r) => [r.id, diagnoseInvalid(r, vocab, scenes)]));
        // exact end to end; "lenient": an answer whose only flaw was a missing quote counts as its re-scored self
        s.exact = (id) => !!s.byId.get(id).score?.exact;
        s.lenient = (id) => s.exact(id) || !!s.diag.get(id)?.exact_with_quote;
    }
    const runs = sets.map((s) => {
        const agg = aggregate(s.recs.map((r) => ({ score: r.score, predicted_count: r.predicted_count ?? 0, gold: r.expect.length })));
        const e = agg.end_to_end;
        const diag = [...s.diag.values()];
        const quoteFull = diag.reduce((n, d) => n + (d.full_with_quote ?? 0), 0);
        return {
            label: s.label,
            cases: s.recs.length,
            conditional: {
                answered: agg.answered, gold_commands: agg.gold_commands, recall_pct: agg.recall_pct,
                exact_cases_pct: agg.exact_cases_pct, negative: `${agg.negative_ok}/${agg.negative_cases}`,
            },
            end_to_end: e,
            lenient: {
                recall_pct: pct(e.full_commands + quoteFull, e.gold_commands), full_commands: e.full_commands + quoteFull,
                exact_cases: ids.filter(s.lenient).length, exact_cases_pct: pct(ids.filter(s.lenient).length, ids.length),
            },
            valid_first_pct: s.recs.some((r) => r.valid_first !== undefined) ? pct(s.recs.filter((r) => r.valid_first).length, s.recs.length) : null,
            false_commitments: agg.false_commitments,
            invalid: diag,
        };
    });
    const pairs = [];
    for (let i = 0; i < sets.length; i += 1) {
        for (let j = i + 1; j < sets.length; j += 1) {
            const [a, b] = [sets[i], sets[j]];
            const pair = (f) => {
                const onlyA = ids.filter((id) => f(a, id) && !f(b, id));
                const onlyB = ids.filter((id) => !f(a, id) && f(b, id));
                return { only_a: onlyA, only_b: onlyB, sign_p: signTestP(onlyA.length, onlyB.length) };
            };
            pairs.push({ a: a.label, b: b.label, end_to_end: pair((s, id) => s.exact(id)), lenient: pair((s, id) => s.lenient(id)) });
        }
    }
    return { cases: ids.length, runs, pairs };
}

const KIND = {
    no_answer: 'keine Antwort',
    not_recorded: 'Antwort nicht gespeichert',
    valid_for_product: 'für den Produkt-Validator gültig (Harness strenger)',
    quote_only: 'nur "quote" fehlt',
    format: 'Format/Referenz',
};

export function summaryMarkdown(res, files = []) {
    const L = ['# P0 Vergleich gespeicherter Läufe (offline)', ''];
    L.push(`- Werkzeug ${TOOL} v${TOOL_VERSION} · ${nowIso()} · gemeinsame Fälle: ${res.cases}`);
    for (const f of files) L.push(`- ${f}`);
    L.push('', '„nur gültige Antworten“: wie in den Einzelberichten (Fälle ohne gültige Antwort fallen aus dem Nenner). „Ende-zu-Ende“: ein Fall ohne gültige Antwort ist ein leerer Plan (Gold-Befehle verpasst, nie exakt). „Quote nachgetragen“: Ende-zu-Ende, wobei Antworten, deren einziger Fehler ein fehlendes \"quote\" war, mit der Spielernachricht als Quote neu bewertet sind (Guard inklusive).', '');
    L.push(mdTable(['Kennzahl', ...res.runs.map((r) => r.label)], [
        ['Recall, nur gültige Antworten', ...res.runs.map((r) => `${r.conditional.recall_pct ?? '–'} % von ${r.conditional.gold_commands}`)],
        ['Recall Ende-zu-Ende', ...res.runs.map((r) => `${r.end_to_end.recall_pct ?? '–'} % (${r.end_to_end.full_commands}/${r.end_to_end.gold_commands})`)],
        ['Recall, Quote nachgetragen', ...res.runs.map((r) => `${r.lenient.recall_pct ?? '–'} % (${r.lenient.full_commands}/${r.end_to_end.gold_commands})`)],
        ['Fälle exakt, nur gültige Antworten', ...res.runs.map((r) => `${r.conditional.exact_cases_pct ?? '–'} % von ${r.conditional.answered}`)],
        ['Fälle exakt Ende-zu-Ende', ...res.runs.map((r) => `${r.end_to_end.exact_cases_pct ?? '–'} % (${r.end_to_end.exact_cases}/${r.end_to_end.cases})`)],
        ['Fälle exakt, Quote nachgetragen', ...res.runs.map((r) => `${r.lenient.exact_cases_pct ?? '–'} % (${r.lenient.exact_cases}/${r.cases})`)],
        ['Negativfälle ohne falschen Befehl (gültige Antworten)', ...res.runs.map((r) => r.conditional.negative)],
        ['falsche Festlegungen', ...res.runs.map((r) => `${r.false_commitments}`)],
        ['gültig im 1. Versuch', ...res.runs.map((r) => (r.valid_first_pct === null ? '–' : `${r.valid_first_pct} %`))],
        ['ohne gültige Antwort: Fälle / Gold-Befehle', ...res.runs.map((r) => `${r.end_to_end.failed} / ${r.end_to_end.failed_gold}`)],
    ]));
    L.push('', '## Paarweise (exakte Fälle, Vorzeichentest exakt und zweiseitig)', '');
    L.push(mdTable(['Paar', 'Ende-zu-Ende: nur links / nur rechts · p', 'Quote nachgetragen: nur links / nur rechts · p'], res.pairs.map((p) => [
        `${p.a} ↔ ${p.b}`,
        `${p.end_to_end.only_a.length} / ${p.end_to_end.only_b.length} · p = ${fmtP(p.end_to_end.sign_p)}`,
        `${p.lenient.only_a.length} / ${p.lenient.only_b.length} · p = ${fmtP(p.lenient.sign_p)}`,
    ])));
    for (const p of res.pairs) {
        L.push('', `- ${p.a} ↔ ${p.b}, Ende-zu-Ende nur links: ${p.end_to_end.only_a.join(', ') || '–'} · nur rechts: ${p.end_to_end.only_b.join(', ') || '–'}`);
    }
    for (const r of res.runs.filter((x) => x.invalid.length)) {
        L.push('', `## Ohne gültige Antwort: ${r.label} (${r.invalid.length})`, '');
        for (const d of r.invalid) {
            const verdict = d.kind === 'quote_only' ? ` → mit Quote ${d.exact_with_quote ? 'exakt' : `${d.full_with_quote}/${d.gold}`}` : '';
            L.push(`- **${d.id}** · ${KIND[d.kind]}${verdict} · ${d.errors.slice(0, 3).join('; ')}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const log = deps.log ?? ((t) => console.log(t));
    const files = a._ || [];
    if (files.length < 2) {
        log('Aufruf: node tools/p0/compare.mjs <results.json> <results.json> [...] [--out <dir>]');
        return 1;
    }
    const entries = files.map((f) => {
        const run = readJson(path.resolve(String(f)));
        return { label: runLabel(run, String(f)), run };
    });
    const res = compareRuns(entries, deps);
    const summary = summaryMarkdown(res, files.map((f, i) => `${entries[i].label}: ${f}`));
    if (a.out && a.out !== true) {
        const out = path.resolve(String(a.out));
        writeJson(path.join(out, 'results.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), files, ...res });
        writeText(path.join(out, 'summary.md'), summary);
    }
    log(summary);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.message}`); process.exit(1); });
}
