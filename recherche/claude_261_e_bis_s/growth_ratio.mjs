// Offline: PC derived values (product character()/deriveCharacter with the typical gear path) against same-level
// creature profiles (product scaleCreature) per level; shows which side outgrows the other. node growth_ratio.mjs <analysis engine root>
import { pathToFileURL } from 'node:url'; import path from 'node:path';
const root = process.argv[2]; const imp = p => import(pathToFileURL(path.join(root, p)).href);
const { engine } = await imp('tools/sim/balance/engine.mjs'); const E = await engine(root);
const { deriveCharacter } = await imp('src/derived.js'); const { scaleCreature } = await imp('src/npcgen.js');
const typical = (l) => l <= 2 ? 'starter' : l <= 6 ? 'fine' : l <= 11 ? 'mixed' : l <= 14 ? { weapon: 'superior', armor: 'superior' } : { weapon: 'fine', armor: 'fine', rank: 'E' };
console.log('cls L | PC maxHP DEF MDEF ATK MATK init | bear HP ATK DEF | goblin HP ATK | ratio bearATK/PC-HP  bearHP/PC-ATK');
for (const cls of ['warrior', 'mage']) for (const L of [1, 5, 10, 15, 20, 29, 45, 60, 90]) {
  const s = E.pcSheet(cls, L, 'balanced', typical(Math.min(L, 15)), 1); const d = deriveCharacter(s.entities.pc.sheet, E.c);
  const b = scaleCreature(E.c.anchors.get('bear'), L, 'normal', E.c), g = scaleCreature(E.c.anchors.get('goblin'), L, 'normal', E.c);
  const off = cls === 'mage' ? d.matk : d.atk;
  console.log(`${cls} ${L} | ${d.maxHp} ${d.def} ${d.mdef} ${d.atk} ${d.matk} ${d.init} | ${b.max_hp} ${b.atk} ${b.def} | ${g.max_hp} ${g.atk} | ${(b.atk / d.maxHp).toFixed(3)}  ${(b.max_hp / off).toFixed(2)}`);
}
