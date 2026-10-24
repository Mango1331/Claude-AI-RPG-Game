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
import { syncEvents } from './living.js';
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
        rest: auth.rest, timeCap: auth.timeCap, ...(auth.journey ? { journey: auth.journey } : {}), ...(auth.road ? { road: auth.road } : {}),
        // Prototype C (src/v4/planner.js): the engine's own time and recovery this turn
        ...(auth.c ? { c: true, booked_min: auth.booked_min || 0, recovered: !!auth.recovered } : {}),
    };
}

/**
 * Prototype C (4.3.0-c.6.6.6): the coin the engine booked for Alaric in this turn, each change as its events have it (a
 * sale, a purchase, a payment, a Guild payout), for the System block (src/display.js). An offer or a bid alone books
 * none. kind: sale | payout (a transaction to him from a buyer or the Guild), purchase (one he made from an offer),
 * paid, received.
 */
function coinBooked(events) {
    return events.flatMap((e, i) => {
        if (e.t !== 'coin.changed' || e.d.id !== 'pc' || !e.d.delta) return [];
        const txn = [events[i + 1], events[i - 1]].find((x) => x?.t === 'transaction.completed');
        const kind = e.d.delta > 0
            ? (txn?.d.to === 'pc' ? (txn.d.from === 'guild' ? 'payout' : 'sale') : 'received')
            : (txn?.d.offer ? 'purchase' : 'paid');
        return [{ kind, delta: e.d.delta, before: e.d.value - e.d.delta, after: e.d.value, why: e.d.why || null }];
    });
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
    // Patch 8: the Dungeon he is at, its cycle and its companies, as time has brought them (src/v4/living.js)
    if (c) syncEvents(s, content, emit);
    const ctx = resolveCommands(s, content, commands, emit, { msg, dice, board, c, dropped });
    if (c) syncEvents(s, content, emit);
    const clarify = ctx.resolutions.find((r) => r.status === 'clarify');
    // Patch 3 (live 18.10.2026: "I settle on the ring of stones for my camp this night and go looking for animals to
    // hunt": the camp's length was a question, and the hunt was lost with it): a question about one step stops that
    // step and the steps that rest on it (needs); the steps that stand on their own are his and are taken
    const standing = ctx.resolutions.filter((r) => r.status !== 'clarify' && !(r.status === 'refused' && /^needs step/.test(r.reason || '')));
    if (clarify && !standing.length) {
        // an ambiguous reference: the System asks, nothing is booked, no story turn (plan §4.4)
        const line = ctx.actions.find((a) => a.startsWith(`${clarify.seq}. CLARIFY`)) || 'CLARIFY — which one?';
        return { events: [], outcome: null, state, command: { panels: [`[SYSTEM // CLARIFY]\n${line.replace(/^\d+\. CLARIFY — /, '')}\nNothing was booked; name it and send the message again.`], llm: null } };
    }
    for (const q of ctx.resolutions.filter((r) => r.status === 'clarify')) {
        const i = ctx.actions.findIndex((a) => a.startsWith(`${q.seq}. CLARIFY`));
        const question = (i >= 0 ? ctx.actions[i] : '').replace(/^\d+\. CLARIFY — /, '') || 'which one?';
        if (i >= 0) ctx.actions[i] = `${q.seq}. OPEN QUESTION — ${q.quote ? `"${String(q.quote).slice(0, 80)}": ` : ''}${question} He has not said it; nothing is booked for this step. Tell the other steps as they happen; leave this one for him to answer (the System asks him).`;
        ctx.engineLines.push(`QUESTION — ${question} (only this step waits; the rest of the message was taken)`);
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
        ...(c && coinBooked(events).length ? { coin: coinBooked(events) } : {}),
    };
    emit({ t: 'outcome.recorded', d: { outcome, situations: [] } });
    return { events, outcome, state: s, command: null };
}

/**
 * Apply the extractor's answer to the reply of a V4 campaign turn (story or V3-routed): the firewall, then the world.
 * @returns see world.js applyWorld; plus `extraction` for the record
 */
export function replyTurnV4(state, content, answer, { msg = null, prose = '', ms = null, source = 'extractor', repaired = false, chronicle = null } = {}) {
    const r = applyWorld(state, content, answer, { msg, prose, chronicle });
    const s = r.state;
    const summary = { t: 'extract.applied', d: { version: EXTRACTOR_VERSION, source, ms, repaired, deltas: (answer.deltas || []).length, rejected: r.rejected.length } };
    applyEvent(s, summary);
    return { ...r, events: [...r.events, summary] };
}
