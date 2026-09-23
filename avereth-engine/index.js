// SillyTavern binding for the Avereth Engine. All game logic lives in src/ (pure ES modules, tested in Node);
// this file only wires SillyTavern events to src/host.js:
//   * generate interceptor  -> resolve the player's message, inject the engine block (setExtensionPrompt)
//   * MESSAGE_RECEIVED      -> validate the narrator's fact report, strip it from the visible text
//   * '#' commands          -> answered by the engine as a hidden System panel, no LLM call
import { loadContentPack } from './src/content.js';
import { prepareGeneration, processReply, onEdited, foldChat, ensureCampaign, hasCampaign } from './src/host.js';
import { validateState } from './src/validate.js';
import { newSeed } from './src/rng.js';

const MODULE = 'avereth';
const PROMPT_KEY = 'avereth_engine';
const DEFAULTS = { enabled: true, budget: 1400, rulesBudget: 800, recentTurns: 4, depth: 0, showDebug: false };

let content = null;
let lastContext = null;
let legacyWarned = null;

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

function postPanel(text) {
    const c = ctx();
    const message = {
        name: 'Avereth System', is_user: false, is_system: true, send_date: new Date().toLocaleString(),
        mes: '```\n' + text + '\n```', extra: { type: 'comment', isSmallSys: false, avereth_panel: true },
    };
    c.chat.push(message);
    c.addOneMessage(message);
}

// ------------------------------------------------------------------------------------------ interceptor
globalThis.averethInterceptor = async function (chat, contextSize, abort, type) {
    const s = settings();
    if (!s.enabled || !content) {
        if (content) setPrompt('');
        return;
    }
    const c = ctx();
    try {
        if (!hasCampaign(c.chat)) {
            const created = ensureCampaign(c.chat, content, { seed: newSeed() });
            if (created === 'legacy') {
                if (legacyWarned !== c.getCurrentChatId()) toastr.warning('Avereth Engine: this chat was played without the engine. Start a new chat to use it.');
                legacyWarned = c.getCurrentChatId();
                setPrompt('');
                return;
            }
        }
        const r = prepareGeneration(c.chat, content, { type, settings: s });
        if (r.action === 'clear' || r.action === 'none') {
            // 'clear': quiet/impersonate generations get no engine block; 'none': no campaign or no player message yet
            setPrompt('');
            if (r.dirty) await c.saveChat();
            return;
        }
        if (r.action === 'abort') {
            abort(true);
            setPrompt('');
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
async function onMessageReceived(messageId) {
    if (!settings().enabled || !content) return;
    const c = ctx();
    try {
        const r = processReply(c.chat, Number(messageId), content, { seed: newSeed() });
        if (!r.changed) return;
        c.updateMessageBlock(Number(messageId), c.chat[messageId]);
        await c.saveChat();
        if (r.result?.rejected?.length) console.info('[Avereth] rejected report items', r.result.rejected);
        renderDebug();
    } catch (err) {
        console.error('[Avereth] reply processing failed', err);
        toastr.error(`Avereth Engine: ${err.message}`);
    }
}

async function onMessageEdited(messageId) {
    if (!settings().enabled) return;
    const c = ctx();
    if (onEdited(c.chat, Number(messageId))) await c.saveChat();
}

// ------------------------------------------------------------------------------------------ settings UI
function renderDebug() {
    const el = document.getElementById('avereth_status');
    if (!el || !content) return;
    const c = ctx();
    const { state, errors } = foldChat(c.chat);
    const problems = state.meta.started ? validateState(state, content) : [];
    el.textContent = state.meta.started
        ? `turn ${state.turn} | mode ${state.mode} | events ${c.chat.reduce((a, m) => a + (m.extra?.avereth?.events?.length || 0), 0)} | integrity: ${problems.length || errors.length ? `${problems.length + errors.length} problem(s)` : 'OK'}${lastContext ? ` | last block ~${lastContext.tokens} tokens` : ''}`
        : 'no campaign in this chat';
    const dbg = document.getElementById('avereth_debug');
    if (dbg) dbg.value = settings().showDebug ? [lastContext?.text || '', ...problems, ...errors].join('\n') : '';
}

function exportLog() {
    const c = ctx();
    const log = c.chat.map((m, i) => ({ i, user: !!m.is_user, events: m.extra?.avereth?.events || [] })).filter((x) => x.events.length);
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
      <label class="avereth-row">Context budget (tokens) <input type="number" id="avereth_budget" min="400" max="6000" step="100"></label>
      <label class="avereth-row">Rules allowance (tokens) <input type="number" id="avereth_rules" min="0" max="3000" step="100"></label>
      <label class="avereth-row">Recent turns not re-retrieved <input type="number" id="avereth_recent" min="0" max="50" step="1"></label>
      <label class="avereth-row">Injection depth <input type="number" id="avereth_depth" min="0" max="20" step="1"></label>
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
            if (key === 'enabled' && !el.checked) setPrompt('');
            renderDebug();
        });
    };
    bind('avereth_enabled', 'enabled');
    bind('avereth_budget', 'budget', Number);
    bind('avereth_rules', 'rulesBudget', Number);
    bind('avereth_recent', 'recentTurns', Number);
    bind('avereth_depth', 'depth', Number);
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
    c.eventSource.on(ev.CHAT_CHANGED, () => { lastContext = null; setPrompt(''); renderDebug(); });
    for (const t of [ev.MESSAGE_DELETED, ev.MESSAGE_SWIPED]) c.eventSource.on(t, () => renderDebug());
    mountSettings();
    renderDebug();
})();
