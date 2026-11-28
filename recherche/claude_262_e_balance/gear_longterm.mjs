// R3: long-term share of gear vs stats vs skill base in raw damage and of armor in protection, per rank band middle,
// for several weapon/armor scaling variants (analytic, product character() for stats, product scaleCreature for foes).
// Skill: F rank C1 bounds below E, E C1 bounds from E on (no D-S calibration exists; marked). node gear_longterm.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { load, character } = await imp('tools/sim/combat.mjs'); const c = await load(); const { scaleCreature } = await imp('src/npcgen.js');
const sd = c.rules.skill_design; const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const Fw = c.gear.instances.f_weapon_values; const ref = c.gear.f_rank_reference;
const W = {
  'W0 heute (E+1, ab D generisch)': (R, q) => R === 0 ? Fw[q] : R === 1 ? c.gear.instances.e_weapon_values[q] : Math.round((4 + { crude: 0, common: .35, fine: .7, superior: 1, exceptional: 1.25 }[q] * 6) * (1 + 0.75 * R)),
  'W1 +4 je Rang': (R, q) => Fw[q] + 4 * R,
  'W2 ×1,35 je Rang': (R, q) => Math.round(Fw[q] * 1.35 ** R),
  'W3 Anteil konstant (~25 %)': null,
};
const heavyRef = (q) => ref.heavy_armor_def[0] + { crude: 0, common: .35, fine: .7, superior: 1, exceptional: 1.25 }[q] * (ref.heavy_armor_def[1] - ref.heavy_armor_def[0]);
const A = { 'A0 heute ×(1+0,75R)': (R, q) => Math.round(heavyRef(q) * (1 + 0.75 * R)), 'A1 ×1,6 je Rang': (R, q) => Math.round(heavyRef(q) * 1.6 ** R), 'A2 +5 je Rang': (R, q) => Math.round(heavyRef(q) + 5 * R) };
console.log('Rang | Bandmitte | STR | Skill-Basis+Koef×STR (Kalibrierung) | Waffe fine je Variante (Anteil am Rohschaden) | Bär ATK | Rüstung common DEF je Variante (Anteil am eingehenden ATK, plus VIT/4)');
for (let R = 0; R < 7; R++) {
  const L = 7 + 15 * R; const sh = character(c, { class: 'warrior', level: L, skills: ['warrior.heavy_slash', 'warrior.guard'], stats: { STR: 2, VIT: 2, AGI: 1 } }).entities.pc.sheet;
  const cal = R === 0 ? sd.f_rank['1'] : sd.e_rank['1']; const skill = cal.base + cal.coef * sh.stats.STR;
  const cells = Object.entries(W).map(([k, f]) => { const w = f ? f(R, 'fine') : Math.round(skill / 3); return `${k.split(' ')[0]} ${w} (${Math.round(100 * w / (skill + w))} %)`; });
  const bear = scaleCreature(c.anchors.get('bear'), L, 'normal', c); const vit = Math.floor(sh.stats.VIT / 4);
  const ac = Object.entries(A).map(([k, f]) => { const d = f(R, 'common'); return `${k.split(' ')[0]} ${d} (${Math.round(100 * d / bear.atk)} %, gesamt ${Math.round(100 * (d + vit) / bear.atk)} %)`; });
  console.log(`${RANKS[R]} | L${L} | ${sh.stats.STR} | ${skill.toFixed(0)}${R > 1 ? ' (E-Kalibrierung, D–S fehlen)' : ''} | ${cells.join(' · ')} | ${bear.atk} | ${ac.join(' · ')}`);
}
console.log('\nPreisrichtwert Waffe fine nach heutiger Formel (Punkte×8×Qualitätsfaktor 1,25×(1+0,75R)) je Variante, gegen Vergütungsmitte (Content proposed) und Wolfbeute ×3^R');
const pay = { 0: 105, 1: 350, 2: 900, 3: 2400 };
for (let R = 0; R < 7; R++) { const cells = Object.entries(W).filter(([, f]) => f).map(([k, f]) => `${k.split(' ')[0]} ${Math.round(f(R, 'fine') * 8 * 1.25 * (1 + 0.75 * R))}`);
  console.log(`${RANKS[R]}: ${cells.join(' · ')} | Vergütung Mitte ${pay[R] ?? '–'} | Wolf ${12 * 3 ** R} cp | Preis ×2,5^R-Variante ${Math.round(140 * 2.5 ** R)}`); }
