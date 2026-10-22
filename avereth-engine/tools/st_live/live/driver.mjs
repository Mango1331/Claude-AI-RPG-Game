// The browser side of a run (docs/LIVE_RUNNER.md §5): Playwright in a fresh browser context against the isolated
// instance. It does what a player does in SillyTavern's page and nothing else: connect, open the card, type a message
// and send it, wait, look at the chat (the HUD under the newest reply unfolded, as a player clicks it open) and at the
// notices. It never swipes, regenerates, edits or deletes a message, and never touches the engine's state.
//
// Two views come out of it, kept apart: view() is what the player sees (visible text of the chat and the notices) and
// the only thing a player gets; chat() is SillyTavern's chat array with the engine's records, for the evaluation only.
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { sleep } from './lib.mjs';

/** Playwright (or playwright-core), local or global; null when none is installed. */
export function loadPlaywright() {
    const require = createRequire(import.meta.url);
    const names = ['playwright', 'playwright-core'];
    for (const n of names) { try { return require(n); } catch { /* next */ } }
    let root = null;
    try { root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { /* no npm */ }
    if (root) for (const n of names) { try { return require(path.join(root, n)); } catch { /* next */ } }
    return null;
}

/** A Chromium browser: Playwright's own, else the installed Edge or Chrome (Windows: Edge is always there). */
export async function launchBrowser(pw, { browser = 'auto', headless = true } = {}) {
    const order = browser === 'auto' ? [null, 'msedge', 'chrome'] : [browser === 'chromium' ? null : browser];
    const errs = [];
    for (const channel of order) {
        try {
            // the runner handles Ctrl+C itself (run_live.mjs): Playwright must not close the browser and exit on its own
            const b = await pw.chromium.launch({ headless, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false, ...(channel ? { channel } : {}) });
            return { browser: b, name: channel || 'chromium', version: b.version() };
        } catch (e) { errs.push(`${channel || 'chromium'}: ${String(e.message || e).split('\n')[0]}`); }
    }
    throw new Error(`no browser could be started (${errs.join('; ')})`);
}

// the notices SillyTavern shows (toastr), collected in the page from its start
const TOAST_SCRIPT = `(() => {
    window.__liveToasts = [];
    const seen = new WeakSet();
    const take = (n) => {
        if (!n || n.nodeType !== 1 || seen.has(n)) return;
        if (n.classList && n.classList.contains('toast')) {
            seen.add(n);
            const kind = ['error', 'warning', 'success', 'info'].find((k) => n.classList.contains('toast-' + k)) || 'info';
            window.__liveToasts.push({ at: Date.now(), kind, text: (n.textContent || '').trim().slice(0, 1000) });
        }
        if (n.querySelectorAll) n.querySelectorAll('.toast').forEach(take);
    };
    new MutationObserver((ms) => { for (const m of ms) m.addedNodes.forEach(take); }).observe(document, { childList: true, subtree: true });
})();`;

export class Driver {
    constructor(page, { turnTimeoutMs = 15 * 60 * 1000, quietMs = 1500, log = () => {} } = {}) {
        this.page = page;
        this.turnTimeoutMs = turnTimeoutMs;
        this.quietMs = quietMs;
        this.log = log;
        this.pageErrors = [];
        this.toastsSeen = 0;
        this.setupNotes = [];
        page.on('pageerror', (e) => this.pageErrors.push({ at: Date.now(), text: `${e.message} ${String(e.stack || '').split('\n').slice(1, 3).join(' ')}`.slice(0, 600) }));
        page.on('console', (m) => {
            if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) this.pageErrors.push({ at: Date.now(), text: `${m.text()} @ ${m.location()?.url?.split('/').pop()}:${m.location()?.lineNumber}`.slice(0, 600) });
        });
    }

    static async create(browser, opts) {
        const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
        await context.addInitScript(TOAST_SCRIPT);
        const page = await context.newPage();
        return new Driver(page, opts);
    }

    /** Open SillyTavern, close what its start shows, connect to the Chat Completion source. */
    async open(url) {
        const p = this.page;
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
        await p.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 180000 });
        await p.waitForTimeout(1500);
        // SillyTavern's own loading dialog goes away by itself
        await p.waitForFunction(() => ![...document.querySelectorAll('dialog[open]')].some((d) => /^\s*Initializing/.test(d.innerText || '')), null, { timeout: 60000 }).catch(() => {});
        const closed = await this.closeDialogs();
        if (closed.length) this.setupNotes.push(`start dialogs closed: ${closed.join(' | ')}`);
        await p.waitForFunction(() => !!document.getElementById('avereth_status'), null, { timeout: 60000 }).catch(() => this.setupNotes.push('the engine\'s settings panel did not appear'));
        const conn = await p.evaluate(() => {
            const c = SillyTavern.getContext();
            const o = c.chatCompletionSettings || {};
            return { mainApi: c.mainApi, source: o.chat_completion_source, url: o.custom_url || null, model: o.custom_model || null, stream: !!o.stream_openai, preset: o.preset_settings_openai || null };
        });
        await p.evaluate(() => { $('#api_button_openai').trigger('click'); });
        const ok = await p.waitForFunction(() => { const s = SillyTavern.getContext().onlineStatus; return s && s !== 'no_connection'; }, null, { timeout: 90000 }).then(() => true).catch(() => false);
        const status = await p.evaluate(() => SillyTavern.getContext().onlineStatus);
        return { ...conn, connected: ok, status };
    }

    /** Click OK/Cancel away on every open dialog; returns their texts. */
    async closeDialogs() {
        return this.page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => {
            const text = (d.innerText || '').trim().slice(0, 200);
            (d.querySelector('.popup-button-ok') || d.querySelector('.popup-button-cancel') || d.querySelector('.popup-button-close'))?.click();
            return text;
        }));
    }

    async openDialogs() {
        return this.page.evaluate(() => [...document.querySelectorAll('dialog[open]')].map((d) => (d.innerText || '').trim().slice(0, 400)));
    }

    /** Open the card's chat (a new one: the instance has no chats) and wait for the engine's campaign at the greeting. */
    async openCard(name, { chatName = null } = {}) {
        const p = this.page;
        const chid = await p.evaluate((n) => SillyTavern.getContext().characters.findIndex((c) => c.name === n), name);
        if (chid < 0) throw new Error(`the card "${name}" is not in the instance`);
        await p.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
        await p.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 60000 });
        const started = await p.waitForFunction(() => (SillyTavern.getContext().chat[0]?.extra?.avereth?.events || []).some((e) => e.t === 'campaign.started'), null, { timeout: 60000 }).then(() => true).catch(() => false);
        let chatId = await p.evaluate(() => SillyTavern.getContext().getCurrentChatId());
        if (chatName && started) {
            const renamed = await p.evaluate(async ({ from, to }) => {
                const c = SillyTavern.getContext();
                if (typeof c.renameChat !== 'function') return null;
                try { await c.renameChat(from, to); return c.getCurrentChatId(); } catch (e) { return `error: ${e?.message || e}`; }
            }, { from: chatId, to: chatName });
            if (renamed && !String(renamed).startsWith('error')) chatId = renamed;
            else this.setupNotes.push(`the chat could not be renamed (${renamed ?? 'no renameChat'}); it keeps "${chatId}"`);
        }
        await p.waitForTimeout(800);
        return { started, chatId };
    }

    /** One look at the page's state (no game state: busy, the length of the chat, the newest reply's reading status). */
    async probe() {
        return this.page.evaluate(() => {
            const c = SillyTavern.getContext();
            const stop = document.querySelector('#mes_stop');
            const busy = !!stop && getComputedStyle(stop).display !== 'none';
            const i = c.chat.findLastIndex((m) => !m.is_user && !m.is_system);
            return { busy, len: c.chat.length, lastUser: c.chat.findLastIndex((m) => m.is_user), extraction: c.chat[i]?.extra?.avereth?.extraction?.status || null, dialogs: document.querySelectorAll('dialog[open]').length };
        });
    }

    /**
     * Send one player message and wait until the turn is over: the generation ended, the newest reply has been read by
     * the extractor, and the page stayed quiet for a moment. Returns timing and what went wrong (nothing is retried).
     */
    async send(text) {
        const p = this.page;
        const t0 = Date.now();
        const before = await this.probe();
        if (before.busy) return { ok: false, problem: 'busy before sending', ms: 0 };
        await p.evaluate((t) => { $('#send_textarea').val(t).trigger('input'); $('#send_but').trigger('click'); }, text);
        const arrived = await p.waitForFunction((n) => SillyTavern.getContext().chat.length > n, before.len, { timeout: 30000 }).then(() => true).catch(() => false);
        if (!arrived) return { ok: false, problem: 'the message did not arrive in the chat', ms: Date.now() - t0 };
        let quietSince = null;
        let last = null;
        let replyAt = null;
        while (Date.now() - t0 < this.turnTimeoutMs) {
            if (this.aborted) return { ok: false, problem: 'interrupted', ms: Date.now() - t0 };
            last = await this.probe();
            if (last.dialogs) return { ok: false, problem: 'a dialog opened', dialogs: await this.openDialogs(), ms: Date.now() - t0 };
            const answered = last.len > last.lastUser + 1;
            if (answered && !replyAt) replyAt = Date.now();
            const done = !last.busy && last.extraction !== 'pending';
            if (done) quietSince = quietSince ?? Date.now(); else quietSince = null;
            if (done && answered && Date.now() - quietSince >= this.quietMs) break;
            if (done && !answered && Date.now() - quietSince >= 20000) return { ok: false, problem: 'no reply after the message', ms: Date.now() - t0 };
            await sleep(250);
        }
        const ms = Date.now() - t0;
        if (ms >= this.turnTimeoutMs) return { ok: false, problem: `the turn did not end within ${Math.round(this.turnTimeoutMs / 1000)} s (busy ${last?.busy}, extraction ${last?.extraction})`, ms };
        await p.waitForTimeout(600); // the HUD re-renders after the extraction
        return { ok: true, ms, replyMs: replyAt ? replyAt - t0 : null };
    }

    /**
     * What the player sees: the chat from `back` player messages ago to the newest message, as the page renders it
     * (the HUD under the newest reply unfolded, older ones folded as they are), and the notices since the last look.
     */
    async view({ back = 2 } = {}) {
        const messages = await this.page.evaluate((k) => {
            const els = [...document.querySelectorAll('#chat .mes')];
            const newest = [...els].reverse().find((el) => el.getAttribute('is_user') !== 'true');
            for (const el of els) for (const d of el.querySelectorAll('.mes_text details')) d.open = el === newest;
            const users = els.map((el, i) => (el.getAttribute('is_user') === 'true' ? i : -1)).filter((i) => i >= 0);
            const from = users.length > k ? users[users.length - 1 - k] : 0;
            return els.slice(from).map((el) => ({
                mesid: Number(el.getAttribute('mesid')), user: el.getAttribute('is_user') === 'true', system: el.getAttribute('is_system') === 'true',
                name: (el.querySelector('.name_text')?.innerText || '').trim(), text: (el.querySelector('.mes_text')?.innerText || '').trim(),
            }));
        }, back);
        const all = await this.page.evaluate(() => window.__liveToasts || []);
        const toasts = all.slice(this.toastsSeen);
        this.toastsSeen = all.length;
        return { messages, toasts };
    }

    async toasts() { return this.page.evaluate(() => window.__liveToasts || []); }

    /** SillyTavern's chat with the engine's records: for the evaluation, never for the player. */
    async chat() { return this.page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().chat))); }

    async status() { return this.page.evaluate(() => document.getElementById('avereth_status')?.textContent || ''); }

    async save() { await this.page.evaluate(async () => { await SillyTavern.getContext().saveChat(); }); await this.page.waitForTimeout(800); }

    async screenshot(file) { try { await this.page.screenshot({ path: file, fullPage: false }); return file; } catch { return null; } }
}
