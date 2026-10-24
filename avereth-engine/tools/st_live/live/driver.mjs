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

/** A Chromium browser: the installed Chrome, else Playwright's own Chromium, else Edge (auto); or the one named. */
export async function launchBrowser(pw, { browser = 'auto', headless = true } = {}) {
    const order = browser === 'auto' ? ['chrome', null, 'msedge'] : [browser === 'chromium' ? null : browser];
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

/**
 * Patch 8.4.2 (live 22.10.2026 07:49: after "#assign" the player was shown the HUD of the reply before, as the newest,
 * and took the booked points for not booked): is the HUD on screen older than a reply below it (a System answer)?
 */
export function hudStale(messages, hudMesid) {
    return hudMesid != null && messages.some((m) => !m.user && m.mesid > hudMesid);
}

/** A notice's origin (Patch 8.4.1): "runner" inside a span of the runner's own action (its tail included), else "game". */
export function toastOrigin(t, spans, now = Date.now()) {
    return spans.some((s) => t.at >= s.from && t.at <= (s.to ?? now)) ? 'runner' : 'game';
}

export class Driver {
    constructor(page, { turnTimeoutMs = 15 * 60 * 1000, quietMs = 1500, connectTimeoutMs = 20000, log = () => {} } = {}) {
        this.page = page;
        this.turnTimeoutMs = turnTimeoutMs;
        this.quietMs = quietMs;
        this.connectTimeoutMs = connectTimeoutMs;
        this.log = log;
        this.pageErrors = [];
        this.toastsSeen = 0;
        this.setupNotes = [];
        // Patch 8.4.1 (live 22.10.2026 05:43: the notice of the runner's own chat rename reached the player, who took it
        // for an oddity of the game): the time spans of the runner's own actions in the page; a notice that comes in one
        // of them is the runner's, never shown to the player (kept for the report)
        this.runnerSpans = [];
        page.on('pageerror', (e) => this.pageErrors.push({ at: Date.now(), text: `${e.message} ${String(e.stack || '').split('\n').slice(1, 3).join(' ')}`.slice(0, 600) }));
        page.on('console', (m) => {
            if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) this.pageErrors.push({ at: Date.now(), text: `${m.text()} @ ${m.location()?.url?.split('/').pop()}:${m.location()?.lineNumber}`.slice(0, 600) });
        });
    }

    static async create(browser, opts) {
        // Patch 8.4.1 (live 22.10.2026 05:43: a German Chrome gave SillyTavern a German UI in an English game): English
        const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, locale: 'en-US' });
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
        const closed = (await this.closeDialogs()).filter(Boolean); // an empty one is SillyTavern's own loader
        if (closed.length) this.setupNotes.push(`start dialogs closed: ${closed.join(' | ')}`);
        await p.waitForFunction(() => !!document.getElementById('avereth_status'), null, { timeout: 60000 }).catch(() => this.setupNotes.push('the engine\'s settings panel did not appear'));
        const conn = await p.evaluate(() => {
            const c = SillyTavern.getContext();
            const o = c.chatCompletionSettings || {};
            return { mainApi: c.mainApi, source: o.chat_completion_source, url: o.custom_url || null, model: o.custom_model || null, stream: !!o.stream_openai, preset: o.preset_settings_openai || null };
        });
        return { ...conn, ...await this.connect(90000) };
    }

    /** Reuse ST's normal connector after a reload; credentials remain in the isolated profile. */
    async connect(timeoutMs = this.connectTimeoutMs) {
        const p = this.page;
        const connected = () => p.evaluate(() => { const s = SillyTavern.getContext().onlineStatus; return !!s && s !== 'no_connection'; });
        if (await connected()) return { connected: true, status: await p.evaluate(() => SillyTavern.getContext().onlineStatus) };
        await p.evaluate(() => { $('#api_button_openai').trigger('click'); });
        let ok = false;
        for (const t0 = Date.now(); Date.now() - t0 < timeoutMs;) {
            if (await connected()) { ok = true; break; }
            await this.acceptProxyWarning();
            await sleep(500);
        }
        const status = await p.evaluate(() => SillyTavern.getContext().onlineStatus);
        return { connected: ok, status };
    }

    /**
     * SillyTavern asks once per reverse proxy URL before it connects to it ("Connecting To Proxy"); a fresh browser has
     * no answer stored. The URL is the one the profile uses (import_profile.mjs), so it is confirmed as the player did.
     */
    async acceptProxyWarning() {
        const text = await this.page.evaluate(() => {
            const d = [...document.querySelectorAll('dialog[open]')].find((x) => /proxy/i.test(x.innerText || ''));
            if (!d) return null;
            d.querySelector('.popup-button-ok')?.click();
            return (d.innerText || '').trim().split('\n')[0].slice(0, 120);
        });
        if (text) this.setupNotes.push(`reverse proxy warning of SillyTavern confirmed ("${text}"): the proxy URL of your profile`);
        return !!text;
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

    /**
     * Open the card's chat (a new one: the instance has no chats) and wait for the engine's campaign at the greeting.
     * SillyTavern 1.19 opens its welcome screen on start (public/scripts/welcome-screen.js openWelcomeScreen: a panel
     * and the assistant's greeting pushed into the open chat after an await); a card chosen meanwhile gets them in its
     * new chat, before its own greeting, and the engine finds no greeting to start the campaign on. So the card is
     * chosen once the welcome screen stands still, and a chat that holds another speaker's message all the same is
     * replaced by a fresh one (/newchat).
     */
    async openCard(name, { chatName = null } = {}) {
        const p = this.page;
        if (!await this.welcomeDone()) this.setupNotes.push('SillyTavern\'s welcome screen did not settle within 30 s');
        const chid = await p.evaluate((n) => SillyTavern.getContext().characters.findIndex((c) => c.name === n), name);
        if (chid < 0) throw new Error(`the card "${name}" is not in the instance`);
        await p.evaluate(async (id) => { await SillyTavern.getContext().selectCharacterById(String(id)); }, chid);
        await p.waitForFunction(() => SillyTavern.getContext().chat.length >= 1, null, { timeout: 60000 });
        await p.waitForTimeout(1500);
        let foreign = await this.foreign(name);
        if (foreign.length) {
            this.setupNotes.push(`SillyTavern's welcome screen wrote into the card's new chat (${foreign.join(', ')}): a fresh chat was started`);
            await p.evaluate(async () => { await SillyTavern.getContext().executeSlashCommandsWithOptions('/newchat'); });
            await p.waitForFunction((n) => { const c = SillyTavern.getContext().chat; return c.length >= 1 && c.every((m) => m.is_user || m.name === n); }, name, { timeout: 60000 }).catch(() => {});
            foreign = await this.foreign(name);
            if (foreign.length) this.setupNotes.push(`the fresh chat holds another speaker's message as well (${foreign.join(', ')})`);
        }
        const started = await p.waitForFunction(() => (SillyTavern.getContext().chat[0]?.extra?.avereth?.events || []).some((e) => e.t === 'campaign.started'), null, { timeout: 90000 }).then(() => true).catch(() => false);
        if (!started) {
            const d = await p.evaluate(() => { const c = SillyTavern.getContext(); return { chat: c.chat.length, first: Object.keys(c.chat[0]?.extra || {}), status: document.getElementById('avereth_status')?.textContent || '' }; });
            this.setupNotes.push(`no campaign at the greeting after 90 s (chat ${d.chat} message(s), greeting extra: ${d.first.join(', ') || 'none'}, status: ${d.status.slice(0, 160)}); the engine's interceptor starts it with the first message`);
        }
        let chatId = await p.evaluate(() => SillyTavern.getContext().getCurrentChatId());
        if (chatName && started) {
            const span = { what: 'chat rename', from: Date.now(), to: null };
            this.runnerSpans.push(span);
            const renamed = await p.evaluate(async ({ from, to }) => {
                const c = SillyTavern.getContext();
                if (typeof c.renameChat !== 'function') return null;
                try { await c.renameChat(from, to); return c.getCurrentChatId(); } catch (e) { return `error: ${e?.message || e}`; }
            }, { from: chatId, to: chatName });
            if (renamed && !String(renamed).startsWith('error')) chatId = renamed;
            else this.setupNotes.push(`the chat could not be renamed (${renamed ?? 'no renameChat'}); it keeps "${chatId}"`);
            await p.waitForTimeout(1500); // its notice shows within this span
            span.to = Date.now();
        }
        await p.waitForTimeout(800);
        this.testChat = await this.identity();
        return { started, chatId };
    }

    /** Has SillyTavern's start settled: a chat open, or the welcome screen's messages unchanged for 2 s (at most 30 s)? */
    async welcomeDone() {
        let last = null;
        let since = Date.now();
        for (const t0 = Date.now(); Date.now() - t0 < 30000;) {
            const s = await this.page.evaluate(() => { const c = SillyTavern.getContext(); return `${c.getCurrentChatId() ?? ''}|${c.chat.length}`; });
            if (s !== last) { last = s; since = Date.now(); } else if (Date.now() - since >= 2000 && !s.endsWith('|0')) return true;
            await sleep(250);
        }
        return false;
    }

    /** The names of the messages in the open chat that are neither the player's nor the card's. */
    async foreign(name) { return this.page.evaluate((n) => SillyTavern.getContext().chat.filter((m) => !m.is_user && m.name !== n).map((m) => m.name || '?'), name); }

    /** One look at the page's state (no game state: busy, the length of the chat, the newest reply's reading status). */
    async probe() {
        return this.page.evaluate(() => {
            const c = SillyTavern.getContext();
            const stop = document.querySelector('#mes_stop');
            const busy = !!stop && getComputedStyle(stop).display !== 'none';
            const i = c.chat.findLastIndex((m) => !m.is_user && !m.is_system);
            return { busy, len: c.chat.length, lastUser: c.chat.findLastIndex((m) => m.is_user), extraction: c.chat[i]?.extra?.avereth?.extraction?.status || null, dialogs: document.querySelectorAll('dialog[open]').length,
                online: c.onlineStatus, chatId: c.getCurrentChatId(), avatar: c.characters[c.characterId]?.avatar };
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
        if (!before.online || before.online === 'no_connection') return { ok: false, problem: 'API disconnected before sending; no message entered', ms: 0 };
        if (!before.chatId || (this.testChat && (before.chatId !== this.testChat.chatId || before.avatar !== this.testChat.avatar))) return { ok: false, problem: 'wrong test chat before sending; no message entered', ms: 0 };
        await p.evaluate((t) => { $('#send_textarea').val(t).trigger('input'); $('#send_but').trigger('click'); }, text);
        const arrived = await p.waitForFunction((n) => SillyTavern.getContext().chat.length > n, before.len, { timeout: 30000 }).then(() => true).catch(() => false);
        if (!arrived) return { ok: false, problem: 'the message did not arrive in the chat', ms: Date.now() - t0 };
        let quietSince = null;
        let last = null;
        let replyAt = null;
        while (Date.now() - t0 < this.turnTimeoutMs) {
            if (this.aborted) return { ok: false, problem: 'interrupted', ms: Date.now() - t0 };
            last = await this.probe();
            if (last.dialogs && await this.acceptProxyWarning()) continue;
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
        // Patch 8.4.1: the messages without their HUD panels, and the newest HUD on screen once, unfolded as a player
        // clicks it open: what he carries, wears and has (HP, MP, stats, free Stat Points, quests) on every turn, read
        // from the page, never kept or written on by the runner
        const { messages, hud, hudMesid } = await this.page.evaluate((k) => {
            const els = [...document.querySelectorAll('#chat .mes')];
            const chat = SillyTavern.getContext().chat;
            // SillyTavern prefixes the classes of a message's HTML with "custom-" (its sanitizer)
            const huds = (el) => [...el.querySelectorAll('.mes_text details.avereth-hud, .mes_text details.custom-avereth-hud')];
            const textOf = (el) => {
                let t = (el.querySelector('.mes_text')?.innerText || '');
                for (const d of huds(el)) { const x = d.innerText || ''; if (x) t = t.replace(x, ''); }
                return t.replace(/\n{3,}/g, '\n\n').trim();
            };
            const users = els.map((el, i) => (el.getAttribute('is_user') === 'true' ? i : -1)).filter((i) => i >= 0);
            const from = users.length > k ? users[users.length - 1 - k] : 0;
            // Patch 8.4.2: his own message as he wrote it (the page renders "#assign …" as a heading, without its "#")
            const own = (el) => { const m = chat[Number(el.getAttribute('mesid'))]; return typeof m?.mes === 'string' ? m.mes.trim() : textOf(el); };
            const messages = els.slice(from).map((el) => {
                const user = el.getAttribute('is_user') === 'true';
                return {
                    mesid: Number(el.getAttribute('mesid')), user, system: el.getAttribute('is_system') === 'true',
                    name: (el.querySelector('.name_text')?.innerText || '').trim(), text: user ? own(el) : textOf(el),
                };
            });
            const newest = [...els].reverse().find((el) => huds(el).length);
            for (const el of els) for (const d of huds(el)) d.open = el === newest;
            const hud = newest ? huds(newest).map((d) => (d.innerText || '').trim()).filter(Boolean).join('\n\n') : null;
            return { messages, hud, hudMesid: newest ? Number(newest.getAttribute('mesid')) : null };
        }, back);
        const all = await this.toasts();
        const toasts = all.slice(this.toastsSeen).filter((t) => t.origin !== 'runner');
        this.toastsSeen = all.length;
        return { messages, hud, hudStale: hudStale(messages, hudMesid), toasts };
    }

    /** Every notice since the page opened, each with its origin: the runner's own action ("runner") or the game. */
    async toasts() {
        const all = await this.page.evaluate(() => window.__liveToasts || []);
        return all.map((t) => ({ ...t, origin: toastOrigin(t, this.runnerSpans) }));
    }

    /** SillyTavern's chat with the engine's records: for the evaluation, never for the player. */
    /** Runner-only opt-in setup; the caller has already created an isolated instance. */
    async installFixture(messages) {
        const identity = await this.identity();
        this.requireTestChat(identity);
        await this.page.evaluate((messages) => {
            const c = SillyTavern.getContext();
            c.chat.splice(0, c.chat.length, ...messages);
        }, messages);
        await this.reload();
        const events = (chat) => chat.map((m) => m.extra?.avereth?.events || []);
        if (JSON.stringify(events(await this.chat())) !== JSON.stringify(events(messages))) throw new Error('fixture installation: saved test campaign differs after reload');
    }

    async identity() {
        return this.page.evaluate(() => {
            const c = SillyTavern.getContext(), card = c.characters[c.characterId];
            return { chatId: c.getCurrentChatId(), avatar: card?.avatar, card: card?.name, groupId: c.groupId,
                campaign: (c.chat[0]?.extra?.avereth?.events || []).find((e) => e.t === 'campaign.started') || null,
                route: [c.mainApi, c.chatCompletionSettings?.chat_completion_source, c.chatCompletionSettings?.custom_url, c.chatCompletionSettings?.custom_model] };
        });
    }

    requireTestChat(identity, expected = this.testChat) {
        if (!identity.chatId || !identity.avatar || identity.groupId || (expected && (identity.chatId !== expected.chatId || identity.avatar !== expected.avatar))) throw new Error('wrong test chat identity; refusing to save or send');
    }

    async reload() {
        const expected = await this.identity();
        this.requireTestChat(expected);
        if (!expected.campaign) throw new Error('reload: active test chat has no saved campaign');
        await this.save();
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForFunction(() => window.SillyTavern?.getContext?.()?.characters?.length > 0, null, { timeout: 20000 }).catch(() => { throw new Error('reload: SillyTavern character list did not become ready in 20 s'); });
        if (!await this.welcomeDone()) throw new Error('reload: SillyTavern welcome screen did not settle');
        // ST 1.19 exposes selectCharacterById/openCharacterChat through getContext. Check the exact saved file first:
        // getChat() creates a greeting for a missing file, which must never turn a failed reload into a fresh campaign.
        await this.page.evaluate(async (expected) => {
            const c = SillyTavern.getContext();
            const id = c.characters.findIndex((x) => x.avatar === expected.avatar);
            if (id < 0) throw new Error('reload: saved test card is missing');
            const card = c.characters[id];
            const response = await fetch('/api/chats/get', { method: 'POST', headers: c.getRequestHeaders(), body: JSON.stringify({ ch_name: card.name, file_name: expected.chatId, avatar_url: card.avatar }) });
            if (!response.ok) throw new Error('reload: saved test chat could not be read');
            const data = await response.json();
            const campaign = Array.isArray(data) && (data[1]?.extra?.avereth?.events || []).find((e) => e.t === 'campaign.started');
            if (!campaign || JSON.stringify(campaign) !== JSON.stringify(expected.campaign)) throw new Error('reload: saved test campaign is missing or belongs to another chat');
            const route = [c.mainApi, c.chatCompletionSettings?.chat_completion_source, c.chatCompletionSettings?.custom_url, c.chatCompletionSettings?.custom_model];
            if (JSON.stringify(route) !== JSON.stringify(expected.route)) throw new Error('reload: API route changed; refusing another connection');
            card.chat = expected.chatId;
            await c.selectCharacterById(String(id), { switchMenu: false });
            const selected = SillyTavern.getContext();
            if (selected.groupId || selected.characters[selected.characterId]?.avatar !== expected.avatar) throw new Error('reload: wrong test card after selection');
            if (selected.getCurrentChatId() !== expected.chatId) await selected.openCharacterChat(expected.chatId);
        }, expected);
        const actual = await this.identity();
        this.requireTestChat(actual, expected);
        if (JSON.stringify(actual.campaign) !== JSON.stringify(expected.campaign)) throw new Error('reload: wrong campaign in the restored test chat');
        if (JSON.stringify(actual.route) !== JSON.stringify(expected.route)) throw new Error('reload: API route changed after selecting the test card');
        const connection = await this.connect();
        if (!connection.connected) throw new Error(`reload: API connection failed (${connection.status || 'no status'}); test chat restored, no message sent`);
        this.testChat = actual;
        this.setupNotes.push(`reload restored test chat "${actual.chatId}" and its campaign; API connected`);
    }

    async chat() { return this.page.evaluate(() => JSON.parse(JSON.stringify(SillyTavern.getContext().chat))); }

    async status() { return this.page.evaluate(() => document.getElementById('avereth_status')?.textContent || ''); }

    async save() { this.requireTestChat(await this.identity()); await this.page.evaluate(async () => { await SillyTavern.getContext().saveChat(); }); await this.page.waitForTimeout(800); }

    async screenshot(file) { try { await this.page.screenshot({ path: file, fullPage: false }); return file; } catch { return null; } }
}
