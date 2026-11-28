"""Rebuild the paired physical request and browser timing summary, from the four saved arms."""
import collections
from decimal import Decimal
import gzip
import hashlib
import json
from pathlib import Path
import statistics

base = Path(__file__).resolve().parent
def rows(path):
    with gzip.open(path, 'rt') as stream:
        return [json.loads(line) for line in stream if line.strip()]
def median(values):
    return round(statistics.median(values), 3) if values else None
for arm in ['Base', 'Candidate']:
    costs = Decimal(0)
    roles, usage = collections.Counter(), collections.Counter()
    latency, redraw, save, x_wait = [], [], [], []
    turns = narrated = 0
    for name in [arm, arm+'Fight']:
        path = base/name
        manifest = json.loads((path/'SOURCE_MANIFEST.json').read_text())
        for f,h in manifest['sha256'].items():
            assert hashlib.sha256((path/f).read_bytes()).hexdigest()==h
        events = rows(path/'requests.jsonl.gz')
        starts = [r for r in events if r['kind']=='start']
        ends = [r for r in events if r['kind']=='end']
        assert [r['id'] for r in starts] == [r['id'] for r in ends]
        assert all(r['ok'] for r in ends)
        roles.update(r['role'] for r in ends)
        for r in ends:
            costs += Decimal(str(r['cost']))
            for k in ['prompt_tokens','completion_tokens','total_tokens']:
                usage[k] += r['usage'][k]
        for t in rows(path/'turns.jsonl.gz'):
            turns += 1
            if not any(r['role']=='narrator' and r['turn']==t['n'] for r in starts):continue
            narrated += 1
            m = t['timing']['marks']
            w = t['timing']['world']
            if 'worldCommit' in m and 'extraction_validation_wait_ms' in w:
                latency.append((m['ready']-m['worldCommit']+w['extraction_validation_wait_ms'])/1000)
                x_wait.append(w['extraction_validation_wait_ms']/1000)
                redraw.append((m['lastRenderedChange']-m['worldCommit'])/1000)
                save.append(w['save_readback_ms']/1000)
    print(json.dumps(dict(arm=arm,inputs=turns,narrated=narrated,roles=roles,usage=usage,costUSD=str(costs),
                    x_per_narrated=round(roles['extractor']/narrated,3),timed=len(latency),
                    median_seconds={'after_narrator':median(latency),'world_validation':median(x_wait),
                    'last_render_minus_commit':median(redraw),'save_readback':median(save)})))
