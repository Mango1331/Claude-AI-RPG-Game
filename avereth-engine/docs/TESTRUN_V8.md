# Live-Lauf 26.09.2026, 23:09: welcher Build lief, Kampfbeginn, Phantom-Ratten, `alaric_red`

**Grundlage:**
- Chat-Datei (19 Nachrichten);
- Event-Export;
- Anfrage-Log mit 9 Anfragen: 7 an den Erzähler, 2 Report-Nachforderungen.

Das Fixture liegt in `tests/testrun_v8/fixture.json`. Es enthält:
- die Begrüßung mit ihren Events;
- die Spielernachrichten;
- die Erzähler-Antworten mit ihren Reports, aus dem Anfrage-Log;
- die Antworten auf die Nachforderungen.

Der Replay auf dem aktuellen Stand steht in `tests/testrun_v8/live.test.js`.

**Aufbau:** GLM-5.3-Flash mit dem Preset Avereth Narrator. Die Lore kam aus World Info, der Wortersatz war `ledger=register`. Gespielt wurde ein Warrior mit Heavy Slash und Charge.

**Stationen:**
- Tidecross;
- Gilde, Registrierung (2 Silber);
- Novice-Brett mit fünf Quests;
- Rattenquest bei Dagny (8 Silber);
- Gull's Rest;
- Salzkeller mit drei Ratten.

## 1. Welcher Build lief

**Ergebnis: Es lief exakt 8132a25, der Stand von `main`.** Belegt ist das per Replay der drei Dateien gegen vier Stände. Jeder Replay spielt die Erzähler-Antworten mit ihren Reports durch dieselben Host-Funktionen wie `index.js`.

| Stand | Ergebnis gegen die Aufzeichnung |
|---|---|
| 738be3b | Abweichung ab Nachricht 10: Das Quest-Event hat noch kein `reward`. |
| **8132a25** | **Byte-gleich**: alle Events, Accepted/Rejected, Panels, HUDs und Nachrichtentexte der Nachrichten 5–18. Die Engine-Blöcke aller 7 Erzähler-Anfragen stimmen mit dem Anfrage-Log überein (Lore aus World Info). |
| 774dba7, af539ee | Abweichung ab Nachricht 14: Labels „Cellar Rat A/B“, die Zeile `COMBAT TARGETS`, `label` im Encounter-Snapshot. Bei Nachricht 17 fragt die Engine selbst nach dem Ziel, ohne Erzähler. |

**Ursache:**
- `main` steht auf dem Merge von PR #10, und dessen Head war 8132a25.
- Die Kampf-Labels (774dba7) und die Rudel-Korrektur (af539ee) lagen nur auf dem Branch.
- Die SillyTavern-Kopie kam von `main`.

Der Branch ist jetzt auf `main` neu aufgesetzt. Die beiden Commits tragen dadurch neue Hashes:
- 774dba7 → fdcaca7;
- af539ee → a467dc6.

**Installationsweg:**
- „Install extension“ mit der Repository-Adresse funktioniert für dieses Repository nicht. SillyTavern (1.19) klont das Repository und erwartet `manifest.json` im Wurzelverzeichnis; sie liegt aber in `avereth-engine/`. Der Ordner wird also kopiert.
- SillyTavern liefert `/scripts/extensions/third-party/<Ordner>/<Datei>` zuerst aus `data/<user>/extensions/`, danach aus `public/scripts/extensions/third-party/`. Eine alte Kopie unter `data/…` verdeckt eine neue unter `public/…` Datei für Datei.
- `manifest.json` steht auf `"auto_update": false`.

**Build-Kennung (neu, Version 3.1.0):**
- **Wo sie steht:** `ENGINE_VERSION` in `src/util.js`, dazu `version` in `manifest.json` und `package.json`. Ein Test prüft, dass die drei gleich sind.
- **Wo man sie sieht:**
  - unter „Manage extensions“ in SillyTavern;
  - in der Statuszeile des Engine-Panels („Avereth Engine 3.1.0 | turn …“);
  - in der letzten Zeile von `#audit` (`RNG: … | Engine 3.1.0`);
  - bei jeder Nachricht im Chat-Record (`extra.avereth.build`);
  - im Event-Export pro Eintrag (`build`).
- Einträge ohne `build` stammen von einem Stand vor 3.1.0.
- Der Stempel ist nur Anzeige: Die Events und der Fold ändern sich nicht.

## 2. Befunde, geprüft auf dem aktuellen Stand

Das Review diente als Ausgangspunkt. Jeder Punkt wurde am Replay geprüft; die Tabelle zeigt, was jeder Stand mit derselben Nachricht macht.

| Nachricht | Lauf (8132a25) | af539ee | 3.1.0 |
|---|---|---|---|
| 10, 12 | `facts: {s:"alaric_red", p:"guild_rank"}` und `learn: {who:"clerk", s:"alaric_red", p:"registered_name", o:"Alaric Red"}` bleiben an einem Subjekt „alaric_red“. Das HUD zeigt „Guild Rank — (not registered)“, die Karten von Clerk und Dagny sagen „does NOT know his name“. | gleich | `pc guild_rank Novice`; Clerk und Dagny kennen seinen Namen |
| 14 | Die Ratten greifen an (Initiative 10 gegen 7). Der Kampf ist in Runde 0 festgelegt, ihre ersten Bisse warten auf Alarics Ansage. | gleich, mit Labels | Die drei Bisse kommen mit dieser Antwort; `Next: Alaric's Turn (Round 1)` |
| 16 | Der Report beschreibt die kämpfenden Ratten neu: `new: rat1 "bit his calf", rat2 "gnawing at his greave"`, dazu `combat.by: ["Cellar Rat","Cellar Rat"]`. Zwei weitere Ratten entstehen: „the bit his calf“ und „the gnawing at his greave“. | gleich | abgelehnt; der Erzähler bekommt die Korrektur |
| 17 | „Basic Attack the Cellar Rat that gnaws at my leather and strap“ → `which target? Cellar Rat or Cellar Rat` geht an den Erzähler, der in der Geschichte zurückfragt. | Die Engine fragt selbst: „Cellar Rat A or Cellar Rat B“, ohne Erzähler | wie af539ee |

**Nachricht 17 ist ein Deployment-Fehler, kein Fehler von af539ee.** Deshalb gibt es dazu keinen neuen Targeting-Patch.

**Die Würfel bleiben die des Laufs.** Der Vorlauf zieht dieselben Zufallszahlen in derselben Reihenfolge, nur eine Nachricht früher: „Big Cellar Rat HP 16 - 25 → 0“, Alaric bei 80/85.

## 3. Änderungen

### Züge vor Alarics erstem Zug (`engine.js` openCommitted, `display.js`)

**Ablauf beim Kampfbeginn:**
- Meldet ein Report einen Angriff auf Alaric, legt die Engine den Kampf fest und ruft `runCombat(ctx, null)` auf.
- Das spielt eine Opening Action im echten Hinterhalt und alle Züge der Runde 1 vor Alarics Zug.
- `runCombat` hält an Alarics Zug an. Für ihn wird nichts gespielt: Ist er zuerst dran, geschieht nichts.
- Persistiert wird wie in `combatTurn`: Snapshot, Awareness, HP/MP/STA, Munition, Tod als harte Fakten mit Zeugenwissen, Kampfende mit XP und Erinnerung. Dafür ist die Persistenz aus `combatTurn` in `persistCombat` verschoben; beide nutzen sie.

**Die Antwort zeigt:**
- `COMBAT START` und die Initiative;
- `— Round 1 —` mit den Zügen;
- `COMBAT TARGETS`, HP, Range, Alarics Ressourcen;
- `Next: Alaric's Turn (Round 1)`.

Stirbt Alaric im Vorlauf, steht dort `COMBAT END — Alaric is dead`, und der nächste Zug meldet nur noch den Tod. Die Änderungszeilen des Reports (HP, Coin, Items) zeigen nur, was der Report geändert hat. Die Kampffolgen stehen in den Kampfzeilen, nicht doppelt als „HP 85 + -1“.

**Der Erzähler:**
- Es gibt keinen zweiten Aufruf.
- Die Züge liegen als `preface` im Encounter-Snapshot.
- Der nächste Kampfschritt gibt sie dem Erzähler mit „Combat starts (…)“ vor Alarics Aktion. Er erzählt also alles seit seiner letzten Antwort in der richtigen Reihenfolge.
- Das Panel dieses Zuges zeigt sie nicht noch einmal (`outcome.shown`).
- Jeder Zug steht einmal im Kampflog.

**Determinismus:** Die Würfel kommen aus dem Zustand vor der Antwort, wie bei allen Report-Folgen. Das gilt für Swipes, Retcons und Nachforderungen gleichermaßen.

**Ausnahme:** Nennt die Antwort Angreifer, die die Engine noch nicht auseinanderhalten kann, läuft die Nachforderung, und der Kampf wird nur festgelegt. Seine Kämpfer stehen noch nicht fest. Mit der Antwort auf die Nachforderung läuft der Vorlauf. Ohne Antwort beginnt Runde 1 wie bisher mit der nächsten Nachricht; das gilt auch für ältere Chats mit einem Kampf in Runde 0.

### Keine neuen Kreaturen im Kampf ohne `combat` (`delta.js`)

Während eines aktiven Kampfes legt ein `new`-Eintrag vom Typ `creature` nur dann ein Wesen an, wenn derselbe Report es in `combat.by` angreifen lässt (per Ref oder Name). Sonst wird der Eintrag abgelehnt: „the creatures fighting are named by their labels (as in the engine block), and a creature that joins is introduced in "new" and named in "combat"“.

**Was die Regel nicht tut:**
- kein Textvergleich mit vorhandenen Tieren;
- kein Verbot von `new` im Kampf;
- keine Wirkung auf Personen (Zuschauer bleiben möglich).

Ein echter Neuzugang mit `new` und `combat` kommt weiter herein, im Test als Cellar Rat C.

### Alaric in id-Schreibweise (`delta.js` makeResolver)

Eine Referenz wie ein Bezeichner (`alaric_red`, nur Buchstaben und Unterstriche) zählt wie ihr Name mit Leerzeichen. Für Alaric heißt das: Name, Stichwort-Liste und voller Name („Alaric Red“) werden erkannt. Die Regel gilt allgemein, auch für Personen: `hesta_gault` findet Hesta.

Grenzen:
- Ein Bezeichner benennt niemanden um; der volle Name wird nur aus der geschriebenen Form übernommen.
- Mit einer zweiten Person gleichen Vornamens bleibt die Referenz mehrdeutig und findet niemanden, wie schon beim geschriebenen vollen Namen.

### Wer einen Fakt über Alaric lernt, dessen Wert sein Name ist, kennt seinen Namen (`delta.js` learn)

`registered_name` ist bewusst kein Synonym von `name`. Der Clerk sagt „whatever name you mean to work under“: Ein Alias wäre sonst als Widerspruch zur Welt abgelehnt worden.

Stattdessen gilt: Lernt jemand einen Fakt über Alaric, dessen Wert sein Name ist oder mit ihm beginnt („Alaric Red“), kennt er damit auch seinen Namen. Gemeint ist ein Lernen per „witnessed“ oder „told“. Ein Alias („John Smith“) bleibt ein gewöhnlicher Fakt.

### Build-Kennung

Siehe §1.

## 4. Nicht geändert

- **Laut Lauf in Ordnung und deshalb nicht angefasst:**
  - Quest-Belohnung: 8 Silber gespeichert und angezeigt;
  - Ökonomie: 5 → 3 Silber;
  - Quest offered → active;
  - Szenenpräsenz, Kampfkern, Kampfstille;
  - Report-Nachforderung (6,7 s und 1,65 s).
- **Niedrige Priorität, ohne Änderung:** Vergangenheitsform und der erzählerische `place`-Text. Der Erzähler-Prompt ist nicht gewachsen.
- Die zwei Beobachtungen der ersten Fassung (gleichnamiger Neuzugang, Alarics Name als Fakt) sind mit 3.1.1 behoben, siehe §6.

## 5. Tests

**`tests/testrun_v8/live.test.js`** (10 Tests, Replay des Laufs auf dem aktuellen Stand):
- Der Lauf spielt fehlerfrei; jeder Record trägt `build`.
- manifest, package.json und Engine zeigen dieselbe Version; `#audit`, Statuszeile und Export zeigen sie ebenfalls.
- `alaric_red` ergibt `pc`; Clerk und Dagny kennen seinen Namen.
- Kampfbeginn mit drei Bissen vor Alaric; die Labels stehen im Snapshot; das Panel ist vollständig.
- Heavy Slash ohne doppelten Zug, mit denselben Würfeln; der Erzähler hört die ganze Runde.
- Phantom-Ratten werden abgelehnt; das HUD zeigt nur die echten Ratten; die Korrektur steht im nächsten Engine-Block.
- Unklares Ziel: nur ein System-Panel, kein Erzähler.
- „Basic Attack Cellar Rat A“ trifft genau A, und Panel, HUD und Engine-Block benennen gleich.
- Ein echter Neuzugang wird Cellar Rat C, auch mit dem Namen „Cellar Rat“ (3.1.1).
- Kämpfende, die der Report unter neuen Refs beschreibt und per Label angreifen lässt, ergeben keine neuen Kreaturen (3.1.1).

**`tests/unit/combat_start.test.js`** (6 Tests):
- NPC > NPC > Alaric;
- Alaric zuerst (Bär);
- Alaric stirbt im Vorlauf;
- echter Hinterhalt: Opening Action und Runde-1-Zug je einmal;
- dieselbe Antwort ergibt denselben Kampf;
- solange die Angreifer nachgefordert werden, läuft kein Vorlauf.

**`tests/unit/report.test.js`:**
- „Alaric“, „Alaric Red“ und „alaric_red“ ergeben `pc` in `facts` und `learn`. Dazu die Gegenprobe mit einem Alias und `hesta_gault`.
- Alarics Namensfakt bleibt (3.1.1): `full_name` „Alaric Red“ ändert nichts, ein anderer Name wird abgelehnt, der Clerk kennt ihn weiter mit Namen, `alias` bleibt möglich.

**Angepasst** an den Vorlauf: die Erwartungen in Testrun 3, Testrun 7, `combat_targets`, `display`, `review` und `report`. Die gerufenen Züge stehen jetzt schon in der Antwort des Kampfbeginns; schreckhafte Ratten stehen deshalb auf MEDIUM statt SHORT.

**Live-Smoke** (echtes SillyTavern 1.19, Default und Avereth Narrator): Neu ist ein Wolf, der am Flussufer angreift.
- Die Antwort zeigt seinen ersten Zug und `Next: Alaric's Turn (Round 1)`.
- Die Anfrage zu „Heavy Slash Wolf A“ enthält „Combat starts“ mit dem Wolfszug vor Alarics Schlag.
- Das Panel danach beginnt mit Alarics Zug.

## 6. 3.1.1: zwei Restpunkte vor dem Merge

Beide kamen aus der Prüfung von 6e90cba (externe Review) und waren in §4 der ersten Fassung als Beobachtung vermerkt. Beide sind reproduziert und minimal behoben.

**Gleichnamiger Neuzugang im Kampf (`delta.js`):**
- **Fehler:** `new: {"ref":"rat_3","name":"Cellar Rat"}` plus `combat: {"by":"rat_3"}` wurde über den Namen mit Cellar Rat A zusammengelegt („known mon.cellar_rat“, „fights on“), und die Ratte fehlte. Die Namensprüfung lief, bevor die Kampfregel entschied.
- **Regel:** Im Kampf ist eine Kreatur, deren neue Ref derselbe Report in `combat` angreifen lässt, ein Neuzugang. Ihr Name („Cellar Rat“) ist ihre Art, die sie mit den Kämpfenden teilt. Er legt sie mit keinem von ihnen zusammen, und über ihn wird sie in diesem Report auch nicht angesprochen.
- Eine Ref, die selbst schon einen Kämpfer bezeichnet (Label, frühere Ref), bleibt dieser Kämpfer.
- Ergebnis: Cellar Rat C. Der Phantom-Fall bleibt abgelehnt, auch wenn der Report die Kämpfenden per Label (`Cellar Rat A`, `Cellar Rat B`) angreifen lässt.

**Alarics Namensfakt (`delta.js`):**
- **Fehler:** `full_name` wird zu `name`, und `name` hält nur einen Wert. `{s:"Alaric", p:"full_name", o:"Alaric Red"}` beendete deshalb `f.pc.name` (an dem jedes „knows his name“ hängt) und setzte „pc name pc“.
- **Regel:** Ein Report ersetzt Alarics Namensfakt nie. Eine verträgliche Form („Alaric Red“, nach derselben Namensregel wie beim Lernen) ändert nichts; jeder andere Name wird mit Hinweis abgelehnt. Ein Name, unter dem er auftritt, ist ein eigener Fakt (`alias`), und wer seinen Namen erfährt, steht in `learn`.
- Einen Weg, Alaric umzubenennen, gibt es nicht: Sein Name kommt aus dem Kampagnenstart.

**Version:** 3.1.1, nach der Regel „jede Engine-Änderung erhöht die Build-Kennung“.
