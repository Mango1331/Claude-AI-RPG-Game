// Testrun-2 regression: the real SillyTavern session (GLM-5.3-Flash, 11 turns, aborted in combat) replayed through
// the engine with the player's inputs, the seed and the narrator's raw replies including their <avereth> reports
// (fixture.json, from the chat JSONL and the Chat Completion logger). Every failure observed in that session has an
// assertion here; docs/TESTRUN_V2.md explains them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson, Game } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v2/fixture.json');

function aiMsg(mes) {
    return { is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} };
}

/** Replays the session like the extension does; returns what each turn produced. */
function replay() {
    const chat = [aiMsg(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    const turns = [];
    for (const t of fx.turns) {
        chat.push({ is_user: true, is_system: false, mes: t.input, extra: {} });
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const outcome = chat.at(-1).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome;
        chat.push(aiMsg(t.reply));
        const reply = processReply(chat, chat.length - 1, content).result;
        turns.push({ input: t.input, context: gen.context, outcome, reply, state: foldChat(chat).state });
    }
    return { chat, turns };
}

const { chat, turns } = replay();

test('the whole session replays with the invariants intact and every report stripped from the chat', () => {
    for (const t of turns) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.deepEqual(foldChat(chat).errors, []);
    assert.ok(chat.every((m) => !m.mes.includes('<avereth>')));
});

test('turn 2: the creation reply cannot grant the starter kit a second time (the narrator reported it as items)', () => {
    const t = turns[1];
    assert.match(t.reply.rejected.map((r) => r.reason).join(' '), /Character Creation is System-only/);
    const final = turns.at(-1).state.entities.pc.sheet;
    assert.deepEqual(Object.keys(final.inventory).sort(), ['small_pouch', 'standard_arrow'], 'no second bow, armor or quiver');
    assert.ok(!('standard_arrows' in final.inventory), 'no phantom stack of arrows');
    assert.doesNotMatch(turns[2].context.text, /standard_arrows|Carried: [^\n]*Starter Shortbow/);
});

test('turn 4: "enter" for someone the same report introduces is no error (no misleading correction)', () => {
    assert.ok(turns[3].state.scene.present.includes('npc.bram_fenn'));
    assert.deepEqual(turns[3].reply.rejected, []);
    // the only correction left is the Runtime V3 notice about the retired tracker blocks this old session still wrote
    const corrections = (turns[4].context.text.split('CORRECTIONS')[1] || '').split('\n\n')[0];
    assert.doesNotMatch(corrections, /enter|unknown person|Rejected/);
    assert.match(corrections, /tracker blocks \(world state, character sheet, NPC dossier or update\): they are retired/);
    assert.doesNotMatch(turns[4].context.text, /<World_State>|<Character_Sheet>|<New_NPC>|<NPC_Update>/, 'no tag syntax in the prompt');
});

test('turns 6-7: the trapper left behind at LONG is no longer present, so the stealth approach meets nobody', () => {
    assert.ok(!turns[5].state.scene.present.includes('npc.bram_fenn'), 'Alaric moved on to the stream; Bram stayed on his line');
    assert.equal(turns[6].outcome.kind, 'check');
    assert.equal(turns[6].outcome.check.automatic, true, 'nobody around: stealth succeeds without a roll');
    assert.doesNotMatch(turns[6].context.text, /Detection of Bram Fenn/);
});

test('turns 9-11: an NPC who is shot at fights back; the narrator echoing "hold" never freezes him', () => {
    const bramActs = turns.slice(8).flatMap((t) => t.outcome.records || []).filter((r) => r.actor === 'npc.bram_fenn');
    assert.ok(bramActs.length >= 3);
    assert.ok(!bramActs.some((r) => r.kind === 'hold'), bramActs.map((r) => `${r.kind} ${r.why || ''}`).join(' | '));
    assert.equal(bramActs[0].kind, 'attack', 'round 1: shot at with an axe in hand, he answers');
    assert.ok(turns.at(-1).state.entities.pc.sheet.hp < 80, 'the fight has two sides');
    // the engine's own records show the reaction, so the narrator no longer has to invent one
    assert.doesNotMatch(turns[9].context.text, /holds \(narrated intent/);
});

test('turn 9 prompt: the combat engine block stays compact', () => {
    for (const t of turns) assert.ok(t.context.tokens < 2300, `${t.input}: ${t.context.tokens} tokens`);
});

test('report robustness seen in Testrun 2: plural item names, empty combat entries', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    g.reply({ new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['fletcher'] }] });
    g.input('I buy three arrows from her.');
    const r = g.reply({ items: [{ item: 'Standard Arrows', qty: 3, from: 'Mara', to: 'pc', why: 'bought' }], combat: [{}, { by: [] }] });
    assert.deepEqual(r.rejected, []);
    assert.equal(g.state.entities.pc.sheet.inventory.standard_arrow, 23);
    assert.ok(!('standard_arrows' in g.state.entities.pc.sheet.inventory));
});

test('moving on: only the company the report places at the new spot comes along (Testrun 3 replaced "SHORT follows")', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    g.reply({ new: [{ ref: 'Mara', name: 'Mara', kind: 'npc', desc: ['guide'], band: 'SHORT' }, { ref: 'Brom', name: 'Brom', kind: 'npc', desc: ['woodcutter'], band: 'LONG' }] });
    g.input('I walk down to the river with Mara.');
    g.reply({ place: 'river bank', position: [{ who: 'Mara', band: 'SHORT' }] });
    assert.ok(g.state.scene.present.includes('npc.mara'), 'placed at the river bank: she came along');
    assert.ok(!g.state.scene.present.includes('npc.brom'));
    g.input('I walk to the ford.');
    g.reply({ place: 'the ford' });
    assert.ok(!g.state.scene.present.includes('npc.mara'), 'not placed at the ford: she stayed at the river bank');
    // a more precise name for the same spot is no move; someone known who is placed here again is back in the scene
    g.input('I step down to the water.');
    g.reply({ place: 'the ford, shallow crossing', aware: [{ who: 'Mara', level: 'aware' }] });
    assert.ok(g.state.scene.present.includes('npc.mara'));
    assert.deepEqual(g.state.last.rejected, []);
});

test('the player sees the combat in the reply: Initiative, Turn order, rolls and HP arithmetic straight from the records', () => {
    const replies = chat.filter((m) => !m.is_user && m.extra?.avereth?.panel);
    assert.ok(replies.length >= 4, 'the stealth check and the three combat turns show a System block');
    const turn9 = chat[18].extra.display_text;
    // Initiative = floor(1.5 × AGI): Bram Fenn (AGI 6) ties Alaric at 9; the tie was resolved once without bias
    assert.match(turn9, /^`COMBAT START`\n`Initiative: Alaric 9 · Bram Fenn 9 → Turn order: Alaric › Bram Fenn`/);
    for (const [i, t] of turns.entries()) {
        const panel = chat[2 * i + 2].extra.avereth.panel || ''; // the reply to turn i: greeting, then user/reply pairs
        for (const r of t.outcome.records || []) for (const s of r.strikes || []) {
            assert.ok(!s.hit && panel.includes(`${s.final} damage`), `turn ${i + 1}: every legal attack lands with its damage shown`);
            assert.ok(panel.includes(`HP ${s.hp_before} - ${s.final - (s.absorbed || 0)}`), `turn ${i + 1}: HP ${s.hp_before} -> ${s.hp_after}`);
        }
        for (const x of t.outcome.board?.hp || []) assert.ok(panel.includes(`${x.hp}/${x.max}`), `turn ${i + 1}: HP overview ${x.id}`);
    }
    assert.ok(chat.every((m) => !m.mes.includes('COMBAT START') && !m.mes.includes('`HP:')), 'the prompt text never carries the block');
});
