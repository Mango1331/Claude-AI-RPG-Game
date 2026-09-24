// Test 5, second run (GLM-5.3-Flash, reasoning low, Megumin with the checklist addendum: the report duty at the end;
// the engine block's last line "End EVERY reply with <avereth>…"). fixture_run2.json holds the raw replies from the
// server log. Both prompt changes were in every request, and still only 2 of 6 replies had a fact report (run 1: 3 of
// 9). The reasoning never planned it, except once, and then the reply dropped it. Without the reports the HUD stayed
// at the gate queue while the story went into the Guild hall. The registration report gave the Guild Rank to
// "Alaric Red", the name the player had the guard write down, and the HUD kept "(not registered)".
// With the fixes: Alaric's full name finds him; a reply without a report asks for it separately (host.js
// reportRequest), and the answer counts as if the narrator had written it. The answers below are scripted: the run
// had no such requests yet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer, REPORT_REQUEST_HEAD } from '../../src/host.js';
import { truth, knows, PC_NAME_FACT } from '../../src/knowledge.js';
import { renderHud } from '../../src/hud.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v5/fixture_run2.json');
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });

/** answers(n): the answer to the report request of turn n (undefined: no request); recover on for every reply. */
function replay(answers = null) {
    const chat = [ai(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    for (const input of fx.creation) {
        chat.push(user(input));
        prepareGeneration(chat, content, { type: 'normal' });
        chat.at(-1).is_system = true; // the extension hides a line the System answered
    }
    const turns = [];
    for (const t of fx.turns) {
        chat.push(user(t.input));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const n = chat.at(-1).extra.avereth.events.find((e) => e.t === 'turn.begun').d.turn;
        chat.push(ai(t.reply));
        const id = chat.length - 1;
        const got = processReply(chat, id, content, { recover: !!answers });
        const first = { panel: chat[id].extra.avereth.panel || '', recovery: chat[id].extra.avereth.recovery };
        const req = answers ? reportRequest(chat, id, content) : null;
        const applied = req && answers(n) !== undefined ? applyReportAnswer(chat, id, content, answers(n), { hash: req.hash, ms: 9000 }) : null;
        const r = chat[id].extra.avereth;
        turns.push({ n, input: t.input, context: gen.context, reply: got.result, first, req, applied, rec: r, panel: r.panel || '', state: foldChat(chat).state });
    }
    return { chat, turns };
}

const plain = replay();
const T = (n) => plain.turns.find((t) => t.n === n);

test('the run replays with the invariants intact; 2 of 6 replies carried a report', () => {
    assert.deepEqual(foldChat(plain.chat).errors, []);
    for (const t of plain.turns) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.deepEqual(plain.turns.map((t) => t.n), [3, 4, 5, 6, 7, 8]);
    assert.deepEqual(plain.turns.map((t) => !t.reply.report_error), [true, false, false, false, false, true]);
    // both prompt changes were in place: the engine block ends with the report duty
    for (const t of plain.turns) assert.match(t.context.text, /End EVERY reply with <avereth>\{…\}<\/avereth>, \{\} if nothing new\.$/);
});

test('turn 8: "Alaric Red" is Alaric: the Guild Rank Novice is his, the assessor knows it, his name stays Alaric', () => {
    const s = T(8).state;
    assert.deepEqual(T(8).reply.rejected, []);
    assert.equal(truth(s, 'pc', 'guild_rank')[0]?.o, 'Novice');
    assert.deepEqual(truth(s, 'Alaric Red', 'guild_rank'), []);
    assert.equal(s.entities.pc.name, 'Alaric');
    assert.ok(knows(s, 'npc.assessor', truth(s, 'pc', 'guild_rank')[0].id), 'learn: the assessor was told');
    assert.match(renderHud(s, content, 'open'), /Guild Rank Novice/);
    assert.equal(s.entities.pc.sheet.coin_cp, 40);
    assert.match(T(8).panel, /COIN -1 Silver → 4 Silver · registration fee/);
});

test('turn 3: the fact about "lean_guard" is about the Lean Guard, and the next block names him', () => {
    const f = T(3).state.facts && Object.values(T(3).state.facts).find((x) => x.p === 'noticed');
    assert.equal(f?.s, 'npc.lean_guard');
    assert.match(T(4).context.text, /- Lean Guard noticed pc's longsword/);
});

test('without a request, turns 4-7 show NO FACT REPORT and the engine stays at the gate queue', () => {
    for (const n of [4, 5, 6, 7]) assert.match(T(n).panel, /NO FACT REPORT: nothing this reply established was recorded/, `turn ${n}`);
    assert.equal(T(7).state.scene.place, 'Tidecross gate queue');
});

// ------------------------------------------------------------------------------------------------ report requests
const ANSWERS = {
    // tagged, as asked
    4: '<avereth>{"coin":[{"cp":-1,"why":"gate toll"}],"learn":[{"who":"Berold","s":"pc","p":"name","o":"Alaric","how":"told","from":"pc"}]}</avereth>',
    // no report in the answer: the reply keeps NO FACT REPORT, now saying the request brought none
    5: 'Alaric Red walks on through the arch.',
    // a bare JSON object in a code fence
    6: '```json\n{"time":15,"place":"Tidecross guildhall, front room","new":[{"ref":"counter woman","kind":"npc","desc":["guild clerk","broad woman"],"traits":"grey-streaked hair pinned with a fishhook","band":"SHORT"}]}\n```',
    // the reply took Alaric into the assessor's room: a report that says so lets turn 8 go on from there
    7: '<avereth>{"time":5,"place":"Tidecross guildhall, assessor\'s room","leave":["counter woman"],"new":[{"ref":"assessor","kind":"npc","name":"Assessor","desc":["old guild assessor","half-moon spectacles"],"band":"SHORT"}]}</avereth>',
};
const rec = replay((n) => ANSWERS[n]);
const R = (n) => rec.turns.find((t) => t.n === n);

test('a reply without a report is marked for a request; the request carries the engine block the narrator had', () => {
    assert.equal(R(3).first.recovery, undefined, 'a reply with its report needs none');
    assert.equal(R(3).req, null);
    assert.equal(R(4).first.recovery, 'pending');
    assert.match(R(4).first.panel, /NO FACT REPORT: asking for it separately, the HUD follows in a moment\./);
    const q = R(4).req;
    assert.ok(q.systemPrompt.startsWith(REPORT_REQUEST_HEAD));
    const block = q.systemPrompt.slice(REPORT_REQUEST_HEAD.length + 2);
    assert.match(block, /^\[AVERETH ENGINE — authoritative game state, turn 4\./);
    assert.match(block, /PRESENT \(each NPC knows ONLY what its card lists\):\n• Berold/);
    assert.match(block, /FACT REPORT: Right after the story text/);
    assert.doesNotMatch(block, /\nLORE:\n/);
    const withoutLore = R(4).context.text.replace(/\n\nLORE:\n[\s\S]*?(?=\n\n(?:RULES \(situational\):|CORRECTIONS \(|RESOLVED THIS TURN|FACT REPORT:))/, '');
    assert.equal(block, withoutLore, 'the same block as the narrator\'s, without lore');
    assert.match(q.prompt, /^PLAYER'S MESSAGE:\n\*Once its my turn i hand over a copper to pay/);
    assert.match(q.prompt, /NARRATOR'S REPLY:\n"One copper, one name, one book entry\."/);
    assert.doesNotMatch(q.prompt, /<avereth>\{"/);
});

test('turn 4 answered: the toll and the name count as if the narrator had reported them', () => {
    const t = R(4);
    assert.equal(t.applied.applied, true);
    assert.equal(t.state.entities.pc.sheet.coin_cp, 49);
    assert.ok(knows(t.state, 'npc.berold', PC_NAME_FACT));
    assert.match(t.panel, /REPORT RECOVERED: the reply had no fact report, a separate request supplied it \(9\.0 s\)\./);
    assert.doesNotMatch(t.panel, /NO FACT REPORT/);
    assert.equal(t.rec.report_error, null);
    assert.deepEqual(t.rec.recovery, { from: 'no <avereth> report', ms: 9000 });
    assert.deepEqual(t.rec.events.at(-1), { t: 'report.requested', d: { ok: true, error: 'no <avereth> report', ms: 9000 } });
    assert.ok(!t.rec.events.some((e) => e.t === 'report.missing'));
    // the next block no longer tells the narrator its report was missing
    assert.doesNotMatch(R(5).context.text, /had no valid <avereth> fact report/);
});

test('turn 5 answered without a report: the reply keeps its facts and says the request brought none', () => {
    const t = R(5);
    assert.equal(t.applied.applied, false);
    assert.match(t.panel, /NO FACT REPORT, and the separate request brought none \(9\.0 s\): nothing this reply established was recorded/);
    assert.equal(t.rec.report_error, 'no <avereth> report');
    assert.equal(t.rec.recovery.failed, 'no report in the answer');
    assert.ok(t.rec.events.some((e) => e.t === 'report.missing'));
    assert.match(R(6).context.text, /had no valid <avereth> fact report/, 'the narrator hears of it as before');
});

test('turns 6-8 with answers: the Guild hall, the clerk, then the assessor; the Guild Rank and the purse follow the story', () => {
    assert.equal(R(6).applied.applied, true, 'a bare JSON object in a fence counts');
    assert.equal(R(6).state.scene.place, 'Tidecross guildhall, front room');
    const present = (n) => R(n).state.scene.present.filter((id) => id !== 'pc');
    assert.equal(present(6).length, 1, 'the gate guards stayed behind');
    assert.match(R(6).state.entities[present(6)[0]].descriptors.join(' '), /guild clerk/);
    assert.equal(R(7).applied.applied, true);
    assert.deepEqual(R(7).state.scene.present.filter((id) => id !== 'pc'), ['npc.assessor']);
    const s = R(8).state;
    assert.equal(s.scene.place, "Tidecross guildhall, assessor's room");
    assert.equal(truth(s, 'pc', 'guild_rank')[0]?.o, 'Novice');
    assert.equal(s.entities.pc.sheet.coin_cp, 39, 'the toll and the fee');
    assert.deepEqual(foldChat(rec.chat).errors, []);
    for (const t of rec.turns) assert.deepEqual(validateState(t.state, content), [], t.input);
});
