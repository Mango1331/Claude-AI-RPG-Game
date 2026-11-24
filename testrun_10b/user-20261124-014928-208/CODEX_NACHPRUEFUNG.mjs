// Offline audit of this single archived run. Argument: path to avereth-engine at cb1eb944.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

if (!process.argv[2]) throw new Error('Pfad zum festgepinnten avereth-engine-Verzeichnis angeben.');
const engine = resolve(process.argv[2]);
const load = (path) => import(pathToFileURL(join(engine, path)));
const { foldChat } = await load('src/host.js');
const { extractionRequest, applyExtraction } = await load('src/v4/runtime.js');
const { parseExtraction } = await load('src/v4/extract.js');
const { loadProductContent } = await load('tests/helpers.js');
const content = await loadProductContent();
const archive = new URL('./originals/', import.meta.url);
const read = (name) => readFile(new URL(name, archive));
const [chatFile, eventFile, packedLog] = await Promise.all([read('chat.jsonl'), read('events.json'), read('st.redacted.txt.gz')]);
const logFile = gunzipSync(packedLog);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(chatFile), '534059d2e42c13148f35dcd58559047c4f1636e55ee5a71a0b5e6612ac991e8c');
assert.equal(sha(eventFile), 'c76847a5b8ade424ae65e06714ea38edc5dd4cd2455c1dbacf5a947667f31b2a');
assert.equal(sha(logFile), 'b4d091087217619acc712d433f079419424eca03f85c02a7c88ad477ae5f9fcd');
const chat = chatFile.toString('utf8').trimEnd().split('\n').map(JSON.parse).slice(1);
const groups = JSON.parse(eventFile);
assert.deepEqual(groups.map(g => [g.i, g.events]), chat.map((m, i) => [i, m.extra?.avereth?.events]).filter(([, events]) => events?.length));
for (let end = 1; end <= chat.length; end++) assert.deepEqual(foldChat(chat, end).errors, []);

const blocks = logFile.toString('utf16le').split('Chat Completion request: {').slice(1);
const physical = blocks.map(block => {
    const [req, res] = block.split('Chat Completion response: {');
    const system = req.match(/content: (.{0,100})/)[1];
    const role = [['P', 'command interpreter'], ['B', 'official contracts'], ['N', 'NARRATOR'], ['X', 'typed deltas']].find(([, text]) => system.includes(text))[0];
    assert(req.includes("model: 'zai-org/GLM-5.3-Flash'") && req.includes('stream: false'));
    assert(res.includes("finish_reason: 'stop'"));
    const number = key => Number(res.match(new RegExp('\\b' + key + ': (\\d+)'))[1]);
    const input = number('prompt_tokens'), output = number('completion_tokens');
    assert.equal(input + output, number('total_tokens'));
    assert.equal(number('cached_tokens'), 0);
    return { role, input, output, id: res.match(/\bid: '([^']+)'/)[1], res };
});
assert.equal(new Set(physical.map(r => r.id)).size, 36);
const xRecords = physical.filter(r => r.role === 'X');
function originalContent(res) {
    // PowerShell recorded Node's inspected string literals. Only decode literal pieces, never evaluate archived code.
    const expr = res.match(/^        content: ([\s\S]*?)(?:,?\r?\n        \w+:|\r?\n      \})/m)[1];
    const escapes = { n: '\n', r: '\r', t: '\t', "'": "'", '"': '"', '`': '`', '\\': '\\' };
    const pieces = expr.split(/ \+\r?\n */).map(piece => {
        assert(['"', "'", '`'].includes(piece[0]) && piece.at(-1) === piece[0] && !piece.includes('${'));
        return piece.slice(1, -1).replace(/\\(.)/g, (_, ch) => {
            assert(Object.hasOwn(escapes, ch));
            return escapes[ch];
        });
    });
    // The only non-ASCII corruption in these 16 X records is the UTF-8 em dash displayed in CP850.
    return pieces.join('').replaceAll('ÔÇö', '—');
}
const jsonState = data => JSON.parse(JSON.stringify(data));
const pending = i => {
    const prefix = structuredClone(chat.slice(0, i + 1));
    prefix[i].extra.avereth.events = [];
    prefix[i].extra.avereth.extraction = { status: 'pending' };
    return prefix;
};
let xi = 0;
const attempts = [];
for (let m = 6; m <= 26; m += 2) {
    const prefix = pending(m);
    const req = extractionRequest(prefix, m, content);
    const x = chat[m].extra.avereth.extraction;
    let parsed;
    for (const call of x.llm) {
        const phys = xRecords[xi++];
        assert.deepEqual([phys.input, phys.output], [call.prompt, call.completion]);
        parsed = parseExtraction(originalContent(phys.res), req.vocab, req.ids, req.expectedKeys, {
            sceneRequired: req.sceneRequired, startScene: req.startScene, state: req.state, content,
            explicitArrivals: req.sceneRequired, reply: chat[m].mes,
        });
        attempts.push({ request: physical.indexOf(phys) + 1, valid: parsed.valid, complete: parsed.complete, issues: parsed.issues?.length || 0 });
    }
    assert.deepEqual(jsonState(parsed.value), x.raw);
    const applied = applyExtraction(prefix, m, content, parsed, { hash: req.hash, ms: x.ms, repaired: x.repaired, calls: x.llm });
    assert.equal(applied.applied, true);
    assert.deepEqual(jsonState(prefix[m].extra.avereth.events), chat[m].extra.avereth.events);
    assert.deepEqual(jsonState(foldChat(prefix).state), jsonState(foldChat(chat, m + 1).state));
}
assert.equal(xi, xRecords.length);
assert.deepEqual(attempts.filter(a => !a.valid).map(a => a.request), [3, 7, 11, 18]);
assert.deepEqual(attempts.filter(a => a.issues).map(a => [a.request, a.issues]), [[28, 3], [29, 1]]);
for (const variant of ['claimed_contract', 'listing.gone']) {
    const m = 12, prefix = pending(m), req = extractionRequest(prefix, m, content);
    const raw = structuredClone(chat[m].extra.avereth.extraction.raw);
    if (variant === 'claimed_contract') raw.deltas[1].p = variant;
    else raw.deltas[1] = { seq: 2, type: variant, listing: 'quest.adders_in_the_ferry_stones', why: 'taken_by_other' };
    const result = applyExtraction(prefix, m, content, { value: raw, valid: true, complete: true, missing: [] }, { hash: req.hash });
    assert.equal(result.applied, true);
    const rejection = prefix[m].extra.avereth.events.find(e => e.t === 'delta.rejected' && e.d.item.seq === 2);
    assert.equal(rejection.d.rule, variant === 'claimed_contract' ? 'engine_owned_fact' : 'board_first_display');
    assert.equal(foldChat(prefix).state.quests['quest.adders_in_the_ferry_stones'].status, 'listed');
}
console.log(JSON.stringify({ prefixes: chat.length, eventGroups: groups.length, events: groups.reduce((n, g) => n + g.events.length, 0),
    physical: physical.length, input: physical.reduce((n, r) => n + r.input, 0), output: physical.reduce((n, r) => n + r.output, 0),
    extractorAttempts: xi, exactRepliesAndWorlds: 11, boardControls: 2, attempts }, null, 2));
