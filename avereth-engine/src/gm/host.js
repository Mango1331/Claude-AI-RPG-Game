// Host adapter for the experimental Narrator-as-GM path.
// Nothing is written to the player message before narration. Function calls stage a transaction in memory; the final
// assistant swipe receives the complete event list. That makes Regenerate/Swipe naturally branch the tool decisions
// together with the prose, like the existing reply-owned world events.
import { rec, setRec, foldChat, hasCampaign, lastPlayerIndex, lastReplyIndex, showPanel } from '../host.js';
import { turnContext } from '../engine.js';
import { loreKeys } from '../context.js';
import { applyEvent } from '../state.js';
import { renderHud } from '../hud.js';
import { extractReport } from '../delta.js';
import { clone, hash32, stripTrackerBlocks } from '../util.js';
import { finalizeGmSession, GM_TOOLS_VERSION } from './runtime.js';

export const GM_RECORD_VERSION = 4;

export const GM_MODE_NOTE =
    'GM TOOL MODE — Read the PLAYER MESSAGE yourself. You own semantic interpretation and ordinary world adjudication. ' +
    'Do not wait for a pre-parser to tell you what Alaric meant. Before narrating any hard mechanical commitment, call the matching Avereth tool; ' +
    'the returned engine result is authoritative for numbers/resources/state. For ordinary dialogue and soft fiction no player-action tool is required. ' +
    'When your narration establishes a durable world change, call avereth_commit_world. Creative abilities may target scenery through avereth_use_ability_on_world.';

/**
 * Build the narrator context without resolving the player's semantics first. A temporary turn/outcome exists only to
 * make the existing context renderer show the current message and the GM-mode rule; it is never persisted.
 */
export function prepareGmGeneration(chat, content, { type = 'normal', settings = {}, session = null } = {}) {
    if (type === 'quiet' || type === 'impersonate') return { action: 'clear', dirty: false };
    if (type === 'continue') return { fallback: true, reason: 'continue_uses_legacy_v4' };
    if (!hasCampaign(chat)) return { action: 'none', dirty: false };
    const u = lastPlayerIndex(chat);
    if (u < 0) return { action: 'none', dirty: false };
    const msg = chat[u];
    const before = foldChat(chat, u);
    const s = before.state;

    // Character creation, # engine commands, legacy runtime and terminal campaigns keep the proven old path for now.
    if (s.meta?.runtime !== 'v4' || s.mode === 'creation' || s.entities.pc?.status === 'dead' || /^\s*#/.test(String(msg.mes || ''))) {
        return { fallback: true, reason: s.mode === 'creation' ? 'creation' : 'legacy_or_command' };
    }
    // If this user message already owns legacy events (e.g. an old save/regenerate edge), do not double-resolve it.
    if (Array.isArray(rec(msg)?.events) && rec(msg).events.length) return { fallback: true, reason: 'already_resolved' };

    // Function calling performs follow-up generations inside the same player turn. Keep the staged transaction and
    // render the next prompt from its current state instead of rebuilding from the pre-turn state.
    const resumed = !!session && session.userIndex === u && session.inputHash === hash32(msg.mes);
    const staged = resumed && session.state;
    const temp = staged ? clone(session.state) : clone(s);
    if (!staged) {
        applyEvent(temp, { t: 'turn.begun', d: { turn: temp.turn + 1, input_hash: hash32(msg.mes), input: String(msg.mes || '').slice(0, 240) } });
        applyEvent(temp, { t: 'outcome.recorded', d: { outcome: { kind: 'note', text: GM_MODE_NOTE }, situations: [] } });
    }

    const p = lastReplyIndex(chat, u);
    const prev = p >= 0 ? rec(chat[p]) : null;
    const context = turnContext(temp, content, {
        input: msg.mes,
        corrections: prev && !prev.system_answer ? prev.corrections || [] : [],
        lastReply: p >= 0 ? chat[p].mes : '',
        budget: settings.budget,
        rulesBudget: settings.rulesBudget,
        recentTurns: settings.recentTurns,
        systemQuery: null,
        lore: settings.engineLore !== false,
        envelope: settings.engineEnvelope !== false,
    });
    if (staged) context.text = `${context.text}\n\n${GM_MODE_NOTE}`;
    return {
        action: 'context',
        context,
        loreKeys: loreKeys(temp, content),
        dirty: false,
        errors: before.errors,
        gm: { userIndex: u, input: msg.mes, inputHash: hash32(msg.mes), beforeState: resumed ? session.beforeState : s },
    };
}

/** Commit the staged transaction to the assistant swipe and render the HUD from that exact branch of state. */
export function processGmReply(chat, id, content, session, { hud = 'closed', stripTrackers = true } = {}) {
    const msg = chat[id];
    if (!msg || msg.is_user || msg.is_system || !session) return { changed: false };
    const user = chat[session.userIndex];
    if (!user || hash32(user.mes) !== session.inputHash) return { changed: false, stale: true };

    const existing = rec(msg);
    if (existing?.text_hash === hash32(msg.mes) && existing?.gm_tools) return { changed: false, session };

    const clean = extractReport(msg.mes).clean;
    msg.mes = stripTrackers === false ? clean : stripTrackerBlocks(clean);
    const final = finalizeGmSession(session, content);
    const view = renderHud(final.state, content, hud);
    showPanel(msg, '', view);
    setRec(msg, {
        v: GM_RECORD_VERSION,
        events: final.events,
        text_hash: hash32(msg.mes),
        corrections: [],
        gm_tools: {
            version: GM_TOOLS_VERSION,
            calls: final.calls.map((c) => c.tool),
            action_resolved: final.actionResolved,
            world_commits: final.worldCommits,
        },
        hud: view || undefined,
    });
    return { changed: true, session: final, state: final.state };
}
