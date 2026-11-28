#!/usr/bin/env python3
"""Per-request prompt cache rates by role and route (model + provider policy), and a least-squares estimate of the
price of a cached against an uncached prompt token from cost_details. Usage: cache_per_request.py <testrun_10b dir>"""
import gzip, json, glob, os, sys, statistics as st, collections
base = sys.argv[1]
def load(p):
    try: return [json.loads(l) for l in gzip.open(p, 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: return []
rate = collections.defaultdict(list); pts = collections.defaultdict(list); tok = collections.defaultdict(lambda: [0, 0, 0, 0.0, 0.0])
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    reqs = load(os.path.join(run, 'requests.jsonl.gz')); start = {}
    for r in reqs:
        if r.get('kind') == 'start':
            b = r.get('body') or {}; start[r['id']] = (r.get('role'), b.get('model'), ','.join((b.get('provider') or {}).get('only') or ['?']), len(b.get('messages') or []))
    for r in reqs:
        if r.get('kind') != 'end' or not r.get('usage') or r['id'] not in start: continue
        role, model, prov, nmsg = start[r['id']]; u = r['usage']
        P = u.get('prompt_tokens') or 0; C = (u.get('prompt_tokens_details') or {}).get('cached_tokens') or 0; O = u.get('completion_tokens') or 0
        cd = u.get('cost_details') or {}
        key = f'{role}{" repair" if role == "extractor" and nmsg > 2 else ""} · {model} · {prov}'
        if P: rate[key].append(C / P)
        t = tok[key]; t[0] += P; t[1] += C; t[2] += O; t[3] += cd.get('upstream_inference_prompt_cost') or 0; t[4] += cd.get('upstream_inference_completions_cost') or 0
        if cd.get('upstream_inference_prompt_cost') is not None: pts[f'{model} · {prov}'].append((P - C, C, cd['upstream_inference_prompt_cost']))
print('per-request cache rate (cached/prompt):')
for k, v in sorted(rate.items()):
    v.sort(); zero = sum(1 for x in v if x == 0)
    t = tok[k]
    print(f' {k:60s} n={len(v):3d} med={st.median(v):.2f} p10={v[int(len(v)*.1)]:.2f} p90={v[int(len(v)*.9)]:.2f} misses(0)={zero:3d} '
          f'| sum prompt={t[0]} cached={t[1]} ({t[1]/max(1,t[0]):.0%}) completion={t[2]} | prompt cost {t[3]:.4f} completion cost {t[4]:.4f}')
print('\nleast squares prompt_cost = a*uncached + b*cached (USD per million tokens):')
for k, v in pts.items():
    s11 = sum(x * x for x, y, z in v); s22 = sum(y * y for x, y, z in v); s12 = sum(x * y for x, y, z in v)
    b1 = sum(x * z for x, y, z in v); b2 = sum(y * z for x, y, z in v); det = s11 * s22 - s12 * s12
    if det:
        a = (b1 * s22 - b2 * s12) / det; b = (s11 * b2 - s12 * b1) / det
        res = max(abs(a * x + b * y - z) for x, y, z in v)
        print(f' {k}: uncached {a*1e6:.4f} · cached {b*1e6:.4f} · ratio {b/a:.2f} · n={len(v)} · max residual {res:.2e} USD')
