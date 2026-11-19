"""Render archived GLM requests; emit aggregate counts only."""
import hashlib
import json
import os
from pathlib import Path
import sys
from tokenizers import Tokenizer
from jinja2.sandbox import ImmutableSandboxedEnvironment


def pinned(key, digest):
    path = Path(os.environ[key])
    assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
    return path


tokenizer = Tokenizer.from_file(str(pinned('AVERETH_GLM_TOKENIZER','19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d')))
template = ImmutableSandboxedEnvironment(trim_blocks=True,lstrip_blocks=True,extensions=['jinja2.ext.loopcontrols']).from_string(
    pinned('AVERETH_GLM_TEMPLATE','2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4').read_text())


def count(text):
    return len(tokenizer.encode(text,add_special_tokens=False).ids)


def wire(messages,req):
    return count(template.render(messages=messages, tools=None, add_generation_prompt=True,
        clear_thinking=req.get('clear_thinking',False),reasoning_effort=req.get('reasoning_effort')))


j=json.load(sys.stdin)
a,b=j['full'],j['short']
savings=[]
for row in j['market']:
    r=row['req']
    assert wire(r['messages'],r) == row['prompt']
    savings.append(row['prompt']-wire([dict(m,content=m['content'].replace(a,b)) for m in r['messages']],r))
x={}
for item in j['x']:
    r=item['req']
    name=item['name'][:2]
    rec=x.setdefault(name,dict(requests=0,overhead=0,original=0,compact=0))
    rec['overhead']+=wire(item['b'],r)-wire(r['messages'],r)
    rec['requests']+=1
for sample in j['sizes']:
    rec=x[sample['name'][:2]]
    rec['original']+=count(sample['a'])
    rec['compact']+=count(sample['b'])
ctx={}
for item in j['context']:
    rec=ctx.setdefault(item['key'],dict(revisions=0,full=0,lower=0))
    rec['revisions']+=1
    for key in ['full','lower']:rec[key]+=count(item[key])
domains={
    'combat':['creature.new','hostile','position','aware','intent','recover'],
    'people':['person.new','person.named','enter','leave','fact','learn','attitude','memory','thread'],
    'trade':['offer','bid','coin.gift','coerce','object.new','object.move','object.mark'],
    'guild':['quest.detail','quest.progress','quest.ready','quest.close','listing.gone','guild.branch'],
    'travel':['arrive','place.reported','feature','passage','dungeon','area'],
    'other':['time','overreach'],
}
schemas=j['systems']['X'].split('Deltas:\n')[-1]
costs={name:sum(count(line+'\n') for line in schemas.splitlines() if any(line.startswith('- '+k+' {') for k in keys)) for name,keys in domains.items()}
# Source-delimited sections; totals for independently encoded blocks may differ at BPE boundaries.
starts={
    'P story':['You are the command','Rules:', 'Commands:', 'Examples (another town, not', 'Answer with', 'Guild contracts (', 'Handing over (', 'Steps that build', 'Learning and training', 'Ordinary meals', 'Commands for that:', 'Examples (another place', 'Return only one JSON'],
    'P combat':['You are the intent','Ordinary meals','Commands for that:', 'Examples (another place', 'In a fight (', 'Story commands (', 'Answer with', 'Return only one JSON'],
    'X':['You read one reply','Rules:', 'FORMAT RULES', 'Deltas:', 'Answer with', 'Return only one JSON'],
}
sections={}
for name,prefixes in starts.items():
    lines=j['systems'][name].splitlines(keepends=True)
    indices=[next(i for i,line in enumerate(lines) if line.startswith(prefix)) for prefix in prefixes]
    assert indices==sorted(set(indices))
    sections[name]={k:count(''.join(lines[a:b])) for k,a,b in zip(prefixes,indices,indices[1:]+[len(lines)])}
assert len([line for line in schemas.splitlines() if line.startswith('- ')])==sum(map(len,domains.values()))
print(json.dumps(dict(sections=sections,market=dict(requests=len(savings),a=count(a),b=count(b),saved=sum(savings)),
    system={k:count(v) for k,v in j['systems'].items()},selectedDeltaLines=costs,extractor=x,context=ctx,
    boards=[dict(name=i['name'],kind=i['kind'],a=count(i['full']),b=count(i['short']),initialInputDelta=wire(i['proposed'],i)-wire(i['oldRequest'],i)) for i in j['boards']])))
