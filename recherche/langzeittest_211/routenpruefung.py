"""Start a fixed Wafer series after the audited Relace pre-inference rejection. Keep the same global journal."""
from pathlib import Path
from hashlib import sha256
import json,gzip,sys
root=Path(sys.argv[1]);p=root/'tools/transport.py'
events=[json.loads(s) for s in (root/'physical.jsonl').read_text().splitlines()]
bad=events[-1];assert bad['id']==4 and bad['kind']=='end' and bad['status']==429 and bad['arm']=='HA'
raw=gzip.decompress((root/bad['rawFile']).read_bytes()); er=json.loads(raw)['error'];assert er['code']==429 and er['metadata']['limit_source']=='upstream_provider_shared_pool' and er['metadata']['provider_name']=='Relace'
assert len(events)==8 and all(e['ok'] for e in events if e['kind']=='end' and e['id']<4)
proof={'id':4,'sha256':sha256(raw).hexdigest(),'reason':'HTTP 429 upstream shared pool; full response. Conservative reserve retained.'}
(root/'reviewed-rejection.json').write_text(json.dumps(proof))
r=root/'route.json';(root/'pilot-route.json').write_bytes(r.read_bytes())
model=json.loads(Path(sys.argv[2]).read_bytes())['data'];route=next(i for i in model['endpoints'] if i['tag']=='wafer/us');assert route['status']==0
route.update(model_id=model['id'],canonical_slug=json.loads(r.read_bytes())['canonical_slug']);r.write_text(json.dumps(route,indent=2))
s=p.read_text().replace('0.0000000356','0.000000042').replace('0.0000000815','0.000000184').replace('== "relace/fp4"','== "wafer/us"').replace('== "Relace"','== "Wafer"')
s=s.replace('any(not e["ok"] for e in ends)','any(not e["ok"] and not (e["id"]==4 and e["status"]==429 and e["generationId"]=='+repr(bad['generationId'])+' and __import__("hashlib").sha256(gzip.decompress((ROOT/e["rawFile"]).read_bytes())).hexdigest()=='+repr(proof['sha256'])+') for e in ends)')
p.write_text(s)
