"""Tokenise the P/X arrays emitted by archivreplay.mjs on the same original prefix."""
from collections import defaultdict
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys

from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer


def checked_file(variable, digest):
    path = Path(os.environ[variable])
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f'Unexpected SHA-256 for {variable}')
    return path


tokenizer = Tokenizer.from_file(str(checked_file('AVERETH_GLM_TOKENIZER',
    '19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d')))
template = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True,
    extensions=['jinja2.ext.loopcontrols']).from_string(checked_file('AVERETH_GLM_TEMPLATE',
    '2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4').read_text())


def tokens(messages):
    rendered = template.render(messages=messages, tools=None, add_generation_prompt=True,
                               clear_thinking=False, reasoning_effort='low')
    return len(tokenizer.encode(rendered, add_special_tokens=False).ids)


def counts():
    return dict(n=0, referenceInput=0, candidateInput=0, referenceEqualsPhysicalArray=0,
                candidateEqualsPhysicalArray=0, minDelta=None, maxDelta=None)


rows = defaultdict(counts)
for filename in sys.argv[1:]:
    for sample in json.loads(gzip.decompress(Path(filename).read_bytes())):
        k = sample['purpose']
        stats = rows[k]
        a, b = (tokens(sample[arm]) for arm in ['a', 'b'])
        stats['n'] += 1
        stats['referenceInput'] += a
        stats['candidateInput'] += b
        stats['referenceEqualsPhysicalArray'] += sample['a'] == sample['archived']
        stats['candidateEqualsPhysicalArray'] += sample['b'] == sample['archived']
        d = b - a
        if stats['minDelta'] is None or d < stats['minDelta']:
            stats['minDelta'] = d
        if stats['maxDelta'] is None or d > stats['maxDelta']:
            stats['maxDelta'] = d
print(json.dumps(dict(rows), indent=2))
