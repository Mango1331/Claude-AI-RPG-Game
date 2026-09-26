// Test 5, first run (GLM-5.3-Flash, reasoning low, Megumin after the RUNTIME_V3 checklist; fixture.json holds the raw
// replies from the server log). Creation by System panels worked (the typo "Heavy Shlash" was refused visibly); in the
// story six of nine replies had no fact report and one report closed its JSON too early, so the Guild hall, the quest
// and the cellar rats never reached the engine: the HUD stayed at the gate and the Guild, and the attack in the cellar
// asked "Brissa or the woman in fish-stained apron?". "*i give her one Silver*" was refused as unauthorized spending.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer } from '../../src/host.js';
import { tolerantJson, extractReport } from '../../src/delta.js';
import { authorization } from '../../src/intent.js';
import { truth } from '../../src/knowledge.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v5/fixture.json');
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });

// Turn 11 reported the rats as one creature, "cellar rats", and committed it. Since the live run of 25.09. a pack is
// never one combatant: the engine asks for its individual attackers (host.js reportRequest). The run had no such
// request; this answer is synthetic: the one rat the reply shows coming ("The nearest one doesn't run"), the others
// "unmoving" behind it.
const ATTACKERS = {
    11: '<avereth>{"new":[{"ref":"lead_rat","kind":"creature","species":"rat","desc":["cat-sized cellar rat"],"band":"SHORT","cover":"partial"}],"combat":{"by":["lead_rat"]}}</avereth>',
};

function replay() {
    const chat = [ai(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    const creation = [];
    for (const input of fx.creation) {
        chat.push(user(input));
        creation.push(prepareGeneration(chat, content, { type: 'normal' }));
        chat.at(-1).is_system = true; // the extension hides a line the System answered
    }
    const turns = [];
    for (const t of fx.turns) {
        chat.push(user(t.input));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const outcome = chat.at(-1).extra.avereth.events.find((e) => e.t === 'outcome.recorded').d.outcome;
        chat.push(ai(t.reply));
        const id = chat.length - 1;
        const n = turns.length + 4;
        const got = processReply(chat, id, content, { recover: !!ATTACKERS[n] });
        const reply = got.recover ? applyReportAnswer(chat, id, content, ATTACKERS[n], { hash: reportRequest(chat, id, content).hash, ms: 9000 }).result : got.result;
        turns.push({ input: t.input, context: gen.context, outcome, reply, panel: chat.at(-1).extra.avereth.panel || '', state: foldChat(chat).state });
    }
    return { chat, creation, turns };
}

const { chat, creation, turns } = replay();
const T = (n) => turns[n - 4]; // story turns start at turn 4 (turns 1-3 were creation)

test('the run replays with the invariants intact; creation by System panels, the typo refused, the Warrior equipped', () => {
    assert.deepEqual(creation.map((g) => g.action), ['panels', 'panels', 'panels']);
    assert.match(creation[1].panels[0], /Not a valid Skill choice: Select exactly 2 distinct Skills\. Recognized: Guard\./);
    assert.match(creation[2].panels[0], /CHARACTER CREATION COMPLETE[\s\S]*Starter Longsword \[F\] \(ATK 6\), Starter Heavy Armor \[F\] \(DEF 6, MDEF 2\)[\s\S]*HP 85\/85/);
    assert.deepEqual(foldChat(chat).errors, []);
    for (const t of turns) assert.deepEqual(validateState(t.state, content), [], t.input);
});

test('turn 8 "*i give her one Silver*": handing over money is paying; the Guild Rank inside a longer value counts', () => {
    assert.ok(authorization(T(8).input).pay);
    assert.deepEqual(T(8).reply.rejected, []);
    assert.equal(T(8).state.entities.pc.sheet.coin_cp, 40);
    assert.match(T(8).panel, /COIN -1 Silver → 4 Silver · registration fee/);
    assert.equal(truth(T(8).state, 'pc', 'guild_rank')[0].o, 'Novice', '"Novice, registered (F claimed)"');
});

test('turn 11: a report whose root closed too early is repaired: cellar, quest, the rat pack and its attack reach the engine', () => {
    const raw = extractReport(fx.turns[7].reply).raw;
    assert.throws(() => JSON.parse(raw), 'the model\'s JSON: "…{"by":"cellar_rats"}},"check":{…}"');
    const { value } = tolerantJson(raw);
    assert.deepEqual(Object.keys(value), ['time', 'place', 'quests', 'new', 'aware', 'combat', 'check']);
    assert.equal(T(11).reply.report_error, null);
    const st = T(11).state;
    assert.equal(st.scene.place, "cellar beneath Mol's drying loft, Tannery Row");
    assert.equal(Object.values(st.quests).find((q) => q.title === 'Boletus Clearing')?.status, 'active', 'taken by name in turn 9');
    assert.ok(st.encounter, 'the rats committed to attack: the fight is fixed at once');
    // the pack ("cellar rats") is no combatant: asked for, its attacking rat came in (a synthetic answer, see ATTACKERS)
    assert.ok(!st.entities['mon.cellar_rats'], 'no creature "cellar rats" with a single rat\'s profile');
    assert.match(T(11).panel, /QUEST ACCEPTED — Boletus Clearing[\s\S]*COMBAT START — Cat-Sized Cellar Rat A attacks Alaric[\s\S]*ATTACKERS IDENTIFIED/);
});

test('turn 12: "dash at the nearest one" attacks the rats in the cellar, not the Guild clerk', () => {
    assert.equal(T(12).outcome.kind, 'combat');
    assert.doesNotMatch(T(12).panel, /Brissa|which target/);
    const mine = T(12).outcome.records.find((r) => r.actor === 'pc');
    assert.equal(mine.target, 'mon.lead_rat');
    assert.match(T(12).panel, /COMBAT END — Cat-Sized Cellar Rat A defeated/);
});

test('a reply without a fact report is shown to the player, and the engine block ends with the report duty', () => {
    for (const n of [5, 6, 7, 9, 10, 12]) assert.match(T(n).panel, /NO FACT REPORT: nothing this reply established was recorded/, `turn ${n}`);
    // the display never carries the tag: the streaming regex would hide everything after it, the HUD included
    assert.ok(turns.every((t) => !/<avereth>/.test(t.panel)));
    for (const n of [4, 8, 11]) assert.doesNotMatch(T(n).panel, /NO FACT REPORT/, `turn ${n}`);
    for (const t of turns) assert.ok(t.context.text.endsWith('End EVERY reply with <avereth>{…}</avereth>, {} if nothing new.'), t.input);
    assert.match(T(5).context.text, /No mechanic was triggered by the player's message \(the fact report is still due\)/);
});

test('a fact reported with the object true reads without it ("Alaric has red eyes", not "... true")', () => {
    const text = T(5).context.text.split('FACT REPORT:')[0]; // the cards and RELEVANT, not the report schema
    assert.match(text, /knows: Alaric carries unmarked sword and new armor \[witnessed\]/);
    assert.match(text, /- Alaric has red eyes\n/);
    assert.doesNotMatch(text, /\btrue\b/);
});
