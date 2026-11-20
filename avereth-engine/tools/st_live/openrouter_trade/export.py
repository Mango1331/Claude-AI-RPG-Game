"""Whitelist reproducibility artifacts. Strip private reasoning strings and transport credentials."""
from pathlib import Path
import gzip
import io
import json
import os
import re
import sys
import tarfile

root, dest = map(Path,sys.argv[1:])
key=os.environ['OPENROUTER_API_KEY'].encode()
assert key
names=['route.json','configuration.json','physical.jsonl','guild-seed.jsonl','combat-seed.jsonl','incomplete-first-attempt.jsonl',
       'interrupted-second-attempt.jsonl','stream-envelope.json','preflight-original.json','preflight.json','interruption.json',
       'pilot-interruption.json','partial-worlds.json','tomorrow.json','markets.json','token-comparison.json','audit.json',
       'executed-play.mjs','executed-setup.mjs','executed-proxy.py','executed-stream_usage.py','offline-result.json','offline-audit.json','offline-wire.json','offline-tokens.json']
if (root/'prior-settlement.json').exists():
    names=['route.json','configuration.json','physical.jsonl','guild-seed.jsonl','combat-seed.jsonl','prior-settlement.json','audit.json']
    names += [f.name for f in root.glob('canary*.json')] + [f.name for f in root.glob('natural-canary*.jsonl')]
    names += [f for f in ('interruption.json','earlier-attempts.json','paired.json','token-comparison.json','markets.json','reviewed-rate-limit.json','before429-interruption.json','before429-configuration.json','before429b-interruption.json','before429b-configuration.json') if (root/f).exists()]
names+=sorted(f.name for f in root.glob('*.log'))
names+=sorted(f.name for f in root.glob('natural-trade-*.jsonl'))
for pattern in ['turns.json','turn-*.json','main-complete.json']:
    names+=sorted(f.name for f in root.glob(pattern))

def clean(obj):
    if isinstance(obj,list):
        return [clean(x) for x in obj]
    if not isinstance(obj,dict):
        return obj
    return {k:("" if k in ("reasoning","reasoning_content","reasoning_signature") and isinstance(v,str) else
               [] if k=="reasoning_details" and isinstance(v,list) else clean(v)) for k,v in obj.items()}

stats={}
with dest.open('wb') as file,gzip.GzipFile(fileobj=file,mode='wb',mtime=0,filename='') as gz,tarfile.open(fileobj=gz,mode='w|') as tar:
    for name in sorted(names):
        f=root/name
        raw=f.read_bytes()
        assert key not in raw,name
        if name.endswith('.jsonl'):
            raw=('\n'.join(json.dumps(clean(json.loads(l)),ensure_ascii=False) for l in raw.splitlines())+'\n').encode()
        if name.endswith('.json'):
            raw=json.dumps(clean(json.loads(raw)),ensure_ascii=False,indent=2).encode()
        if name.endswith('.log'):
            output=[]
            suppressed=False
            for line in raw.decode(errors='replace').splitlines():
                body=re.sub(r'^\[\d\d:\d\d:\d\d\.\d{3}\] ','',line)
                if body.startswith('Chat Completion response: {'):
                    suppressed=True
                    output.append('[ST response body: visible answer and billing in physical.jsonl]')
                elif suppressed:
                    if body=='}':suppressed=False
                elif re.search(r'(?i)(authorization|set-cookie|cookie|x-api-key|proxy_password)[\x27\x22]?\s*:',line):
                    output.append('[redacted header]')
                else:
                    output.append(line.replace(str(root),'<RUN>'))
            raw=('\n'.join(output)+'\n').encode()
        raw=re.sub(rb'user_[A-Za-z0-9]{16,}', b'[redacted-user-id]',raw)
        assert key not in raw and not re.search(rb'(?i)(?:Bearer\s+[a-z0-9_./+\-]{15,}|sk-or-v1-[a-z0-9]{25,})',raw),name
        info=tarfile.TarInfo(name);info.size=len(raw);info.mode=0o600;info.mtime=0
        tar.addfile(info,io.BytesIO(raw));stats[name]=len(raw)
with tarfile.open(dest) as tar:
    assert sorted(tar.getnames())==sorted(names)
    for f in tar:assert key not in tar.extractfile(f).read()
print(len(names),'checked files')
