// Offline: full fold timing with 5 warm-up folds and 40 measured folds; reports median and interquartile range.
// node foldtime_robust.mjs <engine root> <chat.jsonl.gz>...
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import zlib from 'node:zlib'; import fs from 'node:fs';
const [root, ...files] = process.argv.slice(2);
const host = await import(pathToFileURL(path.join(root, 'src/host.js')).href);
for (const file of files) {
  const chat = zlib.gunzipSync(fs.readFileSync(file)).toString().split('\n').filter(Boolean).map(JSON.parse);
  let events = 0; for (const m of chat) events += (m.extra?.avereth?.events || []).length;
  for (let i = 0; i < 5; i++) host.foldChat(chat);
  const t = []; for (let i = 0; i < 40; i++) { const a = performance.now(); host.foldChat(chat); t.push(performance.now() - a); }
  t.sort((a, b) => a - b);
  console.log(JSON.stringify({ run: path.basename(path.dirname(file)), events, median_ms: +t[20].toFixed(1), q1: +t[10].toFixed(1), q3: +t[30].toFixed(1), ms_per_1000_events: +(t[20] / events * 1000).toFixed(1) }));
}
