// Live run 26.09.2026 23:09 (docs/TESTRUN_V8.md): GLM-5.3-Flash with the Avereth Narrator preset, lore from World Info.
// SillyTavern ran 8132a25, the state of main: the target labels and the engine's own target question were only on the
// branch. Replaying the run on 8132a25 reproduces every recorded event, panel, HUD and engine block byte for byte.
// Here it is replayed on the current build: the recorded greeting, the player's messages, the narrator's replies with
// their reports and the answers to the report requests (fixture.json, from the chat JSONL and the Chat Completion log).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer } from '../../src/host.js';
import { validateState } from '../../src/validate.js';
import { turnPanel } from '../../src/display.js';
import { worldRows, renderHud } from '../../src/hud.js';
import { knows, truth, PC_NAME_FACT } from '../../src/knowledge.js';
import { parseSwaps, hash32, ENGINE_VERSION } from '../../src/util.js';
import { readFile } from 'node:fs/promises';

const content = await loadContent();
const fx = await readJson('tests/testrun_v8/fixture.json');
const swaps = parseSwaps(fx.swaps);

const ai = (mes, extra = {}) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra });
const say = (chat, mes) => {
    chat.push({ is_user: true, is_system: false, mes, extra: {} });
    const gen = prepareGeneration(chat, content, { type: 'normal', settings: { engineLore: false } });
    if (gen.action === 'panels') chat.at(-1).is_system = true; // index.js hides a line the System answered
    return gen;
};
const answer = (chat, mes, { reply = null, ms = null } = {}) => {
    chat.push(ai(mes));
    const id = chat.length - 1;
    const got = processReply(chat, id, content, { swaps, recover: true });
    if (got.recover) applyReportAnswer(chat, id, content, reply, { hash: reportRequest(chat, id, content).hash, ms });
    return { rec: chat[id].extra.avereth, panel: chat[id].extra.avereth.panel || '', state: foldChat(chat).state };
};

/** The run as the extension plays it on this build: what each message did (by its index in the recorded chat). */
function replay() {
    const chat = [];
    const at = {};
    for (const m of fx.chat) {
        if (m.greeting) chat.push(ai(m.mes, { avereth: { v: 2, events: m.events, text_hash: hash32(m.mes) } }));
        else if (m.system) chat.push({ is_user: false, is_system: true, mes: m.mes, extra: {} });
        else if (m.user) {
            const gen = say(chat, m.mes);
            at[m.i] = { gen, state: foldChat(chat).state };
            // the engine asked for the target itself: the reply the run got here (the narrator asking) never happens
            if (gen.action === 'panels' && !fx.chat[m.i + 1]?.system) break;
        } else at[m.i] = answer(chat, m.reply, { reply: m.answer ?? null, ms: m.ms ?? null });
    }
    return { chat, at };
}

const { chat, at } = replay();
const labelsOf = (state) => Object.fromEntries(Object.values(state.encounter.combatants).filter((c) => c.label).map((c) => [c.id, c.label]));

test('the run replays on this build without errors; every record says which build wrote it', () => {
    assert.deepEqual(foldChat(chat).errors, []);
    assert.deepEqual(validateState(foldChat(chat).state, content), []);
    const recs = chat.slice(1).map((m) => m.extra.avereth).filter(Boolean);
    assert.ok(recs.length > 10);
    for (const r of recs) assert.equal(r.build, ENGINE_VERSION);
    // the run itself: no build stamp, the labels and the COMBAT TARGETS line missing
    assert.doesNotMatch(fx.recorded.panel14, /COMBAT TARGETS|Cellar Rat A/);
});

test('the build shows where the player can check it: SillyTavern\'s extension list (manifest), #audit, the event export', async () => {
    const manifest = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url), 'utf8'));
    const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.deepEqual([manifest.version, pkg.version], [ENGINE_VERSION, ENGINE_VERSION]);
    const c = chat.slice();
    const gen = say(c, '#audit');
    assert.equal(gen.action, 'panels');
    assert.match(gen.panels[0], new RegExp(`\\| Engine ${ENGINE_VERSION.replace(/\./g, '\\.')}$`));
    const index = await readFile(new URL('../../index.js', import.meta.url), 'utf8');
    assert.match(index, /build: m\.extra\?\.avereth\?\.build, events:/, 'the export names the build of each message');
    assert.match(index, /`Avereth Engine \$\{ENGINE_VERSION\} \| `/, 'the settings status line');
});

test('"alaric_red" in the report is Alaric: his Guild Rank is his, the clerk and Dagny know his name, no stranger "alaric_red"', () => {
    const s = at[10].state;
    assert.ok(at[10].rec.accepted.includes('fact pc guild_rank Novice'));
    assert.ok(at[10].rec.accepted.includes('npc.clerk learns pc registered_name Alaric Red'));
    assert.equal(truth(s, 'pc', 'guild_rank')[0]?.o, 'Novice');
    assert.ok(knows(s, 'npc.clerk', PC_NAME_FACT), 'he wrote "Alaric Red" in the register under the clerk\'s eyes');
    assert.ok(knows(at[12].state, 'npc.dagny', PC_NAME_FACT), 'the quest slip is logged under his name');
    assert.ok(!Object.values(at[12].state.facts).some((f) => /alaric_red/.test(f.s)), 'no fact about a subject "alaric_red"');
    assert.match(at[12].rec.hud, /Guild Rank Novice/);
    assert.match(at[13].gen.context.text, /• Dagny — [^\n]*\n {2}toward Alaric: [^\n]*knows him by name/);
});

test('the fight the reply opens: the three rats, faster than Alaric, bite at once; his Turn waits; labels in the snapshot', () => {
    const s = at[14].state;
    const enc = s.encounter;
    assert.deepEqual(labelsOf(s), { 'mon.big_cellar_rat': 'Big Cellar Rat', 'mon.cellar_rat': 'Cellar Rat A', 'mon.cellar_rat_2': 'Cellar Rat B' });
    assert.deepEqual([enc.round, enc.current, enc.log.map((r) => `${r.round}:${r.actor}`)], [1, 'pc', ['1:mon.cellar_rat', '1:mon.big_cellar_rat', '1:mon.cellar_rat_2']]);
    assert.equal(s.entities.pc.sheet.hp, 82);
    // the snapshot keeps the labels, as the event export shows them
    const started = at[14].rec.events.find((e) => e.t === 'encounter.started').d.encounter;
    assert.equal(started.combatants['mon.cellar_rat_2'].label, 'Cellar Rat B');
    assert.deepEqual(at[14].panel.split('\n'), [
        '`COMBAT START — Big Cellar Rat, Cellar Rat A, Cellar Rat B attack Alaric`',
        '`Initiative: Cellar Rat A 10 · Big Cellar Rat 10 · Cellar Rat B 10 · Alaric 7 → Turn order: Cellar Rat A › Big Cellar Rat › Cellar Rat B › Alaric`',
        '`— Round 1 —`',
        '`Cellar Rat A: Bite → Alaric`',
        '`  1 damage → Alaric HP 85 - 1 = 84`',
        '`Big Cellar Rat: Bite → Alaric`',
        '`  1 damage → Alaric HP 84 - 1 = 83`',
        '`Cellar Rat B: Bite → Alaric`',
        '`  1 damage → Alaric HP 83 - 1 = 82`',
        '`COMBAT TARGETS — Big Cellar Rat [ENGAGED] · Cellar Rat A [ENGAGED] · Cellar Rat B [ENGAGED]`',
        '`HP: Cellar Rat A 16/16 · Big Cellar Rat 16/16 · Cellar Rat B 16/16 · Alaric 82/85`',
        '`Range: Cellar Rat A ENGAGED · Big Cellar Rat ENGAGED · Cellar Rat B ENGAGED`',
        '`Alaric: MP 60/60 · STA 100/100`',
        '`Next: Alaric\'s Turn (Round 1)`',
        '`Alaric\'s attacks vs Big Cellar Rat: Basic Attack 16–19 · Heavy Slash 23–28 · Charge 21–26 damage`',
    ]);
    // c.6.4: during a fight the tactical combat HUD replaces the World HUD's "Combat: Round 1, Alaric to act" line
    assert.match(at[14].rec.hud, /<summary>⚔ COMBAT · Round 1 · Alaric's turn<\/summary>/);
});

test('the Heavy Slash goes on from Alaric\'s Turn: no Turn twice, the same dice as the run, the narrator hears the whole Round', () => {
    const o = at[15].state.last.outcome;
    assert.deepEqual(o.records.map((r) => `${r.round}:${r.actor}`), ['1:mon.cellar_rat', '1:mon.big_cellar_rat', '1:mon.cellar_rat_2', '1:pc', '2:mon.cellar_rat', '2:mon.cellar_rat_2']);
    assert.equal(o.shown, 3, 'the reply of the fight\'s start showed the first three');
    assert.deepEqual(at[15].state.encounter.log.filter((r) => r.round === 1).map((r) => r.actor), ['mon.cellar_rat', 'mon.big_cellar_rat', 'mon.cellar_rat_2', 'pc']);
    // the rolls are the run's: Big Cellar Rat 16 - 25 → 0, Alaric at 80/85 (the RNG order is unchanged)
    assert.match(at[16].panel, /`  25 damage → Big Cellar Rat HP 16 - 25 → 0 DEFEATED`/);
    assert.equal(at[16].state.entities.pc.sheet.hp, 80);
    assert.match(fx.recorded.panel14 + at[16].panel, /Alaric 80\/85/);
    // the narrator: the start and every step since its last reply, in order
    assert.match(at[15].gen.context.text, /Combat starts \([^\n]*\n- Cellar Rat A: Bite -> Alaric: lands: 1 damage -> Alaric HP 85->84\n- Big Cellar Rat: Bite[^\n]*\n- Cellar Rat B: Bite[^\n]*\n- Alaric: Heavy Slash -> Big Cellar Rat/);
    // the player: only what is new
    assert.match(at[16].panel, /^`— Round 1 —`\n`Alaric: Heavy Slash → Big Cellar Rat · STA 100 - 7 = 93`/);
    assert.doesNotMatch(at[16].panel, /Round 1 —`\n`Cellar Rat A/);
});

test('the report re-describing the fighting rats ("rat1 bit his calf", "rat2 gnawing at his greave") makes no new creatures', () => {
    // the run: two more rats, "the bit his calf" and "the gnawing at his greave", beside the two fighting
    assert.match(fx.recorded.hud16_present, /the bit his calf · the gnawing at his greave/);
    assert.deepEqual(fx.recorded.accepted16.slice(1, 3), ['new creature rat1 (mon.rat1)', 'new creature rat2 (mon.rat2)']);
    const s = at[16].state;
    assert.ok(!s.entities['mon.rat1'] && !s.entities['mon.rat2']);
    assert.deepEqual(at[16].rec.accepted, ['known mon.big_cellar_rat (not duplicated)', 'mon.cellar_rat fights on', 'mon.cellar_rat fights on']);
    assert.deepEqual(at[16].rec.rejected.map((r) => r.reason), ['rat1', 'rat2'].map((ref) => `new creature "${ref}" during the fight: the creatures fighting are named by their labels (as in the engine block), and a creature that joins is introduced in "new" and named in "combat"`));
    assert.equal(Object.fromEntries(worldRows(s, content)).Present, 'Big Cellar Rat (dead, ENGAGED) · Cellar Rat A (HP 16/16, ENGAGED) · Cellar Rat B (HP 16/16, ENGAGED)');
    // the narrator is told in its next engine block
    const next = say(chat.slice(), '*i Basic Attack Cellar Rat B*');
    assert.match(next.context.text, /Rejected from your fact report: new creature "rat1" during the fight: the creatures fighting are named by their labels/);
});

test('"the Cellar Rat that gnaws at my leather and strap" is the engine\'s question: no narrator call, nothing rolled', () => {
    // the run: "which target? Cellar Rat or Cellar Rat" went to the narrator, which asked again in its story
    assert.match(fx.recorded.panel18, /^`Alaric: which target\? Cellar Rat or Cellar Rat \(nothing spent, nothing rolled\)`/);
    const gen = at[17].gen;
    assert.equal(gen.action, 'panels', 'answered by the engine alone');
    assert.deepEqual(gen.panels, [[
        '[SYSTEM // COMBAT — TARGET NEEDED]',
        'Alaric\'s Basic Attack: which target — Cellar Rat A or Cellar Rat B? Nothing was spent or rolled.',
        'COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [ENGAGED]',
        'Name one, for example: *Basic Attack on Cellar Rat A*',
    ].join('\n')]);
    assert.deepEqual(chat.at(-1).extra.avereth.events, []);
    assert.deepEqual(at[17].state.encounter, at[16].state.encounter);
});

test('"Basic Attack Cellar Rat A" hits exactly A; the System panel, the HUD and the engine block name them alike', () => {
    const c = chat.slice();
    const gen = say(c, '*i Basic Attack Cellar Rat A*');
    assert.equal(gen.action, 'context');
    const s = foldChat(c).state;
    const mine = s.last.outcome.records.find((r) => r.actor === 'pc');
    assert.equal(mine.target, 'mon.cellar_rat');
    assert.match(gen.context.text, /- Alaric: Basic Attack -> Cellar Rat A \[/);
    assert.match(turnPanel(s, content), /`Alaric: Basic Attack → Cellar Rat A/);
    // c.6.4 combat HUD: one row per foe still in the fight, by the same label (a defeated one leaves the table)
    const row = (label) => new RegExp(`<span class="avereth-combat-name">${label}</span><span class="avereth-combat-hp">\\d+/16</span>`);
    if (s.encounter?.combatants['mon.cellar_rat']?.current.defeated) assert.doesNotMatch(renderHud(s, content, 'open'), /avereth-combat-name">Cellar Rat A</);
    else assert.match(renderHud(s, content, 'open'), row('Cellar Rat A'));
    assert.match(renderHud(s, content, 'open'), row('Cellar Rat B'));
});

test('a real newcomer still joins: introduced in "new" and its ref named in "combat", it is Cellar Rat C, also by the same name', () => {
    const rat3 = (entry) => {
        const c = chat.slice();
        say(c, '*i Basic Attack Cellar Rat A*');
        return answer(c, `A third rat drops from the grain sacks and goes for his boot.\n<avereth>{"new":[${JSON.stringify(entry)}],"combat":{"by":["rat_3"]}}</avereth>`);
    };
    const bySpecies = rat3({ ref: 'rat_3', kind: 'creature', species: 'rat', desc: ['cellar rat'], band: 'ENGAGED' });
    assert.deepEqual([bySpecies.rec.rejected, bySpecies.rec.accepted], [[], ['new creature rat_3 (mon.rat_3)', 'combat committed by mon.rat_3 (pending)']]);
    assert.equal(bySpecies.state.encounter.combatants['mon.rat_3']?.label, 'Cellar Rat C');
    assert.match(bySpecies.panel, /`COMBAT — Cellar Rat C joins the fight/);
    // named like the fighters, as the run's own report named its rats: its new ref, committed, makes it a newcomer; the
    // name "Cellar Rat" does not merge it with Cellar Rat A (it did: "known mon.cellar_rat", and the rat was lost)
    const byName = rat3({ ref: 'rat_3', kind: 'creature', name: 'Cellar Rat', species: 'rat', band: 'ENGAGED' });
    assert.deepEqual([byName.rec.rejected, byName.rec.accepted], [[], ['new creature Cellar Rat (mon.cellar_rat_3)', 'combat committed by mon.cellar_rat_3 (pending)']]);
    assert.deepEqual(Object.values(byName.state.encounter.combatants).filter((x) => x.id !== 'pc').map((x) => x.label), ['Big Cellar Rat', 'Cellar Rat A', 'Cellar Rat B', 'Cellar Rat C']);
    assert.match(byName.panel, /`COMBAT — Cellar Rat C joins the fight/);
});

test('fighters re-described under new refs while the report names them by label make no new creatures either', () => {
    const c = chat.slice();
    say(c, '*i Basic Attack Cellar Rat A*');
    const r = answer(c, 'The rats keep at his legs.\n<avereth>{"combat":{"by":["Cellar Rat A","Cellar Rat B"]},"new":[{"ref":"rat1","kind":"creature","species":"rat","desc":["bit his calf"]},{"ref":"rat2","kind":"creature","species":"rat","desc":["gnawing at his greave"]}]}</avereth>');
    assert.deepEqual(r.rec.rejected.map((x) => x.item.ref), ['rat1', 'rat2']);
    assert.deepEqual(r.rec.accepted, ['mon.cellar_rat fights on', 'mon.cellar_rat_2 fights on']);
    assert.ok(!r.state.entities['mon.rat1'] && !r.state.entities['mon.rat2']);
    assert.deepEqual(Object.values(r.state.encounter.combatants).filter((x) => x.id !== 'pc').map((x) => x.label), ['Big Cellar Rat', 'Cellar Rat A', 'Cellar Rat B']);
});
