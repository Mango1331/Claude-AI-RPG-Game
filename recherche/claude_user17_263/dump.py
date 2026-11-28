#!/usr/bin/env python3
"""Dump User17 chat turns: input, planner commands, outcome actions/auth, prose, extraction calls/raw, rejected, key events."""
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
lo, hi = int(sys.argv[2]), int(sys.argv[3])
KEY = ('scene.', 'place.', 'link.', 'passage', 'dungeon', 'time.advanced', 'pulse', 'delta.rejected', 'encounter', 'section', 'living', 'route', 'object.')
for i, m in enumerate(rows):
    if i < lo or i > hi: continue
    av = (m.get('extra') or {}).get('avereth') or {}
    print(f"\n===== [{i}] {'USER' if m.get('is_user') else 'NARR'} {m.get('name')}")
    if m.get('is_user'):
        print('INPUT:', m.get('mes'))
        for c in (av.get('interp') or {}).get('commands') or []: print('  CMD', json.dumps(c)[:600])
        for e in av.get('events') or []:
            if e['t'] == 'outcome.recorded':
                o = e['d']['outcome']
                for a in o.get('actions') or []: print('  ACT', a[:700])
                print('  AUTH.go', json.dumps((o.get('auth') or {}).get('go'))[:500]); print('  AUTH.gos', json.dumps((o.get('auth') or {}).get('gos'))[:800])
                print('  PULSE', json.dumps((o.get('auth') or {}).get('pulse'))[:300]); print('  expected', o.get('expected_keys'), 'dropped', o.get('dropped'))
            elif e['t'].startswith(KEY): print('  EV', json.dumps(e)[:500])
    else:
        print('PROSE:', (m.get('mes') or '')[:3000])
        x = av.get('extraction') or {}
        print('  X status', x.get('status'), 'repaired', x.get('repaired'), 'deltas', x.get('deltas'))
        for c in x.get('llm') or []: print('  XCALL', json.dumps(c)[:300])
        raw = x.get('raw') or {}
        if raw:
            print('  X.scene', raw.get('scene')); print('  X.expected', json.dumps(raw.get('expected'))[:800])
            for d in raw.get('deltas') or []: print('  X.delta', json.dumps(d)[:700])
        for r in av.get('rejected') or []: print('  REJ', json.dumps(r)[:600])
        for e in av.get('events') or []:
            if e['t'].startswith(KEY): print('  EV', json.dumps(e)[:600])
