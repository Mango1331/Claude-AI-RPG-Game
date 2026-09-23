// Adversarial cases from the external architecture review (docs/REVIEW_CHATGPT.md): player ownership of voluntary
// PC changes, who fights, who witnessed what, hearsay vs. truth, resurrection, awareness, NPC casters and archers,
// entity resolution across places, and who hears a self-introduction.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, scriptedDice } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { humanSheet } from '../../src/npcgen.js';
import { initEncounter, attackAction } from '../../src/combat.js';
import { knows, PC_NAME_FACT } from '../../src/knowledge.js';

const content = await loadContent();
const inn = () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['innkeeper'] }] });
    return g;
};
const reasons = (r) => r.rejected.map((x) => x.reason).join(' | ');

test('voluntary PC changes need the player\'s own decision; theft and arrest name who forced them', () => {
    const g = inn();
    g.input('I look at the notice board.');
    const r = g.reply({
        location: 'Goldharbor', place: 'cellar', coin: [{ who: 'pc', cp: -30, why: 'room' }],
        items: [{ from: 'pc', to: 'Mara', item: 'standard_arrow', qty: 5 }], quests: [{ title: 'Caravan escort', status: 'active' }],
    });
    assert.equal(r.accepted.length, 0, r.accepted.join(' | '));
    assert.equal((reasons(r).match(/PLAYER OWNERSHIP/g) || []).length, 4, reasons(r)); // travel (with its place), items, coin, quest
    assert.equal(g.state.scene.location, 'loc.tidecross');
    assert.equal(g.state.entities.pc.sheet.inventory.standard_arrow, 20);
    // a question is not a decision; the same things with the player's consent go through
    g.input('Would you sell me a room?');
    assert.match(reasons(g.reply({ coin: [{ who: 'pc', cp: -30, why: 'room' }] })), /PLAYER OWNERSHIP/);
    g.input('"Here, thirty copper for the room." I take the caravan job.');
    const ok = g.reply({ coin: [{ who: 'pc', cp: -30, why: 'room' }], quests: [{ title: 'Caravan escort', status: 'active' }] });
    assert.equal(ok.rejected.length, 0, reasons(ok));
    // taken by force: allowed only when a present NPC does it
    g.input('I sit by the fire.');
    const theft = g.reply({ items: [{ from: 'pc', item: 'standard_arrow', qty: 3, taken_by: 'Mara', why: 'she pockets them' }], place: 'cellar', forced_by: 'Mara' });
    assert.equal(theft.rejected.length, 0, reasons(theft));
    assert.equal(g.state.entities.pc.sheet.inventory.standard_arrow, 17);
    assert.equal(g.state.scene.place, 'cellar');
    assert.match(reasons(g.reply({ place: 'attic', forced_by: 'King Aldren' })), /PLAYER OWNERSHIP/, 'the forcer must be present');
    // a patrol introduced in the same report can arrest him and take him away
    g.input('I finish my drink.');
    const arrest = g.reply({ new: [{ ref: 'watch sergeant', kind: 'npc', desc: ['watchman'] }], location: 'Goldharbor', place: 'harbour gaol', forced_by: 'watch sergeant' });
    assert.equal(arrest.rejected.length, 0, reasons(arrest));
    assert.equal(g.state.scene.place, 'harbour gaol');
    assert.ok(g.state.scene.present.includes('npc.watch_sergeant'));
});

test('only committed NPCs fight: a hostile spectator or a second bandit does not auto-join; every committer does', () => {
    const g = new Game(content).ranger();
    g.reply({
        new: [{ ref: 'bandit A', kind: 'npc', desc: ['bandit'], band: 'MEDIUM' }, { ref: 'brigand B', kind: 'npc', desc: ['brigand'], band: 'MEDIUM' }],
        attitude: [{ who: 'brigand B', delta: -50, why: 'old grudge' }, { who: 'brigand B', delta: -20, why: 'insult' }],
    });
    assert.equal(g.state.relations['rel.npc.brigand_b.attitude.pc'].value, -70, 'two changes in one report add up');
    g.input('I shoot bandit A');
    assert.deepEqual(Object.keys(g.state.encounter.combatants).sort(), ['npc.bandit_a', 'pc']);

    const h = new Game(content).ranger();
    h.reply({ new: [{ ref: 'bandit A', kind: 'npc', desc: ['bandit'], band: 'SHORT' }, { ref: 'brigand B', kind: 'npc', desc: ['brigand'], band: 'SHORT' }] });
    h.input('"Stand aside."');
    h.reply({ combat: [{ by: 'bandit A' }, { by: 'brigand B' }] });
    assert.deepEqual(h.state.pending_combat.map((p) => p.by).sort(), ['npc.bandit_a', 'npc.brigand_b']);
    h.input('I hold my position.');
    assert.deepEqual(Object.keys(h.state.encounter.combatants).sort(), ['npc.bandit_a', 'npc.brigand_b', 'pc']);
    assert.deepEqual(h.state.pending_combat, []);
});

test('being present is not witnessing: an unaware bystander is no witness; "public" means everyone who notices', () => {
    const g = inn();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['dockhand'] }, { ref: 'Ilsa', name: 'Ilsa', kind: 'npc', desc: ['barmaid'] }], aware: [{ who: 'Brom', level: 'unaware' }] });
    g.reply({ memory: [{ text: 'Mara whispered to {pc} about the smugglers', who: ['Mara'] }] });
    assert.deepEqual(g.state.memories.at(-1).witnesses.sort(), ['npc.mara', 'pc']);
    g.reply({ memory: [{ text: '{pc} knocked over a table', who: ['pc'], witnesses: ['Brom'] }] });
    assert.deepEqual(g.state.memories.at(-1).witnesses.sort(), ['npc.brom', 'pc'], 'the narrator may name who saw it');
    g.reply({ memory: [{ text: '{pc} sang a sea shanty', who: ['pc'], public: true }] });
    assert.deepEqual(g.state.memories.at(-1).witnesses.sort(), ['npc.ilsa', 'npc.mara', 'pc'], 'public excludes the unaware');
});

test('hearsay stays hearsay on the NPC card: unknown claims are not marked false, contradicted ones are', () => {
    const g = inn();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['dockhand'] }], facts: [{ s: 'Brom', p: 'status', o: 'alive' }] });
    g.input('I listen to the gossip.');
    g.reply({ learn: [{ who: 'Mara', s: 'Brom', p: 'smuggles', o: 'moonshine', how: 'rumor' }, { who: 'Mara', s: 'Brom', p: 'status', o: 'dead', how: 'told' }] });
    const card = g.context().text;
    assert.match(card, /Brom smuggles moonshine \[suspects\]/);
    assert.doesNotMatch(card, /smuggles moonshine \[suspects — actually FALSE\]/);
    assert.match(card, /Brom status dead \[believes — actually FALSE\]/);
});

test('the dead stay dead: a report cannot revive; awareness is only lost when Alaric hides', () => {
    const g = inn();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc' }], facts: [{ s: 'Brom', p: 'status', o: 'dead', because: 'drowned in the harbour' }] });
    const r = g.reply({ facts: [{ s: 'Brom', p: 'status', o: 'alive', because: 'he was only unconscious' }] });
    assert.match(reasons(r), /resurrection/);
    g.input('I nod to Mara.');
    g.reply({ aware: [{ who: 'Mara', level: 'aware' }] });
    assert.match(reasons(g.reply({ aware: [{ who: 'Mara', level: 'unaware' }] })), /only declared stealth/);
    assert.equal(g.state.scene.awareness['npc.mara'], 'aware');
    g.input('I slip behind the crates and hide.');
    const ok = g.reply({ aware: [{ who: 'Mara', level: 'unaware' }], concealed: ['pc'] });
    assert.equal(ok.rejected.length, 0, reasons(ok));
    assert.equal(g.state.scene.awareness['npc.mara'], 'unaware');
});

/** A hostile hedge mage who knows Arcane Burst, engaged with Alaric. */
function mageFight() {
    const g = new Game(content).ranger();
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'npc.mage', kind: 'npc', name: 'Mage', descriptors: ['mage'], status: 'alive', location: g.state.scene.location } } });
    const sheet = humanSheet(content.templates.get('hedge_mage'), { level: 3 }, content);
    sheet.skills['mage.arcane_burst'] = { prof: 1, pp: 0 };
    applyEvent(g.state, { t: 'entity.sheet_set', d: { id: 'npc.mage', sheet } });
    applyEvent(g.state, { t: 'scene.entered', d: { id: 'npc.mage', band: 'ENGAGED' } });
    const dice = scriptedDice({ d100: [5, 99, 5, 99, 5, 99, 5, 99] });
    const enc = initEncounter(g.state, content, dice, { actor: 'npc.mage', target: 'pc' }, [{ id: 'npc.mage', side: 'hostile' }], 'e');
    return { g, dice, enc };
}

test('an NPC\'s area Skill hits Alaric (not itself) with one shared Hit roll and the full per-target pipeline', () => {
    const { g, dice, enc } = mageFight();
    const r = attackAction({ enc, content, dice, state: g.state }, 'npc.mage', 'pc', 'mage.arcane_burst');
    assert.ok(!r.illegal, r.illegal);
    assert.deepEqual(r.strikes.map((s) => s.target), ['pc']);
    assert.ok(r.strikes[0].hp_after < r.strikes[0].hp_before);
});

test('Alaric\'s area strike shares one Hit roll but respects each target\'s own Barrier', () => {
    const g = new Game(content);
    g.turn('Mage');
    g.turn('Arcane Bolt + Arcane Burst');
    for (const id of ['npc.a', 'npc.b']) {
        applyEvent(g.state, { t: 'entity.created', d: { entity: { id, kind: 'npc', name: id, descriptors: ['bandit'], status: 'alive', location: g.state.scene.location } } });
        applyEvent(g.state, { t: 'entity.sheet_set', d: { id, sheet: humanSheet(content.templates.get('bandit'), { level: 1 }, content) } });
    }
    const dice = scriptedDice({ d100: [5, 99, 5, 99] });
    const enc = initEncounter(g.state, content, dice, { actor: 'pc', target: 'npc.a' }, [{ id: 'npc.a', side: 'hostile' }, { id: 'npc.b', side: 'hostile' }], 'e');
    for (const c of Object.values(enc.combatants)) if (c.id !== 'pc') c.current.band = 'ENGAGED';
    enc.combatants['npc.b'].current.effects.push({ kind: 'barrier', hp: 500, value: 500, source: 'npc.b', expires: 'start_of_source_next_turn', name: 'Test Barrier', round: enc.round });
    const r = attackAction({ enc, content, dice, state: g.state }, 'pc', 'npc.a', 'mage.arcane_burst');
    assert.ok(!r.illegal, r.illegal);
    const hit = Object.fromEntries(r.strikes.map((x) => [x.target, x]));
    assert.ok(hit['npc.a'] && hit['npc.b'], 'both engaged opponents are struck');
    assert.equal(dice.log.filter((x) => x.label.startsWith('hit')).length, 1, 'one shared Hit roll');
    assert.ok(hit['npc.a'].hp_after < hit['npc.a'].hp_before);
    assert.equal(hit['npc.b'].hp_after, hit['npc.b'].hp_before, 'the Barrier absorbs the whole hit on target 2');
    assert.ok(hit['npc.b'].absorbed > 0);
});

test('an NPC archer carries its kit\'s arrows, shoots only what it has, and the use is written back', () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'archer', kind: 'npc', desc: ['archer'], traits: 'longbow, green cloak', band: 'MEDIUM' }] });
    g.input('I Power Shot the archer');
    const sheet = g.state.entities['npc.archer'].sheet;
    assert.equal(sheet.class, 'ranger');
    const shots = (g.state.last.outcome?.records || []).filter((r) => r.actor === 'npc.archer' && r.ammo).reduce((a, r) => a + r.ammo.used, 0);
    assert.equal(sheet.inventory.standard_arrow, 20 - shots);
    if (g.state.encounter) assert.equal(g.state.encounter.combatants['npc.archer'].current.ammo.standard_arrow, 20 - shots);
});

test('a description only identifies someone in the current place: another city\'s guard is a new person', () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'guard', kind: 'npc', desc: ['guard'] }] });
    g.input('I travel to Goldharbor.');
    g.reply({ location: 'Goldharbor', leave: ['guard'] });
    assert.notEqual(g.state.scene.location, 'loc.tidecross');
    const r = g.reply({ new: [{ ref: 'guard', kind: 'npc', desc: ['guard'] }] });
    assert.ok(!r.accepted.some((a) => /known npc\.guard/.test(a)), r.accepted.join(' | '));
    assert.equal(Object.values(g.state.entities).filter((e) => e.descriptors?.includes('guard')).length, 2);
});

test('a self-introduction reaches only the NPC he speaks to', () => {
    const g = inn();
    g.reply({ new: [{ ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['dockhand'] }] });
    g.input('"Mara, my name is Alaric."');
    g.reply({});
    assert.ok(knows(g.state, 'npc.mara', PC_NAME_FACT));
    assert.ok(!knows(g.state, 'npc.brom', PC_NAME_FACT));
    g.input('I raise my cup to everyone. "My name is Alaric."');
    g.reply({});
    assert.ok(knows(g.state, 'npc.brom', PC_NAME_FACT), 'addressing the whole room reaches everyone who notices him');
});

test('an encounter saved before per-combatant ammunition still lets Alaric shoot (snapshot migration)', () => {
    const g = new Game(content).ranger();
    g.reply({ new: [{ ref: 'boar', kind: 'creature', species: 'boar', band: 'MEDIUM' }] });
    g.input('I Power Shot the boar');
    if (!g.state.encounter) return; // the boar died on the first shot: nothing to migrate
    delete g.state.encounter.combatants.pc.current.ammo;
    const t = g.input('I Power Shot the boar');
    assert.ok(!t.outcome.illegal, t.outcome.illegal);
    assert.ok(t.outcome.records.some((r) => r.actor === 'pc' && r.ammo));
});
