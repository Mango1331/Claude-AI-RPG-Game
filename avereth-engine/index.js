import { readNarratorFrames, streamReply } from './src/v4/narrator_stream.js';
import { actionStatusView } from './src/action_status.js';
// SillyTavern binding for the Avereth Engine. All game logic lives in src/ (pure ES modules, tested in Node);
// this file only wires SillyTavern events to src/host.js (V3 campaigns) and src/v4/runtime.js (Runtime V4 campaigns,
// docs/RUNTIME_V4_PLAN.md: interpreter before the narrator, extractor after it, the narrator writes prose only).
// Runtime V4:
//   * generate interceptor  -> the previous reply's world is committed first (barrier), then the player's message is
//                              interpreted (LLM), guarded and resolved; the engine block carries PLAYER ACTIONS
//   * MESSAGE_RECEIVED      -> the reply is prose; the extractor (LLM) reads it in the background, the firewall and the
//                              world handlers commit it, the HUD follows
// Runtime V3 (campaigns started before 4.0, or with the setting "V3"):
//   * generate interceptor  -> resolve the player's message, inject the engine block (setExtensionPrompt)
//   * MESSAGE_RECEIVED      -> validate the narrator's fact report, strip it from the visible text; a missing report is
//                              asked for in a separate report-only request while the player reads (generateRaw)
//   * '#' commands          -> answered by the engine as a hidden System panel, no LLM call
//   * Lore Bridge           -> the current realm and location as World Info scan text (never part of the prompt), so
//                              the narrator card's lorebook (lorebook/, docs/LOREBOOK.md) activates the right entries
import { loadContentPack } from './src/content.js';
import { onEdited, foldChat, ensureCampaign, hasCampaign, hasStoredCampaign, projectPromptHistory, messageEvents, lastPlayerIndex, lastReplyIndex, showPanel, reportRequest, applyReportAnswer, rec, setRec } from './src/host.js';
import { RECORD_V4, prepareGenerationAsync, processReplyAny, runExtraction, applyExtraction, pendingExtraction, campaignRuntime, campaignPath, campaignSupport, onEditedV4, onSwipedV4, refreshRevisionDisplay, restoreEditedView, perfSummary } from './src/v4/runtime.js';
import { createNarratorRecovery, narratorProviderResponse, providerResponseError } from './src/v4/narrator_recovery.js';
import { verifySavedChat } from './src/v4/continuation.js';
import { createWorldJobs } from './src/v4/world_jobs.js';
import { validateState } from './src/validate.js';
import { newSeed } from './src/rng.js';
import { parseSwaps, hash32, ENGINE_VERSION, NARRATOR_CONTRACT_REVISION } from './src/util.js';
import { migrateSettings, SETTINGS_REV } from './src/settings.js';
import { installDraftActions } from './src/ui_actions.js';
import { createRequestControl, capacityError } from './src/v4/request_control.js';
import { createChatPersistence, decodeSave, chatOrigin, originKey } from './src/v4/action_persistence.js';
import { installActionComposer } from './src/action_composer.js';

const MODULE = 'avereth';
const PROMPT_KEY = 'avereth_engine';
const LORE_KEY = 'avereth_lore_keys';
const DEFAULTS = { enabled: true, compactOutput: false, budget: 1400, rulesBudget: 800, recentTurns: 4, depth: 0, showDebug: false, loreSource: 'auto', wordSwaps: 'ledger=register', hud: 'closed', historyTurns: 4, stripTrackers: true, recoverReports: true, runtime: 'v4', planner: true, settingsRev: SETTINGS_REV };
const REPORT_WAIT_MS = 60000; // the next turn waits this long at most for a report still being asked for
const LLM_TIMEOUT_MS = 120000;

let content = null;
let nativeHost = null;
let lastContext = null;
let lastProjection = null;
let legacyWarned = null;
let persistenceBlocked = null;
// Build .107 (audit of .106): SillyTavern 1.19 keeps one chat array for every chat and refills it in place, so the
// block names its chat and record: another chat is never blocked or released by it
const blockPersistence = (c, id) => { persistenceBlocked = { chat: c.chat, chatId: hostChatKey(c), id, message: c.chat[id] }; };
// Architecture patch A (.127): a campaign record that no longer folds whole stops every new authoritative step. The
// host only shows it (no chat message, no save, no failure record): the player loads a valid state or deletes from there
let foldWarned = null;
function showFoldBlock(block) {
    if (!block) return;
    const key = `${hostChatKey(ctx())}:${block.index}:${block.type}`;
    if (foldWarned !== key) toastr.error(block.notice, 'Avereth Engine', { timeOut: 0, extendedTimeOut: 0 });
    foldWarned = key;
}
// Architecture patch B1 (.130): a campaign of a retired protocol (V3, path A, Ruleset 1, an older F configuration) is
// refused at every host entry before anything is resolved, asked, recorded or saved; the notice says why, once per chat
let supportWarned = null;
function unsupported(chat) {
    const block = campaignSupport(chat);
    if (!block) return null;
    const key = `${hostChatKey(ctx())}:${block.reason}`;
    if (supportWarned !== key) toastr.error(block.notice, 'Avereth Engine', { timeOut: 0, extendedTimeOut: 0 });
    supportWarned = key;
    return block;
}
// B1 review (.131): the greeting that stores this campaign's start no longer matches its record (changed without the
// edit event the engine re-reads): nothing is started over it and nothing is booked; the notice says how to recover
let hiddenWarned = null;
function hiddenStart() {
    if (hiddenWarned === hostChatKey(ctx())) return;
    hiddenWarned = hostChatKey(ctx());
    toastr.error('CAMPAIGN START HIDDEN — the greeting that holds this campaign\'s start record was changed without the engine '
        + 'reading the edit. The engine starts no second campaign over it. Nothing was booked, saved or sent to a model. '
        + 'Swipe back to the original greeting, or edit and save the greeting once more so the engine re-reads it.',
    'Avereth Engine', { timeOut: 0, extendedTimeOut: 0 });
}
// Hotfix .137 (natural batch 20261031-125921Z: CAMPAIGN START HIDDEN at turn 1 for all three classes): SillyTavern keeps a
// greeting raw ({{user}}, {{pick::…}}) until it writes the resolved text into chat[0].mes, when message 0 is rendered
// (script.js messageFormatting) and at the first generation (Generate). When it rebuilds a chat nobody has played yet
// from the card (createOrEditCharacter, e.g. on the runner's chat rename) it announces the greeting (MESSAGE_RECEIVED
// 'first_message') before rendering it, so the campaign was started on the raw text and hidden right after. Right before
// a start, the greeting is resolved once by SillyTavern's own substituteParams ({{pick}} is seeded per chat: the text it
// shows and keeps). Never once a start record is stored: a later change of the greeting stays a change.
function settleGreeting(c) {
    const first = c.chat?.[0];
    if (!first || first.is_user || first.is_system || hasStoredCampaign(c.chat) || typeof c.substituteParams !== 'function') return;
    const resolved = c.substituteParams(first.mes);
    if (typeof resolved === 'string' && resolved !== first.mes) first.mes = resolved;
}
let pendingReport = null; // {chatId, id, hash, job}: the report request of the latest reply, while it runs
let llmPath = null; // Runtime V4: which call the last LLM request used ('custom endpoint' | 'generateRaw')
let narrationStart = null; // Patch 8.2: {chatId, user, t}: when the engine block of a story turn was handed to SillyTavern
let narratorRequest = null;
let generationRequest = 0; // an older async interceptor must never publish into a newer request or chat
let actionStatus = 'Bereit';
let actionComposer = null;
const modernHost = () => !!ctx().eventTypes?.MESSAGE_SENT && !!ctx().chatMetadata;
function setActionStatus(text) {
    actionStatus=text;
    refreshActionStatus();
}
const streamNotice = 'Erzählung unvollständig – per Swipe oder Regenerate neu erzählen';
const streamOwners = new WeakMap();
let NativeEventSourceStream;
const incomplete = msg => rec(msg)?.extraction?.status === 'incomplete';
function bindStreamReply() {
    const c = ctx(), owner = streamOwners.get(c.streamingProcessor);
    const msg = streamReply(owner, c, generationRequest);
    if (msg && !owner.reply) {
        owner.reply = msg;
        owner.swipe = msg.swipe_id ?? 0;
        owner.previous = rec(msg);
        // A native save, reload or failed swipe may happen before MESSAGE_RECEIVED (or without it).
        setRec(msg, { v: RECORD_V4, events: [], extraction: { status: 'incomplete' } });
        refreshActionStatus();
    }
    return msg;
}
function latestReply(c) { return c.chat[lastReplyIndex(c.chat, c.chat.length)]; }
function actionView() {
    const open=worldOpen();
    return actionStatusView({unknown:requestControl.blocked(providerKey()),worldRunning:!!worldJobs.currentJob(),
        saving:!!persistence?.pending(),saveFailed:persistenceBlocked?.chatId===hostChatKey(ctx()),
        invalidInput:ctx().chat.some(m=>!m.avereth_inactive && m.avereth_protected_edit),
        incomplete:incomplete(latestReply(ctx())),worldPending:open?.record.extraction.status==='pending',worldFailed:open?.record.extraction.status==='failed',phase:actionStatus});
}
function refreshActionStatus() {
    const node=document.getElementById('avereth-action-status');
    if(node)node.textContent=actionView().text;
    actionComposer?.updateStatus();
}
function providerKey() {
    const s = ctx().chatCompletionSettings || {};
    let endpoint = '';
    try { const url = new URL(s.custom_url); endpoint = url.origin + url.pathname; } catch { /* built-in source */ }
    return `${s.chat_completion_source || ctx().mainApi}:${endpoint}`;
}
const requestControl = createRequestControl({storage:globalThis.localStorage,locks:globalThis.navigator?.locks,
    changed:(_key,s) => { if (s.leases.some(l=>l.status==='unknown')) setActionStatus('Remoteabschluss unbekannt – kein automatischer neuer Versuch'); },
});
let persistence;
async function saveAtOrigin(c, current = () => true) {
    if (!modernHost()) return c.saveChat();
    const epoch=generationRequest;
    return persistence.save(c, () => epoch===generationRequest && current());
}
function worldOpen() {
    const c=ctx(),i=lastReplyIndex(c.chat,c.chat.length),r=rec(c.chat[i]);
    return r?.extraction && ['pending','failed'].includes(r.extraction.status) ? {id:i,record:r} : null;
}
function actionBlocked() {
    const view=actionView();return view.blocked?view.text:null;
}
async function resumeActionCompletion() {
    if(requestControl.blocked(providerKey())) {
        if(!globalThis.confirm('Der vorige Remoteabschluss ist unbekannt. Prüfe die Providerbelegung. Ein einziger neuer Versuch kann eine noch laufende Anfrage überlappen. Trotzdem freigeben?'))return;
        if(!await requestControl.allowOne(providerKey()))throw new Error('Kein weiterer Wiederholungsversuch freigegeben');
    }
    const c=ctx();
    // Retry only the exact save / extraction. Never replay the user mechanics to repair persistence.
    await saveAtOrigin(c);persistenceBlocked=null;
    const open=worldOpen();
    if(open && !c.chat.slice(open.id+1).some(m=>!m.avereth_inactive && m.is_user && rec(m)?.events?.length)) {
        if(open.record.extraction.status==='failed')setRec(c.chat[open.id],{...open.record,events:[],continuation:undefined,extraction:{...open.record.extraction,status:'pending'}});
        await saveAtOrigin(c);await startWorld(open.id);
    }
    setActionStatus(worldOpen()?'Weltabgleich weiterhin offen':'Gespeichert');
}

function hostChatKey(c) { return JSON.stringify([c.characters?.[c.characterId]?.avatar || '',c.getCurrentChatId()]); }

function ctx() {
    return SillyTavern.getContext();
}

function settings() {
    const { extensionSettings } = ctx();
    // Patch 7.2: settings saved before 4.3.0-c.6.6.21 keep their planner value for the campaigns started then (src/settings.js)
    extensionSettings[MODULE] = migrateSettings(extensionSettings[MODULE], DEFAULTS);
    return extensionSettings[MODULE];
}

async function loadContent() {
    const base = new URL('.', import.meta.url);
    content = await loadContentPack(async (name) => {
        const res = await fetch(new URL(`content/${name}`, base));
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
        return res.json();
    });
}

function setPrompt(text) {
    const c = ctx();
    c.setExtensionPrompt(PROMPT_KEY, text || '', 1 /* IN_CHAT */, settings().depth, false, 0 /* SYSTEM */);
}

/** Lore Bridge: position NONE (-1) is never inserted into the prompt; scan = true lets World Info match it. */
function setLoreKeys(keys) {
    const c = ctx();
    c.setExtensionPrompt(LORE_KEY, (keys || []).join('\n'), -1 /* NONE */, 0, true /* scanned by World Info */, 0);
}

/** The lorebook linked to the narrator card as Character Lore, if any (SillyTavern keeps it in data.extensions.world). */
function cardLorebook() {
    const c = ctx();
    return c.characters?.[c.characterId]?.data?.extensions?.world || '';
}

/** Descriptive world lore from the card's lorebook instead of the engine block ('auto': whenever the card has one). */
function loreFromWorldInfo() {
    const src = settings().loreSource;
    return src === 'worldinfo' || (src === 'auto' && !!cardLorebook());
}

/** Settings for the engine block. Turns still in the prompt's history window are not retrieved again, turns before it are. */
/** The runtime a campaign started in this chat gets (the setting applies to new campaigns only). */
// Architecture patch B1 (.130): every new campaign starts on the one supported protocol (V4-C); the old runtime and
// planner settings no longer choose a retired variant (their UI goes with package E)
function newRuntime() {
    return 'v4';
}

/** Patch 7.2: the path a V4 campaign started now keeps; since B1 always C (the semantic planner). */
function newPlanner() {
    return true;
}

function engineSettings() {
    const s = settings();
    const recentTurns = s.historyTurns > 0 ? Math.min(s.recentTurns, s.historyTurns) : s.recentTurns;
    return { ...s, recentTurns, engineLore: !loreFromWorldInfo() };
}

function postPanel(text) {
    const c = ctx();
    const message = {
        name: 'Avereth System', is_user: false, is_system: true, send_date: new Date().toLocaleString(),
        mes: '```\n' + text + '\n```', extra: { type: 'comment', isSmallSys: false, avereth_panel: true },
    };
    c.chat.push(message);
    c.addOneMessage(message);
    return message;
}

// ------------------------------------------------------------------------------------------ Runtime V4 LLM calls
/**
 * One structured LLM call of Runtime V4 (interpreter, extractor, Board generator): plain JSON per instruction, low
 * temperature (P0/S0, S1, S2). With the Chat Completion source "Custom (OpenAI-compatible)" the request goes to
 * SillyTavern's own endpoint exactly as the P0 tools sent it (tools/p0/lib/provider.mjs, verified against ST 1.19):
 * SillyTavern adds the API key, the extension never sees it. Any other source uses generateRaw (temperature as the
 * active preset sets it).
 */
async function v4Llm({ messages, temperature = 0.1, maxTokens = 2500, signal = null, purpose = 'structured' }) {
    const c = ctx();
    const oai = c.chatCompletionSettings;
    if (c.mainApi === 'openai' && oai?.chat_completion_source === 'custom' && typeof c.getRequestHeaders === 'function') {
        llmPath = 'custom endpoint';
        const ctl = new AbortController();
        let timedOut = false;
        const abortWithWorld = () => ctl.abort();
        if (signal?.aborted) ctl.abort();
        else signal?.addEventListener('abort', abortWithWorld, { once: true });
        const timer = setTimeout(() => {
            if (modernHost()) setActionStatus('Provider antwortet noch – Belegung bleibt reserviert');
            else { timedOut = true; ctl.abort(); }
        }, LLM_TIMEOUT_MS);
        try {
            const body = {
                chat_completion_source: 'custom', custom_url: oai.custom_url, model: oai.custom_model, messages, max_tokens: maxTokens, temperature, stream: false,
                custom_include_body: String(oai.custom_include_body || ''), custom_exclude_body: String(oai.custom_exclude_body || ''),
                custom_include_headers: String(oai.custom_include_headers || ''), custom_prompt_post_processing: oai.custom_prompt_post_processing || '',
            };
            // Only a rejected browser request gets transport provenance. Setup/program errors remain unknown.
            const pending = fetch('/api/backends/chat-completions/generate', { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify(body), signal: ctl.signal, averethPhase:purpose });
            let res;
            try { res = await pending; }
            catch (error) {
                if (error instanceof TypeError && error.message === 'Failed to fetch') {
                    throw Object.assign(new Error(error.message), { code: 'LLM_TRANSPORT', phase: 'fetch', settled: true });
                }
                throw error;
            }
            const json = await res.json().catch(() => null);
            if (!res.ok || !json || json.error || !json.choices) throw providerResponseError(res.status, json);
            const m = json.choices[0]?.message || {};
            const text = typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((x) => x?.text || '').join('') : '';
            // Patch 8.2: why the answer ended and the provider's token counts go along as telemetry (runtime.js callMeta)
            return { content: text, finish_reason: json.choices[0]?.finish_reason ?? null, usage: json.usage ?? null };
        } catch (error) {
            if (modernHost() && requestControl.blocked(providerKey())) throw capacityError();
            if (signal?.aborted) throw Object.assign(new Error('LLM request cancelled by caller'), { code: 'LLM_CANCELLED' });
            if (timedOut) throw Object.assign(new Error(`LLM request timed out after ${LLM_TIMEOUT_MS} ms`), { code: 'LLM_TIMEOUT' });
            throw error;
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abortWithWorld);
        }
    }
    llmPath = 'generateRaw';
    if (typeof c.generateRaw !== 'function') throw new Error('SillyTavern offers no generateRaw');
    if (signal?.aborted) throw Object.assign(new Error('world extraction cancelled'), { code: 'LLM_CANCELLED' });
    // generateRaw takes one prompt: a repair's earlier answer and error list follow the request as text
    const [system, ...rest] = messages;
    const prompt = rest.map((m) => (m.role === 'assistant' ? `YOUR PREVIOUS ANSWER:\n${m.content}` : m.content)).join('\n\n');
    return c.generateRaw({ systemPrompt: system?.content || '', prompt, responseLength: maxTokens });
}

/** 10B-4c.2: capture the origin chat and active swipe for each world job.
 * Switched/reloaded chats can only be updated by their OWN newly resumed job.
 */
async function afterHostSaves(isCurrent, apply) {
    // ST marks its conditional save before compressing the snapshot; the Engine queue also covers direct saves.
    // Wait only for existing work. No retry, acknowledgement or new save is created here.
    while (isCurrent() && (nativeHost?.isChatSaving || persistence?.pending()))
        await new Promise(resolve => setTimeout(resolve, 25));
    return isCurrent() ? apply() : {changed:false,cancelled:true};
}
const worldJobs = createWorldJobs({
    changed:refreshActionStatus,
    settled: metrics => console.info('[Avereth] world completion',JSON.stringify(metrics)),
    active: () => {
        const c = ctx();
        return { chat: c.chat, chatId: hostChatKey(c) };
    },
    run: async (chat, id, { isCurrent, signal }) => {
        if (campaignSupport(chat)) return { changed: false, unsupported: true };
        const result = await runExtraction(chat, id, content, (req) => v4Llm({ ...req, signal }), { hud: settings().hud, compactOutput: settings().compactOutput === true, isCurrent, commit:apply=>afterHostSaves(isCurrent,apply) });
        if (result?.foldBlocked && isCurrent()) { showFoldBlock(result.foldBlocked); renderDebug(); }
        return result;
    },
    failed: ({chat, id, hash}, error, isCurrent) => afterHostSaves(isCurrent,()=>applyExtraction(chat,id,content,null,{hash,error:String(error?.message || error),errorKind:'engine',hud:settings().hud})),
    applied: async ({ id }, result, isCurrent) => {
        if (!isCurrent()) return;
        const c = ctx();
        try { rerender(c, id); } catch (error) { console.error('[Avereth] display failed',error); }
        if (!isCurrent()) return;
        try {
            await saveAtOrigin(c);
            if (rec(c.chat[id])?.continuation) await verifySavedChat(c,id,isCurrent);
        } catch (error) {
            if (isCurrent()) blockPersistence(c, id);
            throw error;
        }
        if (isCurrent()) renderDebug();
    },
    onError: (err) => console.error('[Avereth] world extraction failed', err),
});
function startWorld(id) {
    setActionStatus('Weltabgleich läuft');
    return worldJobs.start(id);
}

// ------------------------------------------------------------------------------------------ interceptor
globalThis.averethInterceptor = async function (chat, contextSize, abort, type) {
    const request = ++generationRequest;
    const c = ctx();
    const chatId = hostChatKey(c);
    const isCurrent = () => request === generationRequest && ctx().chat === c.chat && hostChatKey(ctx()) === chatId;
    const s = settings();
    if (!s.enabled || !content) {
        if (content) { setPrompt(''); setLoreKeys([]); }
        return;
    }
    try {
        if(modernHost()) {
            const bindingError=await actionComposer?.guard();
            if ((!type || type === 'normal' || type === 'continue') && incomplete(latestReply(ctx()))) {
                abort(true); setActionStatus(streamNotice); return;
            }
            if(bindingError || requestControl.blocked(providerKey())) {
                abort(true);setActionStatus(bindingError || 'Remoteabschluss unbekannt');return;
            }
        }
        // B1 review (.131): the version guard reads the stored start record before anything may start a campaign, so a
        // refused campaign is never re-initialised over; a stored start hidden by a changed greeting is never replaced
        if (unsupported(c.chat)) { abort(true); setPrompt(''); setLoreKeys([]); renderDebug(); return; }
        if (!hasCampaign(c.chat)) {
            settleGreeting(c);
            const created = ensureCampaign(c.chat, content, { seed: newSeed(), runtime: newRuntime(), planner: newPlanner() });
            if (created === 'legacy') {
                if (legacyWarned !== hostChatKey(c)) toastr.warning('Avereth Engine: this chat was played without the engine. Start a new chat to use it.');
                legacyWarned = hostChatKey(c);
                setPrompt('');
                return;
            }
            if (created === 'hidden') { abort(true); setPrompt(''); setLoreKeys([]); hiddenStart(); renderDebug(); return; }
        }
        // the report still being asked for belongs to the turn before this new message: its facts come first
        if (pendingReport && pendingReport.chatId === hostChatKey(c) && (!type || type === 'normal') && lastPlayerIndex(c.chat) > pendingReport.id) {
            await Promise.race([pendingReport.job, new Promise((done) => setTimeout(done, REPORT_WAIT_MS))]);
            if (!isCurrent()) { abort(true); return; }
        }
        // Runtime V4 barrier: never overlap a new normal turn with the previous reply's extractor/repair.
        // The LLM call itself has a finite timeout; letting a second call overtake it can exceed provider concurrency.
        // Patch 8.2: how long it waited is kept with the turn's record (telemetry)
        let waited = null;
        if ((!type || type === 'normal') && campaignRuntime(c.chat) === 'v4') {
            // The saved reply may still be pending after a page reload, a
            // disconnected provider, or a chat switch. Resume BEFORE the new
            // player turn can let closeLatePending() mark it late.
            const id = pendingExtraction(c.chat);
            if (id >= 0 && lastPlayerIndex(c.chat) > id) startWorld(id);
            const job = worldJobs.currentJob();
            // The extraction may have applied its events while the host is
            // still saving the chat. Await that save before resolving the
            // next turn even when pendingExtraction() already became -1.
            if (job && lastPlayerIndex(c.chat) > worldJobs.currentId()) {
                const w0 = Date.now();
                const completed = await job;
                if (completed?.persistenceFailed) throw new Error('World records could not be saved safely; no new turn was started.');
                if (completed?.foldBlocked) { abort(true); setPrompt(''); showFoldBlock(completed.foldBlocked); renderDebug(); return; }
                if (!isCurrent()) { abort(true); return; }
                waited = Date.now() - w0;
            }
        }
        const blocked = persistenceBlocked;
        if (blocked && blocked.chat === c.chat && blocked.chatId === hostChatKey(c)) {
            // the same records still in memory: exactly they must be on disk. A chat opened again since was read
            // from disk (its unsaved records are gone from memory too): its records up to there are checked as they are
            const end = c.chat[blocked.id] === blocked.message ? blocked.id : Math.min(blocked.id, c.chat.length - 1);
            await verifySavedChat(c, end, isCurrent);
            if (persistenceBlocked === blocked) persistenceBlocked = null;
        }
        if(modernHost() && (!type || type==='normal') && worldOpen()?.record.extraction.status==='failed') {
            abort(true);setActionStatus('Weltabgleich fehlgeschlagen – Abschluss ausdrücklich fortsetzen');return;
        }
        setActionStatus('Aktion wird aufgelöst');
        const r = await prepareGenerationAsync(c.chat, content, { type, settings: engineSettings(), llm: v4Llm, waited, isCurrent });
        // ST's abort callback is local to this interceptor invocation, not the shared generation AbortController.
        if (!isCurrent()) { abort(true); return; }
        if (r.stale) { abort(true); return; }
        setLoreKeys(r.loreKeys);
        if (r.action === 'clear' || r.action === 'none') {
            // 'clear': quiet/impersonate generations get no engine block; 'none': no campaign or no player message yet
            setPrompt('');
            if (r.dirty) await saveAtOrigin(c);
            return;
        }
        if (r.action === 'fold_blocked') {
            abort(true);
            setPrompt('');
            showFoldBlock(r.block);
            renderDebug();
            return;
        }
        if (r.action === 'not_executed') {
            abort(true);
            setPrompt('');
            const existing=c.chat.find(m => m.extra?.avereth_notice_for === r.index);
            if (!existing) {
                const notice=postPanel(r.notice);
                notice.extra.avereth_notice_for=r.index;
            }
            const end=c.chat.length-1;
            try {
                await saveAtOrigin(c);
                await verifySavedChat(c,end,isCurrent);
            } catch (error) {
                if (isCurrent()) blockPersistence(c, end);
                throw error;
            }
            renderDebug();
            return;
        }
        if (r.action === 'abort') {
            abort(true);
            setPrompt('');
            if (r.notice) toastr.error(r.notice);
            if (r.dirty) await saveAtOrigin(c);
            return;
        }
        if (r.action === 'panels') {
            abort(true);
            setPrompt('');
            // the command line is UI, not story: hide it from future prompts (like /hide) and answer as a System panel
            c.chat[r.index].is_system = true;
            document.querySelector(`#chat .mes[mesid="${r.index}"]`)?.setAttribute('is_system', 'true');
            postPanel(r.panels.join('\n\n'));
            await saveAtOrigin(c);
            return;
        }
        lastContext = r.context;
        setPrompt(r.context.text);
        setActionStatus('Erzählung läuft');
        narrationStart = { chatId: hostChatKey(c), user: lastPlayerIndex(c.chat), t: Date.now(), inputHash: hash32(c.chat[lastPlayerIndex(c.chat)]?.mes || ''), context: r.context.diagnostics, epoch: generationRequest, chat: c.chat };
        // prompt-only: retired tracker blocks out of the history, and only the last exchanges (the saved chat is untouched)
        lastProjection = projectPromptHistory(chat, { keepTurns: Number(s.historyTurns) || 0, currentInput:c.chat[lastPlayerIndex(c.chat)] });
        if (r.errors?.length) console.warn('[Avereth] fold errors', r.errors);
        if (r.dirty) await saveAtOrigin(c);
        renderDebug();
    } catch (err) {
        if (!isCurrent()) { abort(true); return; }
        abort(true);
        console.error('[Avereth] interceptor failed', err);
        toastr.error(`Avereth Engine: ${err.message}`);
        setPrompt('');
    }
};

// ------------------------------------------------------------------------------------------ events
/**
 * Re-draw a message SillyTavern has already rendered. Without streaming, MESSAGE_RECEIVED fires before the message is
 * drawn: SillyTavern then renders our cleaned text itself, and updateMessageBlock on the missing element throws inside
 * its reasoning UI (Testrun 2). A display problem must never stop the engine from saving its record.
 */
function rerender(c, id) {
    if (!document.querySelector(`#chat [mesid="${id}"]`)) return;
    try {
        c.updateMessageBlock(id, c.chat[id]);
    } catch (err) {
        console.warn('[Avereth] could not re-render message', id, err);
    }
}

const narratorRecovery = createNarratorRecovery({
    active: () => { const c = ctx(); return { chat: c.chat, chatId: hostChatKey(c), epoch: generationRequest,
        enabled: settings().enabled && settings().recoverReports && (!modernHost() || !requestControl.blocked(providerKey())) && typeof c.generate === 'function', group: c.groupId,
        busy: !!document.querySelector('#mes_stop')?.offsetParent }; },
    save: () => saveAtOrigin(ctx()),
    generate: type => ctx().generate(type),
    failed: error => toastr.warning(`Avereth: narrator recovery failed (${error.message}); regenerate manually.`),
});

// ST 1.19 exposes request-ready but no structured generation-error event.
// Observe only its exact non-streaming Narrator request; all other fetches are untouched.
const hostFetch = globalThis.fetch.bind(globalThis);
persistence = createChatPersistence({request:hostFetch,headers:()=>ctx().getRequestHeaders(),active:ctx,locks:globalThis.navigator?.locks,settled:refreshActionStatus,
    changed:(status,key,error)=>{
        try {if(key!==originKey(chatOrigin(ctx())))return;}catch{return;}
        if(status==='saved')persistenceBlocked=null;
        if(status==='error' && !/Stale|Older native/.test(error?.message || ''))blockPersistence(ctx(),ctx().chat.length-1);
        setActionStatus(status==='saving'?'Speichern':status==='saved'?'Gespeichert':`Speichern offen: ${error?.message || ''}`);
    },
});
globalThis.fetch = async function (url, options) {
    if (modernHost() && settings().enabled && String(url).endsWith('/api/chats/save')) {
        const data = await decodeSave(options);
        // The delayed payload may belong to an Avereth chat which is no longer active.
        if(!hasStoredCampaign(data.chat.slice(1)) && !hasStoredCampaign(ctx().chat))return hostFetch(url,options);
        try {return await persistence.write(data);}
        catch(error) {
            // Rejection is not a save receipt. ST's native saveChat checks response.ok; a 2xx here
            // would silently acknowledge an origin/snapshot which never reached persistence.
            if(/Stale|Older native/.test(error.message))return Response.json({error:'avereth_save_rejected',message:error.message},{status:409,statusText:error.message});
            throw error;
        }
    }
    const physical = () => {
        if (!modernHost() || !settings().enabled || !String(url).endsWith('/api/backends/chat-completions/generate')) return hostFetch(url, options);
        const body = JSON.parse(options.body), c=ctx(), userIndex=lastPlayerIndex(c.chat), user=c.chat[userIndex], input=user?.extra?.avereth_action_input;
        const processor = c.streamingProcessor;
        let inspectStream;
        if (body.stream && processor && options.signal === processor.abortController.signal && user &&
            !c.groupId && hasCampaign(c.chat) && campaignRuntime(c.chat) === 'v4') {
            let finish;
            const receipt = new Promise(resolve => { finish = resolve; });
            streamOwners.set(processor, { processor, receipt, chat: c.chat, chatId: c.getCurrentChatId(),
                characterId: c.characterId, epoch: generationRequest, index: userIndex, user, input: user.mes, inputId: input?.id, revision: input?.revision });
            inspectStream = copy => readNarratorFrames(copy.body.pipeThrough(new NativeEventSourceStream()), finish);
        }
        return requestControl.fetchRequest(providerKey(),()=>hostFetch(url,options),{signal:options.signal,stream:!!body.stream, inspectStream,
            meta:{phase:options.averethPhase || ((body.messages || []).some(m=>String(m.content).includes('[AVERETH ENGINE'))?'narrator':'host_other'),
                origin_chat:hostChatKey(c),input_id:input?.id || (user ? `user:${userIndex}:${hash32(user.mes || '')}` : null),revision:input?.revision ?? null,generation_epoch:generationRequest}});
    };
    const job = narratorRequest;
    if (!job || !String(url).endsWith('/api/backends/chat-completions/generate') || options?.body !== job.body)
        return physical();
    narratorRequest = null;
    return narratorProviderResponse(physical, {
        signal: options.signal,
        isCurrent: () => {
            const c = ctx();
            return (!modernHost() || !requestControl.blocked(providerKey())) && settings().enabled && settings().recoverReports && c.chat === job.chat && hostChatKey(c) === job.chatId
                && generationRequest === job.epoch && c.chat[job.u] === job.user && job.user.mes === job.input
                && rec(job.user) === job.record && c.chat.length === job.length;
        },
        mark: data => { setRec(job.user, { ...job.record, narrator_recovery: data }); job.record = rec(job.user); },
        save: () => saveAtOrigin(ctx()),
    });
};

async function onMessageReceived(messageId, type) {
    if (!settings().enabled || !content) return;
    const c = ctx();
    const chat = c.chat; // stable origin, even if getContext() later points at another chat
    const chatId = hostChatKey(c);
    try {
        if (unsupported(chat)) { renderDebug(); return; }
        const processor = c.streamingProcessor, owner = streamOwners.get(processor);
        const msg = chat[Number(messageId)];
        if (owner && processor.messageId === Number(messageId) && type !== 'first_message') {
            if (owner.handled || !bindStreamReply() || msg !== owner.reply) return;
            owner.handled = true;
            const text = msg.mes;
            const complete = processor.isFinished && !processor.isStopped && !processor.abortController.signal.aborted && await owner.receipt;
            if (streamReply(owner, ctx(), generationRequest) !== msg || msg.mes !== text) return;
            if (!complete || processor.abortController.signal.aborted) {
                showPanel(msg, streamNotice, '', {playerFacing:true});
                setRec(msg, { v: RECORD_V4, text_hash:hash32(text), events:[], panel:streamNotice, extraction:{status:'incomplete'} });
                rerender(c, Number(messageId));
                await saveAtOrigin(c);
                return;
            }
            // Preserve .203's identical-text deduplication for an already committed revision.
            if (owner.previous?.text_hash === hash32(text) && owner.previous.extraction?.status !== 'incomplete')
                setRec(msg, owner.previous);
            else delete msg.extra.avereth;
        } else if (incomplete(msg)) return;
        const recover = settings().recoverReports && typeof c.generateRaw === 'function';
        // the greeting of a new chat arrives here too (SillyTavern: MESSAGE_RECEIVED 'first_message') and starts the campaign
        // Patch 8.2: the narrator's time, from the engine block handed over to the reply received (telemetry)
        const snapshot = narrationStart;
        const started = narrationStart?.chatId === hostChatKey(c) && Number(messageId) > narrationStart.user ? narrationStart.t : null;
        narrationStart = null;
        if (!hasCampaign(chat)) settleGreeting(c); // the greeting of a new chat starts the campaign here (hotfix .137)
        const r = processReplyAny(c.chat, Number(messageId), content, { seed: newSeed(), swaps: parseSwaps(settings().wordSwaps), hud: settings().hud, stripTrackers: settings().stripTrackers, recover, runtime: newRuntime(), planner: newPlanner(), narrationMs: started === null ? null : Date.now() - started, narratorContext: started !== null && snapshot.chat === c.chat && snapshot.epoch === generationRequest && snapshot.inputHash === hash32(c.chat[snapshot.user]?.mes || '') ? snapshot.context : null });
        if (r.foldBlocked) { showFoldBlock(r.foldBlocked); renderDebug(); return; }
        if (!r.changed) return;
        rerender(c, Number(messageId));
        await saveAtOrigin(c);
        // MESSAGE_RECEIVED can finish saving after the user switched chats.
        // Never start a world job at the same index in an unrelated chat.
        if (ctx().chat !== chat || hostChatKey(ctx()) !== chatId) return;
        if (r.result?.rejected?.length) console.info('[Avereth] rejected report items', r.result.rejected);
        renderDebug();
        if (r.recover) requestReport(Number(messageId));
        if (r.extract) startWorld(Number(messageId));
        // Patch 8.2: a reply without story text is not read (runtime.js processReplyAny); the System block says so too
        if (r.empty) {
            if (narratorRecovery.queue(Number(messageId))) narratorRecovery.finish();
            else toastr.warning('Avereth Engine: the narrator returned no story text after recovery. Swipe or regenerate the reply.');
        }
    } catch (err) {
        console.error('[Avereth] reply processing failed', err);
        toastr.error(`Avereth Engine: ${err.message}`);
    }
}

/**
 * The reply had no valid fact report: ask for it in a separate report-only request (host.js reportRequest) while the
 * player reads, and apply the answer as if the narrator had written it. The next player message waits for it.
 */
function requestReport(id) {
    const c = ctx();
    const chatId = hostChatKey(c);
    if (typeof c.generateRaw !== 'function') return;
    const req = reportRequest(c.chat, id, content, { settings: engineSettings() });
    // the same text is asked for once; a new swipe of the same message is a new request
    if (!req || (pendingReport?.chatId === chatId && pendingReport.id === id && pendingReport.hash === req.hash)) return;
    const started = Date.now();
    const job = (async () => {
        let answer = null;
        try {
            answer = await c.generateRaw({ systemPrompt: req.systemPrompt, prompt: req.prompt, responseLength: 1024 });
        } catch (err) {
            console.warn('[Avereth] report request failed', err);
        }
        const now = ctx();
        if (hostChatKey(now) !== chatId) return;
        const res = applyReportAnswer(now.chat, id, content, answer, { hash: req.hash, ms: Date.now() - started, hud: settings().hud, stripTrackers: settings().stripTrackers });
        if (!res.changed) return;
        rerender(now, id);
        await saveAtOrigin(now);
        renderDebug();
    })().catch((err) => console.error('[Avereth] report request failed', err));
    pendingReport = { chatId, id, hash: req.hash, job };
    job.finally(() => { if (pendingReport?.job === job) pendingReport = null; });
}

/** A report request (V3) or a world extraction (V4) cut off by a reload or a chat switch: the latest reply asks again. */
function resumeReport() {
    const c = ctx();
    if (!settings().enabled || !content || !c.chat?.length) return;
    if (campaignSupport(c.chat)) return;
    if (campaignRuntime(c.chat) === 'v4') {
        const id = pendingExtraction(c.chat);
        if (id >= 0) startWorld(id);
        return;
    }
    if (!settings().recoverReports) return;
    const id = c.chat.findLastIndex((m) => !m.is_user && !m.is_system);
    if (id >= 0 && c.chat[id].extra?.avereth?.recovery === 'pending') requestReport(id);
}

function clearRevisionContext() {
    lastContext = null;
    lastProjection = null;
    setPrompt('');
    setLoreKeys([]);
}

const updatedEdits = new WeakMap();
async function onNativeEditRendered(messageId) {
    const c = ctx(), id = Number(messageId), msg = c.chat[id];
    if (!msg || updatedEdits.get(msg) !== generationRequest) return;
    updatedEdits.delete(msg);
    const before = msg.extra?.display_text;
    if (!before) restoreEditedView(c.chat,id,content,settings().hud);
    if (msg.extra?.display_text) rerender(c,id);
    if (msg.extra?.display_text !== before) await saveAtOrigin(c);
}

async function onMessageEdited(messageId) {
    generationRequest++;
    narratorRecovery.invalidate();
    worldJobs.invalidate(); // pending reply or preceding player message may have changed
    if (!settings().enabled) return;
    const c = ctx();
    try {
        if (unsupported(c.chat)) return;
        const r = campaignRuntime(c.chat) === 'v4' ? onEditedV4(c.chat, Number(messageId), content, { hud: settings().hud, stripTrackers: settings().stripTrackers }) : onEdited(c.chat, Number(messageId), content);
        if (!r.changed) {
            resumeReport(); // edits to a player message can also cancel a pending world job
            return;
        }
        clearRevisionContext();
        // Native formatting and the built-in Translate extension both finish on MESSAGE_UPDATED.
        // Order at edit time, after extensions have installed their own handlers.
        if (modernHost() && c.eventTypes.MESSAGE_UPDATED && c.eventSource.makeLast && r.text) {
            updatedEdits.set(c.chat[Number(messageId)],generationRequest);
            c.eventSource.makeLast(c.eventTypes.MESSAGE_UPDATED,onNativeEditRendered);
        } else if (r.text) {
            const msg = c.chat[Number(messageId)];
            setTimeout(() => { if (ctx().chat[Number(messageId)] === msg) rerender(c,Number(messageId)); },0);
        }
        for (const row of r.changedRows || []) rerender(c, row);
        if (r.refused) toastr.warning(`Avereth Engine: ${r.refused}`);
        await saveAtOrigin(c);
        renderDebug();
        resumeReport(); // if the latest reply is still pending, re-read its current text
    } catch (err) {
        console.error('[Avereth] edit processing failed', err);
        toastr.error(`Avereth Engine: ${err.message}`);
    }
}

// ------------------------------------------------------------------------------------------ settings UI
/**
 * Runtime V4: does the character card hold the current narrator contract (its revision line)? A card with an older
 * contract plays with rules the engine no longer expects (live run 30.09.2026 22:41: a card from before 4.1.2).
 */
function contractState() {
    const card = ctx().characters?.[ctx().characterId];
    const text = String(card?.description || card?.data?.description || '');
    if (!text.includes('SANDBOX NARRATOR CONTRACT')) return 'not on the card';
    return text.includes(NARRATOR_CONTRACT_REVISION) ? 'current' : 'OUTDATED';
}

let contractWarned = null;
function renderDebug() {
    actionComposer?.refresh();
    const el = document.getElementById('avereth_status');
    if (!el || !content) return;
    const c = ctx();
    const { state, errors } = foldChat(c.chat);
    const contract = state.meta.started && state.meta.runtime === 'v4' ? contractState() : null;
    if (contract && contract !== 'current' && contractWarned !== hostChatKey(c)) {
        contractWarned = hostChatKey(c);
        toastr.warning(`Avereth Engine: the narrator contract on this character card is ${contract === 'OUTDATED' ? 'outdated' : 'missing'}. Replace the card description with content/narrator/Avereth_Narrator_Contract_v4.txt of this build (${NARRATOR_CONTRACT_REVISION}).`);
    }
    const problems = state.meta.started ? validateState(state, content) : [];
    const perf = state.meta.runtime === 'v4' ? perfSummary(c.chat) : null; // Patch 8.2: the last turn's times
    el.textContent = `Avereth Engine ${ENGINE_VERSION} | ` + (state.meta.started
        ? `runtime ${state.meta.runtime || 'v3'}${state.meta.runtime === 'v4' && llmPath ? ` (LLM: ${llmPath})` : ''} | turn ${state.turn} | mode ${state.mode} | events ${c.chat.reduce((a, m) => a + messageEvents(m).length, 0)} | integrity: ${problems.length || errors.length ? `${problems.length + errors.length} problem(s)` : 'OK'}${lastContext ? ` | last block ~${lastContext.tokens} tokens` : ''}${lastProjection ? ` | history: ${lastProjection.removed} older message(s) left out, ${lastProjection.stripped} tracker block(s) removed` : ''} | lore: ${loreFromWorldInfo() ? `World Info${cardLorebook() ? ` (${cardLorebook()})` : ''}` : 'engine'}${contract ? ` | narrator contract: ${contract}` : ''}${perf ? ` | last turn: ${perf}` : ''}`
        : 'no campaign in this chat');
    const dbg = document.getElementById('avereth_debug');
    if (dbg) dbg.value = settings().showDebug ? [lastContext?.text || '', ...problems, ...errors].join('\n') : '';
}

function exportLog() {
    const c = ctx();
    // build: the engine build that wrote the message's record (none: written before 3.1.0)
    const log = c.chat.map((m, i) => ({ i, user: !!m.is_user, build: m.extra?.avereth?.build, events: messageEvents(m) })).filter((x) => x.events.length);
    const blob = new Blob([JSON.stringify(log, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `avereth-events-${hostChatKey(c) || 'chat'}.json`;
    a.click();
}

function mountSettings() {
    const s = settings();
    const html = `
<div class="avereth-settings">
  <div class="inline-drawer">
    <div class="inline-drawer-toggle inline-drawer-header"><b>Avereth Engine</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
    <div class="inline-drawer-content">
      <label class="avereth-row"><input type="checkbox" id="avereth_enabled"> Engine active</label>
      <label class="avereth-row" title="V4: the engine interprets the player's message, the narrator writes prose only, the engine reads the reply afterwards (needs the V4 narrator contract and preset). V3: the narrator writes an <avereth> fact report. Applies to campaigns started from now on; a running campaign keeps its runtime.">Runtime for new campaigns <select id="avereth_runtime">
        <option value="v4">V4 (interpreter + extractor, prose only)</option>
        <option value="v3">V3 (fact report in the reply)</option>
      </select></label>
      <label class="avereth-row" title="V4-C, the product path (V4 campaigns): one planner call reads every free-text message, in fights too (skill aliases, free target references, skills on things, several actions); a validator checks it and the engine resolves it. Off: the historical V4-A path (regex in fights, interpreter in the story). Applies to campaigns started from now on; a running campaign keeps its path.">Semantic planner (V4-C) for new campaigns <input type="checkbox" id="avereth_planner"></label>
      <label class="avereth-row">Context budget (tokens) <input type="number" id="avereth_budget" min="400" max="6000" step="100"></label>
      <label class="avereth-row">Rules allowance (tokens) <input type="number" id="avereth_rules" min="0" max="3000" step="100"></label>
      <label class="avereth-row">Recent turns not re-retrieved <input type="number" id="avereth_recent" min="0" max="50" step="1"></label>
      <label class="avereth-row" title="player messages kept in the prompt with their replies, the current one included (4 = the current message and the 3 exchanges before it); older turns reach the narrator through the engine block. 0 = whole history. The saved chat is never changed.">History window (exchanges) <input type="number" id="avereth_history" min="0" max="100" step="1"></label>
      <label class="avereth-row" title="remove World_State / Character_Sheet / New_NPC / NPC_Update blocks from new replies (the engine HUD replaces them)"><input type="checkbox" id="avereth_strip"> Remove tracker blocks from new replies</label>
      <label class="avereth-row" title="a reply without a valid fact report gets a separate, short report-only request while you read it (same API and model); the next message waits for it"><input type="checkbox" id="avereth_recover"> Ask for a missing fact report separately</label>
      <label class="avereth-row">Injection depth <input type="number" id="avereth_depth" min="0" max="20" step="1"></label>
      <label class="avereth-row">World lore <select id="avereth_lore">
        <option value="auto">Auto: card lorebook if linked, else engine</option>
        <option value="worldinfo">Card lorebook (World Info)</option>
        <option value="engine">Engine</option>
      </select></label>
      <label class="avereth-row"><input type="checkbox" id="avereth_compact_output"> Compact extractor JSON (experiment)</label>
      <label class="avereth-row" title="V3 only: whole words the narrator overuses, replaced in its replies. Runtime V4 leaves narrator prose unchanged because it is also extractor evidence.">Word replacements (V3 only) <input type="text" id="avereth_swaps" placeholder="from=to"></label>
      <label class="avereth-row" title="Character and World panels under each reply, rendered from the engine state (never sent to the narrator)">HUD under replies <select id="avereth_hud">
        <option value="closed">Folded (summary line)</option>
        <option value="open">Open</option>
        <option value="off">Off</option>
      </select></label>
      <label class="avereth-row"><input type="checkbox" id="avereth_debug_toggle"> Show last engine block</label>
      <div class="avereth-status" id="avereth_status"></div>
      <textarea id="avereth_debug" readonly></textarea>
      <div class="avereth-row"><div class="menu_button" id="avereth_export">Export event log</div></div>
    </div>
  </div>
</div>`;
    document.getElementById('extensions_settings2')?.insertAdjacentHTML('beforeend', html);
    const bind = (id, key, conv) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!s[key]; else el.value = s[key];
        el.addEventListener('change', () => {
            settings()[key] = el.type === 'checkbox' ? el.checked : conv(el.value);
            ctx().saveSettingsDebounced();
            if (key === 'enabled' && !el.checked) { setPrompt(''); setLoreKeys([]); }
            renderDebug();
        });
    };
    bind('avereth_enabled', 'enabled');
    bind('avereth_runtime', 'runtime', String);
    bind('avereth_planner', 'planner');
    bind('avereth_budget', 'budget', Number);
    bind('avereth_rules', 'rulesBudget', Number);
    bind('avereth_recent', 'recentTurns', Number);
    bind('avereth_history', 'historyTurns', Number);
    bind('avereth_strip', 'stripTrackers');
    bind('avereth_recover', 'recoverReports');
    bind('avereth_depth', 'depth', Number);
    bind('avereth_lore', 'loreSource', String);
    bind('avereth_swaps', 'wordSwaps', String);
    bind('avereth_compact_output', 'compactOutput');
    bind('avereth_hud', 'hud', String);
    bind('avereth_debug_toggle', 'showDebug');
    document.getElementById('avereth_export')?.addEventListener('click', exportLog);
}

// ------------------------------------------------------------------------------------------ init
(async function init() {
    try {
        await loadContent();
    } catch (err) {
        console.error('[Avereth] content pack failed to load', err);
        toastr.error('Avereth Engine: content pack failed to load; engine disabled.');
        return;
    }
    const c = ctx();
    const ev = c.eventTypes || c.event_types;
    installDraftActions(document);
    if (ev.STREAM_TOKEN_RECEIVED) c.eventSource.on(ev.STREAM_TOKEN_RECEIVED, bindStreamReply);
    c.eventSource.on(ev.MESSAGE_RECEIVED, onMessageReceived);
    // ST 1.19 non-streaming hides Stop (GENERATION_ENDED) before MESSAGE_RECEIVED. Keep the
    // origin/epoch-bound context until that reply arrives; a new generation or cancellation invalidates it.
    c.eventSource.on(ev.GENERATION_STARTED, () => { narrationStart = null; });
    c.eventSource.on(ev.GENERATION_ENDED, () => { bindStreamReply(); narratorRecovery.finish(); });
    c.eventSource.on(ev.CHAT_COMPLETION_SETTINGS_READY, data => {
        narratorRequest = null;
        const a = ctx(), u = lastPlayerIndex(a.chat), user = a.chat[u], record = rec(user);
        // ST can retain an errored processor until the next native generation finishes.
        if (!data.stream && narrationStart?.epoch === generationRequest) streamOwners.delete(a.streamingProcessor);
        if (data.stream || a.groupId || !settings().enabled || !settings().recoverReports || !record?.events?.length
            || record.narrator_recovery || narrationStart?.chatId !== hostChatKey(a) || narrationStart?.user !== u
            || !(data.messages || []).some(m => String(m.content).includes('[AVERETH ENGINE'))) return;
        narratorRequest = { body: JSON.stringify(data), chat: a.chat, chatId: hostChatKey(a), epoch: generationRequest,
            u, user, input: user.mes, record, length: a.chat.length };
    });
    c.eventSource.on(ev.GENERATION_STOPPED, () => { bindStreamReply(); generationRequest++; actionComposer?.invalidate('Generierung gestoppt; keine neue Aktion gebucht'); worldJobs.invalidate(); narratorRecovery.invalidate(); narrationStart = null; });
    c.eventSource.on(ev.MESSAGE_EDITED, onMessageEdited);
    // state is always re-folded from the chat, so these events only refresh the status line; the interceptor sets
    // the engine block before every generation (normal, swipe, regenerate, continue)
    c.eventSource.on(ev.CHAT_CHANGED, () => {
        if (settings().enabled && content && campaignRuntime(ctx().chat) === 'v4') refreshRevisionDisplay(ctx().chat);
        actionStatus='Bereit'; // transient phase labels belong to the chat being left, not its successor
        generationRequest++;
        narrationStart = null;
        narratorRecovery.invalidate();
        worldJobs.invalidate();
        clearRevisionContext();
        renderDebug();
        resumeReport();
    });
    for (const t of [ev.MESSAGE_DELETED, ev.MESSAGE_SWIPED]) c.eventSource.on(t, async id => {
        generationRequest++;
        narrationStart = null;
        narratorRecovery.invalidate();
        worldJobs.invalidate();
        const now = ctx();
        if (settings().enabled && content && campaignRuntime(now.chat) === 'v4') {
            clearRevisionContext();
            if (t === ev.MESSAGE_SWIPED) {
                const rows = onSwipedV4(now.chat, Number(id));
                for (const row of rows) rerender(now, row);
                // A new empty swipe is still being generated. Only selection of an existing
                // recorded answer needs an immediate receipt in place of ST's deferred save.
                const selected = now.chat[Number(id)];
                if (selected && rec(selected)?.text_hash === hash32(selected.mes)) {
                    try { await saveAtOrigin(now); }
                    catch (err) {
                        console.error('[Avereth] revision save failed', err);
                        refreshActionStatus();
                        return;
                    }
                }
            } else refreshRevisionDisplay(now.chat);
        }
        renderDebug();
        resumeReport();
    });
    mountSettings();
    if(modernHost()) {
        nativeHost = await import('/script.js');
        ({default: NativeEventSourceStream} = await import('/scripts/sse-stream.js'));
        c.eventSource.on(ev.GENERATION_AFTER_COMMANDS,async(type,_params,dryRun)=>{
            if(dryRun || !settings().enabled || !hasCampaign(ctx().chat) || ctx().groupId
                || ![undefined,'normal','regenerate','swipe','continue'].includes(type))return;
            // ST awaits this event before changing messages/context or reserving the HUD input.
            // Slash commands which cancel Generate never get here and retain their deferred save.
            // Drain only an existing save; do not add a write or mistake ST's swallowed errors for success.
            // The upcoming native save persists the new input together with any pending edits.
            nativeHost.cancelDebouncedChatSave();
            while(nativeHost.isChatSaving)await new Promise(resolve=>setTimeout(resolve,25));
            nativeHost.cancelDebouncedChatSave();
        });
        actionComposer=installActionComposer({context:ctx,state:()=>foldChat(ctx().chat).state,content:()=>content,
            enabled:()=>settings().enabled && hasCampaign(ctx().chat) && campaignRuntime(ctx().chat)==='v4' && campaignPath(ctx().chat)==='c' && !campaignSupport(ctx().chat),settings,
            blocked:actionBlocked,save:saveAtOrigin,retry:resumeActionCompletion,status:()=>actionView()});
        c.eventSource.on(ev.CHAT_CHANGED,()=>actionComposer?.resume());
        actionComposer?.resume();
    }
    if (settings().enabled && content && campaignRuntime(c.chat) === 'v4') refreshRevisionDisplay(c.chat);
    renderDebug();
    resumeReport(); // also recover a pending reply after a full browser reload
})();
