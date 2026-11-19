"""Token counts and prefixes only. Input is the mock's final message arrays."""
import hashlib
import json
import os
import sys
from pathlib import Path

from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer


def pinned(variable, digest):
    path = Path(os.environ[variable])
    if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        raise ValueError(f"Unexpected {variable} revision")
    return path


tokenizer = Tokenizer.from_file(str(pinned("AVERETH_GLM_TOKENIZER", "19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d")))
template_file = pinned("AVERETH_GLM_TEMPLATE", "2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4")
template = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True, extensions=["jinja2.ext.loopcontrols"]).from_string(template_file.read_text())


def encode(messages):
    text = template.render(messages=messages, tools=None, add_generation_prompt=True, reasoning_effort="low", clear_thinking=False)
    return tokenizer.encode(text, add_special_tokens=False).ids


tokens = []
prefix = []
for arm in json.load(sys.stdin):
    a, b = map(encode, arm)
    tokens.append([len(a), len(b)])
    prefix.append(next((i for i, pair in enumerate(zip(a, b)) if pair[0] != pair[1]), min(len(a), len(b))))
print(json.dumps(dict(tokens=tokens, prefix=prefix)))
