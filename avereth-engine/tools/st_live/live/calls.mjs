// Every Chat Completion call of a run, from the instance's server log (docs/LIVE_RUNNER.md §8): SillyTavern logs the
// body of each request and, without streaming, each reply (src/endpoints/backends/chat-completions.js), parsed as
// tools/run_report.mjs parses a player's log. The times of the log lines (server.mjs markers) give each call its
// duration. A call's role is read from its prompt: the planner, the interpreter, the extractor, the board generator,
// the narrator, the Forge (Patch 9C-2a/9C-2c: names of a composed Skill or Passive); a repair is an engine call that
// carries its earlier answer back.
import { parseServerLog } from '../../run_report.mjs';

const ANSI = /\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07/g;
const REQ = /^Chat Completion request: /gm;

export function roleOf(req) {
    const msgs = Array.isArray(req?.messages) ? req.messages : [];
    const sys = String(msgs[0]?.content ?? '');
    // Patch 9C-2c: the Forge had the planner's token limit (900): its own prompt tells it apart, its repair too
    if (sys.startsWith('Name new fantasy Skills') || sys.startsWith('Name new fantasy Passives') || sys.startsWith('Name new fantasy evolved Classes')) return msgs.some((m) => m.role === 'assistant') ? 'forge_repair' : 'forge';
    if (sys.startsWith('You are the intent planner')) return 'plan';
    if (sys.startsWith('You are the command interpreter')) return sys.includes('Actions with skills, in fights and on things') ? 'plan' : 'interpret';
    if (sys.startsWith('You read one reply')) return 'extract';
    if (sys.startsWith("You write the official contracts on an Adventurers' Guild board")) return 'board';
    if (sys.startsWith('You are a test player') || sys.startsWith('You are a human test player')) return 'player';
    if (msgs.some((m) => String(m.content ?? '').startsWith('[AVERETH ENGINE'))) return 'narrator';
    // 4.3.0-c.6.6.51: the limits from .51 on (planner 2000, extractor 4000, Forge 1500) and those of the builds before
    return { 900: 'plan', 2000: 'plan', 2500: 'extract', 4000: 'extract', 1500: 'forge', 3000: 'board' }[req?.max_tokens] || 'other';
}

const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x?.text || '').join('') : '');

/**
 * The calls of a log. markers: [{kind: 'request'|'response', at}] in log order (server.mjs); without them the calls
 * have no times. turnTimes: the player's sends [{turn, at}] to give each call its turn.
 */
export function parseCalls(logText, markers = [], turnTimes = []) {
    const clean = String(logText).replace(ANSI, '');
    const starts = [];
    let m;
    while ((m = REQ.exec(clean))) starts.push(m.index);
    const reqMarks = markers.filter((x) => x.kind === 'request');
    const calls = [];
    const errors = [];
    const seen = new Map();
    for (const [k, start] of starts.entries()) {
        const seg = clean.slice(start, starts[k + 1] ?? clean.length);
        const { pairs, errors: errs } = parseServerLog(seg);
        errors.push(...errs.map((e) => `call ${k + 1}: ${e}`));
        const pair = pairs[0];
        if (!pair) continue;
        const { req, resp } = pair;
        const repeatOf = resp?.id != null && seen.has(resp.id) ? seen.get(resp.id) : null;
        if (resp?.id != null && repeatOf == null) seen.set(resp.id, k + 1);
        const reqAt = reqMarks[k]?.at ?? null;
        const nextReqAt = reqMarks[k + 1]?.at ?? Infinity;
        const respAt = reqAt == null ? null : markers.find((x) => x.kind === 'response' && x.at >= reqAt && x.at <= nextReqAt)?.at ?? null;
        const role = roleOf(req);
        const msgs = Array.isArray(req.messages) ? req.messages : [];
        const choice = resp?.choices?.[0] || null;
        const content = textOf(choice?.message?.content);
        const reasoning = choice?.message?.reasoning_content || choice?.message?.reasoning || '';
        const u = resp?.usage || {};
        const turn = reqAt == null ? null : (turnTimes.filter((t) => t.at <= reqAt).at(-1)?.turn ?? 0);
        calls.push({
            n: k + 1, role, repair: role === 'forge_repair' || (['plan', 'interpret', 'extract', 'board'].includes(role) && msgs.some((x) => x.role === 'assistant')), turn,
            at: reqAt ? new Date(reqAt).toISOString() : null, ms: reqAt && respAt ? respAt - reqAt : null,
            model: req.model ?? null, resp_model: resp?.model ?? null, max_tokens: req.max_tokens ?? req.max_completion_tokens ?? null, temperature: req.temperature ?? null,
            reasoning_effort: req.reasoning_effort ?? req.reasoning?.effort ?? null, stream: !!req.stream, messages: msgs.length, prompt_chars: msgs.reduce((a, x) => a + textOf(x.content).length, 0),
            finish: choice?.finish_reason ?? null, prompt_tokens: u.prompt_tokens ?? null, cached_tokens: u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens ?? null,
            completion_tokens: u.completion_tokens ?? null, reasoning_tokens: u.completion_tokens_details?.reasoning_tokens ?? null,
            content_chars: content.length, reasoning_chars: String(reasoning).length, empty: !!resp && !content.trim(), no_response: !resp, repeatOf,
            error: resp?.error ? String(resp.error.message || resp.error).slice(0, 300) : null,
            last_user: textOf([...msgs].reverse().find((x) => x.role === 'user')?.content).slice(-160),
        });
        calls.at(-1).full = { request: req, response: resp };
    }
    return { calls, errors };
}

/** Per role: count, repairs, times and tokens (the report's performance table). */
export function callStats(calls) {
    const by = {};
    for (const c of calls) {
        const x = (by[c.role] ||= { n: 0, repairs: 0, ms: [], prompt: [], completion: [], reasoning: [], cached: [], finish: {}, empty: 0, no_response: 0 });
        x.n += 1;
        if (c.repair) x.repairs += 1;
        if (Number.isFinite(c.ms)) x.ms.push(c.ms);
        if (Number.isFinite(c.prompt_tokens)) x.prompt.push(c.prompt_tokens);
        if (Number.isFinite(c.completion_tokens)) x.completion.push(c.completion_tokens);
        if (Number.isFinite(c.reasoning_tokens)) x.reasoning.push(c.reasoning_tokens);
        if (Number.isFinite(c.cached_tokens)) x.cached.push(c.cached_tokens);
        if (c.finish) x.finish[c.finish] = (x.finish[c.finish] || 0) + 1;
        if (c.empty) x.empty += 1;
        if (c.no_response) x.no_response += 1;
    }
    return by;
}
