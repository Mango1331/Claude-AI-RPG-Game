#!/usr/bin/env python3
"""Completion tokens split into reasoning and visible answer per role and model; answer chars of the raw response.
Usage: completion_parts.py <testrun_10b dir>"""
import gzip, json, glob, os, sys, statistics as st, collections
base = sys.argv[1]; d = collections.defaultdict(list)
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    try: reqs = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: continue
    start = {r['id']: (r.get('role'), (r.get('body') or {}).get('model')) for r in reqs if r.get('kind') == 'start'}
    for r in reqs:
        if r.get('kind') == 'end' and r.get('usage') and r['id'] in start:
            u = r['usage']; O = u.get('completion_tokens') or 0; R = (u.get('completion_tokens_details') or {}).get('reasoning_tokens') or 0
            d[start[r['id']]].append((O, R))
for (role, model), v in sorted(d.items()):
    if len(v) < 20: continue
    O = [o for o, r in v]; R = [r for o, r in v]; A = [o - r for o, r in v]
    print(f'{role:10s} {model:22s} n={len(v):3d} completion med {st.median(O):6.0f} | reasoning med {st.median(R):5.0f} ({sum(R)/max(1,sum(O)):.0%} of all) | answer med {st.median(A):5.0f}')
