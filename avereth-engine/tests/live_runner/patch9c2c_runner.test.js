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

// 4.3.0-c.6.6.50 (review of 9C-2c): the guide's Ordinary path is bound to its quality and its training evidence, and a
// run is done only after #status, #passives and #skill Arcane Bolt were asked and answered once the Passive was his
test('.50 runner: a Rare Passive does not pass the Ordinary milestones; the run is not finished before the checks are answered', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const { loadProductContent, ROOT } = await import('../helpers.js');
    const { campaign, say, inject } = await import('../v4/patch8_lib.js');
    const { engineEvidence, passiveOffers } = await import('../../src/v4/passive_growth.js');
    const { evaluate, finished } = await import('../../tools/st_live/live/evaluator.mjs');
    const content = await loadProductContent();
    const guide = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/st_live/live/guides/current_test.json'), 'utf8'));
    assert.deepEqual(guide.milestones.filter((m) => m.required !== false).map((m) => m.id), ['creation_complete', 'ordinary_passive_offered', 'ordinary_passive_gained', 'passive_verified']);
    const rest = { type: 'activity', kind: 'rest', what: null, minutes: 10, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, quote: 'i rest for ten minutes' };
    const hero = async () => {
        const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
        const base = g.llm;
        g.llm = async (q) => (q.purpose.startsWith('forge') ? 'not json' : base(q));
        return g;
    };
    const milestones = (g) => Object.fromEntries(evaluate(g.chat, { guide }).milestones.map((m) => [m.id, m.reached]));
    // a Rare Passive offered and gained: the Ordinary milestones stay open, the run goes on
    const r = await hero();
    inject(r, engineEvidence(r.state(), content, { key: 'test.runner_rare', quality: 'rare', why: 'a test', effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 4 }] }).events);
    await say(r, '*i rest for ten minutes*', rest);
    await r.reply('He rests.', { expected: {}, deltas: [] });
    await say(r, 'I accept it.', { type: 'passive.accept', offer: passiveOffers(r.state())[0].id, replace: null, quote: 'I accept it' });
    assert.deepEqual(milestones(r), { creation_complete: true, ordinary_passive_offered: false, ordinary_passive_gained: false, passive_verified: false, rare_passive_offered: true });
    assert.equal(finished(evaluate(r.chat, { guide })), false);
    // the Ordinary Passive of his training: offered, gained, then not done until all three checks were answered
    const g = await hero();
    inject(g, [{ t: 'growth.evidence', d: { evidence: { key: 'train:learn.1', kind: 'training', quality: 'ordinary', focus: 'INT', goal: 'learn.1', why: 'long practice of his mind', turn: 1, minute: 0 } } }]);
    await say(g, '*i rest for ten minutes*', rest);
    await g.reply('He rests.', { expected: {}, deltas: [] });
    assert.equal(milestones(g).ordinary_passive_offered, true);
    await say(g, 'I accept it.', { type: 'passive.accept', offer: passiveOffers(g.state())[0].id, replace: null, quote: 'I accept it' });
    await g.reply('It settles.', { expected: {}, deltas: [] });
    assert.deepEqual([milestones(g).ordinary_passive_gained, milestones(g).passive_verified, finished(evaluate(g.chat, { guide }))], [true, false, false]);
    await say(g, '#status');
    await say(g, '#passives');
    assert.equal(finished(evaluate(g.chat, { guide })), false, 'two of three checks');
    await say(g, '#skill Arcane Bolt');
    assert.equal(milestones(g).passive_verified, true);
    assert.equal(finished(evaluate(g.chat, { guide })), true);
});
