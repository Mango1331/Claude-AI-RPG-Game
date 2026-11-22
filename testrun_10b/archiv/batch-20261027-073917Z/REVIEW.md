# Batch 2 (.101) – Review ausschließlich der ersten fünf Runs

**27.10.2026 · Unabhängige Auswertung, keine Implementierung.**

**Quelle:** Hochgeladenes Originalarchiv batch-20261027-073917Z.zip, **104.858.756 Bytes**, SHA-256 **8991e08d32486997b94421584a03bcb0ecd361eabc8e36329f1197c36170a59c**, 96 Einträge, ZIP-CRC fehlerfrei. Für die **ersten fünf Runs** wurden run.json, evaluation.json, avereth-events.json, calls.json, relevante chat-completions.jsonl-Antworten und Serverlogs geprüft. Der **sechste Run (Explore-Rogue) wurde vom Nutzer manuell mit Ctrl+C unterbrochen und wird NICHT bewertet oder statistisch mitgezählt.** Das Gesamtbatch trägt deshalb status=interrupted; die ersten fünf Läufe sind davon sachlich getrennt.

Alle fünf: Build **4.3.0-c.6.6.101**, Produktcommit **c9e3fa58bb57**, sauberer Entwicklungsstand, ST 1.19, V4-C/Ruleset 2, echtes **zai-org/GLM-5.3-Flash**, kein Stub/Fixture, unveränderte Profile, keine protokollierten Browser-PageErrors oder Secret-Hits. Ziel ist Level 15 bei maximal 150 **Spielereingaben** je Run, nicht 150 garantierten Engine-Turns.

## 1. Gesamtbefund

| Lauf | Run-ID | Seed | Eingaben | Level | Grund des Laufendes |
|---|---|---:|---:|---:|---|
| **1 Guild-Warrior** | 20261027-073917Z-current_test | 1613311441 | **150** | **7** | Normales Runnerlimit |
| **2 Guild-Mage** | 20261027-090159Z-current_test | 1613311442 | **99** | **3** | Regulärer Charaktertod, T99 |
| **3 Guild-Rogue** | 20261027-094050Z-current_test | 1613311443 | **150** | **8** | Normales Runnerlimit |
| **4 Explore-Warrior** | 20261027-105925Z-current_test | 1613311444 | **87** | **2** | T87 kein UI-Reply wegen Provider-internal_server_error |
| **5 Explore-Mage** | 20261027-115412Z-current_test | 1613311445 | **123** | **1** | T123 planner_failed nach falscher Offer-/Preiszuordnung |

**Nur diese fünf:** **609 Eingaben, 1.763 Modellaufrufe, 7.617 Engine-Events, 546 delta.rejected**. Drei nichttechnische Enden (zwei reguläre Eingabelimits, ein gebuchter Spieltod), **zwei** technische Enden. Keiner erreicht Level 15. Rejected-Deltas sind **nicht** pauschal 546 Bugs: mehrere Firewall-/Ownership-/Ankunftsverbote funktionieren absichtlich.

**Gegenüber Batch 1 (.100):** Von dessen ersten fünf Runs endeten **5/5 automatisch technisch** nach zusammen 200 Eingaben; dessen sechster Lauf wurde ebenfalls manuell beendet. Batch 2 (.101) erreicht dagegen drei nichttechnische Enden nach insgesamt 609 Eingaben. **Starkes positives Stabilitätssignal**, jedoch kein isolierter Kausalbeweis, weil Seeds, Spielhandlungen und Szenarien unterschiedlich sind.

## 2. Priorität P1: die beiden tatsächlichen technischen Endabbrüche

### 2.1 Explore-Warrior, T87 – expliziter Narrator-Providerfehler

**Original T87:** Alaric teilt dem Gildenschreiber seinen Schlafort mit und geht zu Hask dem Kürschner, um Fell und Stoßzahn zu verkaufen. **C283** Planner enthält ungültige Sell-Empfängerreferenzen; **C284** repariert diese. Engine erlaubt die Reise, aber stellt **beide Verkaufsversuche als NOT DONE / arrival pending** zurück, solange der Händler nicht erreicht wurde. Das ist keine falsche Verkaufsbuchung.

**C285 Narrator** antwortet nicht mit einer Chat-Completion, sondern mit **type=server_error, code=internal_server_error, message=An unexpected error has occurred**. Das zeitgestempelte Serverlog bestätigt diese Fehlerantwort. Kein finish_reason=length, kein Reasoning-only-Textlimit, kein gültiger Narratortext; deshalb auch kein Extractor-/Worldabschluss dieses Replies. run.json meldet T87 **no reply after the message** und end.kind=ui. **Unmittelbare Quelle ist der Providerfehler, UI ist das Symptom.** Ein eigener Browser-DOM-Bug ist hier nicht belegt.

**Wichtiger positiver Gegenfall:** Bei **T27/C84** verbraucht der Narrator alle **8.192 Tokens** für **33.226 Reasoning-Zeichen**, null Text. Das neue .101-Regenerate liefert direkt danach in **C85** eine gültige Narration (993 Textzeichen), **C86** führt die Extraktion aus. **Ein echter natürlicher Beleg, dass .101-Narrator-Empty-Recovery funktioniert.** C285 ist jedoch eine andere Fehlerklasse. **Enger Prüfauftrag:** expliziten potenziell transienten Provider-Serverfehler unter unverändertem Spielerrecord und genau einem Engine-Commit mit kontrollierter Narrator-Retry-/Abbruchstrategie behandeln; keine Runner-eigene neue Retryschleife.

### 2.2 Explore-Mage, T123 – Planner verknüpft Zustimmung mit falscher Handelsofferte

**Original T123:** Spieler sagt **One silver eight — yes, done** (= 18 cp). T119–122 enthalten längere Verhandlungen mit **Corr** über Zahn, Hautstreifen und Ei mit wechselnden Beträgen. Im autoritativen Katalog steht eine **OFFER** für einen Hautstreifen: **Corr verkauft an Alaric für 10 cp**. Ein separates **BID** betrifft das Ei. Die Erzählung deutet dagegen an, Corr wolle Alarics Hautstreifen **für 18 cp kaufen**.

**C398** Planner: finish_reason=length, **2.000 Completion-Tokens**, **6.962 Reasoning-Zeichen**, **0 Content**. **C399** Repair: syntaktisch gültiges JSON, aber offer.accept für **offer.t244.9**, agreed_cp **18** – also falsche Handelsrichtung und Preisabweichung. Das Modell erkennt den Widerspruch sogar in seinem Reasoning, erzeugt ihn aber im finalen Command erneut. Validator meldet **party_words must copy the counterparty from the player message** und **agreed_cp contradicts the player’s state**. Abbruch **planner_failed vor Narrator/Extractor**, keine unautorisierte 18-cp-Zahlung.

**Diagnose trennen:** (a) erzählte und gespeicherte Preis-/Warenrichtung stimmen nicht überein, (b) Erstplanner verbraucht sein Reasoningbudget, (c) Repair wählt falsche Offer-ID, (d) strikter Validator schützt richtigerweise den Zustand, lässt aber keinen spielbaren Folgezustand entstehen. **Nicht** den Validator lockern oder den alten expected.sold-Zahlungspfad wieder einführen. **Regression:** originaler Bid-/Offer-Katalog, NPC-ID, Besitz, Preis und Spielerzitat; ohne passenden aktuellen Verkaufsvorgang **nichts bezahlen/übertragen**, aber nach Möglichkeit kontrolliert CLARIFY/not_taken statt gesamtem Langlaufabbruch.

## 3. Weitere wiederkehrende technische Befunde

### 3.1 Viele Modellfehler werden inzwischen überlebt

Der Evaluator zählt abgefangene **Extractor-Empty-Recoveries** pro Profil: **8 / 3 / 9 / 5 / 10**, beim Explore-Mage zusätzlich **eine Transport-Recovery**. Die Original-Calls enthalten weiterhin Planner-/Extractor-Reasoning-only-Ausgaben und Reparaturen, aber keinen finalen extractor_failed in diesen fünf Läufen. **Die Modellbudget-Probleme sind nicht beseitigt, sondern werden teils erfolgreich abgefedert.**

**Telemetrielücke:** evaluation.counts.recovery dokumentiert Planner/Extractor, aber die neue Narrator-Regeneration nicht vollständig. T27/C84→C85 muss anhand der tatsächlichen Originalcalls nachgewiesen werden. Beim kleinen Runner-Nachtrag Fehlerklasse, einmaligen Retry, Erfolg/Misserfolg und Kosten getrennt erfassen. Keine zusätzliche Retry-Engine im Runner.

### 3.2 Szenen-/NPC-Firewall bei Explore oft im Konflikt mit Erzählung

| Run | Abgewiesene Deltas | Größte relevante Gruppen |
|---|---:|---|
| Guild-Warrior | **109** | scene_context 29, world_rule 15, engine_owned_fact 14 |
| Guild-Mage | **70** | world_rule 20, scene_context 19, dungeon_foe 7 |
| Guild-Rogue | **111** | World-/Authority-Rejections; kein Fatalfehler |
| Explore-Warrior | **94** | scene_context **40**, npc_continuity **17** |
| Explore-Mage | **162** | npc_continuity **68**, scene_context **52**, no_go 12 |

Beim Explore-Mage sind **53** der 68 NPC-Kontinuitäts-Rejections Folgedeltas zu zurückgewiesenen vermeintlich neuen Personen. Bereits bekannte, laut Engine **abwesende** Personen (etwa Arbeiter am Ford/Raft-Camp) werden erneut als anwesend beschrieben; darauf aufbauende Erinnerungen, Fakten oder Threads fallen ebenfalls weg. Explore-Warrior zeigt ähnliche Muster für **Brenna/Hedric**. **Die Zurückweisung kann korrekt sein** und schützt gegen Phantom-NPCs; falls aber legitime GO-/arrive-Ketten nicht passend verarbeitet werden, gehen gültige Inhalte verloren. Originalturns mit GO → arrive → person-present und abhängigen Deltas gezielt nachstellen. **Keine pauschale Öffnung der Firewall und jetzt kein großes NPC-Memory-Feature.**

### 3.3 Neue mechanische Jagdverträge funktionieren im natürlichen Test

**Guild-Warrior: fünf**, **Guild-Rogue: sechs**, **Guild-Mage: eine** formell abgeschlossene Guild-Jagd, **12 bestätigte Abschlüsse** mit echten READY/COMPLETED- und Auszahlungsevents. Wiederholte Weir-Adders, Rats, Boar Sows und höherstufige Creepers liefern gültige Killcounter. Der Batch-1-Fehler „passender Kill, permanent 0/1“ lässt sich damit **nicht mehr als generelles Problem** behaupten.

Kleiner Textkonflikt: Rogue-Auftrag **Drive Off the Vine-Row Boar Sow** verlangt in der tatsächlichen autoritativen Taskdefinition ausdrücklich **Kill 1 ... Only engine-recorded kills count**. Titel und mechanische Bedingung sind uneinheitlich, **kein falscher Engine-Credit**.

Im Guild-Mage-Dungeon wird Ebene 1 von **anderen** geräumt; der Auftrag wird bei T90 folgerichtig nicht dem PC gutgeschrieben. **Sieben** unerlaubte frei eingeführte Dungeon-Gegner werden zurückgewiesen. Nicht als Dungeon-Enginefehler oder zu Unrecht verweigerten Spielerlohn deuten.

## 4. Spielverlauf, Fortschritt und F→E-Scaling

| Profil | Encounter | Gewonnen | Guildabschlüsse | Endlevel | Zwischenstand T100 |
|---|---:|---:|---:|---:|---|
| Guild-Warrior | 10 | **10** | 5 | **7** | L4, 176 Rest-XP, 262 cp, Starterwaffe/-rüstung |
| Guild-Mage | 4 | **3**, dann Tod | 1 | **3** | T100 nicht erreicht |
| Guild-Rogue | 10 | **10** | 6 | **8** | L6, 216 Rest-XP, 662 cp, Starterwaffe/-rüstung |
| Explore-Warrior | 2 | **2** | 0 | **2** | T100 nicht erreicht |
| Explore-Mage | 1 | **1** | 0 | **1** | L1, 0 XP, 50 cp, Starterwaffe/-rüstung |

**Guild-Warrior:** Vollständige Glimmerdeep-Floor-1-Kette: Beetles **L1/2/4**, Slimes **L4/3**, Queen **L5**, Floor Clear nach eigenem Sieg; später Creepers **L6/L7/L4/L7/L6**. **10/10 Siege**, **fünf Jagdabgaben**, Level **7** nach 150 Eingaben. Einzelne Kampf-XP bis **270**, Quest-XP bis **300** enginegebucht. Zwei board_failed, viele Reparaturen ohne Laufabbruch. Bei T100 noch Starterequipment und Guard **P1/0**, Heavy Slash **P1/54**.

**Guild-Mage:** L3 stirbt bei T99 **regelkonform** gegen drei Boars **L6/L7/L6**. HP nach vorheriger Rast **130**, im Encounter **109→59→37→0**, ein Boar fällt, PC-Status **dead** und pc_dead=true sind mechanisch gebucht. Das ist kein Narrator-Falschtod und kein Providerabbruch. **Fairness, Vorwarnung und defensive Taktik** gesondert prüfen, nicht automatisch HP buffen oder Gegner nerfen. Zuvor eine bestätigte Gildenjagd und drei siegreiche Begegnungen.

**Guild-Rogue:** **10/10 Siege**, **sechs** Gildenabschlüsse, Level **8** bei 150 Eingaben. Frühe L1-Ratten/Boars, später L6-Boars sowie **L9**- und **L8**-Adder – die Engine erzeugt also auch höherstufige F-Begegnungen. T100 **662 cp** bei Starterdolch/-rüstung, Razor Cut **P2/15**, Evasive Step **P1/0**. **Auffällig für spätere Ausrüstungs-/Skillökonomie**, nicht bereits Nachweis eines kaputten Shops.

**Explore-Warrior:** 87 Eingaben, zwei echte Siege (Brissleback L1, Boar-Beast L3), Level 2, keine abgeschlossenen Guild-Aufträge. Viele Reisen, NPCs und freie Kontakte; T27 erfolgreiche Narratorregeneration, T87 externer Providerfehler. Nicht als grundsätzlich schlechte Exploration klassifizieren.

**Explore-Mage:** T100 noch **0 XP und Level 1**, weil erst **T116** die erste echte Kampfbegegnung (Pale Thing L2, **48 XP**) gewonnen wird. 123 Inputs sind daher **kein** Nachweis einer XP-Buchungsstörung; der Spieler verbringt sehr viel Zeit mit freien NPC-/Handels-/Reisegeschichten und nutzt die Guild nicht routinemäßig. T123 Handels-/Plannerstopp. Explore künftig zusätzlich nach tatsächlich bestätigten Orten, Begegnungen und Zahlungen bewerten, **ohne** Guildfarming als Testspielerpflicht aufzuzwingen.

**Scaling-Einordnung:** Trotz langem erfolgreichen Guildspiel bleiben Warrior L7 und Rogue L8 nach 150 Eingaben deutlich unter L15; gleichzeitig sind tatsächlich höherstufige Feinde und reichhaltige Quest-XP vorhanden. **Nicht blind XP erhöhen:** Progressionsrate, Encounterzahl, Gegnerlevel/Region, Gear, PP-/Skillangebote, Spielertaktik und Geldpreise gemeinsam prüfen. Die T100-Snapshots mit unveränderter Starterausrüstung und wenig genutzten Utility-Skills sind ein gezielter Beobachtungsbefund.

## 5. Enger Folgeplan, keine Implementierungsfreigabe

1. **P1** Explore-Warrior T87/C285: explizite Provider-Serverfehlerantwort statt Narratorcompletion. Gesicherter positiver Gegenfall T27/C84→C85. Abnahme nur mit unverändertem Playerrecord, keinen doppelten Engineaktionen, Swipe/Reload-Sicherheit.
2. **P1** Explore-Mage T119–123/C398–399: BID/OFFER-Richtung, aktuelle Preiszustimmung, tatsächliche Ware/Besitz, ein eindeutiger spielbarer Ablehnungs-/Rückfragezustand; **keine falsche Zahlung**, kein Recovery-Dauerloop.
3. **P1/P2** einzelne wirklich autorisierte Explore-Wiederbegegnungen samt 68/17 NPC- und 52/40 Scene-Rejections chronologisch prüfen. **Nur erwiesene Fehlablehnungen** korrigieren, Anti-Phantomschutz erhalten.
4. **P2** Runner-/Beobachtungsqualität (System-Panels, Narrator-Recovery, JSON, bestätigte Exploration); redaktioneller Kill-only-Guildtitel. Keine längeren Pflicht-Spielerleitfäden.
5. **Danach F→E-Scaling** mit realen Langläufen und fairer Gegenprobe; keine separate größere NPC-Memory-Implementierung.

Für neue technische Fixes erst originale Rot-/Grün-Regressionsfälle, Node-Vollsuite und für Host-/Narrator-Pfade echten ST-Smoke mit Regenerate/Reload/Swipe; anschließend natürliche GLM-Gegenprobe. **Diese Review ersetzt keine Testausführung und ist keine Level-15-Abnahme.**

## 6. Quellen-/Archivgrenze

Der Rohdatenumfang bleibt im **unveränderten ZIP mit der oben genannten Prüfsumme**. Diese Review und der Index im neuen Batch-2-Git-Ordner sind **Textdokumente**; die 105-MB-ZIP ist ohne separaten Binärupload **nicht** im Git-Ordner enthalten. **Run 6 bleibt vollständig aus der fachlichen Bewertung ausgeschlossen.**