import { chosenKnownRoute, explicitJourneyClause, knownRoutes } from './known_routes.js';
import {SurrenderTransferError} from './commands.js';
import {negotiationExtraction,reactionError,describeTerms} from './surrender.js';
import {extractJsonObject} from './json.js';
import { activeMessage, bindGeneratedReply, previousRevision, reconcileRevisions, rememberRevision } from './revisions.js';
import { plannedNegotiation, actionInputOf, actionInputHash, actionPrefix, validateActionSelection, reconcileHudPlan } from '../action_input.js';
import { boardRepairGuidance, boardSlotRepair, parseBoardSlot, parseInitialBoard } from './guild.js';
import { hasPartyTerms } from '../party.js';
import { partyControl } from './party_actions.js';
import { nativeAction } from './native_actions.js';
import { movementEvidence } from './narration_evidence.js';
import { ordinaryChoice, localApproach } from './travel_continuation.js';
import { placeKey } from './place_refs.js';
import { worldVocab } from './extract.js';
// Runtime V4 on a chat transcript (docs/RUNTIME_V4_PLAN.md §3): the host side of a V4 campaign. The same message
// records as V3 (src/host.js): the events of a player message on that message, the events of a reply on its swipe. The
// LLM calls are the host's; this module gets them as an injected function, so the whole flow runs in the Node tests
// with scripted answers exactly as in SillyTavern (index.js passes a generateRaw-like call):
//
//   llm({messages, purpose, temperature, maxTokens}) -> Promise<string | {content, finish_reason?, usage?}>
//                                                       (throws or returns null on failure; Patch 8.2: the object form
//                                                       carries what the provider reported, kept as telemetry: callMeta)
//
//   before the narrator   prepareGenerationAsync: interpreter -> agency guard -> (Board generator) -> command handlers
//   after the reply       processReplyV4 (prose only, extraction pending) -> runExtraction (extractor, firewall, world)
//   barrier               the host waits for the current extraction/repair before starting the next normal turn.
//                         closeLatePending remains a safety net for reloads/out-of-band calls that bypass that host job.
//
// A V3 campaign never reaches this module's V4 branches: prepareGenerationAsync and processReplyAny hand it to host.js.
import {
    rec, setRec, foldChat, foldBlock, hasCampaign, lastUserIndex, lastPlayerIndex, lastReplyIndex, prepareGeneration, processReply,
    turnBlock, laterTurns, showPanel, syncSwipe, messageEvents, foldStats, inputRecordError,
} from '../host.js';
import { negotiationReaction, playerTurn } from '../engine.js';
import { recordLine, loreKeys } from '../context.js';
import { extractReport } from '../delta.js';
import { renderHud, boardView } from '../hud.js';
import { worldPanel } from '../display.js';
import { applyEvent } from '../state.js';
import { hash32, clone, swapWords, stripTrackerBlocks } from '../util.js';
import { playerTurnV4, replyTurnV4 } from './turn.js';
import { readTurn, irRecord, interpretedActs, IR_VERSION } from '../ir.js';
import { buildCatalog, extractorCatalog, guardContext } from './catalog.js';
import { interpreterRequest, parseInterpretation, INTERPRETER_VERSION } from './interpret.js';
import { guardCommands } from './agency.js';
import { COMPACT, extractorRequest, parseExtraction, EXTRACTOR_VERSION } from './extract.js';
import { boardRequest, parseBoard, bookBoard, BOARD_VERSION, COUNT_BOARD_PROFILE } from './guild.js';
import { extractionFailedEvents } from './world.js';
import { hallOf, settlementOf, membership, boardKey, today, listingsOf, supportedRanks, placeName } from './domain.js';
import { trueDungeonOf } from './dungeon.js';
import { finalizeGrowth, growthDrafts, activationsOf } from './growth.js';
import { FORGE_VERSION, forgeRequest, parseForge, passiveForgeRequest, parsePassiveForge } from './forge.js';
import { passiveDrafts, offerPassives, deedEvidence } from './passive_growth.js';
import { skillDrafts, offerSkills, skillEvidence } from './skill_growth.js';
import { classDrafts, offerClass } from './class_growth.js';
import { developmentFeats } from './feats.js';
import { classForgeRequest, parseClassForge } from './forge.js';
import { PLANNER_VERSION, MECH_TYPES, planContext, withContentSkills, plannerRequest, parsePlan, mapPlan, recentText, announcedAbandon, ineffectiveMoves } from './planner.js';
import { crowdCount, personWords, bystanderEvents } from './settlement.js';
import { combatChronicle, chronicleLine } from './combat_truth.js';
import { skillOf, rulesetOf } from '../content.js';

export const RECORD_V4 = 3;
// 4.3.0-c.6.6.51 (live 23.10.2026 11:07): the planner's reasoning used up its 900 tokens on a message of three steps, in
// the first call and in its repair (no answer left: no story turn); the extractor its 2500 once. The Forge, at 900 as the
// planner, gets room as well. A repair asks with the budget of its call (ask below)
export const LLM = {
    interpret: { temperature: 0.1, maxTokens: 2500 },
    extract: { temperature: 0.1, maxTokens: 4000 },
    board: { temperature: 0.6, maxTokens: 3000 },
    plan: { temperature: 0.1, maxTokens: 2000 },
    forge: { temperature: 0.6, maxTokens: 1500 },
};
export const LATE_CORRECTION = 'The engine could not record what your last reply established (it was not read in time): nothing of it changed the game state. The state above is authoritative.';
export const FAILED_CORRECTION = 'The engine could not read what your last reply established: nothing of it changed the game state. The state above is authoritative.';
/**
 * 4.3.0-c.6.6.53 (live 23.10.2026 20:56: the reply that took him into the Mossback Warrens was not read, he stayed before
 * its gate, and the next reply went on inside, with goblins): where he still is after a reply the engine could not read,
 * a Dungeon's root as before its gate.
 */
export function stillAt(state) {
    const at = state.scene?.at;
    if (!at || !state.places?.[at]) return null;
    const gate = trueDungeonOf(state, at) === at && !!state.dungeons?.[at];
    return `${state.entities?.pc?.name || 'Alaric'} is still at ${placeName(state, at)}${gate ? ', before its gate: not inside it' : ''}.`;
}
// Patch 8.2: the System line under a reply that arrived without story text (no cause is claimed: generateRaw and the
// narrator's own generation report none)
export const EMPTY_REPLY_NOTICE = 'NO STORY TEXT — the narrator\'s reply arrived empty, so nothing was read from it. The engine\'s results of this turn stand as shown above. Swipe or regenerate the reply for the story.';

/** The runtime a chat's campaign started with ('v4' or 'v3'); null without a campaign. */
export function campaignRuntime(chat) {
    for (const m of chat) {
        const e = messageEvents(m).find((x) => x.t === 'campaign.started');
        if (e) return e.d.runtime || 'v3';
    }
    return null;
}

/**
 * Architecture patch B1 (.130): the one campaign protocol this build continues, read from the campaign's own
 * campaign.started record (the reducer keeps only part of it in state.meta): Runtime V4, path C, Ruleset 2, no formal
 * private quests, a readable start build without the retired F switches (FLAGLESS_SINCE), and since package C a start
 * build from CONTRACT_SINCE on (the .126 configuration B1 still continued holds creatures of the earlier reading). Anything
 * else is refused before any new step; no migration, no new field.
 */
export const FLAGLESS_SINCE = '4.3.0-c.6.6.130';
/**
 * Package C (.132): the first build of the population and age contract of creatures (src/v4/population.js). It is the
 * minimum start build of a continued campaign: an earlier campaign holds creatures and hunts of the earlier reading
 * (membership by name, only inside the level window) and is refused, never silently reinterpreted.
 */
export const CONTRACT_SINCE = '4.3.0-c.6.6.132';

/** "4.3.0-c.6.6.130" -> [4, 3, 0, 6, 6, 130], compared numerically; null when unreadable. */
export function parseBuild(version) {
    const m = /^(\d+)\.(\d+)\.(\d+)-c\.(\d+)\.(\d+)\.(\d+)$/.exec(String(version ?? ''));
    return m ? m.slice(1).map(Number) : null;
}

export function compareBuilds(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
    return 0;
}

/** The campaign.started record of the chat, read from the stored record itself: an edited greeting (its text no longer
 * matching the record) must not hide which protocol the campaign was started on. */
export function campaignStart(chat) {
    for (const m of chat) {
        const e = (rec(m)?.events || []).find((x) => x?.t === 'campaign.started');
        if (e) return e.d || {};
    }
    return null;
}

/** null when the chat holds no campaign yet or a supported one; else why not, and the notice the host shows. */
export function campaignSupport(chat) {
    const d = campaignStart(chat);
    if (!d) return null;
    const build = parseBuild(d.engine_version);
    const flags = ['f_progression', 'f_balance', 'starter_aoe'];
    const set = flags.filter((k) => d[k] === true);
    const why = (d.runtime || 'v3') !== 'v4' ? 'it was started on Runtime V3'
        : d.path !== 'c' ? `it plays ${d.path === 'a' ? 'the retired path A (interpreter)' : 'no pinned planner path'}`
            : d.ruleset !== 2 ? `it plays Ruleset ${d.ruleset ?? 1}`
                : d.private_quests !== false ? 'it was started with formal private quests'
                    : !build ? 'its start build is missing or unreadable'
                        : set.length || compareBuilds(build, parseBuild(FLAGLESS_SINCE)) < 0 ? 'it was started with an older F rule configuration'
                            : compareBuilds(build, parseBuild(CONTRACT_SINCE)) < 0 ? `it was started before the population and age contract of build ${CONTRACT_SINCE}`
                                : null;
    if (!why) return null;
    return {
        reason: why,
        notice: `UNSUPPORTED CAMPAIGN — ${why} (start build ${d.engine_version || 'unknown'}). This build continues only campaigns of`
            + ' the current V4-C / Ruleset 2 protocol. Nothing was booked, saved or sent to a model. Start a new chat for a new'
            + ' campaign, or finish this one on the build it was started with.',
    };
}

/**
 * Patch 7.2: the path a V4 campaign plays on, 'c' (the semantic planner, the product path) or 'a' (the interpreter of
 * Runtime V4-A). A campaign started from 4.3.0-c.6.6.21 on keeps the path it started with (campaign.started path), so
 * a later change of the setting never moves a running game to another path. A campaign started before has none and
 * follows `unpinned` as it always did: the planner setting as it stood before 7.2 (index.js keeps it as legacyPlanner).
 * @returns {'c'|'a'|null} null without a V4 campaign
 */
export function campaignPath(chat, unpinned) {
    if (campaignRuntime(chat) !== 'v4') return null;
    for (const m of chat) {
        const e = messageEvents(m).find((x) => x.t === 'campaign.started');
        if (e) return e.d.path === 'c' || e.d.path === 'a' ? e.d.path : unpinned ? 'c' : 'a';
    }
    return unpinned ? 'c' : 'a';
}

/**
 * Patch 8.2 (live 21.10.2026 13:33: the extractor's median went from 4 s to 23 s with prompts 1.6 % longer): one LLM
 * call as the record keeps it (plan, interp, board, extraction: technical telemetry, never a game event): its purpose,
 * its time, and what the provider reported of it — why it ended and the tokens it counted. Nothing is estimated: a
 * plain string answer (SillyTavern's generateRaw, the tests' scripted calls) carries no more than purpose and time.
 */
export function callMeta(purpose, ms, answer = null) {
    const call = { purpose, ms };
    if (!answer || typeof answer !== 'object') return call;
    if (typeof answer.finish_reason === 'string') call.finish = answer.finish_reason;
    const u = answer.usage && typeof answer.usage === 'object' ? answer.usage : {};
    const count = {
        prompt: u.prompt_tokens, cached: u.prompt_tokens_details?.cached_tokens ?? u.cached_tokens,
        completion: u.completion_tokens, reasoning: u.completion_tokens_details?.reasoning_tokens,
    };
    for (const [k, v] of Object.entries(count)) if (Number.isFinite(v)) call[k] = v;
    return call;
}

/**
 * One LLM call. The host's call answers a string, or (Patch 8.2, index.js v4Llm on a custom endpoint) an object
 * {content, finish_reason, usage}; both are read the same way, and `call` keeps what was reported (callMeta).
 */
async function ask(llm, messages, purpose, overrides = {}) {
    const t0 = Date.now();
    try {
        const base = purpose.replace(/_(?:repair|recovery)$/, '');
        const answer = await llm({ messages, purpose, ...(LLM[base] || {}), ...overrides });
        const text = answer && typeof answer === 'object' ? answer.content : answer;
        const call = callMeta(purpose, Date.now() - t0, answer);
        if (text === null || text === undefined) return { ok: false, retryable: true, error: 'no answer', ms: call.ms, call };
        return { ok: true, content: String(text), ms: call.ms, call };
    } catch (err) {
        const ms = Date.now() - t0;
        // A settled browser-fetch rejection before Planner execution is known nonexecution, not an arbitrary
        // TypeError. The adapter supplies this provenance; a matching message alone never grants continuation.
        const fetchFailure = /^plan(?:_|$)/.test(purpose) && err?.code === 'LLM_TRANSPORT'
            && err.phase === 'fetch' && err.settled === true;
        const kind = ({ LLM_TIMEOUT: 'timeout', LLM_CANCELLED: 'cancelled', LLM_PROVIDER: 'provider', LLM_CAPACITY_BLOCKED:'remote_unknown' })[err?.code]
            || (err?.name === 'AbortError' ? 'aborted' : 'transport');
        const status = Number(err?.status) || null;
        const retryable = err?.code !== 'LLM_CAPACITY_BLOCKED' && !['cancelled', 'aborted'].includes(kind) && (kind !== 'provider' || (typeof err?.retryable === 'boolean' ? err.retryable : status === 408 || status === 429 || status >= 500));
        return { ok: false, retryable, error: String(err?.message || err).slice(0, 200), ms, call: { purpose, ms, error: true, error_kind: kind, ...(kind === 'provider' ? { provider_retryable: retryable, ...(err.provider_code ? { provider_code: err.provider_code } : {}), ...(err.provider_type ? { provider_type: err.provider_type } : {}) } : {}), ...(fetchFailure ? { transport_phase: 'fetch', transport_settled: true } : {}), ...(!fetchFailure && !['LLM_TIMEOUT','LLM_PROVIDER','LLM_CANCELLED','LLM_CAPACITY_BLOCKED'].includes(err?.code) && err?.name !== 'AbortError' ? {unclassified:true} : {}), ...(status ? { status } : {}) } };
    }
}

// ------------------------------------------------------------------------------------------------ interpreter
export const PLAN_RAN_OUT = 'Your previous answer was empty: it ran out of room before the JSON. Answer the PLAYER MESSAGE now with the JSON object alone, at once and short: {"commands":[...]} with every mechanical action he takes in this message, {"commands":[]} only when he takes none. Do not deliberate; no prose.';

/** The interpreter call with its one repair (plan §3.4). */
export async function interpretMessage(llm, content, catalog, text) {
    const vocab = content.commandVocab;
    const req = interpreterRequest(vocab, catalog, text);
    const first = await ask(llm, req.messages, 'interpret');
    let ms = first.ms;
    const calls = [first.call];
    if (!first.ok) return { commands: null, failed: true, error: first.error, ms, repaired: false, calls };
    let p = parseInterpretation(first.content, vocab, catalog, { currency: content.rules.currency, text });
    let repaired = false;
    // Build .142 (§4.4): an answer that is valid but leaves a named price or coin without its evidence gets the same one
    // repair as a hint; its first commands stand if the repair brings no valid answer
    if (!p.commands || p.hints?.length) {
        const rep = interpreterRequest(vocab, catalog, text, { previous: first.content, errors: p.commands ? p.hints : p.errors });
        const second = await ask(llm, rep.messages, 'interpret_repair');
        ms += second.ms;
        calls.push(second.call);
        repaired = true;
        if (second.ok) {
            const q = parseInterpretation(second.content, vocab, catalog, { currency: content.rules.currency, text });
            if (q.commands || !p.commands) p = q;
        }
    }
    return p.commands ? { commands: p.commands, failed: false, error: null, ms, repaired, raw: p.raw, calls } : { commands: null, failed: true, error: (p.errors || []).join('; ').slice(0, 200) || 'invalid answer', ms, repaired, calls };
}

// ------------------------------------------------------------------------------------------------ planner (prototype C)
/** Prototype C (src/v4/planner.js): the planner call with its one repair, as the interpreter's. */
export async function planMessage(llm, content, ctx, text, { recent = '', isCurrent = () => true, moveHints = null } = {}) {
    const vocab = content.commandVocab;
    const req = plannerRequest(vocab, ctx, text, { recent });
    const first = await ask(llm, req.messages, 'plan');
    let ms = first.ms;
    const calls = [first.call];
    if (!first.ok) {
        if (!first.retryable) return { commands: null, failed: true, error: first.error, ms, repaired: false, raw: [], calls };
        // 10B-4c.4: unlike a malformed JSON answer, a transport failure has
        // supplied no Planner evidence. Give the same untouched request just
        // ONE more chance. No normal repair after that retry, no fourth call.
        // Swipes/chat changes must not spawn a doomed extra provider request.
        if (!isCurrent()) return { commands: null, failed: true, error: 'stale request', ms, repaired: false, raw: [], calls };
        const second = await ask(llm, req.messages, 'plan_recovery');
        ms += second.ms;
        calls.push(second.call);
        if (!second.ok) return { commands: null, failed: true, error: second.error, ms, repaired: true, recovery: 'transport', raw: [], calls };
        const p2 = parsePlan(second.content, vocab, ctx, text);
        const raw = [String(second.content).slice(0, 2000)];
        return p2.commands
            ? { travel_frame:p2.travel_frame, hud_binding:p2.hud_binding, hud_normalized:p2.hud_normalized, hud_conflict:p2.hud_conflict, commands: p2.commands, failed: false, error: null, ms, repaired: true, recovery: 'transport', raw, calls }
            : { commands: null, failed: true, error: (p2.errors || []).join('; ').slice(0, 200) || 'invalid answer', ms, repaired: true, recovery: 'transport', raw, calls };
    }
    const raw = [String(first.content).slice(0, 2000)];
    let p = parsePlan(first.content, vocab, ctx, text);
    let repaired = false;
    let recovery = null;
    let consentClarify = !!p.tradeConflict;
    let tradeNote = p.tradeConflict ? p.tradeNote || null : null;
    if (!p.commands) {
        if (!isCurrent()) return { commands: null, failed: true, error: 'stale request', ms, repaired: false, raw, calls };
        // .187 (P1f; natural batch 14.11.2026: 16 of 192 first plans were empty at the 2000-token cap, the budget spent on
        // reasoning; prompt size does not tell them apart): an answer that ran out of room before any JSON is told so,
        // not that its JSON was invalid, and asked for the short object at once – the same retry as the extractor's for
        // an empty answer. Same call, same budget; the bounded recovery below is unchanged
        const ranOut = !String(first.content).trim() && first.call?.finish === 'length';
        const rep = ranOut ? { messages: [...plannerRequest(vocab, ctx, text, { recent }).messages, { role: 'user', content: PLAN_RAN_OUT }] }
            : plannerRequest(vocab, ctx, text, { recent, previous: first.content, errors: p.errors });
        const second = await ask(llm, rep.messages, 'plan_repair');
        ms += second.ms;
        calls.push(second.call);
        repaired = true;
        if (second.ok) {
            raw.push(String(second.content).slice(0, 2000));
            p = parsePlan(second.content, vocab, ctx, text);
            consentClarify ||= !!p.tradeConflict;
            if (p.tradeConflict && p.tradeNote) tradeNote = p.tradeNote;
        }
        // 10B-4a: two reasoning-only/empty answers can exhaust the usual 2000-token
        // budget without returning any JSON. Make one fresh, bounded attempt with
        // more output room. Never manufacture commands or replay the player's turn.
        if (!p.commands && !first.content.trim() && second.ok && !second.content.trim()) {
            const fresh = plannerRequest(vocab, ctx, text, { recent });
            const messages = [...fresh.messages, { role: 'user', content:
                'Both previous attempts returned no JSON text. Answer the PLAYER MESSAGE now with exactly one short JSON object {"commands":[...]}. If the player takes no action, return {"commands":[]}. Return no prose.' }];
            recovery = 'empty';
            if (!isCurrent()) return { commands: null, failed: true, error: 'stale request', ms, repaired, raw, calls };
            const third = await ask(llm, messages, 'plan_recovery', { maxTokens: 4000 });
            ms += third.ms;
            calls.push(third.call);
            if (third.ok) {
                raw.push(String(third.content).slice(0, 2000));
                p = parsePlan(third.content, vocab, ctx, text);
            }
        }
    }
    // Build .142 (§4.4): a valid plan that leaves a named price or coin without its evidence gets the same one repair as
    // a hint; the first valid plan stands if the repair brings none (no further call)
    // .190 (4B): and a move that moves him relative to nobody (ineffectiveMoves) gets the same one repair
    if (p.commands && !repaired && moveHints) { const mh = moveHints(p.commands); if (mh.length) p = { ...p, hints: [...(p.hints || []), ...mh] }; }
    if (p.commands && p.hints?.length && !repaired) {
        if (!isCurrent()) return { commands: null, failed: true, error: 'stale request', ms, repaired, raw, calls };
        const rep = plannerRequest(vocab, ctx, text, { recent, previous: first.content, errors: p.hints });
        const second = await ask(llm, rep.messages, 'plan_repair');
        ms += second.ms;
        calls.push(second.call);
        repaired = true;
        if (second.ok) {
            raw.push(String(second.content).slice(0, 2000));
            const q = parsePlan(second.content, vocab, ctx, text);
            if (q.commands) p = q;
        }
    }
    // Build .144 (S2): the engine reads no second price out of his words. A price conflict of the first answer is not
    // resolved by a repair that only drops agreed_cp while his acceptance still names money: the conflict stands
    if (p.commands && consentClarify && (p.hints || []).some((h) => /^offer\.accept seq \d+: his acceptance names money/.test(h))) p = { ...p, commands: null };
    // Only schema-valid plans whose sole remaining errors concern trade consent may ask back.
    // Nothing from either rejected plan is executed, including dependent travel and sleep.
    if (!p.commands && consentClarify) return { commands: [{ seq: 1, type: 'clarify', about: 'action', question: tradeNote || 'Do you buy or sell, which goods, with whom, and at what total price? Nothing changes hands until clarified.', options: [] }], failed: false, error: null, ms, repaired, raw, calls };
    return p.commands ? { travel_frame:p.travel_frame, hud_binding:p.hud_binding, hud_normalized:p.hud_normalized, hud_conflict:p.hud_conflict, commands: p.commands, failed: false, error: null, ms, repaired, raw, calls, ...(recovery ? { recovery } : {}) } : { commands: null, failed: true, error: (p.errors || []).join('; ').slice(0, 200) || 'invalid answer', ms, repaired, raw, calls, ...(recovery ? { recovery } : {}) };
}

// The previous narration is useful for references even when its reported move was refused.
// Only an active, committed reply with no booked movement can qualify its own RECENT text.
function unbookedArrival(msg, state) {
    const r = rec(msg);
    if (!r?.text_hash || r.extraction?.status !== 'applied') return null;
    const events = messageEvents(msg); // excludes a record belonging to an inactive/edited reply
    if (events.some(e => e.t === 'scene.moved')) return null;
    const refused = events.filter(e => e.t === 'delta.rejected' && e.d.rule === 'no_go' && e.d.item?.type === 'arrive');
    if (!refused.length) return null;
    const to = refused.length === 1 ? refused[0].d.item.at : null;
    if (to === 'here' || to === state.scene.at) return null;
    return typeof to === 'string' && state.places[to] ? to : 'the reported destination';
}

/**
 * Prototype C: one free-text message read by the planner (settings.planner on). The result goes to the engine's
 * existing inputs (src/v4/planner.js mapPlan); the record has the same shape as A's, plus `plan`, so swipes and
 * regenerations reuse it exactly as they reuse the interpreter's (nothing is planned again for the same message).
 */
// A single GO may contain two explicit decisions. Split the organisational prefix only when
// the remainder is itself a chosen movement, so its agency proof quotes the actual traveller.
function splitPartyDeparture(state, input, commands) {
    if (commands.length !== 1 || commands[0].type !== 'go' || commands[0].needs != null ||
        /[?]|\b(?:if|unless|might|would|tomorrow)\b/i.test(input)) return commands;
    const parts = input.trim().match(/^(.+?)(?:,?\s+and\s+|[.;]\s*)((?:I|we|let(?:['’]s| us))\s+(?:go|walk|head|return|travel|set out)\b[^.!?]+)[.!]?$/i);
    if (!parts) return commands;
    const [, prefix, departure] = parts;
    let act, who;
    const follow = /^([^,]+),\s*(?:please\s+)?(?:follow me|come (?:along )?with me)(?: again)?$/i.exec(prefix);
    if (follow) {
        const matches = Object.values(state.party?.members || {}).filter(m => m.mode !== 'left' &&
            state.scene.present.includes(m.who) && state.entities[m.who]?.name?.toLowerCase() === follow[1].trim().toLowerCase());
        if (matches.length !== 1) return commands;
        act = 'follow';
        who = matches[0].who;
    } else if (/^I disband (?:my|our|the) party$/i.test(prefix)) {
        act = 'disband';
    } else return commands;
    return [{type:'party', seq:1, act, who, quote:prefix}, {...commands[0], seq:2, quote:departure}];
}

async function plannedTurn(chat, content, { u, before, ir, inputHash, llm, previous = null, isCurrent = () => true }) {
    const msg = chat[u];
    const p = lastReplyIndex(chat, u);
    const recent = p >= 0 ? recentText(chat[p].mes) : '';
    const catalog = buildCatalog(before, content, { known: true, c: true });
    const ctx = withContentSkills(planContext(before, content, catalog), content, before);
    if (p >= 0 && !chat.slice(p + 1,u).some(m => activeMessage(m) && !m.avereth_unplayed)) ctx.unbookedArrival = unbookedArrival(chat[p], before);
    const actionInput=actionInputOf(msg);
    if(actionInput)ctx.actionInput=actionInput;
    const priorBinding = actionInput && previous?.plan?.raw?.length ? parsePlan(previous.plan.raw.at(-1),content.commandVocab,ctx,msg.mes) : null;
    const reuse = previous?.plan && previous.interp?.commands ? {travel_frame:previous.plan.travel_frame, hud_binding:previous.plan.hud_binding || priorBinding?.hud_binding, hud_normalized:previous.plan.hud_normalized || priorBinding?.hud_normalized, commands: previous.interp.commands, failed: false, error: null, ms: 0, repaired: !!previous.interp.repaired, raw: previous.plan.raw || [], calls: previous.plan.llm, recovery: previous.plan.recovery || null } : null;
    const moveHints = commands => {
        const hints = ineffectiveMoves(before, ctx, commands);
        if (actionInput || ctx.fight || rulesetOf(before)<2 || chosenKnownRoute(before,msg.mes)) return hints;
        const missing = !commands.length;
        const localOnly = commands.length === 1 && commands[0].type === 'go' && commands[0].to?.scene;
        if ((missing || localOnly) && explicitJourneyClause(msg.mes))
            hints.push("Recheck the player's stated destination and the actual scene. Preserve their chosen journey toward an unvisited place or back along a route. A destination elsewhere is not a standpoint here. Preserve obstacles and leave arrival for the world report.");
        return hints;
    };
    const pl = reuse || await planMessage(llm, content, ctx, msg.mes, { recent, isCurrent, moveHints });
    if (!reuse && !pl.failed && !ctx.fight && !actionInput && pl.commands?.length === 0 &&
        (!pl.travel_frame || pl.travel_frame === 'local') && rulesetOf(before) >= 2) {
        const go = localApproach(before,msg.mes,p >= 0 ? chat[p].mes : '');
        if (go) pl.commands = [go];
    }
    const plan = {
        ...(pl.travel_frame ? {travel_frame:pl.travel_frame} : {}),
        ...(actionInput ? {hud_binding:pl.hud_binding,hud_normalized:!!pl.hud_normalized} : {}),
        version: PLANNER_VERSION, mode: ctx.fight ? 'fight' : 'story', ms: pl.ms, repaired: pl.repaired, failed: pl.failed,
        ...(pl.error ? { error: pl.error } : {}), raw: pl.raw, ...(pl.calls?.length ? { llm: pl.calls } : {}),
        ...(pl.recovery ? { recovery: pl.recovery } : {}),
        a0: { route: ir.route, kind: ir.intent?.kind ?? null, skill: ir.intent?.skill ?? null, target: ir.intent?.target ?? null },
    };
    const interp = { version: PLANNER_VERSION, ms: pl.ms, failed: !!pl.failed, repaired: !!pl.repaired, commands: pl.commands, ...(pl.error ? { error: pl.error } : {}) };
    if (pl.failed && before.encounter?.negotiation)
        return actionRefused(inputHash,'Die offene Verhandlung konnte nicht eindeutig gelesen werden. Eingabe erneut versuchen oder die HUD-Antwort wählen.',{plan,interp});
    if (pl.failed) return { v: RECORD_V4, input_hash: inputHash, route: 'v4', ir: { v: IR_VERSION, route: 'v4', reason: 'planner', links: ir.links, acts: [] }, plan, interp, events: [], command: null };
    const hud=actionInput ? reconcileHudPlan(actionInput,pl.commands,pl.hud_binding) : null;
    if(hud && !hud.ok)return actionRefused(inputHash,hud.reason,{plan,interp});
    const pending=before.encounter?.negotiation;
    if (pending && !pl.commands.some(c=>c.type==='negotiation_answer')) {
        if (pending.stage==='offered')
            return actionRefused(inputHash,'Antwort steht aus. Den Erzählzug wiederholen oder die Verhandlung abbrechen.',{plan,interp});
        return executeMappedTurn(chat,content,{u,before,inputHash,llm,previous,plan,interp,typed:true,
            m:{route:'v3',intent:{kind:'negotiation_answer',accept:false}},irRec:{v:IR_VERSION,route:'v3',reason:'counteroffer declined',links:[],acts:[]}});
    }
    const negotiated=plannedNegotiation(pl.commands,actionInput,hud,before,content,msg.mes);
    if (negotiated) {
        if (!negotiated.ok) return actionRefused(inputHash,negotiated.reason,{plan,interp});
        return executeMappedTurn(chat,content,{u,before,m:negotiated.mapped,inputHash,llm,previous,plan,interp,typed:true,
            irRec:{v:IR_VERSION,route:'v3',reason:actionInput?'hud':'planner',links:[],acts:pl.commands}});
    }
    const combatChoice = hud?.phase || (actionInput?.selection.kind === 'phase' ? actionInput.selection : null);
    if (combatChoice) {
        const supplementary = pl.commands.filter(c=>!hud.bound.includes(c.seq));
        const guard = guardCommands(msg.mes,supplementary,guardContext(before,content,catalog));
        if (guard.dropped.length) return actionRefused(inputHash,'Zusätzliche Kampfhandlung nicht autorisiert.',{plan,interp});
        const valid = validateActionSelection(combatChoice,before,content);
        if (!valid.ok) return actionRefused(inputHash,valid.reason,{plan,interp});
        return executeMappedTurn(chat,content,{u,before,m:valid.mapped,inputHash,llm,previous,plan,interp,typed:true,
            irRec:{v:IR_VERSION,route:'v3',reason:'hud',links:[],acts:combatChoice.steps.map(s=>({...s,source:'player'}))}});
    }
    if (!actionInput) pl.commands = splitPartyDeparture(before, msg.mes, pl.commands);
    const chosen = !actionInput && !pl.commands.length && chosenKnownRoute(before,msg.mes);
    if (chosen) pl.commands=[{seq:1,type:'go',to:chosen,quote:msg.mes.split(/[.!?]/)[0]}];
    const guarded = guardCommands(msg.mes, pl.commands.filter(c=>!hud?.bound.includes(c.seq)), guardContext(before, content, catalog));
    if(hud)guarded.kept=[...guarded.kept,...pl.commands.filter(c=>hud.bound.includes(c.seq))].sort((a,b)=>a.seq-b.seq);
    const partySteps = guarded.kept.filter(c=>c.type==='party');
    const pc = !actionInput && !guarded.dropped.length && partySteps.length===1 && partySteps[0];
    const rest = guarded.kept.filter(c=>c!==pc);
    let organisation;

    const recruitment=pc?.type==='party' && (pc.act==='invite' || pc.act==='offer' && !pc.agreement &&
        (!before.party?.members[pc.who] || before.party.members[pc.who].mode==='left'));
    if(pc?.type==='party' && pc.needs==null && rest.every(c=>['go','other'].includes(c.type)) && (recruitment || pc.act === 'disband' || ['wait','follow','leave'].includes(pc.act) && before.party?.members[pc.who] && before.party.members[pc.who].mode!=='left')){
        const local=await partyControl(before,content,{act:recruitment?'invite':pc.act==='leave'?'remove':pc.act,ref:pc.who,source:msg.mes,revision:actionPrefix(chat,u),
            proposal:recruitment && (pc.act==='offer' || hasPartyTerms(msg.mes,content,pc)) ? pc : null},
            messages=>ask(llm,messages,'party_decision',{maxTokens:200,temperature:0.3}));
        const receipt={v:RECORD_V4,input_hash:inputHash,route:'v4',ir:irRecord(ir),plan,interp,...local};
        if (!rest.length) return receipt;
        const organised=clone(before);
        for(const event of local.events) applyEvent(organised,event);
        const desired=pc.act==='wait'?'wait':pc.act==='leave'?'left':'follow';
        const ready=pc.act === 'disband' ? !Object.values(organised.party?.members || {}).some(m=>m.mode!=='left') : organised.party?.members[pc.who]?.mode===desired;
        const joint=rest.some(c=>c.needs===pc.seq || c.type==='go' && /\b(?:together|let(?:['’]s| us)|only if)\b/i.test(c.quote)) ||
            /\bonly if\b/i.test(msg.mes);
        if (!ready && (joint || !recruitment)) return receipt;
        before=organised;
        guarded.kept=rest.map(c=>c.needs===pc.seq ? {...c,needs:null} : c);
        organisation=local;
    }
    // a contract given up only in words for later is no act now (live run 03.10.2026)
    const announced = announcedAbandon(msg.mes, guarded.kept, before);
    guarded.kept = announced.kept;
    guarded.dropped = [...guarded.dropped, ...announced.dropped];
    // The request is informational: route it through the normal board command, including booking and reuse.
    const boardRead = implicitBoardRead(before, guarded.kept, msg.mes);
    if (boardRead) guarded.kept = [...guarded.kept.filter(x => x.seq !== boardRead.seq), boardRead].sort((a,b) => a.seq-b.seq);
    const m = mapPlan(guarded.kept, ctx, content, msg.mes, before,{hudSeqs:hud?.bound || [],orderedTurn:!actionInput && rulesetOf(before)>=2});
    if(hud){
        const valid=validateActionSelection(actionInput.selection,before,content);
        if(!valid.ok)return actionRefused(inputHash,valid.reason,{plan,interp});
        const chosen=valid.mapped;
        // The planner only anchors the selection in its sequence. Quantities, price and
        // quote-only authority always come from the host, including in a mixed turn.
        if (m.route === 'v4' && actionInput.selection.kind.startsWith('trade.')) {
            if (!hud.bound.every(seq => m.commands.some(c => c.seq === seq)))
                return actionRefused(inputHash,'Die Handelsauswahl ist im Gesamtplan unvollständig.',{plan,interp});
            m.commands = m.commands.map(c => {
                const i = hud.bound.indexOf(c.seq);
                return i < 0 ? c : { ...chosen.commands[i], seq:c.seq, ...(c.needs != null ? {needs:c.needs} : {}) };
            });
        }
        // Combat's existing mapper has no command dependency executor. Only the selected, prevalidated
        // approach+attack pair is atomic here; never erase an external condition while lowering it.
        if(m.route==='v3' && pl.commands.some(c=>hud.bound.includes(c.seq) && c.needs!=null && !hud.bound.includes(c.needs)))
            return actionRefused(inputHash,'Die Voraussetzung dieser Kampfauswahl ist noch nicht aufgelöst; Auswahl und Bedingung klären',{plan,interp});

        const kept=chosen.route===m.route && (m.route==='v3'
            ? Object.entries(chosen.intent).filter(([k])=>k!=='target_how').every(([k,v])=>(m.intent[k]??null)===(v??null))
            : m.commands?.some(c=>hud.bound.includes(c.seq)));
        if(!kept)return actionRefused(inputHash,'Die ausgewählte Aktion oder ihre Bedingung bleibt im Gesamtplan nicht erhalten',{plan,interp});
    }
    plan.dropped = guarded.dropped.map((x) => ({ type: x.command?.type ?? null, rule: x.rule, quote: x.command?.quote ?? null }));
    plan.notes = m.notes;
    if (m.free?.length) plan.free = m.free;
    if (m.hint) plan.hint = m.hint;
    plan.mapped = m.route === 'v3' ? m.intent : m.route;
    const acts = [
        ...guarded.kept.map((c) => ({ ...c, act: c.type, source: 'planner' })),
        ...guarded.dropped.map((x) => ({ act: x.command?.type ?? null, seq: x.command?.seq ?? null, quote: x.command?.quote ?? null, source: 'planner', dropped: x.rule })),
    ].map(({ type, ...a }) => a);
    const irRec = { v: IR_VERSION, route: m.route === 'v4' ? 'v4' : 'v3', reason: 'planner', links: ir.links, acts };
    const turn=await executeMappedTurn(chat,content,{u,before,m,guarded,inputHash,llm,previous,plan,interp,irRec,typed:!!actionInput});
    if (organisation && !turn.action_error) {
        turn.events=[...organisation.events,...turn.events];
        if (organisation.party_call) turn.party_call=organisation.party_call;
    }
    return turn;
}
function actionRefused(inputHash,reason,extra={}) {
    return {v:RECORD_V4,input_hash:inputHash,route:'v4',events:[],command:null,action_error:reason,...extra};
}
async function executeMappedTurn(chat,content,{u,before,m,guarded={dropped:[]},inputHash,llm,previous,plan,interp,irRec,typed=false}) {
    const msg=chat[u],pl={ms:interp?.ms || 0,repaired:interp?.repaired};
    if (m.refused) return actionRefused(inputHash,m.panel,{plan,interp});
    if (m.route === 'panel') return { v: RECORD_V4, input_hash: inputHash, route: 'v3', ir: irRec, plan, interp, events: [], command: { panels: [m.panel], llm: null } };
    if (m.route === 'v3') {
        // 4.3.0-c.6.6.5: a fight among the crowd of a settlement's street makes people of it first (the passer-by he
        // names, the people closest to an area attack), in this turn's record; nobody in a crowd is out of reach
        const crowd = typed ? null : crowdIntent(before, content, m.intent, msg.mes);
        const at = crowd ? clone(before) : before;
        if (crowd) for (const e of crowd.events) applyEvent(at, e);
        let t;
        try {
            t=playerTurn(at,content,msg.mes,{msg:u,intent:crowd ? crowd.intent : m.intent,c:true});
        } catch (error) {
            if (!(error instanceof SurrenderTransferError)) throw error;
            return actionRefused(inputHash,error.message,{plan,interp});
        }
        if (m.intent.phase && t.outcome?.illegal && !t.outcome.records?.length)
            return actionRefused(inputHash,t.outcome.illegal,{plan,interp});
        const ownPhaseRefused = !!m.intent.phase && t.outcome?.kind==='combat' && !t.outcome.records?.some(r=>r.actor==='pc');
        const recorded = t.events.findLast(e => e.t === 'outcome.recorded');
        if (m.intent.job && recorded && recorded.d.outcome.kind === 'combat') {
            recorded.d.outcome.job = { job: m.intent.job, seq: m.intent.job_seq, type: 'use_skill', quote: m.intent.job_quote };
            applyEvent(t.state, recorded);
        }
        const growth = await withGrowth(t, content, llm, previous);
        return { v: RECORD_V4, input_hash: inputHash, route: 'v3', ir: irRec, plan, interp, ...(ownPhaseRefused ? {own_phase_refused:true} : {}), ...growth, events: [...(crowd && t.events.length ? crowd.events : []), ...growth.events], command: t.command ? { panels: t.command.panels, llm: t.command.llm } : null };
    }
    const need = boardFor(before, content, m.commands, { c: true });
    const board = need ? await generateBoard(llm, before, content, need) : null;
    const t = playerTurnV4(before, content, msg.mes, {
        msg: u, commands: m.commands, dropped: guarded.dropped.filter((x) => !MECH_TYPES.includes(x.command?.type)), board, c: true,
        interp: { travel_frame:plan?.travel_frame, version: PLANNER_VERSION, ms: pl.ms, source: pl.repaired ? 'json_repaired' : 'json', failed: false, error: null },
    });
    const pureBoardFailure = board?.failed && m.commands.length === 1 && m.commands[0].type === 'board.read'
        && t.outcome?.resolutions?.[0]?.reason === 'generator_failed';
    const growth = await withGrowth(t, content, llm, previous);
    if (pureBoardFailure) t.command = {
        panels:['[SYSTEM // QUESTBOARD]\nThe board could not be confirmed. You can read it again now.'],
        llm:null,
    };
    return {
        v: RECORD_V4, input_hash: inputHash, route: 'v4', ir: irRec, plan, interp,
        board: board ? { branch: board.branch, rank: board.rank, ms: board.ms, failed: board.failed || undefined, ...(board.failed && board.minimum ? {manualRetry:true} : {}), listings: board.listings.length, ...(board.calls?.length ? { llm: board.calls } : {}) } : undefined,
        ...growth, command: t.command ? { panels: t.command.panels, llm: null } : null,
    };
}

/** Apply events to a private copy (the state a finalization leaves, for what this same step offers next). */
function after(state, events) {
    const s = clone(state);
    for (const e of events) applyEvent(s, e);
    return s;
}

/**
 * Patch 9C-1: the shared finalization of a regular planned turn (both routes): every learning goal that is ready in the
 * state the turn left, whenever it became ready (a session, a fight, a fight a reply opened), becomes its Skill
 * (src/v4/growth.js finalizeGrowth: checked on a private copy, all or nothing per goal). Its events join the turn's
 * record before the outcome, which names what he learned. A question, a panel or a running fight books none.
 */
async function withGrowth(t, content, llm, previous) {
    if (!t?.state || t.command || !t.events.length) return { events: t.events };
    // Patch 9C-2b: the Skill Stones this turn activated join the same drafts, Forge and grant
    const activations = activationsOf(t.outcome);
    const drafts = growthDrafts(t.state, content, activations);
    // Pre-Forge records (.42) already booked deterministic names. Board retry must retain those too.
    const cached = { entries: { ...previous?.forge?.entries } };
    for (const d of drafts) {
        const close = previous?.events?.find((e) => e.t === 'growth.closed' && e.d.goal === d.key);
        const skill = close && previous.events.find((e) => e.t === 'skill.defined' && e.d.skill.id === close.d.skill)?.d.skill;
        if (skill && !cached.entries[d.key]) cached.entries[d.key] = { hash: d.hash, name: skill.name, ...(skill.flavor ? { flavor: skill.flavor } : {}) };
    }
    let forge = drafts.length ? await generateForge(llm, t.state, content, drafts, cached) : null;
    const f = finalizeGrowth(t.state, content, forge?.entries, activations);
    // Patch 9C-2c: the developments this safe turn offers (src/v4/passive_growth.js): every pending evidence, the one an
    // ordinary goal just completed in it too, named by its own Forge request (the same reuse by key and hash)
    let s2 = null;
    try { s2 = after(t.state, f.events); } catch { s2 = null; }
    const career = s2 ? developmentFeats(t.state, content, t.events) : [];
    if (career.length) { f.events.push(...career); s2 = after(s2, career); }
    // 9C completion: the Ordinary evidence of what he did (successful checks the engine rolled), found at a safe turn
    const deeds = s2 && !s2.encounter && !(s2.pending_combat || []).length ? deedEvidence(s2, content) : [];
    if (deeds.length) {
        f.events.push(...deeds);
        try { s2 = after(s2, deeds); } catch { s2 = null; }
    }
    const pdrafts = s2 ? passiveDrafts(s2, content) : [];
    const pforge = pdrafts.length ? await generateForge(llm, s2, content, pdrafts, cached, { request: passiveForgeRequest, parse: parsePassiveForge }) : null;
    const offered = pdrafts.length ? offerPassives(s2, content, pdrafts, pforge?.entries) : { events: [], offers: [] };
    f.events.push(...offered.events);
    if (pforge) forge = forge ? { ...forge, entries: { ...forge.entries, ...pforge.entries }, ms: forge.ms + pforge.ms, llm: [...forge.llm, ...pforge.llm], repaired: forge.repaired || pforge.repaired } : pforge;
    // 9C completion (src/v4/skill_growth.js): the Skill developments this safe turn offers, within the room the Passive
    // offers left (one Forge request of their own, the same reuse by key and hash)
    let s3 = null;
    if (s2) { try { s3 = after(s2, offered.events); } catch { s3 = null; } }
    if (s3 && !s3.encounter && !(s3.pending_combat || []).length) {
        const evidence = skillEvidence(s3, content);
        f.events.push(...evidence);
        s3 = after(s3, evidence);
    }
    const sdrafts = s3 ? skillDrafts(s3, content) : [];
    const sforge = sdrafts.length ? await generateForge(llm, s3, content, sdrafts, cached) : null;
    const skilled = sdrafts.length ? offerSkills(s3, content, sdrafts, sforge?.entries) : { events: [], offers: [] };
    f.events.push(...skilled.events);
    if (sforge) forge = forge ? { ...forge, entries: { ...forge.entries, ...sforge.entries }, ms: forge.ms + sforge.ms, llm: [...forge.llm, ...sforge.llm], repaired: forge.repaired || sforge.repaired } : sforge;
    let s4 = s3 ? after(s3, skilled.events) : null;
    const cdrafts = s4 ? classDrafts(s4, content) : [];
    const cforge = cdrafts.length ? await generateForge(llm, s4, content, cdrafts, cached, { request: classForgeRequest, parse: parseClassForge }) : null;
    const classified = cdrafts.length ? offerClass(s4, content, cdrafts, cforge?.entries) : { events: [], offers: [] };
    f.events.push(...classified.events);
    if (cforge) forge = forge ? { ...forge, entries: { ...forge.entries, ...cforge.entries }, ms: forge.ms + cforge.ms, llm: [...forge.llm, ...cforge.llm], repaired: forge.repaired || cforge.repaired } : cforge;
    if (forge) {
        // Patch 9C-2c: and the name an offer actually holds (its fallback, when the Forge's was not free at the offer)
        for (const o of [...offered.offers, ...skilled.offers, ...classified.offers]) {
            const entry = forge.entries[o.key];
            if (entry && entry.name !== o.name) forge.entries[o.key] = { hash: entry.hash, name: o.name, fallback: true };
        }
        // Record the name actually booked, including a late collision's deterministic fallback.
        for (const e of f.events.filter((e) => e.t === 'skill.defined')) {
            const def = e.d.skill;
            const learned = f.learned.find((l) => l.skill === def.id);
            const entry = learned && forge.entries[learned.key];
            if (entry && entry.name !== def.name) forge.entries[learned.key] = { hash: entry.hash, name: def.name, fallback: true };
        }
    }
    const meta = forge ? { forge } : {};
    if (!f.events.length && !f.failed.length) return { events: t.events, ...meta };
    const passiveOffered = offered.offers;
    const skillOffered = skilled.offers;
    const i = t.events.findLastIndex((e) => e.t === 'outcome.recorded');
    if (i < 0) return { events: [...t.events, ...f.events], ...meta };
    const rec = t.events[i];
    // Review of 9C-2b (R2): a goal kept from its grant (its manual not in hand) is told in the turn that worked on it,
    // not again in every later turn
    const touched = new Set(t.events.filter((e) => e.t === 'growth.session' || e.t === 'growth.progress').map((e) => e.d.goal));
    const failed = f.failed.map((x) => ((x.source === 'material' || x.source === 'practice') && touched.has(x.goal) ? { ...x, notice: true } : x));
    const outcome = rec.d.outcome ? { ...rec.d.outcome, ...(f.learned.length ? { learned: f.learned } : {}), ...(failed.length ? { learn_failed: failed } : {}), ...(passiveOffered.length ? { passive_offers: passiveOffered } : {}), ...(skillOffered.length ? { skill_offers: skillOffered } : {}), ...(classified.offers.length ? { class_offers: classified.offers } : {}) } : rec.d.outcome;
    return { events: [...t.events.slice(0, i), ...f.events, { ...rec, d: { ...rec.d, outcome } }, ...t.events.slice(i + 1)], ...meta };
}

/** One batched prose request and at most one repair. Valid siblings and recorded fallbacks are final. */
export async function generateForge(llm, state, content, drafts, previous = null, { request = forgeRequest, parse = parseForge } = {}) {
    const entries = {};
    for (const d of drafts) if (previous?.entries?.[d.key]?.hash === d.hash) entries[d.key] = { ...previous.entries[d.key] };
    const reused = Object.keys(entries).length;
    const calls = [];
    let ms = 0;
    let errors = [];
    let last = '';
    for (let attempt = 0; attempt < 2; attempt++) {
        const missing = drafts.filter((d) => !entries[d.key]);
        if (!missing.length) break;
        const messages = request(missing);
        if (attempt) messages.push({ role: 'assistant', content: last.slice(0, 3000) }, { role: 'user', content: `Repair only these entries. Errors: ${errors.join('; ').slice(0, 1000)}. Already reserved names: ${Object.values(entries).map((e) => e.name).join(', ')}. Return JSON only.` });
        const a = await ask(llm, messages, attempt ? 'forge_repair' : 'forge');
        ms += a.ms;
        calls.push(a.call);
        if (!a.ok) { errors = [a.error]; continue; }
        last = a.content;
        const p = parse(a.content, missing, content, state, Object.values(entries).map((e) => e.name));
        Object.assign(entries, p.entries);
        errors = p.errors;
    }
    for (const d of drafts) if (!entries[d.key]) entries[d.key] = { hash: d.hash, name: d.def.name, fallback: true };
    return { version: FORGE_VERSION, entries, ms, llm: calls, repaired: calls.some((c) => c.purpose === 'forge_repair'), ...(reused ? { reused } : {}) };
}

/**
 * Prototype C (4.3.0-c.6.6.5): an attack that found no one in the street of a busy settlement (live 15.10.2026 review:
 * "the fishmonger" was no valid target in a crowded market): the one he names, if a person, or for an area attack the
 * people standing closest, become people of the scene, and the attack goes to them. null when there is no crowd here,
 * the attack named no person, or a fight is running.
 */
export function crowdIntent(state, content, intent, message = '') {
    if (!intent || intent.kind !== 'no_target' || state.encounter) return null;
    const people = crowdCount(state, content);
    const def = skillOf(content, intent.skill, state);
    if (!people || !def?.attack) return null;
    const area = (def.effects || []).some((e) => e.kind === 'area');
    if (intent.ref && !personWords(intent.ref)) return null;
    if (!intent.ref && (!area || !personWords(message))) return null;
    const made = intent.ref ? bystanderEvents(state, content, { ref: intent.ref }) : bystanderEvents(state, content, { count: people });
    const { ref, ...rest } = intent;
    return { events: made.events, intent: { ...rest, kind: 'attack', target: made.ids[0], target_how: area ? 'area' : 'planner', move: null, move_target: null, ...(area ? { field: made.ids, crowd: true } : {}) } };
}

// ------------------------------------------------------------------------------------------------ board
/**
 * The board a message reads (board.read), before the narrator describes it: in the Guild hall he is in, or in the one
 * an earlier go of the same message leads to; rank as named, else his rank after an earlier registration in the message.
 */
function implicitBoardRead(state, commands, input = '') {
    if (!hallOf(state, state.scene.at) || commands.some(x => x.type === 'board.read')) return null;
    const asks = text => /\b(?:what|any|available|looking for|show|read|check|browse|look at)\b.{0,70}\b(?:work|jobs|contracts|board|quests|notices)\b/i.test(text)
        && !/\b(?:not|never|don't|do not|yesterday|would|might|later)\b/i.test(text);
    const inquiry = commands.find(x => x.type === 'other' && asks(x.quote || ''));
    if (!inquiry && (commands.length || !asks(input))) return null;
    return { seq: inquiry?.seq ?? 1, type: 'board.read', rank: null, quote: inquiry?.quote || input };
}

export function boardFor(state, content, commands, { c = false } = {}) {
    const read = commands.find((c) => c.type === 'board.read') || (c ? implicitBoardRead(state, commands) : null);
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
    // Prototype C (4.3.0-c.6): a new day's board is a new board: five notices, none of yesterday's (src/v4/commands.js
    // board.read retires those), booked whole or not at all (generateBoard)
    if (c) return { branch, rank, missing: size, day: today(state), have: [], c: true, ...(rulesetOf(state) >= 2 ? { profile: COUNT_BOARD_PROFILE, ...(rank === 'Novice' ? { progression: true, minimum: 4 } : {}) } : {}) };
    const have = listingsOf(state, branch, rank);
    const missing = size - have.length;
    return missing > 0 ? { branch, rank, missing, day: today(state), have: have.map((q) => q.title) } : null;
}

/** The Board generator with its one retry; listings validated (plan §6.4). A failure books nothing. */
export async function generateBoard(llm, state, content, need) {
    const req = boardRequest(state, content, need);
    let ms = 0;
    let last = null;
    const calls = [];
    let repair = null;
    let messages = req.messages;
    for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt) messages = repair ? boardRequest(state, content, need, repair).messages : [...req.messages,
            { role:'assistant', content:String(last?.answer || '') },
            { role:'user', content:`That answer was not valid: ${(last?.errors || ['no answer']).join('; ')}. ${last?.hints ? last.hints + ' ' : ''}Answer again with only the corrected JSON object.` }];
        const a = await ask(llm, messages, 'board');
        ms += a.ms;
        calls.push(a.call);
        if (!a.ok) {
            last = { errors: [a.error] };
            if (need.minimum || !a.retryable) break;
            continue;
        }
        const parseFull = attempt === 0 || need.minimum ? parseInitialBoard : parseBoard;
        const p = repair ? parseBoardSlot(a.content, repair, content, need, state) : parseFull(a.content, content, need, state);
        // Prototype C (4.3.0-c.6.1): fewer valid listings than the day's board asks for are no board (repaired once, else
        // failed: yesterday's stays up), never a smaller day
        const n = p.listings?.length;
        const short = need.c && p.listings && n < (need.minimum ?? need.missing) ? [`${n} valid listing${n === 1 ? '' : 's'} of the ${need.missing} asked for${p.refused.length ? `; refused: ${p.refused.map((r) => `"${r.title}" (${r.why})`).join(', ')}` : ''}; write all ${need.missing}`] : null;
        if (p.listings && p.listings.length && !short) return { ...need, listings: p.listings, refused: p.refused, ms, calls, version: BOARD_VERSION };
        if (!attempt && !need.minimum) repair = boardSlotRepair(a.content, p, state, content, need);
        last = { answer: a.content, hints: boardRepairGuidance(a.content, content, need, false, p.refused), errors: [...(short || (p.errors.length ? p.errors : ['no valid listing'])), ...(!short ? (p.refused || []).map(r => `${r.title}: ${r.why}`) : [])].slice(0, 12) };
    }
    return { ...need, listings: [], failed: (last?.errors || ['failed']).join('; ').slice(0, 200), ms, calls, version: BOARD_VERSION };
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
 * Patch 8.2: the local cost of resolving a player message, kept with its record (telemetry, never a game event): the
 * time it waited for the previous reply's extraction (index.js, the barrier), the engine's own time without its LLM
 * calls, and how often and how long the chat was folded meanwhile.
 */
function turnPerf(r, t0, f0, waited) {
    const llm = (r.plan ? r.plan.ms || 0 : r.interp?.ms || 0) + (r.board?.ms || 0) + (r.forge?.ms || 0) + (r.party_call?.ms || 0);
    const f = foldStats();
    return {
        ...(Number.isFinite(waited) ? { wait_ms: waited } : {}),
        engine_ms: Math.max(0, Date.now() - t0 - llm), folds: f.calls - f0.calls, fold_ms: Math.round(f.ms - f0.ms),
    };
}

/**
 * Before a generation: V3 campaigns as prepareGeneration (host.js). A V4 campaign resolves the latest player message
 * once (stored on it, so swipes and regenerations reuse the interpretation, the board and the dice): V3-routed turns
 * (commands, creation, combat, stealth) through the V3 engine, story turns through interpreter and handlers.
 * @returns the same shape as prepareGeneration
 */
export async function prepareGenerationAsync(chat, content, { type = 'normal', settings = {}, llm = null, waited = null, isCurrent = () => true } = {}) {
    const stale = () => ({ action: 'abort', dirty: false, stale: true });
    if (!isCurrent()) return stale();
    if (type === 'quiet' || type === 'impersonate') return { action: 'clear', dirty: false };
    if (!hasCampaign(chat)) return { action: 'none', dirty: false };
    if (campaignRuntime(chat) !== 'v4') return prepareGeneration(chat, content, { type, settings });
    refreshRevisionDisplay(chat);
    const t0 = Date.now();
    const f0 = foldStats();
    const u = lastPlayerIndex(chat);
    if (u < 0) return { action: 'none', dirty: false };
    const msg = chat[u];
    const originalRecord = rec(msg);
    let dirty = false;
    let r = rec(msg);
    const inputHash = hash32(msg.mes);
    const actionInput=actionInputOf(msg), actionHash=actionInputHash(actionInput);
    if(r?.events?.length && r.action_input_hash!=null && (r.action_input_hash!==actionHash || r.input_hash!==inputHash))
        return {action:'abort',dirty:false,notice:'Diese HUD-Aktion wurde bereits gebucht. Eine Text- oder Auswahledition würfelt sie nicht erneut.'};
    // A native regenerate can target the protected payment source itself; folding only its
    // predecessor would otherwise bypass the failed, still unreconciled confirmation.
    if (msg.avereth_protected_edit) {
        const blocked = foldBlock(foldChat(chat,u+1));
        if (blocked) return {action:'fold_blocked',dirty:false,index:u,block:blocked,notice:blocked.notice};
    }
    // an interpretation that failed is not cached: Regenerate asks again (plan §3.4); neither is a Board generation that
    // failed: a new generation of the same message asks for the board again, with the interpretation it came with
    const retryBoard = !!r && r.route === 'v4' && r.input_hash === inputHash && !r.interp?.failed && !!r.board?.failed && !r.board.manualRetry;
    if (type !== 'continue' && (!r || r.input_hash !== inputHash || r.action_input_hash!=null && r.action_input_hash!==actionHash || r.interp?.failed || retryBoard)) {
        const history = historyKey(chat, u);
        const current = () => isCurrent() && chat[u] === msg && lastPlayerIndex(chat) === u && hash32(msg.mes) === inputHash && actionInputHash(actionInputOf(msg))===actionHash && rec(msg) === originalRecord && historyKey(chat, u) === history;
        // Stage a missed extraction's gap too: a stale async request must leave every record untouched.
        const p = lastReplyIndex(chat, u);
        const staged = [...chat];
        if (p >= 0) staged[p] = clone(chat[p]);
        const late = closeLatePending(staged, u);
        const commit = () => {
            if (msg.avereth_unplayed && msg.extra) delete msg.extra.display_text;
            delete msg.avereth_unplayed;
            if (late) setRec(chat[p], rec(staged[p]));
            if(actionInput){r.action_input=clone(actionInput);r.action_input_hash=actionHash;}
            setRec(msg, r);
        };
        const fold = foldChat(staged, u);
        // Architecture patch A (.127): no planner call, payment, fight round or record from a fold that is not whole
        const blocked = foldBlock(fold);
        if (blocked) return { action: 'fold_blocked', dirty: false, index: u, block: blocked, notice: blocked.notice };
        const before = fold.state;
        // the message read once (Gen 3.5 Intent IR): its route, its links, the parsed act the V3 engine resolves
        const ir = readTurn(msg.mes, before, content);
        // prototype C: the planner reads every free-text message; '#' commands, character creation and a dead PC stay
        // the deterministic control channels they are in A
        const control = ir.reason === 'creation' || ir.reason === 'dead' || ir.intent?.kind === 'command';
        if (before.encounter?.negotiation && control && !/^#(?:system|status|sheet|inventory|help)\b/i.test(msg.mes.trim())) {
            r=actionRefused(inputHash,'Die Verhandlung zuerst beantworten oder abbrechen.');commit();
            return {action:'not_executed',dirty:true,index:u,notice:r.action_error};
        }
        if(actionInput){
            const valid=validateActionSelection(actionInput.selection,before,content);
            const reason=actionInput.text!==msg.mes?'Text und gespeicherte HUD-Eingabe unterscheiden sich; Eingaberevision ausdrücklich korrigieren':control?'Systemeingaben werden nicht mit einer HUD-Aktion kombiniert':actionInput.base_revision!==actionPrefix(chat,u)?'Die Welt hat sich seit der Auswahl geändert':!['hud_roleplay','hud_free'].includes(actionInput.mode)?'Unbekannter Eingabemodus':!valid.ok?valid.reason:null;
            if (actionInput.selection?.kind === 'trade.accept' && actionInput.mode !== 'hud_roleplay') {
                r=actionRefused(inputHash,'Preis und Menge ausdrücklich bestätigen oder den freien Handelsentwurf verwenden.');commit();
                return {action:'not_executed',dirty:true,index:u,notice:r.action_error};
            }
            if(reason){r=actionRefused(inputHash,reason);commit();return {action:'not_executed',dirty:true,index:u,notice:reason};}
        }
        const isC = campaignPath(chat, settings.legacyPlanner ?? settings.planner) === 'c';
        const management = /^#party\s+(invite|wait|follow|remove|disband|accept|pay)(?:\s+(.+))?$/i.exec(msg.mes.trim());
        const native = management && !actionInput && before.mode==='story' && isC && rulesetOf(before)>=2
            ? await partyControl(before,content,{act:management[1].toLowerCase(),ref:management[2]?.trim(),source:msg.mes,revision:actionPrefix(chat,u)},
                messages=>ask(llm,messages,'party_decision',{maxTokens:200,temperature:0.3}))
            : !actionInput && ir.intent?.kind === 'command' && before.mode === 'story' && isC && rulesetOf(before) >= 2
            ? nativeAction(before,content,msg.mes,u) : null;
        const dest = !actionInput && isC && before.mode==='story' && rulesetOf(before)>=2 && /^#go\s+(\S+)$/i.exec(msg.mes.trim());
        if (dest) {
            r = knownRoutes(before).includes(dest[1]) && before.entities.pc?.status!=='dead'
                ? await executeMappedTurn(chat,content,{u,before,m:{route:'v4',commands:[{seq:1,type:'go',to:dest[1],quote:msg.mes}]},inputHash,llm,previous:null,typed:true,irRec:irRecord(ir)})
                : actionRefused(inputHash,'Dieses Ziel ist von hier aus nicht verfügbar.');
        } else if (native) {
            r = {v:RECORD_V4,input_hash:inputHash,route:'v4',ir:irRecord(ir),events:native.events,command:native.command,...(native.party_call?{party_call:native.party_call}:{})};
        } else if(actionInput?.mode==='hud_roleplay') {
            const m=validateActionSelection(actionInput.selection,before,content).mapped;
            r=await executeMappedTurn(chat,content,{u,before,m,inputHash,llm,previous:null,typed:true,
                irRec:{v:IR_VERSION,route:m.route,reason:'hud',links:[],acts:[{...actionInput.selection,source:'hud'}]}});
        } else
        if (isC && !control) {
            if (typeof llm !== 'function') throw new Error('Runtime V4 needs an LLM call for the planner');
            r = await plannedTurn(chat, content, { u, before, ir, inputHash, llm, previous: retryBoard ? r : null, isCurrent: current });
            if (!current()) return stale();
            r.perf = turnPerf(r, t0, f0, waited);
            if(r.action_error){commit();return {action:'not_executed',dirty:true,index:u,notice:r.action_error};}
            if (r.interp?.failed) {
                const hard = (r.plan?.llm || []).some(x => x.error && (x.unclassified || ['unknown','remote_unknown','cancelled','aborted'].includes(x.error_kind) || (x.error_kind === 'provider' && (x.provider_retryable === false || (x.provider_retryable !== true && x.status < 500 && ![408,429].includes(x.status))))));
                if (!hard) r.continuation = {kind:'planner_not_executed', reason:'model'};
                commit();
                return {
                    action: hard ? 'abort' : 'not_executed', dirty: true, index:u,
                    notice: `NOT EXECUTED — planner failed${notExecutedCause(r) ? ` (${notExecutedCause(r)})` : ''}: the engine could not safely understand this input. No action, time or combat round was booked. Decide again or regenerate this input.`,
                };
            }
            dirty = true;
        } else if (ir.route === 'v3') {
            const t = playerTurn(before, content, msg.mes, { msg: u, intent: ir.intent });
            r = { v: RECORD_V4, input_hash: inputHash, route: 'v3', ir: irRecord(ir), events: t.events, command: t.command ? { panels: t.command.panels, llm: t.command.llm } : null };
        } else {
            if (typeof llm !== 'function') throw new Error('Runtime V4 needs an LLM call for the interpreter');
            const catalog = buildCatalog(before, content);
            const ip = retryBoard ? { commands: r.interp.commands, ms: 0, repaired: !!r.interp.repaired, failed: false } : await interpretMessage(llm, content, catalog, msg.mes);
            if (!current()) return stale();
            if (ip.failed) {
                r = {
                    v: RECORD_V4, input_hash: inputHash, route: 'v4', ir: irRecord(ir, []),
                    interp: { version: INTERPRETER_VERSION, ms: ip.ms, failed: true, repaired: ip.repaired, commands: null, error: ip.error || undefined, ...(ip.calls?.length ? { llm: ip.calls } : {}) },
                    events: [], command: null,
                };
                r.perf = turnPerf(r, t0, f0, waited);
                commit();
                return {
                    action: 'abort', dirty: true,
                    notice: `Avereth Engine: interpreter failed${ip.error ? ` (${ip.error})` : ''}. Regenerate or send the message again; no story turn was generated.`,
                };
            }
            const guarded = guardCommands(msg.mes, ip.commands, guardContext(before, content, catalog));
            const need = boardFor(before, content, guarded.kept);
            const board = need ? await generateBoard(llm, before, content, need) : null;
            const t = playerTurnV4(before, content, msg.mes, {
                msg: u, commands: guarded.kept, dropped: guarded.dropped, board,
                interp: { version: INTERPRETER_VERSION, ms: ip.ms, source: ip.repaired ? 'json_repaired' : 'json', failed: false, error: null },
            });
            r = {
                v: RECORD_V4, input_hash: inputHash, route: 'v4', ir: irRecord(ir, interpretedActs(guarded.kept, guarded.dropped)),
                interp: { version: INTERPRETER_VERSION, ms: ip.ms, failed: false, repaired: ip.repaired, commands: ip.commands, ...(ip.calls?.length ? { llm: ip.calls } : {}) },
                board: board ? { branch: board.branch, rank: board.rank, ms: board.ms, failed: board.failed || undefined, ...(board.failed && board.minimum ? {manualRetry:true} : {}), listings: board.listings.length, ...(board.calls?.length ? { llm: board.calls } : {}) } : undefined,
                events: t.events, command: t.command ? { panels: t.command.panels, llm: null } : null,
            };
        }
        if (!current()) return stale();
        if (!r.perf) r.perf = turnPerf(r, t0, f0, waited);
        commit();
        dirty = true;
    }
    // .127 review: a record resolved earlier (swipe, regenerate, a command panel not yet posted) is reused only on a whole
    // fold including its own events; a new resolution above was checked before it was resolved
    if (!dirty) {
        const reused = foldBlock(foldChat(chat, u + 1)); // the reused record's own events included
        if (reused) return { action: 'fold_blocked', dirty, index: u, block: reused, notice: reused.notice };
    }
    if(r?.action_error)return {action:'not_executed',dirty,index:u,notice:r.action_error};
    if (r?.route === 'v4' && r.interp?.failed) {
        return {
            action: 'abort', dirty,
            notice: `Avereth Engine: ${r.plan ? 'planner' : 'interpreter'} failed${r.interp.error ? ` (${r.interp.error})` : ''}. Regenerate or send the message again; no story turn was generated.`,
        };
    }
    if (r?.command && !r.command.llm) {
        if (r.command.posted) return { action: 'abort', dirty };
        r.command.posted = true;
        setRec(msg, r);
        const updateHud = r.events.some(e => ['stat.assigned','item.equipped','resource.changed','time.advanced','party.member','party.agreement'].includes(e.t));
        return { action: 'panels', panels: r.command.panels, index: u, dirty: true,
            ...(updateHud ? {hud:renderHud(foldChat(chat).state,content,settings.hud,{showFreePoints:true})} : {}) };
    }
    const { state, errors, failures, context } = turnBlock(chat, u, content, settings);
    // .127: a reused record (swipe, regenerate, continue) is narrated only from a whole state as well
    const blocked = foldBlock({ failures });
    if (blocked) return { action: 'fold_blocked', dirty, index: u, block: blocked, notice: blocked.notice };
    return { action: 'context', context, loreKeys: loreKeys(state, content), dirty, errors };
}

/**
 * Build .107 (audit of .106: the NOT EXECUTED notice gave no reason, so the player said the same again): the cause the
 * planner's own validation recorded, in a few player-facing words; null when none of these was found (never a guess,
 * never provider details).
 */
export function notExecutedCause(r) {
    const text = String(r?.plan?.error || r?.interp?.error || '');
    if (/is not what his words .* say|ambiguous price or quantity/.test(text)) return 'price or quantity unclear';
    if (/quote .* is not in the message|quote must be his exact words|must copy the counterparty/.test(text)) return 'the action could not be matched to the exact words';
    if (/target must be an id|is a creature or person: use use_skill/.test(text)) return 'the target is unclear';
    const calls = r?.plan?.llm || r?.interp?.llm || [];
    if (calls.length && calls.every((x) => x.error)) return 'the planner received no answer';
    return null;
}

// Include event payloads, not just their count: a swipe or an extraction can replace an equal-sized record.
function historyKey(chat, end) {
    return hash32(JSON.stringify(chat.slice(0, end).filter(m => activeMessage(m) && !m.avereth_unplayed).map((m) => [!!m.is_user, !!m.is_system, m.mes, messageEvents(m), rec(m)?.extraction?.status, actionInputHash(actionInputOf(m))])));
}

// ------------------------------------------------------------------------------------------------ after the reply
function display(msg, content, before, reply, hud) {
    const panel = worldPanel(before, content, reply);
    const view = boardView(reply.state || before, content, before.last?.outcome?.board) + renderHud(reply.state || before, content, hud);
    showPanel(msg, panel, view, { playerFacing: true });
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
    if (bindGeneratedReply(chat, id, opts.generatedFrom)) {
        delete msg.extra.avereth;
        delete msg.extra.display_text;
        delete msg.avereth_prior_display;
    }
    refreshRevisionDisplay(chat);
    if (!activeMessage(msg) || msg.is_user || msg.is_system) return { changed: false };
    const r = rec(msg);
    if (r && r.text_hash === hash32(msg.mes)) {
        // A real regeneration may produce identical prose with a different Engine context.
        // Refresh telemetry only; never repeat already committed world events.
        if (opts.narratorContext) {
            setRec(msg, { ...r, narration: { ...(r.narration || {}), ...(Number.isFinite(opts.narrationMs) ? { ms: opts.narrationMs } : {}), context: opts.narratorContext } });
            return { changed: true };
        }
        return { changed: false };
    }
    const u = lastUserIndex(chat, id);
    if (u < 0) return { changed: false };
    // .127: a reply after a broken record is neither cleaned, recorded (not even as a system answer), shown with a HUD of
    // a partial state nor queued for extraction
    const fold = foldChat(chat, id);
    const blocked = foldBlock(fold);
    if (blocked) return { changed: false, foldBlocked: blocked };
    const clean = extractReport(msg.mes).clean;
    // V4 prose is also the extractor's evidence. Post-generation word swaps can corrupt canonical names/content
    // (live 28.09.: "Deliver a Ledger" became "Deliver a Register"). Keep V4 text byte-faithful apart from retired blocks.
    msg.mes = opts.stripTrackers === false ? clean : stripTrackerBlocks(clean);
    rememberRevision(msg);
    if (rec(chat[u])?.command?.llm) {
        setRec(msg, { v: RECORD_V4, events: [], system_answer: true, text_hash: hash32(msg.mes) });
        return { changed: true };
    }
    const { state } = fold;
    // Patch 8.2: the narrator's time (index.js: engine block handed over → reply received), telemetry with the record
    const narration = Number.isFinite(opts.narrationMs) || opts.narratorContext ? { ...(Number.isFinite(opts.narrationMs) ? { ms: opts.narrationMs } : {}), ...(opts.narratorContext ? { context: opts.narratorContext } : {}) } : null;
    // Patch 8.2 (live 21.10.2026 13:33, message 36: the narrator's 4,096 tokens went to its reasoning, the reply was
    // empty, and the extractor still read it for 17.6 s, 0 deltas, while the next turn waited for it): a reply without
    // story text has nothing to read. No extraction runs; the engine's results of the turn stand on the player's
    // message, untouched; the System block says so; a swipe or a regeneration brings a reply that is read as usual.
    if (!msg.mes.trim()) {
        const view = display(msg, content, state, { state, system: [EMPTY_REPLY_NOTICE] }, opts.hud || 'closed');
        setRec(msg, { v: RECORD_V4, events: [], text_hash: hash32(msg.mes), extraction: { status: 'skipped', reason: 'empty reply', version: EXTRACTOR_VERSION }, narration: { ...(narration || {}), empty: true }, corrections: [], ...view });
        return { changed: true, empty: true };
    }
    // Soft-world V4: the player reads the narrator immediately. Extraction is persistence/bookkeeping and may take
    // tens of seconds; it must not hide ordinary story prose. The next-turn barrier still waits for the commit.
    // When extraction finishes, showPanel refreshes this same reply with newly recorded state (including creature HP).
    const view = display(msg, content, state, { pending: true, state }, opts.hud || 'closed');
    setRec(msg, { v: RECORD_V4, events: [], text_hash: hash32(msg.mes), extraction: { status: 'pending', version: EXTRACTOR_VERSION }, ...(narration ? { narration } : {}), corrections: [], ...view });
    return { changed: true, extract: true };
}

/** The extractor's request for reply id, or null when there is nothing to read (not pending, changed, too late). */
export function extractionRequest(chat, id, content) {
    const msg = chat[id];
    const r = rec(msg);
    if (!activeMessage(msg) || !r || r.extraction?.status !== 'pending' || r.text_hash !== hash32(msg.mes) || laterTurns(chat, id)) return null;
    const fold = foldChat(chat, id);
    if (foldBlock(fold)) return null; // .127: no model request from a broken record (runExtraction reports the block)
    const { state } = fold;
    if (state.encounter?.negotiation?.stage==='offered') return {
        negotiation:true,state,hash:r.text_hash,expectedKeys:{},messages:negotiationExtraction(state,content,msg.mes),
    };
    const o = state.last?.outcome || {};
    const gos = (o.auth?.gos || []).map((g) => g.to).filter(Boolean);
    // Prototype C (4.3.0-c.5): the contracts he read on a board, by id, also for a contract or board taken on arrival
    const player = rec(chat[lastUserIndex(chat,id)])?.own_phase_refused ? null : state.last?.input || null;
    const cat = extractorCatalog(state, content, {
        extraPlaces: gos, known: !!(o.auth?.c || o.c), c: !!(o.auth?.c || o.c),
        input: [player, msg.mes].filter(Boolean).join('\n'),
    });
    let actions = o.kind === 'v4' ? [...o.actions, ...(o.extra || [])].join('\n')
        : o.kind === 'combat' ? 'COMBAT — the engine resolved this round (attacks, damage, movement); report only what else the reply established.'
            : o.kind === 'check' ? `CHECK — the engine resolved: ${o.check?.label || 'a check'}, ${o.check?.success ? 'success' : 'failure'}.`
                : 'NOTHING TO BOOK — Alaric decided nothing the engine resolves.';
    if (typeof o.auth?.continuation === 'object' && o.auth.continuation) actions += '\nChosen possible continuation: '+JSON.stringify(o.auth.continuation)+'. Report arrive only after the actual movement, with its participants. If conditional, after quotes its concrete subject in the actual fulfilled prerequisite before arrival; evidence quotes the PC at the stop. No fulfillment or no agreement means no move.';
    else if (o.auth?.c && !o.auth.gos?.length && ordinaryChoice(state,player,o.auth.continuation)?.assisted)
        actions += '\nVoluntary assistance: if he was actually carried to the requested place, report arrive with the participants and forced_by:null. A request or promise alone is not an arrival.';
    for (const go of o.auth?.gos || []) {
        if (!go.section) continue;
        const {id, from, name} = go.section;
        actions += '\nGO '+go.seq+' from '+from+' to '+name+': if the reply takes him there, use the engine room ID "'+id+'" in expected.at AND arrive.at. The final scene may then use the same ID. If still at the departure point answer arrived:false.';
    }
    if (state.scene.approaching && Object.values(o.expected_keys || {}).includes('approach'))
        actions += '\nAfter recording the standpoint, separately account for what is visible: individually distinguishable creatures at the threshold must be addressable via creature.new with across, desc per individual and band. A fact about the observer cannot record the individuals. For signs or voices alone use ordinary observations.';
    if (o.booked?.registration) actions += '\nThe measuring stone is part of the completed in-hall service. Report no arrival or escort for its routine movements; separate authorized travel still uses normal arrivals.';
    if (o.auth?.roam && o.search_checks?.some(check => check.success)) {
        actions += `\nSearch began at ${state.scene.at}. Set scene on evidence observed there before an arrival. At the sighting, use only a population established there or in its ancestry; otherwise independent.`;
    }
    if (state.encounter || o.kind === 'combat') actions += `\n${chronicleLine(combatChronicle(chat.slice(0, id), messageEvents))}`;
    const expectedKeys = o.expected_keys || {};
    const vocab = worldVocab(content.deltaVocab, state);
    const req = extractorRequest(vocab, { catalog: cat.text, actions, player, expectedKeys, reply: msg.mes });
    return { ...req, vocab, hash: r.text_hash, expectedKeys, state, startScene: state.scene.at, sceneRequired: (state.meta?.ruleset || 1) >= 2 && !!(o.c || o.auth?.c), ids: { places: cat.places, quests: cat.quests, objects: cat.objects }, catalog: cat.text, actions, player };
}

/**
 * Read reply id with the extractor: at most three calls and one transport retry, then commit whatever valid
 * persistence we have. A reply that changed meanwhile, or a later turn already resolved, is left alone.
 * @returns {{changed: boolean, applied?: boolean, failed?: string, late?: boolean}}
 */
export async function runExtraction(chat, id, content, llm, { hud = 'closed', compactOutput = false, isCurrent = () => true, commit = null } = {}) {
    if (!isCurrent()) return { changed: false, cancelled: true };
    // .127: a broken record stops here, before any provider request; the pending record stays untouched (a plain
    // result, no exception: the host's failure path would book extract.failed)
    const blockedAt = () => {
        const r = rec(chat[id]);
        return r?.extraction?.status === 'pending' ? foldBlock(foldChat(chat, id)) : null;
    };
    const blocked = blockedAt();
    if (blocked) return { changed: false, foldBlocked: blocked };
    const req = extractionRequest(chat, id, content);
    if (!req) return { changed: false };
    // A provider failure may be caused by a swipe, edit, or newer Engine turn.
    // Do not spend another LLM call when the original reply is no longer current.
    const source = chat[id], pending = rec(source)?.extraction;
    const offerHistory=historyKey(chat,id);
    const current = () => {
        if (!isCurrent()) return false;
        const msg = chat[id];
        const r = rec(msg);
        return historyKey(chat,id)===offerHistory && msg === source && r?.extraction === pending && activeMessage(msg) && r?.extraction?.status === 'pending' && r.text_hash === req.hash
            && hash32(msg.mes) === req.hash && !laterTurns(chat, id);
    };
    const stale = () => {
        const blocked = foldBlock(foldChat(chat,id));
        return {changed:false,...(blocked ? {foldBlocked:blocked} : laterTurns(chat,id) ? {late:true} : {})};
    };
    const vocab = req.vocab;
    let ms = 0;
    let parsed = null;
    let repaired = false;
    let recovery = null;
    let error = null;

    const calls = [];
    let candidate = null;
    let transportFailures = 0;
    let invalidAnswers = 0;
    let emptyAnswers = 0;
    let movementReviewed = false;
    let messages = req.messages;
    let purpose = 'extract';
    let overrides = {};
    for (let attempt = 0; attempt < 3; attempt++) {
        if (!current()) return stale();
        const outgoing = compactOutput
            ? [{ ...messages[0], content: messages[0].content + '\n' + COMPACT }, ...messages.slice(1)]
            : messages;
        const response = await ask(llm, outgoing, purpose, overrides);
        calls.push(response.call);
        ms += response.ms;
        if (!current()) return stale();
        if (!response.ok && response.error !== 'no answer') {
            error = response.error;
            if (!response.retryable || ++transportFailures > 1) break;
            recovery = 'transport';
        } else if (!response.content?.trim()) {
            emptyAnswers++;
            error = 'no JSON text in extractor response';
            recovery = 'empty';
        } else {
            const p = req.negotiation ? parseNegotiation(req.state,content,response.content,chat[id].mes)
                : parseExtraction(response.content, vocab, req.ids, req.expectedKeys,
                { sceneRequired: req.sceneRequired, startScene: req.startScene, state: req.state, content, explicitArrivals: req.sceneRequired, reply: chat[id].mes, previous: parsed?.value });
            if (p.valid && emptyAnswers && !movementReviewed && attempt < 2
                && Object.entries(req.expectedKeys).some(([k,t]) => t === 'go' && p.value.expected?.[k]?.arrived === false)
                && !p.value.deltas.some(d => d.type === 'arrive')
                && p.value.scene && placeKey(req.state,p.value.scene,content) !== req.startScene
                && movementEvidence(chat[id].mes)) {
                movementReviewed = true;
                p.issues = [...(p.issues || []), { why: 'Movement completeness: the reported scene differs from the starting scene, the reply narrates actual movement, but no arrival is reported. Recheck the ORIGINAL REPLY. Report only actual authorized arrivals in story order, or retain arrived:false if not reached; never infer arrival from the GO goal. Preserve independent valid deltas.' }];
            }
            if (p.valid && (!parsed || ((p.issues?.length || 0) <= (parsed.issues?.length || 0)
                && (p.complete || p.missing.length < parsed.missing.length)))) parsed = p;
            if (p.valid && p.complete && !p.issues?.length) break;
            error = [...p.errors, ...(p.issues || []).map(x => x.why)].join('; ').slice(0, 200);
            candidate = { text: response.content, errors: [...p.errors, ...(p.issues || []).map(x => x.why)] };
            // Two actual invalid answers exhausted the ordinary schema repair.
            // An empty/transport answer never discards the last repairable candidate.
            if (++invalidAnswers >= 2) break;
        }
        if (attempt === 2) break;
        // .127: no repair request on a record that broke while the answer was out
        const broke = blockedAt();
        if (broke) return { changed: false, foldBlocked: broke };
        repaired = true;
        if (candidate) {
            messages = req.negotiation ? [...req.messages,{role:'assistant',content:candidate.text},{role:'user',content:candidate.errors.join(' ')}]
                : extractorRequest(vocab, { catalog: req.catalog, actions: req.actions, player: req.player,
                expectedKeys: req.expectedKeys, reply: chat[id].mes, startScene: req.startScene },
            { previous: candidate.text, errors: candidate.errors }).messages;
            purpose = 'extract_repair';
            overrides = {};
        } else {
            messages = emptyAnswers > 1 ? [...req.messages, { role: 'user', content: 'Both previous attempts returned no JSON text. Return one short JSON object now; include required expected keys and only verified deltas. No prose.' }] : emptyAnswers === 1 ? extractorRequest(vocab, { catalog: req.catalog, actions: req.actions, player: req.player, expectedKeys: req.expectedKeys, reply: chat[id].mes, startScene: req.startScene }, { previous: '', errors: ['no JSON text'] }).messages : req.messages;
            purpose = transportFailures || emptyAnswers > 1 ? 'extract_recovery' : 'extract_repair';
            overrides = emptyAnswers > 1 ? { maxTokens: 6000 } : {};
        }
    }

    if (!isCurrent()) return { changed: false, cancelled: true };
    const hard = calls.some(x => x.error && (x.unclassified || ['unknown','remote_unknown','cancelled','aborted'].includes(x.error_kind) || (x.error_kind === 'provider' && (x.provider_retryable === false || (x.provider_retryable !== true && x.status < 500 && ![408,429].includes(x.status))))));
    // Host serialization must call this synchronously after its final save/ownership check.
    // An await between that check and mutation would reopen the native-snapshot race.
    const apply = () => current() ? applyExtraction(chat, id, content, parsed, { hash: req.hash, ms, repaired, recovery, error, hud, calls, movementReviewed, errorKind:hard ? 'provider' : 'model' }) : stale();
    return commit ? commit(apply) : apply();
}

/** Commit an extractor result (or its failure) to reply id; refused when the reply changed or a later turn began. */
function parseNegotiation(state,content,text,prose) {
    const parsed=extractJsonObject(text);
    const error=parsed.error || reactionError(state,content,parsed.value,prose);
    return {valid:!error,complete:!error,missing:[],issues:[],errors:error?[error]:[],value:parsed.value};
}

export function applyExtraction(chat, id, content, parsed, { hash, ms = null, repaired = false, recovery = null, error = null, hud = 'closed', calls = [], movementReviewed = false, errorKind = 'model' } = {}) {
    const msg = chat[id];
    const r = rec(msg);
    if (!activeMessage(msg) || !r || r.extraction?.status !== 'pending' || r.text_hash !== hash || hash32(msg.mes) !== hash) return { changed: false };
    if (laterTurns(chat, id)) return { changed: false, late: true };
    const fold = foldChat(chat, id);
    // .127: checked after the extractor's answer and on the host's failure path alike: no replyTurnV4, no setRec, no
    // extract.failed replacement record from a broken fold; the reply stays pending
    const blocked = foldBlock(fold);
    if (blocked) return { changed: false, foldBlocked: blocked };
    const { state } = fold;
    if (!parsed?.valid) {
        const events = extractionFailedEvents(error || 'no valid answer', ms);
        const view = errorKind === 'engine' ? {} : display(msg, content, state, { failed: `the extractor gave no valid answer (${String(error || 'no answer').slice(0, 80)})`, state }, hud);
        setRec(msg, { ...r, events, ...(errorKind === 'model' ? {continuation:{kind:'world_not_applied', reason: 'model'}} : {}), extraction: { status: 'failed', error_kind:errorKind, version: EXTRACTOR_VERSION, ms, repaired, ...(recovery ? { recovery } : {}), error: String(error || '').slice(0, 200), ...(calls.length ? { llm: calls } : {}) }, corrections: [FAILED_CORRECTION, ...(stillAt(state) ? [stillAt(state)] : [])], ...view });
        return { changed: true, applied: false, failed: error || 'no valid answer' };
    }
    if (state.encounter?.negotiation?.stage==='offered') {
        const reaction=parsed.value;
        const invalid=reactionError(state,content,reaction,msg.mes);
        if (invalid) return applyExtraction(chat,id,content,null,{hash,ms,repaired,error:invalid,calls,hud});
        let res;
        try {
            res=negotiationReaction(state,content,reaction);
        } catch (error) {
            if (!(error instanceof SurrenderTransferError)) throw error;
            return applyExtraction(chat,id,content,null,{hash,ms,repaired,error:error.message,calls,hud});
        }
        const labels=Object.fromEntries(Object.values(state.encounter.combatants).map(c=>[c.id,c.label || c.name]));
        const system=[reaction.choice==='counter'?'COUNTEROFFER — '+reaction.evidence+' ('+describeTerms(reaction.terms)+')':res.outcome.note,
            ...(res.outcome?.records || []).map(r=>recordLine(res.state,r,id=>labels[id] || id,content))];
        if (res.outcome?.ended) system.push('COMBAT END — '+(res.outcome.ended.reason || (res.outcome.ended.pc_dead?'Alaric defeated':'resolved')));
        const view=display(msg,content,state,{...res,system},hud);
        setRec(msg,{...r,...view,events:[...res.events,{t:'extract.applied',d:{version:EXTRACTOR_VERSION,ms,repaired,deltas:0,rejected:0}}],
            system,extraction:{status:'applied',version:EXTRACTOR_VERSION,ms,repaired,raw:reaction,llm:calls}});
        return {changed:true,applied:true};
    }
    const res = replyTurnV4(state, content, parsed.value, { msg: id, prose: msg.mes, ms, repaired, chronicle: state.encounter || state.last?.outcome?.kind === 'combat' ? combatChronicle(chat.slice(0, id), messageEvents) : null });
    const corrections = [...res.corrections];
    if (movementReviewed && !res.events.some(e=>e.t === 'scene.moved')) corrections.push(`Movement was rechecked after empty extraction; no arrival was confirmed. ${stillAt(state) || ''}`);
    if (!parsed.complete) corrections.push(`Your last reply left open what happened to: ${parsed.missing.map((k) => `action ${k}`).join(', ')}; the engine treats it as not done.`);
    const view = display(msg, content, state, res, hud);
    setRec(msg, {
        v: RECORD_V4, events: res.events, text_hash: hash, corrections,
        extraction: { status: 'applied', version: EXTRACTOR_VERSION, ms, repaired, ...(movementReviewed ? { movement_reviewed: true } : {}), ...(recovery ? { recovery } : {}), deltas: (parsed.value.deltas || []).length, missing: parsed.missing.length ? parsed.missing : undefined, raw: parsed.value, ...(calls.length ? { llm: calls } : {}) },
        ...(r.narration ? { narration: r.narration } : {}),
        rejected: res.rejected.length ? res.rejected : undefined, system: res.system.length ? res.system : undefined, ...view,
    });
    return { changed: true, applied: true };
}

/**
 * Patch 8.2: the latest turn's times for the status line (index.js renderDebug), from the records' telemetry only:
 * the wait for the previous extraction, the engine's own time, the planner (or interpreter), the Board generator, the
 * narrator and the extractor, each call's end where the provider reported it ("length"). Null without a V4 turn.
 */
export function perfSummary(chat) {
    const u = lastUserIndex(chat);
    const r = u >= 0 ? rec(chat[u]) : null;
    if (!r?.perf) return null;
    const reply = chat.slice(u + 1).find((m) => activeMessage(m) && !m.is_user && !m.is_system);
    const x = reply ? rec(reply) : null;
    const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;
    const ends = (calls) => (calls || []).map((c) => c.finish).filter((f) => f && f !== 'stop');
    const llm = (label, part) => {
        if (!part || !Number.isFinite(part.ms)) return null;
        const odd = ends(part.llm);
        return `${label} ${sec(part.ms)}${part.repaired ? ' (repaired)' : ''}${odd.length ? ` [${odd.join(', ')}]` : ''}`;
    };
    const bits = [
        Number.isFinite(r.perf.wait_ms) && r.perf.wait_ms > 0 ? `waited ${sec(r.perf.wait_ms)}` : null,
        `engine ${sec(r.perf.engine_ms)} (${r.perf.folds} folds, ${r.perf.fold_ms} ms)`,
        llm(r.plan ? 'planner' : 'interpreter', r.plan || r.interp),
        llm('board', r.board),
        llm('forge', r.forge),
        x?.narration ? `narrator ${Number.isFinite(x.narration.ms) ? sec(x.narration.ms) : '?'}${x.narration.empty ? ' (empty)' : ''}` : null,
        x?.extraction && x.extraction.status !== 'skipped' ? (llm('extractor', x.extraction) || `extractor ${x.extraction.status}`) : null,
    ];
    return bits.filter(Boolean).join(' · ');
}

/** The reply whose extraction a reload or a chat switch cut off (index.js resumes it), or -1. */
export function pendingExtraction(chat) {
    const id = lastReplyIndex(chat, chat.length);
    const r = id >= 0 ? rec(chat[id]) : null;
    if (r && r.extraction?.status === 'pending' && r.text_hash === hash32(chat[id].mes) && !laterTurns(chat, id)) return id;
    return -1;
}

// Re-render only rows whose ancestry changed. Their original prose, inputs and records remain
// available in the transcript and export, including the original system panel in the record.
export function refreshRevisionDisplay(chat, id = -1, prior = null) {
    const changed = reconcileRevisions(chat, id, prior);
    for (const index of changed) {
        const msg = chat[index];
        const r = rec(msg);
        if (!activeMessage(msg)) {
            msg.extra ??= {};
            if (msg.extra.display_text && !r?.hud && !r?.panel) msg.avereth_prior_display = msg.extra.display_text;
            msg.extra.display_text = '[AVERETH · Inactive revision / inaktiver Verlauf]\n\n' + msg.mes;
        } else {
            if (msg.extra) delete msg.extra.display_text;
            if (msg.avereth_prior_display) {
                (msg.extra ??= {}).display_text = msg.avereth_prior_display;
                delete msg.avereth_prior_display;
            } else if (r?.panel || r?.hud) showPanel(msg, r.panel, r.hud, { playerFacing: true });
        }
    }
    return changed;
}

export function onSwipedV4(chat, id) {
    const msg = chat[id], prior = msg && previousRevision(msg);
    const changed = prior && (prior.text !== msg.mes || prior.swipe !== (msg.swipe_id ?? 0));
    return refreshRevisionDisplay(chat, id, changed && id + 1 < chat.length ? prior : null);
}

// ST's built-in Translate extension can clear display_text during MESSAGE_UPDATED,
// even with translation disabled. Rebuild this view from the currently selected record.
export function restoreEditedView(chat, id, content, hud = 'closed') {
    const msg = chat[id], r = rec(msg);
    if (!msg || !r) return;
    if (!activeMessage(msg)) {
        (msg.extra ??= {}).display_text = '[AVERETH · Inactive revision / inaktiver Verlauf]\n\n' + msg.mes;
    } else if (msg.avereth_unplayed && !msg.avereth_protected_edit && content) {
        const prefix = foldChat(chat, id);
        if (!foldBlock(prefix))
            showPanel(msg, 'Geänderte Eingabe · noch nicht ausgeführt', renderHud(prefix.state, content, hud), { playerFacing: true });
    } else if (r.panel || r.hud) showPanel(msg, r.panel, r.hud, { playerFacing: true });
}

// Native edit replaces this swipe's prose in place. Preserve its old record and attach new
// world effects only after the edited prose passes the normal extractor and save barrier.
export function onEditedV4(chat, id, content, opts = {}) {
    const msg = chat[id];
    const r = rec(msg);
    if (!msg || !r) return { changed: false };
    const hash = hash32(msg.mes);
    if (!msg.is_user && !r.extraction) {
        setRec(msg, { ...r, text_hash: hash });
        if (r.panel || r.hud) showPanel(msg, r.panel, r.hud, { playerFacing: true });
        return { changed: true, text: !!(r.panel || r.hud) };
    }
    const swipe = msg.swipe_id ?? 0;
    const bookedHash = msg.is_user ? r.input_hash : r.text_hash;
    const seen = previousRevision(msg);
    const prior = seen || { hash: bookedHash, swipe };
    const invalid = msg.is_user && inputRecordError(msg, id);
    if (invalid || msg.avereth_protected_edit) {
        const changedRows = refreshRevisionDisplay(chat, id, prior);
        if (invalid) {
            msg.avereth_protected_edit = invalid.error;
            msg.avereth_unplayed = true;
        } else {
            delete msg.avereth_protected_edit;
            delete msg.avereth_unplayed;
        }
        return { changed: true, changedRows, ...(invalid ? {refused:invalid.error} : {}) };
    }
    if (prior.hash === hash && bookedHash === hash && !msg.avereth_unplayed)
        return { changed: false };
    const archive = msg.avereth_edits ??= [];
    if (bookedHash && !archive.some(x => x.swipe === swipe && x.hash === bookedHash))
        archive.push({ swipe, hash: bookedHash, ...(seen?.hash === bookedHash ? { text: seen.text } : {}), record: r });
    const changedRows = refreshRevisionDisplay(chat, id, prior);
    const saved = archive.find(x => x.swipe === swipe && x.hash === hash && (x.text === undefined || x.text === msg.mes));
    if (r.extraction?.status === 'incomplete') {
        // An edit cannot turn an unconfirmed native generation into an extraction receipt.
        setRec(msg, { ...r, events: [], text_hash: hash });
        if (activeMessage(msg)) showPanel(msg, r.panel, r.hud, { playerFacing: true });
    } else if (saved) {
        if (msg.avereth_unplayed && msg.extra) {
            if (msg.avereth_edit_display) msg.extra.display_text = msg.avereth_edit_display;
            else delete msg.extra.display_text;
            delete msg.avereth_edit_display;
        }
        delete msg.avereth_unplayed;
        msg.extra.avereth = saved.record; // restore the recorded build and audit unchanged
        syncSwipe(msg);
        if (activeMessage(msg)) showPanel(msg, saved.record.panel, saved.record.hud, { playerFacing: true });
    } else if (msg.is_user) {
        if (!msg.avereth_unplayed && msg.extra?.display_text) msg.avereth_edit_display = msg.extra.display_text;
        msg.avereth_unplayed = true;
        restoreEditedView(chat,id,content,opts.hud);
    } else if (content && activeMessage(msg)) {
        processReplyAny(chat, id, content, opts);
    } else {
        // An edit inside an archived branch may become active much later upon a swipe back.
        // Keep this text unread until its ancestors are selected and the normal world job can run.
        const status = msg.mes.trim() ? 'pending' : 'skipped';
        setRec(msg, { v: RECORD_V4, text_hash: hash, events: [], extraction: {status,version:EXTRACTOR_VERSION} });
    }
    rememberRevision(msg);
    return { changed: true, text: true, changedRows };
}
