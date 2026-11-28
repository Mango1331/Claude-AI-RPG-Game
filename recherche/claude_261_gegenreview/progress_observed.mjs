// Offline: the PC's level, XP and booked XP sources at the end of archived chats (fold with the .261 engine), plus the
// XP needed for Level 15 under the current rules. node progress_observed.mjs <engine root> <chat.jsonl(.gz)>...
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import zlib from 'node:zlib'; import fs from 'node:fs';
const [root, ...files] = process.argv.slice(2);
const host = await import(pathToFileURL(path.join(root, 'src/host.js')).href);
const prog = await import(pathToFileURL(path.join(root, 'src/progression.js')).href);
const content = await (await import(pathToFileURL(path.join(root, 'tests/helpers.js')).href)).loadProductContent();
const per = content.rules.progression.xp_to_next_per_level;
let need = 0; for (let l = 1; l < 15; l++) need += l * per;
console.log(JSON.stringify({ xp_needed_level1_to_15: need, defeat_xp_normal_same_rank_level: [1, 3, 7, 11, 14].map((l) => [l, prog.defeatXp(l, 'normal', 'F', content)]), quest_xp: ['minor', 'standard', 'dangerous'].map((q) => [q, [1, 7, 14].map((l) => prog.questXp(l, q, content))]) }));
for (const f of files) {
  const buf = fs.readFileSync(f); const text = f.endsWith('.gz') ? zlib.gunzipSync(buf).toString() : buf.toString();
  const chat = text.split('\n').filter(Boolean).map(JSON.parse);
  let r; try { r = host.foldChat(chat); } catch (e) { console.log(JSON.stringify({ run: f, error: String(e).slice(0, 80) })); continue; }
  const s = r.state; const sh = s.entities?.pc?.sheet; if (!sh) continue;
  const reasons = {}; let total = 0;
  for (const m of chat) for (const e of m.extra?.avereth?.events || []) if (e.t === 'xp.changed' && e.d.id === 'pc') { const k = String(e.d.reason || '?').split(/[:(]/)[0].trim().slice(0, 30); reasons[k] = (reasons[k] || 0) + e.d.amount; total += e.d.amount; }
  console.log(JSON.stringify({ run: path.basename(path.dirname(f)) + '/' + path.basename(f), messages: chat.length, day: Math.floor((s.clock?.minute || 0) / 1440) + 1, level: sh.level, xp: sh.xp, xp_booked: total, reasons }));
}
