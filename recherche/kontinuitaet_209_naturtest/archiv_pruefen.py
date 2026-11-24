"""Verify twelve original-prefix, one pilot, a follow-up and two main ST exports, costs, event/reload evidence and journal serialization."""
import argparse
from collections import Counter
from decimal import Decimal
import gzip
import hashlib
import json
from pathlib import Path
import re

def rows(path):
    with gzip.open(path,'rt') as handle:
        return [json.loads(line) for line in handle]
def load(path):
    return json.loads(path.read_bytes())
def verify_manifest(folder):
    match=re.compile(r'\| `([^`]+)` \| ([0-9]+) \| `([a-f0-9]{64})`')
    entries=match.findall((folder/'SOURCE_MANIFEST.md').read_text())
    assert entries,folder
    for name, size, digest in entries:
        data=(folder/name).read_bytes()
        assert len(data)==int(size) and hashlib.sha256(data).hexdigest()==digest,(folder,name)
    return len(entries)

def audit(folder, physical):
    manifest_count=verify_manifest(folder)
    p=load(folder/'konfiguration.json')
    turns=load(folder/'browserzeiten.json'); player=load(folder/'spielerabsichten.json')
    worlds=rows(folder/'reload-welten.jsonl.gz')
    journal=rows(folder/'provider-journal.jsonl.gz')
    wire=rows(folder/'provider-originalantworten.jsonl.gz')
    chat=rows(folder/'original-chat.jsonl.gz')[1:]
    event_groups=json.loads(gzip.decompress((folder/'engine-events.json.gz').read_bytes()))
    assert len(player)==len(turns)==len(worlds)-1
    assert event_groups==[m.get('extra',{}).get('avereth',{}).get('events',[]) for m in chat]
    ended={e['id']:e for e in journal if e['kind']=='end'}
    assert len(ended)==len([e for e in journal if e['kind']=='start'])==len(wire)
    assert set(ended)=={e['id'] for e in wire}
    for captured in wire:
        if captured['id']==118:
            e=ended[118];err=json.loads(captured['body'])
            assert e['status']==429 and e['generationId']=='gen-1795512880-657V3jk4KwnaFcJTeL9d'
            assert err['error']['code']==429 and err['error']['metadata']['limit_source']=='upstream_provider_shared_pool'
            assert not e['ok'] and e.get('usage') is None and err.get('user_id')=='<account-redacted>'
            continue
        if captured['format']=='sse':
            frames=[l[5:].strip() for l in captured['body'].splitlines() if l.startswith('data:')]
            assert frames and frames[-1]=='[DONE]' and frames.count('[DONE]')==1
            answers=[json.loads(x) for x in frames[:-1]]
        else:
            answers=[json.loads(captured['body'])]
        e=ended[captured['id']]
        assert answers and all(not a.get('error') for a in answers)
        assert {a['model'] for a in answers if a.get('model')}==set(e['reportedModels'])
        assert {a['provider'] for a in answers if a.get('provider')}==set(e['providers'])
        assert {a['id'] for a in answers if a.get('id')}=={e['generationId']}
        finishes={c.get('finish_reason') for a in answers for c in a.get('choices',[]) if c.get('finish_reason')}
        assert finishes=={e['finish']}
        receipts=[a['usage'] for a in answers if a.get('usage')]
        assert receipts[-1]==e['usage']
    for start in [e for e in journal if e['kind']=='start']:
        i=start['id'];end=ended[i]
        assert i not in physical
        if i==118:
            assert end['status']==429 and start['turn']==707 and start['role']=='planner' and Decimal(end['chargedOrReservedUSD'])==Decimal('0.0374923056')
            physical[i]=(start,end)
            continue
        assert end['ok'] and end['status']==200
        assert end['done'] and end['finish'] in ('stop','length')
        assert end['providers']==['Relace'] and end['reportedModels']==['z-ai/glm-5.3-flash']
        body=start['body']
        assert body['model']=='z-ai/glm-5.3-flash' and body['reasoning']=={'effort':'low'}
        assert body['provider']['only']==['relace/fp4'] and body['provider']['allow_fallbacks'] is False
        physical[i]=(start,end)
    for declared,observed in zip(player,turns):
        j=observed['inputMessageIndex'];n=declared['n']
        assert n==observed['n'] and chat[j]['mes']==declared['text'] and chat[j]['is_user']
        assert worlds[n]['after']==n
        metrics=observed['timing']['world']
        if metrics is not None:
            assert metrics['persisted'] and observed['timing']['marks']['ready']
        else:
            reply=chat[observed['checked']['messages']-1]
            assert reply.get('is_system') and reply.get('extra',{}).get('avereth_panel')
            assert not any(e['role']=='narrator' and e['turn']==next((j['turn'] for j in journal if j['kind']=='start'),1)+n-1 for e in ended.values())
    roles=Counter(e['role'] for e in ended.values())
    repair=Counter()
    for role in set(roles):
        for t in {e['turn'] for e in ended.values()}:
            n=sum(e['role']==role and e['turn']==t for e in ended.values())
            if n>1:repair[role]+=n-1
    billed=[e for e in ended.values() if e.get('usage')]
    tokens={key:sum(e['usage'][key] for e in billed) for key in ('prompt_tokens','completion_tokens')}
    tokens['cached_tokens']=sum((e['usage'].get('prompt_tokens_details') or {}).get('cached_tokens') or 0 for e in billed)
    tokens['reasoning_tokens']=sum((e['usage'].get('completion_tokens_details') or {}).get('reasoning_tokens') or 0 for e in billed)
    reporting={"usage":sum(isinstance(e.get('usage'),dict) for e in billed),"cost":sum(e['usage'].get('cost') is not None for e in billed),"cached":sum((e['usage'].get('prompt_tokens_details') or {}).get('cached_tokens') is not None for e in billed),"reasoning":sum((e['usage'].get('completion_tokens_details') or {}).get('reasoning_tokens') is not None for e in billed)}
    costs=sum(Decimal(str(e['usage']['cost'])) for e in billed)
    def delays(mark):
        return [round(t['timing']['marks'][mark]-t['timing']['marks']['click']) for t in turns if t['timing']['marks'].get(mark) is not None]
    return {'engine':p['head'],'initial':p['initial'],'inputs':len(turns),'confirmed_narrated':sum(t['timing']['world'] is not None for t in turns),'confirmed_local_system':sum(t['timing']['world'] is None for t in turns),'requests':len(ended),'roles':dict(roles),'repeats':dict(repair),'tokens':tokens,'usage_reporting':reporting,'usd':str(costs),'reported_cost_plus_reserves':str(sum(Decimal(e['chargedOrReservedUSD']) for e in ended.values())),'first_ms':delays('firstProse'),'safe_ms':delays('ready'),'manifest_files':manifest_count}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('testroot',type=Path);ap.add_argument('summary',type=Path);args=ap.parse_args()
    root=args.testroot;all_requests={};out={}
    primary={'A':root/'openrouter-20261124-kontinuitaet-a-209','B':root/'openrouter-20261124-kontinuitaet-b-210'}
    for a,folder in primary.items():out[a]=audit(folder,all_requests)
    out['pilot']=audit(root/'openrouter-20261124-kontinuitaet-pilot-210',all_requests)
    assert out['A']['initial']==out['B']['initial']==out['pilot']['initial']
    verify_manifest(root/'openrouter-20261124-kontinuitaet-fokus')
    stop_dir=primary['B']/'unterbrechung-118'
    verify_manifest(stop_dir)
    previous=rows(stop_dir/'letzter-vollstaendiger-save.jsonl.gz')
    assert previous==rows(stop_dir/'fortsetzung-start.jsonl.gz')
    interrupted=rows(stop_dir/'abgebrochener-disk-save.jsonl.gz')[1:]
    assert interrupted[:-1]==previous[1:] and interrupted[-1]['is_user']
    assert interrupted[-1]['mes']==load(stop_dir/'fruehere-eingaberevision.json')['text']
    assert not interrupted[-1].get('extra',{}).get('avereth',{}).get('events')

    for k in ['bren','wagen','wren','gruene-tuer','tasche','namenswissen']:
        sub={a:audit(root/'openrouter-20261124-kontinuitaet-fokus'/k/a,all_requests) for a in ('A','B')}
        assert sub['A']['initial']==sub['B']['initial']
        out[k]=sub
    out['zusatz']=audit(root/'openrouter-20261124-kontinuitaet-zusatz-wren-210',all_requests)
    c19=load(root/'openrouter-20261124-kontinuitaet-fokus/tasche/B/browserzeiten.json')[0]['checked']
    assert out['zusatz']['initial']==c19
    assert 1<=out['zusatz']['inputs']<=3
    assert sorted(all_requests)==list(range(1,len(all_requests)+1))
    assert len({end["generationId"] for _,end in all_requests.values()})==len(all_requests)
    last_end=0
    for start,end in [all_requests[i] for i in sorted(all_requests)]:
        assert last_end<=start['at']<=end['at']
        last_end=end['at']
    roles=Counter(end['role'] for _,end in all_requests.values())
    receipts=[end.get('usage') for _,end in all_requests.values() if end.get('usage')]
    out['total']={'requests':len(all_requests),'roles':dict(roles),'with_usage':len(receipts),
        'input':sum(u['prompt_tokens'] for u in receipts),'output':sum(u['completion_tokens'] for u in receipts),
        'cache':sum((u.get('prompt_tokens_details') or {}).get('cached_tokens') or 0 for u in receipts),
        'reasoning':sum((u.get('completion_tokens_details') or {}).get('reasoning_tokens') or 0 for u in receipts),
        'duration_ms':sum(e['elapsedMs'] for _,e in all_requests.values()),'terminal_provider_rejections':sum(not e['ok'] for _,e in all_requests.values()), 'peak':1,'usd':str(sum(Decimal(str(e['usage']['cost'])) for s,e in all_requests.values() if e.get('usage'))),'reported_cost_plus_reserves':str(sum(Decimal(e['chargedOrReservedUSD']) for s,e in all_requests.values()))}
    assert out['total']['requests']<=200 and Decimal(out['total']['reported_cost_plus_reserves'])<=1
    args.summary.write_text(json.dumps(out,ensure_ascii=False,indent=2,sort_keys=True)+'\n')
    print(out['total'])
if __name__=='__main__':main()
