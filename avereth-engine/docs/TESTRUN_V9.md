# Live-Lauf 27.09.2026, 01:19: Ratten als Kulisse, die später angreifen

**Grundlage:**
- Chat-Datei (23 Nachrichten);
- Event-Export;
- Anfrage-Log mit 9 Anfragen: 8 an den Erzähler, 1 Report-Nachforderung.

Das Fixture liegt in `tests/testrun_v9/fixture.json`: die Begrüßung mit ihren Events, die Spielernachrichten, die Erzähler-Antworten mit ihren Reports und die Antwort auf die Nachforderung. Der Replay steht in `tests/testrun_v9/live.test.js`. Auf 3.1.1 spielt er den Lauf byte-gleich nach: alle Events, Panels und HUDs.

**Aufbau:** Build 3.1.1. Das belegen `#audit` als erste Nachricht („Engine 3.1.1“) und `build` in jedem Record. GLM-5.3-Flash mit dem Preset Avereth Narrator, Lore aus World Info, Wortersatz `ledger=register`. Gespielt wurde ein Warrior mit Heavy Slash und Charge.

**Stationen:**
- Alderwatch, Gilde;
- Registrierung (1 Silber);
- Novice-Brett;
- Quest „Granary Vermin Control“ (8 Silber);
- Getreidespeicher, erster Keller.

Der Lauf wurde beim ersten Kampfbeginn angehalten, vor Alarics erstem Zug.

## 1. Was der Lauf bestätigt

- **Build:** 3.1.1 lief, sichtbar in `#audit` und bei jeder Nachricht im Export.
- **Kampfbeginn:** Die Züge vor Alarics erstem Zug kommen gleich mit der Antwort. Eine Ratte weicht auf MEDIUM zurück, die andere beißt für 1 Schaden, Alaric steht bei 84/85.
- **„Alaric Red“ ist Alaric:** `{s:"Alaric Red", p:"guild_rank", o:"Novice"}` ergibt `pc guild_rank Novice`.
- **Registrierung und Quest:** Die Gebühr von 1 Silber, die Quest-Belohnung „8 silver, cellarmaster's mark as proof“ und der Wechsel offered → active stimmen.
- **Anwesenheit:** Clerk und die Männer in Kettenhemd bleiben in der Gilde, der Cellarmaster bleibt oben.
- **Nachforderung:** Eine Antwort ohne Report bekam ihn per Nachforderung (7,6 s).

## 2. Befund: Ratten-Gruppen als Einzelgegner

| Nachricht | Report | Folge (3.1.1) |
|---|---|---|
| 18 | `new: {"ref":"rats1","kind":"creature","name":"cellar rats","species":"rat","desc":["numerous rats nesting under the sack rows", …]}`, ohne `combat` | eine Kreatur „cellar rats“ als Kulisse |
| 20 | `new: rat1 "cellar rats"` (vorhanden) und `rat2 "cellar rats (dark)"` | „known mon.cellar_rats“ und eine zweite Kreatur „cellar rats (dark)“ |
| 22 | `combat: {"by":["cellar rats","cellar rats (dark)"]}`; die Geschichte: „A dozen at least now in the lantern's reach … the count still climbing“ | zwei Kämpfer „Cellar Rats“ und „Cellar Rats (dark)“ mit dem Profil einer einzelnen Ratte (16 HP, eine Initiative, eine Aktion) |

**Ursache:** Die Angreifer-Nachforderung (af539ee) erkannte eine Gruppe nur, wenn derselbe Report sie per `new` einführt und angreifen lässt. Eine Gruppe, die vorher als Kulisse hereinkam, galt beim Angriff als bekannter Einzelgegner. „cellar rats (dark)“ fiel zusätzlich durch die Regel „letztes Wort“, denn das letzte Wort war „(dark)“.

**Derselbe Fehler auf dem zweiten Weg:** Hätte Alaric zuerst angegriffen („*I Heavy Slash the cellar rats*“), hätte die Engine einen Kampf gegen die Gruppe als eine Ratte mit 16 HP begonnen. Nachgeprüft: Das Ziel war die Gruppen-Kreatur.

## 3. Änderungen (3.1.2)

**Gruppe als Kulisse greift an (`delta.js`):**
- Eine vorhandene Kreatur, deren Bezeichnung eine Gruppe nennt (letztes Wort ein Sammelwort oder der Plural einer Art, wie bisher), wird beim Angriff wie ein Rudel aus demselben Report behandelt.
- Sie wird kein Kämpfer, sondern über die bestehende Angreifer-Nachforderung einzeln angefordert.
- Ein Zusatz in Klammern zählt nicht zur Bezeichnung: „cellar rats (dark)“ ist eine Gruppe.
- Eine Kreatur, die schon kämpft, bleibt, was sie ist.

**Die Nachforderung (`host.js`):**
- Die Anfrage sagt es ausdrücklich: „"cellar rats" (a group the game state lists as one creature: its animals are the attackers, each a "new" entry)“. Sonst läge es nahe, die im Zustand gelistete Gruppe wieder zu nennen.
- Mit der Antwort treten die Tiere an die Stelle der Gruppe: Die Gruppen-Kreatur verlässt die Szene (`leave`). Die HUD zeigt dann nur noch Cellar Rat A, B, C, und „the cellar rats“ ist kein Ziel mehr, das als eine Ratte in den Kampf käme.
- Bringt die Anfrage nichts oder wieder nur die Gruppe, beginnt kein Kampf. Die Gruppe bleibt Kulisse, und über der Antwort steht `ATTACKERS NOT IDENTIFIED — … they are not in the fight`.

**Alaric greift eine solche Gruppe an (`engine.js`):**
- Es wird nichts ausgegeben und nichts gewürfelt, und es beginnt kein Kampf.
- Der Erzähler bekommt eine Notiz: Er zeigt die Tiere, jedes kämpfende als eigenes `new`, ihre Refs in `combat`.
- Greifen sie an, beginnt der Kampf mit ihnen wie bei jeder Angriffsmeldung. Alaric handelt in seinem nächsten Zug.

**Kampfbeginn danach:** Mit der Antwort der Nachforderung beginnt der Kampf wie in 3.1.0, einschließlich der Züge vor Alarics erstem Zug:

```
COMBAT START — Cellar Rat A, Cellar Rat B, Cellar Rat C attack Alaric
Initiative: Cellar Rat C 10 · Cellar Rat B 10 · Cellar Rat A 10 · Alaric 7 → …
— Round 1 —
…
COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [ENGAGED] · Cellar Rat C [MEDIUM]
Next: Alaric's Turn (Round 1)
ATTACKERS IDENTIFIED: a separate request named them (… s).
```

(Mit der synthetischen Antwort des Tests: drei Ratten, die die Antwort einzeln zeigt. Wie viele es sind, bestimmt die Antwort der Nachforderung, nicht ein Regex.)

## 4. Nicht geändert

- **„mail-clad men“:** Die Position der Männer wurde abgelehnt („unknown person“), weil der Report sie unter der Ref `mail_men` und einer anderen Bezeichnung führte. Kosmetisch, ohne Folge.
- **Personen-Gruppen:** „two mailed men“ ist eine NPC-Entity für zwei Männer. Die Gruppenregel gilt für Kreaturen. Personen-Gruppen sind im Lauf nicht angetreten.
- **Name beim Clerk:** Alaric nannte „Alaric Red 18 Warrior …“ auf „Name?“. Der Report hielt nur `registered as` mit Alter und Klasse fest, nicht seinen Namen. Die Karte des Clerks sagt deshalb „does NOT know his name“, obwohl die Geschichte den Namen auf die Marke schreibt. Das ist Modellverhalten im Report, kein Mechanikfehler.
- **Unklare Ziele außerhalb eines Kampfes** (zwei Gruppen, „*I Heavy Slash the rats*“) fragen wie bisher über den Erzähler nach dem Ziel.

## 5. Tests

**`tests/testrun_v9/live.test.js`** (4 Tests, Replay des Laufs):
- Der Lauf spielt bis Nachricht 20 wie aufgezeichnet: zwei Gruppen als Kulisse.
- Nachricht 22: Beide Gruppen werden nachgefordert, es entsteht kein Einzelgegner. Die Anfrage nennt sie als Gruppen.
- Mit der Antwort: Cellar Rat A, B, C mit je 16 HP, die Gruppen verlassen die Szene, die Züge vor Alaric kommen gleich mit.
- Ohne Antwort: kein Kampf, die Gruppen bleiben Kulisse. Alarics Angriff auf eine Gruppe ergibt eine Notiz, nichts gewürfelt, kein Kampf.

**`tests/unit/combat_targets.test.js`:**
- „cellar rats“, „cellar rats (dark)“ und „rat pack“ als Kulisse, später angreifend: nie ein Kämpfer.
- Eine vorher eingeführte Einzelkreatur („Big rat“) greift weiter als ein Gegner an.

**Version:** 3.1.2.
