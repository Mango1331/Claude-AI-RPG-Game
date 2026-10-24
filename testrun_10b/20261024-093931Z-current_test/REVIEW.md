# Run 5 – 20261024-093931Z-current_test – Extractor bleibt nach gültiger Providerantwort `pending`

**Originale Quelle:** vom Nutzer im Chat hochgeladene `20261024-093931Z-current_test.zip`, **548.864 Bytes (Dateigröße über ZIP-Dateisystem nachprüfen)**; SHA-256 unten. Die ZIP wurde vollständig entpackt und die maschinenlesbaren Dateien (`run.json`, `evaluation.json`, `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `server.timed.log`, `report.md`, Screenshot) wurden gegeneinander geprüft. **Die originale ZIP ist noch nicht als Datei in GitHub `main` hochgeladen**; der Review verlinkt deshalb keinen nicht vorhandenen GitHub-Binärpfad. Kein eigener ST-Reproduktionslauf.

> **Wichtigster Befund [P0 / bestätigter Hänger]:** Der Provider beantwortete den Extractor-Call nach **12,674 ms** mit nichtleerem, syntaktisch gültigem JSON (finish `stop`). Danach blieb der gespeicherte Narrator-Reply auf `extraction.status='pending'`. Der Browser war `busy=false` und der Runner beendete Zug 3 erst nach seinem **900.149-ms-Turntimeout** mit `extractor_timeout`. Es sind **keine** `extract.applied`-, `extract.failed`- oder `extract_repair`-/`extract_recovery`-Belege vorhanden. Die Ursache liegt nach dem Model-Response **im JS-/Host-Weiterverarbeitungs- bzw. Abbruchpfad** oder in dessen Integration, nicht in einer 15-minütigen LLM-Inferenz. Der konkrete JS-Abzweig ist aus den vorhandenen Logs noch **nicht beweisbar**; insbesondere ein fehlgeschlagenes `isCurrent`/Job-Identity-Gate oder ein von `world_jobs` abgefangener Laufzeitfehler sind **Hypothesen**, keine festgestellten Ursachen.

## 1. Provenienz / unveränderter Ablauf

| Merkmal | Tatsächlicher ZIP-Nachweis |
|---|---|
| Build | `4.3.0-c.6.6.65`, aktuell integrierte Recovery, nicht historischer .57-Lauf |
| Git im Runner | `d182e900c6cb`, Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, bei Runbeginn sauber |
| Run | `20261024-093931Z-current_test`, ohne Fixture, Guide `current_test` unverändert |
| API / Model | lokaler Custom-Endpunkt (OpenAI-kompatibel), `zai-org/GLM-5.3-Flash`; 3 abgeschlossene API-Antworten |
| Browser / ST | Chrome 155, SillyTavern 1.19, isolierte Testinstanz |
| Charakter | Mage, Level 1, `Arcane Bolt` + `Blink`, Startstatus HP 80/80 und MP 72/72 |
| Spielerinputs | **3/100**: Klasse; zwei Skills; erster freier Zug Richtung Ashbridge-Stadttor |
| Ende | `extractor_timeout`, Turn 3, nach exakt ca. 900 Sekunden Warten auf `extraction pending` |
| Gesamtzeit | **949.528 ms** (15:49,5) einschließlich Einrichtung; eigentlicher Turn 3 900.149 ms |
| Enginezustand | `integrity: OK`, 11 Events insgesamt (Charaktererschaffung + gebuchter Start des ersten narrativen Zugs); keine Quests/Kämpfe |
| Zieldurchlauf | Character creation erreicht, natürliche 100-Züge-Beobachtung nicht erreicht |

**ZIP-Inhalt vollständig:** `run.json`, `evaluation.json`, `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `player.jsonl`, `import.json`, `report.md`, `server.log`, `server.timed.log`, `screens/final.png`, `screens/turn-003-extractor_timeout.png`. ZIP-CRC-Test erfolgreich; Runner-Report: Geheimnis-Scan sauber, Profil unverändert. Originalhash per lokalem SHA-256: **`6c8536ee49d1484c15949a92a39b77c3eea58b1d22f4b802f87c5e8327064242`**. Der Dateiinhalt ist gegenwärtig nur über den Chat-Upload gesichert, **nicht** durch GitHub-Binär-Blob belegt.

## 2. Ereignischronologie – erste freie Aktion

1. **Turn 1 und 2** (Mage / `Arcane Bolt and Blink`): in jeweils etwa 2,1 s beantwortet; keine Auffälligkeit der Klassenwahl. Der erste Storyturn folgt erst danach.
2. **Turn 3, Spieler**: `I walk toward the city gate of Ashbridge, keeping an eye out for travelers or guards on the road.`
3. **Planner**, 09:40:16 UTC, `18.921 s`, `finish=stop`, 95 Completion-Tokens, 186 Antwortzeichen: gültiges `commands:[{seq:1,type:'go',to:{new:'the city gate of Ashbridge'},...}]`. Die Engine schreibt auf der Usernachricht 6 vier Events: `turn.begun`, `cmd.interpreted`, `cmd.resolved`, `outcome.recorded`. Keine Recovery, kein Planner-Ausfall.
4. **Narrator**, 09:40:35 UTC, `10.108 s`, `finish=stop`, 375 Completion-Tokens: beschreibt Weg, Tor, zwei Torwachen und eine kurze Wagenwarteschlange. Antwort wird als Message 7 im Chat gespeichert; `extraction.status=pending`, keine Extraktor-Events, Ursprungsort bleibt `public roadside verge outside Ashbridge`.
5. **Extractor**, Request 09:40:46 UTC, Providerantwort **09:40:58.736**, `12.674 s`, `finish=stop`, 393 Completion-Tokens, 1061 Content-Zeichen. JSON syntaktisch gültig mit `expected['1']={arrived:true,at:'loc.ashbridge',with:null}` sowie fünf `deltas`: `arrive`, zwei `person.new` (Torgardisten), zwei `aware` (sehen PC noch nicht). Keine leere Antwort, kein Token-Limit, keine Transportfehlermeldung.
6. **Nach dem Extractor-Response** fehlen weitere LLM-Aufrufe, `extract_repair` oder `extract_recovery`; die letzte `server.timed.log`-Zeile ist ebenfalls **09:40:58.736**. Der gespeicherte Reply bleibt `pending`, `events=[]`. Screenshot zeigt die Narrator-Prosa und den HUD-Weltort von vor der Reise.
7. **Nach 15 Minuten** erkennt der Driver `busy=false, extraction=pending`; Endstatus `extractor_timeout`. Keine `pageErrors` oder `serverErrors` im Export, daraus folgt **nicht**, dass keine abgefangene Browser-`console.error`-Meldung existiert. `run.json` hat 3 Player-Inputs, der letzte unvollständig. Alles wird nach regulärem Timeout korrekt exportiert.

## 3. Fehlerursachen – gesichert versus Hypothesen

**GESICHERT:** Der Provider hat auf den ersten Extractor-Call vor dem Timeout geantwortet. Deshalb ist `extractor_timeout` hier der **symptomatische Runner-Endgrund** (persistent pending), kein Beweis für einen LLM-Timeout. Der erhoffte Soft-World-Commit ist ausgeblieben. Der Runner selbst beendet und exportiert korrekt nach Ablauf von 900 s. Die neuen `.65`-Recovery-Aufrufgrenzen/Telemetrie wurden gar nicht aktiviert, da keine leere oder fehlgeschlagene Providerantwort entstand.

**Plausibel, aber nicht nachgewiesen – kritischer Prüfort:** `src/v4/world_jobs.js` → `belongs(job)` prüft `pending===job`, Chat-ID, `current.chat===job.chat`, Nachrichtenobjektidentität, `swipe_id`, `text_hash` und `laterTurns`. `src/v4/runtime.js:runExtraction` führt nach einer gültigen Antwort `if (!isCurrent()) return {changed:false,cancelled:true}` aus; wird das Host-Prädikat nach `saveChat`, Chat-Objektwechsel, Swipe oder einem Event zu streng/unerwartet falsch, kann eine **gültige Modellantwort ohne `applied`-/`failed`-Status** hinterlassen werden. Es ist noch nicht bewiesen, welcher Guard ggf. scheiterte, ob SillyTavern Chat-Arrays neu erzeugt oder ein Event `invalidate()` auslöste. Der alte Spiel-/Index-Hash wurde nicht in den Output geschrieben. **Keine** blind entfernte Identity- oder `isCurrent`-Prüfung: Das könnte einen verspäteten Commit in den falschen Chat ermöglichen.

**Zweite plausible Ursache:** `parseExtraction`, `replyTurnV4`, `display` oder andere JS-Funktionen werfen vor `setRec`; der Job-Manager fängt solche Ausnahmen ab und führt `onError` nur für aktive Jobs aus. Browser-`console.error` wird von `pageErrors=[]`/Serverlog nicht sicher erfasst. Der Extractor-Text ist **syntaktisch** valides JSON, aber eine durch den Engine-Schema-Validator abgesicherte Gesamtgültigkeit wurde anhand des ZIPs noch nicht eigenständig ausgeführt. Entsprechend auch keine Behauptung, dass `replyTurnV4` zwingend erreicht worden sei.

**Semantische Nebenbeobachtung (nicht der Ausfallgrund):** Der Narrator stellt die Hauptfigur bei der Torwarteschlange außerhalb/nahe der Passage dar; der Extractor würde bereits `arrived:true` am Stadt-Ref `loc.ashbridge` melden. Ob die Ankunft am **Stadttor** damit korrekt erfüllt ist, ist wegen `go`-Ziel und Stadtreferenz mehrdeutig. Diese nicht gebuchte JSON-Antwort allein ist **kein Beweis einer fehlerhaften Weltbuchung**, sollte aber im späteren GO-/Ankunfts-Review mitgeprüft werden.

## 4. Priorität / sinnvolle isolierte Folgeschritte für Sol

**P0 – Ursache vor erneutem 100-Züge-Run instrumentieren und beheben, kein globales Budget-Tuning.**
1. In `world_jobs.js` erfassen, ob `runExtraction` tatsächlich zurückkehrt, mit `result.changed/applied/cancelled/late`, aktueller Jobidentität, Stage und **nur nicht-sensiblen** Guard-Wahrheitswerten: `pendingJobSame`, `chatIdMatch`, `chatArrayMatch`, `messageMatch`, `swipeMatch`, `textHashMatch`, `laterTurns`, `abortSignal`. **Keine** API-Key-/Prompt-Leaks. `catch`-Exceptions getrennt von einem normalen stale-discard diagnostizieren; Status `pending` ohne aktiven Job nach gültiger Antwort ausdrücklich als beobachtbare Anomalie ausgeben.
2. Den tatsächlichen Hostfall in echtem ST mit **reproduzierbarem** Custom-GLM-Response prüfen: ohne Chatwechsel; mit `saveChat` nach Empfang; mit Chat-ID-/Objekt-/Array-Identitäten und bei Bedarf verzögertem Lifecycle-Event. Positiver Fall **ein einziger `extract.applied`-Commit**; echte Chat-/Swipe-Wechsel dürfen **keine** fremden Events committen.
3. Nur den nachgewiesenen Guard-/Exception-Bug korrigieren. Bei `isCurrent=false` die Ursache klären, statt pauschal die Prüfung zu entfernen oder die `pending`-Extraktion blind alle 15 min zu wiederholen; sichere Diagnose-/Reconcile-Policy bei verwaistem `pending` gesondert entwickeln.
4. Für den Runner vorübergehend kürzere `--turn-timeout-sec`-Diagnoseläufe erwägen, **nur** wenn der echte Browser-/Provider-Fehler damit weiterhin reproduzierbar bleibt; das langfristige 100-Züge-Guide nicht verändern. Vor neuem Langlauf sicherstellen, dass bereits gebuchte Enginebewegung und Host-save auf `applied` übergehen.
5. **Testfall:** gültiger Extractor-LMM-Response mit `expected.go`, `arrive`, zwei `person.new` und `aware`; die Antwort darf nicht `pending` zurücklassen. Negativfall: tatsächlicher Swipe/Chatwechsel verhindert fremden Commit; semantisch unzulässige JSON-Antwort löst gültige Repair- oder `failed`-Diagnose aus, keinen stillen 15-Minuten-Hänger.

**P1 – anschließend:** echte `.65`-Rundreise durch `current_test` erst wiederholen, wenn P0 beseitigt ist; dabei `extraction.ms`, `plan/extraction.recovery`, `perf.wait_ms`, Player-/Narrator-/World-Events synchron gegenprüfen. Dieser Run testet keine Quests, Kämpfe oder 10B-3-Entscheidungen, weil er vor dem ersten erfolgreichen World-Commit steckenblieb.

**Bedeutung für den nächsten großen Sol-Patch:** Dieser frühe Live-P0 hat Vorrang vor 10B-3 (Drohung/Combat-Truth/Guild-Authority) und vor 10B-4d (Narrator-Leerantwort), sofern die nächste natürliche Kampagne nicht wieder nach Turn 3 blockieren soll. Node-Vollsuite `1421/1421` auf .65 bleibt als vorher vom Nutzer berichtetes Ergebnis wahr; der reale Hosttest liefert **ein zusätzliches negatives Live-Ergebnis**, kein automatischer Widerspruch zur Node-Suite.

**Kein Produktcode geändert und keine Bugursache als eindeutig erwiesen markiert.** Das Original-ZIP im Chat bewahren; GitHub-Archiv-ZIP erst nach erfolgreicher Binärübertragung samt Hashprüfung als vorhanden markieren.
