// 4.3.0-c.6.6.52 review (docs/PATCH9C_COMPLETION.md §12): four findings of the Git review of the 9C completion: the
// Ordinary evidence of deeds took only the last checks (day 1 A, day 2 B/C/D did not qualify); two Dungeons of one
// settlement were one source for the Rare duplicate guard; a person's area attack (Arcane Burst) could become their
// signature; a defensive signature was never used (the original guard came first).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign, say, inject } from './patch8_lib.js';
import { applyEvent } from '../../src/state.js';
import { clone } from '../../src/util.js';
import { materialise } from '../../src/engine.js';
import { npcTactic } from '../../src/combat.js';
import { defineSkill } from '../../src/skills.js';
import { developSkill, signatureSkill, signatureSteps } from '../../src/skill_composer.js';
import { trialEvidence, evidenceOf } from '../../src/v4/passive_growth.js';

const content = await loadProductContent();
const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const rest = (g) => say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));

// ------------------------------------------------------------------------------------------------ R1
test('.52 review R1: of all his unused successful checks a valid choice over two days is evidence: day 1 A, day 2 B, C and D qualify', async () => {
    const rec = (feature) => ({ t: 'check.recorded', d: { what: 'climb', stat: 'AGI', actor: 6, opposition: 6, chance: 50, roll: 20, success: true, claimed: true, by: 'engine', feature, aim: 'cross', difficulty: 'moderate' } });
    const g = await campaign(content, { cls: 'Rogue', skills: 'Razor Cut + Feint' });
    inject(g, [rec('feat.a'), { t: 'time.advanced', d: { minutes: 1440, why: 'a test precondition' } }, rec('feat.b'), rec('feat.c'), rec('feat.d')]);
    await rest(g);
    const ev = Object.values(evidenceOf(g.state())).find((x) => x.kind === 'deeds');
    assert.ok(ev, 'evidence over two days');
    assert.equal(ev.things.length, 3);
    assert.ok(ev.things.includes('feat.a'), 'the one check of day 1 is part of it');
    assert.equal(new Set(ev.things).size, 3);
});

// ------------------------------------------------------------------------------------------------ R2
test('.52 review R2: two Dungeons of one settlement are two sources, rooms of one Dungeon one; outside a Dungeon the area stays the key', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const place = (id, parent, more = {}) => ({ t: 'place.created', d: { place: { id, name: id, kind: 'site', parent, realm: 'realm.valedorn_crown', tags: [], by: 'reply', created: { turn: 1, minute: 0 }, ...more } } });
    inject(g, [place('loc.alderwatch.crypt', 'loc.alderwatch', { dungeon: true }), place('loc.alderwatch.crypt.hall', 'loc.alderwatch.crypt'), place('loc.alderwatch.crypt.vault', 'loc.alderwatch.crypt'),
        place('loc.alderwatch.sewers', 'loc.alderwatch', { dungeon: true }), place('loc.alderwatch.market', 'loc.alderwatch')]);
    for (const id of ['w1', 'w2', 'w3', 'w4', 'w5']) inject(g, [{ t: 'entity.created', d: { entity: { id, kind: 'creature', anchor: 'wolf', species: 'wolf', status: 'dead', location: 'loc.alderwatch' } } }]);
    const enc = (id, foe) => ({ id, combatants: { pc: { fixed: { level: 1, max_hp: 80 }, current: {} }, [foe]: { side: 'hostile', name: foe, fixed: { level: 7 }, current: {} } }, defeated: [foe], pp: { used: { 'mage.arcane_bolt': 'x' }, trial: { start: 60, low: 20, foes: [foe], taken: { physical: 30, magical: 0 } } } });
    const at = (id) => inject(g, [{ t: 'scene.moved', d: { location: 'loc.alderwatch', place: id, at: id } }]);
    const fought = (id, foe) => {
        const ev = trialEvidence(g.state(), content, enc(id, foe));
        inject(g, ev);
        return ev[0].d.evidence;
    };
    at('loc.alderwatch.crypt.hall');
    assert.notEqual(fought('enc.c1', 'w1').status, 'similar');
    at('loc.alderwatch.crypt.vault');
    assert.equal(fought('enc.c2', 'w2').status, 'similar', 'another room of the same Dungeon: the same source');
    at('loc.alderwatch.sewers');
    assert.notEqual(fought('enc.s1', 'w3').status, 'similar', 'another Dungeon of the same settlement: another source');
    at('loc.alderwatch.market');
    assert.notEqual(fought('enc.m1', 'w4').status, 'similar', 'the settlement outside its Dungeons: its own source');
    at('loc.alderwatch.verge');
    assert.equal(fought('enc.m2', 'w5').status, 'similar', 'outside a Dungeon the area is the key, place by place within it');
});

// ------------------------------------------------------------------------------------------------ R3
test('.52 review R3: an area or multi-strike Skill is no signature\'s base, and no signature is one: a Level 6 mage with Arcane Burst gets none from it', async () => {
    for (const sid of ['mage.arcane_burst']) assert.deepEqual(signatureSteps(content.skills.get(sid)), [], sid);
    for (let i = 0; i < 40; i++) {
        const sheet = { generated: { starters: ['mage.arcane_burst', 'mage.arcane_ward'] } };
        const def = signatureSkill({ meta: { ruleset: 2 }, rng: { seed: i }, skill_defs: {}, passive_defs: {}, decisions: [] }, content, { id: `npc.m${i}`, name: 'Vell' }, sheet);
        if (def) assert.ok(!def.effects.some((e) => e.kind === 'area') && (def.attack?.strikes ?? 1) === 1, JSON.stringify(def));
    }
    // in the product: trained mages of Level 6 whose starters hold Arcane Burst
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    let burst = 0;
    for (let i = 0; i < 40 && burst < 3; i++) {
        const id = `npc.mage${i}`;
        inject(g, [{ t: 'entity.created', d: { entity: { id, kind: 'npc', name: 'Vell', descriptors: ['hedge mage'], traits: '', template: 'hedge_mage', level: 6, status: 'alive', location: g.state().scene.location, at: g.state().scene.at } } }]);
        const s = clone(g.state());
        materialise(s, content, { int: () => 1, n: 0, seed: 1 }, (e) => applyEvent(s, e), id);
        const sheet = s.entities[id].sheet;
        if (!sheet.generated.starters.includes('mage.arcane_burst')) continue;
        burst += 1;
        const sig = sheet.generated.signature ? s.skill_defs[sheet.generated.signature] : null;
        assert.ok(!sig || (!sig.effects.some((e) => e.kind === 'area') && (sig.strikes ?? sig.attack?.strikes ?? 1) === 1), JSON.stringify(sig));
    }
    assert.ok(burst > 0, 'a trained mage with Arcane Burst was built');
});

// ------------------------------------------------------------------------------------------------ R4
test('.52 review R4: under concrete threat a person guards with their defensive signature before the guard it came from; one they cannot pay leaves the guard', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    const layered = developSkill(g.state(), content, content.skills.get('warrior.guard'), 'layered', { origin: { kind: 'signature', note: 'a test person' } }).def;
    inject(g, defineSkill(g.state(), content, layered).events);
    const state = g.state();
    const me = (sta) => ({
        id: 'npc.x', name: 'Bren', model: 'character', side: 'hostile',
        fixed: { actions: { 'warrior.basic_attack': { prof: 1 }, 'warrior.guard': { prof: 1 }, [layered.id]: { prof: 1 } }, max_hp: 100, stats: { STR: 6, VIT: 6, AGI: 5, INT: 5, PER: 5, WIL: 5 }, atk: 5, matk: 0 },
        current: { hp: 50, sta, mp: 0, effects: [], tactics: 0, band: 'ENGAGED' },
    });
    const pc = { id: 'pc', name: 'Alaric', model: 'character', side: 'ally', fixed: { max_hp: 85, def: 3, mdef: 3 }, current: { hp: 85, effects: [], band: null } };
    const decide = (sta) => {
        const npc = me(sta);
        const enc = { combatants: { pc, 'npc.x': npc }, log: [{ round: 1, actor: 'pc', kind: 'attack', target: 'npc.x', skill: 'warrior.heavy_slash', strikes: [{ target: 'npc.x', final: 20 }] }] };
        return npcTactic({ enc, content, state }, npc, { kind: 'attack' });
    };
    assert.equal(decide(100)?.skill, layered.id, 'the signature first');
    assert.equal(decide(6)?.skill, 'warrior.guard', 'not payable (8 STA): the guard as before');
    assert.equal(decide(2), null, 'neither payable: no tactic');
});
