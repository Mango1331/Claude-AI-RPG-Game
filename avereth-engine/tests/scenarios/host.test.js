// SillyTavern behaviour on a simulated chat array (same message shape ST stores): swipes keep their own facts,
// regenerations reuse the same dice, deletions and edits keep the state consistent, commands never reach the LLM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadContent, FIRST_MESSAGE } from '../helpers.js';
import { prepareGeneration, processReply, onEdited, foldChat, ensureCampaign } from '../../src/host.js';
import { hash32 } from '../../src/util.js';

const content = await loadContent();

function aiMsg(mes) {
    return { is_user: false, is_system: false, name: 'RPG', mes, swipe_id: 0, swipes: [mes], swipe_info: [{ extra: {} }], extra: {} };
}
function userMsg(mes) {
    return { is_user: true, is_system: false, name: 'Alaric', mes, extra: {} };
}
/** ST: swipe right on the last message -> new swipe; `extra` is copied from the previous swipe (not cleared). */
function newSwipe(msg, mes) {
    msg.swipes.push(mes);
    msg.swipe_info.push({ extra: structuredClone(msg.extra) });
    msg.swipe_id = msg.swipes.length - 1;
    msg.mes = mes;
}
/** ST syncSwipeToMes: switch to an existing swipe. */
function selectSwipe(msg, id) {
    msg.swipe_id = id;
    msg.mes = msg.swipes[id];
    msg.extra = structuredClone(msg.swipe_info[id].extra);
}
function play(chat, input, reply) {
    chat.push(userMsg(input));
    const gen = prepareGeneration(chat, content, { type: 'normal' });
    if (reply !== undefined) {
        chat.push(aiMsg(reply));
        processReply(chat, chat.length - 1, content);
    }
    return gen;
}
function newChat() {
    const chat = [aiMsg(FIRST_MESSAGE)];
    assert.equal(processReply(chat, 0, content, { seed: 4242 }).changed, true, 'campaign starts on the greeting');
    play(chat, 'Ranger', 'CLASS SELECTED <avereth>{}</avereth>');
    play(chat, 'Aimed Shot + Power Shot', 'CHARACTER CREATION COMPLETE <avereth>{}</avereth>');
    return chat;
}

test('the greeting starts the campaign; the report is stripped from the visible reply', () => {
    const chat = newChat();
    assert.equal(foldChat(chat).state.scene.location, 'loc.tidecross');
    play(chat, 'I walk to the gate.', 'You reach the gate.\n<avereth>{"time":20,"place":"south gate"}</avereth>');
    const last = chat.at(-1);
    assert.equal(last.mes, 'You reach the gate.');
    assert.equal(last.swipes[0], 'You reach the gate.');
    assert.equal(foldChat(chat).state.scene.place, 'south gate');
    assert.equal(foldChat(chat).state.clock.minute, 540 + 20);
});

test('swipes: each alternative reply owns its facts; switching swipes switches the world', () => {
    const chat = newChat();
    play(chat, 'I look around the market.', 'A fishmonger shouts.\n<avereth>{"new":[{"ref":"fishmonger","name":"Nell","kind":"npc","desc":["fishmonger"]}]}</avereth>');
    const reply = chat.at(-1);
    assert.ok(foldChat(chat).state.entities['npc.nell']);
    // regenerate as a new swipe: ST copies the old swipe's extra into the new swipe before generating
    newSwipe(reply, 'A juggler performs.\n<avereth>{"new":[{"ref":"juggler","name":"Pip","kind":"npc","desc":["juggler"]}]}</avereth>');
    let st = foldChat(chat).state;
    assert.ok(!st.entities['npc.nell'], 'stale copy of swipe 0 is ignored before swipe 1 is processed');
    processReply(chat, chat.length - 1, content);
    st = foldChat(chat).state;
    assert.ok(st.entities['npc.pip'] && !st.entities['npc.nell']);
    selectSwipe(reply, 0);
    st = foldChat(chat).state;
    assert.ok(st.entities['npc.nell'] && !st.entities['npc.pip'], 'swiping back restores swipe 0');
});

test('regenerating a combat turn re-uses the same resolution: dice are never rerolled', () => {
    const chat = newChat();
    play(chat, 'I spot a boar.', 'A boar roots in the ferns.\n<avereth>{"new":[{"ref":"boar","kind":"creature","species":"boar","band":"MEDIUM"}],"aware":[{"who":"boar","level":"unaware"}]}</avereth>');
    chat.push(userMsg('I Power Shot the boar'));
    const first = prepareGeneration(chat, content, { type: 'normal' });
    const recordBefore = structuredClone(chat.at(-1).extra.avereth);
    const second = prepareGeneration(chat, content, { type: 'regenerate' });
    assert.equal(first.context.text, second.context.text);
    assert.deepEqual(chat.at(-1).extra.avereth.events, recordBefore.events);
    // even recomputing from scratch gives the same rolls (counter-based RNG)
    delete chat.at(-1).extra.avereth;
    const third = prepareGeneration(chat, content, { type: 'regenerate' });
    assert.equal(third.context.text, first.context.text);
    assert.match(first.context.text, /RESOLVED THIS TURN[\s\S]*Power Shot/);
});

test('editing the latest player message before generation re-resolves it; older history stays fixed', () => {
    const chat = newChat();
    chat.push(userMsg('I sneak along the hedge'));
    prepareGeneration(chat, content, { type: 'normal' });
    assert.ok(foldChat(chat).state.scene.concealed.includes('pc'));
    chat.at(-1).mes = 'I walk openly along the road';
    const r = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(r.dirty, true);
    assert.equal(chat.at(-1).extra.avereth.input_hash, hash32('I walk openly along the road'));
    assert.ok(!foldChat(chat).state.scene.concealed.includes('pc'));
});

test('deleting messages removes their facts; an edited reply keeps its facts', () => {
    const chat = newChat();
    play(chat, 'I enter the inn.', 'Warm light.\n<avereth>{"new":[{"ref":"innkeeper","name":"Mara","kind":"npc","desc":["innkeeper"]}]}</avereth>');
    assert.ok(foldChat(chat).state.entities['npc.mara']);
    chat.at(-1).mes = 'Warm light, and a tired innkeeper.';
    assert.ok(!foldChat(chat).state.entities['npc.mara'], 'text changed: not applied until re-stamped');
    assert.deepEqual(onEdited(chat, chat.length - 1, content), { changed: true });
    assert.ok(foldChat(chat).state.entities['npc.mara'], 'MESSAGE_EDITED keeps the established facts');
    chat.splice(chat.length - 2, 2);
    const { state, errors } = foldChat(chat);
    assert.ok(!state.entities['npc.mara']);
    assert.deepEqual(errors, []);
});

test('retcon: an edited reply with a new report block replaces its facts; {} drops them', () => {
    const chat = newChat();
    play(chat, 'I enter the inn.', 'Warm light.\n<avereth>{"new":[{"ref":"innkeeper","name":"Mara","kind":"npc","desc":["innkeeper"]}]}</avereth>');
    const id = chat.length - 1;
    chat[id].mes = 'Warm light. A cook named Oda nods.\n<avereth>{"new":[{"ref":"cook","name":"Oda","kind":"npc","desc":["cook"]}]}</avereth>';
    assert.deepEqual(onEdited(chat, id, content), { changed: true, text: true });
    assert.equal(chat[id].mes, 'Warm light. A cook named Oda nods.', 'report stripped again');
    let st = foldChat(chat).state;
    assert.ok(st.entities['npc.oda'] && !st.entities['npc.mara']);
    chat[id].mes = 'Warm light.\n<avereth>{}</avereth>';
    onEdited(chat, id, content);
    st = foldChat(chat).state;
    assert.ok(!st.entities['npc.oda'] && !st.entities['npc.mara'], '{} retcons the facts away');
    assert.equal(chat[id].extra.avereth.retcon, true);
});

test('retcon is limited to the latest reply: an older reply keeps its facts until the later turns are deleted', () => {
    const chat = newChat();
    play(chat, 'I enter the inn.', 'Warm light.\n<avereth>{"new":[{"ref":"innkeeper","name":"Mara","kind":"npc","desc":["innkeeper"]}]}</avereth>');
    const id = chat.length - 1;
    play(chat, 'I greet Mara.', 'She nods.\n<avereth>{"attitude":[{"who":"Mara","delta":5,"why":"polite"}]}</avereth>');
    chat[id].mes = 'Warm light.\n<avereth>{}</avereth>';
    const r = onEdited(chat, id, content);
    assert.equal(r.changed, true);
    assert.match(r.refused, /latest reply/);
    const { state, errors } = foldChat(chat);
    assert.ok(state.entities['npc.mara'], 'the older reply keeps its facts');
    assert.equal(state.relations['rel.npc.mara.attitude.pc'].value, 5, 'later turns stay consistent');
    assert.deepEqual(errors, []);
    chat.splice(id + 1); // delete the later turn, then save the edit again
    assert.deepEqual(onEdited(chat, id, content), { changed: true, text: true });
    assert.ok(!foldChat(chat).state.entities['npc.mara'], 'now the retcon applies');
});

test('# commands are answered by the engine without an LLM call, once', () => {
    const chat = newChat();
    chat.push(userMsg('#status #bag'));
    const r = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(r.action, 'panels');
    assert.match(r.panels[0], /\[SYSTEM \/\/ STATUS\]/);
    chat[r.index].is_system = true; // index.js hides the command line from future prompts
    chat.push({ is_user: false, is_system: true, name: 'Avereth System', mes: r.panels.join('\n\n'), extra: {} });
    assert.equal(prepareGeneration(chat, content, { type: 'regenerate' }).action, 'abort', 'no LLM reply to a command, even hidden');
    assert.equal(foldChat(chat).state.turn, 2, 'a command consumes no story turn');
    chat.push(userMsg('I walk on.'));
    assert.equal(prepareGeneration(chat, content, { type: 'normal' }).action, 'context', 'the next story message works normally');
});

test('#system goes to the LLM in System-only mode; its answer creates no facts', () => {
    const chat = newChat();
    chat.push(userMsg('#system How is my Crit Chance calculated?'));
    const r = prepareGeneration(chat, content, { type: 'normal' });
    assert.equal(r.action, 'context');
    assert.match(r.context.text, /SYSTEM QUERY/);
    chat.push(aiMsg('Crit = 5% + PER/10 = 5.6%. <avereth>{"new":[{"ref":"ghost","kind":"npc"}]}</avereth>'));
    processReply(chat, chat.length - 1, content);
    assert.equal(chat.at(-1).mes, 'Crit = 5% + PER/10 = 5.6%.');
    assert.ok(!Object.keys(foldChat(chat).state.entities).some((id) => id.includes('ghost')));
});

test('quiet/impersonate generations get no engine block; a chat played without the engine is left alone', () => {
    const chat = newChat();
    chat.push(userMsg('hello'));
    assert.equal(prepareGeneration(chat, content, { type: 'quiet' }).action, 'clear');
    const legacy = [aiMsg(FIRST_MESSAGE), userMsg('a'), aiMsg('b'), userMsg('c')];
    assert.equal(ensureCampaign(legacy, content, { seed: 1 }), 'legacy');
    assert.equal(prepareGeneration(legacy, content, { type: 'normal' }).action, 'none');
});
