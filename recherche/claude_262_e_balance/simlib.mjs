// Offline simulation library for the .262 balance review (analysis copy of the product; only the simulator's level and
// evolution-level guards are widened). Everything is resolved by product functions: character() (creation, XP levels,
// stat assignment, offerClass/acceptClass), itemProfile, restore items, scaleCreature, materialise, initEncounter,
// runCombat, attackAction/skillAction/itemAction legality checks and the engine's own NPC policy.
import { pathToFileURL } from 'node:url'; import path from 'node:path';
export async function lib(root) {
  const imp = p => import(pathToFileURL(path.join(root, p)).href);
  const { engine } = await imp('tools/sim/balance/engine.mjs'); const E = await engine(root);
  const { character } = await imp('tools/sim/combat.mjs');
  const { materialise } = await imp('src/engine.js'); const { applyEvent } = await imp('src/state.js'); const { Dice } = await imp('src/rng.js');
  const C = await imp('src/combat.js'); const { scaleCreature } = await imp('src/npcgen.js'); const { deriveCharacter } = await imp('src/derived.js');
  const { canFight } = await imp('src/party_line.js'); const { skillOf } = await imp('src/content.js');
  const c = E.c;
  const BUILDS = {
    standard: { warrior: ['warrior.heavy_slash', 'warrior.guard'], mage: ['mage.arcane_bolt', 'mage.arcane_ward'], rogue: ['rogue.razor_cut', 'rogue.piercing_thrust'] },
    aoe: { warrior: ['warrior.cleave', 'warrior.guard'], mage: ['mage.arcane_wave', 'mage.arcane_ward'], rogue: ['rogue.fan_of_blades', 'rogue.evasive_step'] },
  };
  // "developed" = the two AoE/defence starters plus two learned F pool techniques (a real later state: teachers/primers)
  const LEARNED = { warrior: ['warrior.heavy_slash', 'warrior.deflect'], mage: ['mage.flame_lance', 'mage.focused_ward'], rogue: ['rogue.piercing_thrust', 'rogue.guarded_cut'] };
  const DEF = new Set(['warrior.guard', 'warrior.deflect', 'mage.arcane_ward', 'mage.focused_ward', 'rogue.evasive_step']);
  function pc(o) {
    const { cls, level, build = 'standard', style = 'balanced', prof = 1, learnedProf = null, learned = false, evolution = null, gear = 'starter', potions = 0 } = o;
    const s = character(c, { class: cls, level, skills: BUILDS[build][cls], stats: E.builds[cls][style], ...(evolution ? { evolution: evolution[0], direction: evolution[1] } : {}) });
    const sh = s.entities.pc.sheet;
    for (const k of Object.values(sh.skills)) k.prof = prof;
    if (learned) for (const id of LEARNED[cls]) if (!sh.skills[id]) sh.skills[id] = { prof: learnedProf ?? Math.max(1, prof - 2), pp: 0 };
    E.gear(sh, gear);
    // variant O1 (analysis only): an offensive class trait worth twice its stat bonus, modelled as extra weapon ATK/MATK
    if (o.offenseBonus && sh.equipment.weapon) { const w = { ...sh.equipment.weapon }; if (w.matk) w.matk += o.offenseBonus; else w.atk += o.offenseBonus; sh.equipment.weapon = w; }
    if (potions) { const r = level >= 15 ? 'E-Rank ' : ''; s.objects['obj.sim.hp'] = { id: 'obj.sim.hp', name: `${r}Healing Potion`, holder: { entity: 'pc' }, qty: potions };
      s.objects['obj.sim.res'] = { id: 'obj.sim.res', name: cls === 'mage' ? `${r}Mana Potion` : `${r}Stamina Tonic`, holder: { entity: 'pc' }, qty: potions }; }
    const d = deriveCharacter(sh, c); Object.assign(sh, { hp: d.maxHp, mp: d.maxMp, sta: d.maxSta });
    return s;
  }
  function setup(sc, seed, carry = null) {
    const s = pc(sc); const ids = [];
    if (carry?.pc) { Object.assign(s.entities.pc.sheet, carry.pc); for (const [id, q] of Object.entries(carry.items || {})) if (s.objects[id]) s.objects[id].qty = q; }
    if (sc.ally && !carry?.allyDead) {
      s.rng.seed = seed; s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', template: 'adventurer', class: sc.ally, level: sc.level, status: 'alive', location: s.scene.location };
      materialise(s, c, new Dice(seed + 999), e => applyEvent(s, e), 'ally0'); const sh = s.entities.ally0.sheet; E.gear(sh, sc.gear);
      const d = deriveCharacter(sh, c); Object.assign(sh, { hp: d.maxHp, mp: d.maxMp, sta: d.maxSta }, carry?.ally || {});
      s.entities.ally0 = { id: 'ally0', kind: 'npc', name: 'companion', sheet: sh, status: 'alive', location: s.scene.location };
      s.scene.present = [...new Set([...(s.scene.present || []), 'pc', 'ally0'])]; s.party = { ...(s.party || {}), members: { ally0: { who: 'ally0', mode: 'follow', combat: true } } };
      s.scene.positions.ally0 = { band: sc.band || 'SHORT', cover: 'none' }; s.scene.awareness.ally0 = 'aware';
    }
    for (const [gi, g] of (sc.foes || [sc.foe]).entries()) { const a = c.anchors.get(g.anchor);
      for (let i = 0; i < (g.count || 1); i++) { const id = `foe${gi}_${i}`; ids.push(id); s.entities[id] = { id, kind: 'creature', name: a.name, anchor: a.id, profile: scaleCreature(a, g.level, g.type || 'normal', c), status: 'alive', location: s.scene.location }; s.scene.positions[id] = { band: sc.band || 'SHORT', cover: 'none' }; s.scene.awareness[id] = 'aware'; } }
    const ctx = { state: s, content: c, dice: new Dice(seed), c: true };
    ctx.enc = C.initEncounter(s, c, ctx.dice, { actor: 'pc', target: ids[0], engage: true }, ids.map(id => ({ id, side: 'hostile' })), 'r2', { c: true });
    return ctx;
  }
  const trial = (ctx) => ({ ...ctx, enc: structuredClone(ctx.enc), state: structuredClone(ctx.state), dice: new Dice(ctx.dice.seed, ctx.dice.n) });
  // Tactical player policy: potion/defence when low, area attack when 2+ foes, else the strongest legal single attack on
  // the weakest foe it may fight. Legality is tested on private copies (no draw consumed).
  function tactical(ctx, last) {
    const me = ctx.enc.combatants.pc; const foes = Object.values(ctx.enc.combatants).filter(x => x.side === 'hostile' && C.alive(x) && canFight(ctx.enc, 'pc', x.id)).sort((a, b) => a.current.hp - b.current.hp);
    if (!foes.length) return null;
    const known = Object.keys(me.fixed.actions).map(id => skillOf(c, id, ctx.state)).filter(Boolean);
    const low = me.current.hp / me.fixed.max_hp;
    const tryAct = (a) => { const t = trial(ctx); const r = a.kind === 'attack' ? C.attackAction(t, 'pc', a.target, a.skill, { move: a.move }) : a.kind === 'skill' ? C.skillAction(t, 'pc', a.skill, {}) : C.itemAction(t, 'pc', a, { validateOnly: true }); return r && !r.illegal; };
    if (low < 0.4) {
      const hp = ctx.state.objects?.['obj.sim.hp']; if (hp?.qty > 0) { const a = { kind: 'item', item: 'obj.sim.hp' }; if (tryAct(a)) return a; }
      if (!DEF.has(last)) for (const k of known.filter(k => DEF.has(k.id))) { const a = { kind: 'skill', skill: k.id }; if (tryAct(a)) return a; }
    }
    const resKey = me.fixed.actions['mage.basic_attack'] ? 'mp' : 'sta';
    if (me.current[resKey] / Math.max(1, me.fixed['max_' + resKey]) < 0.15) { const r = ctx.state.objects?.['obj.sim.res']; if (r?.qty > 0) { const a = { kind: 'item', item: 'obj.sim.res' }; if (tryAct(a)) return a; } }
    if (foes.length >= 2) for (const k of known.filter(k => k.attack && (k.effects || []).some(e => e.kind === 'area'))) for (const f of foes) { const a = { kind: 'attack', skill: k.id, target: f.id, move: 'closer' }; if (tryAct(a)) return a; }
    for (const f of foes) { const prev = C.damagePreview(ctx.enc, c, f.id, ctx.state).filter(p => !(skillOf(c, p.skill, ctx.state)?.effects || []).some(e => e.kind === 'area')).sort((a, b) => (b.min + b.max) * (b.strikes || 1) - (a.min + a.max) * (a.strikes || 1));
      for (const p of prev) { const a = { kind: 'attack', skill: p.skill, target: f.id, move: 'closer' }; if (tryAct(a)) return a; } }
    return { kind: 'move', dir: 'closer', target: foes[0].id };
  }
  function fight(sc, seed, carry = null) {
    const ctx = setup(sc, seed, carry); let steps = 0, retry = 0, last = null, aborted = false;
    while (!C.terminal(ctx.enc) && ctx.enc.round <= 100 && steps++ < 400) {
      const act = sc.policy === 'standard' ? E.policy(ctx, { tactic: 'skill' }) : tactical(ctx, last);
      const r = C.runCombat(ctx, act);
      if (r.illegal) { if (retry++ < 3) continue; aborted = true; break; }
      retry = 0; last = act?.skill || act?.kind;
      if (act?.kind === 'item') { const o = ctx.state.objects[act.item]; if (o) o.qty = Math.max(0, (o.qty || 1) - 1); }
    }
    const p = ctx.enc.combatants.pc, al = ctx.enc.combatants.ally0;
    const win = !p.current.defeated && Object.values(ctx.enc.combatants).filter(x => x.side === 'hostile').every(x => !C.alive(x));
    return { win, aborted, rounds: ctx.enc.round, hpPct: p.current.hp / p.fixed.max_hp, potionsLeft: ctx.state.objects?.['obj.sim.hp']?.qty ?? 0,
      carry: { pc: { hp: p.current.hp, mp: p.current.mp, sta: p.current.sta }, items: Object.fromEntries(Object.entries(ctx.state.objects || {}).filter(([id]) => id.startsWith('obj.sim')).map(([id, o]) => [id, o.qty])),
        ...(al ? { ally: { hp: al.current.hp, mp: al.current.mp, sta: al.current.sta }, allyDead: al.current.defeated } : { allyDead: carry?.allyDead }), max: { hp: p.fixed.max_hp, mp: p.fixed.max_mp, sta: p.fixed.max_sta }, allyMax: al ? { hp: al.fixed.max_hp, mp: al.fixed.max_mp, sta: al.fixed.max_sta } : carry?.allyMax } };
  }
  // Rest between encounters by the product's recovery rates (rules.recovery.per_hour_pct), never above the maximum.
  function rest(carry, hours) {
    if (!hours) return carry; const pct = c.rules.recovery.per_hour_pct; const out = structuredClone(carry);
    const heal = (cur, max) => { for (const k of ['hp', 'mp', 'sta']) cur[k] = Math.min(max[k], cur[k] + Math.floor(max[k] * pct[k] * hours / 100)); };
    heal(out.pc, carry.max); if (out.ally && carry.allyMax && !carry.allyDead) heal(out.ally, carry.allyMax); return out;
  }
  function rate(sc, n = 60, seed0 = 1) { let w = 0, hp = 0, ab = 0; for (let s = seed0; s < seed0 + n; s++) { const r = fight(sc, s); if (r.aborted) ab++; if (r.win) { w++; hp += r.hpPct; } } return { win: Math.round(100 * w / n), hp: w ? Math.round(100 * hp / w) : 0, aborted: ab }; }
  function chain(base, steps, { n = 60, restHours = 0 } = {}) { let full = 0, ab = 0;
    for (let seed = 1; seed <= n; seed++) { let carry = null, ok = true, k = 0;
      for (const st of steps) { const r = fight({ ...base, foe: st }, seed * 31 + k++, carry); if (r.aborted) ab++; if (!r.win) { ok = false; break; } carry = rest(r.carry, restHours); }
      if (ok) full++; }
    return { full: Math.round(100 * full / n), aborted: ab }; }
  return { E, c, pc, fight, rate, chain, BUILDS, LEARNED };
}
