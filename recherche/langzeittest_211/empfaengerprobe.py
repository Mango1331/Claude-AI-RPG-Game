"""Run two counterbalanced real extractor-only pairs on one frozen ST request through the study's local gate."""
import copy,fcntl,json,sys
from pathlib import Path
import httpx
p=Path(sys.argv[1]); arm='K3'
rows=lambda:[json.loads(l) for l in (p/'physical.jsonl').read_text().splitlines()]
loan=len(sys.argv)>2 and sys.argv[2]=='loan'
case,step=('GA',8) if loan else ('YA',7)
original=next(r for r in rows() if (r['arm'],r['turn'],r['role'],r['kind'])==(case,step,'extractor','start'))
if loan:
    state=json.loads((p/case/'world-7.json').read_bytes())
    old=state['objects']['obj.t22.old_iron_key']
    assert old['holder']=={'entity':'npc.serra'}
    line="Serra [npc.serra] — NOT PRESENT; last witnessed at Serra's hut (minute 635, historical)."
    annotated=line+' Recorded possession (requires a witnessed return and completed transfer): '+old['id']+' ('+old['name']+').'
else:
    chat=list(map(json.loads,(p/'YA/chat-7.jsonl').read_text().splitlines()))
    transfers=[e['d'] for e in chat[-2]['extra']['avereth']['events'] if e['t']=='object.moved']
    assert len(transfers)==1
    transfer=transfers[0]; item=transfer['id'];who=transfer['to']['entity']
    state=json.loads((p/'YA/world-7.json').read_bytes())
    line=state['last']['outcome']['actions'][0]
    annotated=line+' [item '+item+'; recipient '+who+']'
def gate(data):
    f=p/'comparison-gate.tmp';f.write_text(json.dumps(data));f.replace(p/'gate.json')
for turn,variant in enumerate(['original','IDs','IDs','original'],7201 if loan else 7101):
    with (p/'player-control.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        assert json.loads((p/'gate.json').read_bytes()).get('arm') is None
        prior=[r for r in rows() if r['arm']==arm and r['turn']==turn]
        if loan and '--continue-pair' in sys.argv and prior:
            assert len(prior)==2 and prior[-1]['kind']=='end' and prior[-1]['ok']
            continue
        assert not prior
        b=copy.deepcopy(original['body'])
        assert not b.get('stream')
        m=b['messages'][-1]; assert m['content'].count(line)==1
        if variant=='IDs':m['content']=m['content'].replace(line,annotated)
        gate({'arm':arm,'turn':turn})
        try:
            response=httpx.post('http://127.0.0.1:19455/v1/chat/completions',json=b,timeout=650)
            response.raise_for_status()
            last=rows()[-1]
            assert (last['kind'],last['arm'],last['turn'],last['ok'])==('end',arm,turn,True)
            print(turn,variant,last['id'],flush=True)
        finally:gate({'arm':None})
