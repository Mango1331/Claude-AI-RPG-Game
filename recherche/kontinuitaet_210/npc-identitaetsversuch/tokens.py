"""Count visible component contents, not an entire provider-templated request."""
import hashlib
import json
from pathlib import Path
import sys

from tokenizers import Tokenizer

path = Path(sys.argv[1])
if hashlib.sha256(path.read_bytes()).hexdigest() != '19e773648cb4e65de8660ea6365e10acca112d42a854923df93db4a6f333a82d':
    raise ValueError('Expected the pinned GLM tokenizer')
tokenizer = Tokenizer.from_file(str(path))
counts = {'A': {}, 'B': {}}
for line in sys.stdin:
    row = json.loads(line)
    counts[row['variant']][row['index']] = {
        key: len(tokenizer.encode(row[key], add_special_tokens=False).ids)
        for key in ('catalog', 'system', 'user')
    }
a, b = counts.values()
if a.keys() != b.keys() or len(a) != 21:
    raise ValueError('Expected all 21 paired archived turns')
print(json.dumps({
    'turn20': [a[44], b[44]], 'turn21': [a[46], b[46]], 'turns': len(a),
    'total': {key: sum(b[i][key] - a[i][key] for i in a) for key in a[44]},
    'catalog_changes': sum(b[i]['catalog'] != a[i]['catalog'] for i in a),
}, indent=2))
