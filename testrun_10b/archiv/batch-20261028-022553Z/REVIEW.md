# Batch 4 – unabhängige Review des natürlichen .104-Guild-Dreierbatches

**Analysiert am 28.10.2026.** Dokumentation und technisches Gegenreview, **kein Produktpatch**. Originalquelle: batch-20261028-022553Z.zip, **35.467.310 Bytes**, **51 ZIP-Einträge**, vollständige CRC-Prüfung ohne Fehler, **SHA-256 01b297d422f8e3ac2a1bea9899e362d5ccc288af60d9ccaf41b1ab61a0443acf**. Die drei Originalverzeichnisse umfassen run.json, evaluation.json, avereth-events.json, calls.json, chat-completions.jsonl, chat.jsonl, player.jsonl, Serverlogs und Screenshots. Alle drei Runs wurden betrachtet. Die Original-ZIP ist **nicht auf GitHub gespeichert**; Rohbelege stehen im Nutzerupload.

**Produkt:** Avereth Engine 4.3.0-c.6.6.104, Commit **b9ffa2c1bfe7**, Branch claude/c-planner-prototype-2026-10-02-gpt-c666, Ruleset 2/V4-C, ST 1.19 und echtes zai-org/GLM-5.3-Flash für Engine/Testspieler. Kein Stub, kein manueller Abbruch, keine Dirty-Änderungen, keine PageErrors, keine gemeldeten ServerErrors oder SecretHits. Batchstatus completed bedeutet, dass der Runner alle drei Profile abschloss, **nicht**, dass deren Spielziele erfüllt waren.

## 1. Ergebnis und Statistiken

| # | Profil | Original-Run-ID | Seed | Inputs | Endlevel | Endgrund |
|---|---|---|---:|---:|---:|---|
| 1 | Guild-Warrior | 20261028-022553Z-current_test | 661497608 | **137** | **7** | **planner_failed** am Verkauf von Wolfspelzen/-fängen |
| 2 | Guild-Mage | 20261028-032318Z-current_test | 661497609 | **46** | **5** | **extractor_failed** bei verschachtelten/ungültigen Gasthaus-Ortsreferenzen |
| 3 | Guild-Rogue | 20261028-034157Z-current_test | 661497610 | **29** | **2** | **defeat**, regelgebuchter Tod gegen vier Quarry-Wölfe |

Gesamt: **212 Spielerinputs, 617 Modellaufrufe (404+131+82), 2.998 Engine-Events (1.927+635+436), 107 delta.rejected (67+25+15)**. Zwei technische Enden, ein Charaktertod, keine 250er-Limitendung, keine Level-15-/E-Rang-Abnahme. **21 gebuchte Encounter**: Warrior 12 Siege, Mage 6 Siege, Rogue 2 Siege und 1 Tod. **Neun completed-Queststatus-IDs**: Warrior 6, Mage 3, Rogue 0. Das sind keine Behauptungen über neun verschiedene Auszahlungsarten oder über abgeschlossene Skillsysteme.

Die Aufzeichnungen enthalten beim Warrior 8 Planner- und 11 Extractor-Reparaturen, beim Mage 1 Planner- und 7 Extractor-Reparaturen, beim Rogue je 2 Planner- und Extractor-Reparaturen sowie eine erfolgreiche Extractor-Empty-Recovery. Die genannten Reparaturzahlen sind Evaluator-Beobachtungen pro Profil; sie dürfen nicht als weitere Modellaufrufe zu den bereits gezählten 617 Calls addiert werden. 107 Rejections sind weder 107 Bugs noch automatisch 107 verlorene wichtige Fakten.

Vergleich: Batch 3 (.102) lieferte 439 Guild-Eingaben (Warrior 250/L10, Mage 102/L5 Plannerfehler, Rogue 87/L2 Tod); Batch 4 (.104) liefert 212 Eingaben und zwei technische Abbrüche. **Kein identischer Seed, keine kontrollierte A/B-Studie und kein Beweis, dass .104 schlechter als .102 ist**. Die neuen Fälle zeigen jedoch konkrete verbleibende strukturelle Fragilität. Beide Batches liefen mit altem Ein-Main-Combat: der auf main geplante Main/Minor-Patch war hier nicht installiert.

## 2. P1 Warrior Input 137 – Verkäuferdialog, kein abgesicherter Gesamthandel

Spielerworte: **“I lay out four grey wolf pelts and nine fangs and accept your price — two copper a pelt, a copper apiece for the fangs.”** Gewollte Stückpreise: vier Felle x 2 cp = **8 cp**, neun Fänge x 1 cp = **9 cp**, zusammen **17 cp**, vorausgesetzt die Ware entspricht den genannten Bedingungen.

**Vorgeschichte/Input 136:** Spieler kehrt zur Glassmere-Gilde zurück; der Wolf-Vertrag wird **tatsächlich für 90 cp** abgegeben. Der Narrator führt einen Materialkäufer ein. Der Käufer sagt: **2 cp je unversehrtem Fell, 1 cp je Fang, 3 cp bei passenden Sets**. Der Extractor schlägt einen **bid** mit **17 cp für 4 Felle + 9 Fänge** vor, aber World lehnt das Delta mit **rule=offer** ab: **“17 cp is no sum the reply names”**. Im Katalog des Folgezuges steht somit **kein autoritativer BID zu 17 cp**. Das ist eine wichtige vorgelagerte Ursache: Die Partie bietet zwar Stückpreise an, aber keine explizite, bedingungslose 17-cp-Gesamtofferte. Ein fester Gesamtbetrag darf bei „wenn unversehrt“ und optionalen Sets nicht einfach zugunsten des Spielers erfunden werden.

**T137/C403 Planner-Erstantwort:** zwei separate sell-Befehle, Fell mit qty 4/min_cp 2 und Fang mit qty 9/min_cp 1; die zweite Quote **“nine fangs and accept your price — a copper apiece for the fangs”** steht nicht wörtlich in der Spielernachricht. Parser lehnt diesen Quote-Teil ausdrücklich ab.

**T137/C404 Repair:** Das LLM setzt für die Fang-Handlung die gesamte wörtliche Spieleräußerung als Quote, belässt **min_cp:1**. Die Validierung durch amountErrors() / coinFromWords() erkennt **2 cp + 1 cp = 3 cp** aus den zwei Stückpreis-Phrasen dieser Quote und weist daraufhin **min_cp 1** als widersprüchlich ab. Die kombinierte Quote enthält aber die Preise **zweier unterschiedlicher Waren**, keine vereinbarte Gesamtzahlung von 3 cp. Das ist eine **Code-Scope-/Evidenzgrenze**, nicht einfach das LLM, das „1“ falsch rechnet. Eine wohlmeinende automatische Umformung von 1 auf 3 wäre ebenfalls falsch.

**Beobachtetes Resultat:** Kein Modelltransport-/Reasoning-only-Fehler (beide Antworten haben finish=stop und gültigen JSON-Text), sondern finaler **planner_failed vor Narrator/Extractor**. **Keine falsche Händlerzahlung oder Warenübertragung im Endturn.** Zuvor abgeschlossene Quests/Kämpfe bleiben im Spielstand. Der Runner beendet jedoch den ganzen Test.

**Korrekturziel:** Nicht automatisch 17 cp buchen, solange Angebot/Authentifizierung ungesichert ist. Ein eindeutiges Teilangebot für Felle und Fänge kann nur gegen getrennte nachgewiesene Preise/Qualität gebucht werden. Bei widersprüchlichen oder unvollständig belegten Angeboten **spielbare Rückfrage und sichere Nichtbuchung** statt fatalem Planerrun. Negative Tests: Stückpreise zweier Waren in einer Quote, eine ganze Lot-Summe, Mengen-/Qualitätsklauseln, konkurrierende Setpreise, unvollständige Quotes, Spieler nennt nur Gesamtsumme, direkte Offeracceptance mit authentischem Bid. Dies ist ein starker P1-Kandidat für Fail-soft-Planner, nicht für das Aufweichen der Zahlungs-Engine.

## 3. P1 Mage Input 46 – ungültige Ortsreferenzen **und** bereits vorher unerlaubte Szenenreise

Der Abbruch lässt sich **nicht** auf eine belanglose NPC-Duplikation reduzieren.

**Input 45:** Der Spieler will ein Nachtlager und Schlaf, dann am nächsten Morgen aufbrechen. Der Planner bucht **buy lodging pending** (Preis noch unbekannt), verweigert **sleep** wegen **room not booked** und setzt ein späteres Reise-Ziel. Der Kanon-Ort bleibt **loc.glassmere.guild_hall**. Der Narrator lässt Alaric dagegen ohne ausdrückliche GO-Autorisierung in das neue Gasthaus **Sleepy Ewe** laufen. Der Extractor meldet dort arrive, innkeeper, Angebot und Fakten. **World verwirft arrive mit no_go**, Folge-Deltas mit scene_context; nur **10 Minuten** Zeitfortschritt und einige nicht kritische buchhalterische Elemente werden übernommen. Das Hotel ist damit **kein autorisierter neuer Aufenthaltsort**, der angebotene Preis nicht als kanonisches Angebot eines lokalen Händlers vorhanden.

**Input 46:** Spieler sagt **“I take the six-copper bed with supper and breakfast, and sleep until morning.”** Planner setzt buy bis **max_cp 6** als **conditional/pending**, weil am kanonischen Guild-Hall-Ort weiterhin kein verbindliches Zimmerangebot vorliegt. Der davon abhängige Schlaf wird **refused: room not booked**. Es werden weder 6 cp abgezogen noch das Zimmer bzw. Schlaf autoritativ gebucht. Der Narrator erzählt dennoch, die Wirtin habe die Münzen genommen und Alaric ins obere Zimmer geführt.

**Extractor C130:** Liefert als globales scene ein **verschachteltes new-Place-Objekt**, außerdem eine andere Gasthausbezeichnung **“inn by the Guild hall”** statt der zuvor erzählten Sleepy Ewe, person.new, offer, fact sowie arrive im Oberzimmer. Schon das Format der neuen Ortsreferenzen ist nicht vom geschlossenen Schema gedeckt.

**Extractor C131 Repair:** Ändert scene zu **{new: “shared room above the inn”}** und verschiedene scene-Felder zu **{new: “inn by the Guild hall”}**. Diese sind ebenfalls keine erlaubten/autoritativen Szenenreferenzen im konkreten Schema. Auszug der Validierung: **“$.scene: matches none of anyOf; $.deltas[1] (person.new): .scene: matches none of anyOf; $.deltas[2] (offer): .scene: matches none of anyOf; $.deltas[3] (fact): ...”**. Zwei inhaltlich ausgefüllte, formal ungültige GLM-Antworten, **kein Providerfehler**. Ergebnis **extract.failed**, **keine** World-Deltas aus Input 46, Runner stoppt.

**Bewertung für Fail-soft:** Ja, ein einzelner falsch geformter *unabhängiger* Ambient-NPC-Eintrag sollte nicht den gesamten Report zerstören. **Dieser konkrete Fall ist aber zusätzlich ein anhaltender Konflikt zwischen der kanonischen Location und zwei erzählten, nicht autorisierten Reisen.** Ein allgemeines „nimm die übrigen Deltas trotzdem“ würde den nicht gekauften Raum, nicht erfolgte Zahlung und nicht erfolgten Schlaf legitimieren. Sicher wäre:
1. Das abgelehnte Travel-Root und seine abhängigen lokalen person/offer/fact-Deltas **zusammen** nicht buchen.
2. Unabhängige, valide Zeit-/Ambient-Deltas nur gemäß bestehenden Grenzen erhalten.
3. Den kanonischen Standort und die Tatsache **NOT BOUGHT / NOT SLEPT** als Fortsetzungshinweis ausgeben, ohne den Spieler für eine unverschuldete Modellabweichung zu einem technischen Runstop zu zwingen.
4. Gegebenenfalls Spielerentscheidung oder konkrete GO/Angebotseinholung verlangen, statt Zahlungs- und Schlafautorität zu erfinden.

Die **Vorgeschichte T45** ist ein ebenso wichtiger Integrationsfall wie der finale JSON-Schemafehler T46. Ein Patch nur für die Zulässigkeit von {new: ...} wäre zu eng und potentiell unsicher.

## 4. Rogue Input 29 – echter Tod, **vier Level-6/7-Wölfe** gegen Level 2

Drei Encounter: **zwei Siege, ein Tod**. Rogue gewinnt zuvor gegen einen L6-Einzelwolf und einen weiteren Gegner, nimmt eine Guild-Jagd **“Thin the Quarry Ridge Wolves”** an (5 echte Wolf-Kills erforderlich), ruht sich nach erfolgreicher 6-cp-Zimmer-/Supperbuchung in Input 20 auf **100 HP** aus. Keine nachgewiesenen Verkäufe, neuen Ausrüstungen oder Skill-Upgrades.

Der finale Encounter ist **enc.t26**, vier bereits in der Szene vertretene Quarry-Wölfe **drei L6 und einer L7**, einzeln mit rund 46/46/46/51 HP, ATK 19/19/19/21; Rogue L2, 100 Max-HP, DEF 4. Vor dem finalen Kampf hat er **71 HP**, nach Input 28 nur noch **11 HP**. Er wählt als nächste Handlung einen Basic Attack auf den verwundeten Wolf C, tötet ihn, danach tötet ein anderer Wolf den PC; Engine-Events **entity.status pc dead, encounter.ended pc_dead:true, xp_awarded:0**. Der Tod ist mechanisch, nicht eine frei erzählte Halluzination und **kein Anlass für einen Fail-soft-Todesrückgängigkeitsmechanismus**.

**Offene Balance-/Taktikfrage:** Mehrere L6/7-Gegner gegen einen L2-Charakter sind außergewöhnlich schwer. Die bloße Guild-Quest erklärt weder einen sicheren Sieg noch die konkrete Gruppengröße. Der Run enthält warnende sichtbare Vierergegnersituation, und der Spieler entscheidet sich nach 11 HP zum weiteren Angriff. Es ist kein nachweislich ausgeführtes, aber verlorenes Flee dokumentiert. Vor Schadensänderungen die tatsächliche Kampföffnung, Warnungen und Flee-Option prüfen. Geplanter Main/Minor-Patch war **noch nicht implementiert**; keine falsche Rückrechnung einer hypothetischen Evasive-Step-Nebenaktion.

**Positiv:** Rogue Input 26 enthält eine **tatsächlich angewandte Empty-Extractor-Recovery** nach einer Length-Antwort; das ist ein separater Live-Nachweis, kein Gegenargument für die Fehlertoleranzstrategie.

## 5. Scaling- und Wirtschaftsaussagen – begrenzt

| Kennzahl | Warrior | Mage | Rogue |
|---|---:|---:|---:|
| Inputs / Level | **137 / 7** | **46 / 5** | **29 / 2** |
| Siege / Encounter | **12 / 12** | **6 / 6** | **2 / 3**, Tod |
| Abgeschlossene Guildverträge | **6** | **3** | **0** |
| Dokumentierte echte Verkäufe | **0** | **1** | **0** |
| Equipmentchanges | **0** | **0** | **0** |
| Skillchanges | **3** | **0** | **0** |

Warrior bei Input 100 **L5, 179 cp, Starterwaffe und Starterrüstung**, Heavy Slash und Basic Attack bereits P2, Guard P1. Bei Input 137 L7; der geplante nächste Lootverkauf wird nicht gebucht. Mage bei Input 46 L5, zuletzt **202 cp** und Starterstaff/-robes; die frühere **17-cp-Veräußerung** von Chitinplatten und Fängen ist eindeutig Engine-gebucht (T44 mit offer.accept, transaction.completed und object.moved). Der gescheiterte Zimmerkauf ist **kein Gegenbeleg** gegen alle Kauf-/Verkaufsfunktionen. Rogue L2 stirbt früh, Gear wird in diesem Run nicht sinnvoll evaluiert.

**Kein neuer pauschaler XP-, Startwerte- oder Gegnernerf aufgrund dieser drei Enden.** Über Gear-Kaufverhalten sagt dieser kurze Batch weniger als frühere Langläufe. Die Doppel-Guild-Clear-Prüfung aus .104 ist durch diese natürlichen Quests nicht systematisch abgenommen; keine Duplikatverletzung allein aus den Quest-Statussummen behaupten.

## 6. Bedeutung für die unmittelbar zuvor diskutierte „Fail-soft World & Recovery“-Strategie

**Dieser Batch liefert zwei verschiedene Rotfälle und einen wichtigen Gegenfall:**

- **Planner-Fall (Warrior):** sichere, nicht ausgeführte Handelsaktion; Fehler stammt aus Quote-Scope/Stückpreis und vorher fehlendem autoritativen Gesamtoffer. **Sicherer Fallback:** spielbare CLARIFY/NOT SOLD, neue Präzisierung im nächsten echten Spielerinput. Weder Geld noch Ware heimlich verändern. Die Kampagne ist fortsetzbar, obwohl genau dieser Handel nicht erfolgreich war.
- **Extractor-/Szenenfall (Mage):** Einzel-Schemafehler plus **abhängige erfundene Reise, Angebot, Zahlung und Schlaf**. Sicherer Fallback: Autorität des Guild-Hall-Standorts erhalten, falsche Orts-/NPC-/Offer-Deltas verwerfen, neue Narration an den wahren Standort binden; **nicht** einfach „alles außer dem falschen Personeneintrag“ buchen.
- **Mechanischer Gegenfall (Rogue):** echter PC-Tod ist **kein zu weichender Extractorfehler**. Kein automatisches Respawn, kein Ignorieren von HP=0 oder Encounter-Events.

### Enger technischer Ansatz, ohne neuen Engine-Unterbau

1. **Fehlertypen unterscheiden:** Parser-Syntax/Schema, mechanische Autorität/Ownership, Abhängigkeit von abgelehnter Reise, Providertransport, echte Engine-Ausnahme. Nur bei den ersten/sicheren Klassen Story-Fortsetzung zulassen; bei mechanischer Ungewissheit keine neue Zustandsbuchung.
2. **Safe Planner-fallback:** Keine Kommandos aus gescheitertem JSON ausführen. Bei nur eindeutig unverbindlichem Gesprächstext darf Narrator fortsetzen; bei Verkauf/Kauf/Kampf/Questentscheidung eine Panel-Rückfrage oder die klare Statuszeile „NOT TAKEN; decide again“. Das Spiel muss beim nächsten Input weitergehen können, ohne eine alte Handlung noch einmal unbemerkt auszuführen. Guard-/Quote-Prüfungen weiter anwenden.
3. **Extractor-Abhängigkeitsgruppen:** Zunächst den Bericht in einzeln validierbare Deltas mit expliziter oder daraus belastbar abgeleiteter Abhängigkeit strukturieren; **neue Ankunft + dortige NPCs/Angebote/Fakten** sind als Cluster zu behandeln. Gültige unabhängige Informationen dürfen übernommen werden. Bei vollständig ungültigem Bericht als failed_world_continue protokollieren statt „erfolgreich“ auszugeben. Eine neutrale Leererfassung ist **keine** nachträgliche Erfüllung erwarteter Reisen/Käufe.
4. **Atomare Deltaanwendung:** Kein blindes try/catch **um emit/applyEvent**, weil ownership/effectViolation nach einer Mutation werfen kann. Bisheriges clone+emit schützt nur den äußeren Aufruf, nicht einen inkonsistenten **innerhalb derselben** Work-Schleife weiterverwendeten Stagingzustand. Bei Catch pro Delta auf einer **eigenen Kopie** plus unverbrauchten RNG/Events arbeiten oder für einen echten Invariant-/Reducerfehler das ganze Apply abbrechen; nichts halb übernehmen.
5. **NPC-Lockerung nach Wichtigkeit:** Unnötige Nebenfiguren dürfen reine Prosa bleiben; persistente Händler, Questgeber, Gegner, Begleiter, Gegenparteien und wichtige Wiederbegegnungen bleiben eindeutig und ortsgebunden. Ein als Käufer in einer Transaktion benötigter NPC ist **kein Ambientfall**, selbst ohne Namen.
6. **Runner-Semantik nicht kaschieren:** getrennt zählen **technical_stop**, **soft_continued**, **lost_player_action**, **missing_expected_world**, **mechanical_integrity_breach**. Einen 250-Input-Run mit fünf sicheren Fehlerfortsetzungen nicht als fehlerfrei bewerten. Bei falschen Coins/HP/Queststatus weiter strikt stoppen. Natürliche Tode gehören zu spielerischen Enden, nicht zur Fehlertoleranzstatistik.

**Architektur- und Produktkonflikt:** Eine Reparatur kann den Status der Story nicht automatisch ändern. Solange der Erzähler frei über nicht gebuchte Reisen und Zahlungen verfügt, braucht der nächste Narrator eine kurze, priorisierte **kanonische Korrektur**, sonst setzt er dieselbe Phantomhandlung fort. Diese Feedbackschleife ist wahrscheinlich wichtiger als noch ein zusätzlicher LLM-Retry.

## 7. Priorisierung und Abnahmevorschlag

1. **P1 Safe Planner-Fortsetzung mit Original-Warrior T136–137**: Original-Bid-Rejection und C403/C404 bewahren; erlaubte Stück-/Lotpreise getrennt testen. Bei nicht auflösbarer Preis-/Zitat-Unsicherheit *keine Buchung, kein technischer Runabbruch*, sondern klare nächste Entscheidung.
2. **P1/P2 Extractor-Szenencluster mit Original-Mage T45–46**: no_go und fehlende Raum-Zahlung bleiben verboten; nur unabhängige erlaubte Deltas übernehmen; Status korrekt dem nächsten Narrator voranstellen. Zusätzlich simpler anderer Test: gültiges GO + irrelevantes ungültiges person.new → GO bleibt erhalten.
3. **P2 Runner-Transparenz**: „sicher fortgesetzt“ getrennt von „vollständig erfasst“. Erst Testfixtures und Gegenproben, dann längerer natürlicher GLM-Lauf.
4. **P2 Combat-Fairness-Audit Rogue L2 vs vier L6/7-Wölfe**, ohne Klassenwerte vorab zu erhöhen.
5. **Combat Main/Minor** bleibt unabhängiger Fachpatch, der diese Batchstatistik nicht rückwirkend ändert; spätere kombinierte Tests müssen beides beachten.

**Regressionsgrenzen:** Vorher Rot auf unverändertem .104 für die beiden technischen Originalketten; nach Fix Grün für safe continuation, Fold/Reload/Swipe deterministisch, keine doppelte Zahlung, keine Phantom-Ortswechsel, niemals neues XP aus fraglichem Narrator. Vorher/nachher echte Token-/Fehlerstatistiken und Node-Vollsuite. Keine Änderung der natürlichen Testspielerstrategie zum künstlichen Umgehen von Fehlersituationen.

## 8. Archiv

Diese Datei ist die unabhängige Originalreview für Batch 4. [README.md](README.md) listet die drei Runs und die Quellenhashes. Das **35,5-MB-ZIP** bleibt als unverändertes Nutzer-Upload-Original außerhalb von GitHub; die vorliegenden Markdown-Dateien sind **kein Binärroharchiv**. Kein Produktcode, kein Test, kein Runnerprompt oder Balancewert wurde für dieses Review geändert.
