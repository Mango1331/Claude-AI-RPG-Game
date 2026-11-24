"""Aggregate the two exported runs. Usage: python auswertung.py <B-export> <C-export>."""
import gzip
import json
import statistics
import sys
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path


def load(path):
    with gzip.open(path, 'rt', encoding='utf-8') as file:
        return [json.loads(line) for line in file] if '.jsonl.' in path.name else json.load(file)


def stats(values):
    return {'n': len(values), 'sum': sum(values), 'median': statistics.median(values),
            'min': min(values), 'max': max(values)} if values else {'n': 0}


def usage_stat(ended, *fields):
    values = []
    for row in ended:
        value = row.get('usage')
        for f in fields:
            value = value.get(f) if isinstance(value, dict) else None
        if isinstance(value, (int, float)):
            values.append(value)
    return {'reported': len(values), 'sum': sum(values) if values else None}


def one_arm(folder, all_pairs):
    data = load(folder / 'zugauswertung.json.gz')
    journal = load(folder / 'provider-journal.jsonl.gz')
    turns = [t for t in data if t['complete']]
    starts = {r['id']: r for r in journal if r['kind'] == 'start'}
    ends = {r['id']: r for r in journal if r['kind'] == 'end'}
    assert set(ends).issubset(starts)
    assert not set(starts).intersection(all_pairs), 'Duplicate global request id'
    all_pairs.update({n: (s, ends.get(n)) for n, s in starts.items()})
    roles = defaultdict(list)
    for e in ends.values():
        roles[e['role']].append(e)
    costs = [Decimal(str(e['usage']['cost'])) for e in ends.values()
             if (e.get('usage') or {}).get('cost') is not None]
    accepted = Counter()
    refused = Counter()
    for t in turns:
        assert t.get('fold_readback')
        for e in t.get('events') or []:
            accepted[e['t']] += 1
        for r in t.get('rejected') or []:
            refused[(r['type'], r['rule'])] += 1
    return {
        'inputs': len(data), 'confirmed': len(turns), 'physical': len(starts),
        'regular': sum(bool(r.get('ok')) for r in ends.values()),
        'cost_usd': {'reported': len(costs), 'sum': str(sum(costs, Decimal(0))) if costs else None},
        'provider_input': usage_stat(ends.values(), 'prompt_tokens'),
        'provider_output': usage_stat(ends.values(), 'completion_tokens'),
        'provider_reasoning': usage_stat(ends.values(), 'completion_tokens_details', 'reasoning_tokens'),
        'provider_cache': usage_stat(ends.values(), 'prompt_tokens_details', 'cached_tokens'),
        'roles_elapsed_ms': {k: stats([r['elapsedMs'] for r in rows]) for k, rows in roles.items()},
        'browser_ms_after_click': {k: stats([t['T4_ms'][k] for t in turns if t['T4_ms'].get(k) is not None])
                                   for k in ['firstProse', 'lastRenderedChange', 'worldCommit', 'confirmedSave', 'ready']},
        'reply_event_types': dict(accepted), 'rejected': {f'{t}/{rule}': n for (t, rule), n in sorted(refused.items())},
    }


def main():
    b, c = map(Path, sys.argv[1:])
    all_pairs = {}
    result = {arm: one_arm(folder, all_pairs) for arm, folder in [('B', b), ('C', c)]}
    last = None
    for n in sorted(all_pairs):
        s, end = all_pairs[n]
        if last is not None:
            assert last.get('ok') and last['at'] <= s['at'], 'Unresolved or overlapping request'
        if end is None:
            assert n == max(all_pairs)
        else:
            assert end['at'] >= s['at']
        last = end
    assert sorted(all_pairs) == list(range(1, len(all_pairs) + 1))
    result['global'] = {'physical_starts': len(all_pairs), 'max_parallel': int(bool(all_pairs)),
                        'terminal_unsettled': bool(all_pairs) and not (last and last.get('ok'))}
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
