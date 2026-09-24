# Erster Live-Lauf mit dem Avereth Narrator (24.09.2026, 23:23)

**Grundlage:** Chat-Datei (27 Nachrichten), Server-Log (14 Anfragen mit Antwort) und Event-Export. Das Fixture mit den Rohantworten und den drei Antworten auf die Report-Nachforderung liegt in `tests/testrun_v6/fixture.json`, der Replay in `tests/testrun_v6/live.test.js`.

**Aufbau** (nach [NARRATOR_AB.md §2.3](NARRATOR_AB.md#23-avereth-testprofil-ohne-megumin)):
- Preset „Avereth Narrator“ unverändert, Megumin Suite aus;
- GLM-5.3-Flash über Custom, Zusatzparameter `clear_thinking: true`, `reasoning_effort: low`, Streaming aus;
- Report-Nachforderung an;
- Start vor Alderwatch; Warrior (Quick Slash, Charge).

**Gespielte Stationen:** Tor mit Zoll, Weg in die Gilde, Registrierung mit Gebühr, Questbrett, Lieferquest annehmen, Weg zum Zollhaus am Salt Gate, Übergabe und Quittung, Rückkehr zur Gilde.

## 1. Was funktioniert hat

**Aufbau im Server-Log:**
- Alle 11 Story-Anfragen haben die geplante Form: Stil zuerst, Engine-Block als vorletzte, Output-Vertrag als letzte Nachricht, kein Megumin-Text.
- Die Parameter sind exakt die aus Test 5.

**Fakten-Report:**
- 8 von 11 Antworten brachten ihn im ersten Anlauf.
- Den drei übrigen holte ihn die Nachforderung, **jedes Mal mit Erfolg** (`REPORT RECOVERED`).
- Fehlende Reports gab es nur bei Übergängen: dem Weg in die Gilde, der Vorstellung an der Theke und dem Weg zum Zollhaus.

**Zustand:**
- Münzen stimmten: Zoll −1 Kupfer, Gebühr −20 Kupfer, Endstand 2 Silber 9 Kupfer.
- Die Registrierung setzte den Gildenrang Novice und gab die Novice-Plakette.
- Die Quest lief von „offered“ über „active“ zu „completed“, mit +15 Quest-XP. Satchel und Quittung erschienen im Inventar.

**Nichts, was im Offline-Vergleich bei Megumin auffiel:** keine Namen, die nur im Report stehen, keine doppelten NPCs.

**Performance:**

| | Test 5, Lauf 1 | Test 5, Lauf 2 | dieser Lauf |
|---|---:|---:|---:|
| Prompt | 11,8–13,8k | 11,9–13,2k | 6,6–8,4k, Mittel 7,8k |
| Output im Mittel | 538 Token | 476 Token | 511 Token (Reasoning 27, Prosa 348, Report 136) |
| Dauer | Median 32,5 s | Median 38,8 s | Median 29,0 s, Mittel 32,3 s |
| Nachforderung | – | – | 1,9k Prompt, 266 Output, Median 15,2 s |

## 2. Befunde und Ursachen

| Zug | Befund | Ursache | Stand |
|---|---|---|---|
| 5 | Die Karte der Gildenschreiberin sagte `believes: Alaric name Alaric Red [believes — actually FALSE]` und „does NOT know his name“. Der Erzähler sah also: Alaric hat einen falschen Namen genannt. | Die Engine verglich „Alaric Red“ exakt mit dem Namen „Alaric“. Ein anderer Wert für den Namen gilt als widersprechende Aussage. | **behoben** |
| 2 | Die Torwache lernte den Namen nicht, obwohl der Report ihn meldete (`p: "knows name of"`). | Das Prädikat war kein bekanntes Synonym für `name`. | **behoben** |
| 10 | Die Nachforderung meldete `"location": "Salt Gate customshouse, Alderwatch"`. Die Engine legte einen neuen Ort an und leerte die Szene. In den Anfragen 13 und 14 fehlte deshalb die Welt-Lore von Alderwatch. | Nur der ganze Name wurde als Ort gesucht. | **behoben** |
| 14 | Der Erzähler meldete `"location": "Alderwatch, Valedorn Crown"`, also genau die Form, in der der Engine-Block den Ort schreibt. Die Engine legte ein zweites Alderwatch an. | Wie oben: Die Engine erkannte ihre eigene Schreibweise nicht. | **behoben** |
| 14 | „turn in the signature slip“ wurde abgelehnt: PLAYER OWNERSHIP. Die Quittung blieb im Inventar. | „turn in“ fehlte in der Liste der Übergabe-Wörter. | **behoben** |
| 14 | Die Schreiberin sagte, die Registrierung sei nicht abgeschlossen und die Gebühr stehe noch aus. Die Questbelohnung (4 Silber) blieb deshalb aus. | Die Nachforderung in Zug 5 legte einen Thread an: „Alaric's registration: … fee of two silver due“ (deadline). Die Antwort in Zug 7 schloss die Registrierung ab, schloss den Thread aber nicht. Er stand weiter als „Open thread“ im Engine-Block, die Registrierung selbst lag schon außerhalb des Verlaufsfensters. Der Erzähler folgte dem Thread statt dem Rang „Guild Novice“ in Alarics Zeile. | **behoben an der Quelle** (Abschnitt 4) |
| 8, 14 | Das Questbrett nannte für die Lieferquest 5 Silber, die Schreiberin bei der Abgabe 4. | Die Engine speicherte keine Belohnung. Das Schema kannte sie nicht, und ein gemeldetes `reward` wurde verworfen (Night Watch: „25 silver from owner via Guild“). Die 5 Silber standen nur in der Prosa des Bretts, und die lag bei der Abgabe längst außerhalb des Verlaufsfensters. | **behoben** |
| 12 | Der Satchel blieb nach der Übergabe im Inventar. | Der Report meldete die Übergabe nicht. Der Spieler hatte nur „Ring once and then wait“ geschrieben; die Übergabe erzählte der Erzähler selbst („He waits until Alaric has done it“). | offen, beobachten |
| 1–14 | Die Erzählung stand im Präsens, obwohl der Stil „past tense“ verlangt. | Die Begrüßung der Karte steht im Präsens; das erste Beispiel im Kontext setzt sich durch. Das war nach dem Offline-Vergleich erwartet. | offen, beobachten |
| 8 | Das Questbrett erzeugte sieben angebotene Quests auf einmal. | Richtig nach Schema, füllt aber die Questliste. | offen, beobachten |

## 3. Änderungen

- **Namen:** Ein Name mit hinzugefügtem Familiennamen ist derselbe Name (`sameValue`, nur für `name`). Wer „Alaric Red“ hört, kennt Alarics Namen. Neue Synonyme für `name`: `has_name`, `name_is`, `full_name`, `gave_name_as`, `knows_name`, `knows_name_of`.
- **Orte:** Die Engine liest jeden Teil einer Ortsangabe mit Komma.
  - Ein Reichsname ist nie ein Ort.
  - Der erste bekannte Ort gilt. Was davor steht, wird zum Platz, wenn der Report keinen eigenen `place` hat.
  - Ein wirklich neuer Ort heißt ohne Reichszusatz.
- **Übergabe:** „turn in …“, „turn … in“ und „submit“ zählen als Übergabe. „turn in for the night“ zählt nicht.
- **Quest-Belohnung:**
  - Das Schema hat ein optionales `reward` („what it pays, as posted“).
  - Die Engine hält die Belohnung fest, sobald sie zum ersten Mal gemeldet wird; wie Level und Typ lässt sie sich danach nicht mehr ändern.
  - Engine-Block und HUD zeigen sie bei der Quest.
- **Nachforderung ohne Threads:** Die Antwort auf die Nachforderung wird ohne `threads` angewandt. Sie hält fest, was die Antwort festgelegt hat. Ein offener Erzählfaden ist Sache des Erzählers.

**Tests:**
- `tests/testrun_v6/live.test.js` spielt den Lauf mit den echten Antworten nach, einschließlich der drei Nachforderungen.
- Dazu kommt ein Unit-Test: Die Belohnung bleibt so, wie sie zuerst gemeldet wurde.
- Alle Fehler-Tests schlagen mit dem alten Code fehl.

**Stand:** 221 Tests grün, Browser-Smoke und Live-Smoke (Default 18/18, Avereth Narrator 21/21) grün.

## 4. Threads: an der Quelle behoben, der Rest wird beobachtet

**Das Problem:** Ein Thread bleibt offen, bis ein Report ihn mit genau demselben Text als `resolved` meldet. Das hat in diesem Lauf keiner getan. Der schädliche Thread stammte aus der Nachforderung: Sie machte aus den offenen Fragen der Schreiberin eine Frist.

**Entscheidung:** Die Nachforderung legt keine Threads mehr an (Abschnitt 3).

**Verworfen: eine Altersgrenze für Threads im Prompt.** Sie hätte diesen Fall ebenfalls verhindert. Sie würde aber auch echte Schulden, Versprechen und Drohungen nach ein paar Zügen aus dem Engine-Block nehmen, und genau die soll ein Thread über das Verlaufsfenster hinaus tragen.

**Beobachten:**
- Der Erzähler selbst legte in diesem Lauf einen Thread an („protection contract: next of kin form awaits a name“). Offline waren es 0 in 12 Reports.
- Schadet ein veralteter Thread aus seiner eigenen Hand, wird das Thema wieder aufgemacht.

## 5. Abgleich mit dem zweiten ChatGPT-Review

**Übereinstimmend:**
- Narrator und Nachforderung bestehen.
- Kein Grund für Megumin und keine weiteren Report-Erinnerungen im Prompt.
- „turn in“ ist ein Fehler der Autorisierung, kein Verstoß des Erzählers.
- Doppeltes Alderwatch, Namens-Claim und veralteter Registrierungs-Thread sind Fehler auf der Seite des Zustands.
- Die Ownership-Regeln nicht weiter verschärfen.

**Von ChatGPT gefunden, von mir unterschätzt:** Die Belohnung war nirgends gespeichert. Ich hatte die 4 Silber nur als Folge des Threads gelesen.

**Anders gesehen:**
- **Namen:** „Alaric Red“ fest in die Inhalte zu schreiben, ist nicht nötig. Der Name kommt aus der Persona des Spielers, und die Engine behandelt „Alaric Red“ jetzt als Alarics Namen. Ein Familienname, der erst im Spiel entsteht wie in Test 5 Lauf 2, funktioniert so ebenfalls.
- **Satchel:** Keine Korrektur ohne neue Regel. Der Report meldete die Übergabe gar nicht. Hätte er es getan, hätte die Engine sie abgelehnt, weil der Spieler nur klingelte und wartete. Eine Übergabe, die sich aus einer angenommenen Lieferquest „ergibt“, bräuchte eine Verknüpfung von Quest und Gegenstand, die es nicht gibt. Nächster Lauf: die Übergabe ausdrücklich spielen.
- **Orte:** ChatGPT nennt nur das zweite Duplikat (Rückweg). Schwerer wog das erste aus der Nachforderung in Zug 10 („Salt Gate customshouse, Alderwatch“): Danach fehlte die Alderwatch-Lore.
- **Präsens:** Die Begrüßung liegt in der Karte des Spielers, nicht im Repo. Sie wird angepasst, wenn die Karte ohnehin geändert wird.

## 6. Nächster Lauf

Frischer Chat. In dieser Reihenfolge:
1. Registrierung;
2. eine Quest mit genannter Belohnung annehmen;
3. einen Gegenstand ausdrücklich übergeben;
4. die Quest mit „turn in“ abgeben;
5. an denselben Ort zu denselben NPCs zurückkehren;
6. danach Kampf und Checks.

**Prüfen:**
- Die Belohnung bleibt gleich, im HUD und im Gespräch.
- Übergebene Gegenstände verschwinden aus dem Inventar.
- Queststatus und XP passen zusammen.
- Es gibt kein zweites Alderwatch.
- Nach einer Registrierung verlangt niemand die Gebühr erneut.
- Bekannte NPCs bleiben dieselben.
- Die Nachforderung bringt ihre Reports weiter.

## 7. Was du nach einem Update beachten musst

Der aktuelle Chat enthält schon die zwei falschen Orte und den falschen Namens-Claim. Die Events sind aufgezeichnet und bleiben. Für den nächsten Lauf einen neuen Chat beginnen.
