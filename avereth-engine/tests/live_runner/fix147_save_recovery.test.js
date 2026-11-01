import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { Driver } from '../../tools/st_live/live/driver.mjs';

const original = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('../v4/fixtures/batch22_fix147.json.gz', import.meta.url))));
function harness(statuses, { stale = false, change = false, delay = 0 } = {}) {
    const page = new EventEmitter();
    const chat = structuredClone(original.records);
    const initial = structuredClone(chat);
    let disk = structuredClone(chat), writes = 0, active = 0, overlaps = 0, executions = 0, typed = '';
    const identity = { chatId: 'test', avatar: 'test.png', card: 'Test', groupId: null };
    const context = { chat, characters: [{ name: 'Test', avatar: 'test.png' }], characterId: 0,
        getCurrentChatId: () => identity.chatId, getRequestHeaders: () => ({}) };
    context.saveChat = async () => {
        if (active) overlaps++;
        active++; writes++;
        const request = { method: () => 'POST', url: () => 'http://localhost/api/chats/save' };
        page.emit('request', request);
        await new Promise(resolve => setTimeout(resolve, delay));
        const status = statuses[writes - 1] ?? 200;
        if (status === 'network') page.emit('requestfailed', request);
        else {
            page.emit('response', { url: request.url, ok: () => status === 200, status: () => status, request: () => request });
            if (status === 200 && !stale) disk = structuredClone(chat);
            active--; page.emit('requestfinished', request);
        }
        if (status === 'network') active--;
        // Like ST's conditional save, a failed write need not reject its promise.
    };
    const sandbox = { SillyTavern: { getContext: () => context }, fetch: async () => {
        if (change) identity.chatId = 'another-chat';
        return { ok: true, json: async () => [{ chat_metadata: {} }, ...structuredClone(disk)] };
    }, $: selector => ({ val(value) { typed = value; return this; }, trigger(event) {
        if (selector === '#send_but' && event === 'click') {
            executions++;
            chat.push({ mes: typed, is_user: true, extra: {} }, { mes: 'Status panel', is_user: false, is_system: true, extra: {} });
            void context.saveChat();
        }
        return this;
    } }) };
    vm.createContext(sandbox);
    page.evaluate = async (fn, arg) => { sandbox.argument = arg; return vm.runInContext(`(${fn.toString()})(argument)`, sandbox); };
    page.waitForFunction = async () => true;
    page.waitForTimeout = async () => {};
    const driver = new Driver(page, { quietMs: 0, turnTimeoutMs: 2000 });
    driver.testChat = identity;
    driver.identity = async () => ({ ...identity });
    driver.chat = async () => structuredClone(chat);
    driver.probe = async () => ({ busy: false, online: true, chatId: identity.chatId, avatar: identity.avatar,
        len: chat.length, lastUser: chat.length - 2, extraction: 'applied' });
    return { driver, chat, initial, disk: () => disk, stats: () => ({ writes, executions, overlaps }) };
}

test('.147 completed HTTP500 save retries only persistence and verifies all original purchase/class records', async () => {
    const h = harness([500, 200], { delay: 60 });
    const r = await h.driver.send('#status');
    assert.equal(r.ok, true);
    assert.deepEqual(h.stats(), { writes: 2, executions: 1, overlaps: 0 });
    assert.deepEqual(h.disk(), h.chat);
    assert.deepEqual(h.chat.slice(0, h.initial.length), h.initial);
    const events = h.disk().flatMap(m => m.extra?.avereth?.events || []);
    assert.equal(events.filter(e => e.t === 'class.evolved').length, 1);
    assert.equal(events.filter(e => e.t === 'transaction.completed').length, 1);
    assert.ok(h.driver.setupNotes.some(s => /recover|readback/i.test(s)));
    assert.equal(h.driver.saveFailures.length, 1, 'original failure remains recorded');
});

test('.147 permanent save failure still aborts; no third write or repeated turn', async () => {
    const h = harness([500, 500]);
    assert.equal((await h.driver.send('#status')).problem, 'chat persistence failed');
    assert.deepEqual(h.stats(), { writes: 2, executions: 1, overlaps: 0 });
    assert.equal(h.disk().length, h.initial.length);
});

test('.147 HTTP200 without complete saved records is not recovery', async () => {
    const h = harness([500, 200], { stale: true });
    assert.equal((await h.driver.send('#status')).ok, false);
    assert.equal(h.stats().writes, 2);
});

for (const status of [409, 'network']) test(`.147 no blind retry for unconfirmed/integrity failure ${status}`, async () => {
    const h = harness([status, 200]);
    assert.equal((await h.driver.send('#status')).ok, false);
    assert.equal(h.stats().writes, 1);
});

test('.147 chat switch during persistence readback cannot recover or overwrite another chat', async () => {
    const h = harness([500, 200], { change: true });
    assert.equal((await h.driver.send('#status')).ok, false);
    assert.equal(h.stats().writes, 1);
});
