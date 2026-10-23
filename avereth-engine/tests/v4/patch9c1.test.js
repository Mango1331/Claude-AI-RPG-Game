// Patch 9C-1 (docs/PATCH9C1_SKILL_ACQUISITION_TRAINING.md): deterministic Skill acquisition and training under ruleset
// 2. A teacher present, competent and committed; lessons booked by the engine; Learning Progress per target and game
// day; fights that qualify; the shared finalization after a regular planned turn; practice of a known Skill. The
// campaigns are played through the product's host path with a scripted planner (tests/v4/patch8_lib.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, loadProductContent } from '../helpers.js';
import { campaign, say, inject, outcomeOf, lastUser } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { humanSheet, scaleCreature } from '../../src/npcgen.js';
import { npcTemplate } from '../../src/content.js';
import { applyEvent } from '../../src/state.js';
import { clone } from '../../src/util.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { turnPanel } from '../../src/display.js';
import { skillDefErrors } from '../../src/skills.js';
import { composeSkill, composerFunctions } from '../../src/skill_composer.js';
import { dayParts, finalizeGrowth, teacherTags, learningActivity } from '../../src/v4/growth.js';
import { parsePlan, planContext, withContentSkills } from '../../src/v4/planner.js';
import { buildCatalog } from '../../src/v4/catalog.js';
import { eventKind, STATE_KINDS } from '../../src/v4/ownership.js';

const content = await loadProductContent();
const legacy = await loadContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, ...more });
const words = (t) => t.replace(/\*/g, '').trim();
/** A lesson or a practice he takes now, as the planner reads it. */
const train = (g, text, args) => say(g, text, ACT(args.kind || 'train', { quote: words(text), ...args, kind: args.kind || 'train' }));
const reply = (g, prose = 'Time passes.') => g.reply(prose, { expected: {}, deltas: [] });
const goalOf = (g, id = 'learn.1') => g.state().growth?.goals?.[id];
const sheetOf = (g) => g.state().entities.pc.sheet;
const clockOf = (g) => g.state().clock.minute;
const resolution = (g) => outcomeOf(g)?.resolutions?.find((r) => r.type === 'activity');

/** A person of the story here with him: their template (and a sheet when given), a training service or a promise. */
function person(g, id, tpl, { name = 'Mira', cls = null, sheet = true, consent = 'service', present = true } = {}) {
    const s = g.state();
    const sh = sheet ? humanSheet(npcTemplate(content, 2, tpl), cls ? { class: cls } : {}, content) : undefined;
    const events = [{ t: 'entity.created', d: { entity: { id, kind: 'npc', name, descriptors: [tpl.replace(/_/g, ' ')], status: 'alive', location: s.scene.location, at: s.scene.at, template: tpl, ...(sh ? { sheet: sh } : {}) } } }];
    if (present) events.push({ t: 'scene.entered', d: { id, band: 'SHORT', cover: 'none' } });
    if (consent === 'service') events.push({ t: 'service.granted', d: { service: 'training', what: 'lessons', by: id, at: s.scene.at, turn: s.turn } });
    if (consent === 'fact') events.push({ t: 'fact.asserted', d: { fact: { id: `f.${id}.teaches`, s: id, p: 'teaches', o: 'Alaric', since: { turn: s.turn, minute: s.clock.minute }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'narration' } } } });
    inject(g, events);
}
function wolf(g, id = 'mon.wolf', { hp = 300, band = 'MEDIUM', level = 1 } = {}) {
    const p = scaleCreature(content.anchors.get('wolf'), level, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: hp, hp } } } },
        { t: 'scene.entered', d: { id, band, cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]);
}
async function sleepTillMorning(g) {
    await say(g, '*i sleep until morning*', ACT('sleep', { until: 'morning', quote: 'i sleep until morning' }));
    await reply(g, 'Night passes.');
}
/** A learning goal as a session would have opened it (a test's precondition, not play). */
function openGoal(g, { lp = 0, fn = 'bolt', tags = ['Arcane'], aspects = ['Fire'], who = 'npc.mira', name = 'Mira', id = 'learn.1', n = 1 } = {}) {
    const goal = { id, n, status: 'active', target: { fn, tags, aspects }, source: { kind: 'teacher', who, name, basis: 'service', key: `svc:test:${id}`, turn: 1, minute: 540 }, lp: 0, need: 100, opened: { turn: 1, minute: 540 }, days: {}, fights: [] };
    inject(g, [{ t: 'growth.opened', d: { goal } }, ...(lp ? [{ t: 'growth.progress', d: { goal: id, lp, total: lp, need: 100 } }] : [])]);
}

// ------------------------------------------------------------------------------------------------ A: an offensive Skill
test('9C-1 A: a competent teacher who sold him lessons, two days of booked lessons and a new offensive Skill he then uses in a fight', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    const t0 = clockOf(g);
    await train(g, '*i train with Mira for two hours on the fire bolt she shows me*', { what: 'the fire bolt', minutes: 120, learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] });
    assert.equal(resolution(g).status, 'resolved');
    assert.equal(clockOf(g), t0 + 120, 'the lesson\'s time is the engine\'s');
    let goal = goalOf(g);
    assert.deepEqual([goal.target, goal.source.who, goal.source.basis, goal.lp, goal.need, goal.status], [{ fn: 'bolt', tags: ['Arcane'], aspects: ['Fire'] }, 'npc.mira', 'service', 60, 100, 'active'], 'min(40, 20 LP/h × 2 h) × Mage Arcane 1.5 = 60');
    assert.match(outcomeOf(g).actions[0], /LEARNS — Fire bolt \(Arcane\) with Mira for 120 minutes.*60\/100.*no new Skill/);
    assert.match(runCommands(g.state(), content, '#skills').panels.join('\n'), /LEARNING:\n- learn\.1: Fire bolt \(Arcane\) from Mira · 60\/100 LP/);
    assert.equal(sheetOf(g).skills['dyn.ember_bolt'], undefined, 'no Skill before the learning is complete');
    await reply(g, 'She shows him the shape of it.');
    // the same day: its claim is spent; the time passes, nothing more is credited
    await train(g, '*i keep training with Mira for two more hours*', { minutes: 120, learn: 'learn.1', teacher: 'npc.mira' });
    assert.equal(goalOf(g).lp, 60);
    assert.match(outcomeOf(g).engine_lines.join('\n'), /\+0 LP → 60\/100 \(today's learning is used up\)/);
    await reply(g);
    await sleepTillMorning(g);
    const r = await train(g, '*i train with Mira for two hours again*', { minutes: 120, learn: 'learn.1', teacher: 'npc.mira' });
    const o = outcomeOf(g);
    assert.equal(goalOf(g), undefined, 'the goal is closed');
    assert.deepEqual(o.learned.map((l) => [l.skill, l.name, l.teacher]), [['dyn.ember_bolt', 'Ember Bolt', 'Mira']]);
    assert.deepEqual(sheetOf(g).skills['dyn.ember_bolt'], { prof: 1, pp: 0 });
    const def = g.state().skill_defs['dyn.ember_bolt'];
    assert.deepEqual([def.category, def.rank, def.complexity, def.tags, def.aspects, def.cost, def.attack.base, def.attack.scaling.map((x) => [x.stat, x.coef]), def.range.band, def.origin.kind], ['Offensive', 'F', 1, ['Arcane'], ['Fire'], { resource: 'mp', amount: 7 }, 10, [['INT', 1.5]], 'MEDIUM', 'teacher']);
    const types = lastUser(g).events.map((e) => e.t);
    assert.deepEqual(types.slice(types.indexOf('skill.defined')), ['skill.defined', 'skill.learned', 'growth.closed', 'outcome.recorded'], 'in the record, before the outcome that names it');
    assert.match(r.context.text, /NEW SKILL — booked by the engine in this turn: Alaric now knows Ember Bolt/);
    assert.match(String(turnPanel(g.state(), content)), /NEW SKILL — Ember Bolt \(Offensive · 7 MP\) · learned from Mira/);
    assert.deepEqual(g.state().growth.done.map((d) => [d.id, d.skill]), [['learn.1', 'dyn.ember_bolt']]);
    assert.deepEqual(validateState(g.state(), content), []);
    await reply(g, 'It takes hold.');
    // he uses it: an ordinary Skill of his in a fight
    wolf(g);
    await say(g, '*i hurl an Ember Bolt at the wolf*', { type: 'use_skill', skill: 'dyn.ember_bolt', target: 'mon.wolf', quote: 'i hurl an Ember Bolt at the wolf' });
    const mine = outcomeOf(g).records.filter((x) => x.actor === 'pc');
    assert.deepEqual(mine.map((x) => [x.kind, x.skill, x.cost?.resource, x.cost?.amount]), [['attack', 'dyn.ember_bolt', 'mp', 7]]);
    assert.ok(mine[0].strikes[0].hp_after < mine[0].strikes[0].hp_before, "it hurts the wolf");
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ B: a defensive Skill
test('9C-1 B: a non-offensive technique from a guard who promised to teach him (a fact): Steady Guard, then used in a fight', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Charge' });
    person(g, 'npc.brannoc', 'guard', { name: 'Brannoc', cls: 'warrior', consent: 'fact' });
    assert.ok(['Defense', 'Martial'].every((t) => teacherTags(g.state(), content, 'npc.brannoc').includes(t)), 'a trained Warrior teaches what his class favours');
    await train(g, '*i drill the guard stance with Brannoc for three hours*', { minutes: 180, learn: 'guard', teacher: 'npc.brannoc' });
    assert.deepEqual([goalOf(g).target.tags, goalOf(g).source.basis, goalOf(g).lp], [['Defense'], 'fact', 50], 'the day\'s cap 40 × Warrior Defense 1.25 = 50');
    await reply(g);
    await sleepTillMorning(g);
    await train(g, '*i drill the stance with Brannoc for three more hours*', { minutes: 180, learn: 'learn.1', teacher: 'npc.brannoc' });
    const l = outcomeOf(g).learned?.[0];
    assert.equal(l?.name, 'Steady Guard', JSON.stringify(outcomeOf(g)));
    const def = g.state().skill_defs[l.skill];
    assert.deepEqual([def.category, def.target, def.cost, def.effects], ['Defensive', 'self', { resource: 'sta', amount: 5 }, [{ kind: 'temp_def', base: 4, coef: 0.5, floor: true, until: 'own_next_turn', stat: 'VIT' }]]);
    await reply(g);
    wolf(g, 'mon.wolf', { band: 'ENGAGED' });
    await say(g, '*i slash at the wolf*', { type: 'use_skill', skill: null, target: 'mon.wolf', quote: 'i slash at the wolf' });
    assert.ok(g.state().encounter, 'the fight runs');
    await reply(g, 'The wolf snarls.');
    await say(g, '*i settle into my steady guard*', { type: 'use_skill', skill: l.skill, target: null, quote: 'i settle into my steady guard' });
    const mine = (outcomeOf(g).records || []).filter((x) => x.actor === 'pc');
    assert.equal(mine[0]?.skill, l.skill, JSON.stringify(outcomeOf(g)).slice(0, 400));
    assert.match(mine[0].effects.join(' '), /DEF \+\d+ until the start of Alaric's next turn/);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ C: practice
test('9C-1 C: practising a Skill he knows gives Proficiency Progress once a day after 60 minutes (split sessions too); no learning goal', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    const pp = () => sheetOf(g).skills['mage.arcane_bolt'].pp;
    await train(g, '*i practise my arcane bolt on a fence post for half an hour*', { minutes: 30, learn: 'mage.arcane_bolt' });
    assert.equal(pp(), 0, '30 minutes: not yet');
    await reply(g);
    await train(g, '*i practise the arcane bolt for another half hour*', { minutes: 30, learn: 'mage.arcane_bolt' });
    assert.equal(pp(), 18, '60 minutes that day: 12 PP × Arcane 1.5');
    assert.match(outcomeOf(g).actions[0], /PRACTISES Arcane Bolt for 30 minutes.*Arcane Bolt \+18 PP/);
    await reply(g);
    await train(g, '*i practise the arcane bolt for an hour more*', { minutes: 60, learn: 'mage.arcane_bolt' });
    assert.equal(pp(), 18, 'once a day');
    await reply(g);
    await sleepTillMorning(g);
    await train(g, '*i practise the arcane bolt for an hour*', { minutes: 60, learn: 'mage.arcane_bolt' });
    assert.equal(pp(), 36, 'the next day again');
    assert.deepEqual(g.state().growth.goals, {});
    assert.ok(Object.keys(g.state().pp_keys).filter((k) => k.startsWith('train:')).length === 2);
});

// ------------------------------------------------------------------------------------------------ D: invalid sources
test('9C-1 D: a teacher not here, without training, without a commitment, without mastery, unknown, or none: nothing is booked, no time passes', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.farmer', 'commoner', { name: 'Tam', sheet: false });
    person(g, 'npc.quiet', 'hedge_mage', { name: 'Vell', cls: 'mage', consent: null });
    person(g, 'npc.sword', 'guard', { name: 'Brannoc', cls: 'warrior' });
    const cases = [
        ['npc.farmer', /Tam has no combat training to teach/],
        ['npc.quiet', /Vell has not agreed to teach him/],
        ['npc.sword', /Brannoc has no mastery of Arcane/],
        [{ new: 'a wandering wizard' }, /no known teacher is named/],
        [null, /a new technique needs a teacher here/],
    ];
    for (const [teacher, why] of cases) {
        const t0 = clockOf(g);
        await train(g, '*i train the bolt for two hours*', { minutes: 120, learn: 'bolt', teacher });
        assert.equal(resolution(g)?.status, 'refused', JSON.stringify(teacher));
        assert.match(outcomeOf(g).actions.join(' '), why);
        assert.equal(clockOf(g), t0, 'no time passes for it');
        assert.equal(g.state().growth, undefined, 'nothing is booked');
        await reply(g, 'Nothing comes of it.');
    }
    // a teacher who is not here (the planner cannot name one; the engine refuses one all the same)
    person(g, 'npc.away', 'hedge_mage', { name: 'Orla', cls: 'mage', present: false });
    const away = learningActivity(g.state(), content, { kind: 'train', learn: 'bolt', teacher: 'npc.away', tags: null, aspects: null }, 120, clockOf(g));
    assert.deepEqual([away.status, away.events], ['refused', undefined]);
    assert.match(away.line, /Orla is not here/);
    // learning without a duration is a question; nothing is booked
    person(g, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    const q = await train(g, '*i train the bolt with Mira*', { learn: 'bolt', teacher: 'npc.mira' });
    assert.equal(q.action, 'panels');
    assert.match(q.panels.join('\n'), /How long does he train\?/);
    assert.equal(g.state().growth, undefined);
    // one bought lesson opens one goal: a second technique from her needs a new commitment
    await train(g, '*i train the bolt with Mira for an hour*', { minutes: 60, learn: 'bolt', teacher: 'npc.mira' });
    assert.equal(goalOf(g).source.who, 'npc.mira');
    await reply(g);
    await train(g, '*i study a ward with Mira for an hour*', { kind: 'study', minutes: 60, learn: 'ward', teacher: 'npc.mira' });
    assert.match(outcomeOf(g).actions.join(' '), /Mira has not agreed to teach him/);
    assert.deepEqual(Object.keys(g.state().growth.goals), ['learn.1']);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ E: wishes
test('9C-1 E: a wish, a request or a question to learn is no lesson: the guard drops it; the planner validator refuses learning on another activity', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    for (const text of ['I\'d like to learn a fire bolt from you, Mira.', 'Teach me the fire bolt, please.', 'Could you teach me a fire bolt for an hour?', 'I want to learn that bolt someday.']) {
        const t0 = clockOf(g);
        await train(g, text, { minutes: 60, learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] });
        assert.ok(['wish', 'question', 'plan'].includes(lastUser(g).plan.dropped[0]?.rule), `${text}: ${JSON.stringify(lastUser(g).plan.dropped)}`);
        assert.equal(g.state().growth, undefined, text);
        assert.equal(clockOf(g), t0);
        await reply(g, 'She considers it.');
    }
    const s = g.state();
    const ctx = withContentSkills(planContext(s, content, buildCatalog(s, content, { known: true, c: true })), content, s);
    const plan = (c) => parsePlan(JSON.stringify({ commands: [{ seq: 1, ...ACT('rest', { minutes: 60 }), ...c, quote: 'i rest' }] }), content.commandVocab, ctx, 'i rest');
    assert.match(plan({ learn: 'bolt' }).errors.join(' '), /belong only to kind train or study/);
    assert.match(plan({ kind: 'train', learn: 'fireball' }).errors.join(' '), /learn must be an id from KNOWN SKILLS, an id from LEARNING, one of strike, bolt, guard, ward, mend/);
    assert.match(plan({ kind: 'train', learn: 'bolt', tags: ['Fire'] }).errors.join(' '), /tags must be of/);
    assert.deepEqual(plan({ kind: 'train', learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] }).errors, []);
    assert.deepEqual(plan({ kind: 'train', learn: 'mage.arcane_bolt' }).errors, []);
});

// ------------------------------------------------------------------------------------------------ F: time
test('9C-1 F: split sessions give what one long one gives; teacher time and own practice count apart; a session over midnight is split', async () => {
    assert.deepEqual(dayParts(1380, 120), [{ day: 0, minutes: 60 }, { day: 1, minutes: 60 }]);
    assert.deepEqual(dayParts(100, 1440 * 2), [{ day: 0, minutes: 1340 }, { day: 1, minutes: 1440 }, { day: 2, minutes: 100 }]);
    const one = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(one, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    await train(one, '*i train the fire bolt with Mira for two hours*', { minutes: 120, learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] });
    const split = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(split, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    const lp = [];
    for (let i = 0; i < 3; i++) {
        await train(split, '*i train the fire bolt with Mira for forty minutes*', { minutes: 40, learn: i ? 'learn.1' : 'bolt', teacher: 'npc.mira', aspects: i ? null : ['Fire'] });
        lp.push(goalOf(split).lp);
        await reply(split);
    }
    assert.deepEqual(lp, [20, 40, 60], 'the day\'s sum: floor(min(40, 20 × 40/60 × k) × 1.5)');
    assert.equal(goalOf(one).lp, goalOf(split).lp, 'three short lessons give what one long one gives');
    // own practice the same day, the teacher gone: counted apart, at the own rate, inside the day's cap
    inject(split, [{ t: 'scene.left', d: { id: 'npc.mira' } }]);
    await train(split, '*i practise the fire bolt on my own for an hour*', { minutes: 60, learn: 'learn.1' });
    assert.deepEqual(goalOf(split).days[0], { teacher: 120, self: 60, lp: 60 }, 'min(40, 40 + min(20, 10)) × 1.5 = 60: the teacher cap holds');
    assert.match(outcomeOf(split).engine_lines.join(' '), /on his own: 60 min, \+0 LP/);
    await reply(split);
    // over midnight: each day its own claim
    const late = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(late, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    await say(late, '*i wait for 14 hours*', ACT('wait', { minutes: 1380 - clockOf(late), quote: 'i wait for 14 hours' }));
    await reply(late);
    assert.equal(clockOf(late), 1380, '23:00 on day 1');
    await train(late, '*i train the fire bolt with Mira for two hours*', { minutes: 120, learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] });
    const gl = goalOf(late);
    assert.deepEqual([gl.days[0], gl.days[1], gl.lp], [{ teacher: 60, self: 0, lp: 30 }, { teacher: 60, self: 0, lp: 30 }, 60]);
    assert.deepEqual(lastUser(late).events.filter((e) => e.t === 'growth.progress').map((e) => [e.d.day, e.d.lp]), [[0, 30], [1, 30]]);
});

// ------------------------------------------------------------------------------------------------ G: both routes
test('9C-1 G: a fight of his disciplines adds Learning Progress; the goal it completes becomes its Skill on the fight\'s own route', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: sheetOf(g).mp } }]);
    openGoal(g, { lp: 90 });
    wolf(g, 'mon.wolf', { hp: 40, band: 'SHORT' });
    let learned = null;
    for (let i = 0; i < 12 && !learned; i++) {
        await say(g, '*i cast arcane bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf', quote: 'i cast arcane bolt at the wolf' });
        const o = outcomeOf(g);
        if (g.state().encounter) assert.equal(o.learned, undefined, 'nothing while the fight runs');
        learned = o?.learned || null;
        if (!g.state().encounter) break;
        await reply(g, 'The fight goes on.');
    }
    const o = outcomeOf(g);
    assert.equal(o.kind, 'combat');
    assert.deepEqual(o.ended?.lp, [{ goal: 'learn.1', lp: 10, total: 100, need: 100 }], 'min(need, 12 × 1.5) for the fight; once');
    assert.deepEqual(learned?.map((l) => l.name), ['Ember Bolt'], 'booked in the record of the turn that ended the fight (route v3)');
    assert.equal(lastUser(g).route, 'v3');
    assert.ok(sheetOf(g).skills['dyn.ember_bolt']);
    assert.deepEqual(validateState(g.state(), content), []);
});

test('9C-1 G: a goal made ready outside a regular turn (the reply path) becomes its Skill on his next regular turn; a panel or a failed plan books none', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    openGoal(g, { lp: 40 });
    await say(g, '*i look around*');
    await reply(g, 'The yard is quiet.');
    // as a fight the reply opened and the engine resolved would have left it (a precondition: its progress event)
    inject(g, [{ t: 'growth.progress', d: { goal: 'learn.1', fight: 'enc.reply', lp: 60, total: 100, need: 100 } }]);
    assert.equal(goalOf(g).status, 'ready');
    const p = await say(g, '#skills');
    assert.equal(p.action, 'panels');
    assert.equal(goalOf(g).status, 'ready', 'a System panel books nothing');
    assert.match(p.panels.join('\n'), /learn\.1: Fire bolt \(Arcane\) from Mira · 100\/100 LP · complete/);
    // a plan that cannot be read books nothing either
    g.chat.push({ mes: '*i stretch*', is_user: true, is_system: false, extra: {} });
    g.plans = ['not json', 'still not json'];
    const failed = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(failed.action, 'abort');
    assert.equal(goalOf(g).status, 'ready');
    g.chat.pop();
    await say(g, '*i stretch and look at the sky*');
    assert.deepEqual(outcomeOf(g).learned?.map((l) => l.name), ['Ember Bolt'], 'route v4, a turn with nothing to book');
    assert.equal(lastUser(g).route, 'v4');
    assert.equal(goalOf(g), undefined);
});

// ------------------------------------------------------------------------------------------------ H: atomic
test('9C-1 H: finalization is all or nothing on a private copy: a goal whose Skill cannot be booked stays ready with its progress and source', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    openGoal(g, { lp: 100 });
    // every name of the pair is taken (a precondition): Ember Bolt, Ember Bolt II … Ember Bolt X
    const names = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
    let s = g.state();
    const taken = [];
    for (const [i, x] of names.entries()) {
        const def = { ...composeSkill(s, content, { fn: 'strike', tags: ['Martial'], origin: { kind: 'test' } }).def, id: `dyn.taken_${i}`, name: `Ember Bolt${x}` };
        assert.deepEqual(skillDefErrors(def, content, s), []);
        const ev = { t: 'skill.defined', d: { skill: { ...def, dynamic: true } } };
        taken.push(ev);
        s = clone(s);
        applyEvent(s, ev);
    }
    inject(g, taken);
    const before = JSON.stringify(g.state());
    const f = finalizeGrowth(g.state(), content);
    assert.equal(JSON.stringify(g.state()), before, 'the state it was given is unchanged');
    assert.deepEqual([f.events, f.learned, f.failed.map((x) => x.goal)], [[], [], ['learn.1']]);
    await say(g, '*i rest a moment*');
    const o = outcomeOf(g);
    assert.equal(o.learned, undefined);
    assert.match(o.learn_failed[0].errors[0], /no free name for Ember Bolt/);
    assert.ok(!lastUser(g).events.some((e) => ['skill.defined', 'skill.learned', 'growth.closed'].includes(e.t)), 'no part of it is booked');
    assert.deepEqual([goalOf(g).status, goalOf(g).lp, goalOf(g).source.who], ['ready', 100, 'npc.mira']);
    assert.deepEqual(validateState(g.state(), content), []);
});

// ------------------------------------------------------------------------------------------------ I: names
test('9C-1 I: names and ids are unique in the campaign, against static Skills and every dynamic one (an NPC\'s later ones too); every function composes a valid definition', () => {
    const empty = { skill_defs: {} };
    for (const fn of composerFunctions(content)) {
        for (const tag of content.rules.composer.functions[fn].tags) {
            const r = composeSkill(empty, content, { fn, tags: [tag], aspects: ['Shadow'], origin: { kind: 'teacher', note: 'taught by X' } });
            assert.deepEqual([r.errors, skillDefErrors(r.def, content, empty)], [[], []], `${fn}/${tag}`);
        }
    }
    const first = composeSkill(empty, content, { fn: 'bolt', tags: ['Arcane'], aspects: ['Fire'], origin: { kind: 'teacher' } }).def;
    const s = { skill_defs: { [first.id]: { ...first, dynamic: true } } };
    const second = composeSkill(s, content, { fn: 'bolt', tags: ['Control'], aspects: ['Fire'], origin: { kind: 'teacher' } }).def;
    assert.deepEqual([first.id, first.name, second.id, second.name], ['dyn.ember_bolt', 'Ember Bolt', 'dyn.ember_bolt_ii', 'Ember Bolt II']);
    // a name some other definition took (an NPC's, defined later in play) is skipped; a free id is found for it
    const npc = { skill_defs: { 'dyn.npc_sig': { id: 'dyn.npc_sig', name: 'Runic Ward', dynamic: true }, 'dyn.runic_ward_ii': { id: 'dyn.runic_ward_ii', name: 'Odd Name', dynamic: true } } };
    const ward = composeSkill(npc, content, { fn: 'ward', tags: ['Arcane'], origin: { kind: 'teacher' } }).def;
    assert.deepEqual([ward.name, ward.id], ['Runic Ward II', 'dyn.runic_ward_ii_2']);
    assert.deepEqual(skillDefErrors(ward, content, npc), []);
    assert.match(composeSkill(empty, content, { fn: 'strike', tags: ['Arcane'], origin: { kind: 'teacher' } }).errors[0], /a strike carries Martial, Precision, Mobility, not Arcane/);
    assert.match(composeSkill(empty, content, { fn: 'fireball', origin: { kind: 'teacher' } }).errors[0], /no technique/);
});

// ------------------------------------------------------------------------------------------------ J: replay
test('9C-1 J: a regenerated reply, a reload and a replay credit nothing twice', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.mira', 'hedge_mage', { cls: 'mage' });
    await train(g, '*i train the fire bolt with Mira for two hours*', { minutes: 120, learn: 'bolt', teacher: 'npc.mira', aspects: ['Fire'] });
    const events = JSON.stringify(lastUser(g).events);
    // Regenerate the same message: the record is reused, nothing is planned or booked again
    const again = await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: async () => { throw new Error('no second planner call'); } });
    assert.equal(again.action, 'context');
    assert.equal(JSON.stringify(lastUser(g).events), events);
    assert.equal(goalOf(g).lp, 60);
    await reply(g);
    // a reload folds the stored records: the same state, field for field
    const copy = JSON.parse(JSON.stringify(g.chat));
    assert.deepEqual(foldChat(copy).state.growth, g.state().growth);
    assert.deepEqual(validateState(foldChat(copy).state, content), []);
    // a goal's records replayed onto a state that has them already are refused, not counted twice
    const s = g.state();
    assert.throws(() => applyEvent(clone(s), rec(g.chat.findLast((m) => m.is_user)).events.find((e) => e.t === 'growth.opened')), /learning goal exists/);
});

// ------------------------------------------------------------------------------------------------ K: legacy, ownership
test('9C-1 K: a legacy campaign learns nothing this way (an ordinary training); the growth events are the engine\'s alone', async () => {
    const g = await campaign(legacy, { cls: 'Mage', skills: 'Flame Lance + Blink' });
    assert.ok((g.state().meta.ruleset ?? 1) < 2);
    const t0 = clockOf(g);
    await train(g, '*i train the bolt with the old mage for two hours*', { minutes: 120, learn: 'bolt', teacher: null });
    assert.equal(resolution(g)?.status, 'resolved');
    assert.equal(clockOf(g), t0 + 120, 'an ordinary training, its time booked as before');
    assert.equal(g.state().growth, undefined);
    assert.deepEqual(Object.keys(g.state().skill_defs || {}), []);
    for (const t of ['growth.opened', 'growth.session', 'growth.progress', 'growth.closed']) assert.equal(eventKind({ t, d: {} }), 'pc.progress');
    assert.equal(STATE_KINDS['pc.progress'].engine, true);
});
