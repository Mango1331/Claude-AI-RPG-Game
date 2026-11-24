"""Summarise actual opportunities, raw planner frames, timing and repeated roles from exported run archives."""
from collections import Counter
from decimal import Decimal
import gzip
import json
from pathlib import Path
from statistics import median
import sys

def read(path):
    data=path.read_bytes()
    return gzip.decompress(data) if path.suffix=='.gz' else data
def obj(path): return json.loads(read(path))
def rows(path): return [json.loads(line) for line in read(path).splitlines()]
def describe(values):
    return {'n':len(values),'median':median(values) if values else None,'min':min(values,default=None),'max':max(values,default=None),'sum':sum(values)}
def planner_frames(folder,journal):
    replies={r['id']:r for r in rows(folder/'provider-originalantworten.jsonl.gz')}
    frames=Counter()
    for r in journal:
        if r['kind']!='end' or r['role']!='planner' or not r['ok']:continue
        try:
            msg=json.loads(replies[r['id']]['body'])['choices'][0]['message']['content']
            parsed=json.loads(msg)
            if 'travel_frame' not in parsed:label='absent'
            else:
                value=parsed['travel_frame']
                label='object' if isinstance(value,dict) else ('null' if value is None else str(value).lower())
        except (KeyError,TypeError,ValueError):label='not_plain_json'
        frames[label]+=1
    return dict(frames)
def metrics(folder):
    m=obj(folder/'messwerte.json')
    turns=obj(folder/'zugauswertung.json.gz')
    timings=obj(folder/'browserzeiten.json')
    wire=rows(folder/'provider-journal.jsonl.gz')
    by_class={}
    for key,types in {
        'arrival':['arrive'], 'person':['person.new','person.named','enter','leave'],
        'knowledge':['learn','memory'], 'property':['object.new','object.move','object.split','object.consume','object.transform'],
        'trade':['offer','bid','coin.gift'],
    }.items():
        observed=[];refused=[]
        for t in turns:
            x=t.get('reported') or {}
            if not isinstance(x,dict):continue
            if any(d.get('type') in types for d in x.get('deltas',[])):
                observed.append(t['turn'])
                if any(r.get('type') in types for r in t.get('rejected',[])):refused.append(t['turn'])
        by_class[key]={'with_report':observed,'with_rejection_among_these':refused}
    main_narrated=sum(isinstance(t.get('extractor'),dict) and t['extractor'].get('status')=='applied' for t in turns)
    confirmations=m['confirmed_st_turns']
    readbacks=[t['timing']['world']['save_readback_ms'] for t in timings if isinstance((t['timing'].get('world') or {}).get('save_readback_ms'),(float,int))]
    firsts=[t['T4_ms']['firstProse'] for t in turns if t.get('extractor',{}).get('status')=='applied' and t['T4_ms'].get('firstProse') is not None]
    ready=[t['T4_ms']['ready'] for t in turns if t.get('extractor',{}).get('status')=='applied' and t['T4_ms'].get('ready') is not None]
    clock=[t for t in timings if (t['timing'].get('world') or {}).get('persisted')]
    inferred=sum(bool(t['timing']['marks'].get('worldTimesInferred')) for t in clock)
    cost=Decimal(m['provider_cost_usd'])
    def unit(n):return str((cost/n).quantize(Decimal('0.000000001'))) if n else None
    return dict(arm=m['arm'],narrated=main_narrated,confirmed_inputs=confirmations,physical=m['physical_sends'],
        frame=planner_frames(folder,wire),opportunities=by_class,cost_usd=m['provider_cost_usd'],
        cost_per_confirmed_input=unit(confirmations),cost_per_narrated=unit(main_narrated),cost_per_dispatch=unit(m['physical_sends']),
        measured_world_jobs=len(clock),inferred_browser_commits=inferred,roles=m['physical_roles'],repeat_roles=m['repeat_role_requests'],input=m['provider_input'],output=m['provider_output'],
        cache=m['provider_cache'],reasoning=m['provider_reasoning'],first_ms=describe(firsts),ready_ms=describe(ready),readback_ms=describe(readbacks))
if __name__=='__main__':
    root=Path(sys.argv[1])
    print(json.dumps({d.name:metrics(d) for d in sorted(root.iterdir()) if (d/'messwerte.json').is_file()},ensure_ascii=False,indent=2))
