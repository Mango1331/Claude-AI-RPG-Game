# Batch 01 (.100): unabhängige Auswertung der sechs gestarteten Kampagnen

Stand: 27.10.2026. **Analyse, keine Implementierung.** Quellmaterial: das vom Nutzer bereitgestellte unveränderte ZIP **batch-20261027-030034Z.zip** mit 98 ZIP-Einträgen, gültigen ZIP-CRC und SHA-256 **aebd2b67c353b3ed6c6a57887fff1d42885462af84e8262b6a97715db7a5fe3f**. Unter jeder der sechs Kampagnen wurden \`run.json\`, \`evaluation.json\`, \`avereth-events.json\`, \`calls.json\`, \`chat-completions.jsonl\`, \`chat.jsonl\` und \`report.md\` in der ZIP geprüft. Verweise wie **m52** meinen Nachrichtenindizes der \`avereth-events.json\`, **T26** die Eingabenzählung, **C93** die Aufrufnummer in \`chat-completions.jsonl\`. Keines der Originalereignisse wurde korrigiert.

**Produktstand und Eingrenzung:** Alle sechs Kampagnen liefen mit Build **4.3.0-c.6.6.100**, Git **cadd5315862a**, SillyTavern 1.19, GLM-5.3-Flash als Spieler/Engine-/Narrationsmodell, ohne Stub, Fixture oder Profilveränderungen. Gemeldete Profile unverändert, Secret-Scan je Lauf null Treffer, keine Browser-PageErrors. Die Serie selbst endete mit \`status=interrupted\`, weil der Nutzer den sechsten Lauf manuell beendete. **Die drei Dungeonläufe 7–9 wurden nie gestartet**; Aussagen über deren Qualität sind nicht zulässig.

## 1. Gesamttabelle und Abbruchklassifikation

| Nr. | Profil | Seed | Eingaben | Level | Endtyp und primäre Ursache |
|---:|---|---:|---:|---:|---|
| 1 | guild-warrior | 1348926322 | 32 | 2 | **extractor_failed** T32: harte Schemaabweichung, zusätzliches Top-Level-\`thread\` |
| 2 | guild-mage | 1348926323 | 96 | 5 | **narrator_empty** T96: \`finish_reason=length\`, 8192 Tokens, 35.293 Reasoning-Zeichen, null Text |
| 3 | guild-rogue | 1348926324 | 5 | 1 | **extractor_failed** T5: \`person.new.at="here"\` außerhalb des erlaubten Referenzschemas |
| 4 | explore-warrior | 1348926325 | 47 | 1 | **narrator_empty** T47: \`finish_reason=length\`, 8192 Tokens, 33.701 Reasoning-Zeichen, null Text |
| 5 | explore-mage | 1348926326 | 20 | 1 | **extractor_failed** T20: Erstantwort mit unbekanntem Delta \`type="place"\`; Repair erschöpft Tokenlimit ohne JSON |
| 6 | explore-rogue | 1348926327 | 32 | 2 | **manuell unterbrochen**: \`recordedEnd=harness\`, \`interrupted (Ctrl+C) in turn 32\`; Batchwrapper nennt \`process_error\` wegen Exitcode 1 |

**Wichtig:** fünf selbstständige technische Abbrüche, **kein** beobachteter Tod, **kein** 150-Turn-Limit, **keine** erreichte Stufe 15; der sechste Lauf ist **kein** selbstständiger Fehlschlag. Zusammen **232 Eingaben**, **649 LLM-Aufrufe** (215 Planner, 195 Narrator, 229 Extractor, 10 Board), **2.999 Engine-Events** und **168 \`delta.rejected\`**. Die Anzahl von Aufrufen/Events ist keine Metrik für erfolgreiche Spielzüge. Nur der Gildenmagier erreichte mit 96 Eingaben die Vergleichsmarke fast; 100 wurde in keinem Lauf erreicht. Die konfigurierten 36 Batchstunden wurden nicht ausgeschöpft.

## 2. Priorität P0: Reasoning verschlingt Ausgabe-Budgets und beendet Kampagnen

**Direkter Nachweis in den Original-Completion-Antworten:**
- **Gildenmagier T96/C265**: Narrator \`finish_reason=length\`, 8192 von 8192 Completion-Tokens, **35.293 Reasoning-Zeichen**, **0 Textzeichen**. Kein Modelltransportfehler und keine World-Validierung: Die API-Antwort enthält keine Geschichte.
- **Erkundungskrieger T47**: Narrator ebenfalls 8192/8192, **33.701 Reasoning-Zeichen**, **0 Textzeichen**. Schon früher T32 ein Extractor-Transporttimeout von 120.000 ms (dieser wurde als vorheriger Fehler protokolliert, der Lauf ging weiter).
- Die Extraktoren liefern wiederholt \`finish_reason=length\` bei **4000/4000 Tokens mit null Inhalt**. Beispiele: Gildenkrieger T18/T28/T31/T32, Gildenschurke T5, Erkundungsmagier T20 (Repair). Der vorhandene einmalige Repair bzw. die spezielle Empty-Recovery kann manche dieser Fälle auffangen, nicht aber die Kombination aus falschem Reparaturinhalt oder erneut leerer Antwort.
- Planner-Tokens können ebenfalls in Reasoning versickern (u. a. Erkundungsschurke T12: 2000/2000, 0 Text, danach Reparatur).

**Diagnose:** Für diese zwei Narrator-Enden ist ein reiner Text-/Reasoning-Budgetausfall nachgewiesen; eine Änderung an Monsterbalance, Kampftaktik oder Guild-Quests behebt ihn nicht. Der Provider antwortet grundsätzlich (Preflight 200, erfolgreiche Aufrufe davor), das einzelne Completion-Budget liefert aber in entscheidenden Turns keinen auswertbaren Text. Eine komplette Vergrößerung aller Budgets ist weder nachgewiesenermaßen nötig noch kostengünstig. Das Verhältnis Reasoning/Text, die Einstellung \`reasoning_effort=low\` plus \`clear_thinking=true\` und das tatsächliche Providerverhalten müssen anhand konkreter Requests statt über den Presetnamen bewertet werden.

**Vorschlag zur Gegenprüfung, kein automatischer Fix:** Request-Body und Response-Reasoning für Narrator C265/T96 sowie Explore-Warrior T47 exakt prüfen; kontrollierte Wiederholung mit gleicher Eingabe und nur *einem* gezielt variierten Reasoning-/Tokenparameter; Absicherung, dass kein leerer Narrator-Text je als gültige Geschichte übernommen wird. Vor einer automatischen Retry-Strategie Transportfehler, \`length\` mit 0 Inhalt und legitime sehr kurze Erzählung trennen; Swipe-/Hash- und Einmal-Commit-Schutz nicht aufweichen.

## 3. Priorität P0/P1: Extractor-Hardfails statt partieller Fortschreibung

### 3.1 Guild-Warrior, T32: unterstütztes Delta mit unzulässiger Top-Level-Struktur

Original **C92**: \`extract\` erreichte 4000 Tokens mit leerem \`content\` und rund 17.093 Reasoning-Zeichen. **C93** (Repair) antwortete syntaktisch mit JSON und erkennbaren \`deltas\` (z. B. Guild-Clerk-Angebot), schrieb aber zusätzlich **\`"thread": [...] \` am JSON-Root**. Das Schema akzeptiert \`thread\` als *Delta-Typ*, nicht als separaten Top-Level-Array. Ergebnis \`extract.failed\` auf **m64** (\`$: unexpected property "thread"\`), keine mechanischen Weltänderungen dieses Replies.

**Einordnung:** Es ist kein zufälliger Transportausfall; die Reparatur traf inhaltlich teilweise den Weltbericht, verletzte aber die Ausgabeform. Die harte Ablehnung schützt den State. Eine pauschale „ignoriere unbekannte Felder“-Regel würde auch gefährliche Fehler verdecken. Sinnvoller ist ein enger Regressionstest für dieses konkrete Fehlerbild mit explizitem Mapping/Validierung, ohne eigenmächtige Fakten zu übernehmen.

**Zusammenhang mit dem Spielablauf:** T13 und T24–26 zwei gewonnene Marsh-Cat-Kämpfe; der Gildenvertrag blieb jedoch bei 0/1 und die Abgabe wurde mehrfach verweigert. Der Erzähler entwickelte aus der mechanischen Verweigerung einen angebotenen Boten als Workaround. Der Thread darüber löste am Ende den Formatfehler aus. Hier sind **Spielmechanikfehler und Extractor-Formatfehler zwei voneinander getrennte Ursachen in derselben Kausalkette**.

### 3.2 Guild-Rogue, T5: \`here\` ist keine gültige \`person.new.at\`-Referenz

**C10**: Extractor erschöpfte 4000 Tokens, nur Reasoning. **C11**: Repair gab verständliches JSON zurück, aber \`deltas[2]\` enthielt \`{"type":"person.new",...,"at":"here","band":null}\`. \`scene:"here"\` mag in anderen Kontexten als Szenenwert vorkommen; bei \`person.new.at\` ist es hier **keine gültige konkrete Ortsreferenz**. Schemafehler \`$.deltas[2] (person.new): .at: matches none of anyOf\`, \`extract.failed\` auf **m10**. Die Registrierung selbst war zuvor korrekt vom Engine-Command gebucht; ein zusätzlicher Zuschauer führte dennoch zum technischen Kampagnenabbruch nach nur fünf Eingaben.

**Prüfung:** Ausgabeanleitung/Schemabeispiel der \`at\`-Felder je Delta-Typ prüfen; nicht global \`"here"\` als beliebige ID akzeptieren. Test mit einem ansonsten gültigen Registrierungsreply und einem ambienten Zuschauer: Formatfehler korrigieren bzw. nachweislich nicht privilegierte eigenständige Aussagen nur dann lokal verwerfen, wenn der harte Schema-/Ownershipvertrag erhalten bleibt.

### 3.3 Explore-Mage, T20: zuerst unbekannter Delta-Typ, danach Repair ohne Text

**C58** (erste Extraktion) enthielt JSON mit \`deltas[0].type="place"\`, das der Vertrag nicht kennt; an anderer Stelle waren \`creature.new\`, \`passage\` und \`thread\` plausibel angelegt. Reparaturprompt benennt präzise \`unknown type "place"\`. **C59** (Repair) verbrauchte 4000 Tokens, ca. **16.317 Reasoning-Zeichen, 0 Text**, \`finish_reason=length\`. Die Runtime meldete \`report is not valid JSON\` und auf **m40** \`extract.failed\`. Das ist eine **zweistufige** Ursache: erst semantisch/strukturell unzulässiger Delta-Typ, danach zu knappes nutzbares Ausgabebudget. Nicht bloß „JSON kaputt“.

**Prüfung:** Welche vorhandene Delta-Variante hätte den tatsächlich gesehenen Dungeonraum beschrieben? Generator/Extractor-Prompt genau darauf abstimmen, ohne freie \`place\`-Deltas als Mechanik einzuführen; zusätzlich Repair-Ausgabe unter Reasoninglimit prüfen. Der Erzähler zeigte zwei Goblins aus sicherer Distanz, was noch **keinen** automatisch eröffneten Kampf belegt.

### 3.4 Technische Grenzen

Für die fünf autonomen Abbrüche gibt es **keinen** Beweis, dass das eigentliche \`.100\`-Patchthema „Kaufatomizität“ wieder kaputt ist. Es sind vor allem **Modell-/Protokollrobustheit und Output-Budget**. Teilweise sauber generierte JSON-Bereiche sind nicht gleichbedeutend mit mechanisch anwendbaren Änderungen: harte Schemafehler dürfen nicht still auf World übergeben werden. Beibehaltung von **einer ausgewählten Extractor-Fassung**, strikter Quellenautorität, maximal bestehenden Aufrufbudgets und Reload-/Swipe-Idempotenz bleibt Leitplanke.

## 4. Priorität P1: Zwei unabhängige Gildenjagden zählen besiegte Zieltiere nicht

**Dies ist der wichtigste spielmechanische Mehrlaufbefund und nicht nur ein LLM-Formatproblem.**

- **Guild-Warrior:** Der angenommene Vertrag \`quest.cull_the_marsh_cats_prowling_the_tannery_yards\` fordert genau eine Marsh Cat. \`hunt.at\` ist \`realm.duskreach.the_tannery_yards_and_ditch_banks_of_soak_row\`. Nach T13 wurde \`mon.crmarsh_cat\` (72 XP), nach T24–26 \`mon.scarred_marsh_cat\` (88 XP) in vorhandenen erzählten Unterorten getötet. Beide sind im Original als **species marsh cat, anchor feline** gespeichert. Weder bei Erzeugung noch beim Kampfabschluss ist für diese zwei Tiere ein passendes \`population_at\` in den archivierten Events ersichtlich. \`quest.ready\` wurde viermal auf **m32/m52/m56/m58** mit \`quest_count: 0 of 1\` verweigert, \`proof.checked\` an m62/m63 ebenfalls nicht bereit. Das bloße „es war der richtige Kater“ aus dem Dialog setzt den Counter verständlicherweise nicht frei.
- **Explore-Rogue:** \`quest.cull_the_marsh_mink_at_the_eel_weirs\` hat \`hunt.at=realm.caelreth.the_reed_flats_eel_weirs\` und die Population \`marsh mink/feline\`. Die Kämpfe gegen \`mon.mink\` (48 XP, m31) und \`mon.big_marsh_mink\` (58 XP, m51) wurden gewonnen. Beide Tiere sind **species marsh mink** mit passendem Anchor, aber ihre Geburt/Begegnung erfolgte an narrativen Unter- bzw. Nachbarstellen (\`the larder stone hollow\`, \`the alder banks downstream\`); **\`population_at\` wurde bei beiden nicht gebucht**. \`quest.ready\` auf **m32/m52/m56** bleibt bei 0/1, der Turn-in bei **m56/m59** wird abgelehnt. Die Erzählung erfindet daraufhin weitere Beweisauflagen.
- **Gegenprobe aus anderen Runs:** Beim **Explore-Mage** erhielt die Viper explizit \`population_at=realm.duskreach.millpond_weirs\` (m20); sein Auftrag wurde auf **m22 READY und m24 completed/payout 20 cp** gesetzt. Beim **Guild-Mage** erhielten mehrere entsprechende Monster explizit \`population_at\` bei der Profil-/Encounterbuchung; zwei Guild-Verträge konnten abgeschlossen werden.

**Quellcode-Ursache plausibel und eingegrenzt:** In \`src/v4/guild.js\`, \`areaOf\`, gilt für neue Weltjagden bewusst die harte Identitätsregel **\`e.population_at === q.hunt.at\`**. Eine rein sprachliche/artenmäßige Ähnlichkeit ist ausdrücklich nicht ausreichend. Das ist ein sinnvolles Missbrauchsverbot. Hier kommt die fehlende **Zuordnung natürlich eingeführter narrativer Zieltiere zu ihrem kanonischen Habitat** hinzu; die Spielwelt erzeugt „den betreffenden Kater/Mink“ an einem Unterort, schreibt aber keine belastbare Populationsherkunft. Die genaue technische Stelle dieser fehlenden Bindung muss Sol anhand der originalen Creature-/Encounter-Reihenfolge nachprüfen.

**Anforderung an einen Fix:** Nicht pauschal Zählung von „0/1“ ignorieren, nicht beliebige Artvertreter im ganzen Reich zählen und keine Quest automatisch auf READY setzen. Stattdessen beim Erzeugen/Betreten/Encounter des tatsächlich etablierten Habitatbestands **eindeutig begründete \`population_at\`-Provenienz** auch für Unterorte führen, einschließlich mehrfacher Ebenen und konkurrierender Populationen. Zwei Rot-/Grün-Regressionen exakt aus diesen Archiven, eine Gegenregression für einen namensgleichen, aber **fremden** Mink/Kater. Questbeweise und alternative Erfüllung nicht als Workaround zum Verdecken eines fehlenden Counters verwenden.

## 5. Priorität P1/P2: Szenen- und Reisechronologie belastet Erkundung

- **Explore-Warrior**: 47 Eingaben, kein Encounter, weiterhin Level 1, **71 abgelehnte Deltas**, davon **42 \`scene_context\`** und **11 \`passage\`**. \`scene_context\` verteilt sich über zahlreiche Replies (m16, m18, m24, m26, m36, m44, m46, m56, m70, m76, m90); **23** mit mehrdeutigem lokalen \`here\` nach nicht bestätigter Ankunft, **19** wegen Abweichung zwischen behaupteter und erreichter Szene. Das ist nicht ein einzelner Endturn-Fehler, sondern eine wiederkehrende Friktion: erzählte Orte/NPCs/Passagen erscheinen, werden aber nicht kanonisch eingeführt.
- **Guild-Mage**: trotz realem Fortschritt **16 \`scene_context\`-Ablehnungen**, konzentriert auf m18 (acht), m76 (zwei), m182 (zwei), m184 (vier). Davon **14** wegen \`here\` nach nicht bestätigter Reise.
- Der strengere Ortsschutz aus \`.99/.100\` ist **nicht automatisch falsch**: Er kann erfundene Ankünfte und kostenlose lokale Handlungen abwehren. Aber die Häufigkeit im reinen Erkundungspfad erfordert eine **Differenzierung**, ob (a) der Narrator tatsächlich unerlaubt über die Reise hinaus erzählt, (b) GO/Expected korrekt ist und nur die narrativen \`arrive\`-Deltas fehlen, (c) der Extractor den Start-/Zielort falsch etikettiert, oder (d) eine legale Zwischenankunft nicht sauber erkannt wird.
- **Keine Empfehlung**, die Firewall allgemein zu lockern. Zuerst je ein bis zwei konkrete m16/m18/m70/m76-Replies mit Original-Player-Eingabe, Planner-Authorization, Narration, \`expected\`, \`arrive\` und abgelehnten Deltas chronologisch rekonstruieren. Danach nur an der nachgewiesenen Vertragsschnittstelle korrigieren. Als Abnahme zählen *richtige* kanonische Exploration und Schutz gegen unautorisierte Erzählreisen gemeinsam.

**Sekundärbefund:** Explore-Warrior hatte bei T7 ein \`board_failed\` und bei T32 einen Extractor-Timeout (120s), aber der Lauf setzte später fort. Diese Soft-/Wiederanlauffälle von den fünf finalen Abbrüchen trennen.

## 6. Einzelauswertung, getrennt nach Profil

### 01 Guild-Warrior — T32, Level 2

Zwei Kämpfe mit zwei Siegen und zusammen 160 XP; technischer Kernabbruch durch Root-\`thread\` in der reparierten Extraktion **C93**. Der World-Mechanismus verweigerte dem Spieler zuvor die viermal beanspruchte Vertragsbereitschaft; der Counter blieb trotz passender Marsh-Cat-Gegner bei 0/1. Wiederholte Rückwege/Tiernachweise/Schaltergespräche sind keine normale Fortschrittsvariation, sondern stehen im Verdacht, **Folgeverhalten eines fehlerhaft ungebundenen Habitats** zu sein. 21 abgelehnte World-Deltas, davon vier \`quest_count\`, daneben reguläre Guild-/Kampf-Authority-Abweisungen. Der Run ist zugleich eine wertvolle Regression für den **intakten Schutz vor frei erfundenem Questabschluss**.

### 02 Guild-Mage — T96, Level 5

Der mit Abstand längste und aussagekräftigste Lauf: **11 Encounter**, zwei bestätigte Guild-Abschlüsse (Orchard-Row-Wolf: 30 cp; Reed-Flat-Striders: 80 cp), dokumentierter Kauf-/Payout-/Lootfluss, Level 5 und anhaltende Kampagne bis zum **reinen Narrator-Budgetausfall**. **58 rejected Deltas** (u. a. 16 \`scene_context\`, elf \`engine_owned_fact\`, neun \`quest_count\`); sie sind nicht pauschal Fehler, teils schirmen sie bewusst gebuchte Engine-Fakten ab. Zwei Growth-Noted-Ereignisse, aber im Report **keine Growth-Offer/Accepted**: das ist ein Hinweis zur späteren PP-/Skill-Designauswertung, **kein** isolierter Beweis eines Growthbugs. Prüfen, warum 96 Eingaben, elf Kämpfe und zwei Guild-Abschlüsse erst Level 5 ergaben; ein Balanceurteil braucht die XP-Zielkurve, nicht nur diesen einen Wert. Durch den 8192-Token-Ausfall ist der Vergleich bei 100 Inputs knapp verpasst.

### 03 Guild-Rogue — T5, Level 1

Das sauberste kurze Reproduktionsbeispiel eines **harten Feldschemafehlers**: Guild-Registrierung kostet korrekt 20 cp, aber die nachgeschobene \`person.new\`-Einführung eines im Saal sitzenden Zuschauers trägt \`at:"here"\` statt gültiger konkreter Referenz. C10 Reasoning-only; C11 repariert vieles, nicht diese Referenz. Der Lauf zeigt, wie ein **unbeteiligtes ambient NPC-Detail** eine Kampagne früh terminieren kann. Kein Kampf, keine Levelprogression.

### 04 Explore-Warrior — T47, Level 1

**Kein Encounter**, kein bestätigter Questabschluss, 47 Inputs und 71 rejected Deltas, davon 42 \`scene_context\` und 11 \`passage\`. Mehrfaches Reisen/Beschreiben unbekannter Orte erzielt wenig dauerhafte Kanonisierung. Vier Transaktionen sind gespeichert (20 cp Registrierung und dreimal 10 cp für andere Angebote); eine doppelte Abbuchung ist hieraus allein nicht abzuleiten. Zwischendurch \`board_failed\` und T32 ein Timeout. Finale T47 Narrator-Ausgabe **8192/8192 Reasoning-only**. Untersuchen, ob der Verlauf primär an zu ungenauem Reise-/Extractorvertrag oder freien, vom Spieler gewählten Erkundungswegen scheitert. Trotz ausbleibender XP ist ein Explorationstest nicht deshalb allein „fehlgeschlagen“, weil er keine Kämpfe gesucht hat.

### 05 Explore-Mage — T20, Level 1

Natürlicher Guild-Abschluss bereits vorhanden: **Weir Viper** in einem realen Encounter besiegt, READY und für **20 cp abgeschlossen**; danach ein Dungeonvertrag und Erkundung der **Mossback Warrens**. Finale Narration beschreibt aus Distanz zwei Goblins und eine Passage. Der erste Extractor erfindet ein Delta \`type:"place"\`, dann verbraucht der einzige Repair 4000 Tokens für Reasoning und liefert keinen JSON-Bericht. In den betreffenden Turn keine mechanischen Weltänderungen gebucht. 7 World-Rejections, also **kein allgemeines Szenenproblem** wie Explore-Warrior.

### 06 Explore-Rogue — T32, Level 2, **manuell beendet**

Zwei Siege (Mink 48 XP, großer Mink 58 XP), Registrierungszahlung 20 cp, weitere Käufe 1 cp und 5 cp korrekt als drei Transaktionen erfasst; kein belegter Doppelkauf. Das wiederholte **0/1 trotz zweier Marsh-Mink-Tode** verhinderte Guild-Abgabe und begünstigte weitere Nachweisdialoge. **Keine automatische Endstörung vor der Unterbrechung:** Der Nutzer brach während T32 ab. Der Batch zeigt \`process_error\` wegen Child-Exitcode 1, die echte \`run.json\` zeigt \`harness: interrupted (Ctrl+C) in turn 32\`. Der dabei geloggte \`AbortError\` gehört zeitlich zum Stopp und darf ohne eigene Kausalkette nicht als Ursache eines natürlichen Absturzes gezählt werden. Bereits 27 Extractor-Commits vor dem Endturn. Keinerlei beobachtete Dungeon-Abnahme.

## 7. Was sich aus den sechs Läufen gerade *nicht* folgern lässt

- **Keine** stabile Level-15-Skalierung: fünf Runs zu früh technisch abgebrochen, einer vom Nutzer, keiner über 100 Inputs.
- **Keine** Aussage über die Dungeon-Schwerpunkte: 7–9 haben den Status \`pending\`; ein normaler Abstecher in den Dungeon in Run 5 ist kein Ersatz.
- **Keine** allgemeine Aussage „alle Guild-Quests kaputt“: Run 2 und 5 schließen tatsächlich welche ab. Der Counter-Defekt ist auf den nachgewiesenen natürlich eingeführten Habitat-Fall einzugrenzen.
- **Keine** Bestätigung, dass irgendeine Firewall-Rejection allein schon ein Bug ist. Tests müssen verbotene Autoritätsübernahme weiterhin abwehren.
- **Keine** Bestätigung, dass \`.100\` Handelsbuchungen doppelt erzeugt: Originalevents zeigen zu jeder besprochenen Registrierung/Transaktion jeweils eine Buchung; eine vollständige exhaustive Handelsprüfung war nicht Gegenstand dieser Review.
- **Keine** Behauptung, dass die unerwarteten Extractor-Felder ohne Verlust der Schema-/Eventintegrität einfach ignoriert werden könnten.

## 8. Empfohlene technisch getrennte Arbeitspakete (erst analysieren/gegenprüfen)

**A — Modell-/Completion-Robustheit, Priorität P0.** GLM-Providerantworten und effektive Reasoning-/Completion-Budgets pro Rolle getrennt prüfen. Die zwei reinen Narrator-Budget-Enden und die mehrfachen \`extract length, content=0\` als echte reproduzierbare Fixturefälle festhalten. Eine *enge* Wiederholungs-/Output-Budgetstrategie entwerfen, ohne zusätzliches unkontrolliertes Recovery, doppelte Commits oder unbegrenzte Kosten; ggf. Parameter statt Architektur ändern.

**B — Extractor-Schemavertrag, Priorität P0/P1.** Getrennte Regressionen aus den Originalantworten: T32 \`thread\` am Root, T5 \`person.new.at="here"\`, T20 unbekanntes \`place\` plus leerer Repair. Exakten Informationsverlust und sichere Fallback-Grenze definieren. Keine globale Schemaabschaltung, keine automatische Interpretation eines falschen Delta-Typs als Worldereignis.

**C — Habitat-Provenienz bei narrativen Monstern, Priorität P1.** Run1 und Run6 anhand konkreter Entity-/Population-IDs nachstellen: ein erwiesen passender Unterort und ein fremder Ort, gleiche Species. Den **fehlenden Populationsstempel** an der tatsächlichen Materialisierungsstelle beheben; \`areaOf\`/Counter-Schutz ausdrücklich erhalten. Sollwerte: passende zwei Siege ergeben rechtmäßigen 1/1-Counter (nicht mehrere Aufträge übergreifend), fremde Gegner bleiben 0/1. Befreiung von späteren künstlichen Turn-in-Schleifen wird als Wirkung geprüft.

**D — Szenen-/Reiseeinordnung, Priorität P1/P2.** Explore-Warrior und Guild-Mage an den genannten mehrfachen Rejection-Clustern instrumentieren. Pro Beispiel wirkliche GO-Autorisierung und Ankunftssequenz prüfen; Ablehnungen in korrekt vs. zu streng trennen. Nur nachgewiesene Fehlreihenfolgen oder unklare Quellenreferenzen enger adressieren.

**E — Spätere Balance-/Contentbewertung, nicht als Sofort-Patch.** Gildenmagier als positiver Langlauf (Level 5, elf Encounters), Explore-Warrior als Low-Combat-Profil, und beiden blockierten Jagden als Design-/Mechanik-Korrelation auswerten. F-/E-Rank, PP, Gear und Preiswerte *nicht* im gleichen technischen Hotfix verändern.

## 9. Konkrete Abnahmereihenfolge

1. Pro Root Cause ein **roter Test gegen das reproduzierte .100-Verhalten**, exakt mit Original-Input und Response, nicht nur künstlich ähnlichen Strings.
2. Nur den jeweiligen technischen Pfad beheben, Rot→Grün, benachbarte Regressionen und gesamte Node-Suite.
3. Eine **kurze echte GLM-Kampagne** mit Narrator/Extractor-Ausgabetelemetrie; Budgetproblem ist am Stub allein nicht überprüfbar.
4. Neunfach-Batch erneut mit unverändertem Stand und eigenständigen Archiven; frühe Infrastrukturfehler von Spieltoden und manuellem Abbruch differenzieren.
5. Für Langzeitbalance zuerst wirklich natürliche Läufe Richtung 100–150 Inputs erzielen; dann Level-/Skill-/Gear-Folgen untersuchen.

**Referenz- und Beweisdisziplin:** Original-ZIP mit SHA-256 wie oben; kein Replay, keine Modifikation, keine Freigabe der drei ungestarteten Profile. Alle Befunde sind Beobachtungen oder ausdrücklich als Hypothesen bezeichnet. Diese Review ist keine Behauptung bestandener neuer Tests.
