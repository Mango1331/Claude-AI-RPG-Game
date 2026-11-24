"""Run exactly one pre-recorded player decision on both verified, isolated original-prefix hosts."""
import json
import os
from pathlib import Path
import subprocess
import sys
import hashlib
from fortsetzung_429 import confirmed_limit

root=Path(os.environ['AVERETH_AB_DIR']).resolve()
expected={'bren':('A','B'),'wagen':('B','A'),'wren':('A','B'),'gruene-tuer':('B','A'),'tasche':('A','B'),'namenswissen':('B','A')}
case=sys.argv[1]
arms=expected[case]
case_dir=root/'focus'/case
original=json.loads((case_dir/'original-eingabe.json').read_text())
def get(file):
    return json.loads(file.read_text())
def physical():
    return [json.loads(line) for line in (root/'physical.jsonl').read_text().splitlines()]
# Optional single half for the authorised staged reference measurement.
selected=sys.argv[2:] or list(arms)
assert all(a in arms for a in selected) and len(set(selected))==len(selected)
for arm in selected:
    assert get(case_dir/arm/'response.json')=={'ready':True}
    assert hashlib.sha256((case_dir/'start.jsonl').read_bytes()).hexdigest()==original['prefix_sha256']
    profile=get(case_dir/arm/'profile.json')
    assert profile['initial']['messages']==original['messageIndex']
    assert profile['head']==('a854cd6759712571f078bff52e7fe439858b8454' if arm=='A' else os.environ['CANDIDATE_PIN'])
    twin=case_dir/('B' if arm=='A' else 'A')/'profile.json'
    if twin.is_file():
        opposite=get(twin)
        for key in ('initial','presetHash','descriptionHash','lore','model','temp','topP','max','context','compact','smooth','stream'):
            assert opposite[key]==profile[key],key
    else:
        assert arm=='A' and arm==arms[0],'Only initial reference halves can run before candidate setup'
    prior=[r for r in physical() if r.get('turn')==original['physical_turn_tag'] and r['kind']=='start']
    assert (not prior) if arm==arms[0] else (prior and set(x['arm'] for x in prior)=={arms[0]})
    records=physical()
    assert get(root/'gate.json')['arm'] is None
    assert [r['id'] for r in records if r['kind']=='start']==[r['id'] for r in records if r['kind']=='end' and (r['ok'] or confirmed_limit(r,root))]
    assert not any(r['arm']==arm and r['turn']==original['physical_turn_tag'] for r in records if r['kind']=='start')
    env=dict(os.environ,AVERETH_AB_DIR=str(case_dir))
    cmd=[sys.executable,str(root/'tools/action.py'),arm,'play',original['text'],original['intent']]
    subprocess.run(cmd,env=env,check=True)
    state=get(case_dir/arm/'response.json')
    assert state['complete'] and state['n']==1
    records=physical()
    roles={r['role'] for r in records if r.get('turn')==original['physical_turn_tag'] and r['arm']==arm and r['kind']=='end' and (r['ok'] or confirmed_limit(r,root))}
    if 'narrator' in roles:
        assert {'planner','extractor'}<=roles,roles
    else:
        chat=[json.loads(line) for line in (case_dir/arm/'chat.jsonl').read_text().splitlines()][1:]
        assert chat[-1].get('is_system') and chat[-1].get('extra',{}).get('avereth_panel'),roles
        print("Stored terminal local system response; no natural narration at this input.")
