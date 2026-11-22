# Avereth Engine – Unabhängiger Review des natürlichen NPC-/PULSE-Batches auf `.191`

**15.11.2026 · GPT · Review aus der Original-ZIP `npc-batch-20261115-103140Z.zip`. Keine Produktimplementierung, kein Modell-/Hosttest durch GPT.**

**Quelle:** SHA-256 der hochgeladenen Original-ZIP `cfae11932039b51c9174fc4cf748aa72b179beb99b3d49d429387674fd5ec259`. Alle drei Unterordner mit `run.json`, `chat.jsonl`, `avereth-events.json`, `calls.json`, `chat-completions.jsonl`, `evaluation.json` und `npc-pulse.json/.md` untersucht. 138/138, 43/43 und 1/1 exportierte Eventgruppen mit den tatsächlichen Chat-Records strukturell identisch (Export-Index ist gegenüber dem JSONL-Metadatenheader um eins verschoben). Keine Prüfung durch einen lokal gestarteten neuen ST-Host. Produktreferenz: `.191` (`b8d3be52c40e540ea1f11fb187914c5eddda12a5`), sauberer Checkout in allen drei Runner-Records.

## 1. Ergebnis und Aussagegrenze

| Profil | Spielerinputs | Ende | Beurteilung |
|---|---:|---|---|
| Warrior / `npc-sociable` · Seed 7 | **70/70** | `done` | Vollständiger natürlicher Lauf, positive Orts-/NPC-/Dungeon-Teilevidenz, aber mehrere Szenen-Informationsverluste |
| Rogue / `npc-wary` · Seed 8 | **22/70** | `extractor_failed` | Technischer Provider-/Credit-Abbruch in Zug 22, bis dahin auswertbar |
| Mage / `npc-inquisitive` · Seed 9 | **0/70** | `process_error` nach `harness` | Bereits der LLM-Spieler scheitert vor der ersten Eingabe an drei HTTP-Antworten; keine RPG-Evidenz |

**Achtung: `batch.json status=completed` besagt nur, dass alle drei Versuche beendet/archiviert wurden. Es ist keine dreifache natürliche Abnahme.** Runner-Integrität: alle drei Profile unverändert, keine Secret-Hits, 0 Foldfehler. Keine unbelegte Erklärung aus dem Zahlencode `HTTP 200`: Der Rogue-Extractor meldet selbst `Payment Required`, beim Mage steht im eigenen Report `HTTP 402: Insufficient credits` mit negativem Restguthaben. Das sind externe Provider-/Guthabenstopps, kein nachgewiesener `.191`-Enginefehler.

## 2. Quantitative Übersicht aus Originalcalls und Records

| Kennzahl | Warrior | Rogue | Mage |
|---|---:|---:|---:|
| Storyeingaben nach Charaktererstellung | 68 | 20 (letzte Extraktion fehlgeschlagen) | 0 |
| LLM-Aufrufe `plan` / `narrator` / `extract` / `board` | 71 / 68 / 75 / 4 | 22 / 20 / 27 / 4 | 0 |
| Insgesamt Provideraufrufe, soweit `calls.json` sie protokolliert | **218** | **73** | 0 |
| Markierte Reparaturaufrufe (Plan + Extractor + Board) | 2 + 5 + 2 = 9 | 2 + 5 + 2 = 9 | 0 |
| `finish=length` | **6** (Plan 2, Narrator 1, Extractor 3) | **2** (Extractor) | 0 |
| Laufzeit inklusive Setup | **61,1 min** | **25,1 min** | 0,8 min |
| Verweigerte World-Deltas | 53 | 22 | 0 |
| Davon `scene_context` | **19 in 3 Antworten** | **16 in 2 Antworten** | 0 |
| Eventgruppen / Events, identisch mit JSONL | 138 / 1.019 | 43 / 401 | 1 / 1 |

**Nicht behaupten:** Diese Zahlen belegen keinen Geschwindigkeits- oder Qualitätsvorteil gegenüber `.188`; die Kampagnen, tatsächlichen Umgebungen und zum Teil Providerbedingungen sind nicht kontrolliert vergleichbar. Die 35 `scene_context`-Ablehnungen sind Folgeereignisse aus **fünf** Episoden, nicht 35 unabhängige Ortsfehler. Zusammen 291 aufgezeichnete Modell-/Boardaufrufe, 8 Längenabbrüche und 18 Reparaturen in den beiden spielbaren Versuchen. Die teilweise erfolgreichen Reparaturen sind nicht mit acht final fehlgeschlagenen LLM-Turns gleichzusetzen.

## 3. Orts-/Reisearchitektur `.191`: Originalepisoden

### Warrior T12 – Ankunft gebucht, Inhalte gehen dennoch verloren (P2)

Spieler: Er folgt Hedwin ausdrücklich zum Langhaus, um dort zu essen. Planner bucht `go` mit Habitatumfang. Narration erreicht das Langhaus; World bucht `scene.moved` zu `loc.the_long_house_by_the_mill`. Der Extractor liefert gleichzeitig als Antwort-Hauptszene noch `realm.duskreach.the_millpond_hamlet_pens_south_of_ashbridge`. Folge: **5 `scene_context`-Ablehnungen** (`person.new`, drei `fact`, `thread`) plus `met_without_arrival` trotz gebuchter Ankunft. Das ist ein Beleg, dass selbst bei funktionierender Bewegung einzelne NPC-/Lore-Inhalte wegen konkurrierender Szenenreferenzen verloren gehen. Kein Teleport; die Engine bleibt räumlich korrekt.

### Warrior T20 – Erzählung bewegt weiter als autorisiert (P2)

Spieler isst, spricht mit Wat und schneidet dem toten Wolf außerhalb des Langhauses das Ohr ab; der Planner gibt kein GO für einen solchen Ortswechsel. Der Narrator verlegt die Handlung zum Kadaver und an den Weg. Extractor meldet `scene=realm.duskreach` bei noch gespeichertem Langhaus. **7 `scene_context`-Ablehnungen**, darunter Objekte, Fakten und Memory/Thread. Die strenge Ablehnung schützt den Ort; das bedeutet aber Verlust eigentlich erzählter Gegenstände und Beziehungen. Aus diesem Fall nicht pauschal auf eine künftig erwünschte automatische Teilreise schließen: eine D3-Lockerung würde erneut Spielerhoheit gefährden.

### Warrior T47–T48 – Sichtbare Nicht-Ankunft und wirksame Rückführung (positiv)

T47: Beim Gespräch am Gehege nimmt der Narrator einen nicht gewählten Aufbruch ins Langhaus vor. `no_go` verwirft `arrive`, weitere **7 `scene_context`**-Meldungen folgen (plus `pc_inventory`); der Spieler erhält `NOT ARRIVED`. Im tatsächlichen Narrator-Request von T48 ist **N1 `WHERE — the pen gate ... not reached` und N4 direkt an der vorigen Assistant-Antwort** verifiziert. T48 erzählt von Hedwin/Wat weiterhin am Gehege, ohne dieselbe Phantomanreise erneut zu buchen. **Ein belegter positiver Fall für N1/N2/N4**, nicht schon ein statistischer Beweis über viele Driftepisoden.

### Rogue T18–T20 – PULSE-Halt, nachgeholte Personen und erneuter Szenenverlust (P2)

T18: GO zurück zur Ashbridge-Gildenhalle; das offene PULSE-Gefahrenfenster hält ihn tatsächlich unterwegs (`realm.duskreach` / `On the way ...`). Der Narrator erzählt drei räuberische Männer auf der städtischen Route. Extractor-Hauptszene ist jedoch `loc.ashbridge` statt des gebuchten Halts: **10 `scene_context`-Ablehnungen** (drei Personen, Position/Awareness und Thread). Die PULSE-Auswertung nennt das Fenster `narrated:none`, weil nichts aus diesen Meldungen kanonisch übernommen wurde. T19 reagiert der Spieler auf die im Narratortext vorhandenen Männer; der Extractor legt die drei Personen erst jetzt in einem **geschlossenen** PULSE-Fenster an. Dies kann als zulässiges Nachführen etablierter Erzählung verstanden werden, erzeugt aber einen zeitlichen Bruch zwischen Ereignis und persistierter Anwesenheit. Nicht als eindeutige PULSE-Regelverletzung ohne weitere Ursachenprobe klassifizieren.

T20: ausdrückliches GO zur Gildenhalle, Ankunft wird gebucht. Die sechs im Straßenabschnitt vor der Ankunft angesiedelten Fakten/Threads/Leave-Meldungen tragen die Referenz `loc.ashbridge.flooded_end_of_millrace_row`, obwohl die Engine gerade auf dem Straßenhalt war; **6 `scene_context`** verworfen. Die Reaktionen und die offene Drohung der drei Männer gehen dadurch teilweise als kanonisches Wissen verloren. Der Spieler kann trotzdem die Gilde erreichen und T21 den Vertrag ordnungsgemäß einlösen.

**Folgerung:** Das zentrale Ziel „nicht dieselbe Reise an verschiedenen Stellen widersprüchlich erlauben/verwerfen“ ist für diese Fälle deutlich verbessert. Die **Extractor-/Szenenchronologie bei mehreren Schauplätzen in einer Antwort** bleibt hingegen eine reale Quelle verlorener World-Nebenfolgen. Kein hektischer globaler `scene_context`-Relax-Fix – die bisherigen Verweigerungen verhindern zum Teil wirklich unberechtigte Buchungen.

## 4. Living Dungeon B5 und neue kausale Kontamination

**Warrior T62/T63 (positiv):** Der Spieler erreicht zunächst Mossback-Gate, danach mit eigenem GO den ersten Living-Dungeon-Abschnitt. World erzeugt `loc.mossback_warrens.l1_s1`, genau einen `place.created`, einen `link.set`, `scene.moved`, `dungeon.part` und den Engine-Slot `scouts`. Die Abschnitts-ID und Ebene 1 sind konsistent; keine erzählte Treppe konkurriert mit der Dungeonautorität. **Nicht abgedeckt:** Ende von Ebene 1, ausdrücklich gewählter Abstieg auf Ebene 2, Boss, Reset in freiem Narratormodell; Warrior bleibt bis Input 70 in der ersten Begegnung, Rogue/Mage betreten keine Dungeons.

**Warrior T70 (konkreter Kontinuitätsdefekt, P1/P2-Fachbefund):** Während noch `Goblin Lookout B` bei **5 HP** lebt, erfindet der Narrator **zwei Speer-Goblins aus dem tieferen Tunnel**. `creature.new` wird mit `dungeon_foe` korrekt abgelehnt; dessen `aware` scheitert an `creature_continuity`. **Aber** `thread.set` `thread.t66.1` wird akzeptiert und behauptet in seinem Text weiter, dass genau diese „two spear-goblins“ vorgerückt seien. Damit steht eine **belegte abhängige Weltinformation über ausdrücklich verweigerte Kreaturen im Eventlog**. Der Lauf endet hier: Keine Aussage über späteren Persona-Effekt. Eine gezielte Negativregression muss verhindern, dass falsche Kreatur/NPC-Nachfolgeereignisse als unabhängiger Thread kanonisch bleiben, ohne legitime Threads über hörbare unbekannte Geräusche pauschal zu löschen.

## 5. NPC E2/E3, PULSE, Guild und Handel

**Warrior:** 8 erstmals gebuchte Personen, 5 Wiederbegegnungen, 3 gemeinsame Reisen, 3 gespeicherte E3-Anker (2 später vollständig in Karten), 10 Mehrpersonenszenen; 2 Gildenaufträge tatsächlich abgeschlossen, jeweils 40 cp Guildpayout, später 23 cp regulärer Verkauf. Zurückgewiesene E2-Ankunftsbelege (`met_without_arrival`, `met_evidence`, `met_not_known_here`) treten weiterhin auf; die automatische Auswertung zählt trotz fünf erzählerischer Wiederbegegnungen **0 per `met` akzeptierte Rückkehrbelege**. Das ist eine Lücke der E2-A-Abdeckung, keine Aussage, dass die Figuren in der Story niemanden erkannten. Spätere Ankeränderung und persönliche Langzeitabsprachen fehlen.

**Rogue:** 12 erste NPCs, eine Rückkehr des Guild-Clerks mit einem akzeptierten `met`, ein E3-Anker mit später voller Karte, ein persönlicher Thread (noch nicht später aufgegriffen), ein abgeschlossener Gildenauftrag mit 40 cp Guildpayout. Das Narrativ über drei Bedrohende führt zu den oben genannten Szene-/Anwesenheitslücken; der anschließende Providerabbruch verhindert langfristige E2/E3-Beurteilung.

**PULSE:** Warrior 37 Würfe / 5 offen, Rogue 14 / 3 offen, Mage 0; kein beobachteter Dungeon-PULSE, kein unterbrochener Rastblock. Die automatischen Auswertungen melden **0 sicher festgestellte Regelverletzungen**, aber `open_window_not_narrated` und `new_world_content_in_closed_window` bleiben ausdrücklich semantische Prüfhinweise, keine pauschalen PULSE-Pass-Labels.

**Wirtschaft:** Die überprüften Gildenpayouts gehen korrekt aus den dafür gebuchten Verträgen hervor. Refusals von daneben erzählten `coin.gift` sind richtige Doppelzahlungs-Guards. Keine reproduzierte fehlerhafte Geldbuchung wie in `.186` nachgewiesen. Für die breite Handelskette fehlen hier passende zusätzliche Fälle.

## 6. Architekturziel und Empfehlung

| Ziel der `.190/.191`-Reform | Natürliche Evidenz dieses Batches | Urteil |
|---|---|---|
| Engine besitzt Ankunft und Dungeon-Level/Abschnitte | Gate und erster Mossback-Abschnitt samt Slot konsistent; kein selbstwidersprüchlicher Dungeonpfad | **teilweise positiv**, Mehrebenen/Boss noch offen |
| Kein mehrzügiger Erzähler-Ortsdrift nach verweigerter Reise | T47 `NOT ARRIVED`, T48 N1/N4 tatsächlich im Request und konsistente Fortsetzung | **ein positiver Originalfall** |
| Keine verwaisten Orte/Duplikate | Keine aus den untersuchten aktiven Fehlankünften belegten neuen verwaisten Räume; Tannery Rows nicht besucht | **nicht hinreichend abgedeckt** |
| Kein Verlust relevanter Weltinformationen durch Orts- und Szenenchaos | 35 `scene_context` in fünf Antworten; einzelne wichtige NPC-/Thread-Inhalte verloren | **weiter offener Problembereich** |
| Monster-/NPC-Kontinuität | zwei abgelehnte Dungeon-Goblins, aber abhängiger Thread gespeichert | **gezielter neuer Befund** |
| Performanceverbesserung | Warrior 61,1 min/70 Eingaben, Rogue 25,1 min/22, kein identischer Vorherlauf | **nicht belegt** |

**Gesamtwertung: nur eingeschränkt auswertbarer natürlicher `.191`-Pilot, kein vollständiger Dreierbatch.** Kein Anlass zu einer weiteren allgemeinen Architekturänderung. Der klarste eng begrenzte Fachbefund ist **T70: kausaler Thread über zurückgewiesene Dungeon-Gegner**; der wichtigste weiterhin beobachtete Systembereich sind mehrörtige Narrator-/Extractor-Antworten. Beide sollten in einem unabhängigen Gegenreview am Code nachvollzogen und nur nach belastbarer Ursachenanalyse gezielt korrigiert werden.

**Nächste Testabdeckung:** Nach Wiederherstellung des Provider-Guthabens **Rogue und Mage erneut natürlich spielen**, Warrior muss für bloße Batch-Vervollständigung nicht nochmals 70 Inputs durchlaufen. Für B5 zusätzlich einen **nicht geskripteten** Zweiebenen-/Bossverlauf beobachten, für Ortsidentität eine tatsächliche Rückkehr zu Tannery Rows unter anderer Formulierung, sowie eine weitere `NOT ARRIVED`-Episode und die daraus entstehende Narrator-Folge. Kein Vertrauen auf `batch.status=completed` als Spielabnahme. Bei erneuter Ausführung saubere neuen Runnerordner/Version/Seed dokumentieren und Ergebnisse nicht als ein identisches Dreierbatch ausgeben.

**Quellenverfügbarkeit:** Vollständige Original-ZIP liegt als Nutzerupload in der Unterhaltung, **nicht** mit diesem Markdown-Review auf GitHub archiviert. SHA-256 oben erlaubt spätere bytegenaue Zuordnung. Keine Quelllogs, Zugangsdaten oder personenbezogenen Providerkonfigurationen in den Review kopiert. Keine neue Node-Suite, kein Replay und keine Produktdatei von GPT verändert.