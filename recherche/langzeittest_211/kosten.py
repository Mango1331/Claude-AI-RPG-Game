"""Verify the single physical slot and reconcile reservations and actual provider usage."""
import json
from decimal import Decimal
from rollen import physical_role
from collections import defaultdict,Counter
from pathlib import Path
import sys
base=Path(sys.argv[1])
active=None
stats=defaultdict(lambda: dict(sends=0,completed=0,http_errors=[],usage_records=0,input=0,output=0,cache=0,reasoning=0,cost=Decimal(0),reserved=Decimal(0),roles=Counter()))
total=Decimal(0)
max_exposure=Decimal(0)
routes=Counter()
for line in (base/'physical.jsonl').read_text().splitlines():
    r=json.loads(line)
    k=stats[r['arm']]
    if r['kind']=='start':
        assert active is None,(active,r['id'])
        active=r['id']
        k['sends']+=1
        k['roles'][physical_role(r)]+=1
        max_exposure=max(max_exposure,total+Decimal(r['reserveUSD']))
        assert max_exposure<=Decimal('5.00')
        routes[tuple(r['body']['provider']['order'])]+=1
    else:
        assert r['kind']=='end' and active==r['id']
        active=None
        exposure=Decimal(r['chargedOrReservedUSD'])
        total+=exposure
        usage=r.get('usage') or {}
        if 'cost' in usage and usage['cost'] is not None:
            cost=Decimal(str(usage['cost']));assert exposure>=cost
            k['cost']+=cost
            k['usage_records']+=1
        else:cost=Decimal(0)
        k['reserved']+=exposure-cost
        if r['ok']:k['completed']+=1
        else:k['http_errors'].append([r['id'],r.get('status'),r.get('reason')])
        for field,target in [('prompt_tokens','input'),('completion_tokens','output')]:k[target]+=usage.get(field) or 0
        k['cache']+=(usage.get('prompt_tokens_details') or {}).get('cached_tokens') or 0
        k['reasoning']+=(usage.get('completion_tokens_details') or {}).get('reasoning_tokens') or 0
assert active is None,'an outstanding request has not closed'
print(json.dumps(dict(arms=stats,physical_requests=sum(x['sends'] for x in stats.values()),routes={','.join(k):v for k,v in routes.items()},
 max_concurrent=1 if stats else 0,known_cost=sum(k['cost'] for k in stats.values()),outstanding_cost_reserve=sum(k['reserved'] for k in stats.values()),charged_or_reserved=total,max_exposure_before_send=max_exposure,limit='5.00'),default=str,indent=2))
