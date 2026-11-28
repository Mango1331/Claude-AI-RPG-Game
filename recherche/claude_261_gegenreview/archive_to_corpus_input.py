#!/usr/bin/env python3
"""Offline adapter (feasibility probe, no product change): turn one openrouter-20261127-* archive into the input that
tools/replay/build_corpus.mjs reads (chat.jsonl + chat-completions.jsonl with {role, response}). Roles are mapped to the
record purposes (planner -> plan, extractor -> extract). Usage: archive_to_corpus_input.py <archive dir> <out dir>"""
import gzip, json, os, sys
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
ROLE = {'planner': 'plan', 'extractor': 'extract', 'board': 'board', 'forge': 'forge', 'narrator': 'narrator', 'party_decision': 'party_decision'}
chat = gzip.open(os.path.join(src, 'chat.jsonl.gz'), 'rt').read()
open(os.path.join(out, 'chat.jsonl'), 'w').write(chat)
rows = [json.loads(l) for l in gzip.open(os.path.join(src, 'requests.jsonl.gz'), 'rt').read().splitlines() if l.strip()]
start = {r['id']: r for r in rows if r.get('kind') == 'start'}; n = 0; miss = 0
with open(os.path.join(out, 'chat-completions.jsonl'), 'w') as f:
    for r in rows:
        if r.get('kind') != 'end' or r['id'] not in start: continue
        raw = os.path.join(src, f"raw-{r['id']}.gz")
        if not os.path.exists(raw): miss += 1; continue
        text = gzip.open(raw, 'rt').read().strip()
        try: resp = json.loads(text)
        except json.JSONDecodeError:
            # streamed narrator: SSE frames; not needed by the corpus (narrator text is the chat message)
            continue
        f.write(json.dumps({'role': ROLE.get(start[r['id']]['role'], start[r['id']]['role']), 'response': resp}) + '\n'); n += 1
print(json.dumps({'archive': os.path.basename(src.rstrip('/')), 'completions': n, 'raw_missing': miss}))
