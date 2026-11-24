"""Compare a real earlier player edit with the unedited paid overnight stay."""
import json
from pathlib import Path
import sys

base=Path(sys.argv[1])
def get(arm,kind,n):return json.loads((base/arm/f'{kind}-{n}.json').read_bytes())
revisions=[json.loads(l) for l in (base/'QE/revision-results.jsonl').read_bytes().splitlines()]
assert [r['method'] for r in revisions]==['newSwipe','left','edit']
assert get('QE','world',0)==get('GB','world',26)
assert get('QE','world',2)==get('GB','world',26)
assert get('QE','world',3)==get('GB','world',24)
rows=[]
for n,phase in enumerate(['import','andere Schlafantwort','Rückwahl','frühere Kaufentscheidung editiert','neuer Folgeturn']):
    w=get('QE','world',n)
    s=w['entities']['pc']['sheet']
    hud=get('QE','visible',n)['hud'].splitlines()
    coins=next(line for line in hud if line.startswith('Coin:'))
    resources=next(line for line in hud if line.startswith('Resources:'))
    money,hp,mp=(20,95,72) if n<3 else (26,31,33)
    assert (s['coin_cp'],s['hp'],s['mp'])==(money,hp,mp)
    assert coins==('Coin: 2 Silver' if n<3 else 'Coin: 2 Silver 6 Copper')
    assert f'HP {hp}/95' in resources and f'MP {mp}/72' in resources
    rows.append(dict(n=n,phase=phase,minute=w['clock']['minute'],coin_cp=money,hp=hp,mp=mp,hud=[coins,resources]))
print(json.dumps(rows,ensure_ascii=False,indent=2))
