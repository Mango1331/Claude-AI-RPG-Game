# -*- coding: utf-8 -*-
"""Migrate the Avereth v1.24 authoring sources (Core/Content/Lore/System JSON, First Message) into the
engine content packs of Avereth v2 (avereth-engine/content/*.json).

The old sources are *knowledge*, not technology: every number, formula and lore sentence is carried over,
and the migration asserts that nothing was lost:
  * every action field of the 5 Base Classes (Content #1-#5) is parsed into structured data and rendered
    back into the original field text for comparison;
  * all 15 F1 monster anchors are parsed and compared number by number;
  * every Lore entry text is copied byte-identically;
  * every Core/System rule text is copied byte-identically into rules_text.json (retrievable guidance).

Run:  python3 avereth-engine/tools/migrate_content.py            (from the repository root)
Env:  AVERETH_V124_DIR  (default: <repo>/Avereth_RPG_v1.24_PERFEKTIONIERT)
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.dirname(HERE)
REPO = os.path.dirname(ENGINE)
SRC = os.environ.get("AVERETH_V124_DIR", os.path.join(REPO, "Avereth_RPG_v1.24_PERFEKTIONIERT"))
OUT = os.path.join(ENGINE, "content")
BASELINE_FM = "RPG_First_Message_v0.4.txt"

CLASS_ORDER = ["WARRIOR", "MAGE", "GUARDIAN", "DUELIST", "RANGER"]
FIELD_RE = re.compile(
    r"^(Rank|Complexity|Tags|Type|Base Power|Scaling|Uses|Cost|Ammo|Range|Hit Modifier|Effect):\s*(.*)$")


def load(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return json.load(f)


def dump(obj, name):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, indent=2) + "\n"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    with open(path, encoding="utf-8") as f:
        assert json.load(f) == obj, "round-trip mismatch " + name
    return len(text)


def ws(s):
    return re.sub(r"\s+", " ", s).strip()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


# ------------------------------------------------------------------------------------------ classes / skills
def parse_class(content):
    lines = content.split("\n")
    m = re.match(r"^([A-Z]+) — BASE CLASS$", lines[0])
    assert m, lines[0]
    fav = re.match(r"^Favored Stats: (\w+), (\w+)$", lines[1])
    assert fav, lines[1]
    blocks, cur = [], []
    for ln in lines[3:]:
        if ln.strip() == "":
            if cur:
                blocks.append(cur)
                cur = []
        else:
            cur.append(ln)
    if cur:
        blocks.append(cur)
    assert blocks[0][0] == "AUTOMATIC BASIC ATTACK — GRANTED, NOT CHOSEN:"
    assert blocks[1] == ["BASE SKILL POOL — CHOOSE EXACTLY 2 DURING CHARACTER CREATION:"]
    actions = [parse_action(blocks[0][1:], True)] + [parse_action(b, False) for b in blocks[2:]]
    assert len(actions) == 7
    return {"name": m.group(1), "favored": [fav.group(1), fav.group(2)], "growth_line": lines[2], "actions": actions}


def parse_action(block, basic):
    act = {"basic": basic, "fields": {}, "strike": None, "strikes": None, "effect_lines": [], "note": None}
    head = block[0]
    if basic:
        assert head == "Basic Attack"
        act["name"], act["category"] = "Basic Attack", "Offensive"
    else:
        m = re.match(r"^(.+?) \[(.+)\]$", head)
        assert m, head
        act["name"], act["category"] = m.group(1), m.group(2)
    target, in_effect = act["fields"], False
    for ln in block[1:]:
        if ln.startswith("Granted automatically at P1/PP0"):
            act["note"] = ln
            in_effect = False
            continue
        mm = re.match(r"^Resolve (\d+) separate strikes\.$", ln)
        if mm:
            act["strikes"] = int(mm.group(1))
            in_effect = False
            continue
        if ln == "Each strike:":
            act["strike"] = {}
            target = act["strike"]
            in_effect = False
            continue
        if ln == "Each strike performs its own hit and critical check.":
            act["strike_note"] = ln
            in_effect = False
            continue
        fm = FIELD_RE.match(ln)
        if fm and not in_effect:
            k, v = fm.group(1), fm.group(2)
            if k == "Effect":
                in_effect = True
                act["effect_lines"].append(v)
            else:
                assert k not in target, (act["name"], k)
                target[k] = v
            continue
        if in_effect:
            act["effect_lines"].append(ln)
            continue
        raise AssertionError(f"unparsed line in {act['name']}: {ln!r}")
    act["effect"] = ws(" ".join(act["effect_lines"])) if act["effect_lines"] else None
    act["block_text"] = "\n".join(block)
    return act


def parse_scaling(s):
    terms = []
    for part in s.split(" + "):
        m = re.match(r"^(STR|VIT|AGI|INT|PER|WIL) × ([0-9.]+)$", part.strip())
        assert m, s
        terms.append({"stat": m.group(1), "coef": float(m.group(2)), "text": m.group(2)})
    return terms


def parse_uses(s):
    m = re.match(r"^(?:(\d+)% of )?(ATK|MATK)$", s)
    assert m, s
    return {"power": m.group(2), "share": (int(m.group(1)) / 100.0) if m.group(1) else 1.0}


def parse_cost(s):
    m = re.match(r"^(\d+) (STA|MP)$", s)
    assert m, s
    return {"resource": m.group(2).lower(), "amount": int(m.group(1))}


def parse_ammo(s):
    m = re.match(r"^(\d+) arrows? when fired from a bow$", s)
    assert m, s
    return {"item": "standard_arrow", "qty": int(m.group(1)), "condition": "bow"}


def parse_hit(s):
    m = re.match(r"^([+-]?\d+)$", s)
    assert m, s
    return int(m.group(1))


def parse_range(s):
    if s in ("ENGAGED", "SHORT", "MEDIUM", "LONG"):
        return {"band": s, "extra_band": False, "area": None}
    if s == "ENGAGED after movement":
        return {"band": "ENGAGED", "extra_band": True, "area": None}
    if s == "ENGAGED AREA centered on caster":
        return {"band": "ENGAGED", "extra_band": False, "area": "caster_engaged"}
    raise AssertionError(s)


# Machine-readable effects for non-damage parts. Every numeric value is asserted to appear in the
# verbatim effect text (see check_effects) so the structured data can never drift from Content.
EFFECTS = {
    "Guard": [{"kind": "temp_def", "base": 3, "stat": "VIT", "coef": 0.5, "floor": True, "until": "own_next_turn"}],
    "Deflect": [{"kind": "incoming_hit_penalty", "pp": 20, "until": "own_next_turn"}],
    "Charge": [{"kind": "extra_band"}],
    "Arcane Ward": [{"kind": "barrier", "base": 6, "stat": "WIL", "coef": 1.5, "floor": False,
                     "until": "destroyed_or_own_next_turn"}],
    "Flame Lance": [],
    "Arcane Burst": [{"kind": "area", "shape": "caster_engaged", "shared_rolls": True}],
    "Blink": [{"kind": "reposition", "bands": 1, "extra": True}],
    "Focused Ward": [{"kind": "barrier", "base": 10, "stat": "WIL", "coef": 2.0, "floor": False,
                      "until": "destroyed_or_own_next_turn"}],
    "Brace": [{"kind": "temp_def", "base": 4, "stat": "VIT", "coef": 0.6, "floor": True, "until": "own_next_turn"},
              {"kind": "temp_mdef", "base": 2, "stat": "WIL", "coef": 0.4, "floor": True, "until": "own_next_turn"}],
    "Bulwark": [{"kind": "temp_def", "base": 6, "stat": "VIT", "coef": 0.8, "floor": True, "until": "own_next_turn"},
                {"kind": "temp_mdef", "base": 4, "stat": "WIL", "coef": 0.6, "floor": True, "until": "own_next_turn"}],
    "Shield Charge": [{"kind": "extra_band"}],
    "Endure": [{"kind": "damage_reduction_next", "pct": 25, "until": "own_next_turn"}],
    "Evasive Step": [{"kind": "reposition", "bands": 1, "extra": True},
                     {"kind": "incoming_hit_penalty", "pp": 20, "until": "own_next_turn"}],
    "Lunge": [{"kind": "extra_band"}],
    "Feint": [{"kind": "next_attack_buff", "hit_pp": 20, "power_pct": 10, "scope": "attack",
               "expires": "end_of_next_turn"}],
    "Guarded Thrust": [{"kind": "post_attack_temp_def", "flat": 4, "until": "own_next_turn"}],
    "Quickstep": [{"kind": "reposition", "bands": 1, "extra": True},
                  {"kind": "incoming_hit_penalty", "pp": 15, "until": "own_next_turn"}],
    "Focus Aim": [{"kind": "next_attack_buff", "hit_pp": 20, "power_pct": 10, "scope": "ranged",
                   "expires": "end_of_next_turn"}],
}


def check_effects(name, effect_text, effects):
    """Every number used in the structured effect must literally appear in the Content effect text."""
    if not effects:
        return
    txt = effect_text or ""
    for e in effects:
        for key in ("base", "pp", "pct", "flat", "hit_pp", "power_pct"):
            if key in e:
                assert re.search(r"(?<![\d.])" + re.escape(str(e[key])) + r"(?![\d])", txt), (name, key, e[key], txt)
        if "coef" in e:
            coef_txt = f"{e['coef']:.2f}"
            assert coef_txt in txt or str(e["coef"]) in txt, (name, e["coef"], txt)
        if "stat" in e:
            assert e["stat"] in txt, (name, e["stat"])


def build_skill(cls_id, act):
    f = act["fields"]
    sid = f"{cls_id}.{slug(act['name'])}"
    skill = {
        "id": sid, "name": act["name"], "class": cls_id, "basic": act["basic"], "category": act["category"],
        "rank": f.get("Rank", "F"), "complexity": int(f["Complexity"]) if "Complexity" in f else None,
        "tags": [t.strip() for t in f["Tags"].split(",")] if "Tags" in f else [],
        "type_text": f.get("Type"),
        "cost": parse_cost(f["Cost"]) if "Cost" in f else None,
        "ammo": parse_ammo(f["Ammo"]) if "Ammo" in f else None,
        "range": parse_range(f["Range"]) if "Range" in f else None,
        "attack": None, "strikes": 1,
        "effects": EFFECTS.get(act["name"], []),
        "effect_text": act["effect"],
        "source_text": act["block_text"],
    }
    atk_fields = act["strike"] if act["strike"] is not None else f
    if "Base Power" in atk_fields:
        uses = parse_uses(atk_fields["Uses"])
        skill["attack"] = {
            "base": float(atk_fields["Base Power"]),
            "scaling": parse_scaling(atk_fields["Scaling"]),
            "uses": uses["power"], "share": uses["share"],
            "damage_type": "magical" if uses["power"] == "MATK" else "physical",
            "hit_mod": parse_hit(atk_fields.get("Hit Modifier", "0")),
        }
    if act["strikes"]:
        skill["strikes"] = act["strikes"]
    if act["name"] not in EFFECTS and act["effect"] not in (None, "none.", "no additional status effect.") \
            and not (act["effect"] or "").startswith("none."):
        raise AssertionError(f"unmapped effect for {act['name']}: {act['effect']}")
    check_effects(act["name"], act["effect"], skill["effects"])
    # round trip: render the structured values back into Content field text
    if skill["attack"]:
        a = skill["attack"]
        assert fmt_num(a["base"]) == atk_fields["Base Power"], (sid, a["base"])
        assert " + ".join(f"{t['stat']} × {t['text']}" for t in a["scaling"]) == atk_fields["Scaling"], sid
        uses_txt = a["uses"] if a["share"] == 1.0 else f"{int(a['share'] * 100)}% of {a['uses']}"
        assert uses_txt == atk_fields["Uses"], sid
        assert a["hit_mod"] == parse_hit(atk_fields.get("Hit Modifier", "0")), sid
    if skill["cost"]:
        assert f"{skill['cost']['amount']} {skill['cost']['resource'].upper()}" == f["Cost"], sid
    return skill


def fmt_num(x):
    return str(int(x)) if float(x).is_integer() else str(x)


# ------------------------------------------------------------------------------------------ monsters
ANCHOR_HEADER = "F1 BODY-PLAN ANCHORS\nFormat: HP / ATK / DEF / MDEF / Hit / Init | default natural attack\n"
# Deterministic nearest-body-plan aliases (lower-case words). Only animals that plainly belong to the
# listed body plan; anything else falls back to an explicit choice by the narrator or #system.
ALIASES = {
    "rat": ["rat", "rats", "vermin", "mouse", "mice", "rodent"],
    "wolf": ["wolf", "wolves", "canid", "dog", "dogs", "hound", "hounds", "jackal", "coyote", "fox"],
    "boar": ["boar", "boars", "wild pig", "pig", "hog", "swine"],
    "deer": ["deer", "elk", "stag", "doe", "roe", "antelope", "goat"],
    "horse": ["horse", "horses", "pony", "mule", "donkey", "ox", "cow", "cattle", "bull"],
    "bear": ["bear", "bears"],
    "feline": ["cat", "wildcat", "lynx", "panther", "leopard", "lion", "tiger", "feline"],
    "serpent": ["snake", "serpent", "viper", "adder"],
    "raptor": ["hawk", "eagle", "falcon", "owl", "raptor", "crow", "raven"],
    "arthropod": ["spider", "scorpion", "beetle", "centipede", "insect", "ant", "wasp"],
    "aquatic": ["pike", "shark", "eel", "crocodile", "alligator"],
    "goblin": ["goblin", "goblins", "kobold"],
    "ogre": ["ogre", "ogres", "troll"],
    "armored_beast": ["armored beast", "armadillo", "tortoise", "turtle"],
    "spirit": ["spirit", "wisp", "ghost"],
}
ANCHOR_IDS = {"Rat / small vermin": "rat", "Wolf / canid": "wolf", "Boar / wild pig": "boar",
              "Deer / elk / light hoofed": "deer", "Horse / large grazer": "horse", "Bear-like": "bear",
              "Feline predator": "feline", "Serpent / snake-like": "serpent", "Raptor / predatory bird": "raptor",
              "Arthropod / insectoid": "arthropod", "Aquatic predator": "aquatic", "Goblin-like": "goblin",
              "Ogre-like": "ogre", "Armored Beast": "armored_beast", "Spirit": "spirit"}
# Default combat temperament for the deterministic NPC policy (proposed; see docs/DATENMODELL.md)
TEMPERAMENT = {"rat": "skittish", "wolf": "aggressive", "boar": "aggressive", "deer": "skittish", "horse": "skittish",
               "bear": "aggressive", "feline": "aggressive", "serpent": "defensive", "raptor": "skittish",
               "arthropod": "aggressive", "aquatic": "aggressive", "goblin": "cautious", "ogre": "aggressive",
               "armored_beast": "defensive", "spirit": "aggressive"}


def parse_anchors(content):
    start = content.index(ANCHOR_HEADER) + len(ANCHOR_HEADER)
    end = content.index("\nLEVEL SCALING\n")
    lines = content[start:end].split("\n")
    anchors, i = [], 0
    while i < len(lines):
        ln = lines[i]
        if ln.endswith(":") and not ln.startswith(" "):
            name = ln[:-1]
            m = re.match(r"^(\d+) / (\d+) / (\d+) / (\d+) / (\d+) / (\d+) \| (.+?) \| (Physical|Magical) \| "
                         r"(ENGAGED|SHORT|MEDIUM|LONG)$", lines[i + 1])
            assert m, lines[i + 1]
            notes, j = [], i + 2
            while j < len(lines) and lines[j].strip() and not lines[j].endswith(":"):
                notes.append(lines[j])
                j += 1
            aid = ANCHOR_IDS[name]
            anchors.append({"id": aid, "name": name, "hp": int(m.group(1)), "atk": int(m.group(2)),
                            "def": int(m.group(3)), "mdef": int(m.group(4)), "hit": int(m.group(5)),
                            "init": int(m.group(6)), "attack": m.group(7),
                            "damage_type": m.group(8).lower(), "range": m.group(9), "notes": notes,
                            "aliases": ALIASES[aid], "temperament": TEMPERAMENT[aid],
                            "source_line": lines[i + 1]})
            i = j
        else:
            i += 1
    assert len(anchors) == 15
    return anchors


# ------------------------------------------------------------------------------------------ gear
def parse_kits(content):
    kits, cur = {}, None
    for ln in content.split("\n"):
        m = re.match(r"^(WARRIOR|MAGE|GUARDIAN|DUELIST|RANGER):$", ln)
        if m:
            cur = m.group(1).lower()
            kits[cur] = []
            continue
        if ln.startswith("COMMON BOOTSTRAP ITEMS"):
            cur = None
            continue
        if cur and ln.startswith("- "):
            kits[cur].append(ln[2:])
    assert set(kits) == {c.lower() for c in CLASS_ORDER}
    return kits


def item_from_kit_line(line):
    m = re.match(r"^(Starter [A-Za-z ]+?) \[(F|unranked)\]: (.+)$", line)
    if not m:
        return None
    name, rank, vals = m.group(1), m.group(2), m.group(3)
    item = {"id": slug(name), "name": name, "rank": None if rank == "unranked" else rank, "source_line": line}
    low = name.lower()
    if "quiver" in low:
        mq = re.match(r"^contains (\d+) Standard Arrows$", vals)
        assert mq, vals
        item.update({"slot": "quiver", "contains": {"standard_arrow": int(mq.group(1))}})
        return item
    for k, v in re.findall(r"(ATK|MATK|DEF|MDEF) (\d+)", vals):
        item[k.lower()] = int(v)
    if any(w in low for w in ("longsword", "mace", "rapier")):
        item.update({"slot": "weapon", "family": "melee"})
    elif "shortbow" in low:
        item.update({"slot": "weapon", "family": "bow"})
    elif "staff" in low:
        item.update({"slot": "weapon", "family": "focus"})
    elif "shield" in low:
        item.update({"slot": "offhand", "family": "shield"})
    elif any(w in low for w in ("armor", "robes")):
        item.update({"slot": "armor", "family": "heavy_armor" if "heavy" in low else "light_armor"})
    else:
        raise AssertionError(line)
    return item


# ------------------------------------------------------------------------------------------ main
def main():
    core = load("RPG_Core_Mechanics_v1.20_PERFEKTIONIERT.json")
    content = load("RPG_Content_v1.12_PERFEKTIONIERT.json")
    lore = load("RPG_Lore_v0.7_PERFEKTIONIERT.json")
    system = load("RPG_System_v1.11_PERFEKTIONIERT.json")
    wi = load("Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json")
    CE = content["entries"]
    report = {}

    # ---- classes & skills
    classes, skills = [], []
    for idx, cname in zip(range(1, 6), CLASS_ORDER):
        parsed = parse_class(CE[str(idx)]["content"])
        assert parsed["name"] == cname
        cid = cname.lower()
        cskills = [build_skill(cid, a) for a in parsed["actions"]]
        skills.extend(cskills)
        classes.append({"id": cid, "name": cname.capitalize(), "favored": parsed["favored"],
                        "growth_text": parsed["growth_line"], "basic_attack": cskills[0]["id"],
                        "skill_pool": [s["id"] for s in cskills[1:]], "source": f"Content v1.13 #{idx}"})
    # affinity (Content #6)
    aff_text = CE["6"]["content"]
    affinity = {}
    for cname in CLASS_ORDER:
        m = re.search(rf"^{cname.capitalize()} — (.+)$", aff_text, re.M)
        assert m, cname
        entries = {}
        for part in m.group(1).split(", "):
            mm = re.match(r"^([A-Za-z/]+) ([0-9.]+)$", part.strip().rstrip("."))
            if mm:
                for tag in mm.group(1).split("/"):
                    entries[tag] = float(mm.group(2))
            else:
                assert part.strip().startswith("otherwise 1.00"), part
        affinity[cname.lower()] = entries
    kits = parse_kits(CE["11"]["content"])
    items, kit_map = {}, {}
    for cid, lines in kits.items():
        kit_map[cid] = []
        for ln in lines:
            it = item_from_kit_line(ln)
            if it is None:
                assert ln.startswith("Standard Arrows are ordinary"), ln
                continue
            items[it["id"]] = it
            kit_map[cid].append(it["id"])
    items["standard_arrow"] = {"id": "standard_arrow", "name": "Standard Arrow", "rank": None, "slot": "ammo",
                               "stackable": True, "note": "Ordinary physical ammunition; no bonus damage or other modifier (Content #11, Core #21)."}
    items["simple_travelers_clothes"] = {"id": "simple_travelers_clothes", "name": "Simple Traveler's Clothes",
                                         "rank": None, "slot": "clothing", "note": "unranked; no combat values"}
    items["small_pouch"] = {"id": "small_pouch", "name": "Small Pouch", "rank": None, "slot": "container"}
    classes_doc = {"_source": "Content v1.13 #0-#6 (migrated by tools/migrate_content.py)",
                   "human_baseline_text": CE["0"]["content"], "classes": classes, "skills": skills,
                   "affinity": affinity, "affinity_text": aff_text}
    report["classes"] = dump(classes_doc, "classes.json")

    # ---- monsters
    anchors = parse_anchors(CE["7"]["content"])
    for a in anchors:
        vals = f"{a['hp']} / {a['atk']} / {a['def']} / {a['mdef']} / {a['hit']} / {a['init']}"
        assert a["source_line"].startswith(vals), a["id"]
    monsters_doc = {
        "_source": "Content v1.13 #7 (anchors, scaling, level selection) + #8 (Elite/Boss)",
        "anchors": anchors,
        "scaling": {"hp": {"coef": 0.20}, "atk": {"coef": 0.22}, "def": {"coef": 0.20, "offset": 1},
                    "mdef": {"coef": 0.20, "offset": 1}, "hit": {"per_15_levels": 2, "cap": 95},
                    "init": {"coef": 0.05},
                    "text": CE["7"]["content"][CE["7"]["content"].index("LEVEL SCALING\n"):
                                               CE["7"]["content"].index("\nRank is determined by Level band")]},
        "level_selection": [
            {"context": "settled", "desc": "settled road/farm/town outskirts", "min": 1, "max": 1},
            {"context": "wilderness", "desc": "ordinary nearby wilderness", "min": 1, "max": 3},
            {"context": "deep_wilderness", "desc": "explicitly remote/deep dangerous wilderness", "min": 4, "max": 7},
            {"context": "hunting_territory", "desc": "explicitly established dangerous F-rank hunting/Quest territory (its range)", "min": 1, "max": 14},
            {"context": "unknown", "desc": "area danger not established", "min": 1, "max": 1}],
        "variation": {"hp_atk_pct": 20, "def_mdef": 1, "hit_pp": 5, "init": 2,
                      "rule": "only when established body condition/size reasonably supports it; fix once"},
        "elite": {"hp": 1.75, "atk": 1.15, "def": 1.10, "mdef": 1.10, "hit_pp": 5, "init": 2},
        "boss": {"hp": 2.50, "atk": 1.30, "def": 1.20, "mdef": 1.20, "hit_pp": 5, "init": 3},
        "elite_boss_text": CE["8"]["content"],
        "fauna_text": CE["7"]["content"],
    }
    # the modifier numbers must appear verbatim in Content #8
    for token in ("HP ×1.75", "ATK ×1.15", "DEF/MDEF ×1.10", "HP ×2.50", "ATK ×1.30", "DEF/MDEF ×1.20", "Init +2", "Init +3"):
        assert token in CE["8"]["content"], token
    for token in ("HP = round(HP1 × (1 + 0.20g))", "ATK = round(ATK1 × (1 + 0.22g))",
                  "DEF = max(0, round((DEF1 + 1) × (1 + 0.20g) - 1))", "Hit = min(95, Hit1 + 2×floor(g/15))",
                  "Init = round(Init1 × (1 + 0.05g))"):
        assert token in CE["7"]["content"], token
    report["monsters"] = dump(monsters_doc, "monsters.json")

    # ---- gear
    gear_doc = {"_source": "Content v1.13 #9 (references) + #11 (starter kits)",
                "references_text": CE["9"]["content"],
                "f_rank_reference": {"martial_weapon_atk": [4, 10], "arcane_focus_matk": [4, 10],
                                     "light_armor_def": [2, 4], "light_armor_mdef": [2, 5],
                                     "heavy_armor_def": [5, 8], "heavy_armor_mdef": [1, 3],
                                     "shield_def": [3, 5], "shield_mdef": [2, 4]},
                "rank_scaling": {"per_rank_index": 0.75, "rank_index": {"F": 0, "E": 1, "D": 2, "C": 3, "B": 4, "A": 5, "S": 6}},
                "items": items, "starter_kits": kit_map,
                "bootstrap": {"items": ["simple_travelers_clothes", "small_pouch"], "coin_cp": 50},
                "kits_text": CE["11"]["content"]}
    for token in ("Martial Weapon ATK 4-10", "Arcane Focus MATK 4-10", "Light Armor DEF 2-4, MDEF 2-5",
                  "Heavy Armor DEF 5-8, MDEF 1-3", "Shield/secondary defensive slot DEF 3-5, MDEF 2-4",
                  "round(F value × (1 + 0.75R))"):
        assert token in CE["9"]["content"], token
    report["gear"] = dump(gear_doc, "gear.json")

    # ---- lore (verbatim) + keys from the compiled WI
    wi_keys = {}
    for e in wi["entries"].values():
        src = e["extensions"].get("rpg_master_source", "")
        m = re.match(r"^RPG_Lore_v0\.8 #(\d+)$", src)
        if m:
            wi_keys[m.group(1)] = e["key"]
    lore_entries = []
    realm_ids = {"7": "realm.valedorn_crown", "8": "realm.caelreth", "9": "realm.veyrhold", "10": "realm.solmere",
                 "11": "realm.ilyrion", "12": "realm.duskreach", "13": "realm.ashen_scale_dominion",
                 "14": "realm.verdant_fang_court"}
    topic_ids = {"0": "world_foundations", "1": "rank_class_knowledge", "2": "mana_learning", "3": "lifespan_power",
                 "4": "adventurers_guild", "5": "monster_ecology", "6": "geopolitics", "15": "currency",
                 "16": "dungeons", "17": "death_resurrection", "18": "material_culture"}
    for u in sorted(lore["entries"], key=int):
        e = lore["entries"][u]
        eid = realm_ids.get(u) or ("lore." + topic_ids[u])
        entities = [realm_ids[u]] if u in realm_ids else []
        if u == "4":
            entities.append("fac.adventurers_guild")
        lore_entries.append({"id": eid, "title": e["comment"], "kind": "realm" if u in realm_ids else "topic",
                             "text": e["content"], "keys": wi_keys.get(u, e["key"]), "entities": entities,
                             "importance": 0.9 if u in ("0", "18") else 0.5, "baseline": u in ("0", "18"),
                             "source": f"Lore v0.8 #{u}"})
    for le, (u, e) in zip(lore_entries, sorted(lore["entries"].items(), key=lambda x: int(x[0]))):
        assert le["text"] == e["content"]          # byte-identical
    # locations named by the First Message {{pick}} macro (the only canon they have: a city in that realm)
    fm = read_fm()
    pick = re.search(r"\{\{pick::(.+?)\}\}", fm).group(1)
    cities = []
    realm_by_name = {"Valedorn Crown": "realm.valedorn_crown", "Caelreth": "realm.caelreth", "Veyrhold": "realm.veyrhold",
                     "Solmere": "realm.solmere", "Ilyrion": "realm.ilyrion", "Duskreach": "realm.duskreach"}
    for part in pick.split("::"):
        city, realm = [x.strip() for x in part.split(",")]
        cities.append({"id": "loc." + slug(city), "name": city, "kind": "city", "realm": realm_by_name[realm],
                       "source": "First Message v0.4 (start location pick list)",
                       "facts": [f"{city} is a walled city in {realm}; the campaign may start on the public roadside verge outside it."]})
    capitals = {"realm.valedorn_crown": "Crownheart", "realm.caelreth": "Asterhall", "realm.veyrhold": "Ironward",
                "realm.solmere": "Goldharbor", "realm.ilyrion": "Sanctum Vale", "realm.duskreach": "Blackgate",
                "realm.ashen_scale_dominion": "Cinder Throne", "realm.verdant_fang_court": "Thornheart"}
    for rid, cap in capitals.items():
        text = next(le["text"] for le in lore_entries if le["id"] == rid)
        assert cap in text, (rid, cap)
        monster_realm = rid in ("realm.ashen_scale_dominion", "realm.verdant_fang_court")
        cities.append({"id": "loc." + slug(cap), "name": cap, "kind": "seat" if monster_realm else "capital",
                       "realm": rid, "source": "Lore v0.8 realm entry"})
    lore_doc = {"_source": "Lore v0.8 (world text byte-identical) + First Message v0.4 start locations",
                "entries": lore_entries, "locations": cities,
                "factions": [{"id": "fac.adventurers_guild", "name": "Adventurers' Guild", "kind": "guild",
                              "lore": "lore.adventurers_guild"}]
                + [{"id": rid, "name": next(le["title"] for le in lore_entries if le["id"] == rid).split("— ")[-1],
                    "kind": "realm"} for rid in realm_ids.values()]}
    report["lore"] = dump(lore_doc, "lore.json")

    # ---- retrievable rule texts (Core + System verbatim); 'when' tags drive state-based selection
    WHEN = {"7": ["check"], "8": ["check", "stealth", "perception"], "13": ["status"], "14": ["injury", "healing", "rest"],
            "15": ["barrier", "counter", "dispel", "grapple"], "16": ["element", "environment"],
            "17": ["appraisal", "detection"], "19": ["domain"], "20": ["loot", "combat_end"], "22": ["trade", "coin"],
            "5": ["skill_learning"], "4": ["class_evolution"], "12": ["forced_movement", "cover"],
            "23": ["combat_gate"], "24": ["ambush"], "3": ["level_up"], "25": ["quest_xp"], "18": ["non_definitions"]}
    rules_text = []
    for u in sorted(core["entries"], key=int):
        e = core["entries"][u]
        rules_text.append({"id": f"core.{u}", "title": e["comment"], "text": e["content"],
                           "when": WHEN.get(u, []), "engine": u in ENGINE_IMPLEMENTED, "source": f"Core v1.21 #{u}"})
    for u in sorted(system["entries"], key=int):
        e = system["entries"][u]
        rules_text.append({"id": f"system.{u}", "title": e["comment"], "text": e["content"], "when": [],
                           "engine": True, "source": f"System v1.12 #{u}"})
    for u in ("6", "10"):
        e = CE[u]
        rules_text.append({"id": f"content.{u}", "title": e["comment"], "text": e["content"],
                           "when": ["skill_design"] if u == "6" else ["class_evolution"], "engine": False,
                           "source": f"Content v1.13 #{u}"})
    report["rules_text"] = dump({"_source": "Core v1.21, System v1.12, Content v1.13 #6/#10 verbatim",
                                 "entries": rules_text}, "rules_text.json")
    for r, (u, e) in zip(rules_text, sorted(core["entries"].items(), key=lambda x: int(x[0]))):
        assert r["text"] == e["content"]
    print(json.dumps(report, indent=1))
    print(f"skills: {len(skills)}  anchors: {len(anchors)}  items: {len(items)}  lore: {len(lore_entries)}  "
          f"locations: {len(cities)}  rule texts: {len(rules_text)}")


# Core entries whose mechanics are executed by the engine (their text is then only reference material)
ENGINE_IMPLEMENTED = {"0", "1", "2", "3", "6", "7", "8", "9", "10", "11", "12", "21", "22", "23", "24", "25", "26",
                      "27", "28", "29"}


def read_fm():
    import zipfile
    zp = os.path.join(REPO, "Avereth_RPG_Test_Baseline_v1.23.zip")
    with zipfile.ZipFile(zp) as z:
        return z.read(BASELINE_FM).decode("utf-8")


if __name__ == "__main__":
    sys.exit(main())
