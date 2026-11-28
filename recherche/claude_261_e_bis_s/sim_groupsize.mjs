// Offline: solo win rate (60 seeds) by group size 1-4 for E-level foes, PC E15/E20/E25 with typical E-fine gear.
// node sim_groupsize.mjs <analysis engine> <out.json>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const [root, out] = process.argv.slice(2);
const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href);
const E = await engine(root); const rows = [];
for (const cls of ['warrior', 'mage', 'rogue']) for (const L of [15, 20, 25]) for (const anchor of ['wolf', 'goblin', 'bear']) for (const fl of [15, 17, 19, 22]) for (const count of [1, 2, 3, 4]) {
  const sc = { id: 'g', cls, level: L, style: 'balanced', prof: 1, band: 'SHORT', tactic: 'skill', gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, foe: { anchor, level: fl, count } };
  let w = 0, hp = 0; for (let s = 1; s <= 60; s++) { const r = E.fight(sc, s); if (r.outcome === 'win') { w++; hp += r.hpPct; } }
  rows.push({ cls, L, anchor, fl, count, win: Math.round(100 * w / 60), hp: w ? Math.round(hp / w) : 0 });
}
fs.writeFileSync(out, JSON.stringify(rows)); 
for (const cls of ['warrior', 'mage', 'rogue']) for (const L of [15, 20, 25]) {
  console.log(`== ${cls} L${L}: anchor@level -> win% for 1/2/3/4`);
  for (const anchor of ['wolf', 'goblin', 'bear']) console.log('  ' + anchor.padEnd(7) + [15, 17, 19, 22].map(fl => `L${fl}: ` + [1, 2, 3, 4].map(n => rows.find(r => r.cls === cls && r.L === L && r.anchor === anchor && r.fl === fl && r.count === n).win).join('/')).join(' | '));
}
