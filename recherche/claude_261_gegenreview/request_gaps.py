#!/usr/bin/env python3
"""Epoch gaps inside a turn from the provider journal: planner end -> narrator start, narrator end -> first extractor start,
extractor end -> repair start. Also which runs lack the firstProse mark. Usage: request_gaps.py <testrun_10b dir>"""
import gzip, json, glob, os, sys, statistics as st, collections
base = sys.argv[1]
def load(p):
    try: return [json.loads(l) for l in gzip.open(p, 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: return []
gap = collections.defaultdict(list); nofp = collections.Counter(); withfp = collections.Counter()
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    reqs = load(os.path.join(run, 'requests.jsonl.gz')); turns = load(os.path.join(run, 'turns.jsonl.gz'))
    for t in turns:
        m = (t.get('timing') or {}).get('marks') or {}
        if m.get('click') is None: continue
        (withfp if m.get('firstProse') else nofp)[os.path.basename(run).split('-')[-1]] += 1
    by = collections.defaultdict(list)
    for r in reqs: by[(r.get('turn'), r.get('id'))].append(r)
    turns_ = collections.defaultdict(list)
    for (turn, i), rs in by.items():
        s = next((r for r in rs if r['kind'] == 'start'), None); e = next((r for r in rs if r['kind'] == 'end'), None)
        if s and e: turns_[turn].append((s['at'], e['at'], s['role'], e.get('elapsedMs')))
    for turn, rs in turns_.items():
        rs.sort()
        for a, b in zip(rs, rs[1:]):
            gap[f'{a[2]} end -> {b[2]} start'].append((b[0] - a[1]) / 1000)
        n = [r for r in rs if r[2] == 'narrator']
        if n: gap['narrator elapsed (journal)'].append((n[0][1] - n[0][0]) / 1000)
        p = [r for r in rs if r[2] == 'planner']
        if p: gap['planner elapsed (journal)'].append((p[0][1] - p[0][0]) / 1000)
for k, v in sorted(gap.items()):
    v.sort(); print(f'{k:40s} n={len(v):3d} med={st.median(v):6.2f}s p10={v[int(len(v)*.1)]:6.2f} p90={v[int(len(v)*.9)]:6.2f}')
print('firstProse mark present by build:', dict(withfp)); print('firstProse mark missing by build:', dict(nofp))
