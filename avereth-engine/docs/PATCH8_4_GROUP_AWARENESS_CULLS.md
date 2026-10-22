# Patch 8.4: Gruppenreaktion und einheitliche Cull-Zahl (4.3.0-c.6.6.29)

Basis: Commit `70cbb5e` (4.3.0-c.6.6.28, Patch 8.3). Grundlage sind der Auftrag „Patch 8.4 — Group Awareness & Guild Cull Consistency“, der Livetest vom 22.10.2026, 03:42 (`tests/v4/live_1022b.json`, GLM-5.3-Flash) und das Gegenreview dazu.

**Grundsatz.** Der Patch korrigiert eine Klassifizierung und macht eine Zahl überall gleich, mit kleinstmöglichen Änderungen. Unverändert bleiben:
- das Kampfsystem, Schadensformeln, der Critical-Multiplikator, XP und Monsterwerte;
- die Dungeon-Population, Modellparameter, Tokenlimits und der Narrator-Cache.

## 1. Was der Livetest zeigte

| Nachricht | Befund | Ursache |
|---|---|---|
| #18 | Vier Glass Beetles einer Begegnung in der Crystal Gallery, laut Extractor alle `unaware` (sie fressen). Alaric hat sich nicht versteckt: `scene.concealed` ist leer | Bewusstsein aus der Geschichte, keine Stealth-Probe |
| #19–#28 | Jeder Flame Lance ist ein neuer Hinterhalt mit garantiertem Krit ×1,5 und tötet nur sein Ziel. Die anderen drei treten nie bei und bleiben `unaware`. Viermal hintereinander, Alaric verliert 0 HP | `groupJoiners` stellte unbemerkte Mitglieder auf `later`, egal ob Alaric versteckt war. Beendet die Eröffnung den Kampf, tritt `later` nie bei (`engine.js`). Nach dem Kampf werden unbemerkte Zeugen nicht `wary`. Der Narrator-Block meldete ihnen weiter „awareness: unaware“ als bindend, und der Extractor bestätigte das |
| #11 | „Cull the Crystal Beetles of the Outer Grottos (4)“ neben dem Task „Cull at least **six** crystal beetles …“ | 8.3 glich `objectives` und `desired_end_state` an, den `task` nicht |
| #13 ff. | Die Erinnerungszeile „DEFEAT 4 beetles crystal beetles in the outer galleries“ | `objectiveText` hängte `unit` und `what` beide an |
| (Review 8.3) | Ein gemischter Dungeon-Auftrag (Kills und Reparatur) hätte als Zielzustand nur den Kill-Zähler bekommen | `cullEndState` prüfte nicht, ob ein reiner Cull vorliegt |

## 2. Was der Patch ändert

| Bereich | Umsetzung | Ort |
|---|---|---|
| Wer ab Beginn kämpft | Ein noch nicht aufmerksames Mitglied der Gruppe eines angegriffenen Gegners kommt nur dann erst nach der Eröffnung (`later`), wenn Alaric wirklich versteckt ist, also `scene.concealed` ihn enthält. Sonst ist es von Beginn an im Kampf (`now`). Es ist die eine Bestimmung für alle Kampfanfänge | `group_combat.js groupJoiners` |
| Eröffnung | Das unbemerkte Ziel behält seinen Hinterhalt mit garantiertem Krit; es ist die einzige Opening Action. Die anderen handeln danach in Runde 1 nach ihrer Initiative und ihrer eigenen Kampf-KI. Stirbt das Ziel in der Eröffnung, geht der Kampf mit den übrigen weiter (`terminal`: es gibt noch aktive Gegner) | unverändert: `combat.js initEncounter`, `runCombat` |
| Bewusstsein | Wer im Kampf ist, wird `aware` (`persistCombat`) und am Ende `wary`. Ein `unaware` aus der Geschichte wird im laufenden Kampf abgewiesen (bestehende Firewall), nach dem Kampf für eine Weile ebenfalls (`wary`) | unverändert: `engine.js persistCombat`, `world.js aware` |
| Stealth | Ist Alaric versteckt und tötet die Eröffnung ihr Ziel, bleiben die anderen draußen, `unaware` und nicht `wary`. Geht der Kampf weiter, kommen sie nach der Eröffnung dazu („alerted by it“), wie in 8.1 | `groupJoiners` |
| Task eines Dungeon-Culls | Beim reinen Cull folgt die eigene Zahl der Ausschreibung der Zahl der Engine (`countText`). Gemeint ist nur eine Zahl direkt vor dem Art-Wort des Ziels („six crystal beetles“, „at least 6 beetles“, „half a dozen beetles“): „level 1“ und andere Mengen bleiben, Ziffer bleibt Ziffer, Großschreibung bleibt. Nennt der Text die Art zweimal mit Zahl, gilt das als mehrdeutig, und der Task wird der schlichte der Engine (Art, Zahl, Ort) | `guild.js countText`, `cullTask`, `bookBoard` |
| Zielzustand | Ein reiner Cull (Kills, dazu höchstens GO/FIND) behält den Satz der Engine aus 8.3. Gemischte oder schützende Aufträge (REPAIR, DELIVER …, DEFEND) behalten ihren eigenen Zielzustand mit allen Pflichten; nur die eigene Zahl der Kills folgt der Engine | `guild.js cullEndState`, `pureCull` |
| Mengenangabe | Eine Einheit, die `what` schon nennt, steht nur einmal da: „4 crystal beetles …“; mit Artikel „the sealed ledger satchel (1)“. Eine eigenständige Einheit bleibt („3 bundles moonwort“) | `guild.js amountText`, beide `objectiveText` (`guild.js`, `catalog.js`) |

Board-Karte, Board-Zeile des Narrators, HUD („0/4 defeated“), Erinnerungszeile und Abgabe lesen danach dieselbe Zahl.

## 3. Bewusste Entscheidungen

- **Stealth heißt `scene.concealed`, nicht `unaware`.** Die Unterscheidung existierte schon, `groupJoiners` hat sie nur nicht genutzt. „Noch nicht bemerkt“ ist eine Aussage der Geschichte und begründet einen Hinterhalt auf das Ziel. Sie hält aber den Rest der Gruppe nicht aus einem offenen Angriff heraus.
- **Gemeinsamer Kampf statt nur alarmieren.** Würden die anderen nur `aware`, endete der Kampf trotzdem nach der Eröffnung, und die Gruppe reagierte erst im nächsten Zug. Mit dem Beitritt von Beginn an reagiert die Gruppe sofort, aber regelkonform: Es gibt keinen Angriff in der Eröffnung und keinen zweiten Hinterhalt.
- **Keine neue Wahrnehmungsmechanik.** Laute Angriffe aus echter Deckung, Lärm und die Entdeckung des Standorts bleiben eine eigene Anforderung (§5).
- **Wer draußen bleibt, bleibt draußen.** `threat:false`, Flucht, Halten, Parley, Kapitulation und friedliche Personen sind unverändert. Ihr Bewusstsein bleibt das der Geschichte.
- **Nur die eigene Zahl.** Es gibt kein Zahlwort-Ersetzen auf ganzen Texten: Ersetzt wird nur eine eindeutige Zahl direkt vor dem Art-Wort, und nur bei einem Dungeon-Cull, dessen Zahl die Engine festlegt. Ist sie mehrdeutig, wird nicht geraten, sondern der strukturierte Task genommen.
- **Gemischte Aufträge behalten ihre Pflichten.** Die Zahl eines gemischten Auftrags legt die Engine weiterhin nicht fest (`cullNumbers` begrenzt nur Jagden). Sein Zielzustand wird deshalb nicht mehr ersetzt.

## 4. Alte Spielstände

- **Gespeicherte Kämpfe und Events bleiben, wie sie sind.** Der .28-Lauf behält seine vier Einzelkämpfe; ein Replay ergibt denselben Zustand. Die neue Regel gilt für Kämpfe, die ab diesem Build beginnen.
- **Schon gebuchte Aufträge behalten ihren Task.** Der .28-Auftrag mit „at least six“ und `qty 4` wird nicht nachträglich umgeschrieben; neu gebuchte Boards sind einheitlich.
- **Die Mengenangabe** (`amountText`) ist Darstellung und gilt sofort, auch für alte Aufträge.

## 5. Grenzen

- **Laute Angriffe aus der Deckung:** Ein Flame Lance aus echter Deckung alarmiert die Gruppe weiterhin nicht, wenn er sein Ziel tötet. Das ist die bewusste Grenze dieses Auftrags; ein Geräusch- und Entdeckungssystem ist eine eigene Anforderung.
- **Zeugen außerhalb der Gruppe:** Unbeteiligte, die nicht zur Gruppe gehören und `unaware` sind, bleiben nach einem Kampf `unaware` (Regel aus Patch 5, unverändert). Dasselbe gilt für Mitglieder, die draußen bleiben (`threat:false`, Flucht, Parley).
- **Erkennung der Zahl:** Nur eine Zahl vor dem Art-Wort mit bis zu drei Zwischenwörtern wird erkannt, also Ziffern, „one“ bis „twelve“, „half a dozen“, „a dozen“, „a pair of“, „a couple of“. Andere Schreibweisen („a handful“) bleiben stehen. Die Board-Zahl „(4)“ gilt trotzdem.
- **Gemischte Dungeon-Aufträge:** Ihre Kill-Zahl begrenzt die Engine weiterhin nicht auf die Population (wie seit 8.1).
- **Board-Retry:** Bei einem teilweise abgelehnten Board wird weiter das ganze Board neu generiert, nicht nur die fehlenden Angebote. Das bleibt eine eigene Aufgabe.
- **Code-Tests sind keine LLM-Tests.** Wie GLM einen echten Gruppenkampf erzählt, zeigt der Livetest.

## 6. Tests

`tests/v4/patch84.test.js` (9). Gegen `70cbb5e` (.28) gelaufen, mit derselben Testdatei; nur `amountText` wurde durch die alte Formatierung ersetzt:

| Test | Prüft | Auf .28 |
|---|---|---|
| group 1 (live #19) | ein Kampf aller vier von Beginn an; einziger Hinterhalt auf D; der Kampf geht nach D's Tod weiter; A, B und C handeln in Runde 1 nach der Eröffnung; alle `aware`; `unaware` aus der Geschichte wird abgewiesen; der zweite Lance ist kein Hinterhalt; genau ein `encounter.started` bis zum Ende | **rot**: Kampf nach der Eröffnung beendet |
| group 2 | Eröffnung ohne Kill: derselbe eine Kampf, alle handeln auf ihrem Zug, eine Opening Action | **rot**: A, B und C kamen erst danach, ohne eigenen Zug |
| group 3 (Stealth) | versteckt: Kill durch die Eröffnung lässt die anderen draußen, `unaware`, nicht `wary`; zäher Gegner: sie kommen nach der Eröffnung | grün (bleibt so, Absicherung) |
| group 4 | `threat:false`, Flucht und Parley bleiben draußen; friedliche Personengruppe tritt nicht bei | **rot**: A war `later` statt `now` |
| group 5 | abgewiesener Angriff (außer Reichweite): kein Kampf, keine Bewusstseinsänderung; Regenerate, Replay und Swipe ohne zweiten Kampf | grün (bleibt so, Absicherung) |
| cull 1 (live #11) | „Cull four crystal beetles … level 1, so the academy's apprentices …“; Ziel 4, Zielzustand 4, Board-Karte und Narrator-Zeile „(4)“ mit Task, HUD „0/4 defeated“, Erinnerungszeile ohne Doppelung; die anderen vier Aufträge unverändert | **rot**: „at least six“ |
| cull 2 | gemischter Auftrag (Käfer und Pumpe) behält Zielzustand, Task und Zahl; schützender Cull: Zahl 4 im Zielzustand, die Lehrlinge bleiben | **rot**: Pumpe aus dem Zielzustand verloren |
| cull 3 | Ziffer bleibt Ziffer, andere Mengen und „level 1“ bleiben, Großschreibung bleibt, „half a dozen“, keine Art-Zahl lässt den Text unverändert, mehrdeutig ergibt den Task der Engine | **rot**: Zahlen unverändert |
| text 1 | Mengenangabe einmal, auch mit Einheit im Singular; eigenständige Einheit bleibt | **rot**: „4 beetles crystal beetles“ |

Angepasst wurde ein bestehender Test: `8.1 group 5 (stealth)` setzte `scene.concealed = []` und prüfte damit einen offenen Angriff als heimlichen. Er setzt jetzt die echte Deckung (`['pc']`); der offene Fall steht in `patch84` „group 1“. Seine Erwartungen sind unverändert.

`npm test` 995/995. `smoke:st:c` (SillyTavern 1.19.0) mit 21/21 Prüfungen.

Einzelne Läufe scheitern an einer Prüfung, `noPageErrors`, mit „AbortReason/AbortError @ openai.js:4565“. Das ist das `console.error` von SillyTavern, wenn eine laufende Verbindungsprüfung (`/api/backends/chat-completions/status`) von der nächsten abgebrochen wird.

Eine Kopie des Smokes mit Phasenmarken (nicht eingecheckt) zeigt, wo das passiert: in der Phase „preset“, wenn der Smoke beim Einrichten das Chat-Completion-Preset wechselt. Das ist vor dem ersten Zug der Engine. Auf dem finalen Stand lief die markierte Kopie zweimal mit 21/21 durch; der dritte Lauf scheiterte in genau dieser Phase. Dieselbe Meldung trat schon in 8.2 auf; auf `70cbb5e` lief der Vergleich mit 21/21 durch.

Gegenmittel wäre, im Smoke nach dem Preset-Wechsel auf die Verbindungsprüfung zu warten, bevor weitergemacht wird. Das gehört in eine eigene kleine Änderung am Smoke.
