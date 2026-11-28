// Offline: effect of the existing E class evolution (none / normal / rare; offense or defense direction) at Level 15,
// through the product simulator setup (starter kit, real offerClass/acceptClass). 100 seeds. node sim_evolution.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2];
const { engine } = await import(pathToFileURL(path.join(root, 'tools/sim/balance/engine.mjs')).href);
const E = await engine(root);
const foes = { 'eliteBear-L15': { anchor: 'bear', type: 'elite', level: 15 }, 'goblin3-L12': { anchor: 'goblin', count: 3, level: 12 }, 'eliteGhoul-L18': { anchor: 'ghoul', type: 'elite', level: 18 } };
const dirs = { warrior: ['offense', 'defense', 'endurance'], mage: ['arcane', 'control', 'endurance'], rogue: ['precision', 'mobility', 'endurance'] };
for (const cls of ['warrior', 'mage', 'rogue']) for (const [fk, foe] of Object.entries(foes)) {
  const line = [];
  for (const evo of [null, ...dirs[cls].flatMap(d => [['normal', d], ['rare', d]])]) {
    const sc = { id: 'evo', original: { pc: { class: cls, level: 15, skills: E.builds[cls].skills, stats: E.builds[cls].balanced, ...(evo ? { evolution: evo[0], direction: evo[1] } : {}) }, opponent: foe, band: 'SHORT', tactic: 'skill' } };
    let w = 0, hp = 0, err = null;
    try { for (let s = 1; s <= 100; s++) { const r = E.fight(sc, s); if (r.outcome === 'win') { w++; hp += r.hpPct; } } } catch (e) { err = String(e.message).slice(0, 40); }
    line.push(`${evo ? evo.join(':') : 'none'} ${err ? 'n/a(' + err + ')' : `${w}%/${w ? (hp / w).toFixed(0) : 0}`}`);
  }
  console.log(`${cls} vs ${fk}: ${line.join(' | ')}`);
}
