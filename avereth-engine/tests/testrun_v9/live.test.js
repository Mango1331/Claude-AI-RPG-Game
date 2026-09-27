// Live run 27.09.2026 01:19 (docs/TESTRUN_V9.md), build 3.1.1: in the granary cellar the narrator brought the rats in as
// scenery, as two creatures named like groups ("cellar rats", then "cellar rats (dark)"), and a reply later had both
// attack while it told of "a dozen at least". The engine took them for two known opponents: two single rats of 16 HP
// ("Cellar Rats", "Cellar Rats (dark)"). The run on 3.1.1 replays byte for byte from this fixture (the chat JSONL, the
// narrator replies with their reports and the report-request answer from the Chat Completion log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer, ATTACKERS_REQUEST_HEAD } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { worldRows } from '../../src/hud.js';
import { parseSwaps, hash32, ENGINE_VERSION } from '../../src/util.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v9/fixture.json');
const swaps = parseSwaps(fx.swaps);

// the answer to the attackers request as the request asks for it: the rats the reply shows one by one (the one on the
// sack, the two in the walkway). Synthetic: the run had no such request.
const RATS = '<avereth>{"new":[{"ref":"rat_sack","kind":"creature","species":"rat","desc":["cellar rat"],"band":"ENGAGED"},{"ref":"rat_walk_1","kind":"creature","species":"rat","desc":["cellar rat"],"band":"ENGAGED"},{"ref":"rat_walk_2","kind":"creature","species":"rat","desc":["cellar rat"],"band":"SHORT"}],"combat":{"by":["rat_sack","rat_walk_1","rat_walk_2"]}}</avereth>';

const ai = (mes, extra = {}) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra });
const say = (chat, mes) => {
    chat.push({ is_user: true, is_system: false, mes, extra: {} });
    const gen = prepareGeneration(chat, content, { type: 'normal', settings: { engineLore: false } });
    if (gen.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
    return gen;
};

/** The run as the extension plays it; the reply that has the rats attack gets `answer` for its attackers request. */
function replay(answer) {
    const chat = [];
    const at = {};
    for (const m of fx.chat) {
        if (m.greeting) chat.push(ai(m.mes, { avereth: { v: 2, events: m.events, text_hash: hash32(m.mes) } }));
        else if (m.system) chat.push({ is_user: false, is_system: true, mes: m.mes, extra: {} });
        else if (m.user) at[m.i] = { gen: say(chat, m.mes), state: foldChat(chat).state };
        else {
            chat.push(ai(m.reply));
            const id = chat.length - 1;
            const got = processReply(chat, id, content, { swaps, recover: true });
            const first = { ...chat[id].extra.avereth };
            const request = got.recover ? reportRequest(chat, id, content) : null;
            if (got.recover) applyReportAnswer(chat, id, content, m.answer ?? (m.i === 22 ? answer : null), { hash: request.hash, ms: m.ms ?? 5000 });
            at[m.i] = { rec: chat[id].extra.avereth, first, request, panel: chat[id].extra.avereth.panel || '', state: foldChat(chat).state };
        }
    }
    return { chat, at };
}

const run = replay(RATS);
const failed = replay(null);
const foes = (state) => Object.values(state.encounter?.combatants || {}).filter((c) => c.id !== 'pc').map((c) => [c.id, c.label, c.fixed.max_hp]);

test('the run replays on this build: the rats come in as scenery, two creatures named like groups', () => {
    assert.deepEqual(foldChat(run.chat).errors, []);
    assert.deepEqual(validateState(run.at[22].state, content), []);
    for (const m of run.chat.slice(1)) if (m.extra?.avereth) assert.equal(m.extra.avereth.build, ENGINE_VERSION);
    assert.ok(run.at[18].rec.accepted.includes('new creature cellar rats (mon.cellar_rats)'));
    assert.ok(run.at[20].rec.accepted.includes('new creature cellar rats (dark) (mon.cellar_rats_dark)'));
    assert.equal(Object.fromEntries(worldRows(run.at[20].state, content)).Present, 'cellar rats (ENGAGED) · cellar rats (dark) (SHORT)');
    // the run (3.1.1): both attacked as one rat of 16 HP each
    assert.deepEqual(fx.recorded.accepted22.slice(-2), ['combat committed by mon.cellar_rats (pending)', 'combat committed by mon.cellar_rats_dark (pending)']);
    assert.match(fx.recorded.panel22, /^`COMBAT START — Cellar Rats, Cellar Rats \(dark\) attack Alaric`/);
});

test('both groups attack: never one combatant each; the engine asks for their animals, the reply says so meanwhile', () => {
    const first = run.at[22].first;
    assert.equal(first.recovery, 'pending');
    assert.deepEqual(first.attackers, [{ by: 'cellar rats', ref: null, group: 'mon.cellar_rats' }, { by: 'cellar rats (dark)', ref: null, group: 'mon.cellar_rats_dark' }]);
    assert.deepEqual(first.rejected.map((r) => r.reason), ['cellar rats', 'cellar rats (dark)'].map((g) => `combat.by "${g}" is a group: introduce each attacker as its own "new" entry (one per individual creature or person) and name their refs in "combat"`));
    assert.ok(first.accepted.includes('time +1 min'), 'the rest of the report stands');
    assert.ok(!first.events.some((e) => e.t === 'encounter.started' || e.t === 'combat.pending'), 'no fight with a rat of 16 HP for a dozen');
    assert.match(first.panel, /^`ATTACKERS NOT IDENTIFIED YET — "cellar rats", "cellar rats \(dark\)": asking for them separately/);
    // the request: the bookkeeper, not the narrator; it says the game lists each group as one creature
    const req = run.at[22].request;
    assert.ok(req.systemPrompt.startsWith(ATTACKERS_REQUEST_HEAD));
    assert.match(req.prompt, /Its "combat" named: "cellar rats" \(a group the game state lists as one creature: its animals are the attackers, each a "new" entry\), "cellar rats \(dark\)" \(a group/);
    assert.match(req.prompt, /A dozen at least now in the lantern's reach/);
});

test('with the answer: Cellar Rat A, B and C fight, each its own rat; the groups leave the scene; their Turns before Alaric\'s come at once', () => {
    const s = run.at[22].state;
    assert.deepEqual(foes(s), [['mon.rat_sack', 'Cellar Rat A', 16], ['mon.rat_walk_1', 'Cellar Rat B', 16], ['mon.rat_walk_2', 'Cellar Rat C', 16]]);
    assert.ok(!s.scene.present.includes('mon.cellar_rats') && !s.scene.present.includes('mon.cellar_rats_dark'), 'the groups are their animals now');
    assert.deepEqual(run.at[22].rec.recovery, { from: 'attackers', ms: 5000 });
    assert.ok(run.at[22].rec.accepted.includes('leave mon.cellar_rats') && run.at[22].rec.accepted.includes('leave mon.cellar_rats_dark'));
    assert.deepEqual(run.at[22].rec.rejected, []);
    assert.deepEqual([s.encounter.round, s.encounter.current], [1, 'pc']);
    assert.match(run.at[22].panel, /^`COMBAT START — Cellar Rat A, Cellar Rat B, Cellar Rat C attack Alaric`\n`Initiative: [^\n]*\n`— Round 1 —`\n/);
    assert.match(run.at[22].panel, /`COMBAT TARGETS — Cellar Rat A \[\w+\] · Cellar Rat B \[\w+\] · Cellar Rat C \[\w+\]`/);
    assert.match(run.at[22].panel, /`ATTACKERS IDENTIFIED: a separate request named them \(5\.0 s\)\.`$/);
    assert.doesNotMatch(Object.fromEntries(worldRows(s, content)).Present, /cellar rats/);
});

test('the request brings nothing: no fight, the groups stay scenery; Alaric attacking a group gets no rat of 16 HP either', () => {
    const s = failed.at[22].state;
    assert.equal(s.encounter, null);
    assert.deepEqual(failed.at[22].rec.recovery, { from: 'attackers', failed: 'no answer', ms: 5000 });
    assert.match(failed.at[22].panel, /^`ATTACKERS NOT IDENTIFIED — "cellar rats", "cellar rats \(dark\)", and the separate request named none \(5\.0 s\): they are not in the fight\./);
    assert.ok(s.scene.present.includes('mon.cellar_rats'));
    // his own attack on the group: nothing spent or rolled, no fight; the story is asked to show its animals
    const c = failed.chat.slice();
    const gen = say(c, '*I Heavy Slash the cellar rats*');
    const after = foldChat(c).state;
    assert.equal(after.encounter, null);
    assert.deepEqual([after.last.outcome.kind, after.rng.n], ['note', s.rng.n]);
    assert.match(gen.context.text, /Alaric attacks cellar rats, a group the game holds as one creature: nothing was spent or rolled\. Show its animals: each one that fights as its own "new" entry, their refs in "combat"\./);
});
