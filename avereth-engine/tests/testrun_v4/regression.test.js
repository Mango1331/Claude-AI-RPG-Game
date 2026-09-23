// Testrun-4 regression: the real SillyTavern session (GLM-5.3-Flash, contract 3.1, lorebook v0.11 as Character Lore,
// 15 turns: Lumenford gate, Guild registration, quest board, malthouse cellar fight, pay and back to the Guild)
// replayed through the engine with the player's inputs, the seed and the narrator's raw replies including their
// <avereth> reports (fixture.json, from the chat JSONL and the Chat Completion logger). Every failure observed in that
// session has an assertion here; docs/TESTRUN_V4.md explains them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { parseSwaps } from '../../src/util.js';
import { Dice } from '../../src/rng.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v4/fixture.json');
const swaps = parseSwaps('ledger=register'); // the extension's default "Word replacements"

function aiMsg(mes) {
    return { is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} };
}

/** Replays the session like the extension does; `upTo` stops after that many turns, `last` replaces the next reply. */
function replay(upTo = fx.turns.length, last = null) {
    const chat = [aiMsg(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed, swaps });
    const turns = [];
    for (const [i, t] of fx.turns.slice(0, last ? upTo + 1 : upTo).entries()) {
        chat.push({ is_user: true, is_system: false, mes: t.input, extra: {} });
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const outcome = chat.at(-1).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome;
        chat.push(aiMsg(last && i === upTo ? last : t.reply));
        const reply = processReply(chat, chat.length - 1, content, { swaps }).result;
        turns.push({ input: t.input, context: gen.context, outcome, reply, panel: chat.at(-1).extra.avereth.panel || '', state: foldChat(chat).state });
    }
    return { chat, turns };
}

const { chat, turns } = replay();
const T = (n) => turns[n - 1];
const reasons = (n) => T(n).reply.rejected.map((x) => x.reason);

test('the whole session replays with the invariants intact, every report stripped and "ledger" replaced', () => {
    for (const t of turns) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.deepEqual(foldChat(chat).errors, []);
    assert.ok(chat.every((m) => !m.mes.includes('<avereth>')));
    // the preset's ban list named "Ledger" and GLM still wrote it three times (a word named in a prohibition is primed)
    assert.ok(chat.every((m) => !/ledger/i.test(m.mes)));
    assert.match(chat[10].mes, /She pulls a register across the counter/);
});

test('the real fight follows Core #10/#11: Base Hit 70 + PER×0.5, the Skill modifiers, direct-stat Bite, DEF 3', () => {
    const recs = T(10).outcome.records;
    assert.deepEqual(recs.map((r) => [r.actor, r.strikes[0].hit.chance, r.strikes[0].hit.roll, r.strikes[0].hit.success]), [
        ['mon.cellar_vermin', 75, 77, false], ['pc', 63, 68, false], ['mon.cellar_vermin', 75, 63, true],
    ]);
    assert.equal(T(10).state.encounter.combatants.pc.fixed.base_hit, 73);
    assert.equal(recs[1].raw_text, '16 + AGI 6×0.50 + PER 6×1.375 + ATK 6 = 33.25');
    assert.deepEqual([recs[2].strikes[0].power, recs[2].strikes[0].defense, recs[2].strikes[0].final], [6, 3, 3]);
    // the dice: uniform d100, and a 63% shot hits 63% of the time (three misses in a row: 0.37³ ≈ 5%)
    const d = new Dice(fx.seed, 0);
    let hits = 0;
    const counts = new Array(101).fill(0);
    for (let i = 0; i < 50000; i++) { const v = d.d100(); counts[v] += 1; if (v <= 63) hits += 1; }
    assert.ok(Math.abs(hits / 50000 - 0.63) < 0.01, `hit rate ${hits / 50000}`);
    assert.ok(counts.slice(1).every((c) => c > 400 && c < 600), 'every face of the d100 comes up about 500 times');
});

test('Alaric\'s attack options and their Hit Chance are shown before he picks one', () => {
    assert.equal(T(9).panel.split('\n').at(-1), '`Alaric\'s attacks vs cellar vermin: Basic Attack 73% · Aimed Shot 83% · Power Shot 63%`');
    assert.equal(T(10).panel.split('\n').at(-1), '`Alaric\'s attacks vs cellar vermin: Basic Attack 73% · Aimed Shot 83% · Power Shot 63%`');
});

test('"I kite backwards and Power Shot": the shot, then the Turn\'s one-band step back (Core #12/#24)', () => {
    const shot = T(11).outcome.records.find((r) => r.actor === 'pc');
    assert.deepEqual(shot.after_move, { dir: 'away', change: 'cellar vermin ENGAGED -> SHORT' });
    assert.match(T(11).panel, /`Alaric: Power Shot → cellar vermin · STA 88 - 12 = 76 · 1 arrow · then steps back \(cellar vermin ENGAGED → SHORT\)`/);
    // the skittish vermin, no longer cornered, backs off instead of biting (PROPOSED NPC policy, temperament)
    assert.deepEqual(T(11).outcome.records.filter((r) => r.actor === 'mon.cellar_vermin').map((r) => r.kind), ['move']);
});

test('combat silence: nobody talks during the fight, and a reply that did is named in the next engine block', () => {
    for (const n of [10, 11]) {
        assert.match(T(n).context.text, /Combat silence: nobody talks while the fight runs — neither combatants nor onlookers/);
        assert.match(T(n).context.text, /no dialogue \(combat silence; it overrides any habit of opening with speech\)\. Then write the fact report\./);
    }
    // turn 10's reply: Fennick at the stairhead ("That's it eating you, lad.") in the middle of Round 2
    assert.match(T(11).context.text, /Combat silence broken: 2 spoken lines in your last reply \(e\.g\. "That's it eating you, lad\."\)/);
    // after the fight ended, talking is fine again
    assert.doesNotMatch(T(14).context.text, /Combat silence/);
});

test('turn 8: the quest the player took by name is recorded as soon as a report says so, although turn 8\'s reply had none', () => {
    assert.equal(T(8).reply.report_error, 'no <avereth> report');
    assert.equal(T(13).state.quests['quest.vermin_in_the_malthouse_cellar'].status, 'offered');
    assert.equal(T(14).state.quests['quest.vermin_in_the_malthouse_cellar'].status, 'active');
    assert.ok(!reasons(14).some((r) => r.includes('accepting the quest')), reasons(14).join(' | '));
    assert.match(T(14).panel, /`QUEST ACCEPTED — Vermin in the Malthouse Cellar \(Novice · Fennick\)`/);
    assert.equal(T(14).state.quests['quest.vermin_in_the_malthouse_cellar'].rec_level, 1, 'the level stays the one offered');
});

test('turn 8, discarded first attempt: the player took the vermin bill, so the reply cannot sign him onto the wolf contract', () => {
    const alt = replay(7, fx.discarded_turn8).turns.at(-1);
    assert.ok(alt.reply.rejected.some((x) => x.reason === 'PLAYER OWNERSHIP: the player\'s message takes "Vermin in the Malthouse Cellar", not "Wolves Near the Ashbridge Ford" (report it as "offered")'), alt.reply.rejected.map((x) => x.reason).join(' | '));
    assert.equal(alt.state.quests['quest.wolves_near_the_ashbridge_ford'].status, 'offered');
});

test('turn 14: money is coin, never an item — Fennick\'s three silver and six copper count once', () => {
    assert.ok(reasons(14).includes('money is not an item: report it once in "coin" (Copper; + received, - paid)'));
    assert.equal(T(14).state.entities.pc.sheet.inventory.silver, undefined);
    assert.equal(T(14).state.entities.pc.sheet.coin_cp, 66);
    assert.equal(T(15).state.entities.pc.sheet.coin_cp, 62, 'less the Guild\'s ten percent');
});

test('turn 14: from the malthouse cellar to the Guild hall, the dead vermin stays behind ("location" named the same city)', () => {
    assert.equal(T(14).state.scene.place, 'Guild hall common room');
    assert.deepEqual(T(14).state.scene.present, ['pc']);
    assert.ok(T(14).reply.accepted.includes('mon.cellar_vermin stays behind'));
});

test('people the story names but no report introduced become known: Maretta at the board, Fennick at the cellar door', () => {
    assert.equal(T(7).state.entities['npc.maretta'].name, 'Maretta');
    assert.equal(T(11).state.entities['npc.fennick'].name, 'Fennick');
    assert.ok(T(13).state.scene.present.includes('npc.fennick'), 'his "aware" placed him at the stairhead');
    assert.ok(T(14).reply.accepted.includes('leave npc.fennick'));
    assert.ok(!reasons(13).length && !reasons(14).some((r) => r.startsWith('leave')), [...reasons(13), ...reasons(14)].join(' | '));
    assert.equal(T(14).state.quests['quest.vermin_in_the_malthouse_cellar'].giver, 'npc.fennick');
});

test('turn 15: Serah, told the cellar story in the Guild hall, is there with Alaric (and her card is in the next block)', () => {
    assert.ok(T(15).reply.accepted.includes('enter npc.serah'));
    assert.ok(T(15).state.scene.present.includes('npc.serah'));
    // another spot of the same hall is still a move the player did not choose (Testrun 3: queue -> gate tunnel)
    assert.deepEqual(reasons(15), ['PLAYER OWNERSHIP: moving Alaric to another spot needs the player\'s own decision in the current message']);
});

test('"Alaric, no family name" is his name: the clerk knows it instead of holding a FALSE belief', () => {
    assert.ok(T(5).reply.accepted.includes('npc.serah learns pc name Alaric no family name'));
    assert.ok(!Object.values(T(15).state.claims).some((c) => c.s === 'pc' && c.p === 'name'));
    assert.doesNotMatch(T(7).context.text, /actually FALSE/);
});

test('an item the content pack does not know keeps the narrator\'s name', () => {
    assert.equal(T(6).panel.split('\n')[0], '`ITEM +1 Guild registration tag → 1 carried · registration completed`');
    assert.match(T(7).context.text, /Carried: Small Pouch, Guild registration tag \|/);
});

test('the contract no longer names a real city in its examples, and "check" asks for the two scores', () => {
    // the narrator took "I walk toward Ashbridge" as a neighbour of Lumenford: a river road to another realm's city
    assert.doesNotMatch(content.narrator.contract_text, /Ashbridge/);
    assert.match(content.narrator.report.keys.check, /actor:n, opposition:n \(the two scores of Chance%\)/);
});
