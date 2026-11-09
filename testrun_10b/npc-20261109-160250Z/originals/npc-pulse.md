# NPC/PULSE-Auswertung – 20261109-160250Z-npc_pulse_test

> Automatisch aus den gespeicherten Chatrecords, Events und Requests, ohne Modellaufruf. Regelverletzungen nur, wo die Records sie sicher tragen; semantische Zweifelsfälle stehen mit Originalstelle unter „Zum Review“. Nicht erreichte Testziele sind **fehlende Abdeckung**, weder bestanden noch fehlgeschlagen.

## Abdeckung

| Testziel | Bedeutung | Anzahl | Status |
|---|---|---:|---|
| npc_first_meetings | people met for the first time | 14 | beobachtet |
| npc_returns | a known person present again in a later presence (E2-A) | 3 | beobachtet |
| npc_return_met | a return the extractor reported as met and the engine took | 1 | beobachtet |
| npc_met_refused | a reported presence the engine refused (met_*) | 5 | beobachtet |
| arrival_cards | turns with an arrival card NOT YET SHOWN (E2-B R6) | 6 | beobachtet |
| desk_handler | a Guild desk handler who learned his acceptance or turn-in (E2-A) | 0 | **nicht abgedeckt** |
| multi_npc_scenes | replies with two or more people present | 17 | beobachtet |
| shared_travel | people who travelled along with him | 3 | beobachtet |
| agreement_personal | agreements with Alaric as a party (E2-B R7) | 5 | beobachtet |
| agreement_taken_up | an agreement updated or settled in a later turn | 4 | beobachtet |
| agreement_settled | an agreement of his settled | 2 | beobachtet |
| agreement_npc_only | agreements between other people only | 0 | **nicht abgedeckt** |
| agreement_unbound | promise/debt threads stored without parties | 0 | **nicht abgedeckt** |
| agreement_on_card | an open agreement shown whole on a later narrator card (partial: only cut by the card cap) | 1 (+2 nur gekürzt) | beobachtet |
| anchor_stored | a personality anchor stored (E3 R10) | 0 | **nicht abgedeckt** |
| anchor_changed | an anchor changed in a later presence | 0 | **nicht abgedeckt** |
| anchor_refused_first_contact | a trait refused at a first contact | 0 | **nicht abgedeckt** |
| anchor_refused_mood | a mood refused as a trait | 0 | **nicht abgedeckt** |
| anchor_on_card | a stored anchor shown whole on a later narrator card (partial: only cut by the card cap) | 0 | **nicht abgedeckt** |
| pulse_travel | PULSE draws on the road | 9 | beobachtet |
| pulse_pause | PULSE draws while resting or waiting | 1 | beobachtet |
| pulse_scene | PULSE draws in a town or the wild | 34 | beobachtet |
| pulse_dungeon | PULSE draws in a dungeon | 0 | **nicht abgedeckt** |
| pulse_open | open PULSE windows | 8 | beobachtet |
| pulse_interrupt | a rest cut short by PULSE | 0 | **nicht abgedeckt** |
| pulse_wanderer | a dungeon wanderer bound by PULSE | 0 | **nicht abgedeckt** |
| pulse_threat_refused | a new threat the engine refused (pulse/road/envelope/dungeon rules) | 11 | beobachtet |
| quest_completed | Guild contracts completed | 1 | beobachtet |

## Regelverletzungen (automatisch, belastbar)

Keine gefunden.

## NPC

Personen: 14 · Wiederbegegnungen: 3 · gemeinsame Reisen: 3 · Antworten mit ≥ 2 Personen: 17 (höchstens 3) · Ankunftskarten: 6 · Gildenbearbeiter: 0/3

| Person | erster Zug | Spannen | Rückkehr | Anker |
|---|---:|---:|---:|---:|
| clerk (npc.npcashbridge_clerk) | 3 | 4 | 3 | 0 |
| farmer (npc.npcfarmer) | 10 | 1 | 0 | 0 |
| Widow Hessa (npc.widow_hessa) | 11 | 1 | 0 | 0 |
| carter (npc.npccarter_hazel) | 15 | 4 | 0 | 0 |
| merchant (npc.npcmoneychanger) | 28 | 1 | 0 | 0 |
| villager (npc.npctannery_row_woman) | 36 | 1 | 0 | 0 |
| Tam (npc.tam) | 36 | 1 | 0 | 0 |
| Harl (npc.harl) | 37 | 1 | 0 | 0 |
| shopkeeper (npc.npcshopkeeper_primer) | 41 | 1 | 0 | 0 |
| Muller (npc.muller) | 45 | 1 | 0 | 0 |
| serving woman (npc.npcwoolpack_serving_woman) | 45 | 1 | 0 | 0 |
| carter (npc.npccarter_woolpack) | 49 | 1 | 0 | 0 |
| carter (npc.carter) | 60 | 0 | 0 | 0 |
| miller's boy (npc.npcmiller_boy) | 62 | 1 | 0 | 0 |

**Wiederbegegnungen**

- Zug 26: clerk — Eintritt ohne `met` — „The clerk looked up from her ledger as Alaric came back. "Which one?" She listened, nodded once, and pulled a fresh slip across the desk. Quill scratching, she filled in the lines — *Clear Mossback Warrens, Level 1, one hundred eighty coppe…“
- Zug 33: clerk — Eintritt ohne `met` — „The market gave him up slowly — a cart of wet wool, two women arguing over the price of eels, a boy running between legs with a tray of meat pies — and then the crowd thinned and the Guild hall's door stood open ahead, letting out the smell…“
- Zug 43: clerk — per `met` belegt — „The wrapped Primer went into the pouch beside its twin, and the walk back took him up through the market streets as the light began to lean. A fishmonger was hosing down her slabs, water running the gutter; a lamplighter made his early roun…“

**Absprachen**

| Thread | Art | Parteien | eröffnet | Verlauf | später aufgegriffen | auf späterer Karte |
|---|---|---|---:|---|---|---|
| Widow Hessa at the mill sent for the Guild about the gnasher; she is half blind and easily | promise | npc.widow_hessa, pc | 11 | 11:open → 17:open | ja | nein |
| Wat Dodd offers Alaric a free ride to Ashbridge in his cart, going that way as far as the  | promise | npc.npccarter_hazel, pc | 16 | 16:open → 21:open → 23:resolved | ja | voll (Zug 17) |
| Muller said he'd put copper in for whoever cleared the millpond gnasher, but hearing the b | debt | npc.muller, pc | 36 | 36:open → 44:open → 58:open | ja | nein |
| The carter offers Alaric a free seat on the peat wagon as far as the crossroads, leaving a | promise | npc.npccarter_woolpack, pc, npc.carter | 50 | 50:open → 61:resolved | ja | gekürzt (Zug 51) |
| Muller promises to say a word for Alaric to Hesse's man if it comes to that — a man who cl | promise | npc.muller, pc | 60 | 60:open | nein | gekürzt (Zug 61) |

**Abgelehnte NPC-Meldungen** (Regel: Anzahl)

anchor_absent: 1 · desk_handler: 3 · ambient: 1 · met_not_known_here: 1 · met_without_arrival: 2 · met_evidence: 2 · npc_presence: 2 · npc_continuity: 3

## PULSE

Entscheidungen: 44 · offen: 8 · offene je 10 Eingaben: 1.1 · je 8 Spielstunden: 1.8 · Pausen-Folgezüge: 0 · Rast-Unterbrechungen (Korrektur): 0 · gleiche Art kurz hintereinander: 0

| Exposition/Rahmen | Würfe | offen | Arten | erzählt (likely/none) | Weltfolgen |
|---|---:|---:|---|---|---|
| scene/inside | 26 | 3 | life 2, meeting 1 | 2/1 | persons 4, objects 1, places 9 |
| travel/travel | 9 | 4 | obstacle 1, meeting 2, danger 1 | 4/0 | persons 7, creatures 4, features 1, places 3 |
| scene/wild | 7 | 1 | meeting 1 | 1/0 | persons 2, objects 2, places 3 |
| scene/street | 1 | 0 | – | 0/0 | – |
| pause/inside | 1 | 0 | – | 0/0 | persons 1, places 1 |

**Abgelehnte neue Bedrohungen** (Regel: Anzahl)

attack_commitment: 3 · road: 2 · pulse: 6

## Integration

Extraktion: none 1, applied 63 · Foldfehler: 0 · Verträge aktiv/abgeschlossen: 1/1

Abgelehnte Deltas je Regel: engine_owned_fact 6, world_rule 6, offer 6, pulse 6, desk_handler 3, attack_commitment 3, npc_continuity 3, guild_canon 2, met_without_arrival 2, road 2, met_evidence 2, npc_presence 2, group_unclear 2, ambient 1, met_not_known_here 1

## Zum Review (semantische Zweifelsfälle mit Originalstelle)

**new_world_content_in_closed_window** (8)

- Zug 3 (Nachricht 6): closed window, yet 1 new person(s) (may be his own doing) — „The road carried him in with cart traffic and morning walkers — a farmer with a wagon of cabbages, two women leading goats, a man in a smith's leather apron who nodded without interest. The walls of Ashbridge rose higher as the road bent, g…“
- Zug 10 (Nachricht 20): closed window, yet 1 new person(s) (may be his own doing) — „The twine came loose with a stiff twist, and the gate swung on a hinge that needed oil. He left it as he'd found it, loop re-set, and took the track between the hedgerows. The walk was plain and dry. A crow left the elm as he came under it …“
- Zug 11 (Nachricht 22): closed window, yet 1 new person(s) (may be his own doing) — „"Gnasher." The farmer said the word the way a man repeats something he'd already guessed. He looked past Alaric, down the track toward the water hidden behind the hedge, and his thumb worked along the door edge. "Aye, cross. Keep to the tra…“
- Zug 28 (Nachricht 56): closed window, yet 1 new person(s) (may be his own doing) — „The Guild hall's door swung shut behind him on the noise of the street. Market row ran two streets over, and the way there took him past a cooper's yard where a man was burning the inside of a fresh barrel, the smell of scorched oak driftin…“
- Zug 37 (Nachricht 74): closed window, yet 1 new person(s) (may be his own doing) — „"Only the goose," the woman said, and Tam nodded solemnly as if he'd been the goose's sole mourner. "It got the bird and scared the wits out of the miller's dog, that's all. Nobody bled but you." She lifted the loaves out of the basket, wra…“
- Zug 41 (Nachricht 82): closed window, yet 1 new person(s) (may be his own doing) — „The tannery row gave way to busier streets, and Alaric walked back through the late-afternoon traffic of Ashbridge — a woman hauling a basket of wet washing, two boys chasing a rolling hoop, the clatter of a cooper's mallet somewhere behind…“
- Zug 45 (Nachricht 90): closed window, yet 2 new person(s) (may be his own doing) — „The Woolpack sat where the south gate road bent, a low timbered front with a hanging sign of a wool bale, its windows already glowing. Inside it was warm and loud — smoke, spilled ale, a dozen market-day voices — and a serving woman threade…“
- Zug 60 (Nachricht 120): closed window, yet 1 new person(s) (may be his own doing) — „Muller nodded slowly at the sketch and the tracks advice, and at the promise of the peat wagon he said, "First light, then. I'll say a word for you to Hesse's man if it comes to that — a man who clears goblin ground has friends in this city…“

**open_window_not_narrated** (1)

- Zug 46 (Nachricht 92): an open life window the reply did not visibly use (engine heuristic) — „Muller looked up slow, and it took him a moment to place the words. Then his face folded into a scowl and he set the spoon down in the bowl with a clack. "Took it, did you. Well. Somebody had to." He wiped his mouth with the back of his han…“
