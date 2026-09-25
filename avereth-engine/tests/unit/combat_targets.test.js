// Combat target labels (live run 25.09. 01:31, docs/TESTRUN_V7.md): every opponent gets a name the player can target
// when it enters the fight, bound to its id until the fight ends; in a fight the target question is the engine's own.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { parseIntent } from '../../src/intent.js';
import { turnPanel } from '../../src/display.js';
import { worldRows, renderHud } from '../../src/hud.js';
import { prepareGeneration, foldChat } from '../../src/host.js';
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

test('an attacker the report commits without "new": a creature named by its kind comes in; a person or Alaric stays refused', () => {
    const g = warrior();
    g.input('I walk into the woods.');
    const r = g.reply({ combat: { by: 'wolf pack — three grey shapes loping out of the pines' } }, 'Three grey shapes lope out of the pines.');
    assert.deepEqual(r.rejected, []);
    const wolf = g.state.entities['mon.wolf_pack'];
    assert.deepEqual([wolf.kind, wolf.anchor, wolf.descriptors], ['creature', 'wolf', ['wolf pack']]);
    assert.equal(g.state.encounter.combatants['mon.wolf_pack'].label, 'Wolf Pack A');
    // a loose name for a kind already here is no new creature
    const again = g.reply({ combat: { by: 'the wolves' } });
    assert.equal(Object.values(g.state.entities).filter((e) => e.anchor === 'wolf').length, 1);
    assert.match(again.rejected.map((x) => x.reason).join(' '), /combat\.by must be a present NPC or creature/);
    const h = warrior();
    h.input('I wait at the gate.');
    const p = h.reply({ combat: [{ by: 'a hooded man with a knife' }, { by: 'a hooded man riding a horse' }, { by: 'pc' }] });
    assert.equal(p.rejected.length, 3);
    assert.equal(h.state.encounter, null);
    assert.ok(!Object.values(h.state.entities).some((e) => e.kind === 'npc'));
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
