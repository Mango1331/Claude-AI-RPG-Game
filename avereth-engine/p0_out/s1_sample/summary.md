# P0 / S1 Interpreter: Ergebnis

- Datum: 2026-09-27T19:20:48.928Z · Dauer 500 s · Werkzeug s1_interpreter v1 · Vokabular cmd-0.1-draft · Korpus 256 Fälle, davon 80 ausgewählt
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash
- Modus: plain · Reasoning: wie konfiguriert (Kommandozeile) · temperature 0.1 · Beispiele im Prompt: ja
- Aufrufe: 80 (davon 0 Reparatur) · Prompt ≈ 1611 Token (Schätzung, System + Katalog + Nachricht)

## Schwellen (Go/No-Go P0, Plan §16)

| Kennzahl | Wert | Schwelle | erfüllt |
|---|---|---|---|
| Präzision auf Negativfällen (keine falsche Agency) | 90.9 % (30/33) | ≥ 98 % | NEIN |
| Recall (Typ und Argumente) | 95.1 % von 61 Befehlen | ≥ 90 % | ja |
| p50 Latenz | 3.7 s | ≤ 6 s | ja |

## Weitere Kennzahlen

| Kennzahl | Wert |
|---|---|
| Recall nur Befehlstyp | 98.4 % |
| Präzision aller Befehle | 92.1 % |
| falsche Befehle gesamt / davon Festlegungen (pay, buy, accept …) | 3 / 2 |
| Fälle exakt richtig | 92.5 % |
| Reihenfolge bei Mehrfachhandlungen | 100 % von 9 |
| Referenzen richtig aufgelöst | 97.8 % von 45 |
| gültig im 1. Versuch / nach Reparatur | 100 % / 100 % |
| Fehler (keine Antwort) | 0 |
| Latenz p50 / p90 / Mittel | 3.7 / 11.5 / 6.2 s |
| Token je Aufruf (Prompt / Output / Reasoning) | 1705 / 48 / – |

## Fehler pro Befehlstyp

| Typ | Gold | richtig | falsches Argument | fehlt | falsch erzeugt |
|---|---|---|---|---|---|
| go | 9 | 9 | 0 | 0 | 1 |
| quest.turn_in | 6 | 5 | 1 | 0 | 1 |
| activity | 4 | 4 | 0 | 0 | 0 |
| take | 4 | 4 | 0 | 0 | 0 |
| board.read | 4 | 3 | 0 | 1 | 0 |
| quest.accept | 3 | 3 | 0 | 0 | 0 |
| guild.register | 3 | 3 | 0 | 0 | 1 |
| drop | 3 | 3 | 0 | 0 | 0 |
| offer.accept\|pay | 2 | 2 | 0 | 0 | 0 |
| offer.accept | 2 | 2 | 0 | 0 | 0 |
| offer.decline | 2 | 2 | 0 | 0 | 0 |
| buy | 2 | 2 | 0 | 0 | 0 |
| sell | 2 | 2 | 0 | 0 | 0 |
| give | 2 | 2 | 0 | 0 | 0 |
| use | 2 | 2 | 0 | 0 | 0 |
| guild.promote | 2 | 2 | 0 | 0 | 0 |
| equip | 2 | 2 | 0 | 0 | 0 |
| unequip | 2 | 2 | 0 | 0 | 0 |
| quest.abandon | 2 | 2 | 0 | 0 | 0 |
| pay\|give | 1 | 1 | 0 | 0 | 0 |
| give\|drop | 1 | 1 | 0 | 0 | 0 |
| activity\|go | 1 | 0 | 1 | 0 | 0 |

## Negativfälle nach Art

| Art | Fälle | ohne falschen Befehl |
|---|---|---|
| question | 4 | 4 |
| thought | 3 | 3 |
| hypothetical | 4 | 4 |
| plan | 4 | 3 |
| memory | 3 | 2 |
| negation | 3 | 3 |
| npc_action | 4 | 3 |
| quoted_speech | 3 | 3 |
| speech | 5 | 4 |
| neutral | 3 | 3 |

## Echte vs. synthetische Nachrichten

| Quelle | Fälle | exakt richtig | Negativ-Präzision |
|---|---|---|---|
| real | 33 | 87.9 % | 88.9 % |
| synthetic | 47 | 95.7 % | 91.7 % |

## Abweichungen (6, höchstens 60)

- **real_v4_06** (hall_board) „*i nod and walk to the F-Rank quest board*“ · fehlt: board.read
- **real_v5_01** (gate) „Hello im Alaric and im newly awakend. The sword was a gift and im here to register with the adventurer guild *…“ · falsch (Festlegung): guild.register
- **real_v11_08** (forest) „yes *i say and start following the trail i found before turning and saying* go back it will be dangerous i got…“ · falsches kind: activity {kind=search} | go → activity {kind=errand, what=tracking the wolves}
- **real_v12_19** (hall_turnin_done) „*i turn the Quest in at the front desk and then i go walk around the City looking for an Inn to sleep and wash…“ · falsches quest: quest.turn_in {quest=["quest.herb_run_marshmint",null]} → quest.turn_in {quest=quest.millers_run_escort}
- **neg_turnin_05** (hall_turnin_ready) „*the clerk takes the basket from me and marks the herb run complete*“ · falsch (Festlegung): quest.turn_in {quest=quest.herb_run_marshmint}
- **neg_go_05** (street) „I came here from the reedbeds this afternoon.“ · falsch: go {to=loc.redmarch.grainmarket_row}

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
