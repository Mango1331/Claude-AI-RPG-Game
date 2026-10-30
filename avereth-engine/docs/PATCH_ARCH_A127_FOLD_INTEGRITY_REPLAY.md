# Architekturpatch Etappe A (.127) – Foldintegrität und Verarbeitungskorpus

**Build `4.3.0-c.6.6.127`** · Basis `b8d2af4` (.126) · Spezifikation: [konsolidierter Fachplan §3, main `8364b0f`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/8364b0f/patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md) · Status: umgesetzt, Gegenreview offen, B1 nicht begonnen.

Keine Spielregel-, Balance-, Prompt-, Extractor- oder Protokolländerung; Narratorkartenrevision unverändert. Alte Kampagnen werden nicht migriert.

## A2 – Kein autoritativer Schritt aus einem beschädigten Fold

`host.foldChat()` liefert zusätzlich `failures` (Nachrichtenindex, Eventart, Fehler). `host.foldBlock(fold)` ist das einzige gemeinsame Urteil „Fold ungültig“ samt Meldung: erster fehlerhafter Nachrichtenindex/Eventart, „Nothing was booked, saved or sent to a model“, Wiederherstellung durch Laden eines gültigen Standes oder bewusstes Löschen ab dieser Nachricht. Keine Exception-/Transaktionsarchitektur, keine automatische Reparatur.

| Grenze | Verhalten bei Foldfehler |
|---|---|
| `runtime.prepareGenerationAsync` vor Planner/Interpreter/Steuerkanal | `action: 'fold_blocked'`, kein LLM-Aufruf, kein Record, kein `commit()` (auch kein `late`-Abschluss) |
| derselbe Pfad bei wiederverwendetem Record (Swipe/Regenerate/Continue) | `fold_blocked` statt Engine-Block |
| `processReplyAny` (V4) | kein Pending-Record, keine HUD-Anzeige eines partiellen Zustands |
| `extractionRequest` | `null` – kein Modellauftrag |
| `runExtraction` vor dem ersten Aufruf und vor jedem Repair | Ergebnis `{ changed:false, foldBlocked }`, keine Exception (der Host-Fehlerpfad würde buchen) |
| `applyExtraction` nach der Antwort und auf dem Host-Fehlerpfad (`failed → applyExtraction(null, errorKind:'engine')`) | kein `replyTurnV4`, kein `setRec`, kein `extract.failed`, Record bleibt `pending` |

`index.js`: `fold_blocked` bricht die Generierung ab, leert den Engine-Block und zeigt die Meldung einmal je Chat/Fehlerstelle als Fehler-Toast; Statuszeile zeigt die Integritätsprobleme. Kein Chat-Panel, kein `saveChat`. Die Barriere stoppt bei `foldBlocked` des laufenden World-Jobs; ein erneuter Zug startet keinen Provideraufruf, solange der Verlauf beschädigt ist. Gültige Zustände mit verworfenen Narratordeltas laufen unverändert. Der Live-Runner wertet vor einer sicheren Fortsetzung zusätzlich Foldfehler als `integrity_failed`.

## A1 – Offline-Verarbeitungskorpus statt bloßem Event-Fold

- `tools/replay/build_corpus.mjs`: baut aus den unverändert archivierten Originalen ([main `testrun_10b/ARCHIV_BATCHES.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/ARCHIV_BATCHES.md)) je Run eine gzip-Datei unter `tests/replay/corpus/`: Chat mit Avereth-Records (ohne gerendertes HTML/Swipes) und die Modellantworten jedes aufgezeichneten Engine-Aufrufs aus `chat-completions.jsonl`. Zuordnung über Aufrufzweck, Reihenfolge und Provider-Tokenzahlen des Records; identischer Spielertext entscheidet nichts. **2.305 von 2.305 Aufrufen zugeordnet**, 0 fehlend, keine zusätzlichen Kopien in Produktrecords. Korpus 2,0 MB.
- Inhalt: Batch17/18/19 je Warrior/Mage/Rogue (.122/.123/.125) und Batch16 Rogue bis Nachricht 81 (Verkaufsfall Record78).
- `tools/replay/replay.mjs`: verarbeitet jeden Record auf seinem Originalvorzustand erneut durch den Produktpfad, ohne Provider: Spielerzüge über `prepareGenerationAsync` (Planner, Guard, Board, Forge, Steuerbefehle; versteckte `#`-Zeilen werden wie im Host eingespeist), Antworten über `processReplyAny` + `runExtraction` (Parser, Repairfolge, Firewall, World, `applyExtraction`). Verglichen: serialisierte Events samt Reihenfolge/IDs/RNG sowie `corrections/system/rejected/continuation`, Extraktionsstatus und Hostaktion. Ausgenommen sind nur `ms`/`version` von `extract.applied` und `cmd.interpreted` sowie `ms` von `extract.failed` (Messzeit; ein wiedergegebener Aufruf dauert 0–1 ms, ohne Ausnahme schwankte der b18-mage-Fehlerfall). Zusätzlich je Run Event-Fold mit `validateState` nach jedem Record.
- **Baseline `tests/replay/baseline.json.gz` vom Startcommit `b8d2af4` (.126):** 2.235 Fälle. Deterministisch (Baseline-Engine gegen sich selbst 2.235/2.235; sechs parallele Wiederholungen der Schnellprüfung identisch).

| Abdeckung | Anzahl |
|---|---:|
| Spielerzüge gesamt / davon Board / Forge / Steuerbefehle / Planner gescheitert | 1.203 / 25 / 3 / 100 / 7 |
| Antworten gesamt / davon Extraktion gescheitert | 1.032 / 2 |
| bewusst übersprungen | 10 Kampagnenstarts (kein Verarbeitungsschritt) |
| Replayfehler / Foldfehler / Validierungsprobleme | 0 / 0 / 0 |

Nutzung: `npm run replay:check` (voller Korpus, ≈ 78 s, Exit 1 bei Abweichung); `node tools/replay/replay.mjs --engine <Checkout> --write-baseline <Datei> --sha <Commit>` für eine neue Baseline. `npm test` prüft vier kleine Runs (b16-rogue-sale, b18-mage, b19-mage, b19-rogue) gegen die Baseline. **Abnahmeregel ab B1:** reiner Umbau = 0 Abweichungen; beabsichtigte Änderung = begründete Liste je Record aus `--check`.

**Sensitivität belegt:** `.125`-Engine gegen `.126`-Baseline meldet genau 5 Abweichungen, Batch19 Warrior Records 214/218/232/272/376 (die .126-Artkorrektur). Gegenüber den damals gespeicherten Originalevents weicht .126 erwartbar ab (z.B. Batch17 Warrior 46 Records, überwiegend `anchor` seit .124); das ist Builddrift, kein Abnahmemaßstab.

## Tests und Nachweise

Selbst ausgeführt in dieser Umgebung:

- **Neue Regressionen** `tests/replay/`: `fold_integrity.test.js` (11), `replay.test.js` (4), `chain.test.js` (4) – zusammen 19/19. A2 auf dem echten Batch19-Mage-Verlauf: Spielerzug, wiederverwendeter Record, Antwort, Extraktoranfrage, Bruch während der Anfrage, kein Repair nach Bruch, World-Job-Fehlerpfad (Exception und Produktpfad), Wiederherstellung mit baselinegleichem Ergebnis, Hostverdrahtung.
- **Rot auf unverändertem .126** (gleiche Tests, lokale `foldBlock`-Ersatzfunktion): 8 rot / 3 Kontrollen grün. Auf .126 entstehen aus dem beschädigten Fold Planner-Kontext, Extraktoranfragen, ein Commit und auf dem Job-Fehlerpfad eine Buchung.
- **Integrationskette** (Batch19 Mage, aktuelle Konfiguration): Erstellung → Gilde → Board → Vertrag → Kampfsieg → Level-up → Auszahlung → Lootverkauf → Kauf und Ausrüsten; jeder Schritt foldet ganz und valide, Reload identisch, neuer Antwort-Swipe ohne Events, Regenerate/Swipe des Kaufzugs ohne Modellaufruf und ohne zweite Zahlung.
- **Volle Suite** `npm test -- --test-concurrency=4`: **2448/2448**, 57,8 s.
- **Voller Korpus** `npm run replay:check`: **2.235 Fälle, 0 Abweichungen** zur .126-Baseline.
- **Live-Runner-Tests** 139/139.
- **Chromium-Mock-Smoke** `node tools/browser_smoke.mjs` (`index.js` mit SillyTavern-Mock): **V4-Seite OK** einschließlich neuem Fall `foldBlocked` (eine Fehlermeldung, kein Save, kein Record, unveränderte exakte Anfrageliste). Auf .126 ist dieser Fall rot (`foldBlocked:false`, zusätzlicher Interpreteraufruf). Die **V3-Seite scheitert vorbestehend identisch auf .126** (historischer V3-Pfad, Paket E); daher Gesamtergebnis des Skripts `FAILED`.

**Zwei Testaufbauten korrigiert, Assertions unverändert:** `patch10b1` (Gildenhalle) und `patch_run21_habitat_catalog` (T90, `realm.caelreth`) injizierten `place.created` für bereits vorhandene Orte. Der Reducer warf „place exists“, der bisherige Fold überging das still, und die Tests liefen auf einem teilweise gescheiterten Zustand. Jetzt werden nur fehlende Orte angelegt.

- **Echter SillyTavern-1.19.0-Smoke** `npm run smoke:st:c` (frisches Checkout, Chromium, Mock-Provider, Build .127), nach Freigabe durch den Nutzer nachgeholt:
  - **24/24**, 6 Extractor-Aufrufe, keine PageErrors, Statuszeile Build .127 mit „integrity: OK“. Ein erster unveränderter Lauf war 23/24 allein wegen des ST-Seitenfehlers „AbortReason @ openai.js:4565“ (`noPageErrors`); dieselbe Störungsart ist bei .120/.124 dokumentiert.
  - **`AVERETH_SMOKE_FAILSOFT=1`: 29/29**, darunter gespeicherte Records per `verifySavedChat` vom Datenträger zurückgelesen (`failsoftSaved`), erkannte verschluckte Speicherfehler, gesperrte Weltfolge ohne doppelten Kampf; keine PageErrors.
  - Der Smoke prüft die Hostbindung auf gültigen Verläufen. Die Fold-Sperre selbst ist im Chromium-Mock und in den Node-Tests nachgewiesen, nicht als eigener ST-Fall.

## Einschränkungen und offene Punkte

- Der Korpus enthält keine Antwort-Swipes mit eigener Extraktion und keine `late`-Abschlüsse; beides bleibt durch bestehende Tests abgedeckt. Board/Forge sind nur so weit abgedeckt, wie sie in Batch16–19 vorkamen (25/3).
- Nach C/D sind alte Rohantworten nicht automatisch gültiger Input des neuen Protokolls; Schemaänderungen brauchen transparent umgerechnete Testdaten (Fachplan §8.2).
- Vereinfachungsgewinn A: keine historischen Schalter entfernt (B1), keine Namensheuristik ersetzt. Eine gemeinsame Foldprüfung an sechs Schreibgrenzen; der bisher verdeckte Foldfehler in zwei Testaufbauten ist sichtbar geworden.

## Reviewkorrektur .128 (GPT-Gegenreview zu `167e2e9`)

Build **`4.3.0-c.6.6.128`**. Beide Befunde am Code bestätigt und geschlossen; keine neue Architektur, Baseline unverändert.

- **Wiederverwendete Records/Systembefehle:** Bei einem bereits aufgelösten Record (Swipe, Regenerate, noch nicht veröffentlichtes Befehlspanel) prüft `prepareGenerationAsync` jetzt den Fold **vor** `command.posted`/`setRec`/Panelausgabe. Ein neu aufgelöster Zug war bereits vorher geprüft.
- **`processReplyAny`:** Foldprüfung vor Textbereinigung (`msg.mes`) und vor dem `system_answer`-Record; bei beschädigtem Verlauf bleiben Text und Message unverändert.
- **Replay-Checker:** `compareToBaseline` meldet nicht wiedergegebene Baseline-Runs, unbekannte Runs sowie Replay-, Fold- und Validierungsfehler selbst als Differenz. `npm run replay:check` ist damit eine eigenständige Abnahme mit Exit 1, geprüft mit einem unvollständigen Korpus.

**Nachweise:**

- 3 neue Regressionen (2 A2-Fälle mit positiven Kontrollen, 1 Checkerfall); auf `167e2e9` alle 3 rot, danach grün. `tests/replay` 22/22.
- Volle Suite **2451/2451**; voller Korpus **2.235 Fälle, 0 Abweichungen** zur .126-Baseline.
- Echter SillyTavern-1.19.0-Smoke auf .128 im ersten Lauf: `smoke:st:c` **24/24**, Failsoft-Variante mit Record-Rücklesen **29/29**, jeweils ohne PageErrors.
