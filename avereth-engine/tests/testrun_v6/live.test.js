// First live run with the Avereth Narrator preset (2026-09-24 23:23, docs/TESTRUN_V6.md): GLM-5.3-Flash, reasoning low,
// Megumin off, report requests on. fixture.json holds the raw replies from the server log and the answers to the three
// separate report requests; 8 of 11 replies carried a report, the three requests brought the rest. Three engine faults:
// the clerk "believed" the name "Alaric Red" as FALSE and did not know his name; "Salt Gate customshouse, Alderwatch"
// and "Alderwatch, Valedorn Crown" (the engine block's own header form) each made a second Alderwatch; "turn in the
// signature slip" was refused as a hand-over the player had not chosen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, reportRequest, applyReportAnswer } from '../../src/host.js';
import { knows, PC_NAME_FACT } from '../../src/knowledge.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const fx = await readJson('tests/testrun_v6/fixture.json');
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });

function replay() {
    const chat = [ai(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    for (const input of fx.creation) {
        chat.push(user(input));
        prepareGeneration(chat, content, { type: 'normal' });
        chat.at(-1).is_system = true; // the extension hides a line the System answered
    }
    const turns = [];
    for (const t of fx.turns) {
        chat.push(user(t.input));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        chat.push(ai(t.reply));
        const id = chat.length - 1;
        processReply(chat, id, content, { recover: true });
        if (t.answer) {
            const req = reportRequest(chat, id, content);
            applyReportAnswer(chat, id, content, t.answer, { hash: req.hash, ms: 15000 });
        }
        turns.push({ input: t.input, context: gen.context, rec: chat[id].extra.avereth, state: foldChat(chat).state });
    }
    return { chat, turns };
}

const run = replay();
const T = (start) => run.turns.find((t) => t.input.startsWith(start));
const locations = (state) => Object.values(state.entities).filter((e) => e.kind === 'location');

test('the run replays with the invariants intact; every reply has its report, three of them from the separate request', () => {
    assert.deepEqual(foldChat(run.chat).errors, []);
    for (const t of run.turns) assert.deepEqual(validateState(t.state, content), [], t.input);
    assert.equal(run.turns.length, 11);
    assert.ok(run.turns.every((t) => !t.rec.report_error), 'no reply is left without a report');
    assert.equal(run.turns.filter((t) => t.rec.recovery).length, 3);
});

test('a name with the family name added is his name: whoever is told "Alaric Red" knows Alaric\'s name, nobody believes a false one', () => {
    // the gate guard ("knows name of": Alaric Red) and the Guild clerk ("name": Alaric Red, from the separate request)
    const gate = T('*i pay one copper').state;
    assert.ok(knows(gate, 'npc.guard_old', PC_NAME_FACT));
    const desk = T('Hello im Alaric Red').state;
    const clerk = Object.values(desk.entities).find((e) => e.kind === 'npc' && /guild clerk/.test(e.name || ''));
    assert.ok(knows(desk, clerk.id, PC_NAME_FACT), 'the clerk knows his name');
    assert.ok(!Object.values(desk.claims).some((c) => c.s === 'pc' && c.p === 'name'), 'no claim about his name, false or otherwise');
    const card = T('Im a Warrior at F-Rank').context.text.split('• the guild clerk')[1].split('\n•')[0];
    assert.match(card, /knows him by name/);
    assert.doesNotMatch(card, /actually FALSE/);
});

test('the city named with its realm or with a spot in it is still Alderwatch: no second Alderwatch, the spot becomes the place', () => {
    // the separate request for the walk to the customshouse: "Salt Gate customshouse, Alderwatch"
    const customs = T('*i shake my head and travel towards the Salt Gate').state;
    assert.equal(customs.scene.location, 'loc.alderwatch');
    assert.equal(customs.scene.place, "canal-side scribe's window outside the Salt Gate customshouse");
    assert.ok(!customs.scene.present.includes(Object.values(customs.entities).find((e) => /guild clerk/.test(e.name || ''))?.id), 'the Guild clerk stayed in the Guild hall');
    // the way back: "Alderwatch, Valedorn Crown", as the engine block's header writes it
    const back = run.turns.at(-1).state;
    assert.equal(back.scene.location, 'loc.alderwatch');
    assert.equal(back.scene.place, 'Alderwatch Adventurers\' Guild hall front desk');
    assert.deepEqual(locations(back), [], 'no location entity was created');
    assert.match(run.turns.at(-1).context.text, /\| Alderwatch, Valedorn Crown — canal-side scribe's window outside the Salt Gate customshouse \|/);
});

test('"turn in the signature slip" is the player handing it over', () => {
    const last = run.turns.at(-1);
    assert.ok(last.rec.accepted.some((a) => /^item signature slip ×1 from pc/.test(a)), last.rec.accepted.join(' | '));
    assert.ok(!Object.keys(last.state.entities.pc.sheet.inventory).some((k) => /signature/.test(k)));
    assert.ok(!last.rec.rejected.some((r) => /PLAYER OWNERSHIP: handing over signature slip/.test(r.reason)));
});
