import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGuide, guideErrors } from '../../tools/st_live/live/guide.mjs';
import { evaluate, finished } from '../../tools/st_live/live/evaluator.mjs';
import { playerSystemPrompt, llmPlayer } from '../../tools/st_live/live/players.mjs';
import { doneEnd, resolveTurnLimit } from '../../tools/st_live/live/run_live.mjs';
import { loadProductContent } from '../helpers.js';
import { campaign, inject } from '../v4/patch8_lib.js';
import { hash32 } from '../../src/util.js';
import { classDrafts, offerClass, acceptClass } from '../../src/v4/class_growth.js';

const guide = () => loadGuide('current_test');
const game = async () => campaign(await loadProductContent(), { cls: 'Mage', skills: 'Flame Lance + Arcane Ward' });
const level = (g, n) => inject(g, [{ t: 'level.up', d: { id: 'pc', level: n, free_points: 5, favored: [], xp_after: 0 } }]);

test('current_test aims at natural Level 15 with a 100-input checkpoint and bounded resources', () => {
    const g = guide();
    assert.equal(g.openRun.targetLevel, 15);
    assert.equal(g.openRun.checkpointTurns, 100);
    assert.equal(g.openRun.minTurns, undefined);
    assert.deepEqual(g.milestones.map(m => m.id), ['creation_complete', 'open_run_level', 'class_accepted']);
    assert.equal(g.limits.maxTurns, 1000);
    assert.equal(g.limits.maxMinutes, 1440);
    assert.ok(g.brief.length < 2500, 'replace the repeated shopping instructions with a compact guide');
});

test('100 inputs, narrated Level 15 and a premature player done do not complete the new guide', async () => {
    const g = await game();
    while (g.chat.filter(m => m.is_user).length < 100) {
        g.chat.push({ is_user: true, mes: 'I continue exploring.' }, { is_user: false, mes: 'You are now Level 15.' });
    }
    const ev = evaluate(g.chat, { guide: guide() });
    assert.equal(ev.reached.open_run_level, undefined);
    assert.equal(finished(ev), false);
    assert.equal(doneEnd(ev).kind, 'incomplete');
    assert.equal(ev.progression.currentLevel, 1);
    assert.equal(ev.progression.checkpoint.turn, 100);
});

test('recorded Level 15 completes only the second milestone; an actual chosen E class completes the run', async () => {
    const g = await game();
    level(g, 14);
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false);
    level(g, 15);
    const ev = evaluate(g.chat, { guide: guide() });
    assert.equal(finished(ev), false);
    assert.equal(ev.progression.currentLevel, 15);
    assert.equal(ev.progression.checkpoint, null);
    assert.equal(ev.reached.open_run_level.level, 15);
    assert.equal(doneEnd(ev).kind, 'incomplete');
    const content = await loadProductContent();
    const drafts = classDrafts(g.state(), content);
    assert.ok(drafts.length);
    inject(g, offerClass(g.state(), content, drafts).events);
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false, 'an offer is not a chosen class');
    const skills = structuredClone(g.state().entities.pc.sheet.skills);
    const choice = acceptClass(g.state(), content, drafts[0].def.id);
    assert.ok(choice.events?.some(e => e.t === 'class.evolved'));
    inject(g, choice.events);
    assert.equal(finished(evaluate(JSON.parse(JSON.stringify(g.chat)), { guide: guide() })), true);
    assert.equal(doneEnd(evaluate(g.chat, { guide: guide() })).kind, 'done');
    assert.deepEqual(g.state().entities.pc.sheet.skills, skills, 'class choice preserves skills, PP and Proficiency');
});

test('Level 15 in a stale reply swipe cannot complete the campaign; reload preserves valid progress', async () => {
    const g = await game();
    const text = 'A recorded level-up.';
    g.chat.push({ is_user: false, mes: text, extra: { avereth: { text_hash: hash32(text), events: [{ t: 'level.up', d: { id: 'pc', level: 15, free_points: 5, favored: [], xp_after: 0 } }] } } });
    assert.ok(evaluate(JSON.parse(JSON.stringify(g.chat)), { guide: guide() }).reached.open_run_level);
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false, 'Level 15 alone no longer finishes');
    g.chat.at(-1).mes = 'A different swipe without that level-up.';
    const ev = evaluate(g.chat, { guide: guide() });
    assert.equal(finished(ev), false);
    assert.equal(ev.progression.currentLevel, 1);
});

test('only the current reply can finish class evolution; narration alone and a stale swipe cannot', async () => {
    const g = await game(), content = await loadProductContent();
    level(g, 15);
    g.chat.push({ is_user: false, mes: 'Your class has evolved into an E class.' });
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false);
    const drafts = classDrafts(g.state(), content);
    inject(g, offerClass(g.state(), content, drafts).events);
    const choice = acceptClass(g.state(), content, drafts[0].def.id);
    const text = 'The engine confirmed his chosen class.';
    g.chat.push({ is_user: false, mes: text, extra: { avereth: { text_hash: hash32(text), events: choice.events } } });
    assert.equal(finished(evaluate(JSON.parse(JSON.stringify(g.chat)), { guide: guide() })), true);
    g.chat.at(-1).mes = 'Another swipe: he is still considering the offered classes.';
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false);
});

test('the checkpoint is the state at its own turn, not a later level-up', async () => {
    const g = await game();
    const checkpointTurns = g.chat.filter(m => m.is_user).length;
    level(g, 4);
    g.chat.push({ is_user: true, mes: 'I continue adventuring.' }, { is_user: false, mes: 'Time passes.', extra: { avereth: { events: [] } } });
    level(g, 15);
    const ev = evaluate(g.chat, { guide: { ...guide(), openRun: { targetLevel: 15, checkpointTurns } } });
    assert.equal(ev.progression.checkpoint.level, 4);
    assert.equal(ev.progression.currentLevel, 15);
    assert.equal(ev.progression.checkpoint.coin_cp, g.state().entities.pc.sheet.coin_cp);
});

test('a dead character cannot turn the Level-15 goal into a successful run', async () => {
    const g = await game();
    level(g, 15);
    inject(g, [{ t: 'entity.status', d: { id: 'pc', status: 'dead' } }]);
    assert.equal(finished(evaluate(g.chat, { guide: guide() })), false);
});

test('old duration guides remain valid; level guides reject ambiguous or invalid goal definitions', () => {
    const base = guide();
    const old = { ...base, openRun: { minTurns: 100 }, milestones: [{ id: 'creation_complete', goal: 'Create a character' }, { id: 'open_run_duration', goal: 'Observe 100 inputs' }] };
    assert.deepEqual(guideErrors(old), []);
    assert.match(guideErrors({ ...base, openRun: { targetLevel: 0 } }).join(' '), /positive integer/);
    assert.match(guideErrors({ ...base, openRun: { targetLevel: 15, minTurns: 100 } }).join(' '), /one.*goal/i);
    assert.match(guideErrors({ ...base, openRun: { targetLevel: 15, checkpointTurns: -1 } }).join(' '), /checkpoint/);
    assert.match(guideErrors({ ...base, fixture: '9d-rare' }).join(' '), /fixture/);
});

test('local legacy turn defaults do not truncate Level-15 runs; explicit CLI caps remain possible', () => {
    assert.equal(resolveTurnLimit(guide(), { maxTurns: 40, maxTurnsExplicit: false }), 1000);
    assert.equal(resolveTurnLimit(guide(), { maxTurns: 120, maxTurnsExplicit: true }), 120);
    assert.equal(resolveTurnLimit(guide(), { maxTurns: 20, maxTurnsExplicit: true }), 20);
    assert.throws(() => resolveTurnLimit(guide(), { maxTurns: 0, maxTurnsExplicit: true }), /positive integer/);
});

test('player requests include authority and recovery guidance while keeping the chosen action unchanged', async () => {
    const sent = [];
    const message = 'I ask the apothecary for a concrete mana draught offer.';
    const view = { messages: [{ user: false, text: 'ACTION NOT POSSIBLE — no open offer. The seller says you already drank it.' }], hud: 'Location: apothecary. Coin: 98 cp', toasts: [] };
    const p = llmPlayer({ guide: guide(), username: 'Alaric', url: 'https://example.test/v1', model: 'mock', fetchImpl: async (_url, init) => {
        sent.push(JSON.parse(init.body));
        return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ message, stop: false }) }, finish_reason: 'stop' }] }) };
    } });
    assert.equal((await p.decide(view, { turn: 20, maxTurns: 1000 })).message, message);
    const system = playerSystemPrompt(guide(), { username: 'Alaric' });
    assert.match(system, /newest System/i);
    assert.match(system, /no open offer/i);
    assert.match(system, /sleep.*morning/i);
    assert.match(system, /Guild hall/i);
    assert.match(system, /registration does not automatically accept a contract/);
    assert.match(system, /Allowed, pending, conditional or announced actions are not completed actions/);
    assert.doesNotMatch(system, /front desk.*different locations/i);
    assert.match(sent[0].messages.at(-1).content, /NEXT DECISION.*JSON/);
    assert.ok(sent[0].messages.at(-1).content.includes(view.messages[0].text));
    assert.doesNotMatch(JSON.stringify(sent), /"events"|"skill_defs"/);
});
