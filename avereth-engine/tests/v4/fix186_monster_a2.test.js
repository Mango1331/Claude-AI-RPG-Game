// Build .186 package 2 – Monster A2 (patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md §2.3, §3.2, §5.2; GPT §8.3,
// Opus §9 K3–K7; the conservative pilot choices D1–D5, D7, D8 = no): a humanoid creature's weapon is fixed once with its
// profile (profile.gear) – the weapon its creation report states (creature.new armed, for a group only when shown for all
// of them), else its anchor's loadout by weight from its own key – and fight, cards and loot read that one thing. Values
// stay the anchor's; a focus or bow changes no attack; a profile fixed before A2 keeps the old loot chance; A1 unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { lootEvents } from '../../src/v4/loot.js';
import { creatureGear } from '../../src/engine.js';
import { buildContext } from '../../src/context.js';
import { foldChat, rec } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { campaign, say, outcomeOf, lastUser } from './patch8_lib.js';

const content = await loadProductContent();
const A = (id) => content.anchors.get(id);
const FIGHTS = Array.from({ length: 16 }, (_, i) => `enc.t${i + 1}`);
const gearOf = (species, anchor, more = {}, s = { entities: {}, dungeons: {} }) => creatureGear(s, content, { id: more.id || 'mon.x', species, ...more }, A(anchor));
/** A dead foe with this profile, looted in one fight. */
function loot(foeProfile, { enc = 'enc.t9', species = 'goblin scout', anchor = 'goblin', id = 'mon.x' } = {}) {
    const s = { turn: 9, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: 0, inventory: {}, equipment: {} } },
        [id]: { id, status: 'dead', kind: 'creature', species, descriptors: [], traits: '', anchor, profile: { anchor, rank: 'F', level: 1, attack: { name: 'x' }, ...foeProfile } } }, objects: {}, scene: { present: ['pc'] } };
    return lootEvents(s, content, { id: enc, combatants: { pc: { id: 'pc', current: { hp: 20 } }, [id]: { id, current: { hp: 0 } } } });
}
const weapons = (x) => x.events.filter((e) => e.t === 'object.created' && e.d.object.gear?.slot === 'weapon').map((e) => e.d.object);
const goblin = (more = {}) => ({ seq: 1, type: 'creature.new', ref: 'goblin', species: 'goblin scout', anchor: 'goblin', desc: ['a small grey-green goblin'], count: 1, present: true, band: 'SHORT',
    cluster: null, stronger: null, threat: null, more: null, population: 'independent', life_stage: 'adult', armed: null, ...more });
async function meet(deltas, prose = 'Goblins look up from a cold fire.') {
    const g = await campaign(content);
    await say(g, '*I look around*');
    const r = await g.reply(prose, { expected: {}, deltas });
    assert.equal(r.record.extraction.status, 'applied', JSON.stringify(r.record.extraction));
    const s = g.state();
    return { g, s, r, made: Object.values(s.entities).filter((e) => e.kind === 'creature') };
}

// ------------------------------------------------------------------------------------------------ the loadout (D1, D4)
test('.186 A2 Q1/D1: a goblin without a statement gets its loadout once: knife 6, spear 3, none 1 by its own key; ogre club, shaman fetish', () => {
    const n = { 'Crude knife': 0, 'Crude spear': 0, none: 0 };
    for (let i = 0; i < 400; i++) { const g = gearOf('goblin scout', 'goblin', { id: `mon.goblin_${i}` }); n[g.weapon ? g.weapon.name : 'none']++; assert.equal(g.source, g.weapon ? 'default' : 'none'); }
    assert.ok(n['Crude knife'] > 200 && n['Crude knife'] < 280 && n['Crude spear'] > 90 && n['Crude spear'] < 150 && n.none > 20 && n.none < 65, JSON.stringify(n));
    assert.deepEqual(gearOf('goblin scout', 'goblin', { id: 'mon.goblin_7' }), gearOf('goblin scout', 'goblin', { id: 'mon.goblin_7' }), 'the same key, the same weapon');
    const ogre = gearOf('hill ogre', 'ogre');
    assert.deepEqual([ogre.weapon.name, ogre.weapon.attack, ogre.weapon.atk, ogre.weapon.item], ['Club', 'Club', 4, 'Hill Ogre Club']);
    const troll = gearOf('cave troll', 'ogre');
    assert.equal(troll.weapon.item, 'Cave Troll Club', 'a troll is an ogre-like: club');
    const shaman = gearOf('goblin shaman', 'goblin_shaman');
    assert.deepEqual([shaman.weapon.item, shaman.weapon.attack, shaman.weapon.family], ['Crude Goblin Shaman Fetish', null, 'focus']);
    for (const [species, anchor] of [['grey wolf', 'wolf'], ['cellar rat', 'rat'], ['skeleton', 'skeleton'], ['bog slime', 'slime']]) assert.equal(gearOf(species, anchor), null, `${anchor}: no gear`);
});

test('.186 A2 D4: the expected weapon loot stays about as before (goblin ≈ 0.5, ogre 0.7, shaman 0.4), from the profile\'s weapon only', () => {
    const rate = (species, anchor, n = 400) => {
        let got = 0;
        for (let i = 0; i < n; i++) got += weapons(loot({ gear: gearOf(species, anchor, { id: `mon.f${i}` }) }, { enc: `enc.t${i}`, species, anchor, id: `mon.f${i}` })).length;
        return got / n;
    };
    const gob = rate('goblin scout', 'goblin'), ogre = rate('hill ogre', 'ogre'), shaman = rate('goblin shaman', 'goblin_shaman');
    assert.ok(gob > 0.42 && gob < 0.58, `goblin ${gob}`);
    assert.ok(ogre > 0.62 && ogre < 0.78, `ogre ${ogre}`);
    assert.ok(shaman > 0.32 && shaman < 0.48, `shaman ${shaman}`);
});

// ------------------------------------------------------------------------------------------------ loot from the profile
test('.186 A2 Q4/Q5: the profile\'s weapon is the loot whether used or not; a failed salvage is "broken" with no object; never a second weapon', () => {
    const spear = gearOf('goblin scout', 'goblin', { armed: 'short spear' });
    let kept = 0, broken = 0;
    for (const enc of FIGHTS) {
        const x = loot({ gear: spear }, { enc });
        const w = weapons(x);
        assert.ok(w.length <= 1);
        if (w.length) { kept++; assert.equal(w[0].name, 'F-Rank Goblin Scout Short Spear'); assert.equal(w[0].gear.atk, 2); assert.equal(w[0].profile.family, 'melee'); }
        else { broken++; assert.ok(x.lines.includes('Goblin Scout Short Spear — broken, nothing worth taking'), JSON.stringify(x.lines)); }
        assert.ok(!w.some((o) => /Knife/.test(o.name)), 'no knife of the old table beside it');
    }
    assert.ok(kept > 0 && broken > 0, `${kept} kept, ${broken} broken`);
    const none = gearOf('goblin scout', 'goblin', { armed: 'unarmed' });
    for (const enc of FIGHTS) assert.deepEqual(weapons(loot({ gear: none }, { enc })), [], 'R1: unarmed leaves no weapon');
});

test('.186 A2 Q6/R7/D2: the shaman\'s fetish and a stated bow are carried and looted, and change no attack', () => {
    const shaman = gearOf('goblin shaman', 'goblin_shaman');
    assert.equal(shaman.weapon.attack, null);
    const fetish = FIGHTS.flatMap((enc) => weapons(loot({ gear: shaman }, { enc, species: 'goblin shaman', anchor: 'goblin_shaman' })));
    assert.ok(fetish.length > 0 && fetish.every((o) => o.name === 'F-Rank Crude Goblin Shaman Fetish' && o.profile.family === 'focus' && o.gear.atk === 1));
    const bow = gearOf('goblin scout', 'goblin', { armed: 'a short bow slung on its back' });
    assert.deepEqual([bow.weapon.family, bow.weapon.attack, bow.weapon.atk], ['bow', null, 2], 'R7: a bow is carried; its values the goblin\'s best');
});

test('.186 A2 R6/D3: a stated weapon is named by its words and has the anchor\'s values, never the human catalogue\'s', () => {
    const sword = gearOf('goblin scout', 'goblin', { armed: 'a fine steel longsword' });
    assert.deepEqual([sword.weapon.name, sword.weapon.attack, sword.weapon.atk, sword.weapon.item, sword.source], ['Steel longsword', 'Steel longsword', 2, 'Goblin Scout Steel Longsword', 'stated']);
    const club = gearOf('hill ogre', 'ogre', { armed: 'a tree-trunk club' });
    assert.equal(club.weapon.atk, 4);
    assert.deepEqual(gearOf('goblin scout', 'goblin', { armed: 'bare hands' }), { weapon: null, source: 'stated' });
    const vague = gearOf('goblin scout', 'goblin', { id: 'mon.goblin_7', armed: 'something shiny' });
    assert.deepEqual(vague, gearOf('goblin scout', 'goblin', { id: 'mon.goblin_7' }), 'words naming no weapon are no statement: the loadout');
});

test('.186 A2 R5/D5/K6: a profile fixed before A2 (no gear) keeps the old chance of the gear table exactly; the table is still there', () => {
    const table = content.monsters.loot.anchors;
    assert.deepEqual(table.goblin.gear, [{ name: 'Crude {species} Knife', slot: 'weapon', chance: 0.5, atk: 2 }]);
    assert.equal(table.ogre.gear[0].chance, 0.7);
    assert.equal(table.goblin_shaman.gear[0].chance, 0.4);
    let knives = 0;
    for (const enc of FIGHTS) {
        const w = weapons(loot({}, { enc }));
        knives += w.filter((o) => o.name === 'F-Rank Crude Goblin Scout Knife').length;
        assert.ok(w.every((o) => /Knife$/.test(o.name)), 'only the old knife');
    }
    assert.ok(knives > 0 && knives < 16, `${knives}: the old 0.5 chance`);
});

test('.186 A2 Q3/D7: a Dungeon slot member\'s weapon follows its place in the slot (not its id); a guardian or boss takes the same loadout', () => {
    const s = { entities: {}, dungeons: { 'loc.warrens': { run: { floors: { 1: { slots: [{ id: 'sl1', entities: ['mon.a', 'mon.b', 'mon.c'] }] } } } } } };
    const at = (id, i, role = 'minion') => creatureGear(s, content, { id, species: 'goblin scout', slot: { dungeon: 'loc.warrens', cycle: 1, floor: 1, id: 'sl1', role } }, A('goblin'));
    const first = ['mon.a', 'mon.b', 'mon.c'].map((id, i) => at(id, i));
    s.dungeons['loc.warrens'].run.floors[1].slots[0].entities = ['mon.x', 'mon.y', 'mon.z'];
    assert.deepEqual(['mon.x', 'mon.y', 'mon.z'].map((id, i) => at(id, i)), first, 'the same places, the same weapons');
    assert.deepEqual(at('mon.x', 0, 'boss').weapon?.name ?? null, first[0].weapon?.name ?? null, 'D7: no better weapon for a boss');
});

// ------------------------------------------------------------------------------------------------ the real path
test('.186 A2 Q2/K7 host path: a goblin reported with a short spear is fixed with it; its card says so; it fights with it (ATK unchanged); reload equal', async () => {
    const { g, s, made } = await meet([goblin({ armed: 'short spear' })], 'A goblin snatches a short spear from the wall.');
    const gob = made[0];
    assert.equal(gob.armed, 'short spear');
    assert.deepEqual(gob.profile.gear, { weapon: { name: 'Short spear', item: 'Goblin Scout Short Spear', attack: 'Short spear', family: 'melee', slot: 'weapon', atk: 2, matk: 0, from: 'short spear' }, source: 'stated' });
    assert.deepEqual(gob.profile.attack, { name: 'Short spear', damage_type: 'physical', range: 'ENGAGED', weapon: true });
    assert.equal(gob.profile.atk, Math.round(A('goblin').atk), 'L1 ATK of the anchor, unchanged');
    assert.ok(!Object.values(s.objects).some((o) => o.holder?.entity === gob.id), 'K5: no object before its death');
    assert.match(buildContext(s, content, { input: 'I look at the goblin.', outcome: { c: true }, budget: 8000 }).text, /creature \(goblin scout\); armed: short spear/);
    await say(g, '*i attack the goblin*', { type: 'use_skill', skill: null, target: gob.id, quote: 'i attack the goblin' });
    const mine = (outcomeOf(g).records || []).filter((x) => x.actor === gob.id);
    assert.ok(mine.length > 0, `the goblin acts: ${JSON.stringify((outcomeOf(g).records || []).map((x) => x.actor))}`);
    for (const x of mine) { assert.equal(x.skill_name, 'Short spear'); assert.match(x.raw_text, /^Short spear Raw = ATK \d+$/); }
    assert.ok(g.state().encounter, 'the fight goes on');
    assert.match(buildContext(g.state(), content, { input: 'x', outcome: { c: true }, budget: 8000 }).text, /: L\d+ F Goblin-like; armed: short spear; /);
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(again, g.state(), 'Q8: reload gives the same profile and fight');
    assert.deepEqual(validateState(again, content), []);
});

test('.186 A2 K3 host path: a group of three with one stated weapon has it each (shown for all); without a statement each its own loadout, no share-out', async () => {
    const all = await meet([goblin({ ref: 'goblins', count: 3, armed: 'short spear' })], 'Three goblins level short spears at him.');
    assert.equal(all.made.length, 3);
    assert.ok(all.made.every((e) => e.profile.gear.weapon?.name === 'Short spear'), 'the contract: shown for every one');
    const own = await meet([goblin({ ref: 'goblins', count: 3, armed: null })], 'Three goblins; two snatch short spears from the wall.');
    for (const e of own.made) assert.deepEqual(e.profile.gear, gearOf('goblin scout', 'goblin', { id: e.id }), `${e.id}: its own loadout`);
    assert.ok(own.made.every((e) => e.armed === undefined), 'no armed without a statement');
});

test('.186 A2 against: a wolf "armed" is ignored (R2); the look names no weapon (R3); a person keeps the person path (R4); a creature fixed before ignores a later weapon (R8)', async () => {
    const w = await meet([{ ...goblin({ ref: 'wolf', species: 'grey wolf', anchor: 'wolf', desc: ['a grey wolf'], armed: 'knife' }) }], 'A grey wolf.');
    assert.equal(w.made[0].armed, undefined);
    assert.equal(w.made[0].profile.gear, undefined);
    assert.equal(w.made[0].profile.attack.name, A('wolf').attack, 'its own attack');
    const look = await meet([goblin({ desc: ["a goblin who eyes Alaric's sword"] })]);
    assert.deepEqual(look.made[0].profile.gear, gearOf('goblin scout', 'goblin', { id: look.made[0].id }), 'R3: the look states no weapon');
    const p = await meet([{ seq: 1, type: 'person.new', ref: 'bandit', name: 'Garrick', role: 'bandit', desc: ['scarred'], armed: 'short sword', present: true, relevant: true, threat: true, at: null, band: 'SHORT' }], 'A bandit.');
    const garrick = Object.values(p.s.entities).find((e) => e.name === 'Garrick');
    assert.equal(garrick.profile, undefined, 'R4: no creature profile for a person');
    const later = await meet([goblin()]);
    const id = later.made[0].id, fixed = structuredClone(later.made[0].profile);
    await say(later.g, '*I watch*');
    await later.g.reply('The goblin picks up a rusty sword.', { expected: {}, deltas: [{ seq: 1, type: 'fact', s: id, p: 'armed', o: 'rusty sword' }] });
    assert.deepEqual(later.g.state().entities[id].profile, fixed, 'R8: the profile stays as fixed');
});
