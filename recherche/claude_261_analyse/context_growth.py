#!/usr/bin/env python3
"""Prompt part sizes at the quartiles of a run: extractor user part and catalog, planner user part, narrator total."""
import gzip, json, sys, os
for run in sys.argv[1:]:
    rows = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    st = [r for r in rows if r.get('kind') == 'start']
    xs = [r for r in st if r.get('role') == 'extractor' and len(r['body']['messages']) == 2]
    ps = [r for r in st if r.get('role') == 'planner']; ns = [r for r in st if r.get('role') == 'narrator']
    u = lambda r: len(r['body']['messages'][1]['content'])
    def cat(r):
        c = r['body']['messages'][1]['content']; cut = [k for k in (c.find('PLAYER MESSAGE'), c.find('NARRATOR REPLY')) if k > 0]
        return len(c[:min(cut or [len(c)])])
    ntot = lambda r: sum(len(m['content']) for m in r['body']['messages'] if isinstance(m['content'], str))
    q = lambda L, f: [f(L[k]) for k in (0, len(L)//4, len(L)//2, 3*len(L)//4, len(L)-1)] if L else []
    print(os.path.basename(run), 'X user', q(xs, u), 'X catalog', q(xs, cat), 'P user', q(ps, u), 'N total', q(ns, ntot), 'N msgs', q(ns, lambda r: len(r['body']['messages'])))
