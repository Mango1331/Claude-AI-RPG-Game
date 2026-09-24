// Core rules executed by the engine: derived values, the damage chain (Core #11 worked examples), Combat V3 (legal
// attacks connect, no random Crit, true Ambush ×1.5, cover and defensive reductions, Initiative without PER), range
// and ammunition legality, effects, NPC policy, DefeatXP lock and the Level-up loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, scriptedDice } from '../helpers.js';
import { deriveCharacter, rawPower } from '../../src/derived.js';
import { applyEvent } from '../../src/state.js';
import { scaleCreature, humanSheet } from '../../src/npcgen.js';
import { initEncounter, initiativeOrder, attackAction, skillAction, runCombat, npcDecide, damagePreview } from '../../src/combat.js';
import { detectionScore } from '../../src/checks.js';
import { Dice } from '../../src/rng.js';
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
        // Initiative = floor(1.5 × AGI): the same Level-1 values as AGI + floor(PER/2) except the Duelist (AGI 6, PER 5: 8 -> 9)
        warrior: { maxHp: 85, maxMp: 60, maxSta: 100, init: 7, def: 7, mdef: 3, atk: 6, matk: 0 },
        mage: { maxHp: 80, maxMp: 72, maxSta: 100, init: 7, def: 3, mdef: 4, atk: 0, matk: 6 },
        guardian: { maxHp: 85, maxMp: 64, maxSta: 100, init: 7, def: 10, mdef: 5, atk: 5, matk: 0 },
        duelist: { maxHp: 80, maxMp: 60, maxSta: 100, init: 9, def: 3, mdef: 4, atk: 6, matk: 0 },
        ranger: { maxHp: 80, maxMp: 60, maxSta: 100, init: 9, def: 3, mdef: 4, atk: 6, matk: 0 },
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
        assert.ok(!('baseHit' in dv) && !('crit' in dv), 'no Base Hit, no Crit Chance (Combat V3)');
        assert.equal(s.hp, exp.maxHp);
        assert.equal(Object.keys(s.skills).length, 3, `${cls}: Basic Attack + 2 Skills`);
    }
});

test('Ranger Raw Power at full precision; the PER share moved onto AGI, so Level 1 (AGI = PER = 6) is unchanged', () => {
    const g = newRanger('Twin Shot + Quick Shot');
    const s = g.state.entities.pc.sheet;
    const dv = deriveCharacter(s, content);
    const raw = (id) => rawPower(content.skills.get(id), s.stats, dv);
    assert.equal(raw('ranger.basic_attack'), 17.5);
    assert.equal(raw('ranger.aimed_shot'), 26.5);
    assert.equal(raw('ranger.power_shot'), 33.25);
    assert.equal(raw('ranger.quick_shot'), 21);
    assert.equal(raw('ranger.twin_shot'), 12.25);
    for (const id of ['ranger.basic_attack', 'ranger.aimed_shot', 'ranger.power_shot', 'ranger.quick_shot', 'ranger.twin_shot']) {
        assert.deepEqual(content.skills.get(id).attack.scaling.map((t) => t.stat), ['AGI'], id);
    }
    assert.equal(content.skills.get('ranger.power_shot').attack.scaling[0].coef, 1.875);
    // PER no longer changes an attack; AGI carries the whole former AGI+PER share
    const perHigh = { ...s.stats, PER: 20 };
    assert.equal(rawPower(content.skills.get('ranger.power_shot'), perHigh, dv), 33.25);
    assert.equal(rawPower(content.skills.get('ranger.power_shot'), { ...s.stats, AGI: 7 }, dv), 35.125);
});

test('Core #11 worked example: 17.5 Raw vs DEF 2, variance 0.94 -> 15 (the attack connects; only the variance is rolled)', () => {
    const g = newRanger();
    spawn(g, 'mon.boar');
    const dice = scriptedDice({ variance: [0.94] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.basic_attack' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.basic_attack');
    const s = r.strikes[0];
    assert.equal(dice.n, 1, 'no Hit roll, no Crit roll');
    assert.equal(s.hit, undefined);
    assert.equal(s.crit, undefined);
    assert.equal(s.post_def, 15.5);
    assert.equal(s.final, 15);
    assert.equal(s.hp_after, 41 - 15);
    assert.equal(r.cost.after, 95);
    assert.deepEqual(r.ammo, { item: 'standard_arrow', used: 1 });
});

test('Core #11 worked example: 12.25 Raw vs DEF 2, variance 1.08, Ambush Crit ×1.5 -> 17; a multi-hit Opening Action crits every strike', () => {
    const g = newRanger('Twin Shot + Quick Shot');
    spawn(g, 'mon.boar');
    const dice = scriptedDice({ variance: [1.08, 1] });
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.twin_shot' }, ['mon.boar']);
    const r = attackAction(ctx, 'pc', 'mon.boar', 'ranger.twin_shot', { opening: true });
    assert.equal(r.strikes.length, 2);
    assert.deepEqual(r.strikes.map((s) => s.crit?.multiplier), [1.5, 1.5], 'both strikes of the one Opening Action crit');
    assert.equal(r.strikes[0].final, 17);
    assert.equal(r.strikes[1].final, 15); // (12.25 - 2) × 1.00 × 1.5 = 15.375
    assert.deepEqual(r.ammo, { item: 'standard_arrow', used: 2 });
    assert.equal(dice.n, 2, 'one variance per strike, nothing else');
    // the same Skill outside an Ambush: both strikes land, neither crits
    const g2 = newRanger('Twin Shot + Quick Shot');
    spawn(g2, 'mon.boar');
    const ctx2 = encounter(g2, scriptedDice({ variance: [1.08, 1] }), { actor: 'pc', target: 'mon.boar', skill: 'ranger.twin_shot' }, ['mon.boar']);
    const plain = attackAction(ctx2, 'pc', 'mon.boar', 'ranger.twin_shot');
    assert.deepEqual(plain.strikes.map((s) => [s.final, s.crit]), [[11, undefined], [10, undefined]]);
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

test('an ordinary legal attack always connects and never crits: 300 seeded attacks, every strike deals damage', () => {
    let strikes = 0;
    for (let seed = 1; seed <= 100; seed++) {
        for (const skill of ['ranger.basic_attack', 'ranger.aimed_shot', 'ranger.power_shot']) {
            const g = newRanger();
            spawn(g, 'mon.boar');
            const ctx = encounter(g, new Dice(seed, 0), { actor: 'pc', target: 'mon.boar', skill }, ['mon.boar']);
            const r = attackAction(ctx, 'pc', 'mon.boar', skill);
            for (const s of r.strikes) {
                strikes += 1;
                assert.ok(s.final >= 1 && s.hp_after < s.hp_before, `seed ${seed} ${skill}`);
                assert.equal(s.crit, undefined, `seed ${seed} ${skill}: no random Crit`);
            }
        }
    }
    assert.equal(strikes, 300);
    // creatures too: the boar's Gore lands every time, with no Hit value in its profile
    for (let seed = 1; seed <= 50; seed++) {
        const g = newRanger();
        spawn(g, 'mon.boar', { band: 'ENGAGED' });
        const ctx = encounter(g, new Dice(seed, 0), { actor: 'mon.boar', target: 'pc' }, ['mon.boar']);
        assert.equal(ctx.enc.combatants['mon.boar'].fixed.hit, undefined);
        const w = attackAction(ctx, 'mon.boar', 'pc', null);
        assert.ok(w.strikes[0].final >= 1 && !w.strikes[0].crit, `seed ${seed}`);
    }
});

test('Partial Cover: -25% damage for that attack; Aimed Shot and Precision Thrust ignore it; Full Cover blocks', () => {
    const shot = (skill, cover, cls = 'ranger', skills = 'Aimed Shot + Power Shot', band = 'SHORT') => {
        const g = cls === 'ranger' ? newRanger(skills) : new Game(content);
        if (cls !== 'ranger') { g.turn(cls); g.turn(skills); }
        spawn(g, 'mon.boar', { cover, band });
        const dice = scriptedDice({ variance: [1] });
        const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill }, ['mon.boar']);
        return { r: attackAction(ctx, 'pc', 'mon.boar', skill), dice, ctx };
    };
    // Power Shot 33.25 vs DEF 2 = 31.25; behind partial cover × 0.75 = 23.4375 -> 23
    assert.equal(shot('ranger.power_shot', 'none').r.strikes[0].final, 31);
    const covered = shot('ranger.power_shot', 'partial').r.strikes[0];
    assert.equal(covered.final, 23);
    assert.equal(covered.cover, '-25%');
    assert.ok(covered.steps.includes('Partial Cover -25% = 23.4375'), covered.steps.join(' | '));
    // Aimed Shot 26.5 vs DEF 2 = 24.5, with or without partial cover
    assert.equal(shot('ranger.aimed_shot', 'none').r.strikes[0].final, 25);
    const through = shot('ranger.aimed_shot', 'partial').r.strikes[0];
    assert.equal(through.final, 25);
    assert.equal(through.cover, 'ignored');
    const thrust = shot('duelist.precision_thrust', 'partial', 'Duelist', 'Precision Thrust and Lunge', 'ENGAGED').r.strikes[0];
    assert.equal(thrust.cover, 'ignored');
    assert.equal(shot('duelist.basic_attack', 'partial', 'Duelist', 'Precision Thrust and Lunge', 'ENGAGED').r.strikes[0].cover, '-25%');
    // Full Cover: no line of sight, nothing spent, nothing rolled
    const blocked = shot('ranger.power_shot', 'full');
    assert.match(blocked.r.illegal, /behind full cover/);
    assert.equal(blocked.dice.n, 0);
    assert.equal(blocked.ctx.enc.combatants.pc.current.sta, 100);
    // the preview the player sees uses the same numbers
    const p = shot('ranger.power_shot', 'partial');
    const opts = damagePreview(p.ctx.enc, content, 'mon.boar');
    assert.deepEqual(opts.map((o) => [o.name, o.cover]), [['Basic Attack', 'applies'], ['Aimed Shot', 'ignored'], ['Power Shot', 'applies']]);
});

test('an invalid target is rejected before any cost or roll: not in the fight, dead, or the attacker\'s unknown Skill', () => {
    const g = newRanger();
    spawn(g, 'mon.boar');
    const dice = scriptedDice();
    const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.aimed_shot' }, ['mon.boar']);
    assert.match(attackAction(ctx, 'pc', 'mon.nobody', 'ranger.aimed_shot').illegal, /not an active combatant/);
    ctx.enc.combatants['mon.boar'].current.defeated = true;
    assert.match(attackAction(ctx, 'pc', 'mon.boar', 'ranger.aimed_shot').illegal, /not an active combatant/);
    ctx.enc.combatants['mon.boar'].current.defeated = false;
    assert.match(attackAction(ctx, 'pc', 'mon.boar', 'ranger.twin_shot').illegal, /does not know Twin Shot/);
    assert.equal(dice.n, 0);
    assert.equal(ctx.enc.combatants.pc.current.sta, 100);
});

test('defensive Skills reduce incoming damage by their former strength: Deflect / Evasive Step -25%, Quickstep -20%', () => {
    const cases = [['Warrior', 'Deflect and Heavy Slash', 'warrior.deflect', 25], ['Duelist', 'Evasive Step and Lunge', 'duelist.evasive_step', 25], ['Ranger', 'Quickstep and Aimed Shot', 'ranger.quickstep', 20]];
    for (const [cls, skills, sid, pct] of cases) {
        assert.deepEqual(content.skills.get(sid).effects.find((e) => e.kind === 'incoming_damage_reduction').pct, pct, sid);
        const g = new Game(content);
        g.turn(cls);
        g.turn(skills);
        spawn(g, 'mon.bear', { anchor: 'bear', band: 'ENGAGED' });
        const ctx = encounter(g, scriptedDice({ variance: [1, 1] }), { actor: 'mon.bear', target: 'pc' }, ['mon.bear']);
        const def = ctx.enc.combatants.pc.fixed.def;
        const plain = attackAction(ctx, 'mon.bear', 'pc', null).strikes[0];
        assert.equal(plain.final, Math.round(14 - def));
        skillAction(ctx, 'pc', sid, { dir: 'away' });
        ctx.enc.combatants['mon.bear'].current.band = 'ENGAGED';
        const reduced = attackAction(ctx, 'mon.bear', 'pc', null).strikes[0];
        assert.equal(reduced.final, Math.max(1, Math.round((14 - def) * (1 - pct / 100))), `${sid}: ${reduced.steps.join(' | ')}`);
        assert.deepEqual(reduced.reduced, [`${content.skills.get(sid).name} -${pct}%`]);
    }
});

test('prepared attacks (Focus Aim, Feint) give +35% Modified Power and no Hit bonus', () => {
    const g = newRanger('Focus Aim + Power Shot');
    spawn(g, 'mon.boar');
    const ctx = encounter(g, scriptedDice({ variance: [1] }), { actor: 'pc', target: 'mon.boar', skill: 'ranger.power_shot' }, ['mon.boar']);
    assert.deepEqual(skillAction(ctx, 'pc', 'ranger.focus_aim').effects, ['next ranged attack +35% Modified Power']);
    const s = attackAction(ctx, 'pc', 'mon.boar', 'ranger.power_shot').strikes[0];
    assert.equal(s.power, 44.8875); // 33.25 × 1.35
    assert.equal(s.final, 43); // 44.8875 - 2
    assert.equal(content.skills.get('duelist.feint').effects[0].power_pct, 35);
    assert.equal(content.skills.get('duelist.feint').effects[0].hit_pp, undefined);
});

test('a monster\'s true Ambush (it was concealed when it committed) gives its Opening Action the same guaranteed ×1.5', () => {
    const g = newRanger();
    spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'ENGAGED' });
    applyEvent(g.state, { t: 'scene.concealed', d: { ids: ['mon.wolf'] } });
    const dice = scriptedDice({ variance: [1, 1] });
    const ctx = encounter(g, dice, { actor: 'mon.wolf', target: 'pc' }, ['mon.wolf']);
    assert.equal(ctx.enc.ambush, true);
    assert.match(ctx.enc.ambush_reason, /guaranteed Critical Hit ×1.5/);
    const res = runCombat(ctx, null);
    const opening = res.records[0];
    assert.equal(opening.actor, 'mon.wolf');
    assert.equal(opening.opening, true);
    assert.equal(opening.strikes[0].crit.multiplier, 1.5);
    assert.equal(opening.strikes[0].final, 9); // (9 - 3) × 1.0 × 1.5
    // its later Turns are ordinary: they land and do not crit
    const later = res.records.slice(1).filter((r) => r.actor === 'mon.wolf' && r.kind === 'attack');
    for (const r of later) assert.equal(r.strikes[0].crit, undefined);
    // the same wolf attacking openly: no Opening Action, no crit
    const g2 = newRanger();
    spawn(g2, 'mon.wolf', { anchor: 'wolf', band: 'ENGAGED' });
    const ctx2 = encounter(g2, scriptedDice(), { actor: 'mon.wolf', target: 'pc' }, ['mon.wolf']);
    assert.equal(ctx2.enc.ambush, false);
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

test('Alaric\'s Ambush only against a genuinely unaware target; its Opening Action is a guaranteed Critical Hit ×1.5', () => {
    for (const [aware, ambush] of [['unaware', true], ['suspicious', false], ['aware', false]]) {
        const g = newRanger();
        spawn(g, 'mon.boar', { aware });
        const dice = scriptedDice({ variance: [1] });
        const ctx = encounter(g, dice, { actor: 'pc', target: 'mon.boar', skill: 'ranger.aimed_shot' }, ['mon.boar']);
        assert.equal(ctx.enc.ambush, ambush, aware);
        if (!ambush) continue;
        const res = runCombat(ctx, null);
        const opening = res.records[0];
        assert.equal(opening.opening, true);
        assert.equal(opening.strikes[0].crit.multiplier, 1.5);
        assert.equal(opening.strikes[0].final, 37); // (26.5 - 2) × 1.0 × 1.5 = 36.75
        assert.equal(dice.log.filter((x) => x.kind === 'd100').length, 0, 'no Hit or Crit roll');
    }
});

test('Initiative = floor(1.5 × AGI) without PER; ties are resolved once without bias (PER does not break them)', () => {
    const g = newRanger();
    assert.equal(deriveCharacter(g.state.entities.pc.sheet, content).init, 9); // AGI 6
    const sheet = (agi, per) => { const s = humanSheet(content.templates.get('laborer'), { level: 1 }, content); s.stats.AGI = agi; s.stats.PER = per; return s; };
    for (const [id, agi, per] of [['npc.a', 6, 1], ['npc.b', 6, 20], ['npc.c', 5, 20]]) {
        applyEvent(g.state, { t: 'entity.created', d: { entity: { id, kind: 'npc', name: id, descriptors: [], status: 'alive', location: g.state.scene.location } } });
        applyEvent(g.state, { t: 'entity.sheet_set', d: { id, sheet: sheet(agi, per) } });
        applyEvent(g.state, { t: 'scene.entered', d: { id, band: 'MEDIUM' } });
    }
    const dice = scriptedDice({ pick: ['npc.a', 'pc'] });
    const ctx = encounter(g, dice, { actor: 'npc.a', target: 'pc' }, ['npc.a', 'npc.b', 'npc.c']);
    const init = Object.fromEntries(Object.values(ctx.enc.combatants).map((c) => [c.id, c.fixed.init]));
    assert.deepEqual(init, { pc: 9, 'npc.a': 9, 'npc.b': 9, 'npc.c': 7 }, 'PER 1 and PER 20 give the same Initiative');
    // pc, a and b tie at 9: PER 20 (b) gets no priority; the unbiased picks decide (a, then pc), c (7) acts last
    assert.deepEqual(ctx.enc.order, ['npc.a', 'pc', 'npc.b', 'npc.c']);
    assert.equal(dice.n, 2, 'three tied: two picks');
    assert.deepEqual(initiativeOrder(ctx.enc, scriptedDice({ pick: ['npc.b', 'pc'] })), ['npc.b', 'pc', 'npc.a', 'npc.c']);
});

test('PER stays out of combat math (the same fight with PER 1 and PER 20 is identical) and keeps its non-combat checks', () => {
    const fight = (per) => {
        const g = newRanger('Twin Shot + Quick Shot');
        g.state.entities.pc.sheet.stats.PER = per;
        spawn(g, 'mon.wolf', { anchor: 'wolf', band: 'SHORT' });
        const ctx = encounter(g, new Dice(99, 0), { actor: 'pc', target: 'mon.wolf', skill: 'ranger.quick_shot' }, ['mon.wolf']);
        const res = runCombat(ctx, null);
        return { order: ctx.enc.order, init: ctx.enc.combatants.pc.fixed.init, records: res.records.map((r) => (r.strikes || []).map((s) => s.final)) };
    };
    assert.deepEqual(fight(1), fight(20));
    // Core #8: Detection Score = PER (stealth vs detection, tracking, noticing ambushers) is unchanged
    const g = newRanger();
    applyEvent(g.state, { t: 'entity.created', d: { entity: { id: 'npc.watch', kind: 'npc', name: 'Watch', descriptors: ['watchman'], status: 'alive', location: g.state.scene.location } } });
    const s = humanSheet(content.templates.get('guard'), { level: 1 }, content);
    s.stats.PER = 11;
    applyEvent(g.state, { t: 'entity.sheet_set', d: { id: 'npc.watch', sheet: s } });
    assert.equal(detectionScore(g.state, content, 'npc.watch'), 11);
    assert.equal(detectionScore(g.state, content, 'pc'), 6);
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
