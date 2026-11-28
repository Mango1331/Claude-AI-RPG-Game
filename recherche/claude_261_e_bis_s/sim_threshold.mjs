// Offline: for each class and PC level, sweep the foe level and record win rate (60 seeds) per encounter type.
// The highest foe level with >=90% / >=50% wins is the "comfortable" / "coin-flip" threshold. node sim_threshold.mjs <analysis engine> <out.json> [gearMode]
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const [root, out, gearMode = 'typical'] = process.argv.slice(2);
const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href);
const E = await engine(root);
const typical = (l) => l <= 2 ? 'starter' : l <= 6 ? 'fine' : l <= 11 ? 'mixed' : l <= 14 ? { weapon: 'superior', armor: 'superior' } : { weapon: 'fine', armor: 'fine', rank: 'E' };
const strong = (l) => l <= 14 ? 'exceptional' : { weapon: 'exceptional', armor: 'exceptional', rank: 'E' };
const gearOf = gearMode === 'strong' ? strong : typical;
const types = { bear: { anchor: 'bear' }, goblin3: { anchor: 'goblin', count: 3 }, wolf5: { anchor: 'wolf', count: 5 }, eliteBear: { anchor: 'bear', type: 'elite' }, bossOgre: { anchor: 'ogre', type: 'boss' } };
const res = [];
for (const cls of ['warrior', 'mage', 'rogue']) for (const L of [5, 10, 14, 15, 20, 25, 29]) for (const [tk, t] of Object.entries(types)) {
  const curve = [];
  for (let fl = Math.max(1, L - 14); fl <= L + 4; fl++) {
    const sc = { id: `th-${cls}-${L}-${tk}-${fl}`, cls, level: L, style: 'balanced', prof: 1, band: 'SHORT', tactic: 'skill', gear: gearOf(L), foe: { ...t, level: fl } };
    let w = 0; for (let s = 1; s <= 60; s++) if (E.fight(sc, s).outcome === 'win') w++;
    curve.push([fl, Math.round(100 * w / 60)]);
  }
  const best = (p) => curve.filter(([, x]) => x >= p).map(([f]) => f).reduce((a, b) => Math.max(a, b), 0);
  res.push({ cls, L, type: tk, comfortable90: best(90), coinflip50: best(50), curve });
}
fs.writeFileSync(out, JSON.stringify({ gearMode, rows: res }, null, 1)); console.log('done', res.length);
