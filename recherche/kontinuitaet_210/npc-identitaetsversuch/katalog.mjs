// Stream reconstructed prompt components to the local counter. No HTTP and no model calls.
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const [docs, reference, candidate] = process.argv.slice(2);
if (!candidate) throw Error('Usage: node katalog.mjs MAIN BASE NPC');
const folder = path.join(docs, 'testrun_10b/openrouter-20261124-trust-c-208');
const chat = gunzipSync(fs.readFileSync(path.join(folder, 'original-chat.jsonl.gz'))).toString().trim().split(/\r?\n/).map(s => JSON.parse(s)).filter(m => m.mes != null);
for (const [variant, root] of Object.entries({ A: reference, B: candidate })) {
    const engine = path.resolve(root, 'avereth-engine');
    const load = p => import(pathToFileURL(path.join(engine, p)));
    const { setRec } = await load('src/host.js');
    const { hash32 } = await load('src/util.js');
    const { extractionRequest } = await load('src/v4/runtime.js');
    const { loadProductContent } = await load('tests/helpers.js');
    const content = await loadProductContent();
    for (const [i, archived] of chat.entries()) {
        if (!archived.extra?.avereth?.extraction?.raw) continue;
        const prefix = structuredClone(chat.slice(0, i + 1));
        const msg = prefix.at(-1);
        setRec(msg, { events: [], text_hash: hash32(msg.mes), extraction: { status: 'pending' } });
        const req = extractionRequest(prefix, i, content);
        if (!req) throw Error('Unable to reconstruct message ' + i);
        console.log(JSON.stringify({ variant, index: i, catalog: req.catalog, system: req.system, user: req.user }));
    }
}
