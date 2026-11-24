"""Export one isolated arm, including rendered views, interrupted saves and actual revisions."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import sys

root = Path(os.environ['AVERETH_AB_DIR'])
arm = sys.argv[1]
src = root / arm
dest = Path(os.environ['TRUST_EXPORT'])
code = (root/'tools/export_run.py').read_text()
code = code.replace("route=decode(root/'route.json')", "route=decode(root/('pilot-route.json' if arm in ('HA','K4') else 'route.json'))")
code = code.replace("u=chat[t['inputMessageIndex']] if t else None", "chat=lines(src/f'chat-{i}.jsonl')[1:] if t else []\n    u=chat[t['inputMessageIndex']] if t else None")
# Rate-limit responses can contain an account identifier. Preserve original digest alongside the redaction.
code = code.replace("jsonl('provider-originalantworten.jsonl.gz',wire)", """for entry in wire:
    if (entry['id'],arm) in ((4,'HA'),(522,'PA')):
        body=json.loads(entry['body'])
        if 'user_id' in body:
            entry['sha256_before_account_redaction']=hashlib.sha256(entry['body'].encode()).hexdigest()
            body['user_id']='[redacted]'
            entry['body']=json.dumps(body,ensure_ascii=False)
jsonl('provider-originalantworten.jsonl.gz',wire)""")
code = code.replace("checked=clean(data)", """checked=clean(data)
    if arm in ('HA','PA'):
        checked=re.sub(rb'("user_id"\\s*:\\s*")[^"]+(")',rb'\\1[redacted]\\2',checked)""")
code = code.replace("listed=[", """jsonl('sichtbares-spiel.jsonl.gz',[{'n':int(f.stem.split('-')[1]),**decode(f)} for f in sorted(src.glob('visible-*.json'),key=lambda f:int(f.stem.split('-')[1]))])
for name in ['revision-intents.jsonl','revision-results.jsonl']:
    if (src/name).is_file():file(name+'.gz',(src/name).read_bytes(),True)
if (src/'revision-results.jsonl').exists():
    # Earlier revisions and their dependent turns no longer survive in the final chat.
    jsonl('revisions-chats.jsonl.gz',[{'n':int(f.stem.split('-')[1]),'chat':lines(f)} for f in sorted(src.glob('chat-*.jsonl'),key=lambda f:int(f.stem.split('-')[1]))])
final=src/'finished-state.json' if (src/'finished-state.json').exists() else src/'response.json'
if final.exists():obj('host-abschluss.json',decode(final))
listed=[""")
for term, field in [('input', 'prompt_tokens'), ('output','completion_tokens')]:
    old = "sum(e['provider_"+term+"'] for e in rows)"
    assert old in code
    code = code.replace(old, "sum((e.get('usage') or {}).get('"+field+"', 0) or 0 for e in ends)")
from rollen import physical_role
# Preserve the original logged tags on disk and use the final request to classify downstream statistics.
code=code.replace("jsonl('provider-journal.jsonl.gz',log)", """jsonl('provider-journal.jsonl.gz',log)
labels={r['id']:physical_role(r) for r in starts}
for r in log:r['role']=labels[r['id']]
""")
env = {'physical_role':physical_role,'__file__': str(root/'tools/export_run.py'), '__name__':'__main__', 're':re}
exec(compile(code,str(root/'tools/export_run.py'),'exec'),env)
