#!/usr/bin/env python3
"""Same-level curve: win% / HP left% of wins / mean rounds per class, PC level and encounter (sim_matrix curve)."""
import json, sys
rows = json.load(open(sys.argv[1]))['rows']; groups = ['wolf', 'bear', 'spirit', 'armored', 'goblin3', 'wolf5', 'eliteBear', 'bossArmored']
for cls in ['warrior', 'mage', 'rogue']:
    print('==', cls, '(win% / HP left% / rounds); foes at the PC level'); print('L   ' + ' '.join(f'{g:>15s}' for g in groups))
    for L in [1, 3, 5, 7, 10, 14, 15, 20, 25, 29]:
        cells = []
        for g in groups:
            r = next(x for x in rows if x['cls'] == cls and x['level'] == L and x['group'] == g)
            cells.append(f"{r['winPct']:3d}/{(r['winHpPct'] or 0):4.0f}/{r['meanRounds']:4.1f}")
        print(f'{L:<3d} ' + ' '.join(f'{c:>15s}' for c in cells))
    for g in ['bear', 'goblin3', 'eliteBear']:
        print(f'  {cls} {g}: L dmgPerAttack takenPerStrike mitigation%: ' + ' | '.join(f"L{r['level']} {r['dmgPerAttack']}/{r['takenPerStrike']}/{r['mitigation']}" for r in rows if r['cls'] == cls and r['group'] == g and r['level'] in (1, 5, 10, 15, 20, 29)))
