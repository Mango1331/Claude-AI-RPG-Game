// Patch 10B-4c.1: one bounded retry after an Extractor transport
// failure or two empty JSON-less replies; never a second world commit.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec, setRec, laterTurns } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';

const content = await loadContent();
const VALID = JSON.stringify({ expected: {}, deltas: [] });
const EMPTY = { content: ' ', finish_reason: 'length', usage: { completion_tokens: 4000 } };

async function turn() {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    await g.player('I wait and listen.');
    const id = g.chat.push({ mes: 'The innkeeper nods once.', is_user: false, is_system: false, extra: {} }) - 1;
    const started = processReplyAny(g.chat, id, content);
    assert.equal(started.extract, true);
    assert.equal(rec(g.chat[id]).extraction.status, 'pending');
    return { g, id };
}
async function scripted(answers) {
    const { g, id } = await turn();
    const calls = [];
    const llm = async req => {
        calls.push(req);
        const a = answers.shift();
        if (a instanceof Error) throw a;
        return a;
    };
    const result = await runExtraction(g.chat, id, content, llm);
    return { g, id, calls, result, record: rec(g.chat[id]) };
}

test('10B-4c.1: primary transport error gets one fresh recovery and one world commit', async () => {
    const { record, result, calls, g, id } = await scripted([new Error('signal is aborted'), VALID]);
    assert.equal(result.applied, true);
    assert.equal(record.extraction.status, 'applied');
    assert.deepEqual(calls.map(x => x.purpose), ['extract', 'extract_recovery']);
    assert.deepEqual(calls.map(x => x.maxTokens), [4000, 4000]);
    assert.deepEqual(record.extraction.llm.map(x => x.purpose), ['extract', 'extract_recovery']);
    assert.equal(record.extraction.repaired, true);
    assert.equal(record.events.filter(e => e.t === 'extract.applied').length, 1);
    assert.equal(g.chat[id].mes, 'The innkeeper nods once.');
});

test('10B-4c.1: null first response retries once without inventing world facts', async () => {
    const { record, calls } = await scripted([null, VALID]);
    assert.equal(record.extraction.status, 'applied');
    assert.equal(calls.length, 2);
    assert.equal(record.extraction.raw.deltas.length, 0);
});

test('10B-4c.1: two transport failures retain normal safe failed status', async () => {
    const { record, result, calls } = await scripted([new Error('abort one'), new Error('abort two'), VALID]);
    assert.equal(calls.length, 2);
    assert.equal(record.extraction.status, 'failed');
    assert.equal(result.applied, false);
    assert.match(record.extraction.error, /abort two/);
    assert.equal(record.events.some(e => e.t === 'extract.applied'), false);
});

test('10B-4c.1: reasoning-only primary plus valid normal repair stays two calls', async () => {
    const { record, calls } = await scripted([EMPTY, VALID]);
    assert.equal(record.extraction.status, 'applied');
    assert.deepEqual(calls.map(x => x.purpose), ['extract', 'extract_repair']);
    assert.deepEqual(calls.map(x => x.maxTokens), [4000, 4000]);
});

test('10B-4c.1: two empty completions get one fresh 6000-token attempt', async () => {
    const { record, result, calls } = await scripted([EMPTY, EMPTY, VALID]);
    assert.equal(result.applied, true);
    assert.equal(record.extraction.status, 'applied');
    assert.deepEqual(calls.map(x => x.purpose), ['extract', 'extract_repair', 'extract_recovery']);
    assert.deepEqual(calls.map(x => x.maxTokens), [4000, 4000, 6000]);
    assert.equal(record.extraction.llm[0].finish, 'length');
    assert.equal(record.extraction.llm[1].finish, 'length');
    assert.equal(record.events.filter(e => e.t === 'extract.applied').length, 1);
    assert.equal(calls[2].messages.some(m => m.role === 'assistant'), false);
});

test('10B-4c.1: three empty completions stop without a fourth call', async () => {
    const { record, result, calls } = await scripted([EMPTY, EMPTY, EMPTY, VALID]);
    assert.equal(calls.length, 3);
    assert.equal(record.extraction.status, 'failed');
    assert.equal(result.applied, false);
    assert.equal(record.events.some(e => e.t === 'extract.applied'), false);
});

test('10B-4c.1: nonempty invalid JSON uses only old repair and no extra retry', async () => {
    const { record, calls } = await scripted(['not JSON', 'still not JSON', VALID]);
    assert.equal(record.extraction.status, 'failed');
    assert.deepEqual(calls.map(x => x.purpose), ['extract', 'extract_repair']);
});

test('10B-4c.1: nonempty invalid JSON repaired normally in two calls', async () => {
    const { record, calls } = await scripted(['not JSON', VALID]);
    assert.equal(record.extraction.status, 'applied');
    assert.equal(calls.length, 2);
});

test('10B-4c.1: changed narrator swipe during recovery cannot commit stale data', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        if (n === 1) return null;
        g.chat[id].mes = 'Different reply on a different swipe';
        return VALID;
    });
    assert.equal(n, 2);
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('10B-4c.1: a following player turn prevents a late recovery commit', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        if (n === 1) return null;
        // A later turn exists only after its engine events are booked.
        // A raw message alone must NOT satisfy laterTurns() in the real host.
        const later = { mes: 'I walk away.', is_user: true, is_system: false, extra: {} };
        g.chat.push(later);
        setRec(later, { events: [{ t: 'turn.begun', d: { turn: 2, input: 'I walk away.' } }] });
        assert.equal(laterTurns(g.chat, id), true);
        return VALID;
    });
    assert.equal(n, 2);
    assert.equal(result.changed, false);
    assert.equal(result.late, true);
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('10B-4c.1: a second extraction attempt on an applied reply makes no request or commit', async () => {
    const { g, id } = await turn();
    let n = 0;
    const llm = async () => { n++; return n === 1 ? null : VALID; };
    const first = await runExtraction(g.chat, id, content, llm);
    const events = structuredClone(rec(g.chat[id]).events);
    const second = await runExtraction(g.chat, id, content, llm);
    assert.equal(first.applied, true);
    assert.equal(second.changed, false);
    assert.equal(n, 2);
    assert.deepEqual(rec(g.chat[id]).events, events);
});

test('10B-4c.1: changed swipe after transport error skips recovery call entirely', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        g.chat[id].mes = 'A different active swipe.';
        throw new Error('transport aborted');
    });
    assert.equal(n, 1);
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('10B-4c.1: empty primary followed by edit skips even the normal repair', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        if (n === 1) {
            g.chat[id].mes = 'The narrator reply was edited before repair.';
            return EMPTY;
        }
        return VALID;
    });
    assert.equal(n, 1);
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('10B-4c.1: edit after two empty outputs skips the third 6000-token request', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        if (n === 2) g.chat[id].mes = 'An edited reply must not get a third attempt.';
        return EMPTY;
    });
    assert.equal(n, 2);
    assert.equal(result.changed, false);
    assert.equal(rec(g.chat[id]).events.length, 0);
});

test('10B-4c.1: an engine-booked later turn after a transport abort skips recovery', async () => {
    const { g, id } = await turn();
    let n = 0;
    const result = await runExtraction(g.chat, id, content, async () => {
        n++;
        const later = { mes: 'I walk away.', is_user: true, is_system: false, extra: {} };
        g.chat.push(later);
        setRec(later, { events: [{ t: 'turn.begun', d: { turn: 2 } }] });
        throw new Error('provider disconnected');
    });
    assert.equal(n, 1);
    assert.equal(result.changed, false);
    assert.equal(result.late, true);
    assert.equal(rec(g.chat[id]).events.length, 0);
});
