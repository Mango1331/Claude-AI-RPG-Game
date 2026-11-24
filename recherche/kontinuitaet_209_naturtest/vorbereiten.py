"""Materialise the tested .208 host driver for this pinned, serial .209/.210 experiment."""
import gzip
import json
from pathlib import Path
import subprocess
import sys

root=Path(sys.argv[1]).resolve()
repo=Path(__file__).resolve().parents[2]
tools=root/'tools'
tools.mkdir(exist_ok=True,parents=True)
previous='a277663a334f1bb501aeb79859aff4bffdb25e9d'
def source(name):
    return subprocess.check_output(['git','-C',str(repo),'show',previous+':recherche/user11_natural_tools/'+name],text=True)
def replace(s,a,b):
    if s.count(a)!=1:raise ValueError('Expected one source occurrence: '+a)
    return s.replace(a,b)
baseline='a854cd6759712571f078bff52e7fe439858b8454'
s=source('player.mjs').replace("['B','C']","['A','B']")
s=replace(s,"'cb1eb944a041b26be9210199d780be9ff740f74d'",repr(baseline))
s=replace(s,"assert.equal(git(eng,'rev-parse',head+'^'),baseline);","if(arm==='A')assert.equal(head,baseline);else git(eng,'merge-base','--is-ancestor',baseline,head);")
s=replace(s,"const originalPath=path.join(process.env.AVERETH_MAIN,'testrun_10b/user-20261123-042623-207/originals/chat.jsonl');","const originalPath=path.join(shared,'start.jsonl');")
s=replace(s,".slice(1,6).map(JSON.parse)",".slice(1).map(JSON.parse)")
s=replace(s,"arm==='B'?18541:18542, proxyPort=arm==='B'?18551:18552","arm==='A'?18641:18642, proxyPort=arm==='A'?18651:18652")
s=replace(s,"assert(runtimeFiles.length>0,'Expected an independently modified playable engine');","if(arm==='B')assert(runtimeFiles.length>0);runtimeFiles.push('index.js','src/host.js','src/v4/world.js','src/v4/firewall.js');")
s=replace(s,"dr.view({back:n===0?4:0})","dr.view({back:n===0?1:0})")
s=replace(s,"n<25","n<22")
(tools/'player.mjs').write_text(s)
s=source('transport.py')
s=replace(s,'220, Decimal("1.50")','200, Decimal("1.00")')
s=replace(s,'{18551: "B", 18552: "C"}','{18651: "A", 18652: "B"}')
(tools/'transport.py').write_text(s)
for name in ('action.py','export_run.py'):
    (tools/name).write_text(source(name).replace("('B','C')","('A','B')"))
(tools/'test_transport.py').write_text(source('test_transport.py'))
fixture=repo/'testrun_10b/openrouter-20261124-trust-c-208/original-chat.jsonl.gz'
# Header plus exactly 19 messages: creation and seven settled natural interactions.
original=gzip.decompress(fixture.read_bytes()).splitlines(keepends=True)
prefix=original[:20]
assert len(prefix)==20
x=json.loads(prefix[-1]); assert not x['is_user'] and x['extra']['avereth']['extraction']['status']=='applied'
assert 'before you carry her words' in x['mes']
(root/'start.jsonl').write_bytes(b''.join(prefix))
