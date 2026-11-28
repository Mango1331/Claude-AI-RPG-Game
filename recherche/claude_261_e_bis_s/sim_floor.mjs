// Offline: chained Dungeon floor runs of the three existing Dungeons (slots from content/lore.json, role types and
// spans from rules.living), solo and with one companion; HP/MP/STA carry over between encounters (no rest), counts at
// the upper end of each slot range, levels at the middle of each role span. 60 seeds. node sim_floor.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { engine } = await imp('tools/sim/balance/engine.mjs'); const E = await engine(root);
const { materialise } = await imp('src/engine.js'); const { applyEvent } = await imp('src/state.js'); const { Dice } = await imp('src/rng.js');
const { initEncounter, runCombat, terminal, alive } = await imp('src/combat.js'); const { scaleCreature } = await imp('src/npcgen.js');
const { deriveCharacter } = await imp('src/derived.js'); const { spansFor } = await imp('src/v4/living.js'); const { canFight } = await imp('src/party_line.js');
// PC policy in group combat: the product policy attacks the first living foe; in a party line that pair may be protected.
// Retarget to the first foe the PC may actually fight (engine canFight), else let the policy move.
const pcAct = (ctx) => { const a = E.policy(ctx, { tactic: 'skill' }); if (!a || !a.target || canFight(ctx.enc, 'pc', a.target)) return a; const t = Object.values(ctx.enc.combatants).find(x => x.side === 'hostile' && alive(x) && canFight(ctx.enc, 'pc', x.id)); return t ? { ...a, target: t.id } : { kind: 'move', dir: 'closer', target: a.target }; };
const lore = JSON.parse(fs.readFileSync(path.join(root, 'content/lore.json'))); const types = E.c.rules.living.role_type;
const typical = (l) => l <= 2 ? 'starter' : l <= 6 ? 'fine' : l <= 11 ? 'mixed' : l <= 14 ? { weapon: 'superior', armor: 'superior' } : { weapon: 'fine', armor: 'fine', rank: 'E' };
function encounter(sc, seed, carry) {
  const s = E.pcSheet(sc.cls, sc.level, 'balanced', typical(sc.level), 1); const c = E.c; const ids = [];
  if (carry?.pc) Object.assign(s.entities.pc.sheet, carry.pc);
  if (sc.ally) {
    s.rng.seed = seed; s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', template: 'adventurer', class: sc.ally, level: sc.level, status: 'alive', location: s.scene.location };
    materialise(s, c, new Dice(seed + 999), e => applyEvent(s, e), 'ally0'); const sh = s.entities.ally0.sheet; E.gear(sh, typical(sc.level));
    const d = deriveCharacter(sh, c); Object.assign(sh, { hp: d.maxHp, mp: d.maxMp, sta: d.maxSta }, carry?.ally || {});
    s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', sheet: sh, status: carry?.allyDead ? 'dead' : 'alive', location: s.scene.location };
    if (!carry?.allyDead) { s.scene.present = [...new Set([...(s.scene.present || []), 'pc', 'ally0'])]; s.party = { ...(s.party || {}), members: { ally0: { who: 'ally0', mode: 'follow', combat: true } } }; s.scene.positions.ally0 = { band: 'SHORT', cover: 'none' }; s.scene.awareness.ally0 = 'aware'; }
  }
  const a = c.anchors.get(sc.foe.anchor);
  for (let i = 0; i < sc.foe.count; i++) { const id = 'foe' + i; ids.push(id); s.entities[id] = { id, kind: 'creature', name: a.name, anchor: a.id, profile: scaleCreature(a, sc.foe.level, sc.foe.type, c), status: 'alive', location: s.scene.location }; s.scene.positions[id] = { band: 'SHORT', cover: 'none' }; s.scene.awareness[id] = 'aware'; }
  const ctx = { state: s, content: c, dice: new Dice(seed), c: true }; ctx.enc = initEncounter(s, c, ctx.dice, { actor: 'pc', target: ids[0], engage: true }, ids.map(id => ({ id, side: 'hostile' })), 'floor', { c: true });
  let steps = 0, retry = 0; while (!terminal(ctx.enc) && ctx.enc.round <= 100 && steps++ < 400) { const act = pcAct(ctx); const r = runCombat(ctx, act); if (r.illegal) { if (/No active hostile/.test(r.illegal) && retry++ < 3) continue; illegal++; (globalThis.__why ||= new Set()).add(String(r.illegal).slice(0, 120)); break; } retry = 0; }
  const pc = ctx.enc.combatants.pc, al = ctx.enc.combatants.ally0;
  const win = !pc.current.defeated && Object.values(ctx.enc.combatants).filter(x => x.side === 'hostile').every(x => !alive(x));
  return { win, carry: { pc: { hp: pc.current.hp, mp: pc.current.mp, sta: pc.current.sta }, ...(al ? { ally: { hp: al.current.hp, mp: al.current.mp, sta: al.current.sta }, allyDead: al.current.defeated } : { allyDead: carry?.allyDead }) }, hpPct: pc.current.hp / pc.fixed.max_hp };
}
let illegal = 0;
const pairs = { warrior: 'mage', mage: 'warrior', rogue: 'warrior' };
for (const d of lore.dungeons) for (const [n, f] of Object.entries(d.living.floors)) {
  const rank = (d.levels?.[n] || d.rank).min; const spans = spansFor(E.c, { min: rank, max: rank });
  const chain = f.slots.map(sl => ({ id: sl.id, foe: { anchor: sl.anchor, type: types[sl.role], count: Array.isArray(sl.count) ? sl.count[1] : 1, level: Math.round((spans[sl.role][0] + spans[sl.role][1]) / 2) } }));
  const pcLevels = rank === 'F' ? [5, 8, 10, 14] : [15, 18, 20, 24, 29];
  console.log(`== ${d.name} floor ${n} (${rank}): ` + chain.map(x => `${x.id} ${x.foe.anchor}${x.foe.count > 1 ? '×' + x.foe.count : ''} ${x.foe.type} L${x.foe.level}`).join(' → '));
  for (const cls of ['warrior', 'mage', 'rogue']) {
    const line = [];
    for (const L of pcLevels) for (const ally of [null, pairs[cls]]) {
      let full = 0, reach = 0; const N = 60;
      for (let seed = 1; seed <= N; seed++) { let carry = null, ok = true, k = 0; for (const step of chain) { const r = encounter({ cls, level: L, ally, foe: step.foe }, seed * 31 + k++, carry); if (!r.win) { ok = false; break; } carry = r.carry; reach++; } if (ok) full++; }
      line.push(`L${L}${ally ? '+' + ally[0].toUpperCase() : ''} ${Math.round(100 * full / N)}%`);
    }
    console.log(`  ${cls.padEnd(7)} ${line.join(' · ')}`);
  }
}
console.log('harness illegal actions (encounter aborted):', illegal, [...(globalThis.__why||[])]);
