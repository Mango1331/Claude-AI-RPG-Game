// read-only probe of the User04 originals against the current product (.168): no product file written
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG, M = process.env.MAIN;
const { foldChat, rec } = await import(`${E}/src/host.js`);
const lines = zlib.gunzipSync(fs.readFileSync(`${M}/testrun_10b/user-20261106-072640/originals/chat.jsonl.gz`)).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.slice(1); // I0 = first visible message
const npcs = (s) => Object.values(s.entities).filter((e) => e.kind === 'npc');
const at = (i) => foldChat(chat, i + 1).state;
const show = (i) => {
  const s = at(i), r = rec(chat[i]);
  console.log(`\n===== I${i} ${chat[i].is_user ? 'USER' : 'REPLY'} turn ${s.turn} at ${s.scene.at} present ${JSON.stringify(s.scene.present)}`);
  console.log('  mes:', String(chat[i].mes).replace(/\s+/g, ' ').slice(0, 700));
  if (!chat[i].is_user) {
    const ex = r?.extraction?.answer || r?.answer || null;
    const deltas = (r?.events || []).filter((e) => ['delta.rejected'].includes(e.t)).map((e) => `${e.d.rule}: ${e.d.reason}`);
    console.log('  rejected:', JSON.stringify(deltas).slice(0, 600));
    console.log('  events:', (r?.events || []).map((e) => e.t + (e.t === 'scene.entered' ? `(${e.d.id})` : e.t === 'knowledge.gained' ? `(${e.d.who}:${e.d.about})` : e.t === 'entity.created' ? `(${e.d.entity.id})` : '')).join(', ').slice(0, 900));
    const ctx = r?.narration?.context;
    if (ctx) console.log('  E0 delivered:', ctx.delivered?.map((x) => `${x.name}${x.npcIds?.length ? '[' + x.npcIds.join(',') + ']' : ''}:${x.tokens}`).join(' '), '| dropped:', ctx.dropped?.map((x) => x.name).join(','), '| focus', JSON.stringify(ctx.focusNpcIds), 'budgeted', ctx.budgetedTokens);
  }
};
const idx = (process.env.IDX || '6,7,63,64,65,66,71,72,73,74').split(',').map(Number);
for (const i of idx) show(i);
const s = at(chat.length - 1);
console.log('\n===== NPCs at end');
for (const e of npcs(s)) {
  const mem = s.memories.filter((m) => (m.who || []).includes(e.id) || (m.witnesses || []).includes(e.id));
  const know = Object.keys(s.knowledge[e.id] || {});
  const facts = Object.values(s.facts).filter((f) => f.s === e.id && !f.until).map((f) => `${f.p}=${String(f.o).slice(0, 60)}`);
  const rel = s.relations[`rel.${e.id}.attitude.pc`];
  console.log(`${e.id} name=${e.name} at=${e.at} desc=${JSON.stringify(e.descriptors).slice(0, 120)} mem=${mem.length} (>=6: ${mem.filter((m) => (m.importance ?? 5) >= 6).length}) know=${know.length} att=${rel?.value ?? '-'} facts=${JSON.stringify(facts).slice(0, 300)}`);
}
console.log('threads:', JSON.stringify(Object.values(s.threads).map((t) => `${t.kind}/${t.status}: ${t.text}`)).slice(0, 1200));
console.log('attitude deltas total:', s.memories.length, Object.values(s.relations).length);
