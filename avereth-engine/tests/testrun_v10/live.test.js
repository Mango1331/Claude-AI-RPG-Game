// Live run 27.09.2026 02:30 (docs/TESTRUN_V10.md), build 3.1.2: Alaric walked from the roadside verge into Redmarch
// and the Guild, but the report named only the city ("location") and the verge stayed his place; the four quests of the
// Novice board came with "rank":1 and were all refused; "a Basic Attack at the creature" asked "Bren or Blue Ox barkeep
// or Cellar Gnawer"; and a fact about the pups went to mon.cellar_gnawer_pups, a creature the report could not create.
// On 3.1.2 the run replays byte for byte from this fixture (the chat JSONL, the narrator replies with their reports and
// the three report-request answers from the Chat Completion log). From message 17 on the fight starts two turns
// earlier than in the run, and the later replies were written for the run's own course.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { parseSwaps, hash32, ENGINE_VERSION } from '../../src/util.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v10/fixture.json');
const swaps = parseSwaps(fx.swaps);

const ai = (mes, extra = {}) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra });

/** The run as the extension plays it. */
function replay() {
    const chat = [];
    const at = {};
    for (const m of fx.chat) {
        if (m.greeting) chat.push(ai(m.mes, { avereth: { v: 2, events: m.events, text_hash: hash32(m.mes) } }));
        else if (m.system) chat.push({ is_user: false, is_system: true, mes: m.mes, extra: {} });
        else if (m.user) {
            chat.push({ is_user: true, is_system: false, mes: m.mes, extra: {} });
            const gen = prepareGeneration(chat, content, { type: 'normal', settings: { engineLore: false } });
            if (gen.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
            at[m.i] = { gen, rec: chat.at(-1).extra.avereth, state: foldChat(chat).state };
        } else {
            chat.push(ai(m.reply));
            const id = chat.length - 1;
            const got = processReply(chat, id, content, { swaps, recover: true });
            if (got.recover) applyReportAnswer(chat, id, content, m.answer, { hash: reportRequest(chat, id, content).hash, ms: m.ms });
            at[m.i] = { rec: chat[id].extra.avereth, panel: chat[id].extra.avereth.panel || '', state: foldChat(chat).state };
        }
    }
    return { chat, at };
}

const run = replay();
const header = (i) => run.at[i].gen.context.text.split('\n').find((l) => l.startsWith('Day '));
const RATS = 'quest.rats_cellar_of_the_blue_ox_tavern';

test('Alaric walks into Redmarch: the city is his place, not the roadside verge outside it', () => {
    assert.deepEqual(foldChat(run.chat).errors, []);
    assert.deepEqual(validateState(run.at[26].state, content), []);
    for (const m of run.chat.slice(1)) if (m.extra?.avereth) assert.equal(m.extra.avereth.build, ENGINE_VERSION);
    // the report said "location":"Redmarch, Veyrhold" and no place; the player had decided to go into the city
    assert.ok(!fx.recorded.accepted6.some((a) => a.startsWith('place')), 'the run: the verge stayed his place');
    assert.equal(run.at[6].rec.accepted[1], 'place: Redmarch');
    assert.equal(run.at[6].state.scene.place, 'Redmarch');
    assert.deepEqual(run.at[6].state.scene.present, ['pc', 'npc.gate_guard', 'npc.marta', 'npc.corvan']);
    // registration, the form, the board and taking the quest: the engine block no longer says the verge
    for (const i of [7, 9, 11, 13]) assert.match(header(i), /\| Redmarch, Veyrhold — Redmarch \| mode: story/, `message ${i}`);
    // Marta and the gate guard first saw him in the city
    const firstSeen = run.at[6].state.memories.filter((m) => m.kind === 'meeting').map((m) => m.text);
    assert.deepEqual(firstSeen, ['first saw {pc} at Redmarch', 'first saw {pc} at Redmarch']);
    // on to the Blue Ox: a spot after the city is a move, and the people of the Guild stay behind
    assert.ok(['npc.gate_guard', 'npc.marta', 'npc.corvan', 'npc.clerk'].every((id) => run.at[14].rec.accepted.includes(`${id} stays behind`)));
    assert.deepEqual(run.at[14].state.scene.present, ['pc', 'npc.bren', 'npc.blue_ox_barkeep']);
});

test('the Novice board: a rank given as 1 is Novice by the quest\'s level, so all four quests are recorded; the Rats quest goes offered → active', () => {
    assert.deepEqual(fx.recorded.rejected12, Array(4).fill('quest rank "1" is not a Guild Quest Rank (Novice|Proven|Veteran|Elite|Master|Grandmaster|Legend); omit it for work outside the Guild'));
    assert.deepEqual(run.at[12].rec.rejected, []);
    const board = Object.values(run.at[12].state.quests).map((q) => [q.title, q.status, q.rank, q.rec_level]);
    assert.deepEqual(board, [['Boar Damage — Eastfields', 'offered', 'Novice', 1], ['Herb Gathering — Greyfen', 'offered', 'Novice', 1],
        ['Rats — Cellar of the Blue Ox Tavern', 'offered', 'Novice', 1], ['Wormhole Delve — first three chambers', 'offered', 'Novice', 2]]);
    assert.ok(run.at[12].rec.accepted.includes('quest Rats — Cellar of the Blue Ox Tavern: offered (rank 1: Novice, by its level)'));
    assert.match(run.at[12].panel, /`QUEST OFFERED — Rats — Cellar of the Blue Ox Tavern \(Novice · Blue Ox Tavern\)`/);
    // taken at the front desk: the offered quest becomes active, with its reward as posted; the others stay on the board
    const rats = run.at[14].state.quests[RATS];
    assert.deepEqual([rats.status, rats.history.map((h) => h.status), rats.reward], ['active', ['offered', 'active'], '4 silver and a hot meal']);
    assert.deepEqual(Object.values(run.at[14].state.quests).filter((q) => q.status === 'offered').length, 3);
});

test('"a Basic Attack at the creature": the fight with the Cellar Gnawer starts at once, the fight the run had two turns later', () => {
    assert.equal(fx.recorded.outcome17.notice, 'Alaric: which target? Bren or Blue Ox or Cellar Gnawer (nothing spent, nothing rolled)');
    const intent = run.at[17].rec.events.find((e) => e.t === 'outcome.recorded').d.outcome;
    assert.equal(intent.kind, 'combat');
    assert.equal(intent.started.order, 'Cellar Gnawer > Alaric');
    // the same dice: the bite for 1, the Basic Attack for 18, the Gnawer dead, 10 XP
    assert.equal(run.at[18].panel, fx.recorded.panel19);
    assert.equal(run.at[18].state.entities['mon.cellar_gnawer'].status, 'dead');
    assert.equal(run.at[18].state.entities.pc.sheet.xp, 10);
});

test('the pups the report could not create name nothing: the fact about them keeps its words, and no fact is about a creature that does not exist', () => {
    assert.ok(fx.recorded.accepted24.includes('fact mon.cellar_gnawer_pups alive_in_nest_at_end_of right-hand passage'), 'the run');
    assert.deepEqual(run.at[24].rec.rejected.map((r) => r.item.ref), ['pups']);
    assert.ok(run.at[24].rec.accepted.includes('fact Cellar Gnawer pups alive_in_nest_at_end_of right-hand passage'));
    const s = run.at[24].state;
    assert.equal(s.entities['mon.cellar_gnawer_pups'], undefined);
    assert.ok(!Object.values(s.facts).some((f) => f.s === 'mon.cellar_gnawer_pups'));
    // the state check that finds such a fact
    const dangling = structuredClone(s);
    dangling.facts['f.t12.m24.2'] = { ...Object.values(s.facts).at(-1), id: 'f.t12.m24.2', s: 'mon.cellar_gnawer_pups' };
    assert.ok(validateState(dangling, content).includes('fact f.t12.m24.2 about missing entity mon.cellar_gnawer_pups'));
});
