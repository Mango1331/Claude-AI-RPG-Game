// Isolated offline probe of the .251 presence evidence functions (no model calls, no product changes).
// Usage: node probe_presence.mjs <path to avereth-engine>
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const root = process.argv[2];
const ne = await import(pathToFileURL(path.join(root, 'src/v4/narration_evidence.js')).href);
const { metEvidence, presenceInReply, personProfile, narratedEvent } = ne;

const lw = personProfile({ id: 'npc.lw', names: [], nameWords: [], role: 'leatherworker',
    look: ['broad-shouldered woman with burn scars up both forearms', 'stitching a belt'] });
const madge = personProfile({ id: 'npc.madge', names: ['Madge'], nameWords: ['madge'], role: 'innkeeper', look: ['broad woman with flour on her forearms'] });
const tam = personProfile({ id: 'npc.tam', names: [], nameWords: [], role: 'fisherman', look: ['past fifty', "patched fisherman's coat", 'rubber boots to the knee'] });
const clerk = personProfile({ id: 'npc.clerk', names: ['Hilde'], nameWords: ['hilde'], role: 'clerk', look: ['grey-haired'] });
const lwLabels = ['leatherworker', 'merchant'];
const madgeLabels = ['Madge', 'madge', 'innkeeper'];

// [label, expectedHuman (true = she is really here now), kind, args]
const cases = [
  // ---- positives (a human reader says: present now)
  ['Martin orig (possessive + pronoun)', true, 'met', ["The leatherworker's stall sat where he'd left it, and she looked up from a half-stitched sheath as he came level with the counter.", 'npc.lw', [lw]]],
  ['Martin variant: The leatherworker looked up', true, 'met', ['The leatherworker looked up from a half-stitched sheath as he came level with the counter.', 'npc.lw', [lw]]],
  ['Leatherworker greets him', true, 'met', ['The leatherworker greeted him with a nod from behind her counter.', 'npc.lw', [lw]]],
  ['Leatherworker: "she was still there"', true, 'met', ['The leatherworker was still there, bent over a strap.', 'npc.lw', [lw]]],
  ['Leatherworker hailed him', true, 'met', ['The leatherworker hailed him before he reached the stall.', 'npc.lw', [lw]]],
  ['Leatherworker recognised him', true, 'met', ['The leatherworker recognised him at once and set down her awl.', 'npc.lw', [lw]]],
  ['burn-scarred woman behind stall', true, 'met', ['The burn-scarred woman behind the stall glanced up as he approached.', 'npc.lw', [lw]]],
  ['Elm orig (drawing ale)', true, 'met', ['He nodded at the counter, where Madge was drawing ale for two carters and taking their coppers without ceremony.', 'npc.madge', [madge]]],
  ['Madge pulled a pint', true, 'met', ['Madge pulled a pint for the carter at the end of the bar.', 'npc.madge', [madge]]],
  ['Madge was behind the bar', true, 'met', ['Madge was behind the bar, wiping a mug.', 'npc.madge', [madge]]],
  ['Madge ladled stew', true, 'met', ['Madge ladled stew into a bowl and slid it across.', 'npc.madge', [madge]]],
  ['Madge drew him a mug', true, 'met', ['Madge drew him a mug of ale without being asked.', 'npc.madge', [madge]]],
  ['Tam orig (eel-man / old fellow)', true, 'met', ['The eel-man was there. An old fellow sat on the gunwale, wiry, forearms like knotted rope, sorting through a bucket of squirming silver', 'npc.tam', [tam]]],
  ['Hilde stamped the slip', true, 'met', ['Hilde stamped the slip and pushed it back across the desk.', 'npc.clerk', [clerk]]],
  // ---- negatives (a human reader says: NOT present now)
  ['NEG empty stall', false, 'met', ["The leatherworker's stall stood empty, its awning tied down.", 'npc.lw', [lw]]],
  ['NEG left before he came', false, 'met', ['The leatherworker had packed up and left before Alaric arrived.', 'npc.lw', [lw]]],
  ['NEG painted sign', false, 'met', ['A painted sign showed the leatherworker holding a boot.', 'npc.lw', [lw]]],
  ['NEG memory', false, 'met', ['He remembered how the leatherworker had looked up from her sheath that morning.', 'npc.lw', [lw]]],
  ['NEG hypothetical', false, 'met', ['The leatherworker would look up if he came closer.', 'npc.lw', [lw]]],
  ['NEG hearsay', false, 'met', ['A boy said that the leatherworker had gone home with a fever.', 'npc.lw', [lw]]],
  ['NEG apprentice instead', false, 'met', ["The leatherworker's apprentice minded the stall alone.", 'npc.lw', [lw]]],
  ['NEG mentioned in dialogue', false, 'met', ['"The leatherworker? She went home," the cobbler said.', 'npc.lw', [lw]]],
  ['NEG Madge away', false, 'met', ['Madge was nowhere to be seen; a boy minded the counter.', 'npc.madge', [madge]]],
];

let tally = { tp: 0, fn: 0, tn: 0, fp: 0 };
for (const [label, human, kind, [prose, id, people]] of cases) {
  const r = metEvidence(prose, prose, id, people, { here: ['market square', 'Alderwatch'], elsewhere: [], self: ['Alaric'] });
  const labels = id === 'npc.madge' ? madgeLabels : id === 'npc.lw' ? lwLabels : id === 'npc.tam' ? ['fisherman'] : ['Hilde', 'clerk'];
  const e = presenceInReply(prose, prose, labels);
  const tag = (ok) => (human ? (ok ? 'TP' : 'FN') : (ok ? 'FP' : 'TN'));
  const t = tag(r.ok);
  tally[t.toLowerCase()]++;
  console.log(`${t.padEnd(3)} met=${String(r.ok).padEnd(5)} enter=${String(e.ok).padEnd(5)} [${tag(e.ok)}] | ${label}${r.ok ? '' : ' — ' + r.why}`);
}
console.log('\nmetEvidence tally', tally);
