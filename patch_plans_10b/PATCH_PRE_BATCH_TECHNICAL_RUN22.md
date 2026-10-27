# Vorbatch-Patch: vertiefte Ursachenanalyse und überarbeiteter Fachplan

**Ursachenanalyse: Sol, 26.10.2026; Umsetzungsnachtrag 27.10.2026.** Die Analysephase änderte keinen Produktcode. Nach ausdrücklichem Implementierungsauftrag wurde das Fachpaket einschließlich des folgenden Gegenfeedbacks umgesetzt. Die frühere A–E-Fassung bleibt [in Git erhalten](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6007e8e3b6771a9ed716a98b2d64b4f4ee9cdb52/patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md).

**Geprüfter Stand:** `main` auf `6007e8e3`; Entwicklung auf `37c4be931b52600c28583e79528f362a74023924` (Runner-only), Produkt weiterhin **.98 / `c1ed54b`**. Sämtliche folgenden Codezeilen beziehen sich auf diesen Entwicklungsstand, nicht auf spätere Änderungen.


**Umgesetzt als .99:** [Produktcommit `15ebbc1`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/15ebbc1475974c05e9fa9527500175122cc331dc); [maßgebliche technische Patchnote mit echten Tests und Grenzen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/15ebbc1475974c05e9fa9527500175122cc331dc/avereth-engine/docs/PATCH_PRE_BATCH_RUN22.md). 28 neue Regressionen (21 rot/sieben Kontrollen auf .98), final 1.927/1.927 Node und ST-Smoke 21/21. Natürliche GLM-/Batch-Abnahme offen. Die folgenden Abschnitte erhalten die Herleitung; Umsetzungsabweichungen stehen hier kurz und ausführlich ausschließlich in der Patchnote.

**GPT-Gegenfeedback übernommen:** Expected-only-Ankunft und zusätzliche Expected-Etappen nach expliziter erster Ankunft werden zeitlich eingeordnet; mehrdeutiges `here` ersetzt keinen Nachweis; Kaufwünsche werden nicht durch ein gemeinsames Namenswort identifiziert; die bloße Eltern-Kind-Raumbeziehung begründet auch bei frischer Zahlung keinen Zimmerzutritt. Alle vier Punkte besitzen Regressionen.

## 1. Ergebnis und belastbare Prüfgrundlage

Die Kernarchitektur bleibt verwendbar. Die wiederkehrenden Fehler haben jedoch an drei Grenzen gemeinsame Ursachen: **Kaufzustimmung und Buchung**, **Handlungserlaubnis und tatsächliche Ausführung**, **Generierungsregeln und ausführbare Inhalte**. Ein `break` nach dem Doppelkauf, zusätzliche Formulierungsregeln und eine längere Fehlermeldung würden jeweils einen Originalfall verbessern, aber belegte Nachbarfälle offenlassen.

Empfohlen ist **ein Vorbatch-Release mit drei fachlichen Umsetzungspaketen**, nicht ein neues Framework: vorhandene Handelsbuchung gemeinsam absichern; bestehende Reise-/World-Verarbeitung konsequent am tatsächlich gebuchten Zustand ausrichten; Boardgenerator mit derselben verfügbaren Fachinformation versorgen wie den Validator. Keine universelle Zustandsmaschine und kein neues Quest-, Spawn- oder Belohnungssystem.

### Quellen und Methode

- [Run 22: unveränderte Original-ZIP](../testrun_10b/20261026-132758Z-current_test/20261026-132758Z-current_test.zip), [GPT-Review](../testrun_10b/20261026-132758Z-current_test/REVIEW.md). ZIP unabhängig geöffnet, alle 15 Archivpositionen CRC-fehlerfrei; **11.874.438 Bytes**, SHA-256 `a7a8494e204ed9dae30b2f8d9bddd269b31a8e30a2c75478f8a2f1486193735f`. Lokaler Git-Blob `212cac68a799009a63b831190c7d21e9ffcb4d45` stimmt mit dem inzwischen auf `main` hochgeladenen Blob überein. Die frühere Angabe „Git-Upload offen“ ist überholt.
- Ausgewertet: `chat.jsonl`, `avereth-events.json`, `chat-completions.jsonl`, Run-/Evaluationsdaten; gespeicherte Zustände mit dem aktuellen `foldChat` rekonstruiert. 203 Modellantworten und 129 Eventrecords mit 1.032 Events standen zur Verfügung.
- Gezielte historische Vergleiche: Run 15/Handelsfixtures, Run 14/16 und deren Szenenregressionen, Run 20/Extractor-Review, **Run 21 einschließlich Originalantworten und T90-Fixture**. Keine Behauptung einer erneuten Vollprüfung aller 22 Runs.
- Read-only-Sonden gegen echte Produktfunktionen: Originalantworten erneut durch `parseExtraction`, `parseBoard`, `applyWorld`, `resolveCommands`; Gegenproben mit genau benannten Änderungen auf Zustandskopien. **Keine neuen Repositorytests, keine Vollsuite und kein ST-Lauf in diesem Analyseauftrag.** Die unten geforderten Rot-/Grün-Nachweise sind zukünftige Abnahme, nicht schon bestanden.

Run 22 beendet **73 Spielerinputs / 63 Engine-Turns**, acht gewonnene Encounters, zwei Gildenabschlüsse, Level 5; 60 `extract.applied`, ein `extract.failed`. Die letzten Calls 202/203 antworteten normal nach etwa 12,1/9,3 Sekunden. Der Abbruch ist **kein Provider- oder Hosttimeout**. Korrektur zum Review: Die XP-Events ergeben **606 Kampf-XP + 406 Quest-XP = 1.012**, nicht 652 Kampf-XP. Die L6/L6/L7-Habitatgegner und die dafür vergebenen PP sind kein neuer Balancefehler.

### Präzisierungen des bisherigen Plans

| Befund | Unabhängiges Ergebnis |
|---|---|
| Doppelkauf Unterkunft | Bestätigt. `i112` ist **Spielerinput 56 / Engine-Turn 48**, Extractor-Call 154. Der alte Plan vermischt diese Nummern. |
| „Jüngste erfüllbare Kaufentscheidung“ | **Zu ändern:** Neuere engere Zustimmung darf nicht durch eine ältere, noch erfüllbare Zustimmung ersetzt werden. Zusätzlich schließt der manuelle Kaufpfad unbeteiligte Wünsche. |
| T73 scheitert an Narrator/Repair | Bestätigt, aber unvollständig: semantische Szenenprüfungen verwerfen die gesamte Extraktion; außerdem lässt eine alte Unterkunftsbuchung einen unautorisierten Nebenraum zu. |
| GO→SEARCH | Bestätigt, **auch mit korrekt gesetztem `needs`**. Die anschließende Wartezeit wird ebenfalls vor der Reise gebucht. Kein bloßer Planner-Promptfehler. |
| Board-Repair verliert Gründe | Für Run 21 bestätigt. Bei Run 22 Call 11 existieren dagegen **keine** individuellen `refused`-Gründe. Dort fehlt dem Generator außerdem die Liste tatsächlich geeigneter Introvorlagen. |
| SHOP bei abwesendem Clerk | Bestätigt, betrifft **Anzeige und Planner-Katalog**. Gebundener Verkäufer ist `npc.npcalderwatchclerk`, nicht Hetta. Die Kaufverweigerung selbst ist korrekt. |

## 2. Paket I — Zustimmung, Verfügbarkeit und einmalige Handelsbuchung

**P1; mittlerer Aufwand, begrenztes Risiko.** Behebt das alte Paket A und den Verfügbarkeitsanteil E gemeinsam.

### Ist-Ablauf und Ursache

1. `commands.js:buy()` (ab 898) legt bei fehlendem passendem Angebot eine `purchase`-Decision an. Wiederholungen erhalten neue IDs; eine ältere deckungsgleiche Zustimmung bleibt offen.
2. `world.js:offerLines()` erzeugt ein Angebot und iteriert ab 2285 über eine Momentaufnahme sämtlicher passender Entscheidungen. Nach `bookPurchase()` wird das Angebot geschlossen, beim nächsten Schleifendurchlauf dessen Status jedoch nicht erneut geprüft.
3. `trade.js:bookPurchase()` (147) bucht Geld, Ware und Dienste ohne eigene Prüfung, ob das kanonische Angebot noch offen ist. Die beiden Aufrufer — Commands und World — tragen unterschiedlich vollständige Vorbedingungen und schließen das Angebot selbst.
4. `commands.js:offer.accept()` prüft zwar den Angebotsstatus, schließt aber um 1021 auch **andere** Kaufentscheidungen am gleichen Ort mit gleichem oder unbestimmtem Verkäufer. Nicht nur den gerade erfüllten Wunsch.

**Originalprobe:** `dec.t47.1` und `dec.t48.1` kaufen beide `offer.t112.4 / l3`, jeweils 6 cp. 50 → **38 cp**, zwei Transaktionen und zwei Unterkunftsdienste. **Kontrollierte Gegenprobe:** Nur das Limit der jüngeren Entscheidung auf 4 cp gesenkt; die alte 6-cp-Zusage kauft trotzdem, 50 → 44 cp. Eine weitere Probe zeigt: Beim manuellen Zimmerkauf verschwindet auch ein unbeteiligter offener Wunsch nach einem Eisenschwert beim selben Verkäufer.

Run 15 wurde nicht vollständig „zurückverschlechtert“: Die dortige Deduplizierung in `resolveCommands()` verbindet alternative Beschreibungen innerhalb **derselben Kommandoliste**. Run 22 läuft dagegen später über World und mehrere frühere Entscheidungen. Genau diese zweite Eintrittsstelle war nicht abgesichert. `integrity OK` widerspricht dem Befund nicht: Zwei formal gültige Geldänderungen verletzen keine bisher geprüfte Zustandsform.

### Empfohlene Änderung

**Eine vorhandene Buchungsgrenze für beide Kaufwege:** In `trade.js` die unmittelbar kaufentscheidenden Prüfungen und die Schließung des Angebots zusammenführen. Aufrufer liefern Angebots-ID, gewählte Lines/Menge und ihre legitimierte Zustimmung; die Funktion liest das **aktuelle** Angebot aus `s.offers`, berechnet mit `pickLines` neu und prüft Status, Auswahl, Preis/Zustimmung, Geld, Ort/Präsenz und die vorhandenen Produkt-/Servicevoraussetzungen, bevor das erste Event entsteht. Schließung und Geld-/Sachleistung gehören in denselben synchronen Eventbatch. Kein Import des gesamten Commandhandlers nach World.

Sprachliche Deutung, Verkauf versus Kauf, Anmeldung/Gate und Engine-Ownership bleiben an ihren bisherigen Fachstellen. Gemeinsame Kaufbedingungen dürfen anschließend nicht in zwei abweichenden Kopien weiterleben. `bookSale`, Geschenke und Gildenbelohnungen werden nicht in einen neuen generischen Transaktionsdienst umgebaut.

**Zustimmungen vor der Preisprüfung ordnen:**

- Wiederholungen anhand derselben Gegenpartei beziehungsweise eindeutig aufgelösten Gegenpartei, desselben Ortes und **derselben ausgewählten Ware/Leistung samt Menge** zuordnen. Vorhandene Lines/IDs verwenden; bei freien Wünschen nur eindeutige Zuordnung, keine globale Wortähnlichkeits-Deduplizierung.
- Für denselben Wunsch bestimmt die jüngste explizite Entscheidung die noch geltenden Bedingungen. Ein neues niedrigeres Limit verdrängt das alte höhere; bei Ablehnung **kein Rückfall** zur älteren Zustimmung.
- Nach Buchung nur die erfüllte Entscheidung und ihre tatsächlich ersetzten Wiederholungen schließen. Unbeteiligte Wünsche bleiben offen. Bei uneindeutiger Überlappung keine automatische zusätzliche Zahlung.
- Bei neuen `buy`-Entscheidungen eindeutig ersetzte Vorgänger bereits schließen; die World-Prüfung muss trotzdem mit historischen mehrfachen offenen Decisions korrekt umgehen. Bestehende `decision.closed`-Statuswerte verwenden.
- Ein geschlossenes Angebot kann nicht nochmals bezahlt werden. Eine neue explizite Bestellung, ein neues Angebot, ein gewollter Mehrpositionenkauf oder ein unabhängiges Trinkgeld bleiben möglich. Kein pauschales „gleicher Preis = dieselbe Transaktion“. `openGuildManuals()` eröffnet regulär neuen Bestand unter derselben stabilen Offer-ID: daher den aktuellen Angebotszustand und seine aktuelle Zustimmung prüfen, keine Offer-ID für alle Zukunft als verbraucht sperren.

**Verfügbarkeit gemeinsam beurteilen:** Die für Angebote relevante Orts-/Präsenzprüfung in einer kleinen bestehenden Handelsfunktion verwenden: Kauf, `buy`-Vorauswahl, `catalog.js` (293) und `display.js` (259). Canonical Manuals brauchen den konkret gebundenen anwesenden Clerk und die richtige Halle. Registrierung und Dungeon-Gate behalten ihre eigenen gültigen Ausnahmen. Abwesende Verkäufer machen das gespeicherte Angebot nicht kaputt; es ist vorübergehend nicht als ausführbare SHOP-Aktion darzustellen. Beim Wiederauftreten muss die Darstellung erneut reagieren; nur `offer.created`/`scene.moved` als Anzeigeauslöser reicht dafür nicht in jedem Fall.

### Alternativen und Grenzen

Ein zusätzlicher `break` verhindert den Originaldoppelkauf, aber weder die veraltete Preiszustimmung noch das falsche Schließen anderer Wünsche. Ein neuer globaler Zahlungsledger wäre unnötig: Angebot und Entscheidung besitzen schon Identitäten. Geldereignisse allein im Reducer zu deduplizieren wäre falsch, weil doppelte Ware/Dienste dann erhalten blieben.

Keine rückwirkenden Erstattungen oder Save-Migration. Historische Events werden unverändert gefaltet; nur neue Entscheidungen/Buchungen werden strenger behandelt. Neue interne Outcome-Felder nur falls erforderlich, mit fehlendem Feld als konservativem Legacy-Default.

## 3. Paket II — Ausführungszustand, Reisechronologie und robuste Extraktion

**P1; größter und risikoreichster Teil, mittlerer bis höherer Aufwand.** Das ist kein einzelner Regexfix. Er vereinigt die alten Pakete B/C und eine zusätzlich nachgewiesene Autoritätslücke; die Unterteile müssen gemeinsam geprüft werden.

### 3.1 Eine erlaubte Reise ist noch keine Ankunft

`resolveCommands()` führt Kommandos sofort der Reihe nach aus. Um 1512 gelangt jede Auflösung außer `refused/pending/clarify` in `happened`; somit auch ein lediglich **`authorized`** GO. `needs` fragt diese Menge ab. Eine folgende Suche würfelt deshalb bereits am Ausgangsort. Das bestehende `uncertain`-Hinweissystem ändert keine schon gebuchten Events.

**Original Run 21/T90:** Vorbereitung → GO zum Treeline-Ziel → Verstecksuche → Warten bis nach Einbruch der Dunkelheit. `check.recorded.at` ist das Schäferhaus, nicht der noch unerreichte Zielort. Die Sonde liefert das auch mit `needs:2`. Die anschließende Warteaktion verbucht außerdem **865 Minuten am Ausgangsort**, bevor die Reise aufgelöst wurde. Ein SEARCH-Sonderfilter würde denselben Fehler bei Zeit, Erholung oder Training offenlassen.

**Umsetzung in `commands.js`, vorhandene Auth-/Conditional-Daten weiterverwenden:**

- Für Abhängigkeiten „gebucht/done“ von „autorisiert/noch offen“ unterscheiden; den noch offenen GO anhand bestehender `ctx.auth.gos`/Expected-Daten behandeln. Eine pauschale Umwertung aller `authorized`-Ergebnisse wäre ebenfalls falsch: Einige Activity-Handler haben trotz dieses Status bereits eine Probe gebucht.
- Nach einem ungelösten Ortswechsel keine zielgebundene sofortige Probe, Entnahme, Zahlung, Trainings-/Erholungs- oder Wartezeit ausführen. Die Barriere muss auch greifen, wenn der Planner `needs` vergessen hat. Ein kleiner fachlicher Bezug auf vorhandene Handlertypen genügt; keine Prosa-Ausnahmeliste.
- Existierende bedingte Pfade — insbesondere GIVE, Gildenaktionen und deren tatsächliche Ankunftsprüfung — erhalten. Explizit ortsunabhängige Information sowie Aktionen **vor** GO bleiben möglich. Ein bereits am Ziel stehender PC mit `done` braucht keine künstliche Sperre.
- Wo ein Handler keinen sicheren vorhandenen Nach-Ankunft-Pfad hat, Ergebnis eindeutig **noch nicht ausgeführt** melden. Die Spielerhandlung kann nach Ankunft erfolgen. Keine unsichtbare Probe nach der Narration, kein vorweg erzählter Erfolg und kein zweiter Narratorlauf.

Das bedeutet keine Reise in Leerlaufschritten: Normale GO-Reisen bleiben kompakt. Nur eine mechanische Folgeaktion, deren Voraussetzung noch nicht erfüllt ist, wird nicht am falschen Ort ausgeführt. Automatisch sämtliche beliebigen Kommandofolgen verzögert abzuarbeiten wäre ein größerer Interpreterumbau und ist hier nicht gerechtfertigt.

### 3.2 Eine alte Unterkunft ist keine Bewegungserlaubnis

**Zusätzlich reproduzierter P1, kein im Original tatsächlich verbuchter T73-Ortswechsel:** `world.js:firewallContext()` (108–112) setzt `lodgedHere` bei irgendeinem Unterkunftsdienst am aktuellen Ort innerhalb von 24 Stunden. `roomOfHere` erkennt beliebige entsprechende Unterorte. `firewall.js:arrive` (379–386) umgeht damit `no_go`.

Für Call 203 wurden ausschließlich die fehlenden zeitlichen `scene`-Angaben ergänzt; `parseExtraction` meldet danach **valid**. Auf dem originalen Vorzustand bleiben Marktbesuche verboten, aber **Hetta's side room wird tatsächlich erreicht**, obwohl der Spieler nur wartet und nach Preisen fragt. Entfernt man als einzige Gegenänderung die alten `services`, bleiben auch dieser Raum und alle Reisen verboten. Das gültige JSON ist folglich noch kein belastbarer Agency-Nachweis.

**Umgesetzte Präzisierung nach Gegenfeedback:** Die 24-Stunden-Ausnahme gilt nur noch für historische Rule-1-Kampagnen. Aktuelle Unterkunftsangebote binden keinen exakten Raum; eine frische Zahlung kann deshalb ebenfalls keinen beliebigen Nebenraum legitimieren. In Ruleset 2 ist ohne eindeutige vorhandene Bindung ein ausdrücklicher GO beziehungsweise eine tatsächlich autorisierte Bewegung erforderlich. Der bisher erwogene aktuelle-Buchung-Komfort wurde nicht übernommen, weil er denselben Identitätsmangel behalten hätte. Kein neues Raumrechte-System, keine rückwirkende Umschreibung von Services oder Events. Alte/frische Buchung und gültiger gewählter Raumwechsel sind getrennt geprüft.

### 3.3 Syntaxfehler und zurückzuweisende Weltbehauptungen getrennt behandeln

**Run 22/Input 73, `i146`, Engine 63:** Planner nur WAIT, keine GO-Autorisierung. Narrator erfindet Marktbesuche, Rückkehr und Nebenraum. Calls 202/203 scheitern an zeitlichen Szenenprüfungen in `extract.js:parseExtraction()` (259–281), bevor World seine bestehenden lokalen Ablehnungen einsetzen kann. Beide Antworten enthalten auch unabhängig nutzbare Auskünfte.

Die Annotationserfordernisse sind sinnvoll. Problematisch ist ihre **Fehlergrenze**: Sie behandeln eine unklare lokale Weltbehauptung wie kaputtes JSON und verwerfen damit den gesamten Antwortumschlag. Der Parser richtet seinen Szenencursor außerdem nach vorgeschlagenen Arrivals aus, die World anschließend aus Autoritätsgründen ablehnt. Es existieren damit zwei unterschiedliche Vorstellungen vom erreichten Ort.

Run 16 und Run 20 zeigen verwandte Szenen-/Reihenfolgeprobleme; Run 20 hatte zusätzlich einen echten Repair-Abbruch nach 120 Sekunden. Diesen Transportfehler darf man nicht als identische Ursache von Run 22 ausgeben. Run 14 belegt wiederum, dass frühere Geschenke vor einer späteren Ankunft erhalten bleiben müssen. Die bisherigen Schutzfälle bleiben Anforderungen, auch wenn ihr Prüfpunkt verschoben wird.

**Empfohlene begrenzte Änderung in `extract.js`, `runtime.js`, `world.js`:**

1. JSON, erlaubte Felder/Typen, Katalogreferenzen und bestehende Referenzregeln bleiben harte Formprüfungen. Erfundenes `obj.*`, beschädigte Envelopes oder falsche Typen werden nicht durch beliebiges Entfernen „gerettet“.
2. Szenenannotation und zeitliche Einordnung erhalten gezielte semantische Diagnosen mit Deltaindex/`seq`. Eine fehlende frühere Szene bleibt ein Ablehnungsgrund für **dieses Delta**. Niemals stillschweigend den aktuellen Ort einsetzen oder Events zur gewünschten Ankunft umsortieren.
3. Die vorhandene einmalige Reparatur kann diese Diagnosen korrigieren. Ist danach keine bessere strukturell gültige Fassung vorhanden, darf eine bereits strukturell gültige Fassung mit lokal abweisbaren Aussagen verarbeitet werden. **Genau eine Fassung auswählen; niemals Original und Repair zusammenmischen.** Kein zusätzlicher Retry. Bestehende besondere Empty-/Transport-Recovery unverändert lassen.
4. Die endgültige Ausführung bleibt in `applyWorld`: Schritt für Schritt gegen den nach früheren **akzeptierten** Events bestehenden Ort und Zustand. Nicht bestätigte Ankunft erzeugt keine lokale NPC-/Objekt-/Angebotspräsenz. Uneindeutige Szene oder Einführung vor Ankunft: Delta ablehnen, keine Nebenobjekte anlegen.
5. Die bestehenden abhängigen Referenzen, `blockedPeople`/Objektverknüpfungen, `acceptedSteps` und verzögerten Questprüfungen weiter durchsetzen. Eine verworfene Einführung darf über Geschenk, Fact oder READY nicht wieder wirksam werden. Unabhängige `place.reported`-Informationen und zulässige Zeit können bestehen bleiben; Händler in entfernten Läden erhalten dadurch keine lokalen Offerten.
6. Vorhandenes `delta.rejected`/`corrections`/Audit nutzen. `applied` heißt dann weiterhin „zulässige Änderungen verarbeitet“, nicht „Narrator in allem bestätigt“. Keine neue Fehlerstatusmaschine. Der Record wird nach Auswahl einmal geschrieben; Stale-, Hash-, Swipe- und spätere-Turn-Sicherungen bleiben unverändert.

Die Szenenprüfung sollte dazu aus dem Parser an **eine ausführungsnahe Stelle** wandern beziehungsweise als dieselbe Prüffunktion für Reparaturhinweise nutzbar sein. Keine zweite virtuelle World aufbauen, die vorgeschlagene Arrivals vorab als wahr behandelt. Insbesondere den vorhandenen Expected-Arrival-Fallback mitprüfen: Eine spätere Endankunft darf keine früheren lokalen Deltas rückwirkend legitimieren.

**Promptkorrektur ergänzend:** `extractorUser()` nennt die gesamten Outcomes heute `PLAYER ACTIONS (already booked)`, obwohl sie auch Erlaubnisse und Bedingungen enthalten. Statusgetreu beschriften; bestätigte Ausführung von Erlaubnis/Frage/Warten unterscheiden. `playerActionsBlock` enthält bereits ein Agency-Verbot: Noch ein längerer Narrator-Warntext allein ist deshalb keine ausreichende Lösung. Scene/Repair darf keine Bewegung zur Heilung eines Formatfehlers erfinden.

**Warum keine kleineren Alternativen?** Nur einen weiteren Repairsatz anzuhängen hängt erneut vom Modell ab. Alle Deltas mit fehlender Szene an den Ausgangsort zu hängen würde die Sachgeschenk-/Anwesenheitsschutzregeln zerstören. Die vorgeschlagene lokale Ablehnung nutzt die schon vorhandene World-Semantik, erweitert aber bewusst deren Zugang für strukturell lesbare Antworten. Das ist die größte zu testende Änderung des Pakets.

### 3.4 Echte Zwischenhalte benötigen keine neue Reiseengine

Run 22 **`i134` / Input 67 / Engine 58 / Call 185**: tatsächliches GO nach Alderwatch, 20 Minuten unterwegs, finales Ziel nicht erreicht. Der Extractor setzt `scene=realm.valedorn_crown`, meldet aber keinen erreichten Zwischenhalt. Die bestehende implizite Transitregel in `world.js` (732) greift erst ab `go_min_elsewhere=60`; die Engine bleibt am Landing und weist Carter, Pferd und Hindernis zurück. Die Folgeantwort **`i136` / Input 68 / Engine 59 / Calls 188–189** baut auf diesem nie gebuchten Aufenthalt auf.

**Gegenprobe:** In Call 185 vor den lokalen Deltas einen expliziten bestehenden `arrive` zum tatsächlich erzählten Zwischenhalt eingefügt. Derselbe GO- und Zeitstand akzeptiert Ort, Carter und Pferd ohne neue Mechanik. `expected.arrived:false` für Alderwatch bleibt richtig.

Daraus folgt: Im Extractor zwischen **Endziel nicht erreicht** und **konkreten Zwischenhalt erreicht** unterscheiden. Bei tatsächlich erzähltem Halt das vorhandene `arrive` chronologisch vor die dortigen Vorgänge stellen; bloßes `scene` bleibt keine Bewegungserlaubnis. Keine globale Absenkung der 60-Minuten-Grenze, keine automatisch aus jedem Straßenbild erzeugten Orte. Nicht narrativ etablierte Zwischenhalte darf der Repair nicht ergänzen. Paket II.3 muss ausdrücklich diese positive Gegenkontrolle erhalten.

## 4. Paket III — Boardgenerator und Validator mit derselben Fachinformation

**P2, vor Batch sinnvoll; kleiner bis mittlerer Aufwand, niedriges Risiko.** Der alte Teil D bleibt erforderlich, reicht allein jedoch nicht.

### Zwei verschiedene Ursachen

**Diagnoseverlust, Run 21 Calls 8/9:** `parseBoard()` hat sowohl globale Fehler als auch konkrete `refused`-Einträge. Zuerst ist das Habitat innerhalb eines Dungeons unzulässig; nach Repair verletzt die umgeformte Dungeon-Räumung ihre Zielform. `generateBoard()` in `runtime.js:473–491` übernimmt bei globalem Introfehler nur `p.errors`. Der Repair sieht den konkreten Titel und Ablehnungsgrund nicht.

**Wissenslücke, Run 22 Calls 11/12:** Call 11 enthält fünf einzeln zulässige Angebote, aber keine schwache Einzeljagd; `refused=[]`. Der Repair reduziert die Froschmenge von drei auf eins. Jetzt verletzt der `aquatic`-Anchor die Introgrenzen und Call 12 enthält nur noch vier gültige Listings. Der erste Repair konnte keinen verlorenen Einzelgrund erhalten, weil es ihn noch nicht gab. Calls 16/17 der erneuten Boardanfrage bestätigen: Erst keine Intro, dann eine zulässige Serpent-Intro und ein vollständiges Board.

`guild.js:habitatWhy()` (534–555) verlangt für die Intro unter anderem HP ≤35 und ATK ≤10. `boardRequest()` nennt diese Grenzen und die unterstützten Anchor-IDs, liefert aber keine Übersicht, welche Vorlagen sie erfüllen. Das LLM soll damit verborgene Zahlenkenntnis erraten. Ein Name wie „kleiner Frosch“ kann die deterministischen Basiswerte nicht ändern.

### Umsetzung

- Die vorhandene Intro-Eignung als kleine gemeinsame Fachprüfung verwenden. Daraus im Boardprompt die **aktuell geeigneten Anchor-IDs** oder eine knappe Eignungstabelle erzeugen. Keine zweite festgeschriebene Liste und keine neuen Monsterwerte. Bodyplan-/Spezieskonsistenz, feste F-Levelbänder und vorhandene Populationsbindung bleiben zusätzliche Bedingungen.
- Eine gemeinsame Diagnoseformatierung für `errors` **und** `refused`, unabhängig vom globalen oder zu-kurzen Boardpfad. Titel beziehungsweise Index und konkreter Grund; globale fehlende Verteilung getrennt ausgeben. Ausgabe begrenzen, relevante Gründe nicht durch den generischen Schlussfehler verdrängen.
- Ein Repair, vollständiges Board atomar oder keines. Kein dritter Versuch, kein Autoersatz durch ungewollte feste Quests. Die Kreativität betrifft Art, Ort und Geschichte innerhalb ausführbarer Grenzen.
- 4 Jagden + 1 geeignete Räumung beziehungsweise 5 Jagden, Novice-Intro, Dungeonjagd versus CLEAR, Legacy und vorhandene Delivery-Verträge unverändert.

Für Regressionen denselben Runtime-Bedarf verwenden: im untersuchten Fall `c:true`, `profile:HUNT_BOARD_PROFILE`, `progression:true`. Eine isolierte Probe mit falschem Profil prüft andere Regeln und ist kein Repro des Runs.

## 5. Gemeinsame Fehlerklasse und gezielt bessere Tests

Es gibt **keine einzelne Funktion**, deren Austausch alle Probleme beseitigt. Gemeinsames Muster ist, dass eine erfolgreiche Vorprüfung als spätere Wahrheit behandelt wird: ein alter Kaufwunsch als aktuelle Zustimmung, GO-Erlaubnis als Ankunft, eine vorgeschlagene Ankunft als Parserzustand, ein gespeichertes Angebot als aktuelle Kaufbarkeit. Beim Board fehlt zusätzlich dieselbe Contentinformation auf Generatorseite. Das rechtfertigt fachliche gemeinsame Prüfstellen, nicht einen globalen Policy-Layer. Die vielen `scene_context`-Ablehnungen sind dabei nicht jeweils ein eigener Bug: Häufig schützen sie korrekt vor einem vorher nicht erreichten Schauplatz.

Die heutigen Tests sind nicht wertlos: Sie sichern viele korrekt abgewehrte Fälle. Die Lücken liegen an **Pfadwechseln und Zustandsfolgen**, die ein einzelner Helpertest nicht sieht. Mehr gleiche Prosa-Spezialfälle helfen dort wenig. Für den Folgepatch folgende kleine Invariantenmatrix als Grundlage verwenden:

| Geplanter Rot-/Grün-Fall | Verbindliches Abnahmekriterium / Gegenfall |
|---|---|
| Run 22 `i112`, Original-Call 154, zwei/drei offene Wiederholungen | Ein Kauf, −6 cp, ein Dienst, 44 cp; verbrauchte Zustimmung nicht erneut ausführbar. |
| Jüngstes Limit 4, älteres 6; getrennte Ware, Verkäufer, Menge | Kein Rückfall auf alte 6; unabhängige Wünsche bleiben. Gewollter Lotkauf/Trinkgeld weiter gültig. |
| Gleiche Leistung über manuellen und späteren World-Pfad | Gleiche Vorbedingungen und genau eine Leistung; geschlossenes/repriced Angebot bewirkt nichts. Run-15-Deduplizierung bleibt. |
| Manuals-Verkäufer abwesend/anwesend/zurückgekehrt | UI, Katalog und Kauf stimmen bezüglich Verfügbarkeit überein; gespeichert bleibt die Offerte. Gate/Registrierung weiterhin möglich. |
| Run 21 T90 mit und ohne `needs` | Keine Zielsuche und keine 865-Minuten-Folgewartezeit am Schäferhaus. Suche am aktuellen Ort und Aktionen vor GO weiter möglich. |
| Run 22 Call 203 mit gültigen Szenen, alte Unterkunft | Kein Markt-/Nebenraumwechsel bei WAIT; tatsächliche neue Zimmerbuchung und autorisierter Bezug als positive Kontrolle. |
| Calls 202/203 durch Runtime inklusive Repair und Commit | Keine unerlaubte Reise, kein fremdes lokales Angebot; unabhängige zulässige Information bleibt. Ein Record, keine doppelte Zeit oder Gegenstände. |
| Original-/Repairvariante mit ungültiger ID oder falschem Typ | Harter Schemafehler bleibt hart; keine ungeprüfte allgemeine Delta-Salvage. |
| Geschenk → autorisierte Ankunft → Gildenabgabe; abgewiesener Geber | Korrekte frühere Szene bleibt; abhängige Gifts/READY aus verworfener Quelle bleiben gesperrt. Run-14/16-Schutzinhalt erhalten. |
| Run 22 `i134/i136`, Stop gegenüber bloßem `scene` | Explizit erreichter autorisierter Stop erlaubt dortige Vorgänge; Szene allein nicht. Spontane NPC-Ankunft am echten aktuellen Ort weiter zulässig. |
| Run 21 Boardcalls 8/9; Run 22 11/12/16/17 | Exakte Diagnose der Originalfehler. Erste Anfrage kennt geeignete Introvorlagen; ein Repair; ungültiges Board wird nie teilweise veröffentlicht. |
| Jede relevante Kette nach Fold/Reload/Swipe | Derselbe aktive Verlauf ergibt denselben Zustand, keine Doppeleffekte und keine Übernahme verworfener Replyereignisse. |

Wichtig: Bewusst fehlerhafte Originalboards müssen nicht plötzlich gültig werden. Rot ist dort beispielsweise die unvollständige **Repair-Anfrage** oder fehlende Eignungsinformation, nicht die korrekte Ablehnung des Frosches. Ebenso darf ein Szenentest seine alte Erwartung `parse.valid=false` nur dann ändern, wenn der neue End-to-End-Test weiterhin beweist, dass die unzulässige Zustandsänderung ausbleibt.

## 6. Reihenfolge, Risiko und Freigabe

| Reihenfolge | Umsetzung | Nutzen | Hauptrisiko / Abhängigkeit |
|---|---|---|---|
| 1 | Paket I: Kaufzustimmung und gemeinsame Buchungs-/Verfügbarkeitsprüfung | Verhindert reale Mehrfachkosten und uneinheitliche Kaufbarkeit | Mehrpositionskäufe, Canonical-Sonderfälle; muss beide Aufrufer und alte offene Decisions abdecken. |
| 2 | Paket II: Ausführung/Ankunft, Unterkunft, semantische Delta-Ablehnung | Verhindert falsche lokale Effekte und unnötige komplette Extraktionsabbrüche | Höchstes Risiko bei Szenenreihenfolge, Expected-Fallback und Abhängigkeiten. **Unterkunftslücke vor Aktivierung der toleranteren semantischen Verarbeitung schließen.** Nutzt verlässliche aktuelle Buchungen aus I. |
| 3 | Paket III: ausführbare Boardinformation und vollständiger Repair | Weniger vermeidbare Generatorfehler ohne Lockerung der Regeln | Gering; keine eigene neue Boardarchitektur. Fachlich unabhängig, gemeinsam abnehmen. |

Vor Implementierung den dann aktuellen HEAD prüfen. Die genannten Originalfälle zunächst gegen .98 reproduzieren, danach zielbezogene und angrenzende Tests, vollständiges `npm test`, **echten `npm run smoke:st:c`** mit gespeichertem Extractor-Abschluss und Reload durchführen. Bei Parser-/Promptänderungen erforderliche Versionen konsistent erhöhen; Produktbuild erst dann voraussichtlich .99. Ein alter grüner .98-Smoke ist kein neuer Nachweis.

Anschließend ein begrenzter natürlicher Kontrolllauf, dann der unveränderte Neunfach-Batch. Keine Forderung nach fehlerfreier Narratorprosa: Entscheidend sind korrekte verbindliche Ergebnisse und sichtbare begründete Ablehnung. Batchprofile und Testspieler werden in diesem Produktpatch nicht weiter auf Formulierungen trainiert.

**Bewusst offen:** freie Tieridentität über mehrere Orte hinweg, allgemeine NPC-/Routenplausibilität, beliebige komplexe Nach-Ankunft-Kommandoketten und perfekte semantische Erkennung jeder Zimmerbeschreibung. Diese Aufgaben erfordern zusätzliche Entscheidungen; der vorliegende Befund rechtfertigt keinen parallelen Ausbau. XP×2, Startstats7, F-/E-Werte, Skills/PP, Preise, Gearslots und Dungeonpopulation bleiben unverändert. Für die getrennten L1-Strider außerhalb des Vertragsgebiets wird kein reichsweites Kill-Zählen eingeführt. Die korrekten L6/L6/L7-Kills bleiben positive Kontrolle.

## 7. Technische Referenzen

Code auf dem tatsächlich geprüften HEAD:

- [Commands: buy/offer.accept und Ausführungsreihenfolge](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/commands.js), besonders 898–1022 und 1397–1515; [Trade](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/trade.js), `bookPurchase` ab 147.
- [World](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/world.js): 108–112, 251–310, 700–814, 2196–2303; [Firewall](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/firewall.js), `arrive` 379–386.
- [Extractor](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/extract.js): Prompt 121–129/179, Repair 190–203, Parser 239–284; [Runtime](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/runtime.js): Board 473–491, Extraktion 735–809 und anschließender Commit.
- [Guild](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/guild.js): `habitatWhy`, `openGuildManuals`, `boardRequest`, `parseBoard`; [Katalog](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/v4/catalog.js) 293–297; [Anzeige](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/37c4be931b52600c28583e79528f362a74023924/avereth-engine/src/display.js) 259–263.

Externe Primärquellen wurden nur zum Abgleich der technischen Prinzipien herangezogen: [AWS Builders’ Library: sichere Wiederholungen/idempotente APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) unterscheidet identische Daten von derselben Absicht und koppelt deren Erkennung an die Seiteneffekte; [JSON Schema: Annotations](https://json-schema.org/understanding-json-schema/reference/annotations) erläutert, dass Beschreibungen selbst keine Validierungsbedingung durchsetzen. Daraus folgt hier **kein** Bedarf für zusätzliche Infrastruktur. Die Diagnose stützt sich auf die oben genannten Avereth-Originale und Codeproben.
