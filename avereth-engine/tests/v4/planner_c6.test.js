// Prototype C, build 4.3.0-c.6 (docs/PROTOTYPE_C.md §14): consequences, not inconvenience. The live run of 04.10.2026
// 16:35 (tests/v4/live_1004b.json: messages 0-30 with their texts and events, the raw planner and extractor answers of
// the turns replayed here) and a fresh Redmarch member for the Guild board of the day.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT, scriptedDice } from '../helpers.js';
import { Chat4, generatorListing } from './harness.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { rec, turnBlock } from '../../src/host.js';
import { buildCatalog, journeyReady } from '../../src/v4/catalog.js';
import { catalogText } from '../../src/v4/interpret.js';
import { resolveCommands } from '../../src/v4/commands.js';
import { applyWorld } from '../../src/v4/world.js';
import { applyEvent } from '../../src/state.js';
import { SLIP_READY, SLIP_DONE, contractReady, boardRequest } from '../../src/v4/guild.js';
import { NARRATOR_CONTRACT_REVISION } from '../../src/util.js';
import { mapPlan, planContext, plannerUser } from '../../src/v4/planner.js';
import { sceneHandle } from '../../src/v4/scene_handles.js';
import { worldPanel } from '../../src/display.js';
import { guardCommands } from '../../src/v4/agency.js';
import { extractorUser } from '../../src/v4/extract.js';
import { perceiveAll } from '../../src/engine.js';
import { initEncounter, npcDecide } from '../../src/combat.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1004b.json'), 'utf8'));
const BOARS = 'quest.clear_the_root_hollow_of_thorn_backed_boars';
const SLIP = 'obj.slip.clear_the_root_hollow_of_thorn_backed_boars';
const AW_HALL = 'loc.alderwatch.guild_hall';
const HALL = 'loc.redmarch.guild_hall';

function planner(g) {
    const ask = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('plan')) return ask(req);
        g.planRequest = req;
        const a = g.plans.shift();
        return a === undefined ? null : typeof a === 'string' ? a : JSON.stringify(a);
    };
    return g;
}
/** The live chat up to message `upto`, the planner on. */
function live(upto) {
    const g = new Chat4(content);
    g.chat = fx.messages.slice(0, upto + 1).map((m) => ({ mes: m.mes, is_user: m.user, is_system: !!m.system, extra: m.events ? { avereth: { v: 3, events: structuredClone(m.events) } } : {} }));
    return planner(g);
}
/** A player message with the planner's answer(s); `planner: false` plays it on A with the interpreter's commands. */
async function say(g, text, plans, { planner: on = true, commands = [] } = {}) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [...plans];
    g.commands = commands;
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: on }, llm: g.llm });
    if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    g.learnIds();
    return r;
}
const last = (g) => rec(g.chat.findLast((m) => m.is_user));
const outcomeOf = (g) => last(g).events.findLast((e) => e.t === 'outcome.recorded').d.outcome;
const block = (g) => turnBlock(g.chat, g.chat.findLastIndex((m) => m.is_user), content).context.text;
const plan = (...commands) => ({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) });
const arrives = (...places) => ({ expected: Object.fromEntries(places.map(([k, at]) => [k, { arrived: true, at, with: null }])), deltas: [] });
const nextDay = (g) => rec(g.chat.at(-1)).events.push({ t: 'time.advanced', d: { minutes: 1440, why: 'test' } });
const boardCalls = (g) => g.calls.filter((c) => c.purpose === 'board').length;
const listedOn = (s) => (s.guild.boards[`loc.redmarch|Novice`]?.listings || []).filter((id) => s.quests[id]?.status === 'listed');

const listing = (title, objectives, proof = []) => ({
    id: `quest.${title.toLowerCase().replace(/[^a-z]+/g, '_')}`, title, client: 'a Redmarch client', rank: 'Novice', level: 2, qtype: 'standard', payout_cp: 60,
    task: `${title}.`, desired_end_state: `${title}: done.`, objectives, proof,
});
const DAY1 = [
    listing('Cull the Mill Rats', [{ verb: 'DEFEAT', what: 'giant rats', qty: 3, unit: 'rats' }], [{ kind: 'object', what: 'rat tail', qty: 3, unit: 'tails', consume: false }]),
    listing('Harvest Marsh Adder Venom', [{ verb: 'GATHER', what: 'venom sacs', qty: 2, unit: 'sacs' }], [{ kind: 'object', what: 'venom sac', qty: 2, unit: 'sacs' }]),
    listing('Deliver the Toll Ledger', [{ verb: 'DELIVER', what: 'sealed toll ledger', qty: 1, where: 'the Millbrook toll house' }]),
    listing('Escort the Wool Cart', [{ verb: 'ESCORT', what: 'wool cart', qty: 1, where: 'Millbrook' }]),
    listing('Drive Off the Carrion Crows', [{ verb: 'ATTACK', what: 'carrion crows', qty: 2 }]),
];
const DAY2 = [
    listing('Clear the Wasp Nest', [{ verb: 'DEFEAT', what: 'giant wasps', qty: 4, unit: 'wasps' }]),
    listing('Cull the Ditch Toads', [{ verb: 'DEFEAT', what: 'ditch toads', qty: 3, unit: 'toads' }]),
    listing('Fetch the Lamp Oil', [{ verb: 'GET', what: 'barrel of lamp oil', qty: 1 }]),
    listing('Escort the Salt Wagon', [{ verb: 'ESCORT', what: 'salt wagon', qty: 1, where: 'Ford Narrows' }]),
    listing('Drive the Foxes from the Henyard', [{ verb: 'ATTACK', what: 'foxes', qty: 2 }]),
];

/** A fresh Warrior, registered at the Redmarch Guild hall, the planner on. */
async function member(listings = DAY1) {
    const g = planner(new Chat4(content, { listings }));
    await g.player('Warrior');
    await g.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    await say(g, '*i walk to the guild*', [plan({ type: 'go', to: HALL, quote: 'i walk to the guild' })]);
    await g.reply('He reached the Guild hall.', arrives([1, HALL]));
    await say(g, '*i register*', [plan({ type: 'guild.register', quote: 'i register' })]);
    await g.reply('The clerk named the fee.');
    await say(g, '*i pay the fee*', [plan({ type: 'offer.accept', offer: 'offer.registration', lines: ['l1'], qty: null, quote: 'i pay the fee' })]);
    await g.reply('He paid and was registered.');
    return g;
}
const read = async (g) => { await say(g, '*i read the novice board*', [plan({ type: 'board.read', rank: null, quote: 'i read the novice board' })]); await g.reply('He read the board.'); };
const take = async (g, id) => { await say(g, '*i take that one*', [plan({ type: 'quest.accept', quest: g.ids.get(id) || id, quote: 'i take that one' })]); await g.reply('The clerk logged it.'); };

// ------------------------------------------------------------------------------------------------ 1-6. the day's board
test('1-3. the first reading of a day books five listings; reading again that day shows the same, no refill; one taken is his and four stay', async () => {
    const g = await member();
    await read(g);
    const day1 = listedOn(g.state());
    assert.equal(day1.length, 5);
    assert.equal(boardCalls(g), 1);
    await read(g);
    assert.deepEqual(listedOn(g.state()), day1, 'the same listings');
    assert.equal(boardCalls(g), 1, 'no second generator call the same day');
    await take(g, DAY1[0].id);
    const s = g.state();
    assert.equal(s.quests[g.ids.get(DAY1[0].id)].status, 'active');
    assert.deepEqual(listedOn(s), day1.slice(1));
    await read(g);
    assert.deepEqual(listedOn(g.state()), day1.slice(1), 'no refill after taking one');
    assert.equal(boardCalls(g), 1);
});

test('4-5. the next day\'s first reading retires what nobody took and books five new; a taken contract stays his through many days', async () => {
    const g = await member();
    await read(g);
    await take(g, DAY1[0].id);
    const rats = g.ids.get(DAY1[0].id);
    const old = listedOn(g.state());
    nextDay(g);
    // before the reading, yesterday's notices are known, not to be taken
    const cat = catalogText(buildCatalog(g.state(), content, { known: true, c: true }));
    assert.match(cat, new RegExp(`${old[0]} \\(Harvest Marsh Adder Venom · Guild contract · Novice · no longer on the board \\(posted on day 1`));
    assert.ok(!cat.split('\n').some((l) => l.startsWith('BOARD') && old.some((id) => l.includes(id))), 'yesterday\'s notices are not on the board he stands at');
    await say(g, '*i take the venom job*', [plan({ type: 'quest.accept', quest: old[0], quote: 'i take the venom job' })]);
    assert.match(outcomeOf(g).actions[0], /^1\. CANNOT ACCEPT — "Harvest Marsh Adder Venom" is no longer on the board: the Guild renews its board every day/);
    await g.reply('The clerk shook her head.');
    g.listings = DAY2;
    await read(g);
    const s = g.state();
    for (const id of old) assert.equal(s.quests[id].status, 'expired', id);
    const day2 = listedOn(s);
    assert.equal(day2.length, 5);
    assert.deepEqual(day2.map((id) => s.quests[id].title), DAY2.map((l) => l.title));
    assert.equal(boardCalls(g), 2);
    assert.match(outcomeOf(g).actions[0], /READS the Novice board — BOARD/);
    for (const l of DAY1) assert.ok(!outcomeOf(g).actions[0].includes(`**${l.title}**`), `${l.title} is not on the new board`);
    // the rats contract is still his, two board days later (no deadline)
    nextDay(g);
    await read(g);
    assert.equal(g.state().quests[rats].status, 'active');
    assert.equal(boardCalls(g), 3);
    // a day whose board cannot be written: yesterday's notices are not shown as today's, nor retired before a new board
    nextDay(g);
    g.boardFails = true;
    await say(g, '*i read the novice board*', [plan({ type: 'board.read', rank: null, quote: 'i read the novice board' })]);
    assert.match(outcomeOf(g).actions[0], /^1\. READS the board — BOARD: no new official contracts can be shown right now; invent none\.$/);
    assert.equal(listedOn(g.state()).length, 5, 'still listed (not retired), but not on the day\'s board');
});

test('6. other adventurers do not take Alaric\'s offers, whatever the taken-by-others rate; on A the rate still applies', async () => {
    const board = content.rules.guild.board;
    const pct = board.taken_by_others_pct_per_day;
    try {
        board.taken_by_others_pct_per_day = 100;
        const g = await member();
        await read(g);
        nextDay(g);
        g.listings = DAY2;
        await read(g);
        const events = g.chat.flatMap((m) => rec(m)?.events || []);
        assert.equal(events.filter((e) => e.t === 'quest.status' && e.d.to === 'taken_by_other').length, 0);
        assert.equal(events.filter((e) => e.t === 'quest.status' && e.d.to === 'expired').length, 5);
        // A, the same board on the next day: the rate takes them (unchanged)
        const a = planner(new Chat4(content, { listings: DAY1 }));
        await a.player('Warrior');
        await a.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
        await say(a, '*i walk to the guild*', [], { planner: false, commands: [{ seq: 1, type: 'go', to: HALL, quote: 'i walk to the guild' }] });
        await a.reply('He reached the hall.', arrives([1, HALL]));
        await say(a, '*i read the board*', [], { planner: false, commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i read the board' }] });
        await a.reply('He read the board.');
        nextDay(a);
        await say(a, '*i read the board*', [], { planner: false, commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i read the board' }] });
        assert.ok(rec(a.chat.findLast((m) => m.is_user)).events.some((e) => e.t === 'quest.status' && e.d.to === 'taken_by_other'));
    } finally {
        board.taken_by_others_pct_per_day = pct;
    }
});

// ------------------------------------------------------------------------------------------------ 7-8. slip and goods
test('7. the boar cull: its slip is the proof and shows READY from the world\'s outcome; no trophy is asked for or taken', async () => {
    // the contract taken (live #13): the desk names no tusks
    const t = live(12);
    await say(t, fx.accept.player, fx.accept.plan);
    const accepts = outcomeOf(t).actions[0];
    assert.match(accepts, /^1\. ACCEPTS — "Clear the Root-Hollow of Thorn-Backed Boars" at the Guild desk; .* Proof: the contract slip itself; its Guild seal shows READY once the world has established the outcome/);
    assert.ok(!/tusk/i.test(accepts), 'no trophy in the terms');
    // the den cleared (live #28): quest.ready, and the engine marks the slip
    const g = live(27);
    const x = await g.reply(fx.ready.reply, fx.ready.extract);
    assert.ok(x.record.events.some((e) => e.t === 'quest.ready' && e.d.id === BOARS));
    assert.deepEqual(g.state().objects[SLIP].marks.map((m) => [m.text, m.by]), [[SLIP_READY, 'guild']]);
    // what the narrator and the planner now read of it
    await say(g, fx.turnin.player, fx.turnin.plan);
    assert.match(block(g), /proof: the contract slip, its Guild seal showing READY now; no trophies are required/);
    assert.ok(!/verification examples?: 2 tusks/.test(block(g)));
    assert.match(g.planRequest.messages.at(-1).content, /proof: the contract slip, its Guild seal showing READY now/);
    assert.match(outcomeOf(g).actions[2], /^3\. TURNS IN, when he reaches the Guild hall — .*the Guild pays 120 cp\. The slip's READY seal is the proof: nothing else is handed over/);
    // turned in on arrival with the live reply: paid, the tusk he carries stays his, the slip shows COMPLETED
    const y = await g.reply(fx.turnin.reply, fx.turnin.extract);
    const s = g.state();
    assert.equal(s.quests[BOARS].status, 'completed');
    assert.ok(Object.values(s.objects).some((o) => o.holder?.entity === 'pc' && /tusk/.test(o.name)), 'his tusks are his');
    assert.ok(!y.record.events.some((e) => e.t === 'object.consumed'));
    assert.ok(s.objects[SLIP].marks.some((m) => m.text === SLIP_DONE && m.by === 'guild'));
    // and without any trophy at all the desk pays the same
    const bare = live(28).state();
    for (const o of Object.values(bare.objects)) if (/tusk/.test(o.name)) delete bare.objects[o.id];
    const ev = [];
    const ctx = resolveCommands(at(bare, AW_HALL), content, [{ seq: 1, type: 'quest.turn_in', quest: BOARS, quote: 'i turn it in' }], (e) => { applyEvent(bare, e); ev.push(e); }, { c: true });
    assert.equal(ctx.resolutions[0].status, 'resolved');
    assert.deepEqual(ev.find((e) => e.t === 'proof.checked').d, { quest: BOARS, ok: true, reason: null, mode: 'story_outcome' });
    // trophies that prove a hunt the old way (no quest.ready, the listed proof in hand) stay his on C; A takes them
    const crows = { id: 'quest.crows', title: 'Drive Off the Crows', kind: 'guild_contract', status: 'active', rank: 'Novice', objectives: [{ id: 'o1', verb: 'ATTACK', what: 'carrion crows', qty: 2, unit: null, where: null, status: 'open' }],
        proof: [{ id: 'p1', kind: 'object', what: 'crow feather', qty: 2, unit: 'feathers', on: null, consume: true }], history: [{ turn: 0, minute: 0, status: 'active' }] };
    const feathers = structuredClone(bare);
    feathers.quests['quest.crows'] = crows;
    applyEvent(feathers, { t: 'object.created', d: { object: { id: 'obj.feathers', name: 'crow feather', kind: 'trophy', stack: true, qty: 2, unit: 'feathers', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: 1, how: 'taken' } } } });
    assert.deepEqual(contractReady(feathers, content, crows, { c: true }), { ok: true, mode: 'legacy_verification', reason: null, consume: [] });
    assert.deepEqual(contractReady(feathers, content, crows).consume, [{ id: 'obj.feathers', qty: 2 }]);
});
function at(s, place) { s.scene.at = place; s.scene.location = 'loc.alderwatch'; s.scene.present = ['pc']; return s; }

test('8. goods are the work: venom sacs must be in his hands and are handed over; a delivery is not done while he carries it', async () => {
    const g = await member();
    await read(g);
    await take(g, DAY1[1].id);
    await take(g, DAY1[2].id);
    const venom = g.ids.get(DAY1[1].id);
    const ledger = g.ids.get(DAY1[2].id);
    const s = g.state();
    // the story says both are done
    applyEvent(s, { t: 'quest.ready', d: { id: venom, note: 'two sacs cut from the adders' } });
    applyEvent(s, { t: 'quest.ready', d: { id: ledger, note: 'the ledger reached the toll house' } });
    const turnIn = (st, id) => { const e = []; const ctx = resolveCommands(st, content, [{ seq: 1, type: 'quest.turn_in', quest: id, quote: 'i turn it in' }], (x) => { applyEvent(st, x); e.push(x); }, { c: true }); return { r: ctx.resolutions[0], line: ctx.actions[0], e }; };
    // no sacs in his hands: the desk refuses, whatever the story said
    const none = turnIn(structuredClone(s), venom);
    assert.equal(none.r.status, 'refused');
    assert.match(none.line, /the desk refuses it, the goods are the work: 2 sacs venom sacs \(he has 0\) must be in his hands/);
    // with them: paid, and the Guild takes them
    const held = structuredClone(s);
    applyEvent(held, { t: 'object.created', d: { object: { id: 'obj.venom', name: 'marsh adder venom sac', kind: 'resource', stack: true, qty: 2, unit: 'sacs', holder: { entity: 'pc' }, marks: [], for_quests: [], source: { turn: held.turn, how: 'taken' } } } });
    const paid = turnIn(held, venom);
    assert.equal(paid.r.status, 'resolved');
    assert.match(paid.line, /He hands over 2 sacs venom sacs; the Guild keeps them\./);
    assert.deepEqual(paid.e.filter((x) => x.t === 'object.consumed').map((x) => [x.d.id, x.d.qty]), [['obj.venom', 2]]);
    assert.equal(held.quests[venom].status, 'completed');
    // the ledger still in his pack: not delivered
    const carrying = structuredClone(s);
    applyEvent(carrying, { t: 'object.created', d: { object: { id: 'obj.ledger', name: 'sealed toll ledger', kind: 'document', stack: false, qty: 1, unit: null, holder: { entity: 'pc' }, marks: [], for_quests: [ledger], source: { turn: carrying.turn, how: 'world_gift' } } } });
    const owed = turnIn(carrying, ledger);
    assert.equal(owed.r.status, 'refused');
    assert.match(owed.line, /he still carries sealed toll ledger: a delivery is done where the goods are handed over/);
    // a turn-in on arriving at the hall makes the same check (src/v4/world.js arrive)
    const away = structuredClone(s);
    away.scene.at = 'loc.redmarch';
    away.last = { input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: { 1: 'go' }, booked: { registration: false, grants: [], turnIns: [venom], accepted: [], sellers: [] },
        conditionals: [{ seq: 2, kind: 'turn_in', quest: venom, condition: 'arrive_guild_hall', hall: HALL }],
        auth: { go: { seq: 1, to: HALL }, gos: [{ seq: 1, to: HALL, name: 'hall', hall: true }], roam: false, take: [], gather: false, rest: false, timeCap: 120, c: true } } };
    const arrival = applyWorld(away, content, { expected: { 1: { arrived: true, at: HALL, with: null } }, deltas: [] }, { msg: 99 });
    assert.match(arrival.system.join(' '), /TURN-IN REFUSED — Harvest Marsh Adder Venom: the goods are the work/);
    assert.equal(arrival.state.quests[venom].status, 'active');
    // a GET is goods only when the contract asks to see that thing: "get word from the reeve" is no thing in his hands
    const word = structuredClone(s.quests[venom]);
    word.objectives = [{ id: 'o1', verb: 'GET', what: 'word from the reeve', qty: 1, unit: null, where: null, status: 'open' }];
    word.proof = [];
    assert.equal(contractReady(s, content, word, { c: true }).mode, 'story_outcome');
    word.objectives[0].what = 'the stolen toll seal';
    word.proof = [{ id: 'p1', kind: 'object', what: 'toll seal', qty: 1, unit: null, on: null, consume: true }];
    assert.equal(contractReady(s, content, word, { c: true }).mode, 'goods_missing');
    // handed over at the toll house: done
    applyEvent(carrying, { t: 'object.moved', d: { id: 'obj.ledger', to: { loc: 'loc.redmarch' } } });
    const done = turnIn(carrying, ledger); assert.equal(done.r.status, "resolved", done.line);
});

// ------------------------------------------------------------------------------------------------ 9, 12. the den
test('9. "use some cloth to stop my bleeding" keeps its place between the tusk and the den, and heals nothing', async () => {
    const g = live(22);
    const hp = g.state().entities.pc.sheet.hp;
    await say(g, fx.bandage.player, fx.bandage.plan);
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.seq, r.type, r.status]), [[1, 'take', 'authorized'], [2, 'other', 'resolved'], [3, 'go', 'authorized']]);
    const a = outcomeOf(g).actions;
    assert.match(a[0], /^1\. TAKES — a thorn-backed boar tusk/);
    assert.equal(a[1], '2. DOES — "use some cloth to stop my bleeding": his own action; tell it as it happens. It books nothing: no HP, MP, STA, coin or possessions change by it.');
    assert.match(a[2], /^3\. GOES — to into the boar den/);
    assert.ok(block(g).indexOf('2. DOES') > block(g).indexOf('1. TAKES') && block(g).indexOf('2. DOES') < block(g).indexOf('3. GOES'), 'in order, in the narrator\'s block');
    assert.ok(!last(g).plan.free?.some((x) => /bleeding/.test(x)), 'not left in the record only');
    // the reply binds the wound; a recovery the story claims is not booked
    const x = await g.reply(fx.bandage.reply, { ...fx.bandage.extract, deltas: [...fx.bandage.extract.deltas, { seq: 20, type: 'recover', who: 'pc', hp: 12, sta: null }] });
    assert.ok(x.record.rejected.some((r) => r.seq === 20));
    assert.equal(g.state().entities.pc.sheet.hp, hp);
    // one of two boars dead: the slip shows nothing yet
    assert.deepEqual(g.state().objects[SLIP].marks, []);
});

test('12. a wild place may hold an interior: the boar den chamber lies in the Root-Hollow (A unchanged)', async () => {
    const g = live(22);
    await say(g, fx.bandage.player, fx.bandage.plan);
    const x = await g.reply(fx.bandage.reply, fx.bandage.extract);
    assert.ok(!(x.record.rejected || []).some((r) => r.rule === 'place'), JSON.stringify(x.record.rejected));
    const s = g.state();
    const den = s.places[s.scene.at];
    assert.deepEqual([den.name, den.kind, den.parent], ['Boar den chamber', 'interior', 'loc.alderwatch_common_coppice.root_hollow']);
    // the planner off: the same reply on A keeps A's rule
    const a = live(22);
    await say(a, fx.bandage.player, [], { planner: false, commands: [{ seq: 1, type: 'go', to: { new: 'into the boar den' }, quote: 'I then walk towards and into the den' }] });
    const y = await a.reply(fx.bandage.reply, { expected: { 1: fx.bandage.extract.expected['3'] }, deltas: fx.bandage.extract.deltas.filter((d) => d.type === 'arrive').map((d) => ({ ...d, seq: 1 })) });
    assert.deepEqual((y.record.rejected || []).map((r) => r.rule), ['place']);
});

// ------------------------------------------------------------------------------------------------ 10. directions
test('10. directions to the den are no journey: "follow the directions" is a walk, not journey.continue (an escort still is one)', async () => {
    const g = live(16);
    const s = g.state();
    assert.equal(journeyReady(s)?.contact, 'npc.odo_fell', 'A (unchanged): road words in the notes and the warden here');
    assert.equal(journeyReady(s, { c: true }), null);
    await say(g, fx.journey.player, fx.journey.plan);
    assert.ok(!g.planRequest.messages.at(-1).content.includes('JOURNEY READY'));
    assert.deepEqual(outcomeOf(g).resolutions.map((r) => [r.type, r.status, r.reason]), [['journey.continue', 'refused', 'no established journey']]);
    assert.ok(!last(g).events.some((e) => e.t === 'quest.journey'));
    // an escort he set off on is a journey on C too
    const e = structuredClone(s);
    e.quests[BOARS].objectives = [{ id: 'o1', verb: 'ESCORT', what: 'the coppice crew', qty: 1, unit: null, where: 'the far ride', status: 'open' }];
    assert.equal(journeyReady(e, { c: true })?.contact, 'npc.odo_fell');
});

// ------------------------------------------------------------------------------------------------ 11, 13. people
test('11. back at the Guild desk: the clerks he met there are named to narrator and extractor, and the desk clerk stays the same person', async () => {
    const g = live(28);
    await say(g, fx.turnin.player, fx.turnin.plan);
    const known = outcomeOf(g).extra.find((x) => x.startsWith('KNOWN AT'));
    assert.match(known, /^KNOWN AT Adventurers' Guild hall, Alderwatch \(met there before; .*\): .*older Guild clerk.*\(npc\.personguildclerk_old\) · .*Guild clerk.*\(npc\.personguildclerk_grey\)/);
    assert.ok(block(g).includes(known), 'the narrator reads it');
    // the live answer introduced a "Guild desk clerk" with spectacles: the older clerk with spectacles, not a third clerk
    const x = await g.reply(fx.turnin.reply, fx.turnin.extract);
    assert.ok(g.calls.findLast((c) => c.purpose.startsWith('extract')).messages.at(-1).content.includes(known), 'the extractor reads it');
    assert.ok(!x.record.events.some((e) => e.t === 'entity.created' && /clerk/.test(e.d.entity.id)), 'no new clerk');
    assert.ok(g.state().scene.present.includes('npc.personguildclerk_old'));
    const clerks = Object.values(g.state().entities).filter((e) => e.kind === 'npc' && /clerk/.test(e.descriptors.join(' ')));
    assert.equal(clerks.length, 2);
    // the one clerk at a desk: a later "the clerk" is that clerk
    const one = live(28).state();
    one.entities['npc.personguildclerk_grey'].at = null;
    one.last = { input: 'x', outcome: { kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: { 1: 'go' }, conditionals: [], booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] }, auth: { go: { seq: 1, to: AW_HALL }, gos: [{ seq: 1, to: AW_HALL, name: 'hall', hall: true }], roam: false, take: [], gather: false, rest: false, timeCap: 120, c: true } } };
    const w = applyWorld(one, content, { expected: { 1: { arrived: true, at: AW_HALL, with: null } }, deltas: [{ seq: 1, type: 'person.new', ref: 'person.desk', name: null, role: 'Guild clerk', desc: ['a young clerk with ink-stained cuffs'], present: true, at: AW_HALL, band: 'ENGAGED' }] }, { msg: 99 });
    assert.ok(!w.events.some((e) => e.t === 'entity.created'));
    assert.ok(w.state.scene.present.includes('npc.personguildclerk_old'));
});

test('13. scene colour is not stored: the gate guard nobody spoke to is no entity, the Guild clerks are', async () => {
    const g = live(4);
    await say(g, fx.arrival.player, fx.arrival.plan);
    const x = await g.reply(fx.arrival.reply, fx.arrival.extract);
    const s = g.state();
    assert.ok(!Object.keys(s.entities).some((id) => /gate_guard/.test(id)), 'no gate guard entity');
    assert.ok(x.record.rejected.some((r) => r.rule === 'ambient'));
    assert.ok(s.entities['npc.personguildclerk_old'] && s.entities['npc.personguildclerk_grey'], 'the clerks are the Guild\'s service people');
    // whom the reply deals with is kept: the same guard, spoken to
    const h = live(4);
    await say(h, fx.arrival.player, fx.arrival.plan);
    await h.reply(fx.arrival.reply, { ...fx.arrival.extract, deltas: [...fx.arrival.extract.deltas, { seq: 30, type: 'fact', s: 'person.alderwatch.gate_guard', p: 'asked', o: 'Alaric his business in town' }] });
    assert.ok(Object.keys(h.state().entities).some((id) => /gate_guard/.test(id)));
});

// ------------------------------------------------------------------------------------------------ review of c.6
/** The Board generator's next answers, one set of listings each; after them the fixture's again. */
function boardAnswers(g, ...answers) {
    const ask = g.llm;
    g.llm = async (req) => {
        if (req.purpose !== 'board' || !answers.length) return ask(req);
        g.calls.push({ purpose: req.purpose, messages: req.messages });
        return JSON.stringify({ listings: answers.shift().map(generatorListing) });
    };
}
const readOnly = (g) => say(g, '*i read the novice board*', [plan({ type: 'board.read', rank: null, quote: 'i read the novice board' })]);
// the next day's five, two of them refused by the generator's hard checks: three valid of the five asked for
const SHORT = [...DAY2.slice(0, 3), { ...DAY2[3], rank: 'Proven' }, { ...DAY2[4], level: 40 }];

test('R1. a new day is booked whole: three valid of the five asked for, after the repair too, is no day of three; yesterday\'s board stays up', async () => {
    const g = await member();
    await read(g);
    const old = listedOn(g.state());
    nextDay(g);
    boardAnswers(g, SHORT, SHORT);
    await readOnly(g);
    const calls = g.calls.filter((c) => c.purpose === 'board');
    assert.equal(calls.length, 3, 'day 1, then the answer and its one repair');
    assert.equal(calls[2].messages.at(-1).content, 'That answer was not valid: 3 valid listings of the 5 asked for; refused: "Escort the Salt Wagon" (rank Proven is not Novice), "Drive the Foxes from the Henyard" (level 40 outside 1–14); write all 5. Answer again with only the corrected JSON object.');
    const r = last(g);
    assert.ok(!r.events.some((e) => e.t === 'quest.created' || e.t === 'board.refreshed'), 'nothing booked');
    assert.ok(!r.events.some((e) => e.t === 'quest.status' && e.d.to === 'expired'), 'yesterday\'s board not retired');
    assert.match(r.events.find((e) => e.t === 'board.failed').d.error, /^3 valid listings of the 5 asked for; refused: "Escort the Salt Wagon"/);
    assert.match(outcomeOf(g).actions[0], /^1\. READS the board — BOARD: no new official contracts can be shown right now; invent none\.$/);
    let s = g.state();
    assert.deepEqual(listedOn(s), old, 'yesterday\'s five still listed');
    assert.equal(s.guild.boards['loc.redmarch|Novice'].day, 1, 'the board is still day 1\'s');
    await g.reply('The clerk was still pinning up the day\'s notices.');
    // the next reading that day tries again: a whole board, and only now yesterday's comes down
    g.listings = DAY2;
    await read(g);
    s = g.state();
    assert.equal(boardCalls(g), 4);
    for (const id of old) assert.equal(s.quests[id].status, 'expired', id);
    assert.deepEqual(listedOn(s).map((id) => s.quests[id].title), DAY2.map((l) => l.title));
});

test('R2. the repair that brings all five books the new day; the first board of all is booked whole too', async () => {
    const g = await member();
    await read(g);
    const old = listedOn(g.state());
    nextDay(g);
    boardAnswers(g, SHORT, DAY2);
    await read(g);
    const s = g.state();
    assert.equal(boardCalls(g), 3);
    for (const id of old) assert.equal(s.quests[id].status, 'expired', id);
    assert.deepEqual(listedOn(s).map((id) => s.quests[id].title), DAY2.map((l) => l.title));
    // the first reading of all: three valid of five, twice, books nothing
    const f = await member();
    boardAnswers(f, SHORT, SHORT);
    await readOnly(f);
    assert.equal(boardCalls(f), 2);
    assert.ok(!Object.values(f.state().quests).some((q) => q.kind === 'guild_contract'));
    assert.match(outcomeOf(f).actions[0], /^1\. READS the board — BOARD: no new official contracts can be shown right now; invent none\.$/);
});

test('R3. the C Board generator asks no trophies of a hunt (proof [], the slip shows the outcome); A keeps its prompt and its partial board', async () => {
    const g = await member();
    await read(g);
    const sys = g.calls.find((c) => c.purpose === 'board').messages[0].content;
    assert.ok(!/body part of each kill|trophies for the kills|with proof appropriate to/.test(sys), 'no trophy rule');
    assert.match(sys, /Its proof is \[\]: no body parts or trophies, and no local inspection, witness, sign-off or signature\./);
    assert.match(sys, /the Guild's magical contract slip shows it READY/);
    assert.match(sys, /Harvest, retrieval and delivery work keeps the physical things it is about as its objectives \(GATHER/);
    // C's request differs from A's in these two rules only
    const need = { branch: 'loc.redmarch', rank: 'Novice', missing: 5, day: 1, have: [] };
    const a = boardRequest(g.state(), content, need);
    const c = boardRequest(g.state(), content, { ...need, c: true });
    assert.equal(c.user, a.user);
    const [la, lc] = [a.system.split('\n'), c.system.split('\n')];
    assert.equal(lc.length, la.length);
    const changed = la.filter((l, i) => l !== lc[i]);
    assert.equal(changed.length, 2);
    assert.match(changed[0], /^- A hunt or cull contract \(.*\) is proven by a species-appropriate body part of each kill \(ears, teeth, claws, leg joints …\) as its one proof entry\./);
    assert.match(changed[1], /^- Structural example only: a livestock owner .* stop the losses, with proof appropriate to whether it is killed or driven away\./);
    assert.equal(c.system.split('\n').filter((l, i) => l !== la[i]).length, 2);
    // A, planner off: five asked for and three valid books the three, without a repair (unchanged)
    const x = planner(new Chat4(content, { listings: DAY1 }));
    boardAnswers(x, SHORT);
    await x.player('Warrior');
    await x.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    await say(x, '*i walk to the guild*', [], { planner: false, commands: [{ seq: 1, type: 'go', to: HALL, quote: 'i walk to the guild' }] });
    await x.reply('He reached the hall.', arrives([1, HALL]));
    await say(x, '*i read the board*', [], { planner: false, commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i read the board' }] });
    assert.equal(boardCalls(x), 1);
    assert.equal(listedOn(x.state()).length, 3);
    assert.match(x.calls.find((q) => q.purpose === 'board').messages[0].content, /is proven by a species-appropriate body part of each kill/);
});

// ------------------------------------------------------------------------------------------------ c.6.2
test('c.6.2: the second reading of the day shows the same notices, not as new; the first posts them as new (A unchanged)', async () => {
    const g = await member();
    await read(g);
    assert.match(outcomeOf(g).actions[0], /these official listings have JUST become available/);
    await read(g);
    const again = outcomeOf(g).actions[0];
    assert.match(again, /^1\. READS the Novice board — BOARD \(show exactly these, invent no other official contract; .*these are the notices posted earlier today, the same as before, nothing new: do not call them new, fresh or just posted/);
    assert.ok(!/JUST become available|first display|now become canonical/.test(again));
    for (const l of DAY1) assert.ok(again.includes(`**${l.title}**`), l.title);
    // A, planner off: every reading as before
    const a = planner(new Chat4(content, { listings: DAY1 }));
    await a.player('Warrior');
    await a.player(content.classes.get('warrior').skill_pool.slice(0, 2).map((id) => content.skills.get(id).name).join(' and '));
    await say(a, '*i walk to the guild*', [], { planner: false, commands: [{ seq: 1, type: 'go', to: HALL, quote: 'i walk to the guild' }] });
    await a.reply('He reached the hall.', arrives([1, HALL]));
    for (let i = 0; i < 2; i++) {
        await say(a, '*i read the board*', [], { planner: false, commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i read the board' }] });
        assert.match(outcomeOf(a).actions[0], /these listings now become canonical because Alaric actually reads them; .*these official listings have JUST become available/);
        await a.reply('He read the board.');
    }
});

test('c.6.2: the narrator contract asks no trophies of a hunt; the Guild\'s contract slips only reflect the status the Guild and the engine have established', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.ok(!/proven by trophies|trophies of the kills/.test(contract), 'no hunt-trophy rule');
    assert.match(contract, /What proves a contract is what the engine block says for it; ask for nothing it does not name \(no trophies or body parts, no local inspection, witness or signature\)\./);
    assert.match(contract, /The Adventurers' Guild issues standardized, lightly enchanted contract slips at its recognized branches\. A slip only reflects the contract status the Guild and the engine have established \(e\.g\. ACTIVE, READY, COMPLETED\); it does not watch the world on its own and pays nothing out\./);
    assert.match(contract, /Body parts of kills stay ordinary loot, or real quest items when getting a body part is itself an objective\./);
    assert.equal(contract.split('\n')[1], NARRATOR_CONTRACT_REVISION, 'a card with the old contract shows as outdated');
});


// ------------------------------------------------------------------------------------------------ c.6.3-gpt live follow-up
test('c.6.3-gpt: an unrelated "next time" does not turn a later explicit current journey into a plan; real future travel still drops', () => {
    const message = 'thank you im sure we will get to a drink back at Ashwater but ill have to return today so lets get together next time *i say politely and then travel back to Ashwater and into the guild there. In the guild hall i turn the quest in with the quest slip*';
    const commands = [
        { seq: 1, type: 'go', to: 'loc.ashbridge', quote: 'ill have to return today so lets get together next time *i say politely and then travel back to Ashwater' },
        { seq: 2, type: 'go', to: { new: 'the guild hall in Ashwater' }, needs: 1, quote: 'and into the guild there' },
        { seq: 3, type: 'quest.turn_in', quest: 'quest.wagon_escort_to_reedford_ferry', needs: 2, quote: 'In the guild hall i turn the quest in with the quest slip' },
    ];
    const live = guardCommands(message, commands, { guildHalls: new Set(), inGuildHall: false, present: [], objects: new Map(), member: true });
    assert.deepEqual(live.dropped, []);
    assert.deepEqual(live.kept.map((x) => x.seq), [1, 2, 3]);

    for (const [text, quote] of [
        ["Tomorrow I'll walk to Ashbridge.", "I'll walk to Ashbridge"],
        ["I'll walk to Ashbridge tomorrow.", "I'll walk to Ashbridge"],
    ]) {
        const future = guardCommands(text, [{ seq: 1, type: 'go', to: 'loc.ashbridge', quote }], {});
        assert.deepEqual(future.kept, []);
        assert.equal(future.dropped[0]?.rule, 'plan');
    }
});

test('c.6.3-gpt: the extractor is explicitly required to turn a clearly achieved active Guild outcome into quest.ready, not only fact/memory', () => {
    const rules = content.deltaVocab.rules.join('\n');
    assert.match(rules, /For every active Guild contract in the CATALOG, compare THIS reply with its desired end state before answering\./);
    assert.match(rules, /you MUST emit quest\.ready even if you also emit arrive, fact, quest\.progress or memory; do not leave a clearly achieved contract outcome only as a fact or memory/);

    const user = extractorUser({
        catalog: 'CATALOG\nQUESTS: quest.wagon (Wagon Escort · Guild contract · active · desired outcome: The wool wagon and its driver arrive intact at Reedford Ferry.)',
        actions: '1. DEPARTS/CONTINUES — the established escort journey.',
        player: '*we continue the escort*',
        expectedKeys: {},
        vocab: content.deltaVocab,
        reply: 'The wagon rolled into Reedford Ferry intact. "Made it," Odo said. "We\'re delivered."',
    });
    assert.match(user, /QUEST OUTCOME CHECK: Before answering, compare this reply with every active Guild contract's desired end state in the CATALOG\./);
    assert.match(user, /quest\.ready is required even when arrival\/facts\/memory are also reported; fact or memory alone is not enough\./);
});

test('c.6.3-gpt: narrator contract treats refused actions as absent, never supplies Alaric dialogue, and preserves canonical place names', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /A PLAYER ACTION marked NOT DONE, CANNOT, REFUSED, NOT TAKEN or otherwise explicitly saying it did not happen is a prohibition/);
    assert.match(contract, /Do not narrate that action or its ordinary execution steps: no travel\/arrival, payment, hand-over, turn-in, attack or other consequence from it/);
    assert.match(contract, /Never write spoken words for Alaric that the current PLAYER MESSAGE did not actually give him as speech/);
    assert.match(contract, /Established place names are identities, not atmosphere\. Keep the canonical name shown by the engine or already established in play/);
    assert.match(contract, /never rename a known city, settlement, road, building or other place for flavor/);
});


test('c.6.4-gpt: targetless close-in stays targetless when it is paired with Arcane Burst', () => {
    const ctx = {
        fight: true,
        known: ['mage.basic_attack', 'mage.flame_lance', 'mage.arcane_burst'],
        basic: 'mage.basic_attack',
        skills: [
            { id: 'mage.basic_attack', name: 'Basic Attack' },
            { id: 'mage.flame_lance', name: 'Flame Lance' },
            { id: 'mage.arcane_burst', name: 'Arcane Burst' },
        ],
        opponents: [
            { id: 'npc.crossbow', label: 'Crossbow Bandit', band: 'MEDIUM', engaged: false },
            { id: 'npc.leader', label: 'Bandit Leader', band: 'SHORT', engaged: false },
        ],
        facts: [],
        catalog: { present: [], objects: [] },
        cls: 'mage',
    };
    const commands = [
        { seq: 1, type: 'move', dir: 'closer', target: null, quote: 'i dash forward in the middle of all of them' },
        { seq: 2, type: 'use_skill', skill: 'mage.arcane_burst', target: null, quote: 'then Arcane Burst' },
    ];
    const mapped = mapPlan(commands, ctx, content, '*i dash forward in the middle of all of them and then Arcane Burst*', {});
    assert.equal(mapped.route, 'v3');
    assert.equal(mapped.intent.kind, 'attack');
    assert.equal(mapped.intent.skill, 'mage.arcane_burst');
    assert.equal(mapped.intent.move, 'closer');
    assert.equal(mapped.intent.move_target, null);
    assert.equal(mapped.intent.target, 'npc.crossbow', 'a nominal attack target may route the AoE, but it does not become the movement focus');
});

test('c.6.4-gpt: another adventurer cannot consume a current-day C board listing after the first display', async () => {
    const g = await member();
    await read(g);
    const s = structuredClone(g.state());
    const id = s.guild.boards['loc.redmarch|Novice'].listings[1];
    s.last.outcome = {
        kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] },
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, c: true },
        board: null,
    };
    const before = [...s.guild.boards['loc.redmarch|Novice'].listings];
    const w = applyWorld(s, content, { expected: {}, deltas: [{ seq: 1, type: 'listing.gone', listing: id, why: 'taken_by_other' }] }, { msg: 999 });
    assert.equal(w.state.quests[id].status, 'listed');
    assert.deepEqual(w.state.guild.boards['loc.redmarch|Novice'].listings, before);
    assert.equal(w.rejected[0]?.rule, 'board_stable_player');
});

test('c.6.4-gpt: a visible tactical person survives the ambient filter, gets a pre-combat Range line, and unique roles need no A suffix', () => {
    const s = structuredClone(live(4).state());
    s.last.outcome = {
        kind: 'v4', actions: [], extra: [], resolutions: [], expected_keys: {}, conditionals: [],
        booked: { registration: false, grants: [], turnIns: [], accepted: [], sellers: [] },
        auth: { go: null, gos: [], roam: false, take: [], gather: false, rest: false, c: true },
        board: null,
    };
    const tactical = applyWorld(s, content, {
        expected: {},
        deltas: [
            { seq: 1, type: 'person.new', ref: 'npc.leader', name: null, role: 'bandit leader', desc: ['big bearded bandit'], present: true, relevant: true, at: null, band: 'SHORT' },
            { seq: 2, type: 'person.new', ref: 'npc.young1', name: null, role: 'young bandit', desc: ['young bandit'], present: true, relevant: true, at: null, band: 'MEDIUM' },
            { seq: 3, type: 'person.new', ref: 'npc.young2', name: null, role: 'young bandit', desc: ['young bandit'], present: true, relevant: true, at: null, band: 'MEDIUM' },
        ],
    }, { msg: 999 });
    assert.equal(tactical.rejected.length, 0);
    const ids = tactical.state.scene.present.filter((id) => id !== 'pc').filter((id) => tactical.state.entities[id]?.kind === 'npc');
    const leader = ids.find((id) => sceneHandle(tactical.state, content, id) === 'Bandit Leader');
    const young = ids.filter((id) => /^Young Bandit [AB]$/.test(sceneHandle(tactical.state, content, id)));
    assert.ok(leader, 'one unique anonymous role is simply Bandit Leader');
    assert.equal(young.length, 2, 'duplicates keep A/B handles');
    const panel = worldPanel(s, content, tactical);
    assert.match(panel, /ACTIVE SCENE — Bandit Leader · SHORT/);
    assert.match(panel, /ACTIVE SCENE — Young Bandit A · MEDIUM/);
    assert.match(panel, /ACTIVE SCENE — Young Bandit B · MEDIUM/);

    const ambient = applyWorld(s, content, {
        expected: {},
        deltas: [{ seq: 1, type: 'person.new', ref: 'npc.passer', name: null, role: 'passer-by', desc: ['walking past'], present: true, relevant: false, at: null, band: 'MEDIUM' }],
    }, { msg: 1000 });
    assert.equal(ambient.rejected[0]?.rule, 'ambient');
});

test('c.6.4-gpt: narrator contract also forbids implied PC answers and partial narration of an illegal combat action', () => {
    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /Do not evade this by implying an invented reply \("whatever he answered", "after he replied", "his answer satisfied them"\)/);
    assert.match(contract, /combat resolution says Alaric's declared action is NOT possible, illegal, or that nothing was spent\/rolled/);
    assert.match(contract, /none of that declared action happened, including any movement bundled into it/);
    assert.match(contract, /stable set of player-facing choices for that branch, rank and Guild day/);
});


// ------------------------------------------------------------------------------------------------ c.6.5-gpt live follow-up
test('c.6.5-gpt: co-presence alone is not first sight; explicit awareness is, and missing awareness is not silently "aware" for Ambush', () => {
    const s = structuredClone(live(4).state());
    const id = 'npc.test_watcher';
    s.entities[id] = {
        id, kind: 'npc', name: null, descriptors: ['bandit leader'], traits: 'bandit leader', status: 'alive',
        location: s.scene.location, template: 'commoner', card: {},
        sheet: { ...structuredClone(s.entities.pc.sheet), generated: { temperament: 'skittish' } },
    };
    s.scene.present.push(id);
    s.scene.positions[id] = { band: 'SHORT', cover: 'none' };

    const unseen = [];
    perceiveAll(s, (e) => unseen.push(e));
    assert.equal(unseen.some((e) => e.t === 'knowledge.gained' || e.t === 'memory.recorded'), false, 'being in the same scene does not mean the NPC saw Alaric');

    s.scene.awareness[id] = 'aware';
    const noticed = [];
    perceiveAll(s, (e) => { noticed.push(e); applyEvent(s, e); });
    assert.ok(noticed.some((e) => e.t === 'knowledge.gained' && e.d.who === id));
    assert.ok(noticed.some((e) => e.t === 'memory.recorded' && e.d.memory?.id === `m.t${s.turn}.seen.${id}`));

    delete s.scene.awareness[id];
    const encUnknown = initEncounter(s, content, scriptedDice(), { actor: 'pc', target: id, skill: 'mage.basic_attack' }, [{ id, side: 'hostile' }], 'enc.test', { c: true });
    assert.equal(encUnknown.ambush, false);
    assert.match(encUnknown.ambush_reason, /target awareness: unknown -> no Ambush/);
    assert.equal(encUnknown.combatants[id].label, 'Bandit Leader', 'the unique C role keeps the pre-combat label without a spurious A');

    s.scene.awareness[id] = 'unaware';
    const encUnaware = initEncounter(s, content, scriptedDice(), { actor: 'pc', target: id, skill: 'mage.basic_attack' }, [{ id, side: 'hostile' }], 'enc.test2', { c: true });
    assert.equal(encUnaware.ambush, true);
    assert.match(encUnaware.ambush_reason, /true Ambush/);
});

test('c.6.5-gpt: skittish is a C bias: retreat gains distance, while leaving the encounter needs more than temperament', () => {
    const s = structuredClone(live(4).state());
    const id = 'npc.skittish_test';
    s.entities[id] = {
        id, kind: 'npc', name: null, descriptors: ['nervous smuggler'], traits: 'nervous smuggler', status: 'alive',
        location: s.scene.location, template: 'commoner', card: {},
        sheet: { ...structuredClone(s.entities.pc.sheet), generated: { temperament: 'skittish' } },
    };
    s.scene.present.push(id);
    s.scene.positions[id] = { band: 'SHORT', cover: 'none' };
    const enc = initEncounter(s, content, scriptedDice(), { actor: 'pc', target: id, skill: 'mage.basic_attack' }, [{ id, side: 'hostile' }], 'enc.skittish', { c: true });
    const me = enc.combatants[id];

    let d = npcDecide({ enc, content, state: s, c: true }, id);
    assert.notEqual(d.kind, 'flee', 'temperament alone does not make an unharmed sapient NPC flee');

    enc.log.push({ round: 1, actor: 'pc', kind: 'attack', target: id, strikes: [{ target: id, final: 1 }] });
    d = npcDecide({ enc, content, state: s, c: true }, id);
    assert.equal(d.kind, 'retreat', 'a threatened skittish actor at SHORT/MEDIUM may gain distance without leaving');

    me.current.band = 'LONG';
    me.current.hp = Math.ceil(me.fixed.max_hp * 0.6);
    d = npcDecide({ enc, content, state: s, c: true }, id);
    assert.notEqual(d.kind, 'flee', 'at LONG, temperament alone is still not escape');

    me.current.hp = Math.floor(me.fixed.max_hp * 0.2);
    d = npcDecide({ enc, content, state: s, c: true }, id);
    assert.equal(d.kind, 'flee', 'a genuinely badly wounded skittish actor may try to leave');
});

test('c.6.5-gpt: planner gets recent route memory for semantic return references', () => {
    const s = structuredClone(live(4).state());
    s.scene.history = ['loc.alderwatch', 'loc.alderwatch.guild_hall', 'loc.alderwatch', 'loc.alderwatch.wester_gate'];
    const catalog = buildCatalog(s, content, { known: true, c: true });
    const ctx = planContext(s, content, catalog);
    const user = plannerUser(ctx, '*i walk back to the city*');
    assert.match(user, /RECENT ROUTE \(older → newer; use these ids\/names for "back", "return", "the city"/);
    assert.match(user, /loc\.alderwatch: Alderwatch \(settlement\)/);
});

test('c.6.5-gpt: journey pacing, complete desired outcomes, awareness and retreat boundaries are explicit at their LLM interfaces', () => {
    const rules = content.deltaVocab.rules.join('\n');
    assert.match(rules, /Co-presence is not awareness/);
    assert.match(rules, /do not turn the engine's ordinary move away\/retreat into intent:flee/);

    const need = { branch: 'loc.redmarch', rank: 'Novice', missing: 5, day: 1, have: [], c: true };
    const board = boardRequest(live(4).state(), content, need).system;
    assert.match(board, /desired_end_state is the single semantic completion gate and MUST cover every substantive result/);
    assert.match(board, /ESCORTS a cart\/driver to a ford AND DELIVERS six casks to a trading yard/);

    const contract = fs.readFileSync(path.join(ROOT, 'content/narrator/Avereth_Narrator_Contract_v4.txt'), 'utf8');
    assert.match(contract, /Do not make Alaric crouch, creep, sneak, hide behind cover, take a concealed firing position/);
    assert.match(contract, /Carry ordinary road, scenery, harmless conversation and uneventful time forward in that same reply until the destination or a concrete event creates a real new decision\/stop/);
    assert.match(contract, /Range movement is not escape/);
    assert.match(contract, /SHORT→MEDIUM or MEDIUM→LONG/);
});
