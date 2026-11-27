#!/usr/bin/env python3
"""Extractor requests per narrator request by build in archived runs (requests.jsonl.gz). A repair has > 2 messages."""
import gzip, json, glob, os, sys, collections
base = sys.argv[1]; agg = collections.defaultdict(lambda: [0, 0, 0])
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    b = run.rsplit('-', 1)[-1]
    try: rows = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    except Exception: continue
    s = [r for r in rows if r.get('kind') == 'start']
    a = agg[b]; a[0] += sum(1 for r in s if r.get('role') == 'narrator'); a[1] += sum(1 for r in s if r.get('role') == 'extractor')
    a[2] += sum(1 for r in s if r.get('role') == 'extractor' and len(r['body']['messages']) > 2)
for b, (n, x, rep) in sorted(agg.items()):
    if n: print(b, 'N', n, 'X', x, 'X/N %.2f' % (x / n), 'repairs', rep)
