"""Build the offline .261 corpus from main's original OpenRouter archives (directory, output)."""
import collections
import gzip
import hashlib
import json
import sys
from pathlib import Path

archives, output = map(Path, sys.argv[1:])
output.mkdir(exist_ok=True, parents=True)
used_generations = set()
manifest = {}
messages = {}
def rows(path):
    return [json.loads(line) for line in gzip.open(path, 'rt') if line.strip()]
def chat(path):
    return [m for m in rows(path) if 'mes' in m]
def digest(data):
    return hashlib.sha256(data).hexdigest()
def slim(m):
    r = m.get('extra', {}).get('avereth')
    return {**{k:m[k] for k in ('mes','is_user','is_system','swipe_id','name') if k in m},
            'extra':{**{k:v for k,v in m.get('extra',{}).items() if 'action_input' in k},
                     **({'avereth':{k:v for k,v in r.items() if k not in ('hud','panel')}} if r else {})}}

for folder in sorted(archives.glob('openrouter-20261127-*')):
    build = int(folder.name.split('-')[-1])
    # Earlier series used a different prefix protocol; include traceable combat and social turns.
    if build < 241 and folder.name.split('-')[-2] not in ('aa','s','ai','aj','ak','y'): continue
    source = json.loads((folder/'SOURCE_MANIFEST.json').read_text())
    for name, sha in source['sha256'].items():
        if digest((folder/name).read_bytes()) != sha: raise ValueError(str(folder/name))
    original = chat(folder/'chat.jsonl.gz')
    turns = rows(folder/'turns.jsonl.gz') if (folder/'turns.jsonl.gz').exists() else []
    parent = None
    if (folder/'parent-check.json.gz').exists():
        check = json.load(gzip.open(folder/'parent-check.json.gz'))
        parent = check['parent'].split()[0]
        initial = chat(folder/'chat-0.jsonl.gz')
        start = len(initial)
        assert start == check['count'] and chat(archives/parent/'chat.jsonl.gz')[:start] == initial
    else:
        start = min(t['inputMessageIndex'] for t in turns if t.get('inputMessageIndex') is not None)
        # Pre-.241 sometimes took an explicitly truncated prefix; retain the actual starting state.
        proof = folder/'PREFIX.json'
        parent = json.loads(proof.read_text()) if proof.exists() else 'archived starting messages'
    physical = rows(folder/'requests.jsonl.gz')
    starts = {r['id']:r for r in physical if r['kind']=='start'}
    for v in starts.values():
        if v['body']['messages'][0]['content'].startswith('Name new fantasy Skills already authorized'):
            v['role']='forge'  # the old recorder labelled Sage's forge request as narrator
    ends = {r['id']:r for r in physical if r['kind']=='end'}
    assert len(starts)==sum(r['kind']=='start' for r in physical)
    mapped = {}
    omitted = {}
    cases = {}
    narrators = {}
    ids = []
    for m in original:
        body = json.dumps(slim(m),ensure_ascii=False,separators=(',',':')).encode()
        key = digest(body)
        ids.append(key)
        messages.setdefault(key, json.loads(body))
    for t in turns:
        i = t.get('inputMessageIndex')
        if i is None or i<start: continue
        envelopes = [v for v in starts.values() if v['role']=='narrator' and v.get('turn')==t['n']]
        if len(envelopes)==1:
            msgs=envelopes[0]['body']['messages']
            if sum(m['content'].startswith('[AVERETH ENGINE —') for m in msgs)==1:
                narrators[i]=msgs
        for j in [i,i+1]:
            if j>=len(original): continue
            m=original[j]
            r=m.get('extra',{}).get('avereth') or {}
            if not (r.get('input_hash') is not None if j==i else r.get('extraction')):continue
            calls=[c for k in ('plan','board','forge','extraction') for c in (r.get(k) or {}).get('llm',[]) or []]
            if r.get('party_call'):calls.append(r['party_call'])
            answers=[]
            for c in calls:
                role=c['purpose'].split('_')[0]
                role={'plan':'planner','extract':'extractor','party':'party_decision','interpret':'planner'}.get(role,role)
                matches=[k for k,v in starts.items() if k not in mapped and v.get('turn')==t['n'] and v['role']==role
                         and ends.get(k,{}).get('ok') and (ends[k].get('usage') or {}).get('prompt_tokens')==c.get('prompt')
                         and ends[k]['usage'].get('completion_tokens')==c.get('completion')]
                if len(matches)!=1:
                    omitted[j]=f'{c["purpose"]}: {len(matches)} unique candidates or transport failure'
                    break
                k=matches[0]
                raw=json.load(gzip.open(folder/f'raw-{k}.gz'))
                gid=ends[k]['generationId']
                assert raw['id']==gid and raw['usage']['prompt_tokens']==c['prompt'] and raw['usage']['completion_tokens']==c['completion']
                answers.append({'id':k,'generation':gid,'purpose':c['purpose'],'content':raw['choices'][0]['message']['content']})
            if j in omitted:continue
            for a in answers:
                assert a['generation'] not in used_generations
                used_generations.add(a['generation'])
                mapped[a['id']]=j
            cases[j]=answers
    unassigned={k:[v['role'],v.get('turn')] for k,v in starts.items() if v['role']!='narrator' and k not in mapped}
    manifest[folder.name]={'parent':parent,'inherited':start,'source':source['sha256']['chat.jsonl.gz'],'commit':source.get('commit'),
                          'excluded_records':omitted,'unassigned_requests':unassigned,'cases':len(cases),'calls':len(mapped)}
    data={'messages':ids,'cases':cases,'narrators':narrators}
    (output/(folder.name+'.json.gz')).write_bytes(gzip.compress(json.dumps(data,separators=(',',':')).encode(),mtime=0))
(output/'messages.json.gz').write_bytes(gzip.compress(json.dumps(messages,ensure_ascii=False,separators=(',',':')).encode(),mtime=0))
(output/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
