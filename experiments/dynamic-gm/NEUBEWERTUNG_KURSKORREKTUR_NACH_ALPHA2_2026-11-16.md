# Avereth nach GM Alpha 2: unabhängige Neubewertung und Kurskorrektur

16.11.2026. **Analyse, keine Implementierung und keine Spieltestfreigabe.** Auftrag: reale Spielbarkeit, kreative Freiheit und Zuverlässigkeit höher gewichten als die Bewahrung einer Architektur. Unnötige Pflichtrequests und vermeidbare Wartezeit zu reduzieren bleibt ein ausdrückliches Entwicklungsziel; eine niedrige Requestzahl allein genügt nicht.

Untersuchte Remote-Stände: Experiment `2def62c669537f79f4e7395e8cdef02a63e5115f` (Alpha 2), Produkt `.200` / `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`, Dokumentation `27380a686f7372b000c3b047cbf6d1dc6afb9815`. Zusätzlich gezielte historische Quellen, insbesondere `717e2f7` und persönliche Originalruns. Nur dieser Bericht wird auf `experiment/dynamic-gm-model` abgelegt; Produkt, main, Testoriginale und bisherige Berichte bleiben unverändert.

**Überarbeitung nach GPT-Feedback zur Erstfassung `6401220`:** Die Fehlerdiagnose bleibt bestehen. Geändert wird die nächste Entwicklungspriorität: erst den bestehenden GM für einen begrenzten, fairen natürlichen Fähigkeitsvergleich fachlich vervollständigen; keine vollständige Wiederanbindung der alten Modellpipeline davor. Abwägung und Grenzen des Feedbacks stehen in §13. Dieser Nachtrag beruht auf Quellen-/Codeprüfung, nicht auf neuen Spielversuchen oder Provideraufrufen.

## 1. Urteil und empfohlene Richtung

**Der Rückschritt ist technisch nachvollziehbar. Die installierbare Alpha hat keine gleichwertige Spielschnittstelle zur bisherigen Engine.** Sie bewahrt deren Berechnungen und Validatoren, übermittelt dem Modell aber einen unvollständigen, teilweise widersprüchlichen Vertrag und weniger fachlich aufbereiteten Kontext. Gleichzeitig entfernt sie begrenzte Korrekturmöglichkeiten und sperrt bisherige Bedienwege. Ein gewöhnlicher, bereits unterstützter Gildenbesuch scheitert dadurch vor der Auflösung. Das ist kein bloßes Samplingproblem und kein Anlass, den Spieler zu anderen Formulierungen zu erziehen.

Die neue Architektur hat dennoch wertvolle Ergebnisse: gemeinsame Requeststeuerung, Kapazitätsschutz, dauerhafte Antwortbelege, Chatbindung, kontrollierte Wiederaufnahme und Speichern vor endgültiger Anzeige. **Diese technischen Erfolge beweisen weder Handlungsvollständigkeit noch bessere NPCs oder Erzählqualität.** Die aktuelle Spielererfahrung widerlegt die Erwartung, der technisch getestete Durchstich sei bereits eine brauchbare allgemeine Spielumgebung.

**Meine überarbeitete Empfehlung ist eine fachliche Teilrückkehr bei weiterhin dynamischer, bedarfsabhängiger Modellarchitektur:** Bewährte Kataloge, Referenzregeln, Kontextprojektionen, Fachvalidierung und begrenzte Korrekturfähigkeit aus `.200` wiederverwenden. Zuerst damit den bestehenden GM für einen kleinen, zusammenhängenden Spielvergleich vervollständigen. Zusätzliche Planner-/Memoryleser bleiben verfügbare Vergleichs- und Rückfalloptionen; sie werden vor diesem Nachweis nicht erneut zu Pflichtphasen erklärt. Die vollständig wiederangebundene alte Vermittlung ist eine mögliche Folgeentscheidung, keine notwendige Vorarbeit.

Langfristig empfehle ich **einen kreativen, für den Spieler einheitlichen Spielleiter mit deterministischem Kern und bedarfsgerechter interner Sprachvermittlung**. Der direkte GM bleibt der bevorzugt zu prüfende Zielkandidat, keine bereits bewiesene Produktarchitektur. Ein gewöhnliches Gespräch mit wichtigem Memory in einer Antwort abzuschließen ist ein sinnvolles Ziel. Zusätzliche Aufrufe müssen durch benötigte Ergebnisse oder bessere Zuverlässigkeit begründet sein. Es gibt weder eine Ein-Aufruf-Garantie noch einen Bestandsschutz für drei große Pflichtphasen.

Ich korrigiere damit zwei Priorisierungen: Zunächst wurde die technische Installierbarkeit vor natürlicher Handlungskompetenz und fachlicher Gleichwertigkeit ausgebaut. Die Erstfassung dieser Neubewertung bevorzugte daraufhin zu stark eine neue Anbindung der alten Vermittlung, obwohl auch deren Aufwand und Nutzen noch nicht nachgewiesen sind. **Einzelfixes allein reichen nicht; ein vollständiger Gegenumbau vor dem entscheidenden Modellnachweis ist ebenfalls nicht begründet.** Der nächste Versuch muss richtige Fachinformationen, korrigierbare Vorschläge und echte Folgezüge zusammenbringen. Die alte Veröffentlichungs-/Retrykette wird dadurch nicht rehabilitiert.

## 2. Evidenz und Grenzen dieser Untersuchung

Die Bewertung verbindet vier getrennt gegengeprüfte Perspektiven: aktueller Fehlerpfad, alte persönliche Spielerfahrungen, fachliche Schnittstellengleichheit und kritische Prüfung früherer Architekturentscheidungen. Untersucht wurden Entwicklungsschritte und ihre Gründe, tatsächliche Modellprompts, relevante Laufzeitpfade, Originalfeedback und ausgewählte Originalchat-/Eventfolgen. Keine erneute Komplettlektüre jedes Moduls und keine Behauptung einer Vollabnahme.

Die Rangfolge der Belege ist:

1. **Persönliches Spiel mit Originalchat, Events und Feedback:** stärkster Beleg für tatsächlich erlebte Spielbarkeit; Erzählung und Buchung trotzdem getrennt prüfen.
2. **Aktueller Originalrequest/-response plus reproduzierbarer Codepfad:** belastbare Ursachenanalyse, aber kein Ersatz für fehlende Browser-/Journalspuren.
3. **Natürliche automatisierte Läufe:** echte Modellreaktionen, jedoch andere Spielerführung als ein persönlicher Run.
4. **Lokale Proben, Replay, Node- und Browsermocks:** Belege für genau ihre Eingaben, Invarianten und Fehlerfälle; keine natürlichen Qualitätswerte.
5. **Architekturargumente:** begründete Erwartungen, ausdrücklich keine gemessenen Verbesserungen.

Für die Erstfassung wurden nur kleine lokale Lese-/In-memory-Proben ausgeführt: aufgezeichnete Befehle parsen, dieselben Befehle auf kopiertem historischem Zustand vorbereiten, Fehler und Wiederaufnahme durch den Alpha-Executor führen, `#system` prüfen, Promptbestandteile auslesen und 95 gebündelte Engine-/Contentdateien gegen `.200` byteweise vergleichen. Im Feedbacknachtrag wurden diese Proben nicht wiederholt; ausgeführt wurden Quellen-/Code-, Dokumentdiff- und Referenzprüfungen. Keine Providerrequests, keine persönliche ST-Installation, keine vollständige Suite, kein neuer Replay oder Browser-Smoke. Frühere Abnahmezahlen unten sind Quellenangaben, keine hier wiederholten Tests.

**Wichtige Vergleichskorrektur:** Die längeren erfolgreichen persönlichen Spielbögen stammen insbesondere aus `.155`, `.157` und `.159`. `.200` enthält weiterentwickelte Fachpfade, ist aber selbst nicht durch eine lange erfolgreiche persönliche Kampagne belegt: Der persönliche `.200`-Test brach nach der Erstellung und ersten Waldbewegung ab. Die richtige Referenz ist daher die tatsächlich bewährte Funktionsbreite der alten Engine samt ihren späteren Korrekturen, keine idealisierte fehlerfreie `.200`.

## 3. Der neue Fehlversuch: Ursache statt Symptombehandlung

Quelle ist der neu bereitgestellte Terminalexport `PS CUsersmmitrSillySillyTavern-Laun.txt`, 51.619 Bytes, SHA-256 `88473ff644d59a292042d412a93f64dd746ca39f56d9642f3e4e9f699872ba3c`. Der Originalexport wird nicht zusätzlich ins Repository kopiert. Zeilennummern beziehen sich auf seine 128 Zeilen.

### 3.1 Was tatsächlich gesendet und beantwortet wurde

Spielereingabe:

> `*i walk into the city ahead of me and make my way over to the adventurers guild*`

Der gesendete Zustand nennt den Straßenrand vor Alderwatch. Beide Responses, Zeilen 48 und 114, verlangen korrekt eine Bewegung zur Gildenhalle, liefern dafür aber:

```json
{"op":"resolve","commands":[{"seq":1,"type":"go","quote":"i walk into the city ahead of me and make my way over to the adventurers guild","to":{"ref":"loc.alderwatch.guild_hall"}}]}
```

Die zweite Antwort ergänzt lediglich `within:null`. Der fachliche Spielerwunsch wurde hier nicht mit Angriff, Handel oder einer erfundenen Entscheidung verwechselt.

| Beobachtung | Gesicherter Befund |
|---|---|
| Providerabschluss | Zwei vollständige Responses mit `finish_reason:stop` |
| Usage | Je 5.541 Prompttokens; 64 beziehungsweise 94 Completiontokens |
| Parameter | GLM-5.3-Flash, Temperature 0,8, Top P 0,95, 4.096 Ausgabe, nichtstreamend, `chat_template_kwargs` mit Low und `clear_thinking:true` |
| Fehlertyp | Kein 429, Timeout, `length` oder belegter Kontext-/Creditfehler in diesem Export |
| Zweiter Request | Systemblöcke und decodierte Userpayloads identisch; kein Fehlerfeedback aus dem ersten Versuch |
| Zeit | Response-`created` liegt 45 Sekunden auseinander; ohne Requestbeginn keine belastbare Requestlatenz |

Die lokale Decodierung entfernt ausschließlich die zusätzliche Console-inspect-Escapeebene, ohne den Logtext auszuführen. Die identische Userpayload hat 20.806 UTF-8-Bytes. Davon entfallen 13.182 auf `worldContract`, darunter 12.709 auf dessen Schema: rund **61,1 % der Userpayloadbytes allein für das Weltschema**. Das ist keine Tokenquote. Lore belegt 2.598 Bytes, Commandbeschreibungen 1.540; NPC-Perspektiven und Toolergebnisse sind hier noch leer.

5.541 Inputtokens sind weniger als der damalige `.200`-Waldplanner mit 12.244. Daraus folgt keine Zugersparnis: Der Export zeigt keinen erfolgreichen Weltabschluss; im reproduzierten Fehlerpfad kommt keiner zustande. Der spätere GM-Request fehlt, Eingabe und Ziel unterscheiden sich. Tokens pro fehlgeschlagenem ersten Schritt sind keine Effizienzmetrik für spielbare Züge.

### 3.2 Die reproduzierte Fehlerkette

1. Alpha [`gm/runtime.js:54`](../../avereth-gm-alpha/gm/runtime.js#L54) sendet `commandVocab.commands[].args` als `commandSchemas`. Für GO steht darin `to:{ref:"place"}`. Das ist eine **interne Typbeschreibung**, kein zulässiger Referenzwert.
2. Die eigentliche Engine verlangt als bekannte Referenz den String `"loc.alderwatch.guild_hall"`, alternativ für ein unbekanntes Ziel `{new:"Name"}`. `interpret.js:186–196` und `schema.js:31` setzen diesen Vertrag um. Die alten `vocab.rules` erklären ihn ausdrücklich; der Alpha-Prompt übermittelt diese Erklärung nicht. Auch `describe` reicht wieder die rohe Vokabularbeschreibung zurück.
3. Beide Originalantworten scheitern lokal ausschließlich an `$.commands[0] (go): .to: matches none of anyOf`. Nur den Wert von `to` in den ID-String zu ändern macht beide Pläne gültig. Das fehlende `within` der ersten Antwort wird korrekt normalisiert.
4. Auf kopiertem `forest200`-Vorstand lehnt Alpha `prepare()` die Originalantwort entsprechend ab. Der vorhandene alte Reparaturpfad wird angefordert, aber [`gm/engine.js:19`](../../avereth-gm-alpha/gm/engine.js#L19) erlaubt nach dem eingeschleusten Plan nur Board-/Forge-Aufrufe und weist `plan_repair` ab.
5. Dieselbe Vorbereitung mit ausschließlich korrigierter Referenz funktioniert: `plan.failed=false`, GO `authorized`. **Das ist noch keine Ankunft**; diese benötigt weiterhin einen gültigen Weltabschluss. Es beweist, dass die vorhandene Engine die gewählte Handlung bereits unterstützt.
6. Eine erfolgreiche HTTP-/JSON-Antwort wird vom Scheduler als `completed` gespeichert. Fachliche Ablehnung folgt erst danach; `step` bleibt 0. Bei Wiederaufnahme liefert [`scheduler.js:12`](../../avereth-gm-alpha/gm/scheduler.js#L12) dieselbe Antwort erneut. Es fehlt ein Zustand für einen abgeschlossenen, aber fachlich verworfenen Modellvorschlag.

Die In-memory-Probe mit exakter Originalantwort und tatsächlichem Alpha-Executor bestätigt: Erstversuch und Resume scheitern identisch, **nur ein geskripteter Transport**, Lease `completed`, Kapazität 0, Turn `active/step:0`, Weltrevision 0, keine Veröffentlichung, Position unverändert. Das ist ein **Wiederherstellungsstillstand nach fachlicher Ablehnung**, keine Concurrency-Sperre. Die alte Fehlermeldung empfiehlt zudem Regenerate, während die Alpha Regenerate sperrt.

**Ursache:** Ein unterstützter Spielerwunsch trifft auf einen falsch veröffentlichten Werkzeugvertrag, dann auf den entfernten Reparaturweg und einen ungeeigneten Wiederaufnahmestatus. Keine neue Bewegungsmechanik und keine Änderung von Temperature oder Reasoning ist nötig, um diese Fehlerklasse zu erklären.

### 3.3 Was offen bleibt

Der neue Export enthält weder den vollständigen Alpha-Chat noch Journal und Browserkonsole. Deshalb sind tatsächliche Klickfolge, angezeigte Fehlermeldung und persönlicher Endzustand nicht abschließend bewiesen. Ein normales Resume desselben unveränderten Zuges würde gerade keinen zweiten Providerrequest senden; möglich ist beispielsweise Verwerfen und erneutes Senden. Das wird nicht als Tatsache ausgegeben. Uploadmeldungen für Dateien beweisen für sich keinen Weltcommit.

Separater Diagnosefehler: Featherless liefert hier `message.reasoning`, die Alpha erkennt nur `reasoning_content` (`transport.js:32`). Damit kann die Diagnose separates Reasoning fälschlich verneinen. Das ist kein belegter Auslöser der Reiseablehnung. Ein eigener Reasoningtokenanteil ist nicht ausgewiesen; es wird keiner errechnet.

## 4. Was die alte Engine tatsächlich geleistet hat

Die folgende Auswahl stammt aus persönlichen Originalen; `I` bezeichnet den Nachrichtenindex im jeweiligen archivierten Chat. Nicht jede damalige Schwäche besteht unverändert auf `.200` fort.

| Fähigkeit | Originalbeleg | Wert und Einschränkung |
|---|---|---|
| Zusammenhängendes RPG statt einzelner Demonstrationen | User04, `.159`: 46 Eingaben, 38 Enginezüge, Mage Level 1→8, vier gewonnene Kämpfe, Dungeon-Clear, Gildenabgabe, Übernachtung und Titanjagd | Ein real durchspielter Fortschrittsbogen. Balance war dennoch zu leicht |
| Kampf, Ressourcen, XP und Loot | User04 I23/I51/I85: Kampfabschlüsse; Warden `enc.t22`; I80: tatsächliche Ankunft, Gegner, Awareness/Concealment und `check.recorded` | Vorhandene Fachauflösung schützen. I82 erzählt trotzdem fälschlich, der Titan habe Alaric noch nicht gefunden |
| Questangebot und lohnender Abschluss | User04 I11/I12: reparierter F-Questmix; I63/I64: Gildenankunft, Belegprüfung, +90 cp, Quest-/XP-Buchung | Spieler lobt ausdrücklich die verbesserten Quests mit einzelnen hohen F-Gegnern. Der Board-Reparaturpfad war praktisch nützlich |
| Gebundener Handel und Unterkunft | User02 I70/I71: fünf Gütergruppen, +169 cp; User04 I69: Zimmer −8 cp, Zeit und Ressourcen | Das Modell summiert im Verkaufsangebot Einzelwerte falsch; Engine bucht die ausdrücklich vereinbarte Gesamtsumme. Berechnungsautorität und Angebotsverständnis sind verschiedene Probleme |
| Freie Objekt-/Weltentwicklung | User01 `.155`, I26/I28: pick-head, satchel, wax jar, trowel, flask, document; User04 I92: Lair-/Track-/Debris-Fakten und Thread | Bereits freie Erfindung mit echten Events. Die alte Architektur war kein reiner Renderer fester Ereignisse |
| Hilfreiche Rückfrage | User01 I29/I30: zwei Passagen, CLARIFY ohne Kosten/Wurf; User04 I53/I54: ungültige Statvergabe ohne Teilbuchung | Eine passende Rückfrage verbessert Spielerhoheit. Jede Unterbrechung als Architekturversagen zu zählen wäre falsch |
| NPC-Identität und konkrete Erinnerung | User02 I11/I12: Drinkzusage mit Tam-ID; I53/I54: passender Deal; I67/I68: Brokerführung „as promised“ | Spieler bestätigt Tams Erinnerung. **Korrektur am damaligen Review:** I53 fragt „so about that deal we had?“; kein Nachweis völlig spontanen Erinnerns ohne Cue |
| Sichtbare Fachzustände | Originalfeedback lobt lesbareres Questboard und nutzt `#passives`; Mechanik bleibt vom Erzähltext unterscheidbar | UI, Erklärungen und editierbare Handlungsvorschläge gehören zur Nutzbarkeit, nicht nur zur Verpackung |

Auch natürliche automatisierte NPC-Läufe zeigen vor dem Architekturwechsel eigenständiges Weltgeschehen: `.188` Rogue #29/#30 mit Eelfischer und Hinweis, #72/#74 mit Vessas Gespräch; `.191` Warrior #41/#42 mit Lichtphänomen und `thread.t21.1`, #95/#96 mit Hedwins Spuren und gespeichertem Wissen. Das sind **keine persönlichen Runs**. Sie widerlegen aber die Behauptung, erst eine neue GM-Rolle ermögliche solche Szenen. Die alte PULSE-Diagnose unterschätzte teilweise tatsächlich erzeugte Inhalte.

Die Gründe für die funktionierende Breite waren nicht allein gute Mathematik: reife Befehlsabbildung, domänenspezifische Kataloge, bekannte IDs und Referenzregeln, Reihenfolge/Abhängigkeiten, begrenzte Modellreparatur, verbindliche Ergebnisaufbereitung, NPC-Karten, Weltvalidierung und UI arbeiteten zusammen. Das ist die zu bewahrende Einheit.

## 5. Die alten Probleme waren ebenfalls real

Eine Rückkehr darf folgende Belege nicht ausblenden:

- **Mehrteilige freie Aktionen:** User01 I73/I74 koppelt Reisen und späteres Schleichen falsch; Reise wird nicht ausgeführt, Stealth am falschen Ort geprüft, trotzdem Zielprosa. User04 I91/I92 will Leiche, Pool und Höhle untersuchen; ein Leichenloot-Kurzpfad blockiert mehr als beabsichtigt. Ein anderes LLM-Frontend beseitigt begrenzte Handlungsausdruckskraft nicht automatisch.
- **Orts-/Erzählkontinuität:** User02 I49–I52 benötigt zwei Dungeonexit-Versuche; weitere geführte Ortswechsel blockieren Folgeinformationen. `.188` zeigt länger anhaltende Ortsdrift; `.191` enthält den Hesse-Präsenzfall, der später eng korrigiert wird. Die bloße Anzahl der Modelle erklärt diese Fehler nicht.
- **NPCs und Spielrhythmus:** Userfeedback nennt spezifisches Metawissen bei Tam, stellenweise unnatürlichen Gesprächsanschluss, fehlende Persönlichkeit, passive Monster und zu wenig unerwartete Weltinhalte. Teile entstanden vor PULSE/E3 und späteren Korrekturen. Daraus folgt weder „alles gelöst“ noch „.200 immer noch identisch schlecht“.
- **Domänenbürokratie:** Essen/Bad/Zimmer als nicht erkannte Gesamtsumme, Smalltalk als Verkauf, wiederholtes Fragen nach einem Preis. Der Spieler wollte teils einen einfacheren Shop, wenn das natürlicher funktioniert. Mechanisch sichere Ablehnung allein erfüllt dieses Bedürfnis nicht.
- **Realer `.200`-Transport-/Abschlussfehler:** Planner 12.244/58 Tokens und 17,775 s, Narrator 10.282/338 und 19,125 s; Extractor nach etwa 121 s gescheitert. Waldgeschichte sichtbar, Waldankunft nicht gebucht. Anschließend drei belegte Concurrency-Ablehnungen bei vier aktiven plus vier angefragten Einheiten und Limit vier. Keine belegte Crediterschöpfung. Der unbekannt beendete Extractor ist eine passende Ursache, aber externe Belegung oder Providerverhalten sind nicht abschließend ausgeschlossen.

Die alte Engine schützte an manchen Stellen den Eventzustand, während die sichtbare Geschichte bereits falsch weiterlief. Die Alpha hält stattdessen den ganzen Zug zurück. **Korrekte Daten mit widersprüchlicher Geschichte und korrekte Daten mit dauerhaft blockierter Handlung sind zwei verschiedene schlechte Spielerlebnisse.** Die Kurskorrektur muss Konsistenz und Fortsetzbarkeit gemeinsam erreichen.

## 6. Was der Wechsel konkret verbessert, verschlechtert oder verloren hat

Die lokale Byteprüfung bestätigt: **95/95 Engine-/Contentdateien der Alpha stimmen mit `.200` überein.** Das schützt die enthaltenen Funktionen, beweist aber weder ihre Erreichbarkeit noch richtige Modellinputs oder vollständige Anzeige.

| Bereich | Alpha-Stand und Codebeleg | Einordnung |
|---|---|---|
| Request-/Hostsicherheit | Gewichteter Scheduler, gespeicherte Receipts, feste Chatidentität, Save/Read-back, Veröffentlichung erst nach Abschluss | Wertvoller technischer Fortschritt; frühere Browsermocks belegen begrenzte reale ST-Wege, keine Langkampagne |
| Mechanischer Kern | Unveränderte Berechnungen, Eventfold, World-/Domainhandler | Erhalten; nicht neu entwickeln |
| Commandvertrag | Rohe `args` statt aufgelöster Referenzregeln; `describe` wiederholt das | Aktueller natürlicher Fehler plus lokale Reproduktion |
| Erster Weltvertrag | `engine.js:48–51` erzeugt vor Vorbereitung ein Schema mit `ids:{}`. Bekannte Orte fehlen in dessen Szenenreferenzen, obwohl CORE eine kanonische Szene fordert | Nachgewiesener Vertragswiderspruch; im neuen Gildenlauf noch nicht erreicht |
| Katalog | Alpha `runtime.js:43`: `buildCatalog(s,content)`; Produkt `v4/runtime.js:344`: `{known:true,c:true}` | `valid_places`, Gear-Markt, bekannte Boardeinträge, Living-Dungeon-Zeilen und bezahlte Unterkunft fehlen/bleiben leer (`catalog.js:321–368`). Informationsverlust belegt, natürliche Fehlerquote dieser Domänen offen |
| Ergebnis- und Situationskontext | `engine.js:24` liefert `context`, Alpha `runtime.js:99` reicht nach Resolve nur Outcome/Panels weiter | Bewährte NPC-Ankunfts-/Kontinuitätskarten, `NOT YET SHOWN`, situationsbezogene Guild-/Tradehinweise, World Envelope und Ortskorrekturen werden nicht gleichwertig zugestellt. Ein Teil der Rohdaten bleibt vorhanden |
| NPC-Gedächtnis | Alle Anwesenden erhalten Knowledge/Memory/Threads und drei Traittypen (`runtime.js:22–26,52`) | Nicht gelöscht, aber priorisierte Auswahl, Perspektivaufbereitung, Beziehungen/Haltung und Abruf Abwesender ersetzt. Mehr Rohdaten sind nicht automatisch bessere Erinnerung; Größe wächst ohne entsprechende Auswahl |
| Weltvalidierung | Derselbe `parseExtraction`-/`applyExtraction`-Pfad, aber nur drei generische Worldregeln statt der alten semantischen Erläuterungen | Der Extractor-Aufruf entfällt; seine Aufgaben und Beweispflichten bleiben. Ein JSON-Schema allein erklärt weder Präsenz noch Finanz-/Ankunftsbelege |
| Fehlerkorrektur | Rejected Proposal nicht von abgeschlossenem Request unterschieden; kein alter `plan_repair` | Wiederaufnahme kann dieselbe ungültige Antwort endlos wiedergeben. Nachgewiesener lokaler Stillstand |
| `#system` | Alle Steuerbefehle werden lokal behandelt (`runtime.js:78–81`) | Lokale Probe `#system How does my Basic Attack damage work?`: null Modellrequests, Veröffentlichung des rohen Enginekontexts samt `SYSTEM QUERY`-Anweisung statt Antwort. Produkt besitzt ausdrücklich eine LLM-Ausnahme (`commands.js:442`, `v4/runtime.js:744`) |
| Toolfortsetzung | Ein kompletter Spielerbatch pro Turn; nach Worldtool nur append-only-Prosa und promise/debt/rumor-Threads | Sichere Begrenzung des Prototyps, aber keine gleichwertige freie Werkzeugfolge. Keine neuen Personen/Orte/weiteren mechanischen Folgen in dieser Fortsetzung |
| Bedienung | Swipe, Regenerate, Continue, Edit und Löschen gesperrt | Bewusster Funktionsverlust zugunsten der Sicherheit; kein bestandener Ersatz für die alten Möglichkeiten |
| Modell-/Hostpfade | Alpha 2 eng auf GLM/Featherless Chat Custom begrenzt; gepinnter Tokenizer | Bessere überprüfbare Konfiguration, geringere Austauschbarkeit. Andere Pfade nicht als kaputt behaupten, sondern derzeit ausgeschlossen |

Das wichtigste Muster ist **beibehaltener Validator bei verlorener Vermittlung seiner Voraussetzungen**. Dies betrifft sowohl Mechanik als auch Gedächtnis. Das aktuelle GO ist der kleinste sichtbare Fall eines umfassenderen Integrationsproblems.

## 7. Grundlegende Ursachen und bisherige Fehlannahmen

### 7.1 Modellrollen wurden zusammengelegt, Facharbeit wurde nicht beseitigt

Die Alpha ist noch kein von Grund auf passender GM-Werkzeugkern. `prepare()` speist einen GM-Befehl als künstliche Plannerantwort in `prepareGenerationAsync`; `validate()` liest das gemeinsame Worldobjekt über die alte Extraktionsstruktur. Der GM übernimmt nun gleichzeitig Deutung, Command-DSL, Erzählung und Memory-/Extraktions-DSL. Dazu erhält er weniger Erklärungen und weniger ausgearbeiteten Kontext als die früher spezialisierten Phasen.

Ein Rollenname oder ein verkürzter Systemvertrag verringert diese Aufgabenlast nicht. Mehrere Modellphasen können vermeidbar sein; ebenso kann eine spezialisierte Phase sinnvoll sein, weil sie Referenzen oder übersehene Erinnerungen besser behandelt. Beides muss anhand echter Ergebnisse entschieden werden.

### 7.2 Der Vertrag muss die tatsächlichen Fähigkeiten erklären

„Tools vorhanden“ bedeutet nicht „Tools benutzbar“. Ein Werkzeug braucht dieselben IDs, zulässigen Formen, Erfolgs-/Teilresultate und Grenzen wie seine Validierung. Die Alpha sendet früh ein großes Worldschema, aber beim einfachsten GO fehlt die entscheidende ID-Regel. Das Problem ist somit **Informationsauswahl und Vertragskonsistenz**, nicht bloß Promptlänge.

Das Projekt hatte diese Fehlerfamilie schon einmal: Der historische GM-Tools-Bericht `717e2f7`, `P0_BERICHT.md:245`, dokumentiert einen „Hidden Schema“-Fehler — Enums, Pflichtfelder, Ortsarten und Referenzregeln nur im Validator, nicht im Prompt. Die damalige Stichprobe war dadurch nicht als Architekturvergleich brauchbar. Die historische Korrektur bestand in echten Formatregeln und Promptprüfung. Diese Erfahrung wurde beim neuen Wrapper nicht ausreichend übernommen.

Die damalige Entscheidung für einen semantischen Planner war ebenfalls differenzierter als „Toolcalling funktioniert nicht“: `P0_S4B.md` kennzeichnet Schemaartefakte und erklärt die semantische Überlegenheit von P1 gegenüber FC ausdrücklich als nicht bewiesen. Die tragfähige Lehre war Sprachdeutung mit deterministischer Prüfung, nicht das ewige Festschreiben dreier Rollen.

Auch gemeinsame Memoryausgabe wurde historisch bereits natürlich untersucht: `P0_BERICHT.md`, §4, berichtet für 41 ausgewertete Züge deutlich mehr unvollständige/ungültige gemeinsame Blöcke und nötige Recovery als bei getrennter Extraktion. Andere Prompts, Modelleinstellungen und Aufgabenformate erlauben keine Übertragung der damaligen Quote auf Alpha 2. Der Befund begründet aber, einen spezialisierten Leser als ernsthafte Option zu erhalten und seine Abschaffung erneut natürlich nachzuweisen.

### 7.3 Sichere Wiederholung braucht auch Fortschritt

Der neue Scheduler löst korrekt die Frage „Darf derselbe abgeschlossene Effekt nochmals entstehen?“. Unzureichend gelöst ist „Wie wird ein **noch wirkungsloser**, fehlerhafter Vorschlag korrigiert?“.

Mindestens drei Tatsachen sind zu trennen: Providerantwort abgeschlossen; Vorschlag fachlich angenommen/abgelehnt; Effekte verbindlich bestätigt. Begrenzte Korrektur eines abgelehnten Vorschlags darf einen neuen Modellschritt erzeugen, ohne einen bestätigten Effekt zu wiederholen. Remote-unbekannt bleibt dagegen gesperrt. Eine Reparatur ist nicht automatisch eine unkontrollierte Retrykette; die alte begrenzte Planreparatur wurde hier ohne gleichwertigen Ersatz entfernt.

Auch die strikte Gesamtverwerfung hat Kosten: Ein formal unzulässiges nebensächliches Delta kann eine ansonsten gültige Szene blockieren. Die Lösung darf nicht sein, wichtige Zusagen oder Mechanik still wegzuwerfen. Erforderlich ist eine erkennbare Korrektur desselben noch unveröffentlichten Kandidaten, unter Erhalt bereits bestätigter Ergebnisse. Die genaue fachliche Teilbarkeit ist noch zu klären, kein in diesem Auftrag implementierter Automatismus.

### 7.4 Kreative Freiheit und niedrige Requestzahl wurden zu eng verbunden

Der alte Narratorvertrag erlaubt ausdrücklich eigene NPC-Motive, Hilfe, Ablehnung, Reise, Information und Weltreaktionen. `context.js:347` erlaubt gewöhnliche nichtmechanische physische/soziale Unsicherheit aus der Fiktion heraus. Reale Originale bestätigen freie Erfindung. Die Aussage „früher Renderer, jetzt kreativer GM“ beschreibt das Produkt nicht zutreffend.

Umgekehrt ist die neue once-per-turn-/thread-only-Fortsetzung teils enger als die versprochene dynamische Rolle. Sie ist als Prototypschutz nachvollziehbar, aber für ein frei fortlaufendes RPG kein erwiesener Fortschritt. Neue LLM-Rollen beheben auch fehlende Fachsemantik für komplexe freie Handlungen nicht. Eine allgemeine Würfel-/Diebstahlmechanik darf deshalb nicht heimlich als Vertragsreparatur erfunden werden.

### 7.5 Gedächtnisqualität hängt an Auswahl, Bedeutung und Wiederverwendung

Persistenz ist mehr als „JSON wurde gespeichert“. Relevant sind stabile Identität, Gegenstand einer Zusage, Beteiligte, Quelle, Status, Perspektive, Abruf zum richtigen Moment und natürliche Verwendung. `recall()` aller anwesenden NPCs ersetzt diese Kette nicht. Ein NPC kann außerdem in der Spielereingabe wichtig werden, bevor er als anwesend gebucht ist.

Direkte gemeinsame Ausgabe kann Übersetzungsverluste vermeiden. Sie kann aber eine bedeutende Zusage in Prosa und Memory gleichzeitig übersehen. Ein zweiter Leser ist keine Garantie, besitzt aber eine andere Fehlerchance. Die Wahl muss an späterer Erinnerung **ohne Originaldialog** und an tatsächlicher Gesprächsnatürlichkeit geprüft werden. Das rohe Gesamtwissen an einen GM zu senden schützt auch bei etikettierten Perspektiven nicht automatisch vor Metawissen.

### 7.6 Der Abnahmemaßstab verschob sich

Die Alpha-2-Abnahme dokumentiert 40 Node-Tests und 53 abschließende Browserprüfungen, davon 52 technische Erfolge und eine bestätigte bekannte semantische Schwäche. Diese Angaben werden nicht bestritten. Die Erfolgsantworten stammen aber aus geskripteten Fixtures, etwa gültigen vorbereiteten Plänen in `alpha.test.mjs:24–28`. Damit wird gerade **nicht** geprüft, ob das reale Modell aus dem tatsächlich gesendeten Vertrag gültige Pläne erzeugt.

Der vorbereitete natürliche GM-vs.-B-Vergleich dokumentiert weiterhin **0 natürliche Providerrequests**. Das Nichtstarten ohne gesonderte Freigabe war korrekt. Es fehlte deshalb trotzdem der entscheidende Fähigkeitsnachweis. Bereits die vorige Architektur-Neubewertung verlangte ihn ausdrücklich vor Qualitätsaussagen; sie warnte auch davor, `applyExtraction` bloß als fertiges GM-Tool umzudeuten.

Die Alpha-Berichte schränkten ihre Aussagen ein und empfahlen nur einen kurzen manuellen Versuch. Der Vorwurf wäre daher nicht, alle Grenzen seien verschwiegen worden. **Die praktische Fehlentscheidung bestand darin, Installierbarkeit und Transportoptimierung weiterzuführen, bevor der neue Modellvertrag und seine Funktionsbreite natürlich oder zumindest gegen die alten tatsächlichen Nutzungspfade ausreichend geprüft waren.** Der Spieler wurde dadurch zum ersten Entdecker eines elementaren Schnittstellenfehlers.

Meine frühere Empfehlung war an dieser Stelle zu optimistisch. Die richtige Korrektur ist eine strengere Reihenfolge der Nachweise und Wiederverwendung gereifter Schnittstellen, nicht eine weitere Liste allgemeiner Verbote im GM-Prompt.

### 7.7 Serielle Wartezeit ist ein Architekturproblem, nicht nur ein Transportproblem

Unter den belegten vier Kapazitätseinheiten und vier Einheiten pro getesteter GLM-Anfrage bleibt praktisch ein gleichzeitig laufender Request. Die alten Phasen hängen zudem inhaltlich voneinander ab. Ein Scheduler verhindert unbeabsichtigte Überlappung, entfernt aber keinen dieser seriellen Schritte. Wird die endgültige Anzeige korrekt bis zum Weltabschluss zurückgehalten, wartet der Spieler auch auf die erforderliche Weltinterpretation und Speicherung. Ein sehr langsamer oder gescheiterter Extractor wird dann vollständig als ausbleibende Geschichte spürbar.

Deshalb gehört die Verringerung **unnötiger Pflichtrequests** zum eigentlichen Architekturziel. Maßgeblich sind Zeit bis zum bestätigten spielbaren Abschluss, Unterbrechungen und erhaltene Inhalte. Ein größerer, stärker belasteter GM mit vielen Toolabfragen oder Reparaturen kann trotz weniger Rollen langsamer sein; weniger Requests garantieren keinen Gewinn. Die etwa 121 Sekunden aus dem `.200`-Run sind ein Timeoutbefund, keine gemessene normale Extractorlatenz. Es wird daraus keine erwartete Einsparung errechnet.

Unter dem beschriebenen Chat-Tarif liegt der mögliche Nutzen vor allem in Wartezeit, Kontextübertragung und weniger erforderlichen Übergängen. Eine proportionale Geldersparnis pro eingespartem Request oder verbrauchte Credits sind nicht belegt. Gemeinsame Ausgabe zu prüfen bleibt deshalb sinnvoll, auch wenn ihre Zuverlässigkeit noch offen ist.

## 8. Vergleich der realistischen Wege

Konsistenz, Spielerhoheit und fortsetzbares Spielen sind Mindestbedingungen. Danach zählen Aktionsabdeckung, glaubwürdige Welt/NPCs, Gedächtnis und Wartezeit gemeinsam. Unnötige Pflichtrequests sollen entfallen, sofern ihre Fachaufgabe zuverlässig anderweitig erfüllt wird. Die Tabelle enthält qualitative technische Urteile, keine erfundenen Benchmarks oder Qualitätsnoten.

| Weg | Stärken | Entscheidender Nachteil | Urteil |
|---|---|---|---|
| Unveränderte `.200` vollständig wieder einsetzen | Fachliche Weiterentwicklung der breitesten persönlich belegten alten Engine-Linie; vorhandene Bedienwege | Bekannter sichtbarer Weltvorlauf, getrennte Retries und Providerfehler; keine neue Langzeitfreigabe | Rückfallreferenz erhalten, als dauerhafte Lösung unzureichend |
| Alpha 2 mit isolierten Schema-/Samplerfixes weiterführen | Kleine erste Korrektur; neue Hostgrundlage bleibt | Kontext-, Reparatur-, Memory- und UI-Paritätslücken bleiben; Schemafix allein ergibt kein gutes RPG | Nicht empfohlen |
| **Bestehenden GM für einen begrenzten Vergleich fachlich vervollständigen** | Kanonische Werkzeugverträge, alte Kontextprojektionen und begrenzte Korrektur beheben die nachgewiesenen Vermittlungslücken im gewählten Spielbogen; die Rollenannahme kann danach fair geprüft werden | Natürliche Aktionsabdeckung, gemeinsame Memoryauswahl und Fortsetzungsfähigkeit bleiben offen; Umfang darf nicht vor dem Vergleich zum Vollumbau anwachsen | **Empfohlener nächster Erkenntnisschritt; keine neue Auslieferungs- oder Produktfreigabe** |
| Bewährte `.200`-Modellvermittlung an neue sichere Zugsteuerung anbinden | Erhält erprobte spezialisierte Deutung und Weltinterpretation; mögliche sichere Rückfall-/Vergleichsbasis | Zusätzliche Integrationsarbeit und serielle Pflichtphasen; weder Aufwand noch Spielergewinn dieser Verbindung bereits gemessen | Fachliche Referenz erhalten; gezielt einsetzen, wenn der vervollständigte GM entsprechende Fähigkeiten nicht trägt. Kein vollständiger Aufbau als Vorbedingung |
| Sofort vollständige neue GM-/Eventarchitektur | Größte Freiheit zur Neugestaltung des Werkzeugschnitts | Natürlicher Nutzen unbewiesen; große erneute Funktions-/Regressionlast bei bereits vorhandenen brauchbaren Domänen | Derzeit nicht gerechtfertigt |

Der existierende **B-Prototyp ist kein fertiger Ersatz für `.200`**. Sein eigener Vergleichsbericht nennt unvollständige produktive ST-Injections, Encodingartefakte und abweichende Reparatur-/Teilbuchungswege. Er liefert Infrastruktur und Versuchsabläufe. Für einen fairen Vergleich müssen die fachlich benötigten Informationen und Abläufe aus dem tatsächlichen Produkt stammen.

Die begrenzte Alpha-Vervollständigung könnte weniger Umbau erfordern als eine vollständige Referenzanbindung; der Aufwand ist noch nicht vermessen. Ihr Vorrang als nächstes Experiment folgt aus dem Erkenntnisgewinn: Der bisherige natürliche Fehler prüfte die GM-Fähigkeit mit einem falschen Vertrag. **Eine zweite vollständige Architektur vor einem fairen Test dieser Fähigkeit zu bauen wäre verfrüht.** Das ist keine Vermutung, GLM werde schon alles beherrschen. Scheitert es trotz richtiger Voraussetzungen wiederholt an wichtigen Handlungen oder Memory, oder erfordert bereits der kleine Durchstich einen unverhältnismäßigen Umbau, erhalten gezielte zusätzliche Sprachadapter beziehungsweise die Referenzanbindung Vorrang.

Das Ziel bleibt ein kreativer GM: Er entscheidet gewöhnliche NPC-Reaktionen, Dialog und plausible Weltentwicklung; die Engine entscheidet geschützte Folgen und bewahrt bedeutende Fakten. Fachlich verständliche Werkzeuge können die interne Notation hinter eindeutigen Abbildungen verbergen. Die semantische Arbeit verschwindet dadurch nicht: Sprachverständnis und wichtige Memoryauswahl müssen weiterhin der GM oder ein zusätzlicher Sprachadapter leisten. Letzterer macht den GM nicht zum bloßen Renderer; seine Notwendigkeit darf aber nicht allein aus der bisherigen Rollenverteilung abgeleitet werden.

### Angestrebte Aufrufmuster — keine gemessenen Zusagen

| Situation | Zu prüfendes Ziel | Grenze |
|---|---|---|
| Gewöhnliches Gespräch oder NPC-Reaktion ohne neue geschützte Wirkung | Ein GM-Request mit bedeutendem Memory und sicherem Weltabschluss | Fällige Zeit/PULSE-Vorgänge dürfen nicht entfallen, um die Zahl einzuhalten; Memoryvollständigkeit natürlich prüfen |
| Unterstützte Bewegung, Handel oder Kampf mit benötigtem Engineergebnis | Häufig GM-Werkzeuganforderung → Engine → GM-Fortsetzung, also zwei physische Requests | Schemaabruf, Board/Forge, Unterbrechung und nötige Korrektur können weitere Requests verursachen |
| Mehrdeutige oder zusammengesetzte Handlung | Gezielte zusätzliche Deutung oder echte Rückfrage | Keine still ausgelassenen Teile, keine vom Modell erfundene Entscheidung |
| Bedeutende Weltentwicklung mit zweifelhafter Memorydeckung | Gezielter zusätzlicher Leser, wenn erforderlich | Wie ein Bedarf zuverlässig erkannt wird, ist selbst offen; siehe §13 |
| Reiner Formatfehler ohne veränderte Bedeutung | Explizit erlaubte lokale Normalisierung, sonst begrenzte Korrekturfortsetzung | Keine geratenen Referenzen, ergänzte Spielerentscheidungen oder neue mechanische Buchung |

Ein einfacher Ablauf benötigt damit nicht grundsätzlich Planner, Narrator und Extractor. Zusätzliche Requests bleiben korrekt gezählt, auch wenn sie als Toolfortsetzung, Reparatur oder Generator bezeichnet werden. Die Tabelle ist ein Entwicklungsziel unter Zuverlässigkeitsbedingungen, kein natürlicher Leistungsnachweis.

## 9. Was konkret wiederverwendet, zurückgenommen und offen gehalten werden sollte

**Direkt wiederverwenden:** mechanische Berechnungen, Eventfold, vorhandene Domänenhandler und Inhalte, Identitäts-/Wissens-/Memory-/Threadsysteme, Ortsbuch, PULSE, gebundene Angebote/Quests, bestehende UI-Fachinformationen. Hinzu kommen die bisherigen kontextabhängigen Kataloge, NPC-Karten und Ergebnisprojektionen. Ihr Inhalt muss erhalten bleiben; ein unveränderter alter 35-kB-Globalprompt ist daraus keine automatische Forderung.

**Aus dem Experiment erhalten:** zentraler gewichteter Scheduler, dauerhafte Requestbelege, Turn-/Revisionsbezug, feste Chatidentität, zielgebundenes Save/Read-back, Commit vor Veröffentlichung und Schutz gegen Doppelwirkung. Fehlerkorrektur und Bedienbarkeit müssen darauf aufbauen. Keine Rückkehr zu sofortigen Retries bei ungewissem Remoteabschluss.

**Zurücknehmen als Entwicklungsannahme:** bytegleicher Kern garantiere gleiche Spielbarkeit; direktes World-JSON ersetze bereits die gesamte Gedächtnisarbeit; ein Ein-Aufruf-Gespräch sei für sich ein Erfolg; jede automatische fachliche Korrektur sei gefährlich; blockierte Swipes oder große sicher abgewiesene Prompts seien bereits gleichwertige Produktlösungen. Ebenso wenig verlangt die Bewahrung einer Fachfunktion automatisch ihren bisherigen separaten LLM-Aufruf.

**Als Kandidaten prüfen:** gemeinsame GM-/Memory-Ausgabe und ein kleiner situationsbezogener Werkzeugvertrag zuerst im begrenzten GM-Vergleich; gezielter zweiter Leser und zusätzliche Deutung bei nachgewiesenem Bedarf. Konservatives Routing, weitere Werkzeugfortsetzungen und alternative Erzählungen bleiben möglich. Funktionierende Codewege dürfen technisch vereinfacht werden, wenn ihre Wirkung und Schutzleistung erhalten bleiben. Bewusste Fairness-/PULSE-Regeln getrennt bewerten, nicht beim Umbau still lockern. Keine neue NPC-Agenda-, Combat-, Shop- oder allgemeine Checkmechanik als Nebenprodukt dieses Architekturwechsels.

## 10. Nächster konkreter Nachweis statt weiterer Architekturspirale

Die folgenden Schritte sind eine Empfehlung für den nächsten Auftrag, keine hier ausgeführte Implementierung und kein vollständiger Fachplan.

1. **Den vorhandenen GM für einen klar begrenzten Spielbogen fachlich vervollständigen.** Tatsächlichen Command-/Worldvertrag, IDs, relevante `.200`-Kontextprojektionen und korrigierbare Vorschläge auf der vorhandenen sicheren Hostgrundlage zusammenbringen. Der Modellprompt muss die Formen und fachlichen Voraussetzungen erklären, die der Validator verlangt. Reine Fahrt, NPC-Gespräch samt Memory und eine unterstützte mechanische Handlung bilden den ersten Durchstich. Kein Vollumbau aller Domänen, keine zweite vollständige Pipeline und keine neue breite Alpha-Auslieferung vor seinem natürlichen Nachweis.
2. **Die aktuellen Fehler als Eingaben erhalten.** Beide aufgezeichneten GO-Antworten müssen nachvollziehbar korrigierbar oder verständlich ablehnbar sein; Resume darf weder denselben ungültigen Vorschlag ohne Ausweg wiederholen noch neu würfeln. Zusätzlich `#system`, falscher Chat, Stop, Savefehler und fehlgeschlagener Weltabschluss gezielt prüfen. Requestabschluss, Vorschlagsgültigkeit und bestätigte Effekte getrennt beobachten. Lokale Normalisierung nur unter den engen Voraussetzungen aus §13.
3. **Vor der natürlichen Probe die technischen Voraussetzungen des kleinen Bogens prüfen.** Originalformulierungen statt nur fertiger Toolantworten als Ausgangspunkt; tatsächlichen gesendeten Vertrag gegen den Parser und benötigten Kontext prüfen. Gespeicherte Antworten kontrollieren Zustand und Host, nicht Sprachkompetenz. Mindestens Gildenreise → NPC-Kontakt/Zusage → unterstützte Gegenstandsverwendung oder gebundener Handel → Folgezug/Wiedersehen; Mehrdeutigkeit, Negation und Ablehnung ergänzen. Eine bereits geskriptete Zusage darf im natürlichen Erstgespräch nicht erzwungen werden.
4. **Früh eine gesondert freizugebende kurze natürliche Probe durchführen.** Eine vom Spieler gesteuerte zusammenhängende Sequenz mit echten Anschlussreaktionen ist hier aussagekräftiger als weitere allgemeine Mockzahlen. Erinnerung zusätzlich nach Entfernung des ursprünglichen Dialogs prüfen. Relevante Fehler mit denselben Ausgangszuständen, demselben Modell und vollständigen Fachinformationen gezielt gegen die vorhandene spezialisierte Deutung beziehungsweise Extraktion vergleichen. Dafür ist keine vollständige zweite ST-Architektur Voraussetzung; Einschränkungen des B-Prototyps ausdrücklich berücksichtigen. Keine solche Anfrage wird durch diesen Bericht gestartet.
5. **Nach Ergebnis entscheiden und erst dann verbreitern.** Beherrscht der direkte GM Handlungsteile, Memory und Wiederaufnahme bei gutem Spielfluss, anschließend Board/Annahme, Unterkunft, Kampf/Stealth, Abgabe und die übrige bewährte Bedienbreite systematisch nachziehen. Scheitert er trotz richtiger Voraussetzungen an bestimmten Aufgaben, dort einen zusätzlichen Planner oder Memoryleser einsetzen und Wirkung messen. Verlangt schon der begrenzte Durchstich einen unverhältnismäßigen Umbau oder bleibt er grundsätzlich unspielbar, die `.200`-Referenzanbindung priorisieren. Weder der kleine Erfolg noch sein Scheitern entscheidet automatisch über jede Domäne.

### Gemeinsame Abnahmekriterien

| Prüfziel | Konkreter Nachweis |
|---|---|
| Gewählte Handlung bleibt erhalten | Alle ausdrücklich gewählten Teilhandlungen und Bedingungen sind aufgelöst, sinnvoll geklärt oder sichtbar nicht unterstützt; keine stille Auslassung |
| Spieler bleibt handlungsfähig | Ein korrigierbarer Formfehler führt nicht zum unlösbaren Turn; keine Antwort empfiehlt eine gesperrte Bedienfunktion |
| Mechanik stimmt | Identische gewählte Aktionen auf identischem Zustand ergeben dieselben Berechnungen; Wiederaufnahme verursacht kein zweites Geld, Loot, XP, RNG, Zeit oder PULSE |
| Welt und Text passen | Ankunft, Unterbrechung, Transfer und neue Personen stimmen zwischen veröffentlichter Geschichte, Events und nächstem Prompt überein |
| NPCs bleiben glaubwürdig | Persönlichkeit und legitimes Wissen werden genutzt, fremde Geheimnisse nicht; wichtige Zusagen werden später ohne ursprünglichen Dialog erinnert, auch mit erledigtem Status |
| Kreativität bleibt möglich | NPC darf eigene plausible Initiative entwickeln; gewöhnliche Reaktionen benötigen keine künstlichen zusätzlichen Spielerbefehle |
| Fehler sind beherrschbar | Timeout, ungewisses Remoteende, ungültiger Vorschlag, Hostsave und Reload haben getrennte, nachvollziehbare Ausgänge |
| Aufwand wird ehrlich gemessen | Physische Requests einschließlich Korrektur/Generatoren, gemeldete Input-/Outputusage, Zeit bis bestätigter Anzeige und notwendige Spielerinterventionen |
| Spielgefühl entscheidet mit | Menschliche Bewertung von Gesprächsanschluss, Freiheit, Überraschung, Tempo und störender Bürokratie; keine Ableitung aus JSON-Gültigkeit |

Natürliche legitime NPC-Entscheidungen können zwischen Varianten andere Welten erzeugen. Dafür keine identischen Endzustände erzwingen. Gleichheit gilt für festgelegte mechanische Aktionen und Wiederaufnahme; ansonsten zählen korrekt begründete Folgen. Ein bewusst bestätigter semantischer Fehler wird gesondert als Fehlerdemonstration ausgewiesen, nicht in eine Erfolgssumme gemischt.

## 11. Größte verbleibende Risiken

- **Semantik:** Kein vorliegender Ansatz garantiert vollständige Erinnerung, Agency oder Prosa-/Zustandsdeckung. Die fünf bekannten GM-Fehlerklassen — ausgelassene Zusage, widersprochene Ankunft, erfundene Zustimmung, fremdes Wissen, widersprüchliche Fortsetzung — bleiben relevant. Eine große Regex-Firewall oder bloß strengere JSON-Ausgabe löst sie nicht.
- **Integration:** Vollständige Fachverträge und Kontextprojektionen im neuen Host sind noch nicht hergestellt; auch eine Rückfallanbindung der alten Modellphasen wäre zusätzliche Arbeit. Das alte Save-/Lifecyclemodell darf nicht parallel eine zweite Schreibautorität behalten. Alte Zustände/Chats dürfen beim späteren Versuch nicht unbemerkt umgeschrieben werden.
- **Kontext:** Alte Projektionen können groß werden; die Alpha hat bereits ohne NPCs ein umfangreiches Worldschema und später mehr IDs. Sichere Budgetablehnung verhindert Providerfehler, aber nicht eine unspielbare lange Kampagne. Relevanzauswahl und Schemaaufbereitung brauchen tatsächliche Folgezugbelege.
- **Provider:** Vier Einheiten pro GLM-Anfrage bei vier Einheiten Tariflimit erlauben praktisch eine gleichzeitig belegte Anfrage. Eigene Serialisierung schützt nicht vor fremden Sessions. Dieser heutige Alpha-Fehler ist trotzdem kein Concurrencybeleg.
- **Bedienung:** Gepufferte Veröffentlichung kann langsamer wirken; Fortschritt und Wiederaufnahme müssen verständlich sein. Sichere alternative Swipes/Regenerate sind eine offene Produktfähigkeit, keine durch Sperren erledigte Anforderung.
- **Bewertung:** Die Alpha ist natürlich nur sehr schmal beobachtet; `.200` ebenfalls nicht langzeitabgenommen. Die revidierte Reihenfolge folgt aus den nachgewiesenen Vermittlungslücken und dem Erkenntniswert eines fairen kleinen GM-Versuchs, nicht aus gemessener Überlegenheit des GM oder einer neuen Hybridlösung.

**Revidierte Entscheidung:** Fachliche Rückkehr zu bewährten Funktionen und Schutzwirkungen, weiterhin dynamische bedarfsabhängige Modellarchitektur als ernsthaft verfolgter Zielkandidat. Zuerst den vorhandenen GM mit richtigen Fachinformationen und korrigierbaren Vorschlägen fair natürlich prüfen; keine vollständige alte Pflichtpipeline davor neu anbinden. `.200` bleibt fachliche Referenz und Rückfalloption. Zusätzliche Sprachadapter werden durch die tatsächliche Aufgabenleistung begründet. Bis zu deren Nachweis keine persönliche Langkampagnen- oder Produktfreigabe aus Mockzahlen.

## 12. Quellen und Reproduzierbarkeit

### Produkt und aktuelles Experiment

- [Alpha-Laufzeit](../../avereth-gm-alpha/gm/runtime.js): 13–19 Rollen/Operationen; 22–26 Recall; 41–57 Prompt; 78–81 lokale Steuerpfade; 91–99 Tools; 130–133 Fortschritt. [Engineadapter](../../avereth-gm-alpha/gm/engine.js): 14–24 Vorbereitung; 33–55 Weltvalidierung/-vertrag. [Scheduler](../../avereth-gm-alpha/gm/scheduler.js): 8–16 Receipt/Wiederholung; 30–46 Abschluss/Fehler. [Transport](../../avereth-gm-alpha/gm/transport.js): 24–42 Hülle, Finish und Reasoningdiagnose.
- [Produkt-Interpreter](../../avereth-engine/src/v4/interpret.js), [Referenzschema](../../avereth-engine/src/v4/schema.js), [Planner](../../avereth-engine/src/v4/planner.js), [Katalog](../../avereth-engine/src/v4/catalog.js), [Kontext](../../avereth-engine/src/context.js), [Produkt-Runtime](../../avereth-engine/src/v4/runtime.js), [Extractor](../../avereth-engine/src/v4/extract.js), [Narratorvertrag](../../avereth-engine/content/narrator/Avereth_Narrator_Contract_v4.txt). Diese Produktdateien stammen unverändert aus `.200`; Zeilenangaben im Bericht gelten dem untersuchten Stand.
- [Alpha-2-Abnahme](alpha/ABNAHME_ALPHA2_2026-11-16.md), [Grenzen](../../avereth-gm-alpha/LIMITATIONS.md), [Installation und Wiederherstellung](../../avereth-gm-alpha/INSTALLATION_DE.md), [geskriptete Alphatests](alpha/alpha.test.mjs), [ursprünglicher Prototypbericht](PROTOTYP_ERGEBNIS_2026-11-16.md), [echter ST-Hostdurchstich](ST_HOSTDURCHSTICH_2026-11-16.md), [vorbereiteter, nicht ausgeführter natürlicher Vergleich](NATUERLICHER_VERGLEICH_GM_B_2026-11-16.md).

### Persönliche und historische Quellen

- [User01: Originale und Review](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/27380a686f7372b000c3b047cbf6d1dc6afb9815/testrun_10b/user-20261104-162404): `originals/chat.jsonl`, `originals/Userfeedback Spielgefühl.txt`.
- [User02: Originale und Review](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/27380a686f7372b000c3b047cbf6d1dc6afb9815/testrun_10b/user-20261105-050449): `originals/chat.jsonl`, `originals/user_feedback.txt`, `REVIEW_CHATGPT.md`; die oben präzisierte Erinnerungsbehauptung steht in §4 des Reviews.
- [User04: Originale und Review](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/27380a686f7372b000c3b047cbf6d1dc6afb9815/testrun_10b/user-20261106-072640): `originals/chat.jsonl.gz`, `originals/user_feedback.txt`, `REVIEW.md`.
- [PULSE-/NPC-Tiefenanalyse mit Originalfallindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/27380a686f7372b000c3b047cbf6d1dc6afb9815/recherche/PULSE_NPC_E2_E3_SPIELGEFUEHL_TIEFENANALYSE_2026-11-15.md), insbesondere §§4.1–4.4. Frühe persönliche Befunde und spätere automatisierte Modellläufe werden nicht gleichgesetzt.
- [Architekturaudit einschließlich `.200`-Originalfehler](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/27380a686f7372b000c3b047cbf6d1dc6afb9815/recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md), §§4–5; [spätere GM-Neubewertung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/27380a686f7372b000c3b047cbf6d1dc6afb9815/recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md), insbesondere §§5, 8–10. Frühere Schlussfolgerungen sind hier überprüfte Quellen, keine verbindliche Entscheidung.
- Historischer GM-Tools-Branch, ausschließlich gelesen: [P0-Bericht §7](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/717e2f7a12c5d2d11963aa7cc50a497ca6bad751/avereth-engine/docs/P0_BERICHT.md), [S4b-Auswertung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/717e2f7a12c5d2d11963aa7cc50a497ca6bad751/avereth-engine/docs/P0_S4B.md), [damaliger C-Entwurf](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/717e2f7a12c5d2d11963aa7cc50a497ca6bad751/avereth-engine/docs/ARCHITECTURE_C.md). Keine damalige Testquote wird zur heutigen Modellqualität umgedeutet.

### Lokale Nachprüfung dieser Analyse

Für die GO-Probe wurden `loadProductContent`, `parsePlan`, der tatsächliche Alpha-`prepare` und anschließend `DynamicGM` mit `Journal`/`Scheduler` verwendet. Der historische Vorstand stammt aus `experiments/architecture201/fixtures.mjs`, Fall `forest200`; der Spielertext und die fehlerhaften Befehle stammen aus dem neuen Log. Stores und Publikationszähler lagen nur im Speicher. Zweimaliger `run()` auf derselben Turn-ID liefert den in §3 dokumentierten Stillstand; nur `to` als String zu ändern lässt die Vorbereitung passieren. Damit sind Originalantwort und getesteter Ausgangszustand ausdrücklich unterschieden.

Die `#system`-Probe nutzt denselben kopierten Vorstand und tatsächlichen Alpha-Executor mit der oben angegebenen Frage. Sie weist die Veröffentlichung des Kontexts und null Transportaufrufe nach; kein Modell wird zur Bewertung dieser Ausgabe benötigt. Der Dateivergleich liest jede Alpha-Datei unter `src/` und `content/` gegen den jeweiligen Git-Blob von Produktcommit `0cd1480`; 95 verglichene Dateien, null Unterschiede.

Das sind begrenzte Ursachenproben, **keine neue Produktsuite und keine Behauptung bereits korrigierter Fehler**. Geliefert wird ausschließlich dieser Analysebericht.

## 13. Abwägung des nachgereichten GPT-Feedbacks zu `6401220`

Quelle: erneut eine Datei namens `PS CUsersmmitrSillySillyTavern-Laun.txt`, diesmal **17.077 Bytes**, SHA-256 `e478b18fac6e120034c8a50985b6fdd5b69fb59698141668d765af884031b1f4`. Ihr Inhalt ist eine externe Bewertung des Berichts, **kein weiterer Lauf-/Loggerbeleg**. Sie wird nicht als unabhängige Messung oder als Implementierungsauftrag behandelt.

### Übernommene und eingeschränkte Aussagen

| Aussage des Feedbacks | Bewertung und Konsequenz |
|---|---|
| Fachfunktionen erhalten verlangt nicht dieselben separaten LLM-Requests | Zustimmung. Die Trennung ist nun in Urteil, Variantenvergleich und nächstem Schritt ausdrücklich maßgeblich. Validator und Kontextbau sind lokal wiederverwendbar; Sprachdeutung und Memoryauswahl benötigen weiterhin nachgewiesene Modellleistung |
| Sichere Serialisierung beseitigt drei serielle Phasen nicht; Commitgate verschiebt ihre Wartezeit vor die Anzeige | Zustimmung. §7.7 benennt diesen Zielkonflikt. Weniger unnötige Pflichtphasen ist ein wichtiges Entwicklungsziel, kein bloßer Nebeneffekt |
| Der GM bekam noch keinen fairen natürlichen Kompetenztest | Zustimmung. Die echte GO-Absicht war richtig erkannt, der Vertrag falsch. Daraus folgt weder die Notwendigkeit eines separaten Planners noch ein Beweis, dass ein korrigierter GM alle übrigen Aufgaben beherrscht |
| Vor diesem Nachweis keine vollständige alte Referenzpipeline neu anbinden | Zustimmung; tatsächliche Änderung gegenüber der Erstfassung. Der kleine vervollständigte GM-Durchstich erhält Vorrang. `.200` bleibt fachliche Referenz und mögliche Rückfalloption |
| Eine feste Planner–Narrator–Extractor-Pipeline darf kein langfristiger Standard werden | In der Richtung Zustimmung, aber keine vollständige Widerlegung der Erstfassung: Diese hatte eine solche feste Langfristpflicht bereits ausdrücklich ausgeschlossen. Korrigiert wird vor allem die widersprüchliche Gewichtung der nächsten Entwicklungsarbeit |
| Ein-/Zwei-Request-Abläufe anstreben | Zustimmung als situationsabhängiges Ziel. Keine garantierte Quote, kein Weglassen wichtiger Weltfolgen; zusätzliche Generatoren, Abrufe, Repairs und Leser vollständig zählen |
| Auch funktionierende Teile vereinfachen und kreative Einschränkungen prüfen | Zustimmung zur technischen Vereinfachung bei erhaltener Schutzwirkung. Dass bestimmte Fairness-/PULSE-Regeln unnötig restriktiv sind, bleibt eine gesondert zu belegende Designfrage; dieser Fehlerlauf entscheidet sie nicht |
| Aktuelle offizielle Featherless-Bedingungen seien erneut bestätigt | In diesem Nachtrag nicht unabhängig verifiziert. Der Anhang enthält keine belastbaren direkten Quellenstellen zu dieser behaupteten Webprüfung. Die vorhandenen Originalfehler belegen bereits das relevante Vier-plus-vier-bei-vier-Kapazitätsproblem; weitere Tarif-/Creditbehauptungen werden nicht aufgewertet |

### Lokale Normalisierung: plausible Option, keine stille Umdeutung

Beim konkreten GO kann eine ausdrücklich unterstützte Eingangsform `to:{ref:"loc.alderwatch.guild_hall"}` deterministisch in den kanonischen String übersetzt werden. Das wäre eine Darstellungsnormalisierung ohne neuen Modellrequest, **wenn** der Vertrag diese Form eng definiert: Das Feld ist ein Ortsverweis, das Objekt enthält ausschließlich die erlaubte Struktur und der Wert ist exakt eine bekannte, hier zulässige ID. Anschließend laufen unverändert Schema-, Quote-, Agency- und Fachprüfung.

Keine Namensähnlichkeit, keine Wahl zwischen mehreren Orten, keine erfundene neue Entität oder ergänzte Handlung; Bedingungen bleiben unverändert. Ein globales Entpacken jedes `ref`-Objekts wäre falsch, weil `ref` in anderen Domänen ein eigenes Fachfeld ist. Rohantwort, normalisierte Form und angewandte Transformation müssen nachvollziehbar bleiben. Normalisierung bucht keinen Zustand. Zuerst bleibt der korrekt erklärte kanonische Vertrag maßgeblich; eine normalisierende Eingangsform ist eine mögliche spätere Vertragsentscheidung, hier nicht implementiert.

### Optionaler Memoryleser: die Bedarfserkennung ist selbst ungelöst

Der Vorschlag „zusätzlicher Leser bei unsicherem Memory“ ist sinnvoll, aber unvollständig. Ein Validator erkennt defekte Referenzen oder einen ausdrücklich deklarierten, unvollständig gespeicherten Sprechakt. Er erkennt nicht zuverlässig eine bedeutende Zusage, die nur in freier Prosa steht und vom GM vollständig übergangen wurde. Ein gültiges `deltas:[]` signalisiert dann keine Unsicherheit. Auch der GM muss seinen eigenen blinden Fleck nicht melden.

Für den kleinen natürlichen Nachweis müssen deshalb wichtige Aussagen **unabhängig vom gemeldeten Memory** gegen Events, Folgeprompt und späteren Abruf geprüft werden. Entsteht keine wichtige neue Information, ist dies kein bestandener Memorytest. Eine spätere Einsatzentscheidung kann direktes GM-Memory mit bewusst bewerteter Restunsicherheit, zusätzliche Leser in vorher benannten kritischen Situationen oder breitere zweite Prüfung wählen. Keine dieser Varianten besitzt bereits eine perfekte Bedarfserkennung. Ein universeller versteckter „Ist alles gespeichert?“-Modellrequest wäre wieder eine Pflichtphase und müsste als solche gezählt werden. Ein nachträglicher Audit verhindert zudem nicht rückwirkend einen schon widersprüchlich gespielten Folgezug.

**Was sich an meinem Urteil ändert:** Die im Bericht zunächst bevorzugte Rückanbindung der alten Sprachvermittlung war als erster Hauptschritt zu konservativ. Der sinnvollere nächste Nachweis ist die fachlich vervollständigte dynamische Variante im kleinen Umfang. **Was sich nicht ändert:** Die Alpha 2 ist nicht funktionsgleich, ihre technischen Erfolge beweisen keine natürliche Spielqualität, und einzelne Schema-/Samplerfixes genügen nicht. Die revidierte Priorität gibt dem GM einen fairen Test; sie erklärt ihn nicht vorab zum Gewinner.
