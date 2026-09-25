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
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { hash32 } from '../../src/util.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v7/fixture.json');

const ai = (mes, events = null) => ({
    is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }],
    extra: events ? { avereth: { v: 2, events, text_hash: hash32(mes) } } : {},
});
const user = (mes, events = null) => ({ is_user: true, is_system: false, mes, extra: events ? { avereth: { v: 2, events, input_hash: hash32(mes) } } : {} });

/** The recorded chat before the rat reply, then the reply and the player's next message as the extension handles them. */
function replay() {
    const chat = fx.chat.map((m) => ({ ...(m.user ? user(m.mes, m.events) : ai(m.mes, m.events)), is_system: m.system }));
    const before = foldChat(chat).state;
    chat.push(ai(fx.rat_reply));
    const ratId = chat.length - 1;
    processReply(chat, ratId, content, { recover: true });
    chat.push(user(fx.dash));
    const dash = prepareGeneration(chat, content, { type: 'normal' });
    if (dash.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
    return { chat, before, rat: chat[ratId].extra.avereth, ratText: chat[ratId].extra.display_text, dash };
}

const run = replay();

test('the recorded chat folds as in the run: in the cellar with Brede and Osney, no rat anywhere', () => {
    assert.deepEqual(foldChat(run.chat).errors, []);
    const present = run.before.scene.present.filter((id) => id !== 'pc').map((id) => run.before.entities[id].name);
    assert.deepEqual(present.sort(), ['Brede', 'Osney']);
    assert.ok(!Object.values(run.before.entities).some((e) => e.kind === 'creature'));
    assert.deepEqual(fx.recorded.rat_reply_rejected, ['combat.by must be a present NPC or creature: unknown person (introduce new people via "new")']);
    assert.equal(fx.recorded.dash_panel, '`Alaric: which target? Brede or Osney (nothing spent, nothing rolled)`');
});

test('the attackers the reply commits exist: the rat pack comes in as one creature and the fight is fixed at once', () => {
    assert.deepEqual(run.rat.rejected, [], 'the combat entry is no longer refused');
    assert.ok(!run.rat.report_error);
    assert.ok(run.rat.accepted.includes('new creature rat pack (mon.rat_pack): the attacker in "combat"'), run.rat.accepted.join(' | '));
    assert.ok(run.rat.accepted.includes('combat committed by mon.rat_pack (pending)'));
    const state = foldChat(run.chat, run.chat.length - 1).state;
    assert.deepEqual(validateState(state, content), []);
    const rat = state.entities['mon.rat_pack'];
    assert.deepEqual([rat.kind, rat.anchor, rat.name, rat.descriptors], ['creature', 'rat', null, ['rat pack']]);
    assert.ok(state.scene.present.includes('mon.rat_pack'));
    // fixed before anyone acts (the commitment of the reply): Initiative, Turn order and the target list
    assert.equal(state.encounter.round, 0);
    assert.deepEqual(Object.keys(state.encounter.combatants).sort(), ['mon.rat_pack', 'pc'], 'Brede and Osney stand by');
    assert.equal(state.encounter.combatants['mon.rat_pack'].label, 'Rat Pack A');
    assert.match(run.ratText, /^`COMBAT START — Rat Pack A attacks Alaric`\n`Initiative: [^\n]*`\n`COMBAT TARGETS — Rat Pack A \[MEDIUM\]`\n`HP: /);
    // the narrator's next block names the fight's combatant by the label the player sees
    assert.doesNotMatch(run.rat.corrections.join(' '), /combat\.by/);
});

test('"*i dash at the first one and basic attack it*": the engine asks with the target list, Brede and Osney are no candidates, no narrator call', () => {
    assert.equal(run.dash.action, 'panels', 'answered by the engine alone');
    const [panel] = run.dash.panels;
    assert.equal(panel, [
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        'Alaric\'s Basic Attack: "the first one" is not a target in this fight. Nothing was spent or rolled.',
        'COMBAT TARGETS — Rat Pack A [MEDIUM]',
        'Name one, for example: *Basic Attack on Rat Pack A*',
    ].join('\n'));
    assert.doesNotMatch(panel, /Brede|Osney/);
    const rec = run.chat.at(-1).extra.avereth;
    assert.deepEqual(rec.events, [], 'nothing resolved, rolled or spent');
    const before = foldChat(run.chat, run.chat.length - 1).state;
    assert.deepEqual(foldChat(run.chat).state, before);
});

test('the rat pack by its label: the dash closes in and the Basic Attack lands; the target list stays bound to it', () => {
    const chat = run.chat.slice();
    chat.push(user('*i dash at Rat Pack A and basic attack it*'));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'context');
    const o = foldChat(chat).state.last.outcome;
    assert.equal(o.kind, 'combat');
    const pc = o.records.find((r) => r.actor === 'pc');
    assert.equal(pc.target, 'mon.rat_pack');
    assert.ok(pc.strikes[0].final > 0);
    assert.equal(o.board.labels['mon.rat_pack'], 'Rat Pack A');
    assert.match(gen.context.text, /Alaric: Basic Attack -> Rat Pack A/);
    assert.doesNotMatch(gen.context.text, /needs a target/);
});
