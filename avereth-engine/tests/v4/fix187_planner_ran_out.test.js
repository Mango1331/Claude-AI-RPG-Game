// Build .187 stage 3 (P1f) – calls that run out of room (natural batch 14.11.2026 on .186, calls.json of all three runs;
// tools/model_budget_report.mjs): 16 of 192 first plans and 44 of 213 first extractions ended at their cap with NO text,
// the whole budget spent on reasoning (p50 8,000 / 16,000 reasoning characters) while ordinary answers are short (plan
// p50 117 completion tokens, extract p50 489) and the prompt size of both groups is the same (p50 ~13k / ~14.8k). A larger
// cap would mostly burn more tokens in the same run-away; the existing retries answered 54 of 60. The one change: a plan
// that ran out of room is told so and asked for the short object at once (as the extractor's empty retry already is),
// instead of "your JSON was invalid … read the PLAYER MESSAGE again". Budgets, the number of calls and the bounded
// recovery are unchanged. Scripted provider answers check the mechanics only, never a model's behaviour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { Chat4 } from './harness.js';
import { rec } from '../../src/host.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { planContext, withContentSkills } from '../../src/v4/planner.js';
import { planMessage, prepareGenerationAsync, PLAN_RAN_OUT } from '../../src/v4/runtime.js';
import { budgetReport } from '../../tools/model_budget_report.mjs';

const content = await loadContent();
const EMPTY = { content: '', finish_reason: 'length', usage: { completion_tokens: 2000 } };
const VALID = JSON.stringify({ commands: [] });
const ready = async () => { const g = new Chat4(content); await g.player('Mage'); await g.player('Flame Lance and Arcane Ward'); return g; };
async function scripted(answers, text = 'I wait here.', { isCurrent } = {}) {
    const g = await ready();
    const state = g.state();
    const context = withContentSkills(planContext(state, content, buildCatalog(state, content)), content);
    const calls = [];
    const llm = async (req) => { calls.push(req); return answers.shift() ?? null; };
    return { result: await planMessage(llm, content, context, text, isCurrent ? { isCurrent } : {}), calls };
}

test('.187 P1f: a plan that ran out of room (empty, finish length) is asked for the short object at once – no empty assistant turn, same budget, two calls', async () => {
    const { result, calls } = await scripted([EMPTY, { content: VALID, finish_reason: 'stop' }]);
    assert.equal(result.failed, false);
    assert.deepEqual(calls.map((x) => [x.purpose, x.maxTokens]), [['plan', 2000], ['plan_repair', 2000]]);
    assert.equal(calls[1].messages.at(-1).content, PLAN_RAN_OUT);
    assert.ok(!calls[1].messages.some((m) => m.role === 'assistant'), 'the empty answer is not sent back');
    assert.doesNotMatch(calls[1].messages.at(-1).content, /not valid JSON/);
});

test('.187 P1f against: cut-off JSON, an empty answer that did not run out, and invalid JSON keep the ordinary repair', async () => {
    for (const first of [{ content: '{"commands":[{"seq":1,"type":"go"', finish_reason: 'length' }, { content: '', finish_reason: 'stop' }, { content: 'not JSON', finish_reason: 'stop' }]) {
        const { calls } = await scripted([first, { content: VALID, finish_reason: 'stop' }]);
        assert.equal(calls[1].purpose, 'plan_repair');
        assert.notEqual(calls[1].messages.at(-1).content, PLAN_RAN_OUT, JSON.stringify(first));
        assert.match(calls[1].messages.at(-1).content, /Your answer was not valid/);
    }
});

test('.187 P1f: a valid first plan, even a long one with several actions, asks nothing more', async () => {
    const many = JSON.stringify({ commands: [
        { seq: 1, type: 'activity', kind: 'wait', what: null, minutes: 10, until: null, quote: 'I wait here', learn: null, teacher: null, tags: null, aspects: null, material: null },
        { seq: 2, type: 'activity', kind: 'search', what: 'tracks', minutes: null, until: null, quote: 'look for tracks', learn: null, teacher: null, tags: null, aspects: null, material: null },
    ] });
    const { result, calls } = await scripted([{ content: many, finish_reason: 'stop' }], 'I wait here, then look for tracks.');
    assert.equal(calls.length, 1);
    assert.equal(result.commands.length, 2);
});

test('.187 P1f: still empty twice → the bounded 4000 recovery as before; three empty → failure, no fourth call, no guessed commands', async () => {
    const two = await scripted([EMPTY, EMPTY, { content: VALID, finish_reason: 'stop' }]);
    assert.deepEqual(two.calls.map((x) => [x.purpose, x.maxTokens]), [['plan', 2000], ['plan_repair', 2000], ['plan_recovery', 4000]]);
    assert.equal(two.result.failed, false);
    const three = await scripted([EMPTY, EMPTY, EMPTY]);
    assert.equal(three.result.failed, true);
    assert.equal(three.result.commands, null);
    assert.equal(three.calls.length, 3);
});

test('.187 P1f: a stale request (swipe or edit meanwhile) asks no retry and books nothing', async () => {
    const { result, calls } = await scripted([EMPTY, { content: VALID, finish_reason: 'stop' }], 'I wait here.', { isCurrent: () => false });
    assert.equal(result.failed, true);
    assert.equal(result.error, 'stale request');
    assert.equal(calls.length, 1);
});

test('.187 P1f host path: a plan that ran out of room books its turn once; regenerate reuses it', async () => {
    const g = await ready();
    g.chat.push({ mes: 'I wait here.', is_user: true, is_system: false, extra: {} });
    const answers = [EMPTY, { content: VALID, finish_reason: 'stop' }];
    const requests = [];
    const llm = async (req) => { requests.push(req); return answers.shift() ?? null; };
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm });
    assert.equal(r.action, 'context');
    const booked = structuredClone(rec(g.chat.at(-1)).events);
    assert.equal(booked.filter((e) => e.t === 'cmd.interpreted').length, 1);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm });
    assert.equal(requests.length, 2, 'no new planner call');
    assert.deepEqual(rec(g.chat.at(-1)).events, booked);
});

test('.187 P1f tools/model_budget_report: counts empty and cut answers at the cap, what followed, and what they spent', () => {
    const r = budgetReport([[
        { role: 'plan', repair: false, turn: 1, max_tokens: 2000, finish: 'length', completion_tokens: 2000, content_chars: 0, reasoning_chars: 8000, ms: 20000, prompt_tokens: 13000 },
        { role: 'plan', repair: true, turn: 1, max_tokens: 2000, finish: 'stop', completion_tokens: 120, content_chars: 40, reasoning_chars: 100, ms: 3000, prompt_tokens: 13000 },
        { role: 'extract', repair: false, turn: 1, max_tokens: 4000, finish: 'length', completion_tokens: 4000, content_chars: 900, reasoning_chars: 3000, ms: 50000, prompt_tokens: 15000 },
    ]]);
    assert.equal(r.kinds.plan.length_empty, 1);
    assert.equal(r.kinds.extract.length_cut, 1);
    assert.deepEqual(r.after_length, { 'plan: answered': 1, 'extract: no further call': 1 });
    assert.deepEqual(r.spent_at_cap, { calls: 2, tokens: 6000, ms: 70000 });
});
