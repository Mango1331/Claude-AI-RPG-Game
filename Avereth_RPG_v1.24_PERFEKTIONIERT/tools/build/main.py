# -*- coding: utf-8 -*-
"""Avereth RPG v1.24 build: patch the four authoring sources, compile the WorldInfo (standard + DEBUG_CALC),
write the perfected files. Originals are read from ../zip and never modified.

Run:  python3 main.py
"""
import copy
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import content_model as cm  # noqa: E402
import patch_sources as ps  # noqa: E402
import texts as tx  # noqa: E402
import triggers as tg  # noqa: E402
from lib import (OUT_DIR, REPORT_DIR, SOURCE_FIELD_ORDER, WI_FIELD_ORDER, dump_json, dump_text, load_json, load_text,  # noqa: E402
                 normalize_entry, ws)

ORIG = {
    "core": "RPG_Core_Mechanics_v1.20.json",
    "content": "RPG_Content_v1.12.json",
    "lore": "RPG_Lore_v0.7.json",
    "system": "RPG_System_v1.11.json",
    "wi": "Avereth_RPG_WorldInfo_4096_v1.22.json",
    "cd": "Avereth_RPG_Character_Description_v2.2.txt",
}
OUT_NAMES = {
    "core": "RPG_Core_Mechanics_v1.20_PERFEKTIONIERT.json",
    "content": "RPG_Content_v1.12_PERFEKTIONIERT.json",
    "lore": "RPG_Lore_v0.7_PERFEKTIONIERT.json",
    "system": "RPG_System_v1.11_PERFEKTIONIERT.json",
    "wi": "Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json",
    "wi_debug": "Avereth_RPG_WorldInfo_4096_v1.22_DEBUG_CALC_PERFEKTIONIERT.json",
    "cd": "Avereth_RPG_Character_Description_v2.2_PERFEKTIONIERT.txt",
}
SRC_LABEL = {"core": f"RPG_Core_Mechanics_{ps.CORE_VERSION}", "content": f"RPG_Content_{ps.CONTENT_VERSION}",
             "lore": f"RPG_Lore_{ps.LORE_VERSION}", "system": f"RPG_System_{ps.SYSTEM_VERSION}"}

# WI uid -> (source file, source uid) for entries compiled VERBATIM (content = source content).
VERBATIM = {4: ("core", 13), 5: ("core", 14), 6: ("core", 15), 7: ("core", 16), 8: ("core", 17), 9: ("core", 19),
            10: ("core", 7), 11: ("core", 8), 13: ("core", 20), 14: ("core", 22), 15: ("core", 4), 16: ("core", 5),
            17: ("core", 6), 45: ("system", 1)}
VERBATIM.update({18 + i: ("content", i) for i in range(12)})
VERBATIM.update({30 + i: ("lore", i) for i in range(15)})
VERBATIM.update({57 + i: ("lore", 15 + i) for i in range(4)})
VERBATIM.update({46 + i: ("system", 3 + i) for i in range(8)})
REMOVED = {62: "byte-identical duplicate of WI #19 (Warrior class); its info-query trigger moved to #19",
           63: "byte-identical duplicate of WI #20 (Mage class); its info-query trigger moved to #20",
           64: "byte-identical duplicate of WI #21 (Guardian class); its info-query trigger moved to #21",
           65: "byte-identical duplicate of WI #22 (Duelist class); its info-query trigger moved to #22",
           66: "byte-identical duplicate of WI #23 (Ranger class); its info-query trigger moved to #23",
           67: "debug audit belongs only to the separate DEBUG_CALC build (a keyword entry cannot act as a persistent mode)"}

# Where each source entry lives at runtime (documentation written into the sources: extensions.rpg_compile).
CORE_TARGETS = {
    0: ("kernel", "condensed: AUTHORITY"), 1: ("kernel", "condensed: PERSISTENCE"),
    2: ("kernel + START/PENDING/ACTIVE", "condensed: DERIVED CORE, profiles"),
    3: ("WI #12 + kernel", "WI #12 = Core #3 + Core #25 verbatim"), 4: ("WI #15", "verbatim"), 5: ("WI #16", "verbatim"),
    6: ("WI #17", "verbatim"), 7: ("WI #10", "verbatim"), 8: ("WI #11", "verbatim"),
    9: ("kernel + START/PENDING/ACTIVE", "condensed: RNG LOCK / audit never rerolls"),
    10: ("START/PENDING/ACTIVE", "condensed: turn step 7 HIT"),
    11: ("kernel + START/PENDING/ACTIVE", "condensed: PRECISION LOCK, turn step 9 DAMAGE"),
    12: ("WI #3 + kernel + START/PENDING/ACTIVE", "condensed: RANGE CORE, turn step 5, combat detail"),
    13: ("WI #4", "verbatim"), 14: ("WI #5", "verbatim"), 15: ("WI #6", "verbatim"), 16: ("WI #7", "verbatim"),
    17: ("WI #8", "verbatim"), 18: ("not compiled", "authoring note only"), 19: ("WI #9", "verbatim"),
    20: ("WI #13", "verbatim"), 21: ("kernel + START/PENDING/ACTIVE", "condensed: AMMO, turn steps 4/6"),
    22: ("WI #14", "verbatim"), 23: ("kernel", "condensed: COMBAT GATE, PHASE, START FALLBACK"),
    24: ("START/PENDING/ACTIVE + kernel", "condensed: initiative, ambush, actor/narration lock, PC ACTION SCOPE"),
    25: ("WI #12 + START/PENDING", "WI #12 verbatim; DefeatXP formula condensed into START/PENDING"),
    26: ("WI #1 START + WI #55 PENDING", "condensed: initialization B"),
    27: ("WI #2 ACTIVE + START/PENDING", "condensed: turn transaction C"),
    28: ("START/PENDING/ACTIVE", "condensed: terminal end D"), 29: ("START/PENDING/ACTIVE", "condensed: audit steps"),
}
SYSTEM_TARGETS = {0: ("kernel + WI #61", "condensed"), 1: ("WI #45", "verbatim"), 2: ("WI #61", "condensed: Query Knowledge Guard"),
                  11: ("not compiled separately", "combat XP-notice ownership is covered by START/PENDING/ACTIVE"),
                  12: ("WI #54 Creation", "System #12 verbatim + generated Content action table and starter kits"),
                  13: ("START/PENDING/ACTIVE", "condensed: turn step 14 COMMIT + ACTIVE snapshot lock"),
                  14: ("DEBUG_CALC build only", "appended to START/PENDING/ACTIVE with a hard output rule")}
for i in range(3, 11):
    SYSTEM_TARGETS[i] = (f"WI #{43 + i}", "verbatim")

TRIGGER_FIELDS = ["key", "keysecondary", "constant", "vectorized", "selective", "selectiveLogic", "order", "position",
                  "disable", "ignoreBudget", "excludeRecursion", "preventRecursion", "delayUntilRecursion",
                  "probability", "useProbability", "depth", "group", "groupOverride", "groupWeight",
                  "useGroupScoring", "scanDepth", "caseSensitive", "matchWholeWords", "role", "sticky", "cooldown",
                  "delay"]


def main():
    core, content, lore, system, wi = (load_json(ORIG[k]) for k in ("core", "content", "lore", "system", "wi"))
    cd = load_text(ORIG["cd"])
    report = {"core": [], "content": [], "lore": [], "system": [], "wi": [], "cd": []}

    # ------------------------------------------------------------------ 1. source content patches
    core2, report["core"] = ps.patch_core(core)
    content2, report["content"] = ps.patch_content(content)
    system2, report["system"], removed_creation_text = ps.patch_system(system)
    lore2 = copy.deepcopy(lore)                           # world text unchanged
    cd2, report["cd"] = ps.patch_cd(cd)

    # sanity: every v1.22 verbatim WI entry was byte-identical to its ORIGINAL source
    src_orig = {"core": core, "content": content, "lore": lore, "system": system}
    for uid, (f, su) in VERBATIM.items():
        assert wi["entries"][str(uid)]["content"] == src_orig[f]["entries"][str(su)]["content"], (uid, f, su)

    # ------------------------------------------------------------------ 2. structured Content model + tables
    classes = {}
    for k in ["1", "2", "3", "4", "5"]:
        c = cm.parse_class_entry(content2["entries"][k]["content"])
        classes[c["name"]] = c
    kits = cm.parse_starter_kits(content2["entries"]["11"]["content"])
    anchors = cm.parse_monster_anchors(content2["entries"]["7"]["content"])
    class_table = cm.render_class_table(classes)
    n_checked = cm.verify_class_table(class_table, classes)
    anchor_table = cm.render_anchor_table(anchors)
    cm.verify_anchor_table(anchor_table, anchors)
    # the compact monster rules restate Content #7/#8 — every number is checked against the canonical text
    c7, c8 = content2["entries"]["7"]["content"], content2["entries"]["8"]["content"]
    for runtime, canon, src_text in [
        ("HP=round(HP1*(1+.20g))", "HP = round(HP1 × (1 + 0.20g))", c7),
        ("ATK=round(ATK1*(1+.22g))", "ATK = round(ATK1 × (1 + 0.22g))", c7),
        ("DEF=max(0,round((DEF1+1)*(1+.20g)-1)); MDEF same", "MDEF = max(0, round((MDEF1 + 1) × (1 + 0.20g) - 1))", c7),
        ("Hit=min(95,Hit1+2*floor(g/15))", "Hit = min(95, Hit1 + 2×floor(g/15))", c7),
        ("Init=round(Init1*(1+.05g))", "Init = round(Init1 × (1 + 0.05g))", c7),
        ("F1-14 E15-29 D30-44 C45-59 B60-74 A75-89 S90-104", "F 1-14 | E 15-29 | D 30-44 | C 45-59 | B 60-74 | A 75-89 | S 90-104", c7),
        ("ordinary nearby wilderness F1-F3", "ordinary nearby wilderness: F1-F3", c7),
        ("explicitly remote/deep dangerous wilderness F4-F7", "explicitly remote/deep dangerous wilderness: F4-F7", c7),
        ("(max F14)", "never above F14", c7),
        ("HP/ATK +-20%, DEF/MDEF +-1, Hit +-5pp, Init +-2", "- HP/ATK roughly ±20%;\n- DEF/MDEF ±1;\n- Hit ±5 percentage points;\n- Initiative ±2;", c7),
        ("Elite HP x1.75, ATK x1.15, DEF/MDEF x1.10, Hit +5pp, Init +2", "Elite: HP ×1.75; ATK ×1.15; DEF/MDEF ×1.10; Hit +5pp; Init +2.", c8),
        ("Boss HP x2.50, ATK x1.30, DEF/MDEF x1.20, Hit +5pp, Init +3", "Boss: HP ×2.50; ATK ×1.30; DEF/MDEF ×1.20; Hit +5pp; Init +3.", c8),
    ]:
        assert runtime in tx.MONSTER_RULES, runtime
        assert canon in src_text, canon
    # DefeatXP / crit / ambush numbers restated in the phase texts
    c25, c24 = core2["entries"]["25"]["content"], core2["entries"]["24"]["content"]
    assert "same x1; +1 x2; +2 x4; +3+ x8; -1 x0.5; -2 or lower x0.25" in c25
    assert "same x1, +1 x2, +2 x4, +3+ x8, -1 x0.5, -2 or lower x0.25" in tx.INIT_STEPS_3_TO_10
    assert "Normal x1; Elite x1.5; Boss x2.5" in c25 and "Normal1/Elite1.5/Boss2.5" in tx.INIT_STEPS_3_TO_10
    assert "+25 percentage points Crit Chance" in c24 and "+25pp Crit" in tx.INIT_STEPS_3_TO_10
    assert "Tie: higher PER when both profiles possess PER; otherwise resolve the tie once without bias" in c24
    # Ranger ammo must now be data
    ranger = {a["name"]: a for a in classes["RANGER"]["actions"]}
    assert ranger["Twin Shot"]["fields"]["Ammo"].startswith("2 arrows")
    assert all(ranger[n]["fields"]["Ammo"].startswith("1 arrow") for n in ["Basic Attack", "Aimed Shot", "Power Shot", "Quick Shot"])
    kit_lines = "\n".join(f"{c}: " + "; ".join(kits[c]) for c in cm.CLASS_ORDER)
    common = content2["entries"]["11"]["content"]
    bootstrap = common[common.index("COMMON BOOTSTRAP ITEMS:"):common.index("CREATION-COMPLETION EFFECT:")].strip()
    boot_items = [ln[2:] for ln in bootstrap.split("\n") if ln.startswith("- ")]
    assert boot_items == ["Simple Traveler's Clothes [unranked; no combat values]", "Small Pouch [unranked]", "5 Silver"], boot_items
    kit_lines += "\nALL (before Class selection, kept): " + "; ".join(boot_items)

    # ------------------------------------------------------------------ 3. compile WorldInfo
    wi2 = {"entries": {}, "extensions": {}}
    new_contents = {}
    src_new = {"core": core2, "content": content2, "lore": lore2, "system": system2}
    for uid, (f, su) in VERBATIM.items():
        new_contents[uid] = src_new[f]["entries"][str(su)]["content"]
    new_contents[0] = tx.KERNEL
    new_contents[1] = tx.start_text(anchor_table, class_table, cm.TABLE_LEGEND)
    new_contents[55] = tx.pending_text(anchor_table, class_table, cm.TABLE_LEGEND)
    new_contents[2] = tx.active_text()
    new_contents[54] = tx.creation_text(system2["entries"]["12"]["content"], class_table, cm.TABLE_LEGEND, kit_lines)
    new_contents[12] = core2["entries"]["3"]["content"].rstrip("\n") + "\n\n" + core2["entries"]["25"]["content"]
    new_contents[3] = wi["entries"]["3"]["content"]
    new_contents[61] = wi["entries"]["61"]["content"]

    keep_uids = sorted(int(k) for k in wi["entries"] if int(k) not in REMOVED)
    assert set(keep_uids) == set(new_contents), set(keep_uids) ^ set(new_contents)
    for uid in keep_uids:
        e = copy.deepcopy(wi["entries"][str(uid)])
        e["content"] = new_contents[uid]
        wi2["entries"][str(uid)] = e
    E = wi2["entries"]

    # --- trigger hygiene / fixes
    E["1"]["key"] = [tg.START_ATTACK_RE, tg.START_ACTION_RE, tg.START_SKILL_RE, tg.START_SKILL_CAP_RE, tg.START_SKILL_USE_RE]
    E["1"]["keysecondary"] = [tg.CMD_RE, tg.START_INFO_RE, tg.START_INFO_REV_RE, tg.CREATION_STEP_RE,
                              "Choose your Base Class", "Select exactly 2 Skills", "CLASS SELECTED"]
    E["1"]["selectiveLogic"] = 2
    E["1"]["scanDepth"] = 2
    E["2"]["key"] = [tg.ACTIVE_RE]
    E["2"]["keysecondary"] = [tg.ENDED_RE, tg.COMBAT_END_RE, tg.CMD_RE]
    E["55"]["key"] = [tg.PENDING_RE, tg.START_PENDING_RE]
    E["55"]["keysecondary"] = [tg.ACTIVE_RE, tg.ENDED_RE, tg.COMBAT_END_RE, tg.CMD_RE]
    E["54"]["key"] = [tg.CREATION_STEP_RE, "Choose your Base Class", "Select exactly 2 Skills", "CLASS SELECTED"]
    E["54"]["keysecondary"] = [tg.CREATION_COMPLETE_RE, tg.ACTIVE_RE, tg.PENDING_RE]
    E["3"]["key"] = ["multi-hit", "AoE", "area attack", "partial cover", "full cover", "forced movement", "ambush",
                     tg.MULTI_SKILL_RE]
    E["6"]["key"] = ["Barrier", tg.WARD_SKILL_RE, tg.POWER_VS_POWER_RE]
    E["7"]["key"] = [tg.ELEMENT_USER_RE, tg.ELEMENT_TAG_RE]
    assert E["4"]["key"] == ["burning", "bleeding", "poisoned", "slowed", "stunned", "silenced", "frozen",
                             "off-balance", "crippled", "weakened", "empowered"], E["4"]["key"]
    E["4"]["key"] = [tg.STATUS_CAP_RE, tg.STATUS_USER_RE]
    E["25"]["key"] = ["monster stats", "monster profile", "monster mechanics", "monster level", "monster scaling",
                      "fauna scaling", "F-rank monster", "creature stats", "creature level", "body-plan anchor",
                      tg.SYSTEM_MONSTER_RE]
    E["45"]["key"] = [tg.COMMAND_ROUTER_RE]
    for uid, cls in zip(range(19, 24), cm.CLASS_ORDER):
        base = [k for k in E[str(uid)]["key"]]
        assert base == [f"{cls.capitalize()} class", f"{cls.capitalize()} Base Class", f"{cls.capitalize()} skills"], base
        E[str(uid)]["key"] = base + [tg.class_info_re(cls), tg.class_single_re(cls), tg.class_cmd_re(cls)]
        E[str(uid)]["scanDepth"] = 2
    report["wi"] += [
        "#0 kernel: TOTAL DEF/MDEF, ordinal Range-Band algebra, AMMO rule (Core #21 was never compiled), DEF before "
        "variance, START FALLBACK for any new encounter incl. an attack Alaric declares, PC ACTION SCOPE + "
        "advantage provenance",
        "#1 START / #55 PENDING: complete Ambush rule (+25pp Crit, no Hit/Damage bonus), explicit damage chain "
        "PostDEF -> Resist/Weak -> variance -> Crit -> round once, listed Ammo in legality and cost, initiative tie "
        "rule, PC action scope; the three verbatim class copies replaced by ONE generated, round-trip-verified action "
        "table (247 fields checked against Content)",
        "#2 ACTIVE: listed Ammo in legality and cost, explicit PostDEF formula (DEF before variance), PC action scope",
        "#54 Creation: System UI labels, starter kits from Content, Ranger test oracle and duplicate kit map removed, "
        "generated action table",
        "#12 Progression: rebuilt from Core #3 + #25 (the old merge was stale and lacked the DefeatXP lock)",
        "#1 START: attack regex rebuilt (morphology bugs fixed, bite/gore/'fire' false positives removed, idioms such "
        "as 'strike a deal' or 'cast a glance' excluded locally), second regex for subject-led and projectile phrasings "
        "('I lunge/charge ...', 'put an arrow in', 'open fire'), all keys restricted to the latest message, scanDepth 2 "
        "so NOT-ANY can see creation markers; NOT ANY narrowed from generic words (explain/describe/what is) to "
        "'#'-commands and skill-info questions",
        "#2 ACTIVE / #55 PENDING: phase regex accepts only decoration between 'Combat' and the value and resolves "
        "transitions (PENDING -> ACTIVE); fixes 'Combat: ACTIVE, Pending XP' collision and quest 'Status: ACTIVE' "
        "false positives; '#' commands never run a combat engine",
        "#54 Creation: bare 'CHARACTER CREATION' key removed (could hijack a combat turn at order 1003); explicit step "
        "markers; blocked while a combat phase marker is present",
        "#3/#6: skill-name keys only count in the latest message (tracker skill lists re-fired them every turn)",
        "#7 Elements: user-message words + CAPS tracker tags only (narration 'smoke/wet/frozen' no longer loads it)",
        "#4 Status: capitalised status names (tracker/System) or status words in the latest user message; narrative "
        "'frozen puddle' / 'bleeding boar' no longer loads it (narrative wounds are not statuses, Core #14)",
        "#25 Monster: species words removed again (v1.20 decision; 5.9k chars loaded on every animal mention); START/"
        "PENDING carry anchors, scaling, level selection and Elite/Boss modifiers",
        "#19-#23: replace the removed reference caches: info questions (#skill, what/how/explain + skill name) in the "
        "latest message, and #skills/#class for the PC's own class",
        "#45: command router only when '#' is the first character (System rule)",
    ]

    # --- per-entry extensions (accurate provenance)
    for uid in keep_uids:
        e = E[str(uid)]
        if uid in VERBATIM:
            f, su = VERBATIM[uid]
            e["extensions"] = {"rpg_master_source": f"{SRC_LABEL[f]} #{su}", "rpg_compile_mode": "verbatim"}
    E["0"]["extensions"] = {"rpg_master_source": f"SYNTHETIC from Core {ps.CORE_VERSION} #0-#3/#9/#11/#12/#21/#23/#24/#25 + "
                                                 f"System {ps.SYSTEM_VERSION} #0 + Lore {ps.LORE_VERSION} #18",
                            "rpg_compile_mode": "condensed"}
    E["1"]["extensions"] = {"rpg_master_source": f"SYNTHETIC from Core {ps.CORE_VERSION} #10-#12/#21/#24-#29 + Content "
                                                 f"{ps.CONTENT_VERSION} #1-#5/#7/#8 (generated tables) + System {ps.SYSTEM_VERSION} #13",
                            "rpg_compile_mode": "condensed+generated"}
    E["55"]["extensions"] = dict(E["1"]["extensions"])
    E["2"]["extensions"] = {"rpg_master_source": f"SYNTHETIC from Core {ps.CORE_VERSION} #10/#11/#21/#24/#25/#27/#28/#29 + "
                                                 f"System {ps.SYSTEM_VERSION} #13", "rpg_compile_mode": "condensed"}
    E["3"]["extensions"] = {"rpg_master_source": f"SYNTHETIC from Core {ps.CORE_VERSION} #12/#24", "rpg_compile_mode": "condensed"}
    E["12"]["extensions"] = {"rpg_master_source": f"{SRC_LABEL['core']} #3 + #25", "rpg_compile_mode": "verbatim-merge"}
    E["54"]["extensions"] = {"rpg_master_source": f"{SRC_LABEL['system']} #12 + Content {ps.CONTENT_VERSION} #1-#5/#11 "
                                                  "(generated tables)", "rpg_compile_mode": "verbatim+generated"}
    E["61"]["extensions"] = {"rpg_master_source": f"SYNTHETIC from System {ps.SYSTEM_VERSION} #1/#2/#8",
                             "rpg_compile_mode": "condensed"}

    # --- normalise template + top-level metadata
    for uid in keep_uids:
        E[str(uid)] = normalize_entry(E[str(uid)], WI_FIELD_ORDER)
    old_meta = wi["extensions"]["rpg_master_worldinfo"]
    wi2["extensions"] = {"rpg_master_worldinfo": {
        "version": ps.WI_VERSION,
        "package": ps.PACKAGE,
        "sources": [SRC_LABEL[k] for k in ("core", "content", "lore", "system")],
        "design": ("Phase-isolated host-independent runtime: one constant kernel; mutually exclusive Creation/ACTIVE/"
                   "PENDING/START engines (inclusion group, highest order wins); START/PENDING/Creation carry ONE "
                   "generated, round-trip-verified action table instead of verbatim class copies; phase triggers "
                   "tolerate host decoration and resolve transitions; mechanics triggers read the latest message "
                   "where tracker text would otherwise re-fire them; no host-specific output envelope."),
        "recommended_settings": old_meta["recommended_settings"],
        "build": {"generator": "tools/build/main.py (Avereth v1.24 build)",
                  "removed_entries": {str(k): v for k, v in REMOVED.items()},
                  "action_table_fields_verified": n_checked},
        "changes": report["wi"],
    }}

    # ------------------------------------------------------------------ 4. sources: metadata, compile map, trigger mirror
    mirror_from = {}
    for uid, (f, su) in VERBATIM.items():
        mirror_from[(f, su)] = E[str(uid)]
    targets = {"core": CORE_TARGETS, "system": SYSTEM_TARGETS}
    for fname, doc in (("core", core2), ("content", content2), ("lore", lore2), ("system", system2)):
        for k, e in doc["entries"].items():
            su = int(k)
            if (fname, su) in mirror_from:
                w = mirror_from[(fname, su)]
                for fld in TRIGGER_FIELDS:
                    e[fld] = copy.deepcopy(w[fld])
                wiuid = [u for u, v in VERBATIM.items() if v == (fname, su)][0]
                comp = {"runtime": f"WI #{wiuid}", "mode": "verbatim",
                        "note": "trigger fields mirror the compiled WorldInfo entry"}
            else:
                t = targets.get(fname, {}).get(su)
                assert t, (fname, su)
                comp = {"runtime": t[0], "mode": t[1]}
                e["constant"] = False
            ext = e.get("extensions") or {}
            if fname == "core":
                ext["rpg_core_version"] = ps.CORE_VERSION
            elif fname == "content":
                ext.pop("rpg_content", None)
                ext["rpg_content_version"] = ps.CONTENT_VERSION
                ext.pop("rpg_monster_test_content", None)
                ext.pop("rpg_test_content", None)
            elif fname == "lore":
                sec = (ext.get("rpg_lore") or {}).get("section", "compact-lore")
                ext["rpg_lore"] = {"section": sec, "version": ps.LORE_VERSION}
            elif fname == "system":
                sec = (ext.get("rpg_system") or {}).get("section", "commands")
                ext["rpg_system"] = {"section": sec, "version": ps.SYSTEM_VERSION}
            ext["rpg_compile"] = comp
            e["extensions"] = ext
        for k in list(doc["entries"]):
            doc["entries"][k] = normalize_entry(doc["entries"][k], SOURCE_FIELD_ORDER)

    # Content #0/#5 hygiene: nothing else changes in world/mechanic text.
    # top-level metadata
    core2["extensions"]["rpg_core_version"] = ps.CORE_VERSION
    core2["extensions"]["rpg_core_mechanics"] = {"version": ps.CORE_VERSION}
    core2["extensions"]["rpg_core"] = {
        "name": "RPG Core Mechanics", "version": ps.CORE_VERSION, "supersedes": "v1.20",
        "file_role": "Authoring source. Do not import alongside the compiled Avereth WorldInfo; extensions.rpg_compile "
                     "on every entry states where the rule lives at runtime.",
        "changes": report["core"] + ["Source trigger metadata synchronised with the compiled runtime (constant only "
                                     "where the runtime is constant; verbatim entries mirror their WorldInfo triggers)"],
        "previous_changes_v1.20": core["extensions"]["rpg_core"]["changes"]}
    content2["extensions"]["rpg_content"].update({
        "version": ps.CONTENT_VERSION, "compatible_core": SRC_LABEL["core"], "compatible_system": SRC_LABEL["system"],
        "file_role": "Authoring source (single source of Classes/Skills/Kits/Monster anchors). The compiled WorldInfo "
                     "embeds generated, round-trip-verified tables built from this file.",
        "changes": report["content"] + ["Entry version tags unified (were v1.10/v1.11 labels on a v1.12 file); "
                                        "stale 'rpg_test_content'/'rpg_monster_test_content' markers removed",
                                        "Source trigger metadata synchronised with the compiled runtime"]})
    lore2["extensions"]["rpg_lore"].update({
        "version": ps.LORE_VERSION, "compatible_core": SRC_LABEL["core"], "compatible_content": SRC_LABEL["content"],
        "compatible_system": SRC_LABEL["system"],
        "changes": ["World text unchanged (byte-identical to v0.7)",
                    "Entry version tags unified (were v0.5 labels on a v0.7 file); compatibility references updated",
                    "Source trigger metadata synchronised with the compiled runtime (e.g. #0 is keyed, not constant, at runtime)"]})
    system2["extensions"]["rpg_system"].update({
        "version": ps.SYSTEM_VERSION, "supersedes": "RPG_System_v1.11",
        "changes": report["system"] + ["Source trigger metadata synchronised with the compiled runtime"]})
    system2["extensions"]["rpg_system_version"] = ps.SYSTEM_VERSION
    report["lore"] = lore2["extensions"]["rpg_lore"]["changes"]

    # ------------------------------------------------------------------ 5. DEBUG_CALC variant
    wid = copy.deepcopy(wi2)
    for uid in ("1", "2", "55"):
        c = wid["entries"][uid]["content"]
        head, rest = c.split("\n", 1)
        marker = "\nACTION TABLE — EXACT BASE-CLASS ACTIONS" if uid != "2" else None
        if marker:
            i = c.index(marker)
            c = c[:i].rstrip("\n") + "\n\n" + tx.DEBUG_AUDIT + "\n" + c[i:]
        else:
            c = c + "\n\n" + tx.DEBUG_AUDIT
        head, rest = c.split("\n", 1)
        c = head + "\n" + tx.DEBUG_HEAD + "\n" + rest + "\n\nDEBUG_CALC REMINDER: print the VISIBLE CALCULATION AUDIT in this response."
        wid["entries"][uid]["content"] = c
        wid["entries"][uid]["comment"] = wid["entries"][uid]["comment"] + " [DEBUG_CALC]"
    wid["extensions"]["rpg_master_worldinfo"]["version"] = ps.WI_VERSION + "-debugcalc"
    wid["extensions"]["rpg_master_worldinfo"]["debug_note"] = (
        "Identical mechanics to the standard build; START/PENDING/ACTIVE additionally carry a hard visible-audit rule "
        "(System #14). Never import both WorldInfo builds at the same time.")

    # ------------------------------------------------------------------ 6. write
    dump_json(core2, os.path.join(OUT_DIR, OUT_NAMES["core"]))
    dump_json(content2, os.path.join(OUT_DIR, OUT_NAMES["content"]))
    dump_json(lore2, os.path.join(OUT_DIR, OUT_NAMES["lore"]))
    dump_json(system2, os.path.join(OUT_DIR, OUT_NAMES["system"]))
    dump_json(wi2, os.path.join(OUT_DIR, OUT_NAMES["wi"]))
    dump_json(wid, os.path.join(OUT_DIR, OUT_NAMES["wi_debug"]))
    dump_text(cd2, os.path.join(OUT_DIR, OUT_NAMES["cd"]))
    os.makedirs(REPORT_DIR, exist_ok=True)
    with open(os.path.join(REPORT_DIR, "build_report.json"), "w", encoding="utf-8") as f:
        json.dump({"report": report, "removed_creation_text": removed_creation_text,
                   "action_table_fields_verified": n_checked,
                   "sizes": {uid: len(E[str(uid)]["content"]) for uid in keep_uids}}, f, ensure_ascii=False, indent=1)
    print("build OK; action-table fields verified:", n_checked)
    for uid in (0, 1, 2, 54, 55):
        print(f"  WI #{uid:>2} {E[str(uid)]['comment'][:48]:48} {len(E[str(uid)]['content']):6} chars "
              f"(v1.22: {len(wi['entries'][str(uid)]['content'])})")
    tot_old = sum(len(e["content"]) for e in wi["entries"].values())
    tot_new = sum(len(e["content"]) for e in E.values())
    print(f"  WI total content {tot_old} -> {tot_new} chars; entries {len(wi['entries'])} -> {len(E)}")


if __name__ == "__main__":
    main()
