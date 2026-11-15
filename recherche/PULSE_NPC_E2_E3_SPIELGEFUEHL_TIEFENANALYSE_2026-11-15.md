# PULSE × NPC E2/E3: Spielgefühl vor dem nächsten User-Test

**Analyse vom 15.11.2026. Keine Implementierung oder Produktabnahme.**

## 1. Gesamturteil und untersuchter Stand

Avereth besitzt bereits die wesentlichen Bausteine für eine selbstständig handelnde, persönliche Welt: deterministische Ereignisfenster, freie soziale Angebote und Konflikte, dauerhafte Personenidentitäten, gemeinsame Erinnerungen, persönliche Absprachen und wiederverwendbare Persönlichkeitsanker. Der Engpass ist ihre zuverlässige Verbindung. Mehr Würfe, zusätzliche Begegnungsklassen oder eine NPC-Simulation würden diesen Engpass nicht beheben.

Die wichtigsten Ergebnisse:

1. **PULSE erzeugt bereits brauchbare soziale Szenen.** Ein Fischer gibt Hinweise, eine Gerberin bringt eine Nachricht, eine Begleiterin verhandelt Bedingungen, drei Männer verlangen einen „Zoll“. Forderung und Kampf sind getrennt. Ein Hintergrundereignis kann ein Gespräch beleben, ohne es zu übernehmen.
2. **Zwei aktuelle technische Fehler verdienen Vorrang:** Der enge `met`-Anwesenheitsprüfer verwirft ein klar erzähltes Wiedersehen; der PULSE-Schutz vor sofortiger Wegnahme erfasst neu erzeugte Personen, aber nicht bekannte Personen, die gerade erst wieder eintreten. Beide wurden auf `.198` offline reproduziert. Für den zweiten Fehler liegt kein natürlicher Schadensfall vor.
3. **Die bisherige PULSE-Auswertung unterschätzt soziale und erinnerbare Ereignisse.** `pulse.outcome.narrated = none` kann trotz eines gebuchten Hinweises, einer Erinnerung oder einer korrekt eingetretenen bekannten Person erscheinen. Daraus darf keine Freigabe für höhere Ereignisraten abgeleitet werden.
4. **E2/E3 sind vorhanden, erreichen spontane Wiederauftritte aber nur indirekt.** Es gibt gute Karten für aktuelle Gesprächspartner und für bekannte Personen an einem autorisierten Reiseziel. PULSE selbst wählt außerhalb des Dungeons keine passende bekannte Person samt persönlichem Anlass aus. Zudem können gültige E3-Merkmale an der Kartenkürzung verloren gehen.
5. **Sieben Ereignisarten reichen zunächst.** Mehr Vielfalt entsteht eher aus Anlass, Beteiligten, bestehender Geschichte und unterschiedlichem Ausgang als aus weiteren Würfeltabellen. Ein beobachtetes wiederkehrendes Motiv sind schwebende Lichter; das ist kein Beleg für zu wenige Würfe.

**Empfehlung vor dem persönlichen Test:** ein kleines Korrekturpaket für Ankunftsschutz, den belegten `met`-Fehlfall und ehrliche PULSE-Diagnostik. Verlustarme E3-Auslieferung ist eine sinnvolle, eng begrenzte Ergänzung, aber kein Anlass für ein neues NPC-System. Breitere Auswahl bekannter Personen und besonderen Gesprächsschutz erst als getrennte Weiterentwicklung entscheiden; keine Frequenzänderung vor neuen natürlichen Beobachtungen.

### Verifizierte Grundlage

| Gegenstand | Tatsächlicher Stand bei Beginn |
|---|---|
| Remote `main` | `00a685bcd3c0e3741e168b8837e2d99f39981a42` |
| Remote Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` | `b1fd7860982fe16b53c1ded5d70fde3346220eb1` |
| Produktbuild | `4.3.0-c.6.6.198`, nach Merge von PR #17 |
| Dokumentationscheckout | `/workspace/Claude-AI-RPG-Game`, `main`, zu Beginn sauber |
| Produktcheckout | `/workspace/avereth-product`, Produktbranch, zu Beginn sauber |

Die Produktquellen dieses Berichts beziehen sich ausschließlich auf [diesen eingefrorenen Commit](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/b1fd7860982fe16b53c1ded5d70fde3346220eb1/avereth-engine). Pfade `src/...`, `content/...` und `tests/...` sind relativ zu dessen `avereth-engine/`.

Gezielt gelesen wurden auf `main` [Designkanon](../02_DESIGN_KANON.md), [Projektstand](../03_AKTUELLER_PROJEKTSTAND.md), [Roadmap](../07_ROADMAP_NACH_10B_ENTWURF.md), [PULSE-Plan](../patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) und [NPC-E2/E3-Fachplan](../patch_plans_10b/NPC_E2_E3_FACHPLAN.md). Die zentrale Statusdokumentation steht teilweise noch bei `.195`; für Aussagen über die tatsächliche Implementierung ist `.198` maßgeblich. Diese Dokumente werden hier nicht aktualisiert.

### Nachweisgrenzen

- Die vollständigen ursprünglichen Batch-ZIPs und ihre Narrator-Requests sind in diesem Workspace nicht verfügbar. Die Reviews selbst weisen darauf hin, dass diese Originalarchive nicht im Git liegen.
- Für `.191` sind die ursprünglichen Chats einschließlich gebuchter Events sowie die aufgezeichneten Planner-/Extractor-Antworten in `tests/replay/corpus191/w191.json.gz` und `r191.json.gz` vorhanden. Sie erlauben Originalprüfung und gezielte Offline-Reproduktion, aber keinen bytegenauen Nachweis des damals an den Narrator gesendeten Gesamtprompts. Original-Narratorantworten stehen im Chat.
- Für `.188` liegt der Rogue-Originalausschnitt Chat `#0–#83` in `tests/v4/fixtures/batch188_rogue_tannery.json.gz` vor. Die späteren E3-Änderungen und die vollständigen Warrior-/Mage-Verläufe können damit nicht unabhängig nachgeprüft werden. Entsprechende Reviewaussagen sind unten ausdrücklich Sekundärbelege.
- `CORE MECHANIC.txt` wurde im verfügbaren Arbeitskontext nicht gefunden. Der Obsidian-Vergleich benutzt nur die vom Nutzer genannten Merkmale.
- Keine natürlichen Modellläufe, Provideraufrufe, ST-Smokes, vollständigen Testsuiten oder vollständigen Replays wurden ausgeführt. Die kleinen Proben verwenden gespeicherte Antworten beziehungsweise künstliche In-Memory-Zustände; sie verändern keine Replayoriginale oder Produktdateien.

## 2. Obsidian Summoner und Avereth

| Prinzip der Vorlage | Tatsächliches Avereth-Verhalten | Bewertung |
|---|---|---|
| Stiller d100 nach zufällig 5–8 Nutzertexten | Höchstens ein deterministisches Fenster pro geeignetem Erzählzug; Reise, Pause und Szene konkurrieren um dasselbe Fenster | **Beibehalten.** Avereth kann den Anlass an die tatsächlich autorisierte Handlung binden. Ein zweiter Nachrichtenzähler würde zusätzlich zu Exposition, Ausschlüssen und Fehlwurfserie arbeiten. Kein belegter Nutzen. |
| Unterschiedliche Umgebungsgefahr | Rahmen Reise/Wildnis/Straße/Innenraum/Dungeon sowie Tageszeit bestimmen Chance und Art; Stadt/Innenraum ohne spontane `danger`-Art | **Bereits passend umgesetzt.** Ortsbindung und bestehende Gegnerautorität sind für Avereth aussagekräftiger als allgemeine Gefahrenstufen. |
| Cooldown von 1–5 Nachrichten | Kein allgemeiner Cooldown; Ausschlüsse, Pausenblock, anwesende Bedrohung und Gewichtung jüngster Arten | **Vorerst nicht übernehmen.** Ein Cooldown könnte auch gute soziale Folgeereignisse verhindern. Die vorhandenen natürlichen Daten belegen keine notwendige neue Frequenzregel. |
| Zähler pausiert bei Dialog/Verhandlung/wichtiger Szene | Kampf und konkrete offene mechanische Entscheidungen können ausschließen; ein gewöhnliches persönliches Gespräch ist kein eigener Sperrgrund | **Prinzip anpassen.** Gesprächsfokus schützen, aber nicht jede Unterhaltung steril machen. Das natürliche Hintergrundereignis mit Vessa zeigt, dass Unterbrechung verträglich sein kann. Ein neuer harter Dialogzustand ist noch nicht begründet. |
| Fünf Begegnungsstufen bis „Legendary Attention“ | Grobe Ereignisarten, daneben bestehendes Reaktionsrecht, Ortsgefahr, Populationen und Dungeon-Slots | **Nicht als neue mechanische Leiter übernehmen.** Forderung, Drohung und wirklicher Angriff können schon heute verschiedene Ausgänge haben. „Legendär“ darf keine zusätzliche Gegner-, Macht- oder Bossautorität erzeugen. |
| Händler, Reisende, Wachen, Banditen, größere Akteure handeln selbst | NPCs können auftreten, anbieten, warnen, bitten, drohen und im Rahmen der Autorität handeln; Dungeonkompanien haben bereits feste Identitäten | **Vorhandene Fähigkeit besser verbinden.** Persönlicher Anlass und passende bekannte Person sind die interessante Ergänzung, kein weiterer NPC-Typkatalog. |
| Sozialer Druck ohne Pflichtkampf | `meeting`, `life`, `trouble`; sogar eine `danger`-Wegblockade muss nicht zum Angriff werden | **Beibehalten und zuverlässig fortführen.** Ein offenes Fenster darf eine echte Wahl schaffen. Es darf sie nicht selbst beantworten. |
| Tageszeit, Wetter, Ressourcen als Modifikatoren | Tageszeit beeinflusst Chance und Art; Wetter kann erzähltes Hindernis sein, Unterkunft schützt Pausen. Kein allgemeiner Wetter-/Ressourcenmultiplikator auf PULSE | **Nur Tageszeit bereits mechanisch verbunden.** Zusätzliche Modifikatoren jetzt nicht begründet; sie würden neue Balance und zusätzliche Zustandsabhängigkeiten schaffen. |

### Aktuelle Größenordnung, keine neue Kalibrierung

`content/rules.json::pulse.base` enthält folgende Grundchancen, vor Fehlwurfserie und Ausschlüssen:

| Rahmen | Tag | Abend | Nacht |
|---|---:|---:|---:|
| Reise | 35 % | 40 % | 45 % |
| Wildnis | 20 % | 24 % | 28 % |
| Siedlungsstraße | 10 % | 12 % | 8 % |
| Innenraum | 6 % | 8 % | 3 % |
| Dungeon | 15 % | 15 % | 15 % |

`src/v4/pulse.js::frameOf` skaliert die Reisezeile zusätzlich mit der bestehenden `travel.leg_event_pct`; `pulseChance` berechnet `min(60, 1.75 × Basis, Basis × (1 + 0.15 × Fehlwürfe))`. Das sind Fensterchancen, keine Kampfchancen.

Die Artengewichte werden erst nach Öffnung ausgewertet. Tagsüber drinnen stehen beispielsweise `meeting/life/trouble` bei `45/50/5`; auf der Straße `meeting/life/trouble/trace` bei `35/40/20/5`. `kindOf` entfernt nicht mögliche Arten, halbiert Gewichte früherer offener Arten und schließt die zuletzt geöffnete Art aus, wenn Alternativen bestehen. `applyDomainEvent` hält die letzten vier offenen Arten. Diese Mechanik vermeidet unmittelbare Wiederholung einer Kategorie, aber keine Wiederholung desselben Motivs nach vielen Zügen.

**Kein Anlass, das durch einen 5–8-Nachrichten-Takt zu ersetzen.** Anders als ein freier Modellwurf sind Entscheidung, Pausenfolgen und Gegnergrenzen bereits im Eventlog prüfbar. Nicht gelöst ist damit die literarische Qualität der anschließend erzeugten Szene.

## 3. Ist-Architektur: vom Fenster zur Wiederbegegnung

### 3.1 Autorisierung und Ereigniswahl

`src/v4/commands.js::resolveCommands` eröffnet über `pulseBegin` den Kontext des einen Fensters. Autorisierte Reiseabschnitte werden mit `pulseLeg` registriert, Pausen über `pulsePause`/`pulseClaimPause`; `pulseFinish` liefert Entscheidung und Erzählerzeile. Die erste Exposition in Planreihenfolge gewinnt, sonst die Szene. Ein reines Gespräch kann daher einen Szenenwurf bekommen.

`src/v4/pulse.js::pulseBegin`, `dynamicReason` und `heldThreats` prüfen unter anderem Kampf/`pending_combat`, Lernen, wiederholte Eingabe, reine Boardzüge, ungültige Handlungen, konkrete offene Zahlung/Annahme, aktiv gesuchten Kontakt, anwesende Bedrohung und Pausenblock. Diese Prüfungen sind **kein allgemeiner Dialog-, Verhandlungs- oder Emotionsdetektor**. Insbesondere bedeutet eine frei erzählte Preisverhandlung nicht automatisch den Ausschluss jeder ihrer Nachrichten.

`draw` hasht Kampagnenseed, Zug und getrennten Tag (`pulse`/`pulse.kind`). Tageszeit beeinflusst die Parameter, nicht den Hashschlüssel. Die Kampfwürfel werden nicht fortgeschaltet. `settle`/`emitDecision` schreiben `pulse.rolled`; `src/v4/domain.js::applyDomainEvent` aktualisiert Fehlwurfserie und jüngste Arten. Kampf- und andere echte Ausschlüsse erzeugen keinen künstlichen Fehlwurfbonus.

### 3.2 Was der Narrator erhält

`pulseFinish` schreibt eine Zeile aus `lineFor` in `ctx.extra` und die Autorität nach `ctx.auth.pulse`. Das Ergebnis gelangt durch `src/context.js::playerActionsBlock`/`outcomeLines` in den verbindlichen Abschnitt `resolved` von `buildContext`.

Die Zeilen erlauben genau einen konkreten passenden Anlass. `meeting` nennt Reisende, Einheimische, Tiere oder jemanden mit einem Anliegen; `life` Nachrichten, Auflauf, Prozession, Bitte oder Marktgeschehen; `trouble` Streit, Forderung oder versuchten Diebstahl. Die Szene nimmt Alaric nichts weg, versetzt ihn nicht und verpflichtet ihn nicht. Ein geöffnetes Reisefenster kann einen wirklichen Zwischenhalt statt Ankunft verlangen. `danger` autorisiert höchstens eine passende Gruppe, nicht automatisch Schaden oder eine Spielerattacke.

**Das Fenster enthält außerhalb des Dungeons weder eine ausgewählte NPC-ID noch ein persönliches Motiv aus dessen Erinnerung.** Es benutzt keine E3-Auswahlfunktion. Die Verknüpfung entsteht dadurch, dass der Narrator zugleich andere Kontextabschnitte sieht und passende Inhalte selbst zusammenführt.

### 3.3 Narration und Extractor

Der Narrator erzeugt die tatsächliche Szene. `src/v4/extract.js::FORMAT_RULES` verlangt vom Extractor bestehende IDs, chronologische Deltas, passende `scene`-Angaben und eigene `arrive`-Deltas für tatsächliche Ankünfte. Eine bekannte Rückkehr verwendet `enter`; eine wirklich neue handelnde Person `person.new`. Ein Kollektiv soll keine einzelne Personenidentität erhalten.

`src/v4/world.js::applyWorld` verarbeitet den Bericht gegen die bereits gebuchte Spielerautorität. Erzählung ist weder Anwesenheitsnachweis durch bloße Namensnennung noch Berechtigung zu einem zusätzlichen freiwilligen Ortswechsel. Der Extractor kann eine gut erzählte Situation verlieren, wenn er den falschen Ort, eine doppelte Identität, unpassende Evidenz oder Ereignisse in falscher Reihenfolge meldet. Das ist eine konkrete Verbindungsschwäche, kein Beleg dafür, dass PULSE keine Szene erzeugt hat.

### 3.4 Firewall: Anwesenheit, Identität und Folgen

- `applyWorld`, Fall `person.new`: blockiert Kollektivpersonen, verhindert bestimmte Namensduplikate/-erweiterungen, erkennt bekannte Dienstpersonen wieder und lässt unbeteiligte namenlose Hintergrundmenschen unter Umständen reine Kulisse bleiben. Nicht jede Schankstubengestalt braucht einen dauerhaften NPC-Datensatz.
- `enter`, `absentKnown`, `enterKnown`: Eine bekannte Person, die anderswo verzeichnet und nicht anwesend ist, braucht aktuell erzählte Präsenz; `src/v4/narration_evidence.js::presenceInReply` prüft dafür Zitat oder passende Narrationssätze. Kein NPC-Reisezeitrechner. Für eine Person am bereits verzeichneten selben Ort verlangt dieser allgemeine Pfad keinen zusätzlichen Fernankunftsbeleg. Das ist eine bestehende Regel, kein hier neu bewiesener Fehler.
- `metArrivals`: Bei einer autorisierten Spielerankunft müssen tatsächliche Ankunft, angebotene/berechtigte bekannte Person und `metEvidence` zusammenpassen. Seit `.192` werden auch GO-Ziele in Worten über den tatsächlich erreichten Ort und eindeutig benannte Personen beurteilt. `knownAt` allein bucht niemanden als anwesend.
- `scene_context`: lokale Veränderungen müssen zu dem an diesem Schritt erreichten Ort gehören. Ein Stadtname ist nicht pauschal jeder seiner Unterorte. Eine solche Lockerung würde Personen aus einer anderen Gasse am Culvert materialisieren.
- `envelopeAllows`: prüft PULSE-Neuangreifer, gesuchte Kontakte und das bestehende Reaktionsrecht (`src/v4/envelope.js::mayOpenFight`). Drohung und tatsächliche Angriffsbindung bleiben verschieden.
- `coerce`: weist Wegnahme durch in dieser Antwort neu erzeugte Personen als `pulse_take` ab. **Der verwendete Satz `bornHere` wird bei `enterKnown` nicht ergänzt.** Eine historische Identität, die jetzt erst eintritt, erreicht deshalb unmittelbar die gewöhnlichen `mayTake`-Regeln. Das ist der reproduzierte Schutzfehler aus §5.1.

`src/v4/scene_handles.js::sceneHandle` bildet stabile lesbare Namen über kanonischen IDs, einschließlich unterscheidbarer anonymer Beteiligter. Es ist weder ein Wiederbegegnungsgenerator noch eine zweite Identitätsdatenbank.

### 3.5 Was anschließend gespeichert wird

| Speicher | Entstehung und spätere Bedeutung |
|---|---|
| Person/Anwesenheit | `entity.created`, `entity.updated`, `scene.entered`/`scene.moved`; bestehende ID bleibt erhalten. Eine Karte mit einem bekannten Namen ist noch kein Eintritt. |
| Erstkontakt | `src/engine.js::perceiveAll` bucht bei passender Wahrnehmung die Kenntnis von Alarics Erscheinung und eine erste Begegnungserinnerung mit Wichtigkeit 4. Das ist nicht automatisch eine bedeutungsvolle gemeinsame Geschichte. |
| Bedeutungsvolle Erinnerung | Der Extractor muss das relevante Geschehen als `memory` liefern; `applyWorld` und der bestehende validierte Berichtspfad prüfen es. `src/knowledge.js::isMeaningful` setzt die Schwelle bei 6. `sharedMoments` verlangt eine Verbindung der Erinnerung zu NPC und Alaric. |
| Automatische Episode | `applyWorld` ergänzt über `episode` eine kurze Eingaberückschau. Die niedrig gewichtete PC-Episode ersetzt keine konkrete NPC-Erinnerung. |
| Persönliche Absprache | `thread` mit `kind: promise/debt`, korrekten Beteiligten und belegter gemeinsamer Szene; `src/threads.js::threadEvents` hält Identität, Parteien und Erledigung zusammen. In der NPC-Karte werden Absprachen mit beiden Parteien (`pc` und NPC) gesondert ausgeliefert. |
| Hinweis/Konflikt | `sign`, `threat`, `mystery`, gewöhnliche Fakten und Erinnerungen. Ein lokaler Drohungs-Thread ist nicht automatisch ein persönlicher Vertrag und nicht automatisch ein Kampf. `sign/threat` verblassen im Kontext nach Ort/Zeit; sie werden dadurch nicht als erledigt umgeschrieben. |
| E3-Anker | `voice`, `manner`, `interest` als funktionale Fakten. `anchorRefusal` verlangt für neue/geänderte Werte Anwesenheit und eine frühere gemeinsame Begegnung vor dem Beginn der aktuellen Präsenz, höchstens 80 Zeichen und begrenzte Aktualisierung. `setFactEvents` bewahrt die Historie ersetzter Werte. |

Wichtige Unterscheidung: `sharedBefore` prüft eine frühere gemeinsame Erinnerung überhaupt, nicht nur die Schwelle 6. Eine belegte erste Sichtung kann später die E3-Berechtigung tragen; sie muss deshalb noch nicht unter „last meaningful“ stehen.

E3 ist kein Persönlichkeitsgenerator. Ein langer erster Aufenthalt wird nicht allein durch viele Dialogzüge zur späteren Begegnung. Der Guard erkennt einfache Zustandswörter und Gegenwartsmarker, prüft aber nicht vollständig semantisch, ob „voice“ wirklich eine Sprechweise statt Haltung beschreibt. Diese Qualität bleibt teilweise beim Extractor.

### 3.6 Was beim nächsten Mal tatsächlich im Kontext ankommt

`src/context.js::buildContext` packt nach Priorität. Priorität 0 wird beibehalten, auch wenn sie das normale Budget bereits ausschöpft; niedrigere Abschnitte werden nur bei genügend Platz ergänzt.

| Abschnitt | Auswahl/Priorität | Grenze |
|---|---|---|
| `where`, Spielerzustand, `resolved`, Korrekturen | Verbindlicher Kern, Priorität 0 | Kein Ersatz für korrekt lokalisierte Extractor-Deltas. |
| `CURRENT INTERLOCUTORS` | `interlocutorScores`; genannte Person, beteiligte Handlung, letzte Antwort, passende gemeinsame Erinnerung; bis zu zwei kompakte Karten, Priorität 0 | Nicht alle Figuren einer Gruppe erhalten gleich viel Detail. |
| `ARRIVING AT` | `arrivalPeople` aus `outcome.known_at`, autorisiertem letztem GO und ohne Reisehalt; Namen, offene Absprache, gemeinsame Erinnerung, letzte Begegnung priorisieren Kandidaten | Teilt dieselben zwei Kartenplätze mit wichtigen aktuellen Partnern. „NOT YET SHOWN“ bleibt ausdrücklich stehen. Kein Eintrittsautomatismus. |
| `KNOWN PEOPLE` | `npcContinuity` aus angesprochenen/betroffenen bekannten Personen, Priorität 0 | Keine eigenständige globale PULSE-Kandidatensuche. |
| Weitere anwesende Personen | `npcCard`, Priorität 1 | Kann beim Packen wegfallen; bei kompakten Hauptpersonen nur ausgewählte Zusatzfelder. |
| Genannte Abwesende | `namedAbsent`, Priorität 2 | Kontinuität, keine Anwesenheit. |
| Weitere Fakten, Erinnerungen, Threads | `retrieveRelevant` und passende Kontextabschnitte | Relevanz, Ort, Zeit und Budget begrenzen Lieferung. Nicht jedes gespeicherte Detail kommt immer mit. |

`npcCues` liest E3 aus den bestehenden Fakten; `npcCard` stellt diese vor die freie Erscheinungsbeschreibung. Trotzdem begrenzt `compactNpcCard` die ganze Kopfzeile auf **170 Zeichen**. Bei Name, Rolle und mehreren zulässigen Ankern kann ein späterer Anker vollständig fehlen. Die gekürzten Anker werden für die schon kompakt versorgte Hauptperson nicht automatisch in der Zusatzkarte nachgeliefert. Die synthetische `.198`-Probe bestätigt dies (§5.3).

Persönliche Absprachen kommen mit `agreementsWith` in „between you“ beziehungsweise den Detailabschnitt. Eine Erledigung wird kenntlich gehalten; `settledSince` kann eine ältere Erinnerung als inzwischen erledigt markieren. Für die lange Fortführung eines PULSE-Konflikts sind damit vorhandene Speicher nutzbar. Es fehlt kein allgemeines Beziehungs- oder Questbuch.

### 3.7 Dungeon: bereits enger verbunden

`src/v4/pulse.js::dungeonWindow`/`kindOf` erlauben ein `meeting` nur, wenn auf dieser Ebene eine Enginekompanie verfügbar ist. `settle` verwendet derzeit den Namen der ersten passenden Kompanie. `src/v4/living.js::leaderEvents` erzeugt für deren Anführer eine stabile NPC-ID; `companiesOn`/`companiesHere` und `contextLines` liefern die Kompanie einschließlich Anführer-ID. Der Anführer ist dadurch **noch nicht automatisch in der Szene**.

Das ist bereits eine echte Brücke zwischen Ereignis und bestehender Weltidentität. Sie ist enger als die allgemeine Freiland-/Stadtwahl. Noch nicht zugesichert ist eine priorisierte persönliche E2/E3-Karte des für PULSE ausgewählten Anführers vor seinem Eintritt.

Spuren anderer Gruppen kommen außerdem über `contextLines::SIGNS OF OTHERS`. `danger` verwendet ausschließlich `wanderSlot` und die reservierte `dungeon.ahead`-Referenz, keinen freien Spawner. Hinweise dürfen keine neuen Räume oder Gegner erschaffen. Die `.192`-Korrektur verhindert zusätzlich bestimmte Threads über gerade abgewiesene Kreaturen (`refusedCreatureInThread`).

### 3.8 Ein Fenster bleibt ohne passende neue Szene

Die normalen `lineFor`-Texte erlauben ausdrücklich, dass nichts passiert, wenn die Art nicht sinnvoll passt. Das offene Fenster bleibt verbraucht, die Fehlwurfserie bereits zurückgesetzt. Es gibt keine Ereigniswarteschlange, keine garantierte Nachholung und keine erneute Auswahl nach einer Extractorablehnung. Das verhindert, dass das Modell die deterministische Würfelfolge durch seine Auswertung nachträglich verändert.

Ausnahme: Eine tatsächlich durch PULSE mechanisch unterbrochene Pause hat eine verbindliche Ursache. `restCutFacts` und die Unterbrechungskorrektur in `applyWorld` liefern diese weiter, wenn die Antwort den gebuchten Abbruch nicht plausibel sichtbar gemacht hat.

Die Diagnose `pulse.outcome` zählt neue Personen, Kreaturen, Objekte, Features, Orte und Kampf, aber **keine `thread.set`, `memory.recorded`, `fact.asserted` oder bloßen `scene.entered`**. Sie ist ausdrücklich heuristisch und verändert keinen Zustand. „none“ bedeutet deshalb nicht „kein Ereignis erzählt“ und nicht „nichts persönlich Relevantes gespeichert“. Umgekehrt beweist ein neuer Ort allein keinen kausal passenden PULSE-Erfolg.

## 4. Natürliche Belege und bereits erfolgte Korrekturen

Die folgenden Nummern sind **Chatindizes** der genannten Originaldatei. Sie vermeiden die Verwechslung von Nutzerinput, Enginezug und Chatnachricht; insbesondere im Warriorlauf verschieben Systemeingaben die Zuordnung.

### 4.1 `.191`: alle acht offenen Fenster gezielt unterschieden

Die Originalevents enthalten fünf offene Warriorfenster und drei offene Roguefenster. Fünf Abschlussdiagnosen lauten `narrated:none`. Die zugehörigen Texte erlauben eine wesentlich genauere Einordnung:

| Originalfall | Sichtbare Szene und gebuchtes Ergebnis | Schluss |
|---|---|---|
| Warrior `#39 → #40`, `trace` | Hinweise/Spuren werden erzählt; die Antwort verlagert den Spieler ohne gebuchten GO aus dem bisherigen Ort. Die lokalen Deltas scheitern an `scene_context`. | Erzählt, aber am falschen Ort; keine fehlende PULSE-Idee. Schutzwirkung mit schlechtem Spielgefühl. |
| Warrior `#41 → #42`, `strange` | Ein blassgoldener Lichtschein über einem gefrorenen Teich unterbricht die Rückreise. `thread.t21.1`, Art `sign`, wird gebucht; keine Ablehnung. Diagnose trotzdem `none`. | **Nachgewiesene Unterzählung.** Auf `.198` mit unveränderten Antworten reproduziert. |
| Warrior `#57 → #58`, `danger` | Drei Kreaturen werden gebucht; Diagnose `likely`, kein unmittelbar gebuchter Kampf; zwei PULSE-Ablehnungen im Bericht. | Öffnung, Persistenz und zulässige Angriffsbuchung sind verschiedene Fragen. `likely` ist kein vollständiges Qualitätsurteil. |
| Warrior `#95 → #96`, `trace` | Hedwin zeigt einen zweiten Satz kleinerer Spuren. `thread.t47.1` (`sign`) wird gespeichert; zusätzlich Fakten/Erinnerung. Diagnose `none`, keine Ablehnung. | Zweiter direkter natürlicher Beleg für die Unterzählung von Hinweisen. |
| Warrior `#121 → #122`, `strange` | Blasses schwebendes Licht zwischen Birken an einem anderen Weg; neuer Ort und Mystery-Thread. Diagnose `likely`. | Sichtbar und persistiert; stark ähnliches Motiv wie `#42`, ohne ausdrücklich gebuchte Verbindung. Keine Verletzung der unmittelbaren Artenwiederholungssperre. |
| Rogue `#17 → #18`, `obstacle` | Unterwegs auftretendes Hindernis mit Beteiligten; zwei Personen und ein Ort werden gebucht, Diagnose `likely`. | Gegenbeispiel zur Behauptung, Reiseereignisse seien grundsätzlich nicht persistierbar. |
| Rogue `#25 → #26`, `meeting` | Widow Hesse kommt die Stufe ihrer Tür herunter, zeigt ihr Buch und spricht Alaric an. Ankunft am Haus und Erinnerung werden gebucht, ihr `met` nicht. Diagnose `none`. | Begegnung erzählt; teilweise gespeichert, Präsenz fehlt. `.192` behebt den Ankunftspfad, aber nicht den verbliebenen Evidenzfehler. |
| Rogue `#35 → #36`, `danger` | Drei Männer versperren die Stadtgasse und verlangen Haut/Zähne als Zoll. Zehn lokale Deltas werden wegen falschem Szenenort abgelehnt. Diagnose `none`. | Reise-/Ortsbruch, keine mangelnde Ereignisvielfalt; genaue Ursache unten. |

**Keines der fünf `none`-Labels beweist hier eine vollständig ausgelassene passende Szene.** Drei der fünf Fälle enthalten sogar einschlägige Threads beziehungsweise eine Begegnungserinnerung. Das beweist nicht, dass jede Szene kausal nur wegen PULSE entstanden ist: etwa der Besuch der Witwe war auch Spielerabsicht. Es widerlegt aber eine Gleichsetzung von Diagnose und Erzählqualität.

### 4.2 Rogue: drei Männer und verzögerte Persistenz

Die belegte Kette lautet:

1. `.191` ordnete den städtischen Auftragsort `realm.duskreach.millrace_row_culvert_ashbridge` dem Realm zu. Der Weg zur Ashbridge-Gilde wurde dadurch als Reise behandelt.
2. `#35/#36`: offenes Reise-`danger`, Narrator erzählt eine Stadtgasse, Extractor meldet `scene: loc.ashbridge` und keine abgeschlossene Zielankunft. Der kanonische PULSE-Zwischenhalt liegt dagegen im Realm. Drei `person.new`, drei Positionen, drei Wahrnehmungen und ein Thread scheitern mit `scene_context`.
3. `#38`: Der Spieler verhandelt. Erst jetzt werden `npc.npcapron_man`, `npc.npccudgel_carrier` und `npc.npcyoung_one` samt Erstkontakten und zwei Threads gebucht. Kein Kampf und keine Zahlung werden erzwungen. Die Diagnose des nun geschlossenen Fensters sieht drei neue Personen; das ist kein Beweis eines verbotenen geschlossenen PULSE-Ereignisses.
4. `#40`: Die eigentliche Ankunft in der Gilde wird gebucht. Noch auf die vorherige Gasse bezogene Fakten, Threadfortschreibungen und `leave`-Deltas liegen im Bericht nach dem Ortswechsel und scheitern erneut. Ein erfolgreiches neues Ziel heilt nicht automatisch die vorherige Konfliktpersistenz.

**Abgleich mit `.198`:** `src/v4/guild.js::townSite` und die `.192`-Nachkorrekturen in `docs/FOLLOWUP_191_192.md` beheben die falsche Anlage städtischer Jagdorte. Der bestehende originale alte Ort wird nicht nachträglich umgehängt. Ein einzelnes Replay von `#36` auf dessen ursprünglichem Vorzustand zeigt deshalb weiterhin den Realmhalt und ist kein Beleg für einen unveränderten Ortsgenerator.

Für die Ursachenunterscheidung wurde eine kleine zusammenhängende Offline-Kette `r191 #13–#40` ab der ursprünglichen Boardanlage verarbeitet. Einzige Übersetzung in den gespeicherten Antworten: alte Culvert-ID zu `loc.ashbridge.millrace_row_culvert`, wie in der vorhandenen Regression `tests/v4/batch191_fixes.test.js` vorgesehen. Ergebnis: Ort unter Ashbridge, GO in `#35` lokal, kein Realmhalt; PULSE ist jetzt ein geschlossenes Szenenfenster am Culvert. **Die alte Antwort `#36` bleibt wegen ihrer anderswo erzählten Gasse unzulässig.** `#38` kann die drei Männer nun am kanonischen Culvert buchen; `#40` behält die genannten Ablehnungen über die frühere Szene.

Das ist ein transparenter Gegenversuch zur Ortsursache, **kein natürlicher `.198`-Neulauf**: Der Narrator wurde nicht mit dem korrigierten Kontext neu befragt. Die Engine darf die alte, zum neuen Ablauf nicht passende Prosa nicht einfach kanonisieren. Insbesondere wäre „Stadt und sämtliche Unterorte gelten überall als dieselbe Szene“ eine Verschlechterung.

### 4.3 `.188`: brauchbare soziale Initiative und Gesprächsschutz ohne neue Mechanik

Im verfügbaren Rogue-Ausschnitt:

- `#29/#30`, `meeting`: Ein Eelfischer kommt mit dem Kahn heran und gibt einen örtlichen Hinweis; `npc.npceelman` wird gebucht. Der Spieler muss weder kaufen noch kämpfen.
- `#31/#32`, `danger`: Das Tier erscheint, knurrt und hält zunächst seinen Platz. Es gibt nicht allein wegen der Kategorie einen sofortigen Kampf.
- `#50/#52`: Ostrek bietet bezahlte Abendgänge an; `thread.t25.1` hält dieselben Parteien `npc.meister_ostrek` und `pc` über die Fortsetzung. Das dokumentiert eine persönliche Absprache, keine automatische private Quest und keine eigenmächtige Auszahlung.
- `#55/#56`, `meeting`: Hedd kommt in das laufende Gespräch mit Tam. `#57/#58`, `strange`, ergänzt ein blauweißes Licht; `#59/#60`, `meeting`, bringt die aufgeregte Gerberin. Drei aufeinanderfolgende geeignete Züge können also öffnen. Die Beispiele beweisen Existenz, nicht schon schädliche Ereignisdichte. Bei `#58` wird das Licht erzählt, während die Persistenz vor allem Hedds Aussagen betrifft: atmosphärische Auffälligkeit muss nicht jedes Mal einen dauerhaften Fall eröffnen.
- `#72/#74`: Vessas Jagdbedingungen bleiben als `thread.t35.1` mit beiden Parteien gespeichert. Das `life`-Fenster in `#74` lässt zwei Fuhrleute mit einer Nachricht hereinkommen. Vessa schaut nur kurz hin, sagt sinngemäß „nichts für uns“ und setzt die gemeinsame Planung fort. **Positiver natürlicher Fall einer passenden Unterbrechung.** Diagnose trotzdem `none`; hier ist dauerhafte Speicherung der Hintergrundfiguren auch nicht zwingend nötig.
- `#76/#78`: freiwilliger, nicht autorisierter Gang zu Ostrek wird erzählt; `no_go`/`scene_context` halten ihn aus dem Zustand. `#80` hat einen endgültig ungültigen Extractorbericht; `#82` enthält die tatsächlich autorisierte Ankunft, aber eine neue Ostrek-Identität neben dem früheren Meister. Das sind historische Verbindungsprobleme, nicht Argumente für mehr Ereignisse.

Die gegen `.188` gerichteten Nachkorrekturen sind in `.190–.192` weitergegangen: unter anderem `knownAt` für bekannte Unterorte, Wiederverwendung örtlicher Personen, Extractor-Reparaturen und ausdrücklich benannter Reise-/Stay-Kontext. Die damalige Ostrek-Episode wird hier deshalb **nicht ungeprüft als aktueller `.198`-Duplikationsfehler** geführt. Die `.198`-Restgrenzen werden mit den konkreten heutigen Pfaden beurteilt.

Ein sichtbarer Stilfehler in `#60` ist die Formulierung „The PULSE —“ mitten in der Geschichte. Das zeigt die Gefahr, interne Steuertexte als Erzählüberschrift zu übernehmen. Ein einzelner historischer Fund rechtfertigt keinen zusätzlichen Modellaufruf oder große Promptarchitektur; die Grenze zwischen Steuerung und erzählter Welt bleibt aber bei späteren Varianten wichtig.

### 4.4 E3: gespeicherte Merkmale sind noch kein Langzeitbeweis

Im `.191`-Original wurden gezielt geprüft:

| Fall | Tatsächlicher gespeicherter Anker | Bewertung |
|---|---|---|
| Warrior `#36`, Hedwin | `voice`: „dry mock salute and easy bickering with Marren“ | Wiedererkennbarer Umgangston; mischt Sprechweise und Geste. |
| Warrior `#80`, Marren | `voice`: „talks briskly while she works, practical and unhurried“ | An die gezeigte Arbeit und Sprache gebunden; kein autonomer Persönlichkeitswurf. |
| Warrior `#92`, Wat | `voice`: „boastful pride in being right, settling matters with a spit“ | Aus der Szene verständlich, aber eher Haltung/Geste als reine Stimme. Kein Beweis eines kaputten Factspeichers. |
| Rogue `#42`, Guild-Clerk | `voice`: „dry, brisk manner; says a hard word flatly and moves the quill on“ | Tatsächlich gebucht; zugleich persönlicher Beschwerde-Thread mit `pc`. Der Lauf endet vor brauchbarer Langzeitfortführung. |

Die aktuelle Kontextrekonstruktion aus diesen Originalzuständen liefert Hedwins und Wats Stimme sowie die gemeinsame Erinnerung; beim Clerk auch „between you“ mit dem Beschwerdeversprechen. Das belegt den heutigen Transportpfad, **nicht rückwirkend den kompletten ursprünglichen Narrator-Request**. In den geprüften `.191`-Records gibt es keine spätere Ersetzung dieser vier Anker.

Das [Review zu `.188`](../testrun_10b/npc-20261114-161005Z/REVIEW.md), §6, berichtet 15 gespeicherte Anker, vier spätere Änderungen, neun vollständige und drei weitere gekürzte spätere Lieferungen. Genannt werden Marla, Brannic Vell, Vessa nach `#88` und Berra Wren. Diese betreffenden Originalabschnitte fehlen hier; insbesondere Berras spätere Ersetzungen sind **Reviewbefund, nicht in dieser Untersuchung neu verifizierte Naturbeobachtung**. Die technische Ersetzbarkeit ist im aktuellen Code vorhanden; die Qualität langfristiger Persönlichkeitsentwicklung ist damit noch nicht abgenommen.

Der `.191`-Rogue-Lauf endet nach 22 Eingaben wegen Provider-/Guthabenproblemen, der Mage liefert keine spielbare Vergleichsreihe. Die Reviews belegen daher keinen gleichwertigen vollständigen Dreierbatch und keinen kausalen Qualitätsgewinn durch E3. Für dieses Urteil wurden keine Provideraufrufe nachgeholt.

## 5. Kleine Offline-Proben auf `.198`

### 5.1 Bekannte Rückkehr umgeht den Ankunftsschutz

**Aktuell reproduzierter technischer Fehler gegenüber dem PULSE-Kanon.** Der Kanon §8 schützt jemanden, der „in einer Antwort neu auftaucht“, und nimmt ausdrücklich „bereits Anwesende“ aus. Der Code verwendet dafür aber überwiegend neu **erzeugte Identitäten**.

Minimalprobe gegen `applyWorld`, Ruleset 2/C, geschlossene PULSE-Szene, 100 cp, kein Kampf, keine Spielerzahlung und kein aktiv gesuchter Kontakt:

| In-Memory-Variante | Bericht | Ergebnis |
|---|---|---|
| Rask ist neue Identität | `person.new` als Bandit, danach `coerce robbery 10 cp` | `pulse_take`, Geld bleibt 100 cp. |
| Rask existiert historisch, ist abwesend, `at: null` | Belegtes `enter` („Rask stood beside him.“), danach dieselbe Wegnahme | Eintritt und `coin.changed -10` akzeptiert, Geld 90 cp, keine Ablehnung. |
| Rask war bereits anwesend | Dieselbe Wegnahme nach bestehenden Envelope-Regeln | 90 cp; Kontrollfall für das absichtlich erhaltene Reaktionsrecht. |

Quelle: `src/v4/world.js::newEntity` füllt `bornHere` aus `entity.created`; `enterKnown` tut das nicht. `coerce` prüft `bornHere` vor `src/v4/envelope.js::mayTake`. Für neue Angreifer verwendet `envelopeAllows` dieselbe begrenzte Menge; ein entsprechender Angriff wurde hier nicht zusätzlich reproduziert und ist nicht als natürlicher Vorfall behauptet.

**Kleinste sinnvolle Korrekturrichtung:** Schutz am tatsächlichen neu hinzukommenden Akteur der Szene ausrichten, nicht allein am Erzeugungsdatum seiner Identität. Bereits Anwesende, autorisierte Zielkontakte, laufende Kämpfe und normale freiwillige Transaktionen dürfen dadurch keine neuen Sonderregeln erhalten. Das ist besonders vor einer stärkeren PULSE-Auswahl bekannter NPCs notwendig. Aufwand klein bis mittel; die genaue Abgrenzung der Eintrittspfade benötigt sorgfältige Gegenfälle.

### 5.2 Witwe: vorhandenes Wiedersehen wird nicht als Präsenz erkannt

**Original:** `r191 #26` beginnt „The widow came down one step of her stoop to meet him, and looked at the Guild plate longer than at his face.“ Auf `.191` scheiterte `expected.go.met` mit `met_without_arrival`. Auf `.198` ist die tatsächliche Hausankunft erkannt, aber `met_evidence` lehnt ab: „it does not show them here now“. Die Witwe fehlt danach in `scene.present`.

**Offengelegter positiver Kontrollfall:** Nur der erste Narratorsatz und sein zugehöriges Extractorzitat werden durch „The widow stood on her swept stoop and looked at the Guild plate longer than at his face.“ ersetzt. Alles Weitere bleibt gleich. `.198` bucht `scene.entered` für `npc.widow_hesse`; keine Expected-Ablehnung. Die PULSE-Diagnose bleibt dennoch `none`.

Ursache: `src/v4/narration_evidence.js::metEvidence`/`presentHere` erkennt eine eng begrenzte Menge gegenwärtig gezeigter Handlungen. `came` gehört nicht zur `HERE_DOES`-Liste; das spätere „looked“ wird in dieser Satzstruktur nicht als passende Handlung direkt bei der bezeichneten Person erkannt. **Kein fehlender NPC, kein falscher Ort und kein notwendiger neuer Rückkehrmechanismus.**

Korrekturrichtung: dieses echte Präsenzmuster eng unterstützen, einschließlich Gegenfällen zu Erinnerung, Hörensagen, Verneinung, falscher Person und anderem Ort. Keine pauschale Anerkennung jeder Erwähnung oder jeder GO-Namensübereinstimmung. Aufwand klein, direkter Nutzen für Wiederbegegnungen.

### 5.3 E3-Kürzung und Diagnose getrennt geprüft

- `w191 #42` wurde mit unveränderten gespeicherten Antworten auf `.198` erneut verarbeitet: `thread.t21.1` vorhanden, keine Ablehnung, weiterhin `narrated:none`. Das diagnostische Problem ist aktuell.
- Die erfolgreiche kontrollierte Witwenankunft aus §5.2 bleibt ebenfalls `none`: sogar ein echtes `scene.entered` auf einer bestehenden Identität wird nicht als Persistenzsignal gezählt.
- Für die Kartenprobe wurde ausschließlich eine Kopie des ursprünglichen Warriorzustands nach `#92` verwendet. Zu Wats vorhandener Stimme wurden zwei künstliche, jeweils unter 80 Zeichen lange Fakten ergänzt: `manner` über das gewohnte Ordnen seiner Manschetten und `interest` an örtlichen Sumpfvögeln. Bei Ansprache Wats liefert `buildContext` die Stimme ganz, `manner` nur angeschnitten und `interest` gar nicht im resultierenden Kontext. **Das ist eine synthetische Transportprobe, keine Behauptung über Wats natürliche Persönlichkeit.**

Die Proben wurden mit `tests/v4/batch191_lib.js::{reply191,chain191,E}` und den genannten echten Produktfunktionen ausgeführt. Vier unveränderte Einzelantworten (`w191 #42`, `r191 #26/#36/#38`), ein offengelegter positiver Evidenzkontrollfall, die eine kausale Rogue-Kette `#13–#40` sowie die kleinen Ankunfts-/Kartenvarianten bestanden ihre gezielten Ergebnisassertionen. Das bedeutet **Reproduktion der beschriebenen Befunde**, nicht Bestehen einer Produktabnahme. Es wurde kein Baselinefingerprint geändert.

## 6. Sechs Gameplay-Fälle

### A – Aufdringlicher Händler in der Taverne

**Vorhanden:** Ein Innenraumfenster kann `meeting`, `life` oder `trouble` sein. `lineFor` erlaubt Anliegen und Spannungen; `person.new` kann einen tatsächlich interagierenden Händler buchen. `offer` und die bestehenden Finanzpfade bilden ein Angebot ab. Weder das Ereignis noch der Dialog ersetzt die Kaufentscheidung. `coerce` schließt zudem den Handelspartner eines offenen Verkaufs als Wegnehmenden aus.

**Grenzen/Fehlerquelle:** `meeting` bestimmt noch keinen originellen Verkaufsanlass. Ein Angebot kann dieselben generischen Waren/Gesten wiederholen; alte Offerten oder Fakten können bei falscher Person landen. Der Ankunftsschutzfehler ist bei einer bekannten zurückkehrenden Person relevant, auch wenn der konkrete Händler zusätzlich durch die Verkaufsregel geschützt sein kann.

**Kleinste Verbesserung:** Ankunftsschutz zuerst; anschließend Anlass aus Ort, bestehendem Bedarf oder vorhandenem Kontakt liefern, ohne neue Ware zu garantieren. Der Händler darf lästig sein und ein Gegenangebot machen. Kauf, Zahlung, Gegenstandsübergabe und Annahme bleiben bei ihren bestehenden Buchungspfaden. Kein Handelsminispiel erforderlich.

### B – Bekannte Person erinnert an eine Absprache

**Vorhanden:** Gleiche NPC-ID, lebender Status, plausibler Ort und tatsächlicher Eintritt; dazu `promise/debt` mit korrekten Parteien oder eine gemeinsame bedeutsame Erinnerung. `knownAt`/`arrivalPeople` und `agreementsWith` können den Anlass schon vor einem autorisierten Besuch liefern. Allgemeines `enter` erlaubt auch, dass die Person zum Spieler kommt.

**Grenzen/Fehlerquelle:** `entity.at` ist eine letzte Ortsinformation, keine zeitlose Präsenzgarantie. Für spontane PULSE-Begegnungen gibt es keinen allgemeinen Kandidatenpfad. Falsche `person.new`, nicht erkannte Ankunft oder fehlendes `who: pc` im Thread können eine erzählte Wiederbegegnung entpersonalisieren. Der belegte Witwenfall scheitert genau zwischen Erzählen und tatsächlicher Präsenz.

**Kleinste Verbesserung:** Engen Evidenzfehler beheben. Danach nur räumlich und sachlich passende vorhandene Personen samt einer relevanten Absprache/Erinnerung als Möglichkeiten anbieten; niemals durch Auswahl anwesend buchen. Kein globales Wiederauftauchen beliebter NPCs, keine Wiederholung bereits erledigter Rettungen, keine neue Beziehungspunktzahl.

### C – Wache fordert etwas oder versperrt den Weg

**Vorhanden:** `trouble` passt zu Forderung oder Streit, `life/meeting` zu einer Ansprache. Im städtischen PULSE gibt es kein `danger`. Eine Wache kann sprechen, eine Bedingung nennen oder den Weg bewachen; der Zustand kann Fakten und einen lokalen Konfliktthread halten. Ein echter späterer Angriff richtet sich nach `mayOpenFight` und realer Angriffsbindung, nicht nach dem Wort „Forderung“. Ein versperrter Bereich benutzt die vorhandene Orts-/Zugangsautorität.

**Grenzen/Fehlerquelle:** Frisch erzeugte Wache kann in dieser Antwort keine Gebühr als `coerce` kassieren; bekannte zurückkehrende Wache kann derzeit am Schutz vorbeikommen. Nachfolgende reale Gewalt/Einziehung durch bereits Anwesende hat bestehende Regeln: Spielerhoheit schützt seine freiwilligen Entscheidungen, sie bedeutet keine Immunität gegen autorisierte Weltfolgen. Ein Drohungs-Thread allein bucht weder Zahlung noch Schaden noch eine neue globale Quest.

**Kleinste Verbesserung:** Eintrittsgrenze korrigieren; Forderung, Reaktion und eventuelle Konsequenz sauber in der bereits vorhandenen Szene fortsetzen. Rollenrechte, Geldregeln und Gewaltmechanik nicht neu gestalten. Ein durch `scene_context` verlorenes Ende der Auseinandersetzung darf nicht als „ewig offene Wache“ weiterwirken; hierfür zuerst richtige Delta-Orte/-Reihenfolge, keine automatische Erledigung.

### D – Persönliches Gespräch läuft

**Vorhanden:** PULSE darf grundsätzlich öffnen. Anwesende NPCs, ihre Karten und eine laufende Absprache können eine leise Reaktion auf ein Ereignis ermöglichen. `.188` Rogue `#74` zeigt einen passenden Nebenvorfall, nach dem Vessa beim Thema bleibt.

**Grenzen/Fehlerquelle:** Kein strukturiertes Merkmal für „vertrauliches Gespräch gerade auf seinem Höhepunkt“. Neues Anliegen, ausführlicher Fremder oder Reisehalt können die Szene überlagern, obwohl jeder einzelne Vorgang für sich regelkonform wäre. Eine pauschale Textsuche nach „talk“ oder „personal“ wäre keine verlässliche Lösung; sie könnte nahezu das ganze Rollenspiel stilllegen.

**Kleinste Verbesserung:** Zuerst Ereignisverträglichkeit in der Narration ausdrücken: laufender Gesprächsfaden bleibt Hauptsache, kompatible Weltreaktion am Rand, unpassender neuer Anlass darf wie bereits erlaubt entfallen. Keine Wartepflicht und kein Pflicht-NPC nach einem Zähler. Ob daraus später eine echte Auswahlbeschränkung wird, hängt von der Nutzerentscheidung und neuen Naturbelegen ab.

### E – Gruppe auf einer Reise, Reaktion im Folgezug

**Vorhanden:** PULSE kann die Reise vor dem Ziel stoppen (`src/v4/world.js::applyWorld`, `roadStop`/`bookRoadStop`). Die tatsächlich handelnden Gruppenmitglieder haben einzelne IDs und stabile Handles; ihre Präsenz und Positionen bleiben bis zum echten Verlassen/Ortswechsel bestehen. Der Folgezug braucht kein neues Fenster, um mit ihnen zu verhandeln. Erinnerungen und lokale Threads können den Konflikt erhalten.

**Grenzen/Fehlerquelle:** Gruppenkulisse ist keine Einzelperson; drei sprechende Männer brauchen unterscheidbare Identitäten. Eine Prosa-Gasse am Ziel ist nicht derselbe Ort wie der autorisierte Wegstopp. Falsche Szenenangabe oder nachgeschobene Vorort-Deltas verlieren die Figuren beziehungsweise das Ende ihres Konflikts. Die Rogue-Episode belegt dieses Risiko; ihre frühere falsche Stadt-/Realm-Anlage ist inzwischen korrigiert.

**Kleinste Verbesserung:** Den vorhandenen Zwischenhalt und seine Beteiligten konsequent als nächsten Szenenkontext benutzen, Chronologie und lokale Deltas einhalten. Kein zusätzliches Gruppengedächtnis und keine pauschale Freigabe des Zielorts. Für ein noch behauptetes `.198`-Narratorproblem wäre ein neuer natürlicher Verlauf aussagekräftiger als wiederholt alte, zum korrigierten Ablauf unpassende Texte zu akzeptieren.

### F – Etablierter Abenteurer oder Spur im Dungeon

**Vorhanden:** Enginekompanien auf derselben Ebene, stabile Anführer-IDs und Informationen über Spuren anderer Gruppen. Ein PULSE-Meeting verwendet eine solche Kompanie. Die Szene darf eine Begegnung, Warnung oder Spur erzählen; freie neue Gegner/Räume sind nicht erforderlich. Ablehnungen falscher Kreaturen dürfen seit `.192` nicht über bestimmte abhängige Threads umgangen werden.

**Grenzen/Fehlerquelle:** Kompanie auf der Ebene heißt noch nicht Anführer vor Alaric. Der aktuelle erste passende Kompaniename ist keine Auswahl nach gemeinsamer Geschichte. Eine bekannte einzelne Figur lässt sich nicht allein wegen ihrer Beliebtheit auf jede Ebene versetzen. Ein Geräusch beweist keine kampffähige neue Gruppe.

**Kleinste Verbesserung:** Bei einem tatsächlich passenden Kompanie-Meeting die schon vorhandene Anführeridentität und gegebenenfalls eine persönliche Erinnerung kompakt mitliefern. Keine zweite Dungeonpopulation oder neue Raummechanik. Natürliche Langzeitbelege für genau diese PULSE×E3-Verknüpfung fehlen in den hier vollständig verfügbaren `.191`-Verläufen.

## 7. Priorisierte Befunde: Fehler, Verbindungslücken und Wünsche

| Priorität/Befund | Einordnung und Beleg | Erwartbarer Spielnutzen | Kleinste Option; Aufwand/Risiko |
|---|---|---|---|
| **P1 – Ankunftsschutz bekannter NPCs** | Technischer Fehler: synthetisch auf `.198` reproduzierte Wegnahme, §5.1; Kanon schützt neu auftauchende Akteure | Hoch im betroffenen Fall; verhindert unfaire Konsequenz genau bei gewünschter Wiederbegegnung. Natürliche Häufigkeit unbekannt | Eintritt statt nur Neuanlage abgrenzen; klein–mittel, mittleres Abgrenzungsrisiko. Vor Test, vor aktiver Wiederverwendung. |
| **P1 – Präsenzbeleg der Witwe** | Technischer False Negative: Originalantwort auf `.198`, §5.2 | Hoch im betroffenen Dialog; Wiedersehen wird tatsächlich spielbar statt nur behauptet | Enger Evidenzfall plus falsche Präsenz als Gegenfälle; klein, überschaubares Risiko. Vor Test. |
| **P2 – `none` bei gespeicherten sozialen Ereignissen** | Nachgewiesene diagnostische Lücke, Originalfälle und `.198`-Probe | Direkt gering, für richtige nächste Entscheidungen hoch | Diagnose nach tatsächlichen Speicherarten aufschlüsseln; nicht als sichere Semantikerkennung verkaufen. Klein, geringes Produktrisiko. Vor nächster Auswertung. |
| **P2 – gültige E3-Felder verschwinden in der Hauptkarte** | Implementierter Speicher, begrenzter Transport; synthetisch belegt, historische Reviewhinweise | Mittel, wenn mehrere Merkmale vorliegen; Auswirkung auf tatsächlichen Schreibstil noch ungemessen | Felder innerhalb des bestehenden Budgets sinnvoll erhalten/auswählen, nicht blind Kontext vergrößern. Klein–mittel, Konkurrenz mit Identität/Erinnerung beachten. |
| **P2 – spontane bekannte Person ohne gezielten persönlichen Anlass** | Tatsächlich fehlende PULSE-Kandidatenauswahl außerhalb des Dungeons; E2-Bausteine vorhanden | Potenziell hoch für Wiedererkennung, aber keine garantierte Qualitätssteigerung | Wenige passende Kandidaten mit Ortsgrund und bestehendem Anlass; mittel, Risiko unplausibler Wiederkehr/Verdrängung neuer Figuren. Nach Schutzkorrekturen. |
| **P2 – mehrörtige Ereignisse verlieren lokale Fortsetzung** | Natürlicher Fehlerkomplex, mehrere Ursachen bereits `.190–.192` korrigiert; unveränderte Originalprosa bleibt teils unvereinbar | Hoch, wenn es wieder auftritt | Bestehende Reihenfolge-/Ortsautorität beibehalten; nur neue, genau belegte Restfälle korrigieren. Kein allgemeines Bewegungsprojekt. |
| **P3 – gleichartige Motive trotz Artenwechsel** | Natürliche Lichtmotive; Qualitäts-/Verbindungsdefizit, kein Würfelfehler | Mittel; am ehesten sichtbar durch bessere Anlässe und Kontraste | Bestehende offene Hinweise berücksichtigen, freie Motivvariation statt weiterer Klassen. Klein–mittel, nicht jeden Hinweis zum Großplot erklären. |
| **P3 – besonderer Gesprächsschutz** | Tatsächlich fehlender ausdrücklicher Szenenfokus; schädliche Häufigkeit nicht belegt, guter Gegenfall vorhanden | Potenziell mittel bis hoch, Gefahr steriler Dialoge | Weicher Fokus vor hartem Ausschluss; erst fachliche Präferenz entscheiden. Kein generischer Dialogzähler. |
| **P3 – automatische Beziehungs-/Agendaentwicklung** | Bewusst außerhalb E2/E3; für die untersuchten Situationen nicht nötig | Ungewiss, großer Aufwand und Kanonrisiko | Nicht Teil der nächsten Pakete. E4/E5 separat lassen. |

### Funktionsstand in den vier verlangten Kategorien

- **Implementiert und tatsächlich funktionsfähig:** neue soziale Kontaktpersonen, Forderungen ohne Pflichtkampf, wiedererkennbare IDs, gemeinsame Erinnerungen, persönliche `promise/debt`-Threads, gezielte Kartenlieferung, Einhaltung vieler Orts-/Spielergrenzen. Natürliche Beispiele in §4; einige Grenzen werden gerade durch Ablehnungen sichtbar.
- **Implementiert, natürlich noch unzureichend belegt:** langfristige hochwertige E3-Änderung mit späterer passender Darstellung; persönliche Dungeonkompanie-Wiederbegegnung; verlässliche soziale Fortführung über viele Rückreisen unter `.198`. Fehlende Originalteile sind keine negative Abnahme.
- **Technisch vorhanden, schlecht verbunden:** E3-Speicher und gekürzte Karte; lokale Hinweise und `pulse.outcome`; PULSE-Anlass und vorhandene persönliche Erinnerung; mehrörtige Narration und chronologische Extractor-Deltas.
- **Tatsächlich fehlend:** allgemeine orts- und erinnerungsbezogene PULSE-Auswahl bekannter Personen, expliziter Schutz des laufenden persönlichen Gesprächsfokus, semantische Motivwiederholungsprüfung. Diese Funktionen sind unterschiedlich wünschenswert; „fehlend“ bedeutet nicht „sofort bauen“.

## 8. Verbesserungsoptionen nach Spielnutzen und Komplexität

### Bestehende NPCs gezielt wiederverwenden

Eine passende bekannte Person kann mit einem Satz mehr Wirkung erzeugen als drei neue Fremde: Sie fragt nach einer offenen Absprache, reagiert auf eine gemeinsame Erfahrung oder bringt eine Information, die zu ihrem etablierten Anliegen passt. Dafür gibt es bereits Fakten, Erinnerungen und Threads.

Die sinnvolle Ergänzung wäre eine **kleine Kontextauswahl**, keine gebuchte Wiederkehr: nachweisbar passender Ort/Ebene, lebende Identität, keine widersprechende Präsenz, relevanter Anlass. Eine letzte Ortsangabe ist Kandidatenwissen; tatsächlicher Auftritt bleibt zu erzählen und zu validieren. Bei Zweifel ein neuer örtlich plausibler Mensch oder ein unpersönliches Ereignis. Keine Quote „immer bekannte NPCs“ und keine zufällige Fernreise beliebter Figuren.

Kosten: zusätzliche Auswahl und etwas Kontext. Risiko: Kontext kann einen bloßen Kandidaten wie eine garantierte Begegnung wirken lassen. Deshalb sind bestehende „NOT YET SHOWN“-Grenzen und der korrigierte Ankunftsschutz Voraussetzung. Der Dungeon bietet mit seinen Kompanien bereits das sicherste begrenzte Vorbild.

### Vielfalt innerhalb der sieben Arten

Nützliche soziale Varianten sind zum Beispiel Irrtum, Bitte, Warnung, Angebot, Interessenkonflikt, Zeuge eines fremden Problems oder Rückbezug auf eine Abmachung. Das sind **Erzählmöglichkeiten innerhalb bestehender Arten**, keine weiteren Engineereignisse mit eigener Drop-/Kampf-/Zeitlogik.

Für Erinnerung ist der Zusammenhang wichtiger als die Etikettenzahl: Wer braucht gerade was, warum hier, warum erkennt Alaric die Person, und welche echte Antwortmöglichkeit bleibt ihm? Ein Hinweis darf vorbeiziehen. Nicht jede Spur braucht eine Quest; nicht jedes Gespräch eine neue Verpflichtung. Die bestehende Auswahl jüngster grober Arten sollte bleiben. Ein pauschaler Zusatzkatalog könnte sonst nur andere Formulierungen derselben Routine erzeugen.

### Eskalation über mehrere Züge

Eine Forderung kann offen bleiben, ein NPC auf eine Antwort reagieren und eine Drohung später zurücknehmen oder konkretisieren. Anwesenheit, Position, gewöhnliche Fakten, `threat`-Thread, gemeinsame Erinnerung und gegebenenfalls persönliche Vereinbarung reichen dafür grundsätzlich. Ein Streit muss keine neue numerische Beziehung auslösen. Eine gebuchte Vereinbarung darf nicht allein wegen eines neuen PULSE-Fensters verschwinden oder neu bezahlt werden.

`src/threads.js::currentThreads`/`threadEvents` und `src/context.js::agreementsWith` bieten bereits Fortführung und Erledigung. Die Grenze: Nur `promise/debt` werden in diesem Pfad persönlich mit `who` verknüpft; ein allgemeiner Drohungs-Thread ist primär ortsbezogen. Für späteres persönliches Erinnern kann die vorhandene NPC-Erinnerung dienen. Daraus folgt keine Pflicht zu einer neuen universellen Konfliktakte.

### Szenenschutz und Häufigkeit

Ein persönliches Gespräch kann eine kleine Reaktion der Umgebung vertragen; eine dringende neue Hauptaufgabe mitten in einer Antwort kann es zerstören. Der natürliche Vessa-Fall zeigt den Unterschied. Zuerst den bestehenden Freiraum „passt nichts, passiert nichts“ und die Fortsetzung des laufenden Gesprächs nutzen. Ein harter Szenenstatus würde Erkennung, Ende, Priorität und Fehlklassifikation brauchen und damit einen erheblich größeren Eingriff darstellen.

Weder die acht offenen `.191`-Fenster noch die unterschiedlichen `.188`-Expositionen liefern eine belastbare Dosis-Wirkungs-Aussage. Die Folge `meeting/strange/meeting` beweist, dass Häufung möglich ist; sie beweist keine flächige Aufdringlichkeit. Zuerst die Diagnose korrigieren und danach im natürlichen Spiel konkrete Störungen und gern angenommene Ereignisse unterscheiden. Keine höheren Chancen, kein zusätzlicher Cooldown, kein Zurücksetzen der Würfelhistorie nach Modellurteil.

### Grenze zu E5 und Spielerhoheit

Heute kann der Narrator NPCs innerhalb der aktuellen Szene eigene Anliegen äußern, andere Personen ansprechen, warnen, Informationen zurückhalten, ablehnen oder eine glaubwürdige Reaktion beginnen lassen. Bestehende Fakten wie `agenda` können bereits einen etablierten Anlass beschreiben. Das ist noch keine Simulation selbstständiger Zielverfolgung über Tage und Orte.

E5 begänne bei eigener fortlaufender Planung, konkurrierenden Zielen, Reisen/Aktionen ohne sichtbare Szene und daraus automatisch gebuchten Folgen. Keines der sechs Beispiele benötigt das. Ebenso wenig braucht es automatische Sympathiewerte, Romanzen oder Zuschreibungen darüber, was Alaric denkt.

Alarics freiwillige Annahme, Kauf/Zahlung, Reise, Angriff und neue Verpflichtung benötigen seine Entscheidung und die passende Buchung. NPCs dürfen Angebote und Druck erzeugen. Tatsächlich autorisierte äußere Gewalt kann Folgen haben; diese entstehen aus bestehenden Enginepfaden, nicht aus einer PULSE-Überschrift. Die kleine Rückkehrkorrektur soll diese Grenze sichern, nicht Weltgefahren abschaffen.

## 9. Zwei bis drei künftige Fachplanpakete

Dies sind Umfangsentscheidungen für mögliche Folgeaufträge, **keine vollständigen Implementierungsfachpläne**.

| Paket | Ziel und enger Umfang | Abhängigkeiten / erforderliche Entscheidung | Empfehlung |
|---|---|---|---|
| **A – Verlässliche Begegnungsbuchung** | Neu hinzukommende bekannte NPCs unter denselben PULSE-Ankunftsschutz stellen; belegten Witwen-Präsenzfall beheben; soziale Persistenz in der Diagnose sichtbar machen, ohne automatische Semantikbehauptung | Bestehender Kanon reicht. Gegenfälle für schon Anwesende, falsche Präsenz, autorisierte Kontakte und reine Hintergrundtexte sind nötig. Keine neue Grundsatzentscheidung | **Vor persönlichem User-Test.** Höchste technische Sicherheit bei engem Umfang; Behebung reproduzierter Fehler. |
| **B – Persönlicher Kontext aus vorhandener Geschichte** | E3-Felder im knappen Kartenbudget weniger verlieren; für geeignete soziale Fenster kleine Auswahl plausibler bekannter Personen mit einer einschlägigen Erinnerung/Absprache, im Dungeon bestehende Anführer nutzen | A vor aktiver Wiederkehrauswahl. Nutzerpräferenz zur Gewichtung „bekannt, wenn passend“; keine numerische Quote nötig. Budget und Kandidatenstatus erhalten | Kartenverbesserung kann früh erfolgen. Breitere Auswahl nach eigenem kleinen Fachentscheid; kein Pflichtblocker für den nächsten Test. |
| **C – Ereignisse passend zur laufenden Szene** | Soziale Anlässe innerhalb der sieben Arten variieren; aktuelle Gesprächslinie und vorhandene Hinweise berücksichtigen; unverträgliche Ablenkung vermeiden | Verlässliche Auswertung aus A. Entscheidung über weichen Gesprächsfokus; natürliche Beobachtung von Akzeptanz/Störung erforderlich, bevor eine neue mechanische Sperre erwogen wird | **Nach neuen natürlichen Beobachtungen vertiefen.** Keine Frequenz-, Cooldown-, Gegner- oder E5-Erweiterung. |

Ein Paket sollte nicht als Vorwand dienen, Movement, Combat, NPC-Grundarchitektur oder Wirtschaft erneut zu bearbeiten. Insbesondere gehört keine pauschale Freigabe von `scene_context` zu A, und keine automatische Anwesenheitsbuchung zu B.

## 10. Offene Nutzerentscheidungen und Abschlussurteil

Nur zwei echte Präferenzen müssen vor den entsprechenden Erweiterungen entschieden werden:

1. **Bekannte Personen bei gleichem örtlichem/sachlichem Fit bevorzugen?** Empfehlung: ja, als sparsame Kontextpräferenz mit einem echten offenen oder erinnerbaren Anlass; kein Wiederkehrzwang und keine Quote. Bei fehlendem Fit bleiben neue Personen und unpersönliche Ereignisse möglich.
2. **Persönliche Gespräche weich schützen oder ausdrücklich ganz von neuen Anlässen freihalten?** Empfehlung: Gesprächsfaden hat Vorrang; passende Randereignisse und Reaktionen der bereits beteiligten Personen bleiben möglich. Einen harten Ausschluss erst bei belegten wiederholten Störungen entwerfen.

Für die Korrekturen aus A ist keine neue Designentscheidung nötig. Die gewünschte Weltinitiative bleibt innerhalb des vorhandenen Kanons möglich.

**Vor dem Test** sollten die beiden reproduzierten Schutz-/Präsenzfehler und die irreführende Diagnose behoben werden. **Nach neuen Naturbelegen** sind persönliche Kandidatenauswahl, Motivvielfalt und gegebenenfalls stärkerer Szenenschutz die sinnvollen nächsten Entscheidungen. Die 5–8-Nachrichten-Taktung, pauschale Cooldowns, zusätzliche Begegnungsstufen und automatische NPC-Ticks aus einer anderen Spielarchitektur bringen Avereth derzeit keinen belegten Vorteil.

Lebendiger und persönlicher wird die Welt vor allem, wenn ein vorhandener Mensch aus einem passenden Grund wieder auftaucht, seine tatsächliche Geschichte im Kontext steht und die Szene samt Folgen zuverlässig gebucht wird. Dafür muss PULSE keine zusätzliche Autorität bekommen.

## Quellenregister

**Produktcode am oben genannten `.198`-Commit:**

- `src/v4/pulse.js`: `pulseBegin`, `pulseLeg`, `pulsePause`, `pulseClaimPause`, `dynamicReason`, `heldThreats`, `frameOf`, `pulseChance`, `kindOf`, `settle`, `lineFor`, `pulseFinish`, `restCutFacts`.
- `src/v4/commands.js`: `resolveCommands`, Reise-/Aktivitätshandler und DUNGEON-AHEAD-Verknüpfung.
- `src/v4/world.js`: `applyWorld`, `newEntity`, `enterKnown`, `metArrivals`, `anchorRefusal`, `envelopeAllows`, `coerce`, `bookRoadStop`, `person.new`-/`enter`-/`thread`-Fälle und `pulse.outcome`.
- `src/v4/narration_evidence.js`: `presenceInReply`, `metEvidence`, `presentHere`; `src/v4/envelope.js`: `mayOpenFight`, `mayTake`.
- `src/v4/extract.js`: `FORMAT_RULES`; `src/v4/catalog.js`: `knownAt`, `extractorCatalog`; `src/v4/scene_handles.js`: `sceneHandle`.
- `src/context.js`: `buildContext`, `playerActionsBlock`, `outcomeLines`, `interlocutorScores`, `arrivalPeople`, `npcCues`, `npcCard`, `compactNpcCard`, `sharedMoments`, `agreementsWith`, `settledSince`, `retrieveRelevant`.
- `src/knowledge.js`: `sharedBefore`, `isMeaningful`, `memoriesOf`, `setFactEvents`, `npcContinuity`; `src/threads.js`: `threadEvents`, `findThread`, `currentThreads`; `src/engine.js`: `perceiveAll`.
- `src/v4/domain.js::applyDomainEvent`, `src/state.js::applyEvent`: persistierter Zustand; `src/v4/living.js`: `leaderEvents`, `companiesOn`, `companiesHere`, `contextLines`, `wanderSlot`.
- `content/rules.json::pulse`, `content/narrator/Avereth_Narrator_Contract_v4.txt`; gezielt `docs/FOLLOWUP_191_192.md` für bereits erfolgte Korrekturen.
- `tests/v4/batch191_lib.js`, `tests/v4/batch191_fixes.test.js`, `tests/replay/corpus191/{w191,r191}.json.gz`, `tests/v4/fixtures/batch188_rogue_tannery.json.gz` als originale Ausschnitte und Offline-Hilfen. Vorhandene Testdateien wurden gelesen; daraus wird kein hier ausgeführter vollständiger Testlauf abgeleitet.

**Natürliche Quellen und Zuordnung:**

- [Lauf `.188`](../testrun_10b/npc-20261114-161005Z/), insbesondere `REVIEW.md`; verfügbarer Rogue-Chat laut Fixturequelle SHA-256 `f030d34e8ef584b39a15e45703b19e9050d45c26fa0131df3804d00dc1062951`, Ausschnitt `#0–#83`.
- [Lauf `.191`](../testrun_10b/npc-20261115-103140Z/), insbesondere `REVIEW_GPT.md`, `GEGENREVIEW_OPUS.md`, `GEGENBEWERTUNG_GPT_ZU_OPUS.md` als Wegweiser; Originalprüfung über die Produktcorpora. Warrior-Chat laut Corpusquelle SHA-256 `b7ecb114985ab918fc217f435d68cedefdb4dec17326183aec73976160aeaadf`; Rogue `0c91b45c2218dc9f3a2f2da5c1463d0d2cbf2fc2d9542c537da67f0b32bd2d55`.
- Obsidian: ausschließlich die im Auftrag übermittelten Vergleichsmerkmale, keine ergänzten Originalregeln.

**Lieferumfang:** ausschließlich dieser Bericht auf `main`. Produktcode, Content, Replayoriginale, Version und Produktbranch bleiben unverändert. Kein GO für einen persönlichen Spieltest und keine Produktabnahme durch diese Analyse.
