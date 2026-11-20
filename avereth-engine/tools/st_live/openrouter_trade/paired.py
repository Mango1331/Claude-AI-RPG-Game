"""Derive paired deltas, not differences between unpaired group medians. No network access."""
import json
from pathlib import Path
from statistics import median, mean
import sys
from decimal import Decimal
root=Path(sys.argv[1])
audit=json.loads((root/'audit.json').read_text())
rows=audit['metrics']
fields=['firstMs','narrationMs','commitMs','saveMs','safeMs','input','output','reasoning','cache','requests','repairs','cost']
groups={}
for arm in 'AB':
    group=[r for r in rows if r['arm']==arm]
    groups[arm]={}
    for k in fields:
        values=[r[k] for r in group if r.get(k) is not None]
        groups[arm][k]={'n':len(values),'sum':sum(values),'median':median(values) if values else None,'mean':mean(values) if values else None}
pairs={}
for n in sorted({r['pair'] for r in rows}):
    arms={r['arm']:r for r in rows if r['pair']==n}
    if len(arms)!=2:continue
    a,b=arms['A'],arms['B']
    assert a['source']==b['source'] and a['sourceEvents']==b['sourceEvents']
    pairs[n]={k:b[k]-a[k] for k in fields if a.get(k) is not None and b.get(k) is not None}
paired={}
for k in fields:
    values=[p[k] for p in pairs.values() if k in p]
    paired[k]={'n':len(values),'median':median(values) if values else None}
settled=Decimal('0.001771268')+Decimal(str(json.loads((root/'prior-settlement.json').read_text())['total_cost']))
carried=json.loads((root/'earlier-attempts.json').read_text()) if (root/'earlier-attempts.json').exists() else []
prior=sum(Decimal(str(r['total_cost'])) for r in carried)
current=sum(Decimal(str(r['cost'])) for r in audit['intervals'] if r.get('cost') is not None)
(root/'paired.json').write_text(json.dumps(dict(groups=groups,pairs=pairs,paired=paired,newRequests=len(carried)+len(audit['intervals']),
    cumulativeRequests=9+len(carried)+len(audit['intervals']),confirmedNewUSD=str(prior+current),confirmedTotalUSD=str(settled+prior+current)),indent=2)+'\n')
# Expose failed attempts and a conservative ceiling alongside the settled rows.
path=root/'paired.json'
out=json.loads(path.read_text())
ledger=[json.loads(l) for l in (root/'physical.jsonl').read_text().splitlines()]
accounted={i for r in rows for i in r['physical']}
out['additionalTradeAttempts']=[i for i in audit['intervals'] if i['stage']=='trade' and i['id'] not in accounted]
out['unreportedReserveUSD']=str(sum(Decimal(r['chargedOrReservedUSD']) for r in ledger if r['kind']=='end' and (r.get('usage') or {}).get('cost') is None))
out['confirmedPlusOpenReserveUSD']=str(Decimal(out['confirmedTotalUSD'])+Decimal(out['unreportedReserveUSD']))
path.write_text(json.dumps(out,indent=2)+'\n')
