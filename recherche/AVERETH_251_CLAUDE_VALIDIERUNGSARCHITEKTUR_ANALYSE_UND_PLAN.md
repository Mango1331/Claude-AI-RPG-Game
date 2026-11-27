# Avereth .251 – Unabhängige Analyse der Validierungsarchitektur und Entwicklungsplan

**27.11.2026 · Claude (unabhängige Code- und Architekturanalyse, keine Implementierung).** Dieser Bericht ist eine Entscheidungsgrundlage für Nutzer und GPT. Er ändert weder Produkt, Tests, Kanon noch den Entwicklungsbranch. Alle Empfehlungen sind Vorschläge.

| Bezug | Referenz |
|---|---|
| Untersuchtes Produkt | Build `4.3.0-c.6.6.251` · [`4933a5f0`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4933a5f005a86a381a922981d3d7377e8ba84b5c) auf `experiment/211-openrouter-helper-single-runner` (Remote-HEAD vor Beginn und vor Veröffentlichung geprüft, unverändert) |
| Dokumentationsstand bei Beginn | `main` [`69594b82`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/69594b8205bbc0482b68c93ed21e970bb094018a) |
| Diskussionsgrundlage | [AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md](AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) |
| Reproduktion | [claude_251_analyse/](claude_251_analyse/) – Offline-Proben und Auswertungsskripte, [Ergebnisprotokoll](claude_251_analyse/ERGEBNISSE.txt) |

**Kennzeichnung der Aussagen.** **[geprüft]** = von mir am Code oder an Originalarchiven selbst nachvollzogen. **[Bericht]** = aus früheren Untersuchungen übernommen, nicht erneut vollständig geprüft. **[Hypothese]** = eigene Einschätzung, die erst eine spätere Messung bestätigen kann.

**Methodik in einem Satz.** Ich habe die Verarbeitungskette an den tatsächlichen Aufrufstellen verfolgt, die realen P/N/X-Requests eines Laufs gelesen, die Ablehnungen und Reparaturen der gesamten Modellserie `openrouter-20261127-*` (59 Arme mit bezahlten Antworten, 217 bezahlte Narrator-Antworten, jede genau einmal gezählt) ausgewertet und die Produktfunktionen isoliert mit positiven und negativen Formulierungen aufgerufen. Kein bezahlter Modellrequest, kein ST-Profil berührt.

---

## 0. Kurzfassung

1. **Die P/N/X-Architektur ist im Kern richtig und sollte bleiben.** Spielerabsicht muss vor der Erzählung autorisiert werden. Kampf, Geld, Besitz, Zeit und Reiseabschnitte brauchen deterministische Engine-Autorität. Ein Umbau zu „die Erzählung ist die Wahrheit“ ist durch frühere Negativproben ([.208, Variante C: 3 von 5 nicht gewählten Reisen akzeptiert](USER11_208_FIREWALLVERGLEICH.md)) zu Recht verworfen worden.
2. **Das eigentliche Problem ist ein vierter, unsichtbarer Interpret.** Nach Planner, Narrator und Extractor liest deterministischer JavaScript-Code das Englisch des Spielers und des Narrators erneut und entscheidet über Verb-Whitelists, Wortlisten und Satzstellungsregeln. Das geschieht an mindestens neun Stellen (§ 3.1). Diese Schicht ist weder ein zuverlässiger Schutz noch ein zuverlässiger Leser.
3. **Belegt am Beispiel Anwesenheit [geprüft].** In der Serie wurden 24 `met`-Meldungen mit `met_evidence` verworfen. 23 davon zeigen beim Lesen die Person eindeutig anwesend („The clerk was still at the long counter, bent over her ledger“). Nur eine Ablehnung war richtig. In 9 der 23 Fälle blieb der gespeicherte Zustand hinter der Erzählung zurück.
4. **Die strenge Prüfung schützt nicht einmal konsistent [geprüft].** Dieselbe Tatsache „bekannte Person ist hier“ kann über vier Kanäle gemeldet werden (`expected.go.met`, `enter`, `aware`, `position`). Je nach Kanal gilt eine strenge Satzanalyse, eine lockere Satzsuche oder **gar keine Prüfung**. Die Lederarbeiterin wäre mit einer `aware`-Meldung ohne jede Sprachprüfung eingetreten. Der Schutz „leerer Stand bleibt leer“ hängt also davon ab, welchen Kanal das Modell zufällig wählt.
5. **Widersprüchlicher Vertrag [geprüft].** Der Narrator erhält „whoever works there is at work unless the story establishes otherwise“. Die Engine verlangt anschließend einen grammatischen Beweis der Anwesenheit. Narrator und Engine arbeiten mit umgekehrter Beweislast.
6. **Die spielrelevantesten Fehler entstehen vor der Narration [geprüft].** Von 13 `no_go`-Ablehnungen der Stichprobe hatte der Spieler in etwa 8 Fällen eindeutig eine Bewegung gewählt. Planner-Klassifikation (`{scene}` statt Ortswechsel), leerer Plan oder ein Regex-Drop im Agency-Guard verhinderten die Autorisierung. Der Narrator folgte trotzdem dem Spielertext. Danach verwarf die Engine über mehrere Züge auch ortsunabhängige Meldungen (`scene_context`, 50 Ablehnungen, überwiegend Folgeschäden).
7. **Der Extractor ist teuer, weil die Engine ihm Buchhaltung aufbürdet [geprüft].** 59 von 217 Antworten (27 %) brauchten eine bezahlte Reparatur, ≈ 22 % der Extractor-Inputtokens. Häufigster Anlass (23 von 67 Reparaturrequests) ist die Pflicht, jedem Delta vor einer Ankunft eine eigene Szene zuzuordnen. Ein einziges fehlerhaftes Delta macht die gesamte Antwort ungültig.
8. **Die Mini-Fix-Schleife ist im Code direkt sichtbar [geprüft].** Der .251-Fix `explicitJourneyClause` erkennt genau „town's …“ und „the way I came“. „I return to the market.“ erkennt er nicht. Ähnlich: Schlüsselwortlisten werten „his sword drawn“, „carving the roast“ und „drawing water“ als Bild, „his bowl half gone“ als Abwesenheit.
9. **Meine Empfehlung: gezielte strukturelle Vereinfachung statt Neubau.** Kernprinzip: **Bedeutung entscheidet das Sprachmodell in strukturierter Form, Zustand entscheidet die Engine, Verpflichtungen entscheidet der Spieler.** JavaScript prüft nur noch Zustand, Identität, Zuständigkeit und Abhängigkeiten, nicht mehr Englisch. Drei Änderungen tragen den Großteil des Nutzens: eine einheitliche Anwesenheitsregel (P1), Begrenzung der Ablehnungskaskade (P2) und die Verlagerung der Bewegungsklassifikation in die Engine (P5).
10. **Die Teststrategie muss mitwechseln.** Der historische Replay ist ein exakter Ereignis-Schnappschuss gegen .126 (21.567 hinterlegte Erwartungseinträge in 38 Dateien, 1.386 bereits akzeptierte Abweichungen). Er erkennt jede Änderung, bewertet aber nicht, ob sie besser oder schlechter ist. Falsche Ablehnungen werden nirgends gemessen. Vorschlag: harte Invarianten behalten, gelabelte Positiv-/Negativkorpora für Sprachentscheidungen einführen und den Replay zu einem kategorisierten Differenzbericht umstellen.

---

## 1. Unabhängige Gesamtbewertung

Avereth hat eine solide mechanische Grundlage. Eventlog und Fold, Decision Ownership in `ownership.js`, deterministische Kampfauflösung, gebundene Transaktionen, Revisionsschutz und die neuere native Party- und Ortssteuerung sind gute Entscheidungen. Die Zuständigkeitsidee „Planner interpretiert, Engine bucht, Narrator erzählt, Extractor erfasst“ ist sinnvoll.

Die Schwäche liegt in einer Schicht, die so nirgends als Architekturentscheidung beschrieben ist. Nachdem ein Sprachmodell den Text bereits verstanden und strukturiert gemeldet hat, versucht JavaScript, dieselbe Bedeutung **noch einmal aus dem englischen Wortlaut** abzuleiten. Diese Schicht ist über viele Builds aus Einzelfällen gewachsen. Allein `world.js` enthält 191 Verweise auf konkrete Patches, Livetests oder Reviews als Begründung einzelner Regeln.

Diese Schicht hat drei grundsätzliche Eigenschaften, die sich durch weitere Wortlisten nicht beheben lassen:

- **Sie ist offen gegenüber Paraphrasen.** Englisch kennt für „sie ist hier und arbeitet“ unbegrenzt viele Formulierungen. `HERE_DOES` listet etwa 100 Verben. „pulled a pint“, „hailed him“, „recognised him“ fehlen. Jede Ergänzung behebt genau den nächsten Fall.
- **Sie erzeugt gleichzeitig falsche Ablehnungen und falsche Zulassungen.** Der lockerere `enter`-Pfad akzeptiert „The leatherworker had packed up and left before Alaric arrived“ und „A painted sign showed the leatherworker“ (§ 4.3). Sie ist also auch als Sicherheitsnetz unzuverlässig.
- **Sie verlagert die Fehlerursache unsichtbar.** Der Spieler sieht eine korrekte Erzählung. Der Narrator erfährt bei `met_evidence` nichts von der Ablehnung. Die Abweichung zeigt sich erst Züge später, etwa wenn ein Kauf bei der „abwesenden“ Händlerin scheitert.

**Mein Urteil:** Kein Neubau. Die bestehende Kette bleibt. Die JS-Sprachprüfungen werden im Standardpfad durch **strukturierte Klassifikationen des jeweiligen Sprachmodells** und **Zustandsprüfungen der Engine** ersetzt. Nur für wenige seltene Ereignisse mit großer Wirkung, etwa eine erzwungene Verschleppung des PC, bleibt ein strenger Beleg sinnvoll. Wo eine echte Spielerentscheidung betroffen ist, wird die Entscheidung früher und strukturiert getroffen: Planner-Modus, HUD, native Aktion. Sie wird nicht nachträglich aus Prosa rekonstruiert. Das ist dieselbe Lösung, die sich bei der Standardparty bereits bewährt hat.

---

## 2. Bewertung der bisherigen Diskussion

| Position | Meine Bewertung |
|---|---|
| **Andere KI, Vorschlag 1:** toleranter Fuzzy-Parser, Key-Value-Zeilen, kaputte Felder überspringen | Trifft das Problem kaum. In der Stichprobe scheiterte das JSON-Lesen praktisch nie. Nur 4 von 217 Extraktionen schlugen insgesamt fehl, reine Schemareparaturen waren 22. Fuzzy-Matching für IDs, Beträge oder Ziele lehne ich wie GPT ab. Richtig ist ein Teilaspekt: **gültige Teile einer Antwort nicht wegen eines fehlerhaften Teils verwerfen** (P3). |
| **Andere KI, Vorschlag 2:** alle linguistischen Prüfungen aus der Firewall löschen, nur Weltfakten prüfen | Richtung für Anwesenheit, Party-Zusagen, Desk-Zeugen und Szenenchronologie richtig. Als Pauschalregel zu grob. Es gibt wenige Fälle, in denen der Wortlaut tatsächlich die Spielerhoheit schützt: erzwungene Ortsverlagerung, übergebene Münzen, Verpflichtungen des Spielers. Dort ändert sich die Schutzform, die Schutzwirkung bleibt (§ 5). |
| **GPT:** Stufenmodell erzählerisch / mechanisch relevant / engineeigen | Im Ergebnis weitgehend einverstanden. Ich schlage ein **anderes Trennkriterium** vor. Entscheidend ist, **wer eine Aussage überhaupt zuverlässig prüfen kann**. Zustand prüft die Engine, Bedeutung das Sprachmodell, Wille der Spieler. Eine anwesende Händlerin ist mechanisch relevant (Handel). Trotzdem sollte nicht JS, sondern das Modell über die Bedeutung entscheiden und die Engine über die Plausibilität. |
| **GPT:** leerer Stand und weggegangene Person müssen gesperrt bleiben | Ziel richtig. Die heutige Umsetzung leistet das nur im `met`-Kanal. Über `aware`/`position`/`enter` gelangt dieselbe Person an derselben Stelle ohne Prüfung in die Szene (§ 3.2). Mein Vorschlag P1 macht den Schutz kanalunabhängig, als strukturierte Klassifikation statt Satzparser. |
| **GPT:** Ortsauswahl und Standardparty sind Beispiele früher, strukturierter Entscheidung | Einverstanden und der wichtigste Hinweis der Diskussion. Diese Linie sollte konsequent fortgesetzt werden: Bewegungsklassifikation (P5), Planner-Modus statt Agency-Regex (P6), Party ohne X-Rückübersetzung (P7). |
| **Testkultur** (Hypothese des Diskussionspapiers) | Ich bestätige sie an Belegen (§ 9). Gleichzeitig natürliche Freiheit, unveränderte Schutzfälle und exakte Replay-Fingerprints zu verlangen, begünstigt strukturell den kleinsten lokalen Patch. Das ist keine Schuldfrage, sondern ein Anreizproblem der Abnahmekriterien. |

---

## 3. Tatsächliche Architektur und Zuständigkeiten

### 3.1 Wo natürliche Sprache interpretiert wird [geprüft]

```
Spielertext
  │
  ├─(1) Planner-LLM  ............ src/v4/planner.js, runtime.planMessage   – Systemprompt ≈ 47 KB
  ├─(2) Agency-Guard (JS) ........ src/v4/agency.js guardCommands L327     – Subjekt, Anrede, Modal, Frage, Negation
  ├─(3) Bewegungs-Heuristiken (JS) runtime.js L397–404 explicitJourneyClause, localApproach;
  │                                commands.js go() L657–686 (Zimmer-Regex L671, {scene}→Approach L676)
  ▼
Engine bucht Aktionen (commands.js) ──► PLAYER ACTIONS / Engine-Block
  │
  ├─(4) Narrator-LLM liest PLAYER ACTIONS **und den Spielertext selbst** (Prompt ≈ 54 KB)
  ▼
Prosa
  ├─(5) Extractor-LLM ............ src/v4/extract.js                       – Prompt ≈ 62 KB
  ├─(6) parseExtraction (JS) ..... extract.js L596–817: Schema (alles oder nichts, L817) + semanticIssues
  │                                (Zeugen-Desc, Gegenpartei anwesend, Preisformen, Szenenchronologie) → bezahlte Reparatur
  ├─(7) Firewall (JS) ............ src/v4/firewall.js: Zuständigkeit nach Delta-Typ + Regex auf freien Faktentext
  ├─(8) Weltabgleich (JS) ........ world.js applyWorld L280–≈4015 (eine Funktion ≈ 3.700 Zeilen) mit
  │                                narration_evidence.js (metEvidence, presenceInReply, deskHandling, forcedRelocation),
  │                                finance_evidence.js, party.js evidenceOf/unchangedAnswer, surrender.js, threads.js
  └─(9) delta.js reportToEvents .. bringIn() für enter/aware/position ohne eigene Sprachprüfung
```

Die Engine bucht in (2), (3), (6), (7) und (8) Entscheidungen auf Grundlage eigener englischer Textanalyse. Zum Vergleich: In `firewall.js`, `narration_evidence.js`, `finance_evidence.js`, `party.js`, `planner.js` und `agency.js` stehen jeweils 100 bis 185 Alternativen englischer Wörter in regulären Ausdrücken. Über `src/` sind es mehrere tausend Wortalternativen. Die Zahlen stammen aus einer groben Zählung (`regexAlt` im Protokoll) und dienen nur als Größenordnung.

### 3.2 Dieselbe Entscheidung an mehreren Stellen [geprüft]

**Anwesenheit einer bekannten Person.**

| Kanal | Prüfung im Code | Ergebnis bei Person mit `at` = aktueller Ort |
|---|---|---|
| `expected.go.met` | `metEvidence` ([narration_evidence.js L347](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/narration_evidence.js#L347)): `narratedEvent` + `DEPICTED`/`AWAY`/`TRACE` + `namedPeople` + `presentHere` (Verb-Whitelist) + `leftBeforeHim` | strenger Satzparser |
| `enter` | [world.js L1524](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L1524): nur bei `absentKnown` → `presenceInReply` (durchsucht ganze Antwort) | **keine Prüfung**, da `absentKnown` false |
| `aware`, `position` | `notBroughtIn` ([world.js L612](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L612)) → `bringIn` ([delta.js L451](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/delta.js#L451)) | **keine Prüfung**, da `absentKnown` false |

`absentKnown` ([world.js L600](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/world.js#L600)) ist nur für Personen wahr, deren gespeichertes `at` **nicht** dem aktuellen Ort entspricht. Genau die typischen Rückkehrfälle (Händlerin am Markt, Wirtin im Gasthaus, Fischer an der Brücke) haben aber `at` = Zielort. Belege aus den Originalen:

- **Martin M17:** gespeichert `npc.npcleatherworker.at = loc.alderwatch.alderwatch_market_square`. X meldete nur `met`. Abgelehnt. Mit `aware` wäre sie ohne Prüfung eingetreten.
- **Elm M83:** Für Madge melden `met` und `enter` denselben Satz. `met` verwirft ihn als Bild („drawing ale“), `enter` übernimmt ihn.
- **Reed M21:** `met` für Tam verworfen, die `aware`-Meldung derselben Antwort bringt ihn per `bringIn` in die Szene.

**Bewegung des PC** wird unabhängig von Planner, Agency-Guard, Laufzeit-Heuristik, `go()`-Regex, Narrator (der den Spielertext selbst liest), Extractor und GO-Firewall beurteilt. Wenn Planner oder Guard die Bewegung verfehlen, erzählt der Narrator sie trotzdem, weil der Spielertext sie enthält (Lantern M81, AJ M23, Hazel M23, Rook M9/M17).

**Party-Zusage** wurde vor .236 von Narrator-Prosa, X, `evidenceOf` (Sprecherzuordnung) und `unchangedAnswer` (Zustimmungsbedeutung) bewertet. Seit .236 gibt es zusätzlich die strukturierte Entscheidung. Die alte X-Rückübersetzung ist weiterhin aktiv (§ 4.2).

### 3.3 Widersprüchliche Modellaufträge [geprüft]

| Auftrag | Quelle | Widerspruch |
|---|---|---|
| Narrator: „KNOWN AT … whoever works there is at work unless the story establishes otherwise“ | [commands.js L868](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/commands.js#L868), im echten Martin-Request zugestellt | Die Engine verwirft anschließend genau diese Darstellung, wenn sie nicht in parserkompatibler Form vorliegt. |
| Extractor: `met` „… not someone … referred to by a pronoun“ | `content/deltas.json`, expected `go` | Ein Prompt-Zugeständnis an den JS-Parser. Natürliche Erzählung („she looked up …“) wird dadurch zum Formfehler. |
| Narrator: Bewegung erzählen, wenn der Spieler sie verlangt (Spielertext sichtbar) – gleichzeitig „NOTHING TO BOOK“ im Engine-Block | turn.js, Narrator-Kontext | Der Narrator folgt in der Praxis dem Spielertext. Ein Planner-Fehler wird so zur Zustandsdivergenz. |
| Extractor: `expected.go.arrived` **und** ein `arrive`-Delta, jedes Delta mit Szene vor einer Ankunft | extract.js `sceneIssues` L469 | Dieselbe Tatsache muss zweimal widerspruchsfrei gemeldet werden. Bei Abweichung folgt eine bezahlte Reparatur. |

### 3.4 Was tatsächlich mechanische Integrität schützt [geprüft]

Mechanische Integrität schützen vor allem **zustands- und zuständigkeitsbasierte** Prüfungen:

- Decision Ownership und Effektprüfung bei jedem Event (`ownershipViolation`/`effectViolation`, world.js L291 ff.).
- Firewall nach Delta-Typ: Gildenzahlungen, PC-Inventar, Plakette und Vertragsschein, Queststatus.
- GO-Autorisierung, Reiseabschnitte, PULSE, Dungeon-Slots und Population, Kampfpositionen im aktiven Kampf.
- Transaktionen nur über Spieleraktionen, explizite Annahme, Doppelbuchungsschutz, Tod, Fold-Block, Revisionsbindung.

Sie sind kaum betroffen und sollen bleiben.

Die **sprachbasierten** Prüfungen schützen dagegen überwiegend Erzählkonsistenz und Wissenszuordnung: Wer ist hier? Wer hat den Vertrag gesehen? Wer hat was gesagt? Bei diesen Fragen ist ein Sprachmodell ein besserer Leser als eine Wortliste.

### 3.5 Überholte Schutzmechanismen [geprüft, Bewertung: Hypothese]

| Mechanismus | Ursprünglicher Zweck | Was ihn inzwischen ersetzt oder entwertet |
|---|---|---|
| `met`-Satzparser (E2-A, .169–.171) | Keine falsche Wiederbegegnung bei Ankunft | Kanäle `enter`/`aware` umgehen ihn. Der Narrator-Auftrag setzt Anwesenheit voraus. Eine strukturierte X-Klassifikation wäre zuverlässiger. |
| Party-Sprecher-/Zustimmungsparser | Keine erfundene Zusage | Strukturierte `party_decision` (.236 ff.), HUD-Einladung, native Organisation |
| `npc_actor`-Drop für `go`/`party` | „Ossen walks to the chapel“ ist keine PC-Handlung | Planner-Prompt enthält dieselbe Regel. Die Anrede-Ausnahmeliste wächst (L362–369). Native Party-Aktionen existieren. |
| Zimmer-/Approach-Regex in `go()`, `explicitJourneyClause` | Ortswechsel trotz `{scene}`-Klassifikation | Ortsbuch und bekannte Wege (.245) erlauben eine engineseitige Zielauflösung (P5). |
| Desk-Zeugen-Beleg | Gildenmitarbeiter „weiß“ von Annahme oder Abgabe | Der Desk-Schritt ist bereits enginegebucht. Die Zeugenschaft lässt sich deterministisch zuordnen. |

---

## 4. Repräsentative Originalfehler und ihre Ursachen

### 4.1 Einzelfälle

Fehlerklassen nach Auftrag: 1 Antwortformat · 2 Schema · 3 Spielerentscheidung falsch interpretiert · 4 falsche mechanische Autorisierung · 5 widersprüchlicher Narratorauftrag · 6 Extraktion fehlt oder ist falsch · 7 zu strenge semantische Prüfung · 8 zu Recht verweigert · 9 Abhängigkeitskaskade · 10 Save/Revision.

| Fall (Original) | Was geschah | Klasse(n) | Ursache |
|---|---|---|---|
| **Martin M17** · [Archiv](../testrun_10b/openrouter-20261127-martin-251/) [geprüft] | Lederarbeiterin erzählt und korrekt mit ID gemeldet, `met_evidence` abgelehnt. Reed spricht weiter mit einer „abwesenden“ Person. | 7 (+5) | Possessiv „leatherworker's stall“ + Pronomen „she“: `namedPeople` erkennt die Rolle nicht. Kein `correction` an den Narrator, stille Divergenz. |
| **Martin M11** [geprüft] | „the soft-soled pair runs eight silver. Traveler's kind …, twelve.“ Zweite Zeile verworfen („a price the reply does not name“), Spieler sieht „PRICE OPEN“. | 7 | Elliptische Währung. `said` „twelve“ trägt kein Münzwort. |
| **Elm M83** [geprüft] | Madge „drawing ale“ → „it shows a picture of them“. `enter` mit demselben Satz übernimmt sie. | 7, Kanal-Inkonsistenz | `DEPICTED` enthält `drawing\w*`. |
| **Reed M21** (Tam) [geprüft] | „The eel-man was there. An old fellow sat on the gunwale …“ abgelehnt, `aware` bringt ihn trotzdem. | 7, Kanal-Inkonsistenz | Rolle „fisherman“ ≠ „eel-man“, unbestimmter Artikel, Satzgrenze. |
| **Lantern M81–M85** · [Archiv](../testrun_10b/openrouter-20261127-lantern-244/) [geprüft, Bericht .245 R1] | Rückkehr zur Gaststube als `go {scene}` klassifiziert. `arrive` → `no_go`, danach drei Züge `scene_context` für `enter`, `offer`, `fact`, `object.new`. | 3 → 9 | Planner muss zwischen Standpunkt und eigenem Ort entscheiden, ohne die Ortsstruktur zuverlässig zu kennen. Die Engine kennt sie. |
| **Rook M9/M17** [geprüft, Bericht .245] | Leerer Plan bzw. `{scene}` für „walk to the town's market“. Narrator erzählt die Reise. | 3 → 9 | wie Lantern. Der .251-Fix erkennt genau diese zwei Wortlaute (§ 4.4). |
| **AI M17 / AJ M21** · [AI](../testrun_10b/openrouter-20261127-ai-235/) [geprüft, Bericht .235] | Ossen: „Yeah. I'll go with you.“ X meldet `party accept` mit richtiger Vereinbarungs-ID. Abgelehnt: „needs words from the identified speaker“. Spieler-„I agree“ führt zu CLARIFY. | 7 | Sprecherzuordnung per Satzfenster. Seit .236 strukturell gelöst, die alte X-Prüfung läuft weiter. |
| **AJ M23 / Hazel M23** [geprüft] | „Ossen, let's set out for the ruined chapel …“ Planner erzeugt korrekt GO. Agency-Guard entfernt es als `npc_actor`. Narrator erzählt die Reise, `no_go`. | 4 (JS überstimmt korrekten Planner) → 9 | `otherActor` liest den Vokativ als Subjekt. Die Ausnahmeliste wurde später erweitert. |
| **AK** [Bericht .235] | „Warte hier“ als Prosa, Save bleibt `follow`. | 6/7 | Organisation über Prosa statt nativer Aktion, inzwischen nativ lösbar |
| **User16** [Bericht .221/User16] | Annäherung und Beobachtung am Dungeon wurden zu Ortswechsel und dann verworfen. Zwölf Ablehnungen, Abbruch. | 3/7 → 9 | Ortsmodell kannte keinen Standpunkt. Mit .221 eingeführt. Die damalige Einführung von `{scene}` ist zugleich Ursache der Lantern-Klasse. |
| **Gilde, Sammelfall** (ac, ae, ak, i, n, quill, rowan, vale, x) [geprüft] | „The clerk was still at her counter, ledger open …“, „The clerk at the counter was stamping something …“ → „does not show them here now“. „glanced up **once**“ → „it looks back“ (`LOOK_BACK` enthält `once`). | 7 | Verb-Whitelist, Satzstellung („Behind the counter sat the clerk“), Schlüsselwörter |
| **Juniper M83** [geprüft] | „Ossen was where Alaric had left him, working a spoon … with his bowl half **gone**“ → „place empty or them away“ | 7 | `AWAY` enthält `gone`. |
| **x-233 M71** (Garrick) [geprüft] | Zitat beschreibt nur Hallengeräusche. | 8 (korrekt) | Zitat nennt die Person nicht. |
| **c-223 M23** [geprüft] | Spieler lädt nur ein, Narrator lässt beide aufbrechen → `no_go` | 8 (korrekt) | Narrator erfindet eine Reise. |

### 4.2 Stichprobe der gesamten Serie [geprüft]

**Grundlage:** 59 Arme mit bezahlten Antworten, 217 bezahlte Narrator-Antworten, Modellroute `z-ai/glm-5.3-flash`, alle Builds .222–.251. Gezählt werden nur die eigenen bezahlten Antworten jedes Arms, gemeinsame Präfixe nicht doppelt. Es handelt sich um konstruierte Testarme eines Modells und um keine persönlichen Spielsitzungen. **Daraus folgt keine allgemeine Fehlerquote.** Die Zahlen zeigen Häufigkeitsordnung und Mechanismen.

| Kennzahl | Wert |
|---|---|
| Extraktionen vollständig gescheitert | 4 von 217 |
| Antworten mit bezahlter X-Reparatur | 59 von 217 (27 %) · 67 physische Reparatur-/Recovery-Requests |
| X-Reparatur-Inputtokens | 937.825 von 4.273.296 X-Inputtokens (≈ 22 %) |
| Planner-Reparaturen / Ausfälle | 13 / 1 von 218 Planner-Zügen |
| Agency-Drops | 5 (4 × `npc_actor`, 1 × `question`) |
| Antworten mit mindestens einer `met_evidence`-Ablehnung | 23 von 217 |

**Häufigste Ablehnungsregeln und meine Einordnung:**

| Regel | Anzahl | Einordnung nach Fallprüfung |
|---|---:|---|
| `scene_context` | 50 | Fast ausschließlich Kaskade nach abgelehnter oder unbestätigter Ankunft (Klasse 9). Betrifft auch Threads, Erinnerungen, Haltungen und `coin.gift` ohne Ortsbezug. |
| `met_evidence` | 24 | 23 falsche Ablehnungen (Klasse 7), 1 korrekt. 9 der 23 ohne Ersatzkanal, also Zustandsdivergenz. [Liste](claude_251_analyse/ERGEBNISSE.txt) |
| `party_decision` | 19 | Frühe Serie überwiegend falsche Ablehnungen echter Zusagen. Ab .242 gemischt: teils meldet X gewöhnliches Gespräch als Party-Delta (zu Recht nicht gebucht), teils echte Folgezusage verworfen (Hazel M23). |
| `met_without_arrival` | 15 | Folgefehler einer nicht gebuchten Ankunft (9) |
| `no_go` | 13 | ≈ 8 echte Spielerwahl, durch Planner/Guard verfehlt (3/4). ≈ 5 zu Recht verhinderte Narrator-Reisen (8). |
| `world_rule` | 13 | Überwiegend korrekt (Positionen im aktiven Kampf, `leave` einer Abwesenden) |
| `desk_handler` | 8 | Zeugenzuordnung am Schalter, mechanisch folgenlos |
| `offer` | 7 | Überwiegend fehlende Münzwörter in `said`. Mischung aus berechtigter Vorsicht und Ellipse (Martin M11). |

**Reparaturanlässe** (67 Requests, Mehrfachnennung): 23 × Szenenchronologie (jedes Delta vor einer Ankunft mit eigener Szene, `arrived` ohne passendes `arrive`), 8 × fehlendes Pflichtfeld, 6 × unbekannte ID/Enum/Ortsreferenz, 6 × Gegenpartei laut JS nicht anwesend, 5 × Preis-/Geldformulierung, 5 × zusätzliches Feld, 4 × fehlender expected-Schlüssel, 4 × Dungeon-Sichtung, weitere einzelne. Pro Request: **38 rein semantisch, 22 reines Schema, 6 gemischt.**

**Folgerung zur Häufigkeit und Spielrelevanz [Hypothese auf Basis der Stichprobe]:**

1. **Bewegung falsch autorisiert, danach Kaskade:** selten, aber am spielrelevantesten. Mehrere Züge Divergenz, Handel und Personen blockiert, Spieler muss Engine-Syntax suchen.
2. **Anwesenheit falsch abgelehnt:** häufig (≈ jede zehnte Antwort der Stichprobe). Meist folgenlos, weil ein anderer Kanal greift. In etwa 4 % der Antworten bleibt eine Divergenz mit späterem Handels- oder Wissensfolgefehler.
3. **Reparaturkosten:** häufig, für den Spieler als Wartezeit spürbar, ohne Spielwirkung
4. **Party-Rückübersetzung:** durch .236 weitgehend entschärft, Restfälle
5. **Preis-Ellipsen:** selten, aber störend, weil der Spieler eine Rückfrage stellen muss

### 4.3 Isolierte Gegenprobe der Anwesenheitsfunktionen [geprüft]

`probe_presence.mjs` ruft `metEvidence` und `presenceInReply` aus `4933a5f0` mit kontrollierten Personenprofilen auf. Die Sätze sind **von mir konstruiert**. Sie ergeben keine Quote, sondern zeigen das Verhalten der Funktion.

| Ergebnis | `metEvidence` (`met`-Kanal) | `presenceInReply` (`enter`-Kanal) |
|---|---|---|
| 14 natürliche Positivsätze | 4 akzeptiert, **10 abgelehnt** (z. B. „Madge pulled a pint …“, „The leatherworker hailed him …“, „… recognised him at once …“, Martin-Original, Elm-Original) | 11 akzeptiert, 3 abgelehnt |
| 9 Negativsätze | 9 korrekt abgelehnt | **2 fälschlich akzeptiert** („had packed up and left before Alaric arrived“, „A painted sign showed the leatherworker“) |

`probe_depicted.mjs`: „Brey stood at the gate, his sword drawn“, „Madge stood behind the bar, carving the roast“, „Madge was drawing water at the pump“ → „shows a picture“. „Madge was sweeping the empty common room“, „Madge stood by the hearth, gone quiet“ → „place empty or away“.

### 4.4 Die Mini-Fix-Schleife am .251-Fix [geprüft]

[`explicitJourneyClause`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/known_routes.js#L39) löst die vorhandene Planner-Reparatur nur aus, wenn der erste Satz `town's`/`city's`/`village's`/`settlement's` oder „the way I came“/„back along the route“ enthält (`probe_journey.mjs`):

| Spielertext | Hinweis ausgelöst |
|---|---|
| „I skirt the main road and walk to the town's market …“ (Rook/Martin-Original) | ja |
| „I return to the market the way I came …“ (Original) | ja |
| „I return to the market.“ · „I go back to the market.“ · „I head over to the market square.“ · „I make my way to the city market.“ · „Let's go to the market.“ · „I leave my room and return to the common room of The Slaked Lime.“ | **nein** |
| „I go to the village's well.“ | ja |

Der Fix ist nicht falsch, aber er belegt die Mechanik: Der Originalsatz wird grün, die nächste natürliche Variante bleibt auf das Planner-Glück angewiesen. Ebenso [commands.js L671](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src/v4/commands.js#L671) (.247): `^(?:upstairs|up the stairs|(?:(?:the|my|our|rented|paid|upstairs) )*(?:room|quarters|lodging)…)$` für den Weg ins gerade bezahlte Zimmer.

---

## 5. Bewertung der vorhandenen Validatoren und Schutzregeln

Legende: **B** beibehalten · **V** vereinfachen · **Z** zusammenführen · **E** durch strukturierte Entscheidung ersetzen · **S** aus Standardpfad entfernen · **X** entbehrlich.

| # | Prüfgruppe | Datei · Funktion | Ursprüngliche Schutzwirkung | Befund | Empf. | Künftiger Schutz |
|---|---|---|---|---|---|---|
| 1 | JSON-Toleranz | `json.js extractJsonObject`, `delta.js tolerantJson`, `extract.js readDeltaEnvelope` | Formfehler ohne Bedeutungsverlust | Funktioniert. Praktisch keine Ausfälle. | B | unverändert |
| 2 | Schema alles-oder-nichts | `extract.js parseExtraction` L817 `valid: errors.length === 0`, `schema.js validate` | Keine halbgültigen Weltberichte | Ein fehlerhaftes `fact` kostet Reparatur oder alles. | V | Per-Delta-Gültigkeit, Reparatur nur für mechanische Pflichtfelder (P3) |
| 3 | Formnormalisierung | `normalizeSoftFields`, `formOnly`, `softSeq` | Harmlose Formabweichungen | Gut, wenige Fälle | B, erweitern | z. B. fehlendes `how` bei `learn` → `told`, Liste statt String |
| 4 | Szenenchronologie | `sceneIssues` L469, `sceneSteps`, `chronology` in world.js | Ereignisse vor einer Ankunft nicht am Ziel buchen | Größter Reparaturanlass. Die Engine kann die Reihenfolge aus `seq` und `arrive` selbst ableiten. | E | Engine ordnet Deltas nach `seq` den Abschnitten zu, X nur bei Abweichung `scene` (P4) |
| 5 | Doppelmeldung Ankunft | `expected.go.arrived` + `arrive`-Delta | Konsistenz | Selbstverursachte Widersprüche | Z | eine Quelle: `arrive` (oder expected), die andere abgeleitet (P4) |
| 6 | Gegenpartei anwesend (Repair-Trigger) | `extract.js` L719 | Kein Handel mit Abwesenden | Löst bezahlte Reparatur aus, obwohl Präsenz eine Zustandsfrage ist | Z | in P1-Präsenzregel. Handel wird nicht gebucht, aber keine Reparatur. |
| 7 | Typbasierte Zuständigkeit | `firewall.js firewall()` | Engine-Domänen: Gildenlohn, PC-Inventar, Plakette, Queststatus | Kern der Integrität | **B** | unverändert |
| 8 | Regex auf freiem Faktentext | `firewall.js guildMechanic`, `GUILD_QUEST_STATE`, `RANK_*`, `ENGINE_FACT`, `pcActIn` | Freie Fakten sollen keine Mechanik behaupten. | Freie Fakten sind keine Autorität. Der Schaden liegt nur in Narrator-Erinnerungen. | V | Fakten mit Engine-Prädikaten verwerfen, Rest ohne Korrektur als Erinnerung. Engine-Block bleibt autoritativ. |
| 9 | GO-Firewall | `allowedArrival`, `no_go`, Reiseabschnitte, PULSE-Halt | Keine Reise ohne Spielerwahl | Fängt echte Narrator-Erfindungen (≈ 5 von 13) | **B** | unverändert. Die Ursache der übrigen ≈ 8 wird vorher beseitigt (P5, P6). |
| 10 | Erzwungene Verlagerung | `narration_evidence.forcedRelocation` L117 | PC wird nicht ohne Grund verschleppt | Selten, große Wirkung, Spielerhoheit | **B** | unverändert. Hier ist Strenge gewollt. |
| 11 | `met`-Satzparser | `metEvidence`, `presentHere`, `leftBeforeHim`, `namedPeople`, `DEPICTED`/`AWAY`/`TRACE`/`HERE_DOES`/`LOOK_BACK` | Keine Scheinanwesenheit | 23/24 falsche Ablehnungen, umgehbar | **S** | P1: X-Klassifikation `seen` + Zustandsplausibilität + wörtliches Zitat |
| 12 | `enter`-Beleg | `presenceInReply`, `narratedPresence` | wie 11, für Abwesende | Locker, mit Fehlzulassungen | Z | in P1 |
| 13 | `bringIn` über `aware`/`position` | `delta.js` L451/470/483, `notBroughtIn` | wie 11 | Prüfungsfrei für `at` = Ort | Z | in P1 (gleiche Regel für alle Kanäle) |
| 14 | Desk-Zeuge | `deskHandlingEvidence` L528, `guildParticipationEvidence` | Wissensbuchung Gildenmitarbeiter | Mechanisch folgenlos, wortlistenabhängig | E | P8: Engine weist den anwesenden Gildenmitarbeiter beim enginegebuchten Schritt zu. |
| 15 | Party-Sprecher/Zustimmung | `party.js evidenceOf` L25, `unchangedAnswer` L109, `partyDecision` L222 | Keine erfundene Zusage | Durch strukturierte Entscheidung überholt | E/S | P7: Standardpfad nur nativ/strukturiert. X meldet nur NPC-eigene Austritte. |
| 16 | Agency: Verpflichtungen | `agency.js` `no_evidence`, `not_held`, `same_message`, `redundant`, `not_paying` | Keine erfundenen Zahlungen/Annahmen | Sinnvoll für Verpflichtungen | **B** (eng) | unverändert für `COMMITMENTS` |
| 17 | Agency: Sprachheuristiken | `otherActor`/`npc_actor`, `planned`, `question`, `retrospective`, `purpose`, `negated` | Planner-Fehllesungen abfangen | Doppelte Entscheidung zum Planner-Prompt. Bei `go`/`party` nachweislich schädlich. | E | P6: Planner liefert `mode` je Befehl. Guard prüft nur Zitat und Zustand. |
| 18 | Bewegungs-Heuristiken | `runtime.js` moveHints/`explicitJourneyClause`, `localApproach`, `commands.js` Zimmer-Regex, `chosenKnownRoute` Satzabgleich | Ortswechsel nicht als Standpunkt verlieren | Phrasen-Patches | E | P5: Engine klassifiziert das Ziel über Ortsbuch und Personenorte. |
| 19 | Preiswortlaut | `finance_evidence.js findQuote`, `coinFromWords`, Pricing-Phasen | Kein erfundener Preis | Teilweise zu streng (Ellipse). Eigentlicher Schutz: sichtbare Karte und explizite Annahme. | V | P9 |
| 20 | Ambient-Filter | world.js `ambient` | Szenenfarbe nicht als Person speichern | Designentscheidung, harmlos | B | unverändert |
| 21 | Ablehnungskaskade | world.js L1186–1190 `scene_context`, `blockedPeople`, `blockedCreatures` | Keine Ereignisse am nicht erreichten Ort | Wirft auch ortsunabhängige Deltas weg | V | P2: nur ortsgebundene Deltas |
| 22 | Dungeon/PULSE/Kampf | `living.js`, `pulse.js`, `combat.js`, `dungeon_*` | Engine-Domäne | Kern | **B** | unverändert |
| 23 | E3-Anker | world.js `anchorRefusal` L250 | Keine Persönlichkeit aus Momentstimmung | Wortlisten, geringe Wirkung | V (später) | X-Feld `lasting: true`, Erstbegegnung als Zustandsregel |
| 24 | Stille Ablehnungen | `metArrivals` (keine Correction) vs. `enter` (mit Correction) | – | Divergenz ohne Rückmeldung | V | P10: jede szenenwirksame Ablehnung erzeugt Rückmeldung an Narrator. |

**Zur Leitfrage des Auftrags, welche Schutzwirkung aus Spielersicht nicht mehr nötig ist [Hypothese]:** Der Schutz, dass eine erzählte Person wirklich ihren *exakten* Anwesenheitsbeweis in einem Satz braucht, ist aus Spielersicht entbehrlich. Eine fälschlich angenommene Anwesenheit einer bekannten, lebenden Person am selben Ort kostet höchstens eine erzählerisch korrigierbare Szene. Mechanische Folgen wie Kauf oder Zahlung verlangen ohnehin eine explizite Spielerentscheidung mit sichtbarer Gegenpartei. Eine fälschlich verweigerte Anwesenheit blockiert dagegen nachweislich Handel, Wissen und Folgezüge.

---

## 6. Konkrete Vorschläge

Jeder Vorschlag ist als Grundlage eines Codex-Auftrags formuliert. Reihenfolge und Abnahme stehen in § 11.

### P1 · Eine einheitliche Anwesenheitsregel: „Claim + State“ statt „Claim + Grammatik“

- **Problem.** Vier Kanäle mit drei verschiedenen Regeln. Satzparser mit 23/24 falschen Ablehnungen. Prüfungsfreie Nebeneingänge.
- **Komponenten.** `narration_evidence.js` (metEvidence & Helfer), `world.js` (`metArrivals`, `case 'enter'`, `notBroughtIn`, `absentKnown`), `delta.js bringIn`, `extract.js` L719, `content/deltas.json` (`met`, `enter`), `commands.js` L868.
- **Künftige Zuständigkeit.** X entscheidet über die Bedeutung durch **Klassifikation**. Die Engine entscheidet über die Plausibilität anhand des **Zustands**.
- **Schnittstelle (Vorschlag).**

```js
// expected.go.met[] und enter teilen ein Format (deltas.json)
{ "who": "npc.madge",                 // ID aus KNOWN AT / CATALOG – Identität bleibt beim Extractor
  "seen": "here_now" | "mentioned" | "remembered" | "away" | "unsure",
  "arrives": true | false,             // kommt im Verlauf dieser Antwort neu hinzu
  "evidence": "<wörtlicher Auszug>" }  // nur Anti-Halluzination, keine Grammatik

// world.js – eine Funktion für met, enter, aware, position und Gegenparteien
function admitPresence(s, id, claim, { prose, arrivedThisReply }) {
  const e = s.entities[id];
  if (!e || e.kind !== 'npc') return no('unknown_person');
  if (statusOf(s, id) === 'dead') return no('dead');
  if (claim.seen !== 'here_now') return no('not_shown_here');           // Bedeutung: LLM
  if (!literalExcerpt(prose, claim.evidence)) return no('quote_not_in_reply');
  if (boundElsewhere(s, id)) return no('elsewhere_now');                // aktiver Kampf, Party 'wait' anderswo, Begleitung eines Abwesenden
  const near = sameSettlementOrUnknown(s, e.at ?? e.location, s.scene.at);
  if (!near && !claim.arrives) return no('far_away');                   // anderer Ort: nur als Ankunft
  return yes();
}
```

- **Entfernen.** Aus dem Standardpfad entfallen `metEvidence`, `presentHere`, `leftBeforeHim`, `namedPeople`, `DEPICTED`, `AWAY`, `TRACE`, `HERE_DOES`, `LOOK_BACK`, `presenceInReply` und `narratedPresence`. Sie bleiben nur noch für `forcedRelocation`, soweit dort genutzt. Ebenso entfallen der Repair-Trigger „counterparty not established“ und die Prompt-Zugeständnisse („not … by a pronoun“).
- **Bleibt.** Lebensstatus, Identität per ID, Abwesenheit wegen gebundenem Zustand, Entfernungsplausibilität, wörtlicher Auszug.
- **Negativfälle.** *Nur erwähnt / erinnert / hypothetisch / gegangen / leerer Stand:* X klassifiziert `mentioned`/`remembered`/`away`. Das ist eine Lesefrage, die ein LLM besser beantwortet als eine Wortliste, und sie wird in T2 gemessen. *Tot:* Zustand. *Verwechslung:* X wählt die ID aus dem Katalog. Die Engine prüft, dass die ID an diesem Ort bekannt oder plausibel ist. Bei zwei Kandidaten gleicher Rolle zeigt der Katalog unterscheidende Merkmale, was heute schon geschieht. *Erfundene Spielerhandlung:* nicht Sache der Präsenz, bleibt bei GO-Firewall und Overreach.
- **Auswirkungen.** Handel, Wissen, Party-Wiedersehen und Desk funktionieren nach korrekter Erzählung. Keine Reparatur wegen Präsenz.
- **Risiken und Schutzbedingungen.** Schwächere Modelle könnten `here_now` großzügiger vergeben. Gegenmittel: T2-Korpus mit Mindestgenauigkeit für die Modellroute. Kauf oder Zahlung bleiben an explizite Spieleraktion und sichtbare Gegenpartei gebunden. `far_away` verhindert Teleport-Wiederbegegnungen.
- **Spielbarkeit.** Hoch. Behebt den in der Stichprobe häufigsten falschen Ablehnungsgrund.
- **Code.** `narration_evidence.js` von ≈ 600 auf ≈ 150 Zeilen. In `world.js` drei Pfade zu einem zusammengeführt.
- **Prompt, Modell, Calls.** X-Prompt etwas kürzer, ein Enum mehr. Keine zusätzlichen Calls, weniger Reparaturen.
- **Tests.** T2-Korpus Anwesenheit (§ 9.3). Die 24 Originalzitate als Regressionsliste (23 grün, Garrick rot). Tote, entfernte und wartende Personen als Negative.
- **Kanäle.** `aware`, `position` und `enter` ohne eigenes `seen` gelten wie heute als Anwesenheitsbehauptung und laufen durch dieselbe Zustandsprüfung. Der wörtliche Auszug ist Pflicht für Personen, die bisher nicht an diesem Ort geführt werden, sonst optional.
- **Migration.** Alte Records bleiben unverändert gefaltet. Fehlt `seen` in einer neuen `met`-Meldung, gilt die bisherige Bedeutung „hier jetzt“. So entsteht keine neue Ablehnungsquelle. `unsure`, `mentioned`, `remembered` und `away` werden nicht übernommen und lösen keine Reparatur aus.

### P2 · Ablehnungskaskade nach unbestätigter Ankunft begrenzen

- **Problem.** Eine abgewiesene Ankunft verwirft per `scene_context` auch Threads, Erinnerungen, Haltungen, `coin.gift` und Fakten ohne Ortsbezug (50 Ablehnungen, Hearth M65: `coin.gift`, `thread`, `fact`, `attitude`, `memory`).
- **Komponenten.** world.js L1186–1205 (`localSceneDelta`, `sceneMatches`, `chronology`).
- **Künftig.** Nur **ortsgebundene** Deltas folgen der Ankunft: `enter`, `person.new`/`creature.new` mit `present`, `offer`/`bid`, `object.new` am Ort, `feature`, `passage`, `position`/`aware`. Ortsunabhängige Deltas werden an der tatsächlichen Position übernommen oder, wenn sie eine dort nicht anwesende Person betreffen, über P1 geprüft.
- **Bleibt.** Kein Handel, keine Begegnung und kein Fund am nicht erreichten Ort.
- **Risiko.** Ein Thread „Madge sagte …“ wird übernommen, obwohl Alaric oben ist. Das ist vertretbar: Er bleibt als Erzählquelle mit Person und Ort erhalten, die Wissensbuchung prüft P1.
- **Code.** Klein (Klassifikation der Delta-Typen). **Tests.** Lantern/Hearth-Präfix: Anzahl übernommener ortsunabhängiger Deltas steigt, Anzahl gebuchter Ortsfolgen bleibt null.

### P3 · Delta-genaue Toleranz im Extractor

- **Problem.** Ein fehlerhaftes Delta macht die ganze Antwort ungültig. Eine Reparatur kostet ≈ 15.900 Inputtokens und 3–6 s.
- **Komponenten.** `extract.js parseExtraction` L596–817, `runtime.runExtraction` L1128–1235.
- **Künftig.**

```js
// parseExtraction liefert statt valid/invalid:
{ value, accepted: [...gültigeDeltas], dropped: [{index, errors}], expectedErrors, mechanicalErrors }
// Reparatur nur wenn: expected-Schlüssel einer gebuchten Spieleraktion fehlt/ungültig
//   ODER ein ungültiges Delta ist mechanisch: arrive, offer, bid, coin.gift, coerce, object.move zu/von pc,
//        hostile, quest.ready, party (NPC-eigene Entscheidung)
// Ein ungültiges fact/thread/memory/attitude/learn/position wird verworfen und protokolliert, keine Reparatur.
```

- **Bleibt.** Strenges Schema pro Delta, keine Rekonstruktion unklarer Felder, keine Teilbuchung abhängiger Vorgänge. `depends_on` und Quest-Abhängigkeiten bleiben atomar.
- **Risiko.** Weniger vollständige Erinnerungen bei schlechten Antworten. Vertretbar, das Archiv protokolliert sie.
- **Effizienz [Hypothese].** Von 22 reinen Schemareparaturen betrifft ein erheblicher Teil nicht-mechanische Deltas (`thread` ohne `text`, `learn` ohne `how`, `fact.o` null). Zusammen mit P4 halte ich 40–60 % weniger X-Reparaturen für realistisch. Das ist zu messen.
- **Tests.** Antworten mit einem ungültigen `fact` neben gültigem `arrive` und `offer`: alles Gültige wird gebucht, ohne Reparatur.

### P4 · Doppelmeldungen und Chronologie-Annotation abschaffen

- **Problem.** X muss `arrived` doppelt melden und jedem Delta vor einer Ankunft eine Szene zuordnen. 23 von 67 Reparaturen gehen darauf zurück.
- **Künftig.** Die Engine leitet die Abschnittszugehörigkeit aus `seq` ab: Deltas vor dem ersten `arrive` gehören zum Ausgangsort, danach zum erreichten Ort. X setzt `scene` nur, wenn es von dieser Ordnung abweicht, etwa bei Fernsichtung (`present:false`). `expected.go.arrived/at` wird aus dem `arrive`-Delta abgeleitet oder umgekehrt, nur noch eine Quelle.
- **Bleibt.** Chronologieschutz, also kein Ereignis am Ziel vor der Ankunft, jetzt deterministisch statt als Modellpflicht.
- **Risiko.** Ein X, das Deltas in falscher Reihenfolge schreibt. Heute führt das zu Reparatur, künftig zu Zuordnung zum falschen Abschnitt. Gegenmittel: Ortsgebundene Deltas mit expliziter Orts-ID (`at` bei `person.new`) haben Vorrang.
- **Prompt.** Die Regeln „TRAVEL CHRONOLOGY …“ und „Annotate events before the final arrival …“ entfallen weitgehend.

### P5 · Bewegungsklassifikation in die Engine verlagern

- **Problem.** Der Planner entscheidet zwischen `go <id>`, `go {new}` und `go {scene}` (lokaler Standpunkt), ohne die Ortsstruktur sicher zu kennen. Fehler hier sind die spielrelevantesten (Lantern, Rook, Linden). Die bisherigen Korrekturen sind Phrasen-Patches (§ 4.4).
- **Komponenten.** `commands.js go()` L657–686, `runtime.js` L394–410 (`moveHints`, `localApproach`), `known_routes.js`, `place_book.js`/`resolvePlaceRef`, Planner-Vokabular `content/commands.json`.
- **Künftig.** Der Planner meldet **Ziel in Spielerworten und ob es eine Ortsveränderung ist, die der Spieler will** (`go` mit `to: <id> | {words}`). Die Engine klassifiziert deterministisch:

```js
function classifyDestination(s, ref, ctx) {
  const known = resolvePlaceRef(s, ref, { from: s.scene.at });            // Ortsbuch (vorhanden)
  if (known.existing && known.existing !== s.scene.at) return { go: known.existing };
  const person = locationOfNamedPerson(s, ref);                             // vorhandene chosenKnownRoute-Logik
  if (person && person !== s.scene.at) return { go: person };
  if (paidRoomHere(s, ref)) return { go: { new: ref.words } };              // .247 ohne Regex: Leistung + Bezug
  if (observedHere(s, ref) || !ref.words) return { approach: ref };         // sichtbares Merkmal / Standpunkt
  return { go: { new: ref.words } };                                       // unbekannter Ort: bestehende GO-Regeln
}
```

- **Entfernen.** `explicitJourneyClause`, Zimmer-Regex L671, der Satzabgleich in `chosenKnownRoute` als Primärweg, `localApproach`-Heuristik und Planner-Regeln zur Unterscheidung Standpunkt/Ort.
- **Bleibt.** User16-Schutz: Tor ist nicht innen, Annäherung bucht keinen Dungeoneintritt. Der Dungeon-Eingang bleibt ein eigener Ort mit eigenen Regeln. Kein globaler Freibrief für alle Räume einer Siedlung: ein **unbekanntes** Ziel bleibt `{new}` mit normaler GO-Prüfung.
- **Risiko.** Ein Spieler, der „zum Tresen“ will, während der Tresen als eigener Ort gespeichert ist, würde einen GO auslösen. Das ist richtig, weil dort ein eigener Personenbestand gilt. Ein falsch angelegter Ort wird dadurch sichtbarer.
- **Spielbarkeit.** Hoch. Beseitigt die Klasse 3 → 9 an der Wurzel. **Prompt.** Planner-Prompt kürzer.
- **Tests.** Lantern M81/M83, Rook M9/M17, Linden M79, Hearth M85 mit unveränderten P-Antworten → GO. User16-Präfixe → weiterhin Approach am Tor. Die Probe-Sätze aus § 4.4 als T2-Korpus.

### P6 · Agency-Guard auf Verpflichtungen und Zustand reduzieren

- **Problem.** Der Guard trifft dieselbe Entscheidung wie der Planner-Prompt ein zweites Mal per Regex. Er hat nachweislich korrekte GO-Befehle entfernt. Seine Ausnahmeliste für Anreden wächst.
- **Komponenten.** `agency.js guardCommands` L327–384, Planner-Schema.
- **Künftig.** Jeder Planner-Befehl trägt `mode: "do" | "ask" | "plan" | "recall" | "other_actor"`. Die Engine bucht nur `do`. Der Guard prüft nur noch (a) ob das Zitat im Text steht (`no_evidence`), bei Verpflichtungen, und (b) Zustand (`not_held`, `same_message`, `redundant`, `not_paying`).
- **Entfernen.** `otherActor`/`npc_actor`, `planned`, `question`, `retrospective`, `purpose`, `negated` für Nicht-Verpflichtungen. Für `COMMITMENTS` zunächst behalten und nach Messung entscheiden.
- **Schutzwirkung.** Die P0-Begründung (13 falsche Befehle auf 256 Nachrichten) stammt von einem älteren Interpreter [Bericht]. Für Verpflichtungen bleibt die zweite Linie. Bei `go`/`activity` ist ein falscher Befehl umkehrbar und durch PULSE/GO-Regeln begrenzt. Ein falsch verweigerter Befehl erzeugt dagegen Divergenz.
- **Tests.** AJ M23, Hazel M23 → GO bleibt. Synthetische Negative („Ossen walks to the chapel.“ → `mode: other_actor`) im T2-Korpus des Planners.

### P7 · Party ohne X-Rückübersetzung im Standardpfad

- **Problem.** X meldet `party`-Deltas auch für gewöhnliches Gespräch. Die Sprecherprüfung verwirft echte und unechte Zusagen gleichermaßen.
- **Künftig.** Beitritt, Warten, Folgen und Auflösen laufen ausschließlich über native/HUD-Aktionen und die strukturierte `party_decision`. Diese existieren seit .236. X darf nur **NPC-eigene** Änderungen melden (`leave`, ausdrückliche Ablehnung weiterer Zusammenarbeit), geprüft über P1-Logik und Zustand. Sondervergütungen laufen über die strukturierte Entscheidung, nicht über Prosa.
- **Entfernen.** `evidenceOf`/`unchangedAnswer` auf dem Standardpfad, X-`party` für `offer`/`accept`/`follow`/`wait`/`coordinate`.
- **Bleibt.** Eigentumszustimmung, individuelle Kampfentscheidung, Ansprüche, Tod.
- **Tests.** Bestehende .236–.250-Partyabnahmen. Hazel M23 (Folgen) nativ.

### P8 · Desk-Zeugen deterministisch zuordnen

Wird ein enginegebuchter Desk-Schritt (Annahme, Abgabe) ausgeführt, erhält der **anwesende Gildenmitarbeiter dieser Halle** die Wissensbuchung, bei mehreren der zuletzt im Gespräch beteiligte. `deskHandlingEvidence` und `guildParticipationEvidence` entfallen. Kein Spielrisiko, weniger Code, eine Regel weniger im X-Prompt (`handled_by`).

### P9 · Preisprüfung vereinfachen (fachliche Entscheidung)

- **Variante a (klein).** `said` darf eine Zahl ohne Münzwort enthalten, wenn im **selben Satz oder derselben Angebotszeile** ein Münzwort steht (Martin M11: „eight silver … twelve“).
- **Variante b (größer, Kanonfrage).** Für reguläre Angebote reicht `price_cp` mit wörtlichem Zahlenauszug. Die eigentliche Verbindlichkeit entsteht durch die **sichtbare HUD-Karte und die explizite Annahme**. Der Kanon fordert heute eine ausdrücklich genannte Endsumme (§ 2 „Freie Zahlungen/Endpreis“). Variante b erfordert eine Kanonentscheidung.
- **Bleibt.** Keine Stück- oder Positionsrechnung aus Prosa, keine stillen Teilkäufe, `max_cp`.

### P10 · Konsistente Rückmeldung jeder szenenwirksamen Ablehnung

Jede Ablehnung, die die Szene anders lässt als erzählt (Anwesenheit, Ankunft, Angebot), erzeugt eine kurze `correction` für den nächsten Narrator-Block. Heute fehlt das bei `met_evidence`, bei `enter` ist es vorhanden. Nach P1 sind solche Ablehnungen selten, wenn sie vorkommen, sollen sie aber nicht still bleiben.

### Nicht empfohlen

| Idee | Grund |
|---|---|
| Fuzzy-Matching für IDs, Beträge, Ziele | Verwechslungsrisiko bei Identität und Geld (Konsens mit GPT) |
| Regex-Key-Value statt JSON | Verschachtelte Angebote, Abhängigkeiten und Referenzen brauchen Struktur. Das Parsen ist nicht das Problem. |
| Erzählte Ankunft generell vertrauen (.208 C) | Negativproben belegen Fehlzulassungen nicht gewählter Reisen [Bericht]. |
| Weitere Verben/Wortlisten in `HERE_DOES`, `DEPICTED` usw. | Setzt die Schleife fort |
| Engineseitige Standardanwesenheit von Ladeninhabern ohne Erzählung | Leere Stände und Tagesabläufe würden falsch. Das Modell kann es besser lesen. |

---

## 7. Vergleich der Architekturvarianten

| Variante | Spielbarkeit | Schutz | Komplexität | Prompt/Calls | Migration | Urteil |
|---|---|---|---|---|---|---|
| **V0** Status quo + Einzelfixes | Fällt weiter an neuen Formulierungen | inkonsistent (§ 3.2) | steigt | steigt | keine | **nein** |
| **V1** „Claim + State“ in P/N/X (P1–P10) | deutlich besser | gleich oder besser für echte Invarianten, konsistent für Präsenz | sinkt spürbar | X/P-Prompts kürzer, weniger Reparaturen | mittel (Tests, Fingerprints) | **empfohlen** |
| **V2** Narrator + Extractor in einem Call (Prosa + strukturierter Weltbericht) | gut, eine Wartestufe weniger | ähnlich V1 | mittel | ein Call weniger je Zug, aber größerer Narrator-Prompt | groß (Streaming, Swipe, Revision, Contract) | erst **nach V1** als Experiment, bei P0/S2 bewusst getrennt [Bericht] |
| **V3** Engine-first: NPC-Tagesabläufe, deterministische Anwesenheit | sehr vorhersehbar | hoch | hoch (Simulation) | weniger X | sehr groß | **nein**: widerspricht Kanon § 10 („keine umfassende NPC-Simulation“) |
| **V4** Planner abschaffen, Narrator entscheidet | frei | **zu schwach** für Kampf, Geld, Reise | geringer | weniger Calls | sehr groß | **nein** |
| **V5** Nur mehr HUD/native Aktionen | gut für Routine | hoch | gering | weniger Calls | gering | **ergänzend**: richtig für Organisation, aber kein Ersatz für Freitext (Nutzerwunsch) |

**P/N/X bleibt langfristig sinnvoll.** Die Trennung schützt die Spielerhoheit: Entscheidungen vor der Prosa, Mechanik durch die Engine, Weltfolgen danach. V1 korrigiert nicht die Kette, sondern die Zuständigkeit innerhalb der Kette. V2 kann später die Latenz senken, wenn V1 die semantischen Nachprüfungen entfernt hat. Vorher würde V2 nur dieselben Prüfungen auf einen anderen Call verschieben.

---

## 8. Auswirkungen auf Spielgefühl und technische Effizienz [Hypothese, auf Stichprobe gestützt]

| Bereich | Erwartete Wirkung |
|---|---|
| Natürliches Rollenspiel | Rückkehr zu Händlern, Wirtsleuten, Gildenschaltern und Gefährten funktioniert unabhängig von Satzbau. Ortswechsel per Freitext werden über das Ortsbuch erkannt, nicht über Wortlaute. |
| Folgeschäden | Ablehnungskaskaden über mehrere Züge (Lantern) werden auf ortsgebundene Folgen begrenzt. |
| Wartezeit | X-Reparaturen kosteten in der Stichprobe 59 zusätzliche Calls (≈ 3–6 s je Fall). P3/P4 sollten einen großen Teil davon vermeiden. |
| Tokens | X-Reparaturen ≈ 22 % der X-Inputtokens der Stichprobe. Zusätzlich schrumpfen X- und P-Prompts, weil Regeln entfallen, die nur parserfreundliche Zitate erzwingen sollen. |
| Modellabhängigkeit | Sinkt bei Formdetails (Zitate, Chronologie), steigt leicht bei Klassifikation (`seen`, `mode`). Diese Klassifikation ist messbar (T2) und für LLMs einfacher als parsergerechtes Zitieren. |
| Code | `narration_evidence.js` −≈ 450 Zeilen, `agency.js` −≈ 150, Bewegungsheuristiken −≈ 60, `party.js` Standardpfad deutlich kleiner, `world.js` drei Präsenzpfade zu einem. Wichtiger als die Zeilenzahl: weniger Stellen, die dieselbe Frage beantworten. |

---

## 9. Bewertung und Weiterentwicklung der Teststrategie

### 9.1 Was die Tests heute schützen [geprüft]

| Gruppe | Beispiele | Bewertung |
|---|---|---|
| **Echte Invarianten** | `tests/replay/fold_integrity.test.js`, Ownership-Assertion (`assertOwnership`), Kampfsimulation `tests/sim`, Finanz-/Doppelbuchungstests (`fix142_finance` ff.), Revision/Swipe (`continuity211_revisions`, `action_persistence`), Partyabrechnung | **beibehalten**, Kern der Abnahme |
| **Historische Sprachinterpretationen** | `npc_e2a170.test.js`: 5 positive Formulierungen, die der Parser kennt, 10 negative. Natürliche Positive wie „was still at the counter“ fehlen, obwohl sie im Archiv scheitern. Dazu `pilot01_k4_evidence`, `patch_protect107–110`, Agency-Tests zu `npc_actor`, Live-Fixtures mit exakten Ablehnungen | **ersetzen** durch gelabelte Korpora (T2) |
| **Exakter Replay** | `tools/replay/replay.mjs`: vergleicht Events (Reihenfolge, IDs, RNG-Positionen), Corrections und Rejected exakt mit einer .126-Baseline. 10 Läufe b16–b19, 2.235 Fälle. 38 `accepted_*.json` mit zusammen 21.567 Einträgen. 1.386 akzeptierte Abweichungen | **Änderungsdetektor, kein Korrektheitsorakel** |

Von 3.199 Testtiteln in `tests/` beschreiben 547 eine Ablehnungserwartung (refus/reject/not booked/never/…). 314 nennen einen konkreten Lauf (live/batch/User/T-Nummer). Das zeigt: Die Suite ist überwiegend aus Vorfällen gewachsen [geprüft, grobe Titelzählung].

### 9.2 Kernprobleme

1. **Falsche Ablehnungen werden nicht gemessen.** Kein Test und keine Kennzahl erfasst, wie oft eine korrekte Meldung verworfen wird. Grün bedeutet nur: Nichts hat sich gegenüber dem akzeptierten Zustand verändert.
2. **Ein grüner Fingerprint kann einen Fehler konservieren.** Würde Martin M17 in den Replay-Korpus aufgenommen, wäre die falsche `met_evidence`-Ablehnung Teil der erwarteten Ausgabe. Jede Lockerung erschiene als „neue Abweichung“.
3. **Asymmetrische Beweislast in der Abnahme.** Eine neue Ablehnung braucht einen Test, eine entfernte Ablehnung braucht dagegen die Begründung jeder geänderten Ereignisfolge. Das begünstigt Ergänzungen und erschwert Vereinfachungen.

### 9.3 Vorschlag: drei Testebenen

**T1 – Harte Invarianten (müssen grün bleiben).** Fold-Gleichheit, keine Doppelbuchung von Geld, XP und Beute, Eigentum nur mit Zustimmung, Kampfdeterminismus, Revision, Swipe und Edit, Reisezeit und Mitreisende, Dungeon-Slots, Queststatus und Auszahlung. Bestehende Tests weitgehend übernehmen.

**T2 – Gelabelte Sprachkorpora mit Fehlerraten.** Für jede Sprachentscheidung zwei Listen, positiv und negativ. Gemessen werden FN- und FP-Rate gegen festgelegte Schwellen.

| Korpus | Positive (müssen durchgehen) | Negative (müssen scheitern) |
|---|---|---|
| Anwesenheit (P1) | 24 Originalzitate (§ 4.2), § 4.3-Positivliste, Varianten mit Pronomen, Possessiv, Inversion, Beschreibung statt Rolle, Tätigkeitsverben | leerer Stand, „had left before“, Bild/Schild, Erinnerung, Hypothese, Hörensagen, Dialogerwähnung, Lehrling statt Meisterin, tot, andere Siedlung ohne Ankunft, Party-Mitglied wartet anderswo |
| Bewegung (P5) | Probe-Sätze § 4.4, Lantern/Rook/Linden/Hearth-Originale | Frage („Should I go to the market?“), Plan („Tomorrow I'll …“), Erwähnung, NPC-Handlung, Blick über eine Grenze, Dungeon-Tor |
| Planner-Modus (P6) | Vokative mit Aufbruch, gemeinsame Aufbrüche | „Ossen walks to the chapel.“, Fragen, Erinnerungen, Negationen |
| Party (P7) | native Einladung → Zusage, Folgen, Warten | Gespräch über Beute ohne Angebot, fremder Sprecher, geänderte Bedingungen |
| Preis (P9) | Ellipse in derselben Zeile | Stückpreise ohne Summe, Preis aus anderem Satz |

Die **Engine-Seite** wird offline mit eingespeisten X/P-Antworten geprüft, ohne Kosten. Die **Modellseite**, also ob X richtig klassifiziert, wird einmal pro Modellroute mit einer kleinen bezahlten Stichprobe gemessen. Diese braucht eine eigene Freigabe.

**T3 – Replay als kategorisierter Differenzbericht.** Statt „keine neue Abweichung“ klassifiziert der Replay jede Abweichung automatisch:

- *mehr übernommene Weltmeldungen, Invarianten grün* → informativ
- *weniger übernommene Meldungen* → Prüfung
- *mechanische Änderung* (Geld, XP, Besitz, Ort, Kampf, Zeit) → explizite Freigabe

Nach P1–P4 wird **einmal** dokumentiert neu baselined, mit Kategorienbericht und ohne pauschales Neuschreiben.

### 9.4 Testerwartungen, die sich fachlich ändern würden

- `met`-Ablehnungen natürlicher Positivsätze: Erwartung kehrt sich um.
- `npc_actor`-Drops von Vokativen mit `go`/`party`: entfallen (Planner-Modus).
- Party-Sprechertests auf dem Standardpfad: ersetzt durch „Entscheidung des richtigen Kandidaten zur aktuellen Offerte“. Das hat .235 bereits so vorgeschlagen [Bericht].
- `scene_context`-Erwartungen für ortsunabhängige Deltas nach abgelehnter Ankunft: kehren sich um (P2).
- Reparaturerwartungen für nicht-mechanische Schemafehler: werden zu „verworfen, keine Reparatur“ (P3).
- Exakte Correction-Texte: nur noch bei mechanisch relevanten Korrekturen prüfen.

**Nicht entfallen dürfen** T1-Tests sowie Negativfälle, deren Schutz in eine andere Form übergeht. Diese werden **umgeschrieben, nicht gelöscht**, etwa der Fall „Verkäuferin tot“ als Zustandstest statt als Satztest.

---

## 10. Bevorzugte Zielarchitektur

```
Spieler ── Freitext ──► P  (Absicht strukturiert: Typ, Ziel in Spielerworten/ID, mode, needs)
        └─ HUD/native ─────────────────────────────┐
                                                   ▼
                       ENGINE  (deterministisch)
                       • Ziel-/Ortsklassifikation über Ortsbuch (P5)
                       • Autorisierung, Kampf, Geld, Zeit, Reiseabschnitte, PULSE
                       • strukturierte NPC-Entscheidung bei offener sozialer Frage (Party)
                                                   ▼
                       N  (Prosa innerhalb PLAYER ACTIONS; einheitliche Annahmen zur Anwesenheit)
                                                   ▼
                       X  (strukturierte Meldungen + Klassifikationen: seen/arrives, keine Parser-Zitate)
                                                   ▼
                       WORLD (deterministisch, je Delta):
                       • Zuständigkeit (Firewall nach Typ)       • Zustand (tot, gebunden, fern, Besitz)
                       • Identität (ID, keine Fuzzy-Zuordnung)   • Abhängigkeiten (atomar, depends_on)
                       • keine englische Satzanalyse – Ausnahme: erzwungene Verlagerung
                                                   ▼
                       Events → Fold → HUD · Korrekturen an N bei jeder szenenwirksamen Ablehnung
```

| Frage | entscheidet | Form |
|---|---|---|
| Was will der Spieler? | Planner-LLM, bei Routine HUD | strukturierter Befehl mit `mode` |
| Darf und kann das jetzt passieren? | Engine | Zustand und Regeln |
| Wie klingt es? | Narrator | Prosa |
| Was hat die Prosa an der Welt gezeigt? | Extractor-LLM | strukturierte Meldung mit Klassifikation |
| Ist das mit dem Zustand vereinbar? | Engine | Zustandsprüfung |
| Bindet es Alaric? | Spieler | Planner `do`, HUD-Annahme, native Aktion |

---

## 11. Priorisierter Implementierungs- und Abnahmeplan

Jede Stufe ist ein eigener Codex-Auftrag mit Rot-auf-.251 / Grün-auf-Kandidat und Negativproben. Kostenpflichtige Modelltests erst nach Offline-Abnahme und eigener Freigabe.

| Stufe | Inhalt | Nutzen / Risiko | Abnahme |
|---|---|---|---|
| **0** (vorbereitend, parallel) | T2-Korpora Anwesenheit und Bewegung anlegen, auf .251 ausführen und die heutigen FN/FP dokumentieren. T3-Kategorisierung im Replay-Werkzeug. | Messbarkeit / keins | Bericht mit Ausgangswerten. Keine Produktänderung nötig. |
| **1** · wesentlicher Architekturgewinn | **P1** Präsenzregel, **P2** Kaskade, **P10** Rückmeldung | hoch / mittel | 23 Originalzitate grün, Garrick rot. Negativkorpus grün. Martin M17 → Lederarbeiterin anwesend, Folgekauf aus Offerte buchbar (eingespeiste Antworten). Lantern-Präfix: ortsunabhängige Deltas übernommen, null Ortsfolgen am nicht erreichten Ort. T1 grün. T3-Bericht. |
| **2** · gezielte Vereinfachung | **P3** Delta-Toleranz, **P4** Chronologie/Doppelmeldung | hoch für Kosten / gering | Archivierte Reparaturfälle: Erstantwort lokal übernommen, wo nur nicht-mechanische Fehler vorlagen. Zählung der vermiedenen Reparaturen aus den 67 Requests. T1 grün. |
| **3** · wesentlicher Architekturgewinn | **P5** Bewegungsklassifikation, **P6** Planner-Modus/Guard | hoch / mittel | Lantern M81/M83, Rook M9/M17, Linden M79, Hearth M85, AJ/Hazel M23 mit Original-P → GO. User16-Präfixe unverändert geschützt. Bewegungskorpus. `explicitJourneyClause` und Zimmer-Regex entfernt. ST-Smoke wegen Planner-Vertrag. |
| **4** · kleinere Bereinigungen | **P7** Party, **P8** Desk, **P9a** Preis-Ellipse | mittel / gering | .236–.250-Partyabnahmen grün. Martin M11 zweite Stiefelzeile bepreist. Desk-Wissen gebucht. |
| **5** · Teststrategie | T1/T2/T3 als reguläre Abnahme, einmaliger dokumentierter Re-Baseline | Wartbarkeit / gering | Kategorienbericht ohne unerklärte mechanische Änderung |
| **später** | Bezahlte Kleinstichprobe je Modellroute für `seen`/`mode`-Klassifikation. V2-Experiment (N+X). Prompt-Verschlankung. `applyWorld` aufteilen. Legacy-Zweige (§ 13) | – | eigene Freigabe |

**Zu hoher Aufwand bei zu geringem Nutzen:** V3 (NPC-Simulation), vollständiger Neubau, Umstellung des Ausgabeformats, Fuzzy-Matching.

**Revisions- und Migrationsaufwand.** Neue Felder (`seen`, `arrives`, `mode`) sind optional lesbar. Alte Records falten unverändert. Regeneration oder Swipe einer alten Antwort nutzt den neuen Vertrag. Narrator Contract bleibt `.211` bis auf die Präsenzannahme in `commands.js` L868, die zu P1 passt und erhalten bleiben kann. Character Card, Preset, Lorebook und Regex sind nicht betroffen.

---

## 12. Offene fachliche Entscheidungen für Nutzer und GPT

| # | Frage | Meine Empfehlung |
|---|---|---|
| D1 | Darf eine bekannte, lebende NPC am selben Ort allein auf eine strukturierte X-Klassifikation `here_now` plus wörtlichen Auszug wieder anwesend sein, ohne grammatischen Beleg? | **Ja** (P1) |
| D2 | Wie streng soll die Entfernungsplausibilität sein? Andere Siedlung nur mit `arrives:true`, oder zusätzlich Reisezeit? | `arrives:true` genügt zunächst, Reisezeit später |
| D3 | Sollen ortsunabhängige Meldungen nach abgelehnter Ankunft übernommen werden? | **Ja** (P2) |
| D4 | Soll der Planner die Unterscheidung Standpunkt/Ortswechsel abgeben und die Engine über das Ortsbuch entscheiden? | **Ja** (P5) |
| D5 | Agency-Sprachheuristiken für Nicht-Verpflichtungen entfernen und durch `mode` ersetzen? Ein seltener Planner-Fehler würde dann eine umkehrbare Bewegung buchen. | **Ja**, Verpflichtungen bleiben geschützt. |
| D6 | Preis: Ellipse zulassen (P9a) oder HUD-Annahme als alleinige Bindung (P9b, Kanonänderung)? | **P9a jetzt**, P9b separat entscheiden |
| D7 | Test-Re-Baseline nach Stufe 1–2 mit Kategorienbericht genehmigen? | **Ja**, mit T1 als harter Grenze |
| D8 | Darf X NPC-eigene Party-Austritte melden? | **Ja**, über P1-Zustandsprüfung |
| D9 | Bleibt die erzwungene Verlagerung (`forcedRelocation`) streng? | **Ja**, bewusst die Ausnahme |

---

## 13. Zusätzliche unabhängige Befunde

Getrennt von der Hauptfrage, nach praktischer Relevanz geordnet. Keiner dieser Punkte erfordert einen sofortigen Patch.

1. **`applyWorld` ist eine einzige Funktion von ≈ 3.700 Zeilen** (world.js L280–≈4015) mit über 60 verschiedenen Ablehnungsregeln und 191 Patch-/Livetest-Verweisen. Neue Regeln lassen sich kaum isoliert prüfen oder wieder entfernen. Vorschlag für später: Handler je Delta-Typ und ein **Regelregister** (Regel-ID, Zweck, Ursprungsfall, Schutzziel, Test, Ablaufkriterium). So lässt sich jede Regel fachlich prüfen und gezielt stilllegen. Das ist der wirksamste Hebel gegen künftige Mini-Fix-Ansammlungen.
2. **Promptgrößen [geprüft am Martin-Request, Zug 5].** Planner-System ≈ 47 KB für einen einfachen GO, Narrator ≈ 54 KB gesamt, Extractor ≈ 62 KB. In der Stichprobe durchschnittlich ≈ 13.500 Inputtokens je Planner- und ≈ 15.400 je Extractor-Call. Ein spürbarer Teil der Regeln existiert, um parserfreundliche Ausgaben zu erzwingen, und entfällt mit P1–P6.
3. **Altpfade.** `world.js` enthält 80 `cPath`- und 42 Ruleset-Verzweigungen, `commands.js` weitere 40. Kanon § 0 verlangt keine Unterstützung für Ruleset 1 und frühere Varianten. Der Replay-Korpus (b16–b19, Ruleset 2, Build 4.2.0) benötigt Ruleset 1 nicht, wohl aber die Vertragskonvertierungen (`contract_c.mjs`, `contract_f.mjs`). Eine Bereinigung ist möglich, aber erst nach T3 sinnvoll, und gemeinsam genutzte Funktionen müssen bleiben (Kanon § 0).
4. **Schlüsselwortlisten mit Kollateralschäden** außerhalb der Präsenz, etwa `ANCHOR_*`, `LASTING_MARK`, `SIGN_OFF` in world.js und `PC_ACT_WORDS` in firewall.js. Sie sollten im Regelregister mit Ablaufkriterium geführt werden.
5. **Narrator liest den Spielertext ungefiltert.** Das ist für die Erzählqualität richtig. Es bedeutet aber, dass jeder Planner-Fehler zu einer Divergenz wird. P5/P6 verringern die Fehler. Zusätzlich könnte der Engine-Block bei „NOTHING TO BOOK“ und erkennbarer Bewegungsabsicht eine ausdrückliche Zeile „not travelling this turn“ erhalten. Das wäre billig, aber nur ein Notbehelf.
6. **Divergenzmonitor für Tests (nicht als Gate).** Ein Diagnosewerkzeug, das in Testläufen markiert, wenn die Erzählung eine bekannte Person namentlich oder per Rolle in der Szene zeigt und der Zustand sie nicht enthält. So werden falsche Ablehnungen in Modellläufen sichtbar, ohne erneut eine Sprachprüfung in den Produktpfad zu bringen.
7. **Wartezeit nach der Prosa.** In Martin vergehen 4–7 s zwischen Prosa und Weltcommit (`extraction_validation_wait_ms`), bei Reparaturen mehr. Das bestätigt den Nutzen von P3/P4 und rechtfertigt später V2.

---

## Anhang A · Reproduktion

Alle Skripte liegen in [claude_251_analyse/](claude_251_analyse/) und lesen nur. Die Engine-Proben benötigen einen Checkout von `4933a5f0`:

```bash
git worktree add --detach ../avereth-251 4933a5f005a86a381a922981d3d7377e8ba84b5c
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

```bash
python3 -I recherche/claude_251_analyse/tally_runs.py testrun_10b 'openrouter-20261127-*' --examples met_evidence no_go
```

```bash
python3 -I recherche/claude_251_analyse/repair_triggers.py testrun_10b
```

```bash
python3 -I recherche/claude_251_analyse/met_quotes.py testrun_10b
```

```bash
python3 -I recherche/claude_251_analyse/dump_run.py testrun_10b/openrouter-20261127-martin-251 8
```

Das vollständige Ausgabeprotokoll steht in [ERGEBNISSE.txt](claude_251_analyse/ERGEBNISSE.txt). **Zählregel:** Je Arm werden nur die letzten N Narrator-Antworten gezählt, N = Anzahl der Narrator-Requests in `requests.jsonl.gz`. Gemeinsame Präfixe zählen so nicht doppelt. Antworten ohne Narrator-Request (rein lokale Aktionen) sind nicht enthalten.

## Anhang B · Herangezogene Quellen

[Diskussionsgrundlage](AVERETH_251_VALIDIERUNGSARCHITEKTUR_DISKUSSION_2026-11-27.md) · [Arbeitsweise](../01_ARBEITSWEISE_GPT_CODEX.md) · [Kanon](../02_DESIGN_KANON.md) · [Projektstand](../03_AKTUELLER_PROJEKTSTAND.md) · [.245–.251](AVERETH_245_ORTSSTEUERUNG_UND_SPIELTESTS.md) · [.235 Party-Gegenreview](AVERETH_235_PARTY_GEGENREVIEW_UND_ENTSCHEIDUNGSVORLAGE.md) · [.208 Firewallvergleich](USER11_208_FIREWALLVERGLEICH.md) · [User16-Entscheidungsvorlage](AVERETH_USER16_ORTS_UND_SZENENARCHITEKTUR_ENTSCHEIDUNGSVORLAGE.md) · Originalarchive [Martin](../testrun_10b/openrouter-20261127-martin-251/), [Reed](../testrun_10b/openrouter-20261127-reed-251/), [Elm](../testrun_10b/openrouter-20261127-elm-250/), [Lantern](../testrun_10b/openrouter-20261127-lantern-244/), [Hearth](../testrun_10b/openrouter-20261127-hearth-243/), [Rook](../testrun_10b/openrouter-20261127-rook-250/), [AI](../testrun_10b/openrouter-20261127-ai-235/), [AJ](../testrun_10b/openrouter-20261127-aj-235/), [Hazel](../testrun_10b/openrouter-20261127-hazel-248/) sowie alle übrigen `openrouter-20261127-*` für die Zählung. Produktdateien jeweils auf [`4933a5f0`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/4933a5f005a86a381a922981d3d7377e8ba84b5c/avereth-engine/src).
