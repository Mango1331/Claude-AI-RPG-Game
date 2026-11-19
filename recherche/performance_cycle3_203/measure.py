"""Measure archived physical requests under both contracts, without model inference."""

import json
import sys
import re
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer

raw, comparison, tokenizer, template, output = map(Path, sys.argv[1:])
assert (
    sha256(tokenizer.read_bytes()).hexdigest()
    == "19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d"
)
assert (
    sha256(template.read_bytes()).hexdigest()
    == "2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4"
)
encoder = Tokenizer.from_file(str(tokenizer))
chat = ImmutableSandboxedEnvironment(
    trim_blocks=True, lstrip_blocks=True, extensions=["jinja2.ext.loopcontrols"]
).from_string(template.read_text())
ledger = [json.loads(line) for line in (raw / "physical.jsonl").read_text().splitlines()]
ends = {r["id"]: r for r in ledger if r["kind"] == "end"}
study = json.loads(comparison.read_text())
old, new = study["market"]
wire = json.loads((raw / "wire.json").read_text())["rows"]
measured = []
repairs = []
schema_trials = []
for row in sorted(wire, key=lambda r: r["id"]):

    def count(messages):
        rendered = chat.render(
            messages=messages,
            tools=None,
            add_generation_prompt=True,
            reasoning_effort=row.get("reasoning_effort"),
            clear_thinking=row.get("clear_thinking", False),
        )
        return len(encoder.encode(rendered, add_special_tokens=False).ids)

    messages = deepcopy(row["messages"])
    assert count(messages) == ends[row["id"]]["usage"]["prompt_tokens"]
    if row["role"] not in ("extractor", "planner") or row["id"] == 31:
        continue
    # Project both historical arms onto the real B3 machine market and X envelope.
    lines = messages[1]["content"].split("\n")
    [index] = [i for i, line in enumerate(lines) if line.startswith("GEAR MARKET —")]
    if row["arm"] == "B":
        assert lines[index] == old
    lines[index] = old
    messages[1]["content"] = "\n".join(lines)
    if row["role"] == "extractor":
        short = 'Answer with {"expected": {...}, "deltas": [...]}.\n\n'
        assert messages[0]["content"].count(short) == 1
        messages[0]["content"] = messages[0]["content"].replace(short, "")
    baseline = count(messages)
    messages[1]["content"] = messages[1]["content"].replace(old, new, 1)
    candidate = count(messages)
    measured.append(
        {k: row[k] for k in ["id", "role", "stage", "arm"]}
        | {"baseline": baseline, "candidate": candidate, "saved": baseline - candidate}
    )
    # Separate trial on the complete candidate request. Only change delimiters inside schema field lists.
    if row["role"] == "extractor":
        trial = deepcopy(messages)
        pattern = r"^(- [\w.]+ \{)([^{}\n]+)(\}: )"
        trial[0]["content"], count_shapes = re.subn(
            pattern,
            lambda match: match[1] + match[2].replace(", ", ",") + match[3],
            trial[0]["content"],
            flags=re.M,
        )
        schema_trials.append({"id": row["id"], "shapes": count_shapes, "saved": candidate - count(trial)})
    if len(messages) == 4 and row["role"] == "extractor":
        previous = messages[2]["content"]
        try:
            parsed = json.loads(previous)
        except ValueError:
            repairs.append({"id": row["id"], "validJSON": False})
            continue
        corrected = json.loads(ends[row["id"]]["text"])
        kept = [d["type"] for d in parsed["deltas"][1:] if d in corrected["deltas"]]
        messages[2]["content"] = json.dumps(parsed["deltas"][0], ensure_ascii=False, separators=(",", ":"))
        repairs.append(
            {
                "id": row["id"],
                "validJSON": True,
                "inputSavedSendingOnlyFirstDelta": candidate - count(messages),
                "otherOriginalDeltasReusedInFullRepair": kept,
            }
        )
# A byte-identical player utterance alone would be a possible planner cache key.
turns = json.loads((raw / "turns.json").read_text())
pairs = []
for a in [turn for turn in turns if turn["arm"] == "A"]:
    b = next(turn for turn in turns if turn["arm"] == "B" and turn["n"] == a["n"])
    if a["action"] != b["action"]:
        continue
    plans = []
    for turn in (a, b):
        [plan] = [ends[i] for i in turn["requests"] if ends[i]["role"] == "planner"]
        plans.append(json.loads(plan["text"])["commands"])
    pairs.append(
        {
            "turn": a["n"],
            "sameCommands": plans[0] == plans[1],
            "types": [[cmd["type"] for cmd in plan] for plan in plans],
        }
    )
output.write_text(
    json.dumps(
        {
            "verifiedInputs": len(wire),
            "requests": measured,
            "repairProbe": repairs,
            "schemaDelimiters": schema_trials,
            "samePlannerInput": pairs,
            "jobs": study["jobs"],
        },
        indent=2,
    )
    + "\n"
)
