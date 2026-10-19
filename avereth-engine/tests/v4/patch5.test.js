// Patch 5 (travel, journey continuity and encounters): a journey is one undertaking through a persistent world. Its
// destination lasts until he reaches it, gives it up or replaces it; an interruption on the road stops the travel, not
// the journey; whom and what he meets there are the same individuals while they are there, and gone from his way when
// he walks on; an escort's charge and a delivery's parcel go the whole way with him. Played through the product's host
// path (planner on, the extension's own content, Ashbridge), the LLM calls scripted.
// Confirmed and fixed: a group's position moved one animal (the Patch 4 gap); on a further leg of the road the dead and
// the living of the last encounter stayed around him hours later; a pack under the ref of a pack met before was lost
// (the V3 rules took the dead pack's ids for it); "until I find a village" was forgotten at the first interruption; an
// escort's charge was left at the roadside when the extractor did not list it again; nothing paced the road (an ambush
// every leg or none, as the narrator pleased).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadProductContent, loadContent, ROOT } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, foldChat } from '../../src/host.js';
import { buildContext } from '../../src/context.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { continueOptions } from '../../src/v4/intents.js';
import { contractReady } from '../../src/v4/guild.js';
import { extractorCatalog } from '../../src/v4/catalog.js';
import { applyEvent } from '../../src/state.js';
import { clone } from '../../src/util.js';
import { Chat4 } from './harness.js';

const content = await loadProductContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`';

/** A campaign in Ashbridge with a Mage, played on the planner path. */
async function campaign(c = content, greeting = GREETING) {
    const g = new Chat4(c, { greeting });
    await g.player('Mage');
    await g.player('Flame Lance + Arcane Burst');
    const ask = g.llm;
    g.purposes = [];
    g.llm = async (req) => {
        g.purposes.push(req.purpose);
        return req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req);
    };
    return g;
}
/** A player message the planner reads as these commands. */
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    // the planner quotes the message itself (a quote it does not contain is dropped as no evidence)
    const own = (q) => (q && text.includes(q) ? q : text.replace(/\*/g, '').trim());
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c, ...('quote' in c ? { quote: own(c.quote) } : {}) })) })];
    const r = await prepareGenerationAsync(g.chat, g.content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    return r;
}
const outcome = (g) => rec(g.chat.findLast((m) => m.is_user))?.events?.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
const inject = (g, events) => g.chat.findLast((m) => m.extra?.avereth?.events).extra.avereth.events.push(...events);
const goals = (s) => Object.values(s.intents || {});
const goal = (s, place) => goals(s).find((i) => i.place === place);
const rejectedRules = (r) => r.record.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.rule);
const creatures = (s, species = 'wolf') => Object.values(s.entities).filter((e) => e.kind === 'creature' && e.species === species);
const hpOf = (s, id) => s.entities[id].profile?.hp ?? s.entities[id].profile?.max_hp;
const wolvesNew = (ref, count, band = 'MEDIUM', more = null, seq = 2) => ({ seq, type: 'creature.new', ref, species: 'wolf', anchor: 'wolf', desc: ['grey wolves'], count, present: true, band, stronger: null, threat: null, more });
const BLACKGATE = { type: 'go', to: 'loc.blackgate', quote: 'I set out for Blackgate' };
const CONTINUE = { type: 'journey.continue', quote: 'I continue my journey' };
const NOT_THERE = { 1: { arrived: false, at: null, with: null } };

/** The share of road legs that may bring an interruption, for one test (rules.travel.leg_event_pct). */
async function withRoad(pct, fn) {
    const was = content.rules.travel.leg_event_pct;
    content.rules.travel.leg_event_pct = pct;
    try { return await fn(); } finally { content.rules.travel.leg_event_pct = was; }
}

/** He sets off for Blackgate and walks a day of road without getting there. */
async function onTheRoad(minutes = 480) {
    const g = await campaign();
    await say(g, '*I leave Ashbridge and set out for Blackgate*', BLACKGATE);
    await g.reply('He walks east along the Duskreach road all day; by dusk Blackgate is still far off.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes }] });
    return g;
}

/** On the road, four wolves step out; two rush him, the two others hang back; he burns the two attackers down. */
async function roadFight(g) {
    await say(g, '*I continue my journey*', CONTINUE);
    await g.reply('Two hours on, where the road dips into pinewood, four wolves trot out onto the road ahead.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }, wolvesNew('wolves', 4)] });
    let s = g.state();
    const wolves = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature');
    await say(g, '*I keep still and watch them*', { type: 'activity', kind: 'wait', what: 'watch the wolves', minutes: 5, until: null, quote: 'I keep still and watch them' });
    await g.reply('Two of the wolves rush him; the other two hang back at the treeline.', { expected: {}, deltas: [{ seq: 1, type: 'hostile', by: wolves.slice(0, 2) }] });
    s = g.state();
    const fight = Object.keys(s.encounter?.combatants || {}).filter((id) => id !== 'pc');
    for (let i = 0; i < 12 && g.state().encounter; i++) {
        const t = Object.keys(g.state().encounter.combatants).find((id) => id !== 'pc' && !g.state().encounter.combatants[id].current.defeated);
        await say(g, '*i flame lance it*', { type: 'use_skill', skill: 'mage.flame_lance', target: t, quote: 'i flame lance it' });
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    return { wolves, fight, rest: wolves.filter((id) => !fight.includes(id)) };
}

// ------------------------------------------------------------------------------------------------ A. the journey (1-7)
test('patch 5 (1): a known destination is its own id; "back to the city" is Ashbridge again, not a new city; a place known by report is a goal, not a visit', async () => {
    const g = await onTheRoad();
    let s = g.state();
    assert.deepEqual([goal(s, 'loc.blackgate')?.status], ['active']);
    const cities = Object.keys(s.places).length;
    await say(g, '*I turn back to the city*', { type: 'go', to: 'loc.ashbridge', quote: 'I turn back to the city' });
    s = g.state();
    assert.deepEqual(goals(s).map((i) => [i.place, i.status]), [['loc.blackgate', 'paused'], ['loc.ashbridge', 'active']], 'Blackgate is paused, nothing given up');
    await g.reply('He walks back west toward Ashbridge.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }] });
    s = g.state();
    assert.equal(Object.keys(s.places).length, cities, 'no second Ashbridge, no waypoint');
    // a place he has only heard of
    await say(g, '*I listen to the drover*');
    await g.reply('A drover tells of a ruined watchtower on the ridge north of the road.', { expected: {}, deltas: [{ seq: 1, type: 'place.reported', place: { new: { name: 'the ruined watchtower', kind: 'site', parent: 'realm.duskreach' } }, by: null, how: 'told', where: 'on the ridge north of the road' }] });
    s = g.state();
    const tower = Object.values(s.places).find((p) => /watchtower/.test(p.name));
    assert.equal(tower.known, 'reported');
    await say(g, '*I head for the watchtower*', { type: 'go', to: tower.id, quote: 'I head for the watchtower' });
    s = g.state();
    assert.equal(goal(s, tower.id).status, 'active');
    assert.equal(s.places[tower.id].known, 'reported', 'setting off for it is no visit');
});

test('patch 5 (2, 4): a day on the road books its minutes once, puts him on the road toward Blackgate, not there, and heals nothing', async () => {
    const g = await campaign();
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 40 } }, { t: 'resource.changed', d: { id: 'pc', resource: 'mp', value: 20 } }]);
    const before = g.state();
    await say(g, '*I leave Ashbridge and set out for Blackgate*', BLACKGATE);
    assert.equal(outcome(g).auth.timeCap, content.rules.time.travel_cap_min);
    const r = await g.reply('He walks east all day and camps by the road at dusk.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 480 }, { seq: 2, type: 'recover', who: 'pc', hp: 20, sta: null }] });
    const s = g.state();
    assert.equal(s.clock.minute - before.clock.minute, 480, 'the narrated day, once');
    assert.deepEqual([s.scene.at, s.scene.place], ['realm.duskreach', 'On the way to Blackgate']);
    assert.notEqual(s.places['loc.blackgate'].known, 'visited');
    assert.equal(goal(s, 'loc.blackgate').status, 'active');
    assert.deepEqual([s.entities.pc.sheet.hp, s.entities.pc.sheet.mp], [40, 20], 'travel is no rest');
    assert.ok(rejectedRules(r).includes('recover'));
});

test('patch 5 (3): the caps hold and need not be used up: a week at most for a leg, a short walk in town is short, a fight allows minutes', async () => {
    const g = await campaign();
    const t0 = g.state().clock.minute;
    await say(g, '*I set out for Blackgate*', BLACKGATE);
    const r = await g.reply('Weeks pass on the road.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 20000 }] });
    assert.equal(g.state().clock.minute - t0, content.rules.time.travel_cap_min);
    assert.ok(rejectedRules(r).includes('time_cap'));
    const t1 = g.state().clock.minute;
    await say(g, '*I continue my journey*', CONTINUE);
    await g.reply('An hour on, he rests his feet at a milestone.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }] });
    assert.equal(g.state().clock.minute - t1, 60, 'the cap is no quota');
});

test('patch 5 (4, B): "follow the northern road until I find a village" invents no village; it is his goal through an interruption; the village he finds is where it ends', async () => {
    const g = await campaign();
    await say(g, '*I follow the northern road until I find a village*', { type: 'go', to: { new: 'a village' }, quote: 'I follow the northern road until I find a village' });
    const places = Object.keys(g.state().places).length;
    await g.reply('Five hours of fields and hedges; no village yet, only a broken bridge over a stream.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 300 }] });
    let s = g.state();
    assert.equal(Object.keys(s.places).length, places, 'no village made');
    const seek = goals(s).find((i) => i.seek);
    assert.deepEqual([seek.goal, seek.place, seek.status, seek.quote], ['find a village', null, 'active', 'I follow the northern road until I find a village']);
    // an interruption, then "I continue": the same search, his own words still his way
    await say(g, '*I wait for the rain to pass*', { type: 'activity', kind: 'wait', what: 'the rain', minutes: 30, until: null, quote: 'I wait for the rain to pass' });
    await g.reply('The squall passes.', { expected: {}, deltas: [] });
    await say(g, '*I continue on the road*', { type: 'journey.continue', quote: 'I continue on the road' });
    const o = outcome(g);
    assert.match(o.actions.join('\n'), /CONTINUES — on his way to find a village, his own goal "find a village".*He set off saying "I follow the northern road until I find a village": that is still his way/);
    assert.equal(o.auth.go.intent, seek.id);
    assert.equal(o.auth.timeCap, content.rules.time.unknown_place_cap_min);
    await g.reply('By evening the road brings him to Harrowby, a hamlet of six cottages.', { expected: { 1: { arrived: true, at: { new: { name: 'Harrowby', kind: 'settlement', parent: 'realm.duskreach' } }, with: null } }, deltas: [] });
    s = g.state();
    const harrowby = Object.values(s.places).find((p) => p.name === 'Harrowby');
    assert.equal(s.scene.at, harrowby.id);
    assert.deepEqual([s.intents[seek.id].status, s.intents[seek.id].place], ['done', harrowby.id]);
});

test('patch 5 (5, C): a route is how he travels, never a destination; "I continue" keeps his way', async () => {
    const g = await campaign();
    const places = Object.keys(g.state().places).length;
    await say(g, '*I take the old forest road to Blackgate, avoiding the marsh*', { type: 'go', to: 'loc.blackgate', quote: 'I take the old forest road to Blackgate, avoiding the marsh' });
    assert.equal(outcome(g).auth.go.to, 'loc.blackgate');
    await g.reply('The old forest road winds under oaks; the marsh stays to the south.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 300 }] });
    assert.equal(Object.keys(g.state().places).length, places, 'neither the forest road nor the marsh is a place of its own');
    await say(g, '*I continue my journey*', CONTINUE);
    assert.match(outcome(g).actions.join('\n'), /He set off saying "I take the old forest road to Blackgate, avoiding the marsh": that is still his way/);
});

test('patch 5 (6): no journey while a fight runs; the towers in sight are no arrival; partial travel is not arriving', async () => {
    const g = await onTheRoad();
    await roadFightStart(g);
    assert.ok(g.state().encounter);
    let r = await say(g, '*I run on toward Blackgate*', CONTINUE);
    assert.ok(g.state().encounter, 'the fight runs on');
    assert.equal(goal(g.state(), 'loc.blackgate').status, 'active');
    void r;
    const h = await onTheRoad();
    await say(h, '*I continue my journey*', CONTINUE);
    r = await h.reply('By noon the black towers of Blackgate rise on the horizon, still half a day off.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
    const s = h.state();
    assert.equal(s.scene.at, 'realm.duskreach');
    assert.equal(goal(s, 'loc.blackgate').status, 'active');
});
async function roadFightStart(g) {
    await say(g, '*I continue my journey*', CONTINUE);
    await g.reply('Four wolves trot out onto the road and rush him.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }, wolvesNew('wolves', 4, 'SHORT'), { seq: 3, type: 'hostile', by: ['wolves'] }] });
}

test('patch 5 (7, 14): a stopover keeps the goal; a detour pauses it; giving it up drops it; only arriving does it', async () => {
    const g = await onTheRoad();
    await say(g, '*I stop at the waystation for an hour*', { type: 'go', to: { new: 'the waystation' }, quote: 'I stop at the waystation' });
    await g.reply('A roadside waystation; he rests his feet.', { expected: { 1: { arrived: true, at: { new: { name: 'Roadside waystation', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [] });
    let s = g.state();
    assert.equal(goal(s, 'loc.blackgate').status, 'active', 'a stopover is no new destination');
    assert.deepEqual(continueOptions(s, { c: true }).map((o) => o.place), ['loc.blackgate']);
    await say(g, '*I go back to Ashbridge instead*', { type: 'go', to: 'loc.ashbridge', quote: 'I go back to Ashbridge instead' });
    s = g.state();
    assert.equal(goal(s, 'loc.blackgate').status, 'paused');
    await g.reply('He turns west.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }] });
    await say(g, '*Forget Blackgate.*', { type: 'intent.drop', intent: goal(g.state(), 'loc.blackgate').id, achieved: false, quote: 'Forget Blackgate' });
    assert.equal(goal(g.state(), 'loc.blackgate').status, 'dropped');
    await g.reply('He walks on.', { expected: {}, deltas: [] });
    await say(g, '*I continue to Ashbridge*', CONTINUE);
    await g.reply('He passes Ashbridge\'s gate at dusk.', { expected: { 1: { arrived: true, at: 'loc.ashbridge', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 120 }] });
    s = g.state();
    assert.equal(goal(s, 'loc.ashbridge').status, 'done');
    assert.equal(goal(s, 'loc.blackgate').status, 'dropped', 'arriving elsewhere does not touch a dropped goal');
});

// ------------------------------------------------------------------------------------------------ B. interruptions (8-13)
test('patch 5 (8): an uneventful leg is told so; birds and a far rider are atmosphere: the road goes on and he can arrive', async () => {
    await withRoad(0, async () => {
        const g = await onTheRoad();
        const prep = await say(g, '*I continue my journey*', CONTINUE);
        const o = outcome(g);
        assert.equal(o.auth.road, 'quiet');
        assert.ok(o.extra.some((x) => /^THE ROAD — this leg toward Blackgate is uneventful/.test(x)));
        assert.match(JSON.stringify(prep.context), /THE ROAD — this leg toward Blackgate is uneventful/, 'the narrator reads it');
        await g.reply('Birds circle over the fields; a far rider never comes nearer. By evening he passes Blackgate\'s gate.', { expected: { 1: { arrived: true, at: 'loc.blackgate', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 360 }] });
        const s = g.state();
        assert.equal(s.scene.at, 'loc.blackgate');
        assert.equal(goal(s, 'loc.blackgate').status, 'done');
    });
});

test('patch 5 (9): a leg that may bring an interruption: three bandits step onto the road; the destination stays, he is on the road, not there, and the fight is theirs to start', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        await say(g, '*I continue my journey*', CONTINUE);
        const o = outcome(g);
        assert.equal(o.auth.road, 'open');
        assert.ok(o.extra.some((x) => /^THE ROAD — this leg toward Blackgate may \(not must\) bring ONE concrete interruption/.test(x)));
        const bandit = (ref, seq) => ({ seq, type: 'person.new', ref, name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'MEDIUM' });
        await g.reply('Three armed bandits step onto the road. "Toll," says the first.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 90 }, bandit('first bandit', 2), bandit('second bandit', 3), bandit('third bandit', 4)] });
        const s = g.state();
        assert.equal(s.scene.at, 'realm.duskreach');
        assert.match(s.scene.place, /On the way to Blackgate/);
        assert.equal(goal(s, 'loc.blackgate').status, 'active');
        assert.equal(s.scene.present.filter((id) => s.entities[id]?.kind === 'npc').length, 3);
        assert.equal(s.encounter, null, 'a demand is no fight');
    });
});

test('patch 5 (10): on an uneventful leg nobody the reply brings onto the road ambushes him; they are there, nothing more', async () => {
    await withRoad(0, async () => {
        const g = await onTheRoad();
        await say(g, '*I continue my journey*', CONTINUE);
        const r = await g.reply('Wolves burst from the pines and rush him.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }, wolvesNew('wolves', 2, 'SHORT'), { seq: 3, type: 'hostile', by: ['wolves'] }] });
        const s = g.state();
        assert.equal(s.encounter, null);
        assert.ok(rejectedRules(r).includes('road'));
        assert.match(r.record.corrections.join('\n'), /that leg of his journey was uneventful/);
        assert.equal(creatures(s).filter((e) => s.scene.present.includes(e.id)).length, 2, 'they are on the road');
    });
});

test('patch 5 (11): the engine pays, fights, flees and turns for him never: a toll demanded on the road leaves his coin, his way and the peace as they are', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        const coin = g.state().entities.pc.sheet.coin_cp;
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('A bandit blocks the road: "Five silver or you turn back." Alaric pays and takes the marsh path instead.', { expected: NOT_THERE, deltas: [
            { seq: 1, type: 'time', minutes: 90 },
            { seq: 2, type: 'person.new', ref: 'bandit', name: null, role: 'bandit', desc: ['armed bandit'], present: true, relevant: true, threat: true, at: null, band: 'SHORT' },
            { seq: 3, type: 'memory', text: 'Alaric paid five silver to a bandit on the Blackgate road', who: ['bandit'], imp: 6 },
        ] });
        const s = g.state();
        assert.equal(s.entities.pc.sheet.coin_cp, coin, 'no payment he did not make');
        assert.equal(s.encounter, null);
        assert.equal(goal(s, 'loc.blackgate').status, 'active', 'no new route or destination');
        assert.ok(!Object.values(s.places).some((p) => /marsh/i.test(p.name)));
    });
});

test('patch 5 (12, 13): an interruption still there is not made again: going on, those of it are "still here" and nothing new meets him; the same wolves are named again; then he walks on and they stay behind', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('Three wolves stand on the road ahead, watching.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }, wolvesNew('wolves', 3)] });
        let s = g.state();
        const three = creatures(s).map((e) => e.id);
        await say(g, '*I keep going*', CONTINUE);
        const o = outcome(g);
        assert.equal(o.auth.road, 'quiet');
        assert.ok(o.extra.some((x) => /^THE ROAD — Wolf A, Wolf B, Wolf C are still here as he goes on toward Blackgate: the story shows how they take it; nothing new meets him on this leg\./.test(x)), JSON.stringify(o.extra));
        await g.reply('The three wolves watch him edge past.', { expected: NOT_THERE, deltas: [wolvesNew('wolves', 3, 'MEDIUM', false, 1)] });
        s = g.state();
        assert.deepEqual(creatures(s).map((e) => e.id), three, 'the same three, no three more');
        assert.equal(goal(s, 'loc.blackgate').status, 'active');
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('He leaves them behind; the road climbs for three hours.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 180 }] });
        s = g.state();
        assert.deepEqual(s.scene.present, ['pc'], 'they stay where they were');
        assert.ok(three.every((id) => s.entities[id].left?.at === 'realm.duskreach'));
    });
});

// ------------------------------------------------------------------------------------------------ C. encounters (14-20)
test('patch 5 (14, 15): the road is no generator: no leg is sure to bring something, the share follows the rule, the same leg draws the same, and no LLM call is added', async () => {
    const g = await onTheRoad();
    const s = g.state();
    const draws = [];
    for (let turn = 1; turn <= 200; turn++) {
        const t = clone(s);
        t.turn = turn;
        const emit = (e) => applyEvent(t, e);
        draws.push(resolveCommands(t, content, [{ seq: 1, ...CONTINUE }], emit, { c: true }).auth.road);
    }
    const open = draws.filter((x) => x === 'open').length;
    assert.ok(open > 40 && open < 100, `${open} of 200 legs may bring something (rules: ${content.rules.travel.leg_event_pct}%)`);
    assert.ok(draws.slice(0, 20).includes('open') && draws.slice(0, 20).includes('quiet'), 'no fixed order');
    const again = clone(s);
    again.turn = 7;
    assert.equal(resolveCommands(again, content, [{ seq: 1, ...CONTINUE }], (e) => applyEvent(again, e), { c: true }).auth.road, draws[6], 'a swipe or a replay draws the same');
    assert.deepEqual([...new Set(g.purposes.map((p) => p.replace(/[:.].*$/, '')))].sort(), ['extract', 'plan'], 'only the planner and the extractor are asked');
});

test('patch 5 (16, 17): four wolves on the road, two attack: the others stay in the scene with their ids and HP; the fight does not end the journey; afterwards the dead stay dead and nothing is credited twice', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        const { wolves, fight, rest } = await roadFight(g);
        assert.equal(fight.length, 2);
        let s = g.state();
        assert.equal(s.encounter, null);
        assert.ok(fight.every((id) => s.entities[id].status === 'dead'));
        assert.ok(rest.every((id) => s.entities[id].status !== 'dead' && s.scene.present.includes(id)), 'the two that hung back are still there');
        assert.equal(goal(s, 'loc.blackgate').status, 'active');
        assert.deepEqual([s.scene.at, s.scene.place], ['realm.duskreach', 'On the way to Blackgate']);
        const xp = s.entities.pc.sheet.xp;
        const loot = Object.keys(s.objects).length;
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('He leaves the pinewood behind; four hours on, Blackgate\'s gate.', { expected: { 1: { arrived: true, at: 'loc.blackgate', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
        s = g.state();
        assert.equal(s.scene.at, 'loc.blackgate');
        assert.deepEqual(s.scene.present, ['pc'], 'no wolf follows him into the city');
        assert.equal(s.entities.pc.sheet.xp, xp, 'no second XP');
        assert.equal(Object.keys(s.objects).length, loot, 'no second loot');
        assert.ok(wolves.every((id) => s.entities[id]), 'every wolf keeps its id');
        assert.equal(goal(s, 'loc.blackgate').status, 'done');
    });
});

test('patch 5 (18): on the next leg the dead and the living stay behind; a pack he meets hours later is a pack of its own, never the dead wolves again nor a copy of the living', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        const { wolves, rest } = await roadFight(g);
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('He walks on for four hours through the pines.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
        let s = g.state();
        assert.deepEqual(s.scene.present, ['pc'], 'nobody of the pinewood is around him four hours on');
        await say(g, '*I continue my journey*', CONTINUE);
        const r = await g.reply('At dusk two wolves step out of the pines.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }, wolvesNew('wolves', 2)] });
        s = g.state();
        const now = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature');
        assert.equal(now.length, 2, `two wolves on the road (${rejectedRules(r)})`);
        assert.ok(now.every((id) => !wolves.includes(id)), 'new individuals');
        assert.ok(wolves.filter((id) => !rest.includes(id)).every((id) => s.entities[id].status === 'dead'), 'the dead stay dead');
        assert.ok(rest.every((id) => !s.scene.present.includes(id)));
        const groups = new Set(now.map((id) => s.entities[id].group));
        assert.equal(groups.size, 1);
        assert.ok(!groups.has(s.entities[rest[0]].group), 'a pack of its own, not the pinewood pack');
    });
});

test('patch 5 (19): the same individuals when clearly meant: the survivors trailing him in the very reply he walks on are the same two, hurt as they are; at a place he comes back to within hours, the same; one of two is a question', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        const { rest } = await roadFight(g);
        inject(g, [{ t: 'entity.updated', d: { id: rest[0], set: { profile: { ...g.state().entities[rest[0]].profile, hp: 3 } } } }]);
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('He walks on for two hours; the two surviving wolves trail him at a distance.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }, wolvesNew('wolves', 2, 'LONG')] });
        let s = g.state();
        assert.deepEqual(s.scene.present.filter((id) => s.entities[id]?.kind === 'creature').sort(), rest.slice().sort(), 'the same two');
        assert.equal(hpOf(s, rest[0]), 3, 'hurt as it was');
        assert.ok(rest.every((id) => !!s.entities[id].wary), 'and still wary of him');
    });
    // a concrete place: the cave he left, again within hours
    const g = await campaign();
    await say(g, '*I climb into the cave by the road*', { type: 'go', to: { new: 'the cave by the road' }, quote: 'I climb into the cave by the road' });
    await g.reply('Two wolves growl in the dark of the cave.', { expected: { 1: { arrived: true, at: { new: { name: 'Cave by the road', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [wolvesNew('cave wolves', 2, 'MEDIUM', null, 1)] });
    let s = g.state();
    const cave = s.scene.at;
    const pair = creatures(s).map((e) => e.id);
    await say(g, '*I back out to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I back out to the road' });
    await g.reply('He backs out onto the road.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
    await say(g, '*I go back into the cave*', { type: 'go', to: cave, quote: 'I go back into the cave' });
    await g.reply('The wolves are still there.', { expected: { 1: { arrived: true, at: cave, with: null } }, deltas: [wolvesNew('wolves', 2, 'MEDIUM', null, 1)] });
    s = g.state();
    assert.deepEqual(creatures(s).map((e) => e.id), pair, 'the same pair, no second');
    assert.deepEqual(s.scene.present.filter((id) => pair.includes(id)).sort(), pair.slice().sort());
    // one of the two: which is the story's to say
    await say(g, '*I back out to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I back out to the road' });
    await g.reply('He backs out again.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
    await say(g, '*I go back into the cave*', { type: 'go', to: cave, quote: 'I go back into the cave' });
    const r = await g.reply('A wolf growls in the dark.', { expected: { 1: { arrived: true, at: cave, with: null } }, deltas: [wolvesNew('wolf', 1, 'MEDIUM', null, 1)] });
    s = g.state();
    assert.equal(creatures(s).length, 2, 'nothing picked, nothing made');
    assert.ok(rejectedRules(r).includes('group_unclear'));
});

test('patch 5 (20): no pursuit over any distance: a pack left behind on a stretch of road is not who he meets the next day; two groups left in one place are never mixed', async () => {
    const g = await campaign();
    await say(g, '*I climb into the cave by the road*', { type: 'go', to: { new: 'the cave by the road' }, quote: 'I climb into the cave by the road' });
    await g.reply('Two wolves and, apart from them, a pair of grey wolves from the ridge.', { expected: { 1: { arrived: true, at: { new: { name: 'Cave by the road', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [wolvesNew('cave wolves', 2, 'MEDIUM', null, 1), wolvesNew('ridge pair', 2, 'LONG', true, 2)] });
    let s = g.state();
    const cave = s.scene.at;
    assert.equal(new Set(creatures(s).map((e) => e.group)).size, 2);
    await say(g, '*I back out to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I back out to the road' });
    await g.reply('He backs out onto the road.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
    await say(g, '*I go back into the cave*', { type: 'go', to: cave, quote: 'I go back into the cave' });
    const r = await g.reply('Two wolves are there.', { expected: { 1: { arrived: true, at: cave, with: null } }, deltas: [wolvesNew('wolves', 2, 'MEDIUM', null, 1)] });
    s = g.state();
    assert.equal(creatures(s).length, 4, 'neither pack picked, none made');
    assert.ok(rejectedRules(r).includes('group_unclear'));
    // a day later the cave's wolves are no longer "a short while ago"
    await say(g, '*I sleep in the cave mouth until morning*', { type: 'activity', kind: 'sleep', what: null, minutes: 600, until: null, quote: 'I sleep until morning' });
    await g.reply('He sleeps.', { expected: { 1: { minutes: 600, done: true } }, deltas: [] });
    await say(g, '*I go deeper*');
    await g.reply('Two wolves pad out of the dark.', { expected: {}, deltas: [wolvesNew('wolves', 2, 'MEDIUM', null, 1)] });
    s = g.state();
    assert.equal(creatures(s).length, 6, 'others, not a pick of the four');
    // one animal left on an earlier stretch of the road does not turn up again a stretch later
    await withRoad(0, async () => {
        const h = await onTheRoad();
        await say(h, '*I continue my journey*', CONTINUE);
        await h.reply('A lone wolf watches him from a rock by the road.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }, wolvesNew('lone wolf', 1, 'LONG')] });
        const lone = creatures(h.state())[0].id;
        await say(h, '*I continue my journey*', CONTINUE);
        await h.reply('He walks on for three hours.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 180 }] });
        await say(h, '*I continue my journey*', CONTINUE);
        await h.reply('A wolf lopes across the road ahead.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 60 }, wolvesNew('wolf', 1, 'MEDIUM')] });
        const t = h.state();
        assert.equal(creatures(t).length, 2, 'another wolf, not the one three hours back');
        assert.ok(!t.scene.present.includes(lone));
    });
});

// ------------------------------------------------------------------------------------------------ D. companions and quests (21-25)
const legacy = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1007.json'), 'utf8'));
const MED = 'quest.carry_a_medicine_bundle_to_thornwick_chapel';
/** Live 07.10.2026 at #32 in Ashbridge (planner on), the chapel contract made an escort of Brother Aldric. */
function escortRun() {
    const g = new Chat4(legacy);
    g.chat = fx.messages.slice(0, 33).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    const s = g.state();
    inject(g, [{ t: 'quest.set', d: { quest: { ...s.quests[MED], objectives: [{ id: 'o1', verb: 'ESCORT', what: 'Brother Aldric', qty: 1, status: 'open' }] } } }]);
    const ask = g.llm;
    g.purposes = [];
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}

test('patch 5 (21, 22): an escort goes the whole way: Brother Aldric is with him on every leg, through wolves and a fight, and arrives with him though the extractor names only the place', async () => {
    await withRoad(100, async () => {
        const g = escortRun();
        await say(g, '*we set off together*', { type: 'journey.continue', quote: 'we set off together' });
        await g.reply('Four hours north with Aldric beside him.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
        let s = g.state();
        assert.ok(s.scene.present.includes('npc.aldric'));
        assert.ok(s.quests[MED].journey);
        await say(g, '*we go on*', { type: 'journey.continue', quote: 'we go on' });
        await g.reply('Another three hours; two wolves block the track.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 180 }, wolvesNew('wolves', 2, 'SHORT'), { seq: 3, type: 'hostile', by: ['wolves'] }] });
        s = g.state();
        assert.ok(s.scene.present.includes('npc.aldric'), 'a further leg does not leave him at the roadside');
        assert.ok(s.encounter, 'the wolves fight');
        for (let i = 0; i < 12 && g.state().encounter; i++) {
            const t = Object.keys(g.state().encounter.combatants).find((id) => id !== 'pc' && g.state().encounter.combatants[id].side === 'hostile' && !g.state().encounter.combatants[id].current.defeated);
            if (!t) break;
            await say(g, '*i flame lance it*', { type: 'use_skill', skill: 'mage.flame_lance', target: t, quote: 'i flame lance it' });
            await g.reply('The fight goes on.', { expected: {}, deltas: [] });
        }
        s = g.state();
        assert.equal(s.encounter, null);
        assert.equal(s.quests[MED].status, 'active', 'the fight ends no escort');
        assert.ok(!s.quests[MED].ready, 'nor makes it ready');
        assert.ok(s.scene.present.includes('npc.aldric'));
        await say(g, '*we go on to Thornwick*', { type: 'journey.continue', quote: 'we go on to Thornwick' });
        const to = Object.values(s.places).find((p) => /thornwick/i.test(p.name) && p.kind !== 'interior');
        const arrival = await g.reply('By evening they reach Thornwick.', { expected: {}, deltas: [{ seq: 1, type: 'arrive', at: to ? to.id : { new: { name: 'Thornwick', kind: 'settlement', parent: 'realm.duskreach' } }, forced_by: null, with: null }] });
        s = g.state();
        assert.match(s.places[s.scene.at].name, /Thornwick/, JSON.stringify(arrival.record.extraction));
        assert.ok(s.scene.present.includes('npc.aldric'), 'he arrives with him');
    });
});

test('patch 5 (22): an escort is given up only by him; an interruption or a "continue" never ends or completes it', async () => {
    const g = escortRun();
    await say(g, '*we set off together*', { type: 'journey.continue', quote: 'we set off together' });
    const r = await g.reply('A washed-out bridge stops them; Aldric says they are as good as there.', { expected: {}, deltas: [{ seq: 1, type: 'time', minutes: 240 }, { seq: 2, type: 'quest.ready', quest: MED, note: 'as good as there', alternative: null }] });
    let s = g.state();
    assert.ok(!s.quests[MED].ready, 'not there is not done');
    assert.ok(rejectedRules(r).length);
    assert.equal(s.quests[MED].status, 'active');
    await say(g, '*I give up this escort, I am going back*', { type: 'quest.abandon', quest: MED, quote: 'I give up this escort' });
    s = g.state();
    assert.equal(s.quests[MED].status, 'abandoned');
});

test('patch 5 (23, 24, 25): a parcel goes the whole way in his pack: no leg, interruption or wrong arrival delivers it; the hand-over does, once; the way back is no part of it', async () => {
    await withRoad(100, async () => {
        const g = await campaign();
        const quest = { id: 'quest.parcel', title: 'Sealed Parcel to Blackgate', kind: 'guild_contract', client: 'a Blackgate clerk', rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 60, reward: '60 cp',
            task: 'Carry a sealed parcel to the clerk at the Blackgate customs house.', desired_end_state: 'The sealed parcel is in the hands of the Blackgate customs clerk.',
            objectives: [{ id: 'o1', verb: 'DELIVER', what: 'sealed parcel', qty: 1, unit: 'parcel', where: 'Blackgate', status: 'open' }],
            proof: [], source: { board: 'loc.ashbridge.guild_hall', branch: 'loc.ashbridge' }, schedule: { starts_at: null, deadline: null }, status: 'active', taker: 'pc', history: [], details: [], notes: [] };
        inject(g, [{ t: 'quest.created', d: { quest } }, { t: 'object.created', d: { object: { id: 'obj.parcel', name: 'sealed parcel', kind: 'item', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: ['quest.parcel'], source: { how: 'guild' } } } }]);
        await say(g, '*I set out for Blackgate*', BLACKGATE);
        await g.reply('A day east on the road.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 480 }] });
        await roadFight(g);
        let s = g.state();
        assert.equal(s.objects['obj.parcel'].holder.entity, 'pc', 'the parcel is still his to carry');
        assert.equal(contractReady(s, content, s.quests['quest.parcel'], { c: true }).mode, 'not_delivered');
        // the wrong place: a hamlet on the way
        await say(g, '*I stop in the hamlet*', { type: 'go', to: { new: 'the hamlet' }, quote: 'I stop in the hamlet' });
        let r = await g.reply('A hamlet; a woman offers to take the parcel on.', { expected: { 1: { arrived: true, at: { new: { name: 'Fernby', kind: 'settlement', parent: 'realm.duskreach' } }, with: null } }, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.parcel', note: 'delivered', alternative: null }] });
        s = g.state();
        assert.equal(contractReady(s, content, s.quests['quest.parcel'], { c: true }).mode, 'not_delivered', 'the story\'s claim makes no delivery');
        assert.match(r.record.corrections.join('\n'), /NOT READY for turn-in yet: he still carries sealed parcel/);
        assert.equal(s.objects['obj.parcel'].holder.entity, 'pc');
        // Blackgate: arriving is not handing over
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('Blackgate at last; the customs house by the gate.', { expected: { 1: { arrived: true, at: 'loc.blackgate', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 240 }, { seq: 2, type: 'person.new', ref: 'customs clerk', name: null, role: 'customs clerk', desc: ['ink-stained'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }] });
        s = g.state();
        assert.equal(s.scene.at, 'loc.blackgate');
        assert.equal(contractReady(s, content, s.quests['quest.parcel'], { c: true }).mode, 'not_delivered', 'he is there, the parcel is not delivered');
        const clerk = s.scene.present.find((id) => s.entities[id]?.kind === 'npc');
        await say(g, '*I hand the sealed parcel to the clerk*', { type: 'give', object: 'obj.parcel', to: clerk, quote: 'I hand the sealed parcel to the clerk' });
        r = await g.reply('The clerk takes the parcel and signs for it.', { expected: { 1: { given: true } }, deltas: [{ seq: 1, type: 'quest.ready', quest: 'quest.parcel', note: 'handed to the customs clerk', alternative: null }] });
        s = g.state();
        assert.equal(s.objects['obj.parcel'].holder.entity, clerk);
        assert.equal(contractReady(s, content, s.quests['quest.parcel'], { c: true }).ok, true);
        assert.equal(g.chat.flatMap((m) => m.extra?.avereth?.events || []).filter((e) => e.t === 'object.moved' && e.d.id === 'obj.parcel').length, 1, 'booked once');
        // the way back is a GO of his own, not this contract's journey
        assert.ok(!continueOptions(s, { c: true }).some((o) => o.id === 'quest.parcel'));
    });
});

// ------------------------------------------------------------------------------------------------ E. places and group positions (26-30)
test('patch 5 (26, 27): on the road a ridge in the distance is nothing, a tower told of is known by report, seen when he gets there, the same place when he comes back; a name in sight is no arrival', async () => {
    const g = await onTheRoad();
    const places = Object.keys(g.state().places).length;
    await say(g, '*I continue my journey*', CONTINUE);
    await g.reply('A ridge rises in the distance; beyond it, a shepherd says, stands a ruined tower.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }, { seq: 2, type: 'place.reported', place: { new: { name: 'the ruined tower', kind: 'site', parent: 'realm.duskreach' } }, by: null, how: 'told', where: 'beyond the ridge' }] });
    let s = g.state();
    assert.equal(Object.keys(s.places).length, places + 1, 'the tower, not the ridge');
    const tower = Object.values(s.places).find((p) => /ruined tower/.test(p.name));
    assert.equal(tower.known, 'reported');
    await say(g, '*I make for the ruined tower*', { type: 'go', to: tower.id, quote: 'I make for the ruined tower' });
    await g.reply('The tower\'s broken crown shows over the ridge, an hour off still.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 90 }] });
    s = g.state();
    assert.equal(s.places[tower.id].known, 'reported', 'seen from afar is not visited');
    assert.notEqual(s.scene.at, tower.id);
    await say(g, '*I go on to the tower*', { type: 'go', to: tower.id, quote: 'I go on to the tower' });
    await g.reply('He climbs to the ruined tower.', { expected: { 1: { arrived: true, at: { new: { name: 'Ruined Tower', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(s.scene.at, tower.id, 'the same place');
    assert.equal(s.places[tower.id].known, 'visited');
    await say(g, '*I go back to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I go back to the road' });
    await g.reply('Back on the road.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [] });
    await say(g, '*I return to the tower*', { type: 'go', to: { new: 'the ruined tower' }, quote: 'I return to the tower' });
    await g.reply('The ruined tower again.', { expected: { 1: { arrived: true, at: { new: { name: 'the ruined tower', kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [] });
    s = g.state();
    assert.equal(s.scene.at, tower.id);
    assert.equal(Object.values(s.places).filter((p) => /ruined tower/i.test(p.name)).length, 1, 'no copy on return');
});

const weald = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1018_weald.json'), 'utf8'));
const W = ['mon.crequarry_pack_1', 'mon.crequarry_pack_2', 'mon.crequarry_pack_3', 'mon.crequarry_pack_4'];
/** The live run of 18.10.2026 up to #40 (the four quarry wolves), then the eastern pair beside them (Patch 4). */
async function twoPacks() {
    const g = new Chat4(content, { greeting: weald.messages[0].mes });
    g.chat = weald.messages.slice(0, 40).map((m) => ({ mes: m.mes, is_user: m.is_user, is_system: m.is_system, extra: structuredClone(m.extra || {}) }));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    await g.reply(weald.messages[40].mes, weald.messages[40].extra.avereth.extraction.raw);
    await say(g, '*i wait and watch*');
    await g.reply('Two more wolves, a pair from the eastern ridge, come down apart from the quarry pack.', { expected: {}, deltas: [wolvesNew('east pair', 2, 'MEDIUM', true, 1)] });
    const s = g.state();
    return { g, pair: creatures(s).filter((e) => e.group === 'east pair').map((e) => e.id) };
}
const bands = (s, ids) => ids.map((id) => s.scene.positions[id]?.band);

test('patch 5 (28): the Patch 4 gap: "the east pair closes in" moves both wolves of the pair, and no quarry wolf', async () => {
    const { g, pair } = await twoPacks();
    const quarry = bands(g.state(), W);
    assert.deepEqual(bands(g.state(), pair), ['MEDIUM', 'MEDIUM']);
    await say(g, '*i wait and watch*');
    const r = await g.reply('The eastern pair closes in.', { expected: {}, deltas: [{ seq: 1, type: 'position', who: 'east pair', band: 'SHORT', cover: 'none' }] });
    const s = g.state();
    assert.deepEqual(bands(s, pair), ['SHORT', 'SHORT'], JSON.stringify(rejectedRules(r)));
    assert.deepEqual(bands(s, W), quarry);
});

test('patch 5 (29, 30): one wolf\'s own ref moves that wolf alone; "the wolves" over two packs moves none of them', async () => {
    const { g, pair } = await twoPacks();
    const before = g.state();
    await say(g, '*i wait and watch*');
    await g.reply('One of the eastern pair slinks closer.', { expected: {}, deltas: [{ seq: 1, type: 'position', who: pair[0], band: 'SHORT', cover: 'none' }] });
    let s = g.state();
    assert.deepEqual(bands(s, pair), ['SHORT', 'MEDIUM']);
    assert.deepEqual(bands(s, W), bands(before, W));
    await say(g, '*i wait and watch*');
    const r = await g.reply('The wolves close in.', { expected: {}, deltas: [{ seq: 1, type: 'position', who: 'the wolves', band: 'ENGAGED', cover: 'none' }] });
    s = g.state();
    assert.ok(![...pair, ...W].some((id) => s.scene.positions[id]?.band === 'ENGAGED'), 'nobody picked');
    assert.ok(rejectedRules(r).includes('group_unclear'));
});

// ------------------------------------------------------------------------------------------------ F. regressions (31-35)
test('patch 5 (31): Patch 2 holds: a search and a destination both active make "I continue" a question, never a pick', async () => {
    const g = await campaign();
    await say(g, '*I follow the northern road until I find a village*', { type: 'go', to: { new: 'a village' }, quote: 'I follow the northern road until I find a village' });
    await g.reply('Five hours of road, no village.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 300 }] });
    await say(g, '*after that I go to Blackgate, decided*', { type: 'intent.set', goal: 'reach Blackgate', to: 'loc.blackgate', quote: 'after that I go to Blackgate' });
    await g.reply('He walks on.', { expected: {}, deltas: [] });
    const r = await say(g, '*I continue my journey*', CONTINUE);
    assert.equal(r.action, 'panels');
    assert.match(r.panels.join('\n'), /continue which: find a village \(somewhere: a village\) or reach Blackgate \(Blackgate\)\?/);
    assert.match(extractorCatalog(g.state(), content, { c: true }).text, /JOURNEY READY: .*his goal "find a village" \(to find a village, no place yet\)/);
});

test('patch 5 (32): Patch 3 holds on a multi-day journey: nothing hunted, eaten or bought for him; a night on the road heals only when he sleeps by his own decision', async () => {
    const g = await onTheRoad();
    inject(g, [{ t: 'resource.changed', d: { id: 'pc', resource: 'hp', value: 40 } }]);
    const coin = g.state().entities.pc.sheet.coin_cp;
    await say(g, '*I continue my journey*', CONTINUE);
    const r = await g.reply('Two days of road; he snares rabbits, roasts them and sleeps under the stars.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 2880 }, { seq: 2, type: 'memory', text: 'Alaric hunted rabbits on the Blackgate road and ate them', who: [], imp: 6 }, { seq: 3, type: 'recover', who: 'pc', hp: 40, sta: null }] });
    let s = g.state();
    assert.equal(s.entities.pc.sheet.hp, 40);
    assert.equal(s.entities.pc.sheet.coin_cp, coin);
    assert.ok(rejectedRules(r).includes('pc_decision'));
    assert.ok(rejectedRules(r).includes('recover'));
    await say(g, '*I sleep for 8 hours*', { type: 'activity', kind: 'sleep', what: null, minutes: 480, until: null, quote: 'I sleep for 8 hours' });
    await g.reply('He sleeps by the road.', { expected: { 1: { minutes: 480, done: true } }, deltas: [] });
    s = g.state();
    assert.ok(s.entities.pc.sheet.hp > 40, 'his own sleep heals by the recovery rules');
});

test('patch 5 (33, 34): Patch 4 holds on the road: the wolves that fought him are wary, their XP and loot come once, the group stays one group through the next leg', async () => {
    await withRoad(100, async () => {
        const g = await onTheRoad();
        const { rest, fight } = await roadFight(g);
        let s = g.state();
        const xp = s.entities.pc.sheet.xp;
        const loot = Object.values(s.objects).filter((o) => o.source?.how === 'loot').length;
        assert.ok(loot > 0);
        assert.ok(rest.every((id) => s.entities[id].wary), 'the two that watched are wary');
        const r = await g.reply('The two wolves at the treeline lose track of him.', { expected: {}, deltas: [{ seq: 1, type: 'aware', who: 'wolves', level: 'unaware' }] });
        assert.ok(rejectedRules(r).includes('engine_owned'));
        await say(g, '*I continue my journey*', CONTINUE);
        await g.reply('He walks on; the two wolves trail him.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 120 }, wolvesNew('wolves', 2, 'LONG')] });
        s = g.state();
        assert.equal(s.entities.pc.sheet.xp, xp);
        assert.equal(Object.values(s.objects).filter((o) => o.source?.how === 'loot').length, loot);
        assert.equal(new Set(rest.map((id) => s.entities[id].group)).size, 1);
        assert.ok(fight.every((id) => !s.scene.present.includes(id)), 'the dead stay where they fell');
    });
});

test('patch 5 (35): the road is the record\'s: the chat folds to the same state, a swipe of a travel message books the same leg, the extractor prompt is unchanged', async () => {
    await withRoad(35, async () => {
        const g = await onTheRoad();
        await say(g, '*I continue my journey*', CONTINUE);
        const first = outcome(g);
        // a swipe: the same message again
        const r = await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
        void r;
        assert.deepEqual(outcome(g).auth.road, first.auth.road);
        assert.deepEqual(outcome(g).extra, first.extra);
        await g.reply('He walks on.', { expected: NOT_THERE, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
        assert.deepEqual(foldChat(g.chat).state, g.state());
        const ctx = buildContext(g.state(), content, { input: 'x', lastReply: '' });
        assert.ok(ctx.text.length > 0);
    });
});

// ------------------------------------------------------------------------------------------------ review
/** He climbs into a cave of the realm and meets one wolf there; it stays, alive, when he goes. */
async function cave(g, name, ref) {
    await say(g, `*I climb into ${name}*`, { type: 'go', to: { new: name }, quote: `I climb into ${name}` });
    await g.reply(`A single grey wolf growls in ${name}.`, { expected: { 1: { arrived: true, at: { new: { name, kind: 'site', parent: 'realm.duskreach' } }, with: null } }, deltas: [wolvesNew(ref, 1, 'MEDIUM', null, 1)] });
    return g.state().scene.at;
}
async function toRoad(g) {
    await say(g, '*I go back out to the road*', { type: 'go', to: 'realm.duskreach', quote: 'I go back out to the road' });
    await g.reply('He is back on the road.', { expected: { 1: { arrived: true, at: 'realm.duskreach', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 60 }] });
}

test('patch 5 review: one wolf left alive in cave A is not the wolf of cave B elsewhere in the realm; back in cave A a short while later it is the same wolf, hurt as it was', async () => {
    const g = await campaign();
    const a = await cave(g, 'the cave of the falls', 'falls wolf');
    let s = g.state();
    const first = creatures(s)[0].id;
    inject(g, [{ t: 'entity.updated', d: { id: first, set: { profile: { ...s.entities[first].profile, hp: 4 } } } }]);
    await toRoad(g);
    const b = await cave(g, 'the cave under the old oak', 'oak wolf');
    s = g.state();
    assert.notEqual(a, b);
    const here = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature');
    assert.equal(here.length, 1);
    assert.notEqual(here[0], first, 'the wolf of cave B is its own');
    assert.equal(hpOf(s, first), 4, 'the wolf of cave A is untouched');
    assert.equal(s.entities[first].left.at, a, 'and still where it was left');
    // back to cave A within hours: the same wolf, with its 4 HP
    await toRoad(g);
    await say(g, '*I go back into the cave of the falls*', { type: 'go', to: a, quote: 'I go back into the cave of the falls' });
    await g.reply('The wolf is still there, limping.', { expected: { 1: { arrived: true, at: a, with: null } }, deltas: [wolvesNew('wolf', 1, 'MEDIUM', null, 1)] });
    s = g.state();
    assert.deepEqual(s.scene.present.filter((id) => s.entities[id]?.kind === 'creature'), [first]);
    assert.equal(hpOf(s, first), 4);
    assert.equal(creatures(s).length, 2, 'no third wolf');
});
