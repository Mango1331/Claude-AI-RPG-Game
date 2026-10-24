// 10B-4b: classify actual terminal faults in the LOCAL open-run runner without
// changing SillyTavern, the game state, the guide or narrator/Extractor retries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { setRec } from '../../src/host.js';
import { turnOutcome, turnFailure } from '../../tools/st_live/live/evaluator.mjs';

const pc = (mes = 'I walk to the guild.') => ({ mes, is_user: true, is_system: false, extra: {} });
const story = (mes = 'He approaches the guild.') => ({ mes, is_user: false, is_system: false, extra: {} });
const panel = (mes = '[SYSTEM // STATUS]') => ({ mes, is_user: false, is_system: true, extra: {} });
const failed = (chat, index, changes) => {
    setRec(chat[index], { events: [], ...changes });
    return chat;
};

test('10B-4b: aborted C Planner without a reply is planner_failed, not a browser/UI failure', () => {
    const chat = failed([pc()], 0, { plan: { failed: true, error: 'empty JSON' }, interp: { failed: true } });
    assert.equal(turnOutcome(chat, 0).kind, 'missing');
    assert.deepEqual(turnFailure(chat, 0), { kind: 'planner_failed', at: 0, reason: 'empty JSON' });
});

test('10B-4b: failed V4-A Interpreter is classified separately', () => {
    const chat = failed([pc()], 0, { interp: { failed: true, error: 'invalid interpretation' } });
    assert.deepEqual(turnFailure(chat, 0), { kind: 'interpreter_failed', at: 0, reason: 'invalid interpretation' });
});

test('10B-4b: a failed Planner with a System failure notice still has its actual phase', () => {
    const chat = failed([pc(), panel('Avereth Engine: planner failed')], 0, { plan: { failed: true }, interp: { failed: true } });
    assert.equal(turnOutcome(chat, 0).kind, 'engine');
    assert.deepEqual(turnFailure(chat, 0), { kind: 'planner_failed', at: 0, reason: null });
});

test('10B-4b: failed Extractor after visible story is an extractor failure, not a successful story turn', () => {
    const chat = failed([pc(), story()], 1, { extraction: { status: 'failed', error: 'signal is aborted without reason' } });
    assert.equal(turnOutcome(chat, 0).kind, 'story', 'the visible story remains visible');
    assert.deepEqual(turnFailure(chat, 0), { kind: 'extractor_failed', at: 1, reason: 'signal is aborted without reason' });
});

test('10B-4b: a late/expired Extractor is distinctly identified and never passed off as success', () => {
    const chat = failed([pc(), story()], 1, { extraction: { status: 'late' } });
    assert.deepEqual(turnFailure(chat, 0), { kind: 'extractor_late', at: 1, reason: null });
});

test('10B-4b: narrator_empty retains precedence over any extraction flag', () => {
    const chat = failed([pc(), story('')], 1, { narration: { empty: true }, extraction: { status: 'skipped' } });
    assert.deepEqual(turnFailure(chat, 0), { kind: 'narrator_empty', at: 1, reason: null });
});

test('10B-4b: missing reply without a diagnosed Planner error remains missing/UI', () => {
    assert.deepEqual(turnFailure([pc()], 0), { kind: 'missing', at: null, reason: null });
});

test('10B-4b: ordinary story, successful extraction, #command and engine panels are not fatal', () => {
    assert.equal(turnFailure([pc(), story()], 0), null);
    const applied = failed([pc(), story()], 1, { extraction: { status: 'applied' } });
    assert.equal(turnFailure(applied, 0), null);
    assert.equal(turnFailure([pc('#status'), panel()], 0), null);
    assert.equal(turnFailure([pc(), panel('[SYSTEM // CLARIFY]')], 0), null);
});

test('10B-4b: the failure belongs only to its own turn, not a later normal turn', () => {
    const chat = [pc(), story(), pc('I wait.'), story('He waits.')];
    setRec(chat[1], { events: [], extraction: { status: 'failed', error: 'timeout' } });
    setRec(chat[3], { events: [], extraction: { status: 'applied' } });
    assert.equal(turnFailure(chat, 0).kind, 'extractor_failed');
    assert.equal(turnFailure(chat, 2), null);
});
