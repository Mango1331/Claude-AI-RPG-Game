// Combat target labels (live run 25.09. 01:31, docs/TESTRUN_V7.md): every opponent gets a name the player can target
// when it enters the fight, bound to its id until the fight ends; in a fight the target question is the engine's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { parseIntent } from '../../src/intent.js';
import { turnPanel } from '../../src/display.js';
import { worldRows, renderHud } from '../../src/hud.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer } from '../../src/host.js';
import { propText } from '../../src/knowledge.js';
import { hash32 } from '../../src/util.js';

const content = await loadContent();

function warrior() {
    const g = new Game(content);
    g.turn('Warrior');
    g.turn('Quick Slash + Charge');
    return g;
}

const rat = (ref, band) => ({ ref, kind: 'creature', species: 'rat', desc: ['cellar rat'], band });

/** Three cellar rats attack; Brede, the merchant, stands by. Returns the game and the System block of that reply. */
function ratFight() {
    const g = warrior();
    g.input('I go down into the cellar.');
    const before = g.state;
    const r = g.reply({
        new: [rat('rat1', 'ENGAGED'), rat('rat2', 'SHORT'), rat('rat3', 'SHORT'), { ref: 'Brede', name: 'Brede', kind: 'npc', desc: ['salt merchant'], band: 'MEDIUM' }],
        combat: [{ by: 'rat1' }, { by: 'rat2' }, { by: 'rat3' }],
    }, 'Brede the salt merchant backs off as three cellar rats come at Alaric.');
    return { g, panel: turnPanel(before, content, null, r) };
}

const labels = (g) => Object.fromEntries(Object.values(g.state.encounter.combatants).filter((c) => c.label).map((c) => [c.id, c.label]));
const sys = (panel) => panel.split('\n').filter((l) => l.startsWith('`'));

test('several opponents of one kind: Cellar Rat A, B, C in the order they came, in the target list, HP, Range and the HUD', () => {
    const { g, panel } = ratFight();
    assert.deepEqual(labels(g), { 'mon.rat1': 'Cellar Rat A', 'mon.rat2': 'Cellar Rat B', 'mon.rat3': 'Cellar Rat C' });
    assert.ok(panel.includes('`COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT] · Cellar Rat C [SHORT]`'), panel);
    // HP and Range in Turn order, by the same labels
    const hp = sys(panel).find((l) => l.startsWith('`HP: '));
    const range = sys(panel).find((l) => l.startsWith('`Range: '));
    for (const x of ['A', 'B', 'C']) assert.match(hp, new RegExp(`Cellar Rat ${x} \\d+/\\d+`));
    assert.match(range, /Cellar Rat A ENGAGED/);
    assert.match(range, /Cellar Rat B SHORT/);
    assert.doesNotMatch(panel.split('`COMBAT TARGETS')[1].split('\n')[0], /Brede/, 'the merchant is no target');
    const w = Object.fromEntries(worldRows(g.state, content));
    assert.match(w.Present, /Cellar Rat A \(HP \d+\/\d+, ENGAGED\)/);
    assert.match(w.Present, /Brede/);
    assert.match(w.Combat, /Turn order .*Cellar Rat A/);
    // the narrator's block uses the same labels and says who they are
    assert.match(g.context().text, /Cellar Rat B \(the cellar rat\): L\d+ /);
});

test('the label decides: "Quick Slash on Cellar Rat B", "basic attack cellar rat c", exactly and in any case', () => {
    const { g } = ratFight();
    const target = (t) => parseIntent(t, g.state, content);
    assert.deepEqual([target('*I use Quick Slash on Cellar Rat B*').target, target('*I use Quick Slash on Cellar Rat B*').target_how], ['mon.rat2', 'label']);
    assert.equal(target('*I basic attack Cellar Rat A*').target, 'mon.rat1');
    assert.equal(target('*i basic attack cellar rat c*').target, 'mon.rat3');
    // a vague reference in a fight asks among the opponents only; the merchant standing by is no candidate
    for (const t of ['*I attack the rat*', '*i dash at the first one and basic attack it*', '*I Quick Slash it*']) {
        const i = target(t);
        assert.equal(i.kind, 'ambiguous_target', t);
        assert.deepEqual(i.candidates.sort(), ['mon.rat1', 'mon.rat2', 'mon.rat3'], t);
    }
    assert.equal(target('*I attack the nearest one*').target, 'mon.rat1', 'the only ENGAGED one');
    // named on purpose, a bystander is still Alaric's to attack (and would join the fight)
    assert.equal(target('*I attack Brede*').target, 'npc.brede');
    assert.deepEqual([target('*i dash at Cellar Rat B and basic attack it*').target, target('*i dash at Cellar Rat B and basic attack it*').move], ['mon.rat2', 'closer'], '"dash at" closes in');
});

test('in a fight an unclear target is the engine\'s question: a System panel, nothing resolved, rolled or spent, no narrator call', () => {
    const { g } = ratFight();
    const before = g.state;
    const t = g.input('*I attack the rat*');
    assert.deepEqual([t.events, t.command.llm, t.outcome], [[], null, null]);
    assert.equal(t.command.panels[0], [
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        'Alaric\'s Basic Attack: which target — Cellar Rat A or Cellar Rat B or Cellar Rat C? Nothing was spent or rolled.',
        'COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT] · Cellar Rat C [SHORT]',
        'Name one, for example: *Basic Attack on Cellar Rat A*',
    ].join('\n'));
    assert.deepEqual(g.state, before);
});

test('labels stay bound: Cellar Rat A falls, B stays B, "Cellar Rat A" is no target any more; a latecomer is Cellar Rat D', () => {
    const { g } = ratFight();
    let panel = '';
    for (let n = 0; n < 6 && !g.state.encounter.combatants['mon.rat1'].current.defeated; n++) {
        g.input('*I basic attack Cellar Rat A*');
        panel = turnPanel(g.state, content);
        g.reply({});
    }
    assert.ok(g.state.encounter.combatants['mon.rat1'].current.defeated);
    assert.deepEqual(labels(g), { 'mon.rat1': 'Cellar Rat A', 'mon.rat2': 'Cellar Rat B', 'mon.rat3': 'Cellar Rat C' });
    // the step in which A fell shows the targets left
    assert.match(panel, /`COMBAT TARGETS — Cellar Rat B \[\w+\] · Cellar Rat C \[\w+\]`/);
    assert.match(panel, /Cellar Rat A 0\/\d+ \(defeated\)/);
    const t = g.input('*I basic attack Cellar Rat A*');
    assert.match(t.command.panels[0], /"Cellar Rat A" is not a target in this fight\./);
    assert.equal(parseIntent('*I use Quick Slash on Cellar Rat B*', g.state, content).target, 'mon.rat2');
    // a fourth rat joins: the next free letter, A stays taken by the dead one
    const before = g.state;
    const r = g.reply({ new: [rat('rat4', 'LONG')], combat: [{ by: 'rat4' }] }, 'A fourth cellar rat scrabbles out of the wall.');
    assert.equal(g.state.encounter.combatants['mon.rat4'].label, 'Cellar Rat D');
    const joined = sys(turnPanel(before, content, null, r));
    assert.ok(joined.some((l) => /^`COMBAT — Cellar Rat D joins the fight/.test(l)), joined.join('\n'));
    assert.ok(joined.some((l) => /^`COMBAT TARGETS — Cellar Rat B \[\w+\] · Cellar Rat C \[\w+\] · Cellar Rat D \[LONG\]`$/.test(l)), joined.join('\n'));
});

test('a named opponent the player knows keeps the name: Brede, Mercenary Captain; "I Charge Mercenary Captain" targets him', () => {
    const g = warrior();
    g.input('I walk into the yard.');
    g.reply({
        new: [{ ref: 'Brede', name: 'Brede', kind: 'npc', desc: ['salt merchant'], band: 'SHORT' }, { ref: 'captain', name: 'Mercenary Captain', kind: 'npc', desc: ['sellsword'], band: 'MEDIUM' }],
        combat: [{ by: 'Brede' }, { by: 'captain' }],
    }, 'Brede snarls, and the Mercenary Captain draws beside him.');
    assert.deepEqual(labels(g), { 'npc.brede': 'Brede', 'npc.mercenary_captain': 'Mercenary Captain' });
    const i = parseIntent('*I Charge Mercenary Captain*', g.state, content);
    assert.deepEqual([i.kind, i.skill, i.target], ['attack', 'warrior.charge', 'npc.mercenary_captain']);
    assert.equal(parseIntent('*I Quick Slash Brede*', g.state, content).target, 'npc.brede');
});

test('a name the story has not said is not in the target list, the panels or the HUD; the narrator knows it; the label stays', () => {
    const g = warrior();
    g.input('I walk into the yard.');
    const before = g.state;
    const r = g.reply({
        new: [{ ref: 'captain', name: 'Garrick Voss', kind: 'npc', desc: ['mercenary captain'], band: 'SHORT' }],
        combat: { by: 'captain' },
    }, 'A mercenary captain steps out of the gatehouse, blade already drawn.');
    const id = 'npc.garrick_voss';
    assert.equal(g.state.entities[id].known_name, '');
    assert.equal(g.state.encounter.combatants[id].label, 'Mercenary Captain A');
    const shown = [turnPanel(before, content, null, r), renderHud(g.state, content, 'open'), g.input('*I attack the gatehouse*').command?.panels?.[0] || ''].join('\n');
    assert.match(shown, /Mercenary Captain A/);
    assert.doesNotMatch(shown, /Garrick|Voss/);
    assert.match(g.context().text, /Mercenary Captain A \(Garrick Voss; the story has not said this name yet\)/);
    assert.equal(parseIntent('*I Quick Slash Mercenary Captain A*', g.state, content).target, id);
    // the story says it now: his name from here on in the HUD, while this fight keeps its label
    g.input('*I Quick Slash Mercenary Captain A*');
    g.reply({}, '"Garrick Voss does not bleed for coppers," the captain spits.');
    assert.equal(g.state.entities[id].known_name, null);
    assert.equal(g.state.encounter.combatants[id].label, 'Mercenary Captain A');
    assert.match(Object.fromEntries(worldRows(g.state, content)).Present, /Mercenary Captain A/);
});

test('labels are combat state only: the fight ends and they are gone; no fact, claim or memory carries them', () => {
    const { g } = ratFight();
    // strike whatever comes close; the skittish rest keep their distance, and Alaric leaves them
    for (let n = 0; n < 40 && g.state.encounter; n++) {
        const near = Object.values(g.state.encounter.combatants).find((c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped && ['ENGAGED', 'SHORT'].includes(c.current.band));
        g.input(near ? `*I dash at ${near.label} and basic attack it*` : '*I flee*');
        g.reply({});
    }
    assert.equal(g.state.encounter, null);
    const words = [...Object.values(g.state.facts).map((f) => propText(g.state, f, content)), ...Object.values(g.state.claims).map((c) => propText(g.state, c, content)),
        ...g.state.memories.map((m) => m.text), ...Object.values(g.state.entities).map((e) => JSON.stringify(e))].join('\n');
    assert.doesNotMatch(words, /Cellar Rat [A-D]\b/);
    assert.match(g.state.memories.find((m) => m.kind === 'combat').text, /the cellar rat — killed/);
    assert.doesNotMatch(Object.fromEntries(worldRows(g.state, content)).Present, /Cellar Rat A/);
});

// the three rats the user asked for as the request's answer (docs/TESTRUN_V7.md)
const RATS = '<avereth>{"new":[{"ref":"rat_a","kind":"creature","species":"rat","band":"ENGAGED"},{"ref":"rat_b","kind":"creature","species":"rat","band":"SHORT"},{"ref":"rat_c","kind":"creature","species":"rat","band":"SHORT"}],"combat":{"by":["rat_a","rat_b","rat_c"]}}</avereth>';

/** The game so far as one message, then a player message and a reply as the extension handles them (report requests on). */
function hostTurn(g, input, reply, answer) {
    const chat = [{ is_user: false, is_system: false, mes: 'start', swipe_id: 0, swipes: ['start'], swipe_info: [{ extra: {} }], extra: { avereth: { v: 2, events: g.log, text_hash: hash32('start') } } }];
    chat.push({ is_user: true, is_system: false, mes: input, extra: {} });
    prepareGeneration(chat, content, { type: 'normal' });
    chat.push({ is_user: false, is_system: false, mes: reply, swipe_id: 0, swipes: [reply], swipe_info: [{ extra: {} }], extra: {} });
    const got = processReply(chat, 2, content, { recover: true });
    const first = { ...chat[2].extra.avereth };
    if (got.recover && answer !== undefined) applyReportAnswer(chat, 2, content, answer, { hash: reportRequest(chat, 2, content).hash, ms: 5000 });
    return { got, first, rec: chat[2].extra.avereth, state: foldChat(chat).state };
}
const foes = (state) => Object.values(state.encounter?.combatants || {}).filter((c) => c.id !== 'pc').map((c) => [c.id, c.label]);

test('one unknown creature in "combat" still comes in at once: "a grey wolf" is Grey Wolf A, no request', () => {
    const g = warrior();
    g.input('I walk into the woods.');
    const r = g.reply({ combat: { by: 'a grey wolf' } }, 'A grey wolf lopes out of the pines.');
    assert.deepEqual([r.rejected, r.attackers], [[], null]);
    const wolf = g.state.entities['mon.grey_wolf'];
    assert.deepEqual([wolf.kind, wolf.anchor, wolf.descriptors], ['creature', 'wolf', ['grey wolf']]);
    assert.deepEqual(foes(g.state), [['mon.grey_wolf', 'Grey Wolf A']]);
});

test('a group in "combat" is never one creature: "rat pack — …", "rats", "three cellar rats", one text twice, a pack the report introduces', () => {
    for (const combat of [{ by: 'rat pack — first rat charging toward the stairs, two more bolting along the walls' }, { by: 'rats' }, { by: 'three cellar rats' }, { by: ['rat', 'rat'] }]) {
        const g = warrior();
        g.input('I go down into the cellar.');
        const r = g.reply({ combat });
        const t = JSON.stringify(combat);
        assert.equal(g.state.encounter, null, t);
        assert.ok(!Object.values(g.state.entities).some((e) => e.kind === 'creature'), `${t}: no creature with a single rat's profile`);
        assert.equal(r.attackers.length, 1, t);
        assert.match(r.rejected.map((x) => x.reason).join(' '), /names no attacker the game can tell apart: introduce each attacker as its own "new" entry/, t);
    }
    // Testrun 3 "Cellar rat pack", Test 5 "cellar rats": a pack the report introduces itself and commits
    for (const name of ['Cellar rat pack', 'cellar rats']) {
        const g = warrior();
        g.input('I go down into the cellar.');
        const r = g.reply({ new: [{ ref: 'pack', kind: 'creature', name, species: 'rat', band: 'SHORT' }], combat: { by: 'pack' } });
        assert.equal(g.state.encounter, null, name);
        assert.deepEqual(r.attackers, [{ by: 'pack', ref: 'pack' }], name);
        assert.match(r.rejected.map((x) => x.reason).join(' '), /combat\.by "pack" is a group/, name);
    }
    // a pack leader, a Big rat and an indexed ref are one creature each
    const g = warrior();
    g.input('I go down into the cellar.');
    g.reply({ new: [{ ref: 'pack_leader', kind: 'creature', species: 'wolf', band: 'SHORT' }, { ref: 'big', kind: 'creature', name: 'Big rat', species: 'rat', band: 'SHORT' }, { ref: 'rat_2', kind: 'creature', species: 'rat', band: 'SHORT' }], combat: { by: ['pack_leader', 'big', 'rat_2'] } });
    assert.deepEqual(foes(g.state), [['mon.pack_leader', 'Pack Leader A'], ['mon.big_rat', 'Big Rat'], ['mon.rat_2', 'Rat A']]);
});

test('the host asks for the group\'s attackers: the answer brings Rat A, Rat B, Rat C; meanwhile and on failure the reply says so', () => {
    const reply = 'The first rat clears the hole. Two more pour out behind it.\n<avereth>{"time":5,"combat":{"by":"rat pack — first rat charging, two more behind"}}</avereth>';
    const g = warrior();
    const ok = hostTurn(g, 'I go down into the cellar.', reply, RATS);
    assert.equal(ok.first.recovery, 'pending');
    assert.match(ok.first.panel, /^`ATTACKERS NOT IDENTIFIED YET — "rat pack — first rat charging, two more behind": asking for them separately/);
    assert.deepEqual(foes(ok.state), [['mon.rat_a', 'Rat A'], ['mon.rat_b', 'Rat B'], ['mon.rat_c', 'Rat C']]);
    assert.deepEqual([ok.rec.recovery, ok.rec.attackers, ok.rec.rejected], [{ from: 'attackers', ms: 5000 }, undefined, []]);
    assert.ok(ok.rec.accepted.includes('time +5 min'), 'the reply\'s own report stays');
    assert.match(ok.rec.panel, /`COMBAT TARGETS — Rat A \[ENGAGED\] · Rat B \[SHORT\] · Rat C \[SHORT\]`[\s\S]*`ATTACKERS IDENTIFIED: a separate request named them \(5\.0 s\)\.`/);
    // an answer that is again a pack brings nothing: no single rat, the reply says so
    const again = hostTurn(warrior(), 'I go down into the cellar.', reply, '<avereth>{"new":[{"ref":"rats","kind":"creature","species":"rat"}],"combat":{"by":"rats"}}</avereth>');
    assert.equal(again.state.encounter, null);
    assert.ok(!Object.values(again.state.entities).some((e) => e.kind === 'creature'), 'the answer\'s pack is not kept as one creature');
    assert.ok(again.rec.accepted.includes('time +5 min'), 'the reply keeps its own report');
    assert.equal(again.rec.recovery.failed, 'the answer named no attackers the game can tell apart');
    assert.match(again.rec.panel, /`ATTACKERS NOT IDENTIFIED — "rat pack — first rat charging, two more behind", and the separate request named none \(5\.0 s\): they are not in the fight/);
});

test('a later rat of a kind already fighting is never lost: asked for, it joins with the next free letter (A fell, the newcomer is C)', () => {
    const g = warrior();
    g.input('I go down into the cellar.');
    g.reply({ new: [{ ref: 'rat_a', kind: 'creature', species: 'rat', band: 'ENGAGED' }, { ref: 'rat_b', kind: 'creature', species: 'rat', band: 'SHORT' }], combat: { by: ['rat_a', 'rat_b'] } });
    assert.deepEqual(foes(g.state), [['mon.rat_a', 'Rat A'], ['mon.rat_b', 'Rat B']]);
    // Rat A falls to this turn's blow; the reply brings "another rat" while Rat B still fights: B or a newcomer? the
    // request tells (a kind already fighting is never silently one more, nor dropped)
    const late = hostTurn(g, '*I basic attack Rat A*', 'Rat A goes down. Another rat scrabbles out of the wall.\n<avereth>{"combat":{"by":"another rat"}}</avereth>',
        '<avereth>{"new":[{"ref":"rat_3","kind":"creature","species":"rat","band":"MEDIUM"}],"combat":{"by":["rat_3"]}}</avereth>');
    assert.deepEqual(late.first.attackers, [{ by: 'another rat', ref: null }]);
    assert.equal(late.first.recovery, 'pending');
    const c = late.state.encounter.combatants;
    assert.deepEqual([c['mon.rat_a'].current.defeated, c['mon.rat_b'].current.defeated], [true, false], 'A fell, B still fights');
    assert.deepEqual(foes(late.state), [['mon.rat_a', 'Rat A'], ['mon.rat_b', 'Rat B'], ['mon.rat_3', 'Rat C']]);
    // the narrator names a fighting rat by its label in a report: it resolves
    const byLabel = g.reply({ intent: [{ who: 'Rat B', intent: 'flee' }] });
    assert.deepEqual([byLabel.rejected, byLabel.accepted], [[], ['mon.rat_b intends flee']]);
});

test('a person or Alaric in "combat": a person is asked for like a group; Alaric is refused, nothing asked', () => {
    const g = warrior();
    g.input('I wait at the gate.');
    const p = g.reply({ combat: [{ by: 'a hooded man with a knife' }, { by: 'a hooded man riding a horse' }, { by: 'pc' }] });
    assert.deepEqual(p.attackers.map((a) => a.by), ['a hooded man with a knife', 'a hooded man riding a horse']);
    assert.equal(p.rejected.length, 3);
    assert.match(p.rejected[2].reason, /combat\.by must be a present NPC or creature/);
    assert.equal(g.state.encounter, null);
    assert.ok(!Object.values(g.state.entities).some((e) => e.kind === 'npc' || e.kind === 'creature'), 'no horse, no man');
});

test('the host: an unclear target in a fight posts the System panel, hides the line and never generates; a regenerate aborts', () => {
    const { g } = ratFight();
    // one message carrying the whole campaign so far
    const chat = [{ is_user: false, is_system: false, mes: 'start', swipe_id: 0, swipes: ['start'], swipe_info: [{ extra: {} }], extra: { avereth: { v: 2, events: g.log, text_hash: hash32('start') } } }];
    chat.push({ is_user: true, is_system: false, mes: '*i dash at the first one and basic attack it*', extra: {} });
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'panels');
    assert.match(gen.panels[0], /^\[SYSTEM \/\/ COMBAT — TARGET NEEDED\]\nAlaric's Basic Attack: which target — Cellar Rat A or Cellar Rat B or Cellar Rat C\?/);
    assert.deepEqual(chat[1].extra.avereth.events, []);
    chat[1].is_system = true; // index.js
    assert.equal(prepareGeneration(chat, content, { type: 'regenerate' }).action, 'abort');
    assert.deepEqual(foldChat(chat).state.encounter, g.state.encounter);
});
