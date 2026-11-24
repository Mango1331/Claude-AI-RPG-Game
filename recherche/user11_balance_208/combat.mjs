/* node combat.mjs /path/to/cb1eb944/avereth-engine /path/to/User11-chat.jsonl > kampf.json */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

const [root, chatPath] = process.argv.slice(2);
const source = 'cb1eb944a041b26be9210199d780be9ff740f74d';
assert.equal(execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), source);
const raw = fs.readFileSync(chatPath);
assert.equal(
  createHash('sha256').update(raw).digest('hex'),
  '534059d2e42c13148f35dcd58559047c4f1636e55ee5a71a0b5e6612ac991e8c',
);
const load = (name) => import(pathToFileURL(path.resolve(root, name)));
const { foldChat } = await load('src/host.js');
const { loadProductContent } = await load('tests/helpers.js');
const { playerTurn } = await load('src/engine.js');
const { validateActionSelection } = await load('src/action_input.js');
const { initEncounter, runCombat } = await load('src/combat.js');
const { Dice } = await load('src/rng.js');
const { itemProfile } = await load('src/v4/items.js');
const content = await loadProductContent();
const chat = raw.toString('utf8').trim().split('\n').map(JSON.parse).slice(1);
const first = foldChat(chat.slice(0, 23)).state,
  second = foldChat(chat.slice(0, 25)).state;
const ids = first.scene.present.filter((id) => id !== 'pc');
const move = { id: 'step', kind: 'move', dir: 'away', target: null },
  dodge = { id: 'dodge', kind: 'sidestep' };
const attack = (id, band) => ({
  id: 'wave',
  kind: 'attack',
  skill: 'mage.arcane_wave',
  target: id,
  approach: false,
  band,
});
const phase = (...steps) => ({ id: 'phase', kind: 'phase', steps });
function strikes(records, side) {
  return records
    .filter((r) => r.kind === 'attack' && (side === 'pc') === (r.actor === 'pc'))
    .flatMap((r) => r.strikes);
}
function measureOriginal(state, selection) {
  const checked = validateActionSelection(selection, state, content);
  if (!checked.ok) return { refused: checked.reason };
  const r = playerTurn(state, content, 'declared HUD phase', { intent: checked.mapped.intent, c: true });
  const pc = r.state.entities.pc.sheet,
    out = r.outcome.records;
  return {
    hp: pc.hp,
    mp: pc.mp,
    pcDamage: strikes(out, 'pc').map((h) => h.final),
    incoming: strikes(out, 'enemy').map((h) => h.final),
    kills: strikes(out, 'pc').filter((h) => h.hp_after <= 0).length,
    covered: strikes(out, 'enemy').filter((h) => h.cover).length,
    own: out.filter((a) => a.actor === 'pc').map((a) => [a.kind, a.area_band ?? a.change ?? null]),
    state: r.state,
  };
}
const archived = {};
for (const [turn, state, band] of [
  ['T12', first, 'SHORT'],
  ['T13', second, 'ENGAGED'],
]) {
  const wave = attack(ids[0], band);
  for (const [k, sel] of Object.entries({
    wave,
    afterStep: phase(wave, move),
    beforeStep: phase(move, wave),
    afterDodge: phase(wave, dodge),
    beforeDodge: phase(dodge, wave),
  })) {
    const { state: next, ...res } = measureOriginal(state, sel);
    if (turn === 'T12' && next?.encounter && next.entities.pc.sheet.hp > 0) {
      const target = Object.values(next.encounter.combatants).find(
        (c) => c.side === 'hostile' && !c.current.defeated,
      );
      if (target) {
        const { state: unused, ...cont } = measureOriginal(
          next,
          phase(attack(target.id, target.current.band), dodge),
        );
        res.next = cont;
      }
    }
    (archived[turn] ??= {})[k] = res;
  }
}
assert.deepEqual(archived.T12.wave.pcDamage, [24, 24, 27]);
assert.deepEqual(archived.T12.wave.incoming, [17, 12, 9, 15, 11, 8]);
assert.deepEqual(archived.T13.afterDodge.pcDamage, [24, 27, 23]);
assert.deepEqual(archived.T13.afterDodge.incoming, [17]);

// Synthetic matched normal turns. Keep the three recorded F monster sheets and real NPC decision code.
// Initialize at the PC's actual slot in the regular initiative rotation, no First Strike or fresh initiative.
function scenario(def, seed) {
  const state = structuredClone(first);
  state.rng = { seed, n: 0 };
  const selected = def.ranges.map((_, i) => ids[i]);
  const enc = initEncounter(
    state,
    content,
    Dice.from(state),
    { actor: 'pc', target: selected[0], engage: true },
    selected.map((id) => ({ id, side: 'hostile' })),
    'enc.balance208',
    { c: true },
  );
  enc.round = 1;
  enc.round_marker = 1;
  enc.trigger_done = true;
  enc.current = 'pc';
  enc.turn_index = enc.order.indexOf('pc');
  state.encounter = enc;
  for (const [i, id] of selected.entries()) {
    const c = enc.combatants[id];
    c.current.band = def.band;
    c.fixed.attack = { ...c.fixed.attack, range: def.ranges[i] };
  }
  if (def.cover) enc.combatants.pc.current.cover = 'partial';
  if (def.potion) {
    enc.combatants.pc.current.hp = 40;
    state.entities.pc.sheet.hp = 40;
    state.objects['obj.potion'] = {
      id: 'obj.potion',
      qty: 1,
      name: 'minor healing potion',
      holder: { entity: 'pc' },
      profile: itemProfile(content, { name: 'minor healing potion', kind: 'item' }),
    };
  }
  for (const skill of ['mage.blink', 'rogue.evasive_step', 'ranger.quickstep', 'warrior.guard']) {
    // Isolate the marginal tactical effects on the same sheet. This is not an obtainable starting build.
    state.entities.pc.sheet.skills[skill] = { prof: 1, pp: 0 };
    enc.combatants.pc.fixed.actions[skill] = { prof: 1 };
  }
  return { state, enc, c: true, content, dice: Dice.from(state) };
}

const scenarios = {
  melee1: { ranges: ['ENGAGED'], band: 'SHORT' },
  melee3: { ranges: ['ENGAGED', 'ENGAGED', 'ENGAGED'], band: 'SHORT' },
  archers3: { ranges: ['MEDIUM', 'MEDIUM', 'MEDIUM'], band: 'SHORT' },
  mixed3: { ranges: ['ENGAGED', 'ENGAGED', 'MEDIUM'], band: 'SHORT' },
  covered: { ranges: ['MEDIUM'], band: 'SHORT', cover: true },
  far: { ranges: ['ENGAGED', 'ENGAGED', 'ENGAGED'], band: 'MEDIUM' },
  potion: { ranges: ['ENGAGED', 'ENGAGED', 'MEDIUM'], band: 'SHORT', potion: true },
  guard: { ranges: ['ENGAGED', 'ENGAGED', 'MEDIUM'], band: 'SHORT', guard: true },
};
const seeds = Array.from({ length: 48 }, (_, i) => i + 1);
const result = {};
for (const [name, def] of Object.entries(scenarios)) {
  const strategies = def.guard
    ? ['guard', 'guardDodge', 'guardStep']
    : def.potion
      ? ['potion', 'potionDodge', 'potionStep', 'stepPotion', 'dodgePotion']
      : ['wave', 'dodge', 'step', 'before', 'blink', 'evasive', 'quickstep'];
  for (const style of strategies) {
    const rows = [];
    for (const seed of seeds) {
      const ctx = scenario(def, seed);
      let received = 0,
        covered = 0,
        hits = 0,
        own = 0,
        illegal = 0,
        casts = 0;
      for (let i = 0; i < (def.potion || def.guard ? 1 : 3); i++) {
        const target = Object.values(ctx.enc.combatants).find(
          (c) => c.side === 'hostile' && !c.current.defeated && !c.current.escaped,
        );
        if (!target || ctx.enc.combatants.pc.current.defeated) break;
        const wave = { kind: 'attack', skill: 'mage.arcane_wave', target: target.id },
          itm = { kind: 'item', item: 'obj.potion' };
        const guard = { kind: 'skill', skill: 'warrior.guard' };
        const steps = {
          guard: [guard],
          guardDodge: [guard, dodge],
          guardStep: [guard, move],
          wave: [wave],
          dodge: [wave, dodge],
          step: [wave, move],
          before: [move, wave],
          blink: [wave, { kind: 'skill', skill: 'mage.blink', dir: 'away' }],
          evasive: [wave, { kind: 'skill', skill: 'rogue.evasive_step', dir: 'away' }],
          quickstep: [wave, { kind: 'skill', skill: 'ranger.quickstep', dir: 'away' }],
          potion: [itm],
          potionDodge: [itm, dodge],
          potionStep: [itm, move],
          stepPotion: [move, itm],
          dodgePotion: [dodge, itm],
        }[style];
        const r = runCombat(ctx, { phase: steps });
        if (r.illegal) {
          illegal++;
          break;
        }
        own++;
        casts += r.records.filter((r) => r.actor === 'pc' && r.kind === 'attack').length;
        const enemy = strikes(r.records, 'enemy').filter((s) => s.target === 'pc');
        hits += enemy.length;
        received += enemy.reduce((a, s) => a + s.final, 0);
        covered += enemy.filter((s) => s.cover).length;
        if (r.stopped === 'terminal') break;
      }
      const pc = ctx.enc.combatants.pc;
      const hostiles = Object.values(ctx.enc.combatants).filter((c) => c.side === 'hostile');
      rows.push({
        survived: pc.current.hp > 0 ? 1 : 0,
        victory: hostiles.every((c) => c.current.defeated) ? 1 : 0,
        dead: hostiles.filter((c) => c.current.defeated).length,
        hp: pc.current.hp,
        mp: pc.current.mp,
        sta: pc.current.sta,
        incoming: received,
        hits,
        covered,
        own,
        casts,
        refusal: illegal,
      });
    }
    const avg = Object.fromEntries(
      Object.keys(rows[0]).map((key) => [
        key,
        Number((rows.reduce((n, r) => n + r[key], 0) / seeds.length).toFixed(3)),
      ]),
    );
    (result[name] ??= {})[style] = avg;
  }
}
console.log(
  JSON.stringify(
    {
      source,
      seeds: { first: 1, last: 48 },
      originalRng: { T12: first.rng, T13: second.rng },
      archived,
      normalTurns: result,
    },
    null,
    2,
  ),
);
