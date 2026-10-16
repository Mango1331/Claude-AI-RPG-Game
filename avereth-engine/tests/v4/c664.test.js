// c.6.6.4: automatic loot at the end of a fight (materials by body plan with the foe's Rank, stacks, people's gear and
// purse), an escort is done by escorting, saying why he came is no hand-over, the room he paid for, and the c.6.6.3
// campaign of 15.10.2026 loads and goes on unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { applyEvent } from '../../src/state.js';
import { humanSheet } from '../../src/npcgen.js';
import { lootEvents } from '../../src/v4/loot.js';
import { announcedAbandon } from '../../src/v4/planner.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { foldChat, rec, turnBlock } from '../../src/host.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1007.json'), 'utf8'));
/** Live 07.10.2026 at #46 (Alaric in Ashbridge, Mage, planner on); `extra` events added to its last record. */
function live(extra = []) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, 47).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    g.chat.findLast((m) => m.extra?.avereth).extra.avereth.events.push(...extra);
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return rec(g.chat.findLast((m) => m.is_user));
}
const outcomeOf = (r) => r.events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
const lootOf = (s) => Object.values(s.objects).filter((o) => o.source?.how === 'loot' && o.holder?.entity === 'pc');

/** A wolf shows up; Alaric Flame Lances it until the fight is over. */
async function wolfFight(g, species = 'grey wolf', ref = 'wolf') {
    await say(g, '*i look around*');
    await g.reply(`A ${species} slinks out of the ditch.`, { expected: {}, deltas: [{ seq: 1, type: 'creature.new', ref, species, anchor: 'wolf', desc: [`lean ${species}`], count: 1, present: true, band: 'SHORT', stronger: null, threat: null }] });
    const s = g.state();
    const wolf = s.scene.present.filter((id) => s.entities[id]?.kind === 'creature' && s.entities[id].status !== 'dead').at(-1);
    for (let i = 0; i < 10; i++) {
        const r = await say(g, '*flame lance the wolf*', { type: 'use_skill', skill: 'mage.flame_lance', target: wolf, quote: 'flame lance the wolf' });
        if (r.events.some((e) => e.t === 'encounter.ended')) return { wolf, r };
        await g.reply('The fight goes on.', { expected: {}, deltas: [] });
    }
    throw new Error('the wolf did not fall');
}

// ------------------------------------------------------------------------------------------------ 1-11 loot
test('c.6.6.4 loot: a wolf killed in a fight yields F-Rank pelt and fangs into his pack at once, with the Rank as data, no coin, no search, nothing equipped', async () => {
    const g = live();
    const before = structuredClone(g.state().entities.pc.sheet);
    const { wolf, r } = await wolfFight(g);
    const o = outcomeOf(r);
    assert.ok(o.loot?.some((l) => /^F-Rank Grey Wolf Pelt ×1$/.test(l)), JSON.stringify(o.loot));
    const s = g.state();
    const pelt = lootOf(s).find((x) => x.material === 'pelt');
    assert.equal(pelt.rank, 'F');
    assert.equal(pelt.name, 'F-Rank Grey Wolf Pelt');
    assert.equal(s.entities.pc.sheet.inventory[pelt.id], 1, 'shown in the pack');
    assert.ok(lootOf(s).find((x) => x.material === 'fang').qty >= 1);
    assert.equal(s.entities.pc.sheet.coin_cp, before.coin_cp, 'a wolf carries no coin');
    assert.deepEqual(s.entities.pc.sheet.equipment, before.equipment, 'nothing is equipped');
    assert.ok(!r.events.some((e) => e.t === 'check.recorded'), 'no SEARCH check');
    assert.equal(s.entities[wolf].looted, s.encounter === null ? r.events.find((e) => e.t === 'encounter.ended').d.id : s.entities[wolf].looted);
    const block = turnBlock(g.chat, g.chat.findLastIndex((m) => m.is_user), content).context.text;
    assert.match(block, /LOOT \(the engine's automatic loot at the fight's end, already in Alaric's pack\): F-Rank Grey Wolf Pelt/);
    assert.ok(!/nothing is taken automatically/.test(block));
    // "I loot the wolf and skin it" afterwards: nothing more, no check, no second pelt
    await g.reply('The wolf lies still.', { expected: {}, deltas: [] });
    const after = await say(g, '*i loot the wolf and skin it*',
        { type: 'activity', kind: 'search', what: 'loot the wolf', minutes: null, until: null, quote: 'i loot the wolf' },
        { type: 'take', object: { new: 'wolf pelt' }, qty: 1, quote: 'skin it' });
    assert.ok(!after.events.some((e) => e.t === 'check.recorded'));
    assert.match(outcomeOf(after).actions.join(' '), /LOOTED ALREADY/);
    await g.reply('He looks the carcass over; there is nothing more to take.', { expected: {}, deltas: [{ seq: 1, type: 'object.new', name: 'wolf pelt', kind: 'item', qty: 1, unit: null, holder: 'pc', for_quest: null }] });
    assert.equal(lootOf(g.state()).find((x) => x.material === 'pelt').qty, 1);
    assert.equal(Object.values(g.state().objects).filter((x) => /pelt/i.test(x.name) && x.holder?.entity === 'pc').length, 1, 'no second pelt');
});

test('c.6.6.4 loot: a second fight stacks the same material of the same Rank; reload and replay draw nothing again', async () => {
    const g = live();
    await wolfFight(g);
    const first = lootOf(g.state()).find((x) => x.material === 'pelt');
    await g.reply('The wolf lies still.', { expected: {}, deltas: [] });
    const { r } = await wolfFight(g, 'grey wolf', 'second wolf');
    assert.ok(r.events.some((e) => e.t === 'object.added' && e.d.id === first.id));
    const s = g.state();
    assert.equal(s.objects[first.id].qty, 2);
    assert.equal(lootOf(s).filter((x) => x.material === 'pelt').length, 1, 'one stack');
    // reload: the events of the chat give the same pack, twice over
    const again = foldChat(structuredClone(g.chat)).state;
    assert.deepEqual(lootOf(again), lootOf(s));
    assert.deepEqual(lootOf(foldChat(structuredClone(g.chat)).state), lootOf(s));
});

/** The state and encounter of a fight just ended, for the loot rules on their own. */
function ended(foes, { pcEscaped = false, objects = {}, coin = 30 } = {}) {
    const s = { turn: 9, entities: { pc: { id: 'pc', kind: 'pc', sheet: { coin_cp: coin, inventory: {}, equipment: {} } } }, objects: structuredClone(objects), scene: { present: ['pc'] } };
    const combatants = { pc: { id: 'pc', current: { hp: 20, escaped: pcEscaped } } };
    for (const f of foes) {
        s.entities[f.id] = { status: 'dead', ...f.entity, id: f.id };
        combatants[f.id] = { id: f.id, current: { hp: 0, ...(f.current || {}) } };
    }
    return { s, enc: { id: 'enc.t9', combatants } };
}
const wolf = (id, rank, level, extra = {}) => ({ id, entity: { kind: 'creature', species: 'grey wolf', anchor: 'wolf', profile: { anchor: 'wolf', rank, level }, ...extra } });

test('c.6.6.4 loot: an E-Rank wolf yields E-Rank materials worth more; F and E stay separate stacks; the same fight always yields the same', () => {
    const { s, enc } = ended([wolf('mon.e', 'E', 16)], { objects: { 'obj.loot.grey_wolf.pelt.f': { id: 'obj.loot.grey_wolf.pelt.f', name: 'F-Rank Grey Wolf Pelt', qty: 3, holder: { entity: 'pc' }, rank: 'F', value_cp: 8 } } });
    const x = lootEvents(s, content, enc);
    const pelt = x.events.find((e) => e.t === 'object.created' && e.d.object.material === 'pelt').d.object;
    assert.equal(pelt.name, 'E-Rank Grey Wolf Pelt');
    assert.equal(pelt.rank, 'E');
    assert.equal(pelt.id, 'obj.loot.grey_wolf.pelt.e', 'its own stack beside the F-Rank one');
    assert.ok(pelt.value_cp > 8, 'an E-Rank pelt is worth more than an F-Rank one');
    assert.ok(!x.events.some((e) => e.t === 'object.added'));
    assert.deepEqual(lootEvents(s, content, enc), x, 'deterministic');
    const f = ended([wolf('mon.f', 'F', 2)], { objects: { 'obj.loot.grey_wolf.pelt.f': { id: 'obj.loot.grey_wolf.pelt.f', name: 'F-Rank Grey Wolf Pelt', qty: 3, holder: { entity: 'pc' }, rank: 'F' } } });
    assert.ok(lootEvents(f.s, content, f.enc).events.some((e) => e.t === 'object.added' && e.d.id === 'obj.loot.grey_wolf.pelt.f'));
});

test('c.6.6.4 loot: a bandit leaves the gear his sheet carries and a purse that fits him; a goblin a few copper; beasts no coin', () => {
    const bandit = humanSheet(content.templates.get('bandit'), {}, content);
    const { s, enc } = ended([{ id: 'npc.bandit', entity: { kind: 'npc', name: null, template: 'bandit', sheet: bandit } }, { id: 'mon.gob', entity: { kind: 'creature', species: 'cave goblin', anchor: 'goblin', profile: { anchor: 'goblin', rank: 'F', level: 1 } } }, wolf('mon.w', 'F', 1)]);
    const x = lootEvents(s, content, enc);
    const gear = x.events.filter((e) => e.t === 'object.created' && e.d.object.gear).map((e) => e.d.object);
    assert.ok(gear.some((g) => g.name === 'F-Rank Short Blade' && g.gear.slot === 'weapon'));
    assert.ok(gear.some((g) => g.name === 'F-Rank Worn Light Armor' && g.gear.slot === 'armor'));
    const coin = x.events.find((e) => e.t === 'coin.changed');
    const purse = [...content.monsters.loot.purse_cp_by_template.bandit].map((n, i) => n + [0, 4][i]); // bandit + goblin at most
    if (coin) assert.ok(coin.d.delta >= 1 && coin.d.delta <= purse[1], JSON.stringify(coin.d));
    const beasts = ended([wolf('mon.w2', 'F', 1)]);
    assert.ok(!lootEvents(beasts.s, content, beasts.enc).events.some((e) => e.t === 'coin.changed'));
});

test('c.6.6.4 loot: no corpse loot from a foe that fled or survived, from a fight Alaric fled, or from a foe looted before', () => {
    const fled = ended([{ ...wolf('mon.a', 'F', 1), current: { escaped: true } }]);
    fled.s.entities['mon.a'].status = 'alive';
    assert.deepEqual(lootEvents(fled.s, content, fled.enc).events, []);
    const alive = ended([wolf('mon.b', 'F', 1, { status: 'alive' })]);
    assert.deepEqual(lootEvents(alive.s, content, alive.enc).events, []);
    const ran = ended([wolf('mon.c', 'F', 1)], { pcEscaped: true });
    assert.deepEqual(lootEvents(ran.s, content, ran.enc).events, []);
    const twice = ended([wolf('mon.d', 'F', 1, { looted: 'enc.t3' })]);
    assert.deepEqual(lootEvents(twice.s, content, twice.enc).events, []);
});

// ------------------------------------------------------------------------------------------------ 12, 13 escort
const QE = 'quest.wagon_guard_test';
const escort = { id: QE, title: 'Wagon Guard to the Quarry Gate', kind: 'guild_contract', client: 'Ossra Vane', giver: null, rank: 'Novice', level: 1, qtype: 'standard', payout_cp: 140, reward: '140 cp',
    task: 'Escort the pay wagon and its driver to the quarry gate.', desired_end_state: 'The pay wagon and its driver reach the quarry gate.',
    objectives: [{ id: 'o1', verb: 'ESCORT', what: 'the pay wagon and driver', qty: 1, unit: 'wagon', where: 'Quarry Road', status: 'open' }],
    proof: [], source: { board: 'loc.ashbridge.guild_hall', branch: 'loc.ashbridge' }, schedule: { starts_at: null, deadline: null }, status: 'active', taker: 'pc', history: [], details: [], notes: [] };
const gate = { t: 'place.created', d: { place: { id: 'loc.quarry_gate', name: 'Quarry Gate', kind: 'site', parent: 'realm.duskreach', realm: 'realm.duskreach', tags: [], by: 'reply' } } };
const ready = { seq: 9, type: 'quest.ready', quest: QE, note: 'The pay wagon and its driver reached the quarry gate.', alternative: null };

test('c.6.6.4 escort: walking ahead to the gate and waiting while the wagon comes in is no escort: no READY', async () => {
    const g = live([{ t: 'quest.created', d: { quest: escort } }, gate]);
    await say(g, '*i walk to the quarry gate*', { type: 'go', to: 'loc.quarry_gate', quote: 'i walk to the quarry gate' });
    await g.reply('Two hours up the Quarry Road he reaches the gate.', { expected: { 1: { arrived: true, at: 'loc.quarry_gate', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 120 }] });
    await say(g, 'ill wait out here then', { type: 'activity', kind: 'wait', what: 'at the gate', minutes: null, until: null, quote: 'ill wait out here then' });
    const x = await g.reply('An hour later the pay wagon rolls in, its driver unharmed.', { expected: { 1: { minutes: 65, done: true } }, deltas: [
        { seq: 1, type: 'person.new', ref: 'driver', name: 'Pell', role: 'pay wagon driver', desc: ['driver of the pay wagon'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }, ready] });
    assert.ok(!g.state().quests[QE].ready);
    assert.ok(x.record.rejected.some((r) => r.rule === 'quest_escort'));
    assert.ok(x.record.corrections.some((c) => /an escort is done by travelling with the escorted party/.test(c)));
});

test('c.6.6.4 escort: travelling with the wagon to the gate, without any fight, makes it READY', async () => {
    const g = live([{ t: 'quest.created', d: { quest: escort } }, gate]);
    await say(g, '*i go to the counting-house yard*');
    await g.reply('Pell the driver waits by the pay wagon.', { expected: {}, deltas: [
        { seq: 1, type: 'person.new', ref: 'driver', name: 'Pell', role: 'pay wagon driver', desc: ['driver of the pay wagon'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' }] });
    const pell = Object.values(g.state().entities).find((e) => e.name === 'Pell').id;
    await say(g, '*i walk beside the wagon up the quarry road*', { type: 'go', to: 'loc.quarry_gate', quote: 'i walk beside the wagon up the quarry road' });
    const x = await g.reply('Two quiet hours beside the wagon, and the quarry gate opens for them.', { expected: { 1: { arrived: true, at: 'loc.quarry_gate', with: [pell] } }, deltas: [{ seq: 1, type: 'time', minutes: 120 }, ready] });
    const s = g.state();
    assert.ok(s.quests[QE].journey, 'the escort is underway with them');
    assert.equal(s.quests[QE].ready, true, JSON.stringify(x.record.rejected));
});

// ------------------------------------------------------------------------------------------------ 14, 15 give
test('c.6.6.4 give: "here to deliver this crate" says why he came, no hand-over; "here it is, I hand it to you" is one', () => {
    const give = (quote) => [{ seq: 1, type: 'give', object: 'obj.crate', to: 'npc.warden', quote }];
    const said = announcedAbandon('*i pull out my guild slip and say* Alaric Red is the name im with the guild and here to deliver this crate', give('here to deliver this crate'));
    assert.equal(said.kept.length, 0);
    assert.equal(said.dropped[0].rule, 'plan');
    assert.equal(announcedAbandon('Here is the crate, I hand it to you.', give('I hand it to you')).kept.length, 1);
    assert.equal(announcedAbandon("I'm here to deliver this crate *i set it down on the bench for him*", give('here to deliver this crate')).kept.length, 1);
    assert.equal(announcedAbandon('ill just follow you up to hand it over myself', give('hand it over myself')).kept.length, 1, 'the c.6.6.3 hand-over where he goes stays');
});

// ------------------------------------------------------------------------------------------------ 16 lodging
test('c.6.6.4 lodging: going up to the room he just paid for is part of the booking; another room without a go is not', async () => {
    const g = live();
    await say(g, '*i go find the nearest inn*', { type: 'go', to: { new: 'the nearest inn' }, quote: 'i go find the nearest inn' });
    await g.reply('The Tavern by the Gate has rooms; the keeper names prices.', { expected: { 1: { arrived: true, at: { new: { name: 'Tavern by the Gate', kind: 'site', parent: 'loc.ashbridge' } }, with: null } }, deltas: [
        { seq: 1, type: 'person.new', ref: 'keeper', name: null, role: 'tavern keeper', desc: ['broad tavern keeper'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' },
        { seq: 2, type: 'offer', seller: 'keeper', lines: [{ what: 'a proper room for the night', kind: 'service', service: 'lodging', qty: 1, price_cp: 15 }] }] });
    const s0 = g.state();
    const tavern = s0.scene.at;
    const offer = Object.values(s0.offers).find((o) => o.status === 'open' && o.at === tavern && o.lines.some((l) => l.service === 'lodging'));
    await say(g, 'A proper room please *i pay for it*', { type: 'offer.accept', offer: offer.id, lines: ['l1'], qty: null, quote: 'A proper room please *i pay for it*' });
    const x = await g.reply('The keeper shows him up the stairs to a small room above the stable.', { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'Room above the stable', kind: 'interior', parent: tavern } }, with: [], forced_by: null }] });
    assert.ok(!(x.record.rejected || []).some((r) => r.rule === 'no_go'), JSON.stringify(x.record.rejected));
    assert.notEqual(g.state().scene.at, tavern);
    assert.equal(g.state().places[g.state().scene.at].parent, tavern);
    // the next morning, a room elsewhere without a go is still no_go
    const y = await g.reply('He wanders into the keeper\'s private office.', { expected: {}, deltas: [
        { seq: 1, type: 'arrive', at: { new: { name: 'Keeper\'s office', kind: 'interior', parent: 'loc.ashbridge' } }, with: [], forced_by: null }] });
    assert.ok((y.record.rejected || []).some((r) => r.rule === 'no_go'), JSON.stringify(y.record));
});

// ------------------------------------------------------------------------------------------------ 17 the live campaign
test('c.6.6.4 compatibility: the c.6.6.3 campaign of 15.10.2026 loads unchanged (no loot for its old fight, quests and coin as they were) and plays on', async () => {
    const live1015 = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1015.json'), 'utf8'));
    const g = new Chat4(content);
    g.chat = live1015.messages.map((m) => structuredClone(m));
    const folded = foldChat(g.chat);
    assert.deepEqual(folded.errors || [], []);
    const s = folded.state;
    assert.equal(s.entities.pc.sheet.coin_cp, 217);
    assert.equal(s.entities.pc.sheet.xp, 47);
    assert.equal(s.quests['quest.wagon_guard_to_the_quarry_gate'].status, 'completed', 'a completed escort stays completed');
    assert.equal(s.quests['quest.tonic_run_to_the_wayshrine'].status, 'completed');
    assert.equal(s.entities['mon.c1'].status, 'dead');
    assert.ok(!s.entities['mon.c1'].looted, 'the old fight is not looted after the fact');
    assert.equal(lootOf(s).length, 0);
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    const r = await say(g, '*i look at the quest board*', { type: 'board.read', rank: null, quote: 'i look at the quest board' });
    assert.ok(outcomeOf(r).actions.length);
    await g.reply('The board hangs where it did.', { expected: {}, deltas: [] });
    assert.deepEqual(foldChat(g.chat).errors || [], []);
});
