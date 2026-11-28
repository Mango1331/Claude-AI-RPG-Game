#!/usr/bin/env python3
"""creature.new outcomes in arm-own replies of archived runs: accepted deltas vs rejections and their reasons.
Usage: creature_rejections.py <testrun_10b dir> [glob]"""
import gzip, json, glob, os, sys, collections
base = sys.argv[1]; pat = sys.argv[2] if len(sys.argv) > 2 else 'openrouter-20261127-*'
acc = 0; rej = collections.Counter(); ex = []
for run in sorted(glob.glob(os.path.join(base, pat))):
    p = os.path.join(run, 'chat.jsonl.gz'); p0 = os.path.join(run, 'chat-0.jsonl.gz')
    if not os.path.exists(p): continue
    chat = [json.loads(l) for l in gzip.open(p, 'rt').read().splitlines() if l.strip()]
    start = sum(1 for l in gzip.open(p0, 'rt') if l.strip()) if os.path.exists(p0) else 1
    for m in chat[start:]:
        av = ((m.get('extra') or {}).get('avereth')) or {}
        raw = (av.get('extraction') or {}).get('raw') or {}
        for d in raw.get('deltas') or [] if isinstance(raw, dict) else []:
            if d.get('type') == 'creature.new': acc += 1
        for r in av.get('rejected') or []:
            if r.get('type') == 'creature.new':
                why = str(r.get('why') or '')
                k = 'population/life_stage' if ('population' in why or 'life_stage' in why) else (r.get('rule') or '?')
                rej[k] += 1; ex.append((os.path.basename(run), why[:140]))
print('creature.new reported by the extractor (arm-own replies):', acc)
print('creature.new rejected:', dict(rej))
for e in ex[:12]: print('  ', e)
