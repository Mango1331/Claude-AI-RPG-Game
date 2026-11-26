// Run from a .218 or .219 engine checkout with Node. No provider connection.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(process.argv[2] || '.');
const { engineAt, normalizeEvent } = await import(pathToFileURL(resolve(root, 'tools/replay/replay.mjs')));
const { runtime, host, content } = await engineAt(root);
const sources = new URL('./originals/chat.jsonl', import.meta.url);
const chat = readFileSync(sources, 'utf8').trim().split('\n').slice(1).map(JSON.parse);
const reader = fileURLToPath(new URL('./read_st_responses.py', import.meta.url));
const responses = JSON.parse(execFileSync(process.env.PYTHON || 'python3', [reader], { encoding: 'utf8' }));
const sizes = {};
const changed = [];
const unused = [];
let processed = 0;
function measure(role, length) {
    const item = sizes[role] ??= { calls: 0, characters: 0 };
    item.calls++;
    item.characters += length;
}
for (const [index, original] of chat.entries()) {
    const record = original.extra?.avereth;
    if (!record?.input_hash && !record?.extraction) continue;
    const prefix = structuredClone(chat.slice(0, index + 1));
    const message = prefix[index];
    delete message.extra.avereth;
    const queue = responses[index] || [];
    const llm = async ({ purpose, messages }) => {
        const response = queue.shift();
        assert.equal(response?.purpose, purpose, 'Unexpected model call at M' + index);
        measure(purpose, messages.reduce((n, m) => n + Array.from(m.content).length, 0));
        return response.content;
    };
    if (message.is_user) {
        if (message.is_system && record.command) message.is_system = false;
        const step = await runtime.prepareGenerationAsync(prefix, content, { type: 'normal', llm });
        if (step.action === 'context') measure('narrator_context', Array.from(step.context.text || '').length);
    } else if (runtime.processReplyAny(prefix, index, content, {}).extract) {
        await runtime.runExtraction(prefix, index, content, llm);
    }
    const events = (host.rec(message)?.events || []).map(normalizeEvent);
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(events)), (record.events || []).map(normalizeEvent))) changed.push(index);
    if (queue.length) unused.push([index, queue.map(a => a.purpose)]);
    processed++;
}
assert.equal(processed, 108);
console.log(JSON.stringify({ processed, equal: processed - changed.length, changed, unused, sizes }, null, 2));
