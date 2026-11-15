# Fachplan A – Verlässliche Begegnungsbuchung

Stand: 15.11.2026. Implementierungsreifer Vorschlag zur Freigabe; noch keine Implementierung oder Produktabnahme.

## 1. Grundlage, Ziel und Grenzen

Verbindliche Grundlage ist die [abgeschlossene Tiefenanalyse](../recherche/PULSE_NPC_E2_E3_SPIELGEFUEHL_TIEFENANALYSE_2026-11-15.md) auf `main`, Commit `9511db97485f4801646f1ef5dacdcf3a66deb753`. Beide Remote-HEADs wurden für diese Fachplanung erneut geprüft:

- Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`: `b1fd7860982fe16b53c1ded5d70fde3346220eb1`, Build `4.3.0-c.6.6.198`.
- `main`: `9511db97485f4801646f1ef5dacdcf3a66deb753` vor Ablage der beiden Pläne.

Alle folgenden Produktpfade beziehen sich auf `avereth-engine/` dieses Produktcommits. Dieser Plan behebt ausschließlich drei belegte Lücken:

1. Eine bekannte, zuvor abwesende Person erhält beim tatsächlichen Eintritt denselben PULSE-Schutz vor sofortigen Folgen wie eine neu erzeugte Person.
2. Der Originalbeleg „The widow came down one step of her stoop to meet him …“ kann ein tatsächliches Wiedersehen nachweisen.
3. Gebuchte Threads und tatsächliche Rückkehr bekannter Personen werden in der PULSE-Diagnose sichtbar.

Keine neue Ereignisart, NPC-Auswahl, Gesprächssperre, Würfelchance, Abklingzeit, Beziehung, Agenda, Kampf- oder Finanzmechanik. Kein neuer persistierter Präsenzzustand. Die bestehenden Regeln für bereits Anwesende und laufende Kämpfe bleiben erhalten. [Plan B1](FACHPLAN_NPC_B1_E3_KOMPAKTKARTEN_2026-11-15.md) ist getrennt abnehmbar.

## 2. A1 – Schutz tatsächlicher NPC-Ankünfte

### 2.1 Bestehender Datenfluss und Eingriffspunkt

`src/v4/world.js::applyWorld` klont den Vorzustand. Sein lokaler `emit` führt nach Ownership-Prüfung `applyEvent` aus und sammelt die tatsächlich gebuchten Events. `newEntity` füllt `bornHere` aus erzeugten Entitäten. `enterKnown`, `metArrivals` sowie Wiederverwendungszweige von `person.new` können dagegen eine bekannte Person mit `scene.entered` bringen, ohne `bornHere` zu ergänzen.

`envelopeAllows` und `coerce` verwenden `bornHere` für die PULSE-Schutzgrenze. `mayOpenFight` verwendet dieselbe Menge außerdem für die besondere Behandlung neuer Identitäten. **Deshalb `bornHere` nicht pauschal erweitern:** Ein zurückkehrender neutraler NPC soll durch die Korrektur keine zusätzliche Erlaubnis zum Angriff erhalten.

Kleinster sicherer Eingriff: zwei lokale Mengen und ein gemeinsamer Übergangsnachweis im vorhandenen `emit`. Keine Änderung an `scene.entered`, `src/state.js`, Saveformat, Host-Fold oder Event-Ownership.

### 2.2 Verbindliche Definitionen

Am Anfang von `applyWorld`, vor dem ersten `emit`, werden aus dessen Eingabezustand festgehalten:

- Die IDs existierender NPCs, die **nicht** in `scene.present` stehen (`knownAbsentAtStart`).
- Bereits laufende Kampfteilnehmer und bereits gebundene `pending_combat`-Akteure. Sie werden nicht durch eine technische Wiedereinfügung zu spontanen Neuankömmlingen.

Beim Event `scene.entered` wird vor `applyEvent` die bisherige Präsenz gelesen. Nach erfolgreichem Event und Ownership-/Effektprüfung zählt ein Übergang nur, wenn:

1. die ID zu `knownAbsentAtStart` gehört;
2. sie unmittelbar vorher nicht anwesend und unmittelbar danach anwesend ist;
3. sie ein lebender NPC ist.

Ein abgelehntes Delta, bloße Erwähnung, Kartenangebot, `entity.updated.at` oder idempotentes `enter` zählt nicht. Pro NPC und Antwort wird einmal gezählt. Neue Identitäten bleiben ausschließlich im bisherigen `bornHere`-Pfad. Kreaturen werden nicht in die neue NPC-Menge aufgenommen.

Zwei Zwecke bleiben getrennt:

- `reenteredNpcs`: alle solchen tatsächlichen Übergänge; rein lokale Basis für die Diagnose A3.
- `pulseArrivedNpcs`: diese Übergänge mit Ausnahme der bereits im Ausgangszustand gebuchten Kampfteilnehmer/gebundenen Angreifer. Dies ist die zusätzliche Schutzmenge für PULSE. Kein pauschaler Ausschluss aufgrund eines erst in dieser Antwort begonnenen Kampfes.

Der Schutz bleibt innerhalb dieser Antwort gesetzt, auch wenn ein Kampf eröffnet wird. Ein Kampf, der erst in dieser Antwort beginnt, darf die erste Wegnahme nicht nachträglich legitimieren – auch nicht, wenn ein weiterer bekannter NPC erst danach eintritt. Im nächsten Antwortzug entstehen die Mengen neu: Dann ist die Person regulär anwesend. Ob ein Angriff in einem laufenden Encounter überhaupt möglich ist, entscheidet weiterhin der bestehende Kampfpfad; A1 hebt dessen Grenzen nicht auf.

**Bewusst erhaltene Ausnahme:** Wer zu Beginn dieser Antwort bereits anwesend war, bleibt für diesen Patch etabliert – auch nach `leave`/erneutem `enter` oder einem `scene.moved(reset_present)` mit anschließender Wiedereinfügung als Reisebegleiter. Es entsteht dadurch weder eine neue Schutzfrist noch ein diagnostisch neuer Rückkehrfall. Das schützt die vorhandenen Handlungsmöglichkeiten und verhindert künstliche Rückkehrzählungen durch Szenenwechsel.

### 2.3 Anwendung auf Angriffe und Wegnahme

Nur die beiden PULSE-Gates lesen die vereinigte Prüfung `bornHere.has(id) || pulseArrivedNpcs.has(id)`:

- `envelopeAllows`: bestehende Reihenfolge erhalten – `pulse.governs`, kein laufender Encounter, Dungeon-Ahead-Ausnahme, `soughtMatch`, offenes `danger` und Ein-Gruppen-Grenze. Zurückweisung weiter über `pulse` beziehungsweise `road`, mit bestehender Korrektur.
- `coerce`: bei `pulse.governs` fordert auch ein neu eingetretener bekannter NPC nur, statt im selben Antwortzug Geld/Gegenstände wegzunehmen. Bestehende Zurückweisung `pulse_take`, keine Buchung von `coin.changed`/`object.moved` dafür.

**Unverändert:** `mayOpenFight(..., {newInAnswer: bornHere.has(id)})`, `aheadBorn`, die alte Quiet-Road-Regel außerhalb PULSE, Monster-Wiederverwendung, Gruppenzählung und Ownership-Gates. Die zusätzliche Menge darf dort nicht als pauschaler Ersatz eingeschleust werden. Für einen bekannten NPC ist `danger` eine notwendige PULSE-Bedingung, keine Aufhebung seiner bisherigen Reaktionsregeln.

### 2.4 Eintrittswege und legitime Kontakte

| Weg/Fall | Verhalten nach Korrektur |
|---|---|
| Erfolgreiches `enter` einer bekannten abwesenden Person | Übergang wird erfasst; Präsenzbeleg und Ortsprüfung bleiben Voraussetzung. |
| Erfolgreiches `expected.go.met` über `metArrivals` | Übergang wird erfasst. `met` gewährt Anwesenheit, keine zusätzliche Gewalt-/Einziehungsbefugnis. |
| `person.new` wird als bereits bekannte Identität am selben Ort wiederverwendet | Tatsächliches `scene.entered` erfasst den Übergang ebenfalls; kein Umgehungsweg. |
| Wiederverwendete namenlose Dienstperson über `keptHere` | Derselbe Eventnachweis, keine Sonderbehandlung nach Name/Rolle. |
| Wirkliche Neuerschaffung | Bestehendes `bornHere` und bisherige Tests unverändert. |
| NPC steht bereits in der Szene; nochmals `enter` oder `met` | Keine Erweiterung des Schutzes, keine Rückkehrzählung. |
| Freiwilliger Kauf, Zahlung, Gildenabwicklung oder Übergabe nach gültiger Spielerautorität | Bestehender Transaktionspfad; kein `coerce`, deshalb keine neue Sperre. |
| Autorisierter Besuch eines NPCs | GO bleibt gültig, Eintritt bleibt gültig. Ein Besuch ist keine Einwilligung in Raub/Beschlagnahme. |
| Aktiv gesuchter Zielkontakt mit bestehender `soughtMatch`-Ausnahme | Ausnahme in `envelopeAllows` unverändert. Der jetzige Mechanismus betrifft belegte Ziel-/Populationskontakte; keinen neuen NPC-Namens-Bypass aus GO-Prosa ergänzen. |
| Laufender oder bereits gebundener Kampf | Bestehende Teilnehmer und Wiederherstellung ihrer Präsenz unverändert. Ein zuvor unbeteiligter, jetzt tatsächlich hinzukommender NPC erhält keine Wegnahmefreiheit allein wegen des laufenden Kampfes. Angriffseintritt bleibt beim bestehenden Kampfpfad und dessen `!s.encounter`-Abgrenzung; die bisherige Behandlung neu erschaffener Entitäten bleibt erhalten. |
| Living Dungeon / Ruleset 1 / Nicht-C-Pfad | Bestehende `pulse.governs`-Grenzen und Dungeon-/Legacy-Autorität unverändert. |

## 3. A2 – Witwe Hesse: eng begrenzter Präsenzbeleg

### 3.1 Original und Ursache

`tests/replay/corpus191/r191.json.gz`, Chat `#26`, unveränderte Narratorantwort und gespeicherte Extractorantwort:

> The widow came down one step of her stoop to meet him, and looked at the Guild plate longer than at his face.

Die Hausankunft ist auf `.198` gültig. `src/v4/world.js::metArrivals` findet die berechtigte Person; `src/v4/narration_evidence.js::metEvidence`/`presentHere` verwirft den Präsenzbeleg. `came` ist kein `HERE_DOES`-Verb; das spätere `looked` gehört in dieser Struktur nicht unmittelbar zur erkannten Personenreferenz.

### 3.2 Kleinste sichere Anerkennung

Im bestehenden `presentHere` eine zusätzliche lokale Ankunftsform erkennen, **keine globale Aufnahme von `came` in `HERE_DOES`** und kein Ersatz des `met`-Prüfers durch den großzügigeren allgemeinen `presenceInReply`-Pfad.

Die neue Form verlangt im selben Teilsatz:

1. eine durch `namedPeople` eindeutig aufgelöste Person als Subjekt;
2. unmittelbar danach, mit den bereits unterstützten Adverbien, `came down`;
3. eine Bewegung über eine örtliche Türstufe: `one/a/the step` oder `the steps`, gefolgt von `of her/his/their/the stoop` beziehungsweise `doorstep`;
4. `to meet` mit eindeutigem PC-Namen aus `self` oder dem im bestehenden Erzählkontext verwendeten PC-Pronomen `him`.

Die unterstützte Familie ist namens- und NPC-unabhängig. Keine fest kodierte Widow-/Quest-/Orts-ID. `self` muss bei Bedarf aus `metEvidenceOne` bis `presentHere` weitergereicht werden; andere Aufrufer behalten ihre bisherigen Defaults. Eine bloße Reiseankündigung oder ein unspezifisches „came from …“ ist keine neue Präsenzregel. Weitere Verbfamilien gehören nicht zu A.

Der erkannte Verbindex durchläuft anschließend dieselben Schranken wie ein bisher erkanntes Präsenzverb: `narratedEvent` und wörtlicher Beleg, keine direkte Rede/Hörensagen/Erinnerung/Irrealität/Verneinung, eindeutige Person, `DEPICTED`/`AWAY`/`TRACE`, örtlicher Abgleich einschließlich `elsewhereIn`, danach `leftBeforeHim`. Keine vorzeitige positive Rückgabe vor diesen Schranken. Wenn eine gezielte Negativprobe eine bisherige Schranke für diese neue Form als unzureichend zeigt, nur diese Form enger absichern; keine allgemeine Präsenzlockerung.

Der vorhandene Kontrollfall mit „stood on her swept stoop“ bleibt grün. Die bisherige Originalfall-Regression in `tests/v4/batch191_fixes.test.js`, die noch `met_evidence` erwartet, muss als begründete Verhaltenskorrektur auf erfolgreiche Originalpräsenz umgestellt werden.

## 4. A3 – PULSE-Diagnostik

### 4.1 Datenvertrag

In `src/v4/world.js::applyWorld` beim abschließenden `pulse.outcome`:

- Nur dessen Diagnoseversion auf `d.v = 2` erhöhen; nicht `PULSE_VERSION`, Würfelschlüssel oder `pulse.rolled` ändern.
- Bestehende Felder erhalten. `persisted.threads`: Anzahl tatsächlich gebuchter `thread.set`-Events dieser Antwort, einschließlich Updates/Erledigungen; kein Zähler für neue Quests oder ausschließlich neue Thread-IDs.
- `persisted.npc_reentries`: Größe von `reenteredNpcs` aus A1. Dies zählt zuvor bekannte, bei Antwortbeginn abwesende NPCs mit tatsächlich gebuchtem Eintritt, keine Vorschläge oder technischen Begleiter-Reinsertionen.
- Bei offenem Fenster wird `narrated` wie bisher `likely`, wenn eines der bisherigen Persistenzsignale **oder einer dieser beiden neuen Zähler** positiv ist; andernfalls `none`. Bei geschlossenem Fenster bleibt es `null`. `heuristic: true` bleibt.

Diese Felder berichten Buchungen **in der Antwort**, nicht deren kausale Herkunft aus PULSE. Ein auf Spielerwunsch fortgeschriebener Thread kann mitzählen. Eine Rückkehr kann vor Antwortende wieder durch Verlassen beendet sein. `none` heißt nur „keines der erfassten Buchungssignale“, niemals „keine Szene erzählt“. Es werden bewusst keine automatischen Episoden und nicht sämtliche Fakten pauschal als Erfolg gezählt.

Die gesonderte Rastunterbrechungskorrektur bleibt an ihren bisherigen konkreten Personen-/Kreaturen-/Kampf-/Slotnachweisen. Ein beliebiger Thread darf eine fehlende Ursache für mechanisch unterbrochene Rast nicht nachträglich als erfüllt markieren. `src/v4/domain.js::applyDomainEvent` behandelt `pulse.outcome` weiterhin als diagnostischen No-op.

### 4.2 Verbraucher mitziehen

`tools/st_live/live/npc_pulse.mjs` konsumiert die Diagnose schon heute und gehört zum Pflichtumfang:

- Beide neuen Zähler in Aggregation und Markdown-/JSON-Ausgabe aufnehmen; Diagnoseversion im Fensterergebnis mitführen.
- Die bestehende maschinenlesbare Reviewkennung `open_window_not_narrated` kann erhalten bleiben, aber Begründung und Tabellenkopf müssen klar „kein erfasstes Buchungssignal / Sichtprüfung nötig“ statt „reply did not visibly use“ aussagen. `likely/none` als Heuristik benennen.
- Historische v1-Daten dürfen nicht so aussehen, als seien Threads/Rückkehr nachweislich null gewesen. Fehlende v2-Felder beim Lesen als **nicht erfasst** behandeln; Summen mit Zahl der dafür auswertbaren Antworten ausgeben. Gemischte v1/v2-Auswertungen müssen diese Abdeckung zeigen. Keine Umschreibung alter Logs.
- Neue Weltinhalte im geschlossenen Fenster weiterhin nur als Prüfhinweis behandeln; erlaubte soziale Szenen werden dadurch nicht verboten.

Das Auswertungstool wird hier nicht als natürlicher Runner gestartet. Seine spätere Prüfung ist ein Offline-Fixture-/Unit-Test.

## 5. Verbindliche Regressionen

Die Tabelle definiert Erwartungen für die spätere Rot-/Grün-Implementierung. **In dieser Fachplanung wurden keine Tests ausgeführt.** Originaldateien bleiben unverändert; Gegenfälle benutzen Kopien oder synthetische Zustände.

| ID | Fall | Erwartung |
|---|---|---|
| A01 | Analyse §5.1: bekannter abwesender Rask, belegtes `enter`, 100 cp, geschlossenes PULSE, danach Raub 10 cp | Eintritt bleibt, `pulse_take`, 100 cp, keine Gegenstandswegnahme. |
| A02 | Neuer Rask mit `person.new`; bereits anwesender Rask als Gegenfall | Neuer bleibt geschützt; bereits Anwesender behält die bisher nach Envelope zulässige Buchung auf 90 cp. |
| A03 | Bekannte eintretende Wache: `fine` und `confiscation`, auch mit Gegenstand statt Münzen | Gleiche erste Schutzgrenze; keine Umgehung über Art der Einziehung. |
| A04 | Eintritt über gültiges `met`, bekannte `person.new`-Wiederverwendung und `keptHere` | Schutz bei allen tatsächlichen Eintrittspfaden, keine doppelte Identität. |
| A05 | Bloße Erwähnung, abgelehntes `enter`/`met`, `present:false`, nur `at`-Update, toter NPC | Kein gültiger Eintritt; bisherige Ablehnungen. Kein Rückkehrzähler. |
| A06 | Erneutes `enter` eines Anwesenden; Reisebegleiter nach `reset_present`; vorher Anwesender verlässt und kehrt innerhalb derselben Antwort zurück | Keine künstliche neue Schutzfrist und keine neue Rückkehrzählung. |
| A07 | Bekannter zurückkehrender Angreifer: Fenster geschlossen/`meeting`/`trouble` | Neue unmittelbare Attacke durch PULSE-Gate abgelehnt; Forderung bleibt möglich. |
| A08 | Derselbe Angreifer bei `danger`; neutraler unprovozierter Rückkehrer als Gegenfall | Zulässiger Bandit kann den bestehenden Kampfpfad erreichen; `danger` gibt dem neutralen Rückkehrer keine neue `newInAnswer`-Gewaltfreiheit. Ein-Gruppen-Grenze bleibt. |
| A09 | Bereits laufender Encounter/`pending_combat`, gebundene Beteiligte wieder eingefügt; neuer Kampf innerhalb der Antwort vor/nach weiterem NPC-Eintritt; regulärer Folgezug | Bisherige Rechte gebundener Beteiligter bleiben. Neu eintretende zuvor Unbeteiligte behalten den Wegnahmeschutz unabhängig von der Reihenfolge des neuen Kampfstarts. Im Folgezug keine zusätzliche Schutzfrist. |
| A10 | Autorisierte Zahlung/Handel/Gildenhandlung mit bekanntem Rückkehrer; bestehende gesuchte Kreatur/DUNGEON AHEAD | Legitime Transaktion und vorhandene Zielkontakt-Ausnahmen unverändert, kein aus GO-Prosa erfundener NPC-Bypass. |
| A11 | Unverändertes `r191 #26` über `reply191` | Hausankunft und `npc.widow_hesse` tatsächlich präsent, keine `met_evidence`-Ablehnung; bestehende Erinnerung erhalten. |
| A12 | Derselbe Satz mit anderem eindeutigem NPC-Namen; `stood`-Kontrolle; Varianten der definierten Türstufenform | Anerkannt, sofern die Person angeboten/berechtigt und der Ort erreicht ist. |
| A13 | „Yesterday …“, „had come …“, „did not come …“, „would come …“, wörtliche Rede/Hörensagen, Bild/Notiz statt Person | Keine Präsenz aus dem neuen Muster. |
| A14 | Echte Ankunft einer anderen Person, doppeldeutige Witwe, anderer Ort/Glassmere, fehlender GO-Abschluss, „… left before Alaric arrived“ | Ablehnung durch bestehende Identitäts-, Orts-, Ankunfts- beziehungsweise Nachsatzprüfung; auch bei nur ausgeschnittenem positivem Zitat. |
| A15 | `w191 #42`, zusätzlich `w191 #96`: `sign`-Thread, keine neuen Entitäten | `threads > 0`, `likely`, `heuristic:true`; eigentlicher Weltzustand unverändert. |
| A16 | Gültiger Wiedereintritt ohne Neuschöpfung; doppeltes `enter`; abgelehnter Thread | Rückkehr genau einmal; abgelehnter Thread zählt null. |
| A17 | Threadupdate/-erledigung, reiner Episodeneintrag, offenes Fenster mit bloßer Atmosphäre, geschlossenes Fenster mit legitimem Thread | Genaue Eventzählung; Episode/Atmosphäre allein machen kein `likely`; geschlossenes Fenster bleibt `narrated:null`. |
| A18 | Fehlende Rastursache plus beliebiger Thread | Neue Diagnose darf die bisher notwendige Rastkorrektur nicht unterdrücken. |
| A19 | v1-/v2-/gemischte Auswertungsfixtures | Neue Zähler und Abdeckung korrekt; historische fehlende Werte ausdrücklich nicht erfasst, kein Erzählqualitäts-Passlabel. |
| A20 | Host-Reload/Swipe/Regenerate mit gespeicherten Antworten | Antwortlokale Mengen werden frisch gebildet, keine Doppelbuchung, keine zusätzliche RNG-Fortschaltung. |

Geeignete vorhandene Testanker: `tests/v4/pulse_a.test.js`, `pulse_a163.test.js`, `npc_e2a*.test.js`, `batch191_fixes.test.js`, `batch191_lib.js`, `fix181_pulse_road_stop.test.js`, `tests/live_runner/npc_pulse_runner.test.js`. Engen neuen Testumfang gegebenenfalls in `tests/v4/pulse_npc_arrival.test.js` bündeln. Keine Umbenennung oder Neubaseline der Originalcorpora.

## 6. Kontexttokens, Replay und ST-Host

**Tokens:** A fügt keinen dauerhaften Narratorabschnitt und keinen zusätzlichen Modellaufruf hinzu. Die größere Diagnose bleibt im Eventlog/Auswertungsbericht. Abweichende Korrekturtexte und die nun berechtigt anwesende Witwe können den folgenden Kontext sachlich verändern; diese konkreten Änderungen gehören zur Abnahme, nicht zu einer pauschalen Tokenfreigabe.

**Replay:** `tools/replay/replay.mjs::recordOutput`/`normalizeEvent` vergleichen die Events einschließlich Diagnose. Die neuen Zähler und Diagnoseversion verursachen erwartbar viele Unterschiede, auch bei unveränderter Spielwelt. `pulse.outcome` nicht deshalb aus dem Fingerprint entfernen. Für jeden abweichenden Fall ID, alter/neuer Fingerprint und Grund dokumentieren:

1. ausschließlich Diagnose v2/Zähler;
2. unterbundene neue Wegnahme/Angriffsbindung;
3. anerkannte Witwen-/gleichartige berechtigte Präsenz mit ihren Folgeevents;
4. unerwartete Änderung – blockiert die Abnahme bis geklärt.

Automatische Gruppierung ist für die Sichtung erlaubt, aber eine Freigabe benötigt die vollständige Fallliste und pro Fall passenden Diff. Insbesondere keine pauschale Ersetzung von `tests/replay/accepted_stat195_vs_126.json`, keine Erweiterung von `IGNORED` für Spielzustand und keine Änderung der Replayoriginale. `.191`-Originalproben zusätzlich gezielt prüfen: Der Standard-`npm run replay:check` allein ersetzt ihren expliziten Aufruf nicht. Kettenfolgen von Hesses nun gültiger Präsenz separat nachvollziehen.

**ST-Host:** Keine neue Schnittstelle. `src/v4/runtime.js::processReplyAny`/`runExtraction` verarbeitet weiterhin normale Antworten; der Host faltet dieselben Ereignisarten. Die transienten Mengen existieren nur innerhalb eines `applyWorld`-Aufrufs. Offline-Hosttests müssen Wiederholung, Fehler-/Repairpfad und C-/Nicht-C-Abgrenzung prüfen. Event-/Reportausgabe darf nicht an den zusätzlichen Diagnosefeldern scheitern.

Die vollständige ST-Abnahme erfolgt nach beiden Korrekturpatches gesammelt: ausschließlich markierte ST1.19-Sandbox mit Mockprovider, `npm run smoke:st:check`, danach `npm run smoke:st:isolated`; Standard, Failsoft und PageErrors getrennt auswerten. Kein persönliches ST und kein natürlicher Providerlauf. Diese Befehle sind ein späteres Abnahmekriterium, keine für diesen Plan ausgeführten Prüfungen.

## 7. Änderungsumfang, Ablauf und Freigabekriterien

Pflichtänderungen bei Umsetzung:

- `src/v4/world.js`: antwortlokaler Übergangsnachweis, zwei PULSE-Gates, Diagnose v2.
- `src/v4/narration_evidence.js`: enge Türstufen-Ankunftsform im bestehenden `met`-Prüfpfad.
- `tools/st_live/live/npc_pulse.mjs`: korrekte Diagnoseanzeige und v1/v2-Abdeckung.
- Zugehörige gezielte Tests; technische Produktpatchnote, normale Versionsstellen und einzeln begründete Replayannahmen nach den tatsächlichen Ergebnissen.

Nicht vorgesehen: Änderungen an `pulse.js`, `rules.json`, `context.js`, `envelope.js`, `state.js`, Hostformat oder dem allgemeinen Eigentumsmodell. Ein unerwarteter Änderungsbedarf dort muss am konkreten Befund begründet werden, nicht als Nebenbereinigung einfließen.

Empfohlener Implementierungsablauf:

1. Aktuellen Remote-Produkt-HEAD prüfen; von der erhaltenen Produktbasis separaten Arbeitsbranch erzeugen. Neue Diffs gegenüber `.198` gezielt berücksichtigen.
2. A01/A07, A11 und A15 als rote Kernregressionen festhalten; Schutz-/Evidenzgegenfälle daneben sichern.
3. A1, dann A2, dann A3 einschließlich Offline-Auswertung umsetzen. Änderungen getrennt nachvollziehbar halten, als einen fachlich geschlossenen Korrekturpatch liefern.
4. Gezielte Regressionen, vollständiges `npm test` und vollständiges `npm run replay:check` ausführen; `.191`-Original- und Folgefälle gesondert kontrollieren. Keine neuen natürlichen Läufe.
5. Jeden Replayunterschied erklären, technische Patchnote und sauberen Commit/PR gegen den Produktbranch bereitstellen. Unabhängiger Produktdiff-Review vor Übernahme; B1 danach auf genau diesem bestätigten Produktstand.
6. Nach B1 gesammelte isolierte ST-Abnahme. Erst deren tatsächliche Ergebnisse und die getrennten Reviews können die Vorbereitung des persönlichen Tests abschließen.

Hauptrisiken sind eine versehentliche Ausweitung von `newInAnswer`, fälschlich als neu eingestufte Begleiter/Kampfteilnehmer, zu großzügige Sprachmuster und Diagnostik, die wieder als Qualitätsmessung missverstanden wird. Die festgelegten Gegenfälle adressieren genau diese Grenzen. Keine offene Grundsatzentscheidung ist für A erforderlich.

**Erstellung dieses Plans:** gezielte Code- und Verbraucherlektüre auf dem verifizierten Stand; keine Produktänderung, keine Testausführung und kein Modelllauf. Die beschriebenen roten/grünen Erwartungen sind zukünftige Abnahmekriterien, nicht neu behauptete Testergebnisse.
