import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec } from '../../src/host.js';
import { processReplyAny, runExtraction } from '../../src/v4/runtime.js';
const content = await loadContent();
const valid = JSON.stringify({ expected: {}, deltas: [] });
const invalid = JSON.stringify({ expected: {}, deltas: [], thread: 'wrong root field' });
async function run(answers) {
    const g = new Chat4(content);
    await g.player('Mage'); await g.player('Flame Lance and Arcane Ward'); await g.player('I listen.');
    const id = g.chat.push({ mes: 'A quiet morning.', is_user: false, extra: {} }) - 1;
    processReplyAny(g.chat, id, content);
    const calls = [];
    await runExtraction(g.chat, id, content, async req => {
        calls.push(req); const a = answers.shift(); if (a instanceof Error) throw a; return a;
    });
    return { calls, record: rec(g.chat[id]) };
}
for (const [name, first, second] of [['empty then invalid', '', invalid], ['invalid then empty', invalid, ''],
    ['transport then invalid', new Error('network failure'), invalid], ['invalid then transport', invalid, new Error('network failure')]]) {
    test(`101 recovery: ${name} retains the candidate and repairs once`, async () => {
        const { calls, record } = await run([first, second, valid]);
        assert.equal(record.extraction.status, 'applied'); assert.equal(calls.length, 3);
        assert.equal(calls[2].purpose, 'extract_repair');
        assert.ok(calls[2].messages.some(m => m.role === 'assistant' && m.content === invalid));
        assert.equal(record.events.filter(e => e.t === 'extract.applied').length, 1);
    });
}
for (const [name, props] of [['cancel', { code: 'LLM_CANCELLED' }], ['authentication', { code: 'LLM_PROVIDER', status: 401 }],
    ['bad request', { code: 'LLM_PROVIDER', status: 400 }]]) {
    test(`101 recovery: ${name} does not spend a retry`, async () => {
        const { calls, record } = await run([Object.assign(new Error(name), props), valid]);
        assert.equal(calls.length, 1); assert.equal(record.extraction.status, 'failed');
        assert.ok(!record.events.some(e => e.t === 'extract.applied'));
    });
}
test('101 recovery: rate limit retries once, two transport failures stop', async () => {
    const err = () => Object.assign(new Error('rate limit'), { code: 'LLM_PROVIDER', status: 429 });
    assert.equal((await run([err(), valid])).record.extraction.status, 'applied');
    const r = await run([err(), err(), valid]); assert.equal(r.calls.length, 2); assert.equal(r.record.extraction.status, 'failed');
});

const originals = JSON.parse(fs.readFileSync(new URL('./fixtures/batch1_extractor_answers.json', import.meta.url))).runs;
for (const original of originals.filter(x => x.run.startsWith('001') || x.run.startsWith('003') || x.run.startsWith('005'))) {
    test(`101 original ${original.run} T${original.turn}: mixed failure retains the original JSON for a third repair`, async () => {
        const candidate = original.calls.find(x => x.text?.trim()).text;
        const { calls, record } = await run([...original.calls.map(x => x.text), valid]);
        assert.equal(calls.length, 3); assert.equal(record.extraction.status, 'applied');
        assert.ok(calls[2].messages.some(m => m.role === 'assistant' && m.content === candidate));
        assert.equal(record.events.filter(e => e.t === 'extract.applied').length, 1);
    });
}
