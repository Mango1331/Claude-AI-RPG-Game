// Patch 9B-2 (docs/PATCH9B2_PASSIVES_EFFECTS_NPC_DEFENSE.md): dynamic Passives (passive.defined, passive.gained, the
// derived values, cost reductions, resistances, combat conditions), heal and restore as Skill effects, and the first
// defensive and tactical Skill use of trained NPCs (ruleset 2).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadProductContent, Game, scriptedDice } from '../helpers.js';
import { applyEvent, fold } from '../../src/state.js';
import { validateState } from '../../src/validate.js';
import { deriveCharacter } from '../../src/derived.js';
import { initEncounter, attackAction, skillAction, npcTactic, damagePreview } from '../../src/combat.js';
import { scaleCreature, humanSheet } from '../../src/npcgen.js';
import { runCommands } from '../../src/commands.js';
import { renderHud } from '../../src/hud.js';
import { npcTemplate } from '../../src/content.js';
import { eventKind, ownershipViolation } from '../../src/v4/ownership.js';
import { defineSkill, learnSkill, skillDefErrors } from '../../src/skills.js';
import { passiveDefErrors, definePassive, gainPassive, passiveTotals } from '../../src/passives.js';

// Fixed six-point class actors keep these numeric Skill/Passive examples independent of PC start balancing.
const content = structuredClone(await loadProductContent());
content.start.pc.stats = Object.fromEntries(content.rules.stats.map(k => [k, 5]));
const legacy = await loadContent();

function hero(cls, skills, c = content) {
    const g = new Game(c);
    g.input(cls);
    g.input(skills);
    return g;
}
const sheet = (g) => g.state.entities.pc.sheet;
const panel = (g, text) => runCommands(g.state, g.content, text).panels.join('\n');
const book = (g, ...events) => { for (const e of events) { applyEvent(g.state, e); g.log.push(e); } };
const dv = (g) => deriveCharacter(sheet(g), g.content);
function spawn(g, id, { anchor = 'wolf', band = 'ENGAGED', level = 1, hp = null } = {}) {
    const p = { ...scaleCreature(g.content.anchors.get(anchor), level, 'normal', g.content), ...(hp ? { max_hp: hp, hp } : {}) };
    book(g,
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: [anchor], anchor, species: anchor, status: 'alive', location: g.state.scene.location, profile: p } } },
        { t: 'scene.entered', d: { id, band, cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } });
}
/** A trained person of the story (a sheet as Patch 9A builds it) knowing these Skills, here with him. */
function person(g, id, tpl, cls, skills, { ruleset = 2, band = 'ENGAGED', set = {} } = {}) {
    const s = humanSheet(npcTemplate(g.content, ruleset, tpl), { class: cls }, g.content);
    s.skills = Object.fromEntries([g.content.classes.get(cls).basic_attack, ...skills].map((x) => [x, { prof: 1, pp: 0 }]));
    Object.assign(s, set);
    book(g,
        { t: 'entity.created', d: { entity: { id, kind: 'npc', name: 'Brannoc', descriptors: [tpl], status: 'alive', location: g.state.scene.location, sheet: s } } },
        { t: 'scene.entered', d: { id, band, cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } });
}
const fight = (g, ids, dice = scriptedDice({ variance: [1, 1, 1, 1, 1, 1] })) => ({ enc: initEncounter(g.state, g.content, dice, { actor: 'pc', target: ids[0] }, ids.map((id) => ({ id, side: 'hostile' })), 'enc.test'), content: g.content, dice, state: g.state });
const setProf = (g, skill, prof) => book(g, { t: 'skill.progress', d: { id: 'pc', skill, gained: 0, from: sheet(g).skills[skill], to: { prof, pp: 0 } } });
/** Fight it out with these words until the fight is over; the records of each turn. */
function fightOut(g, words, max = 16) {
    const out = [];
    for (let i = 0; i < max && (i === 0 || g.state.encounter); i++) {
        const foe = Object.values(g.state.encounter?.combatants || {}).find((c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped);
        const text = foe && foe.current.band !== 'ENGAGED' && i ? `I close in and ${words}` : words;
        const r = g.input(text);
        out.push(...(r.outcome?.records || []));
        if (!g.state.encounter) break;
        g.reply({});
    }
    return out;
}

const ORIGIN = { kind: 'training', note: 'years at the Redmarch barracks' };
const IRON = { id: 'dyn.passive_iron_hide', name: 'Iron Hide', description: 'His skin has hardened under a hundred blows.', origin: ORIGIN, rank: 'F', scope: 'always', effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 2 }, { kind: 'max_bonus', resource: 'hp', value: 10 }] };
const KEEN = { id: 'dyn.passive_keen_edge', name: 'Keen Edge', description: 'Every cut finds its line.', origin: ORIGIN, rank: 'F', scope: 'always', effects: [{ kind: 'stat_bonus', stat: 'ATK', value: 2 }, { kind: 'stat_bonus', stat: 'MATK', value: 1 }] };
const DEEP = { id: 'dyn.passive_deep_wells', name: 'Deep Wells', description: 'He draws on more than most.', origin: ORIGIN, rank: 'F', scope: 'always', effects: [{ kind: 'max_bonus', resource: 'mp', value: 10 }, { kind: 'max_bonus', resource: 'sta', value: 10 }] };
const THRIFT = { id: 'dyn.passive_light_hand', name: 'Light Hand', description: 'Precise work costs him less breath.', origin: ORIGIN, rank: 'F', scope: 'always', effects: [{ kind: 'cost_reduction', resource: 'sta', tag: 'Precision', pct: 10 }] };
const HIDE = { id: 'dyn.passive_thick_hide', name: 'Thick Hide', description: 'Blows land softer on him.', origin: ORIGIN, rank: 'F', scope: 'always', effects: [{ kind: 'resist', damage_type: 'physical', pct: 10 }] };
const LAST = { id: 'dyn.passive_last_stand', name: 'Last Stand', description: 'Hurt, he braces harder.', origin: ORIGIN, rank: 'F', scope: 'combat', condition: { kind: 'hp_at_most_pct', pct: 50 }, effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 2 }] };
const CLOSE = { id: 'dyn.passive_close_work', name: 'Close Work', description: 'At arm\'s length he strikes harder.', origin: ORIGIN, rank: 'F', scope: 'combat', condition: { kind: 'foe_engaged' }, effects: [{ kind: 'stat_bonus', stat: 'ATK', value: 2 }] };
/** Define and give these Passives (the engine's events; the test's precondition). */
function grant(g, ...defs) {
    for (const def of defs) {
        const d = definePassive(g.state, g.content, def);
        assert.deepEqual(d.errors, [], def.id);
        book(g, ...d.events);
        book(g, ...gainPassive(g.state, g.content, 'pc', def.id, 'test').events);
    }
}
const variant = (def, n) => ({ ...def, id: `${def.id}_${n}`, name: `${def.name} ${'I'.repeat(n)}` });

// ------------------------------------------------------------------------------------------------ A. registry
test('9B-2 A: a dynamic Passive is defined, stored and replayed; it acts only after a separate passive.gained', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    const before = dv(g);
    const d = definePassive(g.state, content, IRON);
    assert.deepEqual(d.errors, []);
    assert.deepEqual(d.events.map((e) => e.t), ['passive.defined']);
    book(g, ...d.events);
    assert.equal(g.state.passive_defs['dyn.passive_iron_hide'].name, 'Iron Hide');
    assert.equal(sheet(g).passives, undefined, 'defined is not gained');
    assert.deepEqual(dv(g), before, 'a definition alone changes nothing');
    assert.match(panel(g, '#class'), /Passives: none/);
    book(g, ...gainPassive(g.state, content, 'pc', 'dyn.passive_iron_hide', 'a reward of the barracks').events);
    assert.deepEqual(Object.keys(sheet(g).passives), ['dyn.passive_iron_hide']);
    assert.equal(dv(g).def, before.def + 2);
    assert.deepEqual(validateState(g.state, content), []);
    const again = fold(g.log);
    assert.deepEqual(again.passive_defs, g.state.passive_defs);
    assert.deepEqual(again.entities.pc.sheet.passives, sheet(g).passives);
    assert.deepEqual(deriveCharacter(again.entities.pc.sheet, content), dv(g), 'replay: the same derived values');
    // fixed and once: defined again, gained again, or by another campaign
    assert.match(definePassive(g.state, content, IRON).errors.join(), /id dyn\.passive_iron_hide exists/);
    assert.match(gainPassive(g.state, content, 'pc', 'dyn.passive_iron_hide').errors.join(), /has Iron Hide already/);
    assert.throws(() => applyEvent(fold(g.log), d.events[0]), /passive defined twice/);
    assert.throws(() => applyEvent(fold(g.log), { t: 'passive.gained', d: { id: 'pc', passive: 'dyn.passive_iron_hide' } }), /passive gained twice/);
    const other = hero('Warrior', 'Heavy Slash + Guard');
    assert.match(gainPassive(other.state, content, 'pc', 'dyn.passive_iron_hide').errors.join(), /no Passive/);
    assert.throws(() => applyEvent(other.state, { t: 'passive.gained', d: { id: 'pc', passive: 'dyn.passive_iron_hide' } }), /unknown passive/);
    // the engine's alone: no extractor delta writes a definition or a gain
    assert.equal(eventKind(d.events[0]), 'skills');
    assert.equal(eventKind({ t: 'passive.gained', d: { id: 'pc' } }), 'pc.progress');
    for (const type of ['fact', 'person.new']) {
        assert.ok(ownershipViolation({ kind: 'delta', type }, d.events[0], null), type);
        assert.ok(ownershipViolation({ kind: 'delta', type }, { t: 'passive.gained', d: { id: 'pc', passive: 'x' } }, null), type);
    }
    // #class and #status show what he has
    assert.match(panel(g, '#class'), /Passives:\n- Iron Hide \(always\): DEF \+2, Max HP \+10/);
    assert.match(panel(g, '#status'), /Passives: Iron Hide/);
});

test('9B-2 A: an invalid Passive books nothing; a legacy campaign has none', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    const before = JSON.stringify(g.state);
    const bad = [
        [{ ...IRON, id: 'passive.iron' }, /id: "dyn\.passive_"/],
        [{ ...IRON, id: 'dyn.iron_hide' }, /id: "dyn\.passive_"/],
        [{ ...IRON, rank: 'E' }, /only F-rank/],
        [{ ...IRON, scope: 'forever' }, /scope/],
        [{ ...IRON, effects: [] }, /effects: 1-2/],
        [{ ...IRON, effects: [...IRON.effects, { kind: 'resist', damage_type: 'physical', pct: 5 }] }, /effects: 1-2/],
        [{ ...IRON, effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 3 }] }, /stat_bonus\.value: 1-2/],
        [{ ...IRON, effects: [{ kind: 'stat_bonus', stat: 'STR', value: 1 }] }, /stat_bonus\.stat/],
        [{ ...IRON, effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 1.5 }] }, /stat_bonus\.value/],
        [{ ...IRON, effects: [{ kind: 'max_bonus', resource: 'hp', value: 11 }] }, /max_bonus\.value: 1-10/],
        [{ ...IRON, effects: [{ kind: 'cost_reduction', resource: 'sta', pct: 15 }] }, /cost_reduction\.pct: 1-10/],
        [{ ...IRON, effects: [{ kind: 'cost_reduction', resource: 'sta', tag: 'Fire', pct: 5 }] }, /cost_reduction\.tag/],
        [{ ...IRON, effects: [{ kind: 'resist', damage_type: 'holy', pct: 5 }] }, /resist\.damage_type/],
        [{ ...IRON, effects: [{ kind: 'resist', damage_type: 'physical', pct: 25 }] }, /resist\.pct: 1-10/],
        [{ ...IRON, effects: [{ kind: 'regenerate', hp: 3 }] }, /kind regenerate is not supported/],
        [{ ...IRON, effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 1 }, { kind: 'stat_bonus', stat: 'DEF', value: 1 }] }, /the same bonus once/],
        [{ ...IRON, condition: { kind: 'foe_engaged' } }, /condition: only with scope combat/],
        [{ ...LAST, condition: { kind: 'hp_at_most_pct', pct: 90 } }, /condition hp_at_most_pct\.pct: 25-50/],
        [{ ...LAST, condition: { kind: 'night' } }, /condition: one of/],
        [{ ...LAST, effects: [{ kind: 'max_bonus', resource: 'hp', value: 5 }] }, /max_bonus: only with scope always/],
        [{ ...LAST, effects: [{ kind: 'cost_reduction', resource: 'mp', pct: 5 }] }, /cost_reduction: only with scope always/],
        [{ ...IRON, formula: 'x' }, /unknown field formula/],
        [{ ...IRON, effects: [{ ...IRON.effects[0], when: 'always' }] }, /unknown field when/],
        [null, /an object/],
    ];
    for (const [def, why] of bad) {
        const r = definePassive(g.state, content, def);
        assert.deepEqual(r.events, [], JSON.stringify(def));
        assert.match(r.errors.join(' | '), why, JSON.stringify(def));
    }
    assert.equal(JSON.stringify(g.state), before);
    for (const ok of [IRON, KEEN, DEEP, THRIFT, HIDE, LAST, CLOSE]) assert.deepEqual(passiveDefErrors(ok, content, g.state), [], ok.id);
    const old = hero('Ranger', 'Aimed Shot + Power Shot', legacy);
    assert.match(definePassive(old.state, legacy, IRON).errors.join(), /ruleset 2/);
    assert.deepEqual(definePassive(old.state, legacy, IRON).events, []);
});

// ------------------------------------------------------------------------------------------------ B. bonuses
test('9B-2 B: ATK/MATK/DEF/MDEF and the maxima change once; no refill; no double bonus by reload or a new fight snapshot', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    const b = dv(g);
    const hp = sheet(g).hp;
    grant(g, IRON, KEEN, DEEP);
    const a = dv(g);
    assert.deepEqual([a.atk - b.atk, a.matk - b.matk, a.def - b.def, a.mdef - b.mdef], [2, 1, 2, 0]);
    assert.deepEqual([a.maxHp - b.maxHp, a.maxMp - b.maxMp, a.maxSta - b.maxSta], [10, 10, 10]);
    assert.deepEqual([sheet(g).hp, sheet(g).hp < a.maxHp], [hp, true], 'a higher maximum fills nothing');
    assert.match(panel(g, '#status'), new RegExp(`HP ${hp}/${a.maxHp} \\| MP ${sheet(g).mp}/${a.maxMp} \\| STA ${sheet(g).sta}/${a.maxSta}`));
    assert.match(panel(g, '#status'), new RegExp(`ATK ${a.atk} \\| MATK ${a.matk} \\| DEF ${a.def}`));
    // reload (replay) and fight snapshots: the same numbers, every time
    const reloaded = fold(g.log);
    assert.deepEqual(deriveCharacter(reloaded.entities.pc.sheet, content), a);
    spawn(g, 'mon.boar', { anchor: 'boar' });
    for (let i = 0; i < 3; i++) {
        const pc = fight(g, ['mon.boar']).enc.combatants.pc;
        assert.deepEqual([pc.fixed.atk, pc.fixed.matk, pc.fixed.def, pc.fixed.mdef, pc.fixed.max_hp, pc.current.hp], [a.atk, a.matk, a.def, a.mdef, a.maxHp, hp], `snapshot ${i}`);
    }
    // stacking: the same bonus sums (Patch 9C-2c: up to the shared total, DEF 10, Max HP 80); four Passives at most, a
    // fifth finds no free slot
    grant(g, variant(IRON, 2));
    const s = dv(g);
    assert.deepEqual([s.def - b.def, s.maxHp - b.maxHp], [4, 20]);
    assert.deepEqual(passiveTotals(sheet(g), content).stat.DEF, 4);
    const fifth = definePassive(g.state, content, variant(IRON, 3));
    book(g, ...fifth.events);
    assert.match(gainPassive(g.state, content, 'pc', fifth.passive.id).errors.join(), /holds 4 Passives already \(4\/4\): no free slot/);
    assert.deepEqual(validateState(g.state, content), []);
});

// ------------------------------------------------------------------------------------------------ C. costs, resistances, conditions
test('9B-2 C: a cost reduction acts once, only on its resource and tag, rounded once with the Proficiency; capped in total', () => {
    const g = hero('Rogue', 'Guarded Cut + Evasive Step');
    setProf(g, 'rogue.guarded_cut', 4);
    grant(g, THRIFT);
    // Guarded Cut (Precision, 8 STA) at P4: 8 × 0.925 × 0.90 = 6.66 → 7, one rounding. B1 (.130): the current rule
    // keeps a mastery that rounding would lose (the reduction alone is 8 × 0.90 = 7.2 → 7): one less, 6
    assert.match(panel(g, '#skills'), /Guarded Cut .* Cost 6 STA \(base 8\)/);
    assert.match(panel(g, '#skills'), /Evasive Step .* Cost 5 STA\n/, 'Mobility/Defense: not Precision');
    assert.match(panel(g, '#skills'), /Basic Attack .* Cost 5 STA/, 'Precision: 5 × 0.90 = 4.5 → 5');
    spawn(g, 'mon.boar', { anchor: 'boar', hp: 500 });
    const ctx = fight(g, ['mon.boar']);
    const cut = attackAction(ctx, 'pc', 'mon.boar', 'rogue.guarded_cut');
    assert.equal(cut.cost.amount, 6);
    assert.equal(skillAction(ctx, 'pc', 'rogue.evasive_step', { dir: 'closer' }).cost.amount, 5);
    assert.match(renderHud({ ...g.state, encounter: ctx.enc }, content), /Guarded Cut[^·]*6 STA/);
    // a reduction of MP lowers no STA cost; more reductions are capped (Patch 9C-2c: at the shared 30% in total)
    const h = hero('Rogue', 'Piercing Thrust + Fan of Blades'); // B1 (.130): the current starter pool (Feint's slot)
    grant(h, { ...THRIFT, id: 'dyn.passive_mana_thrift', name: 'Mana Thrift', effects: [{ kind: 'cost_reduction', resource: 'mp', pct: 10 }] });
    assert.match(panel(h, '#skill Piercing Thrust'), /Cost: 9 STA\n|Cost: 9 STA \|/);
    grant(h, THRIFT, { ...THRIFT, id: 'dyn.passive_breath', name: 'Breath', effects: [{ kind: 'cost_reduction', resource: 'sta', pct: 10 }] },
        { ...THRIFT, id: 'dyn.passive_second_wind', name: 'Second Wind', quality: 'legendary', effects: [{ kind: 'cost_reduction', resource: 'sta', pct: 15 }] });
    // Piercing Thrust 9 STA: 10 + 10 + 15 = 35% capped at 30%: 9 × 0.7 = 6.3 → 6
    assert.match(panel(h, '#skill Piercing Thrust'), /Cost: 6 STA \(base 9\)/);
});

test('9B-2 C: a resistance lowers its damage type only, once; a combat Passive acts only while its condition holds', () => {
    const strike = (g, foe) => {
        const ctx = fight(g, [foe]);
        return { ctx, r: attackAction(ctx, foe, 'pc', null) };
    };
    const plain = hero('Warrior', 'Heavy Slash + Guard');
    spawn(plain, 'mon.wolf');
    const base = strike(plain, 'mon.wolf').r.strikes[0];
    const g = hero('Warrior', 'Heavy Slash + Guard');
    grant(g, HIDE);
    spawn(g, 'mon.wolf');
    const hit = strike(g, 'mon.wolf').r.strikes[0];
    assert.ok(hit.steps.some((x) => /physical resistance -10%/.test(x)), hit.steps.join(' | '));
    assert.equal(hit.final, Math.max(1, Math.round(base.final * 0.9)), `${base.final} → ${hit.final}`);
    assert.equal(hit.steps.filter((x) => /resistance/.test(x)).length, 1, 'once');
    spawn(g, 'mon.spirit', { anchor: 'spirit' });
    const magic = strike(g, 'mon.spirit').r.strikes[0];
    assert.ok(!magic.steps.some((x) => /resistance/.test(x)), 'a magical strike is not resisted by a physical resistance');
    // Last Stand: DEF +2 at 50% HP or less, only then
    const l = hero('Warrior', 'Heavy Slash + Guard');
    grant(l, LAST);
    assert.equal(dv(l).def, dv(plain).def, 'a combat Passive is no lasting bonus');
    spawn(l, 'mon.wolf');
    const s1 = strike(l, 'mon.wolf');
    const full = s1.r.strikes[0].defense;
    const ctx = s1.ctx;
    ctx.enc.combatants.pc.current.hp = Math.floor(ctx.enc.combatants.pc.fixed.max_hp / 2);
    assert.equal(attackAction(ctx, 'mon.wolf', 'pc', null).strikes[0].defense, full + 2, 'hurt: +2');
    // Close Work (MATK +2 here): while a foe is ENGAGED with him, and only then
    const c = hero('Mage', 'Arcane Bolt + Arcane Ward');
    grant(c, { ...CLOSE, effects: [{ kind: 'stat_bonus', stat: 'MATK', value: 2 }] });
    spawn(c, 'mon.boar', { anchor: 'boar', hp: 500 });
    const cc = fight(c, ['mon.boar']);
    const matk = cc.enc.combatants.pc.fixed.matk;
    const near = attackAction(cc, 'pc', 'mon.boar', 'mage.arcane_bolt');
    assert.match(near.raw_text, new RegExp(`MATK ${matk + 2} =`));
    assert.deepEqual(near.passive, ['Close Work']);
    cc.enc.combatants['mon.boar'].current.band = 'MEDIUM';
    const far = attackAction(cc, 'pc', 'mon.boar', 'mage.arcane_bolt');
    assert.equal(far.illegal, undefined, far.illegal);
    assert.match(far.raw_text, new RegExp(`MATK ${matk} =`), 'no foe ENGAGED: no bonus');
    assert.equal(far.passive, undefined);
});

// ------------------------------------------------------------------------------------------------ D/E. heal, restore
const MEND = {
    id: 'dyn.mending_light', name: 'Mending Light', description: 'A soft light knits his wounds.', origin: { kind: 'teacher' }, rank: 'F', complexity: 1, tags: ['Arcane'],
    category: 'Utility', activation: 'action', target: 'self', cost: { resource: 'mp', amount: 8 }, effects: [{ kind: 'heal', base: 6, stat: 'WIL', coef: 1, floor: true }],
};
const WIND = {
    id: 'dyn.second_wind', name: 'Second Wind', description: 'He trades focus for breath.', origin: { kind: 'self_development' }, rank: 'F', complexity: 1, tags: ['Martial'],
    category: 'Utility', activation: 'action', target: 'self', cost: { resource: 'mp', amount: 8 }, effects: [{ kind: 'restore', resource: 'sta', amount: 8 }],
};
const FOCUS = { ...WIND, id: 'dyn.still_mind', name: 'Still Mind', description: 'Breath turned into focus.', tags: ['Arcane'], cost: { resource: 'sta', amount: 8 }, effects: [{ kind: 'restore', resource: 'mp', amount: 8 }] };
function teach(g, ...defs) {
    for (const def of defs) {
        const d = defineSkill(g.state, g.content, def);
        assert.deepEqual(d.errors, [], def.id);
        book(g, ...d.events);
        const l = learnSkill(g.state, g.content, 'pc', def.id);
        assert.deepEqual(l.errors, [], def.id);
        book(g, ...l.events);
    }
}

test('9B-2 D: a dynamic heal restores HP up to his maximum, in a fight and outside; at full HP it is refused at no cost', () => {
    const g = hero('Mage', 'Arcane Bolt + Arcane Ward');
    teach(g, MEND);
    const max = dv(g).maxHp;
    spawn(g, 'mon.boar', { anchor: 'boar', hp: 500 });
    const ctx = fight(g, ['mon.boar']);
    const pc = ctx.enc.combatants.pc;
    const mp = pc.current.mp;
    const full = skillAction(ctx, 'pc', 'dyn.mending_light');
    assert.match(full.illegal, /at full HP: Mending Light has nothing to restore/);
    assert.equal(pc.current.mp, mp, 'nothing paid');
    pc.current.hp = max - 5;
    const r = skillAction(ctx, 'pc', 'dyn.mending_light');
    assert.deepEqual([r.cost.amount, r.restore], [8, { resource: 'hp', amount: 5, before: max - 5, after: max }], '6 + WIL 6 = 12, capped at the maximum');
    assert.deepEqual(r.effects, [`HP +5 (${max - 5} -> ${max}/${max})`]);
    pc.current.hp = 20;
    assert.equal(skillAction(ctx, 'pc', 'dyn.mending_light').restore.after, 32);
    assert.equal(pc.current.mp, mp - 16);
    // outside a fight: the same rule, booked as resource events; refused at full HP
    const o = hero('Mage', 'Arcane Bolt + Arcane Ward');
    teach(o, MEND);
    const at = o.input('I use Mending Light');
    assert.match(at.outcome.text, /at full HP: Mending Light has nothing to restore\. Nothing was spent or restored/);
    assert.equal(at.events.filter((e) => e.t === 'resource.changed').length, 0);
    book(o, { t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 30 } });
    const mp0 = sheet(o).mp;
    const used = o.input('I use Mending Light');
    assert.deepEqual(used.events.filter((e) => e.t === 'resource.changed').map((e) => [e.d.resource, e.d.value]), [['mp', mp0 - 8], ['hp', 42]], 'cost first, then the heal');
    assert.deepEqual([sheet(o).hp, sheet(o).mp], [42, mp0 - 8]);
    assert.deepEqual(fold(o.log).entities.pc.sheet.hp, 42, 'replay');
    // no narrated heal: the story's words change no HP (vitals are the engine's)
    o.reply({}, 'He feels completely restored and his wounds close.');
    assert.equal(sheet(o).hp, 42);
    // bounds: Complexity, combinations, no heal on an attack
    const bad = [
        [{ ...MEND, effects: [{ ...MEND.effects[0], base: 9 }] }, /heal: at most 8 \+ stat ×1 at Complexity 1/],
        [{ ...MEND, effects: [{ ...MEND.effects[0], stat: 'STR' }] }, /heal\.stat/],
        [{ ...MEND, effects: [MEND.effects[0], { kind: 'temp_def', base: 2, stat: 'VIT', coef: 0.5, until: 'own_next_turn' }] }, /a heal or a restore is the Skill's only effect/],
        [{ ...MEND, category: 'Offensive', target: 'enemy', range: { band: 'ENGAGED' }, attack: { base: 6, scaling: [{ stat: 'STR', coef: 1 }], damage_type: 'physical' } }, /heal: not on an attack/],
    ];
    for (const [def, why] of bad) assert.match(skillDefErrors(def, content, g.state).join(' | '), why);
});

test('9B-2 E: a dynamic restore gives back MP or STA from the other resource, never more than it paid; no gaining cycle', () => {
    const g = hero('Mage', 'Arcane Bolt + Arcane Ward');
    teach(g, WIND, FOCUS);
    spawn(g, 'mon.boar', { anchor: 'boar', hp: 500 });
    const ctx = fight(g, ['mon.boar']);
    const pc = ctx.enc.combatants.pc;
    assert.match(skillAction(ctx, 'pc', 'dyn.second_wind').illegal, /at full STA/);
    pc.current.sta = 60;
    const mp = pc.current.mp;
    const r = skillAction(ctx, 'pc', 'dyn.second_wind');
    assert.deepEqual([pc.current.mp, pc.current.sta, r.restore.amount], [mp - 8, 68, 8]);
    // round and round: STA into MP, MP into STA: their sum never grows
    let sum = pc.current.mp + pc.current.sta;
    pc.current.mp = 30;
    pc.current.sta = 30;
    sum = 60;
    for (let i = 0; i < 10; i++) {
        const x = skillAction(ctx, 'pc', i % 2 ? 'dyn.second_wind' : 'dyn.still_mind');
        assert.equal(x.illegal, undefined, x.illegal);
        assert.ok(pc.current.mp + pc.current.sta <= sum, `${i}: ${pc.current.mp} + ${pc.current.sta}`);
        sum = pc.current.mp + pc.current.sta;
    }
    // a cheaper cost restores no more than it paid (a Passive's reduction: 8 × 0.9 = 7.2 → 7)
    const t = hero('Mage', 'Arcane Bolt + Arcane Ward');
    teach(t, WIND);
    grant(t, { ...THRIFT, id: 'dyn.passive_mana_thrift', name: 'Mana Thrift', effects: [{ kind: 'cost_reduction', resource: 'mp', pct: 10 }] });
    spawn(t, 'mon.boar', { anchor: 'boar', hp: 500 });
    const tc = fight(t, ['mon.boar']);
    tc.enc.combatants.pc.current.sta = 50;
    const tr = skillAction(tc, 'pc', 'dyn.second_wind');
    assert.deepEqual([tr.cost.amount, tr.restore.amount], [7, 7]);
    // bounds: the same resource, more than its cost, or no cost at all
    for (const [def, why] of [
        [{ ...WIND, effects: [{ kind: 'restore', resource: 'mp', amount: 8 }] }, /restore: the other resource than its cost, at most its cost/],
        [{ ...WIND, effects: [{ kind: 'restore', resource: 'sta', amount: 9 }] }, /restore: the other resource than its cost, at most its cost \(8\)/],
        [{ ...WIND, cost: { resource: 'mp', amount: 0 } }, /cost 0: 5-10/],
        [{ ...WIND, effects: [{ kind: 'restore', resource: 'hp', amount: 5 }] }, /restore\.resource/],
    ]) assert.match(skillDefErrors(def, content, g.state).join(' | '), why);
});

// ------------------------------------------------------------------------------------------------ F/G. NPC defense
test('9B-2 F: a trained Warrior guards, a Mage wards, a Rogue steps away when struck and hurt; each pays it as a player would', () => {
    const cases = [['guard', 'warrior', ['warrior.heavy_slash', 'warrior.guard'], 'warrior.guard', /DEF \+\d+/], ['hedge_mage', 'mage', ['mage.arcane_bolt', 'mage.arcane_ward'], 'mage.arcane_ward', /Barrier \d+ HP/], ['bandit', 'rogue', ['rogue.razor_cut', 'rogue.evasive_step'], 'rogue.evasive_step', /incoming damage -25%/]];
    for (const [tpl, cls, skills, expect, effect] of cases) {
        const g = hero('Warrior', 'Heavy Slash + Guard');
        person(g, 'npc.foe', tpl, cls, skills);
        const recs = fightOut(g, 'Heavy Slash Brannoc');
        const own = recs.filter((r) => r.actor === 'npc.foe');
        const used = own.find((r) => r.kind === 'skill');
        assert.ok(used, `${cls}: ${JSON.stringify(own.map((r) => [r.kind, r.skill, r.why]))}`);
        assert.equal(used.skill, expect);
        assert.match(used.why, /struck by Alaric and hurt/);
        assert.match(used.effects.join(), effect);
        assert.ok(used.cost && used.cost.after === used.cost.before - used.cost.amount, `${cls}: paid`);
        assert.ok(own.some((r) => r.kind === 'attack'), `${cls}: it still attacks`);
        assert.deepEqual(validateState(g.state, content), []);
    }
});

test('9B-2 F: the NPC decision: only under concrete threat, unprotected, payable, once in a row; a feint only when a prepared blow is worth it', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    person(g, 'npc.foe', 'guard', 'warrior', ['warrior.heavy_slash', 'warrior.guard']);
    const ctx = fight(g, ['npc.foe']);
    const me = ctx.enc.combatants['npc.foe'];
    const blow = { round: 1, actor: 'pc', kind: 'attack', skill: 'warrior.heavy_slash', strikes: [{ target: 'npc.foe' }] };
    const attack = { kind: 'attack' };
    assert.equal(npcTactic(ctx, me, attack), null, 'not struck: it attacks');
    ctx.enc.log.push(blow);
    assert.equal(npcTactic(ctx, me, attack), null, 'struck but at full HP');
    me.current.hp = Math.floor(me.fixed.max_hp * 0.7);
    assert.equal(npcTactic(ctx, me, attack).skill, 'warrior.guard');
    assert.equal(npcTactic(ctx, me, { kind: 'flee' }), null, 'flight is decided as before');
    me.current.effects.push({ kind: 'temp_def', value: 3, source: 'npc.foe', expires: 'start_of_source_next_turn', name: 'Guard', round: 1 });
    assert.equal(npcTactic(ctx, me, attack), null, 'already protected');
    me.current.effects = [];
    const sta = me.current.sta;
    me.current.sta = 2;
    assert.equal(npcTactic(ctx, me, attack), null, 'cannot pay it');
    me.current.sta = sta;
    ctx.enc.log.push({ round: 1, actor: 'npc.foe', kind: 'skill', skill: 'warrior.guard', effects: [] }, blow);
    assert.equal(npcTactic(ctx, me, attack), null, 'not twice in a row');
    ctx.enc.log.push({ round: 2, actor: 'npc.foe', kind: 'attack', skill: 'warrior.heavy_slash', strikes: [] }, blow);
    me.current.tactics = 3;
    assert.equal(npcTactic(ctx, me, attack), null, 'three in a fight at most');
    me.current.tactics = 0;
    assert.equal(npcTactic(ctx, me, attack).skill, 'warrior.guard');
    // a magical blow: a DEF bonus does not answer it
    const m = hero('Mage', 'Arcane Bolt + Arcane Ward');
    person(m, 'npc.foe', 'guard', 'warrior', ['warrior.heavy_slash', 'warrior.guard']);
    const mc = fight(m, ['npc.foe']);
    const mm = mc.enc.combatants['npc.foe'];
    mm.current.hp = Math.floor(mm.fixed.max_hp * 0.5);
    mc.enc.log.push({ round: 1, actor: 'pc', kind: 'attack', skill: 'mage.arcane_bolt', strikes: [{ target: 'npc.foe' }] });
    assert.equal(npcTactic(mc, mm, attack), null, 'Guard is no answer to magic');
    // a feint: a Rogue in reach facing a hard guard, able to pay the feint and then the blow
    const f = hero('Warrior', 'Heavy Slash + Guard');
    person(f, 'npc.foe', 'bandit', 'rogue', ['rogue.razor_cut', 'rogue.feint']);
    const fc = fight(f, ['npc.foe']);
    const fm = fc.enc.combatants['npc.foe'];
    assert.equal(npcTactic(fc, fm, attack), null, 'his DEF is low: plain blows do more');
    fc.enc.combatants.pc.current.effects.push({ kind: 'temp_def', value: 20, source: 'pc', expires: 'start_of_source_next_turn', name: 'Guard', round: 1 });
    assert.equal(npcTactic(fc, fm, attack).skill, 'rogue.feint');
    assert.equal(npcTactic(fc, fm, { kind: 'close_and_attack' }), null, 'out of reach: no feint');
    fm.current.sta = 6;
    assert.equal(npcTactic(fc, fm, attack), null, 'the feint, and then no STA for the blow');
});

test('9B-2 G: no defensive loop: an NPC alternates, attacks, moves and still flees by the rules of before; the fight ends', () => {
    for (const [tpl, cls, skills] of [['guard', 'warrior', ['warrior.guard', 'warrior.deflect']], ['hedge_mage', 'mage', ['mage.arcane_ward', 'mage.focused_ward']]]) {
        const g = hero('Warrior', 'Heavy Slash + Guard');
        person(g, 'npc.foe', tpl, cls, skills);
        const recs = fightOut(g, 'Heavy Slash Brannoc', 24);
        assert.equal(g.state.encounter, null, `${cls}: the fight is over`);
        const own = recs.filter((r) => r.actor === 'npc.foe');
        for (let i = 1; i < own.length; i++) assert.ok(!(own[i].kind === 'skill' && own[i - 1].kind === 'skill'), `${cls}: ${own.map((r) => r.kind).join(',')}`);
        assert.ok(own.filter((r) => r.kind === 'skill').length <= 3);
        assert.ok(own.some((r) => r.kind === 'attack'));
        assert.ok(own.some((r) => r.kind === 'move' && /wounded/.test(r.why)) || g.state.entities['npc.foe'].status === 'dead', `${cls}: ${own.map((r) => `${r.kind}:${r.why}`).join(' | ')}`);
    }
});

// ------------------------------------------------------------------------------------------------ H. legacy
test('9B-2 H: a legacy campaign keeps its NPC behaviour (no defense), its derived values and its costs', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard', legacy);
    assert.equal(g.state.meta.ruleset, 1);
    person(g, 'npc.foe', 'guard', 'warrior', ['warrior.heavy_slash', 'warrior.guard'], { ruleset: 1 });
    const recs = fightOut(g, 'Heavy Slash Brannoc');
    const own = recs.filter((r) => r.actor === 'npc.foe');
    assert.ok(own.length && own.every((r) => r.kind !== 'skill'), own.map((r) => r.kind).join(','));
    const ctx = fight(hero('Warrior', 'Heavy Slash + Guard', legacy), []);
    assert.equal(ctx.enc.combatants.pc.fixed.passive, undefined, 'a snapshot without Passives is the one of before');
    assert.match(panel(g, '#skills'), /Heavy Slash .* Cost 7 STA/);
    assert.match(panel(g, '#class'), /Next known evolution milestone/);
});

test('9B-2 H (fix): a Barrier of an odd stat is a whole number of HP (6 + WIL 5×1.5 = 13.5 → 14), so no HP turns fractional', () => {
    for (const [c, ruleset] of [[content, 2], [legacy, 1]]) {
        const g = hero('Mage', 'Arcane Bolt + Arcane Ward', c);
        assert.equal(g.state.meta.ruleset, ruleset);
        spawn(g, 'mon.boar', { anchor: 'boar', hp: 500 });
        const ctx = fight(g, ['mon.boar']);
        ctx.enc.combatants.pc.fixed.stats.WIL = 5;
        assert.match(skillAction(ctx, 'pc', 'mage.arcane_ward').effects[0], /^Barrier 14 HP/, `ruleset ${ruleset}`);
        const hit = attackAction(ctx, 'mon.boar', 'pc', null).strikes[0];
        assert.ok(Number.isInteger(hit.hp_after), String(hit.hp_after));
    }
});

// ------------------------------------------------------------------------------------------------ I. whole system
test('9B-2 I: a dynamic Skill, Proficiency, a starter Skill, a Passive and a heal in one campaign: the fight ends, PP are booked, replay is identical', () => {
    const g = hero('Rogue', 'Razor Cut + Evasive Step');
    teach(g, {
        id: 'dyn.viper_sting', name: 'Viper Sting', description: 'A darting cut.', origin: { kind: 'teacher' }, rank: 'F', complexity: 1, tags: ['Precision'],
        category: 'Offensive', activation: 'action', target: 'enemy', cost: { resource: 'sta', amount: 6 }, range: { band: 'ENGAGED' },
        attack: { base: 9, scaling: [{ stat: 'AGI', coef: 1.6 }], damage_type: 'physical' }, effects: [],
    });
    grant(g, IRON, THRIFT);
    spawn(g, 'mon.wolf');
    const recs = fightOut(g, 'Viper Sting the wolf');
    assert.equal(g.state.encounter, null);
    assert.ok(recs.some((r) => r.actor === 'pc' && r.skill === 'dyn.viper_sting' && r.cost.amount === 5), 'Viper Sting 6 × 0.9 = 5.4 → 5');
    assert.ok(sheet(g).skills['dyn.viper_sting'].pp > 0, JSON.stringify(sheet(g).skills));
    assert.deepEqual(validateState(g.state, content), []);
    const again = fold(g.log);
    assert.deepEqual([again.entities.pc.sheet, again.skill_defs, again.passive_defs, again.pp_keys], [sheet(g), g.state.skill_defs, g.state.passive_defs, g.state.pp_keys]);
});

// ------------------------------------------------------------------------------------------------ review of 9B-2
/** Give a person of the story (an NPC) a defined Passive: the engine's events. */
function grantTo(g, who, ...defs) {
    for (const def of defs) {
        const d = definePassive(g.state, g.content, def);
        assert.deepEqual(d.errors, [], def.id);
        book(g, ...d.events);
        const r = gainPassive(g.state, g.content, who, def.id);
        assert.deepEqual(r.errors, [], def.id);
        book(g, ...r.events);
    }
}
/** The attack as it resolves with the variance at one end, on a copy of the fight (the fight itself stays as it is). */
function strikeWith(ctx, variance, skill, extra = {}) {
    const copy = { ...ctx, enc: structuredClone(ctx.enc), dice: scriptedDice({ variance: [variance, variance, variance] }) };
    return attackAction(copy, 'pc', 'npc.foe', skill, extra);
}

test('9B-2 review (1): the damage preview is the pipeline: his conditional ATK, the target\'s conditional DEF and its resistance, variance and rounding', () => {
    const g = hero('Warrior', 'Heavy Slash + Guard');
    grant(g, CLOSE);
    person(g, 'npc.foe', 'guard', 'warrior', ['warrior.guard']);
    grantTo(g, 'npc.foe', { ...LAST, id: 'dyn.passive_foe_stand', name: 'Foe Stand' }, { ...HIDE, id: 'dyn.passive_foe_hide', name: 'Foe Hide' });
    const ctx = fight(g, ['npc.foe']);
    const foe = ctx.enc.combatants['npc.foe'];
    foe.current.hp = Math.floor(foe.fixed.max_hp * 0.4);
    const { variance_min: lo, variance_max: hi } = content.rules.damage;
    const check = (extra) => {
        const p = damagePreview(ctx.enc, content, 'npc.foe', g.state).find((o) => o.skill === 'warrior.heavy_slash');
        const [a, b] = [strikeWith(ctx, lo, 'warrior.heavy_slash', extra), strikeWith(ctx, hi, 'warrior.heavy_slash', extra)];
        assert.equal(a.illegal, undefined, a.illegal);
        // all three Passives took part in the real strike
        assert.deepEqual(a.passive, ['Close Work']);
        assert.equal(a.strikes[0].defense, foe.fixed.def + 2, 'Foe Stand: DEF +2 at 40% HP');
        assert.ok(a.strikes[0].steps.some((x) => /physical resistance -10%/.test(x)));
        assert.deepEqual([p.min, p.max], [a.strikes[0].final, b.strikes[0].final], JSON.stringify([p, a.strikes[0].steps]));
        return p;
    };
    const near = check({});
    // one band away: the preview reckons from where the attack's step leaves him (a foe ENGAGED then: Close Work)
    foe.current.band = 'SHORT';
    assert.deepEqual(check({ move: 'closer' }), near);
    // at full HP the condition is gone, in the preview as in the strike
    foe.current.band = 'ENGAGED';
    foe.current.hp = foe.fixed.max_hp;
    const p = damagePreview(ctx.enc, content, 'npc.foe', g.state).find((o) => o.skill === 'warrior.heavy_slash');
    const a = strikeWith(ctx, lo, 'warrior.heavy_slash');
    assert.equal(a.strikes[0].defense, foe.fixed.def);
    assert.equal(p.min, a.strikes[0].final);
    assert.ok(p.min > near.min, 'without Foe Stand more gets through');
});

test('9B-2 review (2): an NPC chooses and makes an attack it can pay only with its Passive\'s cost reduction', () => {
    // Piercing Thrust: 9 STA, with Light Hand (Precision -10%) 8.1 → 8; he has exactly 8
    const g = hero('Warrior', 'Heavy Slash + Guard');
    person(g, 'npc.foe', 'bandit', 'rogue', ['rogue.piercing_thrust'], { set: { sta: 8 } });
    grantTo(g, 'npc.foe', { ...THRIFT, id: 'dyn.passive_foe_hand', name: 'Foe Hand' });
    const recs = fightOut(g, 'Heavy Slash Brannoc');
    const first = recs.find((r) => r.actor === 'npc.foe' && r.kind === 'attack');
    assert.ok(first, JSON.stringify(recs.filter((r) => r.actor === 'npc.foe').map((r) => [r.kind, r.skill, r.why])));
    assert.equal(first.skill, 'rogue.piercing_thrust');
    assert.deepEqual([first.cost.amount, first.cost.before, first.cost.after], [8, 8, 0]);
    assert.deepEqual(validateState(g.state, content), []);
    // without the Passive the same 8 STA pay no Piercing Thrust: its Basic Attack (5) instead
    const h = hero('Warrior', 'Heavy Slash + Guard');
    person(h, 'npc.foe', 'bandit', 'rogue', ['rogue.piercing_thrust'], { set: { sta: 8 } });
    const plain = fightOut(h, 'Heavy Slash Brannoc').find((r) => r.actor === 'npc.foe' && r.kind === 'attack');
    assert.equal(plain.skill, 'rogue.basic_attack');
});
