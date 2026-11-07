// Read-only (.160): narrator context of every User04 player turn rebuilt from its stored records; section sizes and drops.
import fs from 'node:fs'; import zlib from 'node:zlib';
const E = process.env.ENG;
const { loadProductContent } = await import(`${E}/tests/helpers.js`);
const { rec, turnBlock } = await import(`${E}/src/host.js`);
const { estimateTokens } = await import(`${E}/src/util.js`);
const content = await loadProductContent();
const chat = zlib.gunzipSync(fs.readFileSync(process.argv[2])).toString('utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => 'mes' in m && 'is_user' in m);
const rows = [];
for (let u = 0; u < chat.length; u++) {
  const m = chat[u]; if (!m.is_user || /^\s*#/.test(m.mes)) continue;
  const r = rec(m); if (!r?.events?.length || r.command?.panels) continue;
  const b = turnBlock(chat, u, content, {});
  const c = b.context; const d = c?.diagnostics || c?.engine?.diagnostics;
  const find = (o) => { if (!o || typeof o !== 'object') return null; if (o.diagnostics) return o; for (const v of Object.values(o)) { const x = find(v); if (x) return x; } return null; };
  const ctx = d ? c : find(c);
  if (!ctx) { rows.push({ u, keys: Object.keys(c || {}) }); continue; }
  const sec = Object.fromEntries((ctx.sections || []).map((s) => [s.name, s.tokens]));
  rows.push({ u, total: ctx.diagnostics.tokens, budgeted: ctx.diagnostics.budgetedTokens, overflow: ctx.diagnostics.overflow, resolved: sec.resolved || 0, p0: ctx.diagnostics.budgetedTokens, dropped: ctx.dropped.join('|') });
}
console.log(JSON.stringify(rows));
const ok = rows.filter((r) => r.total != null);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
console.log('turns', ok.length, 'median total', med(ok.map((r) => r.total)), 'median budgeted', med(ok.map((r) => r.budgeted)), 'overflow>0', ok.filter((r) => r.overflow > 0).length, 'median resolved', med(ok.map((r) => r.resolved)), 'max resolved', Math.max(...ok.map((r) => r.resolved)), 'turns with drops', ok.filter((r) => r.dropped).length);
const lines = {
  road_open_today: 'THE ROAD — this leg toward Hollowmere peat cuttings may (not must) bring ONE concrete interruption that fits the land he crosses and the hour: people or creatures of this land, an obstacle on the way, a meeting. It stops the travel where it happens, short of where he is going; what he does about it (fight, pay, talk, flee, another way) is his decision, not the story\'s. Scenery, weather and far-off signs are atmosphere, not interruptions.',
  pulse_travel_danger: 'PULSE (the engine\'s, evening, road) — on this leg toward Hollowmere peat cuttings ONE concrete thing happens that fits the land and the hour: DANGER — one group of this land\'s people or creatures turns on him or bars his way with hostile intent; its strength is the land\'s (AREA LEVELS / populations), never his. It is a real stop short of the destination; what he does is his decision. Nobody else joins. If the reply cannot fit it, nothing happens.',
  pulse_town_life: 'PULSE (the engine\'s, day, street) — around him ONE thing of the town\'s life happens that he can notice and take up or ignore: news, a commotion, a request, a festival. It takes nothing of his, starts no fight and binds him to nothing.',
  pulse_quiet: 'NO WORLD EVENT this turn: the scene follows what he does; nobody new turns on him or takes from him.',
  rest_interrupt: 'REST INTERRUPTED (the engine\'s) — after 3 h 10 min of the 8 h he chose, something wakes him (booked: 190 min, recovery for those minutes only): DANGER — one group of this land\'s creatures comes upon the camp. What he does is his decision.',
};
console.log(JSON.stringify(Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, estimateTokens(v)]))));
