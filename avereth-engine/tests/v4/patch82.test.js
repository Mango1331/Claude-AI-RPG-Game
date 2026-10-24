// Patch 8.2 (docs/PATCH8_2_LLM_PERFORMANCE.md): LLM telemetry, the empty narrator reply and the extractor benchmark,
// against the live test of 21.10.2026 13:33 (tests/v4/live_1021e.json, build .26, GLM-5.3-Flash): the extractor's
// median rose from 4 s to 23 s with prompts as large as in .25, and message 36 is the narrator's empty reply that the
// extractor still read for 17.6 s. The chat is played on from its own messages with scripted LLM answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec, foldStats } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, runExtraction, pendingExtraction, generateBoard, callMeta, perfSummary, extractionRequest, EMPTY_REPLY_NOTICE } from '../../src/v4/runtime.js';
import { Chat4 } from './harness.js';
import { lastUser } from './patch8_lib.js';
import { prepare, extractorRequests, pendingChat, variantBody, schedule, judge, measures, summarize, summaryText, rebuiltIdentical, dryRun, CONCISE, VARIANTS } from '../../tools/bench_extract.mjs';
import { parseServerLog } from '../../tools/run_report.mjs';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021e.json'), 'utf8'));
const usage = (prompt, cached, completion) => ({ prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion, prompt_tokens_details: { cached_tokens: cached } });

/** The live chat up to message n (exclusive), played on; the planner answers `plans`, as objects with provider metadata. */
function live(n, { meta = true } = {}) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    g.plans = [];
    g.asked = [];
    const ask = g.llm;
    g.llm = async (req) => {
        g.asked.push(req);
        if (!req.purpose.startsWith('plan')) return ask(req);
        const text = g.plans.shift() ?? null;
        return meta && text !== null ? { content: text, finish_reason: 'stop', usage: usage(7149, 5140, 55) } : text;
    };
    return g;
}
async function turn(g, text, commands = [], opts = {}) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm, ...opts });
}
const replyMsg = (mes) => ({ mes, is_user: false, is_system: false, extra: {} });

// ------------------------------------------------------------------------------------------------ A. telemetry
test('8.2 telemetry 1: callMeta keeps only what the provider reported, never an estimate', () => {
    assert.deepEqual(callMeta('extract', 1200, 'plain text'), { purpose: 'extract', ms: 1200 });
    assert.deepEqual(callMeta('extract', 1200, null), { purpose: 'extract', ms: 1200 });
    assert.deepEqual(callMeta('extract', 31511, { content: '{}', finish_reason: 'stop', usage: usage(9071, 7039, 2271) }), { purpose: 'extract', ms: 31511, finish: 'stop', prompt: 9071, cached: 7039, completion: 2271 });
    // the provider's other spelling of the cache, and reasoning tokens where it names them
    assert.deepEqual(callMeta('plan', 5, { content: 'x', finish_reason: 'length', usage: { prompt_tokens: 10, cached_tokens: 4, completion_tokens: 2500, completion_tokens_details: { reasoning_tokens: 2400 } } }), { purpose: 'plan', ms: 5, finish: 'length', prompt: 10, cached: 4, completion: 2500, reasoning: 2400 });
    // nothing reported, nothing invented
    assert.deepEqual(callMeta('board', 7, { content: 'x', finish_reason: null, usage: { prompt_tokens: 'many' } }), { purpose: 'board', ms: 7 });
});

test('8.2 telemetry 2: the planner\'s call and the turn\'s local cost are on the player\'s record; the request to the LLM is unchanged', async () => {
    const g = live(42);
    const f0 = foldStats();
    const r = await turn(g, '*i wait a moment*', [], { waited: 8130 });
    assert.equal(r.action, 'context');
    const x = lastUser(g);
    assert.equal(x.plan.llm.length, 1);
    assert.deepEqual(Object.keys(x.plan.llm[0]).sort(), ['cached', 'completion', 'finish', 'ms', 'prompt', 'purpose']);
    assert.equal(x.plan.llm[0].finish, 'stop');
    assert.equal(x.plan.llm[0].cached, 5140);
    assert.equal(x.perf.wait_ms, 8130);
    assert.ok(Number.isInteger(x.perf.engine_ms) && x.perf.engine_ms >= 0);
    assert.ok(x.perf.folds >= 1, 'the turn folded the chat at least once');
    assert.ok(foldStats().calls > f0.calls);
    // the call is asked exactly as before 8.2: messages, purpose, temperature, maxTokens
    assert.deepEqual(Object.keys(g.asked[0]).sort(), ['maxTokens', 'messages', 'purpose', 'temperature']);
    // no telemetry in the game's events
    assert.ok(!JSON.stringify(x.events).includes('"cached"'));
    // a string answer (generateRaw, older hosts) still plays the same turn, its call carries purpose and time only
    const h = live(42, { meta: false });
    await turn(h, '*i wait a moment*', []);
    assert.deepEqual(Object.keys(lastUser(h).plan.llm[0]).sort(), ['ms', 'purpose']);
    const timeless = (events) => JSON.stringify(events, (k, v) => (k === 'ms' ? undefined : v));
    assert.equal(timeless(lastUser(h).events), timeless(x.events), 'the same turn, the same events, whichever form the answer came in (the planner\'s time aside)');
});

test('8.2 telemetry 3: the extractor\'s calls, their ends and tokens are on the reply\'s record: an empty answer at the limit, then its short repair', async () => {
    const g = live(36);
    const answer = JSON.stringify({ expected: {}, deltas: [] });
    const answers = [
        { content: '', finish_reason: 'length', usage: usage(8476, 7087, 2500) },
        { content: answer, finish_reason: 'stop', usage: usage(8534, 8468, 967) },
    ];
    g.llm = async (req) => (req.purpose.startsWith('extract') ? answers.shift() : null);
    g.chat.push(replyMsg('The lance struck the slime square in its milky flank, and it sagged, still quivering.'));
    const id = g.chat.length - 1;
    assert.equal(processReplyAny(g.chat, id, content, { narrationMs: 14200 }).extract, true);
    const x = await runExtraction(g.chat, id, content, g.llm);
    assert.equal(x.applied, true);
    const r = rec(g.chat[id]);
    assert.equal(r.extraction.repaired, true);
    assert.deepEqual(r.extraction.llm.map((c) => [c.purpose, c.finish, c.completion]), [['extract', 'length', 2500], ['extract_repair', 'stop', 967]]);
    assert.deepEqual(r.narration, { ms: 14200 }, 'the narrator\'s time stays with the reply after its extraction');
    // the status line reads the same records
    const line = perfSummary(g.chat);
    assert.equal(line, null, 'the live run\'s player message (build .26) has no perf yet: no line, no guess');
});

test('8.2 telemetry 4: the Board generator\'s calls are kept with its result; a failed board says how both attempts ended', async () => {
    const before = foldChat(fx.messages.slice(0, 11)).state;
    const need = { branch: 'loc.glassmere', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
    const llm = async () => ({ content: 'The board is empty today.', finish_reason: 'stop', usage: usage(1817, 0, 40) });
    const b = await generateBoard(llm, before, content, need);
    assert.ok(b.failed);
    assert.deepEqual(b.calls.map((c) => [c.purpose, c.finish, c.prompt]), [['board', 'stop', 1817], ['board', 'stop', 1817]]);
});

test('8.2 telemetry 5: the status line of a turn played under this build: wait, engine, planner, narrator, extractor with its end at the limit', async () => {
    const g = live(42);
    await turn(g, '*i wait a moment*', [], { waited: 8130 });
    g.llm = async (req) => (req.purpose.startsWith('extract') ? { content: '', finish_reason: 'length', usage: usage(8500, 7000, 2500) } : null);
    g.chat.push(replyMsg('He waited; the gallery stayed still.'));
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, { narrationMs: 9000 });
    await runExtraction(g.chat, id, content, g.llm);
    const line = perfSummary(g.chat);
    assert.match(line, /^waited 8\.1 s · engine \d+\.\d s \(\d+ folds, \d+ ms\) · planner \d+\.\d s · narrator 9\.0 s · extractor \d+\.\d s \(repaired\) \[length, length, length\]$/);
});

test('8.2 telemetry 6: a planner that fails keeps its calls and the turn\'s cost too; the turn aborts as before', async () => {
    const g = live(42);
    g.chat.push({ mes: '*i wait a moment*', is_user: true, is_system: false, extra: {} });
    g.plans = [null];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm, waited: 0 });
    assert.equal(r.action, 'abort');
    const x = lastUser(g);
    assert.equal(x.interp.failed, true);
    assert.deepEqual(x.plan.llm.map((c) => c.purpose), ['plan']);
    assert.equal(x.perf.wait_ms, 0);
    assert.deepEqual(x.events, []);
});

// ------------------------------------------------------------------------------------------------ B. the empty reply
test('8.2 empty 1: message 36 of the .26 run — the narrator\'s empty reply is not read; the engine\'s round stands; the System block says so', async () => {
    const g = live(36);
    const before = JSON.stringify(foldChat(g.chat).state);
    const turnEvents = rec(g.chat[35]).events.length;
    let asked = 0;
    g.llm = async () => { asked += 1; return null; };
    g.chat.push(replyMsg(''));
    const id = g.chat.length - 1;
    const p = processReplyAny(g.chat, id, content, { narrationMs: 55000 });
    assert.deepEqual(p, { changed: true, empty: true });
    const r = rec(g.chat[id]);
    assert.equal(r.extraction.status, 'skipped');
    assert.deepEqual(r.events, []);
    assert.deepEqual(r.narration, { ms: 55000, empty: true });
    assert.match(r.panel, /NO STORY TEXT/);
    assert.ok(r.panel.includes(EMPTY_REPLY_NOTICE.slice(0, 60)));
    assert.match(r.panel, /Flame Lance/, 'the engine\'s resolved round is still shown');
    // nothing to extract, nothing pending, nothing resumed after a reload
    assert.deepEqual(await runExtraction(g.chat, id, content, g.llm), { changed: false });
    assert.equal(asked, 0);
    assert.equal(pendingExtraction(g.chat), -1);
    assert.equal(JSON.stringify(foldChat(g.chat).state), before, 'the world is exactly as the engine left it');
    assert.equal(rec(g.chat[35]).events.length, turnEvents);
    // received again (SillyTavern re-renders): nothing changes
    assert.deepEqual(processReplyAny(g.chat, id, content, {}), { changed: false });
});

test('8.2 empty 2: whitespace or a stray report block alone is no story either', () => {
    for (const mes of ['   \n  ', '<avereth>{"deltas": []}</avereth>']) {
        const g = live(36);
        g.chat.push(replyMsg(mes));
        const id = g.chat.length - 1;
        assert.equal(processReplyAny(g.chat, id, content, {}).empty, true, JSON.stringify(mes));
        assert.equal(rec(g.chat[id]).extraction.status, 'skipped');
    }
});

test('8.2 empty 3: a swipe with story text is read as usual, exactly once; the player\'s turn is not resolved again', async () => {
    const g = live(36);
    g.chat.push(replyMsg(''));
    const id = g.chat.length - 1;
    processReplyAny(g.chat, id, content, {});
    const turnRecord = JSON.stringify(rec(g.chat[35]));
    // SillyTavern: the swipe replaces the message's text (the record is the swipe's, src/host.js syncSwipe)
    g.chat[id].mes = 'The lance tore into the slime; it slumped, quivering, but held together.';
    g.answer = { expected: {}, deltas: [{ seq: 1, type: 'fact', s: 'the gallery floor', p: 'stained', o: 'pale gel spattered across the wet stone' }] };
    const p = processReplyAny(g.chat, id, content, {});
    assert.equal(p.extract, true);
    const x = await runExtraction(g.chat, id, content, g.llm);
    assert.equal(x.applied, true);
    assert.equal(rec(g.chat[id]).extraction.status, 'applied');
    assert.equal((await runExtraction(g.chat, id, content, g.llm)).changed, false, 'read once');
    assert.equal(JSON.stringify(rec(g.chat[35])), turnRecord, 'the player\'s turn and its dice are untouched');
});

test('8.2 empty 4: no reply at all (the generation failed before a message was made): a regeneration reuses the turn, no event twice, no LLM call', async () => {
    const g = live(36);
    const turnRecord = JSON.stringify(rec(g.chat[35]));
    let asked = 0;
    g.llm = async () => { asked += 1; return null; };
    const r = await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.equal(r.action, 'context');
    assert.equal(asked, 0);
    assert.equal(JSON.stringify(rec(g.chat[35])), turnRecord);
    // and the next player message after an empty reply is resolved normally; the empty reply is not closed as late
    g.chat.push(replyMsg(''));
    processReplyAny(g.chat, g.chat.length - 1, content, {});
    const next = live(0);
    next.chat = g.chat;
    const t = await turn(next, '*i basic Attack Slime A*', [{ type: 'use_skill', skill: 'mage.basic_attack', target: 'mon.slimemineral_pair_1', quote: 'i basic Attack Slime A' }]);
    assert.notEqual(t.action, 'abort');
    assert.equal(rec(g.chat[36]).extraction.status, 'skipped');
    assert.ok(!rec(g.chat[36]).corrections?.length);
});

// ------------------------------------------------------------------------------------------------ C. the benchmark
/** The .26 run's extractor requests as SillyTavern's console logged them, rebuilt from the fixture (byte-identical). */
function serverLog(ids) {
    const parts = [];
    for (const id of ids) {
        const req = extractionRequest(pendingChat(fx.messages, id), id, content);
        const body = { messages: req.messages, model: 'zai-org/GLM-5.3-Flash', temperature: 0.1, max_tokens: 2500, stream: false, clear_thinking: true, reasoning_effort: 'low' };
        const raw = rec(fx.messages[id]).extraction?.raw;
        parts.push(`Chat Completion request: ${JSON.stringify(body)}`);
        parts.push(`Chat Completion response: ${JSON.stringify({ id: `r${id}`, choices: [{ message: { role: 'assistant', content: raw ? JSON.stringify(raw) : '' }, finish_reason: raw ? 'stop' : 'length' }], usage: usage(8500, 7000, raw ? 300 : 2500) })}`);
        // its repair is no first call: never benchmarked on its own
        parts.push(`Chat Completion request: ${JSON.stringify({ ...body, messages: [...req.messages, { role: 'user', content: 'Your previous answer was empty.' }] })}`);
    }
    return parts.join('\n');
}

test('8.2 bench 1: the logged requests are found, mapped to their replies (repairs left out), rebuilt byte-identical, and the live answers judged as the live world', async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bench-')), 'server.log');
    fs.writeFileSync(file, serverLog([12, 22, 24]));
    const prep = await prepare({ log: file, chat: path.join(ROOT, 'tests/v4/live_1021e.json') });
    assert.deepEqual(prep.items.map((x) => x.id), [12, 22, 24]);
    const rows = dryRun({ ...prep, content });
    for (const r of rows) {
        assert.equal(r.identical, true, `request of message ${r.id}`);
        assert.equal(r.judged.valid, true);
        assert.deepEqual(r.judged.diff, [], `the live answer of message ${r.id} makes the live world again`);
    }
});

test('8.2 bench 2: the variants differ only where they should: A as logged, A0 without reasoning_effort, C with the closing instruction', () => {
    const { pairs } = parseServerLog(serverLog([12]));
    const body = pairs[0].req;
    assert.deepEqual(variantBody(body, 'A'), body);
    const a0 = variantBody(body, 'A0');
    assert.equal('reasoning_effort' in a0, false);
    assert.deepEqual({ ...a0, reasoning_effort: 'low' }, body);
    const c = variantBody(body, 'C');
    assert.deepEqual(c.messages.slice(0, -1), body.messages);
    assert.deepEqual(c.messages.at(-1), { role: 'user', content: CONCISE });
    assert.equal(c.reasoning_effort, 'low');
    assert.equal(c.clear_thinking, true);
});

test('8.2 bench 3: the variants run interleaved: over the rounds each goes first equally often, every request gets every variant every round', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const runs = schedule(items, VARIANTS, 3);
    assert.equal(runs.length, 27);
    for (const v of VARIANTS) assert.equal(runs.filter((r) => r.variant === v).length, 9);
    const firsts = items.flatMap((_, i) => [0, 1, 2].map((round) => runs.find((r) => r.round === round && r.item === items[i]).variant));
    for (const v of VARIANTS) assert.equal(firsts.filter((x) => x === v).length, 3);
});

test('8.2 bench 4: the judge sees a world that differs from the live one (an extra fact, a person the live answer did not make), and an invalid answer', () => {
    const items = extractorRequests(parseServerLog(serverLog([22])).pairs, fx.messages, content);
    const raw = rec(fx.messages[22]).extraction.raw;
    const more = { ...raw, deltas: [...raw.deltas, { seq: 99, type: 'fact', s: 'the gate warden', p: 'mood', o: 'bored' }] };
    const j = judge(items[0], JSON.stringify(more), content, fx.messages);
    assert.equal(j.valid, true);
    assert.deepEqual(j.diff.filter((k) => k.startsWith('facts.')).length, 1, j.diff.join(','));
    assert.ok(j.diff.every((k) => k.startsWith('facts.')), 'only the extra fact differs from the live world');
    assert.equal(judge(items[0], 'I think the reply establishes', content, fx.messages).valid, false);
    assert.equal(rebuiltIdentical(items[0], content, fx.messages), true);
});

test('8.2 bench 5: measures report what the provider sent, nothing estimated; the summary counts ends at the limit, empty and invalid answers', () => {
    const m = measures({ choices: [{ message: { content: '', reasoning: 'x'.repeat(1200) }, finish_reason: 'length' }], usage: usage(8500, 7000, 2500) }, 30000);
    assert.deepEqual({ ...m, text: undefined }, { ms: 30000, finish: 'length', empty: true, text: undefined, prompt: 8500, cached: 7000, completion: 2500, reasoning_chars: 1200 });
    assert.deepEqual(measures({ choices: [{ message: { content: '{}' }, finish_reason: 'stop' }] }, 1000).completion, null);
    const rows = summarize([
        { variant: 'A', ms: 30000, finish: 'length', empty: true, completion: 2500, judged: { valid: false } },
        { variant: 'A', ms: 4000, finish: 'stop', empty: false, completion: 300, judged: { valid: true, deltas: 3, rejected: 1, diff: [] } },
        { variant: 'C', ms: 3000, finish: 'stop', empty: false, completion: 200, judged: { valid: true, diff: ['facts'] } },
        { variant: 'C', error: 'HTTP 429', ms: 10 },
    ], ['A', 'C']);
    assert.deepEqual(rows[0], { variant: 'A', n: 2, errors: 0, median_ms: 17000, p90_ms: 30000, completion: 1400, length: 1, empty: 1, invalid: 1, accepted: 2, rejected: 1, diff_mean: 0, identical_world: 1 });
    assert.match(summaryText(rows), /\| A \| 2 \| 17\.0 s \| 30\.0 s \| 1400 \| 1 \| 1 \| 1 \| 2 \| 1 \| 0 \| 1 \|/);
    assert.equal(rows[1].errors, 1);
    assert.equal(rows[1].diff_mean, 1);
});
