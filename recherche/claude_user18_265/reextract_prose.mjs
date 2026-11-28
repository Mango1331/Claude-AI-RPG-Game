// Re-run a stored extraction on the original prefix, optionally replacing a phrase of the narrator prose.
// node reextract_prose.mjs <engineRoot> <chat.jsonl> <msgIndex> <from> <to>
import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
const [root, chatPath, idx, from, to] = process.argv.slice(2); const i = Number(idx);
const {engineAt} = await import(pathToFileURL(path.join(root, 'tools/replay/replay.mjs')).href);
const {host, runtime, content} = await engineAt(root);
const chat = fs.readFileSync(chatPath, 'utf8').trim().split('\n').slice(1).map(JSON.parse).slice(0, i + 1);
const raw = host.rec(chat[i]).extraction.raw; delete chat[i].extra.avereth;
if (from) chat[i].mes = chat[i].mes.replace(from, to);
runtime.processReplyAny(chat, i, content, {});
await runtime.runExtraction(chat, i, content, async () => JSON.stringify(raw));
const ev = host.rec(chat[i]).events;
console.log('party events:', ev.filter(e => e.t.startsWith('party.')).map(e => e.t + ':' + (e.d.phase || e.d.mode)).join(', ') || '-');
console.log('rejected:', ev.filter(e => e.t === 'delta.rejected').map(e => e.d.item.type + ':' + e.d.rule + ' – ' + e.d.reason).join(' | ') || '-');
