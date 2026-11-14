// P1f measurement (.187): what the model calls of a natural run spent and where they ran out of room. Reads the
// runner's calls.json files (tools/st_live/live, one per persona) and prints, per call kind (plan, extract, narrator …,
// first call vs repair): count, output caps used, finish=length split into empty and cut answers, completion tokens,
// reasoning characters, latency, what the next call of the same kind and turn returned, and the tokens and time spent
// in calls that ended at the cap. No model is called; nothing is written.
//   node tools/model_budget_report.mjs <calls.json> [<calls.json> …]   (--json for the raw numbers)
import fs from 'node:fs';

const q = (a, p) => { const s = a.filter((x) => Number.isFinite(x)).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * p)] : null; };

/** The report of a list of runner call records ({role, repair, turn, max_tokens, finish, completion_tokens, reasoning_chars, content_chars, ms, prompt_tokens}). */
export function budgetReport(runs) {
    const kinds = {};
    const after = {};
    const spent = { calls: 0, tokens: 0, ms: 0 };
    for (const calls of runs) {
        calls.forEach((c, i) => {
            const k = `${c.role}${c.repair ? '+repair' : ''}`;
            const b = (kinds[k] ||= { n: 0, caps: new Set(), length_empty: 0, length_cut: 0, completion: [], reasoning: [], ms: [], prompt: [] });
            b.n++; b.caps.add(c.max_tokens);
            b.completion.push(c.completion_tokens); b.reasoning.push(c.reasoning_chars); b.ms.push(c.ms); b.prompt.push(c.prompt_tokens);
            if (c.finish !== 'length') return;
            if (c.content_chars) b.length_cut++; else b.length_empty++;
            spent.calls++; spent.tokens += c.completion_tokens || 0; spent.ms += c.ms || 0;
            const next = calls.slice(i + 1).find((d) => d.turn === c.turn && d.role === c.role);
            const key = `${c.role}: ${next ? (next.finish === 'length' ? (next.content_chars ? 'cut again' : 'empty again') : next.content_chars ? 'answered' : 'empty') : 'no further call'}`;
            after[key] = (after[key] || 0) + 1;
        });
    }
    const out = {};
    for (const [k, b] of Object.entries(kinds)) out[k] = {
        n: b.n, caps: [...b.caps].sort((x, y) => x - y), length_empty: b.length_empty, length_cut: b.length_cut,
        completion: { p50: q(b.completion, 0.5), p90: q(b.completion, 0.9), p95: q(b.completion, 0.95), max: q(b.completion, 1) },
        reasoning_chars: { p50: q(b.reasoning, 0.5), p90: q(b.reasoning, 0.9), max: q(b.reasoning, 1) },
        prompt_tokens_p50: q(b.prompt, 0.5), ms: { p50: q(b.ms, 0.5), p90: q(b.ms, 0.9) },
    };
    return { kinds: out, after_length: after, spent_at_cap: spent };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
    if (!files.length) { console.error('usage: node tools/model_budget_report.mjs <calls.json> …'); process.exit(2); }
    const r = budgetReport(files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8'))));
    if (process.argv.includes('--json')) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
    for (const [k, b] of Object.entries(r.kinds)) console.log(`${k.padEnd(16)} n ${String(b.n).padStart(4)} · cap ${b.caps.join('/')} · length ${b.length_empty} empty, ${b.length_cut} cut · completion p50 ${b.completion.p50} p95 ${b.completion.p95} max ${b.completion.max} · reasoning chars p50 ${b.reasoning_chars.p50} max ${b.reasoning_chars.max} · ms p50 ${b.ms.p50} p90 ${b.ms.p90}`);
    for (const [k, v] of Object.entries(r.after_length)) console.log(`after a call at its cap – ${k}: ${v}`);
    console.log(`spent in calls at their cap: ${r.spent_at_cap.calls} calls, ${r.spent_at_cap.tokens} completion tokens, ${Math.round(r.spent_at_cap.ms / 1000)} s`);
}
