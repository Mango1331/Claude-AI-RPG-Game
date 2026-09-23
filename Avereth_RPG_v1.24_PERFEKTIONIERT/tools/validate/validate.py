# -*- coding: utf-8 -*-
"""Independent validation of the perfected Avereth files (second quality pass).

Checks: JSON/UTF-8 integrity, template completeness and types, uid/key consistency, regex validity
(SillyTavern parser, run in Node), phase-group invariants, verbatim source<->WorldInfo identity,
lossless-change accounting against the v1.23 originals, host-format independence, stale labels,
version metadata, DEBUG_CALC variant diff, Character Description additions, and numeric fixtures
recomputed from the parsed Content data (L1 values for all five classes, damage and XP examples).
"""
import difflib
import json
import math
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # .../tools
sys.path.insert(0, os.path.join(ROOT, "build"))
import content_model as cm  # noqa: E402
import lib  # noqa: E402  (extracts the baseline ZIP if needed)
import triggers  # noqa: E402

ZIP = lib.ZIP_DIR
OUT = lib.OUT_DIR
REP = lib.REPORT_DIR
os.makedirs(REP, exist_ok=True)
json.dump(triggers.ALL_REGEX_KEYS, open(os.path.join(REP, "regex_keys.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
os.environ.setdefault("AVERETH_BASELINE_DIR", ZIP)
os.environ.setdefault("AVERETH_OUT_DIR", OUT)
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "ok": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))


def load(path):
    raw = open(path, "rb").read()
    raw.decode("utf-8")                              # strict UTF-8
    return json.loads(raw), raw


PAIRS = {
    "core": ("RPG_Core_Mechanics_v1.20.json", "RPG_Core_Mechanics_v1.20_PERFEKTIONIERT.json"),
    "content": ("RPG_Content_v1.12.json", "RPG_Content_v1.12_PERFEKTIONIERT.json"),
    "lore": ("RPG_Lore_v0.7.json", "RPG_Lore_v0.7_PERFEKTIONIERT.json"),
    "system": ("RPG_System_v1.11.json", "RPG_System_v1.11_PERFEKTIONIERT.json"),
    "wi": ("Avereth_RPG_WorldInfo_4096_v1.22.json", "Avereth_RPG_WorldInfo_4096_v1.22_PERFEKTIONIERT.json"),
}
O, N = {}, {}
for k, (a, b) in PAIRS.items():
    O[k], _ = load(os.path.join(ZIP, a))
    N[k], raw = load(os.path.join(OUT, b))
    check(f"{k}: valid JSON + strict UTF-8, no BOM, same serialisation style",
          not raw.startswith(b"\xef\xbb\xbf") and json.dumps(N[k], ensure_ascii=False, indent=2).encode() == raw)
ND, _ = load(os.path.join(OUT, "Avereth_RPG_WorldInfo_4096_v1.22_DEBUG_CALC_PERFEKTIONIERT.json"))

# ---------------------------------------------------------------- template / types / uids
TYPES = {"uid": int, "key": list, "keysecondary": list, "comment": str, "content": str, "constant": bool,
         "vectorized": bool, "selective": bool, "selectiveLogic": int, "addMemo": bool, "order": int, "position": int,
         "disable": bool, "ignoreBudget": bool, "excludeRecursion": bool, "preventRecursion": bool,
         "probability": int, "useProbability": bool, "depth": int, "outletName": str, "group": str,
         "groupOverride": bool, "groupWeight": int, "automationId": str, "role": int, "extensions": dict,
         "displayIndex": int}
WI_EXTRA = ["matchPersonaDescription", "matchCharacterDescription", "matchCharacterPersonality",
            "matchCharacterDepthPrompt", "matchScenario", "matchCreatorNotes", "triggers"]
for k, doc in list(N.items()) + [("wi_debug", ND)]:
    ents = doc["entries"]
    fieldsets = {tuple(e.keys()) for e in ents.values()}
    check(f"{k}: every entry has the identical complete field set", len(fieldsets) == 1, f"{len(ents)} entries")
    bad = []
    for key, e in ents.items():
        if str(e["uid"]) != key:
            bad.append(f"uid {e['uid']} under key {key}")
        for f, t in TYPES.items():
            if not isinstance(e[f], t) or (t is int and isinstance(e[f], bool)):
                bad.append(f"#{key}.{f}={e[f]!r}")
        for f in ("scanDepth",):
            if e[f] is not None and not isinstance(e[f], int):
                bad.append(f"#{key}.scanDepth")
        if k.startswith("wi"):
            for f in WI_EXTRA:
                if f not in e:
                    bad.append(f"#{key} missing {f}")
        if not all(isinstance(x, str) and x.strip() for x in e["key"] + e["keysecondary"]):
            bad.append(f"#{key} empty/non-string key")
    check(f"{k}: uid==key, field types valid, no empty keys", not bad, "; ".join(bad[:5]))
    di = [e["displayIndex"] for e in ents.values()]
    check(f"{k}: displayIndex unique", len(di) == len(set(di)))

# ---------------------------------------------------------------- regex keys (real SillyTavern parser in Node)
allkeys = []
for k, doc in (("wi", N["wi"]), ("wi_debug", ND)):
    for e in doc["entries"].values():
        for key in e["key"] + e["keysecondary"]:
            if re.match(r"^/.*/[gimsuy]*$", key, re.S):
                allkeys.append(key)
js = ("const {parseRegexFromString}=require('" + os.path.join(HERE, "st_core.js").replace("\\", "/") + "');"
      "const ks=JSON.parse(require('fs').readFileSync(0,'utf8'));let bad=ks.filter(k=>!parseRegexFromString(k));"
      "console.log(JSON.stringify({n:ks.length,bad}));")
res = json.loads(subprocess.run(["node", "-e", js], input=json.dumps(allkeys), capture_output=True, text=True, check=True).stdout)
check("WI: every regex-style key is accepted by SillyTavern's parseRegexFromString", not res["bad"],
      f"{res['n']} regex keys; invalid: {res['bad'][:3]}")

# ---------------------------------------------------------------- WI invariants
W = N["wi"]["entries"]
consts = [u for u, e in W.items() if e["constant"]]
check("WI: exactly one constant entry (kernel #0, ignoreBudget)", consts == ["0"] and W["0"]["ignoreBudget"], str(consts))
grp = {u: (e["order"], e["groupOverride"]) for u, e in W.items() if e["group"] == "AVERETH_RUNTIME_PHASE"}
check("WI: runtime phase group = Creation 1003 > ACTIVE 1002 > PENDING 1001 > START 1000, all prioritised",
      grp == {"54": (1003, True), "2": (1002, True), "55": (1001, True), "1": (1000, True)}, str(grp))
check("WI: no sticky/cooldown/delay anywhere, recursion flags unchanged",
      all(e["sticky"] == 0 and e["cooldown"] == 0 and e["delay"] == 0 and e["excludeRecursion"] and e["preventRecursion"]
          for e in W.values()))
removed = sorted(set(O["wi"]["entries"]) - set(W), key=int)
check("WI: removed entries are exactly #62-#67", removed == ["62", "63", "64", "65", "66", "67"], str(removed))
check("WI: no new uids introduced", set(W) <= set(O["wi"]["entries"]))
for u in ("62", "63", "64", "65", "66"):
    cls_uid = str(int(u) - 43)
    check(f"WI: removed #{u} was byte-identical to class entry #{cls_uid} (lossless)",
          O["wi"]["entries"][u]["content"] == O["wi"]["entries"][cls_uid]["content"])
check("WI: removed #67 debug text survives in System #14 and in the DEBUG_CALC build",
      O["wi"]["entries"]["67"]["content"].split("\n")[0] in N["system"]["entries"]["14"]["content"]
      and "VISIBLE CALCULATION AUDIT" in ND["entries"]["1"]["content"])

# verbatim identity source <-> WI
src_of = {}
for fname in ("core", "content", "lore", "system"):
    for su, e in N[fname]["entries"].items():
        comp = e["extensions"].get("rpg_compile", {})
        if comp.get("mode") == "verbatim":
            src_of[comp["runtime"].replace("WI #", "")] = (fname, su)
mism = [u for u, (f, su) in src_of.items() if W[u]["content"] != N[f]["entries"][su]["content"]]
check("Source<->WI: every 'verbatim' WI entry equals its perfected source entry", not mism and len(src_of) == 53,
      f"{len(src_of)} verbatim entries; mismatches {mism}")
trig_mism = []
for u, (f, su) in src_of.items():
    for fld in ("key", "keysecondary", "constant", "order", "position", "scanDepth", "selectiveLogic", "matchWholeWords"):
        if W[u][fld] != N[f]["entries"][su][fld]:
            trig_mism.append(f"{f}#{su}.{fld}")
check("Source<->WI: verbatim sources mirror the runtime trigger fields", not trig_mism, str(trig_mism[:5]))
check("Sources: every entry documents its runtime target (extensions.rpg_compile)",
      all("rpg_compile" in e["extensions"] for f in ("core", "content", "lore", "system") for e in N[f]["entries"].values()))
check("Sources: no source entry claims constant=true (only the WI kernel is constant at runtime)",
      not [f"{f}#{u}" for f in ("core", "content", "lore", "system") for u, e in N[f]["entries"].items() if e["constant"]])

# ---------------------------------------------------------------- lossless change accounting (sources)
def changed(fname):
    out = []
    for u, e in O[fname]["entries"].items():
        if e["content"] != N[fname]["entries"][u]["content"]:
            out.append(int(u))
    return sorted(out)


check("Core: content changed only in #11 #12 #18 #21 #23 #24 #26 #27", changed("core") == [11, 12, 18, 21, 23, 24, 26, 27], str(changed("core")))
check("Content: content changed only in #5 (Ranger Ammo fields)", changed("content") == [5], str(changed("content")))
check("Lore: world text byte-identical", changed("lore") == [], str(changed("lore")))
check("System: content changed only in #1 #5 #10 #12 #14", changed("system") == [1, 5, 10, 12, 14], str(changed("system")))
for fname in ("core", "content", "lore", "system"):
    check(f"{fname}: same entry uids as the original", set(O[fname]["entries"]) == set(N[fname]["entries"]))
# every removed line from a changed source entry is listed (no silent deletion)
removed_lines = {}
for fname in ("core", "content", "system"):
    for u in changed(fname):
        a = O[fname]["entries"][str(u)]["content"].split("\n")
        b = N[fname]["entries"][str(u)]["content"].split("\n")
        gone = [l for l in a if l.strip() and l not in b]
        if gone:
            removed_lines[f"{fname}#{u}"] = gone
json.dump(removed_lines, open(os.path.join(REP, "removed_lines.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
expected_removals = {"core#11", "core#18", "core#21", "core#26", "content#5", "system#1", "system#5", "system#10", "system#12"}
check("Removed/reworded source lines are confined to the documented patches", set(removed_lines) == expected_removals,
      ", ".join(sorted(set(removed_lines) ^ expected_removals)) or f"{sum(len(v) for v in removed_lines.values())} lines, see removed_lines.json")
# Content: the Ranger text still contains every original mechanical number
r_old, r_new = O["content"]["entries"]["5"]["content"], N["content"]["entries"]["5"]["content"]
nums_old = sorted(re.findall(r"\d+(?:\.\d+)?", r_old))
nums_new = re.findall(r"\d+(?:\.\d+)?", r_new)
missing = [n for n in set(nums_old) if nums_new.count(n) < nums_old.count(n)]
check("Content #5: every original number preserved after the Ammo patch", not missing, str(missing))

# ---------------------------------------------------------------- stale labels / host independence
# scan rule text only (contents, keys, comments) — change logs in extensions legitimately name the removed labels
blob_new = json.dumps([[e["content"], e["key"], e["keysecondary"], e["comment"]] for k in N for e in N[k]["entries"].values()],
                      ensure_ascii=False)
for pat, label in [(r"V0\.1", "'V0.1' labels"), (r"Creation_State", "'Creation_State'"), (r"Stage-III", "'Stage-III passive'"),
                   (r"combat overlay", "'combat overlay' key"), (r"capped as already defined by Core", "dangling crit cap"),
                   (r"V1\.3 DELIBERATE", "v1.3 non-definitions header"), (r"DERIVED VALIDATION", "test oracle in runtime/System"),
                   (r"STARTER KIT MAP", "duplicate kit map"), (r"STATUS: ACTIVE", "generic 'STATUS: ACTIVE' trigger")]:
    check(f"stale/unsafe text removed: {label}", not re.search(pat, blob_new), pat)
host = []
for k in ("core", "content", "lore", "system", "wi"):
    for u, e in N[k]["entries"].items():
        c = e["content"]
        for pat in (r"<Blocks>", r"<World_State>", r"<Character_Sheet>", r"<New_NPC>", r"must end with", r"\[SYSTEM // COMBAT"):
            if re.search(pat, c):
                host.append(f"{k}#{u}:{pat}")
check("Host independence: no Megumin/SillyTavern envelope or tag prescriptions in any perfected file", not host, str(host))

# ---------------------------------------------------------------- key-rotation fix + labels
C = N["core"]["entries"]
check("Core #27/#28/#29 keys match their own phase", C["27"]["key"][0] == "COMBAT ACTIVE" and C["28"]["key"][0] == "COMBAT END"
      and C["29"]["key"][0] == "combat audit", f"{C['27']['key'][0]} / {C['28']['key'][0]} / {C['29']['key'][0]}")
check("Creation labels consistent: First Message <-> System #12 <-> WI #54 keys",
      "CHARACTER CREATION — STEP 1/2" in open(os.path.join(ZIP, "RPG_First_Message_v0.4.txt"), encoding="utf-8").read()
      and "CHARACTER CREATION — STEP 2/2" in N["system"]["entries"]["12"]["content"]
      and "Select exactly 2 Skills" in W["54"]["key"] and "CLASS SELECTED" in W["54"]["key"])

# ---------------------------------------------------------------- versions
vers = {
    "core": N["core"]["extensions"]["rpg_core"]["version"], "core2": N["core"]["extensions"]["rpg_core_version"],
    "content": N["content"]["extensions"]["rpg_content"]["version"], "lore": N["lore"]["extensions"]["rpg_lore"]["version"],
    "system": N["system"]["extensions"]["rpg_system"]["version"], "wi": N["wi"]["extensions"]["rpg_master_worldinfo"]["version"],
}
check("Version metadata", vers == {"core": "v1.21", "core2": "v1.21", "content": "v1.13", "lore": "v0.8", "system": "v1.12", "wi": "v1.23"}, str(vers))
entry_versions = {
    "core": {e["extensions"].get("rpg_core_version") for e in N["core"]["entries"].values()},
    "content": {e["extensions"].get("rpg_content_version") for e in N["content"]["entries"].values()},
    "lore": {e["extensions"]["rpg_lore"]["version"] for e in N["lore"]["entries"].values()},
    "system": {e["extensions"]["rpg_system"]["version"] for e in N["system"]["entries"].values()},
}
check("Per-entry version tags unified", entry_versions == {"core": {"v1.21"}, "content": {"v1.13"}, "lore": {"v0.8"}, "system": {"v1.12"}},
      str(entry_versions))
srcs = N["wi"]["extensions"]["rpg_master_worldinfo"]["sources"]
check("WI sources reference the perfected versions", srcs == ["RPG_Core_Mechanics_v1.21", "RPG_Content_v1.13", "RPG_Lore_v0.8", "RPG_System_v1.12"], str(srcs))

# ---------------------------------------------------------------- DEBUG_CALC diff
diffs = []
for u in set(W) | set(ND["entries"]):
    a, b = W.get(u), ND["entries"].get(u)
    if a is None or b is None:
        diffs.append(u)
        continue
    for f in a:
        if a[f] != b[f]:
            diffs.append(f"{u}.{f}")
check("DEBUG_CALC differs from standard only in START/ACTIVE/PENDING content+comment",
      sorted(diffs) == sorted(["1.content", "1.comment", "2.content", "2.comment", "55.content", "55.comment"]), str(sorted(diffs)))
for u in ("1", "2", "55"):
    std, dbg = W[u]["content"], ND["entries"][u]["content"]
    sm = difflib.SequenceMatcher(None, std, dbg, autojunk=False)
    inserts_only = all(op in ("equal", "insert") for op, *_ in sm.get_opcodes())
    check(f"DEBUG_CALC #{u}: standard text fully preserved (debug text only inserted)", inserts_only)

# ---------------------------------------------------------------- Character Description
cd_old = open(os.path.join(ZIP, "Avereth_RPG_Character_Description_v2.2.txt"), encoding="utf-8").read()
cd_new = open(os.path.join(OUT, "Avereth_RPG_Character_Description_v2.2_PERFEKTIONIERT.txt"), encoding="utf-8").read()
sm = difflib.SequenceMatcher(None, cd_old, cd_new, autojunk=False)
check("Character Description: v2.2 text fully preserved, only additions",
      all(op in ("equal", "insert") for op, *_ in sm.get_opcodes()), f"{len(cd_old)} -> {len(cd_new)} chars")
check("Character Description: PC STATE DELTA CHECK + final check item 10 present",
      "PC STATE DELTA CHECK" in cd_new and "10. Did Alaric's position" in cd_new)
check("Character Description: still host-independent", not re.search(r"<Blocks>|<New_NPC>|must end with", cd_new))

# ---------------------------------------------------------------- numeric fixtures from parsed Content
classes = {}
for k in ("1", "2", "3", "4", "5"):
    c = cm.parse_class_entry(N["content"]["entries"][k]["content"])
    classes[c["name"]] = c
kits = cm.parse_starter_kits(N["content"]["entries"]["11"]["content"])
anchors = {cm.ANCHOR_SHORT[a["name"]]: a for a in cm.parse_monster_anchors(N["content"]["entries"]["7"]["content"])}


def kit_values(cls):
    atk = matk = df = mdf = 0
    for item in kits[cls]:
        for stat, val in re.findall(r"\b(ATK|MATK|DEF|MDEF) (\d+)", item):
            v = int(val)
            atk += v if stat == "ATK" else 0
            matk += v if stat == "MATK" else 0
            df += v if stat == "DEF" else 0
            mdf += v if stat == "MDEF" else 0
    return atk, matk, df, mdf


def raw_value(expr, stats, atk, matk):
    total = 0.0
    for term in [t.strip() for t in expr.split("+")]:
        m = re.match(r"^(STR|VIT|AGI|INT|PER|WIL) × ([\d.]+)$", term)
        if m:
            total += stats[m.group(1)] * float(m.group(2))
        elif term == "ATK":
            total += atk
        elif term == "MATK":
            total += matk
        elif term == "50% of ATK":
            total += 0.5 * atk
        else:
            total += float(term)
    return total


fixtures = {}
for cname, cls in classes.items():
    stats = {s: 5 for s in ("STR", "VIT", "AGI", "INT", "PER", "WIL")}
    for s in cls["favored"]:
        stats[s] += 1
    atk, matk, gdef, gmdef = kit_values(cname)
    derived = {"MaxHP": 50 + 5 + stats["VIT"] * 5, "MaxMP": stats["INT"] * 8 + stats["WIL"] * 4, "MaxSTA": 100,
               "Init": stats["AGI"] + stats["PER"] // 2, "BaseDEF": stats["VIT"] // 4, "BaseMDEF": stats["WIL"] // 4}
    derived["TOTAL_DEF"] = derived["BaseDEF"] + gdef
    derived["TOTAL_MDEF"] = derived["BaseMDEF"] + gmdef
    derived.update({"ATK": atk, "MATK": matk, "BaseHit": 70 + stats["PER"] * 0.5, "Crit%": 5 + stats["PER"] / 10})
    raws = {}
    for a in cls["actions"]:
        f = a["strike"] if a["strikes"] else a["fields"]
        if "Base Power" in f:
            raws[a["name"]] = raw_value(cm.raw_formula(f), stats, atk, matk)
    fixtures[cname] = {"stats": stats, "derived": derived, "raw": raws}
json.dump(fixtures, open(os.path.join(REP, "fixtures_L1.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
R = fixtures["RANGER"]
check("Fixture Ranger L1 (test setup v2.6): STR5 VIT5 AGI6 INT5 PER6 WIL5, HP80 MP60 STA100 Init9, DEF3/MDEF4, ATK6, BaseHit73, Crit5.6%",
      R["stats"] == {"STR": 5, "VIT": 5, "AGI": 6, "INT": 5, "PER": 6, "WIL": 5}
      and (R["derived"]["MaxHP"], R["derived"]["MaxMP"], R["derived"]["MaxSTA"], R["derived"]["Init"]) == (80, 60, 100, 9)
      and (R["derived"]["TOTAL_DEF"], R["derived"]["TOTAL_MDEF"], R["derived"]["ATK"]) == (3, 4, 6)
      and R["derived"]["BaseHit"] == 73 and abs(R["derived"]["Crit%"] - 5.6) < 1e-9)
check("Fixture raw values: Basic 17.5, Aimed 26.5, Power 33.25, Quick 21.0, Twin 12.25 per strike",
      (R["raw"]["Basic Attack"], R["raw"]["Aimed Shot"], R["raw"]["Power Shot"], R["raw"]["Quick Shot"], R["raw"]["Twin Shot"])
      == (17.5, 26.5, 33.25, 21.0, 12.25), str(R["raw"]))


def dmg(raw, d, var, crit=1.0):
    return max(1, int(math.floor(max(raw - d, raw * 0.10) * var * crit + 0.5)))


check("Worked examples (Core #11): 17.5 vs DEF2 var0.94 -> 15; 12.25 vs DEF2 var1.08 crit -> 17",
      dmg(17.5, 2, 0.94) == 15 and dmg(12.25, 2, 1.08, 1.5) == 17)
check("Damage order: DEF before variance (Power Shot 33.25 vs Boar DEF2, var1.10 -> 34; variance-first would give 35); "
      "the v1.23 run hit a Deer with DEF0 at var0.97 -> 32 either way, so the wrong order stayed latent",
      dmg(33.25, 2, 1.10) == 34 and int(math.floor(33.25 * 1.10 - 2 + 0.5)) == 35 and dmg(33.25, 0, 0.97) == 32)


def scale(a, L):
    g = L - 1
    return {"HP": round(a["hp"] * (1 + 0.20 * g)), "ATK": round(a["atk"] * (1 + 0.22 * g)),
            "DEF": max(0, round((a["def"] + 1) * (1 + 0.20 * g) - 1)), "MDEF": max(0, round((a["mdef"] + 1) * (1 + 0.20 * g) - 1)),
            "Hit": min(95, a["hit"] + 2 * (g // 15)), "Init": round(a["init"] * (1 + 0.05 * g))}


boar1, wolf2 = scale(anchors["Boar"], 1), scale(anchors["Wolf"], 2)
check("Monster fixture: Boar F1 = HP41 ATK11 DEF2 MDEF0 Hit70 Init7; DefeatXP 10",
      boar1 == {"HP": 41, "ATK": 11, "DEF": 2, "MDEF": 0, "Hit": 70, "Init": 7} and round(1 * 10 * 1 * 1) == 10, str(boar1))
check("Monster fixture: Wolf L2 = HP28 ATK11 DEF0 Hit80 Init13, DefeatXP 20 (chat-2 example '34/9/1/67/12/12' was wrong)",
      wolf2 == {"HP": 28, "ATK": 11, "DEF": 0, "MDEF": 0, "Hit": 80, "Init": 13}, str(wolf2))

# ---------------------------------------------------------------- activation simulation (Node)
sim = subprocess.run(["node", os.path.join(HERE, "simulate.js")], capture_output=True, text=True)
tail = sim.stdout.strip().split("\n")[-1]
check("Activation simulation: all scenarios pass with the perfected WorldInfo", sim.returncode == 0, tail)
rx = subprocess.run(["node", os.path.join(HERE, "regex_tests.js")], capture_output=True, text=True)
check("Regex unit tests", rx.returncode == 0, rx.stdout.strip().split("\n")[-1])

ok = all(r["ok"] for r in results)
json.dump({"ok": ok, "results": results}, open(os.path.join(REP, "validation_report.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print(f"\n{sum(r['ok'] for r in results)}/{len(results)} checks passed")
sys.exit(0 if ok else 1)
