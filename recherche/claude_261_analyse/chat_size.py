#!/usr/bin/env python3
"""Share of each stored field in an archived chat (chat.jsonl.gz) and the largest event types."""
import gzip, json, sys, collections
rows = [json.loads(l) for l in gzip.open(sys.argv[1], 'rt').read().splitlines() if l.strip()]
c = collections.Counter(); ev = collections.Counter()
for m in rows[1:]:
    av = ((m.get('extra') or {}).get('avereth')) or {}
    c['mes'] += len(m.get('mes') or '')
    for k, v in av.items(): c['av.' + k] += len(json.dumps(v))
    for e in av.get('events') or []: ev[e.get('t')] += len(json.dumps(e))
    for k, v in (m.get('extra') or {}).items():
        if k != 'avereth': c['extra.' + k] += len(json.dumps(v))
    c['swipe_info'] += len(json.dumps(m.get('swipe_info') or [])); c['swipes'] += len(json.dumps(m.get('swipes') or []))
tot = sum(c.values()); print('total', tot)
for k, v in c.most_common(14): print(f'{v:9d} {v/tot:5.1%} {k}')
for k, v in ev.most_common(10): print(f'{v:9d} event {k}')
