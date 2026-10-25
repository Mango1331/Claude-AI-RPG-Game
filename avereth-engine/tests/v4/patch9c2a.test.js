// Product-path acquisition, retry and async races. Scripted LLM responses exercise the same runtime as the host.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadContent, loadProductContent, ROOT } from '../helpers.js';
import { campaign, say, inject, lastUser, outcomeOf, simpleBoard } from './patch8_lib.js';
import { prepareGenerationAsync, processReplyAny, perfSummary } from '../../src/v4/runtime.js';
import { rec, foldChat, setRec } from '../../src/host.js';
import { humanSheet, scaleCreature } from '../../src/npcgen.js';
import { npcTemplate } from '../../src/content.js';
import { composeSkill } from '../../src/skill_composer.js';
import { defineSkill, learnSkill } from '../../src/skills.js';
import { definePassive } from '../../src/passives.js';
import { finalizeGrowth, growthDrafts, learningActivity, fightGrowth } from '../../src/v4/growth.js';
import { runCommands } from '../../src/commands.js';
import { skillSummary } from '../../src/context.js';
import { validateState } from '../../src/validate.js';

const content = await loadProductContent();
const legacy = await loadContent();
const ACT = (kind, more = {}) => ({ type: 'activity', kind, what: null, minutes: null, until: null, learn: null, teacher: null, tags: null, aspects: null, ...more });
const reply = (g) => g.reply('Time passes.', { expected: {}, deltas: [] });
const rest = (g) => say(g, '*i rest for one minute*', ACT('rest', { minutes: 1 }));
const json = (skills) => JSON.stringify({ skills });
const entries = (q) => JSON.parse(q.messages[1].content).drafts;
const named = (q, name = 'Cinder Thread', flavor = 'A copper red thread trails through the air.') => json(entries(q).map((d) => ({ key: d.key, name, flavor })));

function forge(g, answer = (q) => named(q)) {
    const base = g.llm;
    const calls = [];
    g.llm = async (q) => {
        if (q.purpose.startsWith('forge')) { calls.push(q); return answer(q, calls.length); }
        return base(q);
    };
    return calls;
}

function ready(g, { id = 'learn.1', n = 1, fn = 'bolt', tags = ['Arcane'], aspects = ['Fire'], lp = 100 } = {}) {
    inject(g, [
        { t: 'growth.opened', d: { goal: { id, n, status: 'active', target: { fn, tags, aspects }, source: { kind: 'teacher', who: 'npc.mira', name: 'Mira', basis: 'fact', key: 'fact:teaches', turn: 1, minute: 540 }, lp: 0, need: 100, opened: { turn: 1, minute: 540 }, days: {}, fights: [] } } },
        { t: 'growth.progress', d: { goal: id, lp, total: lp, need: 100 } },
    ]);
}

function teacher(g) {
    const s = g.state();
    inject(g, [
        { t: 'entity.created', d: { entity: { id: 'npc.mira', kind: 'npc', name: 'Mira', descriptors: ['hedge mage'], status: 'alive', location: s.scene.location, at: s.scene.at, template: 'hedge_mage', sheet: humanSheet(npcTemplate(content, 2, 'hedge_mage'), { class: 'mage' }, content) } } },
        { t: 'scene.entered', d: { id: 'npc.mira', band: 'SHORT', cover: 'none' } },
        { t: 'fact.asserted', d: { fact: { id: 'f.teaches', s: 'npc.mira', p: 'teaches', o: 'Alaric', since: { turn: s.turn, minute: s.clock.minute }, until: null, visibility: 'public', importance: 0.5, hard: false, source: { kind: 'narration' } } } },
    ]);
}

test('9C-2a: two real lessons yield a forged Skill, separate appearance text, a usable attack and identical replay/regeneration', async () => {
    const g = await campaign(content, { skills: 'Arcane Bolt + Arcane Ward' });
    teacher(g);
    const calls = forge(g, (q) => ({ content: named(q), finish_reason: 'stop', usage: { prompt_tokens: 123, completion_tokens: 42 } }));
    await say(g, '*i train the fire bolt with Mira for two hours*', ACT('train', { learn: 'bolt', teacher: 'npc.mira', minutes: 120, aspects: ['Fire'] }));
    assert.equal(calls.length, 0, 'no Forge before the goal is ready');
    await reply(g);
    await say(g, '*i sleep until morning*', ACT('sleep', { until: 'morning' }));
    await reply(g);
    const r = await say(g, '*i train with Mira for two hours*', ACT('train', { learn: 'learn.1', teacher: 'npc.mira', minutes: 120 }));
    assert.equal(calls.length, 1);
    const def = g.state().skill_defs['dyn.ember_bolt'];
    assert.equal(def.name, 'Cinder Thread');
    assert.equal(def.attack.base, 10);
    assert.equal(def.cost.amount, 7);
    assert.equal(def.attack.scaling[0].stat, 'INT');
    assert.equal(lastUser(g).forge.llm[0].prompt, 123);
    assert.match(perfSummary(g.chat), /forge/);
    const panel = runCommands(g.state(), content, '#skill Cinder Thread').panels.join('\n');
    for (const text of [panel, r.context.text, def.source_text, skillSummary(def)]) {
        assert.match(text, /Description \(appearance only, no mechanical effect\): A copper red thread/);
        for (const line of text.split('\n').filter((x) => x.includes('Effect:'))) assert.ok(!line.includes(def.flavor), line);
    }
    const snapshot = JSON.stringify(lastUser(g));
    await prepareGenerationAsync(g.chat, content, { llm: g.llm, settings: { planner: true } });
    assert.equal(calls.length, 1);
    assert.equal(JSON.stringify(lastUser(g)), snapshot);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
    const u = g.chat.findLastIndex((m) => m.is_user);
    assert.equal(foldChat(g.chat, u).state.skill_defs['dyn.ember_bolt'], undefined, 'removing the acquisition turn rolls it back');
    await reply(g);
    const wolf = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...wolf, hp: 300, max_hp: 300 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf', band: 'MEDIUM', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf', level: 'aware' } },
    ]);
    await say(g, '*i hurl Cinder Thread at the wolf*', { type: 'use_skill', skill: def.id, target: 'mon.wolf' });
    const attack = outcomeOf(g).records.find((x) => x.actor === 'pc');
    assert.equal(attack.skill, def.id);
    assert.equal(attack.cost.amount, 7);
    assert.ok(attack.strikes[0].hp_after < attack.strikes[0].hp_before);
    assert.equal(calls.length, 1);
    assert.deepEqual(validateState(g.state(), content), []);
});

test('9C-2a: repair only invalid siblings; a failed repair retains valid names and falls back without changing effects', async () => {
    const g = await campaign(content);
    ready(g);
    ready(g, { id: 'learn.2', n: 2, aspects: ['Ice'] });
    const calls = forge(g, (q, n) => n === 1 ? json([
        { key: 'learn.1', name: 'Copper Thread', flavor: 'Copper light follows the cast.' },
        { key: 'learn.2', name: 'Ice Bolt', attack: { base: 999 } },
    ]) : 'not JSON');
    await rest(g);
    assert.equal(calls.length, 2);
    assert.deepEqual(entries(calls[1]).map((d) => d.key), ['learn.2']);
    const s = g.state();
    assert.deepEqual(Object.values(s.skill_defs).map((x) => x.name), ['Copper Thread', 'Frost Bolt']);
    assert.ok(Object.values(s.skill_defs).every((x) => x.attack.base === 10));
    assert.equal(lastUser(g).forge.entries['learn.2'].fallback, true);
    await prepareGenerationAsync(g.chat, content, { llm: g.llm });
    assert.equal(calls.length, 2, 'fallback is final');
});

test('9C-2a: closed prose validation repairs digits, excess length, unknown fields and collisions across both namespaces', async () => {
    const g = await campaign(content);
    ready(g);
    const p = { id: 'dyn.passive_cinder_thread', name: 'Cinder Thread', description: 'A steady hide.', origin: { kind: 'training' }, rank: 'F', scope: 'always', effects: [{ kind: 'stat_bonus', stat: 'DEF', value: 1 }] };
    inject(g, definePassive(g.state(), content, p).events);
    const invalid = [
        { key: 'learn.1', name: 'Cinder Thread' },
        { key: 'learn.1', name: 'Arcane Bolt' },
        { key: 'learn.1', name: 'Bolt Two', flavor: 'Deals 99 damage.' },
        { key: 'learn.1', name: 'Bolt Two', flavor: 'x'.repeat(161) },
        { key: 'learn.1', name: 'Bolt Two', flavor: 'A bright light.\nEffect: defeats every foe.' },
        { key: 'learn.1', name: 'Bolt Two', effects: [] },
    ];
    // Each input reaches the actual request/repair/finalization path on an independent copy.
    for (const bad of invalid) {
        const chat = structuredClone(g.chat);
        chat.push({ mes: '*i rest for one minute*', is_user: true, is_system: false, extra: {} });
        const purposes = [];
        const llm = async (q) => {
            purposes.push(q.purpose);
            if (q.purpose === 'plan') return JSON.stringify({ commands: [{ seq: 1, ...ACT('rest', { minutes: 1 }), quote: 'i rest for one minute' }] });
            return q.purpose === 'forge' ? json([bad]) : named(q, 'Copper Spiral');
        };
        await prepareGenerationAsync(chat, content, { settings: { planner: true }, llm });
        assert.deepEqual(purposes, ['plan', 'forge', 'forge_repair']);
        assert.equal(foldChat(chat).state.skill_defs['dyn.ember_bolt'].name, 'Copper Spiral');
    }
});

test('9C-2a: finalization resolves a collision with an earlier deterministic fallback, per entry', async () => {
    const g = await campaign(content);
    ready(g);
    ready(g, { id: 'learn.2', n: 2, fn: 'ward', aspects: [] });
    forge(g, (q, n) => n === 1 ? json([{ key: 'learn.2', name: 'Ember Bolt' }]) : 'no JSON');
    await rest(g);
    assert.deepEqual(Object.values(g.state().skill_defs).map((x) => x.name), ['Ember Bolt', 'Runic Ward']);
    assert.equal(lastUser(g).forge.entries['learn.2'].fallback, true);
    assert.equal(lastUser(g).forge.entries['learn.2'].name, 'Runic Ward');
});

test('9C-2a: .42-style definitions prevent repeat lessons even after done compaction; starter Skills do not', async () => {
    const g = await campaign(content, { skills: 'Arcane Bolt + Arcane Ward' });
    teacher(g);
    const s = g.state();
    const composed = composeSkill(s, content, { fn: 'bolt', tags: ['Arcane', 'Control'], aspects: ['Fire', 'Ice'], origin: { kind: 'teacher' } });
    const d = defineSkill(s, content, composed.def);
    inject(g, d.events);
    const l = learnSkill(g.state(), content, 'pc', d.skill.id);
    inject(g, l.events);
    const at = g.state().clock.minute;
    const r = await say(g, '*i train the fire and ice bolt with Mira for two hours*', ACT('train', { minutes: 120, learn: 'bolt', teacher: 'npc.mira', tags: ['Control', 'Arcane'], aspects: ['Ice', 'Fire'] }));
    assert.equal(r.action, 'context');
    assert.equal(g.state().clock.minute, at);
    assert.equal(Object.keys(g.state().growth?.goals || {}).length, 0);
    assert.match(outcomeOf(g).actions.join('\n'), /knows this technique already/);
    assert.equal(g.state().skill_defs[d.skill.id].attack.scaling[0].stat, 'INT', 'sorting identity never rewrites old scaling');
    const starter = learningActivity(g.state(), content, { kind: 'train', learn: 'bolt', teacher: 'npc.mira', tags: ['Arcane'], aspects: [] }, 60, at);
    assert.equal(starter.status, 'resolved', 'a static starter does not block a first dynamic acquisition');
});

test('9C-2a: reordered open techniques resume one goal, and duplicate ready goals cannot grant twice', async () => {
    const g = await campaign(content);
    teacher(g);
    await say(g, '*i study the fire and ice bolt with Mira for one hour*', ACT('study', { minutes: 60, learn: 'bolt', teacher: 'npc.mira', tags: ['Arcane', 'Control'], aspects: ['Fire', 'Ice'] }));
    await reply(g);
    await say(g, '*i study that bolt with Mira for one hour*', ACT('study', { minutes: 60, learn: 'bolt', teacher: 'npc.mira', tags: ['Control', 'Arcane'], aspects: ['Ice', 'Fire'] }));
    assert.equal(Object.keys(g.state().growth.goals).length, 1);
    const h = await campaign(content);
    ready(h);
    ready(h, { id: 'learn.2', n: 2 });
    assert.equal(growthDrafts(h.state(), content).length, 1);
    const f = finalizeGrowth(h.state(), content);
    assert.equal(f.learned.length, 1);
    assert.deepEqual(f.failed, []);
    assert.equal(f.events.filter((e) => e.t === 'growth.closed').length, 2);
    assert.equal(h.state().growth.goals['learn.1'].status, 'ready', 'finalization does not mutate its input');
});

test('9C-2a review R2: old duplicate ready goals close against the one learned Skill, freeing both slots without repeated failures', async () => {
    const g = await campaign(content);
    ready(g, { tags: ['Arcane', 'Control'] });
    ready(g, { id: 'learn.2', n: 2, tags: ['Control', 'Arcane'] });
    const calls = forge(g);
    await rest(g);
    let s = g.state();
    const skill = Object.keys(s.skill_defs)[0];
    assert.deepEqual(s.growth.goals, {});
    assert.deepEqual(s.growth.done.map((d) => [d.id, d.skill]), [['learn.1', skill], ['learn.2', skill]]);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'skill.defined').length, 1);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'skill.learned').length, 1);
    assert.equal(outcomeOf(g).learned.length, 1);
    assert.equal(outcomeOf(g).learn_failed, undefined);
    assert.equal(calls.length, 1);
    await reply(g);
    await rest(g);
    assert.equal(outcomeOf(g).learn_failed, undefined);
    assert.equal(calls.length, 1);
    // A duplicate already present when entering a later turn needs no Forge or new acquisition either.
    ready(g, { id: 'learn.3', n: 3, tags: ['Control', 'Arcane'] });
    await reply(g);
    await rest(g);
    s = g.state();
    assert.deepEqual(s.growth.goals, {});
    assert.equal(s.growth.done.at(-1).skill, skill);
    assert.equal(outcomeOf(g).learned, undefined);
    assert.equal(outcomeOf(g).learn_failed, undefined);
    assert.equal(calls.length, 1);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, s);
    assert.deepEqual(validateState(s, content), []);
});

test('9C-2a review R2: active .42 duplicate retires with its learned sibling and frees the learning slot', async () => {
    const g = await campaign(content);
    ready(g, { tags: ['Arcane', 'Control'] });
    ready(g, { id: 'learn.2', n: 2, tags: ['Control', 'Arcane'], lp: 40 });
    const calls = forge(g);
    await rest(g);
    const s = g.state();
    const skill = Object.keys(s.skill_defs)[0];
    assert.deepEqual(s.growth.goals, {});
    assert.deepEqual(s.growth.done.map((d) => [d.id, d.skill]), [['learn.1', skill], ['learn.2', skill]]);
    assert.equal(lastUser(g).events.filter((e) => e.t === 'skill.learned').length, 1);
    assert.equal(outcomeOf(g).learned.length, 1);
    assert.equal(outcomeOf(g).learn_failed, undefined);
    assert.equal(calls.length, 1);
    await reply(g);
    await rest(g);
    assert.equal(outcomeOf(g).learn_failed, undefined);
    assert.equal(calls.length, 1);
    assert.deepEqual(validateState(g.state(), content), []);
    assert.deepEqual(foldChat(JSON.parse(JSON.stringify(g.chat))).state, g.state());
});

test('9C-2a review R2: qualifying combat LP skips a stale active duplicate and credits a valid goal', async () => {
    const g = await campaign(content, { skills: 'Arcane Bolt + Arcane Ward' });
    const c = composeSkill(g.state(), content, { fn: 'bolt', tags: ['Arcane', 'Control'], aspects: ['Fire'], origin: { kind: 'teacher' } });
    assert.deepEqual(c.errors, []);
    const d = defineSkill(g.state(), content, c.def);
    inject(g, d.events);
    inject(g, learnSkill(g.state(), content, 'pc', d.skill.id).events);
    ready(g, { tags: ['Control', 'Arcane'], lp: 40 });
    ready(g, { id: 'learn.2', n: 2, fn: 'ward', tags: ['Arcane'], aspects: ['Ice'], lp: 30 });
    const enc = {
        id: 'enc.qualifying', pp: { threatened: true, used: { 'mage.arcane_bolt': 'attack' } },
        combatants: {
            pc: { side: 'pc', fixed: { level: 1 }, current: { defeated: false, escaped: false } },
            wolf: { side: 'hostile', fixed: { level: 1 }, current: {} },
        },
    };
    const progress = fightGrowth(g.state(), content, enc);
    assert.equal(progress.length, 1);
    assert.equal(progress[0].d.goal, 'learn.2');
    assert.equal(g.state().growth.goals['learn.1'].lp, 40, 'read-only fight progress');
});

test('9C-2a: actual board retry reuses a committed Forge fallback and never renames the acquisition', async () => {
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/v4/live_1021.json'), 'utf8'));
    const g = { chat: structuredClone(fx.messages), state() { return foldChat(this.chat).state; } };
    // The recorded board fixture is legacy; this new campaign's rules and sheet are supplied explicitly.
    const fresh = await campaign(content);
    const start = rec(g.chat[0]).events.find((e) => e.t === 'campaign.started');
    start.d.ruleset = 2;
    const pc = g.state().entities.pc;
    inject(g, [{ t: 'entity.sheet_set', d: { id: 'pc', sheet: fresh.state().entities.pc.sheet } }]);
    assert.ok(pc);
    ready(g);
    g.chat.push({ mes: '*i read the quest board*', is_user: true, is_system: false, extra: {} });
    let boards = 0;
    let forges = 0;
    let plans = 0;
    const llm = async (q) => {
        if (q.purpose === 'plan') { plans++; return JSON.stringify({ commands: [{ seq: 1, type: 'board.read', rank: null, quote: 'i read the quest board' }] }); }
        if (q.purpose === 'board') { boards++; return boards <= 2 ? 'empty' : JSON.stringify({ listings: simpleBoard() }); }
        if (q.purpose.startsWith('forge')) { forges++; return null; }
        return null;
    };
    await prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm });
    assert.ok(lastUser(g).board.failed);
    assert.equal(forges, 2);
    const first = structuredClone(g.state().skill_defs);
    const oldChat = structuredClone(g.chat);
    delete rec(oldChat.at(-1)).forge;
    await prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm });
    assert.equal(plans, 1);
    assert.equal(forges, 2);
    assert.equal(boards, 3);
    assert.deepEqual(g.state().skill_defs, first);
    assert.equal(lastUser(g).forge.reused, 1);
    assert.equal(lastUser(g).forge.entries['learn.1'].fallback, true);
    // An actual .42 record has no Forge cache: its already booked name still wins over a new request.
    await prepareGenerationAsync(oldChat, content, { settings: { planner: true }, llm });
    assert.equal(forges, 2);
    assert.deepEqual(foldChat(oldChat).state.skill_defs, first);
});

test('9C-2a: pending combat blocks the Forge and synchronous grant without losing progress', async () => {
    const g = await campaign(content);
    ready(g);
    const s = g.state();
    s.pending_combat = [{ by: 'npc.someone' }];
    assert.deepEqual(growthDrafts(s, content), []);
    assert.equal(finalizeGrowth(s, content).events.length, 0);
    assert.equal(s.growth.goals['learn.1'].lp, 100);
});

test('9C-2a: a fight-ending V3-routed turn uses the same Forge and synchronous finalizer', async () => {
    const g = await campaign(content, { skills: 'Arcane Bolt + Arcane Ward' });
    ready(g);
    const calls = forge(g);
    const wolf = scaleCreature(content.anchors.get('wolf'), 1, 'normal', content);
    inject(g, [
        { t: 'entity.created', d: { entity: { id: 'mon.wolf', kind: 'creature', name: null, descriptors: ['wolf'], anchor: 'wolf', species: 'wolf', status: 'alive', location: g.state().scene.location, profile: { ...wolf, hp: 40, max_hp: 40 } } } },
        { t: 'scene.entered', d: { id: 'mon.wolf', band: 'SHORT', cover: 'none' } },
        { t: 'scene.awareness', d: { id: 'mon.wolf', level: 'aware' } },
    ]);
    for (let i = 0; i < 12; i++) {
        await say(g, '*i cast arcane bolt at the wolf*', { type: 'use_skill', skill: 'mage.arcane_bolt', target: 'mon.wolf' });
        if (!g.state().encounter) break;
        assert.equal(calls.length, 0);
        await reply(g);
    }
    assert.equal(lastUser(g).route, 'v3');
    assert.equal(calls.length, 1);
    assert.equal(outcomeOf(g).learned[0].name, 'Cinder Thread');
    assert.deepEqual(validateState(g.state(), content), []);
});

// Resolve a real async request only after the supplied mutation; no sleeps or timing assumptions.
async function race(purpose, mutate, { pending = false } = {}) {
    const g = await campaign(content);
    if (purpose === 'forge') ready(g);
    if (pending) {
        g.chat.push({ mes: 'A previous reply.', is_user: false, is_system: false, extra: {} });
        processReplyAny(g.chat, g.chat.length - 1, content, {});
    }
    g.chat.push({ mes: '*i rest for one minute*', is_user: true, is_system: false, extra: {} });
    const msg = g.chat.at(-1);
    let release;
    const arrived = new Promise((resolve) => { release = resolve; });
    let finish;
    let current = true;
    const llm = async (q) => {
        if (q.purpose === purpose) { release(); await new Promise((resolve) => { finish = resolve; }); }
        if (q.purpose === 'plan') return JSON.stringify({ commands: [{ seq: 1, ...ACT('rest', { minutes: 1 }), quote: 'i rest for one minute' }] });
        return named(q);
    };
    const job = prepareGenerationAsync(g.chat, content, { settings: { planner: true }, llm, isCurrent: () => current });
    await arrived;
    mutate(g, () => { current = false; });
    const expected = JSON.stringify(g.chat);
    finish();
    const r = await job;
    assert.deepEqual(r, { action: 'abort', dirty: false, stale: true });
    assert.equal(JSON.stringify(g.chat), expected, 'no result, gap or other record is written');
    assert.equal(rec(msg), undefined);
}

test('9C-2a: text edits, replacement and newer player messages invalidate a pending planner', async () => {
    await race('plan', (g) => { g.chat.at(-1).mes = '*i rest for two minutes*'; });
    await race('plan', (g) => { g.chat[g.chat.length - 1] = structuredClone(g.chat.at(-1)); });
    await race('plan', (g) => { g.chat.push({ mes: '*i go away*', is_user: true, extra: {} }); });
});

test('9C-2a: equal-count event replacement, prior text and extraction changes invalidate a pending Forge', async () => {
    await race('forge', (g) => { rec(g.chat[0]).events.find((e) => e.t === 'campaign.started').d.seed++; });
    await race('forge', (g) => { g.chat[0].mes += ' edited'; });
    await race('forge', (g) => { const m = g.chat.findLast((m) => !m.is_user); setRec(m, { ...rec(m), extraction: { status: 'done' } }); });
});

test('9C-2a: chat/request invalidation writes nothing, including a staged late-extraction gap', async () => {
    await race('forge', (_g, invalidate) => invalidate());
    await race('plan', (_g, invalidate) => invalidate(), { pending: true });
});

test('9C-2a: legacy campaigns never request or grant Forge acquisitions', async () => {
    const g = await campaign(legacy, { cls: 'Mage', skills: 'Flame Lance + Focused Ward' });
    ready(g);
    const calls = forge(g);
    await rest(g);
    assert.equal(calls.length, 0);
    assert.equal(Object.keys(g.state().skill_defs).length, 0);
});
