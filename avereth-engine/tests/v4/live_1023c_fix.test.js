// 4.3.0-c.6.6.54 (docs/PATCH9C_COMPLETION.md §15): the third short live test of .53, 23.10.2026 21:44
// (tests/v4/live_1023c.json, GLM-5.3-Flash, guide current_test): the Dungeon entry and the integrity line held; the
// Warrior died in his first fight against three goblin scouts. Turn 12: Heavy Slash on Goblin Scout A, ENGAGED with
// him, lost a quarter of its damage to a partial cover the extractor had set (22 for 30). Turn 13: "I break off and
// retreat back toward the tunnel I came in by, Guard raised to cover my withdrawal": the planner gave Guard before the
// flight, the first main action was taken, the flight was "not taken this turn".
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, ROOT, Game, scriptedDice } from '../helpers.js';
import { rec } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { initEncounter, attackAction, moveAction, damagePreview } from '../../src/combat.js';
import { scaleCreature } from '../../src/npcgen.js';
import { noteUse } from '../../src/skills.js';
import { Chat4 } from './harness.js';
import { say } from './patch8_lib.js';

const content = await loadProductContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1023c.json'), 'utf8'));
const GOB_A = 'mon.mossback_warrens_c1_l1_e1_1';

/** The live chat up to message n (exclusive), played on with a scripted planner. */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
/** The player message n as the live planner read it (its commands). */
const planned = (n) => (rec(fx.messages[n]).interp?.commands || []).map(({ seq, ...c }) => c);
const records = (g) => rec(g.chat.findLast((m) => m.is_user)).events.filter((e) => e.t === 'outcome.recorded').flatMap((e) => e.d.outcome.records || []);
const pcActs = (g) => records(g).filter((r) => r.actor === 'pc');
const lines = (g) => String(rec(g.chat.findLast((m) => m.is_user)).events.find((e) => e.t === 'outcome.recorded')?.d.outcome?.actions || '');

// ------------------------------------------------------------------------------------------------ 1. his flight
test('.54 flight (live #25): "I break off and retreat ..., Guard raised to cover my withdrawal" is a flight; the Guard that only covers it does not take its place', async () => {
    const g = live(25);
    assert.deepEqual(planned(25).map((c) => c.type), ['use_skill', 'flee'], 'live: Guard first');
    await say(g, fx.messages[25].mes, ...planned(25));
    const mine = pcActs(g);
    assert.ok(mine.some((r) => r.kind === 'flee'), JSON.stringify(mine).slice(0, 400));
    assert.ok(!mine.some((r) => r.kind === 'skill' && r.skill === 'warrior.guard'), 'no Guard in its place');
    assert.equal(mine.filter((r) => ['flee', 'skill', 'attack'].includes(r.kind)).length, 1, 'one main action');
});

test('.54 flight: a Guard he means to raise first ("I raise Guard, then next turn I retreat") stays his action this turn; the flight waits as before', async () => {
    const g = live(25);
    await say(g, 'I raise Guard, then next turn I retreat toward the tunnel.',
        { type: 'use_skill', skill: 'warrior.guard', target: null, quote: 'I raise Guard' },
        { type: 'flee', quote: 'then next turn I retreat toward the tunnel' });
    const mine = pcActs(g);
    assert.ok(mine.some((r) => r.kind === 'skill' && r.skill === 'warrior.guard'));
    assert.ok(!mine.some((r) => r.kind === 'flee'));
});

// ------------------------------------------------------------------------------------------------ 2. partial cover
test('.54 cover (live #23): Heavy Slash on Goblin Scout A ENGAGED with him loses nothing to its partial cover', async () => {
    const g = live(23);
    assert.equal(rec(fx.messages[23]).events.filter((e) => e.t === 'outcome.recorded').flatMap((e) => e.d.outcome.records).find((r) => r.actor === 'pc').strikes[0].cover, '-25%', 'live: -25%');
    await say(g, fx.messages[23].mes, ...planned(23));
    const slash = pcActs(g).find((r) => r.skill === 'warrior.heavy_slash');
    assert.ok(slash, JSON.stringify(pcActs(g)).slice(0, 300));
    const s = slash.strikes.find((x) => x.target === GOB_A);
    assert.equal(s.cover, undefined);
    assert.ok(!s.steps.some((x) => /Partial Cover/.test(x)), s.steps.join(' | '));
});

/** A hero of ruleset 2 and one foe placed at a band, in a fight begun by him (the combat core, no narrator). */
function scene(cls, skills, { band, cover }) {
    const g = new Game(content);
    g.input(cls);
    g.input(skills);
    const p = { ...scaleCreature(content.anchors.get('wolf'), 1, 'normal', content), max_hp: 200, hp: 200 };
    for (const e of [
        { t: 'entity.created', d: { entity: { id: 'mon.w', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state.scene.location, profile: p } } },
        { t: 'scene.entered', d: { id: 'mon.w', band, cover } },
        { t: 'scene.awareness', d: { id: 'mon.w', level: 'aware' } },
    ]) applyEvent(g.state, e);
    const dice = scriptedDice({ variance: [1, 1, 1, 1, 1, 1] });
    const enc = initEncounter(g.state, content, dice, { actor: 'pc', target: 'mon.w' }, [{ id: 'mon.w', side: 'hostile' }], 'enc.test');
    return { enc, content, dice, state: g.state };
}
const strikeOn = (r) => r.strikes.find((x) => x.target === 'mon.w');

test('.54 cover: a ranged attack on a foe in partial cover at SHORT still loses a quarter', () => {
    const ctx = scene('Mage', 'Arcane Bolt + Arcane Ward', { band: 'SHORT', cover: 'partial' });
    const r = attackAction(ctx, 'pc', 'mon.w', 'mage.arcane_bolt');
    assert.equal(strikeOn(r).cover, '-25%');
    const ctx2 = scene('Mage', 'Arcane Bolt + Arcane Ward', { band: 'SHORT', cover: 'none' });
    assert.ok(strikeOn(attackAction(ctx2, 'pc', 'mon.w', 'mage.arcane_bolt')).final > strikeOn(r).final);
});

test('.54 cover: a foe that leaves its covered position has no cover left (it closes, then backs off: a bolt at SHORT loses nothing)', () => {
    const ctx = scene('Mage', 'Arcane Bolt + Arcane Ward', { band: 'SHORT', cover: 'partial' });
    moveAction(ctx, 'mon.w', 'closer');
    moveAction(ctx, 'mon.w', 'away');
    assert.equal(ctx.enc.combatants['mon.w'].current.band, 'SHORT');
    assert.equal(strikeOn(attackAction(ctx, 'pc', 'mon.w', 'mage.arcane_bolt')).cover, undefined);
});

test('.54 cover: the damage preview and the strike apply the same rule (ENGAGED melee: none; ranged at SHORT: applies)', () => {
    for (const [cls, skills, sid, band, want, strike] of [
        ['Warrior', 'Heavy Slash + Guard', 'warrior.heavy_slash', 'ENGAGED', null, undefined],
        ['Mage', 'Arcane Bolt + Arcane Ward', 'mage.arcane_bolt', 'SHORT', 'applies', '-25%'],
    ]) {
        const ctx = scene(cls, skills, { band, cover: 'partial' });
        const p = damagePreview(ctx.enc, content, 'mon.w', ctx.state).find((x) => x.skill === sid);
        assert.equal(p.cover, want, `${sid} preview`);
        const s = strikeOn(attackAction(ctx, 'pc', 'mon.w', sid));
        assert.equal(s.cover, strike, `${sid} strike`);
        assert.ok(s.final >= p.min && s.final <= p.max, `${sid}: ${s.final} in ${p.min}..${p.max}`);
    }
});

test('.54 cover: the 9C pattern "cover" comes only from cover that held (a ranged strike at SHORT), never from a melee strike ENGAGED', () => {
    const melee = scene('Warrior', 'Heavy Slash + Guard', { band: 'ENGAGED', cover: 'partial' });
    noteUse(melee, attackAction(melee, 'pc', 'mon.w', 'warrior.heavy_slash'));
    assert.ok(!(melee.enc.pp?.marks?.['warrior.heavy_slash'] || []).includes('cover'), JSON.stringify(melee.enc.pp?.marks));
    const ranged = scene('Mage', 'Arcane Bolt + Arcane Ward', { band: 'SHORT', cover: 'partial' });
    noteUse(ranged, attackAction(ranged, 'pc', 'mon.w', 'mage.arcane_bolt'));
    assert.ok((ranged.enc.pp?.marks?.['mage.arcane_bolt'] || []).includes('cover'));
});
