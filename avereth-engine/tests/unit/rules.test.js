// Core rules executed by the engine: derived values, hit/crit/damage chain (Core #11 worked examples), range and
// ammunition legality, ambush, initiative ties, effects, NPC policy, DefeatXP lock and the Level-up loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, scriptedDice } from '../helpers.js';
import { deriveCharacter, rawPower } from '../../src/derived.js';
import { applyEvent } from '../../src/state.js';
import { scaleCreature, humanSheet } from '../../src/npcgen.js';
import { initEncounter, initiativeOrder, attackAction, skillAction, runCombat, npcDecide } from '../../src/combat.js';
import { awardXp, defeatXp } from '../../src/progression.js';
import { clone } from '../../src/util.js';

const content = await loadContent();

function newRanger(skills = 'Aimed Shot + Power Shot') {
    return new Game(content).ranger(skills);
}

/** Put a creature into the scene with a locked profile (bypassing narration). */
function spawn(g, id, { anchor = 'boar', level = 1, band = 'SHORT', cover = 'none', aware = 'aware', profile = {} } = {}) {
    const p = { ...scaleCreature(content.anchors.get(anchor), level, 'normal', content), ...profile };
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: [anchor], anchor, species: anchor, status: 'alive', location: g.state.scene.location, profile: p } } });
    applyEvent(g.state, { t: 'scene.entered', d: { id, band, cover } });
    applyEvent(g.state, { t: 'scene.awareness', d: { id, level: aware } });
}

function encounter(g, dice, trigger, ids) {
    const enc = initEncounter(g.state, content, dice, trigger, ids.map((id) => ({ id, side: 'hostile' })), 'enc.test');
    return { enc, content, dice, state: g.state };
}

test('derived values for all five Base Classes at Level 1 with their starter kit (Core #2, Content #0/#11)', () => {
    const expected = {
        warrior: { maxHp: 85, maxMp: 60, maxSta: 100, init: 7, def: 7, mdef: 3, atk: 6, matk: 0, baseHit: 72.5, crit: 5.5 },
        mage: { maxHp: 80, maxMp: 72, maxSta: 100, init: 7, def: 3, mdef: 4, atk: 0, matk: 6, baseHit: 72.5, crit: 5.5 },
        guardian: { maxHp: 85, maxMp: 64, maxSta: 100, init: 7, def: 10, mdef: 5, atk: 5, matk: 0, baseHit: 72.5, crit: 5.5 },
        duelist: { maxHp: 80, maxMp: 60, maxSta: 100, init: 8, def: 3, mdef: 4, atk: 6, matk: 0, baseHit: 72.5, crit: 5.5 },
        ranger: { maxHp: 80, maxMp: 60, maxSta: 100, init: 9, def: 3, mdef: 4, atk: 6, matk: 0, baseHit: 73, crit: 5.6 },
    };
    for (const [cls, exp] of Object.entries(expected)) {
        const g = new Game(content);
        const c = content.classes.get(cls);
        g.turn(c.name);
        const pool = c.skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and ');
        g.turn(pool);
        const s = g.state.entities.pc.sheet;
        const dv = deriveCharacter(s, content);
        for (const [k, v] of Object.entries(exp)) assert.equal(dv[k], v, `${cls} ${k}`);
        assert.equal(s.hp, exp.maxHp);
        assert.equal(Object.keys(s.skills).length, 3, `${cls}: Basic Attack + 2 Skills`);
    }
});

test('Ranger Raw Power at full precision (never rounded before the end)', () => {
    const g = newRanger('Twin Shot + Quick Shot');
    const s = g.state.entities.pc.sheet;
    const dv = deriveCharacter(s, content);
    const raw = (id) => rawPower(content.skills.get(id), s.stats, dv);
    assert.equal(raw('ranger.basic_attack'), 17.5);
    assert.equal(raw('ranger.aimed_shot'), 26.5);
    assert.equal(raw('ranger.power_shot'), 33.25);
    assert.equal(raw('ranger.quick_shot'), 21);
    assert.equal(raw('ranger.twin_shot'), 12.25);
});

test('Core #11 worked example: 17.5 Raw vs DEF 2, variance 0.94 -> 15', () => {
    const g = newRanger();
    spawn(g, 'mon.boar');
    const dice = scriptedDice({ d100: [10, 99], variance: [0.94] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.basic_attack' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.basic_attack');
    const s = r.strikes[0];
    assert.equal(s.hit.chance, 73);
    assert.equal(s.post_def, 15.5);
    assert.equal(s.final, 15);
    assert.equal(s.hp_after, 41 - 15);
    assert.equal(r.cost.after, 95);
    assert.deepEqual(r.ammo, { item: 'standard_arrow', used: 1 });
});

test('Core #11 worked example: 12.25 Raw vs DEF 2, variance 1.08, Crit ×1.5 -> 17 (Twin Shot strike)', () => {
    const g = newRanger('Twin Shot + Quick Shot');
    spawn(g, 'mon.boar');
    const dice = scriptedDice({ d100: [10, 1, 90], variance: [1.08] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.twin_shot' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.twin_shot');
    assert.equal(r.strikes.length, 2);
    assert.equal(r.strikes[0].crit.success, true);
    assert.equal(r.strikes[0].final, 17);
    assert.equal(r.strikes[1].hit.success, false); // d100 90 > 73
    assert.deepEqual(r.ammo, { item: 'standard_arrow', used: 2 });
});

test('defense floor: damage never drops below 10% of Modified Power before variance (min 1 after rounding)', () => {
    const g = newRanger();
    spawn(g, 'mon.tortoise', { anchor: 'armored_beast', profile: { def: 40 } });
    const dice = scriptedDice({ d100: [5, 99], variance: [0.9] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.tortoise', skill: 'ranger.basic_attack' }, ['mon.tortoise']);
    const s = attackAction(ctx, 'pc', 'mon.tortoise', 'ranger.basic_attack').strikes[0];
    assert.equal(s.post_def, 1.75);
    assert.equal(s.final, 2); // 1.75 × 0.90 = 1.575 -> 2
});

test('hit chance modifiers and clamp: partial cover -20pp, clamp 20..95; creatures never roll Crit', () => {
    const g = newRanger();
    spawn(g, 'mon.boar', { cover: 'partial' });
    const dice = scriptedDice({ d100: [53, 99], variance: [1] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.power_shot' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.power_shot');
    assert.equal(r.strikes[0].hit.chance, 43); // 73 - 10 (Power Shot) - 20 (partial cover)
    assert.equal(r.strikes[0].hit.success, false);
    const g2 = newRanger();
    spawn(g2, 'mon.wolf', { anchor: 'wolf', band: 'ENGAGED', profile: { hit: 99 } });
    const dice2 = scriptedDice({ d100: [95, 96], variance: [1] });
    const ctx2 = encounter(g2, dice2, { actor: 'mon.wolf', target: 'pc' }, ['mon.wolf']);
    const w = attackAction(ctx2, 'mon.wolf', 'pc', null);
    assert.equal(w.strikes[0].hit.chance, 95);
    assert.equal(w.strikes[0].hit.success, true);
    assert.equal(w.strikes[0].crit.roll, null, 'direct-stat creature has Crit: none');
    assert.equal(dice2.n, 2, 'hit roll + variance only');
});

test('an out-of-range attack is illegal before any cost, ammunition or roll (Core #21, #24)', () => {
    const g = newRanger('Quick Shot + Aimed Shot');
    spawn(g, 'mon.boar', { band: 'LONG' });
    const dice = scriptedDice();
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.quick_shot' }, ['mon.boar']);
    const before = clone(ctx.enc.combatants.pc.current);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.quick_shot');
    assert.match(r.illegal, /reaches MEDIUM at most/);
    assert.deepEqual(ctx.enc.combatants.pc.current, before);
    assert.equal(dice.n, 0);
});

test('ammunition: no arrows -> the bow Skill is illegal (nothing spent, nothing rolled)', () => {
    const g = newRanger();
    applyEvent(g.state, { t: 'item.changed', d: { id: 'pc', item: 'standard_arrow', qty: -20 } });
    spawn(g, 'mon.boar');
    const dice = scriptedDice();
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.aimed_shot' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.aimed_shot');
    assert.match(r.illegal, /0 arrow/);
    assert.equal(ctx.enc.combatants.pc.current.sta, 100);
    assert.equal(dice.n, 0);
});

test('ambush only against a genuinely unaware target; Opening Action gets +25pp Crit and nothing else', () => {
    for (const [aware, ambush] of [['unaware', true], ['suspicious', false], ['aware', false]]) {
        const g = newRanger();
        spawn(g, 'mon.boar', { aware });
        const dice = scriptedDice({ d100: [10, 20, 99], variance: [1] });
        const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.aimed_shot' }, ['mon.boar']);
        assert.equal(ctx.enc.ambush, ambush, aware);
        if (!ambush) continue;
        const res = runCombat(ctx, null);
        const opening = res.records[0];
        assert.equal(opening.opening, true);
        assert.equal(opening.strikes[0].hit.chance, 83); // 73 + 10 (Aimed Shot): no ambush Hit bonus
        assert.equal(opening.strikes[0].crit.chance, 30.6); // 5.6 + 25
        assert.equal(opening.strikes[0].crit.success, true); // d100 20 <= 30.6
    }
});

test('initiative: fixed order by Init; ties -> higher PER, equal PER -> one unbiased pick', () => {
    const g = newRanger();
    const sheet = (per) => { const s = humanSheet(content.templates.get('laborer'), { level: 1 }, content); s.stats.PER = per; return s; };
    for (const [id, per] of [['npc.a', 6], ['npc.b', 7], ['npc.c', 7]]) {
        applyEvent(g.state, { t: 'entity.created', d: { entity: { id, kind: 'npc', name: id, descriptors: [], status: 'alive', location: g.state.scene.location } } });
        const s = sheet(per);
        s.stats.AGI = 9 - Math.floor(per / 2); // Init 9 for everyone
        applyEvent(g.state, { t: 'entity.sheet_set', d: { id, sheet: s } });
        applyEvent(g.state, { t: 'scene.entered', d: { id, band: 'MEDIUM' } });
    }
    const dice = scriptedDice({ pick: ['npc.c', 'npc.b'] });
    const ctx = encounter(g, dice, { actor: 'npc.a', target: 'pc' }, ['npc.a', 'npc.b', 'npc.c']);
    // all Init 9: PER 7 (b, c) before PER 6 (pc, a); b/c tie resolved by the pick, pc/a (PER 6) by the next pick
    assert.deepEqual(ctx.enc.order.slice(0, 2), ['npc.c', 'npc.b']);
    assert.deepEqual(new Set(ctx.enc.order.slice(2)), new Set(['pc', 'npc.a']));
    assert.equal(dice.n, 2, 'one pick per tied pair');
    assert.deepEqual(initiativeOrder(ctx.enc, scriptedDice({ pick: ['npc.b', 'pc'] })).slice(0, 2), ['npc.b', 'npc.c']);
});

test('multi-hit stops once the target is dead; DefeatXP enters Pending XP exactly once', () => {
    const g = newRanger('Twin Shot + Quick Shot');
    spawn(g, 'mon.rat', { anchor: 'rat', profile: { hp: 5 } });
    const dice = scriptedDice({ d100: [5, 99, 5, 99], variance: [1, 1] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.rat', skill: 'ranger.twin_shot' }, ['mon.rat']);
    const r = attackAction(ctx, 'pc', 'mon.rat', 'ranger.twin_shot');
    assert.equal(r.strikes.length, 1);
    assert.equal(r.strikes[0].defeated, true);
    assert.equal(ctx.enc.pending_xp, 10);
    assert.equal(r.ammo.used, 2, 'both arrows were committed with the Skill');
});

test('defensive Skill effect lasts until the start of the user\'s next Turn (Core #13)', () => {
    const g = new Game(content);
    g.turn('Warrior');
    g.turn('Guard and Heavy Slash');
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'ENGAGED' });
    const dice = scriptedDice({ d100: [99, 99, 99, 99], variance: [1, 1] });
    const ctx = encounter(g, dice, { actor: 'mon.wolf', target: 'pc' }, ['mon.wolf']);
    ctx.enc.round = 1; ctx.enc.turn_index = ctx.enc.order.indexOf('pc'); ctx.enc.current = 'pc'; ctx.enc.round_marker = 1 + ctx.enc.turn_index / 100;
    const r = skillAction(ctx, 'pc', 'warrior.guard');
    assert.equal(r.cost.after, 100 - content.skills.get('warrior.guard').cost.amount);
    assert.equal(ctx.enc.combatants.pc.current.effects.length, 1);
    const res = runCombat(ctx, { kind: 'hold' });
    assert.ok(res.records.some((x) => x.actor === 'mon.wolf'), 'wolf acted while Guard was up');
    assert.equal(res.stopped, 'pc_turn');
});

test('NPC policy: skittish flees, aggressive closes in, non-hostile unharmed person seeks cover', () => {
    const g = newRanger();
    spawn(g, 'mon.deer', { anchor: 'deer', band: 'SHORT' });
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'MEDIUM' });
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'npc.hunter', kind: 'npc', name: 'Hunter', descriptors: ['hunter'], status: 'alive', location: g.state.scene.location } } });
    applyEvent(g.state, { t: 'entity.sheet_set', d: { id: 'npc.hunter', sheet: { ...humanSheet(content.templates.get('hunter'), {}, content), generated: { temperament: 'cautious' } } } });
    applyEvent(g.state, { t: 'scene.entered', d: { id: 'npc.hunter', band: 'MEDIUM' } });
    const ctx = encounter(g, scriptedDice(), { actor: 'pc', target: 'mon.wolf', skill: 'ranger.aimed_shot' }, ['mon.deer', 'mon.wolf', 'npc.hunter']);
    assert.equal(npcDecide(ctx, 'mon.deer').kind, 'flee');
    assert.equal(npcDecide(ctx, 'mon.wolf').kind, 'close_and_attack');
    assert.equal(npcDecide(ctx, 'npc.hunter').kind, 'cover');
    ctx.enc.combatants['npc.hunter'].current.hp -= 10;
    assert.equal(npcDecide(ctx, 'npc.hunter').kind, 'close_and_attack', 'once hurt, its temperament decides');
});

test('DefeatXP: Level*10 × rank-gap × type, locked against the PC Rank at encounter start (Core #25)', () => {
    assert.equal(defeatXp(1, 'normal', 'F', content), 10);
    assert.equal(defeatXp(2, 'normal', 'F', content), 20);
    assert.equal(defeatXp(15, 'normal', 'F', content), 300); // E vs F: x2
    assert.equal(defeatXp(30, 'elite', 'F', content), 1800); // D vs F: x4, Elite x1.5
    assert.equal(defeatXp(1, 'boss', 'E', content), 13); // F vs E: x0.5, Boss x2.5 -> 12.5 -> 13
    assert.equal(defeatXp(10, 'normal', 'C', content), 25); // F vs C: gap -3 -> x0.25
});

test('Level-up WHILE loop with carry-over, +5 free points and favored +1/+1 per Level, no refill (Core #3)', () => {
    const g = newRanger();
    const s = g.state.entities.pc.sheet;
    const events = awardXp(s, 350, content, 'test');
    assert.deepEqual(events.map((e) => e.t), ['xp.changed', 'level.up', 'level.up']);
    for (const e of events) applyEvent(g.state, e);
    const after = g.state.entities.pc.sheet;
    assert.equal(after.level, 3);
    assert.equal(after.xp, 50); // 350 - 100 - 200
    assert.equal(after.free_points, 10);
    assert.equal(after.stats.AGI, 8);
    assert.equal(after.stats.PER, 8);
    assert.equal(after.hp, 80, 'current HP is not refilled');
    assert.equal(deriveCharacter(after, content).maxHp, 90);
});
