# -*- coding: utf-8 -*-
"""Shared helpers for the Avereth v1.24 build (source patches + WorldInfo compile)."""
import copy
import json
import os
import re

import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)                                   # .../tools
DELIVER = os.path.dirname(TOOLS)                                # deliverable folder (outputs live here)
BASELINE_ZIP = os.environ.get("AVERETH_BASELINE_ZIP",
                              os.path.join(os.path.dirname(DELIVER), "Avereth_RPG_Test_Baseline_v1.23.zip"))
ZIP_DIR = os.environ.get("AVERETH_BASELINE_DIR", os.path.join(TOOLS, "baseline"))   # originals, read-only
OUT_DIR = os.environ.get("AVERETH_OUT_DIR", DELIVER)            # perfected files
REPORT_DIR = os.path.join(TOOLS, "validation")                  # build/validation reports


def ensure_baseline():
    """Extract the v1.23 baseline ZIP (repository root) once; the originals are never modified."""
    if os.path.isdir(ZIP_DIR) and os.path.exists(os.path.join(ZIP_DIR, "RPG_Core_Mechanics_v1.20.json")):
        return
    os.makedirs(ZIP_DIR, exist_ok=True)
    with zipfile.ZipFile(BASELINE_ZIP) as z:
        z.extractall(ZIP_DIR)


ensure_baseline()

# Field order used by the four authoring sources (36 fields, as in the originals).
SOURCE_FIELD_ORDER = [
    "uid", "key", "keysecondary", "comment", "content", "constant", "vectorized", "selective",
    "selectiveLogic", "addMemo", "order", "position", "disable", "ignoreBudget", "excludeRecursion",
    "preventRecursion", "delayUntilRecursion", "recursionLevel", "probability", "useProbability",
    "depth", "outletName", "group", "groupOverride", "groupWeight", "useGroupScoring", "scanDepth",
    "caseSensitive", "matchWholeWords", "automationId", "role", "sticky", "cooldown", "delay",
    "extensions", "displayIndex",
]
# Field order used by the compiled WorldInfo (43 fields, as in the original WI).
WI_FIELD_ORDER = [
    "uid", "key", "keysecondary", "comment", "content", "constant", "vectorized", "selective",
    "selectiveLogic", "addMemo", "order", "position", "disable", "ignoreBudget", "excludeRecursion",
    "preventRecursion", "delayUntilRecursion", "recursionLevel", "matchPersonaDescription",
    "matchCharacterDescription", "matchCharacterPersonality", "matchCharacterDepthPrompt",
    "matchScenario", "matchCreatorNotes", "probability", "useProbability", "depth", "outletName",
    "group", "groupOverride", "groupWeight", "useGroupScoring", "scanDepth", "caseSensitive",
    "matchWholeWords", "automationId", "role", "sticky", "cooldown", "delay", "triggers",
    "extensions", "displayIndex",
]
# Defaults used only to fill fields that are MISSING in an entry (never to overwrite).
FILL_DEFAULTS = {
    "key": [], "keysecondary": [], "comment": "", "content": "", "constant": False,
    "vectorized": False, "selective": True, "selectiveLogic": 0, "addMemo": True, "order": 100,
    "position": 0, "disable": False, "ignoreBudget": False, "excludeRecursion": True,
    "preventRecursion": True, "delayUntilRecursion": False, "recursionLevel": 0,
    "matchPersonaDescription": False, "matchCharacterDescription": False,
    "matchCharacterPersonality": False, "matchCharacterDepthPrompt": False, "matchScenario": False,
    "matchCreatorNotes": False, "probability": 100, "useProbability": True, "depth": 4,
    "outletName": "", "group": "", "groupOverride": False, "groupWeight": 100,
    "useGroupScoring": False, "scanDepth": None, "caseSensitive": False, "matchWholeWords": True,
    "automationId": "", "role": 0, "sticky": 0, "cooldown": 0, "delay": 0, "triggers": [],
    "extensions": {},
}


def load_json(name):
    with open(os.path.join(ZIP_DIR, name), encoding="utf-8") as f:
        return json.load(f)


def load_text(name):
    with open(os.path.join(ZIP_DIR, name), encoding="utf-8") as f:
        return f.read()


def dump_json(obj, path):
    """Same serialisation as the originals: indent 2, UTF-8 (no ASCII escaping), no trailing newline."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    text = json.dumps(obj, ensure_ascii=False, indent=2)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    # round-trip guard
    with open(path, encoding="utf-8") as f:
        assert json.load(f) == obj, "JSON round-trip mismatch for " + path


def dump_text(text, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def replace_once(text, old, new, label=""):
    """Exact, asserted replacement: `old` must occur exactly once."""
    n = text.count(old)
    if n != 1:
        raise AssertionError(f"replace_once[{label}]: expected 1 occurrence, found {n}: {old[:120]!r}")
    return text.replace(old, new)


def normalize_entry(entry, field_order):
    """Return a copy with every template field present (missing ones filled) and canonical key order.
    Unknown extra fields are kept (appended) so nothing is silently dropped."""
    e = copy.deepcopy(entry)
    out = {}
    for f in field_order:
        if f in e:
            out[f] = e.pop(f)
        else:
            out[f] = copy.deepcopy(FILL_DEFAULTS[f])
    for k, v in e.items():   # preserve anything unexpected
        out[k] = v
    return out


def ws(s):
    """Whitespace-normalise for semantic comparisons."""
    return re.sub(r"\s+", " ", s).strip()
