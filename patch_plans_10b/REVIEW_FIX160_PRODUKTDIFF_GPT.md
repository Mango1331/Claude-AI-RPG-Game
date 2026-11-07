# GPT – unabhängiger Produkt-Diff-Gegenreview Build .160 (07.11.2026)

**Prüfgegenstand:** Produktcommit [`16e73581d`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/16e73581d470581982e2bc0bd6ff3d4379099be1) auf Basis von .159 [`2089dcc`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2089dccdb7fd3dc08c72c5737c6b111fb6512f56), fachlicher Sollplan [`PATCH_USER04_START_BOARD_STATE.md`](PATCH_USER04_START_BOARD_STATE.md) einschließlich GPT §7. Ergänzende Produktquelle: [`FIX160_USER04_GAMEPLAY_QOL.md`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/16e73581d470581982e2bc0bd6ff3d4379099be1/avereth-engine/docs/FIX160_USER04_GAMEPLAY_QOL.md).

**Ergebnis:** **Kein belegter Produkt-Diff-Stopper** für den nächsten natürlichen User-Test. Die funktionalen Änderungen folgen A/B/C1/C2 des freigegebenen Plans; die zuvor geforderte C2-Absicherung ist umgesetzt. Die erfolgreiche Node-/Replay-/ST-Abnahme ist in der Produktpatchnote dokumentiert. GPT hat den Diff und die Akzeptanzdateien **eigenständig gelesen und verglichen, aber keine Node-/ST-/Replayläufe erneut ausgeführt**. Zwei enge Hinweise bleiben (§5), kein Anlass für einen ungefragten Hotfix.

## 1. Unabhängige Quellen- und Prüfgrenze

Direkt via GitHub-Connector geprüft:

- vollständige **geänderte Pfadliste** des Commits .159 → .160: 19 Dateien; die **vier funktionalen Eingriffe** sind `content/campaign_start.json`, `src/v4/commands.js`, `src/context.js`, `src/v4/living.js`. Dazu konsistente Versionsänderungen in `manifest.json`, `package.json`, `src/util.js`, Testdateien, eine komprimierte User04-Fixture, Replayakzeptanzen und ST-Smoke-Werkzeug.
- die **Produktdiffs** der vier Funktionen und die neuen `fix160_user04_qol.test.js`-Assertions sowie angepasste alte Start-/Boardtests; die angrenzenden Originalfunktionen aus dem bisherigen .159-Gegenreview (`startCampaign`, `roomKnown`, `sealRefusal`, `npcCard`, `stateNow`, `buildContext`, `board.read`) waren bereits codebasiert geprüft.
- **beide echten vollständigen Akzeptanzdateien** `accepted_fix159_vs_126.json` und `accepted_fix160_vs_126.json`, direkt als JSON-Objekte verglichen: gleiche 517 Fall-IDs, **479 strukturell identische Einträge**; **38 geänderte Einträge** sind sämtlich `category: "fix160 board narration"` und halten `previous_acceptance_159` **strukturell gleich** zum vorherigen vollständigen Eintrag. Keine fehlenden oder zusätzlichen Fall-IDs; kein Verstoß gegen diese Metadatainvariante. Dies ist **noch kein eigener erneuter Nachweis**, dass in allen 38 aufgelösten Produktrecords tatsächlich nur eine Textzeile anders war; diese strengere Aussage stammt aus Sols Replayprüfung.
- [Produktpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/16e73581d470581982e2bc0bd6ff3d4379099be1/avereth-engine/docs/FIX160_USER04_GAMEPLAY_QOL.md) und `qol160_smoke.mjs`: dokumentierte Abnahme **24/24 gezielte Tests**, **2822/2822 Node**, **2235 Replayfälle** (517 akzeptiert, 0 offen/veraltet), **ST 42/42 Standard und 47/47 Failsoft**, jeweils ohne PageErrors. **Diese Ergebnisse wurden von Sol berichtet, nicht von GPT erneut gerechnet.** Der Smoke verwendet einen geskripteten Provider; seine Assertions betreffen Host, Kontext und Buchungen, nicht die freie Narratorqualität.

## 2. Änderung A – PC-Basis 5

**Bewertung: korrekt und eng.** Im Produktdiff werden exakt sechs Anfangswerte in `campaign_start.json.pc.stats` von 7 auf 5 geändert. Es gibt keinen neuen Save-Migrationspfad, keine Änderung der Formeln, Monster, XP, First-Strike-Mechanik oder Progression. Dies entspricht `startCampaign()`, das die Content-Stats in den `campaign.started`-Event kopiert; bestehende Eventstarts behalten ihren historischen Wert. Die revidierten `patch_pc_start_stats.test.js`-Assertions prüfen sowohl 5er-Starts über Runtime/Ruleset als auch einen **wirklichen künstlich mit dem alten Content erzeugten 7er-Eventstart** nach Klasse, Skills und JSON-Reload; das ist deutlich belastbarer als ein bloßes Patchen eines Statsfelds.

Die dokumentierte deterministische User04-Erstkampf-Gegenprobe `Wave → Wave → Basic Attack` endet mit Basis 5 bei **1 → 0 HP**, Basis 7 mit **34 → 17 → 17 HP** und identischen alten Kampfrecords. Das zeigt einen gravierenden lokalen Gameplayeffekt, ist aber eine **bekannte und bewusst nicht kompensierte Designfolge**, nicht ein neuer technische Regression. Für den natürlichen Test auf frühe Gegnerkommunikation, Kampfbegegnungen und Überlebensfähigkeit achten; kein unbeauftragter pauschaler Balancefix.

## 3. Änderung B – Questboard ohne doppelten Narratorkatalog

**Bewertung: korrekt am Entstehungspunkt geändert.** `HANDLERS['board.read']()` baut nur für den C-Produktpfad jetzt einen `presentation`-Auftrag: Die Systemkarten übernehmen den offiziellen Katalog, der Erzähler schildert die Leseszene kurz mit Atmosphäre/NPC-Reaktionen und soll nicht sämtliche Questtitel/Ziele/Belohnungen/Risiken erneut ausgeben. `rows` und alle offiziellen Questreferenzen bleiben mit `REFERENCE ONLY` verfügbar. Das repariert die bisherige positive „present the notices in the existing title-first readable format“-Anweisung ohne globale Promptänderung.

Die bestehenden `ahead`-Conditionals für `GO + board.read`, der `board.shown`-Event nach bestätigter Hallankunft, Generatorfehler, Karten-/Detail-/Risk-Anzeige, erneutes Lesen und die Quest-/Zahlungsregeln wurden nicht umgebaut. Angepasste bestehende Tests prüfen den neuen Auftragswortlaut; neue Tests prüfen die Fünf-Karten-Darstellung und die bedingte Buchung. Der tatsächliche **freie** Narrator kann dennoch Text wiederholen; als User-Test-Kriterium prüfen, nicht aus scripted Smokes als garantiert behoben ableiten.

**Tokenfolgen nicht überverkaufen:** Die Ausgabe kann kürzer werden, die vollständigen Referenzzeilen bleiben als Eingabe; die konkrete Instruktion ist länger. Sol beansprucht zu Recht keine gemessene natürliche Kostenersparnis.

## 4. Änderungen C1/C2 – aktuelle Erzählzustände

### C1 – Bewusstsein des Titan ohne erfundenen Sichtkontakt

**Bewertung: korrekt begrenzter Eingriff.** `outcomeLines()` kennzeichnet die Start-Awareness als **ENTRY, BEFORE the attack**, `stateNow()` gibt für noch lebende Mitglieder des betreffenden Kampfboards deren **aktuelle observerbezogene Awareness** an und ordnet vorherige Ankunfts-/Opening-Stealth als historische Phase ein. Die Pflichtsektion `resolved` trägt den Hinweis auch, wenn die optionale ausführliche `present`-NPC-Karte unter Kontextdruck wegfällt. `npcCard()` erklärt bei laufendem V4-Kampf mit `aware` den verbliebenen `concealed`-Marker, ohne den Spieler zwangsläufig als sichtbar oder identifiziert zu behaupten. Kein Angriff, Kampfzustand oder Concealment wird umgeschrieben.

Die neuen Tests prüfen das originale I82-Fenster sowie das Beibehalten echten `unaware` vor dem Hinterhalt und die Nichtmutation der State-Kopie. Der Mechanismus verhindert keine **beliebige** LLM-Prosaabweichung; die durch die Engine gelieferte aktuelle Faktenlage ist jetzt jedoch widerspruchsärmer.

### C2 – Guardian-Siegel und bekannte Floorverbindung

**Bewertung: explizit die GPT-Auflage umgesetzt.** `guardianAccessLines()` in `living.js` ist eine reine Zustands-/Textfunktion. Sie prüft Dungeonzuordnung, existierende benachbarte Floors, nicht versteckte und bekannte abwärts zulässige Verbindung, eine echte statische Guardian-`sealed`-Regel und den aktuellen `x.run.floors[n].cleared`-Wert. `sealRefusal()` bleibt zusätzliche operative Zugangsprüfung; **ihr `null` alleine führt nicht mehr zu „RELEASED“.** Ein früher bereits besuchter unterer Raum darf bei noch geschlossenem Siegel nicht als besiegter Guardian umgedeutet werden. Separate aktive `blockerOf`-Features werden weiter ausdrücklich genannt; keine Bewegung oder NPC-Kenntnis wird gebucht.

`buildContext()` hängt den Hinweis an die verbindliche `resolved`-Sektion sowohl bei lokalem Floor als auch bei eindeutiger externer Dungeonfrage. Die Tests decken I52, I60, I66, die Zeit nach Reset, zuvor besuchten Zielraum, nie vorhandenes Siegel, versteckte/ungültige Verbindungen, separate Türblockade und ein sachfremdes Gildengespräch ab. Eine persistente zweite Siegelwahrheit entsteht nicht.

## 5. Kleine Auffälligkeiten und bewusste Grenzen

**N1 – Nebenwirkung in der alten V3-Personen-NPC-Textdarstellung (niedrig):** Durch die gemeinsame Konstante `concealment` wird bei **V3-NPCs** der exakte Satz `Alaric is currently UNSEEN by others` zu `Alaric is currently UNSEEN`; für Kreaturen blieb die Form bereits vorher ohne `by others`. Die Produktpatchnote sagt, die V3-Karten behielten ihre bisherige Darstellung. **Mechanisch ändert diese Formulierungsverkürzung nichts; sie ist aber wörtlich keine völlig unveränderte V3-NPC-Karte.** Empfehlung: bei Gelegenheit den V3-Wortlaut in diesem einen Zweig bewahren oder die Aussage in der Dokumentation präzisieren; kein Hotfix vor User-Test erforderlich.

**N2 – Etwas höherer Pflichtkontext (beobachten):** Laut Produktpatchnote steigt bei den fünf verglichenen User04-Anforderungen der geschätzte Gesamtumfang zwischen **43 und 64 Tokens**, etwa I52 1726 → 1770 und I72 1579 → 1643. Pflichtüberlauf bei I52 186 → 230, bei I72 65 → 129 geschätzte Tokens; bei den fünf Nachweisen **keine zusätzlichen optionalen Drops**. Diese Werte stammen aus Sols gemessenen Kontextblöcken, nicht aus GPT-eigenen Modellaufrufen. Für die nächste PULSE-Integration ist der Priorität-0-Budgetdruck eine echte Integrationsvorgabe. **Kein Grund für eine globale Kontexterhöhung im kleinen .160-Fix.**

**N3 – Externe Fragen bei mehreren möglichen Dungeonreferenzen (Beobachtungsgrenze):** `buildContext()` priorisiert den aktuellen `dun`-Ort und sonst den einen ausdrücklich benannten Dungeon bzw. den einzigen nahegelegenen Dungeon bei einer Dungeonfrage. Das ist für die belegten User04-Fälle ausreichend. Bei gezielten Fragen über einen **anderen** bekannten Dungeon, während Alaric selbst in einem Dungeon steht, könnte der aktuelle Ort Vorrang erhalten; und bei mehreren unbenannten bekannten Dungeons wird außerhalb kein Status geliefert. Das ist die bewusste Vorsicht gegen erdachte Auskunft, darf aber in künftigen Mehr-Dungeon-Tests beobachtet werden. **Kein User04-Stopper und keine hier nötige neue Retrievalarchitektur.**

## 6. Abnahmeempfehlung und Testauftrag

**GPT-Diff-Gegenreview: keine kritischen offenen Produktänderungen festgestellt. Empfehlung: .160 jetzt natürlich testen; kein weiterer technischer Patch vor dem Run.** Die mechanische Aussage über 24/2822/2235/42/47 grün gilt als Sols dokumentierte Abnahme, nicht als eigenständig erneut ausgeführte Messung.

Für den nächsten natürlichen User-Test genügen wenige gezielte **Beobachtungspunkte ohne erzwungenen Testablauf**:

1. Bei einem **neuen** Charakter: die sechs Startattribute tatsächlich 5, Favored +1; frühere alte Saves bleiben bei 7.
2. Am Questboard: **fünf echte Karten**, aber keine zusätzliche vollständige zweite Questliste im Fließtext; eine gezielte Nachfrage zu einem Auftrag soll weiterhin natürlich beantwortet werden.
3. Beim Hinterhalt: Wer nach einem Treffer mechanisch `aware` ist, darf als alarmiert gelten, ohne dass der Narrator unnötig vollständigen Sichtkontakt behauptet.
4. Nach einem Guardian-Clear: Zugang zu Floor 2 als freigegeben beschreiben, **ohne automatischen Floorwechsel**, getrennte Türen können noch blockieren; bei späteren Gesprächen sind Wissensgrenzen der NPCs weiterhin wichtig.
5. **Spielgefühl:** frühe Überlebensfähigkeit mit Basis 5 notieren, keine unbewiesene allgemeine Balanceaussage aus dem einen tödlichen Gegenfall ableiten.

**Offen und unverändert getrennt:** User04-Mischsuche, konsumiertes Knochenobjekt, Gilden-Clerks/Präsenz, erneute ausgeschriebene Pre-Reset-Quests, PULSE W5/W6/W7 und großflächige Balance. Historische User04-Originale/Reviews bleiben unangetastet. PULSE-Folgeplanung muss auf **.160** statt .159 aufsetzen.

