// Live run 27.09.2026 04:11 (docs/TESTRUN_V11.md), build 3.1.4: Alaric registered at the Guild of Alderwatch, took the
// wolf contract of Millbrook Hamlet from the Novice board, killed the two wolves in the woods above the hamlet and brought
// their heads back. There the contract was reported completed, the reeve's signature still to come, and paid its Quest
// XP; the reeve then paid the posted "8 silver" as 800 Copper, and the walk back to the Guild went to "town with guild
// hall", a new city. Before that the registration had been a quest worth 15 Quest XP, "Wolf Problem" a second quest beside
// the board's "Wolf Problem — Millbrook Hamlet", the place request of message 6 had sent the two clerks at the desk away,
// and "Millbrook villagers" had become a man called Millbrook.
// On 3.1.4 the run replays byte for byte from this fixture (the chat JSONL, the narrator replies with their reports and
// the four report-request answers from the Chat Completion log). The recorded answers were written for the run's own
// course: the report of message 8 introduces the registration clerk anew, because the run's engine block no longer
// listed the two clerks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer, PLACE_REQUEST_HEAD } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { parseSwaps, hash32, ENGINE_VERSION } from '../../src/util.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v11/fixture.json');
const swaps = parseSwaps(fx.swaps);

const ai = (mes, extra = {}) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra });

// the answer to the place request of message 6 as the request asks for it now: the spot, and who of the people the
// report introduced is there (both clerks: the reply ends at their desk). Synthetic: the run's request asked who was not.
const PLACE = '<avereth>{"place":"Adventurers\' Guild hall","present":["clerk_old","clerk_young"]}</avereth>';

// Synthetic turns after the run: the player walks back to the Guild of Alderwatch and turns the contract in at the front
// desk (the reply of message 30 had him arrive there, but named the city "town with guild hall"); the report books the
// reward again as 800 Copper. Then a reply that reports the contract completed and its reward once more.
const TURN_IN = [
    "*I walk back to the guild in Alderwatch and turn in the Wolf Problem quest at the front desk with the reeve's sealed paper*",
    '*Hessa breaks the soot seal, reads the reeve\'s mark twice and stamps the wolf tag. She counts eight silver onto the counter.*\n\n"Wolf Problem, Millbrook Hamlet. Closed and paid."\n\n'
        + '<avereth>{"time":100,"location":"Alderwatch","place":"Adventurers\' Guild hall, front desk","items":[{"item":"signed and sealed quest completion paper","qty":1,"from":"pc","why":"handed in as proof"}],"coin":[{"who":"pc","cp":800,"why":"Wolf Problem reward, 8 silver"}],"quests":[{"title":"Wolf Problem","status":"completed","note":"reeve\'s sealed paper checked at the front desk"}]}</avereth>',
];
const AGAIN = [
    '*I put the silver away and ask Hessa whether the Wolf Problem is settled*',
    '"Settled and stamped," *Hessa says, and hangs the wolf tag on the done-nail.*\n\n<avereth>{"time":2,"quests":[{"title":"Wolf Problem — Millbrook Hamlet","status":"completed"}],"coin":[{"who":"pc","cp":80,"why":"Wolf Problem reward"}]}</avereth>',
];

/** The run as the extension plays it; `answers` stand in for requests the run did not make, `more` are turns after it. */
function replay(answers = {}, more = []) {
    const chat = [];
    const at = {};
    const user = (i, mes) => {
        chat.push({ is_user: true, is_system: false, mes, extra: {} });
        const gen = prepareGeneration(chat, content, { type: 'normal', settings: { engineLore: false } });
        if (gen.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
        at[i] = { gen, rec: chat.at(-1).extra.avereth, state: foldChat(chat).state };
    };
    const reply = (i, mes, answer, ms) => {
        chat.push(ai(mes));
        const id = chat.length - 1;
        const got = processReply(chat, id, content, { swaps, recover: true });
        const first = { ...chat[id].extra.avereth };
        const request = got.recover ? reportRequest(chat, id, content) : null;
        if (got.recover) applyReportAnswer(chat, id, content, answer ?? null, { hash: request.hash, ms: ms ?? 5000 });
        at[i] = { rec: chat[id].extra.avereth, first, request, panel: chat[id].extra.avereth.panel || '', state: foldChat(chat).state };
    };
    for (const m of fx.chat) {
        if (m.greeting) chat.push(ai(m.mes, { avereth: { v: 2, events: m.events, text_hash: hash32(m.mes) } }));
        else if (m.system) chat.push({ is_user: false, is_system: true, mes: m.mes, extra: {} });
        else if (m.user) user(m.i, m.mes);
        else reply(m.i, m.reply, answers[m.i] ?? m.answer, m.ms);
    }
    more.forEach(([u, r], k) => { user(31 + 2 * k, u); reply(32 + 2 * k, r); });
    return { chat, at };
}

const run = replay({ 6: PLACE });
const asRun = replay();
const desk = replay({ 6: PLACE }, [TURN_IN, AGAIN]);
const WOLF = 'quest.wolf_problem_millbrook_hamlet';
const reasons = (r) => r.rejected.map((x) => x.reason);
const completedContracts = (s) => Object.values(s.quests).filter((q) => q.rank && q.status === 'completed').length;

test('F: the place request asks who of the people the reply introduced is at the spot; the two clerks at the desk stay with him', () => {
    assert.deepEqual(foldChat(desk.chat).errors, []);
    assert.deepEqual(validateState(desk.at[34].state, content), []);
    for (const m of desk.chat.slice(1)) if (m.extra?.avereth) assert.equal(m.extra.avereth.build, ENGINE_VERSION);
    // the run: asked who was not at the spot, the answer named everyone in the reply, the clerks at the desk included
    assert.ok(fx.recorded.accepted6.includes('leave npc.clerk_old') && fx.recorded.accepted6.includes('leave npc.clerk_young'));
    const req = run.at[6].request;
    assert.ok(req.systemPrompt.startsWith(PLACE_REQUEST_HEAD));
    assert.match(PLACE_REQUEST_HEAD, /"present", the refs of the people listed below who are with him at that spot when the reply ends/);
    assert.doesNotMatch(PLACE_REQUEST_HEAD, /"leave"/);
    assert.ok(req.prompt.endsWith('Its report named the city reached ("Alderwatch") but no spot in it. The people its report introduced: "clerk_old" (guild clerk, grey-haired), "clerk_young" (guild clerk, young woman). Write the place now: exactly one <avereth>{"place":"…","present":[…]}</avereth>, nothing else. Do not continue the story.'));
    // the answer: the Guild hall, both clerks there; the engine block of the next message lists them
    const s = run.at[6].state;
    assert.deepEqual([s.scene.place, s.scene.present], ["Adventurers' Guild hall", ['pc', 'npc.clerk_old', 'npc.clerk_young']]);
    assert.ok(!run.at[6].rec.accepted.some((a) => a.startsWith('leave')));
    const card = run.at[7].gen.context.text.split('\n\n').find((b) => b.startsWith('PRESENT'));
    assert.match(card, /grey hair, ledger/);
    assert.match(card, /young woman, sorting wooden Quest tags/);
    // the run's own answer (it names who left, as the old request asked): its "leave" answers no question now, and
    // nobody is sent away
    assert.deepEqual(asRun.at[6].state.scene.present, ['pc', 'npc.clerk_old', 'npc.clerk_young']);
    assert.ok(!asRun.at[6].rec.accepted.some((a) => a.startsWith('leave')));
});

test('E: the Guild registration is no quest: no Quest XP and no completed contract; its rank, medallion and fee are recorded', () => {
    assert.ok(fx.recorded.accepted10.includes('quest Guild registration: completed') && fx.recorded.accepted10.includes('Quest XP +15'), 'the run');
    for (const i of [8, 10]) assert.ok(reasons(run.at[i].rec).includes('the Guild registration is no quest: it is recorded by its facts (guild_rank), coin and items'), `message ${i}`);
    const s = run.at[10].state;
    assert.deepEqual(Object.keys(s.quests), []);
    assert.equal(s.entities.pc.sheet.xp, 0);
    assert.equal(completedContracts(s), 0);
    assert.ok(run.at[10].rec.accepted.includes('fact pc guild_rank F Novice'));
    assert.ok(run.at[10].rec.accepted.includes('coin pc -20 cp'));
    assert.ok(run.at[10].rec.accepted.some((a) => a.startsWith('item Novice Guild medallion')));
});

test('B: "Wolf Problem" is the board\'s "Wolf Problem — Millbrook Hamlet": one quest, offered → active, its reward as posted', () => {
    assert.ok(fx.recorded.accepted14.includes('quest Wolf Problem: active'), 'the run: a second quest, already active');
    assert.ok(run.at[14].rec.accepted.includes('quest Wolf Problem — Millbrook Hamlet: active'));
    const s = run.at[14].state;
    assert.equal(s.quests['quest.wolf_problem'], undefined);
    const wolf = s.quests[WOLF];
    assert.deepEqual([wolf.status, wolf.history.map((h) => h.status), wolf.rank, wolf.reward], ['active', ['offered', 'active'], 'Novice', '8 silver on proof of at least two wolves']);
    assert.equal(run.at[14].panel, '`QUEST ACCEPTED — Wolf Problem — Millbrook Hamlet (Novice · Millbrook Hamlet)`');
    assert.deepEqual(Object.values(s.quests).filter((q) => q.status === 'offered').length, 4);
});

test('C: in Millbrook the contract stays active: the heads and the reeve\'s sealed paper are proof, not its completion', () => {
    assert.ok(fx.recorded.accepted28.includes('quest Wolf Problem: completed') && fx.recorded.accepted28.includes('Quest XP +20'), 'the run');
    for (const i of [28, 30]) {
        assert.ok(run.at[i].rec.accepted.includes('quest Wolf Problem — Millbrook Hamlet: active (turned in only at a Guild front desk)'), `message ${i}`);
        assert.ok(!run.at[i].rec.accepted.some((a) => a.startsWith('Quest XP')), `message ${i}`);
        assert.match(run.at[i].panel, /`QUEST STILL ACTIVE — Wolf Problem — Millbrook Hamlet: a Guild contract is completed when it is turned in at a Guild front desk`/);
        assert.ok(run.at[i].rec.corrections.includes('quest "Wolf Problem — Millbrook Hamlet" stays active: a Guild contract is completed only when Alaric turns it in at a Guild front desk, which checks the proof and pays the posted reward; proof he gains on the way goes in its note or his items.'));
    }
    const s = run.at[30].state;
    const wolf = s.quests[WOLF];
    assert.equal(wolf.status, 'active');
    assert.equal(wolf.notes.at(-1), 'two wolf heads delivered as proof, signature pending from reeve Aldous');
    assert.equal(s.entities.pc.sheet.inventory[Object.keys(s.entities.pc.sheet.inventory).find((k) => /sealed/.test(k))], 1);
    assert.equal(s.entities.pc.sheet.xp, 20); // the two wolves, nothing else
    // the next engine block: the contract, who pays it, and the correction
    const text = run.at[29].gen.context.text;
    assert.match(text, /- Quest \(active, Novice Guild contract\): Wolf Problem — Millbrook Hamlet — from Millbrook Hamlet — reward: 8 silver on proof of at least two wolves \(paid by the Guild when turned in at a front desk; locals confirm, never pay\)/);
    assert.match(text, /CORRECTIONS[^\n]*\n- quest "Wolf Problem — Millbrook Hamlet" stays active/);
});

test('A and G: the reeve\'s "8 silver" (as 800 Copper) is not booked, and "town with guild hall" is no new city', () => {
    assert.ok(fx.recorded.accepted30.includes('coin pc +800 cp') && fx.recorded.accepted30.includes('new location town with guild hall'), 'the run');
    assert.deepEqual(reasons(run.at[30].rec), [
        'location "town with guild hall" names no known city or region and no new one: a location is reported by its name; a spot inside the current one is "place"',
        'the reward of the Guild contract "Wolf Problem — Millbrook Hamlet" is paid by the Guild when Alaric turns it in at a Guild front desk: the engine books the posted 8 Silver then, so no coin is reported for it',
    ]);
    const s = run.at[30].state;
    assert.equal(s.entities.pc.sheet.coin_cp, 30);
    assert.ok(!Object.values(s.entities).some((e) => e.kind === 'location' && /guild hall/.test(e.name)));
    assert.equal(s.entities[s.scene.location].name, 'Millbrook Hamlet');
});

test('D: turned in at the Guild\'s front desk, the contract is completed: the engine pays the posted 8 silver (+80 Copper, not the 800 the report claims) and its Quest XP, once', () => {
    const r = desk.at[32].rec;
    assert.deepEqual(r.accepted.filter((a) => /^(?:location|quest|Guild reward|Quest XP|coin)/.test(a)),
        ['location -> Alderwatch', 'quest Wolf Problem — Millbrook Hamlet: completed', 'Guild reward +80 cp', 'Quest XP +20']);
    assert.deepEqual(reasons(r), ['the Guild pays the posted 8 Silver of the Guild contract "Wolf Problem — Millbrook Hamlet" with this turn-in, and the engine books it: no coin is reported for it']);
    let s = desk.at[32].state;
    assert.deepEqual([s.entities.pc.sheet.coin_cp, s.entities.pc.sheet.xp], [30 + 80, 20 + 20]);
    assert.deepEqual([s.quests[WOLF].status, s.quests[WOLF].reward], ['completed', '8 silver on proof of at least two wolves']);
    assert.equal(completedContracts(s), 1);
    assert.match(desk.at[32].panel, /`QUEST COMPLETED — Wolf Problem — Millbrook Hamlet \(Novice · Millbrook Hamlet\)`/);
    assert.match(desk.at[32].panel, /`COIN \+8 Silver → 1 Gold 1 Silver · Guild reward: Wolf Problem — Millbrook Hamlet`/);
    // reported completed again, with its reward as coin: nothing is paid twice
    assert.deepEqual(reasons(desk.at[34].rec), ['the Guild paid the posted 8 Silver of the Guild contract "Wolf Problem — Millbrook Hamlet" when it was turned in, and the engine booked it: no coin is reported for it']);
    assert.ok(!desk.at[34].rec.accepted.some((a) => /^(?:Guild reward|Quest XP|coin)/.test(a)));
    s = desk.at[34].state;
    assert.deepEqual([s.entities.pc.sheet.coin_cp, s.entities.pc.sheet.xp, completedContracts(s)], [110, 40, 1]);
});

test('H: the fight with the two wolves is the run\'s: the same events, dice and panels; only the XP total lacks the registration\'s 15', () => {
    const f = fx.recorded.fight;
    const stored = (evs) => JSON.parse(JSON.stringify(evs)); // as the chat file keeps them
    const noTotal = (evs) => stored(evs).map((e) => (e.t === 'xp.changed' ? { ...e, d: { ...e.d, xp: null } } : e));
    for (const r of [run, asRun]) {
        assert.deepEqual(stored(r.at[20].rec.events), f.events20);
        assert.deepEqual(stored(r.at[21].rec.events), f.events21);
        assert.deepEqual(noTotal(r.at[23].rec.events), noTotal(f.events23));
        assert.deepEqual([f.events23.find((e) => e.t === 'xp.changed').d.xp, r.at[23].rec.events.find((e) => e.t === 'xp.changed').d.xp], [35, 20]);
        assert.deepEqual([r.at[20].panel, r.at[22].panel], [f.panel20, f.panel22]);
        assert.equal(r.at[24].panel, f.panel24.replace('+20 XP → XP 35/100', '+20 XP → XP 20/100'));
    }
});

test('"Millbrook villagers" are no man called Millbrook', () => {
    assert.ok(fx.recorded.accepted26.includes('named in the story: Millbrook (npc.millbrook)'), 'the run');
    assert.deepEqual(reasons(run.at[26].rec), ['aware: unknown person (introduce new people via "new")']);
    assert.equal(run.at[30].state.entities['npc.millbrook'], undefined);
    assert.ok(!Object.values(run.at[30].state.entities).some((e) => e.kind === 'npc' && /millbrook/i.test(e.name || '')));
});
