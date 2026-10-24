# Avereth Live-Test 20261024-030002Z-current_test

## Kurzfassung

- **Ergebnis:** Niederlage — turn 26: he died
- **Etappen:** 1/2 Pflicht erreicht
- **Offen:** open_run_duration (nicht erreicht)
- **Charakter:** mage (mage.arcane_bolt, mage.arcane_ward) · Regelstand 2 (Warrior, Mage, Rogue)
- **Ziel-Dungeon:** Old Crown Catacombs, Ebene 1 (Vertrag quest.clear_the_old_crown_catacombs_level_1)
- **Leitfaden:** current_test („Open-world long playtest — a real adventurer's life“)
- **Spieler:** LLM zai-org/GLM-5.3-Flash (127.0.0.1:5050, Temperatur 0.8), Stil: independent cautious adventurer: explore, talk to people, assess risks, spend rewards on practical needs
- **Züge:** 26 · **Dauer:** 21:01 min · **LLM-Aufrufe der Engine/des Erzählers:** 77
- **Auffälligkeiten:** 8 · **Niederlage** in Zug 26: he died
- **Profil unverändert:** ja · **Geheimnis-Scan:** sauber

## Aufbau

| | |
|---|---|
| Build (Erweiterung) | 4.3.0-c.6.6.57 |
| Git | 3181c8112ec6 (claude/c-planner-prototype-2026-10-02-gpt-c666) — sauber |
| SillyTavern | 1.19.0 (C:\Users\REDACTED_USER\Silly\SillyTavern-Launcher\SillyTavern), isolierte Instanz auf Port 8123, Start 14.8 s |
| Browser | chrome 155.0.8059.85 |
| Verbindung deines SillyTavern | Quelle "custom" → custom_url http://127.0.0.1:5050/v1 · Modell zai-org/GLM-5.3-Flash · Schlüssel: secrets.json api_key_custom |
| Verbindung des Laufs | Quelle "custom" → custom_url http://127.0.0.1:5050/v1 · Modell zai-org/GLM-5.3-Flash · Schlüssel: AVERETH_LIVE_API_KEY — dieselbe |
| Preflight (GET /models) | http://127.0.0.1:5050/v1/models: 6 Modell(e) (Qwen/Qwen3.8-27B, zai-org/GLM-5.3-Flash, zai-org/GLM-5.3, deepseek-ai/DeepSeek-V4.1-Flash, deepseek-ai/DeepSeek-V4-Pro, moonshotai/Kimi-K2.6), Modell enthalten |
| Preset | Avereth Narrator V4 (aus dem Profil), weicht vom Build-Preset ab in: openai_max_tokens, show_thoughts |
| Generierung | Temperatur 0.9, max. Tokens 8192, Kontext 131072, Reasoning low |
| Streaming | aus |
| Spieler-Reasoning (wirksam) | `reasoning_effort`="low", `clear_thinking`=true — as the game's own requests carry them (custom_include_body and the preset's reasoning_effort), same endpoint and model · Probe: angenommen (finish stop, Reasoning 0 Zeichen) · max. 3000 Tokens |
| Karte | Avereth Engine Test v4: Begrüßung aus dem Profil, Beschreibung = Erzählervertrag dieses Builds (im Profil: 4.3.0-c.6.6.49) |
| Lorebook | Avereth World Lore v0.14 aus diesem Build |
| Engine-Einstellungen | {"enabled":true,"budget":1400,"rulesBudget":800,"recentTurns":4,"depth":0,"showDebug":true,"loreSource":"auto","wordSwaps":"ledger=register","hud":"closed","historyTurns":4,"stripTrackers":true,"recoverReports":true,"runtime":"v4","planner":true,"settingsRev":2,"legacyPlanner":true} |
| Kampagne | Chat „Avereth Live 20261024-030002Z-current_test“, Seed 9417316 |

## Etappen

| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |
|---|---|---|---:|---:|---:|
| creation_complete | ja | ✔ | 2 | 3 | 8 |
| open_run_duration | ja | – |  |  |  |

## Spielereingaben

| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |
|---:|---|---|---|---|---|---|---:|
| 1 | I choose Mage. | Engine (Menü/Rückfrage) | creation_complete | Pick Mage as base class. | public roadside verge outside Alderwatch | 80/60 | 2.2 s |
| 2 | I pick Arcane Bolt and Arcane Ward. | Engine (Menü/Rückfrage) | creation_complete | Choose Arcane Bolt and Arcane Ward as my two starter skills to finish character creation. | public roadside verge outside Alderwatch | 80/72 | 2.1 s |
| 3 | I walk along the road toward the city gate of Alderwatch. | Erzähler | open_run_duration | Enter Alderwatch and start exploring the city. | Alderwatch | 80/72 | 29.4 s |
| 4 | "Coming in," I say, and walk through the gate into the city. | Erzähler | open_run_duration | Enter Alderwatch and start exploring the city. | Alderwatch | 80/72 | 18.1 s |
| 5 | I head uphill to the Guild hall and look for a reception desk or notice board. | Erzähler | open_run_duration | Visit the Adventurers' Guild to check registration and available quests. | Adventurers' Guild hall, Alderwatch | 80/72 | 26.9 s |
| 6 | I go to the middle window. "Good morning. I'd like to register with the Guild, and hear what work is available for a new mage." | Erzähler | open_run_duration | Ask the clerk about Guild registration and available quests for a novice. | Adventurers' Guild hall, Alderwatch | 80/72 | 48.7 s |
| 7 | "I'm paying," I say, and count out two silver. | Erzähler | open_run_duration | Pay the two silver registration fee and sign the Guild roll. | Adventurers' Guild hall, Alderwatch | 80/72 | 20.7 s |
| 8 | I go through the ajar door to the members' board and look over the catacomb culling postings. | Erzähler | open_run_duration | Read the members-only quest board and find a catacomb culling job suitable for a Novice ma… | Members' board room | 80/72 | 30.9 s |
| 9 | I take the tallow delivery slip and the catacomb clearing slip, and bring both back to the clerk. "I'd like to take these two — they're both… | Erzähler | open_run_duration | Accept the tallow delivery and catacomb clearing contracts together. | Members' board room | 80/72 | 19.3 s |
| 10 | "Off to Bram's," I say, and head out to find the chandlery on Low Street. | Erzähler | open_run_duration | Leave the Guild and go to Bram's chandlery on Low Street to pick up the tallow crates. | Bram's chandlery | 80/72 | 34.0 s |
| 11 | "I'll take the handcart," I say, and hand over the two copper deposit. | Erzähler | open_run_duration | Rent Bram's handcart for 2 copper and load the six tallow crates. | Bram's chandlery | 80/72 | 40.1 s |
| 12 | I take the cart's shafts and start hauling west toward the gate, watching for the low, wet stretch Bram warned about. | Erzähler | open_run_duration | Haul the tallow crates out the west gate toward the ruined chapel. | Ruined chapel yard | 80/72 | 92.8 s |
| 13 | I wheel the cart around to the back of the hut, following the sound of the axe. "Keeper Odo? Tallow delivery from Bram's." | Erzähler | open_run_duration | Find Keeper Odo behind the hut and hand over the tallow delivery. | Chapel keeper's hut | 80/72 | 31.7 s |
| 14 | "No message from Bram. Delivery's done — who do I tell it's complete, or will the Guild clerk hear it from you?" | Erzähler | open_run_duration | Complete the tallow delivery quest and ask Odo about turning it in. | Chapel keeper's hut | 80/72 | 29.0 s |
| 15 | I stack the crates back onto the handcart. "I'll carry them down for you — second door on the left, you said? Show me the way." | Erzähler | open_run_duration | Help Odo store the tallow in the under-chapel store, getting a look at the stair and possi… | Tallow store | 80/72 | 75.6 s |
| 16 | I haul the crates down three at a time and stack them on the shelves, corners inward, as Odo directs. | Erzähler | open_run_duration | Store the six tallow crates in the under-chapel store, finishing the delivery. | Tallow store | 80/72 | 65.2 s |
| 17 | I accept the water and bread, and ask Odo how the delivery slip gets marked done — mine still shows the contract active, so do I turn it in … | Erzähler | open_run_duration | Eat, drink, and settle how the tallow quest is formally completed. | Tallow store | 80/72 | 76.3 s |
| 18 | I thank Odo for the bread and head back along the road toward Alderwatch to turn in the delivery slip with the Guild clerk, glancing back to… | Erzähler | open_run_duration | Turn in the tallow delivery at the Alderwatch Guild clerk and earn the 40 cp reward. | Adventurers' Guild hall, Alderwatch | 80/72 | 21.9 s |
| 19 | I scan the new slips on the board for a Novice-level job suited to a lone mage. | Erzähler | open_run_duration | Read the Guild board and pick a suitable novice contract. | Adventurers' Guild hall, Alderwatch | 80/72 | 19.3 s |
| 20 | I take the escort slip to the counter. "The cart escort to Reedford — mark that one taken for me. Where's the dyers' yard by the east gate, … | Erzähler | open_run_duration | Sign up for the Reedford cart escort, the best-paying Novice job, and confirm the muster d… | Adventurers' Guild hall, Alderwatch | 80/72 | 24.8 s |
| 21 | I leave the Guild and find the dyers' yard by the east gate to introduce myself to Mistress Odell before tomorrow's muster, then look for a … | Erzähler | open_run_duration | Confirm the escort muster with Mistress Odell and secure lodging for the night. | Leaning Bell inn | 80/72 | 55.2 s |
| 22 | I take the boot of small beer by the fire and ask the carters whether any of them have run the Reedford road lately, and what the waylayers … | Erzähler | open_run_duration | Gather rumors about the Reedford ford waylayers before resting for the early muster. | Leaning Bell inn | 80/72 | 24.4 s |
| 23 | I finish the beer and turn in for the night, sleeping until first light so I'm at the dyers' yard shed in time for the muster with Tam. | Erzähler | open_run_duration | Rest overnight and be ready for the first-light escort muster. | Leaning Bell inn | 80/72 | 69.6 s |
| 24 | I take the roll and sausage, hand over the copper, and head to the dyers' yard shed for the first-light muster with Tam. | Erzähler | open_run_duration | Buy road food and report to the escort muster. | Dyers' yard | 80/72 | 22.3 s |
| 25 | I climb onto the bench, left side, with my staff across my knees. "Understood — get down, hold, and quiet on the road. Ready when you are, T… | Erzähler | open_run_duration | Board the cart and start the escort to Reedford with Tam. | Valedorn Crown | 54/72 | 120.3 s |
| 26 | I cast Arcane Bolt at Bandit B. | Erzähler | open_run_duration | Strike the closest attacker who lunged at the cart. | Valedorn Crown | 0/62 | 48.0 s |

**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):

- zum Start (notiert vor Zug 1): Character creation step 1/2 shown; choosing Mage to get +1 INT/WIL.
- zu Zug 2 (notiert vor Zug 3): Character creation completed cleanly; HUD matches chosen skills and gear, 5 silver on hand.
- zu Zug 3 (notiert vor Zug 4): Gate entry is casual, no toll for a pedestrian; guard engaged briefly.
- zu Zug 5 (notiert vor Zug 6): No notice board exists in the hall; quest business seems to run through the counter clerks. PER search check failed but the clerk is directly available.
- zu Zug 6 (notiert vor Zug 7): Registration costs 2 silver (leaving 3); Power Rank F matches the HUD. Clerk pointed to a members-only quest board in the back room and mentioned a skeleton-clearing job at the temple wardens' catacombs.
- zu Zug 7 (notiert vor Zug 8): Registration confirmed: Guild plate added to inventory, coin correctly dropped from 50 to 30 copper (2 silver). Power Rank F on the stone matches the HUD. No inconsistencies so far.
- zu Zug 8 (notiert vor Zug 9): Quest board is consistent between panel and prose; pencil note suggests catacombs refill slowly, useful intel for timing the cull.
- zu Zug 10 (notiert vor Zug 11): HUD coin shows 3 Silver; paying the 2 cp deposit should correctly drop it to 28 copper equivalent — worth watching.
- zu Zug 11 (notiert vor Zug 12): Purchase panel confirmed the 2 cp deposit correctly; HUD now shows 2 Silver 8 Copper and crates in inventory, all consistent.
- zu Zug 13 (notiert vor Zug 14): Delivery prose, crate count, and quest list all consistent; Odo hinted the catacomb stair is 'wardens' business,' worth probing later.
- zu Zug 14 (notiert vor Zug 15): Quest completion is handled informally via wardens' tally rather than a turn-in — watch whether the delivery quest can actually be marked complete. Odo now wants the crates moved into the under-chapel store, right by the wardens' stair.
- zu Zug 15 (notiert vor Zug 16): Delivery quest still shows active in HUD despite Odo counting the crates complete; the tick in the dark beyond the iron-strapped door hints the catacomb entrance is right here.
- zu Zug 16 (notiert vor Zug 17): Quest panel now says 'READY FOR TURN-IN' but the HUD quest list still shows it active; checking how turn-in works. The knocking beyond the iron-strapped door recurred on the second trip.
- zu Zug 17 (notiert vor Zug 18): Quest panel says READY FOR TURN-IN while the HUD quest list still shows the delivery as merely active — turn-in consistency still unverified until I reach the clerk. Guard B went very still staring down the stair after the knocking below.
- zu Zug 18 (notiert vor Zug 19): Turn-in resolved cleanly: 40 cp paid, quest marked completed, slip filed — the earlier READY-FOR-TURN-IN vs active-list mismatch was only a display lag. I still carry the Old Crown Catacombs contract; Odo's iron-door knocking and Guard B's downward gesture hint it connects to the chapel stair.
- zu Zug 19 (notiert vor Zug 20): Turn-in and payout last turn resolved cleanly (40 cp + 23 XP, slip filed), closing the earlier display-lag question. Three Novice contracts are on offer; the escort (90 cp) leaves at first light and Reedford is also where the eel snapper job (70 cp) sits, so both may chain naturally.
- zu Zug 21 (notiert vor Zug 22): Odell accepted the Novice mage guard and gave muster details; cheap lodging secured (3 cp), money and HUD consistent.
- zu Zug 22 (notiert vor Zug 23): HUD now tracks the waylayer rumor as a named threat lead under the escort quest — engine links gathered intel to quests cleanly. No inconsistencies; money already reflects the 3 cp room.
- zu Zug 23 (notiert vor Zug 24): Purchase and recovery panels clean; an extractor JSON failure was flagged last turn but nothing seemed lost. HUD coin says 6 Silver 5 Copper while narrative panels counted 65 copper — same amount, mixed notation.
- zu Zug 24 (notiert vor Zug 25): Coin and quest tracking consistent; escort and catacombs contracts both active with clear rewards.
- zu Zug 25 (notiert vor Zug 26): Ambush at the ford opened with a heavy 26-damage Long Lunge from Bandit B (HP 54/80); all five bandits engaged at once despite the narrative still describing the parley — combat state and story are slightly out of step.

## Kämpfe

| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |
|---|---:|---:|---|---|---:|---|
| enc.t25r | 25 | 5 | – | nein | 0 | **tot** |

## Quests

- **Clear the Old Crown Catacombs, Level 1** — active (Zug 9), Dungeon loc.old_crown_catacombs Ebene 1
  - Aufgabe: Clear level 1 of the Old Crown Catacombs beneath the ruined chapel west of the city, driving out or destroying the restless skeletons in the burial galleries so the wardens can resume walled burials.
  - Endzustand: Level 1 of the Old Crown Catacombs is cleared of its restless dead and the temple wardens can resume burials in the upper galleries.
- **Escort the Dyer's Cart to Reedford** — active (Zug 20)
  - Aufgabe: Escort the dyers' cart carrying two vats of finished madder dye along the river road to the trading yard at Reedford, where waylayers have been reported near the ford.
  - Endzustand: The dyers' cart and its driver reach the Reedford trading yard safely with the madder dye undamaged.
- **Deliver Warden's Tallow to the Chapel Keeper** — active (Zug 9) → completed (Zug 18), READY
  - Aufgabe: Deliver six crates of consecrated tallow candles to the chapel keeper at the ruined chapel west of the city, where the temple wardens need them for the catacomb stair.
  - Endzustand: The six crates of consecrated tallow candles are delivered intact to the chapel keeper at the ruined chapel west of Alderwatch.

## Auffälligkeiten

- Zug 15, Nachricht 30 (extraction_repaired): the extractor's first answer needed a repair
- Zug 15, Nachricht 30 (finish): extract ended with finish_reason "length"
- Zug 17, Nachricht 34 (extraction_repaired): the extractor's first answer needed a repair
- Zug 17, Nachricht 34 (finish): extract ended with finish_reason "length"
- Zug 21, Nachricht 42 (extraction_repaired): the extractor's first answer needed a repair
- Zug 23, Nachricht 46 (extraction_failed): the extractor failed: report is not valid JSON
- Zug 23, Nachricht 46 (extraction_repaired): the extractor's first answer needed a repair
- Zug 23, Nachricht 46 (finish): extract ended with finish_reason "length"
- Runner-Hinweis (dem Spieler nicht gezeigt): Rename ChatRenaming chat…
- Spieler: 19× keine gültige JSON-Entscheidung (Züge 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 21, 25)
- 3 Aufruf(e) mit finish_reason "length" (Nr. 40 extract, Nr. 47 extract, Nr. 67 extract)

System-Panels: CLARIFY 0, NOT TAKEN 0, REFUSED 0, BLOCKED 0, FAILED 0. Zurückgewiesene Deltas: ambient 4, guild_canon 2, pc_inventory 2, quest_delivery 1, engine_owned_fact 1.

## Performance

| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| plan | 24 | 0 | 2.5 s | 5.2 s | 10550 | 9237 | 75 | – | stop 24 | 0 |
| narrator | 24 | 0 | 11.4 s | 53.8 s | 11353 | 0 | 478 | – | stop 24 | 0 |
| extract | 28 | 1 | 8.1 s | 44.7 s | 9511 | 7808 | 561 | – | stop 25, length 3 | 4 |
| board | 1 | 0 | 12.5 s | 12.5 s | 1912 | 0 | 978 | – | stop 1 | 0 |

## Laufzeit (gemessen)

| | Zeit |
|---|---:|
| Gesamt (Start bis Ende des Spiels) | 21:01 min |
| Einrichtung bis zum ersten Zug (davon SillyTavern-Start 14.8 s) | 0:34 min |
| 26 Züge, Spiel (Senden bis HUD nach der Extraktion) | 17:29 min — Median 30.2 s, p90 76.3 s, max 120.3 s |
| 26 Züge, Spieler-Entscheidung | 2:36 min — Median 4.4 s, 19 unbrauchbare Antworten |
| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | 1:15 min / 0:12 min / 8:00 min / 7:08 min / 0:00 min |
| Ø je Zug (Spiel + Spieler) | 46.4 s |
| Hochrechnung bei diesem Tempo | 40 Züge ≈ 30:54 min, 80 Züge ≈ 61:49 min (ohne Einrichtung) |

### Auffällige Einzelzeiten

Je Phase/Providerrolle: über 30 Sekunden und über dem Dreifachen ihres Medians; höchstens drei Einträge. Providerzeiten liegen innerhalb der Spielzeiten, sie werden nicht zusätzlich summiert.

| Phase | Zug | API-Aufruf | Zeit | Median |
|---|---:|---:|---:|---:|
| Spiel | 25 | – | 120.3 s | 30.2 s |
| Spiel | 12 | – | 92.8 s | 30.2 s |
| Provider narrator | 12 | 30 | 82.0 s | 11.4 s |
| Provider narrator | 25 | 73 | 60.0 s | 11.4 s |
| Provider narrator | 16 | 43 | 53.8 s | 11.4 s |
| Provider extract | 25 | 74 | 54.1 s | 8.1 s |
| Provider extract | 17 | 47 | 46.8 s | 8.1 s |
| Provider extract | 15 | 40 | 44.7 s | 8.1 s |

## Schutz und Geheimnisse

- Aus dem Profil gelesen (nur lesend): 7 Dateien; danach alle unverändert.
- Profilordner insgesamt (1252 Dateien, Größe und Zeit): unverändert
- `secrets.json` des Profils wurde nicht gelesen; der Schlüssel kam aus der Umgebungsvariable und lag nur in der isolierten Instanz, deren `secrets.json` am Ende gelöscht wurde.
- Geheimnis-Scan des Laufordners (10 Textdateien): kein Schlüssel, kein Bearer-Token, kein api_key-Feld.
- Isolierte Instanz: gelöscht.

## Dateien

- `chat.jsonl` — der vollständige Chat, wie SillyTavern ihn speichert
- `avereth-events.json` — die Ereignisse der Engine (Format des Buttons „Export event log“)
- `server.log` — die Konsole der isolierten SillyTavern-Instanz (alle Requests und Antworten)
- `server.timed.log` — dieselbe Konsole mit Uhrzeit je Zeile
- `chat-completions.jsonl` — jeder Chat-Completion-Request mit seiner Antwort
- `calls.json` — je Aufruf: Rolle, Modell, Zeit, Tokens, finish_reason, Reparatur
- `player.jsonl` — jede Entscheidung des Spielers mit dem Bildschirmtext, den er sah
- `evaluation.json` — die Auswertung (Etappen, Kämpfe, Quests, Auffälligkeiten)
- `run.json` — Ablauf des Laufs: Züge, Zeiten, Hinweise, Seitenfehler, Statuszeile
- `import.json` — was aus dem Profil übernommen wurde (ohne Schlüssel)
- `report.md` — dieser Bericht
- `screens/` — Bildschirmfotos (Ende, Probleme)
