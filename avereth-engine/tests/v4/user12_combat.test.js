import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { npcDecide } from '../../src/combat.js';
import { loadProductContent } from '../helpers.js';

// Original Phase B folds immediately after zero-based messages M73 and M75.
const states = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user12_bandit_states.json.gz', import.meta.url))));
const content = await loadProductContent();

test('User12 bandits try a new action after the recorded sidestep', () => {
    for (const state of Object.values(states)) {
        const enc = state.encounter;
        const ctx = { state, enc, content, c: true };
        for (const actor of ['npc.npctoll_thickset', 'npc.npctoll_lean']) {
            assert.equal(npcDecide(ctx, actor).kind, 'close_and_attack');
            const originalLog = enc.log;
            enc.log = originalLog.filter(row => row.actor !== actor || row.kind !== 'sidestep');
            assert.equal(npcDecide(ctx, actor).kind, 'cover');
            enc.log = originalLog;
            enc.combatants[actor].current.band = 'ENGAGED';
            assert.equal(npcDecide(ctx, actor).kind, 'attack');
            for (const [intent, action] of [['flee', 'flee'], ['surrender', 'surrender'], ['parley', 'hold'], ['take_cover', 'cover']]) {
                enc.intents[actor] = intent;
                assert.equal(npcDecide(ctx, actor).kind, action);
            }
        }
    }
});
