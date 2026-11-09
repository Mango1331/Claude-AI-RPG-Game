# GPT – unabhängiger Gegenreview NPC-/PULSE-Live-Runner `2449990` (09.11.2026)

**Urteil: Der neue natürliche Testmodus trifft den fachlichen Auftrag; vor dem kostenpflichtigen Zweierbatch ist jedoch ein enger P2-Korrekturpatch im Auswerter erforderlich.** Die Spielengine bleibt technisch auf Build `.174`. Der bestätigte Fehler betrifft **Messgenauigkeit der tatsächlichen Anker-/Abspracheauslieferung**, nicht NPC-, PULSE- oder Questbuchungen. Der Runner und sein Guide sollten nicht aus Prinzip umgebaut werden.

## 1. Basis, Abgrenzung und Nachweise

Git-Remote-HEADs beim Review: `main` [`94510e7`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/94510e76c0fc9b836e206677e8f2fabab17f9837); Produktbranch [`2449990`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2449990b74bb24c490dc7189d385ebc44f5d3827). Vergleich ab [`.174` / `f9b3e79`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f9b3e79759386ebd715a046c196edcfbfa977544): **genau ein Commit voraus, null zurück**. Geändert sind `tools/st_live/live/` (Guide, Szenarien, Batch, Auswertung, Player-/Runner-Integration und Stub), zugehörige Runner-Tests, `package.json` und `docs/LIVE_RUNNER.md`; keine World-, State-, PULSE- oder NPC-Engineänderung.

**Eigenständig geprüft:** Produktdiff/Dateiliste; vollständige `npc_pulse.mjs`, `npc_pulse_runner.test.js`, neuen Guide, Profil-/Batchsteuerung und relevante `run_live.mjs`-, `players.mjs`-, `calls.mjs`- und `context.js`-Stellen. Zwei **isolierte JavaScript-Gegenproben der tatsächlichen String-/Schleifenbedingungen** belegen die unten genannten Fehlklassifikationen. **Nicht eigenständig durchgeführt:** die vollständige Node-/Runner-Suite, ein ST-Selbsttest oder ein natürlicher LLM-Lauf. Implementiererangaben bleiben separat.

## 2. Was stimmt

- Der separate `--mode npc` startet die Profile `npc-sociable` (Warrior, gesellig) und `npc-wary` (Rogue, vorsichtig) mit Batchseed und +1. `--mode guild` bleibt der Standard; die bisherige Guild-/Explore-Szenario-Reihenfolge und ihre Seeds sind unverändert.
- `npc_pulse_test`: Gildenquest als Motivation, daneben wiederholte natürliche Kontakte, Absprachen, mögliche freiwillige Begleiter, freie freundliche oder feindselige Reaktionen, Reisen, Rast und Dungeon. Keine vorgegebenen NPCs/Antworten, Szenen oder erzwungenen PULSE-Würfe. 70 Eingaben als Dauerziel, 80 als Sicherheitsgrenze; keine erzwungene Level-15-Karriere.
- Die Auswertung liest tatsächlich gespeicherte Chatevents, Roh-Extraktion und optionale Modellrequests, ohne zusätzliche LLM-Calls oder neue Spielzustandsautorität. `observed`, `not covered`, `violations` und semantische `review`-Fälle sind sinnvoll voneinander getrennt. Der Spieler selbst erhält weiterhin nur sichtbares ST-Spielmaterial, keine Event- oder Evaluatordaten.
- Paket D/PULSE-Parameter, E4/E5, NPC-Ankermechanik, Stimmungssperre und `attitude` bleiben unberührt. Ein natürlicher Runnerlauf beweist kein subjektives Spielerlebnis.

## 3. P2-A: Anker-/Abspracheauslieferung wird falsch gemessen

**Betroffen:** `tools/st_live/live/npc_pulse.mjs` Zeilen **186–211** (`narratorCall`, `requestText`, `a.later`, `a.onCard`); `coverage` `anchor_on_card`/`agreement_on_card` Zeilen 249/254.

1. **Trunkierung als positiver Treffer:** `head = `${a.p}: ${String(a.o).slice(0,24)}``; `requestText(call.request).includes(head)`. Nur die ersten 24 Zeichen eines bis zu 80 Zeichen langen E3-Werts genügen für `inPrompt:true`. Die 170-Zeichen-Kompaktkarte kann `manner` mitten im Wert kürzen und `interest` ganz verdrängen. Für die eigens zu messende E3-Kontextgrenze ist ein solcher positiver Befund **falsch**. Bei Absprachen gilt ein vergleichbarer bloßer 30-Zeichen-Präfixvergleich.
2. **Historische Treffer statt aktuelle Karte:** `requestText()` verkettet **sämtliche** `request.messages`, nicht den aktuellen Engineblock. Ein Anker-/Absprachewortlaut aus älterer Konversation oder anderen Promptabschnitten genügt für einen positiven Treffer. `calls.mjs::roleOf()` zeigt bereits, wie der aktuelle Block sicher identifiziert werden kann: Die entsprechende Nachricht beginnt mit `[AVERETH ENGINE`.
3. **Spätere echte Auslieferung wird übersehen:** Die Schleifen brechen beim **ersten** späteren Antwortzug ab, in dem der NPC anwesend ist. Steht er dann nicht im Karten-Slot, wird `inPrompt:false` vermerkt; erscheint seine volle Karte erst beim folgenden direkten Gespräch, wird sie nicht mehr geprüft. Das erzeugt **falsche Nichtabdeckung**.

**Isolierte eigene Gegenprobe:** Eine gültige V4-Kopfzeile (Werte `voice=46`, `manner=71`, `interest=52` Zeichen) ist nach 170 Zeichen mitten in `manner` abgeschnitten: `head` trifft trotzdem, obwohl der volle `manner`-Wert und `interest` fehlen. Ein älterer Requestabschnitt mit demselben Teilstring erzeugt ebenfalls einen Treffer ohne aktuellen Kartenbeleg. Eine zweizügige Folge `noch kein Kartenplatz → volle Karte im nächsten Zug` erzeugt mit `break` dagegen `false` trotz tatsächlicher späterer Lieferung. Dies sind **JS-Logikgegenproben**, keine vollständigen `npcPulseAnalysis()`-Hostdurchläufe.

**Korrekturauflage:** Im bestehenden Request die **aktuelle** `[AVERETH ENGINE`-Nachricht auswerten, den **vollständigen** gespeicherten Wert an der richtigen NPC-Karte prüfen, eine gekürzte Karte als **teilweise**, nicht als vollständig geliefert erfassen. Alle relevanten späteren Züge bis zur tatsächlichen vollständigen Auslieferung prüfen, nicht beim ersten bloßen NPC-Anwesenheitszug abbrechen. Fehlende Requests = unbekannt (`?`), nicht Misserfolg. Für Absprachen dasselbe Prinzip. Positiv-/Negativ-Gegenfälle einschließlich langer Werte, älterer Request-Treffer und verspäteter Karte ergänzen; kein Modellcall.

## 4. P2-B: Fehlende Analyse darf nicht als vollständig ausgewerteter Batch enden

**Betroffen:** `run_live.mjs` ca. Zeilen **505–513**. `npcPulseAnalysis()` läuft unter `try/catch`, bei Fehler wird nur `log(...)` geschrieben. `run.json`/`report.md` und der Batch können trotzdem `done`/`completed` melden, ohne `npc-pulse.json`/`.md`. Ein sehr kostspieliger natürlicher Lauf hätte dann genau seine beauftragte Auswertung nicht geliefert.

**Korrekturauflage:** Wenn der Leitfaden `analysis:'npc_pulse'` vorgibt, muss Auswertungsfehler oder fehlendes Pflichtartefakt im Lauf-/Batchstatus bzw. Bericht **sichtbar und eindeutig** sein. Rohdaten/Exports/Geheimnisscan weiter sichern. Eine kleine Fehlerpfad-Regression genügt; keine neue Export- oder Monitoringarchitektur.

## 5. Weitere Grenzen, ohne Zusatzpatchpflicht

- `pulse.outcome.narrated` ist eine Engineheuristik, keine semantische Gewissheit. Ähnlich ist ein abgelehnter `met`-Beleg noch kein Nachweis dafür, was freie Prosa tatsächlich tat. Semantik nur mit Originalpassage beurteilen; nicht in automatische „Verletzungen“ hineininterpretieren.
- Ein vollständig grüner Stub-Selbsttest prüft Setup, Export und Berichtsverknüpfung, nicht freie Narrator-/Extractorbefolgung oder subjektives Spielgefühl.
- Ein Batch mit zwei bis zu 80-Eingaben-Läufen kann laut Sol etwa **600–700 Modellaufrufe** verursachen (Schätzung, nicht gemessene `.174`-Kosten). Erst nach den beiden Datenqualitätskorrekturen ggf. **einen kürzeren Pilotlauf** prüfen, bevor die gesamte Serie gestartet wird. `--max-turns 20–30` endet vor dem Guideziel als `limit`; fehlende Langlaufabdeckung ist dann erwartet, kein technischer Misserfolg.
- Sol meldet im historischen `selftest.mjs` **49/51**, nach eigener Gegenprüfung ebenso auf unverändertem `.174`. Diese zwei Abweichungen nicht ungeprüft dem NPC-Runner zuschreiben; vorerst getrennte historische Stub-/Guide-Drift.

## 6. Tests und Abschluss

**Laut Sols Implementierungsbericht** (nicht erneut von GPT ausgeführt): sieben neue Regressionen grün; Runner-Suite **156/156**; vollständige Node-Suite **2984/2984**; ein echter ST1.19-Stub-Selbsttest mit zwei korrekt erstellten Profilen, Exporten, unverändertem Userprofil und sauberem Geheimnisscan. Beide Stub-Kampagnen endeten bewusst nach vier Eingaben und sind **keine natürliche Abnahme**. Ein kostenpflichtiger natürlicher Modellbatch wurde nicht gestartet.

**Reviewurteil:** Der gewünschte Runner-/Guide-Umfang ist fertig; **noch keine Freigabe für den großen kostenpflichtigen NPC-/PULSE-Batch**, solange P2-A/B die Berichtszuverlässigkeit beeinträchtigen. Ein einzelner **enger Runner-only-Korrekturpatch** mit gezielten Vorher-/Nachher-Regressionsfällen genügt. Keine Engine-, Regel-, Balance-, E4/E5- oder PULSE-D-Änderung. Ein erneuter großer Architektur- oder Gesamtpatch ist weder begründet noch freigegeben.
