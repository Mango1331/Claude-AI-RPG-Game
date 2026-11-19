"""Token-exact comparisons of archived inputs only. Arguments: historical JSON, unpacked A/B, tokenizer, template, output, response metadata."""

from hashlib import sha256
import json
from pathlib import Path
import sys
from tokenizers import Tokenizer
from jinja2.sandbox import ImmutableSandboxedEnvironment

history, raw, tokenizer, template, dest, metadata = map(Path, sys.argv[1:])
fingerprints = {r["id"]: r["fingerprint"] for r in json.loads(metadata.read_text())}
assert (
    sha256(tokenizer.read_bytes()).hexdigest()
    == "19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d"
)
assert (
    sha256(template.read_bytes()).hexdigest()
    == "2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4"
)
tok = Tokenizer.from_file(str(tokenizer))
tmpl = ImmutableSandboxedEnvironment(
    trim_blocks=True, lstrip_blocks=True, extensions=["jinja2.ext.loopcontrols"]
).from_string(template.read_text())


def role(ms):
    first = ms[0]["content"]
    for prefix, name in [
        ("AVERETH NARRATOR", "N"),
        ("You are the", "P"),
        ("You write the official", "B"),
        ("You read one reply", "X"),
        ("Name new fantasy", "passive"),
    ]:
        if first.startswith(prefix):
            return name
    return "preflight"


def prefix(a, b):
    # Binary search the number of identical token IDs at the very start.
    lo, hi = 0, min(len(a), len(b))
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if a[:mid] == b[:mid]:
            lo = mid
        else:
            hi = mid - 1
    return lo


def components(ms):
    def digest(obj):
        return sha256(json.dumps(obj, ensure_ascii=False).encode()).hexdigest()

    def part(m):
        t = m["content"]
        if m["role"] != "system":
            return "history"
        if t.startswith("Alaric is a 18-year-old "):
            return "persona"
        if t.startswith("AVERETH RPG"):
            return "card"
        if t.startswith("[AVERETH ENGINE"):
            return "engine"
        if t.startswith(("AVERETH NARRATOR", "OUTPUT FORMAT", "[Start a new Chat]")):
            return "other"
        return "lore"

    return {
        k: digest([m for m in ms if part(m) == k]) for k in ("card", "persona", "lore", "engine", "history")
    }


hist = json.loads(history.read_text())
starts = {}
ends = {}
for line in (raw / "physical.jsonl").read_text().splitlines():
    r = json.loads(line)
    if r["kind"] == "start":
        starts[r["id"]] = r
    if r["kind"] == "end":
        ends[r["id"]] = r
natural = []
for r in sorted(json.loads((raw / "wire.json").read_text())["rows"], key=lambda x: x["id"]):
    n = r["id"]
    s = starts[n]
    e = ends[n]
    assert r["hash"] == sha256(json.dumps(r["messages"], ensure_ascii=False).encode()).hexdigest()
    natural.append(
        dict(
            corpus="AB",
            messages=r["messages"],
            params=s["params"],
            created=s["at"] / 1000,
            usage=e["usage"],
            arm=s["arm"],
            stage=s["stage"],
            fingerprint=fingerprints[n],
            wireId=n,
        )
    )
data = []
for corpus in ("User04", "User05", "AB"):
    series = []
    for i, r in enumerate([r for r in hist + natural if r["corpus"] == corpus], 1):
        ms = r["messages"]
        params = r["params"]
        u = r["usage"]
        if corpus == "User04":
            ms = [{**m, "content": m["content"].encode("cp850").decode("utf8")} for m in ms]
        ids = tok.encode(
            tmpl.render(
                messages=ms,
                tools=None,
                add_generation_prompt=True,
                reasoning_effort=params.get("reasoning_effort"),
                clear_thinking=params.get("clear_thinking", False),
            ),
            add_special_tokens=False,
        ).ids
        assert len(ids) == u["prompt_tokens"], (corpus, i)
        assert isinstance(u.get("cached_tokens"), int)
        assert u["cached_tokens"] == u.get("prompt_tokens_details", {}).get("cached_tokens")
        if corpus == "User04":
            price = (
                (len(ids) - u["cached_tokens"]) * 0.15
                + u["cached_tokens"] * 0.03
                + u["completion_tokens"] * 0.50
            )
            assert abs(u["cost"] * 1_000_000 - price) < 1e-7
        here = dict(
            id=i,
            corpus=corpus,
            arm=r.get("arm"),
            stage=r.get("stage"),
            role=role(ms),
            input=len(ids),
            params=params,
            cache=u.get("cached_tokens"),
            nestedCache=(u.get("prompt_tokens_details") or {}).get("cached_tokens"),
            costPresent="cost" in u,
            cost=u.get("cost"),
            fingerprint=r.get("fingerprint"),
            time=r["created"],
        )
        cm = components(ms) if here["role"] == "N" else {}
        matches = [(prefix(prev_ids, ids), prev, comp) for prev, prev_ids, comp in series]

        def measure(hit):
            length, prev, comp = hit
            return dict(
                id=prev["id"],
                role=prev["role"],
                prefix=length,
                ageSeconds=round(here["time"] - prev["time"], 3),
                sincePriorEndSeconds=round(here["time"] - ends[prev["id"]]["at"] / 1000, 3)
                if corpus == "AB"
                else None,
                changedParams=sorted(
                    k for k in params.keys() | prev["params"].keys() if prev["params"].get(k) != params.get(k)
                ),
                changedParts=[k for k in cm if cm[k] != comp.get(k)] if comp and cm else None,
            )

        def best(matches):
            return measure(max(matches, key=lambda x: (x[0], x[1]["id"]))) if matches else None

        same = [x for x in matches if x[1]["role"] == here["role"]]
        here.update(
            previous=measure(matches[-1]) if matches else None,
            previousRole=measure(same[-1]) if same else None,
            bestSameRole=best(same),
            bestAny=best(matches),
        )
        data.append(here)
        series.append((here, ids, cm))
assert [sum(r["corpus"] == c for r in data) for c in ("User04", "User05", "AB")] == [124, 64, 86]
dest.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
for corpus in ("User04", "User05", "AB"):
    rows = [r for r in data if r["corpus"] == corpus]
    print(
        corpus,
        "positive",
        sum(r["cache"] > 0 for r in rows),
        "cost",
        sum(r["costPresent"] for r in rows),
        "mirror",
        sum(r["cache"] == r["nestedCache"] for r in rows),
    )
    for name in ("P", "N", "X", "B"):
        subset = [r for r in rows if r["role"] == name and r["bestSameRole"]]
        if subset:
            r = max(subset, key=lambda r: r["bestSameRole"]["prefix"])
            print(
                name,
                len(subset),
                r["id"],
                r["bestSameRole"]["id"],
                r["bestSameRole"]["prefix"],
                r["bestSameRole"]["ageSeconds"],
                r["cache"],
                "eligible",
                sum(x["bestSameRole"]["prefix"] >= 1000 for x in subset),
            )
