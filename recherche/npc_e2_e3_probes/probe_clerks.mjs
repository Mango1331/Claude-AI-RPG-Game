// read-only: who knows what about Alaric's contracts at the Alderwatch hall (User04, .168 fold)
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat, rec } = await import(`${E}/src/host.js`);
const lines = zlib.gunzipSync(fs.readFileSync(`${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.slice(1);
const s = foldChat(chat).state;
for (const id of ['npc.npcguild_clerks', 'npc.npcnpcwiry_woman', 'npc.npcbench_crossbowman']) console.log(id, 'knows:', Object.keys(s.knowledge[id] || {}).join(', '));
for (const i of [64, 66, 72, 74]) for (const e of (rec(chat[i])?.events || [])) if (e.t === 'memory.recorded') console.log(`I${i} memory imp${e.d.memory?.importance} who=${JSON.stringify(e.d.memory?.who)} :: ${String(e.d.memory?.text).slice(0, 220)}`);
for (const i of [64, 72, 74]) for (const e of (rec(chat[i])?.events || [])) if (e.t === 'fact.asserted') console.log(`I${i} fact ${e.d.fact.s} ${e.d.fact.p} = ${String(e.d.fact.o).slice(0, 160)}`);
