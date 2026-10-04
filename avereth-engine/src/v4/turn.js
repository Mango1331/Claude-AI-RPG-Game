// Runtime V4: one turn (docs/RUNTIME_V4_PLAN.md §3.1). The router sends '#' commands, character creation, combat
// (a running fight, a commitment to be resolved, a declared attack) and declared stealth to the V3 engine, unchanged;
// every other message of a V4 campaign is a story turn:
//
//   player message -> interpreter (LLM, host) -> agency guard -> command handlers (engine) -> PLAYER ACTIONS
//   narrator (pure prose) -> extractor (LLM, host, in the background) -> firewall -> world handlers (engine)
//
// The host (src/host.js) makes the LLM calls and stores the results on the messages; this module is pure: the same
// state and answers give the same events, so swipes, regenerations and the fold never re-decide anything.
import { Dice } from '../rng.js';
import { applyEvent } from '../state.js';
import { clone, hash32 } from '../util.js';
import { readTurn } from '../ir.js';
import { resolveCommands } from './commands.js';
import { applyWorld } from './world.js';
import { INTERPRETER_VERSION } from './interpret.js';
import { EXTRACTOR_VERSION } from './extract.js';

/**
 * Which engine resolves this message: 'v3' for commands, creation, combat and stealth (the V3 engine, unchanged in a V4
 * campaign), 'v4' for a story turn (interpreter and extractor). The route of the message's Intent IR (src/ir.js).
 */
export function routeTurn(state, content, text) {
    return readTurn(String(text ?? ''), state, content).route;
}

function serializableAuth(auth) {
    return {
        go: auth.go, gos: auth.gos, roam: auth.roam, take: auth.take, takeNames: auth.takeNames || {}, gather: auth.gather,
        rest: auth.rest, timeCap: auth.timeCap, ...(auth.journey ? { journey: auth.journey } : {}),
        // Prototype C (src/v4/planner.js): the engine's own time and recovery this turn
        ...(auth.c ? { c: true, booked_min: auth.booked_min || 0, recovered: !!auth.recovered } : {}),
    };
}

/**
 * Resolve a V4 story turn: the interpreted commands (after the agency guard) against the state, with the engine's dice.
 * @param {{msg?: number, commands: object[], dropped?: object[], interp?: object, board?: object}} input
 *   interp: {version, ms, source, failed?, error?}; board: the Board generator's validated listings for this turn
 * @returns {{events, outcome, state, command: null|{panels: string[], llm: null}}}
 */
export function playerTurnV4(state, content, text, { msg = null, commands = [], dropped = [], interp = {}, board = null, c = false } = {}) {
    if (!state.meta.started) throw new Error('campaign not started');
    const s = clone(state);
    const dice = Dice.from(s);
    const events = [];
    const emit = (e) => {
        if (dice.n !== s.rng.n) e.rng_to = dice.n;
        applyEvent(s, e);
        events.push(e);
    };
    const input = String(text ?? '');
    emit({ t: 'turn.begun', d: { turn: s.turn + 1, input_hash: hash32(input), input: input.slice(0, 240) } });
    emit({ t: 'cmd.interpreted', d: {
        version: interp.version || INTERPRETER_VERSION, source: interp.source || 'json', ms: interp.ms ?? null, failed: !!interp.failed,
        ...(interp.error ? { error: String(interp.error).slice(0, 200) } : {}),
        commands: commands.map((c) => ({ ...c })), dropped: dropped.map((x) => ({ type: x.command?.type, rule: x.rule, quote: x.command?.quote ?? null })),
    } });
    const ctx = resolveCommands(s, content, commands, emit, { msg, dice, board, c, dropped });
    const clarify = ctx.resolutions.find((r) => r.status === 'clarify');
    if (clarify) {
        // an ambiguous reference: the System asks, nothing is booked, no story turn (plan §4.4)
        const line = ctx.actions.find((a) => a.startsWith(`${clarify.seq}. CLARIFY`)) || 'CLARIFY — which one?';
        return { events: [], outcome: null, state, command: { panels: [`[SYSTEM // CLARIFY]\n${line.replace(/^\d+\. CLARIFY — /, '')}\nNothing was booked; name it and send the message again.`], llm: null } };
    }
    const actions = interp.failed
        ? ['NOTHING TO BOOK — the engine could not read what Alaric decided in this message; narrate only what changes nothing about him (no travel, no payment, no acceptance), and stop at his next decision.']
        : ctx.actions.length ? ctx.actions : ['NOTHING TO BOOK — Alaric decides nothing the engine resolves in this message; narrate what he says and does, and the world\'s response.'];
    const outcome = {
        kind: 'v4', actions, extra: ctx.extra, resolutions: ctx.resolutions, expected_keys: ctx.expectedKeys,
        auth: serializableAuth(ctx.auth), conditionals: ctx.conditionals, booked: ctx.booked, board: ctx.boardShown,
        search_checks: ctx.searchChecks, check_die: null, interp_failed: !!interp.failed,
        dropped: dropped.map((x) => ({ type: x.command?.type, rule: x.rule, quote: x.command?.quote ?? null })),
        ...(ctx.engineLines.length ? { engine_lines: ctx.engineLines } : {}),
    };
    emit({ t: 'outcome.recorded', d: { outcome, situations: [] } });
    return { events, outcome, state: s, command: null };
}

/**
 * Apply the extractor's answer to the reply of a V4 campaign turn (story or V3-routed): the firewall, then the world.
 * @returns see world.js applyWorld; plus `extraction` for the record
 */
export function replyTurnV4(state, content, answer, { msg = null, prose = '', ms = null, source = 'extractor', repaired = false } = {}) {
    const r = applyWorld(state, content, answer, { msg, prose });
    const s = r.state;
    const summary = { t: 'extract.applied', d: { version: EXTRACTOR_VERSION, source, ms, repaired, deltas: (answer.deltas || []).length, rejected: r.rejected.length } };
    applyEvent(s, summary);
    return { ...r, events: [...r.events, summary] };
}
