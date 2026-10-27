import test from 'node:test';
import assert from 'node:assert/strict';
import { createNarratorRecovery } from '../../src/v4/narrator_recovery.js';
import { rec, setRec } from '../../src/host.js';
function setup() {
    const chat = [{ is_user: true, mes: 'I buy the room.', extra: {} }, { mes: '', extra: {} }];
    setRec(chat[0], { events: [{ t: 'transaction.completed', d: { cp: 6 } }] });
    setRec(chat[1], { narration: { empty: true }, events: [] });
    const state = { chat, chatId: 'a', epoch: 1, busy: true }, queued = [], calls = [];
    const recovery = createNarratorRecovery({ active: () => state, save: async () => calls.push('save'), generate: async type => calls.push(type), schedule: fn => queued.push(fn) });
    return { state, recovery, calls, flush: async () => { while (queued.length) await queued.shift()(); } };
}
test('101 narrator: waits for host completion, regenerates once and preserves the booked user turn', async () => {
    const x = setup(), events = structuredClone(rec(x.state.chat[0]).events);
    assert.equal(x.recovery.queue(1), true); x.recovery.finish(); await x.flush(); assert.deepEqual(x.calls, []);
    x.state.busy = false; x.recovery.finish(); await x.flush(); assert.deepEqual(x.calls, ['save', 'regenerate']);
    assert.deepEqual(rec(x.state.chat[0]).events, events); assert.equal(x.recovery.queue(1), false);
});
for (const mode of ['chat', 'edit', 'swipe', 'new user', 'new generation', 'stop']) test(`101 narrator: ${mode} cancels queued recovery`, async () => {
    const x = setup(); x.recovery.queue(1); x.recovery.finish();
    if (mode === 'chat') x.state.chatId = 'b';
    if (mode === 'edit') x.state.chat[0].mes = 'I do something else.';
    if (mode === 'swipe') x.state.chat[1].mes = 'A different story';
    if (mode === 'new user') x.state.chat.push({ is_user: true, mes: 'I leave.' });
    if (mode === 'new generation') x.state.epoch++;
    if (mode === 'stop') x.recovery.invalidate();
    x.state.busy = false; await x.flush(); assert.deepEqual(x.calls, []);
});
