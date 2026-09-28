// Runtime V4, P0 / S0: does the provider keep json_schema, and what does reasoning cost? (plan §16, S0; §4.3; §10)
//
//   node tools/p0/s0_structured.mjs                     through the running SillyTavern (default; the key stays there)
//   node tools/p0/s0_structured.mjs --backend direct    straight to the provider (environment variables, docs/P0_SPIKES.md)
//   node tools/p0/s0_structured.mjs --dry-run           no calls: writes the planned requests to p0_out/s0/requests.json
//
// Options: --reps 3  --concurrency 2  --max-tokens 2000  --temperature 0.2  --timeout 180 (s)
//          --reasoning-off auto|none|minimal|<value>|skip   (auto: try "none", then "minimal")
//          --modes schema_keep,schema_off,plain_keep,plain_off  --cases id,id  --out <dir>  --st-url <url>
//          --profile "<Connection Profile>"
//
// Four modes (json_schema / JSON per instruction × reasoning as configured / off) × 10 cases × 3 repetitions = 120 calls,
// plus 3–4 preflight calls and at most one repair call per invalid answer (the first run of 27.09. used three modes and
// could not separate format from reasoning, docs/P0_BERICHT.md §2).
// Output: p0_out/s0/summary.md (to send back), results.json, decision.json (read by S1 and S2).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { structuredCall, callTokens, chatWithRetry, schemaInstruction } from './lib/structured.mjs';
import { O, B } from './lib/schema.mjs';
import { CASES, s0MockResponder } from './s0_cases.mjs';
import {
    parseArgs, intArg, OUT_ROOT, pool, percentile, mean, round, pct, writeJson, writeText, nowIso, progress, mdTable,
    assertNoSecrets, scrub,
} from './lib/util.mjs';

export const TOOL = 's0_structured';
export const TOOL_VERSION = 1;

const MODE_DEFS = {
    schema_keep: { schema: true, off: false, label: 'json_schema, Reasoning wie konfiguriert' },
    schema_off: { schema: true, off: true, label: 'json_schema, Reasoning aus' },
    plain_keep: { schema: false, off: false, label: 'JSON per Anweisung, Reasoning wie konfiguriert' },
    plain_off: { schema: false, off: true, label: 'JSON per Anweisung, Reasoning aus' },
};

/**
 * Which modes run, given what the preflight found. With json_schema and a lower reasoning value both available, all four
 * combinations run (format × reasoning): the first P0 run left out plain_keep, so its format comparison was confounded
 * with reasoning and the combination it chose (plain + reasoning as configured) was not measured at all
 * (docs/P0_BERICHT.md §2).
 */
export function chooseModes({ schemaOk, offValue }) {
    if (schemaOk && offValue) return ['schema_keep', 'schema_off', 'plain_keep', 'plain_off'];
    if (schemaOk) return ['schema_keep', 'plain_keep'];
    if (offValue) return ['plain_keep', 'plain_off'];
    return ['plain_keep'];
}

const s = (ms) => (ms === null || ms === undefined ? null : round(ms / 1000, 1));

/** Aggregate one mode's call records. */
export function modeStats(records) {
    const run = records.filter((r) => !r.skipped);
    const answered = run.filter((r) => r.ok);
    const lat = answered.map((r) => r.attempts[0]?.ms).filter(Number.isFinite);
    const tok = answered.map((r) => r.tokens);
    const reported = tok.filter((t) => t.reported);
    const reasoningTok = reported.map((t) => t.reasoning);
    const byRole = {};
    for (const role of ['interpreter', 'extractor', 'board']) {
        const rr = answered.filter((r) => r.role === role);
        byRole[role] = {
            answered: rr.length,
            valid_first_pct: pct(rr.filter((r) => r.valid_first).length, rr.length),
            p50_s: s(percentile(rr.map((r) => r.attempts[0]?.ms), 50)),
        };
    }
    return {
        planned: records.length,
        run: run.length,
        skipped: records.length - run.length,
        errors: run.length - answered.length,
        error_pct: pct(run.length - answered.length, run.length),
        answered: answered.length,
        valid_first: answered.filter((r) => r.valid_first).length,
        valid_first_pct: pct(answered.filter((r) => r.valid_first).length, answered.length),
        raw_json_pct: pct(answered.filter((r) => r.attempts[0]?.raw_json).length, answered.length),
        valid_final_pct: pct(answered.filter((r) => r.valid_final).length, answered.length),
        repaired: answered.filter((r) => r.repaired).length,
        semantic_pct: pct(answered.filter((r) => r.semantic_ok).length, answered.length),
        truncated: answered.filter((r) => r.attempts[0]?.finish === 'length').length,
        p50_s: s(percentile(lat, 50)),
        p90_s: s(percentile(lat, 90)),
        mean_s: s(mean(lat)),
        tokens_reported: reported.length,
        prompt_tok: round(mean(reported.map((t) => t.prompt)), 0),
        completion_tok: round(mean(reported.map((t) => t.completion)), 0),
        reasoning_tok: reasoningTok.some((x) => x > 0) ? round(mean(reasoningTok), 0) : null,
        reasoning_chars: round(mean(answered.map((r) => r.attempts[0]?.reasoning_chars ?? 0)), 0),
        by_role: byRole,
    };
}

/**
 * The S0 decision (plan §4.3: json_schema only if S0 shows the provider keeps it), in two steps that each compare
 * like with like:
 *   1. format: json_schema against JSON per instruction at the SAME reasoning level (configured, else off). json_schema
 *      wins when it errs in ≤ 5 % of the calls, is valid on the first try in ≥ 95 %, and is not worse than plain JSON
 *      (≤ 2 points less valid, ≤ 5 points less often right).
 *   2. reasoning: within the chosen format, off against configured. Off wins when it answers as reliably and is clearly
 *      faster or thinks clearly less.
 * A step without both of its modes is reported as not measured, never as a result: "not run in this run" is not
 * "rejected by the provider" (the plain_keep run of 27.09. said so), and a combination that was not measured is named
 * as such (the first run of 27.09. chose plain + configured reasoning and showed the numbers of plain_off).
 * @returns {{structured_mode: 'json_schema'|'plain', reasoning: string|null, chosen_mode: string, chosen_measured: boolean, notes: string[]}}
 */
export function decide(stats, { offValue, schemaOk }) {
    const notes = [];
    const has = (m) => !!stats[m];

    // 1) format, at one reasoning level on both sides
    let structured = 'plain';
    if (!schemaOk) {
        notes.push('Strukturierter Modus: JSON per Anweisung (Modus C). json_schema wurde in der Vorabprüfung vom Provider abgelehnt.');
    } else if (!has('schema_keep') && !has('schema_off')) {
        notes.push('Strukturierter Modus: JSON per Anweisung (Modus C). json_schema wurde in diesem Lauf nicht gemessen (Vorabprüfung: angenommen); ein Vergleich braucht --modes schema_keep,plain_keep.');
    } else {
        const level = has('schema_keep') && has('plain_keep') ? 'keep' : has('schema_off') && has('plain_off') ? 'off' : null;
        const schemaMode = level ? `schema_${level}` : has('schema_keep') ? 'schema_keep' : 'schema_off';
        const plainMode = level ? `plain_${level}` : has('plain_keep') ? 'plain_keep' : has('plain_off') ? 'plain_off' : null;
        const a = stats[schemaMode];
        const b = plainMode ? stats[plainMode] : null;
        const keeps = (a.error_pct ?? 100) <= 5 && (a.valid_first_pct ?? 0) >= 95;
        const notWorse = !b || ((a.valid_first_pct ?? 0) >= (b.valid_first_pct ?? 0) - 2 && (a.semantic_pct ?? 0) >= (b.semantic_pct ?? 0) - 5);
        const numbers = `${schemaMode}: Fehler ${a.error_pct} %, gültig im 1. Versuch ${a.valid_first_pct} %, inhaltlich richtig ${a.semantic_pct} %${b ? `; ${plainMode}: gültig ${b.valid_first_pct} %, richtig ${b.semantic_pct} %` : ''}`;
        if (keeps && notWorse) {
            structured = 'json_schema';
            notes.push(`Strukturierter Modus: json_schema (${numbers}).`);
        } else {
            notes.push(`Strukturierter Modus: JSON per Anweisung (Modus C). ${numbers}.`);
        }
        if (!level && b) notes.push(`Hinweis: ${schemaMode} und ${plainMode} liefen mit unterschiedlichem Reasoning: Der Formatvergleich ist mit dem Reasoning vermischt (konfundiert) und nur ein Richtwert.`);
        const loose = ['schema_keep', 'schema_off'].filter(has).find((m) => stats[m].raw_json_pct >= 95 && (stats[m].valid_first_pct ?? 100) < 95);
        if (loose) notes.push(`Hinweis: json_schema wurde angenommen und lieferte reines JSON (${loose}: ${stats[loose].raw_json_pct} %), aber nur ${stats[loose].valid_first_pct} % passten beim ersten Versuch zum Schema: Der Provider nimmt den Parameter an, erzwingt das Schema aber nicht. Maßgeblich bleibt der lokale Validator.`);
    }
    for (const f of ['schema', 'plain']) {
        const k = stats[`${f}_keep`];
        const o = stats[`${f}_off`];
        if (offValue && k && o && o.reasoning_chars > 2 * Math.max(k.reasoning_chars, 50)) {
            notes.push(`Hinweis: reasoning_effort ${offValue} erzeugte mehr Reasoning-Text als die Einstellung (${f}_off ${o.reasoning_chars} statt ${k.reasoning_chars} Zeichen je Antwort${o.truncated ? `, ${o.truncated} abgeschnitten` : ''}): Der Wert wirkt bei diesem Provider nicht als „aus“.`);
        }
    }

    // 2) reasoning, within the chosen format
    const fmt = structured === 'json_schema' ? 'schema' : 'plain';
    let reasoning = null;
    if (!offValue) {
        notes.push('Reasoning bleibt wie konfiguriert: Der Provider nahm keinen niedrigeren reasoning_effort an (oder --reasoning-off skip).');
    } else if (has(`${fmt}_keep`) && has(`${fmt}_off`)) {
        const k = stats[`${fmt}_keep`];
        const o = stats[`${fmt}_off`];
        const reliable = o.answered > 0 && (o.error_pct ?? 100) <= (k.error_pct ?? 0) + 5
            && (o.valid_first_pct ?? 0) >= (k.valid_first_pct ?? 0) - 5 && (o.semantic_pct ?? 0) >= (k.semantic_pct ?? 0) - 5;
        const faster = o.p50_s !== null && k.p50_s !== null && k.p50_s > 0 && o.p50_s <= 0.85 * k.p50_s;
        const thinksLess = (k.reasoning_tok ?? 0) > 0 && (o.reasoning_tok ?? 0) <= 0.5 * k.reasoning_tok;
        const thinksLessChars = k.reasoning_chars > 200 && o.reasoning_chars <= 0.5 * k.reasoning_chars;
        if (reliable && (faster || thinksLess || thinksLessChars)) {
            reasoning = offValue;
            notes.push(`Reasoning aus (reasoning_effort: ${offValue}): p50 ${o.p50_s} s statt ${k.p50_s} s, gültig ${o.valid_first_pct} % statt ${k.valid_first_pct} %, inhaltlich richtig ${o.semantic_pct} % statt ${k.semantic_pct} %.`);
        } else if (!reliable) {
            notes.push(`Reasoning bleibt wie konfiguriert: Mit ${offValue} war die Antwort weniger zuverlässig (${fmt}_off: Fehler ${o.error_pct} %, gültig ${o.valid_first_pct} %, richtig ${o.semantic_pct} %; ${fmt}_keep: gültig ${k.valid_first_pct} %, richtig ${k.semantic_pct} %).`);
        } else {
            notes.push(`Reasoning bleibt wie konfiguriert: ${offValue} bringt keinen messbaren Vorteil (p50 ${o.p50_s} s statt ${k.p50_s} s).`);
        }
    } else {
        notes.push(`Reasoning bleibt wie konfiguriert, ohne Beleg: Für ${fmt === 'schema' ? 'json_schema' : 'JSON per Anweisung'} lief in diesem Lauf nicht beides (${fmt}_keep und ${fmt}_off).`);
    }
    const chosen = `${fmt}_${reasoning ? 'off' : 'keep'}`;
    const measured = has(chosen);
    if (!measured) notes.push(`Die gewählte Kombination ${chosen} wurde in diesem Lauf NICHT gemessen. Vor S1/S2 nachmessen: node tools/p0/s0_structured.mjs --modes ${chosen}`);
    return { structured_mode: structured, reasoning, chosen_mode: chosen, chosen_measured: measured, notes };
}

function casesFrom(arg) {
    if (!arg || arg === true) return CASES;
    const ids = String(arg).split(',').map((x) => x.trim()).filter(Boolean);
    const unknown = ids.filter((id) => !CASES.some((c) => c.id === id));
    if (unknown.length) throw new Error(`unbekannte Fälle: ${unknown.join(', ')} (vorhanden: ${CASES.map((c) => c.id).join(', ')})`);
    return CASES.filter((c) => ids.includes(c.id));
}

function summaryMarkdown(run) {
    const L = [];
    const { meta, preflight, stats, decision, modes, records } = run;
    L.push('# P0 / S0 Structured Output: Ergebnis', '');
    L.push(`- Datum: ${meta.finished} · Dauer ${meta.duration_s} s · Werkzeug ${TOOL} v${TOOL_VERSION}`);
    L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model}${meta.provider.profile ? ` · Profil: ${meta.provider.profile}` : ''}`);
    L.push(`- Reasoning laut Einstellung: ${meta.provider.reasoning_effort ?? 'nicht gesetzt'} · Include-Body-Schlüssel: ${(meta.provider.include_body_keys || meta.provider.extra_body_keys || []).join(', ') || 'keine'}`);
    L.push(`- Aufrufe: ${meta.calls_total} (davon ${meta.calls_preflight} Vorab, ${meta.calls_repair} Reparatur) · Wiederholungen je Fall: ${meta.reps} · max_tokens ${meta.max_tokens} · temperature ${meta.temperature}`);
    L.push('', '## Vorab-Prüfung', '');
    L.push(`- Verbindung: ${preflight.ping.ok ? `ok (${s(preflight.ping.ms)} s)` : `FEHLER ${preflight.ping.error}`}`);
    for (const p of preflight.reasoning) L.push(`- Reasoning-Override \`${p.value}\`: ${p.ok ? `angenommen (${s(p.ms)} s)` : `abgelehnt: ${p.error}`}`);
    if (!preflight.reasoning.length) L.push('- Reasoning-Override: nicht geprüft (--reasoning-off skip)');
    L.push(`- json_schema: ${preflight.schema.ok ? `angenommen (${s(preflight.schema.ms)} s, Antwort ${preflight.schema.valid ? 'gültig' : 'ungültig'})` : `abgelehnt: ${preflight.schema.error}`}`);
    L.push('', '## Modi', '');
    L.push(mdTable(
        ['Modus', 'Aufrufe', 'Fehler', 'gültig 1. Versuch', 'reines JSON', 'gültig nach Reparatur', 'inhaltlich richtig', 'p50 s', 'p90 s', 'Prompt-Tok.', 'Output-Tok.', 'Reasoning-Tok.', 'Reasoning-Zeichen', 'abgeschnitten'],
        modes.map((m) => {
            const x = stats[m];
            return [`${m} (${MODE_DEFS[m].label})`, `${x.run}${x.skipped ? ` (+${x.skipped} übersprungen)` : ''}`, `${x.errors}`, `${x.valid_first}/${x.answered} (${x.valid_first_pct ?? '–'} %)`, `${x.raw_json_pct ?? '–'} %`, `${x.valid_final_pct ?? '–'} %`, `${x.semantic_pct ?? '–'} %`, x.p50_s, x.p90_s, x.prompt_tok, x.completion_tok, x.reasoning_tok, x.reasoning_chars, x.truncated];
        }),
    ));
    L.push('', '### Nach Rolle: gültig im 1. Versuch · p50', '');
    L.push(mdTable(['Modus', 'Interpreter', 'Recovery-Extraktor', 'Board-Generator'], modes.map((m) => {
        const r = stats[m].by_role;
        return [m, ...['interpreter', 'extractor', 'board'].map((k) => (r[k].answered ? `${r[k].valid_first_pct} % · ${r[k].p50_s} s` : '–'))];
    })));
    L.push('', '### Fälle: gültig (1. Versuch) · inhaltlich richtig · p50', '');
    const caseIds = [...new Set(records.map((r) => r.case))];
    L.push(mdTable(['Fall', ...modes], caseIds.map((id) => [id, ...modes.map((m) => {
        const rr = records.filter((r) => r.case === id && r.mode === m && !r.skipped);
        const ok = rr.filter((r) => r.ok);
        if (!rr.length) return '–';
        return `${ok.filter((r) => r.valid_first).length}/${rr.length} · ${ok.filter((r) => r.semantic_ok).length}/${rr.length} · ${s(percentile(ok.map((r) => r.attempts[0]?.ms), 50)) ?? '–'} s`;
    })])));
    L.push('', '## Entscheidung', '');
    L.push(`- **Strukturierter Modus: ${decision.structured_mode === 'json_schema' ? 'json_schema' : 'JSON per Anweisung (Modus C)'}**`);
    L.push(`- **Reasoning für Interpreter, Recovery und Generator: ${decision.reasoning ? `aus (reasoning_effort: ${decision.reasoning})` : 'wie konfiguriert'}**`);
    const cm = stats[decision.chosen_mode];
    if (cm) L.push(`- Gewählter Modus \`${decision.chosen_mode}\`: Interpreter-Fälle p50 ${cm.by_role.interpreter.p50_s ?? '–'} s (Gate „p50 ≤ 6 s“ prüft S1 mit dem echten Interpreter-Prompt), Tokens je Aufruf ≈ ${cm.prompt_tok ?? '?'} Prompt + ${cm.completion_tok ?? '?'} Output.`);
    else L.push(`- Gewählter Modus \`${decision.chosen_mode}\`: **in diesem Lauf nicht gemessen** (keine Zahlen; siehe Hinweis unten).`);
    for (const n of decision.notes) L.push(`- ${n}`);
    L.push(run.outIsDefault
        ? '- S1 und S2 übernehmen diese Wahl aus `p0_out/s0/decision.json` (überschreibbar mit `--mode` und `--reasoning`).'
        : `- Diese Entscheidung steht in \`${run.outName}/decision.json\`. S1 und S2 lesen \`p0_out/s0/decision.json\`, nicht diese Datei; für S1/S2 gilt \`--mode\` und \`--reasoning\` auf der Kommandozeile.`);
    const problems = records.filter((r) => !r.skipped && (!r.ok || !r.valid_first || !r.semantic_ok));
    if (problems.length) {
        L.push('', '## Auffälligkeiten (höchstens 25)', '');
        for (const r of problems.slice(0, 25)) {
            const why = !r.ok ? `Fehler: ${r.error}` : !r.valid_first ? `ungültig: ${(r.errors_first || []).slice(0, 2).join('; ')}${r.valid_final ? ' → nach Reparatur gültig' : ''}` : `inhaltlich: ${r.semantic_note}`;
            L.push(`- ${r.mode} · ${r.case} #${r.rep}: ${why}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const started = Date.now();
    const cases = casesFrom(a.cases);
    const reps = intArg(a.reps, 3);
    const concurrency = intArg(a.concurrency, 2);
    const maxTokens = intArg(a['max-tokens'], 2000);
    const temperature = a.temperature !== undefined ? Number(a.temperature) : 0.2;
    const timeoutMs = intArg(a.timeout, 180) * 1000;
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, 's0');
    const offArg = a['reasoning-off'] === undefined || a['reasoning-off'] === true ? 'auto' : String(a['reasoning-off']);
    const offCandidates = offArg === 'skip' ? [] : offArg === 'auto' ? ['none', 'minimal'] : [offArg];
    const log = deps.log ?? ((t) => console.log(t));
    const note = deps.progress ?? progress;

    if (a['dry-run']) {
        const requests = [];
        for (const c of cases) {
            for (const mode of ['schema_keep', 'plain_keep']) {
                const def = MODE_DEFS[mode];
                requests.push({
                    case: c.id, mode, role: c.role,
                    messages: [{ role: 'system', content: def.schema ? c.system : `${c.system}\n\n${schemaInstruction(c.schema)}` }, { role: 'user', content: c.user }],
                    json_schema: def.schema ? { name: `s0_${c.id}`, strict: true, schema: c.schema } : null,
                    prompt_chars: c.system.length + c.user.length + (def.schema ? 0 : JSON.stringify(c.schema).length),
                });
            }
        }
        writeJson(path.join(outDir, 'requests.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), note: 'dry run: no call was made', requests });
        log(`S0 Probelauf: ${cases.length} Fälle × 3 Modi × ${reps} Wiederholungen = ${cases.length * 3 * reps} Aufrufe geplant (+ 3–4 Vorab-Aufrufe, + höchstens 1 Reparatur je ungültiger Antwort).`);
        log(`Anfragen zum Ansehen: ${path.join(outDir, 'requests.json')}`);
        return 0;
    }

    let provider;
    try {
        provider = deps.provider ?? await openProvider({
            backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs,
            mock: a.backend === 'mock' ? s0MockResponder() : undefined,
        });
    } catch (err) {
        log(`FEHLER: ${err.message}`);
        return 1;
    }
    const secrets = provider.secrets || [];
    const d = provider.describe();
    log(`S0 Structured Output · Backend ${d.backend} · Modell ${d.model} · Reasoning laut Einstellung: ${d.reasoning_effort ?? 'nicht gesetzt'}`);

    // ---------------------------------------------------------------- preflight
    let calls = 0;
    const tiny = (extra) => ({ messages: [{ role: 'system', content: 'You answer with JSON only.' }, { role: 'user', content: 'Reply with the JSON object {"ok": true}.' }], maxTokens, temperature: 0, timeoutMs, ...extra });
    const ping = await chatWithRetry(provider, tiny({}), deps.retry);
    calls += 1;
    const preflight = { ping: { ok: ping.ok, ms: ping.ms, error: ping.ok ? null : scrub(ping.error, secrets) }, reasoning: [], schema: {} };
    if (!ping.ok) {
        log(`FEHLER: Der erste Testaufruf scheiterte (${ping.status}): ${scrub(ping.error, secrets)}`);
        return 1;
    }
    note(`Vorab: Verbindung ok (${s(ping.ms)} s)`);
    let offValue = null;
    for (const v of offCandidates) {
        const r = await chatWithRetry(provider, tiny({ reasoning: v }), deps.retry);
        calls += 1;
        preflight.reasoning.push({ value: v, ok: r.ok, ms: r.ms, error: r.ok ? null : scrub(r.error, secrets), override: r.override ?? null });
        note(`Vorab: reasoning_effort ${v} → ${r.ok ? 'angenommen' : `abgelehnt (${scrub(r.error, secrets)})`}`);
        if (r.ok && !(r.override && r.override.skipped)) { offValue = v; break; }
        if (r.ok && r.override && r.override.skipped) { preflight.reasoning[preflight.reasoning.length - 1].error = r.override.skipped; break; }
    }
    const probe = await structuredCall(provider, { name: 's0_probe', schema: O({ ok: B() }), system: 'You answer with JSON only.', user: 'Reply with the JSON object {"ok": true}.', mode: 'json_schema', reasoning: offValue ?? undefined, maxTokens, temperature: 0, timeoutMs, repair: false, ...deps.retry });
    calls += 1;
    preflight.schema = { ok: probe.ok, ms: probe.attempts[0]?.ms ?? null, valid: probe.valid_first, error: probe.ok ? null : scrub(probe.error, secrets) };
    note(`Vorab: json_schema → ${probe.ok ? `angenommen, Antwort ${probe.valid_first ? 'gültig' : 'ungültig'}` : `abgelehnt (${preflight.schema.error})`}`);
    const schemaOk = probe.ok;
    const calls_preflight = calls;

    // ---------------------------------------------------------------- main run
    const modes = (a.modes ? String(a.modes).split(',').map((m) => m.trim()).filter((m) => MODE_DEFS[m]) : chooseModes({ schemaOk, offValue }))
        .filter((m) => (!MODE_DEFS[m].schema || schemaOk) && (!MODE_DEFS[m].off || offValue));
    const total = cases.length * modes.length * reps;
    log(`Plan: ${modes.length} Modi (${modes.join(', ')}) × ${cases.length} Fälle × ${reps} Wiederholungen = ${total} Aufrufe, ${concurrency} gleichzeitig.`);
    const state = Object.fromEntries(modes.map((m) => [m, { errors: 0, answered: 0, aborted: null }]));
    const tasks = [];
    for (let rep = 1; rep <= reps; rep++) {
        for (const c of cases) {
            for (const mode of modes) {
                tasks.push(async () => {
                    const st = state[mode];
                    const rec = { case: c.id, role: c.role, mode, rep };
                    if (st.aborted) return { ...rec, skipped: true, error: `Modus abgebrochen: ${st.aborted}` };
                    const def = MODE_DEFS[mode];
                    const r = await structuredCall(provider, {
                        name: `s0_${c.id}`, schema: c.schema, system: c.system, user: c.user, mode: def.schema ? 'json_schema' : 'plain',
                        reasoning: def.off ? offValue : undefined, maxTokens, temperature, timeoutMs, ...deps.retry,
                    });
                    calls += r.attempts.length;
                    if (r.ok) st.answered += 1; else st.errors += 1;
                    if (!st.aborted && st.errors >= 3 && st.answered === 0) st.aborted = scrub(r.error, secrets);
                    const sem = r.valid_final ? c.check(r.value) : { ok: false, note: 'no valid answer' };
                    const out = {
                        ...rec, ok: r.ok, error: r.ok ? null : scrub(r.error, secrets), valid_first: r.valid_first, valid_final: r.valid_final,
                        repaired: r.repaired, errors_first: r.errors_first, semantic_ok: !!sem.ok, semantic_note: sem.note ?? null,
                        attempts: r.attempts.map((x) => ({ ...x, error: x.error ? scrub(x.error, secrets) : undefined })), tokens: callTokens(r),
                        answer: r.ok ? String(r.content).slice(0, 2500) : null,
                        answer_first: r.repaired ? String(r.content_first).slice(0, 1500) : undefined,
                    };
                    const done = ++state.__done;
                    note(`[${done}/${total}] ${mode} · ${c.id} #${rep}: ${!r.ok ? `Fehler (${out.error})` : `${r.valid_first ? 'gültig' : r.valid_final ? 'repariert' : 'ungültig'}, ${sem.ok ? 'richtig' : `inhaltlich: ${sem.note}`}, ${s(r.attempts[0]?.ms)} s`}`);
                    return out;
                });
            }
        }
    }
    state.__done = 0;
    const records = await pool(tasks, concurrency);
    const stats = Object.fromEntries(modes.map((m) => [m, modeStats(records.filter((r) => r.mode === m))]));
    const decision = decide(stats, { offValue, schemaOk });
    const meta = {
        tool: TOOL, version: TOOL_VERSION, started: new Date(started).toISOString(), finished: nowIso(), duration_s: round((Date.now() - started) / 1000, 0),
        node: process.version, provider: d, reps, concurrency, max_tokens: maxTokens, temperature, cases: cases.map((c) => c.id), modes,
        calls_total: calls, calls_preflight, calls_repair: records.reduce((n, r) => n + (r.repaired ? 1 : 0), 0),
    };
    const run = { meta, preflight, modes, stats, decision, records };
    const summary = summaryMarkdown({ ...run, outIsDefault: path.resolve(outDir) === path.resolve(OUT_ROOT, 's0'), outName: path.relative(path.dirname(OUT_ROOT), outDir) || outDir });
    const decisionFile = {
        tool: TOOL, version: TOOL_VERSION, created: meta.finished, backend: d.backend, model: d.model,
        structured_mode: decision.structured_mode, reasoning: decision.reasoning, chosen_mode: decision.chosen_mode, chosen_measured: decision.chosen_measured,
        evidence: { schema_accepted: schemaOk, reasoning_off_value: offValue, stats: Object.fromEntries(modes.map((m) => [m, { ...stats[m], by_role: undefined }])) },
        notes: decision.notes,
    };
    for (const text of [JSON.stringify(run), summary, JSON.stringify(decisionFile)]) assertNoSecrets(text, secrets);
    writeJson(path.join(outDir, 'results.json'), run);
    writeJson(path.join(outDir, 'decision.json'), decisionFile);
    writeText(path.join(outDir, 'summary.md'), summary);
    log('');
    log(summary);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')} (zum Zurückschicken), results.json, decision.json`);
    return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.message}`); process.exit(1); });
}
