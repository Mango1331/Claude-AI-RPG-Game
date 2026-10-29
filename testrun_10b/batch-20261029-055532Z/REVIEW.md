# Unabhängiger GPT-Originalreview – Batch 12, erste natürliche AoE-Serie .116

**Stand: 29.10.2026.** Original-Upload `batch-20261029-055532Z.zip` vollständig geprüft, Originalevents und Spielerinputs gegen `run.json`, `evaluation.json`, `player.jsonl` und auffällige Kampfausgänge abgeglichen. Ausschließlich Dokumentation/Designbewertung; **keine Produkt-, Runner-, Regel- oder Balanceänderung**.

## 1. Originalquelle, Integrität, Profilenden

- Original-ZIP: **53.499.145 Bytes**, **49 Einträge**, vollständige ZIP-CRC-Prüfung **ohne Fehler**, SHA-256 **`5ae500e751c0628396f7d8647461522cade6769404a50d4cd11d1430395298c1`**. Die Original-ZIP und Logs liegen nur als Chat-Anhang vor, **nicht auf `main` hochgeladen**.
- Alle drei: **Build `4.3.0-c.6.6.116`**, Produktcommit **`41a17fc50ba2`**, `stub=false`, `zai-org/GLM-5.3-Flash` als Runner-LLM, sauberer Branch, `profileUnchanged=true`, `secretHits=0`. Neue Start-Events besitzen **`starter_aoe:true` und `f_balance:true`**.
- Die finalen Engine-Statuszeilen melden **`integrity: OK`**, keine Browser-PageErrors, keine ServerErrors; **ein** nichtfataler World-Extractorfehler beim Mage. Die ZIP-CRC und Eventstrukturen wurden geprüft, **keine eigenständige vollständige `foldChat`-/`validateState`-Ausführung** durch diese GPT-Analyse. `batch.status=completed` meint abgeschlossene Runnerprozesse, nicht Erreichen von Level 15. Die `exit.code=2`-Felder der drei Batch-Runs stehen auch bei regulärem Inputlimit und sind **keine** drei fatalen Enginefehler.

| Profil | LLM-Spielerinputs | Engine-Turns | Endlevel | Ende | Encounter | Guildabschlüsse |
|---|---:|---:|---:|---|---|---:|
| **Guild-Warrior** | **31** | **31** | **1** | **mechanischer Tod**, L1 gegen vier L5–7-Eber | **1 Sieg/2 Kämpfe** | **1** |
| **Guild-Mage** | **150** | **132** | **8** | **Inputlimit**, überlebt; 1 sichere Extractor-Fortsetzung | **15 Siege/15 Kämpfe** | **9** |
| **Guild-Rogue** | **150** | **125** | **4** | **Inputlimit**, überlebt; 1 Kampfflucht | **6 Siege/7 Kämpfe**, 1 Flucht | **3** |
| **Gesamt** | **331** | **288** | | **1 Tod, 2 Limits, 0 finale technische Stopps** | **22 Siege / 24 Kämpfe**, 1 Flucht, 1 Tod | **13** |

**Engineevents:** 427 (Warrior) + 1.922 (Mage) + 1.762 (Rogue) = **4.111**. Charaktererstellung in allen drei Fällen tatsächlich gebucht: **Warrior `warrior.cleave` + `warrior.guard`**, Mage **`mage.arcane_wave` + `mage.arcane_bolt`**, Rogue **`rogue.fan_of_blades` + `rogue.razor_cut`**; Basic Attack zusätzlich. Runner-Szenario wurde nicht durch Skillinjektion erfüllt.

## 2. Wichtigstes Ziel der .116-Abnahme: natürlich ausgeführte AoE

Die Skill-Auswahl ist in allen drei Profilen korrekt; die tatsächlichen AoE-Buchungen sind **nur vier Aktionen mit fünf einzelnen Treffern** (nicht vier Mehrzielangriffe):

| Profil | Erfolgreiche Aktionen | Enginebeleg | Getroffene Ziele/Kosten |
|---|---:|---|---|
| Warrior **Cleave** | **2** | Engine-T14 und Engine-T29 | 1 Marsh Serpent **31** Final Damage, **10 STA**; 1 Wild-Boar-Sow **22** Final Damage, **10 STA**. Jedes Mal nur **ein** Ziel tatsächlich in ENGAGED beim Auflösen der Aktion. |
| Mage **Arcane Wave** | **1** | Engine-T72, `enc.t72` | **zwei** Tusked Boars im gewählten **SHORT**-Band, **38 + 39** Final Damage; **einmal 14 MP** (`210→196`), beide Ziele werden individuell getroffen. |
| Rogue **Fan of Blades** | **1** | Engine-T50, gegen Glimmer Queen | ein gültiges Ziel in **SHORT**, **19** Final Damage und **einmal 10 STA** (`70→60`). **Kein natürlicher Mehrzieltreffer** des Rogue. |

**Reichweiten-Verweigerungen:** Warrior-Cleave wird mehrfach korrekt mit `needs a valid target ENGAGED …` zurückgewiesen: Engine-T12/T13 sowie T23–27, bevor ein Gegner tatsächlich in Reichweite ist. Der Versuch T27 gegen eine SHORT-Kreatur kann ohne passenden Schritt/Bewegungszustand keinen Treffer auslösen. Beim Rogue sind Fan-of-Blades-Versuche in Engine-T23, T27 und T47 korrekt unzulässig (Ziele MEDIUM/MEDIUM/LONG bei Reichweite höchstens SHORT). **Keine Ressourcenabbuchung für unzulässige Angriffe oder nachgewiesener AoE-Schadensbug.** Diese wiederkehrenden Fehlversuche sind dennoch relevant für die taktische Verständlichkeit des Bandkonzepts und die Spielerstrategie.

**Zielmengen:** Im tödlichen Warrior-Kampf treten vier Eber auf. Die `encounter.started`-Momentaufnahme enthält teils bereits nachlaufende Gegnerbewegungen; die einzelne gebuchte Cleave-`strikes`-Zeile trifft die Sau, bevor weitere Gegner wirksam in Nahkampfreichweite angreifen beziehungsweise heranrücken. **Nicht** allein aus der späteren Encounter-Snapshot-Bandposition einen fehlenden AoE-Treffer behaupten. Neu nachgewiesen ist beim Mage das **korrekte Zwei-Ziel-Bandverhalten**. Nicht getestet sind hier natürliche Mehrziel-Cleave, Mehrziel-Fan, Freundbeschuss, Deckungs-Sonderfälle und eine wiederholte Band-AoE unter sich ändernden Positionen; diese Bereiche besitzen die .116-Regressionen, aber keine gleichwertige natürliche Abnahme aus diesem Batch.

**Balancefolgerung:** Dass Rogue 150 Eingaben überlebt, beweist **keinen AoE-bedingten Überlebensgewinn**: sein erfolgreicher Wolf-Doppelkampf ist kein Fan-of-Blades-Mehrzielangriff. Mage nutzte Arcane Wave einmal, obwohl er 15 Kämpfe absolvierte. AoE-Pflicht bei der **Starterauswahl**, nicht beim taktischen **Einsatz**, war korrekt begrenzt. Keine direkte Anpassung der Kosten oder Rohpower aus diesen vier Nutzungen.

## 3. Warrior-Tod: konkret gefährliche Begegnung, kein belegter Klassenschaden-Bug

- Warrior startet nach Marsh-Serpent-Sieg und abgeschlossenem **35-cp-/46-XP-Gildenauftrag** mit **70 kumulierten XP** weiterhin auf **Level 1**; vor dem entscheidenden Eberkampf stehen ihm nur **36/95 HP** zur Verfügung.
- Die **vier** Gegner des `enc.t29` sind **Level 7/7/5/5**; die alte Sau hat **86 HP/ATK 31**, die weiteren Tiere ebenfalls erhebliche Kampfwerte. Die ursprüngliche Spielerentscheidung auf niedrigen HP gegen ein Rudel stark überlegener Gegner ist hochriskant.
- Bei Engine-T29 trifft Cleave einmal mit **22 Final Damage**. Anschließend folgen gegnerische Angriffe (u. a. 21 + 17 + 21 Final Damage über entsprechende Aktionseinträge). T30 verwendet der Spieler **Guard**; das wird **mechanisch ausgeführt**. T31 versucht er einen Heiltrank, **falls vorhanden**, und anschließend Flucht. Der tatsächlich gebuchte Zug ist **`flee`**, der Fluchtversuch endet nach gegnerischem Treffer mit **0 HP**. Keine erzählte Heilung ohne echten Itembesitz.
- Von den 31 Eingaben waren mehrere vorangehende Cleave-Anläufe reichweitenbedingt ohne Kampfbuchung. Reales Risiko plus Positionierung/LLM-Entscheidung sind entscheidend; **keinen Warrior-DEF-/HP-Nerf**, keinen generellen Monsterbuff/-nerf und keinen Cleave-Hotfix allein aus diesem Tod.

## 4. Mage: 150 Eingaben, L8 und wirkliche Dungeon-Clear-Abnahme

- **15/15 Kämpfe gewonnen**, meist Einzelgegner, aber auch mehrere 2er-Gruppen. **9 Guildabschlüsse** inklusive wiederholter tatsächlich neu angenommener Hunts und **Mossback Warrens Floor 1** (`dungeon.cleared`, Zyklus1/Ebene1, **`credit:pc, pc:3, others:0`**). Dabei **60 Quest-XP und 80 cp** für Dungeonabgabe; die tatsächlichen Gegnerkämpfe und der Guardian-Sieg bleiben getrennt.
- Beim Checkpoint **100 Inputs: Level 6**, Endstand **Level 8** mit **846 cp**, weiterhin **Starter Arcane Staff** und Starterrobe. Mehrere echte Lootverkäufe (50, 20 und 25 cp) und Primerkauf **`Primer of Guard` −80 cp** dokumentiert; **kein neues Skill vollständig erlernt und keine Ausrüstungsänderung**.
- Arcane Bolt erreicht **P3**, Arcane Wave erhält in einem qualifizierten Kampf **18 PP** (C2-Schwelle **75 PP**). Die niedrigeren PP-Schwellen aus .114 wirken; eine einzelne AoE-Anwendung darf nicht künstlich hohen Skillaufstieg suggerieren.
- Der bessere wirtschaftliche Fortschritt deckt die bereits bekannte **Lücke zwischen Geld und tatsächlich eingesetzter besserer Ausrüstung** erneut auf. Es gibt in diesem Run weiterhin **keinen nachgewiesenen Kauf und Einsatz einer Fine/Superior/Exceptional-F-Waffe**. Aus Nullkäufen nicht ohne Handels-/Angebotsbelege den neuen .114-Waffenschaden nachbuffen.

## 5. Rogue: wieder 150 Inputs überlebt, aber nicht wegen Mehrziel-AoE

- **Level 4 nach 150 Inputs**, Checkpoint 100 Inputs auf L3. Sechs erfolgreiche Encounter, ein **tatsächlich gebuchter Rückzug/Flucht** aus einem Glimmerdeep-Grotto-Encounter statt Tod; drei abgeschlossene einfache Gildenjagden. Die anspruchsvolle **Glimmerdeep-Floor-1**-Aufgabe wird später **abgebrochen**, **kein `dungeon.cleared`**. Der Dungeon ist also kein zu Unrecht vergüteter Erfolg.
- **17 `dungeon_foe_refused`** im Evaluator: Der Narrator führt wiederholt nicht vom Living-Dungeon-System freigegebene Crystal Beetles ein; die Engine verweigert deren Materialisierung/Angriffe. **Welt-/Dungeonautorität bleibt gewahrt, aber erheblicher Erzähl-/Spielflussverlust**; die wiederkehrenden Fälle sollten bei späterer separater Dungeonkontinuitätsprüfung betrachtet werden, nicht als 17 technische terminale Fehler oder 17 echte Gegnerkills.
- Fan of Blades trifft nur einmal **eine** Glimmer Queen; gegen die späteren **zwei Striped Wolves** wird vorwiegend Razor Cut/Basic statt Fan eingesetzt. Der Wolfkampf wird dennoch gewonnen und ist eine eigene aussagekräftige Überlebens-/Gefahrenbeobachtung.
- In `enc.t114` gewinnt Rogue gegen **zwei Wölfe**, einer **4 Level über dem Rogue**. Die HP fallen auf **17 %**; die Engine zeichnet die Trial-Evidenz auf, gewährt ein **Rare-Passive-Angebot**, und der Spieler nimmt es tatsächlich an: **Wolf-Bitten Resolve**, gespeichert als `dyn.passive_unbroken_stance`, aktiv bei **≤50 % HP**, **DEF +4 und −10 % erlittenem physischen Schaden**. Das ist ein **echter Fortschritt** und nicht nur eine Narratorbehauptung.
- **Razor Cut P2** nach der qualifizierten Wolfsbegegnung. Ein `Primer of Strike` wurde für **80 cp** gekauft, aber **keine zusätzliche Fähigkeit erfolgreich fertig erlernt**. Ein echter Lootverkauf zu **20 cp**, Endkonto **69 cp**, keine bessere Ausrüstung angelegt. Rogue erlebt damit Skillbeherrschung und seltene Passive, aber wenig materiellen Fortschritt.
- Überlebenshistorie: Zusammen mit dem erfolgreichen `.101`-Guild-Rogue liegt nun ein **zweiter 150-Input-Rogue-Überlebenslauf** vor; die dazwischenliegenden vier gestarteten Guild-Runs `.102/.104/.114/.115` waren echte Tode. **Nicht** aus diesem neuen Lauf eine saubere Vorher-/Nachher-AoE-Sterblichkeitsstudie machen.

## 6. Technische Auffälligkeiten – Mussfix oder Beobachtung?

| Befund | Beleg und technische Einordnung | Priorität |
|---|---|---|
| **Mage: ein `extract.failed` mit `safeContinuations=1`** | Engine-T86 (Runner-Eingabe **98**) bei nicht gebuchter Zimmer-/Schlafkette: `$.deltas[4] (fact): .s: expected string, got object`. Reparatur kommt ebenfalls nicht zu gültigem Gesamtbericht; die entsprechenden World-Deltas werden **nicht** übernommen. Fortsetzung erreicht trotzdem 150 Inputs, `integrity OK`. Das umgebende Narrator-Szenario beschreibt mehrfach eine Gasthausreise und Angebote, die ohne autorisierte Reise/Sellerpräsenz **korrekt** verworfen werden. Ein erzählter Raum wurde nicht als bezahlt/erreicht fingiert. | **P2 beobachten**, kein sofortiger allgemeiner Extractor-/Zimmer-Hotfix. Wiederholte Whole-Report-Verwerfung und häufige phantom-lokale Angebote als separates Produktivitätsproblem sammeln. |
| **Rogue: `board.failed` einmal** | L1-`Eel-Weir Pike` überschreitet die wirklichen Schwellen eines Intro-Einzelgegners; **vier von fünf Listings** bleiben gültig. Später brauchbares Board, kein alter .114-Dungeon-Warntext-Validatorfehler. | Nichtfatal; Board-Generatorqualität beobachten. |
| **Rogue: 17 unerlaubte Dungeon-Kreaturen** | Freie Narrator-Erzählung kollidiert wiederholt mit dem Living-Dungeon-Slotmodell. Die Verweigerungen sind **korrekter Autoritätsschutz**, aber können den Spieler in längere narrativ-mechanische Widersprüche ziehen; stärkeres UX-/Prompt-Problem als ein einzelner Halluzinationssatz. | **P2-Probekandidat bei Wiederholung**: wiederholte Phantombegegnungen und angebotene Handlungswege aus Originalturns untersuchen, bevor Dungeon-Slotlogik gelockert wird. |
| **Cleave/Fan unzulässige Reichweitenanläufe** | Eindeutige Reichweitenfehler, **kein** illegaler Ressourcenverbrauch. Vielfache Anläufe kosten Runner-Eingaben und schwächen den tatsächlichen Test der Gruppenfähigkeit; korrekte Distanz-/Bewegungsplanung bleibt entscheidend. | Taktik/Feedback prüfen, kein pauschales Erlauben kostenloser Bewegung oder Reichweitenaufweichen. |
| **.116 Band-AoE / Ward / Altbestände** | Die AoE-Livebuchungen bestätigen ausgewählte Aspekte; nicht jede Regression hat ein natürliches Gegenstück. Kein Fall einer vor Kampf fälschlich als gebucht erzählten Ward-Anwendung im aktuellen Export; `.116`-Korrektur daher nicht nochmals an demselben Fehlversuch natürlich bestätigt. | **Kein nachgewiesener Rückfall**, keine sofortige weitere Technikpatchrunde. |

**Bewertung:** **Kein verpflichtender akuter Technik-Fix** aus dem Batch. Die sichere Fehlerfortsetzung wurde beim Mage benötigt, nicht der Kampfschaden manipuliert. **Nicht „100 % fehlerfrei“ nennen**: eine Extractor-Fail-soft-Fortsetzung und deutliche Narrator-/Dungeonabweichungen sind vorhanden.

## 7. Aktualisierte Balance- und Testprioritäten

1. **AoE ist technisch und im Mage-Fall mit zwei Zielen natürlich bestätigt, aber als Klassenbalance noch nicht ausgewertet.** Vier ausgeführte AoE-Aktionen in 331 Inputs sind zu wenig. Warrior trifft nur Singles, Rogue ebenfalls. Vor einer Schwächung/Verstärkung von Cleave, Arcane Wave oder Fan of Blades erst geeignete natürliche Mehrzielbegegnungen, Positionswahl, Kosten, Gegnerfolgeaktionen und Spielerstrategie beobachten; allenfalls eigenständige kontrollierte Funktions-/Fairnessproben ergänzen.
2. **Kein Klassenbuff/-nerf wegen Endgründen.** Ausgerechnet Warrior stirbt früh, während Rogue erstmals seit .101 wieder bis zum Limit kommt. Seine Flucht und das seltene Passive sind mechanisch wirksam, seine AoE wurde aber kaum eingesetzt. Ältere Überlebensquoten dürfen nicht kausal als AoE-Effekt gelesen werden. XP×2, Stats7, .114-Items und allgemeine Monsterwerte unverändert.
3. **Gear/Wirtschaft weiter offen:** Mage **846 cp** und neun Guildabschlüsse bei **0 Gearwechsel** sind ein stärkerer Langlaufbeleg für fehlende tatsächliche Upgradeentscheidungen als die kurzen Todesprofile. Händlerofferten, wirklich angebotene Qualitätsware, Preise, Spielerentscheidungen und aktuelle Ausrüstung getrennt nachweisen. Nur Geld reicht nicht zur Aussage, warum kein Kauf zustande kommt.
4. **Rogue-Dungeon-Kontinuität als eigenständiger Qualitäts-Prüfpunkt**, kein Vorwand für einen mechanisch ungeschützten Dungeon oder sofortige neue 10B-Hotfixfolge. Narrator-Phantomkreaturen, angezeigte Dungeon-Slots und tatsächliche Encounter-Historie in wenigen ausgewählten Originalturns nachvollziehen.
5. **Nächste natürliche Serie** mit weiterhin **AoE als einem der zwei Starter-Skills**, aber unverändert freier Spielstrategie. In Reviews registrieren:AoE-Versuche, erfolgreiche Aktionen, betroffene Zielbänder, Targets, Kosten, danach gegnerische Aktionen, korrekte Rückzüge, PP und wirklich erworbene Gear-/Skill-Upgrades. Keine künstlichen Siege, zusätzliche Startitems, Level-Overrides oder automatisch ausgeführte AoE.

**Status:** Original im Chat-Upload, nur Review/Index auf `main`; keine Produkt-/Runneränderung. Sols unabhängige Gegenprüfung steht noch aus. Dieser Review weist `integrity: OK` als Originalmeldung aus, nicht als selbst ausgeführten vollständigen Replay.
