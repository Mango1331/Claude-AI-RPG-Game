#!/usr/bin/env python3
"""Per-turn latency against the number of physical extractor requests of that turn (archived openrouter runs).
Clocks: turns.jsonl marks and world job times share the browser page clock (performance.now); requests carry epoch 'at'.
The world job begins when the narrator message is received, so narrator end ~= worldCommit - extraction_validation_wait_ms.
Usage: turn_latency_by_x.py <testrun_10b dir> [glob]"""
import gzip, json, glob, os, sys, statistics as st, collections
base = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else 'openrouter-20261127-*'
def load(p):
    try: return [json.loads(l) for l in gzip.open(p, 'rt').read().splitlines() if l.strip()]
    except FileNotFoundError: return []
rows = []
for run in sorted(glob.glob(os.path.join(base, pat))):
    turns = load(os.path.join(run, 'turns.jsonl.gz')); reqs = load(os.path.join(run, 'requests.jsonl.gz'))
    if not turns: continue
    starts = collections.defaultdict(list); ends = {}
    for r in reqs:
        if r.get('kind') == 'start': starts[r.get('turn')].append(r)
        elif r.get('kind') == 'end': ends[r.get('id')] = r
    for t in turns:
        m = (t.get('timing') or {}).get('marks') or {}; w = (t.get('timing') or {}).get('world') or {}
        if m.get('click') is None or m.get('ready') is None: continue
        rs = starts.get(t.get('n'), [])
        roles = collections.Counter(r.get('role') for r in rs)
        xs = [r for r in rs if r.get('role') == 'extractor']
        xdur = [ends[r['id']].get('elapsedMs') for r in xs if r['id'] in ends and ends[r['id']].get('elapsedMs') is not None]
        narr = [r for r in rs if r.get('role') == 'narrator']
        nend = max((ends[r['id']]['at'] for r in narr if r['id'] in ends), default=None)
        xend = max((ends[r['id']]['at'] for r in xs if r['id'] in ends), default=None)
        row = dict(run=os.path.basename(run), n=t.get('n'), x=len(xs), roles=dict(roles), click_ready=(m['ready'] - m['click']) / 1000,
                   first=(m['firstProse'] - m['click']) / 1000 if m.get('firstProse') else None,
                   wait=(w.get('extraction_validation_wait_ms') or 0) / 1000 if w else None,
                   save=(w.get('save_readback_ms') or 0) / 1000 if w else None,
                   last_after_commit=(m['lastRenderedChange'] - m['worldCommit']) / 1000 if m.get('lastRenderedChange') and m.get('worldCommit') else None,
                   last_ready=(m['ready'] - m['lastRenderedChange']) / 1000 if m.get('lastRenderedChange') else None,
                   xdur=sum(xdur) / 1000 if xdur else None, nend_to_xend=(xend - nend) / 1000 if xend and nend else None)
        if m.get('worldCommit') is not None and w.get('extraction_validation_wait_ms') is not None:
            row['post_narr'] = (m['ready'] - (m['worldCommit'] - w['extraction_validation_wait_ms'])) / 1000
        else: row['post_narr'] = None
        rows.append(row)
def s(v):
    v = sorted(x for x in v if x is not None)
    if not v: return 'n=0'
    q = lambda p: v[min(len(v) - 1, int(len(v) * p))]
    return f"n={len(v):3d} med={st.median(v):5.1f} p75={q(.75):5.1f} p90={q(.9):5.1f}"
print('ALL turns with marks:', len(rows))
print('lastRenderedChange after worldCommit (s):', s([r['last_after_commit'] for r in rows]),
      '· share after commit: %.0f%%' % (100 * sum(1 for r in rows if (r['last_after_commit'] or -1) > 0) / max(1, sum(1 for r in rows if r['last_after_commit'] is not None))))
print('ready - lastRenderedChange:', s([r['last_ready'] for r in rows]))
print('save/readback:', s([r['save'] for r in rows]))
for label, f in [('narrated (narrator request)', lambda r: r['roles'].get('narrator')), ('no narrator request', lambda r: not r['roles'].get('narrator'))]:
    g = [r for r in rows if f(r)]
    print(f'\n== {label}: {len(g)} turns')
    for k in sorted(set(r['x'] for r in g)):
        h = [r for r in g if r['x'] == k]
        print(f' X={k}: click→ready {s([r["click_ready"] for r in h])} | narrator end→ready {s([r["post_narr"] for r in h])} | X wait {s([r["wait"] for r in h])} | X elapsed sum {s([r["xdur"] for r in h])}')
    print('  click→firstProse', s([r['first'] for r in g]))
if '--rows' in sys.argv:
    for r in rows: print(r)
