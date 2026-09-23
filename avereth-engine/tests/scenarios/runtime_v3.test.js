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
