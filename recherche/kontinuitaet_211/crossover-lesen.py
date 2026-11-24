"""Lese zwei Offlineergebnisse; die Bezugsdateien werden nie verändert."""
import argparse
import collections
import gzip
import json


def load(path):
    with gzip.open(path, "rt", encoding="utf-8") as stream:
        return json.load(stream)


def historical(data):
    for category in ("cases", "accepted", "controls"):
        for name, row in data["historical"][category].items():
            yield f"{category}/{name}", row["primary"]["hash"], [
                (sub["id"], sub.get("reply", {}).get("hash")) for sub in row["following"]
            ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference")
    parser.add_argument("candidate")
    args = parser.parse_args()
    a, b = load(args.reference), load(args.candidate)
    print(a["arm"], b["arm"])
    for mode in ("independent", "chain"):
        counts = collections.Counter()
        changes = []
        world_deltas = []
        issues = []
        for name, series in a["runs"].items():
            other = b["runs"][name]
            assert series["sourceHash"] == other["sourceHash"]
            for left, right in zip(series["rows"], other["rows"], strict=True):
                x, y = left[mode], right[mode]
                tag = name + str(left["n"])
                counts["rows"] += 1
                if not x or not y or not x["routeCovered"] or not y["routeCovered"] or any(
                    d["missing"] for row in (x, y) for d in row["diagnostics"]
                ):
                    issues.append(tag)
                    continue
                assert x["reload"] and y["reload"]
                counts["paired"] += 1
                counts["extra_archived_calls"] += sum(len(d["unused"]) for d in y["diagnostics"])
                if x["state"]["hash"] != y["state"]["hash"]:
                    world_deltas.append(tag)
                for key, original in x["criteria"].items():
                    candidate = y["criteria"][key]
                    counts[f"{original}->{candidate}"] += 1
                    if candidate != original:
                        changes.append((tag, original, candidate, key))
        print(mode, dict(counts))
        print("Weltunterschiede", ", ".join(world_deltas))
        print("Antwortabdeckung offen", ", ".join(issues))
        for change in changes:
            print(*change, sep=" | ")
    for h, k in zip(historical(a), historical(b), strict=True):
        assert h[0] == k[0]
        if h != k:
            print("Altarchiv Welt/Folgewelt geändert", h[0])
    for h, k in zip(a["board"], b["board"], strict=True):
        print("User11", h["message"], h["criteria"], "=>", k["criteria"])


if __name__ == "__main__":
    main()
