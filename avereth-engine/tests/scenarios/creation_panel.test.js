// Pre-Test-5 diagnostic run (Qwen3.8-27B, reasoning low): after "Warrior" the narrator presented an invented Skill pool
// (Cleave, Iron Guard, War Step ...) although the engine block listed the real one; "Cleave + Iron Guard" was rightly
// rejected, the narrator still wrote "CHARACTER CREATION COMPLETE", and every later story message was silently read as
// another failed Skill choice: no Starter Gear, HP 80/85, story time frozen. Character creation is a menu, so the engine
// now answers it itself with a System panel and no narrator call, like a # command. These are the run's own inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent } from '../helpers.js';
import { prepareGeneration, processReply, foldChat } from '../../src/host.js';
import { characterRows } from '../../src/hud.js';
import { validateState } from '../../src/validate.js';

const content = await loadContent();
const GREETING = 'SYSTEM INITIALIZATION COMPLETE\n`Location: Public roadside verge outside Ashbridge, Duskreach`\n`CHARACTER CREATION — STEP 1/2`';
const ai = (mes) => ({ is_user: false, is_system: false, mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} });
const user = (mes) => ({ is_user: true, is_system: false, mes, extra: {} });

function session() {
    const chat = [ai(GREETING)];
    processReply(chat, 0, content, { seed: 820931032 });
    /** One player message as the extension handles it: a System panel (the line is hidden from prompts) or a prompt. */
    const send = (input) => {
        chat.push(user(input));
        const gen = prepareGeneration(chat, content, { type: 'normal' });
        if (gen.action === 'panels') chat.at(-1).is_system = true;
        return gen;
    };
    return { chat, send };
}

test('Warrior creation from the diagnostic run: the System shows the real pool, rejects invented Skills visibly, then equips the kit', () => {
    const { chat, send } = session();
    let gen = send('Warrior');
    assert.equal(gen.action, 'panels', 'no narrator call for a creation step');
    let panel = gen.panels.join('\n');
    assert.match(panel, /CLASS SELECTED: WARRIOR — favored STR \+1, VIT \+1/);
    for (const name of ['Heavy Slash', 'Guard', 'Power Strike', 'Quick Slash', 'Charge', 'Deflect']) assert.match(panel, new RegExp(`^- ${name} \\[`, 'm'));
    assert.doesNotMatch(panel, /Cleave|Iron Guard|War Step|Shield Bash|Battle Cry/);
    assert.match(panel, /Starter Gear, equipped when Step 2 is complete: Starter Longsword \[F\] \(ATK 6\), Starter Heavy Armor \[F\] \(DEF 6, MDEF 2\)/);
    // the invented pool's pick: rejected with the reason, what was recognized, and the real pool again
    gen = send('Cleave + Iron Guard');
    panel = gen.panels.join('\n');
    assert.match(panel, /Not a valid Skill choice: Select exactly 2 distinct Skills\. Recognized: Guard\./);
    assert.match(panel, /^- Heavy Slash \[/m);
    // a story message during creation reaches no narrator: the player is told what is missing, nothing is frozen silently
    gen = send('*i Walk towards the gate of the city*');
    assert.equal(gen.action, 'panels');
    assert.match(gen.panels.join('\n'), /Not a valid Skill choice: no Skill from the pool named\.[\s\S]*The story begins once character creation is complete\./);
    assert.equal(foldChat(chat).state.mode, 'creation');
    // a real choice completes creation: Skills, Starter Gear and full resources
    gen = send('Heavy Slash + Guard');
    panel = gen.panels.join('\n');
    assert.match(panel, /\[SYSTEM \/\/ CHARACTER CREATION COMPLETE\]\nSKILLS SELECTED: Heavy Slash \(P1\), Guard \(P1\)\nSTARTER GEAR EQUIPPED: Starter Longsword \[F\] \(ATK 6\), Starter Heavy Armor \[F\] \(DEF 6, MDEF 2\)/);
    assert.match(panel, /HP 85\/85 \| MP 60\/60 \| STA 100\/100/);
    assert.match(panel, /ATK 6 \| MATK 0 \| DEF 7 \(base 1\) \| MDEF 3 \(base 1\)/);
    const { state, errors } = foldChat(chat);
    assert.deepEqual(errors, []);
    assert.deepEqual(validateState(state, content), []);
    assert.equal(state.mode, 'story');
    const rows = Object.fromEntries(characterRows(state, content));
    assert.equal(rows.Resources, 'HP 85/85 (unhurt) · MP 60/60 · STA 100/100 · XP 0/100');
    assert.equal(rows.Equipped, "Simple Traveler's Clothes · Starter Longsword · Starter Heavy Armor");
    assert.equal(rows.Skills, 'Basic Attack P1 · Heavy Slash P1 · Guard P1');
    // #equipment, as the player checked it
    gen = send('#equipment');
    assert.match(gen.panels.join('\n'), /Starter Longsword \[F\] — ATK 6[\s\S]*Starter Heavy Armor \[F\] — DEF 6, MDEF 2[\s\S]*Totals from Gear: ATK 6 \| MATK 0 \| DEF \+6 \| MDEF \+2/);
});

test('the first story message after creation goes to the narrator with the finished Warrior and a closed creation menu', () => {
    const { chat, send } = session();
    for (const input of ['Warrior', 'Heavy Slash + Guard']) send(input);
    let gen = send('*i Walk towards the gate of the city*');
    assert.equal(gen.action, 'context');
    const text = gen.context.text;
    assert.match(text, /mode: story/);
    assert.match(text, /Alaric — Level 1 Warrior, Power Rank F \| HP 85\/85 \(unhurt\) MP 60\/60 STA 100\/100/);
    assert.match(text, /Equipped: Simple Traveler's Clothes, Starter Longsword, Starter Heavy Armor/);
    assert.match(text, /CHARACTER CREATION is complete \(the System handled it; its menu at the start of the chat is closed\)/);
    assert.doesNotMatch(text, /CHARACTER CREATION — STEP|character creation: nothing to report/);
    chat.push(ai('The road runs straight to the gate.\n<avereth>{"time":20,"place":"Ashbridge west gate"}</avereth>'));
    processReply(chat, chat.length - 1, content);
    assert.match(chat.at(-1).extra.avereth.hud, /HP 85\/85 \(unhurt\)/);
    assert.match(chat.at(-1).extra.avereth.hud, /Starter Longsword · Starter Heavy Armor/);
    // only that first story turn carries the note
    gen = send('*I nod to the guard.*');
    assert.doesNotMatch(gen.context.text, /CHARACTER CREATION is complete/);
});

test('a chat left stuck in creation by an older version recovers: the next message gets the System panel, a real choice completes it', () => {
    // the diagnostic chat: the narrator answered every creation message and moved the story on; the engine stayed in Step 2
    const chat = [ai(GREETING)];
    processReply(chat, 0, content, { seed: 820931032 });
    const old = [['Warrior', 'BASE CLASS: WARRIOR — CONFIRMED. Choose 2: Cleave, Iron Guard, War Step, Shield Bash, Battle Cry.'],
        ['Cleave + Iron Guard', 'CHARACTER CREATION COMPLETE. Skills: Cleave | Iron Guard. Five silver. No weapon.'],
        ['*i Walk towards the gate of the city*', 'The road holds. A guard with a stylus waits at the gate.']];
    for (const [input, reply] of old) {
        chat.push(user(input));
        prepareGeneration(chat, content, { type: 'normal' }); // the older version then called the narrator anyway
        chat.push(ai(reply));
        processReply(chat, chat.length - 1, content);
    }
    assert.equal(foldChat(chat).state.creation.step, 2);
    chat.push(user('Alaric with no family name im here to register with the adventurers guild *i say smiling politely*'));
    let gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(gen.action, 'panels');
    assert.match(gen.panels.join('\n'), /CHARACTER CREATION — STEP 2\/2[\s\S]*^- Power Strike \[/m);
    chat.at(-1).is_system = true;
    chat.push(user('Power Strike + Deflect'));
    gen = prepareGeneration(chat, content, { type: 'normal' });
    assert.match(gen.panels.join('\n'), /CHARACTER CREATION COMPLETE[\s\S]*HP 85\/85/);
    const { state } = foldChat(chat);
    assert.equal(state.mode, 'story');
    assert.ok(Object.values(state.entities.pc.sheet.equipment).includes('starter_longsword'));
});
