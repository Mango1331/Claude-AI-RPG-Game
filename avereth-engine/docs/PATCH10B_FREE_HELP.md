# .83 – Freie NPC-Hilfe statt formaler Privatquests

Basis: d947645 / .82. Verbindliche Entscheidung des Projektinhabers vom 25.10.2026; Kanon auf main in 02. Run-13-Gegenprüfung separat: [SOL_COUNTERREVIEW.md](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261025-081303Z-current_test/SOL_COUNTERREVIEW.md). Original-ZIP und ursprüngliche GPT-Review sind unverändert.

## Verhalten und Kompatibilität

Neue Kampagnen starten mit campaign.started.private_quests:false; der Reducer übernimmt diese Entscheidung in meta. Fehlt das Feld in einem historischen Start-Event, bleiben Zustand und bisherige Privatquest-Semantik unverändert. Es gibt keine automatische Migration, Löschung oder nachträgliche Gutschrift. Auch alte Kampagnen mit offenen, abgeschlossenen oder unbezahlten Privatjobs bleiben ladbar und weiter spielbar. Die Legacy-Reducer und das dafür benötigte private_jobs-Modul bleiben aus diesem Grund erhalten.

In neuen Kampagnen werden keine Privatquests mehr erzeugt oder angenommen. Private Detail-/Fortschritts-/READY-/Abschlussansprüche, Arbeitsbelege, besondere Geber-/Lohnvertragsprüfungen und Privatquest-XP sind dort inaktiv. Alte private IDs können auch über direkte Questbefehle nicht weitergeführt werden. Questkatalog, HUD, #quests, Kontextabruf und Reiseoptionen zeigen nur formale Gildenverträge. Ein fälschlich als Kaufangebot extrahiertes Arbeitgeber-Angebot wird nicht in einen Privatjob umgewandelt und nicht bezahlt; die Korrektur verlangt normale Weltfakten zur Anfrage.

NPC-Bitten, Gespräche, Vereinbarungen, Arbeit, Rettungen, Gefallen, Begleitungen und Reaktionen bleiben freie Weltinteraktionen. Konkrete Spielerhandlungen verwenden unveränderte normale Commands; Bitten und Zusagen brauchen keinen zusätzlichen Vertragszug. Fakten, Beziehungen, Threads, Erinnerungen sowie reale Objektübergaben bleiben verfügbar. Aus einer Hilfsanfrage wird kein automatisches Spielerziel und aus einer behaupteten Arbeit kein automatischer Erfolg.

## Geld über den bestehenden Übergabeweg

coin.gift bleibt der normale Geldzugang. Eine tatsächlich gegenwärtige freiwillige Dankeszahlung, ein Vorschuss oder Lohn benötigt in neuen Kampagnen weder Quest, Arbeitgebervertrag, privaten Geberstatus noch Arbeitszertifikat. Die bisherigen Prüfungen auf tatsächliche kanonische Szene, anwesenden lebenden Geber beziehungsweise autorisierten TAKE und bereits enginegebuchte Handels-/Gildenbeträge bleiben erhalten.

Der Extractor zitiert in said die aktuelle Übergabeklausel einschließlich Betrag und Währung. Der neue Modus benötigt ein im Reply vorhandenes Zitat mit lesbarem Geldbetrag; coinFromWords bestimmt die Kupferzahl deterministisch, auch wenn cp falsch gemeldet wurde. Die Korrektur steht als amount.corrected im Audit. Beispiele: 1 Silber → 10 Kupfer, 2 Silber → 20, 5 Silber und 8 Kupfer → 58. Keine Übernahme einer alten versprochenen Privatquestsumme. Ein bloßer Betrag ohne passenden aktuellen Erzählbeleg, erkennbare Zahlungsversprechen oder Rückblicke zahlen nicht aus. Der kleine Schutz prüft zahlungsbezogene Zukunfts-/Rückblickformulierungen, keine isolierten Wörter wie den NPC-Namen »Will« oder »yesterday« in einem tatsächlich erfüllten Versprechen.

Die Übergabe erzeugt zusätzlich zum bestehenden coin.changed ein bestehendes transaction.completed mit gift-Beleg. Dieser hat eine deterministische ID aus Reply-ID, Geber und normalisiertem Zitat. Die vorhandene begrenzte credits-Ansicht speichert die Belegangaben; es gibt keinen zusätzlichen Belohnungs-Ledger, keine neuen Eventtypen und keine Quest-Auszahlung. Identische Extraktionsdoppelungen derselben Übergabe im selben Reply werden nicht erneut bezahlt. Ein unbekannter oder bekannter repeat_of-Bezug zahlt niemals erneut aus; beim Wiedererzählen verweist der Extractor auf die im Katalog gezeigten jüngsten Übergaben. Unabhängige weitere Geschenke desselben Gebers und Betrags sind erlaubt. Replay und Swipe verwenden weiterhin den vorhandenen Host-Fold, nicht eine erneute Ausführung alter Zahlungen.

## Schnittstellen und unveränderte Bereiche

- extract-5.5: worldVocab liefert für neue Kampagnen delta-1.4 ohne quest.offer und ohne coin.gift.job; coin.gift.repeat_of ist nullable. Historische Kampagnen behalten ihr bisheriges Vokabular. Parser, erster Request und alle bestehenden Repairs/Recoveries benutzen dasselbe ausgewählte Vokabular; keine zusätzliche Anfrage, Budget- oder Host-Lifecycle-Änderung.
- Planner und V4-A-Interpreter unterscheiden freien NPC-Umgang von formaler Gildenannahme; die neuen Prompts fordern keine privaten job-Verknüpfungen. PLANNER_VERSION bleibt beim runnerkompatiblen plan-c0.1.
- Narrator-Kontext und Vertrag tragen die neue Kampagnenregel. **Vertragsrevision .83**, daher persönliche Erzählerkarte vor eigenem Einsatz aktualisieren. Der isolierte ST-Test übernimmt die Vertragsdatei selbst.
- Gildenboard, Annahme, Lieferreceipts, READY, Abgabe, Auszahlung, Quest-XP und Gildenentwicklung bleiben unverändert. Keine Dungeon-, Kampf-, Schadens-, Monster-, XP-Balance- oder Testspieleränderungen.

## Regressionen und tatsächliche Abnahme

23 neue Tests in tests/v4/patch_free_help.test.js: auf unverändertem .82 **18 rot / 5 grüne Kontrollen**, nach Fix **23/23**. Sie prüfen Start/Re-Fold für V3/V4 und beide Regelstände, spontane Anfragen, normale Weltfolgen und Gegenstandsgeschenke, tatsächliche Zahlungen, Währungsumrechnung, Versprechen/Rückblicke/falsche Zitate, eindeutige und unbekannte Wiederholungsreferenzen, unabhängige zweite Geschenke, Orts-/Geber-/Trade-Schutz, V3-Adapter, unterbundene Privatquestansprüche und Anzeige, historische Jobs, Replay/Reload/Swipe sowie unveränderte Gildenlieferung mit Auszahlung/Quest-XP und Abweisung einer erneuten Abgabe.

Bestehende historische Tests behalten ihre bisherigen Erwartungen. Ihre Testkampagnen verwenden ausdrücklich das historische Startformat ohne private_quests; die neue Regel wird separat mit unverändertem Produktstart getestet. Keine abgeschwächten Privatjob-, Legacy-, Guild- oder Ownership-Assertions.

Angrenzend **212/212**. Vollständiges npm test **1641/1641**. Echter SillyTavern-1.19-Mock-Smoke final **21/21**, fünf Extractor-Aufrufe, keine PageErrors. Gespeicherte neue Kampagne: private_quests:false; vier Story-Records jeweils applied und genau ein extract.applied. Der vorbereitende .83-Smoke bestand ebenfalls. Frühere Entwicklungsläufe deckten historische Teststarts und Fehler in neuem Testaufbau auf; diese wurden vor der finalen Abnahme korrigiert. Kein natürlicher GLM-Langlauf gestartet.

## Grenzen und gesonderte Run-13-Befunde

Das LLM muss weiterhin eine tatsächliche neue Übergabe von einer nur erwähnten/versprochenen unterscheiden und Rückblicke korrekt referenzieren. Einheitsbeleg und Wiederholungsreferenz sind überprüfbar; die Engine ist kein vollständiger Sprachbeweisprüfer. Die bisherige credits-Ansicht bleibt auf sechs Einträge begrenzt; alte Events bleiben im Chat erhalten. Spätere Wiedererwähnungen außerhalb dieser Ansicht dürfen nicht als neue Geschenke extrahiert werden. Eine unklare, nicht bezifferte Gabe erzeugt keine erfundene Geldsumme.

Brasts doppelte Rettung/Identität, die Kollision zwischen normaler Dungeonjagd und zusätzlicher vorgeschriebener Räumungsquest im Boardvalidator, falsche temporale Schauplatzannotation und der verkürzte 58-Kupfer-Verkauf bleiben offen. Die Entfernung formaler Privatquests beseitigt deren Status-/Lohnkonflikte nur in neuen Kampagnen; sie behauptet keine automatische Heilung dieser anderen World-/Guild-Probleme. Details und Prioritäten ausschließlich im verlinkten Gegenreview.
