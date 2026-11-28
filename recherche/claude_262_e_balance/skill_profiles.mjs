// R4: real starter-pool skill profiles evaluated on real stats (balanced build, product character()/deriveCharacter) with
// weapon share, proficiency power/cost factors, range, area and resource economy; plus E design variants for one
// function (Heavy Slash family) built from the calibrated bounds. Raw = base + sum(coef x stat) + weapon x share.
// node skill_profiles.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { load, character } = await imp('tools/sim/combat.mjs'); const c = await load(); const { deriveCharacter } = await imp('src/derived.js');
const pf = c.rules.proficiency.levels, sd = c.rules.skill_design;
const POOL = { warrior: ['warrior.basic_attack', 'warrior.heavy_slash', 'warrior.quick_slash', 'warrior.charge', 'warrior.cleave'], mage: ['mage.basic_attack', 'mage.arcane_bolt', 'mage.flame_lance', 'mage.arcane_wave'], rogue: ['rogue.basic_attack', 'rogue.razor_cut', 'rogue.piercing_thrust', 'rogue.long_lunge', 'rogue.guarded_cut', 'rogue.fan_of_blades'] };
const W = { 'E heute': 15, 'E F×1,4': 20 };
const stats = (cls, L) => { const s = character(c, { class: cls, level: L, skills: [POOL[cls][1], POOL[cls][2]], stats: { warrior: { STR: 2, VIT: 2, AGI: 1 }, mage: { INT: 2, WIL: 1, VIT: 2 }, rogue: { AGI: 2, PER: 1, VIT: 2 } }[cls] }).entities.pc.sheet; return { st: s.stats, d: deriveCharacter(s, c) }; };
for (const L of [15, 22]) for (const cls of Object.keys(POOL)) {
  const { st, d } = stats(cls, L); const res = cls === 'mage' ? `MP ${d.maxMp}` : `STA ${d.maxSta}`;
  console.log(`== ${cls} L${L} (${Object.entries(st).map(([k, v]) => k + v).join(' ')}; ${res})`);
  for (const id of POOL[cls]) { const k = c.skills.get(id); const a = k.attack; const statPart = a.scaling.reduce((n, t) => n + t.coef * st[t.stat], 0);
    const cells = Object.entries(W).map(([wk, w]) => { const raw = a.base + statPart + w * (a.share ?? 1); return `${wk}: Roh ${raw.toFixed(0)} (Waffe ${Math.round(100 * w / raw)} %)`; });
    const cost = k.cost.amount; const pool = cls === 'mage' ? d.maxMp : d.maxSta;
    const p = (n) => { const raw = a.base + statPart + 20 * (a.share ?? 1); return `P${n} ${Math.round(raw * pf[n].power)}/${cost ? Math.round(cost * pf[n].cost) : 0}`; };
    console.log(`  ${id.padEnd(24)} C${k.complexity} ${k.range?.band}${k.range?.area ? ' Fläche ' + k.range.area : ''}${k.range?.extra_band ? ' +Band' : ''} | ${cells.join(' · ')} | ${[1, 3, 5].map(p).join(' · ')} (Roh/Kosten mit Waffe 20; Kosten jeweils Untergrenze des Kostenbands) | Einsätze je Vorrat ${cost ? Math.floor(pool / cost) : '∞'}`);
  }
}
console.log('\n== E-Varianten einer Funktion (Warrior, schwerer Einzelschlag), L22, Waffe 20, STR aus character(); Kosten = Untergrenze des Bands');
const { st } = stats('warrior', 22); const raw = (cal, w = 20) => cal.base + cal.coef * st.STR + w;
const rows = [
  ['F-C1 Heavy Slash P1 (Content)', 10 + 1.5 * st.STR + 20, 1, 7],
  ['F-C1 Heavy Slash P5', 10 + 1.5 * st.STR + 20, 5, 7],
  ['F-C3 Obergrenze P5 (z. B. nach zwei Evolutionen, P geerbt)', raw(sd.f_rank['3']), 5, sd.f_rank['3'].cost[0]],
  ['E-C1 Obergrenze P1 (neu gelernt)', raw(sd.e_rank['1']), 1, sd.e_rank['1'].cost[0]],
  ['E-C1 Obergrenze P5', raw(sd.e_rank['1']), 5, sd.e_rank['1'].cost[0]],
  ['S-C: F-C3 P5 → E-C3 (Rang-Evolution, P geerbt)', raw(sd.e_rank['3']), 5, sd.e_rank['3'].cost[0]],
  ['E-C3 Obergrenze P1', raw(sd.e_rank['3']), 1, sd.e_rank['3'].cost[0]],
];
for (const [k, r, p, cost] of rows) console.log(`  ${k.padEnd(58)} Roh×P ${Math.round(r * pf[p].power)} · Kosten ${Math.round(cost * pf[p].cost)} · Einsätze je 100 STA ${Math.floor(100 / Math.max(1, Math.round(cost * pf[p].cost)))}`);
console.log('\nSTA-Vorrat Mensch fest:', c.rules.derived.max_sta_human, '| MP = 8×INT + 4×WIL wächst mit Stats');
