# P0 / S2 World-Delta-Strategie: Ergebnis

- Datum: 2026-09-27T21:03:29.147Z · Werkzeug s2_deltas v1 · Delta-Vokabular delta-0.1-draft · 19 Züge (V11, V12)
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash · Extraktor: plain, Reasoning wie konfiguriert (Kommandozeile) · Erzähler: Parameter der Läufe (temperature 0.9, top_p 0.95)
- Varianten in diesem Ergebnis: A (2026-09-27T20:11:03.256Z) und B (2026-09-27T21:03:29.143Z)

## Variante A: Extraktion nach jeder Antwort (aufgezeichnete Prosa)

| Kennzahl | Wert |
|---|---|
| Antwort gültig (Schema) / vollständig | 26.3 % / 26.3 % |
| **Semantische Genauigkeit** (je Gold-Element; Mittel je Zug) | **12.2 %** (23.7 %) |
| Kritische Deltas gefunden | 4/6 (66.7 %) |
| expected-Felder richtig | 2/2 (100 %) |
| Verbotene Deltas (falsch gemeldet) | 0 |
| Token je Aufruf (Prompt / Output) | 3237 / 920 |
| Latenz p50 / p90 | 21.2 / 44.7 s |

## Variante B: Erzähler schreibt Prosa + Block, Recovery nur bei Bedarf

| Kennzahl | Wert |
|---|---|
| Erzähler-Antworten | 19/19 |
| Block vorhanden / gültig / vollständig | 73.7 % / 10.5 % / 63.2 % |
| **Block gültig und vollständig** | **10.5 %** (Schwelle ≥ 80 %) |
| Recovery-Quote r (fehlend / ungültig / unvollständig) | 89.5 % (5 / 12 / 0) |
| Recovery erfolgreich | 4/17 |
| Erzähler: Prompt- / Output-Token je Zug (davon Block, geschätzt) | 7936 / 553 (103) |
| Erzähler-Latenz p50 / p90 | 32.9 / 52 s |
| Block zur aufgezeichneten Prosa: gültig und vollständig | 10.5 % |
| **Semantische Genauigkeit B** (Block zur aufgezeichneten Prosa; je Gold-Element; Mittel je Zug) | **57.4 %** (53.5 %) |
| Kritische Deltas gefunden / expected richtig / verbotene Deltas | 23/33 / 8/13 / 5 |

## Entscheidung D2 (Regel §5.6)

- **Empfehlung: Variante A** (Extraktion nach jeder Antwort)
- Block gültig und vollständig in 10.5 % der B-Antworten (Schwelle ≥ 80 %): nicht erfüllt
- Semantische Genauigkeit B 57.4 % gegen A 12.2 % (B darf höchstens 5 Punkte darunter liegen): erfüllt

### Token und Latenz je Story-Zug (gemessen, Hochrechnung wie Plan §9)

|  | Variante A | Variante B |
|---|---|---|
| Token je Zug (Erzähler + Extraktion bzw. Recovery × r) | 11516 | 12119 |
| blockierend bis Antwort vollständig (p50) | 26.8 s | 32.9 s |
| im Hintergrund (p50) | 21.2 s nach jeder Antwort | 24.2 s in 89.5 % der Züge |

Bausteine: Erzähler-Prompt B ≈ 7936 Token (davon WORLD-DELTAS-Anweisung ≈ 1028), Erzähler-Output B ≈ 553 (Block ≈ 103), Extraktion ≈ 4157, Recovery ≈ 4056 Token.

## Abweichungen je Zug (27, höchstens 50)

- A · v11_01: fehlt: person.new /clerk/i, time
- A · v11_02: keine gültige Antwort ($.deltas[1]: matches none of anyOf)
- A · v11_05: keine gültige Antwort ($.deltas[3]: matches none of anyOf; $.deltas[4]: matches none of anyOf)
- A · v11_06: keine gültige Antwort ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- A · v11_07: keine gültige Antwort ($.deltas[3]: matches none of anyOf; $.deltas[4]: matches none of anyOf)
- A · v11_09: keine gültige Antwort ($.deltas[0]: matches none of anyOf; $.deltas[3]: matches none of anyOf)
- A · v11_10: keine gültige Antwort ($.deltas[2]: matches none of anyOf; $.deltas[3]: matches none of anyOf)
- A · v11_11: keine gültige Antwort ($.expected.2.at: matches none of anyOf; $.deltas[0]: matches none of anyOf)
- A · v12_01: keine gültige Antwort ($.deltas[2]: matches none of anyOf)
- A · v12_02: keine gültige Antwort ($.deltas[0]: matches none of anyOf; $.deltas[2]: matches none of anyOf)
- A · v12_03: keine gültige Antwort ($.deltas[1]: matches none of anyOf; $.deltas[2]: matches none of anyOf)
- A · v12_04: keine gültige Antwort ($.deltas[2]: matches none of anyOf; $.deltas[3]: matches none of anyOf)
- A · v12_06: keine gültige Antwort ($.deltas[1]: matches none of anyOf)
- A · v12_07: keine gültige Antwort ($.deltas[2]: matches none of anyOf)
- A · v12_08: keine gültige Antwort (report is not valid JSON)
- B · v11_01: expected falsch: 1 · fehlt: arrive "loc.alderwatch.guild_hall"
- B · v11_02: verboten gemeldet: offer
- B · v11_03: verboten gemeldet: object.new
- B · v11_05: expected falsch: 2
- B · v11_06: keine gültige Antwort (block is not JSON: report is not valid JSON)
- B · v11_11: expected falsch: 3 · fehlt: object.mark, arrive "loc.alderwatch.guild_hall" · verboten gemeldet: coin.gift, quest.close
- B · v12_01: expected falsch: 1 · fehlt: arrive "loc.redmarch.guild_hall"
- B · v12_02: verboten gemeldet: offer
- B · v12_03: fehlt: listing.gone, person.new /adventurer|mud/i
- B · v12_04: fehlt: person.new /ossler/i, quest.detail
- B · v12_07: expected falsch: 2 · fehlt: arrive "loc.redmarch.guild_hall"
- B · v12_08: fehlt: overreach

## B: Blöcke, die eine Recovery brauchten

- v11_01: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_03: invalid ($.deltas[1]: matches none of anyOf; $.deltas[3]: matches none of anyOf)
- v11_04: missing (no <avereth> block)
- v11_05: invalid ($.expected.2.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_06: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_07: invalid ($.deltas[4]: matches none of anyOf)
- v11_08: invalid ($.deltas[0]: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_09: invalid ($.expected.2.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_10: missing (no <avereth> block)
- v11_11: missing (no <avereth> block) · fehlende expected: 2, 3
- v12_01: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v12_02: missing (no <avereth> block)
- v12_03: invalid ($.deltas[2]: matches none of anyOf; $.deltas[3]: matches none of anyOf)
- v12_04: invalid ($.deltas[1]: matches none of anyOf)
- v12_06: missing (no <avereth> block) · fehlende expected: 1
- v12_07: invalid ($.expected: unexpected property "1"; $.deltas[1]: matches none of anyOf) · fehlende expected: 2
- v12_08: invalid ($: unexpected property "3"; $.expected.2.at: matches none of anyOf) · fehlende expected: 3

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
