// Context builder and System commands: budget, section order, lore precision, System query mode, command panels.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { runCommands } from '../../src/commands.js';
import { applyEvent } from '../../src/state.js';
import { awardXp } from '../../src/progression.js';

const content = await loadContent();

test('section order puts the binding RESOLVED block and the report format last; budget is respected', () => {
    const g = new Game(content).ranger();
    for (let i = 0; i < 60; i++) g.turn(`I wander the market stalls, looking at wares number ${i}`, { time: 5, memory: [{ text: `Alaric haggled at stall ${i} about river trade and copper prices`, imp: 4 }] });
    g.input('I keep walking');
    const c = g.context({ budget: 900 });
    const names = c.sections.map((s) => s.name);
    assert.deepEqual(names.slice(-2), ['resolved', 'report']);
    assert.equal(names[0], 'header');
    const counted = c.sections.filter((s) => !['report', 'rules'].includes(s.name)).reduce((a, s) => a + s.tokens, 0);
    assert.ok(counted <= 900, `scene sections ${counted} tokens`);
});

test('lore is selected by key phrases and the current realm, not by generic words', () => {
    const g = new Game(content).ranger();
    g.input('*I get my bow ready and walk into the forest; my Power Shot feels strong*');
    const c1 = g.context();
    assert.match(c1.text, /SOLMERE/, 'current realm');
    assert.doesNotMatch(c1.text, /VERDANT FANG COURT/, '"forest" alone must not pull a distant forest realm');
    assert.doesNotMatch(c1.text, /EVOLUTION \/ LIFESPAN/, '"power" alone must not pull lifespan lore');
    g.reply({}, 'A notice from the Adventurers\' Guild hangs on the gate.');
    g.input('I read the notice');
    assert.match(g.context().text, /ADVENTURERS' GUILD|Adventurers' Guild/i);
});

test('host tracker blocks in the previous reply do not drive retrieval', () => {
    const g = new Game(content).ranger();
    g.reply({}, 'Quiet road.\n<Blocks><Character_Sheet>Inventory: 5 Silver | Coin: 5 Silver | Dungeon key</Character_Sheet></Blocks>');
    g.input('I keep walking');
    const c = g.context();
    assert.doesNotMatch(c.text, /CURRENCY|DUNGEONS/i);
});

test('#system questions switch the block to System-only mode with the matching rule text', () => {
    const g = new Game(content).ranger();
    const t = g.input('#system Why is my Initiative 9?');
    assert.deepEqual(t.command.llm, { kind: 'system', question: 'Why is my Initiative 9?' });
    const c = g.context({ systemQuery: 'Why is my Initiative 9?' });
    assert.match(c.text, /SYSTEM QUERY/);
    assert.doesNotMatch(c.text, /FACT REPORT/);
    assert.match(c.text, /Initiative = floor\(1\.5 × AGI\)/);
});

test('command panels are computed from state (no LLM) and #assign is the only state change', () => {
    const g = new Game(content).ranger();
    let r = runCommands(g.state, content, '#status #bag #skill Power Shot #combat');
    assert.equal(r.panels.length, 4);
    assert.match(r.panels[0], /Initiative 9 \(floor\(1\.5 × AGI\)\)/);
    assert.doesNotMatch(r.panels[0], /Base Hit|Crit/);
    assert.match(r.panels[1], /Standard Arrow ×20[\s\S]*Coin: 5 Silver \(50 Copper\)/);
    assert.match(r.panels[2], /16 \+ AGI 6×1\.875 \+ ATK 6 = 33\.25/);
    assert.match(r.panels[2], /A legal attack always lands \(no Hit or Crit roll/);
    assert.match(r.panels[3], /INACTIVE/);
    assert.equal(r.events.length, 0);
    for (const e of awardXp(g.state.entities.pc.sheet, 100, content, 'test')) applyEvent(g.state, e);
    r = runCommands(g.state, content, '#assign PER 3 AGI 2 VIT 9 #status');
    assert.equal(r.events.length, 2);
    assert.match(r.panels[0], /VIT \+9: REJECTED/);
    assert.match(r.panels[1], /PER 10/); // 6 + 1 (Level 2 favored) + 3
    assert.equal(g.state.entities.pc.sheet.stats.PER, 7, 'runCommands does not mutate the input state');
    assert.match(runCommands(g.state, content, '#frobnicate').panels[0], /Unknown command/);
});

test('#npc shows only what Alaric knows, never the NPC\'s secrets', () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['smith'] }], facts: [{ s: 'Brom', p: 'member_of', o: 'the Black Hand', vis: 'secret' }, { s: 'Brom', p: 'occupation', o: 'blacksmith' }],
        learn: [{ who: 'pc', s: 'Brom', p: 'occupation', o: 'blacksmith', how: 'witnessed' }] });
    const p = runCommands(g.state, content, '#npc Brom').panels[0];
    assert.match(p, /blacksmith/);
    assert.doesNotMatch(p, /Black Hand/);
});
