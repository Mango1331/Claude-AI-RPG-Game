// 4.3.0-c.6.6.52 (docs/PATCH9C_COMPLETION.md): the 9C completion, 9C-2d organic breakthroughs and 9C-3 Skill evolution,
// F-rank C2/C3, a minimal Rank E, NPC signatures, Ordinary evidence from deeds and the Rare duplicate guard; played
// through the product's host path (tests/v4/patch8_lib.js) with real fights, as the 9C-2c tests do.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent, loadContent } from '../helpers.js';
import { campaign, say, inject, outcomeOf, lastUser } from './patch8_lib.js';
import { scaleCreature } from '../../src/npcgen.js';
import { deriveCharacter } from '../../src/derived.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { foldChat } from '../../src/host.js';
import { applyEvent } from '../../src/state.js';
import { clone } from '../../src/util.js';
import { materialise } from '../../src/engine.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { skillDefErrors, defineSkill, learnSkill, calibration } from '../../src/skills.js';
import { developSkill, signatureSkill, signatureSteps, STEPS, STEP_ORDER, techniqueShape } from '../../src/skill_composer.js';
import { skillOffers, developmentOffers, combination, acceptSkill } from '../../src/v4/skill_growth.js';
import { trialEvidence, engineEvidence, passiveOffers, evidenceOf } from '../../src/v4/passive_growth.js';
import { knownTechnique } from '../../src/v4/growth.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { catalogText, catalogIds } from '../../src/v4/interpret.js';
import { plannerSystem } from '../../src/v4/planner.js';

const content = await loadProductContent();
const legacy = await loadContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const reply = (g, prose = 'They fight.') => g.reply(prose, { expected: {}, deltas: [] });
const sheetOf = (g) => g.state().entities.pc.sheet;
const panel = (g, text) => runCommands(g.state(), content, text).panels.join('\n');

/** A campaign whose Forge answers nothing valid (the engine's own names). */
async function hero(cls = 'Warrior', skills = 'Heavy Slash + Guard', c = content) {
    const g = await campaign(c, { cls, skills });
    const base = g.llm;
    g.llm = async (q) => (q.purpose.startsWith('forge') ? 'not json' : base(q));
    return g;
}
const atP5 = (g, sid) => inject(g, [{ t: 'skill.progress', d: { id: 'pc', skill: sid, gained: 300, from: { prof: 1, pp: 0 }, to: { prof: 5, pp: 0 }, need: 75, why: 'a test precondition' } }]);
const heal = (g) => {
    const dv = deriveCharacter(sheetOf(g), content);
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: dv.maxHp } }, { t: 'resource.changed', d: { id: 'pc', resource: 'sta', value: dv.maxSta } }]);
};

let N = 0;
/**
 * A real fight against a pack of wolves ENGAGED with him (one group: they fight together), his Skills by turn (plan(i)),
 * until it is over. The records of its last turn.
 */
async function fight(g, { plan, count = 2, hp = 60, level = 1 } = {}) {
    N += 1;
    heal(g);
    const ids = Array.from({ length: count }, (_, i) => `mon.p${N}_${i}`);
    const p = scaleCreature(content.anchors.get('wolf'), level, 'normal', content);
    inject(g, ids.flatMap((id) => [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', group: `grp.p${N}`, status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: hp, hp } } } },
        { t: 'scene.entered', d: { id, band: 'ENGAGED', cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]));
    for (let i = 0; i < 16; i++) {
        const target = ids.find((id) => g.state().entities[id]?.status !== 'dead');
        if (!target) break;
        const skill = plan(i);
        const self = !content.skills.get(skill)?.attack && !g.state().skill_defs?.[skill]?.attack;
        await say(g, '*i fight on*', { type: 'use_skill', skill, target: self ? null : target, quote: 'i fight on' });
        if (!g.state().encounter && !(g.state().pending_combat || []).length) break;
        await reply(g);
    }
    const ended = lastUser(g).events.find((e) => e.t === 'encounter.ended');
    assert.ok(ended, 'the fight ended');
    assert.notEqual(g.state().entities.pc.status, 'dead');
    return ended;
}
const always = (sid) => () => sid;
const rest = (g) => say(g, '*i rest for ten minutes*', ACT('rest', { minutes: 10, quote: 'i rest for ten minutes' }));

// ------------------------------------------------------------------------------------------------ 1 composer, ranks
test('9C completion (1): every step of every starter Skill composes a valid F definition (C2/C3 of the existing features, never C4, Rank kept); E has its own bounds, D-S none; a Skill above his Rank is learned by no one', async () => {
    const state = { meta: { ruleset: 2 }, rng: { seed: 1 }, skill_defs: {}, passive_defs: {}, decisions: [] };
    let steps = 0;
    for (const cls of ['warrior', 'mage', 'rogue']) {
        for (const sid of [content.classes.get(cls).basic_attack, ...content.classes.get(cls).skill_pool]) {
            const k = content.skills.get(sid);
            for (const step of STEP_ORDER.filter((x) => STEPS[x].applies(k))) {
                const d = developSkill(state, content, k, step, { origin: { kind: 'evolution', note: 'test' } });
                assert.deepEqual(d.errors, [], `${sid} ${step}`);
                assert.deepEqual(skillDefErrors(d.def, content, state), [], `${sid} ${step}`);
                assert.equal(d.def.rank, 'F');
                assert.equal(d.def.complexity, k.complexity + 1);
                assert.notEqual(techniqueShape(d.def), techniqueShape(k), 'a real mechanical change, not a new name');
                if (d.def.attack && step !== 'crowd') assert.ok(d.def.attack.base >= k.attack.base, `${sid} ${step}: never below what it develops from`);
                steps += 1;
            }
        }
    }
    assert.ok(steps >= 40);
    // the steps: an area, a closing band, piercing cover, LONG reach, a guard after the blow, a second protection
    const power = content.skills.get('warrior.power_strike'); // C2
    const c3 = developSkill(state, content, power, 'cover', { origin: { kind: 'x' } }).def;
    assert.equal(c3.complexity, 3);
    assert.equal(developSkill(state, content, c3, 'riposte', { origin: { kind: 'x' } }).errors[0], 'Piercing Power Strike is Complexity 3, the last at its Rank', 'C3 is the end at a Rank');
    assert.match(developSkill(state, content, content.skills.get('mage.arcane_ward'), 'reach', { origin: { kind: 'x' } }).errors[0], /cannot develop this way/);
    assert.match(developSkill(state, content, content.skills.get('mage.blink'), 'layered', { origin: { kind: 'x' } }).errors[0], /cannot develop this way/, 'a step without a protection is none');
    // Rank E: its own provisional calibration (most growth in Base Power); D has none and is never taken for F
    const e = developSkill(state, content, content.skills.get('mage.arcane_bolt'), 'reach', { rank: 'E', origin: { kind: 'x' } });
    assert.deepEqual(e.errors, []);
    assert.deepEqual([e.def.rank, e.def.attack.base > 14], ['E', true]);
    assert.deepEqual(skillDefErrors(e.def, content, state), []);
    assert.match(developSkill(state, content, content.skills.get('mage.arcane_bolt'), 'reach', { rank: 'D', origin: { kind: 'x' } }).errors[0], /Rank D has no calibrated bounds/);
    assert.match(skillDefErrors({ ...e.def, rank: 'D' }, content, state).join(' '), /rank D: only F- and E-rank Skills have calibrated bounds yet/);
    assert.equal(calibration(content, 'S'), null);
    // learned only from Rank E (Level 15) on
    const g = await hero('Mage', 'Arcane Bolt + Arcane Ward');
    const d = defineSkill(g.state(), content, e.def);
    inject(g, d.events);
    assert.match(learnSkill(g.state(), content, 'pc', e.def.id).errors[0], /is a Rank E Skill: it takes Rank E \(Level 15\); he is Rank F \(Level 1\)/);
    inject(g, [{ t: 'level.up', d: { id: 'pc', level: 15, free_points: 70, favored: [], xp_after: 0 } }]);
    assert.deepEqual(learnSkill(g.state(), content, 'pc', e.def.id).errors, []);
    // and no path of the game makes one by itself: a development keeps its Skill's Rank
    assert.equal(developSkill(g.state(), content, content.skills.get('mage.arcane_bolt'), 'cover', { origin: { kind: 'x' } }).def.rank, 'F');
});

// ------------------------------------------------------------------------------------------------ 2 evolution
test('9C completion (2): a Skill at P5 that showed a pattern in two hard fights at P5 is offered its successor once, safely; accepted, the successor takes its place with P5 and acts in the next fight; the old one is history', async () => {
    const g = await hero();
    atP5(g, 'warrior.heavy_slash');
    const first = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.deepEqual(first.d.summary.noted, { skills: ['warrior.heavy_slash'] });
    assert.equal(first.d.summary.developments, undefined, 'one fight is not enough');
    assert.equal(skillOffers(g.state()).length, 0);
    await reply(g, 'It is over.');
    const second = await fight(g, { plan: always('warrior.heavy_slash') });
    const key = `evo:warrior.heavy_slash:crowd:${first.d.id}+${second.d.id}`;
    assert.deepEqual(second.d.summary.developments, [key]);
    // offered in the turn the fight ended (outside it), never inside it; not his yet
    const offer = skillOffers(g.state())[0];
    assert.deepEqual([offer.replaces, offer.skill.name, offer.skill.complexity, evidenceOf(g.state())[key].status], ['warrior.heavy_slash', 'Sweeping Heavy Slash', 2, 'offered']);
    assert.match(outcomeOf(g).skill_offers[0].text, /Sweeping Heavy Slash \[F · C2\]: 11 \+ STR×1\.44 physical, ENGAGED; 9 STA\. Heavy Slash, one step further: it strikes every foe ENGAGED with him/);
    assert.ok(sheetOf(g).skills['warrior.heavy_slash'] && !sheetOf(g).skills[offer.skill.id], 'nothing of his changed');
    assert.match(catalogText(buildCatalog(g.state(), content, { known: true, c: true })), /POSSIBLE SKILL \(offered by the engine; his only if he accepts\): dec\.skill\.evo_warrior_heavy_slash_crowd[^ ]* \(Sweeping Heavy Slash .* It would replace Heavy Slash; not his yet\)/);
    assert.match(panel(g, '#skills'), /POSSIBLE SKILL — Sweeping Heavy Slash .* it would replace Heavy Slash \(his Proficiency kept; Heavy Slash his no longer\) · not his yet/);
    assert.deepEqual(validateState(g.state(), content), []);
    await reply(g, 'Something settles in his arms.');
    // nothing more is offered for it meanwhile (one evolution per Skill), and a rest offers nothing again
    await rest(g);
    assert.equal(skillOffers(g.state()).length, 1);
    await reply(g, 'He rests.');
    // his acceptance
    await say(g, 'I accept it. I make it mine.', { type: 'development.accept', offer: offer.id, replace: null, quote: 'I accept it' });
    assert.match(outcomeOf(g).actions[0], /^1\. EVOLVED — Heavy Slash becomes Sweeping Heavy Slash, booked by the engine \(P5 kept\)/);
    assert.deepEqual(lastUser(g).events.map((e) => e.t).filter((t) => /^(skill|growth|decision)\./.test(t)), ['skill.defined', 'skill.evolved', 'growth.decided', 'decision.closed']);
    const sid = offer.skill.id;
    assert.deepEqual(sheetOf(g).skills[sid], { prof: 5, pp: 0 });
    assert.equal(sheetOf(g).skills['warrior.heavy_slash'], undefined);
    assert.ok(sheetOf(g).skills['warrior.basic_attack'], 'the Basic Attack always stays');
    assert.deepEqual(sheetOf(g).skill_history.map((h) => [h.id, h.prof, h.evolved_to]), [['warrior.heavy_slash', 5, sid]]);
    assert.match(panel(g, '#skill Sweeping Heavy Slash'), /Evolved from: Heavy Slash \(at P5\)/);
    assert.match(panel(g, '#skill Heavy Slash'), /Heavy Slash evolved into Sweeping Heavy Slash/);
    assert.match(panel(g, '#skills'), /- evolved: Heavy Slash → Sweeping Heavy Slash/);
    assert.deepEqual(validateState(g.state(), content), []);
    // a reload: the same Skills
    assert.deepEqual(foldChat(structuredClone(g.chat)).state.entities.pc.sheet.skills, sheetOf(g).skills);
    await reply(g, 'It is his.');
    // the old one is no Skill of his any more; the successor strikes both wolves at once
    const old = await say(g, '*i heavy slash the wolf*', { type: 'use_skill', skill: 'warrior.heavy_slash', target: null, quote: 'i heavy slash the wolf' });
    assert.ok(old);
    await reply(g, 'Nothing.');
    N += 1;
    heal(g);
    const ids = [`mon.s${N}a`, `mon.s${N}b`];
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, ids.flatMap((id) => [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', group: `grp.s${N}`, status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: 60, hp: 60 } } } },
        { t: 'scene.entered', d: { id, band: 'ENGAGED', cover: 'none' } }, { t: 'scene.awareness', d: { id, level: 'aware' } }]));
    await say(g, '*i sweep through them*', { type: 'use_skill', skill: sid, target: ids[0], quote: 'i sweep through them' });
    const sweep = outcomeOf(g).records.find((r) => r.actor === 'pc' && r.skill === sid);
    assert.deepEqual(sweep.strikes.map((x) => x.target).sort(), ids.sort(), 'an area attack: everyone ENGAGED with him');
});

test('9C completion (3): only fights at P5 count, each evidence takes its fights for good: a decline needs two new ones, the successor its own; a fight that was no challenge notes nothing', async () => {
    const g = await hero();
    // a fight before P5 is noted, but counts for no evolution
    const early = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.equal(g.state().growth.marks['warrior.heavy_slash'][0].prof, 1);
    await reply(g, 'Over.');
    atP5(g, 'warrior.heavy_slash');
    const a = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.equal(a.d.summary.developments, undefined, 'the fight before P5 does not count');
    await reply(g, 'Over.');
    const b = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.deepEqual(b.d.summary.developments, [`evo:warrior.heavy_slash:crowd:${a.d.id}+${b.d.id}`]);
    assert.ok(!b.d.summary.developments[0].includes(early.d.id));
    const offer = skillOffers(g.state())[0];
    await reply(g, 'Over.');
    await say(g, 'No. I keep my Heavy Slash as it is.', { type: 'development.decline', offer: offer.id, quote: 'I keep my Heavy Slash as it is' });
    assert.match(outcomeOf(g).actions[0], /DECLINES — Sweeping Heavy Slash: he lets this development pass; it does not come back from these fights\. Heavy Slash stays his as it is\./);
    assert.equal(evidenceOf(g.state())[b.d.summary.developments[0]].status, 'declined');
    assert.ok(sheetOf(g).skills['warrior.heavy_slash']);
    await reply(g, 'He lets it go.');
    // one new fight is not enough (a and b are spent); two are
    const c = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.equal(c.d.summary.developments, undefined);
    await reply(g, 'Over.');
    const d = await fight(g, { plan: always('warrior.heavy_slash') });
    assert.deepEqual(d.d.summary.developments, [`evo:warrior.heavy_slash:crowd:${c.d.id}+${d.d.id}`]);
    const again = skillOffers(g.state())[0];
    await reply(g, 'Over.');
    await say(g, 'I accept it.', { type: 'development.accept', offer: again.id, replace: null, quote: 'I accept it' });
    await reply(g, 'It is his.');
    // the successor at P5 counts its own fights only: one is not enough
    const e = await fight(g, { plan: always(again.skill.id) });
    assert.equal(e.d.summary.developments, undefined, 'the old Skill\'s fights are not the successor\'s');
    assert.deepEqual(validateState(g.state(), content), []);
    // a fight against a foe far below him, who never struck him, is no challenge: nothing is noted
    const h = await hero();
    atP5(h, 'warrior.heavy_slash');
    inject(h, [{ t: 'level.up', d: { id: 'pc', level: 8, free_points: 35, favored: [], xp_after: 0 } }]);
    const easy = await fight(h, { plan: always('warrior.heavy_slash'), count: 1, hp: 8 });
    assert.equal(easy.d.summary.noted, undefined);
    assert.equal(h.state().growth?.marks, undefined);
});

// ------------------------------------------------------------------------------------------------ 4 breakthroughs
test('9C completion (4): a pattern of his Basic Attack in three hard fights, and two Skills used one after the other in three, offer new techniques beside them; the Basic Attack and both Skills stay', async () => {
    const g = await hero();
    const fights = [];
    for (let i = 0; i < 3; i++) {
        fights.push(await fight(g, { plan: always('warrior.basic_attack'), hp: 30 }));
        await reply(g, 'Over.');
    }
    assert.deepEqual(fights.slice(0, 2).map((f) => f.d.summary.developments), [undefined, undefined]);
    const offer = skillOffers(g.state())[0];
    assert.deepEqual([offer.replaces, offer.skill.name, offer.development], [undefined, 'Sweeping Iron Strike', 'breakthrough']);
    await say(g, 'I accept it.', { type: 'development.accept', offer: null, replace: null, quote: 'I accept it' });
    assert.match(outcomeOf(g).actions[0], /^1\. NEW SKILL — Sweeping Iron Strike, booked by the engine/);
    assert.deepEqual([sheetOf(g).skills[offer.skill.id], !!sheetOf(g).skills['warrior.basic_attack']], [{ prof: 1, pp: 0 }, true]);
    assert.deepEqual(validateState(g.state(), content), []);
    await reply(g, 'It is his.');
    // Heavy Slash, then Guard, in three fights: Heavy Slash with the guard after the blow, beside both
    const h = await hero();
    assert.deepEqual(combination(h.state(), content, 'warrior.guard+warrior.heavy_slash'), { base: 'warrior.heavy_slash', other: 'warrior.guard', step: 'riposte' });
    for (let i = 0; i < 3; i++) {
        await fight(h, { plan: (t) => (t % 2 ? 'warrior.guard' : 'warrior.heavy_slash'), hp: 50 });
        await reply(h, 'Over.');
    }
    const combo = skillOffers(h.state()).find((d) => d.development === 'combination');
    assert.ok(combo, JSON.stringify(Object.keys(evidenceOf(h.state()))));
    assert.equal(combo.skill.name, 'Guarded Heavy Slash');
    await say(h, 'Yes, I make it mine.', { type: 'development.accept', offer: combo.id, replace: null, quote: 'I make it mine' });
    assert.ok(sheetOf(h).skills['warrior.heavy_slash'] && sheetOf(h).skills['warrior.guard'] && sheetOf(h).skills[combo.skill.id]);
    assert.deepEqual(validateState(h.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ 5 limits, aliases
test('9C completion (5): at most three developments are open at a time (Passives and Skills together), the rest waits pending; the generic pair answers both kinds, the older passive names stay valid', async () => {
    const g = await hero();
    for (const k of ['one', 'two', 'three']) inject(g, engineEvidence(g.state(), content, { key: `test.limit_${k}`, quality: 'rare', why: 'a test source', effects: [{ kind: 'stat_bonus', stat: k === 'one' ? 'DEF' : k === 'two' ? 'MDEF' : 'ATK', value: 4 }] }).events);
    atP5(g, 'warrior.heavy_slash');
    inject(g, [{ t: 'growth.evidence', d: { evidence: { key: 'evo:warrior.heavy_slash:crowd:x+y', kind: 'evolution', skill: 'warrior.heavy_slash', step: 'crowd', fights: ['x', 'y'], why: 'a test precondition', turn: 1, minute: 0 } } }]);
    await rest(g);
    assert.deepEqual([passiveOffers(g.state()).length, skillOffers(g.state()).length, developmentOffers(g.state()).length], [3, 0, 3]);
    assert.equal(evidenceOf(g.state())['evo:warrior.heavy_slash:crowd:x+y'].status, 'pending', 'waits, not lost');
    await reply(g, 'He rests.');
    // which one? several are open: the generic pair asks
    await say(g, 'I accept it.', { type: 'development.accept', offer: null, replace: null, quote: 'I accept it' });
    assert.match(outcomeOf(g).actions[0], /NOTHING TO ACCEPT — which of the offered developments/);
    await reply(g, 'He hesitates.');
    // the older name declines a Passive; the generic one accepts another
    const [p1, p2] = passiveOffers(g.state());
    await say(g, 'No, I let it pass.', { type: 'passive.decline', offer: p1.id, quote: 'I let it pass' });
    assert.match(outcomeOf(g).actions[0], /DECLINES — /);
    // the room it left takes the waiting Skill evolution in the same safe turn
    assert.equal(skillOffers(g.state()).length, 1);
    await reply(g, 'He lets it go.');
    await say(g, 'I accept the second.', { type: 'development.accept', offer: p2.id, replace: null, quote: 'I accept the second' });
    assert.match(outcomeOf(g).actions[0], /NEW PASSIVE — /);
    await reply(g, 'It settles.');
    // the older passive.accept with an offered Skill's id answers the Skill
    await say(g, 'I accept it.', { type: 'passive.accept', offer: skillOffers(g.state())[0].id, replace: null, quote: 'I accept it' });
    assert.match(outcomeOf(g).actions[0], /EVOLVED — Heavy Slash becomes Sweeping Heavy Slash/);
    assert.deepEqual(validateState(g.state(), content), []);
    // vocabulary, catalog ids and the planner's rule
    assert.equal(content.commandVocab.version, 'cmd-1.4');
    assert.ok(['development.accept', 'development.decline', 'passive.accept', 'passive.decline'].every((t) => content.commandVocab.commands.some((c) => c.type === t)));
    const ids = catalogIds(buildCatalog(g.state(), content, { known: true, c: true }));
    assert.deepEqual(ids.development_offer, developmentOffers(g.state()).map((d) => d.id));
    assert.match(plannerSystem(content.commandVocab), /A POSSIBLE PASSIVE or a POSSIBLE SKILL in the CATALOG is a development offered to him, not his yet: development\.accept/);
});

test('9C completion (6): nothing is offered or decided in a fight; a regenerate of the turn that offered books the same offer once; the Forge names it with one call', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Guard' });
    const calls = [];
    const base = g.llm;
    g.llm = async (q) => {
        if (!q.purpose.startsWith('forge')) return base(q);
        calls.push(q.purpose);
        const keys = [...JSON.stringify(q.messages).matchAll(/\\"key\\":\\"(skill:[^\\]+)\\"/g)].map((m) => m[1]);
        return JSON.stringify({ skills: keys.map((key) => ({ key, name: 'Wolfsbane Arc' })) });
    };
    atP5(g, 'warrior.heavy_slash');
    await fight(g, { plan: always('warrior.heavy_slash') });
    await reply(g, 'Over.');
    // a fight is running: no decision on it
    inject(g, [{ t: 'growth.evidence', d: { evidence: { key: 'evo:warrior.guard:layered:x+y', kind: 'evolution', skill: 'warrior.guard', step: 'layered', fights: ['x', 'y'], why: 'a test precondition', turn: 1, minute: 0 } } }]);
    let checked = false;
    await fight(g, { plan: (i) => {
        if (i === 1 && g.state().encounter) {
            assert.equal(skillOffers(g.state()).length, 0, 'never offered in a fight');
            checked = true;
        }
        return 'warrior.heavy_slash';
    } });
    assert.ok(checked, 'the check ran while the fight was on');
    const offers = skillOffers(g.state());
    assert.ok(offers.some((d) => d.skill.name === 'Wolfsbane Arc'), 'the Forge\'s name');
    assert.equal(calls.length, 1);
    // and none is decided in one
    assert.match(acceptSkill({ ...g.state(), encounter: { id: 'enc.z' } }, content, offers[0].id).line, /NO NEW SKILL — not in a fight: he decides on it once the fight is over/);
    const before = clone(g.state().decisions);
    await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: g.llm });
    assert.deepEqual(g.state().decisions, before, 'the same offers, once');
    assert.equal(calls.length, 1, 'the recorded name is reused');
    assert.deepEqual(foldChat(structuredClone(g.chat)).state.decisions, before);
});

// ------------------------------------------------------------------------------------------------ 7 lineage
test('9C completion (7): a Skill he evolved from, a chosen starter too, is not learned again from a teacher, a stone or a manual; a starter he still holds blocks nothing', async () => {
    const g = await hero('Mage', 'Arcane Bolt + Arcane Ward');
    const bolt = { fn: 'bolt', tags: ['Arcane'], aspects: [] };
    assert.equal(knownTechnique(g.state(), bolt, content), undefined, 'a starter he holds blocks nothing (9C-2a)');
    atP5(g, 'mage.arcane_bolt');
    const d = developSkill(g.state(), content, content.skills.get('mage.arcane_bolt'), 'reach', { origin: { kind: 'evolution', note: 'test' } }).def;
    const def = defineSkill(g.state(), content, d);
    inject(g, [...def.events, { t: 'skill.evolved', d: { id: 'pc', from: 'mage.arcane_bolt', to: d.id, prof: 5, pp: 0, from_name: 'Arcane Bolt', name: d.name } }]);
    assert.equal(knownTechnique(g.state(), bolt, content), d.id, 'the old starter is known: its successor stands for it');
    assert.equal(knownTechnique(g.state(), { fn: 'bolt', tags: ['Arcane'], aspects: ['Fire'] }, content), undefined, 'another technique is not');
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ 8 rare duplicate guard
test('9C completion (8): an outstanding fight like one that gave Rare evidence already (the same kind of foe, the same place) gives none again, whatever became of the first; another kind of foe or place can', async () => {
    const g = await hero('Mage', 'Arcane Bolt + Arcane Ward');
    inject(g, [{ t: 'entity.created', d: { entity: { id: 'w1', kind: 'creature', anchor: 'wolf', species: 'wolf', status: 'dead', location: g.state().scene.location } } },
        { t: 'entity.created', d: { entity: { id: 'w2', kind: 'creature', anchor: 'wolf', species: 'wolf', status: 'dead', location: g.state().scene.location } } },
        { t: 'entity.created', d: { entity: { id: 'b1', kind: 'creature', anchor: 'boar', species: 'boar', status: 'dead', location: g.state().scene.location } } }]);
    const enc = (id, foe) => ({ id, combatants: { pc: { fixed: { level: 1, max_hp: 80 }, current: {} }, [foe]: { side: 'hostile', name: foe, fixed: { level: 7 }, current: {} } }, defeated: [foe], pp: { used: { 'mage.arcane_bolt': 'x' }, trial: { start: 60, low: 20, foes: [foe], taken: { physical: 30, magical: 0 } } } });
    const first = trialEvidence(g.state(), content, enc('enc.a', 'w1'));
    assert.equal(first[0].d.evidence.status, undefined, 'the first: pending, offered next');
    inject(g, first);
    const second = trialEvidence(g.state(), content, enc('enc.b', 'w2'))[0].d.evidence;
    assert.deepEqual([second.status, second.facts.similar], ['similar', first[0].d.evidence.facts.similar]);
    assert.match(second.why, /like trial:enc\.a: the same kinds of foes in the same place/);
    inject(g, [{ t: 'growth.evidence', d: { evidence: second } }]);
    await rest(g);
    assert.equal(passiveOffers(g.state()).length, 1, 'only the first is offered');
    const third = trialEvidence(g.state(), content, enc('enc.c', 'b1'))[0].d.evidence;
    assert.notEqual(third.status, 'similar', 'another kind of foe qualifies');
});

// ------------------------------------------------------------------------------------------------ 9 deeds
test('9C completion (9): three successful checks of one core stat the engine rolled, on three features over two days, are Ordinary evidence; a feature counts once, a failure, a narrator\'s check or one day are none', async () => {
    const rec = (feature, success = true, by = 'engine', stat = 'AGI') => ({ t: 'check.recorded', d: { what: 'climb', stat, actor: 6, opposition: 6, chance: 50, roll: 20, success, claimed: success, by, feature, aim: 'cross', difficulty: 'moderate' } });
    const day = (g, n) => inject(g, [{ t: 'time.advanced', d: { minutes: 1440 * n, why: 'a test precondition' } }]);
    const g = await hero('Rogue', 'Razor Cut + Feint');
    inject(g, [rec('feat.wall'), rec('feat.wall'), rec('feat.ledge', false), rec('feat.ledge', true, 'narrator')]);
    day(g, 1);
    inject(g, [rec('feat.ledge'), rec('feat.gap', true, 'engine', 'STR')]);
    await rest(g);
    assert.equal(Object.values(evidenceOf(g.state())).filter((x) => x.kind === 'deeds').length, 0, 'two AGI features so far');
    await reply(g, 'He rests.');
    inject(g, [rec('feat.roof')]);
    await rest(g);
    const ev = Object.values(evidenceOf(g.state())).find((x) => x.kind === 'deeds');
    assert.deepEqual([ev.focus, ev.quality, ev.things], ['AGI', 'ordinary', ['feat.wall', 'feat.ledge', 'feat.roof']]);
    const offer = passiveOffers(g.state())[0];
    assert.match(offer.passive.name, /Light Footing/);
    assert.deepEqual(offer.passive.effects, [{ kind: 'core_stat_bonus', stat: 'AGI', value: content.rules.passive_design.per.ordinary.core_stat_bonus }]);
    await reply(g, 'He rests.');
    // one day only: none
    const h = await hero('Rogue', 'Razor Cut + Feint');
    inject(h, [rec('feat.a'), rec('feat.b'), rec('feat.c')]);
    await rest(h);
    assert.equal(Object.values(evidenceOf(h.state())).filter((x) => x.kind === 'deeds').length, 0);
    // a legacy campaign keeps no deeds
    const k = await hero('Mage', 'Flame Lance + Blink', legacy);
    inject(k, [rec('feat.a')]);
    assert.equal(k.state().deeds, undefined);
});

// ------------------------------------------------------------------------------------------------ 10 NPC signatures
test('9C completion (10): a trained person of Level 5 or more has one technique of their own, fixed before the sheet, the same at every meeting, never an area or a multi-strike one; a trial changes nothing real; they use it in the fight', async () => {
    const g = await hero();
    const person = (id, level, template, name = null) => inject(g, [{ t: 'entity.created', d: { entity: { id, kind: 'npc', name, descriptors: [template], traits: '', template, level, status: 'alive', location: g.state().scene.location, at: g.state().scene.at } } }]);
    person('npc.bren', 6, 'guard', 'Bren Hollis');
    person('npc.low', 4, 'guard');
    person('npc.civ', 7, 'laborer');
    const built = (id) => {
        const s = clone(g.state());
        const events = [];
        materialise(s, content, { int: () => 1, n: 0, seed: 1 }, (e) => { applyEvent(s, e); events.push(e); }, id);
        return { s, events, sheet: s.entities[id].sheet };
    };
    const bren = built('npc.bren');
    assert.deepEqual(bren.events.map((e) => e.t), ['skill.defined', 'entity.sheet_set']);
    const sig = bren.s.skill_defs[bren.sheet.generated.signature];
    assert.match(sig.name, /^Bren's /);
    assert.deepEqual([sig.rank, sig.complexity, sig.origin.kind, bren.sheet.skills[sig.id]], ['F', 2, 'signature', { prof: 1, pp: 0 }]);
    assert.deepEqual(built('npc.bren').s.skill_defs, bren.s.skill_defs, 'deterministic: the same technique again');
    assert.deepEqual(built('npc.low').events.map((e) => e.t), ['entity.sheet_set'], 'below Level 5: none');
    assert.equal(built('npc.civ').sheet.generated.signature, undefined, 'untrained: none');
    assert.deepEqual([Object.keys(g.state().skill_defs || {}).length, !!g.state().entities['npc.bren'].sheet], [0, false], 'the trial on a copy changed nothing real');
    // never an area or a strike that splits, never a heal, restore or step, for any starter of any class
    for (const cls of ['warrior', 'mage', 'rogue']) for (const sid of content.classes.get(cls).skill_pool) {
        for (const step of signatureSteps(content.skills.get(sid))) assert.ok(!['crowd'].includes(step));
    }
    for (let i = 0; i < 30; i++) {
        const sheet = { generated: { starters: ['rogue.evasive_step', 'rogue.feint', 'warrior.charge', 'mage.arcane_bolt', 'mage.arcane_ward'].slice(i % 3, (i % 3) + 2) } };
        const def = signatureSkill({ meta: { ruleset: 2 }, rng: { seed: i }, skill_defs: {}, passive_defs: {}, decisions: [] }, content, { id: `npc.n${i}`, name: null }, sheet);
        if (!def) continue;
        const kinds = def.effects.map((e) => e.kind);
        assert.ok(!kinds.some((k) => ['area', 'heal', 'restore', 'reposition'].includes(k)) && (def.attack?.strikes ?? 1) === 1, JSON.stringify(def));
    }
    // a real fight: the engine books the signature once with the sheet and Bren uses it; a later meeting builds nothing
    inject(g, [{ t: 'level.up', d: { id: 'pc', level: 8, free_points: 35, favored: [], xp_after: 0 } }, { t: 'stat.assigned', d: { id: 'pc', stat: 'VIT', amount: 35 } }]);
    heal(g);
    inject(g, [{ t: 'scene.entered', d: { id: 'npc.bren', band: 'ENGAGED', cover: 'none' } }, { t: 'scene.awareness', d: { id: 'npc.bren', level: 'aware' } }]);
    await say(g, '*i heavy slash the guard*', { type: 'use_skill', skill: 'warrior.heavy_slash', target: 'npc.bren', quote: 'i heavy slash the guard' });
    const id = g.state().entities['npc.bren'].sheet.generated.signature;
    assert.equal(id, sig.id);
    const used = outcomeOf(g).records.filter((r) => r.actor === 'npc.bren' && r.skill === id);
    assert.ok(used.length >= 1, JSON.stringify(outcomeOf(g).records.map((r) => [r.actor, r.kind, r.skill])));
    assert.equal(lastUser(g).events.filter((e) => e.t === 'skill.defined').length, 1);
    assert.deepEqual(validateState(g.state(), content), []);
    const again = clone(g.state());
    const more = [];
    materialise(again, content, { int: () => 1, n: 0, seed: 1 }, (e) => more.push(e), 'npc.bren');
    assert.deepEqual(more, [], 'a later meeting reads the sheet');
});

// ------------------------------------------------------------------------------------------------ 11 legacy
test('9C completion (11): a legacy campaign notes nothing, offers nothing, gives no person a signature', async () => {
    const g = await hero('Mage', 'Flame Lance + Blink', legacy);
    assert.ok((g.state().meta.ruleset ?? 1) < 2);
    inject(g, [{ t: 'entity.created', d: { entity: { id: 'npc.vet', kind: 'npc', name: 'Old Vet', descriptors: ['guard'], traits: '', template: 'guard', level: 9, status: 'alive', location: g.state().scene.location, at: g.state().scene.at } } }]);
    const s = clone(g.state());
    const events = [];
    materialise(s, legacy, { int: () => 1, n: 0, seed: 1 }, (e) => { applyEvent(s, e); events.push(e); }, 'npc.vet');
    assert.deepEqual(events.map((e) => e.t), ['entity.sheet_set']);
    assert.equal(g.state().growth, undefined);
});
