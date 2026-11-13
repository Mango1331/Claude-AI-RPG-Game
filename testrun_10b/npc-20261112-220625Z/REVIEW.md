# NPC-/PULSE-Dreierbatch 12./13.11.2026 – unabhängiger GPT-Review

**Quelle:** vom Nutzer hochgeladenes ZIP `npc-batch-20261112-220625Z.zip`; Laufzeit 12.11.2026 22:06:25 UTC bis 13.11.2026 00:54:24 UTC. **Spielengine:** `4.3.0-c.6.6.179`; **Runner-Commit:** `ebf2bf6` (drei NPC-Spieler, Windows-Testpfadfix, unveränderte Spielmechanik). Drei echte LLM-Spieler mit `zai-org/GLM-5.3-Flash`, Seeds 7/8/9, getrennte neue Kampagnen. Originalverfügbarkeit und SHA-256: [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md).

**Prüfweise:** ZIP-CRC aller 54 Einträge; unabhängig aus `chat.jsonl` und `avereth-events.json` verglichene Eventgruppen; `evaluation.json`, `npc-pulse.json`/`.md`, `run.json`, `calls.json`, echte Planner-/Narrator-/Extractor-Completions und `player.jsonl` für die unten genannten Zugketten gelesen. **Keine** erneute vollständige Engine-Fold-/Node-/ST-/Replay-Ausführung; Fold-/Validatorresultate sind im echten Run archiviert. Die automatische NPC-/PULSE-Auswertung ist ein **Messinstrument**, keine semantische Qualitätsfreigabe. Ohne eigene Benutzer-Spielsitzung ist das Spielerfeedback der LLM-Spieler kein menschliches Spielgefühl.

## 1. Urteil

**Ergebnis: wertvolle natürliche Abdeckung, aber keine NPC-E3-Abnahme.** Der neue LLM-Dreierbatch funktioniert als Testinstrument. Zwei Spieler erreichen 70 Eingaben, einer scheitert frühzeitig. Die formale Event-/Foldintegrität ist positiv. Im echten Spiel werden aber **Orte und erreichte Szenen bei einer erzählten Reiseunterbrechung nicht zuverlässig kanonisch gebucht**: im Rogue- und Mage-Lauf führen ausführliche Szenen auf Landstraße bzw. vor Dungeon zu Personen/Kämpfen, während der autoritative Zustand noch die alte Gildenhalle führt. Der Rogue verliert deshalb nachvollziehbaren Questcredit und verbringt viele weitere Züge mit erfundener Beweisbürokratie. Der Mage strandet danach in einer Planner-Formatfehlerserie. Die NPC-E3-Ankerbildung bleibt **0/188**, trotz mehrerer natürlicher Wiederbegegnungen.

**Priorität:** P2 für Orts-/Reiseunterbrechungsintegrität; P2 für wiederholten Plannerformat-Blocker als echte Abbruchursache; E3-Vertragspräzisierung V-1 und Gildenbearbeiterkette als gezielte Qualitätskandidaten. Kein Freibrief für globale `scene_context`-/`met`-Lockerung, großen WorldTxn-/Ortsumbau oder PULSE-Wahrscheinlichkeitsänderungen.

## 2. Die drei tatsächlichen Läufe

| Lauf | Inputs, Ende | Spielweg und Stand | NPC E2/E3 | PULSE |
|---|---|---|---|---|
| **1: `npc-sociable`**, Warrior, Seed 7 | **70 / `done`** | Hen-run-/Hound-Jagd, Farmkontakte Merta/Tam, ein Gildenvertrag abgeschlossen; L2, 105 HP am Schluss; letzter Schauplatz Dye works | 9 Personen, 4 Wiederbegegnungen, 2 akzeptierte `met`, 0 `handled_by`, **0 Anker** | 48 Würfe / 9 offen |
| **2: `npc-wary`**, Rogue, Seed 8 | **70 / `done`** | Tomcat-/Allotments-Jagd und vergebliche Abgabe; nach falsch gebuchtem Kampf/Ortsweg weiterhin 0/1 Questcredit; L1, 53 HP; am Ende Kampf mit Tomcat C | 9 Personen, 6 Wiederbegegnungen, 0 akzeptierte `met`, 0 `handled_by`, **0 Anker** | 32 Würfe / 7 offen |
| **3: `npc-inquisitive`**, Mage, Seed 9 | **48 / `repeated_model_failure`** | Cindlemill-Serpent-Vertrag erfolgreich abgeschlossen, anschließend Mossback-Reise/Verhandlung; Abbruch nach drei Planner-Failsoft-Antworten; L3, 90 HP | 6 Personen, 2 Wiederbegegnungen, 0 akzeptierte `met`, 0 `handled_by`, **0 Anker** | 32 Würfe / 9 offen |

Der **Batchstatus `completed` ist nicht das Urteil über 3 bestandene Läufe**. Der Batchcontroller beendet nach drei abgeschlossenen/abgebrochenen Kindprozessen mit vorhandenen Auswertungen; der dritte Lauf hat den geforderten `open_run_duration`-Meilenstein **nicht erreicht**. Die Serie umfasst **188 Spielerinputs**, **379 Chatnachrichten** (141/141/97), **2.576 Engineevents** (965/966/645) in **358 Exportgruppen** (136/137/85). **358/358 Gruppen stimmen unabhängig mit den eingebetteten Chatevents überein**; alle drei archivierten Evaluierungen melden `integrity.ok=true`, 0 Foldfehler, 0 Validatorprobleme; keine PageErrors und kein Geheimnistreffer, Spielerprofile unverändert. Dies schließt semantisch falschen kanonischen Ort **nicht** aus.

## 3. P2-A: Reiseunterbrechung lässt Welt am Quellort weiterleben

**Rogue, T36–T48, später bis T70:** T35 Registrierung und Annahme des Millbrook-Tomcat-Vertrags. T36: Der Spieler **geht** von Alderwatch zum Millbrook-Allotment-Gelände. Der Planner erzeugt ein gültiges `go`. Der Narrator erzählt unterwegs zwei wilde Hunde; der Extractor meldet `expected.1.arrived=false` und **keine kanonische Zwischenankunft**. Die Hunde werden dennoch `entity.created`/`scene.entered` am **unveränderten aktuellen Ort** (Alderwatch-Gildenhalle) gebucht. Der Runner hält für T36–T55 weiter `Adventurers' Guild hall, Alderwatch` als `place` fest, obwohl der Erzähler Hecken, Beete, Mauerfugen und Jagd beschreibt.

- **T41:** Ein zusätzliches `go` zu einem neuen lokalen Zauneck mit `within` wird vom Handler ausdrücklich als **`invalid local habitat scope`** abgelehnt. Der nachfolgende World-Text über Ortsdetails wird teils zu Recht durch `scene_context` abgewiesen; die Erzählung geht dennoch an den Allotments weiter.
- **T44:** Ein Tomcat wird mechanisch am weiterhin falschen Ort materialisiert.
- **T46–T47:** Echte, enginegebuchte Razor-Cut-Angriffe töten genau diesen Tomcat; Loot wird erzeugt. Weil jedoch die **kanonische Populations-/Ortszugehörigkeit** nicht stimmt, bleibt das Gildenobjective auf **0/1**. Die gemeldete `quest.ready` wird nicht autoritativ angenommen; dieser Schutz gegen Fremdcredit ist korrekt.
- **T48:** Der Spieler will zurück zur Millbrook-Gildenhalle, aber die Engine antwortet „already at Adventurers' Guild hall, Alderwatch“ und verweigert die Abgabe.
- **T49–T69:** Das freie Modell versucht, den angeblich fehlenden Nachweis durch Schreiber, zusätzliche Scheine und Warden Doss einzuholen. Das verlängert den eigentlichen Ortsfehler zu einer Handlungsschleife, obwohl der Systemzustand weiter 0/1 meldet.
- **T70:** Neuer Kampf mit `Feral Tomcat C`, während der Run im Millbrook-Gildenhallenbereich geführt wird; das belegt eine zweite narrativ/mechanisch stark verwobene Jagdkette, nicht automatisch einen zweiten vergütbaren Jagdsieg.

**Mage, T44–T48 – paralleler Integritätsmechanismus:** Er verlässt an T44 nach gültigem `go` die Ashbridge-Gildenhalle Richtung Mossback Warrens. Der Narrator schildert unterwegs am Dungeon fünf bewaffnete Männer. Die Extraktion antwortet `arrived=false` ohne Zwischenort; `npc.npcroad_bandit_leader` wird trotzdem mit `scene.entered` am noch gebuchten Ashbridge-Gildenhallenort erstellt. T45 ist die Verhandlung erzählerisch am Warrens-Clearing, mechanisch weiter in der Ashbridge-Gildenhalle. Ein späterer `go` zum Dungeon findet vor dem Abbruch nicht mehr statt.

**Einordnung:** Kein beweisbarer Fehler in einem späteren `quest_count` allein. **Ursache ist die unterbrochene Reise ohne autoritativ erreichten Zwischenort, gefolgt von lokaler Materialisierung am alten Ort.** Die Spieler-LLMs bemerkten die Divergenz mehrfach in `player.jsonl`; sie war also als Spielproblem wahrnehmbar, nicht nur durch nachträglichen Eventvergleich.

**Empfohlener enger Folgeauftrag:** Einen **einzigen** reproduzierbaren Originalfall Rogue T36→T47 und Mage T44→T45 in einem aktuellen `GO → erzählte Unterbrechung → arrive/scene → person/creature.new → Questcredit`-Integrationspfad prüfen. Eine angekündigte Reise darf keinesfalls automatisch am Ziel buchen; ein **echter Zwischenhalt** braucht aber eine autorisierte, persistente Zwischenortlösung oder eine sichere andere Behandlung lokaler Weltfolgen. Unzulässig: `arrived=false` zu `true` umdeuten, Remote-Entitäten pauschal in `here` buchen oder die Quest-/Präsenzfirewall lockern. Die vorhandene [O1/O2-Analyse mit GPT §9](../../recherche/FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md) als Ausgangspunkt lesen; **nicht** voraussetzen, dass O1-B1 den Fall schon behebt, denn hier **fehlt** der kanonische Zwischenort.

## 4. P2-B: Mage-Runner endet an Planner-Format statt an gewählter Handlung

Mage-T46/T47/T48 und Rohrequests des Planers:

| Input | Planerantwort/Repair | Enginefolge |
|---|---|---|
| **T46:** bedingtes Angebot an die Warrens-Männer | `[]`, Repair ebenfalls `[]` | `planner_not_executed`, kein Schritt gebucht |
| **T47:** klare Zusage zur Rollenverteilung | zunächst unstrukturierter Text, Repair `[]` | erneute sichere Ablehnung |
| **T48:** „I go in first now …“ | zunächst unstrukturierter Text, Repair `[]` | dritte sichere Ablehnung, `repeated_model_failure` |

Der Vertrag verlangt `{"commands":[...]}` (auch für null mechanische Handlungen!), nicht ein nacktes Array. Der letzte Modelllauf lieferte **`finish_reason=stop`**, aber kein vertragskonformes Format – der konkrete Stopp ist daher **nicht** primär der einmal im Mage-Serverlog beobachtete `ECONNRESET`. Der Model-Reasoningtext zeigt zudem Unsicherheit über den **realen Ort** und ob „I go in first“ im Gespräch eine Zusage oder eine echte Ortsbewegung ist. Beides ist zu unterscheiden: Der Ort war bereits durch §3 inkonsistent; der unmittelbare technische Abbruch ist aber ein wiederholter Formatter-/Repair-Fehler.

**Gegentest/Empfehlung:** Vor einem Renderer-/Fallback-Workaround die echten Planerrequests T46–T48, Repaireingaben und vorhandene `parsePlan`-/Failsoft-Absicherung in Isolation prüfen. Eine reine Gesprächsantwort `[]` nicht ohne Modellbeweis als `go` oder Zustimmung in die Engine übersetzen. Ein **streng begrenzter syntaktischer** Array-zu-Objekt-Fallback wäre nur dann zu diskutieren, wenn der Inhalt bei `[]` eindeutig bedeutet „keine mechanische Handlung“ und mit der bestehenden Plannersemantik sowie Quellbindung wirklich kompatibel ist; er **behebt weder den falschen Ort noch die Spielerblockade durch wiederholtes rein sprachliches Aushandeln**. Erfolg im isolierten Parser ist nicht natürlicher Kampagnenbeleg.

## 5. NPC E2/E3 – technisch eingebaut, natürliche Wirkung bleibt aus

**E3: 0 gespeicherte Persönlichkeitsanker** in allen drei Runs, trotz **24 neuen Personen und 12 wiederkehrenden Anwesenheitsspannen** laut Runner. Unter den tatsächlichen Extractorberichten sind **zwei** dauerhafte Kandidaten für eine bekannte Figur dokumentiert, die an `anchor_value` scheitern (Wary: `manner` des Guild-Clerks; Mage: `voice` von Hessa), außerdem **ein** korrekter `anchor_first_contact`-Refusal bei Dalli (Warrior). Auf die gleiche `.179`-Engine folgt somit der Pilot `.174` mit 0 Ankern und jetzt ein weiterer echter Lauf mit 0 Ankern. **E3 ist als natürlich funktionierendes Spielerfeature nicht abgenommen.**

**Nächste kleine Option – E3-V-1:** Den Extractorvertrag **explizit** über `≤80 Zeichen` informieren und für eine tatsächlich später belegte Anwesenheit die Kandidatenberechtigung erkennbar machen (nur belegte `voice/manner/interest`, keine Stimmungswerte). Keine sofortige Firewall-Schwächung oder automatische Ankererzeugung aus beliebiger Prosa. Vor der Umsetzung die beiden Original-`anchor_value`-Berichte als rote Beispiele und Erstkontakt als grünen Schutzfall verwenden; nachher separat prüfen, ob **das Modell natürlich** tatsächlich gültige Kandidaten liefert. Eine reine Promptregression garantiert das nicht.

**E2-A-Gildenbearbeiter:** Die Runner-Abdeckung zeigt **0 akzeptierte `handled_by`-Wissensbuchungen**. In Rohantworten liegen **acht** `handled_by`-Versuche (Warrior 2, Rogue 3, Mage 3), davon **sieben ausdrücklich `desk_handler`-abgewiesen**: unzureichender wörtlicher Zusammenhang, unklare Pronomen oder tatsächlich **nicht erfolgte** Questabgabe. **Eine Mage-Meldung bei T43 ist nicht abgewiesen**, führt aber nach dem gespeicherten Evaluatorbefund zu **keinem neuen `knowledge.gained`** für die zuständige Person. Ob dies eine echte fehlende Buchung oder eine Evaluatorgrenze bei bereits vorhandenem Wissen ist, muss am isolierten Event-/Wissenspfad geprüft werden. Die Zählung **0** ist nicht gleichbedeutend mit acht Refusals.

**E2-Wiederbegegnungen:** 12 beobachtete Rückkehrspannen, davon 2 per angenommenem `met` (beide Warrior). Mehrere Ablehnungen sind **legitim**, weil ein `met` eine tatsächliche Ankunft, bekannte Ortszuordnung und passende **wörtliche** Evidenz braucht. **Nicht** aus bloßer Refusalzahl eine pauschale Lockerung von `met_not_known_here` oder `met_evidence` ableiten. Gesprächskontinuität, Personenidentität, Mechanik und Spieler-Erinnerung getrennt beurteilen.

**Freie Absprachen/Threads:** Der Mage hat eine gespeicherte persönliche Hessa-Schuld/Abrede und spätere Aktualisierung; Warrior und Rogue kaum persönliche Vereinbarungen. Daher **kein vollständiger Abnahmetest** für das E2-B-Threadmatching. Das Fehlen neuer gleichlautender Schuld-/Doppelthreadfälle ist positiv, aber kein allgemeiner Vollnachweis.

## 6. PULSE, Context und Spielerlebnis

- **PULSE:** 112 echte Fensterwürfe, **25 geöffnet** (9/7/9). Automatischer Erzählerindikator **15/25 „likely narrated“**, zehn `open_window_not_narrated`-Heuristikfälle (5/2/3); diese Zahlen sind **nicht** 10 bewiesene Verstöße. Beispiele können als kleine Spuren/Hinweise natürlich statt explizit auftauchen. Keiner der drei Läufe betritt **mechanisch** einen Dungeon, keiner löst eine gebuchte Rastunterbrechung oder Dungeonwanderung aus. **PULSE D ist damit nicht vollständig abnehmbar**; keine Schwellen-/Ereignisdichtekorrektur allein aus diesen Counts.
- **Kontextauslieferung:** Im gemessenen Erzählerkontext 173 Züge mit Diagnosedaten (66/67/40). `present` wurde in 106/173 ausgegeben; `relevant` in **48/173** (Warrior 21, Rogue 24, Mage 3), in weiteren 115 Zügen als Segment verdrängt. Interne Budgets überschritten **43/173** Züge (13/24/6). Das ist gegenüber dem alten Pilot kein gleicher Verteilungsversuch und kein gemessener Erfolg bestimmter NPC-Inhalte. D3-Teillieferung bleibt **eine gezielte Option**, ohne jetzt die Budgetgrenze oder `quests` blind zu kürzen.
- **Positives Spiel:** Warrior verfolgt über mehrere Orte die Hound-/Henspur, lernt Merta und Tam kennen und schließt die Jagd samt Auszahlung ab. Rogue versucht aus eigenem Antrieb zu erkunden, abzulehnen und die Situation mit Zeugen zu lösen. Mage führt eigene Gespräche über das Millrace und beendet eine Guild-Jagd. Unterschiedliche Spieler-Charaktere/Notizen entstanden ohne fest verdrahtete Dialogszenen.
- **Auffällige Narration bei Mage T40/T42:** Der Guildvertrag wird **enginegebucht abgeschlossen** und `coin.changed +40 cp` dem PC gutgeschrieben. T42 behauptet der Narrator dennoch, der Clerk halte die Auszahlung bis zu zusätzlichem Beweis zurück. Die Firewall weist eine entsprechende Umdeutung der offiziellen Questdetails zurück; der **autoritative** Zustand bleibt korrekt, die Erzählung lenkt den Spieler aber falsch. Als **P3 mit relevanter Spielerfriktion** beobachten; keine neue Trophäenpflicht oder zweite Endpreis-/Questautorität implementieren.
- **Provider:** Warrior-Log enthält ein einzelnes `ETIMEDOUT`, Mage-Log einen `ECONNRESET`-Proxyfehler; trotz vereinzelter Störungen laufen beide weiter. Das finale Mage-Ende folgt nach drei erfolgreichen, aber strukturell unbrauchbaren Planner-Responses. Kein pauschaler Provider-/Windows-Stopp.

**Keine automatischen Regelverletzungen** in `npc-pulse.json` ist **kein** Beleg, dass es keine P2-Szenen-/Ortswidersprüche gibt. Spieler-Notizen wie „HUD still shows Guild hall while the narration has me at the allotments“ sind wertvolle spontane Diagnosepunkte und gehören mit Event- und Erzählbelegen abgeglichen.

## 7. Priorisierte Folgeschritte – kein neuer Generalreview

| Reihenfolge | Auftrag | Gate |
|---|---|---|
| **P2 zuerst** | **Reiseunterbrechung + kanonischer Zwischenort + lokale Spawn-/Questautorität**: Rogue T36–T47 und Mage T44–T45 mit Originalreports und `src/v4/world.js`, Reise-/`arrive`-/PULSE-Pfad gegen `.179` nachstellen; minimalen Fixplan/Rote Fälle, nicht vorher allgemein refactoren. | Kein fälschliches Ziel-`arrived=true`, keine Fern-/Quellraum-Spawns, kein fremder Killcredit, richtige Weiterreise und Replay |
| **P2 zugleich/anschließend** | **Plannerformat-/Repair-Blocker** aus Mage T46–T48 gezielt reproduzieren; saubere Formatgarantie statt neuer PC-Autonomie. | Alle drei Äußerungen entweder valides Gespräch ohne Buchung oder begründet abgelehnt/gezielt geklärt; kein dreifacher Endlos-Softfailure |
| **E3 klein** | **V-1-Ankervertrag** mit `≤80` und tatsächlicher Folgepräsenz; rot: 2 Original-`anchor_value`, grün: Erstkontakt, Stimmung, falsche ID. | Natürlicher Folgecheck muss echte gespeicherte, später auslieferbare Anker zeigen; nicht bloß Validatorgrün |
| **E2-A klein** | `handled_by`-Beleg 0/8 differenzieren: 7 echte Refusals und 1 unrefusierter, vom Evaluator nicht als neue Wissensbuchung gezählter Fall. | Nicht still pronomenbasierte Fremdzuordnung erlauben; Beleg und zuständiger Deskstep müssen stimmen |
| **Später** | D3-Teillieferung, PULSE-D-Tuning, E4/E5 und große Featureplanung getrennt. | Natürliche Messung nach Pflichtkorrekturen; keine Generalanalyse ohne neue Ursache |

**Keine Produktänderung durch diesen Review.** Auf `main` liegen nur Analyse, Quellenmanifest und die kurzen zentralen Verweise. Die große hochgeladene Original-ZIP wird **nicht** still als bereits im Git-Repository archiviert ausgegeben; sie ist anhand ihrer SHA-256-Prüfsumme erneut zuzuordnen.

---

## §8 – Unabhängiger Fable-Gegenreview des natürlichen Dreierbatches

**13.11.2026 · Claude · eigenständiger Review, keine Überschreibung der §§1–7.** Grundlage ist das vom Nutzer bereitgestellte Quellenpaket `npc-batch-20261112-220625Z_fable-quellen.zip` (32 Dateien: je Lauf `chat.jsonl`, `avereth-events.json`, `chat-completions.jsonl`, `calls.json`, `player.jsonl`, `run.json`, `evaluation.json`, `npc-pulse.json`/`.md`, `report.md`; dazu `batch.json` und `report.md`). Die sechs SHA-256-Werte für `chat.jsonl` und `avereth-events.json` stimmen mit dem [Quellenmanifest](SOURCE_MANIFEST.md) überein. Serverlogs und Screenshots lagen mir nicht vor.

**Prüfweise:** eigene Auswertung der Records je Zug (Plan, Auflösung, Ergebniszeilen, Erzählung, Rohextraktion, Ablehnungen, Korrekturen), der Planner-/Extractor-Requests samt Reparaturanfragen und der Spielernotizen; Ursachen am Produktcode von `ebf2bf6` (Engine `.179`, Spielcode gegenüber `59f868e` unverändert). **Nicht gemacht:** kein Fold, kein Replay, kein Test, kein Modellaufruf. Den Vergleich der 358 Eventgruppen aus §2 habe ich nicht wiederholt. Alle Maßnahmen unten sind aus Code und Daten abgeleitet, nicht ausgeführt. T-Nummern sind Spielereingaben wie in §§1–7.

### 8.1 Gesamtbewertung der drei Läufe

**Technisch stabil, spielerisch deutlich schwächer, als §1 es beschreibt.** Kein Foldfehler, kein Absturz, keine falsche Geld- oder Questbuchung. Aber in zwei der drei Läufe ging der größere Teil der Eingaben an Blockaden verloren, die nicht aus Spielerentscheidungen stammen.

| Lauf | Was tatsächlich geschah | Eingaben ohne spielerischen Fortschritt durch Integrationsfehler |
|---|---|---|
| **Warrior** (70) | Registrierung scheitert in T5/T6 und gelingt erst in T26. Danach ein stimmiger, gut erzählter Jagdbogen mit Merta und Tam (T27–T57), Abgabe mit Auszahlung, zwei Verkäufe. Bester Lauf | T5–T26 (21 Eingaben bis zur Mitgliedschaft), darin die Schmiedeschleife T20–T24; zwei nicht gebuchte Nachtruhen (T15, T44) |
| **Rogue** (70) | Registrierung scheitert in T5/T6 und gelingt erst in T35; der erste Vertrag läuft dabei ab (T32). Ab T36 steht Alaric kanonisch in der Gildenhalle, erzählerisch in den Allotments. Der Kill T47 zählt nicht; T48–T69 Beweisbürokratie | T5–T35 und T36–T70: der Lauf erreicht mechanisch fast nichts (L1, Vertrag 0/1) |
| **Mage** (48) | Registrierung gelingt in T7. Schöne Hessa-Episode, aber drei Serpent-Kills für einen Ein-Kill-Vertrag (T14, T26, T38). Abgabe und Auszahlung T40 korrekt. Ab T44 Ortsfehler wie beim Rogue, Abbruch T48 | T3–T6 (verlorene Extraktion), T15–T37 (zwei Kills ohne Credit), T24 und T46–T48 (Planner-Format) |

**Kennzahlen des Batches** (eigene Zählung):

| | Warrior | Rogue | Mage | Summe |
|---|---:|---:|---:|---:|
| Modellaufrufe / davon Reparaturen | 221 / 18 | 236 / 23 | 157 / 26 | 614 / 67 |
| Leere Antworten mit `finish_reason=length` (Planner + Extractor) | 5 | 11 | 8 | 24, rund 1240 s von 7813 s Modellzeit |
| Extractor-Meldungen / abgelehnt | 229 / 65 (28 %) | 253 / 74 (29 %) | 165 / 41 (25 %) | 647 / 180 (**28 %**; Pilot 01: 19 %) |
| Extraktionen ganz verworfen (`status: failed`) | T56 | T38, T51, T63 | T3, T20, T21 | **7** |
| Planner „NOT EXECUTED“ | – | T39 | T24, T46, T47, T48 | **5** |
| Spielerbefehle nicht ausgeführt (`refused`/`pending`/`clarify`) | 33 % | 30 % | 10 % | |

**Was gut funktioniert:**
- **Kampf und Progression:** Alle Kämpfe sind sauber gebucht (Treffer, Tod, XP, Loot, Level-up, `#assign`).
- **Gildenabgabe:** Warrior T57 und Mage T40 schließen mit Auszahlung und XP ab, je einmal.
- **Schutzwirkung der Finanzregeln:** Mage T31 plant der Planner die Richtung falsch (`pay` an Hessa, obwohl sie zahlt); nichts wird gebucht. Mage T32 meldet der Extractor 100 cp für „one silver“; die Ablehnung ist richtig.
- **PULSE-Erzählung:** Offene Fenster werden gut umgesetzt (Hunde auf der Gasse, bewaffnete Männer vor den Warrens, Spuren). Das Problem liegt nicht im Fenster, sondern in der Ortsbuchung danach (§8.4 P2-2).
- **Absprachen:** Hessas Zusage entsteht als `debt` mit beiden Parteien und wird per ID fortgeschrieben (Mage T31/T32).
- **Spieler-LLMs:** Drei erkennbar verschiedene Verhaltensweisen. Alle drei behandeln das Engine-Ergebnis als maßgeblich und notieren Widersprüche präzise; diese Notizen waren der schnellste Weg zu den Befunden.

### 8.2 Bewertung der GPT-Befunde

**Bestätigt:**
- **P2-A (§3):** Ablauf Rogue T36–T48 und Mage T44–T45 stimmt mit den Records überein, einschließlich `arrived=false`, `scene: here`, Erzeugung der Hunde bzw. des Anführers am Abreiseort, abgelehntem `go` mit `within` (T41), Kill ohne Credit (T47) und „already here“ (T48). Die Priorität P2 ist richtig.
- **P2-B (§4):** Die Antworten T46–T48 sind `[]` oder Prosa mit `[]`; der unmittelbare Abbruch ist ein Formatfehler, nicht der `ECONNRESET`. Richtig ist auch, dass der falsche Ort dahinter steht: Die Planner-Begründung zu T48 lautet „HERE is the Guild hall, but the bandit leader is present — odd … The warrens are half a day's walk away“ und führt deshalb zu keinem `go`.
- **E3 (§5):** 0 Anker; genau drei Kandidaten in 188 Eingaben. Zwei scheitern nur an der 80-Zeichen-Grenze (Rogue T33, 103 Zeichen; Mage T36, 92 Zeichen). Der Extractor-Vertrag nennt diese Grenze nicht (`deltas.json`, Typ `fact`). **V-1 ist begründet.**
- **Kontextzahlen (§6):** `present` 106/173, `relevant` 48/173, Überlauf 43/173 stimmen mit meiner Zählung überein.
- **Einordnung von `completed`** und der fehlenden Dungeon-, Rast- und Wandererabdeckung.

**Eingeschränkt:**
- **Ursache von P2-A.** §3 nennt „unterbrochene Reise ohne autoritativ erreichten Zwischenort“. Das stimmt, greift aber zu kurz: **Die Engine selbst hat den Halt angeordnet.** In Rogue T36 und Mage T44 öffnet PULSE ein Gefahrenfenster auf der Reiseetappe (`exposure: travel`) und schreibt dem Erzähler vor: „It is a real stop short of …“. Der Erzähler folgt exakt. Die Engine weiß also vor der Erzählung, dass Alaric unterwegs stehen bleibt, bucht aber keinen Ort dafür. Der Verweis auf O1/O2 hilft hier nicht; dieser Fachplan behandelt Szenenmarken vor einer Ankunft, nicht den fehlenden Ort.
- **Umfang von P2-A.** Es sind drei Fälle, nicht zwei: Auch Rogue T32 (Fenster `meeting` auf der Etappe) erzeugt die Person am Abreiseort; der Fall bleibt folgenlos, weil T33 ankommt. Von vier unterbrechenden Reisefenstern des Batches hat nur eines einen Zwischenort bekommen (Warrior T27, „Alder dip on the Bricklane road“).
- **Umfang von P2-B.** Der Mage verliert **vier** Züge am selben Fehler, nicht drei: T24 endet ebenfalls mit zweimal `[]`. T45 wurde nur gerettet, weil die Reparatur `{"commands":[]}` lieferte.
- **Vorsicht beim Array-Fallback.** §4 hält ihn für nur bedingt diskutierbar. Ich sehe ihn als rein syntaktisch und sicher (§8.4 P2-3): In allen fünf Fällen war die Planner-Aussage „keine mechanische Handlung“ inhaltlich richtig.
- **`handled_by` (§5).** „Sieben ausdrücklich abgewiesen: unzureichender wörtlicher Zusammenhang, unklare Pronomen oder nicht erfolgte Questabgabe“ fasst zwei verschiedene Dinge zusammen. Nur zwei Ablehnungen sind berechtigt (Rogue T62, T67: die Abgabe fand nicht statt). **Fünf betreffen einen von der Engine gebuchten Schalterschritt**, den die Erzählung sichtbar zeigt (Warrior T26, T57; Rogue T35; Mage T9, T40).
- **`met` (§5).** Von 21 Ablehnungen sind 10 `met_not_known_here`. Das ist keine Frage der Zitatqualität: Die Person steht nicht in der `KNOWN AT`-Liste des Zielorts, weil sie an einem Nachbarort gespeichert ist (Merta und Tam: Hühnerhof gegen Langhaus; Hessa: Mühle gegen Weidenstand).
- **Laufbeschreibungen in §2.** „T35 Registrierung“ beim Rogue und „Vertrag erfolgreich abgeschlossen“ beim Mage sind richtig, verdecken aber 30 verlorene Eingaben bzw. zwei nicht gezählte Kills.

**Widerlegt:**
- **Mage T42 als Erzählfehler (§6, „P3 mit Spielerfriktion“).** Der Erzähler hat hier eine **Vorgabe der Engine** befolgt. Der Erzählerprompt zu T42 enthält unter CORRECTIONS wörtlich: „"A Snake by the Millrace" is ACTIVE: accepted, not yet turned in, nothing paid (the engine's state; the story does not change it).“ Dieselbe Antwort T40 hatte die Abgabe gebucht (`quest.status → completed`, `coin +40`). Die Korrektur ist also falsch und stammt aus der Engine (§8.4 P2-4).

**Fehlt in §§1–7:**
- die gescheiterte Registrierung in zwei von drei Läufen (§8.3 A);
- sieben vollständig verworfene Extraktionen und 24 leere Modellantworten (§8.3 C, D);
- die zwei Serpent-Kills ohne Credit (§8.3 B);
- nicht gebuchter Schlaf und die Kaufschleifen um Zimmer und Kettenhemd (§8.3 E, F);
- Hessas erzählte, nie gebuchte Zahlung (§8.3 G).

### 8.3 Zusätzliche Erkenntnisse aus den Originaldaten

**A – Registrierung scheitert trotz eindeutiger Zustimmung und exakter Gebühr (Warrior T5–T26, Rogue T5–T35).**
- **Warrior T5:** „I slide two silver across the counter. "Here's the two silver — let's do the roll and the stone."“ Erster Plan richtig: `pay` 20 cp mit Geldzitat „two silver“ plus `guild.register`. Die Prüfung meldet `money_ambiguous`, weil „two silver“ zweimal in der Nachricht steht. Die Reparatur setzt das Geld auf `null`. Ergebnis: „NOT REGISTERED — confirm registration at the Guild desk“ und „REGISTERS — pending … he has not agreed to pay“.
- **Rogue T5:** „"I'll register. Two silver, was it?" I count out two silver and slide them across the counter.“ Plan richtig, Geldbeleg geprüft, keine Reparatur. Trotzdem dasselbe Ergebnis.
- **Ursache [C]:** Der Gebührenweg verlangt `will` (`commands.js:1053`), und das setzt `payArgument` nur bei einem der Verben aus `GIVING` oder `HANDING` unmittelbar vor dem Geld (`finance_evidence.js:223`–`226`). „I count out two silver and slide them …“ fällt nicht darunter. `asksRegistration` (`commands.js:1060`) erkennt den `guild.register`-Befehl derselben Nachricht, ersetzt `will` aber nicht (`:1093`). Beim Warrior kommt die Mehrfachzitat-Lücke dazu (`finance_evidence.js:261`), die der [V4-Nachtrag §13 B-1](../../recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) für Preisbelege beschreibt.
- **Folgekette:** Der Erzähler erzählt die Aufnahme trotzdem („Paid. Stone's yours … There's your membership“). Die Vertragsannahme wird korrekt verweigert („not a Guild member“); der Erzähler erklärt das in beiden Läufen mit einer erfundenen Regel („copied across at end of day“). Die Spieler warten einen Spieltag. Beim Rogue läuft der Vertrag ab (T32). Erst die Formulierung „I'll pay the twenty copper fee“ gelingt (T26 bzw. T35); beim Mage genügt in T7 „I pay the two silver fee“.
- **Einordnung:** Integrationsfehler nach [01](../../01_ARBEITSWEISE_CHATGPT_CLAUDE.md) (mechanisch gültige Handlung wiederholt blockiert), kein Modellfehler des Planners. Mit 51 betroffenen Eingaben der teuerste Einzelbefund des Batches.

**B – Mage: zwei Kills am Vertragsort ohne Credit (T14, T26), erst der dritte zählt (T38).**
- Der Vertrag bindet an den Board-Ort `…spillway_stones_below_cindlemill_millrace`. Hessa nennt in T11 einen Beobachtungsplatz; der Extractor legt ihn als `willow stand on the near bank above the spillway stones` mit Elternort `realm.duskreach` an, also **neben** dem Habitat. Alle dort erzeugten Serpents sind „independent“; die Meldung mit der richtigen Population wird zweimal korrekt abgelehnt („is no population of willow stand … or its ancestors“).
- Die Korrektur an den Erzähler lautet nur: „the engine counts 0 of 1 … This fixed hunt requires its published engine count“. Sie nennt weder den Grund (falscher Ort) noch den Ort, an dem es zählt. Der Erzähler erfindet daraufhin „die Größere“. Erst als der Spieler in T37 zufällig „the shallows by the spillway“ wählt, landet er im Habitat.
- **Einordnung:** regelgerechte Ablehnung nach [02 §5](../../02_DESIGN_KANON.md) (Populationszugehörigkeit), aber derselbe Kern wie P2-A: Der Credit hängt an der Ortsbuchhaltung des Extractors, und die Engine sagt niemandem, woran es liegt.

**C – Extraktionen scheitern ganz an einem einzelnen Formfehler.** Sieben Antworten wurden vollständig verworfen („WORLD NOT RECORDED“): Mage T3 wegen einer überzähligen Eigenschaft `aware` an `person.new`; Rogue T38 und T63 wegen fehlendem `seq` an einer `time`-Meldung; Warrior T56 wegen der Form einer Ortsreferenz. Mit Mage T3 geht die Ankunft in Ashbridge verloren (T4–T6 spielen kanonisch am Straßenrand, `guild.register` scheitert an „not at a Guild hall“); mit Rogue T51 eine weitere Ankunft. Von 43 Extractor-Reparaturen betreffen 21 reine Formfehler (überzählige Eigenschaft, String statt Liste, `seq` als Text, `null`), 13 die Szenenchronologie.

**D – Leere Antworten kosten ein Sechstel der Modellzeit.** 24 Planner- und Extractor-Antworten enden mit `finish_reason=length` und leerem Inhalt, je 30 bis 100 Sekunden. Rogue T40 wartet 170 Sekunden auf eine Extraktion. Das ist eine Frage von Ausgabebudget und Reasoning-Einstellung dieser beiden Aufrufe, kein Engine-Fehler.

**E – Zusammengesetzte Eingaben: „arrival pending“ verhindert gebuchten Schlaf.** Warrior T15 und T44 („… take the loft bed and sleep until Tam wakes me“): `go` autorisiert, `sleep` verweigert (`commands.js:1741`). Der Erzähler erzählt die Nacht; die Engine bucht 120 Minuten und keine Erholung. Der Spieler notiert in T48: „Time reads 22:35 night despite the dawn hunt narration.“ Acht solche Ablehnungen im Batch. Die Reisetabelle bestätigt die Beobachtung aus dem [Architekturaudit §3.1](../../recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md): Bei bekanntem Ziel und geschlossenem Fenster kam Alaric in **27 von 29** Fällen an (Ausnahmen: ein Zweischrittweg, eine verworfene Extraktion).

**F – Kaufschleifen mit irreführender Korrektur.** Rogue T20–T23: vier Eingaben für ein Zimmer zu 6 cp. Warrior T20–T24: „I step into the smithy“ ergibt keinen `go`, die vom Extractor gemeldete Ankunft wird mit `no_go` abgelehnt, Schmied und Angebot fallen an `scene_context`; danach erzählt der Erzähler zweimal einen Kauf zu 4 Silber, den die Engine auf 64 cp umpreist. Die Korrektur lautet jeweils „no single valid canonical offer at the reached shop“; sie hilft weder Erzähler noch Spieler.

**G – Hessas Zahlung (Mage T32–T39).** Der Erzähler zeigt die Übergabe von einem Silber dreimal; gebucht wird nie. Auslöser ist der Einheitenfehler des Extractors (100 statt 10 cp); spätere Antworten melden die Zahlung nicht erneut. Ablehnung richtig, Zustand korrekt, Spielgefühl schlecht. Kein Engine-Fehler.

**H – Folgen des falschen Orts über P2-A hinaus (Rogue).** Die beiden Hunde bleiben bis zur Ankunft in T54 in der Gildenhalle „anwesend“; PULSE würfelt deshalb über ein Dutzend Züge lang nicht (`reason: held`). Die Schreiberin in der Halle wird durch den Kampf „wary“. Ein Thread lautet „Something alive hisses from deep inside the Guild hall's wall seam“: Der falsche Ort fließt in Erzählkontext und Extraktion zurück.

**I – Spieler-LLMs und Grenzen der Methode.**
- Alle drei Spieler prüfen HUD und Engine-Ergebnis und formulieren um. Sie finden so den Registrierungsweg selbst. Ein Mensch hätte in T6 vermutlich nicht nach dem passenden Verb gesucht.
- Der Rogue verfolgt die erfundene Beweisbürokratie 21 Eingaben lang. Das ist Modellverhalten, das einen Fehler verlängert; die Zahl überzeichnet deshalb dessen Dauer, nicht dessen Existenz.
- Zwei Notizen sind Spielerirrtümer, keine Befunde: „40 cp widerspricht 4 silver“ (Warrior T27) und „7s8cp gegen 78 cp“ (T60). Bei der Auswertung von Notizen ist das zu prüfen.
- Der Abbruch des Mage folgt der Runner-Regel für drei Planner-Fehlschläge in Folge.

### 8.4 Priorisierte Probleme

**P2-1 – Registrierung mit Zahlung in derselben Nachricht.**
- **Stellen:** Warrior T5–T26, Rogue T5–T35. Code: `commands.js:1045`–`1095` (`will`, `asksRegistration`), `finance_evidence.js:223`–`226`, `:261`.
- **Wirkung:** 21 und 30 Eingaben bis zur Mitgliedschaft; ein abgelaufener Vertrag; erfundene Gildenregel in der Erzählung.
- **Ursache:** nachgewiesen (Verbliste für den Zahlungswillen; Mehrfachzitat).
- **Vorhandenes:** `asksRegistration` wird bereits berechnet; S1 aus dem V4-Nachtrag deckt den Mehrfachzitat-Teil.
- **Kleinste Maßnahme:** Im Gebührenzweig gilt ein `guild.register`-Befehl derselben Nachricht zusammen mit dem Betrag der Gebühr (oder ohne Betrag) als Zahlungswille. Dazu S1 auch für `pay.money`.
- **Regressionen:** Warrior T5 und Rogue T5 im Original rot, danach genau eine Buchung. Gegenfälle: bloße Frage nach der Gebühr; falscher Betrag (bleibt „NOT PAID“ wie seit 8.4.2); `pay` ohne Registrierungsbefehl und ohne Zahlverb; Trinkgeld neben offener Registrierung (B15).

**P2-2 – Von PULSE angeordneter Halt ohne Ort.**
- **Stellen:** Rogue T32, T36–T54; Mage T44–T48. Code: `world.js:944`–`986` (Transit), `content/deltas.json` Regel „arrive is where Alaric physically is …“, `pulse.js` (Reiseetappe).
- **Wirkung:** Kreaturen und Personen entstehen am Abreiseort; Folgebefehle scheitern („invalid local habitat scope“, „already here“); Kill ohne Credit; im Mage-Lauf plant der Planner deshalb keinen Dungeoneintritt.
- **Ursache:** nachgewiesen aus Code und Historie. Bis `.100` setzte die Engine Alaric bei einer nicht beendeten Reise selbst auf die Straße („Transit“; der Kommentar dort beschreibt genau diesen Fehler vom 10./11.10.). `.101` hat das für V4-C abgeschaltet (`!explicitTravel`), weil nur noch `arrive` bewegen soll. Die Extractor-Regel erlaubt aber weiterhin ausdrücklich „report no arrive“, wenn die Antwort ihn auf der Straße lässt. Der Extractor hat in drei von vier Fällen genau das getan.
- **Vorhandenes:** der Transit-Block selbst; die Fensterdaten (`exposure: travel`, `open`, `kind`) im Ergebnis des Zugs.
- **Kleinste Maßnahme:** Öffnet PULSE auf einer Reiseetappe ein unterbrechendes Fenster und meldet die Antwort weder Ankunft noch Zwischenort, bucht die Engine den vorhandenen Transit, bevor die Meldungen der Antwort angewendet werden. Dazu die Regel im Extractor-Vertrag angleichen. Das ändert die `.101`-Aussage „nur `arrive` bewegt“ für genau diesen Fall und braucht deshalb eine **Entscheidung**, aber keinen neuen Fachplan.
- **Regressionen:** Rogue T36 und Mage T44 im Original (Hunde bzw. Anführer auf der Straße, nicht in der Halle; anschließender `go` zum Ziel gelingt); Rogue T32; Warrior T27 unverändert (gemeldeter Zwischenort gewinnt); geschlossene Fenster unverändert; kein Transit ohne autorisierten `go`; Replay.
- **Nicht nötig:** `arrived=false` umdeuten, `scene_context` lockern, O1-B1 voraussetzen.

**P2-3 – Planner-Antwort als nacktes Array.**
- **Stellen:** Mage T24, T46, T47, T48 (T45 knapp gerettet). Code: `planner.js:453`–`456`, `json.js`, `runtime.js:241` ff.
- **Wirkung:** vier verlorene Züge, Laufabbruch.
- **Ursache:** nachgewiesen. `[]` scheitert an „report is not a JSON object“; die Reparaturanfrage nennt die verlangte Form nicht; die Leerantwort-Recovery greift nur bei wirklich leerem Text.
- **Kleinste Maßnahme:** Ein JSON-Array auf oberster Ebene wird als Befehlsliste gelesen und durchläuft dieselbe Schemaprüfung. Die Reparaturmeldung nennt `{"commands":[...]}`.
- **Bewertung:** rein syntaktisch. Aus `[]` entsteht „NOTHING TO BOOK“, also ein normaler Gesprächszug; kein `go`, keine Zustimmung, keine Umdeutung.
- **Regressionen:** die vier Originalantworten; Prosa ohne JSON scheitert weiter; ein Array mit ungültigem Befehl meldet dessen Fehler.

**P2-4 – Falsche Korrektur nach bedingter Abgabe.**
- **Stellen:** Mage T40 → T42. Code: `world.js:335`–`340` (Firewall über alle Meldungen vor der Anwendung, `statusCorrection` aus `guild.js:337`), bedingte Abgabe später in derselben Antwort.
- **Wirkung:** Die Engine zahlt 40 cp aus und teilt dem Erzähler danach mit, der Vertrag sei aktiv und unbezahlt. Der Erzähler lässt die Schreiberin das Geld zurücknehmen; der Spieler ist verunsichert, der Zustand bleibt richtig.
- **Ursache:** nachgewiesen am Prompt; der Mechanismus (Korrektur aus dem Zustand vor der Abwicklung) folgt aus dem Code und entspricht K6a aus `.177`.
- **Kleinste Maßnahme:** Statuskorrekturen zu einem Vertrag verwerfen oder neu bilden, wenn sich dessen Status in derselben Antwort noch ändert.
- **Regression:** Mage T40 im Original: keine Korrektur „ACTIVE … nothing paid“ nach `completed`. Gegenfall: Abgabe findet nicht statt, Korrektur bleibt.

**P2-5 – Extraktion ganz oder gar nicht.**
- **Stellen:** die sieben Fälle aus §8.3 C. Code: `extract.js:388` (`parseExtraction`), `runtime.js:858` (`runExtraction`).
- **Wirkung:** verlorene Ankünfte und Weltfolgen; ein Drittel aller Extraktionen braucht eine Reparatur.
- **Kleinste Maßnahme:** vor der Schemaprüfung lokal normalisieren, was keine Bedeutung trägt (überzählige Eigenschaft entfernen, fehlendes oder textförmiges `seq` nach Reihenfolge setzen, einzelner String als einelementige Liste, `null` in optionalem Feld weglassen). Bleibt eine Meldung ungültig, nur diese ablehnen; ihre abhängigen Meldungen fängt die vorhandene Sperre für abgelehnte Personen und Kreaturen.
- **Regressionen:** die sieben Originalantworten; Typfehler mit Bedeutung (falscher Meldungstyp, fehlender Pflichtinhalt) bleiben abgelehnt.

**P3-6 – Jagdcredit und Ortsbaum (Mage T14/T26).** Keine Regeländerung. Kleinste Maßnahme: Die Korrektur nennt, dass der Kill außerhalb des Jagdgrunds lag, und nennt den Jagdgrund. Offen ist, ob der Extractor-Vertrag für einen Platz „am“ Jagdort den Habitat-Ort als Elternort verlangen soll (§8.6).

**P3-7 – Gildenbearbeiter 0 von 7.** Pilot 01 hatte 0 von 3. Fünf der sieben Ablehnungen betreffen einen gebuchten Schalterschritt. Der im [Architekturaudit V5](../../recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) genannte Auslöser (schwache Erkennung auch nach K4) ist damit eingetreten. Kleinste Maßnahme: Ist beim gebuchten Schalterschritt genau eine Gildenperson anwesend, ist sie die Bearbeiterin; sonst die vom Extractor genannte anwesende Gildenperson, ohne Verbprüfung. Das ändert R2 aus E2-A und braucht eine Entscheidung.

**P3-8 – E3 V-1** wie in §5: Grenze und Berechtigung im Vertrag nennen. Ich schließe mich an. Zu erwarten sind wenige Anker: Der Extractor bietet sie selten an.

**P3-9 – „arrival pending“.** Kein neuer Auftrag; die Messung stützt V1 des Architekturaudits.

**P3-10 – Leere Antworten.** Ausgabebudget und Reasoning für Planner und Extractor prüfen; reine Konfiguration.

**P3-11 – Texte.** „he has not agreed to pay“ nach einer Zahlung, „no single valid canonical offer at the reached shop“, „0 of 1“ ohne Grund: je eine Zeile, beim Anfassen der jeweiligen Stelle korrigieren.

### 8.5 Empfehlungen

**Ist weitere Planung nötig?** Nein. Für P2-1 bis P2-5 reichen Code, Originalfälle und die vorhandenen Dokumente. Zwei Punkte brauchen vorab eine kurze Nutzerentscheidung: der Transit bei von PULSE angeordnetem Halt (P2-2) und die Bearbeiterregel (P3-7). O1/O2 ist für keinen dieser Punkte Voraussetzung.

**Reihenfolge:**
1. **P2-1 und P2-3** zuerst: klein, voneinander unabhängig, zusammen rund 55 der 188 Eingaben dieses Batches.
2. **P2-2** nach der Entscheidung; größter Hebel für Weltkonsistenz, betrifft `world.js` und den Extractor-Vertrag.
3. **P2-4 und P2-5**; P2-5 senkt zugleich die Reparaturquote.
4. **V-1 (E3)** und, nach Entscheidung, **P3-7**.
5. **P3-10** als Konfigurationsprüfung parallel.

**Nicht empfohlen:** eine globale Lockerung von `scene_context` oder `met`; ein neues Zwischenort- oder Wegpunktsystem; eine Änderung der PULSE-Wahrscheinlichkeiten; ein weiterer natürlicher Batch vor P2-1 bis P2-3, weil er dieselben Blockaden erneut messen würde.

**Nächster natürlicher Test:** dieselben drei Profile nach den P2-Korrekturen. Zu messen ist, was dieser Batch sichtbar gemacht hat:
- Eingabe, in der die Registrierung gebucht wird, gezählt ab dem ersten Versuch;
- Züge, in denen der Ort im HUD und in der Spielernotiz auseinanderfallen;
- verworfene Extraktionen und „NOT EXECUTED“;
- Reparaturanteil und leere Antworten;
- Kills an einem Vertragsziel ohne Credit.

Die ersten drei Größen stehen schon in den Records. Der Runner meldet sie bisher nicht als Auffälligkeit; „Regelverletzungen: keine gefunden“ war deshalb in allen drei Läufen richtig und zugleich wenig aussagekräftig.

### 8.6 Offene Fragen

- **Warum ein Zwischenort in Warrior T27, aber nicht in Rogue T32/T36 und Mage T44?** Gleiche Regel, gleiches Modell. Aus vier Fällen nicht entscheidbar; für P2-2 auch nicht nötig, weil die Engine den Halt selbst kennt.
- **Wohin gehört ein Platz „am“ Jagdort?** Ob der Extractor ihn unter das Habitat hängen soll oder die Engine den Jagdgrund weiter fassen soll, ist eine Designfrage zu [02 §5](../../02_DESIGN_KANON.md); die Daten zeigen nur einen Lauf.
- **Mage T43 `handled_by`:** weder abgelehnt noch als Wissen gebucht. Ich finde im Record keine Ablehnung und kein `knowledge.gained`; ob die Person den Fakt schon kannte, lässt sich ohne Fold nicht sagen. Die Frage aus §5 bleibt offen.
- **Wie viel der 24 leeren Antworten ist Provider-, wie viel Einstellungsfolge?** Dafür fehlen mir die Serverlogs.
- **Wie verhielte sich ein Mensch?** Die Schleifenlängen (21 und 30 Eingaben) stammen von geduldigen LLM-Spielern. Ein Mensch bräche früher ab oder fände den Weg nie; beides lässt sich hier nicht messen.
- **Eventgruppenvergleich und Fold:** von mir nicht wiederholt; die Aussagen in §2 dazu übernehme ich ungeprüft.

**Keine Produktänderung durch diesen Abschnitt.**


---

## §9 – GPT-Kurzgegencheck zu Fable §8: Bearbeiterwissen, Planner-Array und Freigabegrenzen

**13.11.2026 · ergänzender, eng begrenzter Abgleich mit den originalen `chat.jsonl`-Events aus dem Nutzerupload und dem Produktcode `.179`.** GPT §§1–7 und Fable §8 bleiben unverändert; keine neuen Live-/Node-/Replayläufe, kein Produktpatch. Diese Notiz korrigiert **zwei** für eine Implementierungsentscheidung wesentliche Schlussfolgerungen aus §8, ohne Fables bestätigte P2-Analyse zu relativieren.

### 9.1 `handled_by`: Die Null-Metrik ist nicht gleich null personenbezogenem Wissen

Die automatische `npc-pulse`-Auswertung zählt nur `knowledge.gained`-Events **des nachfolgenden Erzähler-/Extractor-Records**. Bereits **im autoritativen Spielerzug** gebuchte Wissensereignisse für den angenommenen Gildenauftrag werden dabei übersehen.

**Unabhängig im Original-`chat.jsonl` bestätigt:**

| Lauf/Zug | Bereits im Spielerzug verbuchtes Wissen | Späterer `handled_by`-Befund |
|---|---|---|
| Warrior **T26** | `knowledge.gained` für `npc.npcguild_clerk` über `f.pc.accepted.quest.fang_in_the_hen_runs` | Extractor-Beleg abgelehnt; der Clerk **wusste den Vertrag bereits** |
| Rogue **T35** | `knowledge.gained` für `npc.npcguild_clerk` über `f.pc.accepted.quest.cull_the_feral_tomcat_of_millbrook` | Extractor-Beleg abgelehnt; der Clerk **wusste den Vertrag bereits** |
| Mage **T9** | `knowledge.gained` für `npc.npcguild_clerk_ashbridge` über `f.pc.accepted.quest.a_snake_by_the_millrace` | Extractor-Beleg abgelehnt; **keine fehlende Wissensbuchung** |
| Mage **T43** | `knowledge.gained` für `npc.npcguild_clerk_ashbridge` über `f.pc.accepted.quest.clear_mossback_warrens_level_1_2` | Kein `desk_handler`-Reject und kein **zweites** Ereignis im Erzählerrecord, **weil Wissen bereits vorhanden** |

Das ist eine konkrete Auflösung der offenen Frage aus Fable §8.6 zu **Mage T43**: **Im früheren Spielerrecord existiert das angeblich fehlende Event.** Den Zähler `desk_handler=0` darf man deshalb **nur** als „keine zusätzliche, durch die nachgelagerte `handled_by`-Meldung erfasste Wissensbuchung“ lesen, nicht als „die Gildenpersonen wissen nichts“. Genau dies erklärt, warum das Vorliegen mehrerer `desk_handler`-Refusals nicht zwingend ein verfehltes E2-Ziel belegt. Der Evaluator verdient eine **kleine eigene Korrektur** oder eine präzisere Benennung.

Die beiden wirklich interessanten Restfälle sind die **bedingt nach Ankunft gebuchten Abgaben Warrior T57 und Mage T40**: Deren Spielerzüge können den Bearbeiter am Zielort noch nicht sicher kennen. Hier ist die nachträgliche, **eindeutig erzählte** Bearbeitung wertvoll. Ob eine Korrektur des Beleg-Extraktors oder des `deskHandlingEvidence`-Prüfers nötig ist, muss an genau diesen Originaltexten geprüft werden.

**Designurteil zu Fables P3-7:** **NO-GO in der vorgeschlagenen Pauschalform** „einzige anwesende Gildenperson gilt ohne Verbprüfung automatisch als Bearbeiterin“. Diese Person könnte bloß anwesend sein. Besser den bestehenden autoritativen Erstbuchungsweg korrekt messen und beim echten Reise-/Abgabefall kurz und eindeutig belegte Desk-Handlungen anerkennen; bei mehreren möglichen Personen weiter vorsichtig sein. **Keine allgemeine Aufhebung des E2-A-R2-Belegschutzes.**

### 9.2 `[]`: syntaktische Korrektur ja, fehlende Handlungsinterpretation nicht verdecken

Der rohe Mage-Originalchat bestätigt die wiederholten nackten Plannerantworten `[]` und den anschließenden Abbruch; der Code `src/v4/planner.js` erwartet `{"commands":[...]}`. **Ein streng begrenzter Format-Fix für eine tatsächlich leere Befehlsliste ist technisch plausibel.**

Aber Fables §8.2/§8.4 ist in der Aussage „alle `[]`-Antworten sind inhaltlich richtig“ **zu weitgehend**:

- **Mage T24:** konditionales Kampfgespräch mit Hessa, keine ausgeführte Aktion – `[]` inhaltlich plausibel.
- **Mage T45–T47:** Fragen, Angebot, verabredete zukünftige Bewegung – `{"commands":[]}` kann plausibel sein.
- **Mage T48:** Der Spieler sagt ausdrücklich **„Done — I go in first now, and draw the big one.“** Das ist **nicht eindeutig nur ein Gespräch**, sondern enthält einen aktuellen Eintritts-/Bewegungswunsch. Die Planner-Begründung nennt ihn trotzdem nur ein Abkommen und liefert wieder `[]`.

Ein Parser, der `[]` zu `{"commands":[]}` normalisiert, kann den **Format- und Runner-Abbruch** beheben, nicht zwangsläufig die **richtige Ausführung von T48**. Ein breiter Fallback für **beliebige** Arrays mit Befehlsobjekten ist hierfür nicht bewiesen nötig. Die Reparaturanweisung muss die korrekte Objektform und die Prüfung der tatsächlichen Spielerabsicht nennen. Regressionen separat: (a) reine Sprachhandlung, (b) jetzt ausgeführtes GO, (c) ungültige Arrayeinträge, (d) wirklich leere Providerantwort. **Kein stiller GO aus unautorisiertem Prosa- oder Arrayinhalt.**

### 9.3 Zwei Nutzerentscheidungen – fachliche Empfehlung

**P2-2 – von PULSE verbindlich angeordneter Zwischenhalt:** **ENGES GO / Zustimmung empfohlen.** In `src/v4/pulse.js` fordert der offene Reise-PULSE-Text ausdrücklich einen **realen Halt vor dem Ziel**; in `src/v4/world.js` bleibt der frühere Transitpfad für Ruleset 2 durch `!explicitTravel` deaktiviert. Ein Engine-gebuchter, eindeutig an **autorisierte Reise + tatsächlich geöffnetes Reise-PULSE-Fenster + fehlende gültige explizite Zwischenankunft** gebundener Straßen-/Regionshalt ist konsistent mit der vorhandenen Engineautorität. Das ist **keine** Wiederfreigabe impliziter Bewegung für beliebige fehlgeschlagene `go`- oder `arrived=false`-Züge. Bedingungen: vor lokalen `person.new`/`creature.new`-Deltas buchen, Ziel und Fortsetzungsabsicht erhalten, Mitreisende/Anwesenheit korrekt behandeln, explizite echte Zwischenorte vorziehen, Dungeon-/Quest-/Save-/Replay-Gegenfälle prüfen. **Nicht** automatisch das endgültige GO-Ziel erreichen.

**P3-7 – einzelner Gildenbearbeiter ohne Handlungsbeleg:** **NEIN zur pauschalen Lockerung.** §9.1 zeigt, dass das häufig bereits gebuchte Wissen von der Auswertung schlicht nicht erfasst wird. Zuerst das Messinstrument bzw. seine Beschreibung korrigieren und nur bedingte nachträgliche Abgaben mit klarer Erzählung nachbessern. NPC-Wissen nicht aus bloßer Einsamkeit im Gildenraum erfinden.

**Zusätzliche technische Grenzen für die ersten Patches:**
- **P2-1 Registrierung:** Positive Eigenhandlung und Zustimmung zur **bekannten verbindlichen Gildengebühr** dürfen auf das bestehende Angebot gemappt werden. Ein bloßes `guild.register` ohne klare Zahlungszustimmung darf keine frei erfundene oder unbemerkte Geldbuchung autorisieren; B15-Tipps/Fremdzwecke und falsche Geldbeträge als Gegenfälle erhalten.
- **P2-4 Statuskorrektur:** Bei tatsächlich in derselben Antwort gebuchter Abgabe die überholte Korrektur auf den **finalen Eventzustand** abstimmen; keine berechtigte Korrektur aus anderen Fällen pauschal unterdrücken.
- **P2-5 Formheilung:** Nur wirklich bedeutungsneutrale Normalisierungen; fehlende `seq`, Ortsreihenfolge und Abhängigkeiten nicht blind autoerraten. Die 28-%-Refusalquote enthält **auch legitime Integritätssperren**, kein allgemeines Reduktionsziel.
- **E3 V-1:** Nach zwei neuen `anchor_value`-Refusals und insgesamt 0 E3-Ankern sinnvoll; enge Extractor-Präzisierung statt Firewall-Lockerung.

**Priorisierung nach Gegencheck:** (1) P2-1 Registrierung und begrenzte P2-3-Format-/Recoverykorrektur, (2) P2-2 autorisierter PULSE-Reisehalt, (3) P2-4 Statuskorrektur und klein gefasste P2-5-Formfälle, (4) E3-V-1. **Bearbeiterlogik P3-7 erst nach korrigierter Messung und den zwei echten Bedingt-Abgabe-Fällen.** Kein weiterer Gesamt-Audit, keine neue Dokumentationsdatei und kein neuer Produktbuild durch diesen Gegencheck.
