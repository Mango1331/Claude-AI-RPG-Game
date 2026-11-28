#!/usr/bin/env python3
"""R2/R6 (corrected): XP, money and upgrade time per adventure cycle at the start of E, solo vs. a two-person party.
Product rules: defeat XP = round(12 x level x gap x type) x 5; quest XP = round(15 x level x qtype) x 5; BOTH pools are
split equally among eligible participants (src/progression.js splitPool; src/v4/guild.js L573-578, .262). Guild payout is
split by the party agreement (equal halves assumed). Loot materials: F guide x 3 per rank (monsters.json loot); wolves
EV 12 cp F (36 E), bears 24 (72 E), goblins carry no materials (purse 0-4 cp, salvage gear, not counted).
What each side can actually win is taken from the R1 simulations (developed builds, 60 seeds), not assumed."""
xp_next = lambda L: 100 * L
def kill(foe, pc_rank_e=True, typ=1.0, gap=1.0): return round(12 * foe * gap * typ) * 5
def quest(L, qt=2): return round(15 * L * qt) * 5
print('## R2 korrigiert: XP je Person für einen PC auf L15 (nächstes Level 1.500 XP)')
rows = [
    ('solo: 1 E-Einzeltier L16', kill(16), 1),
    ('solo Warrior (entwickelt): 3 Goblins L17', 3 * kill(17), 1),
    ('solo: 3 Goblins L11 (F, Rangabstand 0,5)', 3 * kill(11, gap=0.5), 1),
    ('Party 2: 3 Goblins L17', 3 * kill(17), 2),
    ('Party 2: Elite-Bär L18', kill(18, typ=1.5), 2),
    ('Party 2: E-Boss L22 (Ghul-Lord)', kill(22, typ=2.5), 2),
    ('Standardvertrag L15 solo', quest(15), 1),
    ('Standardvertrag L15 Party 2 (geteilt)', quest(15), 2),
]
for name, xp, n in rows: print(f'  {name:46s} gesamt {xp:6d} | je Person {xp // n:6d} ({xp / n / xp_next(15):.2f} Level)')
print('\n## Abenteuerzyklus am E-Einstieg: 1 Proven-Vertrag + 4 Begegnungen (was die jeweilige Seite laut R1 sicher gewinnt)')
pay_mid = {'niedrig': 150, 'mittel': 350, 'hoch': 550}
cycles = {
  'Solo Mage/Rogue: 4 E-Einzeltiere L16 (Wolf/Bär gemischt)': dict(n=1, xp=4 * kill(16), loot=2 * 36 + 2 * 72),
  'Solo Warrior: 2 Einzeltiere + 2 Goblin-Dreiergruppen L17': dict(n=1, xp=2 * kill(16) + 6 * kill(17), loot=36 + 72),
  'Party 2: 2 Wolfsrudel (4) L17 + 1 Elite-Bär L18 + 1 Goblin-Dreiergruppe': dict(n=2, xp=8 * kill(17) + kill(18, typ=1.5) + 3 * kill(17), loot=8 * 36 + 72 * 1.5),
}
for name, cyc in cycles.items():
    n = cyc['n']; xp = (cyc['xp'] + quest(15)) // n
    for pk, pay in pay_mid.items():
        money = (pay + cyc['loot']) / n
        print(f'  {name:68s} Vergütung {pk:7s}: je Person {xp:6d} XP ({xp / xp_next(15):.1f} Level) · {money:6.0f} cp')
print('\n## Upgradezeit: Zyklen bis E-fine-Waffe + E-fine-Rüstung + ein E-Manual (je Person, Vergütung mittel)')
price_variants = {'heute (Richtwert E-Waffe fine 210, Rüstung 224)': 210 + 224, 'F×1,4 mit Qualitätsfaktor (350 + 224)': 350 + 224, 'ein Preisfaktor ×2,5 je Rang (350 + 180)': 350 + 180}
manuals = {'Manual 120 cp (heutiger Richtwert, nicht rangskaliert)': 120, 'E-Manual 240 cp (×2, Vorschlag)': 240, 'E-Manual 300 cp (×2,5, Vorschlag)': 300}
for pv, price in price_variants.items():
    for mk, m in manuals.items():
        cells = []
        for name, cyc in cycles.items():
            money = (350 + cyc['loot']) / cyc['n']; cells.append(f"{name.split(':')[0]} {(price + m) / money:.1f}")
        print(f'  {pv:48s} + {mk:52s}: ' + ' | '.join(cells))
print('\n## Langfristig: Wachstum je Rang (Faktor gegenüber dem Rang davor)')
print('  Vergütungsmitte (proposed): F 105 → E 350 (×3,3) → D 900 (×2,6) → C 2.400 (×2,7)')
print('  Material: ×3 je Rang (rank_value_factor) · Waffenpreis heute: ≈ ×1,7–1,9 je Rang (Punkte × Rangfaktor) · XP-Bedarf je Rang: konstant 10 Standardverträge')
