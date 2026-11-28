// Offline: run the product's build_corpus buildRun on adapted archive input and report matched/unmatched calls.
// node probe_build.mjs <engine root> <adapted dir>...
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const [root, ...dirs] = process.argv.slice(2);
const { buildRun } = await import(pathToFileURL(path.join(root, 'tools/replay/build_corpus.mjs')).href);
for (const d of dirs) { const r = buildRun(d); console.log(JSON.stringify({ run: path.basename(d), messages: r.chat.length, cases: Object.keys(r.answers).length, ...r.stats })); }
