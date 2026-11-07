// Read-only: classify every player message of the User04 original chat into the PULSE frame it would have had (.159 records).
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG;
const { rec, foldChat } = await import(`${E}/src/host.js`);
const { settlementOf } = await import(`${E}/src/v4/domain.js`);
const { trueDungeonOf } = await import(`${E}/src/v4/dungeon.js`);
const lines = zlib.gunzipSync(fs.readFileSync(process.argv[2])).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const chat = lines.filter((m) => 'mes' in m && 'is_user' in m);
const rows = []; const tally = {};
for (let i = 0; i < chat.length; i++) {
  const m = chat[i]; if (!m.is_user) continue;
  const r = rec(m); const before = foldChat(chat, i).state;
  const evs = r?.events || []; const o = evs.findLast((e) => e.t === 'outcome.recorded')?.d.outcome;
  const text = String(m.mes || '');
  let frame;
  if (/^\s*#/.test(text) || r?.command?.panels) frame = 'x_system_or_panel';
  else if (!evs.length || r?.interp?.failed) frame = 'x_not_executed';
  else if (before.encounter || o?.kind === 'combat' || r?.route === 'v3') frame = 'x_combat_or_v3';
  else if (trueDungeonOf(before, before.scene.at)) frame = 'x_dungeon';
  else if ((r?.interp?.commands || []).some((c) => c.type === 'activity' && ['rest', 'sleep', 'wait'].includes(c.kind)) && !o?.auth?.road) frame = 'x_rest_w7';
  else if ((o?.resolutions || []).length && (o.resolutions).every((x) => x.type === 'board.read')) frame = 'x_info_board';
  else if ((o?.resolutions || []).some((x) => ['buy', 'pay', 'guild.register'].includes(x.type) && x.status === 'pending')) frame = 'x_hard_stop';
  else if ((o?.auth?.gos || []).some((g) => g.within)) frame = 'x_sought';
  else if (o?.auth?.road) frame = 'travel';
  else if (settlementOf(before, before.scene.at)) frame = 'town';
  else frame = 'wild';
  tally[frame] = (tally[frame] || 0) + 1;
  rows.push({ i, frame, at: before.scene.at, road: o?.auth?.road || null, types: (o?.resolutions || []).map((x) => `${x.type}:${x.status}`).join(','), text: text.slice(0, 70) });
}
console.log(JSON.stringify({ messages: chat.length, player: rows.length, tally }, null, 0));
for (const r of rows) console.log(`${r.i}\t${r.frame}\t${r.at}\t${r.road ?? ''}\t${r.types}\t${r.text.replace(/\s+/g, ' ')}`);
