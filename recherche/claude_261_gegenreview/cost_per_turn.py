#!/usr/bin/env python3
"""Provider cost per narrated turn by model route over archived runs (sum of journal 'cost'). Usage: cost_per_turn.py <dir>"""
import gzip, json, glob, os, sys, collections
base = sys.argv[1]; agg = collections.defaultdict(lambda: [0.0, 0, 0])
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    try: reqs = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: continue
    model = {r['id']: (r.get('body') or {}).get('model') for r in reqs if r.get('kind') == 'start'}
    role = {r['id']: r.get('role') for r in reqs if r.get('kind') == 'start'}
    for r in reqs:
        if r.get('kind') == 'end' and r['id'] in model:
            a = agg[model[r['id']]]; a[0] += r.get('cost') or 0; a[1] += role[r['id']] == 'narrator'; a[2] += 1
for m, (c, n, k) in sorted(agg.items()):
    if n: print(f'{m:24s} narrated turns {n:3d} requests {k:3d} cost {c:.4f} USD = {1000*c/n:.2f} USD per 1000 turns')
