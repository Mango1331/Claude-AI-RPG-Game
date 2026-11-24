import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {loadProductContent} from '../helpers.js';
import {applyWorld} from '../../src/v4/world.js';
import {applyEvent} from '../../src/state.js';
import {selfIntro, turnContext} from '../../src/engine.js';
import {foldChat} from '../../src/host.js';
import {worldRows} from '../../src/hud.js';
import {runCommands} from '../../src/commands.js';
import {PC_NAME_FACT, pcIdentityFor} from '../../src/knowledge.js';

const original = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/continuity211_lia_b2.json.gz', import.meta.url))));
const content = await loadProductContent();
const lia = 'npc.lia_halloran', dann = 'npc.dann';
function listeners(input, prepare = () => {}) {
    const state = structuredClone(original.state);
    delete state.knowledge[dann][PC_NAME_FACT];
    state.last.input = input;
    prepare(state);
    const heard = [];
    selfIntro(state, event => { applyEvent(state, event); heard.push(event.d.who); });
    return heard;
}

test('Natural B2: Lia hears the personal introduction addressed to her by first name, once in the folded world', () => {
    const before = structuredClone(original.state);
    original.events.forEach(e => applyEvent(before, e));
    assert.equal(pcIdentityFor(before, lia).level, 'seen');
    assert.equal(pcIdentityFor(before, dann).level, 'name');
    const result = applyWorld(before, content, original.raw, {msg:original.msg, prose:original.prose});
    const learned = result.events.filter(e => e.t === 'knowledge.gained' && e.d.about === PC_NAME_FACT);
    assert.deepEqual(learned.map(e => [e.d.who,e.d.source]), [[lia,'told:pc']]);
    const loaded = JSON.parse(JSON.stringify(before));
    result.events.forEach(e => applyEvent(loaded, e));
    assert.equal(pcIdentityFor(loaded, lia).level, 'name');
    const repeat = [];
    selfIntro(loaded,e => repeat.push(e));
    assert.deepEqual(repeat, []);
    assert.deepEqual(before.scene.present, loaded.scene.present);
    const focus = turnContext(loaded, content, {input:'Lia, which road?',budget:1600}).text;
    assert.match(focus, /Lia Halloran[^\n]*[\s\S]{0,245}knows him by name/);
    assert.match(Object.fromEntries(worldRows(loaded,content)).Present, /Lia Halloran/);
});

test('Only actual addressees hear a name: a reported subject, an absent person, ambiguous call names and non-witnesses', () => {
    assert.deepEqual(listeners("Lia, I'm Alaric. Dann can tell you about the cart."), [lia]);
    assert.deepEqual(listeners("I'm Alaric. Lia knows the road."), []);
    for (const change of [
        s => {s.scene.present=s.scene.present.filter(id=>id!==lia);},
        s => {s.scene.awareness[lia]='unaware';},
        s => {s.scene.concealed.push('pc');},
        s => {s.entities[lia].status='dead';},
        s => {s.entities['npc.lia_bell']={...s.entities[lia],id:'npc.lia_bell',name:'Lia Bell'};s.scene.present.push('npc.lia_bell');},
    ]) assert.deepEqual(listeners("Lia, I'm Alaric.", change), []);
    assert.deepEqual(listeners("I hear that his name is Alaric. Lia, can you help?",()=>{}), []);
    assert.deepEqual(listeners("Lia, I'm Alaric.",s=>{s.entities[lia].known_name='';}), []);
    assert.deepEqual(listeners("Lia, I'm Alaric.",s=>{s.entities.pc.name='Alaric Rowan';s.facts[PC_NAME_FACT].o='Alaric Rowan';}), []);
    assert.deepEqual(listeners("Lia, I'm Alaric Rowan.",s=>{s.entities.pc.name='Alaric Rowan';s.facts[PC_NAME_FACT].o='Alaric Rowan';}), [lia]);
});

test('Archived Halloran return: the two stored identities have independently accessible dossiers, without changing either', () => {
    const chat = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/npc209_reference_prefix.json.gz',import.meta.url))));
    const state = foldChat(chat.slice(0,45)).state;
    const result = query => runCommands(state,content,'#npc '+query);
    const atDoor = result('Marta');
    assert.match(atDoor.panels[0], /^\[SYSTEM \/\/ NPC\] Marta\n/);
    assert.match(atDoor.panels[0], /\| present/);
    assert.match(result('Marta Halloran').panels[0], /^\[SYSTEM \/\/ NPC\] Marta Halloran\n/);
    assert.doesNotMatch(result('Marta Halloran').panels[0], /\| present/);
    assert.deepEqual(atDoor.events, []);
    assert.equal(atDoor.llm, null);
});

test('Two people with the same familiar first name: ask which; private names and machine references are not searchable', () => {
    const state = structuredClone(original.state);
    state.entities['npc.other_lia'] = {...state.entities[lia],id:'npc.other_lia',name:'Lia Bell'};
    const dossier = q => runCommands(state,content,'#npc '+q).panels[0];
    assert.match(dossier('Lia'), /Lia Halloran.*Lia Bell/s);
    assert.doesNotMatch(dossier('Lia'), /Alaric knows:|Shared moments:/);
    assert.match(dossier('Lia Bell'), /^\[SYSTEM \/\/ NPC\] Lia Bell/);
    // Neutral partial-name control: unlike archived B1 this player never heard the surname.
    state.memories = [];
    state.entities[lia].known_name='Lia';
    const job = Object.values(state.facts).find(f => f.s === lia && f.p === 'occupation');
    applyEvent(state, {t:'knowledge.gained',d:{who:'pc',about:job.id,stance:'knows',source:'witnessed',turn:state.turn,minute:state.clock.minute}});
    assert.match(dossier('Lia'),/Lia occupation farmer/);
    assert.doesNotMatch(dossier('Lia'), /npc\.lia_halloran|Halloran/);
    assert.match(dossier('npc.lia_halloran'), /knows nobody/);
    assert.match(dossier('ann'), /knows nobody/); // never resolve Dann by a substring
});

test('Anonymous people can be distinguished by the same visible scene handles as in the world HUD', () => {
    const state=structuredClone(original.state);
    for (const [id,label] of [[lia,'thick gloves'],[dann,'red scarf']]) {
        state.entities[id].name=null;
        state.entities[id].known_name='';
        state.entities[id].descriptors=['porter',label];
        for (const f of Object.values(state.facts)) if (f.s===id && f.p==='occupation') f.o='porter';
    }
    const shown=Object.fromEntries(worldRows(state,content)).Present;
    assert.match(shown,/Porter A/); assert.match(shown,/Porter B/);
    assert.match(runCommands(state,content,'#npc Porter A').panels[0],/red scarf/);
    assert.match(runCommands(state,content,'#npc Porter B').panels[0],/thick gloves/);
    assert.match(runCommands(state,content,'#npc porter').panels[0],/Which person/);
});
