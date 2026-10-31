import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadProductContent } from '../helpers.js';
import { parseBoard, boardRequest, bookBoard, defeatTally } from '../../src/v4/guild.js';
import { boardFor } from '../../src/v4/runtime.js';
import { startCampaign, materialise } from '../../src/engine.js';
import { applyEvent } from '../../src/state.js';
import { skillCostAmount } from '../../src/passives.js';
import { Dice } from '../../src/rng.js';
import { worldPanel } from '../../src/display.js';
import { itemProfile } from '../../src/v4/items.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { setFactEvents } from '../../src/knowledge.js';
import { applyWorld } from '../../src/v4/world.js';
import { buildContext } from '../../src/context.js';
import { generateBoard } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';
import { scaleCreature } from '../../src/npcgen.js';
import { runCommands } from '../../src/commands.js';
import { campaign, say, inject, outcomeOf } from './patch8_lib.js';

const c = await loadProductContent();
const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/run13_boards.json', import.meta.url)));
const copy = structuredClone;
const ranges = [[1, 1], [4, 7], [8, 11], [12, 14], [1, 3]];
function state() {
    const s = copy(fixture.states[8]);
    s.guild.boards = {};
    s.meta.f_progression = true;
    // These tests cover ordinary world hunts, not Dungeon population selection.
    for (const p of Object.values(s.places)) delete p.dungeon;
    return s;
}
const need = s => ({ branch: 'loc.glassmere', rank: 'Novice', day: Math.floor(s.clock.minute / 1440) + 1, have: [], missing: 5, c: true, profile: 'hunt_clear', progression: true });
function listings() {
    return ranges.map(([min, max], i) => ({
        title: `Cull the mire wolves ${i}`, client: 'local herders', rank: 'Novice', level: min, qtype: i === 0 ? 'minor' : 'standard', payout_cp: 50 + i * 25,
        task: `Cull ${i ? 2 : 1} feral wolves at Mire Pasture ${i}.`, desired_end_state: `The ${i ? 2 : 1} feral wolves at Mire Pasture ${i} are defeated.`,
        objectives: [{ verb: 'DEFEAT', what: 'feral wolves', qty: i ? 2 : 1, unit: null, where: `Mire Pasture ${i}` }], proof: [],
        habitat: { species: 'feral wolf', anchor: 'wolf', min_level: min, max_level: max },
    }));
}
const parse = (s, ls = listings(), n = need(s)) => parseBoard(JSON.stringify({ listings: ls }), c, n, s);
function booked() {
    const s = state(), events = [], base = copy(s), n = need(s), r = parse(s);
    assert.equal(r.listings?.length, 5, JSON.stringify(r));
    const emit = e => { events.push(copy(e)); applyEvent(s, e); };
    bookBoard(s, c, n, r.listings, emit);
    return { s, base, events, emit, quests: Object.values(s.quests).filter(q => q.hunt) };
}
function beast(s, emit, at, id = 'mon.test', more = {}) {
    emit({ t: 'entity.created', d: { entity: { id, kind: 'creature', name: null, species: 'feral wolf', anchor: 'wolf', status: 'alive', descriptors: ['feral wolf'], location: s.places[at]?.realm || s.scene.location, at, ...more } } });
    s.scene.at = at;
    materialise(s, c, Dice.from(s), emit, id);
    return s.entities[id];
}

test('F progression (B1 .130): world progression is the current rule, no campaign switch; the start names its build', () => {
    const opts = { runtime: 'v4', firstMessage: 'Location: outside Alderwatch, Valedorn Crown', seed: 7 };
    for (const more of [{ ruleset: 2 }, { ruleset: 1 }, { ruleset: 2, planner: false }]) {
        const start = startCampaign(c, { ...opts, ...more })[0].d;
        assert.equal('f_progression' in start, false); assert.match(start.engine_version, /^\d+\.\d+\.\d+-c\./);
    }
});
test('F progression: live board requests select world progression without changing the 5-notice family', () => {
    const s = state(), n = boardFor(s, c, [{ seq: 1, type: 'board.read', rank: 'Novice' }], { c: true });
    assert.equal(n.profile, 'count_hunt_clear'); assert.equal(n.progression, true);
    const r = boardRequest(s, c, n);
    assert.match(r.system, /habitat/); assert.match(r.system, /12.{0,8}14/);
    const before = r.messages;
    s.entities.pc.sheet.level = 14;
    assert.deepEqual(boardRequest(s, c, n).messages, before, 'world offers never use the PC level');
});
test('F progression: a complete world-bound F board validates with one weak introductory hunt', () => {
    const r = parse(state()); assert.equal(r.listings?.length, 5, JSON.stringify(r)); assert.equal(r.refused.length, 0);
});
test('F progression: all-L1 replacement boards and mismatched quest recommendations are refused', () => {
    const s = state(), low = listings().map(l => ({ ...l, level: 1, habitat: { ...l.habitat, min_level: 1, max_level: 3 } }));
    const refused = parse(s, low);
    assert.ok(refused.errors.length || !refused.listings || refused.listings.length < 5, 'a fresh board must expose the full F range');
    const ls = listings(); ls[2].level = 1;
    assert.ok(parse(s, ls).refused.some(x => /level|population|habitat/i.test(x.why)));
});
test('F progression: a population cannot be assigned to a settlement or an unrelated species', () => {
    const s = state(), ls = listings(); ls[2].objectives[0].where = 'Glassmere';
    assert.ok(parse(s, ls).refused.length);
    const other = listings(); other[2].habitat.species = 'cave beetle'; other[2].habitat.anchor = 'arthropod';
    assert.ok(parse(s, other).refused.length);
});
test('F progression: booking fixes a reported world population without spawning or moving anyone', () => {
    const { s, base, events, quests } = booked();
    assert.equal(quests.length, 5);
    assert.deepEqual(s.scene, base.scene);
    assert.deepEqual(Object.keys(s.entities), Object.keys(base.entities));
    const p = s.places[quests[2].hunt.at];
    assert.equal(p.name, 'Mire Pasture 2'); assert.equal(p.known, 'reported');
    assert.deepEqual(p.population.levels, [8, 11]);
    assert.ok(events.some(e => e.t === 'place.created'));
});
test('F progression: matching creatures use their local population and stay fixed after PC level changes', () => {
    const { s, emit, quests } = booked();
    const e = beast(s, emit, quests[2].hunt.at);
    assert.ok(e.profile.level >= 8 && e.profile.level <= 11);
    assert.equal(e.population_at, quests[2].hunt.at);
    const profile = copy(e.profile); s.entities.pc.sheet.level = 14;
    materialise(s, c, Dice.from(s), emit, e.id);
    assert.deepEqual(e.profile, profile);
});
test('F progression: unrelated wildlife and remote records do not inherit the PC current hunting site', () => {
    const { s, emit, quests } = booked();
    const at = quests[2].hunt.at;
    const rat = beast(s, emit, at, 'mon.rat', { species: 'rat', anchor: 'rat' });
    assert.equal(rat.population_at, undefined);
    s.scene.at = at;
    const remote = beast(s, emit, quests[0].hunt.at, 'mon.remote');
    assert.ok(remote.profile.level <= 3);
});
test('F progression: only the contracted population counts, not same-kind kills elsewhere or imported weak foes', () => {
    const { s, emit, quests } = booked(), q = quests[2];
    q.status = 'active'; q.history.push({ turn: s.turn, status: 'active' });
    const right = beast(s, emit, q.hunt.at, 'mon.right');
    const elsewhere = beast(s, emit, quests[0].hunt.at, 'mon.elsewhere');
    const weak = beast(s, emit, q.hunt.at, 'mon.weak', { level: 1 });
    for (const e of [right, elsewhere, weak]) setFactEvents(s, { s: e.id, p: 'status', o: 'dead', source: { kind: 'engine' } }).forEach(emit);
    assert.equal(defeatTally(s, c, q)[0].killed, 1);
});
test('F progression: published populations cannot be overwritten by a later board', () => {
    const { s, quests } = booked(), ls = listings();
    ls[2].habitat.min_level = 4; ls[2].habitat.max_level = 7; ls[2].level = 5;
    assert.ok(parse(s, ls).refused.some(x => /established|population|habitat/i.test(x.why)));
    assert.deepEqual(s.places[quests[2].hunt.at].population.levels, [8, 11]);
});
test('F progression: JSON event replay preserves populations, contracts and creature levels', () => {
    const { s, base, events, emit, quests } = booked(); beast(s, emit, quests[3].hunt.at);
    const replay = copy(base); for (const e of JSON.parse(JSON.stringify(events))) applyEvent(replay, e);
    assert.deepEqual(replay.places, s.places); assert.deepEqual(replay.quests, s.quests); assert.deepEqual(replay.entities, s.entities);
});
test('F progression: a board request without world progression (an older rank\'s profile) needs no habitat', () => {
    // B1 (.130): no campaign is without world progression any more; boardFor still asks a non-Novice rank without it
    const s = state();
    const ls = listings().map(({ habitat, ...l }) => ({ ...l, level: 1 }));
    const n = { ...need(s) }; delete n.progression;
    assert.equal(parse(s, ls, n).listings?.length, 5);
});
test('F progression: P2 gives Bolt a real cost benefit, remains monotonic and never makes a paid skill free', () => {
    const bolt = c.skills.get('mage.arcane_bolt');
    assert.equal(skillCostAmount(c, bolt, 2), 10, 'historical campaign cost is unchanged');
    assert.deepEqual([1, 2, 3, 4, 5].map(p => skillCostAmount(c, bolt, p, null, true)), [10, 9, 9, 9, 9]);
    for (let amount = 1; amount <= 30; amount++) {
        const skill = { ...bolt, cost: { ...bolt.cost, amount } };
        const costs = [1, 2, 3, 4, 5].map(p => skillCostAmount(c, skill, p, null, true));
        assert.ok(costs.every(n => n >= 1)); assert.ok(costs.every((n, i) => !i || n <= costs[i - 1]));
        if (amount > 1) assert.ok(costs[1] < costs[0]);
    }
});
test('F progression: shop System card exposes actual profile, lot price and equipped comparison', () => {
    const s = state(), id = 'npc.smith';
    s.entities[id] = { id, kind: 'npc', name: 'Alda', descriptors: ['merchant'] }; s.scene.present.push(id);
    const profile = itemProfile(c, { name: 'Ashwood Staff' });
    s.entities.pc.sheet.equipment.weapon = { id: 'test_staff', name: 'Starter Staff', slot: 'weapon', matk: 10 };
    s.offers['offer.test'] = { id: 'offer.test', seller: id, at: s.scene.at, status: 'open', lines: [{ id: 'l1', kind: 'goods', what: 'Ashwood Staff', qty: 1, price_cp: 240, profile }] };
    const text = worldPanel(s, c, { state: s, events: [] });
    assert.match(text, /SHOP.*Alda/); assert.match(text, /240 cp/); assert.match(text, /MATK 6/); assert.match(text, /equipped.*10.*-4|equipped.*10.*−4/i);
    s.offers['offer.test'].status = 'accepted'; assert.doesNotMatch(worldPanel(s, c, { state: s, events: [] }), /SHOP.*Alda/);
});
test('F progression: Guild reading exposes a priced manual source, normal purchase and study really learn it', async () => {
    const g = await campaign(c, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward', fProgression: true });
    const s = g.state(), hall = Object.values(s.places).find(p => (p.tags || []).includes('guild_hall'));
    inject(g, [{ t: 'scene.moved', d: { at: hall.id, location: hall.realm, place: hall.name } }, { t: 'coin.changed', d: { id: 'pc', value: 500, delta: 450 } }]);
    inject(g, [{ t: 'entity.created', d: { entity: { id: 'npc.clerk', kind: 'npc', name: 'Lena', descriptors: ['Guild clerk'], at: hall.id, location: hall.realm, status: 'alive' } } },
        { t: 'scene.entered', d: { id: 'npc.clerk', band: 'SHORT' } }]);
    // A previously posted board does not prevent access to the Guild's ordinary teaching material.
    const st = g.state(), branch = st.places[hall.id].parent;
    inject(g, [{ t: 'board.refreshed', d: { key: `${branch}:Novice`, branch, rank: 'Novice', day: 999, listings: [] } }]);
    await say(g, 'I read the Guild board.', { type: 'board.read', rank: 'Novice' });
    const offer = Object.values(g.state().offers).find(o => o.stock === 'manuals' && o.status === 'open');
    assert.ok(offer, outcomeOf(g)?.actions?.join('\n'));
    const manual = offer.lines.find(l => l.profile?.fn === 'mend'); assert.ok(manual);
    // B1 (.130): the F balance price (80 cp) is the current Guild manual price
    assert.equal(manual.price_cp, 80);
    await say(g, 'I buy the Primer of Mend for 80 copper.', { type: 'offer.accept', offer: offer.id, lines: [manual.id], qty: 1 });
    const obj = Object.values(g.state().objects).find(o => o.holder?.entity === 'pc' && o.profile?.source === 'manual' && o.profile.fn === 'mend');
    assert.ok(obj); assert.equal(g.state().entities.pc.sheet.coin_cp, 420);
    const gift = await g.reply('Lena hands him the Primer of Mend he just bought.', { expected: {}, deltas: [
        { seq: 1, type: 'object.new', name: 'Primer of Mend', kind: 'document', qty: 1, unit: null, holder: 'npc.clerk', for_quest: null, in: null, effect: null, teaches: { source: 'manual', fn: 'mend', tags: null, aspects: null } },
        { seq: 2, type: 'object.move', object: { new: 'Primer of Mend' }, qty: 1, to: 'pc' },
    ] });
    assert.equal(Object.values(g.state().objects).filter(o => o.holder?.entity === 'pc' && o.profile?.fn === 'mend').length, 1, JSON.stringify(gift.record?.rejected));
    for (let day = 0; day < 5; day++) {
        await say(g, 'I study the Primer of Mend for two hours.', { type: 'activity', kind: 'study', what: 'Primer of Mend', minutes: 120, until: null, learn: 'mend', teacher: null, material: obj.id, tags: null, aspects: null });
        if (Object.values(g.state().skill_defs || {}).some(d => d.effects?.[0]?.kind === 'heal')) break;
        await say(g, 'I sleep until morning.', { type: 'activity', kind: 'sleep', what: null, minutes: null, until: 'morning' });
    }
    assert.ok(Object.values(g.state().skill_defs || {}).some(d => d.effects?.[0]?.kind === 'heal'));
    assert.equal(g.state().objects[obj.id].holder.entity, 'pc');
});

test('F progression: actual arrival and extraction bind a creature to the reported target population', () => {
    const { s, quests } = booked(), q = quests[1], at = q.hunt.at;
    s.last.outcome = { c: true, auth: { c: true, go: { seq: 1, to: at }, gos: [{ seq: 1, to: at }], timeCap: 180 }, expected_keys: { 1: 'go' } };
    const r = applyWorld(s, c, { scene: at, expected: { 1: { arrived: true, at, with: null } }, deltas: [
        { seq: 1, type: 'arrive', at, with: null, because: 1 },
        // Package C (.132): the report states the membership (the target population) and the age
        { seq: 2, type: 'creature.new', ref: 'cre.mire_pack', species: 'feral wolf', anchor: 'wolf', desc: ['feral wolves'], count: 2, present: true, band: 'MEDIUM', more: true, scene: at, population: at, life_stage: 'adult' },
    ] }, { msg: 20, prose: 'Alaric reaches the pasture. Two feral wolves circle the trough.' });
    assert.equal(r.state.scene.at, at);
    const foes = Object.values(r.state.entities).filter(e => e.population_at === at);
    assert.equal(foes.length, 2, JSON.stringify(r.record?.rejected));
    assert.ok(foes.every(e => e.profile.level >= 4 && e.profile.level <= 7));
    assert.deepEqual(validateState(r.state, c), []);
});
test('F progression: generator repair uses the same population and diversity validator, without partial booking', async () => {
    const s = state(), n = need(s), original = copy(s), bad = listings(); bad[2].habitat.anchor = 'ogre';
    let calls = 0;
    const r = await generateBoard(async () => JSON.stringify({ listings: ++calls === 1 ? bad : listings() }), s, c, n);
    assert.equal(calls, 2); assert.equal(r.listings.length, 5); assert.deepEqual(s, original);
    calls = 0;
    const fail = await generateBoard(async () => { calls++; return JSON.stringify({ listings: bad }); }, s, c, n);
    assert.equal(calls, 2); assert.equal(fail.listings.length, 0); assert.deepEqual(s, original);
});
test('F progression: four outdoor hunts plus the existing Dungeon clearance still validate', () => {
    const s = copy(fixture.states[8]); s.guild.boards = {}; s.meta.f_progression = true;
    const clear = JSON.parse(fixture.boards[0].answer).listings[4];
    const r = parse(s, [...listings().slice(0, 4), clear]);
    assert.equal(r.listings?.length, 5, JSON.stringify(r));
});
test('F progression: a hunt inside a Dungeon never replaces its canonical slot levels with a habitat', () => {
    const s = copy(fixture.states[8]); s.guild.boards = {}; s.meta.f_progression = true;
    const ls = listings(); ls[2].objectives[0].where = 'Glimmerdeep Grotto, level 1';
    assert.ok(parse(s, ls).refused.length);
});
test('F progression: the narrator receives the same world population before meeting its creatures', () => {
    const { s, quests } = booked(); const q = quests[2]; q.status = 'active';
    const r = buildContext(s, c, { outcome: { c: true, auth: { c: true, gos: [{ to: q.hunt.at }] } }, input: 'I go to Mire Pasture 2.' });
    assert.match(r.text, /ESTABLISHED WORLD POPULATIONS/); assert.match(r.text, /individual levels 8-11/);
});
test('F progression: a returned kill cannot be paid twice; historical hunts retain broad regional counting', () => {
    const { s, emit, quests } = booked(), q = quests[0], hall = s.scene.at;
    resolveCommands(s, c, [{ seq: 1, type: 'quest.accept', quest: q.id, quote: 'I accept this contract.' }], emit, { c: true });
    const e = beast(s, emit, q.hunt.at);
    setFactEvents(s, { s: e.id, p: 'status', o: 'dead', source: { kind: 'engine' } }).forEach(emit);
    s.scene.at = hall;
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    const ready = applyWorld(s, c, { scene: hall, expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: q.id, note: 'The feral wolf is defeated.', depends_on: [] }] }, { msg: 40 });
    ready.events.forEach(emit);
    assert.equal(q.ready, true);
    const cp = s.entities.pc.sheet.coin_cp, xp = s.entities.pc.sheet.xp;
    resolveCommands(s, c, [{ seq: 2, type: 'quest.turn_in', quest: q.id, quote: 'I turn in this contract.' }], emit, { c: true });
    assert.equal(q.status, 'completed'); assert.equal(s.entities.pc.sheet.coin_cp, cp + q.payout_cp);
    const after = copy(s.entities.pc.sheet);
    resolveCommands(s, c, [{ seq: 3, type: 'quest.turn_in', quest: q.id, quote: 'I turn it in again.' }], emit, { c: true });
    assert.deepEqual(s.entities.pc.sheet, after); assert.ok(after.xp !== xp || after.level > 1);
    const old = copy(q); delete old.hunt; old.history = [{ status: 'active', turn: 0 }];
    assert.equal(defeatTally(s, c, old)[0].killed, 1);
});

test('F progression: an unconfirmed arrival does not spawn local targets or complete a hunt', () => {
    const { s, quests } = booked(), q = quests[1], at = q.hunt.at, from = s.scene.at;
    s.last.outcome = { c: true, auth: { c: true, go: { seq: 1, to: at }, gos: [{ seq: 1, to: at }], timeCap: 180 }, expected_keys: { 1: 'go' } };
    const r = applyWorld(s, c, { scene: at, expected: { 1: { arrived: false, at: null, with: null } }, deltas: [
        { seq: 1, type: 'creature.new', ref: 'cre.pasture', species: 'feral wolf', anchor: 'wolf', desc: [], count: 2, present: true, band: 'MEDIUM', more: true, scene: at },
        { seq: 2, type: 'quest.ready', quest: q.id, note: 'The wolves are dealt with.', depends_on: [1], scene: at },
    ] }, { msg: 50 });
    assert.equal(r.state.scene.at, from); assert.equal(Object.values(r.state.entities).filter(e => e.population_at === at).length, 0);
    assert.notEqual(r.state.quests[q.id].ready, true);
});
test('F progression: Guild materials need an actual present clerk and cannot be bought remotely', () => {
    const s = state(), events = [], emit = e => { events.push(e); applyEvent(s, e); };
    resolveCommands(s, c, [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'I read the board.' }], emit, { c: true });
    const offer = Object.values(s.offers).find(o => o.stock === 'manuals'); assert.ok(offer);
    const money = s.entities.pc.sheet.coin_cp;
    s.scene.present = ['pc'];
    resolveCommands(s, c, [{ seq: 2, type: 'offer.accept', offer: offer.id, lines: ['mend'], qty: 1, quote: 'I buy the Primer of Mend for 120 copper.' }], emit, { c: true });
    assert.equal(s.entities.pc.sheet.coin_cp, money); assert.equal(offer.status, 'open');
    const absent = state(); absent.scene.present = ['pc'];
    resolveCommands(absent, c, [{ seq: 1, type: 'board.read', rank: 'Novice', quote: 'I read the board.' }], e => applyEvent(absent, e), { c: true });
    assert.equal(Object.values(absent.offers).some(o => o.stock === 'manuals'), false);
});

test('F progression: a reported creature enters under its canonical ID and gets its local profile only when encountered', () => {
    const { s, quests } = booked(), at = quests[2].hunt.at;
    s.last.outcome = { c: true, auth: { c: true, gos: [] }, expected_keys: {} };
    // Package C (.132): a remote sighting states its membership at the place its scene names (membership is no presence)
    const seen = { seq: 1, type: 'creature.new', ref: 'cre.reported_wolf', species: 'feral wolf', anchor: 'wolf', desc: [], count: 1, present: false, band: null, more: true, scene: at, population: at, life_stage: 'adult' };
    const first = applyWorld(s, c, { scene: s.scene.at, expected: {}, deltas: [seen] }, { msg: 60 });
    const created = first.events.find(e => e.t === 'entity.created' && e.d.entity.kind === 'creature');
    const e = created && first.state.entities[created.d.entity.id];
    assert.ok(e, JSON.stringify(first.record?.rejected)); assert.equal(e.profile, undefined); assert.ok(!first.state.scene.present.includes(e.id));
    const before = first.state;
    before.last.outcome = { c: true, auth: { c: true, go: { seq: 1, to: at }, gos: [{ seq: 1, to: at }], timeCap: 180 }, expected_keys: { 1: 'go' } };
    const next = applyWorld(before, c, { scene: at, expected: { 1: { arrived: true, at, with: null } }, deltas: [
        { seq: 1, type: 'arrive', at, with: null, because: 1 }, { seq: 2, type: 'enter', who: e.id, band: 'MEDIUM', scene: at },
    ] }, { msg: 62 });
    assert.equal(Object.keys(next.state.entities).length, Object.keys(first.state.entities).length);
    materialise(next.state, c, Dice.from(next.state), event => applyEvent(next.state, event), e.id);
    assert.equal(next.state.entities[e.id].population_at, at); assert.ok(next.state.entities[e.id].profile.level >= 8);
});

test('F progression: P2 display and a real Bolt agree at exactly nine available MP', async () => {
    const g = await campaign(c, { cls: 'Mage', skills: 'Arcane Bolt + Arcane Ward', fProgression: true });
    const s = g.state(), sheet = copy(s.entities.pc.sheet);
    sheet.skills['mage.arcane_bolt'] = { prof: 2, pp: 0 }; sheet.mp = 9;
    inject(g, [{ t: 'entity.sheet_set', d: { id: 'pc', sheet } },
        { t: 'entity.created', d: { entity: { id: 'mon.cost_wolf', kind: 'creature', anchor: 'wolf', species: 'wolf', descriptors: ['wolf'], status: 'alive', location: s.scene.location, profile: scaleCreature(c.anchors.get('wolf'), 1, 'normal', c) } } },
        { t: 'scene.entered', d: { id: 'mon.cost_wolf', band: 'SHORT' } }]);
    assert.match(runCommands(g.state(), c, '#skill Arcane Bolt').panels.join('\n'), /Cost: 9 MP/);
    await say(g, 'I cast Arcane Bolt at the wolf.', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.cost_wolf' });
    const attack = outcomeOf(g).records?.find(r => r.actor === 'pc' && r.kind === 'attack');
    assert.ok(attack, JSON.stringify(outcomeOf(g))); assert.equal(attack.cost.amount, 9);
    assert.equal(g.state().entities.pc.sheet.mp, 0);
});
