// Architecture patch A (.127), A1: offline processing replay of the original batch corpus (tools/replay/build_corpus.mjs).
// Every recorded player turn and narrator reply is processed again by the real product path on its original prior state
// (the chat as saved up to that message), with the model answers the record made; no provider request. Player turns go
// through runtime.prepareGenerationAsync (planner, guard, board, forge, command handlers), replies through
// processReplyAny + runExtraction (parser, repair loop, firewall, world handlers, applyExtraction).
//
// The compared output of a case is its record as the product writes it: events (order, ids, RNG positions) and the
// record outputs corrections/system/rejected/continuation (plus the extraction status of a reply and the host action of
// a player turn). Only the named diagnostic fields in IGNORED are left out; nothing else is normalized.
//
//   node tools/replay/replay.mjs [--engine <root>] [--corpus <dir>] [--write-baseline <file> --sha <commit>]
//                                [--check <baseline file>] [--original] [--show <n>]
//
// --write-baseline  store the outputs of the engine at --engine (the chosen start commit) with its SHA
// --check           compare the outputs of --engine with a stored baseline; exit 1 on any difference
// --original        additionally count differences to the events the original build stored (build drift, informative)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
import { hasContract, contractText } from './contract_c.mjs';

export const DEFAULT_CORPUS = path.join(ROOT, 'tests/replay/corpus');
export const DEFAULT_BASELINE = path.join(ROOT, 'tests/replay/baseline.json.gz');

/** The only fields left out of a comparison: timing and version labels of diagnostic events (a replayed model answers
 * in 0–1 ms, so extract.failed's measured time differs between runs). */
export const IGNORED = { 'extract.applied': ['ms', 'version'], 'cmd.interpreted': ['ms', 'version'], 'extract.failed': ['ms'] };

export function normalizeEvent(e) {
    const drop = IGNORED[e?.t];
    if (!drop || !e.d) return e;
    const d = { ...e.d };
    for (const k of drop) delete d[k];
    return { ...e, d };
}

const pick = (r, keys) => Object.fromEntries(keys.filter((k) => r?.[k] !== undefined).map((k) => [k, r[k]]));

/** The compared output of one record. */
export function recordOutput(r, extra = {}) {
    return {
        ...extra,
        events: (r?.events || []).map(normalizeEvent),
        ...pick(r, ['corrections', 'system', 'rejected', 'continuation']),
        ...(r?.extraction ? { extraction: r.extraction.status } : {}),
    };
}

export function loadCorpus(dir = DEFAULT_CORPUS) {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.json.gz')).sort().map((f) => JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8')));
}

export function loadRun(label, dir = DEFAULT_CORPUS) {
    return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, `${label}.json.gz`))).toString('utf8'));
}

export async function engineAt(root = ROOT) {
    const url = (p) => pathToFileURL(path.join(root, p)).href;
    const [host, runtime, contentMod, state, validate, util] = await Promise.all([
        import(url('src/host.js')), import(url('src/v4/runtime.js')), import(url('src/content.js')),
        import(url('src/state.js')), import(url('src/validate.js')), import(url('src/util.js')),
    ]);
    const content = await contentMod.loadContentPack(async (n) => JSON.parse(fs.readFileSync(path.join(root, 'content', n), 'utf8')));
    return { host, runtime, state, validate, util, content, version: util.ENGINE_VERSION };
}

/** A scripted model: the recorded answers of one message, in order; a different request is a visible replay error.
 * convert: package C's transparent conversion of an older extractor answer (tools/replay/contract_c.mjs). */
function scripted(answers = [], convert = null) {
    const queue = [...answers];
    const asked = [];
    const llm = async ({ purpose }) => {
        asked.push(purpose);
        const next = queue.shift();
        if (!next) throw Object.assign(new Error(`replay: no recorded answer for ${purpose}`), { code: 'REPLAY_UNSCRIPTED' });
        const role = (p) => p.replace(/_(?:repair|recovery)$/, '');
        if (role(next.purpose) !== role(purpose)) throw Object.assign(new Error(`replay: recorded ${next.purpose}, asked ${purpose}`), { code: 'REPLAY_UNSCRIPTED' });
        if (next.missing) throw Object.assign(new Error('replay: answer missing from the completion log'), { code: 'REPLAY_UNSCRIPTED' });
        if (next.error) {
            const code = { timeout: 'LLM_TIMEOUT', cancelled: 'LLM_CANCELLED', provider: 'LLM_PROVIDER' }[next.error.kind];
            throw Object.assign(new Error(`replayed ${next.error.kind} error`), code ? { code } : {}, next.error.status ? { status: next.error.status } : {},
                typeof next.error.retryable === 'boolean' ? { retryable: next.error.retryable } : {});
        }
        return convert && /^extract/.test(purpose) ? convert(next.content) : next.content;
    };
    return { llm, asked, left: () => queue.length };
}

/** Replay one corpus run with the engine at `root`. */
export async function replayRun(E, run) {
    const { host, runtime, content, util } = E;
    const chat = run.chat;
    const cases = {};
    const coverage = { player: 0, player_board: 0, player_forge: 0, player_control: 0, player_failed: 0, reply: 0, reply_failed: 0, reply_skipped_empty: 0, skipped: {} };
    const skip = (why) => { coverage.skipped[why] = (coverage.skipped[why] || 0) + 1; };
    for (let i = 0; i < chat.length; i++) {
        const m = chat[i];
        const r = m.extra?.avereth;
        if (!r) continue;
        const id = `${run.source.label}#${i}`;
        // only the message under test is copied: the product writes nothing into earlier messages here
        const copy = chat.slice(0, i + 1);
        const own = structuredClone(m);
        delete own.extra.avereth;
        copy[i] = own;
        if (m.is_user) {
            if (!r.input_hash) { skip('player record without input'); continue; }
            if (m.is_system && r.command) own.is_system = false; // a command line the host hid after answering it
            const s = scripted(run.answers[i]);
            let res;
            try {
                res = await runtime.prepareGenerationAsync(copy, content, { type: 'normal', settings: {}, llm: s.llm });
            } catch (err) {
                cases[id] = { kind: 'player', error: String(err.message).slice(0, 200) };
                continue;
            }
            const out = host.rec(own);
            cases[id] = recordOutput(out, { kind: 'player', action: res.action, ...(s.left() ? { unused_answers: s.left() } : {}) });
            coverage.player += 1;
            if (r.board) coverage.player_board += 1;
            if (r.forge) coverage.player_forge += 1;
            if (!r.plan) coverage.player_control += 1;
            if (r.interp?.failed) coverage.player_failed += 1;
        } else {
            if (m.is_system) continue;
            if (r.text_hash !== util.hash32(m.mes)) { skip('stale swipe record'); continue; }
            if (r.system_answer) { skip('system answer (no world)'); continue; }
            if (!r.extraction && r.events?.some((e) => e.t === 'campaign.started')) { skip('campaign start'); continue; }
            if (r.extraction?.status === 'late') { skip('extraction closed late'); continue; }
            // package C (.132): an engine of the population contract gets the recorded answer converted, the state it is
            // converted against being the one the reply is applied to (the fold before it)
            const before = hasContract(content.deltaVocab) ? host.foldChat(copy, i).state : null;
            const s = scripted(run.answers[i], before ? (text) => contractText(text, before, content) : null);
            let p;
            let x = null;
            try {
                p = runtime.processReplyAny(copy, i, content, {});
                if (p.extract) x = await runtime.runExtraction(copy, i, content, s.llm);
            } catch (err) {
                cases[id] = { kind: 'reply', error: String(err.message).slice(0, 200) };
                continue;
            }
            const out = host.rec(own);
            cases[id] = recordOutput(out, { kind: 'reply', ...(x?.foldBlocked ? { foldBlocked: x.foldBlocked.index } : {}), ...(s.left() ? { unused_answers: s.left() } : {}) });
            if (r.extraction?.status === 'skipped') coverage.reply_skipped_empty += 1;
            else if (r.extraction?.status === 'failed') coverage.reply_failed += 1;
            coverage.reply += 1;
        }
    }
    return { cases, coverage };
}

/** The original events, folded record by record with validateState after each one (reducer and state invariants). */
export function foldCheck(E, run) {
    const { state: st, validate, content, host } = E;
    const s = st.emptyState();
    const problems = [];
    let events = 0;
    for (let i = 0; i < run.chat.length; i++) {
        const evs = host.messageEvents(run.chat[i]);
        if (!evs.length) continue;
        for (const e of evs) {
            try { st.applyEvent(s, e); events += 1; } catch (err) { problems.push(`#${i} ${e.t}: ${err.message}`); }
        }
        if (s.meta.started) for (const p of validate.validateState(s, content)) problems.push(`#${i}: ${p}`);
    }
    const whole = host.foldChat(run.chat);
    return { events, problems: problems.slice(0, 20), problem_count: problems.length, fold_errors: whole.errors.length };
}

/** Original stored events against replayed events (informative build drift; not an acceptance criterion). */
export function originalDrift(run, cases) {
    let same = 0;
    const differing = [];
    for (const [id, out] of Object.entries(cases)) {
        const i = Number(id.split('#')[1]);
        const stored = (run.chat[i].extra.avereth.events || []).map(normalizeEvent);
        if (JSON.stringify(stored) === JSON.stringify(out.events || [])) same += 1;
        else differing.push(i);
    }
    return { same, different: differing.length, records: differing };
}

/** First differing event of two outputs, for the per-record list. */
export function firstDifference(a, b) {
    const ea = a?.events || [];
    const eb = b?.events || [];
    for (let k = 0; k < Math.max(ea.length, eb.length); k++) {
        const x = JSON.stringify(ea[k]);
        const y = JSON.stringify(eb[k]);
        if (x !== y) return { event: k, baseline: ea[k]?.t ?? null, now: eb[k]?.t ?? null };
    }
    for (const key of ['action', 'corrections', 'system', 'rejected', 'continuation', 'extraction', 'error', 'foldBlocked', 'unused_answers']) {
        if (JSON.stringify(a?.[key]) !== JSON.stringify(b?.[key])) return { field: key };
    }
    return null;
}

export async function replayCorpus(root = ROOT, corpusDir = DEFAULT_CORPUS, { labels = null } = {}) {
    const E = await engineAt(root);
    const runs = loadCorpus(corpusDir).filter((r) => !labels || labels.includes(r.source.label));
    const result = { engine: E.version, runs: {} };
    for (const run of runs) {
        const { cases, coverage } = await replayRun(E, run);
        result.runs[run.source.label] = { source: run.source, coverage, fold: foldCheck(E, run), cases, drift: originalDrift(run, cases) };
    }
    return result;
}

/**
 * The acceptance comparison. Every run the baseline names must have been replayed (and no unknown run may appear), every
 * case must match, and a replayed run must have no replay error, fold error or validation problem: any of these is a
 * listed difference, so `--check` fails on it by itself (review of .127).
 */
export function compareToBaseline(baseline, result) {
    const diffs = [];
    let compared = 0;
    for (const label of Object.keys(baseline.runs)) {
        if (!result.runs[label]) diffs.push({ id: label, missing: 'baseline run not replayed' });
    }
    for (const [label, run] of Object.entries(result.runs)) {
        const errors = Object.values(run.cases).filter((c) => c.error).length;
        if (errors) diffs.push({ id: label, integrity: `${errors} replay error(s)` });
        if (run.fold?.fold_errors) diffs.push({ id: label, integrity: `${run.fold.fold_errors} fold error(s)` });
        if (run.fold?.problem_count) diffs.push({ id: label, integrity: `${run.fold.problem_count} validation problem(s)` });
        const base = baseline.runs[label];
        if (!base) { diffs.push({ id: label, missing: 'run not in baseline' }); continue; }
        const ids = new Set([...Object.keys(base.cases), ...Object.keys(run.cases)]);
        for (const id of ids) {
            compared += 1;
            const d = firstDifference(base.cases[id], run.cases[id]);
            if (d || !base.cases[id] || !run.cases[id]) diffs.push({ id, ...(d || { missing: !base.cases[id] ? 'new case' : 'case gone' }) });
        }
    }
    return { compared, diffs };
}

function summary(result) {
    const lines = [];
    for (const [label, run] of Object.entries(result.runs)) {
        const c = run.coverage;
        const errors = Object.values(run.cases).filter((x) => x.error).length;
        lines.push(`${label}: player ${c.player} (board ${c.player_board}, forge ${c.player_forge}, control ${c.player_control}, planner failed ${c.player_failed}) · reply ${c.reply} (extraction failed ${c.reply_failed}, empty ${c.reply_skipped_empty}) · skipped ${JSON.stringify(c.skipped)} · replay errors ${errors} · fold ${run.fold.events} events, ${run.fold.fold_errors} fold errors, ${run.fold.problem_count} validation problems · vs original build ${run.drift.same} same / ${run.drift.different} different`);
    }
    return lines.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const args = process.argv.slice(2);
    const opt = (name) => { const k = args.indexOf(name); return k >= 0 ? args[k + 1] : null; };
    const root = path.resolve(opt('--engine') || ROOT);
    const corpus = path.resolve(opt('--corpus') || DEFAULT_CORPUS);
    const t0 = Date.now();
    const result = await replayCorpus(root, corpus);
    console.log(`engine ${result.engine} at ${root} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    console.log(summary(result));
    const write = opt('--write-baseline');
    if (write) {
        const sha = opt('--sha');
        if (!sha) { console.error('--write-baseline needs --sha <commit of --engine>'); process.exit(2); }
        const baseline = { format: 'avereth-replay-baseline-1', sha, engine: result.engine, ignored: IGNORED,
            runs: Object.fromEntries(Object.entries(result.runs).map(([k, v]) => [k, { source: v.source, coverage: v.coverage, cases: v.cases }])) };
        fs.writeFileSync(write, zlib.gzipSync(JSON.stringify(baseline), { level: 9 }));
        console.log(`baseline written: ${write} (${sha})`);
    }
    const check = opt('--check');
    if (check) {
        const baseline = JSON.parse(zlib.gunzipSync(fs.readFileSync(check)).toString('utf8'));
        const { compared, diffs: all } = compareToBaseline(baseline, result);
        // --accepted <file>: a reasoned list of the records an intended change makes differ (package C:
        // tests/replay/accepted_c132_vs_126.json); a listed record that no longer differs is reported too
        const accepted = opt('--accepted') ? JSON.parse(fs.readFileSync(opt('--accepted'), 'utf8')).cases : {};
        const diffs = all.filter((d) => !accepted[d.id]);
        const stale = Object.keys(accepted).filter((id) => !all.some((d) => d.id === id));
        console.log(`baseline ${baseline.sha} (${baseline.engine}): ${compared} cases compared, ${all.length} differing${opt('--accepted') ? `, ${all.length - diffs.length} of them accepted, ${diffs.length} not accepted, ${stale.length} accepted but equal` : ''}`);
        for (const d of diffs.slice(0, Number(opt('--show') || 50))) console.log(JSON.stringify(d));
        for (const id of stale) console.log(JSON.stringify({ id, accepted_but_equal: true }));
        if (diffs.length || stale.length) process.exitCode = 1;
    }
}
