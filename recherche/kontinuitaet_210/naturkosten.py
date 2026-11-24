"""Read-only, independent accounting across one common serial OpenRouter journal.
The journal can be supplied as one file or as disjoint exported subjournals.
"""
import argparse
from collections import Counter, defaultdict
from decimal import Decimal
import gzip
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('journals', nargs='+', type=Path)
parser.add_argument('--budget', default='5.00')
args = parser.parse_args()
requests = defaultdict(dict)
for path in args.journals:
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt', encoding='utf-8') as f:
        for line in f:
            record = json.loads(line)
            kind = record['kind']
            if kind not in ('start','end'):
                raise ValueError(f'Unexpected journal entry {kind}')
            pair = requests[record['id']]
            if kind in pair:
                raise ValueError(f'Duplicate {kind} for {record["id"]}')
            pair[kind] = record


def totals():
    return dict(physical=0, roles=Counter(), prompt=0, output=0, cached=0, reasoning=0,
                costUSD=Decimal(0), chargedOrReservedUSD=Decimal(0), usageRecords=0, refusals=[], upstreamMs=0, providers=set())


groups = defaultdict(totals)
previous_end = 0
for request_id, pair in sorted(requests.items(), key=lambda x: x[1]['start']['at']):
    s, e = pair['start'], pair['end']
    if s['at'] < previous_end:
        raise ValueError(f'Overlapping requests at {request_id}')
    previous_end = e['at']
    if e['at'] < s['at'] or (e['ok'] and not e.get('done')):
        raise ValueError(f'Unconfirmed completion at {request_id}')
    assert (s['arm'],s['turn'],s['role']) == (e['arm'],e['turn'],e['role'])
    turn = s['turn']
    if 700 < turn < 800 or (s['arm'] == 'A' and 0 < turn < 100):
        series = 'campaign'
    elif s['arm'] == 'B' and 901 <= turn <= 903:
        series = 'c19-continuation'
    elif s['arm'] == 'B' and 0 < turn < 100:
        series = 'pilot'
    else:
        series = f'focus-{turn}'
    group = groups[(s['arm'], series)]
    group['physical'] += 1
    group['roles'][s['role']] += 1
    group['upstreamMs'] += e['elapsedMs']
    group['chargedOrReservedUSD'] += Decimal(str(e['chargedOrReservedUSD']))
    if not e['ok']:
        if e.get('status') != 429 or e.get('reason') != 'upstream_http_error':
            raise ValueError(f'Unreviewed termination at {request_id}')
        # This is a completed HTTP rejection, not a measured generation or a zero-cost report.
        group['refusals'].append(dict(id=request_id,status=e['status'],turn=s['turn']))
        continue
    usage = e['usage']
    cost = Decimal(str(usage['cost']))
    details = usage.get('prompt_tokens_details') or {}
    output_details = usage.get('completion_tokens_details') or {}
    group['usageRecords'] += 1
    group['prompt'] += usage['prompt_tokens']
    group['output'] += usage['completion_tokens']
    group['cached'] += details['cached_tokens']
    group['reasoning'] += output_details['reasoning_tokens']
    group['costUSD'] += cost
    group['providers'].update(e['providers'])

cost = sum(g['costUSD'] for g in groups.values())
upper = sum(g['chargedOrReservedUSD'] for g in groups.values())
assert cost <= upper <= Decimal(args.budget)
print(json.dumps(dict(reportedCostUSD=str(cost), chargedOrReservedUSD=str(upper), physical=len(requests),
                      usageRecords=sum(g['usageRecords'] for g in groups.values()), peak=1 if requests else 0,
                      groups={f'{arm}.{run}':{**g,'costUSD':str(g['costUSD']),
                                             'chargedOrReservedUSD':str(g['chargedOrReservedUSD']),
                                             'providers':sorted(g['providers'])}
                              for (arm,run),g in groups.items()}), indent=2))
