#!/usr/bin/env python3
"""Turn latency marks (click, firstProse, lastRenderedChange, ready) over archived runs. Arg: testrun_10b directory."""
import gzip,json,glob,os,statistics as st,sys
base=sys.argv[1]
fp=[];commit=[];after=[];wait=[];native=[]
for run in sorted(glob.glob(os.path.join(base,'openrouter-20261127-*'))):
    p=os.path.join(run,'turns.jsonl.gz')
    if not os.path.exists(p): continue
    for l in gzip.open(p,'rt').read().splitlines():
        if not l.strip(): continue
        t=json.loads(l); m=(t.get('timing') or {}).get('marks') or {}; w=(t.get('timing') or {}).get('world') or {}
        c=m.get('click'); 
        if c is None: continue
        if m.get('firstProse'): fp.append((m['firstProse']-c)/1000)
        if m.get('ready'): commit.append((m['ready']-c)/1000)
        if m.get('ready') and m.get('lastRenderedChange'): after.append((m['ready']-m['lastRenderedChange'])/1000)
        if w.get('extraction_validation_wait_ms') is not None: wait.append(w['extraction_validation_wait_ms']/1000)
        if not m.get('firstProse') and m.get('ready'): native.append((m['ready']-c)/1000)
def s(x): 
    x=sorted(x); return f"n={len(x)} median={st.median(x):.1f}s p75={x[int(len(x)*.75)]:.1f}s p90={x[int(len(x)*.9)]:.1f}s" if x else 'n=0'
print('click→firstProse ', s(fp)); print('click→ready      ', s(commit)); print('lastRender→ready ', s(after)); print('X-validation wait', s(wait)); print('turns without prose (local/native) click→ready', s(native))
