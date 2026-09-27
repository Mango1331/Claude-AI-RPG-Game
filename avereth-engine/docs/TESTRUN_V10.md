# Live-Lauf 27.09.2026, 02:30: Stadt ohne Ort, Quest-Rang als Zahl, „the creature“

**Grundlage:**
- Chat-Datei (27 Nachrichten);
- Event-Export;
- Anfrage-Log mit 14 Anfragen: 11 an den Erzähler, 3 Report-Nachforderungen;
- Auswertung von ChatGPT.

Das Fixture liegt in `tests/testrun_v10/fixture.json`: die Begrüßung mit ihren Events, die Spielernachrichten, die Erzähler-Antworten mit ihren Reports und die drei Antworten auf die Nachforderungen. Der Replay steht in `tests/testrun_v10/live.test.js`. Auf 3.1.2 spielt er den Lauf byte-gleich nach: alle Events, Panels und HUDs.

**Aufbau:** Build 3.1.2. Das belegt `build` in jedem Record. GLM-5.3-Flash mit dem Preset Avereth Narrator, Lore aus World Info, Wortersatz `ledger=register`. Gespielt wurde ein Warrior mit Heavy Slash und Charge.

**Stationen:**
- Redmarch (Veyrhold): von der Straße vor der Stadt in die Stadt und die Gilde;
- Registrierung (1 Silber);
- Novice-Brett;
- Quest „Rats — Cellar of the Blue Ox Tavern“ (4 Silber und eine warme Mahlzeit);
- Keller des Blue Ox mit Kampf gegen den Cellar Gnawer;
- Gang hinter der Mauer, Nest mit Jungtieren.

Der Lauf wurde nach Nachricht 26 abgebrochen.

## 1. Was der Lauf bestätigt

- **Build:** 3.1.2 lief, sichtbar bei jeder Nachricht im Export.
- **Kampf gegen einen Einzelgegner, vollständig:**
  - Der Cellar Gnawer beißt für 1 Schaden (Alaric 84/85).
  - Alarics Basic Attack kostet 5 STA und macht 18 Schaden. Der Gnawer stirbt, Alaric bekommt 10 XP, der Kampf endet sauber.
- **Registrierung:** Die Gebühr (1 Silber an Marta), das Novice-Abzeichen und `guild_rank Novice` stimmen.
- **Anwesenheit:** Beim Weg in den Keller bleiben Wache, Marta, Corvan und der Clerk zurück. Bren und der Wirt kommen neu hinzu.
- **Nachforderung:** Drei Antworten ohne Report bekamen ihn per Nachforderung (4,5 s, 12,3 s, 16,8 s).

**Nicht geprüft:** Die Gruppen-Individualisierung aus 3.1.2 kam nicht vor. Der Erzähler brachte einen einzelnen, terriergroßen Gegner.

## 2. Befunde

| Nachricht | Report oder Eingabe | Folge (3.1.2) |
|---|---|---|
| 6 | `"location":"Redmarch, Veyrhold"`, kein `place`; Wache, Marta und Corvan neu | Der Ort bleibt „public roadside verge outside Redmarch“, bis Nachricht 14 den Keller meldet. Das betrifft den Engine-Block bei Registrierung und Brett und die Erinnerungen („first saw {pc} at public roadside verge outside Redmarch“). |
| 12 | vier Quests mit `"rank":1` | Alle vier werden abgelehnt (`quest rank "1" is not a Guild Quest Rank`). Einen Report gab es, deshalb keine Nachforderung. |
| 14 | Rats-Quest mit `"status":"active"`, `"rank":"Novice"` | Die Quest entsteht neu, gleich als aktiv, ohne offered. Die drei anderen Angebote fehlen im Zustand. |
| 17 | „*i lower my sword and dash forward with a Basic Attack at the creature*“ | `which target? Bren or Blue Ox or Cellar Gnawer`, nichts gewürfelt. Der Erzähler folgt der Engine und lässt den Gnawer hinter das Fass ausweichen, obwohl er im Reasoning schreibt: „only the Gnawer is a creature; Bren and barkeep are people. Alaric obviously means the creature“. |
| 24 | `new`: Jungtiere mit `"species":"Cellar Gnawer"` (abgelehnt: kein Körperbau-Anker); `facts` über „Cellar Gnawer pups“ | Ein Fakt über `mon.cellar_gnawer_pups`, eine Kreatur, die es nicht gibt. |

**Ursachen:**
- **Ort:** Der Report nannte die Stadt als erreicht (`location`: „known city/region reached“).
  - Die Engine wertet dieselbe Stadt nicht als Reise (so gewollt seit Testrun 4) und zählte nur `place`, und der fehlte.
  - Der Startplatz „vor der Stadt“ gehört im Zustand schon zu Redmarch, deshalb blieb er stehen.
  - In allen 11 Anfrage-Logs der bisherigen Läufe kam `location` nur bei einem Ortswechsel vor. Nur hier fehlte `place`.
- **Quest-Rang:** Das Schema nennt die Ränge mit ihren Level-Bändern („Novice 1-14“). Eine Zahl ist kein Rangname, und die Engine verwarf die ganze Quest statt nur des Felds.
- **Ziel:** „the creature“ ist kein Name, keine Beschreibung und kein Alias einer Art. Ohne Treffer galten alle Anwesenden als Kandidaten.
- **Jungtiere:** Die Engine meldete den Namen einer neuen Kreatur an, bevor sie prüfte, ob sie die Kreatur anlegen kann. Der Fakt fand danach diesen Namen.

## 3. Änderungen (3.1.3)

**Die Stadt erreicht (`delta.js`):**
- Nennt ein Report als erreichte Stadt die, in der Alaric schon ist, aber keinen Ort darin, und hat deine Nachricht ihn gehen lassen (walk, go, enter …), ist sein Ort jetzt die Stadt.
- Wer am alten Platz war und vom Report nicht platziert wird, bleibt zurück.
- Ohne deine Entscheidung ändert eine genannte Stadt nichts, wie bisher.
- Ein Ort, der nur der Stadtname ist, kennt keinen Platz. Nennt ein späterer Report einen Ort in der Stadt, gilt:
  - ohne Bewegung ist es der Platz, an dem Alaric schon ist;
  - nach einer Bewegung ist es ein neuer Platz, und wer bei ihm war, kommt nicht mit.
  - Sonst wären Marta und der Clerk in den Keller „mitgekommen“, weil „Blue Ox Tavern cellar (Redmarch, Copperlane)“ den Stadtnamen enthält.

Im Lauf steht von Nachricht 7 bis 13 im Engine-Block:

```
Day 1, 09:40 (morning) | Redmarch, Veyrhold — Redmarch | mode: story
```

Marta und die Wache erinnern sich an „first saw {pc} at Redmarch“. Den Namen der Gilde kennt die Engine nicht, denn der Report hat ihn nicht gemeldet.

**Quest-Rang als Zahl (`delta.js`):**
- Die Engine nimmt den Rang, in dessen Level-Band die Quest liegt (Level 1: Novice).
- Die Quest bleibt erhalten, und `accepted` sagt es: `quest Rats — Cellar of the Blue Ox Tavern: offered (rank 1: Novice, by its level)`.
- Ein anderer falscher Rang („Copper“) wird wie bisher abgelehnt.
- Im Lauf stehen alle vier Quests als offered am Brett. Bei Nachricht 14 wird die Rats-Quest active, mit dem Verlauf offered → active und der Belohnung wie ausgehängt.

**„the creature“ (`intent.js`):**
- Ein Wort für jede Kreatur („creature“, „beast“, „animal“, „monster“) meint die Kreaturen unter den Zielen, nie die Menschen daneben.
- Eine Kreatur: Sie ist das Ziel. Mehrere: Du wählst zwischen ihnen.
- Ein Name, eine Beschreibung oder ein Label geht vor. Vor und im Kampf gilt dasselbe.
- Im Lauf beginnt der Kampf bei Nachricht 17. Die Würfe sind dieselben wie im Kampf des Laufs bei Nachricht 19: 1 Schaden, 18 Schaden, tot, 10 XP.

**Abgelehnte Kreaturen benennen nichts (`delta.js`):**
- Ein Name wird erst angemeldet, wenn die Kreatur angelegt ist.
- Der Fakt „Cellar Gnawer pups … right-hand passage“ bleibt freier Text, wie „Blue Ox cellar“.

**Integritätsprüfung (`validate.js`):**
- Ein Fakt über eine Entity-ID (`npc.…`, `mon.…`, `loc.…`), die es nicht gibt, ist ein Integritätsproblem.
- Die Statuszeile des Engine-Panels zeigt es („integrity: 1 problem(s)“), und die Tests prüfen es nach jedem Schritt.
- Von den 11 aufgezeichneten Läufen hat nur dieser einen solchen Fakt (`f.t12.m24.2`).

## 4. Nicht geändert

- **Bren kommt näher (Nachricht 26):** Alaric sagte „stay here“, Bren stimmte zu. Später geht Bren bis MEDIUM heran und erklärt die Jungtiere.
  - Die Engine übernimmt die Bewegung eines NPC aus dem Report, denn NPCs dürfen sich bewegen.
  - Ob Bren einen Grund dafür hat, ist eine Frage des Erzählers (Vertrag: CAUSALITY BEFORE CONVENIENCE), keine Mechanik.
- **Die Jungtiere als Kreatur:** „Cellar Gnawer“ als `species` ist der Name einer Kreatur, keine Art mit Körperbau-Anker. Die Ablehnung bleibt. Faustgroße, blinde Nestlinge als ein Kämpfer mit dem Profil einer Riesenratte wären falsch.
- **„gnawer_nest“ als Kreatur:** Ein Nest ist keine Kreatur. Die Ablehnung stimmt.
- **Freier Text als Subjekt:** „cellar gnawer (adult)“ im `learn` von Nachricht 26 bleibt freier Text.
- **`{"combat":{"by":"pc"}}` (Nachricht 18)** wird abgelehnt: Alarics Angriffe kommen aus deiner Nachricht, nicht aus dem Report. Die Begründung „unknown person“ ist ungenau, hat aber keine Folge.
- **Nachforderungen:** Die drei Nachforderungen greifen. Die Wartezeit (bis 16,8 s) bleibt.
- **Gruppen:** Die Gruppen-Individualisierung (3.1.2) ist live noch ungeprüft. Im nächsten Lauf lohnt ein Angriff auf eine Gruppe, die als Kulisse im Raum steht (etwa „*I attack the rats*“).

## 5. Tests

**`tests/testrun_v10/live.test.js`** (4 Tests, Replay des Laufs):
- Nachricht 6: Der Ort ist Redmarch. Der Kopf des Engine-Blocks bei 7, 9, 11 und 13 und die Erinnerung „first saw {pc} at Redmarch“ stimmen. Bei 14 bleiben die Leute der Gilde zurück.
- Nachricht 12: vier Quests offered, Novice. Bei 14 wird die Rats-Quest active, offered → active, mit der Belohnung.
- Nachricht 17: Der Kampf beginnt. Das Panel ist dasselbe wie im Lauf bei Nachricht 19.
- Nachricht 24: Der Fakt über „Cellar Gnawer pups“ bleibt Text, es gibt keine Entity `mon.cellar_gnawer_pups`, und die Integritätsprüfung erkennt so einen Fakt.

Ab Nachricht 17 verläuft der Replay anders als der Lauf: Der Kampf kommt zwei Züge früher, und die späteren Antworten waren für den Verlauf des Laufs geschrieben.

**`tests/unit/intent.test.js`:**
- „the creature“, „the beast“, „the animal“, „the monster“ zwischen zwei Menschen und einer Kreatur: die Kreatur.
- Mit zwei Kreaturen wählst du zwischen beiden.
- Im Kampf gegen einen Mann und einen Wolf ist „the beast“ der Wolf.

**`tests/unit/report.test.js`:**
- Die Stadt erreicht, mit und ohne deine Entscheidung.
- Ein Ort, der nur die Stadt ist: ein Platz ohne Bewegung, dann einer nach einer Bewegung.
- Der Rang als Zahl.
- Eine abgelehnte Kreatur benennt nichts.

**Gegenproben:**
- Alle 9 neuen Tests scheitern auf 3.1.2.
- Die übrigen 263 Tests schreiben auf 3.1.3 dieselben Records wie auf 3.1.2 (aufgezeichnet und verglichen).
- Die Läufe vom 26.09. 23:09 und 27.09. 01:19 spielen auf 3.1.3 wie auf 3.1.2.

**Version:** 3.1.3.
