#!/usr/bin/env python3
"""Second, stricter recount after the GPT counter-review (replaces the 'last N narrator replies' heuristic).

A reply counts when its prose is the REPLY of at least one physical extractor request archived in the same arm
(requests.jsonl.gz); every reply is counted once per arm. The model route is the one of that extractor request and of
the narrator message record. met_evidence rejections are deduplicated by their own delta.rejected event; whether the
person is present at the END of that reply record is reconstructed from the record's scene events after the rejection
(scene.entered / scene.left / scene.moved with reset_present). This is the state after the reply, not a full fold."""
import gzip, json, glob, os, sys, collections, hashlib

def load(p):
    try:
        with gzip.open(p, 'rt', encoding='utf8') as f:
            return [json.loads(l) for l in f.read().splitlines() if l.strip()]
    except FileNotFoundError:
        return []

base = sys.argv[1]
by_model = collections.defaultdict(collections.Counter)
rules = collections.Counter()
met_rows = []
seen_keys = set()
for run in sorted(glob.glob(os.path.join(base, 'openrouter-20261127-*'))):
    chat, reqs = load(os.path.join(run, 'chat.jsonl.gz')), load(os.path.join(run, 'requests.jsonl.gz'))
    xreq = [r for r in reqs if r.get('kind') == 'start' and r.get('role') == 'extractor']
    if not xreq:
        continue
    bodies = [(r['body'].get('model'), r['body']['messages'][1]['content'] if len(r['body']['messages']) > 1 else '', len(r['body']['messages'])) for r in xreq]
    name = os.path.basename(run)
    for i, m in enumerate(chat):
        av = ((m.get('extra') or {}).get('avereth') or {})
        x = av.get('extraction')
        if m.get('is_user') or not x or not m.get('mes', '').strip():
            continue
        probe = m['mes'].strip()[:300]
        hits = [b for b in bodies if probe in b[1]]
        if not hits:
            continue
        key = (name, hashlib.sha1(m['mes'].encode()).hexdigest())
        if key in seen_keys:
            continue
        seen_keys.add(key)
        model = hits[0][0] or (m.get('extra') or {}).get('model') or '?'
        c = by_model[model]
        c['replies'] += 1
        c['x_requests'] += len(hits)
        c['x_repair_requests'] += sum(1 for b in hits if b[2] > 2)
        if x.get('status') != 'applied': c['x_not_applied'] += 1
        if x.get('repaired'): c['replies_repaired'] += 1
        for r in av.get('rejected') or []: rules[r.get('rule')] += 1
        ev = av.get('events') or []
        for j, e in enumerate(ev):
            if e.get('t') != 'delta.rejected' or e['d'].get('rule') != 'met_evidence':
                continue
            met = (e['d'].get('item') or {}).get('met') or {}
            who = met.get('who')
            present = False
            for e2 in ev[j + 1:]:
                if e2.get('t') == 'scene.entered' and e2['d'].get('id') == who: present = True
                elif e2.get('t') == 'scene.left' and e2['d'].get('id') == who: present = False
                elif e2.get('t') == 'scene.moved' and e2['d'].get('reset_present'): present = False
            c['met_evidence_rejections'] += 1
            if not present: c['met_rejected_absent_at_end'] += 1
            met_rows.append((name, i, model, who, present, (met.get('evidence') or '')[:200], e['d'].get('reason', '')[:90]))

tot = collections.Counter()
for model, c in sorted(by_model.items()):
    print(model, dict(c)); tot.update(c)
print('TOTAL', dict(tot))
print('\nrejection rules (same selection):', ', '.join(f'{k} {v}' for k, v in rules.most_common()))
print('\nmet_evidence rejections (deduplicated by rejection event):')
for r in met_rows:
    print(f"  {r[0]} M{r[1]} [{r[2]}] {r[3]} present_at_end={r[4]}\n     quote: {r[5]}\n     why: {r[6]}")
