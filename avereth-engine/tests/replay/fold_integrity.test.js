// Architecture patch A (.127), A2: a campaign record that no longer folds whole is never the basis of a new
// authoritative step. Checked on a real current-configuration chat of the corpus (Batch19 Mage, .125, V4-C/Ruleset 2,
// current F flags): before a player turn, on a reused record, before an extractor request, while the request is out,
// and on the world job's failure path. Each time: no model request (or no further one), no event, no setRec, no
// extract.failed replacement record; a valid state works again as before (its output equals the .126 baseline).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { loadProductContent, ROOT } from '../helpers.js';
import { rec, foldChat, foldBlock } from '../../src/host.js';
import { prepareGenerationAsync, processReplyAny, extractionRequest, runExtraction, applyExtraction } from '../../src/v4/runtime.js';
import { createWorldJobs } from '../../src/v4/world_jobs.js';
import { loadRun, recordOutput, DEFAULT_BASELINE } from '../../tools/replay/replay.mjs';

const content = await loadProductContent();
const run = loadRun('b19-mage');
const baseline = JSON.parse(zlib.gunzipSync(fs.readFileSync(DEFAULT_BASELINE)).toString('utf8'));
const BOARD_TURN = 13; // "I walk to the board and read the posted …" (planner, board.read)
const BOARD_REPLY = 14;
const GHOST = { t: 'entity.updated', d: { id: 'npc.ghost_of_a_deleted_message', set: { note: 'x' } } };

const prefix = (end) => structuredClone(run.chat.slice(0, end + 1));
/** What a deleted or damaged earlier message leaves behind: an event that no longer applies (here in the registration). */
function damage(chat, at = 9) {
    chat[at].extra.avereth.events.push(structuredClone(GHOST));
    return chat;
}
function repair(chat, at = 9) {
    chat[at].extra.avereth.events = chat[at].extra.avereth.events.filter((e) => e.d?.id !== GHOST.d.id);
    return chat;
}
function counting(answers = []) {
    const queue = [...answers];
    const calls = [];
    return { calls, llm: async ({ purpose }) => { calls.push(purpose); const a = queue.shift(); return a ? a.content : null; } };
}
const snapshot = (chat) => JSON.stringify(chat);
const withoutRecord = (chat, i) => { delete chat[i].extra.avereth; return chat; };
function pending(chat, id) {
    withoutRecord(chat, id);
    const p = processReplyAny(chat, id, content, {});
    assert.equal(p.extract, true);
    return chat;
}

test('A2: the corpus chat is whole and its rejected narrator deltas do not block it', () => {
    const chat = prefix(BOARD_REPLY);
    const fold = foldChat(chat);
    assert.equal(foldBlock(fold), null);
    assert.ok(chat.some((m) => (m.extra.avereth?.events || []).some((e) => e.t === 'delta.rejected')), 'a harmless refusal is part of a whole record');
});

test('A2: foldBlock names the first failing message and event type', () => {
    const b = foldBlock(foldChat(damage(prefix(BOARD_REPLY))));
    assert.equal(b.index, 9);
    assert.equal(b.type, 'entity.updated');
    assert.match(b.notice, /^BLOCKED — .*message 9 \(entity\.updated\).*Nothing was booked, saved or sent to a model\. Load a valid saved state, or deliberately delete the messages from 9 onward/);
});

test('A2: a new player turn on a broken record asks no model and books nothing', async () => {
    const chat = damage(withoutRecord(prefix(BOARD_TURN), BOARD_TURN));
    const before = snapshot(chat);
    const m = counting(run.answers[BOARD_TURN]);
    const r = await prepareGenerationAsync(chat, content, { type: 'normal', settings: {}, llm: m.llm });
    assert.equal(r.action, 'fold_blocked');
    assert.equal(r.block.index, 9);
    assert.equal(r.dirty, false);
    assert.deepEqual(m.calls, []);
    assert.equal(rec(chat[BOARD_TURN]), undefined);
    assert.equal(snapshot(chat), before);
});

test('A2: a reused record (swipe/regenerate) is not narrated from a broken record either', async () => {
    const chat = damage(prefix(BOARD_TURN));
    const before = snapshot(chat);
    const m = counting();
    const r = await prepareGenerationAsync(chat, content, { type: 'swipe', settings: {}, llm: m.llm });
    assert.equal(r.action, 'fold_blocked');
    assert.deepEqual(m.calls, []);
    assert.equal(snapshot(chat), before);
});

test('A2: a reply after a broken record is neither queued nor given a record', () => {
    const chat = damage(withoutRecord(prefix(BOARD_REPLY), BOARD_REPLY));
    const r = processReplyAny(chat, BOARD_REPLY, content, {});
    assert.equal(r.changed, false);
    assert.equal(r.foldBlocked.index, 9);
    assert.equal(rec(chat[BOARD_REPLY]), undefined);
});

test('A2: no extractor request from a broken record; the pending record stays as it is', async () => {
    const chat = damage(pending(prefix(BOARD_REPLY), BOARD_REPLY));
    const before = snapshot(chat);
    assert.equal(extractionRequest(chat, BOARD_REPLY, content), null);
    const m = counting(run.answers[BOARD_REPLY]);
    const x = await runExtraction(chat, BOARD_REPLY, content, m.llm);
    assert.equal(x.changed, false);
    assert.equal(x.foldBlocked.index, 9);
    assert.deepEqual(m.calls, []);
    assert.equal(rec(chat[BOARD_REPLY]).extraction.status, 'pending');
    assert.equal(snapshot(chat), before);
});

test('A2: a record that breaks while the extractor answers is not committed', async () => {
    const chat = pending(prefix(BOARD_REPLY), BOARD_REPLY);
    const answers = [...run.answers[BOARD_REPLY]];
    const calls = [];
    const llm = async ({ purpose }) => { calls.push(purpose); damage(chat); return answers.shift().content; };
    const x = await runExtraction(chat, BOARD_REPLY, content, llm);
    assert.equal(x.changed, false);
    assert.equal(x.foldBlocked.index, 9);
    assert.equal(calls.length, 1);
    const r = rec(chat[BOARD_REPLY]);
    assert.equal(r.extraction.status, 'pending');
    assert.deepEqual(r.events, []);
});

test('A2: no repair request after an invalid answer once the record broke', async () => {
    const chat = pending(prefix(BOARD_REPLY), BOARD_REPLY);
    const calls = [];
    const llm = async ({ purpose }) => { calls.push(purpose); damage(chat); return '{"deltas": "not a list"}'; };
    const x = await runExtraction(chat, BOARD_REPLY, content, llm);
    assert.equal(x.foldBlocked.index, 9);
    assert.deepEqual(calls, ['extract']);
    assert.equal(rec(chat[BOARD_REPLY]).extraction.status, 'pending');
});

test('A2: the failure path of a world job books no extract.failed on a broken record', async () => {
    for (const mode of ['throws', 'product']) {
        const chat = damage(pending(prefix(BOARD_REPLY), BOARD_REPLY));
        const before = snapshot(chat);
        let failedCalls = 0;
        let appliedCalls = 0;
        const jobs = createWorldJobs({
            active: () => ({ chat, chatId: 'corpus' }),
            run: mode === 'throws'
                ? async () => { throw new Error('provider exploded'); }
                : (c, id, { isCurrent }) => runExtraction(c, id, content, async () => { throw new Error('no request expected'); }, { isCurrent }),
            // index.js: the host's failure path for an exception of the job
            failed: ({ chat: c, id, hash }, error, isCurrent) => { failedCalls += 1; return isCurrent() ? applyExtraction(c, id, content, null, { hash, error: String(error?.message || error), errorKind: 'engine' }) : { changed: false }; },
            applied: () => { appliedCalls += 1; },
        });
        const result = await jobs.start(BOARD_REPLY);
        assert.equal(result.changed, false, mode);
        assert.equal(result.foldBlocked.index, 9, mode);
        assert.equal(failedCalls, mode === 'throws' ? 1 : 0, mode);
        assert.equal(appliedCalls, 0, mode);
        assert.equal(rec(chat[BOARD_REPLY]).extraction.status, 'pending', mode);
        assert.ok(!rec(chat[BOARD_REPLY]).events.some((e) => e.t === 'extract.failed'), mode);
        assert.equal(snapshot(chat), before, mode);
    }
});

// Package C (.132): the board turn's record now carries the hunt's age (tests/replay/accepted_c132_vs_126.json), so the
// repaired run is compared with the same turn and reply processed on the undamaged chat by this build; the corpus check
// (npm run replay:check) compares that build with the .126 baseline record by record
test('A2: after loading a valid state the same turn and reply are processed exactly as on the undamaged chat', async () => {
    const control = withoutRecord(prefix(BOARD_TURN), BOARD_TURN);
    const c = await prepareGenerationAsync(control, content, { type: 'normal', settings: {}, llm: counting(run.answers[BOARD_TURN]).llm });
    const turn = repair(damage(withoutRecord(prefix(BOARD_TURN), BOARD_TURN)));
    const m = counting(run.answers[BOARD_TURN]);
    const r = await prepareGenerationAsync(turn, content, { type: 'normal', settings: {}, llm: m.llm });
    assert.equal(r.action, 'context');
    assert.deepEqual(recordOutput(rec(turn[BOARD_TURN]), { kind: 'player', action: r.action }), recordOutput(rec(control[BOARD_TURN]), { kind: 'player', action: c.action }));
    const { events, ...rest } = baseline.runs['b19-mage'].cases[`b19-mage#${BOARD_TURN}`];
    assert.deepEqual({ ...recordOutput(rec(turn[BOARD_TURN]), { kind: 'player', action: r.action }), events: 0 }, { ...rest, events: 0 }, 'apart from its events, as on .126');
    const ctl = pending(prefix(BOARD_REPLY), BOARD_REPLY);
    await runExtraction(ctl, BOARD_REPLY, content, counting(run.answers[BOARD_REPLY]).llm);
    const reply = repair(damage(pending(prefix(BOARD_REPLY), BOARD_REPLY)));
    const x = await runExtraction(reply, BOARD_REPLY, content, counting(run.answers[BOARD_REPLY]).llm);
    assert.equal(x.applied, true);
    assert.deepEqual(recordOutput(rec(reply[BOARD_REPLY]), { kind: 'reply' }), recordOutput(rec(ctl[BOARD_REPLY]), { kind: 'reply' }));
    assert.deepEqual(recordOutput(rec(reply[BOARD_REPLY]), { kind: 'reply' }), baseline.runs['b19-mage'].cases[`b19-mage#${BOARD_REPLY}`], 'the reply (no creature) as on .126');
});

test('A2 review: a command panel not yet posted is neither posted nor marked on a broken record', async () => {
    const ASSIGN = 33; // "#assign INT 2 WIL 3": its record holds the System panel
    const unposted = () => { const chat = prefix(ASSIGN); rec(chat[ASSIGN]).command.posted = false; return chat; };
    const control = unposted();
    const ok = await prepareGenerationAsync(control, content, { type: 'normal', settings: {}, llm: counting().llm });
    assert.equal(ok.action, 'panels', 'control: a whole record posts the panel once');
    assert.equal(rec(control[ASSIGN]).command.posted, true);
    const chat = damage(unposted());
    const before = snapshot(chat);
    const m = counting();
    const r = await prepareGenerationAsync(chat, content, { type: 'normal', settings: {}, llm: m.llm });
    assert.equal(r.action, 'fold_blocked');
    assert.equal(r.block.index, 9);
    assert.deepEqual(m.calls, []);
    assert.equal(rec(chat[ASSIGN]).command.posted, false);
    assert.equal(snapshot(chat), before);
});

test('A2 review: a reused player record is checked with its own events, not only the history before it', async () => {
    const ASSIGN = 33;
    const chat = prefix(ASSIGN);
    rec(chat[ASSIGN]).command.posted = false;
    damage(chat, ASSIGN); // the history before it folds whole; the record itself holds the event that no longer applies
    assert.equal(foldBlock(foldChat(chat, ASSIGN)), null);
    const before = snapshot(chat);
    const m = counting();
    const r = await prepareGenerationAsync(chat, content, { type: 'normal', settings: {}, llm: m.llm });
    assert.equal(r.action, 'fold_blocked');
    assert.equal(r.block.index, ASSIGN);
    assert.deepEqual(m.calls, []);
    assert.equal(rec(chat[ASSIGN]).command.posted, false);
    assert.equal(snapshot(chat), before);
});

test('A2 review: a reply after a broken record is neither cleaned nor recorded as a system answer', () => {
    const ask = (broken) => {
        const chat = prefix(BOARD_TURN);
        rec(chat[BOARD_TURN]).command = { panels: [], llm: { question: 'help' } }; // an engine System question the narrator answers
        chat.push({ mes: 'The clerk explains the board.\n<avereth>{}</avereth>', is_user: false, is_system: false, extra: {} });
        return broken ? damage(chat) : chat;
    };
    const control = ask(false);
    const ok = processReplyAny(control, BOARD_TURN + 1, content, {});
    assert.equal(ok.changed, true, 'control: a whole record answers the System question');
    assert.equal(rec(control[BOARD_TURN + 1]).system_answer, true);
    assert.equal(control[BOARD_TURN + 1].mes, 'The clerk explains the board.');
    const chat = ask(true);
    const r = processReplyAny(chat, BOARD_TURN + 1, content, {});
    assert.equal(r.changed, false);
    assert.equal(r.foldBlocked.index, 9);
    assert.equal(rec(chat[BOARD_TURN + 1]), undefined);
    assert.equal(chat[BOARD_TURN + 1].mes, 'The clerk explains the board.\n<avereth>{}</avereth>', 'the reply text stays as it came');
    // an ordinary reply's text is not cleaned on a broken record either
    const plain = damage(withoutRecord(prefix(BOARD_REPLY), BOARD_REPLY));
    plain[BOARD_REPLY].mes += '\n<avereth>{"new":[]}</avereth>';
    const text = plain[BOARD_REPLY].mes;
    assert.equal(processReplyAny(plain, BOARD_REPLY, content, {}).foldBlocked.index, 9);
    assert.equal(plain[BOARD_REPLY].mes, text);
});

test('A2: index.js wires every fold block to the host notice, never to a save or failure record', () => {
    const src = fs.readFileSync(`${ROOT}/index.js`, 'utf8');
    const block = src.slice(src.indexOf("if (r.action === 'fold_blocked')"), src.indexOf("if (r.action === 'not_executed')"));
    assert.match(block, /abort\(true\)/);
    assert.match(block, /showFoldBlock\(r\.block\)/);
    assert.doesNotMatch(block, /saveChat|postPanel/);
    assert.match(src, /if \(completed\?\.foldBlocked\) \{ abort\(true\);/);
    assert.match(src, /if \(r\.foldBlocked\) \{ showFoldBlock\(r\.foldBlocked\); renderDebug\(\); return; \}/);
    assert.match(src, /if \(result\?\.foldBlocked && isCurrent\(\)\) \{ showFoldBlock\(result\.foldBlocked\)/);
});
