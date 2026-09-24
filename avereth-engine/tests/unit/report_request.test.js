// Report request (host.js): a reply without a valid fact report gets a separate, report-only request; its answer is
// applied as if the narrator had written it (Test 5 run 2: with reasoning low, 2 of 6 replies had a report despite
// the prompt changes). Here: the answer formats, the equivalence with a narrator-written report, and the refusals.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, reportFromAnswer, applyReportAnswer } from '../../src/host.js';

const content = await loadContent();
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });
const REPORT = { time: 10, place: 'Tidecross fish market', new: [{ ref: 'fishwife', kind: 'npc', desc: ['fishwife'], band: 'SHORT' }], coin: [{ cp: -2, why: 'a skewer of grilled fish' }] };
const PROSE = 'The fishwife takes two coppers and hands over a skewer, still hissing from the grill.';

/** Greeting, a Warrior, and one story message. */
function started() {
    const chat = [ai('Arrival.\n`Location: Public roadside verge outside Tidecross, Solmere`')];
    processReply(chat, 0, content, { seed: 11 });
    for (const input of ['Warrior', 'Heavy Slash + Guard']) {
        chat.push(user(input));
        prepareGeneration(chat, content, { type: 'normal' });
        chat.at(-1).is_system = true;
    }
    chat.push(user('*I walk to the fish market and buy a skewer of grilled fish.*'));
    prepareGeneration(chat, content, { type: 'normal' });
    return chat;
}

/** The same turn without a report, with the recovery on. */
function missing() {
    const chat = started();
    chat.push(ai(PROSE));
    const r = processReply(chat, chat.length - 1, content, { recover: true });
    return { chat, id: chat.length - 1, r, req: reportRequest(chat, chat.length - 1, content) };
}

test('answer formats: tagged, a bare object, a fenced object; a broken or missing report is an error', () => {
    assert.deepEqual(reportFromAnswer('<avereth>{"time":5}</avereth>').report, { time: 5 });
    assert.deepEqual(reportFromAnswer('Sure: {"time":5, "place":"quay"}').report, { time: 5, place: 'quay' });
    assert.deepEqual(reportFromAnswer('```json\n{"time":5}\n```').report, { time: 5 });
    assert.deepEqual(reportFromAnswer('<avereth>{}</avereth>').report, {});
    assert.equal(reportFromAnswer('<avereth>{"time":5, "new":[{"ref":"x"</avereth>').report?.time, 5, 'repaired like a narrator report');
    assert.equal(reportFromAnswer('<avereth>{broken</avereth>').error, 'report is not valid JSON');
    assert.equal(reportFromAnswer('He walks on.').error, 'no report in the answer');
});

test('a recovered report counts exactly as if the narrator had written it (same events, same state)', () => {
    const direct = started();
    direct.push(ai(`${PROSE}\n<avereth>${JSON.stringify(REPORT)}</avereth>`));
    processReply(direct, direct.length - 1, content);
    const { chat, id, r, req } = missing();
    assert.equal(r.recover, true);
    assert.equal(chat[id].extra.avereth.recovery, 'pending');
    const got = applyReportAnswer(chat, id, content, `<avereth>${JSON.stringify(REPORT)}</avereth>`, { hash: req.hash, ms: 7400 });
    assert.equal(got.applied, true);
    const events = chat[id].extra.avereth.events;
    assert.deepEqual(events.at(-1), { t: 'report.requested', d: { ok: true, error: 'no <avereth> report', ms: 7400 } });
    assert.deepEqual(events.slice(0, -1), direct.at(-1).extra.avereth.events);
    assert.deepEqual(foldChat(chat).state, foldChat(direct).state);
    assert.equal(chat[id].mes, PROSE, 'the visible text stays');
    assert.equal(foldChat(chat).state.entities.pc.sheet.coin_cp, 48);
    assert.match(chat[id].extra.display_text, /REPORT RECOVERED: the reply had no fact report, a separate request supplied it \(7\.4 s\)\./);
    assert.match(chat[id].extra.display_text, /COIN -2 Copper → 4 Silver 8 Copper/);
    assert.match(chat[id].extra.display_text, /Tidecross fish market/, 'the HUD below the reply follows');
    assert.equal(reportRequest(chat, id, content), null, 'nothing left to ask');
});

test('refused: the reply changed meanwhile (swipe, edit, continue); too late once a later turn was resolved without it', () => {
    const a = missing();
    a.chat[a.id].mes = 'Another swipe entirely.';
    assert.deepEqual(applyReportAnswer(a.chat, a.id, content, '<avereth>{"time":5}</avereth>', { hash: a.req.hash }), { changed: false, error: 'the reply changed' });
    // the answer came after the next message had waited its minute: the facts stay, the notice no longer says "asking"
    const b = missing();
    const before = b.chat[b.id].extra.avereth.events;
    b.chat.push(user('I eat the fish.'));
    prepareGeneration(b.chat, content, { type: 'normal' });
    assert.equal(reportRequest(b.chat, b.id, content), null);
    const got = applyReportAnswer(b.chat, b.id, content, '<avereth>{"time":5}</avereth>', { hash: b.req.hash, ms: 75000 });
    assert.deepEqual([got.changed, got.applied, got.error], [true, false, 'too late: a later turn was resolved without it']);
    assert.deepEqual(b.chat[b.id].extra.avereth.events, before, 'an earlier reply keeps its events');
    assert.equal(b.chat[b.id].extra.avereth.recovery.late, true);
    assert.match(b.chat[b.id].extra.display_text, /NO FACT REPORT, and the separate request came too late \(75\.0 s\): the next turn had started without it\./);
    assert.doesNotMatch(b.chat[b.id].extra.display_text, /asking for it separately/);
    assert.equal(foldChat(b.chat).state.entities.pc.sheet.coin_cp, 50);
});

test('a reply that wrote tracker blocks keeps the note about them after its report was recovered', () => {
    const chat = started();
    chat.push(ai(`${PROSE}\n<Blocks>\n<World_State>**Loc:** market</World_State>\n</Blocks>`));
    const id = chat.length - 1;
    processReply(chat, id, content, { recover: true });
    const note = chat[id].extra.avereth.corrections.find((c) => c.startsWith('Your last reply wrote tracker blocks'));
    assert.ok(note);
    const req = reportRequest(chat, id, content);
    applyReportAnswer(chat, id, content, `<avereth>${JSON.stringify(REPORT)}</avereth>`, { hash: req.hash });
    assert.ok(chat[id].extra.avereth.corrections.includes(note));
    assert.ok(!chat[id].extra.avereth.corrections.some((c) => /had no valid <avereth> fact report/.test(c)));
});

test('no request for a reply that has its report or answers #system; no answer at all keeps NO FACT REPORT', () => {
    const chat = started();
    chat.push(ai(`${PROSE}\n<avereth>{}</avereth>`));
    const r = processReply(chat, chat.length - 1, content, { recover: true });
    assert.equal(r.recover, false);
    assert.equal(reportRequest(chat, chat.length - 1, content), null);
    chat.push(user('#system how much is a Silver in Copper?'));
    prepareGeneration(chat, content, { type: 'normal' });
    chat.push(ai('10 Copper.'));
    assert.equal(processReply(chat, chat.length - 1, content, { recover: true }).recover, undefined);
    assert.equal(reportRequest(chat, chat.length - 1, content), null);
    const m = missing();
    const got = applyReportAnswer(m.chat, m.id, content, null, { hash: m.req.hash, ms: 60000 });
    assert.equal(got.applied, false);
    assert.match(m.chat[m.id].extra.display_text, /NO FACT REPORT, and the separate request brought none \(60\.0 s\)/);
    assert.deepEqual(m.chat[m.id].extra.avereth.events.at(-1), { t: 'report.requested', d: { ok: false, error: 'no <avereth> report', failed: 'no answer', ms: 60000 } });
    assert.equal(m.chat[m.id].extra.avereth.recovery.failed, 'no answer', 'settled: a reload resumes only a pending request');
});
