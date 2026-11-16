// Gen 3.5: the Unified Intent IR (docs/ARCHITECTURE_GEN35.md §2.1). A player message is read once, and both turn paths
// write the same form: what Alaric does (acts), which names he used (links to what the engine knows) and which engine
// resolves it (route). The deterministic parser writes the mechanical acts (attack, stealth, commands, creation:
// src/intent.js), the interpreter the story acts (go, pay, quest.accept …: src/v4/interpret.js); the route follows
// from the acts, the V3 engine resolves the parsed act without reading the text again, and the record of the message
// keeps the IR, so a swipe or a regeneration reuses it and a decision trace reads one form for both paths.
import { parseIntent, linkEntities } from './intent.js';

export const IR_VERSION = 'ir-1';

/** Acts the V3 engine resolves (the mechanical fast path): commands, creation, combat, stealth. */
export const MECHANICAL = new Set(['command', 'creation.class', 'creation.skills', 'creation.invalid', 'attack', 'engage', 'ambiguous_target', 'no_target', 'unknown_skill', 'stealth']);

/** The fields of a parsed intent that are its act's arguments. */
const ACT_FIELDS = ['name', 'arg', 'class', 'skills', 'reason', 'skill', 'target', 'target_how', 'move', 'dir', 'targets', 'candidates', 'ref'];

/** The parser's act (src/intent.js parseIntent) in the IR's form. */
export function parsedAct(intent) {
    const act = { act: intent.kind, source: 'parser' };
    for (const k of ACT_FIELDS) if (intent[k] !== undefined) act[k] = intent[k];
    return act;
}

/** The interpreter's commands (after the agency guard) as IR acts; what the guard removed stays visible. */
export function interpretedActs(kept = [], dropped = []) {
    return [
        ...kept.map((c) => ({ ...c, act: c.type, source: 'interpreter' })),
        ...dropped.map((x) => ({ act: x.command?.type ?? null, seq: x.command?.seq ?? null, quote: x.command?.quote ?? null, source: 'interpreter', dropped: x.rule })),
    ].map(({ type, ...a }) => a);
}

/**
 * Read a player message once.
 * @returns {{v: string, route: 'v3'|'v4', reason: string, intent: object, links: object[], acts: object[]}}
 *   reason: why this route ('campaign' V3 campaign, 'creation', 'dead', 'fight', 'committed' fight, or the act);
 *   intent: the parsed intent (the V3 engine resolves it as given); acts: the mechanical act, or none (the
 *   interpreter writes the story acts later)
 */
export function readTurn(text, state, content) {
    const raw = String(text ?? '');
    const v4 = state.meta?.runtime === 'v4';
    const linked = v4 ? linkEntities(raw, state) : null;
    const intent = parseIntent(raw, state, content, { masked: linked?.masked ?? null });
    const forced = !v4 ? 'campaign'
        : state.mode === 'creation' ? 'creation'
            : state.entities.pc?.status === 'dead' ? 'dead'
                : state.encounter ? 'fight'
                    : (state.pending_combat || []).length ? 'committed' : null;
    const mechanical = MECHANICAL.has(intent.kind);
    const route = forced || mechanical ? 'v3' : 'v4';
    return {
        v: IR_VERSION, route, reason: forced || intent.kind, intent,
        links: (linked?.links || []).map((l) => ({ kind: l.kind, id: l.id, deed: l.deed })),
        acts: route === 'v3' ? [parsedAct(intent)] : [],
    };
}

/** The IR as the record of the message keeps it (no copy of the message itself). */
export function irRecord(ir, acts = ir.acts) {
    return { v: ir.v, route: ir.route, reason: ir.reason, links: ir.links, acts };
}
