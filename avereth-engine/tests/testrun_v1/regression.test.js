// Testrun-v1 regression: the five real player inputs and the real narrator replies from the branch Testrun-v1
// (fixture.json), replayed through the engine. Fact reports are appended as a compliant narrator would write them
// (the Testrun replies predate the report). Every failure observed in Testrun-v1 has an assertion here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { runCommands } from '../../src/commands.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v1/fixture.json');
const M = fx.messages;
const REPORTS = {
    // reply index in fixture.messages -> report a compliant narrator appends
    2: {}, 4: {},
    6: { time: 55, place: 'forest edge above the oak slope', new: [{ ref: 'goatherd boy', kind: 'npc', desc: ['boy', 'goatherd'] }], leave: ['goatherd boy'] },
    8: {
        time: 25, place: 'pine clearing on the forested slope',
        new: [{ ref: 'trapper', kind: 'npc', desc: ['trapper', 'old man'], traits: 'thin, grey stubble, leather apron over a patched wool coat, hand-axe at his belt', band: 'MEDIUM' }],
        aware: [{ who: 'trapper', level: 'suspicious' }], concealed: ['pc'],
        facts: [{ s: 'pine clearing', p: 'hazard', o: 'trapped ground (snares, deadfalls)' }],
    },
    10: { intent: [{ who: 'trapper', intent: 'take_cover' }] },
};

function msg(m) {
    return m.is_user ? { is_user: true, is_system: false, mes: m.mes, extra: {} }
        : { is_user: false, is_system: false, mes: m.mes, swipe_id: 0, swipes: [m.mes], swipe_info: [{ extra: {} }], extra: {} };
}

/** Replays the Testrun chat; returns per-turn engine blocks. */
function replay({ reports = true } = {}) {
    const chat = [msg(M[0])];
    processReply(chat, 0, content, { seed: 20260923 });
    const turns = [];
    for (let i = 1; i < M.length; i += 2) {
        chat.push(msg(M[i]));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const reply = msg(M[i + 1]);
        reply.mes = reports ? `${M[i + 1].mes}\n<avereth>${JSON.stringify(REPORTS[i + 1] || {})}</avereth>` : M[i + 1].mes;
        reply.swipes = [reply.mes];
        chat.push(reply);
        const res = processReply(chat, chat.length - 1, content);
        // character creation is answered by the engine's System panel (gen.panels), without an engine block for a narrator
        turns.push({ input: M[i].mes, context: gen.context, panels: gen.panels, record: chat.at(-2).extra.avereth, reply: res.result, state: foldChat(chat).state });
    }
    return { chat, turns };
}

const { chat, turns } = replay();

test('the campaign starts where the First Message says (Tidecross, Solmere) and every turn keeps the invariants', () => {
    assert.equal(turns[0].state.scene.location, 'loc.tidecross');
    for (const t of turns) assert.deepEqual(validateState(t.state, content), [], t.input);
});

test('turn 1 "Ranger": Initiative is 9, and the reply\'s "Init: 8" is caught as tracker drift', () => {
    assert.match(turns[0].panels.join('\n'), /CLASS SELECTED: RANGER[\s\S]*Initiative 9/);
    assert.ok(turns[0].reply.corrections.some((c) => /Initiative shown as 8, engine value is 9/.test(c)));
    const pc = turns[0].state.entities.pc.sheet;
    assert.deepEqual([pc.stats.AGI, pc.stats.PER, pc.hp, pc.mp, pc.sta], [6, 6, 80, 60, 100]);
});

test('turn 2 creation: no false-positive rule loading (Testrun loaded "Multi-Hit" and "Frozen" WI entries)', () => {
    // the System answers creation itself: no engine block and no narrator call, so no rule text can be loaded at all
    assert.equal(turns[1].context, undefined);
    assert.match(turns[1].panels.join('\n'), /CHARACTER CREATION COMPLETE[\s\S]*Starter Shortbow/);
    assert.equal(turns[1].state.entities.pc.sheet.inventory.standard_arrow, 20);
    assert.equal(turns[1].state.mode, 'story');
});

test('turns 3-4: walking, tracking and readying a bow never start combat (Core #23)', () => {
    assert.equal(turns[2].record.events.find((e) => e.t === 'outcome.recorded').d.outcome.kind, 'narrative');
    assert.equal(turns[3].record.events.find((e) => e.t === 'outcome.recorded').d.outcome.kind, 'narrative');
    assert.equal(turns[3].state.mode, 'story');
    assert.equal(turns[3].state.entities.pc.sheet.inventory.standard_arrow, 20, 'no arrow spent before an attack is declared');
});

test('turn 5 combat: engine-rolled dice, locked human profile, no false ambush, one arrow per shot, persisted snapshot', () => {
    const t = turns[4];
    const outcome = t.record.events.find((e) => e.t === 'outcome.recorded').d.outcome;
    assert.equal(outcome.kind, 'combat');
    assert.match(outcome.started.reason, /suspicious -> no Ambush/, 'the trapper had heard him: no ambush (Testrun applied +25pp)');
    const enc = turns[4].state.encounter;
    const tr = enc.combatants['npc.trapper'];
    assert.equal(tr.fixed.level, 2);
    assert.equal(tr.fixed.max_hp, 90, 'hunter template L2: 50 + 10 + VIT 6×5 (Testrun improvised "HP 70")');
    assert.equal(tr.fixed.defeat_xp, 20, 'DefeatXP locked at start (Testrun never computed it)');
    assert.equal(enc.combatants.pc.fixed.init, 9);
    const shot = outcome.records.find((r) => r.actor === 'pc');
    assert.equal(shot.skill, 'ranger.power_shot');
    assert.equal(shot.ammo.used, 1);
    // Combat V3: the shot lands (no Hit roll); the only roll is the engine's damage variance (Testrun: "say 44")
    assert.equal(shot.strikes[0].hit, undefined);
    assert.ok(shot.strikes[0].variance >= 0.9 && shot.strikes[0].variance <= 1.1 && shot.strikes[0].final > 0);
    assert.equal(t.state.entities.pc.sheet.inventory.standard_arrow, 19);
    assert.equal(t.state.entities.pc.sheet.sta, 88);
    assert.match(t.context.text, /1 arrow fired/);
    assert.match(t.context.text, /Narrate exactly these resolved steps/);
});

test('the trapper cannot identify the unseen shooter (Testrun: he called him "boy")', () => {
    const c = turns[4].context.text;
    assert.match(c, /the trapper[\s\S]*has never seen him[\s\S]*Alaric is currently UNSEEN/);
});

test('the combat snapshot survives into the next turn (Testrun lost HP, profile and DefeatXP)', () => {
    const state = foldChat(chat).state;
    assert.equal(state.mode, 'combat');
    const panel = runCommands(state, content, '#combat').panels[0];
    assert.match(panel, /the trapper|npc\.trapper/i);
    assert.match(panel, /DefeatXP 20/);
    assert.match(panel, /Turn order: the trapper > Alaric/);
    chat.push(msg({ is_user: true, mes: 'I shoot him again with Power Shot' }));
    const hpBefore = state.encounter.combatants['npc.trapper'].current.hp;
    const next = prepareGeneration(chat, content, { type: 'normal' });
    assert.match(next.context.text, /COMBAT ACTIVE — Round \d+; current actor: Alaric/);
    assert.match(next.context.text, /locked DefeatXP 20/);
    const after = foldChat(chat).state.encounter.combatants['npc.trapper'];
    assert.equal(after.fixed.max_hp, 90, 'the FIXED profile is copied, never regenerated');
    assert.ok(after.current.hp <= hpBefore, 'CURRENT HP carries forward');
});

test('context economy: the engine block is a fraction of the Testrun\'s Avereth-owned prompt share', () => {
    for (const [i, t] of turns.entries()) {
        if (t.panels) continue; // character creation: a System panel, no prompt
        assert.ok(t.context.tokens < 1800, `turn ${i + 1}: ${t.context.tokens} tokens`);
    }
    const combat = turns[4].context.tokens;
    assert.ok(combat < fx.avereth_owned_tokens.combat_turn / 4, `combat turn engine block ${combat} vs WI+CD share ${fx.avereth_owned_tokens.combat_turn}`);
});

test('the raw Testrun replies without any fact report: the engine degrades safely and asks for the report', () => {
    const raw = replay({ reports: false }).turns;
    for (const t of raw) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.match(raw[0].panels.join('\n'), /Initiative 9/);
    assert.equal(raw[1].state.entities.pc.sheet.inventory.standard_arrow, 20, 'creation mechanics need no report');
    for (const t of raw.slice(1)) assert.ok(t.reply.corrections.some((c) => /no valid <avereth> fact report/.test(c)));
    // the trapper was never reported, so the shot has no target: nothing is invented, no arrow is spent
    const outcome = raw[4].record.events.find((e) => e.t === 'outcome.recorded').d.outcome;
    assert.notEqual(outcome.kind, 'combat');
    assert.equal(raw[4].state.entities.pc.sheet.inventory.standard_arrow, 20);
    assert.equal(Object.keys(raw[4].state.entities).filter((id) => id.startsWith('npc.')).length, 0);
});
