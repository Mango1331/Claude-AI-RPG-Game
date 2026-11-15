# Balance .198 – F-fine-Schild

Aufbauend auf `.197` (`2a2380c`). In der vorhandenen Gear-Konfiguration steht
`f_shield_fine_def: 5`; `itemProfile` in `src/v4/items.js` setzt nur bei
**F + shield + fine** diesen DEF-Wert. MDEF bleibt 3, `valueOf` berechnet
**64 cp**. Shop und Bossloot verwenden denselben Pfad. Keine Blockchance,
Fähigkeit, neue Restriktion oder sonstige Änderung von Ausrüstung/Kampf.

| F-Schild | DEF | MDEF | Richtwert cp |
|---|---:|---:|---:|
| Crude | 3 | 2 | 40 |
| Common | 4 | 3 | 56 |
| Fine | **5** | **3** | **64** |
| Superior | 5 | 4 | 72 |
| Exceptional | 6 | 5 | 88 |

## Regressionen

Fünf neue Tests: sämtliche Schildaliasse/Qualitäten mit und ohne balance-Flag,
alle höheren Schildränge und Rüstungen gegen den festgehaltenen `.197`-Hash,
Shop/Bossloot, wirklicher Offhand-Anlegepfad und 100 gepaarte physische sowie
magische Treffer durch `attackAction`. Die vier von der Regel betroffenen
Tests scheitern auf `.197`; der Unverändert-Test besteht dort bereits.
Nach Korrektur **5/5 grün**. Ein zusätzlicher DEF-Punkt senkt den physischen
Wert vor Varianz genau um 1; Rundung bestimmt den tatsächlichen HP-Schritt.
Magische Treffer einschließlich RNG-Verbrauch bleiben exakt identisch.

18 Szenarien × 100 Seeds × zwei Stände = **3.600 vollständige Kämpfe**;
Seeds 7001–7100, PC5 fine/P1/ausgewogen/SHORT, Auswahl nach sichtbarer
Schadensvorschau. Bär6/elite physisch, Spirit6/elite magisch. Common- und
superior-Kontrollen sowie alle magischen Einzelresultate sind bytegleich.
Alle Paare enden mit 100/100 PC-Siegen; die Aktionsrundenzahl bleibt gleich.

| Fine-Schild-Fall | Ø erlittener HP-Schaden alt → neu | Rest-HP % alt → neu |
|---|---:|---:|
| shield-warrior-bear-fine | 94.79 → 89.75 | 34.63 → 38.10 |
| shield-warrior-spirit-fine | 106.82 → 106.82 | 26.33 → 26.33 |
| shield-mage-bear-fine | 115.10 → 110.09 | 17.79 → 21.36 |
| shield-mage-spirit-fine | 95.88 → 95.88 | 31.51 → 31.51 |
| shield-rogue-bear-fine | 108.56 → 103.83 | 22.46 → 25.84 |
| shield-rogue-spirit-fine | 52.48 → 52.48 | 62.51 → 62.51 |

## Vollständige Abnahme

- `npm test`: **3.306/3.306**, 0 fehlgeschlagen/übersprungen.
- `npm run replay:check`: **2.235 Fälle**, 0 Replay-/Fold-/Validierungsfehler.
  Alle 1.131 bereits akzeptierten historischen Abweichungen exakt bestätigt;
  **0 neue, 0 offene, 0 veraltete Fingerprints**. Keine Acceptance-Änderung.
- Historische Korpusdateien und Baseline unverändert, ebenso `main`.
- Keine ST-Smokes, Provider-/natürlichen Modellläufe oder persönlichen Tests.

Die separate Abschlussauswertung steht in [BALANCE_198_SIMULATION.md](BALANCE_198_SIMULATION.md).
Die getrennten Offline-Werkzeuge unter `tools/sim/balance/` nutzen die echte
Engine und sind kein Bestandteil der Laufzeit oder eine neue Kampfregel.
Unabhängiger Produktdiff-Review und spätere gesammelte ST-Smokes bleiben offen;
kein persönlicher Spieltest-GO allein aus dieser Implementierung.
