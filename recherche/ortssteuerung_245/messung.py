"""Recompute per-arm costs and timings from archived physical receipts, including failed turns."""
from collections import Counter
from decimal import Decimal
from pathlib import Path
from statistics import median
import gzip
import json

root = Path(__file__).resolve().parents[2] / 'testrun_10b'
def read(path):
    return [json.loads(line) for line in gzip.open(path, 'rt') if line.strip()] if path.exists() else []

def roles(receipts):
    result = {}
    for role in sorted({r['role'] for r in receipts}):
        rows = [r for r in receipts if r['role'] == role]
        result[role] = dict(requests=len(rows), input=sum(r['usage']['prompt_tokens'] for r in rows),
                            output=sum(r['usage']['completion_tokens'] for r in rows),
                            medianMs=median(r['elapsedMs'] for r in rows))
    return result

runs = {}
physical = []
for p in sorted(root.glob('openrouter-20261127-*-*')):
    if not p.name.split('-')[-1].isdigit() or int(p.name.split('-')[-1]) < 241:
        continue
    m=json.loads((p / 'SOURCE_MANIFEST.json').read_text())
    receipts=[r for r in read(p / 'requests.jsonl.gz') if r['kind']=='end']
    cost=sum((Decimal(str(r['cost'])) for r in receipts),Decimal(0))
    assert cost == Decimal(m['costUSD'])
    physical.extend(receipts)
    if int(p.name.split('-')[-1]) < 245:
        continue
    turns=read(p / 'turns.jsonl.gz')
    elapsed=[t['timing']['marks']['ready']-t['timing']['marks']['click'] for t in turns
             if {'ready','click'} <= t.get('timing',{}).get('marks',{}).keys()]
    runs[p.name] = dict(commit=m['commit'],actions=len(read(p/'actions.jsonl.gz')),
                        verifiedTurns=len(turns),savedMessages=m['savedMessages'],
                        costUSD=str(cost),byRole=roles(receipts),medianReadyMs=median(elapsed) if elapsed else None)
total=sum((Decimal(str(r['cost'])) for r in physical),Decimal(0))
print(json.dumps(dict(runs=runs,requests=len(physical),byRole=roles(physical),costUSD=str(total),
                      newCostUSD=str(total-Decimal('0.125032072')),remainingUSD=str(1-total)),indent=2))
