# P0 / S0 Structured Output: Ergebnis

- Datum: 2026-09-27T19:04:08.599Z · Dauer 302 s · Werkzeug s0_structured v1
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash
- Reasoning laut Einstellung: low · Include-Body-Schlüssel: clear_thinking, reasoning_effort
- Aufrufe: 33 (davon 3 Vorab, 0 Reparatur) · Wiederholungen je Fall: 3 · max_tokens 2000 · temperature 0.2

## Vorab-Prüfung

- Verbindung: ok (1.6 s)
- Reasoning-Override `none`: angenommen (2.5 s)
- json_schema: angenommen (3.1 s, Antwort gültig)

## Modi

| Modus | Aufrufe | Fehler | gültig 1. Versuch | reines JSON | gültig nach Reparatur | inhaltlich richtig | p50 s | p90 s | Prompt-Tok. | Output-Tok. | Reasoning-Tok. | Reasoning-Zeichen | abgeschnitten |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| plain_keep (JSON per Anweisung, Reasoning wie konfiguriert) | 30 | 0 | 30/30 (100 %) | 100 % | 100 % | 100 % | 4.8 | 19.3 | 1187 | 157 | – | 70 | 0 |

### Nach Rolle: gültig im 1. Versuch · p50

| Modus | Interpreter | Recovery-Extraktor | Board-Generator |
|---|---|---|---|
| plain_keep | 100 % · 4.1 s | 100 % · 16.7 s | 100 % · 19.3 s |

### Fälle: gültig (1. Versuch) · inhaltlich richtig · p50

| Fall | plain_keep |
|---|---|
| mode_question | 3/3 · 3/3 · 1.6 s |
| interp_go_guild | 3/3 · 3/3 · 4.2 s |
| interp_turnin_then_inn | 3/3 · 3/3 · 4.3 s |
| interp_negative_thought | 3/3 · 3/3 · 1 s |
| interp_price_limit | 3/3 · 3/3 · 4.3 s |
| interp_gather_day | 3/3 · 3/3 · 4.9 s |
| extract_arrival | 3/3 · 3/3 · 13.4 s |
| extract_absent_person | 3/3 · 3/3 · 19.9 s |
| extract_offer_overreach | 3/3 · 3/3 · 18.6 s |
| board_two_listings | 3/3 · 3/3 · 19.3 s |

## Entscheidung

- **Strukturierter Modus: JSON per Anweisung (Modus C)**
- **Reasoning für Interpreter, Recovery und Generator: wie konfiguriert**
- Gewählter Modus `plain_keep`: Interpreter-Fälle p50 4.1 s (Gate „p50 ≤ 6 s“ prüft S1 mit dem echten Interpreter-Prompt), Tokens je Aufruf ≈ 1187 Prompt + 157 Output.
- Strukturierter Modus: JSON per Anweisung (Modus C). json_schema wurde vom Provider abgelehnt.
- S1 und S2 übernehmen diese Wahl aus `p0_out/s0/decision.json` (überschreibbar mit `--mode` und `--reasoning`).

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
