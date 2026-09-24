# Test 5, erster Lauf (24.09.2026, 13:08)

**Grundlage:** Chat-Datei (25 Nachrichten), Server-Log (10 Anfragen, 9 eigene Antworten; zu Anfrage 4 siehe Abschnitt 2) und Event-Export. Das Fixture mit den Rohantworten samt Reports liegt in `tests/testrun_v5/fixture.json`, der Replay in `tests/testrun_v5/regression.test.js`.

**Aufbau:**
- GLM-5.3-Flash, Reasoning low, Max Response Length 4.096, Streaming aus;
- Megumin nach der Checkliste geändert;
- Start vor Alderwatch;
- Warrior (Heavy Slash, Guard).

## 1. Was funktioniert hat

- **Charaktererstellung:**
  - Sie lief über System-Panels, ohne LLM-Aufruf.
  - Der Tippfehler „Heavy Shlash + Guard“ wurde sichtbar abgelehnt („Recognized: Guard“).
  - Danach war der Warrior komplett: HP 85/85, Starter Longsword, Starter Heavy Armor, ATK 6, DEF 7, MDEF 3.
- **Prompt:**
  - 11,8–13,8k Token.
  - Dossier, NPC-Bank und Tracker-Templates stehen auf 0, der Verlauf enthält keine Tracker.
  - Der Engine-Block hat im Story-Modus ≈ 1,1k Token.
- **Geschwindigkeit:**
  - Der Output liegt im Mittel bei **538 Token** (Reasoning 62, Prosa 413, Report 63), der **Median bei 32,5 s**.
  - Dauer = 2,4 s + 61,7 s je 1.000 Output-Token (≈ 16 Token/s, R² 0,96).
  - Zum Vergleich Testrun 4 (GLM, Reasoning high, Megumin mit Blöcken): 2.304 Token und 134 s.
- **Die Reports, die kamen, waren brauchbar.** Zug 4 lieferte Ort, drei NPCs, Beruf, Wissen und einen offenen Faden.

## 2. Befunde und Ursachen

| Zug | Befund | Ursache |
|---|---|---|
| 5, 6, 7, 9, 10, 12 | **Kein Fakten-Report.** Die Engine blieb am Tor bzw. in der Gilde, obwohl die Geschichte in der Gilde, auf der Tannery Row und im Keller spielte. Die Quest-Annahme in Zug 9 ging verloren. Das HUD zeigte den alten Ort und die alten Personen. | Das Modell hat den Report nicht geschrieben (alle Antworten enden mit `stop`, nichts wurde abgeschnitten). Das Reasoning erwähnt ihn nur in den Zügen, in denen er auch kam; einmal steht dort „No engine mechanics triggered“, weil der Engine-Block so beginnt. In Testrun 4 hing der Report an der `<Blocks>`-Pflicht am Antwortende (13 von 15 Antworten mit Report). Diese Pflicht hat die Megumin-Checkliste entfernt, ohne einen Ersatz für den Report vorzusehen. |
| 11 | **Report ungültig:** `…"combat":{"by":"cellar_rats"}},"check":{…}`. Eine überzählige `}` schloss das Objekt vor `check`. | Der Parser verwarf den ganzen Report. Damit waren Keller, aktive Quest, Rattenrudel und dessen Angriff verloren. |
| 12 | Die Engine fragte „which target? Brissa or the woman in fish-stained apron“. Der Erzähler hielt den Engine-Block für veraltet („stale … Ignore“) und löste den Kampf selbst. | Eine Folge der beiden Befunde darüber: Der Zustand stand noch in der Gildenhalle. |
| 8 | **„\*i give her one Silver\*“ abgelehnt** („spending coin needs the player's own decision“). | Die Zahlungserkennung kannte „pay/buy …“, aber nicht das Hergeben von Geld. |
| 8 | `guild_rank: "Novice, registered (F claimed)"` abgelehnt. | Nur der exakte Rangname galt. |
| 4 | Engine-Block: „knows: Alaric has red eyes true“. | Das Modell meldete Fakten mit `o: true`, die Anzeige hängte „true“ an. |
| 7 | Auf „Alaric 18 Warrior F Rank“ kam die Antwort von Zug 6 noch einmal (Anfrage 4 im Server-Log). Der Spieler hat neu generiert. | Die API hat eine alte Antwort zurückgegeben: dieselbe ID und derselbe Zeitstempel (11:15:57) wie die Antwort auf Anfrage 3. Die Anfrage selbst war eine andere (neue Spielernachricht, 13,6k statt 13,2k Token). Anfrage 5 war zeichengleich mit Anfrage 4 und bekam eine eigene Antwort. Das liegt beim Anbieter bzw. auf dem API-Weg, nicht in der Engine. Der Spielstand blieb unberührt, weil die neu generierte Antwort die alte ersetzt hat. **Aber:** `run_report.mjs` hatte die alte Antwort als eigene Messung gezählt. |

## 3. Änderungen

- **JSON-Reparatur** (`tolerantJson`):
  - Eine Klammer, die die Wurzel schließt, obwohl danach weitere Schlüssel folgen, wird entfernt.
  - Überzählige schließende Klammern fallen weg; am Ende offene Klammern werden geschlossen.
  - Klammern in Strings bleiben Text, ein abgebrochener String wird nicht erraten.
- **Geld hergeben ist Bezahlen:** „give/hand/put/slide/count out … silver/copper/gold/coin“. Einen Gegenstand herzugeben bleibt nur `give`.
- **Gildenrang:** Genau ein Rangname in einem längeren Wert zählt. Zwei verschiedene bleiben eine Ablehnung.
- **Fakten mit `true`** werden ohne das Wort angezeigt („Alaric has red eyes“).
- **Sichtbar für den Spieler:** Über einer Antwort ohne gültigen Report steht jetzt `NO FACT REPORT: nothing this reply established was recorded, the HUD may lag behind the story. Swipe to retry, or go on: the next report may add it.`
  - Bisher bekam nur der Erzähler einen Korrekturhinweis.
  - Der Text enthält bewusst kein `<avereth>`, denn das Streaming-Regex blendet ab diesem Tag alles aus, auch das HUD. Der Live-Test hat das gezeigt.
- **Messwerkzeug:** Eine Antwort-ID, die schon einmal vorkam, zählt `run_report.mjs` nicht mehr als Messung. Die Zeile zeigt „alte Antwort von #3“, und die Dauer geht an die neu generierte Antwort.
- **Engine-Block:**
  - Die letzte Zeile lautet jetzt `End EVERY reply with <avereth>{…}</avereth>, {} if nothing new.`
  - Der ruhige Zug heißt „No mechanic was triggered by the player's message (the fact report is still due)“.
- **Nachtrag zur Megumin-Checkliste** ([RUNTIME_V3.md §9](RUNTIME_V3.md#9-megumin-v10-shura-manuelle-änderungen), Punkt 5): Den `<Blocks>`-Abschnitt nicht nur löschen. An seine Stelle kommen zwei Zeilen mit der Report-Pflicht, dazu ein dritter Punkt im „final reminder“. Den Text zum Einfügen enthält die Checkliste.

## 4. Replay mit den Änderungen

Derselbe Lauf mit denselben Antworten (`tests/testrun_v5/regression.test.js`):

- **Zug 8:** `COIN -1 Silver → 4 Silver · registration fee`, Gildenrang Novice, Registrierungstafel.
- **Zug 11:** Keller, `QUEST ACCEPTED — Boletus Clearing (Novice · Tanner Mol)`, das Rattenrudel und `COMBAT START — cellar rats attacks Alaric` mit Initiative, Reihenfolge und Deckung.
- **Zug 12:** Der Angriff geht an die Ratten (Basic Attack 17, besiegt, +10 XP), nicht an die Schreiberin.
- **Züge 5, 6, 7, 9, 10, 12:** Über der Antwort steht `NO FACT REPORT`.

**Nicht zu retten:** Was die Antworten ohne Report erzählt haben (Gildenhalle in Zug 6, Tannery Row in Zug 10), kennt die Engine erst durch den nächsten Report. Deshalb steht jetzt der Hinweis zum Neu-Generieren über der Antwort.

## 5. Offen für den nächsten Lauf

- **Report-Treue** ist die wichtigste Beobachtung. Vor dem nächsten Lauf den Checklisten-Nachtrag in Megumin eintragen. Dann zählen: Wie viele Antworten zeigen `NO FACT REPORT`?
- Kontrollpunkt 2 aus dem Test-5-Plan (NPC nach sechs Zügen, markanter Satz) wurde in diesem Lauf nicht erreicht.
- Kommt wieder eine alte Antwort zurück: neu generieren. Passiert das öfter, liegt ein Antwort-Cache auf dem API-Weg nahe (Anbieter oder Proxy).
