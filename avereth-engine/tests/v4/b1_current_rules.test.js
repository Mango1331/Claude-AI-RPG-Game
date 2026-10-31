// Architecture patch B1 (.130, patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md §4 B1): f_progression, f_balance,
// starter_aoe and the yearling option are no campaign variants any more (their current values are the rules), and the
// version guard reads the campaign's own campaign.started record: the .126 configuration and campaigns started on a
// flagless build from .130 on are continued; every other protocol is refused at the host before anything is resolved,
// asked, recorded or saved. No migration, no new field.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadProductContent } from '../helpers.js';
import { campaign } from './patch8_lib.js';
import { rec, foldChat } from '../../src/host.js';
import { campaignSupport, campaignStart, parseBuild, compareBuilds, FLAGLESS_SINCE } from '../../src/v4/runtime.js';
import { startCampaign } from '../../src/engine.js';
import { ENGINE_VERSION } from '../../src/util.js';
import { promotionPp } from '../../src/skills.js';
import { namesYoung } from '../../src/v4/domain.js';
import { worldVocab } from '../../src/v4/extract.js';
import { loadCorpus } from '../../tools/replay/replay.mjs';

const content = await loadProductContent();
const startOf = (chat) => rec(chat[0]).events.find((e) => e.t === 'campaign.started').d;
/** A product campaign whose start record is changed to `change` (a historical configuration). */
async function variant(change) {
    const g = await campaign(content);
    change(startOf(g.chat));
    return g;
}

test('B1: builds are compared as numbers, never as text; an unreadable build is no build', () => {
    assert.deepEqual(parseBuild('4.3.0-c.6.6.130'), [4, 3, 0, 6, 6, 130]);
    assert.ok(compareBuilds(parseBuild('4.3.0-c.6.6.130'), parseBuild('4.3.0-c.6.6.99')) > 0, 'text order would put .99 after .130');
    assert.ok(compareBuilds(parseBuild('4.3.0-c.6.6.129'), parseBuild(FLAGLESS_SINCE)) < 0);
    assert.ok(compareBuilds(parseBuild('4.10.0-c.1.1.1'), parseBuild('4.9.9-c.9.9.999')) > 0);
    for (const bad of [undefined, null, '', 'dev', '4.3.0', '4.3.0-c.6.6', '4.3.0-c.6.6.130-rc1', 4130]) assert.equal(parseBuild(bad), null, String(bad));
    assert.equal(ENGINE_VERSION, FLAGLESS_SINCE, 'this build is the first flagless one');
});

test('B1: every run of the processing corpus (.126 configuration) is a supported campaign', () => {
    for (const run of loadCorpus()) {
        const d = campaignStart(run.chat);
        assert.equal(d.f_progression && d.f_balance && d.starter_aoe, true, run.source.label);
        assert.equal(campaignSupport(run.chat), null, run.source.label);
    }
});

test('B1: a new campaign writes none of the retired switches, names its build and is supported', async () => {
    for (const more of [{ ruleset: 2, planner: true }, { ruleset: 1 }, { ruleset: 2, planner: false }]) {
        const d = startCampaign(content, { runtime: 'v4', seed: 3, ...more })[0].d;
        for (const k of ['f_progression', 'f_balance', 'starter_aoe']) assert.equal(k in d, false, k);
        assert.equal(d.engine_version, ENGINE_VERSION);
    }
    const g = await campaign(content);
    assert.deepEqual([startOf(g.chat).runtime, startOf(g.chat).path, startOf(g.chat).ruleset, startOf(g.chat).private_quests], ['v4', 'c', 2, false]);
    assert.equal(campaignSupport(g.chat), null);
    assert.equal(campaignSupport([{ mes: 'no campaign yet', is_user: false, extra: {} }]), null, 'a chat without a campaign is not refused');
});

test('B1: every historical configuration is refused with its reason', async () => {
    const cases = [
        [(d) => { delete d.runtime; delete d.path; }, /Runtime V3/],
        [(d) => { d.path = 'a'; }, /retired path A/],
        [(d) => { delete d.path; }, /no pinned planner path/],
        [(d) => { d.ruleset = 1; }, /Ruleset 1/],
        [(d) => { delete d.private_quests; }, /formal private quests/],
        [(d) => { d.engine_version = 'dev'; }, /missing or unreadable/],
        [(d) => { delete d.engine_version; }, /missing or unreadable/],
        [(d) => { d.engine_version = '4.3.0-c.6.6.129'; }, /older F rule configuration/],
        [(d) => { d.engine_version = '4.3.0-c.6.6.99'; }, /older F rule configuration/],
        [(d) => { d.f_progression = true; }, /older F rule configuration/],
        [(d) => { d.f_progression = true; d.f_balance = true; d.engine_version = '4.3.0-c.6.6.126'; }, /older F rule configuration/],
    ];
    for (const [change, why] of cases) {
        const g = await variant(change);
        const block = campaignSupport(g.chat);
        assert.ok(block, String(why));
        assert.match(block.reason, why);
        assert.match(block.notice, /^UNSUPPORTED CAMPAIGN — .*Nothing was booked, saved or sent to a model/);
    }
    // the .126 configuration itself, on its own build
    const old = await variant((d) => Object.assign(d, { f_progression: true, f_balance: true, starter_aoe: true, engine_version: '4.3.0-c.6.6.126' }));
    assert.equal(campaignSupport(old.chat), null);
});

test('B1: an edited greeting does not hide the protocol its record was started on', async () => {
    const g = await variant((d) => { d.path = 'a'; });
    g.chat[0].mes = 'An edited greeting.';
    assert.match(campaignSupport(g.chat).reason, /retired path A/);
});

test('B1: a flagless campaign plays the current values (AoE starter pool, F balance, world progression, yearlings)', async () => {
    const g = await campaign(content, { cls: 'Mage', skills: 'Arcane Wave + Arcane Bolt' });
    const s = g.state();
    for (const k of ['f_progression', 'f_balance', 'starter_aoe']) assert.equal(k in s.meta, false, k);
    assert.ok(s.entities.pc.sheet.skills['mage.arcane_wave'], 'the AoE pool offered Arcane Wave');
    const burst = await campaign(content, { cls: 'Mage', skills: 'Arcane Burst + Arcane Bolt' });
    assert.equal(burst.state().entities.pc.sheet.skills?.['mage.arcane_burst'], undefined, 'Arcane Burst is no starting choice');
    assert.deepEqual([1, 2, 3].map((c) => promotionPp(content, { complexity: c }, s)), [50, 75, 100]);
    assert.ok(worldVocab(content.deltaVocab, s).deltas.some((d) => d.type === 'area'));
    assert.equal(namesYoung(content, 'thorn-backed boar yearling'), true, 'a yearling is the young of its kind');
});

/** index.js with a minimal SillyTavern host on this chat (as tests/v4/patch_failsoft_host_block.test.js). */
async function host(chat, tag) {
    const calls = { raw: 0, saves: 0, errors: [], aborted: 0, prompts: [] };
    const handlers = {};
    let initialized;
    const c = { chat, characters: [{ name: 'test', avatar: 'test.png' }], characterId: 0, extensionSettings: {}, getCurrentChatId: () => `b1-${tag}`, getRequestHeaders: () => ({}),
        eventTypes: { MESSAGE_RECEIVED: 'received', GENERATION_ENDED: 'ended', CHAT_COMPLETION_SETTINGS_READY: 'ready', GENERATION_STOPPED: 'stop', MESSAGE_EDITED: 'edited', CHAT_CHANGED: 'chat', MESSAGE_DELETED: 'deleted', MESSAGE_SWIPED: 'swiped' },
        eventSource: { on(type, fn) { (handlers[type] ||= []).push(fn); if (type === 'swiped') initialized(); } },
        saveChat: async () => { calls.saves++; }, saveSettingsDebounced() {}, setExtensionPrompt(...a) { calls.prompts.push(a[1]); }, addOneMessage() {},
        generateRaw: async () => { calls.raw++; return JSON.stringify({ commands: [] }); } }; // a valid, empty plan
    globalThis.fetch = async (url) => (String(url).startsWith('file:') ? { ok: true, json: async () => JSON.parse(await readFile(url, 'utf8')) } : { ok: true, json: async () => [{}, ...structuredClone(c.chat)] }); // the saved chat is what the host holds
    globalThis.document = { getElementById: () => null, querySelector: () => null };
    globalThis.SillyTavern = { getContext: () => c };
    globalThis.toastr = { error(text) { calls.errors.push(text); }, warning() {} };
    const ready = new Promise((r) => { initialized = r; });
    await import(`../../index.js?b1-${tag}`);
    await ready;
    return { c, calls, handlers };
}

test('B1 host: an unsupported campaign is refused at every entry without money, time, record, save or provider call', async () => {
    const keys = ['fetch', 'document', 'SillyTavern', 'toastr', 'averethInterceptor'];
    const previous = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));
    try {
        const g = await variant((d) => { d.path = 'a'; });
        g.chat.push({ mes: 'I sell the pelts for twenty copper.', is_user: true, is_system: false, extra: {} });
        const before = structuredClone(g.chat);
        const state = structuredClone(foldChat(g.chat).state);
        const { calls, handlers } = await host(g.chat, 'refused');
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(calls.aborted, 1, 'the generation is stopped');
        g.chat.push({ mes: 'The merchant counts out twenty copper.', is_user: false, is_system: false, extra: {} });
        const withReply = structuredClone(g.chat);
        for (const fn of handlers.received) await fn(g.chat.length - 1);
        for (const fn of handlers.edited) await fn(g.chat.length - 1);
        for (const fn of [...handlers.chat, ...handlers.swiped]) await fn();
        assert.deepEqual(g.chat, withReply, 'no record, no booking');
        assert.deepEqual(before, withReply.slice(0, -1));
        assert.deepEqual(foldChat(g.chat).state.entities.pc.sheet.coin_cp, state.entities.pc.sheet.coin_cp);
        assert.equal(foldChat(g.chat).state.clock.minute, state.clock.minute);
        assert.equal(calls.raw, 0, 'no provider call');
        assert.equal(calls.saves, 0, 'nothing saved');
        assert.ok(calls.errors.length >= 1 && calls.errors.every((e) => /^UNSUPPORTED CAMPAIGN — it plays the retired path A/.test(e)));
        assert.equal(calls.errors.length, 1, 'the notice once per chat');
    } finally { for (const k of keys) globalThis[k] = previous[k]; }
});

test('B1 host: a current campaign passes the guard and is processed as before', async () => {
    const keys = ['fetch', 'document', 'SillyTavern', 'toastr', 'averethInterceptor'];
    const previous = Object.fromEntries(keys.map((k) => [k, globalThis[k]]));
    try {
        const g = await campaign(content);
        g.chat.push({ mes: 'I look around.', is_user: true, is_system: false, extra: {} });
        const { calls } = await host(g.chat, 'current');
        await globalThis.averethInterceptor([], 8000, () => { calls.aborted++; }, 'normal');
        assert.equal(calls.aborted, 0);
        assert.equal(calls.errors.filter((e) => /UNSUPPORTED/.test(e)).length, 0);
        assert.ok(calls.raw > 0, 'the planner is asked');
        assert.ok(rec(g.chat.at(-1))?.events?.some((e) => e.t === 'outcome.recorded'), 'the turn is resolved and recorded');
        assert.ok(calls.prompts.some((p) => /AVERETH ENGINE/.test(p)), 'the engine block is handed to the narrator');
    } finally { for (const k of keys) globalThis[k] = previous[k]; }
});
