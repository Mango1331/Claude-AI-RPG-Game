import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { campaign, say } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { foldChat, rec } from '../../src/host.js';
import { providerResponseError } from '../../src/v4/narrator_recovery.js';
import { savedPrefixMatches } from '../../src/v4/continuation.js';
import { softExtractionFailure, turnFailure } from '../../tools/st_live/live/evaluator.mjs';

const content = await loadProductContent();
// Batch24 Rogue T314/I627: original input; a fresh product campaign isolates the transport boundary.
const input = "I ask the clerk if there's a bed or cheap lodging nearby for the night, then head there and sleep until morning.";
function hostLlm(fetch, headers = () => ({})) {
    const index = fs.readFileSync(new URL('../../index.js', import.meta.url), 'utf8');
    const start = index.indexOf('async function v4Llm('), end = index.indexOf('\n}', start) + 2;
    return new Function('ctx', 'fetch', 'LLM_TIMEOUT_MS', 'providerResponseError', `let llmPath;${index.slice(start, end)};return v4Llm;`)(
        () => ({ mainApi: 'openai', chatCompletionSettings: { chat_completion_source: 'custom' }, getRequestHeaders: headers }),
        fetch, 120000, providerResponseError);
}
async function start(llm, options = {}) {
    const g = await campaign(content), before = g.state();
    g.chat.push({ mes: input, is_user: true, extra: {} });
    const result = await prepareGenerationAsync(g.chat, content, { llm, settings: { planner: true }, ...options });
    return { g, before, result, record: rec(g.chat.at(-1)) };
}
test('151: rejected browser fetch permits saved nonexecution, then one new action, without replaying the failed input', async () => {
    let calls = 0;
    const x = await start(hostLlm(async () => { calls++; throw new TypeError('Failed to fetch'); }));
    assert.equal(calls, 2, 'keep the existing single recovery, no additional attempts');
    assert.equal(x.result.action, 'not_executed');
    assert.deepEqual(x.record.events, []);
    assert.deepEqual(x.g.state(), x.before);
    assert.equal(x.record.continuation.kind, 'planner_not_executed');
    for (const call of x.record.plan.llm) {
        assert.equal(call.error_kind, 'transport');
        assert.equal(call.transport_phase, 'fetch');
        assert.equal(call.transport_settled, true);
        assert.equal(call.unclassified, undefined);
    }
    const chat = JSON.parse(JSON.stringify(x.g.chat)), u = chat.length - 1;
    assert.deepEqual(foldChat(chat).state, x.before);
    assert.equal(savedPrefixMatches(x.g.chat, chat, u), true);
    assert.equal(softExtractionFailure(chat, u, turnFailure(chat, u)), true);
    const next = await say(x.g, 'I rest for one minute.', { type: 'activity', kind: 'rest', minutes: 1 });
    assert.equal(next.action, 'context');
    assert.match(next.context.text, /PREVIOUS INPUT NOT EXECUTED/);
    assert.equal(x.g.state().clock.minute, x.before.clock.minute + 1);
    assert.deepEqual(rec(x.g.chat[u]).events, []);
});
test('151: a pending fetch is not sealed as failed or continued before it settles', async () => {
    const g = await campaign(content), msg = { mes: input, is_user: true, extra: {} };
    g.chat.push(msg);
    let reject, began;
    const ready = new Promise(resolve => { began = resolve; });
    let calls = 0;
    const done = prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm: hostLlm(() => {
        calls++;
        if (calls === 1) return new Promise((resolve, fail) => { reject = fail; began(); });
        return Promise.reject(new TypeError('Failed to fetch'));
    }) });
    await ready;
    assert.equal(calls, 1);
    assert.equal(rec(msg), undefined);
    reject(new TypeError('Failed to fetch'));
    assert.equal((await done).action, 'not_executed');
    assert.equal(calls, 2);
});
test('151: unknown TypeErrors and errors outside the native fetch rejection remain hard failures', async () => {
    for (const llm of [
        hostLlm(async () => { throw new TypeError('unexpected program error'); }),
        hostLlm(() => { throw new TypeError('Failed to fetch'); }), // synchronous setup failure, no rejected request
        hostLlm(async () => ({}), () => { throw new TypeError('Failed to fetch'); }),
        async () => { throw new TypeError('Failed to fetch'); }, // no adapter provenance
        async () => { throw Object.assign(new Error('Failed to fetch'), { code: 'LLM_TRANSPORT', phase: 'fetch', settled: false }); },
        async () => { throw Object.assign(new Error('Failed to fetch'), { code: 'LLM_TRANSPORT', phase: 'other', settled: true }); },
    ]) {
        const x = await start(llm);
        assert.equal(x.result.action, 'abort');
        assert.equal(x.record.continuation, undefined);
        assert.equal(x.record.plan.llm[0].unclassified, true);
        assert.deepEqual(x.g.state(), x.before);
    }
});
test('151: caller cancellation and HTTP authentication remain hard; a valid response after one fetch failure executes once', async () => {
    const ctl = new AbortController(); ctl.abort();
    const cancelled = await start(req => hostLlm(async () => { throw new TypeError('Failed to fetch'); })({ ...req, signal: ctl.signal }));
    assert.equal(cancelled.result.action, 'abort');
    assert.equal(cancelled.record.plan.llm.length, 1);
    assert.equal(cancelled.record.continuation, undefined);
    const auth = await start(hostLlm(async () => ({ ok: false, status: 401, json: async () => ({}) })));
    assert.equal(auth.result.action, 'abort');
    assert.equal(auth.record.plan.llm.length, 1);
    let calls = 0;
    const ok = await start(hostLlm(async () => {
        if (++calls === 1) throw new TypeError('Failed to fetch');
        return { ok: true, json: async () => ({ choices: [{ message: { content: '{"commands":[]}' } }] }) };
    }));
    assert.equal(calls, 2);
    assert.equal(ok.result.action, 'context');
    assert.equal(ok.record.continuation, undefined);
    assert.equal(ok.g.state().turn, ok.before.turn + 1);
});
test('151: edits, history changes and expired generations cannot commit a late fetch failure', async () => {
    for (const change of ['input', 'history', 'generation']) {
        const g = await campaign(content), msg = { mes: input, is_user: true, extra: {} };
        g.chat.push(msg);
        let reject, began, current = true, calls = 0;
        const ready = new Promise(resolve => { began = resolve; });
        const done = prepareGenerationAsync(g.chat, content, { settings: { planner: true }, isCurrent: () => current,
            llm: hostLlm(() => { calls++; return new Promise((resolve, fail) => { reject = fail; began(); }); }) });
        await ready;
        if (change === 'input') msg.mes = 'I wait instead.';
        if (change === 'history') g.chat[0].mes += ' edited';
        if (change === 'generation') current = false;
        reject(new TypeError('Failed to fetch'));
        assert.equal((await done).stale, true);
        assert.equal(calls, 1);
        assert.equal(rec(msg), undefined);
    }
});
