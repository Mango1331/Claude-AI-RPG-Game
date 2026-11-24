"""Create a compact turn ledger from the confirmed readbacks, wire journal and rendered views."""
import json
import sys
from collections import Counter
from rollen import physical_role
from pathlib import Path

base, arm = Path(sys.argv[1]), sys.argv[2]
folder = base / arm
def read(p):
    return json.loads(p.read_bytes())
def lines(p):
    return [json.loads(line) for line in p.read_bytes().splitlines()] if p.exists() else []
def changes(before, after):
    return {k: [before.get(k), after.get(k)] for k in sorted(before.keys() | after.keys()) if before.get(k) != after.get(k)}
def property_map(s):
    return {k: [v.get('name'), v.get('qty'), v.get('holder')] for k, v in s['objects'].items()}
wire = [r for r in lines(base/'physical.jsonl') if r['arm'] == arm]
inputs = {r['n']: r for r in lines(folder/'actions.jsonl')}
for t in lines(folder/'turns.jsonl'):
    n = t['n']
    ch = lines(folder/f'chat-{n}.jsonl')[1:]
    u, ai = ch[t['inputMessageIndex']:t['inputMessageIndex']+2]
    assert u['mes'] == inputs[n]['text']
    after, before = read(folder/f'world-{n}.json'), read(folder/f'world-{n-1}.json')
    view = read(folder/f'visible-{n}.json')
    p, x = (m.get('extra',{}).get('avereth',{}) for m in (u,ai))
    xr = x.get('extraction',{}).get('raw') or {}
    rx = xr.get('deltas',[]) if isinstance(xr,dict) else []
    usage = [r.get('usage') or {} for r in wire if r['turn']==n and r['kind']=='end']
    prov = [r for r in wire if r['turn']==n and r['kind']=='start']
    frame = p.get('plan',{}).get('travel_frame')
    states = {}
    for k in ['hp','mp','sta','coin_cp']:
        left,right=[s['entities']['pc']['sheet'].get(k) for s in (before,after)]
        if left!=right:states[k]=[left,right]
    rows = dict(n=n, player=inputs[n]['text'], intent=inputs[n]['intent_before_narration'],
        narrated=bool(x.get('extraction')), prose=ai.get('mes',''), commands=p.get('interp',{}).get('commands'), frame=frame,
        before=before['scene']['at'], after=after['scene']['at'], clock=after['clock'], present=after['scene']['present'],
        added_people=[(k,v.get('name')) for k,v in after['entities'].items() if k not in before['entities'] and k.startswith('npc.')],
        objects=changes(property_map(before),property_map(after)), sheet=states,
        npc_knowledge=changes(before.get('knowledge',{}),after.get('knowledge',{})),
        new_memories=after['memories'][len(before['memories']):],
        extract_types=dict(Counter(d.get('type') for d in rx)), arrivals=[d for d in rx if d.get('type')=='arrive'],
        rejected=x.get('rejected',[]), events=[e['t'] for e in p.get('events',[])+x.get('events',[])],
        visible_engine=view['messages'][-1].get('engine'), hud=view['hud'], world=t['checked'],
        roles=dict(Counter(physical_role(r) for r in prov)), cost=sum(a.get('cost',0) or 0 for a in usage),
        prompt=sum(a.get('prompt_tokens',0) or 0 for a in usage),output=sum(a.get('completion_tokens',0) or 0 for a in usage),
        save_readback_ms=(t['timing'].get('world') or {}).get('save_readback_ms'))
    print(json.dumps(rows,ensure_ascii=False))
