"""Compare fresh generations only where the input and complete pre-turn world were actually identical."""
import gzip,json,sys
from pathlib import Path
from statistics import median
base=Path(sys.argv[1]); data={}
for d in base.iterdir():
    if not (d/'messwerte.json').exists():continue
    obj=json.loads((d/'messwerte.json').read_bytes())
    turns=json.loads(gzip.decompress((d/'zugauswertung.json.gz').read_bytes()))
    worlds=[json.loads(l) for l in gzip.decompress((d/'reload-welten.jsonl.gz').read_bytes()).splitlines()]
    data[obj['arm']]={t['turn']:(t,next(w['state'] for w in worlds if w['after']==t['turn']-1)) for t in turns}
pairs=[
    ('Hofstart','PA',1,'HB',1),('Gildenstart','GA',1,'GB',1),
    ('Hofausgang','PA',3,'XA',1),('Versorgungssack','K2',1,'HB',6),
    ('Versorgungssack, Formatversuch','HB',6,'YB',1),('Hofausgang, Formatversuch','XA',1,'XB',1),
    ('Ölzeug, Besitzkorrektur','HB',13,'PB',1)]
results=[]
for name,a,i,b,j in pairs:
    first,wa=data[a][i];second,wb=data[b][j]
    assert first['input']==second['input'] and wa==wb,(name,i,j)
    def view(t):
        return dict(complete=t['complete'],site=t['arrival_after_reload'],refs=len(t['physical']),
            roles=[p[1] for p in t['physical']],repairs=t['repeat_role_requests'],first=t['T4_ms']['firstProse'],
            ready=t['T4_ms']['ready'],input=t['provider_input'],output=t['provider_output'],usd=t['provider_cost'])
    v,z=view(first),view(second)
    results.append(dict(name=name,left=[a,i],right=[b,j],player=first['input'],first=v,second=z,
        difference={k:z[k]-v[k] if z[k] is not None and v[k] is not None else None for k in ['refs','first','ready','input','output']}))
basepairs=results[:4]
print(json.dumps({'paired':results,'original_211_minus_210_median':{k:median([r['difference'][k] for r in basepairs if r['difference'][k] is not None]) for k in ['refs','first','ready','input','output']},'pairs_in_original_comparison':len(basepairs)},indent=2,ensure_ascii=False))
