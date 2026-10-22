# Patch 8.4.3: Letzte Dungeon-Konsistenz (4.3.0-c.6.6.32)

Basis: Build `4.3.0-c.6.6.31`, Commit `4d43523`. Grundlage ist der automatisierte Living-Dungeon-Livetest vom 22.10.2026, 09:00 (`20261022-090042Z-patch_8_dungeon_full`, Glimmerdeep Grotto, GLM-5.3-Flash; Fixture `tests/v4/live_1022e.json`) mit 10/11 Pflicht-Etappen.

Der Lauf bestätigte die Dungeon-Hauptschleife: Eintritt, Population, Gruppenkampf, Boss, Level-ups, `#assign`, `dungeon.cleared` mit seinem Verdienst, READY, Abgabe. Dieser Patch korrigiert zwei Engine-Fehler und zwei Berichtsfehler. Keine neuen Systeme; Population, XP, Belohnungen, Combat und Tokenlimits bleiben unverändert.

## Teil A — Engine

| Befund | Ursache (im Code bestätigt) | Änderung | Ort |
|---|---|---|---|
| Mit Alaric im Dungeon kamen Wren Company (2) und Ashen Hands (4) herein: 7 von 6 (#36) | Der Eintritt simulierter Gruppen prüfte `occupancy().parties + Größe`, ohne seinen Platz | Die Prüfung nimmt `occupancy().total`, seinen Platz eingeschlossen. Wer keinen Platz hat, bekommt kein `dungeon.party enter`. Anwesende bleiben; Gate, Reset und bestehende Gruppen sind unverändert | `v4/living.js partyEvents` |
| Zug 20: „I back away … slip back through the cleft, away from the queen“ wurde `flee` ohne Kampf. Die Engine buchte nichts („NOTHING TO BOOK“), der Erzähler führte ihn in die Second Chamber, die Ankunft wurde abgewiesen (`no_go`); er rastete sechs Stunden in der Queen's Crystal Bowl | Planner-Regel 7: „getting away from danger is flee“, ohne Unterschied zwischen Kampf und Nicht-Kampf; `flee` außerhalb eines Kampfes ist dort Erzählung (`mapPlan`) | **Regel 7:** im Kampf `flee`; außerhalb eines Kampfes ist ein Rückzug an einen anderen Ort (zurück, durch einen bekannten Weg, in einen Raum) `go`, `flee` nur ohne genannten Ort; dazu ein Beispiel. **Rückfall** `retreatGo`, wenn das Modell trotzdem `flee` liefert: ein bekannter Ort, den der Satz nennt, oder bei „back through/back out/the way I came“ der Raum, aus dem er kam. Es gilt der gewöhnliche `go`-Pfad mit Weg-, Hindernis- und Gefahrenprüfung. „back away from her“ (nur zurückweichen), „back to …“ mit unbekanntem Ort und ein Satz ohne Ziel bekommen keinen Ort | `v4/planner.js` |
| Nach zwei Stunden Rast (MP 8→29 gebucht) erzählte der Erzähler, das Mana bleibe leer | Befolgungsfehler des Modells; die Zeile „Recovery booked: …“ stand im Prompt | Die Zeile sagt zusätzlich „tell what came back as it came back, never that it did not“ (optional laut Auftrag, eine Textzeile) | `v4/commands.js` |

**Tests:** `tests/v4/patch843.test.js` (9). **Auf .31: 5 rot, 4 grün** (drei Absicherungen unveränderten Verhaltens, eine neue Absicherung des Gates).

| Test | Prüft | .31 |
|---|---|---|
| capacity 1 | Live-Zustand vor #36, Uhr wie live: Wren kommt herein, Ashen Hands nicht; 3/6, HUD „inside: 3/6“ | rot (7/6) |
| capacity 2 | sein Platz einmal gezählt: draußen passen beide (6/6); drinnen passt eine Fünfergruppe neben ihm (6/6) | grün (Absicherung) |
| retreat 0 | Regel 7 und das Beispiel im Planner-Prompt | rot |
| retreat 1 | die Originalnachricht, wie der Planner sie jetzt liest (`go` Second Chamber): GOES, die Ankunft dort wird angenommen, Engine und Erzählung stimmen überein, auch im Replay | grün (der `go`-Pfad selbst war richtig) |
| retreat 2 | die Originalnachricht als `flee` wie live: `go` in die Third Gallery (der Raum, aus dem er kam), angenommen, im Replay gleich | rot |
| retreat 3 | dieselbe Nachricht im Kampf mit der Queen: `flee` des Kampfes, kein `go`, keine Bewegung | grün (Absicherung) |
| retreat 4 | ohne Ziel, „back to the Fourth Grotto“, „I flee“, „I back away from her slowly“: kein Ort; die erzählte Ankunft wird abgewiesen. „back to the Second Chamber“: dorthin | rot |
| retreat 5 | der Weg zurück durch ein Hindernis gesperrt: der Dungeon weist das `go` ab, er bleibt | rot |
| gate | kostenpflichtiges Gate ohne Vertrag: Gebühr gezahlt, Pass gilt drinnen; draußen endet er, das nächste Betreten verlangt die Gebühr wieder; eine Zahlung je Eintritt | grün (neue Absicherung, Teil D) |

## Teil B — Runner

Siehe den Runner-Commit; Abschnitt folgt.

## Teil D — Vorhandene Nachweise

Siehe den Runner-Commit; Abschnitt folgt.
