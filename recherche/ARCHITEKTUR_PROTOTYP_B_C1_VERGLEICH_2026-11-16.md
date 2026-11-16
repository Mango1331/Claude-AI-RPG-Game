# Isolierter Architekturprototyp B vs. C1

16.11.2026 · Experimentbranch `experiment/architecture-prototype-201`.

Produktbasis unverändert: `.200`, `0cd14806cd0c7fe2ab0d54b8463c486ee572714b`. Grundlage: Audit auf `main`, `e0557a04575baf5874f08248fc22ba363e97af96`. **201 bezeichnet nur das Experiment, keine neue Produktversion.** Kein ST-Plugin, kein Produktinhalt, kein Replayoriginal und keine Fingerprintfreigabe verändert.

## Ergebnis und Empfehlung

**Empfehlung: B als nächste Entwicklungsrichtung. C1 derzeit nicht freigeben.** Die gemeinsame Requeststeuerung und ein dauerhaft wiederaufnehmbarer Veröffentlichungsablauf funktionieren in den kontrollierten Proben. C1 spart im vorbereiteten Normalfall einen Aufruf, liefert aber weder einen nachgewiesenen natürlichen Qualitätsgewinn noch bereits eine sichere semantische Verbindung zwischen Erzählung und Weltfolgen. Zwei konkrete Gegenbeispiele verletzen diese Anforderung.

Das ist **keine Produktintegrationsfreigabe für B**. Für ST ist ein kontrollierter, gepufferter Generierungspfad technisch realistisch; ein nachträglicher Hook im normalen Streamingpfad reicht nachweislich nicht. Der reale Browser-/Mehr-Extension-Lebenszyklus und echte alternative Swipe-Erzählungen sind noch nicht abgenommen. Ein zusätzlicher C2-Test ist momentan nicht notwendig, um die nächste Arbeit zu wählen: Zuerst die gemeinsame Host-/Transaktionsgrundlage und die semantischen Abnahmegrenzen absichern. Ein kleiner C2-Vergleich wird sinnvoll, wenn die Weltentwurfs-/Rendertrennung anschließend gezielt gegen C1 geprüft werden soll; auch C2 müsste erfundene Aussagen des Renderers behandeln.

## 1. Tatsächlich implementierter Umfang

Code vollständig unter [`experiments/architecture201`](../experiments/architecture201/README.md), außerhalb der Produkt-Imports und npm-Testglobs. Der Prototyp verwendet echte Funktionen der vorhandenen .200-Engine, gespeicherte Antworten und gekennzeichnete synthetische Kontrollen. Er ruft keine Provider-API auf.

| Bestandteil | Umsetzung | Begrenzung |
|---|---|---|
| Gewichteter Scheduler | Vier Einheiten; ein Modellrequest kostet vier, zusätzlich 2+2 geprüft; zentrale Admission, persistierte Leases/Antwortbelege, maximal zwei Transportversuche je Requestidentität, simulierte Backoff-Uhr | Ein Prozess/gemeinsames Journal, kein verteilter Account-Lock; blockierte Züge werden ausdrücklich wiederaufgenommen, keine autonome FIFO-/Workerplattform |
| Remote unbekannt | Lokaler Abort/Timeout hält Kapazität; Neustart markiert noch gesendete Requests als `remote_unknown`; erst bestätigtes Ende gibt frei | Keine künstliche Garantie eines Remote-ACK. Ohne externen Abschlussnachweis bleibt der Slot konservativ belegt; keine automatische Freigabe nach Ablauf einer Uhr |
| Dauerhaftes Journal | JSON-Datei, temporäre Datei, fsync, atomarer Rename, Verzeichnis-fsync, Read-back; Weltrevision und Turn-ID; Antwortbelege getrennt von fachlicher Buchung | POSIX-/Einprozess-Prototyp, kein Browser- oder Windows-Persistenzbeweis, keine automatische Migration |
| Zugablauf | `input → prepared → drafted → validated → committed → published`; Fehler behalten letzte rekonstruierbare Phase | Alle fachlichen Änderungen dieses Durchstichs werden auf Chatkopien vorbereitet und erst im Gesamtabschluss autoritativ; keine echten externen Geschäftstransaktionen |
| Idempotenz | Requestschlüssel mit Turn/Phase/Versuch; Promptdigest; vorhandene erfolgreiche Antwort wiederverwenden; Baserevision vor Weltcommit vergleichen | Ein identischer Retry ist keine neue Erzählvariante; alternative Branch-/Swipe-Welten fehlen bewusst |
| Veröffentlichung | Weltcommit zuerst, dann separater bestätigter ST-Chat-Save, dann Anzeige mit Commit-ID; Read-back erkennt auch still fehlgeschlagenen Save | Keine gemeinsame ACID-Transaktion zwischen zwei Speichern; Journal ist Wiederherstellungsquelle. Ein Weltcommit kann kurz vor der Anzeige stehen, nie absichtlich ungeprüfte Anzeige vor dem Weltcommit |

In-flight-Anfragen und Aufrufbelege werden nicht mit mechanischen Buchungen verwechselt. Ein abgebrochener Request kann remote weiterarbeiten, obwohl seine Antwort für den aktiven Chat ungültig geworden ist. Eine verspätete Antwort wird verworfen und darf keine Weltfolgen mehr buchen. Nach bestätigter Mechanik und Displayfehler wird nicht neu gewürfelt.

### Variante B

Die Runtime erhält entweder eine gespeicherte Plannerantwort oder für den eng begrenzten Fastpath einen deterministisch erzeugten Plan. Danach dieselben Agency-/Planabbildungs-/Enginefunktionen. Narrationsentwurf bleibt intern. Der vollständige Extractorprompt wird gebaut, die aufgezeichnete/synthetische Antwort durch `parseExtraction` und `applyExtraction` geprüft, der resultierende Chat gefaltet und erst nach persistiertem Weltabschluss veröffentlicht.

Der Fastpath ist absichtlich klein: **exakt `I go to <eindeutiger vorhandener Ortsname>.`**, außerhalb Erstellung/Kampf/pending combat. Gesamte Eingabe muss passen. Unbekannter Wald, „dorthin“, Verneinung, Zitat, Bedingungen, zusammengesetzte Handlung, mehrdeutiger Name und andere Sprachformen gehen zum Planner. Dies ist keine vorgeschriebene Eingabesprache: alles andere behält den Sprachpfad. Deutscher Freitext wird hier noch nicht deterministisch geroutet.

Die lokale Antwort wird durch die bestehende Planner-Transportnaht eingespeist. Der bestehende Promptbuilder läuft dabei noch, aber es findet **kein Modellrequest** statt. Die Kompatibilitätstelemetrie wird im Record als `prototype_source: deterministic-route` kenntlich gemacht. Es wurde kein zweiter Interpreter und keine neue mechanische Ausführung implementiert.

### Variante C1

Gleicher vorbereiteter Enginezustand, dann ein gemeinsamer Antwortumschlag:

```text
{ narration, world: { scene, expected, deltas },
  links: [{ target: "scene|expected:<key>|delta:<index>", start, end, quote }] }
```

Jeder strukturierte Eintrag benötigt eine eindeutige Zuordnung zu einem exakt vorhandenen Textspan. Für die Vergleichsfixtures werden passende Absätze deterministisch anhand lexikalischer Überschneidung ausgewählt. **Diese abgeleiteten Annotationen sind keine natürlichen C1-Modellantworten und kein semantischer Beweis.** Gleiche Textstelle darf mehrere getrennte Weltvorschläge stützen. Alte Personen-/Ankunftsevidenz und sämtliche Domainprüfungen laufen anschließend weiterhin in der echten Engine.

Kaputte Links, fehlende/ungültige Schemainhalte oder durch die Engine abgewiesene Weltvorschläge führen nicht zur Veröffentlichung des Kandidaten. Eine nachgelagerte gemeinsame Korrektur-/Renderphase ist implementiert und wird als zusätzlicher Request gezählt. Auch deren Ergebnis muss vollständig validieren. Es gibt nur eine solche Korrekturphase; unbrauchbare Ergebnisse bleiben unveröffentlicht. Unabhängig davon bleibt das Transportbudget je Request begrenzt.

**Kein partieller Erfolg als vollständige Geschichte:** Der Prototyp verweigert einen Weltkandidaten bei fachlichen Ablehnungen komplett, statt unabhängige Deltas zu buchen und trotzdem den ganzen Text zu zeigen. Das ist eine bewusste Experimententscheidung gegenüber der partiellen .200-Verarbeitung. Die Wirkung auf freie längere Antworten ist ungemessen.

## 2. Originale, Ableitungen und Kontrollfälle

| Fall | Herkunft und tatsächlich geprüfter Inhalt |
|---|---|
| Wald .200 | Persönliches JSONL #5/6 vom 16.11.; Originalplan/-prosa und Fehlermetadaten. Quellhash im komprimierten Experimentfixture. **Keine erfolgreiche ursprüngliche Extraktion vorhanden**: erfolgreiche Waldankunft ist eine ausdrücklich synthetische Kontrolle |
| Bekannte Bewegung | Derselbe .200-Ausgangszustand, synthetisches eindeutiges GO nach Alderwatch; Vergleich mit tatsächlich aufgerufenem Planner bei ausgeschaltetem Fastpath |
| NPC-Wiederbegegnung | `w191 #89/90`: Wat tritt wieder ein, Identität/Erinnerung/Relation werden durch bestehende Regeln erhalten |
| Persönlichkeit | `w191 #91/92`: natürlich gespeicherte Stimme Wats und gemeinsame Erinnerung; vorhandener Enginepfad |
| Offene NPC-Absprache | Originalzustand nach w191 #92 mit gespeicherter Stimme/Geschichte; synthetische spätere Zusage Wats zum alten Furtweg |
| PULSE/Weltinformation | `w191 #41/42`: gespeicherte Antworten, `thread.set` zum goldenen Licht; keine neue Interpretation der alten Diagnose `narrated:none` |
| Gebundener Handel | `b17-rogue #163/164`: 27 Platten für 65cp, Originalplan/-text. Kontrollierte Anpassung ans heutige Schema: `price_evidence` zum bereits vorhandenen `agreed_cp=65`; redundantes `coin.gift` im Weltteil entfällt, da die Engine bereits abrechnet |
| Neuer NPC | Synthetische Mira auf dem originalen .200-Straßenrand, frei neu vorgeschlagene Holzfällerin mit anschließender Zusage. Keine neue NPC-Mechanik |

Historische Quellcorpora bleiben unverändert. Die .122-Handelsprobe ist kein Beleg dafür, dass das aktuelle Plugin alte Kampagnen offiziell fortsetzen darf. Für den Prototyp wird ihr gespeicherter Zustand gezielt mit den aktuellen Fachfunktionen verarbeitet.

Für die historischen Erfolgsvergleiche wird jeweils die **letzte gespeicherte Extractorantwort** ausgewählt. Frühere Repairs dieser Originalzüge werden nicht als kostenlos ausgeführte Requests ausgegeben: Sie gehören nicht zu dieser gewählten vertikalen Erfolgsprobe. Die gesonderten Fehler-/Korrekturläufe messen zusätzliche Aufrufe tatsächlich.

Alle C1-Erfolgsantworten bestehen aus denselben Narrations-/Weltinformationen wie B, ergänzt um abgeleitete Links. Mechanische Gleichheit ist damit ein wichtiger Transport-/Validatornachweis, **kein unabhängiger Beleg**, dass ein Modell ohne Extractor dieselbe Information entdeckt.

## 3. Messung: Aufrufe, vollständige Prompts und Ergebnisse

Maschinenlesbare Werte je Phase einschließlich Promptdigest und serialisierter UTF-8-Größe: [`measurements.json`](../experiments/architecture201/results/measurements.json). Gezählt sind **sämtliche Nachrichten, die der Prototyp tatsächlich an seinen Offline-Transport übergibt**. Zeichen = JavaScript-UTF-16-Länge des Inhalts; zusätzlich wird das vollständige Message-Array in UTF-8-Bytes gemessen. Keine Tokenabschätzung, keine erfundene Modelllatenz und keine natürliche Qualitätsnote.

Der Narratorprompt enthält die aus dem Originalterminal übernommenen Style-/Kanon-/Vertrags-/Personablöcke, ausgewählte Historie und den aktuellen Engineblock. Terminal-Encodingartefakte werden nicht als originale Providerbytes ausgegeben. Das ist ein vollständiger **Prototypprompt**, keine Behauptung, sämtliche Injections der persönlichen ST-Installation zu reproduzieren. C1 erhält konservativ Narrator- plus Schema-/Weltinstruktionen; eine neue Promptoptimierung wurde nicht vorgetäuscht.

| Fall | B Aufrufe | C1 Aufrufe | B Promptzeichen gesamt | C1 Promptzeichen gesamt | Mechanischer Zustand gleich |
|---|---:|---:|---:|---:|---|
| Wald .200, synthetischer Erfolg | 3 | 2 | 155.449 | 154.514 | ja |
| Bekannte Bewegung | 2 | 1 | 105.654 | 106.098 | ja |
| NPC-Wiederbegegnung | 3 | 2 | 170.785 | 169.966 | ja |
| NPC-Persönlichkeit | 3 | 2 | 170.712 | 169.445 | ja |
| NPC-Absprache | 3 | 2 | 169.921 | 170.310 | ja |
| PULSE-Information | 3 | 2 | 172.889 | 171.688 | ja |
| Gebundener Handel | 3 | 2 | 169.559 | 169.269 | ja |
| Neuer NPC | 3 | 2 | 152.515 | 152.845 | ja |

B spart beim engen bekannten GO gegenüber derselben Probe mit aktiviertem Planner **genau einen Aufruf**: drei → zwei, gleicher gefalteter Zustand. Bei der unbekannten Waldreise gibt es keinen Fastpath. C1 ersetzt im Erfolgsvergleich Narrator+Extractor durch einen gemeinsamen Request, **verkleinert den gesamten Prompt dabei kaum**. Bei manchen Fällen steigt dessen Summe leicht.

**C1-Korrekturfall „neuer NPC“:** kaputter Textverweis → gemeinsamer Korrekturrequest. Tatsächlich drei Aufrufe: Plan 48.239 Zeichen, Joint 104.606, Korrektur 105.866, zusammen **258.711**. B benötigt in seiner fehlerfreien entsprechenden Probe ebenfalls drei Aufrufe, aber 152.515 Zeichen. Der reine Aufrufvorteil ist in diesem C1-Fehlerfall weg. Das ist kein Vergleich gleicher Fehlerwahrscheinlichkeiten – diese wurden nicht gemessen.

Die Joint-Prompts bündeln sehr viel Text in **einer** Anfrage. Ob sie mit erforderlichem Antwortbudget in das echte 32k-Fenster passen, ist ohne den Modelltokenizer/Usage nicht belegt. Weniger Requests bedeutet deshalb weder automatisch geringere Gesamtkosten noch kürzere Latenz oder sichere Kontextverträglichkeit.

Bei den erfolgreichen Proben beträgt die maximale simulierte Belegung stets vier Einheiten. Beide Varianten erreichen eine bestätigte Weltrevision und genau eine veröffentlichte Nachricht. Verglichen wird der gesamte gefaltete Zustand ohne reine Laufzeittelemetrie (`ms`, `perf`, `llm`), nicht nur ein Coinzähler. Arrays von Spieler- und Welteventtypen sowie Zustandsdigests sind im Messartefakt enthalten.

## 4. Fehler-, Wiederaufnahme- und Idempotenzprüfung

### Nachgewiesene technische Eigenschaften

- Vier Einheiten werden auch nach lokalem Abort weiter als belegt behandelt. 2+2 ist zulässig, ein zusätzlicher Viererrequest nicht. Ein neu aufgebauter Scheduler liest dieselben Leases; kein automatisches Freigeben nach Neustart.
- Im Waldfehlerfall bleiben Plan/Narration gespeichert, aber unsichtbar. Synthetischer Extractor-Timeout hält die vier Einheiten; Folgeplan und erneute Extraktion werden **vor Dispatch** blockiert. Erst explizites Remoteende plus Backoff erlaubt die offene Weltphase. Danach vier Aufrufe insgesamt: ursprüngliche drei plus wiederholte Extraktion; Plan/Narrator werden nicht nochmals angefordert.
- Der originale Timeout und die originale Wartezeit von 29.225ms sind direkt aus dem Originalrecord geprüft. Das Weiterlaufen desselben Remotejobs ist **synthetische Fehlerannahme**, nicht nachträglich bewiesene Ursache des persönlichen 429-Vorfalls.
- Vor Antwort, nach Antwort, nach mechanischer Vorbereitung, vor Commit, während Dateisave, nach erfolgreichem Rename mit verlorener Bestätigung, nach Weltcommit, bei still fehlgeschlagenem Hostsave, nach Hostsave vor Anzeige und nach Anzeige sind Wiederaufnahmefälle geprüft.
- Die Fehlerpunktmatrix läuft für **B und C1 jeweils mit Handel und NPC-Zusage**. Nach Rekonstruktion aller Koordinatorobjekte aus Dateien entsprechen Geld, XP, Inventar/Loot, RNG, vollständiger Weltzustand und Absprachen der jeweiligen fehlerfreien Referenz. Geldtransfer 65cp genau einmal; keine wiederholte erfolgreiche Modellphase bei verlorener Save-/Displaybestätigung.
- Wiederholte Publikation, Reload und committed Regenerate/Swipe zeigen dasselbe bestätigte Ergebnis einmal. Die Commit-ID bindet Anzeige und gespeicherten Chat. Ein alter Turn darf eine inzwischen neuere Weltrevision nicht überschreiben.
- Stop/Chatwechsel während einer Anfrage verhindern deren späte Buchung/Anzeige. Stop/Chatwechsel nach bestätigtem Hostsave verhindern Anzeige im falschen Kontext; Reload des richtigen Chats rekonstruiert das gespeicherte Ergebnis.

Ein neues alternatives Swipe-Narrativ ist **nicht implementiert**. Pending Swipe wird ausdrücklich abgelehnt, committed Swipe/Regenerate zeigt nur dasselbe Resultat. Das prüft Wiederherstellung und Idempotenz, ersetzt aber noch keine vollständige Verzweigungssemantik für den Produktbetrieb.

### Fachliche Ablehnungen und gescheiterte semantische Anforderungen

1. Kaputter/mangelnder Textverweis wird verworfen; nachgelagerte Korrektur wird gezählt und erneut validiert.
2. Teilweise ungültiger neuer NPC samt unzulässigem Geldvorschlag wird nicht teilweise publiziert: weder neue Person noch Geld gelangen in den autoritativen Weltcommit. Die einzige Korrekturphase darf keine unbeschränkte Schleife werden.
3. **Nicht erfüllte Anforderung: widersprüchliche Ankunft.** Bei autorisiertem GO wird eine C1-Ausgabe mit Prosa „Alaric did not go to Alderwatch. He stayed at the roadside verge.“ und positiver strukturierter Ankunft von den vorhandenen Regeln akzeptiert. Der Gegenversuch zeigt tatsächlich publizierte Verneinung neben gebuchtem Alderwatch. Die Guards prüfen Berechtigung/Ortsstruktur, aber nicht jede semantische Behauptung.
4. **Nicht erfüllte Anforderung: Vollständigkeit einer Zusage.** Eine Prosa mit Wats Furtversprechen, aber leerem Deltaarray kann gültig sein. Die Zusage fehlt anschließend im Weltzustand. Bereits bestätigte Zusagen werden durch die Wiederaufnahme zwar nicht verloren; **neu erzählte, gar nicht vorgeschlagene Zusagen** werden aber nicht automatisch entdeckt.

Diese beiden Gegenbeispiele werden als beobachtete Grenzen in Tests und Messartefakt festgehalten (`semanticAcceptance.passed=false`). **Grüne technische Tests bedeuten hier nicht, dass die semantische C1-Abnahme bestanden ist.** Die ursprüngliche Erwartung, die Ankunftsverneinung werde abgewehrt, fiel in der ersten Testfassung tatsächlich durch. Sie wurde als Gegenbeweis dokumentiert, nicht durch eine produktive Regex oder gelockerte Abnahmeregel kaschiert.

B mit einer ebenso falschen Extractorantwort besitzt dieselbe Domainvalidator-Grenze. Seine zusätzliche unabhängige Lesephase *kann* fehlende Weltinformation liefern, aber ihre tatsächliche Trefferquote wird in diesem Offlineversuch nicht gemessen. Keine Aussage „B versteht zuverlässig jede Erzählung“.

## 5. SillyTavern 1.19: Machbarkeit und Blocker

Der Mock wird durch eine separate **Read-only-Prüfung realer ST1.19-Quellen** abgesichert: Commit `7e8663cd9c184a550b37238218bdd32c6efc68e9`, Scriptdigest und sechs geprüfte Quellverträge in [`st119-source.json`](../experiments/architecture201/results/st119-source.json). Keine Serverstarts, Browser-/Provideraufrufe oder Änderungen an der Sandboxinstallation.

Relevante tatsächliche Quellpfade:

- `public/script.js`, `StreamingProcessor.onStartStreaming` um 3621: `saveReply(...fromStreaming:true)` erzeugt die Nachricht vor dem Abschlussereignis; Progress aktualisiert sie. **Stock-Streaming ist bereits sichtbar.**
- `saveReply` um 6781: im nichtstreamenden Fall wird `MESSAGE_RECEIVED` vor `addOneMessage` abgewartet. Das bietet eine andere lokale Reihenfolge, aber noch keinen gemeinsamen Save-/Rollbackvertrag für andere Listener, Swipes und Streaming.
- `generateRawData` um 4000 und `generateRaw` um 4122: raw Request/Antwortpfad ohne `chat.push`/`addOneMessage`; eigener Stopcontroller. Eine separate Modellanfrage muss nicht automatisch als Chatgeschichte erscheinen.
- `saveChat` um 7395: nimmt ausdrücklich `chatData` an. Somit kann ein Kandidatchat gespeichert werden, bevor er zum sichtbaren aktiven Chat wird. Da Savefehler nicht zuverlässig als Promise-Rejection ankommen, ist Read-back notwendig.
- `public/scripts/extensions.js`, `runGenerationInterceptors` um 2024: dokumentierter Abortpfad für normale Generierung. `addOneMessage` verlangt, dass die Nachricht vor dem Rendern im Chatarray steht; der kontrollierte Mock hält diese Reihenfolge erst **nach** Savebestätigung ein.

### Was praktisch belegt ist

Der realitätsnahe Mock modelliert frühe Streaminganzeige, still fehlschlagende Saves, getrennte Backend-/Chat-/DOM-Zustände, Lifecycle-Epochen und Reload. Im kontrollierten Pfad werden sowohl Textstream als auch gemeinsamer JSON-Stream intern gepuffert. Weltjournal-Commit, separater Chat-Save, Read-back, Chatübernahme, einmalige Anzeige: diese Reihenfolge funktioniert im Mock inklusive Fehler-/Stop-/Wechselpunkten.

**Technisch realistisch ja, als Drop-in-Hook nein.** Eine Avereth-Erweiterung kann vorhandene APIs nutzen und normale Generation früh abbrechen, um eine kontrollierte Raw-/eigene Transportgenerierung zu starten. Ein ST-Core-Fork ist durch die Quellprüfung nicht als zwingend nachgewiesen. Dafür muss die Erweiterung jedoch den gesamten aktiven Ablauf einschließlich Stop, Generationstypen, Chatbindung und Save/UI kontrollieren. Das ist ein wesentlicher Hostadapterumbau.

### Explizite offene Integrationsblocker

- Die heutige Pluginstrategie „normale ST-Narration, danach Extractor“ kann mit Stock-Streaming die geforderte Zurückhaltung **nicht** gewährleisten.
- Kein Nachweis für störungsfreien Zusammenschluss mit allen ST-Listenern, Swipe-Metadaten, Chatgruppen, Auto-Continue, weiteren Extensions und UI-Zuständen. Ein Map-DOM ist kein echter Browser.
- Der Mock verwendet ein lokales POSIX-Journal. Wo und wie der echte ST-Host dieses dauerhafte Journal atomar speichert, einschließlich Windowsverhalten, muss umgesetzt und geprüft werden. Vorhandenes `saveChat()` allein ist keine Journaltransaktion.
- Alternative Swipe-/Regenerate-Geschichten nach schon darauf aufbauenden Folgezügen fehlen. Der Prototyp lehnt unbekannte Verzweigungszustände ab statt heimlich Geschichte umzubuchen.
- Externe Accountsessions und remote Kapazitätsfreigabe bleiben außerhalb lokaler Kontrolle. Ein realer Transport muss Fehlercode/Retry-After/Request-ID erhalten; diese Providerfähigkeit wurde hier nicht getestet.

Daher ist die Veröffentlichungslösung **kein bloß theoretisches Zustandsdiagramm**, aber auch **keine abgeschlossene reale ST-Integration**. Nächste Hostabnahme wäre ein eigener isolierter Browserdurchstich mit Mockprovider und genau diesen Lifecyclefällen, erst nach entsprechender Freigabe.

## 6. Wiederverwendbare Enginefunktionen und Codeumfang

Direkt genutzt: `prepareGenerationAsync`, bestehende Planparser/Agency-/Mapping-/Commandpfade, `processReplyAny`, `extractionRequest`, `parseExtraction`, `applyExtraction`, `foldChat` und vorhandener Contentloader. Damit laufen dieselben Geld-/Inventar-/RNG-/Orts-/NPC-/PULSE-Regeln für beide Varianten. Kein zweites Kampfsystem und kein neues NPC-Modell.

C1 entfernt den **Extractor-Modellaufruf**, nicht dessen Schema-/Firewall-/Weltregeln. Die bestehenden Evidenzregeln sind weiterhin auf eine zu prüfende Prosa ausgelegt. Textspans helfen bei Nachvollziehbarkeit, schließen aber die belegten semantischen Lücken nicht.

Der neue ausführbare Durchstich besteht aus fünf Kern-/Adapterdateien mit 294 physischen Codezeilen; zusammen mit Fixtureaufbereitung, Messung, Harness, Quellprobe und gezielten Tests 586 Zeilen. Exakte Dateiumfänge lassen sich mit `wc -l experiments/architecture201/*.mjs` ermitteln. Die kleine Größe wird teilweise durch Wiederverwendung der vorhandenen, erheblich größeren Runtime erreicht; sie beweist keine vollständige neue Architektur in 300 Zeilen. C1 benötigt zusätzliche Envelope-/Linkprüfung und Korrekturlogik. B benötigt die separate Extraktionsphase.

## 7. Tests und Abnahmegrenzen

Final ausgeführt: `node --test --test-reporter=tap experiments/architecture201/prototype.test.mjs`: **61/61 Tests bestanden**, 0 Fehler/übersprungen, rund 90,3 Sekunden. Die Gegenbeispieltests bestätigen dabei ausdrücklich das Nichtbestehen der semantischen C1-Anforderungen; sie sind keine positive Qualitätsabnahme. Keine vollständige Node-Suite und kein historischer Replaylauf erforderlich oder durchgeführt. Alle Produktdateien und Originalkorpora bleiben bytegleich zur Basis.

Bereits abgeschlossen: 47/47 bestehende fachliche Regressionen aus `fix187_paid_work`, `npc_e2b_host`, `npc_e3_compact` und `pulse_npc_arrival`. Die sechs realen ST-Quellverträge sind bestätigt. Der erste vollständige Lauf hatte 55/56 bestandene Tests: Die erwartete Abwehr der Ankunftsverneinung war rot. Der beobachtete Fehler wurde danach ausdrücklich als Gegenbeispiel festgehalten. Der finale Lauf ergänzt Routing-/Hostgegenfälle. Ergebnisübersicht und Befehle: [verification.json](../experiments/architecture201/results/verification.json).

## 8. Antworten auf die sieben Entscheidungsfragen

1. **Gemeinsame Requeststeuerung?** Ja, im Einprozess-/Journalmodell: gewichtete Kapazität, unbekannter Remoteabschluss, Backoff, begrenzte Wiederaufnahme, dauerhafte Antwortbelege und Schutz vor mehrfacher mechanischer Buchung sind konkret geprüft. Keine globale Provider-/Multiaccountgarantie.
2. **Bestätigte Veröffentlichung mit ST realistisch?** Ja über kontrollierte Generierung und explizites Speichern vor Anzeige. Nicht mit unverändertem Stock-Streaming/nachgeschaltetem MESSAGE_RECEIVED allein. Echte Browserintegration ist noch offen.
3. **Welche Enginefunktionen bleiben?** Die oben tatsächlich benutzten Auflösungs-, Parse-, Domain- und Foldfunktionen. Ein neuer Host muss sie nicht neu erfinden, aber transaktional auf vorbereiteten Kopien betreiben.
4. **Wann spart B einen Planner?** Genau beim getesteten vollständigen, eindeutigen bekannten GO. Nicht bei unbekanntem Wald, Mehrdeutigkeit, Negation oder zusammengesetzter Handlung. Breitere Sprachabdeckung ist unbewiesen.
5. **Kann C1 den Extractor ohne Informationsverlust ersetzen?** Der Transport kann dessen vorhandene strukturierte Information direkt übernehmen. Für natürlich neu erzeugte C1-Ausgaben **nicht belegt**; zwei Gegenbeispiele zeigen fehlende Semantik-/Vollständigkeitsgarantien. Neue Personen/Orte/Zusagen bleiben technisch vorschlagbar, die zuverlässige natürliche Entstehung ist offen.
6. **Langfristig vorzuziehen?** Nach jetziger Evidenz B als kontrollierter weiterer Entwicklungspfad. C1s Aufrufersparnis ist real im geskripteten Durchstich, die natürliche Geschwindigkeits-/Qualitätsüberlegenheit jedoch ungemessen. Kein Architekturvorteil durch versteckten Verlust freier Weltentwicklung akzeptiert.
7. **C2 zusätzlich nötig?** Für diese nächste Entscheidung nein. Optional als späterer enger Vergleich von vorvalidiertem Weltentwurf plus Renderer sinnvoll; vorgezogene weitere Varianten ersetzen weder Hostabnahme noch ein belastbares semantisches Testziel.

**Nächster Schritt:** isolierten tatsächlichen ST-Hostdurchstich für die gemeinsame B-Grundlage prüfen und den Umgang mit nicht deckungsgleicher Prosa/Welt ausdrücklich festlegen. Erst danach eine separat genehmigte kleine natürliche Vergleichsprobe erwägen. Kein natürlicher Modelllauf ist Bestandteil dieses Experiments, keine Produktintegration und kein Merge werden hier freigegeben.
