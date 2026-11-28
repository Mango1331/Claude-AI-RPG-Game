// Offline balance matrix on a pinned engine checkout through the product's own sim adapter (tools/sim/balance/engine.mjs):
// real character creation, XP-derived levels, legal stat assignment, item profiles, creature scaling and combat.
// No product file is changed; 100 consecutive seeds per scenario. node sim_matrix.mjs <engine root> <matrix> <out.json>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const [root, matrix, out] = process.argv.slice(2);
const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href);
const E = await engine(root);
const classes = ['warrior', 'mage', 'rogue'];
// "Typical" gear path by level: what a player plausibly holds with today's content (E only from L15, legal rank).
const typical = (l) => l <= 2 ? 'starter' : l <= 6 ? 'fine' : l <= 11 ? 'mixed' : l <= 14 ? { weapon: 'superior', armor: 'superior' } : { weapon: 'fine', armor: 'fine', rank: 'E' };
const S = [];
const add = (id, sc) => S.push({ id, style: 'balanced', prof: 1, band: 'SHORT', tactic: 'skill', ...sc });
if (matrix === 'curve') {
  // A: same-level foes over the whole F/E band; does a fixed-level world keep any danger as the PC grows?
  for (const cls of classes) for (const level of [1, 3, 5, 7, 10, 14, 15, 20, 25, 29]) {
    const g = typical(level);
    for (const [k, foe] of Object.entries({ wolf: { anchor: 'wolf' }, bear: { anchor: 'bear' }, spirit: { anchor: 'spirit' }, armored: { anchor: 'armored_beast' },
      goblin3: { anchor: 'goblin', count: 3 }, wolf5: { anchor: 'wolf', count: 5 }, eliteBear: { anchor: 'bear', type: 'elite' }, bossArmored: { anchor: 'armored_beast', type: 'boss' } }))
      add(`curve-${cls}-L${level}-${k}`, { cls, level, gear: g, foe: { ...foe, level }, group: k });
  }
}
if (matrix === 'transition') {
  // B: F14 -> E15 -> E20 with gear variants against E-relevant foes (E dungeon spans: minion 15-19, guard 18-22, boss 20-24).
  const gears = { 'F-fine': 'fine', 'F-superior': { weapon: 'superior', armor: 'superior' }, 'F-exceptional': 'exceptional',
    'E-common': { weapon: 'common', armor: 'common', rank: 'E' }, 'E-fine': { weapon: 'fine', armor: 'fine', rank: 'E' }, 'E-superior': { weapon: 'superior', armor: 'superior', rank: 'E' },
    'Eweapon-fine+Farmor-exc': { weapon: 'fine', weaponRank: 'E', armor: 'exceptional', armorRank: 'F' }, 'Fweapon-exc+Earmor-fine': { weapon: 'exceptional', weaponRank: 'F', armor: 'fine', armorRank: 'E' } };
  const foes = { 'minion-goblin3-L17': { anchor: 'goblin', count: 3, level: 17 }, 'guard-eliteGhoul-L20': { anchor: 'ghoul', type: 'elite', level: 20 },
    'boss-ogre-L22': { anchor: 'ogre', type: 'boss', level: 22 }, 'wild-bear-L18': { anchor: 'bear', level: 18 }, 'wild-wolf6-L16': { anchor: 'wolf', count: 6, level: 16 }, 'spirit-elite-L19': { anchor: 'spirit', type: 'elite', level: 19 } };
  for (const cls of classes) for (const level of [14, 15, 20]) for (const [gk, g] of Object.entries(gears)) {
    if (level < 15 && (JSON.stringify(g).includes('"E"'))) continue;
    for (const [fk, foe] of Object.entries(foes)) add(`tr-${cls}-L${level}-${gk}-${fk}`, { cls, level, gear: g, foe, group: `${gk}|${fk}`, gearKey: gk, foeKey: fk });
  }
}
if (matrix === 'prof') {
  // C: proficiency and tactic at the transition (organic skill growth vs. raw level).
  for (const cls of classes) for (const prof of [1, 3, 5]) for (const tactic of ['basic', 'skill', 'max'])
    for (const [fk, foe] of Object.entries({ 'guard-eliteGhoul-L20': { anchor: 'ghoul', type: 'elite', level: 20 }, 'boss-ogre-L22': { anchor: 'ogre', type: 'boss', level: 22 } }))
      add(`pf-${cls}-P${prof}-${tactic}-${fk}`, { cls, level: 15, gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, prof, tactic, foe, group: fk });
}
if (matrix === 'style') {
  // D: stat style (offensive / balanced / defensive) at L10 and L20 against a group and a boss.
  for (const cls of classes) for (const level of [10, 20]) for (const style of ['offensive', 'balanced', 'defensive'])
    for (const [fk, foe] of Object.entries({ group: { anchor: 'goblin', count: 3, level }, boss: { anchor: 'bear', type: 'boss', level: level + 2 } }))
      add(`st-${cls}-L${level}-${style}-${fk}`, { cls, level, style, gear: typical(level), foe, group: fk });
}
const rows = []; const t = Date.now();
for (const sc of S) { const rr = []; for (let seed = 1; seed <= 100; seed++) rr.push(E.fight(sc, seed)); const s = E.summarize(sc, rr); rows.push({ ...sc, winPct: s.wins, lossPct: s.losses, aborts: s.aborts, errors: s.errors, meanRounds: +s.meanRounds.toFixed(2), winHpPct: s.wins ? +s.winHpPct.toFixed(1) : null, dmgPerAttack: +s.damagePerAttack.toFixed(1), takenPerStrike: +s.damageTakenPerStrike.toFixed(1), mitigation: +s.mitigation.toFixed(1), mp: +s.mp.toFixed(1), sta: +s.sta.toFixed(1) }); }
fs.writeFileSync(out, JSON.stringify({ matrix, engine: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version, seeds: [1, 100], scenarios: rows.length, seconds: (Date.now() - t) / 1000, rows }, null, 1));
console.log(matrix, rows.length, 'scenarios', (Date.now() - t) / 1000, 's', 'aborts', rows.reduce((n, r) => n + r.aborts, 0), 'errors', rows.reduce((n, r) => n + r.errors, 0));
