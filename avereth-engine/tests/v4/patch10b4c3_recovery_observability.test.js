// 10B-4c.3: existing bounded recovery is observable, not silently taken as a success.
// No new retry policy or mechanical game-state changes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec, setRec } from '../../src/host.js';
import { planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planMessage, prepareGenerationAsync, processReplyAny, runExtraction } from '../../src/v4/runtime.js';
import { recoveryObservation, recoverySummary } from '../../tools/st_live/live/evaluator.mjs';

const content = await loadContent();
const EMPTY_PLAN = { content: ' ', finish_reason: 'length', usage: { completion_tokens: 2000 } };
const EMPTY_EXTRACT = { content: ' ', finish_reason: 'length', usage: { completion_tokens: 4000 } };
const NOOP_PLAN = JSON.stringify({ commands: [] });
const NOOP_EXTRACT = JSON.stringify({ expected: {}, deltas: [] });

async function campaign() {
    const g = new Chat4(content);
    await g.player('Mage');
    await g.player('Flame Lance and Arcane Ward');
    return g;
}
async function extract(answers) {
    const g = await campaign();
    await g.player('I wait and listen.');
    const id = g.chat.push({ mes: 'The innkeeper nods.', is_user: false, is_system: false, extra: {} }) - 1;
    assert.equal(processReplyAny(g.chat, id, content).extract, true);
    const calls = [];
    await runExtraction(g.chat, id, content, async req => {
        calls.push(req);
        const answer = answers.shift();
        if (answer instanceof Error) throw answer;
        return answer;
    });
    return { record: rec(g.chat[id]), calls };
}

test('4c.3: Planner empty recovery returns explicit empty origin, including zero commands', async () => {
    const g = await campaign();
    const state = g.state();
    const ctx = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const replies = [EMPTY_PLAN, EMPTY_PLAN, NOOP_PLAN];
    const p = await planMessage(async () => replies.shift(), content, ctx, 'I wait here.');
    assert.equal(p.failed, false);
    assert.equal(p.recovery, 'empty');
    assert.deepEqual(p.commands, []);
    assert.equal(p.calls.length, 3);
});

test('4c.3: Planner persists the recovery category on the actual player record', async () => {
    const g = await campaign();
    g.chat.push({ mes: 'I wait here.', is_user: true, is_system: false, extra: {} });
    const replies = [EMPTY_PLAN, EMPTY_PLAN, NOOP_PLAN];
    const result = await prepareGenerationAsync(g.chat, content, {
        type: 'normal', settings: { planner: true },
        llm: async () => replies.shift(),
    });
    assert.equal(result.action, 'context');
    const r = rec(g.chat.at(-1));
    assert.equal(r.plan.recovery, 'empty');
    assert.equal(r.interp.commands.length, 0);
});

test('4c.3: normal Planner JSON repair has no recovery category', async () => {
    const g = await campaign(), state = g.state();
    const ctx = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const answers = ['not valid JSON', NOOP_PLAN];
    const p = await planMessage(async () => answers.shift(), content, ctx, 'I wait.');
    assert.equal(p.repaired, true);
    assert.equal(p.recovery, undefined);
});

test('4c.3: Planner exhausted empty recovery remains marked failed, never silently successful', async () => {
    const g = await campaign(), state = g.state();
    const ctx = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const p = await planMessage(async () => EMPTY_PLAN, content, ctx, 'I wait.');
    assert.equal(p.failed, true);
    assert.equal(p.recovery, 'empty');
    assert.equal(p.commands, null);
});

test('4c.3: Extractor transport recovery stores the type and empty-delta application separately', async () => {
    const { record, calls } = await extract([new Error('abort'), NOOP_EXTRACT]);
    assert.equal(record.extraction.status, 'applied');
    assert.equal(record.extraction.recovery, 'transport');
    assert.equal(record.extraction.deltas, 0);
    assert.deepEqual(calls.map(x => x.purpose), ['extract', 'extract_recovery']);
});

test('4c.3: Extractor empty-output recovery stores type on both success and failure', async () => {
    const success = await extract([EMPTY_EXTRACT, EMPTY_EXTRACT, NOOP_EXTRACT]);
    assert.equal(success.record.extraction.recovery, 'empty');
    assert.equal(success.record.extraction.status, 'applied');
    const failure = await extract([EMPTY_EXTRACT, EMPTY_EXTRACT, EMPTY_EXTRACT]);
    assert.equal(failure.record.extraction.recovery, 'empty');
    assert.equal(failure.record.extraction.status, 'failed');
});

test('4c.3: normal Extractor repair remains unclassified as recovery', async () => {
    const { record } = await extract(['not JSON', NOOP_EXTRACT]);
    assert.equal(record.extraction.status, 'applied');
    assert.equal(record.extraction.repaired, true);
    assert.equal(record.extraction.recovery, undefined);
});

test('4c.3: independent runner observation flags zero-results but not a definite world-state defect', () => {
    const chat = [
        { mes: 'I wait.', is_user: true, is_system: false, extra: {} },
        { mes: 'The innkeeper nods.', is_user: false, is_system: false, extra: {} },
    ];
    setRec(chat[0], { events: [], plan: { failed: false, recovery: 'empty' }, interp: { commands: [] } });
    setRec(chat[1], { events: [], extraction: { status: 'applied', recovery: 'transport', deltas: 0 } });
    assert.deepEqual(recoveryObservation(chat, 0), {
        planner: { type: 'empty', zeroCommands: true, failed: false },
        extractor: { type: 'transport', zeroDeltas: true, failed: false },
    });
    const summary = recoverySummary(chat);
    assert.deepEqual(summary, {
        planner: { empty: 1, transport: 0, zeroCommands: 1 },
        extractor: { empty: 0, transport: 1, zeroDeltas: 1 },
    });
});

test('4c.3: no recovered record and normal repair cannot inflate recovery counts', () => {
    const chat = [
        { mes: 'I wait.', is_user: true, extra: {} },
        { mes: 'He waits.', is_user: false, extra: {} },
    ];
    setRec(chat[0], { events: [], plan: { repaired: true }, interp: { commands: [] } });
    setRec(chat[1], { events: [], extraction: { status: 'applied', repaired: true, deltas: 0 } });
    assert.deepEqual(recoveryObservation(chat, 0), { planner: null, extractor: null });
    assert.equal(recoverySummary(chat).extractor.zeroDeltas, 0);
    assert.equal(recoverySummary(chat).planner.zeroCommands, 0);
});

test('4c.3: failure during recovery increments attempt count but not misleading zero success', () => {
    const chat = [
        { mes: 'I wait.', is_user: true, extra: {} },
        { mes: 'He waits.', is_user: false, extra: {} },
    ];
    setRec(chat[0], { events: [], plan: { recovery: 'empty', failed: true }, interp: { commands: null } });
    setRec(chat[1], { events: [], extraction: { recovery: 'empty', status: 'failed' } });
    const signal = recoveryObservation(chat, 0);
    assert.equal(signal.planner.failed, true);
    assert.equal(signal.planner.zeroCommands, false);
    assert.equal(signal.extractor.failed, true);
    assert.equal(signal.extractor.zeroDeltas, false);
    const summary = recoverySummary(chat);
    assert.equal(summary.planner.empty, 1);
    assert.equal(summary.extractor.empty, 1);
    assert.equal(summary.planner.zeroCommands, 0);
    assert.equal(summary.extractor.zeroDeltas, 0);
});
