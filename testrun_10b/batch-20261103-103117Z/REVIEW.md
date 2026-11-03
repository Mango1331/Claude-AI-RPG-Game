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
