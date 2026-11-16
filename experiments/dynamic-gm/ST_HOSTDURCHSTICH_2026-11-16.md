# Dynamischer GM: realer SillyTavern-1.19-Hostdurchstich

16.11.2026. Ausgangspunkt `d2bafbd6543da2586358b03deb57300bf0acfada`, ausschließlich `experiment/dynamic-gm-model`. Produktbasis `.200` unverändert. Neue Dateien liegen ausschließlich im Experimentverzeichnis. Kein natürlicher Provider, kein Produktplugin und kein persönliches Profil verwendet.

## Tatsächlicher Aufbau

Die vorhandene ST1.19-Installation wurde als Quell-/Dependencybasis verwendet: Commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Gestartet mit **eigener Datenwurzel** `/workspace/avereth-setup/dynamic-host/data`, Port 8137. Darin liegen nur STs neu initialisierte Defaults und Testchats. Keine vorhandenen Benutzereinstellungen, Extensions oder API-Zugangsdaten wurden importiert. Testprovider: eigener lokaler HTTP-Server auf 5138, ohne Schlüssel. Chromium wird mit Playwright headless über `/usr/bin/chromium` ausgeführt.

Der `DynamicGM`-Executor, bestehender Scheduler, Journal und Fachregeln laufen unverändert in Node. `st-host.mjs` verbindet sie über Playwright mit **einer tatsächlichen ST-Webseite**, echten ST-Generierungs-/Chatendpunkten und echtem Nachrichten-DOM. Das ist eine externe Testbrücke, **keine installierbare vollständig browserseitige Extension**. Node besitzt das dauerhafte Weltjournal, ST den gespeicherten Chat. Der Browserreload löscht den Browserzustand, nicht den Node-Prozess; Neustart des Node-Koordinators wurde bereits separat offline geprüft.

Reproduktion (zwei Prozesse, nur freie Testports verwenden):

```sh
node experiments/dynamic-gm/st-launch.mjs
node experiments/dynamic-gm/st-browser.mjs
```

`st-launch.mjs` prüft den gepinnten Quellcommit und startet mit separater Datenwurzel. Ein anderer Quellpfad kann über `GM_ST_SOURCE` gesetzt werden. Playwright muss auflösbar sein; Chromium liegt hier unter `/usr/bin/chromium`. Der Runner beendet seinen eigenen Mockprovider und Browser, nicht fremde Prozesse. Die ST-Instanz wird nach der Abnahme separat beendet. Alle Zwischenlogs/Journale/Screenshots bleiben unter der dedizierten Testwurzel erhalten; kein vorsorgliches Löschen.

## Reale APIs und sicherer Save

- `SillyTavern.getContext().selectCharacterById()` und `openCharacterChat(file_name)` öffnen tatsächliche ST-Testchats. Reload stellt den Charakter und genau den Testchat wieder her.
- `generateRaw({prompt:messages,api:'openai',trimNames:false})` führt den nichtstreamenden Request durch den realen ST-Generierungsweg aus. Dieser hängt keine sichtbare Nachricht an.
- Der Streamingpfad verwendet browserseitig STs realen `/api/backends/chat-completions/generate`-Endpunkt mit `stream:true`. SSE wird außerhalb von STs normalem `StreamingProcessor` vollständig gepuffert. **Kein Beleg, dass unverändertes Stock-Streaming zurückhaltbar wäre.** Es wird bewusst nicht für die Geschichte verwendet.
- `eventSource`/`eventTypes.GENERATION_STOPPED` und `CHAT_CHANGED` invalidieren die lokale Generationsepoch. Der Test klickt Stop und öffnet tatsächlich einen anderen ST-Chat. Dauerhafte Ursprungschat-ID und erneuerbare Epoch bleiben getrennt.
- Die nativen Click-Aktionen für `#option_regenerate`, `.swipe_left`, `.swipe_right` und normales Senden werden im isolierten Adapter abgefangen; die Oberfläche meldet kontrollierte Ablehnung. Das ist noch keine vollständige Abdeckung aller Slashcommands, anderer Extensions und programmgesteuerter Generationseinstiege.
- `addOneMessage()` erzeugt die tatsächliche Anzeige erst nach bestätigtem Save/Read-back. Der Adapter aktualisiert den aktiven Chatarray und rendert die zusammengehörige Chatversion. Er verwendet nicht die normale MESSAGE_RECEIVED-Nachlaufpipeline.

**`saveChat({chatName,chatData})` ist allein nicht ausreichend zielgebunden:** ST liest `characters[this_chid].name/avatar` weiterhin aus dem aktiven Zustand (`public/script.js:7395–7447`). Eine bloße Angabe des Dateinamens garantiert daher keine richtige Charakterzuordnung nach einem Wechsel.

Die vorhandenen Backend-APIs bieten dagegen die nötige explizite Zielwahl: `/api/chats/save` und `/api/chats/get` erhalten das beim Bind erfasste Tupel **avatar_url, ch_name, file_name** sowie STs CSRF-Header. Der Server adressiert das Chatverzeichnis anhand `avatar_url` und die Datei anhand `file_name` (`src/endpoints/chats.js:545–615`). Der Adapter liest nach jedem Save vom selben Ziel zurück und vergleicht den vollständigen Kandidaten. Auch auf Resume wird vor einer Cacheentscheidung tatsächlich erneut gelesen. HTTP-200 ohne Schreibwirkung reicht nicht als Bestätigung.

Ein absichtlich während des verzögerten Saves erfolgender Wechsel nach `other` verändert dessen GM-Buchungen nicht. Nur der ursprüngliche Zielchat enthält den Abschluss. Die neue ST-Begrüßung im gerade geöffneten Ersatzchat ist normale ST-Aktivität, keine falsche GM-Publikation. Gruppenchat, Rename/Delete während Save und Mehrbenutzerkonkurrenz sind nicht abgenommen.

## Veröffentlichungs- und Wiederaufnahmevertrag

Ein zusätzlicher realer Integrationsfehler wurde gefunden: ST bevorzugt `extra.display_text` gegenüber `mes`. Der ursprüngliche Draft hatte dort noch den Text vor der kreativen Fortsetzung. Der Adapter entfernt ausschließlich für die fertige neue Nachricht diesen abgeleiteten Cache und normiert deren vorhandene Swipe-Darstellung auf die bestätigte Version. Erst dann werden genau diese Daten gespeichert und angezeigt. Der fehlerhafte Zwischenlauf hatte korrekt gespeicherte Mechanik, aber unvollständigen sichtbaren Text; die Prüfung wurde nicht auf die unsichtbare `mes`-Eigenschaft abgeschwächt.

Der bisherige Mock konnte synchron rendern. Die reale Playwright-/Browserbrücke kann das nicht. Deshalb implementiert `BrowserPublication` gezielt den asynchronen Hostteil: Weltrevision prüfen → ursprüngliches Ziel lesen → gegebenenfalls Save → Read-back → Hostgültigkeit prüfen → tatsächliche DOM-Anzeige abwarten → `published` speichern. Die Spielregeln und der GM-Vertrag ändern sich dabei nicht.

Während Raw-Generierung und SSE-Chunks wird die Anzahl sichtbarer Nachrichten geprüft; es wird keine ungeprüfte Geschichte angehängt. Erfolgreiche Anzeige braucht einen bereits committed Weltabschluss. Fehler vor Anzeige lassen die gespeicherte Welt rekonstruierbar. Fehler nach Anzeige und vor Publikationsbestätigung zeigen beim Wiederaufnehmen dieselbe Chatversion; es entsteht kein zweiter Transfer oder neuer Wurf.

Ein Browserreload zwischen Commit und Anzeige setzt die Epoch zurück, lädt exakt den Ursprungs-Chat und liest den tatsächlichen Save erneut. Bereits erfolgreiche Modellrequests kommen aus dem Node-Journal. Ein unverifizierter automatischer Node-Service-/Browser-Lifecycle im Produkt wird damit nicht behauptet.

## H1–H4 und Fehlerumfang

H1: Wat-Zusage wird mit **einem** real über ST geführten geskripteten Request erzeugt und als Thread gespeichert. Nachricht erscheint nach Save/Read-back. Reload/Resume fordert kein neues Modell an. Eine weitere gezielte Prüfung baut einen späteren Turnkontext ohne ursprünglichen Dialog auf und findet die Zusage darin wieder. Das beweist Bereitstellung, keine natürliche Gedächtnisleistung.

H2: Der persönliche .200-Waldzug verwendet die vorhandene Originaleingabe, Plan und Narration plus ausdrücklich synthetische erfolgreiche Weltantwort. **Zwei** reale Requests: GM-Aktionsvorschlag und gemeinsamer Weltabschluss. SSE wird gepuffert; kein Extractorrequest und kein Extractor-Timeout gehören zum Erfolg. Ein zweiter Fall bestätigt das bewusst nicht erreichte Ziel am ursprünglichen Ort.

H3: Holzmarkerübergabe, dann zusätzliche kreative Prosa und neue Zusage, **zwei** reale Requests. Kandidat und Abschluss besitzen denselben RNG-Zähler und dieselbe Uhr. Wiederaufnahme erzeugt keinen weiteren Modellrequest/Objekttransfer. Die vorhandenen Offlineprüfungen vergleichen zusätzlich die vollständige Mechanikprojektion.

H4: Fehler vor Commit, nach Commit, nach Hostsave und nach Anzeige; Stop im Precommit-Hook; wirklicher Chatwechsel während Save; Reload/Resume; kontrollierte native Regenerate-/Swipe-Ablehnung. Fehlgeschlagener Save (HTTP500) und scheinbar erfolgreicher Save (HTTP200 ohne Persistenz) werden durch echten Backend-Read-back erkannt. Die Savefehler sind über Browserrouting gezielt injiziert, keine behaupteten realen Datenträgerausfälle.

Providerfehler: Mock-429 durch die tatsächliche ST-Weiterleitung, defektes JSON, Stop mit verspäteter/abgebrochener Antwort und simulierter lokaler Timeout bei verzögerter echter Browseranfrage. Vier Kapazitätseinheiten bleiben bei lokal unbekanntem Abschluss belegt. Selbst nachdem die verzögerte Antwort angekommen ist, wird nicht allein dadurch eine unbestätigte Welt veröffentlicht. Erst expliziter Abschlussnachweis an den Scheduler und Backofffreigabe erlauben einen erneuten gezählten Versuch. Der konkrete produktive Provider unterstützt damit noch kein nachgewiesenes Remote-ACK-Verfahren.

## Semantik und technische Abnahme sind verschieden

Die bekannten Fehler werden bewusst in der echten ST-Oberfläche gezeigt: ausgesprochene Zusage ohne Thread, erfundene Zustimmung, unberechtigt erzähltes fremdes Wissen, Ankunftsverneinung bei positiv gebuchtem Ort und Fortsetzungsprosa, welche eine gebuchte Gabe verneint. Die Prüfungen dieser Fälle zählen das **beobachtete Fehlverhalten**, nicht erfolgreiche Sprachsicherheit. Typisierte Quellen-/Wissensprüfungen im vorherigen Vertrag bleiben bestehen; freie Prosa kann sie weiterhin umgehen. Keine neue globale Promptregel und keine Pflicht-Extraktion wurden hinzugefügt.

Der Host verhindert technische Vorabpublikation, nicht jede semantisch falsche validierte Geschichte. Ein geskripteter Satz über ein fremdes Geheimnis beweist lediglich, dass keine vollständige Dialogprüfung vorhanden ist; er misst nicht natürliche Fehlerwahrscheinlichkeit. Literarische Qualität, spontane Eigeninitiative und die Entscheidung eines realen Modells für passende Tools bleiben ungemessen.

## Tatsächliche Endergebnisse

- **21/21 Browserprüfungen bestanden**, **0 PageErrors**, Chromium **156.0.8078.79**. Davon sind drei Prüfungen ausdrücklich semantische Fehlerdemonstrationen, keine bestandenen Sprachschutzanforderungen.
- **27 tatsächliche geskriptete Modellrequests** am Mockprovider über den realen ST-Backendweg, einschließlich aller Fehler-/Wiederaufnahme-/Semantikproben. Pro Prüffall ist die Zählung im JSON enthalten. H1: 1; H2: 2; H3: 2; native Swipe-/Regenerate-Ablehnung: 0. Fehler vor/nach Save/Anzeige benötigen jeweils nur den einen ursprünglichen Request. 429 und Timeout benötigen jeweils 2 einschließlich Fehlversuch.
- Die weiterhin unveränderten Offlineprüfungen wurden ausgeführt: **49/49 bestanden**, ca. 18,06 s; ihre Gegenbeispiele bleiben entsprechend markiert. Keine vollständige Gameplay-Suite.
- Save-/Get-Endpunkte, sichtbare DOM-Nachrichten und Browserreload wurden tatsächlich ausgeführt. Ereignisspur zeigt CHAT_CHANGED beim Öffnen/Wiederladen und STs MESSAGE_RECEIVED/CHARACTER_MESSAGE_RENDERED beim Laden; die kontrollierte Anzeige hat einen gesonderten `display`-Beleg. Diese Ereignisse sind nicht mit einem neuen GM-Modellaufruf gleichzusetzen. Eine vollständige durchgängige Eventhistorie aller Seitenreloads wird nicht behauptet.

## Ergebnisartefakte und nächste Entscheidung

Die vollständige Browserprüfliste mit PageErrors, tatsächlichen Mockproviderrequests und ST-Ereignissen steht in `st-results/report.json`. Screenshot und Runnerlog liegen daneben; alle umfangreichen Server-/Zwischenfehlerlogs verbleiben in der separaten Testwurzel. Die beiden initialen Versuche sind nicht nachträglich als grün zu lesen: Der erste hatte fehlende Charakterwiederherstellung nach Reload und einen PageError während der Einrichtung. Später erkannte die Prüfung zusätzlich den Unterschied zwischen normaler ST-Begrüßung und falschem GM-Save sowie die nötige asynchrone Anzeigequittung. Die finalen Ergebnisse beziehen sich auf den korrigierten Adapter.

**Empfehlung:** Nach grüner finaler Browserabnahme ist ein kleiner, separat freizugebender natürlicher GM-/B-Vergleich sinnvoll. Er soll gerade die bekannten semantischen Fehler, Gedächtnis nach Kontextverlust, Eigeninitiative und reale Toolfortsetzungen messen. Die technische externe Node-/Browserbrücke kann diese kontrollierte Probe tragen. Eine installierbare ST-Extension, vollständige alternative Swipes, systemweite Lifecyclebeherrschung und persönlicher Spielbetrieb sind damit nicht freigegeben.
