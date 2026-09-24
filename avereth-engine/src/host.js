// Host adapter: maps the engine onto a chat transcript — an array of messages {mes, is_user, is_system, extra,
// swipes, swipe_id, swipe_info} as SillyTavern stores them. It mutates only the message objects it is given, so the
// same code runs in the browser (index.js) and in the Node tests (swipe / regenerate / delete / edit scenarios).
//
// Storage: every message carries its own events in message.extra.avereth. SillyTavern keeps `extra` per swipe, so
// each alternative reply owns its own facts. ST copies `extra` into a NEW swipe before it is generated, so an
// assistant record is only applied while its text_hash matches the message text (stale copies are ignored).
import { applyEvent, emptyState } from './state.js';
import { startCampaign, playerTurn, narratorReply, turnContext } from './engine.js';
import { loreKeys } from './context.js';
import { extractReport } from './delta.js';
import { turnPanel } from './display.js';
import { renderHud } from './hud.js';
import { hash32, clone, swapWords, hasTrackerBlocks, stripTrackerBlocks } from './util.js';

export const KEY = 'avereth';
export const RECORD_VERSION = 2;

function rec(msg) {
    return msg && msg.extra && msg.extra[KEY];
}

function setRec(msg, record) {
    if (!msg.extra || typeof msg.extra !== 'object') msg.extra = {};
    msg.extra[KEY] = record;
    syncSwipe(msg);
}

/** Keep the active swipe in step with the message (ST reads swipes/swipe_info on swipe changes). */
export function syncSwipe(msg) {
    if (!Array.isArray(msg.swipes) || typeof msg.swipe_id !== 'number') return;
    msg.swipes[msg.swipe_id] = msg.mes;
    if (Array.isArray(msg.swipe_info) && msg.swipe_info[msg.swipe_id] && typeof msg.swipe_info[msg.swipe_id] === 'object') {
        msg.swipe_info[msg.swipe_id].extra = clone(msg.extra);
    }
}

/** Events a message contributes to the campaign (empty for stale swipe copies and foreign messages). */
export function messageEvents(msg) {
    const r = rec(msg);
    if (!r || !Array.isArray(r.events)) return [];
    if (!msg.is_user && r.text_hash && r.text_hash !== hash32(msg.mes)) return [];
    return r.events;
}

/** Fold messages [0, end) into the campaign state. Events that no longer apply (e.g. after deletions) are skipped. */
export function foldChat(chat, end = chat.length) {
    const state = emptyState();
    const errors = [];
    for (let i = 0; i < Math.min(end, chat.length); i++) {
        for (const e of messageEvents(chat[i])) {
            try {
                applyEvent(state, e);
            } catch (err) {
                errors.push(`message ${i}: ${e.t}: ${err.message}`);
            }
        }
    }
    return { state, errors };
}

export function hasCampaign(chat) {
    return chat.some((m) => messageEvents(m).some((e) => e.t === 'campaign.started'));
}

export function lastUserIndex(chat, before = chat.length) {
    for (let i = Math.min(before, chat.length) - 1; i >= 0; i--) if (chat[i].is_user && !chat[i].is_system) return i;
    return -1;
}

/** The latest player message, including a command line the host hid from the prompt (it still carries our record). */
function lastPlayerIndex(chat) {
    for (let i = chat.length - 1; i >= 0; i--) if (chat[i].is_user && (!chat[i].is_system || rec(chat[i])?.command)) return i;
    return -1;
}

function lastReplyIndex(chat, before) {
    for (let i = before - 1; i >= 0; i--) if (!chat[i].is_user && !chat[i].is_system) return i;
    return -1;
}

/**
 * Start the campaign on the greeting (message 0) if none exists. A chat that already ran without the engine is left
 * alone ('legacy') unless force is set: its history cannot be reconstructed into mechanical state.
 * @returns {'exists'|'created'|'legacy'|'none'}
 */
export function ensureCampaign(chat, content, { seed, force = false } = {}) {
    if (hasCampaign(chat)) return 'exists';
    const first = chat[0];
    if (!first || first.is_user) return 'none';
    const played = chat.filter((m) => m.is_user && !m.is_system).length;
    if (played > 1 && !force) return 'legacy';
    const events = startCampaign(content, { seed, firstMessage: first.mes });
    setRec(first, { v: RECORD_VERSION, events, text_hash: hash32(first.mes) });
    return 'created';
}

/**
 * Called right before a generation. Resolves the latest player message once (stored on that message, so swipes and
 * regenerations reuse the same dice) and returns what the host must do.
 * settings.engineLore = false leaves the descriptive world lore to the host's lorebook (the engine block keeps
 * mechanics and state only); loreKeys names the current realm and location for that lorebook's retrieval.
 * @returns {{action: 'none'|'clear'|'abort'|'panels'|'context', dirty: boolean, panels?: string[], context?: object, loreKeys?: string[], index?: number, errors?: string[]}}
 */
export function prepareGeneration(chat, content, { type = 'normal', settings = {} } = {}) {
    if (type === 'quiet' || type === 'impersonate') return { action: 'clear', dirty: false };
    if (!hasCampaign(chat)) return { action: 'none', dirty: false };
    const u = lastPlayerIndex(chat);
    if (u < 0) return { action: 'none', dirty: false };
    const msg = chat[u];
    let dirty = false;
    let r = rec(msg);
    if (type !== 'continue' && (!r || r.input_hash !== hash32(msg.mes))) {
        const before = foldChat(chat, u);
        const t = playerTurn(before.state, content, msg.mes, { msg: u });
        r = { v: RECORD_VERSION, input_hash: hash32(msg.mes), events: t.events, command: t.command ? { panels: t.command.panels, llm: t.command.llm } : null };
        setRec(msg, r);
        dirty = true;
    }
    if (r?.command && !r.command.llm) {
        if (r.command.posted) return { action: 'abort', dirty }; // regenerate/continue on a command: nothing to narrate
        r.command.posted = true;
        setRec(msg, r);
        return { action: 'panels', panels: r.command.panels, index: u, dirty: true };
    }
    const { state, errors } = foldChat(chat, u + 1);
    const p = lastReplyIndex(chat, u);
    const prev = p >= 0 ? rec(chat[p]) : null;
    const context = turnContext(state, content, {
        input: msg.mes,
        corrections: prev && !prev.system_answer ? prev.corrections || [] : [],
        lastReply: p >= 0 ? chat[p].mes : '',
        budget: settings.budget,
        rulesBudget: settings.rulesBudget,
        recentTurns: settings.recentTurns,
        systemQuery: r?.command?.llm ? r.command.llm.question || 'help' : null,
        lore: settings.engineLore !== false,
    });
    return { action: 'context', context, loreKeys: loreKeys(state, content), dirty, errors };
}

/**
 * Called when a reply was received (or a greeting created). Validates the fact report into events on this swipe and
 * strips the report from the visible text. The System block (what was resolved) goes above the reply and the player
 * HUD (Character + World, rendered from the state after this reply) below it: display only, never in a prompt.
 * hud: 'closed' | 'open' | 'off'.
 * @returns {{changed: boolean, result?: object}}
 */
export function processReply(chat, id, content, { seed, swaps = [], hud = 'closed', stripTrackers = true } = {}) {
    const msg = chat[id];
    if (!msg || msg.is_user || msg.is_system) return { changed: false };
    if (!hasCampaign(chat)) {
        return { changed: ensureCampaign(chat, content, { seed }) === 'created' };
    }
    const r = rec(msg);
    if (r && r.text_hash === hash32(msg.mes)) return { changed: false }; // already processed (this exact text)
    const u = lastUserIndex(chat, id);
    if (u < 0) return { changed: false };
    const userRec = rec(chat[u]);
    if (userRec?.command?.llm) {
        msg.mes = swapWords(extractReport(msg.mes).clean, swaps);
        setRec(msg, { v: RECORD_VERSION, events: [], system_answer: true, text_hash: hash32(msg.mes) });
        return { changed: true };
    }
    const { state } = foldChat(chat, id);
    const result = narratorReply(state, content, msg.mes, { msg: id, stripTrackers });
    msg.mes = swapWords(result.clean, swaps);
    const panel = turnPanel(state, content, result.state.last?.check, result);
    const view = renderHud(result.state, content, hud);
    showPanel(msg, panel, view);
    setRec(msg, {
        v: RECORD_VERSION, events: result.events, text_hash: hash32(msg.mes), corrections: result.corrections,
        accepted: result.accepted, rejected: result.rejected, report_error: result.report_error, panel: panel || undefined, hud: view || undefined,
    });
    return { changed: true, result };
}

/**
 * Show the engine's System block (combat log, checks) above the reply and the player HUD below it: SillyTavern
 * renders extra.display_text instead of mes, while prompts keep using mes. Only what the engine wrote is replaced or
 * removed.
 */
function showPanel(msg, panel, hud = '') {
    if (!msg.extra || typeof msg.extra !== 'object') msg.extra = {};
    const r = rec(msg);
    if (panel || hud) msg.extra.display_text = [panel, msg.mes, hud].filter(Boolean).join('\n\n');
    else if ((r?.panel || r?.hud) && typeof msg.extra.display_text === 'string') delete msg.extra.display_text;
}

/**
 * An edited reply keeps the facts it established (typo fixes, rewording): its record is re-stamped so it keeps
 * applying. To retcon, the player edits in a new report block (`<avereth>{...}</avereth>`, `{}` = no facts): the
 * reply is then re-validated against the state before it and its events are replaced. Only the latest reply can be
 * retconned: later turns were resolved against its facts (rolls, XP, knowledge) and are not replayed, so an older
 * reply keeps its facts and the host is told to delete the later messages first.
 * @returns {{changed: boolean, text?: boolean, refused?: string}} text = the visible message text changed (host
 *   re-renders it); refused = a retcon that was not applied (host shows it)
 */
export function onEdited(chat, id, content) {
    const msg = chat[id];
    const r = rec(msg);
    if (!msg || msg.is_user || !r) return { changed: false };
    if (content && !r.system_answer && extractReport(msg.mes).report !== null && hasCampaign(chat) && !r.events?.some((e) => e.t === 'campaign.started')) {
        if (chat.slice(id + 1).some((m) => messageEvents(m).length)) {
            r.text_hash = hash32(msg.mes);
            setRec(msg, r);
            return { changed: true, refused: 'Retcon works only on the latest reply: delete the later messages first, then save this edit again. The reply keeps its facts for now.' };
        }
        const { state } = foldChat(chat, id);
        const result = narratorReply(state, content, msg.mes, { msg: id });
        msg.mes = result.clean;
        const panel = turnPanel(state, content, result.state.last?.check, result);
        const view = r.hud ? renderHud(result.state, content, /<details class="avereth-hud" open>/.test(r.hud) ? 'open' : 'closed') : '';
        showPanel(msg, panel, view);
        setRec(msg, {
            v: RECORD_VERSION, events: result.events, text_hash: hash32(msg.mes), corrections: result.corrections,
            accepted: result.accepted, rejected: result.rejected, report_error: result.report_error, retcon: true, panel: panel || undefined, hud: view || undefined,
        });
        return { changed: true, text: true };
    }
    r.text_hash = hash32(msg.mes);
    if (r.panel || r.hud) showPanel(msg, r.panel, r.hud); // the edited narration between the same System block and HUD
    setRec(msg, r);
    return r.panel || r.hud ? { changed: true, text: true } : { changed: true };
}

/**
 * Prompt-only projection of the chat history (Runtime V3), applied by the generate interceptor to SillyTavern's prompt
 * copy of the chat (coreChat: shallow copies of the messages, so the saved chat, its swipes and what the player sees
 * are never touched):
 *  - the presentation layer's retired tracker blocks (<Blocks>, <World_State>, <Character_Sheet>, <New_NPC>,
 *    <NPC_Update>) are removed from every earlier reply, so old saves stop feeding them back to the narrator;
 *  - only the last `keepTurns` player messages stay, each with its reply; the current message counts (4 keeps it and
 *    the three exchanges before it). Older turns reach the narrator through the engine block (NPC cards, retrieved
 *    memories, facts, quests, threads). keepTurns 0 keeps the whole history.
 * @returns {{removed: number, stripped: number}}
 */
export function projectPromptHistory(messages, { keepTurns = 4 } = {}) {
    let stripped = 0;
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m || m.is_user || typeof m.mes !== 'string' || !hasTrackerBlocks(m.mes)) continue;
        messages[i] = { ...m, mes: stripTrackerBlocks(m.mes) };
        stripped += 1;
    }
    let removed = 0;
    if (keepTurns > 0) {
        const users = messages.map((m, i) => (m?.is_user ? i : -1)).filter((i) => i >= 0);
        if (users.length > keepTurns) {
            removed = users[users.length - keepTurns];
            messages.splice(0, removed);
        }
    }
    return { removed, stripped };
}
