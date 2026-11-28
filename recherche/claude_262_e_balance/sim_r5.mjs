// R5: E class traits (none / normal / rare per offered direction) on developed L15 characters (AoE build P5, two learned
// skills P3, E-fine gear, 3+3 potions) across situations. 60 seeds. node sim_r5.mjs <analysis engine>
import { pathToFileURL } from 'node:url';
const { lib } = await import(pathToFileURL(new URL('./simlib.mjs', import.meta.url).pathname).href);
const L = await lib(process.argv[2]);
const DIRS = ['offense', 'defense', 'endurance', 'arcane', 'control', 'precision', 'mobility', 'hybrid'];
const sit = { 'Gruppe 3 Goblins L15': { anchor: 'goblin', count: 3, level: 15 }, 'Elite-Bär L16': { anchor: 'bear', type: 'elite', level: 16 },
  'Geist-Elite L17 (magisch)': { anchor: 'spirit', type: 'elite', level: 17 }, 'Ghul-Lord L22': { anchor: 'ghoul', type: 'boss', level: 22 } };
for (const cls of ['warrior', 'mage', 'rogue']) {
  const offered = []; for (const d of DIRS) { try { L.pc({ cls, level: 15, build: 'aoe', evolution: ['normal', d] }); offered.push(d); } catch { } }
  console.log(`== ${cls} (angebotene Richtungen bei ausgewogenem Build: ${offered.join(', ')})`);
  for (const [sk, foe] of Object.entries(sit)) {
    const cells = [];
    for (const evo of [null, ...offered.flatMap(d => [['normal', d], ['rare', d]])]) {
      const r = L.rate({ cls, level: 15, gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, band: cls === 'mage' ? 'MEDIUM' : 'SHORT', build: 'aoe', prof: 5, learned: true, learnedProf: 3, potions: 3, evolution: evo, foe });
      cells.push(`${evo ? evo[0][0] + ':' + evo[1] : 'ohne'} ${r.win}/${r.hp}`);
    }
    console.log(`  ${sk.padEnd(26)} ${cells.join(' | ')}`);
  }
}
