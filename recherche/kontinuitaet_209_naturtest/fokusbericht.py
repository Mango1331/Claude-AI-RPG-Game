"""Create a short human-readable cross-case measurement table from the audited arm archives."""
from collections import Counter
from decimal import Decimal
import gzip
import json
from pathlib import Path
import statistics
import sys

root=Path(sys.argv[1]); source=json.loads(gzip.decompress((root/'fokuskennzahlen.json.gz').read_bytes()))
details=Path(sys.argv[2]).read_text()
names={'bren':'Bren und Cottage','wagen':'Tam und geladener Wagen','wren':'Wren, Rückgabe C21','gruene-tuer':'Expliziter Weg zur grünen Tür','tasche':'Wrens Tasche, Übernahme C19','namenswissen':'Danns Namenswissen'}
rows=[];pairs_ready=[];pairs_input=[];pairs_cost=[];totals=[Counter(),Counter()]
for k,f in source.items():
    pair=[f['arms'][arm] for arm in ('A','B')]
    assert pair[0]['start_world']==pair[1]['start_world'] and all(a['reload'] for a in pair)
    results=[]
    for ix,a in enumerate(pair):
        n=sum(a['provider_request_roles'].values()); rep=sum(a['repairs'].values())
        totals[ix].update({'n':n,'input':a['input'],'output':a['output'],'cache':a['cache'],'reasoning':a['reasoning'],'cost':Decimal(a['reported_cost']),'rep':rep})
        sec=lambda x:f'{x/1000:.1f}' if x is not None else '–'
        results.append([str(n),str(rep),str(a['input']),str(a['output']),sec(a['first_sentence_ms']),sec(a['ready_ms']),a['reported_cost']])
    rows.append('| '+' | '.join([names[k]]+[' / '.join(x) for x in zip(*results)])+' |')
    if all(a['ready_ms'] is not None for a in pair):pairs_ready.append(pair[1]['ready_ms']-pair[0]['ready_ms'])
    pairs_input.append(pair[1]['input']-pair[0]['input'])
    pairs_cost.append(Decimal(pair[1]['reported_cost'])-Decimal(pair[0]['reported_cost']))
lines=['# Sechs gepaarte natürliche Originalpräfixe','',
'Je Vergleich wurde derselbe gespeicherte Präfix auf zwei getrennten echten ST-Hosts geladen. Spielertext, Welt und Ereignisse sind innerhalb des Paars identisch. Alle Modellantworten nach dem Schnitt wurden frisch über OpenRouter / Relace erzeugt. A ist die Referenz bei `a854cd6759712571f078bff52e7fe439858b8454`, B der korrigierte Kandidat bei `82b2b30ef86507a4eeeaf4c72e006f80a6d5e8bc`.','',
'Jede Doppelangabe steht in der Reihenfolge Referenz A / Kandidat B. Das Timing reicht von der Spielereingabe bis zur ersten vollständig lesbaren Prosa bzw. zur beobachteten sicheren Folgeeingabe nach bestätigter Speicherung. Alle Zustände wurden zusätzlich neu geladen und mit dem vorher gespeicherten Ereignisstand verglichen.','',
'| Präfix | Aufrufe | Repairs | Inputtokens | Outputtokens | Erste Prosa (s) | Sichere Eingabe (s) | Kosten (USD) |','|---|---:|---:|---:|---:|---:|---:|---:|',*rows,'']
for label,r in zip(('A','B'),totals):
    lines.append(f"{label} umfasste {r['n']} physische Requests mit {r['rep']} zusätzlichen Rollenaufrufen, {r['input']} Eingabe- und {r['output']} Ausgabetokens. OpenRouter meldete {r['cache']} enthaltene Cache- und {r['reasoning']} enthaltene Reasoningtokens und {r['cost']} USD.")
    lines.append('')
lines.extend([f"Der Median der paarweisen B−A-Differenzen betrug {statistics.median(pairs_input):g} Inputtokens. Bei den {len(pairs_ready)} Paaren mit vollständiger Zeitbeobachtung lag er bei {statistics.median(pairs_ready)/1000:.2f} s bis zur sicheren Folgeeingabe. Die sechs Paare bilden verschiedene Aufgaben ab. Neue Narratorantworten verändern den folgenden Extractorinput. Segmente lagen zeitlich auseinander, die lokale Hostlast war unterschiedlich. Diese Werte beschreiben den Versuch; eine Softwarebeschleunigung lässt sich daraus allein nicht ableiten.",'',details,'','[Maschinenlesbare Gegenüberstellung](fokuskennzahlen.json.gz) · [Quellen und SHA-256](SOURCE_MANIFEST.md) · [Versuchsprotokoll](../../recherche/kontinuitaet_209_naturtest/VERSUCHSPROTOKOLL.md)'])
(root/'README.md').write_text('\n'.join(lines)+'\n')
