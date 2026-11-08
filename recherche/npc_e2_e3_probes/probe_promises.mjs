import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat, rec } = await import(`${E}/src/host.js`);
for (const f of [`${E}/tests/v4/fixtures/user02_157.jsonl.gz`, `${M}/testrun_10b/user-20261104-162404/originals/chat.jsonl`]) {
  const raw = f.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(f)).toString('utf8') : fs.readFileSync(f, 'utf8');
  const lines = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const chat = lines[0].chat_metadata || lines[0].user_name ? lines.slice(1) : lines;
  chat.forEach((m, i) => { for (const e of (rec(m)?.events || [])) {
    if (e.t === 'thread.set' && ['promise', 'debt'].includes(e.d.thread?.kind)) console.log(`I${i} thread ${e.d.thread.kind}/${e.d.thread.status} at=${e.d.thread.at}: ${e.d.thread.text}`);
    if (e.t === 'fact.asserted' && /promise|dinner|will_tell|reminds|offer|asks/.test(e.d.fact.p)) console.log(`I${i} fact ${e.d.fact.s} ${e.d.fact.p} = ${String(e.d.fact.o).slice(0, 160)}`);
    if (e.t === 'delta.rejected' && ['thread', 'memory'].includes(e.d.item?.type)) console.log(`I${i} REJECTED ${e.d.item.type} ${e.d.rule}: ${String(e.d.item.text || '').slice(0, 160)}`);
  } });
  console.log('---');
}
