"""Read board_slot_offline.mjs --token-samples JSON on stdin. No provider or network."""
import hashlib
import json
import sys
from pathlib import Path

from jinja2.sandbox import ImmutableSandboxedEnvironment
from tokenizers import Tokenizer


def pinned_file(arg, digest):
    path = Path(arg)
    assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
    return path


tokenizer = Tokenizer.from_file(str(pinned_file(sys.argv[1], '19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d')))
env = ImmutableSandboxedEnvironment(trim_blocks=True, lstrip_blocks=True, extensions=['jinja2.ext.loopcontrols'])
template = env.from_string(pinned_file(sys.argv[2], '2614a3c896d53e265f564c23701173c0049f985dacfbae79fc4bcd9f5ba083f4').read_text())


def tokens(text):
    return len(tokenizer.encode(text, add_special_tokens=False).ids)


for row in json.load(sys.stdin):
    def prompt(messages):
        return tokens(template.render(messages=messages, tools=None, add_generation_prompt=True,
                                      reasoning_effort=row.get('reasoning_effort'),
                                      clear_thinking=row.get('clear_thinking', False)))

    original = prompt(row['fullMessages'])
    assert original == row['promptTokens']
    print(json.dumps(dict(name=row['name'], fullInput=original, slotInput=prompt(row['slotMessages']),
                          originalText=tokens(row['actual']), fullCompact=tokens(row['compact']),
                          slotCompact=tokens(row['slot']), fullUtf8=len(row['compact'].encode()),
                          slotUtf8=len(row['slot'].encode()))))
