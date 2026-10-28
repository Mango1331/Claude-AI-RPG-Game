// Patch 10B-4a: one bounded recovery for two reasoning-only/empty Planner replies.
// Real ST runs 3 and 4 demonstrate length-exhausted calls; this file uses scripted
// provider replies through the existing product planner and chat-host paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec } from '../../src/host.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, withContentSkills } from '../../src/v4/planner.js';
import { planMessage, prepareGenerationAsync } from '../../src/v4/runtime.js';

const content = await loadContent();
const EMPTY = { content: '', finish_reason: 'length', usage: { completion_tokens: 2000 } };
const VALID = JSON.stringify({ commands: [] });

async function ready() {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    return g;
}

async function scripted(answers, text = 'I wait here.') {
    const g = await ready();
    const state = g.state();
    const context = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const calls = [];
    const llm = async req => {
        calls.push(req);
        return answers.shift() ?? null;
    };
    return { result: await planMessage(llm, content, context, text), calls, g, llm };
}

test('10B-4a: two zero-text length answers get exactly one larger fresh Planner attempt', async () => {
    const { result, calls } = await scripted([EMPTY, EMPTY, { content: VALID, finish_reason: 'stop' }]);
    assert.equal(result.failed, false);
    assert.deepEqual(result.commands, []);
    assert.equal(result.repaired, true);
    assert.deepEqual(calls.map(x => x.purpose), ['plan', 'plan_repair', 'plan_recovery']);
    assert.deepEqual(calls.map(x => x.maxTokens), [2000, 2000, 4000]);
    assert.deepEqual(result.calls.map(x => x.finish), ['length', 'length', 'stop']);
    assert.match(calls[2].messages.at(-1).content, /JSON/);
    assert.ok(!calls[2].messages.some(x => x.role === 'assistant'), 'fresh recovery must not include empty answers');
});

test('10B-4a: three empty replies abort without guessed commands or a fourth request', async () => {
    const { result, calls } = await scripted([EMPTY, EMPTY, EMPTY]);
    assert.equal(result.failed, true);
    assert.equal(result.commands, null);
    assert.equal(result.calls.length, 3);
    assert.equal(calls.length, 3);
    assert.match(result.error, /not valid JSON/i);
});

test('10B-4a: the ordinary repair still finishes in two calls and keeps its old budget', async () => {
    const { result, calls } = await scripted([EMPTY, { content: VALID, finish_reason: 'stop' }]);
    assert.equal(result.failed, false);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].maxTokens, 2000);
});

test('10B-4a: nonempty but invalid JSON gets no extra recovery call', async () => {
    const { result, calls } = await scripted(['not JSON', 'still not JSON', VALID]);
    assert.equal(result.failed, true);
    assert.equal(calls.length, 2);
});

test('10B-4a / 4c.4: provider failure gets one bounded fresh call, never a loop', async () => {
    const { result, calls } = await scripted([null, EMPTY, VALID]);
    assert.equal(result.failed, true);
    assert.equal(result.recovery, 'transport');
    assert.deepEqual(calls.map(x => x.purpose), ['plan', 'plan_recovery']);
    assert.equal(calls.length, 2);
});

test('10B-4a: host commits Planner success only once after recovery and reuses it on regenerate', async () => {
    const g = await ready();
    g.chat.push({ mes: 'I wait here.', is_user: true, is_system: false, extra: {} });
    const answers = [EMPTY, EMPTY, { content: VALID, finish_reason: 'stop' }];
    const requests = [];
    const llm = async req => {
        requests.push(req);
        return answers.shift() ?? null;
    };
    const r = await prepareGenerationAsync(g.chat, content, {
        type: 'normal', settings: { planner: true }, llm,
    });
    assert.equal(r.action, 'context');
    const last = rec(g.chat.at(-1));
    assert.equal(last.interp.failed, false);
    assert.equal(last.plan.llm.length, 3);
    const booked = structuredClone(last.events);
    const again = await prepareGenerationAsync(g.chat, content, {
        type: 'regenerate', settings: { planner: true }, llm,
    });
    assert.ok(['context', 'none'].includes(again.action));
    assert.equal(requests.length, 3);
    assert.deepEqual(rec(g.chat.at(-1)).events, booked);
});

test('10B-4a: exhausted recovery on the host aborts without booking a turn', async () => {
    const g = await ready();
    g.chat.push({ mes: 'I wait here.', is_user: true, is_system: false, extra: {} });
    let calls = 0;
    const r = await prepareGenerationAsync(g.chat, content, {
        type: 'normal', settings: { planner: true },
        llm: async () => { calls++; return EMPTY; },
    });
    assert.equal(r.action, 'not_executed');
    assert.match(r.notice, /planner failed/);
    assert.deepEqual(rec(g.chat.at(-1)).events, []);
    assert.equal(calls, 3);
});
