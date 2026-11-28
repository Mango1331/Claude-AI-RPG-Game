// R3: E weapon variants (analysis copies: gear.json instances.e_weapon_values only) with developed builds, 60 seeds.
// node sim_r3.mjs <label>=<engine> ...
import { pathToFileURL } from 'node:url';
const { lib } = await import(pathToFileURL(new URL('./simlib.mjs', import.meta.url).pathname).href);
const EVO = { warrior: ['normal', 'defense'], mage: ['normal', 'arcane'], rogue: ['normal', 'precision'] };
const sit = { 'Elite-Bär L16': [15, { anchor: 'bear', type: 'elite', level: 16 }], 'Geist-Elite L17': [15, { anchor: 'spirit', type: 'elite', level: 17 }], '3 Goblins L17': [15, { anchor: 'goblin', count: 3, level: 17 }], 'Ghul-Lord L22': [20, { anchor: 'ghoul', type: 'boss', level: 22 }] };
for (const spec of process.argv.slice(2)) { const [label, root] = spec.split('='); const L = await lib(root);
  for (const cls of ['warrior', 'mage', 'rogue']) { const cells = Object.entries(sit).map(([k, [lv, foe]]) => { const r = L.rate({ cls, level: lv, gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, band: cls === 'mage' ? 'MEDIUM' : 'SHORT', build: 'aoe', prof: 5, learned: true, learnedProf: 3, potions: 3, evolution: EVO[cls], foe }); return `${k} ${r.win}/${r.hp}`; });
    console.log(`${label.padEnd(5)} ${cls.padEnd(7)} ${cells.join(' | ')}`); } }
