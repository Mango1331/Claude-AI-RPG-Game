# Batch27 – unabhängiger Originalreview (.153)

**03.11.2026 · Sol · ausschließlich Analyse.** Produkt und Originalbatch: `.153`, `7da43d67b50ec0a348e3dabba47972ca0f7c6105`, unveränderter Entwicklungsbranch. Keine zuvor veröffentlichte GPT-Review zu diesem Batch auf dem geprüften `main` (`b616772`) vorhanden. Vorgänger: [Batch26](../batch-20261103-015806Z/REVIEW.md).

## 1. Ergebnis und Prüfgrundlage

| Profil | Spielerinputs | Enginezüge | Ende | L15 erstmals | Klassenannahme |
|---|---:|---:|---|---:|---|
| Warrior | 356 | 327 | L18, regulär fertig | T337 | T356: Bulwark Oath |
| Mage | 176 | 155 | L16, regulär fertig | T168 | T176: Spellwoven Focus |
| Rogue | 88 | 81 | L5, `repeated_model_failure` | nicht erreicht | nicht erreicht |

**620 Inputs, 563 Enginezüge, zwei erfolgreiche E-Klassenannahmen, kein Tod.** Warrior/Mage liefern zusammen mehr als 4½ Stunden echte Langlaufabdeckung; Gesamtbatch rund 5h19m. Der Rogue endet nach drei fehlgeschlagenen Worldberichten ohne mechanischen Fortschritt. Das ist ein modellbedingter Runner-Endstopp, kein Enginecrash oder beschädigter Spielstand; für die technische Abbruchquote zählt es trotzdem als ein nicht regulär abgeschlossenes Profil.

Die 115.997.974-Byte-Original-ZIP wurde vollständig auf CRC geprüft. SHA-256: `8d053a7dcd1a57523d4883dea0753e242ab9429c91c9d88fb4aaff737f8eadf3`. Alle drei Chats, Eventexports, Run-/Evaluationsdateien und entscheidenden Original-Completions geprüft. **8.481 Events aus 1.147 Eventrecords unabhängig gefaltet; `validateState` nach jedem eventtragenden Record: keine Probleme.** Exportevents stimmen mit den Chatrecords überein. Alle Endfolds gültig; Wallet und aufsummierte Coin-Deltas stimmen bei W958/M657/R101 cp überein. Keine Page-/Serverfehler in den Runexporten.

Die [Quellenmanifestdatei](SOURCE_MANIFEST.json) nennt Hashes und Umfang. Drei vollständige Originalchats sind verlustfrei komprimiert unter `originals/` archiviert; zusätzlich zehn ausgewählte Original-Completions. Die vollständige ZIP und sämtliche Provider-/Serverlogs sind **nicht** als Git-Datei archiviert. Die ausgewählten Completions sind inhaltlich unveränderte JSON-Records, neu serialisiert; die dekomprimierten Chatbytes dagegen identisch zum ZIP-Member. [Original-Batchmetadaten](batch.json), [ursprünglicher Runnerbericht](ORIGINAL_REPORT.md), [ausgeführte Gegenproben](PROBE_RESULTS.json).

**Indexkonvention:** T zählt tatsächlich gesendete Spielerinputs einschließlich Panels. I ist der nullbasierte Chatindex ohne die JSONL-Metadatenzeile. Beides ist von `state.turn` zu unterscheiden. Kein neuer natürlicher Run, keine vollständige Node-/ST-Suite und keine Produktänderung für diesen Review.

## 2. Technische Bewertung

| Befund | Einordnung | Tatsächlicher Beleg / Konsequenz |
|---|---|---|
| Rogue T86–88 / I172,174,176: Verkauf stoppt den Run | **Bestätigte LLM-/Repair-Integrationsschwäche, hohe Priorität** | Extractor und Repair lassen bei der Fang-ID den Encounter-Suffix weg. Waren sind tatsächlich vorhanden. Keine illegale Zahlung; nach drei Wiederholungen stoppt der Runner korrekt seine Schleife. |
| Mage T36 / I72: gesamtes Angebot verworfen | **Bestätigter Formfehler mit wenig hilfreichem Repair** | `pricing:{basis:"unknown",quote:…}` ist kein zulässiger unbekannter Preis. Repair verändert die Phase bzw. den Quoteinhalt, entfernt aber das verbotene Feld nicht. Danach sichere Fortsetzung. |
| Mage T153 / I305: Badekübel-Zahlung nicht ausgeführt | **Lokale Fehlablehnung/Modell-Grenze, P2** | Planner schlägt 1 cp vor, der vollständige Geldbeleg für „here's the copper for it“ wird nicht akzeptiert. Beide Antworten enden regulär; kein Tokenlimit. Nächster Zug gelingt, kein Debit. Kein Anlass für die nächste Zahlungswortliste. |
| Rogue T63–70 / I125–140: erzählter Dolchkauf ohne Gear | **Bestätigte Zustands-/Narrationsschleife, keine nachgewiesene fehlerhafte Kaufbuchung** | Erst nur `intent.set`, trotzdem erzählt der Narrator Reise und Händler. Einführung und Offerte werden am unerreichten Schauplatz korrekt verworfen. Nach echtem GO folgt `enter` für weiterhin unbekannten Gorran; die fehlende Person/Offerte wird nicht nachgeholt. |
| Mage T118–120: 280 statt gespeicherten 100 cp verlangt | **Korrekte Preis-/Zustimmungssicherung, verstärkt durch Modellschleife** | Erzählung widerspricht sich selbst: „Two silver, eighty copper“ ergibt 100 cp; ihre Stückrechnung ergibt 280. Erst T121 akzeptiert der Spieler den gespeicherten Endpreis. Keine falsche Auszahlung. |
| Rogue T25–31: wiederholt nicht ausgeführter Nahkampf | **Regel-/Bedienungsreibung, kein belegter Kampfrechenfehler** | Ein Bewegungsband plus Razor Cut reicht von MEDIUM nicht bis ENGAGED. Die ungültige Gesamtaktion verändert die Entfernung nicht. Spieler wiederholt denselben Versuch; bei SHORT→ENGAGED klappt er. |
| Rogue: Grotto schon nach drei Käfern als fertig behandelt | **Korrekte Questschutzentscheidung** | Nur der erste Slot ist erledigt. T80-Abgabe erzeugt keine unberechtigte CLEAR-Auszahlung. |
| Rogue T20: Boardgenerator scheitert | **Sicher abgefangenes Modellproblem** | Spätere Abfrage funktioniert; weder Runstop noch nachgewiesener neuer Validatorwiderspruch. Nicht ungeprüft mit früheren Boardfehlern gleichsetzen. |

### 2.1 Rogue-Endstopp: vollständige Ursachenfolge

T85 benutzt `#bag` innerhalb einer normalen Rollenspielnachricht. Das öffnet kein Systempanel; der Narrator beschreibt das Gepäck. **Die angebotene Beute ist diesmal dennoch real:** eine Wolfspelt und zwei Fangs aus `enc.t51`, beide beim PC. Der frühere Verkauf T40 betraf ältere Einheiten. Es wäre falsch, dem Spieler einen erneuten Verkauf bereits verkaufter Beute zu unterstellen.

Der tatsächliche `OBJECTS`-Katalog im Extractorrequest enthält:

```
obj.loot.wolf.pelt.f.enc_t51
obj.loot.wolf.fang.f.enc_t51
```

Die Extractorantworten **251/252, 256/257 und 260/261** verwenden stattdessen `obj.loot.wolf.fang.f`. Alle sechs enden mit `finish_reason: stop`, nicht wegen Token-/Reasoningerschöpfung. Der Repair behauptet in seiner aufgezeichneten Begründung mehrfach, die verkürzte ID stehe so im Katalog. Der tatsächliche Request widerlegt das. Keine Kürzung durch den Enginekatalog nachgewiesen; der Planner verwendet T87/T88 sogar die vollständigen IDs.

`extractionRequest()` bindet das Schema an `cat.objects`; `parseExtraction()` verwirft die unbekannte Referenz. Die Fehlerdiagnose bleibt aber bei `.lines[n].object: matches none of anyOf`. `extractorRequest()` reicht diesen generischen Fehler samt alter Antwort weiter. Das Modell wiederholt den Fehler unverändert. **Die Schema-/Eigentumssicherung ist richtig; die diagnostische Qualität des Reparaturwegs reicht in dieser Folge nicht aus.**

`run_live.mjs` beendet nach drei sicheren Fortsetzungen ohne Änderung an Szene/PC/Quests/Objekten. Dieses Limit funktioniert wie vorgesehen; es ist nicht die Ursache des falschen Objektreports. Der gespeicherte Spielstand ist fortsetzbar. Die wirtschaftliche Handlung wurde nicht ausgeführt und darf nicht als Verkauf gezählt werden.

**Echte Read-only-Gegenprobe über `processReplyAny()` → `runExtraction()` → Hostfold:** Original I176 scheitert nach zwei Antworten, Wallet101, kein Gebot. Ausschließlich die Fang-ID im Modell-JSON korrigiert: `applied` nach einem Call, verbindliches Gebot `offer.t176.8` über 12 cp für exakt Pelt1/Fangs2, Wallet weiter101. Ein neuer ausdrücklicher `offer.accept` bucht genau eine Transaktion über12 cp und überträgt die Ware; Wallet113, Reload113, State gültig. [Ergebnisse](PROBE_RESULTS.json). **Das ist eine manuelle Gegenprobe, kein Nachweis, dass ein verbesserter GLM-Repair bereits funktioniert.**

### 2.2 Mage-Angebot: derselbe schwache Diagnosepunkt, anderer Modellfehler

Calls98/99, T36: Eine Preisberatung zu einer abwesenden Heilerin lautet „four, maybe five silver“. Das Modell markiert den Preis bereits als unbekannt, hängt aber `quote` an. Der geschlossene S2-Zweig erlaubt ausschließlich `{basis:"unknown"}`. Im Repair wird der Quote zu `null`; das Feld bleibt unzulässig. Der komplette Report und damit auch die unabhängigen klaren Zimmer-/Versorgungsangebote gehen verloren.

Gegenprobe am Originalprefix: Originalantwort+Repair bleiben `failed`, Wallet70. Nur den unbekannten Pricingzweig auf `{basis:"unknown"}` gesetzt: Report `applied`, Wallet70, zwei zulässige Angebote für10/20 cp. Die im Modell fälschlich gemeldeten100/200 cp werden anhand „one/two silver“ korrekt auf10/20 bestimmt. Die fremde unklare Heilerleistung wird dadurch **kein** verbindlich kaufbarer400-cp-Artikel. Keine neue Preislesart erforderlich.

### 2.3 Rogue-Händler: Reihenfolge statt pauschalem Kaufdefekt

I125 „I'll try Gorran's…“ wird als Zielnotiz interpretiert. Der Narrator reist trotzdem dorthin. I126/I128: `arrive` scheitert korrekt an `no_go`; Gorrans `person.new` und Offerte scheitern an `scene_context`. Bei I133 erfolgt endlich eine echte Reisehandlung. Danach versucht I134 aber nur `enter npc.gorran`, obwohl seine früher verworfene Einführung nie kanonisch wurde. World weist diese unbekannte Person zurück. I138 versucht stattdessen, den Dolch direkt beim PC zu erzeugen; die Inventar-Firewall verhindert das. I140 berichtet nur Zeit statt gültigem Händler und Angebot.

Das erklärt die leere Kaufabwicklung, ohne Geld- oder Gearbuchung zu verdächtigen. Es ist **nicht nur ein fehlendes Kaufwort und auch nicht allein ein falscher Preis**. Korrekte Wiederaufnahme müsste am tatsächlich erreichten Ort die Person aus der aktuellen Erzählung etablieren und ihr ein gültiges Angebot zuordnen. Keine automatische Händlererzeugung aus Spielertext, keine Ankunft aus einer Zielnotiz. Bestehende Normalisierung neuer F-Gearpreise bliebe außerdem verbindlich; vier erzählte Silber garantieren kein Fine-Gear zu40 cp.

## 3. Letzte Patches: was der Batch tatsächlich belegt

- **.153:** Kein Inventar-/Holderwiderspruch und keine neue Gearkopie im geprüften Verlauf. Warrior wechselt Fine→Superior→Exceptional, Schild und Rüstung werden gebucht; T198 verwendet einen `item.obj.…`-Alias für UNEQUIP. **Die kritische kombinierte EQUIP→Alias-GIVE-Kette aus Batch26 tritt hier nicht erneut auf.** Daher positiver Nachweis angrenzender Gearabläufe, kein neuer natürlicher Beweis genau dieses Regressionfalls. Dessen gezielte Abnahme steht in der [.153-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7da43d6/avereth-engine/docs/FIX153_GEAR_IDENTITY.md).
- **Finanzen/Gilde:** 63 Transaktionen, konsistente Wallet-Ledger, 19 abgeschlossene Guildverträge (W9/M7/R3). Reguläre Käufe, Lootverkäufe, Registrierung und Abgaben funktionieren mehrfach. Eine korrekte Geldsumme beweist allein keine vollständige Wirtschaftssemantik; in den untersuchten Problemfolgen ist jedoch keine neue unzulässige Geld-/Eigentumsbuchung nachgewiesen.
- **.148 Gefahr:** Die ersten Boards zeigen L1-Einstiegsjagden neben deutlich höheren festen Populationen; Killziel und Gruppenrisiko werden getrennt benannt. Der Warrior kann später echte L12–14-Boars angehen. Keine automatische Anpassung sämtlicher Gegner an den PC belegt.
- **.149 Entwicklung:** Sofortsiege können PP und Muster erzeugen. Warrior erhält und akzeptiert zwei tatsächliche Breakthrough-Skills. Mage entwickelt Bolt und Wave bisP3. Keine Skill-Evolution ohneP5 erwartet. Es gab hier keine doppelte Dungeonpopulation wie Run12; Mage räumt eine Dungeon-Ebene, Rogue nur einen ihrer Slots.
- **Fail-soft:** Zwei Mage-Fortsetzungen und drei Rogue-Fortsetzungen, davon die letzten drei in derselben Stallschleife. Nicht als fünf unabhängig gelöste Fehler verkaufen. Keine leeren Narrator-/Extractorbudgets als Ursache des Rogue-Endes und keine neue Fetch-/Swipe-Lifecycle-Regression nachgewiesen.

## 4. Spielerschleifen und Tempo

**Warrior:** wiederholte Rückkehr zu denselben schwachen Jagdtypen, viel Reise-/Gesprächs-/Vorbereitungsspiel und mehrere Nahkampfannäherungen. BisT312 werden noch L1-Marshcats gejagt; acht der29 besiegten Gegner sindL1. In25 Encountern gibt es22 Siege und3 Rückzüge. Spätere Gruppen und starke Populationen funktionieren. Das ist eine lange, aber überwiegend spielbare Kampagne;356 Inputs sind nicht356 nützliche Fortschrittshandlungen. Am100-Input-Vergleichspunkt liegt der Warrior beiL3, der Mage bereits beiL9.

**Mage:**18 Siege/23 besiegte Gegner, eine Dungeonräumung, sieben Guildabschlüsse; wesentlich direkterer Verlauf. T118–121 zeigt eine echte Kommunikationsschleife: Narrator nennt ein widersprüchliches Preisbild, der Planner fragt zweimal nach und der Spieler wiederholt280 cp. Beim ausdrücklichen gespeicherten100-cp-Gebot endet die Schleife korrekt. Ein menschlicher Spieler könnte den autoritativen Preis früher wählen oder ein neues Gebot verlangen. Kein Grund, die gespeicherte Offerte durch Spielerbehauptung umzupreisen.

**Rogue:** vier Siege/sechs Gegner bisT88, drei einfache L1-Wolfjobs und dann die erste Käfergruppe. Beim zweiten Wolf gehen mehrere Inputs durch Reichweite/Bewegung verloren; beim Händler mehrere durch die nicht gebuchte Reise/Person. Der letzte Lootverkauf ist schließlich ein echter Extractor-/Repair-Blocker trotz vorhandener Ware. Diesen Abbruch als schlechte Rogue-Kampfbalance oder bloße unpräzise Spielereingabe zu bewerten wäre falsch.

Runnerempfehlung nur zur Datensammlung: vorhandene Bedienregeln anwenden, keine neue Questfolge. `#bag`/`#equipment` bei Bedarf separat senden; nach korrigierter Reise Händler/Angebot neu prüfen; nach einer Reichweitenablehnung die Entfernung tatsächlich ändern statt dieselbe gekoppelte Aktion zu wiederholen. Nicht automatisch Nachrichten umschreiben oder den Abbruchzähler entfernen. Vor einem neuen Guideumbau zunächst den belegten Extractorfehler beheben bzw. bewusst akzeptieren.

## 5. XP, Gear und Skillentwicklung

| Profil | Kampf-XP | Quest-XP | Gesamt | Entwicklung |
|---|---:|---:|---:|---|
| Warrior | 9.855 | 6.200 | 16.055 | BasicP3, CleaveP1/54PP, zwei Breakthroughs; Gear bis Exceptional-Schwert + Fine-Schild |
| Mage | 7.040 | 5.855 | 12.895 | BoltP3/26PP, WaveP3/12PP; Fine-Stab und neue Rüstung |
| Rogue | 780 | 345 | 1.125 | RazorCutP2/4PP, FanP1/36PP; Common-Leathers, Starterdolch |

**Keine weitere pauschale XP-Erhöhung aus diesem Batch ableiten.** Mage erreicht L15 bei168 Inputs. Warrior benötigt337, jagt aber lange dieselben niedrigen Gegner; die erste starke Boargruppe gibt3490 Kampf-XP, deren Auftrag später2925 Quest-XP. Das späte Tempo beschleunigt sich ohne andere XP-Kurve deutlich. Beide Kampagnen überschreiten L15 bei einer größeren Auszahlung und beenden später die Klassenannahme. Der Unterschied ist überwiegend Inhalts-/Aktionswahl, nicht ein belegter Fehler der Levelberechnung.

PP ist ebenfalls nachvollziehbar: W216/M288/R108 vergebene PP insgesamt, auf mehrere Skills verteilt. Mage benutzt beide Hauptskills, erreicht aber keinenP5-Skill; daher keine Evolution anbieten. WarriorQuickSlash bleibt ungenutzt und bei0PP. Das gekaufte Mage-Mend-Manual führt zu einem Lernziel25/100LP nach einer tatsächlichen120-Minuten-Sitzung; weiteres Studium fehlt. Kein Beleg für verschwundene LP oder ein defektes Lernziel. Mehr Lernmotivation wäre eine spätere Runner-/Designentscheidung, keine technische Reparatur.

Gear wird diesmal tatsächlich gekauft und benutzt. Der gescheiterte Rogue-Dolch und der beim Mage gekaufte, aber ohne ausdrückliches EQUIP nicht getragene Superior-Stab sind getrennt zu bewerten. Nicht aus dem Nichttragen einer gekauften Ware automatisch einen defekten Kauf ableiten. Engine-Shops bleiben eine mögliche spätere Vereinfachung; sie ersetzen allein weder korrekt gebuchte Händleranwesenheit noch die Referenzbindung beim Lootverkauf.

## 6. Technischer Vorschlag und Priorität – noch keine Umsetzung

**Als nächstes enges Fachziel: Reparaturen für tatsächliche Referenz-/Strukturfehler brauchbar machen, nicht Preise oder Geldmechanik erneut umbauen.**

1. `v4/schema.js:validate()` / `validate.js:validateSchema()` verlieren bei verschachteltem `anyOf` die konkrete Ursache. Referenzfehler sollten Feldpfad **und tatsächlichen ungültigen Wert** melden, mit begrenzter Liste zulässiger IDs aus genau dem bereits verwendeten Katalog. Keine erfundene ID akzeptieren, keine automatische Präfix-/Namensauflösung. Bei durch `basis` eindeutig ausgewähltem Pricingzweig sollte der Fehler das unerlaubte Feld nennen. Kein zusätzliches Modell, Retrybudget oder allgemeiner Sprachparser.
2. `v4/extract.js:parseExtraction()/extractorRequest()` nutzen diese präzisen Diagnosen im vorhandenen einmaligen Repair. Optional sichere Formnormalisierung des bereits ausdrücklich unbekannten Preises: unbekannt bleibt unbekannt, überflüssige Preisquote wird nicht zu einer bindenden Summe. Dagegen keine allgemeinen ungesicherten Defaults oder Finanzdeltas aus falsch referenzierten Objekten retten.
3. Rote Originalfälle: Rogue Calls251/252,256/257,260/261 und Mage98/99. Positive Gegenfälle: mehrere gleichartige Lootstapel verschiedener Encounter, wirklich unbekannte ID bleibt ungültig, vorhandene richtige ID unverändert; total/unknown, gültige unabhängige Angebote, keine Zahlung vor Zustimmung und kein Doppelverkauf. Vor einem solchen Produktpatch gelten wieder Vollsuite/Replay und relevante Hostabnahme; für diesen Review wurden nur die dokumentierten Read-only-Proben ausgeführt.

**Wirkungsgrenze:** Präzisere Diagnosen garantieren noch nicht, dass GLM zukünftig korrekt kopiert. Das muss der nächste natürliche Batch zeigen. Der vorhandene endliche Runner-Stopp bleibt sinnvoll. Die Gorran-Kette ist daneben ein P2 zur Wiederaufnahme nach verworfener Einführung: keine pauschale Freigabe von `enter` für unbekannte NPCs. Badekübel-Anapher und Nahkampfkomfort bleiben lokal tolerierbare P2-/Designpunkte; daraus keine weitere Wortlistenserie machen.

**10B-Urteil:** gegenüber Batch26 diesmal durchgehend valide Zustände in3/3 Läufen, aber1/3 Profile technisch/modellbedingt vorzeitig beendet. Keine nachgewiesene Verschlimmbesserung durch `.153`; der neue Endstopp benutzt den unveränderten Extractor-/Repairpfad. Zwei Batches mit unterschiedlichem Build und unterschiedlichen Endgründen ergeben noch keine belastbare feste Abschlussquote. Die Architektur funktioniert in langen Kampagnen weitgehend; der sinnvollste nächste Eingriff liegt in der konkreten Reparaturdiagnose, nicht in einer neuen Finanzarchitektur, mehr XP oder der Lockerung von Eigentumsregeln.

---

## 7. GPT-Gegenreview – unabhängiger Codeabgleich und 10B-Bewertung (03.11.2026)

**Quellenbasis und Abgrenzung:** Den vollständigen Sol-Originalreview §§1–6 gelesen. Die auf main veröffentlichten Dateien SOURCE_MANIFEST.json, PROBE_RESULTS.json, batch.json sowie die Verzeichnisliste der verlustfrei komprimierten Originalchats und zehn ausgewählten Completions geprüft. **Die komprimierten Originalchats und Completion-Records wurden von GPT nicht eigenständig dekomprimiert oder erneut gefaltet.** Original-T-/I-Belege, Eventzahlen, Hashes, Providerantworten und Original-Hostgegenversuche stammen aus Sols dokumentierter Prüfung; sie sind nicht als zweite unabhängige Ausführung auszugeben. Die folgenden Codeaussagen basieren auf einem eigenen statischen Abgleich des tatsächlichen Produktstands **.153 / 7da43d6**: src/v4/schema.js, src/validate.js, src/v4/extract.js, src/v4/catalog.js und src/v4/runtime.js. Keine Node-/ST-Tests, kein natürliches Testprofil und kein Produktcodepatch in diesem Gegenreview.

### 7.1 Stabilität: klar integre Zustände, aber ein technischer Runstopper

Für Batch27 gelten getrennt:

| Kategorie | Befund und Interpretation |
|---|---|
| **Technische Zwangsabbrüche** | **1/3** – Rogue nach wiederholtem Extractor-/Repair-Fehler, nicht aus Kampf oder freiwilligem Ende |
| **Durchgehend validierte gespeicherte Zwischenzustände** | **3/3 nach Sols Originalprüfung**, insgesamt 8.481 Events / 1.147 Eventrecords; alle Endfolds gültig |
| **Reguläre E-Klassenabschlüsse** | **2/3** – Warrior T356/L18 und Mage T176/L16 |
| **Modellfehler vor Zustandsbuchung** | Rogue-Fehler wiederholt abgefangen; **kein illegales Gebot, keine Zahlung, keine beschädigte Objektidentität**, aber drei inhaltlich identische Fehlerfolgen ohne Progress |
| **.153-Rüstungsidentität** | Kein neuer Holder-/Inventarfehler, positiver Gear-Alltagsbefund; **die kombinierte ursprüngliche EQUIP→Alias-GIVE-Kette wurde nicht noch einmal natürlich getroffen** |

Der Rogue-Fall ist **kein Integritätsbruch im gespeicherten Zustand**, aber für die 10B-Klasse „technisch erzwungener Endabbruch“ trotzdem **ein Fehlschlag**. Die begrenzte Runnerpolitik schützt vor endlosen Wiederholungen, macht diesen Stopper aber nicht zu einem regulären Abschluss. Ein theoretisch weiterhin nutzbarer Chat und eine tatsächlich fortgesetzte automatisierte Kampagne sind unterschiedliche Maßstäbe.

### 7.2 Rogue: Katalog und Schema richtig, Diagnose tatsächlich zu unspezifisch

**Sol-Befund:** Der Extractor hat den zulässigen Objektkatalog mit den vollständigen Beute-IDs einschließlich Encounter-Suffix. Trotzdem erzeugen Initialantwort und Repair in drei aufeinanderfolgenden Spielerzügen die verkürzte Fang-ID. Die aus den Quell-Completions berichteten Antworten enden regulär, nicht mit length. Der Planner trägt in späteren Versuchen sogar die vollständige Identität, sodass ein Katalogfehler oder ein automatisch verstümmelnder Parser nicht belegt ist.

**Eigenständiger Codeabgleich bestätigt den unmittelbaren Diagnoseverlust:**

1. **src/v4/extract.js:deltaSchema():** Ein Bid-Linienobjekt verlangt eine Referenz aus den exakt im aktuellen Katalog enthaltenen Objekt-IDs oder eine ausdrücklich neu berichtete Objektform. Die verkürzte bestehende Loot-ID gehört nicht dazu. Das Schema **muss sie ablehnen**.
2. **src/validate.js:validateSchema():** Jede anyOf-Alternative wird intern auf Erfolg geprüft. Schlagen alle fehl, wird nach außen nur „matches none of anyOf“ zurückgegeben, ohne den getesteten Stringwert oder einen sinnvollen Subzweig.
3. **src/v4/schema.js:validate():** Die vorhandene nützliche Spezialisierung löst den **äußeren** discriminierten Delta-Typ anhand von type auf. Innerhalb einer Bid-Zeile liegt aber nochmals ein verschachteltes anyOf für die Objekt-ID. Dort bleibt die generische Fehlermeldung stehen.
4. **src/v4/extract.js:extractorRequest():** Der normale Repair erhält die verworfene JSON-Antwort und eine begrenzte Fehlerliste. Beim konkreten Fall fehlt ihm darin jedoch: „lines[1].object hat den Wert X; diese ID ist nicht in der aktuellen erlaubten Liste; kopiere eine vorhandene genaue ID“. Eine allgemeine Regel „copy ids exactly“ steht schon im Systemprompt, hat hier nachweislich nicht genügt.
5. **src/v4/runtime.js:runExtraction():** Der normale Inhalt wird für maximal eine Schema-Repairantwort wieder angeboten; nach zwei ungültigen Antworten je Zug bleibt nur der sichere Fehlerrecord. Der Runner stoppt schließlich nach drei Zügen ohne mechanischen Fortschritt. **Das endliche Budget ist eine Sicherheitsgrenze, nicht die Ursache des falsch referenzierten Gegenstands.**

**Folgerung:** Der richtige erste Eingriff ist die Diagnose **an der konkreten verschachtelten Feldstelle**, nicht das Erweitern des Katalogs, automatisches Anlegen eines Objekts oder das Durchwinken eines unzulässigen Gebots.

**Abnahme der Wirkung:** Sols dokumentierter manueller Hostgegenversuch zeigt, dass bei **ausschließlich korrigierter Fang-ID** ein verbindliches 12-cp-Gebot entsteht, der Spieler es explizit annehmen kann und genau eine Übertragung/Transaktion erfolgt. Das widerlegt einen generell kaputten Verkaufspfad, **beweist aber noch nicht**, dass GLM auf einen verbesserten Repairprompt korrekt antworten wird. Der nächste echte Modellnachweis bleibt nötig.

### 7.3 Mage: dieselbe Diagnosequalität, aber ein anderer Mechanismus

**Codeabgleich:** PRICING in extract.js ist eine strikte anyOf-Union aus (a) total mit quote/currency_quote und (b) unknown **ausschließlich mit basis**. Ein Report mit basis unknown und zusätzlichen quote-Feldern muss deshalb scheitern. normalizeSoftFields/softWords macht aus solchen Feldern **keine** zulässige unknown-Form; die erhaltenen Zusatzfelder – und gegebenenfalls ein ergänztes currency_quote:null – führen zu derselben generischen anyOf-Meldung.

Dies ist **keine neue Auslegungsfrage für den Geldbetrag**. Die Heilerpreisberatung bleibt unbekannt und unverbindlich. Die zwei klaren, voneinander unabhängigen Zimmer-/Versorgungsangebote wurden laut Originalgegenprobe nach einer manuellen reinen **Formkorrektur** gültig und ihre totals durch die vorhandenen S2-Belegregeln auf 10/20 cp begrenzt, **ohne Geldbewegung oder Umdeutung der Heilerin zu einem bindenden Angebot**.

**Gezielter Fixansatz:** Für einen eindeutig anhand basis ausgewählten pricing-Zweig die konkreten unerlaubten Felder in der Reparaturmeldung nennen; beispielsweise „basis unknown: nur basis erlaubt; entferne quote und currency_quote; nicht als total ausgeben, sofern die Narratorworte kein bindendes Gesamtangebot enthalten“. Eine sichere lokale Normalisierung ausdrücklich unknown markierter Preise **kann** zusätzlich erwogen werden, aber nur, wenn sie weder ein unverbindliches Angebot zu firm macht noch ungültige Mengen-/Geldbelege in gültige Buchungen verwandelt. Kein pauschales Wegwerfen beliebiger Felder aller JSON-Objekte.

### 7.4 Für den nächsten eng begrenzten Patch: genaue Regelgrenzen und Regressionen

**Meine Präzisierung gegenüber einer allgemeinen Validator-Überarbeitung:** Keine unbeschränkte Rekursion in alle fehlgeschlagenen anyOf-Zweige einführen, die bei mehrdeutigen Unions widersprüchliche Kandidatenfehler zu einem langen, unverständlichen Repairprompt addiert. Entweder gezielt im Delta-Validator den eindeutig gewählten Strukturzweig weiterverfolgen oder in parseExtraction **nur für klar bekannte Referenz- und Pricingfelder** eine zusätzliche strukturierte Diagnose erzeugen. Bestehende valide Antworten, Protokoll und globale Validatorregeln bleiben möglichst unverändert.

- **Referenzdiagnose:** tatsächlichen fehlerhaften String, vollständigen Feldpfad und eine **begrenzte, aus genau dem an diese Anfrage gebundenen Katalog entnommene** Auswahl gültiger vollständiger IDs nennen. Bei mehreren passenden Encountern die **Mehrdeutigkeit** zeigen, nicht einen Suffix raten. Eine Liste im Prompt ist ausschließlich eine Hilfestellung; die Engine darf weder automatisch korrigieren noch eine bisher unbekannte ID anerkennen.
- **Strukturdiagnose:** bei basis unknown die unerlaubten Eigenschaften konkret ausweisen, aber kein Ergebnis aus prose errechnen. Gültige total-Angebote unverändert lassen; unabhängige Delta-Teile dürfen durch einen erfolgreich reparierten Gesamtbericht wieder gebucht werden, **nicht** durch unvalidierte Teilbuchung eines weiterhin fehlerhaften Reports.
- **Bewusste Begrenzungen:** vorhandene eine Schema-Repairrunde, Priorität strikter Reference-/S2-Prüfung, Endstopplimit, gespeicherte Inputs/Events, Save/Edit/Fold und Replay unverändert lassen. Keine zweite Modellinstanz, automatische ID-Präfixergänzung, Preiswortliste, pauschal erhöhte Tokens oder längere retry-Schleifen.

**Rote Original-/Reprotests:** Rogue Calls251/252,256/257,260/261 mit bereits vorhandener Pelt und zwei Fangs; Mage Calls98/99 mit unbekanntem Preis plus unabhängigen gültigen Offerten. Nach dem Eingriff muss der jeweilige **Repairprompt selbst** nachweisbar präziser sein; ein Stub, der die exakt richtige ID/Struktur zurückgibt, prüft den mechanischen Pfad. Der zusätzliche natürliche GLM-Test prüft erst, ob das Modell auf die präzise Diagnose wirklich reagiert.

**Kontraste:** Zwei Wolfsbeute-Sätze aus unterschiedlichen Encountern dürfen nicht still zu einer ID zusammenfallen; unbekannte oder fremde Objekt-ID bleibt ungültig; gültige exakte ID bekommt keinen neuen Fehler; total/unknown/conditional und echte Stückpreisbelege behalten die S2-Grenzen; kein Gebot ohne tatsächlich vorhandenen PC-Bestand, keine Annahme ohne Spielerzustimmung, keine doppelte Veräußerung. Host-Record, Reload/Edit und Replay mitprüfen; vorhandene Abnahmesuite plus ST-Smokes gemäß 01.

### 7.5 Händlersequenz und Pacing: keine zusätzlichen Grundsatzpatches

**Rogue bei Gorran:** Sols belegte Reihenfolge unterscheidet sauber zwischen (1) vorgestelltem Ziel ohne autorisiertes GO, (2) zu früh am falschen Ort erzeugter Person/Offerte, (3) späterer tatsächlicher Ankunft mit nun **nicht existierender** Händler-ID und (4) zurückgewiesenem Direktinventar. Die Guards schützen die Welt, sind hier nicht selbst der Fehler. Die gespielte Wiederholung ist eine **Integrations-/Narrationsreibung**, nicht eine Fehlabbuchung. Es wäre falsch, unbekannte NPCs durch enter pauschal zuzulassen oder rückwirkend die zuvor verworfene Szene verbindlich zu machen. Bei wiederholter Häufung später als eigener P2-Wiederaufnahmepunkt prüfen; jetzt keinen zweiten ungefragten World-/Händlerpatch.

**Mage Badekübel / Preiswiderspruch:** Ein einzelner 1-cp-Anapherfall und die nachgewiesene widersprüchliche Stück-/Gesamtsummenerzählung reichen nicht für neue Geldheuristiken. Der gespeicherte Preis bleibt maßgeblich; keine zusätzliche Zahlungswortliste und kein automatisches Akzeptieren behaupteter 280 cp.

**Rogue Nahkampfreichweite:** Wiederholte unzulässige Angriffe von MEDIUM, ohne die notwendige neue Position zu buchen, sind Bedien-/Sequenzreibung, kein nachgewiesener Schadens- oder Kampfregeldefekt. Bei einer späteren Runner-QoL-Diskussion kann die vorhandene Reichweitenregel prägnanter sichtbar werden; nicht als unmittelbarer 10B-Mechanikpatch ausgeben.

**Warrior/Mage-Leveltempo:** Mage L15 T168, Warrior T337, während letzterer lange L1-Gegner bearbeitet. Das ist ein starkes Indiz für Strategie-/Inhaltswahl und Schleifen, kein Beweis einer zu langsamen allgemeinen XP-Funktion. Die vorhandenen organischen Skillangebote, XP×5 und PP/LP jetzt nicht erneut hochsetzen. Auch .153 wurde hier nicht mit seinem exakten ursprünglichen Equip→Alias-Give-Fall natürlich nachgetestet, wohl aber ohne neue Rüstungsverdoppelung in echten Gearwechseln.

### 7.6 Einordnung der aktuellen Testfolge und Empfehlung

| Batch / Produkt | Technischer Endabbruch | Wesentliche Integritätsbeobachtung |
|---|---|---|
| 23 / .149 | **1/3** | Warrior: schwere Dungeon-Verfälschung und unbekannter Ortsfakt trotz regulären Endes |
| 24 / .150 | **1/3** | Durchgehend gültige End-/Zwischenzustände, Rogue Fetch-/Plannerstopp |
| 25 / .151 | **1/3** | Warrior: freie Zahlkarte im Assistantrecord, Fold-/Fortsetzungsblockade |
| 26 / .152 | **0/3** | Warrior: physische Rüstungsduplikation; grüne Endprüfung verdeckt Zwischenfehler |
| 27 / .153 | **1/3** | Alle gespeicherten Zustände gültig; Rogue scheitert an wiederholter Modell-/Schema-Reparatur |

Über fünf **verschiedene Builds** hinweg sind dies **vier technische Endstopps in 15 Profilen** – lediglich eine historische Momentaufnahme, **keine Zuverlässigkeitsquote von .153**, kein identischer Testaufbau und keine statistische Freigabegrundlage. Fortschritt ist vor allem bei **State-/Objektintegrität und sicheren lokalen Recoveries** sichtbar; das zentrale verbleibende Hindernis ist weiterhin die gelegentliche **endgültige Unterbrechung einer mechanisch möglichen Handlung**.

**Empfehlung:** Ein **gezielter P1-Integrations-/Repair-Diagnose-Fix** für verschachtelte vorhandene Objekt-IDs und eindeutig falsche Pricing-Formen ist fachlich gerechtfertigt. Die hohe Priorität bezieht sich auf den **Runner-Endstopp** und den Verlust unabhängiger Weltinformationen, nicht auf einen bewiesenen Geld- oder Inventarschaden. Den Endstopp nicht dadurch „beheben“, dass der Runner drei weitere gleichartige Fehler toleriert. Nach engem Rot/Grün-/Replay-/Hostnachweis einen neuen natürlichen Mehrklassenbatch **unverändert in Strategie und Balance** ausführen und insbesondere die nächsten unbekannten Referenzfehler sowie die Anzahl tatsächlicher technischer Zwangsstopps messen.

**Status und Freigabegrenze:** Gegenreview/Codeabgleich dokumentiert, keine neue Originalreproduktion, keine Implementierung und keine automatischen Freigaben. **10B nicht allein aufgrund der zwei erfolgreichen E-Klassenläufe beenden.** Eine neue Roadmap bleibt der ausdrücklichen gemeinsamen Entscheidung nach einer hinreichend stabilen Reihe vorbehalten.
