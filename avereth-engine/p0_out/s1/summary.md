# P0 / S1 Interpreter: Ergebnis

- Datum: 2026-09-27T19:49:23.762Z · Dauer 1373 s · Werkzeug s1_interpreter v1 · Vokabular cmd-0.1-draft · Korpus 256 Fälle
- Backend: SillyTavern · Modell: zai-org/GLM-5.3-Flash
- Modus: plain · Reasoning: wie konfiguriert (Kommandozeile) · temperature 0.1 · Beispiele im Prompt: ja
- Aufrufe: 260 (davon 4 Reparatur) · Prompt ≈ 1608 Token (Schätzung, System + Katalog + Nachricht)

## Schwellen (Go/No-Go P0, Plan §16)

| Kennzahl | Wert | Schwelle | erfüllt |
|---|---|---|---|
| Präzision auf Negativfällen (keine falsche Agency) | 93.1 % (81/87) | ≥ 98 % | NEIN |
| Recall (Typ und Argumente) | 94.2 % von 208 Befehlen | ≥ 90 % | ja |
| p50 Latenz | 3.7 s | ≤ 6 s | ja |

## Weitere Kennzahlen

| Kennzahl | Wert |
|---|---|
| Recall nur Befehlstyp | 95.7 % |
| Präzision aller Befehle | 92.5 % |
| falsche Befehle gesamt / davon Festlegungen (pay, buy, accept …) | 13 / 11 |
| Fälle exakt richtig | 90.2 % |
| Reihenfolge bei Mehrfachhandlungen | 100 % von 31 |
| Referenzen richtig aufgelöst | 99.3 % von 151 |
| gültig im 1. Versuch / nach Reparatur | 98.4 % / 100 % |
| Fehler (keine Antwort) | 0 |
| Latenz p50 / p90 / Mittel | 3.7 / 11.8 / 5.2 s |
| Token je Aufruf (Prompt / Output / Reasoning) | 1731 / 47 / – |

## Fehler pro Befehlstyp

| Typ | Gold | richtig | falsches Argument | fehlt | falsch erzeugt |
|---|---|---|---|---|---|
| go | 53 | 51 | 1 | 1 | 1 |
| quest.accept | 24 | 24 | 0 | 0 | 1 |
| activity | 20 | 19 | 1 | 0 | 0 |
| quest.turn_in | 15 | 15 | 0 | 0 | 3 |
| take | 12 | 11 | 0 | 1 | 1 |
| guild.register | 12 | 12 | 0 | 0 | 4 |
| board.read | 12 | 6 | 0 | 6 | 0 |
| offer.accept\|pay | 11 | 11 | 0 | 0 | 0 |
| buy | 6 | 6 | 0 | 0 | 0 |
| give | 5 | 5 | 0 | 0 | 1 |
| drop | 4 | 4 | 0 | 0 | 2 |
| offer.accept\|buy | 4 | 4 | 0 | 0 | 0 |
| pay\|offer.accept | 3 | 3 | 0 | 0 | 0 |
| offer.decline | 3 | 2 | 0 | 1 | 0 |
| sell | 3 | 3 | 0 | 0 | 0 |
| quest.abandon | 3 | 3 | 0 | 0 | 0 |
| pay\|give | 2 | 2 | 0 | 0 | 0 |
| offer.accept | 2 | 2 | 0 | 0 | 0 |
| use | 2 | 2 | 0 | 0 | 0 |
| guild.promote | 2 | 2 | 0 | 0 | 0 |
| equip | 2 | 2 | 0 | 0 | 0 |
| unequip | 2 | 2 | 0 | 0 | 0 |
| give\|drop | 1 | 1 | 0 | 0 | 0 |
| activity\|go | 1 | 0 | 1 | 0 | 0 |
| offer.accept\|pay\|buy | 1 | 1 | 0 | 0 | 0 |
| pay\|buy | 1 | 1 | 0 | 0 | 0 |
| offer.accept\|buy\|pay | 1 | 1 | 0 | 0 | 0 |
| pay | 1 | 1 | 0 | 0 | 0 |

## Negativfälle nach Art

| Art | Fälle | ohne falschen Befehl |
|---|---|---|
| question | 19 | 18 |
| thought | 9 | 9 |
| hypothetical | 6 | 6 |
| plan | 9 | 8 |
| memory | 7 | 5 |
| negation | 12 | 11 |
| npc_action | 8 | 7 |
| quoted_speech | 3 | 3 |
| speech | 8 | 7 |
| neutral | 13 | 13 |

## Echte vs. synthetische Nachrichten

| Quelle | Fälle | exakt richtig | Negativ-Präzision |
|---|---|---|---|
| real | 88 | 84.1 % | 94.1 % |
| synthetic | 168 | 93.5 % | 92.9 % |

## Abweichungen (25, höchstens 60)

- **real_v4_03** (gate) „*i nod and walk inside looking for the adventurer Hall*“ · falsches to: go {to=["loc.redmarch.guild_hall","loc.redmarch"]} → go {to={"new":"the Adventurers' Guild hall"}}
- **real_v5_01** (gate) „Hello im Alaric and im newly awakend. The sword was a gift and im here to register with the adventurer guild *…“ · falsch (Festlegung): guild.register
- **real_v5_04** (hall_fee) „*i give her one Silver and say* the registration for now *i then make my way over to the F-Rank Quest Board*“ · fehlt: board.read
- **real_v6_01** (gate) „*i pay one copper as i wait for my change and say* My name is Alaric Red and im here to register with the adve…“ · falsch (Festlegung): guild.register
- **real_v6_05** (hall_board) „*i shake my head and walk to the Quest board to look at the F-Rank Quests*“ · fehlt: board.read
- **real_v7_07** (hall_board) „*i shake my head and walk to the Novice board and look at the quests on it*“ · fehlt: board.read
- **real_v8_06** (tavern_client) „*i nod and get my sword ready. I then walk down the stairs*“ · fehlt: go {to=["loc.redmarch.woolsack.cellar",{"new":"/cellar|down|stair/i"}]}
- **real_v9_05** (hall_fee) „Alaric Red 18 Warrior no other Guild memberships elsewhere Valedorn yes first armed work *i say calmly and pus…“ · falsch (Festlegung): guild.register
- **real_v9_06** (hall_board) „*i walk over to the Novice Rank Quest Board and look at the Quests there*“ · fehlt: board.read
- **real_v11_04** (hall_fee) „Alaric Red 18 i can read and write *i say and pay the 2 silver and then put my finger on the iron pin and let …“ · falsch: take {object=obj.registration_form, qty=1}
- **real_v11_08** (forest) „yes *i say and start following the trail i found before turning and saying* go back it will be dangerous i got…“ · falsches kind: activity {kind=search} | go → activity {kind=errand, what=tracking the wolves}
- **real_v11_13** (village_reeve) „Proof *i say dryly and put them on the floor* ill need a signature so i can get my silver at the guild“ · falsch (Festlegung): quest.turn_in {quest=quest.wolf_problem}
- **real_v12_09** (hall_fee) „*i not and pay the 2 Silver. I then put my hand on the Stone and let it mess my Rank. After all is done i go a…“ · falsch (Festlegung): guild.register
- **real_v12_11** (hall_board) „*i take the Millers Run Escort Quest and go to the front desk and register it*“ · falsch (Festlegung): quest.turn_in {quest=quest.millers_run_escort}
- **neg_accept_01** (hall_board) „Could I take the escort job too?“ · falsch (Festlegung): quest.accept {quest=quest.millers_run_escort}
- **syn_turnin_07** (reedbeds_pile) „*i carry the mint back and hand it in at the guild*“ · fehlt: take {object=obj.marshmint_pile}
- **neg_turnin_05** (hall_turnin_ready) „*the clerk takes the basket from me and marks the herb run complete*“ · falsch (Festlegung): quest.turn_in {quest=quest.herb_run_marshmint}
- **syn_go_06** (camp) „*i pack up camp and travel back to Redmarch*“ · falsch (Festlegung): drop {object={"new":"camp"}}
- **neg_go_05** (street) „I came here from the reedbeds this afternoon.“ · falsch: go {to={"new":"Grainmarket Row"}}
- **syn_decline_02** (market) „Not interested, thanks.“ · fehlt: offer.decline {offer=offer.stall}
- **neg_give_03** (village_reeve) „I gave you the heads an hour ago.“ · falsch (Festlegung): give {object=obj.wolf_heads, qty=3, to=npc.reeve_aldous}
- **neg_take_02** (cellar_after) „*i leave the dead rats where they are*“ · falsch (Festlegung): drop {object=obj.rat_corpses, qty=5}
- **syn_board_01** (hall_board) „*i check the board*“ · fehlt: board.read
- **syn_board_03** (hall_board) „*i read through the notices on the far wall*“ · fehlt: board.read
- **syn_act_11** (camp) „*i keep watch for two hours and then sleep*“ · falsches kind: activity {kind=wait, minutes=120} → activity {kind=rest, what=keeping watch, minutes=120}

_Diese Datei enthält keine API-Keys, keine Header und keine Endpoint-URL._
