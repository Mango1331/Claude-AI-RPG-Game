// R5 variant O1: offensive E directions with doubled ATK/MATK bonus (normal +8 instead of +4, rare +12 instead of +6),
// modelled as the trait plus an extra +4/+6 on the weapon. 60 seeds. node sim_r5b.mjs <analysis engine>
import { pathToFileURL } from 'node:url';
const { lib } = await import(pathToFileURL(new URL('./simlib.mjs', import.meta.url).pathname).href);
const L = await lib(process.argv[2]);
const OFF = { warrior: 'offense', mage: 'arcane', rogue: 'precision' };
const sit = { 'Gruppe 3 Goblins L15': { anchor: 'goblin', count: 3, level: 15 }, 'Elite-Bär L16': { anchor: 'bear', type: 'elite', level: 16 }, 'Geist-Elite L17': { anchor: 'spirit', type: 'elite', level: 17 }, 'Ghul-Lord L22 (L20 PC)': { anchor: 'ghoul', type: 'boss', level: 22, pc: 20 } };
for (const cls of ['warrior', 'mage', 'rogue']) for (const [sk, f] of Object.entries(sit)) {
  const { pc: lv = 15, ...foe } = f; const base = { cls, level: lv, gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, band: cls === 'mage' ? 'MEDIUM' : 'SHORT', build: 'aoe', prof: 5, learned: true, learnedProf: 3, potions: 3, foe };
  const r = (x) => { const v = L.rate({ ...base, ...x }); return `${v.win}/${v.hp}`; };
  console.log(`${cls.padEnd(7)} ${sk.padEnd(24)} heute n:${r({ evolution: ['normal', OFF[cls]] })} r:${r({ evolution: ['rare', OFF[cls]] })} | O1 n:${r({ evolution: ['normal', OFF[cls]], offenseBonus: 4 })} r:${r({ evolution: ['rare', OFF[cls]], offenseBonus: 6 })} | defense n:${r({ evolution: ['normal', 'defense'] })} r:${r({ evolution: ['rare', 'defense'] })}`);
}
