"""Send one player decision. Its result exposes only the answer and player-facing system text."""
import json, os, time, sys
from pathlib import Path
arm,op=sys.argv[1:3]
assert arm in ('B','C') and op in ('play','end','view')
root=Path(os.environ['AVERETH_AB_DIR'])/arm
if op!='view':
    cmd={'seq':time.time_ns()//1000000,'op':op}
    if op=='play': cmd.update(text=sys.argv[3], intent_before_narration=sys.argv[4])
    p=root/'command.tmp';p.write_text(json.dumps(cmd));p.replace(root/'command.json')
    while True:
        r=json.loads((root/'response.json').read_text())
        if r.get('seq')==cmd['seq']:break
        time.sleep(.4)
    print({k:r[k] for k in r if k in ('n','complete','closed','error','blocked')})
if op != 'view' and (r.get('error') or r.get('blocked')):
    sys.exit(1)
v=json.loads((root/'visible.json').read_text())
for m in v['messages'][-2:]:
    text=m['text']
    if len(text)>1850: text=text[:180]+' […] '+text[-1650:]
    print(m['name'],text,m.get('engine','')[:300])
if v.get('controls'):
    print('Visible actions:', ', '.join(v['controls'])[:400])
if v.get('hud'):
    print('Visible HUD:', ' / '.join(line for line in str(v['hud']).splitlines() if line.startswith(('World —','Location:', 'Present:', 'Resources:')))[:400])
