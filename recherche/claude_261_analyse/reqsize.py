#!/usr/bin/env python3
"""Request sizes, prompt/completion/cached tokens per role over archived runs. Arg: testrun_10b directory."""
import gzip,json,glob,os,sys,statistics as st,collections,re
base=sys.argv[1]
by=collections.defaultdict(list); usage=collections.defaultdict(list); builds=collections.Counter()
sect=collections.defaultdict(list)
for run in sorted(glob.glob(os.path.join(base,'openrouter-20261127-*'))):
    p=os.path.join(run,'requests.jsonl.gz')
    if not os.path.exists(p): continue
    for l in gzip.open(p,'rt').read().splitlines():
        if not l.strip(): continue
        r=json.loads(l)
        if r.get('kind')=='start':
            msgs=(r.get('body') or {}).get('messages') or []
            n=sum(len(m.get('content') or '') if isinstance(m.get('content'),str) else len(json.dumps(m.get('content'))) for m in msgs)
            role=r.get('role'); by[role].append(n)
            if role in('planner','extractor') and msgs:
                sysm=msgs[0].get('content') if isinstance(msgs[0].get('content'),str) else ''
                sect[role].append(len(sysm))
        if r.get('kind') in ('end','done','response') and r.get('usage'):
            u=r['usage']; usage[r.get('role')].append((u.get('prompt_tokens'),u.get('completion_tokens'),(u.get('prompt_tokens_details') or {}).get('cached_tokens')))
for k,v in by.items(): print(k,'n',len(v),'chars median',int(st.median(v)),'p90',sorted(v)[int(len(v)*.9)])
for k,v in sect.items(): print(k,'system chars median',int(st.median(v)))
for k,v in usage.items():
    pt=[x[0] for x in v if x[0]]; ct=[x[1] for x in v if x[1]]; ca=[x[2] for x in v if x[2] is not None]
    print(k,'usage n',len(v),'prompt med',st.median(pt) if pt else None,'compl med',st.median(ct) if ct else None,'cached n',len(ca),'cached med',st.median(ca) if ca else None)
