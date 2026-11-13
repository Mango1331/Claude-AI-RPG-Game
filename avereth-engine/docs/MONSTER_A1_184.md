# .184 — Monster A1: Anatomie und Beute

**Basis:** `.183` (`86465eb`).

**Grundlage:** [Fachplan Monsterkörper und Beute](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md):
- §3.1 Nr. 1–10 und §5.1;
- GPT-Gegenreview §8 und Opus-Mini-Gegenreview §9 mit K1 (Verneinung) und K2 (Beutename als Identitätsänderung);
- D6 (Schleimkern nur mit Beleg) und D9 (Wortlisten einschließlich negativer Merkmale), vom Nutzer freigegeben.

**Abgrenzung:**
- **Kein A2:** Humanoide Waffenbeute bleibt die alte Zufallsquote (`gear`).
- Keine neuen Monsterfähigkeiten; Kampfwerte, XP, Quests, Populationen und Extractor-Vertrag unverändert.
- Ein lokal laufender Batch auf `.183` bleibt unberührt.

## Korrektur

| # | Stelle | Änderung |
|---|---|---|
| 1 | `monsters.json` `loot.anchors.deer.antler` | `only_if` Geweih: `antlers?`, `antlered`, `stags?`, `harts?`, `elks?`, `moose`, `reindeer`, `caribou`, `wapiti`, `roebucks?` („buck“ bewusst nicht) |
| 2 | `deer` | neues Material `horn` (`[0, 2]`, 3 cp): `horns?`, `horned`, `goats?`, `ibex`, `rams?`, `antelopes?`, `chamois`, `gazelles?` |
| 3 | `horse` | neues Material `horn` (`[0, 2]`, 3 cp): `horns?`, `horned`, `ox(en)`, `bulls?`, `cows?`, `cattle`, `aurochs`, `bison`, `buffalo`, `yaks?` |
| 4 | `ogre.tusk` | `only_if` `tusks?|tusked` |
| 5 | `slime.core` (D6) | `only_if` `cores?|crystal…|mineral|nucleus|gem…` (Glimmerdeep-Mineralschleime erfüllen ihn über ihre Art) |
| 6 | `anchors.rat.aliases` | `hare`, `hares`, `rabbit`, `rabbits`; die vorhandene Ankerkorrektur macht einen als `deer` gemeldeten Hasen zur Ratte |
| 7 | `loot.js` | Belegtext ohne den Ankerangriff: Art, Name, Deskriptoren und volle Beschreibung (`traits`). „Bite/Sting“ ist kein Gift, „Kick/Antler“ kein Geweih |
| K1 | `monsters.json` `unless` + `loot.js` (eine Zeile) | Eine eigene Verneinung der Kreatur schlägt das Artwort; geprüft vor `only_if`. Geweih (`antlerless`, „no/without/lost/missing/broken … antlers“), Horn (`hornless`, `dehorned`, `polled`, …), Hauer (`tuskless`, …), Gift bei Schlangen und Gliedertieren (`non-venomous`, `non-poisonous`, `harmless`, „not/no/without … venom/poison“), Kern (`coreless`, …; D9-Ergänzung) |
| 8 | `delta.js` | Eine Kreatur behält ihre ganze gemeldete Beschreibung als `traits` (verbunden, ≤ 240 Zeichen, wie bei Personen). `descriptors` bleiben unverändert (40 Zeichen, Identität) |
| 9 / K2 | `loot.js` `speciesName` | Ein Anhang „of the …“ ist nicht Teil der Art: „feral dog of the millpond“ ergibt „F-Rank Feral Dog Fang“ statt „Of The Millpond Fang“. Bleibt davor nichts übrig („of the deep“), gilt die alte Regel |
| 10 | `loot._rule` | Regeltext ergänzt |

**K2 ist eine Identitätsänderung:**
- Der Stapelschlüssel `obj.loot.<art>.<material>.<rang>` folgt dem gekürzten Namen.
- Dieselbe Art aus zwei Orten ergibt einen Stapel; zwei Arten „of the millpond“ ergeben zwei (in `.183` verschmolzen sie zu einem).
- Ein schon gehaltener Altstapel behält seine ID und bekommt nichts dazu; neue Beute legt einen eigenen Stapel an.

## Abnahme

| Prüfung | Ergebnis |
|---|---|
| Neue Regressionen | `tests/v4/fix184_monster_a1.test.js`: **9/9**. „Möglich“ heißt in mindestens einem von 16 Kämpfen, „keins“ in keinem |
| Rot gegen `.183` | **7 von 9 rot** (Produktdateien auf `.183`): P1–P7, P8/K2, P9, N1–N8 samt K1-Gegenfällen, K2-Stapel, Grundertrag (Käfer nur Chitin), echter Erzeugungsweg (P9/N3) |
| Auf beiden Ständen grün | N9 (keine Beute von Geflohenen, Ergebenen, Überlebenden oder bei Alarics Flucht) · kein A2: Goblin-Messer und Oger-Keule weiter als Zufallsquote |
| Pflichtfälle §5.1 und §8.4 | P1–P9; N1–N9; „hornless goat“, „doe without antlers“, „tuskless ogre“, „dehorned goat“, „goat without horns“, „non-venomous grass snake“, „grass snake, not poisonous“ (beide schon in `.183` falsch), positiver Kontrast „rare antlered doe“; zwei „… of the …“-Arten; Merkmal nach Zeichen 40 |
| Geänderter Bestandstest | `hotfix_scroll` „3b“ erwartete ein **neu angelegtes** Beuteobjekt. Das war die falsche „Crystal Beetle Venom Gland ×5“ aus „Bite/Sting“ (N4); die Chitinplatten wandern in den schon gehaltenen Stapel (`object.added`). Der Test erkennt jetzt beide Buchungsformen an und prüft zusätzlich, dass keine Giftdrüse entsteht |
| Angrenzende Suites | `c664`, `c665`, `combat_1021`, `c132_population`, `patch8*`, `fix18*`: **219/219** |
| `npm test` | **3118/3118** (`.183`: 3108) |
| Replay gegen `.183` | **2235 Fälle, 123 geändert**, jeder einzeln zugeordnet und automatisch nachgeprüft (unten) |
| Voller Korpuscheck | `accepted_monster184_vs_126.json`: 1074 abweichend, alle mit exaktem Fingerprint akzeptiert, 0 offen, 0 veraltet. Die 951 übrigen `.182`-Einträge sind byte-gleich, 117 neu akzeptiert mit ihrer `.182`-Akzeptanz, 6 neu; ein Schutztest in `replay.test.js` prüft das |
| ST1.19 Standard/Failsoft | **nicht ausgeführt:** keine isolierte SillyTavern-Installation in dieser Umgebung. **Offen** wie seit `.180` |

**Die 123 Replay-Änderungen:**

| Gruppe | Records | Prüfung |
|---|---|---|
| Kreaturen behalten ihre Beschreibung (114) | jede Antwort, die eine Kreatur mit Beschreibung anlegt | Ohne das neue `traits`-Feld ist der Record exakt die `.183`-Ausgabe. Bei allen 172 betroffenen Kreaturen ist `traits` die gemeldete Beschreibung (≤ 240 Zeichen, beginnt mit dem bisherigen Deskriptor). |
| Kein Gift aus dem Ankerangriff (9, N4) | b17-rogue #65, #85, #135, #147, #183, #185, #187, #257, #263 | Giftdrüsen von Bog Striders und Glass Beetles entfallen. Art, Name und Beschreibung dieser Tiere tragen kein Giftwort, nur „Bite/Sting“ hatte sie gegeben. Sonst gleich, bis auf `traits`. |

**Im Korpus ohne Änderung:** Geweih-, Horn-, Hauer-, Hasen- und „of the …“-Beute kommen im Korpus nicht vor. Schleimkerne von Mineralschleimen bleiben (Artwort „mineral“). Diese Pfade belegen nur die Regressionen.

## Grenzen

- **Wortbasiert:** Eine Fantasieart ohne passendes Wort bekommt nur den Grundertrag ihres Körperplans. Eine ungewöhnlich formulierte Verneinung kann durchrutschen, ein Vergleich gilt als Artwort. Im Korpus kommen zwei solche Vergleiche vor: zwei Bog Striders mit „legs folded like a spider's“ bzw. „spider-like legs“ zählen als „spider“ und können Gift liefern. Das war über ihren Deskriptor schon in `.183` so und ändert sich hier nicht.
- **`traits` bei Kreaturen:** Die Erzählerkarte zeigt jetzt die volle Beschreibung (etwas mehr Kontexttext). `envelope.roleText` liest sie ebenfalls; Rollenwörter jenseits von Zeichen 40 (etwa „thief“) könnten dort neu zählen. Im Korpus ist das nicht aufgetreten.
- **Wirtschaft:** etwas weniger Geweih, Hauer, Kern und Gift im Verkauf, Horn neu. Eine bewusst kleine Wirtschaftsänderung.
- **Zahlen:** Die Wortlisten und Mengen (`[0, 2]`, 3 cp) sind Designwerte aus dem Fachplan, nicht gemessen.
- **Altstapel:** Alte „Of The …“-Stapel bleiben im Inventar bestehen (unschön, kein Integritätsfehler).
- **A2** (Bewaffnung, Waffenbeute aus Besitz) ist nicht Teil dieses Builds.
