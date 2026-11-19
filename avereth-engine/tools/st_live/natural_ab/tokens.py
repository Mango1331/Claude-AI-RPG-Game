"""Verify wire-body joins using proxy hashes, count visible GLM content, and isolate the market substitution."""
from hashlib import sha256
import json
import os
from pathlib import Path
import sys
from tokenizers import Tokenizer
from jinja2.sandbox import ImmutableSandboxedEnvironment

def verified(variable,digest):
    f=Path(os.environ[variable])
    if sha256(f.read_bytes()).hexdigest()!=digest: raise ValueError(variable+" has a different revision")
    return f
tok=Tokenizer.from_file(str(verified('AVERETH_GLM_TOKENIZER','19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d')))
template=ImmutableSandboxedEnvironment(trim_blocks=True,lstrip_blocks=True,extensions=['jinja2.ext.loopcontrols']).from_string(
    verified('AVERETH_GLM_TEMPLATE','2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4').read_text())
count=lambda s:len(tok.encode(s,add_special_tokens=False).ids)
root=Path(sys.argv[1]);data=json.loads((root/'wire.json').read_text())
log={r['id']:r for r in map(json.loads,(root/'physical.jsonl').read_text().splitlines()) if r['kind']=='end'}
result=[]
for row in data['rows']:
    m=row['messages']
    assert sha256(json.dumps(m,ensure_ascii=False).encode()).hexdigest()==row['hash'],row['id']
    wire=lambda messages:count(template.render(messages=messages,tools=None,add_generation_prompt=True,reasoning_effort=row.get('reasoning_effort'),clear_thinking=row.get('clear_thinking',False)))
    actual=wire(m)
    end=log.get(row['id'],{})
    u=end.get('usage') or {}
    short=data['short']
    market=None
    if row['arm']=='B' and row['role'] in ('planner','extractor') and sum(x['content'].count(short) for x in m)==1:
        market=wire([{**x,'content':x['content'].replace(short,data['old'])} for x in m])-actual
    result.append(dict(id=row['id'],templateInput=actual,reportedInput=u.get('prompt_tokens'),visibleContent=count(end['text']) if 'text' in end else None,
                       boardFormat=row['boardFormat'],counterfactualMarketInput=market))
(root/'token-metrics.json').write_text(json.dumps(result,indent=2)+'\n')
