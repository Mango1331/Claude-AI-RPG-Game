"""Aggregate actual, paired observations. Never infer missing provider usage from local text."""
from collections import Counter
from datetime import datetime
from pathlib import Path
import re
from statistics import mean, median
import json
import sys

root=Path(sys.argv[1])
read=lambda name: json.loads((root/name).read_text())
logs=[json.loads(x) for x in (root/'physical.jsonl').read_text().splitlines()]
started={r['id']:r for r in logs if r['kind']=='start'}
ended={r['id']:r for r in logs if r['kind']=='end'}
active=set()
peak=0
for r in logs:
    if r['kind']=='start':
        assert not active and r['id']<=120
        active.add(r['id'])
        peak=max(peak,len(active))
    elif r['kind']=='end':
        active.remove(r['id'])
rows=read('turns.json') if (root/'turns.json').exists() else []
clocks=read('clocks.json') if (root/'clocks.json').exists() else {}
parser=read('parser.json') if (root/'parser.json').exists() else []
parsed={r['id']:r for r in parser}

def usage(records):
    result={}
    for key in ('prompt_tokens','completion_tokens','cached_tokens'):
        values=[]
        for r in records:
            obj=ended.get(r['id'],{}).get('usage') or {}
            v=obj.get(key)
            if v is None and key=='cached_tokens':
                v=(obj.get('prompt_tokens_details') or {}).get(key)
            if isinstance(v,int):
                values.append(v)
        result[key]={'sumReported':sum(values) if values else None,'coverage':[len(values),len(records)]}
    return result

def stats(values):
    values=[x for x in values if x is not None]
    return {'n':len(values),'sum':round(sum(values),1),'mean':round(mean(values),1),'median':round(median(values),1)} if values else {'n':0}

turns=[]
for item in rows:
    arm,n=item['arm'],item['n']
    ids=item['requests']
    rec=[started[i] for i in ids]
    m=item['measured']['marks']
    times={k:round(m[k]-m['click'],1) if m.get(k) is not None else None for k in ('firstProse','lastRenderedChange','worldCommit','confirmedSave','ready')}
    ext=[ended[i] for i in ids if i in ended and started[i]['role']=='extractor']
    times['lastExtractorTransportEnd']=round(ext[-1]['at']-clocks[arm]['origin']-m['click'],1) if ext and arm in clocks else None
    narr=[ended[i] for i in ids if i in ended and started[i]['role']=='narrator']
    times['saveReadbackMs']=item['measured']['world'].get('save_readback_ms')
    if narr and arm in clocks and m.get('firstProse') is not None:
        visible=clocks[arm]['origin']+m['firstProse']
        times['narratorStartToFirstProse']=round(visible-started[narr[0]['id']]['at'],1)
        times['firstProseBeforeTransportEnd']=round(narr[0]['at']-visible,1)
    byRole=Counter(r['role'] for r in rec)
    saved=read(f'turn-{arm}{n}.json')
    if arm in clocks and saved['reply'].get('gen_finished'):
        epoch=datetime.fromisoformat(saved['reply']['gen_finished'].replace('Z','+00:00')).timestamp()*1000
        times['stNarrationFinished']=round(epoch-clocks[arm]['origin']-m['click'],1)
    normalize=lambda x:re.sub(r'[^a-z0-9]','',x.lower())
    assert normalize(saved['reply']['mes']) in normalize(item['measured']['finalRendered'])
    result=dict(arm=arm,n=n,intent=item['intent'],action=item['action'],usage=usage(rec),phaseMs=times,
                checks={'readback':item['readback'],'worldHash':item['worldHash'],'eventHash':saved['eventsHash']},
                roles=dict(byRole),repairs={k:max(0,byRole[k]-1) for k in ('planner','board','extractor')},
                ids=ids,transportMs={role:sum(ended[r['id']]['elapsedMs'] for r in rec if r['role']==role) for role in byRole},
                formal=[parsed[i]['valid'] if i in parsed else None for i in ids],events=[e['t'] for e in saved['reply']['extra']['avereth']['events']],
                rejected=saved['reply']['extra']['avereth'].get('rejected',[]),world={'location':saved['world']['scene']['at'],'present':saved['world']['scene']['present'],
                    'quests':[(q['title'],q['status']) for q in saved['world']['quests'].values() if q.get('kind')=='guild_contract']})
    turns.append(result)
groups={}
for arm in ('A','B'):
    subset=[r for r in turns if r['arm']==arm]
    records=[r for r in started.values() if r['stage']=='main' and r['arm']==arm]
    checks=[parsed[r['id']]['valid'] for r in records if r['id'] in parsed and parsed[r['id']]['valid'] is not None]
    groups[arm]=dict(turns=len(subset),physical=len(records),usage=usage(records),formal=[sum(checks),len(checks)],family=dict(Counter(r['role'] for r in records)),
        repairs={k:sum(r['repairs'][k] for r in subset) for k in ('planner','board','extractor')},
        time={k:stats([r['phaseMs'][k] for r in subset]) for k in ('firstProse','lastRenderedChange','ready','worldCommit','confirmedSave')})
pairs={}
for key in ('firstProse','lastRenderedChange','stNarrationFinished','ready'):
    lookup={(r['arm'],r['n']):r for r in turns}
    matched=[n for n in range(1,11) if all((a,n) in lookup and lookup[a,n]['phaseMs'].get(key) is not None for a in 'AB')]
    pairs[key]={'turns':matched,**{a:stats([lookup[a,n]['phaseMs'][key] for n in matched]) for a in 'AB'}}
out=dict(model='zai-org/GLM-5.3-Flash',globalPhysical=len(started),globalPeak=peak,unconfirmed=sorted(active),
         completed=sum(r['ok'] for r in ended.values()),globalUsage=usage(list(started.values())),stageCounts=dict(Counter(r['stage'] for r in started.values())),
         groups=groups,pairedByTurnIndex=pairs,turns=turns)
(root/'summary.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
