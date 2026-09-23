'use strict';
const path = require('path');
const TOOLS = path.dirname(__dirname);
const BASELINE = process.env.AVERETH_BASELINE_DIR || path.join(TOOLS, 'baseline');
const OUTDIR = process.env.AVERETH_OUT_DIR || path.dirname(TOOLS);
const REPORTS = path.join(TOOLS, 'validation');
const { parseRegexFromString, buildBuffer } = require('./st_core.js');
const K = require(path.join(REPORTS, 'regex_keys.json'));
let fail = 0, pass = 0;
const R = {};
for (const [n, p] of Object.entries(K)) {
  const r = parseRegexFromString(p);
  if (!r) { console.log('NOT A VALID ST REGEX KEY:', n, p); fail++; continue; }
  R[n] = r;
}
// t(name, messagesLatestFirst, depth, expected)
function t(name, msgs, depth, exp, label) {
  const buf = buildBuffer(msgs, depth);
  const got = R[name].test(buf);
  if (got === exp) pass++; else { fail++; console.log(`FAIL ${name} [${label||''}] expected ${exp} got ${got} :: ${JSON.stringify(msgs).slice(0,160)}`); }
}
const U = 'user msg', A = 'assistant msg';
// ---------------- phase markers (depth 2: [user, prevAssistant])
const act = ['Combat: ACTIVE', '**Combat:** ACTIVE', 'Combat: **ACTIVE**', 'COMBAT ACTIVE', 'Combat — ACTIVE — Round 2',
  '[Combat: ACTIVE]', 'Combat State: ACTIVE', 'Combat status: active', 'Combat Phase: ACTIVE | Round 3',
  'Combat: PENDING → ACTIVE', 'Combat: PENDING -> ACTIVE', '**Combat:** ACTIVE (Pending XP 10)', 'Combat: ACTIVE, Pending XP 10',
  'Encounter: ACTIVE', 'Combat: ACTIVE - Round 2 | Current Actor: Alaric | Pending Combat XP: 10'];
for (const s of act) { t('ACTIVE_RE', ['I shoot again', 'Scene...\n' + s], 2, true, s); t('PENDING_RE', ['again', s], 2, false, 'pend? ' + s); t('ENDED_RE', ['again', s], 2, false, 'ended? ' + s); }
const pend = ['Combat: PENDING', '**Combat:** PENDING', 'Combat: PENDING (Boar#1 Gore queued)', 'Combat: INACTIVE → PENDING', 'COMBAT PENDING'];
for (const s of pend) { t('PENDING_RE', ['Power Shot', s], 2, true, s); t('ACTIVE_RE', ['Power Shot', s], 2, false, 'act? ' + s); t('ENDED_RE', ['x', s], 2, false, 'ended? ' + s); }
t('START_PENDING_RE', ['x', 'COMBAT START PENDING'], 2, true);
const ended = ['Combat: INACTIVE', '**Combat:** INACTIVE', 'Combat: ACTIVE → INACTIVE', 'Combat: ACTIVE -> ENDED', 'COMBAT ENDED', 'Combat: RESOLVED', 'Combat: COMPLETE', 'Combat: ENDED'];
for (const s of ended) { t('ENDED_RE', ['harvest', s], 2, true, s); t('ACTIVE_RE', ['harvest', s], 2, false, 'act? ' + s); t('PENDING_RE', ['harvest', s], 2, false, 'pend? ' + s); }
t('COMBAT_END_RE', ['x', 'COMBAT END COMPLETE'], 2, true);
// non-combat statuses must NOT trigger phases
const noise = ['Quest: Rat Clearance — Status: ACTIVE', 'STATUS: ACTIVE', 'Reward status: PENDING', 'Domain: INACTIVE',
  'Combat Log: resolved', 'the combat is now over, nothing is active', 'Pending XP: 0', 'Combat XP pending: 10', 'Inactive combat skills: none'];
for (const s of noise) { t('ACTIVE_RE', ['x', s], 2, false, s); t('PENDING_RE', ['x', s], 2, false, s); t('ENDED_RE', ['x', s], 2, false, s); }
// ---------------- START primary keys (latest message only)
const atk = ['*i fire using Power Shot*', '*I shoot the boar*', 'I attack the wolf', '*i use Power Shot and shoot at it*',
  '*I loose an arrow at the deer*', 'I fire an arrow', 'I swing my sword at the goblin', 'I stab it', 'I kick the rat',
  'I cast Arcane Bolt at the spirit', 'I Charge the boar', 'i use charge on it', '*i aim and Power Shot it*', 'I strike the goblin',
  'I hurl my dagger at the bandit', 'Twin Shot the wolf',
  // v1.24 QA probe: lowercase movement attacks (regression vs v1.22) and phrasings v1.22 also missed
  '*I lunge at the wolf*', '*I charge the boar*', '*I charge at the boar with my sword*', '*lunges at the wolf*',
  '*I quickly tackle the goblin*', '*I ram my shield into it*', '*I put an arrow in its eye*', '*I send an arrow into the wolf*',
  '*I let an arrow fly at the wolf*', '*I let fly*', '*I open fire*', '*I take the shot*', '*I aim and release*',
  '*I draw and loose at the wolf*', '*I cut its throat*', "*I slit the bandit's throat*", '*I go for its throat*',
  '*I bash it with my shield*', '*I thrust my rapier into its flank*', '*I plunge my dagger into its neck*',
  '*I pierce its hide with an arrow*', '*I loose an arrow*', '*I fire*', '*I strike a match and then stab the rat*'];
for (const s of atk) {
  const ok = ['START_ATTACK_RE', 'START_ACTION_RE', 'START_SKILL_RE', 'START_SKILL_CAP_RE', 'START_SKILL_USE_RE'].some(n => R[n].test(buildBuffer([s, 'prev'], 2)));
  if (ok) pass++; else { fail++; console.log('FAIL START should fire:', s); }
}
const notatk = ['*i follow the sound as i get my bow ready*', 'I take a bite of bread', 'I take aim at the boar', 'I pay the charge at the gate',
  'a flurry of snow falls', 'I wander to the forest', 'I watch the deer graze', 'I draw my bow', 'I track the boar',
  // v1.24 QA probe: idioms / storage phrases that must not load the START engine
  '*I hit the road*', '*I strike a deal with the merchant*', '*I struck up a conversation*', '*I cast a glance at the wolf*',
  '*I throw a quick glance toward the door*', '*I kill time at the inn*', '*I cast my line into the river*',
  '*I shoot a look at Wren*', '*I shoot him a smile*', '*I punch in the numbers*', '*I kick off my boots*', '*I kick back and relax*',
  '*I swing by the market*', '*I strike a match*', '*I fire up the forge*', '*I nock an arrow*', '*I ready my bow*',
  '*I put my knife in my belt*', '*I put the arrows in the quiver*', 'Am I charged for the room?', '*I charge the crystal with mana*',
  '*I let the birds fly*', '*I drive the cart toward town*', '*I thrust my hands into my pockets*', '*I take a bite of the bread*'];
for (const s of notatk) {
  const hit = ['START_ATTACK_RE', 'START_ACTION_RE', 'START_SKILL_RE', 'START_SKILL_CAP_RE', 'START_SKILL_USE_RE'].filter(n => R[n].test(buildBuffer([s, 'prev'], 2)));
  if (hit.length === 0) pass++; else { fail++; console.log('FAIL START should NOT fire:', s, hit); }
}
// previous assistant narration must not trigger START
{ const hit = ['START_ATTACK_RE', 'START_ACTION_RE', 'START_SKILL_RE'].filter(n => R[n].test(buildBuffer(['I wait.', 'The boar attacks! It strikes Alaric. *It charges and lunges.* Skills: Power Shot'], 2)));
  if (hit.length === 0) pass++; else { fail++; console.log('FAIL START fired on previous narration', hit); } }
// START blockers
t('CMD_RE', ['#skill Power Shot', 'prev'], 2, true); t('CMD_RE', ['  #status', 'prev'], 2, true); t('CMD_RE', ['I shoot #1', 'prev'], 2, false);
t('START_INFO_RE', ['what does Power Shot do?', 'p'], 2, true); t('START_INFO_RE', ['How much damage does Twin Shot deal', 'p'], 2, true);
t('START_INFO_RE', ['*I shoot at it with Power Shot* What is that thing?!', 'p'], 2, false, 'combat + question');
t('START_INFO_RE', ['What is that? I use Power Shot on it', 'p'], 2, false, 'question then attack');
t('START_INFO_REV_RE', ['Power Shot — what does it do?', 'p'], 2, true);
t('CREATION_STEP_RE', ['Aimed Shot + Power Shot', 'CHARACTER CREATION — STEP 2/2\nCLASS SELECTED: Ranger'], 2, true);
t('CREATION_STEP_RE', ['Ranger', '`CHARACTER CREATION — STEP 1/2`'], 2, true);
t('CREATION_STEP_RE', ['x', 'We finished character creation earlier.'], 2, false);
t('CREATION_COMPLETE_RE', ['x', 'CHARACTER CREATION COMPLETE'], 2, true); t('CREATION_COMPLETE_RE', ['x', 'Character Creation: complete'], 2, true);
// ---------------- class info keys
t('CLASS_INFO_RANGER', ['#skill Power Shot', 'p'], 2, true); t('CLASS_INFO_RANGER', ['what does Twin Shot do?', 'p'], 2, true);
t('CLASS_INFO_RANGER', ['*I use Power Shot on the boar*', 'Skills: Power Shot, Aimed Shot'], 2, false, 'combat use');
t('CLASS_INFO_RANGER', ['I wait', 'what does Power Shot do?'], 2, false, 'old question');
t('CLASS_SINGLE_WARRIOR', ['#skill Guard', 'p'], 2, true); t('CLASS_SINGLE_WARRIOR', ['what does the guard know?', 'p'], 2, false);
t('CLASS_SINGLE_WARRIOR', ['explain the Guard skill', 'p'], 2, true);
t('CLASS_CMD_RANGER', ['#skills', 'Character Sheet ... Class: Ranger | Skills: Basic Attack, Aimed Shot, Power Shot'], 2, true);
t('CLASS_CMD_MAGE', ['#skills', 'Character Sheet ... Class: Ranger | Skills: Basic Attack, Aimed Shot, Power Shot'], 2, false);
t('CLASS_CMD_RANGER', ['#status', 'Class: Ranger'], 2, false);
// ---------------- detail keys
t('MULTI_SKILL_RE', ['I use Twin Shot', 'p'], 2, true); t('MULTI_SKILL_RE', ['I wait', 'Skills: Twin Shot'], 2, false);
t('WARD_SKILL_RE', ['I cast Arcane Ward', 'p'], 2, true); t('WARD_SKILL_RE', ['I wait', 'Skills: Arcane Ward'], 2, false);
t('POWER_VS_POWER_RE', ['I try to parry', 'p'], 2, true); t('POWER_VS_POWER_RE', ['I pay', 'She leans on the counter.'], 2, false);
t('ELEMENT_USER_RE', ['I cast Flame Lance', 'p'], 2, true); t('ELEMENT_USER_RE', ['*I fire using Power Shot*', 'p'], 2, false);
t('ELEMENT_USER_RE', ['I wait', 'Smoke rises from the chimneys; wet grass.'], 2, false);
t('ELEMENT_TAG_RE', ['x', 'Effects: Wolf#1 BURNING (2)'], 2, true); t('ELEMENT_TAG_RE', ['x', 'a burning torch'], 2, false);
t('SYSTEM_MONSTER_RE', ['#system how strong is a wolf?', 'p'], 2, true); t('SYSTEM_MONSTER_RE', ['#combat', 'Wolf#1 HP 20'], 2, false);
t('SYSTEM_MONSTER_RE', ['I hunt the wolf', 'p'], 2, false);
t('COMMAND_ROUTER_RE', ['#status', ''], 1, true); t('COMMAND_ROUTER_RE', ['I check #status later', ''], 1, false);
t('CLASS_INFO_RANGER', ['*I check how far the boar is and use Power Shot*', 'p'], 2, false, 'bare how');
t('CLASS_INFO_RANGER', ["what's Power Shot's range?", 'p'], 2, true); t('CLASS_INFO_RANGER', ['How much STA does Twin Shot cost?', 'p'], 2, true);
// ---------------- status keys
t('STATUS_CAP_RE', ['x', 'Effects: Wolf#1 Bleeding (2 turns)'], 2, true); t('STATUS_CAP_RE', ['x', 'a frozen puddle; the boar is bleeding'], 2, false);
t('STATUS_USER_RE', ['is the wolf still bleeding?', 'p'], 2, true); t('STATUS_USER_RE', ['I walk on', 'the boar is bleeding'], 2, false);
console.log(`regex tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
