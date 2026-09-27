# P0 / S2 World-Delta-Strategie: Ergebnis

- Datum: 2026-09-27T23:05:05.874Z · Werkzeug s2_deltas v1 · Delta-Vokabular delta-0.1-draft · 41 Züge (V8, V9, V10, V11, V12)
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash · Extraktor: plain, Reasoning wie konfiguriert (Kommandozeile) · Erzähler: Parameter der Läufe (temperature 0.9, top_p 0.95)
- Varianten in diesem Ergebnis: A (2026-09-27T22:14:08.901Z) und B (2026-09-27T23:05:05.866Z)

## Variante A: Extraktion nach jeder Antwort (aufgezeichnete Prosa)

| Kennzahl | Wert |
|---|---|
| Antwort gültig (Schema) / vollständig | 100 % / 100 % |
| **Semantische Genauigkeit** (je Gold-Element; Mittel je Zug) | **87.4 %** (85.2 %) |
| Kritische Deltas gefunden | 58/63 (92.1 %) |
| expected-Felder richtig | 25/25 (100 %) |
| Verbotene Deltas (falsch gemeldet) | 7 |
| Token je Aufruf (Prompt / Output) | 2128 / 370 |
| Latenz p50 / p90 | 22.3 / 35.4 s |

## Variante B: Erzähler schreibt Prosa + Block, Recovery nur bei Bedarf

| Kennzahl | Wert |
|---|---|
| Erzähler-Antworten | 41/41 |
| Block vorhanden / gültig / vollständig | 80.5 % / 43.9 % / 75.6 % |
| **Block gültig und vollständig** | **43.9 %** (Schwelle ≥ 80 %) |
| Recovery-Quote r (fehlend / ungültig / unvollständig) | 56.1 % (8 / 15 / 0) |
| Recovery erfolgreich | 23/23 |
| Erzähler: Prompt- / Output-Token je Zug (davon Block, geschätzt) | 8547 / 541 (114) |
| Erzähler-Latenz p50 / p90 | 33.7 / 51.2 s |
| Block zur aufgezeichneten Prosa: gültig und vollständig | 65.9 % |
| **Semantische Genauigkeit B** (Block zur aufgezeichneten Prosa; je Gold-Element; Mittel je Zug) | **67.3 %** (65 %) |
| Kritische Deltas gefunden / expected richtig / verbotene Deltas | 48/63 / 18/25 / 10 |

## Entscheidung D2 (Regel §5.6)

- **Empfehlung: Variante A** (Extraktion nach jeder Antwort)
- Block gültig und vollständig in 43.9 % der B-Antworten (Schwelle ≥ 80 %): nicht erfüllt
- Semantische Genauigkeit B 67.3 % gegen A 87.4 % (B darf höchstens 5 Punkte darunter liegen): nicht erfüllt

### Token und Latenz je Story-Zug (gemessen, Hochrechnung wie Plan §9)

|  | Variante A | Variante B |
|---|---|---|
| Token je Zug (Erzähler + Extraktion bzw. Recovery × r) | 9911 | 10570 |
| blockierend bis Antwort vollständig (p50) | 26.6 s | 33.7 s |
| im Hintergrund (p50) | 22.3 s nach jeder Antwort | 18.8 s in 56.1 % der Züge |

Bausteine: Erzähler-Prompt B ≈ 8547 Token (davon WORLD-DELTAS-Anweisung ≈ 1561), Erzähler-Output B ≈ 541 (Block ≈ 114), Extraktion ≈ 2498, Recovery ≈ 2642 Token.

## Abweichungen je Zug (29, höchstens 50)

- A · v8_03: verboten gemeldet: offer
- A · v9_01: fehlt: time
- A · v9_03: verboten gemeldet: object.new
- A · v9_05: fehlt: arrive "/granary|millwright/i"
- A · v10_03: verboten gemeldet: object.new
- A · v11_02: verboten gemeldet: offer
- A · v11_05: verboten gemeldet: quest.offer
- A · v11_11: fehlt: object.mark · verboten gemeldet: coin.gift
- A · v12_04: fehlt: person.new /ossler/i
- A · v12_07: verboten gemeldet: quest.progress
- A · v12_08: fehlt: overreach
- B · v8_01: expected falsch: 1 · fehlt: arrive "loc.tidecross.guild_hall"
- B · v9_01: expected falsch: 1 · fehlt: arrive "loc.alderwatch.guild_hall"
- B · v9_02: verboten gemeldet: offer
- B · v9_03: verboten gemeldet: object.new
- B · v9_04: fehlt: listing.gone
- B · v10_01: expected falsch: 1 · fehlt: arrive "loc.redmarch.guild_hall"
- B · v10_02: verboten gemeldet: offer
- B · v10_03: verboten gemeldet: object.new
- B · v11_01: expected falsch: 1 · fehlt: arrive "loc.alderwatch.guild_hall", person.new /clerk/i
- B · v11_02: verboten gemeldet: offer
- B · v11_03: verboten gemeldet: object.new
- B · v11_11: expected falsch: 3 · fehlt: object.mark, arrive "loc.alderwatch.guild_hall" · verboten gemeldet: quest.close
- B · v12_01: expected falsch: 1 · fehlt: arrive "loc.redmarch.guild_hall"
- B · v12_02: verboten gemeldet: offer
- B · v12_03: fehlt: listing.gone, person.new /adventurer|mud/i · verboten gemeldet: object.new
- B · v12_04: fehlt: person.new /ossler/i, quest.detail
- B · v12_07: expected falsch: 2 · fehlt: arrive "loc.redmarch.guild_hall" · verboten gemeldet: quest.progress
- B · v12_08: fehlt: overreach

## B: Blöcke, die eine Recovery brauchten

- v8_01: invalid ($.deltas[3]: matches none of anyOf; $.deltas[4]: matches none of anyOf)
- v8_02: missing (no <avereth> block)
- v8_05: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v9_01: invalid ($.deltas[3]: matches none of anyOf)
- v9_05: invalid ($.deltas[3]: matches none of anyOf; $.deltas[4]: matches none of anyOf)
- v9_06: missing (no <avereth> block) · fehlende expected: 1
- v9_07: invalid ($.expected.1.at: matches none of anyOf)
- v10_01: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v10_07: invalid (block is not JSON: report is not valid JSON) · fehlende expected: 1
- v10_08: missing (no <avereth> block) · fehlende expected: 1
- v11_01: invalid ($.expected.1.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_02: invalid ($.deltas[2]: matches none of anyOf)
- v11_04: missing (no <avereth> block)
- v11_05: missing (no <avereth> block) · fehlende expected: 2
- v11_06: invalid (block is not JSON: report is not valid JSON) · fehlende expected: 1
- v11_09: invalid ($.expected.2.at: matches none of anyOf; $.deltas[1]: matches none of anyOf)
- v11_10: missing (no <avereth> block)
- v11_11: invalid ($.expected.2.at: matches none of anyOf; $.expected.3.at: matches none of anyOf)
- v12_02: missing (no <avereth> block)
- v12_03: missing (no <avereth> block)
- v12_04: invalid ($.deltas[2]: matches none of anyOf)
- v12_05: invalid ($.deltas[4]: matches none of anyOf)
- v12_06: invalid ($.deltas[1]: matches none of anyOf; $.deltas[2]: matches none of anyOf)

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
