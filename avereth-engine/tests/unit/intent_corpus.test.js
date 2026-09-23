// Regression corpus ported from the v1.24 WorldInfo START-trigger tests (tools/validate/regex_tests.js), which were
// validated against real phrasings. The engine must recognise the same hostile declarations and ignore the same idioms.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game } from '../helpers.js';
import { parseIntent } from '../../src/intent.js';

const content = await loadContent();
const DECLARED = new Set(['attack', 'unknown_skill', 'ambiguous_target', 'no_target']);
const ATTACKS = [
    "*i fire using Power Shot*",
    "*I shoot the boar*",
    "I attack the wolf",
    "*i use Power Shot and shoot at it*",
    "*I loose an arrow at the deer*",
    "I fire an arrow",
    "I swing my sword at the goblin",
    "I stab it",
    "I kick the rat",
    "I cast Arcane Bolt at the spirit",
    "I Charge the boar",
    "i use charge on it",
    "*i aim and Power Shot it*",
    "I strike the goblin",
    "I hurl my dagger at the bandit",
    "Twin Shot the wolf",
    "*I lunge at the wolf*",
    "*I charge the boar*",
    "*I charge at the boar with my sword*",
    "*lunges at the wolf*",
    "*I quickly tackle the goblin*",
    "*I ram my shield into it*",
    "*I put an arrow in its eye*",
    "*I send an arrow into the wolf*",
    "*I let an arrow fly at the wolf*",
    "*I let fly*",
    "*I open fire*",
    "*I take the shot*",
    "*I aim and release*",
    "*I draw and loose at the wolf*",
    "*I cut its throat*",
    "*I slit the bandit's throat*",
    "*I go for its throat*",
    "*I bash it with my shield*",
    "*I thrust my rapier into its flank*",
    "*I plunge my dagger into its neck*",
    "*I pierce its hide with an arrow*",
    "*I loose an arrow*",
    "*I fire*",
    "*I strike a match and then stab the rat*"
];
const NOT_ATTACKS = [
    "*i follow the sound as i get my bow ready*",
    "I take a bite of bread",
    "I take aim at the boar",
    "I pay the charge at the gate",
    "a flurry of snow falls",
    "I wander to the forest",
    "I watch the deer graze",
    "I draw my bow",
    "I track the boar",
    "*I hit the road*",
    "*I strike a deal with the merchant*",
    "*I struck up a conversation*",
    "*I cast a glance at the wolf*",
    "*I throw a quick glance toward the door*",
    "*I kill time at the inn*",
    "*I cast my line into the river*",
    "*I shoot a look at Wren*",
    "*I shoot him a smile*",
    "*I punch in the numbers*",
    "*I kick off my boots*",
    "*I kick back and relax*",
    "*I swing by the market*",
    "*I strike a match*",
    "*I fire up the forge*",
    "*I nock an arrow*",
    "*I ready my bow*",
    "*I put my knife in my belt*",
    "*I put the arrows in the quiver*",
    "Am I charged for the room?",
    "*I charge the crystal with mana*",
    "*I let the birds fly*",
    "*I drive the cart toward town*",
    "*I thrust my hands into my pockets*",
    "*I take a bite of the bread*"
];

const g = new Game(content).ranger();
g.reply({ new: ['boar', 'wolf', 'goblin', 'deer', 'rat', 'spirit'].map((s) => ({ ref: s, kind: 'creature', species: s, band: 'MEDIUM' }))
    .concat([{ ref: 'bandit', kind: 'npc', desc: ['bandit'], band: 'MEDIUM' }, { ref: 'Wren', name: 'Wren', kind: 'npc', desc: ['girl'] }]) });

test(`${ATTACKS.length} declared attacks are recognised`, () => {
    for (const t of ATTACKS) assert.ok(DECLARED.has(parseIntent(t, g.state, content).kind), `should declare an attack: ${t}`);
});

test(`${NOT_ATTACKS.length} idioms, preparations and storage phrases do not start combat`, () => {
    for (const t of NOT_ATTACKS) {
        const i = parseIntent(t, g.state, content);
        assert.ok(!DECLARED.has(i.kind), `should not declare an attack: ${t} -> ${i.kind}`);
    }
});

test('threats in dialogue and questions are not commitments (Core #23)', () => {
    for (const t of ['"Drop it or I shoot!" I shout at the bandit.', 'Can I shoot the wolf from here?', 'What if I attack the goblin?',
        '*I lower my bow.* "Next time I will kill you."']) {
        assert.ok(!DECLARED.has(parseIntent(t, g.state, content).kind), t);
    }
    assert.equal(parseIntent('"Die!" I shoot the wolf.', g.state, content).kind, 'attack');
});
