// Reconstruct the authoritative ST extension block before each actual Narrator response.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const [docs, reference, candidate] = process.argv.slice(2);
if (!candidate) throw Error('Usage: node narrator.mjs MAIN BASE NPC');
const folder = path.join(docs, 'testrun_10b/openrouter-20261124-trust-c-208');
const records = filename => zlib.gunzipSync(fs.readFileSync(path.join(folder, filename))).toString().trim().split(/\r?\n/).map(s => JSON.parse(s));
const chat = records('original-chat.jsonl.gz').filter(m => m.mes != null);
const replies = chat.flatMap((m, i) => m.extra?.avereth?.extraction?.raw ? [i] : []);
const requests = records('provider-journal.jsonl.gz').filter(j => j.kind === 'start' && j.role === 'narrator');
if (replies.length !== requests.length) throw Error('Incomplete request/response pairing');
const engines = [];
for (const checkout of [reference, candidate]) {
    const load = p => import(pathToFileURL(path.resolve(checkout, 'avereth-engine', p)));
    const { turnBlock } = await load('src/host.js');
    const { loadProductContent } = await load('tests/helpers.js');
    const content = await loadProductContent();
    engines.push(user => turnBlock(chat, user, content, { budget: 1400, rulesBudget: 800, engineLore: false }).context.text);
}
const hash = text => createHash('sha256').update(text).digest('hex');
for (const [i, request] of requests.entries()) {
    const messages = request.body.messages;
    const matches = messages.flatMap((m, j) => m.role === 'system' && m.content.startsWith('[AVERETH ENGINE') ? [j] : []);
    if (request.turn !== i + 1 || matches.length !== 1 || !chat[replies[i] - 1].is_user) throw Error('Ambiguous source or turn');
    const [slot] = matches;
    const [a, b] = engines.map(build => build(replies[i] - 1));
    const archived = messages[slot].content;
    if (a !== archived) throw Error('Reference projection differs in turn ' + request.turn);
    const swapped = structuredClone(messages);
    swapped[slot].content = b;
    console.log(JSON.stringify({ turn: request.turn, id: request.id, exact: true, actualSha: hash(archived), aSha: hash(a), bSha: hash(b), actual: messages, b: swapped }));
}
