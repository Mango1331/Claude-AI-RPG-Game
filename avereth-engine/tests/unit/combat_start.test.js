// The fight a reply's report opens (live run 26.09. 23:09, docs/TESTRUN_V8.md): every Turn before Alaric's first one
// resolves with that reply, shown in its System panel and handed to the narrator with the next combat step; his own
// Turn is never played for him, and nothing resolves twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { turnPanel } from '../../src/display.js';
import { narratorReply } from '../../src/engine.js';
import { fold } from '../../src/state.js';

const content = await loadContent();

function warrior() {
    const g = new Game(content);
    g.input('Warrior');
    g.input('Heavy Slash + Charge');
    g.input('I look around.');
    return g;
}
const steps = (records) => records.map((r) => `${r.round}:${r.actor}${r.opening ? ':opening' : ''}`);
const label = (g, id) => g.state.encounter.combatants[id].label;

test('NPC > NPC > Alaric: both act with the reply, the fight stops at his Turn, his next message does not repeat them', () => {
    const g = warrior();
    g.reply({ new: [{ ref: 'bandit', kind: 'npc', desc: ['bandit'], band: 'SHORT' }, { ref: 'brigand', kind: 'npc', desc: ['brigand'], band: 'SHORT' }] });
    g.input('"Stand aside."');
    const before = g.state;
    const r = g.reply({ combat: [{ by: 'bandit' }, { by: 'brigand' }] });
    const enc = g.state.encounter;
    assert.deepEqual(enc.order, ['npc.brigand', 'npc.bandit', 'pc']);
    assert.deepEqual([enc.round, enc.current, steps(enc.log)], [1, 'pc', ['1:npc.brigand', '1:npc.bandit']]);
    assert.equal(g.state.entities.pc.sheet.hp, enc.combatants.pc.current.hp, 'his HP are persisted');
    assert.ok(g.state.entities.pc.sheet.hp < 85);
    const panel = turnPanel(before, content, null, r);
    assert.match(panel, /`— Round 1 —`\n`Brigand A[^`]*: [^`]*→ Alaric`\n[^\n]*\n`Bandit A[^`]*: [^`]*→ Alaric`/);
    assert.match(panel, /`Next: Alaric's Turn \(Round 1\)`/);
    const t = g.input(`*I Heavy Slash ${label(g, 'npc.bandit')}*`);
    // the narrator hears every step since its last reply; the fight's log holds each Turn once (the bandits hit hard:
    // Round 2 kills him)
    const all = ['1:npc.brigand', '1:npc.bandit', '1:pc', '2:npc.brigand', '2:npc.bandit'];
    assert.deepEqual([steps(t.outcome.records), t.outcome.shown, t.outcome.ended?.pc_dead], [all, 2, true]);
    assert.deepEqual(steps(t.events.findLast((e) => e.t === 'encounter.updated').d.encounter.log), all);
    assert.match(turnPanel(g.state, content), /^`— Round 1 —`\n`Alaric: Heavy Slash → Bandit A/, 'the panel shows only what is new');
});

test('Alaric first (a slow bear): nothing is played for him; his message opens Round 1', () => {
    const g = warrior();
    g.reply({ new: [{ ref: 'bear', kind: 'creature', species: 'bear', band: 'ENGAGED' }] });
    g.input('I wait.');
    const before = g.state;
    const r = g.reply({ combat: { by: 'bear' } });
    const enc = g.state.encounter;
    assert.ok(enc.combatants['mon.bear'].fixed.init < enc.combatants.pc.fixed.init);
    assert.deepEqual([enc.round, enc.current, enc.log], [1, 'pc', []]);
    const panel = turnPanel(before, content, null, r);
    assert.doesNotMatch(panel, /— Round/);
    assert.match(panel, /`Next: Alaric's Turn \(Round 1\)`/);
    const t = g.input(`*I Heavy Slash ${label(g, 'mon.bear')}*`);
    assert.equal(t.outcome.records[0].actor, 'pc');
    assert.equal(t.outcome.shown, undefined);
    assert.equal(t.outcome.started?.previewed, true, 'the narrator hears of the start with his first Turn');
});

test('the Turns before Alaric\'s kill him: the fight ends with the reply, he is dead, no Turn of his follows', () => {
    const g = warrior();
    g.reply({ new: [{ ref: 'rat', kind: 'creature', species: 'rat', desc: ['cellar rat'], band: 'ENGAGED' }] });
    g.input('I step closer.');
    // one HP left (engine state; a report cannot set it)
    g.log.push({ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 1 } });
    g.state = fold(g.log);
    const before = g.state;
    const r = g.reply({ combat: { by: 'rat' } });
    assert.equal(g.state.entities.pc.status, 'dead');
    assert.equal(g.state.encounter, null);
    assert.equal(g.state.mode, 'story');
    assert.equal(r.opened.ended.pc_dead, true);
    assert.match(turnPanel(before, content, null, r), /`  1 damage → Alaric HP 1 - 1 = 0 DEFEATED`\n[\s\S]*`COMBAT END — Alaric is dead`$/);
    const t = g.input('*I Heavy Slash the rat*');
    assert.equal(t.outcome.kind, 'note');
    assert.match(t.outcome.text, /Alaric is dead/);
    assert.ok(!t.events.some((e) => e.t.startsWith('encounter.')), 'nothing resolves any more');
});

test('a true Ambush: the Opening Action and the Round 1 Turns before Alaric\'s come once, with the reply', () => {
    const g = warrior();
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'SHORT' }], concealed: ['wolf'] });
    g.input('I walk on.');
    const before = g.state;
    const r = g.reply({ combat: { by: 'wolf' } });
    const enc = g.state.encounter;
    assert.ok(enc.ambush);
    assert.deepEqual([enc.round, enc.current, steps(enc.log)], [1, 'pc', ['0:mon.wolf:opening', '1:mon.wolf']]);
    const panel = turnPanel(before, content, null, r);
    assert.match(panel, /^`COMBAT START — AMBUSH — Wolf A attacks Alaric`\n`Initiative: [^\n]*\n`— Opening Action \(Ambush\) —`\n`Wolf A[^\n]*\(AMBUSH opening\)[^\n]*\n[^\n]*AMBUSH CRIT[^\n]*\n`— Round 1 —`\n`Wolf A: /);
    const t = g.input('*I Heavy Slash Wolf A*');
    assert.deepEqual(steps(t.outcome.records).slice(0, 3), ['0:mon.wolf:opening', '1:mon.wolf', '1:pc']);
    assert.equal(g.state.encounter ? g.state.encounter.log.filter((x) => x.opening).length : 1, 1, 'one Opening Action');
    assert.equal(g.state.encounter ? g.state.encounter.log.filter((x) => x.round === 1 && x.actor === 'mon.wolf').length : 1, 1, 'one Round 1 Turn of the wolf');
});

test('the same reply gives the same fight: its Turns come from the dice in the state before it (swipes, report requests)', () => {
    const g = warrior();
    g.reply({ new: [{ ref: 'bandit', kind: 'npc', desc: ['bandit'], band: 'SHORT' }] });
    g.input('"Stand aside."');
    const text = 'The bandit draws.\n<avereth>{"combat":{"by":"bandit"}}</avereth>';
    const a = narratorReply(g.state, content, text);
    const b = narratorReply(g.state, content, text);
    assert.deepEqual(a.events, b.events);
    assert.ok(a.opened.records.length > 0);
    assert.equal(a.events.find((e) => e.t === 'encounter.started').rng_to, a.state.rng.n);
});

test('while the reply\'s attackers are still asked for, the fight is only fixed: nothing resolves before they are known', () => {
    const g = warrior();
    g.input('I go down into the cellar.');
    const r = g.reply({ new: [{ ref: 'big', kind: 'creature', name: 'Big rat', species: 'rat', band: 'ENGAGED' }], combat: { by: ['big', 'rat pack — two more behind it'] } });
    assert.equal(r.attackers.length, 1);
    const enc = g.state.encounter;
    assert.deepEqual([enc.round, enc.log], [0, []]);
    assert.equal(r.opened.records, undefined);
});
