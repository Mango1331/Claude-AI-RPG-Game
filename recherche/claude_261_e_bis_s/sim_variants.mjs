// Offline: compare content variants (analysis copies only) at the F/E transition. 100 seeds.
// node sim_variants.mjs <label>=<engine root> ...
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const specs = process.argv.slice(2).map(s => s.split('='));
const foes = { 'bear-L18': { anchor: 'bear', level: 18 }, 'eliteGhoul-L20': { anchor: 'ghoul', type: 'elite', level: 20 }, 'goblin2-L17': { anchor: 'goblin', count: 2, level: 17 }, 'eliteBear-L16': { anchor: 'bear', type: 'elite', level: 16 } };
for (const [label, root] of specs) {
  const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href + `?${label}`);
  const E = await engine(root); const out = [];
  for (const cls of ['warrior', 'mage', 'rogue']) for (const [gk, g] of Object.entries({ 'E-fine': { weapon: 'fine', armor: 'fine', rank: 'E' }, 'F-exc': 'exceptional' })) {
    const cells = Object.entries(foes).map(([fk, foe]) => { const sc = { id: 'v', cls, level: 15, style: 'balanced', prof: 1, band: 'SHORT', tactic: 'skill', gear: g, foe };
      let w = 0, hp = 0; for (let s = 1; s <= 100; s++) { const r = E.fight(sc, s); if (r.outcome === 'win') { w++; hp += r.hpPct; } } return `${fk} ${w}/${w ? Math.round(hp / w) : 0}`; });
    const sh = E.pcSheet(cls, 15, 'balanced', g, 1).entities.pc.sheet;
    out.push(`${cls} ${gk} [w${sh.equipment.weapon.atk || sh.equipment.weapon.matk} a${sh.equipment.armor.def}/${sh.equipment.armor.mdef}]: ${cells.join(' | ')}`);
  }
  console.log(`### ${label}\n` + out.join('\n'));
}
