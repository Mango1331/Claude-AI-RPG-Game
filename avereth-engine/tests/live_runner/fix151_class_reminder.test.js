import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide } from '../../tools/st_live/live/guide.mjs';
import { llmPlayer } from '../../tools/st_live/live/players.mjs';

const guide = loadGuide('current_test');
const view = { messages: [{ system: false, text: 'The clerk nods.', engine: 'POSSIBLE CLASS — Keen Shadow (E). Choose one or postpone (#class).' }], hud: 'Alaric — L15 Rogue', toasts: [] };
const decision = JSON.stringify({ message: '#class', milestone: 'class_accepted', stop: false });
function player(answers, seen, useGuide = guide) {
    return llmPlayer({ guide: useGuide, username: 'Alaric', url: 'https://example.invalid/v1', model: 'stub', backoffMs: 0,
        fetchImpl: async (url, req) => {
            seen.push(JSON.parse(req.body));
            const content = answers.shift();
            return { ok: true, json: async () => ({ choices: [{ message: { content }, finish_reason: content ? 'stop' : 'length' }] }) };
        } });
}
test('151: confirmed class stage overrides old self-notes in full, short and minimal prompts, without selecting a class', async () => {
    const seen = [], p = player(['', '', decision], seen);
    p.notes.push({ turn: 251, milestone: 'open_run_level', message: 'I check the board.' });
    const result = await p.decide(view, { turn: 253, maxTurns: 1000, milestone: 'class_accepted' });
    assert.equal(seen.length, 3);
    for (const request of seen) {
        const prompt = request.messages.at(-1).content;
        assert.match(prompt, /CURRENT GOAL.*Engine.*Level 15/);
        assert.match(prompt, /#class/);
        assert.match(prompt, /choose.*or postpone/i);
        assert.ok(prompt.indexOf('CURRENT GOAL') < prompt.indexOf('NEXT DECISION'));
        assert.doesNotMatch(prompt, /YOUR MILESTONE NOW: open_run_level/);
    }
    assert.equal(result.message, '#class', 'the player retains its own decision');
    assert.equal(view.messages[0].engine.includes('Keen Shadow'), true);
});
test('151: no invented level confirmation from narration, self-notes or guides without a level target', async () => {
    for (const [useGuide, milestone] of [[guide, null], [guide, 'open_run_level'], [{ ...guide, openRun: undefined }, 'class_accepted']]) {
        const seen = [], p = player([decision], seen, useGuide);
        p.notes.push({ turn: 1, milestone: 'class_accepted', message: 'I am level 15.' });
        await p.decide(view, { turn: 2, maxTurns: 1000, milestone });
        assert.equal(seen.length, 1);
        assert.doesNotMatch(seen[0].messages.at(-1).content, /CURRENT GOAL/);
    }
});
