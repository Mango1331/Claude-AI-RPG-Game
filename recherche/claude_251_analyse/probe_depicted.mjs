import { pathToFileURL } from 'node:url';
import path from 'node:path';
const ne = await import(pathToFileURL(path.join(process.argv[2], 'src/v4/narration_evidence.js')).href);
const madge = ne.personProfile({ id: 'npc.madge', names: ['Madge'], nameWords: ['madge'], role: 'innkeeper', look: ['broad woman'] });
const guard = ne.personProfile({ id: 'npc.guard', names: ['Brey'], nameWords: ['brey'], role: 'sergeant', look: ['red nose'] });
for (const [p, id, who] of [
  ['Madge stood behind the bar, carving the roast for the evening crowd.', 'npc.madge', madge],
  ['Madge was drawing water at the pump in the yard.', 'npc.madge', madge],
  ['Brey stood at the gate, his sword drawn.', 'npc.guard', guard],
  ['Brey sat at his desk, sketching a map of the square.', 'npc.guard', guard],
  ['Brey was posting a new notice on the board.', 'npc.guard', guard],
  ['Madge was sweeping the empty common room.', 'npc.madge', madge],
  ['Madge stood by the hearth, gone quiet.', 'npc.madge', madge],
]) { const r = ne.metEvidence(p, p, id, [who], {}); console.log(String(r.ok).padEnd(5), (r.why||'').padEnd(42), p); }
