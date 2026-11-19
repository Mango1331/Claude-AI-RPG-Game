// Offline A/B/B/A on the same pilot data using the real adapters and a local chat API stub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';

const [reference, candidate] = process.argv.slice(2);
assert(reference && candidate, 'Pass the .203 and suite repository roots');
const adapter = async root => (await import(pathToFileURL(path.resolve(root, 'avereth-engine/src/v4/action_persistence.js')))).createChatPersistence;
const adapters = {A: await adapter(reference), B: await adapter(candidate)};
const fixture = path.resolve(candidate, 'avereth-engine/tests/v4/fixtures/pilot01_npc_pulse.json.gz');
const chat = JSON.parse(gunzipSync(fs.readFileSync(fixture)));
for (const length of [21, chat.length]) {
    for (const label of ['A', 'B', 'B', 'A']) {
        const current = {chat: structuredClone(chat.slice(0, length)), chatMetadata: {}, characterId: 0,
            characters: [{avatar:'p.png', name:'p'}], getCurrentChatId: () => 'probe'};
        let saved = [];
        const ms = [], readQueries = [];
        const persistence = adapters[label]({
            headers: () => ({}),
            active: () => current,
            request: async (url, {body}) => {
                if (url === '/api/chats/get') {
                    readQueries.push(Buffer.byteLength(body));
                    return Response.json(saved);
                }
                assert.equal(url, '/api/chats/save');
                saved = JSON.parse(body).chat;
                return Response.json({});
            },
        });
        for (let n = 0; n < 5; n++) {
            const start = performance.now();
            await persistence.save(current);
            ms.push(performance.now() - start);
        }
        assert.equal(readQueries.length, 10);
        assert.deepEqual(saved.slice(1), current.chat);
        console.log(JSON.stringify({length, label, ms, readQueries}));
    }
}
