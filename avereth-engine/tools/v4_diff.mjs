// V4 differential replay (docs/ARCHITECTURE_GEN35.md §5): the recorded live runs replayed through two engine trees,
// e.g. the base commit in a git worktree and the working tree. Every difference in the engine blocks, the message
// records and the final state is listed and sorted into the categories the Gen 3.5 change expects; whatever fits none
// is "other" and needs a reason. Offline, no provider, deterministic (the runs' own seeds).
//
//   git worktree add --detach /tmp/base <commit>
//   node tools/v4_diff.mjs /tmp/base/avereth-engine . [out.json]
//
// Also measured: the engine block's tokens (estimate, src/context.js) and the engine's own time per message (median
// of five replays per tree; the interpreter and the extractor are the runs' recorded answers, so this is the
// deterministic part of a turn only).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [rootA, rootB = '.', out = null] = process.argv.slice(2);
if (!rootA) {
    console.error('usage: node tools/v4_diff.mjs <engine root A (base)> [engine root B (new), default .] [out.json]');
    process.exit(2);
}
const RUNS = ['live_0930.json', 'live_0930b.json', 'live_0930c.json'];
const REPEAT = 5;

async function tree(root) {
    const imp = (rel) => import(pathToFileURL(path.resolve(root, rel)).href);
    const { loadContent } = await imp('tests/helpers.js');
    const { Chat4 } = await imp('tests/v4/harness.js');
    const { turnBlock } = await imp('src/host.js');
    let envelopeBlock = null;
    try { ({ envelopeBlock } = await imp('src/v4/envelope.js')); } catch { /* a tree before the envelope */ }
    return { root, content: await loadContent(), Chat4, turnBlock, envelopeBlock };
}
// the replay driver of the newer tree, with each tree's own harness and host
const { replayRun } = await import(pathToFileURL(path.resolve(rootB, 'tests/v4/replay_lib.js')).href);
const A = await tree(rootA);
const B = await tree(rootB);

// the build and version stamps and the measured milliseconds of a model call are no engine decision
const STAMPS = new Set(['build', 'ms', 'engine_version', 'content_version']);
const strip = (o) => JSON.parse(JSON.stringify(o ?? null, (k, v) => (STAMPS.has(k) ? undefined : v)));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const key = (e) => JSON.stringify(e);

async function play(T, fx) {
    const { steps } = await replayRun(T.content, fx, { Chat: T.Chat4, block: T.turnBlock });
    return steps;
}

/** The events of one list that the other lacks (as a multiset). */
function minus(xs, ys) {
    const left = new Map();
    for (const y of ys) left.set(key(y), (left.get(key(y)) || 0) + 1);
    return xs.filter((x) => { const n = left.get(key(x)) || 0; if (n) { left.set(key(x), n - 1); return false; } return true; });
}

/** Sort the event differences of one message into the expected categories. */
function eventDiff(ea, eb) {
    const onlyA = minus(ea, eb);
    const onlyB = minus(eb, ea);
    const found = [];
    const used = new Set();
    for (const b of onlyB) {
        if (b.t === 'fact.asserted' && b.d.fact.scope) {
            const { scope, ...rest } = b.d.fact;
            const a = onlyA.find((x) => !used.has(x) && x.t === 'fact.asserted' && key(x.d.fact) === key(rest));
            if (a) { used.add(a); used.add(b); found.push({ cat: 'scope', fact: `${rest.s} ${rest.p} ${String(rest.o).slice(0, 60)}`, scope }); }
        }
    }
    for (const b of onlyB.filter((x) => !used.has(x) && x.t === 'delta.rejected' && x.d.rule === 'engine_owned_memory')) {
        const a = onlyA.find((x) => !used.has(x) && x.t === 'memory.recorded');
        used.add(b); if (a) used.add(a);
        found.push({ cat: 'memory', refused: a?.d?.memory?.text ?? a?.d?.text ?? null, why: b.d.why });
    }
    for (const b of onlyB.filter((x) => !used.has(x) && x.t === 'memory.recorded')) {
        const a = onlyA.find((x) => !used.has(x) && x.t === 'memory.recorded');
        if (a) { used.add(a); used.add(b); found.push({ cat: 'memory', from: a.d?.memory?.text ?? a.d?.text, to: b.d?.memory?.text ?? b.d?.text }); }
    }
    for (const b of onlyB.filter((x) => !used.has(x) && x.t === 'delta.rejected' && x.d.rule === 'envelope')) {
        used.add(b);
        found.push({ cat: 'envelope_refusal', why: b.d.why });
    }
    const rest = [...onlyA.filter((x) => !used.has(x)).map((x) => ({ side: 'A', e: x })), ...onlyB.filter((x) => !used.has(x)).map((x) => ({ side: 'B', e: x }))];
    if (rest.length) found.push({ cat: 'other', events: rest });
    return found;
}

/** Lines of block A and block B the other lacks, after B's envelope section is set aside. */
function blockDiff(a, b, env) {
    const envLines = new Set(String(env || '').split('\n').filter(Boolean));
    const la = String(a || '').split('\n').filter(Boolean);
    const lb = String(b || '').split('\n').filter(Boolean);
    const envelope = lb.filter((l) => envLines.has(l));
    const rest = lb.filter((l) => !envLines.has(l));
    return { envelope, onlyA: minus(la, rest), onlyB: minus(rest, la) };
}

const report = { a: path.resolve(rootA), b: path.resolve(rootB), runs: {} };
const totals = { steps: 0, identical: 0, cats: {} };
const count = (cat) => { totals.cats[cat] = (totals.cats[cat] || 0) + 1; };
for (const f of RUNS) {
    const fx = JSON.parse(fs.readFileSync(path.resolve(rootB, 'tests/v4', f), 'utf8'));
    const sa = await play(A, fx);
    const sb = await play(B, fx);
    const run = { steps: sa.length, diffs: [], tokens: { a: [], b: [], envelope: [] }, ms: { a: 0, b: 0 } };
    if (sa.length !== sb.length) run.diffs.push({ cat: 'other', what: `step count ${sa.length} vs ${sb.length}` });
    for (let i = 0; i < Math.min(sa.length, sb.length); i++) {
        const x = sa[i];
        const y = sb[i];
        const d = { i: x.i, kind: x.kind, found: [] };
        if (x.kind !== y.kind || x.action !== y.action) d.found.push({ cat: 'other', what: `${x.kind}/${x.action} vs ${y.kind}/${y.action}` });
        const ra = strip(x.record);
        const rb = strip(y.record);
        if (rb && rb.ir && !(ra && ra.ir)) { d.found.push({ cat: 'ir', route: rb.ir.route, acts: rb.ir.acts.map((a) => a.act + (a.dropped ? `(${a.dropped})` : '')), links: rb.ir.links.length }); delete rb.ir; }
        d.found.push(...eventDiff(ra?.events || [], rb?.events || []));
        const restA = { ...(ra || {}), events: undefined };
        const restB = { ...(rb || {}), events: undefined };
        if (key(restA) !== key(restB)) d.found.push({ cat: 'other', what: 'record fields', a: restA, b: restB });
        if (x.kind === 'player' && (x.block || y.block)) {
            const env = B.envelopeBlock && y.state ? B.envelopeBlock(y.state, B.content) : '';
            const bd = blockDiff(x.block, y.block, env);
            if (bd.envelope.length) d.found.push({ cat: 'envelope', lines: bd.envelope });
            if (bd.onlyA.length || bd.onlyB.length) {
                // a fight's words that ended with it leave the retrieval corpus: the ranking of what remains shifts too
                const expired = Object.values(y.state?.facts || {}).filter((f) => f.scope?.fight && y.state.encounter?.id !== f.scope.fight && !f.until);
                d.found.push({ cat: expired.length ? 'block_after_scope' : 'block', expired: expired.length, onlyA: bd.onlyA, onlyB: bd.onlyB });
            }
            if (x.tokens != null) run.tokens.a.push(x.tokens);
            if (y.tokens != null) run.tokens.b.push(y.tokens);
            const e = (y.sections || []).find((s) => s.name === 'envelope');
            run.tokens.envelope.push(e ? e.tokens : 0);
        }
        totals.steps += 1;
        if (!d.found.length) { totals.identical += 1; continue; }
        for (const g of d.found) count(g.cat);
        run.diffs.push(d);
    }
    // the final state: the facts' scope is the one expected field
    const fa = strip(sa.at(-1)?.state);
    const fb = strip(sb.at(-1)?.state);
    for (const fct of Object.values(fb?.facts || {})) delete fct.scope;
    const stateKeys = [...new Set([...Object.keys(fa || {}), ...Object.keys(fb || {})])].filter((k) => key(fa?.[k]) !== key(fb?.[k]));
    run.state = stateKeys;
    // the engine's time per message: median of REPEAT replays per tree
    const time = async (T) => { const xs = []; for (let r = 0; r < REPEAT; r++) { const st = await play(T, fx); xs.push(st.reduce((s, z) => s + (z.ms || 0), 0)); } return median(xs); };
    run.ms = { a: await time(A), b: await time(B), messages: sa.length };
    report.runs[f] = run;
}

// ------------------------------------------------------------------------------------------------ summary
const lines = [];
lines.push(`V4 differential: ${report.a}  vs  ${report.b}`);
lines.push(`steps ${totals.steps}, identical ${totals.identical}; categories: ${Object.entries(totals.cats).map(([k, v]) => `${k} ${v}`).join(', ')}`);
for (const [f, run] of Object.entries(report.runs)) {
    const tA = run.tokens.a;
    const tB = run.tokens.b;
    const env = run.tokens.envelope;
    const withEnv = env.filter((t) => t > 0);
    lines.push(`\n${f}: ${run.steps} steps; final state differs in: ${run.state.join(', ') || 'nothing'} (fact scopes set aside)`);
    lines.push(`  engine block tokens (story turns ${tA.length}): median A ${median(tA)} / B ${median(tB)}, max A ${Math.max(0, ...tA)} / B ${Math.max(0, ...tB)}; envelope in ${withEnv.length}, median ${median(withEnv)}, max ${Math.max(0, ...env)}`);
    lines.push(`  engine time, all ${run.ms.messages} messages: A ${run.ms.a.toFixed(0)} ms / B ${run.ms.b.toFixed(0)} ms (median of ${REPEAT})`);
    for (const d of run.diffs) {
        for (const g of d.found) {
            if (g.cat === 'ir') continue;
            if (g.cat === 'envelope') { lines.push(`  #${d.i} envelope: ${g.lines.join(' | ').slice(0, 220)}`); continue; }
            if (g.cat === 'scope') { lines.push(`  #${d.i} scope: ${g.fact}`); continue; }
            if (g.cat === 'memory') { lines.push(`  #${d.i} memory: ${g.refused !== undefined ? `refused "${String(g.refused).slice(0, 100)}"` : `"${String(g.from).slice(0, 80)}" -> "${String(g.to).slice(0, 80)}"`}`); continue; }
            if (g.cat === 'envelope_refusal') { lines.push(`  #${d.i} envelope refusal: ${g.why}`); continue; }
            if (g.cat === 'block' || g.cat === 'block_after_scope') { lines.push(`  #${d.i} ${g.cat}${g.expired ? ` (${g.expired} expired)` : ''}: -${JSON.stringify(g.onlyA).slice(0, 240)} +${JSON.stringify(g.onlyB).slice(0, 240)}`); continue; }
            lines.push(`  #${d.i} OTHER: ${JSON.stringify(g).slice(0, 400)}`);
        }
    }
}
console.log(lines.join('\n'));
if (out) fs.writeFileSync(out, JSON.stringify({ ...report, totals }, null, 1));
