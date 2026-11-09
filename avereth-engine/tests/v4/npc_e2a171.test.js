// NPC E2-A correction (.171; patch_plans_10b/REVIEW_NPC_E2A170_PRODUKTDIFF_GPT.md §3): a presence the quote shows is
// no meeting when the reply goes on to tell that the same person went away before Alaric came: in the same sentence
// ("stood behind the counter and left before Alaric arrived", ", then left …", ", then went home") or in a later one
// marked as before his arrival. A short quote cannot hide what its own sentence and the reply go on to say. A return
// after the departure, someone else leaving, a thing left behind and a later departure stay as they were.
// Real path: User04's player turn I71 (GO to the Guild hall, known_at) with its recorded commands, World with SYNTHETIC met.
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
const meet = (met, prose) => replyTurnV4(structuredClone(p71.state), content,
    { scene: HALL, expected: { 1: { arrived: true, at: HALL, with: null, met } }, deltas: [arrive] }, { prose: `He walked into the Guild hall. ${prose}`, msg: 72 });
const entered = (r, id) => r.events.filter((e) => e.t === 'scene.entered' && e.d.id === id).length;
const none = (r, id, label) => {
    assert.equal(entered(r, id), 0, label);
    assert.equal(r.events.filter((e) => e.t === 'entity.updated' && e.d.id === id).length, 0, `${label}: no new place`);
    assert.equal(r.events.filter((e) => e.t === 'knowledge.gained' && e.d.who === id).length, 0, `${label}: no new knowledge`);
    assert.ok(r.events.some((e) => e.t === 'delta.rejected' && e.d.rule === 'met_evidence' && e.d.item?.met?.who === id), `${label}: met_evidence`);
    assert.ok(!r.state.scene.present.includes(id), label);
};
const SHORT = 'The clerk stood behind the counter';

test('E2-A .171: "stood behind the counter and left / , then left before Alaric arrived" – full quote and short quote bring no one', () => {
    for (const s of ['The clerk stood behind the counter and left before Alaric arrived', 'The clerk stood behind the counter, then left before Alaric arrived']) {
        none(meet([{ who: CLERKS, evidence: s }], `${s}.`), CLERKS, `full: ${s}`);
        none(meet([{ who: CLERKS, evidence: SHORT }], `${s}.`), CLERKS, `short: ${s}`);
    }
});

test('E2-A .171: ", then went home" and a later sentence that she had left before he arrived bring no one either', () => {
    none(meet([{ who: CLERKS, evidence: 'The clerk stood behind the counter, then went home' }], 'The clerk stood behind the counter, then went home.'), CLERKS, 'went home');
    none(meet([{ who: CLERKS, evidence: SHORT }], 'The clerk stood behind the counter. She had left before Alaric arrived.'), CLERKS, 'later sentence');
    none(meet([{ who: CLERKS, evidence: SHORT }], 'The clerk stood behind the counter. The clerk had gone home before Alaric came in.'), CLERKS, 'later sentence, named');
});

test('E2-A .171: a return, someone else leaving, a thing left, a later departure and plain presence still meet', () => {
    for (const [prose, evidence] of [
        ['The clerk stood behind the counter and waved.', 'The clerk stood behind the counter and waved'],
        ['The clerk had left for the archive at noon. When Alaric arrived, the clerk stood behind the counter again.', 'the clerk stood behind the counter again'],
        ['The clerk stood behind the counter, left for a moment and came back before Alaric arrived.', SHORT],
        ['The clerk stood behind the counter and left the ledger open.', SHORT],
        ['The clerk stood behind the counter and nodded to him. Later that evening she went home.', SHORT],
        ['The clerk stood behind the counter while the stocky man with the crossbow left before Alaric arrived.', SHORT],
        ['The long counter at the back had both clerks at work this time.', 'The long counter at the back had both clerks at work this time'],
    ]) {
        const r = meet([{ who: CLERKS, evidence }], prose);
        assert.equal(entered(r, CLERKS), 1, prose);
        const fold = structuredClone(p71.state);
        for (const e of r.events) applyEvent(fold, e);
        assert.deepEqual(fold, r.state, 'the events fold to the same state');
    }
    // the original I72 prose and answer with the met of the crossbowman
    const a = structuredClone(f.extractions['72']); a.expected['1'].met = [{ who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }];
    assert.equal(entered(replyTurnV4(structuredClone(p71.state), content, a, { prose: f.chat[72].mes, msg: 72 }), BOW), 1);
    // and its clerks ("both clerks at work this time") on the original prose
    const b = structuredClone(f.extractions['72']); b.expected['1'].met = [{ who: CLERKS, evidence: 'The long counter at the back had both clerks at work this time' }];
    assert.equal(entered(replyTurnV4(structuredClone(p71.state), content, b, { prose: f.chat[72].mes, msg: 72 }), CLERKS), 1);
});

test('E2-A .171: one leaves before he comes, the other is there: only the one shown enters', () => {
    const r = meet([{ who: CLERKS, evidence: SHORT }, { who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps again' }],
        'The clerk stood behind the counter and left before Alaric arrived. At the benches the stocky man with the crossbow sat over fresh maps again.');
    none(r, CLERKS, 'clerk');
    assert.equal(entered(r, BOW), 1);
    const s = meet([{ who: CLERKS, evidence: SHORT }, { who: BOW, evidence: 'the stocky man with the crossbow sat over fresh maps' }],
        'The clerk stood behind the counter. The stocky man with the crossbow sat over fresh maps and left before Alaric arrived.');
    assert.equal(entered(s, CLERKS), 1, 'the clerk stays met: the departure is the crossbowman\'s');
    none(s, BOW, 'crossbowman');
});
