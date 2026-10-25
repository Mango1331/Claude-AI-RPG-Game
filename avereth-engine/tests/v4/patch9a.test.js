// Patch 9A (docs/PATCH9A_STARTING_CLASSES.md): three starting classes (Warrior, Mage, Rogue) with the two-of-six starter
// choice, a weapon's own plain attack for any class (a bow: Bow Shot), human NPCs whose class and combat training are
// separate (untrained people, trained fighters with two starter Skills by role), the campaign's ruleset fixed at its
// start (a legacy campaign keeps its five classes, its NPC templates and its texts) and the combat HUD's full actions.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, loadProductContent, Game, scriptedDice, ROOT } from '../helpers.js';
import { applyEvent, fold } from '../../src/state.js';
import { materialise } from '../../src/engine.js';
import { actionsOf, weaponAttackOf, deriveCharacter } from '../../src/derived.js';
import { initEncounter, attackAction, skillAction } from '../../src/combat.js';
import { scaleCreature, humanSheet, chooseStarters, starterRoles } from '../../src/npcgen.js';
import { runCommands } from '../../src/commands.js';
import { renderHud } from '../../src/hud.js';
import { rulesTextFor } from '../../src/content.js';
import { foldChat } from '../../src/host.js';
import { campaign, say, inject, outcomeOf } from './patch8_lib.js';

const content = await loadProductContent();
const legacy = await loadContent(); // the tests' legacy world: a campaign started there plays by ruleset 1

/** A new campaign (ruleset 2) with this class and these two starter Skills. */
function hero(cls, skills, c = content) {
    const g = new Game(c);
    g.input(cls);
    g.input(skills);
    return g;
}
const sheet = (g) => g.state.entities.pc.sheet;
const panel = (g, text) => runCommands(g.state, g.content, text).panels.join('\n');

function spawn(g, id, { anchor = 'boar', band = 'ENGAGED', cover = 'none', hp = null } = {}) {
    const p = { ...scaleCreature(g.content.anchors.get(anchor), 1, 'normal', g.content), ...(hp ? { max_hp: hp, hp } : {}) };
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: [anchor], anchor, species: anchor, status: 'alive', location: g.state.scene.location, profile: p } } });
    applyEvent(g.state, { t: 'scene.entered', d: { id, band, cover } });
    applyEvent(g.state, { t: 'scene.awareness', d: { id, level: 'aware' } });
}
const fight = (g, ids, dice = scriptedDice({ variance: [1, 1, 1, 1] })) => ({ enc: initEncounter(g.state, g.content, dice, { actor: 'pc', target: ids[0] }, ids.map((id) => ({ id, side: 'hostile' })), 'enc.test'), content: g.content, dice, state: g.state });
/** He holds a bow (and carries arrows): the engine's own events, a test's precondition. */
function bow(g, arrows) {
    applyEvent(g.state, { t: 'item.equipped', d: { id: 'pc', slot: 'weapon', item: 'starter_shortbow' } });
    if (arrows) applyEvent(g.state, { t: 'item.changed', d: { id: 'pc', item: 'standard_arrow', qty: arrows } });
}

// ------------------------------------------------------------------------------------------------ A. creation
test('9A A1-A4, A8-A9: Warrior, Mage (Flame Lance + Blink) and Rogue each choose two of their six; one Basic Attack, the kit, the favored stats, no Passive', () => {
    const cases = [
        ['Warrior', 'Heavy Slash + Guard', 'warrior', ['warrior.heavy_slash', 'warrior.guard'], ['starter_longsword_r2', 'starter_heavy_armor'], { STR: 8, VIT: 8 }],
        ['Mage', 'Flame Lance + Blink', 'mage', ['mage.flame_lance', 'mage.blink'], ['starter_arcane_staff_r2', 'starter_light_robes'], { INT: 8, WIL: 8 }],
        ['Rogue', 'Razor Cut + Long Lunge', 'rogue', ['rogue.razor_cut', 'rogue.long_lunge'], ['starter_dagger_r2', 'starter_light_armor'], { AGI: 8, PER: 8 }],
    ];
    for (const [cls, skills, id, chosen, kit, favored] of cases) {
        const g = hero(cls, skills);
        const s = sheet(g);
        assert.equal(g.state.meta.ruleset, 2);
        assert.equal(g.state.mode, 'story', cls);
        assert.equal(s.class, id);
        const basics = Object.keys(s.skills).filter((x) => content.skills.get(x).basic);
        assert.deepEqual(basics, [`${id}.basic_attack`], `${cls}: exactly one Basic Attack`);
        assert.deepEqual(Object.keys(s.skills).filter((x) => !content.skills.get(x).basic).sort(), [...chosen].sort());
        for (const v of Object.values(s.skills)) assert.deepEqual(v, { prof: 1, pp: 0 });
        assert.deepEqual([s.equipment.weapon, s.equipment.armor], kit);
        for (const [k, v] of Object.entries(favored)) assert.equal(s.stats[k], v, `${cls} ${k}`);
        const dv = deriveCharacter(s, content);
        assert.deepEqual([s.hp, s.mp, s.sta], [dv.maxHp, dv.maxMp, dv.maxSta], `${cls}: full resources`);
        assert.equal(s.passives, undefined, 'no starter Passive');
        assert.equal(s.bonuses, undefined, 'no permanent bonus');
        assert.match(panel(g, '#class'), /Passives: none/);
    }
    const r = sheet(hero('Rogue', 'Razor Cut + Feint'));
    assert.equal(content.items.get(r.equipment.weapon).family, 'precision');
    assert.deepEqual([content.items.get('starter_dagger').atk, content.items.get('starter_light_armor').def, content.items.get('starter_light_armor').mdef], [6, 2, 3]);
});

test('9A A5-A7: exactly two distinct pool Skills; another pool\'s, a third or a double is refused; Guardian/Duelist/Ranger are no starting class of a new campaign', () => {
    const g = new Game(content);
    const menu = g.input('hello').command.panels[0];
    assert.match(menu, /- Warrior — Favored Stats STR \/ VIT\n- Mage — Favored Stats INT \/ WIL\n- Rogue — Favored Stats AGI \/ PER/);
    assert.doesNotMatch(menu, /Guardian|Duelist|Ranger/);
    for (const cls of ['Ranger', 'Duelist', 'Guardian']) {
        const p = g.input(cls).command.panels[0];
        assert.match(p, new RegExp(`${cls} is not a starting Base Class of this campaign \\(choose Warrior, Mage, Rogue\\)`));
        assert.equal(g.state.creation.step, 1, `${cls}: still step 1`);
        assert.equal(sheet(g).class, null);
    }
    g.input('Rogue');
    const minute = g.state.clock.minute;
    for (const bad of ['Razor Cut + Feint + Long Lunge', 'Razor Cut + Razor Cut', 'Heavy Slash + Feint', 'Aimed Shot + Evasive Step']) {
        const p = g.input(bad).command.panels[0];
        assert.match(p, /Not a valid Skill choice: Select exactly 2 distinct Skills/, bad);
        assert.equal(g.state.creation.step, 2, bad);
    }
    assert.equal(sheet(g).equipment.weapon, undefined, 'no kit before step 2 is complete');
    g.input('Piercing Thrust + Guarded Cut');
    assert.equal(g.state.mode, 'story');
    assert.equal(Object.keys(sheet(g).skills).length, 3);
    // A10: creation took no time and made no world: nothing but the PC, the clock where it began
    assert.equal(g.state.clock.minute, minute);
    assert.deepEqual(Object.values(g.state.entities).filter((e) => e.kind !== 'location').map((e) => e.id), ['pc']);
});

test('9A A7 (legacy): a campaign started before Patch 9A keeps its five classes, the Ranger and his pool', () => {
    const g = new Game(legacy);
    assert.equal(g.state.meta.ruleset, 1);
    const menu = g.input('hello').command.panels[0];
    for (const cls of ['Warrior', 'Mage', 'Guardian', 'Duelist', 'Ranger']) assert.match(menu, new RegExp(`- ${cls} — `));
    assert.doesNotMatch(menu, /Rogue/);
    assert.match(g.input('Rogue').command.panels[0], /Rogue is not a starting Base Class of this campaign \(choose Warrior, Mage, Guardian, Duelist, Ranger\)/);
    g.input('Ranger');
    g.input('Aimed Shot + Power Shot');
    assert.equal(sheet(g).class, 'ranger');
    assert.deepEqual(Object.keys(sheet(g).skills), ['ranger.basic_attack', 'ranger.aimed_shot', 'ranger.power_shot']);
    assert.equal(sheet(g).inventory.standard_arrow, 20);
});

// ------------------------------------------------------------------------------------------------ B. Rogue combat
test('9A B: the Rogue fights with his Skills: Razor Cut, Long Lunge across an extra band, Evasive Step; the costs are booked; what he cannot do books nothing', () => {
    const g = hero('Rogue', 'Razor Cut + Long Lunge');
    spawn(g, 'mon.boar', { band: 'ENGAGED' });
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    const ctx = fight(g, ['mon.boar', 'mon.wolf']);
    const pc = ctx.enc.combatants.pc;
    const cut = attackAction(ctx, 'pc', 'mon.boar', 'rogue.razor_cut');
    assert.equal(cut.illegal, undefined);
    assert.equal(cut.skill, 'rogue.razor_cut');
    assert.equal(cut.raw_text, '6 + AGI 8×1.50 + ATK 10 = 28'); // 4.3.0-c.6.6.53: the Starter Dagger of ruleset 2, ATK 10
    assert.equal(pc.current.sta, 95, 'Razor Cut: 5 STA');
    // the wolf at MEDIUM: Long Lunge closes the extra band (SHORT) and the Turn's one band (ENGAGED)
    const lunge = attackAction(ctx, 'pc', 'mon.wolf', 'rogue.long_lunge', { move: 'closer' });
    assert.equal(lunge.illegal, undefined, lunge.illegal);
    assert.equal(ctx.enc.combatants['mon.wolf'].current.band, 'ENGAGED');
    assert.equal(pc.current.sta, 87, 'Long Lunge: 8 STA');
    // a Skill he did not choose, and one he cannot pay: refused before any cost or roll
    const n = ctx.dice.n;
    assert.match(attackAction(ctx, 'pc', 'mon.boar', 'rogue.piercing_thrust').illegal, /does not know Piercing Thrust/);
    pc.current.sta = 4;
    assert.match(attackAction(ctx, 'pc', 'mon.boar', 'rogue.razor_cut').illegal, /STA/);
    assert.equal(pc.current.sta, 4);
    assert.equal(ctx.dice.n, n, 'nothing rolled');
    // Evasive Step: a defense and a step back
    const g2 = hero('Rogue', 'Evasive Step + Feint');
    spawn(g2, 'mon.boar', { band: 'ENGAGED' });
    const ctx2 = fight(g2, ['mon.boar']);
    const step = skillAction(ctx2, 'pc', 'rogue.evasive_step', { dir: 'away' });
    assert.equal(step.illegal, undefined, step.illegal);
    assert.equal(ctx2.enc.combatants.pc.current.sta, 95);
    assert.ok(ctx2.enc.combatants.pc.current.effects.some((e) => e.kind === 'incoming_damage_reduction' && e.pct === 25), JSON.stringify(ctx2.enc.combatants.pc.current.effects));
    const feint = skillAction(ctx2, 'pc', 'rogue.feint');
    assert.deepEqual(feint.effects, ['next attack +35% Modified Power']);
});

test('9A B: #skills and #skill show the Rogue\'s Skills with their real cost, reach, formula and effect', () => {
    const g = hero('Rogue', 'Piercing Thrust + Guarded Cut');
    const all = panel(g, '#skills');
    assert.match(all, /Basic Attack \| Offensive \| Rank F \| Complexity 1 \| P1 \(PP 0\/75\) \| Tags Precision, Martial \| Cost 5 STA/);
    assert.match(all, /Piercing Thrust \| Offensive \| Rank F .* Cost 9 STA/);
    assert.match(all, /Guarded Cut \| Offensive \/ Defensive \| Rank F .* Cost 8 STA/);
    const one = panel(g, '#skill Piercing Thrust');
    assert.match(one, /Range: ENGAGED/);
    assert.match(one, /Base Power 11 \| Scaling AGI ×1\.75 \| Uses ATK \| physical/);
    assert.match(one, /ignores Partial Cover/);
    assert.match(one, /Current Raw Power: 11 \+ AGI 8×1\.75 \+ ATK 10 = 35/); // .53: Starter Dagger ATK 10
    assert.match(panel(g, '#skill Guarded Cut'), /Effect: after resolving the attack, gain \+4 temporary DEF/);
    assert.match(panel(g, '#skill Razor Cut'), /Razor Cut is not a Skill Alaric knows/);
});

// ------------------------------------------------------------------------------------------------ C. weapons
test('9A C: a Warrior, a Mage and a Rogue holding a bow shoot its Bow Shot: arrows spent, none without them; the class stays', () => {
    for (const [cls, skills, id] of [['Warrior', 'Heavy Slash + Guard', 'warrior'], ['Mage', 'Flame Lance + Blink', 'mage'], ['Rogue', 'Razor Cut + Feint', 'rogue']]) {
        const g = hero(cls, skills);
        assert.equal(weaponAttackOf(sheet(g), content, 2), null, `${cls}: his own weapon needs no other attack`);
        bow(g, 2);
        assert.equal(weaponAttackOf(sheet(g), content, 2).skill.id, 'weapon.bow_shot');
        assert.equal(sheet(g).skills['weapon.bow_shot'], undefined, 'no learned Skill');
        assert.deepEqual(actionsOf(sheet(g), content, 2)['weapon.bow_shot'], { prof: 1, pp: 0, weapon: 'Starter Shortbow' });
        spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM', hp: 300 });
        const ctx = fight(g, ['mon.wolf']);
        const shot = attackAction(ctx, 'pc', 'mon.wolf', 'weapon.bow_shot');
        assert.equal(shot.illegal, undefined, `${cls}: ${shot.illegal}`);
        assert.deepEqual(shot.ammo, { item: 'standard_arrow', used: 1 });
        assert.equal(ctx.enc.combatants.pc.current.ammo.standard_arrow, 1);
        attackAction(ctx, 'pc', 'mon.wolf', 'weapon.bow_shot');
        assert.match(attackAction(ctx, 'pc', 'mon.wolf', 'weapon.bow_shot').illegal, /has 0 arrow\(s\)/, `${cls}: no free shot`);
        assert.equal(sheet(g).class, id, 'the class stays');
        // no former Ranger technique comes with the bow
        assert.match(attackAction(ctx, 'pc', 'mon.wolf', 'ranger.aimed_shot').illegal, /does not know Aimed Shot/);
    }
    // a Mage with a sword gets its plain blow; a Warrior with a dagger needs none (his Basic Attack uses it)
    const m = hero('Mage', 'Flame Lance + Blink');
    applyEvent(m.state, { t: 'item.equipped', d: { id: 'pc', slot: 'weapon', item: 'starter_longsword' } });
    assert.equal(weaponAttackOf(sheet(m), content, 2).skill.id, 'weapon.strike');
    const w = hero('Warrior', 'Heavy Slash + Guard');
    applyEvent(w.state, { t: 'item.equipped', d: { id: 'pc', slot: 'weapon', item: 'starter_dagger' } });
    assert.equal(weaponAttackOf(sheet(w), content, 2), null);
});

test('9A C: "I shoot the wolf" with a bow is the Bow Shot through the real turn: the arrow is spent and written back; an attack naming no weapon stays the class Basic Attack', () => {
    const g = hero('Mage', 'Flame Lance + Blink');
    bow(g, 3);
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    const r = g.input('I shoot the wolf with my bow.');
    const rec = r.outcome.records.find((x) => x.actor === 'pc');
    assert.equal(rec.skill, 'weapon.bow_shot');
    assert.deepEqual(rec.ammo, { item: 'standard_arrow', used: 1 });
    assert.deepEqual(r.events.filter((e) => e.t === 'item.changed').map((e) => e.d), [{ id: 'pc', item: 'standard_arrow', qty: -1, why: 'Bow Shot' }]);
    assert.equal(sheet(g).inventory.standard_arrow, 2, 'the arrow is written back to his pack');
    assert.equal(sheet(g).class, 'mage');
    const h = hero('Mage', 'Flame Lance + Blink');
    bow(h, 3);
    spawn(h, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    assert.equal(h.input('I attack the wolf.').outcome.records.find((x) => x.actor === 'pc').skill, 'mage.basic_attack');
    // #skills names the bow's attack as the weapon's, not as a learned Skill
    assert.match(panel(g, '#skills'), /Bow Shot \| weapon attack of the equipped Starter Shortbow \(not a learned Skill\) \| Cost 5 STA \+ 1 arrow/);
});

test('9A C: the product path (planner): a Rogue holding a bow who "shoots the wolf" makes the Bow Shot; "slashes" stays his Basic Attack', async () => {
    const g = await campaign(content, { cls: 'Rogue', skills: 'Razor Cut + Feint' });
    const s = g.state();
    assert.equal(s.meta.ruleset, 2);
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'item.equipped', d: { id: 'pc', slot: 'weapon', item: 'starter_shortbow' } },
        { t: 'item.changed', d: { id: 'pc', item: 'standard_arrow', qty: 4 } },
        { t: 'entity.created', d: { entity: { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: s.scene.location, profile: { ...p, max_hp: 300, hp: 300 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf', band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf', level: 'aware' } },
    ]);
    await say(g, 'I shoot the wolf.', { type: 'use_skill', skill: null, target: 'mon.wolf', quote: 'I shoot the wolf.' });
    assert.deepEqual(outcomeOf(g).records.filter((x) => x.actor === 'pc').map((x) => [x.skill, x.ammo?.used]), [['weapon.bow_shot', 1]]);
    assert.equal(g.state().entities.pc.sheet.inventory.standard_arrow, 3);
    await say(g, 'I slash at the wolf.', { type: 'use_skill', skill: null, target: 'mon.wolf', quote: 'I slash at the wolf.' });
    assert.deepEqual(outcomeOf(g).records.filter((x) => x.actor === 'pc').map((x) => x.skill), ['rogue.basic_attack']);
});

test('9A C (legacy): a legacy campaign has no weapon attacks; its Ranger shoots his own Basic Attack with arrows as before', () => {
    const g = new Game(legacy);
    g.input('Mage');
    g.input('Flame Lance + Blink');
    bow(g, 2);
    assert.equal(weaponAttackOf(sheet(g), legacy, 1), null);
    assert.equal(actionsOf(sheet(g), legacy, 1)['weapon.bow_shot'], undefined);
    const r = new Game(legacy);
    r.input('Ranger');
    r.input('Aimed Shot + Power Shot');
    spawn(r, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    const ctx = fight(r, ['mon.wolf']);
    assert.deepEqual(Object.keys(ctx.enc.combatants.pc.fixed.actions), ['ranger.basic_attack', 'ranger.aimed_shot', 'ranger.power_shot']);
    assert.deepEqual(attackAction(ctx, 'pc', 'mon.wolf', 'ranger.basic_attack').ammo, { item: 'standard_arrow', used: 1 });
});

// ------------------------------------------------------------------------------------------------ D. human NPCs
const PEOPLE = [['npc.farmer', 'commoner', ['farmer']], ['npc.woodcutter', 'laborer', ['woodcutter']], ['npc.hunter', 'hunter', ['hunter']], ['npc.guard', 'guard', ['town guard']],
    ['npc.bandit', 'bandit', ['bandit']], ['npc.mage', 'hedge_mage', ['hedge mage']], ['npc.archer', 'adventurer', ['archer', 'adventurer']], ['npc.smith', 'commoner', ['blacksmith']]];
const DICE = { int: (a) => a, pick: (l) => l[0], d100: () => 50, variance: () => 1, n: 0 };
function people(g, extra = {}) {
    const events = [];
    for (const [id, template, descriptors] of PEOPLE) {
        const e = { t: 'entity.created', d: { entity: { id, kind: 'npc', name: null, descriptors, traits: '', status: 'alive', location: g.state.scene.location, template, card: {}, ...(extra[id] || {}) } } };
        applyEvent(g.state, e);
        events.push(e);
    }
    for (const [id] of PEOPLE) materialise(g.state, g.content, DICE, (e) => { applyEvent(g.state, e); events.push(e); }, id);
    return events;
}
/** Do the person's two starter Skills fill these roles, in order? */
const fills = (s, want) => { const ids = Object.keys(s.skills).filter((id) => !content.skills.get(id).basic); return ids.length === want.length && want.every((r, i) => starterRoles(content.skills.get(ids[i])).includes(r)); };

test('9A D: trained fighters get their class Basic Attack and exactly two starter Skills by role; untrained people none; a bow decides no class', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    people(g, { 'npc.smith': { class: 'warrior' } });
    const s = (id) => g.state.entities[id].sheet;
    // the guard: a Warrior, an attack and a defense of the Warrior pool
    assert.equal(s('npc.guard').class, 'warrior');
    assert.equal(s('npc.guard').training, 'trained');
    assert.ok(s('npc.guard').skills['warrior.basic_attack']);
    assert.ok(fills(s('npc.guard'), ['attack', 'defense']), JSON.stringify(s('npc.guard').skills));
    assert.ok(Object.keys(s('npc.guard').skills).every((id) => id === 'warrior.basic_attack' || content.classes.get('warrior').skill_pool.includes(id)));
    // the bandit: a Rogue (no Duelist any more), an attack and a tactical Skill
    assert.equal(s('npc.bandit').class, 'rogue');
    assert.ok(s('npc.bandit').skills['rogue.basic_attack']);
    assert.ok(fills(s('npc.bandit'), ['attack', 'utility']), JSON.stringify(s('npc.bandit').skills));
    // the hedge mage: two of the Mage pool, an offensive spell and a ward
    assert.equal(s('npc.mage').class, 'mage');
    assert.ok(fills(s('npc.mage'), ['attack', 'defense']), JSON.stringify(s('npc.mage').skills));
    // the hunter: a Rogue by lore, untrained, with a bow and real arrows: his Bow Shot, no starter Skill
    assert.equal(s('npc.hunter').class, 'rogue');
    assert.equal(s('npc.hunter').training, 'untrained');
    assert.deepEqual(Object.keys(actionsOf(s('npc.hunter'), content, 2)).sort(), ['rogue.basic_attack', 'weapon.bow_shot']);
    assert.equal(s('npc.hunter').inventory.standard_arrow, 12);
    // the archer adventurer: a class of the three (not Ranger), two starter Skills, a bow and a quiver
    assert.ok(['rogue', 'warrior'].includes(s('npc.archer').class), s('npc.archer').class);
    assert.equal(Object.keys(s('npc.archer').skills).filter((id) => !content.skills.get(id).basic).length, 2);
    assert.equal(s('npc.archer').equipment.weapon.family, 'bow');
    assert.ok(actionsOf(s('npc.archer'), content, 2)['weapon.bow_shot']);
    assert.equal(s('npc.archer').inventory.standard_arrow, 20);
    // untrained people: no class known, no starter Skill, a plain valid attack; their stat basis is internal
    for (const id of ['npc.farmer', 'npc.woodcutter']) {
        assert.equal(s(id).class, null, id);
        assert.equal(s(id).training, 'untrained');
        assert.deepEqual(s(id).skills, {}, `${id}: no learned Skill`);
        assert.equal(s(id).generated.class_basis, 'none');
    }
    assert.deepEqual(Object.keys(actionsOf(s('npc.farmer'), content, 2)), ['weapon.unarmed_blow']);
    assert.deepEqual(Object.keys(actionsOf(s('npc.woodcutter'), content, 2)), ['weapon.strike']);
    // a lore class and no combat training: the smith is a Warrior by the story and knows only its Basic Attack
    assert.deepEqual([s('npc.smith').class, s('npc.smith').training, Object.keys(s('npc.smith').skills)], ['warrior', 'untrained', ['warrior.basic_attack']]);
    assert.equal(s('npc.smith').generated.class_basis, 'established');
    // no class of the legacy rules anywhere
    for (const [id] of PEOPLE) assert.ok([null, 'warrior', 'mage', 'rogue'].includes(s(id).class), `${id}: ${s(id).class}`);
});

test('9A D: the choice is fixed in entity.sheet_set: the same person keeps class, level, gear and Skills after replay and in a later fight; the choice is no pool order', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    const events = people(g);
    const replayed = fold([...g.log, ...events]);
    for (const [id] of PEOPLE) assert.deepEqual(replayed.entities[id].sheet, g.state.entities[id].sheet, id);
    const before = JSON.stringify(g.state.entities['npc.guard'].sheet);
    const again = [];
    materialise(g.state, content, DICE, (e) => again.push(e), 'npc.guard');
    assert.deepEqual(again, [], 'a person with a sheet is never built again');
    spawn(g, 'mon.boar');
    const ctx = fight(g, ['npc.guard', 'mon.boar']);
    assert.deepEqual(Object.keys(ctx.enc.combatants['npc.guard'].fixed.actions), Object.keys(JSON.parse(before).skills));
    assert.equal(JSON.stringify(g.state.entities['npc.guard'].sheet), before);
    // the starters follow the campaign seed and the person, by role: not skill_pool.slice(0, 2)
    const warrior = content.classes.get('warrior');
    const picks = new Set(Array.from({ length: 24 }, (_, i) => chooseStarters(warrior, ['attack', 'defense'], `7|npc.guard${i}`, content).join('+')));
    assert.ok(picks.size > 2, [...picks].join(' '));
    for (const p of picks) assert.deepEqual(p.split('+').map((id) => starterRoles(content.skills.get(id))[0]), ['attack', 'defense']);
    assert.deepEqual(chooseStarters(warrior, ['attack', 'defense'], 'k', content), chooseStarters(warrior, ['attack', 'defense'], 'k', content));
});

// ------------------------------------------------------------------------------------------------ E. legacy
test('9A E: a legacy campaign builds its people by the old templates, even when they first fight after the update', () => {
    const g = new Game(legacy);
    g.input('Warrior');
    g.input('Heavy Slash + Guard');
    people(g);
    const s = (id) => g.state.entities[id].sheet;
    assert.deepEqual([s('npc.bandit').class, Object.keys(s('npc.bandit').skills)], ['duelist', ['duelist.basic_attack', 'duelist.precision_thrust']]);
    assert.deepEqual([s('npc.hunter').class, Object.keys(s('npc.hunter').skills)], ['ranger', ['warrior.basic_attack']]);
    assert.deepEqual(Object.keys(s('npc.guard').skills), ['warrior.basic_attack', 'warrior.heavy_slash', 'warrior.guard']);
    assert.deepEqual([s('npc.farmer').class, s('npc.farmer').training], ['warrior', undefined]);
    assert.equal(s('npc.archer').class, 'ranger');
    // exactly the sheets of the legacy humanSheet
    assert.deepEqual(s('npc.guard'), { ...humanSheet(legacy.templates.get('guard'), {}, legacy), generated: { ...humanSheet(legacy.templates.get('guard'), {}, legacy).generated, temperament: 'aggressive' } });
});

test('9A E: recorded campaigns (before Patch 9A) fold as before: no ruleset means ruleset 1, their classes, Skills and kits stand; the creation is rebuilt from the events', () => {
    for (const f of ['tests/v4/live_1022e.json', 'tests/v4/live_1021c.json', 'tests/v4/live_1018_weald.json']) {
        const fx = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
        const st = foldChat(fx.messages).state;
        assert.equal(st.meta.ruleset, 1, f);
        const s = st.entities.pc.sheet;
        assert.ok(content.classes.get(s.class), `${f}: ${s.class}`);
        assert.equal(st.creation.step, 3);
        assert.equal(Object.keys(s.skills).filter((id) => content.skills.get(id)?.basic).length, 1, `${f}: one Basic Attack`);
        assert.ok(st.creation.skills.every((id) => s.skills[id]), f);
    }
});

test('9A E: replaying a new campaign gives the same sheet: no second kit, no doubled Skill, no class change; a fixed encounter keeps its actions', () => {
    const g = hero('Rogue', 'Razor Cut + Feint');
    assert.deepEqual(g.refold().entities.pc.sheet, sheet(g));
    assert.equal(g.log.filter((e) => e.t === 'creation.completed').length, 1);
    assert.equal(g.log.find((e) => e.t === 'campaign.started').d.ruleset, 2);
    // a Mage's fight with the bow keeps the Bow Shot in its snapshot even when the bow is put away
    const m = hero('Mage', 'Flame Lance + Blink');
    bow(m, 3);
    spawn(m, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    m.input('I shoot the wolf with my bow.');
    applyEvent(m.state, { t: 'item.equipped', d: { id: 'pc', slot: 'weapon', item: 'starter_arcane_staff' } });
    assert.ok(m.state.encounter.combatants.pc.fixed.actions['weapon.bow_shot']);
});

// ------------------------------------------------------------------------------------------------ F. System and UI
test('9A F / 9D: #class shows the implemented E milestone in a new campaign (a legacy one keeps its panel); texts follow the ruleset', () => {
    const g = hero('Rogue', 'Razor Cut + Feint');
    const k = panel(g, '#class');
    assert.match(k, /Base Class: Rogue \| Rank F \| Favored Stats: AGI \/ PER/);
    assert.match(k, /Next class evolution: Level 15 \/ E/);
    assert.match(k, /Next class evolution: Level 15/);
    const old = new Game(legacy);
    old.input('Ranger');
    old.input('Aimed Shot + Power Shot');
    assert.match(panel(old, '#class'), /Next known evolution milestone: Level 15/);
    const two = rulesTextFor(content, 2);
    assert.ok(two.some((r) => r.id === 'content.10.r2') && !two.some((r) => r.id === 'content.10'));
    assert.ok(two.every((r) => !/Rank milestones are Level 15\/30/.test(r.text)));
    assert.match(two.find((r) => r.id === 'content.6.r2').text, /Rogue — Precision 1\.50/);
    assert.doesNotMatch(two.find((r) => r.id === 'content.6.r2').text, /Guardian|Duelist|Ranger/);
    const one = rulesTextFor(content, 1);
    assert.ok(one.some((r) => r.id === 'content.10') && !one.some((r) => r.ruleset));
    // F-rank Power Ranks are untouched
    assert.deepEqual(content.rules.ranks.bands.map((b) => [b.rank, b.min]), legacy.rules.ranks.bands.map((b) => [b.rank, b.min]));
});

test('9A F: the combat HUD shows every action: attacks with reach and cost, defenses and utilities with cost and effect (Blink 8 MP, one band); one he cannot pay is marked', () => {
    const g = hero('Mage', 'Flame Lance + Blink');
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM', hp: 300 });
    g.input('I cast Flame Lance at the wolf.');
    assert.ok(g.state.encounter);
    const html = renderHud(g.state, content, 'closed');
    assert.match(html, /<strong>Attack<\/strong> · .*Basic Attack.*Flame Lance/);
    assert.match(html, /<strong>Utility<\/strong> · <span class="avereth-skill">Blink <span class="avereth-skill-cost">\(8 MP, move 1 band\)<\/span><\/span>/);
    assert.doesNotMatch(html, /<strong>Defense<\/strong>/, 'no defense he does not have');
    assert.doesNotMatch(html, /Passive/);
    // Blink unchanged and usable: 8 MP, one Range Band, his action
    const r = g.input('I blink away from the wolf.');
    const rec = r.outcome.records.find((x) => x.actor === 'pc');
    assert.equal(rec.skill, 'mage.blink');
    assert.deepEqual([rec.cost.resource, rec.cost.amount], ['mp', 8]);
    assert.match(rec.reposition, /ENGAGED -> SHORT|SHORT -> MEDIUM|MEDIUM -> LONG/, 'one Range Band');
    assert.equal(r.outcome.records.filter((x) => x.actor === 'pc').length, 1, 'his one action of the Turn');
    assert.deepEqual(content.skills.get('mage.blink').effects, [{ kind: 'reposition', bands: 1, extra: true }], 'Blink unchanged in 9A');
    // a guard and a ward he cannot pay now stay listed, marked
    const w = hero('Warrior', 'Heavy Slash + Guard');
    spawn(w, 'mon.boar', { band: 'ENGAGED', hp: 300 });
    w.input('I attack the boar.');
    w.state.encounter.combatants.pc.current.sta = 3;
    const low = renderHud(w.state, content, 'closed');
    assert.match(low, /<strong>Defense<\/strong> · <span class="avereth-skill avereth-skill-unusable">Guard <span class="avereth-skill-cost">\(5 STA, \+DEF till his next turn\)<\/span> <span class="avereth-skill-short">not enough STA<\/span>/);
});

// ------------------------------------------------------------------------------------------------ review: absent first
/**
 * Review of Patch 9A: the narrator establishes a person elsewhere (person.new present:false with their role), they come
 * into the scene later (enter), and their sheet is built only when he attacks them: the template of their role, fixed at
 * their creation, not the commoner's.
 */
async function metLater(c, { name, role, desc, cls = 'Warrior', skills = 'Heavy Slash + Guard' }) {
    const g = await campaign(c, { cls, skills });
    await say(g, '*i ask the carter about the road*', { type: 'talk', to: null, quote: 'i ask the carter about the road' });
    await g.reply(`The carter warns him of ${name}, a ${role} out on the north road.`, { expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: name, name, role, desc, present: false, relevant: true, threat: null, at: null, band: null },
    ] });
    const id = Object.values(g.state().entities).find((e) => e.name === name).id;
    const created = { ...g.state().entities[id] };
    assert.ok(!g.state().scene.present.includes(id), `${name}: not here when established`);
    assert.equal(created.sheet, undefined);
    await say(g, '*i wait by the road*', { type: 'wait', minutes: 30, quote: 'i wait by the road' });
    await g.reply(`${name} steps out onto the road right in front of him.`, { expected: {}, deltas: [
        { seq: 1, type: 'enter', who: id },
        { seq: 2, type: 'position', who: id, band: 'ENGAGED', cover: null, cluster: null, scope: null, evidence: 'right in front of him' },
    ] });
    assert.ok(g.state().scene.present.includes(id), `${name}: met now`);
    assert.equal(g.state().entities[id].sheet, undefined, 'no sheet before the fight');
    await say(g, `*i attack ${name}*`, { type: 'use_skill', skill: null, target: id, quote: `i attack ${name}` });
    return { created, sheet: g.state().entities[id].sheet };
}

test('9A review: a bandit and a hedge mage established elsewhere and met later fight as a trained Rogue and a trained Mage, not as untrained commoners', async () => {
    const bandit = await metLater(content, { name: 'Garrick', role: 'bandit', desc: ['bandit', 'scarred'] });
    assert.equal(bandit.created.template, 'bandit');
    assert.deepEqual([bandit.sheet.class, bandit.sheet.training, bandit.sheet.template], ['rogue', 'trained', 'bandit']);
    assert.ok(bandit.sheet.skills['rogue.basic_attack']);
    assert.ok(fills(bandit.sheet, ['attack', 'utility']), JSON.stringify(bandit.sheet.skills));
    const mage = await metLater(content, { name: 'Ilsa', role: 'hedge mage', desc: ['hedge mage'] });
    assert.equal(mage.created.template, 'hedge_mage');
    assert.deepEqual([mage.sheet.class, mage.sheet.training, mage.sheet.template], ['mage', 'trained', 'hedge_mage']);
    assert.ok(mage.sheet.skills['mage.basic_attack']);
    assert.ok(fills(mage.sheet, ['attack', 'defense']), JSON.stringify(mage.sheet.skills));
    // an ordinary role stays an untrained commoner
    const merchant = await metLater(content, { name: 'Odo', role: 'merchant', desc: ['merchant'] });
    assert.deepEqual([merchant.created.template, merchant.sheet.training, Object.keys(merchant.sheet.skills)], ['commoner', 'untrained', []]);
});

test('9A review: in a legacy campaign a person established elsewhere is created as before (commoner, the legacy sheet)', async () => {
    const bandit = await metLater(legacy, { name: 'Garrick', role: 'bandit', desc: ['bandit', 'scarred'] });
    assert.equal(bandit.created.template, 'commoner');
    assert.deepEqual([bandit.sheet.class, bandit.sheet.training, Object.keys(bandit.sheet.skills)], ['warrior', undefined, ['warrior.basic_attack']]);
});

test('9A review: the lorebook class entries tell the rulesets apart by the engine\'s mark; a legacy campaign\'s PC line carries none, so its five-class milestones stand', async () => {
    const { pcLine } = await import('../../src/context.js');
    const book = JSON.parse(fs.readFileSync(path.join(ROOT, 'lorebook/Avereth_World_Lore_v0.14.json'), 'utf8'));
    const entry = (c) => Object.values(book.entries).find((e) => e.comment === c).content;
    const frame = entry('POWER — Class framework');
    const evo = entry('POWER — Class Evolution generation body');
    assert.match(pcLine(hero('Warrior', 'Heavy Slash + Guard').state, content), /^Alaric — Level 1 Warrior \(three-class rules\), Power Rank F \|/);
    const old = new Game(legacy);
    old.input('Warrior');
    old.input('Heavy Slash + Guard');
    assert.match(pcLine(old.state, legacy), /^Alaric — Level 1 Warrior, Power Rank F \|/, 'the legacy line is as it was');
    // the three-class rules: three classes, any weapon, no evolution; without the mark: the five classes and the milestones
    assert.match(frame, /Marked "\(three-class rules\)" after his class: the Base Classes are Warrior .* Mage .* and Rogue .*Any class may use any weapon/);
    assert.match(frame, /Without that mark \(a campaign begun earlier\): the five Base Classes Warrior \(STR\/VIT\), Mage \(INT\/WIL\), Guardian .*Duelist .*Ranger .*a weapon's attacks are those of the class/);
    assert.match(evo, /Under the three-class rules \(the engine's line for Alaric marks his class "\(three-class rules\)"\) Class Evolution is due at Power Rank milestones/);
    assert.match(evo, /In a campaign without that mark \(begun with the five older Base Classes\) the standard milestones are Levels 15\/30\/45\/60\/75\/90/);
    assert.match(panel(old, '#class'), /Next known evolution milestone: Level 15/, 'what the legacy lorebook text says, the legacy #class shows');
});

// ------------------------------------------------------------------------------------------------ Patch 9A.1
/**
 * Patch 9A.1 (live run 20261022-125117Z-current_test: robbers in a hidden camp, roles "leader of the hidden camp men"
 * and "younger camp man", a short sword and a knife, fought as untrained commoners bare-handed): a person the story
 * brings in (the extractor's person.new, later facts), first fought: the sheet the engine builds for them.
 */
async function foe(c, person, later = []) {
    const g = await campaign(c, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    await say(g, '*i look around*', { type: 'other', what: 'look around', quote: 'i look around' });
    await g.reply('Someone steps up right in front of him.', { expected: {}, deltas: [{ seq: 1, type: 'person.new', ref: 'p.x', name: null, desc: [], present: true, relevant: true, threat: true, at: null, band: 'ENGAGED', ...person }] });
    const id = Object.values(g.state().entities).find((e) => e.kind === 'npc' && (e.descriptors || []).includes('p.x')).id;
    if (later.length) {
        await say(g, '*i watch him*', { type: 'other', what: 'watch him', quote: 'i watch him' });
        await g.reply('He moves.', { expected: {}, deltas: later.map((d, i) => ({ seq: i + 1, ...d, s: id })) });
    }
    assert.equal(g.state().entities[id].sheet, undefined, 'no sheet before the fight');
    await say(g, '*i attack him*', { type: 'use_skill', skill: null, target: id, quote: 'i attack him' });
    const s = g.state();
    const sh = s.entities[id].sheet;
    return { g, id, e: s.entities[id], sh, actions: Object.keys(actionsOf(sh, c, s.meta.ruleset)), hits: (outcomeOf(g)?.records || []).filter((r) => r.actor === id).map((r) => r.skill) };
}
const starters = (sh) => Object.keys(sh.skills).filter((id) => !content.skills.get(id).basic);

test('9A.1 A: an established bandit (the role word, a later occupation fact) fights as a trained Rogue with two starter Skills and the sword he holds', async () => {
    const a = await foe(content, { role: 'bandit', desc: ['scarred'], armed: 'short sword' });
    assert.deepEqual([a.e.template, a.sh.class, a.sh.training], ['bandit', 'rogue', 'trained']);
    assert.ok(a.sh.skills['rogue.basic_attack']);
    assert.ok(fills(a.sh, ['attack', 'utility']), JSON.stringify(a.sh.skills));
    assert.deepEqual([a.sh.equipment.weapon.name, a.sh.equipment.weapon.family, a.sh.equipment.weapon.atk, a.sh.generated.weapon], ['Short sword', 'melee', 6, 'established']);
    // created as a camp man, established as a bandit before he is fought: the bandit's sheet
    const b = await foe(content, { role: 'camp man', desc: ['by the fire'] }, [{ type: 'fact', p: 'occupation', o: 'bandit' }]);
    assert.equal(b.e.template, 'commoner', 'his creation is not rewritten');
    assert.deepEqual([b.sh.class, b.sh.training, starters(b.sh).length, b.sh.template], ['rogue', 'trained', 2, 'bandit']);
    // the extractor is told what a role and a held weapon are
    const rules = content.deltaVocab.rules.join('\n');
    assert.match(rules, /role is a short plain word for what the person is in the world .* are bandit even when it never says the word/);
    assert.match(rules, /a hidden camp, a weapon, hostility or Alaric's own attack alone make no one a bandit or a trained fighter/);
    assert.match(rules, /armed is the weapon the person holds ready .* being worked on \(whetted, mended, cleaned\) is not armed/);
    assert.deepEqual(content.deltaVocab.deltas.find((d) => d.type === 'person.new').fields.armed, { type: 'string', nullable: true });
});

test('9A.1 B: an established guard and a fighting mage are a trained Warrior and a trained Mage; the guard keeps the spear he holds', async () => {
    const guard = await foe(content, { role: 'guard', desc: ['town watch'], armed: 'spear' });
    assert.deepEqual([guard.sh.class, guard.sh.training, guard.sh.equipment.weapon.name], ['warrior', 'trained', 'Spear']);
    assert.ok(fills(guard.sh, ['attack', 'defense']), JSON.stringify(guard.sh.skills));
    const mage = await foe(content, { role: 'mage', desc: ['robed'], armed: null });
    assert.deepEqual([mage.sh.class, mage.sh.training, mage.sh.equipment.weapon.name], ['mage', 'trained', 'Wooden staff']);
    assert.ok(fills(mage.sh, ['attack', 'defense']), JSON.stringify(mage.sh.skills));
});

test('9A.1 C-E: a camp leader with no established role stays untrained; an untrained farmer with a knife strikes with it, no Skill; a sword being whetted is no weapon in hand', async () => {
    const c = await foe(content, { role: 'leader of the hidden camp men', desc: ['big man'] });
    assert.deepEqual([c.e.template, c.sh.class, c.sh.training, starters(c.sh)], ['commoner', null, 'untrained', []]);
    const d = await foe(content, { role: 'farmer', desc: ['angry'], armed: 'rusty knife' });
    assert.deepEqual([d.sh.class, d.sh.training, starters(d.sh), Object.keys(d.sh.skills)], [null, 'untrained', [], []]);
    assert.deepEqual([d.sh.equipment.weapon.name, d.sh.equipment.weapon.family, d.sh.equipment.weapon.atk], ['Rusty knife', 'melee', 4], 'a crude knife: the low end of the martial reference');
    assert.deepEqual(d.actions, ['weapon.strike']);
    assert.ok(d.hits.every((x) => x === 'weapon.strike') && d.hits.length, JSON.stringify(d.hits));
    const e = await foe(content, { role: 'camp man', desc: ['sits on a log whetting a short sword'], armed: null });
    assert.deepEqual([e.sh.equipment.weapon.name, e.actions], ['Improvised tool', ['weapon.unarmed_blow']]);
    assert.equal(truthOf(e.g.state(), e.id, 'armed'), undefined);
});
const truthOf = (s, id, p) => Object.values(s.facts).find((f) => f.s === id && f.p === p && !f.until)?.o;

test('9A.1 F: the sheet stays as built (replay, a weapon drawn in the fight); a legacy campaign builds as before and keeps no armed fact', async () => {
    const a = await foe(content, { role: 'bandit', desc: ['scarred'], armed: 'short sword' });
    assert.deepEqual(foldChat(a.g.chat).state.entities[a.id].sheet, a.sh, 'replay gives the same sheet');
    const fixed = JSON.stringify(a.g.state().encounter.combatants[a.id].fixed);
    await say(a.g, '*i parry*', { type: 'use_skill', skill: 'warrior.guard', target: null, quote: 'i parry' });
    await a.g.reply('He draws a second blade.', { expected: {}, deltas: [{ seq: 1, type: 'fact', s: a.id, p: 'armed', o: 'long knife' }] });
    assert.equal(JSON.stringify(a.g.state().entities[a.id].sheet), JSON.stringify(a.sh), 'no rebuilt sheet');
    if (a.g.state().encounter) assert.equal(JSON.stringify(a.g.state().encounter.combatants[a.id].fixed), fixed, 'the fight\'s snapshot is unchanged');
    const old = await foe(legacy, { role: 'farmer', desc: ['angry'], armed: 'short sword' });
    assert.deepEqual([old.e.template, old.sh.class, old.sh.training, Object.keys(old.sh.skills), old.sh.equipment.weapon.name], ['commoner', 'warrior', undefined, ['warrior.basic_attack'], 'Improvised tool']);
    assert.equal(truthOf(old.g.state(), old.id, 'armed'), undefined);
    const thug = await foe(legacy, { role: 'bandit', desc: ['scarred'], armed: 'short sword' });
    assert.deepEqual([thug.sh.class, Object.keys(thug.sh.skills), thug.sh.equipment.weapon.name], ['duelist', ['duelist.basic_attack', 'duelist.precision_thrust'], 'Short blade'], 'the legacy bandit');
});
