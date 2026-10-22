# Patch 8.4.1: Stabilisierung nach dem ersten echten Livetest (4.3.0-c.6.6.30)

Basis: Build `4.3.0-c.6.6.29`, Runner-Commit `35ead9c`. Grundlage sind der Auftrag „Patch 8.4.1 – Real-Livetest-Stabilisierung & Player Agency“, der erste automatisierte Livetest vom 22.10.2026, 05:43 (`20261022-054329Z-patch_8_4`, Windows, Featherless, GLM-5.3-Flash; Fixture `tests/v4/live_1022c.json`) und dessen Auswertung R1–R6 und E1–E4.

**Grundsatz.** Das LLM versteht und erzählt, die Engine entscheidet und bucht. Der Patch schließt zwei Lücken, durch die Erzählung zu nicht gebuchter Mechanik wurde, und macht einen Board-Titel stimmig. Unverändert bleiben:
- Kampfsystem, XP, Population, Questmechanik;
- Narrator-Ausgabelimit (4.096 Tokens), Modellparameter;
- Patch 9.

Engine und Runner sind getrennte Commits. Teil A beschreibt die Engine, Teil B den Runner.

---

## Teil A — Engine

### A1. Was der Livetest zeigte

| Zug (Nachricht) | Befund | Ursache im Code |
|---|---|---|
| 19 (#37) | „I put two of the five free points into WIL, two into INT, and the last one into VIT“. Der Planner las das als `other`. Der Erzähler beschrieb verteilte Punkte („the mana behind his breastbone sat deeper“). Gebucht wurde nichts, 5 freie Punkte blieben | `v4/commands.js otherStep`: „DOES — …: his own action; **tell it as it happens**. It books nothing: no HP, MP, STA, coin or possessions …“. Werte, Statpunkte und Skills fehlten in der Ausschlussliste, `#assign` wurde nirgends genannt |
| 19 (Level-up, #35) | Das Panel zeigte „LEVEL UP → Level 2 (+5 free Stat Points)“, aber nicht, wie man sie verteilt | `display.js` (beide Level-up-Zeilen) |
| 16 (#31/#32) | Eine Suche auf Ebene 1 der Old Crown Catacombs: SUCCESS. Die Engine hatte den „skeletal gravekeeper“ als nächste Begegnung bereit. Der Erzähler erfand einen „robed waiting thing“ (Ghul), den der Extraktor als `creature.new` buchte. Der Kampf (Züge 17/18) gab 13 XP und Level 2 | Widerspruch im Engine-Block: `v4/commands.js` Suche „SUCCESS — reveal a concrete discovery, **encounter** or actionable lead“ gegen die Ebenenzeile „Only the engine adds this level's foes“. Danach `v4/world.js newEntity`: Eine Kreatur, die keinen Slot füllt, wurde im Living Dungeon trotzdem angelegt |
| Board (#9) | „Cull the Burial Gallery Skeletons“: ein Clear-Vertrag für Ebene 1 ohne Zahl, mit Cull-Titel | Die Regel aus 8.3 („eins von beiden, nie beides“) galt für Ziele und Endzustand, nicht für den Titel |

### A2. Was der Patch ändert

| Bereich | Umsetzung | Ort |
|---|---|---|
| Statpunkte in Worten | `spendsStatPoints` erkennt Worte, die freie Punkte ausgeben: ein Ausgabe-Verb (put, assign, spend, invest, allocate …) mit „free/stat/attribute points“ oder „points into“, oder eine Zahl „into“ einen Wert (WIL, Intelligence …). Eine solche `other`-Handlung ist **refused**. Der Erzähler bekommt „NOT DONE — …: his Free Stat Points are spent only by the System command #assign, never by words; nothing is assigned … Tell no change in him from it“. Der Spieler sieht „ACTION NOT POSSIBLE — …: Stat Points are spent only with the command #assign <STAT> <n>, e.g. #assign WIL 2 INT 2 VIT 1; Free Stat Points: 5“. Folgeschritte derselben Nachricht laufen weiter | `commands.js spendsStatPoints`, `assignHint`; `v4/commands.js otherStep` |
| Im Kampf | Dieselbe Erkennung: Die Notiz NOT TAKEN nennt `#assign` statt „not resolved by the engine“ | `v4/planner.js mapPlan` |
| Allgemeine Handlung | Die DOES-Zeile schließt nun auch „stats or Stat Points, Skills“ aus | `v4/commands.js otherStep` |
| Level-up-Panel | „LEVEL UP → Level 2 (+5 free Stat Points) · spend them with #assign <STAT> <n>, e.g. #assign INT 3 WIL 2“ (Ereignis- und Kampfende-Zeile) | `display.js` |
| Suche im Living Dungeon | SUCCESS verlangt dort einen Fund oder eine Spur (ein Ding, eine verborgene Markierung, Spuren oder ein Geräusch, die weiter in die Ebene führen) und ausdrücklich keinen Gegner: „the foes of this level come only as the engine adds them“. Außerhalb von Living Dungeons bleibt der Text wie bisher | `v4/commands.js` (Suche) |
| Gegner ohne Engine-Autorität | Im Inneren eines Living Dungeons, der schon vor der Antwort bestand, wird ein `creature.new`, das keine Begegnung der Engine füllt, abgewiesen (`delta.rejected`, Regel `dungeon_foe`). Es entsteht kein Wesen, also auch kein Kampf, keine XP, keine Beute und kein Fortschritt. Der nächste Erzählerblock bekommt eine Korrektur: „The … of the last reply is no foe here: in … only the engine adds foes … nothing of it acts, attacks or can be fought.“ | `v4/world.js newEntity` |
| Board-Titel | Ein Dungeon-Auftrag, der eine Ebene nennt und bei dem kein DEFEAT/ATTACK-Ziel eine Zahl hat, ist ein Clear-Vertrag. Beginnt sein Titel mit „Cull“ oder „Thin“, wird das Verb zu „Clear“ („Clear the Burial Gallery Skeletons“). Der Generator bekommt dazu die Regel für Titel. `BOARD_VERSION` ist nun `board-4.8` | `v4/guild.js parseBoard`, `clearanceListing`, Board-Prompt |

**Was erlaubt bleibt:**
- Die Begegnungen der Engine: angekündigt per DUNGEON AHEAD, gefüllt über Ref oder Art.
- Wesen, die die Geschichte ausdrücklich als keinen Gegner zeigt (`threat: false`: eine Ratte, Fledermäuse).
- Alle Kreaturen außerhalb von Living Dungeons, auch am Tor (Ebene 0).
- Personen, etwa andere Abenteurergruppen im Dungeon.
- Ein älterer Kampagnenstand, dessen Dungeon erst durch genau diese Antwort zum Living Dungeon wird (Patch 8 (7)). Dessen Erzähler kannte die Dungeon-Regeln für diesen Zug noch nicht.
- Erzählerische Kreativität: Schatten, Knochenhaufen, Geräusche und Spuren bleiben Erzählung; sie werden nur nicht zu Mechanik.

### A3. Tests

`tests/v4/patch841.test.js` (11 Tests) am Fixture `live_1022c.json`. **Auf .29: 8 rot, 3 Absicherungen grün.**

| Test | Prüft | .29 |
|---|---|---|
| stats 1 | Zug 19 nachgespielt: NOT DONE mit Hinweis, Gang zur Spalte bleibt, Spieler-Panel mit `#assign`, Werte und 5 Punkte unverändert | rot („tell it as it happens“) |
| stats 2 | `#assign WIL 2 INT 2 VIT 1` nach dem Level-up: VIT 6, INT 9, WIL 9, 0 frei | grün (Absicherung) |
| stats 3 | Im Kampf: Notiz mit `#assign` | rot („not resolved by the engine“) |
| stats 4 | Zug 18 nachgespielt: das Level-up-Panel nennt `#assign` | rot |
| stats 5 | Erkennung: positive und negative Beispiele („I put my staff into the crack“, „two per side“, „I will put the torch …“) | rot (keine Erkennung) |
| stats 6 | Gewöhnliche Handlung: DOES mit erweitertem Ausschluss | rot |
| dungeon 1 | Zug 16 nachgespielt: die Suche verlangt keinen Gegner, Würfel wie live (d100 25) | rot („encounter“) |
| dungeon 2 | Antwort #32 mit den aufgezeichneten Deltas: Ghul abgewiesen, kein Wesen, Korrektur gesetzt, Durchgang und Spur gebucht; der Flame Lance des nächsten Zugs öffnet keinen Kampf, gibt keine XP | rot (Ghul gebucht) |
| dungeon 3 | Die Begegnung der Engine (skeletal gravekeeper) kommt weiter; eine Ratte ohne Gefahr bleibt | grün (Absicherung) |
| dungeon 4 | Ein Wolf auf dem Weg (kein Dungeon) bleibt | grün (Absicherung) |
| board | Das Live-Board: der Clear-Vertrag heißt „Clear …“, ein Cull mit Zahl behält „Cull“, die anderen Titel bleiben, Prompt-Regel, `board-4.8` | rot |

**Angepasste Tests:**
- `display.test.js` und `planner_c6.test.js`: die neuen Zeilentexte.
- `patch71.test.js` (Knäuel) und `patch72_identity.test.js` (zwei Gruppen, Neuankömmling): Ihre Gruppen bringt die Geschichte in die Glimmerdeep-Grotte eines alten Laufs (.17). Der Test macht die Grotte vorher zur gewöhnlichen Höhle (`dungeon.real: false`). Die geprüfte Identitäts- und Knäuel-Logik ist ortsunabhängig. In einem Living Dungeon bringt jetzt nur die Engine Gegner.

### A4. Offene Risiken (Engine)

- **Feindselige Personen.** Die Geschichte kann im Dungeon weiterhin eine feindselige Person erfinden (einen Kultisten). Die Regel gilt für Kreaturen. Personen bleiben erlaubt, weil Abenteurergruppen im Dungeon legitim sind.
- **Umbenannte Begegnung.** Beschreibt der Erzähler die Begegnung der Engine mit einer anderen Art (anderer Anchor) und ohne die Ref, wird sie jetzt abgewiesen, statt als freie Kreatur zu entstehen. Die Begegnung der Engine bleibt dann für den nächsten Gang offen. Der Extraktor bekommt die Ref der Begegnung im Katalog (ENGINE ENCOUNTER).
- **Erkennung der Statpunkte.** Sie arbeitet mit Wörtern. Ungewöhnliche Formulierungen („I level up my mind“) erkennt sie nicht; dafür gilt dann die allgemeine DOES-Zeile, die Werte ausschließt.
- **Erzähler als Modell.** Ob GLM die NOT-DONE-Zeile und die Korrektur befolgt, zeigt erst der nächste echte Lauf.

---

## Teil B — Runner

Siehe den Runner-Commit; Abschnitt folgt.
