# Live-Lauf 27.09.2026, 04:11: Gildenverträge, Quest-Identität, Registrierung, Orts-Nachfrage, Phantom-Stadt

**Grundlage:**
- Chat-Datei (31 Nachrichten; bei Nachricht 8 und 10 gilt der zweite Swipe);
- Event-Export;
- Anfrage-Log mit 23 Anfragen:
  - 17 an den Erzähler, einschließlich Swipes, einer Neuerzeugung von Nachricht 19 und einer abgebrochenen Anfrage;
  - 5 Report-Nachforderungen;
  - 1 Orts-Nachfrage;
- Auswertung von ChatGPT, mit dem Vorschlag, dass Gildenaufträge nur über die Gilde laufen.

**Fixture und Replay:**
- Das Fixture liegt in `tests/testrun_v11/fixture.json`. Es enthält:
  - die Begrüßung mit ihren Events;
  - die Spielernachrichten;
  - die Erzähler-Antworten mit ihren Reports;
  - die vier Antworten auf Nachforderungen;
  - zum Vergleich die aufgezeichneten Records des Kampfs.
- Der Replay steht in `tests/testrun_v11/live.test.js`.
- Auf 3.1.4 spielt er den Lauf byte-gleich nach: alle Events, Panels und HUDs.
- Die Nachrichten sind explizit zugeordnet, weil Nachricht 19 bearbeitet und neu erzeugt wurde (`build11.cjs` im Arbeitsverzeichnis der Analyse).

**Aufbau:**
- Build 3.1.4 (belegt durch `build` in jedem Record).
- GLM-5.3-Flash mit dem Preset Avereth Narrator, Lore aus World Info (Lorebook v0.11), Wortersatz `ledger=register`.
- Gespielt wurde ein Warrior mit Heavy Slash und Charge.

**Stationen:**
- Alderwatch (Valedorn Crown): vom Platz vor der Stadt in die Gilde;
- Registrierung für 2 Silber;
- Novice-Brett mit fünf Verträgen;
- „Wolf Problem — Millbrook Hamlet“ (8 silver on proof of at least two wolves);
- Millbrook mit Tomas;
- Kampf gegen Pack Leader Bitch und Yearling Wolf A;
- mit den Köpfen zurück nach Millbrook;
- Reeve Aldous unterschreibt und zahlt;
- Rückweg zur Gilde.

## 1. Was der Lauf bestätigt

- **Build:** 3.1.4 lief.
- **Kampf gegen zwei Einzelwölfe:**
  - Beide Wölfe waren eigene Gegner mit Wolfsprofil.
  - Ihre Züge vor Alarics erstem Zug kamen direkt beim Kampfbeginn.
  - „Pack Leader Bitch“ traf exakt.
  - Beide starben, und es gab einmal +20 Combat-XP.
  - Dieser Weg ist unverändert (Test H).
- **Orts-Nachfrage aus 3.1.4:** Sie lief im echten Lauf (2,7 s), mit dem Fehler aus Befund 1.
- **Nicht geprüft:** Der Gruppenfall aus 3.1.2 kam wieder nicht vor, also eine Kulisse, die später angreift. Die beiden Wölfe waren von Anfang an einzelne Gegner.

## 2. Befunde

Alle Befunde sind auf 3.1.4 an den Roh-Reports nachgestellt, byte-gleich zum Lauf.

| Nachricht | Report oder Antwort | Folge auf 3.1.4 | Einordnung |
|---|---|---|---|
| 6 | Die Orts-Nachfrage fragt, wer nicht mehr da ist (`leave`). Die Antwort nennt watchmen, drover, woman, boy, hunters, `clerk_old` und `clerk_young`. | Die beiden Schreiber, an deren Theke die Antwort endet, verlassen die Szene. Nachricht 8 legt deshalb neue an (`npc.guild_registration_clerk`, `npc.tagwoman`). | Engine: Die Frage war negativ gestellt |
| 8 | Der nachgeforderte Report legt die Quest „Guild registration“ an. | Die Quest steht auf offered. | Engine: keine Regel |
| 10 | „Guild registration“: completed | +15 Quest-XP | Engine: keine Regel |
| 14 | „Wolf Problem“: active | Eine zweite Quest `quest.wolf_problem` entsteht neben der angebotenen „Wolf Problem — Millbrook Hamlet“. | Engine: Identität nur über den exakten Titel |
| 26 | `aware`: „Millbrook villagers“ | Eine Person `npc.millbrook` entsteht. Sie ist danach Zeugin und hat Wissen. | Engine: Übernahme des großgeschriebenen Teils einer Ref |
| 28 | completed in Millbrook, Notiz „signature pending from reeve Aldous“ | Die Quest ist abgeschlossen, +20 Quest-XP. | Engine: keine Gildenregel; Lore ließ es zu |
| 30 | `location` „town with guild hall“; `coin` +800 „Wolf Problem reward, 8 silver“ (`taken_by` Aldous) | Eine neue Stadt `loc.town_with_guild_hall` entsteht, und Alaric ist dort. Er bekommt +800 Copper; die Belohnung sind 8 Silber, also 80 Copper. | Engine: Ort ohne Namen, Belohnung vom Erzähler; Modell: 800 statt 80 |

### Ursachen

- **Belohnung:**
  - Die Engine kannte die ausgehängte Belohnung, nutzte sie aber nie zum Zahlen. Sie glaubte die Copper-Zahl des Reports.
  - Das Lorebook v0.11 lud dazu ein. uid 31 sagte „Rewards should come from the giver's means“, uid 29 nannte den Auftraggeber als den, der den Abschluss prüft.
  - Der Erzähler folgte dem wörtlich. In Nachricht 30 zahlt der Reeve, und die Schreiberin der Gilde sagt: „Reward came from the hamlet directly, so the Guild's cut is just the filing—nothing owed here.“
- **Zu früher Abschluss:** Außer „nie angeboten“ und „schon abgeschlossen“ gab es keine Regel. Die Notiz des Reports sagte selbst, dass die Unterschrift noch fehlt.
- **Identität:** Die ID einer Quest war `quest.<slug(title)>`. Ein kürzerer Titel ergab eine neue Quest, gleich als aktiv.
- **Registrierung:** Keine Regel. Für das Modell war es ein Auftrag mit Abschluss.
- **Orts-Nachfrage:** Gefragt war, wer nicht mehr da ist. Das Modell zählte alle aus der Antwort auf, die Leute am Endpunkt eingeschlossen.
- **Phantom-Stadt:** Jeder unbekannte `location`-Text wurde ein neuer Ort, auch eine Beschreibung ohne Namen.
- **„Millbrook villagers“:** Die Übernahme benannter Personen (seit Testrun 4, „Fennick“) nahm den großgeschriebenen Teil einer Ref als Namen.

### Nicht als Engine-Fehler gewertet

Diese Punkte bleiben offen:

- **Hessa und die tagwoman:** `npc.tagwoman` (Nachricht 8) und `npc.hessa` (Nachricht 10, gleiche Beschreibung) sind sehr wahrscheinlich dieselbe Person.
  - Personen über ihre Beschreibung zusammenzuführen wäre eine Heuristik.
  - Die eigentliche Ursache war Befund 6: die beiden Schreiber, die zu früh gingen.
- **Namenswissen des Registrierungsschreibers:**
  - Er hört „Alaric Red“ und schreibt es ins Register. Der Engine-Block sagt danach „does NOT know his name“.
  - Der Report meldete nur `registered_as Rank F Novice adventurer`, nicht den Namen als Wissen.
  - Wie von ChatGPT gewünscht, gibt es keine Abbildung von `registered_name` auf den kanonischen Namen. Alarics Name bleibt geschützt.
- **Wolfsköpfe:** Die Köpfe gelten weiter als getragen, obwohl Alaric sie in Nachricht 29 „on the floor“ liegen lässt. Der Report meldete das Ablegen nicht.

## 3. Wo die Gildenregel liegt

Die kanonische Formulierung steht im **Lorebook**, und die Engine schützt sie mechanisch.

**Lorebook v0.12** ([LOREBOOK.md](LOREBOOK.md)). Das ist der Ort des Gilden-Kanons, und im Live-Spiel liest der Erzähler dort.
- uid 34 bekommt den Abschnitt `GUILD CONTRACTS [CANON]`.
- uid 29 und uid 31 waren die Quelle des Widerspruchs und sind angepasst: Beweis am Schalter, Belohnung bei der Gilde hinterlegt, Zusätze des Auftraggebers sind sein Geschenk.

**Engine-Lore** `content/lore.json`, Eintrag `lore.guild_contracts`. Das ist derselbe Kanon als Rückfall für Läufe ohne Lorebook.

**Regel-Content** `content/rules.json`, Schlüssel `guild`:
- `branch_kinds`: wo eine Gildenstelle ist, nämlich `city` und `capital` des Contents;
- die Regel im Wortlaut, als Referenz für den Code.

**Report-Schema** (`content/narrator.json`, Schlüssel `quests`):
- Ein Gildenvertrag wird nur am Schalter abgeschlossen.
- Die Engine zahlt seine Belohnung; sie wird nie als Coin gemeldet.
- Die Registrierung ist keine Quest.

**Engine-Block:** Die Quest-Zeile nennt den Vertrag, zum Beispiel:

```
Quest (active, Novice Guild contract): Wolf Problem — Millbrook Hamlet — … — reward: 8 silver on proof of at least two wolves (paid by the Guild when turned in at a front desk; locals confirm, never pay)
```

**Engine** (`delta.js`) setzt die Regel durch; der Abschnitt 4 beschreibt wie.

**Warum beides:**
- Der Lauf zeigt, dass das Modell dem Lorebook folgt. Wenn das Lorebook etwas Falsches sagt, tut das Modell also Falsches.
- Umgekehrt zeigt er, dass Belohnung und Abschluss nicht am Wortlaut des Modells hängen dürfen.

## 4. Änderungen in 3.1.5, 3.1.6 und 3.1.7

### Gildenverträge (`delta.js`)

- **Was ein Gildenvertrag ist:** eine Quest mit Quest-Rang. Ohne Rang ist die Arbeit privat und läuft wie bisher.
- **Abschluss nur bei der Abgabe durch den Spieler.** Seit 3.1.6 müssen beide Bedingungen gelten:
  - Alaric ist am Ende der Antwort in einer Stadt oder Hauptstadt des Contents (`rules.json` `guild.branch_kinds`). Dort hat die Gilde eine Stelle.
  - Deine aktuelle Nachricht gibt den Vertrag ab (`intent.js`, gebaut wie `takesQuest`):
    - Mit Namen gilt nur der genannte Vertrag: „I turn in the Wolf Problem quest“, „I hand in Wolf Problem“, „I report the completed Wolf Problem at the Guild“. Nennt die Nachricht irgendeine bekannte Quest, auch eine erledigte, gibt sie keinen anderen Vertrag ab.
    - Ohne Namen („I return to the Guild and turn the quest in“, „turn it in“) gilt die Abgabe seit 3.1.7 nur, wenn genau ein Gildenvertrag aktiv ist. Dann ist es dieser.
    - Sind mehrere aktiv, gibt eine Abgabe ohne Namen keinen ab. Der Vertrag bleibt aktiv, über der Antwort steht `QUEST STILL ACTIVE — …: more than one Guild contract is active; one is turned in by its name`, und der Spieler muss ihn benennen.
    - Ein Titel gilt als genannt, wenn zwei seiner unterscheidenden Wörter vorkommen, bei einem Titel mit nur einem solchen Wort dieses eine. „turn in the rat job“ nennt „Rats in the Grain Cellars“ also nicht und ist eine Abgabe ohne Namen.
    - Wie bei der Annahme zählt auch eine Nachricht, deren Antwort keinen Report hatte.
  - Nicht genug sind „I killed the wolves“, „I return to Alderwatch“, „I show Aldous the heads“ und die Worte eines NPC.
- **Sonst bleibt der Vertrag aktiv:**
  - `accepted` zeigt `quest …: active (turned in only at a Guild front desk)`.
  - Über der Antwort steht `QUEST STILL ACTIVE — …: a Guild contract is completed when it is turned in at a Guild front desk`.
  - Der Erzähler bekommt eine Korrektur: außerhalb einer Stadt „…completed only when Alaric turns it in at a Guild front desk…“, in der Stadt ohne Abgabe „PLAYER OWNERSHIP: turning in a Guild contract needs the player's own decision in the current message ("I turn in the … quest")…“.
  - Notiz und Items bleiben: „two wolf heads delivered as proof, signature pending“, das gesiegelte Papier.
- **Warum die Nachträge:**
  - 3.1.5 prüfte nur die Stadt. Im Review fiel auf: Im Keller unter Alderwatch hätte ein fälschliches „completed“ nach den Ratten den Vertrag abgeschlossen und bezahlt. Eine Stadt mit Gildenstelle ist noch keine Abgabe am Schalter.
  - In 3.1.6 gab „I turn the quest in“ jeden Vertrag ab, den der Report abschloss, bei zwei aktiven Verträgen also beide (Review von 3.1.6).
  - Außerdem galt eine Nachricht, die eine nicht aktive Quest nannte, als Abgabe ohne Namen.
- **Nicht genommen:** Ein Vertrag, der nie aktiv war, wird nicht abgegeben. Der Report wird abgelehnt: „was never taken“.
- **Belohnung:**
  - Beim Abschluss am Schalter zahlt die Engine den ersten Betrag der ausgehängten Belohnung. Aus „8 silver on proof of at least two wolves“ werden +80 Copper, im Panel als `COIN +8 Silver → … · Guild reward: Wolf Problem — Millbrook Hamlet`.
  - Aus „6 silver plus a meal“ werden 60, der Rest geht an den Auftraggeber.
  - Eine Belohnung ohne Betrag („a hot meal and a bunk“) zahlt die Engine nicht.
  - Kanon seit 3.1.6: Ein Vertrag hat eine feste Gilden-Auszahlung. Was variabel ist, pro Stück oder nach Ermessen, ist ein eigener Bonus des Auftraggebers („Guild payout: 6 silver. Client bonus: +1 silver per intact pelt.“). So steht es im Lorebook (uid 34, 29, 31), in der Engine-Lore und im Report-Schema. Die Engine zahlt nur die feste Auszahlung; einen Parser für Belohnungsausdrücke gibt es nicht.
- **Coin für den Vertrag wird nie gebucht.** Abgelehnt wird positives Coin für Alaric in zwei Fällen:
  - Das `why` nennt einen Gildenvertrag mit Betrag, über dessen Titelwörter wie bei „I take the … quest“. Das gilt vor, bei und nach der Abgabe.
  - Der Report meldet einen solchen Vertrag als completed. Das war der Fall im Lauf: Aldous zahlt in demselben Report.
  - Die Ablehnung sagt je nach Lage, dass die Gilde bei der Abgabe zahlt, dass sie mit dieser Abgabe zahlt, oder dass sie schon gezahlt hat.
- **Quest-XP** gibt es wie bisher einmal, jetzt erst bei der Abgabe.
- **Ankunft und Abgabe in derselben Antwort:** Die Engine prüft den Ort, an den der Report Alaric bringt, nicht den vorherigen.
- **Registrierung:** Eine neue Quest mit „registration“ im Titel wird abgelehnt. Rang, Gebühr und Abzeichen kommen wie bisher über `facts`, `coin` und `items`.
- **Quest-Identität:**
  - Ist ein Titel nicht der Titel einer bekannten Quest, meint er die eine offene Quest (offered oder active), deren Titel alle seine unterscheidenden Wörter enthält.
  - Gibt es keine oder mehrere solche Quests, ist es eine neue Quest.
  - Die Quest behält Titel, Level, Typ, Rang und Belohnung. Ein späterer Report überschreibt nichts davon.
- **Beförderungs-Anrechnung:** Die abgeschlossenen Verträge eines Rangs sind die abgeschlossenen Quests mit diesem Rang. Einen eigenen Zähler gibt es nicht; ein Beförderungssystem wurde nicht gebaut.

### Orts-Nachfrage (`host.js`)

- **Die Frage ist positiv:** `present`, die Refs der Personen aus der Liste, die am Ende bei Alaric sind. Die Anfrage nennt jede eingeführte Person mit Namen und Beschreibung.
- **Die Engine rechnet selbst:** Wen der Report eingeführt hat und die Antwort nicht nennt, der bleibt zurück.
  - Nur Refs aus dem eigenen `new` des Reports zählen; unbekannte Refs werden ignoriert.
  - Eine Antwort ohne `present`, etwa im alten Format mit `leave`, schickt niemanden weg.
- **Im Lauf:** Mit `present: ["clerk_old","clerk_young"]` bleiben beide Schreiber, und der Engine-Block von Nachricht 7 listet sie. Mit der Antwort des Laufs bleiben sie ebenfalls.

### Ein neuer Ort braucht einen Namen (`delta.js`)

- Ein unbekannter `location`-Text wird nur dann ein neuer Ort, wenn er einen Eigennamen enthält, also ein großgeschriebenes Wort.
- „town with guild hall“ wird abgelehnt: „a location is reported by its name; a spot inside the current one is "place"“. Alaric bleibt, wo er ist.
- „eastern woods above Millbrook Hamlet“ legt wie im Lauf einen Ort an.
- In allen zwölf Anfrage-Logs war „town with guild hall“ der einzige `location`-Wert ohne Eigennamen.

### Eine Sammelbezeichnung oder ein Ortsname ist keine Person (`delta.js`)

- Eine Ref wird nur dann zur benannten Person, wenn sie genau der Name ist und nichts sonst.
- Sie darf nicht der Name eines Orts sein, auch nicht das erste Wort eines Orts: „Millbrook“ von „Millbrook Hamlet“.
- „Millbrook villagers“ bleibt unbekannt und wird mit „introduce new people via "new"“ abgelehnt. „Harl“ wird wie bisher übernommen.

## 5. Der Lauf auf 3.1.5 und 3.1.6 (Replay)

| Nachricht | 3.1.4 (Lauf) | 3.1.5 und 3.1.6 (gleiche Records) |
|---|---|---|
| 6 | Die Schreiber verlassen die Szene. | Mit `present` bleiben beide, die Theke ist ihr Ort, und der Engine-Block listet sie. |
| 8, 10 | Quest „Guild registration“, completed, +15 Quest-XP | Abgelehnt, 0 XP. Rang, Gebühr (–20 Copper) und Abzeichen stehen im Zustand. |
| 14 | zweite Quest „Wolf Problem“, active | `QUEST ACCEPTED — Wolf Problem — Millbrook Hamlet`, Verlauf offered → active, Belohnung wie ausgehängt |
| 20–24 | Kampf, +20 XP (Gesamt 35) | Dieselben Events, Würfel und Panels. Nur der XP-Stand ist 20, weil die 15 der Registrierung fehlen. |
| 26 | `npc.millbrook` | abgelehnt, keine Person |
| 28 | completed, +20 Quest-XP | aktiv, `QUEST STILL ACTIVE`, Notiz „signature pending …“, keine XP |
| 30 | neue Stadt, +800 Copper | Ort abgelehnt (Alaric bleibt in Millbrook), Coin abgelehnt, gesiegeltes Papier übernommen, Vertrag weiter aktiv |

**Synthetische Fortsetzung (Test D):** „*I walk back to the guild in Alderwatch and turn in the Wolf Problem quest at the front desk …*“. Der Report meldet `location` Alderwatch, completed und +800 Copper.
- Ergebnis: completed, `Guild reward +80 cp` (Börse 30 → 110), `Quest XP +20`. Die 800 werden abgelehnt.
- Ein zweiter Report mit completed und `Wolf Problem reward` zahlt nichts mehr: kein Coin, keine XP, und es bleibt genau ein abgeschlossener Vertrag.

## 6. Kritische Stellungnahme zum Vorschlag „alles über die Gilde“

**Was dafür spricht:**
- **Der Widerspruch im Kanon ist aufgelöst.** Das alte Lorebook ließ den Auftraggeber zahlen und bestätigen. Der Erzähler tat genau das, und die Gilde hatte „nothing owed“. Wer zahlt, war nirgends festgelegt, und das Modell hat die Lücke gefüllt.
- **Ein einziger Prüfpunkt.** Abschluss, Belohnung, Quest-XP und Anrechnung passieren an einer Stelle, die die Engine ohne Sprachverständnis prüfen kann: Rang, Status, Ort.
  - Was draußen passiert („the reeve accepted it“, „the wolves are dead“), wird Beweis und Geschichte, aber kein Abschluss.
  - Der Befund aus Nachricht 28 (abgeschlossen, obwohl die Unterschrift fehlte) kann so nicht mehr entstehen.
- **Beförderung:** „Fünf abgeschlossene Verträge des aktuellen Rangs“ wird eine belastbare Tatsache.
- **Der Auftraggeber muss nicht vorkommen.** Das passt zu Brett-Aufträgen von Dörfern und Händlern, und der Erzähler muss keine Szene für die Bezahlung erfinden.
- **Kein fünfter Status nötig.** Beweis steht in Notiz und Items. Das stimmt: Der Lauf hatte beides schon.

**Wo die Regel an Grenzen stößt:**
1. **Stadt und Schalter.** 3.1.5 nahm die Stadt als Schalter; das war zu breit (Review).
   - Seit 3.1.6 schließt nur deine Abgabe den Vertrag ab, in einer Stadt mit Gildenstelle.
   - Wo in der Stadt du abgibst, prüft die Engine weiter nicht: Taverne oder Theke. „Guild“ oder „front desk“ im Ortsnamen zu verlangen, wäre Freitext-Erkennung und bleibt ausgeschlossen.
   - Die Abgabe ist aber deine ausdrückliche Handlung und kein Wort des Erzählers.
2. **Welche Orte eine Gildenstelle haben (von dir bestätigt):**
   - jede menschliche Stadt und Hauptstadt;
   - keine Dörfer, keine Sitze der Monsterreiche, keine vom Erzähler angelegten Orte;
   - Abgabe an jeder Stelle, nicht nur dort, wo der Vertrag genommen wurde („branches share the rolls“).
3. **Beweise prüft die Engine nicht.** Sie verlangt kein Beweis-Item, denn Beweise sind zu verschieden: Köpfe, Siegel, Zeugen, eine Begleitung. Das Prüfen ist Sache der Erzählung am Schalter.
4. **Belohnungen ohne festen Betrag.** Seit 3.1.6 legt der Kanon fest: eine feste Gilden-Auszahlung; Variables ist ein eigener Bonus des Auftraggebers. Für Aushänge, die das Modell trotzdem anders schreibt, gilt:
   - „up to 6 silver, by weight“ zahlt 60 (den Höchstbetrag).
   - Bei „6 silver flat / 7cp per tail“ zahlt die Engine die 60; die Zahlung pro Schwanz ist Bonus des Auftraggebers.
   - „4 silver a night“ zahlt einmal 40.
   - Solche Anteile lassen sich nicht als Coin nachbuchen, wenn das `why` den Vertrag nennt.
   - Eine Belohnung ohne Betrag zahlt die Engine nicht; der Erzähler darf sie dann wie bisher melden.
5. **Geschenke und Zahlungen ohne Vertragsnamen:**
   - Das Lorebook sagt, ein Zusatz des Auftraggebers sei sein Geschenk. Nennt die Buchung den Vertrag, lehnt die Engine sie trotzdem ab; ein Geschenk muss ohne den Vertragsnamen gebucht werden.
   - Umgekehrt erkennt die Engine eine Zahlung des Auftraggebers ohne Vertragsnamen und außerhalb des Abschluss-Reports nicht (etwa „the reeve's silver“ einen Zug vorher). Dann zahlt die Gilde später noch einmal.
   - Mehr ginge nur mit Sprachverständnis für Geld, und das ist ausdrücklich nicht gewünscht.
6. **Die Prosa kann abweichen.** Schreibt der Erzähler trotzdem, dass der Reeve zahlt, lehnt die Engine das Coin ab, die Szene steht aber so da. Die Korrektur und der neue Kanon sollen das verhindern. Ob das reicht, zeigt der nächste Lauf.
7. **Folge der abgelehnten Phantom-Stadt:**
   - Nennt der Erzähler das Ziel nur beschreibend, bleibt Alaric in der Engine am alten Ort.
   - Ein späterer Report kann die Stadt nur mit einer Reise-Entscheidung in deiner Nachricht nachtragen.
   - Im Lauf wäre die Abgabe in Nachricht 30 deshalb „noch aktiv“ geblieben, obwohl die Geschichte schon an der Theke war. Für die Engine ist das richtig, für dich sichtbar (`QUEST STILL ACTIVE`).
8. **Private Arbeit und Quest-XP (von dir bestätigt):**
   - Private Aufträge geben Quest-XP nach Core #25 und werden direkt bezahlt.
   - Sie haben keinen Quest-Rang, bekommen keine Gilden-Auszahlung und zählen nicht für die Beförderung.
9. **Scheitern:** Ein Vertrag darf überall als failed gemeldet werden. Aufgeben muss man nicht am Schalter.
10. **Ob ein Auftrag ein Gildenvertrag ist, entscheidet der Report.** Ein Brett-Auftrag ohne `rank` wäre private Arbeit. Das Schema verlangt den Rang für Verträge, und der Lauf hatte ihn bei allen fünf.

## 7. Was die Engine erzwingt (Invarianten)

- Ein Gildenvertrag wird nur completed, wenn drei Dinge gelten:
  - Er war active.
  - Alaric ist am Ende der Antwort in einer Stadt oder Hauptstadt.
  - Deine Nachricht gibt ihn ab (3.1.6): beim Namen, oder als „the quest“, wenn er der einzige aktive Vertrag ist (3.1.7).
- Seine Belohnung zahlt nur die Engine, genau einmal: mit dem Abschluss und in Höhe des ersten ausgehängten Betrags.
- Kein Report bucht positives Coin für Alaric, das einen Gildenvertrag mit Betrag nennt oder im Abschluss-Report eines solchen Vertrags steht.
- Quest-XP gibt es einmal, beim Abschluss.
- Die Registrierung ist keine Quest.
- Ein kürzerer Titel legt keine zweite Quest neben der einen offenen an. Ausgehängte Werte (Level, Typ, Rang, Belohnung) bleiben.
- Eine Beschreibung ohne Eigennamen legt keinen Ort an.
- Eine Sammelbezeichnung oder ein Ortsname wird keine Person.
- Die Orts-Nachfrage schickt nur weg, wen der Report eingeführt hat und die Antwort nicht als anwesend nennt.

## 8. Bekannte Grenzen (bewusst offen)

- **Aus Abschnitt 6:**
  - Wo in der Stadt du abgibst, prüft die Engine nicht.
  - Beweise werden nicht geprüft.
  - Belohnungen ohne festen Betrag und Geschenke unter dem Vertragsnamen sind nicht abgedeckt.
- **Abgabe über zwei Antworten:** Die Abgabe gilt für die Antwort auf deine Abgabe-Nachricht und für eine Nachricht davor, deren Antwort keinen Report hatte.
  - Prüft der Schreiber erst und schließt in der nächsten Antwort ab, muss deine nächste Nachricht wieder abgeben.
  - Bis dahin steht `QUEST STILL ACTIVE`.
  - In den bisherigen Läufen kam der Abschluss immer in der Antwort auf die Abgabe (24.09. 23:23: „turn in the signature slip and the Quest overall“).
- **Abgabe ohne Namen:** Sie gilt nur für den einzigen aktiven Vertrag.
  - Wer mehrere Verträge zugleich abgeben will, nennt jeden beim Namen („I turn in the Cart Guard, the Boar Damage and the Night Watch quests“).
  - „turn them all in“ gibt es bewusst nicht.
- **Hessa und die tagwoman:** keine Zusammenführung über Beschreibungen.
- **Namenswissen** der Registrierung: nicht gelöst, Alarics Name bleibt geschützt.
- **Nachricht 8 ist kontrafaktisch:** Der aufgezeichnete Report wurde ohne die beiden Schreiber im Engine-Block geschrieben und legt den Registrierungsschreiber neu an. Ob das Modell mit ihnen im Block ihre Refs nutzt, zeigt erst ein neuer Lauf.
- **Zwei unbenannte Schreiber** erscheinen im Engine-Block beide als „the guild clerk“ und unterscheiden sich nur in der Beschreibung.
- **Gruppen-Individualisierung** (3.1.2): weiter nicht live geprüft.
- **Abgelegte Gegenstände** (die Köpfe) bleiben getragen, wenn der Report das Ablegen nicht meldet.

## 9. Tests

**`tests/testrun_v11/live.test.js`** (8 Tests, Replay des Laufs):
- F: Die Orts-Nachfrage fragt `present` und nennt die beiden Schreiber. Beide bleiben, auch mit der Antwort des Laufs.
- E: Die Registrierung ist keine Quest: 0 XP, kein abgeschlossener Vertrag, aber Rang, Gebühr und Abzeichen.
- B: „Wolf Problem“ ist die Quest vom Brett: offered → active, keine zweite.
- C: In Millbrook bleibt der Vertrag aktiv, und der Engine-Block nennt Zahler und Korrektur.
- A und G: Die 800 Copper werden nicht gebucht, und es entsteht keine Stadt „town with guild hall“.
- D: die synthetische Abgabe am Schalter (+80 Copper, +20 Quest-XP, einmal).
- H: Der Kampf ist der des Laufs (Events, Würfel, Panels); nur der XP-Stand ist 20 statt 35.
- „Millbrook villagers“ ist keine Person.

**`tests/unit/report.test.js`** (7 Tests):
- der Lebenszyklus eines Vertrags;
- die Abgabe durch den Spieler (3.1.6), Fälle A–D aus dem Review in Alderwatch:
  - A: im Keller erledigt gemeldet, er bleibt aktiv;
  - B: nur nach Alderwatch zurückgekehrt, er bleibt aktiv;
  - C: „I return to the Guild and turn in Wolf Problem“ schließt nur diesen Vertrag ab, mit 8 Silber und Quest-XP;
  - D: eine zweite Abgabe zahlt nichts;
  - danach „turn the quest in“ ohne Namen, als der Rattenvertrag der einzige aktive ist;
- die Abgabe ohne Namen (3.1.7), Regressionen 1–4 aus dem Review:
  - 1: ein aktiver Vertrag und „turn the quest in“: er wird abgeschlossen;
  - 2: zwei aktive Verträge, „turn the quest in“, der Report schließt beide ab: keiner, mit dem Hinweis auf den Namen;
  - 3: zwei aktive Verträge und „turn in Wolf Problem“: nur der Wolfsvertrag;
  - 4: eine zweite Abgabe zahlt nichts, und eine Nachricht, die eine Quest nennt, gibt auch den einzigen anderen aktiven Vertrag nicht ab;
- erster Betrag, eine Belohnung ohne Betrag, private Arbeit;
- Quest-Identität: kürzerer Titel, mehrdeutig, längerer Titel, abgeschlossene Quest;
- Registrierung;
- Ortsname und Sammelbezeichnung.

**`tests/unit/intent.test.js`:** Formulierungen, die abgeben (mit Namen, ohne Namen, aus den Läufen vom 24.09. und 27.09.), und solche, die es nicht tun (Rückkehr, Töten, Zeigen, die Worte des Reeve, „turned in for the night“, Fragen).

**`tests/unit/report_request.test.js`:**
- die Orts-Nachfrage mit `present`: per Ref oder Name, `[]`, unbekannte Refs;
- eine Antwort im alten Format schickt niemanden weg.

**Live-Smoke (`tools/st_live/run.mjs`):**
- Der Mock antwortet auf die Orts-Nachfrage mit `present`.
- Der Rattenvertrag hat jetzt eine Belohnung („5 silver“).
- Im Keller meldet der Report ihn als erledigt; er bleibt aktiv (`QUEST STILL ACTIVE`).
- Bei der Abgabe („turn in the rat job with Serah“) zahlt die Engine 5 Silber, und die 50 Copper des Reports werden abgelehnt.
- Beides prüft `guildTurnIn`.

**Gegenproben:**
- Alle 15 neuen oder geänderten Tests von 3.1.5 scheitern auf 3.1.4.
- Die beiden neuen Tests von 3.1.6 scheitern auf 3.1.5, der neue Test von 3.1.7 auf 3.1.6.
- Alle Tests über den Host schreiben auf 3.1.6 und 3.1.7 dieselben Records wie auf 3.1.5.
- Alle übrigen Tests schreiben auf 3.1.5 dieselben Records wie auf 3.1.4 (aufgezeichnet und verglichen). Unterschiede gibt es nur bei der Build-Nummer im Kampagnenstart und in `#audit` sowie in der Reihenfolge der Records des Narrator-Vergleichs.
- Die Läufe v8, v9 und v10 spielen unverändert.
- Der Lauf von 04:11 spielt auf 3.1.4 byte-gleich. Auf 3.1.5 weicht er nur an den gewollten Stellen ab (Abschnitt 5).

**Version:** 3.1.7 (3.1.5, dazu die Abgabe durch den Spieler in 3.1.6 und die Abgabe ohne Namen nur beim einzigen aktiven Vertrag in 3.1.7).
