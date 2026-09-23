'use strict';
// Comparison probe (informational, not a pass/fail gate): which natural-language messages load the START engine
// in the original v1.22 WorldInfo vs. the perfected one. The pass/fail versions of these cases live in regex_tests.js.
// Usage: node tools/validate/phrase_probe.js   (OLD+/old- = v1.22 fires/does not, NEW+/new- = perfected)
const path=require('path'); const fs=require('fs');
const { parseRegexFromString, buildBuffer, matchKeys } = require('./st_core.js');
const OLD = JSON.parse(fs.readFileSync(require('path').join(process.env.AVERETH_BASELINE_DIR || require('path').join(__dirname, '..', 'baseline'), 'Avereth_RPG_WorldInfo_4096_v1.22.json'),'utf8'));
const NEW = JSON.parse(fs.readFileSync(require('path').join(process.env.AVERETH_OUT_DIR || require('path').join(__dirname, '..', '..'), 'Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json'),'utf8'));
const G = { caseSensitive:false, matchWholeWords:true };
function fires(e, buf){
  const prim = e.key.some(k => matchKeys(buf, k, e, G));
  if(!prim) return false;
  if(!e.keysecondary.length) return true;
  const sec = e.keysecondary.map(k => matchKeys(buf, k, e, G));
  switch(e.selectiveLogic){ case 0: return sec.some(x=>x); case 1: return !sec.every(x=>x); case 2: return !sec.some(x=>x); case 3: return sec.every(x=>x); }
}
const prev = 'A grey wolf watches from the treeline.\n\nCharacter Sheet — Alaric | L1 F Ranger | HP 80/80 | Combat: INACTIVE';
const attacks = [
 '*I put an arrow in its eye*','*I let an arrow fly at the wolf*','*I nock and shoot*','*I draw and loose at the wolf*',
 '*I lunge at the wolf*','*I charge the boar*','*I charge at the boar with my sword*','*I cut its throat*','*I bash it with my shield*',
 '*I stab it*','*I slash at the wolf*','*I swing my sword at it*','*I attack*','*I shoot the wolf*','*I fire at the wolf*',
 '*I thrust my rapier into its flank*','*I hurl my dagger at it*','*I cast Arcane Bolt at it*','*I cast a bolt at the wolf*',
 '*I strike first*','*I aim and release*','*I loose an arrow*','*I shoot an arrow at it*','*I kill it*','*I smash its skull*',
 '*I use Aimed Shot on the wolf*','*Aimed Shot*','*Twin Shot at the wolf*','*I shoot twice*','*I kick the goblin*',
 '*I punch him*','*I tackle the goblin*','*I throw a rock at the wolf*','*I ram my shield into it*','*I pierce its hide with an arrow*',
 '*I send an arrow into the wolf*','*I open fire*','*I take the shot*','*I shoot*','*I engage the wolf*','*I go for its throat*',
];
const benign = [
 '*I watch the wolf*','*I take aim at the wolf*','*I ready my bow*','*I nock an arrow*','*I follow the tracks*','*I hide behind a tree*',
 'I pay the charge at the gate','*I take a bite of the bread*','*I hit the road*','*I strike a deal with the merchant*','*I struck up a conversation*',
 '*I cast a glance at the wolf*','*I throw a glance toward the door*','*I fire up the campfire*','*I release the rope*','*I kill time at the inn*',
 'what does Power Shot do?','How much damage does Twin Shot do?','#skill Aimed Shot','*I cast my line into the river*','*I throw the ball to the dog*',
 '*I shoot a look at Wren*','*I punch in the numbers*','*I kick off my boots*','*I smash the lock*','*I attack the problem methodically*',
];
for (const [label, list] of [['ATTACK (should START)', attacks], ['BENIGN (should NOT START)', benign]]) {
  console.log('==', label);
  for (const m of list) {
    const buf = buildBuffer([m, prev], 2);
    const o = fires(OLD.entries['1'], buf), n = fires(NEW.entries['1'], buf);
    console.log(`${o?'OLD+':'old-'} ${n?'NEW+':'new-'}  ${m}`);
  }
}
