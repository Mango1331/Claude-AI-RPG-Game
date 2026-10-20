// Hotfix c.6.6.18: the scorchburst scroll of the live test of 20.10.2026 (tests/v4/live_1020.json, played under
// c.6.6.17). Alaric, a level-1 Mage in the outer galleries of Glimmerdeep Grotto, threw the scroll he bought from Marrec
// at the eleven crystal beetles left after the first fight ("*i say* Thornash *and throw the scroll at them*", #37): the
// planner read a `use` of it, the engine booked object.consumed and nothing else, and the story burned the beetles. Now
// a held thing with an offensive effect profile (content gear item_effects) is an attack made with it, resolved by the
// combat pipeline (a fight opened where there was none), and used up only once it is resolved.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { itemEffectOf } from '../../src/content.js';
import { burstAim } from '../../src/v4/scene_handles.js';
import { turnPanel } from '../../src/display.js';
import { playerTurn } from '../../src/engine.js';
import { playerTurnV4 } from '../../src/v4/turn.js';
import { addCombatant, attackAction } from '../../src/combat.js';
import { Dice } from '../../src/rng.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020.json'), 'utf8'));
const SCROLL = 'obj.t21.scorchburst_scroll_first_circle_one_use';
const TEXT = fx.messages[37].mes;
const USE = { type: 'use', object: SCROLL, qty: 1, quote: 'i say Thornash and throw the scroll at them' };
const BEETLE = (n) => `mon.crystal_beetle_swarm_${n}`;

/** The live chat up to message `n` (exclusive), played on with a scripted planner (Prototype C on). */
function live(n) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, n).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
}
const lastUser = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => lastUser(g).events.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const thrown = (g) => outcomeOf(g).records?.find((r) => r.actor === 'pc' && r.item);
/** Events added to the last message's record, as if its reply had established them (a scene the live run did not have). */
function inject(g, events) {
    const m = g.chat.at(-1);
    m.extra.avereth.events.splice(-1, 0, ...events);
}
/** Every object.consumed of the scroll the whole chat holds (its records folded, as the HUD and the next turn see them). */
const consumedInChat = (g) => g.chat.flatMap((m) => rec(m)?.events || []).filter((e) => e.t === 'object.consumed' && e.d.id === SCROLL).length;

// ------------------------------------------------------------------------------------------------ 1-5: the live turn
test('hotfix scroll 1-5: the scroll bought under c.6.6.17 is recognised; thrown at the beetles it opens the fight, strikes only those at the distance it lands (each by its own profile), and is used up exactly once', async () => {
    const g = live(37);
    const before = g.state();
    // 1. the scroll as the old build made it: no effect profile of its own, recognised by its established name
    const o = before.objects[SCROLL];
    assert.equal(o.holder.entity, 'pc');
    assert.equal(o.effect, undefined, 'bought under the old build: no stored profile');
    assert.equal(itemEffectOf(content, o)?.id, 'item.scorchburst');
    assert.equal(itemEffectOf(content, { ...o, id: 'obj.t99.other', source: { turn: 99 } })?.id, 'item.scorchburst', 'not by its id or the turn it was bought');
    // the scene: no fight; beetle 1 ENGAGED, ten at SHORT, 5 dead
    assert.equal(before.encounter, null);
    assert.equal(before.scene.positions[BEETLE(1)].band, 'ENGAGED');
    const short = before.scene.present.filter((id) => before.scene.positions[id]?.band === 'SHORT');
    assert.equal(short.length, 10);
    // the live turn, as the planner read it
    await say(g, TEXT, USE);
    const r = lastUser(g);
    assert.equal(r.route, 'v3', 'an attack, not the story command use');
    // 2. no fight before: one is opened with those it strikes
    assert.ok(r.events.some((e) => e.t === 'encounter.started'));
    const hit = thrown(g);
    assert.equal(hit.skill, 'item.scorchburst');
    assert.equal(hit.item, SCROLL);
    // 3. thrown where most of them stand (SHORT): the one it is thrown at and those at the same distance, at most 3; not
    // beetle 1 at his side, not the other seven at SHORT, not all eleven because they are beetles in one room
    const struck = hit.strikes.map((s) => s.target);
    assert.deepEqual(struck, [BEETLE(2), BEETLE(3), BEETLE(4)]);
    assert.ok(struck.every((id) => short.includes(id)));
    for (const s of hit.strikes) assert.ok(s.hp_after < s.hp_before && s.final > 0, `${s.target} took damage`);
    const enc = r.events.find((e) => e.t === 'encounter.started').d.encounter;
    assert.deepEqual(Object.keys(enc.combatants).filter((id) => id !== 'pc').sort(), [...struck].sort(), 'only those struck are in the fight');
    // the item's own power: 22 raw, nothing of Alaric's INT or MATK, nothing of the foes
    assert.equal(hit.raw, 22);
    assert.match(hit.raw_text, /the item's own power/);
    assert.equal(hit.cost, undefined, 'no MP');
    // 4. each keeps the profile the story gave it at first sight (levels 5, 13, 14): its own HP and MDEF
    for (const id of struck) {
        const p = before.entities[id].profile;
        assert.equal(enc.combatants[id].fixed.level, p.level);
        assert.equal(enc.combatants[id].fixed.max_hp, p.max_hp);
    }
    assert.deepEqual(struck.map((id) => enc.combatants[id].fixed.level), [5, 13, 14]);
    assert.deepEqual(hit.strikes.map((s) => s.defense), struck.map((id) => before.entities[id].profile.mdef), 'each against its own MDEF');
    // 5. used up once, when it was resolved
    assert.equal(r.events.filter((e) => e.t === 'object.consumed').length, 1);
    assert.equal(g.state().objects[SCROLL].holder.consumed, 'pc');
    assert.equal(hit.used_up, 'used up');
});

// ------------------------------------------------------------------------------------------------ 2b: in a running fight
test('hotfix scroll 2b: in the running first fight (after #32) the scroll is his action: the burst strikes the fight\'s foe and those beside it, who join; thrown out of reach it is refused and stays his; the burst never strikes more than its size', async () => {
    const H = BEETLE(5);
    // beetles 1 and 2 at his side with Beetle H (a scene the live run did not have)
    const g = live(33);
    inject(g, [1, 2].map((n) => ({ t: 'scene.position', d: { id: BEETLE(n), band: 'ENGAGED', cover: 'none' } })));
    assert.equal(g.state().encounter.combatants[H].current.band, 'ENGAGED');
    await say(g, TEXT, USE);
    const hit = thrown(g);
    assert.deepEqual(hit.strikes.map((s) => s.target), [H, BEETLE(1), BEETLE(2)]);
    assert.deepEqual(outcomeOf(g).started.joined, [BEETLE(1), BEETLE(2)], 'those it catches outside the fight join it');
    assert.equal(lastUser(g).events.filter((e) => e.t === 'object.consumed').length, 1);
    // thrown at one beyond its reach in the fight: refused (nothing spent), the scroll stays his
    const h = live(33);
    const far = playerTurn(h.state(), content, TEXT, { msg: 33, c: true, intent: { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(3), target_how: 'planner', move: null, move_target: null, item: SCROLL } });
    assert.match(far.outcome.illegal, /Scorchburst scroll reaches SHORT at most/);
    assert.ok(!far.events.some((e) => e.t === 'object.consumed'));
    assert.equal(far.state.objects[SCROLL].holder.entity, 'pc');
    // the combat pipeline itself never strikes more than the burst's size, whatever it is handed
    const s = live(33).state();
    for (const n of [1, 2, 3, 4]) s.scene.positions[BEETLE(n)] = { band: 'ENGAGED', cover: 'none' };
    const enc = structuredClone(s.encounter);
    for (const n of [1, 2, 3, 4]) addCombatant(enc, s, content, BEETLE(n), 'hostile', null, { c: true });
    const rec5 = attackAction({ enc: structuredClone(enc), content, dice: Dice.from(s), state: s, c: true }, 'pc', H, 'item.scorchburst', { item: SCROLL, burst: [H, 1, 2, 3, 4].map((n) => (typeof n === 'string' ? n : BEETLE(n))) });
    assert.equal(rec5.strikes.length, 3);
    // and without the item it is no action of his (he knows no such skill)
    assert.match(attackAction({ enc: structuredClone(enc), content, dice: Dice.from(s), state: s, c: true }, 'pc', H, 'item.scorchburst', {}).illegal, /does not know Scorchburst scroll/);
});

// ------------------------------------------------------------------------------------------------ 6: invalid use
test('hotfix scroll 6: with no foe within its reach, thrown at someone beyond it, or through the old story path, the scroll is not used up', async () => {
    // nobody within SHORT: it stays his, no fight, nothing rolled
    const g = live(37);
    inject(g, [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ t: 'scene.position', d: { id: BEETLE(n), band: 'MEDIUM', cover: 'none' } })));
    assert.equal(burstAim(g.state(), 'SHORT'), null);
    const prep = await say(g, TEXT, USE);
    const r = lastUser(g);
    assert.equal(prep.action, 'panels', 'the engine answers itself: no narration of a throw that was not made');
    assert.match(prep.panels[0], /\[SYSTEM \/\/ ATTACK — TARGET NEEDED\]\nAlaric's Scorchburst scroll: there is no valid target in the active scene\. Nothing was spent or rolled\./);
    assert.deepEqual(r.events, []);
    assert.equal(g.state().objects[SCROLL].holder.entity, 'pc');
    // the old interpreter path (no planner): the use handler refuses it instead of using it up with its effect left to the story
    const k = live(37);
    k.chat.push({ mes: TEXT, is_user: true, is_system: false, extra: {} });
    const t = playerTurnV4(k.state(), content, TEXT, { msg: 37, commands: [{ seq: 1, ...USE }], interp: { version: 'test', ms: 0, source: 'json', failed: false, error: null } });
    assert.ok(!t.events.some((e) => e.t === 'object.consumed'));
    assert.match(t.events.findLast((e) => e.t === 'outcome.recorded').d.outcome.actions[0], /CANNOT USE — scorchburst scroll.* is an attack: .*nothing was used up, it stays his/);
    // thrown at one beyond its reach (SHORT): the combat pipeline refuses it before anything starts (src/combat.js range,
    // the legality trial), the scroll stays his
    const m = live(37);
    inject(m, [{ t: 'scene.position', d: { id: BEETLE(2), band: 'LONG', cover: 'none' } }]);
    const far = playerTurn(m.state(), content, TEXT, { msg: 37, c: true, intent: { kind: 'attack', skill: 'item.scorchburst', target: BEETLE(2), target_how: 'planner', move: null, move_target: null, item: SCROLL } });
    assert.equal(far.outcome.not_started, true);
    assert.match(far.outcome.illegal, /Scorchburst scroll reaches SHORT at most/);
    assert.ok(!far.events.some((e) => ['object.consumed', 'encounter.started'].includes(e.t)));
    assert.equal(far.state.objects[SCROLL].holder.entity, 'pc');
});

// ------------------------------------------------------------------------------------------------ 7: swipe, replay
test('hotfix scroll 7: a regenerate of the old turn reuses its old events (no fix); the turn sent again under the new build uses the scroll once, and its swipes and the fold never double damage, XP or the use', async () => {
    // the chat as it is: #37 holds the old build's record; a regenerate reuses it (same message, same hash)
    const old = live(38);
    const kept = JSON.stringify(rec(old.chat[37]).events);
    await prepareGenerationAsync(old.chat, content, { type: 'regenerate', settings: { planner: true }, llm: async () => { throw new Error('no LLM call on a regenerate'); } });
    assert.equal(JSON.stringify(rec(old.chat[37]).events), kept, 'the old record is reused: a plain regenerate does not fix the turn');
    assert.ok(!rec(old.chat[37]).events.some((e) => e.t === 'encounter.started'));
    // #37 and #38 deleted, the same words sent again: resolved anew, the old use is gone with its message
    const g = live(37);
    await say(g, TEXT, USE);
    assert.equal(consumedInChat(g), 1);
    const first = JSON.stringify(lastUser(g).events);
    const s1 = g.state();
    // swipes and regenerations of the new turn reuse its record: the same damage, XP and use, not a second one
    for (const type of ['swipe', 'regenerate']) {
        await prepareGenerationAsync(g.chat, content, { type, settings: { planner: true }, llm: async () => { throw new Error('no LLM call'); } });
        assert.equal(JSON.stringify(lastUser(g).events), first, type);
    }
    const s2 = g.state();
    assert.equal(consumedInChat(g), 1);
    assert.deepEqual(s2.entities.pc.sheet, s1.entities.pc.sheet, 'HP and XP as after one burst');
    for (const n of [2, 3, 4]) assert.deepEqual(s2.entities[BEETLE(n)], s1.entities[BEETLE(n)]);
    // the fold from the start gives the same state (event sourcing, the dice as recorded)
    assert.deepEqual(foldChat(g.chat, g.chat.length).state.entities, s2.entities);
    // #37 edited instead (any change of its words): resolved anew, its old record replaced, still one use in the chat
    const e = live(38);
    e.chat[37].mes = `${TEXT} `;
    e.plans = [JSON.stringify({ commands: [{ seq: 1, ...USE }] })];
    await prepareGenerationAsync(e.chat, content, { type: 'regenerate', settings: { planner: true }, llm: e.llm });
    assert.ok(rec(e.chat[37]).events.some((x) => x.t === 'encounter.started'));
    assert.equal(consumedInChat(e), 1);
});

// ------------------------------------------------------------------------------------------------ 3, 6: XP, loot, deaths
test('hotfix scroll 3b: a burst that fells what it strikes ends the fight through the engine: deaths, XP and loot as for any attack', async () => {
    const g = live(37);
    // the three at SHORT it will strike, badly hurt already (a scene the live run did not have)
    inject(g, [2, 3, 4].map((n) => ({ t: 'entity.updated', d: { id: BEETLE(n), set: { profile: { ...g.state().entities[BEETLE(n)].profile, hp: 5 } } } })));
    const xp = g.state().entities.pc.sheet.xp;
    await say(g, TEXT, USE);
    const r = lastUser(g);
    const o = outcomeOf(g);
    assert.deepEqual(thrown(g).strikes.map((s) => [s.target, s.defeated]), [[BEETLE(2), true], [BEETLE(3), true], [BEETLE(4), true]]);
    assert.deepEqual(o.ended.defeated.sort(), [BEETLE(2), BEETLE(3), BEETLE(4)].sort());
    const s = g.state();
    for (const n of [2, 3, 4]) assert.equal(s.entities[BEETLE(n)].status, 'dead');
    assert.ok(o.ended.xp_awarded > 0);
    assert.equal(r.events.filter((e) => e.t === 'xp.changed').reduce((a, e) => a + e.d.amount, 0), o.ended.xp_awarded, 'the fight\'s XP, once');
    assert.ok(s.entities.pc.sheet.level > 1 || s.entities.pc.sheet.xp === xp + o.ended.xp_awarded);
    assert.ok(o.loot?.length, 'the engine\'s loot of the fight');
    assert.ok(r.events.some((e) => e.t === 'object.created' && e.d.object.source?.how === 'loot'));
    for (const n of [1, 6, 7]) assert.equal(s.entities[BEETLE(n)].status, 'alive', 'those it did not strike live on');
    assert.equal(r.events.filter((e) => e.t === 'object.consumed').length, 1);
});

// ------------------------------------------------------------------------------------------------ 8: ordinary things
test('hotfix scroll 8: food, a potion, a tool and gear are used as before; only a thing with an attack profile becomes an attack', async () => {
    const g = live(37);
    inject(g, [
        { t: 'object.created', d: { object: { id: 'obj.test.potion', name: 'minor healing potion', kind: 'item', stack: false, qty: 1, unit: null, use: 'consumable', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 18, how: 'story' } } } },
        { t: 'object.created', d: { object: { id: 'obj.test.bread', name: 'heel of bread', kind: 'item', stack: false, qty: 2, unit: 'portion', use: 'food', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 18, how: 'story' } } } },
        { t: 'object.created', d: { object: { id: 'obj.test.flint', name: 'flint and steel', kind: 'item', stack: false, qty: 1, unit: null, use: 'tool', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 18, how: 'story' } } } },
    ]);
    for (const id of ['obj.test.potion', 'obj.test.bread', 'obj.test.flint', 'obj.guild_plate']) assert.equal(itemEffectOf(content, g.state().objects[id]), null, id);
    await say(g, '*i drink the potion, eat some bread and strike a light*',
        { type: 'use', object: 'obj.test.potion', qty: 1, quote: 'i drink the potion' },
        { type: 'use', object: 'obj.test.bread', qty: 1, quote: 'eat some bread' },
        { type: 'use', object: 'obj.test.flint', qty: null, quote: 'strike a light' });
    const r = lastUser(g);
    assert.equal(r.route, 'v4');
    assert.ok(!r.events.some((e) => e.t === 'encounter.started'));
    const actions = outcomeOf(g).actions.join('\n');
    assert.match(actions, /USES — minor healing potion; it is used up/);
    assert.match(actions, /EATS — 1 portion of heel of bread; 1 portion left/);
    assert.match(actions, /USES — flint and steel \(a tool: it stays with him, not used up/);
    assert.deepEqual(r.events.filter((e) => e.t === 'object.consumed').map((e) => e.d.id), ['obj.test.potion', 'obj.test.bread']);
    assert.equal(g.state().objects[SCROLL].holder.entity, 'pc', 'the scroll is untouched');
    // gear he wields: used, never used up
    const h = live(37);
    await say(h, '*i raise my staff*', { type: 'use', object: 'item.starter_arcane_staff', qty: null, quote: 'i raise my staff' });
    assert.match(outcomeOf(h).actions[0], /USES — Starter Arcane Staff \(his gear: it stays equipped/);
});

// ------------------------------------------------------------------------------------------------ 9: the narrator
test('hotfix scroll 9: the narrator hears the engine\'s burst (its strikes, damage and the scroll used up) and, when nothing was resolved, that nothing burns and nothing is struck', async () => {
    const g = live(37);
    await say(g, TEXT, USE);
    const block = turnBlock(g.chat, g.chat.length - 1, content, {}).context.text;
    assert.match(block, /Alaric: Scorchburst scroll \(FIRST STRIKE[^\n]*-> Crystal Beetle [A-L] \[Magical \/ Area \/ Fire \(thrown scroll\): from where he stands, no step and no melee blow; scorchburst scroll, first-circle, one use used up; its burst strikes exactly the 3 below, no one else is hit or burned\]: strike 1: lands: \d+ damage -> Crystal Beetle [A-L] HP \d+->\d+; strike 2: [^\n]*; strike 3: [^\n]*/);
    assert.match(block, /Narrate exactly these resolved steps in order/);
    const panel = String(turnPanel(g.state(), content));
    assert.match(panel, /Alaric: Scorchburst scroll \(FIRST STRIKE\) → Crystal Beetle [A-L] · scorchburst scroll, first-circle, one use used up/);
    // nothing resolved (no foe within its reach): the engine's own System panel, no narrator call, the scroll his
    const h = live(37);
    inject(h, [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12].map((n) => ({ t: 'scene.position', d: { id: BEETLE(n), band: 'MEDIUM', cover: 'none' } })));
    const quiet = await say(h, TEXT, USE);
    assert.equal(quiet.action, 'panels');
    assert.equal(quiet.context, undefined, 'no narrator context: nothing for the story to burn');
    // and the old story path tells the narrator plainly that nothing burns (src/v4/commands.js use)
    const t = playerTurnV4(live(37).state(), content, TEXT, { msg: 37, commands: [{ seq: 1, ...USE }], interp: { version: 'test', ms: 0, source: 'json', failed: false, error: null } });
    assert.match(t.events.findLast((e) => e.t === 'outcome.recorded').d.outcome.actions[0], /nothing burns and nothing is struck/);
});
