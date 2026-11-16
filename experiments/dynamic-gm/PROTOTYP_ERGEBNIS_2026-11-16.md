# Dynamischer GM – tatsächlicher Prototypbefund

Basis `81195e187fac130c17cd904481eff36eaf8fdeea`, ausschließlich `experiment/dynamic-gm-model`. Produkt .200 unverändert. Die Rollenentscheidung auf main und der bestehende B/C1-Versuch wurden berücksichtigt. Keine natürlichen Modell-/Provideraufrufe, keine ST-Starts, keine neuen Spielregeln. Alle Antworten sind offline geskriptet. G2 verwendet originale Eingabe, Plan und Prosa des persönlichen .200-Waldzugs; dessen erfolgreiche Weltantwort bleibt ausdrücklich synthetisch. G1/G4 verwenden einen historischen .191-Zustand mit synthetischen Fortsetzungen.

## Ergebnis und Entscheidung

**Die technische Grundidee funktioniert, die verlangte vollständige Szenarienabnahme ist nicht bestanden.** Ein gewöhnliches Gespräch kann Geschichte und wichtige Zusage in einem Request dauerhaft abschließen, ohne obligatorischen Extractor. Gemeinsame Scheduler-/Journalgrundlage und vorhandene Engine lassen sich nutzen. G3 bleibt fachlich blockiert; semantische Widersprüche, ausgelassene Zusagen und erfundene PC-Zustimmung werden nicht zuverlässig erkannt. Daher zuerst **GM-/Werkzeugvertrag korrigieren**, noch keine Freigabe als Grundlage eines umfassenden ST-Hosttests oder natürlichen Spieltests.

## Vier Szenarien und tatsächliche Aufrufe

| Fall | Ergebnis | Physische Offline-Modellrequests |
|---|---|---:|
| G1 Wat | Neue Zusage gespeichert, idempotent; späterer Dialog ohne ursprüngliche Prosa, gespeicherte Zusage und Stimme wieder geliefert | 1 für Zusage; 2 für gesonderte Wiederbegegnung mit explizitem recall |
| G2 Wald | Originaleingabe durch GM-Aktionsvorschlag; GO autorisiert, tatsächliche neue Waldankunft über Worldtool gebucht; Teilreise mit nicht erfolgter Ankunft bleibt am Ausgangsort | 3: Aktionsvorschlag, Weltdraft/Engineauflösung, Abschlussbestätigung |
| G3 Ablenkung + bedingte Schlüsselentnahme | **Nicht erfolgreich umgesetzt.** Unbekannte `distract`/`steal`-Commands werden abgewiesen; keine erfundene Checkregel, kein Transfer, keine Veröffentlichung | 1 abgewiesener Request; kein erfolgreich abgeschlossener Zug |
| G4 NPC-Gabe | Wat erschafft/besitzt einen gewöhnlichen Holzmarker und übergibt ihn; bestehende object.created/object.moved-Regeln buchen einmal | 2: Worldtool, Abschlussbestätigung |

G1 und G2 wurden gegen B auf identischer Ausgangsgrundlage verglichen: gleicher gefalteter fachlicher Zustand, abgesehen von Laufzeittelemetrie. B benötigt dort jeweils drei Requests. Für G1 entfallen somit zwei Pflichtphasen, für die unbekannte Reise in diesem Durchstich **kein** Request. Für G4 wird keine nicht ausgeführte B-Vergleichsmessung behauptet. Beim simulierten Timeout nach dem Wald-Worldtool entstehen insgesamt vier Requests einschließlich des gescheiterten Versuchs; bereits bestätigte Phasen werden nicht wieder angefordert.

G3 ist eine echte Grenze, kein grüner Ersatzfall. `content/commands.json` besitzt keinen allgemeinen Ablenkungs-/Diebstahlbefehl. Bestehende Suche-/Stealth-/Featurechecks dürfen nicht ohne fachliche Entscheidung in einen sozialen Ablenkungswurf mit neuer Transferregel umgedeutet werden. Die gezielt zusätzlich geprüften `c663`-Fälle bestätigen bestehende `needs`-Bedingungen, sind aber **kein erfolgreicher Ersatz für G3**. Der Auftrag untersagt neue Gameplayfunktionen; deshalb bleibt der genaue erfolgreiche Auflösungspfad offen. Gleiches gilt für die gezielte Erfolg-/Fehlschlagbedingung dieser konkreten Handlung.

Anders als B/C1 beginnt dieser Executor unmittelbar beim GM. Der alte C1-Versuch führte zuerst dieselbe Planner-Vorbereitung wie B aus; hier entsteht der Spieleraktionsvorschlag erst als optionale GM-Operation. Das ist keine natürliche Qualitätsvergleichsmessung.

## Datenfluss und Wiederverwendung

Ein einziger GM-Executor verarbeitet beliebige Folgen von `recall`/`describe`, höchstens einen vollständigen `resolve`-Spielerbatch, einen optionalen `world`-Kandidaten und einen Abschluss. Aufrufbudget: sechs Modellphasen; der importierte Scheduler gestattet maximal zwei Transportversuche pro Requestidentität. Jeder Dispatch einschließlich vollständiger Messages, UTF-16-Inhaltslänge und JSON-UTF-8-Größe steht im Journal. Kein Tool wird als kostenloser nachfolgender Modellrequest ausgegeben.

`resolve` nutzt `prepare`/`prepareGenerationAsync` samt vorhandener Planvalidierung und Fachauflösung. Eine lokale Callbackantwort liefert die bereits vom GM vorgeschlagenen Commands; sie ruft kein weiteres Modell auf. Der bisherige interne Promptbuilder wird noch ausgeführt, seine Texte werden aber nicht an den GM-Transport gesendet. Gewöhnlicher Abschluss bereitet genau einmal einen leeren Spielerbatch vor, einschließlich vorhandener Zeit-/PULSE-Regeln. Ein zweiter Batch wird verweigert: kein zweiter Turn oder PULSE je Tool. Das ist ein begrenzter vertikaler Durchstich, kein fertiger beliebiger Tool-Aktionsautomat.

`world` nutzt unveränderte `parseExtraction`-/`applyExtraction`-/Worldregeln auf einer Kopie. Alte Telemetriebezeichnungen wie `extract.applied` bedeuten hier **keinen Extractor-Modellaufruf**. Gespeicherter Kandidat und Ergebnis werden vor der GM-Fortsetzung journalisiert. `finish/use_result` veröffentlicht genau diesen Kandidaten. Weitere kreative Änderungen nach diesem Worldtool sind noch nicht implementiert: Dafür müsste die Fortsetzung mit akzeptierten Mechanikresultaten und zusätzlichen reinen Memoryänderungen verbunden werden, ohne dieselbe Mechanik neu anzuwenden. Dieses Defizit wird nicht als vollständige freie GM-Fortsetzung verkauft.

Direkter `finish` erlaubt wichtige Gedächtnis-/Kontinuitätstypen, einschließlich Fakten, Lernen/Glauben, Erinnerungen, Threads, Personen und Berichte. Geschützte Transfers/Angriffe/Ankunftsfolgen verlangen das Worldtool. Die Engine bleibt autoritativ. Wahrheit, Gerücht und Wissen werden nicht zu einer allgemeinen freien Notiz zusammengelegt.

Scheduler, Journal und Hostadapter werden importiert. Weltrevision verhindert konkurrierenden Commit; Turn-ID und Schrittindex binden Antworten. Fehler werden gespeichert. Nach Commit erfolgt bestätigter Hostsave vor Anzeige. Ein lokal unbekannt beendeter Request hält vier von vier Einheiten; nur bestätigtes Remoteende erlaubt Freigabe. Ein echter Provider und Browser sind weiterhin nicht angeschlossen.

## Schutz und verbleibende semantische Fehler

Nachgewiesen: idempotentes Speichern, einmaliger Objekttransfer, bestehender PULSE-Schutz gegen einen neu eintretenden Angreifer, Ablehnung unbekannter Objekte und wiederholter Spielerbatches. Wissenabruf selektiert nach Figur; ein ausschließlich bei PC gespeichertes Geheimnis erscheint nicht in Wats Wissensantwort. Wiedersehen enthält keine ursprüngliche Dialogprosa, liefert jedoch Zusage und Stimme. Das beweist Bereitstellung, **nicht natürliches richtiges Ausspielen durch ein Modell**.

Drei absichtlich beobachtete semantische Gegenbeispiele bleiben rot auf Ebene der Produktanforderung:

1. Wats gesprochenes Versprechen mit leerem Deltaarray wird veröffentlicht und nicht als Zusage gespeichert.
2. Positive gebuchte Ankunft neben ausdrücklich verneinender Prosa wird akzeptiert.
3. Freie Prosa mit erfundener Zustimmung Alarics wird nicht zuverlässig erkannt, auch wenn keine entsprechende mechanische Zahlung gebucht wird.

Die grünen `COUNTEREXAMPLE`-Tests bestätigen jeweils **das Vorhandensein des Fehlers**. Sie sind keine Qualitätsabnahme. Strukturierte Referenzen und dauerhafter Save lösen diese Sprachprobleme nicht. Ein gemeinsamer GM kann außerdem trotz getrenntem Wissenabruf fremdes Wissen in Dialog übertragen. Der begrenzte Abruf-Gegenfall ist keine vollständige Metawissensgarantie. Bestehende Memory-Teilnehmer-/Zeugengrenzen bleiben unverändert.

## Promptvertrag und Messung

Ein neuer kurzer Zuständigkeitskern ersetzt die vollständigen alten Narrator-/Planner-/Extractor-Prompts im tatsächlichen Transport. Er behält Spielerhoheit, mechanische Autorität, Wissenstrennung, wichtige Gedächtnisarten und Regelbindung der Ergebnisse. Gegenfälle zu Negation, fehlenden Erinnerungen und Prosa-Widerspruch zeigen, dass Instruktionen allein nicht reichen.

Nicht pauschal übernommen werden vollständige globale Händler-, Quest-, Skill- und Kampfregeltexte. Kontext liefert aktuelle Szene, kanonische Orts-/Akteurreferenzen, vorhandene NPC-Erinnerungen, Memory-Feldschemata und Toolergebnisse. `describe` kann gezielt bestehende Fachschemata liefern; dafür zählt eine folgende Modellfortsetzung zusätzlich. Noch unoptimiert: alle bekannten Ortsnamen, gesamte relevante NPC-Datensätze und akkumulierte Toolergebnisse können wachsen. Es gibt noch keinen belastbaren großen Kampagnen-Kontextbudgetnachweis.

[measurements.json](measurements.json) enthält die vollständigen gemessenen Requestgrößen und Digests:

| Fall | Zeichen je tatsächlich gesendeter Phase | Peak Kapazität |
|---|---|---:|
| G1 | 13.463 | 4 |
| G2 | 4.830 / 6.084 / 7.468 | 4 |
| G3 abgewiesen | 13.484 | 4 |
| G4 | 13.463 / 15.290 | 4 |

Das sind UTF-16-Inhaltszeichen, keine Providertokens. JSON-UTF-8-Bytes stehen separat im Artefakt. Keine natürliche Latenz-, Kosten- oder Qualitätsverbesserung gemessen. Historische Prompts enthalten andere Instruktionsmengen; kleinere Zeichenwerte sind kein Nachweis gleichwertiger Schutz-/Rollenspielqualität.

## Tatsächlich ausgeführte Prüfungen

- `node --test experiments/dynamic-gm/test.mjs`: **21/21 bestanden**, keine übersprungen, etwa 10,34 s. Davon dokumentieren zwei Tests die drei semantischen Fehlbefunde; G3 prüft die sichere Ablehnung, keinen erfolgreichen Diebstahl.
- `node --test tests/v4/pulse_npc_arrival.test.js tests/v4/npc_e2b.test.js tests/v4/c663.test.js` im Engineverzeichnis: **42/42 bestanden**, etwa 1,34 s. Bestehende Ankunfts-/PULSE-, NPC- und bedingte Aktionsregeln.
- `node experiments/dynamic-gm/measure.mjs`: ausgeführt; drei vollständige Abschlüsse und eine G3-Ablehnung im Messartefakt.
- Erste G4-Testfassung scheiterte an falscher Referenz auf das gerade erzeugte Objekt, danach am falschen Testzugriff auf `holder`. Korrekt sind `{new:"plain wooden token"}` und `holder.entity`. Kein Produktvalidator wurde dafür gelockert.

Fehlerpunkte: nach Antwort, nach Tool, vor Weltcommit, vor atomarem Rename, nach Rename ohne ACK, nach Weltcommit, nach Hostsave und nach Anzeige. Rekonstruktion verwendet vorhandene Antwortbelege; gleiches Ergebnis, drei statt wiederholter erfolgreicher Waldphasen, eine Anzeige. Zusätzliche Timeouts nach Engineergebnis für Wald und Objektgabe: Kapazität bleibt blockiert, explizite Freigabe und Wiederaufnahme bewahren den Kandidaten. Die POSIX-/Einprozess- und Mockgrenzen des früheren Journals bleiben bestehen.

Keine Vollsuite, kein historischer Replay, keine Fingerprintänderung, keine ST-Smokes und kein natürlicher Lauf. `architecture201` und Produktdateien wurden nicht verändert.

## Antwort auf die nächsten Schritte

Die festen Modellrollen können später entfallen: Der Planner bleibt als Fachparser/Validator nutzbar, ohne ein Pflichtmodell zu sein; der Extractor wird für gemeinsam gelieferte Daten nicht aufgerufen. Prosa-Evidenzregeln und die jetzigen World-Adapter bleiben noch erhebliche Altlasten. Der neue GM darf Gespräche und Ideen erzeugen, ist aber nach einem Worldtool noch an einen unveränderlichen Abschlusskandidaten gebunden.

**Empfehlung: zuerst den GM-Vertrag und den mechanischen Adapter vervollständigen.** Konkret sind ein fachlich zulässiger vorhandener G3-Pfad oder eine gesonderte Entscheidung über dessen fehlende Mechanik, freie Fortsetzung nach bestätigter Weltmechanik sowie Umgang mit ausgelassenen Zusagen/Prosa-Widersprüchen/PC-Zustimmung zu klären. Erst danach der isolierte echte ST-Hostdurchstich. Die technische Basis ist weiterverwendbar, die vollständige vierteilige Abnahme ist noch nicht erreicht. Natürliche Spielqualität bleibt ausdrücklich unbewiesen.
