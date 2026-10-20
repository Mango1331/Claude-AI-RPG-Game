// Hotfix 7.2.1 (4.3.0-c.6.6.22): the live test of 20.10.2026 13:37 (tests/v4/live_1020b.json, played under c.6.6.21).
// Turn 3: "*i walk into the city ahead and make my way over to the adventurers guild*": the planner read two GOs (the
// city, then the Guild hall), the narrator brought him into the hall, the extractor reported both arrived, and an arrive
// delta for the first (Alderwatch): that delta set the arrival and the later leg was never taken, so he stayed in the
// street. Registration and the board were refused there ("not at a Guild hall"), the story registered him anyway, and the
// extractor's fact "the clerk registered_alaric: registration completed" was stored.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, ROOT } from '../helpers.js';
import { rec } from '../../src/host.js';
import { prepareGenerationAsync } from '../../src/v4/runtime.js';
import { Chat4 } from './harness.js';

const content = await loadContent();
const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1020b.json'), 'utf8'));
const HALL = 'loc.alderwatch.guild_hall';
const WALK = fx.messages[5].mes;
const GOS = [
    { type: 'go', to: 'loc.alderwatch', quote: 'i walk into the city ahead' },
    { type: 'go', to: HALL, quote: 'make my way over to the adventurers guild', needs: 1 },
];
const CLERK = { seq: 2, type: 'person.new', ref: 'clerk_alderwatch', name: null, role: 'Guild clerk', desc: ['gray-haired', 'spectacles pushed up into thinning hair'], present: true, relevant: true, threat: false, at: HALL, band: 'ENGAGED' };
// the extractor's answer of the live turn: both GOs arrived, one arrive delta for the first leg
const LIVE_ANSWER = {
    expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null }, 2: { arrived: true, at: HALL, with: null } },
    deltas: [{ seq: 1, type: 'arrive', at: 'loc.alderwatch', with: null, forced_by: null }, CLERK],
};
// the five listings the Board generator of the live run wrote for the Alderwatch hall (#15)
const LISTINGS = fx.messages[15].extra.avereth.events.filter((e) => e.t === 'quest.created').map(({ d: { quest: q } }) => ({ id: q.id, ...q }));

/** The live chat after character creation, played on with a scripted planner (Prototype C, the campaign's path). */
function live() {
    const g = new Chat4(content, { listings: LISTINGS });
    g.chat = fx.messages.slice(0, 5).map((m) => structuredClone(m));
    const ask = g.llm;
    g.llm = async (req) => (req.purpose.startsWith('plan') ? g.plans.shift() ?? null : ask(req));
    return g;
}
async function say(g, text, ...commands) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify({ commands: commands.map((c, i) => ({ seq: i + 1, ...c })) })];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    return { r, outcome: rec(g.chat.findLast((m) => m.is_user)).events.findLast((e) => e.t === 'outcome.recorded').d.outcome };
}
const moves = (record) => record.events.filter((e) => e.t === 'scene.moved').map((e) => e.d.at);

test('hotfix 7.2.1: two confirmed GO arrivals (the live turn: an arrive delta for the city, both legs arrived) end at the Guild hall', async () => {
    const g = live();
    const { outcome } = await say(g, WALK, ...GOS);
    assert.deepEqual(outcome.resolutions.map((r) => r.status), ['authorized', 'authorized']);
    const { record } = await g.reply(fx.messages[6].mes, LIVE_ANSWER);
    assert.deepEqual(moves(record), ['loc.alderwatch', HALL], 'first into the city, then on into the hall: each leg once');
    assert.equal(g.state().scene.at, HALL);
    assert.equal(new Set(moves(record)).size, moves(record).length, 'no doubled arrival');
    // the clerk the reply met in the hall is met in the hall, not left behind in the street
    assert.ok(g.state().scene.present.includes('npc.clerk_alderwatch'));
});

test('hotfix 7.2.1: the order of the answer decides nothing: an arrive delta for the hall and both legs arrived stays at the hall (an earlier leg never takes him back)', async () => {
    const g = live();
    await say(g, WALK, ...GOS);
    const { record } = await g.reply(fx.messages[6].mes, { ...LIVE_ANSWER, deltas: [{ ...LIVE_ANSWER.deltas[0], at: HALL }, CLERK] });
    assert.deepEqual(moves(record), [HALL]);
    assert.equal(g.state().scene.at, HALL);
});

test('hotfix 7.2.1: an interrupted way stays unfinished: the city reached, the hall not (leg 2 not arrived) keeps him in the city', async () => {
    const g = live();
    await say(g, WALK, ...GOS);
    const { record } = await g.reply('He passes the gate into Alderwatch; a cart overturns ahead and blocks the street to the Guild, and he stops to watch the drovers argue.', {
        expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null }, 2: { arrived: false, at: null, with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: 'loc.alderwatch', with: null, forced_by: null }],
    });
    assert.deepEqual(moves(record), ['loc.alderwatch']);
    assert.equal(g.state().scene.at, 'loc.alderwatch', 'no invented arrival at the hall');
});

test('hotfix 7.2.1: arrived at the hall, registration and the board work there', async () => {
    const g = live();
    await say(g, WALK, ...GOS);
    await g.reply(fx.messages[6].mes, LIVE_ANSWER);
    const reg = await say(g, '*i pay the 2 silver and finish the registration*',
        { type: 'pay', to: 'npc.clerk_alderwatch', amount_cp: 20, for: 'Guild registration fee', quote: 'i pay the 2 silver' },
        { type: 'guild.register', quote: 'finish the registration' });
    assert.deepEqual(reg.outcome.resolutions.map((r) => r.status), ['resolved', 'resolved']);
    assert.equal(g.state().guild.membership?.rank, 'Novice');
    await g.reply('She stamps the ledger and hands him his plate.', { expected: {}, deltas: [] });
    const board = await say(g, '*i go look at the quest board*', { type: 'board.read', rank: null, quote: 'i go look at the quest board' });
    assert.equal(board.outcome.resolutions[0].status, 'resolved');
    const listed = Object.values(g.state().quests).filter((q) => q.status === 'listed' && q.source?.board === HALL).map((q) => q.title);
    assert.deepEqual(listed.sort(), LISTINGS.map((l) => l.title).sort(), 'the hall\'s board lists its contracts');
});

test('hotfix 7.2.1: a registration the engine refused is no Guild fact: "registered_alaric" is refused with a correction; the clerk\'s other facts stay', async () => {
    const g = live();
    await say(g, WALK, ...GOS);
    // the live run's state: he never got past the city (an arrive delta for the city only, the hall not reported)
    await g.reply(fx.messages[6].mes, { expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null }, 2: { arrived: false, at: null, with: null } }, deltas: [LIVE_ANSWER.deltas[0], CLERK] });
    const { outcome } = await say(g, fx.messages[11].mes, { type: 'guild.register', quote: 'i put my hand down and finish the reading' });
    assert.equal(outcome.resolutions[0].status, 'refused');
    const { record } = await g.reply(fx.messages[12].mes, { expected: {}, deltas: [
        { seq: 1, type: 'fact', s: 'npc.clerk_alderwatch', p: 'registered_alaric', o: 'registration completed at the Alderwatch Guild hall counter' },
        { seq: 2, type: 'fact', s: 'npc.clerk_alderwatch', p: 'warned', o: 'replacing a lost badge costs a day and a fee' },
        { seq: 3, type: 'fact', s: 'Guild registration', p: 'requires', o: 'hand on the measuring stone to read Class and Rank' },
        { seq: 4, type: 'fact', s: 'npc.clerk_alderwatch', p: 'notes', o: 'Alaric is not registered yet' },
    ] });
    const refused = record.events.filter((e) => e.t === 'delta.rejected').map((e) => e.d.item.p);
    assert.deepEqual(refused, ['registered_alaric']);
    assert.ok(record.corrections.some((c) => /NOT registered with the Guild/.test(c)), 'the narrator is told');
    const facts = Object.values(g.state().facts).map((f) => f.p);
    assert.ok(!facts.includes('registered_alaric'));
    for (const p of ['warned', 'requires', 'notes']) assert.ok(facts.includes(p), `${p} stays`);
});

test('hotfix 7.2.1: once the engine has registered him, the story may say so (no contradiction, nothing refused)', async () => {
    const g = live();
    await say(g, WALK, ...GOS);
    await g.reply(fx.messages[6].mes, LIVE_ANSWER);
    await say(g, '*i pay the 2 silver and finish the registration*',
        { type: 'pay', to: 'npc.clerk_alderwatch', amount_cp: 20, for: 'Guild registration fee', quote: 'i pay the 2 silver' },
        { type: 'guild.register', quote: 'finish the registration' });
    const { record } = await g.reply('She blots the ledger. "That\'s you on the roll."', { expected: {}, deltas: [
        { seq: 1, type: 'fact', s: 'npc.clerk_alderwatch', p: 'registered_alaric', o: 'registration completed at the Alderwatch Guild hall counter' },
    ] });
    assert.equal(record.events.filter((e) => e.t === 'delta.rejected' && e.d.item.p === 'registered_alaric').length, 0);
});

test('hotfix 7.2.1 review: three legs, the middle one not reached: a later leg reported arrived does not carry him past it', async () => {
    const g = live();
    const text = '*i walk into the city ahead, make my way over to the adventurers guild and then head out to the old crown catacombs*';
    const { outcome } = await say(g, text, GOS[0], GOS[1], { type: 'go', to: 'loc.old_crown_catacombs', quote: 'head out to the old crown catacombs', needs: 2 });
    assert.deepEqual(outcome.resolutions.map((r) => r.status), ['authorized', 'authorized', 'authorized']);
    const { record } = await g.reply('He passes the gate into Alderwatch; a cart overturns ahead and blocks the street to the Guild, and he stops to watch the drovers argue.', {
        expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null }, 2: { arrived: false, at: null, with: null }, 3: { arrived: true, at: 'loc.old_crown_catacombs', with: null } },
        deltas: [{ seq: 1, type: 'arrive', at: 'loc.alderwatch', with: null, forced_by: null }],
    });
    assert.deepEqual(moves(record), ['loc.alderwatch'], 'no leg past the one he did not reach');
    assert.equal(g.state().scene.at, 'loc.alderwatch');
});

test('hotfix 7.2.1 review: the same without an arrive delta (expected only): he stops at the city, not at the catacombs', async () => {
    const g = live();
    const text = '*i walk into the city ahead, make my way over to the adventurers guild and then head out to the old crown catacombs*';
    await say(g, text, GOS[0], GOS[1], { type: 'go', to: 'loc.old_crown_catacombs', quote: 'head out to the old crown catacombs', needs: 2 });
    const { record } = await g.reply('He passes the gate into Alderwatch; a cart overturns ahead and blocks the street to the Guild, and he stops to watch the drovers argue.', {
        expected: { 1: { arrived: true, at: 'loc.alderwatch', with: null }, 2: { arrived: false, at: null, with: null }, 3: { arrived: true, at: 'loc.old_crown_catacombs', with: null } },
        deltas: [],
    });
    assert.deepEqual(moves(record), ['loc.alderwatch']);
});
