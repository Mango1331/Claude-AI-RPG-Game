import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide, guideErrors } from '../../tools/st_live/live/guide.mjs';
import { evaluate, finished } from '../../tools/st_live/live/evaluator.mjs';
import { options } from '../../tools/st_live/live/run_live.mjs';
import { loadProductContent } from '../helpers.js';
import { campaign } from '../v4/patch8_lib.js';

test('current_test is an open Level-1 campaign without a seeded fixture or forced class/quest', () => {
    const g = loadGuide('current_test');
    assert.deepEqual(guideErrors(g), []);
    assert.equal(g.fixture, undefined);
    assert.equal(g.character, undefined);
    assert.deepEqual(g.milestones.map(m => m.id), ['creation_complete', 'open_run_duration']);
    assert.equal(g.openRun.minTurns, 100);
    assert.ok(g.limits.maxTurns >= g.openRun.minTurns);
    assert.doesNotMatch(g.brief, /one XP before|synthetic fixture data|choose the offensive melee/i);
    assert.match(g.brief, /Guild/);
    assert.match(g.brief, /sleep/);
    assert.match(g.brief, /equipment/);
    assert.equal(options(['--guide','current_test'], {}).fixture, undefined);
    const old = loadGuide('patch9d_fixture');
    assert.equal(old.fixture, '9d-rare', 'original targeted regression guide is retained');
    assert.deepEqual(old.milestones.map(m => m.id), ['class_rank_e','class_offered','class_accepted','class_verified','class_trait_used']);
});

test('open observation window cannot complete at character creation, a quest or 99 player inputs', async () => {
    const c = await loadProductContent();
    const g = await campaign(c, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    const guide = loadGuide('current_test');
    let ev = evaluate(g.chat, { guide });
    assert.equal(ev.reached.creation_complete !== undefined, true);
    assert.equal(finished(ev), false);
    const n = g.chat.filter(m => m.is_user).length;
    assert.ok(n < guide.openRun.minTurns);
    for (let i = n; i < guide.openRun.minTurns - 1; i++) {
        g.chat.push({ mes: 'I continue exploring.', is_user: true, is_system: false, extra: {} });
        g.chat.push({ mes: 'The road continues.', is_user: false, is_system: false, extra: {} });
    }
    ev = evaluate(g.chat, { guide });
    assert.equal(ev.reached.open_run_duration, undefined);
    assert.equal(finished(ev), false);
    g.chat.push({ mes: 'I make my next decision.', is_user: true, is_system: false, extra: {} });
    ev = evaluate(g.chat, { guide });
    assert.equal(ev.reached.open_run_duration.playerTurns, guide.openRun.minTurns);
    assert.equal(finished(ev), true);
});

test('invalid open-run guides cannot set impossible horizons or require fixtures', () => {
    const base = loadGuide('current_test');
    assert.match(guideErrors({ ...base, openRun: { minTurns: 200 } }).join(' '), /exceeds maxTurns/);
    assert.match(guideErrors({ ...base, fixture: '9d-rare' }).join(' '), /cannot require a synthetic fixture/);
    assert.match(guideErrors({ ...base, openRun: { minTurns: 0 } }).join(' '), /positive integer/);
});
