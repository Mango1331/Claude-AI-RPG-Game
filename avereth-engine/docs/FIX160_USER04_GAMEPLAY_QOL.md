# .160 — User04: Startwerte, Boardprosa und aktuelle Erzählzustände

**Basis:** `.159` / `2089dccdb7fd3dc08c72c5737c6b111fb6512f56`. Gemeinsamer kleiner Gameplay-/QoL-Patch, vom Nutzer nach dem Gegenreview am 07.11.2026 zur Umsetzung freigegeben. Fachplanung und unabhängiger GPT-Gegenreview einschließlich der übernommenen C2-Präzisierung: [Plan auf main](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00b887ee3519663b2c23a081fe84529ba77b9f13/patch_plans_10b/PATCH_USER04_START_BOARD_STATE.md). Die ausführliche Ursachenermittlung bleibt dort und im [User04-Review](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00b887ee3519663b2c23a081fe84529ba77b9f13/testrun_10b/user-20261106-072640/REVIEW.md).

## Umsetzung und Bewertung des Gegenreviews

**A — neue Charaktere:** Die sechs `pc.stats` in `content/campaign_start.json` stehen auf **5**. Favored bleibt +1 auf zwei Attribute; Formeln, Ausrüstung, XP, Gegner, First Strike und Attributprogression bleiben gleich. Kein Reducer-/Lade-/Migrationspfad geändert. Alle neuen Kampagnen verwenden die gemeinsame Vorlage. Vollständig gespeicherte 7er-Starts und selbst eine damit begonnene, noch nicht abgeschlossene Erstellung behalten ihre Werte und Ressourcen.

| L1 mit Produkt-Starterkit | Favored / übrige Stats | HP | MP | Initiative | DEF / MDEF |
|---|---|---:|---:|---:|---|
| Warrior | STR/VIT 6, übrige 5 | 85 | 60 | 7 | 7 / 3 |
| Mage | INT/WIL 6, übrige 5 | 80 | 72 | 7 | 3 / 4 |
| Rogue | AGI/PER 6, übrige 5 | 80 | 60 | 9 | 3 / 4 |

Die konkret nachgewiesene Härte wird nicht verdeckt ausgeglichen: Im unveränderten User04-Erstencounter L5/L4/L3 mit Wave → Wave → Basic Attack reproduziert die 7er-Kontrolle **34 → 17 → 17 HP** und die drei Original-Kampf-Recordlisten exakt. Der 5er-Gegenfall endet bei **1 → 0 HP**, also Tod vor der dritten Aktion. Geänderte Initiative verändert auch Tie-Breaks und RNG-Verbrauch. Dies ist eine feste Aktionsgegenprobe, keine Behauptung allgemeiner Unspielbarkeit oder ein neuer natürlicher Modelllauf.

**B — Questboard:** `HANDLERS['board.read']()` in `src/v4/commands.js` weist im C-Pfad die vollständige Katalogausgabe den bestehenden **System cards** zu. Die bisher ausdrücklich verlangte vollständige title-first-Prosa entfällt. Der Narrator soll die kurze Leseszene, Atmosphäre und NPC-Reaktionen erzählen. Vollständige Questzeilen bleiben als **REFERENCE ONLY** verfügbar; gezielte Einzelauskunft und Gespräche bleiben erlaubt. Frisches Board, Wiederlesen, Generatorfehler, bestätigte Ankunft, Conditionals und die Karten einschließlich Vertragsdetails/Gefahren bleiben erhalten. Andere historische Pfade behalten ihre bisherige Boardanweisung.

Das entspricht dem Gegenreview: Ein globaler Narratorvertrag hätte die widersprechende Actionanweisung stehenlassen. Das vollständige Löschen der Referenzdaten wäre für Rückfragen und insbesondere GO+Boardlesen ungünstig; dessen Karten werden erst nach bestätigter Ankunft angezeigt. Es wurde kein Questkatalogfilter und keine neue Boardarchitektur eingeführt.

**C1 — Awareness:** `src/context.js` markiert die Kampfstart-Awareness als **ENTRY, BEFORE the attack**. Das geschützte `STATE NOW` liefert zusätzlich die aktuelle observerbezogene Awareness lebender Beteiligter. Ein knapper Zusatz ordnet frühere Arrival-/Opening-Stealth zeitlich ein und macht ausdrücklich **keine** Zusage über exakten Sichtkontakt oder Identität. Im V4-Kampf erläutert `npcCard()` den noch gespeicherten Concealmentmarker entsprechend, statt ihn pauschal als aktuelle Unkenntnis des bereits `aware`-Beobachters auszugeben. Die entscheidende Aussage hängt nicht von der optionalen `present`-Sektion ab. V3-NPC-Karten behalten ihre bisherige Darstellung; der historische unidentifizierte Trapper bleibt als solcher geschützt.

**C2 — Guardian-Siegel:** `guardianAccessLines()` in `src/v4/living.js` ist eine reine Textableitung. Sie benötigt eine bekannte, sichtbare, abwärts begehbare Verbindung zwischen zwei tatsächlich existierenden benachbarten Dungeonetagen. **RELEASED** erfordert die Guardian-Siegelregel der oberen Etage, deren Clear im aktuellen `run` und eine nicht verweigernde bestehende `sealRefusal()`-Prüfung. Gerade `sealRefusal() === null` allein reicht nicht. Altbesuch, nie versiegelter Übergang, fehlende Struktur, verborgener Weg und Reset sind getrennt geprüft. Separate aktive Featureblockaden werden weiter benannt; die statische `sealed`-Spezifikation wird nicht verändert.

`buildContext()` liefert den kurzen aktuellen Accesshinweis im vorhandenen geschützten `resolved`-Abschnitt: lokal für die aktuelle Etage sowie bei einer zuordenbaren Frage zum bekannten Dungeon auch außerhalb, wie I66 in der Gilde. Mehrdeutige externe Etagenzuordnung erzeugt keine willkürliche Freigabe. Die Aussage bedeutet weder Ankunft auf Floor 2 noch zusätzliche NPC-Kenntnis. Keine alten Facts/Threads werden gelöscht; keine neuen Flags, Events oder Modellaufrufe kommen hinzu.

## Konkrete Regressionen

`tests/v4/fix160_user04_qol.test.js` und die überarbeitete `patch_pc_start_stats.test.js` umfassen zusammen **24/24 bestandene Fälle**. Auf `.159`: **zwölf Erwartungen rot, zwölf Kontrollen grün**. Abgedeckt sind die echten drei Starterklassen, beide Runtime-/Rulesetkombinationen für Starts, vollständige Ressourcen/Favored, Altstart und JSON-Reload, unveränderte XP-/Statvergabe, der feste Erstkampf, bedingtes Boardlesen vor/nach Ankunft, Karten/Details/Risiken, Wiederlesen, technischer Fehlschlag, aktuelles Awarenessende bei ausgelassener `present`-Sektion sowie C2 vor/nach Clear, außerhalb, nach Reset, mit Altbesuch, ohne Siegelregel, mit verborgenem/ungültigem Weg und mit separatem Featureblocker. Kontextbau wird auf Nichtmutation geprüft.

Die Fixture `tests/v4/fixtures/user04_qol159.json.gz` ist auf die nötige User04-Geschichte bis I82 reduziert: Texte, Events und Hostfelder, die drei Originalkampfaktionen, die gezielt benötigte Extraktion sowie die originale zweite Boardantwort. Keine Modellreasonings oder ST-Requestarchive. Original-Chat-SHA-256 und Produktcommit stehen in der Fixture. Die Boardantwort wurde mit dem tatsächlichen C-/COUNT-/Progression-Profil als vollständiges Fünferboard validiert; ein Legacy-Refillprofil wäre hier kein passender Originalfall.

Die angrenzende Prüfung besteht mit **118/118**. Bestehende 9A-Assertions wurden auf die absichtlich geänderten neuen Startwerte/Schadensformeln angepasst; Board-/STATE-NOW-Assertions prüfen die neue verbindliche Textform, während ihre Zustands-/Buchungsprüfungen bestehen bleiben. Keine historischen Originaldaten oder Kampagnenwerte wurden umgeschrieben.

## Vollständige Abnahme

| Nachweis | Tatsächlich ausgeführtes Ergebnis |
|---|---|
| Node-Vollsuite | **2822/2822**, 0 fehlgeschlagen, 0 übersprungen, Exit 0. Alle **237 Testdateien** aus dem `npm test`-Dateisatz mit Node `--test-concurrency=4 --test-reporter=tap`; Parallelität begrenzt, keine Suite ausgelassen. |
| Vollreplay | **2235 Fälle**; .159-Referenz zuerst mit 517 exakten Akzeptanzen und 0 offen/veraltet verifiziert; danach .160 vollständig gegen .159 und .126 verglichen. **517 exakt akzeptiert, 0 offen/veraltet.** |
| Echter ST1.19-Host, Standard | **42/42**, **0 PageErrors**, Exit 0. |
| Echter ST1.19-Host, Failsoft | **47/47**, **0 PageErrors**, Exit 0. |

Die echten Hostläufe nutzen den vorhandenen C-Smoke mit geskriptetem Provider und `AVERETH_SMOKE_QOL160=1`; Failsoft zusätzlich `AVERETH_SMOKE_FAILSOFT=1`. `tools/st_live/qol160_smoke.mjs` ergänzt fünf kurze Originalpfade: GO+Boardread, Titan-Ambush, Guardian-Clear, spätere Raumsuche und Gildengespräch. Geprüft werden **die tatsächlich ausgehenden Narratorrequests**, erfolgreiche Extraktion, fünf kanonische Karten erst nach Ankunft, unveränderte Zahlung/Position, Concealment mit aktueller Awareness sowie Save. Die normale Start-/Swipe-/Persistenz- und Failsoftprüfung bleibt Bestandteil des Laufs. Der neue frische Mage muss 5/6 und 80 HP / 72 MP haben; die eingesetzten Originalpräfixe behalten ihren 7er-Start.

Die ursprüngliche Playwright-Installation hatte kein Browserbinary; die Version des vorhandenen Testprojekts wurde mit ihrem passenden Headless-Chromium installiert. Abgenommen sind die danach vollständig erfolgreichen Läufe. Kein natürlicher Modell-, Langzeit- oder Windows-Usertest wird daraus abgeleitet.

## Replayänderungen im Einzelnen

Die neue Datei `accepted_fix160_vs_126.json` erhält **479 bestehende Akzeptanzeinträge vollständig unverändert**. Bei **38 bestehenden Einträgen** wurde unabhängig gegen das vollständige .159-Replayergebnis geprüft: Ausschließlich die `outcome.recorded.d.outcome.actions`-Zeile des Boardlesens ändert ihre Präsentationsanweisung und das Referenzlabel. **Die eigentlichen Referenzzeilen sind bytegleich; nach Rücknahme nur dieses Texteingriffs ist der gesamte Record exakt .159.** Kein Geld-, XP-, Quest-, Objekt-, RNG- oder sonstiger Eventwert ändert sich. Jeder dieser Einträge bewahrt seine vollständige vorherige .159-Akzeptanz unter `previous_acceptance_159` und pinnt den neuen exakten Fingerprint. Kein pauschales Neuakzeptieren.

| Run | Geänderte Recordnummern nach `#` |
|---|---|
| b16-rogue-sale | 5, 23, 69 |
| b17-mage | 5, 21, 71, 83, 141 |
| b17-rogue | 5, 29, 97, 117, 157, 219 |
| b17-warrior | 25, 135, 159, 217, 261, 295 |
| b18-mage | 7, 23 |
| b18-rogue | 29 |
| b18-warrior | 5, 59, 191, 235, 325 |
| b19-mage | 13, 47, 167 |
| b19-rogue | 13, 35, 51 |
| b19-warrior | 7, 41, 171, 351 |

Der historische Korpus überspringt Kampagnenstarts und fingerprintet keine Narrator-Kontexttexte. A wird daher durch die Start-/Altstandtests und C durch die gezielten Kontext-/ST-Prüfungen abgenommen; der Replaybefund allein wäre dafür kein vollständiger Nachweis.

## Gemessener Kontextumfang und Grenzen

Gleiche User04-Präfixe, Budget **1400**, Rulesbudget **800**, vier jüngste Züge. Für I72 wurde das ursprüngliche GO+Boardlesen auf beiden Produktständen mit derselben vollständig validierten Originalboardantwort neu berechnet, damit der neue Actiontext tatsächlich verglichen wird. Die anderen Fälle falten die gespeicherten Originalevents. Werte sind **Engine-Tokenschätzungen**, keine Providerabrechnung.

| Originalantwort | Gesamttokens .159 → .160 | Budgetzählung .159 → .160 | Pflichtüberlauf .159 → .160 | Optionale Drops auf beiden Ständen |
|---|---:|---:|---:|---|
| I52 Clear | 1726 → 1770 | 1586 → 1630 | 186 → 230 | present, relevant |
| I60 Suche | 1562 → 1605 | 1488 → 1531 | 88 → 131 | present, relevant |
| I66 Gilde | 1396 → 1440 | 1284 → 1328 | 0 → 0 | keine |
| I72 Board | 1579 → 1643 | 1465 → 1529 | 65 → 129 | present, settlement, relevant |
| I82 Titan | 1445 → 1492 | 1242 → 1289 | 0 → 0 | relevant |

Die tatsächlichen fünf Standard-Hostrequests liefern jeweils dieselben .160-Gesamtwerte. **Keine zusätzlichen optionalen Drops in diesen fünf Gegenproben**, keine globale Budgeterhöhung. Bereits bestehender Pflichtüberlauf wird transparent um 43–64 geschätzte Tokens erhöht. Es wird keine Dungeonchronik in `resolved` kopiert. Das allgemeine Kontextbudgetproblem bleibt beim getrennten NPC-/Kontextvorhaben.

Der originale I72-Prosa-Katalog hatte 1874 Zeichen / 314 Wörter bei insgesamt 828 gemeldeten Completiontokens für die ganze Antwort. .160 adressiert diese sichtbare Wiederholung; Referenzdaten bleiben als Eingabe erhalten und die neue Instruktion ist etwas länger. **Keine gemessene natürliche Token-/Kostenersparnis beansprucht.** Die kurzen Smokeantworten sind fest geskriptet und keine Aussage über die Befolgungsquote eines freien Narrators.

## Umfang und Anschluss

Funktionale Änderungen bleiben bei den geplanten vier Dateien: Startcontent, `commands.js`, `context.js`, `living.js`; zusätzlich Versionsmetadaten, Tests/Fixture, Replayakzeptanzen und ST-Prüfwerkzeug. Kampfengine, Eventreducer und Host-Produktpfad wurden nicht verändert. Keine Balancekompensation, NPC-Kontinuitätsreparatur, gemischte Suche, Objektverbrauchs-/Questresetänderung, PULSE oder Rastgefahr. Nächster normaler Schritt: unabhängiger Produkt-Diff-Gegenreview und natürlicher User-Test; kein neuer Pflichtbatch.
