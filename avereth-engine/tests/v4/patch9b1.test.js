// Patch 9B-1 (docs/PATCH9B1_DYNAMIC_SKILLS_PROFICIENCY.md): the campaign's own Skill definitions (skill.defined, a
// closed validator on the F-rank calibration, one resolver for static and dynamic Skills) and Proficiency P1-P5
// (thresholds by Complexity, the single highest Class Affinity, PP booked when a fight is over, effect factors).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadProductContent, Game, scriptedDice } from '../helpers.js';
import { applyEvent, fold } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { initEncounter, attackAction, skillAction, runCombat, endEncounterEvents } from '../../src/combat.js';
import { scaleCreature } from '../../src/npcgen.js';
import { runCommands } from '../../src/commands.js';
import { renderHud } from '../../src/hud.js';
import { turnPanel } from '../../src/display.js';
import { skillOf, findSkill } from '../../src/content.js';
import { actionsOf } from '../../src/derived.js';
import { planContext, withContentSkills } from '../../src/v4/planner.js';
import { ownershipViolation, eventKind } from '../../src/v4/ownership.js';
import { skillDefErrors, defineSkill, learnSkill, promotionPp, affinityFor, ppAward, advancePp, effectValue, noteUse, fightProgress } from '../../src/skills.js';
import { campaign, say, inject, outcomeOf } from './patch8_lib.js';

const content = await loadProductContent();
const legacy = await loadContent();

function hero(cls, skills, c = content) {
    const g = new Game(c);
    g.input(cls);
    g.input(skills);
    return g;
}
const sheet = (g) => g.state.entities.pc.sheet;
const panel = (g, text) => runCommands(g.state, g.content, text).panels.join('\n');
/** An engine event a test books as its precondition: applied and kept in the log (replay sees it). */
const book = (g, ...events) => { for (const e of events) { applyEvent(g.state, e); g.log.push(e); } };

function spawn(g, id, { anchor = 'wolf', band = 'ENGAGED', level = 1, hp = null } = {}) {
    const p = { ...scaleCreature(g.content.anchors.get(anchor), level, 'normal', g.content), ...(hp ? { max_hp: hp, hp } : {}) };
    book(g,
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: [anchor], anchor, species: anchor, status: 'alive', location: g.state.scene.location, profile: p } } },
        { t: 'scene.entered', d: { id, band, cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } });
}
const fight = (g, ids, dice = scriptedDice({ variance: [1, 1, 1, 1] })) => ({ enc: initEncounter(g.state, g.content, dice, { actor: 'pc', target: ids[0] }, ids.map((id) => ({ id, side: 'hostile' })), 'enc.test'), content: g.content, dice, state: g.state });
/** Fight it out with the words of a player, alternating, until the fight is over; the events of each turn. */
function fightOut(g, words, max = 14) {
    const turns = [];
    for (let i = 0; i < max; i++) {
        const r = g.input(words[i % words.length]);
        turns.push(r);
        if (!g.state.encounter) break;
        g.reply({});
    }
    return turns;
}
const progressOf = (turns) => turns.flatMap((r) => r.events).filter((e) => e.t === 'skill.progress');
const setProf = (g, skill, prof, pp = 0) => book(g, { t: 'skill.progress', d: { id: 'pc', skill, gained: 0, from: sheet(g).skills[skill], to: { prof, pp } } });

const ORIGIN = { kind: 'teacher', note: 'Master Oren of Redmarch' };
const VIPER = {
    id: 'dyn.viper_sting', name: 'Viper Sting', description: 'A darting cut at an opening in the guard.', origin: ORIGIN, rank: 'F', complexity: 1,
    tags: ['Precision'], category: 'Offensive', activation: 'action', target: 'enemy', cost: { resource: 'sta', amount: 6 }, range: { band: 'ENGAGED' },
    attack: { base: 9, scaling: [{ stat: 'AGI', coef: 1.6 }], damage_type: 'physical' }, effects: [],
};
const STONE = {
    id: 'dyn.stone_skin', name: 'Stone Skin', description: 'He sets his body like a wall until his next turn.', origin: { kind: 'self_development' }, rank: 'F', complexity: 1,
    tags: ['Defense'], category: 'Defensive', activation: 'action', target: 'self', cost: { resource: 'sta', amount: 6 },
    effects: [{ kind: 'temp_def', base: 4, stat: 'VIT', coef: 0.5, floor: true, until: 'own_next_turn' }],
};
/** A Rogue of a new campaign who was taught a dynamic Skill (the engine's events). */
function taught(def = VIPER, skills = 'Razor Cut + Evasive Step') {
    const g = hero('Rogue', skills);
    const d = defineSkill(g.state, content, def);
    assert.deepEqual(d.errors, []);
    book(g, ...d.events);
    const l = learnSkill(g.state, content, 'pc', def.id, 'taught by Master Oren');
    assert.deepEqual(l.errors, []);
    book(g, ...l.events);
    return g;
}

// ------------------------------------------------------------------------------------------------ 1. definition
test('9B-1 (1): a dynamic Skill is defined (skill.defined), then learned (skill.learned); replay is identical; another campaign does not have it', () => {
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    const before = content.skills.size;
    const d = defineSkill(g.state, content, VIPER);
    assert.deepEqual(d.errors, []);
    assert.deepEqual(d.events.map((e) => e.t), ['skill.defined']);
    book(g, ...d.events);
    assert.equal(g.state.skill_defs['dyn.viper_sting'].name, 'Viper Sting');
    assert.equal(g.state.skill_defs['dyn.viper_sting'].dynamic, true);
    assert.equal(sheet(g).skills['dyn.viper_sting'], undefined, 'defined is not learned');
    assert.equal(content.skills.size, before, 'the content maps are not changed');
    assert.equal(content.skills.has('dyn.viper_sting'), false);
    book(g, ...learnSkill(g.state, content, 'pc', 'dyn.viper_sting').events);
    assert.deepEqual(sheet(g).skills['dyn.viper_sting'], { prof: 1, pp: 0 });
    assert.deepEqual(validateState(g.state, content), []);
    // replay of the log: the same definitions and the same sheet
    const again = fold(g.log);
    assert.deepEqual(again.skill_defs, g.state.skill_defs);
    assert.deepEqual(again.entities.pc.sheet.skills, sheet(g).skills);
    // another campaign of the same content knows nothing of it
    const other = hero('Rogue', 'Razor Cut + Feint');
    assert.equal(skillOf(content, 'dyn.viper_sting', other.state), null);
    assert.match(panel(other, '#skill Viper Sting'), /UNKNOWN SKILL "Viper Sting"/);
    assert.deepEqual(learnSkill(other.state, content, 'pc', 'dyn.viper_sting').errors, ['no Skill dyn.viper_sting']);
    // fixed once booked: the same id again is refused (by the validator, and by the reducer)
    assert.match(defineSkill(g.state, content, VIPER).errors.join(), /id dyn\.viper_sting exists/);
    assert.throws(() => applyEvent(fold(g.log), d.events[0]), /skill defined twice/);
    assert.match(learnSkill(g.state, content, 'pc', 'dyn.viper_sting').errors.join(), /knows Viper Sting already/);
});

test('9B-1 (1): only the engine books a Skill definition: an extractor delta that would write it breaks the Decision Ownership', () => {
    const e = defineSkill(hero('Rogue', 'Razor Cut + Feint').state, content, VIPER).events[0];
    assert.equal(eventKind(e), 'skills');
    for (const type of ['fact', 'person.new', 'object.new', 'feature']) assert.match(ownershipViolation({ kind: 'delta', type }, e, null) || '', /skills|without declared writes/, type);
    assert.equal(ownershipViolation({ kind: 'engine' }, e, null), null, 'the engine\'s own step');
    const p = { t: 'skill.progress', d: { id: 'pc', skill: 'rogue.razor_cut', to: { prof: 1, pp: 18 } } };
    assert.equal(eventKind(p), 'pc.progress');
    assert.match(ownershipViolation({ kind: 'delta', type: 'fact' }, p, null) || '', /pc\.progress/);
});

// ------------------------------------------------------------------------------------------------ 2. one resolver
test('9B-1 (2): static and dynamic Skills go through the same resolver: id, name, combat, the encounter snapshot', () => {
    const g = taught();
    assert.equal(skillOf(content, 'rogue.razor_cut', g.state).name, 'Razor Cut');
    assert.equal(skillOf(content, 'dyn.viper_sting', g.state).name, 'Viper Sting');
    assert.equal(findSkill(content, 'viper sting', 'rogue', g.state).id, 'dyn.viper_sting');
    assert.equal(findSkill(content, 'Razor Cut', 'rogue', g.state).id, 'rogue.razor_cut');
    assert.equal(skillOf(content, 'dyn.viper_sting'), null, 'without the campaign: the content only');
    assert.ok(actionsOf(sheet(g), content, 2, g.state)['dyn.viper_sting']);
    spawn(g, 'mon.boar', { anchor: 'boar' });
    const ctx = fight(g, ['mon.boar']);
    assert.deepEqual(ctx.enc.combatants.pc.fixed.actions['dyn.viper_sting'], { prof: 1, pp: 0 });
    const hit = attackAction(ctx, 'pc', 'mon.boar', 'dyn.viper_sting');
    assert.equal(hit.illegal, undefined, hit.illegal);
    assert.equal(hit.raw_text, '9 + AGI 6×1.6 + ATK 6 = 24.6');
    assert.equal(ctx.enc.combatants.pc.current.sta, 94, 'its own cost');
    const g2 = taught(STONE, 'Razor Cut + Feint');
    spawn(g2, 'mon.boar', { anchor: 'boar' });
    const ctx2 = fight(g2, ['mon.boar']);
    const r = skillAction(ctx2, 'pc', 'dyn.stone_skin');
    assert.deepEqual(r.effects, ['DEF +6 until the start of Alaric\'s next turn'], 'base 4 + floor(VIT 5 × 0.5)');
    // a running fight keeps the Proficiency it locked: a promotion booked meanwhile changes nothing in it
    setProf(g, 'dyn.viper_sting', 3);
    assert.deepEqual(ctx.enc.combatants.pc.fixed.actions['dyn.viper_sting'], { prof: 1, pp: 0 });
});

test('9B-1 (2): a dynamic Skill is used by its name in a whole fight (the player\'s words, the engine\'s fight)', () => {
    const g = taught();
    spawn(g, 'mon.wolf');
    const turns = fightOut(g, ['Viper Sting the wolf']);
    const used = turns.flatMap((r) => r.outcome?.records || []).filter((x) => x.actor === 'pc').map((x) => x.skill);
    assert.ok(used.length && used.every((x) => x === 'dyn.viper_sting'), JSON.stringify(used));
    assert.equal(g.state.encounter, null, 'the fight is over');
    assert.deepEqual(fold(g.log).entities.pc.sheet.skills, sheet(g).skills, 'replay');
});

// ------------------------------------------------------------------------------------------------ 3. planner, HUD, commands
test('9B-1 (3): the planner, the HUD, #skills and #skill know a learned dynamic Skill; the planner accepts its id', () => {
    const g = taught();
    const ctx = withContentSkills(planContext(g.state, content, { present: [] }), content, g.state);
    assert.ok(ctx.skills.some((s) => s.id === 'dyn.viper_sting' && s.name === 'Viper Sting' && /attack/.test(s.text)), JSON.stringify(ctx.skills));
    assert.ok(ctx.contentSkills.has('dyn.viper_sting'));
    assert.ok(ctx.contentSkills.has('rogue.razor_cut'));
    assert.equal(withContentSkills({}, content).contentSkills.has('dyn.viper_sting'), false);
    assert.match(renderHud(g.state, content), /Viper Sting P1/);
    assert.match(panel(g, '#skills'), /Viper Sting \(learned in this campaign\) \| Offensive \| Rank F \| Complexity 1 \| P1 \(PP 0\/75\) \| Tags Precision \| Cost 6 STA/);
    const one = panel(g, '#skill Viper Sting');
    assert.match(one, /Base Power 9 \| Scaling AGI ×1\.6 \| Uses ATK \| physical/);
    assert.match(one, /Effect: A darting cut at an opening in the guard\./);
    assert.match(one, /Proficiency Progress: PP 0\/75 · Affinity ×1\.5 \(highest of its tags\)/);
    spawn(g, 'mon.boar', { anchor: 'boar' });
    g.input('Viper Sting the boar');
    assert.match(renderHud(g.state, content), /Viper Sting/, 'the combat HUD lists it');
});

// ------------------------------------------------------------------------------------------------ 4. invalid
test('9B-1 (4): an invalid id or definition books nothing; a legacy campaign defines no Skill; an unknown Skill is learned by no one', () => {
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    const before = JSON.stringify(g.state);
    const bad = [
        [{ ...VIPER, id: 'viper_sting' }, /id: "dyn\."/],
        [{ ...VIPER, id: 'dyn.Viper' }, /id: "dyn\."/],
        [{ ...VIPER, id: 'rogue.razor_cut' }, /id: "dyn\."/],
        [{ ...VIPER, name: 'Razor Cut' }, /name Razor Cut is the name of a Skill that exists/],
        [{ ...VIPER, name: '<script>' }, /name/],
        [{ ...VIPER, rank: 'E' }, /rank E: only F-rank/],
        [{ ...VIPER, rank: 'Z' }, /rank: F-S/],
        [{ ...VIPER, complexity: 4 }, /complexity/],
        [{ ...VIPER, tags: ['Necromancy'] }, /tags/],
        [{ ...VIPER, tags: [] }, /tags/],
        [{ ...VIPER, target: 'self' }, /target: enemy/],
        [{ ...VIPER, category: 'Defensive' }, /category: Offensive exactly when it attacks/],
        [{ ...VIPER, range: { band: 'FAR' } }, /range/],
        [{ ...VIPER, range: { band: 'ENGAGED', meters: 30 } }, /range/],
        [{ ...VIPER, cost: { resource: 'hp', amount: 6 } }, /cost/],
        [{ ...VIPER, cost: { resource: 'sta', amount: 2 } }, /cost 2: 5-10 at Complexity 1/],
        [{ ...VIPER, attack: { ...VIPER.attack, base: 13 } }, /attack\.base 13: at most 12/],
        [{ ...VIPER, attack: { ...VIPER.attack, scaling: [{ stat: 'AGI', coef: 2 }] } }, /stat coefficients 2: at most 1\.9/],
        [{ ...VIPER, attack: { ...VIPER.attack, scaling: [{ stat: 'PER', coef: 1 }] } }, /attack\.scaling/],
        [{ ...VIPER, attack: { ...VIPER.attack, strikes: 2 } }, /attack\.share: at most 1\/2/],
        [{ ...VIPER, attack: { ...VIPER.attack, strikes: 2, share: 0.5 } }, /attack\.base 9: at most 6 per strike/],
        [{ ...VIPER, attack: { ...VIPER.attack, damage_type: 'holy' } }, /damage_type/],
        [{ ...VIPER, attack: { ...VIPER.attack, code: 'return 999' } }, /attack: unknown field code/],
        [{ ...VIPER, range: { band: 'LONG' }, attack: { ...VIPER.attack, ignores_partial_cover: true } }, /2 budget features .* at most 1 at Complexity 1/],
        [{ ...VIPER, effects: [{ kind: 'stun', rounds: 2 }] }, /kind stun is not supported/],
        [{ ...VIPER, effects: [{ kind: 'temp_def', base: 3, stat: 'VIT', coef: 0.5, until: 'own_next_turn' }] }, /temp_def: not on an attack/],
        [{ ...VIPER, effects: [{ kind: 'area', shape: 'caster_engaged' }] }, /stat coefficients 1\.6: at most 1\.4/],
        [{ ...VIPER, extra: 1 }, /unknown field extra/],
        [{ ...VIPER, formula: '(a)=>a' }, /unknown field formula/],
        [{ ...STONE, effects: [] }, /needs an effect/],
        [{ ...STONE, effects: [{ ...STONE.effects[0], base: 7 }] }, /temp_def\.base: 0-6/],
        [{ ...STONE, effects: [{ ...STONE.effects[0], stat: 'PER' }] }, /temp_def\.stat/],
        [{ ...STONE, effects: [{ kind: 'barrier', base: 10, stat: 'WIL', coef: 2, floor: false, until: 'destroyed_or_own_next_turn' }] }, /barrier: at most 6 \+ stat ×1\.5 at Complexity 1/],
        [{ ...STONE, effects: [STONE.effects[0], STONE.effects[0]] }, /each kind once/],
        [{ ...STONE, effects: [{ kind: 'incoming_damage_reduction', pct: 60, until: 'own_next_turn' }] }, /pct: 1-25/],
        [{ ...STONE, effects: [{ kind: 'post_attack_temp_def', flat: 4, until: 'own_next_turn' }] }, /only on an attack/],
        [{ ...STONE, range: { band: 'SHORT' } }, /range: none/],
        [{ ...STONE, activation: 'passive' }, /activation/],
        [{ ...STONE, description: '' }, /description/],
        [{ ...STONE, origin: 'a dream' }, /origin/],
        [null, /an object/],
    ];
    for (const [def, why] of bad) {
        const r = defineSkill(g.state, content, def);
        assert.deepEqual(r.events, [], JSON.stringify(def));
        assert.match(r.errors.join(' | '), why, JSON.stringify(def));
    }
    assert.equal(JSON.stringify(g.state), before, 'no state change');
    assert.deepEqual(skillDefErrors(STONE, content, g.state), []);
    assert.deepEqual(skillDefErrors({ ...VIPER, complexity: 2, cost: { resource: 'sta', amount: 12 }, attack: { ...VIPER.attack, base: 16, scaling: [{ stat: 'AGI', coef: 1.4 }, { stat: 'STR', coef: 1 }] } }, content, g.state), [], 'C2 bounds');
    // a legacy campaign has no dynamic Skills; an unknown or an item is learned by no one; progress of an unknown Skill throws
    const old = hero('Ranger', 'Aimed Shot + Power Shot', legacy);
    assert.deepEqual(defineSkill(old.state, legacy, VIPER).events, []);
    assert.match(defineSkill(old.state, legacy, VIPER).errors.join(), /ruleset 2/);
    assert.match(learnSkill(g.state, content, 'pc', 'dyn.nothing').errors.join(), /no Skill/);
    assert.match(learnSkill(g.state, content, 'pc', 'item.scorchburst_scroll').errors.join(), /no Skill/);
    assert.match(learnSkill(g.state, content, 'nobody', 'rogue.feint').errors.join(), /no character sheet/);
    assert.throws(() => applyEvent(fold(g.log), { t: 'skill.progress', d: { id: 'pc', skill: 'rogue.feint', to: { prof: 2, pp: 0 } } }), /unknown skill/);
});

// ------------------------------------------------------------------------------------------------ 5. complexity, tags, affinity
test('9B-1 (5): the 18 starter Skills of Warrior, Mage and Rogue have a Complexity and discipline tags; only the highest affinity counts', () => {
    const expect = {
        'warrior.heavy_slash': [1, 'Martial'], 'warrior.guard': [1, 'Defense'], 'warrior.power_strike': [2, 'Martial'], 'warrior.quick_slash': [1, 'Martial'], 'warrior.charge': [1, 'Martial,Mobility'], 'warrior.deflect': [1, 'Defense'],
        'mage.arcane_bolt': [1, 'Arcane'], 'mage.arcane_ward': [1, 'Arcane,Defense'], 'mage.flame_lance': [2, 'Arcane'], 'mage.arcane_burst': [2, 'Arcane'], 'mage.blink': [1, 'Arcane,Mobility'], 'mage.focused_ward': [2, 'Arcane,Defense'],
        'rogue.razor_cut': [1, 'Precision'], 'rogue.piercing_thrust': [1, 'Precision'], 'rogue.long_lunge': [1, 'Precision,Mobility'], 'rogue.evasive_step': [1, 'Mobility,Defense'], 'rogue.feint': [1, 'Precision'], 'rogue.guarded_cut': [1, 'Precision,Defense'],
    };
    for (const cls of ['warrior', 'mage', 'rogue']) {
        for (const id of content.classes.get(cls).skill_pool) {
            const s = content.skills.get(id);
            assert.deepEqual([s.complexity, s.tags.join()], expect[id], id);
        }
    }
    const sk = (id) => content.skills.get(id);
    assert.equal(affinityFor(content, 'rogue', sk('rogue.evasive_step')), 1.25, 'Mobility 1.25 over Defense 1.00');
    assert.equal(affinityFor(content, 'rogue', sk('rogue.razor_cut')), 1.5);
    assert.equal(affinityFor(content, 'warrior', sk('warrior.charge')), 1.5, 'Martial 1.50, not 1.50 × 1.00');
    assert.equal(affinityFor(content, 'mage', sk('mage.arcane_ward')), 1.5, 'Arcane 1.50 over Defense, never a product');
    assert.equal(affinityFor(content, 'warrior', sk('mage.arcane_bolt')), 0.75);
    assert.equal(affinityFor(content, 'warrior', { tags: ['Arcane', 'Defense'] }), 1.25, 'the highest of two tags');
    assert.equal(affinityFor(content, 'rogue', { tags: [] }), 1, 'no tags: otherwise');
    assert.deepEqual([12 * 1.5, 12 * 1.25, 12 * 0.75].map(Math.round), [18, 15, 9]);
    assert.equal(ppAward(content, { class: 'warrior' }, sk('mage.arcane_bolt')), 9);
    assert.equal(ppAward(content, { class: 'rogue' }, sk('rogue.evasive_step')), 15);
    assert.deepEqual([1, 2, 3].map((c) => promotionPp(content, { complexity: c })), [75, 100, 150]);
    assert.equal(promotionPp(content, { complexity: null }), 75, 'no Complexity: C1');
});

// ------------------------------------------------------------------------------------------------ 6. PP award
test('9B-1 (6): a real fight books PP once per Skill when it is over, by the highest affinity; replay is identical', () => {
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    spawn(g, 'mon.wolf');
    const turns = fightOut(g, ['Razor Cut the wolf', 'I use Evasive Step', 'Razor Cut the wolf']);
    assert.equal(g.state.encounter, null);
    const pp = progressOf(turns);
    assert.deepEqual(pp.map((e) => [e.d.skill, e.d.gained, e.d.to.pp]), [['rogue.razor_cut', 18, 18], ['rogue.evasive_step', 15, 15]], 'Razor Cut twice: once; Evasive Step under attack');
    // booked only at the end: every progress event is in the turn the fight ended in
    const last = turns.at(-1).events.map((e) => e.t);
    assert.ok(last.indexOf('skill.progress') < last.indexOf('encounter.ended'));
    assert.equal(turns.slice(0, -1).flatMap((r) => r.events).filter((e) => e.t === 'skill.progress').length, 0);
    const shown = turnPanel(g.state, content);
    assert.match(shown, /SKILL \+18 PP Razor Cut → P1 18\/75/);
    assert.match(shown, /SKILL \+15 PP Evasive Step → P1 15\/75/);
    assert.deepEqual(sheet(g).skills['rogue.basic_attack'], { prof: 1, pp: 0 }, 'not used, nothing gained');
    assert.deepEqual(fold(g.log).entities.pc.sheet.skills, sheet(g).skills);
    assert.deepEqual(fold(g.log).pp_keys, g.state.pp_keys);
    // NPCs do not progress
    assert.ok(pp.every((e) => e.d.id === 'pc'));
});

test('9B-1 (6): no PP for a trivial foe, a foe that never attacked, a defense no one tested, an illegal action, a lost fight', () => {
    // a foe far below him: no challenge
    const low = hero('Rogue', 'Razor Cut + Evasive Step');
    book(low, { t: 'level.up', d: { id: 'pc', level: 5, free_points: 0, favored: [], xp_after: 0 } });
    spawn(low, 'mon.wolf');
    const ctx = fight(low, ['mon.wolf']);
    const r1 = attackAction(ctx, 'pc', 'mon.wolf', 'rogue.razor_cut');
    noteUse(ctx, r1);
    noteUse(ctx, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    assert.deepEqual(fightProgress(low.state, content, ctx.enc), [], 'a Level 1 wolf against a Level 5 hero');
    // a worthy foe that never attacked him
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    spawn(g, 'mon.wolf');
    const c2 = fight(g, ['mon.wolf']);
    noteUse(c2, attackAction(c2, 'pc', 'mon.wolf', 'rogue.razor_cut'));
    assert.deepEqual(fightProgress(g.state, content, c2.enc), [], 'no foe attacked him');
    noteUse(c2, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    assert.deepEqual(fightProgress(g.state, content, c2.enc).map((e) => e.d.skill), ['rogue.razor_cut']);
    // a defense nobody tested: Evasive Step and then the fight ends; his own next action comes first
    const c3 = fight(g, ['mon.wolf']);
    noteUse(c3, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    noteUse(c3, skillAction(c3, 'pc', 'rogue.evasive_step', { dir: 'closer' }));
    noteUse(c3, attackAction(c3, 'pc', 'mon.wolf', 'rogue.razor_cut'));
    assert.deepEqual(Object.keys(c3.enc.pp.used), ['rogue.razor_cut'], 'the step changed no band and no foe tested the defense');
    // an illegal action and a Skill he does not know
    const c4 = fight(g, ['mon.wolf']);
    noteUse(c4, attackAction(c4, 'pc', 'mon.wolf', 'rogue.piercing_thrust'));
    c4.enc.combatants.pc.current.sta = 0;
    noteUse(c4, attackAction(c4, 'pc', 'mon.wolf', 'rogue.razor_cut'));
    noteUse(c4, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    assert.deepEqual(c4.enc.pp.used, {}, 'refused uses give nothing');
    // a lost or a fled fight books nothing
    const c5 = fight(g, ['mon.wolf']);
    noteUse(c5, attackAction(c5, 'pc', 'mon.wolf', 'rogue.razor_cut'));
    noteUse(c5, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    c5.enc.combatants.pc.current.escaped = true;
    assert.deepEqual(fightProgress(g.state, content, c5.enc), []);
    c5.enc.combatants.pc.current.escaped = false;
    c5.enc.combatants.pc.current.defeated = true;
    assert.deepEqual(fightProgress(g.state, content, c5.enc), []);
    // the same fight's key is booked once: a second ending of it gives nothing
    const c6 = fight(g, ['mon.wolf']);
    noteUse(c6, attackAction(c6, 'pc', 'mon.wolf', 'rogue.razor_cut'));
    noteUse(c6, { actor: 'mon.wolf', kind: 'attack', strikes: [{ target: 'pc' }] });
    const first = fightProgress(g.state, content, c6.enc);
    book(g, ...first);
    assert.deepEqual(fightProgress(g.state, content, c6.enc), []);
});

test('9B-1 (6): promotions by Complexity with the carry-over; P5 is the end and triggers nothing', () => {
    const c1 = { complexity: 1 };
    assert.deepEqual(advancePp(content, { prof: 1, pp: 70 }, c1, 18), { prof: 2, pp: 13 });
    assert.deepEqual(advancePp(content, { prof: 2, pp: 99 }, { complexity: 2 }, 18), { prof: 3, pp: 17 });
    assert.deepEqual(advancePp(content, { prof: 3, pp: 140 }, { complexity: 3 }, 18), { prof: 4, pp: 8 });
    assert.deepEqual(advancePp(content, { prof: 4, pp: 70 }, c1, 18), { prof: 5, pp: 0 });
    assert.equal(advancePp(content, { prof: 5, pp: 0 }, c1, 18), null);
    assert.deepEqual(advancePp(content, { prof: 1, pp: 0 }, c1, 160), { prof: 3, pp: 10 }, 'every promotion takes the same 75 PP');
    // in a real fight: a promotion and its line at the end of the fight; #skills shows the threshold of its Complexity
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    setProf(g, 'rogue.razor_cut', 1, 70);
    spawn(g, 'mon.wolf');
    const turns = fightOut(g, ['Razor Cut the wolf']);
    const up = progressOf(turns).find((e) => e.d.skill === 'rogue.razor_cut');
    assert.deepEqual([up.d.from, up.d.to], [{ prof: 1, pp: 70 }, { prof: 2, pp: 13 }]);
    assert.match(turnPanel(g.state, content), /SKILL \+18 PP Razor Cut → P2 13\/75 · PROFICIENCY P1 → P2/);
    assert.deepEqual(validateState(g.state, content), []);
    assert.match(panel(g, '#skills'), /Razor Cut \| Offensive \| Rank F \| Complexity 1 \| P2 \(PP 13\/75\)/);
    const m = hero('Mage', 'Flame Lance + Blink');
    setProf(m, 'mage.flame_lance', 2, 40);
    assert.match(panel(m, '#skills'), /Flame Lance \| Offensive \| Rank F \| Complexity 2 \| P2 \(PP 40\/100\)/, 'C2: 100 PP, at any Proficiency');
    setProf(m, 'mage.flame_lance', 5, 0);
    assert.match(panel(m, '#skills'), /Flame Lance .* P5 \(PP max\)/);
    assert.match(panel(m, '#skill Flame Lance'), /Proficiency P5 \(PP max\)/);
});

test('9B-1 (6): a check of real difficulty with a learned Skill outside a fight is PP once per Skill and thing; a trivial one is none', async () => {
    const g = await campaign(content, { cls: 'Rogue', skills: 'Razor Cut + Feint' });
    const at = g.state().scene.at;
    const feature = (id, difficulty) => ({ t: 'feature.set', d: { feature: { id, at, name: `knotted rope ${id}`, kind: 'obstacle', hidden: false, status: 'active', trigger: null, on: null, stat: 'AGI', difficulty, harm: null, since: 1, found: true, history: [] } } });
    inject(g, [feature('feat.rope', 'hard'), feature('feat.twine', 'trivial')]);
    const cut = (id) => say(g, '*I cut the knotted rope with Razor Cut*', { type: 'ability_world', skill: 'rogue.razor_cut', target: id, target_words: 'the knotted rope', goal: 'cut it', quote: 'I cut the knotted rope with Razor Cut' });
    await cut('feat.rope');
    let s = g.state();
    assert.equal(outcomeOf(g).kind, 'ability_world');
    assert.deepEqual(s.entities.pc.sheet.skills['rogue.razor_cut'], { prof: 1, pp: 18 }, JSON.stringify(outcomeOf(g)));
    await g.reply('He saws at the rope.', { expected: {}, deltas: [] });
    await cut('feat.rope');
    assert.equal(g.state().entities.pc.sheet.skills['rogue.razor_cut'].pp, 18, 'the same thing again: no second award');
    await g.reply('Again.', { expected: {}, deltas: [] });
    await cut('feat.twine');
    assert.equal(g.state().entities.pc.sheet.skills['rogue.razor_cut'].pp, 18, 'a trivial check: none');
});

// ------------------------------------------------------------------------------------------------ 7. multipliers
test('9B-1 (7): cost, power and the non-damage factors by Proficiency; #skill shows what the fight books; percentages and bands do not grow', () => {
    const m = hero('Mage', 'Arcane Bolt + Arcane Ward');
    const ward = content.skills.get('mage.arcane_ward');
    const st = sheet(m).stats;
    assert.equal(st.WIL, 6);
    assert.deepEqual([1, 2, 3, 4, 5].map((p) => effectValue(content, ward.effects[0], st, p, 2)), [15, 15, 16, 17, 17], '6 + WIL 6×1.5 = 15; ×1.05 15.75 → 16; ×1.10 16.5 → 17; ×1.15 17.25 → 17');
    setProf(m, 'mage.arcane_ward', 3);
    setProf(m, 'mage.arcane_bolt', 4);
    spawn(m, 'mon.boar', { anchor: 'boar', band: 'SHORT' });
    const ctx = fight(m, ['mon.boar']);
    const r = skillAction(ctx, 'pc', 'mage.arcane_ward');
    assert.deepEqual(r.effects, ['Barrier 16 HP (until destroyed or the start of Alaric\'s next turn)']);
    assert.equal(r.cost.amount, 10, 'P3 cost ×0.95 = 9.5 → 10');
    assert.match(panel(m, '#skill Arcane Ward'), /Current effect: Barrier 16 HP \(×1\.05 Proficiency, rounded\)/);
    const bolt = attackAction(ctx, 'pc', 'mon.boar', 'mage.arcane_bolt');
    assert.match(bolt.strikes[0].steps.join(' '), /×1\.15 Proficiency/, 'power by P4');
    assert.equal(bolt.cost.amount, 9, 'P4 cost ×0.925 = 9.25 → 9');
    // a DEF bonus (floored) and a flat one
    const w = hero('Warrior', 'Guard + Deflect');
    setProf(w, 'warrior.guard', 4);
    setProf(w, 'warrior.deflect', 5);
    spawn(w, 'mon.boar', { anchor: 'boar' });
    const cw = fight(w, ['mon.boar']);
    assert.deepEqual(skillAction(cw, 'pc', 'warrior.guard').effects, ['DEF +7 until the start of Alaric\'s next turn'], '3 + floor(VIT 6×0.5) = 6; ×1.10 = 6.6 → 7');
    assert.match(skillAction(cw, 'pc', 'warrior.deflect').effects[0], /incoming damage -25%/, 'a percentage stays');
    const r2 = hero('Rogue', 'Guarded Cut + Long Lunge');
    setProf(r2, 'rogue.guarded_cut', 5);
    spawn(r2, 'mon.boar', { anchor: 'boar', hp: 500 });
    const cr = fight(r2, ['mon.boar']);
    attackAction(cr, 'pc', 'mon.boar', 'rogue.guarded_cut');
    assert.equal(cr.enc.combatants.pc.current.effects.find((e) => e.kind === 'temp_def').value, 5, '4 × 1.15 = 4.6 → 5');
    assert.match(panel(r2, '#skill Guarded Cut'), /Current effect: DEF \+5 after the attack \(×1\.15 Proficiency, rounded\)/);
    assert.equal(content.skills.get('rogue.long_lunge').range.extra_band, true, 'a band is no number that grows');
    // P1 and P2: the written values (factor 1.00)
    const fresh = hero('Mage', 'Arcane Bolt + Arcane Ward');
    assert.match(panel(fresh, '#skill Arcane Ward'), /Current effect: Barrier 15 HP$/m);
});

// ------------------------------------------------------------------------------------------------ 8. existing Skills
test('9B-1 (8): the Warrior, Mage and Rogue Skills keep their values; at P1 a fight books what it did before', () => {
    const values = {
        'warrior.heavy_slash': [10, 7], 'warrior.power_strike': [16, 12], 'warrior.quick_slash': [6, 5], 'warrior.charge': [8, 8],
        'mage.arcane_bolt': [10, 10], 'mage.flame_lance': [16, 16], 'mage.arcane_burst': [8, 14],
        'rogue.razor_cut': [6, 5], 'rogue.piercing_thrust': [11, 9], 'rogue.long_lunge': [8, 8], 'rogue.guarded_cut': [6, 8],
    };
    for (const [id, [base, cost]] of Object.entries(values)) assert.deepEqual([content.skills.get(id).attack.base, content.skills.get(id).cost.amount], [base, cost], id);
    for (const id of ['warrior.guard', 'warrior.deflect', 'mage.arcane_ward', 'mage.blink', 'mage.focused_ward', 'rogue.evasive_step', 'rogue.feint']) assert.equal(content.skills.get(id).attack, null, id);
    assert.deepEqual(content.skills.get('mage.focused_ward').effects[0], { kind: 'barrier', base: 10, stat: 'WIL', coef: 2, floor: false, until: 'destroyed_or_own_next_turn' });
    const g = hero('Rogue', 'Razor Cut + Long Lunge');
    spawn(g, 'mon.boar', { anchor: 'boar' });
    const ctx = fight(g, ['mon.boar']);
    assert.equal(attackAction(ctx, 'pc', 'mon.boar', 'rogue.razor_cut').raw_text, '6 + AGI 6×1.50 + ATK 6 = 21');
    // the static Skills meet the validator's own bounds (a dynamic Skill is held to what the content itself does)
    for (const cls of ['warrior', 'mage', 'rogue']) {
        for (const id of content.classes.get(cls).skill_pool) {
            const s = content.skills.get(id);
            const def = {
                id: `dyn.copy_${id.split('.')[1]}`, name: `Copy ${s.name}`.slice(0, 40), description: s.effect_text, origin: { kind: 'test' }, rank: s.rank, complexity: s.complexity, tags: s.tags,
                category: s.category, activation: 'action', target: s.attack ? 'enemy' : 'self', cost: s.cost, effects: s.effects,
                ...(s.attack ? { range: { band: s.range.band, ...(s.range.extra_band ? { extra_band: true } : {}) }, attack: { base: s.attack.base, scaling: s.attack.scaling.map((t) => ({ stat: t.stat, coef: t.coef })), damage_type: s.attack.damage_type, ...(s.attack.ignores_partial_cover ? { ignores_partial_cover: true } : {}) } } : {}),
            };
            assert.deepEqual(skillDefErrors(def, content, g.state), [], id);
        }
    }
});

// ------------------------------------------------------------------------------------------------ 9. legacy
test('9B-1 (9): a legacy campaign gains no PP from a fight; its sheets, saves and panels keep working', () => {
    const g = hero('Duelist', 'Feint + Lunge', legacy);
    assert.equal(g.state.meta.ruleset, 1);
    spawn(g, 'mon.wolf');
    const turns = fightOut(g, ['Basic Attack the wolf']);
    assert.equal(g.state.encounter, null);
    assert.deepEqual(progressOf(turns), []);
    for (const v of Object.values(sheet(g).skills)) assert.deepEqual(v, { prof: 1, pp: 0 });
    assert.equal(g.state.pp_keys, undefined);
    assert.match(panel(g, '#skills'), /P1 \(PP 0\/75\)/);
    // a state saved before Patch 9B-1 (no skill_defs) resolves, validates and folds as before
    const saved = JSON.parse(JSON.stringify(g.state));
    delete saved.skill_defs;
    assert.equal(skillOf(legacy, 'duelist.feint', saved).name, 'Feint');
    assert.deepEqual(validateState(saved, legacy), []);
    assert.match(runCommands(saved, legacy, '#skills').panels.join('\n'), /Feint/);
    const ctx = { enc: { pp: { used: { 'duelist.feint': 'x' }, threatened: true }, combatants: { pc: { current: {}, fixed: { level: 1 } }, 'mon.x': { side: 'hostile', fixed: { level: 1 } } }, id: 'enc.x' } };
    assert.deepEqual(fightProgress(g.state, legacy, ctx.enc), []);
    assert.deepEqual(endEncounterEvents(g.state, legacy, { ...ctx.enc, defeated: [], escaped: [], pending_xp: 0, combatants: { pc: { current: { defeated: false }, fixed: { level: 1 } } } }).events.map((e) => e.t), ['encounter.ended']);
});

// ------------------------------------------------------------------------------------------------ review of 9B-1
test('9B-1 review (1): a legacy campaign keeps its written effect values at P3-P5 (Arcane Ward, Guard, Guarded Thrust); a new one grows', () => {
    const m = hero('Mage', 'Arcane Bolt + Arcane Ward', legacy);
    assert.equal(m.state.meta.ruleset, 1);
    assert.equal(sheet(m).stats.WIL, 6);
    for (const prof of [3, 4]) {
        setProf(m, 'mage.arcane_ward', prof);
        spawn(m, `mon.boar${prof}`, { anchor: 'boar', band: 'SHORT' });
        const ctx = fight(m, [`mon.boar${prof}`]);
        assert.deepEqual(skillAction(ctx, 'pc', 'mage.arcane_ward').effects, ['Barrier 15 HP (until destroyed or the start of Alaric\'s next turn)'], `legacy P${prof}: 6 + WIL 6×1.5, no factor`);
        const one = panel(m, '#skill Arcane Ward');
        assert.match(one, /Current effect: Barrier 15 HP$/m, `legacy P${prof}: #skill shows what the fight books`);
        assert.doesNotMatch(one, /Proficiency, rounded/);
    }
    const w = hero('Warrior', 'Guard + Deflect', legacy);
    setProf(w, 'warrior.guard', 4);
    spawn(w, 'mon.boar', { anchor: 'boar' });
    assert.deepEqual(skillAction(fight(w, ['mon.boar']), 'pc', 'warrior.guard').effects, ['DEF +6 until the start of Alaric\'s next turn'], 'legacy P4: 3 + floor(VIT 6×0.5)');
    const d = hero('Duelist', 'Guarded Thrust + Feint', legacy);
    setProf(d, 'duelist.guarded_thrust', 5);
    spawn(d, 'mon.boar', { anchor: 'boar', hp: 500 });
    const cd = fight(d, ['mon.boar']);
    attackAction(cd, 'pc', 'mon.boar', 'duelist.guarded_thrust');
    assert.equal(cd.enc.combatants.pc.current.effects.find((e) => e.kind === 'temp_def').value, 4, 'legacy P5: the flat 4');
    // the same Skills in a new campaign keep the 9B-1 factors
    const n = hero('Mage', 'Arcane Bolt + Arcane Ward');
    setProf(n, 'mage.arcane_ward', 4);
    spawn(n, 'mon.boar', { anchor: 'boar', band: 'SHORT' });
    assert.deepEqual(skillAction(fight(n, ['mon.boar']), 'pc', 'mage.arcane_ward').effects, ['Barrier 17 HP (until destroyed or the start of Alaric\'s next turn)']);
});

test('9B-1 review (2): a dynamic Arcane Skill with the aspect Fire: validated, stored, replayed and shown; aspects are metadata apart from the affinity tags', () => {
    const EMBER = {
        id: 'dyn.ember_dart', name: 'Ember Dart', description: 'A dart of burning mana thrown from the palm.', origin: { kind: 'self_development', note: 'practised at the forge' }, rank: 'F', complexity: 1,
        tags: ['Arcane'], aspects: ['Fire'], category: 'Offensive', activation: 'action', target: 'enemy', cost: { resource: 'mp', amount: 8 }, range: { band: 'MEDIUM' },
        attack: { base: 10, scaling: [{ stat: 'INT', coef: 1.75 }], damage_type: 'magical' }, effects: [],
    };
    const g = hero('Mage', 'Arcane Bolt + Arcane Ward');
    assert.deepEqual(skillDefErrors(EMBER, content, g.state), []);
    const d = defineSkill(g.state, content, EMBER);
    book(g, ...d.events);
    book(g, ...learnSkill(g.state, content, 'pc', 'dyn.ember_dart').events);
    const s = g.state.skill_defs['dyn.ember_dart'];
    assert.deepEqual([s.tags, s.aspects], [['Arcane'], ['Fire']]);
    assert.match(s.source_text, /Tags: Arcane\nAspects: Fire/);
    assert.deepEqual(fold(g.log).skill_defs['dyn.ember_dart'], s, 'replay');
    assert.match(panel(g, '#skills'), /Ember Dart \(learned in this campaign\) \| Offensive \| Rank F \| Complexity 1 \| P1 \(PP 0\/75\) \| Tags Arcane \| Aspects Fire \| Cost 8 MP/);
    assert.match(panel(g, '#skill Ember Dart'), /\| Tags Arcane \| Aspects Fire\n/);
    // no mechanical effect: the affinity reads the tags only, the attack is the plain magical one
    assert.equal(affinityFor(content, 'mage', s), 1.5);
    assert.equal(affinityFor(content, 'mage', { ...s, aspects: ['Shadow', 'Ice'] }), 1.5);
    spawn(g, 'mon.boar', { anchor: 'boar', band: 'MEDIUM' });
    const ctx = fight(g, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'dyn.ember_dart');
    assert.equal(r.illegal, undefined, r.illegal);
    assert.equal(r.raw_text, '10 + INT 6×1.75 + MATK 6 = 26.5');
    // without aspects a definition stays valid (an empty list); an unknown, a doubled, too many or an affinity tag as aspect is refused
    assert.deepEqual(defineSkill(g.state, content, { ...EMBER, id: 'dyn.plain_dart', name: 'Plain Dart', aspects: undefined }).skill.aspects, []);
    for (const aspects of [['Plasma'], ['Fire', 'Fire'], ['Fire', 'Ice', 'Shadow', 'Light'], ['Arcane'], 'Fire', [{ kind: 'Fire', burn: 3 }]]) {
        const bad = defineSkill(g.state, content, { ...EMBER, id: 'dyn.bad_dart', name: 'Bad Dart', aspects });
        assert.deepEqual(bad.events, [], JSON.stringify(aspects));
        assert.match(bad.errors.join(), /aspects: 0-3 of Fire, Ice, Lightning/, JSON.stringify(aspects));
    }
    // the static Skills carry none and show none
    assert.equal(content.skills.get('mage.flame_lance').aspects, undefined);
    assert.doesNotMatch(panel(g, '#skills'), /Arcane Bolt[^\n]*Aspects/);
});
