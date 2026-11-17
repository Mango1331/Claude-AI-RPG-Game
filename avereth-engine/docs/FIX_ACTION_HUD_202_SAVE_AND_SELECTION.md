# Action-HUD .202 — Save-Integrität und bewusste Aktionsauswahl

17.–18.11.2026 (Europe/Berlin). Entwicklungsbranch `experiment/action-hud-200-v1`, Ausgangsstand `.201 / f3f6efb93e251e75533f497ef9d33cbe7dd267ba`. Enger Nachtrag zum unabhängigen GPT-Diffreview R1/R2. Produkt `.200` und `main` bleiben unverändert.

## R1 — Verworfen ist nicht gespeichert

Der Befund ist bestätigt. Der Fetchadapter in `index.js` beantwortete bestimmte `Stale`-/`Older native`-Fehler mit HTTP 200 und `{superseded:true}`. ST 1.19 wertet `response.ok` in seinem tatsächlichen `saveChat()` unmittelbar als Erfolg. Der interne Avereth-Status allein verhinderte diese falsche Bestätigung nicht.

Der isolierte Browsergegenfall hält einen echten, bereits serialisierten/komprimierten nativen ST-Save von A vor der Avereth-Verarbeitung an. A enthält eine noch nicht persistierte Änderung. Danach wird mit `openCharacterChat()` tatsächlich zu einem anderen Kampagnenchat B gewechselt und erst dann A freigegeben. Auf dem unveränderten `.201`-Produktcode: **HTTP 200, `superseded:true`; die Änderung fehlt beim erneuten Laden von A**. B wurde zwar nicht überschrieben, aber A wurde fälschlich Erfolg gemeldet.

Ein zweiter Gegenfall ändert nach dem eingefrorenen Snapshot ST-Nachrichtenfelder wie `name`, `gen_finished` und ein zusätzliches verschachteltes Feld. Die bisherige `recordSignature` projizierte nur ausgewählte Felder und übersah diese Änderungen.

Korrektur:

- Ein verworfener nativer Save erhält **HTTP 409**, `error:avereth_save_rejected`. Er wird weder weitergeschrieben noch als gespeichert bestätigt. Der Fehler heißt ausdrücklich nicht ST-`integrity`; es entsteht kein Aufforderungsdialog zum Force-Overwrite. ST zeigt seinen vorhandenen Speicherfehler an.
- Die Prüfung berücksichtigt auch die Kampagne im eingefrorenen Payload. Ein verzögerter Kampagnensave verliert seinen Schutz nicht allein durch den Wechsel des aktiven Chats.
- `recordSignature` vergleicht die vollständigen JSON-persistierbaren Nachrichtenobjekte, einschließlich zukünftiger ST-/Extensionfelder. Derselbe Vergleich schützt vor Dispatch, nach der vorherigen Remoteprüfung und im tatsächlichen Read-back. Auch die Freigabe des aktuellen „Gespeichert“-Status verwendet ihn.
- Ein verzögerter **inhaltlich vollständig identischer** nativer Snapshot darf seine technische Speicherrevision aktualisieren. Er durchläuft trotzdem einen echten neuen Write mit Read-back; eine bloße `superseded`-Bestätigung gibt es nicht. Neue Nachrichtenfelder oder Metadaten/Reservierungen schließen diesen Weg aus. Der bisherige Gegenfall für ältere Snapshots enthält ausdrücklich eine neuere gespeicherte Namensänderung und bleibt ein Ablehnungstest; zusätzlich prüft ein positiver Fall den tatsächlichen zweiten Schreibvorgang.
- Vor einer normalen Generierung, Regenerate, Swipe oder Continue wird ausschließlich ein **bereits laufender** nativer Save abgewartet. Verwendet werden die realen ST-1.19-Exporte `isChatSaving` und `cancelDebouncedChatSave` aus `/script.js`. Der awaitbare `GENERATION_AFTER_COMMANDS`-Hook liegt vor STs Nachrichten-/Kontextmutation und HUD-Reservierung, nach der Ursprungserfassung des Action-Composers. Abbrechende Slashbefehle erreichen diesen Hook nicht; deren ausstehender Edit-Save bleibt erhalten (eigener Browsergegenfall). Ein verzögerter Save-Timer wird entfernt; STs regulärer nächster Save enthält die Eingabe und ausstehende Änderungen. Keine zusätzliche Save-Anfrage, kein zusätzlicher Modellrequest, keine Annahme eines Erfolgs allein aus STs aufgelöstem Promise. Quiet-/Raw-Aufrufe und Dry-runs bleiben unberührt. Der asynchrone Weltjob und die bisherige Sichtbarkeit der Erzählung bleiben unverändert.
- Kein automatisches Speichern in den inzwischen anderen Chat, keine fingierte Empfangsbestätigung und kein Force-Push/Force-Save. Bereits zulässige zielgebundene Writes und deren Read-back bleiben erhalten.

## R2 — Ein Ziel ist keine Angriffswahl

Auch dieser Befund ist bestätigt. Das native `<select>` belegte die erste verfügbare Fähigkeit vor. Der gemeinsame Ziel-/Skillclickhandler nutzte diesen Wert, obwohl der Spieler nur ein Ziel angeklickt hatte.

Der gemeinsame Aktionswähler beginnt jetzt mit **„— Aktion wählen —“** und leerem Wert. Ohne bewusst gewählte Fähigkeit erzeugt der Zielklick keinen Aktionsbaustein. Nach Entfernen, erfolgreicher Eingabebindung und beim Chatwechsel werden die Auswahlkontrollen zurückgesetzt; eine alte sichtbare Dropdownvorgabe darf keine neue Aktion autorisieren. Bewusster Skillklick plus Ziel bzw. ausdrückliche Auswahl im Dropdown funktionieren weiter. Klicks allein buchen weiterhin keine Mechanik und lösen keinen Modellrequest aus.

Geändert werden nur `index.js`, `src/v4/action_persistence.js`, `src/action_composer.js`, Versionsangaben, Regressionen/Smokeanschluss und diese Dokumentation. H/F-Vertrag, Kampfregeln, NPC-Memory, Providersteuerung und Narratorprompt bleiben inhaltlich unverändert. Build **4.3.0-c.6.6.202**; die unveränderte Narratorvertragsrevision bleibt bewusst `.201`.

## Abnahme

Rotnachweis mit neuer Testinstrumentierung, aber ursprünglichem `.201`-Produktcode:

- Node: bisherige 8 Persistenztests bestanden; **3 neue R1-Gegenfälle scheiterten** (unbeachtete Nachrichtenfelder, unvollständiger Read-back, Änderung während der Remotevorprüfung).
- Echter ST-1.19-Browser: `out/2026-11-17T22-15-47-547Z/action_review`, **37/43**, genau die sechs neuen negativen R1-/R2-Prüfungen rot. `run.log` enthält die tatsächlichen HTTP-Bestätigungen. Die zusätzliche Prüfinstrumentierung verändert keine historischen Testoriginale.
- Erster Grünnachweis: **37/37** gezielte Action-/Persistenz-/Requesttests; enger Browserlauf **42/42, 0 PageErrors**. Der danach verschärfte Fall mit ungespeicherter A-Änderung ist Bestandteil der vollständigen finalen Smokes.

Gezielte und vollständige Abnahme:

- `node --test tests/v4/action_input.test.js tests/v4/action_persistence.test.js tests/v4/action_request_control.test.js`: **38/38**.
- Echter isolierter Browser, `--mode action_saves`: **59/59, 0 PageErrors**, Artefakte `out/2026-11-17T22-59-18-110Z/action_saves/`. Enthält die neuen R1-/R2-Fälle, echten verzögerten nativen Save beim Generierungsstart, Finanz-/Swipe-/Regeneratefälle, dauerhaften HTTP 500, ausdrückliche Wiederaufnahme und bestehende Hostprüfungen. Die danach verfeinerte Hook-Position und der zusätzliche Slash-Gegenfall wurden in beiden vollständigen Endläufen abgenommen.
- Vollständiges `npm test`: **3.383/3.383**, keine Fehler oder übersprungenen Tests.
- Vollständiges `npm run replay:check`: **2.235 Fälle**, 0 neue/unfreigegebene Abweichungen, 0 Replay-/Foldfehler. Alle 1.131 gegenüber `.126` unterschiedlichen Fälle entsprechen exakt der bestehenden Freigabe; Originaldaten und Fingerprints wurden nicht geändert.
- Vollständiger Failsoft-Endlauf: **294/294, 0 PageErrors**, `out/2026-11-17T23-01-10-670Z/failsoft/`. Alle 14 zusätzlichen R1-/R2-/Save-Koordinationsprüfungen bestanden, einschließlich Slashbefehl mit ausstehendem Edit-Save.
- Erster breiter Standard-Grünlauf: **287/287, 0 PageErrors** am selben Berichtspfad unter `standard/`, noch vor der abschließenden Hook-Verschiebung und dem zusätzlichen Slash-Gegenfall. Vollständiger **Standard-Endlauf auf identischem finalen Code: 288/288, 0 PageErrors**, `out/2026-11-17T23-23-53-957Z/standard/`. Die Abschlussberichte `report.json`/`report.md` und beide `result.json` wurden geprüft. Standard enthält 4, Failsoft 5 erwartete injizierte Konsolenfehler; keine unerwarteten Konsolenfehler und keine ungefangenen Browser-PageErrors.

Zwischenläufe deckten zusätzliche zeitliche Überschneidungen nativer Saves auf (zuerst Standard 284/285, `noPageErrors` rot; außerdem Finanz-/Swipe-Lauf 35/36). Diese wurden nicht freigegeben oder gefiltert. Der angehaltene Save während des nächsten `Generate` war vor der Koordination mit 44/45 gezielt rot. Eine zunächst eingesetzte zusätzliche `saveChat()`-Anfrage störte ihrerseits den bestehenden HTTP-500-/Wiederaufnahmefall (breite Läufe mit Timeout abgebrochen, keine bestandene Abnahme). Die finale Koordination wartet ausschließlich auf einen bereits laufenden nativen Save und entfernt den verzögerten Timer. Der gezielte Endlauf prüft diese Fehlerpfade gemeinsam.

Browserprüfungen benutzen ausschließlich die vorhandene markierte Sandbox `/workspace/avereth-setup/st-sandbox`, ST 1.19 (`7e8663cd9c184a550b37238218bdd32c6efc68e9`), Chromium 151 und Mockprovider. Der neue `action_review`-Modus ist außerdem Bestandteil von Standard und Failsoft. Erwartete Konsolenmeldungen des absichtlich abgewiesenen nativen Saves werden nur während dessen gezielter Freigabe als injizierter Speicherfehler erfasst; echte `pageerror`-Ereignisse bleiben uneingeschränkt Fehler. Keine pauschale Lockerung von `noPageErrors`.

## Grenzen

Ein verspäteter, unzulässiger Save kann weiterhin abgelehnt werden; die Änderung ist dann ausdrücklich **nicht gespeichert** und muss im Ursprungschat geprüft bzw. erneut vorgenommen werden. Dieser Patch führt kein neues Wiederherstellungsjournal ein. Die Hostkoordination ist gegen die genannten ST-1.19-Exporte geprüft; spätere ST-Änderungen benötigen erneute Hostabnahme. ST bietet weiterhin keine serverseitige Versions-CAS; ein schreibender Avereth-Client je Chat bleibt der zugesicherte Umfang. Natürliche Modellqualität und persönliches Spielgefühl werden durch diese Mockprüfungen nicht bewiesen.

Kein Merge und kein persönlicher Provider-Spieltest aus dieser Lieferung. Nächster Schritt bleibt der unabhängige Review des eng begrenzten Korrekturdiffs.
