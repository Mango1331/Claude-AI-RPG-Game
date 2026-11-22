# Durchschnittsmessungen der optimierten 10B-Architektur

Hier stehen die Vergleichsreihen ab der Integration der Performance-Änderungen in `.204` (`b51e850`). Für den persönlichen User08-Lauf auf `.205` liegen noch keine Messdaten vor. [Frühe Messreihen und direkter Vorher-/Nachher-Vergleich](archiv/README.md) · [Runverzeichnis](../README.md)

## Persönlicher Spieltest auf Featherless

Zeit in Sekunden pro erzähltem Zug, jeweils **arithmetisches Mittel / Median**. Der Host misst vom ST-Generierungsstart bis zum Erzählende. Für die Untergrenze wird pro Zug die Dauer des zugehörigen Extractorjobs einschließlich Repairs addiert. Die tatsächliche Freigabe nach dem Speichern wurde im persönlichen Lauf nicht aufgezeichnet. Für User07 ist trotz integrierter Streaming-Unterstützung `stream:false` protokolliert.

| Build und Messfenster | Erzählzüge | Host bis Erzählende | Host + Extractor, Untergrenze | Quelle |
|---|---:|---:|---:|---|
| .204 User07, Phase 1 mit erstem Questboard | 4 | 114,66 / 97,81 | 132,29 / 113,18 | [Originalchat Phase 1](../archiv/user-20261121-171341-204/ORIGINAL_CHAT.jsonl) |
| .204 User07, nur Zuwachs in Phase 2 | 22 | 40,12 / 33,46 | 73,92 / 62,61 | [Auswertung Phase 2](../archiv/user-20261121-171341-204/REVIEW_GPT_PHASE2_2026-11-21.md) |

Die beiden Fenster gehören zum selben Chat. Phase 2 umfasst die 22 zusätzlichen Antworten nach den ersten vier. Dieselben beiden Zeitgrößen für User05 und User06 stehen im [Messarchiv](archiv/README.md#persönliche-spieltests-vor-der-integration).

## Natürliche Vergleichsläufe auf OpenRouter

Browserzeit ab Senden, jeweils **arithmetisches Mittel / Median** in Sekunden. Der erste lesbare Satz und die erste sichere Folgeeingabe nach bestätigtem Speichern wurden getrennt beobachtet. Beide Läufe verwendeten GLM-5.3-Flash auf der Route `wafer/us` mit nativem Streaming. Die Werte wurden aus den verlinkten Einzelmessungen berechnet.

| Build und Test | Erzählzüge | Erster lesbarer Satz | Sichere Folgeeingabe | Einzelmessungen |
|---|---:|---:|---:|---|
| .204 Glassmere, freie Codex-Kampagne, `b51e850` | 35 | 4,91 / 3,96 | 12,93 / 11,26 | [Kennzahlen pro Zug](../archiv/codex-204-glassmere-20261120/kennzahlen.json) |
| .204 Camp-Gegencheck, `4ff1500`, vor R1/R2 | 6 | 4,27 / 4,11 | 13,80 / 14,01 | [T4 in Millisekunden](../archiv/user07-camp-openrouter-20261122/messwerte.json) |

Glassmere enthält 41 Eingaben. Die Tabelle verwendet die 35 regulären Erzählzüge mit Zeit ab Senden. Fünf Eingaben hatten keine Narration, T10 wurde erst ab „Regenerate“ gemessen. Der Camp-Gegencheck startete von zwei gespeicherten Präfixen und umfasst alle sechs Eingaben. Der diagnostische Reload folgte jeweils auf die gemessene Freigabe. [Glassmere-Lauf](../archiv/codex-204-glassmere-20261120/README.md) · [Camp-Gegencheck](../archiv/user07-camp-openrouter-20261122/README.md)

Für User08 eine eigene Zeile mit tatsächlichem Build, Route, Streamingmodus, Messfenster und Stichprobengröße ergänzen. Die persönliche Reihe lässt sich bereits aus einem Chat mit Host- und Extractorzeiten fortführen. Werte für erste sichtbare Prosa oder sichere Eingabe setzen die entsprechenden Zeitpunkte im Host voraus.
