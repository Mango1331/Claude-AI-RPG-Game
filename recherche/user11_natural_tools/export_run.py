"""Secret-screened export of the run journal, raw upstream responses, ST chat and readbacks."""
from collections import Counter
from decimal import Decimal
from datetime import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import statistics

root=Path(os.environ["AVERETH_AB_DIR"])
dest=Path(os.environ["TRUST_EXPORT"])
arm=sys.argv[1]
assert arm in ('B','C')
src=root/arm
dest.mkdir(parents=True,exist_ok=True)
def milliseconds_between(start, end):
    if not start or not end:
        return None
    try:
        return round((datetime.fromisoformat(end.replace("Z","+00:00"))-datetime.fromisoformat(start.replace("Z","+00:00"))).total_seconds()*1000)
    except (ValueError, TypeError):
        return None

def decode(path):
    return json.loads(path.read_text(encoding="utf-8"))
def lines(file):
    if not file.exists():return []
    return [json.loads(l) for l in file.read_text(encoding="utf-8").splitlines() if l.strip()]
def clean(data):
    for key in ('OPENROUTER_API_KEY','FEATHERLESS_API_KEY'):
        secret=os.environ.get(key)
        if secret and len(secret)>4 and secret.encode() in data: raise ValueError("Credential in artifact")
    if b'sk-or-v1-' in data or b'Bearer sk-' in data: raise ValueError("Credential prefix in artifact")
    return data
created=[]
def file(name,data,compressed=False):
    checked=clean(data)
    created.append(dest/name)
    (dest/name).write_bytes(gzip.compress(checked,mtime=0) if compressed else checked)
def obj(name,v,compressed=False):
    file(name,(json.dumps(v,ensure_ascii=False,indent=2)+'\n').encode(),compressed)
def jsonl(name,rows):
    file(name,b''.join((json.dumps(v,ensure_ascii=False)+'\n').encode() for v in rows),True)

log=[r for r in lines(root/'physical.jsonl') if r.get('arm')==arm]
starts=[r for r in log if r['kind']=='start']
ends=[r for r in log if r['kind']=='end']
actions=lines(src/'actions.jsonl');turns={t['n']:t for t in lines(src/'turns.jsonl')}
chat=lines(src/'chat.jsonl')[1:]
assert len(ends)<=len(starts)
assert all(x['arm']==arm for x in starts)
jsonl('provider-journal.jsonl.gz',log)
file('original-chat.jsonl.gz',(src/'chat.jsonl').read_bytes(),True)
file('engine-events.json.gz',(src/'events.json').read_bytes(),True)
for fname in ('st-timed.log','interrupted-browser-chat.json','interrupted-disk-chat.jsonl'):
    if (src/fname).is_file(): file(fname+'.gz',(src/fname).read_bytes(),True)
profile=decode(src/'profile.json');obj('konfiguration.json',profile)
route=decode(root/'route.json')
obj('route.json',{k:route[k] for k in ('model_id','provider_name','tag','canonical_slug','context_length','max_completion_tokens','supported_parameters','pricing')})
worlds=[]
for p in sorted(src.glob('world-*.json'),key=lambda p:int(p.stem.split('-')[1])):
    worlds.append({'after':int(p.stem.split('-')[1]),'state':decode(p)})
jsonl('reload-welten.jsonl.gz',worlds)
obj('spielerabsichten.json',actions)
obj('browserzeiten.json',list(turns.values()))
wire=[]
for r in ends:
    if not r.get('rawFile'):continue
    wire.append({"id":r['id'],"format":"sse" if '.sse.' in r['rawFile'] else 'json',"body":gzip.decompress((root/r['rawFile']).read_bytes()).decode()})
jsonl('provider-originalantworten.jsonl.gz',wire)
rows=[]
for a in actions:
    i=a['n'];t=turns.get(i);s=next((e['state'] for e in worlds if e['after']==i),None)
    u=chat[t['inputMessageIndex']] if t else None
    if u:assert u['mes']==a['text'] and u['is_user']
    r=chat[t['checked']['messages']-1] if t else {}
    outcome=s.get('last',{}).get('outcome',{}) if s else {}
    ext=r.get('extra',{}).get('avereth',{})
    us=u.get('extra',{}).get('avereth',{}) if u else {}
    models=[e for e in ends if e['turn']==i]
    slots=Counter(e['role'] for e in starts if e['turn']==i)
    repairs={k:n-1 for k,n in slots.items() if n>1}
    m=t['timing']['marks'] if t else {}
    timings={k:round(m[k]-m['click']) if m.get(k) is not None and m.get('click') is not None else None for k in ['firstProse','lastRenderedChange','worldCommit','confirmedSave','ready']}
    rows.append(dict(turn=i,input=a['text'],intent=a['intent_before_narration'],complete=t is not None,
        arrival_after_reload=s['scene']['at'] if s else None,present=s['scene'].get('present') if s else None,
        plan=us.get('interp',{}).get('commands'),booked_player_events=us.get('events',[]),actions=outcome.get('actions'),
        extractor={k:ext.get('extraction',{}).get(k) for k in ('status','ms','repaired','deltas','missing')},reported=ext.get('extraction',{}).get('raw'),rejected=ext.get('rejected',[]),events=ext.get('events',[]),prose=r.get('mes'),
        T4_ms=timings,ST_generation_window_ms=milliseconds_between(r.get('gen_started'),r.get('gen_finished')),
        ST_actor_to_narrator_end_ms=milliseconds_between(a.get('at'),r.get('gen_finished')),
        repeat_role_requests=repairs,physical=[(e['id'],e['role'],e['elapsedMs']) for e in models],
        provider_input=sum((e.get('usage') or {}).get('prompt_tokens',0) or 0 for e in models),
        provider_output=sum((e.get('usage') or {}).get('completion_tokens',0) or 0 for e in models),
        provider_cost=str(sum(Decimal(str(e['usage']['cost'])) for e in models if (e.get('usage') or {}).get('cost') is not None)),
        fold_readback=t['checked'] if t else None))
obj('zugauswertung.json.gz',rows,True)
counter=Counter(r['role'] for r in starts)
costs=[(r.get('usage') or {}).get('cost') for r in ends]
summary=dict(arm=arm,candidate=profile['head'],route=route["tag"],physical_sends=len(starts),physical_refs_ended=len(ends),
   physical_roles=dict(counter),repeat_role_requests=dict(sum((Counter(e['repeat_role_requests']) for e in rows),Counter())),success=sum(bool(r['ok']) for r in ends),player_inputs=len(actions),confirmed_st_turns=len(turns),
   provider_input=sum(e['provider_input'] for e in rows),provider_output=sum(e['provider_output'] for e in rows),
   provider_cache=sum(((r.get('usage') or {}).get('prompt_tokens_details') or {}).get('cached_tokens',0) or 0 for r in ends),
   provider_reasoning=sum(((r.get('usage') or {}).get('completion_tokens_details') or {}).get('reasoning_tokens',0) or 0 for r in ends),
   usage_records=sum(r.get('usage') is not None for r in ends),provider_cost_usd=str(sum(Decimal(str(c)) for c in costs if c is not None)),
   cost_records=sum(c is not None for c in costs),charged_or_reserved_usd=str(sum(Decimal(r['chargedOrReservedUSD']) for r in ends)),
   physical_duration_ms=sum(r['elapsedMs'] for r in ends),median_ready_ms=statistics.median([x['T4_ms']['ready'] for x in rows if x['T4_ms']['ready'] is not None]) if any(x['T4_ms']['ready'] is not None for x in rows) else None)
def describe(values):
    if not values:return {"n":0,"sum":None,"mean":None,"median":None,"min":None,"max":None}
    return {"n":len(values),"sum":sum(values),"mean":round(statistics.mean(values),2),"median":statistics.median(values),"min":min(values),"max":max(values)}

summary["by_role"]={}
for label in counter:
    ended=[record for record in ends if record['role']==label]
    provider_usage=[record.get('usage') or {} for record in ended]
    summary["by_role"][label]={
        "dispatched":counter[label], "duration_ms":describe([item['elapsedMs'] for item in ended]),
        "prompt_tokens":sum(item.get('prompt_tokens') or 0 for item in provider_usage), "completion_tokens":sum(item.get('completion_tokens') or 0 for item in provider_usage),
        "cost_usd":str(sum((Decimal(str(item['cost'])) for item in provider_usage if item.get('cost') is not None),Decimal(0)))}
summary["st_ms"]={key:describe([r['T4_ms'][key] for r in rows if r['T4_ms'][key] is not None]) for key in ('firstProse','lastRenderedChange','worldCommit','confirmedSave','ready')}
summary["all_reloads_match"]=all(r['fold_readback'] is not None for r in rows) and len(rows)>0
obj('messwerte.json',summary)
listed=[(f.name,len(f.read_bytes()),hashlib.sha256(f.read_bytes()).hexdigest()) for f in sorted(created)]
table='\n'.join(f'| `{name}` | {length} | `{sha}` |' for name,length,sha in listed)
(dest/'SOURCE_MANIFEST.md').write_text('# Quellenmanifest · natürlicher Lauf '+arm+'\n\nSHA-256 über die jeweils abgelegten Bytes. Gzip-Körper sind verlustfrei. Das Providerjournal enthält den an OpenRouter versandten JSON-Inhalt, Uhrzeiten und Usage. Die Originalantworten bewahren den vollständigen JSON- oder SSE-Körper, einschließlich Reasoningfeldern, in UTF-8. Der ST-Chat und die Eventgruppen stammen aus dem nach jedem Turn überprüften Save. Datenwurzeln, Cookies, Servergeheimnisse und HTTP-Authentifizierungsheader gehören nicht zum Archiv.\n\n| Datei | Bytes | SHA-256 |\n|---|---:|---|\n'+table+'\n')
print(json.dumps({k:v for k,v in summary.items() if k not in ('by_role','st_ms')},ensure_ascii=False))
