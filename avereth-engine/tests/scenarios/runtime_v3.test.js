// Runtime V3 prompt side: the retired tracker blocks leave the prompt (history projection, new replies), the history
// window is bounded, the fact-report schema and Alaric's line follow the turn, and chats saved before V3 still load.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, Game, FIRST_MESSAGE, readJson } from '../helpers.js';
import { prepareGeneration, processReply, foldChat, projectPromptHistory } from '../../src/host.js';
import { reportKeys } from '../../src/context.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();

const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });
const MEGUMIN = '\n<Blocks>\n<World_State>**Loc:** somewhere</World_State>\n<Character_Sheet>HP: 71/80 | Coin: 9 Gold</Character_Sheet>\n<New_NPC name="Kest">**Background:** invented</New_NPC>\n</Blocks>';

test('prompt projection: tracker blocks leave every earlier reply, only the last exchanges stay, the saved chat is untouched', () => {
    const chat = [ai(`Greeting.${MEGUMIN}`)];
    for (let i = 1; i <= 7; i++) chat.push(user(`input ${i}`), ai(`reply ${i}${i % 2 ? MEGUMIN : ''}`));
    const saved = structuredClone(chat);
    // SillyTavern hands the interceptor coreChat: a new array of shallow copies
    const core = chat.map((m) => ({ ...m }));
    const r = projectPromptHistory(core, { keepTurns: 4 });
    assert.deepEqual(chat, saved, 'the saved chat, its swipes and displays are not changed');
    assert.deepEqual(core.map((m) => m.mes), ['input 4', 'reply 4', 'input 5', 'reply 5', 'input 6', 'reply 6', 'input 7', 'reply 7']);
    assert.equal(r.removed, 7, 'greeting + three older exchanges left out');
    assert.equal(r.stripped, 5, 'the greeting and replies 1, 3, 5, 7 carried tracker blocks');
    assert.ok(core.every((m) => !/<Blocks>|World_State|Character_Sheet|New_NPC/.test(m.mes)));
    // 0 keeps the whole history (only the blocks go)
    const all = chat.map((m) => ({ ...m }));
    projectPromptHistory(all, { keepTurns: 0 });
    assert.equal(all.length, chat.length);
    assert.equal(all[0].mes, 'Greeting.');
});

test('a new reply that still writes tracker blocks: removed from the text, never state, named for the narrator', () => {
    const g = new Game(content).ranger();
    g.input('I look around.');
    const r = g.reply(`A quiet road.\n<avereth>{}</avereth>${MEGUMIN}`);
    assert.equal(r.clean, 'A quiet road.');
    assert.equal(g.state.entities.pc.sheet.hp, 80);
    assert.equal(g.state.entities.pc.sheet.coin_cp, 50);
    assert.ok(!g.state.entities['npc.kest'], 'a dossier names no person into the world');
    assert.ok(r.corrections.some((c) => /tracker blocks .* are retired and were removed/.test(c)));
});

test('a chat saved before Runtime V3 (replies with Megumin blocks) loads, folds and continues; its blocks never become truth', async () => {
    const fx = await readJson('tests/testrun_v4/fixture.json');
    const chat = [ai(fx.greeting)];
    processReply(chat, 0, content, { seed: fx.seed });
    // the old engine kept the tracker blocks in the stored text
    for (const t of fx.turns.slice(0, 13)) {
        chat.push(user(t.input));
        prepareGeneration(chat, content, { type: 'normal' });
        chat.push(ai(t.reply));
        processReply(chat, chat.length - 1, content, { stripTrackers: false, hud: 'off' });
    }
    assert.ok(chat.filter((m) => /<World_State>/.test(m.mes)).length >= 8, 'the saved replies still carry their blocks');
    const { state, errors } = foldChat(chat);
    assert.deepEqual(errors, []);
    assert.deepEqual(validateState(state, content), []);
    // the blocks said HP 71/80 and "3 Silver"; the engine's state is its own
    assert.equal(state.entities.pc.sheet.hp, 77);
    assert.equal(state.entities.pc.sheet.coin_cp, 30);
    // a new turn under V3: the prompt copy loses the old blocks, the new reply gets the HUD
    chat.push(user(fx.turns[13].input));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'context');
    const core = chat.map((m) => ({ ...m }));
    projectPromptHistory(core, { keepTurns: 4 });
    assert.ok(core.every((m) => !/<World_State>|<Character_Sheet>|<New_NPC>|<NPC_Update>/.test(m.mes)));
    chat.push(ai(fx.turns[13].reply));
    processReply(chat, chat.length - 1, content);
    assert.doesNotMatch(chat.at(-1).mes, /<World_State>/);
    assert.match(chat.at(-1).extra.avereth.hud, /HP 77\/80/);
});

test('the fact-report schema follows the turn: {} in creation, the combat keys in a fight, quests/recover/check only with a cause', () => {
    const g = new Game(content);
    g.input('Ranger');
    assert.match(g.context().text, /FACT REPORT: end the reply with <avereth>\{\}<\/avereth> \(character creation/);
    g.reply({});
    g.turn('Aimed Shot + Power Shot');
    g.input('I walk along the road.');
    let text = g.context().text;
    const listed = (t) => (t.split('FACT REPORT: ')[1] || '').split('\n')[1].split(' | ').map((x) => x.split(':')[0]);
    assert.deepEqual(listed(text).slice(0, 3), ['time', 'place', 'location']);
    assert.ok(!listed(text).includes('quests') && !listed(text).includes('recover') && !listed(text).includes('intent'), listed(text).join(','));
    assert.ok(listed(text).includes('check'), 'an ordinary story turn has a CHECK DIE');
    g.reply({ new: [{ ref: 'bear', kind: 'creature', species: 'bear', band: 'LONG' }] });
    g.input('I Power Shot the bear');
    text = g.context().text;
    assert.deepEqual(listed(text), ['time', 'new', 'enter', 'leave', 'concealed', 'facts', 'memory', 'combat', 'intent']);
    assert.ok(!/Example:/.test(text.split('FACT REPORT: ')[1]));
    // the parser still takes every key: the list only saves prompt tokens
    const keys = reportKeys(g.state, content, { outcome: g.state.last.outcome, scan: 'the Guild quest board' });
    assert.ok(!keys.includes('quests'), 'during a fight');
});

test('Alaric\'s line follows the turn: checks and visible gear always, combat values in a fight, purse only for trade or loot', () => {
    const g = new Game(content).ranger();
    g.input('"Good morning," I say to the carter.');
    let line = g.context().text.split('\n\n')[1];
    assert.match(line, /^Alaric — Level 1 Ranger, Power Rank F \| HP 80\/80 \(unhurt\) MP 60\/60 STA 100\/100/);
    assert.match(line, /STR 5 VIT 5 AGI 6 INT 5 PER 6 WIL 5 \| Equipped: .*Starter Shortbow.* \| Arrows 20$/);
    assert.doesNotMatch(line, /Carried|Coin|ATK|Skills/);
    g.reply({});
    g.input('I buy bread and pay two copper.');
    line = g.context().text.split('\n\n')[1];
    assert.match(line, /Carried: Small Pouch \| Coin 5 Silver/);
    g.reply({ facts: [{ s: 'pc', p: 'guild_rank', o: 'Novice' }] });
    g.reply({ new: [{ ref: 'wolf', kind: 'creature', species: 'wolf', band: 'LONG' }] });
    g.input('I Aimed Shot the wolf');
    line = g.context().text.split('\n\n')[1];
    assert.match(line, /Power Rank F, Guild Novice/);
    assert.match(line, /\| ATK 6 MATK 0 DEF 3 MDEF 4 \| Init 9 \|/);
    assert.match(line, /Skills: Basic Attack P1, Aimed Shot P1, Power Shot P1/);
});

test('the engine block of an ordinary turn stays small with the minimal NPC records and the situational schema', () => {
    const g = new Game(content).ranger();
    g.turn('I walk to the Guild hall.', { place: 'Guild hall', new: [{ ref: 'Serah', name: 'Serah', kind: 'npc', desc: ['guild clerk'], traits: 'pale eyes, ink-smudged jaw' }], facts: [{ s: 'Serah', p: 'occupation', o: 'Guild clerk' }] });
    g.input('"I want to register," I tell Serah.');
    const c = g.context();
    assert.ok(c.tokens < 1400, `${c.tokens} tokens`);
});

test('RELEVANT carries no card facts (role, look, voice, agenda, Guild Rank) and at most three of the player\'s old lines', () => {
    const g = new Game(content).ranger();
    g.turn('I walk to the Guild hall.', {
        place: 'Guild hall', new: [{ ref: 'Kest', name: 'Kest', kind: 'npc', desc: ['veteran'] }],
        facts: [{ s: 'Kest', p: 'occupation', o: 'veteran adventurer' }, { s: 'Kest', p: 'agenda', o: 'get the Greyhowl posting taken down' }, { s: 'Kest', p: 'voice', o: 'low rasp' }, { s: 'pc', p: 'guild_rank', o: 'Novice' }, { s: 'Guild hall', p: 'owner', o: 'the Lumen Guild' }],
    });
    g.turn('I leave.', { place: 'harbour road', leave: ['Kest'] });
    for (let i = 0; i < 8; i++) g.turn(`I walk the harbour, stretch ${i}.`, { time: 30 });
    g.input('I think about the Guild hall.');
    const rel = (g.context().text.split('RELEVANT (retrieved from the campaign record):\n')[1] || '').split('\n\n')[0];
    assert.doesNotMatch(rel, /occupation|agenda|voice|guild rank/i);
    assert.ok(rel.split('\n').filter((l) => /: Alaric: "/.test(l)).length <= 3, rel);
});

test('a fight saved mid-round before Combat V3 folds and continues: old Hit/Crit fields are ignored, an old Hit penalty keeps its strength', () => {
    const chat = [ai(FIRST_MESSAGE)];
    processReply(chat, 0, content, { seed: 11 });
    const play = (input, reply) => {
        chat.push(user(input));
        prepareGeneration(chat, content, { type: 'normal' });
        chat.push(ai(reply));
        processReply(chat, chat.length - 1, content);
    };
    play('Ranger', 'CLASS SELECTED <avereth>{}</avereth>');
    play('Quickstep and Aimed Shot', 'DONE <avereth>{}</avereth>');
    play('I look around the clearing.', 'A bear rises from the brush.\n<avereth>{"new":[{"ref":"bear","kind":"creature","species":"bear","band":"SHORT"}],"aware":[{"who":"bear","level":"aware"}]}</avereth>');
    play('I Aimed Shot the bear', 'The arrow bites.\n<avereth>{}</avereth>');
    assert.ok(foldChat(chat).state.encounter, 'the bear fight is running');
    // turn the stored snapshot into what Combat V2 saved: Hit/Crit in the profiles, a MISS record, and Alaric's
    // Quickstep as the old Hit penalty (15 pp), sourced from the bear's side so it is still up when the bear strikes
    const snap = chat.map((m) => m.extra?.avereth?.events || []).flat().filter((e) => e.d?.encounter).at(-1).d.encounter;
    for (const c of Object.values(snap.combatants)) Object.assign(c.fixed, { hit: 75, crit: 5 });
    snap.log.push({ actor: 'mon.bear', kind: 'attack', target: 'pc', strikes: [{ target: 'pc', hit: { chance: 63, roll: 89, success: false }, final: 0 }] });
    snap.combatants.pc.current.effects.push({ kind: 'incoming_hit_penalty', pp: 15, source: 'mon.bear', expires: 'start_of_source_next_turn', name: 'Quickstep', round: 99 });
    const { state, errors } = foldChat(chat);
    assert.deepEqual(errors, []);
    assert.deepEqual(validateState(state, content), []);
    // the next exchange resolves under V3: Alaric's shot lands without a Hit roll, the bear's blow is reduced by 20%
    const before = state.encounter.log.length;
    chat.push(user('I Aimed Shot the bear'));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'context');
    const after = foldChat(chat).state;
    const fresh = (after.encounter || after.last_encounter)?.log?.slice(before) || [];
    const [shot, blow] = [fresh.find((r) => r.actor === 'pc' && r.kind === 'attack'), fresh.find((r) => r.actor === 'mon.bear' && r.kind === 'attack')];
    assert.ok(shot && blow, JSON.stringify(fresh.map((r) => [r.actor, r.kind])));
    for (const s of [...shot.strikes, ...blow.strikes]) assert.ok(!('hit' in s) && !s.crit && s.final > 0, JSON.stringify(s));
    assert.deepEqual(blow.strikes[0].reduced, ['Quickstep -20%']);
    assert.equal(blow.strikes[0].final, Math.round(11 * blow.strikes[0].variance * 0.8)); // bear ATK 14 - DEF 3
    assert.match(gen.context.text, /RESOLVED THIS TURN/);
    assert.doesNotMatch(gen.context.text, /Hit chance|hit \d+%|MISS \(|d100 \d+ vs/);
});

test('Test-5 scenario: Kest\'s promise leaves the history window and still reaches the narrator, with his stance and agenda', () => {
    const chat = [ai(FIRST_MESSAGE)];
    processReply(chat, 0, content, { seed: 5 });
    const reply = (report, prose) => {
        chat.push(ai(`${prose}\n<avereth>${JSON.stringify(report)}</avereth>`));
        processReply(chat, chat.length - 1, content);
    };
    /** The request as the extension builds it: the engine block and the history window (4 player messages). */
    const ask = (input) => {
        chat.push(user(input));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        const core = chat.map((m) => ({ ...m }));
        projectPromptHistory(core, { keepTurns: 4 });
        return { engine: gen.context.text, history: core.map((m) => m.mes).join('\n'), users: core.filter((m) => m.is_user).length };
    };
    const play = (input, report = {}, prose = 'The narration continues.') => {
        ask(input);
        reply(report, prose);
    };
    play('Ranger', {}, 'CLASS SELECTED');
    play('Aimed Shot + Power Shot', {}, 'CHARACTER CREATION COMPLETE');
    play('I walk into town to the Guild hall.', {
        time: 30, place: 'Guild hall, Novice board',
        new: [{ ref: 'Kest', name: 'Kest', kind: 'npc', desc: ['veteran adventurer'], traits: 'one-eyed, grey braid', band: 'SHORT' }],
        facts: [{ s: 'Kest', p: 'occupation', o: 'veteran adventurer' }, { s: 'Kest', p: 'voice', o: 'low rasp' }],
    }, 'A one-eyed man with a grey braid leans by the board.');
    // the meaningful exchange: a distinctive line, a change of stance, an agenda and a promise worth remembering
    play('"What about the Greyhowl posting?" I ask Kest.', {
        time: 5, attitude: [{ who: 'Kest', delta: -15, why: 'a green Novice eyeing the Greyhowl bill' }],
        facts: [{ s: 'Kest', p: 'agenda', o: 'get the Greyhowl posting taken down' }],
        memory: [{ text: 'Kest promised Alaric the first drink if he brings back a Greyhowl fang', who: ['Kest', 'pc'], imp: 7 }],
    }, 'Kest snorts. "Bring me a Greyhowl fang and the first drink is mine, Novice."');
    // six turns elsewhere
    play('I leave the hall and walk down to the harbour.', { time: 20, place: 'harbour front', leave: ['Kest'] });
    for (const t of ['I buy bread at a stall.', 'I watch the fishing boats.', 'I ask a dock hand about work.', 'I walk the sea wall.', 'I rest on a bollard.']) play(t, { time: 30 });
    // Alaric refers to it while Kest is elsewhere: the line itself is gone from the history, the promise is on his card
    let p = ask('I think about what Kest promised me.');
    assert.equal(p.users, 4);
    assert.doesNotMatch(p.history, /first drink is mine/);
    const named = (p.engine.split('NAMED, NOT PRESENT')[1] || '').split('\n\n')[0];
    assert.match(named, /Kest — person, veteran adventurer; one-eyed, grey braid; voice: low rasp; NOT PRESENT/);
    assert.match(named, /last meaningful: \[Day 1, [\d:]+\] Kest promised the stranger the first drink if he brings back a Greyhowl fang/);
    reply({}, 'The gulls wheel over the harbour.');
    // back at the Guild: the same record, now as a present person
    play('I walk back to the Guild hall.', { time: 20, place: 'Guild hall, Novice board', enter: ['Kest'] }, 'Kest is still by the board.');
    p = ask('"Kest. About that drink for a Greyhowl fang."');
    assert.doesNotMatch(p.history, /first drink is mine/);
    const card = (p.engine.split('PRESENT (each NPC knows ONLY what its card lists):\n')[1] || '').split('\n\n')[0];
    assert.match(card, /^• Kest — person, veteran adventurer; one-eyed, grey braid; voice: low rasp$/m);
    assert.match(card, /toward Alaric: neutral \(-15\) \(last change: a green Novice eyeing the Greyhowl bill\)/);
    assert.match(card, /last meaningful: [^\n]*promised the stranger the first drink if he brings back a Greyhowl fang/);
    assert.match(card, /agenda: get the Greyhowl posting taken down/);
});
