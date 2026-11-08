import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { rec } = await import(`${E}/src/host.js`);
const lines = zlib.gunzipSync(fs.readFileSync(`${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.slice(1);
for (const i of [63, 73]) console.log(`I${i}`, (rec(chat[i])?.events || []).filter((e) => ['knowledge.gained', 'fact.asserted', 'quest.status', 'scene.moved'].includes(e.t)).map((e) => e.t === 'knowledge.gained' ? `know(${e.d.who}:${e.d.about})` : e.t === 'fact.asserted' ? `fact(${e.d.fact.s} ${e.d.fact.p})` : e.t === 'quest.status' ? `quest(${e.d.id}->${e.d.to})` : e.t).join(', '));
