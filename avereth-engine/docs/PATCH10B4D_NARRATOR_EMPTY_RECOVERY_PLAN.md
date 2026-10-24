# 10B-4d – Leere Narrator-Antworten sicher regenerieren
**Fachlicher Host-/Narrator-Patchentwurf für Sol – kein implementierter Code, keine automatische Swipefreigabe ohne Host-Prüfung.**

**Aktuelle Planungsbasis:** Echte leere Narratorantworten auf .57; [Run 6 auf .66](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/20261024-104654Z-current_test/REVIEW.md) hatte keine leere Antwort, ist aber keine Langzeitentwarnung. Build .67 betrifft nur XP; vor Umsetzung Host- und Git-Stand prüfen. Noch keine Codefreigabe.

## 1. Problem aus Originalruns

- `testrun_10b/20261024-033325Z-current_test/REVIEW.md` **Run 2, Spielerzug 25**: Narrator-Aufruf mit `max_tokens=8192`, `finish_reason=length`, `completion_tokens=8192`, **0 sichtbare Content-Zeichen**, aber **34.573 Reasoning-Zeichen**; sichtbare Story und World-Extraktion fehlen. Bereits zuvor abgearbeiteter `quest.accept` wurde korrekt als `no such contract` abgelehnt. Kein Beweis, dass die falsche Quest den Reasoning-Ausfall verursachte.
- Weitere .57-Runs endeten mit **leerer Narratorantwort**, insbesondere Run 4 nach 61 echten Inputs (§15 `06`). Weder 10B-4a (Planner) noch 10B-4c.1/.2 (Extractor) kann **eine leer gebliebene ST-Narrator-Nachricht** reparieren.
- Die bereits implementierte Runtime `src/v4/runtime.js:processReplyAny` erkennt leeres `mes`, setzt **`narration.empty=true` und `extraction.status='skipped'`**; sie ruft korrekterweise keinen Extractor auf. Die Player-Engine-Events werden **vorher** in `prepareGenerationAsync` auf der **Spielernachricht** gebucht. `index.js:onMessageReceived` zeigt eine Toastwarnung `Swipe or regenerate the reply`. Der heutige normale manuelle Swipe/Regenerate-Reuse ist Ausgangspunkt, nicht eine neue Combat-/Turn-Buchung.

## 2. Technisch zwingend vor dem ersten Codefix klären

**Der Unterschied zu Planner/Extractor:** Der Narrator wird von **SillyTaverns eigener Generation** gesteuert, nicht von `v4Llm` als einfachem Extractor-JSON-Promise. **Nie** aus einem Nachwort-Event blind `ctx().generateRaw(...)` als neue automatische Story an die Chatliste anhängen: Das umgeht reguläre Avatar-/Swipe-/Save-/Plugin-Events und riskiert doppelte Playerturns, konkurrierende Generationen, leere Loop-Nachrichten und falsche Indizes.

Sols **Pflicht vorab** anhand echten ST-1.19.0-Codes und laufendem Browser-Smoke:
1. Welche öffentliche, unterstützte Host-Funktion erzeugt **einen neuen Swipe derselben Assistantmessage** oder regeneriert den **zugehörigen letzten** Playerturn, und wie wird sie aufgerufen? `generate`-/`swipe`-/`regen`-Semantik, Signatur, Eventreihenfolge und interne Busy-Guards durch Quellcode und kleine Browserprobe belegen, **keine API erfinden**.
2. Wann sind `MESSAGE_RECEIVED`, `MESSAGE_SWIPED`, `GENERATION_ENDED`, `swipe_id`, `swipe_info`, `busy` und die Saves im echten Host abgeschlossen? .66-Hotfix belegt bereits: `MESSAGE_RECEIVED` kommt **vor** `swipe_id=0`; hier erneut beide Reihenfolgen mit neutralem Mockprovider testen.
3. Kann ein Eventhandler, der selbst von `MESSAGE_RECEIVED` ausgelöst wurde, synchron oder sofort asynchron eine neue Generierung starten, ohne noch laufendes `saveReply` zu überholen? Falls nein, auf einen **nachweislich späten, sicheren Host-Hook** setzen; keine festen `setTimeout(..., 200)`-Wartezeiten als Eventvertrag verwenden.
4. Wie stellt der Runner `narrator_empty` fest? Wo liegt der **letzte gültige Spieler-Record** und welcher Reply gehört zu ihm? Kein „neuer Playerinput“ aus dem Testspieler zur künstlichen Heilung.
5. Unterschied zwischen `finish_reason=length`/reiner Reasoning-Antwort, ausdrücklich leerem Servercontent, Nutzerabbruch, absichtlich erzeugtem Systempanel, legitimer Silent/Continue-Generation, Chatwechsel, Swipe, Edit, Delete und laufendem Extractor. **Nur** echte leere Story des aktuellen normalen V4-Playerturns darf Recovery auslösen.
6. Aktiv genutztes GLM/Reasoning-Preset, tatsächlich wirksames `max_tokens` / `reasoning_effort` prüfen, ohne aus einem einzelnen Fehlcall ein Modelllimit abzuleiten oder blind Tokenbudgets global zu erhöhen.

## 3. Vorgesehene sichere Zustandsmaschine (Spezifikation, keine API-Behauptung)

**Harte Vorbedingungen:**
- V4-C-Kampagne, Engine aktiv, **bereits exakt einmal** gebuchter aktueller Playerturn mit stabilem `input_hash`/Events.
- Letzte genuine Narrator-Reply `mes.trim()==='' `, `narration.empty=true`, `extraction.status='skipped'`. Keine bereits gültige Story, keine `extract.applied`, keine neue Spieleraktion, gleicher Chat und dieselbe Nachrichten- und Swipe-Identität.
- Host-Narratorgeneration sicher **beendet**, aktueller Chat gültig, kein manueller neuer Swipe/Regenerate/Wechsel im Gange.
- Höchstens **ein** automatischer neuer Narrator-Versuch pro Spieleraktion (persistierbare, scoped Attempt-Erkennung; keine zusätzliche erzwungene neue Buchungsquelle). Erneute Leere muss mit der bereits bestehenden sichtbaren Warnung und der Diagnose `narrator_empty` enden; **kein endloser Loop**.
- Falls keine verlässlich sichere ST-API existiert: **bewusst keine Auto-Regeneration implementieren**, stattdessen Runner/UI für kontrolliertes manuelles Eingreifen vorbereiten und die Host-Hürde ausdrücklich melden.

**Pfad im Erfolgsfall:** Der Host erzeugt einen **neuen, regulären Narrator-Swipe/Regenerate** für dieselbe vorhandene Playeraktion. `prepareGenerationAsync(type='swipe'|'regenerate')` muss gemäß bestehendem Cache denselben Player-Record/Engine-Wurf wiederverwenden. `processReplyAny` behandelt nur die **neue** nichtleere Antwort als `pending` Extractor. `world_jobs` behandelt diese aktuelle Reply/Swipe-Identität normal und bringt sie zur Engine-Validierung und Save-Barrier. Vorige leere Message bekommt **keine** World-Events oder künstlichen Deltas.

**Ausschlüsse:** Während PC-Tod/Systempanel, V3-Legacy, `type='continue'`, private Kommentare, selbst ausgelöster Swipe, Nutzer-Chatswitch, gelöschter/geänderter Playerinput, laufender Extractor oder Chatwechsel kein stilles Autoregenerieren. Abgebrochene Providerantwort nach echter Nutzer-Stop-Action darf nicht im Hintergrund „zum Trotz“ automatisch wieder starten.

## 4. Testmatrix – Red/Green in ST und Node

1. Planner + Combat-/Quest-Engine buchen einen Playerturn exakt einmal; erster Narrator liefert `content:''`, `finish=length` (Reasoning voll); Engine-Recovery veranlasst **ein** Host-Swipe/Regen, Playerturnevents/Würfel/Ressourcen **bitgenau unverändert**.
2. Zweiter Narrator liefert gültige Story → **ein** gültiger Extractor-Commit; kein neuer `turn.begun`, keine doppelte Auszahlung/XP/Schaden.
3. Zweiter Narrator erneut leer → maximal zwei Narratoraufrufe insgesamt, dauerhafter `narration.empty/skipped`-Status und verlässlicher Runner-`narrator_empty`-Abbruch; keine unendliche Generierung.
4. Zwei echte, identische `MESSAGE_RECEIVED`-/Hostevents für den ersten leeren Reply → deduplizierter ein Recovery-Versuch.
5. Manuelle Swipe-/Regenaktion des Spielers vor automatischem Start → kein paralleler Auto-Swipe; legitimer User-Swipe wird normal bewertet.
6. Chatwechsel A→B während leerer Antwort oder Recovery → kein neuer Narrator in B, keine Events aus A in B; Away-and-back klar definieren.
7. Nichtleere Antwort / leere Systemmeldung / echtes Nutzer-Stop / ungültiger Hostzustand → **kein** automatischer Retry.
8. Engine hatte einen abgewiesenen `quest.accept`, `pc.attack`, `go`, `give`, `shop.purchase` etc. → keine doppelte Engineaktion durch Narrator-Swipe; positive echte Skill-/Kampfbuchung bleibt erhalten.
9. Reload zwischen leerem Reply und eventuellem Auto-Retry → Budget pro Playerturn bleibt begrenzt, kein zweimaliger Auto-Retry nach Chat-Reopen.
10. `swipe_info[0].extra` enthält älteren `pending`- oder `skipped`-Snapshot → Rückwechsel darf weder fremden Commit noch „unendliches erneut leeres Story-Redo“ auslösen; End-to-End ST-Test, keine rein synthetische JS-Garantie.
11. `generateRaw`-und Custom-Provider-Szenarien nicht verwechseln; ST selbst steuert die **Narrator**-Anfrage, Engine `v4Llm` nur Planner/Extractor/Board. `index.js`-Generationstop, Save, Chat-ID und new Swipe-Records prüfen.
12. Runner behält echten Fehlernachweis (Anzahl Retry, Ursache, finish/tokens soweit verfügbar) und stoppt bei wiederholter Leere; keine still geschluckten Leerantworten.

**Zwingend echte Browser-/Provider-Abnahme:** `npm test` plus `npm run smoke:st:c` (ST 1.19) **mit ausdrücklich ergänztem Narrator-Empty-Fixture**, danach ein reproduzierbarer echter GLM/Custom-Provider-Fall und der natürliche unveränderte `current_test`. Ein Node-only-Test darf nicht als Host-Regenerate-Verifikation zählen. Ohne sicheren ST-Aufruf **kein falsches „implementiert“**.

## 5. Fachgrenzen

Kein Neuaufbau des gesamten Model-Retriesystems, keine Änderung der bereits funktionierenden Planner-/Extractor-Recovery-Budgets, keine Umgehung der Engine-Ownership, keine falsche Quest-/Kampfbuchung, kein globales `max_tokens`-Umschalten ohne reale Messung, keine stillen zweiten PC-Entscheidungen.

**Status:** Entwurf für einen **einzigen normalen Narrator-Lifecycle-Fachpatch**, nicht ein Satz kleiner Mini-Fixes. Fachlich prinzipiell gewünscht, **technische Umsetzbarkeit erst nach ST-API-/Lifecycle-Beweis**. Neuer natürlicher .66-Run kann zuerst zeigen, ob dieser Defekt weiterhin prioritätsbestimmend ist.

## 6. Freigabe- und Priorisierungsgate nach Run 6 / Build .67

Dies bleibt **ein vollständiger Host-/Narrator-Recovery-Fachpatch**: echte, leere ST-Storyantwort nach bereits gebuchtem Playerturn, höchstens ein kontrollierter regulärer Host-Regenerate-Versuch; derselbe PC-Zug und dieselben Würfel/Quest-/Combat-Events; ein gültiger neuer Swipe darf genau einmal durch Extractor, Firewall und Save. Zweite Leere, manuelles Stop, Chatwechsel, Reload und alte Swipe-Snapshots müssen begrenzt, sichtbar und datenisoliert sein.

**Neue Evidenz:** Der erste natürliche .66-GLM-Run hatte 32 gültige, angewendete Storyextraktionen und endete durch Charaktertod; kein Narrator-Empty-Fall. Die .57-Ausfälle bleiben belegt. **Voraussetzung vor Implementierung:** den tatsächlichen SillyTavern-1.19-API- und Event-Lifecycle des automatischen Regenerate einschließlich Stop-/Swipe-Verhalten nachweisen. Wenn kein sicherer Aufruf möglich ist, **keine halbfertige Auto-Recovery** implementieren; bestehende Diagnose und manuelles Regenerate bleiben erlaubt. Keine erneute Playeraktion, kein eigenes Ersatz-Narrator-v4Llm und keine globale Tokenänderung. Eigenständiger Patch erst nach Nutzerfreigabe, Rot/Grün plus realer Browser-Smoke und echter GLM-Fall.
