#!/usr/bin/env python3
"""Module sizes, fan-in and fan-out of src/ and index.js. Run from the avereth-engine root."""
import re,os,glob,collections,sys
root='src'; files=sorted(glob.glob('src/**/*.js',recursive=True))+['index.js']
imp=collections.defaultdict(set); size={}
for f in files:
    t=open(f).read(); size[f]=(t.count('\n'),len(t))
    for m in re.finditer(r"""(?:import|export)\s[^;]*?from\s+['"](\.[^'"]+)['"]""",t):
        p=os.path.normpath(os.path.join(os.path.dirname(f),m.group(1)))
        imp[f].add(p)
fanin=collections.Counter()
for f,s in imp.items():
    for p in s: fanin[p]+=1
print('files',len(files),'lines',sum(v[0] for v in size.values()),'bytes',sum(v[1] for v in size.values()))
print('\nTop by size (lines, KB, fan-in, fan-out):')
for f,(l,b) in sorted(size.items(),key=lambda x:-x[1][1])[:30]:
    print(f'{l:6d} {b//1024:4d}KB in={fanin[f]:3d} out={len(imp[f]):3d} {f}')
