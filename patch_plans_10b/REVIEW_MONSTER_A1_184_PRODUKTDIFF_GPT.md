# Unabhängiger GPT-Produktdiff-Gegenreview – Monster A1 / Build .184

**Stand:** 13.11.2026. **Repository:** `Mango1331/Claude-AI-RPG-Game`. **Produkt:** `claude/c-planner-prototype-2026-10-02-gpt-c666`, bei Prüfung Remote-HEAD `efcad4c02f4d2a47ab5f777d6cf6581979e36e4e` (identisch mit Patchstand `.184`). **Vergleichsbasis:** `86465eb2a75e6b2b661e3e72d8ce3b7248f9ac5a` (`.183`). Produktcommit [`42f0fa2`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/42f0fa2cb3433a90f79fcdeeed36c48dfceea740), Build/Test/Patchnote [`efcad4c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/efcad4c02f4d2a47ab5f777d6cf6581979e36e4e). [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/efcad4c/avereth-engine/docs/MONSTER_A1_184.md).

**Verbindliche Grundlagen:** [Monster-Fachplan §§3.1/5.1, GPT §8, Opus §9](FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md), die dort dokumentierten Nutzerentscheidungen **D6** (Kerne nur mit Beleg) und **D9** (Wortlisten ohne „buck“), [Kanon 02](../02_DESIGN_KANON.md). Relevanter tatsächlicher Diff: `content/monsters.json`, `src/delta.js`, `src/v4/loot.js`, `tests/v4/fix184_monster_a1.test.js`, `tests/v4/hotfix_scroll.test.js`, `tests/replay/replay.test.js`, neue Replay-Akzeptanzdatei.

## 1. Gesamturteil

**A1-Fachumfang weitgehend korrekt umgesetzt, aber eine gezielte Berechtigungsregression an einer unerwarteten Schnittstelle fehlt.** Geweih/Horn/Hauer/Gift/Kern sind jetzt belegt und eng negativ übersteuerbar; der generische Ankerangriff ist kein anatomischer Beweis mehr; `hare/rabbit` sind `rat`-Aliase; `of the …` wird im Beute-Artnamen bereinigt. **A2, Angriffswerte, neue Monsterwaffen und Extractor-Vertrag sind nicht verändert.** Kein Grund für einen allgemeinen Monster-Umbau.

**Befund R1 – vor uneingeschränkter Freigabe gezielt absichern:** Die volle Kreaturbeschreibung `traits` fließt nicht nur in `lootEvents`, sondern auch in die Rollenauswertung des **World Envelope** ein. Sie kann nun ein zuvor wegen 40-Zeichen-Kürzung unsichtbares Rollenwort (z. B. `guard`, `thief`) enthalten. `envelope.mayTake()`/ `world.coerce()` besitzen für `fine`/`confiscation` bzw. `robbery` keinen grundsätzlichen `kind === 'npc'`-Schutz. Das eröffnet insbesondere bei Kreaturen einen unerwünschten Autoritätspfad. **Codepfad und isolierter Regex-Vorher/Nachher-Befund bestätigt; ein vollständiger positiver Engine-Missbrauchsfall wurde nicht ausgeführt und ist deshalb als gezielte Regression nachzuweisen.**

**Abnahme:** **A1-Kern fachlich GO**, **uneingeschränkte technische Freigabe bis R1-Gegenprobe/ggf. kleinem Schutzpatch zurückgestellt**. Weiterhin offen: isolierter ST1.19-Standard-/Failsoft-Smoke und natürliches A1-Spielverhalten. Der am 13.11. ausgewertete NPC-Dreierbatch lief auf `.183`, nicht `.184`.

## 2. Code- und Designvergleich

| Bereich | Unabhängiger Befund |
|---|---|
| §3.1 Nr. 1–5, D6/D9 | `monsters.json` erweitert `deer.antler` um `only_if`; `deer.horn` und `horse.horn` mit `qty [0,2]` und 3 cp; `ogre.tusk` und `slime.core` (D6) nur mit Wortbeleg. `buck` bleibt ausgeschlossen. |
| K1: individuelle Verneinung | `unless` steht an allen betroffenen Spezialorganen und wird in `loot.js` **vor** `only_if` geprüft. Gegenfälle `hornless goat`, `doe without antlers`, `tuskless ogre`, `non-venomous grass snake` sind in Tests ausdrücklich vertreten. Kein allgemeiner Sprachparser. |
| Ankerattacke | `lootEvents()` bildet Belegtext aus `species`, `name`, `descriptors`, `traits`; **`profile.attack.name` entfernt**. Aufgezeichnete Käfer/Strider verloren deshalb neun früher fälschlich erzeugte Giftdrüsen. |
| Längere Beschreibung | `delta.js` setzt für **neu erzeugte Kreaturen** `traits` auf die gemeldeten `desc[]` (verbunden, maximal 240 Zeichen), während `descriptors` für Identität weiterhin auf 40 Zeichen je Eintrag begrenzt bleiben. Vorher vorhandene Kreaturen werden nicht rückwirkend umgeschrieben. |
| Aliase | `rat.aliases` enthält nun `hare/hares/rabbit/rabbits`; der echte Host-/Erzeugungsweg ist im neuen Test vertreten. |
| K2: Beute-/Stapelidentität | `speciesName()` schneidet ein ` of the …`-Suffix vor der bisherigen maximalen Drei-Wort-Auswahl ab; derselbe neue Artenname erzeugt denselben Stack, verschiedene Arten bleiben auseinander. Alte `obj.loot.of_the_…`-Stapel werden nicht migriert. Das ist eine **bewusste Identitätsänderung**, kein bloßes UI-Renaming. |
| Grenzen | Verneinung und anatomische Belege bleiben Wortlisten. Beispielsweise `legs like a spider's` kann weiterhin einen Giftbeleg vortäuschen; laut Patchnote ein schon auf `.183` vorhandener Fall. Ein fehlendes echtes Artwort ergibt bewusst nur Grundbeute. |
| A2 | Weiterhin ursprüngliche zufällige humanoide Waffenbeute; keine Profile-/Loadout-/Angriffsänderung. Korrekt getrennt. |

### R1 – konkret geöffneter Nebenpfad: `traits` → Rollenwort → Geldautorität

**Tatsächliche Codefolge:**

1. `src/delta.js`: `traits` einer neuen Kreatur enthält nun den gemeldeten Langtext bis 240 Zeichen statt nur leerem `traits`; `descriptors` bleiben bei 40 Zeichen.
2. `src/v4/envelope.js` `roleText()`: setzt `occupation`, `descriptors`, **`traits`** und `template` zusammen. `mayTake()` erlaubt `fine/confiscation` bei einem Treffer von `AUTHORITY_ROLE` (u. a. `guard`) und `robbery` bei `HOSTILE_ROLE` (u. a. `thief`) oder Kampfbindung. Bei diesen Rollenwörtern prüft `mayTake()` nicht grundsätzlich, ob der Akteur ein NPC statt einer Kreatur ist.
3. `reactionEnvelope()` prüft `fine` für **alle** lebenden anwesenden NPCs **und Kreaturen**; `rob` filtert dort zwar auf NPC, der eigentliche `coerce()`-Pfad tut dies nicht.
4. `src/v4/world.js` `coerce()`: verlangt Präsenz, nicht-PC, Grund, keine Verkaufsgegenpartei und ggf. PULSE-Neuankömmlingsschutz; danach `mayTake()`, `grant('envelope.take')` und bei Münzen `coin.changed`. **Keine Kreaturensperre**.

**Isolierte Gegenprobe** am exakt aus `.184` übernommenen `AUTHORITY_ROLE`-Regex: Neue Kreatur mit `desc` = „a lean black hound with a scar on its snout, bred in the hills as a guard“; alter 40-Zeichen-`descriptor` = „a lean black hound with a scar on its sn“ → `guard` **kein** Treffer; neue `traits` mit der Vollbeschreibung → **Treffer**. Der Regex-Vergleich ist ausgeführt; kein vollständiger `coerce`-Hostturn oder Event-Fold.

**Einordnung:** Der alte Envelope hatte bereits das grundsätzliche Problem, Rollenwörter ohne sichere Akteurstypprüfung als Berechtigung zu lesen, wenn sie im kurzen Descriptor standen. `.184` **vergrößert die Eingabefläche** für dieses bestehende Problem durch den längeren Kreaturentext. Das ist ein echter, vom Patch nicht berücksichtigter Integrationspfad; nicht behaupten, Opus habe die gesamte Berechtigungslogik neu erfunden.

**Gezielte Folgeprüfung statt Refactor:** Mit einem schon anwesenden `creature`-Akteur und Rollenwort **erst hinter** Zeichen 40 im Host-/Weltpfad `reactionEnvelope.fine`, `mayTake(fine/confiscation)`, `coerce`-Refusal/gebuchtes `coin.changed` prüfen; ebenso `thief` / `robbery` getrennt. Negative Fälle müssen verhindern, dass ein nicht autorisierter Körperplan Geld oder Gegenstände wegnimmt; **positive** Gegenprobe: echter NPC-Wächter darf seine bisherige legitime Autorität behalten, tatsächlicher feindlicher Raub behält die bestehende Kampfregel. Die alte und die neue Beschreibung sowie PULSE-Neuankömmlingsschutz getrennt testen. Wenn bestätigt: **kleinste typgebundene Absicherung an der bestehenden Autoritätsgrenze**, nicht `traits` aus A1 zurücknehmen und nicht pauschal sämtliche Raubereignisse verbieten. Fachliche Freigabe durch den Nutzer nötig, bevor Produktionscode geändert wird.

## 3. Replay-Akzeptanz unabhängig strukturell geprüft

Die beiden echten Git-Dateien `accepted_batch182_vs_126.json` und `accepted_monster184_vs_126.json` wurden als JSON gelesen und **alle** Einträge miteinander verglichen:

- **1068 alte** → **1074 neue** akzeptierte Einträge.
- **951** alte Akzeptanzen unverändert, **117** durch Monster-A1-Akzeptanzen ersetzt und **6** neu hinzugefügt.
- Unter den **123** A1-Akzeptanzen: **114 × `monster184 creature look`**, **9 × `monster184 no venom from the anchor attack`**.
- Bei den 117 Ersetzungen stimmt `previous_acceptance_182` für **Kategorie und exakten früheren Fingerprint** ausnahmslos mit der vorherigen Liste überein; `returned` ist unverändert. **0** fehlerhafte Vorgängerzuordnungen.
- Der neue `replay.test.js`-Schutztest kontrolliert Zahlen, Kategorien, Vorgängerreferenzen und begründete Textmuster. Er verifiziert **nicht selbst** durch feldweises Nachspielen, dass jeder als reiner `traits`-Unterschied klassifizierte Vollrecord tatsächlich bis auf dieses Feld identisch zu `.183` ist; diese stärkere Prüfung ist in der Patchnote als Ausführung des Implementierers berichtet, hier **nicht unabhängig wiederholt**.

**Nachweisgrade:** `9/9` neue Regressionen, `219/219` angrenzende Tests, `3118/3118` Node-Suite, `44/44` Replaytests und `1074/1074` Korpuscheck **laut Opus**; nicht in diesem Gegenreview ausgeführt. Unsere eigenen Prüfungen: vollständiger Produktdatei-Diff, Fachplan/Kanon-Abgleich, strukturierter JSON-Akzeptanzvergleich und isolierte Regex-Gegenprobe. Kein aktueller ST-Smoke, kein erneuter Replay-Fold und kein natürlicher Modelllauf.

## 4. Abschluss und nächster Schritt

**Keine verpflichtende Neufassung von A1** aus den Kernregeln. Die 123 Replayänderungen sind hinsichtlich ihrer Kategorien und Herkunft nachvollziehbar, die Neuabnahme bleibt an die noch ausstehende Integrationsprüfung R1 gebunden.

**Ein enges zusätzliches Test-/Korrekturthema R1** an `src/v4/envelope.js` /`world.js` prüfen; es betrifft die durch A1 erweiterten `traits`-Eingaben und ist für die laufende Fable-Payment-Analyse als begrenzter Geldautoritäts-Randfall relevant. **Keine Produktänderung durch diesen Review.** Danach erst unabhängigen ST-Test in isolierter SillyTavern und einen natürlichen A1-Lauf als eigenständige Nachweise. A2-Designentscheidungen und -Entwicklung bleiben separat.
