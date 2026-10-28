# Build .111 — Gildenregistrierung und Erstellungszustand

Basis `.110` / `da933e9`, Nutzerauftrag zum Original-Batch `20261028-101151Z`. Die Fehlerpfade waren bereits auf `.106` vorhanden. Kein neues Registrierungs-, Zahlungs- oder Reisesystem.

## Ursachen und Korrekturen

- `v4/commands.js`, `pay`: Die kanonische Gebührenbehandlung verlangte Hallenpräsenz; ohne diese fiel selbst `for: registration` in die gewöhnliche NPC-Zahlung zurück. Zweckgebundene Gebühren werden unter V4-C/Ruleset 2 jetzt vor diesem Rückfall geprüft: außerhalb der Halle und bei bestehender Mitgliedschaft kein Geldabzug. Gültige Zahlungen verwenden weiterhin `REGISTRATION_OFFER` → `offer.accept` → `registerEvents`. Auch vertauschte Kommando-Reihenfolge und wiederholte Gebühr bleiben einmalig. Die bestehende Unterscheidung unabhängiger Trinkgelder/Geschenke wird bereits vor der kanonischen Annahme berücksichtigt; andere Zahlungszwecke bleiben gewöhnliche Zahlungen.
- `context.js`: Der Abschluss der Erstellung wurde bisher nur im ersten Storyzug ausdrücklich genannt, obwohl die historische Begrüßung weiter ein offenes Menü zeigen konnte und die System-Auswahlturns im Narratorverlauf fehlten. V4 zeigt den vorhandenen Abschlusszustand jetzt in jedem Storyzug als prioritäre Engineinformation. Die historische Begrüßung und gespeicherte Nachrichten werden nicht umgeschrieben; V3 behält sein bisheriges Verhalten.
- `v4/world.js` → `v4/firewall.js`: Der abgeschlossene Erstellungszustand wird als Firewall-Kontext übergeben. Die exakte maschinelle Menübehauptung unter `interface` (`CHARACTER CREATION STEP …`) sowie explizite Erstellungszustands-Prädikate können danach keine freien aktuellen Fakten mehr sein, auch nicht mit einem NPC als Subjekt. Ablehnung erzeugt eine Korrektur. Normale Ausbildungs-/Vergangenheitsfakten und andere Interfaces bleiben zulässig. Keine allgemeine Filterung von Prosa, Erinnerungen, Verneinungen oder Skillnamen.
- `v4/planner.js`: Das Originalkommando mit „how I can register“ ist kein gültiger Registrierungsentschluss und führt in den bestehenden begrenzten Plan-Repair. Der Prompt trennt die tatsächlich erklärte Annäherung an die bekannte Halle (GO), Nachfrage (Dialog) und spätere Anmeldung/Gebührenannahme. `agency.js` erkennt „approach“ als Bewegungswort. Kein GO wird deterministisch hinzuerfunden; Sichtung eines Schilds und bloße Wegfragen autorisieren keine Ankunft. Unbestätigte Ankunft bleibt unbestätigt.

## Nachweise

`tests/v4/patch_guild_start111.test.js` und `fixtures/batch6_guild_start.json` enthalten Originaltexte, Pläne, Deltas und Events des angehängten Exports, ohne Provider-/Profilgeheimnisse. Original-ZIP und Reviews bleiben unverändert.

- **14 neue Tests:** auf unverändertem `.110` **8 rot / 6 Kontrollen grün**, nachher **14/14**.
- Enthalten: Originalkette T3–14 mit bewusst falscher Erzählung, abgelehnte Gebühr in beiden Reihenfolgen/allein, erfolgreiche einmalige Registrierung samt serialisiertem Replay, wiederholte Gebühr, unabhängiges Trinkgeld auch bei offenem Registrierungsangebot, normale Zahlung, falsches Erstellungs-Faktum, legitime Ausbildung/Interface-Fiktion, anhaltende Abschlussinformation, Original-T4-Reparaturhinweis, echte GO-Ankunft ohne Anmeldung und Schild ohne GO.
- Angrenzende Registrierungscluster und V3-Erstellung: **29/29** einschließlich der neuen Tests. Zwei beim ersten Gesamtlauf sichtbar gewordene Nebenwirkungen wurden korrigiert: V3-Abschlusshinweis bleibt einmalig; „the fee“ mit Registrierungsentschluss verwendet weiterhin das kanonische Angebot.
- Vollständiger Testumfang des `npm test`-Scripts mit vorangestellter Node-Testparallelität 4 und TAP-Reporter: **2191/2191**, Exit 0. `npm test` wurde ebenfalls ausgeführt; die angehängten CLI-Flags ergaben dort keinen vollständigen Abschlussbericht. Maßgeblich ist deshalb der vollständig abgeschlossene identische Testumfang mit expliziten Node-Optionen vor den Dateinamen.

## Grenzen

Ein Prompt-/Repair-Fix garantiert keine richtige Interpretation jedes natürlichen Satzes. Wiederholte falsche oder leere Pläne werden weiterhin sicher abgebrochen bzw. als nicht ausgeführt behandelt. Der aktuelle Erstellungszustand bleibt Engine-owned, eine falsche Erzählung kann trotzdem sichtbar sein. Die gezielte Prüfung maschineller Menüfakten ist kein vollständiges Verständnis beliebig umformulierter Systembehauptungen. Bereits in alten Saves gespeicherte falsche Fakten werden nicht migriert oder gelöscht; der aktuelle Abschlusszustand wird ausdrücklich entgegengehalten.

Kampf, XP, Scaling, Skillentwicklung, NPC-Anwesenheitsfilter und Runner bleiben unverändert. Die drei noch offenen unbenannten NPC-Rückkehrfälle aus dem früheren Batch bleiben außerhalb dieses Auftrags. Keine neue Kartenrevision und kein natürlicher Langlauf gestartet.

## SillyTavern-Abnahme

Echter ST-1.19-Smoke mit Mock-Provider auf `.111`: abschließend **22/22**, fünf Extractor-Aufrufe, `extractPerReply`/`fightOpened` erfolgreich, keine PageErrors. Zwei frühere Versuche waren **nicht grün**: jeweils alle 21 fachlichen Checks bestanden, aber zwei bzw. ein `AbortReason` aus STs Verbindungsstatusprüfung (`openai.js:4565`). Ein Kontrolllauf auf unveränderter `.110` bestand 22/22; danach bestand auch der erneute unveränderte `.111`-Lauf 22/22. Keine Hoständerung oder Unterdrückung des PageError-Checks vorgenommen. Die vorübergehende Beobachtung bleibt dokumentiert; der Mock beweist keine natürliche GLM-Semantik.

Geänderte Dateien: `src/v4/commands.js`, `src/v4/planner.js`, `src/v4/agency.js`, `src/v4/firewall.js`, `src/v4/world.js`, `src/context.js`; Buildnummern in `src/util.js`, `manifest.json`, `package.json`; neue Regression und Originalfixture sowie diese Fachpatchnote. Abschließende Diff-/Whitespaceprüfung ohne unbeabsichtigte Änderungen.

## Reviewfix .112 — fehlender Zahlungszweck, 28.10.2026

Der nachgereichte Prüfpunkt ist auf `.111` reproduziert: `pay` allein mit `for:null` buchte trotz ausdrücklich genannter Registrierung im Zahlungszitat gewöhnliches NPC-Geld. An der tatsächlichen Halle fehlte entsprechend die Mitgliedschaft trotz Abbuchung.

`commands.js` berücksichtigt bei fehlendem `for` jetzt den ausdrücklichen Zweck der eigenen Zahlungsklausel. Ist das exakte Zahlungszitat verkürzt, wird nur eine unmittelbar anschließende Zweckangabe aus dem Originalinput herangezogen. `turn.js` übergab diesen Text bereits; `resolveCommands` reicht ihn nun in seinen bestehenden lokalen Kontext durch. Keine Suche nach beliebigen Registrierungswörtern im gesamten Input: getrennte Folgefragen ändern den Zahlungszweck nicht. Unabhängige Geschenke/Trinkgelder bleiben ausgenommen. Der erkannte Zweck nutzt ausschließlich die bisherigen kanonischen Gebührenprüfungen; weder neuer Geldpfad noch automatische Registrierung außerhalb der Halle.

**Abnahme:** sechs zusätzliche Tests in der bestehenden Regression, auf `.111` drei rot/drei Kontrollen grün; nachher gesamte Fachdatei **20/20**. Enthalten sind volles und verkürztes Zitat, gültige Hallenregistrierung ohne `for`, gesonderte Registrierungsfrage, unabhängiges Geschenk und vollständiges Zitat einer Brotzahlung mit anschließender Frage. Vollständiger unveränderter Testsatz des `npm test`-Scripts mit vorangestellter Node-Testparallelität 4: **2197/2197**, Exit 0. Diff-/Whitespaceprüfung grün. Versionen in `util.js`, Manifest und package auf `.112`; bestehende Fachnote ergänzt. Keine neuen Host-/Protokoll-/Promptänderungen, kein erneuter ST-Smoke; die .111-Smoke-Ergebnisse oben sind historische Nachweise, keine .112-ST-Abnahme. Kein natürlicher Lauf gestartet.

Die Erkennung ist auf ausdrückliche englische Zahlungszwecke begrenzt, kein universelles Sprachverständnis. Der Fix sichert den bestätigten Gegenfall; beliebige vom Planner falsch abgeschnittene oder falsch bezeichnete Zwecke bleiben nicht automatisch vollständig interpretierbar.
