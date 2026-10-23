// Exercise the real index.js binding with a minimal host. No browser, provider, source-text assertions or sleeps.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadProductContent } from '../helpers.js';
import { campaign, inject } from './patch8_lib.js';
import { rec } from '../../src/host.js';

test('9C-2a host: a newer request or chat switch discards an old Forge without changing prompts, records, saves or aborting the new generation', async () => {
    const content = await loadProductContent();
    const g = await campaign(content);
    inject(g, [
        { t: 'growth.opened', d: { goal: { id: 'learn.1', n: 1, status: 'active', target: { fn: 'bolt', tags: ['Arcane'], aspects: ['Fire'] }, source: { kind: 'teacher', who: 'npc.mira', name: 'Mira', basis: 'fact', key: 'fact:teaches' }, lp: 0, need: 100, opened: { turn: 1, minute: 540 }, days: {}, fights: [] } } },
        { t: 'growth.progress', d: { goal: 'learn.1', lp: 100, total: 100, need: 100 } },
    ]);
    const base = structuredClone(g.chat);
    const handlers = {};
    let loaded;
    const initialized = new Promise((r) => { loaded = r; });
    let chatId = 'first';
    let saves = 0;
    const prompts = [];
    const aborts = [];
    let forgeCall = 0;
    let started;
    let release;
    let reached = new Promise((r) => { started = r; });
    const c = {
        chat: g.chat, extensionSettings: {}, getCurrentChatId: () => chatId,
        eventTypes: { MESSAGE_RECEIVED: 'received', MESSAGE_EDITED: 'edited', CHAT_CHANGED: 'chat', MESSAGE_DELETED: 'deleted', MESSAGE_SWIPED: 'swiped' },
        eventSource: { on: (type, fn) => { handlers[type] = fn; if (type === 'swiped') loaded(); } },
        saveChat: async () => { saves++; }, saveSettingsDebounced() {},
        setExtensionPrompt: (...args) => prompts.push(args),
        async generateRaw({ systemPrompt, prompt }) {
            if (!systemPrompt.startsWith('Name new fantasy Skills')) return JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'rest', what: null, minutes: 1, until: null, learn: null, teacher: null, tags: null, aspects: null, quote: 'i rest for one minute' }] });
            const n = ++forgeCall;
            if (n % 2 === 1) { started(); await new Promise((r) => { release = r; }); }
            const { drafts } = JSON.parse(prompt);
            return JSON.stringify({ skills: drafts.map((d) => ({ key: d.key, name: n % 2 ? 'Old Thread' : 'New Thread' })) });
        },
    };
    const globals = { fetch: globalThis.fetch, document: globalThis.document, SillyTavern: globalThis.SillyTavern, toastr: globalThis.toastr, averethInterceptor: globalThis.averethInterceptor };
    try {
        globalThis.fetch = async (url) => ({ ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) });
        globalThis.document = { getElementById: () => null, querySelector: () => null };
        globalThis.SillyTavern = { getContext: () => c };
        globalThis.toastr = { error: (m) => { throw new Error(m); }, warning() {} };
        await import('../../index.js');
        await initialized;
        const input = () => c.chat.push({ mes: '*i rest for one minute*', is_user: true, is_system: false, extra: {} });
        const run = () => globalThis.averethInterceptor([], 8000, (...args) => aborts.push(args), 'normal');
        input();
        const old = c.chat.at(-1);
        const first = run();
        await reached;
        input();
        await run();
        assert.equal(c.chat.at(-1).extra.avereth.events.find((e) => e.t === 'skill.defined').d.skill.name, 'New Thread');
        const published = { saves, prompts: structuredClone(prompts), chat: JSON.stringify(c.chat) };
        release();
        await first;
        assert.equal(rec(old), undefined);
        assert.equal(saves, published.saves);
        assert.deepEqual(prompts, published.prompts);
        assert.equal(JSON.stringify(c.chat), published.chat);
        assert.deepEqual(aborts, []);

        // Switch away and back to the same chat id while the next Forge is pending.
        c.chat = structuredClone(base);
        reached = new Promise((r) => { started = r; });
        input();
        const pending = run();
        await reached;
        chatId = 'other'; handlers.chat();
        chatId = 'first'; handlers.chat();
        const afterSwitch = { saves, prompts: structuredClone(prompts), chat: JSON.stringify(c.chat) };
        release();
        await pending;
        assert.equal(saves, afterSwitch.saves);
        assert.deepEqual(prompts, afterSwitch.prompts);
        assert.equal(JSON.stringify(c.chat), afterSwitch.chat);
        assert.deepEqual(aborts, []);
    } finally {
        for (const [k, v] of Object.entries(globals)) {
            if (v === undefined) delete globalThis[k]; else globalThis[k] = v;
        }
    }
});
