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
import { onEdited, foldChat, ensureCampaign, hasCampaign, projectPromptHistory, reportRequest, applyReportAnswer } from './src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, pendingExtraction, campaignRuntime, onEditedV4 } from './src/v4/runtime.js';
import { validateState } from './src/validate.js';
import { newSeed } from './src/rng.js';
import { parseSwaps, ENGINE_VERSION } from './src/util.js';

const MODULE = 'avereth';
const PROMPT_KEY = 'avereth_engine';
const LORE_KEY = 'avereth_lore_keys';
const DEFAULTS = { enabled: true, budget: 1400, rulesBudget: 800, recentTurns: 4, depth: 0, showDebug: false, loreSource: 'auto', wordSwaps: '', hud: 'closed', historyTurns: 4, stripTrackers: true, recoverReports: true, runtime: 'v4' };
const REPORT_WAIT_MS = 60000; // the next turn waits this long at most for a report still being asked for
const LLM_TIMEOUT_MS = 120000;

let content = null;
let lastContext = null;
let lastProjection = null;
let legacyWarned = null;
let pendingReport = null; // {chatId, id, hash, job}: the report request of the latest reply, while it runs
let pendingWorld = null; // Runtime V4: {chatId, id, job}: the extraction of the latest reply, while it runs
let llmPath = null; // Runtime V4: which call the last LLM request used ('custom endpoint' | 'generateRaw')

function ctx() {
    return SillyTavern.getContext();
}

function settings() {
    const { extensionSettings } = ctx();
    extensionSettings[MODULE] = { ...DEFAULTS, ...(extensionSettings[MODULE] || {}) };
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
function newRuntime() {
    return settings().runtime === 'v3' ? 'v3' : 'v4';
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
}

// ------------------------------------------------------------------------------------------ Runtime V4 LLM calls
/**
 * One structured LLM call of Runtime V4 (interpreter, extractor, Board generator): plain JSON per instruction, low
 * temperature (P0/S0, S1, S2). With the Chat Completion source "Custom (OpenAI-compatible)" the request goes to
 * SillyTavern's own endpoint exactly as the P0 tools sent it (tools/p0/lib/provider.mjs, verified against ST 1.19):
 * SillyTavern adds the API key, the extension never sees it. Any other source uses generateRaw (temperature as the
 * active preset sets it).
 */
async function v4Llm({ messages, temperature = 0.1, maxTokens = 2500 }) {
    const c = ctx();
    const oai = c.chatCompletionSettings;
    if (c.mainApi === 'openai' && oai?.chat_completion_source === 'custom' && typeof c.getRequestHeaders === 'function') {
        llmPath = 'custom endpoint';
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), LLM_TIMEOUT_MS);
        try {
            const body = {
                chat_completion_source: 'custom', custom_url: oai.custom_url, model: oai.custom_model, messages, max_tokens: maxTokens, temperature, stream: false,
                custom_include_body: String(oai.custom_include_body || ''), custom_exclude_body: String(oai.custom_exclude_body || ''),
                custom_include_headers: String(oai.custom_include_headers || ''), custom_prompt_post_processing: oai.custom_prompt_post_processing || '',
            };
            const res = await fetch('/api/backends/chat-completions/generate', { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify(body), signal: ctl.signal });
            const json = await res.json().catch(() => null);
            if (!res.ok || !json || json.error || !json.choices) throw new Error(`the LLM call failed (HTTP ${res.status}${json?.error?.message ? `: ${String(json.error.message).slice(0, 120)}` : ''})`);
            const m = json.choices[0]?.message || {};
            return typeof m.content === 'string' ? m.content : Array.isArray(m.content) ? m.content.map((x) => x?.text || '').join('') : '';
        } finally {
            clearTimeout(timer);
        }
    }
    llmPath = 'generateRaw';
    if (typeof c.generateRaw !== 'function') throw new Error('SillyTavern offers no generateRaw');
    // generateRaw takes one prompt: a repair's earlier answer and error list follow the request as text
    const [system, ...rest] = messages;
    const prompt = rest.map((m) => (m.role === 'assistant' ? `YOUR PREVIOUS ANSWER:\n${m.content}` : m.content)).join('\n\n');
    return c.generateRaw({ systemPrompt: system?.content || '', prompt, responseLength: maxTokens });
}

/** Runtime V4: read the latest reply's world in the background (extractor, firewall, world). World content such as a Guild board is generated only when the player actually asks to perceive it. */
function startWorld(id) {
    const c = ctx();
    const chatId = c.getCurrentChatId();
    if (pendingWorld?.chatId === chatId && pendingWorld.id === id && pendingWorld.hash === c.chat[id]?.extra?.avereth?.text_hash) return;
    const hash = c.chat[id]?.extra?.avereth?.text_hash;
    const job = (async () => {
        const now = () => ctx();
        const res = await runExtraction(now().chat, id, content, v4Llm, { hud: settings().hud });
        if (now().getCurrentChatId() !== chatId) return;
        if (res.changed) { rerender(now(), id); await now().saveChat(); renderDebug(); }
    })().catch((err) => console.error('[Avereth] world extraction failed', err));
    pendingWorld = { chatId, id, hash, job };
    job.finally(() => { if (pendingWorld?.job === job) pendingWorld = null; });
}

// ------------------------------------------------------------------------------------------ interceptor
globalThis.averethInterceptor = async function (chat, contextSize, abort, type) {
    const s = settings();
    if (!s.enabled || !content) {
        if (content) { setPrompt(''); setLoreKeys([]); }
        return;
    }
    const c = ctx();
    try {
        if (!hasCampaign(c.chat)) {
            const created = ensureCampaign(c.chat, content, { seed: newSeed(), runtime: newRuntime() });
            if (created === 'legacy') {
                if (legacyWarned !== c.getCurrentChatId()) toastr.warning('Avereth Engine: this chat was played without the engine. Start a new chat to use it.');
                legacyWarned = c.getCurrentChatId();
                setPrompt('');
                return;
            }
        }
        // the report still being asked for belongs to the turn before this new message: its facts come first
        if (pendingReport && pendingReport.chatId === c.getCurrentChatId() && (!type || type === 'normal') && c.chat.findLastIndex((m) => m.is_user) > pendingReport.id) {
            await Promise.race([pendingReport.job, new Promise((done) => setTimeout(done, REPORT_WAIT_MS))]);
        }
        // Runtime V4 barrier: never overlap a new normal turn with the previous reply's extractor/repair.
        // The LLM call itself has a finite timeout; letting a second call overtake it can exceed provider concurrency.
        if (pendingWorld && pendingWorld.chatId === c.getCurrentChatId() && (!type || type === 'normal') && c.chat.findLastIndex((m) => m.is_user) > pendingWorld.id) {
            await pendingWorld.job;
        }
        const r = await prepareGenerationAsync(c.chat, content, { type, settings: engineSettings(), llm: v4Llm });
        setLoreKeys(r.loreKeys);
        if (r.action === 'clear' || r.action === 'none') {
            // 'clear': quiet/impersonate generations get no engine block; 'none': no campaign or no player message yet
            setPrompt('');
            if (r.dirty) await c.saveChat();
            return;
        }
        if (r.action === 'abort') {
            abort(true);
            setPrompt('');
            if (r.notice) toastr.error(r.notice);
            if (r.dirty) await c.saveChat();
            return;
        }
        if (r.action === 'panels') {
            abort(true);
            setPrompt('');
            // the command line is UI, not story: hide it from future prompts (like /hide) and answer as a System panel
            c.chat[r.index].is_system = true;
            document.querySelector(`#chat .mes[mesid="${r.index}"]`)?.setAttribute('is_system', 'true');
            postPanel(r.panels.join('\n\n'));
            await c.saveChat();
            return;
        }
        lastContext = r.context;
        setPrompt(r.context.text);
        // prompt-only: retired tracker blocks out of the history, and only the last exchanges (the saved chat is untouched)
        lastProjection = projectPromptHistory(chat, { keepTurns: Number(s.historyTurns) || 0 });
        if (r.errors?.length) console.warn('[Avereth] fold errors', r.errors);
        if (r.dirty) await c.saveChat();
        renderDebug();
    } catch (err) {
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

async function onMessageReceived(messageId) {
    if (!settings().enabled || !content) return;
    const c = ctx();
    try {
        const recover = settings().recoverReports && typeof c.generateRaw === 'function';
        // the greeting of a new chat arrives here too (SillyTavern: MESSAGE_RECEIVED 'first_message') and starts the campaign
        const r = processReplyAny(c.chat, Number(messageId), content, { seed: newSeed(), swaps: parseSwaps(settings().wordSwaps), hud: settings().hud, stripTrackers: settings().stripTrackers, recover, runtime: newRuntime() });
        if (!r.changed) return;
        rerender(c, Number(messageId));
        await c.saveChat();
        if (r.result?.rejected?.length) console.info('[Avereth] rejected report items', r.result.rejected);
        renderDebug();
        if (r.recover) requestReport(Number(messageId));
        if (r.extract) startWorld(Number(messageId));
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
    const chatId = c.getCurrentChatId();
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
        if (now.getCurrentChatId() !== chatId) return;
        const res = applyReportAnswer(now.chat, id, content, answer, { hash: req.hash, ms: Date.now() - started, hud: settings().hud, stripTrackers: settings().stripTrackers });
        if (!res.changed) return;
        rerender(now, id);
        await now.saveChat();
        renderDebug();
    })().catch((err) => console.error('[Avereth] report request failed', err));
    pendingReport = { chatId, id, hash: req.hash, job };
    job.finally(() => { if (pendingReport?.job === job) pendingReport = null; });
}

/** A report request (V3) or a world extraction (V4) cut off by a reload or a chat switch: the latest reply asks again. */
function resumeReport() {
    const c = ctx();
    if (!settings().enabled || !content || !c.chat?.length) return;
    if (campaignRuntime(c.chat) === 'v4') {
        const id = pendingExtraction(c.chat);
        if (id >= 0) startWorld(id);
        return;
    }
    if (!settings().recoverReports) return;
    const id = c.chat.findLastIndex((m) => !m.is_user && !m.is_system);
    if (id >= 0 && c.chat[id].extra?.avereth?.recovery === 'pending') requestReport(id);
}

async function onMessageEdited(messageId) {
    if (!settings().enabled) return;
    const c = ctx();
    try {
        const r = campaignRuntime(c.chat) === 'v4' ? onEditedV4(c.chat, Number(messageId)) : onEdited(c.chat, Number(messageId), content);
        if (!r.changed) return;
        // SillyTavern redraws the edited message from mes right after this event: draw ours (System block) after that
        if (r.text) setTimeout(() => rerender(c, Number(messageId)), 0);
        if (r.refused) toastr.warning(`Avereth Engine: ${r.refused}`);
        await c.saveChat();
        renderDebug();
    } catch (err) {
        console.error('[Avereth] edit processing failed', err);
        toastr.error(`Avereth Engine: ${err.message}`);
    }
}

// ------------------------------------------------------------------------------------------ settings UI
function renderDebug() {
    const el = document.getElementById('avereth_status');
    if (!el || !content) return;
    const c = ctx();
    const { state, errors } = foldChat(c.chat);
    const problems = state.meta.started ? validateState(state, content) : [];
    el.textContent = `Avereth Engine ${ENGINE_VERSION} | ` + (state.meta.started
        ? `runtime ${state.meta.runtime || 'v3'}${state.meta.runtime === 'v4' && llmPath ? ` (LLM: ${llmPath})` : ''} | turn ${state.turn} | mode ${state.mode} | events ${c.chat.reduce((a, m) => a + (m.extra?.avereth?.events?.length || 0), 0)} | integrity: ${problems.length || errors.length ? `${problems.length + errors.length} problem(s)` : 'OK'}${lastContext ? ` | last block ~${lastContext.tokens} tokens` : ''}${lastProjection ? ` | history: ${lastProjection.removed} older message(s) left out, ${lastProjection.stripped} tracker block(s) removed` : ''} | lore: ${loreFromWorldInfo() ? `World Info${cardLorebook() ? ` (${cardLorebook()})` : ''}` : 'engine'}`
        : 'no campaign in this chat');
    const dbg = document.getElementById('avereth_debug');
    if (dbg) dbg.value = settings().showDebug ? [lastContext?.text || '', ...problems, ...errors].join('\n') : '';
}

function exportLog() {
    const c = ctx();
    // build: the engine build that wrote the message's record (none: written before 3.1.0)
    const log = c.chat.map((m, i) => ({ i, user: !!m.is_user, build: m.extra?.avereth?.build, events: m.extra?.avereth?.events || [] })).filter((x) => x.events.length);
    const blob = new Blob([JSON.stringify(log, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `avereth-events-${c.getCurrentChatId() || 'chat'}.json`;
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
    bind('avereth_budget', 'budget', Number);
    bind('avereth_rules', 'rulesBudget', Number);
    bind('avereth_recent', 'recentTurns', Number);
    bind('avereth_history', 'historyTurns', Number);
    bind('avereth_strip', 'stripTrackers');
    bind('avereth_recover', 'recoverReports');
    bind('avereth_depth', 'depth', Number);
    bind('avereth_lore', 'loreSource', String);
    bind('avereth_swaps', 'wordSwaps', String);
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
    c.eventSource.on(ev.MESSAGE_RECEIVED, onMessageReceived);
    c.eventSource.on(ev.MESSAGE_EDITED, onMessageEdited);
    // state is always re-folded from the chat, so these events only refresh the status line; the interceptor sets
    // the engine block before every generation (normal, swipe, regenerate, continue)
    c.eventSource.on(ev.CHAT_CHANGED, () => { lastContext = null; lastProjection = null; setPrompt(''); setLoreKeys([]); renderDebug(); resumeReport(); });
    for (const t of [ev.MESSAGE_DELETED, ev.MESSAGE_SWIPED]) c.eventSource.on(t, () => renderDebug());
    mountSettings();
    renderDebug();
})();