// Live run 25.09.2026 01:31 (docs/TESTRUN_V7.md): GLM-5.3-Flash with the Avereth Narrator preset. In the ratcatcher's
// cellar the narrator told of the rats breaking from the wall ("The first rat clears the hole … Two more pour out behind
// it") and reported them only as {"combat":{"by":"rat pack — first rat charging toward the stairs, two more bolting
// along the walls, more following from the wall gaps"}}, without "new". The engine refused the entry, the rest of the
// report stood, and the rats never existed: "*i dash at the first one and basic attack it*" then asked "which target?
// Brede or Osney", the merchant and the ratcatcher standing by, and went to the narrator as a story turn.
// fixture.json: the chat up to that reply as recorded (text and events), the reply, the player's next message.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer, ATTACKERS_REQUEST_HEAD } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { hash32 } from '../../src/util.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v7/fixture.json');

// The answer to the attackers request as the request asks for it: one "new" entry per rat the reply shows (the first
// one and the two behind it; "more following" are not there yet), their refs in "combat". Synthetic: the run had no
// such request.
const ANSWER = '<avereth>{"new":[{"ref":"rat_a","kind":"creature","species":"rat","band":"ENGAGED"},{"ref":"rat_b","kind":"creature","species":"rat","band":"SHORT"},{"ref":"rat_c","kind":"creature","species":"rat","band":"SHORT"}],"combat":{"by":["rat_a","rat_b","rat_c"]}}</avereth>';

const ai = (mes, events = null) => ({
    is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }],
    extra: events ? { avereth: { v: 2, events, text_hash: hash32(mes) } } : {},
});
const user = (mes, events = null) => ({ is_user: true, is_system: false, mes, extra: events ? { avereth: { v: 2, events, input_hash: hash32(mes) } } : {} });

/**
 * The recorded chat before the rat reply, then the reply as the extension handles it: processed, its attackers asked
 * for separately and the answer applied (answer null: the request brought nothing), then the player's next message.
 */
function replay(answer) {
    const chat = fx.chat.map((m) => ({ ...(m.user ? user(m.mes, m.events) : ai(m.mes, m.events)), is_system: m.system }));
    const before = foldChat(chat).state;
    chat.push(ai(fx.rat_reply));
    const ratId = chat.length - 1;
    const got = processReply(chat, ratId, content, { recover: true });
    const first = { rec: { ...chat[ratId].extra.avereth }, panel: chat[ratId].extra.avereth.panel || '', state: foldChat(chat).state };
    const request = reportRequest(chat, ratId, content);
    applyReportAnswer(chat, ratId, content, answer, { hash: request.hash, ms: 12000 });
    chat.push(user(fx.dash));
    const dash = prepareGeneration(chat, content, { type: 'normal' });
    if (dash.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
    return { chat, before, recover: got.recover, first, request, rat: chat[ratId].extra.avereth, ratText: chat[ratId].extra.display_text, dash };
}

const run = replay(ANSWER);
const failed = replay(null);

test('the recorded chat folds as in the run: in the cellar with Brede and Osney, no rat anywhere', () => {
    assert.deepEqual(foldChat(run.chat).errors, []);
    const present = run.before.scene.present.filter((id) => id !== 'pc').map((id) => run.before.entities[id].name);
    assert.deepEqual(present.sort(), ['Brede', 'Osney']);
    assert.ok(!Object.values(run.before.entities).some((e) => e.kind === 'creature'));
    assert.deepEqual(fx.recorded.rat_reply_rejected, ['combat.by must be a present NPC or creature: unknown person (introduce new people via "new")']);
    assert.equal(fx.recorded.dash_panel, '`Alaric: which target? Brede or Osney (nothing spent, nothing rolled)`');
});

test('"rat pack — first rat …, two more …" is never one creature: the engine asks for the rats, the reply says so meanwhile', () => {
    assert.ok(run.recover, 'asked for separately');
    assert.equal(run.first.rec.recovery, 'pending');
    assert.ok(!Object.values(run.first.state.entities).some((e) => e.kind === 'creature'), 'no "Rat Pack" with a single rat\'s profile');
    assert.equal(run.first.state.encounter, null);
    assert.deepEqual(run.first.rec.attackers, [{ by: 'rat pack — first rat charging toward the stairs, two more bolting along the walls, more following from the wall gaps', ref: null }]);
    assert.equal(run.first.panel, '`ATTACKERS NOT IDENTIFIED YET — "rat pack — first rat charging toward the stairs, two more bolting along the …": asking for them separately; the fight and its target list follow in a moment.`');
    assert.ok(run.first.rec.accepted.includes('time +5 min'), 'the rest of the report stands');
    // the request: the bookkeeper, not the narrator; only "new" and "combat"; the story is not continued
    assert.ok(run.request.systemPrompt.startsWith(ATTACKERS_REQUEST_HEAD));
    assert.match(run.request.systemPrompt, /one entry for each distinct attacker the reply has already established/);
    assert.match(run.request.prompt, /The first rat clears the hole/);
    assert.match(run.request.prompt, /Its "combat" named: "rat pack — first rat charging toward the stairs/);
    assert.match(run.request.prompt, /exactly one <avereth>\{"new":\[…\],"combat":\{"by":\[…\]\}\}<\/avereth>, nothing else\. Do not continue the story\.$/);
});

test('with the answer: Rat A, Rat B, Rat C as three combatants, the fight fixed at once, the reply keeps its own report', () => {
    const state = foldChat(run.chat, run.chat.length - 1).state;
    assert.deepEqual(validateState(state, content), []);
    assert.deepEqual(run.rat.rejected, []);
    assert.equal(run.rat.attackers, undefined);
    assert.deepEqual(run.rat.recovery, { from: 'attackers', ms: 12000 });
    assert.ok(run.rat.accepted.includes('time +5 min'));
    const enc = state.encounter;
    assert.equal(enc.round, 0);
    assert.deepEqual(Object.values(enc.combatants).filter((c) => c.id !== 'pc').map((c) => [c.id, c.label, c.fixed.max_hp]),
        [['mon.rat_a', 'Rat A', 16], ['mon.rat_b', 'Rat B', 16], ['mon.rat_c', 'Rat C', 16]]);
    assert.ok(!enc.combatants['npc.brede'] && !enc.combatants['npc.osney'], 'Brede and Osney stand by');
    assert.match(run.ratText, /^`COMBAT START — Rat A, Rat B, Rat C attack Alaric`\n`Initiative: [^\n]*`\n`COMBAT TARGETS — Rat A \[ENGAGED\] · Rat B \[SHORT\] · Rat C \[SHORT\]`\n`HP: /);
    assert.match(run.ratText, /`ATTACKERS IDENTIFIED: a separate request named them \(12\.0 s\)\.`/);
});

test('"*i dash at the first one and basic attack it*": the engine asks among the three rats, Brede and Osney are no candidates, no narrator call', () => {
    assert.equal(run.dash.action, 'panels', 'answered by the engine alone');
    assert.equal(run.dash.panels[0], [
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        'Alaric\'s Basic Attack: which target — Rat A or Rat B or Rat C? Nothing was spent or rolled.',
        'COMBAT TARGETS — Rat A [ENGAGED] · Rat B [SHORT] · Rat C [SHORT]',
        'Name one, for example: *Basic Attack on Rat A*',
    ].join('\n'));
    assert.doesNotMatch(run.dash.panels[0], /Brede|Osney/);
    assert.deepEqual(run.chat.at(-1).extra.avereth.events, [], 'nothing resolved, rolled or spent');
});

test('Rat A by its label: the Basic Attack lands on Rat A; B and C keep their letters', () => {
    const chat = run.chat.slice();
    chat.push(user('*i dash at Rat A and basic attack it*'));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'context');
    const o = foldChat(chat).state.last.outcome;
    const mine = o.records.find((r) => r.actor === 'pc');
    assert.deepEqual([mine.target, mine.strikes[0].final > 0], ['mon.rat_a', true]);
    assert.deepEqual([o.board.labels['mon.rat_b'], o.board.labels['mon.rat_c']], ['Rat B', 'Rat C']);
    assert.match(gen.context.text, /Alaric: Basic Attack -> Rat A/);
});

test('the request brings nothing: no rat comes in as a single combatant, and the reply says the attackers are not in the fight', () => {
    assert.deepEqual(failed.rat.recovery, { from: 'attackers', failed: 'no answer', ms: 12000 });
    assert.equal(failed.rat.attackers.length, 1);
    const state = foldChat(failed.chat, failed.chat.length - 1).state;
    assert.ok(!Object.values(state.entities).some((e) => e.kind === 'creature'));
    assert.equal(state.encounter, null);
    assert.match(failed.ratText, /^`ATTACKERS NOT IDENTIFIED — "rat pack — [^"]*", and the separate request named none \(12\.0 s\): they are not in the fight\. The next report may introduce them\.`/);
    // the narrator hears of it in the next engine block
    assert.match(failed.rat.corrections.join('\n'), /combat\.by "rat pack — first rat[^"]*" names no attacker the game can tell apart: introduce each attacker as its own "new" entry/);
});
