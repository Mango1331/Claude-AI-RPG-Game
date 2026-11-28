// Continuation probe on the ORIGINAL save (stored records of M0–M27 untouched): drop M29+, edit M28 text, let the
// runtime notice the edit and re-extract (the new X call is modelled with the archived T10 answer).
import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
const [root, chatPath, answersPath] = process.argv.slice(2);
const {engineAt} = await import(pathToFileURL(path.join(root, 'tools/replay/replay.mjs')).href);
const {host, runtime, content} = await engineAt(root);
const chat = fs.readFileSync(chatPath, 'utf8').trim().split('\n').slice(1).map(JSON.parse).slice(0, 29);
const answer = JSON.parse(fs.readFileSync(answersPath, 'utf8')).answers[28][0].content;
chat[28].mes = chat[28].mes.replace('The lizards', 'The lizards').replace(/\s*$/, '') + '​';
const r = runtime.processReplyAny(chat, 28, content, {});
console.log('re-extraction requested:', !!r?.extract);
await runtime.runExtraction(chat, 28, content, async () => answer);
const {state, errors} = host.foldChat(chat);
console.log('errors', errors, '| creatures:', Object.values(state.entities).filter(e => e.kind === 'creature').map(e => e.id).join(', ') || '-');
console.log('at', state.scene.at, '| clock', state.clock.minute, '| party:', Object.keys(state.party?.members || {}).join(', '));
