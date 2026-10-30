import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide, guideErrors } from '../../tools/st_live/live/guide.mjs';
import { evaluate, finished } from '../../tools/st_live/live/evaluator.mjs';
import { options, resolveTurnLimit } from '../../tools/st_live/live/run_live.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadProductContent } from '../helpers.js';
import { campaign } from '../v4/patch8_lib.js';

test('current_test is an open Level-1 campaign without a seeded fixture or forced class/quest', () => {
    const g = loadGuide('current_test');
    assert.deepEqual(guideErrors(g), []);
    assert.equal(g.fixture, undefined);
    assert.equal(g.character, undefined);
    assert.deepEqual(g.milestones.map(m => m.id), ['creation_complete', 'open_run_level', 'class_accepted']);
    assert.equal(g.openRun.targetLevel, 15);
    assert.ok(g.limits.maxTurns >= g.openRun.checkpointTurns);
    assert.doesNotMatch(g.brief, /one XP before|synthetic fixture data|choose the offensive melee/i);
    assert.match(g.brief, /Guild/);
    assert.match(g.brief, /sleep/);
    assert.match(g.brief, /equipment/);
    assert.equal(options(['--config','missing','--guide','current_test'], {}).fixture, undefined);
    const old = loadGuide('patch9d_fixture');
    assert.equal(old.fixture, '9d-rare', 'original targeted regression guide is retained');
    assert.deepEqual(old.milestones.map(m => m.id), ['class_rank_e','class_offered','class_accepted','class_verified','class_trait_used']);
});

test('legacy open observation window cannot complete at character creation, a quest or 99 player inputs', async () => {
    const c = await loadProductContent();
    const g = await campaign(c, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    const guide = { ...loadGuide('current_test'), openRun: { minTurns: 100 }, milestones: [{ id: 'creation_complete', goal: 'Create a character' }, { id: 'open_run_duration', goal: 'Observe 100 inputs' }] };
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
    assert.match(guideErrors({ ...base, openRun: { minTurns: 2000 } }).join(' '), /exceeds maxTurns/);
    assert.match(guideErrors({ ...base, fixture: '9d-rare' }).join(' '), /cannot require a synthetic fixture/);
    assert.match(guideErrors({ ...base, openRun: { minTurns: 0 } }).join(' '), /positive integer/);
});

test('legacy live.config.json maxTurns=40 cannot silently truncate the Level-15 current_test', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avereth-open-guide-'));
    const cfg = path.join(dir, 'live.config.json');
    try {
        fs.writeFileSync(cfg, JSON.stringify({ maxTurns: 40 }));
        const local = options(['--config', cfg, '--guide', 'current_test'], {});
        assert.equal(local.maxTurns, 40);
        assert.equal(local.maxTurnsExplicit, false);
        const open = loadGuide('current_test');
        assert.equal(resolveTurnLimit(open, local), 1000, 'open guide keeps its own safe observation horizon');
        const legacy = loadGuide('guild_dungeon_loop');
        assert.equal(resolveTurnLimit(legacy, local), 40, 'other guides retain their configured limits');
        const explicit = options(['--config', cfg, '--guide', 'current_test', '--max-turns', '120'], {});
        assert.equal(explicit.maxTurnsExplicit, true);
        assert.equal(resolveTurnLimit(loadGuide('current_test'), explicit), 120);
        const tooShort = options(['--config', cfg, '--guide', 'current_test', '--max-turns', '99'], {});
        const durationGuide = { ...loadGuide('current_test'), openRun: { minTurns: 100 } };
        assert.throws(() => resolveTurnLimit(durationGuide, tooShort), /at least 100 turns/);
        assert.equal(resolveTurnLimit(loadGuide('current_test'), tooShort), 99, 'an explicit safety cap need not reach the comparison checkpoint');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
