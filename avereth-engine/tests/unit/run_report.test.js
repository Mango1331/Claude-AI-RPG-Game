// tools/run_report.mjs (docs/TEST5_PLAN.md): reads SillyTavern's server log (util.inspect literals, not JSON), splits
// the prompt and the reply into their parts, matches rows to the chat file by the player's message, and rebuilds a
// request the way Runtime V3 sends it.
import test from 'node:test';
import assert from 'node:assert/strict';
import util from 'node:util';
import { parseServerLog, measure, promptParts, outputParts, chatGenerations, v3Columns } from '../../tools/run_report.mjs';
import { REPORT_REQUEST_HEAD } from '../../src/host.js';

// what SillyTavern's console.debug prints (server-main.js: maxStringLength null, depth 4)
const log = (kind, obj) => `Chat Completion ${kind}: ${util.inspect(obj, { depth: 4, maxStringLength: null, maxArrayLength: null })}\n`;
const LORE = 'TIDECROSS\n\nPosition: a harbour town on the southern coast, where the salt road meets the sea.';
const SYSTEM = [
    'You are a skilled narrative author. <dialogue>Voices.</dialogue>',
    '### NPC DOSSIER:\n  trigger: >\n    a dossier for every person\n[CRITICAL RULE: DO NOT generate a dossier for: Kest]\n### NPC UPDATES:\n  trigger: x',
    '<banlist>\n- Ledger\n</banlist>',
    `<character_sheet>\nhere is the lore:\n${LORE}\nAVERETH RPG — SANDBOX NARRATOR CONTRACT\n\nROLE & PURPOSE\nYou narrate.\n\nFINAL SANDBOX CHECK\nCorrect any violation before output.`,
    '[RELEVANT NPCs]\n<retrieved_npcs>\n<Kest>**Role:** veteran</Kest>\n</retrieved_npcs>\n</character_sheet>',
].join('\n');
const THINK = '## your thinking steps:\n<think>7 points</think>\n## At the end of your response, output exactly one <Blocks> section.\n<Blocks>\n<World_State>**Time:** [..]</World_State>\n<Character_Sheet>HP: [..]</Character_Sheet>\n</Blocks>\n\n## final reminder:\nNPCs know only what they saw.';
const BLOCKS = '\n<Blocks>\n<World_State>**Time:** Day 1</World_State>\n<Character_Sheet>HP: 80/80</Character_Sheet>\n</Blocks>';
const ENGINE = '[AVERETH ENGINE — authoritative game state, turn 3.]\nDay 1 | Tidecross';
const request = (input, stream) => ({
    messages: [{ role: 'system', content: SYSTEM }, { role: 'assistant', content: `The gate opens.${BLOCKS}` }, { role: 'system', content: THINK }, { role: 'user', content: input }, { role: 'system', content: ENGINE }],
    model: 'glm', stream, reasoning_effort: 'low',
});
const reply = { choices: [{ message: { role: 'assistant', reasoning: 'Think about Kest.', content: `"Board's there," Kest says.\n<avereth>{"time":5}</avereth>${BLOCKS}` }, finish_reason: 'stop' }], usage: { prompt_tokens: 300, completion_tokens: 60 } };

test('the server log: util.inspect literals parse, a response pairs with its request, a streamed request stands alone', () => {
    const text = log('request', request('I walk to the Guild hall.', false)) + 'some other console line\n' + log('response', reply)
        + log('request', request('"Kest, what about Greyhowl?"', true)) + 'Streaming request in progress\n';
    const { pairs, errors } = parseServerLog(`\x1b[90m${text}\x1b[39m`);
    assert.deepEqual(errors, []);
    assert.equal(pairs.length, 2);
    assert.equal(pairs[0].resp.usage.completion_tokens, 60);
    assert.equal(pairs[1].resp, null);
});

test('prompt categories: preset, dossier, NPC bank, tracker templates and blocks, contract, lore, engine, history', () => {
    const parts = promptParts(request('I walk to the Guild hall.', false).messages, [LORE]);
    const whole = request('I walk to the Guild hall.', false).messages.reduce((a, m) => a + m.content.length, 0);
    assert.equal(Object.values(parts).reduce((a, b) => a + b, 0), whole, 'every character is counted once');
    assert.ok(parts.dossier > 100 && parts.npcBank > 40 && parts.trackerTemplate > 100);
    assert.equal(parts.lore, LORE.length);
    assert.equal(parts.contract, 'AVERETH RPG — SANDBOX NARRATOR CONTRACT\n\nROLE & PURPOSE\nYou narrate.\n\nFINAL SANDBOX CHECK\nCorrect any violation before output.'.length);
    assert.equal(parts.engine, ENGINE.length);
    assert.equal(parts.history, 'The gate opens.'.length + 'I walk to the Guild hall.'.length);
    assert.ok(parts.trackerHistory > 50);
    const out = outputParts(reply);
    assert.equal(out.reasoning, 'Think about Kest.'.length);
    assert.equal(out.report, '<avereth>{"time":5}</avereth>'.length);
    assert.ok(out.tracker > 50 && out.prose >= '"Board\'s there," Kest says.'.length);
});

test('rows: tokens from usage (or estimated), output split, duration matched by the player\'s message, V3 rebuild', () => {
    const text = log('request', request('I walk to the Guild hall.', false)) + log('response', reply) + log('request', request('"Kest, what about Greyhowl?"', true));
    const chat = [JSON.stringify({ chat_metadata: {} }),
        JSON.stringify({ is_user: true, mes: 'I walk to the Guild hall.' }),
        JSON.stringify({ is_user: false, mes: '"Board\'s there," Kest says.', swipes: ['"Board\'s there," Kest says.'], swipe_info: [{ gen_started: '2026-09-24T10:00:00.000Z', gen_finished: '2026-09-24T10:00:42.500Z' }] }),
        JSON.stringify({ is_user: true, mes: '"Kest, what about Greyhowl?"' }),
        JSON.stringify({ is_user: false, mes: '"Leave it."', gen_started: '2026-09-24T10:01:00.000Z', gen_finished: '2026-09-24T10:01:30.000Z' }),
    ].join('\n');
    const rows = measure(parseServerLog(text).pairs, { lore: [LORE], gens: chatGenerations(chat) });
    assert.equal(rows[0].prompt, 300);
    assert.equal(rows[0].estimated, false);
    assert.equal(Object.values(rows[0].parts).reduce((a, b) => a + b, 0), 300);
    assert.equal(rows[0].completion, 60);
    assert.equal(Object.values(rows[0].output).reduce((a, b) => a + b, 0), 60);
    assert.equal(rows[0].seconds, 42.5);
    assert.equal(rows[1].estimated, true, 'a streamed reply leaves no usage in the log');
    assert.equal(rows[1].output, null);
    assert.equal(rows[1].seconds, 30);
    // the same request as Runtime V3 sends it: without Megumin's dossier, bank and templates only with the checklist
    const replay = { turns: new Map([['i walk to the guild hall.', { engine: 430, history: 43 }]]), contract: 4300 };
    const v = v3Columns(rows[0], replay);
    assert.equal(v.engineOnly.trackerHistory, 0);
    assert.equal(v.engineOnly.dossier, rows[0].parts.dossier);
    assert.equal(v.withMegumin.dossier + v.withMegumin.npcBank + v.withMegumin.trackerTemplate, 0);
    assert.equal(v.withMegumin.contract, Math.round(4300 / rows[0].ratio));
    assert.equal(v3Columns(rows[1], replay), null, 'a message the fixture does not have (a discarded attempt) gets no V3 row');
});

test('an old reply handed back again (same response id) is not measured, and the regenerated reply keeps its duration', () => {
    // Test 5, first run: request 4 ("Alaric 18 Warrior F Rank") got request 3's reply again, with its id and time; the
    // player regenerated (request 5, the same request)
    const old = { ...reply, id: 'r-3', created: 100 };
    const text = log('request', request('I go into the Guild hall.', false)) + log('response', old)
        + log('request', request('Alaric 18 Warrior F Rank', false)) + log('response', old)
        + log('request', request('Alaric 18 Warrior F Rank', false)) + log('response', { ...reply, id: 'r-5', created: 900, usage: { prompt_tokens: 320, completion_tokens: 44 } });
    const { pairs } = parseServerLog(text);
    assert.deepEqual(pairs.map((p) => p.repeatOf), [null, 1, null]);
    assert.equal(pairs[1].resp, null);
    const chat = [JSON.stringify({ chat_metadata: {} }),
        JSON.stringify({ is_user: true, mes: 'I go into the Guild hall.' }),
        JSON.stringify({ is_user: false, mes: '"Board\'s there," Kest says.', gen_started: '2026-09-24T11:15:54.000Z', gen_finished: '2026-09-24T11:16:27.000Z' }),
        JSON.stringify({ is_user: true, mes: 'Alaric 18 Warrior F Rank' }),
        JSON.stringify({ is_user: false, mes: '"Board\'s there," Kest says.', gen_started: '2026-09-24T14:04:04.000Z', gen_finished: '2026-09-24T14:04:37.000Z' }),
    ].join('\n');
    const rows = measure(pairs, { lore: [LORE], gens: chatGenerations(chat) });
    assert.equal(rows[1].repeatOf, 1);
    assert.equal(rows[1].estimated, true, 'the old usage belongs to request 1');
    assert.equal(rows[1].output, null);
    assert.equal(rows[1].seconds, null);
    assert.equal(rows[2].completion, 44);
    assert.equal(rows[2].seconds, 33, 'the regenerated reply is matched to the request that produced it');
});

test('a report request is a row of its own: its player message, its time from the reply\'s record, no V3 row', () => {
    const noReport = { ...reply, id: 'n1', choices: [{ message: { role: 'assistant', content: 'The fishwife takes two coppers.' }, finish_reason: 'stop' }] };
    const req = { messages: [{ role: 'system', content: `${REPORT_REQUEST_HEAD}\n\n${ENGINE}` }, { role: 'user', content: "PLAYER'S MESSAGE:\nI buy a fish.\n\nNARRATOR'S REPLY:\nThe fishwife takes two coppers.\n\nWrite the fact report for this reply now: exactly one <avereth>{…}</avereth>, nothing else." }], model: 'glm', stream: false, reasoning_effort: 'low' };
    const answer = { id: 'r1', choices: [{ message: { role: 'assistant', reasoning: 'Coin -2.', content: '<avereth>{"coin":[{"cp":-2,"why":"fish"}]}</avereth>' }, finish_reason: 'stop' }], usage: { prompt_tokens: 900, completion_tokens: 40 } };
    const text = log('request', request('I buy a fish.', false)) + log('response', noReport) + log('request', req) + log('response', answer);
    const chat = [JSON.stringify({ chat_metadata: {} }),
        JSON.stringify({ is_user: true, mes: 'I buy a fish.' }),
        JSON.stringify({ is_user: false, mes: 'The fishwife takes two coppers.', gen_started: '2026-09-24T10:00:00.000Z', gen_finished: '2026-09-24T10:00:20.000Z', extra: { avereth: { recovery: { from: 'no <avereth> report', ms: 8500 } } } }),
    ].join('\n');
    const rows = measure(parseServerLog(text).pairs, { lore: [LORE], gens: chatGenerations(chat) });
    assert.deepEqual(rows.map((r) => r.request), [false, true]);
    assert.equal(rows[0].seconds, 20, 'the narration keeps its own time');
    assert.equal(rows[1].input, 'I buy a fish.');
    assert.equal(rows[1].seconds, 8.5);
    assert.equal(rows[1].parts.engine > 0 && rows[1].parts.history > 0, true);
    assert.equal(v3Columns(rows[1], { turns: new Map([['i buy a fish.', { engine: 1, history: 1 }]]), contract: 1 }), null);
});
