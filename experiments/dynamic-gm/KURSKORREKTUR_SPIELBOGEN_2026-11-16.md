# Dynamischer GM: Kurskorrektur und begrenzter Spielbogen

Ausgangspunkt: `815461e1d4704a10369453b7184e63e487eee442`, ausschließlich `experiment/dynamic-gm-model`. Grundlage: [Neubewertung, insbesondere §§8–10 und 13](NEUBEWERTUNG_KURSKORREKTUR_NACH_ALPHA2_2026-11-16.md). Mechanik/Content bleiben unverändert `.200` / `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`.

**Ergebnis:** Der begrenzte zusammenhängende Spielbogen funktioniert technisch mit dem echten ST-1.19-Host und Mockprovider. Die beiden tatsächlich fehlgeschlagenen Gildenantworten werden ohne Reparaturrequest verarbeitet. Kein Nachweis natürlicher Rollenspielqualität, keine Funktionsgleichheit der gesamten Alpha mit `.200` und keine breite neue Alpha-Freigabe. Nächster Schritt ist die gesondert freizugebende, vom Nutzer geführte kurze natürliche Probe.

## 1. Gemeinsame Ursachen und Umsetzung

| Ursache | Umsetzung und Wirkung |
|---|---|
| Interne Vokabulardeskriptoren wurden als Toolvertrag ausgegeben; kanonische Referenzen und Worldformen fehlten | `alpha/interface.js` leitet situationsbezogene Command-/Worldschemata aus den vorhandenen Engine-Schemafunktionen ab. Bekannte Orte, echte Referenztypen, erwartete Ergebnisfelder und Worldchronologie werden mitgeliefert. Keine zweite Regelsammlung für Spielwerte |
| `to:{ref:"loc.alderwatch.guild_hall"}` wurde zum Sackgassenfehler | Eng definierter Alias ausschließlich an **deklarierten Referenzargumenten**, ausschließlich ein Schlüssel `ref`, ausschließlich exakte bekannte ID. Danach unveränderte Parser-, Agency- und Fachprüfung. Keine Namenssuche, kein globales Entpacken und keine Änderung von `person.new.ref`. Rohantwort und angewandte Transformation bleiben im Zugjournal; normalisierte Befehle im Engineprotokoll |
| Relevante `.200`-Informationen gingen zwischen Vorbereitung und GM verloren | Katalog mit `known:true,c:true`, vorhandener `planContext` einschließlich Route/Habitat und vor allem `buildContext` bzw. der tatsächlich vorbereitete Kontext werden verwendet. Dadurch werden bekannte Ziele, NPC-Karten, Erinnerung/Absprachen, Ergebnislinien, Weltgrenzen und Ankunftsschutz wieder modellseitig nutzbar. Kein separates unselektiertes NPC-Gesamtdossier als Standardkontext |
| Alte Rollenregeln widersprachen der gemeinsamen GM-Ausgabe | Die reine V4-Ausgabeanweisung „nur Erzähltext“ wird aus der Kontextprojektion entfernt. Das Extractor-„Invent nothing“ wird für den GM präzisiert: frei neue Welt erzählen, aber nur tatsächlich etablierte Tatsachen speichern. Unveränderte mechanische/Spielerrechte und Evidenzprüfungen bleiben bestehen |
| Empfangene Antwort wurde mit fachlich gültigem Abschluss verwechselt | Empfangsbeleg, Vorschlagsstatus, vorbereitete Mechanik und Weltcommit sind getrennt. Ein erkannter `GM_PROPOSAL`-Fehler erhält genau **einen** gezielten Korrekturrequest mit Originalvorschlag, Fehler und bereits verbindlichen Ergebnissen. Ein zweiter Fehler beendet die Korrektur sichtbar; Resume startet keine Endlosschleife |
| Korrektur/Reload konnte vorbereitete Effekte erneut durchlaufen | Antwort und Enginevorbereitung erhalten dauerhafte Checkpoints mit Zug/Schritt. Wiederaufnahme verwendet dieselbe Antwort und denselben vorbereiteten Zustand. Keine erneute Buchung, kein zweiter Wurf/PULSE. Stop-/Chatbindung und Commit-vor-Publikation bleiben erhalten |
| Auslassungsschutz verwechselte grobe Absichtssignale mit tatsächlichen Handlungen | `alpha/player.js` verwendet zusätzlich die vorhandene `.200`-Sprachprüfung für negative/zukünftige Aussagen. Eine unabhängige positive Handlung bleibt erforderlich. Eine einzelne echte `clarify` darf die Unsicherheit auflösen; gemischte Action-/Clarify-Batches erhalten keinen Freibrief. Die Engine prüft weiterhin den vollständigen Spielertext |
| Klärung und `#system` waren falsch angebunden | Ein vollständiges Engine-Klärungspanel wird ohne reine Bestätigungsanfrage veröffentlicht. `#system` erhält wieder eine private, modellgestützte Erklärung aus dem Enginekontext; interne Anweisungen werden nicht als Antwort angezeigt. Keine Welt-/NPC-Effekte dieses Antwortkanals |
| Alte gescheiterte Requests verdeckten aktuelle Messwerte | Requestdiagnosen erhalten einen Startzeitpunkt und werden für die UI chronologisch zusammengeführt. Die bestehenden globalen Kapazitätsbelege werden dafür nicht gelöscht oder freigegeben |

`alpha/runtime.js` bleibt eine dynamische Schleife: direkt abschließen, Mechanik auflösen, Informationen abrufen oder einen konkreten ungültigen Vorschlag korrigieren. Kein obligatorischer Planner und kein obligatorischer Extractor. Die vorhandenen `architecture201`- und ursprünglichen Dynamic-GM-Prototypdateien bleiben unverändert. Der Build übernimmt nur die Alpha-Adapter in `avereth-gm-alpha/gm/` und die zugehörige UI; die 95 gebündelten Engine-/Contentdateien bleiben bytegleich.

## 2. Spielbogen und Herkunft der Daten

Ausführbare, gekennzeichnete Daten: [course-fixtures.mjs](alpha/course-fixtures.mjs).

- Gildeneingabe und GO-Antwort stammen aus dem fehlgeschlagenen persönlichen Alpha-2-Lauf, Original-SHA256 `88473ff644d59a292042d412a93f64dd746ca39f56d9642f3e4e9f699872ba3c`. Die zweite aufgezeichnete Antwort ergänzt `within:null`; beide werden separat geprüft. Es wird **nicht** nur ein vorher gültig präparierter GO eingesetzt.
- Gesprächseingabe unverändert aus `testrun_10b/user-20261105-050449/originals/chat.jsonl`, JSONL-Zeile/Arrayindex 56 einschließlich Header: „no worries the drink is on me … tips and tricks …“. Das vorausgehende Szenario ist bewusst adaptiert; kein abgeschlossener Getränkekauf wird erfunden.
- Ausgangszustand aus der bestehenden persönlichen `.200`-Wald-Fixture. Nur ihre Kopie erhält für den Heiltrank-Positivfall ausdrücklich synthetisch HP 1. Originale werden nicht geändert. Separater Gegenfall prüft die korrekte Ablehnung bei vollen HP und den unverbrauchten Trank.
- **Alle weiteren GM-Antworten dieses Bogens sind synthetisch.** Sie prüfen Integration, Zustandsfolgen und Wiederaufnahme, nicht das Verständnis einer natürlichen Modellantwort. Historische Wat-, Wald- und weitere bestehende Alpha-Kontrollfälle bleiben ebenfalls im gezielten Testumfang.

| Zug | Tatsächliches technisches Ergebnis | Physische Mockrequests | Lokale vollständige GLM-Inputtokens je Request |
|---|---|---:|---|
| Gildenreise | Original-GO-Alias → Enginevorbereitung → tatsächliche Ankunft und neuer Clerk Tam | 2 | 14.187 / 10.749 |
| Gespräch | Tam macht eine eigene, gespeicherte Zusage; keine erfundene PC-Zustimmung | 1 | 14.612 |
| Gegenstandsübergabe | NPC schenkt einen Heiltrank über vorhandene Objekt-/Transferregeln | 1 | 14.809 |
| Trankgebrauch | Gewählte Handlung wirkt und verbraucht genau den gebuchten Trank | 2 | 14.376 / 10.563 |
| Gilde verlassen | Engineautorisierte Bewegung, tatsächliche Ankunft in Alderwatch | 2 | 14.307 / 10.777 |
| Straßen ansehen | Gewöhnliche freie Weltbeschreibung ohne erfundenen Check | 1 | 14.046 |
| Wiederkehr | Gilde erreicht, derselbe Tam durch `enter` wieder anwesend | 2 | 13.890 / 10.865 |
| Zusage aufgreifen | Ursprungsgespräch nicht mehr in `recentDialogue`; Zusage im Enginekontext vorhanden und nachvollziehbar erledigt | 1 | 14.363 |

**12 Requests für acht Spielzüge, 157.544 lokal gezählte Inputtokens insgesamt.** Keine kostenlose „Toolfortsetzung“ in dieser Zählung. Charaktererstellung/`#status` bleiben lokal. Der separate `#system`-Test benötigt einen Request; eine Engine-Klärung ebenfalls einen. Der fehlerhafte Worldvorschlag benötigt im Korrekturfall zwei statt eines. Kein Extractor-Timeout ist Bestandteil eines erfolgreichen Durchlaufs.

Die Erinnerung wird nicht durch Löschen autoritativer Events getestet: Der Originaldialog fällt aus den letzten sechs übermittelten Nachrichten heraus, während seine gespeicherte Zusage im selektierten Kontext bleibt. Beim Wiedersehen wird dieselbe Identität verwendet; beim Erledigen derselbe Thread aktualisiert. Dies beweist die technische Abrufbarkeit, nicht, dass jedes natürliche Modell eine Zusage überhaupt meldet oder glaubwürdig darauf reagiert.

## 3. Promptbudget: ehrlich ausgewiesener Trade-off

[prompts.json](alpha/results/course/prompts.json) misst mit dem gebündelten GLM-Tokenizer einschließlich Chattemplate, nicht mit Zeichen/4 und nicht mit erfundener Providerusage. [course-metrics.mjs](alpha/course-metrics.mjs) lädt für den Ausgangsvergleich **Runtime und Engineadapter** aus `815461e` lesend, mit dem identischen kopierten Ausgangszustand. Das ist ein lokaler Vergleich desselben Fixtures, keine Behauptung über die exakte Tokenzahl des persönlichen Providerlogs.

| Erster Gildenprompt | Inputtokens |
|---|---:|
| Unvollständiger Alpha-2-Vertrag auf demselben Testzustand | 5.959 |
| Vervollständigter Kandidat | 14.187 |
| Derselbe Kandidat ohne gemeinsame Schemadefinitionen | 25.451 |

Die verlustfreie Schemafaktorisierung spart dort 11.264 Tokens gegenüber der ausgeschriebenen vollständigen Form. Der neue korrekte Vertrag ist trotzdem deutlich größer als der unvollständige Ausgangsvertrag. **Kein Prompt- oder Latenzgewinn gegenüber Alpha 2 behauptet.** Innerhalb des Bogens maximal 14.809 Input + 4.096 Output + 512 Reserve = **19.417 von 32.768** Tokens. Größere Bestands-Fixtures erreichen höhere Werte; die bestehende Vorab-Budgetprüfung bleibt aktiv und kürzt kein Memory still.

Die reale ST-Backendprobe bestätigt diese lokalen Zahlen am tatsächlich weitergereichten Nachrichtenarray. Vom Mock gemeldete Usagewerte (100/20) sind künstlich und kein Kosten-/Tokenbeleg. Mocklatenzen belegen keine Featherless-Geschwindigkeit. Die Kapazität bleibt vier Einheiten insgesamt, vier je Anfrage; unbekannter Remoteabschluss führt weiterhin zur Sperre, nicht zum automatischen Retry.

## 4. Tatsächlich ausgeführte Abnahme

- **Rot:** Die fünf zentralen neu geschriebenen Regressionen scheiterten auf den zurückgelesenen Ausgangsadaptern. [red.log](alpha/results/course/red.log). Danach Grün auf dem Kandidaten.
- **Node: 57/57**, davon 17 gezielte Kurskorrekturtests plus bestehende Alpha-, Transport-/Budget- und Tokenizerprüfungen. [unit.log](alpha/results/course/unit.log). Darunter beide echten GO-Antworten, exakte Aliasgrenzen, Schemaäquivalenz, verlorener Weltabschluss mit Korrektur, Stop nach Vorbereitung, Journal-Reopen, erschöpfte Korrektur, Negation/Zukunft/Mehrdeutigkeit, Trankgebrauch/Ablehnung und der vollständige Bogen.
- Bewegung und Trankvorbereitung sind auf identischem Zustand mit dem direkten unveränderten `.200`-Pfad verglichen: gleicher gefalteter Zustand. Bestehende Tests prüfen zusätzlich Bedingungen/`needs`, NPC-Geschenk mit echter Fortsetzung, Combat-Referenz und Schutz vor ausgelassener Gegenstandsnutzung/typisierter PC-Zustimmung.
- **Echter ST 1.19 / Chromium 151, Loopback-Mock:** 25 technische Prüfungen bestanden, **0 PageErrors**. Dazu ein separat benannter Test, der die **weiterhin bestehende semantische Lücke** nachweist. Die Ausgabe „26/26“ darf deshalb nicht als 26 Schutzgarantien gelesen werden. [browser.json](alpha/results/course/browser.json).
- Nach dem dabei gefundenen reinen UI-Diagnosefehler: **5/5 gezielte Browserprüfungen, 0 PageErrors** — Installation/Erstellung, kompletter Bogen, Worldkorrektur, `#system`. Diagnosewerte werden gegen die tatsächlichen Wire-Prompts geprüft. [browser-course.json](alpha/results/course/browser-course.json). Diese fünf Fälle überlappen mit dem ersten Lauf; keine künstliche Addition zu 30 unabhängigen Anforderungen.
- Browsergegenfälle: Stop/verspätete Antwort, falscher Chat, Reload nach Commit vor Hostsave, HTTP- und scheinbar erfolgreicher Save ohne Persistenz, Journal-Savefehler, unbekannter Remoteabschluss/429, zwei Tabs, gesperrte alternative Swipe-/Regenerate-Welten. Keine vorzeitig veröffentlichte Geschichte oder Doppelbuchung in diesen Fällen.
- Keine natürlichen Provideraufrufe, keine vollständige Gameplay-Suite, keine Replay-Original- oder Fingerprintänderungen. Isolierte Datenwurzel `/workspace/avereth-setup/gm-alpha2-host/data`, markiert durch `ISOLATED_GM_ALPHA_TEST`; ST-Quellstand `7e8663cd9c184a550b37238218bdd32c6efc68e9`. Keine persönliche Installation oder Zugangsdaten verwendet.

Der erste Browserlauf mit dem neuen Testbogen zeigte zwei Fehler im neuen Testaufbau (Reload vor Wiederöffnung des Zielchats; versehentlich gemeinsam mutierte Gut-/Schlecht-Fixture). Sie wurden korrigiert. Bei der anschließenden Messwertkontrolle wurde der echte Diagnose-Sortierfehler entdeckt und separat behoben. Die fachlichen Aussagen stützen sich auf die abschließenden bestandenen Prüfungen. Im vollständigen Browserartefakt sind die damals noch veralteten UI-Diagnosewerte als überholt markiert; maßgeblich sind der anschließende gezielte Lauf und die Offlinezählung.

Reproduktion vom Repositoryroot:

```sh
node experiments/dynamic-gm/alpha/build.mjs
node --test experiments/dynamic-gm/alpha/course-correction.test.mjs experiments/dynamic-gm/alpha/alpha.test.mjs experiments/dynamic-gm/alpha/transport.test.mjs experiments/dynamic-gm/alpha/tokenizer.test.mjs
node experiments/dynamic-gm/alpha/course-metrics.mjs
# Separates Terminal, ausschließlich markierte Sandbox:
node experiments/dynamic-gm/alpha/st-launch.mjs
GM_COURSE_CHECK=1 node experiments/dynamic-gm/alpha/browser.mjs
# Gezielter Bogen/Diagnose-Nachlauf:
GM_COURSE_CHECK=1 GM_COURSE_ONLY=1 node experiments/dynamic-gm/alpha/browser.mjs
```

## 5. Noch offene Grenzen

1. Eine frei erzählte Zusage ohne Memory, erfundene Zustimmung oder fremdes NPC-Wissen kann weiterhin semantisch durchgehen. Auch Prosa kann einer Ankunft oder früheren Fortsetzung widersprechen. Typisierte Speech-/Claims-Felder helfen eng; sie beweisen keine allgemeine Sprachkonsistenz. Es gibt keinen versteckten zweiten Leser.
2. Der Auslassungsschutz ist kein vollständiger mehrsprachiger Planner. Negationen und klare aktuelle Handlungen werden besser abgegrenzt; komplexe Paraphrasen und mehrere unterschiedlich bedingte Teilhandlungen müssen natürlich geprüft werden. Die vollständige Agency-Prüfung bleibt beim unveränderten Kern.
3. Der direkte Gesprächsentwurf wird vor der Enginevorbereitung erzeugt. Stellt die anschließende Prüfung einen Konflikt mit PULSE/Fairness/Weltgrenzen fest, kann ein Korrekturrequest nötig werden. Keine Ein-Aufruf-Garantie, keine Lockerung dieser Regeln.
4. Eine freie Weltfortsetzung nach aufgelöstem Kandidaten bleibt append-only mit den bereits unterstützten Thread-/Sprechaktarten. Kein zweiter Spieleraktionsbatch. Neue allgemeine Checks, Diebstahl/Ablenkung, alternative Swipes und vollständige Board-/Handels-/Quest-/Dungeon-Parität sind hier nicht neu implementiert oder umfassend abgenommen.
5. Korrektur ist auf fachlich erkennbare Vorschlagsfehler begrenzt. Unvollständiger Transport, ungültige JSON-Hülle, Save-/Fold-/Hostfehler und unbekannter Remoteabschluss werden nicht als Aufforderung an ein Modell missverstanden. Zweimal fachlich ungültig: unveröffentlichten Zug prüfen und gegebenenfalls verwerfen; kein wirkungsloses Resume desselben verworfenen Vorschlags.
6. Das größere Promptvolumen und die natürliche Fähigkeit, den Vertrag korrekt zu benutzen, sind reale Risiken. Parser-/Mockerfolg ersetzt den persönlichen Spielnachweis ausdrücklich nicht.

## 6. Empfehlung und nächste Freigabe

**Geeignet als Kandidat für den kurzen, nutzergesteuerten natürlichen Spielbogen; noch kein Ersatz für `.200`.** Die gemeinsamen Ursachen des konkreten Abbruchs sind behoben und die relevanten Fachpfade durchgängig angebunden. Eine weitere breite Architekturänderung ist vor diesem Nachweis nicht begründet.

Die [Anleitung zur natürlichen Probe](NATUERLICHER_SPIELBOGEN_KANDIDAT_2026-11-16.md) beschreibt Installation aus dem aktualisierten Ordner, unveränderte Featherless-Konfiguration, unabhängige Memorykontrolle und Abbruchkriterien. Es fehlt **die ausdrückliche Freigabe dieses natürlichen Tests und seine Durchführung durch den Nutzer**. Keine neue breite ZIP-Auslieferung; vorhandenes Alpha-2-Releasearchiv bleibt historisch. Nach realem Feedback gezielt entscheiden, ob ein zusätzlicher Deuter/Memoryleser tatsächlich nötig ist, und denselben konkreten Fehler mit der vorhandenen spezialisierten `.200`-Vermittlung vergleichen. Nicht bereits jetzt eine Gegenarchitektur bauen.
