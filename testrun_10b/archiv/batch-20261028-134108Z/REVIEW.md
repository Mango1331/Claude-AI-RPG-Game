# GPT-Review – Batch 20261028-134108Z: .113-Provider-429 nach 22 Warrior-Inputs

**Quellenbasis:** unverändertes Nutzer-ZIP, Original-Run-/Evaluationdateien, Calls, Eventexport und zeitgestempeltes Serverlog. **Kein eigener Provider-/ST-Nachlauf, kein Produktcode geändert.**

## 1. Original und eindeutiger Abbruchgrund

- ZIP `batch-20261028-134108Z.zip`, **3.818.625 Bytes**, SHA-256 **`3677958fc140c2395071d55be1ddc27b8ace5b717009eb6096ee3a8254cd22c6`**, 34 ZIP-Einträge, CRC vollständig geprüft: **fehlerfrei**. Original-ZIP liegt als Chat-Anhang, **nicht auf `main`**.
- Version durch alle gestarteten Profilkonfigurationen: **4.3.0-c.6.6.113**, Produktcommit **`55c547f47701`**, sauberer Produktbranch.
- **Guild-Warrior:** **22 Spielerinputs**, Level 1, Ende laut `run.json`: **`{kind:'ui', why:'turn 22: no reply after the message'}`**. Genauere Ursache im selben Run belegt: **HTTP-429/Too Many Requests** beim Narrator-Aufruf, Providerfehlercode **`model_switching_limit_exceeded`**. Kein Kampf-/World-/Planner-Crash. Letzter regulärer Erzähl- und Extraktionsabschluss bei Turn 21; turn 22 bleibt ohne Narrator-Reply.
- **Guild-Mage:** **0 Spielerinputs**, `run.json.end`: **`harness: interrupted (Ctrl+C)`**. `batch.json` führt ihn summarisch als `process_error`, der **konkret aufgezeichnete Vorgang war aber ein manueller Stopp**, noch vor jeder Modellgenerierung. Das darf nicht als Mage-Gameplay-/Providerdefekt bewertet werden.
- **Guild-Rogue:** `batch.json` = `pending`, **nicht gestartet**. Keine Rogue-Eingaben, keine Rogue-Aussage.

## 2. Beweiskette Turn 22 – Provider-Ablehnung

Der letzte Spielerinput lautet **`I strike the strider's exposed head at the third rack post with Heavy Slash.`**.

1. **Planner erfolgreich:** `calls.json`, Aufruf **60**, `role=plan`, `finish=stop`, Zeit **13:50:38.571Z**, 8.594 ms; Engine-Events führen `turn.begun` (Engine-T21) und `outcome.recorded`.
2. **Kampfrange bereits vor der Providerablehnung geprüft:** Der Engine-Ausgang ist `kind=combat`, `not_started=true`, `illegal='Bog Strider A is at SHORT; Heavy Slash reaches ENGAGED at most and no declared movement brings it into range'`. **Kein angefangener Kampf, Treffer oder Schaden aus diesem Spielerinput.**
3. **Narrator-Call ohne Antwort:** `calls.json`, Aufruf **61**, `role=narrator`, Beginn **13:50:47.413Z**, kein `finish`, `resp_model=null`, `no_response=true`.
4. **Server-Fehler:** Zeitstempel **13:51:06.410Z**: `Chat completion request error: Too Many Requests`. Providerantwort: **`rate_limit_error` / `model_switching_limit_exceeded`**; Meldung: `Your current plan only allows you to switch models 100 times per minute. Please try again later or upgrade your plan to increase this limit.`
5. **ST-/Runner-Oberfläche:** `run.json` enthält zur selben Zeit einen Toast `API returned an errorToo Many Requests`, einen PageError `sendOpenAIRequest(...openai.js:3199:19)` und einen Serverfehler. Der Runner wartet auf eine Antwort und klassifiziert den fehlenden Reply als UI-Abbruch.

**Wichtig:** Das Problem ist eine **externe Providerablehnung** im Narrator-Aufruf. Es ist **kein** Hinweis, dass `.113` die Zahlungssicherheit oder Floor-Anzeige beschädigt. Weder der Planner noch die spätere Extraktion konnten diesen 429-Fehler als gewöhnlichen narrativen World-Report behandeln. `run.json` meldet **`safeContinuations: 0`**; keine terminale Fail-soft-Continuation wurde gebucht oder bewiesen.

## 3. Provider-Fehlermeldung ist kein Nachweis von Modellwechseln durch Avereth

**61 Engine-Provideraufrufe** insgesamt: **21 Planner, 19 Narrator, 18 Extractor, 3 Board**; in sämtlichen `calls.json`-Einträgen ist das **angeforderte Modell `zai-org/GLM-5.3-Flash`**; 60 Ergebnisse haben auch dasselbe Rückgabemodell, beim abgewiesenen Narrator-Aufruf gibt es kein Antwortmodell. Die höchste aufgezeichnete Startfrequenz beträgt **10 Calls in einer Kalenderminute**, nicht 100. Diese Angaben zählen **nur die Calls des Warrior-Runs**, nicht andere Prozesse oder das Providerkonto.

Die Provider-Rückmeldung nennt ein Limit von 100 Modellwechseln pro Minute, doch **der Test selbst dokumentiert weder solche Wechsel noch 100 Anfragen in einer Minute**. Offen bleibt, ob andere Kontonutzung, eine besondere Kontingent-/Gateway-Zählung oder ein Providerfehler ursächlich ist. Eine automatische Diagnose `Avereth schaltet zu viele Modelle um` wäre **nicht belegt**.

## 4. Was vor dem Providerabbruch funktionierte

- **Charaktererstellung**: Warrior, genau die gewählten Starter-Skills `warrior.heavy_slash` und `warrior.guard`. Keine wiederholte Erstellung.
- **Gildenstart in Glassmere**: echte `guild.registered`-Buchung mit Novice-Mitgliedschaft nach genau einer **20-cp-Kanongebühr** in Runner-T5; Board angezeigt T6.
- **Eine Quest abgeschlossen**: `Cull the Feral Dogs at the Tannery Rows` angenommen T7, Kampf gewonnen T12, Contract T13 abgeschlossen, Payout 25 cp und 46 Quest-XP dokumentiert. Ein zusätzlicher `Thin the Reed Flats Bog Striders`-Auftrag wurde T16 aktiv.
- **Kampfzustand beim Abbruch:** Eine kleinere Bog-Strider-Kreatur wurde an der Reed-Flats-Szene etabliert; zunächst MEDIUM, vor dem letzten Zug SHORT. **Der angefragte Heavy Slash erreicht nur ENGAGED**; die Ablehnung der Attacke ist nach den gebuchten Bändern korrekt. Kein aktueller NPC-/Dungeon-/Pay-Integritätsbefund aus Turn 22.
- Bis zum Abbruch zeigen die Events **323 gebuchte Ereignisse** und `run.json.status` **`integrity: OK`**. Das ist ein statusbasierter Nachweis, **keine** eigene vollständige Replay-/Save-Load-Prüfung.

## 5. Bewertung, Priorität und nächster Schritt

**Klassifikation:** **Umgebung/Provider-P1 für Testdurchsatz**, **kein nachgewiesener .113-Produktregressionsfehler**. Der Run liefert keine natürliche Level-15- oder E-Rang-Abnahme. Die Mage-/Rogue-Profile bleiben ungetestet, nicht negativ getestet.

**Sofortiges Vorgehen ohne Codeänderung:** Providerkontingent bzw. Proxy-Logs für **13:50:47–13:51:06Z** prüfen. Bei erneutem 429 möglichst den vorhandenen Testlauf sicher fortsetzen oder als eindeutigen **Provider-429** statt unspezifischen UI-Fehler markieren. Der zuletzt gesendete Spielerinput ist in der Engine bereits als **nicht ausgeführter** Nahkampfangriff dokumentiert; eine eventuelle Fortsetzung muss den vorhandenen Save-/Turnzustand beachten und darf nicht blind doppelt buchen.

**Optionaler eigener Runner-/Host-Auftrag nach Freigabe:** begrenzte Wiederholungsversuche mit Backoff **nur bei eindeutig transientem 429**, sofern ein sicherer Retry ohne zweite Spieleraktion/Eventbuchung nachweisbar ist; volle UI-/Server-Fehlerdetails dokumentieren. Keinen generellen silent-retry für alle HTTP-Fehler und keine unbegrenzten Aufrufe. Der Providertext suggeriert ein zeitliches Limit, beweist jedoch weder die Wiedererreichbarkeit noch, dass der gleiche Request nach einem Delay garantiert gelingt.

**Produktseitig:** keinen Patch an Geld-, NPC-, Kampf-, Dungeon- oder Prosa-Guards aus diesem Lauf ableiten. Die separate .113-Gegenfallfrage zu `ROOM_WORDS`-Großschreibung bleibt von dieser Provider-429-Ursache unabhängig.

**Abschluss:** ZIP-Review und Runindex auf `main` dokumentiert, Original-ZIP nicht committed. Keine Engine-, Runner-, Test- oder Designänderungen.