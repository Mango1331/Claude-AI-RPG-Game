"""Audit the single fully parsed routing rejection in this run, retain its cost reserve and make a joined export."""
from pathlib import Path
from hashlib import sha256
import gzip
import json
import shutil
import sys

GEN='gen-1795512880-657V3jk4KwnaFcJTeL9d'
BODY='1fd1e0b9f2efc5c92b0d23535606ff6776255452847d551c3c074b68862a4b1f'
def confirmed_limit(e,root):
    if e.get('id')!=118 or e.get('generationId')!=GEN or e.get('status')!=429 or e.get('role')!='planner' or e.get('turn')!=707:
        return False
    body=gzip.decompress((root/e['rawFile']).read_bytes())
    err=json.loads(body)['error']
    return (sha256(body).hexdigest()==BODY and err['code']==429 and err['metadata']['provider_name']=='Relace'
            and err['metadata']['limit_source']=='upstream_provider_shared_pool' and 'temporarily rate-limited upstream' in err['metadata']['raw'])

def join(root):
    initial=root/'final/B';later=root/'resume/B';out=root/'joined/B'
    out.mkdir(parents=True,exist_ok=True)
    def read(p):return json.loads(p.read_bytes())
    def rows(p):return [json.loads(x) for x in p.read_bytes().splitlines()]
    def write(p,rs):p.write_text(''.join(json.dumps(v,ensure_ascii=False)+'\n' for v in rs))
    a=rows(initial/'actions.jsonl');ta=rows(initial/'turns.jsonl');b=rows(later/'actions.jsonl');tb=rows(later/'turns.jsonl')
    assert [x['n'] for x in a]==list(range(1,8)) and [x['n'] for x in ta]==list(range(1,7))
    assert [x['n'] for x in b]==[x['n'] for x in tb]==list(range(7,7+len(b)))
    assert a[-1]['text']==b[0]['text'] and a[-1]['intent_before_narration']==b[0]['intent_before_narration']
    assert read(initial/'world-6.json')==read(later/'world-6.json')
    assert read(later/'profile.json')['initial']==ta[-1]['checked']
    assert rows(initial/'chat.jsonl')[1:]==rows(later/'chat.jsonl')[1:32]
    write(out/'actions.jsonl',a[:6]+b);write(out/'turns.jsonl',ta+tb)
    for p in initial.glob('world-*.json'):shutil.copyfile(p,out/p.name)
    for p in later.glob('world-*.json'):shutil.copyfile(p,out/p.name)
    for source in (initial/'profile.json',later/'chat.jsonl',later/'events.json'):shutil.copyfile(source,out/source.name)
    (out/'st-timed.log').write_bytes((initial/'st-timed.log').read_bytes()+(later/'st-timed.log').read_bytes())

if __name__=='__main__':join(Path(sys.argv[1]))
