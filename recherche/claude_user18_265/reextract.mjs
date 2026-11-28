// Re-run one stored extraction on the original prefix (stored records of all earlier messages kept).
// node reextract.mjs <engineRoot> <chat.jsonl> <msgIndex>
import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
const [root, chatPath, idx] = process.argv.slice(2); const i = Number(idx);
const {engineAt} = await import(pathToFileURL(path.join(root, 'tools/replay/replay.mjs')).href);
const {host, runtime, content} = await engineAt(root);
const chat = fs.readFileSync(chatPath, 'utf8').trim().split('\n').slice(1).map(JSON.parse).slice(0, i + 1);
const raw = host.rec(chat[i]).extraction.raw; delete chat[i].extra.avereth;
runtime.processReplyAny(chat, i, content, {});
await runtime.runExtraction(chat, i, content, async ({purpose}) => JSON.stringify(raw));
const ev = host.rec(chat[i]).events;
console.log('creatures:', ev.filter(e => e.t === 'entity.created' && e.d.entity.kind === 'creature').map(e => e.d.entity.id + ' pop=' + e.d.entity.population_at).join(', ') || '-');
console.log('rejected:', ev.filter(e => e.t === 'delta.rejected').map(e => e.d.item.type + ':' + e.d.rule).join(', ') || '-');
