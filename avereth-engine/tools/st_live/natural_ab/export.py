"""Build a credential-checked experiment bundle from an existing run, without any provider access."""
import gzip
import io
import json
import os
from pathlib import Path
import re
import sys
import tarfile

source,dest=map(Path,sys.argv[1:])
key=os.environ.get("FEATHERLESS_API_KEY")
if not key: raise SystemExit("Credential required only for a negative byte scan in the exporter")
dest.mkdir(parents=True,exist_ok=True)
records={}
for f in sorted(source.iterdir()):
    if f.is_file() and (f.suffix=='.json' or f.name=='physical.jsonl' or f.suffix=='.log') and f.name!='gate.json':
        records[f.name]=f.read_bytes()
for arm in 'AB':
    for folder in source.glob('avereth-live-'+arm+'-*'):
        chats=list((folder/'data/default-user/chats').glob('*/*.jsonl'))
        mains=[p for p in chats if not p.stem.startswith('AB-')]
        if len(mains)==1: records['main-chat-'+arm+'.jsonl']=mains[0].read_bytes()
removed=0
with (dest/'laufdaten.tar.gz').open('wb') as raw, gzip.GzipFile(fileobj=raw,mode='wb',mtime=0,filename='') as gz, tarfile.open(fileobj=gz,mode='w|') as tar:
    for name,b in sorted(records.items()):
        if key.encode() in b: raise RuntimeError('Actual credential found; export stopped')
        if name.endswith('.log'):
            text=b.decode(errors='replace')
            # Drop incidental authorization/cookie lines. Application payload dumps do not contain the upstream header.
            text,count=re.subn(r'(?im)^.*(?:^|[\s\x27\x22])(?:authorization|set-cookie|cookie|x-api-key|proxy_password)[\x27\x22]?\s*:\s*[^\n]+$', '[redacted header line]',text)
            removed+=count
            text=text.replace(str(source),'<RUN>')
            b=text.encode()
        if re.search(rb'(?i)Bearer\s+[a-z0-9_./+-]{15,}',b):raise RuntimeError('Credential-like bearer value; review local source')
        info=tarfile.TarInfo(name);info.size=len(b);info.mode=0o600;info.mtime=0
        tar.addfile(info,io.BytesIO(b))
with tarfile.open(dest/'laufdaten.tar.gz') as tar:
    assert sorted(tar.getnames())==sorted(records)
    assert all(key.encode() not in tar.extractfile(entry).read() for entry in tar)
print(len(records),'archive files;',removed,'header lines redacted')
