#!/usr/bin/env python3
"""F14/E15/E20 gear variants vs E-relevant foes, proficiency/tactic and stat style matrices."""
import json
rows = json.load(open('sim_transition.json'))['rows']
foes = ['wild-bear-L18', 'spirit-elite-L19', 'minion-goblin3-L17', 'wild-wolf6-L16', 'guard-eliteGhoul-L20', 'boss-ogre-L22']
gears = ['F-fine', 'F-superior', 'F-exceptional', 'E-common', 'E-fine', 'E-superior', 'Eweapon-fine+Farmor-exc', 'Fweapon-exc+Earmor-fine']
for cls in ['warrior', 'mage', 'rogue']:
    for L in [14, 15, 20]:
        print(f'== {cls} L{L} (win%/HP left%)'); print('gear'.ljust(26) + ''.join(f.split('-', 1)[1][:16].rjust(17) for f in foes))
        for g in gears:
            cells = []
            for f in foes:
                r = [x for x in rows if x['cls'] == cls and x['level'] == L and x['gearKey'] == g and x['foeKey'] == f]
                cells.append('-' if not r else f"{r[0]['winPct']:3d}/{(r[0]['winHpPct'] or 0):3.0f}")
            if any(c != '-' for c in cells): print(g.ljust(26) + ''.join(c.rjust(17) for c in cells))
rows = json.load(open('sim_prof.json'))['rows']
print('== PROF/TACTIC at L15 E-fine: eliteGhoul L20 | bossOgre L22 (win/HP)')
for r in rows:
    if r['group'] == 'guard-eliteGhoul-L20':
        b = next(x for x in rows if x['cls'] == r['cls'] and x['prof'] == r['prof'] and x['tactic'] == r['tactic'] and x['group'] == 'boss-ogre-L22')
        print(f"  {r['cls']:7s} P{r['prof']} {r['tactic']:5s} {r['winPct']}/{r['winHpPct'] or 0:.0f} | {b['winPct']}/{b['winHpPct'] or 0:.0f} | dmg/attack {r['dmgPerAttack']}")
rows = json.load(open('sim_style.json'))['rows']
print('== STYLE: goblin x3 same level | bear boss L+2 (win/HP)')
for r in rows:
    if r['group'] == 'group':
        b = next(x for x in rows if x['cls'] == r['cls'] and x['level'] == r['level'] and x['style'] == r['style'] and x['group'] == 'boss')
        print(f"  {r['cls']:7s} L{r['level']} {r['style']:9s} {r['winPct']}/{r['winHpPct'] or 0:.0f} | {b['winPct']}/{b['winHpPct'] or 0:.0f}")
