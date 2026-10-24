// 10B-4c.4: review follow-ups, with no new Engine/world authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec, setRec } from '../../src/host.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, withContentSkills } from '../../src/v4/planner.js';
import { planMessage, prepareGenerationAsync } from '../../src/v4/runtime.js';
import { driverFailure, recoverySummary } from '../../tools/st_live/live/evaluator.mjs';
import { countSoftExtractorFailures } from '../../tools/st_live/live/report.mjs';

const content = await loadContent();
const VALID = JSON.stringify({ commands: [] });
const EMPTY = { content: '', finish_reason: 'length', usage: { completion_tokens: 2000 } };
async function ready() {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    return g;
}
async function planner(answers, opts = {}) {
    const g = await ready(), state = g.state();
    const ctx = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const calls = [];
    const result = await planMessage(async req => {
        calls.push(req);
        const response = answers.shift();
        if (response instanceof Error) throw response;
        return response;
    }, content, ctx, 'I wait.', opts);
    return { result, calls };
}

test('10B-4c.4: one Planner transport retry returns valid commands without ordinary repair', async () => {
    const { result, calls } = await planner([new Error('provider timeout'), VALID]);
    assert.equal(result.failed, false);
    assert.deepEqual(result.commands, []);
    assert.equal(result.recovery, 'transport');
    assert.equal(result.repaired, true);
    assert.deepEqual(calls.map(x => x.purpose), ['plan', 'plan_recovery']);
    assert.deepEqual(calls.map(x => x.maxTokens), [2000, 2000]);
    assert.equal(result.calls.length, 2);
});

test('10B-4c.4: null first Planner response gets one fresh retry', async () => {
    const { result, calls } = await planner([null, VALID]);
    assert.equal(result.recovery, 'transport');
    assert.equal(result.failed, false);
    assert.equal(calls.length, 2);
});

test('10B-4c.4: two failed Planner transports abort at exactly two requests', async () => {
    const { result, calls } = await planner([new Error('first'), new Error('second'), VALID]);
    assert.equal(result.failed, true);
    assert.equal(result.error, 'second');
    assert.equal(result.recovery, 'transport');
    assert.equal(result.commands, null);
    assert.equal(calls.length, 2);
});

test('10B-4c.4: invalid JSON after transport retry is refused, not sent through another repair', async () => {
    const { result, calls } = await planner([new Error('first'), 'not valid JSON', VALID]);
    assert.equal(result.failed, true);
    assert.equal(result.recovery, 'transport');
    assert.equal(calls.length, 2);
});

test('10B-4c.4: if the host became stale after failure, no wasteful retry is sent', async () => {
    let active = true;
    const g = await ready(), state = g.state();
    const ctx = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    let calls = 0;
    const result = await planMessage(async () => {
        calls++;
        active = false;
        throw new Error('swiped');
    }, content, ctx, 'I wait.', { isCurrent: () => active });
    assert.equal(result.failed, true);
    assert.equal(result.recovery, undefined);
    assert.equal(calls, 1);
});

test('10B-4c.4: host stores transport recovery and regenerate reuses exactly the same turn', async () => {
    const g = await ready();
    g.chat.push({ mes: 'I wait.', is_user: true, is_system: false, extra: {} });
    const answers = [new Error('timeout'), VALID];
    let calls = 0;
    const llm = async () => {
        calls++;
        const a = answers.shift();
        if (a instanceof Error) throw a;
        return a;
    };
    const first = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm });
    assert.equal(first.action, 'context');
    const r = rec(g.chat.at(-1));
    assert.equal(r.plan.recovery, 'transport');
    const events = structuredClone(r.events);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm });
    assert.equal(calls, 2);
    assert.deepEqual(rec(g.chat.at(-1)).events, events);
    const summary = recoverySummary(g.chat);
    assert.equal(summary.planner.transport, 1);
    assert.equal(summary.planner.zeroCommands, 1);
});

test('10B-4c.4: successful normal Planner and existing empty fallback are unaffected', async () => {
    const ordinary = await planner([VALID]);
    assert.equal(ordinary.result.recovery, undefined);
    assert.equal(ordinary.calls.length, 1);
    const empty = await planner([EMPTY, EMPTY, VALID]);
    assert.equal(empty.result.recovery, 'empty');
    assert.deepEqual(empty.calls.map(x => x.purpose), ['plan', 'plan_repair', 'plan_recovery']);
});

test('10B-4c.4: structured pending status classifies Extractor timeout independent of text formatting', () => {
    const chat = [
        { mes: 'I wait.', is_user: true, extra: {} },
        { mes: 'He waits.', is_user: false, is_system: false, extra: {} },
    ];
    setRec(chat[1], { events: [], extraction: { status: 'pending' } });
    const fault = driverFailure(chat, 'the turn did not end within 900 s (a different Driver format)', 'pending');
    assert.equal(fault?.kind, 'extractor_timeout');
    assert.equal(driverFailure(chat, 'the turn did not end within 900 s (extraction pending)', 'applied'), null);
    assert.equal(driverFailure(chat, 'unrelated network error', 'pending'), null);
});

test('10B-4c.4: soft Extractor count counts marked Runner turns, not ordinary failed extractions', () => {
    const turns = [
        { turn: 1, outcome: 'extractor_failed_soft' },
        { turn: 2, outcome: 'story' },
        { turn: 3, outcome: 'extractor_failed_soft', softFailure: 'timeout' },
        { turn: 4, outcome: 'extractor_failed' },
    ];
    assert.equal(countSoftExtractorFailures(turns), 2);
    assert.equal(countSoftExtractorFailures([]), 0);
});
