#!/usr/bin/env python3
"""XP per activity for a PC at the start of E (L15) and mid E (L22) under three rank-gap variants (analytic, from the
product formulas: defeat = 12 x foe level x gap x type x 5; quest = 15 x level x type x 5; next level = 100 x level).
V0 current (rank-based gap, -1 rank = 0.5); V1 soft (-1 rank = 0.75); V2 level-distance (foe >= PC-4: 1, PC-5..-9: 0.5, below: 0.25).
Party of two: combat XP pool split equally between two survivors, quest XP full for each (observed .222-.235)."""
def gap_rank(foe, pc, v):
    r = lambda l: 0 if l <= 14 else 1 if l <= 29 else 2
    g = r(foe) - r(pc)
    if v == 'V2':
        d = foe - pc
        return 1 if d >= -4 else 0.5 if d >= -9 else 0.25
    base = {0: 1, 1: 2, 2: 4, -1: 0.5, -2: 0.25}[max(-2, min(2, g))]
    return 0.75 if (v == 'V1' and g == -1) else base
def kill(foe, pc, v, typ=1, n=1, party=1): return round(12 * foe * gap_rank(foe, pc, v) * typ) * 5 * n / party
for pc in (15, 22):
    need = 100 * pc
    print(f'== PC L{pc} (next level needs {need} XP)')
    acts = [('solo: 3 goblins at comfortable L' + str(round(pc * .75)), lambda v: kill(round(pc * .75), pc, v, n=3)),
            ('solo: single bear at own level', lambda v: kill(pc, pc, v)),
            ('solo: elite at 0.9 x level', lambda v: kill(round(pc * .9), pc, v, typ=1.5)),
            ('party of 2: 3 foes at L' + str(pc + 2), lambda v: kill(pc + 2, pc, v, n=3, party=2)),
            ('party of 2: E-floor boss L22 (each)', lambda v: kill(22, pc, v, typ=2.5, party=2)),
            ('standard contract at own level (each)', lambda v: 15 * pc * 2 * 5)]
    for name, f in acts:
        print(f'  {name:44s} ' + ' | '.join(f'{v} {f(v):7.0f} ({f(v) / need:4.2f} lvl)' for v in ('V0', 'V1', 'V2')))
