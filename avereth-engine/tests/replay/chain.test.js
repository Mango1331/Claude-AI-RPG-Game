// Architecture patch A (.127): the current integration chain as a transition check, on the real Batch19 Mage campaign
// (V4-C, Ruleset 2, current F flags): creation → Guild registration → board → contract → hunt fight → level-up →
// payout → loot sale → purchase and equip. Its records replay exactly as on the .126 baseline (replay.test.js); here:
// the chain is whole, a reload rebuilds the same valid state, and neither a reply swipe nor a regenerated player turn
// books anything twice or asks a model again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { rec, foldChat, messageEvents, foldBlock } from '../../src/host.js';
import { prepareGenerationAsync, campaignSupport } from '../../src/v4/runtime.js';
import { validateState } from '../../src/validate.js';
import { loadRun } from '../../tools/replay/replay.mjs';

const content = await loadProductContent();
const run = loadRun('b19-mage');
const END = 46; // the reply after the purchase and equip of the Fine Birch Staff
const chain = () => structuredClone(run.chat.slice(0, END + 1));
const firstIndex = (chat, pred) => chat.findIndex((m) => messageEvents(m).some(pred));

test('chain: creation, Guild, contract, fight, level-up, payout, sale and purchase in story order', () => {
    const chat = chain();
    const steps = [
        firstIndex(chat, (e) => e.t === 'creation.completed'),
        firstIndex(chat, (e) => e.t === 'guild.registered'),
        firstIndex(chat, (e) => e.t === 'board.shown'),
        firstIndex(chat, (e) => e.t === 'quest.status' && e.d.to === 'active'),
        firstIndex(chat, (e) => e.t === 'encounter.ended' && e.d.summary.defeated.length > 0 && !e.d.summary.pc_dead),
        firstIndex(chat, (e) => e.t === 'level.up'),
        firstIndex(chat, (e) => e.t === 'transaction.completed' && e.d.from === 'guild' && e.d.quest),
        firstIndex(chat, (e) => e.t === 'transaction.completed' && e.d.to === 'pc' && e.d.from?.startsWith('npc.')),
        firstIndex(chat, (e) => e.t === 'transaction.completed' && e.d.offer && e.d.seller?.startsWith('npc.')),
        firstIndex(chat, (e) => e.t === 'item.equipped'),
    ];
    assert.ok(steps.every((i) => i > 0), JSON.stringify(steps));
    assert.deepEqual([...steps].sort((a, b) => a - b), steps);
    const { state } = foldChat(chat);
    assert.equal(state.meta.runtime, 'v4');
    assert.equal(state.meta.ruleset, 2);
    // B1 (.130): the F flags are no state any more; the campaign's own start record carries the supported .126
    // configuration, and the version guard accepts it
    const start = messageEvents(chat[0]).find((e) => e.t === 'campaign.started').d;
    assert.equal(start.f_progression && start.f_balance && start.starter_aoe, true);
    assert.equal('f_progression' in state.meta || 'f_balance' in state.meta || 'starter_aoe' in state.meta, false);
    assert.equal(campaignSupport(chat), null);
    assert.ok(state.entities.pc.sheet.level >= 2);
});

test('chain: every step folds whole and valid, and a reload rebuilds the identical state', () => {
    const chat = chain();
    for (let i = 1; i <= END; i++) {
        const fold = foldChat(chat, i + 1);
        assert.equal(foldBlock(fold), null, `message ${i}`);
        if (messageEvents(chat[i]).length) assert.deepEqual(validateState(fold.state, content), [], `message ${i}`);
    }
    const reloaded = JSON.parse(JSON.stringify(chat));
    assert.deepEqual(foldChat(reloaded).state, foldChat(chat).state);
});

test('chain: a new swipe of the last reply carries no events; switching back restores them, never twice', () => {
    const chat = chain();
    const whole = foldChat(chat).state;
    const original = structuredClone(chat[END]);
    // SillyTavern copies `extra` into a new swipe before it is generated: a stale record that must not apply
    chat[END].mes = 'A different telling of the same moment.';
    assert.deepEqual(messageEvents(chat[END]), []);
    assert.deepEqual(foldChat(chat).state, foldChat(chain().slice(0, END)).state);
    chat[END] = original;
    assert.deepEqual(foldChat(chat).state, whole);
});

test('chain: regenerating the purchase turn reuses its record: no model call, no second purchase', async () => {
    const chat = structuredClone(run.chat.slice(0, END)); // up to the purchase turn, its reply being regenerated
    const u = END - 1;
    assert.ok(rec(chat[u]).events.some((e) => e.t === 'transaction.completed'));
    const before = JSON.stringify(rec(chat[u]).events);
    const coin = foldChat(chat).state.entities.pc.sheet.coin_cp;
    const calls = [];
    for (const type of ['regenerate', 'swipe']) {
        const r = await prepareGenerationAsync(chat, content, { type, settings: {}, llm: async ({ purpose }) => { calls.push(purpose); return null; } });
        assert.equal(r.action, 'context', type);
    }
    assert.deepEqual(calls, []);
    assert.equal(JSON.stringify(rec(chat[u]).events), before);
    assert.equal(foldChat(chat).state.entities.pc.sheet.coin_cp, coin);
});
