# Avereth – aktuelle Vergleichsmessungen

Unterschiedliche Endpunkte, Builds, Provider und Stichproben getrennt halten. Keine gemischten Durchschnittswerte. Die vollständigen Messdaten bleiben bei den Originalen.

| Quelle | Umfang / Messdefinition | Werte |
|---|---|---|
| [Claude-Gegenreview .261](../../recherche/AVERETH_261_CLAUDE_BEWERTUNG_GPT_GEGENREVIEW_UND_NAECHSTE_SCHRITTE.md) | Archivierte natürliche .222–.251-Läufe, korrigierte Wartezeit Narrator-Ende → bereit | Median 3,9 s bei einem X, 8,8 s bei zwei X. Keine .261-Livemessung. |
| [.261/.262-Vergleich](../openrouter-20261128-fundament-262/README.md) | 8/10 erzählte Züge; 61 physische Aufrufe | Median Narrator-Ende → bereit 3,642/3,620 s, X je erzähltem Zug 1,00/1,10. Kein Nachweis kausaler Beschleunigung. [Abnahme und Methodik](../../recherche/AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md). |
| [.263 E-Abnahme](../openrouter-20261128-e-rank-263/README.md) | 55 Eingaben, 170 Aufrufe; 53 Extraktions-/Validierungs- und Readbackintervalle | Median X/Validierung 4,352 s, Save-Readback 0,283 s. Nicht identisch mit Narrator-Ende → bereit. Kosten 0,108486740 USD; mehrere Zwischencommits. |
| [.262 Skalierung und Progression](../../recherche/AVERETH_262_RANGFAEHIGES_FUNDAMENT_ABNAHME.md) | Synthetische Zustände und Auszahlungsprojektion | [Einzelmessungen](../../recherche/abnahme_262/). Bytes ≠ Tokens; XP-Rechnung ≠ Spielzeit. |

Usertest 17 ausstehend. Persönliche Messungen separat mit Build, Route, Streaming, Stichprobe und tatsächlichen Endpunkten dokumentieren.

## Historische Vergleichsbasis

<a name="persönlicher-spieltest-auf-featherless"></a>

- [Vor .204: .202/.203, alte Architektur und gepaarte A/B-Vergleiche](archiv/README.md).
- [Nach Integration: persönliche und natürliche Messungen .204–.213](archiv/VERGLEICHE_204_BIS_213.md).
- [Historischer Originalindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5138718a53cae6eac92eeb695ebbba660f4cca2a/testrun_10b/durchschnittsmessungen/README.md).

[Runindex](../README.md) · [Projektstand](../../03_AKTUELLER_PROJEKTSTAND.md).
