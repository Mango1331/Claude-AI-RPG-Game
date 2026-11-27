// Offline: time the full fold of an archived chat (no model call). node foldtime.mjs <engine root> <chat.jsonl.gz>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import zlib from 'node:zlib'; import fs from 'node:fs';
const [root, file] = process.argv.slice(2);
const host = await import(pathToFileURL(path.join(root, 'src/host.js')).href);
const chat = zlib.gunzipSync(fs.readFileSync(file)).toString().split('\n').filter(Boolean).map(JSON.parse);
let events = 0; for (const m of chat) events += (m.extra?.avereth?.events || []).length;
const t = []; let r;
for (let i = 0; i < 7; i++) { const a = performance.now(); r = host.foldChat(chat); t.push(performance.now() - a); }
t.sort((a, b) => a - b);
console.log(JSON.stringify({ file: path.basename(path.dirname(file)), messages: chat.length, events, median_ms: +t[3].toFixed(1), min_ms: +t[0].toFixed(1), errors: r.errors?.length ?? null, state_kb: Math.round(JSON.stringify(r.state).length / 1024) }));
