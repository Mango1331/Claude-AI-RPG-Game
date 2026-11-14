# Unabhängiger GPT-Gegenreview – natürlicher Dreierbatch auf .186 (14.11.2026)

**Quellen:** vom Nutzer bereitgestelltes `npc-batch-20261114-094810Z.zip` (42.840.256 Byte, SHA-256 im [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md)); vollständige Original-Chats und Engine-Events, `npc-pulse.json`/`.md`, `evaluation.json`, `run.json`, einschlägige echte Modellrequests und der Spielersätze. **Fixierter Produktstand:** `4.3.0-c.6.6.186`, Git `13824919a850`; drei freie LLM-Spieler GLM-5.3-Flash, Seeds 7/8/9. Vergleich: [natürlicher `.183`-Batch](../npc-20261113-135417Z/REVIEW.md), [Payment-Diagnose](../../recherche/PAYMENT_TIEFENANALYSE_183.md), [`.186`-Produktdiff-Gegenreview](../../patch_plans_10b/REVIEW_PAID_HERE_MONSTER_A2_186_PRODUKTDIFF_GPT.md).

**Methodik:** Original ZIP tatsächlich geöffnet, `batch.json`, alle drei `run.json`, `evaluation.json`, `npc-pulse.json`, `chat.jsonl` und `avereth-events.json` ausgewertet; konkrete kritische Spiel- und Modellantworten samt `cmd.interpreted`, `transaction.completed`, `coin.changed`, `service.granted`, `quest.status`, `entity.updated` und Spielerpanel manuell abgeglichen. 362/362 Eventgruppen mit den in `chat.jsonl` gespeicherten Eventarrays **strukturell identisch**. Die Modellrequest-Originale wurden punktuell aus `chat-completions.jsonl` geprüft (insbesondere `PAID HERE`, `armed`, Repair). **Nicht selbst ausgeführt:** Node-Suite, vollständiger Engine-Fold/Replay, neuer Browser-/ST-Smoke oder weitere Modelle. Runner meldet Fold- und Zustandsvalidierung ohne Fehler; das ist ein **Runnerbeleg**, kein unabhängig nachgespielter Fold.

## 1. Kurzurteil

**Starker technischer Fortschritt und erstmals natürliche A2-Abdeckung, aber kein unbedingtes GO für die Finanzintegrität.** Alle drei Läufe erreichen das 70-Input-Limit, im Gegensatz zu `.183` Rogue (43, `repeated_model_failure`) und Mage (39, regulärer Tod). Rogue hat hier 0 unreparierte Planner-/World-Ausfälle und kein Laufabbruch; Mage bleibt trotz dreier isolierter Planner-Nichtausführungen fortsetzbar. **Ein P1-Integritätsfehler wurde jedoch neu nachgewiesen: der Rogue akzeptiert 14 cp Belohnung, die Engine bucht stattdessen −14 cp als Kauf, der Erzähler übernimmt die Umdeutung und verweigert später die wirkliche Auszahlung.** Dieser Fehler ist eine real eingetretene Buchung, nicht nur eine denkbare Doppelzahlung wie in `.183`.

**Zweiter, kleinerer Zahlungsbefund:** Mage kann eine Unterkunft nur über eine freie `#pay`-Karte bezahlen, nicht als gebuchte Lodging-Leistung. Die Karte wird tatsächlich angezeigt und korrekt ausgeführt – **positiv für das UI**, aber der Hostel-/Servicekontext bleibt offen. Kein Beweis, dass `#pay` selbst falsch abbucht. **NPC E3:** drei neue Persönlichkeitsanker über 210 Inputs versus neun über 152 Inputs im vorigen Batch; natürliche Häufigkeit ist nicht konstant und daraus allein keine Regression beweisbar. **PULSE:** offene Fenster und Dungeonwürfe weiter nachgewiesen, kaum tatsächliche Rastunterbrechungsabdeckung.

## 2. Metadaten und technische Stabilität

| | Warrior `npc-sociable` | Rogue `npc-wary` | Mage `npc-inquisitive` |
|---|---:|---:|---:|
| Seed | 7 | 8 | 9 |
| Inputs / Ende | **70 / done** | **70 / done** | **70 / done** |
| Ausgang | 1 Gildenauftrag abgeschlossen, Mossback-Warrens betreten | 1 Gildenauftrag abgeschlossen, Grotto später erkundet | 1 Gildenauftrag abgeschlossen, zweiter Dungeonauftrag aktiv, beim Limit nicht als absolviert verbucht |
| Gespeicherte Eventgruppen | 113 | 123 | 126 |
| Engineevents | 873 | 1.059 | 1.059 |
| Planner-Nichtausführungen | 2 | **0** | 3 |
| World-Extractor-Nichtausführungen | 2 | **0** | **0** |
| PageErrors / ServerErrors | 0 / 0 | 0 / 0 | 0 / 0 |
| FoldErrors / Evaluator-`problems` | 0 / 0 | 0 / 0 | 0 / 0 |

**Gesamt:** 210 Spielerinputs, 423 Chatnachrichten inklusive drei Begrüßungen, **362 Eventgruppen / 2.991 Events**; 362/362 Exporte gegen Chat-Recordevents übereinstimmend. Das Run-Ende `done` bedeutet Erreichen des geplanten Inputlimits bzw. der Runnerpflichtetappen, **keinen** vollständigen Dungeonabschluss und keine allgemeine NPC-/PULSE-Spielqualitätsfreigabe. In `.183` waren nur 152 Inputs beendet (70/43/39), wobei Mage durch gebuchten Tod und Rogue durch drei defekte Extractorantworten stoppte.

**Modellausfälle nicht unterschlagen:** Warrior hat zwei Planner- und zwei World-Extractor-Nichtausführungen, Mage drei Planner-Nichtausführungen; der Rogue-Lauf dagegen keinen dieser terminalen Einzelzugfehler. Der Runner hat diverse reparierte Antworten und einzelne Failsoft-Fortsetzungen. `0` Foldprobleme bedeutet **nicht** `0` Modellprobleme. Einzig die große frühere Rogue-T41–T43-Abbruchserie tritt hier nicht mehr auf; aus nur einem neuen Rogue-Lauf folgt keine absolute Reparaturgarantie.

## 3. P1 – Rogue akzeptiert eine Belohnung und verliert 14 Kupfer

**Primärbelege im originalen Rogue-`chat.jsonl`, Chatindizes 115–130 (Spielerinput I58–I65; Enginezug 49–50 und Folgezüge):**

1. **Vorlage, Chatindex 116:** Die Dorfbewohner sammeln Geld; der Küfer hält es hin und nennt **„Fourteen coppers“** für das Beseitigen der Gänseplage. Das ist nach Szene und Kontext **Geld für Alaric**. Der Extractor macht daraus fälschlich eine gewöhnliche **`offer` mit `seller=npc.npccooper`**, `kind=service`, `price_cp=14`, `service=other`, `what=` „kill the gander …“. Es ist **kein `bid` und keine private Quest-/Belohnungszusage**.
2. **Spielerinput I59, Chatindex 117:** `I accept the fourteen coppers, fetch the barrow ...`. Der Planner liefert `offer.accept(offer.t116.6)`, die Engine bucht `transaction.completed(cp=14,seller=npc.npccooper)` und **`coin.changed delta=-14, value=26`**. Zuvor hatte Alaric 40 cp. `service.granted` hält „kill the gander“ als vom Küfer gekaufte Leistung. Der Spieler stimmt dem Erhalt von Münzen zu, nicht dieser Auszahlung.
3. **Antwort I59, Index 118:** Der Erzähler schreibt sogar, die Münzen seien „the other way than expected“ geflossen, und erfindet daraufhin eine Begründung, warum Alaric 14 cp für die Vogelreste bezahle. Das sichtbare Panel meldet `PURCHASE COMPLETE · -14 copper`. Die Erzählung folgt also dem falschen Systementscheid, statt ihn zu reparieren.
4. **I65, Indizes 129–130:** Alaric hält für die versprochenen 14 cp die Hand auf, der Küfer übergibt sie in der Erzählung. Der Extractor meldet `coin.gift cp=14`; **Firewall lehnt mit `engine_booked` ab** („proceeds or change of a trade come only through the trade itself“). Keine `coin.changed +14`-Buchung. Das ursprüngliche Minus wird nie aufgehoben.

**Einstufung P1:** **Tatsächlich verlorenes Geld durch falsche Transaktionsrichtung**, nicht bloß ein Modelltext oder eine ungeschickte Wahl des LLM-Spielers. Das Modell hat ein natürliches Angebot falsch klassifiziert, der Planner nutzte es, aber **die autoritative Engine hat ohne gegenläufige Einwilligung die falsche Geldrichtung festgelegt**. Keine pauschale Freigabe von Geld aus Erzählprosa; die Sperre gegen nacherzählte Handelszahlungen ist grundsätzlich berechtigt, wirkt hier aber auf einen zuvor fehlgebuchten Kauf.

**Engster Folgeauftrag:** Den Originalweg reproduzieren, die **Auszahlungsrichtung bei `offer.accept` für NPC-Belohnung/PC-Dienstleistungen** am eigentlichen Autoritätsrand prüfen. Wenn ein gewöhnliches Verkäuferangebot die andere Seite bezahlen würde, **nicht abbuchen, sondern Rückfrage/geeignete nicht-kommerzielle Zusage**; eine echte Dienstleistung, die Alaric vom Händler kauft, muss weiter bezahlbar bleiben. `bid` (Verkauf eigener Sachen), echte `offer.accept`-Käufe, registrierte Gebühren, Gildenauszahlungen und `#pay` unverändert. Nicht aus Prosa direkt +14 buchen; erst eine autorisierte passende Route schaffen. **Vor dem nächsten großen Batch Pflicht**, aber keine neue Gesamtarchitektur.

## 4. P2 – Mage bezahlt die Unterkunft per `#pay`, ohne sie zu buchen

**Original Mage Chatindizes 87–105, Inputs etwa I44–I53:**

- Der Bauer nennt eine **2-cp-Unterkunft** („pallet by the hearth for the night with porridge at dawn“); der Extractor erstellt `offer.t88.6` als `service=lodging`, allerdings **`terms=conditional`** wegen der nur auf das spätere Frühstück bezogenen Bedingung. Keine direkte annehmbare, bindende Unterkunft.
- Nach mehreren natürlich formulierten Versuchen führen Planner-Reparatur, zeitweise Abwesenheit des Bauern, Ortswechsel vom Hof zum Inneren und Zweck-/Geldverarbeitung zu einer **freien Zahlungskarte** `dec.pay.t47.1`. Bei Chatindex 102 steht der vollständige kopierbare Befehl erstmals **tatsächlich im Spielerpanel**.
- **Spielerinput I52, Index 103:** `#pay dec.pay.t47.1` wird vom nativen Pfad erfolgreich ausgeführt: `coin.changed -2`, `transaction.completed native=true`. **Kein `service.granted lodging`**, keine Annahme der ursprünglichen Lodging-Offerte. Der Spieler schläft im Ablauf dennoch auf der Pritsche; nach dem Kauf/Schlaf in getrennten Inputs greift die frühere `roomSteps`-Abhängigkeit nicht mehr.
- **I53, Index 105:** ein neues, separat bepreistes Honig-Porridge wird ordentlich für 1 cp angenommen und gebucht. Das ist **nicht** derselbe 2-cp-Unterkunftspreis und kein nachgewiesener doppelter Einzug derselben Position.

**Bewertung P2:** **Z1.1 ist natürlich erfolgreich** (sichtbares `#pay` wird benutzt). Aber eine **gekaufte Unterkunft als freie Geldzahlung** bleibt semantisch unbelegt und steht später nicht als `PAID HERE` zur Verfügung. Ursache wahrscheinlich Kombination aus `terms=conditional`, tatsächlichem Ortswechsel/Angebotsscope und Kaufzweckabgleich; **nicht** allein der fehlende Begriff `pallet`. Im Unterschied zu Rogue P1 ist die abgegangene Zahlung vom Spieler ausdrücklich via `#pay` bestätigt, also **keine belegte unautorisierte Geldbuchung**. Eine weitere breite `payArgument`-Wortliste ist nicht empfohlen. Erst den konkreten Service-/Offer-Pfad testen; bei fehlender eindeutiger Dienstleistung Kauf als offen halten und die UX klar machen.

**Positiv:** Im Rogue-Lauf wurde eine reguläre Unterkunft **mit warmem Abendessen** als 3-cp-Kauf gebucht (`service.granted` zweimal, `lodging` und `meal`); später ein Loft für 1 cp. Der nächste Narrator-Request zeigt zum Zimmer sogar eine korrekte `PAID HERE`-Zeile (Zimmeranteil 2 cp; Gesamtgeschäft 3 cp). Das ist ein natürlicher positiver Gegenfall. Warrior hat keine gebuchte Unterkunft in diesem Batch.

## 5. Monster A2, A1 und Kampf – erstmals natürlicher Teilnachweis

**Warrior I32–I42, Mossback Warrens:** Im Narratorbericht werden zwei Goblin-Lookouts eingeführt. Engine erzeugt zwei echte Kreaturen und materialisiert je ein `profile.gear`, deterministisch **`Crude spear`** (Lookout A) und **`Crude knife`** (Lookout B), jeweils `source=default`. Im aktiven Kampf nennt das System dieselben Waffen im Angriff, inklusive der unveränderten Ankerwerte; beide Gegner werden regelgebucht besiegt.

**Am Kampfende (Antwort I42, Chatindex 84)** stammen die beiden Beutezeilen aus denselben Profilwaffen: `Crude Goblin Lookout Spear — broken, nothing worth taking` und `Crude Goblin Lookout Knife — broken, nothing worth taking`; kein Waffenobjekt wird für diese Fehlschläge erzeugt. Daneben werden 1 cp Loot und XP gebucht. Das ist ein **echter natürlich beobachteter Verwertbarkeits-Fehlschlag bei zwei Waffen**, kein Verlust eines bereits gebuchten Gegenstands.

**Warrior I56, Chatindex 112:** Die Erzählung zeigt drei Goblins **alle** mit Speeren. Der Extraktor meldet `armed=spear` für die Gruppenmeldung; alle drei individuell erzeugten Kreaturen bekommen `profile.gear.weapon.name=Spear`, `source=stated`. Das entspricht K3: nur eine für alle belegte Gruppenwaffe wird übernommen. Die drei werden bis zum betrachteten Punkt nicht als erfolgreich besiegte/gelootete A2-Gegner getestet.

**Abnahmegrenze:** 5 bewaffnete Goblins tatsächlich im Eventlog; zwei kämpften und wurden besiegt, ihre Waffen waren beide nicht verwertbar. **Kein natürlich erfolgreich geerntetes humanoides Waffenobjekt**, keine umfangreiche A2-Statistik und keine Freigabe der 6:3:1-Verteilung. Die Zuweisung und Kampftexte erfüllen die technisch vereinbarten Verträge in diesem Teil. A1-Spezialbeute wird aus den Jagden nicht als umfassende neue Materialabnahme abgeleitet.

## 6. NPC E2/E3 – Zahlen, Qualität und echte Grenzen

| | Warrior | Rogue | Mage | Gesamt |
|---|---:|---:|---:|---:|
| Neue unterschiedliche Personen (Runnerzählung) | 7 | 17 | 8 | **32** |
| Wiederbegegnungen | 2 | 5 | 3 | **10** |
| Persönliche Threads | 1 | 3 | 1 | **5** |
| Neue E3-Anker | 2 | 0 | 1 | **3** |

In `.183` waren es 9 Anker in 152 Eingaben; das ist **keine kontrollierte Rate**, da Kontakte, Wiederbesuche und konkrete Modellwörter anders sind. In `.186` nachverfolgbar:

- **Warrior T19:** Guild clerk, `manner` = „prices hides by touch, dry small smile, plain about Guild buying low“; in Folgekarte vollständig ausgeliefert. Eine passende Handelsszene folgt, aber reine Textpräsenz beweist keine dauerhafte Charakterbindung.
- **Warrior T55:** Ledger keeper, `voice` = „dry, practical; writes names and counts in his ledger, blows on the ink“; die unmittelbare Folgekarte trägt den Anker **nicht**. Zudem enthält `voice` hier Handlungs-/Berufsangaben statt nur Sprechweise. Das entspricht der schon in `.183` erkannten **E3-Qualitätsabgrenzung**, aber belegt keine neue kaputte Speicherfunktion.
- **Mage T53:** Bauer, `manner` = „slow, wry, plain-spoken; talks around a mouthful“; Folgekarte vollständig; Narrator benutzt den trockenen, nachdenklichen Ton plausibel.
- **Rogue:** Fünf Wiederbegegnungen, drei Threads, **kein E3-Anker**. Das ist für die Wirkungsmessung relevant, aber kein Beweis, dass der Validator einen berechtigten Anker verworfen hat (keine `anchor`-Refusals).

**Schalter-/Zeugenbindung:** Die Runner-Auswertung zählt bei den neun geprüften Guild-Desk-Beobachtungen **0 positive `handled_by`-Bestätigungen** (drei je Lauf; mehrere explizite `desk_handler`-Ablehnungen). Verträge wurden dennoch jeweils formal angenommen und einer erledigt. Wie schon in `.183` müssen **wirklich fehlende persönliche Zeugenbelege** von zu strengem Evaluator und bereits im Spielerzug gebuchter Bearbeitung getrennt werden. Bitte **keine pauschale Freigabe von `met`, `enter` oder Desk-Handlern** aus der Nullquote.

**Ein Runner-`violation`-Hinweis ist wahrscheinlich kein Integritätsfehler:** Warrior T23, `agreement_pc_without_presence` (`thread.t20.1`, Corvens Folgeangebot). In der **Ereignisfolge** des Originalreports Index 46 entsteht `thread.set` mit `npc.corven` und `pc` **vor** `scene.left(npc.corven)` im selben Bericht. Der Evaluator betrachtet offenbar die Präsenz nach der Antwort, nicht zwingend zum Zeitpunkt der Vereinbarung. Ohne anderen Gegenbeleg **nur Evaluator-/Reihenfolgefrage**, nicht als ungültigen Thread oder Anlass für Lockerung einstufen.

## 7. PULSE: lebendiger, aber ungleichmäßig

| | Warrior | Rogue | Mage | Gesamt |
|---|---:|---:|---:|---:|
| PULSE-Würfe | 21 | 36 | 36 | **93** |
| Offene Fenster | 3 | 8 | 10 | **21** |
| Im Runner als „offen, nicht sichtbar genutzt“ markiert | 1 | 2 | 3 | **6 (Heuristik)** |

Zum Vergleich `.183`: 89 Würfe, 20 offene Fenster bei 152 Inputs. Die Zahlen allein zeigen weder zunehmendes noch abnehmendes gutes Pacing: unterschiedliche Bewegung/Exposition und 210 statt 152 Inputs. Es gibt Begegnungen/Spuren und im Warrior/Rogue auch Dungeonwürfe (je 3), jedoch **keinen natürlich ausgelösten Dungeonwanderer** und keine tatsächliche Rastunterbrechung. Nur Rogue enthält einen `pause/inside`-Wurf, der geschlossen blieb.

Die 6 `open_window_not_narrated` sind **Runner-Heuristiken** (über die Sichtbarkeit/Nutzung einer Weltchance), kein Beweis für ungebuchte Kämpfe oder unzulässige Orte. Auch Meldungen `new_world_content_in_closed_window` können aus **eigenen Spielerhandlungen** (Besuch eines Händlers, Ankunft, aktiver Suchakt) stammen und sind nicht automatisch PULSE-Fehler. Kein neues PULSE-D-/Frequenzpatch aus diesen Summen.

## 8. Priorisierte Anschlussarbeit

1. **P1 Geldrichtung aus Rogue I59:** präzise Ursache am tatsächlichen `offer`/Planner/Autoritätsweg reproduzieren und dann einen **engen Schutz** für eingehende Belohnung vs. ausgehenden Kauf umsetzen. Gegenfälle für regulären Handel, Gildengebühren, Geschenke, private Jobzusage und `#pay`; Rot-/Grün plus vollständige Tests/Replay bei Änderung der Buchungsautorität. Kein automatischer 14-cp-Retro-Payout.
2. **P2 Unterkunft Mage I44–I52:** unabhängig und begrenzt erklären, warum `lodging` als `conditional` Offer den Scope verliert, `pay` zum freien `#pay` wird und Schlaf trotzdem abläuft. Positivfall Rogue 3-cp-Inn plus 1-cp-Loft schützen; nicht als Teil der P1-Fixregel blind mitändern. Ein gezielter Folgereview reicht vor einer Entscheidung, ob überhaupt ein zusätzlicher Fix nötig ist.
3. **NPC E3/Desk qualitative Nachprüfung** anhand 3 Anker und echten Rückkehrprompts statt sofortiger Erweiterung des Anchorsystems. Wenn `handled_by` trotz nachgewiesener realer Person unnötig scheitert, eng korrigieren; sonst den Evaluator berichtigen. **PULSE und Monsterwerte zunächst unverändert.**
4. Nach dem nötigen P1-Fix erneut **gezielte** natürliche Finanz-/Diensteprobe statt sofort ein weiterer großer Dreierbatch. Persönlicher User-Testrun für Spielgefühl und stärker variierte NPC-Rückkehr bleibt wertvoller als eine weitere automatisierte Serie ohne neuen Erkenntniszweck.

**Befundcharakter:** unabhängiger Quellenreview, keine Codeänderung oder Freigabe eines neuen Features. Es wurden keine Originaldateien umgeschrieben und keine große ZIP in Git abgelegt.
