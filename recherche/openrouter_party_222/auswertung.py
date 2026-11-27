"""Summarize and verify the archived physical requests. No network or credentials."""
import gzip
import hashlib
import json
from collections import Counter
from decimal import Decimal
from pathlib import Path

root = Path(__file__).resolve().parents[2] / "testrun_10b"
runs = sorted(root.glob("openrouter-20261127-*-*"), key=lambda p: (len(p.name.split("-")[-2]), p.name))
used = set()
generations = set()
total = Counter()
for run in runs:
    manifest = json.loads((run / "SOURCE_MANIFEST.json").read_text())
    for file, digest in manifest["sha256"].items():
        assert hashlib.sha256((run / file).read_bytes()).hexdigest() == digest, (run, file)
    rows = [json.loads(line) for line in gzip.decompress((run / "requests.jsonl.gz").read_bytes()).splitlines()]
    starts = {r["id"]: r for r in rows if r["kind"] == "start"}
    ends = [r for r in rows if r["kind"] == "end"]
    assert len(rows) == 2 * len(starts) == 2 * len(ends)
    assert not used.intersection(starts)
    used.update(starts)
    sub = Counter()
    for end in ends:
        start = starts.pop(end["id"])
        assert start["arm"] == end["arm"] and end["cost"] is not None
        raw = gzip.decompress((run / Path(end["rawFile"]).name).read_bytes()).decode()
        if start["body"].get("stream"):
            frames = [json.loads(line[6:]) for line in raw.splitlines()
                      if line.startswith("data: ") and line[6:].strip() != "[DONE]"]
        else:
            frames = [json.loads(raw)]
        usage = next(frame["usage"] for frame in reversed(frames) if frame.get("usage"))
        generation = next(frame["id"] for frame in frames if frame.get("id"))
        assert generation == end["generationId"] and generation not in generations
        assert usage == end["usage"] and Decimal(str(usage["cost"])) == Decimal(str(end["cost"]))
        generations.add(generation)
        role = end["role"]
        body = start["body"]["messages"]
        repair = any(m["role"]=="user" and ("Your answer was not valid:" in m["content"] or "previous answer was invalid" in m["content"]) for m in body)
        sub[role] += 1
        sub["repairs"] += int(repair)
        sub["ms"] += end["elapsedMs"]
        sub["usd"] += Decimal(str(end["cost"]))
        for k in ["prompt_tokens","completion_tokens","total_tokens"]:
            sub[k] += end["usage"].get(k,0)
        sub["reasoning"] += (end["usage"].get("completion_tokens_details") or {}).get("reasoning_tokens",0)
        sub["requests"] += 1
    assert not starts and sub["usd"] == Decimal(manifest["costUSD"])
    assert sub["requests"] == manifest["requests"]
    assert all(sub[k] == v for k,v in manifest["usage"].items())
    print(run.name, json.dumps(sub, default=str, sort_keys=True))
    total.update(sub)
print("SUMME", json.dumps(total, default=str, sort_keys=True))
