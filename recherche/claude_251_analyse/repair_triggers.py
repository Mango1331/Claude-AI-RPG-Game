#!/usr/bin/env python3
"""Classify the triggers of paid extractor repair requests in archived runs (requests.jsonl.gz).
A repair request is an extractor request with more than two messages; its last user message lists the errors."""
import gzip, json, glob, re, collections, os, sys

base = sys.argv[1]
pattern = sys.argv[2] if len(sys.argv) > 2 else 'openrouter-20261127-*'
cat = collections.Counter(); ex = collections.defaultdict(list); n = 0; perreq = collections.Counter()
for run in sorted(glob.glob(os.path.join(base, pattern))):
    try:
        rows = [json.loads(l) for l in gzip.open(os.path.join(run, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
    except Exception:
        continue
    for r in rows:
        if r.get('kind') != 'start' or r.get('role') != 'extractor':
            continue
        msgs = r['body']['messages']
        if len(msgs) <= 2:
            continue
        last = msgs[-1]['content']
        n += 1
        m = re.search(r'Your answer was not valid: (.*?)\. Answer again', last, re.S)
        if not m:
            k = 'empty answer / no JSON' if ('empty' in last or 'no JSON' in last) else 'other: ' + last[:60]
            cat[k] += 1; perreq[k] += 1
            continue
        kinds = set()
        for e in re.split(r'; (?=\$|expected key|Movement)', m.group(1)):
            if 'arrival must come before' in e or 'explicitly name this earlier scene' in e or 'requires a corresponding arrive' in e: k = 'semantic: travel chronology/scene'
            elif 'not established as present' in e: k = 'semantic: trade counterparty not present'
            elif 'party.quote' in e or 'party.agreement' in e: k = 'semantic: party quote/agreement'
            elif re.search(r'pricing|phase|\.said|money|priced is true|trade_settlement|bid', e): k = 'semantic: price/money wording'
            elif 'is known, last at' in e: k = 'semantic: known person continuity'
            elif 'Movement completeness' in e: k = 'semantic: movement completeness'
            elif 'depends_on' in e: k = 'semantic: depends_on'
            elif 'reserved encounter' in e or 'seen through an opening' in e: k = 'semantic: dungeon threshold sighting'
            elif 'population' in e: k = 'semantic: creature population'
            elif 'not answered' in e: k = 'schema: expected key missing'
            elif 'missing required' in e: k = 'schema: missing field'
            elif 'unexpected property' in e: k = 'schema: extra field'
            elif 'needs a "type"' in e: k = 'schema: delta without type'
            elif 'matches none of anyOf' in e or 'not one of' in e or 'must be one of' in e or 'unknown catalog id' in e or 'unknown type' in e: k = 'schema: unknown id / enum / type / place ref'
            elif 'must be' in e or 'expected ' in e: k = 'schema: wrong value type'
            else: k = 'other'
            kinds.add(k); ex[k].append((os.path.basename(run), e[:220]))
        for k in kinds:
            cat[k] += 1
        perreq['semantic-only' if all(k.startswith('semantic') for k in kinds) else ('schema-only' if all(k.startswith('schema') for k in kinds) else 'mixed')] += 1
print('extractor repair/recovery requests:', n)
print('per request:', dict(perreq))
for k, v in cat.most_common():
    print(f'{v:4d} {k}')
