# Sol – Gegenreview und Ursachenplanung zum ersten .100-Batch

Stand: 27.10.2026. **Analyse und Umsetzungsvorschlag, keine Produktänderung.** Dieser Bericht ergänzt die unveränderte [GPT-Review](REVIEW.md). Er ersetzt weder die Originaldaten noch eine spätere technische Abnahme.

## 1. Quellen, Methode und belastbares Gesamturteil

Unabhängig ausgewertet wurde die hochgeladene Originaldatei `batch-20261027-030034Z(1).zip`: 38.267.753 Bytes, 98 ZIP-Einträge, CRC-Prüfung ohne Fehler, SHA-256 `aebd2b67c353b3ed6c6a57887fff1d42885462af84e8262b6a97715db7a5fe3f`. Inhalt und Hash entsprechen der in der GPT-Review bezeichneten ZIP. **Die Binärdatei liegt zum Prüfzeitpunkt nicht in diesem Git-Verzeichnis; ihr Upload wird hier nicht behauptet.**

Geprüft wurden alle sechs Chatverläufe, gespeicherte Engine-Records, Requests und Responses, Auswertungen, Spielerentscheidungen und Abbrüche. Die Originalereignisse wurden mit `foldChat` auf privaten Analysezuständen ausgewertet. Zusätzlich wurden die drei schemawidrigen Originalantworten mit dem aktuellen Parser und die Eingangsnamen mit `entranceOf` auf archivierten Zuständen nachgeprüft. Keine Änderungen an Originaldaten oder Produktdateien; keine neuen Regressionstests, keine Node-Suite, kein ST-Smoke und keine neuen Provideranfragen ausgeführt.

Quellstand:

- `main` zu Beginn und vor der Dokumentation: `37233bc803441f6cbc1d884ab30aef2b84d648f6`.
- Aktueller Entwicklungs-HEAD: `54b6e086734d719db35b12aab901e2f666229101`, Build `.100`.
- Die Runs selbst: `cadd5315862a`, Produktstand `.100` / `65d56e93cf45fdea62517150784f475561f86820`.
- Der neuere HEAD verändert die Batchprofile auf sechs Läufe und unabhängige Erkundung. **Diese neuen Explore-Anweisungen waren in den vorliegenden Runs noch nicht aktiv.**

`T` bezeichnet Spielerinputs einschließlich Panels, `m` den Nachrichtenindex im Export, `C` den Completion-Aufruf. Der interne Engine-Turn ist nach Panelaufrufen nicht mit T identisch.

**Gesamturteil:** Die Persistenz- und Autoritätsgrenzen funktionieren vielfach richtig. Die wichtigsten Defekte liegen früher: im Umgang mit unbrauchbaren Modellantworten und in der Überführung erzählter Orte in kanonische Ortsidentitäten. Danach schützen die Engine-Guards einen bereits falschen oder unvollständigen Zustand. Zusätzliche Freigaben bei Quest-READY, Kampfstart oder Geldbuchung würden diese Ursachen verdecken.

Drei fachliche Korrekturpakete sind sinnvoll: **Completion/Extractor-Recovery**, **Habitat und Unterorte**, **Dungeon-Eingang und räumliche Semantik**. Dafür braucht es weder ein neues Questframework noch eine universelle World-State-Maschine.

## 2. Was die sechs Runs tatsächlich zeigen

| Profil | Inputs | Endlevel | Kämpfe / besiegte Gegner | Gildenabschlüsse | Ende |
|---|---:|---:|---:|---:|---|
| Guild Warrior | 32 | 2 | 2 / 2 | 0 | T32: Extractor-Schemafehler nach leerem Erstversuch |
| Guild Mage | 96 | 5 | 11 / 12 | 2 | T96: Narrator verbraucht 8192 Tokens ohne Geschichte |
| Guild Rogue | 5 | 1 | 0 / 0 | 0 | T5: Extractor-Schemafehler nach leerem Erstversuch |
| Explore Warrior | 47 | 1 | 0 / 0 | 0 | T47: Narrator leer; zuvor weiterer Extraktionsausfall |
| Explore Mage | 20 | 1 | 1 / 1 | 1 | T20: ungültiger Extractor, danach leerer Repair |
| Explore Rogue | 32 | 2 | 2 / 2 | 0 | Nutzerabbruch während T32 |

232 Inputs, 649 Spiel-LLM-Aufrufe, 2.999 Events und 168 `delta.rejected` sind bestätigt. Die 649 umfassen 215 Planner-, 195 Narrator-, 229 Extractor- und zehn Boardaufrufe; **Spieler-Modellaufrufe sind darin nicht enthalten**. Fünf natürliche technische Enden, ein manueller Abbruch, kein Tod, kein Level 15, kein erreichter 100-Input-Vergleichspunkt. Dungeonprofile 7–9 wurden nicht gestartet.

### Gegenbewertung der GPT-Review

| Aussage bzw. Bereich | Urteil | Präzisierung |
|---|---|---|
| Fünf technische Enden und ein manueller Abbruch | Bestätigt | `process_error` des Wrappers macht den sechsten Run nicht zum natürlichen Enginefehler. |
| Reasoning erschöpft die Budgets | Bestätigt | 20 vollständige Spiel-Responses mit `length`, Reasoning und null Antworttext. Die effektiven Requests enthalten bereits `reasoning_effort: low`. |
| Drei unterschiedliche Extractor-Schemafehler | Bestätigt | Alle drei Originalantworten scheitern auch im aktuellen Parser. Die Fehler werden teilweise überhaupt keinem schemaorientierten Repair mehr zugeführt. |
| Habitatzuordnung bei Warrior/Rogue fehlt | Bestätigt und konkretisiert | Beim Explore Rogue verwirft die Engine selbst den ausdrücklich richtigen Elternort. Es fehlt nicht bloß eine zusätzliche rekursive Suche. |
| Guild Mage als weitgehend positiver Progressionslauf | Wesentlich einzuschränken | Elf Strider werden für einen Viererauftrag getötet; sieben zählen nicht. Derselbe Herkunftsverlust betrifft also auch den vermeintlichen Kontrolllauf. |
| Explore Warrior: häufige Szenenprobleme, Zahlungen noch unklar | Ursache weiter aufgeklärt | Ein zweiter, nichtkanonischer Dungeon-Eingang ermöglicht drei bezahlte Dienstleistungen ohne echten Dungeonpass. Viele Szenenablehnungen folgen daraus. |
| Einzelne fehlerhafte JSON-Felder eng normalisieren | Nicht als Hauptlösung empfohlen | `thread`, `here` und `place` sind drei Symptome desselben Protokoll-/Recoveryproblems. Automatische inhaltliche Umdeutung kann Reihenfolge und Abhängigkeiten verändern. |
| Mehr neunfache Runs | Überholt | Der aktuelle Runner plant sechs Profile. Dessen neue Explore-Regeln erst praktisch bewerten. |
| Keine pauschalen Balance- oder Firewalländerungen | Übernommen | Das Sample ist technisch und räumlich verzerrt. |

## 3. Completion-Ausfälle: bewiesene Ursache und Grenzen der Diagnose

### 3.1 Die Requests widersprechen einer einfachen „Thinking ausschalten“-Lösung

Die archivierten Spielrequests verwenden `zai-org/GLM-5.3-Flash`, `clear_thinking: true`, `reasoning_effort: low` und nichtstreamende Antworten. Planner erhalten gewöhnlich 2000, Extractor 4000, Board 3000 und Narrator 8192 Ausgabetokens. Die besondere Extractor-Empty-Recovery erhält 6000.

| Rolle | Reasoning-only mit `length` | Anteil an Rollenaufrufen |
|---|---:|---:|
| Extractor | 16 / 229 | 7,0 % |
| Planner | 2 / 215 | 0,9 % |
| Narrator | 2 / 195 | 1,0 % |
| Board | 0 / 10 | 0 % |

Diese 20 Antworten verbrauchen zusammen **84.384 Completion-Tokens bei null Antworttext** und rund 17,8 Minuten aufsummierte Requestdauer. Das sind weder verlorene Browserausgaben noch zu Unrecht verworfene gültige JSON-Antworten.

Die zwei finalen Narratorfälle:

- Guild Mage T96/C265: 8192 Completion-Tokens, 35.293 Reasoning-Zeichen, null Text.
- Explore Warrior T47/C132: 8192 Completion-Tokens, 33.701 Reasoning-Zeichen, null Text.

Primärdokumentation des Modells bestätigt, dass Reasoning ins Ausgabelimit zählt und bei GLM-5.3-Flash nicht einfach abgeschaltet werden kann. `clear_thinking` betrifft die Übernahme früherer Reasoning-Inhalte, nicht das aktuelle Thinking-Budget. Ein Prompt „Do not deliberate“ garantiert daher keine Ausgabe. Beim dokumentierten NVIDIA-Serving gelten `low/high/max`; vermeintliche Aus-Schalter können wirkungslos sein. Quellen: [NVIDIA: GLM-5.3-Flash, Control Reasoning](https://docs.nvidia.com/nim/large-language-models/latest/get-started/advanced/get-started-glm-5.3-flash.html#control-reasoning), [Z.ai: Thinking Mode](https://docs.z.ai/guides/capabilities/thinking-mode).

**Verbleibende Unsicherheit:** Der tatsächliche lokale Provider-Bridge-/Upstreamcode ist nicht Bestandteil dieses Exports. Nachgewiesen ist der gesendete Requestbody; nicht nachgewiesen ist, dass jede enthaltene Option unverändert und wirksam beim Inferenzbackend ankommt. NVIDIA-Dokumentation belegt das Modellverhalten seines Servings, nicht die konkrete Implementierung unseres Proxys. Deshalb weder „low fehlt“ noch „low wird sicher ignoriert“ behaupten.

### 3.2 Warum nur mehr Tokens keine vollständige Lösung sind

Bei erfolgreichen Extractorantworten liegt das 95. Perzentil der gesamten Completion-Tokens bei ungefähr 899, das Maximum bei 1553. Dennoch laufen andere Antworten bis 4000 ohne Inhalt. Für Narrator sind es ungefähr 1049 im 95. Perzentil, maximal 7020 bei nichtleerer Ausgabe. Es fehlt somit nicht konstant Platz für ein gewöhnliches JSON oder eine gewöhnliche Geschichte; einzelne Aufrufe entwickeln einen sehr langen Reasoning-Vorlauf.

Der Extractor-Systemprompt des ersten Calls jedes Runs umfasst bereits 37.941 Zeichen; Extractorrequests insgesamt liegen hier ungefähr bei 10.000–13.000 Prompttokens. Das ist ein sinnvoller Optimierungskandidat, **aber kein Beweis**, dass Promptlänge die Ausfälle verursacht. Die Wiederholungen mit wenig verändertem Kontext können funktionieren. Eine Aufspaltung in zahlreiche Spezialextractoren wäre angesichts neuer Zuständigkeiten und Chronologiegrenzen derzeit nicht gerechtfertigt.

`index.js:v4Llm()` beendet Engine-LLM-Calls nach 120 Sekunden. Der Narrator läuft über die normale ST-Generierung und hat einen anderen Lebenszyklus. Ein größeres Tokenbudget ohne abgestimmtes Zeitlimit kann daher lediglich `length` durch `timeout` ersetzen. Explore Warrior T32 belegt zusätzlich einen echten Transporttimeout; dieser ist von den schnell genug eingegangenen Reasoning-only-Responses zu trennen.

## 4. Extractor: der zentrale Fehler steckt in der Versuchspolitik

### 4.1 Vollständiger Ablauf der drei finalen Fehler

| Originalfolge | Parser-/Runtimefolge | Tatsächlich fehlende Chance |
|---|---|---|
| Guild Warrior T32: C92 leer nach 4000; C93 enthält Root-`thread` | `ask` meldet den leeren HTTP-Erfolg als `ok`; zweiter Call bittet lediglich um eine kurze Erstantwort; Parser verwirft C93 komplett | Der konkrete Fehler `unexpected property "thread"` wird nie an das Modell zur Korrektur geschickt. |
| Guild Rogue T5: C10 leer nach 4000; C11 `person.new.at:"here"` | Dasselbe Muster; Registrierung war im Userrecord bereits gebucht | Der tatsächliche Referenzfehler bekommt keinen schemaorientierten Repair. |
| Explore Mage T20: C58 `type:"place"`; C59 leer nach 4000 | Der erste konkrete Fehler wird im Repair benannt; danach bleibt keine zulässige Antwort | Ein leerer Repair verbraucht die einzige Korrekturchance; die letzte nichtleere Kandidatenfassung wird nicht nochmals gezielt korrigiert. |

Lesende Parsergegenprobe mit denselben Originalantworten und den jeweiligen Katalog-/Expected-Daten bestätigt exakt:

- `$: unexpected property "thread"`
- `$.deltas[2] (person.new): .at: matches none of anyOf`
- `$.deltas[0]: unknown type "place"`

Eine positive Kontrolle existiert ebenfalls: Guild Warrior T28/C77–C79 wird nach zwei leeren Antworten durch den bestehenden dritten Versuch erfolgreich extrahiert. Der Provider ist nicht generell ausgefallen.

Die Endpunkte sind also keine hypothetischen Textfehler. Aber C93/C11 sind funktional **erste inhaltliche Antworten nach einem leeren Call**, keine Reparaturen dieser anschließend gefundenen Schemafehler. Das einfache `repair`-Label in Calllogs bildet diesen Unterschied nicht zuverlässig ab; maßgeblich sind Runtime-Purpose und tatsächliche Requestnachrichten.

### 4.2 Exakter Codepfad und bewusst gesetzte bisherige Grenze

`src/v4/runtime.js:runExtraction()` führt aus:

1. Primary → `parseExtraction`.
2. Bei ungültiger/unvollständiger Antwort oder Szenendiagnose ein Repair.
3. Ein dritter Call **nur**, wenn Primary und zweiter Call beide erfolgreich transportiert, aber beide vollständig leer sind.
4. Bei primärem Transportfehler genau eine Wiederholung; eine danach ungültige Antwort bekommt keinen normalen Repair.
5. Eine ausgewählte gültige Antwort wird einmal durch `applyExtraction` gebucht.

Die Kombinationen leer→ungültig, ungültig→leer und Transport→ungültig fallen somit bewusst aus der besonderen Recovery heraus. Das erklären die vorhandenen Tests in `patch10b4c1_extractor_recovery.test.js` und `patch10b4c4_review_followups.test.js`: Teile dieser alten Versuchsbeschränkung werden ausdrücklich festgeschrieben. **Die Tests widersprechen dem Code nicht; die begrenzte damalige Policy passt schlecht zu den jetzt belegten Mischfehlern.**

`parseExtraction()` prüft zuerst die geschlossene Gesamtstruktur. Ein ungültiges Delta verhindert die Anwendung des gesamten Antwortberichts. Das schützt insbesondere Ortsfolge, Identitätsreferenzen und Zahlungen. Bei Guild Rogue hängt an der fehlerhaften Person noch eine spätere Referenz; „nur den unwichtigen Zuschauer wegwerfen“ ist daher nicht automatisch eine unabhängige lokale Korrektur.

### 4.3 Empfohlene Korrektur: maximal drei Versuche, nach Fehlerart gesteuert

Keine neue Recovery-Schicht neben `runExtraction`, sondern dessen vorhandene Zweige vereinheitlichen. Kleine lokale Versuchsschleife mit festem Limit, letztem nichtleeren Kandidaten, Validatorfehlern und bestehendem `current()`-Schutz reicht.

| Folge | Empfohlene Behandlung |
|---|---|
| gültig und vollständig | Sofort anwenden; kein Zusatzcall |
| leer → gültig | Anwenden |
| leer → ungültig | Dritter Call korrigiert die nun erstmals bekannten Fehler |
| ungültig → leer | Dritter Call verwendet den letzten nichtleeren Kandidaten und seine Fehler |
| leer → leer | Ein größerer frischer Versuch wie bisher, soweit Zeit-/Kostenlimit reicht |
| Transport → ungültig | Ein verbleibender gezielter Repair, soweit Budget reicht |
| ungültig → erneut ungültiger echter Repair | Sicher abbrechen; nicht automatisch endlos weitere Varianten anfordern |
| zweimal Transportfehler | Abbrechen; keine dritte identische Netzwerkwiederholung |
| Edit, echter Swipewechsel, Chatwechsel oder neuerer Turn | Keine weitere Anfrage und kein veralteter Commit |

Harte Obergrenze: drei Requests pro Extractorjob, höchstens eine Transportwiederholung, zusätzlich ein Gesamtzeit-/Kostenbudget. Ein leerer Call enthält keinen Kandidaten, kann also keinen echten schemaorientierten Repair ersetzen. Bereits schema-gültige Kandidaten werden weiterhin nach den vorhandenen Vollständigkeits-/Szenenkriterien ausgewählt; **keine Zusammenführung verschiedener Antworten**.

Dabei die ursprüngliche Fehlerspur behalten: Bei `place`→leer müssen sowohl `unknown type place` als auch der folgende `length` sichtbar bleiben. Heute verdeckt die letzte generische Fehlermeldung teilweise den Erstfehler. Dafür reichen Versuchstyp, Finish-Reason, Tokenzahlen, Antwortlänge und Fehlerpfad; kein Reasoning-Volltext muss neu in Spielrecords gespeichert werden.

**Nicht empfohlen:** Root-`thread` automatisch in die Deltaliste schieben, beliebige `here`-IDs erlauben, `place` blind zu `place.reported` machen oder sämtliche unbekannten Felder ignorieren. Diese Transformationen wissen weder die richtige Sequenz noch die tatsächliche Weltbedeutung.

Eine generische Teilrettung schemawidriger Berichte wäre wesentlich teurer: Ungültige Arrivals verändern den Ort nachfolgender Deltas; ungültige Personen/Objekte machen weitere Referenzen ungültig. Dafür wäre eine belastbare Abhängigkeits- und Chronologieisolation nötig. **Zuerst sinnvolle Recovery bei unverändert strikter Anwendung; kein neuer Teilcommit-Interpreter.**

### 4.4 Providerkonfiguration und Narrator-Recovery als Teil desselben Pakets

Zuerst am tatsächlichen Endpunkt die Wirkung von `reasoning_effort: low` und die Unterstützung strukturierter Ausgabe prüfen. Z.ai beschreibt `response_format: json_object`; das garantiert weder unser vollständiges Schema noch dessen Unterstützung im lokalen Proxy. `src/v4/schema.js` dokumentiert bereits einen Provider, der Schemaangaben annimmt, aber nicht zuverlässig durchsetzt. Ein HTTP-200-Preflight ist deshalb kein Capability-Nachweis. [Z.ai: Structured Output](https://docs.z.ai/guides/capabilities/struct-output).

Mit den archivierten problematischen Prompts eine kleine Vergleichsmessung durchführen: unveränderte Baseline, nachweislich wirksames `low`, dann gegebenenfalls **ein** höheres Budget für den betroffenen Zweck. Beispielsweise Extractor 8000/Narrator 16384 sind Messkandidaten, keine bereits freigegebenen Idealwerte. Gleiche Promptfälle mehrfach vergleichen; Erfolgsquote, Latenz und Gesamttokens statt eines gelungenen Einzelcalls bewerten. Den 120-Sekunden-Engine-Timeout passend zur gemessenen Ausgabezeit begrenzt abstimmen.

Falls der Endpunkt trotz wirksamer Konfiguration für strukturierte Aufgaben ungeeignet bleibt, ist ein nachweislich zuverlässigeres Modell **nur für Planner/Extractor** eine mögliche Betriebsoption. Das ist kein Zwang zum Modellwechsel und erfordert keine Engine-Neugestaltung. `v4Llm` bekommt derzeit alle Rollen über denselben konfigurierten Endpunkt; eine solche Trennung wäre eine bewusste spätere Konfigurationsänderung.

Für leere Narratorantworten empfehle ich maximal **eine** Wiederholung über den vorhandenen ST-Regenerate-Pfad, nicht durch erneutes Senden des Spielerinputs. `prepareGenerationAsync()` verwendet einen unveränderten erfolgreichen Userrecord bereits wieder; `EMPTY_REPLY_NOTICE` fordert den Menschen heute genau zum Regenerate auf. Vor Automatisierung mit echtem ST absichern: keine neue Planung, keine neuen Würfel, Käufe, Payouts oder Forge-Namen. Fälle mit fehlgeschlagener Planung/Board-Retry getrennt behandeln, weil sie absichtlich andere Wiederholungswege haben. Ist die zweite Geschichte wieder leer, sauber stoppen. Erster Ausfall und erfolgreiche Recovery bleiben in der Runstatistik sichtbar.

Das macht Ausfälle beherrschbarer, garantiert aber keine fehlerfreie Modellantwort. Ein sicherer, dokumentierter Abbruch muss möglich bleiben.

### 4.5 Soft-Weiterlaufen ist nicht gleich reparierte Extraktion

Explore Warrior T32/C81 ist zunächst leer, C82 läuft in den 120-Sekunden-Timeout. Der Runner setzt fort, weil `softExtractionFailure()` im Userrecord keine mechanische Handlung erwartet: keine Commands, keine Expected-Keys, `NOTHING TO BOOK`.

Das beweist nur, dass **der Spieler keine Enginehandlung gebucht hat**. Ein Narrator kann trotzdem einen NPC vorstellen, ein Angebot machen oder eine Begleitung etablieren. Solche Informationen sind in einer fehlgeschlagenen Extraktion verloren. Spätere Referenzen auf den Begleiter Tam werden tatsächlich abgewiesen.

Keinen vermeintlich „erfolgreichen leeren Report“ erzeugen. Nach ausgeschöpfter Recovery entweder sauber abbrechen oder ausdrücklich als **degradierter Lauf mit Datenlücke** weiterlaufen. Der Modellspieler muss dann den bestätigten Zustand sehen und darf die verlorenen NPCs nicht als etabliert voraussetzen. Für Balancevergleiche solche Abschnitte markieren. Keine formalen Privatjobs dafür zurückholen.

## 5. Habitat: ein Ortsfehler verändert Questzählung UND Gegnerlevel

### 5.1 Nachgewiesene Kette

`guild.js:bookBoard()` erzeugt neue Jagdgebiete als `kind: site` unter dem Reich und speichert dort `population:{species,anchor,levels}`. Der Vertrag bindet `hunt.at` an diesen Ort.

`world.js:placeParent()` erlaubt für einen neuen `wilderness`-Ort aber nur `realm`, `region` oder `wilderness` als Eltern. Ein vom Extractor ausdrücklich genannter Jagd-`site` wird übersprungen; der neue Unterort landet unter dem Reich.

`domain.js:populationAt()` durchsucht bereits die gesamte vorhandene Elternkette. `engine.js:materialise()` verwendet diese Population bei der ersten Profilbildung für Levelband und `population_at`. Nach Verlust der Hierarchie findet es keine Population und fällt auf die gewöhnliche Umgebungsskalierung zurück. Ein einmal vorhandenes Profil wird anschließend nicht neu materialisiert.

`guild.js:areaOf()` zählt anschließend korrekt nur die Population dieses Auftrags. Die Verweigerung von READY ist ein **Folgeeffekt** der zuvor verlorenen Herkunft. Zusätzliche Rekursion in `populationAt`, Beweiszettel oder ein großzügigerer Killcounter lösen den Fehler nicht.

### 5.2 Originalbelege und wichtige Unterscheidung

**Explore Rogue:**

- T13/m26: `arrive.new` nennt `the larder stone hollow`, `kind:wilderness`, **parent `realm.caelreth.the_reed_flats_eel_weirs`**. Das ist der richtige kanonische Jagdort.
- Gespeichert wird derselbe neue Ort unter **`realm.caelreth`**.
- T14/m28: Mink erhält Level 2 statt des vorgesehenen 1er-Populationsbands und keinen `population_at`.
- T20/m40: `the alder banks downstream` wieder mit richtigem Habitat-Elternort im Extractor; die Engine überspringt ihn erneut. Zweites Tier ebenfalls Level 2 ohne Bindung.
- Siege m31/m51, weiter 0/1. Die folgenden Abgabeversuche können das nicht legal korrigieren.

**Guild Warrior:**

Der Extractor nennt bei den östlichen Reed Beds bereits `realm.duskreach` als Elternort. Beide späteren Marsh Cats stehen deshalb außerhalb der kanonischen Habitatkette und werden Level 3 statt einer bestätigten Einsteigerpopulation. **Hier reicht eine Korrektur von `placeParent` allein nicht:** Die fehlende räumliche Zugehörigkeit wird schon im LLM-Bericht nicht erklärt. Die Engine darf sie nicht aus aktiver Quest plus passender Tierart erfinden.

**Guild Mage – wesentliche Ergänzung zur GPT-Review:**

Der Viererauftrag an den Eel Weirs besitzt ein Band von Level 4–7. Elf Strider sterben:

| Strider | Profilbildung / Ort | Ergebnis |
|---|---|---|
| A, B | m46, direkt im kanonischen Habitat | Level 5/7, zählen |
| C, D | m66/m70, abgetrennter narrativer Unterort | Level 3/1, zählen nicht |
| E, F | m88, Deep Channel außerhalb der Habitatkette | Level 1 und 2, zählen nicht |
| G | m102, Middle Weir Platform als korrekt untergeordnetes `site` | Level 7, zählt |
| H | m110, weiterer Ort; zusätzlich als Jungtier beschrieben | Level 1, zählt nicht |
| I, J | m122/m146, weiterer abgetrennter Kanal | Level 2/1, zählen nicht |
| K | m160, Far Weir korrekt unter dem Habitat | Level 7, zählt |

Damit sind **sieben nicht gezählte Strider** bestätigt. Beim Jungtier darf eine spätere Korrektur zusätzliche Eignungsregeln nicht einfach überspringen. Der Verlauf zeigt dennoch klar: identischer Auftrag, verschiedene Ortskonstruktionen, unterschiedliche Provenienz und Levelwahl. Der anfangs erfolgreiche Wolfauftrag und Explore Mages Viper sind echte positive Kontrollfälle; der ganze Mage-Lauf ist keine ungestörte Kontrollgruppe.

### 5.3 Kleinster nachhaltiger Lösungsweg

1. **Die vom Generator erzeugte Habitatart und erlaubte Unterorthierarchie konsistent machen.** Bevorzugt die ausdrücklich benannte Population eines `site` als möglichen Elternkontext eines natürlichen Unterorts erhalten. Die gemeinsame Elternnormalisierung für Ortsanlage und Szenenvergleich muss dieselbe Regel verwenden. Kein pauschales Entfernen aller Kind-/Parentprüfungen.
2. **Dem Extractor die relevante Hierarchie tatsächlich zeigen:** bei aktuellen/aktiven Jagdorten `id`, `kind`, `parent` und vorhandene Population. Die PLACES-Liste zeigt heute überwiegend ID/Name; Questtexte nennen die Population, erklären aber nicht die Kind-/Parentgrenze. Dem Narrator dieselbe räumliche Zugehörigkeit knapp verfügbar machen. Keine vollständige Weltkarte in jeden Prompt kopieren.
3. **Bestehendes `arrive.new.parent` nutzen.** Bei tatsächlich im Jagdgebiet beschriebenen Unterorten soll der Bericht diesen existierenden Ort referenzieren. Bei Mehrdeutigkeit gezielt nachfragen/reparieren; ein benachbarter oder außerhalb liegender Ort bleibt außerhalb. Die ursprüngliche Run-1-Antwort mit Reich-Elternort darf nicht allein aufgrund einer aktiven Quest automatisch umgestempelt werden.
4. **Profil und Herkunft gemeinsam bei erster legitimer Materialisierung festlegen.** `populationAt` und `materialise` wiederverwenden; keine zweite Quest-Provenienztabelle. Ein früher gesichtetes Tier nicht beim späteren Angriff auf die neue Quest umskalieren.
5. Wenn ein sichtbarer Gegner mechanisch nicht zur aktiven Jagd gehört, diese bestehende Tatsache im geeigneten System-/Questkontext erkennbar machen. Das verhindert zusätzliche Tötungs- und Trophäenschleifen, ersetzt aber nicht die Ortskorrektur.

Alternative: alle neu generierten Jagdgebiete als `wilderness` statt `site` anlegen. Das behebt einen Teil der Zukunftsfälle sehr billig, passt aber nicht zu jedem Yard/Gebäude und lässt bestehende Habitat-Sites unverändert problematisch. Deshalb bevorzuge ich die begrenzte Hierarchiekorrektur plus besseres Kontextangebot.

Keine Rückdatierung von Kills aus bloßer Namensähnlichkeit, keine globale Save-Umschreibung und keine automatische Änderung vorhandener Monsterprofile. Historische falsche Ortsketten sind eine separate, explizite Migrationsfrage. Das normale Laden/Replaying alter Events bleibt unverändert.

## 6. Dungeon und Orte: konkrete Ursache statt allgemeiner Firewall-Lockerung

### 6.1 Explore Warrior bezahlt dreimal, erreicht aber keinen gültigen Eingang

Die Abfolge ist im Original nachvollziehbar:

1. T8: GO nach Glimmerdeep ist autorisiert. Die Geschichte geht bereits ins Innere; der echte Gatecheck verweigert den Eintritt ohne Pass. Diese Ablehnung ist berechtigt.
2. T9/m18: neuer Ort `Glimmerdeep gate` unter dem bekannten Dungeon. `entranceOf()` erkennt den Namen nicht als kanonischen Eingang; die Engine behandelt ihn als Inneres und verweigert wieder.
3. T11/m22: neuer Ort `Glimmerdeep Grotto gate` direkt unter dem Reich. Er wird als **zweiter unabhängiger Ort** `loc.glimmerdeep_grotto_gate` angelegt und erreicht.
4. Dort bietet der erzählte Warden Eintritt als generische Dienstleistung an. T12/m23, T18/m35 und T22/m43 buchen jeweils 10 Kupfer aus unterschiedlichen akzeptierten Angeboten (`offer.t22.3`, `offer.t34.4`, `offer.t38.5`).
5. Es entstehen `transaction.completed` und `service.granted` mit `kind:other`, aber **kein `dungeon.pass`**. Der echte Dungeon verweigert weiterhin den Zutritt.

Zusammen mit 20 Kupfer Registrierung sind die 50 Startkupfer verbraucht. Das ist **keine doppelte Ausführung derselben Transaktion**, sondern dreimal der falsche Leistungsweg für denselben erzählten Zugang. Für den Spieler ist es trotzdem ein erheblicher ökonomischer Fehler.

Lesende Gegenprobe am Originalzustand: `entranceOf` liefert für `Glimmerdeep gate` und `Glimmerdeep Grotto gate` jeweils null; für `Glimmerdeep Grotto academy gate` den korrekten Root. Der Code akzeptiert explizite Gate-Aliasse oder Dungeonname plus passende Ortsbeschreibung, aber nicht allgemein einen eindeutig bezeichneten Eingang dieses Dungeons.

### 6.2 Die zwei zusammenwirkenden Grenzen

- `living.js:entranceOf()` und `world.js:arrivalPlace()` sichern die Ortsidentität nur für erkannte Namen.
- `world.js:offerLines()` schützt kanonische Dungeon-Eintrittsleistungen anhand des tatsächlich erkannten Dungeonkontexts. Am daneben erzeugten falschen Eingang liegt dieser Kontext nicht vor.
- Der richtige Weg existiert bereits: `gateState`, `gateCheck`, `gateOfferEvents` und `bookPurchase` mit `offer.gate` buchen Zugang/Pass deterministisch.

**Empfehlung:** Den vorhandenen Eingangresolver um eindeutige, kontextgebundene Bezeichnungen eines bekannten Dungeon-Eingangs erweitern und für Ankunft **sowie** read-only Szenenabgleich konsistent verwenden. Ein klares „vollständiger bekannter Dungeonname + gate/entrance“ bei passendem Exterior-Kontext kann auf dessen Root verweisen. Ein unspezifisches Tor, ein fremder Dungeon oder ein Innenraum wie eine Gate Hall darf dadurch nicht zusammenfallen. Keine grenzenlose Fuzzy-Suche über alle Orte.

Zusätzlich müssen ausdrücklich diesem bekannten Dungeon zugeordnete Zugangsleistungen am kanonischen Gate-Angebot hängen. Das bestehende Engine-Angebot nutzen beziehungsweise eine unpassende erzählte Eintrittsleistung verweigern; keinen `other`-Service nachträglich in einen Pass umdeuten. Normale Händlerdienste wie Fackeln, Führungen oder Verpflegung bleiben getrennt möglich. Ein Preis allein und das Wort „entry“ berechtigen zu nichts.

Ankunft am Eingang und Eintritt ins Innere bleiben zwei Dinge. Eine tatsächlich bestätigte, autorisierte Reise zum Gate darf dort enden, während der Zutritt noch verweigert wird. **`arrived:false` nicht durch Prosa überstimmen.** Ein Szenenlabel darf keine Reise auslösen. Alte besuchte Räume nicht stillschweigend auf den Root verschieben; die Behandlung bereits gespeicherter Fehl-Eingänge separat begrenzen.

Dieser kombinierte Fix beseitigt die Fehlerklasse „anderer Name → anderer Ort → falsche kommerzielle Autorität“. Nur einen weiteren Namensalias hinzuzufügen würde die Bezahlgrenze nicht ausreichend absichern.

### 6.3 Zusätzlicher Befund: Gefälle wird zur Dungeonebene

Guild Mage T91/m182: Die Geschichte beschreibt links einen Boden, der zu stehendem Wasser abfällt. Der Extractor meldet eine Passage mit `dir:down`. `world.js:passage()` ruft `dungeon.js:levelVia()` auf; aus Level 1 wird deterministisch **Level 2**. Der angelegte `Flooded left fork` besitzt entsprechend `level:2`.

T92/m183 verweigert die Engine den korrekten GO zum linken Gang als `SEALED`, bis der Guardian von Ebene 1 fällt. Der Narrator ignoriert das und erzählt anschließend einen Ghoul. Die spätere Ablehnung dieses Gegners mangels legaler Ankunft ist richtig.

Der Semantikfehler entsteht vorher: Das Feld `dir` meint mechanisch einen Ebenenwechsel; die Vokabularbeschreibung nennt Treppe/Leiter/Schacht, erklärt aber die verbindliche ganze Dungeonebene nicht ausdrücklich. Im Original wird sogar ein bloßes Gefälle als `down` eingetragen. Das rechtfertigt **keine Öffnung des Siegels**.

Kleine Korrektur im selben räumlichen Fachpaket: `dir` eindeutig als Wechsel zur nächsten/vorherigen Engine-Ebene beschreiben; gewöhnliches Gefälle, wenige Stufen oder eine Rampe innerhalb desselben Levels bleiben `null`. Unklarheit durch bestehenden Extractor-Repair klären, nicht anhand eines neuen Wörterzählers automatisch umstufen. Die Modellklassifikation bleibt ein Restrisiko; kein zweites Höhensystem einführen.

### 6.4 Welche Szenenprobleme danach noch übrig bleiben

Die 42 `scene_context`-Ablehnungen des Explore Warrior sind nicht 42 unabhängige Bugs. Ein großer Teil folgt auf den verfehlten Eingang und verweigerte Reisen. Weitere Antworten mischen frühere Geschenke, Weggehen und spätere Begegnungen:

- T38/m76: Geschenke bei Marda, anschließend Weststraße, danach eine neue Person. Die Extraktion beschreibt die Ereignisse nicht durchgehend mit erreichter Szenenfolge. Die Engine bleibt durch ihren Reise-/Zwischenhaltpfad im Dorf; lokale Deltas am Reich werden verworfen.
- T45/m90: erneut ein früherer Uferort in der Extraktion, obwohl bereits ein anderer Ort bestätigt ist.
- Guild Mage T91: Hofereignisse vor der Dungeonankunft, aber kein bestätigter Zwischenhalt an diesem Hof. Ein als entfernt eingeführter Beggar ist nicht automatisch lokaler Gesprächspartner.

Das rechtfertigt weder pauschal mehr Reisezeit noch frei akzeptierte `here`-Deltas. Die bestehenden `arrive`-Sequenzen und `scene`-Felder können diese Abläufe ausdrücken. Erst Startort, tatsächlichen Zwischenhalt und Endort korrekt liefern, dann World auf seine legitimen Prüfungen verlassen.

Gezielte Verbesserung am Extractorkontext: Der aktuelle Startort sollte neben der Chronologieanweisung ausdrücklich stehen. `extractionRequest()` kennt ihn, doch `extractorUser()` verwendet `startScene` nicht; derzeit wird er nur in bestimmten Repair-Hinweisen zusätzlich genannt. Der Katalog enthält Ortsinformation, eine gesonderte kurze Startangabe reduziert aber die unnötige Rekonstruktion. **Dies ist eine begründete Verbesserungsoption, kein Beweis, dass das allein T38 heilt.** Keine komplette zweite Reisesimulation im Parser aufbauen.

## 7. Weitere Befunde und bewusst nicht empfohlene Umbauten

**Boardfehler Explore Warrior T7:** C15 enthält eine Dungeonjagd mit unzulässigem Outdoor-Habitat sowie einen `drowned bull` mit Anchor `aquatic`. C16 repariert die erste Stelle, ändert beim Bull aber nur auf `boar`. Laut vorhandenem Content gehört der Alias `bull` zu `horse`; deshalb bleibt das Board ungültig. Die Verweigerung ist nach aktuellem Vertrag korrekt. Der Repair erfährt aber nur „contradicts the named species body plan“, nicht den bereits deterministisch bekannten erwarteten Anchor. Feldbezogen `erwartet horse, erhalten aquatic/boar` melden wäre eine kleine, allgemeine Verbesserung des bestehenden Repairpfads. **Keine Änderung der Monsterwerte oder neue Bull-Spezies daraus ableiten.**

**Angriffsformulierung Guild Warrior:** Eine sprunghafte Marsh-Cat-Attacke wird zunächst nicht als begonnener Angriff akzeptiert. Das ist ein verbleibender Kandidat für False Negatives der positiven Angriffserkennung, kein Beleg für eine neue Konfliktarchitektur. Im weiteren Verlauf kommt der reguläre Kampf zustande. Nachrangig dokumentieren; nicht nebenbei wieder eine lange Liste natürlicher Formulierungen hinzufügen.

**Private Hilfe:** Explore Warrior findet unterwegs Kontakte, Begleitung und Versorgung. Formal abgeschaffte Privatquests müssen dafür nicht zurückkehren. Wo verlorene Extraktion die Person nicht persistiert, ist die fehlende Person das Problem, nicht ein fehlendes Job-/Lohnframework.

**Kaufatomizität:** Die untersuchten Transaktionen liefern keinen Nachweis, dass `.100` denselben Kauf doppelt bucht. Der falsche Dungeon-Service ist fachlich von doppeltem Commit zu unterscheiden. Ein kompletter Handelsaudit aller denkbaren Pfade ist hier nicht behauptet.

## 8. Konkreter Patchzuschnitt und Abnahmeplan

| Paket | Inhalt / zuständige Stellen | Aufwand und Risiko | Reihenfolge |
|---|---|---|---|
| A – Ausgabevertrag und begrenzte Recovery | `runtime.js` (`ask`, `runExtraction`, Metadaten), `extract.js`, `index.js:v4Llm`; vorhandener ST-Regenerate-/Runnerpfad für leere Geschichte; präzise Board-Repairdiagnose in `guild.js` | Mittel; größtes Risiko sind doppelte Ausführung und verspäteter Commit. Providerkonfiguration verlangt echte Messung. | Zuerst, damit spätere Runs nicht sofort abbrechen |
| B – Habitat-/Unterortkonsistenz | `world.js:placeParent/resolvePlace`, `domain.js:PLACE_PARENTS/populationAt`, `catalog.js` und gezielter Narratorkontext; bestehende `materialise`-Bindung absichern | Klein bis mittel; Risiko versehentlicher Fremdpopulation oder nachträglicher Umskalierung | Danach; unabhängig von A deterministisch prüfbar |
| C – Dungeon-Eingangsidentität und räumliche Bedeutung | `living.js:entranceOf`, `world.js:arrivalPlace/sceneMatches/offerLines`, vorhandene Gatebuchung; Vokabular für Passage-Ebenenwechsel | Mittel; Zugriff, Geld und Ort müssen zusammenpassen. Kein neues Spawnsystem. | Vor dem nächsten umfassenden Erkundungsbatch |

A bündelt die gleichartige Protokollursache, B die einmalige Orts-/Profilbindung, C kanonischen Zugang und Ebeneninterpretation. **Keine Aufteilung in separate Hotfixes für jedes einzelne Tier, Tor oder JSON-Feld.** Die Pakete bleiben fachlich prüfbar; kein Großumbau aller drei Bereiche in einer universellen Hilfsschicht.

### A: notwendige Regressionen

- Original C92→C93, C10→C11 und C58→C59: bisheriges Ende belegen; anschließend erlaubten dritten gezielten Versuch mit korrektem Bericht nachweisen. Der ursprüngliche ungültige Bericht bleibt ungültig.
- Fehlerfolgen leer/ungültig, ungültig/leer, Transport/ungültig, leer/leer, zweimal Transport, echter erfolgloser Repair; korrektes Calllimit und keine Anfrage im Normalfall zusätzlich.
- Abbruch/Edit/Swipe/Chatwechsel während jedes Versuchs: weder weiterer Providercall noch Commit im falschen Chat. Initiales `swipe_id` null/undefined→0 aus `.66` erhalten, echter 0→1-Wechsel bleibt verschieden.
- Genau ein `extract.applied`, keine zusammengefügten Kandidaten, keine doppelten Coins/Objekte/Ankünfte. Gültiger erster Kandidat mit erfolglosem Repair bleibt gemäß bisheriger Auswahlregel erhalten.
- Leerer Narrator nach gebuchtem Kauf/Kampf: ein ST-Regenerate, unveränderter Userrecord und RNG, keine zweite Zahlung; erneut leer sauber beendet. Keine Fortsetzung durch künstliche Erzählung.
- Soft-Weiterlauf enthält eine sichtbar markierte Datenlücke; `commands:[]` wird nicht als Beweis „Narrator hatte keine Weltfakten“ ausgegeben.
- Providerabnahme mit tatsächlichem GLM/Endpunkt und mehreren archivierten Problem-Prompts; Unit-Stubs belegen nur die Retrylogik.

### B: notwendige Regressionen

- Original Explore Rogue m26/m40: ausdrücklich richtig referenzierter Habitat-Site bleibt Vorfahr des Wildnis-Unterorts. Danach Materialisierung mit Habitat-Levelband und `population_at`, regulärer Killcounter/Turn-in/XP genau einmal.
- Mehrere Ebenen von Unterorten und korrektes Site-/Interior-Kontrollbeispiel Guild Mage G/K; bereits funktionierende Fälle unverändert.
- Guild Mage: unterschiedliche Unterortformen derselben belegten Population liefern dieselbe Zugehörigkeit. Jungtier-, Arten- und Rankregeln weiterhin separat prüfen.
- Run-1-Gegenfall: Reich-Elternort ohne belegte Zugehörigkeit wird **nicht** wegen aktiver Quest automatisch an das Habitat gehängt. Ein korrektes Berichtsexemplar mit ausdrücklicher Unterordnung darf zählen.
- Gleiche Species in fremdem Habitat, benachbarte Population, entfernter NPC-/Tierbericht, früher gelocktes Profil, echter Dungeon: keine falsche Bindung oder Umskalierung.
- Replay/Reload/Swipe behalten IDs, Profile, Herkunft und Killcount. Kein nachträgliches Reparieren alter Kills durch neue Interpretation der Originalprosa.

### C: notwendige Regressionen

- Original Glimmerdeep-Kette einschließlich m18/m22 und drei Zahlungsversuchen: ein kanonischer Eingang, gültiges kanonisches Angebot, eine tatsächlich erworbene Zutrittsberechtigung. Wiederholte narrative „Zahl noch einmal“-Behauptung erzeugt keinen neuen Eintrittskauf.
- Anderer Dungeon, allgemeines Stadttor, Innenraum/Gate Hall, unautorisierte Reise, ausdrücklich nicht erfolgte Ankunft, fehlende Gildenberechtigung: Schutz bleibt.
- Legitime generische Dienstleistungen am/außerhalb des Dungeons bleiben kaufbar, verleihen aber keinen Dungeonpass. Kein Automatismus aus bloßer Preis- oder Wortähnlichkeit.
- Original linke Passage T91: Gefälle innerhalb Ebene 1 mit korrekter Extraktion bleibt Ebene 1; echter Abstieg nach Ebene 2 bleibt bis Guardian gesperrt. Ghoul nach abgewiesenem GO weiterhin nicht lokal buchen.
- Geschenk am Startort → bestätigter Zwischenhalt → Endankunft sowie NPC-Eigeninitiative am tatsächlichen Ort; Szenenlabel allein bewegt niemanden.
- Reload/Swipe: Pass, Coins, Root, Raum und Slotpopulation bleiben konsistent; keine zweite Population als Nebenwirkung des Eingangsfixes.

Bestehende Zieltests lesen/erweitern statt parallel nachbauen: insbesondere `patch10b4c1_extractor_recovery`, `patch10b4c2_world_jobs`, `patch10b4c3_recovery_observability`, `patch10b4c4_review_followups`, `patch_run20_technical`, `patch_f_progression` sowie Gate-/Living-Dungeon-Regressionen. Tests, die bisher bewusst eine zu enge Versuchspolitik festschreiben, im Fachpatch ausdrücklich begründet anpassen; nicht als zufälligen Testfehler behandeln.

Nach Umsetzung: angrenzende Tests, volle Node-Suite, **echter ST-Smoke bei den Host-/Recoveryänderungen**, danach begrenzte Providerprüfung und natürlicher Sechserbatch. Ein grüner Smoke mit kontrollierten Antworten beweist keine niedrige Reasoning-Ausfallquote; ein gelungener einzelner GLM-Call beweist keine Replay-Sicherheit.

## 9. Gameplay, Balance und bessere Datensammlung

### Bewertung der Läufe

- **Guild Warrior:** Zwei Siege und 160 XP sind real. Die mehrfachen Trophäen-/Schalterumwege sind jedoch überwiegend Reaktion auf fehlende Populationsbindung. Diesen Run nicht als Beleg „Spieler braucht strengere Questanweisungen“ verwenden.
- **Guild Mage:** 1252 Gesamt-XP, Level 5 mit 252 Rest-XP, 251 Kupfer am Ende, elf Kämpfe und zwölf besiegte Gegner. Davon elf Strider für vier angerechnete Kills. Der Verlauf misst eine Mischung aus vorgesehenen Gegnern und zu niedrig eingestuften Ausweichpopulationen. Keine XP-/Damagekorrektur aus der bloßen Inputzahl ableiten.
- **Guild Rogue:** Fünf Inputs erlauben kein Klassenurteil. Eine erfolgreiche Registrierung endet technisch durch ein beiläufiges NPC-Detail.
- **Explore Warrior:** Kontakte, Reiseversuche und Hilfe sind vorhanden, aber Dungeonzugang und Geldfluss sind erheblich beschädigt. Level 1 ohne Kampf ist bei Erkundung allein kein Balancefehler; dreifache nutzlose Eintrittsleistung ist ein Engineproblem.
- **Explore Mage:** Ein tatsächlicher Viperabschluss, Lootverkauf und anschließende Dungeonerkundung sind brauchbare positive Belege. 70 XP insgesamt (Kampf und Quest) reichen korrekt noch nicht für Level 2. Der Endfehler verhindert weitere Bewertung.
- **Explore Rogue:** Zwei Minks bringen 106 XP, Level 2 mit sechs Rest-XP. Keine erfolgreiche Questabgabe wegen Herkunftsfehler. Der manuelle Stopp ist kein Gegenbeleg für Stabilität bis dahin und keine automatische Fehlermeldung.

**Gear/Skills:** Selbst der Gildenmagier bleibt bei Starterausrüstung und bekannten Skills. Arcane Bolt steht am Ende noch bei P1/36 PP. Viele Gegner sind wegen der Ortsfehler niedrigstufig oder werden ohne qualifizierende Gegenwehr beseitigt; das bestehende `fightQualifies`-System zählt nicht jeden solchen Kampf als vollwertiges Training. Keine automatische PP-Gutschrift und kein Skillsystemumbau daraus ableiten. Zuerst unverzerrte Kämpfe ermöglichen, dann PP-Verlauf und Trainingsangebote bewerten.

### Runner: wenig neue Steuerung, bessere Messbarkeit

Die Umstellung auf drei Guild- und drei Explore-Profile in `54b6e08` ist bereits erfolgt. Alle drei alten Explore-Figuren registrieren sich bei der Gilde; daraus folgt **nicht**, dass der neue Guide seine beabsichtigte unabhängige Erkundung bereits verfehlt hat. Erst den aktuellen Stand laufen lassen.

Sinnvolle Ergänzungen, nachrangig zu den Produktfehlern:

1. **Vorbereitung nach echtem Erfolg:** Nach einer Auszahlung oder einem relevanten Lootverkauf bei passender Stadtgelegenheit prüfen, ob Ausrüstung, Verbrauchsgüter oder Training den nächsten selbst gewählten Schritt verbessern. Keine feste Einkaufsliste, keine Pflichtausgabe, keine vorgeschriebene Quest. Der Mage mit 251 Kupfer und Startergear zeigt eine reale Datenerhebungslücke.
2. **Eine beobachtete Diskrepanz genügt:** Nach Kill ohne Counterfortschritt einmal den Queststatus prüfen und die konkrete Abweichung protokollieren. Bei unveränderter Blockade eine Alternative wählen. Keine zusätzlichen Serien gleichartiger Kills oder erfundenen Bescheinigungen erzwingen. Die bestehende allgemeine Regel gegen erfolgloses Wiederholen ist weitgehend ausreichend; nicht zehn neue Spezialanweisungen ergänzen.
3. **Profile mit passenden Messgrößen vergleichen:** Guild: angenommene/abgeschlossene Quests, Zeit bis Abschluss, korrekte Kills, Vorbereitung. Explore: bestätigte neue Orte/Städte, eigenständige Begegnungen, Einnahmearten, Loot/Handel und bewältigte Gefahren. Level allein ist für einen kampfarmen Reiseverlauf keine Qualitätsmetrik. Level 15 bleibt Ziel, technische Zeit-/Kostenobergrenzen bleiben Schutz.
4. **Erste Fehler nicht durch Recovery unsichtbar machen:** pro Phase Versuch, Failureklasse, Finish-Reason, Tokens, Latenz, erfolgreiche Recovery und verlorene Extraktion ausweisen. Die existierenden Metadaten verwenden; keine weitere Ereignisarchitektur.
5. **Abbruchgründe sauber trennen:** Nutzer-Ctrl+C, providerbedingtes Ende, Enginefehler, Tod und Budgetlimit getrennt im Batchsummary. Beim sechsten Run ist der tatsächliche Nutzerabbruch bereits im Einzelrun nachweisbar; der Wrapper sollte ihn nicht als gewöhnlichen `process_error` zusammenzählen.
6. **Vergleichbarkeit:** Produkt-SHA, konkreten Profiltext/Hash, Modell-/Requesteinstellungen und Seeds mit jedem Lauf archivieren. Nach Fehlerbehebung denselben technischen Stand für den ganzen Batch verwenden. Rohdaten behalten, auch wenn ein zweiter Versuch erfolgreich war.

Zusätzlicher Overhead: In `player.jsonl` stehen insgesamt 284 Spieler-Modellaufrufe für 232 Inputs; 52 ungültige JSON-Antworten wurden mit weiteren Versuchen aufgefangen. Diese Fehler beendeten keinen Run. Deshalb nachrangig messen, ob ein einfacheres bestehendes Entscheidungsformat oder nachweislich wirksame strukturierte Ausgabe hilft. Kein stiller Plain-Text-Fallback, der beliebige Erzählung als Spieleraktion sendet; keine weitere strategische Bevormundung.

## 10. Entscheidungsempfehlung

Vor einem weiteren großen Batch Paket A und B beheben; für aussagekräftige Explore-/Dungeon-Daten auch Paket C aufnehmen. Die drei Ursachen hängen im Spielverlauf zusammen, benötigen aber keine gemeinsame neue Enginekomponente.

- **Nicht mehr dieselben Spezialfälle sammeln:** Wiederholungen nach Fehlerart steuern, statt noch eine `thread`-/`here`-/`place`-Ausnahme einzubauen.
- **Nicht am falschen Ende reparieren:** Ortsidentität und Population erhalten, statt Questcounter oder Zutritt hinterher großzügiger zu machen.
- **Nicht verdeckt die Balance verändern:** Die richtige Population muss wieder das richtige Levelband bekommen. XP, Startwerte, Gegnerformeln und Skills bleiben bis zu saubereren Läufen unverändert.
- **Erzählfreiheit bleibt:** Unbekannte Unterorte, autonome NPCs, Hilfsangebote und außergewöhnliche Kreaturen sind erlaubt. Ihre kanonischen Beziehungen müssen eindeutig sein, bevor davon Kampfwerte, Zugang oder Belohnungen abhängen.

Das ist ein begrenzter Zuverlässigkeitspatch mit drei Fachbereichen, kein Anlass für einen vollständigen Architekturumbau. Ein restliches Risiko falscher Modellinterpretation bleibt; die Engine muss dann sicher ablehnen und der Runner dies sichtbar dokumentieren können.

## Code- und Quellenwegweiser

Codeverweise sind auf den geprüften Entwicklungs-HEAD gebunden; Zeilenangaben dienen der Orientierung, maßgeblich sind die genannten Funktionen.

- [Runtime](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/runtime.js): LLM-Budgets 54ff.; `callMeta/ask` 105ff.; `prepareGenerationAsync` 523ff.; `extractionRequest/runExtraction` 687–791.
- [Extractor](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/extract.js): `extractorUser/Request` 173ff.; `sceneIssues` 247ff.; `parseExtraction` 273ff.
- [Host](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/index.js): `v4Llm` 120ff.; zusammen mit `src/v4/world_jobs.js` für Jobidentität und Commit.
- [World](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/world.js): `placeParent/resolvePlace` 135ff.; `arrivalPlace/sceneMatches`; Reisezwischenhalte 724ff.; `passage` 1880ff.; `offerLines` 2226ff.
- [Domain](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/domain.js): `PLACE_PARENTS` 27ff.; `lineage/populationAt` 290ff.
- [Engine](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/engine.js): `materialise` 365ff.
- [Guild](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/guild.js): `areaOf` 204ff.; `habitatWhy` 535ff.; Boardprompt 679ff.; `parseBoard` 794ff.; Habitatanlage in `bookBoard` 1018ff.
- [Living Dungeon](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/src/v4/living.js): `gateState/gateOfferEvents` 413ff.; `entranceOf` 484ff.; `sealRefusal` anschließend. `src/v4/dungeon.js:levelVia` 357ff.
- [Runner-Auswertung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/54b6e086734d719db35b12aab901e2f666229101/avereth-engine/tools/st_live/live/evaluator.mjs): `softExtractionFailure` 135ff.; außerdem `run_live.mjs`, `players.mjs` und `batch.mjs`.

**Status dieses Dokuments:** Originalquellen unabhängig geprüft; Ursachen und Lösungswege dokumentiert. Keine dieser vorgeschlagenen Korrekturen ist durch diesen Dokumentationscommit implementiert oder technisch abgenommen.
