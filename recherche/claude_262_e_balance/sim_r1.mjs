// R1: tipping-point scenarios from the first report, re-run with standard vs AoE builds, proficiency, developed builds
// (4 skills, E class, E-fine gear, potions), start distances and a companion. 60 seeds. node sim_r1.mjs <analysis engine>
import { pathToFileURL } from 'node:url';
const { lib } = await import(pathToFileURL(new URL('./simlib.mjs', import.meta.url).pathname).href);
const L = await lib(process.argv[2]);
const EVO = { warrior: ['normal', 'defense'], mage: ['normal', 'arcane'], rogue: ['normal', 'precision'] };
const ALLY = { warrior: 'mage', mage: 'warrior', rogue: 'warrior' };
const egear = { weapon: 'fine', armor: 'fine', rank: 'E' };
const variants = (cls) => ({
  'B0 standard/P1 (Bericht 1)': { build: 'standard', policy: 'standard', prof: 1 },
  'B1 AoE/P1 taktisch': { build: 'aoe', prof: 1 },
  'B2 AoE/P3': { build: 'aoe', prof: 3 },
  'B3 AoE/P5': { build: 'aoe', prof: 5 },
  'B4 entwickelt (4 Skills P5/P3, E-Klasse, 3+3 Tränke)': { build: 'aoe', prof: 5, learned: true, learnedProf: 3, evolution: EVO[cls], potions: 3 },
  'B5 = B4 + Begleiter': { build: 'aoe', prof: 5, learned: true, learnedProf: 3, evolution: EVO[cls], potions: 3, ally: ALLY[cls] },
});
const scen = {
  'L15: 3 Goblins L17': { level: 15, foe: { anchor: 'goblin', count: 3, level: 17 } },
  'L15: 3 Goblins L15': { level: 15, foe: { anchor: 'goblin', count: 3, level: 15 } },
  'L15: 5 Wölfe L16': { level: 15, foe: { anchor: 'wolf', count: 5, level: 16 } },
  'L15: Elite-Bär L16': { level: 15, foe: { anchor: 'bear', type: 'elite', level: 16 } },
  'L15: 2 Bären L15': { level: 15, foe: { anchor: 'bear', count: 2, level: 15 } },
  'L20: Oger-Boss L20': { level: 20, foe: { anchor: 'ogre', type: 'boss', level: 20 } },
  'L20: Schamanen-Boss L22': { level: 20, foe: { anchor: 'goblin_shaman', type: 'boss', level: 22 } },
  'L20: Ghul-Lord L22': { level: 20, foe: { anchor: 'ghoul', type: 'boss', level: 22 } },
  'L10: 3 Goblins L10': { level: 10, foe: { anchor: 'goblin', count: 3, level: 10 } },
};
for (const [sk, s] of Object.entries(scen)) {
  console.log(`== ${sk} (win% / HP left% of wins; W | M | R)`);
  for (const [vk] of Object.entries(variants('warrior'))) {
    const cells = ['warrior', 'mage', 'rogue'].map(cls => { const v = variants(cls)[vk]; if (s.level < 15 && v.evolution) delete v.evolution;
      const r = L.rate({ cls, gear: s.level >= 15 ? egear : 'mixed', band: 'SHORT', ...v, level: s.level, foe: s.foe }); return `${String(r.win).padStart(3)}/${String(r.hp).padStart(3)}${r.aborted ? '!' + r.aborted : ''}`; });
    console.log(`  ${vk.padEnd(52)} ${cells.join(' | ')}`);
  }
}
console.log('\n== Startdistanz (B4 entwickelt, solo): win% je ENGAGED/SHORT/MEDIUM/LONG');
for (const [sk, s] of Object.entries({ 'L15: 3 Goblins L17': scen['L15: 3 Goblins L17'], 'L15: Elite-Bär L16': scen['L15: Elite-Bär L16'], 'L20: Ghul-Lord L22': scen['L20: Ghul-Lord L22'] }))
  for (const cls of ['warrior', 'mage', 'rogue']) console.log(`  ${sk} ${cls.padEnd(7)} ` + ['ENGAGED', 'SHORT', 'MEDIUM', 'LONG'].map(b => L.rate({ cls, gear: egear, band: b, ...variants(cls)['B4 entwickelt (4 Skills P5/P3, E-Klasse, 3+3 Tränke)'], level: s.level, foe: s.foe }).win).join(' / '));
