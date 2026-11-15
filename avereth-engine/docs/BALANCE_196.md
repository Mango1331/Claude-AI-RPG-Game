# Balance .196 – E-Waffen und Foki

Basis: Produkt `.195`, `7044d29ba461a777dc758fcab9f8ca9394dd5a46`.
Arbeitsbranch: `codex/balance-196-198`; erste von drei getrennten Etappen.

## Umsetzung

`content/gear.json` ergänzt im vorhandenen Instanzkatalog `e_weapon_values`.
`itemProfile` in `src/v4/items.js` verwendet diese Werte für generierte
E-Waffen/Foki: crude/common/fine/superior/exceptional **7/11/15/19/23**.
Alle Waffenfamilien einschließlich Bogen und Fokus teilen denselben Pfad;
Angebote und Bossloot speichern dessen Profile. F bleibt **6/10/14/18/22**,
D–S und bestehende feste Startartikel bleiben unverändert. Keine neue Datenbank,
Effekte, Dropraten, Klassen- oder Ausrüstungsregeln.

Die bestehende `valueOf`-Formel ergibt E-Richtwerte **98/154/210/266/322 cp**.
Das sind keine garantierten Händlerpreise; ausgehandelte E-Angebote behalten
ihren tatsächlichen Preis. F-exceptional 440 cp gegenüber E-exceptional 322 cp
bleibt der ausdrücklich vertagte Wirtschaftspunkt. Vorhandene gespeicherte
Gegenstandsprofile werden nicht umgeschrieben.

## Regressionen und Kampfvergleich

Fünf gezielte Tests: sämtliche Waffenbasen/Qualitäten/Ränge, feste Starter,
F-Shop und wirkliche E-Angebote, Objektbuchung → Anlegen/Derivation/Rangsperre,
E-Bossloot mit deterministischer Wiederholung und Doppelbuchungsschutz.
Rot auf `.195` bei den erwarteten E-Werten und echtem Ausrüsten; anschließend
5/5 grün. Vollständige Node-/Replay-Ergebnisse unten.

Gepaarte echte `tools/sim/combat.mjs`-/`runCombat`-Kämpfe, Seeds 7001–7100,
21 Szenarien × 100 × zwei Stände = **4.200 Kämpfe**, ohne Abbruch/Fehler.
PC15, fünf Punkte je Level, ausgewogene Verteilung, P1, SHORT; unveränderte
F-exceptional-Rüstung, nur E-Waffe variiert. Native Skilltaktik (Heavy Slash,
Arcane Bolt, Razor Cut), keine Gegneränderung. Kontrollgegner Bär15/20 elite.
F-exceptional-Waffenkontrollen sind in sämtlichen Einzelresultaten identisch.
Runden = höchste tatsächlich ausgeführte Aktionsrunde, nicht der nachlaufende
Engine-Zähler. Rest-HP nur bei Siegen. Vollständige Matrix:

| Fall | Siege vorher → danach /100 | Ø Runden vorher → danach | Rest-HP % vorher → danach |
|---|---:|---:|---:|
| E-warrior-fine-elite15 | 60 → 60 | 6.60 → 6.60 | 2.08 → 2.08 |
| E-warrior-fine-elite20 | 0 → 0 | 5.00 → 5.00 | — → — |
| E-warrior-superior-elite15 | 65 → 79 | 6.53 → 6.41 | 4.90 → 9.33 |
| E-warrior-superior-elite20 | 0 → 0 | 5.00 → 5.00 | — → — |
| E-warrior-exceptional-elite15 | 87 → 100 | 6.27 → 6.05 | 12.43 → 16.39 |
| E-warrior-exceptional-elite20 | 0 → 0 | 5.00 → 5.00 | — → — |
| E-mage-fine-elite15 | 2 → 6 | 5.98 → 5.94 | 5.69 → 8.68 |
| E-mage-fine-elite20 | 0 → 0 | 4.77 → 4.77 | — → — |
| E-mage-superior-elite15 | 53 → 68 | 5.47 → 5.32 | 8.50 → 8.63 |
| E-mage-superior-elite20 | 0 → 0 | 4.77 → 4.77 | — → — |
| E-mage-exceptional-elite15 | 85 → 99 | 5.15 → 5.01 | 8.80 → 8.84 |
| E-mage-exceptional-elite20 | 0 → 0 | 4.77 → 4.77 | — → — |
| E-rogue-fine-elite15 | 0 → 0 | 6.00 → 6.00 | — → — |
| E-rogue-fine-elite20 | 0 → 0 | 4.75 → 4.75 | — → — |
| E-rogue-superior-elite15 | 0 → 0 | 6.00 → 6.00 | — → — |
| E-rogue-superior-elite20 | 0 → 0 | 4.75 → 4.75 | — → — |
| E-rogue-exceptional-elite15 | 2 → 38 | 6.00 → 6.00 | 7.41 → 8.94 |
| E-rogue-exceptional-elite20 | 0 → 0 | 4.75 → 4.75 | — → — |
| F-control-warrior | 97 → 97 | 6.07 → 6.07 | 16.10 → 16.10 |
| F-control-mage | 97 → 97 | 5.03 → 5.03 | 8.83 → 8.83 |
| F-control-rogue | 12 → 12 | 6.00 → 6.00 | 8.76 → 8.76 |

F→E ist nun in allen fünf Qualitäten ein positiver Waffenwertschritt; ein +1
muss wegen Rundung nicht jede einzelne Kampfsequenz verändern. Gegen Bär20
elite verlieren diese PC15/P1-Builds weiterhin alle Kämpfe. Die Korrektur hebt
keine Rangbarriere auf und garantiert keinen Sieg.

## Ausgeführte Abnahme

- `npm test`: **3.295/3.295**, keine übersprungenen Tests. Die alte
  `.114`-Erwartung für E-exceptional-Fokus wurde konkret 20→23 aktualisiert;
  ihr Armor-Assert bleibt unverändert.
- `npm run replay:check`: **2.235/2.235**, 1.131 bereits begründete historische
  Abweichungen exakt bestätigt; **0 neue, 0 offene, 0 veraltete Fingerprints**,
  keine Replay-/Fold-/Validierungsfehler. Acceptance-Datei unverändert.
- Keine ST-Smokes, Provider-/natürlichen Modellläufe oder persönlichen Tests.

Die folgende NPC-Etappe ist ein eigener Commit. Kein persönlicher Spieltest-GO;
Produktdiff-Review und gesammelte ST-Smokes stehen separat aus.
