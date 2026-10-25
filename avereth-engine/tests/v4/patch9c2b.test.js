// Patch 9C-2b (docs/PATCH9C2B_STONES_MATERIALS.md): Skill Stones and learning materials as sources of the existing
// acquisition core. Campaigns are played through the product's host path with scripted planner, extractor and Forge
// answers (tests/v4/patch8_lib.js); the sources come from the story (an offer, a gift) or as the engine's own objects.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, loadProductContent, ROOT } from '../helpers.js';
import { campaign, say, inject, outcomeOf, lastUser, simpleBoard } from './patch8_lib.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { humanSheet, scaleCreature } from '../../src/npcgen.js';
import { npcTemplate } from '../../src/content.js';
import { applyEvent } from '../../src/state.js';
import { clone } from '../../src/util.js';
import { validateState } from '../../src/validate.js';
import { runCommands } from '../../src/commands.js';
import { turnPanel } from '../../src/display.js';
import { composeSkill } from '../../src/skill_composer.js';
import { itemProfile, itemTraits, sourceText } from '../../src/v4/items.js';
import { eventKind } from '../../src/v4/ownership.js';
import { guardCommands } from '../../src/v4/agency.js';
import { guardContext, buildCatalog } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';

const content = await loadProductContent();
const legacy = await loadContent();

const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, material: null, ...more });
const words = (t) => t.replace(/\*/g, '').trim();
const reply = (g, prose = 'Time passes.', deltas = []) => g.reply(prose, { expected: {}, deltas });
const sheetOf = (g) => g.state().entities.pc.sheet;
const clockOf = (g) => g.state().clock.minute;
const dyn = (g) => Object.keys(sheetOf(g).skills).filter((k) => k.startsWith('dyn.'));
const use = (g, text, object) => say(g, text, { type: 'use', object, qty: null, quote: words(text) });
const study = (g, text, args) => say(g, text, ACT(args.kind || 'study', { quote: words(text), ...args, kind: args.kind || 'study' }));
const STONE = { source: 'stone', fn: 'bolt', tags: null, aspects: ['Fire'] };
const PRIMER = { source: 'manual', fn: 'guard', tags: ['Defense'], aspects: null };

/** An object the engine itself established (a test's precondition: the profile is fixed as at any establishment). */
function thing(g, id, name, teaches, { qty = 1, holder = { entity: 'pc' }, kind = 'item', c = content } = {}) {
    inject(g, [{ t: 'object.created', d: { object: { id, name, kind, stack: qty > 1, qty, unit: null, ...itemTraits(c, { name, kind, teaches }, 0), holder, marks: [], for_quests: [], source: { turn: 1, how: 'loot' } } } }]);
}
function person(g, id, name, tpl = 'commoner') {
    const s = g.state();
    inject(g, [
        { t: 'entity.created', d: { entity: { id, kind: 'npc', name, descriptors: [tpl], status: 'alive', location: s.scene.location, at: s.scene.at, template: tpl } } },
        { t: 'scene.entered', d: { id, band: 'SHORT', cover: 'none' } },
    ]);
}
function wolf(g, id = 'mon.wolf', { hp = 300, band = 'MEDIUM' } = {}) {
    const p = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...p, max_hp: hp, hp } } } },
        { t: 'scene.entered', d: { id, band, cover: 'none' } },
        { t: 'scene.awareness', d: { id, level: 'aware' } },
    ]);
}
function forge(g, answer) {
    const base = g.llm;
    const calls = [];
    g.llm = async (q) => (q.purpose.startsWith('forge') ? (calls.push(q), answer(q, calls.length)) : base(q));
    return calls;
}
const named = (q, name, flavor = 'Embers swirl around the hand that wakes it.') => JSON.stringify({ skills: JSON.parse(q.messages[1].content).drafts.map((d) => ({ key: d.key, name, flavor })) });
async function sleepTillMorning(g) {
    await say(g, '*i sleep until morning*', ACT('sleep', { until: 'morning', quote: 'i sleep until morning' }));
    await reply(g, 'Night passes.');
}

// ------------------------------------------------------------------------------------------------ profiles
test('9C-2b: a source profile is fixed only for a recognisable Skill Stone or manual with what the story says it teaches; nothing missing is filled in', () => {
    const p = (name, teaches, kind = 'item') => itemProfile(content, { name, kind, teaches });
    assert.deepEqual(p('Skill Stone of Embers', STONE), { kind: 'skill_source', source: 'stone', title: 'Skill Stone', rank: 'F', fn: 'bolt', tags: [], aspects: ['Fire'], value_cp: 400 });
    assert.equal(sourceText(p('Skill Stone of Embers', STONE)), 'Skill Stone · F · holds Fire bolt');
    assert.deepEqual(p('Primer of the Steady Guard', { ...PRIMER, tags: ['Defense', 'Arcane'] }, 'document').tags, ['Defense'], 'only what the technique supports');
    assert.equal(p('glowing pebble', STONE), null, 'not named as a Skill Stone');
    assert.equal(p('Return Stone', null), null);
    assert.equal(p('old storybook', null, 'document'), null, 'a book that teaches nothing the story said');
    assert.equal(p('Skill Stone', null), null, 'a stone with no teaching established is an ordinary thing');
    assert.equal(p('skill stone', { source: 'stone', fn: null }).fn, null, 'a technique the story never named stays unnamed');
    assert.equal(p('skill stone', { source: 'stone', fn: 'fireball' }).fn, null, 'no function the composer lacks');
    assert.equal(p('E-Rank Skill Stone', { source: 'stone', fn: 'strike' }).rank, 'E');
});

// ------------------------------------------------------------------------------------------------ 1. stone
test('9C-2b (1): a Skill Stone bought from a seller of the story yields exactly one usable Skill and is spent exactly once', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.tobin', 'Tobin');
    inject(g, [{ t: 'coin.changed', d: { id: 'pc', value: 500, delta: 450, why: 'test precondition' } }]);
    await say(g, '*i ask Tobin what the glowing stone on his shelf is*');
    await reply(g, '"A Skill Stone, holds a little fire bolt. Forty silver," Tobin says.', [{ seq: 1, type: 'offer', seller: 'npc.tobin', lines: [{ what: 'Skill Stone of Embers', kind: 'goods', service: null, qty: 1, price_cp: 400, said: 'Forty silver', effect: null, teaches: STONE }] }]);
    const offer = Object.values(g.state().offers).find((o) => o.seller === 'npc.tobin' && o.status === 'open');
    assert.deepEqual(offer.lines[0].profile, itemProfile(content, { name: 'Skill Stone of Embers', teaches: STONE }), 'fixed with the offer');
    await say(g, '*i buy the skill stone*', { type: 'offer.accept', offer: offer.id, lines: null, qty: null, quote: 'i buy the skill stone' });
    await reply(g, 'He wraps it in cloth.');
    const stone = Object.values(g.state().objects).find((o) => o.name === 'Skill Stone of Embers');
    assert.equal(stone.holder.entity, 'pc');
    assert.equal(stone.profile.fn, 'bolt');
    assert.match(runCommands(g.state(), content, '#bag').panels.join('\n'), /Skill Stone of Embers.*Skill Stone · F · holds Fire bolt/);
    assert.match(catalogText(buildCatalog(g.state(), content, { known: true, c: true })), /Skill Stone of Embers, held by Alaric, Skill Stone · F · holds Fire bolt/);
    const calls = forge(g, (q) => named(q, 'Ember Seed'));
    const t0 = clockOf(g);
    const r = await use(g, '*i press the skill stone to my brow and wake it*', stone.id);
    const o = outcomeOf(g);
    assert.equal(calls.length, 1, 'the same Forge as for a teacher');
    assert.deepEqual(o.learned.map((l) => [l.name, l.source]), [['Ember Seed', 'stone']]);
    assert.match(o.actions[0], /ACTIVATES — Skill Stone of Embers/);
    const types = lastUser(g).events.map((e) => e.t);
    assert.deepEqual(types.slice(types.indexOf('growth.opened')), ['growth.opened', 'skill.defined', 'skill.learned', 'growth.closed', 'object.consumed', 'outcome.recorded'], 'one atomic booking before the outcome');
    const s = g.state();
    assert.deepEqual(s.objects[stone.id].holder, { consumed: 'pc' }, 'spent');
    assert.equal(sheetOf(g).inventory[stone.id], undefined);
    const def = Object.values(s.skill_defs)[0];
    assert.deepEqual([def.name, def.category, def.tags, def.aspects, def.cost, def.origin.kind, def.flavor], ['Ember Seed', 'Offensive', ['Arcane'], ['Fire'], { resource: 'mp', amount: 7 }, 'stone', 'Embers swirl around the hand that wakes it.']);
    assert.match(def.effect_text, /drawn from a Skill Stone \(Skill Stone of Embers\)/, 'the engine text, not the Forge prose');
    assert.equal(clockOf(g), t0, 'no training time for a stone');
    assert.deepEqual(s.growth.goals, {});
    assert.deepEqual(s.growth.done.map((d) => [d.skill, d.key]), [[def.id, `stone:${stone.id}:t${s.turn}`]]);
    assert.match(r.context.text, /NEW SKILL — booked by the engine in this turn: Alaric now knows Ember Seed .*drawn from Skill Stone of Embers/);
    assert.match(String(turnPanel(s, content)), /NEW SKILL — Ember Seed \(Offensive · 7 MP\) · drawn from Skill Stone of Embers/);
    assert.deepEqual(validateState(s, content), []);
    await reply(g, 'Warmth runs down his arm.');
    // used now: an ordinary Skill of his
    wolf(g);
    await say(g, '*i cast Ember Seed at the wolf*', { type: 'use_skill', skill: def.id, target: 'mon.wolf', quote: 'i cast Ember Seed at the wolf' });
    const mine = outcomeOf(g).records.filter((x) => x.actor === 'pc');
    assert.deepEqual(mine.map((x) => [x.kind, x.skill, x.cost.amount]), [['attack', def.id, 7]]);
    assert.ok(mine[0].strikes[0].hp_after < mine[0].strikes[0].hp_before);
});

// ------------------------------------------------------------------------------------------------ 2./3. material
test('9C-2b (2, 3): a primer given in the story opens a goal; study over days earns LP within the daily cap; the primer stays; the guard is learned and used', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Charge' });
    person(g, 'npc.old', 'Old Hesk');
    await say(g, '*i help the old man stack his crates*');
    await reply(g, 'Old Hesk presses a worn primer into his hands. "The steady guard, all of it in there. Keep it."', [
        { seq: 1, type: 'object.new', name: 'Primer of the Steady Guard', kind: 'document', effect: null, qty: 1, unit: null, holder: 'npc.old', for_quest: null, in: null, teaches: PRIMER },
        { seq: 2, type: 'object.move', object: { new: 'Primer of the Steady Guard' }, qty: null, to: 'pc' },
    ]);
    const primer = Object.values(g.state().objects).find((o) => o.name === 'Primer of the Steady Guard');
    assert.equal(primer?.holder?.entity, 'pc', JSON.stringify(primer));
    assert.deepEqual([primer.profile.source, primer.profile.fn, primer.profile.tags], ['manual', 'guard', ['Defense']]);
    // reading is no study
    await use(g, '*i leaf through the primer*', primer.id);
    assert.match(outcomeOf(g).actions[0], /READS — Primer of the Steady Guard.*teaches him nothing by itself/);
    assert.equal(g.state().growth, undefined);
    await reply(g);
    const lp = [];
    for (let day = 0; day < 4; day++) {
        await study(g, '*i study the primer for two hours*', { minutes: 120, learn: day ? 'learn.1' : 'guard', material: primer.id });
        lp.push(g.state().growth.goals['learn.1']?.lp ?? 'done');
        if (day === 0) {
            const goal = g.state().growth.goals['learn.1'];
            assert.deepEqual([goal.source.kind, goal.source.object, goal.target], ['material', primer.id, { fn: 'guard', tags: ['Defense'], aspects: [] }]);
            assert.match(outcomeOf(g).engine_lines.join(' '), /LEARNING — guard \(Defense\) from Primer of the Steady Guard: 120 min, \+25 LP → 25\/100/);
            assert.match(runCommands(g.state(), content, '#skills').panels.join('\n'), /learn\.1: guard \(Defense\) from Primer of the Steady Guard · 25\/100 LP/);
            await reply(g);
            await study(g, '*i keep studying the primer for two more hours*', { minutes: 120, learn: 'learn.1', material: primer.id });
            assert.equal(g.state().growth.goals['learn.1'].lp, 25, 'the day\'s claim is spent');
        }
        await reply(g);
        if (day < 3) await sleepTillMorning(g);
    }
    assert.deepEqual(lp, [25, 50, 75, 'done'], 'own study: min(20, 10/h × 2 h) × Warrior Defense 1.25 a day');
    const learned = outcomeOf(g) && g.state().growth.done[0];
    assert.equal(g.state().objects[primer.id].holder.entity, 'pc', 'the primer is kept');
    const def = g.state().skill_defs[learned.skill];
    assert.deepEqual([def.category, def.origin.kind, def.effects[0].kind], ['Defensive', 'material', 'temp_def']);
    // non-offensive and in use
    wolf(g, 'mon.wolf', { band: 'ENGAGED' });
    await say(g, '*i slash at the wolf*', { type: 'use_skill', skill: null, target: 'mon.wolf', quote: 'i slash at the wolf' });
    await reply(g, 'The wolf snarls.');
    await say(g, '*i set my steady guard*', { type: 'use_skill', skill: def.id, target: null, quote: 'i set my steady guard' });
    const mine = outcomeOf(g).records.filter((x) => x.actor === 'pc');
    assert.equal(mine[0]?.skill, def.id);
    assert.match(mine[0].effects.join(' '), /DEF \+\d+/);
    assert.deepEqual(validateState(g.state(), content), []);
});

test('9C-2b (2): later study needs the bound primer in his hands; without a teacher a new technique needs a source', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Charge' });
    thing(g, 'obj.primer', 'Primer of the Steady Guard', PRIMER, { kind: 'document' });
    thing(g, 'obj.story', 'an old storybook', null, { kind: 'document' });
    await study(g, '*i study the primer for an hour*', { minutes: 60, learn: 'guard', material: null });
    assert.equal(g.state().growth.goals['learn.1'].source.object, 'obj.primer', 'the one manual he holds that teaches it');
    await reply(g);
    const t0 = clockOf(g);
    await study(g, '*i study the storybook for an hour*', { minutes: 60, learn: 'strike', material: 'obj.story' });
    assert.match(outcomeOf(g).actions.join(' '), /an old storybook is no manual that teaches a technique/);
    assert.equal(clockOf(g), t0);
    await reply(g);
    await study(g, '*i study a strike on my own for an hour*', { kind: 'train', minutes: 60, learn: 'strike' });
    assert.match(outcomeOf(g).actions.join(' '), /a new technique needs a source/);
    await reply(g);
    inject(g, [{ t: 'object.moved', d: { id: 'obj.primer', to: { loc: g.state().scene.at } } }]);
    await study(g, '*i go on studying the guard for an hour*', { minutes: 60, learn: 'learn.1' });
    assert.match(outcomeOf(g).actions.join(' '), /from Primer of the Steady Guard, and he does not hold it now/);
    assert.equal(clockOf(g), t0, 'nothing booked');
});

// ------------------------------------------------------------------------------------------------ 4./5. refusals, atomic
test('9C-2b (4): no Skill without possession, a named technique, the Rank, outside a fight; a known technique not twice; the stack keeps its second stone', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.tobin', 'Tobin');
    thing(g, 'obj.his', 'Skill Stone of Embers', STONE, { holder: { entity: 'npc.tobin' } });
    thing(g, 'obj.vague', 'Skill Stone', { source: 'stone', fn: null });
    thing(g, 'obj.high', 'E-Rank Skill Stone', { source: 'stone', fn: 'strike', tags: ['Martial'] });
    thing(g, 'obj.pair', 'Skill Stone of Embers', STONE, { qty: 2 });
    const refused = async (id, why) => {
        await use(g, '*i wake the skill stone*', id);
        assert.match(outcomeOf(g).actions.join(' '), why, id);
        assert.equal(lastUser(g).events.some((e) => ['skill.defined', 'object.consumed', 'growth.opened'].includes(e.t)), false);
        await reply(g);
    };
    // a stone in someone else's hands: the agency guard takes no use of it (nothing he holds)
    await use(g, '*i wake the skill stone*', 'obj.his');
    assert.deepEqual(lastUser(g).plan.dropped.map((x) => x.rule), ['not_held']);
    assert.equal(lastUser(g).events.some((e) => ['skill.defined', 'object.consumed'].includes(e.t)), false);
    await reply(g);
    await refused('obj.vague', /what technique it holds was never established/);
    await refused('obj.high', /E-Rank item; Alaric's Power Rank is F/);
    await use(g, '*i wake the skill stone*', 'obj.pair');
    assert.equal(outcomeOf(g).learned.length, 1);
    assert.equal(g.state().objects['obj.pair'].qty, 1, 'one unit spent');
    await reply(g);
    await refused('obj.pair', /he knows this technique \(Fire bolt \(Arcane\)\) already/);
    assert.equal(g.state().objects['obj.pair'].qty, 1, 'the second stays');
    assert.equal(dyn(g).length, 1);
    // in a fight: refused, nothing spent
    thing(g, 'obj.ward', 'Skill Stone of Warding', { source: 'stone', fn: 'ward', tags: ['Arcane'], aspects: null });
    wolf(g);
    await say(g, '*i shoot an arcane bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf', quote: 'i shoot an arcane bolt at the wolf' });
    assert.ok(g.state().encounter);
    const s = clone(g.state());
    const { stoneActivation } = await import('../../src/v4/growth.js');
    assert.match(stoneActivation(s, content, s.objects['obj.ward']).refuse, /not in a fight/);
    // a wish is no activation (the guard)
    const ctx = guardContext(g.state(), content);
    const wish = guardCommands('I\'d like to use the skill stone of warding later.', [{ seq: 1, type: 'use', object: 'obj.ward', qty: null, quote: 'I\'d like to use the skill stone of warding later.' }], ctx);
    assert.deepEqual(wish.dropped.map((x) => x.rule), ['wish']);
});

test('9C-2b (5): an activation the engine cannot book (no free name) books nothing: the stone stays whole, the state unchanged, the narrator is told', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    thing(g, 'obj.stone', 'Skill Stone of Embers', STONE);
    let s = g.state();
    const taken = [];
    for (const [i, x] of ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'].entries()) {
        const def = { ...composeSkill(s, content, { fn: 'strike', tags: ['Martial'], origin: { kind: 'test' } }).def, id: `dyn.taken_${i}`, name: `Ember Bolt${x}` };
        const ev = { t: 'skill.defined', d: { skill: { ...def, dynamic: true } } };
        taken.push(ev);
        s = clone(s);
        applyEvent(s, ev);
    }
    inject(g, taken);
    const before = JSON.stringify({ objects: g.state().objects, growth: g.state().growth ?? null, skills: sheetOf(g).skills });
    const r = await use(g, '*i wake the skill stone*', 'obj.stone');
    const o = outcomeOf(g);
    assert.equal(o.learned, undefined);
    assert.match(o.learn_failed[0].errors[0], /no free name for Ember Bolt/);
    assert.equal(lastUser(g).events.some((e) => ['growth.opened', 'skill.learned', 'object.consumed'].includes(e.t)), false);
    assert.equal(JSON.stringify({ objects: g.state().objects, growth: g.state().growth ?? null, skills: sheetOf(g).skills }), before);
    assert.match(r.context.text, /NOT LEARNED — Skill Stone of Embers: no free name for Ember Bolt.*The stone stays whole and his/);
    assert.match(String(turnPanel(g.state(), content)), /NOT LEARNED — Skill Stone of Embers/);
});

// ------------------------------------------------------------------------------------------------ 6. Forge, retry, replay
test('9C-2b (6): Forge fallback, regenerate, edit and replay give one Skill and spend the stone once', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    thing(g, 'obj.stone', 'Skill Stone of Embers', STONE);
    const calls = forge(g, () => null);
    await use(g, '*i wake the skill stone*', 'obj.stone');
    assert.equal(calls.length, 2, 'one request and one repair, then the composer fallback');
    assert.deepEqual(outcomeOf(g).learned.map((l) => l.name), ['Ember Bolt']);
    assert.equal(lastUser(g).forge.entries[outcomeOf(g).learned[0].key].fallback, true);
    const events = JSON.stringify(lastUser(g).events);
    // Regenerate: the record is reused, no planner and no Forge call
    const again = await prepareGenerationAsync(g.chat, content, { type: 'regenerate', settings: { planner: true }, llm: async () => { throw new Error('no call'); } });
    assert.equal(again.action, 'context');
    assert.equal(JSON.stringify(lastUser(g).events), events);
    // Edit: the message is read again from the state before it; still one Skill, one spent stone
    const u = g.chat.findLastIndex((m) => m.is_user);
    g.chat[u].mes = '*i press the skill stone to my brow and wake it*';
    g.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'use', object: 'obj.stone', qty: null, quote: 'i press the skill stone to my brow and wake it' }] })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(dyn(g).length, 1);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'object.consumed').length, 1);
    await reply(g);
    // reload and replay: the same state; the stone's booking cannot be replayed onto a state that has it
    const copy = JSON.parse(JSON.stringify(g.chat));
    assert.deepEqual(foldChat(copy).state.objects, g.state().objects);
    assert.deepEqual(foldChat(copy).state.skill_defs, g.state().skill_defs);
    assert.throws(() => applyEvent(clone(g.state()), lastUser(g).events.find((e) => e.t === 'skill.defined')), /skill defined twice/);
    assert.deepEqual(validateState(g.state(), content), []);
});

test('9C-2b (6): an actual board retry with a stone activated in the same message reuses its Forge entry and spends the stone once', async () => {
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021.json'), 'utf8'));
    const g = { chat: structuredClone(fx.messages), state() { return foldChat(this.chat).state; } };
    const fresh = await campaign(content);
    rec(g.chat[0]).events.find((e) => e.t === 'campaign.started').d.ruleset = 2;
    inject(g, [{ t: 'entity.sheet_set', d: { id: 'pc', sheet: fresh.state().entities.pc.sheet } }]);
    thing(g, 'obj.stone', 'Skill Stone of Embers', STONE);
    g.chat.push({ mes: '*i wake the skill stone and read the quest board*', is_user: true, is_system: false, extra: {} });
    let boards = 0;
    let forges = 0;
    const llm = async (q) => {
        if (q.purpose === 'plan') return JSON.stringify({ commands: [{ seq: 1, type: 'use', object: 'obj.stone', qty: null, quote: 'i wake the skill stone' }, { seq: 2, type: 'board.read', rank: null, quote: 'read the quest board' }] });
        if (q.purpose === 'board') { boards++; return boards <= 2 ? 'empty' : JSON.stringify({ listings: simpleBoard() }); }
        if (q.purpose.startsWith('forge')) { forges++; return forges === 1 ? named(q, 'Ember Seed') : null; }
        return null;
    };
    await prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm });
    assert.ok(lastUser(g).board.failed);
    assert.equal(forges, 1);
    const first = structuredClone(g.state().skill_defs);
    assert.deepEqual(Object.values(first).map((d) => d.name), ['Ember Seed']);
    await prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm });
    assert.equal(boards, 3, 'the board was asked again');
    assert.equal(forges, 1, 'the Forge was not');
    assert.deepEqual(g.state().skill_defs, first);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'object.consumed').length, 1);
    assert.deepEqual(g.state().objects['obj.stone'].holder, { consumed: 'pc' });
});

// ------------------------------------------------------------------------------------------------ 7./8./9.
test('9C-2b (8): a legacy campaign learns nothing from a stone or a primer', async () => {
    const g = await campaign(legacy, { cls: 'Mage', skills: 'Flame Lance + Blink' });
    assert.ok((g.state().meta.ruleset ?? 1) < 2);
    thing(g, 'obj.stone', 'Skill Stone of Embers', STONE, { c: legacy });
    thing(g, 'obj.primer', 'Primer of the Steady Guard', PRIMER, { kind: 'document', c: legacy });
    await use(g, '*i wake the skill stone*', 'obj.stone');
    assert.equal(outcomeOf(g).learned, undefined);
    assert.deepEqual(Object.keys(g.state().skill_defs || {}), []);
    assert.doesNotMatch(outcomeOf(g).actions.join(' '), /ACTIVATES|READS/);
    await reply(g);
    const t0 = clockOf(g);
    await study(g, '*i study the primer for an hour*', { minutes: 60, learn: 'guard', material: 'obj.primer' });
    assert.equal(clockOf(g), t0 + 60, 'an ordinary study');
    assert.equal(g.state().growth, undefined);
});

test('9C-2b (9): the story and its facts book no Skill, Learning Progress or acquisition; only the engine\'s grant does', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    person(g, 'npc.tobin', 'Tobin');
    await say(g, '*i watch Tobin work*');
    await reply(g, 'Alaric suddenly knows the Ember Bolt, as if he had always known it. Tobin shows him a skill stone.', [
        { seq: 1, type: 'fact', s: 'pc', p: 'knows', o: 'Ember Bolt' },
        { seq: 2, type: 'object.new', name: 'Skill Stone of Embers', kind: 'item', effect: null, qty: 1, unit: null, holder: 'npc.tobin', for_quest: null, in: null, teaches: STONE },
    ]);
    const s = g.state();
    assert.deepEqual([Object.keys(s.skill_defs || {}), dyn(g), s.growth ?? null], [[], [], null]);
    assert.equal(Object.values(s.objects).find((o) => o.name === 'Skill Stone of Embers').holder.entity, 'npc.tobin', 'his; a source, no Skill');
    for (const t of ['growth.opened', 'growth.closed']) assert.equal(eventKind({ t, d: {} }), 'pc.progress');
    assert.equal(eventKind({ t: 'skill.defined', d: {} }), 'skills');
});

test('9C-2b (2): studying a named primer without naming the technique learns what the primer teaches; a primer that teaches another refuses', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    thing(g, 'obj.primer', 'Primer of the Steady Guard', PRIMER, { kind: 'document' });
    await study(g, '*i work through the primer for an hour*', { minutes: 60, learn: null, material: 'obj.primer' });
    const goal = g.state().growth.goals['learn.1'];
    assert.deepEqual([goal.target.fn, goal.source.kind], ['guard', 'material']);
    await reply(g);
    const t0 = clockOf(g);
    await study(g, '*i study a fire bolt from the primer for an hour*', { minutes: 60, learn: 'bolt', material: 'obj.primer' });
    assert.match(outcomeOf(g).actions.join(' '), /Primer of the Steady Guard teaches guard \(Defense\), not bolt/);
    assert.equal(clockOf(g), t0);
});

// ------------------------------------------------------------------------------------------------ review of .46
test('9C-2b review R1: a Skill Stone whose teaching was never established is refused when activated; it stays whole and no tool use is told', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward' });
    thing(g, 'obj.plain', 'Skill Stone of Embers', null);
    assert.equal(g.state().objects['obj.plain'].profile, undefined, 'no source profile: nothing established');
    await use(g, '*i press the skill stone to my brow and wake it*', 'obj.plain');
    const line = outcomeOf(g).actions.join(' ');
    assert.match(line, /CANNOT USE — Skill Stone of Embers: what it holds was never established/);
    assert.doesNotMatch(line, /a tool|the story tells what it achieves/);
    assert.equal(lastUser(g).events.some((e) => ['object.consumed', 'skill.defined', 'growth.opened'].includes(e.t)), false);
    assert.equal(g.state().objects['obj.plain'].holder.entity, 'pc');
    // a manual-like thing that teaches nothing the story named: reading it books nothing and says so
    thing(g, 'obj.manual', 'Tattered Manual', null, { kind: 'document' });
    await reply(g);
    await use(g, '*i read the tattered manual*', 'obj.manual');
    assert.match(outcomeOf(g).actions.join(' '), /READS — Tattered Manual.*teaches him nothing by itself/);
});

test('9C-2b review R2: a goal completed by study whose bound primer leaves his hands in the same message is not granted; its progress stays until he holds it again', async () => {
    const g = await campaign(content, { cls: 'Warrior', skills: 'Heavy Slash + Charge' });
    person(g, 'npc.old', 'Old Hesk');
    thing(g, 'obj.primer', 'Primer of the Steady Guard', PRIMER, { kind: 'document' });
    await study(g, '*i study the primer for two hours*', { minutes: 120, learn: 'guard', material: 'obj.primer' });
    await reply(g);
    inject(g, [{ t: 'growth.progress', d: { goal: 'learn.1', lp: 70, total: 95, need: 100 } }]);
    await sleepTillMorning(g);
    const text = '*i study the primer for an hour and then give it to Old Hesk*';
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: [
        { seq: 1, ...ACT('study', { minutes: 60, learn: 'learn.1', material: 'obj.primer' }), quote: 'i study the primer for an hour' },
        { seq: 2, type: 'give', object: 'obj.primer', qty: null, to: 'npc.old', quote: 'give it to Old Hesk' },
    ] })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    const o = outcomeOf(g);
    assert.equal(g.state().objects['obj.primer'].holder.entity, 'npc.old', 'given away in the same message');
    assert.equal(o.learned, undefined, 'no Skill without the primer in hand');
    assert.deepEqual(dyn(g), []);
    assert.deepEqual([g.state().growth.goals['learn.1'].status, g.state().growth.goals['learn.1'].lp], ['ready', 100], 'the progress stays');
    assert.match(r.context.text, /he knows a new Skill only if the engine names it below/);
    assert.match(r.context.text, /NOT LEARNED YET — guard \(Defense\) from Primer of the Steady Guard: he needs Primer of the Steady Guard in hand/);
    await reply(g);
    // his again: the next regular turn grants it, once
    inject(g, [{ t: 'object.moved', d: { id: 'obj.primer', to: { entity: 'pc' } } }]);
    await say(g, '*i look at the primer again*');
    assert.equal(outcomeOf(g).learned?.length, 1);
    assert.equal(dyn(g).length, 1);
});
