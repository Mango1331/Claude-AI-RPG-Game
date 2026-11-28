// Offline: calibrated Skill bounds (rules.skill_design F/E, proficiency power) evaluated on the real main stat of a
// balanced build (product character()); raw = base + coef_sum x stat (+ weapon ATK where used), before defense.
// node skill_compare.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2];
const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href); const E = await engine(root);
const sd = E.c.rules.skill_design, pf = E.c.rules.proficiency.levels;
const { scaleCreature } = await import(pathToFileURL(path.join(root, 'src/npcgen.js')).href);
for (const L of [14, 15, 20, 29]) {
  const st = E.pcSheet('warrior', L, 'balanced', 'starter', 1).entities.pc.sheet.stats.STR;
  const raw = (t, c) => t[c].base + t[c].coef * st;
  const cells = [];
  for (const c of ['1', '2', '3']) cells.push(`C${c}: F P1 ${raw(sd.f_rank, c).toFixed(0)} · F P5 ${(raw(sd.f_rank, c) * pf['5'].power).toFixed(0)} · E P1 ${raw(sd.e_rank, c).toFixed(0)} (cost F ${sd.f_rank[c].cost.join('-')} / E ${sd.e_rank[c].cost.join('-')})`);
  const bear = scaleCreature(E.c.anchors.get('bear'), L, 'normal', E.c);
  console.log(`L${L} STR ${st} | ${cells.join(' | ')} | same-level bear HP ${bear.max_hp} DEF ${bear.def}`);
}
