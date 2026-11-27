# Avereth .251 – Unabhängige Analyse der Validierungsarchitektur und Entwicklungsplan

**Stand 2 · 27.11.2026 · Claude (unabhängige Code- und Architekturanalyse, keine Implementierung).** Überarbeitet nach dem [GPT-Gegenreview](AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md). Die erste Fassung ist unverändert unter [Stand 1 · `13fa3587`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/13fa3587dca3b417a4d39822ddd25bbe2e3e7cfd/recherche/AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) erreichbar. Dieser Bericht ändert weder Produkt, Tests, Kanon noch den Entwicklungsbranch. Alle Empfehlungen sind Vorschläge.

| Bezug | Referenz |
|---|---|
| Untersuchtes Produkt | Build `4.3.0-c.6.6.251` · [`4933a5f0`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4933a5f005a86a381a922981d3d7377e8ba84b5c) auf `experiment/211-openrouter-helper-single-runner` (Remote-HEAD vor beiden Fassungen geprüft, unverändert) |
| Dokumentationsstand | Stand 1 auf `main` `69594b82`, Stand 2 auf `main` [`463e3bc9`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/463e3bc93a1baf163cee0f042b4bbcc09463790c) (nach GPT-Gegenreview) |
| Diskussion und Review | [Diskussionsgrundlage](AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) · [GPT-Gegenreview](AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md) |
| Reproduktion | [claude_251_analyse/](claude_251_analyse/) · [Ergebnisse Stand 1](claude_251_analyse/ERGEBNISSE.txt) · [Ergebnisse Stand 2](claude_251_analyse/ERGEBNISSE_STAND2.txt) |

**Kennzeichnung der Aussagen.** **[geprüft]** = von mir am Code oder an Originalarchiven selbst nachvollzogen. **[Bericht]** = aus früheren Untersuchungen übernommen. **[Hypothese]** = Einschätzung, die eine spätere Messung erst bestätigen muss.

**Kennzeichnung der Revision.** **[beibehalten]** · **[präzisiert]** · **[geändert]** · **[zurückgezogen]** – jeweils gegenüber Stand 1.

---

## 0. Kurzfassung (Stand 2)

1. **[beibehalten]** P/N/X bleibt. Spielerabsicht wird vor der Erzählung autorisiert, Kampf, Geld, Besitz, Zeit und Reiseabschnitte bleiben deterministische Engine-Autorität. GPT bestätigt diese Richtung (V1).
2. **[beibehalten, präzisiert]** Das Grundproblem sind verstreute JavaScript-Stellen, die englische Bedeutung erneut aus dem Wortlaut erraten, nachdem ein Sprachmodell sie bereits strukturiert gemeldet hat. Das ist kein einzelner vierter Interpret, sondern eine Schicht aus vielen Einzelregeln (§ 3).
3. **[präzisiert]** Anwesenheit, saubere Neuzählung über alle drei Modellrouten der Serie (§ 4.2): 24 `met_evidence`-Ablehnungen. 20 zeigen die Person beim Lesen klar anwesend, 3 sind in der Identität unklar, 1 ist richtig abgelehnt. In 7 der 20 klaren Fälle ist die Person am Ende des Antwortrecords weiterhin nicht in der Szene.
4. **[beibehalten]** Dieselbe Tatsache „bekannte Person ist hier“ wird je nach Meldeweg streng, locker oder gar nicht geprüft (`met` / `enter` / `aware`/`position`). GPT hat das unabhängig bestätigt.
5. **[geändert]** Die neue Anwesenheitsregel braucht **kein neues Feld und keinen Textbeleg**. Ein einziger Meldeweg (`enter`) und eine Aufnahmefunktion mit wenigen echten Zustandsgrenzen genügen: lebt, nicht anderswo gebunden. Das `seen`-Enum, das `arrives`-Flag und die Entfernungsprüfung aus Stand 1 entfallen.
6. **[zurückgezogen]** P2 (Kaskade lockern). Die Nachprüfung der Originale zeigt: Die nach einer verweigerten Ankunft verworfenen Meldungen beschreiben Ereignisse **am nicht erreichten Ort**. Die bestehende Regel ist konsistent. Der Schaden entsteht davor, bei der falschen Verweigerung der Ankunft.
7. **[präzisiert]** Ortswechsel zerfallen in zwei Fälle. (A) Ein vorhandener GO-Befehl wird falsch klassifiziert: Die Engine kann ihn über das Ortsbuch richtig zuordnen. (B) Der GO fehlt ganz, z. B. Rook mit identischem Text wie Martin, aber leerem Plan: Das kann keine Engine-Regel ohne neuen Phrasenparser reparieren. Für B empfehle ich nur einen widerspruchsfreien Narratorauftrag und eine Messung.
8. **[geändert]** Agency: **kein neues `mode`-Feld** (Abweichung von GPT). Der Guard hat in der Serie 5-mal eingegriffen: 4 falsche Drops, inzwischen per Ausnahmeliste freigegeben, und 1 richtiger. Empfehlung: einfrieren, keine neuen Ausnahmen, über T2 messen, danach Sprachregeln entfernen oder gezielt behalten.
9. **[präzisiert]** Den Extractor-Vertrag gezielt verkleinern: Teilübernahme gültiger Deltas (P3). Eine einzige Ankunftsquelle (`arrive`) statt `expected.go` plus `arrive` plus `met`. Szenenangabe nur bei Abweichung (P4). Party nur noch NPC-eigene Angebote und Austritte (P7). Desk-Zeuge ohne Grammatik (P8). Preisellipse über das vorhandene Feld `currency_quote` (P9a).
10. **[präzisiert]** Teststrategie T1–T3 mit GPTs Schärfungen. T2 trennt die Engine-Abnahme mit eingespeisten Antworten von der echten Modellqualität. T3 bleibt ein Differenzdetektor mit vier Kategorien. „Mehr übernommen“ gilt nicht automatisch als harmlos.

**Netto gegenüber .251 entfallen Prüfungen und Vertragsfelder. Es kommen keine neuen Pflichtfelder, keine neuen Validatoren und keine zusätzlichen Modellaufrufe hinzu.** Das ist die Leitbedingung des Nutzers, und Stand 2 ist daran ausgerichtet.

---

## R. Revision nach dem GPT-Gegenreview

### R.1 Änderungsübersicht

| Thema | Stand 1 | Stand 2 | Status | Grund |
|---|---|---|---|---|
| Archivstatistik | 217 Antworten, „eine GLM-Route“, 23/24 falsche Ablehnungen, 9 Divergenzen | 223 Antworten über Request-Inhalt zugeordnet, drei Modellrouten getrennt. 24 Ablehnungen: 20 klar falsch, 3 unklar, 1 richtig. 7 klare + 2 unklare + 1 richtige am Recordende abwesend. | präzisiert | GPT-Methodenhinweis berechtigt (§ 4.2) |
| „Falsche Ablehnungen misst nichts“ | absolut formuliert | Es gibt Rot/Grün-Originalgegenproben. Es fehlt eine systematische, vergleichbare Messung. | präzisiert | GPT berechtigt |
| P1 Anwesenheit | neues `seen`-Enum, `arrives`, Zitatprüfung, Siedlungs-/Entfernungsgate | ein Meldeweg `enter` (`met` entfällt), keine Textprüfung, nur bindende Zustände | geändert | Leitbedingung „keine neuen Pflichtfelder“; Zitatprüfung erkennt den leeren Stand ohnehin nicht (§ 6 P1) |
| P2 Kaskade | ortsunabhängige Deltas behalten | bestehende Regel bleibt | zurückgezogen | Die verworfenen Deltas waren abhängig (§ 4.5) |
| P3 Teilübernahme | Reparatur bei mechanischen Delta-Typen | Reparatur nur, wenn ohne sie eine **gebuchte Spieleraktion** offen bliebe. Ein Commit, kein Teilcommit vor Reparatur. | präzisiert | GPT berechtigt (Atomarität, Revision) |
| P4 Chronologie | Szene aus `seq` ableiten | dazu `expected.go` und `met` aus dem X-Vertrag entfernen; `arrive` ist die einzige Ankunftsquelle | präzisiert, erweitert | eine Quelle statt drei |
| P5 Ortswechsel | Planner liefert Worte, Engine klassifiziert alles, unbekannt → neuer Ort | Planner versteht Absicht und Ziel. Engine ordnet das **Planner-Ziel** dem Ortsbuch zu. Kein Treffer → Planner-Klassifikation bleibt. Fehlender GO ist ein eigener Fall. | geändert | GPT berechtigt; dazu neuer Befund zu `chosenKnownRoute` (§ 4.4) |
| P6 Agency | `mode`-Feld, Sprachregeln für Nicht-COMMITMENTS entfernen | kein neues Feld; Guard einfrieren, in T2 messen, dann entscheiden | geändert | Leitbedingung; Guard greift selten (5 von 223 Zügen); GPTs COMMITMENTS-Einwand berechtigt |
| P7 Party | X nur `leave`/Ablehnung | X behält NPC-eigene **Angebote** und Austritte ohne Sprecherparser | präzisiert | Kanon sieht NPC-initiierte Angebote vor (GPT berechtigt) |
| P8 Desk-Zeuge | bei mehreren: „zuletzt im Gespräch beteiligt“ | genau einer anwesend → er. Mehrere → vorhandenes `handled_by` ohne Grammatik. Sonst kein persönliches Wissen. | geändert | Kanon, falsche Wissenszuordnung (GPT berechtigt) |
| P9a Preis | Münzwort „im selben Satz oder derselben Zeile“ | vorhandenes `pricing.currency_quote` nutzen; dessen Suchbereich von „eigener Satz“ auf „dieselbe Antwort“ erweitern | geändert | keine neue Satzgrenzenregel (GPT berechtigt) |
| P10 Rückmeldung | jede szenenwirksame Ablehnung | nur verbleibende relevante Abweichungen, aus dem Zustand abgeleitet, verfallend | präzisiert | GPT berechtigt |
| T3 Replay | „mehr übernommen“ = informativ | vier Kategorien nach GPT; Sammelbegründung für triviale Änderungen | präzisiert | GPT berechtigt |
| Regelregister | Register je Regel | kompakter Überblick nur der verbleibenden zentralen Autoritäten | präzisiert | kein neues Verwaltungsartefakt |

### R.2 Antworten auf GPTs sieben Rückfragen

1. **Methodik.** Stimmt in allen drei Punkten. Neu gezählt mit [recount_v2.py](claude_251_analyse/recount_v2.py): Jede Antwort wird über den Inhalt eines physischen Extractor-Requests zugeordnet und je Arm einmal gezählt. Ablehnungen sind über ihr eigenes `delta.rejected`-Event dedupliziert, die Anwesenheit wird am Recordende über die Szenenereignisse nach der Ablehnung bestimmt. Das ist weiterhin kein vollständiger Fold, die Divergenzzahl bleibt eine Untergrenze bzw. Näherung. Die drei unklaren Identitäten sind als unklar gelabelt. Die Ergebnisse stehen in § 4.2.
2. **Kleinster P1-Vertrag.** `enter` als einziger Meldeweg für „bekannte Person ist jetzt hier“, ohne neues Feld. Das vorhandene optionale `evidence` dient nur dem Audit. `met` entfällt im X-Vertrag. `aware`/`position` einer abwesenden Person laufen durch dieselbe Aufnahmefunktion. Von `narration_evidence.js` entfallen nur die Präsenz-, Desk- und Party-Pfade. `narratedEvent` und `forcedRelocation` bleiben für ihre übrigen Aufrufer (§ 5, § 6 P1).
3. **P2/P3/P4.** P2 entfällt. P3 braucht genau eine neue Unterscheidung, die es implizit schon gibt: Fehlt die Antwort auf eine gebuchte Spieleraktion (expected-Schlüssel bzw. `arrive` für den GO), wird repariert. Jedes andere ungültige Delta wird verworfen. Abhängige Deltas scheitern dann an den bereits vorhandenen Mechanismen (unbekannte Referenz, `depends_on`, `blockedPeople`/`blockedCreatures`). P4 entfernt Felder und braucht keine neue Buchhaltung.
4. **P5/P6.** (A) Falsch klassifizierter vorhandener GO: Die Engine gleicht das **vom Planner bereits extrahierte Ziel** mit dem Ortsbuch ab, statt den rohen Spielersatz per Regex zu lesen. (B) Fehlender GO: Hier bleibt die semantische Entscheidung beim Planner. Die Engine kann sie nicht nachholen. Ich empfehle einen widerspruchsfreien Narratorauftrag für Züge ohne gebuchte Reise (§ 6 P5) und eine Messung der GO-Erkennung in T2. Falsche Spielerhandlungen mit Wirkung verhindert weiterhin der unveränderte Guard, bis T2 zeigt, welche seiner Regeln echte Fehler fangen.
5. **P7/P8/P9a.** NPC-Angebote bleiben als X-`party offer` erhalten. Gespeichert wird ein offenes Angebot, die Annahme bleibt beim Spieler. P8 in GPTs Form ist mit dem Kanon vereinbar, weil keine Zuordnung ohne eindeutigen Bearbeiter erfolgt. P9a ist eine Lockerung einer bestehenden Prüfung über ein vorhandenes Feld, kein neuer Validator.
6. **Was vollständig entfallen kann** – siehe R.4. **Zu streng bei GPT:** die Anregung eines kurzen Belegs „bei unsicherer oder neuer Ankunft“ und das strukturierte `mode` (beides neue Prüf- bzw. Formflächen). **Zu großzügig bei mir:** P2, die Einstufung von GO/Aktivität als „umkehrbar“, die Fallback-Regel „unbekannt → neuer Ort“, „zuletzt im Gespräch“ bei P8 und die Satzgrenzenregel bei P9a.
7. **Plan, T2, T3.** Siehe § 11. In T2 wird die Modellqualität mit echten P-/X-Antworten auf festen Kontexten gemessen, auf .251 und Kandidat, je Modellroute. Das braucht eine eigene Kostenfreigabe. T3 vergleicht weiter gegen die alte Referenz, kategorisiert aber jede Abweichung. Historische Fehlerwartungen werden mit Sammelbegründung ersetzt, nicht konserviert.

### R.3 Wo ich GPT bewusst nicht folge

| Punkt | GPT | Claude, Stand 2 | Begründung |
|---|---|---|---|
| Agency-`mode` | bevorzugt, ohne Default `do` bei unklaren Antworten | **nicht einführen** | Der Planner-Vertrag lautet bereits „nur Befehle für das, was Alaric jetzt tut“. Ein `mode` zwänge ihn, auch Nicht-Handlungen als Befehle auszugeben, und erzeugt einen neuen Fehlerfall (fehlender oder unklarer Modus). Der Guard greift heute selten (§ 4.2). Ein neues Pflichtfeld ist dafür kein guter Tausch. |
| Beleg bei Anwesenheit | „kurzer Beleg kann bei unsicherer oder neuer Ankunft hilfreich sein“ | **kein Textgate** | Ein wörtlicher Auszug unterscheidet „Her stall stood empty“ nicht von echter Anwesenheit, beide Sätze stehen wörtlich in der Antwort. Er fängt nur erfundene Zitate und erzeugt selbst Fehlablehnungen (Willow M81). Restrisiko siehe § 6 P1. |
| P2 nach Abhängigkeit | „kleine, gut begründete Einteilung“ | **keine Änderung** | Die Prüfung der Originale ergab keinen Fall, den eine solche Einteilung verbessern würde. |

### R.4 Was nach der zweiten Prüfung vollständig entfallen kann

- Aus narration_evidence.js der E2-A-Block L224–596: `namedPeople`, `personProfile`, `evidenceParts`/`partwise`, `metEvidence`, `presentHere`, `leftBeforeHim`, `deskHandlingEvidence` mit den Wortlisten `DEPICTED`, `AWAY`, `TRACE`, `HERE_DOES`, `HERE_DOING`, `SEES`, `LOOK_BACK`, `LINGER`, `ELSEWHERE`, `SETTLEMENT`, `HANDLES`, `DESK_OBJECT`.
- Dazu `presenceInReply` (L187–203) und `guildParticipationEvidence` (L212–222), in world.js `profileOf` und `absentKnown` als Sonderweg. Zusammen ≈ 390 Zeilen in narration_evidence.js [geprüft an Zeilennummern]. Es bleiben `narratedEvent`, `forcedRelocation`, `narratedPresence` (genutzt von `travel_continuation.js`), `movementEvidence` und `visualDetail`.
- Im X-Vertrag: `expected.go` (inkl. `met`), Pflicht-`scene` vor Ankünften, `party`-Akte `accept`/`follow`/`wait`/`coordinate`, die parserfreundlichen Zitatregeln („not … by a pronoun“, „narrated words that name or describe them“) und `handled_by`-Beleg-Grammatik.
- Repair-Trigger ohne gebuchte Spieleraktion: Gegenpartei-Präsenz (extract.js L719), Szenenchronologie (`sceneIssues`), Form der Dungeon-Sichtung, Bid/Offer-Form, Preisphase. Die betroffenen Deltas werden stattdessen in World angenommen oder verworfen.
- In `party.js` der Sprecher- und Zustimmungsparser (`evidenceOf`, `unchangedAnswer`) für X-Meldungen.
- `chosenKnownRoute`s Satz-Regex (Subjekt/Verb/Negation), ersetzt durch den Abgleich des Planner-Ziels (P5-A).

Bewusst **nicht** entfallen: `narratedEvent` und `forcedRelocation` (Kapitulation, Reisezeit, Ereigniszeit, Gildenfiliale, Heilung, Standpunkt, Thread-Auflösung, Reisefortsetzung). Das sind seltene, teils mechanische Fälle, die einen eigenen späteren Blick verdienen und nicht Teil dieses Plans sind (§ 5). Ebenso bleiben `explicitJourneyClause` und die Zimmer-Regel aus .247 vorerst eingefroren, bis T2 ihre Fälle anders abdeckt.

---

## 1. Unabhängige Gesamtbewertung [beibehalten]

Avereth hat eine solide mechanische Grundlage: Eventlog und Fold, Decision Ownership in `ownership.js`, deterministische Kampfauflösung, gebundene Transaktionen, Revisionsschutz und die neuere native Party- und Ortssteuerung. Die Zuständigkeitsidee „Planner interpretiert, Engine bucht, Narrator erzählt, Extractor erfasst“ ist sinnvoll.

Die Schwäche liegt in einer Schicht, die nirgends als Architekturentscheidung beschrieben ist. Nachdem ein Sprachmodell den Text verstanden und strukturiert gemeldet hat, leitet JavaScript dieselbe Bedeutung **noch einmal aus dem englischen Wortlaut** ab. Diese Schicht ist über viele Builds aus Einzelfällen gewachsen. Allein `world.js` enthält 191 Verweise auf konkrete Patches, Livetests oder Reviews als Begründung einzelner Regeln.

Drei Eigenschaften dieser Schicht lassen sich durch weitere Wortlisten nicht beheben:

- **Offen gegenüber Paraphrasen.** `HERE_DOES` listet etwa 100 Verben, „pulled a pint“, „hailed him“ oder „recognised him“ fehlen.
- **Falsche Ablehnungen und falsche Zulassungen zugleich.** Der lockerere `enter`-Pfad akzeptiert „had packed up and left before Alaric arrived“ (§ 4.3).
- **Unsichtbare Fehlerverlagerung.** Die Erzählung stimmt, der Zustand weicht ab, und das zeigt sich erst Züge später.

**Urteil (Stand 2):** Kein Neubau. Die bestehende Kette bleibt. Die JS-Sprachprüfungen werden im Standardpfad ersatzlos entfernt, wo die strukturierte Meldung des Modells die Bedeutung bereits trägt. Was sie schützen sollten, übernimmt eine **Zustandsprüfung der Engine**, nicht ein neues Formular. Wo eine echte Spielerentscheidung betroffen ist, bleibt sie beim Planner, beim HUD oder bei der nativen Aktion.

---

## 2. Bewertung der bisherigen Diskussion [beibehalten, ergänzt]

| Position | Bewertung |
|---|---|
| Andere KI, Vorschlag 1 (Fuzzy-Parser, Key-Value) | Trifft das Problem kaum. Das JSON-Lesen scheitert praktisch nie. Richtig ist nur der Teilaspekt, gültige Teile nicht wegen eines fehlerhaften Teils zu verwerfen (P3). |
| Andere KI, Vorschlag 2 (alle linguistischen Prüfungen löschen) | Für Anwesenheit, Party-Rückübersetzung, Desk-Zeugen und Chronologie im Ergebnis richtig. Nicht pauschal: Erzwungene Verlagerung, Münzübergaben und Spielerverpflichtungen behalten ihre Schutzform (§ 5). |
| GPT, erste Stellungnahme (Stufenmodell) | Weitgehend einverstanden. Mein Trennkriterium ist, wer eine Aussage zuverlässig prüfen kann: Zustand die Engine, Bedeutung das Modell, Wille der Spieler. |
| **GPT-Gegenreview** | In den meisten Punkten berechtigt und hilfreich (R.1). Die zweite Selbstprüfung hat GPT konsequenter zur Vereinfachung geführt als meine erste Fassung, besonders bei P1 und P8. Abweichungen siehe R.3. |
| Testkultur | Bestätigt: Freiheit, unveränderte Schutzfälle und exakte Fingerprints zugleich zu verlangen, begünstigt den kleinsten lokalen Patch. Ein Anreizproblem, keine Schuldfrage. |

---

## 3. Tatsächliche Architektur und Zuständigkeiten [beibehalten, ergänzt]

### 3.1 Wo natürliche Sprache interpretiert wird [geprüft]

```
Spielertext
  │
  ├─(1) Planner-LLM  ............ src/v4/planner.js, runtime.planMessage   – Systemprompt ≈ 47 KB
  ├─(2) Agency-Guard (JS) ........ src/v4/agency.js guardCommands L327     – Subjekt, Anrede, Modal, Frage, Negation
  ├─(3) Bewegungs-Heuristiken (JS) known_routes.js chosenKnownRoute L17 (Satz-Regex über den Spielertext),
  │                                runtime.js L397–404 explicitJourneyClause, localApproach;
  │                                commands.js go() L657–686 (Zimmer-Regel L671, {scene}→Approach L676)
  ▼
Engine bucht Aktionen (commands.js) ──► PLAYER ACTIONS / Engine-Block
  │
  ├─(4) Narrator-LLM liest PLAYER ACTIONS **und den Spielertext selbst** (≈ 54 KB)
  ▼
Prosa
  ├─(5) Extractor-LLM ............ src/v4/extract.js                       – ≈ 62 KB
  ├─(6) parseExtraction (JS) ..... extract.js L596–817: Schema alles oder nichts (L817) + semanticIssues → Reparatur
  ├─(7) Firewall (JS) ............ src/v4/firewall.js: Zuständigkeit nach Typ + Regex auf freiem Faktentext
  ├─(8) Weltabgleich (JS) ........ world.js applyWorld L280–≈4015 mit narration_evidence.js, finance_evidence.js,
  │                                party.js evidenceOf/unchangedAnswer, surrender.js, threads.js
  └─(9) delta.js reportToEvents .. bringIn() für enter/aware/position
```

### 3.2 Dieselbe Entscheidung an mehreren Stellen [geprüft, von GPT bestätigt]

| Kanal | Prüfung | Person mit gespeichertem `at` = aktueller Ort |
|---|---|---|
| `expected.go.met` | `metEvidence` ([L347](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/narration_evidence.js#L347)) | strenger Satzparser |
| `enter` | [world.js L1524](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L1524): `presenceInReply` nur bei `absentKnown` | keine Prüfung |
| `aware`, `position` | `notBroughtIn` ([L612](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L612)) → `bringIn` ([delta.js L451](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/delta.js#L451)) | keine Prüfung |

Martin M17 (Lederarbeiterin, `at` = Markt) zeigt die echte Divergenz. Elm M83 (Madge) zeigt zwei unterschiedlich behandelte Meldungen desselben Ereignisses ohne Blockade, der Kauf gelang. Reed M21 (Tam) zeigt den Eintritt über `aware` trotz abgelehnter `met`-Meldung. Wie GPT anmerkt, sind das zwei verschiedene Fehlerbilder, die in der Abnahme getrennt betrachtet werden.

**Bewegung des PC** wird unabhängig von Planner, Guard, `chosenKnownRoute`, Laufzeit-Heuristik, `go()`-Regel, Narrator (der den Spielertext liest), Extractor und GO-Firewall beurteilt.

### 3.3 Widersprüchliche Modellaufträge [geprüft]

| Auftrag | Quelle | Widerspruch |
|---|---|---|
| Narrator: „KNOWN AT … whoever works there is at work unless the story establishes otherwise“ | [commands.js L868](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/commands.js#L868) | Die Engine verlangt danach einen parserkompatiblen Anwesenheitssatz. |
| Extractor: `met` „… not … referred to by a pronoun“ | `content/deltas.json` | Prompt-Zugeständnis an den Parser |
| Narrator bei leerem Plan: „NOTHING TO BOOK — … narrate what he says **and does**“ | [turn.js L103](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/turn.js#L103) | Lädt dazu ein, die nicht gebuchte Reise zu erzählen, wenn der Planner sie verfehlt hat (Rook M9, Hearth M85). **[neu in Stand 2]** |
| Extractor: `expected.go.arrived/at` **und** `arrive`-Delta **und** `met`, Szene je Delta vor einer Ankunft | extract.js `sceneIssues` L469 | Dieselbe Tatsache dreifach; Widerspruch führt zur Reparatur. |

### 3.4 Was tatsächlich mechanische Integrität schützt [beibehalten]

Decision Ownership (`ownershipViolation`/`effectViolation`), die Firewall nach Delta-Typ (Gildenlohn, PC-Inventar, Plakette, Queststatus), GO-Autorisierung, Reiseabschnitte, PULSE, Dungeon-Slots, Kampfpositionen, Transaktionen nur über Spieleraktionen, Doppelbuchungsschutz, Tod, Fold-Block und Revisionsbindung. Diese Prüfungen bleiben.

---

## 4. Repräsentative Originalfehler und ihre Ursachen

### 4.1 Einzelfälle [geprüft; Klassen nach Auftrag 1–10]

| Fall | Was geschah | Klasse | Ursache |
|---|---|---|---|
| **Martin M17** | Lederarbeiterin erzählt, mit ID gemeldet, `met_evidence` abgelehnt. Reed spricht mit einer „abwesenden“ Person. | 7 (+5) | Possessiv + Pronomen. Keine Correction an den Narrator. |
| **Martin M11** | „eight silver … twelve“ – zweite Zeile ohne Preis | 7 | X ließ `currency_quote` leer (`null`). Der Währungssuchbereich ist auf den eigenen Satz begrenzt. |
| **Elm M83** | „Madge was drawing ale“ → Bild. `enter` übernimmt sie. | 7, Kanal-Inkonsistenz | `DEPICTED` enthält `drawing\w*`. |
| **Reed M21** | Tam abgelehnt, `aware` bringt ihn. | 7, Kanal-Inkonsistenz | Rolle ≠ „eel-man“ |
| **Lantern M81–85** | Rückkehr zur Gaststube als `{scene}`. `no_go`, danach `scene_context`. | 3 → Folgefehler | P-Klassifikation eines vorhandenen GO (Fall A) |
| **Rook M9** | **leerer Plan** für denselben Text, für den Martin M8 (gleiches Modell) korrekt GO lieferte | 3 (Modellstreuung) | Fall B: kein Befehl vorhanden |
| **Rook M17** | `{scene: "the market"}` für einen noch nie erreichten Markt | 3 | Ziel unbekannt, das Ortsbuch kann nicht helfen (Fall B-nah). |
| **AI M17 / AJ M21** | Ossens Zusage korrekt gemeldet, Sprecherprüfung verwirft. | 7 | `evidenceOf` [Bericht .235] |
| **AJ M23 / Hazel M23** | korrekter Planner-GO vom Guard als `npc_actor` entfernt | 4 | Anrede als Subjekt gelesen, seit .249 per Ausnahme freigegeben (GPT-Probe) |
| **Hearth M65** | Spieler zahlt nur, Narrator erfindet den Gang zur Schänke → `no_go` | 8 (korrekt) + 5 | Narrator erfindet Reise. Abhängige Deltas zu Recht verworfen (§ 4.5). |
| **x-233 M71** (Garrick) | Zitat nennt ihn nicht | 8 (korrekt) | einziger echter Fang von `met_evidence` in der Serie |

### 4.2 Stichprobe der Serie, Stand 2 [geprüft, Methode nach GPT präzisiert]

**Auswahl:** Eine Antwort zählt, wenn ihre Prosa als REPLY in mindestens einem physischen Extractor-Request desselben Arms steht, je Arm einmal ([recount_v2.py](claude_251_analyse/recount_v2.py)). Dadurch erhöht sich die Zahl gegenüber Stand 1 von 217 auf 223. Es handelt sich um konstruierte Testarme, nicht um persönliche Sitzungen. **Keine allgemeine Fehlerquote.**

| Modellroute | Antworten | mit X-Reparatur | X nicht angewandt | `met_evidence` | davon am Ende abwesend |
|---|---:|---:|---:|---:|---:|
| `z-ai/glm-5.3-flash` | 150 | 48 (32 %) | 2 | 17 | 8 |
| `openai/gpt-4.1-mini` | 43 | 14 (33 %) | 1 | 2 | 0 |
| `openai/gpt-5.4-mini` | 30 | 4 (13 %) | 1 | 5 | 2 |
| **gesamt** | **223** | **66 (30 %)** | **4** | **24** | **10** |

X-Reparatur-Inputtokens in den angewandten Records: 1.061.288 von 4.516.003 (≈ 23,5 %). Das ist eine Stichprobenzahl, keine Einsparprognose.

**Labels der 24 `met_evidence`-Ablehnungen** (an vollständiger Prosa geprüft, [Liste](claude_251_analyse/ERGEBNISSE_STAND2.txt)):

| Label | Anzahl | am Recordende abwesend |
|---|---:|---:|
| klar anwesend (z. B. „The clerk was still at the long counter …“, „The bone merchant was there still …“) | 20 | 7 |
| Identität unklar („a boy very like him“, „A thin boy“ – Taschendieb-Junge) | 3 | 2 |
| richtig abgelehnt (Garrick, Prosa nennt ihn nicht) | 1 | 1 |

Nach Modell betrachtet kommen GLM-Antworten etwas häufiger zu `met`-Ablehnungen. Die Ursache liegt aber nicht im Modell, sondern im Parser: Alle drei Routen sind betroffen.

**Häufigste Ablehnungsregeln (gleiche Auswahl):** `scene_context` 55, `met_evidence` 24, `party_decision` 19, `met_without_arrival` 15, `no_go` 14, `world_rule` 13, `desk_handler` 8, `offer` 7.

**Agency-Drops der gesamten Serie:** 5 Drops bei 223 Planner-Zügen. 4 × `npc_actor`, alle Anreden mit echter Entscheidung („Ossen, let's set out …“, „Ossen, please wait here …“, „Ossen, come with me again …“, „Ossen, let's part ways here.“), heute laut GPT-Probe per Ausnahmeliste zugelassen. 1 × `question`, richtig: ein `sell` für „What is her firm price for this one?“.

**Reparaturanlässe:** Klassifikation aus Stand 1 (67 Requests, Textmuster-Näherung, GPT-Einwand berechtigt): Szenenchronologie 23, fehlendes Pflichtfeld 8, unbekannte ID/Enum/Ort 6, Gegenpartei-Präsenz 6, Preis/Geld 5, Zusatzfeld 5, fehlender expected-Schlüssel 4, Dungeon-Sichtung 4, weitere einzelne. Das bleibt als Größenordnung brauchbar.

### 4.3 Isolierte Gegenprobe der Anwesenheitsfunktionen [geprüft, von GPT reproduziert]

| Ergebnis (konstruierte Sätze, keine Quote) | `metEvidence` | `presenceInReply` |
|---|---|---|
| 14 natürliche Positivsätze | 4 akzeptiert, 10 abgelehnt | 11 akzeptiert, 3 abgelehnt |
| 9 Negativsätze | 9 korrekt abgelehnt | 7 korrekt, 2 fälschlich akzeptiert |

Dazu kommen Wortlistenschäden: „his sword drawn“, „carving the roast“, „drawing water“ werden als Bild gelesen, „sweeping the empty common room“ und „gone quiet“ als abwesend, „his bowl half gone“ ebenfalls (Juniper M83), und „glanced up once“ als Rückblick (Rowan M87).

### 4.4 Phrasenauslöser: `explicitJourneyClause` und `chosenKnownRoute` [geprüft, Stand 2 erweitert]

**`explicitJourneyClause` (.251)** löst die vorhandene begrenzte Planner-Reparatur nur bei „town's …“ oder „the way I came“ aus. GPTs Präzisierung trifft zu: Das ist nur ein Reparaturauslöser. „I return to the market.“ kann über Planner oder `chosenKnownRoute` trotzdem einen GO ergeben. Die Probe belegt nur, dass der Auslöser selbst eine Phrasenliste ist.

**`chosenKnownRoute` (.245), neuer Befund:** Der bereits vorhandene Teil der Ortsauflösung über die Engine liest ebenfalls den rohen Spielersatz per Regex `^(I|we …|let's) (go|walk|head|return|move|travel) (back)? (to|into) X$` und vergleicht X erst danach mit bekannten Ortsnamen ([probe_known_route.mjs](claude_251_analyse/probe_known_route.mjs), kontrollierter Minimalzustand):

| Spielertext | Ergebnis |
|---|---|
| „I go back to The Slaked Lime.“ · „I return to the common room of The Slaked Lime to see Madge.“ · „Let's go to the market square.“ · „Ossen, let us go back to the market square.“ | bekannter Ort erkannt |
| „Back down to The Slaked Lime.“ · „Ossen and I head back to the market square.“ · „I make my way back to the market square.“ · „I walk over to the market square.“ · „Time to go to the market square, I think.“ | `null` |

`null` bedeutet nicht, dass das Produkt hier scheitert. Der Planner kann die ID direkt liefern. Es zeigt aber, dass die vorhandene Rettung bei `{scene}`-Fehlklassifikation an Satzbau gebunden ist. Der Planner hat das Ziel bereits extrahiert (`to: {scene: "…"}`), daher ist der Abgleich dieses Ziels mit dem Ortsbuch die einfachere und robustere Stelle (P5-A).

### 4.5 Nachprüfung der Kaskaden (`scene_context`) [geprüft, neu in Stand 2]

| Original | Verworfene Deltas nach verweigerter Ankunft | Betreffen sie den nicht erreichten Ort? |
|---|---|---|
| Hearth M65 | `coin.gift` von Ossen, Thread, `fact`, `attitude`, Thread, `memory` | ja, alles in der erfundenen Schänkenszene |
| e-224 M49 | `fact` und Threads zum Gang im Dungeon | ja, Dungeongang nicht erreicht |
| Rook M9 | `person.new`, `aware`, `offer`, `fact` (Lederarbeiterin) | ja, Markt nicht erreicht |
| Hazel M23 | `fact` zur Kapellentür | ja |

Die bestehende Regel wirkt nur auf Deltas **nach** der verweigerten Ankunft (world.js L1186–1190). Sie hält den Zustand konsistent. Ich ziehe P2 deshalb zurück. Der Nutzen liegt in P5 (weniger falsche Verweigerungen) und P10 (klare Rückmeldung).

---

## 5. Bewertung der vorhandenen Validatoren (Stand 2)

Legende: **B** beibehalten · **V** vereinfachen · **Z** zusammenführen · **S** aus Standardpfad entfernen · **F** einfrieren, messen, später entscheiden.

| # | Prüfgruppe | Datei · Funktion | Empf. | Künftiger Schutz | Revision |
|---|---|---|---|---|---|
| 1 | JSON-Toleranz | `json.js`, `delta.js tolerantJson`, `readDeltaEnvelope` | B | unverändert | beibehalten |
| 2 | Schema alles-oder-nichts | `parseExtraction` L817 | V | Teilübernahme, Reparatur nur für Antworten auf gebuchte Spieleraktionen (P3) | präzisiert |
| 3 | Formnormalisierung | `normalizeSoftFields`, `formOnly`, `softSeq` | B | unverändert | beibehalten |
| 4 | Szenenchronologie als Reparaturgrund | `sceneIssues` L469 | S | Engine-Standardzuordnung nach `seq` und `arrive` (P4) | präzisiert |
| 5 | Dreifachmeldung Ankunft/Begegnung | `expected.go` + `arrive` + `met` | Z | `arrive` und `enter` allein (P1, P4) | erweitert |
| 6 | Präsenz als Reparaturgrund | extract.js L719 | S | World nimmt den Handel an oder verwirft ihn ohne Reparatur. | beibehalten |
| 7 | Typbasierte Zuständigkeit | `firewall.js firewall()` | **B** | unverändert | beibehalten |
| 8 | Regex auf freiem Faktentext | `guildMechanic`, `GUILD_QUEST_STATE`, `RANK_*`, `pcActIn` | F | nicht Teil dieses Plans, später im Überblick bewerten | geändert (Stand 1: V) |
| 9 | GO-Firewall | `allowedArrival`, `no_go`, PULSE-Halt | **B** | unverändert | beibehalten |
| 10 | Erzwungene Verlagerung | `forcedRelocation` | **B** | unverändert (D9) | beibehalten |
| 11 | `met`-Satzparser | `metEvidence` und Helfer | **S** | entfällt mit dem `met`-Kanal (P1) | präzisiert |
| 12 | `enter`-Beleg | `presenceInReply`, `narratedPresence` (im `enter`-Pfad) | S | Aufnahmefunktion (P1) | geändert |
| 13 | `bringIn` über `aware`/`position` | `notBroughtIn`, `delta.js` | Z | dieselbe Aufnahmefunktion | beibehalten |
| 14 | Desk-Zeuge | `deskHandlingEvidence`, `guildParticipationEvidence` | S | eindeutiger Bearbeiter oder `handled_by`-ID (P8) | geändert |
| 15 | Party-Sprecher/Zustimmung | `evidenceOf`, `unchangedAnswer` für X-Meldungen | S | strukturierte Entscheidung + NPC-Angebot ohne Parser (P7) | präzisiert |
| 16 | Agency: Zitat und Zustand | `no_evidence`, `not_held`, `same_message`, `redundant`, `not_paying` | **B** | unverändert | beibehalten |
| 17 | Agency: Sprachregeln | `npc_actor`, `planned`, `question`, `retrospective`, `purpose`, `negated` | **F** | keine neuen Ausnahmen; T2-Messung entscheidet. | geändert (Stand 1: E durch `mode`) |
| 18 | Bewegungs-Heuristiken | `chosenKnownRoute`-Regex, `explicitJourneyClause`, `localApproach`, Zimmer-Regel | V / F | P5-A ersetzt den `chosenKnownRoute`-Satzteil. Übrige einfrieren. | geändert |
| 19 | Preiswortlaut | `finance_evidence.js moneyLiteral` | V | Suchbereich von `currency_quote` erweitern (P9a) | geändert |
| 20 | Ambient-Filter | world.js `ambient` | B | unverändert | beibehalten |
| 21 | Kaskade nach verweigerter Ankunft | world.js L1186–1190 | **B** | unverändert | geändert (Stand 1: V) |
| 22 | Dungeon/PULSE/Kampf | `living.js`, `pulse.js`, `combat.js` | **B** | unverändert | beibehalten |
| 23 | E3-Anker | `anchorRefusal` | F | später | präzisiert |
| 24 | Stille Ablehnungen | `metArrivals` | V | kompakte, zustandsbasierte Rückmeldung (P10) | präzisiert |
| 25 | Weitere `narratedEvent`-Nutzer | Ereigniszeit L1243, Reisezeit L1261, Gildenfiliale L1753/L2220, Heilung L1828, Standpunkt L2265, `surrender.js`, `travel_continuation.js`, `threads.js` | F | nicht Teil dieses Plans | neu |

---

## 6. Vorschläge (Stand 2)

### P1 · Eine Anwesenheitsregel ohne neues Feld [geändert]

- **Problem** [beibehalten]: vier Kanäle, drei Regeln. 20 klar falsche Ablehnungen in der Serie, prüfungsfreie Nebeneingänge.
- **Vertrag (kleinstmöglich).** `enter` ist der einzige Meldeweg für „eine bekannte Person ist jetzt in dieser Szene“. Er gilt für Ankunft wie für Wiederbegegnung. Das vorhandene Feld `evidence` bleibt optional und nur für das Audit. `expected.go.met` entfällt im X-Vertrag, eine trotzdem gelieferte `met`-Liste wird während des Übergangs wie `enter` behandelt. `aware` und `position` einer nicht anwesenden bekannten Person laufen durch dieselbe Funktion.
- **Aufnahmefunktion (alle Kanäle):**

```js
function admitPresence(s, id) {
  const e = s.entities[id];
  if (!e || e.kind !== 'npc') return no('unknown_person');
  if (statusOf(s, id) === 'dead') return no('dead');
  if (activeEncounterElsewhere(s, id)) return no('fighting_elsewhere');   // vorhandener Encounter-Zustand
  const m = s.party?.members?.[id];
  if (m?.mode === 'wait' && m.at && m.at !== s.scene.at) return no('waiting_elsewhere'); // vorhandene Partydaten
  return yes();   // kein Textbeleg, keine Entfernung, kein Siedlungsvergleich
}
```

  Eine echte eigene Entscheidung eines wartenden Begleiters läuft über die vorhandenen Party-Wege (P7, `leave`) und den Rückkehrpfad aus .250, nicht über `enter`.
- **Was entfällt:** siehe R.4. Dazu `absentKnown` als Sonderweg und die Prompt-Zugeständnisse an den Parser.
- **Bleibt:** Lebensstatus, bindende Zustände, Identität per Katalog-ID ohne Fuzzy-Zuordnung, die bestehende Abhängigkeit von einer bestätigten Ankunft (eine Begegnung nach verweigerter Ankunft bleibt verworfen, § 4.5), Erst-Einführung über `person.new` mit vorhandenen Kontinuitätsregeln.
- **Negativfälle, wer sie trägt:**

| Fall | Zuständig |
|---|---|
| tot · kämpft anderswo · wartet anderswo | Engine-Zustand |
| nur erwähnt · erinnert · hypothetisch · gegangen · leerer Stand | X meldet kein `enter` (semantische Aufgabe, T2 misst sie) |
| Verwechslung gleicher Rolle | X wählt die ID aus dem Katalog. Der Katalog zeigt unterscheidende Merkmale (vorhanden). |
| erfundene Spielerhandlung | nicht Präsenz, sondern GO-Firewall und Overreach (unverändert) |

- **Bewusst akzeptiertes Restrisiko.** In der Serie hat der Satzparser genau einen echten X-Fehler gefangen (Garrick, x-233). Nach P1 wäre Garrick dort als anwesend gebucht worden. Die Folge wäre eine im nächsten Zug erzählerisch korrigierbare Szene ohne Geld- oder Besitzwirkung, weil Handel und Zahlung weiterhin eine explizite Spieleraktion verlangen. Dem stehen 20 klar falsche Ablehnungen gegenüber. Das entspricht GPTs Grundsatz, einen seltenen korrigierbaren NPC-Erzählfehler hinzunehmen.
- **Warum kein Zitatgate** (R.3): Ein wörtlicher Auszug prüft nur, dass Text existiert, nicht was er bedeutet. „Her stall stood empty“ besteht ihn ebenso wie eine echte Begegnung.
- **Auswirkungen.** Handel, Wissen, Party-Wiedersehen und Desk funktionieren nach korrekter Erzählung. Keine Präsenz-Reparaturen mehr, ein X-Vertragsfeld weniger. Codeumfang: ≈ 390 Zeilen in narration_evidence.js (R.4, einschließlich der Desk-Teile aus P8), dazu drei Präsenzpfade in world.js.
- **Migration.** Alte Events falten unverändert. Neu erzeugte Antworten nutzen `enter`. Eine alte `met`-Liste in einem regenerierten Zug wird wie `enter` gelesen, es entsteht keine neue Ablehnungsquelle.

### P2 · Ablehnungskaskade [zurückgezogen]

Die bestehende Regel bleibt (Begründung § 4.5). Es entsteht keine neue Abhängigkeitseinteilung. Ihr Nutzen ergibt sich aus P5 und P10.

### P3 · Teilübernahme gültiger Deltas [präzisiert]

- **Regel:** Ein ungültiges Delta wird verworfen und protokolliert, die übrigen bleiben. Eine bezahlte Reparatur gibt es **nur**, wenn ohne sie eine **gebuchte Spieleraktion** offen bliebe. Das betrifft einen fehlenden oder ungültigen expected-Schlüssel (`approach`, `activity`, `take`, `buy`, `pay`, `sell`, `desk`) oder ein fehlendes bzw. ungültiges `arrive` für einen autorisierten GO, sofern die Antwort eine Ankunft erzählt.
- **Abhängige Deltas** scheitern an den vorhandenen Mechanismen (unbekannte `{new: name}`-Referenz, `depends_on`, `blockedPeople`/`blockedCreatures`, `quest_dependency`). Es gibt keinen neuen Abhängigkeitsgraphen.
- **Ein Commit:** Die Kandidatenwahl in `runExtraction` bleibt, gebucht wird einmal über `applyExtraction` unter der bestehenden Revisions- und Save-Sicherung. Kein Teilcommit vor einer Reparatur (GPT).
- **Entfällt:** die semantischen Repair-Trigger ohne gebuchte Spieleraktion (R.4).
- **Abnahme:** ungültiges `fact` neben gültigem `arrive` und Mahlzeitangebot (alles Gültige gebucht, keine Reparatur). Ungültiges `object.new` mit abhängigem `object.move` (beide verworfen). Fehlendes `buy`-Ergebnis bei gebuchtem Kauf (Reparatur). Reparatur mit geänderten Deltas. Reload, Swipe und Retry ohne Doppelbuchung. Die erwartete Reparaturentlastung ist eine **Hypothese**, gemessen wird sie an den archivierten Reparaturfällen.

### P4 · Eine Ankunftsquelle, Szene nur bei Abweichung [präzisiert, erweitert]

- **Vertrag:** Das `arrive`-Delta ist die einzige Ankunftsmeldung. `expected.go` (inkl. `arrived`, `at`, `with`, `met`) entfällt im X-Vertrag. Die Engine leitet die interne Antwort je GO-Schritt über das vorhandene `goStepAt` aus den `arrive`-Deltas ab. Kein `arrive` für einen Schritt bedeutet „nicht angekommen“, wie heute schon die Folge eines fehlenden Schlüssels.
- **Chronologie:** Ohne `scene` gehört ein Delta zum Ort des letzten vorangehenden angenommenen `arrive`, sonst zum Ausgangsort. Ein ausdrückliches `scene` ist nur nötig für Fernsichtungen (`present:false`) oder bei Abweichung. Mehrere Etappen, Rückkehr zum Ausgangsort und PULSE-Halt sind jeweils eigene `arrive`-Deltas mit eigenem `at`. Die vorhandenen `allowedArrival`- und Halt-Regeln entscheiden über ihre Zulässigkeit.
- **Risiko:** Falsch sortierte Deltas landen am falschen Abschnitt, statt eine Reparatur auszulösen. Gegenmittel: Ortsfelder wie `person.new.at` haben Vorrang. T2 misst das.
- **Entfällt:** `sceneIssues` als Reparaturgrund, die TRAVEL-CHRONOLOGY-Promptregeln, die Dreifachmeldung.

### P5 · Ortswechsel: zwei Fälle getrennt [geändert]

**Fall A – ein GO-Befehl ist vorhanden, aber falsch klassifiziert** (Lantern-Spielerzüge M80/M82; Linden M78 ist derselbe Typ, wird aber bereits von der Zimmerregel aus .247 abgedeckt).

- Der Planner hat Absicht und Ziel bereits verstanden (`to: {scene: "the common room of The Slaked Lime, where Madge is"}`). Die Engine gleicht **dieses Ziel** mit den vorhandenen Mitteln ab: `resolvePlaceRef(s, {new: focus})` auf bekannte erreichbare Orte und die Namensregel aus `chosenKnownRoute` („… of the <Ort>“, bekannte Person → ihr Ort), aber ohne deren Satz-Regex über den Spielertext.
- Eindeutiger Treffer → GO zu diesem Ort. Mehrdeutig → vorhandene Klärung. **Kein Treffer → die Klassifikation des Planners bleibt.** Ein unbekannter Tresen bleibt ein lokaler Standpunkt, ein unbekanntes Ziel `{new}` bleibt die bestehende GO-Prüfung (GPT-Einwand berücksichtigt).
- Entfällt: der Satzteil von `chosenKnownRoute`. Die Zimmer-Regel aus .247 bleibt vorerst (sie bindet an die gebuchte Unterkunft).
- Gewinn: weniger Satzbauabhängigkeit (§ 4.4) bei gleichem Schutz. User16-Grenzen (Tor ist nicht innen, Annäherung ist kein Eintritt) bleiben unverändert in den GO-Regeln.

**Fall B – kein GO-Befehl** (Rook-Spielerzug M8 und Hearth M84 mit leerem Plan; Rook M16 mit `{scene}` für einen nie erreichten Markt ist ähnlich, weil das Ortsbuch ihn nicht kennt).

- **Keine Engine-Regel kann einen fehlenden Bewegungsauftrag ohne erneuten Phrasenparser rekonstruieren** (GPT berechtigt, meine Stand-1-Abnahme „unveränderte leere P-Antwort → GO“ war falsch). Die semantische Entscheidung bleibt beim Planner.
- Empfehlung 1, Vertrag: den widersprüchlichen Auftrag in [turn.js L103](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/turn.js#L103) korrigieren. Aus „narrate what he says and does“ wird sinngemäß „… ; no journey to another place was booked this turn: he ends this reply at WHERE (moving about within this scene is fine)“. Das ist keine neue Prüfung, sondern die Angleichung an die geltende Kanonregel, dass eine erzählte Ankunft allein keine Buchung ist. Der Planner-Fehler wird dadurch sichtbar statt still. Der Spieler kann umformulieren oder die Ortswahl im HUD nutzen. Für das Spielgefühl ist das ein Tausch, siehe D4.
- Empfehlung 2, Messung: GO-Erkennung des Planners je Modellroute in T2. Bei Martin und Rook lieferte dasselbe Modell bei Temperatur 0,1 für denselben Text einmal GO und einmal nichts. Nur eine Messung zeigt, ob Prompt-Verschlankung oder Modellwahl hilft.
- **Nicht:** neue Phrasenauslöser. `explicitJourneyClause` bleibt eingefroren und wird nicht erweitert.

### P6 · Agency [geändert]

- **Kein `mode`-Feld** (Begründung R.3). Der Guard bleibt in .251-Form, eingefroren: keine neuen Anrede- oder Phrasenausnahmen.
- GPTs Einwand zu `COMMITMENTS` ist berechtigt. Reise, Rast und Schlaf, Aufnehmen und Party-Auflösung haben echte Wirkung. Die Sprachregeln des Guards gelten heute ohnehin für alle Befehlstypen, nur `no_evidence` ist auf `COMMITMENTS` begrenzt. Es entsteht also keine neue Schutzlücke.
- **Entscheidung per Messung (T2):** echte Planner-Antworten auf einen Negativkorpus (Frage, Plan, Negation, fremde Handlung, Erinnerung, bedingte Kombination) und einen Positivkorpus (Anreden, indirekte Formulierungen). Erzeugt der Planner bei einer Route praktisch keine falschen Befehle, entfallen die Sprachregeln. Fängt eine Regel echte Fehler mit Wirkung, bleibt genau diese. Schwerwiegende Fehlbuchungen werden dabei nicht mit Durchschnittsraten verrechnet (GPT).
- Native und HUD-Aktionen bleiben bereits gewählte Aktionen.

### P7 · Party: NPC-Initiative erhalten, Rückübersetzung entfernen [präzisiert]

- **X meldet weiterhin:** `party offer` eines NPC (eigene Initiative zur Zusammenarbeit) und `leave` bzw. Ablehnung weiterer Zusammenarbeit durch ein Mitglied.
- **Engine:** Ein NPC-Angebot wird ohne Sprecherparser als offenes Angebot gespeichert. Zustandsprüfung: NPC bekannt, lebt, anwesend, noch kein Mitglied. Die Annahme bleibt Spielerentscheidung (Planner, HUD, `#party`). Bedingungen wie Lohn oder Anteil stehen sichtbar auf dem Angebot, mit den vorhandenen Geld- und Besitzgrenzen. `leave` eines Mitglieds wird über die vorhandene Party-Logik gebucht.
- **Entfällt im X-Vertrag:** `accept`, `follow`, `wait`, `coordinate`. Das entscheiden die strukturierte `party_decision` (.236 ff.) und die nativen Organisationsaktionen. Ebenso entfällt `evidenceOf`/`unchangedAnswer` für X-Meldungen.
- Gesprächsinhalt wie Beuteaufteilung oder Taktik ohne Angebot bleibt `fact`/`thread`. Das betrifft die Fälle Cypress M69 und Vale M35, die heute als Party-Deltas abgelehnt werden.

### P8 · Desk-Zeuge [geändert, GPT-Fassung]

Vorhandene `deskHandlers`-Bindungen bleiben: Der Schritt ist gelungen, das Engine-Faktum existiert, der Mitarbeiter ist lebendig, anwesend und gehört zur Gilde. Nur die Sprachprüfung entfällt. Ist genau ein Gildenmitarbeiter der Halle anwesend, erhält er das Wissen. Bei mehreren gilt die vorhandene X-ID `handled_by` ohne grammatische Prüfung. Ohne eindeutige Zuordnung wird kein persönliches Bearbeitungswissen gebucht, die Gildenbuchung selbst bleibt gültig.

### P9 · Preise [geändert]

- **P9a:** Das vorhandene Feld `pricing.currency_quote` ist genau für eine Zahl ohne eigenes Münzwort gedacht ([finance_evidence.js L189–200](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/finance_evidence.js#L189)). Heute muss das Münzwort im eigenen Satz oder im eigenen `said`-Bereich stehen. Bei Martin M11 lieferte X `null`, und „silver“ stand im Satz davor. Vorschlag: Der Suchbereich von `currency_quote` umfasst die **ganze Antwort**, bei unveränderter Pflicht zu genau einer Münzart im Auszug. Die numerische Prüfung von `price_cp` bleibt. Der X-Vertrag wird um einen Satz ergänzt, dass bei einer Zahl ohne Münzwort `currency_quote` gefüllt wird.
- Gegenbeispiele (zwei Währungen, anderer Sprecher, andere Position) bleiben die semantische Aufgabe von X. Die Bindung entsteht weiterhin erst durch die explizite Annahme mit sichtbarem Preis, `max_cp` und Guthabenprüfung.
- **P9b** (nur `price_cp` und HUD-Karte als Bindung): weiterhin eine Kanonfrage. Ich empfehle, sie vorerst **nicht** zu ändern. P9a reicht für die beobachteten Fälle.

### P10 · Rückmeldung nur bei verbleibender Abweichung [präzisiert]

Die vorhandenen `corrections` werden aus dem bestätigten Zustand abgeleitet und auf drei Fälle konzentriert: Alaric ist nicht dort, wo erzählt; eine im Gespräch befindliche benannte Person ist nicht in der Szene; ein erzählter Kauf oder eine Zahlung ist nicht gebucht. Eine Abweichung, die inzwischen behoben ist, erzeugt keine Warnung mehr. Verworfene optionale Details landen nur im Audit. Es entsteht keine neue Reparaturpflicht.

### Nicht empfohlen [beibehalten, ergänzt]

Fuzzy-Matching für IDs, Beträge und Ziele. Key-Value statt JSON. Generelles Vertrauen in erzählte Ankünfte (.208 C). Weitere Wörter in `HERE_DOES`/`DEPICTED` und vergleichbaren Listen. Standardanwesenheit von Ladeninhabern ohne Erzählung. Neue Pflichtfelder (`seen`, `mode`) als Ersatz für entfernte Prüfungen. Zusätzliche Modellaufrufe nur zur Validierung.

---

## 7. Vergleich der Architekturvarianten [beibehalten]

| Variante | Urteil |
|---|---|
| V0 Status quo + Einzelfixes | nein |
| **V1 „Claim + State“ innerhalb P/N/X** | **empfohlen** (GPT einverstanden) |
| V2 Narrator + Extractor in einem Call | später als Experiment, nach V1 |
| V3 deterministische NPC-Tagesabläufe | nein (Kanon § 10) |
| V4 Planner abschaffen | nein (Spielerhoheit, .208) |
| V5 mehr native Aktionen | ergänzend, keine Pflichtmenüs |

---

## 8. Auswirkungen [präzisiert, ausdrücklich Hypothesen]

| Bereich | Erwartete Wirkung |
|---|---|
| Natürliches Rollenspiel | Rückkehr zu Händlern, Wirtsleuten, Schaltern und Gefährten wird unabhängig vom Satzbau gebucht (P1). Fehlklassifizierte vorhandene GO-Befehle werden über das Ortsbuch gerettet (P5-A). Ein fehlender GO wird sichtbar statt still (P5-B). |
| Reparaturen und Wartezeit | weniger Reparaturen durch P3/P4 (Ausgang: 66 von 223 Antworten, ≈ 23,5 % der X-Inputtokens). Das Ausmaß wird an archivierten Erstantworten gemessen, nicht vorab versprochen. |
| Prompts | Der X-Vertrag verliert `expected.go`/`met`, die Chronologie-Pflichten, vier Party-Akte und die Parser-Zitatregeln. Messung an tatsächlich gesendeten Requests (GPT). |
| Modellabhängigkeit | Formdetails fallen weg. Die semantische Last (wer ist hier, wohin geht er) liegt dort, wo sie heute schon liegt, beim Modell, und wird in T2 gemessen. |
| Code | Entfernt: Präsenz-, Desk- und Party-Parser sowie der `chosenKnownRoute`-Satzteil. Neu: eine kleine Aufnahmefunktion und ein Ortsbuchabgleich des Planner-Ziels mit vorhandenen Funktionen. |

---

## 9. Teststrategie T1–T3 (Stand 2) [präzisiert nach GPT]

**Ausgangsbefund [präzisiert].** Es gibt positive Rot/Grün-Originalgegenproben und natürliche Kampagnenabnahmen. Es fehlt eine systematische, vergleichbare Messung der Annahme- und Ablehnungsqualität. Die vorhandenen `met`-Tests (`npc_e2a170.test.js`) prüfen 5 parsergerechte Positive und 10 Negative. Der Replay ist ein exakter Schnappschuss gegen .126 (21.567 Erwartungseinträge in 38 Dateien, 1.386 akzeptierte Abweichungen).

**T1 – harte Invarianten (müssen grün bleiben).** Fold, keine Doppelbuchung, Eigentum, Kampf, HP/MP/STA, XP, Skills, Questabrechnung, Autorisierung, geschützte Reise- und Dungeonübergänge, revisionsgebundene Speicherung. Wird eine alte Prüfung entfernt, wandert ihr gewünschter Schutz als Test an die neue zuständige Stelle. Der Fall „tote Verkäuferin“ wird zum Zustandstest statt zum Satztest.

**T2 – Semantik, in zwei getrennten Abnahmen.**

| Teil | Was | Kosten |
|---|---|---|
| T2-Engine | eingespeiste strukturierte Positiv-, Negativ- und Unklarfälle: Führt die Engine die Regeln kanalübergreifend aus? (P1 alle Kanäle, P3 Teilübernahme, P4 Chronologie, P5-A Zielabgleich, P7 NPC-Angebot, P8, P9a) | offline |
| T2-Modell | feste Spieler-, Prosa- und Weltkontexte, echte P-/X-Antworten auf .251 und Kandidat je Modellroute. Erfasst werden richtige Zuordnung, falsche Ablehnung, falsche Zulassung, fehlende Meldung, unklare Identität und Folgeeffekt, getrennt. Dazu gehören Varianten, die **nicht** als Muster im Prompt stehen. | bezahlt, eigene Freigabe |

Bewertungsregeln und Stichprobe werden **vor** der Messung festgelegt. Es gibt kein „100 %“-Gate. Für falsche mechanische Buchungen gelten strengere Konsequenzen als für Erzählfehler. Korpora: Anwesenheit (24 Originalzitate mit Labels, § 4.3-Sätze, gleiche Rolle anderswo, tot, wartend), Bewegung (§ 4.4-Sätze, Lantern/Rook/Linden/Hearth, Fragen, Pläne, Tor-Fälle), Agency (P6), Party-Angebote, Preisellipse.

**T3 – Replay als vollständiger Differenzdetektor.** Die alte Referenz und die bisherigen akzeptierten Unterschiede bleiben verfügbar. Jede Abweichung wird einer von vier Kategorien zugeordnet (GPT): **beabsichtigte semantische Verbesserung** · **erwartete Darstellungs- oder Protokolländerung** · **mechanische Wirkung** · **ungeklärt**. Triviale Änderungen erhalten eine Sammelbegründung, mechanische Wirkung braucht eine Einzelfreigabe, ungeklärte Fälle blockieren. „Mehr übernommen“ ist nicht automatisch harmlos, ein falsches Wissen ist eine Wirkung. Neue Erwartungen werden dokumentiert, Fingerprints nicht automatisch umgeschrieben. Ein normalisierter Vergleich trennt reine Schemaänderungen vom Ergebniszustand.

**Erwartungen, die sich fachlich umkehren:** `met`-Ablehnungen natürlicher Positivsätze, Party-Sprechertests für X-Meldungen auf dem Standardpfad, Reparaturerwartungen für Fehler außerhalb gebuchter Spieleraktionen, Chronologie-Reparaturen und Desk-Zeugen-Satztests.

---

## 10. Zielarchitektur [präzisiert]

```
Spieler ── Freitext ──► P  (Absicht strukturiert wie heute: Typ, Ziel, needs)
        └─ HUD/native ──────────────────────────────┐
                                                    ▼
                    ENGINE: Planner-Ziel ↔ Ortsbuch (P5-A) · Autorisierung · Kampf · Geld · Zeit · PULSE
                            strukturierte NPC-Entscheidung bei offener sozialer Frage
                                                    ▼
                    N  (Prosa; widerspruchsfreier Rahmen bei Zügen ohne Reise, P5-B)
                                                    ▼
                    X  (arrive · enter · übliche Deltas; keine Parser-Zitate, keine Dreifachmeldung)
                                                    ▼
                    WORLD je Delta: Zuständigkeit · Zustand · Identität · vorhandene Abhängigkeiten
                                    keine englische Satzanalyse im Standardpfad (Ausnahmen § 5 Nr. 10, 25)
                                                    ▼
                    Events → Fold → HUD · kompakte Rückmeldung bei verbleibender Abweichung (P10)
```

| Frage | entscheidet |
|---|---|
| Was will der Spieler? | Planner, bei Routine das HUD |
| Darf und kann es jetzt passieren? | Engine (Zustand, Regeln, Ortsbuch) |
| Wie klingt es? | Narrator |
| Was zeigte die Prosa an der Welt? | Extractor |
| Ist das mit dem Zustand vereinbar? | Engine |
| Bindet es Alaric? | Spieler (Planner-Befehl, HUD-Annahme, native Aktion) |

---

## 11. Konsistenter Entwicklungsplan für Codex (Stand 2)

Ein zusammenhängender Auftrag in überprüfbaren Teilpaketen nach Projektarbeitsweise. Codex darf technisch anders schneiden. Bezahlte Modelltests gibt es erst nach Offline-Abnahme und eigener Freigabe. Vom freigegebenen Dollar verbleiben 0,747428006 USD [Bericht]. Daraus folgt kein Auftrag.

| Etappe | Inhalt | Entfernt | Neu | Abnahme (Rot auf .251 → Grün auf Kandidat, plus Negative) |
|---|---|---|---|---|
| **0 · Messgrundlage** | T2-Engine-Korpora anlegen. T3-Kategorisierung im Replay-Werkzeug. Ausgangswerte auf .251 mit Request-/Record-Identität (Methode `recount_v2.py`). | – | Testwerkzeuge | Bericht der Ausgangswerte, keine Produktlogik |
| **A · Anwesenheit und Rückmeldung** | P1, P10 | `met`-Kanal, Präsenzparser, `absentKnown`-Sonderweg, Prompt-Zugeständnisse | `admitPresence` | Die 20 klaren Originalzitate führen über eingespeiste `enter` zur Anwesenheit. Martin M17 + Folgekauf aus ihrem Angebot buchbar. Elm ohne Doppelbuchung. Tot, kämpfend anderswo, wartend anderswo bleiben abgewiesen. Garrick-Fall als dokumentiertes Restrisiko. T1 grün. |
| **B · Extractorvertrag** | P3, P4 | Repair-Trigger ohne gebuchte Spieleraktion, `sceneIssues` als Reparaturgrund, `expected.go` | Reparaturbedingung „gebuchte Spieleraktion offen“ | archivierte Reparaturfälle: Erstantwort lokal übernommen, wo nur andere Fehler vorlagen (Zählung). Negative wie in P3. Mehretappen-, Rückkehr- und PULSE-Halt-Fälle korrekt zugeordnet. Kein Teilcommit, Reload/Swipe ohne Doppelbuchung. |
| **C · Ortswechsel** | P5-A, P5-B-Vertragssatz | `chosenKnownRoute`-Satz-Regex | Zielabgleich des Planner-`to` mit Ortsbuch (vorhandene Funktionen) | Lantern-Spielerzüge M80/M82 mit Original-P → GO über P5-A. Linden M78 weiterhin über die beibehaltene Zimmerregel. Die § 4.4-Varianten mit `{scene}`- oder `{new}`-Ziel → GO zum bekannten Ort. Unbekannter Standpunkt bleibt Approach. User16/Flint-Grenzen unverändert. Rook M8 / Hearth M84 (leerer Plan): ehrlich als Fall B gekennzeichnet, Narrator hält Alaric am Ort (eingespeiste Antworten). ST-Smoke wegen Vertragsänderung. |
| **D · Gewachsene Altpfade** | P7, P8, P9a | Party-Sprecherparser für X, X-Akte `accept`/`follow`/`wait`/`coordinate`, Desk-Satzprüfung, Satzbegrenzung von `currency_quote` | – | Partyabnahmen .236–.250 grün. NPC-Angebot (Vale M25) als offenes Angebot. Desk mit einem bzw. mehreren Mitarbeitern. Martin M11 mit gefülltem `currency_quote` bepreist, zwei Währungen bleiben unbepreist. |
| **E · Gesamtabnahme** | T1, T2-Engine, T3-Bericht mit **einmaliger** dokumentierter Neubewertung, isolierte ST-Abnahme | – | – | Kategorienbericht ohne ungeklärte mechanische Änderung |
| **F · nach Freigabe** | T2-Modell je Route (Anwesenheit, GO-Erkennung, Agency-Negative), danach Entscheidung zu P6 und zu den eingefrorenen Phrasenauslösern | ggf. Guard-Sprachregeln, `explicitJourneyClause` | – | vorab festgelegte Bewertungsregeln |

**Nicht in diesem Plan:** V2, Prompt-Großoptimierung außerhalb der entfernten Regeln, Zerlegung von `applyWorld` über das hinaus, was beim Entfernen ohnehin entsteht, Bereinigung von Ruleset-1-Zweigen, die weiteren `narratedEvent`-Nutzer.

---

## 12. Abschließende Bewertung D1–D9

| # | Frage | Stand 1 | GPT | **Claude, Stand 2** |
|---|---|---|---|---|
| D1 | Anwesenheit ohne grammatischen Beweis? | ja, mit `seen` + Zitat | ja, eindeutiger Typ genügt | **Ja. `enter` allein, kein neues Feld, kein Textgate.** Restrisiko Garrick-Typ akzeptiert. |
| D2 | Ankunft aus anderer Siedlung? | `arrives` genügt | ja, wenige echte Zustandsgrenzen | **Ja. Keine Entfernungs- oder Reisezeitprüfung.** Nur tot, Kampf anderswo, wartendes Mitglied anderswo. |
| D3 | Unabhängige Deltas nach verweigerter Ankunft übernehmen? | ja | ja, ohne neue Bürokratie | **Geändert: bestehende Regel beibehalten.** Die verworfenen Deltas waren abhängig (§ 4.5). |
| D4 | Ortsklassifikation | Engine klassifiziert | Planner Absicht, Engine Identität | **Ja, in GPTs Aufteilung.** Fall A: Engine gleicht das Planner-Ziel mit dem Ortsbuch ab. Fall B: Narratorrahmen „bleibt am Ort“ und Messung. **Nutzerentscheidung nötig:** ob ein verfehlter Reisewunsch künftig sichtbar am Ort bleibt (konsistent) statt erzählt, aber nicht gebucht (heute). Ich empfehle sichtbar. |
| D5 | Agency | `mode`, Regeln entfernen | `mode` bevorzugt | **Abweichend: kein `mode`.** Guard einfrieren, T2 entscheidet. |
| D6 | Preis | P9a Satzregel, P9b offen | P9a ohne neue Regel, P9b offen | **P9a über vorhandenes `currency_quote` mit erweitertem Suchbereich. P9b: Kanon vorerst beibehalten.** |
| D7 | Re-Baseline | ja | ja, mit Kategorien | **Ja, einmalig in Etappe E, vier Kategorien, T1 als harte Grenze.** |
| D8 | NPC-Austritt per X | ja | ja + NPC-Angebote | **Ja, dazu NPC-Angebote** (P7). |
| D9 | erzwungene Verlagerung streng | ja | ja | **Ja.** |

---

## 13. Zusätzliche unabhängige Befunde [präzisiert nach GPT]

1. **`applyWorld` (≈ 3.700 Zeilen, über 60 Ablehnungsregeln).** Kein eigener Umbau. Beim Entfernen der Präsenz-, Desk- und Party-Pfade entstehen kleinere gemeinsame Handler von selbst. Ein kosmetischer Split bringt wenig.
2. **Überblick statt Register.** Ein kompakter Überblick der *verbleibenden* zentralen Autoritäten (Zweck, Schutzziel, Gegenprobe) genügt. Kein Register je Kleinregel.
3. **Promptgrößen** (Martin, Zug 5: Planner-System ≈ 47 KB, Narrator ≈ 54 KB, Extractor ≈ 62 KB). Nur die zu entfernten Prüfungen gehörenden Promptregeln entfernen und an tatsächlich gesendeten Requests messen.
4. **Altpfade** (`cPath` 80, Ruleset-Zweige 42 in `world.js`): später separat und erst nach T3. Keine Kompatibilitätsschicht für historische Sprachparser.
5. **Divergenzmonitor** nur als Testdiagnose, nicht als produktives Gate.
6. **Wartezeit nach der Prosa** 4–7 s in Martin (`extraction_validation_wait_ms`), bei Reparaturen mehr. Das bestätigt den Nutzen von P3/P4.
7. **Neu: `chosenKnownRoute` ist selbst ein Satzparser** (§ 4.4). Die in .245 eingeführte engineseitige Rettung hängt am Satzbau. P5-A verlagert sie auf das bereits extrahierte Planner-Ziel.

---

## Anhang A · Reproduktion

Alle Skripte in [claude_251_analyse/](claude_251_analyse/) lesen nur. Die Engine-Proben benötigen einen Checkout von `4933a5f0`:

```bash
git worktree add --detach ../avereth-251 4933a5f005a86a381a922981d3d7377e8ba84b5c
```

```bash
python3 -I recherche/claude_251_analyse/recount_v2.py testrun_10b
```

```bash
node recherche/claude_251_analyse/probe_known_route.mjs ../avereth-251/avereth-engine
```

```bash
node recherche/claude_251_analyse/probe_presence.mjs ../avereth-251/avereth-engine
```

```bash
node recherche/claude_251_analyse/probe_depicted.mjs ../avereth-251/avereth-engine
```

```bash
node recherche/claude_251_analyse/probe_journey.mjs ../avereth-251/avereth-engine
```

`tally_runs.py`, `met_quotes.py` und `repair_triggers.py` bleiben unverändert als Reproduktion von Stand 1. Ihre Auswahlregel („letzte N Narrator-Antworten“) ist durch `recount_v2.py` ersetzt. Ergebnisse: [Stand 1](claude_251_analyse/ERGEBNISSE.txt) · [Stand 2](claude_251_analyse/ERGEBNISSE_STAND2.txt).

## Anhang B · Quellen

[Diskussionsgrundlage](AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) · [GPT-Gegenreview](AVERETH_251_GPT_GEGENREVIEW_CLAUDE_VALIDIERUNGSARCHITEKTUR.md) · [Stand 1 dieses Berichts](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/13fa3587dca3b417a4d39822ddd25bbe2e3e7cfd/recherche/AVERETH_251_CLAUDE_VALIDIERUNGSARCHITEKTUR_ANALYSE_UND_PLAN.md) · [Arbeitsweise](../01_ARBEITSWEISE_GPT_CODEX.md) · [Kanon](../02_DESIGN_KANON.md) · [Projektstand](../03_AKTUELLER_PROJEKTSTAND.md) · [.245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md) · [.235 Party-Gegenreview](AVERETH_235_PARTY_GEGENREVIEW_UND_ENTSCHEIDUNGSVORLAGE.md) · [.222–.235 Serie](AVERETH_222_235_OPENROUTER_SPIELTESTSERIE.md) · [.208 Firewallvergleich](USER11_208_FIREWALLVERGLEICH.md) · [User16-Entscheidungsvorlage](AVERETH_USER16_ORTS_UND_SZENENARCHITEKTUR_ENTSCHEIDUNGSVORLAGE.md) · Originalarchive [Martin](../testrun_10b/openrouter-20261127-martin-251/), [Reed](../testrun_10b/openrouter-20261127-reed-251/), [Elm](../testrun_10b/openrouter-20261127-elm-250/), [Lantern](../testrun_10b/openrouter-20261127-lantern-244/), [Hearth](../testrun_10b/openrouter-20261127-hearth-243/), [Rook](../testrun_10b/openrouter-20261127-rook-250/), [AI](../testrun_10b/openrouter-20261127-ai-235/), [AJ](../testrun_10b/openrouter-20261127-aj-235/), [Hazel](../testrun_10b/openrouter-20261127-hazel-248/), [x-233](../testrun_10b/openrouter-20261127-x-233/) sowie alle übrigen `openrouter-20261127-*` für die Zählung. Produktdateien auf [`4933a5f0`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src).
