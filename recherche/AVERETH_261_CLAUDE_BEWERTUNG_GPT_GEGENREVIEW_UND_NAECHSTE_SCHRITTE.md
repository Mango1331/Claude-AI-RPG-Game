# Avereth .261 – Bewertung des GPT-Gegenreviews und nächste Entwicklungsphasen

**Unabhängige Bewertung von Claude** · 28.11.2026 · keine Produktimplementierung

| Bezug | Stand |
|---|---|
| Produktstand | `experiment/211-openrouter-helper-single-runner` · [`4b637c98`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4b637c981459e1e5ff9f4bd480bc071723fe5bce) · Build `4.3.0-c.6.6.261` |
| Bewerteter eigener Bericht | [Gesamtarchitektur, Effizienz und Beta-Reife](AVERETH_261_GESAMTARCHITEKTUR_EFFIZIENZ_UND_BETA_REIFE_CLAUDE.md) · Commit [`23995d4e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/23995d4ee3b273707f3234421f368b6bae995382). Der Bericht bleibt unverändert, seine Korrekturen stehen in Abschnitt 9. |
| Bewerteter Gegenreview | GPT-Punkte R1–R12, vom Nutzer im Auftrag übermittelt |
| Neue Offline-Skripte und Ergebnisse | [`claude_261_gegenreview/`](claude_261_gegenreview/) mit [`ERGEBNISSE.txt`](claude_261_gegenreview/ERGEBNISSE.txt) |

Die Evidenzklassen D (datenbelegt), C (codebelegt), R (plausibles Risiko) und A (akzeptiertes Restrisiko) gelten wie im ersten Bericht. Alle neuen Zahlen stammen aus den vorhandenen Archiven `testrun_10b/openrouter-20261127-*` (Builds `.222–.251`) oder aus Offline-Läufen gegen `.261`. Neue Providerrequests gab es nicht.

---

## 1. Ergebnis in Kürze

GPT liegt in den meisten Punkten richtig. Fünf meiner Aussagen waren nachweislich falsch oder zu optimistisch, und ich korrigiere sie mit neuen Daten:

1. **Die Wartezeit nach dem Narrator-Ende beträgt nicht 0,4 s.** `lastRenderedChange` ist die Neudarstellung nach der Weltbuchung, nicht das Ende der Prosa. Richtig gemessen ist es im Median **3,9 s bei einem X-Aufruf und 8,8 s bei zwei** (D, n = 156/55). GPTs Zweifel war berechtigt. Die These „zweite X-Aufrufe sind der Haupthebel“ ist jetzt pro Zug belegt.
2. **Caching spart auf der Hauptroute kein Geld.** Bei GLM 5.3 Flash über Wafer kostet ein gecachter Prompt-Token 0,041 USD pro Million, ein ungecachter 0,042 (D, n = 519, exakte Regression). Die Antwortzeit hängt fast nur an den Completion-Tokens (≈ 6–7 s pro 1.000 auf GLM).
3. **Der Katalog wächst mit Inventar und gleichrangigen Orten.** Das zeigt ein synthetischer Test (`childrenOf` und Inventar sind ungedeckelt, D/C). Personen, Threads, Route und Berichte sind dagegen begrenzt.
4. **Für E-Rang fehlt nicht nur Content.** F-Festlegungen stehen auch in Extractor-Vertrag, Board-Prompts, Narrator-Kontext, Validierung (`> 14` fest codiert), Lernquellen und Ausrüstungsmarkt (C). Meine Angabe „harte Sperre in `domain.js`“ war am falschen Ort, denn dort ist es eine Content-Vorgabe mit Fallback.
5. **Altpfade sind kein E-Rang-Hindernis.** Die E-relevanten Module enthalten fast nur triviale Ruleset-Wächter. Die schwere Altlast liegt in `world.js` und `v4/commands.js`, die E-Rang kaum berührt (C).

Zwei Befunde entkräften Bedenken, die ich selbst eingebracht hatte:

- `creature.new` scheiterte in natürlichem Spiel **nie** an `population`/`life_stage` (0 von 127, D).
- Ein modernes exaktes Replay-Korpus lässt sich **sofort** aus den `.24x–.25x`-Archiven bauen: 254 von 255 eigenen Engine-Aufrufen werden zugeordnet, ohne Usertest 17 (D).

Ein Befund verschiebt die Reihenfolge stärker als bisher gedacht: **E-Rang kommt im Spiel früh.** Lauf S `.232` erreichte Level 10 in 120 Nachrichten. Ab Level 15 bringen F-Monster nur noch halbe XP (Rangabstand −1). Ein Proven-Board kann heute keine gültige Welt-Jagd erzeugen (C). Wer länger spielt, läuft also in eine E-Welt ohne E-Inhalte.

**Meine revidierte Empfehlung** ist eine eigene dritte Reihenfolge („Rangfähiges Fundament zuerst“, Abschnitt 7):

1. Ein großer autonomer Codex-Auftrag, der ohne Kanonentscheidung und ohne persönlichen Usertest möglich ist:
   - modernes Replay mit Invarianten;
   - **verhaltensneutrale Rang-Parametrisierung** aller F-Festlegungen (F-Ausgaben byte-gleich);
   - synthetischer Skalierungstest;
   - Altpfade nur dort, wo ohnehin gearbeitet wird;
   - zum Schluss eine kostengünstige natürliche Live-Runner-Serie. Auf der GLM-Route kosten 100 Züge etwa 0,22 USD.
2. Parallel bereiten GPT und Nutzer den E-Kanon vor, Claude liefert die Inventur der Festlegungen.
3. Danach folgt E-Content als zweiter Großauftrag.

Usertest 17 wird damit nicht überflüssig, aber er blockiert nichts mehr.

---

## 2. Bewertung R1–R12

| Punkt | GPT-Aussage (Kurzform) | Mein Urteil | Begründung und Beleg |
|---|---|---|---|
| **R1** Gesamtarchitektur | Keine Neuarchitektur | **Übereinstimmung** | Unverändert. Die neuen Daten stützen das zusätzlich: Event-Fold 4–14 ms pro 1.000 Events, Kosten 2,23 USD pro 1.000 Züge auf GLM. |
| **R2** Claim + State | Technisch erfolgreich, natürlich unbelegt, keine weiteren Umbauten ohne Befund | **Vollständig berechtigt** | Mein eigener Prüfpunkt `creature.new` ist durch Daten entkräftet (0/127). Es gibt keinen weiteren Validierungsumbau ohne Spielbefund. |
| **R3** Performance und `lastRenderedChange` | Zusammenhang X-Anzahl und Wartezeit nicht belegt, Marke unklar | **Vollständig berechtigt, inzwischen geklärt** | Die Marke ist die Neudarstellung nach der Buchung: in 64 % der Züge nach `worldCommit`, im Median 0,0 s danach (D). Meine 0,4 s maßen nur Speichern und Rücklesen. Pro Zug: 1 X → 3,9 s, 2 X → 8,8 s nach Narrator-Ende (Abschnitt 3.1). |
| **R4** Caching | Gecachte Tokens nicht gratis; 121-Token-Experiment nicht übertragbar; Mediane gegen Einzelraten prüfen | **Vollständig berechtigt** | Auf GLM gibt es keinen Preisnachlass (Verhältnis 0,98). Die Narrator-Cache-Rate ist pro Request zu 50 % null (74/149), insgesamt 33 % statt meiner „58 %“ (Median). Größere A/B-Versuche bleiben offen, siehe 3.2 zum richtigen Hebel. |
| **R5** Kontextwachstum | Keine Verallgemeinerung auf Tausende Nachrichten; zustandsabhängige Teile | **Vollständig berechtigt** | Synthetisch gemessen: +25 Gegenstände → +1,3 KB je Rolle; +200 gleichrangige Orte → Planner-Katalog 6,9 → 22,4 KB, Extractor 9,2 → 34,4 KB (D). Ursache sind `catalog.js` L129–130 und L337 (C). |
| **R6** Chatspeicher | Erst bei belegtem Engpass optimieren; Revisionssicherheit zuerst | **Übereinstimmung** | Das entsprach meiner Formulierung „erst Leser prüfen“. GPT priorisiert konsequenter, und ich schließe mich an: zurückstellen bis zum Langzeittest. |
| **R7** Replay | Neue Baseline darf Fehler nicht festschreiben; fachliche Invarianten ergänzen; altes Korpus behalten | **Vollständig berechtigt, ergänzt** | Ich konkretisiere das mit Manifestklassen und einer Invariantenliste (Abschnitt 4). Das Korpus ist schon jetzt baubar (D). |
| **R8** Altpfade | 8 Testdateien reichen nicht als Nachweis; indirekte Verbraucher; V3 erhalten; nicht zwingend vor E | **Vollständig berechtigt** | V4 importiert live `delta.js` (`reportToEvents`, `makeResolver`, `extractReport`, `tolerantJson`), `engine.js` (`perceiveAll`, `materialise`, `playerTurn` …) und `combat.js` (C). Der Kanon §0 sagt ausdrücklich: „Gemeinsam genutzte Funktionen nicht als vermeintlichen Legacy-Code entfernen“. |
| **R9** E-Rang | `validEncounterLevels` ist contentgesteuert; Verträge enthalten F-Festlegungen; „nur Content“ zu optimistisch | **Vollständig berechtigt, sogar breiter** | Zusätzlich zu `extract.js` und `deltas.json` gibt es F-Festlegungen in `validate.js`, `guild.js`, `context.js`, `growth.js`, `passives.js`, `items.js` und `skill_composer.js` (Abschnitt 3.6). |
| **R10** HUD | Höher priorisieren, parallel in Pakete integrieren | **Abweichende Priorisierung ohne Widerspruch, ich übernehme sie** | Meine Einstufung „C“ ignorierte, dass der Nutzer viele Stunden selbst spielt. Der Kanon §5 verlangt bereits Skills im HUD „mit Besitz, Kosten und Wirkung verständlich“. Solche kanongedeckten Anzeigen gehören in passende Pakete. |
| **R11** Prozess | Testumfang nach Risiko; Zwischencommits sind keine Freigabe | **Teilweise berechtigt** | Zustimmung zum risikobasierten Umfang. Eine Grenze halte ich fest: Jede Änderung an Prompt, Extractor oder Firewall braucht vor einer **Produkt**freigabe eine natürliche Stichprobe. Sie muss nicht vom Nutzer gespielt werden; der Live-Runner reicht (Abschnitt 3.10). |
| **R12** Reihenfolge | E-Planung und Messungen vor Usertest 17; Replay und Altlasten blockieren nicht | **Berechtigt, mit einer Änderung** | Die Daten zum XP-Tempo stützen GPT. Ich ziehe aber einen technischen Schritt vor: Die rangneutrale Parametrisierung kann **vor** jeder Kanonentscheidung erfolgen und macht den späteren E-Auftrag kleiner und sicherer (Abschnitt 7). |

**Nicht ausreichend belegte GPT-Kritik** habe ich nicht gefunden. **Offen** bleibt eine Frage: ob größere Prompt-Kürzungen die *Modellqualität* verbessern. Das ist nur per A/B-Versuch messbar, nicht aus Archiven.

---

## 3. Ergänzende Offline-Untersuchungen

### 3.1 Wartezeit nach Anzahl der X-Aufrufe (zu R3)

Skript: [`turn_latency_by_x.py`](claude_261_gegenreview/turn_latency_by_x.py).

**Bedeutung der Marken:**

- `click`, `firstProse`, `lastRenderedChange`, `worldCommit`, `confirmedSave` und `ready` stammen aus derselben Browserseite (`performance.now`).
- Der World-Job beginnt beim Empfang der Narrator-Nachricht (`world_jobs.js` L65–66). `extraction_validation_wait_ms` reicht bis zur Weltbuchung, `save_readback_ms` bis zum bestätigten Speichern (L91–96).
- Daraus folgt: **Narrator-Ende ≈ `worldCommit − extraction_validation_wait_ms`** und **sichere Eingabe = `ready`**.
- Laut [Archivdoku](user11_natural_tools/README.md#zeitmessung-und-lesart-der-archive) kann `lastRenderedChange` „auch die abschließende Neudarstellung der Systemkarte erfassen“. Die Daten bestätigen das: Die Marke liegt in 64 % der Züge nach `worldCommit`, im Median 0,0 s und bei p90 0,1 s danach.
- Die Provider-Journale (Epoch-Uhr) bestätigen die Lücken ([`request_gaps.py`](claude_261_gegenreview/request_gaps.py)):

| Lücke im Provider-Journal | Median |
|---|---:|
| Narrator-Ende → erster X-Start | 0,55 s |
| X-Ende → Reparaturstart | 0,11 s |
| Planner-Ende → Narrator-Start | 0,45 s |

**Ergebnis, alle 211 Züge mit Narrator-Request:**

| X-Aufrufe im Zug | n | Klick → bereit (Median / p90) | **Narrator-Ende → bereit** (Median / p75 / p90) | Summe der X-Laufzeiten (Median) |
|---|---:|---|---|---:|
| 1 | 156 | 11,4 s / 17,3 s | **3,9 s** / 5,7 s / 7,9 s | 3,4 s |
| 2 | 55 | 16,4 s / 26,5 s | **8,8 s** / 10,4 s / 13,5 s | 8,0 s |

- Ein zweiter X-Aufruf kostet im Median etwa **+5 s spürbare Wartezeit**. Die Wartezeit nach dem Narrator-Ende besteht fast vollständig aus Extractor-Laufzeit plus etwa 0,3 s Speichern.
- Kein Zug hatte drei X-Aufrufe.
- Die 63 Züge ohne `firstProse`-Marke sind **keine** lokalen oder nativen Züge: Alle haben einen Narrator-Request. Es ist eine Messlücke des Runners, verteilt über alle Builds. Ihre Ursache kenne ich nicht.

### 3.2 Cache, Preis und was die Antwortzeit wirklich bestimmt (zu R4)

Skripte: [`cache_per_request.py`](claude_261_gegenreview/cache_per_request.py), [`elapsed_vs_tokens.py`](claude_261_gegenreview/elapsed_vs_tokens.py), [`completion_parts.py`](claude_261_gegenreview/completion_parts.py).

| Route | Preis gecacht / ungecacht (USD pro Mio., exakte Regression) | Verhältnis |
|---|---|---:|
| `z-ai/glm-5.3-flash` · `wafer/us` (n = 519) | 0,0410 / 0,0420 | **0,98** |
| `openai/gpt-4.1-mini` (n = 137) | 0,10 / 0,40 | 0,25 |
| `openai/gpt-5.4-mini` (n = 100) | 0,075 / 0,75 | 0,10 |

| Rolle auf GLM | Requests | Cache-Rate (Median pro Request) | Cache-Fehlschläge (Rate 0) | Gesamtanteil gecacht |
|---|---:|---:|---:|---:|
| Planner | 166 | 0,83 | 23 | 75 % |
| Extractor | 150 | 0,74 | 13 | 69 % |
| Extractor-Reparatur | 48 | 0,95 | 0 | 95 % |
| Narrator | 149 | 0,55 | **74** | **33 %** |

Antwortzeit gegen Tokenzahlen (Regression über die Requests):

| Rolle | Completion pro 1.000 Tokens | ungecachter Prompt pro 1.000 Tokens | R² |
|---|---:|---:|---:|
| Planner (GLM) | +6,2 s | +0,07 s | 0,39 |
| Extractor (GLM) | +6,6 s | nicht positiv messbar (Kollinearität) | 0,75 |

Medianer Extractor-Request (GLM): 499 Completion-Tokens, davon 132 Reasoning (40 %).

**Folgerungen:**

- Auf der Hauptroute spart Caching **kein Geld**. Prompt-Tokens machen dort etwa 89 % der Kosten aus. Größere Prompt-Kürzungen senken die Kosten also proportional; absolut ist der Betrag klein, denn 2,23 USD pro 1.000 Züge sind das Ganze.
- **Für die Zeit** zählen Completion-Tokens: Reasoning und Länge der JSON-Antwort, nicht die Prompt-Länge.
- Der stärkere Zeithebel für einen späteren A/B-Versuch ist deshalb nicht „Prompt kürzen“, sondern:
  1. weniger zweite X-Aufrufe;
  2. kompaktere Extractor-Antworten (die schon in `.203` diskutierte X2-Idee);
  3. Reasoning-Aufwand des Extractors.
- Promptkürzung bleibt sinnvoll als **Kostenversuch auf OpenAI-Routen** und möglicherweise als Qualitätsversuch. Dass das 121-Token-Experiment nicht übertragbar ist (GPT), stimmt.

### 3.3 Abweichungen zwischen Bericht und `ERGEBNISSE.txt`

| Größe | Bericht | `ERGEBNISSE.txt` | Erklärung |
|---|---|---|---|
| Extractor-System `.251` | 53.439 | 53.714 | **Zwei Messgrundlagen.** 53.439 ist der Archivwert und entspricht dem Live-Pfad, der `worldVocab()` anwendet (`extract.js` L24–36: ohne Privatquests entfällt `quest.offer`, eine Regel wird ersetzt). 53.714 ist der Rohwert des Content-Vokabulars. |
| Extractor-System `.261` | 51.968 | 51.968 | Im Bericht steht fälschlich der **Rohwert**. Live-Wert, nachgemessen mit [`promptsize_live.mjs`](claude_261_gegenreview/promptsize_live.mjs): **51.693**. |
| Differenz `.251 → .261` | −3,3 % | – | Richtig ist **53.439 → 51.693 = −1.746 Zeichen (−3,3 %)**. Der Prozentwert stimmte zufällig, weil beide Grundlagen um dieselben 275 Zeichen differieren. |
| Faltzeiten | 7,3–13,5 ms | 6,5–10,4 ms | Unterschiedliche Durchläufe ohne Warm-up im geteilten Container. Robust nachgemessen ([`foldtime_robust.mjs`](claude_261_gegenreview/foldtime_robust.mjs), 5 Warm-up- und 40 Messläufe) ergeben sich **4–14 ms pro 1.000 Events**, abhängig von Last und Kampagneninhalt. Die Aussage „unkritisch“ bleibt. Es sind Node-Zeiten, keine Browserzeiten. |

### 3.4 Synthetische Katalog-Skalierung (zu R5)

Skript: [`catalog_scaling.mjs`](claude_261_gegenreview/catalog_scaling.mjs). Es faltet den Heron-Endzustand mit `.261` und ergänzt synthetisch:

| Zusatz | Planner-Katalog | Extractor-Katalog | Orts-IDs im Schema |
|---|---:|---:|---:|
| keiner (Heron-Ende: 18 Objekte, 34 Orte) | 6,9 KB | 9,2 KB | 30 |
| +50 getragene Gegenstände | 9,4 KB | 11,8 KB | 30 |
| +200 getragene Gegenstände | 17,3 KB | 19,6 KB | 30 |
| +50 gleichrangige bekannte Orte | 10,7 KB | 15,3 KB | 80 |
| +200 gleichrangige bekannte Orte | 22,4 KB | 34,4 KB | 230 |

- **Ungedeckelt (C):**
  - Kinder- und Geschwisterorte (`catalog.js` L129–130);
  - alle getragenen Objekte (L337), auch im Narrator-Kontext (`context.js` L107);
  - beim Extractor zusätzlich `PLACE ANCESTRY` für jeden gezeigten Ort (L431).
- **Gedeckelt:** Threads 6, Route 12, Berichte 4, Städte 4, bekannte Personen 4/3, Fakten und Erinnerungen per `slice`.
- Ob 200 Geschwisterorte realistisch sind, ist offen. Eine Hauptstadt mit vielen erzählten Teilorten ist denkbar.
- **Für E-Rang und lange Kampagnen ist das ein reales, aber kein akutes Risiko (R).** Inventare wachsen mit Beute schneller als Ortslisten. Das passt zu R10: Inventargruppierung im HUD und im Katalog gehören zusammen.

### 3.5 Replay-Fähigkeit der neuen Archive (zu R7 und Teil B)

Skripte: [`archive_to_corpus_input.py`](claude_261_gegenreview/archive_to_corpus_input.py), [`probe_build.mjs`](claude_261_gegenreview/probe_build.mjs), [`probe_build_own.mjs`](claude_261_gegenreview/probe_build_own.mjs).

- Das Produktwerkzeug `tools/replay/build_corpus.mjs` erwartet zwei Eingaben: `chat.jsonl` und ein Completion-Log je Rolle. Die Zuordnung erfolgt über Prompt- und Completion-Tokenzahlen.
- Die Archive liefern beides: `requests.jsonl.gz` mit Usage und `raw-<id>.gz` mit der vollständigen Antwort. Ein 30-Zeilen-Adapter genügt.
- **Ergebnis über 27 Archive `.241–.251`:**
  - **254 von 255 eigenen Engine-Aufrufen** (Planner, Extractor, Reparaturen, Board) werden zugeordnet (D).
  - Die 1.128 nicht zugeordneten Aufrufe gehören zum geerbten Startchat (`chat-0`) und liegen in den Elternarchiven.
  - Hinweis: Ein erster Adapterlauf ordnete nur 121 Aufrufe zu, weil ich die Rolle falsch benannt hatte (`extraction` statt `extract`). Der korrigierte Adapter liegt im Ordner.
- Die **Usertest-Originale** speichern im Record nur die jeweils letzte, geparste Extractor-Antwort. Für exaktes Replay mit Reparaturpfad reichen sie nicht. Sie eignen sich für Invarianten und gezielte Originalfälle.
- Es gibt **bereits gezielte Originalfall-Regressionen** im Produkt:
  - `tools/replay/known_routes245.mjs`, `inn_chain248.mjs`, `mixed_party246.mjs`, `party_departure249.mjs`, `return_party250.mjs`, `new_destination251.mjs`;
  - `user13_surrender.mjs`, `user16_scene.mjs`.
- `validateState` (`validate.js`) prüft schon strukturelle Invarianten: Entitätsschlüssel, Objekte, Angebote, Quests, Skills, RNG-Zähler und Szenenort.

### 3.6 F-Festlegungen, die E-Rang berühren (zu R9)

| Stelle | Art | Beleg |
|---|---|---|
| Begegnungsfenster | Content mit Code-Fallback | `domain.js` L384–387, `monsters.encounter_windows` |
| Validierung der Population | **fest codiert** `levels[1] > 14` | `validate.js` L177 (L172 prüft Gebiete über Content) |
| Area-Handler | Ablehnungstext „a fixed F area“ | `world.js` L3048–3050 |
| Extractor-Regel | „report area once with a fixed supported F window“ | `extract.js` L160 |
| `area`-Delta | „fixed F level window 1-1,1-3,4-7,8-11,12-14“ | `content/deltas.json` (`area.summary`) |
| `creature.new` | „anchor is the nearest F1 mechanical body-plan“ | `content/deltas.json` |
| Board-Prüfung | Fehlertext „must be 1-1, 1-3, 4-7, 8-11 or 12-14“. Eine Proven-Listung muss zugleich im Band 15–29 liegen (`level outside lo–hi`). Jede Proven-Welt-Jagd scheitert an diesem Widerspruch; Dungeon-Räumungen in E-Teilen sind davon nicht betroffen. | `guild.js` L674–675 und L947–956 |
| Board-Prompt | „across F (levels 1–14)“, F-Vergütungsleitlinie | `guild.js` L815, L830, L834 |
| Narrator-Kontext | `OUTDOOR DANGER` mit L1–14-Leitlinie | `context.js` L859 |
| Lernquellen | „only F-Rank“ für Lehrer, Steine und Manuale | `growth.js` L230 |
| Passive | „only F-rank Passives have calibrated bounds“ | `passives.js` L73 |
| Skill-Composer | C1, F-Rang | `skill_composer.js` L3, L88 |
| Ausrüstungsmarkt | Angebote fest „`<Qualität> F-Rank <Basis>`“ | `items.js` L106 |
| **Rangoffen (funktioniert schon)** | Beute aus Gegnerprofil, Sonderbelohnungen, Monsterskalierung, XP-Formeln, Beförderung, E-Klassenentwicklung, E-Skill-Kalibrierung, Dungeon-Rollenspannen | `loot.js` L94, `special_rewards.js` L82, `items.js` L88/L264, `progression.js`, `guild.js` L1331, `class_growth.js`, `skills.js` L46–59, `rules.living.role_spans` |

### 3.7 Altpfade und E-Rang (zu R8 und Teil C)

Gezählt wurden Ruleset-Vergleiche und C-Pfad-Verzweigungen in den E-relevanten Modulen:

| Modul | `rulesetOf(` | Art |
|---|---:|---|
| `skills.js` | 8 | ausschließlich Früh-Rückgaben `< 2` |
| `context.js` | 7 | Anzeigezusätze |
| `catalog.js` | 6 | Anzeigezusätze |
| `growth.js` | 3 | Früh-Rückgaben |
| `passives.js` | 2 | Früh-Rückgaben |
| `class_growth.js` | 1 | – |
| `items.js`, `loot.js`, `domain.js`, `living.js`, `skill_composer.js`, `validate.js` | 0 | – |
| zum Vergleich: `world.js` / `v4/commands.js` | 41 / 39 | tief verwoben |

E-Rang berührt `world.js` nur am Area-Handler. **Ein Altpfad-Rückbau vor E-Rang würde E-Arbeit kaum vereinfachen (C).** Er entfernt vor allem Zeilen in zwei Modulen, die E nicht braucht.

Gleichzeitig gilt das Regressionsrisiko: V3-Funktionen werden von V4 live importiert (`world.js` L33/L36, `runtime.js` L32/L34). Zeilenweises „Ruleset-1-Löschen“ ohne Verbraucheranalyse kann Live-Pfade treffen.

### 3.8 Beobachtetes Progressionstempo (zu Teil D)

Skript: [`progress_observed.mjs`](claude_261_gegenreview/progress_observed.mjs). Es nutzt die Engine-Formeln und faltet die Endzustände.

| Größe | Wert |
|---|---|
| XP von Level 1 bis 15 | **10.500** (Σ 100 × Level) |
| Defeat-XP, gewöhnlich, gleicher Rang, Level 1 / 7 / 14 | 60 / 420 / 840 |
| Quest-XP, Standard, Level 1 / 7 / 14 | 150 / 1.050 / 2.100 |
| Lauf S `.232` | 120 Nachrichten, Spieltag 2: **Level 10**, 5.495 XP gebucht (3.470 Kampf, 2.025 Quest) |
| Lauf Heron `.250` | 128 Nachrichten, Tag 3: Level 5 |
| Lauf Sage `.248` | 112 Nachrichten, Tag 3: Level 4 |
| Usertests 15/16 | 28/40 Nachrichten: Level 2–3 |

Level 15 liegt bei zielstrebigem Spiel mit Gildenaufträgen in der Größenordnung von **wenigen hundert Nachrichten**. Das ist eine Hochrechnung, keine Messung. Ab Level 15 gilt für F-Monster der Rangabstand −1, also **halbe XP** (`rules.xp.rank_gap`). Ohne E-Gebiete und ohne Proven-Jagden (3.6) verlangsamt sich der Fortschritt dann deutlich. **Das ist die konkreteste spielerische Lücke vor der Beta (C/D).**

### 3.9 `creature.new` in natürlichem Spiel (zu R2)

Skript: [`creature_rejections.py`](claude_261_gegenreview/creature_rejections.py).

- Untersucht wurden die eigenen Antworten der Archive `.222–.251`: 127 gemeldete `creature.new`.
- Abgelehnt wurden nur Dungeon-Gegner, die die Engine besitzt (26 `dungeon_foe`, 5 `dungeon_sight`), plus 2 wegen Szenenkontext. Das ist die beabsichtigte Firewall.
- **Keine einzige** Ablehnung betraf `population` oder `life_stage`. Das Wolf/Eber-Problem ist ein Altkorpus-Effekt.

### 3.10 Kosten einer natürlichen Stichprobe (zu R11)

Skript: [`cost_per_turn.py`](claude_261_gegenreview/cost_per_turn.py). Gemessen sind die tatsächlichen Providerkosten aus den Journalen:

| Route | USD pro 1.000 erzählte Züge |
|---|---:|
| GLM 5.3 Flash (Wafer) | **2,23** |
| GPT-4.1-mini | 9,04 |
| GPT-5.4-mini | 21,20 |

Eine Live-Runner-Serie von 100 Zügen auf der Hauptroute kostet etwa **0,22 USD**. Natürliche Evidenz hängt damit nicht am persönlichen Spiel des Nutzers, sondern nur an seiner Kostenfreigabe. Usertest 17 bleibt für das Spielgefühl unersetzlich, aber nicht für den Nachweis mechanischer Stabilität.

---

## 4. Replay-Strategie (Teil B)

| Verfahren | Stärke | Schwäche | Rolle |
|---|---|---|---|
| Exaktes Replay mit neuer Baseline | erkennt jede Verhaltensänderung, billig, deterministisch | friert beobachtete Fehler ein, wenn man sie nicht markiert | **Änderungsdetektor**, nicht Wahrheitsquelle |
| Fachliche Invarianten | prüfen Richtigkeit unabhängig vom Wortlaut, auch für neue Mechaniken | fangen keine stilistischen oder semantischen Fehlmeldungen | **Korrektheitsnetz** über allen Korpora |
| Gezielte Originalfall-Regressionen (existieren schon) | fachlich entschieden, aussagekräftig | Einzelfälle, wachsen mit jeder Etappe | **verbindliche Fachfälle** |
| Historisches Korpus `.120–.125` | Langzeit-Regression, Kettenprüfung in `replay.test.js` | veraltete Prosa und Pflichtfelder | **Zweitschicht**, nicht Hauptsignal |

**Empfehlung: alle vier kombinieren, mit klaren Rollen.**

1. **Neues exaktes Korpus** aus `.222–.251` mit dem Adapter aus 3.5, als festes Produktwerkzeug neben `build_corpus.mjs`. Die Archivketten werden über `chat-0` und Elternläufe aufgelöst. Die Baseline ist `.261` (oder ein neuerer Build), **gekennzeichnet als „beobachtet“**.
2. **Manifestklassen für jede bekannte Abweichung oder Auffälligkeit:**
   - `fachlich_bestätigt` (aus Originalfall-Regression oder Review);
   - `beobachtet` (Standard, kein Kanon);
   - `bekannter_fehler_akzeptiert` (mit Verweis auf Bericht und Grund).
   
   Ein Fall der dritten Klasse darf sich ändern, ohne dass der Check rot wird. Er muss dann im Bericht erscheinen. Damit friert das Replay keine Modellfehler als Kanon ein.
3. **Invarianten-Prüfer** über alle Korpora und synthetischen Fälle, gerechnet über Eventpaare je Zug statt über Endzustände:
   - **Geld:** Münzänderungen nur über gebuchte Geld-Events (Kauf, Verkauf, Geschenk, Auszahlung, Gebühr). Keine negative Börse.
   - **Besitz:** Jedes Objekt hat genau einen Träger oder Ort. Übergänge nur über Übergabe-, Kauf-, Beute- oder Fund-Events.
   - **XP und Level:** XP steigen nur über `xp.changed` aus Kampf oder Quest. Level-Ups entsprechen der Formel. Kein XP aus Narrator-Prosa.
   - **Orte:** Die Szene steht immer an einem bekannten Ort. Ortswechsel des PCs nur über gebuchte Bewegung.
   - **Party:** Mitglieder existieren, leben und sind entweder anwesend oder haben einen bekannten Ort. Keine Auszahlung an Tote.
   - **Quest:** Statusübergänge nur in erlaubter Reihenfolge. Auszahlung höchstens einmal.
   - **Spielerhoheit:** Kein Event, das eine freiwillige PC-Entscheidung bucht, stammt aus einem Narrator-Record ohne passende Spielereingabe (`ownership.js` als Quelle).
   
   Bestehende `validateState`-Prüfungen werden übernommen, nicht dupliziert.
4. **Das historische Korpus und die Kettenprüfung bleiben unverändert als Zweitschicht.** Die 14 nicht gelesenen Manifeste werden erst nach Prüfung der Doku-Links archiviert.

**Usertest 17 ist dafür nicht nötig.** Nach dem Test werden seine Originale nur als weitere Quelle ergänzt.

---

## 5. Altlastenbereinigung: Nutzen und Zeitpunkt (Teil C)

| Frage | Antwort |
|---|---|
| Welche E-Arbeiten würden einfacher? | Kaum welche. Die E-Stellen (3.6) liegen in Modulen mit trivialen Ruleset-Wächtern. Nur der Area-Handler in `world.js` liegt im Altlast-Hotspot. |
| Welche Altpfade behindern tatsächlich? | Die Verzweigungen in `world.js` (41/83) und `v4/commands.js` (39/37) verteuern jede Änderung **an diesen Modulen**: Party P7, Bewegung, Handel. Das ist ein Problem für die spätere Entflechtung, nicht für E-Rang. |
| Was entfernt vor allem Zeilen? | Ruleset-Wächter in `skills.js`, `growth.js`, `passives.js` und `context.js`. Sie sind harmlos und lesbar. |
| Regressionsrisiko | Mittel bis hoch bei pauschalem Löschen, weil V3-Funktionen live von V4 genutzt werden (3.7). Gering bei Löschen im Rahmen einer Moduländerung mit Verbraucherliste und neuem Replay. |
| Großes Paket oder schrittweise? | **Schrittweise:** Altzweige werden in den Modulen entfernt, die ohnehin geändert werden, jeweils mit Verbraucherliste. Ein eigenes Paket ist erst sinnvoll **zusammen mit** der Entflechtung von `world.js` und `commands.js`, wenn Party P7 oder größere Bewegungsarbeiten anstehen. |

Meine frühere Einstufung „B, parallel“ korrigiere ich auf **„C, in Etappen beim Arbeiten an betroffenen Modulen“**. Das entspricht GPT R8/R12.

---

## 6. Nächste spielerische Entwicklung (Teil D)

**Sollten wir mit der E-Vorbereitung beginnen? Ja, jetzt.** Begründung:

- Das XP-Tempo bringt Spieler früh an Level 15 (3.8).
- Danach gibt es heute keine E-Gebiete, keine gültigen Proven-Jagden, keine E-Lehrer und keinen E-Markt. Halbe XP auf F-Monster bremsen den Fortschritt (3.6).
- Die E-Klassenentwicklung bei Level 15 existiert bereits. Der Moment „Ich bin E-Rang“ kommt, aber die Welt reagiert nicht darauf. Das ist ein Spielspaßproblem, keine Perfektionsfrage.

**Fehlen vorher noch F-Grundlagen?** Ich unterscheide anhand des Kanons und der Roadmap:

| Bereich | Zustand | Fehlende Grundlage oder Feinschliff? |
|---|---|---|
| Kampf, Aktionen, Kapitulation | umgesetzt (K1, `.214–.218`), natürliche Erfahrung offen | **Feinschliff.** Bewegungsvarianten sind laut Roadmap eine spätere Entscheidung. |
| XP und Progression bis 15 | funktioniert, Tempo eher hoch | **Grundlage für E:** Tempo und Zielwert als Nutzerentscheidung („F-XP-Versuch: Faktor 5 … endgültige F-/E-Balance offen“, Kanon §5) |
| Klassenentwicklung | E bei 15 umgesetzt, D–S offen | E ist vorhanden; D–S kommt später. |
| Skills und Passive | F-Erwerb komplett, E kalibriert, aber nicht erlernbar | **Grundlage für E:** E-Lernquellen (3.6) |
| Ausrüstung, Loot, Wirtschaft | Loot rangoffen, Markt F-fest, Rüstungsreferenz E fehlt | **Grundlage für E:** Markt, Rüstung und Rangqualität (Roadmap: „Kalibrierung … braucht repräsentative Spielverläufe“) |
| Gildenbeförderung | Beförderung abgeleitet, Proven-Board kann keine Jagden erzeugen | **Grundlage für E** (C, `guild.js` L674) |
| Auftragsvielfalt | Board: Jagden plus Dungeon-Räumung; Lieferung und Eskorte ruhen (Kanon §6) | **Für eine Beta mit „vielfältigen Abenteuern“ eine echte Lücke, aber eine Kanonentscheidung des Nutzers** (Ideenkatalog „Neue Abenteuerfamilien“). Nicht vor E erzwingen. |
| Dungeons und größere Welt | 3 Dungeons, höchstens Rang E; Living Dungeons rangoffen | **Grundlage für E:** mindestens ein E-taugliches Gebiet und ein E-Dungeon in Reichweite (Content) |
| Dauerhafte Party, NPC-Entwicklung | Party verbindlich (`.236–.244`), P7 zurückgestellt, NPC-Leveln umgesetzt | Feinschliff. Für E zu prüfen: wachsen Begleiter-Level mit (Kanon .217: fünf Punkte je NPC-Level)? Kein Blocker. |
| HUD-Komfort | Kampf-HUD, Handel, Quest-Annahme, `#equip`/`#rest` | **Parallel in jedes Paket.** Für E wichtig: Skill-Übersicht mit Besitz, Kosten und Wirkung (Kanon §5) sowie gruppiertes Inventar (3.4). |

**Was bringt den größten Fortschritt?**

- Für Claude: die vollständige E-Inventur (3.6), die GPT als Grundlage der E-Kanonvorlage dient. Sie liegt hiermit schon vor.
- Für Codex: der Fundament-Auftrag aus Abschnitt 8. Er macht die E-Einführung zu einer reinen Content- und Kanonentscheidung und bringt nebenbei das moderne Replay und die natürliche Bestätigung von `.261`.

---

## 7. Strategievergleich

| Kriterium | 1 · Ursprünglich (Usertest → Replay → Altlast → E) | 2 · GPT (E-Planung und Messung → natürliche Abnahme und Replay → E-Entwicklung → Altlast gezielt) | **3 · Rangfähiges Fundament zuerst (eigene Alternative)** |
|---|---|---|---|
| Ablauf | seriell, wartet auf den Nutzer | Planung parallel, Entwicklung nach Abnahme | **Codex-Großauftrag 1:** Replay mit Invarianten, rangneutrale Parametrisierung, Skalierungstest, Live-Runner-Serie. **Parallel** E-Kanon durch GPT und Nutzer. **Codex-Großauftrag 2:** E-Content und E-HUD. Usertest 17 auf dem Ergebnis von Auftrag 2 oder früher nach Wunsch. |
| Spielspaß und Fortschritt Richtung Beta | – langsam | + gut | **++** E-Content fließt ohne Umbauwartezeit ein |
| Technisches Risiko | + gering | ○ E-Entwicklung ändert Verträge und Logik gleichzeitig | **+** Logik- und Vertragsumbau zuerst F-byte-gleich prüfbar, Content danach getrennt |
| Entwicklungszeit | – lang (Wartezeiten) | ○ mittel | **+** zwei große Aufträge, wenig Leerlauf |
| Token- und Creditverbrauch | ○ | ○ | **+** Live-Runner etwa 0,2–0,5 USD; weniger GPT-Rundtrips, weil Auftrag 1 keine Kanonfragen hat |
| Abstimmungsrunden | – viele kleine | ○ mittel | **+** eine Kanonrunde für E, sonst technische Autonomie |
| Autonome Codex-Großaufträge | ○ | + | **++** Auftrag 1 ist vollständig ohne Nutzerentscheidung durchführbar |
| Nutzen der Claude-Kapazität | ○ | + | **+** Inventur (fertig), E-Kanon-Gegenprüfung, Codex-Abnahmeprüfung |
| Abhängigkeit von persönlichen Usertests | – hoch | ○ mittel (natürliche Abnahme) | **++** keine. Usertest 17 wird zum Spielgefühltest, nicht zur Freigabebedingung. |

**Ich empfehle Variante 3.** Sie übernimmt GPTs Kern: E-Planung jetzt, keine Blockade durch Replay und Altlast. Zusätzlich setzt sie einen technischen Schritt davor, den GPT nicht vorgeschlagen hat: Die F-Festlegungen werden **verhaltensneutral** zu rangfähigen Content-Parametern umgebaut. Das hat drei Vorteile:

1. Der Umbau ist ohne Kanonentscheidung möglich, weil ohne E-Einträge nichts anders läuft.
2. Er ist exakt prüfbar: Prompt-Texte sind für F byte-gleich, und das neue Replay ist identisch.
3. Er trennt die riskante Logikänderung von der späteren Content- und Balanceentscheidung.

Variante 2 würde diese beiden Arten von Änderung in einem E-Entwicklungsauftrag vermischen.

---

## 8. Empfehlung

### Was jetzt geschehen sollte

1. **Codex-Großauftrag „.262 · Rangfähiges Fundament und modernes Regressionsnetz“.** Er hat keine Kanonänderung und keine Werteänderung und kann autonom laufen.
   - **A · Regressionsnetz**
     - Archiv-Adapter und neues exaktes Korpus aus `.222–.251` (Ketten über `chat-0` auflösen).
     - Baseline `.262-pre`, gekennzeichnet „beobachtet“, mit den Manifestklassen aus Abschnitt 4.
     - Invarianten-Prüfer (Geld, Besitz, XP, Orte, Party, Quest, Spielerhoheit) über alte und neue Korpora.
     - Bestehende Originalfall-Regressionen und das alte Korpus bleiben unverändert.
   - **B · Rangneutrale Parametrisierung**
     - Alle Stellen aus 3.6 lesen ihre Fenster, Texte, Rang-Tore und Benennungen aus Content-Tabellen **je Rang**.
     - Die Content-Tabellen enthalten **nur die heutigen F-Werte**.
     - Nachweis: F-Prompt-Snapshots von Planner, Extractor, Narrator und Board sind byte-gleich, das Replay ist identisch, die Node-Suite grün.
     - Für fehlende E-Einträge verhält sich die Engine exakt wie heute. Neue Werte erfindet Codex nicht.
   - **C · Skalierungstest**
     - Synthetische Kampagne mit großem Inventar, vielen Teilorten, vielen NPCs und langen Eventlogs.
     - Gemessen werden Katalog- und Promptgrößen und Faltzeit, als Test mit dokumentierten Grenzwerten.
     - Keine Kappung ohne Entscheidung. Das Ergebnis geht als Befund an GPT.
   - **D · Altpfade** nur in den unter B berührten Modulen, mit Verbraucherliste. V3-Funktionen, die V4 nutzt, bleiben.
   - **E · HUD, kanongedeckt und ohne neue Aktionen:** Skill-Anzeige mit Besitz, Kosten und Wirkung (Kanon §5), sofern noch nicht vollständig vorhanden. Codex prüft das selbst.
   - **F · Abschluss**
     - Risikobasierte Abnahme (R11).
     - Bei Prompt-, Extractor- oder Firewall-Änderungen zusätzlich eine **natürliche Live-Runner-Serie auf der Hauptroute**, etwa 100–200 Züge, mit Nutzerfreigabe von ungefähr 0,2–0,5 USD.
     - Messgrößen: X-Aufrufe pro Zug, Ablehnungsgründe, Wartezeit nach Narrator-Ende (Formel aus 3.1), schwere mechanische Fehler.
2. **Parallel: GPT erstellt die E-Kanonvorlage, der Nutzer entscheidet.** Grundlage ist die Inventur in 3.6. Zu entscheiden sind:
   - E-Begegnungsfenster und E-Gebietskontexte;
   - mindestens ein E-Gebiet und ein E-Dungeon;
   - Rüstungs- und Schildreferenzen E, E-Basisgegenstände und E-Markt;
   - E-Lernquellen;
   - Proven-Board-Profil und -Vergütung (die heutigen Werte sind `proposed`);
   - ob das XP-Tempo so bleibt.

### Was Claude noch sinnvoll übernehmen kann

- **Gegenprüfung der E-Kanonvorlage** gegen Code und Content: Verbraucher, Widersprüche zu bestehenden Regeln, fehlende Stellen.
- **Unabhängige Abnahmeprüfung von Codex-Auftrag 1.** Schwerpunkte: Byte-Gleichheit der F-Prompts, Vollständigkeit der Invarianten, Manifestklassen.
- **Auswertung der Live-Runner-Serie** mit den Skripten aus diesem Ordner, insbesondere Latenz nach X-Anzahl, Cache und Kosten.
- Optional: ein Fachplan „X-Antwortlänge und Reasoning“ als A/B-Versuchsdesign zum Zeithebel aus 3.2, ohne Durchführung.

### Welche Entscheidungen GPT und der Nutzer vorbereiten müssen

1. Die E-Kanonpunkte wie oben.
2. Kostenfreigabe für die Live-Runner-Serie am Ende von Auftrag 1.
3. Welche HUD-Komfortpunkte über reine Anzeigen hinaus in Auftrag 2 dürfen, etwa Quick Actions oder Engine-only-Board und -Handel, die laut Kanon §9 eigene offene Vorhaben sind.
4. Ob Lieferung und Eskorte (ruhend) für die Beta wieder aktiviert werden sollen. Das ist eine spätere Entscheidung, aber für die Auftragsvielfalt relevant.
5. Ob Usertest 17 auf `.262` oder erst nach E-Content stattfinden soll.

### Was bewusst zurückgestellt wird

- Neuarchitektur und Rollenzusammenlegung.
- Weitere Validierungsumbauten ohne Spielbefund.
- Prompt-Kürzung als Selbstzweck. A/B-Versuche bleiben offen, siehe 3.2 zum richtigen Hebel.
- Chatspeicher-Diät und Fold-Cache bis zu einem belegten Engpass.
- Großer Altpfad-Rückbau und Entflechtung von `world.js` bis Party P7 oder große Bewegungsarbeiten anstehen.
- D–S-Klassen und -Skills, Domains, Passive-Kapazität B+.
- PULSE D und NPC E4/E5, bis natürliche Läufe Bedarf zeigen.

### Echte Voraussetzungen vor der E-Rang-Implementierung

1. **Nutzerentscheidungen zum E-Kanon** (Abschnitt 8, Punkt 2). Ohne sie kein E-Content.
2. **Die rangneutrale Parametrisierung** (Auftrag 1 B) ist abgeschlossen, oder sie ist ausdrücklich Teil desselben Auftrags, dann aber als erster, separat nachgewiesener Schritt.
3. **Regressionsnetz mit Invarianten** (Auftrag 1 A). E-Änderungen müssen gegen Geld-, Besitz- und XP-Invarianten prüfbar sein.
4. **Kein wiederkehrender schwerer mechanischer Fehler in `.261`/`.262`.** Das belegt die Live-Runner-Serie; ein persönlicher Usertest ist dafür nicht nötig.

**Keine Voraussetzung sind:** Usertest 17, Altpfad-Rückbau, Entflechtung von `world.js`, Speicheroptimierung und Prompt-Optimierung.

---

## 9. Korrekturen an meinem Bericht vom 27.11.2026

Der ursprüngliche Bericht bleibt unverändert. Es gelten diese Korrekturen:

| Stelle im ersten Bericht | Bisher | Korrigiert | Beleg |
|---|---|---|---|
| §1, §4.1 | „Nach dem letzten sichtbaren Text wartet der Spieler im Median 0,4 s“ | Narrator-Ende → bereit: **3,9 s** (1 X) bzw. **8,8 s** (2 X); `lastRenderedChange` ist die Neudarstellung nach der Buchung | 3.1 |
| §4.1 | „63 Züge ohne Prosamarke vermutlich lokal oder nativ“ | Alle haben einen Narrator-Request; Messlücke des Runners | 3.1 |
| §1, §4.2 | „Prompts durch Caching zu drei Vierteln schon bezahlt“, Narrator 58 % | Auf GLM kein Preisnachlass; Narrator gesamt 33 %, 50 % der Requests ohne Cache | 3.2 |
| §4.2 | Extractor-System `.261` 51.968 | Live 51.693 (Rohwert ohne `worldVocab` war gemeint); Differenz −1.746 Zeichen | 3.3 |
| §1, §4.3, §11 | „Kontext wächst nicht mit der Kampagnenlänge“ | Personen, Threads und Route begrenzt; Teilorte und Inventar ungedeckelt | 3.4 |
| §1, §6 | „E-Rang scheitert am Content, nicht am Code“, „harte Sperre `domain.js` L385“ | F-Festlegungen in Verträgen, Prompts, Validierung, Lernquellen, Markt; `domain.js` ist contentgesteuert, die feste Codegrenze steht in `validate.js` L177 | 3.6 |
| §3.3, A1 | Wildnisbegegnung für `creature.new` gezielt prüfen | Natürlich 0/127 Ablehnungen wegen `population`/`life_stage`; nicht mehr nötig | 3.9 |
| §5.1, B2 | Altpfad-Rückbau „B, parallel“ | „C, schrittweise in berührten Modulen“; kaum Nutzen für E | 3.7, 5 |
| §7, C3 | HUD-Komfort „C“ | In jedes Paket integrieren (kanongedeckte Anzeigen sofort) | R10 |
| §8.4, B3 | „jede dritte Etappe natürlicher Kurzlauf“ | Risikobasiert: natürliche Stichprobe vor Produktfreigabe bei Prompt-, Extractor- oder Firewall-Änderungen, per Live-Runner | R11, 3.10 |
| §12 | Reihenfolge Usertest → Replay → Altlast → E | Variante 3 (Abschnitt 7) | 7 |

---

## 10. Eigene Prüfungen, nicht ausgeführte Prüfungen, Unsicherheiten

**Selbst ausgeführt** (offline, ohne Modellaufrufe, ohne persönliches ST-Profil): alle Skripte in [`claude_261_gegenreview/`](claude_261_gegenreview/). Die Ergebnisse stehen in [`ERGEBNISSE.txt`](claude_261_gegenreview/ERGEBNISSE.txt).

- Latenz pro Zug nach X-Anzahl.
- Request-Lücken.
- Cache und Preis je Request und Route.
- Antwortzeit gegen Tokens.
- Completion-Aufteilung.
- Kosten pro Zug.
- Live-Systemgröße `.251`/`.261`.
- Robuste Faltzeit.
- Synthetische Katalog-Skalierung.
- Korpus-Machbarkeit mit Produktwerkzeug `build_corpus.mjs`.
- Beobachtete Progression.
- `creature.new` in natürlichem Spiel.
- Codelektüre: `world_jobs.js` (Zeitmarken), `catalog.js`, `interpret.js` (`catalogText`), `context.js`, `place_book.js`, `guild.js` (Board-Prüfung, Prompts, Beförderung), `validate.js`, `extract.js` (`worldVocab`, Regeln), `content/deltas.json`, `growth.js`, `passives.js`, `items.js`, `loot.js`, `special_rewards.js`, `progression.js`, Importe von V4 nach V3.
- Dokumente: Kanon `02`, Roadmap `07`, Ideenkatalog `04`, Etappenindex `06`, Arbeitsweise `01`.

**Nicht ausgeführt:**

- Keine Live-Runner- oder Providerläufe.
- Keine Implementierung des Adapters im Produkt; der Adapter liegt nur im Forschungsordner.
- Kein vollständiger Korpusbau mit aufgelösten Elternketten.
- Keine Prompt-Snapshot-Erzeugung für die Byte-Gleichheitsprüfung.
- Keine Kampfsimulation für E-Gegner.
- Keine Prüfung, ob die HUD-Skill-Anzeige laut Kanon §5 schon vollständig umgesetzt ist.

**Unsicherheiten:**

- Alle Laufzeitdaten stammen aus Builds vor `.252`.
- Die Regression „Antwortzeit gegen Prompt-Tokens“ beim GLM-Extractor ist durch Kollinearität nicht interpretierbar, nur die Completion-Abhängigkeit ist robust.
- Das Progressionstempo bis Level 15 ist eine Hochrechnung aus drei Läufen mit Botspielweise. Menschliches Spiel kann langsamer sein.
- Die synthetischen Orte und Gegenstände sind vereinfacht modelliert: Geschwisterorte mit `by: reply`, einfache Gegenstände ohne Profil.
- Die Kosten gelten für die Preise zum Zeitpunkt der Archive.
