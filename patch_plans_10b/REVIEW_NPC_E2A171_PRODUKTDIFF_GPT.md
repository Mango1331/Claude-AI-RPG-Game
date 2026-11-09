# GPT – gezielter unabhängiger Produktdiff-Kontrollreview .171, NPC E2-A (09.11.2026)

**Urteil: E2-A aus Sicht des gezielten Produktreviews technisch abgeschlossen, kein zusätzlicher verpflichtender P2-Hotfix vor dem separaten Paket E2-B.** Die beiden zuvor gefundenen falschen `met`-Eintritte (schon früher abgereister Clerk; zuerst anwesend, dann vor Ankunft abgereist) sind im tatsächlich ausgeführten `.171`-Belegpfad geschlossen. Verbleibende konservative **False Negatives** der Pronomen-/Rückkehrheuristik sind **P3-Naturtestbeobachtung**, keine neue automatisierte Bugfixschleife. Noch keine freie Modellvalidierung, und E2-B/E3 bleiben nicht implementiert.

## 1. Produktdiff und Prüfgrenze

Produktbasis [`.170 / 317ca09`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/317ca09eb079266be5d323d7a4fb9205b57ca907) → [`.171 / 4980db1`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4980db1b7ef2f449951882082afb661453a7cb00). GitHub-Compare **2 Commits vorwärts, 0 zurück**, keine Produkt-/Quellrücknahme. [`c7c046c` Fix/Regressionen](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c7c046c7d17c94a52be16ae884e6838843f918be), [`4980db1` Build/Patchnote/Host](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4980db1b7ef2f449951882082afb661453a7cb00).

Runtimeänderung **nur `src/v4/narration_evidence.js`** mit `leftBeforeHim` und `presentHere`-Positionsrückgabe sowie einer zusätzlichen `self`-Übergabe in `world.js::metArrivals`. Neue vier Node-Regressionsfälle in `tests/v4/npc_e2a171.test.js`; zwei neue geskriptete ST-Hostprüfungen. Keine Änderung an `enter`, `handled_by`, Gildenzeugen, Gruppenidentität, Quest-/Kampf-/Dungeon-/PULSE-Mechanik, Narrator-/Extractorvertrag oder Schema.

**Eigene Prüfung:** Zwei Git-Commits/gesamter Diff, `narration_evidence.js`, `world.js`-Aufrufpfad, die 4 neuen Node-Tests, ST-Test, Patchnote und die komplette Replayakzeptanzblob wurden eingesehen. Die **unveränderte tatsächliche `.171`-`metEvidence`-Funktion** (inkl. `presentHere`, `leftBeforeHim`, `personProfile`, `narratedEvent`) aus dem Produktquelltext wurde **isoliert in JavaScript-V8** mit dem Original-`normText`-Verhalten und für die Funktion irrelevanten `coinFromWords`-Stub ausgeführt; **kein** erneuter eigener `playerTurnV4 → replyTurnV4`, vollständiger Node-, ST-, Provider- oder Runtime-Replaylauf.

## 2. Geprüfte Fehlerkorrektur

Der neue `metEvidence`-Pfad prüft nach bestätigtem Erzähl-/Identitäts-/positivem Präsenzbeleg nun **den weiteren Originalantworttext**, nicht bloß das vom Extractor ausgeschnittene Belegfragment:

- `presentHere` gibt die Position des gültigen Präsenzverbs zurück.
- `leftBeforeHim(prose,quote,at,id,people)` läuft von diesem Punkt durch den Rest des Satzes, hält das aktuelle Subjekt fest, erkennt entsprechend eng definierte Abreise- und Rückkehrverben und wertet in späteren Sätzen ausdrücklich vor der Ankunft erwähnte Abreisen.
- Eine nachfolgende Abreise **derselben Person** vor Alarics Ankunft hebt den früheren positiven Präsenzbeleg auf; eine belegte Rückkehr kann ihn wieder gültig machen. Eine **andere Person** darf fortgehen, ohne die erste aus dem Kontext zu entfernen.
- Bei einem gültigen R1-Fall bleibt die vorhandene GO-/`known_at[seq]`-/identifizierte Personen-/Zielortvalidierung in `metArrivals` weiterhin der Autoritätsfilter.

**Eigene isolierte Gegenprobe:**

| Narration / Extractorbeleg | `.171` tatsächliche `metEvidence` | Bewertung |
|---|---|---|
| `The clerk stood behind the counter and left before Alaric arrived`, kurzes oder vollständiges Zitat | `ok:false` | korrekt, bisheriger P2 geschlossen |
| `The clerk stood behind the counter, then left before Alaric arrived` | `ok:false` | korrekt |
| `The clerk stood behind the counter. She had left before Alaric arrived` | `ok:false` | korrekt |
| `The clerk stood behind the counter and waved` | `ok:true` | korrekt |
| `The clerk stood behind the counter and left the ledger open` | `ok:true` | korrekt |
| `The clerk stood behind the counter. Later that evening she went home` | `ok:true` | laut fachlicher Trennung: Begegnung, danach eigener Abgang |
| `The clerk stood behind the counter, then left for the archive, but returned before Alaric arrived` | `ok:true` | korrekt |
| `The clerk stood behind the counter. The stocky man with the crossbow left before Alaric arrived` | `ok:true` | korrekt |

Die Ausführung entspricht den tragenden Rot-/Grün-Regressionsfällen. Der tatsächlich autorisierte World-Eintritt wird mit Claudes echten Spielerzug-/World- und ST-Tests abgedeckt, nicht eigenständig von GPT neu ausgeführt.

## 3. Bewusstes P3-Risiko: konservative Falsch-Negative der Rückkehrzuordnung

Eine weitere isolierte `.171`-Probe ergibt für

- `The clerk stood behind the counter and left before Alaric arrived. Then she returned.`
- `The clerk stood behind the counter. She had left before Alaric arrived but came back.`

je `ok:false`, obwohl die Rückkehr anschließend erzählt wird. **Ursachenhinweis im Quelltext:** Beim Durchlauf des Abreisesatzes wird `Alaric` als zuletzt erwähnter nominaler Akteur geführt. Das spätere `she` wird dann mangels Geschlechts-/Diskurszuordnung nicht sicher als der Clerk erkannt; `gone` bleibt gesetzt. Das ist ein **False Negative** (die Person kommt trotz möglicher belegter Rückkehr nicht per `met` herein), keine neue positive Falschanwesenheit. Es liegt in der bewusst konservativen Wort-/Pronomenheuristik und wird als **P3-Beobachtung** für natürliche Nutzerruns festgehalten. Der generelle ältere `enter`-Pfad und das Fehlen eines `met`-Feldes können solche Züge unabhängig betreffen. Kein ungefragter `.172`-Zwischenbuild: Enger Fortschritt ohne unbegrenzte Wortlisten-/Pronomenpatchserie.

Die natürliche Präzision/Recall-Rate der `met`-/`handled_by`-Felder bleibt unbekannt. Geskriptete Providerantworten beweisen technische Integration, nicht freie semantische Auswertung. Auch die ältere `enter`-Regel ohne Erzählbeleg für am Ort belassene NPCs bleibt fachplanbeschlossen (D12).

## 4. Replay- und Abnahmestand

**Unabhängiger Git-Blob-Abgleich:** `tests/replay/accepted_e2a169_vs_126.json` auf .170 und .171 **identisch**, SHA `64d3b7ed642d657055e702c98eb8a963f8cf19f2`; weiterhin **1041** Akzeptanzeinträge. Kein stiller Acceptance-Wechsel; das ist kein unabhängiger 2235er-Replaylauf.

**Implementiererangaben von Claude**, nicht erneut von GPT ausgeführt: neue `.171`-Regressionen **4/4** (auf unverändertem .170 3/4 rot), gesamte E2-A **29/29**, vollständiges `npm test` **2944/2944**, Gesamtreplay **2235 Fälle / 1041 exakt akzeptiert / 0 offen**, ST1.19 Standard und Failsoft jeweils **OK** mit zwei neuen Hostchecks; unveränderte Kontext-/Promptkosten, keine zusätzlichen Modellcalls. Fix und Positivkontrollen sind in `avereth-engine/docs/NPC_E2A171_MET_SEQUENCE.md` dokumentiert.

## 5. Abschluss und nächste Arbeit

**Technischer E2-A-Entwicklungsabschnitt (Builds .169/.170/.171) im Umfang der freigegebenen Regeln R1–R5 und der eingegrenzten Korrekturen abgeschlossen.** Weitere globale NPC-Architekturstudien oder spontane neue E2-A-Hotfixes sind nicht erforderlich, solange kein neuer konkret blockierender Befund aus einem natürlichen Spieltest oder Regression vorliegt.

**E2-B bleibt ein eigenständiges, noch nicht implementiertes Paket** aus [`NPC_E2_E3_FACHPLAN.md`](NPC_E2_E3_FACHPLAN.md), mit offenen **sozialen Nutzerentscheidungen D1, D4 und D6** (Anzeige offener persönlicher Absprachen, Verbleib erledigter Absprachen auf der Karte, ausdrückliches aufgeschobenes Angebot als Absprache). D9/D12 wurden für E2-A gemäß bisherigen Regeln nicht verändert. Erst nach ausdrücklicher E2-B-Freigabe beginnt die Implementierung; danach wieder eigener Produktdiff-Review. E3 und PULSE D bleiben separat.

**Produktstand zum Review:** `.171`/`4980db1`. Nur Dokumentation geändert.
