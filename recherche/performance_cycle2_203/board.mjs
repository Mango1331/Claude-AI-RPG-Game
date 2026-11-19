// Real natural B14 rejection, reconstructed full repair for A, and the actual slot response B15.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [ref, suite, clean, latest, raw, out] = process.argv.slice(2);
const read = (n) => fs.readFileSync(path.join(raw, n), 'utf8').trim().split('\n').map(JSON.parse);
const ends = read('physical.jsonl').filter((r) => r.kind === 'end');
const text = (id) => ends.find((r) => r.id === id).text;
const { extractJsonObject } = await import(pathToFileURL(path.resolve(clean, 'avereth-engine/src/v4/json.js')));
const { listings } = extractJsonObject(text(14)).value,
    replacement = extractJsonObject(text(15)).value;
const full = JSON.stringify({ listings: listings.with(replacement.slot - 1, replacement.listing) });
const chat = read('main-chat-B.jsonl').slice(1),
    record = chat[13].extra.avereth;
const original = record.events.slice(
    record.events.findIndex((e) => e.t === 'place.created'),
    record.events.findIndex((e) => e.t === 'board.refreshed') + 1,
);
const results = [];
for (const [label, dir] of Object.entries({ A: ref, B: suite, B1: clean, kandidat: latest })) {
    const mod = (f) => import(pathToFileURL(path.resolve(dir, 'avereth-engine', f)));
    const { loadContentPack } = await mod('src/content.js');
    const content = await loadContentPack((k) =>
        JSON.parse(fs.readFileSync(path.join(dir, 'avereth-engine/content', k))),
    );
    const { foldChat } = await mod('src/host.js'),
        { applyEvent } = await mod('src/state.js');
    const { boardFor, generateBoard } = await mod('src/v4/runtime.js'),
        { bookBoard } = await mod('src/v4/guild.js');
    const { state } = foldChat(chat, 13);
    const need = boardFor(state, content, record.interp.commands, { c: true });
    const requests = [];
    const board = await generateBoard(
        (req) => {
            requests.push(req.messages);
            return requests.length === 1 ? text(14) : label === 'A' ? full : text(15);
        },
        state,
        content,
        need,
    );
    assert.equal(requests.length, 2);
    assert.equal(board.listings.length, 5);
    assert.equal(requests[0][0].content.includes('omit task and desired_end_state'), label === 'B');
    assert.equal(requests[1][0].content.includes('"slot":1,"listing"'), label !== 'A');
    for (const e of record.events.slice(
        0,
        record.events.findIndex((e) => e.t === 'place.created'),
    ))
        applyEvent(state, e);
    const events = [];
    bookBoard(state, content, need, board.listings, (e) => {
        events.push(e);
        applyEvent(state, e);
    });
    assert.deepEqual(JSON.parse(JSON.stringify(events)), original);
    results.push({
        label,
        requests: requests.length,
        events: events.length,
        originalEventsEqual: true,
        slot: label !== 'A',
    });
}
fs.writeFileSync(out, JSON.stringify(results, null, 2) + '\n');
