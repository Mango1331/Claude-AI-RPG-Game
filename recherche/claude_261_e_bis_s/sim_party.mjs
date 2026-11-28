// Offline: solo vs. two-person party (PC + one following, combat-ready adventurer NPC materialised by the product at the
// same level, equipped like the PC; the NPC acts by the engine's own NPC policy). 60 seeds. node sim_party.mjs <analysis engine>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { engine } = await imp('tools/sim/balance/engine.mjs'); const E = await engine(root);
const { materialise } = await imp('src/engine.js'); const { applyEvent } = await imp('src/state.js'); const { Dice } = await imp('src/rng.js');
const { initEncounter, runCombat, terminal, alive } = await imp('src/combat.js'); const { scaleCreature } = await imp('src/npcgen.js');
const { deriveCharacter } = await imp('src/derived.js');
function setup(sc, seed) {
  const s = E.pcSheet(sc.cls, sc.level, 'balanced', sc.gear, 1); const c = E.c; const ids = [];
  if (sc.ally) {
    s.rng.seed = seed;
    s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', template: 'adventurer', class: sc.ally, level: sc.level, status: 'alive', location: s.scene.location };
    materialise(s, c, new Dice(seed + 999), e => applyEvent(s, e), 'ally0');
    const sh = s.entities.ally0.sheet; E.gear(sh, sc.gear); const d = deriveCharacter(sh, c); Object.assign(sh, { hp: d.maxHp, mp: d.maxMp, sta: d.maxSta });
    s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', sheet: sh, status: 'alive', location: s.scene.location };
    s.scene.present = [...new Set([...(s.scene.present || []), 'pc', 'ally0'])];
    s.party = { ...(s.party || {}), members: { ally0: { who: 'ally0', mode: 'follow', combat: true } } };
    s.scene.positions.ally0 = { band: sc.band, cover: 'none' }; s.scene.awareness.ally0 = 'aware';
  }
  const a = c.anchors.get(sc.foe.anchor);
  for (let i = 0; i < (sc.foe.count || 1); i++) { const id = 'foe' + i; ids.push(id); s.entities[id] = { id, kind: 'creature', name: a.name, anchor: a.id, profile: scaleCreature(a, sc.foe.level, sc.foe.type || 'normal', c), status: 'alive', location: s.scene.location }; s.scene.positions[id] = { band: sc.band, cover: 'none' }; s.scene.awareness[id] = 'aware'; }
  const dice = new Dice(seed); const enc = initEncounter(s, c, dice, { actor: 'pc', target: ids[0], engage: true }, ids.map(id => ({ id, side: 'hostile' })), 'party', { c: true });
  return { state: s, content: c, dice, enc, c: true };
}
function fight(sc, seed) {
  const ctx = setup(sc, seed); let steps = 0;
  while (!terminal(ctx.enc) && ctx.enc.round <= 100 && steps++ < 400) { const r = runCombat(ctx, E.policy(ctx, sc)); if (r.illegal) return { outcome: 'error' }; }
  const pc = ctx.enc.combatants.pc, al = ctx.enc.combatants.ally0, hostiles = Object.values(ctx.enc.combatants).filter(x => x.side === 'hostile');
  return { outcome: pc.current.defeated ? 'loss' : hostiles.every(x => !alive(x)) ? 'win' : 'other', allyIn: !!al, allyAlive: al ? !al.current.defeated : null, hp: pc.current.hp / pc.fixed.max_hp };
}
const pairs = { warrior: 'mage', mage: 'warrior', rogue: 'warrior' };
const foes = { 'goblin3-L17': { anchor: 'goblin', count: 3, level: 17 }, 'bear2-L17': { anchor: 'bear', count: 2, level: 17 }, 'eliteBear-L18': { anchor: 'bear', type: 'elite', level: 18 }, 'bossOgre-L20': { anchor: 'ogre', type: 'boss', level: 20 }, 'bossOgre-L22': { anchor: 'ogre', type: 'boss', level: 22 }, 'bossSkeleton-L22': { anchor: 'skeleton', type: 'boss', level: 22 } };
for (const L of [15, 20]) for (const cls of ['warrior', 'mage', 'rogue']) {
  const cells = [];
  for (const [fk, foe] of Object.entries(foes)) {
    const res = {};
    for (const ally of [null, pairs[cls]]) { const sc = { cls, level: L, gear: { weapon: 'fine', armor: 'fine', rank: 'E' }, band: 'SHORT', tactic: 'skill', foe, ally };
      let w = 0, inn = 0, aa = 0, err = 0; for (let s = 1; s <= 60; s++) { const r = fight(sc, s); if (r.outcome === 'win') w++; if (r.outcome === 'error') err++; if (r.allyIn) inn++; if (r.allyAlive) aa++; }
      res[ally ? 'party' : 'solo'] = `${Math.round(100 * w / 60)}${ally ? `(ally in ${inn}/60, alive ${aa})` : ''}${err ? ' err' + err : ''}`; }
    cells.push(`${fk}: solo ${res.solo} | +${pairs[cls]} ${res.party}`);
  }
  console.log(`== ${cls} L${L}\n  ` + cells.join('\n  '));
}
