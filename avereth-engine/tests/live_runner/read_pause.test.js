// Natural batch courtesy pacing for chat-tier LLM usage: the player decides, then ST gets a short
// reading pause before its Planner/Narrator/Extractor chain. A runner-only delay, never game time.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { options, pauseAfterPlayer } from '../../tools/st_live/live/run_live.mjs';
import { batchArgs } from '../../tools/st_live/live/batch.mjs';

const emptyConfig = path.join(os.tmpdir(), `avereth-no-live-config-${process.pid}-read-pause.json`);
const freshOptions = (args = []) => options(['--config', emptyConfig, ...args], {});

test('natural NPC and Guild batches default to a 5-second reading pause without changing their guides', () => {
    for (const mode of ['guild', 'npc']) {
        const b = batchArgs(['--mode', mode, '--headed']);
        const index = b.args.indexOf('--read-pause-ms');
        assert.ok(index >= 0, mode);
        assert.equal(b.args[index + 1], '5000');
        assert.equal(freshOptions(b.args).readPauseMs, 5000);
        assert.ok(b.args.includes('--headed'));
        assert.equal(b.args[b.args.indexOf('--guide') + 1], mode === 'npc' ? 'npc_pulse_test' : 'current_test');
    }
    assert.equal(freshOptions().readPauseMs, 0, 'ordinary single runs have no artificial delay');
});

test('batch read-pause flag overrides the default, including disabling it', () => {
    for (const ms of ['0', '3000', '8000']) {
        const b = batchArgs(['--mode', 'npc', '--read-pause-ms', ms]);
        assert.equal(b.args.filter(x => x === '--read-pause-ms').length, 1);
        assert.equal(freshOptions(b.args).readPauseMs, Number(ms));
    }
    for (const bad of ['-1', '60001', '1.5', 'abc']) {
        assert.throws(() => freshOptions(['--read-pause-ms', bad]), /--read-pause-ms/);
    }
    assert.throws(() => freshOptions(['--read-pause-ms']), /--read-pause-ms/);
});

test('pause occurs once after a live LLM-player decision; never in scripted, stub or zero-pause runs', async () => {
    const waits = [];
    const fake = { wait: async ms => waits.push(ms) };
    assert.equal(await pauseAfterPlayer({ player: { type: 'llm' }, stub: false, readPauseMs: 5000 }, fake), true);
    assert.deepEqual(waits, [5000]);
    assert.equal(await pauseAfterPlayer({ player: { type: 'scripted' }, stub: false, readPauseMs: 5000 }, fake), true);
    assert.equal(await pauseAfterPlayer({ player: { type: 'llm' }, stub: true, readPauseMs: 5000 }, fake), true);
    assert.equal(await pauseAfterPlayer({ player: { type: 'llm' }, stub: false, readPauseMs: 0 }, fake), true);
    assert.deepEqual(waits, [5000], 'no extra sleeping for other modes');
});

test('the reading pause checks the stop request before and after waiting', async () => {
    const player = { player: { type: 'llm' }, stub: false, readPauseMs: 5000 };
    let waited = 0;
    assert.equal(await pauseAfterPlayer(player, { stopped: () => true, wait: async () => { waited++; } }), false);
    assert.equal(waited, 0);
    let stop = false;
    assert.equal(await pauseAfterPlayer(player, { stopped: () => stop, wait: async () => { waited++; stop = true; } }), false);
    assert.equal(waited, 1);
});
