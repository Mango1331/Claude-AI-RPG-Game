'use strict';
const path = require('path');
const TOOLS = path.dirname(__dirname);
const BASELINE = process.env.AVERETH_BASELINE_DIR || path.join(TOOLS, 'baseline');
const OUTDIR = process.env.AVERETH_OUT_DIR || path.dirname(TOOLS);
const REPORTS = path.join(TOOLS, 'validation');
const fs = require('fs');
const FM = fs.readFileSync(path.join(BASELINE, 'RPG_First_Message_v0.4.txt'), 'utf8');
const TRACK_INACTIVE = '\n\nCharacter Sheet — Alaric | L1 F Ranger | HP 80/80 MP 60/60 STA 100/100 | Skills: Basic Attack [P1/PP0], Aimed Shot [P1/PP0], Twin Shot [P1/PP0] | Arrows 20 | Coin 5 Silver\nWorld State — forest edge, afternoon';
const trackActive = (combatLine, extra = '') => `\n\n**Combat:** ${combatLine}\nCharacter Sheet — Alaric | L1 F Ranger | HP 72/80 STA 88/100 | Skills: Basic Attack, Aimed Shot, Twin Shot | Arrows 18${extra}\nEncounter: Boar#1 L1 F Normal HP 16/41 ATK11 DEF2 MDEF0 Hit70 Init7 DefeatXP 10 | Range SHORT`;
// Each scenario: msgs = [latest user message, previous assistant message], expect = phase uid or null, mustNot = uids
module.exports = [
  { id: 'S01', name: 'Creation step 1: user picks Ranger after First Message', msgs: ['Ranger', FM], expect: 54 },
  { id: 'S02', name: 'Creation step 2: user picks two skills (Power Shot must not start combat)', msgs: ['Aimed Shot + Power Shot', 'CHARACTER CREATION — STEP 2/2\nCLASS SELECTED: Ranger\nSTR 5 | VIT 5 | AGI 6 | INT 5 | PER 6 | WIL 5\nBase Skill Pool: Aimed Shot, Quickstep, Power Shot, Quick Shot, Twin Shot, Focus Aim\nSelect exactly 2 Skills.'], expect: 54, mustNot: [1] },
  { id: 'S03', name: 'First story turn after CHARACTER CREATION COMPLETE', msgs: ['*I walk toward the forest*', 'CHARACTER CREATION COMPLETE\nStarter Shortbow equipped.' + TRACK_INACTIVE], expect: null, mustNot: [54] },
  { id: 'S04', name: 'Tracking with bow ready (no combat)', msgs: ['*i follow the sound as i get my bow ready*', 'Birdsong thins near the stream.' + TRACK_INACTIVE], expect: null, mustNot: [1] },
  { id: 'S05', name: 'Aim only (no combat)', msgs: ['*I take aim at the boar*', 'A boar roots at the water.' + TRACK_INACTIVE], expect: null, mustNot: [1] },
  { id: 'S06', name: 'Attack declaration (START)', msgs: ['*i use Power Shot and shoot at it*', 'A boar roots at the water.' + TRACK_INACTIVE], expect: 1 },
  { id: 'S07', name: 'Attack naming the species (START; monster DB should not load)', msgs: ['*I shoot the boar with Power Shot*', 'A boar roots at the water.' + TRACK_INACTIVE], expect: 1, mustNot: [25] },
  { id: 'S08', name: 'ACTIVE turn, user says only "again"', msgs: ['*again*', 'The boar staggers.' + trackActive('ACTIVE — Round 2 | Current Actor: Alaric | Pending XP: 0')], expect: 2, mustNot: [1, 3] },
  { id: 'S09', name: 'ACTIVE turn with "Combat: ACTIVE (Pending XP 10)" tracker + Power Shot', msgs: ['*Power Shot again*', 'Wolf#1 falls.' + trackActive('ACTIVE (Pending XP 10) — Round 3')], expect: 2, mustNot: [1] },
  { id: 'S10', name: 'ACTIVE turn with "Combat: ACTIVE, Pending XP 10"', msgs: ['*I shoot Wolf#2*', 'Wolf#1 falls.' + trackActive('ACTIVE, Pending XP 10')], expect: 2, mustNot: [1] },
  { id: 'S11', name: 'PENDING marker (Megumin style) + user attacks', msgs: ['*I shoot it with Power Shot*', 'The boar lowers its tusks and charges.\n\n**Combat:** PENDING (Boar#1 Gore queued)' + TRACK_INACTIVE], expect: 55 },
  { id: 'S12', name: 'Transition line "Combat: PENDING -> ACTIVE"', msgs: ['*again*', 'Initiative fixed.\n\nCombat: PENDING -> ACTIVE | Round 1' + TRACK_INACTIVE], expect: 2 },
  { id: 'S13', name: 'Post-combat harvest after "Combat: ACTIVE -> INACTIVE"', msgs: ['*I harvest the tusks*', 'COMBAT ENDED — Boar#1 defeated, DefeatXP 10.\n\nCombat: ACTIVE -> INACTIVE' + TRACK_INACTIVE], expect: null, mustNot: [1, 2] },
  { id: 'S14', name: '#skill Power Shot outside combat', msgs: ['#skill Power Shot', 'You rest by the fire.' + TRACK_INACTIVE], expect: null, mustNot: [1], mustHave: [23] },
  { id: 'S15', name: '#skill Power Shot during ACTIVE combat (System query freezes combat)', msgs: ['#skill Power Shot', 'The boar snorts.' + trackActive('ACTIVE — Round 2')], expect: null, mustNot: [1, 2], mustHave: [23] },
  { id: 'S16', name: 'Info question "what does Twin Shot do?"', msgs: ['what does Twin Shot do?', 'You rest.' + TRACK_INACTIVE], expect: null, mustNot: [1], mustHave: [23] },
  { id: 'S17', name: 'Quest tracker "Status: ACTIVE" while exploring', msgs: ['*I walk down into the cellar*', 'Quests: Rat Clearance — STATUS: ACTIVE' + TRACK_INACTIVE], expect: null, mustNot: [2] },
  { id: 'S18', name: 'Mid-combat question mentioning character creation', msgs: ['#system did character creation give me 20 arrows?', 'The boar circles.' + trackActive('ACTIVE — Round 2')], expect: null, mustNot: [54] },
  { id: 'S19', name: 'Mage tracker lists Arcane Ward (exploration)', msgs: ['*I keep walking*', 'The road bends.\nCharacter Sheet — L1 F Mage | Skills: Basic Attack, Arcane Ward, Arcane Bolt'], expect: null, mustNot: [6] },
  { id: 'S20', name: 'Narration with smoke/wet/frozen (exploration)', msgs: ['*I walk on*', 'Smoke curls from chimneys; the grass is wet and a frozen puddle cracks.' + TRACK_INACTIVE], expect: null, mustNot: [7] },
  { id: 'S21', name: 'Birds mentioned (Wren\'s geese)', msgs: ['*I watch the birds*', 'Wren herds her geese past the well.' + TRACK_INACTIVE], expect: null, mustNot: [25] },
  { id: 'S22', name: 'Toll: "I pay the charge"', msgs: ['I pay the charge at the gate', 'The toll guard waits.' + TRACK_INACTIVE], expect: null, mustNot: [1] },
  { id: 'S23', name: '"I take a bite of bread"', msgs: ['*I take a bite of the bread*', 'The tavern is loud.' + TRACK_INACTIVE], expect: null, mustNot: [1] },
  { id: 'S24', name: 'Attack plus exclamation question', msgs: ['*I shoot at the wolf* What is that thing?!', 'A grey shape moves.' + TRACK_INACTIVE], expect: 1 },
  { id: 'S25', name: 'Twin Shot used in ACTIVE combat (multi-hit detail wanted)', msgs: ['*Twin Shot at Wolf#2*', 'Wolf#2 snarls.' + trackActive('ACTIVE — Round 2')], expect: 2, mustHave: [3] },
  { id: 'S26', name: 'Lore question about Veyrhold', msgs: ['Tell me about Veyrhold', 'The inn is quiet.' + TRACK_INACTIVE], expect: null, mustHave: [39] },
  { id: 'S27', name: '#combat during ACTIVE', msgs: ['#combat', 'The boar circles.' + trackActive('ACTIVE — Round 2')], expect: null, mustNot: [1], mustHave: [51] },
  { id: 'S28', name: 'Duelist: lowercase "I lunge at the wolf" (START; v1.22 plaintext key, regex regression guard)', msgs: ['*I lunge at the wolf*', 'A wolf bares its teeth.\n\nCharacter Sheet — Alaric | L1 F Duelist | HP 80/80 STA 100/100 | Skills: Basic Attack, Lunge, Feint | Combat: INACTIVE'], expect: 1 },
  { id: 'S29', name: 'Archer phrasing "I put an arrow in its eye" (START)', msgs: ['*I put an arrow in its eye*', 'A wolf watches from the treeline.' + TRACK_INACTIVE], expect: 1 },
  { id: 'S30', name: 'Idiom "I strike a deal with the merchant" (no combat)', msgs: ['*I strike a deal with the merchant*', 'The merchant names a price.' + TRACK_INACTIVE], expect: null, mustNot: [1] },
];
