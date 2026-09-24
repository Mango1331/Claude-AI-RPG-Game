// Runtime V3: the minimal persistent NPC record that replaces the Megumin NPC dossier (docs/REVIEW_V3.md 4.2). No new
// state: identity (entity), role/look/voice/agenda (ordinary facts), stance toward Alaric (relation), the last
// meaningful moment (memories, importance >= 6), what the NPC legitimately knows (knowledge rows). Blank space stays
// blank until play establishes it; a discarded swipe leaves nothing behind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, FIRST_MESSAGE } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { MEANINGFUL_IMPORTANCE, truth } from '../../src/knowledge.js';

const content = await loadContent();

function cardOf(text, name) {
    const lines = text.split('\n');
    const i = lines.findIndex((l) => l.startsWith(`• ${name}`));
    if (i < 0) return '';
    const out = [lines[i]];
    for (let j = i + 1; j < lines.length && lines[j].startsWith('  '); j++) out.push(lines[j]);
    return out.join('\n');
}

/** Kest at the Guild board: a recurring NPC whose record play establishes step by step. */
function withKest() {
    const g = new Game(content).ranger();
    g.turn('I walk to the Novice board and read the postings.', {
        place: 'Guild hall, Novice board',
        new: [{ ref: 'Kest', name: 'Kest', kind: 'npc', desc: ['veteran adventurer'], traits: 'one-eyed, grey braid, gruff' }],
        facts: [{ s: 'Kest', p: 'occupation', o: 'veteran adventurer' }, { s: 'Kest', p: 'voice', o: 'low rasp, clipped sentences' }],
    });
    g.turn('"What do you know about the Greyhowl posting?" *I ask Kest.*', {
        memory: [{ text: 'Kest warned Alaric that Greyhowl killed two Wardens and told him to leave the posting alone', who: ['Kest', 'pc'], imp: 7 }],
        attitude: [{ who: 'Kest', delta: -25, why: 'a green Novice eyeing the Greyhowl bill' }],
        facts: [{ s: 'Kest', p: 'agenda', o: 'get the Greyhowl posting taken down' }],
        learn: [{ who: 'Kest', s: 'pc', p: 'rank', o: 'newly registered Novice', how: 'witnessed' }],
    });
    return g;
}

test('incidental NPC: introduced, used, gone — no rich dossier, nothing invented, no record once out of sight', () => {
    const g = new Game(content).ranger();
    g.turn('I show my pass at the gate.', { new: [{ ref: 'gate guard', kind: 'npc', desc: ['gate guard', 'bored'] }] });
    const e = g.state.entities['npc.gate_guard'];
    assert.deepEqual(Object.keys(e).sort(), ['card', 'created', 'descriptors', 'id', 'kind', 'location', 'name', 'source', 'status', 'template', 'traits']);
    assert.equal(Object.values(g.state.relations).length, 0, 'no stance toward Alaric was invented');
    assert.equal(truth(g.state, 'npc.gate_guard', 'agenda').length, 0);
    g.input('"Thanks." *I walk on.*');
    const card = cardOf(g.context().text, 'the gate guard');
    assert.ok(card.split('\n').length <= 2, card);
    assert.doesNotMatch(card, /last meaningful|agenda|Background|Inner Circle|Secret|Canon/);
    g.turn('I walk into the city.', { time: 10, place: 'market square', leave: ['gate guard'] });
    g.input('I look for a smithy.');
    assert.doesNotMatch(g.context().text, /gate guard/, 'an incidental face is not carried into later prompts');
});

test('relevant recurring NPC: a compact record (role, look, voice, stance, last meaningful moment, knowledge, agenda)', () => {
    const g = withKest();
    g.input('"Understood." *I nod to Kest.*');
    const card = cardOf(g.context().text, 'Kest');
    assert.deepEqual(card.split('\n'), [
        '• Kest — person, veteran adventurer; one-eyed, grey braid, gruff; voice: low rasp, clipped sentences',
        '  toward Alaric: wary/unfriendly (-25) (last change: a green Novice eyeing the Greyhowl bill); has seen him, does NOT know his name',
        // Kest never heard Alaric's name: he remembers "the stranger" (knowledge boundaries in memories too)
        '  last meaningful: [Day 1, 09:00] Kest warned the stranger that Greyhowl killed two Wardens and told him to leave the posting alone',
        '  knows: Alaric rank newly registered Novice [witnessed]',
        '  agenda: get the Greyhowl posting taken down',
    ]);
    assert.ok(card.length < 600, `the record stays small (${card.length} chars; a Megumin dossier was ≈ 3,300)`);
});

test('a returning NPC keeps the same look, voice, stance and agenda after many turns elsewhere; named while absent, a short record', () => {
    const g = withKest();
    g.turn('I leave the hall.', { time: 5, location: 'Goldharbor', place: 'harbour road', leave: ['Kest'] });
    for (let i = 0; i < 40; i++) g.turn(`I work the docks, day ${i}.`, { time: 480, memory: [{ text: `Alaric hauled crates at pier ${i % 7}`, who: ['pc'], imp: 3 }] });
    g.input('I wonder whether Kest got the Greyhowl posting taken down.');
    const named = g.context().text;
    assert.match(named, /NAMED, NOT PRESENT/);
    const absent = cardOf(named, 'Kest');
    assert.match(absent, /one-eyed, grey braid, gruff; voice: low rasp, clipped sentences; NOT PRESENT/);
    assert.match(absent, /agenda: get the Greyhowl posting taken down/);
    assert.match(absent, /last meaningful: \[Day 1, \d\d:\d\d\] Kest warned/);
    g.reply({});
    g.turn('I travel back to the Guild.', { time: 900, location: 'Lumenford', place: 'Guild hall, Novice board', enter: ['Kest'] });
    g.input('"Kest. The Greyhowl bill is still up."');
    const card = cardOf(g.context().text, 'Kest');
    assert.match(card, /one-eyed, grey braid, gruff; voice: low rasp, clipped sentences/);
    assert.match(card, /wary\/unfriendly \(-25\)/);
    assert.match(card, /agenda: get the Greyhowl posting taken down/);
});

test('agenda: established once it persists; a new one replaces it; "none" ends it', () => {
    const g = withKest();
    g.turn('Time passes.', { time: 60, facts: [{ s: 'Kest', p: 'goal', o: 'recruit a party for the Greyhowl hunt himself' }] });
    assert.deepEqual(truth(g.state, 'npc.kest', 'agenda').map((f) => f.o), ['recruit a party for the Greyhowl hunt himself'], '"goal" is the agenda slot; the old agenda ended');
    g.input('"Count me in."');
    assert.match(cardOf(g.context().text, 'Kest'), /agenda: recruit a party for the Greyhowl hunt himself/);
    g.reply({ facts: [{ s: 'Kest', p: 'agenda', o: 'none' }] });
    g.input('"When do we leave?"');
    assert.doesNotMatch(cardOf(g.context().text, 'Kest'), /agenda:/);
});

test('meaningful memory (importance >= 6) enters the record; a trivial one ("Kest nodded") and the default 5 do not', () => {
    assert.equal(MEANINGFUL_IMPORTANCE, 6);
    const g = withKest();
    g.turn('*I nod back.*', { memory: [{ text: 'Kest nodded', who: ['Kest', 'pc'], imp: 2 }] });
    g.turn('*I ask about the weather.*', { memory: [{ text: 'Kest grumbled about the rain', who: ['Kest', 'pc'] }] });
    g.input('"Anything else, Kest?"');
    const card = cardOf(g.context().text, 'Kest');
    assert.match(card, /last meaningful: \[Day 1, \d\d:\d\d\] Kest warned/, 'the warning stays the last meaningful moment');
    assert.doesNotMatch(card, /nodded|rain/);
    assert.equal(g.state.memories.filter((m) => /nodded|rain/.test(m.text)).length, 2, 'routine moments stay in the log');
    g.reply({ memory: [{ text: 'Kest gave Alaric his old Warden whistle to call for help', who: ['Kest', 'pc'], imp: 8 }] });
    g.input('"Thank you."');
    assert.match(cardOf(g.context().text, 'Kest'), /last meaningful: \[Day 1, \d\d:\d\d\] Kest gave the stranger his old Warden whistle/);
});

test('knowledge: what Kest legitimately learned persists; what he never witnessed or heard does not leak into his record', () => {
    const g = withKest();
    g.turn('I leave the hall.', { time: 5, place: 'back alley', leave: ['Kest'] });
    // Alaric does something Kest did not see; a report claiming Kest witnessed it is refused
    const r = g.reply({
        facts: [{ s: 'pc', p: 'carries', o: 'a stolen Guild seal', vis: 'secret' }],
        learn: [{ who: 'Kest', s: 'pc', p: 'carries', o: 'a stolen Guild seal', how: 'witnessed' }],
    });
    assert.ok(r.rejected.some((x) => /not present and cannot have witnessed it/.test(x.reason)), r.rejected.map((x) => x.reason).join(' | '));
    g.turn('I return.', { time: 5, place: 'Guild hall, Novice board', enter: ['Kest'] });
    g.input('"Kest, a word?"');
    const card = cardOf(g.context().text, 'Kest');
    assert.match(card, /knows: Alaric rank newly registered Novice \[witnessed\]/);
    assert.doesNotMatch(card, /stolen Guild seal/);
});

test('attitude: a reported change persists with its reason; ordinary turns and a delta of 0 never drift it', () => {
    const g = withKest();
    const rel = () => g.state.relations['rel.npc.kest.attitude.pc'];
    assert.equal(rel().value, -25);
    for (let i = 0; i < 20; i++) g.turn(`"Fine weather," *I say to Kest (${i}).*`, {});
    const zero = g.reply({ attitude: [{ who: 'Kest', delta: 0, why: 'nothing changed' }] });
    assert.ok(!zero.events.some((e) => e.t.startsWith('relation.')), 'a zero delta is no event');
    assert.equal(rel().value, -25);
    assert.equal(rel().history.length, 1);
    g.turn('*I bring back the Warden\'s tag from the Greyhowl den.*', { attitude: [{ who: 'Kest', delta: 40, why: 'brought back a dead Warden\'s tag' }] });
    assert.equal(rel().value, 15);
    g.turn('I leave.', { time: 30, place: 'harbour road', leave: ['Kest'] });
    g.turn('I come back.', { time: 30, place: 'Guild hall, Novice board', enter: ['Kest'] });
    g.input('"Kest."');
    assert.match(cardOf(g.context().text, 'Kest'), /toward Alaric: neutral \(\+15\) \(last change: brought back a dead Warden's tag\)/);
    assert.equal(g.refold().relations['rel.npc.kest.attitude.pc'].value, 15, 'the event log alone reproduces it');
});

test('a person first named in prose gets a look once; later traits never overwrite it', () => {
    const g = new Game(content).ranger();
    g.turn('I wait at the cellar door.', { aware: [{ who: 'Fennick', level: 'aware' }] }, 'Fennick wipes his hands on his apron.');
    assert.equal(g.state.entities['npc.fennick'].traits, '');
    g.turn('"You the maltster?"', { new: [{ ref: 'Fennick', kind: 'npc', traits: 'thickset, flour in the creases of a stained apron' }] });
    g.turn('"Show me the cellar."', { new: [{ ref: 'Fennick', kind: 'npc', traits: 'tall and thin' }] });
    assert.equal(g.state.entities['npc.fennick'].traits, 'thickset, flour in the creases of a stained apron');
});

// ------------------------------------------------------------------------------------------------ branches (swipes)
function aiMsg(mes) {
    return { is_user: false, is_system: false, name: 'RPG', mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} };
}
function play(chat, input, reply) {
    chat.push({ is_user: true, is_system: false, name: 'Alaric', mes: input, extra: {} });
    prepareGeneration(chat, content, { type: 'normal' });
    chat.push(aiMsg(reply));
    processReply(chat, chat.length - 1, content);
}

test('branch before an NPC fact: the discarded swipe\'s dossier-like canon is absent in the kept branch', () => {
    // Testrun 4: the Megumin NPC bank kept Maretta's dossier from a discarded attempt ("Alaric countersigned onto
    // her wolf contract") and injected it into every later prompt. The engine's record lives on the swipe.
    const chat = [aiMsg(FIRST_MESSAGE)];
    processReply(chat, 0, content, { seed: 99 });
    play(chat, 'Ranger', 'CLASS SELECTED <avereth>{}</avereth>');
    play(chat, 'Aimed Shot + Power Shot', 'CHARACTER CREATION COMPLETE <avereth>{}</avereth>');
    play(chat, 'I walk to the quest board.', 'A huntress stands at the board.\n<avereth>{"new":[{"ref":"Maretta","name":"Maretta","kind":"npc","desc":["huntress"],"traits":"boar tusk on a neck cord"}]}</avereth>');
    const reply = aiMsg('Maretta taps the wolf bill.\n<avereth>{"facts":[{"s":"Maretta","p":"agenda","o":"reach the ford first and take the whole purse"}],"memory":[{"text":"Alaric countersigned onto Maretta\'s wolf contract","who":["Maretta","pc"],"imp":8}],"attitude":[{"who":"Maretta","delta":-20,"why":"a rival for her purse"}]}</avereth>');
    chat.push({ is_user: true, is_system: false, name: 'Alaric', mes: 'I take the vermin bill instead.', extra: {} });
    prepareGeneration(chat, content, { type: 'normal' });
    chat.push(reply);
    processReply(chat, chat.length - 1, content);
    const withBranch = foldChat(chat).state;
    assert.equal(truth(withBranch, 'npc.maretta', 'agenda').length, 1, 'swipe 0 established it');
    // the player swipes: the new reply establishes nothing about Maretta
    reply.swipes.push('Serah stamps the vermin bill.\n<avereth>{}</avereth>');
    reply.swipe_info.push({ extra: structuredClone(reply.extra) });
    reply.swipe_id = 1;
    reply.mes = reply.swipes[1];
    processReply(chat, chat.length - 1, content);
    const kept = foldChat(chat).state;
    assert.equal(truth(kept, 'npc.maretta', 'agenda').length, 0);
    assert.equal(kept.relations['rel.npc.maretta.attitude.pc'], undefined);
    assert.ok(!kept.memories.some((m) => /countersigned/.test(m.text)));
    chat.push({ is_user: true, is_system: false, name: 'Alaric', mes: '"Is Maretta still here?"', extra: {} });
    const ctx = prepareGeneration(chat, content, { type: 'normal' }).context.text;
    assert.doesNotMatch(ctx, /countersigned|whole purse|rival for her purse/);
    assert.match(cardOf(ctx, 'Maretta'), /boar tusk on a neck cord/, 'what the kept branch established is still there');
});
