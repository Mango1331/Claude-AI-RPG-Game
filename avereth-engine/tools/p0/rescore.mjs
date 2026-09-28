// Runtime V4, P0 follow-up: re-evaluate the recorded P0 answers offline, without a provider and without touching them.
// The P0 runs of 27.09. stay as measured (p0_out/s1, p0_out/s2: summary.md, results.json, a.json, b.json); this tool
// reads their stored answers and writes a second evaluation next to them (docs/P0_BERICHT.md §4–§6):
//
//   S2  scoring v2: per-turn mean without the turns that have no gold item; deltas no gold item scored ("extraneous");
//       the domain/authority firewall of the product (src/v4/firewall.js), applied to the recorded extractor answers:
//       what it would have committed, rejected or turned into an audit line
//   S1  the local agency guard of the product (src/v4/agency.js), applied to the recorded interpreter answers
//       (layer by layer: interpreter as measured → + evidence guard → + state preconditions)
//
//   node tools/p0/rescore.mjs            reads p0_out/s1 and p0_out/s2, writes p0_out/rescored/summary.md + results.json
//   node tools/p0/rescore.mjs --in <dir> --out <dir>
//
// No call is made. Nothing in the P0 result directories is changed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT_ROOT, parseArgs, readJson, readJsonl, writeJson, writeText, nowIso, mdTable, round, pct, mean } from './lib/util.mjs';
import { scoreTurn, DATA_FILE, GLOBAL_FORBIDDEN } from './s2_deltas.mjs';
import { firewallContextFromTurn, goldMatch } from './lib/deltas.mjs';
import { CORPUS_FILE } from './s1_interpreter.mjs';
import { scoreCase, aggregate, COMMITMENTS } from './lib/score.mjs';
import { loadScenes } from './lib/interpreter.mjs';

export const TOOL = 'p0_rescore';
export const TOOL_VERSION = 2;

// ------------------------------------------------------------------------------------------------ S2
/** Item-weighted and per-turn semantics of a list of {value, turn} pairs, scored with the current scoring. */
export function s2Stats(pairs) {
    const scored = pairs.map(({ turn, value }) => ({ turn, value, score: value ? scoreTurn(turn, value) : null }));
    const s = scored.filter((x) => x.score).map((x) => x.score);
    const sum = (f) => s.reduce((n, x) => n + f(x), 0);
    const items = scored.reduce((n, x) => n + (x.turn.gold.critical || []).length + Object.keys(x.turn.gold.expected || {}).length, 0);
    const v2 = s.map((x) => x.semantic_v2).filter((x) => x !== null);
    const extraneous = {};
    for (const x of s) for (const t of x.extraneous) extraneous[t] = (extraneous[t] || 0) + 1;
    return {
        turns: pairs.length,
        valid: s.length,
        semantic_micro_pct: pct(sum((x) => x.expected_ok + x.critical_found), items + sum((x) => x.forbidden_hits.length)),
        semantic_turns_v1_pct: s.length ? round(100 * mean(s.map((x) => x.semantic)), 1) : null,
        semantic_turns_v2_pct: v2.length ? round(100 * mean(v2), 1) : null,
        turns_without_items: s.length - v2.length,
        critical: `${sum((x) => x.critical_found)}/${sum((x) => x.critical_total)}`,
        expected: `${sum((x) => x.expected_ok)}/${sum((x) => x.expected_total)}`,
        forbidden_hits: sum((x) => x.forbidden_hits.length),
        forbidden: scored.filter((x) => x.score?.forbidden_hits.length).map((x) => ({ id: x.turn.id, types: x.score.forbidden_hits.map((h) => h.delta.type) })),
        deltas_total: sum((x) => x.deltas),
        extraneous_total: sum((x) => x.extraneous.length),
        extraneous_by_type: Object.fromEntries(Object.entries(extraneous).sort((a, b) => b[1] - a[1])),
        per_turn: scored.map((x) => ({ id: x.turn.id, items: (x.turn.gold.critical || []).length + Object.keys(x.turn.gold.expected || {}).length, semantic_v1: x.score?.semantic ?? null, semantic_v2: x.score?.semantic_v2 ?? null, extraneous: x.score?.extraneous ?? null })),
    };
}

export function rescoreS2(dir, turns) {
    const byId = new Map(turns.map((t) => [t.id, t]));
    const out = {};
    const a = fs.existsSync(path.join(dir, 'a.json')) ? readJson(path.join(dir, 'a.json')) : null;
    const b = fs.existsSync(path.join(dir, 'b.json')) ? readJson(path.join(dir, 'b.json')) : null;
    if (a) out.a = { run: a.meta.finished, ...s2Stats(a.records.map((r) => ({ turn: byId.get(r.id), value: r.valid_final ? r.value : null }))) };
    // as measured, B's block was scored whenever it parsed as JSON, schema-valid or not (s2_deltas.mjs runB); the strict
    // reading counts only schema-valid blocks
    if (b) {
        out.b_block = { run: b.meta.finished, ...s2Stats(b.block.map((r) => ({ turn: byId.get(r.id), value: r.value ?? null }))) };
        out.b_block_strict = { run: b.meta.finished, ...s2Stats(b.block.map((r) => ({ turn: byId.get(r.id), value: r.valid ? r.value : null }))) };
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ S2 firewall
/**
 * The product's domain/authority firewall (src/v4/firewall.js) on recorded extractor answers: what it would have
 * committed and refused. Each turn's firewall context is rebuilt from the text the engine wrote for it
 * (firewallContextFromTurn). A refused delta is classified against the turn's gold: forbidden (the gold says it must
 * not be committed: a correct refusal), critical (the gold needs it: a loss) or neither (read by hand in the report).
 * @param {{id: string, value: object|null}[]} answers  schema-valid answers (value null = not scored)
 */
export async function firewallStats(answers, turns) {
    const { firewall } = await import('../../src/v4/firewall.js');
    const byId = new Map(turns.map((t) => [t.id, t]));
    const out = { answers: 0, forbidden_before: 0, forbidden_after: 0, critical_before: 0, critical_after: 0, critical_total: 0, refused: [], remaining: [], by_rule: {} };
    for (const r of answers) {
        const turn = byId.get(r.id);
        if (!turn || !r.value) continue;
        out.answers += 1;
        const res = firewall(r.value.deltas, firewallContextFromTurn(turn));
        const before = scoreTurn(turn, r.value);
        const after = scoreTurn(turn, { ...r.value, deltas: res.accept });
        out.forbidden_before += before.forbidden_hits.length;
        out.forbidden_after += after.forbidden_hits.length;
        out.critical_before += before.critical_found;
        out.critical_after += after.critical_found;
        out.critical_total += before.critical_total;
        for (const h of after.forbidden_hits) out.remaining.push({ id: r.id, type: h.delta.type, delta: h.delta });
        for (const x of res.reject) {
            const gold = [...(turn.gold.forbidden || []), ...GLOBAL_FORBIDDEN].some((f) => goldMatch(f, x.delta)) ? 'forbidden'
                : (turn.gold.critical || []).some((c) => goldMatch(c, x.delta)) ? 'critical' : 'neither';
            out.refused.push({ id: r.id, rule: x.rule, gold, type: x.delta.type, delta: x.delta });
            out.by_rule[x.rule] = (out.by_rule[x.rule] || 0) + 1;
        }
    }
    return out;
}

const shortDelta = (d) => JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => k !== 'seq'))).slice(0, 170);

export function firewallMarkdown(sets) {
    const L = [mdTable(['Antworten', 'verbotene Deltas vorher → nachher', 'kritische Deltas vorher → nachher', 'verworfen: verboten / kritisch / weder noch'],
        sets.map(({ name, s }) => [`${name} (${s.answers})`, `${s.forbidden_before} → ${s.forbidden_after}`, `${s.critical_before} → ${s.critical_after} (von ${s.critical_total})`,
            `${s.refused.filter((x) => x.gold === 'forbidden').length} / ${s.refused.filter((x) => x.gold === 'critical').length} / ${s.refused.filter((x) => x.gold === 'neither').length}`]))];
    for (const { name, s } of sets) {
        L.push('', `### ${name}: verworfen (${s.refused.length})`, '');
        for (const x of s.refused) L.push(`- ${x.id} · ${x.rule} · Gold: ${x.gold} · ${shortDelta(x.delta)}`);
        if (s.remaining.length) {
            L.push('', `Verbleibende verbotene Deltas (nicht Sache der Firewall): ${s.remaining.map((x) => `${x.id} ${x.type} ${shortDelta(x.delta)}`).join('; ')}`);
        }
    }
    return L.join('\n');
}

/** Default firewall step of main(): variant A (the product path) and, as a second sample, B's schema-valid blocks. */
export async function firewallDefault(aRun, turns, bRun = null) {
    const sets = [{ name: 'S2 A (Extraktor, Produktpfad)', s: await firewallStats(aRun.records.map((r) => ({ id: r.id, value: r.valid_final ? r.value : null })), turns) }];
    if (bRun?.block) sets.push({ name: 'S2 B, schema-gültige Blöcke (zweite Stichprobe)', s: await firewallStats(bRun.block.map((r) => ({ id: r.id, value: r.valid ? r.value : null })), turns) });
    return { sets: sets.map(({ name, s }) => ({ name, ...s })), markdown: firewallMarkdown(sets) };
}

// ------------------------------------------------------------------------------------------------ S1
/** The P0 metrics of a list of cases with the commands a layer let through. */
export function s1Stats(records) {
    const agg = aggregate(records.map((r) => ({ score: r.score, predicted_count: r.predicted_count })));
    return {
        negative_precision_pct: agg.negative_precision_pct, negative: `${agg.negative_ok}/${agg.negative_cases}`,
        recall_pct: agg.recall_pct, type_recall_pct: agg.type_recall_pct, command_precision_pct: agg.command_precision_pct,
        false_commands: agg.false_commands, false_commitments: agg.false_commitments, exact_cases_pct: agg.exact_cases_pct,
        order_ok_pct: agg.order_ok_pct, reference_ok_pct: agg.reference_ok_pct,
    };
}

export function rescoreS1(file, corpus, layers = []) {
    const run = readJson(file);
    const byId = new Map(corpus.map((c) => [c.id, c]));
    const base = run.records.filter((r) => r.predicted);
    const out = { run: run.meta.finished, cases: run.records.length, layers: [] };
    const asRecord = (r, predicted) => ({ id: r.id, predicted, predicted_count: predicted.length, score: scoreCase(byId.get(r.id), predicted) });
    out.layers.push({ name: 'Interpreter wie gemessen', ...s1Stats(base.map((r) => asRecord(r, r.predicted))) });
    for (const layer of layers) {
        const kept = base.map((r) => {
            const res = layer.apply(byId.get(r.id), r.predicted);
            return { r, predicted: res.kept, dropped: res.dropped };
        });
        const recs = kept.map((k) => asRecord(k.r, k.predicted));
        const dropped = kept.flatMap((k) => k.dropped.map((d) => ({ id: k.r.id, type: d.command.type, why: d.why, quote: d.command.quote })));
        // a dropped command that the gold wanted: a guard that costs recall
        const lost = kept.flatMap((k) => {
            const before = scoreCase(byId.get(k.r.id), k.r.predicted);
            const after = scoreCase(byId.get(k.r.id), k.predicted);
            return after.full < before.full ? [{ id: k.r.id, lost: before.full - after.full }] : [];
        });
        out.layers.push({ name: layer.name, ...s1Stats(recs), dropped, lost });
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ report
function s2Table(s) {
    return mdTable(['Kennzahl', 'Variante A', 'B (Block zur aufgezeichneten Prosa)'], [
        ['bewertete Antworten (B: jeder als JSON lesbare Block, wie gemessen)', `${s.a?.valid ?? '–'}/${s.a?.turns ?? '–'}`, `${s.b_block?.valid ?? '–'}/${s.b_block?.turns ?? '–'}`],
        ['Semantik je Gold-Element (Entscheidungsgröße, unverändert)', `${s.a?.semantic_micro_pct ?? '–'} %`, `${s.b_block?.semantic_micro_pct ?? '–'} %`],
        ['Mittel je Zug, wie gemessen (Züge ohne Gold-Element = 100 %)', `${s.a?.semantic_turns_v1_pct ?? '–'} %`, `${s.b_block?.semantic_turns_v1_pct ?? '–'} %`],
        ['Mittel je Zug, korrigiert (ohne diese Züge)', `${s.a?.semantic_turns_v2_pct ?? '–'} % (${s.a?.turns_without_items ?? '–'} Züge ausgenommen)`, `${s.b_block?.semantic_turns_v2_pct ?? '–'} %`],
        ['kritische Deltas / expected', `${s.a?.critical ?? '–'} / ${s.a?.expected ?? '–'}`, `${s.b_block?.critical ?? '–'} / ${s.b_block?.expected ?? '–'}`],
        ['verbotene Deltas (Negativ-Gold)', `${s.a?.forbidden_hits ?? '–'}`, `${s.b_block?.forbidden_hits ?? '–'}`],
        ['Deltas gesamt / von keinem Gold-Element bewertet', `${s.a?.deltas_total ?? '–'} / ${s.a?.extraneous_total ?? '–'}`, `${s.b_block?.deltas_total ?? '–'} / ${s.b_block?.extraneous_total ?? '–'}`],
        ['B streng: nur schema-gültige Blöcke (Semantik je Gold-Element)', '–', `${s.b_block_strict?.semantic_micro_pct ?? '–'} % (${s.b_block_strict?.valid ?? '–'}/${s.b_block_strict?.turns ?? '–'} gültig)`],
    ]);
}

function s1Table(s1) {
    return mdTable(['Stufe', 'Negativ-Präzision', 'Recall Typ+Arg.', 'falsche Befehle / Festlegungen', 'Fälle exakt', 'Reihenfolge', 'Refs', 'verworfen', 'Recall-Verlust'],
        s1.layers.map((l) => [l.name, `${l.negative_precision_pct} % (${l.negative})`, `${l.recall_pct} %`, `${l.false_commands} / ${l.false_commitments}`, `${l.exact_cases_pct} %`, `${l.order_ok_pct} %`, `${l.reference_ok_pct} %`, l.dropped ? l.dropped.length : '–', l.lost ? l.lost.reduce((n, x) => n + x.lost, 0) : '–']));
}

export function summaryMarkdown(res) {
    const L = ['# P0: Nachauswertung der aufgezeichneten Antworten (offline, ohne Provider)', ''];
    L.push(`- Erstellt: ${res.created} · Werkzeug ${TOOL} v${TOOL_VERSION}`);
    L.push('- Die P0-Läufe bleiben wie gemessen; diese Datei bewertet ihre gespeicherten Antworten zusätzlich neu. Neue Modellaufrufe: keine.');
    if (res.s2) {
        L.push('', `## S2 World Deltas (Lauf ${res.s2.a?.run ?? '–'} / ${res.s2.b_block?.run ?? '–'})`, '');
        L.push(s2Table(res.s2));
        if (res.s2.a) L.push('', `Von keinem Gold-Element bewertete Deltas in A nach Typ: ${Object.entries(res.s2.a.extraneous_by_type).map(([t, n]) => `${t} ${n}`).join(', ')}.`);
    }
    if (res.firewall) {
        L.push('', '## S2 A durch die Domain-/Authority-Firewall des Produkts', '');
        L.push(res.firewall.markdown);
    }
    if (res.s1) {
        L.push('', `## S1 Interpreter (Lauf ${res.s1.run}, ${res.s1.cases} Fälle)`, '');
        L.push(s1Table(res.s1));
        for (const l of res.s1.layers.filter((x) => x.dropped?.length)) {
            L.push('', `### ${l.name}: verworfen (${l.dropped.length})`, '');
            for (const d of l.dropped) L.push(`- ${d.id}: ${d.type} „${String(d.quote || '').slice(0, 90)}“ → ${d.why}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

/** The layers of the product's agency guard (src/v4/agency.js), as the recorded interpreter answers go through them. */
export async function guardLayers() {
    const { guardCommands } = await import('../../src/v4/agency.js');
    const { guardContextFromScene } = await import('./lib/interpreter.mjs');
    const scenes = loadScenes();
    const layer = (name, opts) => ({
        name,
        apply: (kase, predicted) => {
            const r = guardCommands(kase.text, predicted, guardContextFromScene(scenes[kase.scene]), opts);
            return { kept: r.kept, dropped: r.dropped.map((d) => ({ command: d.command, why: `${d.rule}: ${d.why}` })) };
        },
    });
    return [
        layer('+ Zustandsprüfung allein', { language: false, state: true }),
        layer('+ Evidenz-Guard (Sprache) allein', { language: true, state: false }),
        layer('+ Agency-Guard (Evidenz + Zustand)', { language: true, state: true }),
    ];
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const log = deps.log ?? ((t) => console.log(t));
    const root = a.in ? path.resolve(String(a.in)) : OUT_ROOT;
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(root, 'rescored');
    const res = { tool: TOOL, version: TOOL_VERSION, created: nowIso() };
    const turns = readJsonl(DATA_FILE);
    if (fs.existsSync(path.join(root, 's2', 'a.json'))) res.s2 = rescoreS2(path.join(root, 's2'), turns);
    if (fs.existsSync(path.join(root, 's2', 'a.json'))) {
        const bFile = path.join(root, 's2', 'b.json');
        res.firewall = await (deps.firewall ?? firewallDefault)(readJson(path.join(root, 's2', 'a.json')), turns, fs.existsSync(bFile) ? readJson(bFile) : null);
    }
    const s1file = path.join(root, 's1', 'results.json');
    if (fs.existsSync(s1file)) res.s1 = rescoreS1(s1file, readJsonl(CORPUS_FILE), deps.s1Layers ?? await guardLayers());
    writeJson(path.join(outDir, 'results.json'), res);
    writeText(path.join(outDir, 'summary.md'), summaryMarkdown(res));
    log(summaryMarkdown(res));
    log(`Gespeichert: ${path.join(outDir, 'summary.md')}, results.json`);
    return 0;
}

export { COMMITMENTS, loadScenes };

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.stack || err.message}`); process.exit(1); });
}
