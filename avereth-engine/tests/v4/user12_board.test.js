import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { boardFor, generateBoard, prepareGenerationAsync } from '../../src/v4/runtime.js';
import { parseInitialBoard } from '../../src/v4/guild.js';
import { foldChat, rec } from '../../src/host.js';
import { loadProductContent } from '../helpers.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/user12_initial_board.json.gz',import.meta.url))));
const content = await loadProductContent();
const before = foldChat(fixture.prefix).state;
const need = boardFor(before,content,fixture.cmds,{c:true});

test('the first User12 board diagnoses all three bad listings and can use one bounded repair', async () => {
    const initial = parseInitialBoard(fixture.answers[0],content,need,before);
    assert.equal(initial.listings.length,2);
    assert.match(initial.refused[0].why,/level window/);
    for (const entry of initial.refused.slice(1)) assert.match(entry.why,/does not match the hunted kind/);
    const calls = [];
    const result = await generateBoard(async request => {
        calls.push(request);
        return fixture.answers[calls.length-1];
    },before,content,need);
    assert.equal(calls.length,2);
    assert.match(calls[1].messages.at(-1).content,/habitat.species\/anchor/);
    assert.equal(result.listings.length,5);
});

test('an exhausted pure board read returns a technical panel with no fictional listings', async () => {
    const chat = [...structuredClone(fixture.prefix),{is_user:true,mes:fixture.input}];
    const calls = [];
    const result = await prepareGenerationAsync(chat,content,{settings:{planner:true},llm:async req => {
        calls.push(req.purpose);
        return req.purpose === 'board' ? fixture.answers[0] : JSON.stringify({commands:fixture.cmds});
    }});
    assert.equal(result.action,'panels');
    assert.match(result.panels[0],/could not be confirmed/);
    assert.deepEqual(calls,['plan','board','board']);
    const events = rec(chat.at(-1)).events;
    assert.ok(events.some(e => e.t === 'board.failed'));
    assert.ok(!events.some(e => e.t === 'quest.created' || e.t === 'board.shown'));
});
