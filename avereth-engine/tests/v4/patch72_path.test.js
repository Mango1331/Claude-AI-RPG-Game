// Patch 7.2A (4.3.0-c.6.6.21): V4-C, the semantic planner, is the product path. A V4 campaign started now keeps the
// path it started with (campaign.started path); a running campaign never changes its path because the setting changed;
// campaigns started before carry none and follow the planner setting as it stood before 7.2 (index.js legacyPlanner).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { ensureCampaign, rec, processReply } from '../../src/host.js';
import { prepareGenerationAsync, campaignPath, campaignRuntime } from '../../src/v4/runtime.js';
import { migrateSettings } from '../../src/settings.js';
import { Chat4, GREETING } from './harness.js';

const content = await loadContent();

/** A chat whose campaign the host started as index.js does (runtime and planner for new campaigns). */
function started(opts) {
    const g = new Chat4(content);
    g.chat = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    ensureCampaign(g.chat, content, { seed: 7, runtime: 'v4', ...opts });
    const ask = g.llm;
    g.llm = async (req) => {
        if (!req.purpose.startsWith('plan')) return ask(req);
        g.calls.push({ purpose: req.purpose });
        return g.plans.shift() ?? null;
    };
    g.plans = [];
    return g;
}
/** Character creation (a deterministic control channel on every path: no planner, no interpreter). */
async function create(g, settings) {
    for (const mes of ['Mage', 'Arcane Bolt + Arcane Burst']) {
        g.chat.push({ mes, is_user: true, is_system: false, extra: {} });
        const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings, llm: g.llm });
        if (r.action === 'panels') g.chat.push({ mes: r.panels.join('\n\n'), is_user: false, is_system: true, extra: { avereth_panel: true } });
    }
    assert.equal(g.calls.length, 0, 'creation asks no LLM');
}
async function say(g, text, settings, plan = { commands: [{ seq: 1, type: 'activity', kind: 'wait', what: 'by the road', minutes: 10, until: null, quote: text.replace(/\*/g, '') }] }) {
    g.chat.push({ mes: text, is_user: true, is_system: false, extra: {} });
    g.plans = [JSON.stringify(plan)];
    g.commands = [{ type: 'activity', kind: 'wait', what: 'by the road', minutes: 10, until: null, quote: text.replace(/\*/g, '') }];
    return prepareGenerationAsync(g.chat, content, { type: 'normal', settings, llm: g.llm });
}
const started_ = (g) => rec(g.chat[0]).events.find((e) => e.t === 'campaign.started').d;
const planned = (g) => g.calls.filter((c) => c.purpose.startsWith('plan')).length;
const interpreted = (g) => g.calls.filter((c) => c.purpose.startsWith('interpret')).length;

test('patch 7.2A: a new V4 campaign started with the default setting is pinned to V4-C and plans every free-text message', async () => {
    const g = started({ planner: true });
    await create(g, { planner: true });
    assert.equal(started_(g).path, 'c');
    assert.equal(campaignPath(g.chat, false), 'c', 'the pin wins over any setting');
    await say(g, '*i wait a while by the road*', { planner: true });
    assert.equal(planned(g), 1);
    assert.equal(interpreted(g), 0);
    assert.ok(rec(g.chat.at(-1)).plan, 'the record carries the plan');
});

test('patch 7.2A: a running campaign never changes its path with the setting: a C game stays C with the setting off, an A game stays A with it on', async () => {
    const c = started({ planner: true });
    await create(c, { planner: false });
    await say(c, '*i wait*', { planner: false });
    assert.equal(planned(c), 1, 'C stays C');
    const a = started({ planner: false });
    assert.equal(started_(a).path, 'a');
    await create(a, { planner: true });
    await say(a, '*i wait*', { planner: true });
    assert.equal(planned(a), 0, 'A stays A');
    assert.ok(interpreted(a) >= 1);
});

test('patch 7.2A: a campaign started before 7.2 carries no path and follows the planner setting as it stood (legacyPlanner), not the new default', async () => {
    const old = started({});
    assert.equal(started_(old).path, undefined);
    await create(old, { planner: true, legacyPlanner: false });
    // a player whose saved setting was off before 7.2: index.js keeps it as legacyPlanner false and turns the default on
    await say(old, '*i wait*', { planner: true, legacyPlanner: false });
    assert.equal(planned(old), 0, 'stays on V4-A');
    assert.ok(interpreted(old) >= 1);
    // one who had switched the planner on keeps C
    const oldC = started({});
    await create(oldC, { planner: true, legacyPlanner: true });
    await say(oldC, '*i wait*', { planner: true, legacyPlanner: true });
    assert.equal(planned(oldC), 1);
    // V3 campaigns have no V4 path at all
    const v3 = [{ mes: GREETING, is_user: false, is_system: false, extra: {} }];
    processReply(v3, 0, content, { seed: 3, runtime: 'v3', planner: true });
    assert.equal(campaignRuntime(v3), 'v3');
    assert.equal(campaignPath(v3, true), null);
    assert.equal(rec(v3[0]).events.find((e) => e.t === 'campaign.started').d.path, undefined);
});

test('patch 7.2A: a planner failure on a C campaign aborts with a notice, never falls back to the interpreter; a swipe reuses the stored plan', async () => {
    const g = started({ planner: true });
    await create(g, { planner: true });
    g.chat.push({ mes: '*i wait*', is_user: true, is_system: false, extra: {} });
    g.plans = ['not json at all', 'still not json'];
    const r = await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    assert.equal(r.action, 'not_executed');
    assert.match(r.notice, /planner failed/);
    assert.equal(interpreted(g), 0, 'no hidden fallback');
    // sent again: planned again, then a swipe of the reply reuses the record (no second planner call)
    g.plans = [JSON.stringify({ commands: [{ seq: 1, type: 'activity', kind: 'wait', what: 'by the road', minutes: 10, until: null, quote: 'i wait' }] })];
    await prepareGenerationAsync(g.chat, content, { type: 'normal', settings: { planner: true }, llm: g.llm });
    const n = planned(g);
    const events = JSON.stringify(rec(g.chat.at(-1)).events);
    await prepareGenerationAsync(g.chat, content, { type: 'swipe', settings: { planner: true }, llm: g.llm });
    assert.equal(planned(g), n, 'a swipe asks the planner nothing');
    assert.equal(JSON.stringify(rec(g.chat.at(-1)).events), events);
});

test('patch 7.2A: the settings a player saved before 7.2 keep their planner value for the old campaigns; new campaigns get V4-C; a deliberate choice after 7.2 is kept', () => {
    const DEFAULTS = { runtime: 'v4', planner: true, settingsRev: 2, budget: 1400 };
    // fresh install: the defaults
    assert.deepEqual(migrateSettings(undefined, DEFAULTS), DEFAULTS);
    // saved before 7.2 with the planner off (the old default or a choice): old campaigns stay V4-A, new ones are V4-C
    const off = migrateSettings({ runtime: 'v4', planner: false, budget: 900 }, DEFAULTS);
    assert.deepEqual([off.planner, off.legacyPlanner, off.settingsRev, off.budget], [true, false, 2, 900]);
    // saved before 7.2 with the planner on: everything stays on V4-C
    const on = migrateSettings({ runtime: 'v4', planner: true }, DEFAULTS);
    assert.deepEqual([on.planner, on.legacyPlanner], [true, true]);
    // a player who switches the planner off after 7.2: kept as chosen, never migrated again
    const chosen = migrateSettings({ runtime: 'v4', planner: false, settingsRev: 2, legacyPlanner: false }, DEFAULTS);
    assert.deepEqual([chosen.planner, chosen.legacyPlanner], [false, false]);
    assert.deepEqual(migrateSettings(chosen, DEFAULTS), chosen, 'idempotent');
    // the V3 runtime choice is never touched
    assert.equal(migrateSettings({ runtime: 'v3', planner: false }, DEFAULTS).runtime, 'v3');
});
