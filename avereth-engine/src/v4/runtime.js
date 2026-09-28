// Runtime V4 on a chat transcript (docs/RUNTIME_V4_PLAN.md §3): the host side of a V4 campaign. The same message
// records as V3 (src/host.js): the events of a player message on that message, the events of a reply on its swipe. The
// LLM calls are the host's; this module gets them as an injected function, so the whole flow runs in the Node tests
// with scripted answers exactly as in SillyTavern (index.js passes a generateRaw-like call):
//
//   llm({messages, purpose, temperature, maxTokens}) -> Promise<string>   (throws or returns null on failure)
//
//   before the narrator   prepareGenerationAsync: interpreter -> agency guard -> (Board generator) -> command handlers
//   after the reply       processReplyV4 (prose only, extraction pending) -> runExtraction (extractor, firewall, world)
//                         -> runBoardAfterArrival (a Guild hall reached: its board, canonical first)
//   barrier               the next player message waits for the reply's extraction; whatever is not committed by
//                         then is recorded as a gap (extract.failed "late") and the late answer is dropped
//
// A V3 campaign never reaches this module's V4 branches: prepareGenerationAsync and processReplyAny hand it to host.js.
import {
    rec, setRec, foldChat, hasCampaign, lastUserIndex, lastPlayerIndex, lastReplyIndex, prepareGeneration, processReply,
    turnBlock, laterTurns, showPanel, messageEvents,
} from '../host.js';
import { playerTurn } from '../engine.js';
import { loreKeys } from '../context.js';
import { extractReport } from '../delta.js';
import { renderHud } from '../hud.js';
import { worldPanel } from '../display.js';
import { applyEvent } from '../state.js';
import { hash32, clone, swapWords, stripTrackerBlocks } from '../util.js';
import { routeTurn, playerTurnV4, replyTurnV4 } from './turn.js';
import { buildCatalog, extractorCatalog, guardContext } from './catalog.js';
import { interpreterRequest, parseInterpretation, INTERPRETER_VERSION } from './interpret.js';
import { guardCommands } from './agency.js';
import { extractorRequest, parseExtraction, EXTRACTOR_VERSION } from './extract.js';
import { boardNeed, boardRequest, parseBoard, bookBoard, BOARD_VERSION } from './guild.js';
import { extractionFailedEvents } from './world.js';
import { hallOf, settlementOf, membership, boardKey, today, listingsOf, supportedRanks } from './domain.js';

export const RECORD_V4 = 3;
export const LLM = {
    interpret: { temperature: 0.1, maxTokens: 2500 },
    extract: { temperature: 0.1, maxTokens: 2500 },
    board: { temperature: 0.6, maxTokens: 3000 },
};
export const LATE_CORRECTION = 'The engine could not record what your last reply established (it was not read in time): nothing of it changed the game state. The state above is authoritative.';
export const FAILED_CORRECTION = 'The engine could not read what your last reply established: nothing of it changed the game state. The state above is authoritative.';

/** The runtime a chat's campaign started with ('v4' or 'v3'); null without a campaign. */
export function campaignRuntime(chat) {
    for (const m of chat) {
        const e = messageEvents(m).find((x) => x.t === 'campaign.started');
        if (e) return e.d.runtime || 'v3';
    }
    return null;
}

async function ask(llm, messages, purpose) {
    const t0 = Date.now();
    try {
        const content = await llm({ messages, purpose, ...(LLM[purpose.replace(/_repair$/, '')] || {}) });
        if (content === null || content === undefined) return { ok: false, error: 'no answer', ms: Date.now() - t0 };
        return { ok: true, content: String(content), ms: Date.now() - t0 };
    } catch (err) {
        return { ok: false, error: String(err?.message || err).slice(0, 200), ms: Date.now() - t0 };
    }
}

// ------------------------------------------------------------------------------------------------ interpreter
/** The interpreter call with its one repair (plan §3.4). */
export async function interpretMessage(llm, content, catalog, text) {
    const vocab = content.commandVocab;
    const req = interpreterRequest(vocab, catalog, text);
    const first = await ask(llm, req.messages, 'interpret');
    let ms = first.ms;
    if (!first.ok) return { commands: null, failed: true, error: first.error, ms, repaired: false };
    let p = parseInterpretation(first.content, vocab, catalog);
    let repaired = false;
    if (!p.commands) {
        const rep = interpreterRequest(vocab, catalog, text, { previous: first.content, errors: p.errors });
        const second = await ask(llm, rep.messages, 'interpret_repair');
        ms += second.ms;
        repaired = true;
        if (second.ok) p = parseInterpretation(second.content, vocab, catalog);
    }
    return p.commands ? { commands: p.commands, failed: false, error: null, ms, repaired, raw: p.raw } : { commands: null, failed: true, error: (p.errors || []).join('; ').slice(0, 200) || 'invalid answer', ms, repaired };
}

// ------------------------------------------------------------------------------------------------ board
/**
 * The board a message reads (board.read), before the narrator describes it: in the Guild hall he is in, or in the one
 * an earlier go of the same message leads to; rank as named, else his rank after an earlier registration in the message.
 */
export function boardFor(state, content, commands) {
    const read = commands.find((c) => c.type === 'board.read');
    if (!read) return null;
    let hall = hallOf(state, state.scene.at);
    if (!hall) {
        const go = commands.filter((c) => c.type === 'go' && c.seq < read.seq && typeof c.to === 'string').map((c) => hallOf(state, c.to)).filter(Boolean).at(-1);
        hall = go || null;
    }
    if (!hall) return null;
    const branch = settlementOf(state, hall);
    const registers = commands.some((c) => c.seq < read.seq && (c.type === 'offer.accept' || c.type === 'pay' || c.type === 'guild.register'));
    const rank = read.rank || membership(state)?.rank || (registers ? 'Novice' : 'Novice');
    if (!supportedRanks(state, content, branch).includes(rank)) return null;
    const board = state.guild.boards[boardKey(branch, rank)];
    if (board && board.day >= today(state)) return null;
    const size = content.rules.guild.board?.size ?? 5;
    const have = listingsOf(state, branch, rank);
    const missing = size - have.length;
    return missing > 0 ? { branch, rank, missing, day: today(state), have: have.map((q) => q.title) } : null;
}

/** The Board generator with its one retry; listings validated (plan §6.4). A failure books nothing. */
export async function generateBoard(llm, state, content, need) {
    const req = boardRequest(state, content, need);
    let ms = 0;
    let last = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        const a = await ask(llm, attempt ? [...req.messages, { role: 'assistant', content: String(last?.answer || '') }, { role: 'user', content: `That answer was not valid: ${(last?.errors || ['no answer']).join('; ')}. Answer again with only the corrected JSON object.` }] : req.messages, 'board');
        ms += a.ms;
        if (!a.ok) { last = { errors: [a.error] }; continue; }
        const p = parseBoard(a.content, content, need);
        if (p.listings && p.listings.length) return { ...need, listings: p.listings, refused: p.refused, ms, version: BOARD_VERSION };
        last = { answer: a.content, errors: p.errors.length ? p.errors : ['no valid listing'] };
    }
    return { ...need, listings: [], failed: (last?.errors || ['failed']).join('; ').slice(0, 200), ms, version: BOARD_VERSION };
}

// ------------------------------------------------------------------------------------------------ before the narrator
/**
 * The previous reply's extraction still pending when the next player turn is resolved: a gap (plan §3.4). Its record
 * says so, and its correction reaches the next engine block; an answer that comes later is dropped (laterTurns).
 */
function closeLatePending(chat, u) {
    const p = lastReplyIndex(chat, u);
    const r = p >= 0 ? rec(chat[p]) : null;
    if (!r || r.extraction?.status !== 'pending' || r.text_hash !== hash32(chat[p].mes)) return false;
    setRec(chat[p], { ...r, events: extractionFailedEvents('late: the next turn began before the reply was read'), extraction: { ...r.extraction, status: 'late' }, corrections: [LATE_CORRECTION] });
    return true;
}

/**
 * Before a generation: V3 campaigns as prepareGeneration (host.js). A V4 campaign resolves the latest player message
 * once (stored on it, so swipes and regenerations reuse the interpretation, the board and the dice): V3-routed turns
 * (commands, creation, combat, stealth) through the V3 engine, story turns through interpreter and handlers.
 * @returns the same shape as prepareGeneration
 */
export async function prepareGenerationAsync(chat, content, { type = 'normal', settings = {}, llm = null } = {}) {
    if (type === 'quiet' || type === 'impersonate') return { action: 'clear', dirty: false };
    if (!hasCampaign(chat)) return { action: 'none', dirty: false };
    if (campaignRuntime(chat) !== 'v4') return prepareGeneration(chat, content, { type, settings });
    const u = lastPlayerIndex(chat);
    if (u < 0) return { action: 'none', dirty: false };
    const msg = chat[u];
    let dirty = false;
    let r = rec(msg);
    const inputHash = hash32(msg.mes);
    // an interpretation that failed is not cached: Regenerate asks again (plan §3.4); neither is a Board generation that
    // failed: a new generation of the same message asks for the board again, with the interpretation it came with
    const retryBoard = !!r && r.route === 'v4' && r.input_hash === inputHash && !r.interp?.failed && !!r.board?.failed;
    if (type !== 'continue' && (!r || r.input_hash !== inputHash || r.interp?.failed || retryBoard)) {
        if (closeLatePending(chat, u)) dirty = true;
        const before = foldChat(chat, u).state;
        if (routeTurn(before, content, msg.mes) === 'v3') {
            const t = playerTurn(before, content, msg.mes, { msg: u });
            r = { v: RECORD_V4, input_hash: inputHash, route: 'v3', events: t.events, command: t.command ? { panels: t.command.panels, llm: t.command.llm } : null };
        } else {
            if (typeof llm !== 'function') throw new Error('Runtime V4 needs an LLM call for the interpreter');
            const catalog = buildCatalog(before, content);
            const ip = retryBoard ? { commands: r.interp.commands, ms: 0, repaired: !!r.interp.repaired, failed: false } : await interpretMessage(llm, content, catalog, msg.mes);
            const guarded = ip.commands ? guardCommands(msg.mes, ip.commands, guardContext(before, content, catalog)) : { kept: [], dropped: [] };
            const need = ip.failed ? null : boardFor(before, content, guarded.kept);
            const board = need ? await generateBoard(llm, before, content, need) : null;
            const t = playerTurnV4(before, content, msg.mes, {
                msg: u, commands: guarded.kept, dropped: guarded.dropped, board,
                interp: { version: INTERPRETER_VERSION, ms: ip.ms, source: ip.repaired ? 'json_repaired' : 'json', failed: ip.failed, error: ip.error },
            });
            r = {
                v: RECORD_V4, input_hash: inputHash, route: 'v4',
                interp: { version: INTERPRETER_VERSION, ms: ip.ms, failed: ip.failed, repaired: ip.repaired, commands: ip.commands, error: ip.error || undefined },
                board: board ? { branch: board.branch, rank: board.rank, ms: board.ms, failed: board.failed || undefined, listings: board.listings.length } : undefined,
                events: t.events, command: t.command ? { panels: t.command.panels, llm: null } : null,
            };
        }
        setRec(msg, r);
        dirty = true;
    }
    if (r?.command && !r.command.llm) {
        if (r.command.posted) return { action: 'abort', dirty };
        r.command.posted = true;
        setRec(msg, r);
        return { action: 'panels', panels: r.command.panels, index: u, dirty: true };
    }
    const { state, errors, context } = turnBlock(chat, u, content, settings);
    return { action: 'context', context, loreKeys: loreKeys(state, content), dirty, errors };
}

// ------------------------------------------------------------------------------------------------ after the reply
function display(msg, content, before, reply, hud) {
    const panel = worldPanel(before, content, reply);
    const view = renderHud(reply.state || before, content, hud);
    showPanel(msg, panel, view);
    return { panel: panel || undefined, hud: view || undefined };
}

/**
 * A reply was received: V3 campaigns as processReply (host.js). In a V4 campaign the reply is prose only (a stray
 * <avereth> block or tracker is removed) and its world waits for the extractor: extraction 'pending'.
 * @returns {{changed: boolean, extract?: boolean, result?: object}}
 */
export function processReplyAny(chat, id, content, opts = {}) {
    if (campaignRuntime(chat) !== 'v4') return processReply(chat, id, content, opts);
    const msg = chat[id];
    if (!msg || msg.is_user || msg.is_system) return { changed: false };
    const r = rec(msg);
    if (r && r.text_hash === hash32(msg.mes)) return { changed: false };
    const u = lastUserIndex(chat, id);
    if (u < 0) return { changed: false };
    const clean = extractReport(msg.mes).clean;
    msg.mes = swapWords(opts.stripTrackers === false ? clean : stripTrackerBlocks(clean), opts.swaps || []);
    if (rec(chat[u])?.command?.llm) {
        setRec(msg, { v: RECORD_V4, events: [], system_answer: true, text_hash: hash32(msg.mes) });
        return { changed: true };
    }
    const { state } = foldChat(chat, id);
    const view = display(msg, content, state, { pending: true }, opts.hud || 'closed');
    setRec(msg, { v: RECORD_V4, events: [], text_hash: hash32(msg.mes), extraction: { status: 'pending', version: EXTRACTOR_VERSION }, corrections: [], ...view });
    return { changed: true, extract: true };
}

/** The extractor's request for reply id, or null when there is nothing to read (not pending, changed, too late). */
export function extractionRequest(chat, id, content) {
    const msg = chat[id];
    const r = rec(msg);
    if (!msg || !r || r.extraction?.status !== 'pending' || r.text_hash !== hash32(msg.mes) || laterTurns(chat, id)) return null;
    const { state } = foldChat(chat, id);
    const o = state.last?.outcome || {};
    const gos = (o.auth?.gos || []).map((g) => g.to).filter(Boolean);
    const cat = extractorCatalog(state, content, { extraPlaces: gos });
    const actions = o.kind === 'v4' ? [...o.actions, ...(o.extra || [])].join('\n')
        : o.kind === 'combat' ? 'COMBAT — the engine resolved this round (attacks, damage, movement); report only what else the reply established.'
            : o.kind === 'check' ? `CHECK — the engine resolved: ${o.check?.label || 'a check'}, ${o.check?.success ? 'success' : 'failure'}.`
                : 'NOTHING TO BOOK — Alaric decided nothing the engine resolves.';
    const expectedKeys = o.expected_keys || {};
    const req = extractorRequest(content.deltaVocab, { catalog: cat.text, actions, expectedKeys, reply: msg.mes });
    return { ...req, hash: r.text_hash, expectedKeys, ids: { places: cat.places, quests: cat.quests, objects: cat.objects }, catalog: cat.text, actions };
}

/**
 * Read reply id with the extractor (one repair; one more call if still invalid) and commit its world: firewall, world
 * handlers, display. A reply that changed meanwhile, or a later turn already resolved, is left alone.
 * @returns {{changed: boolean, applied?: boolean, failed?: string, boardNeeded?: boolean, late?: boolean}}
 */
export async function runExtraction(chat, id, content, llm, { hud = 'closed' } = {}) {
    const req = extractionRequest(chat, id, content);
    if (!req) return { changed: false };
    const vocab = content.deltaVocab;
    let ms = 0;
    let parsed = null;
    let repaired = false;
    let error = null;
    for (let attempt = 0; attempt < 2 && !(parsed?.valid && parsed.complete); attempt++) {
        const a = await ask(llm, req.messages, 'extract');
        ms += a.ms;
        if (!a.ok) { error = a.error; continue; }
        let p = parseExtraction(a.content, vocab, req.ids, req.expectedKeys);
        if (!(p.valid && p.complete)) {
            const rep = extractorRequest(vocab, { catalog: req.catalog, actions: req.actions, expectedKeys: req.expectedKeys, reply: chat[id].mes }, { previous: a.content, errors: p.errors });
            const b = await ask(llm, rep.messages, 'extract_repair');
            ms += b.ms;
            repaired = true;
            if (b.ok) {
                const p2 = parseExtraction(b.content, vocab, req.ids, req.expectedKeys);
                if (p2.valid && (p2.complete || !p.valid)) p = p2;
            }
        }
        if (p.valid) parsed = p;
        else error = p.errors.join('; ').slice(0, 200);
    }
    return applyExtraction(chat, id, content, parsed, { hash: req.hash, ms, repaired, error, hud });
}

/** Commit an extractor result (or its failure) to reply id; refused when the reply changed or a later turn began. */
export function applyExtraction(chat, id, content, parsed, { hash, ms = null, repaired = false, error = null, hud = 'closed' } = {}) {
    const msg = chat[id];
    const r = rec(msg);
    if (!msg || !r || r.extraction?.status !== 'pending' || r.text_hash !== hash || hash32(msg.mes) !== hash) return { changed: false };
    if (laterTurns(chat, id)) return { changed: false, late: true };
    const { state } = foldChat(chat, id);
    if (!parsed?.valid) {
        const events = extractionFailedEvents(error || 'no valid answer', ms);
        const view = display(msg, content, state, { failed: `the extractor gave no valid answer (${String(error || 'no answer').slice(0, 80)})`, state }, hud);
        setRec(msg, { ...r, events, extraction: { status: 'failed', version: EXTRACTOR_VERSION, ms, repaired, error: String(error || '').slice(0, 200) }, corrections: [FAILED_CORRECTION], ...view });
        return { changed: true, applied: false, failed: error || 'no valid answer' };
    }
    const res = replyTurnV4(state, content, parsed.value, { msg: id, prose: msg.mes, ms, repaired });
    const corrections = [...res.corrections];
    if (!parsed.complete) corrections.push(`Your last reply left open what happened to: ${parsed.missing.map((k) => `action ${k}`).join(', ')}; the engine treats it as not done.`);
    const needBoard = !!res.arrivedHall && !!boardNeed(res.state, content);
    const view = display(msg, content, state, res, hud);
    setRec(msg, {
        v: RECORD_V4, events: res.events, text_hash: hash, corrections,
        extraction: { status: 'applied', version: EXTRACTOR_VERSION, ms, repaired, deltas: (parsed.value.deltas || []).length, missing: parsed.missing.length ? parsed.missing : undefined, raw: parsed.value, board: needBoard ? 'pending' : undefined },
        rejected: res.rejected.length ? res.rejected : undefined, system: res.system.length ? res.system : undefined, ...view,
    });
    return { changed: true, applied: true, boardNeeded: needBoard };
}

/**
 * Alaric reached a Guild hall in reply id: its board is generated now, in the background (plan §6.4), so a later look
 * does not wait. The listings are canon from here on; the events join the reply's record. A failure is only noted:
 * the next board.read tries again (blocking).
 */
export async function runBoardAfterArrival(chat, id, content, llm, { hud = 'closed' } = {}) {
    const msg = chat[id];
    const r = rec(msg);
    if (!r || r.extraction?.board !== 'pending' || laterTurns(chat, id)) return { changed: false };
    const hash = r.text_hash;
    const { state } = foldChat(chat, id + 1);
    const need = boardNeed(state, content);
    if (!need) {
        setRec(msg, { ...r, extraction: { ...r.extraction, board: undefined } });
        return { changed: true };
    }
    const board = await generateBoard(llm, state, content, need);
    const now = rec(chat[id]);
    if (!now || now.text_hash !== hash || hash32(chat[id].mes) !== hash || laterTurns(chat, id)) return { changed: false };
    const s = clone(state);
    const events = [];
    if (board.listings.length) bookBoard(s, content, need, board.listings, (e) => { applyEvent(s, e); events.push(e); });
    else {
        const e = { t: 'board.failed', d: { branch: need.branch, rank: need.rank, error: board.failed } };
        applyEvent(s, e);
        events.push(e);
    }
    const before = foldChat(chat, id).state;
    const view = display(chat[id], content, before, { events: [...now.events, ...events], state: s, system: now.system || [], rejected: now.rejected || [] }, hud);
    setRec(chat[id], { ...now, events: [...now.events, ...events], extraction: { ...now.extraction, board: board.listings.length ? 'booked' : 'failed' }, ...view });
    return { changed: true, booked: board.listings.length };
}

/** The reply whose extraction a reload or a chat switch cut off (index.js resumes it), or -1. */
export function pendingExtraction(chat) {
    const id = chat.findLastIndex((m) => !m.is_user && !m.is_system);
    const r = id >= 0 ? rec(chat[id]) : null;
    if (r && (r.extraction?.status === 'pending' || r.extraction?.board === 'pending') && r.text_hash === hash32(chat[id].mes) && !laterTurns(chat, id)) return id;
    return -1;
}

/** An edited reply of a V4 campaign keeps what its extraction committed (typo fixes); no retcon through tags. */
export function onEditedV4(chat, id) {
    const msg = chat[id];
    const r = rec(msg);
    if (!msg || msg.is_user || !r) return { changed: false };
    setRec(msg, { ...r, text_hash: hash32(msg.mes) });
    if (r.panel || r.hud) showPanel(msg, r.panel, r.hud);
    return r.panel || r.hud ? { changed: true, text: true } : { changed: true };
}
