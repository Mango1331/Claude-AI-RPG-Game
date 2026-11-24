"""Prepare an empty independent final ST host without altering the pilot or the physical journal."""
from pathlib import Path
import sys

root=Path(sys.argv[1]).resolve()
folder=root/'final'
(folder/'B').mkdir(parents=True,exist_ok=True)
assert not (folder/'B'/'actions.jsonl').exists(),'Already played'
s=(root/'tools/player.mjs').read_text()
def replace(a,b):
    global s
    assert s.count(a)==1,a
    s=s.replace(a,b)
replace('root=path.join(shared,arm)',"root=path.join(shared,'final',arm)")
replace('18641:18642','18841:18842')
replace('e.turn!==n','e.turn!==700+n')
replace('gate({arm,turn:n})','gate({arm,turn:700+n})')
replace("gate=v=>write(path.join(shared,'gate.json'),v);","gate=v=>{const f=path.join(shared,'gate.json');if(!v.arm){const current=JSON.parse(fs.readFileSync(f));if(current.arm!==arm||!(current.turn>700&&current.turn<=722))return;}write(f,v);};")
replace('writeConfig(inst,port);',"""writeConfig(inst,port);
if(process.env.ST_COMPILED_CACHE){
    const cache=path.resolve(process.env.ST_COMPILED_CACHE);
    assert.equal(path.basename(cache),'_webpack');
    fs.cpSync(cache,path.join(inst.data,'_webpack'),{recursive:true});
}""")
(folder/'player.mjs').write_text(s)
# Retain receipts for initial boot-only profiles. A host may never reuse its predecessor's command file.
for case in (root/'focus').iterdir():
    old=case/'B'
    if (old/'command.json').is_file():
        import json
        assert not (old/'actions.jsonl').exists()
        assert json.loads((old/'response.json').read_text()).get('closed')
        old.rename(case/'B-pilot-boot')
        old.mkdir()
