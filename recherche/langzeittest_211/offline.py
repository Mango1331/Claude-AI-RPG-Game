"""Restore the captured, secret-screened inputs for the reproducible offline comparisons. No network."""
import gzip
import json
from pathlib import Path
import sys

archive, destination = map(Path,sys.argv[1:])
destination.mkdir(exist_ok=False,parents=True)
def bytes_at(path):
    data=path.read_bytes()
    return gzip.decompress(data) if path.suffix=='.gz' else data
def readlines(path): return [json.loads(line) for line in bytes_at(path).splitlines()]
def dump(path,obj): path.write_text(json.dumps(obj,ensure_ascii=False))
def write_rows(path,rows):
    with path.open('w') as file:
        for row in rows:file.write(json.dumps(row,ensure_ascii=False)+'\n')
journal=readlines(archive/'vorpruefung/provider-journal.jsonl.gz')
for extra in ['vorpruefung','empfaenger-teilvergleich','schluessel-teilvergleich']:
    folder=archive/extra
    extra_wire=readlines(folder/'provider-journal.jsonl.gz')
    if extra!='vorpruefung':journal.extend(extra_wire)
    for row in extra_wire:
        if row['kind']!='end' or not row.get('rawFile'):continue
        raw=Path(row['rawFile'])
        assert raw.parent==Path(row['arm'])
        (destination/raw.parent).mkdir(exist_ok=True)
        (destination/raw).write_bytes((folder/raw.name).read_bytes())
for folder in sorted(archive.iterdir()):
    if not (folder/'messwerte.json').exists():continue
    arm=json.loads((folder/'messwerte.json').read_bytes())['arm']
    out=destination/arm
    out.mkdir()
    wire=readlines(folder/'provider-journal.jsonl.gz');journal.extend(wire)
    ends={r['id']:r for r in wire if r['kind']=='end'}
    for response in readlines(folder/'provider-originalantworten.jsonl.gz'):
        raw=Path(ends[response['id']]['rawFile'])
        assert raw.parent==Path(arm)
        (out/raw.name).write_bytes(gzip.compress(response['body'].encode(),mtime=0))
    chat=readlines(folder/'original-chat.jsonl.gz')
    profile=json.loads((folder/'konfiguration.json').read_bytes());dump(out/'profile.json',profile)
    snapshots={0:chat[:profile['initial']['messages']+1]}
    turns=json.loads((folder/'browserzeiten.json').read_bytes())
    for t in turns:snapshots[t['n']]=chat[:t['checked']['messages']+1]
    if (folder/'revisions-chats.jsonl.gz').exists():
        snapshots.update({t['n']:t['chat'] for t in readlines(folder/'revisions-chats.jsonl.gz')})
    for n,snapshot in snapshots.items():write_rows(out/f'chat-{n}.jsonl',snapshot)
    for r in readlines(folder/'reload-welten.jsonl.gz'):dump(out/f"world-{r['after']}.json",r['state'])
    for r in readlines(folder/'sichtbares-spiel.jsonl.gz'):
        n=r.pop('n');dump(out/f'visible-{n}.json',r)
    write_rows(out/'actions.jsonl',json.loads((folder/'spielerabsichten.json').read_bytes()))
    write_rows(out/'turns.jsonl',turns)
    if (folder/'revision-results.jsonl.gz').exists():
        (out/'revision-results.jsonl').write_bytes(bytes_at(folder/'revision-results.jsonl.gz'))
write_rows(destination/'physical.jsonl',sorted(journal,key=lambda r:(r['id'], r['kind']=='end')))
