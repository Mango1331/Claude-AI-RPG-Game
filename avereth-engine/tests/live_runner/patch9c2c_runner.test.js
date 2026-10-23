// Patch 9C-2c: the run's call table counts the Forge as its own role (it shares the planner's 900-token limit and was
// counted as a planner call in the .45 and .48 live runs), its repair as forge_repair.
import test from 'node:test';
import assert from 'node:assert/strict';
import { roleOf, callStats } from '../../tools/st_live/live/calls.mjs';
import { forgeRequest, passiveForgeRequest } from '../../src/v4/forge.js';

test('9C-2c runner: a Forge call is forge, its repair forge_repair, never plan; the planner stays plan', () => {
    const drafts = [{ key: 'learn.1', def: { id: 'dyn.ember_bolt', name: 'Ember Bolt' } }];
    const skill = { messages: forgeRequest(drafts), max_tokens: 900 };
    const passive = { messages: passiveForgeRequest(drafts), max_tokens: 900 };
    const repair = { messages: [...forgeRequest(drafts), { role: 'assistant', content: '{}' }, { role: 'user', content: 'Repair only these entries.' }], max_tokens: 900 };
    assert.equal(roleOf(skill), 'forge');
    assert.equal(roleOf(passive), 'forge');
    assert.equal(roleOf(repair), 'forge_repair');
    assert.equal(roleOf({ messages: [{ role: 'system', content: 'You are the intent planner of a text RPG.' }], max_tokens: 900 }), 'plan');
    assert.equal(roleOf({ messages: [{ role: 'system', content: 'Something else.' }], max_tokens: 900 }), 'plan', 'an unknown prompt of that limit is still taken for the planner');
    const stats = callStats([{ role: 'forge', ms: 1200, repair: false }, { role: 'forge_repair', ms: 800, repair: true }, { role: 'plan', ms: 2000, repair: false }]);
    assert.ok(stats && JSON.stringify(stats).includes('forge'));
});

test('9C-2c runner: the evaluator sees a Passive offered, a rare one, and one gained (from the engine\'s events)', async () => {
    const { loadProductContent } = await import('../helpers.js');
    const { campaign, say, inject } = await import('../v4/patch8_lib.js');
    const { engineEvidence, passiveOffers } = await import('../../src/v4/passive_growth.js');
    const { evaluate } = await import('../../tools/st_live/live/evaluator.mjs');
    const content = await loadProductContent();
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const base = g.llm;
    g.llm = async (q) => (q.purpose.startsWith('forge') ? 'not json' : base(q));
    inject(g, engineEvidence(g.state(), content, { key: 'test.runner', quality: 'rare', why: 'a test', effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 4 }] }).events);
    await say(g, '*i rest for ten minutes*', { type: 'activity', kind: 'rest', what: null, minutes: 10, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, quote: 'i rest for ten minutes' });
    await g.reply('He rests.', { expected: {}, deltas: [] });
    const guide = { milestones: [{ id: 'passive_offered' }, { id: 'rare_passive_offered' }, { id: 'passive_gained' }] };
    const offered = evaluate(g.chat, { guide });
    assert.deepEqual(offered.milestones.map((m) => [m.id, m.reached]), [['passive_offered', true], ['rare_passive_offered', true], ['passive_gained', false]]);
    assert.equal(offered.reached.passive_offered.quality, 'rare');
    await say(g, 'I accept it.', { type: 'passive.accept', offer: passiveOffers(g.state())[0].id, replace: null, quote: 'I accept it' });
    const gained = evaluate(g.chat, { guide });
    assert.equal(gained.milestones.find((m) => m.id === 'passive_gained').reached, true);
});
