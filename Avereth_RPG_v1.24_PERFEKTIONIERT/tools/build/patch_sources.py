# -*- coding: utf-8 -*-
"""Content patches for the four authoring sources + Character Description.

Every textual change is an asserted exact replacement against the v1.23 baseline text, so a patch
can never silently apply to the wrong place. Metadata/trigger harmonisation happens in main.py.
"""
import copy

from lib import replace_once

CORE_VERSION = "v1.21"
CONTENT_VERSION = "v1.13"
LORE_VERSION = "v0.8"
SYSTEM_VERSION = "v1.12"
WI_VERSION = "v1.23"
PACKAGE = "Avereth RPG v1.24"
CD_VERSION = "v2.3"


# ============================================================================ CORE
def patch_core(core):
    core = copy.deepcopy(core)
    E = core["entries"]
    log = []

    # #11 dangling crit cap (no cap is defined anywhere in Core; see chat-1 research, still open in v1.20)
    E["11"]["content"] = replace_once(
        E["11"]["content"],
        "Base Crit Chance = 5% + (PER ÷10) percentage points, with the PER-derived portion capped as already defined by Core.",
        "Base Crit Chance = 5% + (PER ÷10) percentage points. No cap on the PER-derived portion is defined; do not invent one.",
        "core#11 crit")
    log.append("#11 dangling crit-cap reference removed (no cap exists; none invented)")

    # #12 ordinal range algebra (clarification of the existing band rules)
    E["12"]["content"] = replace_once(
        E["12"]["content"],
        "Do not infer a hidden exact meter value from a Range Band.\n",
        "Do not infer a hidden exact meter value from a Range Band.\n"
        "Ordinal form: ENGAGED=0, SHORT=1, MEDIUM=2, LONG=3. An action may target band b only if b <= its listed "
        "band; one normal movement changes the band by at most 1.\n",
        "core#12 ordinal")
    log.append("#12 ordinal Range-Band algebra added (restates existing max-range + adjacency rules)")

    # #18 outdated non-definitions
    old18 = E["18"]["content"]
    assert old18.startswith("V1.3 DELIBERATE NON-DEFINITIONS:")
    E["18"]["content"] = (
        "DELIBERATE NON-DEFINITIONS:\n"
        "The following are intentionally NOT hard-coded in this Core file:\n"
        "- concrete Classes, class growth, Skills, starter kits, creature anchors and Gear values (Content owns them)\n"
        "- the Character Creation flow and starting possessions (System and First Message own them)\n"
        "- a universal multi-action combat turn beyond one normal one-band movement + 1 Main Action\n"
        "- detailed injury thresholds\n"
        "- fixed numerical out-of-combat natural-regeneration rates\n"
        "- universal fall/collision damage tables\n"
        "- detailed resurrection rules\n"
        "- loot tables, fixed prices, quest rewards other than Quest XP, Guild progression, crafting, or world lore\n\n"
        "Core defines the XP threshold curve, the Combat XP Formula with locked DefeatXP, and Quest XP. Rewards for "
        "discoveries, achievements or other sources belong to later content/reward modules.\n\n"
        "When an intentionally open subsystem is needed, use the appropriate later module/content definition.\n"
        "Do not silently import rules from Obsidian Summoner, Aethermere, D&D, or another RPG simply because this Core "
        "leaves that subsystem open.\n")
    E["18"]["comment"] = "[CORE] Deliberate Non-Definitions"
    log.append("#18 non-definitions updated to the current module split (were frozen at v1.3)")

    # #21 ammunition: generic Core rule; concrete Ammo values live in Content
    E["21"]["content"] = (
        "PHYSICAL AMMUNITION\n\n"
        "Bows require physical arrows.\n\n"
        "- A bow attack consumes the number of arrows it explicitly fires, as listed in the action's Ammo field in Content.\n"
        "- A normal single-projectile bow attack consumes 1 arrow.\n"
        "- Twin Shot consumes 2 arrows (its Content Ammo field).\n"
        "- Ammunition is committed exactly once together with the action's Cost, only after the action passed full "
        "legality. An illegal or unaffordable action consumes no ammunition.\n"
        "- If the character lacks enough arrows for the declared attack, that attack cannot be performed: no Cost, "
        "ammunition, roll or Turn advance.\n"
        "- Track remaining arrows as physical Inventory state.\n"
        "- Ordinary arrows add no bonus damage, accuracy, status, Rank, or other modifier.\n"
        "- Magical projectiles (for example a Mage Basic Attack or Arcane Bolt) use no physical ammunition unless "
        "their action lists Ammo.\n"
        "- Special ammunition may exist later only when Content explicitly defines it.\n"
        "- A future Skill that represents an unusual number of projectiles should state its ammunition use explicitly "
        "rather than inventing a hidden damage or ammo rule.\n")
    log.append("#21 ammunition: Content Ammo field, commit-with-cost timing, magical projectiles need no ammo")

    # #23 start data safety also covers an undetected PC-started encounter (runtime START trigger is lexical)
    E["23"]["content"] = replace_once(
        E["23"]["content"],
        "Player input cannot erase or jump ahead of that pending commitment.\n",
        "Player input cannot erase or jump ahead of that pending commitment.\n"
        "The same data safety applies when an attack Alaric declares starts a NEW encounter in a generation where "
        "complete Combat Initialization rules/data are not available: never improvise its outcome; persist it as the "
        "PENDING triggering action. An encounter that is already ACTIVE is never re-frozen this way.\n",
        "core#23 fallback")
    log.append("#23 start data safety also covers a new encounter started by Alaric when the START rules are not loaded")

    # #24 ambush provenance + PC action scope
    E["24"]["content"] = replace_once(
        E["24"]["content"],
        "A true Ambush requires the target to be genuinely unaware of the attacker/attack until commitment.\n",
        "A true Ambush requires the target to be genuinely unaware of the attacker/attack until commitment.\n"
        "Unawareness, concealment or favorable position must rest on established facts or actions the user actually "
        "declared; a posture, hiding place or stealth approach the narrator invented for Alaric never creates an "
        "Ambush or any other mechanical advantage.\n",
        "core#24 ambush")
    E["24"]["content"] = replace_once(
        E["24"]["content"],
        "Physical momentum already created by a resolved effect may continue narratively only when it does not create an extra mechanical action.",
        "Physical momentum already created by a resolved effect may continue narratively only when it does not create an extra mechanical action.\n\n"
        "PC ACTION SCOPE\n"
        "A declared attack or Skill authorizes only that action and its written movement component. It never adds an "
        "approach, posture change, reload/nock, looting, inspection or repositioning for Alaric afterwards unless the "
        "user declared it; otherwise his previous position, posture and held items are copied forward unchanged.",
        "core#24 scope")
    log.append("#24 ambush-provenance rule + PC ACTION SCOPE (v1.23 DEBUG-run findings)")

    # #26 START step 8: complete ambush rule inline
    E["26"]["content"] = replace_once(
        E["26"]["content"],
        "True successful Ambush -> resolve Opening Action under Ambush rules.",
        "True successful Ambush -> resolve Opening Action under Ambush rules (eligible attacks +25 percentage points "
        "Crit Chance; no Hit or Damage bonus; then normal Initiative).",
        "core#26 ambush")
    log.append("#26 START step 8 carries the full Ambush rule (+25pp Crit was dropped in the v1.23 run)")

    # #27 ACTIVE step 9: explicit DEF-before-variance
    E["27"]["content"] = replace_once(
        E["27"]["content"],
        "Crit x1.5 if eligible -> Final modifiers -> round ONCE -> Barrier -> HP.\n",
        "Crit x1.5 if eligible -> Final modifiers -> round ONCE -> Barrier -> HP.\n"
        "Defense is always applied BEFORE variance: PostDEF = max(Modified Power - applicable TOTAL DEF/MDEF, "
        "Modified Power x0.10), then Resistance/Weakness, then variance.\n",
        "core#27 order")
    log.append("#27 ACTIVE step 9 states DEF-before-variance explicitly (latent order error in the v1.23 run)")

    # #27/#28/#29 key rotation (each carried the keys of its neighbour)
    k27, k28, k29 = E["27"]["key"], E["28"]["key"], E["29"]["key"]
    assert k27[0] == "COMBAT END" and k28[0] == "combat audit" and k29[0] == "COMBAT ACTIVE"
    E["27"]["key"], E["28"]["key"], E["29"]["key"] = k29, k27, k28
    log.append("#27/#28/#29 rotated keys fixed (ACTIVE had END keys, END had AUDIT keys, AUDIT had ACTIVE keys)")
    return core, log


# ============================================================================ CONTENT
def patch_content(content):
    content = copy.deepcopy(content)
    E = content["entries"]
    r = E["5"]["content"]
    r = replace_once(r, "Cost: 5 STA\nRange: MEDIUM\nHit Modifier: +0\nEffect: none. With a bow, consumes 1 physical arrow.",
                     "Cost: 5 STA\nAmmo: 1 arrow when fired from a bow\nRange: MEDIUM\nHit Modifier: +0\nEffect: none.",
                     "ranger basic")
    r = replace_once(r, "Cost: 7 STA\nRange: LONG\nHit Modifier: +10",
                     "Cost: 7 STA\nAmmo: 1 arrow when fired from a bow\nRange: LONG\nHit Modifier: +10", "aimed")
    r = replace_once(r, "Cost: 12 STA\nRange: LONG\nHit Modifier: -10",
                     "Cost: 12 STA\nAmmo: 1 arrow when fired from a bow\nRange: LONG\nHit Modifier: -10", "power")
    r = replace_once(r, "Cost: 5 STA\nRange: MEDIUM\nHit Modifier: +5",
                     "Cost: 5 STA\nAmmo: 1 arrow when fired from a bow\nRange: MEDIUM\nHit Modifier: +5", "quick")
    r = replace_once(r, "Cost: 11 STA\nRange: MEDIUM\n",
                     "Cost: 11 STA\nAmmo: 2 arrows when fired from a bow\nRange: MEDIUM\n", "twin")
    E["5"]["content"] = r
    log = ["#5 Ranger: explicit Ammo field on Basic Attack, Aimed Shot, Power Shot, Quick Shot (1 arrow) and "
           "Twin Shot (2 arrows) — the Core ammo rule named Twin Shot while Content listed no ammo"]
    return content, log


# ============================================================================ SYSTEM
def patch_system(system):
    system = copy.deepcopy(system)
    E = system["entries"]
    log = []
    E["1"]["content"] = replace_once(E["1"]["content"], "V0.1 COMMANDS ARE READ-ONLY:", "COMMANDS ARE READ-ONLY:", "sys#1")
    E["10"]["content"] = replace_once(E["10"]["content"], "V0.1 canonical commands:", "Canonical commands:", "sys#10a")
    E["10"]["content"] = replace_once(
        E["10"]["content"],
        "While Creation_State is not READY, ordinary replies are handled by the System creation flow.",
        "Until CHARACTER CREATION COMPLETE has been committed, ordinary replies are handled by the System creation flow.",
        "sys#10b")
    log.append("#1/#10 stale 'V0.1' labels and stale 'Creation_State READY' field name replaced")

    c5 = E["5"]["content"]
    c5 = replace_once(c5, "- path-specific Growth currently gained per Level,",
                      "- any explicit evolution-granted growth currently gained per Level, if one exists,", "sys#5a")
    c5 = replace_once(c5, "do not display the obsolete Stage-III passive as simultaneously active.",
                      "do not display the former Class Passive as simultaneously active.", "sys#5b")
    c5 = replace_once(c5, "- Radius\n", "- Range Band reach (default SHORT around the owner unless explicit content changes it)\n",
                      "sys#5c")
    E["5"]["content"] = c5
    log.append("#5 stale concepts fixed: 'path-specific Growth', 'Stage-III passive', Domain 'Radius' -> Range-Band reach")

    assert "combat overlay" in E["11"]["key"]
    E["11"]["key"] = [k for k in E["11"]["key"] if k != "combat overlay"]
    log.append("#11 stale key 'combat overlay' removed (combat overlays were removed in v1.15)")

    c12 = E["12"]["content"]
    c12 = replace_once(
        c12,
        "HARD FREEZE\n",
        "SYSTEM UI LABELS (System-owned text used for routing; not a host tracker format)\n"
        "The First Message shows CHARACTER CREATION — STEP 1/2. The Step1 response shows CHARACTER CREATION — STEP 2/2, "
        "CLASS SELECTED: <Class> and asks the player to Select exactly 2 Skills. The Step2 completion response shows "
        "CHARACTER CREATION COMPLETE.\n\n"
        "HARD FREEZE\n",
        "sys#12 labels")
    c12 = replace_once(c12, "- the response that completes Step2 remains System/creation-only;",
                       "- the response that completes Step2 remains System/creation-only with ZERO world narration;",
                       "sys#12 zero")
    c12 = replace_once(c12, "- grant/equip exact starter kit only now;",
                       "- grant/equip the selected Class's exact starter kit from Content [STARTER GEAR] only now;",
                       "sys#12 kit")
    start = c12.index("DERIVED VALIDATION\n")
    end = c12.index("HANDOFF / GENERIC-GEAR LOCK\n")
    removed = c12[start:end]
    assert "STARTER KIT MAP" in removed and "Level1 Ranger after favored growth" in removed
    c12 = c12[:start] + c12[end:]
    E["12"]["content"] = c12
    E["12"]["key"] = ["CHARACTER CREATION — STEP 1/2", "CHARACTER CREATION — STEP 2/2", "Choose your Base Class",
                      "Select exactly 2 Skills", "CLASS SELECTED"]
    log.append("#12 Creation: explicit System UI labels (routing), kit taken from Content, test oracle "
               "(DERIVED VALIDATION) and duplicate STARTER KIT MAP removed; keys aligned with runtime labels")

    E["14"]["content"] = replace_once(
        E["14"]["content"],
        "VISIBLE COMBAT CALCULATION AUDIT — OPTIONAL TEST MODE\nThis is a temporary diagnostics mode. It changes presentation only, never mechanics.\n",
        "VISIBLE COMBAT CALCULATION AUDIT — OPTIONAL TEST MODE\nThis is a temporary diagnostics mode. It changes presentation only, never mechanics.\n"
        "BUILD RULE: this mode exists only in the separate DEBUG_CALC WorldInfo build, appended to START/PENDING/ACTIVE "
        "with one short hard output rule at the top (the v1.23 run loaded the long contract but did not print it). The "
        "standard WorldInfo never contains it.\n",
        "sys#14")
    log.append("#14 debug audit: bound to the separate DEBUG_CALC build; hard output rule documented")
    return system, log, removed


# ============================================================================ CHARACTER DESCRIPTION
CD_DELTA_SECTION = """PC STATE DELTA CHECK
Before committing the next PC state, compare it against the previous state. Every new voluntary change in Alaric's position, posture, held items, readied weapon/ammunition or locomotion must be directly licensed by the current user input; otherwise copy the previous state unchanged.

A declared attack does not authorize Alaric to approach the target, change posture, reload/nock another projectile, loot, inspect or reposition afterward. Following a sound with a bow ready does not make him crouch or sneak.

A posture, hiding place or stealth approach the narrator invented for Alaric never becomes a mechanical advantage (Ambush, concealment, cover or position).

"""


def patch_cd(cd_text):
    anchor = "WORLD INDIFFERENCE & NARRATIVE FRICTION\n"
    cd = replace_once(cd_text, anchor, CD_DELTA_SECTION + anchor, "cd delta")
    cd = replace_once(
        cd,
        "9. During Combat, did I drag in an uninvolved NPC without material consequence?\n",
        "9. During Combat, did I drag in an uninvolved NPC without material consequence?\n"
        "10. Did Alaric's position, posture, held items, readied ammunition or locomotion change without the current user input licensing it?\n",
        "cd check")
    return cd, ["PC STATE DELTA CHECK section added (after PHYSICAL CONTINUITY)",
                "FINAL SANDBOX CHECK item 10 added (PC state delta)"]
