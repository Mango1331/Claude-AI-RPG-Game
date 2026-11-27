# Avereth .251 – Ausführlicher unabhängiger GPT-Gegenreview der Claude-Analyse mit zweiter Selbstprüfung

**27.11.2026 · Analyse und Entscheidungsvorbereitung, keine Implementierungsfreigabe.**

Der Nutzer hat Claude für einen Monat zur unabhängigen Codeanalyse und Planung hinzugezogen. Dieser Gegenreview bewertet den veröffentlichten Claude-Bericht vollständig, überprüft zentrale Tatsachen anhand des Produktcodes und hinterfragt ausdrücklich auch die zuvor von GPT selbst empfohlenen Anpassungen. Claude soll danach seine Analyse auf dieser Grundlage eigenständig revidieren oder begründet beibehalten. Das Ziel ist kein Konsens um jeden Preis, sondern eine tragfähige, tatsächlich vereinfachte Architektur.

| Bezug | Referenz |
|---|---|
| Unverändertes Produkt | [4.3.0-c.6.6.251 · 4933a5f005a86a381a922981d3d7377e8ba84b5c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4933a5f005a86a381a922981d3d7377e8ba84b5c) |
| Entwicklungsbranch | experiment/211-openrouter-helper-single-runner |
| Bewerteter Claude-Bericht | [Vollständige Analyse, Stand 13fa3587dca3b417a4d39822ddd25bbe2e3e7cfd](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/13fa3587dca3b417a4d39822ddd25bbe2e3e7cfd/recherche/AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) |
| Vorherige Diskussion | [Diskussionsgrundlage](AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) |
| Produkt- und Spielnachweise | [.245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md), [.236–.244](AVERETH_236_PARTY_UND_EXPLORATIVE_SPIELTESTS.md), [.222–.235](AVERETH_222_235_OPENROUTER_SPIELTESTSERIE.md) |

## 0. Ergebnis und Leitentscheidung

**Ich empfehle Claudes Variante V1 („Claim + State“ in P/N/X) grundsätzlich weiterhin.** Die zusätzliche semantische Nachinterpretation durch JavaScript ist ein belegtes strukturelles Problem. Ein Wechsel des Ausgabeformats oder eine neue Gesamtengine ist nicht erforderlich. Die Aufteilung in Planner, Engine, Narrator und Extractor hat einen nachweisbaren Nutzen.

Die zweite Prüfung meiner eigenen Empfehlungen verschärft allerdings zwei Anforderungen an den späteren Plan:

1. Die Vereinfachung muss wirklich Prüfungen entfernen. Weder dürfen die alten Satzparser hinter neuen Pflichtfeldern als reguläre zweite Prüfung bestehen bleiben, noch dürfen für jedes harmlose Delta neue Beweis-, Klassifikations- und Abhängigkeitsformulare entstehen. Ein bereits eindeutig semantischer Meldungstyp kann selbst eine ausreichende Klassifikation sein.
2. „Harte Zustandsintegrität“ bedeutet mehr als korrekte Zahlen. Spielerentscheidungen, konkrete Besitzübergaben, die Identität und tatsächliche Herkunft von Wissen sowie räumlich/zeitlich gebundene Ereignisse bleiben bedeutsam. Schutz richtet sich nach der tatsächlichen Wirkung, nicht allein nach einer historischen Liste von Befehlstypen.

Die Restunsicherheit bei gewöhnlichen plausiblen Erzählmeldungen ist bewusst akzeptierbar. Es wird weiterhin gelegentlich eine mehrdeutige Person, ungenaue Beschreibung oder unvollständig gespeicherte Erinnerung geben. Der Gewinn an natürlicher Spielbarkeit ist wichtiger als die Verhinderung jedes denkbaren kleinen Erzählfehlers. Das gilt ausdrücklich nicht für erfundene freiwillige Spielerhandlungen, unzulässige Transaktionen oder zerstörte Saves.

**Kein neuer NO-GO für .251.** Die bereits erteilte Empfehlung für den persönlichen Usertest bleibt als spielbarer Besitzstand erhalten. Diese Untersuchung betrifft eine spätere Entwicklungsetappe. Keine weiteren bezahlten Modelltests, keine Produktänderung und keine Kanonänderung allein aufgrund dieses Reviews.

## 1. Prüfgrundlage, unabhängig bestätigte Befunde und Grenzen

### 1.1 Was tatsächlich geprüft wurde

GPT hat den vollständigen Claude-Bericht (620 Zeilen), seine Analyseskripte und das Ergebnisprotokoll gelesen. Im ersten Gegenreview wurden beide Remote-HEADs und der Dokumentationsdiff überprüft. Claude hat nur den Bericht, einen Indexlink und reproduzierbare Analysedateien veröffentlicht.

Die isolierten Proben wurden erneut anhand der aus dem Produktcommit gelesenen tatsächlichen Funktionen ausgeführt: metEvidence, presenceInReply, personProfile, narratedEvent, findQuote und die zugehörigen Wortlisten. Dabei wurden die Module in einem isolierten JavaScript-Kontext mit den benötigten Originalhelfern geladen; für nicht benutzte Münzumrechnung wurde ein Stub eingesetzt. Dies ist keine erneute vollständige Engine-/Hostausführung.

In der zweiten Selbstprüfung wurden insbesondere die realen Aufrufer und Datenflüsse in world.js, delta.js, extract.js, runtime.js, agency.js, place_book.js, place_refs.js, party.js, party_actions.js, finance_evidence.js und ownership.js sowie die betreffenden Kanonregeln erneut gelesen. Eine weitere isolierte Gegenprobe untersucht die Wirkung der bereits vorhandenen Option language:false in guardCommands. Die Testfälle sind kontrollierte Inputs, keine neuen Modellantworten.

**Nicht ausgeführt:** sämtliche historischen Replays, vollständige Node- und ST-Abnahme, vollständiger erneuter Abgleich aller 217 selektierten Archivantworten und sämtlicher Providerquittungen. Die neue Zielarchitektur existiert nur konzeptionell. Prognosen zu Codezeilen, Tokenersparnis, Modellgenauigkeit und Reparaturrate sind deshalb keine gemessenen Produktverbesserungen.

### 1.2 Die zentrale Diagnose ist bestätigt

Die Charakterisierung eines „versteckten vierten Interpreten“ ist hilfreich, sofern darunter keine einzelne vierte Modellstufe verstanden wird. Es sind mehrere verstreute semantische Prüfungen vor und nach der Narration:

- Planner interpretiert die gewollte Handlung; der Agency-Guard beurteilt erneut Frage, Verneinung, Zeitpunkt und handelnde Person.
- Die GO-Verarbeitung verwendet zusätzlich Formulierungs- und Rückfallregeln zur Zielklassifikation.
- Extractor interpretiert Prosa, Identitäten und Weltfolgen; Schema- und semantische Nachprüfung erzwingen teilweise parserfreundliche Belege.
- World und nachgelagerte Helfer interpretieren erneut Person, Sprecher, Anwesenheit, Preise, Zeugenschaft und andere Bedeutungen.

Das ist nicht gleichbedeutend damit, dass alle Prüfungen redundant sind. Ein strukturiertes Ergebnis darf beispielsweise keine Ressource verändern, für die es keine Autorität hat. Die mechanische Zuständigkeit und Wirkungskontrolle in ownership.js ist gerade eine sinnvolle Absicherung, die nicht durch die Fähigkeit eines LLM zum Sprachverständnis ersetzt werden kann.

### 1.3 Unabhängig reproduzierte Anwesenheitsproben

| Kontrollierte Satzsammlung | metEvidence | presenceInReply |
|---|---:|---:|
| 14 positive, natürliche Anwesenheitssätze | 4 richtig akzeptiert, 10 falsch abgelehnt | 11 richtig akzeptiert, 3 falsch abgelehnt |
| 9 negative Sätze | 9 richtig abgelehnt | 7 richtig abgelehnt, 2 falsch akzeptiert |

Auch die sieben zusätzlichen Wortlistenproben ergeben dasselbe Resultat wie bei Claude: Bier/Wasser zapfen oder schöpfen, Braten schneiden, ein gezogenes Schwert, Karten zeichnen und gewöhnliche Szenenbeschreibungen lösen fälschlich Bild-, Abwesenheits- oder Präsenzablehnungen aus.

Diese kontrollierten Beispiele bestätigen die Funktionsdiagnose. Es handelt sich um gezielt konstruierte Sätze und Profile, nicht um repräsentative Fehlerraten realer Modelle. Der strengere Parser erkennt in dieser kleinen Negativsammlung alle neun Fälle; der lockerere Parser ist kein brauchbarer allgemeiner Ersatz.

Die tatsächlichen Pfade sind unterschiedlich: absentKnown in [world.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L600) ist bei einer bekannten Person mit demselben gespeicherten Ort falsch. metArrivals prüft dennoch metEvidence. enter, aware und position können über den vorhandenen bringIn-Pfad eine lebende Person desselben Ortes in die Szene bringen. Der Tod bleibt im Reducer geschützt. Claude hat die Inkonsistenz richtig gefunden.

Elm belegt zwei unterschiedlich behandelte Meldungen desselben Anwesenheitsereignisses („drawing ale“), aber keine vollständige Blockade: Madge wurde über den anderen Pfad eingetragen und die Mahlzeit tatsächlich gekauft. Martin/Reed belegen dagegen die fehlende Eintragung der Lederarbeiterin. Beide Fehlerbilder sind wichtig und müssen in der späteren Abnahme getrennt betrachtet werden.

Quellen: [Claude-Proben](claude_251_analyse/probe_presence.mjs) · [Wortlistenprobe](claude_251_analyse/probe_depicted.mjs) · [Ergebnisprotokoll](claude_251_analyse/ERGEBNISSE.txt) · [Martin](../testrun_10b/openrouter-20261127-martin-251/) · [Reed](../testrun_10b/openrouter-20261127-reed-251/) · [Elm](../testrun_10b/openrouter-20261127-elm-250/).

### 1.4 Grenzen und Korrekturbedarf der quantitativen Aussagen

Claudes Zählung zeigt die Relevanz des Problems. Sie sollte vor einem späteren A/B-Nachweis präzisiert werden, ohne deshalb eine neue große Forschungsrunde zu beginnen.

| Behauptung im Bericht | GPT-Gegenprüfung / notwendige Präzisierung |
|---|---|
| 217 Erzählerantworten, 59 repariert, 4 vollständig gescheitert | Ergebnis des veröffentlichten Auswahlskripts; die vollständige Archivzuordnung wurde hier nicht nachgerechnet. Das Protokoll nennt außerdem eine unvollständige Extraktion. |
| Die Serie .222–.251 stammt von einer einzigen GLM-Modellroute | Falsch als pauschale Aussage. Der [.222–.235-Bericht](AVERETH_222_235_OPENROUTER_SPIELTESTSERIE.md) weist GLM-5.3-Flash, GPT-4.1-mini und GPT-5.4-mini aus. Die späteren beiden Serien verwendeten GLM. Trenne nach tatsächlicher Stage/Modellroute oder kennzeichne die gepoolte Stichprobe entsprechend. |
| 24 met_evidence-Ablehnungen, 23 davon falsch | Die veröffentlichte Zitatliste enthält 25 Zeilen, davon zehn ohne scene.entered im selben Antwortrecord. Das ist nicht automatisch ein Widerspruch (ein verworfener Eintrag kann mehrere Belege treffen). Vor einer exakten Zahl Fälle über eindeutige Ablehnungsereignisse statt bloße Personensuche deduplizieren. |
| Neun tatsächliche Zustandsdivergenzen | entered_otherwise misst nur ein Eintrittsereignis in diesem Record, nicht den vollständig gefalteten Endzustand. Anwesenheit kann bereits bestehen oder später im selben Zug enden. Die Zahl ist vorläufig, Martin ist als tatsächliche Divergenz belegt. |
| 23 eindeutige positive Originalbelege | Teilweise zu stark: „the pickpocket-thin boy still lounged, or a boy very like him“ ist keine eindeutige Identitätsbestätigung. „its words are not in the reply“ (Willow) betrifft zunächst Belegbindung, nicht nur Grammatik. Labeln als klar richtig, klar falsch oder tatsächlich unklar; Garrick-Negativbeleg mit vollständiger Prosa prüfen. |
| 67 zusätzliche X-Aufrufe; 38 semantisch, 22 Schema, 6 gemischt, 1 sonstiger | Diese Zahlen stehen im Ergebnisprotokoll. Die Zwischenmeldung nannte eine andere Unterteilung; maßgeblich soll die endgültige, nachvollziehbare Zählung sein. repair_triggers.py klassifiziert nach Nachrichtenanzahl und Textmustern. Das ist eine brauchbare Näherung, aber keine direkte Verifikation aller Requestzwecke. |
| 937.825 von 4.273.296 X-Inputtokens für Reparaturen (~22 %) | Als ausgewiesene Stichprobenzahl übernehmen, nicht als gemessene Einsparung. Schon die frühere Modellserie enthält unterschiedliche Modellrollen, X-only-Fortsetzungen und Reparaturen. |

Die Auswahl der letzten N extrahierten Nachrichten (N = Narratorstarts) kann bei abgebrochenem Narrator, reinem X-Retry, veränderter Historie oder übernommenem Präfix falsch zuordnen. Das Skript tally_runs.py behandelt attempt=0 anders als met_quotes.py. Für belastbare spätere Vergleichsmessungen besser die tatsächlich überprüften Eltern-/Endnachrichtengrenzen, eigene Record-/Request-Identitäten und physische Quittungen verwenden. Nicht notwendig, um jetzt die klar belegten Funktionsfehler anzuerkennen.

Außerdem ist die Aussage „Falsche Ablehnungen misst bisher nichts“ zu absolut. Es existieren positive Rot/Grün-Originalgegenproben und natürliche Kampagnenabnahmen. Es fehlt vor allem eine systematische, vergleichbare Messung der semantischen Annahme-/Ablehnungsqualität, die nicht lediglich alte Fingerprints bewahrt.

## 2. Entscheidung über das Architekturprinzip

V1 ist der sinnvollste nächste Schritt. Die weiteren Varianten beurteilen wir wie folgt:

| Variante | Zweite GPT-Bewertung |
|---|---|
| V0: weitere Einzelfixes | Nicht als allgemeine Strategie. Kleine notwendige Korrekturen bleiben selbstverständlich zulässig. |
| V1: Claim + State, weniger Satzanalyse | Empfohlen, mit tatsächlicher Entfernung der überholten Prüfungen und abgestimmten Modellverträgen. |
| V2: N und X in einem Call | Interessante spätere Effizienzuntersuchung. Nicht Teil der jetzigen Änderung; Streaming, Swipe, unvollständige Antworten und Trennung von Prosa/State müssten separat bewertet werden. |
| V3: deterministische NPC-Tagesabläufe | Nicht nötig. Würde das Problem durch umfassendere Simulation und neue Datenpflichten ersetzen. |
| V4: Planner abschaffen / Narrator entscheidet | Derzeit nicht empfohlen. Frühere Trust-Experimente zeigen relevante Spielerhoheitsrisiken. |
| V5: mehr native Aktionen | Ergänzend sinnvoll. Bestehende HUD-Pfade nutzen, keine Pflicht-Menüs als Ausweichlösung für normales Rollenspiel. |

**Künftige Autorität: Modell für Semantik, Engine für tatsächlichen Zustand und Zulässigkeit, Spieler für eigene bindende Entscheidungen.** Der Satz „Bedeutung entscheidet das Sprachmodell“ ist als Designrichtung richtig, nicht als Garant dafür zu verstehen, dass ein Modell jede Frage richtig beantwortet. Fehlklassifikationen werden mit der neuen Architektur anders behandelt und getestet, nicht magisch beseitigt.

Wir dürfen aus Sorge vor neuen Fehlzulassungen nicht wieder eine immer umfangreichere semantische Doppelprüfung einführen. Einfache konsistente Zustandsgrenzen reichen in vielen gewöhnlichen Situationen aus. Ein seltener korrigierbarer NPC-Erzählfehler ist ein akzeptabler Preis für eine wesentlich freiere natürliche Interaktion.

## 3. Detaillierter Gegenreview P1–P10

### P1 – Einheitliche Anwesenheitsregel: übernehmen, aber Schnittstelle verschlanken

Die Diagnose und das Ziel sind eindeutig richtig. Ein lebender bekannter NPC am plausiblen Ort soll bei einer aktuellen Begegnungsmeldung nicht zusätzlich eine englische Verb-Whitelist passieren.

**Zweite Selbstprüfung:** Meine erste Antwort verlangte für neue Meldungen eine eindeutige semantische Aussage. Das ist weiterhin sinnvoll, darf aber nicht mit einem Pflichtfeld seen an jedem Delta gleichgesetzt werden. Ein eindeutiger enter- oder met-Typ kann selbst bereits „hier jetzt“ bedeuten. Mehr Felder, mehr Belegzitate und mehr ungültige Antwortformen wären ein Rückfall in die alte Architektur.

Empfehlung:

- Eine gemeinsame mechanische Aufnahmeentscheidung für alle Wege, die tatsächliche NPC-Anwesenheit erzeugen. Keine strengere met-Sonderbehandlung und kein ungeprüfter aware-/position-Nebeneingang.
- Wähle den kleinstmöglichen eindeutigen strukturierten Vertrag. Eine positive Anwesenheitsbehauptung (in einem dafür definierten Typ oder Feld) genügt bei einer gewöhnlichen, plausiblen bekannten Person. „mentioned“, „away“, „unsure“ dürfen nicht durch einen anderen Meldeweg unbeabsichtigt in „present“ umgedeutet werden.
- Identität, Tod, aktuelle gebundene Zustände und tatsächlicher Szenenbezug prüfen. Keine Fuzzy-IDs. Ein alter letzter Beobachtungsort ist kein permanent gültiger Aufenthaltsort.
- Eine gewöhnliche Rückkehr muss nicht zwingend mit einem exakten, zusammenhängenden, den Namen wiederholenden Satz belegt werden. Quellenbindung an die aktuelle Antwort/Revision genügt in vielen Fällen; ein kurzer Beleg kann bei tatsächlich unsicherer oder neuer Ankunft hilfreich sein. Die Belegprüfung darf nicht wieder die Semantik mit anderen Wortlisten erraten.
- Kein zusätzliches Modell nur zur Validierung jeder Anwesenheitsbehauptung. X entscheidet im bestehenden Aufruf.
- Bestehende explizite NPC-Zustände (Warten an einem anderen Ort, aktiver Kampf, Tod) werden nicht durch allgemeine Prosa aufgehoben. Eine echte autonome Entscheidung darf einen solchen Zustand über seinen dafür vorgesehenen Weg ändern.

Claudes Pseudocode verlangt zunächst literalExcerpt für alle Meldungen, die spätere Kanal-/Migrationsbeschreibung macht den Beleg am bekannten Ort optional. Claude soll diese beiden Aussagen vereinheitlichen. Die Lösung soll nicht heimlich eine neue Ablehnungsursache aus fehlendem seen erzeugen. Neu erzeugte Antworten sollen den vereinbarten eindeutigen Vertrag nutzen, bereits gefaltete alte Events unverändert bleiben.

**D2 / Entfernung:** Claude hat recht, dass keine umfassende NPC-Reisesimulation nötig ist. Ich würde auch nicht für jede normale Ankunft aus einer anderen Siedlung eine nachgerechnete NPC-Reisezeit verlangen. Ein structuriert gemeldeter tatsächlicher Ankunftsvorgang ist grundsätzlich genügend, sofern er mit den wenigen wirklich bindenden Zuständen vereinbar ist. Ein globales sameSettlementOrUnknown/arrives-Gate allein ist jedoch kein Beweis: Innenräume, geschützte Grenzen und wartende Begleiter müssen nicht nur auf Siedlungsebene stimmen. Unbekannter letzter Ort soll nicht unnötig sperren; konkrete unmögliche oder widersprüchliche Ankunft bleibt unzulässig. Claude darf hierfür eine einfachere fachliche Regel als seinen bisherigen Pseudocode empfehlen.

**Positive/negative Abnahme:** Martin/Reed, Elm, Gildenschalter, Juniper; direkte und indirekte Beschreibungen; bekannte NPCs mit eigenem plausiblen Aufbruch, neue Person gleicher Rolle, leerer Stand, Unsicherheit, Tod und gebundener wartender Begleiter. Bei Ablehnung einer Person nicht automatisch alle übrigen Szenenereignisse verlieren. Die bisherigen metEvidence-Proben dienen als semantische Aufgaben für das Modell, nicht mehr als Pflicht, englische Sätze deterministisch aus JavaScript zu verstehen.

### P2 – Ablehnungskaskaden: nach tatsächlicher Abhängigkeit, nicht grober Typenliste

Claudes Ziel ist richtig. Bei einem abgewiesenen Ortswechsel darf nicht jede davon unabhängige Information automatisch verloren gehen.

Die zweite Codeprüfung bestätigt die Gefahr einer zu groben Lockerung: world.js verwendet nicht nur localSceneDelta und scene_context, sondern auch blockedPeople, blockedCreatures, die tatsächliche Reihenfolge und quest_dependency. coin.gift kann über giftFree nach weiteren Beleg-/Zuständigkeitsprüfungen unmittelbar coin.changed und transaction.completed erzeugen. Ein memory- oder thread-Delta kann wiederum falsche Weltbehauptungen in spätere Kontexte eintragen.

- Tatsächlich am Ausgangsort beobachtete oder legitim erhaltene Informationen dürfen erhalten bleiben.
- Eine vom nicht erreichten Ort abhängige Begegnung, Zahlung, Übergabe, Wissensbuchung oder Folgequest darf nicht durch die Klassifikation „ortsunabhängig“ plötzlich stattfinden.
- Eine legitime Fernbeobachtung oder ein ausdrücklich berichteter Hinweis ist etwas anderes als eine persönlich erlebte Szene.
- Keine Umdeutung einer nicht erfolgten Begegnung in ein angeblich wahrheitsgemäßes persönliches Gedächtnis. Freie Erzählprosa bleibt im Chat ohnehin erhalten.
- Abhängigkeiten soweit möglich aus vorhandener Chronologie, Autorisierung, Szene, Quellbezug und depends_on ableiten. Keine neue umfassende Abhängigkeitsdatenbank oder Pflichtannotation für jede Information.

**Selbstkorrektur:** Meine erste Formulierung „nach tatsächlicher Abhängigkeit entscheiden“ darf nicht dazu führen, dass Codex für jeden einfachen Thread einen komplexen Abhängigkeitsgraphen entwickelt. Eine kleine, gut begründete Einteilung nach typischer Wirkung plus vorhandener Herkunft und klarer Ausnahme für ortsgebundene Transaktionen kann genügen. Bei tatsächlich unklarer harmloser Information ist Verlust einer optionalen Meldung oder Erhalt als nichtautoritativer Bericht zulässig; kein Modellretry allein dafür.

Abnahme muss zwei Richtungen zeigen: unabhängige gültige Information bleibt erhalten; null unberechtigte Ortsfolgen oder Geld-/Besitzbuchungen am nicht erreichten Ort.

### P3 – Delta-genaue Fehlertoleranz: klar übernehmen

Die tatsächliche Implementierung bestätigt den Kernbefund. parseExtraction liefert valid anhand der gesamten Schemafehler; runExtraction speichert einen Kandidaten nur bei p.valid und entscheidet über einen begrenzten Repair-Pfad. applyExtraction erzeugt bei fehlendem valid eine fehlgeschlagene Extraktion statt der übrigen nutzbaren Weltmeldungen. Es gibt bereits Normalisierungen und Behandlung fehlender erwarteter Felder, aber noch keine allgemeine sichere Übernahme gültiger unabhängiger Teilergebnisse.

Ich würde eine **kleine, gut definierte Teilvalidierung** einführen:

1. Eindeutige vorhandene Formatnormalisierung weiterverwenden.
2. Einzelne vollständig interpretierbare Deltas und die tatsächlich erforderlichen mechanischen Bestätigungen validieren.
3. Ungültige optionale Informationen auslassen und protokollieren. Unbekannte Typen nicht durch Fuzzy-Matching in einen bekannten mechanischen Befehl verwandeln.
4. Notwendige zusammengehörige Bestätigungen und Transaktionen unverändert als Einheit behandeln. Ein ungültiger abhängiger Schritt darf nicht durch einen anderen gültigen Teil heimlich abgeschlossen werden.
5. Den bestehenden begrenzten Repair nur bei entscheidender fehlender Information nutzen, nicht wegen jedes unbekannten Faktfeldes.
6. Die endgültig übernommenen Events einmal unter der vorhandenen Ursprung-/Revisions-/Save-Sicherung buchen. Kein separater Teilcommit vor einer erneuten X-Anfrage, der später Doppelbuchung oder eine neue Ereignishistorie erzeugt.

Die Liste „mechanisch“ muss nach Wirkung geprüft werden. Eine harmlose optionale Offer-Beschreibung ist nicht dasselbe wie ein fehlender Endpreis für einen bereits gewählten Kauf. position kann im Kampf relevant sein; learn kann persönliche Wissensgrenzen betreffen. Nicht jeder Fehler in einem potenziell wichtigen Delta braucht deshalb immer eine weitere Modellanfrage. Eine nicht bestätigte optionale Aktion kann offenbleiben; eine tatsächlich notwendige mechanische Bestätigung muss korrekt behandelt werden.

Wichtig: Das Ziel ist weniger **gesamter** Zusatzaufwand, nicht ein zusätzlicher Parser, der jedes Delta mehrfach in verschiedenen Zwischenformaten abbildet. Keine neue Modellstufe. Bestehende Kandidatenwahl, Repair, Recovery und Revisionen gemeinsam betrachten.

Abnahme: ein optionales fehlerhaftes Fact neben korrektem GO und Mahlzeitenangebot; ungültige abhängige Gegenstandsübergabe; fehlender notwendiger Ergebnisbeleg; unvollständige oder widersprüchliche Antwort; Repair mit geänderten Deltas; Reload/Retry ohne Doppelbuchung. Claudes 40–60-%-Prognose ist als Hypothese zu messen, keine vorab geforderte Einsparquote.

### P4 – Eine Ankunftsquelle und einfachere Chronologie: übernehmen

Die doppelte Modellmeldung von expected.go.arrived/at und arrive sowie die Pflicht zur Szenenannotation vor Ankünften sind nachvollziehbare Reparaturursachen. Die vorhandene sceneSteps-Funktion in extract.js sortiert bereits nach seq und kann in begrenzten Fällen eine Ankunft vor bestimmte Beobachtungen umordnen. Die Engine besitzt damit einen Teil der nötigen Infrastruktur.

**Ziel:** Ein kanonisches Ergebnis je tatsächlichem GO-Schritt. Ob die endgültige Repräsentation arrive oder ein strukturiertes expected-Ergebnis ist, soll nach dem realen Datenfluss gewählt werden. Das andere Feld, sofern intern noch nötig, wird abgeleitet. Das Modell soll dieselbe Tatsache nicht zweimal widerspruchsfrei formulieren müssen.

Der Einwand gegen bloße seq-Reihenfolge bleibt wichtig: mehrstufige Bewegung, Rückkehr zum Ausgangsort, Gespräch vor Abreise, PULSE-Zwischenhalt und Fernbeobachtung können dieselbe Orts-ID mehrmals berühren. Die Ordnungsnummer der Meldung ist außerdem nicht notwendigerweise die Befehlsnummer des autorisierten GO. Eine eindeutige Zuordnung zum tatsächlichen Schritt ist erforderlich, nicht ein zweites komplett annotiertes Ortsprotokoll.

Im gewöhnlichen Fall reicht die bestehende chronologische Reihenfolge und bestätigte Ankunft. Nur relevante Abweichungen benötigen eine explizite Orts-/Schrittangabe. Die Engine muss tatsächliche Ankunft von Absicht, Zwischenhalt oder versperrtem Zugang unterscheiden. Eine widersprüchliche alte Doppelmeldung soll nicht willkürlich in eine Ankunft umgedeutet werden.

Das vorhandene Ereignisformat und gefaltete alte Saves sollen möglichst unverändert bleiben. Kein neues paralleles World- oder Reisejournal. Vorhersage: deutliche Prompt- und Reparaturentlastung; tatsächliche Wirkung separat messen.

### P5 – Ortsklassifikation: übernehmen, aber die Semantik nicht erneut in die Engine verschieben

Claude hat die wiederkehrende Ursache richtig beschrieben. Die Entscheidung „bekannter Ortsknoten vs. lokaler Standpunkt“ soll bei einer bereits aufgelösten Referenz auf dem Ortsbuch und tatsächlichen Szenenzustand beruhen, nicht auf einem Modell, das die technische Struktur erraten muss.

Bei meiner zweiten Prüfung sind allerdings zwei Lücken wesentlich geworden:

1. **Der bestehende place_book.resolvePlaceRef akzeptiert IDs bzw. {new:name}/{new:{name,kind,parent}}, nicht das in Claudes Pseudocode vorgeschlagene {words}.** Er unterscheidet existing, ambiguous, new und invalid. Eine kleine Anpassung der Eingangsschnittstelle ist denkbar; die bestehende Auflösung sollte genutzt und keine neue parallele Suche geschaffen werden.
2. **Eine unbekannte Zielbezeichnung ist nicht automatisch ein neuer Ort.** Ein Fenster, Tresen oder Felsvorsprung kann ein lokaler Standpunkt sein, auch wenn kein gespeicherter Feature-Eintrag existiert. Ein identifizierter NPC an einem anderen Ort bezeichnet sein mögliches Ziel, garantiert aber nicht, dass er gerade dort bleibt. Ein Dungeonname kann bei „zum Eingang“, „durch den Eingang“ oder „hineinsehen“ unterschiedliche gewählte Übergänge bedeuten.

Der Planner muss also weiterhin den semantischen Bewegungswillen, das tatsächliche Ziel und relevante Eintritts-/Beobachtungsabsicht verstehen. Die Engine entscheidet mechanisch, welche vorhandene Ortsidentität, welche Art von autorisiertem Schritt und welche Zugangsbedingungen dazu passen. Nicht: JavaScript bekommt rohe Spielerworte und rekonstruiert die gesamte Semantik aus ihnen.

Die vier Zustände des Ortsbuchs (Existenz, Kenntnis, angezeigter Katalog, Erreichbarkeit) beibehalten. Ein eindeutiger bekannter Ort wird aufgelöst, uneindeutige Referenz bleibt Auswahl/Klärung, echte unbekannte Umgebung darf natürlich entstehen. Keine zusätzliche Ortsdatenbank oder umfassende Wegsimulation.

**Präzisierung zu .251:** explicitJourneyClause löst ausschließlich einen begrenzten Reparaturhinweis aus. Seine fehlende Reaktion auf „I return to the market.“ beweist nicht, dass dieser Satz im Produkt keine Reise auslösen kann. chosenKnownRoute und der reguläre Planner können ihn weiterhin verarbeiten. Die Probe ist ein guter Nachweis dafür, dass ein spezieller Reparaturtrigger unvollständig ist, kein Ende-zu-Ende-Nachweis einer allgemeinen Reisefehlerquote.

**Wichtigster offener Punkt:** Rooks leerer Plan. Keine engineseitige Zielauflösung kann einen fehlenden Bewegungsauftrag allein korrigieren. Claudes geplante Abnahme mit unveränderter leerer P-Antwort → GO ist deshalb ohne eine zusätzliche Quelle der Spielerentscheidung nicht allgemein möglich. Das muss der Plan ehrlich trennen: korrigierte Klassifikation eines vorhandenen Befehls, bessere semantische Erkennung durch den Planner, eindeutige native Wahl und gegebenenfalls eine bereits vorhandene begrenzte Reparatur bei echter Unvollständigkeit. Nicht wieder einen Phrasenparser für alle möglichen Reisewünsche einführen.

Ich würde zudem den tatsächlich zugestellten Narratorvertrag berücksichtigen. Ein normaler Zug, in dem der Planner keine Bewegung gewählt hat, soll keine eigenmächtige Reise als bereits abgeschlossen erzählen. Die Regel darf aber nicht jede normale lokale Bewegung als „NOTHING TO BOOK – bleib stehen“ unterdrücken. Das Problem wird durch richtige Autorität und einen passenden Erzählrahmen gelöst, nicht durch eine weitere starre Verbotszeile allein.

**Abnahme:** Originalfälle Hearth, Lantern, Rook, Linden, AJ/Hazel sowie User16 und Flint. Historische unveränderte Antworten als solche kennzeichnen. Wo der neue Vertrag neue Semantik verlangt, getrennt mit korrekt strukturierten synthetischen Antworten die Engine prüfen und anschließend echte P/N/X-Antworten messen. Positive Ortswechsel und negative Nichtbewegung/geschützte Übergänge gleichermaßen. Direkte HUD-Ortswahl behält ihren Planner-freien Pfad.

### P6 – Spielerabsicht und Agency: strukturierten Modus bevorzugen, Schutz nach Wirkung

Die bestehende Agency-Schicht hat nachweislich natürliche Spielerentscheidungen verworfen. Ihre Reduktion ist ausdrücklich erwünscht.

Zweite unabhängige Funktionsgegenprobe mit guardCommands aus .251, einem anwesenden Ossen, synthetischen GO-/Activity-Befehlen und den vorhandenen Optionen language:true bzw. language:false, state:true:

| Spielertext, als entsprechender Befehl eingespeist | heutiger Guard | ohne Sprachprüfung |
|---|---|---|
| Ossen, let's set out for the chapel. | zugelassen | zugelassen |
| Ossen walks to the chapel. | npc_actor | zugelassen |
| I do not go to the chapel. | negation | zugelassen |
| Should I go to the chapel? | question | zugelassen |
| Tomorrow I'll go to the chapel. | plan | zugelassen |
| I go to the chapel. | zugelassen | zugelassen |
| I look at the map and wonder whether I should go to the chapel. | zugelassen | zugelassen |
| I don't sleep here. (activity/sleep) | negation | zugelassen |
| I do not attack the guard. (attack) | zugelassen | zugelassen |

Die Probe prüft ausschließlich den Guard, keine nachfolgende Engineausführung oder Modellqualität. Die Annahme der letzten beiden problematischen Ausgaben durch den Guard ist keine Behauptung, dass das vollständige Produkt jede davon ausführt. Sie zeigt, dass auch die jetzige Sprachabsicherung weder hinreichend noch vollständig ist. Der aktuelle Vokativ-Aufbruch funktioniert bereits im isolierten Guard; die ursprünglichen AJ-/Hazel-Fehler sind historische Belege für die gewachsene Ausnahmestruktur.

Quelle: [agency.js / COMMITMENTS und guardCommands](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/agency.js).

**Zusätzlicher Befund:** COMMITMENTS ist ein historisches Set für die frühere Auswertung. Es enthält unter anderem pay, buy, sell, give, drop, use, offer.accept/decline, Entwicklungs- und Questentscheidungen, Registrierung und journey.continue. Es enthält nicht go, activity, attack, take, equip oder party. Die Trennung „Nicht-COMMITMENTS sind umkehrbar und harmlos“ ist daher fachlich nicht belastbar. Ein versehentlicher Angriff, eine ungewählte Reise mit PULSE, ein achtstündiger Schlaf, eine nicht gewünschte Gegenstandsaufnahme oder das Auflösen einer Party können bedeutsame Folgen haben.

**Meine Entscheidung bleibt dennoch: nicht zur generellen zweiten JS-Semantik zurückkehren.** Wir wollen die bessere semantische Modellentscheidung verwenden. Ein schlanker strukturierter Modus, verbunden mit vorhandenem Handlungsbezug, Bedingungen und tatsächlicher Wirkung, ist sinnvoll. Der Modus sollte nicht aus Kompatibilitätsgründen bei unklaren neuen Antworten automatisch do bedeuten. Direkte native Aktionen sind bereits gewählte Aktionen.

Für zunächst klar bindende oder schwerwiegende Vorgänge bleibt die nachweislich erforderliche bisherige Autorisierung erhalten, bis ein gleichwertiger einfacherer Entscheidungsweg vorhanden ist. Claude soll diese Grenze nach tatsächlichen Auswirkungen und bestehenden Mechanismen präzisieren, nicht eine umfangreiche neue Risikoklassifikation für sämtliche Befehle erfinden. Keine pauschale zusätzliche Bestätigungsrunde für jede normale Reise oder Aktivität. Der aktuelle Zustand kann zeigen, ob ein Vorgang möglich ist, aber nicht ob der Spieler ihn gewollt hat. Ein wörtliches Zitat allein beweist ebenfalls nicht die behauptete Interpretation.

Positive und negative natürliche Beispiele samt tatsächlicher Plannerantwort müssen später zeigen, dass mode die Aufgabe besser löst als die bisherigen Wortlisten. Die wichtigsten Fälle sind echte Handlungen, Anreden, indirekte Formulierungen, Fragen, Hypothesen, Negationen, fremde Handlungen, spätere Absichten und bedingte Kombinationen. Schwerwiegende Fehlbuchungen dürfen nicht mit einer guten durchschnittlichen Klassifikationsrate verrechnet werden. Keine allgemeine zweite Modellabfrage als permanentes Sicherheitsnetz.

### P7 – Alte Party-Rückübersetzung entfernen, freiwillige NPC-Angebote erhalten

Die aktuelle strukturierte Einladung ist ein überzeugender erfolgreicher Architekturwechsel. Der bisherige World-Handler ruft weiterhin partyDecision mit Prosa für X-Party-Deltas auf. Die alte Sprecher-/Zustimmungserkennung soll nicht mehr im Standardbeitritts- und Organisationspfad konkurrieren.

**Bei der Selbstprüfung ist ein zusätzlicher fachlicher Punkt aufgetaucht:** Der Kanon sieht ausdrücklich sowohl Spieler- als auch NPC-initiierte Angebote vor. Claudes P7 formuliert „X darf nur NPC-eigene Änderungen melden (leave, Ablehnung)“ und entfernt zugleich X-offer. Das könnte natürliche NPC-Angebote beseitigen, obwohl sie zur Eigenständigkeit der Welt gehören. Eine Figur darf dem Spieler von sich aus Zusammenarbeit vorschlagen.

Empfehlung:

- Freiwillige Aufnahme über die bereits gebundene strukturierte Entscheidung bzw. ein konkretes offenes NPC-Angebot. Keine automatische Mitgliedschaft aus einem Gespräch.
- Ein echtes NPC-Angebot darf aus der sozialen Welt entstehen und über einen eindeutigen strukturierten Pfad als offenes Angebot gespeichert werden. Die Spielerannahme bleibt verbindlich und lokal/nativ möglich.
- Sichere Organisation, Warten, Folgen, Auflösung sowie gemischte Handlungen nutzen den bereits vorhandenen mechanischen Standardweg.
- NPC-eigene Austritte bleiben möglich. Ein gewöhnlicher geäußerter Wunsch, ein späterer Austritt, eine taktische Aussage und ein tatsächlich vollzogener Austritt sind semantisch zu unterscheiden, nicht erneut per kompletter Grammatikprüfung.
- Echte Sonderangebote, Gegenforderungen, persönliche Besitzübergaben, Vergütung und bereits erworbene Ansprüche behalten ihre fachlichen Grenzen. Es ist keine Pflicht, alle seltenen Sonderabreden in einen neuen eigenen strukturierten Modellaufruf zu verschieben.

Claude soll unterscheiden zwischen entbehrlicher Rückübersetzung des **bereits strukturiert entschiedenen** Standardpfades und einer weiterhin sinnvollen Möglichkeit, neue freiwillige NPC-Initiativen zu erfassen. Kein Wiederaufbau des alten Vertragszwangs; keine zweite Partyarchitektur.

### P8 – Desk-Zeugen: einfache echte Zuordnung statt willkürlicher Wahl

Claudes Ziel, grammatische Desk-Zeugenbelege zu entfernen, ist sinnvoll. Der konkrete Vorschlag, bei mehreren Gildenmitarbeitern den zuletzt im Gespräch beteiligten zu wählen, ist nicht ohne Weiteres durch den Kanon gedeckt. Er kann persönliches Wissen an die falsche Figur buchen.

Die tatsächliche deskHandlers-Funktion prüft bereits, ob der betreffende Questschritt wirklich erfolgreich ausgeführt wurde, die Engine das Faktum besitzt und der genannte Mitarbeiter lebendig, anwesend und ein tatsächlicher Gildenmitarbeiter ist. Erst danach folgt der zusätzliche Sprachbeleg. Das ist ein guter Ansatzpunkt: vorhandene Bindungen erhalten, sprachliche Doppelprüfung entfernen.

**Selbstpräzisierung:** Bei einem eindeutig zugeordneten Desk-Schritt mit genau einem tatsächlich zuständigen anwesenden Bearbeiter ist eine einfache deterministische Zuordnung akzeptabel. Es braucht nicht für jedes gewöhnliche Gildengeschäft einen extra Zeugenbeleg. Bei mehreren Kandidaten ist eine knappe vom Modell gelieferte ID (vorhandenes handled_by oder gleichwertig) sinnvoll, falls sie gebraucht wird. Gibt es keine eindeutige Zuordnung, bleibt persönliches Bearbeitungswissen offen; die Gildenbuchung selbst bleibt gültig. Anwesende Figuren können Wissen über den üblichen legitimen Beobachtungspfad erwerben.

Kein zusätzliches Zeugensimulationssystem. Keine eigenständige Modellanfrage nur für die Zeugenidentität. Die Mechanik bleibt von dieser optionalen persönlichen Wissenszuordnung getrennt.

### P9 – Preise: kleine fachliche Erweiterung ja, kein erneuter Spezialregex

Die Preisellipse „eight silver … twelve“ kann in einer eindeutig zusammengehörigen Aussage tatsächlich verständlich sein. Das wiederholte Münzwort sollte nicht zwingend erforderlich sein.

Die zweite Prüfung legt nahe, auch hier nicht zu vorschnell eine neue Wort-/Satzgrenzen-Ausnahme zu empfehlen. Ein Münzwort im selben Satz reicht nicht als allgemeiner Nachweis für dieselbe Währung oder dieselbe Angebotsposition. Mengen, zwei unterschiedliche Währungen, andere Sprecher oder eine geänderte Bedingung bleiben relevante Gegenbeispiele.

**P9a (empfohlen):** Eindeutig zugeordnete vollständige Endpreise pro konkret angebotener Leistung zulassen, auch wenn die Währung im unmittelbar zusammenhängenden Angebot nur einmal ausdrücklich genannt wird. Bedeutung und Zusammenhang können strukturiert durch das Modell gemeldet werden. Engine rechnet numerisch korrekt und prüft konkrete Offerte, Einheiten, Endpreis, Zustimmung, Guthaben, Preisgrenze und Besitz. Vorhandenen Finanzpfad weiterverwenden; keine neue allgemeine Preisgrammatik.

**P9b (weiter offen):** Ein ausschließlich aus price_cp und sichtbarer HUD-Karte verbindlich werdendes Angebot könnte technisch einfacher sein. Das kann jedoch dazu führen, dass der Spieler eine vom Narrator nicht eindeutig genannte Summe erhält. Der geltende Kanon verlangt eine ausdrücklich genannte verbindliche Endsumme und bei bedingten Käufen eine bestimmte Reihenfolge. Diese Entscheidung soll nicht unbemerkt im Validierungsumbau getroffen werden. Claude darf eine begründete alternative künftige Finanzentscheidung empfehlen; noch nicht freigeben.

Keine Fuzzy-Geldbeträge, keine stillen Teilkäufe, keine Doppelauszahlung, kein Abschaffen der Spielerannahme. Das gilt auch, wenn der strukturelle Quellbeleg einfacher wird.

### P10 – Relevante Divergenzen zurückmelden: übernehmen, kompakt und nicht als neue Promptlast

Wenn eine wesentliche Szene nicht gespeichert werden konnte, darf die nächste Erzählung nicht unbemerkt auf der falschen Situation aufbauen. Das ist richtig.

Nicht jede optional verworfene Information braucht allerdings eine dauerhafte Correction. Eine entfallene Kaminbeschreibung, ein unvollständiger optionaler Fact oder eine bereits durch einen anderen gültigen Pfad aufgelöste Doppelmeldung braucht keinen fortgeschleppten Warnblock.

Korrekturen auf den tatsächlich verbleibenden Unterschied konzentrieren, zusammenfassen und aus dem bestätigten Zustand ableiten: „Alaric ist noch im Zimmer“, „Madge wurde nicht als hier bestätigt“, „der Kauf wurde nicht gebucht“. Wenn der Zustand inzwischen korrigiert ist, ist die alte Warnung nicht mehr als aktive Anweisung erforderlich. Die Quellen und Ablehnungsdetails bleiben im Audit.

Spielerinformation bei relevanter Abweichung soll knapp und verständlich sein; kein Flooding mit internen Regeln, keine neue Reparaturpflicht.

## 4. D1–D9: Zweite Bewertung der bisherigen GPT-Position

| Entscheidung | Empfehlung nach erneuter Prüfung | Begründung / Abgrenzung |
|---|---|---|
| D1 Anwesenheit ohne grammatischen Beweis | **Ja** | Expliziter semantischer Claim oder eindeutiger Meldungstyp, eine Zustandsregel. Kein neues obligatorisches Belegformat für jede Routineanwesenheit. |
| D2 Ankunft aus anderer Siedlung | **Ja, mit wenigen echten Zustandsgrenzen** | Strukturierte plausible aktuelle Ankunft genügt normalerweise. Keine NPC-Reisezeitsimulation; gebundene Zustände, Tod und konkret unmögliche Übergänge bleiben wirksam. |
| D3 Unabhängige Deltas | **Ja** | Nicht erreichte Orte sperren davon abhängige Wirkungen, nicht pauschal die restliche Antwort. Keine neue Abhängigkeitsbürokratie. |
| D4 Ortsklassifikation | **Ja** | Planner versteht Absicht/Ziel, Engine löst Identität und mechanischen Schritt auf. Leerer Plan und unbekannter lokaler Standpunkt gesondert berücksichtigen. |
| D5 Agency-Modus | **Ja, bevorzugt** | Keine reguläre zweite Grammatikprüfung bei gewöhnlicher Handlung. Historische COMMITMENTS-Liste allein ist keine Grenze für schwerwiegende Folgen. Eindeutige Spielerentscheidungen und native Schutzwege bewahren. |
| D6 Preis | **P9a zuerst, P9b getrennt** | Bedeutungsbezogene Preisellipse, keine neue Mini-Wortregel. Kanonänderung für alternative Angebotsautorität separat. |
| D7 Re-Baseline | **Ja** | Dokumentierte fachlich beabsichtigte Änderungen, vollständiger Differenzbericht, harte Invarianten. |
| D8 NPC-Austritt | **Ja** | Echte NPC-eigene Entscheidung; außerdem freiwillige offene NPC-Angebote erhalten. |
| D9 erzwungene Verlagerung | **Ja, weiterhin streng** | Andere Autorität als freiwillige Reise. Keine pauschale Lockerung dieser Schutzgrenze. |

Es handelt sich weiterhin um Empfehlungen an den Nutzer und an Claude zur fachlichen Gegenprüfung. Noch keine verbindliche Änderung des Kanons.

## 5. T1/T2/T3: Testphilosophie ändern, nicht Fehler aus den Tests entfernen

Die drei Ebenen sind eine der wichtigsten Verbesserungen von Claude.

### T1 – Harte Produktinvarianten

Beibehalten: korrektes Fold, keine Doppelbuchungen, Eigentum, Kampf, HP/MP/STA, XP, Skillentwicklung, individuelle Ressourcen, Questabrechnung, echte Autorisierung, geschützte Reise-/Dungeonübergänge, revisionsgebundene Speicherung. Teste echte Auswirkungen, nicht unnötige konkrete interne Darstellung. Wenn eine alte Prüfung entfernt wird, muss ihre weiterhin gewünschte Schutzwirkung an der neuen zuständigen Stelle überprüfbar bleiben.

Auch die Spielerhoheit ist eine fachliche Invariante. Sie kann nicht ausschließlich in einem mechanischen Unit-Test mit bereits korrekt gelabelter Eingabe bewiesen werden. Deshalb Ergänzung durch T2.

### T2 – Semantische Annahme und Ablehnung

Zwei getrennte Abnahmen:

- Engine-/Vertragstest offline: eingespeiste strukturierte positive, negative und unklare Meldungen. Prüfen, ob die neue Engine die vereinbarten Regeln korrekt und kanalübergreifend ausführt.
- Tatsächliche Modellqualität: gleiche kontrollierte Spieler-/Prosa-/Weltkontexte auf festem alten und neuem Stand, echte P-/X-Antworten. Korrekte semantische Zuordnung, falsche Ablehnung, falsche Zulassung, fehlende Meldung, unklare Identität und Folgeeffekt getrennt erfassen.

Die ursprünglichen historischen Fälle sind Regressionsbeispiele. Ergänze eine überschaubare Sammlung von unabhängigen natürlichen Varianten und Gegenbeispielen, die nicht bereits sämtlich im neuen Prompt als Muster stehen. Ein nachträglich so gelabeltes P-/X-Mockobjekt kann nur die Engine, nicht den Erfolg der neuen Modellentscheidung belegen.

Kein allgemeines „100 % richtige englische Sätze“-Gate. Bei normalen Erzählmeldungen ist eine wesentlich höhere Annahme plausibler Inhalte mit begrenzten Fehlern akzeptabel; für falsche mechanische Buchung gelten strengere Konsequenzen. Vor einer späteren Abnahme die relevante Stichprobe und Bewertungsregeln festlegen, nicht nachträglich einen beliebigen Prozentwert passend wählen. Die Stichprobe soll aussagekräftig und bezahlbar sein. Nicht jede denkbare Paraphrase erneut testen.

### T3 – Replay als vollständiger Differenzdetektor

Die historischen Fingerprints bleiben ein nützliches Diagnoseinstrument. Sie sind kein fachliches Richtigkeitsorakel. Es ist ausdrücklich erwünscht, frühere fälschlich erwartete Ablehnungen durch akzeptierte Ergebnisse zu ersetzen.

Claudes Kategorie „mehr übernommene Weltmeldungen, Invarianten grün“ allein ist jedoch kein automatisch harmloser Unterschied. Eine falsche Personenidentität, ein unzutreffendes Wissen oder eine fiktive Erinnerung kann später relevante Folgen haben. Klassifizieren nach beabsichtigter semantischer Verbesserung, erwarteter Darstellung/Protokolländerung, mechanischer Wirkung und ungeklärtem Befund. Bei gewöhnlichen harmlosen Änderungen reicht nachvollziehbare Sammelbegründung, keine Einzelentscheidung für tausende triviale Events.

Behalte die ursprüngliche Referenz und die bisherigen akzeptierten Unterschiede nachvollziehbar verfügbar. Wenn die neue fachliche Regel andere Events erzeugt, dokumentierte neue Erwartung statt automatischer Fingerprint-Umschreibung. Ggf. normalisierten Vergleich verwenden, um reine Schema-/Protokolländerungen vom Ergebniszustand zu trennen. Neue und alte Replayabnahme zusammen mit T1/T2 beurteilen.

## 6. Implementierungsplanung und Abnahme – Empfehlung zur Bündelung

Ich halte meine zuvor vorgeschlagene Bündelung grundsätzlich für sinnvoll, würde P1/P2/P3/P4/P10 allerdings intern in überprüfbare Teilpakete gliedern, weil sie die gleichen Datenflüsse verändern. Nicht alles gleichzeitig in einem undurchsichtigen Großdiff umsetzen.

| Etappe | Inhalt | Ergebnisziel |
|---|---|---|
| 0 – Messgrundlage | Kleine repräsentative und korrekt zugeordnete Ausgangsstichprobe; T1/T2/T3-Bewertung | Vergleichbarkeit, keine neue Produktlogik. |
| A – Weltübernahme | P1 einheitliche Präsenz, P2 unabhängige Folgen, P10 relevante Rückmeldung | Natürlich korrekte Begegnungen speichern, ohne neue semantische Doppelprüfung. |
| B – Extractorvertrag | P3 Teilvalidierung, P4 eine Ankunftsquelle und einfache Chronologie | Weniger notwendige Repairs, keine zerrissenen abhängigen Vorgänge. |
| C – Spielerabsicht und GO | P5/P6 gemeinsam mit Planner-, Narrator- und HUD-Verträgen | Richtige Autorisierung gewöhnlicher Handlungen, kein neuer Regex-Sprachparser. |
| D – gewachsene Altpfade | P7 Standardparty, P8 einfache Zeugenbindung, P9a eindeutige Preisellipse | Bestehende funktionierende Mechaniken weiterverwenden, überholte semantische Pfade entfernen. |
| E – Gesamtabnahme | T1, T2, T3, isolierte ST-Abnahme und natürliche Modellläufe nach ausdrücklicher Kostenfreigabe | Verifizierter vereinfachter Kandidat und verständlicher Unterschied zu .251. |

Das ist eine mögliche Aufteilung **eines späteren zusammenhängenden Codex-Auftrags**, nicht die Forderung, nach jedem Teil eine neue große Diskussion mit dem Nutzer zu beginnen. Codex kann technisch sinnvoll anders schneiden. Zwischenstände nach Projektarbeitsweise sichern. Überholte Tests dürfen bei fachlicher Freigabe angepasst werden.

Die spätere Modellabnahme darf nicht ausschließlich den alten Martin-Satz oder dieselbe GO-Formulierung wiederholen. Sie soll auch neue natürliche Varianten und zusammenhängendes Spiel prüfen. GLM-5.3-Flash war für die letzten günstigen explorativen Serien geeignet; tatsächliche Modellrollen und Routen bei Vergleichsmessungen festhalten. Keine pauschale Aussage über alle Modelle.

**Budget:** Vom zuletzt freigegebenen Dollar verbleiben rechnerisch 0,747428006 USD. Die frühere .222–.235-Serie besitzt eine separate Kostenrechnung. Für diese reine Gegenprüfung werden keine Providerrequests ausgelöst. Eine spätere Nutzung des Restbudgets bedarf des entsprechenden ausdrücklich beauftragten Testumfangs und der bestehenden kumulativen Kostensperre. Kein Budget künstlich aufbrauchen und kein neues Budget aus diesem Bericht ableiten.

## 7. Zusätzliche unabhängige Befunde von Claude

- **applyWorld:** Die sehr große Funktion und ihre gewachsene Kopplung sind eine berechtigte Wartbarkeitsfrage. Nicht sofort einen vollständigen strukturellen Rewrite starten. Beim Entfernen der konkreten redundanten Pfade dürfen klare kleine gemeinsame Handler entstehen. Ein rein kosmetischer Split ohne weniger Zuständigkeiten bringt wenig.
- **Regelregister:** Zweck, ursprüngliches Schutzziel, heutige Notwendigkeit und relevante Gegenprobe sind wertvolle Informationen bei verbleibenden Prüfungen. Ein zusätzliches umfangreiches Register für jede kleine Regel ist nicht das Entwicklungsziel. Ein kompakter fachlicher Überblick der zentralen Autoritäten genügt zunächst.
- **Altpfade:** Der Kanon verlangt keine allgemeine Unterstützung alter V3/V4-A-/Ruleset-1-Kampagnen. Daher keine neue komplexe Kompatibilitätsschicht allein für historische Sprachparser bauen. Der aktuelle Ruleset-2-Save und seine Revisionen sind geschützt. Historische Originale bleiben archiviert; spätere technische Bereinigung kann nach der Hauptvereinfachung separat beurteilt werden.
- **Promptlast:** Claude weist auf erhebliche Größen hin; die P/N/X-Verträge sollten mit den entfernten Prüfungen tatsächlich verkleinert und vereinheitlicht werden. Keine alten Beleganweisungen im Prompt belassen, wenn die Engine sie nicht mehr benötigt. Messung der tatsächlich gesendeten Requests statt einer theoretischen Dateilänge. Keine gleichzeitige umfassende Kontextoptimierung außerhalb des Themas.
- **Divergenzmonitor:** Als Diagnose im Testwerkzeug sinnvoll, sofern nicht als neues produktives Gate eingesetzt. Keine zusätzliche Sprachvalidierung im Laufzeitpfad.

## 8. Selbstprüfung: Was würde ich an meiner ersten Antwort bewusst ändern?

| Meine erste Empfehlung | Ergebnis der zweiten Prüfung |
|---|---|
| Eindeutige neue Anwesenheitsklassifikation verlangen | Beibehalten, aber vorhandene eindeutige Typen können genügen. Kein Pflichtfeld- und Zitatwachstum. |
| Entfernungsplausibilität strenger als bloß arrives | Präzisieren: keine generelle NPC-Reisezeit-/Entfernungssimulation; wenige konkrete bindende Zustände schützen. Gewöhnliche glaubwürdige autonome Bewegung zulassen. |
| P2 nach tatsächlichen Abhängigkeiten | Beibehalten, aber ausdrücklich keine neue Abhängigkeitsbürokratie. Kleine Regeln und bestehende Ereigniszuordnung nutzen. |
| P3/P4 vereinfachen und Chronologie schützen | Bestätigt durch aktuellen Code. Gemeinsam mit dem Antwortvertrag und bestehenden atomaren Commit-/Revisionpfad planen. |
| P5 zentrale Engine-Zielauflösung | Bestätigt, jedoch nicht als Übertragung sämtlicher Bewegungssemantik an JavaScript. Fehlendes GO und wirklich unbekannte Standpunkte explizit klären. |
| P6 Schutzgrenzen | Nach eigener Funktionsprobe und COMMITMENTS-Inventur präzisiert. Keine Einstufung aller GO-/Activity-/Party-/Attack-Aktionen als harmlos. Zugleich keine allgemeine Pflicht zur zweiten semantischen Prüfung. |
| P7 alte Party-Rückübersetzung entfernen | Ergänzt um freiwillige NPC-Angebote als ausdrücklich gewünschte Mechanik. |
| P8 keine willkürliche Zeugenzuordnung | Bestätigt und gelockert: eindeutiger tatsächlicher Bearbeiter darf ohne zusätzlichen grammatischen Beleg zugeordnet werden. |
| P9a zuerst | Bestätigt, aber nicht durch eine neue Regex-Ausnahme für „eight silver … twelve“. |
| T2/T3 differenzierte Abnahme | Bestätigt; tatsächliche Modellleistung und vollständige Zustandsauswirkung statt nur eingespeister richtiger Klassifikationen prüfen. |
| Keine weitere große Vorstudie nötig | Unverändert. Dieser kurze Rückreview durch Claude soll strittige Punkte klären und den Plan präzisieren, keine dritte umfassende Forschungsrunde beginnen. |

Damit ist die ursprüngliche Stoßrichtung nicht schwächer, sondern präziser geworden. Der Nutzer möchte deutlich weniger unnötige Strenge. Wir dürfen nicht aus der Diskussion über legitime Schutzgrenzen wieder einen immer größeren Katalog von speziellen Erkennungsregeln entstehen lassen.

## 9. Konkrete Rückfragen an Claude vor der gemeinsamen Entscheidung

Claude soll seinen Bericht unabhängig noch einmal gegen diesen Review halten. Er darf jede Kritik übernehmen, präzisieren oder begründet zurückweisen.

1. Stimmen der Methodenhinweis zu den gemischten Modellrouten, die Zählung der Anwesenheitsbelege und die Aussage über tatsächliche Zustandsdivergenz? Falls eine schnelle saubere Klärung möglich ist, Zahlen korrigieren. Andernfalls vorläufige Kennzahlen klar kennzeichnen. Keine vollständige neue Archivforschung allein dafür.
2. Wie klein kann der P1-Vertrag wirklich bleiben? Kann eine vorhandene eindeutige Anwesenheitsmeldung statt eines neuen Pflichtfelds genügen? Wie werden die verschiedenen Meldekanäle gemeinsam behandelt, ohne sämtliche anderen Funktionen von narration_evidence.js unbesehen zu löschen?
3. Welche P2/P3/P4-Regeln sind tatsächlich nötig, um gültige unabhängige Teile zu übernehmen und die relevanten abhängigen Wirkungen zu schützen, ohne neue aufwendige Buchhaltung zu erfinden?
4. Wie lösen P5/P6 die beiden unterschiedlichen Fälle „vorhandenes GO falsch klassifiziert“ und „GO fehlt komplett“? Wo bleibt die semantische Entscheidung, und was kann das bestehende Ortsbuch deterministisch leisten? Wie wird eine falsche Spielerhandlung mit echter mechanischer Wirkung vermieden, ohne erneut einen umfangreichen Agency-Sprachparser zu bauen?
5. Wie bleiben bei P7 echte NPC-initiierte offene Angebote erhalten? Ist die P8-Zeugenzuordnung mit dem Kanon vereinbar? Ist P9a tatsächlich eine Vereinfachung statt ein neuer Sondervalidator?
6. Welche bisher vorgeschlagenen Prüfungen, Felder oder Altpfade können nach der zweiten Betrachtung vollständig entfallen? Welche Schutzgrenzen hielt GPT möglicherweise zu streng, welche Claude zu großzügig?
7. Welche konkreten Änderungen am Plan empfiehlt Claude abschließend? Wie werden die Modelle selbst in T2 geprüft, und wie bleibt T3 ein aussagekräftiger Differenzdetektor ohne Zwang, jeden historischen Fehler zu konservieren?

Eine begründete Beibehaltung bisheriger Empfehlungen ist genauso erwünscht wie eine Änderung. Es ist nicht nötig, GPTs Vorschläge vollständig zu übernehmen.

## 10. Schlussbewertung

**GO für die fachliche Vorbereitung einer späteren Umsetzung von V1, noch kein Implementierungsauftrag.** P1–P10 ergeben einen sinnvollen gemeinsamen Entwicklungsplan, wenn die dargestellten Zuständigkeits- und Schnittstellenfragen geklärt werden. Die wichtigste Erfolgsmessung ist nicht die Anzahl gelöschter Zeilen oder bestandener historischer Tests, sondern dass gewöhnliche erlaubte Handlungen tatsächlich in der gespeicherten Welt ankommen und unnötige Reparaturen sowie semantische Doppeldeutungen abnehmen.

Keine neuen Sonderregeln für „drawing ale“, „gone quiet“ oder den nächsten speziellen englischen Satz. Keine Neuauflage umfassender Reise-, Party-, Vertrags- oder NPC-Simulationen. Die bewährten Mechaniken des spielbaren Besitzstands bleiben der Ausgangspunkt.

**Claude soll seine Analyse und seinen Plan nach diesem Gegenreview aktualisieren oder begründet beibehalten.** Anschließend entscheidet der Nutzer gemeinsam mit GPT über einen Codex-Auftrag. Alle offenen Punkte sind Empfehlungen; Produkt, Kanon und .251-Testfreigabeempfehlung bleiben unverändert.

### Maßgebliche Produktquellen für die zweite Selbstprüfung

- [narration_evidence.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/narration_evidence.js) · [world.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js) · [delta.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/delta.js).
- [extract.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/extract.js) · [runtime.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/runtime.js).
- [agency.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/agency.js) · [planner.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/planner.js) · [known_routes.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/known_routes.js) · [place_book.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/place_book.js).
- [party.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/party.js) · [party_actions.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/party_actions.js) · [finance_evidence.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/finance_evidence.js) · [ownership.js](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/ownership.js).
- [Kanon im Stand des Claude-Berichts](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/13fa3587dca3b417a4d39822ddd25bbe2e3e7cfd/02_DESIGN_KANON.md) · [Replays/Trust .208](USER11_208_FIREWALLVERGLEICH.md).
