# Test 5, zweiter Lauf (24.09.2026, 18:27)

**Grundlage:** Chat-Datei (17 Nachrichten), Server-Log (6 Anfragen mit Antwort) und Event-Export. Das Fixture mit den Rohantworten samt Reports liegt in `tests/testrun_v5/fixture_run2.json`, der Replay in `tests/testrun_v5/run2.test.js`.

**Aufbau:**
- GLM-5.3-Flash, Reasoning low, Max Response Length 4.096, Streaming aus;
- Megumin nach der Checkliste, **mit dem Nachtrag** aus dem ersten Lauf: Report-Pflicht am Antwortende und als dritter Punkt im `## final reminder:`;
- Engine auf dem Stand von `611039c`: Der Engine-Block endet mit `End EVERY reply with <avereth>{…}</avereth>, {} if nothing new.`;
- Start vor Tidecross; Warrior (Guard, Power Strike).

Laut Server-Log standen beide Änderungen in allen sechs Anfragen.

## 1. Was funktioniert hat

- **Charaktererstellung:** Sie lief über System-Panels. Danach: HP 85/85, Starter Longsword, Starter Heavy Armor, ATK 6, DEF 7, MDEF 3.
- **Prompt:** 11,9–13,2k Token. Dossier, NPC-Bank, Templates und Tracker stehen auf 0.
- **Die zwei Reports, die kamen, waren brauchbar:**
  - Zug 3: das Tor mit zwei Wachen und dem Zoll;
  - Zug 8: die Registrierung mit Gebühr, Rang, Marke und dem Assessor.
- **Zahlung:** „pay the one Silver“ galt als Entscheidung des Spielers (`COIN -1 Silver → 4 Silver · registration fee`).
- **Hinweis:** Über den Zügen 4–7 stand `NO FACT REPORT`.

## 2. Befunde und Ursachen

| Zug | Befund | Ursache |
|---|---|---|
| 4, 5, 6, 7 | **Kein Fakten-Report**, trotz Nachtrag und neuer letzter Zeile. Verloren gingen: der Zoll (1 Copper), Alarics Name bei der Wache, der Weg in die Stadt und in die Gildenhalle, die Frau am Tresen und das Zimmer des Assessors. Das HUD stand bis Zug 7 an der Torschlange. | Das Modell hat den Report nicht geschrieben. Alle Antworten enden mit `stop`. Das Reasoning (35–101 Token) plant die Szene. In drei der vier Züge erwähnt es den Report gar nicht. In Zug 4 plant es „Report coin -1cp.“, und die Antwort lässt ihn trotzdem weg. |
| 8 | **Der Gildenrang ging an einen Fremden:** `{"s":"Alaric Red","p":"guild_rank","o":"Novice"}` wurde als Fakt über „Alaric Red“ gespeichert. Das HUD blieb bei „Guild Rank — (not registered)“. | Der Spieler hatte „Red“ als Familiennamen eintragen lassen. Die Namensauflösung findet „Hesta Gault“ für Hesta, schloss Alaric aber von dieser Regel aus. |
| 3 | Ein Fakt hing an `lean_guard` statt an der Wache „Lean Guard“ (Ref `guard_lean`). Im nächsten Engine-Block stand „lean_guard noticed pc's longsword“. | Ein Name in Id-Schreibweise wurde nicht erkannt. |
| 4 | „Name is Alaric“ zählte nicht als Vorstellung. | Erkannt wurden nur „my name is“ und „name's“. Hier blieb es ohne Folge: Zwei Wachen hörten zu, keine war angesprochen, also erfährt es keine. |

**Die Erklärung aus dem ersten Lauf stimmt nicht.**
- Dort hatte ich den fehlenden Report der entfernten `<Blocks>`-Pflicht zugeschrieben. Mit dem Nachtrag stand die Pflicht wieder im Prompt, sogar doppelt, und die Quote blieb gleich: 2 von 6 (Lauf 1: 3 von 9).
- Der Unterschied zu Testrun 4 liegt im Reasoning:

| | Reasoning | Antworten mit Report | Reasoning plant den Report |
|---|---|---:|---:|
| Testrun 4 | high | 12 von 15 | 11 von 15 |
| Test 5, Lauf 1 | low | 3 von 9 | 1 von 9 |
| Test 5, Lauf 2 | low | 2 von 6 | 1 von 6 |

- Zwei Prompt-Varianten haben nichts bewirkt. Mit Reasoning low schreibt GLM die Szene und hört danach auf.
- Die Zahl „13 von 15“ im ersten Bericht war um eins zu hoch. Nachgezählt im Server-Log sind es 12 von 15.
- Auch Megumins `<history>`-Hülle ist nicht die Ursache. Der Engine-Block steht dort vor `</history>` und der Zeile „never stop or refuse“, aber Testrun 4 hatte dieselbe Hülle.

## 3. Performance

| | Lauf 1 (13:08) | Lauf 2 (18:27) |
|---|---:|---:|
| Prompt | 11,8–13,8k | 11,9–13,2k |
| Output im Mittel | 538 Token (Reasoning 62, Prosa 413, Report 63) | 476 Token (Reasoning 68, Prosa 353, Report 54) |
| Dauer, Median | 32,5 s | 38,8 s |
| Ausgabe | ≈ 16 Token/s | 10–16 Token/s |

- Der Anbieter war diesmal langsamer und schwankte: 605 Token brauchten 58,8 s (10 Token/s), 682 Token nur 43,7 s (16 Token/s).
- Im Prompt gibt es keinen vermeidbaren Fehler.

## 4. Änderungen

### Report-Nachforderung

**Kern:** Hat eine Antwort keinen gültigen Report, stellt die Engine im Hintergrund eine eigene, kurze Anfrage an dasselbe Modell (SillyTavern `generateRaw`). Die Einstellung heißt „Ask for a missing fact report separately“ und ist standardmäßig an.

**Inhalt der Anfrage:**
- der Engine-Block, den der Erzähler für diesen Zug hatte, ohne Lore;
- die Spielernachricht;
- die Antwort, wie der Spieler sie sieht;
- der Auftrag, nur `<avereth>{…}</avereth>` zu schreiben.

**Die Antwort zählt, als hätte der Erzähler sie geschrieben:**
- Es gelten dieselben Regeln und dieselben Würfel. Ein Test prüft, dass Events und Zustand identisch sind.
- Auch die Prüfungen bleiben. Im Live-Test lehnte die Engine einen nachgeforderten Ortswechsel ab, den der Spieler nicht erklärt hatte („look around the market“).

**Anzeige über der Antwort:**
- zuerst `NO FACT REPORT: asking for it separately, the HUD follows in a moment.`;
- danach `REPORT RECOVERED: … (12.3 s)`;
- bringt auch die Nachforderung nichts: `NO FACT REPORT, and the separate request brought none …`;
- kommt sie erst, nachdem die nächste Nachricht ihre Minute gewartet hat und aufgelöst ist: `NO FACT REPORT, and the separate request came too late …`. Die Fakten der früheren Antwort bleiben dann, wie sie waren.

**Warten:**
- Die nächste Spielernachricht wartet auf die Nachforderung, höchstens 60 s.
- Zwischen Antwort und nächster Nachricht lagen im zweiten Lauf 36–87 s, im ersten 66–199 s (ohne die zwei langen Pausen). Die Nachforderung braucht ≈ 15–25 s und ist also meist fertig, bevor der Spieler schreibt.

**Keine Nachforderung:**
- wenn ein Report da ist;
- bei `#system`-Antworten;
- in der Charaktererstellung;
- für einen alten Text: Nach einem Swipe, einer Bearbeitung oder Continue wird die Antwort auf den alten Text verworfen. Der neue Text bekommt seine eigene Nachforderung;
- wenn schon ein späterer Zug aufgelöst ist.

**Nach einem Reload:** Eine laufende Nachforderung wird fortgesetzt.

**Kosten je Nachforderung:**
- Prompt ≈ 1,4–1,6k Token, gemessen an den Zügen 4–7 dieses Laufs.
- Output: Ein Report mit Inhalt hatte in beiden Läufen 157–225 Token, dazu kommt das Reasoning. Zusammen also ≈ 200–350 Token, bei 16 Token/s ≈ 15–25 s.
- Ein leerer Report `{}` ist deutlich schneller.

**Event-Log:** `report.requested`, mit Erfolg, ursprünglichem Fehler und Dauer.

### Weitere Änderungen

- **Alarics voller Name:** „Alaric Red“ findet Alaric. Sein Name bleibt der des Spielers. Trägt ein anwesender NPC denselben Vornamen, findet der volle Name niemanden.
- **Namen in Id-Schreibweise:** „lean_guard“ findet „Lean Guard“, auch im selben Report.
- **„Name is Alaric“** zählt als Vorstellung.
- **Messwerkzeug:**
  - Nachforderungen stehen als `[Report]`-Zeilen in beiden Tabellen und haben eine eigene Mittelwertzeile.
  - Ihre Dauer kommt aus dem Record der Antwort im Chat.
- **Megumin-Nachtrag:** Er bleibt. Er kostet ≈ 60 Token und schadet nicht, reicht aber allein nicht.

## 5. Replay

**Ohne Nachforderung, wie im Lauf:**
- Zug 8 gibt Alaric den Rang Novice; das HUD zeigt ihn, der Assessor kennt ihn.
- Der Fakt aus Zug 3 hängt an der Lean Guard.

**Mit Antworten auf die Nachforderung:** Die Antworten habe ich selbst geschrieben, denn der Lauf hatte die Funktion noch nicht. Ob GLM sie gut beantwortet, zeigt erst der nächste Lauf.

| Zug | Antwort auf die Nachforderung | Ergebnis |
|---|---|---|
| 4 | Zoll und Name | 49 Copper, Berold kennt den Namen, `REPORT RECOVERED` |
| 5 | Text ohne Report | Der Hinweis bleibt: „the separate request brought none“ |
| 6 | JSON im Codeblock | Gildenhalle; die Wachen bleiben zurück, die Frau am Tresen ist da |
| 7 | Ortswechsel und Assessor | Zimmer des Assessors |
| 8 | (Report des Erzählers) | 39 Copper (Zoll und Gebühr), Rang Novice |

## 6. Offen

- **Nachforderung mit GLM (Reasoning low):** Wie oft kommt ein brauchbarer Report, und wie lange dauert es? `run_report.mjs` zeigt beides.
- **Reasoning „medium“:** Damit käme der Report vermutlich öfter im ersten Anlauf, aber jede Antwort würde länger dauern. Erst messen, falls die Nachforderung nicht reicht.
- **Kontrollpunkte:** Kontrollpunkt 1 und 2 aus dem Test-5-Plan wurden noch nicht erreicht.
