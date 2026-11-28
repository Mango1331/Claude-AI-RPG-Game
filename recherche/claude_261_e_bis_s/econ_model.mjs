// Offline progression and economy model from product formulas/content (.261): XP per rank, quests/kills per rank,
// loot expected value per kill, payout guides vs gear guide values per rank. node econ_model.mjs <engine root>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const c = await (await imp('tests/helpers.js')).loadProductContent();
const { defeatXp, questXp } = await imp('src/progression.js');
const { itemProfile } = await imp('src/v4/items.js');
const bands = c.rules.ranks.bands, per = c.rules.progression.xp_to_next_per_level;
console.log('## XP per rank band (rank-invariance check)');
console.log('rank band | XP within band | std quests @mid | dangerous @mid | same-level kills @mid | kills @mid-4 (same rank)');
for (const b of bands) {
  let need = 0; for (let l = b.min; l <= b.max; l++) need += l * per;
  const mid = b.min + 7;
  console.log(`${b.rank} ${b.min}-${b.max} | ${need} | ${(need / questXp(mid, 'standard', c)).toFixed(1)} | ${(need / questXp(mid, 'dangerous', c)).toFixed(1)} | ${(need / defeatXp(mid, 'normal', b.rank, c)).toFixed(1)} | ${(need / defeatXp(mid - 4, 'normal', b.rank, c)).toFixed(1)}`);
}
console.log('\n## Rank-gap cliff at the F/E border: XP per normal kill for a PC of level 14 vs 15');
for (const f of [8, 11, 14, 15, 17, 20]) console.log(`foe L${f}: PC F14 ${defeatXp(f, 'normal', 'F', c)} | PC E15 ${defeatXp(f, 'normal', 'E', c)} | need for next level F14 ${14 * per}, E15 ${15 * per}`);
console.log('\n## Quest XP has no rank gap: standard contract XP by recommended level');
console.log([1, 7, 14, 15, 22, 29].map(l => `L${l}:${questXp(l, 'standard', c)}`).join(' '));
console.log('\n## Loot expected value per kill (mean qty x value x 3^rankIndex), coin creatures excluded');
const L = c.monsters.loot, fac = L.rank_value_factor;
const mats = (a) => { const x = L.anchors[a]; return Array.isArray(x) ? x : (x?.materials || []); };
const ev = (a) => mats(a).filter(x => !x.only_if).reduce((n, x) => n + (x.qty[0] + x.qty[1]) / 2 * x.value_cp, 0);
for (const a of ['wolf', 'boar', 'bear', 'goblin', 'armored_beast', 'spirit', 'ogre', 'skeleton', 'slime']) console.log(`${a}: F ${ev(a).toFixed(1)} | E ${(ev(a) * fac).toFixed(1)} | D ${(ev(a) * fac ** 2).toFixed(1)} | S ${(ev(a) * fac ** 6).toFixed(0)}`);
console.log('\n## Contract payout guide vs gear guide value at the same rank (weapon + armor of one quality)');
const pg = c.rules.guild.board.payout_guide_cp, gr = c.rules.guild.rank_power;
for (const [g, r] of Object.entries(gr)) {
  const v = (q) => itemProfile(c, { name: `${q} ${r}-Rank longsword`, balance: true }).value_cp + itemProfile(c, { name: `${q} ${r}-Rank heavy armor`, balance: true }).value_cp;
  const pay = pg[g]; const mid = pay ? (pay[0] + pay[1]) / 2 : null;
  console.log(`${g}/${r}: payout ${pay ? pay.join('-') : 'n/a'} (mid ${mid ?? '-'}) | set common ${v('common')} fine ${v('fine')} superior ${v('superior')} exceptional ${v('exceptional')} | contracts per fine set ${mid ? (v('fine') / mid).toFixed(2) : '-'}`);
}
