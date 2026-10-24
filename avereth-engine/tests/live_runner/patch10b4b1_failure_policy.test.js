// Patch 10B-4b.1: do not truncate a natural long-run for failed
// nonmechanical dialogue, but stop when a real world commit was expected.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRec } from '../../src/host.js';
import { turnFailure, failureEnd, softExtractionFailure, driverFailure } from '../../tools/st_live/live/evaluator.mjs';

const user = () => ({ mes: 'I say hello.', is_user: true, is_system: false, extra: {} });
const reply = (mes = 'The innkeeper greets Alaric.') => ({ mes, is_user: false, is_system: false, extra: {} });
const book = (commands = [], extras = {}) => [
    { t: 'turn.begun', d: { turn: 1, input: 'I say hello.' } },
    { t: 'cmd.interpreted', d: { commands } },
    { t: 'outcome.recorded', d: { outcome: {
        kind: 'v4', actions: commands.length ? ['1. GO — ...'] : ['NOTHING TO BOOK — Alaric decides nothing the engine resolves in this message; narrate what he says and does, and the world’s response.'],
        expected_keys: {}, ...extras,
    } } },
];
function run({ commands = [], extras = {}, extraEvents = [], status = 'failed', error = 'API timeout', ownInterp = true } = {}) {
    const chat = [user(), reply()];
    setRec(chat[0], { events: [...book(commands, extras), ...extraEvents], ...(ownInterp ? { interp: { commands } } : {}) });
    setRec(chat[1], { events: [], extraction: { status, error } });
    return chat;
}

test('4b.1 soft: pure dialogue, no commands or expected outcome, failed extraction', () => {
    const chat = run();
    const fault = turnFailure(chat, 0);
    assert.equal(fault.kind, 'extractor_failed');
    assert.equal(softExtractionFailure(chat, 0, fault), true);
});

test('4b.1 soft: explicitly empty Planner result may advance without deleting the failed record', () => {
    const chat = run();
    assert.equal(softExtractionFailure(chat, 0, turnFailure(chat, 0)), true);
    assert.equal(chat[1].extra.avereth.extraction.status, 'failed');
});

test('4b.1 hard: planned GO or GIVE forbids soft recovery even without an expected result', () => {
    for (const type of ['go', 'give', 'attack', 'take', 'quest.accept']) {
        const chat = run({ commands: [{ seq: 1, type }] });
        assert.equal(softExtractionFailure(chat, 0, turnFailure(chat, 0)), false, type);
    }
});

test('4b.1 hard: authoritative expected keys forbid soft treatment', () => {
    const chat = run({ extras: { expected_keys: { 1: 'go' } } });
    assert.equal(softExtractionFailure(chat, 0, turnFailure(chat, 0)), false);
});

test('4b.1 hard: world state event or a missing explicit empty Planner is not safe to skip', () => {
    const item = run({ extraEvents: [{ t: 'object.moved', d: { object: 'obj.1' } }] });
    assert.equal(softExtractionFailure(item, 0, turnFailure(item, 0)), false);
    const unknown = run({ ownInterp: false });
    assert.equal(softExtractionFailure(unknown, 0, turnFailure(unknown, 0)), false);
});

test('4b.1 hard: no engine-recorded v4 outcome or unresolved action cannot be soft', () => {
    for (const extras of [{ kind: 'combat' }, { resolutions: [{ status: 'authorized' }] }, { actions: ['1. GO — Guild'] }]) {
        const chat = run({ extras });
        assert.equal(softExtractionFailure(chat, 0, turnFailure(chat, 0)), false);
    }
});

test('4b.1 only failed extraction is soft-eligible; empty Narrator and late are not', () => {
    const chat = run({ status: 'late' });
    assert.equal(softExtractionFailure(chat, 0, turnFailure(chat, 0)), false);
    assert.equal(softExtractionFailure(chat, 0, { kind: 'narrator_empty', at: 1 }), false);
});

test('4b.1 driver: a truly pending Extractor at turn timeout gets extractor_timeout', () => {
    const chat = run({ status: 'pending' });
    const fault = driverFailure(chat, 'the turn did not end within 900 s (busy false, extraction pending)');
    assert.deepEqual(fault, { kind: 'extractor_timeout', at: 1, reason: 'extraction remained pending at the turn timeout' });
    assert.equal(failureEnd(fault, 17).kind, 'extractor_timeout');
});

test('4b.1 driver: never classify pending when the host says it completed or no story exists', () => {
    const done = run({ status: 'applied' });
    assert.equal(driverFailure(done, 'the turn did not end within 900 s (busy false, extraction pending)'), null);
    assert.equal(driverFailure([user()], 'the turn did not end within 900 s (busy false, extraction pending)'), null);
});

test('4b.1 driver: planner failure with no reply has actual phase; other UI errors remain UI', () => {
    const chat = [user()];
    setRec(chat[0], { plan: { failed: true, error: 'JSON empty' }, interp: { failed: true }, events: [] });
    assert.deepEqual(driverFailure(chat, 'no reply after the message'), { kind: 'planner_failed', at: 0, reason: 'JSON empty' });
    assert.equal(driverFailure(chat, 'a dialog opened'), null);
});

test('4b.1 distinguish Planner and Interpreter via .failed, never merely plan presence', () => {
    const chat = [user()];
    setRec(chat[0], { plan: { failed: false }, interp: { failed: true, error: 'interpreter failed' }, events: [] });
    assert.deepEqual(turnFailure(chat, 0), { kind: 'interpreter_failed', at: 0, reason: 'interpreter failed' });
});

test('4b.1 preserve original 4b phase identifiers and undiagnosed UI fallback', () => {
    const chat = run({ commands: [{ seq: 1, type: 'go' }], extras: { expected_keys: { 1: 'go' } } });
    assert.equal(turnFailure(chat, 0).kind, 'extractor_failed');
    assert.equal(driverFailure(chat, 'no reply after the message'), null);
    assert.equal(failureEnd({ kind: 'missing', at: null, reason: null }, 1).kind, 'ui');
});
