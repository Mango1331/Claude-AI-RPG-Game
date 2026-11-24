"""Create a three-input, independently named ST host from the actual saved C19/B reply."""
from pathlib import Path
import gzip
import json
import sys

root=Path(sys.argv[1]).resolve()
src=root/'focus'/'tasche'/'B'
folder=root/'zusatz';(folder/'B').mkdir(parents=True,exist_ok=True)
assert not (folder/'B'/'actions.jsonl').exists()
repo=Path(__file__).resolve().parents[2]
archive=repo/'testrun_10b/openrouter-20261124-kontinuitaet-fokus/tasche/B/original-chat.jsonl.gz'
raw=gzip.decompress(archive.read_bytes())
assert raw== (src/'chat.jsonl').read_bytes()
(folder/'start.jsonl').write_bytes(raw)
s=(root/'final/player.mjs').read_text()
def repl(a,b):
    global s
    assert s.count(a)==1,a
    s=s.replace(a,b)
repl("root=path.join(shared,'final',arm)","root=path.join(shared,'zusatz',arm)")
repl("path.join(shared,'start.jsonl')","path.join(shared,'zusatz','start.jsonl')")
repl('18841:18842','19041:19042');repl('gate({arm,turn:700+n})','gate({arm,turn:900+n})')
repl('e.turn!==700+n','e.turn!==900+n');repl('current.turn>700&&current.turn<=722','current.turn>900&&current.turn<=903')
repl('n<22','n<3')
(folder/'player.mjs').write_text(s)
