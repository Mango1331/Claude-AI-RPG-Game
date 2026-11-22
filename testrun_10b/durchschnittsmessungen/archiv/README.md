# Messarchiv vor der integrierten .204-Linie

Die persönliche Referenz endet mit dem gepufferten `.203`-Stand bei `5e5b827`. Auf den anschließenden .203-Experimentbranches wurden alte und optimierte Varianten parallel gemessen. Die A/B-Paare bleiben mit ihren gemeinsamen Rohdaten verbunden. [Messungen ab Integration und User08](../README.md)

## Persönliche Spieltests vor der Integration

Sekunden pro erzähltem Zug, jeweils **arithmetisches Mittel / Median**. Aus dem vollständigen Chat wurden Antworten mit Narration, `gen_started`, `gen_finished` und `extra.avereth.extraction.ms` ausgewertet. Die zweite Zeitgröße addiert den Extractorjob für dieselbe Antwort. Der bestätigte Save und der Zeitpunkt der nächsten sicheren Eingabe fehlen. Beide Serien verwenden gepufferte GLM-5.3-Flash-Narration.

| Build und Messfenster | Erzählzüge | Host bis Erzählende | Host + Extractor, Untergrenze | Quelle |
|---|---:|---:|---:|---|
| .202 User05, Phasen A–C zusammen, Featherless | 19 | 37,42 / 30,25 | 60,61 / 54,01 | [Kumulativer Originalchat](../../archiv/user-20261118-011503/originals/phase_c_chat.jsonl) · [Messdefinition und Mediane](../../../recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md) |
| .203 User06, ursprünglicher Stand `5e5b827` | 11 | 43,11 / 26,86 | 73,32 / 60,75 | [Manifest mit Originalchat](../../archiv/user-20261119-010838/README.md) · [Vorauswertung und Abdeckung](../../archiv/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md) |

Die Stichprobe zählt gespeicherte Erzählantworten, einschließlich zusätzlicher Narration ohne neue Spielerabsicht. Unterschiede in Szenen und Providerbedingungen begrenzen den Vergleich mit dem [persönlichen .204-Lauf](../README.md#persönlicher-spieltest-auf-featherless).

## Gepaarter Architekturvergleich auf Featherless

Zehn Spielzüge pro Arm mit gemeinsamem Ausgangsstand. A verwendet die gepufferte .203-Referenz `5e5b827`, B die Optimierungssuite `8df38d3` mit nativem Streaming, Board-, Katalog- und Save-Änderungen. Dieselben Endpunkte stehen nebeneinander. Alle Angaben sind Sekunden ab Senden, jeweils **arithmetisches Mittel / Median**.

| Messpunkt | Paare mit beiden Zeitpunkten | A · ursprüngliche Architektur | B · optimierte Suite |
|---|---:|---:|---:|
| Erster lesbarer Satz | 9 | 21,961 / 18,894 | 10,382 / 9,824 |
| Host-Erzählende | 10 | 39,239 / 22,107 | 32,928 / 23,409 |
| Sichere Folgeeingabe nach Speichern | 10 | 62,868 / 44,786 | 59,315 / 55,379 |

Die Werte stammen aus `pairedByTurnIndex` in Millisekunden, in Sekunden umgerechnet und auf drei Nachkommastellen gerundet. Im A-Boardzug war der erste Satz im sichtbaren Fenster unbelegt. Ab Zug 9 entwickelten sich Ort und Ziel auseinander. [A/B-Kennzahlen](../../../recherche/performance_natural_ab_203/kennzahlen.json) · [Versuchsaufbau und Einzelzüge](../../../recherche/AVERETH_203_NATUERLICHER_FEATHERLESS_AB_2026-11-19.md)

## Katalogvergleich innerhalb der optimierten Linie

Sechs Handelspaare auf OpenRouter, GLM-5.3-Flash über `wafer/us`, beide Arme mit nativem Streaming. A ist B3 (`6d9770f`), B die kürzere Katalogfassung aus Zyklus 3 (`25c46bc`). Die Szenen, Eingaben und Ausgangswelten stimmen innerhalb jedes Paars überein.

| Messpunkt, Sekunden ab Senden | Paare | A · B3, Mittel / Median | B · kurzer Katalog, Mittel / Median |
|---|---:|---:|---:|
| Erster lesbarer Satz | 6 | 7,86 / 6,25 | 14,97 / 16,22 |
| Sichere Folgeeingabe nach Speichern | 6 | 19,14 / 15,98 | 37,74 / 33,66 |

Die Gruppenwerte umfassen die sechs abgeschlossenen Paare. Der vorherige abgebrochene Anlauf und die Canaries sind im Abschlussbericht gesondert ausgewiesen. [Kennzahlen](../../../recherche/openrouter_handel_203/natuerlicher_neustart/kennzahlen.json) · [Abschlussbericht](../../../recherche/AVERETH_203_OPENROUTER_HANDEL_AB_ABSCHLUSS_2026-11-20.md)

## Weitere historische Messfenster

- Ein früher Runner erfasste Spielzeit einschließlich Testspielerentscheidung sowie die Zeit bis zum HUD. [Batch vom 28. Oktober, Abschnitt 4](../../archiv/batch-20261028-051913Z/REVIEW.md)
- Im .174-NPC-Pilot betrug die summierte Modellzeit im Mittel rund 57 Sekunden je Erzählzug (63 Züge). Das Architekturaudit weist Aufrufzahlen und Modellzeit je Rolle aus. [Pilot-Audit, Abschnitt 2.2](../../../recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md)
- Für .191 und den persönlichen .200-Fehler sind einzelne Szenen und Requestspannen dokumentiert. Der .200-Fall endete mit einem Extractor-Timeout. [Architekturaudit mit Originalfenstern](../../../recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md)
- Für Kampfbalance liegen eigenständige Simulationen mit Ergebnissen je Gegner, Klasse und Seed vor. [Analyse .195](../../../recherche/AUSRUESTUNG_KAMPFBALANCE_ANALYSE_195_2026-11-15.md) · [Gepaarte .196–.198-Simulation und Abschlussmatrix](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/BALANCE_198_SIMULATION.md)
