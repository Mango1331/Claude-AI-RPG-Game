# Eine bezahlte Nacht revidieren

Separater Klon aus GB26 auf der unveränderten .211. Alaric hatte sein Bett tatsächlich bezahlt und geschlafen. Ein neuer nativer Swipe der Schlafantwort und die Rückwahl lassen die bereits autorisierten Spielerevents bestehen. Das anschließende Edit der **früheren** Spielerentscheidung M59 ersetzt den Kauf durch die Entscheidung, das Zimmer abzulehnen. Der Fold und das HUD zeigen nach Reload wieder den Zustand vor dem Kauf. Ein neuer natürlicher Folgeturn am kostenlosen Sitzplatz hält dieses Ergebnis.

| Prüfung | Uhrzeit in Weltminuten | Geld | HP / MP |
|---|---:|---:|---:|
| Import GB26, neue Schlafantwort, Rückwahl | 1920 | 20 cp | 95 / 72 |
| Frühere Kaufentscheidung editiert, vollständiger Zustand exakt gleich GB24 | 1123 | 26 cp | 31 / 33 |
| Neues Gespräch über einen freien Platz | 1123 | 26 cp | 31 / 33 |

[Prüfergebnis mit tatsächlichem HUD](zahlungspruefung.json) · [Offline nachrechnen](../../../recherche/langzeittest_211/zahlungsrevision.py) · [Studienübersicht](../README.md)
