// Build .184 – Monster A1-α (patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md §3.1, §5.1, GPT §8, Opus §9 K1/K2;
// D6 and D9 as approved): a special organ (antler, horn, tusk, venom, slime core) only from a creature whose own kind,
// name or full description shows it, never from one whose own words deny it, and never because of its anchor's attack;
// horn as a material; hare/rabbit are rats; "… of the …" is no part of the kind a material is named and stacked after.
// Loot is drawn per fight and foe (qty [0, n]): "possible" is checked over 16 fights (at least one), "none" over the same
// 16 (never). No A2: humanoid gear stays the old chance (goblin, ogre, shaman).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { lootEvents } from '../../src/v4/loot.js';
import { campaign, say } from './patch8_lib.js';

const content = await loadProductContent();
const FIGHTS = Array.from({ length: 16 }, (_, i) => `enc.t${i + 1}`);

function foe(id, species, anchor, { desc = [], traits = '', name = null, attack } = {}) {
    return { id, status: 'dead', kind: 'creature', species, name, descriptors: desc, traits, anchor,
        profile: { anchor, rank: 'F', level: 1, attack: { name: attack ?? content.anchors.get(anchor)?.attack ?? 'Bite' } } };
}
function fight(foes, { enc = 'enc.t9', objects = {} } = {}) {
    const s = { turn: 9, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: 0, inventory: {}, equipment: {} } } }, objects, scene: { present: ['pc'] } };
    const combatants = { pc: { id: 'pc', current: { hp: 20 } } };
    for (const f of foes) { s.entities[f.id] = f; combatants[f.id] = { id: f.id, current: { hp: 0 } }; }
    return lootEvents(s, content, { id: enc, combatants });
}
/** The materials this one creature yields over 16 fights. */
function yields(species, anchor, opts = {}) {
    const got = new Set();
    for (const enc of FIGHTS) for (const e of fight([foe('mon.x', species, anchor, opts)], { enc }).events)
        if (e.t === 'object.created' && e.d.object.material) got.add(e.d.object.material);
    return got;
}
const has = (species, anchor, material, opts) => yields(species, anchor, opts).has(material);

// ------------------------------------------------------------------------------------------------ §5.1 P1–P9
test('.184 A1 P1–P7: the organ a kind or a creature\'s own words show is possible', () => {
    for (const [why, species, anchor, material, opts] of [
        ['P1 red stag: antler', 'red stag', 'deer', 'antler'],
        ['P1 red stag: hide', 'red stag', 'deer', 'hide'],
        ['P2 antlered doe (its own description)', 'doe', 'deer', 'antler', { desc: ['antlered doe, rare'] }],
        ['P3 mountain goat: horn', 'mountain goat', 'deer', 'horn', { desc: ['curled horns'] }],
        ['P4 ox: horn', 'ox', 'horse', 'horn'],
        ['P4 ox: hide', 'ox', 'horse', 'hide'],
        ['P5 dock spider: venom gland (its kind)', 'dock spider', 'arthropod', 'venom'],
        ['P6 marsh viper: venom sac', 'marsh viper', 'serpent', 'venom'],
        ['P7 tusked troll: tusk', 'tusked troll', 'ogre', 'tusk'],
        ['D6 mineral slime: core (its kind)', 'mineral slime', 'slime', 'core'],
        ['D6 a slime with a crystal core in its description', 'cave ooze', 'slime', 'core', { desc: ['a crystal core glints inside it'] }],
    ]) assert.ok(has(species, anchor, material, opts), why);
    assert.ok(!has('mountain goat', 'deer', 'antler', { desc: ['curled horns'] }), 'P3: a goat has horns, no antler');
});

test('.184 A1 P8/K2: "feral dog of the millpond" yields "F-Rank Feral Dog Fang", stacked as a feral dog (.183: "Of The Millpond Fang")', () => {
    const x = fight([foe('mon.d', 'feral dog of the millpond', 'wolf')]);
    const fang = x.events.find((e) => e.t === 'object.created' && e.d.object.material === 'fang').d.object;
    assert.equal(fang.name, 'F-Rank Feral Dog Fang');
    assert.equal(fang.id, 'obj.loot.feral_dog.fang.f');
    assert.equal(fang.species, 'Feral Dog');
});

test('.184 A1 P9: an organ told after the 40 characters of a descriptor counts once the whole description is the creature\'s look', () => {
    const long = 'a big old red deer of the eastern hills, with a heavy rack of antlers';
    const cut = long.toLowerCase().slice(0, 40);
    assert.ok(!cut.includes('antler'));
    assert.ok(!has('red deer', 'deer', 'antler', { desc: [cut] }), 'the 40-character descriptor alone hides it');
    assert.ok(has('red deer', 'deer', 'antler', { desc: [cut], traits: long }), 'its full look shows it');
});

// ------------------------------------------------------------------------------------------------ §5.1 N1–N9, GPT §8.4, K1
test('.184 A1 N1–N8 and the negative cases of GPT §8.4/K1: no organ the creature\'s kind does not have or its own words deny', () => {
    for (const [why, species, anchor, material, opts] of [
        ['N1 doe', 'doe', 'deer', 'antler'],
        ['N1 hind', 'hind', 'deer', 'antler'],
        ['N1 deer', 'deer', 'deer', 'antler'],
        ['N2 goat: no antler', 'goat', 'deer', 'antler'],
        ['N4 bog beetle: no venom gland despite the anchor attack "Bite/Sting"', 'bog beetle', 'arthropod', 'venom'],
        ['N5 ogre without a tusk word', 'ogre', 'ogre', 'tusk'],
        ['N6 hornless goat', 'hornless goat', 'deer', 'horn'],
        ['N8 marsh serpent', 'marsh serpent', 'serpent', 'venom'],
        ['K1 doe without antlers', 'doe', 'deer', 'antler', { desc: ['doe without antlers'] }],
        ['K1 deer without antlers', 'red deer', 'deer', 'antler', { desc: ['a red deer without its antlers'] }],
        ['K1 stag that lost its antlers (the kind word loses)', 'stag', 'deer', 'antler', { desc: ['an old stag that lost both antlers'] }],
        ['K1 dehorned goat', 'goat', 'deer', 'horn', { desc: ['dehorned goat'] }],
        ['K1 goat without horns', 'goat', 'deer', 'horn', { desc: ['goat without horns'] }],
        ['K1 tuskless ogre', 'tuskless ogre', 'ogre', 'tusk'],
        ['K1 non-venomous grass snake (wrong already in .183)', 'grass snake', 'serpent', 'venom', { desc: ['non-venomous grass snake'] }],
        ['K1 grass snake, not poisonous (wrong already in .183)', 'grass snake', 'serpent', 'venom', { desc: ['grass snake, not poisonous'] }],
        ['K1 a harmless adder', 'adder', 'serpent', 'venom', { desc: ['a harmless old adder'] }],
        ['K1 a spider without venom', 'cellar spider', 'arthropod', 'venom', { desc: ['a cellar spider without any venom'] }],
        ['D6 a plain slime: no core', 'green slime', 'slime', 'core'],
        ['D6 a coreless crystal slime', 'crystal slime', 'slime', 'core', { desc: ['coreless crystal slime'] }],
        ['N7 antler beetle: no antler (not a material of its body plan)', 'antler beetle', 'arthropod', 'antler'],
    ]) assert.ok(!has(species, anchor, material, opts), why);
    assert.ok(has('doe', 'deer', 'antler', { desc: ['rare antlered doe'] }), 'K1 positive contrast: rare antlered doe');
    assert.ok(has('ox', 'horse', 'horn', { desc: ['a broad grey ox'] }), 'the ox keeps its horn');
    assert.ok(!has('horse', 'horse', 'horn'), 'a horse has no horn');
});

test('.184 A1 N9 unchanged: a foe that fled, surrendered or survived, and a fight Alaric fled, leave nothing', () => {
    const base = foe('mon.s', 'red stag', 'deer');
    const s = { turn: 9, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: 0, inventory: {}, equipment: {} } }, 'mon.s': base }, objects: {}, scene: { present: ['pc'] } };
    for (const current of [{ hp: 0, escaped: true }, { hp: 0, surrendered: true }]) assert.deepEqual(lootEvents(s, content, { id: 'enc.t1', combatants: { pc: { id: 'pc', current: { hp: 20 } }, 'mon.s': { id: 'mon.s', current } } }).events, []);
    assert.deepEqual(lootEvents({ ...s, entities: { ...s.entities, 'mon.s': { ...base, status: 'alive' } } }, content, { id: 'enc.t1', combatants: { pc: { id: 'pc', current: { hp: 20 } }, 'mon.s': { id: 'mon.s', current: { hp: 5 } } } }).events, []);
    assert.deepEqual(lootEvents(s, content, { id: 'enc.t1', combatants: { pc: { id: 'pc', current: { hp: 20, escaped: true } }, 'mon.s': { id: 'mon.s', current: { hp: 0 } } } }).events, []);
});

// ------------------------------------------------------------------------------------------------ K2 stack identity
test('.184 A1 K2: two kinds "of the millpond" are two stacks; one kind from two places one stack; a stack held from before keeps its id; "of the deep" keeps the old rule', () => {
    const two = fight([foe('mon.d', 'feral dog of the millpond', 'wolf'), foe('mon.c', 'wildcat of the millpond', 'feline')], { enc: 'enc.t3' });
    const ids = two.events.filter((e) => e.t === 'object.created' && e.d.object.material === 'pelt').map((e) => e.d.object.id).sort();
    assert.deepEqual(ids, ['obj.loot.feral_dog.pelt.f', 'obj.loot.wildcat.pelt.f'], '.183 fused both into obj.loot.of_the_millpond.pelt.f');
    const one = fight([foe('mon.d', 'feral dog of the millpond', 'wolf'), foe('mon.e', 'feral dog of the marsh', 'wolf')], { enc: 'enc.t3' });
    const pelts = one.events.filter((e) => e.t === 'object.created' && e.d.object.material === 'pelt').map((e) => e.d.object);
    assert.deepEqual(pelts.map((p) => [p.id, p.qty]), [['obj.loot.feral_dog.pelt.f', 2]]);
    const old = { 'obj.loot.of_the_millpond.pelt.f': { id: 'obj.loot.of_the_millpond.pelt.f', name: 'F-Rank Of The Millpond Pelt', qty: 2, holder: { entity: 'pc' }, rank: 'F', value_cp: 8 } };
    const held = fight([foe('mon.d', 'feral dog of the millpond', 'wolf')], { enc: 'enc.t3', objects: old });
    assert.ok(!held.events.some((e) => e.t === 'object.added' && e.d.id === 'obj.loot.of_the_millpond.pelt.f'), 'the old stack is left as it is');
    assert.ok(held.events.some((e) => e.t === 'object.created' && e.d.object.id === 'obj.loot.feral_dog.pelt.f'));
    const deep = fight([foe('mon.q', 'of the deep', 'aquatic')], { enc: 'enc.t3' });
    assert.ok(deep.events.some((e) => e.t === 'object.created' && /Of The Deep/.test(e.d.object.name)), 'nothing before "of the": the old rule');
});

test('.184 A1: same fight, same loot (deterministic); an ordinary creature\'s base yield is unchanged', () => {
    const a = fight([foe('mon.s', 'red stag', 'deer'), foe('mon.w', 'grey wolf', 'wolf')], { enc: 'enc.t5' });
    assert.deepEqual(fight([foe('mon.s', 'red stag', 'deer'), foe('mon.w', 'grey wolf', 'wolf')], { enc: 'enc.t5' }), a);
    assert.deepEqual([...yields('grey wolf', 'wolf')].sort(), ['fang', 'pelt']);
    assert.deepEqual([...yields('bog beetle', 'arthropod')].sort(), ['chitin']);
});

test('.184 A1 no A2: humanoid gear stays the old chance table (goblin knife, ogre club), coin unchanged', () => {
    let knife = 0, club = 0;
    for (const enc of FIGHTS) {
        const x = fight([foe('mon.g', 'cave goblin', 'goblin'), foe('mon.o', 'ogre', 'ogre')], { enc });
        knife += x.lines.filter((l) => /Crude Cave Goblin Knife/.test(l)).length;
        club += x.lines.filter((l) => /Ogre Club/.test(l)).length;
    }
    assert.ok(knife > 0 && knife < 16 && club > 0 && club < 16, `${knife} knives, ${club} clubs: a chance, not a loadout`);
});

// ------------------------------------------------------------------------------------------------ the real creation path
test('.184 A1 P9/N3 on the real path: creature.new keeps its whole description as its look (descriptors as before); a hare reported as deer is a rat', async () => {
    const g = await campaign(content);
    await say(g, '*I look around*');
    const long = 'a big old red deer of the eastern hills, with a heavy rack of antlers';
    const r = await g.reply('A big old red deer of the eastern hills, with a heavy rack of antlers, and a hare bolt from the hedge.', { expected: {}, deltas: [
        { seq: 1, type: 'creature.new', ref: 'stag', species: 'red deer', anchor: 'deer', desc: [long], count: 1, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: false, more: null, population: 'independent', life_stage: 'adult' },
        { seq: 2, type: 'creature.new', ref: 'hare', species: 'hare', anchor: 'deer', desc: ['a brown hare'], count: 1, present: true, band: 'MEDIUM', cluster: null, stronger: null, threat: false, more: null, population: 'independent', life_stage: 'adult' }] });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    const s = g.state();
    const deer = Object.values(s.entities).find((e) => e.kind === 'creature' && e.species === 'red deer');
    const hare = Object.values(s.entities).find((e) => e.kind === 'creature' && e.species === 'hare');
    assert.equal(deer.traits, long, 'its whole look');
    assert.ok(deer.descriptors.every((d) => d.length <= 40), 'descriptors as before');
    assert.equal(hare.anchor, 'rat', 'N3: the hare is no deer');
    const profiled = { ...deer, status: 'dead', profile: { ...(deer.profile || {}), anchor: deer.anchor, rank: 'F', level: 1, attack: { name: 'Kick/Antler' } } };
    assert.ok(FIGHTS.some((enc) => fight([{ ...profiled, id: 'mon.r' }], { enc }).events.some((e) => e.t === 'object.created' && e.d.object.material === 'antler')));
    const rat = { ...hare, status: 'dead', profile: { ...(hare.profile || {}), anchor: 'rat', rank: 'F', level: 1, attack: { name: 'Bite' } } };
    assert.deepEqual([...new Set(FIGHTS.flatMap((enc) => fight([{ ...rat, id: 'mon.h' }], { enc }).events.filter((e) => e.t === 'object.created').map((e) => e.d.object.material)))].sort(), ['pelt', 'tail']);
});
