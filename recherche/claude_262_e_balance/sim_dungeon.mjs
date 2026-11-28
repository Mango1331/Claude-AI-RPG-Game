// R1 dungeons: the existing E floors (and F floors for comparison) as chains, developed vs standard builds, solo and
// with a companion, slot counts at the maximum (stress test) and in the middle, with no rest, 1 h or 4 h rest between
// encounters (product recovery rates). 40 seeds per cell. node sim_dungeon.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const root = process.argv[2];
const { lib } = await import(pathToFileURL(new URL('./simlib.mjs', import.meta.url).pathname).href);
const L = await lib(root);
const { spansFor } = await import(pathToFileURL(path.join(root, 'src/v4/living.js')).href);
const lore = JSON.parse(fs.readFileSync(path.join(root, 'content/lore.json'))); const types = L.c.rules.living.role_type;
const EVO = { warrior: ['normal', 'defense'], mage: ['normal', 'arcane'], rogue: ['normal', 'precision'] }; const ALLY = { warrior: 'mage', mage: 'warrior', rogue: 'warrior' };
const dev = (cls, L) => ({ build: 'aoe', prof: 5, learned: true, learnedProf: 3, potions: 3, ...(L >= 15 ? { evolution: EVO[cls] } : {}) });
for (const d of lore.dungeons) for (const [n, f] of Object.entries(d.living.floors)) {
  const rank = (d.levels?.[n] || d.rank).min; const spans = spansFor(L.c, { min: rank, max: rank });
  const steps = (mode) => f.slots.map(sl => ({ anchor: sl.anchor, type: types[sl.role], level: Math.round((spans[sl.role][0] + spans[sl.role][1]) / 2), count: Array.isArray(sl.count) ? (mode === 'max' ? sl.count[1] : Math.ceil((sl.count[0] + sl.count[1]) / 2)) : 1 }));
  const levels = rank === 'F' ? [5, 8] : [18, 20, 24];
  console.log(`== ${d.name} ${n} (${rank}) max: ` + steps('max').map(s => `${s.anchor}${s.count > 1 ? '×' + s.count : ''} ${s.type} L${s.level}`).join(' → '));
  for (const cls of ['warrior', 'mage', 'rogue']) for (const lv of levels) {
    const gear = lv >= 15 ? { weapon: 'fine', armor: 'fine', rank: 'E' } : 'fine'; const cells = [];
    cells.push('std max/0h ' + L.chain({ cls, level: lv, gear, band: 'SHORT', build: 'standard', policy: 'standard' }, steps('max'), { n: 40 }).full);
    for (const [mode, h] of [['max', 0], ['mid', 0], ['mid', 1], ['mid', 4]]) cells.push(`dev ${mode}/${h}h ${L.chain({ cls, level: lv, gear, band: cls === 'mage' ? 'MEDIUM' : 'SHORT', ...dev(cls, lv) }, steps(mode), { n: 40, restHours: h }).full}`);
    cells.push('dev+ally max/0h ' + L.chain({ cls, level: lv, gear, band: 'SHORT', ...dev(cls, lv), ally: ALLY[cls] }, steps('max'), { n: 40 }).full);
    console.log(`  ${cls.padEnd(7)} L${lv}: ${cells.join(' · ')}`);
  }
}
