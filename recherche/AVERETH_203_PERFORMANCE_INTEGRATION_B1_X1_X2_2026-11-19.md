# Avereth .203 · Boardrepair, Extractorbenchmark und integrierter Spieltestkandidat

**Technischer Entscheid vom 19.11.2026.** Der gemeinsame Kandidat verwendet den S1-Minifix und den gezielten B1-Boardrepair. Der Extractor behält den ursprünglichen Ausgabevertrag. X1 ist die reproduzierbare Benchmarkgrundlage, X2 bleibt ein separat aufrufbarer Ausgabeversuch. Für eine natürliche Qualitäts- oder Zeitwirkung des kürzeren JSON fehlen neue Modellantworten. Der unabhängige Schlussreview und die persönliche Testfreigabe stehen aus.

## B1 · Implementierter Boardrepair

`generateBoard` verwendet weiterhin höchstens zwei physische Anfragen. Bei fünf neuen Novice-Listings im Profil `count_hunt_clear` kann der zweite Request genau einen Einstiegshunt anfordern. Ein gültiger JSON-Erstentwurf (auch im JSON-Codeblock), genau vier angenommene Angebote, eindeutiger Titel, derselbe lokale Habitatfehler bei Einzelprüfung und erfüllbare Gesamtquoten sind dafür erforderlich. Die unveränderten Originalobjekte bleiben auf ihren Positionen. Die Engine prüft Slotnummer und Antwortformat und übergibt die zusammengesetzte Fünfertafel erneut an `parseBoard`. Ein ungeeigneter zweiter Versuch lässt die neue Tafel ungebucht.

| Original | Ablehnung → archivierter Ersatz | Tafel und Buchung | Originaler Repairinput → experimenteller Input | Kompakte Ausgabe voll → Slot |
|---|---|---|---:|---:|
| User04 (.159) | Slot 1, zu starker Boar → Millrace Viper | 5/5, alle zehn Events identisch | 3.949 → 3.057 | 941 → 172 |
| User05 A (.202) | Slot 4, unpassender Snapper-Körperbau → Stray Hound | 5/5, alle zehn Events identisch | 3.759 → 3.083 | 922 → 176 |
| User06 (.203) | Slot 1, zu starker Pike → Marsh Adder | 5/5, alle zehn Events identisch | 3.905 → 3.066 | 878 → 192 |

Alle Zahlen sind GLM-Tokens. Der gemessene Prompt enthält die tatsächlichen Stärkeschwellen und passenden Anker. Verglichen wurden der neue Laufzeitpfad mit aus Vollantworten rekonstruierten Slotobjekten, die vollständig validierte zweite Archivantwort und die historischen Buchungen. Die Welten, Quoten und Questidentitäten stimmten in allen drei Fällen überein. Ein gültiger erster Aufruf genügte, ein vorhandenes Tagesboard erzeugte keinen Bedarf. Die abgelehnten Fälle umfassten falsche Position, unpassende Habitatwerte, doppelte Population, falsche Quote, falsches Format und abgeschnittenes Ersatz-JSON. Defektes Gesamt-JSON, gleichnamige Kandidaten, zwei lokale Fehler, doppelte Jagd, zwei Clearances und eine durch den lokalen Fehler verdeckte globale Quotenverletzung gingen in den Vollrepair.

Beim historischen Replay kann ein archiviertes zweites Fünferarray nur einen Ersatz für den neuen Drahtvertrag liefern. Die Wiedergabe entnimmt explizit den angeforderten Slot. Bei `b19-mage#13` änderte das Modell früher zusätzlich Slot 4 von „Cull the Old Bridge Wyrm“ zu „Kill the Old Bridge Wyrm“. Die neue Vorgabe bewahrt das erste gültige Angebot. Ein vollständiger Diff ergab ausschließlich den Titel, die daraus abgeleitete Quest-ID und deren Verweise. Nur dieser Prüfwert erhielt einen dokumentierten Nachfolger. Das historische Replaykorpus und seine bisherigen Abnahmen blieben erhalten. Die 114,291 s aus User06 betreffen beide damaligen Vollanfragen. Für eine neu generierte Slotantwort fehlen persönliche Qualitäts- und Zeitmessungen.

Die B1-Einzelabnahme umfasste 182/182 fokussierte und 3.398/3.398 vollständige Node-Prüfungen. Von 2.235 Replayfällen entsprachen alle 1.131 Abweichungen ihrem einzeln festgelegten Ergebnis. In ST 1.19 bestanden 342/342 Standard- und 348/348 Failsoft-Prüfungen. Der erste Standardlauf endete beim Zurücksetzen einer HUD-Testszene vor der Auswertung. Der zunächst rote gezielte Browservergleich machte einen weiteren Unterschied sichtbar. Zwei eigenständige Aufrufe messen verschiedene Millisekunden in `cmd.interpreted` und `extract.applied`. Die Prüfung vergleicht zwischen den Armen sämtliche fachlichen Felder. Vor und nach Reload vergleicht sie auch die gespeicherten Laufzeiten exakt. [B1-Implementierung][b1] · [ursprüngliche Offlineanalyse][b1report]

## X1 · Rekonstruktion und fachliche Gegenprüfung

Der Benchmark öffnet in einer vollständigen Kopie des Chatpräfixes ausschließlich die gewählte Antwortrevision für die Extraktion. HUD- und Eingabedaten sowie andere Swipes bleiben erhalten. Die Zuordnung verlangt die vollständige Prosa im REPLY-Abschnitt. Bei Reparaturen gehören der ursprüngliche Prompt und eine gegebenenfalls zitierte frühere Antwort zum selben Versuch. Mehrdeutige, überholte oder fehlende Belege werden ausgewiesen. Der Parser erhält Kampagnenvokabular, IDs, erwartete Aktionen, Startszene, Zustand und volle Narration aus `extractionRequest`. Unabhängig von der Einzelbewertung läuft jeder belegte Job durch die Auswahl-, Reparatur- und Commitlogik von `runExtraction`. Der HTTP-Test mit zeitversetztem Body bestätigt das Ende der Uhr nach dem letzten Bodybyte. [Benchmark, Tests und Offlineanleitung][x1]

| Archiv | Zugeordnete physische Antworten | Jobs mit belegten Antworten | Durch .203 abgerufene Antworten | Welt nach Job wie im Archiv |
|---|---:|---:|---:|---:|
| User05 A | 5/5 | 5 | 5 | 5/5 |
| User05 B | 7/7 | 7 | 7 | 7/7 |
| User05 C | 8/8 | 7 | 7 | 7/7 |
| User06 | 12/12 | 10 von 11 im Chat dokumentierten Jobs | 12 | 10/10 |

Alle 31 tatsächlich benötigten Request-Nachrichtenarrays ließen sich in Inhalt und Reihenfolge identisch zum jeweiligen archivierten Array aufbauen. Der 32. physische Versuch bleibt als historische Einzelantwort prüfbar. In User05 C nimmt .203 bei I34 bereits die erste Antwort an. Die fachliche Welt ist gleich, das geordnete Protokoll enthält die abweichende Repair-Kennzeichnung. Insgesamt stimmen 29/29 gefaltete Welten und 28/29 Ereignisfolgen mit dem historischen Ergebnis überein. In User06 I25 belegt der Chat einen 20,611-s-Abschluss. Sein physisches Paar fehlt im hochgeladenen Log. Es wurde keine Antwort ergänzt.

Von 32 Einzelantworten waren 31 parsergültig. Bei der direkten Questannahme (User06 I14) fehlte im ersten Versuch das auswertbare Deltaarray. Der zweite Versuch lieferte das Vertragsdetail. Beim Dungeonbetreten (I18) sind insgesamt zwei physische Anfragen belegt, davon eine Reparatur. Die erste Antwort war schemafähig, die Szenenhinweise zur Chronologie forderten eine Reparatur an. Nach der zweiten Antwort wies die Firewall noch zwei Deltas wegen `scene_context` ab. Der 55,786-s-Arcane-Wave-Fall I20 benötigte einen Versuch. Die Waffen der beiden Lookouts blieben ihren jeweiligen Trägern zugeordnet. Der gewöhnliche I6-Fall erreichte die Gilde samt anwesender Schreiberin in einem Versuch. [User06-Originalauswertung][u6]

**Eine gleiche Replaywelt kann eine fachliche Lücke enthalten.** Die Dungeonprosa lässt die Torwache am Palisadentor zurück, bevor Alaric allein um die Biegung geht. Das gebuchte Ergebnis führt beide Lookouts und weiterhin die Torwache in `scene.present`. Der separat aus der Prosa abgeleitete Prüfpunkt schlägt auf der historischen Endantwort und ihrem Replay an. Die unterschiedlichen Zimmerbezeichnungen sind außerdem im Kontext der kanonischen Dungeonabschnitte zu lesen. Die Beobachtung begründet hier keine Änderung der Weltregeln.

Sechs natürliche Revisionen tragen eng benannte Prosa-Anforderungen. Die übrigen erhalten kein pauschales Vollständigkeitsurteil. Kontrollierte Gegenbeispiele verändern die NPC-Partei, lassen eine belegte Zusage aus, unterdrücken eine tatsächlich erzählte Ankunft, schieben einen verworfenen Swipe unter oder ergänzen eine erfundene Tatsache. Parsergültigkeit, Hinweise/erwartete Schlüssel, zugelassene und abgewiesene Vorschläge, gebuchte Ereignisse, Weltgleichheit und annotierter Inhalt sind einzeln prüfbar. 19/19 gezielte X1-Tests sowie die Archivprüfungen liefen offline.

## X2 · Kompakter Ausgabevertrag

Der getrennte Benchmarkmodus B ergänzt einen kurzen Satz am bestehenden Ausgabeauftrag. Er verlangt einzeiliges JSON mit allen erforderlichen Schlüsseln und allen belegten Deltas. Weglassbar sind ausschließlich Nullwerte auf Deltaobjekten, die der vorhandene Normalisierer wieder ergänzt. Arm A verwendet den ursprünglichen Auftrag. Die B-Antworten sind aus denselben archivierten Inhalten erzeugt. Ungültiges Original-JSON wird durch das Verfahren nicht repariert. Parser, Firewall, Eingabekontext und Spielmechanik waren in beiden Armen identisch. [X2-Versuch und Aufruf][x2]

| Archiv | Physische Vergleiche | Sichtbare GLM-Inhaltstokens A → B | UTF-8-Bytes A → B | Historische Provider-Completion A |
|---|---:|---:|---:|---:|
| User05 A–C | 20 | 4.555 → 3.440 (−24,5 %) | 14.307 → 12.293 | 6.685 |
| User06 | 12 | 2.532 → 1.998 (−21,1 %) | 8.059 → 6.994 | 3.702 |

Der GLM-Tokenizer wurde lokal mit festem SHA-256 geprüft. Jedes der 32 Paare ergab dieselben Parserwerte, Hinweise, Ablehnungen und Einzelbewertungen. In den 29 vollständigen Jobs stimmten Ereignisse in Reihenfolge, Welt und Zustand nach JSON-Speichern und erneutem Falten überein. Beide Arme riefen im Korpus 31 Antworten einschließlich zweier Reparaturen ab. Die Anwesenheitsabweichung blieb in beiden Armen sichtbar. In einem zusätzlichen kontrollierten Tam-Ostler-Fall wiesen beide Arme eine erfundene freiwillige Ortsänderung zurück. Die an Tam und Alaric gebundene Zusage erreichte nach einem lokalen Reload und 16 weiteren Enginezügen den neuen Narratorkontext, der die ursprüngliche Prosa nicht erhielt.

Die lokalen Medianzeiten je Parseraufruf in einem warmen Lauf lagen für A/B in Millisekunden bei 0,196/0,234 (User05 A), 0,238/0,241 (B), 0,301/0,270 (C) und 0,111/0,105 (User06). Pro physischer Antwort wurden nach dem Aufwärmen fünf Durchläufe je Form mit wechselnder Reihenfolge gemessen. Diese Werte betreffen ausschließlich die lokale Verarbeitung. Für B sind weder neue Modellausgaben noch Provider-Usage oder Providerlatenz gemessen. **Entscheidung für diesen Kandidaten:** X2 bleibt eine rücknehmbare Benchmarkhypothese. Für eine Integration wäre zu klären, ob ein Modell die kürzere Form eigenständig erzeugt und dabei auch seltene und implizite Weltfolgen vollständig überträgt.


## Gemeinsame Abnahme

Die Integrationsbasis ist der bereits geprüfte S1-Minifix `af45acf499137009883a55b1c3e1004567470a9f`. Der Merge mit B1 hatte keine manuellen Konfliktauflösungen. Die Laufzeitdateien des S1-Host-/Requestpfads sind identisch zum S1-HEAD. Board- und Runtimecode sind identisch zum B1-HEAD. Extractor und Weltjobabschluss entsprechen der .203-Basis. Der Kandidat enthält die für B1 benötigten Replays und Testadapter. Die X-Benchmarkbranches sind separat. [S1][s1] · [B1][b1] · [Kandidat][candidate]

Im gezielten ST-Vergleich wurden drei Spielzüge auf demselben gespeicherten Anfangszustand ausgeführt. Die Narration ließ ausdrücklich drei Minuten während des Lesens der Questtafel verstreichen. Der Extractor musste genau eine passende Weltbuchung liefern.

| Arm | Beobachtete physische Aufrufe | Prüfung nach Speichern und Reload |
|---|---|---|
| Gültige Erstgenerierung, gepuffert | Planner, Board, Narrator, Extractor | Fünf Quests, drei Minuten und bestätigtes Read-back |
| Vollrepair, gepuffert | Planner, Board, Board, Narrator, Extractor | Identische Ereignisfolge und Welt |
| Einzelslotrepair, natives Streaming ohne Smooth | Planner, Board, Board, streamender Narrator, Extractor | Identische Ereignisfolge und Welt |

Der Test kontrolliert den tatsächlich übertragenen Streamschalter pro physischem Request. Die vier strukturierten Aufrufe im Slotarm blieben gepuffert. Innerhalb jedes Arms stimmten die geladenen und gespeicherten Weltdaten einschließlich Ereigniswerten exakt überein. Für den Vergleich zwischen eigenständigen Armen wurden ausschließlich die verstrichenen Millisekunden der Planner- und Extractorereignisse ausgelassen. Zusätzlich zeigte ein erneuter Read der drei archivierten Tagestafeln durch die normale Zugvorbereitung jeweils `board.shown` mit denselben Listings und null Boardrequests.

Die isolierte Installation verwendete ST 1.19.0, den lokalen Mockprovider und Chromium. Der gezielte gemeinsame Boardsmoke bestand 43/43, der separate Narrator-Streaming-Smoke 59/59. Die 161 fokussierten und 3.406 vollständigen Node-Prüfungen bestanden. Im Replay waren alle 1.131 Abweichungen unter 2.235 Fällen exakt abgedeckt.

Im vollständigen integrierten ST-Lauf bestanden **348/348 Standard** und **354/354 Failsoft**, jeweils mit null PageErrors.

## Branches und geänderte Dateien

Alle Pfade der Experimentbranches liegen unter `avereth-engine/`. Die angegebenen Diffs beziehen sich auf die jeweilige Ausgangsbasis.

- `experiment/203-board-slot-repair` · `f18ec4a8a67d7dfbc6c5c61db62482bfc1548b01` · `package.json`, `src/v4/guild.js`, `src/v4/runtime.js`, `tests/replay/accepted_board_slot_vs_126.json`, `tests/replay/replay.test.js`, `tests/v4/batch191_lib.js`, `tools/board_slot_offline.mjs`, `tools/replay/contract_board_slot.mjs`, `tools/replay/replay.mjs`, `tools/st_live/board159_smoke.mjs`, `tools/st_live/isolated.mjs`, `tools/st_live/run_c.mjs`.
- `experiment/203-extractor-benchmark` · `2bad913b0dba624e569392d7b29a10241f0aad15` · `docs/EXTRACTOR_BENCH_203.md`, `tests/v4/bench_extract_revision.test.js`, `tests/v4/patch82.test.js`, `tools/bench_extract.mjs`, `tools/bench_extract_archive.mjs`, `tools/bench_extract_expectations.mjs`.
- `experiment/203-extractor-compact-offline` · `1123b7e5b9d130145f95f860d466842e2cc8ea6e` · `docs/EXTRACTOR_BENCH_203.md`, `tools/bench_extract.mjs`, `tools/bench_extract_compact.mjs`.
- `experiment/203-performance-review-candidate` · `399eb5b9f1f814f32a63bdc219f8499dfc107f0b` · `package.json`, `src/v4/guild.js`, `src/v4/runtime.js`, `tests/replay/accepted_board_slot_vs_126.json`, `tests/replay/replay.test.js`, `tests/v4/batch191_lib.js`, `tools/board_slot_offline.mjs`, `tools/board_slot_tokens.py`, `tools/replay/contract_board_slot.mjs`, `tools/replay/replay.mjs`, `tools/st_live/board159_smoke.mjs`, `tools/st_live/isolated.mjs`, `tools/st_live/run_c.mjs`.
- `main` · `03_AKTUELLER_PROJEKTSTAND.md`, `recherche/README.md`, `recherche/AVERETH_203_PERFORMANCE_INTEGRATION_B1_X1_X2_2026-11-19.md`.

## Grenzen und nächste Entscheidung

Der Kandidat ist für den unabhängigen Schlussreview bestimmt. Für einen später freigegebenen persönlichen Versuch sind im ST-Profil natives Chat-Completion-Streaming (`stream_openai`) und deaktiviertes `power_user.smooth_streaming` die verglichenen Einstellungen. Die ungesendete Eingabe beim vollständigen Browser-Reload ist weiterhin eine bekannte Einschränkung. Provider, die keinen erkennbaren regulären Streamingabschluss liefern, lassen die Revision unvollständig. Ein fachlich unzulässiger Boardersatz bleibt ein fehlgeschlagener zweiter Versuch. Es gab keine Modellinferenz, keinen persönlichen ST-Test und keine Produktintegration. Eine neue persönliche Messung von Boarderfolgsrate, Wartezeit und Spielgefühl bedarf der Freigabe des Nutzers.

[s1]: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/af45acf499137009883a55b1c3e1004567470a9f
[b1]: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f18ec4a8a67d7dfbc6c5c61db62482bfc1548b01
[x1]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2bad913b0dba624e569392d7b29a10241f0aad15/avereth-engine/docs/EXTRACTOR_BENCH_203.md
[x2]: https://github.com/Mango1331/Claude-AI-RPG-Game/blob/1123b7e5b9d130145f95f860d466842e2cc8ea6e/avereth-engine/docs/EXTRACTOR_BENCH_203.md
[b1report]: AVERETH_203_B1_GILDENBOARD_EINZELSLOT_2026-11-19.md
[u6]: ../testrun_10b/user-20261119-010838/PERFORMANCE_USER06_203_VORAB_2026-11-19.md
[candidate]: https://github.com/Mango1331/Claude-AI-RPG-Game/commit/399eb5b9f1f814f32a63bdc219f8499dfc107f0b
