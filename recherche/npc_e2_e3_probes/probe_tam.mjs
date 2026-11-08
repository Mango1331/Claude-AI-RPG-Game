import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG;
const { foldChat, rec } = await import(`${E}/src/host.js`);
const lines = zlib.gunzipSync(fs.readFileSync(`${E}/tests/v4/fixtures/user02_157.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines[0].chat_metadata || lines[0].user_name ? lines.slice(1) : lines;
const s = foldChat(chat).state;
const id = 'npc.npcguild_clerk';
console.log('Tam memories:');
for (const m of s.memories.filter((m) => (m.who || []).includes(id) || (m.witnesses || []).includes(id))) console.log(`  t${m.turn} imp${m.importance} kind=${m.kind} who=${JSON.stringify(m.who)} :: ${String(m.text).slice(0, 200)}`);
console.log('Tam knowledge:', Object.keys(s.knowledge[id] || {}).join(', '));
console.log('Tam facts:', Object.values(s.facts).filter((f) => f.s === id).map((f) => `${f.p}=${String(f.o).slice(0, 80)}${f.until ? ' (ended)' : ''}`).join(' | '));
console.log('threads:', Object.values(s.threads).map((t) => `${t.kind}/${t.status}: ${t.text}`).join(' || '));
console.log('relations:', JSON.stringify(s.relations));
// rejected social deltas over the run
const rej = {};
for (const m of chat) for (const e of (rec(m)?.events || [])) if (e.t === 'delta.rejected' && ['memory', 'fact', 'thread', 'learn', 'attitude', 'enter', 'person.new'].includes(e.d.item?.type)) { const k = `${e.d.item.type}:${e.d.rule}`; rej[k] = (rej[k] || 0) + 1; }
console.log('rejected social deltas:', JSON.stringify(rej));
const acc = {};
for (const m of chat) for (const e of (rec(m)?.events || [])) if (['memory.recorded', 'thread.set', 'knowledge.gained', 'relation.changed', 'fact.asserted'].includes(e.t)) acc[e.t] = (acc[e.t] || 0) + 1;
console.log('accepted social events:', JSON.stringify(acc));
