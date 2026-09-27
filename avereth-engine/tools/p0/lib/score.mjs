// Runtime V4, P0 / S1: scoring interpreter answers against the gold of tests/eval/commands.jsonl.
//
// Gold format (one case): expect = ordered gold commands; allow = tolerated extra commands (not counted as false).
//   A gold command is {type, ...args} or {anyOf: [command, …]}. Only the args it names are checked.
//   An arg value is: an exact value · null (must be null or missing) · "/regex/i" (a string, or {new: string}) ·
//   {new: "/regex/i"} · an array of alternatives.
// Matching per case: gold in order, each against the first unused predicted command (in seq order) that matches
// fully; failing that, one with the same type (a partial match: right command, wrong argument).

/** Commands that commit Alaric to something: a false one of these is the dangerous kind of false agency. */
export const COMMITMENTS = new Set(['pay', 'buy', 'sell', 'give', 'drop', 'use', 'offer.accept', 'offer.decline', 'quest.accept', 'quest.turn_in', 'quest.abandon', 'guild.register', 'guild.promote']);

const RE = /^\/(.*)\/([a-z]*)$/s;

function asRegex(v) {
    const m = typeof v === 'string' ? v.match(RE) : null;
    return m ? new RegExp(m[1], m[2]) : null;
}

export function matchValue(gold, pred) {
    if (Array.isArray(gold)) return gold.some((g) => matchValue(g, pred));
    if (gold === null) return pred === null || pred === undefined;
    const re = asRegex(gold);
    if (re) {
        if (typeof pred === 'string') return re.test(pred);
        if (pred && typeof pred === 'object' && typeof pred.new === 'string') return re.test(pred.new);
        return false;
    }
    if (typeof gold === 'object') {
        if (!pred || typeof pred !== 'object') return false;
        return Object.entries(gold).every(([k, v]) => matchValue(v, pred[k]));
    }
    return gold === pred;
}

/** {type: bool, full: bool, bad: [arg names]} for one gold command against one predicted command. */
export function matchCommand(gold, pred) {
    if (gold.anyOf) {
        const results = gold.anyOf.map((g) => matchCommand(g, pred));
        return results.find((r) => r.full) || results.find((r) => r.type) || { type: false, full: false, bad: [] };
    }
    if (!pred || gold.type !== pred.type) return { type: false, full: false, bad: [] };
    const bad = Object.entries(gold).filter(([k]) => k !== 'type').filter(([k, v]) => !matchValue(v, pred[k])).map(([k]) => k);
    return { type: true, full: bad.length === 0, bad };
}

export function goldTypes(gold) {
    return gold.anyOf ? [...new Set(gold.anyOf.map((g) => g.type))] : [gold.type];
}

/** Score one case. predicted: the interpreter's commands (any order; sorted by seq here). */
export function scoreCase(kase, predicted) {
    const preds = (Array.isArray(predicted) ? predicted : []).filter((p) => p && typeof p === 'object')
        .map((p, i) => ({ ...p, _i: i })).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a._i - b._i);
    const used = new Set();
    const gold = kase.expect || [];
    const matches = gold.map((g) => {
        let idx = preds.findIndex((p, k) => !used.has(k) && matchCommand(g, p).full);
        let kind = 'full';
        if (idx < 0) {
            idx = preds.findIndex((p, k) => !used.has(k) && matchCommand(g, p).type);
            kind = idx >= 0 ? 'type' : 'missing';
        }
        if (idx >= 0) used.add(idx);
        return { gold: g, types: goldTypes(g), kind, pred_index: idx, bad: idx >= 0 ? matchCommand(g, preds[idx]).bad : [] };
    });
    const extras = preds.filter((_, k) => !used.has(k));
    const tolerated = extras.filter((p) => (kase.allow || []).some((a) => matchCommand(a, p).full));
    const falseCmds = extras.filter((p) => !tolerated.includes(p));
    const matchedPositions = matches.filter((m) => m.pred_index >= 0).map((m) => m.pred_index);
    const orderOk = matchedPositions.every((v, i) => i === 0 || v > matchedPositions[i - 1]);
    const full = matches.filter((m) => m.kind === 'full').length;
    return {
        gold: gold.length,
        full,
        type_only: matches.filter((m) => m.kind === 'type').length,
        missing: matches.filter((m) => m.kind === 'missing').length,
        matches,
        false_commands: falseCmds.map(({ _i, ...p }) => p),
        tolerated: tolerated.length,
        order_ok: gold.length < 2 || matchedPositions.length < 2 ? null : orderOk,
        exact: full === gold.length && falseCmds.length === 0 && orderOk,
        negative: gold.length === 0,
        negative_ok: gold.length === 0 ? falseCmds.length === 0 : null,
    };
}

const pctOf = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);

/** Aggregate over case scores: the S1 metrics (plan §11.2, §11.7). */
export function aggregate(scored) {
    const answered = scored.filter((s) => s.score);
    const neg = answered.filter((s) => s.score.negative);
    const pos = answered.filter((s) => !s.score.negative);
    const goldTotal = pos.reduce((n, s) => n + s.score.gold, 0);
    const full = pos.reduce((n, s) => n + s.score.full, 0);
    const typeHits = pos.reduce((n, s) => n + s.score.full + s.score.type_only, 0);
    const predictedTotal = answered.reduce((n, s) => n + s.predicted_count, 0);
    const falseTotal = answered.reduce((n, s) => n + s.score.false_commands.length, 0);
    const falseCommit = answered.reduce((n, s) => n + s.score.false_commands.filter((c) => COMMITMENTS.has(c.type)).length, 0);
    const multi = pos.filter((s) => s.score.order_ok !== null);
    const perType = {};
    const bump = (t, k, n = 1) => {
        perType[t] = perType[t] || { gold: 0, full: 0, wrong_args: 0, missing: 0, false: 0 };
        perType[t][k] += n;
    };
    for (const s of answered) {
        for (const m of s.score.matches) {
            const t = m.types.length === 1 ? m.types[0] : m.types.join('|');
            bump(t, 'gold');
            if (m.kind === 'full') bump(t, 'full');
            else if (m.kind === 'type') bump(t, 'wrong_args');
            else bump(t, 'missing');
        }
        for (const c of s.score.false_commands) bump(String(c.type), 'false');
    }
    const refArgs = { total: 0, ok: 0 };
    for (const s of pos) {
        for (const m of s.score.matches) {
            if (m.kind === 'missing') continue;
            const refKeys = ['to', 'quest', 'object', 'offer', 'from'].filter((k) => (m.gold.anyOf ? m.gold.anyOf.some((g) => k in g) : k in m.gold));
            if (!refKeys.length) continue;
            refArgs.total += 1;
            if (!refKeys.some((k) => m.bad.includes(k))) refArgs.ok += 1;
        }
    }
    return {
        cases: scored.length,
        answered: answered.length,
        failed: scored.length - answered.length,
        negative_cases: neg.length,
        negative_ok: neg.filter((s) => s.score.negative_ok).length,
        negative_precision_pct: pctOf(neg.filter((s) => s.score.negative_ok).length, neg.length),
        positive_cases: pos.length,
        gold_commands: goldTotal,
        recall_pct: pctOf(full, goldTotal),
        type_recall_pct: pctOf(typeHits, goldTotal),
        predicted_commands: predictedTotal,
        false_commands: falseTotal,
        false_commitments: falseCommit,
        // right commands among all non-tolerated predicted ones (a right type with a wrong argument is not right)
        command_precision_pct: pctOf(full, typeHits + falseTotal),
        exact_cases_pct: pctOf(answered.filter((s) => s.score.exact).length, answered.length),
        order_cases: multi.length,
        order_ok_pct: pctOf(multi.filter((s) => s.score.order_ok).length, multi.length),
        reference_args: refArgs.total,
        reference_ok_pct: pctOf(refArgs.ok, refArgs.total),
        per_type: perType,
    };
}
