# P0 / S0 Structured Output: Ergebnis

- Datum: 2026-09-27T18:39:15.728Z · Dauer 6109 s · Werkzeug s0_structured v1
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash
- Reasoning laut Einstellung: low · Include-Body-Schlüssel: clear_thinking, reasoning_effort
- Aufrufe: 148 (davon 3 Vorab, 55 Reparatur) · Wiederholungen je Fall: 3 · max_tokens 2000 · temperature 0.2

## Vorab-Prüfung

- Verbindung: ok (1.9 s)
- Reasoning-Override `none`: angenommen (2.5 s)
- json_schema: angenommen (2.6 s, Antwort gültig)

## Modi

| Modus | Aufrufe | Fehler | gültig 1. Versuch | reines JSON | gültig nach Reparatur | inhaltlich richtig | p50 s | p90 s | Prompt-Tok. | Output-Tok. | Reasoning-Tok. | Reasoning-Zeichen | abgeschnitten |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| schema_keep (json_schema, Reasoning wie konfiguriert) | 30 | 0 | 6/30 (20 %) | 100 % | 96.7 % | 96.7 % | 5.7 | 19.5 | 1764 | 335 | – | 75 | 0 |
| schema_off (json_schema, Reasoning aus) | 30 | 0 | 6/30 (20 %) | 63.3 % | 70 % | 70 % | 47.2 | 121.9 | 1680 | 1805 | – | 3808 | 10 |
| plain_off (JSON per Anweisung, Reasoning aus) | 30 | 0 | 23/30 (76.7 %) | 70 % | 80 % | 73.3 % | 24.2 | 106.2 | 1551 | 1389 | – | 3287 | 9 |

### Nach Rolle: gültig im 1. Versuch · p50

| Modus | Interpreter | Recovery-Extraktor | Board-Generator |
|---|---|---|---|
| schema_keep | 33.3 % · 3.8 s | 0 % · 18.5 s | 0 % · 14.9 s |
| schema_off | 33.3 % · 19.5 s | 0 % · 107.6 s | 0 % · 107.8 s |
| plain_off | 100 % · 16.3 s | 22.2 % · 104.2 s | 100 % · 64.3 s |

### Fälle: gültig (1. Versuch) · inhaltlich richtig · p50

| Fall | schema_keep | schema_off | plain_off |
|---|---|---|---|
| mode_question | 3/3 · 3/3 · 1.2 s | 3/3 · 3/3 · 6.8 s | 3/3 · 3/3 · 6.1 s |
| interp_go_guild | 0/3 · 3/3 · 4.6 s | 0/3 · 3/3 · 22.1 s | 3/3 · 3/3 · 9.5 s |
| interp_turnin_then_inn | 0/3 · 3/3 · 5.7 s | 0/3 · 3/3 · 55.6 s | 3/3 · 3/3 · 38.4 s |
| interp_negative_thought | 3/3 · 3/3 · 1 s | 3/3 · 3/3 · 6.8 s | 3/3 · 3/3 · 7.2 s |
| interp_price_limit | 0/3 · 3/3 · 5.1 s | 0/3 · 3/3 · 18 s | 3/3 · 3/3 · 17 s |
| interp_gather_day | 0/3 · 3/3 · 4.7 s | 0/3 · 3/3 · 47.2 s | 3/3 · 3/3 · 19.8 s |
| extract_arrival | 0/3 · 3/3 · 15.7 s | 0/3 · 0/3 · 103.8 s | 1/3 · 1/3 · 106.2 s |
| extract_absent_person | 0/3 · 3/3 · 19.4 s | 0/3 · 0/3 · 121.9 s | 0/3 · 0/3 · 106.3 s |
| extract_offer_overreach | 0/3 · 3/3 · 19.5 s | 0/3 · 0/3 · 107.6 s | 1/3 · 0/3 · 101.2 s |
| board_two_listings | 0/3 · 2/3 · 14.9 s | 0/3 · 3/3 · 107.8 s | 3/3 · 3/3 · 64.3 s |

## Entscheidung

- **Strukturierter Modus: JSON per Anweisung (Modus C)**
- **Reasoning für Interpreter, Recovery und Generator: wie konfiguriert**
- Gewählter Modus `plain_off`: Interpreter-Fälle p50 16.3 s (Gate „p50 ≤ 6 s“ prüft S1 mit dem echten Interpreter-Prompt), Tokens je Aufruf ≈ 1551 Prompt + 1389 Output.
- Reasoning bleibt wie konfiguriert: Mit none war die Antwort weniger zuverlässig (Fehler 0 %, gültig 20 %, richtig 70 %).
- Strukturierter Modus: JSON per Anweisung (Modus C). schema_keep: Fehler 0 %, gültig im 1. Versuch 20 %, richtig 96.7 %; plain_off: gültig 76.7 %, richtig 73.3 %.
- Hinweis: schema_keep und plain_off liefen mit unterschiedlichem Reasoning; der Vergleich ist nur ein Richtwert.
- S1 und S2 übernehmen diese Wahl aus `p0_out/s0/decision.json` (überschreibbar mit `--mode` und `--reasoning`).

## Auffälligkeiten (höchstens 25)

- schema_keep · interp_go_guild #1: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_go_guild #1: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_turnin_then_inn #1: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_turnin_then_inn #1: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_price_limit #1: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_price_limit #1: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_gather_day #1: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_gather_day #1: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_keep · extract_arrival #1: ungültig: $.deltas[0]: matches none of anyOf; $.deltas[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · extract_arrival #1: ungültig: report is not valid JSON
- schema_keep · extract_absent_person #1: ungültig: $.deltas[0]: matches none of anyOf; $.deltas[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · extract_absent_person #1: ungültig: report is not valid JSON
- plain_off · extract_absent_person #1: ungültig: report is not valid JSON
- schema_keep · extract_offer_overreach #1: ungültig: $.expected.1: expected object, got string; $.deltas[0]: matches none of anyOf → nach Reparatur gültig
- schema_off · extract_offer_overreach #1: ungültig: report is not valid JSON
- plain_off · extract_offer_overreach #1: inhaltlich: offer prices []; no overreach
- schema_keep · board_two_listings #1: ungültig: $.listings[0]: missing required "client"; $.listings[0]: missing required "level" → nach Reparatur gültig
- schema_off · board_two_listings #1: ungültig: $.listings[0]: missing required "client"; $.listings[0]: missing required "level" → nach Reparatur gültig
- schema_keep · interp_go_guild #2: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_go_guild #2: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_turnin_then_inn #2: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_turnin_then_inn #2: ungültig: $.commands[0]: matches none of anyOf; $.commands[1]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_price_limit #2: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_off · interp_price_limit #2: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig
- schema_keep · interp_gather_day #2: ungültig: $.commands[0]: matches none of anyOf → nach Reparatur gültig

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
