// P0 / S4b: can a semantic stage read free RPG input like a good GM while the engine stays the only authority?
// Design, labelling rules, gate and pre-set criteria: docs/P0_S4B.md. Corpus: tests/eval/s4b_cases.jsonl (91 cases,
// K0–K8), scenes: tests/eval/s4b_scenes.json. S4b scores the reading of the message (a plan of intents), never whether an
// action works; that is the engine's.
//
// Arms (--arm):
//   a0         Avereth today, deterministic (readTurn → parseIntent, unchanged), plus the fast-path gate. No model call.
//   p1         specialised intent planner, plan as JSON text, with RECENT (the last narration)
//   p1_nohist  the same without RECENT (does the planner need the narrative history?)
//   fc         the same information as p1, the plan submitted through one typed tool (plan_turn, tool_choice auto)
//   fc_gm      fc with the Narrator contract and a GM step instead of the planner role (C2 in its real shape)
// Every LLM run also scores A0 and the cascade A0 → arm (A0 decides where the gate lets it, the arm everywhere else)
// for free. The JSON arm and the tool arms get the same system text up to the last line, the same user message, the
// same validator and the same error lines in their one repair; the agency guard and the scoring are the same.
//
//   node tools/p0/s4b_intent.mjs --arm a0
//   node tools/p0/s4b_intent.mjs --arm p1 --concurrency 1
//   node tools/p0/s4b_intent.mjs --arm p1 --tags stab --reps 3 --out p0_out/s4b_p1_stab --concurrency 1
//   node tools/p0/s4b_intent.mjs --report p0_out/s4b_p1/results.json p0_out/s4b_fc/results.json [...]
// Options: --cases id,id  --tags tag  --cat K1,K3  --limit N  --reps N  --temperature 0.1  --max-tokens 2500
//          --reasoning <value>|keep  --concurrency 1  --backend st|direct|mock  --st-url <url>  --profile "<name>"
//          --out <dir> (default p0_out/s4b_<arm>)  --dry-run
// Output: summary.md (to send back), results.json. No key, header or endpoint URL is written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { openProvider } from './lib/provider.mjs';
import { chatWithRetry } from './lib/structured.mjs';
import { signTestP, fmtP } from './lib/score.mjs';
import * as S from './lib/s4b.mjs';
import {
    ENGINE_ROOT, OUT_ROOT, parseArgs, intArg, pool, percentile, mean, round, pct, readJson, writeJson, writeText,
    nowIso, progress, mdTable, assertNoSecrets, scrub, estimateTokens,
} from './lib/util.mjs';

export const TOOL = 's4b_intent';
export const TOOL_VERSION = 1;
export const ARMS = {
    a0: { llm: false, history: false, label: 'A0 (heute, deterministisch)' },
    p1: { llm: true, tool: false, gm: false, history: true, label: 'P1 Planer, JSON' },
    p1_nohist: { llm: true, tool: false, gm: false, history: false, label: 'P1 ohne RECENT' },
    fc: { llm: true, tool: true, gm: false, history: true, label: 'FC Planer, Tool' },
    fc_gm: { llm: true, tool: true, gm: true, history: true, label: 'FC mit Erzählervertrag' },
};
const CONTRACT_FILE = path.join(ENGINE_ROOT, 'content', 'narrator', 'Avereth_Narrator_Contract_v4.txt');
const CATS = { K0: 'exakt (Kontrolle)', K1: 'Skill-Aliase, Tippfehler', K2: 'freie Zielreferenzen', K3: 'Fähigkeit auf die Welt', K4: 'Kampf + Welt', K5: 'Suche / Reise / Kampf', K6: 'echt mehrdeutig', K7: 'unbekannt / unmöglich', K8: 'keine Handlung' };
const PROBLEM_CLASS = new Set(['K1', 'K2', 'K3', 'K4', 'K5', 'K7']);
const OUTCOME_DE = { correct: 'richtig', wrong_commit: 'FALSCHE FESTLEGUNG', missed: 'verpasst', unneeded_clarify: 'unnötige Rückfrage', goal_mismatch: 'Ziel weicht ab' };

// ------------------------------------------------------------------------------------------------ calls
function attemptInfo(r) {
    return { ok: r.ok, ms: r.ms ?? null, usage: r.usage ?? null, finish: r.finish ?? null, tool_calls: (r.tool_calls || []).length, transport_retries: r.transport_retries ?? 0, ...(r.ok ? {} : { error: r.error }) };
}

const repairLine = (errors) => `That plan was not valid:\n- ${errors.join('\n- ')}\nAnswer again with only the corrected JSON object.`;

/** The JSON arm: answer text → plan; one repair with the typed error lines. */
export async function jsonPlan(provider, { system, user, cat, common, retry }) {
    const check = (text) => {
        const { value, error } = S.readPlanText(text);
        return value ? S.validatePlan(value, cat) : { intents: null, errors: [`no JSON object in the answer (${error})`] };
    };
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const r1 = await chatWithRetry(provider, { ...common, messages }, retry);
    const attempts = [attemptInfo(r1)];
    if (!r1.ok) return { ok: false, error: r1.error, attempts, intents: null, valid_first: false, valid_final: false, repaired: false, errors_first: [], errors_final: [] };
    const v1 = check(r1.content);
    if (v1.intents) return { ok: true, attempts, intents: v1.intents, valid_first: true, valid_final: true, repaired: false, errors_first: [], errors_final: [], content: r1.content };
    const r2 = await chatWithRetry(provider, {
        ...common,
        messages: [...messages, { role: 'assistant', content: String(r1.content || '').slice(0, 2000) || '(empty answer)' }, { role: 'user', content: repairLine(v1.errors) }],
    }, retry);
    attempts.push(attemptInfo(r2));
    if (!r2.ok) return { ok: true, attempts, intents: null, valid_first: false, valid_final: false, repaired: true, errors_first: v1.errors, errors_final: v1.errors, content: r1.content, error: r2.error };
    const v2 = check(r2.content);
    return { ok: true, attempts, intents: v2.intents, valid_first: false, valid_final: !!v2.intents, repaired: true, errors_first: v1.errors, errors_final: v2.errors, content: r2.content };
}

/**
 * The tool arms: the plan as the arguments of one plan_turn call (tool_choice auto). The one repair carries the same
 * error lines as the JSON arm: as the tool's result when the model called it, as a user line when it did not call it.
 */
export async function toolPlan(provider, { system, user, cat, common, retry, tools = S.planTool() }) {
    const pick = (r) => (r.tool_calls || []).filter((t) => t && t.name === 'plan_turn');
    const check = (call) => {
        if (!call) return { intents: null, errors: ['no plan_turn call'] };
        const { value, error } = S.readPlanText(call.arguments);
        return value ? S.validatePlan(value, cat) : { intents: null, errors: [`the arguments of plan_turn are not a JSON object (${error})`] };
    };
    const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
    const r1 = await chatWithRetry(provider, { ...common, messages, tools, toolChoice: 'auto' }, retry);
    const attempts = [attemptInfo(r1)];
    if (!r1.ok) return { ok: false, error: r1.error, attempts, intents: null, valid_first: false, valid_final: false, repaired: false, errors_first: [], errors_final: [], tool_called_first: false };
    const c1 = pick(r1);
    const v1 = check(c1[0]);
    const base = { ok: true, attempts, tool_called_first: c1.length > 0, tool_calls_first: c1.length };
    if (v1.intents) return { ...base, intents: v1.intents, valid_first: true, valid_final: true, repaired: false, errors_first: [], errors_final: [], content: r1.content || '' };
    const args = (c) => (typeof c.arguments === 'string' ? c.arguments : JSON.stringify(c.arguments ?? {}));
    const follow = c1.length
        ? [
            { role: 'assistant', content: r1.content || '', tool_calls: [{ id: c1[0].id || 'call_1', type: 'function', function: { name: 'plan_turn', arguments: args(c1[0]) } }] },
            { role: 'tool', tool_call_id: c1[0].id || 'call_1', content: JSON.stringify({ ok: false, errors: v1.errors, message: 'That plan was not valid. Call plan_turn again with the corrected plan.' }) },
        ]
        : [
            { role: 'assistant', content: String(r1.content || '').slice(0, 2000) || '(empty answer)' },
            { role: 'user', content: 'Submit the plan by calling plan_turn once (an empty intents list when he takes no engine action).' },
        ];
    const r2 = await chatWithRetry(provider, { ...common, messages: [...messages, ...follow], tools, toolChoice: 'auto' }, retry);
    attempts.push(attemptInfo(r2));
    if (!r2.ok) return { ...base, intents: null, valid_first: false, valid_final: false, repaired: true, errors_first: v1.errors, errors_final: v1.errors, content: r1.content || '', error: r2.error };
    const v2 = check(pick(r2)[0]);
    return { ...base, intents: v2.intents, valid_first: false, valid_final: !!v2.intents, repaired: true, errors_first: v1.errors, errors_final: v2.errors, content: r2.content || JSON.stringify(pick(r2)[0]?.arguments ?? null) };
}

function callTokens(attempts) {
    const t = { prompt: 0, completion: 0, reported: false };
    for (const a of attempts) {
        if (!a.usage) continue;
        t.reported = true;
        t.prompt += a.usage.prompt_tokens ?? 0;
        t.completion += a.usage.completion_tokens ?? 0;
    }
    return t;
}

// ------------------------------------------------------------------------------------------------ mock
/** Mock answers for tests and --backend mock: the first accepted plan of each case (JSON text or a plan_turn call). */
export function s4bMockResponder(cases, scenes, { wrong = [], noQuoteFirst = [], noToolFirst = [] } = {}) {
    const byUser = new Map();
    for (const c of cases) for (const history of [true, false]) byUser.set(S.plannerUser(scenes[c.scene].catalog, c.text, { history }), c);
    return async (req) => {
        const users = req.messages.filter((m) => m.role === 'user');
        const c = byUser.get(users[0]?.content);
        if (!c) return { content: '{"intents": []}' };
        const cat = scenes[c.scene].catalog;
        let plan = S.goldPlan(c);
        if (wrong.includes(c.id)) {
            // the classic wrong commit: the first attack skill on the first opponent (or person)
            const target = cat.opponents[0]?.id ?? cat.others[0]?.id ?? null;
            plan = { intents: [{ kind: 'attack', skill: cat.skills.find((s) => s.attack)?.id, target, quote: c.text }] };
        }
        const first = req.messages.length === 2;
        if (first && noQuoteFirst.includes(c.id)) plan = { intents: plan.intents.map(({ quote, ...x }) => x) };
        if (req.tools) {
            if (first && noToolFirst.includes(c.id)) return { content: 'Alaric acts.' };
            return { content: '', tool_calls: [{ id: 'call_1', name: 'plan_turn', arguments: JSON.stringify(plan) }] };
        }
        return { content: JSON.stringify(plan) };
    };
}

// ------------------------------------------------------------------------------------------------ evaluation
/** A0, gate and A0's own classification of every case: deterministic, the same in every run. */
export function evaluateA0(cases, scenes, content) {
    return new Map(cases.map((k) => {
        const sc = scenes[k.scene];
        const a0 = S.a0Plan(k.text, sc.state, content);
        const g = S.gate(k.text, a0, sc.state, content);
        return [k.id, { plan: a0.plan, kind: a0.kind, route: a0.route, delegated: a0.delegated, gate: g, outcome: S.classify(k, a0.plan, sc.catalog, { history: true }) }];
    }));
}

const rowsOf = (records, cases, pickPlanOutcome) => {
    const byId = new Map(cases.map((k) => [k.id, k]));
    return records.map((r) => ({ kase: byId.get(r.id), outcome: pickPlanOutcome(r) }));
};

/** Stability over k runs of the same cases: all correct (pass^k), never a wrong commit (safe^k), the same plan. */
export function stability(records) {
    const by = new Map();
    for (const r of records) by.set(r.id, [...(by.get(r.id) || []), r]);
    const groups = [...by.values()].filter((g) => g.length > 1);
    if (!groups.length) return null;
    const k = Math.min(...groups.map((g) => g.length));
    const all = (g, f) => g.every(f);
    return {
        cases: groups.length,
        k,
        pass_k: groups.filter((g) => all(g, (r) => r.outcome.outcome === 'correct')).length,
        safe_k: groups.filter((g) => all(g, (r) => r.outcome.outcome !== 'wrong_commit')).length,
        same_plan: groups.filter((g) => new Set(g.map((r) => S.planKey(r.plan))).size === 1).length,
        unstable: groups.filter((g) => new Set(g.map((r) => r.outcome.outcome)).size > 1).map((g) => ({ id: g[0].id, outcomes: g.map((r) => r.outcome.outcome) })),
    };
}

/** The pre-set criteria of docs/P0_S4B.md §7 for one arm (rep 1 rows). */
export function criteria(m, mProblem, mA0Problem, a0TrapWrong) {
    return [
        { id: 'K-S', text: 'stille falsche Festlegungen ≤ 3 von allen Fällen, davon ≤ 1 auf den Fällen, die A0 heute falsch bucht', ok: m.wrong_commit <= 3 && a0TrapWrong <= 1, value: `${m.wrong_commit} gesamt, ${a0TrapWrong} auf A0-Fallen` },
        { id: 'K-V', text: 'Absicht richtig auf der Problemklasse (K1–K5, K7) ≥ 80 % und ≥ A0 + 30 pp', ok: mProblem.accuracy_pct >= 80 && mProblem.accuracy_pct >= (mA0Problem.accuracy_pct ?? 0) + 30, value: `${mProblem.accuracy_pct} % (A0 ${mA0Problem.accuracy_pct} %)` },
        { id: 'K-F', text: 'Rückfrage-Recall ≥ 70 % und unnötige Rückfragen ≤ 15 % der Handlungsfälle', ok: (m.clarify_recall_pct ?? 0) >= 70 && (m.unneeded_clarify_pct ?? 0) <= 15, value: `${m.clarify_recall_pct} % / ${m.unneeded_clarify_pct} %` },
        { id: 'K-N', text: 'falsche Agency auf Negativfällen ≤ 1', ok: m.false_agency <= 1, value: `${m.false_agency} von ${m.negative_cases}` },
    ];
}

// ------------------------------------------------------------------------------------------------ report
const sec = (ms) => (ms === null || ms === undefined ? null : round(ms / 1000, 1));
const mcell = (m, k) => (m ? (m[k] ?? '–') : '–');
const wrongTypes = (m) => (m && m.wrong_commit ? Object.entries(m.wrong_by_type).map(([t, n]) => `${t} ${n}`).join(', ') : '–');

function metricRows(cols) {
    // cols: [{name, m, extra}] → the main table
    const row = (label, f) => [label, ...cols.map((c) => (c.m ? f(c.m, c) : '–'))];
    return [
        row('**Absicht richtig (Ende-zu-Ende)**', (m) => `**${m.accuracy_pct} %** (${m.correct}/${m.cases})`),
        row('**stille falsche Festlegungen**', (m) => `**${m.wrong_commit}** (${m.wrong_commit_pct} %)`),
        row('… nach Art', (m) => wrongTypes(m)),
        row('verpasste Handlung (von Handlungsfällen)', (m) => `${m.missed_action_pct} %`),
        row('unnötige Rückfrage (von reinen Handlungsfällen)', (m) => `${m.unneeded_clarify_pct} %`),
        row('richtige Handlung, Ziel weicht vom Gold-Muster ab', (m) => `${m.goal_mismatch}`),
        row('Rückfrage-Recall (reine Klärungsfälle)', (m) => `${m.clarify_recall_pct} % von ${m.clarify_cases}`),
        row('Rückfrage-Präzision (Antworten, die nur fragen)', (m) => `${m.clarify_precision_pct ?? '–'} % von ${m.clarify_outputs}`),
        row('falsche Agency (Negativfälle)', (m) => `${m.false_agency} von ${m.negative_cases}`),
    ];
}

function summaryMarkdown(run) {
    const { meta, agg, gateM, a0Trap, stab, records, cases, a0Map, crit, lat, tok, valid } = run;
    const L = [];
    const arm = ARMS[meta.arm];
    L.push(`# P0 / S4b Absicht → Plan (Arm ${meta.arm}: ${arm.label}): Ergebnis`, '');
    L.push(`- Datum: ${meta.finished} · Dauer ${meta.duration_s} s · Werkzeug ${TOOL} v${TOOL_VERSION} · Korpus ${meta.corpus_cases} Fälle${meta.cases !== meta.corpus_cases ? `, davon ${meta.cases} ausgewählt` : ''}${meta.reps > 1 ? ` · ${meta.reps} Wiederholungen` : ''}`);
    if (arm.llm) {
        L.push(`- Backend: ${meta.provider.backend} · Modell: ${meta.provider.model}${meta.provider.profile ? ` · Profil: ${meta.provider.profile}` : ''} · temperature ${meta.temperature} · Reasoning ${meta.reasoning ?? 'wie konfiguriert'} · ${meta.concurrency} gleichzeitig`);
        L.push(`- Schnittstelle: ${arm.tool ? 'Tool plan_turn (tool_choice auto)' : 'JSON-Text'} · Kontext: ${arm.gm ? 'Erzählervertrag + GM-Schritt' : 'Planer-Rolle'} · RECENT: ${arm.history ? 'ja' : 'nein'} · Regeln, Beispiele, Katalog, Validator, Reparatur, Guard: wie alle LLM-Arme`);
        L.push(`- Aufrufe: ${meta.calls} (davon ${meta.repairs} Reparatur) · Prompt ≈ ${meta.prompt_tokens_est} Token je Fall (Schätzung)`);
    }
    L.push('', '## Kennzahlen (alle Fälle; eine ungültige Antwort ist ein leerer Plan)', '');
    const cols = arm.llm
        ? [{ name: `${meta.arm} nach Guard`, m: agg.guarded }, { name: `${meta.arm} roh`, m: agg.raw }, { name: `Kaskade A0 → ${meta.arm}`, m: agg.cascade }, { name: 'A0 heute', m: agg.a0 }]
        : [{ name: 'A0 heute', m: agg.a0 }];
    L.push(mdTable(['Kennzahl', ...cols.map((c) => c.name)], metricRows(cols)));
    if (arm.llm) {
        L.push('', mdTable(['Betrieb', 'Wert'], [
            ['gültig im 1. Versuch / nach Reparatur', `${valid.first_pct ?? '–'} % / ${valid.final_pct ?? '–'} %`],
            ['Fehler ohne Antwort (Transport; zählen als leerer Plan)', `${records.filter((r) => r.ok === false).length}`],
            ...(arm.tool ? [['Tool im 1. Versuch aufgerufen', `${valid.tool_first_pct ?? '–'} %`]] : []),
            ['Latenz bis zum gültigen Plan p50 / p90', `${lat.p50_s ?? '–'} / ${lat.p90_s ?? '–'} s`],
            ['Token je Fall (Prompt / Output, alle Versuche)', `${tok.prompt ?? '?'} / ${tok.completion ?? '?'}`],
            ['Fälle, die die Kaskade ohne LLM entscheidet', `${gateM.fast} von ${gateM.fast + (gateM.classes.ESCALATE || 0)} (${gateM.fast_pct} %)`],
        ]));
        L.push('', '### Vorab festgelegte Kriterien (docs/P0_S4B.md §7)', '');
        L.push(mdTable(['', 'Kriterium', 'Wert', 'erfüllt'], crit.map((c) => [c.id, c.text, c.value, c.ok ? 'ja' : 'NEIN'])));
        L.push('', `Ohne die ${cases.filter((k) => k.product).length} Produktentscheidungsfälle: richtig ${agg.noProduct.accuracy_pct} % (${agg.noProduct.correct}/${agg.noProduct.cases}), falsche Festlegungen ${agg.noProduct.wrong_commit}.`);
        const h = run.history;
        L.push('', `Fälle, die RECENT brauchen (${h.cases}): aufgelöst (richtige Handlung) ${h.resolved} · gefragt ${h.asked} · falsch festgelegt ${h.wrong} · sonst ${h.other}${arm.history ? '' : ' (ohne RECENT ist eine Rückfrage hier richtig)'}`);
    }
    L.push('', '## Nach Kategorie', '');
    const cat = arm.llm ? S.byCategory(rowsOf(records.filter((r) => r.rep === 1), cases, (r) => r.outcome)) : null;
    const catA0 = S.byCategory(rowsOf(records.filter((r) => r.rep === 1), cases, (r) => a0Map.get(r.id).outcome));
    const cell = (c) => `${c.correct} / ${c.wrong_commit} / ${c.missed} / ${c.unneeded_clarify}${c.goal_mismatch ? ` (+${c.goal_mismatch} Ziel)` : ''}`;
    L.push(mdTable(['Kategorie', 'Fälle', ...(arm.llm ? [`${meta.arm}: richtig / falsch fest. / verpasst / unnötig gefragt`] : []), 'A0: richtig / falsch fest. / verpasst / unnötig gefragt'], Object.keys(catA0).map((k) => [
        `${k} ${CATS[k] || ''}`, catA0[k].cases,
        ...(arm.llm ? [cell(cat[k])] : []),
        cell(catA0[k]),
    ])));
    L.push('', `## Die Fälle, die A0 heute still falsch bucht (${a0Trap.length})`, '');
    for (const t of a0Trap) L.push(`- **${t.id}** „${t.text}“ · A0: ${t.a0}${arm.llm ? ` · ${meta.arm}: ${OUTCOME_DE[t.arm.outcome]}${t.arm.outcome !== 'correct' ? ` (${t.armPlan})` : ''}` : ''}`);
    L.push('', '## Gate des Schnellpfads (A0 darf ohne LLM entscheiden?)', '');
    L.push(mdTable(['Kennzahl', 'Wert'], [
        ['Klassen', Object.entries(gateM.classes).map(([k, v]) => `${k} ${v}`).join(' · ')],
        ['**unsicher durchgelassen** (A0 nicht richtig, Gate ließ ihn entscheiden)', `**${gateM.unsafe_fast}** (davon falsche Festlegungen: ${gateM.unsafe_fast_commit})`],
        ['A0-Fehlbuchungen, die das Gate zum Planer schickt', `${gateM.a0_wrong_commits_caught}`],
        ['eskaliert, obwohl A0 richtig lag (nur Kosten)', `${gateM.escalated_but_a0_right}`],
    ]));
    for (const u of gateM.unsafe_cases) L.push(`- UNSICHER ${u.id}: ${u.gate} · A0 ${u.a0} · ${u.outcome}`);
    if (stab) {
        L.push('', `## Stabilität (${stab.cases} Fälle × ${stab.k} Läufe)`, '');
        L.push(mdTable(['Kennzahl', 'Wert'], [
            [`pass^${stab.k} (in allen Läufen richtig)`, `${stab.pass_k}/${stab.cases} (${pct(stab.pass_k, stab.cases)} %)`],
            [`safe^${stab.k} (in keinem Lauf eine falsche Festlegung)`, `${stab.safe_k}/${stab.cases}`],
            ['immer derselbe Plan', `${stab.same_plan}/${stab.cases}`],
        ]));
        for (const u of stab.unstable) L.push(`- ${u.id}: ${u.outcomes.map((o) => OUTCOME_DE[o]).join(' · ')}`);
    }
    const shown = records.filter((r) => r.rep === 1);
    const list = (title, f, fmt) => {
        const xs = shown.filter(f);
        if (!xs.length) return;
        L.push('', `## ${title} (${xs.length})`, '');
        for (const r of xs) L.push(fmt(r));
    };
    const plan = (r) => S.planText(arm.llm ? r.plan : a0Map.get(r.id).plan);
    const out = (r) => (arm.llm ? r.outcome : a0Map.get(r.id).outcome);
    list(`Stille falsche Festlegungen (${arm.llm ? meta.arm : 'A0'})`, (r) => out(r).outcome === 'wrong_commit', (r) => `- **${r.id}** (${r.scene}) „${r.text}“ → ${plan(r)} · ${out(r).subtype}`);
    list('Verpasst', (r) => out(r).outcome === 'missed', (r) => `- ${r.id} „${r.text}“ → ${plan(r)}${r.valid_final === false ? ` · ungültig: ${(r.errors_final || []).slice(0, 2).join('; ')}` : ''}${a0Map.get(r.id).delegated && !arm.llm ? ' · (A delegiert an seinen Story-Interpreter)' : ''}`);
    list('Unnötige Rückfragen', (r) => out(r).outcome === 'unneeded_clarify', (r) => `- ${r.id} „${r.text}“ → ${plan(r)}`);
    list('Richtige Handlung, aber das Ziel passt nicht zum Gold-Muster (von Hand prüfen)', (r) => out(r).outcome === 'goal_mismatch', (r) => `- ${r.id} „${r.text}“ → ${(arm.llm ? r.plan : a0Map.get(r.id).plan).map((p) => `${S.brief(p)}`).join(' + ')}`);
    if (arm.llm) {
        const dropped = shown.flatMap((r) => (r.dropped || []).map((d) => ({ id: r.id, ...d })));
        if (dropped.length) {
            L.push('', `Vom Guard verworfen (${dropped.length}):`);
            for (const d of dropped) L.push(`- ${d.id}: ${d.kind} „${String(d.quote || '').slice(0, 80)}“ → ${d.rule}`);
        }
    }
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return L.join('\n');
}

// ------------------------------------------------------------------------------------------------ report over runs
/** Several saved S4b runs side by side on their shared cases (rep 1): main figures, pairwise sign tests. */
export function compareRuns(runs) {
    const sets = runs.map(({ label, run }) => ({ label, run, by: new Map(run.records.filter((r) => r.rep === 1).map((r) => [r.id, r])) }));
    const ids = [...sets[0].by.keys()].filter((id) => sets.every((s) => s.by.has(id)));
    const outcomeOf = (s, id) => {
        const r = s.by.get(id);
        return s.run.meta.arm === 'a0' ? r.a0.outcome : r.outcome;
    };
    const L = ['# P0 / S4b: Läufe im Vergleich (offline)', '', `Gemeinsame Fälle: ${ids.length}`, ''];
    const metricOf = (s) => {
        const cases = s.run.cases;
        const byId = new Map(cases.map((k) => [k.id, k]));
        // A0 is scored against the full gold (as in its own summary); only p1_nohist reads without RECENT
        return S.metrics(ids.map((id) => ({ kase: byId.get(id), outcome: outcomeOf(s, id) })), { history: s.run.meta.arm === 'a0' || s.run.meta.history !== false });
    };
    const ms = sets.map(metricOf);
    L.push(mdTable(['Kennzahl', ...sets.map((s) => s.label)], [
        ['Absicht richtig', ...ms.map((m) => `${m.accuracy_pct} % (${m.correct})`)],
        ['stille falsche Festlegungen', ...ms.map((m) => `${m.wrong_commit}`)],
        ['verpasste Handlung', ...ms.map((m) => `${m.missed_action_pct} %`)],
        ['unnötige Rückfrage', ...ms.map((m) => `${m.unneeded_clarify_pct} %`)],
        ['Rückfrage-Recall / -Präzision', ...ms.map((m) => `${m.clarify_recall_pct} % / ${m.clarify_precision_pct ?? '–'} %`)],
        ['falsche Agency', ...ms.map((m) => `${m.false_agency}`)],
        ['Latenz p50', ...sets.map((s) => `${s.run.lat?.p50_s ?? '–'} s`)],
        ['Prompt-Token je Fall', ...sets.map((s) => `${s.run.tok?.prompt ?? '–'}`)],
    ]));
    L.push('', '## Paarweise (Fälle, die nur einer richtig hat; exakter Vorzeichentest)', '');
    const pairs = [];
    for (let i = 0; i < sets.length; i += 1) {
        for (let j = i + 1; j < sets.length; j += 1) {
            const a = sets[i];
            const b = sets[j];
            const onlyA = ids.filter((id) => outcomeOf(a, id).outcome === 'correct' && outcomeOf(b, id).outcome !== 'correct');
            const onlyB = ids.filter((id) => outcomeOf(a, id).outcome !== 'correct' && outcomeOf(b, id).outcome === 'correct');
            const wa = ids.filter((id) => outcomeOf(a, id).outcome === 'wrong_commit').length;
            const wb = ids.filter((id) => outcomeOf(b, id).outcome === 'wrong_commit').length;
            pairs.push({ a: a.label, b: b.label, only_a: onlyA, only_b: onlyB, sign_p: signTestP(onlyA.length, onlyB.length), wrong_a: wa, wrong_b: wb });
        }
    }
    L.push(mdTable(['Paar', 'nur links richtig / nur rechts richtig', 'p', 'falsche Festlegungen links / rechts'], pairs.map((p) => [`${p.a} ↔ ${p.b}`, `${p.only_a.length} / ${p.only_b.length}`, fmtP(p.sign_p), `${p.wrong_a} / ${p.wrong_b}`])));
    for (const p of pairs) L.push(`- ${p.a} ↔ ${p.b}: nur links ${p.only_a.join(', ') || '–'} · nur rechts ${p.only_b.join(', ') || '–'}`);
    L.push('', '_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._', '');
    return { ids: ids.length, metrics: ms.map((m, i) => ({ label: sets[i].label, ...m })), pairs, markdown: L.join('\n') };
}

// ------------------------------------------------------------------------------------------------ main
export async function main(argv = process.argv.slice(2), deps = {}) {
    const a = parseArgs(argv);
    const started = Date.now();
    const log = deps.log ?? ((t) => console.log(t));
    const note = deps.progress ?? progress;
    if (a.report) {
        const files = [a.report, ...(a._ || [])].filter((f) => f && f !== true).map(String);
        if (files.length < 2) { log('Aufruf: node tools/p0/s4b_intent.mjs --report <results.json> <results.json> [...]'); return 1; }
        const runs = files.map((f) => { const run = readJson(path.resolve(f)); return { label: run.meta.arm + (run.meta.reps > 1 ? `×${run.meta.reps}` : ''), run }; });
        const res = compareRuns(runs);
        if (a.out && a.out !== true) {
            writeText(path.join(path.resolve(String(a.out)), 'summary.md'), res.markdown);
            writeJson(path.join(path.resolve(String(a.out)), 'results.json'), { tool: TOOL, version: TOOL_VERSION, created: nowIso(), files, ...res, markdown: undefined });
        }
        log(res.markdown);
        return 0;
    }
    const armName = a.arm && a.arm !== true ? String(a.arm) : 'p1';
    const arm = ARMS[armName];
    if (!arm) { log(`FEHLER: --arm ist ${Object.keys(ARMS).join(', ')}`); return 1; }
    const content = deps.content ?? await S.loadContent();
    const specs = deps.specs ?? S.loadSceneSpecs();
    const scenes = deps.scenes ?? S.buildScenes(specs, content);
    const corpus = deps.cases ?? S.loadCases();
    for (const k of corpus) if (!scenes[k.scene]) throw new Error(`Fall ${k.id}: Szene ${k.scene} fehlt`);
    let cases = corpus;
    if (a.cases && a.cases !== true) { const ids = String(a.cases).split(','); cases = cases.filter((k) => ids.includes(k.id)); }
    if (a.tags && a.tags !== true) { const tags = String(a.tags).split(','); cases = cases.filter((k) => (k.tags || []).some((t) => tags.includes(t))); }
    if (a.cat && a.cat !== true) { const cats = String(a.cat).toUpperCase().split(','); cases = cases.filter((k) => cats.includes(k.cat)); }
    if (a.limit) cases = cases.slice(0, intArg(a.limit, cases.length));
    const reps = intArg(a.reps, 1);
    const concurrency = intArg(a.concurrency, 1);
    const maxTokens = intArg(a['max-tokens'], 2500);
    const temperature = a.temperature !== undefined ? Number(a.temperature) : 0.1;
    const timeoutMs = intArg(a.timeout, 120) * 1000;
    let reasoning;
    if (a.reasoning !== undefined && a.reasoning !== true) reasoning = String(a.reasoning) === 'keep' ? undefined : String(a.reasoning);
    const outDir = a.out ? path.resolve(String(a.out)) : path.join(OUT_ROOT, `s4b_${armName}${reps > 1 ? '_stab' : ''}`);
    const contract = arm.gm ? (deps.contract ?? fs.readFileSync(CONTRACT_FILE, 'utf8')) : '';
    const system = arm.llm ? S.plannerSystem({ gm: arm.gm, tool: arm.tool, contract }) : '';
    const tools = arm.tool ? S.planTool() : undefined;
    const promptTokensEst = arm.llm ? Math.round(mean(cases.map((k) => estimateTokens(system) + estimateTokens(S.plannerUser(scenes[k.scene].catalog, k.text, { history: arm.history })) + (tools ? estimateTokens(JSON.stringify(tools)) : 0))) || 0) : 0;
    const a0Map = evaluateA0(cases, scenes, content);

    if (a['dry-run']) {
        const sample = cases.slice(0, 3).map((k) => ({ case: k.id, messages: [{ role: 'system', content: system }, { role: 'user', content: S.plannerUser(scenes[k.scene].catalog, k.text, { history: arm.history }) }], tools: tools ?? null }));
        writeJson(path.join(outDir, 'requests_sample.json'), { tool: TOOL, version: TOOL_VERSION, arm: armName, created: nowIso(), note: 'dry run: no call was made', sample });
        log(`S4b Probelauf (Arm ${armName}): ${cases.length} Fälle × ${reps} = ${cases.length * reps} Aufrufe geplant (+ höchstens 1 Reparatur je Fall). Prompt ≈ ${promptTokensEst} Token je Fall → ≈ ${Math.round((promptTokensEst * cases.length * reps) / 1000)}k Prompt-Token.`);
        log(`Beispielanfragen: ${path.join(outDir, 'requests_sample.json')}`);
        return 0;
    }

    let provider = null;
    let secrets = [];
    let d = { backend: 'none', model: 'none' };
    if (arm.llm) {
        try {
            provider = deps.provider ?? await openProvider({
                backend: a.backend || 'st', stUrl: a['st-url'], profile: a.profile, timeoutMs,
                mock: a.backend === 'mock' ? s4bMockResponder(corpus, scenes) : undefined,
            });
        } catch (err) {
            log(`FEHLER: ${err.message}`);
            return 1;
        }
        secrets = provider.secrets || [];
        d = provider.describe();
        log(`S4b · Arm ${armName} (${arm.label}) · Backend ${d.backend} · Modell ${d.model} · temperature ${temperature} · Reasoning ${reasoning ?? 'wie konfiguriert'} · ${concurrency} gleichzeitig`);
        log(`Plan: ${cases.length} Fälle × ${reps}; Prompt ≈ ${promptTokensEst} Token je Fall.`);
    }

    let calls = 0;
    let done = 0;
    const total = cases.length * reps;
    const tasks = [];
    for (let rep = 1; rep <= reps; rep += 1) {
        for (const k of cases) {
            tasks.push(async () => {
                const sc = scenes[k.scene];
                const a0 = a0Map.get(k.id);
                const rec = { id: k.id, cat: k.cat, scene: k.scene, text: k.text, tags: k.tags || [], product: !!k.product, needs_history: !!k.needs_history, rep, a0: { plan: a0.plan, kind: a0.kind, route: a0.route, delegated: a0.delegated, gate: a0.gate, outcome: strip(a0.outcome) } };
                if (!arm.llm) { done += 1; return rec; }
                const common = { maxTokens, temperature, timeoutMs, ...(reasoning !== undefined ? { reasoning } : {}) };
                const call = arm.tool ? toolPlan : jsonPlan;
                const r = await call(provider, { system, user: S.plannerUser(sc.catalog, k.text, { history: arm.history }), cat: sc.catalog, common, retry: deps.retry ?? {}, tools });
                calls += r.attempts.length;
                const raw = r.intents || [];
                const guarded = r.intents ? S.guardPlan(k.text, raw, sc.catalog) : { kept: [], dropped: [] };
                const outcome = S.classify(k, guarded.kept, sc.catalog, { history: arm.history });
                const outcomeRaw = S.classify(k, raw, sc.catalog, { history: arm.history });
                const fast = a0.gate.cls !== 'ESCALATE';
                Object.assign(rec, {
                    ok: r.ok, error: r.ok ? (r.error ? scrub(r.error, secrets) : null) : scrub(r.error, secrets),
                    valid_first: r.valid_first, valid_final: r.valid_final, repaired: r.repaired, errors_first: r.errors_first, errors_final: r.errors_final,
                    ...(arm.tool ? { tool_called_first: r.tool_called_first } : {}),
                    plan_raw: raw, dropped: guarded.dropped, plan: guarded.kept,
                    outcome: strip(outcome), outcome_raw: strip(outcomeRaw),
                    cascade: { source: fast ? 'a0' : 'llm', outcome: strip(fast ? a0.outcome : outcome) },
                    ms: r.attempts.reduce((n, x) => n + (x.ms ?? 0), 0), tokens: callTokens(r.attempts), attempts: r.attempts,
                    answer: r.intents ? undefined : String(r.content ?? '').slice(0, 1500),
                });
                done += 1;
                note(`[${done}/${total}] ${k.id}${reps > 1 ? ` #${rep}` : ''}: ${OUTCOME_DE[outcome.outcome]}${outcome.subtype ? ` (${outcome.subtype})` : ''} · ${S.planText(guarded.kept)} · ${sec(rec.ms)} s`);
                return rec;
            });
        }
    }
    const records = await pool(tasks, concurrency);
    // the figures: first run of each case; the stability table uses every run
    const first = records.filter((r) => r.rep === 1);
    const rows = (f) => rowsOf(first, cases, f);
    const a0Rows = rows((r) => r.a0.outcome);
    const agg = {
        a0: S.metrics(a0Rows),
        ...(arm.llm ? {
            guarded: S.metrics(rows((r) => r.outcome), { history: arm.history }),
            raw: S.metrics(rows((r) => r.outcome_raw), { history: arm.history }),
            cascade: S.metrics(rows((r) => r.cascade.outcome), { history: arm.history }),
            noProduct: S.metrics(rowsOf(first.filter((r) => !r.product), cases, (r) => r.outcome), { history: arm.history }),
        } : {}),
    };
    const gateM = S.gateMetrics(first.map((r) => ({ kase: cases.find((k) => k.id === r.id), gate: r.a0.gate, a0outcome: r.a0.outcome, a0plan: r.a0.plan })));
    const a0Trap = first.filter((r) => r.a0.outcome.outcome === 'wrong_commit').map((r) => ({ id: r.id, text: r.text, a0: S.planText(r.a0.plan), arm: r.outcome ?? null, armPlan: r.plan ? S.planText(r.plan) : null }));
    const stab = arm.llm && reps > 1 ? stability(records) : null;
    // the history question (p1 against p1_nohist): on the cases only RECENT resolves, did the arm act rightly, ask, or guess?
    const hist = first.filter((r) => r.needs_history && arm.llm);
    const history = {
        cases: hist.length,
        resolved: hist.filter((r) => r.outcome.outcome === 'correct' && (r.plan || []).some((p) => p.kind !== 'clarify')).length,
        asked: hist.filter((r) => (r.plan || []).length > 0 && r.plan.every((p) => p.kind === 'clarify')).length,
        wrong: hist.filter((r) => r.outcome.outcome === 'wrong_commit').length,
    };
    history.other = history.cases - history.resolved - history.asked - history.wrong;
    const answered = records.filter((r) => r.ok);
    const lats = answered.map((r) => r.ms).filter(Number.isFinite);
    const lat = { p50_s: sec(percentile(lats, 50)), p90_s: sec(percentile(lats, 90)), mean_s: sec(mean(lats)) };
    const toks = answered.map((r) => r.tokens).filter((t) => t?.reported);
    const tok = { prompt: round(mean(toks.map((t) => t.prompt)), 0), completion: round(mean(toks.map((t) => t.completion)), 0) };
    const valid = arm.llm ? {
        first_pct: pct(records.filter((r) => r.valid_first).length, records.length),
        final_pct: pct(records.filter((r) => r.valid_final).length, records.length),
        ...(arm.tool ? { tool_first_pct: pct(records.filter((r) => r.tool_called_first).length, records.length) } : {}),
    } : null;
    let crit = null;
    if (arm.llm) {
        const problem = (f) => S.metrics(rowsOf(first.filter((r) => PROBLEM_CLASS.has(r.cat)), cases, f), { history: arm.history });
        const trapWrong = a0Trap.filter((t) => t.arm?.outcome === 'wrong_commit').length;
        crit = criteria(agg.guarded, problem((r) => r.outcome), problem((r) => r.a0.outcome), trapWrong);
        if (stab) crit.push({ id: 'K-R', text: `safe^${stab.k} ≥ alle Fälle − 1 und pass^${stab.k} ≥ 80 %`, ok: stab.safe_k >= stab.cases - 1 && stab.pass_k >= 0.8 * stab.cases, value: `safe ${stab.safe_k}/${stab.cases}, pass ${stab.pass_k}/${stab.cases}` });
    }
    const meta = {
        tool: TOOL, version: TOOL_VERSION, arm: armName, history: !!arm.history, interface: arm.llm ? (arm.tool ? 'tool' : 'json') : 'deterministic', context: arm.gm ? 'narrator_contract' : arm.llm ? 'planner' : null,
        started: new Date(started).toISOString(), finished: nowIso(), duration_s: round((Date.now() - started) / 1000, 0),
        node: process.version, provider: d, temperature: arm.llm ? temperature : null, max_tokens: arm.llm ? maxTokens : null, reasoning: reasoning ?? null, concurrency,
        reps, corpus_cases: corpus.length, cases: cases.length, calls, repairs: records.filter((r) => r.repaired).length, prompt_tokens_est: promptTokensEst,
    };
    const run = { meta, agg, gate: gateM, a0_traps: a0Trap, stability: stab, criteria: crit, history, lat, tok, valid, cases, records };
    const summary = summaryMarkdown({ ...run, gateM, a0Trap, stab, crit, a0Map });
    for (const text of [JSON.stringify(run), summary]) assertNoSecrets(text, secrets);
    writeJson(path.join(outDir, 'results.json'), run);
    writeText(path.join(outDir, 'summary.md'), summary);
    log('');
    log(summary.split('\n## Stille falsche Festlegungen')[0]);
    log(`Gespeichert: ${path.join(outDir, 'summary.md')} (zum Zurückschicken), results.json`);
    return 0;
}

/** An outcome for results.json: the engine view of the plan reduced to what the metrics need (the plan is stored next to it). */
function strip(o) {
    const { view, ...rest } = o;
    return { ...rest, asked_only: !!view && view.length > 0 && view.every((p) => p.effect === 'ask') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    main().then((code) => process.exit(code), (err) => { console.error(`FEHLER: ${err.message}`); process.exit(1); });
}
