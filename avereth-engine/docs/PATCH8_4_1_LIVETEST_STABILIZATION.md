# Patch 8.4.1: Stabilisierung nach dem ersten echten Livetest (4.3.0-c.6.6.30)

Basis: Build `4.3.0-c.6.6.29`, Runner-Commit `35ead9c`. Grundlage sind der Auftrag „Patch 8.4.1 – Real-Livetest-Stabilisierung & Player Agency“, der erste automatisierte Livetest vom 22.10.2026, 05:43 (`20261022-054329Z-patch_8_4`, Windows, Featherless, GLM-5.3-Flash; Fixture `tests/v4/live_1022c.json`) und dessen Auswertung R1–R6 und E1–E4.

**Grundsatz.** Das LLM versteht und erzählt, die Engine entscheidet und bucht. Der Patch schließt zwei Lücken, durch die Erzählung zu nicht gebuchter Mechanik wurde, und macht einen Board-Titel stimmig. Unverändert bleiben:
- Kampfsystem, XP, Population, Questmechanik;
- Narrator-Ausgabelimit (4.096 Tokens), Modellparameter;
- Patch 9.

Engine und Runner sind getrennte Commits (Engine `e69f27b`, Runner danach). Teil A beschreibt die Engine, Teil B den Runner.

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

Der Runner bleibt ein Spieler: Er liest nur Chat, HUD und Hinweise, sendet Nachrichten und manipuliert keinen Zustand. Geändert sind der LLM-Spieler, die Einordnung eines Zugs, die Auswertung, der Bericht und der Leitfaden `patch_8_4`. SillyTavern-Profil, Narrator-Ausgabelimit (4.096) und Spielerlimit (3.000) bleiben, wie sie sind.

### B1. Was der Livetest zeigte

| Befund (Lauf `20261022-054329Z-patch_8_4`) | Ursache im Code (Runner `35ead9c`) |
|---|---|
| 8 der 27 Spieler-Aufrufe endeten mit `finish_reason: length` nach 3.000 Tokens, mit 10.000–12.000 Zeichen Reasoning und ohne Antwort. Der Lauf endete nach Zug 19 als Runner-Fehler („no usable decision … after 3 attempts“) | `players.mjs llmPlayer` schickte nur `player.extraBody`. Die Spiel-Requests trugen `reasoning_effort: low` und `clear_thinking: true` (Preset und `custom_include_body` des Profils), die des Spielers keines davon. Ein erschöpfter Versuch wurde wie ein ungültiger behandelt: derselbe Prompt mit einer Reparaturbitte, also derselbe aussichtslose Request |
| Die Spielernachrichten wuchsen von 98 auf fast 1.000 Zeichen Erzählung (Gedanken, Umgebung, Ergebnisse), die Notizen auf bis zu 1.000 Zeichen je Zug, der Prompt von 1,6k auf 6,9k Tokens | Der Systemprompt sagte „human test player“ ohne Regeln für Rolle und Länge. Die Notizen standen vollständig und unbegrenzt im Prompt |
| Zug 19: „I put two of the five free points into WIL …“, kein `#assign` | Der Prompt nannte keine System-Befehle (der HUD mit den freien Punkten war sichtbar) |
| Die Erzähleraufrufe 48 und 50 (Züge 17 und 18) kamen nach rund 17.000 Zeichen Reasoning leer zurück. Der Lauf spielte weiter, als wären es Story-Züge | `run_live.mjs` prüfte nach dem Senden nur UI-Probleme, nicht, was zurückkam |
| Der Hinweis „Chat umbenennen / Chat wird umbenannt…“ stand unter den Hinweisen und auf dem Bildschirm des Spielers | Das Umbenennen des Chats ist eine Aktion des Runners. Die Hinweise trugen keine Herkunft; die Oberfläche lief auf Deutsch |
| Die Beobachtung zur leeren Antwort aus Zug 17 stand im Bericht unter „Zug 18“ | Notiert wird vor dem nächsten Zug, über das Ergebnis des Zugs davor; der Bericht ordnete sie dem nächsten Zug zu |
| Der Board-Vertrag „Cull the Burial Gallery Skeletons“ nannte keine Zahl. Der Leitfaden zählte jeden Dungeon-Vertrag (`dungeon_quest_active`), der Lauf prüfte die Cull-Zahl also nie | Der Leitfaden erbte die Etappen des Grundablaufs; keine Prüfung verlangte einen Vertrag mit Zahl oder einen offenen Angriff auf eine Gruppe, die ihn nicht bemerkt hatte |
| `node_modules/` (für Playwright) stand nicht in `.gitignore` | — |

### B2. Was der Patch ändert

| Bereich | Umsetzung | Ort |
|---|---|---|
| A1/A2 Rolle und Länge | Der Systemprompt beginnt mit „You are a test player of "Avereth" … You are Alaric, the player character: never the narrator, never the game master“. Die Nachricht enthält nur, was Alaric konkret tut oder sagt, zusammengehörige Handlungen oder einen Befehl, mit den Beispielen des Auftrags. Nie darin: Gedanken, Umgebung, Ergebnisse, andere Figuren, nicht Bestätigtes, OOC. Meist ein kurzer Satz. „DECIDE QUICKLY“. Beobachtungen: höchstens zwei kurze Sätze, `""` ohne Neues | `players.mjs` `PLAYER_ROLE`, `playerSystemPrompt` |
| A2 Stile | vier Stile im Grundleitfaden: direkt und knapp, dialogorientiert, taktisch und experimentierfreudig, gelegentlich kombiniert | `guides/guild_dungeon_loop.json` |
| A2 lange Nachricht | über 600 Zeichen (Befehle ausgenommen): einmal nachgefragt („Write only what Alaric does or says now“) | `llmPlayer` (`long_message`) |
| A3 Reasoning-Felder | `player.reasoning`: `"profile"` (Standard) übernimmt `reasoning_effort` des Presets (Custom-Quelle, nicht `auto`) und die Reasoning-Felder aus `custom_include_body`, nur für denselben Endpoint und dasselbe Modell wie das Spiel. `"none"` oder ein Objekt sind möglich. Andere Felder des Include-Body und Zugangsdaten nie. Ein Probe-Request vor dem Lauf und in `--check --ping` prüft, ob der Endpoint sie annimmt; bei HTTP 400/422 spielt der Spieler ohne sie | `players.mjs` `parseIncludeBody`, `playerReasoning`; `preflight.mjs probePlayer`; `run_live.mjs` |
| A3 Reasoning-Erschöpfung | `finish_reason: length` ohne Inhalt ist `reasoning_exhausted`. Der zweite Versuch nimmt einen kurzen Prompt (zwei neueste Nachrichten, HUD, Etappe, letzte Notizen; Temperatur ≤ 0,4), der dritte einen minimalen (neueste Nachricht und HUD; ≤ 0,2). Nie derselbe Request. Nach drei Fehlschlägen endet der Lauf mit der Ursache im Grund | `llmPlayer`, `shortTurnPrompt` |
| A3 Prompt-Größe | Notizen: die letzten sechs Züge kurz, frühere nur als Etappen mit Zügen | `notesText` |
| A4 Befehle | `#assign` nach einem Level-up (mehrere Werte in einem Befehl, Ergebnis prüfen), `#bag`/`#equipment`/`#status` bei Unsicherheit, nicht vor jedem Schritt; ein Befehl ist eine eigene Nachricht; keine unbestätigten Gegenstände | `PLAYER_COMMANDS` |
| A5 HUD | Die Nachrichten ohne ihre HUD-Panels, der HUD der neuesten Antwort einmal als eigener Abschnitt. SillyTavern stellt den Klassen `custom-` voran; der Treiber sucht beide Namen (vom Stub-Selbsttest gefunden). Kein eigener Inventarspeicher | `driver.mjs view`, `players.mjs screenText` |
| B1 Zug-Ergebnis | `turnOutcome`: `story`, `system` (Befehl), `engine` (Erstellung, Rückfrage), `narrator_empty`, `missing`. Bei `narrator_empty` endet der Lauf als `narrator_empty` mit Bildschirmfoto und Grund (finish_reason, Tokens, Reasoning- und Textzeichen des Erzähleraufrufs), ohne Swipe und ohne Regenerieren; alle Daten bleiben | `evaluator.mjs`, `run_live.mjs`, `report.mjs` |
| B2 Hinweise | Jeder Hinweis trägt `origin` (`runner` während der Umbenennung und 1,5 s danach, sonst `game`). Der Spieler sieht nur die des Spiels; der Bericht listet die des Runners getrennt. Oberfläche `en-US` | `driver.mjs toastOrigin`, `newContext` |
| B3 Beobachtungen | `about_turn` in `player.jsonl`; der Bericht schreibt „zu Zug N−1 (notiert vor Zug N)“ bzw. „zum Start“ | `run_live.mjs`, `report.mjs` |
| B4 | `node_modules/` in `.gitignore` | `.gitignore` |
| B5 Auswertung | neue Auffälligkeiten zur Prüfung: `stat_words`, `dungeon_foe_refused`, `unslotted_dungeon_creature`, `cull_count`; leere Antworten (`empty_reply`) wie bisher. Der Bericht fasst wiederholte Fehlschläge des Spielers nach Ursache zusammen und zeigt die wirksamen Reasoning-Felder des Spielers (ohne Schlüssel) | `evaluator.mjs`, `report.mjs` |
| D Leitfaden `patch_8_4` | eigene Etappen: `numeric_cull_active` (Vertrag mit Zahl; ein Clear-Vertrag zählt nicht; ohne solchen das Board am nächsten Morgen erneut lesen, wenn es die Lücken füllt, die andere Abenteurer hinterlassen haben), `inside_dungeon` (optional), `open_group_attack` (offener Angriff auf ein Mitglied einer Gruppe, die ihn nicht bemerkt hat), Kampf, READY, Abgabe. Neue Prüfungen gleichen Namens im Evaluator. Keine Zustandsänderung | `guides/patch_8_4.json`, `evaluator.mjs CHECKS` |
| Stub | `[stub-empty]` in der Spielernachricht: leere Erzählerantwort mit `finish_reason: length`; je Aufruf `steer` (die Reasoning-Felder) | `stub_provider.mjs` |

### B3. Tests

**Runner-Unit-Tests** (`tests/live_runner/*.test.js`, 41, Teil von `npm test`). Neu ist `patch841_runner.test.js` mit 13 Tests:

| Test | Prüft |
|---|---|
| A1/A2 | Rolle, Beispiele, Verbote, Länge, Befehle, DECIDE QUICKLY, Beobachtungsregel, die vier Stile |
| A5 | HUD einmal als eigener Abschnitt; Notizen kurz, frühere als Etappen |
| A3 Felder | `parseIncludeBody` (flach, verschachtelt, Kommentar); `playerReasoning` übernimmt genau `reasoning_effort` und `clear_thinking` (nicht `top_k`, nicht `provider`), nichts für ein anderes Modell oder einen anderen Endpoint, nichts bei `"none"`, eine eigene Einstellung, keine Felder bei Quelle `openai` oder `auto`, kein Schlüssel |
| A3 Erschöpfung | Jeder Request trägt `reasoning_effort`, `clear_thinking`, 3.000 Tokens. Zweimal erschöpft: `full` → `short` → `minimal`, Temperatur 0,8 → 0,4 → 0,2, drei verschiedene, kürzer werdende Requests, HUD im kleinsten. Dreimal erschöpft: Stopp mit Ursache, kein vierter Request |
| A2 lang | Eine Erzählung wird einmal nachgefragt; ein langer Befehl nicht |
| B1 Livetest | `live_1022c`: Züge 1–2 `engine`, Züge 17 und 18 `narrator_empty`, sonst `story`. `live_1022b`: `#assign int 5` ist `system`, die Rückfrage des Planners `engine` |
| B1 Stub | leere Antwort auf die Marke, `steer` je Aufruf |
| B2 | Herkunft eines Hinweises in, an und nach der Spanne |
| B5 | `live_1022c`: Kreatur ohne Begegnung bei #32, Statpunkte in Worten bei #37, kein Cull mit Zahl, kein offener Gruppenangriff; ein `#assign` ist kein Befund |
| D (.28) | `live_1022b`: `numeric_cull_active` bei #13 (4), `cull_count` „4, 6“; die Gruppe blieb draußen, kein `open_group_attack` |
| D (dieser Build) | derselbe offene Flame Lance (live #19) nachgespielt: alle vier Käfer im Kampf, `open_group_attack` erreicht |
| Bericht | Ende `narrator_empty` mit Grund, wirksame Reasoning-Felder, Antwortspalte, Beobachtungen zum Zug davor, Spieler-Ursachen, Runner-Hinweise getrennt |
| Leitfaden | die Etappen `numeric_cull_active` und `open_group_attack`, keine Befehle in den Zielen |

Angepasst: `live_runner.test.js` (Leitfaden `patch_8_4` mit eigenen Etappen, Prompttexte, Notizformat) und `preflight.test.js` (die Spieler-Probe als dritte Zeile, ihre Ablehnung bei HTTP 400, keine Felder für ein anderes Modell).

**Stub-Selbsttest** (`selftest.mjs`, echte SillyTavern-1.19-Kopie, Chromium, Stub-Provider; kein Livetest): 46 Prüfungen (bisher 35), neu sind diese elf:
- `playerReasoningAsTheGame`: Die Requests des Spielers tragen `reasoning_effort: low` und `clear_thinking: true` wie die des Erzählers. `playerReasoningInReport`: Probe angenommen, der Bericht nennt die Felder. `proxyPlayerWithoutReasoning`: auf dem Proxy-Weg (Quelle `openai`) keine.
- `playerSeesTheHud`: HUD als eigener Abschnitt, nicht in den Nachrichten (vor dem Fix rot). `runnerToastsNotForThePlayer`, `observationsMapped`.
- Ein vierter Lauf (Mage, Flame Lance + Blink, `#status`, eine Nachricht mit `[stub-empty]`): `systemTurnIsNoEmptyReply`, `emptyNarratorStops` (Zug 4, `finish_reason "length"`), `emptyNarratorNoSwipe` (genau ein Erzähleraufruf in Zug 4), `emptyNarratorReported` (Ergebnis, Bildschirmfoto, Zug-Ergebnis in `run.json`), `emptyNarratorDataKept`.

### B4. Offene Risiken (Runner)

- **Modell als Spieler.** Ob GLM die Rollen- und Längenregeln einhält und die kürzeren Prompts in einer Reasoning-Schleife eine Antwort bringen, zeigt erst der echte Lauf auf deinem PC.
- **Reasoning-Felder.** `clear_thinking` und `reasoning_effort` werden übernommen, weil das Spiel sie an denselben Endpoint und dasselbe Modell sendet. Ob Featherless sie für GLM tatsächlich auswertet, zeigt nur das Reasoning-Volumen im Lauf; die Probe zeigt nur, dass der Endpoint sie nicht ablehnt.
- **Leere Erzählerantworten** bleiben bei 4.096 Tokens möglich. Der Lauf endet dann kontrolliert; die Ursache (Reasoning im Erzähler) ist nicht behoben.
- **Prompt-Cache.** Der World-Info-Block vor dem Vertrag bricht den Cache des Erzählers weiter (Befund aus der Auswertung, nicht Teil dieses Patches).
- **Cull mit Zahl.** Das Board bietet in Dungeons meist Clear-Aufträge. Findet der Spieler keinen Cull mit Zahl, liest er das Board am nächsten Morgen erneut. Neue Verträge kommen dann nur in die Lücken, die andere Abenteurer hinterlassen haben (nach Zufall); das kann Züge kosten und das Budget der Etappe (12) überschreiten.
- **Herkunft der Hinweise** hängt an der Zeit: Ein echter Hinweis des Spiels in derselben 1,5-s-Spanne wie das Umbenennen gälte als Hinweis des Runners. Die Spanne liegt vor dem ersten Zug.
- **Spielerwissen.** Der HUD wird aus dem DOM gelesen. Ändert die Engine die Klasse des HUD, sieht der Spieler ihn nicht mehr; der Selbsttest prüft das.
