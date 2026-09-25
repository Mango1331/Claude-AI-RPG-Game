# Live-Lauf 25.09.2026, 01:31: Ratten ohne Zustand und Kampfziele

**Grundlage:** Chat-Datei (23 Nachrichten), Event-Export und Anfrage-Log (13 Anfragen). Das Fixture liegt in `tests/testrun_v7/fixture.json`: der Chat bis vor die Ratten-Antwort mit den aufgezeichneten Events, die Antwort selbst und die nächste Spielernachricht. Der Replay steht in `tests/testrun_v7/live.test.js`.

**Aufbau:** wie im [ersten Lauf mit dem Avereth Narrator](TESTRUN_V6.md): GLM-5.3-Flash, Reasoning low, Megumin aus, Nachforderung an; Warrior (Quick Slash, Charge).

**Stationen:** Stadttor, Gilde, Registrierung mit Bluttest, Novice-Brett, Rattenquest (Belohnung „6 silver flat / 7cp per tail“), Salzkeller von Brede mit dem Rattenfänger Osney.

**Fakten-Report:** Alle 9 Story-Antworten hatten einen Report, 5 im ersten Anlauf, 4 über die Nachforderung. Der Lauf endete im Keller, bevor ein Kampf zustande kam.

## 1. Befund: ein Kampf ohne Gegner

| Nachricht | Was geschah | Ursache |
|---|---|---|
| 20 (Antwort) | Osney räuchert die Ratten aus: „The first rat clears the hole … Two more pour out behind it“. Der Report meldete sie nur als `"combat": {"by": "rat pack — first rat charging toward the stairs, two more bolting along the walls, more following from the wall gaps"}`, ohne `new`. Die Engine verwarf den Eintrag, `time +5` blieb. | `combat.by` muss eine bekannte Person oder Kreatur sein. Der Rest des Reports war gültig, also gab es keine Nachforderung. Die Ratten existierten im Zustand nie. |
| 21 (Spieler) | „*i dash at the first one and basic attack it*“ → `Alaric: which target? Brede or Osney`, als normaler Story-Zug an den Erzähler. | Ohne Kampf nahm die Zielsuche alle Anwesenden als Kandidaten: nur die Händlerin und den Rattenfänger. |
| 22 (Antwort) | Der Erzähler meldete `combat.by: "pc"`, wieder verworfen. | Folgefehler. |

Derselbe Mechanismus zeigte sich schon in Test 5, Lauf 1 ([TESTRUN_V5.md](TESTRUN_V5.md), Zug 12: „which target? Brissa or the woman …“).

## 2. Änderungen

**Angreifer ohne `new` (`delta.js`):**
- Nennt ein Eintrag in `combat.by` keine bekannte Person, prüft die Engine den Kopf des Texts (bis zum Gedankenstrich, Komma oder Doppelpunkt, hier „rat pack“).
- Nennt er eine Kreaturenart (F1-Anker) und keine Person, und ist keine Kreatur dieser Art schon da, kommt sie herein, so wie `new` sie gebracht hätte. Die Festlegung des Kampfs folgt wie bei jedem gemeldeten Angriff sofort.
- Ein Eintrag ergibt einen Kämpfer. Ein Rudel ist einer, wie in jedem früheren Rattenkampf (Testrun 3, 4, 5 meldeten das Rudel immer als eine Kreatur).
- Personen („a hooded man with a knife“) und `pc` bleiben abgelehnt: Freitext ist keine sichere Identität.
- **Warum nicht die Nachforderung:** Ein zweiter Modellaufruf wäre nicht verlässlicher und hätte mit hoher Wahrscheinlichkeit wieder ein Rudel gemeldet. Die deterministische Aufnahme funktioniert auch bei abgeschalteter Nachforderung und ist offline testbar. Ein weiterer Prompt-Hinweis wurde nicht eingebaut.

**Kampf-Labels (`combat.js`):**
- Jeder Gegner bekommt beim Eintritt in den Kampf ein Label. Es bleibt an seiner Entity-ID, bis der Kampf endet.
- Ein bekannter Name bleibt das Label (`Brede`, `Mercenary Captain`).
- Unbenannte Gegner heißen nach ihrem Aussehen mit Buchstaben (`Cellar Rat A`, `Cellar Rat B`, `Cellar Rat C`). Gleichnamige bekommen ebenfalls Buchstaben.
- Stirbt A, bleibt B B. Ein Nachzügler bekommt den nächsten freien Buchstaben (`Cellar Rat D`), auch wenn A schon tot ist.
- Labels stehen nur im Encounter-Snapshot. Sie enden mit dem Kampf und landen nie in Fakten oder Erinnerungen (die Kampf-Erinnerung sagt weiter „the cellar rat — killed“).

**Anzeige (`display.js`, `hud.js`):**
- Neue Zeile `COMBAT TARGETS — Cellar Rat A [ENGAGED] · Cellar Rat B [SHORT] · Cellar Rat C [SHORT]`: beim Kampfstart, wenn jemand dazukommt, und wenn jemand fällt, flieht oder aufgibt.
- Initiative, Reihenfolge, Würfe, HP, Range, Angriffsoptionen, das HUD (Present, Combat) und die Befehle `#combat` und `#audit` zeigen dieselben Labels.

**Engine-Block:** Kampfblock, Karten und Würfe nutzen dieselben Labels, damit der Erzähler „Quick Slash on Cellar Rat B“ zuordnen kann. Karte und Kampfblock sagen dazu, wer das ist: `Cellar Rat B (the cellar rat)`.

**Zielauflösung (`intent.js`):**
- Im Kampf entscheidet zuerst das Label, exakt und ohne Rücksicht auf Groß- und Kleinschreibung („*I use Quick Slash on Cellar Rat B*“, „*I Charge Mercenary Captain*“).
- Alles andere (Pronomen, „the nearest one“, Arten, keine Zielwörter) sucht nur unter den Gegnern, die noch kämpfen.
- Umstehende sind nie Kandidaten. Nur wer ausdrücklich beim Namen genannt wird, wird angegriffen und tritt in den Kampf ein (Alarics Entscheidung, Core #23).
- Keine neuen Regex-Sonderfälle für „first/second one“. Die vorhandene Regel aus Testrun 4 (eine Unterscheidung wie „the second one“ ist nie der einzige Gegner) bleibt.

**Unklares Ziel im Kampf:**
- Ist das Ziel mehrdeutig oder nicht im Kampf, antwortet die Engine selbst mit einem System-Panel. Es gibt keinen Erzähler-Aufruf.
- Beispiel:
  ```
  [SYSTEM // COMBAT — TARGET NEEDED]
  Alaric's Basic Attack: "the first one" is not a target in this fight. Nothing was spent or rolled.
  COMBAT TARGETS — Rat Pack A [MEDIUM]
  Name one, for example: *Basic Attack on Rat Pack A*
  ```
- Nichts wird aufgelöst, gewürfelt oder ausgegeben. Die Zeile wird wie ein Befehl ausgeblendet.
- **Verhaltensänderung gegenüber Testrun 3:** Dort handelten die schnelleren Ratten zuerst und die Frage kam danach. Jetzt wartet die ganze Runde auf die Wahl und läuft mit der nächsten gültigen Ansage.
- Außerhalb eines Kampfs bleibt es beim Hinweis an den Erzähler.

**Namen, die die Geschichte noch nicht gesagt hat (`known_name`):**
- In Test 5 kamen „Sergeant Hobb“ und „Wick“ per `new`, bevor die Geschichte sie nannte. In Testrun 2 fiel „Bram“ fünf Züge vor „Fenn“.
- Die Engine merkt sich bei Personen mit Eigennamen, welcher Teil schon in Geschichte oder Spielernachricht stand.
- Die Ansichten des Spielers (Zielliste, Panels, HUD, `#npc`, `#quest`) zeigen nur diesen Teil, sonst das Aussehen (`Gate Sergeant A`, „the mercenary captain“). Sobald der Name fällt, gilt er.
- Der Erzähler kennt den Namen weiter und sieht den Hinweis `(Garrick Voss; the story has not said this name yet)`.
- Kreaturen (`cellar vermin`) und kleingeschriebene Bezeichnungen sind davon ausgenommen.

**„dash at“** zählt jetzt als Heranrücken, wie „rush at“. Das war die Eingabe dieses Laufs.

## 3. Tests

- **`tests/testrun_v7/live.test.js`:** der Rattenfall mit dem aufgezeichneten Chat.
  - Die Ratten existieren, der Kampf ist sofort fixiert, `COMBAT TARGETS — Rat Pack A [MEDIUM]`.
  - „the first one“ wird von der Engine beantwortet, ohne Brede und Osney.
  - „*i dash at Rat Pack A and basic attack it*“ trifft.
  - 3 der 4 Tests schlagen mit dem alten Code fehl. Der erste dokumentiert nur den aufgezeichneten Zustand.
- **`tests/unit/combat_targets.test.js`:**
  - mehrere gleichartige Gegner;
  - stabile Labels nach dem Tod;
  - Nachzügler;
  - benannter Gegner;
  - unbekannter Name ohne Leak;
  - exaktes Targeting per Label;
  - nur Gegner als Kandidaten;
  - Engine-Antwort im Host;
  - Labels nicht in Fakten und Erinnerungen;
  - Angreifer ohne `new`.
- **Angepasste Erwartungen:**
  - Labels statt „the wolf“ und „the ogre“ in älteren Tests.
  - Testrun 2: `Bram` statt „Bram Fenn“, weil „Fenn“ bis dahin nur in den ausgebauten Tracker-Blöcken stand.
  - Testrun 3, Zug 11: jetzt die Engine-Antwort.
  - `#combat` in Testrun 1: `Trapper A`.
  - Synthetische Antworten, die Namen nie im Text nennen, nennen sie jetzt.
- **Stand:** 234 Tests grün, Browser-Smoke grün.
- **Live-Smoke:** Default und Avereth Narrator grün, auch auf dem Endstand.
  - Ein früherer Preset-Lauf meldete einmal einen `AbortError` aus SillyTaverns `openai.js`, dieselbe zeitabhängige Meldung wie früher. Alle Wiederholungen liefen sauber.
  - Der Smoke spielt keinen Kampf mit mehreren Gegnern. Die Engine-Antwort nutzt im Host denselben Weg wie die Charaktererstellung (System-Panel, Zeile ausgeblendet, kein Erzähler), und diesen Weg prüft der Smoke.

## 4. Bewusst nicht gemacht

- **Keine Nachforderung für Kampf-Einträge** (Begründung in Abschnitt 2).
- **Keine Zählung aus Freitext** („two more“, „more following“): ein Eintrag bleibt ein Kämpfer.
- **Keine neuen Formulierungs-Regex** für Zielangaben.
- **Beobachtung ohne Änderung:** Eine scheue Ratte auf MEDIUM weicht jede Runde auf LONG aus, während ein Warrior pro Zug nur ein Band aufholt. Das kann zum endlosen Nachlaufen werden (gesehen im Unit-Test, bestehendes Verhalten). Im nächsten Lauf beobachten.

## 5. Nächster Lauf

**Neuer Chat.** Im Chat vom 25.09., 01:31, fehlen die Ratten im Zustand. Die aufgezeichneten Events bleiben, wie sie sind.

**Prüfen:**
- Ein Kampf mit mehreren gleichen Gegnern: Gibt es die Zielliste A/B/C, und bleiben die Labels nach einem Tod gleich?
- Ein Nachzügler bekommt den nächsten Buchstaben.
- Unklare Ziele („the first one“, „it“) beantwortet das System, ohne Erzähler-Aufruf.
- Ein Angriff per Label trifft exakt diesen Gegner.
- Meldet der Erzähler Angreifer nur als Freitext, stehen sie trotzdem als Gegner in der Zielliste.
- Umstehende tauchen nie als Kandidaten auf.
