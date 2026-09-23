# -*- coding: utf-8 -*-
"""Structured model of the canonical Content data (classes/skills, starter kits, monster anchors)
plus compact runtime renderers with round-trip verification.

Why: the v1.23 WorldInfo embedded three verbatim copies of all five Base-Class entries
(START / PENDING / Creation, 9,640 chars each) plus five byte-identical "reference caches".
The runtime now receives ONE generated table per phase entry. Every rendered value is parsed
back and compared with the canonical Content text, so the compiled table can never drift.
Design constraint from the v1.21 test: no positional/abbreviated row compression — every
action gets its own line with explicit field labels.
"""
import re

from lib import ws

FIELD_RE = re.compile(
    r"^(Rank|Complexity|Tags|Type|Base Power|Scaling|Uses|Cost|Ammo|Range|Hit Modifier|Effect):\s*(.*)$")
CLASS_ORDER = ["WARRIOR", "MAGE", "GUARDIAN", "DUELIST", "RANGER"]


# --------------------------------------------------------------------------- parsing
def parse_class_entry(content):
    """Parse one '[BASE CLASS] X' Content entry into a dict."""
    lines = content.split("\n")
    m = re.match(r"^([A-Z]+) — BASE CLASS$", lines[0])
    assert m, lines[0]
    cls = {"name": m.group(1), "actions": []}
    fav = re.match(r"^Favored Stats: (\w+), (\w+)$", lines[1])
    assert fav, lines[1]
    cls["favored"] = (fav.group(1), fav.group(2))
    growth = lines[2]
    exp_growth = ("Automatic Class Growth: apply once at initial Level-1 Class selection, then on each later "
                  f"Level gained: {fav.group(1)} +1 and {fav.group(2)} +1.")
    assert growth == exp_growth, growth
    # split into blocks separated by blank lines
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
    assert blocks[0][0] == "AUTOMATIC BASIC ATTACK — GRANTED, NOT CHOSEN:", blocks[0][0]
    basic = parse_action_block(blocks[0][1:], basic=True)
    cls["actions"].append(basic)
    assert blocks[1] == ["BASE SKILL POOL — CHOOSE EXACTLY 2 DURING CHARACTER CREATION:"], blocks[1]
    for b in blocks[2:]:
        cls["actions"].append(parse_action_block(b, basic=False))
    assert len(cls["actions"]) == 7, (cls["name"], len(cls["actions"]))
    return cls


def parse_action_block(block, basic):
    act = {"basic": basic, "fields": {}, "effect_lines": [], "strikes": None, "strike": None,
           "strike_note": None, "note": None, "extra": []}
    head = block[0]
    if basic:
        assert head == "Basic Attack", head
        act["name"], act["category"] = "Basic Attack", None
    else:
        m = re.match(r"^(.+?) \[(.+)\]$", head)
        assert m, head
        act["name"], act["category"] = m.group(1), m.group(2)
    target = act["fields"]
    in_effect = False
    for ln in block[1:]:
        fm = FIELD_RE.match(ln)
        if ln.startswith("Granted automatically at P1/PP0"):
            act["note"] = ln
            in_effect = False
            continue
        m_res = re.match(r"^Resolve (\d+) separate strikes\.$", ln)
        if m_res:
            act["strikes"] = int(m_res.group(1))
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
        if fm and not in_effect:
            key, val = fm.group(1), fm.group(2)
            if key == "Effect":
                in_effect = True
                act["effect_lines"].append(val)
            else:
                assert key not in target, (act["name"], key)
                target[key] = val
            continue
        if in_effect:
            act["effect_lines"].append(ln)
            continue
        raise AssertionError(f"unparsed line in {act['name']}: {ln!r}")
    act["effect"] = ws(" ".join(act["effect_lines"])) if act["effect_lines"] else None
    return act


def parse_starter_kits(content):
    """Parse the '[STARTER GEAR] Transmigration Base-Class Kits' entry."""
    kits, cur = {}, None
    for ln in content.split("\n"):
        m = re.match(r"^(WARRIOR|MAGE|GUARDIAN|DUELIST|RANGER):$", ln)
        if m:
            cur = m.group(1)
            kits[cur] = []
            continue
        if ln.startswith("COMMON BOOTSTRAP ITEMS"):
            cur = None
            continue
        if cur and ln.startswith("- "):
            kits[cur].append(ln[2:])
    assert set(kits) == set(CLASS_ORDER), kits.keys()
    return kits


ANCHOR_HEADER = "F1 BODY-PLAN ANCHORS\nFormat: HP / ATK / DEF / MDEF / Hit / Init | default natural attack\n"


def parse_monster_anchors(content):
    """Parse the F1 anchor block of '[MONSTER] Avereth Fauna ...'."""
    start = content.index(ANCHOR_HEADER) + len(ANCHOR_HEADER)
    end = content.index("\nLEVEL SCALING\n")
    block = content[start:end]
    anchors = []
    lines = block.split("\n")
    i = 0
    while i < len(lines):
        ln = lines[i]
        if ln.endswith(":") and not ln.startswith(" "):
            name = ln[:-1]
            stat = lines[i + 1]
            m = re.match(r"^(\d+) / (\d+) / (\d+) / (\d+) / (\d+) / (\d+) \| (.+?) \| (Physical|Magical) \| (ENGAGED|SHORT|MEDIUM|LONG)$", stat)
            assert m, stat
            notes = []
            j = i + 2
            while j < len(lines) and lines[j].strip() and not lines[j].endswith(":"):
                notes.append(lines[j])
                j += 1
            anchors.append({"name": name, "hp": int(m.group(1)), "atk": int(m.group(2)), "def": int(m.group(3)),
                            "mdef": int(m.group(4)), "hit": int(m.group(5)), "init": int(m.group(6)),
                            "attack": m.group(7), "type": m.group(8), "range": m.group(9), "notes": notes})
            i = j
        else:
            i += 1
    assert len(anchors) == 15, len(anchors)
    return anchors


def parse_scaling_block(content):
    s = content.index("LEVEL SCALING\n")
    e = content.index("\nRank is determined by Level band after scaling.")
    return content[s:e]


# --------------------------------------------------------------------------- rendering
# Named rules keep the table compact without positional abbreviations. Each rule text is the
# verbatim canonical sentence (class name generalised), verified during the round trip.
EXTRA_BAND_RULE = ("as part of this Skill, close 1 additional Range Band before the attack. This explicit extra "
                   "shift may combine with the normal one-band Turn movement. The target must be ENGAGED when "
                   "the attack resolves.")
STRIKE_RULE = "Each strike performs its own hit and critical check."
WARD_TAIL = "The Barrier absorbs physical or magical damage and lasts until destroyed or until the start of the Mage's next turn."
# Reversible abbreviation: "<number> percentage points" <-> "<number>pp" (digit-anchored, word-bounded).
# Verified by expanding and comparing with Content (a naive substring version corrupted "applied").


def abbreviate(effect):
    if effect is None:
        return None
    e = effect
    if e == EXTRA_BAND_RULE:
        return "EXTRA-BAND rule"
    if e.endswith(" " + WARD_TAIL):
        e = e[: -len(WARD_TAIL) - 1] + " WARD rule."
    e = re.sub(r"(\d) percentage points\b", r"\1pp", e)
    return e


def expand(effect_r):
    if effect_r is None:
        return None
    if effect_r == "EXTRA-BAND rule":
        return EXTRA_BAND_RULE
    e = effect_r
    if e.endswith(" WARD rule."):
        e = e[: -len(" WARD rule.")] + " " + WARD_TAIL
    e = re.sub(r"(\d)pp\b", r"\1 percentage points", e)
    return e


def raw_formula(fields):
    base = fields["Base Power"]
    scaling = fields["Scaling"]
    uses = fields["Uses"]
    return f"{base} + {scaling} + {uses}"


def render_action(act, cls_name):
    f = act["fields"]
    parts = []
    label = act["name"] if act["basic"] else f"{act['name']} [{act['category']}]"
    if act["basic"]:
        label = "Basic Attack [auto-granted]"
    parts.append(label)
    if "Type" in f:
        parts.append(f"Type {f['Type']}")
    if "Cost" in f:
        parts.append(f"Cost {f['Cost']}")
    if "Ammo" in f:
        parts.append(f"Ammo {f['Ammo']}")
    if "Range" in f:
        parts.append(f"Range {f['Range']}")
    if act["strikes"]:
        s = act["strike"]
        parts.append(f"{act['strikes']} separate strikes, each: Hit {s['Hit Modifier']}; Raw = {raw_formula(s)}; "
                     f"own Hit and Crit check")
    else:
        if "Hit Modifier" in f:
            parts.append(f"Hit {f['Hit Modifier']}")
        if "Base Power" in f:
            parts.append(f"Raw = {raw_formula(f)}")
    eff = act["effect"]
    if eff is not None and eff != "none.":
        if eff == "none. This is a minimal class cantrip/arcane discharge.":
            parts.append("minimal class cantrip/arcane discharge")
        else:
            parts.append(f"Effect {abbreviate(eff)}")
    return "- " + " | ".join(parts)


def render_class_table(classes, kits=None, with_kits=False):
    out = []
    for cname in CLASS_ORDER:
        cls = classes[cname]
        basic = cls["actions"][0]
        bf = basic["fields"]
        assert (bf["Rank"], bf["Complexity"]) == ("F", "1"), (cname, bf)
        head = f"{cname} — favored {cls['favored'][0]} + {cls['favored'][1]} | Basic Attack tags: {bf['Tags']}"
        out.append(head)
        for act in cls["actions"]:
            out.append(render_action(act, cname))
        if with_kits:
            out.append("  Starter kit: " + "; ".join(kits[cname]))
    return "\n".join(out)


TABLE_LEGEND = (
    "LEGEND: favored Stats get +1/+1 once at Class selection and again on every later Level. Basic Attack: Rank F, "
    "Complexity 1, auto-granted at P1/PP0, tracked as a Skill with normal Proficiency, NOT one of the exactly 2 chosen "
    "starter Skills. Raw = Base + each exact scaling term (unrounded) + the listed ATK/MATK share; ATK = physical vs "
    "DEF, MATK = magical vs MDEF. Range = MAXIMUM band. No Effect listed = no additional effect. pp = percentage "
    "points. EXTRA-BAND rule = as part of this Skill, close 1 additional Range Band before the attack; this explicit "
    "extra shift may combine with the normal one-band Turn movement; the target must be ENGAGED when the attack "
    "resolves. WARD rule = the Barrier absorbs physical or magical damage and lasts until destroyed or until the "
    "start of the Mage's next turn."
)


# Short runtime names exactly as used (and tested) in the v1.22/v1.23 runtime; numbers come from Content.
ANCHOR_SHORT = {"Rat / small vermin": "Rat", "Wolf / canid": "Wolf", "Boar / wild pig": "Boar",
                "Deer / elk / light hoofed": "Deer", "Horse / large grazer": "Horse", "Bear-like": "Bear",
                "Feline predator": "Feline", "Serpent / snake-like": "Serpent", "Raptor / predatory bird": "Raptor",
                "Arthropod / insectoid": "Arthropod", "Aquatic predator": "Aquatic Predator",
                "Goblin-like": "Goblin-like", "Ogre-like": "Ogre-like", "Armored Beast": "Armored Beast",
                "Spirit": "Spirit"}


def render_anchor_table(anchors):
    out = ["F1 DIRECT MONSTER ANCHORS — HP/ATK/DEF/MDEF/Hit/Init | Attack | Type | MAX Range"]
    for a in anchors:
        short = ANCHOR_SHORT[a["name"]]
        out.append(f"{short}: {a['hp']}/{a['atk']}/{a['def']}/{a['mdef']}/{a['hit']}/{a['init']} | {a['attack']} | "
                   f"{a['type']} | {a['range']}")
    return "\n".join(out)


# --------------------------------------------------------------------------- verification
LINE_RE = re.compile(r"^- (?P<label>[^|]+?)(?: \| (?P<rest>.*))?$")


def parse_rendered_action(line):
    m = LINE_RE.match(line)
    assert m, line
    label = m.group("label")
    parts = m.group("rest").split(" | ") if m.group("rest") else []
    d = {"label": label, "fields": {}, "strikes": None, "strike": None, "effect": None}
    for p in parts:
        if p.startswith("Type "):
            d["fields"]["Type"] = p[5:]
        elif p.startswith("Cost "):
            d["fields"]["Cost"] = p[5:]
        elif p.startswith("Ammo "):
            d["fields"]["Ammo"] = p[5:]
        elif p.startswith("Range "):
            d["fields"]["Range"] = p[6:]
        elif p.startswith("Hit "):
            d["fields"]["Hit Modifier"] = p[4:]
        elif p.startswith("Raw = "):
            d["raw"] = p[6:]
        elif re.match(r"^\d+ separate strikes, each: ", p):
            mm = re.match(r"^(\d+) separate strikes, each: Hit (\S+); Raw = (.+); own Hit and Crit check$", p)
            assert mm, p
            d["strikes"] = int(mm.group(1))
            d["strike"] = {"Hit Modifier": mm.group(2), "raw": mm.group(3)}
        elif p.startswith("Effect "):
            d["effect"] = expand(p[7:])
        elif p == "minimal class cantrip/arcane discharge":
            d["effect"] = "none. This is a minimal class cantrip/arcane discharge."
        else:
            raise AssertionError("unknown part " + p)
    return d


def verify_class_table(table_text, classes):
    """Parse the rendered table back and compare every mechanical field with canonical Content."""
    lines = [l for l in table_text.split("\n") if l.startswith("- ")]
    expected = [(c, a) for c in CLASS_ORDER for a in classes[c]["actions"]]
    assert len(lines) == len(expected), (len(lines), len(expected))
    checked = 0
    for line, (cname, act) in zip(lines, expected):
        d = parse_rendered_action(line)
        f = act["fields"]
        exp_label = "Basic Attack [auto-granted]" if act["basic"] else f"{act['name']} [{act['category']}]"
        assert d["label"] == exp_label, (d["label"], exp_label)
        for k in ("Type", "Cost", "Ammo", "Range"):
            assert d["fields"].get(k) == f.get(k), (act["name"], k, d["fields"].get(k), f.get(k))
            checked += 1
        if act["strikes"]:
            assert d["strikes"] == act["strikes"]
            assert d["strike"]["Hit Modifier"] == act["strike"]["Hit Modifier"]
            assert d["strike"]["raw"] == raw_formula(act["strike"])
            assert act["strike_note"] == STRIKE_RULE
            checked += 3
        else:
            assert d["fields"].get("Hit Modifier") == f.get("Hit Modifier"), (act["name"], "hit")
            if "Base Power" in f:
                assert d.get("raw") == raw_formula(f), (act["name"], d.get("raw"))
            else:
                assert "raw" not in d
            checked += 2
        exp_eff = None if act["effect"] == "none." else act["effect"]
        assert d["effect"] == exp_eff, (act["name"], d["effect"], act["effect"])
        checked += 1
        # every canonical mechanical number must appear verbatim in the rendered line
        mech = {k: v for k, v in f.items() if k not in ("Rank", "Complexity", "Tags")}
        nums_src = re.findall(r"\d+(?:\.\d+)?", " ".join(str(v) for v in mech.values()) +
                              (" " + " ".join(act["strike"].values()) if act["strike"] else "") +
                              (" " + act["effect"] if act["effect"] else ""))
        line_x = line.replace("EXTRA-BAND rule", EXTRA_BAND_RULE).replace("WARD rule.", WARD_TAIL)
        for n in nums_src:
            assert n in line_x, (act["name"], n)
    return checked


def verify_anchor_table(table_text, anchors):
    lines = table_text.split("\n")[1:]
    assert len(lines) == len(anchors)
    for ln, a in zip(lines, anchors):
        m = re.match(r"^(.+): (\d+)/(\d+)/(\d+)/(\d+)/(\d+)/(\d+) \| (.+) \| (Physical|Magical) \| (\w+)$", ln)
        assert m, ln
        got = (m.group(1), *map(int, m.groups()[1:7]), m.group(8), m.group(9), m.group(10))
        exp = (ANCHOR_SHORT[a["name"]], a["hp"], a["atk"], a["def"], a["mdef"], a["hit"], a["init"], a["attack"],
               a["type"], a["range"])
        assert got == exp, (got, exp)
    return len(lines)
