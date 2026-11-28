#!/usr/bin/env python3
"""Does elapsed time of non-streamed planner/extractor requests depend on uncached prompt tokens, cached tokens and
completion (incl. reasoning) tokens? Least squares elapsed = c0 + a*uncached + b*cached + d*completion, per role and route.
Narrator is streamed; its time to first token is not in the journal. Usage: elapsed_vs_tokens.py <testrun_10b dir>"""
import gzip, json, glob, os, sys, statistics as st, collections
base = sys.argv[1]
def load(p):
    try: return [json.loads(l) for l in gzip.open(p, 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: return []
data = collections.defaultdict(list)
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    reqs = load(os.path.join(run, 'requests.jsonl.gz')); start = {}
    for r in reqs:
        if r.get('kind') == 'start': b = r.get('body') or {}; start[r['id']] = (r.get('role'), b.get('model'))
    for r in reqs:
        if r.get('kind') != 'end' or not r.get('usage') or r.get('elapsedMs') is None or r['id'] not in start: continue
        role, model = start[r['id']]; u = r['usage']
        P = u.get('prompt_tokens') or 0; C = (u.get('prompt_tokens_details') or {}).get('cached_tokens') or 0; O = u.get('completion_tokens') or 0
        data[(role, model)].append((P - C, C, O, r['elapsedMs'] / 1000))
def solve(A, y):
    n = len(A[0]); M = [[sum(a[i] * a[j] for a in A) for j in range(n)] for i in range(n)]; v = [sum(a[i] * yy for a, yy in zip(A, y)) for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i])); M[i], M[p] = M[p], M[i]; v[i], v[p] = v[p], v[i]
        if abs(M[i][i]) < 1e-12: return None
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]; M[r] = [a - f * b for a, b in zip(M[r], M[i])]; v[r] -= f * v[i]
    return [v[i] / M[i][i] for i in range(n)]
for (role, model), v in sorted(data.items()):
    if len(v) < 25 or role == 'narrator': continue
    A = [(1, u / 1000, c / 1000, o / 1000) for u, c, o, e in v]; y = [e for *_, e in v]
    k = solve(A, y)
    if not k: continue
    pred = [sum(a * b for a, b in zip(row, k)) for row in A]; my = st.mean(y)
    r2 = 1 - sum((a - b) ** 2 for a, b in zip(y, pred)) / sum((a - my) ** 2 for a in y)
    lo = [e for u, c, o, e in v if c / max(1, u + c) < .3]; hi = [e for u, c, o, e in v if c / max(1, u + c) >= .7]
    print(f'{role:9s} {model:22s} n={len(v):3d} elapsed med {st.median(y):.2f}s | s per 1k: uncached {k[1]:+.3f} cached {k[2]:+.3f} completion {k[3]:+.3f} const {k[0]:+.2f} R2={r2:.2f}'
          f' | med elapsed cache<30%: {st.median(lo) if lo else float("nan"):.2f}s (n={len(lo)}) cache>=70%: {st.median(hi) if hi else float("nan"):.2f}s (n={len(hi)})')
