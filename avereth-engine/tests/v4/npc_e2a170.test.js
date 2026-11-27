// NPC E2-A correction (.170; patch_plans_10b/REVIEW_NPC_E2A169_PRODUKTDIFF_GPT.md §2): a met needs a quote that shows
// the person themselves here now. Naming them (the one clerk of the hall) is necessary, never enough: a departure that
// already happened, another place, a look back or an expectation brings no one. Real path: User04's player turn I71
// (GO to the Guild hall, its known_at) again with its recorded commands, the reply's World with SYNTHETIC met answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent } from '../helpers.js';
import { foldChat, rec } from '../../src/host.js';
import { playerTurnV4, replyTurnV4 } from '../../src/v4/turn.js';
import { applyEvent } from '../../src/state.js';

const content = await loadProductContent();
const f = JSON.parse(zlib.gunzipSync(fs.readFileSync(new URL('./fixtures/user04_qol159.json.gz', import.meta.url))));
const before = (i) => foldChat(structuredClone(f.chat), i).state;
const cmds = (i) => rec(f.chat[i]).events.find((e) => e.t === 'cmd.interpreted').d.commands;
const HALL = 'loc.alderwatch.guild_hall', CLERKS = 'npc.npcguild_clerks', BOW = 'npc.npcbench_crossbowman';
const p71 = playerTurnV4(before(71), content, f.chat[71].mes, { msg: 71, c: true, commands: cmds(71), board: f.board });
const arrive = { scene: null, seq: 1, type: 'arrive', at: HALL, forced_by: null, with: null };
const meet = (who, evidence, prose) => replyTurnV4(structuredClone(p71.state), content,
    { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who, evidence }] } }, deltas: [arrive] }, { prose: `He walked into the Guild hall. ${prose}`, msg: 72 });
const entered = (r, id) => r.events.filter((e) => e.t === 'scene.entered' && e.d.id === id).length;
const ruled = (r, rule) => r.events.filter((e) => e.t === 'delta.rejected' && e.d.rule === rule).length;
const claimed = (r, id, label) => {
    assert.equal(entered(r, id), 1, label);
    assert.ok(r.state.scene.present.includes(id), label);
};

test('E2-A .170: "The clerk had left the Guild hall before Alaric arrived" cannot disprove a legacy explicit presence claim', () => {
    const r = meet(CLERKS, 'The clerk had left the Guild hall before Alaric arrived', 'The clerk had left the Guild hall before Alaric arrived.');
    claimed(r, CLERKS);
});

test('E2-A .170: a departure that happened, another place, a look back, an expectation or a search leave explicit presence claims intact', () => {
    for (const s of [
        'The clerk departed at dawn',
        'The clerk went home an hour before Alaric came',
        'The clerk left the hall as Alaric came in',
        'The clerk had gone back to the archive long before',
        'The clerk was working in the other town',
        'The clerk was drinking at the Drowned Oar that evening',
        'Yesterday the clerk sat behind the counter',
        'Earlier the clerk had stood behind the counter',
        'He looked for the clerk at the counter',
        'He expected the clerk at the counter',
    ]) claimed(meet(CLERKS, s, `${s}.`), CLERKS);
});

test('E2-A .170: actual presence here still meets – the clerk at the counter, both clerks at work, the crossbowman at his maps', () => {
    for (const [who, s] of [
        [CLERKS, 'The clerk stood behind the counter and waved'],
        [CLERKS, 'The long counter at the back had both clerks at work this time'],
        [BOW, 'the stocky man with the crossbow sat over fresh maps again'],
        [CLERKS, 'The clerk was sorting slips behind the long counter'],
        [CLERKS, 'He saw the clerk at the long counter'],
    ]) {
        const r = meet(who, s, `${s}.`);
        assert.equal(entered(r, who), 1, s);
        assert.ok(r.state.scene.present.includes(who), s);
        const fold = structuredClone(p71.state);
        for (const e of r.events) applyEvent(fold, e);
        assert.deepEqual(fold, r.state, 'the events fold to the same state');
    }
    // the original I72 answer with the met of the crossbowman, on the original prose
    const a = structuredClone(f.extractions['72']); a.expected['1'].met = [{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }];
    const r = replyTurnV4(structuredClone(p71.state), content, a, { prose: f.chat[72].mes, msg: 72 });
    assert.equal(entered(r, BOW), 1);
});

test('E2-A .170: an identified claimant remains distinct from a second clerk', () => {
    // two people of one role: "the clerk" names neither
    const s = before(71);
    s.entities[CLERKS].traits = 'grey-haired woman with spectacles at the long counter'; s.entities[CLERKS].descriptors = ['clerk', 'grey-haired woman with spectacles', CLERKS];
    s.entities['npc.second_clerk'] = { ...structuredClone(s.entities[CLERKS]), id: 'npc.second_clerk', traits: 'older man with ink-stained fingers', descriptors: ['clerk', 'older man with ink-stained fingers', 'npc.second_clerk'] };
    const p = playerTurnV4(s, content, f.chat[71].mes, { msg: 71, c: true, commands: cmds(71), board: f.board });
    assert.ok(p.state.last.outcome.known_at['1'].includes('npc.second_clerk'));
    const r = replyTurnV4(structuredClone(p.state), content, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [{ who: CLERKS, evidence: 'The clerk stood behind the counter and waved' }] } }, deltas: [arrive] },
        { prose: 'He walked into the Guild hall. The clerk stood behind the counter and waved.', msg: 72 });
    assert.equal(entered(r, CLERKS), 1);
    // one left, the other is there
    const both = replyTurnV4(structuredClone(p.state), content, { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met: [
        { who: CLERKS, evidence: 'The grey-haired clerk had left before Alaric arrived' }, { who: 'npc.second_clerk', evidence: 'the older clerk stood behind the counter' }] } }, deltas: [arrive] },
        { prose: 'He walked into the Guild hall. The grey-haired clerk had left before Alaric arrived; the older clerk stood behind the counter.', msg: 72 });
    assert.equal(entered(both, CLERKS), 1);
    assert.equal(entered(both, 'npc.second_clerk'), 1);
});
