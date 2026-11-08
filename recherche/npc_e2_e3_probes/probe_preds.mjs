import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat, rec } = await import(`${E}/src/host.js`);
const runs = {
  user01: `${M}/testrun_10b/user-20261104-162404/originals/chat.jsonl`,
  user02: `${E}/tests/v4/fixtures/user02_157.jsonl.gz`,
  user04: `${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`,
};
for (const [label, f] of Object.entries(runs)) {
  const raw = f.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(f)).toString('utf8') : fs.readFileSync(f, 'utf8');
  const lines = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const chat = lines[0].chat_metadata || lines[0].user_name ? lines.slice(1) : lines;
  const s = foldChat(chat).state;
  const npcs = Object.values(s.entities).filter((e) => e.kind === 'npc');
  const preds = {};
  for (const fct of Object.values(s.facts)) if (s.entities[fct.s]?.kind === 'npc') preds[fct.p] = (preds[fct.p] || 0) + 1;
  const ev = {}; let att = 0, thr = { promise: 0, debt: 0 }, mem6 = 0, memNpc = 0;
  for (const m of chat) for (const e of (rec(m)?.events || [])) {
    if (e.t === 'relation.changed' || e.t === 'attitude.changed') att++;
    if (e.t === 'thread.set' && ['promise', 'debt'].includes(e.d.thread?.kind)) thr[e.d.thread.kind]++;
  }
  for (const m of s.memories) { if ((m.importance ?? 5) >= 6) { mem6++; if ((m.who || []).some((w) => s.entities[w]?.kind === 'npc')) memNpc++; } }
  const named = npcs.filter((e) => e.name).length;
  const sorted = Object.entries(preds).sort((a, b) => b[1] - a[1]);
  console.log(`${label}: turns ${s.turn}, NPCs ${npcs.length} (named ${named}), meaningful memories ${mem6} (with an NPC ${memNpc}), attitude events ${att}, promise/debt threads ${JSON.stringify(thr)}, relations ${Object.keys(s.relations).length}`);
  console.log('   NPC fact predicates:', sorted.map(([p, n]) => `${p}:${n}`).join(' '));
}
