"""Run with Python 3 in any directory. Reads the archives without extracting to disk."""
import hashlib, json, tarfile
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'MANIFEST.json').read_text())
contracts = {v: (root / (v + '.txt')).read_text().strip().replace('{{user}}', 'Alaric') for v in 'AB'}
digest = lambda b: hashlib.sha256(b).hexdigest()
normalized = defaultdict(dict)
parents = defaultdict(dict)
profiles = defaultdict(dict)
shared = defaultdict(dict)
ordered = defaultdict(list)
costs = []
physical = set()
generations = set()
completed = 0
for arm, entry in manifest['archives'].items():
    path = root / entry['archive']
    assert digest(path.read_bytes()) == entry['sha256'], path
    with tarfile.open(path) as tar:
        assert set(tar.getnames()) == set(entry['members'])
        files = {name: tar.extractfile(name).read() for name in entry['members']}
    assert all(digest(files[name]) == value for name, value in entry['members'].items())
    profile = json.loads(files['profile.json'])
    assert profile['head'] == manifest['product']
    profiles[arm[1:]][arm[0]] = {k:v for k,v in profile.items() if k not in ('description','descriptionHash')}
    for mark in files.get('matched.jsonl', b'').splitlines():
        mark = json.loads(mark)
        if mark['role'] == 'helper':
            shared[arm[1:]][arm[0]] = shared[arm[1:]].get(arm[0], []) + [(mark['bodySha256'],mark['source']['generationId'])]
    ordered[arm[1:]].append([json.loads(line)['text'] for line in files['actions.jsonl'].splitlines()])
    parent = json.loads(files['parent-check.json'])
    parents[arm[1:]][arm[0]] = (parent['world'], parent['messages'], parent['count'])
    turns = [json.loads(line) for line in files.get('turns.jsonl', b'').splitlines()]
    completed += len(turns)
    rows = [json.loads(line) for line in files['requests.jsonl'].splitlines()]
    starts = [r for r in rows if r['kind'] == 'start']
    ends = [r for r in rows if r['kind'] == 'end']
    assert [r['id'] for r in starts] == [r['id'] for r in ends]
    for r, end in zip(starts, ends):
        assert r['id'] not in physical and r['role'] == end['role']
        physical.add(r['id'])
        assert end['cost'] is not None
        costs.append((r['id'], Decimal(str(r['reserveUSD'])), Decimal(str(end['cost']))))
        if end['generationId']:
            assert end['generationId'] not in generations
            generations.add(end['generationId'])
        assert 'responses/' + Path(end['rawFile']).stem + '.txt' in files
        if r['role'] != 'narrator':
            continue
        body = r['body']
        contract = contracts[arm[0]]
        s = '\n'.join(m['content'] for m in body['messages'])
        assert s.count(contract) == s.count('Contract revision:') == 1, (arm,r['turn'])
        for m in body['messages']:
            m['content'] = m['content'].replace(contract, '<card>')
        fingerprint = digest(json.dumps(body, sort_keys=True, ensure_ascii=False).encode())
        normalized[arm[1:],r['turn']][arm[0]] = fingerprint

cases = json.loads((root / 'cases.json').read_text())
repeats = json.loads((root / 'repeat.json').read_text())
expected_names = {'Story', *(f"Case{c['case']:02}" for c in cases), *(f'Repeat{i:02}' for i in range(1, len(repeats)+1))}
assert set(parents) == expected_names
assert completed == 2*(len(json.loads((root/'campaign.json').read_text())) + len(cases) + len(repeats))
assert normalized['Repeat04',1]['B'] == normalized['Story',7]['B']
for name, conditions in parents.items():
    assert len(conditions) == 2 and conditions['A'] == conditions['B'], name
    assert profiles[name]['A'] == profiles[name]['B'], name
    assert ordered[name][0] == ordered[name][1], name
for name, helpers in shared.items():
    assert helpers['A'] == helpers['B'], name
for (name, n), pair in normalized.items():
    if name != 'Story':
        assert len(pair) == 2 and pair['A'] == pair['B'], (name, n)
spent = Decimal(0)
for _, reserve, amount in sorted(costs):
    assert spent + reserve <= Decimal(manifest['limit_usd']) and amount <= reserve
    spent += amount
assert spent == Decimal(manifest['spent_usd'])
print(f'{len(parents)} paired starts, {completed} saved turns, {len(physical)} physical calls, USD {spent}.')
print('First continuous narrator input identical outside card:',len(set(normalized['Story',1].values())) == 1)
