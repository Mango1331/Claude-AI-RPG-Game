# Patch 8.4.3: Letzte Dungeon-Konsistenz (4.3.0-c.6.6.32)

Basis: Build `4.3.0-c.6.6.31`, Commit `4d43523`. Grundlage ist der automatisierte Living-Dungeon-Livetest vom 22.10.2026, 09:00 (`20261022-090042Z-patch_8_dungeon_full`, Glimmerdeep Grotto, GLM-5.3-Flash; Fixture `tests/v4/live_1022e.json`) mit 10/11 Pflicht-Etappen.

Der Lauf bestätigte die Dungeon-Hauptschleife: Eintritt, Population, Gruppenkampf, Boss, Level-ups, `#assign`, `dungeon.cleared` mit seinem Verdienst, READY, Abgabe. Dieser Patch korrigiert zwei Engine-Fehler und zwei Berichtsfehler. Engine und Runner sind getrennte Commits (Engine `211ee65`, Runner danach). Keine neuen Systeme; Population, XP, Belohnungen, Combat und Tokenlimits bleiben unverändert.

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

| Befund | Ursache | Änderung | Ort |
|---|---|---|---|
| Die Wächter-Etappe stand im Bericht als „mon.glimmerdeep_grotto_c1_l1_e3“, ohne Budget | Die Zusatzdaten der Etappe trugen `id` (das Monster) und überschrieben die Etappen-ID; ebenso bei `guardian_defeated` | Das Monster heißt `entityId`. Die eigenen Felder der Etappe (`id`, `check`, `required`, `goal`, `reached`) haben Vorrang vor jeder Zusatzangabe | `evaluator.mjs` |
| „nicht durchgeführt: … every group met knew of him already“ | Die Begründung behauptete mehr, als die Engine gebucht hatte: die Awareness der Käfer war gar nicht gebucht (das Zitat des Extraktors wurde abgewiesen), nicht `aware` | „no group of foes with at least two members booked as unaware was met on level 1 of …“. Gezählt wird weiter nur `unaware`; `aware` und nicht gebuchte Awareness gelten nicht als unaufmerksam | `evaluator.mjs` |

Bewertung und Abnahmekriterien bleiben, wie sie sind (der Lauf bleibt `incomplete`, 10/11).

**Tests:** `tests/live_runner/patch843_runner.test.js` (2) am Fixture `live_1022e.json`: jede Etappe unter ihrer eigenen ID, `dungeon_guardian` erreicht in Zug 27 (#53) mit `entityId` der Queen, Rolle `boss`, Ebene 1, und `guardian_defeated` ebenso; im Bericht „| dungeon_guardian | ja | ✔ | 27 | 53 | 15 |“. Die neue Begründung, keine Awareness der Käfer gebucht, der Lauf `settled`, „10/11 required reached“. Angepasst: die Begründung in `patch842_runner.test.js`. Runner-Tests: 52/52.

Ein Browsertest ist nicht nötig: Treiber und Spieleransicht sind unverändert.

## Teil D — Vorhandene Nachweise

| Fall | Nachweis |
|---|---|
| Offener Angriff auf eine unaufmerksame Gruppe | `tests/v4/patch84.test.js` „8.4 group 1 (live #19)“: der echte `.28`-Fall nachgespielt, alle vier Käfer im Kampf, eine Eröffnung, A, B, C handeln in eigenen Zügen, ein Kampf bis zum Ende. `tests/live_runner/patch842_runner.test.js`: derselbe Fall erreicht `dungeon_open_group_attack`. Ob ein Livetest diesen Fall bietet, entscheidet die Erzählung: `unaware` bucht nur der Extraktor aus ihr (`world.js`), die Engine setzt es beim Anlegen einer Begegnung nicht |
| Kostenpflichtiges Gate | `tests/v4/patch8.test.js` „patch 8 (gate)“: Gebühr verlangt, Zustimmung abgewartet, einmal gezahlt, Eintritt. `tests/v4/patch81.test.js` „8.1 gate 1–8“: Angebot, fremde Preise abgewiesen, zahlen und eintreten ohne zweiten Preis, gültiger Pass ohne neue Gebühr, Vertrag erlässt sie, Replay und Swipe zahlen einmal. **Neu:** `patch843.test.js` „gate“: draußen endet der Pass, das nächste Betreten verlangt die Gebühr wieder, eine Zahlung je Eintritt (vorher fehlte dieser Nachweis) |
| Dungeon-Reset | `tests/v4/patch8.test.js` „patch 8 (reset)“: die Ebene, auf der er steht, behält ihren Zyklus, die anderen erneuern sich; beim Verlassen erneuert sie sich; Liegengebliebenes des alten Zyklus verschwindet, seine Sachen bleiben. „patch 8 (1)“: ein ganzer Dungeon bis zum Boss, erneuert und wieder besucht. `tests/v4/patch83.test.js` „8.3 cull 4“: der Reset bucht den Zyklus, den das Board vorhersagt. `patch81.test.js` „8.1 display 2“: Erneuerung auf die Minute |

## Offene Risiken

- **Rückfallregel.** Sie greift nur bei einem bekannten Ort im Satz oder bei „back through/back out/the way I came“, dann bis zu dem Raum, aus dem er kam. „Zurück durch die Spalte in die Second Chamber“ in einem Schritt leistet nur der Planner, der die Route kennt (Regel 7). Liefert das Modell `flee`, endet der Rückzug in der Third Gallery; der nächste Zug kann weitergehen.
- **Planner-Befolgung.** Ob GLM Regel 7 befolgt, zeigt erst ein echter Lauf.
- **Unaufmerksame Gruppen** hängen an der Erzählung (siehe Teil D); live nicht erzwingbar ohne Eingriff in den Zustand.
- **Erholungszeile.** Ob der Erzähler die klarere Zeile befolgt, ist nicht geprüft.
- **Unverändert und bewusst außerhalb:** Rast neben einem Boss ohne Unterbrechung, Reasoning-Ausreißer (Zug 15 brach nach 4.096 Tokens ab), ungültige JSON-Antworten des Spielers (7 von 36, jede repariert), Balance (240 XP, zwei Level-ups durch den Boss).
