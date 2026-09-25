// Testrun-3 regression: the real SillyTavern session (GLM-5.3-Flash, 14 turns: gate, Guild hall, sponsor, rat cellar)
// replayed through the engine with the player's inputs, the seed and the narrator's raw replies including their
// <avereth> reports (fixture.json, from the chat JSONL and the Chat Completion logger; turns 8/9 fell into a gap of
// the logger and come from the chat record). Every failure observed in that session has an assertion here;
// docs/TESTRUN_V3.md explains them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { truth, knows, PC_NAME_FACT } from '../../src/knowledge.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v3/fixture.json');

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
        if (gen.action === 'panels' && gen.panels[0].startsWith('[SYSTEM // COMBAT')) {
            // since the live run of 25.09.: the engine answers it alone (a target to name in a fight), the narrator is
            // not called and the line is hidden like a command; the reply recorded for it in Testrun 3 never happens
            chat.at(-1).is_system = true;
            turns.push({ input: t.input, panels: gen.panels, engineOnly: true, state: foldChat(chat).state });
            continue;
        }
        const outcome = chat.at(-1).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome;
        chat.push(aiMsg(t.reply));
        const reply = processReply(chat, chat.length - 1, content).result;
        turns.push({ input: t.input, context: gen.context, outcome, reply, panel: chat.at(-1).extra.avereth.panel || '', state: foldChat(chat).state });
    }
    return { chat, turns };
}

const { chat, turns } = replay();
const T = (n) => turns[n - 1];
const present = (n) => T(n).state.scene.present;

test('the whole session replays with the invariants intact and every report stripped from the chat', () => {
    for (const t of turns) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.deepEqual(foldChat(chat).errors, []);
    assert.ok(chat.every((m) => !m.mes.includes('<avereth>')));
});

test('names the narrator only put in the ref become names ("hesta" -> Hesta, "carter_muller" -> Muller); descriptors stay descriptors', () => {
    const e = T(5).state.entities;
    assert.equal(e['npc.carter_muller'].name, 'Muller');
    assert.equal(e['npc.gate_sergeant'].name, null);
    assert.deepEqual([e['npc.odile_ferran'].name, e['npc.drem'].name], ['Odile Ferran', 'Drem']);
    assert.equal(e['npc.hesta'].template, 'adventurer', '"adventuress" is an adventurer');
});

test('turn 8: "Hesta Gault" finds Hesta and becomes her full name; her side of the payment and the rat quest without a level are rejected with the fix', () => {
    const r = T(8).reply;
    assert.equal(T(8).state.entities['npc.hesta'].name, 'Hesta Gault');
    assert.ok(r.accepted.some((a) => a.startsWith('npc.hesta learns')), 'the learn entry is no longer an "unknown character"');
    assert.ok(r.accepted.includes('fact npc.hesta sponsors pc'));
    assert.deepEqual(r.rejected.map((x) => x.reason), [
        'coin: only Alaric\'s purse is tracked; report his side of it ({"who":"pc","cp":-10} if the coin went between him and Hesta)',
        // the rat quest came without a recommended Level: it could never have paid Quest XP (external review after Testrun 3)
        'new quest "Rats in the cellars of Rennick\'s yard" needs level (its hidden XP basis: the Level the task suits, a whole number from 1) and type (minor|standard|dangerous|major), which fix its Quest XP; missing: level. Report the quest again with both',
    ]);
    assert.ok(!T(8).state.quests['quest.rats_in_the_cellars_of_rennicks_yard']);
    assert.deepEqual(T(8).state.quests['quest.marsh_hag_near_southwash'].rec_level, 1, 'the complete entry is recorded');
});

test('moving on: the carter stays at the gate, the registrar and Drem stay in the Guild hall; Hesta and Rennick, placed at the cellar stairs, are there', () => {
    assert.ok(!present(5).includes('npc.carter_muller'));
    // Rennick holds the lantern at the stairhead; the report placed him ("position"/"aware") without introducing him,
    // and since Testrun 4 a person the reply names with a capitalised name becomes known instead of being refused
    assert.deepEqual(present(10).filter((id) => id.startsWith('npc.')), ['npc.hesta', 'npc.rennick']);
    assert.equal(T(10).state.entities['npc.rennick'].name, 'Rennick');
    // and so only the two at the stairs saw the rats die (Testrun 3: the carter, the registrar and Drem "witnessed" it from the city)
    const death = truth(T(13).state, 'mon.big_rat', 'status')[0];
    for (const id of ['npc.carter_muller', 'npc.odile_ferran', 'npc.drem']) assert.ok(!knows(T(13).state, id, death.id), id);
    assert.ok(knows(T(13).state, 'npc.hesta', death.id));
    assert.deepEqual(T(13).state.memories.find((m) => m.kind === 'combat').witnesses.sort(), ['npc.hesta', 'npc.rennick', 'pc']);
});

test('turn 4: the gate sergeant reported as leaving is no "unknown or absent NPC" error for the same report\'s position and awareness', () => {
    assert.deepEqual(T(4).reply.rejected.map((x) => x.reason), ["PLAYER OWNERSHIP: moving Alaric to another spot needs the player's own decision in the current message"]);
});

test('turn 6: "Im Alaric", said to the three of them, tells all three his name', () => {
    for (const id of ['npc.odile_ferran', 'npc.hesta', 'npc.drem']) assert.ok(knows(T(6).state, id, PC_NAME_FACT), id);
});

test('a reply without a report: the next engine block asks for it right after the story text, and may still record that turn\'s decisions', () => {
    for (const n of [6, 7, 9, 13, 14]) assert.equal(T(n).reply.report_error, 'no <avereth> report', `turn ${n}`);
    assert.match(T(10).context.text, /no valid <avereth> fact report[^\n]*Write it right after the story text;/);
    assert.deepEqual(T(10).state.last.carry, [T(9).input], 'turn 9 (taking the rat quest) may still be reported with turn 10');
    assert.deepEqual(T(12).state.last.carry, [], 'turn 10 had a report (turn 11 was the engine\'s own question)');
});

test('turn 10: the rats commit and the fight is fixed at once: Initiative, Turn order, HP and distance before anyone acts', () => {
    const enc = T(10).state.encounter;
    assert.deepEqual([enc.round, enc.log.length, enc.order], [0, 0, ['mon.cellar_rat_pack', 'mon.big_rat', 'pc']]);
    // both are named creatures: their names are their target labels
    assert.deepEqual(T(10).panel.split('\n'), [
        '`COMBAT START — Cellar Rat Pack, Big Rat attack Alaric`',
        '`Initiative: Cellar Rat Pack 10 · Big Rat 10 · Alaric 9 → Turn order: Cellar Rat Pack › Big Rat › Alaric`',
        '`COMBAT TARGETS — Cellar Rat Pack [ENGAGED] · Big Rat [ENGAGED]`',
        '`HP: Cellar Rat Pack 16/16 · Big Rat 16/16 · Alaric 80/80`',
        '`Range: Cellar Rat Pack ENGAGED · Big Rat ENGAGED`',
        '`Alaric: MP 60/60 · STA 100/100 · Arrows 20`',
        '`Next: Round 1 — Cellar Rat Pack › Big Rat act before Alaric`',
        '`Alaric\'s attacks vs Cellar Rat Pack: Basic Attack 16–19 · Aimed Shot 24–29 · Power Shot 30–37 damage`',
    ]);
    assert.ok(chat[20].extra.display_text.startsWith(T(10).panel), 'shown above the reply that reported the attack');
});

test('turn 11: "the nearest one" between two ENGAGED rats is still Alaric\'s choice: the engine asks, nothing resolves, no narration', () => {
    // live run 25.09. 01:31: in a fight the target question is the System's, not a story turn
    assert.ok(T(11).engineOnly);
    assert.deepEqual(T(11).panels, [[
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        'Alaric\'s Basic Attack: which target — Cellar Rat Pack or Big Rat? Nothing was spent or rolled.',
        'COMBAT TARGETS — Cellar Rat Pack [ENGAGED] · Big Rat [ENGAGED]',
        'Name one, for example: *Basic Attack on Cellar Rat Pack*',
    ].join('\n')]);
    assert.deepEqual(T(11).state.encounter, T(10).state.encounter, 'the fight waits: the rats\' first Round comes with the next declaration');
    assert.equal(T(11).state.rng.n, T(10).state.rng.n, 'nothing rolled');
});

test('turns 12-13: the named target is resolved; a combatant reported again is no error; the fight ends with its XP', () => {
    // Round 1 runs with turn 12 now: the faster rats first (Core #24), then Alaric's Power Shot at the Big rat
    assert.deepEqual(T(12).outcome.records.map((r) => r.actor).slice(0, 2), ['mon.cellar_rat_pack', 'mon.big_rat']);
    assert.match(T(12).context.text, /Combat starts \(/, 'the narrator hears of the start with the first Round');
    assert.equal(T(12).outcome.records.find((r) => r.actor === 'pc').target, 'mon.big_rat');
    assert.deepEqual(T(12).reply.rejected, []);
    assert.match(T(13).panel, /`COMBAT END — Big Rat defeated, Cellar Rat Pack defeated · \+20 XP → XP 20\/100`/);
});

test('during the fight the narrator is told who is not fighting, and that nobody talks (combat silence since Testrun 4)', () => {
    assert.match(T(12).context.text, /Combat silence: nobody talks while the fight runs — neither combatants nor Hesta Gault, Rennick \(not fighting\)/);
    // Hesta and Rennick kept talking through the rounds: the next engine block names it
    assert.match(T(13).context.text, /Combat silence broken: \d+ spoken lines in your last reply/);
});

test('coin and quests the reports changed are shown like a game log', () => {
    assert.equal(T(4).panel, '`COIN -2 Copper → 4 Silver 8 Copper · city entry toll`');
    assert.equal(T(8).panel, '`QUEST OFFERED — Marsh-hag near Southwash (reeve of Southwash)`');
});

test('the engine block stays compact', () => {
    // turn 13 (the fight ends): loot rules, the combat-silence correction and Rennick's card, about 2,700 tokens
    for (const t of turns.filter((x) => x.context)) assert.ok(t.context.tokens < 2800, `${t.input}: ${t.context.tokens} tokens`); // creation: System panels, no prompt
});
