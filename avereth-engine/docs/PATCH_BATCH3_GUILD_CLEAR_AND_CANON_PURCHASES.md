# Batch 3 – eindeutige Clear-Verträge, Auswertungen und kanonische Käufe

Build **4.3.0-c.6.6.104**, Basis `.103` / `48bdf5d`. Grundlage: Originalbatch `20261027-150205Z`, [GPT-Review](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261027-150205Z/REVIEW.md), [Sols Gegenprüfung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261027-150205Z/SOL_COUNTERREVIEW.md) und freigegebenes Folgefeedback. Keine Änderungen an XP-Höhe, Startwerten, Kampfaktionen, Skillbalance oder den drei Guild-Testprofilen. Der Mage-T102-Abbruch war durch .103 bereits sicher aufgefangen und wird nicht erneut gepatcht.

## Ein aktiver Clear pro Dungeon und Etage

`activeClearConflict()` vergleicht die kanonische Dungeon-ID und Etage mit allen aktiven PC-Guild-Clear-Verträgen. Titel, Filiale und Ausschreibungstag ändern diese Identität nicht. Die gemeinsame Buchungsfunktion `acceptContract()` prüft vor jeder Annahme, auch nach bedingter Ankunft. Zwei im selben Zug zurückgestellte Annahmen buchen deshalb höchstens den ersten Vertrag.

Der Command-Handler meldet die Ablehnung ohne neuen Slip oder vorgemerkte Belohnung. Board/HUD/Planner zeigen über das bestehende `goalText()` an, wenn dieselbe Räumung bereits aktiv ist. Verteilung und Erzeugung des Boards bleiben unverändert; kein zusätzliches Clear-Verbrauchskonto.

Aufgabe oder Abschluss geben den Weg für einen späteren neuen Vertrag frei. Die vorhandene `clearDone()`-Prüfung verlangt dafür einen PC-Clear seit dessen Annahme; eine frühere Räumung reicht nicht. Andere Etagen bleiben unabhängig. Historische bereits aktive Duplikate werden weder gelöscht noch entwertet und bleiben einmal pro Vertrag auszahlbar. Ruleset 1 behält sein Annahmeverhalten.

## Questgenaue Geld- und XP-Zuordnung

Neue Guild-`transaction.completed` und zugehörige `xp.changed` tragen zusätzlich `quest:q.id`. Werte und Eventtypen bleiben unverändert; bestehende Reducer ignorieren das zusätzliche Zuordnungsfeld beim Replay.

Der Evaluator verwendet diese ID für die individuelle Auszahlung und `xp` jeder Quest. Identische Titel sind kein Hindernis. Bei einem eindeutigen einzelnen historischen Abschluss bleibt der bisherige Nachweis erhalten. Ein altes Sammelrecord ohne Zuordnung meldet dagegen **`payout:null`, `xp:null`, `payout_attribution:'ambiguous'`** und einen ausdrücklichen Auswertungshinweis. Es schreibt die Gesamtsumme nicht mehr jeder Quest zu und erfindet auch keine Nullzahlung. Tatsächliche Coin-/XP-Buchungen und COMPLETED-Status bleiben unangetastet.

Für Batch 3 heißt das: Die alten 60+120 Kupfer und 46+180 Quest-XP waren real. Dieser Patch zahlt sie nicht zurück. Neu angenommene stapelbare Clear-Verträge werden verhindert; historische Auswertung erkennt ihre bisher fehlende Einzelzuordnung.

## Kanonischer Primer nach bestätigter Ankunft

T153 bot zwei unabhängige Probleme: Die Kaufentscheidung wartete auf Ankunft und vorhandene Ware; der Extractor meldete nur `priced:true`, Ankunft und einen Buyback-Fakt. Er stellte weder Verkäuferanwesenheit noch ein ausführbares Angebot her. Der Narrator erzählte den Kauf trotzdem. T155 scheiterte dann richtig an der fehlenden Lernquelle.

`settleCanonicalPurchases()` erfüllt aktuelle, ausdrücklich preisautorisierte Kaufentscheidungen jetzt gegen **bereits vorhandenen kanonischen Manualbestand**. Es läuft nach tatsächlich akzeptierten Ankunfts-/Präsenzereignissen und vor dem bisherigen Ablauf offener Reiseentscheidungen. Ein späterer Ortswechsel in derselben Antwort verliert den zuvor gültigen Kauf nicht. Es erzeugt weder NPCs noch neue Angebote aus Prosa.

Verwendet werden `offerAvailability()`, `purchaseLines()`, `pickLines()` und `bookPurchase()`: richtiger tatsächlicher Laden, anwesender Verkäufer, eindeutige Ware, Menge, aktueller Kaufwunsch, Preislimit und Guthaben bleiben Voraussetzung. Die Buchung gehört zur vorhandenen bedingten Enginephase, nicht zum schreibberechtigten Bereich des NPC-`enter`-Deltas. Die Ownership-Tabelle wird nicht gelockert. Geschlossene Entscheidungen verhindern einen zweiten Abschluss; der vorhandene Handover-Abgleich verhindert ein zweites Buch durch nachfolgende `object.new`/`object.move`-Deltas.

**Originalgrenze:** T153 ohne bestätigten Verkäufer bucht weiterhin keinen Kauf. Neu sind klare `NOT BOUGHT`-System-/Narratorkorrekturen mit dem fehlenden Nachweis. Die positive Variante mit ausdrücklichem gültigem `enter` bucht genau 120 Kupfer und einen profilierten Primer; nachfolgendes Eigenstudium findet die Lernquelle. Eine neue freie `offer`-Wiederholung ist dafür nicht nötig. `priced:true` allein berechtigt nie zu Zahlung oder Inventarzugang. Lernen vor der Ankunft wird nicht rückwirkend ausgeführt; der Spieler beginnt es in einem Folgezug.

## Abnahme

- **20 neue Prüfungen**, auf unverändertem `.103`: **11 rot / 9 grüne Kontrollen**, danach **20/20 grün**. Fixture enthält die relevanten Originalzustände, Befehle und Extractorantworten für T150, T153 und T196; nur Erinnerungen und Threads wurden gekürzt.
- Kontrollen: filial-/titelunabhängige Clear-Identität, andere Etage, Aufgabe/Abschluss und neuer Clear, Ruleset 1, bedingte und konkurrierende Annahmen, alte doppelte Auszahlungen genau einmal, Geld-/XP-Tags und serialisierter Event-Replay.
- Käufe: tatsächliche Präsenz, fehlende Ankunft, falsche Szene, Preislimit, Guthaben, geschlossenes Angebot, Shop als Zwischenhalt, Profil/Lernquelle und deduplizierter erzählter Handover. Keine kostenlose Ware oder automatische NPC-Erzeugung.
- Evaluator: gleiche Titel mit IDs, eindeutige Altdaten und ausdrücklich mehrdeutige alte Sammelrecords. Die ersten angrenzenden Runnerprüfungen liefen 149/149; weitere World-/Batch-Regressionen 67/67. Finales `npm test`: **2.065/2.065**, keine übersprungenen Tests. Echter **ST-1.19-Smoke 22/22**, fünf Extraktionen, `extractPerReply` und `fightOpened` grün, keine PageErrors. Mockprovider, kein natürlicher GLM-Lauf. Der erste Vollsuite-Lauf fand nur eine unbeabsichtigt abweichende alte Ablehnungsmeldung; der bisherige Wortlaut ist wiederhergestellt, kein alter Test dafür geändert.

Keine Narrator-Karten-/Planner-/Extractor-Schemarevision und keine neue Spieleranweisung. Der Vorschlag einer großen und kleinen Kampfaktion ist **nicht implementiert** und wird getrennt bewertet. Die nächste natürliche GLM-Abnahme muss insbesondere die Verkäuferpräsenz und den tatsächlichen Kauf-/Lernfortschritt zeigen; deterministische Tests ersetzen sie nicht.
