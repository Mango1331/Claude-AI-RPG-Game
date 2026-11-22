# Avereth Live-Test 20261109-160250Z-npc_pulse_test

## Kurzfassung

- **Laufprofil:** npc-sociable; Startklasse Warrior, Schwerpunkt npc. Freie Entscheidungen innerhalb des Schwerpunkts, keine Fixture.
- **Ergebnis:** abgeschlossen: alle Pflicht-Etappen erreicht
- **Etappen:** 2/2 Pflicht erreicht, optional: guild_registered ✔, quest_completed ✔, inside_dungeon ✔
- **Charakter:** warrior (warrior.heavy_slash, warrior.guard) · Regelstand 2 (Warrior, Mage, Rogue)
- **Ziel-Dungeon:** Mossback Warrens, Ebene 1 (Vertrag quest.clear_mossback_warrens_level_1)
- **Leitfaden:** npc_pulse_test („Natural adventurer life — people, agreements, personalities and a living world (NPC E2/E3, PULSE A/C/B)“)
- **Spieler:** LLM zai-org/GLM-5.3-Flash (127.0.0.1:5050, Temperatur 0.8), Stil: warm, curious and sociable: you seek out people, ask about their work and lives and follow up on it later; you readily offer help or ask capable people to come along, and accept a refusal gracefully; you still judge people by how they act and keep your guard up with anyone who threatens you
- **Züge:** 70 · **Dauer:** 75:28 min · **LLM-Aufrufe der Engine/des Erzählers:** 223
- **Beobachtete Abdeckung:** 18 unterschiedliche gebuchte Reiseziele · 3 Kämpfe · 2 Verkäufe (18 cp Umsatz, ohne Questzahlungen/Geschenke) · 0 Ausrüstungswechsel · 0 Skill-Erwerbe/Evolutionen/Proficiency-Aufstiege. Keine zusätzlichen Erfolgsbedingungen.
- **Auffälligkeiten:** 36
- **Profil unverändert:** ja · **Geheimnis-Scan:** sauber

## Aufbau

| | |
|---|---|
| Build (Erweiterung) | 4.3.0-c.6.6.174 |
| Git | 2a8b54e45a48 (claude/c-planner-prototype-2026-10-02-gpt-c666) — sauber |
| SillyTavern | 1.19.0 (C:\Users\mmitr\Silly\SillyTavern-Launcher\SillyTavern), isolierte Instanz auf Port 8123, Start 29.6 s |
| Browser | chrome 156.0.8078.80 (headless) |
| Verbindung deines SillyTavern | Quelle "custom" → custom_url http://127.0.0.1:5050/v1 · Modell zai-org/GLM-5.3-Flash · Schlüssel: secrets.json api_key_custom |
| Verbindung des Laufs | Quelle "custom" → custom_url http://127.0.0.1:5050/v1 · Modell zai-org/GLM-5.3-Flash · Schlüssel: AVERETH_LIVE_API_KEY — dieselbe |
| Preflight (GET /models) | http://127.0.0.1:5050/v1/models: 6 Modell(e) (Qwen/Qwen3.8-27B, zai-org/GLM-5.3-Flash, zai-org/GLM-5.3, deepseek-ai/DeepSeek-V4.1-Flash, deepseek-ai/DeepSeek-V4-Pro, moonshotai/Kimi-K2.6), Modell enthalten |
| Preset | Avereth Narrator V4 (aus dem Profil), weicht vom Build-Preset ab in: openai_max_tokens, show_thoughts |
| Generierung | Temperatur 0.9, max. Tokens 8192, Kontext 131072, Reasoning low |
| Streaming | aus |
| Spieler-Reasoning (wirksam) | `reasoning_effort`="low", `clear_thinking`=true — as the game's own requests carry them (custom_include_body and the preset's reasoning_effort), same endpoint and model · Probe: angenommen (finish stop, Reasoning 0 Zeichen) · max. 3000 Tokens |
| Karte | Avereth Engine Test v4: Begrüßung aus dem Profil, Beschreibung = Erzählervertrag dieses Builds (im Profil: 4.3.0-c.6.6.85) |
| Lorebook | Avereth World Lore v0.14 aus diesem Build (Profil verknüpft „Avereth_World_Lore_v0.14“, **abweichend**) |
| Engine-Einstellungen | {"enabled":true,"budget":1400,"rulesBudget":800,"recentTurns":4,"depth":0,"showDebug":true,"loreSource":"auto","wordSwaps":"ledger=register","hud":"closed","historyTurns":4,"stripTrackers":true,"recoverReports":true,"runtime":"v4","planner":true,"settingsRev":2,"legacyPlanner":true} |
| Kampagne | Chat „Avereth Live 20261109-160250Z-npc_pulse_test“, Seed 158018991 |

## Etappen

| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |
|---|---|---|---:|---:|---:|
| creation_complete | ja | ✔ | 2 | 3 | 8 |
| guild_registered | optional | ✔ | 5 | 9 |  |
| quest_completed | optional | ✔ | 24 | 48 |  |
| inside_dungeon | optional | ✔ | 65 | 130 |  |
| open_run_duration | ja | ✔ | 70 | 140 |  |

## Spielereingaben

| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |
|---:|---|---|---|---|---|---|---:|
| 1 | I choose Warrior. | Engine (Menü/Rückfrage) | creation_complete | Pick the Warrior base class | public roadside verge outside Ashbridge | 80/60 | 2.9 s |
| 2 | I pick Heavy Slash and Guard. | Engine (Menü/Rückfrage) | creation_complete | Finish Warrior creation with two starter skills | public roadside verge outside Ashbridge | 85/60 | 2.8 s |
| 3 | I walk along the road into Ashbridge and look for the Adventurers' Guild. | Erzähler | guild_registered | Enter city and locate the Guild | Adventurers' Guild hall, Ashbridge | 85/60 | 81.3 s |
| 4 | I approach the front desk and greet the clerk. "Morning. I'm new in town — I'd like to register with the Guild as an adventurer." | Erzähler | guild_registered | Register at the Guild desk | Adventurers' Guild hall, Ashbridge | 85/60 | 84.6 s |
| 5 | "Yes, still want it." I put two silver on the desk and give her my name: Alaric. | Erzähler | guild_registered | Pay the two silver registration fee and stand on the measuring stone | Adventurers' Guild hall, Ashbridge | 85/60 | 64.2 s |
| 6 | I walk to the contract board and read the notices pinned at the low rows. | Erzähler | guild_registered | Browse Novice contracts on the board | Adventurers' Guild hall, Ashbridge | 85/60 | 65.3 s |
| 7 | I take the Millpond Gnasher notice to the desk and show my Guild plate. "I'd like to accept this one, please. The dog at Widow Hessa's millp… | Erzähler | quest_completed | Accept the millpond gnasher contract | Adventurers' Guild hall, Ashbridge | 85/60 | 44.0 s |
| 8 | "Thanks. I'll be back with the slip." I head out of the Guild and follow the millrace path south toward Widow Hessa's millpond. | Erzähler | quest_completed | Travel to the millpond to hunt the gnasher | flooded stretch of the millrace path | 85/60 | 44.8 s |
| 9 | I look for the farmhouse near the pasture and approach it to ask the farmer's leave to cross his field around the flood. | Erzähler | quest_completed | Get permission to detour through the pasture around the flooded stretch | the pasture gate | 85/60 | 55.8 s |
| 10 | I lift the twine latch, go through the gate, and follow the track toward the farmhouse with the chimney smoke. | Erzähler | quest_completed | Cross the pasture toward the farmhouse to ask leave and detour around the flood | the farm by the chimney smoke | 85/60 | 65.3 s |
| 11 | "Right you are — the flood's over the path. I'm after a gnasher at Widow Hessa's millpond, Guild business. May I cross your pasture to get a… | Erzähler | quest_completed | Ask the farmer's leave to detour across his pasture | the farm by the chimney smoke | 85/60 | 64.5 s |
| 12 | "Thank you, Bren — I'll mind the latch. Good luck with the sheep." I head back down the track, through the gate, and follow it toward the mi… | Erzähler | quest_completed | Leave the farm and hunt the gnasher at the millpond | the reed banks of the Ashbridge millpond | 85/60 | 46.7 s |
| 13 | I draw my sword and advance slowly along the wallowed path toward the reeds where the sound sits. | Erzähler | quest_completed | Hunt the gnasher in the reeds | the reed stand at the millpond bend | 85/60 | 55.7 s |
| 14 | I meet its charge with a Heavy Slash as it crosses the mud. | Erzähler | quest_completed | Attack the charging gnasher with Heavy Slash | the reed stand at the millpond bend | 85/60 | 35.0 s |
| 15 | I cross back through Bren's pasture and take the track toward the mill to tell Widow Hessa her gnasher is dead, then head for the Guild hall… | Erzähler | open_run_duration | Report to Hessa and turn in the contract | the reed banks of the Ashbridge millpond | 85/60 | 73.6 s |
| 16 | "You're in luck, friend — the beast's dead. I killed it at the reed banks not half an hour past." I show him one of the fangs as proof. "Nam… | Erzähler | open_run_duration | Tell the carter the beast is dead, show proof, and get to know him | the reed banks of the Ashbridge millpond | 85/60 | 32.2 s |
| 17 | "Big as a calf, near enough — you can tell it as big as a barn and I'll only wince a little. I'll take that ride, Dodd, thank you." I climb … | Erzähler | open_run_duration | Accept the ride and ask Dodd to stop at the mill to report to Hessa | Widow Hessa's mill | 85/60 | 74.9 s |
| 18 | "It's dead, mistress — killed at the reed banks not an hour past, and I've the fang to prove it. I'm sorry it took your gander first." | Erzähler | open_run_duration | Confirm the gnasher's death to Widow Hessa | Widow Hessa's mill | 85/60 | 61.4 s |
| 19 | I accept the bread and butter with a bow of my head. "Thank you, mistress — I'll think kindly of this parish. Dodd's giving me a lift into A… | Erzähler | open_run_duration | Thank Hessa, ride with Dodd to Ashbridge, head for the Guild to turn in the contract | the hedged cart road to Ashbridge | 85/60 | 50.5 s |
| 20 | I step down from the cart, sword out, and put myself between the dogs and Dodd's horse. "Get the cart turned slow, Dodd — I'll hold them her… | Erzähler | open_run_duration | Defend the cart from the feral dogs | the hedged cart road to Ashbridge | 77/60 | 55.6 s |
| 21 | I finish the lead dog with a Basic Attack. | Erzähler | open_run_duration | Kill the wounded lead dog | the hedged cart road to Ashbridge | 77/60 | 28.3 s |
| 22 | #assign VIT 2 AGI 2 WIL 1 | System (Befehl) | open_run_duration | Spend level-up points, then continue to Ashbridge | the hedged cart road to Ashbridge | 77/60 | 2.8 s |
| 23 | I climb back onto the cart, pressing Dodd's rag to my thigh. "On to Ashbridge, then — Guild hall first, bandage after, just as you say. Than… | Erzähler | open_run_duration | Continue the ride to Ashbridge with Dodd | Ashbridge | 77/60 | 74.1 s |
| 24 | I thank Dodd and climb down at the square, then walk to the green Guild doors and turn in the Millpond Gnasher contract. | Erzähler | open_run_duration | Turn in the gnasher contract at the Guild hall | Adventurers' Guild hall, Ashbridge | 77/60 | 22.4 s |
| 25 | I pocket the coins and walk over to the board, reading the fresh listings. | Erzähler | open_run_duration | Browse the Guild contract board for a new achievable contract | Adventurers' Guild hall, Ashbridge | 77/60 | 26.5 s |
| 26 | I ask the clerk to accept the Clear Mossback Warrens Level 1 contract, and check it shows ACTIVE before I leave. | Erzähler | open_run_duration | Accept the warren contract as an achievable next job | Adventurers' Guild hall, Ashbridge | 77/60 | 28.7 s |
| 27 | I take the slip and ask the clerk, "Any Primer of Guard left? I'll take one at 80 coppers." | Erzähler | open_run_duration | Buy the Guard primer before heading to the warrens | Adventurers' Guild hall, Ashbridge | 77/60 | 28.7 s |
| 28 | I thank the clerk and head to the money changer on the market row to break a silver into coppers. | Erzähler | open_run_duration | Get coppers so I can buy the Guard primer | money changer's stall on market row | 77/60 | 31.7 s |
| 29 | "I'll take it all — one silver for ninety-seven coppers," I say, and accept the trade. | Erzähler | open_run_duration | Break the silver into coppers at the confirmed rate | money changer's stall on market row | 77/60 | 48.8 s |
| 30 | "Ninety-five, then — done," I say, and hand over the silver for the coppers. | Erzähler | open_run_duration | Accept the changer's revised rate of 95 coppers for the silver | money changer's stall on market row | 77/60 | 51.6 s |
| 31 | I head back to the Guild hall and tell the clerk, "Here's eighty coppers for the Primer of Guard," handing over the coin and taking the book… | Erzähler | open_run_duration | Buy the Guard primer with the changed coppers | money changer's stall on market row | 77/60 | 65.8 s |
| 32 | #status | System (Befehl) | open_run_duration | Verify whether the 95 coppers actually recorded before buying the primer | money changer's stall on market row | 77/60 | 2.8 s |
| 33 | I leave the money changer and walk back through the market crowd to the Guild hall, looking for the clerk with the brown-covered Primer. | Erzähler | open_run_duration | Return to the Guild hall so the primer purchase can be made from the right place | Adventurers' Guild hall, Ashbridge | 77/60 | 38.7 s |
| 34 | I nod to the clerk. "Yes, the Primer — here's eighty coppers." I hand over the coin and take the book if the trade goes through. | Erzähler | open_run_duration | Buy the Primer of Guard from the clerk with the exchanged coppers | Adventurers' Guild hall, Ashbridge | 77/60 | 150.0 s |
| 35 | I offer her a feral dog pelt toward the price and ask if she'd take it, or whether I should sell it first. | Erzähler | open_run_duration | Cover the ten-copper shortfall with a pelt | Adventurers' Guild hall, Ashbridge | 77/60 | 44.8 s |
| 36 | I head to tannery row, find Harl's shop with the stretched-hide sign, and ask what he'd pay for my feral dog pelt — and the millpond pelt, i… | Erzähler | open_run_duration | Sell pelts to Harl for coin so I can buy the Primer | tannery row | 77/60 | 58.2 s |
| 37 | I smile and accept the loaves and dripping. "Thank you — that's kind of you, and Tam's right to share. Was anyone hurt, or just the goose?" … | Erzähler | open_run_duration | Accept the villager's gift, then sell pelts to Harl | Harl's tannery | 77/60 | 119.7 s |
| 38 | "Fourteen for the pair works — done," I say, and accept the coppers once Harl pays. |  | open_run_duration | Sell both pelts to Harl for the agreed 14 coppers | Harl's tannery | 77/60 | 40.1 s |
| 39 | "Fourteen for the pair works — done," I say to Harl, and hold out my hand for the coppers. | Erzähler | open_run_duration | Close the agreed 14-copper pelt sale with Harl | Harl's tannery | 77/60 | 194.3 s |
| 40 | I take the fourteen coppers off the counter and hand Harl both hides. | Erzähler | open_run_duration | Close the pelt sale with Harl | Harl's tannery | 77/60 | 28.2 s |
| 41 | With the pelt money in hand, I head back to the shop with the Primer and buy it if I now have enough. | Erzähler | open_run_duration | Buy the Primer now that I have coin | bookshop with the Primer | 77/60 | 196.7 s |
| 42 | I ask the shopkeeper to take the Primer out of the case so I can buy it. | Erzähler | open_run_duration | Buy the Primer for 30 copper | bookshop with the Primer | 77/60 | 23.3 s |
| 43 | I thank the shopkeeper, tuck the wrapped Primer away, and head for the Guild hall to look over the Mossback Warrens contract before the day … | Erzähler | open_run_duration | Wrap up the purchase and review the active warrens contract at the Guild | Adventurers' Guild hall, Ashbridge | 77/60 | 47.2 s |
| 44 | "Thanks — the cairn with the red band, quarter mile before the well, track north. Got it. Before I go: Muller promised copper for the gnashe… | Erzähler | open_run_duration | Ask the clerk about Muller's unclaimed promised copper before heading west | Adventurers' Guild hall, Ashbridge | 77/60 | 40.5 s |
| 45 | I head to the Woolpack by the south gate and look for Muller to ask about the copper he promised me for the gnasher fangs. | Erzähler | open_run_duration | Find Muller at the Woolpack about his promised copper | the Woolpack | 77/60 | 51.3 s |
| 46 | I walk over to Muller's bench by the hearth. "Evening — you posted the gnasher cull this morning. Name's Alaric Red; I took the beast. You m… | Erzähler | open_run_duration | Claim Muller's promised copper for the gnasher fangs | the Woolpack | 77/60 | 43.8 s |
| 47 | I lay both gnasher fangs on the table in front of him. "There you are — both whole. Have a look." | Erzähler | open_run_duration | Show Muller the fangs to claim the promised 4 copper | the Woolpack | 77/60 | 33.9 s |
| 48 | I take the purse and count out the four copper, leaving the rest, and pocket my fangs' payment. "Fair dealt, Muller. Beast won't trouble you… | Erzähler | open_run_duration | Accept Muller's 4-copper payment for the fangs | the Woolpack | 77/60 | 23.7 s |
| 49 | I pocket the copper and give Muller a nod. "Thanks for the warning about the ford. The warrens I'm after lie west of the red-band cairn — an… | Erzähler | open_run_duration | Chat with Muller about the west road before heading out | the Woolpack | 77/60 | 76.2 s |
| 50 | I turn to the carter. "Alone, aye — for now. Quiet roads and running shepherds are worth hearing more about. Which way were you headed when … | Erzähler | open_run_duration | Talk with the carter about the west road and possibly company or travel | the Woolpack | 77/60 | 70.5 s |
| 51 | "A seat at first light suits me — I'd rather walk that road dry-rested with company than rush it now. I'll have a look at the cairn's red ba… | Erzähler | open_run_duration | Accept the carter's offer, then get lodging for the night | the Woolpack | 77/60 | 51.4 s |
| 52 | "I'll take the bed and the mutton supper — that's five copper, aye?" I pay her the five copper and take the key. | Erzähler | open_run_duration | Buy lodging and supper | the Woolpack | 77/60 | 87.9 s |
| 53 | "Five copper for bed and supper, then — I'll take it." I count out five copper and hand them to her, then take the key from the nail. | Engine (Menü/Rückfrage) | open_run_duration | Pay the named total of five copper for bed and supper | the Woolpack | 77/60 | 19.0 s |
| 54 | "Aye — three copper for the bed, and two more for the mutton supper, as you named it." I pay her three copper for the bed and two copper for… |  | open_run_duration | Buy the bed at its 3-copper offer and the supper at 2 copper | the Woolpack | 77/60 | 18.5 s |
| 55 | "I'll take the bed for three copper, as you offered." I pay her the three copper for the bed and take the key from the nail. | Erzähler | open_run_duration | Buy the bed at the standing 3-copper offer | the Woolpack | 77/60 | 235.5 s |
| 56 | I settle by the hearth and ask the carter, "That cairn's red band — weathered paint means travellers keep it fresh, aye? What should I look … | Erzähler | open_run_duration | Wait for supper bell while learning more about the cairn from the carter | the Woolpack | 77/60 | 52.3 s |
| 57 | I wait for the supper bell, and when it rings I tell the serving woman, "I'll take that mutton supper for two copper, as you said." | Erzähler | open_run_duration | Buy the conditional supper at 2 copper when the bell rings | the Woolpack | 77/60 | 37.8 s |
| 58 | I eat the stew and ask Muller, "That copper the clerk mentioned you owed — I'd hear it from you. What happened at your millpond?" | Erzähler | open_run_duration | Follow up with Muller about his promised copper and the millpond trouble | the Woolpack | 77/60 | 65.4 s |
| 59 | "You've said it plain enough, Muller — and I'm already bound for the warrens on a Guild contract. If I clear them, your carts come back. Wha… | Erzähler | open_run_duration | Tell Muller I already hold the warrens contract and ask for practical details on where the… | the Woolpack | 77/60 | 48.0 s |
| 60 | I thank Muller for the sketch and the tracks advice, then tell him I'll take the carter's peat wagon at first light and see his road cleared… | Erzähler | open_run_duration | Sleep until dawn, then ride the wagon toward the warrens | the Woolpack | 105/64 | 48.9 s |
| 61 | I eat the eggs and bread the serving woman has out, then head to the yard and greet the carter. "Morning! Ready for that seat to the crossro… | Erzähler | open_run_duration | Take the promised peat wagon ride toward the warrens | crossroads cairn on the south road | 105/64 | 77.7 s |
| 62 | I thank Torv and hop down at the cairn, then take Muller's road toward the mill, keeping an eye out for tracks and the flattened reed path a… | Erzähler | open_run_duration | Travel Muller's road toward the warrens, watching for goblin sign | Muller's millpond farm | 105/64 | 68.3 s |
| 63 | "Aye, that'll be me. Fetch your da — I'd hear how things stand at the warrens before I go out to the rocks." | Erzähler | open_run_duration | Talk with Muller before scouting the warrens | Muller's millpond farm | 105/64 | 51.0 s |
| 64 | "Point me to the Mossback rocks and that fence gap, and a hunk of your bread I'll take gladly. After that I'm out to the rocks while the sun… | Erzähler | open_run_duration | Get directions from Muller, accept bread, then head out to scout the warrens | Mossback Warrens | 105/64 | 39.5 s |
| 65 | I ready sword and shield-sense at the big warren mouth, then stoop in carefully, watching my footing on the mossy rock. | Erzähler | open_run_duration | Enter Mossback Warrens level 1 | low chamber past the carved lintel | 105/64 | 31.5 s |
| 66 | I meet the nearest charging scout with a Heavy Slash. | Erzähler | open_run_duration | Fight the goblin scouts | low chamber past the carved lintel | 105/64 | 46.4 s |
| 67 | I advance on Goblin Scout A to close to ENGAGED, then Heavy Slash it. | Erzähler | open_run_duration | Close the gap and strike the nearest scout | low chamber past the carved lintel | 97/64 | 61.0 s |
| 68 | I finish Goblin Scout A with a Heavy Slash. | Erzähler | open_run_duration | Kill the wounded scout | low chamber past the carved lintel | 80/64 | 59.9 s |
| 69 | I take a Basic Attack at Goblin Scout A to finish it off. | Erzähler | open_run_duration | Kill the wounded scout with a cheaper attack | low chamber past the carved lintel | 71/64 | 31.9 s |
| 70 | I Heavy Slash Goblin Scout B. | Erzähler | open_run_duration | Kill Scout B with a heavy cut | low chamber past the carved lintel | 63/64 | 34.6 s |

**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):

- zu Zug 24 (notiert vor Zug 25): HUD lead says Hessa is questioning Alaric about the kill, but she was left behind at the mill — the lead looks stale.
- zu Zug 25 (notiert vor Zug 26): All board contracts report foes above level 2; Warrens (quest level 4) is the closest fit and suits the dungeon milestone.
- zu Zug 27 (notiert vor Zug 28): Engine refused 80 cp payment though HUD shows 7 Silver; clerk says silver must be changed at the market row money changer first.
- zu Zug 29 (notiert vor Zug 30): The changer first quoted 97, then dropped to 95 with an excuse; minor haggling contradiction, not worth a fight.
- zu Zug 30 (notiert vor Zug 31): Narrator confirmed 95 coppers received, but the HUD still shows 7 Silver and no coppers — coin display may be stale; will verify with #bag or #status before relying on it.
- zu Zug 31 (notiert vor Zug 32): HUD still shows 7 Silver and no coppers despite confirmed exchange — coin display may be stale or trade not recorded.
- zu Zug 32 (notiert vor Zug 33): The engine read my combined travel+payment as still addressed to the changer ('nobody to pay'), so travel needs to be its own step. The status panel shows no coin line, so the 95 coppers stay unverified until a payment or #bag confirms them.
- zu Zug 33 (notiert vor Zug 34): HUD still shows 7 Silver and no coppers despite the confirmed exchange; the payment will show whether the coppers are really recorded.
- zu Zug 34 (notiert vor Zug 35): HUD still shows 7 Silver, but the clerk counted only 70 coppers — coin display remains unreliable.
- zu Zug 35 (notiert vor Zug 36): Clerk counted only 70 coppers while the HUD still shows 7 Silver — coin records remain inconsistent. Clerk directed me to Harl the tanner on tannery row as the pelt buyer.
- zu Zug 36 (notiert vor Zug 37): HUD shows the bread already carried before I accepted it — panel may be anticipating the offer. Muller's promised copper is recorded as an unclaimed debt; worth chasing later.
- zu Zug 39 (notiert vor Zug 40): HUD still shows 7 Silver and lists both pelts as carried — the sale is not yet recorded.
- zu Zug 42 (notiert vor Zug 43): HUD says 5 Silver 4 Copper — consistent with 84 copper minus 30. Shopkeeper was friendly; worth greeting on a return visit.
- zu Zug 43 (notiert vor Zug 44): HUD coin shows 5 Silver 4 Copper but Engine said 54 copper after the Primer; the 14 coppers from the pelt sale may never have been recorded. Clerk knows me and my contracts — good continuity.
- zu Zug 44 (notiert vor Zug 45): HUD shows 5 Silver 4 Copper, matching 54 copper minus nothing — the 14-copper pelt sale was still never recorded.
- zu Zug 54 (notiert vor Zug 55): Repeated planner failures on the combined bed+supper purchase wording; trying the bed alone at its standing offer.
- zu Zug 55 (notiert vor Zug 56): Bed purchase succeeded at 3 copper; supper is conditional on the bell, cannot be bought yet.
- zu Zug 57 (notiert vor Zug 58): Engine booked the supper purchase in narration despite the earlier PRICE OPEN result; coin total consistent at 55 copper.

## Kämpfe

| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |
|---|---:|---:|---|---|---:|---|
| enc.t14 | 14 | 1 | – | nein | 1 | gewonnen, 60 XP |
| enc.t20 | 20 | 1 | – | nein | 1 | gewonnen, 120 XP |
| enc.t62 | 67 | 3 | – | nein | – | offen |

## Quests

- **Cull the Millpond Gnasher** — active (Zug 7) → completed (Zug 24), READY
  - Aufgabe: Kill 1 the feral dog of the millpond at the reed banks of the Ashbridge millpond. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 the feral dog of the millpond killed at the reed banks of the Ashbridge millpond.
- **Clear Mossback Warrens Level 1** — active (Zug 26), Dungeon loc.mossback_warrens Ebene 1
  - Aufgabe: Clear level 1 of Mossback Warrens. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Mossback Warrens is clear.

## Auffälligkeiten

- Zug 9, Nachricht 18 (extraction_repaired): the extractor's first answer needed a repair
- Zug 10, Nachricht 20 (extraction_repaired): the extractor's first answer needed a repair
- Zug 17, Nachricht 34 (extraction_repaired): the extractor's first answer needed a repair
- Zug 20, Nachricht 39 (planner_repaired): the planner's first answer needed a repair
- Zug 20, Nachricht 39 (finish): plan ended with finish_reason "length"
- Zug 23, Nachricht 45 (planner_repaired): the planner's first answer needed a repair
- Zug 23, Nachricht 45 (finish): plan ended with finish_reason "length"
- Zug 26, Nachricht 52 (extraction_repaired): the extractor's first answer needed a repair
- Zug 29, Nachricht 57 (planner_repaired): the planner's first answer needed a repair
- Zug 30, Nachricht 59 (planner_repaired): the planner's first answer needed a repair
- Zug 31, Nachricht 61 (planner_repaired): the planner's first answer needed a repair
- Zug 31, Nachricht 61 (finish): plan ended with finish_reason "length"
- Zug 33, Nachricht 66 (extraction_repaired): the extractor's first answer needed a repair
- Zug 36, Nachricht 72 (extraction_repaired): the extractor's first answer needed a repair
- Zug 37, Nachricht 73 (planner_repaired): the planner's first answer needed a repair
- Zug 37, Nachricht 73 (finish): plan ended with finish_reason "length"
- Zug 38, Nachricht 75 (planner_failed): the planner failed: sell seq 1: the price words "Fourteen" carry no single amount in his message (currency_missing); quote exactly his one price, or set price_evidence to null
- Zug 38, Nachricht 75 (planner_repaired): the planner's first answer needed a repair
- Zug 39, Nachricht 77 (planner_repaired): the planner's first answer needed a repair
- Zug 40, Nachricht 79 (planner_repaired): the planner's first answer needed a repair
- Zug 41, Nachricht 81 (planner_repaired): the planner's first answer needed a repair
- Zug 41, Nachricht 81 (planner_recovery): the planner required transport recovery
- Zug 43, Nachricht 86 (extraction_repaired): the extractor's first answer needed a repair
- Zug 44, Nachricht 88 (extraction_repaired): the extractor's first answer needed a repair
- Zug 48, Nachricht 95 (planner_repaired): the planner's first answer needed a repair
- Zug 52, Nachricht 103 (planner_repaired): the planner's first answer needed a repair
- Zug 53, Nachricht 105 (planner_repaired): the planner's first answer needed a repair
- Zug 54, Nachricht 107 (planner_failed): the planner failed: offer.accept seq 1: the price words "three copper" carry no single amount in his message (quote_not_found); quote exactly his one price, or set price_evidence to null
- Zug 54, Nachricht 107 (planner_repaired): the planner's first answer needed a repair
- Zug 55, Nachricht 109 (planner_repaired): the planner's first answer needed a repair
- Zug 55, Nachricht 110 (extraction_repaired): the extractor's first answer needed a repair
- Zug 57, Nachricht 113 (planner_repaired): the planner's first answer needed a repair
- Zug 61, Nachricht 122 (extraction_repaired): the extractor's first answer needed a repair
- Zug 62, Nachricht 124 (extraction_repaired): the extractor's first answer needed a repair
- Zug 63, Nachricht 125 (planner_repaired): the planner's first answer needed a repair
- Zug 64, Nachricht 128 (extraction_repaired): the extractor's first answer needed a repair
- Runner-Hinweis (dem Spieler nicht gezeigt): Rename ChatRenaming chat…
- Spieler: 11× keine gültige JSON-Entscheidung (Züge 9, 11, 12, 13, 14, 18, 35, 57, 58, 64, 66)
- Server: Generation failed AbortError: The operation was aborted.
- Einrichtung: Final saved-state integrity: OK (0 fold errors, 0 validation problems).
- 4 Aufruf(e) mit finish_reason "length" (Nr. 57 plan, Nr. 64 plan, Nr. 92 plan, Nr. 110 plan)

System-Panels: CLARIFY 1, NOT TAKEN 0, REFUSED 0, BLOCKED 0, FAILED 0. Zurückgewiesene Deltas: engine_owned_fact 6, guild_canon 2, desk_handler 3, ambient 1, attack_commitment 3, met_not_known_here 1, met_without_arrival 2, road 2, world_rule 6, met_evidence 2, anchor_absent 1, offer 6, pc_inventory 1, scene_context 1, npc_presence 2, npc_continuity 3, object 1, group_unclear 2, pulse 6.
Soft-Extractor-Fehler mit Fortsetzung: 0. Ein Dialogzug kann trotz leerer Planner-Commands neue NPCs, Gaben oder Ereignisse enthalten; der fortgesetzte Test beweist **keine** vollständige Weltübernahme.
Recovery-Beobachtung: Planner leer 0, Transport 1, davon erfolgreich mit 0 Commands 0; Extractor leer 0, Transport 0, davon angewendet mit 0 Deltas 0. Null-Ergebnisse sind Prüfhinweise, keine bewiesenen Spielweltfehler.

Narrator-Recovery: 0 gespeicherte Versuchsmarkierungen (kein Nachweis gestarteter Provideraufrufe); danach 0 mit Erzähltext, 0 leer, 0 ohne Antwort; 0 mit Erzähltext und angewendeter Extraktion.

Spieler-JSON: 11/70 Erstantworten ungültig (15.7 %); 11 Zusatzanfragen; 0 Entscheidungen ohne brauchbare Antwort.

## Performance

| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| plan | 83 | 16 | 4.8 s | 21.6 s | 13181 | 10894 | 91 | – | stop 78, length 4 | 4 |
| narrator | 63 | 0 | 19.2 s | 34.9 s | 11768 | 8797 | 398 | – | stop 63 | 0 |
| extract | 75 | 12 | 12.6 s | 28.6 s | 14367 | 11272 | 439 | – | stop 75 | 0 |
| board | 2 | 1 | 21.7 s | 26.5 s | 3260 | 1412 | 1111 | – | stop 2 | 0 |

## Laufzeit (gemessen)

| | Zeit |
|---|---:|
| Gesamt (Start bis Ende des Spiels) | 75:28 min |
| Einrichtung bis zum ersten Zug (davon SillyTavern-Start 29.6 s) | 0:44 min |
| 70 Züge, Spiel (Senden bis HUD nach der Extraktion) | 65:21 min — Median 48.8 s, p90 84.6 s, max 235.5 s |
| 70 Züge, Spieler-Entscheidung | 8:47 min — Median 4.8 s, 11 unbrauchbare Antworten |
| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | 14:18 min / 0:44 min / 27:21 min / 19:31 min / 0:00 min |
| Ø je Zug (Spiel + Spieler) | 63.5 s |
| Hochrechnung bei diesem Tempo | 40 Züge ≈ 42:22 min, 80 Züge ≈ 84:43 min (ohne Einrichtung) |

### Auffällige Einzelzeiten

Je Phase/Providerrolle: über 30 Sekunden und über dem Dreifachen ihres Medians; höchstens drei Einträge. Providerzeiten liegen innerhalb der Spielzeiten, sie werden nicht zusätzlich summiert.

| Phase | Zug | API-Aufruf | Zeit | Median |
|---|---:|---:|---:|---:|
| Spiel | 55 | – | 235.5 s | 48.8 s |
| Spiel | 41 | – | 196.7 s | 48.8 s |
| Spiel | 39 | – | 194.3 s | 48.8 s |
| Provider plan | 31 | 92 | 45.5 s | 4.8 s |
| Provider plan | 37 | 110 | 44.2 s | 4.8 s |
| Provider plan | 52 | 161 | 31.9 s | 4.8 s |
| Provider narrator | 55 | 171 | 191.1 s | 19.2 s |
| Provider narrator | 39 | 118 | 168.4 s | 19.2 s |
| Provider extract | 34 | 102 | 100.0 s | 12.6 s |

## Schutz und Geheimnisse

- Aus dem Profil gelesen (nur lesend): 8 Dateien; danach alle unverändert.
- Profilordner insgesamt (1682 Dateien, Größe und Zeit): unverändert
- `secrets.json` des Profils wurde nicht gelesen; der Schlüssel kam aus der Umgebungsvariable und lag nur in der isolierten Instanz, deren `secrets.json` am Ende gelöscht wurde.
- Geheimnis-Scan des Laufordners (12 Textdateien): kein Schlüssel, kein Bearer-Token, kein api_key-Feld.
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
- `npc-pulse.json` — die NPC-/PULSE-Auswertung (Abdeckung, Beobachtungen, Regelverletzungen, Review-Stellen)
- `npc-pulse.md` — die NPC-/PULSE-Auswertung als Bericht
- `run.json` — Ablauf des Laufs: Züge, Zeiten, Hinweise, Seitenfehler, Statuszeile
- `import.json` — was aus dem Profil übernommen wurde (ohne Schlüssel)
- `report.md` — dieser Bericht
- `screens/` — Bildschirmfotos (Ende, Probleme)

## NPC/PULSE-Auswertung

Abgedeckt: 17/28 Testziele; **nicht abgedeckt:** desk_handler, agreement_npc_only, agreement_unbound, anchor_stored, anchor_changed, anchor_refused_first_contact, anchor_refused_mood, anchor_on_card, pulse_dungeon, pulse_interrupt, pulse_wanderer.
Regelverletzungen (automatisch): 0. Zum Review: 9 Stellen.
Details, Tabellen und Originalstellen: [npc-pulse.md](npc-pulse.md), vollständig in npc-pulse.json.
