# Avereth .252 – Codex-Auftrag: Validierungsvereinfachung V1 („Claim + State“)

**Implementierungsauftrag, gültig erst, wenn der Nutzer ihn an Codex übergibt.** Erstellt am 27.11.2026 von Claude aus der abgeschlossenen Analyse. Fachliche Grundlage sind die [Claude-Analyse Stand 2](AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) (maßgeblich § 6, § 11, R.4) und der [GPT-Gegenreview](AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md). Für Sicherung, Tests und Freigaben gilt die [Arbeitsweise](../01_ARBEITSWEISE_GPT_CODEX.md).

| Bezug | Referenz |
|---|---|
| Ausgangsprodukt | `4.3.0-c.6.6.251` · `4933a5f005a86a381a922981d3d7377e8ba84b5c` |
| Arbeitsbranch | `experiment/211-openrouter-helper-single-runner` (direkt hier committen und pushen) |
| Originalarchive | `testrun_10b/openrouter-20261127-*` auf `main`. **M-Nummern hier und im Claude-Bericht = Zeilenindex in `chat.jsonl.gz` einschließlich Header-Zeile 0** (= Zählung ohne Header + 1; Martin M17 hier = M16 im Diskussionspapier). |
| Proben und Zählmethode | [`recherche/claude_251_analyse/`](claude_251_analyse/), insbesondere `recount_v2.py`, `probe_presence.mjs`, `probe_known_route.mjs` |

## 1. Ziel und Leitbedingung

Gewöhnliche, korrekt erzählte Handlungen sollen im gespeicherten Zustand ankommen. Deterministisch bleiben Kampf, Ressourcen, Geld, Besitz, Zeit, Reiseabschnitte, PULSE und Dungeon.

**Leitbedingung des Nutzers:** Am Ende sind netto **weniger** Prüfungen und Vertragsfelder vorhanden. Es kommen keine neuen Pflichtfelder, keine neuen Validatoren, keine neuen Wort- oder Phrasenlisten und keine zusätzlichen Modellaufrufe hinzu. Stellt sich heraus, dass eine entfernte Prüfung eine nicht aufgeführte mechanische Schutzwirkung hatte: **stoppen und berichten**, nicht durch eine neue Sprachregel ersetzen.

## 2. Mit diesem Auftrag getroffene Entscheidungen

Diese Entscheidungen entsprechen den Empfehlungen aus Stand 2 § 12. Der Nutzer kann einzelne Punkte vor der Übergabe streichen.

| # | Entscheidung |
|---|---|
| D1 | Anwesenheit einer bekannten NPC ohne grammatischen Beleg: `enter` genügt, Prüfung nur über den Zustand. |
| D2 | Keine Entfernungs- oder Reisezeitprüfung für NPC. Gesperrt nur bei Tod, Kampf anderswo oder Warten als Partymitglied anderswo. |
| D3 | Die bestehende Regel nach verweigerter Ankunft (`scene_context`) bleibt unverändert. |
| D4 | Ortswechsel: Die Engine gleicht das Planner-Ziel mit dem Ortsbuch ab. Ohne gebuchte Reise endet die Erzählung am aktuellen Ort, ein verfehlter Reisewunsch bleibt also sichtbar statt still divergent. |
| D5 | Agency-Guard eingefroren. Kein neues `mode`-Feld, keine neuen Ausnahmen. |
| D6 | Preisellipse über das vorhandene `pricing.currency_quote` (P9a). Die Bindung per HUD-Karte allein (P9b) ist **nicht** Teil des Auftrags. |
| D7 | Einmalige, dokumentierte Neubewertung des Replays mit vier Kategorien. T1 ist harte Grenze. |
| D8 | X darf NPC-eigene Party-Angebote und Austritte melden. |
| D9 | `forcedRelocation` bleibt streng. |

**Kanon:** Codex ändert `02_DESIGN_KANON.md` nicht. Die Regel „NPC-Wiederbegegnungen“ spricht von `met`. Ihr Inhalt (Wiederanwesenheit bei bestätigter Ankunft und erzählter Begegnung) bleibt über `enter` erhalten. Die Formulierung passt GPT nach der Abnahme an. Hält Codex einen Punkt für eine echte Kanonänderung: stoppen und berichten.

## 3. Arbeitsweise

- Jede Etappe, oder ein technisch sinnvoller Teil davon, wird ein eigener Commit. Sofort regulär pushen und den Remote-HEAD verifizieren. Keine Force-Pushes, keine neuen Remote-Branches, kein Merge nach `main`.
- Die Versionsnummer je gepushtem Kandidaten erhöhen, ab `.252`. Bündeln ist zulässig.
- **Keine kostenpflichtigen Providerrequests** (Etappe F nur nach eigener Freigabe). Keine Tests gegen das persönliche ST-Profil, nur die markierte Sandbox (`npm run smoke:st:check`, `npm run smoke:st:isolated`).
- Rot auf `.251`, Grün auf dem Kandidaten. Fehlt ein Werkzeug, Browser oder Provider, wird das als „nicht ausgeführt“ berichtet, nicht als PASS.
- Alte Events und Saves falten unverändert. Regenerate, Swipe und Edit einer alten Antwort nutzen den neuen Vertrag.
- Der Narrator Contract `.211`, Character Card, Preset, Lorebook und Regex bleiben unverändert. Alle Vertragsänderungen liegen in der Extension (`content/*.json`, `src/`).

## 4. Etappen

### Etappe 0 · Messgrundlage (vor jeder Produktlogik)

1. **T2-Engine-Korpora** als Node-Tests mit eingespeisten strukturierten Antworten, auf `.251` erwartungsgemäß teilweise rot:
   - **Anwesenheit:** die 24 archivierten `met_evidence`-Fälle mit Labels aus [ERGEBNISSE_STAND2.txt](claude_251_analyse/ERGEBNISSE_STAND2.txt). Dazu Negative: tot, Kampf anderswo, wartend anderswo, unbekannte ID.
   - **Bewegungsziele:** Lantern-Spielerzüge M80/M82 mit Original-P, die Varianten aus `probe_known_route.mjs` als `{scene}`/`{new}`-Ziele, ein unbekannter Standpunkt, User16- und Flint-Torfälle.
   - **Extractor-Teilübernahme:** wie Etappe B.
   - **Party:** NPC-Angebot, Austritt, Gespräch ohne Angebot.
   - **Desk:** ein bzw. zwei Gildenmitarbeiter.
   - **Preis:** Martin M11 mit gefülltem `currency_quote`, zwei Währungen als Negativ.
2. **T3:** Das Replay-Werkzeug ordnet jede Abweichung einer von vier Kategorien zu: beabsichtigte semantische Verbesserung · Darstellungs- oder Protokolländerung · mechanische Wirkung (Geld, XP, Besitz, Ort, Kampf, Zeit, Wissen, Identität) · ungeklärt. Die alte Referenz und die bisherigen `accepted_*` bleiben verfügbar.
3. **Ausgangswerte** auf `.251`: Ablehnungen nach Regel, Reparaturanteil und Reparaturanlässe, Zuordnung über Request- und Record-Identität (Methode `recount_v2.py`). Ausgangsgröße der tatsächlich gebauten P- und X-Requests für einen festen Archivkontext (Martin, Zug 5), offline über die vorhandenen Request-Builder.

### Etappe A · Anwesenheit und Rückmeldung (P1, P10)

**Ändern:**
- Eine Aufnahmefunktion für alle Wege, die eine bekannte NPC in die Szene bringen: `enter`, `aware` und `position` einer nicht anwesenden Person sowie das bisherige `expected.go.met`.
- Bedingungen der Aufnahmefunktion: bekannte NPC-ID, lebt, nicht in einem aktiven Encounter anderswo, nicht Partymitglied mit `mode === 'wait'` und `at` ≠ aktueller Ort. Keine Text-, Distanz- oder Siedlungsprüfung. `evidence` bleibt optional und dient nur dem Audit.
- `expected.go.met` aus dem X-Vertrag entfernen (`content/deltas.json`). Eine in neuen oder regenerierten Antworten trotzdem gelieferte `met`-Liste übergangsweise wie `enter` behandeln.
- Die bestehende Abhängigkeit bleibt: Eine Begegnung nach verweigerter Ankunft bleibt verworfen (D3).
- Rückmeldungen (`corrections`) nur bei verbleibender Abweichung: PC nicht am erzählten Ort, eine im Gespräch befindliche benannte Person nicht in der Szene, ein erzählter Kauf oder eine Zahlung nicht gebucht. Aus dem Zustand ableiten, nach Behebung entfallen lassen.

**Entfernen:**
- In `src/v4/narration_evidence.js`: der E2-A-Block (≈ L224–596: `namedPeople`, `personProfile`, `evidenceParts`/`partwise`, `metEvidence`, `presentHere`, `leftBeforeHim`, `deskHandlingEvidence` und ihre Wortlisten), dazu `presenceInReply` (≈ L187–203) und `guildParticipationEvidence` (≈ L212–222). Letztere wird in Etappe D entbehrlich und darf auch dort entfallen.
- In `world.js`: `metArrivals` als eigener Prüfpfad, `profileOf`, `absentKnown`/`notBroughtIn` als Sonderwege.
- In `extract.js`: der Repair-Trigger zur Gegenpartei-Präsenz (≈ L719).
- In den Prompts die Parser-Zugeständnisse („not … by a pronoun“, „the reply's own narrated words that name or describe them“).

**Behalten:** `narratedEvent`, `forcedRelocation`, `narratedPresence` (genutzt von `travel_continuation.js`), `movementEvidence`, `visualDetail` und alle übrigen Aufrufer laut Stand 2 § 5 Nr. 25.

**Abnahme:**
- Die 20 klaren Originalfälle führen zur Anwesenheit.
- Martin M17: Die Lederarbeiterin ist anwesend. Ein anschließender Kauf aus ihrem Angebot scheitert höchstens am Guthaben, nicht an ihrer Abwesenheit (eingespeiste P-Antwort, zusätzlich Testzustand mit ausreichendem Geld).
- Elm M83: Madge wird genau einmal aufgenommen, die Mahlzeit kostet einmalig 3 cp.
- Reed M21 unverändert anwesend.
- Negative abgewiesen. Den Garrick-Fall x-233 M71 als **dokumentiertes Restrisiko** ausweisen (wird aufgenommen).
- T1 grün.

### Etappe B · Extractorvertrag (P3, P4)

**Ändern:**
- `parseExtraction`/`runExtraction`: Ein ungültiges Delta wird verworfen und protokolliert, die übrigen bleiben gültig.
- Eine bezahlte Reparatur gibt es **nur**, wenn ohne sie eine gebuchte Spieleraktion offen bliebe. Das betrifft einen fehlenden oder ungültigen expected-Schlüssel (`approach`, `activity`, `take`, `buy`, `pay`, `sell`, `desk`) oder ein fehlendes bzw. ungültiges `arrive` für einen autorisierten GO, wenn die Antwort eine Ankunft erzählt.
- Abhängige Deltas scheitern über die vorhandenen Mechanismen (unbekannte Referenz, `depends_on`, `blockedPeople`/`blockedCreatures`, `quest_dependency`). Kein neuer Abhängigkeitsgraph.
- Ein Commit über `applyExtraction` unter der bestehenden Revisions- und Save-Sicherung. Kein Teilcommit vor einer Reparatur.
- `arrive` ist die einzige Ankunftsmeldung. `expected.go` entfällt im X-Vertrag. Die interne Antwort je GO-Schritt wird über das vorhandene `goStepAt` aus den `arrive`-Deltas abgeleitet. Den `movementReviewed`-Pfad entsprechend anpassen.
- Ein Delta ohne `scene` gehört zum Ort des letzten vorangehenden angenommenen `arrive`, sonst zum Ausgangsort. `scene` ist nur bei Fernsichtung (`present:false`) oder ausdrücklicher Abweichung nötig. Ortsfelder wie `person.new.at` haben Vorrang.

**Entfernen:** `sceneIssues` als Reparaturgrund sowie die semantischen Repair-Trigger ohne gebuchte Spieleraktion (Form der Dungeon-Sichtung, Bid/Offer-Form, Preisphase). Die Deltas bewertet World. Ebenso entfallen die Promptregeln zu TRAVEL CHRONOLOGY und zur Dreifachmeldung.

**Abnahme:**
- Die archivierten Erstantworten der Reparaturfälle aus `requests.jsonl.gz` offline neu einlesen. Berichtet wird, wie viele ohne Reparatur übernommen würden und welche Unterschiede zur reparierten Antwort mechanisch wirken (T3-Kategorie).
- Ungültiges `fact` neben gültigem `arrive` und Mahlzeitangebot: alles Gültige gebucht, keine Reparatur.
- Ungültiges `object.new` mit abhängigem `object.move`: beide verworfen.
- Fehlendes `buy`-Ergebnis bei gebuchtem Kauf: Reparatur.
- Mehretappen, Rückkehr zum Ausgangsort, PULSE-Halt und Fernsichtung korrekt zugeordnet.
- Reload, Swipe und Retry ohne Doppelbuchung.

### Etappe C · Ortswechsel (P5)

**Ändern:**
- In `commands.js go()`: Für `to: {scene}` und `to: {new}` das vom Planner extrahierte Ziel mit bekannten erreichbaren Orten abgleichen. Dafür dienen `resolvePlaceRef(s, {new: focus})` und die vorhandene Namensregel („… of the <Ort>“, bekannte Person → ihr Ort), angewendet auf das Ziel, nicht auf den rohen Spielersatz.
- Ein eindeutiger Treffer ergibt einen GO, ein mehrdeutiger die vorhandene Klärung. **Ohne Treffer bleibt die Klassifikation des Planners.**
- In `turn.js` (≈ L103) wird der NOTHING-TO-BOOK-Text widerspruchsfrei. Sinngemäß wird aus „… narrate what he says and does …“ der Zusatz „no journey to another place was booked this turn; he ends this reply at WHERE (moving about within this scene is fine)“.

**Entfernen:** der Satz-Regex in `known_routes.chosenKnownRoute`, also die Subjekt-, Verb- und Negationserkennung über den Spielertext, sobald seine Originalfälle über den Zielabgleich grün sind. Die HUD-Ortswahl (`knownRoutes`, `#go`) bleibt unverändert.

**Eingefroren lassen:** `explicitJourneyClause`, die Zimmer-Regel aus .247 (`commands.js` ≈ L671) und `localApproach`.

**Abnahme:**
- Lantern M80/M82 mit Original-P ergeben einen GO.
- Linden M78 weiterhin über die Zimmer-Regel.
- Die Varianten aus `probe_known_route.mjs` mit `{scene}`/`{new}`-Ziel ergeben einen GO zum bekannten Ort.
- Ein unbekannter Standpunkt bleibt Approach.
- User16- und Flint-Grenzen unverändert (Tor ist nicht innen).
- Rook M8 und Hearth M84 (leerer Plan) werden ehrlich als nicht durch die Engine lösbar gekennzeichnet. Der Engine-Block enthält dort den neuen Satz.
- Isolierter ST-Smoke wegen der Vertragsänderung.

### Etappe D · Gewachsene Altpfade (P7, P8, P9a)

**P7 vollständig zurückgestellt (Nutzerentscheidung nach GPT- und Claude-Gegenreview).** Alle Party-Akte des X-Vertrags, eigenständige NPC-Entscheidungen, Sprecherzuordnung, Annahme, Ablehnung und NPC-Angebote behalten ihren Umfang von .251. Dies präzisiert D8. Für die Abnahme gelten die dokumentierten Schutzfälle zu Schutzbitte, kombinierter Kampfaktion und Wache. [Gegenproben](AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md)

**Desk (P8):** Die `deskHandlers`-Bindungen bleiben, nur die Sprachprüfung entfällt.
- Genau ein Gildenmitarbeiter der Halle anwesend: Er erhält das Wissen.
- Mehrere anwesend: Es gilt die X-ID `handled_by` ohne Grammatik.
- Keine eindeutige Zuordnung: kein persönliches Wissen. Die Gildenbuchung bleibt unberührt.

**Preis (P9a):**
- Der Suchbereich für `pricing.currency_quote` in `finance_evidence.js` (≈ L189–200) wird vom eigenen Satz bzw. `said`-Bereich auf die ganze Antwort erweitert.
- Die Pflicht zu genau einer Münzart im Auszug und die numerische Prüfung bleiben.
- Der X-Vertrag erhält einen Satz: Bei einer Zahl ohne Münzwort wird `currency_quote` gefüllt.

**Abnahme:**
- Die Partyabnahmen .236–.250 grün.
- Vale, Cypress und die Schutzfälle zur taktischen Koordination werden gegen das bestehende Partyverhalten aus .251 geprüft.
- Desk mit einem bzw. zwei Mitarbeitern.
- Martin M11 mit `currency_quote: "eight silver"` ergibt 120 cp für die zweite Zeile. Zwei Währungen ergeben keinen Preis.

### Etappe E · Gesamtabnahme

- Vollständige Node-Suite (`npm test`).
- Replay mit T3-Kategorienbericht und **einmaliger** dokumentierter Neubewertung. Triviale Änderungen erhalten eine Sammelbegründung, mechanische Wirkungen eine Einzelbegründung. Ungeklärte Abweichungen blockieren.
- Isolierte ST-Abnahme (Party, Szene, Handel, Speichern/Revisionen, Streaming wie bei .251).
- Größe der P- und X-Requests im Festkontext gegenüber Etappe 0.
- Liste der Installationsdateien.

### Etappe F · nur nach eigener Kostenfreigabe (nicht Teil dieses Auftrags)

T2-Modell: feste Kontexte, echte P- und X-Antworten auf `.251` und auf dem Kandidaten, je Modellroute. Gemessen werden Anwesenheitsklassifikation, GO-Erkennung und Agency-Negative. Die Bewertungsregeln werden vorher festgelegt. Danach wird über die eingefrorenen Guard-Sprachregeln und Phrasenauslöser entschieden.

## 5. Nicht Teil des Auftrags

- N und X in einem Call (V2)
- Prompt-Großoptimierung außerhalb der entfallenden Regeln
- Zerlegung von `applyWorld` über das hinaus, was beim Entfernen ohnehin entsteht
- Bereinigung der Ruleset-1-/`cPath`-Zweige
- die übrigen `narratedEvent`-Nutzer
- Firewall-Regex auf freiem Faktentext
- E3-Anker
- Kanonänderungen
- P9b
- ein `mode`-Feld

## 6. Abschlussbericht auf `main`

`recherche/AVERETH_252_VALIDIERUNGSVEREINFACHUNG_ABNAHME.md` mit folgendem Inhalt:

- Commits und Builds, Produktdiff gegenüber `4933a5f0`
- entfernte Funktionen, Felder und Promptregeln mit Zeilenbilanz
- neue Funktionen (erwartet nur `admitPresence` und der Zielabgleich)
- Rot/Grün je Originalfall und Negativ
- T1-Ergebnis, T3-Kategorienbericht, ST-Ergebnisse
- Request-Größen vorher und nachher
- jede Stelle, an der der Auftrag nicht wie geplant umsetzbar war
- Installationshinweise

Ein Eintrag im Forschungsindex, danach folgt der unabhängige GPT-Diffreview. Kein Produktmerge.
