// Offline: like probe_build.mjs, but counts only the engine calls of arm-own messages (beyond the archive's chat-0).
// node probe_build_own.mjs <engine root> <archive root> <adapted dir>...
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs'; import zlib from 'node:zlib';
const [root, archives, ...dirs] = process.argv.slice(2);
const { buildRun } = await import(pathToFileURL(path.join(root, 'tools/replay/build_corpus.mjs')).href);
let T = { calls: 0, matched: 0, inherited_calls: 0, inherited_matched: 0 };
for (const d of dirs) {
  const c0f = path.join(archives, path.basename(d), 'chat-0.jsonl.gz');
  const start = fs.existsSync(c0f) ? zlib.gunzipSync(fs.readFileSync(c0f)).toString().split('\n').filter(Boolean).length : 1;
  const r = buildRun(d); let own = 0, ok = 0, inh = 0, iok = 0;
  for (const [i, answers] of Object.entries(r.answers)) for (const a of answers) {
    const hit = !a.missing && !a.error;
    if (Number(i) >= start) { own++; ok += hit; } else { inh++; iok += hit; }
  }
  T.calls += own; T.matched += ok; T.inherited_calls += inh; T.inherited_matched += iok;
  if (own !== ok) console.log(JSON.stringify({ run: path.basename(d), own_calls: own, own_matched: ok }));
}
console.log(JSON.stringify(T));
