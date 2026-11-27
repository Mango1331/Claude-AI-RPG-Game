# Avereth .251 – Warum wir die Validierungsarchitektur erneut grundsätzlich diskutieren

**27.11.2026 · Diskussionsstand und ergebnisoffene Grundlage für eine unabhängige Claude-Analyse.** Dies ist weder eine verbindliche neue Produktarchitektur noch ein Implementierungsauftrag. Die im Folgenden aufgeführten Lösungsrichtungen sind Vorschläge zur Prüfung. Der Nutzer hat Claude Pro für einen Monat ausdrücklich zur unabhängigen Codeanalyse und Planung hinzugezogen, nicht zur Implementierung.

- Unveränderte Produktreferenz: [4.3.0-c.6.6.251 / 4933a5f005a86a381a922981d3d7377e8ba84b5c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4933a5f005a86a381a922981d3d7377e8ba84b5c).
- Einziger fortlaufender Entwicklungsbranch: experiment/211-openrouter-helper-single-runner.
- Quellenstand vor diesem Diskussionspapier: main 64a2a7af30b8c30c03e4b72d71c2a8c940b83ae6.
- GPT hat .251 nach unabhängigem Diffreview für den persönlichen Usertest 17 empfohlen (GO mit dokumentiertem Restbefund zur NPC-Anwesenheit). Das ist kein Produktmerge und kein Nachweis eines inzwischen erfolgten persönlichen Usertests.
- [Arbeitsweise](../01_ARBEITSWEISE_GPT_CODEX.md) · [Verbindlicher Kanon](../02_DESIGN_KANON.md) · [Produktstand](../03_AKTUELLER_PROJEKTSTAND.md) · [.251-Fachbericht, Abnahme und Originalarchive](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md).

## 1. Ausgangspunkt: Was den Nutzer stört

Der Nutzer beschrieb die wiederkehrende Problematik nach der Abnahme von .251 so (Originalwortlaut):

> viele fehler korrigieren wir dann mit mini fixes die genau diesen worlaut dann doch akzeptieren. weil erzählerisch ist die LLM gut nur oft meldet es nicht akzeptierte blöcke für die engine. wie würdest du das toleranter machen? weil ich habe schon so viel gesagt das ich es weniger streng haben will usw aber irgendwie reden codex und ich oft auch aneinander vorbei

Es geht nicht darum, den erreichten Produktstand zu verwerfen. Die Engine soll zuverlässige klassische RPG-Mechaniken mit der Freiheit einer LLM-gestützten Fantasy-Sandbox verbinden. Die Erzählung ist häufig plausibel und für den Nutzer bereits verständlich; die anschließend gespeicherten Orts-, Personen- oder Interaktionszustände passen trotzdem nicht dazu. Wiederholte Korrekturen an einzelnen Formulierungen führen zu neuen Sonderregeln. Im nächsten natürlichen Spiel können andere Formulierungen an der gleichen grundsätzlichen Zuständigkeitsgrenze scheitern.

Gewünschtes Spielgefühl: Der Nutzer will natürlich spielen, nicht die interne Engine-Syntax lernen oder bei jedem Gespräch herausfinden, welches englische Schlüsselwort die Prüfungen akzeptieren. HUD und native Befehle sind willkommen, wenn sie gewöhnliche mechanische Entscheidungen zuverlässig vereinfachen. Sie sollen Freitext nicht grundsätzlich ersetzen. Er möchte nicht wieder eine Serie kurzer persönlicher Tests an denselben grundlegenden Fehlern abbrechen.

**Wichtig:** Die Aussage des Nutzers über abgewiesene „Blöcke“ benennt ein beobachtetes Symptom, nicht bereits eine technische Diagnose. Die Ursachen können in Transport, Syntax, Schema, Referenzauflösung, fehlender Plannerabsicht, unzutreffendem Narratorauftrag, fehlender oder falscher Extraktion, semantischen Belegprüfungen, Zustandsabhängigkeiten oder einem legitimen Regelverstoß liegen. Nicht jede Ablehnung ist falsch.

## 2. Warum die Frage gerade jetzt wieder aufkam

### 2.1 Wiederkehrendes Muster trotz echter Produktfortschritte

| Phase | Problem und bisherige Entwicklung | Erkenntnis für diese Untersuchung |
|---|---|---|
| User16 / .220–.221 | Gewöhnliche Annäherung, Hören und Sehen am Dungeonzugang wurden mit tatsächlichem Ortswechsel verwechselt. Lokaler Standpunkt, Beobachtung und Reise wurden getrennt. Sichtbare Gegner waren zunächst nicht als mechanische Ziele verfügbar. | Eine gute Erzählung kann an einer falsch verteilten mechanischen Zuständigkeit scheitern. |
| .222–.235 / AI, AJ, AK | Ossen sagte einer Zusammenarbeit natürlich zu. Der Extractor identifizierte NPC und Angebot; Sprecher- und Zustimmungsprüfung verwarfen die Meldung. Anreden wurden als fremde NPC-Handlungen gelesen. | Eine weitere Liste zulässiger Zusageformulierungen ist keine robuste semantische Lösung. |
| .236–.244 | Dauerhafte Standardparty mit strukturierter freiwilliger Aufnahme, einheitlicher Mitgliedschaft und nativer Verwaltung. Positive tatsächliche Party-, Kampf-, Abrechnungs- und Lernnachweise. | Ein anderes Entscheidungsprotokoll kann die doppelte Interpretation vermeiden. |
| .243/.244 / Hearth, Lantern | Erzählt wurde die Rückkehr zur Gaststube. Der Planner klassifizierte sie als Bewegung innerhalb des Schlafzimmers; die Ankunft und der lokale Handel konnten deshalb nicht gebucht werden. | Die eigentliche Ursache lag vor der Narration, nicht in der späteren Transaktionssperre. |
| .245–.251 | Bekannte Wege, direkter Ortswähler und gemischte Partyhandlungen wurden angebunden. Zimmerkauf, Rast, Rückkehr zur Wirtin, Mahlzeit und Marktbesuch sind im Modellspiel nachgewiesen. Zwei gemeinsame Aufträge, konkreter Ausrüstungskauf sowie Erlernen und Einsatz von Binding Mend Reknit sind ebenfalls belegt. | Wesentliche Mechaniken funktionieren. Eine weitere generelle Architekturänderung braucht eine eigene begründete Entscheidung. |

Quellen: [User16](../testrun_10b/user-20261126-233937-220/) · [Party- und Dungegenreviews .235](AVERETH_235_PARTY_GEGENREVIEW_UND_ENTSCHEIDUNGSVORLAGE.md) · [.236–.244](AVERETH_236_PARTY_UND_EXPLORATIVE_SPIELTESTS.md) · [.245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md).

### 2.2 Der unmittelbare Anlass: NPC-Anwesenheit nach inzwischen erfolgreichem Ortswechsel

**Martin / .251, letzte Rückkehr zum Markt (Chat M15–16, nullbasiert ohne JSONL-Header).** Der Ort wird korrekt gespeichert. Die Erzählung sagt:

> The leatherworker's stall sat where he'd left it, and she looked up from a half-stitched sheath as he came level with the counter.

Der Extractor identifiziert die bekannte Person als npc.npcleatherworker im Ankunftsbeleg. World weist die Meldung mit met_evidence („it does not show them here now“) ab. Der gespeicherte Personenbestand bleibt hinter der Erzählung zurück. Reed übernimmt diesen Zustand und spricht in einem weiteren Zug mit ihr, ohne sie tatsächlich wieder in die Szene zu bringen. Ein späterer Besuch bei ihr zum Kauf wurde nicht erprobt. Die Geschichte bleibt über ihren Hinweis auf den Fischer Tam fortsetzbar.

GPT führte auf .251 die tatsächliche metEvidence-Funktion isoliert mit einem kontrollierten Personenprofil aus: Die ursprüngliche indirekte Beschreibung wird abgewiesen, „The leatherworker looked up ...“ akzeptiert. Ein leerer Stand und eine bereits weggegangene Person bleiben in den Kontrollproben gesperrt. Das ist eine Funktionsgegenprobe, keine erneute vollständige Host-/Providerabnahme.

**Elm / .250, Rückkehr zu Madge (Chat M81–82).** Die bekannte Wirtin zapft Bier:

> He nodded at the counter, where Madge was drawing ale for two carters and taking their coppers without ceremony.

Die met_evidence-Prüfung meldet „it shows a picture of them, not them“. Die in .251 weiterhin vorhandene DEPICTED-Wortliste in narration_evidence.js enthält das Muster drawing\w*. Dieses soll Bilder und Darstellungen von echten Personen unterscheiden, erfasst hier aber das Zapfen von Bier. Die Archivereignisse zeigen ausdrücklich: **Ein anderer gültiger enter-Pfad stellt Madge im selben Zug doch in die Szene.** Der anschließende Mahlzeitenkauf für 3 cp funktioniert. Dieser Einzelfall belegt eine falsche Teilablehnung, keine vollständige Spielblockade.

Originale: [Martin](../testrun_10b/openrouter-20261127-martin-251/) · [Reed](../testrun_10b/openrouter-20261127-reed-251/) · [Elm](../testrun_10b/openrouter-20261127-elm-250/). Produktcode: [narration_evidence.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/narration_evidence.js) (DEPICTED ab Zeile 241, metEvidence/metEvidenceOne ab Zeile 347); [world.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js).

Diese Fälle zeigen, weshalb die Diskussion nicht einfach mit „noch eine Formulierung freischalten“ enden soll. Sie sind bewusst unterschiedlich schwerwiegend. Nicht jede verworfene Einzelmeldung verhindert eine tatsächlich korrekte Buchung.

### 2.3 Erreichter Besitzstand und Grenzen

Die .251-Abnahme meldet 3.609/3.609 Node-Tests, 2.235 historische Replayfälle ohne neue Abweichung, 108 unveränderte User15-Ereignisfolgen gegenüber .244 und 237/237 isolierte ST-Prüfungen. Die Ein-Dollar-Testserie umfasst bis .251 396 physische Requests für 0,252571994 USD; 0,747428006 USD bleiben rechnerisch übrig. GPT prüfte Diff, Heads, Originalauszüge, ausgewählte physische Requests und einzelne Originalfunktionen unabhängig, führte aber nicht die gesamte Node-, ST-, Replay- oder Kostenprüfung erneut aus.

Das GO für den persönlichen Test gilt trotz der dokumentierten NPC-Restabweichung und einer erfolgreichen manuellen Wiederaufnahme nach einem fehlgeschlagenen Weltabgleich. Die noch offenen kleinen Fälle sollen nicht automatisch ein weiteres verpflichtendes Patchpaket auslösen. Die grundsätzliche Architekturfrage wird davon getrennt behandelt.

## 3. Erste externe KI-Stellungnahme und unsere Bewertung

Quelle: vom Nutzer übergebener Chattext „Ich würde den strikten Block-Parser.txt“. Die andere KI erhielt zunächst vor allem die Problembeschreibung des Nutzers, nicht die vollständige aktuelle Avereth-Architektur. Ihr ursprünglicher Ansatz war:

- Strikten Blockparser durch eine zentrale „Sanitizing- & Fuzzy-Pipeline“ ersetzen.
- Markdown und Leerzeichen bereinigen; Schlüssel vereinheitlichen; Tippfehler ungefähr per Levenshtein-Distanz/Fuzzy-Matching abfangen (beispielhaft 80 % Ähnlichkeit).
- Verschachteltes JSON/XML durch einfache Key-Value-Zeilen wie „HP: -10“ und „ITEM_ADD: Alter Schlüssel“ ersetzen.
- Unbekannte oder kaputte Felder überspringen, console.warn protokollieren und das Spiel fortsetzen, möglichst ohne den Spieler zu stören.

Die KI empfahl, Codex einen eindeutigen Architekturauftrag statt immer neuer sprachlicher Einzelfallkorrekturen zu geben.

**GPT-Bewertung nach erneutem Blick auf den .251-Code:**

Die Diagnose der Mini-Fix-Schleife ist relevant; der vorgeschlagene Parserwechsel trifft die konkrete Architektur nur teilweise. Avereth nutzt Planner → Engine → Narrator → Extractor → Weltabgleich/Firewall. Der Narrator bucht nicht einfach freie HP- oder Inventarblöcke. Ein gemeinsamer toleranter JSON-Leser existiert bereits: extractJsonObject in src/v4/json.js verwendet tolerantJson aus src/delta.js, behandelt unter anderem Denkblöcke, Codezäune und verschiedene Syntaxabweichungen. Die genaue Reichweite der Toleranz und sämtliche noch auftretenden Formatfehler sollen geprüft, nicht pauschal als erledigt ausgegeben werden. Der .216-Bericht dokumentiert zudem die lokale Übernahme eines eindeutig falsch verschachtelten Delta-Arrays.

In den beschriebenen Party-, Orts- und NPC-Fällen waren die Antworten häufig bereits parsebar. Das eigentliche Problem liegt später: Zielklassifikation, semantische Belege oder Zustandsübernahme.

| Vorschlag | GPT-Position (vorläufig) |
|---|---|
| Eindeutige Formatnormalisierung zentralisieren | Sinnvoll; tatsächlichen vorhandenen Code und Doppelungen prüfen. |
| JSON generell durch Regex-Key-Value-Zeilen ersetzen | Nicht empfohlen: verschachtelte Angebote, Abhängigkeiten, Personen und Objektinstanzen benötigen eine zuverlässige strukturierte Repräsentation. Alternativen dürfen dennoch verglichen werden. |
| Fuzzy-Matching allgemein ab einem Ähnlichkeitsschwellwert | Zu riskant für Entitäts-IDs, Beträge, Negation, Ziele, Besitzer und irreversible Aktionen. Eindeutige harmlose Normalisierungen sind etwas anderes. |
| Unbekannte optionale Angaben ignorieren | Plausible Möglichkeit; bekannte Wirkung und Abhängigkeiten müssen erhalten bleiben. |
| Fehlerhafte Zustandsänderungen stillschweigend fallenlassen | Problematisch, wenn der Spieler eine andere Welt erzählt bekommt als gespeichert wird. |
| Unabhängige gültige Änderungen trotz anderer ungültiger Meldungen übernehmen | Wichtige Zielrichtung; abhängige/atomare Vorgänge dürfen dadurch nicht auseinandergerissen werden. |

Produktquellen: [json.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/json.js) · [delta.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/delta.js) · [Extractor-Normalisierung .216](AVERETH_216_EXTRACTOR_NORMALISIERUNG.md).

## 4. GPTs grundlegende Gegenposition: semantische Freiheit und harte mechanische Autorität trennen

Die eigentliche Hypothese lautet: Der Extractor wird für semantisches Verständnis natürlicher Sprache eingesetzt, aber nach erfolgreicher Extraktion versucht deterministischer JavaScript-Code teilweise erneut, englische Formulierungen semantisch zu beurteilen. Das kann notwendige Sicherheitsgrenzen schützen; es kann zugleich plausible richtige Meldungen systematisch abweisen.

Zielrichtung: nicht jede natürlich formulierte Weltmeldung anhand einer bestimmten Satzkonstruktion beweisen lassen, sondern möglichst an Zuständigkeit, Quellenbezug, tatsächlichen Spielerentscheidungen und Weltzustand prüfen.

Ein diskutiertes Stufenmodell (keine beschlossene Implementierung):

| Art der Meldung | Mögliche Behandlung |
|---|---|
| Gewöhnliche Erzähl- und Weltinformation | Hohe Toleranz für Motivation, Gerüchte, Gespräche, Beschreibungen, beobachtete gewöhnliche NPC-Anwesenheit. Herkunft, Wissensgrenzen und konkrete Widersprüche weiterhin beachten. |
| Mechanisch relevante Zustandsänderung | Identität, Autorisierung, tatsächliche Situation, plausible Übergänge und Abhängigkeiten prüfen. Semantik nicht unnötig durch Satzschablonen ein zweites Mal bestimmen. |
| Engineeigene oder verbindliche Handlung | Strenge deterministische Autorität für Schaden, HP/MP/STA, XP, Proficiency, Zeit, Geld, Besitz, verbindliche Angebote, Skillfreischaltung, Tod und Questabschluss. Kein freier Prosa-Override, keine Doppelbuchung. |

Beispiel Lederarbeiterin: Das LLM darf eine anwesende, plausible bekannte Person als tatsächlich wieder angetroffen melden, ohne sie in einer künstlichen grammatischen Form nochmals benennen zu müssen. Ein gespeicherter letzter Aufenthaltsort ist nicht notwendigerweise eine unveränderliche Position. Dagegen darf die Orts-ID allein nicht beweisen, dass der Laden besetzt ist, und die Anwesenheitsmeldung allein erlaubt keinen Kauf.

Beispiel Standardparty: Der erfolgreiche neue Weg begrenzt die freiwillige soziale Frage auf eine strukturierte, an NPC und Angebot gebundene Entscheidung. Die Engine bucht diese Entscheidung direkt. Das vermeidet erst freie Prosa und dann erneutes Erraten einer Zusage. Dieser Erfolg ist ein Anlass, ähnliche Entscheidungsschnittstellen zu prüfen, aber kein Beweis, dass sich alle Erzählfunktionen so abbilden lassen.

Es sind mindestens zwei unabhängige Risiken zu untersuchen: legitime Meldungen zu oft verwerfen (false negatives) und unzulässige Meldungen zu leicht akzeptieren (false positives). Eine robuste Vereinfachung braucht positive Spielnachweise und notwendige negative Gegenbeispiele. Kein Blankoscheck für alle Extractorbehauptungen.

## 5. Zweite externe KI-Stellungnahme nach GPTs Antwort

Quelle: vom Nutzer übergebener Chattext „Ich würde den strikten Block-Parser(1).txt“. Die KI revidierte den ursprünglichen Vorschlag ausdrücklich. Sie hält die doppelte semantische Prüfung für das grundlegende Problem und empfiehlt:

> Linguistische Prüfungen löschen: Entfernt aus der Firewall alle Regeln, die englische Sätze auf Formulierungen prüfen. Wenn der Extractor sagt „NPC X ist anwesend“, darf die Firewall nur noch Welt-Fakten prüfen (z. B. Ist NPC X tot? Befindet er sich laut Datenbank am anderen Ende der Welt?).

Außerdem sollten alte zu strenge Tests als überholt markiert und ihre Löschung erlaubt werden. Sie empfiehlt eine gezielte Analyse von narration_evidence.js und der Firewall mit einer konkreten Liste entbehrlicher Prüfungen. Ein neuer Parser sei nicht mehr nötig.

**GPTs aktualisierte Bewertung:** Das Streichen unnötiger linguistischer Regeln ist ernsthaft zu prüfen. Ein pauschales Löschen sämtlicher Sprachbelege wäre aber noch keine abgesicherte Entscheidung. Manche Belegprüfungen schützen tatsächlich die Spielerhoheit, die Zuordnung eines Preises, den Unterschied zwischen Absicht und vollzogenem Ereignis oder die Grenzen einer freiwilligen Entscheidung. Wenn eine solche Prüfung entfernt wird, muss geklärt sein, ob die Schutzwirkung nicht mehr fachlich erforderlich ist, bereits durch eine andere Autorität abgedeckt wird oder in einer einfacheren Struktur erhalten werden kann.

Eine konkrete sichere Löschliste lässt sich aus den beiden Chattexten allein nicht herleiten. Sie erfordert die Untersuchung von Aufrufern, tatsächlichen Daten, Eigentümerschaft der Deltas, Revisionspfaden und ursprünglichen positiven wie negativen Fällen.

### 5.1 Nicht nur die eine Datei untersuchen

Die Diskussion betrifft die ganze Verarbeitungskette:

| Komponente im Produkt | Fragestellung |
|---|---|
| src/v4/json.js, src/delta.js, src/v4/schema.js | Syntaktische Normalisierung, eindeutige Schematoleranz, fehlende vs. widersprüchliche Angaben. |
| src/v4/planner.js, src/v4/agency.js, src/v4/interpret.js | Spielerabsicht, Abhängigkeiten, Reihenfolge, sprachliche Agency-Vetos und mögliche Doppelinterpretation. |
| src/v4/commands.js, src/v4/runtime.js, src/v4/turn.js, src/v4/known_routes.js, src/v4/travel_continuation.js | Wahl und Autorisierung von Handlungen, native Pfade, bekannte Ortswahl und Rückfallebenen. |
| src/context.js, src/v4/catalog.js, content/commands.json, content/deltas.json und Narrator-/Promptverträge | Konsistenz der tatsächlich zugestellten Modellaufträge, Referenzangebote, Wiederholungen und widersprüchliche Regeln. |
| src/v4/extract.js, src/v4/narration_evidence.js, src/v4/finance_evidence.js, src/v4/world.js und die tatsächlichen nachgelagerten Firewall-/Ownership-Pfade | Zuordnung von Weltmeldungen, semantische Belege, legitime Ablehnungen, lokale Übernahme und abhängige Ereignisse. |
| src/party.js, src/v4/party_actions.js, HUD-/Handelsmechanik, Save-/Revisionspfade | Positive Beispiele eindeutiger direkter Entscheidungsautorität; gemeinsame mechanische Zustandsquelle und Revidierbarkeit. |

Die Dateiliste dient zur Orientierung, nicht als vollständige Inventur aller Funktionen. Die aktuelle Implementierung ist maßgeblich.

### 5.2 Tests und Entwicklungskultur

Bisher haben Nutzer, GPT und Codex gleichzeitig natürliche Freiheit, unveränderte Schutzfälle, genaue Zustandsintegrität und möglichst keine historischen Replayabweichungen verlangt. Das kann die Mini-Fix-Strategie begünstigt haben. Diese Erklärung ist eine Arbeitshypothese, keine persönliche Schuldzuweisung.

Grüne Tests sind kein Selbstzweck. Ein exakter historischer Replayfingerprint kann einen bereits bekannten Fehler unverändert reproduzieren. Bei einer später ausdrücklich entschiedenen fachlichen Änderung dürfen überholte Testerwartungen ersetzt und akzeptierte Fingerprints gezielt angepasst werden. **Nicht:** Tests löschen oder Fingerprints pauschal neu schreiben, damit eine unerklärte Änderung als PASS erscheint. Harte mechanische Invarianten, Spielerhoheit, Revisionsschutz und notwendige Gegenproben bleiben Prüfziele.

Die spätere Teststrategie sollte den Schutz vor unzulässigen Aktionen ebenso messen wie unnötige Verweigerungen normaler erlaubter Handlungen. Ablehnungszahlen allein reichen nicht: Eine bewusst abgewiesene erfundene Zahlung ist Erfolg; eine abgewiesene gültige NPC-Rückkehr mit blockiertem Folgegeschäft ist ein Fehler.

## 6. Vorhandene Forschung nicht vergessen

Das Thema ist nicht neu. Die unabhängige Untersuchung soll frühere Versuche kritisch wiederverwenden und prüfen, welche Randbedingungen inzwischen anders sind.

- [.208 Narrator-Trust B/C](USER11_208_GPT_GEGENREVIEW_TRUST_MAJOR_MINOR_2026-11-24.md) und [Firewallvergleich](USER11_208_FIREWALLVERGLEICH.md): B beschränkte zusätzlichen Spielraum auf enge lokale Wege, C ließ bei fehlendem GO unter bestimmten Bedingungen die erzählte Ankunft zu. Im damaligen kontrollierten Vergleich ergaben 41/41 identische Antworten unter A/B/C dieselbe Welt. Der ursprüngliche Bren-Fall profitierte von B; C akzeptierte in gezielten Negativproben drei von fünf nicht gewählten Reisen. Keine gemessene allgemeine natürliche Fehlerrate. Die Planner- und Narratorvorgaben waren weiterhin die alten. Deshalb wurde weder B noch C damals zum Standard gemacht. Das spricht gegen ein pauschales „jede Erzählung ist Wahrheit“, aber nicht gegen eine bessere Zuständigkeitsarchitektur.
- [.210 Spielkontinuität](AVERETH_210_GPT_GEGENREVIEW_SPIELFLUSS_KONTINUITAET_2026-11-24.md): Der Bericht trennt Probleme vor und nach dem Weltabgleich und warnt vor grünen Fingerprints, die denselben Fehler bewahren.
- [.216 Extractor-Normalisierung](AVERETH_216_EXTRACTOR_NORMALISIERUNG.md): belegte, eng begrenzte verlustfreie Formatübernahme; sieben archivierte Antworten und konkrete eingesparte Reparaturaufrufe.
- [.221 Szene, Wahrnehmung, Erinnerung](AVERETH_221_SZENE_WAHRNEHMUNG_ERINNERUNG_UND_RAST.md) und [User16-Entscheidungsvorlage](AVERETH_USER16_ORTS_UND_SZENENARCHITEKTUR_ENTSCHEIDUNGSVORLAGE.md): bewusste Trennung von lokaler Bewegung, beobachteter Welt und echter Ankunft.
- [.235 Party-Gegenreview und Entscheidungsvorlage](AVERETH_235_PARTY_GEGENREVIEW_UND_ENTSCHEIDUNGSVORLAGE.md) und [.236–.244 Umsetzung](AVERETH_236_PARTY_UND_EXPLORATIVE_SPIELTESTS.md): einfachere native Entscheidung statt wiederholter Textinterpretation.
- [.245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md): bekannter GO-Pfad und direkte Ortswahl, kombinierte Partyorganisation, positive längere Abenteuer und dokumentierte Restfälle.
- [Forschungsindex](README.md): weitere Finanz-, NPC-, Gegenstands-, Orts- und Effizienzuntersuchungen; gezielt bei Relevanz heranziehen.

## 7. Offene Fragen und mögliche Lösungsrichtungen für den unabhängigen Prüfer

Wir wünschen eine ergebnisoffene Analyse, keine Bestätigung einer bereits festgelegten Löschaktion. Unter anderem sind folgende Wege denkbar:

1. Bestehende Verarbeitung behalten, aber tatsächlich redundante oder fachlich überstrenge linguistische Prüfungen entfernen und klare Invarianten zentralisieren.
2. Sprachliche Semantik im Planner/Extractor belassen, eindeutig zuordenbare strukturierte Meldungen nach mechanischen Bedingungen übernehmen; Belege gegebenenfalls auf Quellenbindung statt eine zweite Grammatikprüfung begrenzen.
3. Verbindliche Entscheidungen wie bei der Standardparty früher strukturiert treffen, dadurch freie Prosa nicht nachträglich erneut in dieselbe Entscheidung umwandeln. Native Aktionen gezielt erweitern, sofern dies Spielspaß und Aufwand verbessert.
4. Unabhängige Weltmeldungen fehlertolerant übernehmen und nur tatsächlich abhängige Vorgänge sperren oder nachvollziehbar klären. Nicht ungeprüft jedes unvollständige Delta als harmlose Information behandeln.
5. Andere Formate, Modellrollen oder eine andere Gesamtarchitektur prüfen, wenn sie anhand der tatsächlichen Kosten, Qualität und Migrationsfolgen einen Vorteil zeigen.

Der Prüfer darf alle Hypothesen verwerfen, präzisieren oder übernehmen. Er darf feststellen, dass bestimmte aktuelle Prüfungen notwendig sind und dass das Problem anderswo liegt. Ziel ist nicht ein möglichst großer Löschdiff, sondern eine nachweislich einfachere und spielbarere Lösung.

Erwartete Entscheidungsgrundlage: konkrete Produktfunktionen und ihre Aufrufer, nachvollziehbare Originalfälle, Schutzwirkung, Ausfallfolgen, mögliche Entfernung/Zusammenführung/Ersetzung, erwartete Auswirkungen auf Spielgefühl, Codeumfang, Promptbedarf, Modellaufrufe, Kosten, Revisionen und zukünftige Tests. Bei einer Empfehlung zur Abschaffung einer Regel muss deren ursprünglich geschützter Fall fachlich nachvollziehbar behandelt werden.

## 8. Warum jetzt Claude – und wie die Rollen getrennt bleiben

GPT hatte zunächst ein befristetes Claude-Pro-Abo zur unabhängigen Architekturkritik vorgeschlagen. Die andere KI empfahl stattdessen eine kleine separate API-Ausgabe und verwies auf Pro-Nutzungslimits. GPT hielt die API für eine mögliche Alternative, wies jedoch darauf hin, dass die tatsächlichen Kosten einer mehrstufigen Repositoryanalyse nicht aus einer pauschalen Schätzung folgen und auch APIs Kontext- und Rate-Limits haben. Die Abo-/API-Frage ist durch die Nutzerentscheidung vorerst erledigt; sie ist nicht Gegenstand der Enginearchitektur.

Der Nutzer hat nun ausdrücklich Claude Pro für einen Monat gewählt. **Claude soll das Produkt nicht implementieren.** Der Nutzen besteht in einer unabhängigen Perspektive aus einer anderen Modellfamilie, die nicht bereits an unsere gewachsenen Lösungsentscheidungen gebunden ist.

- Nutzer: entscheidet über Spielgefühl, Kanon, Prioritäten und Umsetzung.
- GPT: hält Projektzusammenhang, fasst diese Diskussion zusammen, bewertet Claudes spätere Analyse unabhängig und formuliert freigegebene Arbeitsaufträge.
- Codex: bleibt Implementierer, technischer Tester und unabhängiger Gegenprüfer auf Basis ausdrücklicher Aufträge.
- Claude: unabhängige Code-/Architekturanalyse und konkrete Planungsvorschläge; darf eigene Schwerpunkte und Empfehlungen setzen, auch zustimmen. Ergebnis als Markdown-Bericht auf main. Kein Produktpatch, keine unaufgeforderte Kanonänderung, kein Produktmerge, kein neuer Entwicklungsbranch und keine bezahlten RPG-Providerrequests.

**Der Diskussionsstand lässt .251, seine Testfreigabeempfehlung und den verbindlichen Produktkanon unverändert.** Eine spätere Vereinfachung wird erst nach dem Claude-Bericht und der gemeinsamen fachlichen Bewertung entschieden.

Leitfrage: **Welche Entscheidungen muss Avereth deterministisch absichern, und welche sollte es dem Sprachmodell oder einer direkt gewählten mechanischen Aktion überlassen, damit korrekt erzählte und gewollte Handlungen auch tatsächlich spielbar bleiben?**
