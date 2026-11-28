#!/usr/bin/env python3
"""Print the comfortable (>=90% wins) and coin-flip (>=50%) foe levels per class, PC level and encounter type."""
import json, sys
d = json.load(open(sys.argv[1])); rows = d['rows']
types = ['bear', 'goblin3', 'wolf5', 'eliteBear', 'bossOgre']
print('gear mode:', d['gearMode'], '| cells: highest foe level with >=90% / >=50% wins (0 = none from L-14)')
for cls in ['warrior', 'mage', 'rogue']:
    print(f'== {cls}'); print('PC L  ' + ''.join(t.rjust(12) for t in types))
    for L in [5, 10, 14, 15, 20, 25, 29]:
        cells = []
        for t in types:
            r = next(x for x in rows if x['cls'] == cls and x['L'] == L and x['type'] == t)
            cells.append(f"{r['comfortable90']}/{r['coinflip50']}")
        print(f'{L:<6d}' + ''.join(c.rjust(12) for c in cells))
