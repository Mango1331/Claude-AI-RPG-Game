"""Local paired substitution in the actual A planner arrays, using the project's pinned GLM files."""
from hashlib import sha256
from pathlib import Path
import json
import sys
from tokenizers import Tokenizer
from jinja2.sandbox import ImmutableSandboxedEnvironment

root, tokenizer, template = map(Path, sys.argv[1:])
assert sha256(tokenizer.read_bytes()).hexdigest()=="19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d"
assert sha256(template.read_bytes()).hexdigest()=="2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4"
tok=Tokenizer.from_file(str(tokenizer))
chat=ImmutableSandboxedEnvironment(trim_blocks=True,lstrip_blocks=True,extensions=['jinja2.ext.loopcontrols']).from_string(template.read_text())
old,new=json.loads((root/'markets.json').read_text())
rows=[]
ledger=[json.loads(l) for l in (root/'physical.jsonl').read_text().splitlines()]
for r in ledger:
    if r['kind']!='start' or r['role'] not in ('planner','extractor'):continue
    original=r['body']['messages']
    sent=old if r['arm']=='A' else new
    hits=sum(m['content'].count(sent) for m in original)
    if hits!=1:
        rows.append(dict(id=r['id'],hits=hits))
        continue
    def local(catalog):
        messages=[{**m,'content':m['content'].replace(sent,catalog)} for m in original]
        rendered=chat.render(messages=messages,tools=None,add_generation_prompt=True,reasoning_effort='low')
        return len(tok.encode(rendered,add_special_tokens=False).ids)
    baseline,candidate=local(old),local(new)
    end=next(x for x in ledger if x['kind']=='end' and x['id']==r['id'])
    rows.append(dict(id=r['id'],arm=r['arm'],role=r['role'],hits=hits,reported=(end.get('usage') or {}).get('prompt_tokens'),
                     localA=baseline,localB=candidate,localSaved=baseline-candidate))
(root/'token-comparison.json').write_text(json.dumps(rows,indent=2)+'\n')
if (root/'offline-wire.json').exists():
    observed=json.loads((root/'offline-wire.json').read_text())
    comparison=[]
    for a,b in zip(observed['A'],observed['B'],strict=True):
        assert a['role']==b['role'] and a['normalized']==b['normalized']
        def count(messages):
            return len(tok.encode(chat.render(messages=messages,tools=None,add_generation_prompt=True,reasoning_effort='low'),add_special_tokens=False).ids)
        original,compact=count(a['messages']),count(b['messages'])
        comparison.append({'localST':a['role'],'A':original,'B':compact,'deltaBminusA':compact-original})
    (root/'offline-tokens.json').write_text(json.dumps(comparison,indent=2)+'\n')
