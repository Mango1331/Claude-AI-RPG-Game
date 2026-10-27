// Exercise both real index.js initializations, including their fetch wrappers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { rec } from '../../src/host.js';

test('Batch2 review E: duplicate initialization retains one provider retry and passes unrelated fetches through once', async () => {
    const g = await campaign(await loadProductContent()), handlers = new Map();
    let initialized, calls = 0;
    const c = {
        chat: g.chat, extensionSettings: {}, getCurrentChatId: () => 'reload-test',
        eventTypes: { MESSAGE_RECEIVED: 'received', GENERATION_ENDED: 'ended', CHAT_COMPLETION_SETTINGS_READY: 'ready',
            GENERATION_STOPPED: 'stop', MESSAGE_EDITED: 'edited', CHAT_CHANGED: 'chat', MESSAGE_DELETED: 'deleted', MESSAGE_SWIPED: 'swiped' },
        eventSource: { on(type, fn) { handlers.set(type, [...(handlers.get(type) || []), fn]); if (type === 'swiped') initialized(); } },
        saveChat: async () => {}, saveSettingsDebounced() {}, setExtensionPrompt() {},
        generateRaw: async () => JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'rest', what: null,
            minutes: 1, until: null, quote: 'I rest for one minute.' }] }),
    };
    const keys = ['fetch', 'document', 'SillyTavern', 'toastr', 'averethInterceptor'];
    const globals = Object.fromEntries(keys.map(k => [k, globalThis[k]]));
    try {
        globalThis.fetch = async url => {
            if (String(url).startsWith('file:')) return { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) };
            calls++;
            return new Response(JSON.stringify({ error: { type: 'server_error' } }), { status: 503 });
        };
        globalThis.document = { getElementById: () => null, querySelector: () => null };
        globalThis.SillyTavern = { getContext: () => c };
        globalThis.toastr = { error: message => assert.fail(message), warning() {} };
        c.chat.push({ is_user: true, mes: 'I rest for one minute.', extra: {} });
        for (const version of [1, 2]) {
            const ready = new Promise(resolve => { initialized = resolve; });
            await import(`../../index.js?batch2-review-load=${version}`);
            await ready;
            await globalThis.averethInterceptor([], 8000, () => assert.fail('valid rest aborted'), 'normal');
        }
        assert.equal(handlers.get('ready').length, 2);
        const user = c.chat.at(-1), events = structuredClone(rec(user).events);
        const data = { stream: false, messages: [{ role: 'system', content: '[AVERETH ENGINE] A recorded rest.' }] };
        for (const fn of handlers.get('ready')) fn(data);
        const options = { body: JSON.stringify(data), signal: new AbortController().signal };
        await globalThis.fetch('/api/backends/chat-completions/generate', options);
        assert.equal(calls, 2, 'shared marker and record identity prevent nested retries');
        assert.equal(rec(user).narrator_recovery.attempts, 1);
        assert.deepEqual(rec(user).events, events);
        await globalThis.fetch('/api/unrelated', options);
        assert.equal(calls, 3, 'unrelated requests are never retried');
    } finally {
        for (const [key, value] of Object.entries(globals)) {
            if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
        }
    }
});
