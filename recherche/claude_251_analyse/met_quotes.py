#!/usr/bin/env python3
"""List every met_evidence rejection of the paid replies (same selection as tally_runs.py) with the extractor's quote
and whether the same person entered the scene through another channel in the same reply."""
import gzip, json, glob, os, sys
base = sys.argv[1]
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    try:
        chat = [json.loads(l) for l in gzip.open(os.path.join(run, 'chat.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
        reqs = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    except Exception:
        continue
    n = sum(1 for r in reqs if r.get('kind') == 'start' and r.get('role') == 'narrator')
    idx = [i for i, m in enumerate(chat) if not m.get('is_user') and ((m.get('extra') or {}).get('avereth') or {}).get('extraction')]
    for i in (idx[-n:] if n else []):
        av = chat[i]['extra']['avereth']
        rej = [r for r in av.get('rejected') or [] if r.get('rule') == 'met_evidence']
        if not rej:
            continue
        raw = av['extraction'].get('raw') or {}
        entered = {e['d']['id'] for e in av.get('events', []) if e.get('t') == 'scene.entered'}
        for v in (raw.get('expected') or {}).values():
            for m in (v or {}).get('met') or []:
                if any(m['who'] + ':' in r['why'] for r in rej):
                    why = next(r['why'] for r in rej if m['who'] + ':' in r['why'])
                    print(f"{os.path.basename(run)} M{i} {m['who']} entered_otherwise={m['who'] in entered}\n   quote: {m['evidence'][:240]}\n   why:   {why.split(': ',1)[1][:120]}")
