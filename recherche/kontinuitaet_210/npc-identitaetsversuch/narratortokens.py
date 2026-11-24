"""Evaluate full paired Narrator arrays using the pinned GLM template and tokenizer."""
import hashlib
import json
from pathlib import Path
import sys
from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer


def checked(filename, digest):
    path = Path(filename)
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError('Unexpected SHA-256 for ' + path.name)
    return path


tokenizer = Tokenizer.from_file(str(checked(sys.argv[1], '19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d')))
template = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True,
    extensions=['jinja2.ext.loopcontrols']).from_string(checked(sys.argv[2], '2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4').read_text())


def count(messages):
    wire = template.render(messages=messages, tools=None, add_generation_prompt=True, clear_thinking=False, reasoning_effort='low')
    return len(tokenizer.encode(wire, add_special_tokens=False).ids)


rows = []
for line in sys.stdin:
    pair = json.loads(line)
    reference = count(pair['actual'])
    candidate = count(pair['b'])
    rows.append(dict(turn=pair['turn'], request=pair['id'], exact=pair['exact'],
        archivedEngineSHA256=pair['actualSha'], baseEngineSHA256=pair['aSha'],
        candidateEngineSHA256=pair['bSha'], base=reference, candidate=candidate, diff=candidate-reference))
if len(rows) != 21:
    raise ValueError('Expected all 21 archived Narrator calls')
print(json.dumps({
    'paired': len(rows), 'exact': sum(r['exact'] for r in rows),
    'changed': sum(r['baseEngineSHA256'] != r['candidateEngineSHA256'] for r in rows),
    'base': sum(r['base'] for r in rows), 'candidate': sum(r['candidate'] for r in rows),
    'delta': sum(r['diff'] for r in rows), 'rows': rows,
}, indent=2))
