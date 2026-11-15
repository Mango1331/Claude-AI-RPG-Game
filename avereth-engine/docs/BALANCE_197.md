# Balance .197 – normales menschliches NPC-Budget

Aufbauend auf `.196` (`62f43a7`). Beide Pfade `rulesetTwoSheet` und `humanSheet`
in `src/npcgen.js` vergeben die zwei Favored-/Statbasis-Boni nur einmal: sechs
Basiswerte 5 + zwei Startboni + 5 je weiterem Level. L14 **97 statt 123**.
Die 2/2/1-Prioritäten, Klassen, Skills, Ausbildung, Rollen, Signaturen, Ausrüstung
und Monsterprofile bleiben unverändert. Kein kompensierender Bonus, keine
Migration oder Umschreibung gebuchter Sheets. Der Ableitungstext in
`content/npc_templates.json` benennt die neue Regel korrekt.

## Regressionen

Sechs neue Regressionen, alle sechs rot vor der Änderung und danach grün:
drei Klassen über L1/2/5/10/14/15/20 mit konkreten L14-Stats, alle alten
Vorlagen, Menschen ohne etablierte Klasse und der tatsächliche
`materialise` → `entity.sheet_set`-Pfad samt Kit, Signatur, Faltung und
Nicht-Neugenerierung. Vorhandene Klassen-/Monster-/Progressionstests bleiben.

Ein bestehender Ablauf-Test (`tests/unit/combat_start.test.js`) benötigt die
konkrete neue Folge: zwei L2-Banditen haben STR/AGI **8 statt 9**; die vier
Treffer verursachen **20/19/21/19 statt 22/20/23/21** Schaden. Alaric hat nach
Runde 2 **6 statt 0 HP** und ist wieder am Zug. Reihenfolge und Nicht-Doppelung
sind unverändert geprüft; der Test wird weder entfernt noch pauschal gelockert.

## Vorher/nachher: Menschen gleicher Stufe und +5

72 Szenarien × Seeds 7001–7100 × zwei Stände = **14.400 echte Kämpfe**,
keine Abbrüche/Fehler. Warrior/Mage/Rogue, PC5/10/14/15; ausgewogen,
P1, SHORT, Heavy Slash/Arcane Bolt beziehungsweise Rogue-Auswahl nach
sichtbarer Schadensvorschau. PC F-fine bzw. ab L15 E-fine.

NPCs werden durch `materialise` aus `adventurer` erzeugt, einschließlich
nativer Klassenausrüstung, seedbestimmter Starter und Signatur ab L5.
`native` belässt dieses Profil; `matched` ersetzt ausdrücklich nur Gear/Skills/
Inventar durch das PC-Kit (kontrollierter Vergleich, ohne Signatur);
`veteran` behält die nativen Skills/Signatur, nutzt superior-Waffe, fine-Rüstung
im zulässigen F-/E-Rang und P3. Keine erfundenen Elite-/Bossmultiplikatoren
für Humans. Humanoide Monster-Boss-/Elite-Körper werden in der Abschlussmatrix
separat ausgewertet. Die NPC-Kampfpolitik bleibt nativ, kein symmetrisches PvP.

**Kein einziger gewonnener Kampf dieser Matrix endet innerhalb von zwei
Aktionsrunden.** Bei +5 bleiben Warrior/Rogue gegen die kontrollierten und
hochwertigen Kits ohne Sieg; gegen native Kits gewinnen sie bei hohen Levels
teilweise. Mages gewinnen je nach Skillwahl/Kombination häufiger, aber nicht
in zwei Runden. Die genaue Matrix (Rest-HP nur bei gewonnenen Kämpfen):

| Fall | Siege alt → neu /100 | Ø Runden alt → neu | Rest-HP % alt → neu | Siege ≤2 Runden alt → neu |
|---|---:|---:|---:|---:|
| human-warrior-5-plus0-native | 45 → 100 | 5.74 → 5.00 | 17.76 → 39.31 | 0 → 0 |
| human-warrior-5-plus0-matched | 53 → 100 | 6.00 → 5.01 | 14.95 → 40.00 | 0 → 0 |
| human-warrior-5-plus0-veteran | 7 → 66 | 4.64 → 4.77 | 11.03 → 24.66 | 0 → 0 |
| human-warrior-5-plus5-native | 0 → 0 | 2.65 → 4.40 | — → — | 0 → 0 |
| human-warrior-5-plus5-matched | 0 → 0 | 3.00 → 4.28 | — → — | 0 → 0 |
| human-warrior-5-plus5-veteran | 0 → 0 | 2.15 → 3.24 | — → — | 0 → 0 |
| human-warrior-10-plus0-native | 39 → 90 | 6.16 → 5.91 | 10.08 → 25.91 | 0 → 0 |
| human-warrior-10-plus0-matched | 4 → 100 | 6.53 → 6.00 | 16.82 → 25.89 | 0 → 0 |
| human-warrior-10-plus0-veteran | 5 → 43 | 5.15 → 5.69 | 4.45 → 14.53 | 0 → 0 |
| human-warrior-10-plus5-native | 0 → 0 | 3.11 → 5.52 | — → — | 0 → 0 |
| human-warrior-10-plus5-matched | 0 → 0 | 3.00 → 6.00 | — → — | 0 → 0 |
| human-warrior-10-plus5-veteran | 0 → 0 | 2.49 → 4.06 | — → — | 0 → 0 |
| human-warrior-14-plus0-native | 17 → 91 | 6.16 → 6.00 | 9.39 → 25.47 | 0 → 0 |
| human-warrior-14-plus0-matched | 0 → 100 | 6.53 → 6.00 | — → 29.37 | 0 → 0 |
| human-warrior-14-plus0-veteran | 1 → 56 | 5.25 → 5.91 | 6.43 → 14.67 | 0 → 0 |
| human-warrior-14-plus5-native | 0 → 2 | 3.59 → 6.04 | — → 1.79 | 0 → 0 |
| human-warrior-14-plus5-matched | 0 → 0 | 3.04 → 6.32 | — → — | 0 → 0 |
| human-warrior-14-plus5-veteran | 0 → 0 | 2.60 → 4.77 | — → — | 0 → 0 |
| human-warrior-15-plus0-native | 21 → 96 | 6.56 → 5.98 | 12.15 → 29.83 | 0 → 0 |
| human-warrior-15-plus0-matched | 0 → 100 | 6.63 → 6.51 | — → 34.15 | 0 → 0 |
| human-warrior-15-plus0-veteran | 0 → 72 | 5.45 → 6.34 | — → 15.86 | 0 → 0 |
| human-warrior-15-plus5-native | 0 → 18 | 3.77 → 6.65 | — → 5.25 | 0 → 0 |
| human-warrior-15-plus5-matched | 0 → 0 | 3.76 → 7.84 | — → — | 0 → 0 |
| human-warrior-15-plus5-veteran | 0 → 0 | 2.85 → 5.16 | — → — | 0 → 0 |
| human-mage-5-plus0-native | 79 → 96 | 4.71 → 3.97 | 52.65 → 61.39 | 0 → 0 |
| human-mage-5-plus0-matched | 86 → 100 | 4.24 → 3.24 | 41.43 → 53.90 | 0 → 0 |
| human-mage-5-plus0-veteran | 52 → 77 | 4.53 → 4.34 | 55.32 → 54.20 | 0 → 0 |
| human-mage-5-plus5-native | 24 → 35 | 4.47 → 5.00 | 100.00 → 72.90 | 0 → 0 |
| human-mage-5-plus5-matched | 0 → 16 | 3.53 → 5.39 | — → 9.64 | 0 → 0 |
| human-mage-5-plus5-veteran | 24 → 24 | 4.35 → 4.51 | 100.00 → 100.00 | 0 → 0 |
| human-mage-10-plus0-native | 74 → 98 | 4.84 → 3.77 | 48.85 → 62.21 | 0 → 0 |
| human-mage-10-plus0-matched | 58 → 100 | 4.84 → 3.03 | 31.73 → 57.90 | 0 → 0 |
| human-mage-10-plus0-veteran | 49 → 81 | 4.61 → 4.21 | 57.09 → 56.88 | 0 → 0 |
| human-mage-10-plus5-native | 40 → 64 | 4.37 → 5.00 | 62.86 → 50.31 | 0 → 0 |
| human-mage-10-plus5-matched | 36 → 53 | 4.47 → 5.00 | 3.64 → 25.55 | 0 → 0 |
| human-mage-10-plus5-veteran | 25 → 47 | 4.10 → 4.58 | 96.04 → 57.08 | 0 → 0 |
| human-mage-14-plus0-native | 73 → 99 | 4.56 → 3.40 | 52.42 → 65.15 | 0 → 0 |
| human-mage-14-plus0-matched | 57 → 100 | 4.79 → 3.00 | 32.40 → 59.66 | 0 → 0 |
| human-mage-14-plus0-veteran | 55 → 91 | 4.53 → 3.82 | 55.20 → 56.09 | 0 → 0 |
| human-mage-14-plus5-native | 44 → 75 | 4.51 → 5.00 | 59.33 → 46.39 | 0 → 0 |
| human-mage-14-plus5-matched | 50 → 57 | 4.93 → 5.00 | 7.87 → 29.59 | 0 → 0 |
| human-mage-14-plus5-veteran | 28 → 57 | 3.99 → 4.82 | 86.35 → 51.11 | 0 → 0 |
| human-mage-15-plus0-native | 80 → 100 | 4.34 → 3.21 | 51.81 → 67.88 | 0 → 0 |
| human-mage-15-plus0-matched | 54 → 100 | 4.92 → 3.01 | 31.60 → 61.36 | 0 → 0 |
| human-mage-15-plus0-veteran | 55 → 94 | 4.74 → 4.02 | 53.47 → 53.68 | 0 → 0 |
| human-mage-15-plus5-native | 45 → 81 | 4.54 → 5.00 | 59.60 → 45.75 | 0 → 0 |
| human-mage-15-plus5-matched | 53 → 85 | 5.00 → 5.00 | 10.38 → 22.60 | 0 → 0 |
| human-mage-15-plus5-veteran | 33 → 62 | 4.10 → 4.97 | 74.08 → 49.39 | 0 → 0 |
| human-rogue-5-plus0-native | 53 → 100 | 3.27 → 3.20 | 30.24 → 42.76 | 0 → 0 |
| human-rogue-5-plus0-matched | 0 → 100 | 3.00 → 3.00 | — → 23.22 | 0 → 0 |
| human-rogue-5-plus0-veteran | 51 → 74 | 3.39 → 3.34 | 9.89 → 36.39 | 0 → 0 |
| human-rogue-5-plus5-native | 0 → 0 | 2.24 → 3.75 | — → — | 0 → 0 |
| human-rogue-5-plus5-matched | 0 → 0 | 2.00 → 3.00 | — → — | 0 → 0 |
| human-rogue-5-plus5-veteran | 0 → 0 | 2.15 → 2.15 | — → — | 0 → 0 |
| human-rogue-10-plus0-native | 52 → 99 | 3.42 → 3.38 | 30.19 → 47.39 | 0 → 0 |
| human-rogue-10-plus0-matched | 11 → 99 | 3.00 → 3.02 | 1.10 → 32.14 | 0 → 0 |
| human-rogue-10-plus0-veteran | 51 → 77 | 3.48 → 3.45 | 15.31 → 42.98 | 0 → 0 |
| human-rogue-10-plus5-native | 0 → 1 | 3.71 → 3.93 | — → 25.12 | 0 → 0 |
| human-rogue-10-plus5-matched | 0 → 0 | 2.95 → 3.00 | — → — | 0 → 0 |
| human-rogue-10-plus5-veteran | 0 → 0 | 2.26 → 3.77 | — → — | 0 → 0 |
| human-rogue-14-plus0-native | 52 → 98 | 3.48 → 3.49 | 30.15 → 49.19 | 0 → 0 |
| human-rogue-14-plus0-matched | 26 → 96 | 3.02 → 3.09 | 2.00 → 35.53 | 0 → 0 |
| human-rogue-14-plus0-veteran | 51 → 96 | 3.49 → 3.56 | 17.93 → 37.37 | 0 → 0 |
| human-rogue-14-plus5-native | 8 → 38 | 3.92 → 4.20 | 8.50 → 10.20 | 0 → 0 |
| human-rogue-14-plus5-matched | 0 → 0 | 3.00 → 3.85 | — → — | 0 → 0 |
| human-rogue-14-plus5-veteran | 0 → 0 | 2.55 → 3.88 | — → — | 0 → 0 |
| human-rogue-15-plus0-native | 67 → 99 | 3.42 → 3.41 | 25.77 → 51.87 | 0 → 0 |
| human-rogue-15-plus0-matched | 44 → 96 | 3.19 → 3.32 | 3.03 → 32.48 | 0 → 0 |
| human-rogue-15-plus0-veteran | 51 → 92 | 3.51 → 3.68 | 19.97 → 39.55 | 0 → 0 |
| human-rogue-15-plus5-native | 12 → 51 | 3.90 → 4.36 | 11.87 → 14.69 | 0 → 0 |
| human-rogue-15-plus5-matched | 0 → 0 | 3.00 → 4.00 | — → — | 0 → 0 |
| human-rogue-15-plus5-veteran | 0 → 0 | 2.84 → 3.88 | — → — | 0 → 0 |

## Historischer Replay

Vollständiger `npm run replay:check`: **2.235 Fälle**, keine Replay-/Fold-/
Validierungsfehler; die **1.131** bereits akzeptierten Abweichungen stimmen
exakt. **0 neue, 0 offene, 0 veraltete Fingerprints.** Keine neue Freigabeliste.
Die Originalzustände des Korpus enthalten bereits gebuchte NPC-Sheets;
der Replay verarbeitet jeden Turn gegen dessen Originalvorgeschichte und
schreibt diese Sheets nicht neu. Neue Generierung ist deshalb zusätzlich
explizit durch die Regressionen und gepaarten Kämpfe abgedeckt. Historische
Replaydateien bleiben bytegleich.

`npm test`: **3.301/3.301**, 0 übersprungen, nach der einzeln nachvollzogenen
Anpassung des Banditen-Ablauftests. Gezielt einschließlich dieses Ablaufs:
**12/12**. Keine ST-/Provider-/natürlichen Modellläufe oder persönlichen Tests.
