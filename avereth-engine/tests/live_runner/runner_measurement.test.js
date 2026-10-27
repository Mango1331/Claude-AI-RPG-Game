import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { Driver } from '../../tools/st_live/live/driver.mjs';
import { screenText, playerSystemPrompt } from '../../tools/st_live/live/players.mjs';
import { recoveryObservation, recoverySummary, evaluate } from '../../tools/st_live/live/evaluator.mjs';
import * as report from '../../tools/st_live/live/report.mjs';
import { runBatch } from '../../tools/st_live/live/batch.mjs';
import { SCENARIOS } from '../../tools/st_live/live/scenarios.mjs';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { setRec } from '../../src/host.js';
import { hash32 } from '../../src/util.js';
import { loadProductContent } from '../helpers.js';
import { campaign } from '../v4/patch8_lib.js';

test('Driver.send waits for a pending chat save across an otherwise idle recovery gap', async () => {
    const page = new EventEmitter();
    const request = { method: () => 'POST', url: () => 'http://localhost/api/chats/save' };
    const driver = new Driver(page, { quietMs: 20, turnTimeoutMs: 2000 });
    let sent = false, settled = false;
    driver.probe = async () => ({ busy: false, online: true, chatId: 'test', len: sent ? 2 : 0, lastUser: 0, extraction: 'applied' });
    page.evaluate = async () => { sent = true; page.emit('request', request); };
    page.waitForFunction = async () => true;
    page.waitForTimeout = async () => {};
    const done = driver.send('I travel.').then(r => { settled = true; return r; });
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(settled, false, 'a visible answer alone does not finish a pending save');
    page.emit('requestfinished', request);
    assert.equal((await done).ok, true);
});

test('visible Engine panels retain their message order and independent text budget', () => {
    const view = { messages: [
        { user: true, text: 'I offer two pelts.' },
        { user: false, text: 'First story.', engine: 'BID — 7 copper' },
        { user: true, text: 'I accept.' },
        { user: false, text: 'x'.repeat(4100), engine: 'SOLD — 7 copper' },
    ], hud: 'Coin: 7', toasts: [] };
    const before = structuredClone(view), text = screenText(view);
    assert.match(text, /\[ENGINE RESULT\]\nBID — 7 copper\n\n\[NARRATOR\]\nFirst story/);
    assert.ok(text.indexOf('First story') < text.indexOf('SOLD — 7 copper'));
    assert.ok(text.indexOf('SOLD — 7 copper') < text.indexOf('x'.repeat(100)));
    assert.equal(text.split('BID — 7 copper').length, 2);
    assert.deepEqual(view, before);
    assert.match(screenText({ messages: [{ user: false, system: true, text: 'STATUS' }] }), /\[SYSTEM\]\nSTATUS/);
});

function recoveryChat({ text = 'Recovered story.', status = 'applied', attempts = 1, reply = true } = {}) {
    const chat = [{ is_user: true, mes: 'I travel.' }];
    setRec(chat[0], { events: [], narrator_recovery: { attempts } });
    if (reply) {
        chat.push({ is_user: false, mes: text });
        setRec(chat[1], { events: [], narration: { empty: !text.trim() }, extraction: { status } });
    }
    return chat;
}
for (const [name, options, expected] of [
    ['applied story', {}, { markedAttempts: 1, story: 'present', extraction: 'applied' }],
    ['second empty reply', { text: '', status: 'skipped' }, { markedAttempts: 1, story: 'empty', extraction: 'skipped' }],
    ['uncompleted extraction', { status: 'pending' }, { markedAttempts: 1, story: 'present', extraction: 'pending' }],
    ['marker without reply', { reply: false }, { markedAttempts: 1, story: 'missing', extraction: null }],
]) test(`narrator recovery distinguishes ${name} without asserting a provider call`, () => {
    const chat = recoveryChat(options);
    assert.deepEqual(recoveryObservation(chat, 0).narrator, expected);
    const got = recoverySummary(chat).narrator;
    assert.equal(got.markedAttempts, 1);
    assert.equal(got.applied, expected.story === 'present' && expected.extraction === 'applied' ? 1 : 0);
    assert.deepEqual(recoverySummary(JSON.parse(JSON.stringify(chat))), recoverySummary(chat));
});

test('old records without a recovery marker do not acquire an invented attempt', () => {
    const chat = [{ is_user: true, mes: '#status' }, { is_system: true, mes: 'STATUS' }];
    assert.equal(recoveryObservation(chat, 0).narrator, null);
    assert.equal(recoverySummary(chat).narrator.markedAttempts, 0);
});

test('player JSON example is concrete while mechanics remain natural and freely chosen', () => {
    const text = playerSystemPrompt(loadGuide('current_test'), { username: 'Alaric' });
    assert.match(text, /entire response is one JSON object/i);
    assert.match(text, /Only the value of "message" is sent to the game/);
    const example = text.split('\n').find(x => x.startsWith('{"message"'));
    assert.ok(JSON.parse(example).message);
    assert.ok(!example.includes('<your'));
    assert.ok(text.length < 8500, 'do not grow another long manual');
});

test('batch alternates focus while retaining the canonical seed for each scenario', async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-runner-measure-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const arg = (args, key) => args[args.indexOf(key) + 1];
    const r = await runBatch({ root: path.join(root, 'batch'), seed: 40 }, { revision: () => 'fixed', launch: async args => {
        const scenario = SCENARIOS.find(s => s.id === arg(args, '--scenario'));
        const dir = path.join(arg(args, '--runs'), 'run'); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'run.json'), JSON.stringify({ scenario, seed: Number(arg(args, '--seed')), end: { kind: 'limit' }, turns: [] }));
        fs.writeFileSync(path.join(dir, 'evaluation.json'), JSON.stringify({ character: { class: scenario.baseClass.toLowerCase() } }));
        return { code: 2 };
    } });
    assert.deepEqual(r.runs.map(x => x.id), ['guild-warrior', 'explore-warrior', 'guild-mage', 'explore-mage', 'guild-rogue', 'explore-rogue']);
    assert.deepEqual(r.runs.map(x => x.seed), [40, 43, 41, 44, 42, 45]);
});

test('coverage counts committed visits, sales and growth rather than narrative or other income', async () => {
    const g = await campaign(await loadProductContent());
    const events = [
        { t: 'scene.moved', d: { at: 'loc.alderwatch', location: 'Alderwatch', place: 'Guild hall' } },
        { t: 'scene.moved', d: { at: 'loc.alderwatch', location: 'Alderwatch', place: 'Guild hall' } },
        { t: 'coin.changed', d: { id: 'pc', delta: 40, why: 'quest payout' } },
        { t: 'coin.changed', d: { id: 'pc', delta: 30, why: 'gift' } },
        { t: 'transaction.completed', d: { to: 'pc', from: 'guild', cp: 40, for: 'A contract' } },
        { t: 'transaction.completed', d: { to: 'pc', from: 'npc.friend', cp: 30, gift: { id: 'gift.1' } } },
        { t: 'transaction.completed', d: { to: 'pc', from: 'npc.employer', cp: 10, job: 'quest.old_job' } },
        { t: 'transaction.completed', d: { to: 'pc', from: 'npc.buyer', cp: 7, for: 'two pelts', at: 'loc.alderwatch' } },
        { t: 'transaction.completed', d: { seller: 'npc.buyer', cp: 5, lines: ['bread'] } },
        { t: 'item.equipped', d: { id: 'pc', slot: 'body', item: 'travel_clothes' } },
        { t: 'skill.progress', d: { id: 'pc', skill: 'mage.flame_lance', from: { prof: 1, pp: 0 }, to: { prof: 2, pp: 0 } } },
    ];
    const mes = 'He arrives, sells the pelts and changes equipment.';
    g.chat.push({ is_user: false, mes });
    setRec(g.chat.at(-1), { text_hash: hash32(mes), events });
    const ev = evaluate(g.chat), coverage = ev.coverage;
    assert.equal(coverage.visitedPlaces.length, 1);
    assert.equal(coverage.sales.length, 1);
    assert.equal(coverage.sales[0].cp, 7);
    assert.equal(coverage.equipmentChanges.length, 1);
    assert.equal(coverage.skillChanges.length, 1);
    assert.equal(coverage.skillChanges[0].kind, 'proficiency');
    assert.deepEqual(evaluate(JSON.parse(JSON.stringify(g.chat))).coverage, coverage);
    // An alternate reply with a mismatched record must not contribute coverage.
    const last = g.chat.at(-1); last.extra.avereth.text_hash = 'obsolete';
    last.mes = 'The narrator claims another sale and visit.';
    assert.equal(evaluate(g.chat).coverage.sales.length, 0);
});

test('player-output statistics separate first answers, extra calls and exhausted decisions', () => {
    assert.equal(typeof report.playerOutputStats, 'function');
    const rows = [
        { turn: 1, attempt: 0, cause: 'invalid_json' },
        { turn: 1, attempt: 1, cause: null, decision: { message: 'I go.' } },
        { turn: 2, attempt: 0, cause: null, decision: { message: 'I rest.' } },
        ...[0, 1, 2].map(attempt => ({ turn: 3, attempt, cause: 'invalid_json' })),
    ];
    assert.deepEqual(report.playerOutputStats(rows), { firstAnswers: 3, invalidFirst: 2, extraCalls: 3, failedDecisions: 1 });
    assert.deepEqual(report.playerOutputStats([]), { firstAnswers: 0, invalidFirst: 0, extraCalls: 0, failedDecisions: 0 });
});
