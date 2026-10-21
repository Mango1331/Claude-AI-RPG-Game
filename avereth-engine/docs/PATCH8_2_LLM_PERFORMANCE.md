# Patch 8.2: LLM-Performance, Diagnose und Zuverlässigkeit (4.3.0-c.6.6.27)

Basis: Commit `c6baa06` (4.3.0-c.6.6.26, Patch 8.1). Grundlage sind der Auftrag „Patch 8.2 – LLM Performance, Diagnostics & Reliability“ und der Livetest vom 21.10.2026, 13:33 (`tests/v4/live_1021e.json`, Build .26, GLM-5.3-Flash).

**Grundsatz.** Zuerst wird gemessen, dann optimiert. Der Patch macht die Ursachen der Latenz messbar und verhindert eine eindeutig unnötige Verarbeitung: das Lesen einer leeren Narrator-Antwort.

**Was gleich bleibt:**
- Requests und Modellparameter;
- Extractor-Prompts;
- Spielregeln und Balancing;
- Player-Agency;
- die Extractor-Sperre (Barriere in `index.js`, `closeLatePending`, `laterTurns`).

Benchmark-Werkzeug ist `tools/bench_extract.mjs`. Es ändert nichts am Spiel.

## 1. Was der Livetest zeigte

Vergleich der Läufe .25 (21.10.2026, 10:17, `live_1021d.json`) und .26. Die Zahlen stammen aus den Records der Chat-Exporte und aus den Server-Logs von SillyTavern („Chat Completion request/response“).

| Messwert | .25 | .26 |
|---|---|---|
| Extractor, Zeit pro Antwort (Records, inkl. Reparatur), Median | 5,1 s (13) | **22,8 s** (18) |
| Extractor-Antworten über 20 s | 3 von 13 | **9 von 18** |
| Extractor-Reparaturen | 2 | 5 |
| Extractor, Erstaufrufe, Completion-Token (Provider), Median / Mittel | 390 / 694 | **702 / 1.209** |
| Extractor, Erstaufrufe mit ≥ 2.000 Completion-Token | 2 von 13 | **7 von 18** (6 am Limit 2.500) |
| Extractor, Prompt-Token im Mittel (alle Aufrufe) | 8.377 | 8.509 (+1,6 %) |
| Extractor, gecachte Prompt-Token im Mittel | 6.769 | 7.097 |
| Extractor-Systemprompt | 29.360 Zeichen, `reasoning_effort: low` | identisch |
| Gleiche Aufgabe, Board lesen (Nachricht 12) | 9.077 Prompt-Token → 297 Token / 3,8 s | 9.071 Prompt-Token → **2.271 Token / 31,5 s** |
| Narrator, gecachte Prompt-Token im Mittel | 630 von 10.853 (6 %) | 5.097 von 10.607 (48 %) |
| Narrator, längstes Reasoning | 13.527 Zeichen | 16.437 Zeichen, einmal 4.096 Token ohne Text (Nachricht 36) |
| Planner, Median (Records) | 2,4 s | 2,3 s |

**Befund.** Prompt, Cache und Durchsatz sind praktisch gleich geblieben. Gewachsen ist die Zahl der Completion-Token, also das Reasoning des Modells, bei gleicher Aufgabe und gleichem Prompt.

Die Verteilung zerfällt in zwei Gruppen:
- Eine Antwort kommt schnell (unter 750 Token).
- Oder das Modell denkt bis an das Limit und liefert nichts. Danach rettet die kurze Reparatur aus 8.1 die Antwort (148–967 Token).

Ob `reasoning_effort: low` vom Provider befolgt wird, ist offen. Das prüft der Benchmark (Variante A0 gegen A, §4).

**Nachricht 36.**
- Der Narrator gab seine 4.096 Token für Reasoning aus, die Antwort war leer.
- Der Extractor las sie trotzdem: 17,6 s, 0 Deltas.
- Der nächste Spielzug wartete an der Barriere.

## 2. Was der Patch einführt

| Bereich | Umsetzung | Ort |
|---|---|---|
| Provider-Metadaten | `v4Llm` gibt auf dem Custom-Endpoint-Pfad `{content, finish_reason, usage}` zurück. Der `generateRaw`-Pfad gibt weiter einen String zurück | `index.js v4Llm` |
| Eine Leseregel | `ask()` nimmt String oder Objekt. `callMeta` übernimmt nur, was der Provider gemeldet hat: `finish`, `prompt`, `cached`, `completion`, `reasoning`. Fehlt ein Wert, bleibt das Feld weg. Nichts wird geschätzt | `runtime.js ask`, `callMeta` |
| Aufrufe am Record | `plan.llm[]` (Pfad C) bzw. `interp.llm[]` (Pfad A), `board.llm[]`, `extraction.llm[]`, jede Reparatur als eigener Eintrag | `runtime.js` |
| Lokale Kosten | `perf` am Spieler-Record: `wait_ms` (Barriere), `engine_ms` (Auflösung ohne LLM-Zeit), `folds`, `fold_ms` | `runtime.js turnPerf`, `host.js foldStats` |
| Narrator-Zeit | `narration.ms` an der Antwort: Engine-Block an SillyTavern übergeben → Antwort empfangen | `index.js` (`narrationStart`), `runtime.js processReplyAny` |
| Statuszeile | „last turn: waited 8.1 s · engine 0.1 s (3 folds, 12 ms) · planner 2.2 s · narrator 9.0 s · extractor 31.5 s (repaired) [length, length]“ | `runtime.js perfSummary`, `index.js renderDebug` |
| Leere Narrator-Antwort | Kein Extractor-Aufruf. Der Record bekommt `extraction.status: 'skipped'`. Dazu die System-Zeile „NO STORY TEXT …“ und ein Toast | `runtime.js processReplyAny`, `EMPTY_REPLY_NOTICE`, `index.js` |
| Benchmark | A0/A/C-Lauf über die geloggten Extractor-Requests, verschränkt und mehrfach. Bewertet wird durch die Engine selbst | `tools/bench_extract.mjs` (neu) |

## 3. Messfelder

Alle Felder sind technische Telemetrie in den vorhandenen Records (`msg.extra.avereth`). Sie werden nie zu Spiel-Events. `fold`, Replay und `exportLog` sehen sie nicht. Im Chat-Export von SillyTavern (`.jsonl`) stehen sie mit.

| Record | Feld | Inhalt |
|---|---|---|
| Spielernachricht | `plan.llm[]` / `interp.llm[]` | je Aufruf `{purpose, ms, finish?, prompt?, cached?, completion?, reasoning?}`. Ein Fehler ergibt `{purpose, ms, error: true}` |
| Spielernachricht | `board.llm[]` | der Board-Generator, bis zu zwei Versuche |
| Spielernachricht | `perf` | `{wait_ms?, engine_ms, folds, fold_ms}` |
| Antwort | `extraction.llm[]` | `extract` und gegebenenfalls `extract_repair` |
| Antwort | `narration` | `{ms}`; bei leerer Antwort `{ms?, empty: true}` |

**Bedeutung:**
- `ms` ist die Wanduhrzeit des Aufrufs im Browser, inklusive Netz und SillyTavern-Proxy.
- `finish` und die Token-Felder gibt es nur auf dem Custom-Endpoint-Pfad, wie ihn der Provider meldet:
  - `cached`: `usage.prompt_tokens_details.cached_tokens` oder `usage.cached_tokens`;
  - `reasoning`: `usage.completion_tokens_details.reasoning_tokens`.
- Ein String-Ergebnis (`generateRaw`, Test-Mocks) trägt nur `purpose` und `ms`.
- `narration.ms` umfasst:
  - den Prompt-Aufbau von SillyTavern;
  - die Generierung des Narrators samt Reasoning;
  - bei Streaming das Streaming.

  Token und `finish_reason` des Narrators sieht die Extension nicht: Die Generierung gehört SillyTavern.
- `wait_ms` gibt es nur, wenn die Barriere griff. Gemessen wird `await pendingWorld.job`.
- `engine_ms` ist die Zeit von `prepareGenerationAsync` für die Auflösung, ohne die gemessene LLM-Zeit von Planner, Interpreter und Board.
- `folds` und `fold_ms` zählen die `foldChat`-Aufrufe in diesem Zeitraum und ihre Summe (`performance.now`).
- `perf` entsteht einmal, wenn der Zug aufgelöst wird. Ein Swipe oder Regenerate nutzt den Zug wieder und misst ihn nicht neu. Die Narrator- und Extractor-Felder gehören zur jeweiligen Antwort.

**Unverändert:**
- Der Request an das LLM: `messages`, `purpose`, `temperature`, `maxTokens`, Preset-Extras.
- Die Mock-Signatur der Tests. Ein String bleibt ein gültiges Ergebnis.

## 4. Leere Narrator-Antwort

**Bedingung.** Nach der Bereinigung bleibt kein Story-Text. Bereinigt werden Tracker-Blöcke, Report-Block und Word-Swaps. Leer zählen damit auch Leerzeichen und ein verirrter `<avereth>`-Block.

**Ergebnis:**
- Der Record bekommt `events: []` und `extraction: {status: 'skipped', reason: 'empty reply'}`.
- Das Panel zeigt die Ergebnisse des Zuges, darunter die Warnzeile „NO STORY TEXT — the narrator's reply arrived empty, so nothing was read from it. The engine's results of this turn stand as shown above. Swipe or regenerate the reply for the story.“
- Dazu kommt ein Toast.
- Eine Ursache wird nicht behauptet, weil weder `generateRaw` noch SillyTavern eine melden.

**Garantien:**
- Es gibt keinen Extractor-Aufruf und keinen `pendingWorld`-Job. Der nächste Zug wartet also nicht.
- `pendingExtraction` setzt nichts nach einem Reload fort.
- Die Engine-Ergebnisse des Zuges (Events, Würfel, Kampf) liegen an der Spielernachricht und bleiben unberührt.
- Swipe und Regenerate verwenden den Zug wieder: kein zweiter Planner-Aufruf, kein neuer Wurf. Die neue Antwort wird normal und genau einmal gelesen.
- Wird dieselbe leere Antwort erneut empfangen, ändert sich nichts.
- Eine Spielernachricht nach einer leeren Antwort wird normal aufgelöst. `closeLatePending` schließt nur `pending`, also gibt es keine „late“-Korrektur.
- Die Extractor-Sperre ist unverändert.

**Grenzen:**
- **Edit:** Wie bei jeder bearbeiteten Antwort liest die Engine einen eingefügten Text nicht nach (`onEditedV4` ist unverändert). Das Panel zeigt weiter „NO STORY TEXT“. Der Weg zur Story bleiben Swipe und Regenerate.
- **Keine Antwort:** Scheitert die Generierung, bevor eine Nachricht entsteht, meldet das SillyTavern selbst. Ein Regenerate nutzt den Zug wieder.

## 5. Benchmark A0/A/C

**Varianten.** Gesendet werden die geloggten Extractor-Erstaufrufe. Reparaturen werden nie allein gemessen.

| Variante | Request |
|---|---|
| A0 | wie geloggt, ohne `reasoning_effort` (GLM-5.3-Flash nutzt dann seinen Default „max“) |
| A | wie geloggt (`reasoning_effort: low`, `clear_thinking` und alle übrigen Extras des Presets) |
| C | A plus eine Schlussanweisung (`CONCISE`): „Decide promptly. Report what this reply plainly establishes; leave out optional deltas you are unsure of … An empty deltas list is a valid answer.“ |

Reasoning abschalten ist bei GLM-5.3-Flash nicht möglich (nur low/high/max). Deshalb gibt es keine Variante B.

**Ablauf:**
- Jeder Request wird gegen den Chat des Laufs gemappt, und zwar über den Antworttext im User-Teil.
- Die Engine baut ihn neu, und der Neubau wird mit dem Log verglichen (`rebuiltIdentical`).
- Gesendet wird `rounds`-mal je Variante. Die Reihenfolge rotiert je Runde und Request (`schedule`), damit eine langsame Provider-Minute nicht nur eine Variante trifft.

**Bewertung.** Jede Antwort wird geparst (`parseExtraction`) und wie im Runtime übernommen (`applyExtraction`, inklusive Firewall). Grundlage ist der Chat bis zu dieser Antwort, mit wieder offener Extraktion.

Verglichen wird mit der Welt, die die Live-Antwort ergab (`worldSummary`):
- Ort und Anwesende, Uhrzeit;
- Entitäten (Status, Ort, Gruppe), Orte, Verbindungen;
- Quests, Objekte und ihre Besitzer;
- Awareness, Fakten, Erinnerungen, Threads, Encounter.

**Ausgabe je Variante:**
- Median, p90;
- Completion-Token (nur gemeldete);
- Antworten am Limit, leer, ungültig;
- **übernommene und abgelehnte Deltas**;
- mittlere Abweichung zur Live-Welt;
- Zahl der Antworten mit gleicher Welt.

Pro Antwort stehen in `--out` die abweichenden Schlüssel, etwa `facts.f.t11…`, `minute`, `entities.mon.x`.

Eine Abweichung ist ein Unterschied, kein Fehler: Die Live-Antwort ist nur eine Stichprobe. Abweichende Schlüssel werden an der Antwort nachgelesen.

**Aufruf:**

```
# prüft nur: findet, mappt, baut neu, bewertet die geloggten Antworten
node tools/bench_extract.mjs --log <Chat_Completion_request_.txt> --chat <chat.jsonl | fixture.json> --dry-run

# echter Lauf (Schlüssel nur aus der Umgebung, nie geschrieben)
AVERETH_BENCH_API_BASE=https://<provider>/v1 AVERETH_BENCH_API_KEY=<key> \
  node tools/bench_extract.mjs --log <log> --chat <chat> --rounds 3 [--variants A0,A,C] [--only 12,14,16] [--out bench_extract_out.json]
```

Der Lauf über die 17 zugeordneten Requests von .26 mit 3 Varianten und 3 Runden sendet 153 Aufrufe à rund 8.500 Prompt-Token, zusammen etwa 1,3 Mio. Prompt-Token. Mit `--only` (Nachrichten-IDs) geht es kleiner, zum Beispiel `--only 6,8,12,14,16,22,30,34`.

**Dry-Run auf .26** (`e01c1474-…txt`, `live_1021e.json`):
- 18 Extractor-Erstaufrufe, davon 17 zugeordnet. Der 18. ist die Extraktion der leeren Nachricht 36: Ein leerer Text lässt sich nicht zuordnen.
- Alle 17 baut dieser Build **byte-gleich** neu.
- Jede gültige Live-Antwort ergibt **dieselbe Welt wie live**.
- Die 5 leeren Antworten am Limit sind ungültig. Ihre Live-Welt stammt aus der Reparatur.

Damit misst der Benchmark genau die Requests des Livetests.

**Echter Lauf.** In der Entwicklungsumgebung gab es weder Schlüssel noch Endpoint, deshalb steht der Lauf aus.

## 6. Bewusste Entscheidungen

- **Telemetrie in Records, nicht in Events.** Sie misst den Lauf, nicht die Welt. Replay und Swipe dürfen nicht von Zeiten abhängen.
- **Nur Gemeldetes.** Fehlende Provider-Werte bleiben leer. Es gibt keine Token-Schätzung aus Zeichen.
- **Keine Rollen-Konfiguration.** Kein neues Setting für `reasoning_effort` je Rolle. Requests und Parameter bleiben, bis der Benchmark einen Vorteil zeigt.
- **Extractor-Sperre unverändert.** Eingespart wird nur der Lauf, der nichts lesen kann. `#assign`-Fast-Path und Extractor-lite bleiben Folgearbeit.
- **Eine Leseregel für Antworten.** `ask()` ist die einzige Stelle, an der String und Objekt zusammenlaufen.

## 7. Grenzen und offene Punkte

- Narrator-Token und `finish_reason` fehlen: Die Generierung gehört SillyTavern.
- `generateRaw` liefert keine Provider-Metadaten.
- Der echte A0/A/C-Lauf steht aus (§5).
- `#assign` wartet weiter an der Barriere, wenn eine Extraktion läuft.
- Ein bearbeiteter Text in einer leeren Antwort wird nicht gelesen (§4).
- `run_report.mjs` wertet die neuen Felder noch nicht aus. Sie stehen im Chat-Export.

## 8. Empfehlungen für einen Folgepatch (erst nach dem Benchmark)

1. **Hält A0 ≈ A,** wird `low` vom Provider vermutlich ignoriert. Dann wäre zu prüfen:
   - ein anderer Provider oder ein anderes Modell für den Extractor;
   - oder ein niedrigeres `max_tokens` mit sofortiger Kurzreparatur. Die Reparatur aus 8.1 kostet 148–967 Token gegen 2.500 verbrannte.
2. **Ist C schneller ohne Verlust:** keine höhere Ablehnungsquote, keine fehlenden Deltas in den Abweichungen. Dann gehört die Schlussanweisung in den Extractor-Request.
3. **Bimodale Verteilung:** Ein Erstaufruf am Limit ist fast immer leer. 2.500 Token bei rund 72 Token/s dauern etwa 33 s. Ein früherer Abbruch bei 1.000 Token, mit derselben Kurzreparatur, spart davon rund 20 s pro betroffener Antwort. Die Grenze muss der Benchmark belegen, denn gültige Antworten reichten in .26 bis 2.271 Token.
4. **Narrator-Reasoning:** 4.096 Token reichten in .26 einmal nicht für Text. Ein größeres Limit oder `reasoning_effort` im Narrator-Preset gehört in denselben Benchmark-Ansatz (A/B über SillyTavern).
5. **Folgearbeit, unabhängig vom Benchmark:**
   - `#assign` an der Barriere vorbeiführen (Ausnahmen in `closeLatePending` und `laterTurns`);
   - Extractor-lite mit Gating nach der Eingabe;
   - Auswertung der Telemetrie in `run_report.mjs`.

## 9. Tests

| Datei | Inhalt |
|---|---|
| `tests/v4/patch82.test.js` (15) | telemetry 1–6 (nur Gemeldetes, Planner-Aufruf und `perf` am Record bei unverändertem Request, String-Antwort spielt denselben Zug, Extractor mit Limit und Reparatur, Board-Fehlschlag, Statuszeile, gescheiterter Planner); empty 1–4 (Nachricht 36: kein Extractor, Engine-Runde bleibt, Notice; Leerzeichen und Report-Block; Swipe liest genau einmal; Regenerate ohne Antwort, nächster Zug ohne „late“); bench 1–5 (Zuordnung, Neubau byte-gleich, Live-Welt; Varianten; Verschränkung; Abweichung und ungültige Antwort; Messwerte und Zusammenfassung) |
| `tests/v4/live_1021e.json` | Livetest 21.10.2026 13:33, 43 Nachrichten, ohne Secrets |

`npm test` 975/975. `smoke:st:c` OK.
