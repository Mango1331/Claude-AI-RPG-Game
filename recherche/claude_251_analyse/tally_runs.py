#!/usr/bin/env python3
"""Tally rejection rules, extraction status, repairs and planner drops over archived runs.
Counts only messages beyond the arm's starting chat (chat-0.jsonl.gz) to avoid double counting shared prefixes."""
import gzip, json, sys, os, glob, collections

def load(path):
    try:
        with gzip.open(path, 'rt', encoding='utf8') as f:
            return [json.loads(l) for l in f.read().splitlines() if l.strip()]
    except FileNotFoundError:
        return None

base = sys.argv[1]
pattern = sys.argv[2] if len(sys.argv) > 2 else 'openrouter-20261127-*'
rules = collections.Counter()
rule_examples = collections.defaultdict(list)
drops = collections.Counter()
stats = collections.Counter()
per_run = []
for run in sorted(glob.glob(os.path.join(base, pattern))):
    chat = load(os.path.join(run, 'chat.jsonl.gz'))
    if not chat:
        continue
    reqs = load(os.path.join(run, 'requests.jsonl.gz')) or []
    n_narr = sum(1 for r in reqs if r.get('kind') == 'start' and r.get('role') == 'narrator' and str(r.get('attempt','0')) == '0')
    # also count local (no-narrator) turns? we restrict to the last n_narr narrated replies of this arm
    narr_idx = [i for i, m in enumerate(chat) if not m.get('is_user') and ((m.get('extra') or {}).get('avereth') or {}).get('extraction')]
    keep = set(narr_idx[-n_narr:]) if n_narr else set()
    first_new = min(keep) - 1 if keep else len(chat)
    name = os.path.basename(run)
    r_new = collections.Counter()
    for i, m in enumerate(chat):
        if i < max(first_new, 1):
            continue
        av = (m.get('extra') or {}).get('avereth') or {}
        if m.get('is_user'):
            interp = av.get('interp') or {}
            if interp:
                stats['planner_turns'] += 1
                if interp.get('repaired'): stats['planner_repaired'] += 1
                if interp.get('failed'): stats['planner_failed'] += 1
            for e in av.get('events') or []:
                if e.get('t') == 'cmd.interpreted':
                    for d in e['d'].get('dropped') or []:
                        drops[d.get('rule')] += 1
                        rule_examples['DROP:' + str(d.get('rule'))].append((name, i, (d.get('quote') or '')[:90]))
            continue
        x = av.get('extraction')
        if not x or i not in keep:
            continue
        stats['x_replies'] += 1
        st = x.get('status')
        stats['x_' + str(st)] += 1
        if x.get('repaired'): stats['x_repaired'] += 1
        for r in av.get('rejected') or []:
            rules[r.get('rule')] += 1
            r_new[r.get('rule')] += 1
            rule_examples[r.get('rule')].append((name, i, r.get('type'), (r.get('why') or '')[:110]))
        stats['x_deltas'] += x.get('deltas') or 0
    per_run.append((name, sum(r_new.values())))

print('STATS', dict(stats))
print('\nREJECTION RULES (new messages only):')
for k, v in rules.most_common():
    print(f'{v:4d}  {k}')
print('\nPLANNER DROPS:')
for k, v in drops.most_common():
    print(f'{v:4d}  {k}')
if '--examples' in sys.argv:
    for k in sys.argv[sys.argv.index('--examples') + 1:]:
        print(f'\n== examples {k}')
        for e in rule_examples.get(k, [])[:40]:
            print('  ', e)
