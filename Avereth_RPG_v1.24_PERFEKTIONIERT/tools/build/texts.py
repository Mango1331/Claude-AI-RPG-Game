# -*- coding: utf-8 -*-
"""Runtime texts of the compiled WorldInfo v1.23 (package v1.24).

Baseline = the tested v1.22 runtime wording (kept wherever it worked). Edits are limited to the
problems documented in the v1.21-v1.23 test evaluations: ambush +25pp Crit, DEF-before-variance,
ammunition, PC action scope, explicit rank-gap values, monster rules that used to arrive only via
species keywords, and the generated action table replacing three verbatim class copies.
Shared step texts are defined ONCE and reused by START / PENDING / ACTIVE.
"""

# ----------------------------------------------------------------------------- kernel (constant)
KERNEL = """AVERETH CRITICAL RUNTIME KERNEL — ALWAYS ACTIVE
AUTHORITY: Core mechanics > Content concrete data > Lore setting > System private UI. The active host owns its existing rendering/tracker presentation. Avereth defines semantic state/results only. Resolve mechanics before prose.

PERSISTENCE: start from the previous complete authoritative state and apply deltas only. Never reset Rank/Class/Skills/Proficiency/Gear/Coin/Inventory/Quests/documents/resources because a field is omitted from prose.

DERIVED CORE:
MaxHP=50+Level*5+VIT*5.
MaxMP=INT*8+WIL*4.
Normal Human MaxSTA=100 fixed; no Level/VIT/AGI scaling.
Init=AGI+floor(PER/2).
BaseDEF=floor(VIT/4); BaseMDEF=floor(WIL/4). TOTAL DEF/MDEF=Base+equipped Gear+explicit bonuses.
ATK=equipped Gear ATK+explicit ATK bonuses; MATK=equipped Gear MATK+explicit MATK bonuses. Never add Core Stats directly to ATK/MATK; Stats enter through written action Scaling.
XP_TO_NEXT=Level*100. Level-up: +5 Free Stat Points + Base-Class favored +1/+1; no automatic current-resource refill.

RANGE CORE:
ENGAGED(0) < SHORT(1) < MEDIUM(2) < LONG(3). Listed Skill Range is MAXIMUM: a target is legal when its band number <= the action's band number.
LONG reaches all four; MEDIUM reaches ENGAGED/SHORT/MEDIUM; SHORT reaches ENGAGED/SHORT; ENGAGED reaches ENGAGED only.
No Movement stat/exact combat meters. Normal movement changes only ONE ADJACENT band: ENGAGED<->SHORT<->MEDIUM<->LONG.

AMMO: a projectile action consumes its listed Ammo (normal bow shot 1 arrow; Twin Shot 2) once, together with its Cost, after full legality. Too few arrows = illegal action. Ordinary arrows add no modifier.

PRECISION LOCK: never round scaling terms/sums, Raw, defense, resistance, variance or crit intermediates. DEF/MDEF applies BEFORE variance. Round only final positive damage.

RNG LOCK: generate each required roll/variance exactly once, keep it through audit, never reroll for story preference.

COMBAT GATE: hunt/search/track/follow tracks/discover/observe/threaten/growl/stalk/draw/equip/aim alone are NOT Combat. START only at immediate hostile commitment: actual damaging/offensive action, actual NPC/Monster attack beginning now, true ambush attack, or deliberate damaging trap/hazard.

PHASE: PENDING / ACTIVE / INACTIVE is semantic state. Host decoration/punctuation is presentation only; runtime matching must tolerate it. A finished encounter is committed as INACTIVE.

START FALLBACK: if a NEW encounter begins (NPC/Monster attack or an attack Alaric declares) while no combat engine (START/PENDING/ACTIVE) is loaded, do NOT improvise hit/damage. Freeze at commitment, preserve participants + relevant Range Bands + trigger action as PENDING, resolve on next mechanical pass.

MONSTER LOCK: generic Monster profile uses Level/Rank/type/HP/ATK/DEF/MDEF/Hit/Init/Attack/Range/DefeatXP; no Human Stats, MP/STA, Character Crit, Movement stat, Class/Proficiency/Gear/invented Trait unless authored.

XP LOCK: DefeatXP is fixed at Initialization. While any hostile remains active, defeated-target XP is Pending only. Persistent XP/Level/Free Stat Points/end-loot commit once at terminal Combat End.

INVALID PLAYER ACTION: never silently substitute/degrade an illegal Alaric action. Hard failure spends/rolls/changes nothing and leaves the decision with Alaric.
SOLE HOSTILE TARGET: if exactly one valid hostile exists, an unnamed offensive target may default to that hostile. If 2+ valid hostiles exist, never choose among them for Alaric.
PC ACTION SCOPE: a declared action authorizes only itself (incl. its written movement); never add an approach, posture change, reload/nock, looting or repositioning for Alaric. Mechanical advantages (ambush, concealment, cover) never rest on PC posture/tactics the narrator invented.

SETTING BASELINE: Avereth is Western-fantasy medieval material culture with mana/high magic. Ordinary long-distance communication uses letters/messengers; magical long-distance communication and teleportation are exceptional unless established. Do not introduce modern/industrial technology by default."""


# ----------------------------------------------------------------------------- shared pieces
RUN_HEADER_INIT = ("Run silently; expose committed results, not chain-of-thought. Maximum two passes per stage: "
                   "CALCULATE -> AUDIT/REPAIR -> FINAL VERIFY. Audit NEVER rerolls.")

INIT_STEPS_3_TO_10 = """3. Build COMPLETE FIXED profile for EVERY combatant.
   Character FIXED: Level/Rank/Class/Evolution; STR VIT AGI INT PER WIL; MaxHP/MP/STA; ATK/MATK; Base/TOTAL DEF/MDEF; BaseHit; Crit; Init; combat Gear; exact learned combat Action Library.
   Character ATK=equipped Gear ATK+explicit bonuses; MATK=equipped Gear MATK+explicit bonuses. NEVER add a Core Stat directly to ATK/MATK; Stats enter through written action Scaling.
   Normal Human MaxSTA=100.
   Generic Monster FIXED: stable ID/species; Level/Rank; Normal/Elite/Boss; MaxHP/ATK/DEF/MDEF/Hit/Init; Attack Type/maximum Range Band; Crit:none; explicit authored mechanics only; LOCKED DefeatXP. NEVER Human Stats/MP/STA/Movement stat/Class/Proficiency/invented Traits.
4. Build CURRENT: HP/MP/STA, ammo, held/equipped state, relevant pairwise Range Bands, terrain/cover/LoS, statuses/barriers/temp modifiers, Defeated/Escaped/Pending XP.
5. ACTION LIBRARY: use the ACTION TABLE below. Lock ONLY actions actually present in persistent Skills/current Class. Copy exact Cost/Ammo/MAX Range/Hit/Raw formula/effects.
6. LOCK DEFEAT XP: each hostile DefeatXP = round(Level*10 * rank-gap * Normal1/Elite1.5/Boss2.5); rank-gap vs Alaric Rank at encounter start: same x1, +1 x2, +2 x4, +3+ x8, -1 x0.5, -2 or lower x0.25. Store in FIXED now. Never improvise XP at death.
7. TARGET: if Alaric omitted a target and exactly ONE valid hostile exists, use that sole hostile. If 2+ valid hostiles exist, stop before cost/RNG until Alaric chooses.
8. Keep a visible non-ambush trigger Pending. TRUE AMBUSH (target genuinely unaware through established facts or user-declared actions, never narrator-invented PC stealth/posture): one Opening Action before Round 1; eligible attacks in it gain +25pp Crit; no Hit/Damage bonus; then normal Initiative.
9. Initiative: character AGI+floor(PER/2); direct Monster locked Init; tie = higher PER if both have PER, else resolve once without bias. Lock Turn Order. Audit profiles/action formulas/DefeatXP/resources/Range Bands/Initiative; repair once; verify once.
10. Only after verification set Round1, Current Actor and semantic ACTIVE."""

MONSTER_RULES = """Scaling g=L-1:
HP=round(HP1*(1+.20g)); ATK=round(ATK1*(1+.22g));
DEF=max(0,round((DEF1+1)*(1+.20g)-1)); MDEF same;
Hit=min(95,Hit1+2*floor(g/15)); Init=round(Init1*(1+.05g)).
No Movement stat. No extra Rank multiplier. Rank by Level: F1-14 E15-29 D30-44 C45-59 B60-74 A75-89 S90-104.
Level: use an established area/Quest/profile Level; otherwise settled outskirts F1, ordinary nearby wilderness F1-F3, explicitly remote/deep dangerous wilderness F4-F7, established F-rank hunting territory its range (max F14); unknown danger F1. Appearance/scars/size never raise Level.
Unlisted species: nearest body-plan anchor. Variation only if body condition supports it: HP/ATK +-20%, DEF/MDEF +-1, Hit +-5pp, Init +-2; fix once.
Elite/Boss only when explicitly authored/established: Elite HP x1.75, ATK x1.15, DEF/MDEF x1.10, Hit +5pp, Init +2; Boss HP x2.50, ATK x1.30, DEF/MDEF x1.20, Hit +5pp, Init +3; round and fix."""

RANGE_LINES = """MAX RANGE: LONG reaches ENGAGED/SHORT/MEDIUM/LONG; MEDIUM reaches ENGAGED/SHORT/MEDIUM; SHORT reaches ENGAGED/SHORT; ENGAGED reaches ENGAGED only.
NORMAL MOVEMENT: exactly one adjacent step max: ENGAGED<->SHORT, SHORT<->MEDIUM, MEDIUM<->LONG. Never MEDIUM->ENGAGED in one ordinary shift."""

DAMAGE_LINE = ("DAMAGE FULL PRECISION: Character Raw=SkillBase+each exact scaling term+listed ATK/MATK share; generic "
               "natural Raw=ATK. NEVER round a scaling term, scaling sum, Raw, defense, resistance, variance or crit "
               "intermediate. Order: Raw -> Power mods -> Proficiency -> buffs/debuffs -> Domain -> penetration -> "
               "PostDEF=max(Power-TOTAL DEF/MDEF, Power*0.10) -> Resist/Weak -> x one variance .90-1.10 -> "
               "x Crit 1.5 if eligible -> final mods -> ROUND ONCE (min 1) -> Barrier -> HP. DEF comes BEFORE variance.")

TURN_STEPS_START = f"""1 LOAD locked snapshot; never regenerate FIXED.
2 ACTOR: only Current Actor acts.
3 NPC DECISION LOCK: choose NPC action/movement from its own causes BEFORE considering Alaric convenience.
4 HARD LEGALITY before cost: target, resources, ammo, LoS, band. An illegal Alaric action spends/rolls/changes nothing and does not advance the Turn.
5 MOVEMENT: adjacent one-band only unless an explicit locked mobility rule (e.g. EXTRA-BAND) says otherwise.
6 COST exactly once after legality: STA/MP + listed Ammo.
7 HIT: character BaseHit=70+PER*.5; direct Monster=Hit; modifiers; clamp20-95; one d100.
8 CRIT only if hit+eligible; character 5%+PER/10pp (+25pp in a true Ambush Opening Action); generic direct Monster none; one d100.
9 {DAMAGE_LINE}
10 HP0 defeat -> add LOCKED DefeatXP to Pending only.
11 If hostiles remain, advance actor/round exactly once; auto-resolve NPC Turns until Alaric Current Actor or terminal.
12 Audit using SAME rolls/locked data; repair once; verify once.
13 COMMIT complete recoverable FIXED+CURRENT snapshot BEFORE narration. If host tracker cannot store a required field, keep it visible in ordinary mechanical response state; do not omit/reconstruct it. Avereth defines no tag/envelope format.
14 Narration may describe only the committed Current Actor action/effects; no other living combatant takes fresh voluntary action without an explicit reaction/ongoing mechanic. A declared attack never adds an approach, posture change, reload/nock or looting for Alaric."""

TERMINAL_START = """If no hostile remains active: finalize Defeated/Escaped; sum each defeated target's LOCKED DefeatXP once; reconcile Pending; add verified total to persistent XP ONCE; run Level-Up WHILE; expose external loot only; persist state; audit; clear Pending; semantic phase INACTIVE.
Never invent a new XP reward at death/end."""


def start_text(anchor_table, class_table, legend):
    return f"""AVERETH COMBAT ENGINE — START PHASE
{RUN_HEADER_INIT}

A. DETECT
Apply the Critical Combat Gate. If the user's message is informational rather than actual hostile commitment, remain INACTIVE and stop Combat processing.
A visible non-ambush hostile action becomes Pending until Initiative is fixed. It never resolves before Turn Order merely because it triggered Combat.

B. INITIALIZE — COMPLETE LOCK BEFORE ATTACK PROSE
1. Freeze EVERY actual combatant, relevant ENGAGED/SHORT/MEDIUM/LONG Range Bands, terrain/LoS/cover, held/equipped state, current resources/ammo and exact triggering action. Mere observers are not combatants. Do not invent exact meters.
2. Assign stable IDs: Alaric, Wolf#1, Wolf#2, etc.
{INIT_STEPS_3_TO_10}

{anchor_table}

{MONSTER_RULES}

C. RANGE / TURN TRANSACTION
{RANGE_LINES}
{TURN_STEPS_START}

D. TERMINAL END — SAME RESPONSE
{TERMINAL_START}

ACTION TABLE — EXACT BASE-CLASS ACTIONS (reference only: select ONLY actions already present in persistent Skills/current Class; never grant an action from this table)
{legend}
{class_table}"""


def pending_text(anchor_table, class_table, legend):
    return f"""AVERETH COMBAT ENGINE — PENDING INITIALIZATION PHASE
Semantic PENDING means hostile commitment already occurred in an earlier generation but the attack outcome was intentionally NOT improvised.
Host formatting/decoration around that state is irrelevant. {RUN_HEADER_INIT}

A. LOAD PENDING COMMITMENT
Preserve exact participants, relevant Range Bands, terrain/LoS/cover and triggering hostile action. Player input cannot erase/jump ahead of it; an action Alaric declares now waits for his legal Turn.

B. INITIALIZE — COMPLETE LOCK BEFORE ATTACK PROSE
1. Freeze held/equipped state and current resources/ammo of every actual combatant. Do not invent exact meters.
2. Assign stable IDs: Alaric, Wolf#1, Wolf#2, etc.
{INIT_STEPS_3_TO_10}

{anchor_table}

{MONSTER_RULES}

C. RANGE / TURN TRANSACTION
{RANGE_LINES}
{TURN_STEPS_START}

D. TERMINAL END — SAME RESPONSE
{TERMINAL_START}

ACTION TABLE — EXACT BASE-CLASS ACTIONS (reference only: select ONLY actions already present in persistent Skills/current Class; never grant an action from this table)
{legend}
{class_table}"""


def active_text():
    return f"""AVERETH COMBAT ENGINE — ACTIVE PHASE
Run silently; expose committed results, not chain-of-thought. Maximum two passes: CALCULATE -> AUDIT/REPAIR -> FINAL VERIFY. NEVER reroll.

PHASE / SNAPSHOT INTEGRITY LOCK
Previous authoritative context must semantically indicate ACTIVE.
The previous encounter snapshot is the combat database for this fight.
COPY EVERY FIXED profile, Action Library and DefeatXP EXACTLY.
Do NOT consult species anchors, Level scaling, appearance, prose, class templates or generic Gear tables to recreate an already locked combatant.
If any required FIXED field is absent and cannot be copied verbatim from an earlier explicit authoritative snapshot still in context: STOP. Spend/roll/change nothing; preserve Current Actor/phase; surface a private state-integrity notice. NEVER guess/reconstruct the missing field.

FIXED PROFILE REQUIREMENTS
Character: stable ID; Level/Rank/Class/Evolution; STR VIT AGI INT PER WIL; MaxHP/MP/STA; ATK/MATK; Base/TOTAL DEF/MDEF; BaseHit; Crit; Init; combat Gear; exact locked learned Action Library.
Generic Monster: stable ID; Level/Rank; Normal/Elite/Boss; MaxHP/ATK/DEF/MDEF/Hit/Init; Attack Type/MAX Range; Crit:none; explicit authored mechanics only; LOCKED DefeatXP.
CURRENT: HP/MP/STA, ammo, held/equipped state, relevant Range Bands, terrain/cover/LoS, statuses/barriers/temp modifiers, Defeated/Escaped/Pending XP.

TURN TRANSACTION LOOP
1 ACTOR: read Round + Current Actor first. Only Current Actor acts. Alaric = exact user-declared action; NPC = locked legal action according to its own state.
2 NPC DECISION LOCK: choose NPC action + movement from NPC causes BEFORE evaluating whether it helps/hurts Alaric.
3 TARGET: one valid hostile may default; 2+ requires Alaric choice.
4 HARD LEGALITY before cost/ammo/RNG: target, resources, listed Ammo, LoS, band. An illegal Alaric action spends/rolls/changes nothing and does not advance the Turn.
5 MAX RANGE: LONG reaches ENGAGED/SHORT/MEDIUM/LONG; MEDIUM reaches ENGAGED/SHORT/MEDIUM; SHORT reaches ENGAGED/SHORT; ENGAGED reaches ENGAGED only.
6 MOVEMENT: only one adjacent ordinary step: ENGAGED<->SHORT, SHORT<->MEDIUM, MEDIUM<->LONG. No skipped bands. Explicit locked mobility rules may alter this.
7 COST once after legality: STA/MP + listed Ammo. Human MaxSTA100. No universal exhaustion.
8 HIT: character BaseHit=70+PER*.5; Monster=locked Hit; one d100; clamp20-95; no auto-hit from proximity/charge.
9 CRIT only if hit+eligible; character 5%+PER/10pp unless explicit; generic Monster none; one d100.
10 {DAMAGE_LINE}
11 DEFEAT: HP0 -> record once; add exactly LOCKED DefeatXP to Pending. Never recalc/improvise reward. Escaped=0.
12 If hostile remains: advance actor/round once; auto-resolve NPC Turns until Alaric Current Actor or terminal.
13 AUDIT with SAME locked data/rolls; repair once; verify once.
14 COMMIT complete recoverable FIXED+CURRENT snapshot. If host tracker cannot carry a field, keep it visible in ordinary mechanical response state. Do not create a second proprietary tracker format.
15 NARRATE after commit only. During one actor's Turn, no other living combatant gets fresh voluntary movement/action unless an explicit Reaction/Interrupt/Ongoing mechanic already resolved it. A declared attack never adds an approach, posture change, reload/nock or looting for Alaric.

TERMINAL END — SAME RESPONSE
If no hostile remains: finalize Defeated/Escaped; sum each defeated target's LOCKED DefeatXP once; verify Pending; award persistent XP ONCE; run Level-Up WHILE; expose external loot without auto-acquiring; persist state; audit; clear Pending; semantic phase INACTIVE.
If any hostile remains, XP stays Pending and phase remains ACTIVE."""


def creation_text(system_creation_body, class_table, legend, kit_lines):
    return f"""{system_creation_body.rstrip()}

STARTER KITS (from Content [STARTER GEAR]; fixed item-instance values)
{kit_lines}

BASE-CLASS ACTION TABLE (show the selected Class's Basic Attack + six starter Skills; grant only the Basic Attack + exactly 2 chosen starter Skills)
{legend}
{class_table}"""


# ----------------------------------------------------------------------------- DEBUG_CALC appendix
DEBUG_HEAD = ("DEBUG_CALC BUILD — HARD OUTPUT RULE: this response MUST print the VISIBLE CALCULATION AUDIT (below) as "
              "plain mechanical lines before any narration: authoritative values, rolls and arithmetic only, never "
              "chain-of-thought.")

DEBUG_AUDIT = """VISIBLE CALCULATION AUDIT (DEBUG_CALC build only; presentation only, mechanics unchanged)
START/SNAPSHOT: semantic phase; stable IDs; every FIXED profile incl. Action Library and hostile DefeatXP; CURRENT HP/MP/STA/ammo/status/Range Bands; Turn Order, Round, Current Actor, pending action.
EACH ACTION: Actor -> Target | action | band before -> movement -> band after | resource/ammo before -> after | Base Hit + modifiers = Final Hit; d100 -> HIT/MISS | Crit chance; d100 -> CRIT/NO CRIT when eligible | Raw equation with every scaling term unrounded | TOTAL DEF/MDEF and PostDEF | Resistance/Weakness | exact variance | Crit multiplier/final modifiers | final rounded damage | Barrier | HP before -> after | effects created/consumed | Pending XP change | next Round/Current Actor or terminal state.
COMBAT END: Defeated/Escaped; each LOCKED DefeatXP; Pending total; persistent XP before -> after; Level-Up deltas; final semantic INACTIVE.
Mark non-applicable values N/A. Use the host's ordinary presentation; no XML/tags/block order are prescribed."""
