# Natürliche E-Rank-Kampagne auf .263

Neun verbundene Aufzeichnungen aus isoliertem SillyTavern 1.19.0. Die Forks beginnen am verifizierten Chat und gefalteten Zustand ihres jeweiligen Elternlaufs. Die Zahlen zählen nur die neu ausgeführten Eingaben und physischen Aufrufe. E und Hunt beginnen mit demselben vorbereiteten E-Zustand. Ihre Transaktionen gehören zu getrennten Spielverläufen. [Fach- und Abnahmebericht](../../recherche/AVERETH_263_E_RANK_IMPLEMENTIERUNG_ABNAHME.md)

| Lauf und Originalmanifest | Elternlauf | Produkt | Eingaben | Modellaufrufe | USD | Gebuchtes Ergebnis oder beobachtete Grenze |
|---|---|---|---:|---:|---:|---|
| [Field](Field/SOURCE_MANIFEST.json) | AI .235 vor Eingabe 15 | `dcce436a` | 6 | 18 | 0.010741042 | F-Gruppe mit Ossen, Rationskauf und Rückkehr zur Gilde. |
| [E](E/SOURCE_MANIFEST.json) | Field + E-Start | `fc686cc0` | 7 | 23 | 0.014671582 | Proven-Board im Zwischenstand ohne brauchbare Habitatbindung. Feinen E-Stab tatsächlich gekauft. |
| [Study](Study/SOURCE_MANIFEST.json) | E | `9cc039b6` | 4 | 12 | 0.007477454 | E-Stone für 220 cp gekauft und aktiviert. Rimed Aegis Ward auf P1 gespeichert. |
| [Delve](Delve/SOURCE_MANIFEST.json) | Study | `bc3777d5` | 17 | 50 | 0.031114166 | Durch F1 und E2. Ossen im Bosskampf gefallen. E2 abgeschlossen, zwei eigene Encounters als Entwicklungsnachweis. |
| [Mastery](Mastery/SOURCE_MANIFEST.json) | Delve | `928172b9` | 3 | 9 | 0.006046800 | Ascendant Flame Lance und Klassenmerkmal angenommen. Rückweg zum Eingang. |
| [Hunt](Hunt/SOURCE_MANIFEST.json) | Field + derselbe E-Start | `9cc039b6` | 7 | 24 | 0.015378880 | Korrigierte Proven-Jagd auf den gebundenen Dock Bear angenommen. Kampf bis auf 21 verbleibende Gegner-HP. |
| [Return](Return/SOURCE_MANIFEST.json) | Hunt | `9cc039b6` | 5 | 15 | 0.010187968 | Bär besiegt, ein Fell und vier Klauen erhalten, 330 cp einmalig gebucht und zwischen Alaric und Ossen geteilt. |
| [Sale](Sale/SOURCE_MANIFEST.json) | Return | `928172b9` | 3 | 9 | 0.006198608 | Erster Verkaufsversuch. Gesprochene Gebote wurden keinem gültigen Käufer zugeordnet. Fell blieb bei Alaric. |
| [Pelt](Pelt/SOURCE_MANIFEST.json) | Sale | `928172b9` | 3 | 10 | 0.006670240 | Bekannten Händler aufgesucht. Ein Fell für 440 cp verkauft, vier Klauen behalten. |

**Abrechnung.** 55 Eingaben führten zu 170 abgerechneten Aufrufen mit 2.335.750 Input- und 63.645 Outputtokens. Die 170 Aufrufe verteilen sich auf 55 Planner-, 57 Narrator-, 55 Extractor-, 2 Board- und 1 Partyentscheidungs-Aufrufe. Alle 170 Abschlüsse enthalten eine Generation-ID und Providerabrechnung. Istkosten **0,108486740 USD** bei 1,00 USD Freigabe für das Gesamtpaket. Route `z-ai/glm-5.3-flash` über `wafer/us`. Die physische Reihenfolge enthält jeweils einen Abschluss vor dem nächsten Start.

**Messgrenze.** Die getrennt gespeicherten Hostzeitpunkte für Weltabgleich und bestätigte Persistenz stehen pro Eingabe in `turns.jsonl.gz`. In 53 Einträgen liegt ein Extraktions-/Validierungsintervall vor (Median 4352 ms). Für den Save-Readback liegen 53 Werte vor (Median 283 ms). Die erste Dauer schließt die zugehörige Modellwartezeit ein.

**Rekonstruktion.** Jedes Manifest enthält Commit und SHA-256 der komprimierten Dateien. `parent-check` und `world-0` halten Nachrichten- und Weltbezug des Starts fest. Der Chat enthält die zugehörigen Revisionen. `last-verified-world` ist der letzte aus dem Verlauf überprüfte Weltzustand. `requests.jsonl` enthält die tatsächlich gesendeten Nachrichten und die Abrechnung pro Aufruf. `raw-*.gz` enthält die physische Antwort. `actions`, `turns`, `events`, `visible`, Profil und redigiertes ST-Log ergänzen die Rekonstruktion. Alle gzip-Dateien wurden nach dem Export dekomprimiert und gegen die Manifestprüfsummen geprüft.

**Vorbereiteter E-Start.** Der F-Verlauf beginnt mit dem archivierten AI-Präfix. Nach dessen Fortsetzung wurden ausschließlich für den E-Start XP, Statverteilung, Ressourcen, Proven, Startgeld und vorhandene Skill-Proficiency als Testvoraussetzungen gesetzt. Die Ereignisliste liegt separat vor. Die späteren Erwerbe, Encounters, Entwicklungsangebote, Zahlungen und der Tod des Begleiters sind in den jeweiligen Folgechats gebucht. [Fixture-Ereignisse](e-fixture.json.gz) · SHA-256 der gzip-Datei `b65ced453c4f4a71b2909a3c533b043513a728d99a40d61040cb844efa8cd1ff`.
