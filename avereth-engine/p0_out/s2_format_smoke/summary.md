# P0 / S2 World-Delta-Strategie: Ergebnis

- Datum: 2026-09-27T21:53:36.594Z · Werkzeug s2_deltas v1 · Delta-Vokabular delta-0.1-draft · 8 Züge (V11, V12)
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash · Extraktor: plain, Reasoning wie konfiguriert (Kommandozeile) · Erzähler: Parameter der Läufe (temperature 0.9, top_p 0.95)
- Varianten in diesem Ergebnis: A (2026-09-27T21:42:15.338Z) und B (2026-09-27T21:53:36.591Z)

## Variante A: Extraktion nach jeder Antwort (aufgezeichnete Prosa)

| Kennzahl | Wert |
|---|---|
| Antwort gültig (Schema) / vollständig | 100 % / 100 % |
| **Semantische Genauigkeit** (je Gold-Element; Mittel je Zug) | **87 %** (93.3 %) |
| Kritische Deltas gefunden | 13/14 (92.9 %) |
| expected-Felder richtig | 7/7 (100 %) |
| Verbotene Deltas (falsch gemeldet) | 2 |
| Token je Aufruf (Prompt / Output) | 2158 / 397 |
| Latenz p50 / p90 | 31.5 / 46.5 s |

## Variante B: Erzähler schreibt Prosa + Block, Recovery nur bei Bedarf

| Kennzahl | Wert |
|---|---|
| Erzähler-Antworten | 8/8 |
| Block vorhanden / gültig / vollständig | 62.5 % / 37.5 % / 62.5 % |
| **Block gültig und vollständig** | **37.5 %** (Schwelle ≥ 80 %) |
| Recovery-Quote r (fehlend / ungültig / unvollständig) | 62.5 % (3 / 2 / 0) |
| Recovery erfolgreich | 5/5 |
| Erzähler: Prompt- / Output-Token je Zug (davon Block, geschätzt) | 8336 / 544 (75) |
| Erzähler-Latenz p50 / p90 | 33 / 52.4 s |
| Block zur aufgezeichneten Prosa: gültig und vollständig | 50 % |
| **Semantische Genauigkeit B** (Block zur aufgezeichneten Prosa; je Gold-Element; Mittel je Zug) | **62.5 %** (70.4 %) |
| Kritische Deltas gefunden / expected richtig / verbotene Deltas | 10/14 / 5/7 / 3 |

## Entscheidung D2 (Regel §5.6)

- **Empfehlung: Variante A** (Extraktion nach jeder Antwort)
- Block gültig und vollständig in 37.5 % der B-Antworten (Schwelle ≥ 80 %): nicht erfüllt
- Semantische Genauigkeit B 62.5 % gegen A 87 % (B darf höchstens 5 Punkte darunter liegen): nicht erfüllt

### Token und Latenz je Story-Zug (gemessen, Hochrechnung wie Plan §9)

|  | Variante A | Variante B |
|---|---|---|
| Token je Zug (Erzähler + Extraktion bzw. Recovery × r) | 9793 | 10517 |
| blockierend bis Antwort vollständig (p50) | 28.5 s | 33 s |
| im Hintergrund (p50) | 31.5 s nach jeder Antwort | 26.1 s in 62.5 % der Züge |

Bausteine: Erzähler-Prompt B ≈ 8336 Token (davon WORLD-DELTAS-Anweisung ≈ 1567), Erzähler-Output B ≈ 544 (Block ≈ 75), Extraktion ≈ 2555, Recovery ≈ 2620 Token.

## Abweichungen je Zug (6, höchstens 50)

- A · v11_01: fehlt: time
- A · v11_11: verboten gemeldet: coin.gift, quest.close
- B · v11_01: expected falsch: 1 · fehlt: arrive "loc.alderwatch.guild_hall"
- B · v11_03: verboten gemeldet: quest.close, object.new
- B · v11_11: expected falsch: 3 · fehlt: object.mark, arrive "loc.alderwatch.guild_hall" · verboten gemeldet: coin.gift
- B · v12_08: fehlt: overreach

## B: Blöcke, die eine Recovery brauchten

- v11_03: invalid ($.deltas[2]: matches none of anyOf)
- v11_11: missing (no <avereth> block) · fehlende expected: 2, 3
- v12_02: invalid ($.deltas[2]: matches none of anyOf)
- v12_06: missing (no <avereth> block) · fehlende expected: 1
- v12_08: missing (no <avereth> block) · fehlende expected: 2, 3

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
