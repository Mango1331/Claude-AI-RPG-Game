// B1 review (.131): a stored campaign.started record is never replaced by an automatic new start. The greeting that
// holds it can change without the engine reading the edit (messageEvents then hides the record from the fold, and
// hasCampaign() reads false); before .131 the interceptor called ensureCampaign() first, which started a second
// campaign over the record when at most one player message existed, and the version guard came too late. Driven
// through the real host (index.js): a refused old campaign and a supported one, each with a changed greeting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { host, GLOBALS } from './host_lib.js';
import { rec, ensureCampaign, hasCampaign, hasStoredCampaign, foldChat } from '../../src/host.js';
import { campaignSupport } from '../../src/v4/runtime.js';

const content = await loadProductContent();
const GREETING = 'Location: outside Alderwatch, Valedorn Crown\n\nThe road ends at the gate.';
const startOf = (chat) => rec(chat[0]).events.find((e) => e.t === 'campaign.started').d;

/** A fresh chat: the greeting with its start record (seed 1) and the player's first message (creation). */
function fresh(change = null) {
    const chat = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    ensureCampaign(chat, content, { seed: 1, runtime: 'v4', planner: true });
    if (change) change(startOf(chat));
    chat.push({ mes: 'Mage', is_user: true, is_system: false, extra: {} });
    return chat;
}
async function guarded(fn) {
    const previous = Object.fromEntries(GLOBALS.map((k) => [k, globalThis[k]]));
    try { await fn(); } finally { for (const k of GLOBALS) globalThis[k] = previous[k]; }
}

test('B1 review: ensureCampaign never starts over a stored record its greeting no longer matches', () => {
    const chat = fresh();
    const original = structuredClone(rec(chat[0]));
    chat[0].mes = `${GREETING} (changed)`;
    assert.equal(hasCampaign(chat), false, 'the fold no longer sees it');
    assert.equal(hasStoredCampaign(chat), true, 'the record is still stored');
    assert.equal(ensureCampaign(chat, content, { seed: 99, runtime: 'v4', planner: true }), 'hidden');
    assert.equal(ensureCampaign(chat, content, { seed: 99, runtime: 'v4', planner: true, force: true }), 'hidden', 'not even forced');
    assert.deepEqual(rec(chat[0]), original);
    // a chat with no stored start still gets its campaign
    const none = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    assert.equal(ensureCampaign(none, content, { seed: 2, runtime: 'v4', planner: true }), 'created');
});

for (const [name, change, notice] of [
    ['a refused old campaign (path A)', (d) => { d.path = 'a'; }, /^UNSUPPORTED CAMPAIGN — it plays the retired path A/],
    ['a refused old campaign (partial F flags)', (d) => { d.f_progression = true; d.engine_version = '4.3.0-c.6.6.126'; }, /^UNSUPPORTED CAMPAIGN — it was started with an older F rule configuration/],
    ['a supported campaign', null, /^CAMPAIGN START HIDDEN — /],
]) {
    test(`B1 review host: ${name} with a changed greeting keeps its start record; nothing is started, booked, saved or asked`, async () => {
        await guarded(async () => {
            const chat = fresh(change);
            const original = structuredClone(rec(chat[0]));
            chat[0].mes = `${GREETING}\n\nAn edited line the engine never read.`;
            const before = structuredClone(chat);
            const tag = `start-${name.replace(/\W+/g, '-')}`;
            const { calls, handlers } = await host(chat, tag);
            await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
            assert.equal(calls.aborted, 1, 'the generation is stopped');
            assert.deepEqual(rec(chat[0]), original, 'the stored start record is unchanged');
            assert.deepEqual(chat, before, 'no record, no second campaign');
            // the reply that may still arrive, and the greeting's own MESSAGE_RECEIVED, write nothing either
            chat.push({ mes: 'The gate opens.', is_user: false, is_system: false, extra: {} });
            const withReply = structuredClone(chat);
            for (const fn of handlers.received) { await fn(0); await fn(chat.length - 1); }
            assert.deepEqual(chat, withReply);
            assert.equal(calls.raw, 0, 'no provider call');
            assert.equal(calls.saves, 0, 'nothing saved');
            assert.equal(calls.errors.length, 1, 'one notice');
            assert.match(calls.errors[0], notice);
            assert.deepEqual(calls.warnings, [], 'not mistaken for a chat played without the engine');
        });
    });
}

test('B1 review host: a supported campaign with more played turns and a changed greeting is blocked the same way', async () => {
    await guarded(async () => {
        const g = await campaign(content);
        const original = structuredClone(rec(g.chat[0]));
        g.chat[0].mes = `${g.chat[0].mes} (changed)`;
        g.chat.push({ mes: 'I look around.', is_user: true, is_system: false, extra: {} });
        const before = structuredClone(g.chat);
        const { calls } = await host(g.chat, 'start-played');
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(calls.aborted, 1);
        assert.deepEqual(rec(g.chat[0]), original);
        assert.deepEqual(g.chat, before);
        assert.equal(calls.raw + calls.saves, 0);
        assert.match(calls.errors[0], /^CAMPAIGN START HIDDEN — /);
        assert.deepEqual(calls.warnings, []);
    });
});

test('B1 review host: a greeting edit the engine reads (MESSAGE_EDITED) keeps the campaign; play continues on it', async () => {
    await guarded(async () => {
        const chat = fresh();
        const seed = startOf(chat).seed;
        chat[0].mes = `${GREETING} (edited in SillyTavern)`;
        const { calls, handlers } = await host(chat, 'start-edited');
        for (const fn of handlers.edited) await fn(0);
        assert.equal(hasCampaign(chat), true, 'the edit is read: the record matches its text again');
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(startOf(chat).seed, seed, 'the same campaign');
        assert.equal(rec(chat[0]).events.filter((e) => e.t === 'campaign.started').length, 1);
        assert.equal(calls.errors.length, 0);
        assert.equal(campaignSupport(chat), null);
        assert.ok(foldChat(chat).state.meta.started);
    });
});

test('B1 review host: choosing an alternate greeting (its own swipe, no stored record) still starts the campaign there', async () => {
    await guarded(async () => {
        // SillyTavern 1.19 syncSwipeToMes: a greeting swipe brings its own extra; an alternate greeting has none yet
        const first = { mes: GREETING, is_user: false, is_system: false, extra: {}, swipe_id: 0, swipes: [GREETING, 'Location: outside Alderwatch, Valedorn Crown\n\nRain.'], swipe_info: [{ extra: {} }, { extra: {} }] };
        const chat = [first];
        ensureCampaign(chat, content, { seed: 1, runtime: 'v4', planner: true });
        Object.assign(first, { swipe_id: 1, mes: first.swipes[1], extra: structuredClone(first.swipe_info[1].extra) });
        chat.push({ mes: 'Mage', is_user: true, is_system: false, extra: {} });
        assert.equal(hasStoredCampaign(chat), false);
        const { calls } = await host(chat, 'start-alternate');
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(hasCampaign(chat), true);
        assert.equal(calls.errors.length, 0);
        assert.ok(first.swipe_info[0].extra.avereth.events.some((e) => e.t === 'campaign.started'), 'the first greeting keeps its own record');
    });
});
