"""One audited operator restart for the healthy Alderwatch hosts following the Wafer admission rejection."""
from pathlib import Path
import sys,json,gzip,hashlib
p=Path(sys.argv[1])
rows=[json.loads(l) for l in (p/'physical.jsonl').read_bytes().splitlines()]
assert len(rows)==1044 and rows[-1]['id']==522 and rows[-1]['arm']=='PA'
ends=rows[1::2]
assert all(a['kind']=='start' and b['kind']=='end' and a['id']==b['id'] for a,b in zip(rows[::2],ends))
assert [r['id'] for r in ends if not r['ok']]==[4,522]
e=ends[-1]
payload=gzip.decompress((p/e['rawFile']).read_bytes()); err=json.loads(payload)['error']
assert e['status']==err['code']==429 and err['metadata']['provider_name']=='Wafer'
assert err['metadata']['provider_error_code']=='server_overloaded' and err['metadata']['limit_source']=='upstream_provider_shared_pool'
assert json.loads((p/'attempt522-generation.json').read_bytes())=={'id':e['generationId'],'http':404}
assert json.loads((p/'gate.json').read_bytes())=={'arm':None}
sha=hashlib.sha256(payload).hexdigest()
(p/'reviewed-522.json').write_text(json.dumps({'id':e['id'],'sha256':sha,'evidence':'complete HTTP 429; Wafer admission refused; price reserve retained; no retry of interrupted turn'}))
f=p/'tools/transport.py'
s=f.read_text(); old='not e["ok"] and not (e["id"]==4'
assert s.count(old)==1
f.write_text(s.replace(old,'not e["ok"] and not (e["id"]==522 and e["status"]==429 and e["generationId"]=='+repr(e['generationId'])+' and __import__("hashlib").sha256(gzip.decompress((ROOT/e["rawFile"]).read_bytes())).hexdigest()=='+repr(sha)+') and not (e["id"]==4'))
