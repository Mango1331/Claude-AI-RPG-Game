// Location architecture .190, stage 4 (docs/LOCATION_ARCHITECTURE_190.md; plan C1-a, C4, C3-a/D3, C5 N1/N4):
//   4A the planner contract for setting off, following and questions (no engine word list, no new command type)
//   4B a move that moves him relative to nobody, or a flight with no fight, gets the planner's one bounded repair
//   4C a step within the same building that his own booked action takes (the room he paid for) needs no GO
//   4D the WHERE / TRAVEL THIS TURN / NOT HERE header at the head of the engine block
//   4E a reply whose arrival was refused carries one engine line in the prompt copy of the history only
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { projectPromptHistory, historyMark, rec } from '../../src/host.js';
import { MECH_RULES } from '../../src/v4/planner.js';
import { campaign, walk, say, sayRepaired, inject, lastUser } from './patch8_lib.js';

const content = await loadProductContent();
const mage = () => campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });

test('.190 4A: the planner contract says when setting off is go and when a question, a proposal or someone else\'s agreement is none', () => {
    const rules = Array.isArray(MECH_RULES) ? MECH_RULES : String(MECH_RULES).split('\n');
    const rule = rules.find((r) => r.startsWith('7d.'));
    assert.ok(rule);
    for (const part of ['"I\'m heading back to the Guild hall"', '"Let\'s go to …"', '"I follow her to the hall" is go there', '"Shall we go ask him now?"', '"whenever she is ready"', 'someone else\'s offer or agreement alone'])
        assert.ok(rule.includes(part), part);
});

test('.190 4B: an ineffective move outside a fight costs one repair at most, never a further model round; a step the scene has costs none', async () => {
    const g = await mage();
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    const calls = [];
    const own = g.llm;
    g.llm = async (req) => { calls.push(req.purpose); return own(req); };
    const { repair } = await sayRepaired(g, '*I back away*', [{ type: 'move', dir: 'away', target: null, quote: 'I back away' }], [{ type: 'move', dir: 'away', target: null, quote: 'I back away' }]);
    assert.ok(repair, 'the one repair');
    assert.deepEqual(lastUser(g).plan.llm.map((c) => c.purpose), ['plan', 'plan_repair'], 'two planner calls, no third');
});

test('.190 4C (D3): the room he paid for this turn is reached without a GO; buying bread opens no back room; another house stays out of reach', async () => {
    const g = await mage();
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await walk(g, { new: 'the Sow\'s Rest' }, { text: '*I go into the Sow\'s Rest*', at: { new: { name: 'the Sow\'s Rest', kind: 'site', parent: 'loc.ashbridge' } }, prose: 'The inn.' });
    const inn = g.state().scene.at;
    const lodged = async (text, at, lodging) => {
        await say(g, text);
        if (lodging) inject(g, [{ t: 'service.granted', d: { service: 'lodging', by: null, at: inn, turn: g.state().turn } }]);
        return g.reply('He goes up.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at, forced_by: null, with: null }] });
    };
    // bread bought: no way into the back room
    let r = await lodged('*I buy a loaf of bread*', { new: { name: 'back room', kind: 'interior', parent: null } }, false);
    assert.equal(g.state().scene.at, inn);
    assert.ok(r.record.rejected.some((x) => x.rule === 'no_go'));
    // the paid room, not a private office of the inn
    r = await lodged('*I take my paid room and go upstairs*', { new: { name: 'private office', kind: 'interior', parent: null } }, true);
    assert.equal(g.state().scene.at, inn, 'no free access to a private area');
    r = await lodged('*I take my paid room and go upstairs*', { new: { name: 'small room upstairs', kind: 'interior', parent: null } }, true);
    assert.equal(g.state().places[g.state().scene.at].name, 'small room upstairs');
    assert.equal(g.state().places[g.state().scene.at].parent, inn);
});

test('.190 4D (N1): after a refused arrival the engine block opens with WHERE, the place not reached and the travel of this turn; a person he speaks of who is elsewhere is NOT HERE; the location sentences are not repeated as corrections', async () => {
    const g = await mage();
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.', deltas: [{ seq: 1, type: 'person.new', ref: 'npc.werrin', name: 'Werrin Hale', role: 'reeve', desc: ['grey-bearded reeve'], armed: null, present: false, relevant: true, threat: false, at: null, band: null }] });
    await say(g, '*I talk to the gatekeeper*');
    await g.reply('He walked on to the smithy by the well.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'the smithy by the well', kind: 'site', parent: 'loc.ashbridge' } }, forced_by: null, with: null }] });
    const r = await say(g, '*I ask Werrin about the road*');
    const text = r.context.text;
    const head = text.indexOf('WHERE — Ashbridge');
    assert.ok(head > 0 && head < text.indexOf('CORRECTIONS') || !text.includes('CORRECTIONS'), 'at the head of the block');
    assert.match(text, /WHERE — Ashbridge[^\n]*The last reply's the smithy by the well was not reached: what it told there did not happen\./);
    assert.match(text, /TRAVEL THIS TURN — none chosen: he stays at Ashbridge unless something in the world moves him\./);
    assert.match(text, /NOT HERE — Werrin Hale[^\n]*: he speaks of them from where he is/);
    assert.doesNotMatch(text, /- Alaric did not voluntarily travel/);
});

test('.190 4E (N4): a reply whose arrival was refused carries one engine line in the prompt copy only; other replies and the saved chat stay as they are', async () => {
    const g = await mage();
    await walk(g, 'loc.ashbridge', { text: '*i walk to ashbridge*', prose: 'Ashbridge.' });
    await say(g, '*I talk to the gatekeeper*');
    await g.reply('He walked on to the smithy by the well.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: { new: { name: 'the smithy by the well', kind: 'site', parent: 'loc.ashbridge' } }, forced_by: null, with: null }] });
    const saved = JSON.stringify(g.chat);
    const copy = structuredClone(g.chat);
    const out = projectPromptHistory(copy, { keepTurns: 0 });
    assert.equal(out.marked, 1);
    assert.match(copy.at(-1).mes, /\[ENGINE: in this reply Alaric did not reach the smithy by the well; he stayed where he was\. What it told there was not booked; everything else stands as the engine booked it\.\]$/);
    assert.equal(JSON.stringify(g.chat), saved, 'the saved chat is untouched');
    assert.equal(historyMark(rec(g.chat.findLast((m) => !m.is_user && rec(m) && !(rec(m).rejected || []).length))), null, 'a reply without a refused arrival carries nothing');
});
