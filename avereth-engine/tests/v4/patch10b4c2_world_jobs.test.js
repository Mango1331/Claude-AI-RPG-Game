// Patch 10B-4c.2: host lifecycle of pending V4 world extraction.
// No browser dependency: the same controller is wired into SillyTavern index.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRec, rec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { createWorldJobs } from '../../src/v4/world_jobs.js';
import { runExtraction, processReplyAny, pendingExtraction } from '../../src/v4/runtime.js';
import { Chat4 } from './harness.js';
import { loadContent } from '../helpers.js';

const content = await loadContent();
const VALID = JSON.stringify({ expected: {}, deltas: [] });
function deferred() {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}
function fixture(id = 'chat-A', text = 'The innkeeper nods.') {
    const message = { mes: text, is_user: false, is_system: false, extra: {} };
    setRec(message, { events: [], text_hash: hash32(text), extraction: { status: 'pending' } });
    return { chatId: id, chat: [message], message };
}
function rig(initial) {
    let now = initial, runs = [], published = [], errors = [];
    const holds = [];
    const manager = createWorldJobs({
        active: () => now,
        run: async (chat, id, { isCurrent, signal }) => {
            const hold = deferred();
            runs.push({ chat, id, isCurrent, signal, hold });
            holds.push(hold);
            return hold.promise;
        },
        applied: async (job, result, isCurrent) => {
            if (isCurrent()) published.push({ chat: job.chat, id: job.id, result });
        },
        onError: e => errors.push(String(e)),
    });
    return {
        manager, runs, published, errors, holds, setActive: value => { now = value; },
    };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('4c.2: duplicate MESSAGE_RECEIVED and CHAT_CHANGED start only one active job', async () => {
    const a = fixture(), x = rig(a);
    const p = x.manager.start(0);
    assert.equal(x.manager.start(0), p);
    assert.equal(x.manager.currentJob(), p);
    await tick();
    assert.equal(x.runs.length, 1);
    x.holds[0].resolve({ changed: true });
    await p;
    assert.equal(x.published.length, 1);
    assert.equal(x.manager.currentJob(), null);
});

test('4c.2: chat switch cancels old pending job and does not save its result in new chat', async () => {
    const a = fixture(), b = fixture('chat-B', 'A different reply.'), x = rig(a);
    const old = x.manager.start(0);
    await tick();
    x.setActive(b);
    x.manager.invalidate();
    const next = x.manager.start(0);
    await tick();
    assert.equal(x.runs.length, 2);
    assert.equal(x.runs[0].chat, a.chat, 'captured origin chat, not a dynamic ctx().chat');
    assert.equal(x.runs[0].signal.aborted, true);
    x.holds[0].resolve({ changed: true });
    await old;
    assert.equal(x.published.length, 0);
    x.holds[1].resolve({ changed: true });
    await next;
    assert.equal(x.published.length, 1);
    assert.equal(x.published[0].chat, b.chat);
});

test('4c.2: leaving and returning to the SAME chat ID still invalidates the former job', async () => {
    const a = fixture(), b = fixture('chat-B'), x = rig(a);
    const old = x.manager.start(0);
    await tick();
    x.setActive(b); x.manager.invalidate();
    x.setActive(a);
    const fresh = x.manager.start(0);
    await tick();
    assert.equal(x.runs[0].isCurrent(), false);
    assert.equal(x.runs.length, 2);
    x.holds[0].resolve({ changed: true });
    await old;
    x.holds[1].resolve({ changed: true });
    await fresh;
    assert.equal(x.published.length, 1);
});

test('4c.2: a changed active swipe (even with identical text) cancels prior job', async () => {
    const a = fixture(), x = rig(a);
    a.message.swipe_id = 0;
    const old = x.manager.start(0);
    await tick();
    a.message.swipe_id = 1;
    const fresh = x.manager.start(0);
    await tick();
    assert.equal(x.runs[0].signal.aborted, true);
    assert.equal(x.runs.length, 2);
    x.holds[0].resolve({ changed: true });
    await old;
    x.holds[1].resolve({ changed: true });
    await fresh;
    assert.equal(x.published.length, 1);
});

test('4c.2: edited text and changed reply object invalidate jobs before callback commits', async () => {
    const a = fixture(), x = rig(a);
    const old = x.manager.start(0);
    await tick();
    a.message.mes = 'The text was edited.';
    x.holds[0].resolve({ changed: true });
    await old;
    assert.equal(x.published.length, 0);
    assert.equal(x.manager.start(0), null, 'saved hash is stale after edit');
    a.message.mes = 'The innkeeper nods.';
    const again = x.manager.start(0);
    await tick();
    a.chat[0] = { ...a.message, extra: a.message.extra };
    x.holds[1].resolve({ changed: true });
    await again;
    assert.equal(x.published.length, 0);
});

test('4c.2: deletion/invalidation means no save and no new model invocation', async () => {
    const a = fixture(), x = rig(a);
    const old = x.manager.start(0);
    await tick();
    a.chat.pop();
    x.manager.invalidate();
    x.holds[0].resolve({ changed: true });
    await old;
    assert.equal(x.published.length, 0);
    assert.equal(x.manager.start(0), null);
    assert.equal(x.runs.length, 1);
});

test('4c.2: a fresh manager after reload resumes exactly one stored pending reply', async () => {
    const a = fixture();
    let calls = 0;
    const manager = createWorldJobs({
        active: () => a,
        run: async () => {
            calls++;
            setRec(a.message, { ...rec(a.message), extraction: { status: 'applied' } });
            return { changed: true };
        },
        applied: () => {},
    });
    await manager.start(0);
    assert.equal(calls, 1);
    assert.equal(manager.start(0), null, 'already applied must not be extracted twice');
});

test('4c.2: host job stays active through async save, so generation barrier waits', async () => {
    const a = fixture(), d = deferred(), x = rig(a);
    const manager = createWorldJobs({
        active: () => a,
        run: async () => ({ changed: true }),
        applied: async () => { await d.promise; },
    });
    const p = manager.start(0);
    await tick();
    assert.equal(manager.currentJob(), p);
    d.resolve();
    await p;
    assert.equal(manager.currentJob(), null);
});

test('4c.2: unexpected provider exception is contained and logged only on active chat', async () => {
    const a = fixture(), x = rig(a);
    const p = x.manager.start(0);
    await tick();
    x.holds[0].reject(new Error('unexpected host exception'));
    const result = await p;
    assert.equal(result.changed, false);
    assert.match(x.errors[0], /unexpected host exception/);
    assert.equal(x.manager.currentJob(), null);
});

async function realTurn() {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    await g.player('I wait here.');
    const id = g.chat.push({ mes: 'Nothing stirs.', is_user: false, is_system: false, extra: {} }) - 1;
    assert.equal(processReplyAny(g.chat, id, content).extract, true);
    return { g, id };
}

test('4c.2: actual runExtraction skips retry and commit after active chat changes during LLM', async () => {
    const { g, id } = await realTurn();
    let stillActive = true, count = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        count++;
        stillActive = false;
        return null;
    }, { isCurrent: () => stillActive });
    assert.equal(count, 1, 'old chat must not receive the second transport-recovery request');
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).extraction.status, 'pending');
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('4c.2: actual runExtraction cannot commit even a valid answer to inactive chat', async () => {
    const { g, id } = await realTurn();
    let active = true;
    const result = await runExtraction(g.chat, id, content, async () => {
        active = false;
        return VALID;
    }, { isCurrent: () => active });
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).extraction.status, 'pending');
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('4c.2: raw next user input is not a booked turn; reload resumes the pending reply', async () => {
    const { g, id } = await realTurn();
    g.chat.push({ mes: 'I continue.', is_user: true, is_system: false, extra: {} });
    assert.equal(pendingExtraction(g.chat), id);
    const second = await runExtraction(g.chat, id, content, async () => VALID);
    assert.equal(second.applied, true);
    assert.equal(pendingExtraction(g.chat), -1);
});
