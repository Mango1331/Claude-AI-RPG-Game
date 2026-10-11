// c.6.6.3: the thing set out for him is his to take, a hand-over where he goes is booked there, no READY beside the
// basket in his hands, the goal stays the goal, more living friction, small planner and order fixes (live 11.10.2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { contractReady, completeContract, boardRequest } from '../../src/v4/guild.js';
import { CONTRACT_RULES, HANDOVER_RULES } from '../../src/v4/planner.js';
import { rec } from '../../src/host.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1007.json'), 'utf8'));
const QID = 'quest.medicine_run_test';
const quest = { id: QID, title: 'Medicine Run to Hollow Chapel', kind: 'guild_contract', client: 'Brother Ansel', giver: null, rank: 'Novice', level: 1, qtype: 'minor',
    payout_cp: 80, reward: '80 cp', task: 'Deliver the sealed basket to the chapel keeper at Hollow Ford.', desired_end_state: 'The sealed medicine basket is in the chapel keeper\'s hands.',
    objectives: [{ id: 'o1', verb: 'GET', what: 'the sealed medicine basket', qty: 1, unit: 'basket', where: 'the chandler', status: 'open' },
        { id: 'o2', verb: 'DELIVER', what: 'the sealed medicine basket', qty: 1, unit: 'basket', where: 'the chapel at Hollow Ford', status: 'open' }],
    proof: [], source: { board: 'loc.ashbridge.guild_hall', branch: 'loc.ashbridge' }, schedule: { starts_at: null, deadline: null },
    status: 'active', taker: 'pc', history: [], details: [], notes: [] };
const place = (id, name, parent, kind = 'site') => ({ t: 'place.created', d: { place: { id, name, kind, parent, realm: 'realm.duskreach', tags: [], by: 'reply' } } });
/** Live 07.10.2026 at #46 (Alaric in Ashbridge) with a delivery contract, a shop, a village with its chapel and its keeper. */
function live(extra = []) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, 47).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    g.chat.findLast((m) => m.extra?.avereth).extra.avereth.events.push(
        { t: 'quest.created', d: { quest } },
        place('loc.ashbridge.chandlers_row', "Chandler's Row", 'loc.ashbridge'),
        place('loc.hollow_ford', 'Hollow Ford', 'realm.duskreach', 'settlement'),
        place('loc.hollow_ford.chapel', 'Hollow Ford chapel', 'loc.hollow_ford'),
        { t: 'entity.created', d: { entity: { id: 'npc.maren', kind: 'npc', name: 'Sister Maren', descriptors: ['chapel keeper'], status: 'alive', location: 'loc.hollow_ford', at: 'loc.hollow_ford', card: {}, template: 'commoner' } } },
        ...extra,
    );
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    const r = rec(g.chat.findLast((m) => m.is_user));
    return r.events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
}
const statuses = (o) => o.resolutions.map((r) => r.status);
/** At the chandler's: he walked there, the chandler shows the basket (`holder` as the extractor booked it). */
async function atTheShop(g, holder) {
    await say(g, '*i walk to chandlers row*', { type: 'go', to: 'loc.ashbridge.chandlers_row', quote: 'i walk to chandlers row' });
    await g.reply('The old chandler sets the sealed basket on the counter and pushes it toward Alaric.', { expected: { 1: { arrived: true, at: 'loc.ashbridge.chandlers_row', with: null } }, deltas: [
        { seq: 1, type: 'person.new', ref: 'chandler', name: null, role: 'chandler', desc: ['old man in a wax-stained apron'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' },
        { seq: 2, type: 'object.new', name: 'sealed medicine basket', kind: 'item', qty: 1, unit: null, holder, for_quest: QID },
    ] });
    const s = g.state();
    return { basket: Object.values(s.objects).find((o) => o.name === 'sealed medicine basket'), chandler: s.scene.present.find((id) => (s.entities[id]?.descriptors || []).includes('chandler')) };
}

// ------------------------------------------------------------------------------------------------ 1, 2. take, then go
test('c.6.6.3 take: the basket set out on the counter for him is his to take, and the journey that needs it goes ahead', async () => {
    const g = live();
    const { basket } = await atTheShop(g, 'here');
    assert.deepEqual(basket.holder, { loc: 'loc.ashbridge.chandlers_row' });
    const o = await say(g, '*i take the basket and start my journey to the chapel*',
        { type: 'take', object: basket.id, qty: 1, quote: 'i take the basket' },
        { type: 'go', to: { new: 'the chapel at Hollow Ford' }, needs: 1, quote: 'start my journey to the chapel' });
    assert.deepEqual(statuses(o), ['resolved', 'authorized']);
    assert.equal(g.state().objects[basket.id].holder.entity, 'pc');
});

test('c.6.6.3 take: the contract\'s basket still in the chandler\'s keeping is taken unless he holds it back; the journey follows the take, never ahead of it', async () => {
    const g = live();
    const { basket, chandler } = await atTheShop(g, 'chandler');
    assert.equal(basket.holder.entity, chandler);
    const o = await say(g, '*i nod, take the basket and start my journey to the chapel*',
        { type: 'take', object: basket.id, qty: 1, quote: 'take the basket' },
        { type: 'go', to: { new: 'the chapel at Hollow Ford' }, needs: 1, quote: 'start my journey to the chapel' });
    assert.deepEqual(statuses(o), ['authorized', 'authorized']);
    assert.match(o.actions[0], /unless .* holds it back/);
    assert.match(o.actions[1], /Only once step 1 has happened in the story/);
    assert.equal(g.state().objects[basket.id].holder.entity, chandler, 'nothing is taken before the story has him hand it over');
    // he holds it back for a signature: the basket stays his, no hand-over is booked
    await g.reply('The chandler keeps his hand flat on the basket. "You sign for it first."', { expected: {}, deltas: [] });
    assert.equal(g.state().objects[basket.id].holder.entity, chandler);
    assert.equal(g.state().scene.at, 'loc.ashbridge.chandlers_row');
});

test('c.6.6.3 take: what someone here holds that is no thing of his contract stays theirs, and the step that needed it is not taken', async () => {
    const g = live();
    const { chandler } = await atTheShop(g, 'here');
    await say(g, '*i look at the candles*');
    await g.reply('Candles hang in bundles; the chandler holds a fine beeswax taper.', { expected: {}, deltas: [
        { seq: 1, type: 'object.new', name: 'fine beeswax taper', kind: 'item', qty: 1, unit: null, holder: chandler, for_quest: null },
    ] });
    const taper = Object.values(g.state().objects).find((x) => x.name === 'fine beeswax taper');
    const o = await say(g, '*i take the taper and walk on*',
        { type: 'take', object: taper.id, qty: 1, quote: 'i take the taper' },
        { type: 'go', to: { new: 'the chapel at Hollow Ford' }, needs: 1, quote: 'walk on' });
    assert.deepEqual(statuses(o), ['refused', 'refused']);
    assert.match(o.actions[1], /NOT DONE.*someone else's help does not do it for him/);
});

// ------------------------------------------------------------------------------------------------ 3, 4. hand-over there
/** He holds the basket in Ashbridge (taken from the counter). */
async function carrying() {
    const g = live();
    const { basket } = await atTheShop(g, 'here');
    await say(g, '*i take the basket*', { type: 'take', object: basket.id, qty: 1, quote: 'i take the basket' });
    await g.reply('He lifts the basket off the counter.', { expected: {}, deltas: [] });
    return { g, basket };
}
const arriveAtChapel = { 1: { arrived: true, at: 'loc.hollow_ford', with: null } };

test('c.6.6.3 hand-over: "I\'ll go up and hand it over myself" books the basket into Sister Maren\'s hands there, and the contract is READY and paid at the Guild', async () => {
    const { g, basket } = await carrying();
    const o = await say(g, 'ill go up to the chapel and hand it over to sister maren myself',
        { type: 'go', to: 'loc.hollow_ford', quote: 'ill go up to the chapel' },
        { type: 'give', object: basket.id, to: { new: 'Sister Maren' }, needs: 1, quote: 'hand it over to sister maren myself' });
    assert.deepEqual(statuses(o), ['authorized', 'conditional']);
    assert.match(o.actions[1], /GIVES, when he reaches Sister Maren/);
    const x = await g.reply('At the chapel Sister Maren takes the basket from his hands and checks the seal.', { expected: arriveAtChapel, deltas: [
        { seq: 1, type: 'time', minutes: 240 },
        { seq: 2, type: 'enter', who: 'npc.maren' },
        { seq: 3, type: 'object.move', object: basket.id, qty: 1, to: 'npc.maren' },
        { seq: 4, type: 'quest.ready', quest: QID, note: 'The basket is in Sister Maren\'s hands.', alternative: null },
    ] });
    const s = g.state();
    assert.equal(s.objects[basket.id].holder.entity, 'npc.maren', JSON.stringify({ rejected: x.record.rejected, at: s.scene.at, present: s.scene.present }));
    assert.equal(s.quests[QID].ready, true);
    assert.ok(!(x.record.rejected || []).length, JSON.stringify(x.record.rejected));
    assert.ok(!x.record.corrections.some((c) => /NOT READY|IN PROGRESS/.test(c)), x.record.corrections.join(' | '));
    assert.equal(contractReady(s, content, s.quests[QID], { c: true }).ok, true);
    const paid = [];
    assert.equal(completeContract(structuredClone(s), content, structuredClone(s.quests[QID]), (e) => paid.push(e), { step: 1, c: true }).ok, true);
});

test('c.6.6.3 hand-over: the story putting the basket into her hands without his hand-over is no delivery: no READY, and the goal is not moved to explain it', async () => {
    const { g, basket } = await carrying();
    await say(g, 'ill just follow you up *i follow her up to sister maren*', { type: 'go', to: 'loc.hollow_ford', quote: 'i follow her up to sister maren' });
    const x = await g.reply('Sister Maren takes the basket from his hands and checks the seal.', { expected: arriveAtChapel, deltas: [
        { seq: 1, type: 'enter', who: 'npc.maren' },
        { seq: 2, type: 'object.move', object: basket.id, qty: 1, to: 'npc.maren' },
        { seq: 3, type: 'quest.ready', quest: QID, note: 'Delivered into Sister Maren\'s hands.', alternative: null },
    ] });
    const s = g.state();
    assert.equal(s.objects[basket.id].holder.entity, 'pc');
    assert.ok(!s.quests[QID].ready, 'no READY beside the basket in his hands');
    assert.ok(x.record.rejected.some((r) => r.rule === 'quest_delivery'));
    assert.ok(x.record.corrections.some((c) => /do not invent a new recipient/.test(c)), x.record.corrections.join(' | '));
    // now he hands it to her: booked, and the reply that tells it makes the contract READY
    const o = await say(g, '*i hand sister maren the basket*', { type: 'give', object: basket.id, to: 'npc.maren', quote: 'i hand sister maren the basket' });
    assert.deepEqual(statuses(o), ['resolved']);
    await g.reply('She takes it in both hands.', { expected: {}, deltas: [{ seq: 1, type: 'quest.ready', quest: QID, note: 'Delivered.', alternative: null }] });
    assert.equal(g.state().quests[QID].ready, true);
    assert.equal(contractReady(g.state(), content, g.state().quests[QID], { c: true }).ok, true);
});

test('c.6.6.3 hand-over: carrying it along, showing it or a hand-over another day is no give (planner rules); a give where he does not go stays refused', async () => {
    assert.match(HANDOVER_RULES, /go, then give \{object, to\} with "needs" the go/);
    assert.match(HANDOVER_RULES, /Going somewhere only to ask whether they want it, carrying it along, or handing it over another day is no give/);
    assert.match(HANDOVER_RULES, /"Tomorrow I'll take the permit to the harbourmaster\." → \{"commands":\[\]\}/);
    const { g, basket } = await carrying();
    const o = await say(g, '*i hand the basket to sister maren*', { type: 'give', object: basket.id, to: { new: 'Sister Maren' }, quote: 'i hand the basket to sister maren' });
    assert.deepEqual(statuses(o), ['refused'], 'no go in this message: she is not here to take it');
});

// ------------------------------------------------------------------------------------------------ 7. small fixes
test('c.6.6.3 turn-in: a farewell to the recipient is no turn-in; "back to the Guild" from a village without a branch means the contract\'s hall', async () => {
    assert.match(CONTRACT_RULES, /Taking leave of the contract's client or recipient \("that's my part done then", "glad it arrived"\) is no turn_in/);
    const { g, basket } = await carrying();
    await say(g, '*i walk to hollow ford*', { type: 'go', to: 'loc.hollow_ford', quote: 'i walk to hollow ford' });
    await g.reply('He reaches Hollow Ford.', { expected: { 1: { arrived: true, at: 'loc.hollow_ford', with: null } }, deltas: [{ seq: 1, type: 'time', minutes: 240 }] });
    assert.ok(basket);
    const o = await say(g, '*i head back to the guild hall to turn it in*',
        { type: 'go', to: { new: 'the Guild hall' }, quote: 'i head back to the guild hall' },
        { type: 'quest.turn_in', quest: QID, needs: 1, quote: 'to turn it in' });
    assert.equal(o.auth.gos[0].to, 'loc.ashbridge.guild_hall');
    assert.deepEqual(statuses(o), ['authorized', 'conditional']);
});

test('c.6.6.3 road: someone met on a long road is met on the road, not remembered at the shop he left (live 11.10.2026, the Reed Flats boy)', async () => {
    const { g } = await carrying();
    await say(g, '*i start my journey to the chapel*', { type: 'go', to: { new: 'the chapel at Hollow Ford' }, quote: 'i start my journey to the chapel' });
    await g.reply('Four hours down the river road a boy from the Reed Flats runs up to warn him about the causeway.', { expected: { 1: { arrived: false, at: null, with: null } }, deltas: [
        { seq: 1, type: 'time', minutes: 240 },
        { seq: 2, type: 'person.new', ref: 'boy', name: null, role: 'Reed Flats boy', desc: ['barefoot boy'], present: true, relevant: true, threat: false, at: null, band: 'SHORT' },
        { seq: 3, type: 'memory', text: 'A boy from Reed Flats warned Alaric about the causeway', who: ['boy'], imp: 6 },
    ] });
    const s = g.state();
    const boy = Object.values(s.entities).find((e) => (e.descriptors || []).includes('reed flats boy'));
    assert.equal(s.scene.at, 'realm.duskreach');
    assert.ok(s.scene.present.includes(boy.id), 'he is where Alaric is');
    const met = Object.values(s.memories || {}).concat(s.memory || []).flat().filter((m) => (m.who || []).includes(boy.id));
    assert.ok(met.length && met.every((m) => !/Chandler/.test(m.place || '')), JSON.stringify(met.map((m) => m.place)));
});

// ------------------------------------------------------------------------------------------------ 6. friction
test('c.6.6.3 quest friction: living actors with their own aims first, water and weather secondary and not twice running, the goal never moved; the board says why a road needs a Guild hand', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    const friction = contract.slice(contract.indexOf('QUEST FRICTION\n-'), contract.indexOf('When coincidence genuinely occurs'));
    assert.match(friction, /Prefer a complication with a living actor that wants something/);
    assert.match(friction, /bandits or waylayers, thieves, a rival crew/);
    assert.match(friction, /Weather, high water, a washed-out ford or a blocked road are valid but secondary/);
    assert.match(friction, /not again when the recent story already used one/);
    assert.match(friction, /no fight is ever guaranteed/);
    assert.match(friction, /never invent a new recipient, address or condition/);
    assert.match(friction, /a safe local errand may stay uneventful/);
    const g = live();
    const board = JSON.stringify(boardRequest(g.state(), content, { branch: 'loc.ashbridge', rank: 'Novice', missing: 5, day: 1, have: [], c: true }));
    assert.match(board, /Weather and high water are one possible reason among many, not the default/);
});
