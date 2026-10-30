import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { defeatXp, questXp, awardXp } from '../../src/progression.js';
const content = await loadProductContent();

test('10B XP: combat rewards use factor five across rank and target-type multipliers', () => {
    for (const rank of ['F', 'E', 'D']) for (const type of ['normal', 'elite', 'boss']) {
        const before = { ...content, rules: { ...content.rules, xp: { ...content.rules.xp, reward_multiplier: 1 } } };
        assert.equal(defeatXp(3, type, rank, content, 1.25), 5 * defeatXp(3, type, rank, before, 1.25));
    }
});
test('10B XP: quest rewards use factor five after rounding, including 23 becoming 115', () => {
    assert.equal(questXp(1, 'minor', content), 115);
    assert.equal(questXp(1, 'standard', content), 150);
});
test('10B XP: Run 6 rewards yield Level 3 with 90 carryover, without multiplying at award time', () => {
    const total = 4 * defeatXp(1, 'normal', 'F', content) + questXp(1, 'standard', content);
    assert.equal(total, 390);
    const events = awardXp({ level: 1, xp: 0, class: 'mage' }, total, content, 'Run 6 rewards');
    assert.equal(events[0].d.amount, 390);
    assert.equal(events[1].d.level, 2);
    assert.equal(events[1].d.xp_after, 290);
    assert.equal(events[2].d.level, 3);
    assert.equal(events[2].d.xp_after, 90);
});
