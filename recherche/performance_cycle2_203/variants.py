"""Offline prompt substitutions, per-request measurements and paired host timings. No inference."""

from collections import Counter
from pathlib import Path
import json
import re
import sys
from hashlib import sha256
from statistics import median
from tokenizers import Tokenizer
from jinja2.sandbox import ImmutableSandboxedEnvironment

raw, tokenizer, template, out = map(Path, sys.argv[1:])
assert (
    sha256(tokenizer.read_bytes()).hexdigest()
    == "19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d"
)
assert (
    sha256(template.read_bytes()).hexdigest()
    == "2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4"
)
tok = Tokenizer.from_file(str(tokenizer))
tmp = ImmutableSandboxedEnvironment(
    trim_blocks=True, lstrip_blocks=True, extensions=["jinja2.ext.loopcontrols"]
).from_string(template.read_text())
read = lambda n: json.loads((raw / n).read_text())
records = read("wire.json")["rows"]
j = list(map(json.loads, (raw / "physical.jsonl").read_text().splitlines()))
ends = {r["id"]: r for r in j if r["kind"] == "end"}
inputs = []
short = " except on numbered outdoor hunts with habitat and one DEFEAT objective: omit task and desired_end_state there. Keep the full title, client, target, quantity and exact site. Other listings require the full form"
obsolete = 'Answer with {"expected": {...}, "deltas": [...]}.\n\n'
examples = Counter()
for row in records:

    def length(system):
        ms = [{**row["messages"][0], "content": system}, *row["messages"][1:]]
        return len(
            tok.encode(
                tmp.render(
                    messages=ms,
                    tools=None,
                    add_generation_prompt=True,
                    reasoning_effort=row.get("reasoning_effort"),
                    clear_thinking=row.get("clear_thinking", False),
                ),
                add_special_tokens=False,
            ).ids
        )

    n = row["id"]
    system = row["messages"][0]["content"]
    base = length(system)
    assert base == ends[n]["usage"]["prompt_tokens"]
    new = system
    if row["role"] == "extractor":
        assert system.count(obsolete) == 1
        new = system.replace(obsolete, "")
    if row["role"] == "planner":
        # Modify only full JSON examples on the same line, preserving all significant JSON values.
        lines = []
        for line in system.splitlines(keepends=True):
            prefix, sep, tail = line.partition("→ ")
            if sep:
                try:
                    obj = json.loads(tail)
                except ValueError:
                    pass
                else:
                    brief = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
                    assert json.loads(brief) == obj
                    examples[n] += 1
                    line = prefix + sep + brief + ("\n" if line.endswith("\n") else "")
            lines.append(line)
        new = "".join(lines)
    if row["role"] == "board":
        system = system.replace(short, "")
        base = length(system)
        # Two explicit sets still allow every intro anchor for later hunts.
        a = re.search(
            r"- Intro eligible body-plan ids \(ordinary level 1, calculated from Content\): ([\w, ]+)\. Species names must still fit their body plan\.\n- Supported body-plan ids: ([\w, ]+)\.",
            system,
        )
        if a:
            intro = a[1].split(", ")
            all_ids = a[2].split(", ")
            extra = [i for i in all_ids if i not in intro]
            assert set(intro).isdisjoint(extra) and set(intro + extra) == set(all_ids)
            revised = (
                "- Introductory hunt: use only one of these eligible body plans: "
                + ", ".join(intro)
                + ". Species must fit. Other hunts may use those or: "
                + ", ".join(extra)
                + "."
            )
            new = system[: a.start()] + revised + system[a.end() :]
        else:
            new = system
    if row["role"] in ("planner", "extractor", "board"):
        inputs.append(
            dict(
                id=n,
                role=row["role"],
                turn=row["turn"],
                arm=row["arm"],
                stage=row["stage"],
                baseline=base,
                trial=length(new),
                examples=examples[n],
                original=ends[n]["usage"]["prompt_tokens"],
            )
        )
turns = read("summary.json")["turns"]
groups = {}
for arm in ("A", "B"):
    p = [r for r in turns if r["arm"] == arm]
    groups[arm] = {}
    for field in ("lastExtractorTransportEnd", "worldCommit", "confirmedSave"):
        gaps = [round(r["phaseMs"]["ready"] - r["phaseMs"][field], 1) for r in p]
        groups[arm][field] = {"toReadyMs": gaps, "median": median(gaps), "max": max(gaps)}
pairs = {}
for field in ("firstProse", "stNarrationFinished", "ready"):
    d = []
    for n in range(1, 11):
        x, y = [next(r for r in turns if r["n"] == n and r["arm"] == a)["phaseMs"][field] for a in "AB"]
        if x is not None and y is not None:
            d.append(round(y - x, 1))
    pairs[field] = {"deltaMs": d, "median": median(d), "n": len(d)}
out.write_text(json.dumps(dict(rows=inputs, local=groups, pairs=pairs), indent=1) + "\n")
