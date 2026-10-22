# Patch 8.3: Dungeon-Etagen, erreichbare Culls und Quest-Kontext (4.3.0-c.6.6.28)

Basis: Commit `ef4a819` (4.3.0-c.6.6.27, Patch 8.2). Grundlage sind der Auftrag „Patch 8.3 — Dungeon Floor Identity, Reachable Cull Quests & Quest Context“, der Livetest vom 22.10.2026, 02:00 (`tests/v4/live_1022a.json`, GLM-5.3-Flash) und das unabhängige Gegenreview dazu.

**Grundsatz.** Der Patch korrigiert, mit kleinstmöglichen Änderungen, eine Etagen-Definition, eine Zählregel und zwei Kontexttexte. Unverändert bleiben:
- Dungeon-Architektur, Questmodell, Population, Monster und Balancing;
- Modellparameter, das Planner-Limit, der Extractor-Prompt und die Extractor-Sperre.

## 1. Was der Livetest zeigte

| Nachricht | Befund | Ursache |
|---|---|---|
| #16 | Die Treppe vom Gate führt in „Old Crown Catacombs, level 1“, gespeichert mit `level: 2` | `dungeon.js levelVia` zählte den Dungeon-Root als Ebene 1, ein Abstieg ergab 2. `living.js floorAt` definiert denselben Root als Gate = Ebene 0 |
| #16 (Folge) | Hinter dem Treppenhindernis käme „SEALED — … until the guardian of level 1 falls“. Ebene 1 hat aber keinen Raum: eine Sackgasse | `sealRefusal` prüft den Zielraum als Ebene 2, und Ebene 1 der Catacombs ist versiegelt |
| #11 | „Skeletons in the Burial Galleries (3)“. Zyklus 1 von Ebene 1 hält 2 risen bones, 2 restless skeletons und den Gallery Warden | Die Begrenzung aus 8.1 zählte den Mindestwert jeder Gruppe, deren *mögliche* Arten die verlangte enthielten (2 + 1). Die Zählung zählt die *gezogene* Art: Zählbar sind nur 2 |
| #11 | Zielzustand „Level 1 … is cleared of restless skeletons“ bei einem Cull mit Zahl 3 | Der Generator mischte Cull und Clear. Die Engine korrigierte nur die Zahl, nicht den Text |
| – | Ein Dungeon-Cull zählte Kills im ganzen Realm der Gilde | `guild.js areaOf` nutzte `q.dungeon`/`q.floor` nur für Clears |
| #14 | „the wardens confirm the work, the Guild pays it“ | `context.js`: „paid by the Guild …; **locals confirm**, never pay“ |
| #14 → #16 | Die Warnung der Angestellten wurde zum Hindernis auf der einzigen Treppe vom Gate | QUEST PLAY verlangt bei jedem verfolgten Auftrag „at least one … complication“, auch dort, wo der Dungeon selbst schon die Komplikation ist |
| #18 | Die Prosa führt Alaric die heilen Stufen hinab bis an den Einsturz | Die BLOCKED-Zeile sagte nur „He stays where he is“ |

## 2. Was der Patch ändert

| Bereich | Umsetzung | Ort |
|---|---|---|
| Etagen-Identität | Vom Root eines **echten** Dungeons (`dungeon.real`), seinem Gate, führt jeder Weg auf Ebene 1: abwärts, seitlich oder aufwärts. Von Ebene n bleibt es wie bisher: abwärts n + 1, aufwärts n − 1, seitlich n. Gebäude und Höhlen, die nur Raum für Raum erkundet werden (`rooms`, kein echter Dungeon), zählen ihren eigenen Ort weiter als Ebene 1 | `dungeon.js levelVia` |
| Population zur Spielzeit | `runNow` liefert die Begegnungen, die der Dungeon zur aktuellen Weltzeit hält, so wie sie gezogen wurden. Das ist der Zyklus, den ein fälliger Reset beim Ankommen bucht (`cycleEvents`). Ist der Dungeon noch nicht etabliert, ist es der erste Zyklus, so wie die Etablierung ihn festlegt. Dieselben deterministischen Ziehungen (`runFor`), kein zweiter Zustand, nichts wird emittiert | `living.js runNow` |
| Erreichbare Zahl | `cullPopulation` zählt die gezogenen Gruppen mit ihrer Art und Anzahl, nicht mehr den Mindestwert der Spezifikation | `living.js cullPopulation` |
| Eine Zählregel | `cullKind` ist die einzige Regel dafür, ob ein Wesen für ein `DEFEAT`-Ziel zählt. Sie gilt für die Zahl des Boards (`dungeonCull`) und für die gezählten Kills (`defeatTally`): gewöhnliche Gegner nach ihrer Art (`namesKind`, Worte und `unit`, Gleichsetzungen aus dem Content, Junge nur wenn genannt); Wächter oder Boss nur, wenn das Ziel ihn beim Namen nennt | `guild.js cullKind` |
| Räumliche Grenze | Ein Cull mit `q.dungeon` zählt nur in diesem Dungeon und, mit `q.floor`, nur auf dieser Ebene. Bei Begegnungswesen gilt die Ebene ihres Slots, bei anderen der Ort der Begegnung. Das Gate ist keine Ebene. Jagden außerhalb von Dungeons zählen weiter im Land der Gildenfiliale | `guild.js areaOf` |
| Cull oder Clear | Ein Cull mit Zahl in einem Living Dungeon bekommt einen Zielzustand aus seiner Zahl: „2 restless skeletons of level 1 of Old Crown Catacombs defeated or driven off (a cull: done at that count, whatever else is left on the level)“. Eine erlaubte Vertreibung bleibt erhalten (`drivesOff`). Der Zweck steht weiter im `task`. Clears (ohne Zahl, `quest.clear`) behalten ihren Text und werden nicht mehr von der Cull-Prüfung abgewiesen. Der Generator wird angewiesen: „One listing is one of the two, never both“ | `guild.js cullEndState`, `noCullWhy`, `boardRequest` (`board-4.7`) |
| Auszahlungszeile | „paid by the Guild when turned in at a front desk, never by its client or other locals“ | `context.js retrievalItems` |
| QUEST PLAY | Bei einem Auftrag in einem Living Dungeon: Der Dungeon selbst ist die Komplikation (Gegner, gefährliche Teile, Wächter, Siegel, von der Engine platziert). Vor dem Dungeon oder auf dem Weg hinein soll keine weitere Hürde erfunden werden. Eine Gefahr, die der Ort von sich aus plausibel hat (eine Falle, eine beschädigte Treppe), bleibt möglich | `context.js dungeonWork` |
| BLOCKED | „He may come up to it and see it, but he does not get past or over it and makes no attempt on it: he stays on this side, where he is; …“ | `commands.js barred` |

Board, HUD und Abgabe lesen danach dieselbe Zieldefinition: Ein Cull zeigt „(2)“ und „0/2 defeated“ und zählt bei der Abgabe. Ein Clear zeigt „— Clear Old Crown Catacombs, level 1“ und wird über den Ebenenzustand abgegeben (`goalText`, `contractReady`).

## 3. Bewusste Entscheidungen

- **Das Gate ist Ebene 0, überall.** `floorAt` war schon die Definition, also wurde `levelVia` daran angepasst. Den Default nur auf 0 zu setzen hätte auch seitliche Zugänge zu Ebene 0 gemacht. Stattdessen gilt jeder Weg vom Gate in den Dungeon als Ebene 1.
- **Nur echte Dungeons.** Häuser, Keller und erkundete Höhlen ohne `dungeon.real` behalten ihre bisherige Zählung (Test „floor 4“).
- **Die gezogene Population statt des Mindestwerts.** Der Mindestwert aus 8.1 sollte eine Zahl liefern, die jeder Zyklus hält. Er zählte aber Arten, die der Zyklus gar nicht gezogen hatte. Die gezogene Population ist genau die, die Alaric antrifft. Ein Reset zwischen Board und Besuch kann eine andere bringen (siehe §5).
- **Keine pauschale Gleichsetzung.** „Risen bones“ sind keine „restless skeletons“. Beide sind Skelette, aber verschiedene Arten. Wer beide meint, schreibt „skeletons“.
- **Wächter und Boss nur beim Namen, jetzt in Zahl und Zählung gleich.** In 8.1 verlangte die Zählung zusätzlich, dass die Art zu den Worten passt („the Gallery Warden“ ist kein „armoured skeleton“), und zählte ihn deshalb nie. Die Begrenzung zählte ihn dagegen.
- **Kein Umdeuten.** Ein Cull mit Zahl bleibt ein Cull, ein Clear ohne Zahl bleibt ein Clear. Neu geschrieben wird nur der widersprüchliche Zielzustand eines Dungeon-Culls, und zwar aus seinen eigenen strukturierten Feldern.
- **Kein Narrator-Firewall-Ausbau.** Die BLOCKED- und QUEST-PLAY-Texte sind Präzisierungen. Ob GLM ihnen folgt, zeigt erst der Livetest.

## 4. Alte Spielstände und der .27-Lauf

**Gespeicherte Events bleiben, wie sie sind.** Das Eventlog ist die Wahrheit. Der Raum aus #16 des .27-Laufs behält sein `place.created … level: 2`; es gibt keine Korrektur beim Falten. Test „floor 1“ belegt, dass derselbe Spielstand weiter das falsche Level und die Siegel-Sackgasse zeigt.

**Den .27-Spielstand reparieren:**
- Die Nachrichten 17–20 löschen und #16 neu generieren. Erst dann ist #16 die letzte Nachricht, und SillyTavern erlaubt Swipe oder Regenerate.
- Die neue Antwort wird mit diesem Build extrahiert. Zeigt sie wieder eine Treppe vom Gate hinab, liegt der Raum auf Ebene 1 (Test „floor 1“ mit derselben Antwort).
- Ein Swipe *zurück* auf die alte Antwort bringt deren alten Record mit Ebene 2 zurück.

**Der angenommene Auftrag bleibt bei 3.** Angenommene Aufträge werden nicht rückwirkend geändert. Zyklus 1 hält aber nur 2 zählbare restless skeletons; der dritte wäre erst nach einem Reset erreichbar (3 Tage Spielzeit). Für den geplanten Livetest vom Gate bis zum Level-1-Clear ist deshalb eine **neue Kampagne** der saubere Weg.

**Die strengere Zählgrenze gilt auch für alte Spielstände.** Kills außerhalb des Dungeons beziehungsweise der Ebene eines Dungeon-Culls zählen nicht mehr; bisher zählten sie über den Realm. Ein namentlich gemeinter Wächter zählt jetzt.

## 5. Grenzen

- **Reset zwischen Board und Besuch:** Der neue Zyklus kann weniger von der Art halten. Kills zählen zyklusübergreifend, der Auftrag bleibt also erfüllbar, gegebenenfalls über einen zweiten Zyklus. Dasselbe gilt, wenn andere Gruppen die Ebene in diesem Zyklus räumen.
- **Textänderungen sind nur auf Code-Ebene getestet.** Das betrifft BLOCKED, QUEST PLAY, die Auszahlungszeile und die Generator-Regel. Ob das Modell die Texte befolgt, zeigt der Livetest.
- **Der SillyTavern-C-Smoke** prüft den Host-Pfad (Planner, Kampf, Swipe, Schlüssel), keinen Dungeon. Der Dungeon-Pfad ist mit Node-Tests über den Produktpfad V4-C abgesichert.
- **Nicht in diesem Patch:** das Experiment zum Narrator-Cache (Lorebook-Reihenfolge) und der Planner- oder Extractor-Benchmark.

## 6. Tests

`tests/v4/patch83.test.js` (11). Alle 11 sind auf `ef4a819` rot, mit derselben Testdatei; nur `runNow` wurde durch die alte Lesart ersetzt:

| Test | Prüft | Auf `ef4a819` |
|---|---|---|
| floor 1 (live #16) | dieselbe Antwort ergibt Ebene 1, kein Siegel, Spanne der Ebene 1; gespeicherter .27-Stand bleibt Ebene 2; Replay gleich, erneuter Empfang ändert nichts | Ebene 2 statt 1 |
| floor 2 (Old Crown gespielt) | Gate → Treppe → Ebene 1 mit Begegnung der Ebene 1; Siegel zur Ebene 2 hält bis zum Clear (Credit pc); zurück zum Gate und wieder hinein; dann Ebene 2 | vom Siegel am Gate zurückgewiesen |
| floor 3 (Glimmerdeep seitlich) | seitlicher Zugang ergibt Ebene 1 und Begegnung der Ebene 1; vom Gate abwärts, seitlich und aufwärts ergibt 1; von Ebene 1 abwärts 2 | Gate abwärts = 2 |
| floor 4 | Gebäude ohne `dungeon.real` unverändert; Ebene n ± 1 | Gate abwärts = 2 |
| cull 1 (live #11) | Board fragt 2 statt 3; Zielzustand nennt 2, kein „cleared“; Wölfe und Bog Striders unverändert; Vorhersage gleich dem bei Ankunft etablierten Zyklus; angenommener Auftrag bleibt 3 | 3 statt 2 |
| cull 2 | alle Gegner der Ebene 1 tot ergibt 2/2; Wächter beim Namen: gefragt 1, gezählt 1 | Zahl 3 gegen 2 zählbare |
| cull 3 | Kills in der Stadt, am Gate und auf Ebene 2 zählen nicht; eigener Kill auf Ebene 1 zählt; Wölfe: Valedorn zählt, Caelreth nicht | 3 fremde Kills gezählt |
| cull 4 | nach einem fälligen, noch nicht gebuchten Reset die Ziehung von Zyklus 2, gleich dem `dungeon.reset` | gespeicherter Zyklus |
| clear 1 | Clear: `quest.clear`, eigener Text, „Clear … level 1“, `not_cleared`. Cull: „(2)“, „0/2 defeated“. Generator-Regel | Clear abgewiesen (`noCullWhy`) |
| context 1 | keine „locals confirm“; Dungeon-Satz in QUEST PLAY nur bei Dungeon-Auftrag | alte Zeile |
| blocked 1 (live #17) | neue BLOCKED-Zeile; bleibt am Gate; Regenerate ändert den Zug nicht | alte Zeile |

Angepasst wurden zwei Tests:
- `review_4_1_3`: Die Board-Version ist nicht mehr fest `board-4.6`, da der Generator-Prompt geändert wurde (`board-4.7`).
- `testrun_v11/live`: die neue Auszahlungszeile.

`npm test` 986/986. `smoke:st:c` 21/21 (SillyTavern 1.19.0).
