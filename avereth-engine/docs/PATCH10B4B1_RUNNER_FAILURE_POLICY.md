# Avereth Engine – Patch 10B-4b.1: abgestufte Runner-Fehlerpolitik

**Basis:** `99195f0` / Extension Build `.61`. **Status:** implementiert auf dem Entwicklungsbranch, 12 neue Tests geschrieben, noch nicht lokal ausgeführt. **Runner-only:** kein Engine-/Narrator-/Extractor-Code verändert, keine Build-Erhöhung.

## Entscheidung für freie 100-Züge-Langläufe

Der Runner soll nicht wegen jeder Extractor-Störung abbrechen, wenn kein mechanischer Zustand erwartet wurde. Gleichzeitig darf ein Ausfall bei GO, GIVE, Kampf oder anderen erwarteten Weltänderungen nicht durch bloße Narrator-Prosa übergangen werden.

**Konservativer Soft-Fall:** `extractor_failed` wird im **automatischen Test** als `extractor_failed_soft` behandelt und der Lauf fortgesetzt, aber ausschließlich wenn der gespeicherte **Engine-authored** Spieler-Record alle Bedingungen beweist:

1. `interp.commands` ist ausdrücklich ein leeres Array.
2. Der Spielerzug enthält ausschließlich `turn.begun`, `cmd.interpreted` und genau ein `outcome.recorded`, **keine** zusätzlichen spielweltverändernden Engineevents.
3. Das Outcome ist `kind: 'v4'`, seine `expected_keys` sind leer und `actions` ist genau eine Engine-NOT​HING-TO-BOOK-Zeile; `resolutions`, `conditionals` und `booked` sind leer.
4. Ein normaler sichtbarer Narrator-Text war vorhanden; der Extractor ist **ausdrücklich `failed`**, nicht `late`, `pending` oder `skipped`.

Unvollständige alte Records, uneindeutige Outcomes oder jegliche relevante geplante Mechanik bleiben **harte** Fehler. Diese Grenze behauptet **nicht**, dass Dialoggeschichte und nichtmechanische NPC-Aussagen aus einer failed Extraction vollständig persistent wären. Die bestehende Engine-`FAILED_CORRECTION` bleibt erhalten, der Fehler steht weiterhin in `evaluation.issues` sowie `turnsLog[].outcome/softFailure`.

## Weitere enge Korrekturen

- **`extractor_timeout`:** Wenn der Browser-Driver mit `the turn did not end within … (… extraction pending)` abbricht, und die gespeicherte Story-Antwort im Chat weiterhin `extraction.status: pending` hat, erhält der Lauf `extractor_timeout` statt `ui`. Der Originalrecord bleibt für ZIP-Auswertung erhalten; kein künstliches Timeout-Healing.
- **Planner/Interpreter:** `planner_failed` setzt tatsächlich `plan.failed === true` voraus; ein bloß vorhandenes `plan`-Objekt begründet keinen Planner-Ausfall.
- **Screenshot und Diagnose:** Driver-Abbrüche werden erst nach Chatprüfung fotografiert, mit dem belegten Phasennamen; misslingt die Prüfung selbst, kommt eine knappe Logzeile statt leerem `catch {}`. Andere UI-Fehler bleiben UI.
- **`extractor_late`:** Theoretischer Zustand für diesen Runnerpfad, weil `closeLatePending` erst beim Beginn eines späteren Zuges aktiv wird, während der Driver normalerweise auf `pending` wartet. Keine künstliche Live-Erreichbarkeit behaupten.

## Änderungen / Testabdeckung

- `tools/st_live/live/evaluator.mjs`: `softExtractionFailure`, `driverFailure`, verbesserte Phasenzuordnung und `failureEnd` um Extractor-Timeout.
- `tools/st_live/live/run_live.mjs`: soft/hard-Stoppolitik, Timeoutklassifikation, fehlerphasenspezifische Screenshots/Logs, Terminalrecord erhalten.
- `tests/live_runner/patch10b4b1_failure_policy.test.js`: 12 fokussierte Tests für reinen Dialog, Weltaktion, erwartete Schlüssel, zusätzliche Engineevents, falsche/fehlende Metadaten, `late` und `pending`, die normale Planner/Interpreter-Unterscheidung sowie UI-Fallback.

**Unverändert:** `current_test`, Player-Prompt, Gameplay, Kampf, Quests, Inventar, Engine-Version `.61`, Providerrequests, Narrator- und Extractor-Retries.

## Teststand / nächste Schritte

Auf `99195f0` laut unabhängiger lokaler Nutzer-/Reviewer-Ausführung **12/12** bestehende 10B-4b-Tests und **1358/1358** gesamte Node-Suite grün. Das sind **Vorher-Werte**. Die **12 zusätzlichen 4b.1-Tests und die neue Vollsuite (voraussichtlich 1370 Tests)** wurden in dieser ChatGPT-Umgebung nicht ausgeführt; es liegt kein vollständiger ausführbarer Checkout vor. Ein echter SillyTavern-Smoke/GLM-Langlauf wurde ebenfalls nicht ausgeführt.

Nach Pull in `avereth-engine`:

```powershell
node --test tests/live_runner/patch10b4b1_failure_policy.test.js
npm test
```

Danach unabhängiges Gegenreview und, wenn geeignet, erneuter natürlicher Langlauf. **Dieser Patch behebt keine gescheiterte Extraction im eigentlichen Spiel**; er entscheidet nur, wann die diagnostische Langlaufbeobachtung beendet wird. Die eigentliche Narrator-/Extractor-Recovery bleibt Teil eines späteren 10B-4-Schritts.
