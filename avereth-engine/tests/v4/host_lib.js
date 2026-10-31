// index.js with a minimal SillyTavern host on a chat (as tests/v4/patch_failsoft_host_block.test.js): the tests drive
// the real host entry points (interceptor, MESSAGE_RECEIVED, MESSAGE_EDITED, ...) and see what it calls and shows.
// The caller restores the globals it replaces (keep GLOBALS and restore them in a finally).
import { readFile } from 'node:fs/promises';

export const GLOBALS = ['fetch', 'document', 'SillyTavern', 'toastr', 'averethInterceptor'];

/** index.js with a minimal SillyTavern host on this chat (as tests/v4/patch_failsoft_host_block.test.js). */
/** extra: further members of the SillyTavern context (e.g. substituteParams). */
export async function host(chat, tag, extra = {}) {
    const calls = { raw: 0, saves: 0, errors: [], warnings: [], aborted: 0, prompts: [] };
    const handlers = {};
    let initialized;
    const c = { chat, characters: [{ name: 'test', avatar: 'test.png' }], characterId: 0, extensionSettings: {}, getCurrentChatId: () => `b1-${tag}`, getRequestHeaders: () => ({}),
        eventTypes: { MESSAGE_RECEIVED: 'received', GENERATION_ENDED: 'ended', CHAT_COMPLETION_SETTINGS_READY: 'ready', GENERATION_STOPPED: 'stop', MESSAGE_EDITED: 'edited', CHAT_CHANGED: 'chat', MESSAGE_DELETED: 'deleted', MESSAGE_SWIPED: 'swiped' },
        eventSource: { on(type, fn) { (handlers[type] ||= []).push(fn); if (type === 'swiped') initialized(); } },
        saveChat: async () => { calls.saves++; }, saveSettingsDebounced() {}, setExtensionPrompt(...a) { calls.prompts.push(a[1]); }, addOneMessage() {},
        generateRaw: async () => { calls.raw++; return JSON.stringify({ commands: [] }); }, ...extra }; // a valid, empty plan
    globalThis.fetch = async (url) => (String(url).startsWith('file:') ? { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) } : { ok: true, json: async () => [{}, ...structuredClone(c.chat)] }); // the saved chat is what the host holds
    globalThis.document = { getElementById: () => null, querySelector: () => null };
    globalThis.SillyTavern = { getContext: () => c };
    globalThis.toastr = { error(text) { calls.errors.push(text); }, warning(text) { calls.warnings.push(text); } };
    const ready = new Promise((r) => { initialized = r; });
    await import(`../../index.js?b1-${tag}`);
    await ready;
    return { c, calls, handlers };
}
