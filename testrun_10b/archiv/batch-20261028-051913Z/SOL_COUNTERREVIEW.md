# Sol – unabhängige Batch-5-Gegenprüfung und Abgleich .106 → .109

28.10.2026. Original-ZIP und GPT-Review geprüft; keine Produktänderung und keine neue Node-/ST-Abnahme. Produkt-HEAD bei Prüfung: `.109` / `96fa3ed`. Alle drei archivierten Kampagnen stammen dagegen aus `.106` / `75a4366`, sauberer Checkout laut Run-Metadaten.

## Nachweis und Gesamturteil

ZIP: 81.841.337 Bytes, 48 Einträge, SHA-256 `35a8cdc7b0e7ad3f3511e9397b2d527b7750a6992b84a9d6002ce14fd5d752aa`; vollständiger CRC-Test erfolgreich. Originaldatei im Chat, kein Binärupload auf Git behauptet.

Warrior: 250 Inputs, 219 Engine-Turns, Level 7, 132 cp. Mage: 250 Inputs, 216 Engine-Turns, Level 10, 1.044 cp. Beide enden am konfigurierten 250-Input-Limit, nicht an Tod oder technischem Fehler. Rogue: null Inputs, manueller Ctrl+C laut Originalquelle, keine belastbare Rogue-Spielbeobachtung. 6.466 Events in den beiden gespielten Kampagnen. Beide vollständigen Event-Folds fehlerfrei; `validateState()` mit aktuellem Produktcontent jeweils ohne Befund. Das beweist strukturelle Konsistenz, keine perfekte Erzählung.

Der Batch zeigt deutlich brauchbarere Langläufe. Er rechtfertigt weder einen pauschalen XP-Buff noch die Aussage, jede Eingabe sei vollständig umgesetzt worden. Zwischen Klassen und Builds ist dies kein kontrolliertes A/B-Experiment.

## Korrekturen zur GPT-Review

1. **„Keine neuen Passives“ beim Mage ist falsch.** T27 bucht `passive.defined`, `passive.gained` und `decision.closed accepted` für **Boar-Tempered Grit**, ID `dyn.passive_unbroken_stance`, Rare. Zustand und spätere Encounter-Snapshots bestätigen den Besitz: bei höchstens 50 % HP DEF +4 und 10 % physische Resistenz. Ursprung ist der tatsächlich überlebte Kampf gegen einen fünf Level höheren Boar bis hinunter auf 15 % HP. Das ist ein echter organischer Entwicklungserfolg, kein bloßes Angebot. Neue aktive Skills wurden bei beiden Figuren nicht gebucht.
2. **Der neue terminale Fail-soft-Pfad wurde hier nicht benutzt.** Kein Record trägt `continuation`; weder `plan.failed` noch `extraction.status:failed/late` liegt vor. Die vier leeren Extractorantworten wurden zu `applied` repariert. Die Langlaufstabilität ist positiv, isoliert aber nicht die Wirkung der neuen sicheren Fortsetzung. Ein erheblicher Teil dieser Retry-Mechanik existierte schon vor .105.
3. **T139 ist eine konkrete Ortsrückfrage:** „Guild hall in Caelreth“ nennt ein Reich mit mehreren Hallen. Repair fragt Glassmere oder Asterhall. Keine Events ist hier korrekt und kein verlorener bestätigter Turn-in. Die ungebuchte Eingabe nicht mit einem technischen Ausfall gleichsetzen.
4. **Mage T206 ist nicht primär ein Stückpreisproblem.** Die erste Antwort verwendet den existierenden Bid, aber `party_words:"Merchant B"` und `agreed_cp:200`, obwohl zwei Silber 20 cp sind. Aktuelles `parsePlan()` lehnt bereits die Gegenpartei ab: das Angebot bezeichnet seinen Verkäufer als „merchant, broad man …“, nicht „Merchant B“. Repair endet leer/length; die Engine stellt ihre generische sichere Handelsrückfrage. T207 bleibt ebenfalls ungebucht. **T208 verkauft dieselben zwölf Teile korrekt für 20 cp**, danach ist ein weiterer Verkauf getrennt gebucht. Kein dauerhafter Inventarverlust oder falscher Geldabzug nachgewiesen. Das Spielerhandle-/Gegenparteimatching ist weiterhin ein echter Bedienungs-Prüfpunkt.

T74 (eingebettetes statt führendes `#assign`) und T213 (freie Statzuweisungsprosa) sind bestätigt, aber keine defekte Zahlenvergabe: die derzeitige Befehlsschnittstelle akzeptiert diese Formen nicht. T74 erzählt trotzdem eine Verbesserung, ohne `stat.assigned` – Erzählfehler. Ein nacktes führendes `#assign` ist damit nicht widerlegt.

## Was .107–.109 wirklich ändern würden

Als gezielte Codegegenprobe wurden **431 gespeicherte, angewendete Extractorberichte** (Warrior 217, Mage 214) einzeln durch aktuelles `applyWorld()` geführt. Vor jedem Bericht wurde der **originale .106-Vorstand** aus seinen Events wiederhergestellt. Verglichen wurden Ablehnungen nach seq/Regel. Das ist ausdrücklich keine vollständige alternative .109-Kampagne: Unterschiede werden nicht in folgende Vorstände fortgeschrieben; geänderte Prompts können zudem andere Modellantworten erzeugen.

**Kein einziger gespeicherter Ankunftsbericht enthält ein nichtleeres `forced_by`.** Die neuen erzwungenen Bewegungsregeln .107–.109 hätten in diesem Batch folglich keinen solchen Ankunftsfall abgefangen. Die acht `no_go`-Ablehnungen existierten bereits auf .106. Sie sind kein natürlicher Nachweis für die neuen Belegregeln.

Der aktuelle World-Pfad ändert die Ablehnungen dagegen bei **fünf Replies**: Warrior T51, Mage T79/T132/T144/T247. Ursache ist ausschließlich die neue NPC-Anwesenheitsprüfung samt abhängigen Angaben.

| Fall | Originalbeleg / Wirkung des aktuellen Codes | Urteil |
|---|---|---|
| Warrior T51 | „Marta was behind the bar … kneading dough … with a rhythm that **never paused**.“ Das ganze Satzfragment fällt auf die Negationsprüfung; `enter` und abhängige Fakten/Angebot werden abgelehnt. | **Klare falsch negative Anwesenheitsprüfung.** „never paused“ verneint nicht Martas Anwesenheit. |
| Mage T79 | Osser kommt hörbar heim, klopft und spricht; Namensbezug „**Osser’s voice**“. Aktueller Filter findet keinen passenden Anwesenheitssatz. | Glaubwürdiger lokaler Rückkehrbeleg; Besitzform/Referenzauflösung fehlt. Innenraum gegenüber Türschwelle gesondert bewerten, kein pauschales Hereinteleportieren empfehlen. |
| Mage T132 | „the **laborer**, watching from a safe height“, LONG. Bekannte Figur heißt Osser, etablierte kurze Rolle ist farmer; der beschreibende laborer-Deskriptor ist zu lang für den Filter. | Plausible Wiedererkennung, aber Rolle/Label nicht hinreichend gebunden. Keine globale Verschmelzung aller Arbeiter; Aliasbeleg gezielt prüfen. |
| Mage T144 | Tam ruft OSSER; die folgende Figur kommt mit Billhook herunter, füllt die Tür und reicht später Eintopf. Eigentliche Bewegung steht ohne Namenswiederholung im nächsten Satz. | **Stark belegte Rückkehr wird abgelehnt.** Aktueller Code verwirft dadurch auch neues Essen/Übergabe/Erinnerung. Geld-/Inventar-Firewall funktioniert, der vorgelagerte Präsenzfilter ist zu eng. |
| Mage T247 | „the man with the billhook“, später „the billhook man“ beobachtet und spricht. | Glaubwürdige Szene, aber Identität nur beschreibend; schwächer als T144, kein beweisbarer neuer Doppel-NPC. |

**Neue P1-Empfehlung:** Den bestehenden NPC-Belegpfad an seinen Scope-/Labelgrenzen korrigieren und diese Originalfälle als Integrationskontrollen verwenden. Negation muss die Anwesenheitsbehauptung betreffen; ein sicherer Named-Beleg oder etablierter Alias darf nicht wegen Nebensatz/Genitiv verloren gehen. Keine beliebige Pronomenauflösung und kein Aufheben der Anwesenheitsprüfung für Geber, Händler oder Gegner. Dies ist ein begrenzter Regressionstyp aus .107, keine neue World-Architektur. Noch nichts umgesetzt.

## Weitere offene beziehungsweise bereits korrekt abgefangene Fälle

- **Dungeonfeinde:** Alle fünf `dungeon_foe`-Ablehnungen bleiben in der gezielten .109-Gegenprobe bestehen. .107–.109 reparieren diese Situation nicht. Es wurden keine entsprechenden Phantom-Kills/XP gebucht. Die Fälle dürfen dennoch nicht alle als frei erfundene neue Population erklärt werden: T78 verwendet bereits den Engine-ref `glimmerdeep_grotto_c1_l1_e2`; T91 führt parallel eine kanonische Queen-Slotbelegung und die Ablehnung eines weiteren Beetle-Deltas. Vor einem Fix sind Eingangs-/Etagenbezug, automatische Slotmaterialisierung, Umklassifikation und tatsächliche Doppelbeschreibung zu trennen. Kein pauschales Zulassen zusätzlicher Dungeongegner.
- **Board T4:** Fehler und beide Generatorversuche sind ein realer Validierungs-/Erzeugungsfall der F-Verteilung. Engine veröffentlicht kein ungeprüftes Ersatzboard; spätere funktionierende Boards ermöglichen weitere Aufträge. Keine relevante Änderung dieses Pfads in .107–.109. Präzise Generator-/Repairdiagnose bleibt sinnvoll, ein genereller Boardumbau ist daraus nicht abzuleiten.
- **Reichweite T119/T173/T174:** Die ungültigen Heavy-Slash-Angriffe werden abgelehnt; T173 enthält eine echte Positionsänderung. T174 plant ausschließlich den Skill, nicht zusätzlich ein `move`. Die neue Main/Minor-Ökonomie ist nicht implementiert und daher weder getestet noch eine belegte Lösung dieser Eingaben. Die Extractor-Recovery kann World-Information verlieren; bereits gebuchte Spieleraktionen bleiben davon getrennt.
- **Verkauf T206:** Nach dem aktuellen Code weiterhin Clarify-Kandidat. .107 ändert andere Preisformulierungen; .108/.109 behandeln Bewegungsbelege. Keiner dieser Patches löst das dortige Party-Handle-Problem oder garantiert eine nichtleere Reparatur.
- **Stat-/Skill-/Gear-UX:** Keiner der späteren Patches führt freie Statzuweisung, einen Skill-Lehrer oder einen automatischen Gearkauf ein. Diese Beobachtungen bleiben offen, sind aber nicht automatisch Enginefehler.

## Spielerisches Urteil und Prioritäten

Der Mage absolviert echte Gruppenkämpfe, elf Guildaufträge und gewinnt das Rare-Passive; der Warrior endet ohne Tod nach 16 Einzelkämpfen, mit Heavy Slash P4. Das ist mehr funktionierendes RPG als die früheren frühen Abbruchläufe. Level 7 beziehungsweise 10 nach je 250 Inputs ist bei deutlich verschiedenen Aktivitäten noch kein Argument für eine weitere XP-Verdopplung.

Gear-/aktive Skillprogression ist weiterhin unterrepräsentiert. Warrior wechselt T40 auf eine Hand-Axt und T66 zurück, Mage rüstet nie um. In den Spielerinputs findet sich **kein ausdrücklicher Gear-Upgrade- oder Manual-/Trainingsversuch**; tatsächliche Käufe betreffen überwiegend Essen, Unterkunft und Behandlung. Manuals sind im kanonischen Zustand vorhanden. Daher ist „es wurde kein besseres Gear benutzt“ bestätigt; „Gear-/Lernsystem funktioniert nicht“ bleibt unbewiesen. Wiederholte Boar-/Adder-Aufträge begrenzen die Vielfalt. Kein voreiliger Klassen- oder Balancevergleich.

Empfohlene Reihenfolge:
1. Vor dem nächsten gezielten Produktfix die neuen NPC-Präsenz-Fehlablehnungen mit Originalantworten absichern; kein erneuter Ausbau der `forced_by`-Wortlisten aus diesem Batch.
2. Danach Handels-Gegenparteihandles und Dungeon-Slot-/Erzähldiskrepanzen jeweils als eigene Ursachen prüfen. Sicherheitsablehnung und funktionierende anschließende Korrektur getrennt zählen.
3. Gear-/aktive Skillabdeckung und Questvariation als Test-/Gameplayfragen behandeln; keine weiteren Zahlenänderungen aus diesen zwei Runs ableiten. Der dritte manuelle Run braucht keine automatische Wiederholung.

Keine Änderungen an Engine, Runner, Original-ZIP oder GPT-Review; keine neuen Tests und kein natürlicher Lauf gestartet. Nur Originaldatenfaltung und zustandsisolierte Funktionssonden. Die neue Belegprüfung ist konservativ, aber nicht durchweg schadlos: .109 ist für diese .106-Daten **kein pauschales „bereits behoben“**.
