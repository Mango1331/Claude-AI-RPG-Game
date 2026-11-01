# Avereth Live-Test 20261101-181218Z-current_test

## Kurzfassung

- **Laufprofil:** guild-rogue; Startklasse Rogue, Schwerpunkt guild. Freie Entscheidungen innerhalb des Schwerpunkts, keine Fixture.
- **Ergebnis:** abgebrochen: unerwarteter UI-Zustand — turn 282: chat persistence failed
- **Etappen:** 3/3 Pflicht erreicht
- **Progressionsziel:** Level 15; tatsächlich Level 15. Sicherheitsgrenzen: 1000 Eingaben / 1440 Minuten. Ein Limitabbruch erfüllt das Ziel nicht.
- **Vergleich nach 100 Eingaben:** Level 7, 350 XP seit Levelaufstieg, 44 cp, HP 145, MP 108; Ort loc.millpond_sluice. Ausrüstung und Skills stehen in evaluation.json → progression.checkpoint.
- **Charakter:** rogue (rogue.piercing_thrust, rogue.fan_of_blades) · Regelstand 2 (Warrior, Mage, Rogue)
- **Leitfaden:** current_test („Open-world progression — natural Level 1 through E class evolution“)
- **Spieler:** LLM zai-org/GLM-5.3-Flash (127.0.0.1:5050, Temperatur 0.8), Stil: cautious adventurer: prepare and recover, weigh threats and withdraw when sensible
- **Züge:** 282 · **Dauer:** 202:10 min · **LLM-Aufrufe der Engine/des Erzählers:** 820
- **Beobachtete Abdeckung:** 45 unterschiedliche gebuchte Reiseziele · 21 Kämpfe · 11 Verkäufe (436 cp Umsatz, ohne Questzahlungen/Geschenke) · 8 Ausrüstungswechsel · 2 Skill-Erwerbe/Evolutionen/Proficiency-Aufstiege. Keine zusätzlichen Erfolgsbedingungen.
- **Auffälligkeiten:** 70
- **Profil unverändert:** ja · **Geheimnis-Scan:** sauber

## Aufbau

| | |
|---|---|
| Build (Erweiterung) | 4.3.0-c.6.6.146 |
| Git | 9136f8ff664a (claude/c-planner-prototype-2026-10-02-gpt-c666) — sauber |
| SillyTavern | 1.19.0 (C:\Users\mmitr\Silly\SillyTavern-Launcher\SillyTavern), isolierte Instanz auf Port 8123, Start 17.8 s |
| Browser | chrome 156.0.8078.49 (headless) |
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
| Kampagne | Chat „Avereth Live 20261101-181218Z-current_test“, Seed 1346262525 |

## Etappen

| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |
|---|---|---|---:|---:|---:|
| creation_complete | ja | ✔ | 2 | 3 | 8 |
| open_run_level | ja | ✔ | 276 | 552 |  |
| class_accepted | ja | ✔ | 282 | 563 |  |

## Spielereingaben

| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |
|---:|---|---|---|---|---|---|---:|
| 1 | I choose Rogue. | Engine (Menü/Rückfrage) | creation_complete | Select Rogue base class | public roadside verge outside Alderwatch | 90/84 | 2.3 s |
| 2 | I select Fan of Blades and Piercing Thrust as my two skills. | Engine (Menü/Rückfrage) | creation_complete | Pick required AoE skill plus a strong single-target attack | public roadside verge outside Alderwatch | 90/84 | 2.1 s |
| 3 | I walk toward the city gates of Alderwatch and head for the Adventurers' Guild to look for a suitable novice contract. | Erzähler | open_run_level | Reach Alderwatch and check the Guild board for an achievable Level-1 contract | Adventurers' Guild hall, Alderwatch | 90/84 | 39.2 s |
| 4 | I ask the clerk to register me with the Guild and pay the two silver fee. | Erzähler | open_run_level | Register with the Guild so I can take a contract | Adventurers' Guild hall, Alderwatch | 90/84 | 20.1 s |
| 5 | I tell the clerk I'll take the Millpond Wolf contract and ask her to sign it out to me. | Erzähler | open_run_level | Sign out the millpond wolf contract | Adventurers' Guild hall, Alderwatch | 90/84 | 16.3 s |
| 6 | I take the slip and head out of the Guild, following the towpath downriver toward Marrow & Sons Gristmill. | Erzähler | open_run_level | Travel to the millpond for the wolf contract | the millpond and sluice of Marrow & Sons Gristmill | 90/84 | 16.9 s |
| 7 | I move quietly along the reed line toward the far end of the pond, watching for the wolf. | Erzähler | open_run_level | Stalk and find the millpond wolf | the far end of the millpond along the reed line | 90/84 | 20.8 s |
| 8 | I open with Fan of Blades at the wolf from twenty paces, then close in with my dagger drawn. | Erzähler | open_run_level | Attack the millpond wolf with AoE then engage | the far end of the millpond along the reed line | 90/84 | 15.5 s |
| 9 | I head back along the towpath to the Adventurers' Guild in Alderwatch and turn in the completed Millpond Wolf contract for the reward. | Erzähler | open_run_level | Turn in the finished wolf contract at the Guild | Adventurers' Guild hall, Alderwatch | 90/84 | 32.0 s |
| 10 | #assign AGI 2 PER 2 WIL 1 | System (Befehl) | open_run_level | Spend level-up points on AGI, PER and WIL | Adventurers' Guild hall, Alderwatch | 90/84 | 2.1 s |
| 11 | I ask the clerk if the Guild buys wolf pelts and fangs, and if so, what he'll offer for one pelt and three fangs. | Erzähler | open_run_level | Sell surplus loot to the clerk | Adventurers' Guild hall, Alderwatch | 90/84 | 22.1 s |
| 12 | "Log them, twelve copper suits me fine." I hand over the pelt and three fangs. | Erzähler | open_run_level | Sell loot to the clerk at his quoted price | Adventurers' Guild hall, Alderwatch | 90/84 | 28.3 s |
| 13 | "Done — the pelt and three fangs for twelve copper, as you logged it." I hand the goods over and take the coins. | Erzähler | open_run_level | Complete the binding sale of wolf pelt and fangs | Adventurers' Guild hall, Alderwatch | 90/84 | 20.1 s |
| 14 | I walk to the Guild contract board and look over the fresh postings. | Erzähler | open_run_level | Pick a new achievable contract | Adventurers' Guild hall, Alderwatch | 90/84 | 13.3 s |
| 15 | I take the Bramble Fen Adders contract slip and ask the clerk to accept it as my active contract. | Erzähler | open_run_level | Accept the adder cull contract and verify it is ACTIVE | Adventurers' Guild hall, Alderwatch | 90/84 | 17.1 s |
| 16 | I leave the Guild and follow the drainage road south and east toward the reed-cutters' path in Alderwatch Fen, watching the ground for adder… | Erzähler | open_run_level | Travel to the Bramble Fen hummocks for the adder cull | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 90/84 | 15.8 s |
| 17 | I move carefully along the corduroy path, checking the near hummocks for adders. | Erzähler | open_run_level | Hunt fen adders on the hummocks | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 90/84 | 18.2 s |
| 18 | I throw a Fan of Blades at the two adders on the hummock. | Erzähler | open_run_level | Attack both engaged adders with AoE from range | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 70/84 | 15.1 s |
| 19 | I finish Fen Adder A with a Piercing Thrust. | Erzähler | open_run_level | Kill the badly wounded adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 60/84 | 16.7 s |
| 20 | I finish Fen Adder B with a Piercing Thrust. | Erzähler | open_run_level | Kill the last adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 60/84 | 17.7 s |
| 21 | I spend my free stat points: #assign VIT 4 WIL 3 STR 3 | Erzähler | open_run_level | Assign 10 free points to boost survivability | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 60/84 | 13.9 s |
| 22 | I press on along the corduroy path, checking the next hummocks for adders. | Erzähler | open_run_level | Continue the adder cull (3 more needed) | adder den under the rotted stump | 60/84 | 24.4 s |
| 23 | I back off a few strides along the corduroy log, then throw a Fan of Blades at the den mouth where the hiss comes from. | Engine (Menü/Rückfrage) | open_run_level | Bait out and strike the den adder with AoE from range | adder den under the rotted stump | 60/84 | 8.9 s |
| 24 | I step closer and prod the hissing den mouth with my dagger to draw the adder out. | Erzähler | open_run_level | Bait the den adder into the open so it becomes a targetable actor | adder den under the rotted stump | 60/84 | 20.3 s |
| 25 | I strike the coiled adder with a Piercing Thrust, then immediately step back toward the log to keep my distance. | Erzähler | open_run_level | Attack Fen Adder C with hit-and-run spacing | adder den under the rotted stump | 43/84 | 18.9 s |
| 26 | I finish the wounded adder with a Basic Attack. | Erzähler | open_run_level | Kill Fen Adder C before it bites again | adder den under the rotted stump | 43/84 | 14.5 s |
| 27 | I spend my free stat points: #assign VIT 5 WIL 5 STR 5 | Erzähler | open_run_level | Assign 15 free points to boost survivability | adder den under the rotted stump | 43/84 | 15.6 s |
| 28 | #status | System (Befehl) | open_run_level | Verify the stat assignment registered, since the HUD still shows 15 free points | adder den under the rotted stump | 43/84 | 2.1 s |
| 29 | #assign VIT 5 WIL 5 STR 5 | System (Befehl) | open_run_level | Spend the 15 free stat points on survivability | adder den under the rotted stump | 43/84 | 2.1 s |
| 30 | I leave the den mound alone and follow the corduroy path back toward town to recover and sell my adder loot before hunting the last two. | Erzähler | open_run_level | Withdraw wounded to town, recover and sell loot | Alderwatch | 43/84 | 22.0 s |
| 31 | I head to the market row and ask the hides buyer what he'll pay for my three adder skins, four fangs and two venom sacs. | Erzähler | open_run_level | Sell adder loot, then rest and gear up | market row | 43/84 | 23.5 s |
| 32 | I take the seventeen copper in trade: sell the lot and ask for a salve and bandaging for my arm. | Engine (Menü/Rückfrage) | open_run_level | Sell adder loot and get treated | market row | 43/84 | 13.3 s |
| 33 | I accept the 16 copper bid and ask for the salve and bandaging. | Erzähler | open_run_level | Accept confirmed offer and get treated | market row | 43/84 | 22.2 s |
| 34 | I take the five-copper deal: salve, bandaging, and the second pot. | Erzähler | open_run_level | Buy treatment supplies | market row | 43/84 | 16.9 s |
| 35 | I place five copper on the counter and buy the fen salve, the bandaging roll and the second pot of salve for five copper, then wash my arm a… | Erzähler | open_run_level | Complete the salve purchase and treat the adder bite | market row | 43/84 | 39.9 s |
| 36 | I buy the second pot of fen salve for one copper, then wrap my arm with the bandaging roll. | Erzähler | open_run_level | Finish salve purchase and bandage the treated arm | market row | 43/84 | 18.5 s |
| 37 | I ask a smith on the market row what he'd charge for a better dagger and a suit of light armor. | Erzähler | open_run_level | Compare gear upgrades at a smith before more hunting | market row | 43/84 | 28.5 s |
| 38 | I'll take the common jerkin for 48 copper and have it fitted — that's what I can afford alongside my other gear. | Erzähler | open_run_level | Buy affordable light armour upgrade | market row | 43/84 | 19.1 s |
| 39 | I equip the new common jerkin in place of the starter light armor. | Erzähler | open_run_level | Equip the purchased jerkin | market row | 43/84 | 15.4 s |
| 40 | I leave the smithy and head back to the Bramble Fen to hunt the last two adders for my contract. | Erzähler | open_run_level | Finish the adder cull contract | market row | 43/84 | 18.3 s |
| 41 | I walk east out of Alderwatch along the fen road, taking the corduroy path into the Bramble Fen to hunt the last two adders. | Erzähler | open_run_level | Travel to the Bramble Fen for the adder cull | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 43/84 | 26.0 s |
| 42 | I strike the sunning adder with Piercing Thrust, then back toward the fork to keep the reeds in view. | Erzähler | open_run_level | Kill the visible adder while watching the unseen threat | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 43/84 | 35.6 s |
| 43 | I back away down the path away from both the adder and the still reeds, and head back to Alderwatch to rest — I'm too badly wounded to fight… | Erzähler | open_run_level | Withdraw to town and recover before finishing the contract | Alderwatch | 43/84 | 23.2 s |
| 44 | I go to the inn and ask for a room for the night, then sleep until morning. | Erzähler | open_run_level | Recover HP overnight at the inn | The Lamplighter's Rest | 43/84 | 20.4 s |
| 45 | I accept the innkeeper's offer: the room for the night plus supper and porridge at first light, six copper total. | Erzähler | open_run_level | Buy lodging and meals, then sleep | The Lamplighter's Rest | 43/84 | 21.6 s |
| 46 | I'll take the soup and bread for three copper, and the porridge at first light for two — six copper for the food in total. | Erzähler | open_run_level | Buy supper and breakfast, then sleep | The Lamplighter's Rest | 43/84 | 26.0 s |
| 47 | I eat the soup and bread, then go up to my room and sleep until morning. | Erzähler | open_run_level | Eat supper and sleep to recover HP | The Lamplighter's Rest | 135/108 | 20.6 s |
| 48 | I pay the two copper and eat the porridge, then head to the Guild hall to check the contract board. | Erzähler | open_run_level | Eat breakfast, then return to the Guild to finish the adder contract | Adventurers' Guild hall, Alderwatch | 135/108 | 54.9 s |
| 49 | I ask the clerk to turn in my adder contract — I've defeated three of the five adders so far. | Erzähler | open_run_level | Turn in partial adder contract progress | Adventurers' Guild hall, Alderwatch | 135/108 | 27.4 s |
| 50 | I take the slip back and head to the Bramble Fen to hunt the last two adders. | Erzähler | open_run_level | Finish the adder cull | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 20.1 s |
| 51 | I circle the hummock quietly and search the thorn tangle for the adder, dagger ready. | Erzähler | open_run_level | Hunt the fourth adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 21.2 s |
| 52 | I lunge at the adder's head with Piercing Thrust. | Erzähler | open_run_level | Attack the fourth adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 12.4 s |
| 53 | I step forward to close the distance, then strike at the adder's head with Piercing Thrust. | Erzähler | open_run_level | Close to ENGAGED and attack the adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 13.1 s |
| 54 | I search the reed banks and mud along the corduroy path for the fifth and last adder, dagger ready. | Erzähler | open_run_level | Hunt the fifth adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 14.3 s |
| 55 | I circle back to the bramble hummocks and search them for the fifth adder, dagger ready. | Erzähler | open_run_level | Hunt the fifth and last adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 17.4 s |
| 56 | I wade out along the water's edge where the mud is softest and search the shallows for the fifth adder. | Erzähler | open_run_level | Hunt the fifth adder in a new spot | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 15.7 s |
| 57 | I strike at the adder's head with Piercing Thrust before it can slip deeper into the water. | Erzähler | open_run_level | Attack the fifth adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 13.4 s |
| 58 | I wade through the shallow mud to close the distance, then strike at the adder's head with Piercing Thrust. | Erzähler | open_run_level | Close to ENGAGED and attack the fifth adder | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 16.5 s |
| 59 | #assign AGI 3 PER 2 | System (Befehl) | open_run_level | Spend free stat points, then head back to turn in the adder contract | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 135/108 | 2.1 s |
| 60 | I head back along the corduroy path to the Guild hall in town and turn in the completed adder contract. | Erzähler | open_run_level | Turn in the 5/5 adder contract | Adventurers' Guild hall, Alderwatch | 135/108 | 17.8 s |
| 61 | I'll take the Primer of Guard for 80 copper. | Erzähler | open_run_level | Buy a skill primer | Adventurers' Guild hall, Alderwatch | 135/108 | 21.5 s |
| 62 | I read the Primer of Guard with my dagger in hand to learn the guard skill. | Engine (Menü/Rückfrage) | open_run_level | Learn guard from the primer | Adventurers' Guild hall, Alderwatch | 135/108 | 6.4 s |
| 63 | I read the Primer of Guard with my dagger in hand for 2 hours to learn the guard skill. | Erzähler | open_run_level | Learn guard skill from the primer | Adventurers' Guild hall, Alderwatch | 135/108 | 15.2 s |
| 64 | I head to the tanner's shop and ask to broker the fen adder skins and wolf pelt as arranged. | Erzähler | open_run_level | Sell adder skins and wolf pelt to the tanner | tanner's row | 135/108 | 20.8 s |
| 65 | I'll take the twelve silver outright for the lot. | Engine (Menü/Rückfrage) | open_run_level | Sell adder skins and wolf pelt outright for 12 silver | tanner's row | 135/108 | 10.4 s |
| 66 | I sell the two fen adder skins and the wolf pelt to the tanner outright for twelve silver total. | Erzähler | open_run_level | Confirm the sale to the tanner | tanner's row | 135/108 | 24.8 s |
| 67 | #bag | System (Befehl) | open_run_level | Check whether the wolf pelt is in inventory | tanner's row | 135/108 | 2.5 s |
| 68 | I sell the two fen adder skins to the tanner outright for twelve silver total, as she offered. | Erzähler | open_run_level | Confirm sale of the adder skins only (no wolf pelt held) | tanner's row | 135/108 | 21.0 s |
| 69 | Two and a half silver for that one skin, then. I accept your offer and hand over the skin. |  | open_run_level | Sell the single adder skin for 2.5 silver | tanner's row | 135/108 | 9.0 s |
| 70 | I hand over the adder skin on the counter and take the two and a half silver for it. | Erzähler | open_run_level | Complete the single-skin sale for 2.5 silver | tanner's row | 135/108 | 20.7 s |
| 71 | Two silver it is — I take the coins and hand over the skin. | Erzähler | open_run_level | Complete the single-skin sale at her stated total of two silver | tanner's row | 135/108 | 15.3 s |
| 72 | I still have one more fen adder skin — I offer it to her at the same two silver. | Erzähler | open_run_level | Sell the remaining adder skin to the tanner | tanner's row | 135/108 | 23.1 s |
| 73 | I head to the smithy up the row to check light weapons and armour against my skills and coin. | Erzähler | open_run_level | Pursue gear priority at a smith | smithy | 135/108 | 32.1 s |
| 74 | I ask the smith to show me the light armor in the back yard, and mention I'm also eyeing the fine dagger on the rack. | Erzähler | open_run_level | Compare light armour and a fine dagger against my skills and coin | smithy | 135/108 | 23.5 s |
| 75 | I'll take the common dagger for 80 copper — I hand over the coins and take it. | Engine (Menü/Rückfrage) | open_run_level | Buy the common dagger upgrade | smithy | 135/108 | 28.7 s |
| 76 | I buy the common F-Rank dagger from Smith B for 80 copper total — I hand over the coins and take the dagger. | Engine (Menü/Rückfrage) | open_run_level | Complete the dagger purchase with explicit goods, merchant and total price | smithy | 135/108 | 7.7 s |
| 77 | I want to buy the common F-Rank dagger from Smith B for a total price of 80 copper. I pay 80 copper and take the dagger. | Erzähler | open_run_level | Complete the dagger purchase with explicit buy wording | smithy | 135/108 | 17.5 s |
| 78 | I equip the new common F-Rank dagger and ask the smith if he'll buy my retired starter dagger off me. | Erzähler | open_run_level | Equip the new dagger and sell the starter dagger | smithy | 135/108 | 14.6 s |
| 79 | I accept — ten copper for the starter dagger, deal. | Erzähler | open_run_level | Sell the starter dagger at the offered price | smithy | 135/108 | 18.8 s |
| 80 | Before I go — do you buy fen adder fangs? I've got a few spare from the fens. | Erzähler | open_run_level | Sell surplus fen adder fangs to the smith | smithy | 135/108 | 14.7 s |
| 81 | I head to the apothecary on Cordwainer Lane and ask Wren if she'll buy my four fen adder fangs. | Erzähler | open_run_level | Sell surplus fangs to the apothecary | Wren's apothecary on Cordwainer Lane | 135/108 | 29.6 s |
| 82 | I lay the four fen adder fangs out on her counter for inspection. | Erzähler | open_run_level | Show Wren the fangs to get a purchase offer | Wren's apothecary on Cordwainer Lane | 135/108 | 25.4 s |
| 83 | I'll take the five copper for the lot — deal. | Erzähler | open_run_level | Sell all four fen adder fangs to Wren for 5 copper | Wren's apothecary on Cordwainer Lane | 135/108 | 53.1 s |
| 84 | The sound ones I'll keep for Marta's return — but I'll sell you the cracked fang for the copper, if you'll take it now. | Erzähler | open_run_level | Sell the cracked fang at Wren's standing offer, keep the sound ones | Wren's apothecary on Cordwainer Lane | 135/108 | 31.6 s |
| 85 | I pocket all four fangs to carry myself, thank Wren, and head to the tanner to broker the adder skin as arranged. | Erzähler | open_run_level | Keep fangs, sell adder skin at the tanner | tanner's row | 135/108 | 36.6 s |
| 86 | I unroll the adder skin and show it to her. What will you give me for it — and I've a wolf pelt to sell too, if you take those. | Erzähler | open_run_level | Get an offer for the adder skin and wolf pelt | tanner's row | 135/108 | 22.1 s |
| 87 | I'll take the six copper for the adder skin — and I pull out the wolf pelt and hand it over for her to inspect. | Erzähler | open_run_level | Sell the adder skin for 6 copper and show the wolf pelt for a price | tanner's row | 135/108 | 89.8 s |
| 88 | I'll take the twenty copper for the wolf pelt — deal. | Erzähler | open_run_level | Sell the wolf pelt at her offer of 20 copper | tanner's row | 135/108 | 32.4 s |
| 89 | I step back from the counter. "My mistake — the pelt's not mine to sell either. Keep it, I'll not press a bad trade." I thank her and leave … | Erzähler | open_run_level | Withdraw the double-sale attempt and leave | tanner's row | 135/108 | 18.6 s |
| 90 | #assign AGI 3 PER 2 | System (Befehl) | open_run_level | Spend free stat points before evening | tanner's row | 135/108 | 2.5 s |
| 91 | I head from the tanner's row to find an inn with a room for the night. | Erzähler | open_run_level | Get lodging and recover overnight | fountain square | 135/108 | 32.1 s |
| 92 | "Done — if the wolf's dead by my hand and your niece safe, I'll call at the Bellfounder for that silver." I shake on it if he will, then cro… | Erzähler | open_run_level | Accept Harl's side offer, then get lodging and food for the night | Sluice & Cask | 135/108 | 32.0 s |
| 93 | "Staying. Room for the night and the hot stew — that's twelve copper." I pay her. | Erzähler | open_run_level | Buy lodging and hot stew for 12 copper | Sluice & Cask | 145/108 | 40.3 s |
| 94 | "The stew at four copper, then — I'll take it now." I pay her and eat before heading out. | Erzähler | open_run_level | Buy the hot stew at the stated 4 copper, then plan the day | Sluice & Cask | 145/108 | 28.4 s |
| 95 | I head east to the Bellfounder smithy and ask the smith to see his light weapons and light armour. | Erzähler | open_run_level | Check gear at the smithy per gear priority | smithy | 145/108 | 23.8 s |
| 96 | "What's the price on the common light armor and the gambeson? I've the coin for a fair upgrade on either." | Erzähler | open_run_level | Get armour prices before buying | smithy | 145/108 | 17.2 s |
| 97 | "Forty-eight copper for the leather — that's beyond my forty-four, so no sale today." I thank the smith and look around the yard for Harl Ot… | Erzähler | open_run_level | Decline unaffordable armour, find Harl for the wolf side job | smithy | 145/108 | 22.9 s |
| 98 | "Still willing — one silver, paid when the wolf's dead and your niece is safe. I'll head to the sluice now." | Erzähler | open_run_level | Confirm Harl's side job terms and go hunt the sluice wolf | millpond sluice | 145/108 | 33.8 s |
| 99 | I draw my dagger and aim a Piercing Thrust at the wolf's throat. | Erzähler | open_run_level | Fight the sluice wolf | millpond sluice | 145/108 | 17.9 s |
| 100 | I strike with Piercing Thrust at the wolf. | Erzähler | open_run_level | Attack the wolf on my turn | millpond sluice | 145/108 | 20.1 s |
| 101 | I close the distance to the wolf and thrust with Piercing Thrust as soon as I'm in reach. | Erzähler | open_run_level | Move into range and attack the wolf | millpond sluice | 145/108 | 13.9 s |
| 102 | I brace and drive Piercing Thrust up into the wolf as it lands on me. | Erzähler | open_run_level | Attack the wolf at ENGAGED range as it springs | millpond sluice | 145/108 | 13.0 s |
| 103 | I step into SHORT range and loose Fan of Blades at the wolf. | Erzähler | open_run_level | Close to SHORT and use AoE on the wolf | millpond sluice | 145/108 | 15.4 s |
| 104 | I skin the proof of the kill, take the pelt and fangs, and head back to Harl Ottoway at the mill to tell him the sluice wolf is dead and cla… | Erzähler | open_run_level | Collect payment for the sluice wolf | the millpond and sluice of Marrow & Sons Gristmill | 145/108 | 40.3 s |
| 105 | I thank Harl and head to the tanner down the lane to ask his price for the wolf pelt. | Erzähler | open_run_level | Sell pelt, then check gear shops | the tanner's yard down the lane behind the mill | 145/108 | 23.5 s |
| 106 | I accept the four copper and hand over the pelt, then ask if he knows a smith or trader in Valedorn Crown who sells light weapons and armour… | Erzähler | open_run_level | Sell pelt, then find gear shops | the tanner's yard down the lane behind the mill | 145/108 | 19.2 s |
| 107 | I head to Cordery's on Buckle Street and tell old Cordery that Bramm the tanner sent me, then ask to see his light daggers and armour. | Erzähler | open_run_level | Gear shopping at recommended trader | Cordery's on Buckle Street | 145/108 | 30.8 s |
| 108 | I ask Cordery the prices on the fine dagger, the oiled common leathers, and the fine boiled-leather light armor, and whether he'd take my ol… | Erzähler | open_run_level | Get prices for gear upgrades | Cordery's on Buckle Street | 145/108 | 22.9 s |
| 109 | I take off the old jerkin and my starter light armor and hand both to Cordery, asking what he'd knock off the fine light armor's price for t… | Erzähler | open_run_level | Trade in old armor toward the fine light armor | Cordery's on Buckle Street | 145/108 | 23.0 s |
| 110 | I shake my head and take back my old jerkin and starter armor. "Nineteen silver is beyond my purse today, Cordery — I'll keep my old kit for… | Erzähler | open_run_level | Decline the unaffordable armor trade and keep current gear | Cordery's on Buckle Street | 145/108 | 44.8 s |
| 111 | I thank Cordery and head to the Adventurers' Guild hall to look over the contract board for a job I can take at my level. | Erzähler | open_run_level | Gear unaffordable; find Guild work for income | Adventurers' Guild hall, Alderwatch | 145/108 | 28.6 s |
| 112 | I take the Fen Adders contract slip from the Novice board and bring it to the clerk to accept it. | Erzähler | open_run_level | Accept the 140 cp fen adder contract | Adventurers' Guild hall, Alderwatch | 145/108 | 28.1 s |
| 113 | I head out of Alderwatch toward the bramble hummocks along the reed-cutters' corduroy path in Alderwatch Fen to hunt fen adders. | Erzähler | open_run_level | Travel to the fen adder hunting grounds for the active contract | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 145/108 | 41.1 s |
| 114 | I thank the reed-cutters and move toward the east brambles where the big adder went down, keeping low and watching the reeds for movement. | Erzähler | open_run_level | Hunt the fen adder for the active contract | east brambles where the big adder went down | 145/108 | 32.9 s |
| 115 | I close the distance slowly through the thin reeds, then strike with Piercing Thrust at the adder's exposed back before it can lift its head… | Erzähler | open_run_level | Ambush the big fen adder for the contract | east brambles where the big adder went down | 145/108 | 373.0 s |
| 116 | I close the remaining distance to reach ENGAGED range, then strike the adder with Piercing Thrust before it can lift its head. | Erzähler | open_run_level | Close to range and ambush the big fen adder | east brambles where the big adder went down | 145/108 | 66.4 s |
| 117 | I circle wide around the hummock's flank toward the tunnel mouth from the water side, moving carefully until I reach ENGAGED range with the … | Erzähler | open_run_level | Flank the adder to close to ENGAGED and attack | east brambles where the big adder went down | 145/108 | 19.4 s |
| 118 | I throw Fan of Blades at the adder from where I stand on the tussock. | Erzähler | open_run_level | Attack the adder at MEDIUM range with Fan of Blades | east brambles where the big adder went down | 145/108 | 21.1 s |
| 119 | I wade the seep noisily toward the adder, closing the distance to SHORT range, then strike it with Piercing Thrust. | Erzähler | open_run_level | Close to range by wading the seep and attack the adder | east brambles where the big adder went down | 145/108 | 29.2 s |
| 120 | I strike the adder's head with Piercing Thrust while it waits at the water's edge. | Erzähler | open_run_level | Attack the adder now at SHORT range | east brambles where the big adder went down | 145/108 | 16.1 s |
| 121 | I push the last step through the mud to reach ENGAGED range with the adder's head, then strike with Piercing Thrust. | Erzähler | open_run_level | Close from SHORT to ENGAGED and attack the adder | east brambles where the big adder went down | 145/108 | 24.1 s |
| 122 | #assign AGI 3 PER 2 | System (Befehl) | open_run_level | Spend level-up points on AGI and PER | east brambles where the big adder went down | 145/108 | 2.8 s |
| 123 | I check the quest tally, then head back along the reed-cutters' path toward the corduroy path to find the remaining adders. | Erzähler | open_run_level | Continue the adder-thinning contract | the corduroy road between the two tall hummocks | 145/108 | 34.6 s |
| 124 | I circle quietly around the hummock's flank to ambush the adder, then strike its head with Piercing Thrust. | Erzähler | open_run_level | Ambush Fen Adder G | the corduroy road between the two tall hummocks | 145/108 | 19.3 s |
| 125 | I strike the adder's head with Piercing Thrust from ambush. | Erzähler | open_run_level | Kill Fen Adder G with an ambush strike | the corduroy road between the two tall hummocks | 145/108 | 18.7 s |
| 126 | I continue north along the corduroy road, watching the brambles ahead for the next adder's den. | Erzähler | open_run_level | Continue the adder-thinning contract | adder den under the bramble skirt north along the corduroy road | 145/108 | 22.1 s |
| 127 | I move quietly around the thicket's edge to find a clear line on the den mouth, staying in cover. | Erzähler | open_run_level | Scout the den for a clear ambush angle | adder den under the bramble skirt north along the corduroy road | 145/108 | 27.0 s |
| 128 | I hold still and take an aimed Piercing Thrust at the adder's head through the gap in the canes. | Erzähler | open_run_level | Ambush-kill Fen Adder H from cover | adder den under the bramble skirt north along the corduroy road | 145/108 | 27.0 s |
| 129 | I close the ten paces of open mud quickly toward the den mouth, then thrust at the adder's head the moment I'm in reach. | Erzähler | open_run_level | Close to ENGAGED and kill Fen Adder H | adder den under the bramble skirt north along the corduroy road | 145/108 | 33.4 s |
| 130 | I withdraw quietly from the adder's den and head back along the corduroy road toward the path to hunt adders I can actually reach. | Erzähler | open_run_level | Abandon unreachable adder H for now and continue the contract elsewhere | adder den under the bramble skirt north along the corduroy road | 145/108 | 15.6 s |
| 131 | I move quietly back over the hummock skirt and follow the corduroy road south toward the path. | Erzähler | open_run_level | Withdraw from unreachable adder H and return to the path | the road bend where the reed-cutters' path breaks away | 145/108 | 30.5 s |
| 132 | I creep quietly along the logs toward the basking adder, downwind, and thrust at its head the moment I'm in reach. | Erzähler | open_run_level | Ambush-kill Fen Adder I on the road | the road bend where the reed-cutters' path breaks away | 145/108 | 16.1 s |
| 133 | I thrust my dagger at the adder's head from point-blank. | Engine (Menü/Rückfrage) | open_run_level | Kill Fen Adder I with a surprise Piercing Thrust | the road bend where the reed-cutters' path breaks away | 145/108 | 5.2 s |
| 134 | Piercing Thrust at the adder's head. | Erzähler | open_run_level | Kill Fen Adder I with Piercing Thrust | the road bend where the reed-cutters' path breaks away | 145/108 | 15.6 s |
| 135 | I step the one long stride along the logs to point-blank and Piercing Thrust at the adder's head. | Erzähler | open_run_level | Close the gap and kill Fen Adder I | the road bend where the reed-cutters' path breaks away | 145/108 | 16.1 s |
| 136 | I walk carefully along the logs until I am truly engaged with the adder, then Piercing Thrust at its head. | Erzähler | open_run_level | Close distance fully and kill Fen Adder I | the road bend where the reed-cutters' path breaks away | 145/108 | 17.6 s |
| 137 | I head back along the corduroy path toward the Guild hall to turn in the adder contract. | Erzähler | open_run_level | Return to Guild hall for turn-in | Adventurers' Guild hall, Alderwatch | 145/108 | 22.0 s |
| 138 | I pocket the slip and head back out the corduroy path to the fen hummocks to hunt the fourth adder. | Erzähler | open_run_level | Hunt the missing fourth adder to complete the contract tally | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 145/108 | 20.1 s |
| 139 | I circle wide around the hummock's flank toward the tunnel mouth, staying quiet, to find the adder at its den. | Erzähler | open_run_level | Hunt the fourth adder to complete the contract | tunnel mouth of the den hummock | 145/108 | 28.1 s |
| 140 | I strike at the adder's head at the tunnel mouth with Piercing Thrust. | Erzähler | open_run_level | Kill Fen Adder J to complete the contract | tunnel mouth of the den hummock | 145/108 | 19.2 s |
| 141 | I assign all 5 free stat points to AGI, then head back along the corduroy path to the Guild hall to turn in the adder contract. | Erzähler | open_run_level | Assign points and turn in completed contract | Adventurers' Guild hall, Alderwatch | 145/108 | 32.1 s |
| 142 | #assign AGI 5 PER 5 | System (Befehl) | open_run_level | Spend 10 free stat points on AGI and PER | Adventurers' Guild hall, Alderwatch | 145/108 | 2.9 s |
| 143 | I ask the clerk what novice contracts are on the board tonight. | Erzähler | open_run_level | Pick the next Guild contract | Adventurers' Guild hall, Alderwatch | 145/108 | 16.3 s |
| 144 | I ask the clerk to take the Cull the Millpond Wolf contract, then I equip my Starter Light Armor. | Erzähler | open_run_level | Accept the wolf contract and put on real armour | Adventurers' Guild hall, Alderwatch | 145/108 | 17.3 s |
| 145 | I sell the four fen adder fangs and three grey wolf fangs to Cordery the tanner down the lane, asking his prices. | Erzähler | open_run_level | Sell surplus loot before heading to the millpond | Cordery's on Buckle Street | 145/108 | 30.4 s |
| 146 | I sell all the fangs for the 54 copper you offered. If that's settled, I'll take the fine F-Rank dagger and the fine F-Rank light armor as w… | Erzähler | open_run_level | Sell fangs and buy weapon and armor upgrades from Cordery | Cordery's on Buckle Street | 145/108 | 18.5 s |
| 147 | I sell the old common dagger and the Starter Light Armor to Cordery if he'll buy them, then head south to the gristmill for the millpond wol… | Erzähler | open_run_level | Sell replaced gear surplus, then hunt the millpond wolf | the millpond and sluice of Marrow & Sons Gristmill | 145/108 | 33.6 s |
| 148 | I ask Harl how big the wolf is and whether it hunts alone, then circle the pond toward the reed bank on the far side to track it. | Erzähler | open_run_level | Hunt the millpond wolf | the far end of the millpond along the reed line | 145/108 | 30.3 s |
| 149 | I follow the pressed track into the reed bank quietly, hunting for the wolf's den. | Erzähler | open_run_level | Track the millpond wolf to its den | wolf den under the leaning willow in the reed bank | 145/108 | 25.3 s |
| 150 | I draw my dagger and use Piercing Thrust on the wolf blocking the den mouth. | Erzähler | open_run_level | Attack the millpond wolf | wolf den under the leaning willow in the reed bank | 145/108 | 17.6 s |
| 151 | I step into ENGAGED range and use Piercing Thrust on the wolf. | Erzähler | open_run_level | Close to range and attack the wolf | wolf den under the leaning willow in the reed bank | 145/108 | 17.0 s |
| 152 | I skin nothing here — the pelt and fangs are taken. I head back to the mill to tell Harl the wolf is dead, then turn the contract in at the … | Erzähler | open_run_level | Report kill and return for turn-in | Adventurers' Guild hall, Alderwatch | 145/108 | 35.4 s |
| 153 | I ask the clerk if any contracts suit a Novice rogue are posted, then head to an inn for a bed and sleep until morning. | Erzähler | open_run_level | Get lodging and recover overnight | The Lamplighter's Rest | 145/108 | 30.4 s |
| 154 | I take the bed for 10 copper and sleep until morning. | Erzähler | open_run_level | Buy lodging and recover overnight | The Lamplighter's Rest | 160/108 | 15.9 s |
| 155 | I buy the porridge for 2 copper, then head to the Guild hall and sign out the contract to clear Old Crown Catacombs, Level 1. | Erzähler | open_run_level | Eat, take the catacombs contract | Adventurers' Guild hall, Alderwatch | 160/108 | 21.3 s |
| 156 | I wait for fresh postings, and meanwhile head to Cordery's shop to sell my surplus fen adder skin and venom sac, and ask his prices on light… | Erzähler | open_run_level | Sell surplus and check gear with Cordery | Cordery's on Buckle Street | 160/108 | 42.9 s |
| 157 | I accept: both together for fourteen silver, and hand over the skin and the venom sac. | Erzähler | open_run_level | Sell surplus adder skin and venom sac at the confirmed offer | Cordery's on Buckle Street | 160/108 | 39.7 s |
| 158 | Cordery, give me your total price for exactly one fen adder skin and one fen adder venom sac together — name the sum and I'll take it. | Erzähler | open_run_level | Re-confirm the sale after the engine recorded no binding offer | Cordery's on Buckle Street | 160/108 | 18.9 s |
| 159 | Twelve silver for the pair, agreed. I lay the fen adder skin and the venom sac on the felt and take the twelve silver. | Erzähler | open_run_level | Accept the confirmed 12s total and sell both goods | Cordery's on Buckle Street | 160/108 | 38.7 s |
| 160 | Cordery, you've now bought from me twice — I'll take that superior jerkin for eighteen silver if the offer stands. | Erzähler | open_run_level | Buy the superior jerkin now that the two-sale condition may be met | Cordery's on Buckle Street | 160/108 | 51.1 s |
| 161 | I pay Cordery the eighteen silver for the superior jerkin and put it on, having him wrap my old fine light armor to carry. | Engine (Menü/Rückfrage) | open_run_level | Buy and equip the superior jerkin | Cordery's on Buckle Street | 160/108 | 9.7 s |
| 162 | I buy the superior F-Rank light armor jerkin from Cordery for a total of eighteen silver (180 copper), and equip it, having him wrap my old … | Engine (Menü/Rückfrage) | open_run_level | Clarify and complete the jerkin purchase | Cordery's on Buckle Street | 160/108 | 12.1 s |
| 163 | I buy the superior F-Rank jerkin at 180 cp, Cordery's confirmed price, and equip it. | Engine (Menü/Rückfrage) | open_run_level | Complete the jerkin purchase via the binding offer option | Cordery's on Buckle Street | 160/108 | 10.4 s |
| 164 | buy at 180 cp from Cordery | Engine (Menü/Rückfrage) | open_run_level | Confirm the catalog booking so the jerkin purchase completes | Cordery's on Buckle Street | 160/108 | 18.5 s |
| 165 | accept the jerkin deal at 180 cp | Engine (Menü/Rückfrage) | open_run_level | Accept Cordery's conditional terms so the jerkin purchase completes | Cordery's on Buckle Street | 160/108 | 10.3 s |
| 166 | accept the superior jerkin at 180 cp | Engine (Menü/Rückfrage) | open_run_level | Accept the booking option exactly as offered to complete the jerkin purchase | Cordery's on Buckle Street | 160/108 | 12.7 s |
| 167 | accept the superior jerkin at 72 cp | Engine (Menü/Rückfrage) | open_run_level | Accept Cordery's 72 cp offer to complete the jerkin purchase | Cordery's on Buckle Street | 160/108 | 7.6 s |
| 168 | Cordery, please make me a binding offer on the superior jerkin. | Erzähler | open_run_level | Get a binding offer to break the clarify loop | Cordery's on Buckle Street | 160/108 | 17.5 s |
| 169 | I accept Cordery's binding offer of 72 cp for the superior F-Rank jerkin, pay it, and equip the jerkin. | Erzähler | open_run_level | Complete the jerkin purchase at the confirmed 72 cp binding price | Cordery's on Buckle Street | 160/108 | 144.0 s |
| 170 | Cordery, before I go — would you buy these two fen adder skins, and what would you offer for them? | Erzähler | open_run_level | Sell surplus loot (adder skins) at Cordery's | Cordery's on Buckle Street | 160/108 | 61.6 s |
| 171 | I'll take the twenty copper for both skins. | Erzähler | open_run_level | Sell the two adder skins for the offered 20 cp | Cordery's on Buckle Street | 160/108 | 24.5 s |
| 172 | I leave Cordery's and head to the smithy on Buckle Street to compare light weapon upgrades. | Erzähler | open_run_level | Continue gear check at a weaponsmith | smithy | 160/108 | 159.6 s |
| 173 | The fine dagger matches my blade at ATK 14 and the superior one costs 260 copper — more than my 157. No useful affordable upgrade here, so I… | Erzähler | open_run_level | Skip unaffordable weapon upgrades, return to Guild work | Adventurers' Guild hall, Alderwatch | 160/108 | 46.0 s |
| 174 | I take the Clear the Adders from the Corduroy Path notice to the clerk and ask to have it registered as my active contract. | Erzähler | open_run_level | Accept the 4-adder hunt contract at the Guild | Adventurers' Guild hall, Alderwatch | 160/108 | 16.1 s |
| 175 | I leave the Guild hall through the east gate and head for the reed-cutters' corduroy path in Alderwatch Fen to hunt the four adders. | Erzähler | open_run_level | Travel to the contract site and hunt adders | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 160/108 | 25.2 s |
| 176 | I move cautiously along the log path to the fourth hummock and strike the adder at the den mouth with Piercing Thrust. | Erzähler | open_run_level | Hunt the contract adders, starting with the one at the fourth hummock | the fourth hummock and its den mouth | 160/108 | 33.4 s |
| 177 | I press the attack, thrusting again at the adder's head with Piercing Thrust. | Erzähler | open_run_level | Continue fighting Fen Adder K | the fourth hummock and its den mouth | 160/108 | 28.1 s |
| 178 | I move on along the corduroy path to the hummock north of the fallen bough and search its bramble skirt for the adder's den. | Erzähler | open_run_level | Hunt the second contract adder | hummock north of the fallen bough | 160/108 | 27.5 s |
| 179 | I search the bramble skirt of this hummock for the adder's den. | Erzähler | open_run_level | Search hummock north of fallen bough for second adder | hummock north of the fallen bough | 160/108 | 17.1 s |
| 180 | I give up on this hummock and move farther along the corduroy path to the next hummock out, searching there for an adder den. | Erzähler | open_run_level | Hunt the second contract adder on the next hummock | the big hummock with the leaning alder | 160/108 | 23.3 s |
| 181 | I approach the dark gap between the root buttresses and strike at the adder inside with Piercing Thrust. | Engine (Menü/Rückfrage) | open_run_level | Attack the second contract adder at its den | the big hummock with the leaning alder | 160/108 | 6.3 s |
| 182 | I prod the flattened fern at the den mouth with my dagger to draw the adder out into the open. | Erzähler | open_run_level | Flush the adder from its den so it becomes targetable | the big hummock with the leaning alder | 160/108 | 24.2 s |
| 183 | I strike at the adder with Piercing Thrust. | Erzähler | open_run_level | Attack Fen Adder L | the big hummock with the leaning alder | 160/108 | 19.2 s |
| 184 | I spend my free points on my reflexes and awareness: #assign AGI 3 PER 2 | Erzähler | open_run_level | Assign level-up stat points | the big hummock with the leaning alder | 160/108 | 14.4 s |
| 185 | I follow the corduroy path north toward where I heard the dry rustling, searching the reeds for the last adder. | Erzähler | open_run_level | Hunt the remaining contract adders | the dark hummock where the last adder lies | 160/108 | 28.4 s |
| 186 | I circle wide around the hummock's flank to reach the tunnel mouth, staying out of the adder's strike range. | Erzähler | open_run_level | Approach the last adder's den by the safe route | the dark hummock where the last adder lies | 160/108 | 27.0 s |
| 187 | I advance along the logs toward the adder's threshold and strike with Piercing Thrust as soon as I come within reach. | Erzähler | open_run_level | Attack the last adder | the dark hummock where the last adder lies | 160/108 | 18.5 s |
| 188 | I close the remaining distance along the flattened fern to the hummock mouth, keeping my thrust ready for the adder's head. | Erzähler | open_run_level | Move into ENGAGED range of Fen Adder M | the dark hummock where the last adder lies | 160/108 | 19.5 s |
| 189 | I step in to the hummock mouth and strike the adder's head with Piercing Thrust. | Erzähler | open_run_level | Close to ENGAGED and attack Fen Adder M | the dark hummock where the last adder lies | 160/108 | 16.5 s |
| 190 | I step right up to the adder within arm's reach and strike its head with Piercing Thrust. | Erzähler | open_run_level | Close to ENGAGED and attack Fen Adder M | the dark hummock where the last adder lies | 160/108 | 15.1 s |
| 191 | I head back to the Guild hall and hand in the completed adder slip to claim the 150 cp reward. | Erzähler | open_run_level | Turn in the completed adder contract at the Guild | Adventurers' Guild hall, Alderwatch | 160/108 | 54.7 s |
| 192 | I return along the corduroy path and search the bramble hummocks for the fourth adder, checking each den mouth as I go. | Erzähler | open_run_level | Find the adder the engine still counts alive | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 160/108 | 34.7 s |
| 193 | I move to the den under the fourth hummock and strike the adder waiting at the tunnel mouth with Piercing Thrust. | Erzähler | open_run_level | Attack the fourth adder at its den mouth | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 160/108 | 25.7 s |
| 194 | I circle wide around the hummock's flank toward the tunnel mouth by the den north of the fallen bough, dagger ready. | Erzähler | open_run_level | Approach the fourth adder's den via the flank | the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen | 160/108 | 28.2 s |
| 195 | I wade noisily through the black mud seep toward the adder's basking spot, dagger drawn. | Erzähler | open_run_level | Reach the fourth adder via the seep | the adder's basking shelf beyond the path-side hummocks | 160/108 | 32.7 s |
| 196 | I follow the drag-trail toward the parted reeds thirty paces off and strike the adder there with Piercing Thrust. | Erzähler | open_run_level | Engage and kill the fourth adder | the drain bank's foot where the fourth adder coils | 160/108 | 39.9 s |
| 197 | I strike the adder with Piercing Thrust, keeping my footing on the firm peat at the edge of its strike range. | Erzähler | open_run_level | Attack the fourth adder | the drain bank's foot where the fourth adder coils | 160/108 | 22.9 s |
| 198 | I close the ten paces to ENGAGED and strike the adder with Piercing Thrust. | Erzähler | open_run_level | Move into range and attack the fourth adder | the drain bank's foot where the fourth adder coils | 160/108 | 33.1 s |
| 199 | I charge straight across the open peat until I am ENGAGED with the adder, then strike with Piercing Thrust. | Erzähler | open_run_level | Close from LONG to ENGAGED and attack the fourth adder | the drain bank's foot where the fourth adder coils | 160/108 | 46.8 s |
| 200 | With the fourth adder down and the contract at 4/4, I head back to the Guild hall in Alderwatch to turn in Clear the Adders from the Corduro… | Erzähler | open_run_level | Turn in the adder contract at the Guild | Adventurers' Guild hall, Alderwatch | 160/108 | 33.7 s |
| 201 | #assign AGI 5 PER 5 | System (Befehl) | open_run_level | Spend the 10 free stat points | Adventurers' Guild hall, Alderwatch | 160/108 | 3.2 s |
| 202 | I ask the clerk what contracts are on the board for a Novice. | Erzähler | open_run_level | Pick the next Guild contract | Adventurers' Guild hall, Alderwatch | 160/108 | 36.3 s |
| 203 | I take the Millpond Wolf slip from the board and tell the clerk I'm accepting Cull the Millpond Wolf. | Erzähler | open_run_level | Accept the wolf contract | Adventurers' Guild hall, Alderwatch | 160/108 | 39.7 s |
| 204 | I head out the Guild hall and take the river road toward Marrow & Sons Gristmill, watching for the wolf as dusk settles. | Erzähler | open_run_level | Travel to the millpond to hunt the contract wolf at dusk | the millpond and sluice of Marrow & Sons Gristmill | 160/108 | 38.8 s |
| 205 | I ask Harl where the wolf crosses the fence into the reeds, then take position near the weir baskets to wait for it. | Erzähler | open_run_level | Ambush the millpond wolf at the weirs | the weir baskets under the sluice walk's end | 160/108 | 70.5 s |
| 206 | I hold still in the rail's shadow until the wolf commits toward the baskets, then lunge from hiding and drive a Piercing Thrust into its fla… | Erzähler | open_run_level | Ambush the millpond wolf from concealment | the weir baskets under the sluice walk's end | 160/108 | 36.6 s |
| 207 | I strike from the shadows, driving a Piercing Thrust into the wolf's flank as it passes within reach. | Erzähler | open_run_level | Attack the millpond wolf from stealth | the weir baskets under the sluice walk's end | 160/108 | 21.2 s |
| 208 | I step out of the shadow and close the ten paces, driving a Piercing Thrust into the wolf's flank while it's busy with the fish. | Erzähler | open_run_level | Engage and attack the millpond wolf | the weir baskets under the sluice walk's end | 160/108 | 64.4 s |
| 209 | I pull the dagger free and call back to Harl, "Done — the wolf's dead. Contract's filled." | Erzähler | open_run_level | Confirm the kill to Harl and end the contract hunt | the weir baskets under the sluice walk's end | 160/108 | 63.2 s |
| 210 | I follow Harl up to the mill for bread and beer, and tell him I'll take the Guild slip in the morning. | Erzähler | open_run_level | Accept Harl's offer, rest overnight, turn in contract tomorrow | the mill of Marrow & Sons Gristmill | 160/108 | 188.1 s |
| 211 | I tell Marrow the truth: it came out of the reeds at dusk to fish the weir baskets, and I found only one — but I'll ask the Guild to keep th… | Erzähler | open_run_level | Answer Marrow honestly and hedge on a second wolf | the mill of Marrow & Sons Gristmill | 160/108 | 38.2 s |
| 212 | I thank Marrow, climb up to the loft, and sleep until morning. | Erzähler | open_run_level | Recover overnight in the mill loft | the mill yard in the morning | 160/108 | 87.6 s |
| 213 | I turn to Tam. "Go on then — what did you want to tell me?" | Erzähler | open_run_level | Hear Tam out before leaving the mill | the mill yard in the morning | 160/108 | 31.5 s |
| 214 | I thank Tam and ask him to show me the boundary stone spot, then take the Guild slip from Harl to turn in the first wolf. | Erzähler | open_run_level | Accept Tam's offer and collect the contract slip for turn-in | the mill yard in the morning | 160/108 | 74.3 s |
| 215 | I take the slip, thank Bess for the bundle, and set off down the lane toward the Guild branch in town to turn in the contract. | Erzähler | open_run_level | Travel to the Guild branch and turn in the wolf contract for 40 copper | Adventurers' Guild hall, Alderwatch | 160/108 | 67.3 s |
| 216 | "Not yet — there are tracks and a witness, but no kill. I'll keep watching evenings. Meanwhile, what's on the contract board for a Novice Ro… | Erzähler | open_run_level | Answer the clerk, then browse new Guild contracts | Adventurers' Guild hall, Alderwatch | 160/108 | 100.9 s |
| 217 | I take out the Primer of Guard I'm carrying and ask the clerk: "This primer — can you teach me the guard skill from it?" | Erzähler | open_run_level | Learn guard from the held primer | Adventurers' Guild hall, Alderwatch | 160/108 | 66.9 s |
| 218 | I head through the side door to the training yard and ask Serah if she has a slot today to put me through the Primer of Guard. | Erzähler | open_run_level | Learn guard via training yard drill | training yard | 160/108 | 128.4 s |
| 219 | #skills | System (Befehl) | open_run_level | Check how the Guard primer can be learned after the training-yard route was refused | training yard | 160/108 | 3.3 s |
| 220 | I sit at the fence rail and wait for the trainees to finish, then step up for my drill slot with Serah, paying the two silver. | Erzähler | open_run_level | Take Serah's slot to learn Guard | training yard | 160/108 | 110.7 s |
| 221 | I place two silver in Serah's palm. "The Guard primer drill — that's what I want from this slot." | Engine (Menü/Rückfrage) | open_run_level | Pay Serah and take the Guard primer drill | training yard | 160/108 | 29.2 s |
| 222 | I study the Guard primer drill with Serah for two hours. | Erzähler | open_run_level | Book the Guard primer drill with a duration | training yard | 160/108 | 68.2 s |
| 223 | I book a training slot with Serah: one hour drilling Guard with a stave in hand, and ask what it costs. | Erzähler | open_run_level | Book the Guard stave-drill slot Serah described | training yard | 160/108 | 71.2 s |
| 224 | #skills | System (Befehl) | open_run_level | Check Guard skill learning progress after Serah was refused as teacher | training yard | 160/108 | 3.2 s |
| 225 | I sit on the fence rail and read the Primer of Guard cover to cover. | Engine (Menü/Rückfrage) | open_run_level | Progress guard learning via the primer, since Serah's slot is engine-refused | training yard | 160/108 | 15.5 s |
| 226 | I sit on the fence rail and read the Primer of Guard cover to cover for two hours. | Erzähler | open_run_level | Study the primer with a stated duration | training yard | 160/108 | 70.2 s |
| 227 | I walk over to Serah. "Book me that paid slot now — one hour, Guard, stave in hand." I hold out the silver. | Erzähler | open_run_level | Book Serah's Guard training slot explicitly as she requires | training yard | 160/108 | 33.2 s |
| 228 | I hand Serah exactly two silver, pick a stave from the rack, and set my feet the way the primer showed. | Erzähler | open_run_level | Pay Serah's two-silver price and begin the Guard slot | training yard | 160/108 | 132.3 s |
| 229 | I hold out two silver to Serah. "Paid. Start the hour." | Erzähler | open_run_level | Book Serah's Guard training slot with plain wording, separating payment from stance | training yard | 160/108 | 86.8 s |
| 230 | #skills | System (Befehl) | open_run_level | Check whether the paid Guard hour recorded skill progress | training yard | 160/108 | 3.3 s |
| 231 | I return the stave to the rack and head to Cordery's shop to see his weapons and light armour. | Erzähler | open_run_level | Pursue gear priority at Cordery's shop | Cordery's on Buckle Street | 160/108 | 113.3 s |
| 232 | I lay out my surplus loot — the two fen adder fangs, the adder skin, and the rest of my carried pelts and hides — and ask Cordery what he'll… | Erzähler | open_run_level | Sell surplus loot to Cordery | Cordery's on Buckle Street | 160/108 | 267.1 s |
| 233 | "Done — twelve silver four for the lot, bag it up." I count the sale alongside my coin and check whether nothing here beats my equipped gear… | Engine (Menü/Rückfrage) | open_run_level | Sell surplus loot and leave shop | Cordery's on Buckle Street | 160/108 | 9.4 s |
| 234 | I sell the adder skins, fangs, venom sacs, wolf pelts and wolf fangs to Cordery for his offered total of twelve silver four copper. | Erzähler | open_run_level | Confirm the loot sale to Cordery | Cordery's on Buckle Street | 160/108 | 34.1 s |
| 235 | I head back to the Guild hall and check the contract board for another job. | Erzähler | open_run_level | Find a new Guild contract | Adventurers' Guild hall, Alderwatch | 160/108 | 70.3 s |
| 236 | I take the Sablewood boar contract slip to the clerk and ask her to register it as my active contract. | Erzähler | open_run_level | Accept the 300 cp boar cull contract | Adventurers' Guild hall, Alderwatch | 160/108 | 59.5 s |
| 237 | I buy the Primer of Guard for 80 copper at the Guild counter, then head east across the stone bridge toward the Sablewood charcoal camps. | Erzähler | open_run_level | Buy Guard primer and travel for the boar contract | the Sablewood east of the river, around the charcoal camps | 160/108 | 78.5 s |
| 238 | "Yes, Guild — for the boar work. Anything you can tell me about where they've been ranging lately?" | Erzähler | open_run_level | Talk to the charcoal burner about boar signs | the Sablewood east of the river, around the charcoal camps | 160/108 | 42.7 s |
| 239 | "I'll take the stew, Dag — one copper. Then I'll head for the wallow before dusk and sit for them." | Erzähler | open_run_level | Buy a meal and start the boar hunt at the wallow | the wallow by the north camp | 160/108 | 125.9 s |
| 240 | I stay hidden behind the fallen oak, watching the wallow quietly for the boars' arrival. | Erzähler | open_run_level | Ambush the boars at the wallow | the wallow by the north camp | 160/108 | 64.0 s |
| 241 | I burst from cover and use Piercing Thrust on the closer boar rooting in the wallow. | Engine (Menü/Rückfrage) | open_run_level | Attack the nearest boar | the wallow by the north camp | 160/108 | 13.6 s |
| 242 | I burst from cover and use Piercing Thrust on Sablewood Boar A, the closer one rooting in the wallow. | Erzähler | open_run_level | Attack the nearer boar | the wallow by the north camp | 160/108 | 141.0 s |
| 243 | I charge across the mud toward Sablewood Boar A and use Piercing Thrust as soon as I reach it. | Erzähler | open_run_level | Close to ENGAGED range and attack Boar A | the wallow by the north camp | 132/108 | 30.0 s |
| 244 | I finish the wounded boar with a Basic Attack on Sablewood Boar A. | Erzähler | open_run_level | Kill Boar A while it is badly hurt | the wallow by the north camp | 132/108 | 552.8 s |
| 245 | I drag the boar hide and tusks free of the mud, then pull back from the wallow toward the charcoal camp before anything else comes. | Erzähler | open_run_level | Loot the kill and withdraw to safety | the north charcoal camp | 132/108 | 128.9 s |
| 246 | I check the camp shelter carefully for anyone or anything inside, then bandage my torn hip and rest there until morning. | Erzähler | open_run_level | Recover overnight at the camp before hunting the remaining boars | the north charcoal camp | 175/108 | 127.6 s |
| 247 | #assign AGI 5 | System (Befehl) | open_run_level | Spend free stat points on AGI | the north charcoal camp | 175/108 | 3.5 s |
| 248 | I hunt the remaining boars at the seep by the camp, starting with the smaller ones away from the wallow's edge. | Erzähler | open_run_level | Continue the boar cull contract | the seep by the north camp | 175/108 | 71.6 s |
| 249 | I charge the smallest boar (Boar D) and use Fan of Blades as I reach it, staying clear of the yearling. | Erzähler | open_run_level | Attack the piglet with AoE away from the yearling | the seep by the north camp | 175/108 | 67.1 s |
| 250 | I sprint across the open ground to close on Boar D, then use Fan of Blades once it is in SHORT range. | Erzähler | open_run_level | Close distance and attack the piglet | the seep by the north camp | 175/108 | 60.2 s |
| 251 | I withdraw from the open seep and circle through the timber to get ahead of the fleeing boars' trail, then wait in cover for one to come wit… | Erzähler | open_run_level | Ambush the fleeing boars from cover | the boar run below the seep | 175/108 | 53.7 s |
| 252 | I slip into the dense brush beside the trail and wait in cover for the boars to come up the run. | Erzähler | open_run_level | Ambush boars from cover at the run | the boar run below the seep | 175/108 | 95.3 s |
| 253 | I use Fan of Blades on Boar D at SHORT range, keeping clear of the yearling. | Erzähler | open_run_level | Attack the piglet now in range | the boar run below the seep | 153/108 | 42.7 s |
| 254 | I use Piercing Thrust on Sablewood Boar F. | Erzähler | open_run_level | Finish the wounded yearling | the boar run below the seep | 153/108 | 50.7 s |
| 255 | I bandage the wound on my leg, then walk back to the charcoal camps and head for the Guild hall to turn in the boar cull contract. | Erzähler | open_run_level | Recover, then turn in the completed cull contract | the boar run below the seep | 153/108 | 48.8 s |
| 256 | I follow the run back the way I came, up toward the charcoal camps. | Erzähler | open_run_level | Travel back to the camps to turn in the cull contract | the north charcoal camp | 153/108 | 65.2 s |
| 257 | I head from the north charcoal camp down to the river crossing and on to the Guild hall in Crownheart, to turn in the boar cull contract. | Erzähler | open_run_level | Travel to Crownheart Guild hall and turn in the cull contract | Adventurers' Guild hall, Crownheart | 153/108 | 92.7 s |
| 258 | I leave the Guild hall and head back toward the charcoal camps to hunt the two remaining Sablewood boars. | Erzähler | open_run_level | Hunt two more boars to complete the cull count | the Sablewood east of the river, around the charcoal camps | 153/108 | 30.1 s |
| 259 | I sit, take the tea, and ask Dag where exactly north of the seep the big boars root, and whether he's seen them today. | Erzähler | open_run_level | Gather boar locations from Dag before hunting | the Sablewood east of the river, around the charcoal camps | 153/108 | 21.7 s |
| 260 | I finish the tea, thank Dag, and head north past the seep, giving the deadfall a wide berth until I reach the storm-flat where the oaks came… | Erzähler | open_run_level | Hunt the two remaining Sablewood boars at the storm-flat | the Sablewood east of the river, around the charcoal camps | 153/108 | 27.9 s |
| 261 | I take Dag's advice: I stay at the camp, treat the leg with the fen salve and a fresh bandage, and rest until the evening root before going … | Erzähler | open_run_level | Wait for evening and recover HP before hunting the last two boars | the Sablewood east of the river, around the charcoal camps | 175/108 | 33.6 s |
| 262 | I set out north past the seep toward the storm-flat in the dusk, listening for the boars and staying downwind. | Erzähler | open_run_level | Hunt the last two boars at the evening root | the Sablewood east of the river, around the charcoal camps | 175/108 | 38.9 s |
| 263 | I walk north from the camp toward the sound of the rooting boars, keeping downwind. | Erzähler | open_run_level | Hunt the two remaining boars | the storm-felled oak flat north of the seep | 175/108 | 39.2 s |
| 264 | I stay downwind in the brush and strike the lean yearling with Piercing Thrust before the others notice me. | Erzähler | open_run_level | Ambush the weakest boar to begin the last two kills | the storm-felled oak flat north of the seep | 175/108 | 30.3 s |
| 265 | I creep low across the open ground toward the yearling, staying downwind; if I reach it unseen, I strike it with Piercing Thrust. | Erzähler | open_run_level | Close to melee range and ambush the yearling | the storm-felled oak flat north of the seep | 175/108 | 32.4 s |
| 266 | I drive Piercing Thrust into the yearling's flank from behind. | Erzähler | open_run_level | Kill the yearling boar at melee range | the storm-felled oak flat north of the seep | 175/108 | 23.2 s |
| 267 | I hold low behind the yearling's carcass and let the sow come; when she is within a pace, I drive Piercing Thrust into her from behind. | Erzähler | open_run_level | Ambush the sow as she approaches the kill | the storm-felled oak flat north of the seep | 175/108 | 23.2 s |
| 268 | I step forward the last pace beside the carcass and drive Piercing Thrust into the sow's flank. | Erzähler | open_run_level | Kill the sow now that she is ENGAGED | the storm-felled oak flat north of the seep | 175/108 | 27.5 s |
| 269 | #assign AGI 5 | System (Befehl) | open_run_level | Spend level-up points on AGI | the storm-felled oak flat north of the seep | 175/108 | 3.3 s |
| 270 | I follow the big boar's trail into the treeline while the light lasts, moving quietly; if the track goes cold or the boar proves too dangero… | Erzähler | open_run_level | Hunt the fourth boar before dark, cautiously | the dark hollow wallow in the treeline | 175/108 | 30.0 s |
| 271 | I use the stream noise and the mud-smell to close on the wallowing boar unseen, staying downwind; if I reach it without being noticed, I dri… | Erzähler | open_run_level | Ambush the fourth boar at the wallow | the dark hollow wallow in the treeline | 175/108 | 31.8 s |
| 272 | I sidestep behind the stream bank to break its charge, then drive Piercing Thrust into the boar as it turns. | Erzähler | open_run_level | Fight the fourth boar defensively in the dark | the dark hollow wallow in the treeline | 175/108 | 20.8 s |
| 273 | I dress my wound with the bandaging roll, then head back toward the charcoal camp to sleep until morning. | Erzähler | open_run_level | Recover and return with the 4/4 boars for the contract | the dark hollow wallow in the treeline | 175/108 | 26.6 s |
| 274 | I walk back through the treeline toward the abandoned charcoal camp, following the stream's sound until I reach it; if I arrive safely, I se… | Erzähler | open_run_level | Return to the charcoal camp and sleep | the north charcoal camp | 175/108 | 21.9 s |
| 275 | I settle in the lean-to out of the wind and sleep until morning. | Erzähler | open_run_level | Sleep at the charcoal camp until dawn | the north charcoal camp | 180/108 | 18.1 s |
| 276 | I walk back to Rooksford and head for the Guild hall to turn in the completed boar contract. | Erzähler | open_run_level | Turn in 4/4 boar contract at the Guild | Guild hall, Rooksford, Rooksford | 180/108 | 22.8 s |
| 277 | #assign AGI 2 PER 2 INT 1 | System (Befehl) | open_run_level | Spend the 5 free stat points | Guild hall, Rooksford, Rooksford | 180/108 | 3.6 s |
| 278 | I head to the smith's workshop to compare light daggers and light armour against my current gear, and ask whether he buys surplus weapons an… | Erzähler | open_run_level | Gear check and sell surplus at the smith | Smith's workshop | 180/108 | 37.3 s |
| 279 | I'll take the superior F-Rank dagger for 260 copper — that's my consent and my total limit. I also want to sell my surplus: a common F-Rank … | Erzähler | open_run_level | Buy the superior dagger upgrade and sell surplus gear | Smith's workshop | 180/108 | 27.9 s |
| 280 | I accept the smith's offer and hand over all three pieces for 50 copper, then unwrap the new superior dagger and equip it. | Erzähler | open_run_level | Sell surplus and equip the new dagger | Smith's workshop | 180/108 | 17.7 s |
| 281 | #class | System (Befehl) | class_accepted | Inspect the offered E classes to choose one | Smith's workshop | 180/108 | 3.6 s |
| 282 | I choose Bloodhound Rogue as my class. | – | class_accepted | Accept the E-class evolution | Smith's workshop | 180/108 | 13.8 s **chat persistence failed** |

**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):

- zu Zug 27 (notiert vor Zug 28): HUD shows Free Stat Points 15 despite the narrator confirming the #assign; checking.
- zu Zug 28 (notiert vor Zug 29): Narrator confirmed the assign earlier but System status still shows 15 free points; retrying the command.
- zu Zug 29 (notiert vor Zug 30): Assign finally registered on second #assign attempt (narrator confirmed first, System did not). HP still 43/110 — recovering before finishing the 3/5 cull.
- zu Zug 34 (notiert vor Zug 35): Engine refused the five-copper deal once ('no valid canonical offer') while the narrator showed it as paid; coin 98→93 in narration but HUD still shows 9s8c. Retrying the purchase explicitly.
- zu Zug 35 (notiert vor Zug 36): Engine keeps splitting multi-item purchases; salve+roll booked at 4 cp, second pot still open at 1 cp. HUD HP 43/135 — max HP rose from 110 to 135 unexplained.
- zu Zug 37 (notiert vor Zug 38): Dagger upgrade (80+ cp) would nearly empty the 93 cp purse; buying jerkin first, dagger later after turn-in pay.
- zu Zug 38 (notiert vor Zug 39): Jerkin purchased (-48 cp) but HUD still shows Starter Light Armor equipped; dagger upgrade deferred until more coin.
- zu Zug 39 (notiert vor Zug 40): Jerkin now equipped (DEF 6 vs 5 before); dagger upgrade still pending, coin 45 cp.
- zu Zug 40 (notiert vor Zug 41): HUD still lists location as market row and merchants present despite travel narration; treat travel as unconfirmed until a System result places me in the fen.
- zu Zug 41 (notiert vor Zug 42): Engine scene shows only Adder D present; the heavy reed-pusher is narrated but not yet a System target.
- zu Zug 45 (notiert vor Zug 46): Purchase of room succeeded but the combined food offer was rejected as not bound; innkeeper named prices separately (soup 3 cp, porridge 2 cp).
- zu Zug 49 (notiert vor Zug 50): Adder turn-in requires all 5; partial not accepted.
- zu Zug 67 (notiert vor Zug 68): Bag shows no wolf pelt despite the tanner's standing offer covering it; a brokered wolf pelt may already be recorded elsewhere.
- zu Zug 68 (notiert vor Zug 69): Bag shows only one adder skin and no wolf pelt; the twelve-silver three-item deal is impossible until the pelt is recovered.
- zu Zug 70 (notiert vor Zug 71): The tanner's price for one skin dropped from 2.5 to 2 silver; her offers keep shifting, so I confirm the exact total as I accept.
- zu Zug 71 (notiert vor Zug 72): HUD lists adder fangs and skins twice, suggesting duplicates; bag still shows no wolf pelt despite the broker reminder.
- zu Zug 72 (notiert vor Zug 73): HUD shows one fen adder skin still carried though engine says all were sold; adder fangs listed twice. Clerk keeps expecting a brokered adder skin despite sales.
- zu Zug 74 (notiert vor Zug 75): Only 116 cp total, so fine dagger (140) is out of reach; armor options are no upgrade over my common jerkin at equal rank.
- zu Zug 76 (notiert vor Zug 77): The System twice refused the purchase with a generic clarify prompt despite explicit wording; rephrasing with the word 'buy' first.
- zu Zug 77 (notiert vor Zug 78): HUD coin shows 3 Silver 6 Copper after the 80cp purchase — consistent only if 116cp was actually 1s36cp, i.e. silver+copper mixed display; watch for coin inconsistencies.
- zu Zug 80 (notiert vor Zug 81): HUD coin display flips between '46 copper' engine result and '4 Silver 6 Copper' — mixed silver/copper display confirmed.
- zu Zug 84 (notiert vor Zug 85): Engine refused sale since no binding total was named; Wren retracted the offer anyway (no demand for Marta's extract). Gear check already done and unchanged.
- zu Zug 88 (notiert vor Zug 89): Engine confirms I hold neither the adder skin nor the wolf pelt — both apparently already left my hands earlier; the tanner's inspection scene contradicted the HUD inventory.
- zu Zug 91 (notiert vor Zug 92): Engine earlier confirmed I hold neither adder skins nor pelts, yet HUD still lists fangs ×2 twice — possible inventory display contradiction.
- zu Zug 94 (notiert vor Zug 95): Engine booked the stew as NOT BOUGHT though narration showed it paid and eaten; coin unchanged at 44 cp — treating the meal as a minor display contradiction and moving on.
- zu Zug 96 (notiert vor Zug 97): Narrator quoted 20/14 silver for armour, engine priced both at 48 cp — display contradiction; my 44 cp can't cover either engine price anyway.
- zu Zug 99 (notiert vor Zug 100): Narrator described the thrust landing, but engine shows wolf still at 23/23 — attack not yet resolved in combat rounds.
- zu Zug 109 (notiert vor Zug 110): Only 58 cp on hand, so the 19 s trade is unaffordable; gear goal remains open until income allows it.
- zu Zug 110 (notiert vor Zug 111): Gear check done: common leathers no better than equipped, fine armor 56 cp unaffordable with 20 cp reserve. Recheck only with new income.
- zu Zug 119 (notiert vor Zug 120): HUD now shows the adder at SHORT after wading; earlier range refusals were resolved by the movement.
- zu Zug 122 (notiert vor Zug 123): Quest panel still shows 1/4 despite the big adder's defeat; will verify count on the quest panel before turning in.
- zu Zug 128 (notiert vor Zug 129): Piercing Thrust failed at SHORT range; must close distance first.
- zu Zug 129 (notiert vor Zug 130): Adder H's den sits across black water/mud flats; direct approach blocked, circling gave only SHORT range — MEDIUM/SHORT mismatch made two attacks impossible. Noted as persistently blocked target; will try other adders.
- zu Zug 135 (notiert vor Zug 136): HUD lists the adder at SHORT while the engine treated it as LONG; range display may lag behind narration.
- zu Zug 136 (notiert vor Zug 137): Quest tally shows 3/4 despite engine confirming four adders defeated; loot shows duplicate Fang ×2 stacks.
- zu Zug 145 (notiert vor Zug 146): Cordery's shop also stocks gear; the earlier 'arrival pending' refusals cleared once travel completed.
- zu Zug 155 (notiert vor Zug 156): Catacombs contract expired at dawn before signing; board renews midday. Coin 89 cp is below the 100 cp gear-shopping threshold, so selling surplus first.
- zu Zug 156 (notiert vor Zug 157): No useful gear upgrades: equipped fine dagger and fine light armor already match his fine stock; superior jerkin is conditional on two purchases.
- zu Zug 157 (notiert vor Zug 158): Narrator showed the sale completed with 14 silver handed over, but the engine recorded PRICE OPEN, nothing sold, coin unchanged at 8s9cp — trusting the System and redoing the offer.
- zu Zug 158 (notiert vor Zug 159): Engine keeps recording PRICE OPEN until I echo the exact total; narrator showed coin but HUD still 8s9cp, so sale still unconfirmed.
- zu Zug 159 (notiert vor Zug 160): Sale finally confirmed at 209 cp. Superior jerkin was 'conditional: sold to twice' — Cordery says four skins and two sacs sold, so condition may now be met; jerkin price quoted 18 silver earlier but panel said 72 cp.
- zu Zug 160 (notiert vor Zug 161): HUD shows a common jerkin already carried and 209 cp coin; awaiting engine confirmation of purchase before equipping.
- zu Zug 161 (notiert vor Zug 162): System demanded explicit buy/sell clarification before any transaction; nothing had changed hands.
- zu Zug 163 (notiert vor Zug 164): System requires explicit booking of non-catalog prices; selecting the buy option verbatim.
- zu Zug 164 (notiert vor Zug 165): System keeps requiring one more booking step; nothing spent yet after three clarify prompts.
- zu Zug 165 (notiert vor Zug 166): Clarify loop: each acceptance spawns a new reworded booking prompt; nothing spent after four attempts. Trying the latest verbatim option.
- zu Zug 166 (notiert vor Zug 167): System now quotes the binding price as 72 cp, not 180; price has shifted across clarify prompts.
- zu Zug 167 (notiert vor Zug 168): Clarify loop persists; System says Cordery must make a binding offer first, so I ask him for one directly.
- zu Zug 168 (notiert vor Zug 169): Engine confirms 72 cp as binding price; narrator's spoken price (18 silver) contradicts it. Trusting the engine price.
- zu Zug 169 (notiert vor Zug 170): Jerkin purchase finally completed at engine-confirmed 72 cp and equipped; narrator had quoted 18 silver but engine price was binding.
- zu Zug 171 (notiert vor Zug 172): HUD still lists one Fen Adder Skin carried despite the engine confirming both were sold; noting the contradiction.
- zu Zug 172 (notiert vor Zug 173): Smith's spoken prices (14/18/22 copper) contradict engine binding prices (140/260/480 cp); engine wins. Fine dagger offers no ATK gain, so nothing worth buying.
- zu Zug 184 (notiert vor Zug 185): HUD shows the quest at 2/4 defeated though the narrator said four dens emptied — engine result takes precedence; keep hunting.
- zu Zug 186 (notiert vor Zug 187): Flanking is impossible: the hummock is ringed by water; frontal approach is the only route.
- zu Zug 187 (notiert vor Zug 188): Engine requires explicitly declared movement to reach LONG-range targets; Piercing Thrust alone is refused.
- zu Zug 189 (notiert vor Zug 190): HUD 'Present' already lists Fen Adder M as ENGAGED while the engine still treats it as MEDIUM; trusting the engine's refusal.
- zu Zug 190 (notiert vor Zug 191): Engine says 4/4 defeated and slip READY despite HUD quest line still reading 3/4.
- zu Zug 191 (notiert vor Zug 192): Contradiction: previous ENGINE RESULT counted Fen Adder M defeated (4/4, slip READY), yet the turn-in was refused with the count at 3/4. Returning to the fen to verify.
- zu Zug 197 (notiert vor Zug 198): Engine refused Piercing Thrust at LONG range; must close to ENGAGED first.
- zu Zug 198 (notiert vor Zug 199): Engine ranges conflict: HUD lists the adder at SHORT while both refusals call it LONG; narrator first described ten paces, then 'farther than a thrust could ever carry'.
- zu Zug 199 (notiert vor Zug 200): Adder contract complete 4/4; ranges resolved once I declared a charge.
- zu Zug 215 (notiert vor Zug 216): Engine confirms 40 copper paid and contract closed; Guild sells skill primers (strike, bolt, guard, ward, mend) at 80 cp each — worth checking against current skills.
- zu Zug 218 (notiert vor Zug 219): Contradiction: engine says Serah lacks established combat teaching discipline, though she is narrated as a Veteran running Novice drills; her offer was not booked. Checking skill panel for a valid learning route.
- zu Zug 219 (notiert vor Zug 220): Contradiction: #skills shows 'learn.1: guard 20/100 LP' already in progress, though the engine refused the lesson booking.
- zu Zug 222 (notiert vor Zug 223): Engine refused 'no teacher' while Serah narrates offering exactly this slot; also #skills earlier showed guard 20/100 LP already in progress.
- zu Zug 223 (notiert vor Zug 224): Engine twice refused Serah as Guard teacher despite narrated offer and price; #skills earlier showed guard 20/100 LP already in progress.
- zu Zug 228 (notiert vor Zug 229): Engine refused Guard training three times as 'no teacher' while Serah narrates the exact offer; guard already at 40/100 LP via primer. One last plain attempt, then I move on.
- zu Zug 229 (notiert vor Zug 230): Engine refused 'no teacher' three times, but this plain 'Paid. Start the hour.' wording got the full narrated session; she returned the two silver.
- zu Zug 230 (notiert vor Zug 231): Serah's paid hour was fully narrated but #skills shows no Guard progress (still 40/100 via primer) and she returned the two silver — training seems engine-blocked despite narration.
- zu Zug 231 (notiert vor Zug 232): Nothing in Cordery's stock beats my equipped gear (superior jerkin already +0/+0 vs superior light armor; no bow skill), so no purchase is useful here.
- zu Zug 233 (notiert vor Zug 234): System asked for a plain clarify of the sale; restating it exactly as narrated.
- zu Zug 237 (notiert vor Zug 238): Purchased Primer of Guard for 80 cp; coin 391 cp. Arrived at the charcoal camps, contract 0/4 boars.
- zu Zug 252 (notiert vor Zug 253): HUD shows all three piglets at SHORT on the run; yearling not listed as present.
- zu Zug 255 (notiert vor Zug 256): HUD quest still reads 2/4 defeated despite the engine confirming three boars defeated and the cull count met; check the quest panel at turn-in.
- zu Zug 257 (notiert vor Zug 258): Turn-in refused: engine counts only 2/4 boars despite earlier kills; the yearling and third piglet apparently were not Sablewood adults or not counted.
- zu Zug 260 (notiert vor Zug 261): Engine refused the storm-flat trip as invalid scope; Dag's warning plus the wound make waiting the sensible route.
- zu Zug 262 (notiert vor Zug 263): Repeated 'go: invalid local habitat scope' refusals for the storm-flat; trying simpler phrasing without the destination name.
- zu Zug 273 (notiert vor Zug 274): Refusal was scope wording; 4/4 boars done, need rest and turn-in.
- zu Zug 278 (notiert vor Zug 279): Level 15 reached; E-class offers are pending at the smith scene. Superior armor offers no DEF/MDEF gain over my equipped jerkin, so I skip it.

## Kämpfe

| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |
|---|---:|---:|---|---|---:|---|
| enc.t8 | 8 | 1 | – | nein | 1 | gewonnen, 75 XP |
| enc.t17 | 18 | 2 | – | nein | 2 | gewonnen, 480 XP |
| enc.t23 | 25 | 1 | – | nein | 1 | gewonnen, 435 XP |
| enc.t48 | 53 | 1 | – | nein | 1 | gewonnen, 300 XP |
| enc.t53 | 58 | 1 | – | nein | 1 | gewonnen, 295 XP |
| enc.t86r | 99 | 1 | – | nein | 1 | gewonnen, 60 XP |
| enc.t108 | 121 | 1 | – | nein | 1 | gewonnen, 295 XP |
| enc.t111 | 125 | 1 | – | ja | 1 | gewonnen, 420 XP |
| enc.t121 | 136 | 1 | – | ja | 1 | gewonnen, 300 XP |
| enc.t125 | 140 | 1 | – | nein | 1 | gewonnen, 295 XP |
| enc.t135 | 151 | 1 | – | nein | 1 | gewonnen, 60 XP |
| enc.t154 | 177 | 1 | – | nein | 1 | gewonnen, 420 XP |
| enc.t159 | 183 | 1 | – | nein | 1 | gewonnen, 420 XP |
| enc.t166 | 190 | 1 | – | nein | 1 | gewonnen, 240 XP |
| enc.t175 | 199 | 1 | – | nein | 1 | gewonnen, 435 XP |
| enc.t183 | 208 | 1 | – | ja | 1 | gewonnen, 60 XP |
| enc.t211 | 243 | 1 | – | ja | 1 | gewonnen, 630 XP |
| enc.t220 | 253 | 3 | – | ja | 3 | gewonnen, 700 XP |
| enc.t233 | 266 | 1 | – | ja | 1 | gewonnen, 185 XP |
| enc.t235 | 268 | 1 | – | ja | 1 | gewonnen, 580 XP |
| enc.t238 | 272 | 1 | – | nein | 1 | gewonnen, 630 XP |

## Quests

- **Cull the Millpond Wolf** — active (Zug 5) → completed (Zug 9)
  - Aufgabe: Kill 1 the millpond wolf at the millpond and sluice of Marrow & Sons Gristmill. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 the millpond wolf killed at the millpond and sluice of Marrow & Sons Gristmill.
- **Cull the Bramble Fen Adders** — active (Zug 15) → completed (Zug 60), READY
  - Aufgabe: Kill 5 fen adders at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 5 fen adders killed at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen.
- **Cull the Sablewood Boar Sounder** — expired (Zug 48)
  - Aufgabe: Kill 6 Sablewood boars at the Sablewood east of the river, around the charcoal camps. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 6 Sablewood boars killed at the Sablewood east of the river, around the charcoal camps.
- **Cull the White Antlered Stag** — expired (Zug 48)
  - Aufgabe: Kill 1 the white-antlered stag at the deep Alderwatch Chase beyond the boundary fences. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 the white-antlered stag killed at the deep Alderwatch Chase beyond the boundary fences.
- **Clear Old Crown Catacombs Level 1** — expired (Zug 48), Dungeon loc.old_crown_catacombs Ebene 1
  - Aufgabe: Clear level 1 of Old Crown Catacombs. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Old Crown Catacombs is clear.
- **One Wolf at the Millpond Sluice** — expired (Zug 111)
  - Aufgabe: Kill 1 the lone wolf haunting the millpond and sluice at the millpond and sluice of Marrow & Sons Gristmill. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 the lone wolf haunting the millpond and sluice killed at the millpond and sluice of Marrow & Sons Gristmill.
- **Bog Hounds of the Alder Flats** — expired (Zug 111)
  - Aufgabe: Kill 6 the feral bog hound pack at the cut-over alder flats south of the reed-cutters' camps, Alderwatch Fen. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 6 the feral bog hound pack killed at the cut-over alder flats south of the reed-cutters' camps, Alderwatch Fen.
- **Boars in the Charcoal Camps** — expired (Zug 111)
  - Aufgabe: Kill 4 the kiln-raiding Sablewood boars at the Sablewood east of the river, around the charcoal camps. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 4 the kiln-raiding Sablewood boars killed at the Sablewood east of the river, around the charcoal camps.
- **The White-Antlered Stag of the Deep Chase** — expired (Zug 111)
  - Aufgabe: Kill 1 the white-antlered stag at the deep Alderwatch Chase beyond the boundary fences. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 the white-antlered stag killed at the deep Alderwatch Chase beyond the boundary fences.
- **Clear the Upper Galleries of Old Crown Catacombs** — expired (Zug 111), Dungeon loc.old_crown_catacombs Ebene 1
  - Aufgabe: Clear level 1 of Old Crown Catacombs. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Old Crown Catacombs is clear.
- **Cull the Millpond Wolf** — active (Zug 144) → completed (Zug 152)
  - Aufgabe: Kill 1 millpond wolf at the millpond and sluice of Marrow & Sons Gristmill. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 millpond wolf killed at the millpond and sluice of Marrow & Sons Gristmill.
- **Thin the Fen Adders on the Corduroy Path** — active (Zug 112) → completed (Zug 141), READY
  - Aufgabe: Kill 4 fen adder at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 4 fen adder killed at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen.
- **Cull Sablewood Boar at the Charcoal Camps** — withdrawn (Zug 155)
  - Aufgabe: Kill 3 Sablewood boar at the Sablewood east of the river, around the charcoal camps. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 3 Sablewood boar killed at the Sablewood east of the river, around the charcoal camps.
- **Take the White-Antlered Stag of the Deep Chase** — withdrawn (Zug 155)
  - Aufgabe: Kill 1 white-antlered stag at the deep Alderwatch Chase beyond the boundary fences. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 white-antlered stag killed at the deep Alderwatch Chase beyond the boundary fences.
- **Clear Old Crown Catacombs Level 1** — withdrawn (Zug 155), Dungeon loc.old_crown_catacombs Ebene 1
  - Aufgabe: Clear level 1 of Old Crown Catacombs. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Old Crown Catacombs is clear.
- **Cull the Millpond Wolf** — active (Zug 203) → completed (Zug 215)
  - Aufgabe: Kill 1 wolf at the millpond and sluice of Marrow & Sons Gristmill at the millpond and sluice of Marrow & Sons Gristmill. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 wolf at the millpond and sluice of Marrow & Sons Gristmill killed at the millpond and sluice of Marrow & Sons Gristmill.
- **Clear the Adders from the Corduroy Path** — active (Zug 174) → completed (Zug 200)
  - Aufgabe: Kill 4 fen adder in the bramble hummocks at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 4 fen adder in the bramble hummocks killed at the bramble hummocks along the reed-cutters' corduroy path, Alderwatch Fen.
- **Thin the Sablewood Boar** — expired (Zug 235)
  - Aufgabe: Kill 3 Sablewood boar around the charcoal camps at the Sablewood east of the river, around the charcoal camps. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 3 Sablewood boar around the charcoal camps killed at the Sablewood east of the river, around the charcoal camps.
- **The White-Antlered Stag of the Deep Chase** — expired (Zug 235)
  - Aufgabe: Kill 1 white-antlered stag in the deep Chase at the deep Alderwatch Chase beyond the boundary fences. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 white-antlered stag in the deep Chase killed at the deep Alderwatch Chase beyond the boundary fences.
- **Clear Old Crown Catacombs, Level 1** — expired (Zug 235), Dungeon loc.old_crown_catacombs Ebene 1
  - Aufgabe: Clear level 1 of Old Crown Catacombs. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Old Crown Catacombs is clear.
- **Cull the Sablewood Boars at the Charcoal Camps** — active (Zug 236) → completed (Zug 276)
  - Aufgabe: Kill 4 Sablewood boars at the Sablewood east of the river, around the charcoal camps. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 4 Sablewood boars killed at the Sablewood east of the river, around the charcoal camps.

## Auffälligkeiten

- Zug 282 (Runner/UI): chat persistence failed
- Zug 11, Nachricht 22 (extraction_repaired): the extractor's first answer needed a repair
- Zug 12, Nachricht 23 (planner_repaired): the planner's first answer needed a repair
- Zug 13, Nachricht 26 (extraction_repaired): the extractor's first answer needed a repair
- Zug 21, Nachricht 41 (stat_words): the player spent Stat Points in words, not with #assign; nothing was assigned (for review: did the story tell them as done?)
- Zug 27, Nachricht 53 (stat_words): the player spent Stat Points in words, not with #assign; nothing was assigned (for review: did the story tell them as done?)
- Zug 30, Nachricht 60 (extraction_repaired): the extractor's first answer needed a repair
- Zug 32, Nachricht 63 (planner_repaired): the planner's first answer needed a repair
- Zug 33, Nachricht 65 (planner_repaired): the planner's first answer needed a repair
- Zug 35, Nachricht 69 (planner_repaired): the planner's first answer needed a repair
- Zug 37, Nachricht 74 (extraction_repaired): the extractor's first answer needed a repair
- Zug 43, Nachricht 86 (extraction_repaired): the extractor's first answer needed a repair
- Zug 45, Nachricht 89 (planner_repaired): the planner's first answer needed a repair
- Zug 46, Nachricht 92 (extraction_repaired): the extractor's first answer needed a repair
- Zug 49, Nachricht 98 (extraction_repaired): the extractor's first answer needed a repair
- Zug 65, Nachricht 129 (planner_repaired): the planner's first answer needed a repair
- Zug 66, Nachricht 131 (planner_repaired): the planner's first answer needed a repair
- Zug 69, Nachricht 137 (planner_failed): the planner failed: sell seq 1: the price words "Two and a half" carry no single amount in his message (currency_not_unique); quote exactly his one price, or set price_evidence to null
- Zug 69, Nachricht 137 (planner_repaired): the planner's first answer needed a repair
- Zug 70, Nachricht 139 (planner_repaired): the planner's first answer needed a repair
- Zug 72, Nachricht 143 (planner_repaired): the planner's first answer needed a repair
- Zug 73, Nachricht 146 (extraction_repaired): the extractor's first answer needed a repair
- Zug 75, Nachricht 149 (planner_repaired): the planner's first answer needed a repair
- Zug 76, Nachricht 151 (planner_repaired): the planner's first answer needed a repair
- Zug 77, Nachricht 153 (planner_repaired): the planner's first answer needed a repair
- Zug 79, Nachricht 158 (extraction_repaired): the extractor's first answer needed a repair
- Zug 81, Nachricht 162 (extraction_repaired): the extractor's first answer needed a repair
- Zug 82, Nachricht 164 (extraction_repaired): the extractor's first answer needed a repair
- Zug 83, Nachricht 165 (planner_repaired): the planner's first answer needed a repair
- Zug 83, Nachricht 166 (extraction_repaired): the extractor's first answer needed a repair
- Zug 84, Nachricht 167 (planner_repaired): the planner's first answer needed a repair
- Zug 85, Nachricht 169 (planner_repaired): the planner's first answer needed a repair
- Zug 92, Nachricht 184 (extraction_repaired): the extractor's first answer needed a repair
- Zug 93, Nachricht 185 (planner_repaired): the planner's first answer needed a repair
- Zug 94, Nachricht 187 (planner_repaired): the planner's first answer needed a repair
- Zug 97, Nachricht 194 (extraction_repaired): the extractor's first answer needed a repair
- Zug 98, Nachricht 196 (extraction_repaired): the extractor's first answer needed a repair
- Zug 104, Nachricht 208 (extraction_repaired): the extractor's first answer needed a repair
- Zug 141, Nachricht 281 (stat_words): the player spent Stat Points in words, not with #assign; nothing was assigned (for review: did the story tell them as done?)
- Zug 141, Nachricht 282 (extraction_repaired): the extractor's first answer needed a repair
- Zug 145, Nachricht 289 (planner_repaired): the planner's first answer needed a repair
- Zug 147, Nachricht 294 (extraction_repaired): the extractor's first answer needed a repair
- Zug 148, Nachricht 296 (extraction_repaired): the extractor's first answer needed a repair
- Zug 152, Nachricht 304 (extraction_repaired): the extractor's first answer needed a repair
- Zug 156, Nachricht 312 (extraction_repaired): the extractor's first answer needed a repair
- Zug 157, Nachricht 314 (extraction_repaired): the extractor's first answer needed a repair
- Zug 159, Nachricht 317 (planner_repaired): the planner's first answer needed a repair
- Zug 159, Nachricht 318 (extraction_repaired): the extractor's first answer needed a repair
- Zug 161, Nachricht 321 (planner_repaired): the planner's first answer needed a repair
- Zug 162, Nachricht 323 (planner_repaired): the planner's first answer needed a repair
- Zug 163, Nachricht 325 (planner_repaired): the planner's first answer needed a repair
- Zug 164, Nachricht 327 (planner_repaired): the planner's first answer needed a repair
- Zug 165, Nachricht 329 (planner_repaired): the planner's first answer needed a repair
- Zug 166, Nachricht 331 (planner_repaired): the planner's first answer needed a repair
- Zug 167, Nachricht 333 (planner_repaired): the planner's first answer needed a repair
- Zug 172, Nachricht 344 (extraction_repaired): the extractor's first answer needed a repair
- Zug 184, Nachricht 367 (stat_words): the player spent Stat Points in words, not with #assign; nothing was assigned (for review: did the story tell them as done?)
- Zug 202, Nachricht 404 (extraction_repaired): the extractor's first answer needed a repair
- Zug 210, Nachricht 420 (extraction_repaired): the extractor's first answer needed a repair
- Zug 210, Nachricht 420 (extractor_recovery): the extractor required transport recovery (status applied)
- Zug 217, Nachricht 434 (extraction_repaired): the extractor's first answer needed a repair
- Zug 220, Nachricht 439 (planner_repaired): the planner's first answer needed a repair
- Zug 227, Nachricht 453 (planner_repaired): the planner's first answer needed a repair
- Zug 228, Nachricht 456 (extraction_repaired): the extractor's first answer needed a repair
- Zug 232, Nachricht 464 (extraction_repaired): the extractor's first answer needed a repair
- Zug 232, Nachricht 464 (extractor_recovery): the extractor required transport recovery (status applied)
- Zug 233, Nachricht 465 (planner_repaired): the planner's first answer needed a repair
- Zug 257, Nachricht 514 (extraction_repaired): the extractor's first answer needed a repair
- Seitenfehler: Error: Internal Server Error     at saveChat (http://127.0.0.1:8123/script.js:7456:19)     at async Object.saveChatConditional [as saveChat] (http://127.0.0.1:8123/script.js:9428:13)     at async EventEmitter.onMessageReceived (http://127.0.0.1:8123/scripts/extensions/third-party/avereth-engine/inde…
- Hinweis (error): Chat could not be savedCheck the server connection and reload the page to prevent data loss.
- Runner-Hinweis (dem Spieler nicht gezeigt): Rename ChatRenaming chat…
- Spieler: 79× keine gültige JSON-Entscheidung (Züge 1, 7, 15, 17, 18, 24, 29, 38, 40, 51, 52, 55, 57, 58, 63, 74, 82, 83, 87, 91, 97, 98, 99, 101, 102, 103, 108, 109, 112, 114, 115, 116, 119, 124, 126, 127, 129, 130, 132, 133, 139, 140, 148, 149, 150, 151, 161, 175, 176, 177, 178, 181, 183, 186, 187, 191, 194, 196, 203, 205, 208, 212, 215, 217, 225, 238, 239, 241, 249, 250, 251, 252, 259, 260, 265, 267, 269, 270, 272)
- Server: Generation failed AbortError: The operation was aborted.
- Server: Generation failed AbortError: The operation was aborted.
- Server: Error: EPERM: operation not permitted, rename 'C:\Users\mmitr\AppData\Local\Temp\avereth-live-20261101-181218Z-current_test-kG8pdf\data\default-user\chats\Avereth Engine Test v4\Avereth Live 20261101-181218Z-current_test.jsonl.2635124315' -> 'C:\Users\mmitr\AppData\Local\Temp\avereth-live-20261101-1…

System-Panels: CLARIFY 17, NOT TAKEN 5, REFUSED 3, BLOCKED 0, FAILED 0. Zurückgewiesene Deltas: guild_canon 5, guild_canon_price 1, engine_owned_fact 19, pc_inventory 4, guild_payout 5, engine_owned_memory 3, world_rule 10, scene_context 13, offer 13, engine_recovery 5, ambient 2, quest_count 4, no_go 5, coin_already_received 4, npc_presence 1, npc_continuity 5, quest 1, time_cap 1, trade_direction 1, sale_evidence 2, training_offer 4, attack_commitment 2.
Soft-Extractor-Fehler mit Fortsetzung: 0. Ein Dialogzug kann trotz leerer Planner-Commands neue NPCs, Gaben oder Ereignisse enthalten; der fortgesetzte Test beweist **keine** vollständige Weltübernahme.
Recovery-Beobachtung: Planner leer 0, Transport 0, davon erfolgreich mit 0 Commands 0; Extractor leer 0, Transport 2, davon angewendet mit 0 Deltas 0. Null-Ergebnisse sind Prüfhinweise, keine bewiesenen Spielweltfehler.

Narrator-Recovery: 0 gespeicherte Versuchsmarkierungen (kein Nachweis gestarteter Provideraufrufe); danach 0 mit Erzähltext, 0 leer, 0 ohne Antwort; 0 mit Erzähltext und angewendeter Extraktion.

Spieler-JSON: 79/282 Erstantworten ungültig (28.0 %); 79 Zusatzanfragen; 0 Entscheidungen ohne brauchbare Antwort.

## Performance

| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| plan | 294 | 30 | 3.4 s | 10.4 s | 13364 | 10579 | 102 | – | stop 294 | 0 |
| board | 7 | 2 | 9.6 s | 26.5 s | 2754 | 2393 | 1103 | – | stop 7 | 0 |
| narrator | 244 | 0 | 9.7 s | 31.5 s | 11475 | 8825 | 382 | – | stop 244 | 0 |
| extract | 274 | 28 | 5.9 s | 20.1 s | 14769 | 11215 | 303 | – | stop 272 | 0 |
| forge | 1 | 0 | 6.0 s | 6.0 s | 668 | 0 | 128 | – | stop 1 | 0 |

## Laufzeit (gemessen)

| | Zeit |
|---|---:|
| Gesamt (Start bis Ende des Spiels) | 202:10 min |
| Einrichtung bis zum ersten Zug (davon SillyTavern-Start 17.8 s) | 0:32 min |
| 282 Züge, Spiel (Senden bis HUD nach der Extraktion) | 168:10 min — Median 23.3 s, p90 67.3 s, max 552.8 s |
| 282 Züge, Spieler-Entscheidung | 25:52 min — Median 3.5 s, 79 unbrauchbare Antworten |
| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | 28:28 min / 1:40 min / 76:52 min / 47:51 min / 0:00 min |
| Ø je Zug (Spiel + Spieler) | 41.3 s |
| Hochrechnung bei diesem Tempo | 40 Züge ≈ 27:31 min, 80 Züge ≈ 55:03 min (ohne Einrichtung) |

### Auffällige Einzelzeiten

Je Phase/Providerrolle: über 30 Sekunden und über dem Dreifachen ihres Medians; höchstens drei Einträge. Providerzeiten liegen innerhalb der Spielzeiten, sie werden nicht zusätzlich summiert.

| Phase | Zug | API-Aufruf | Zeit | Median |
|---|---:|---:|---:|---:|
| Spieler | 219 | – | 48.5 s | 3.5 s |
| Spieler | 116 | – | 39.6 s | 3.5 s |
| Spieler | 233 | – | 34.9 s | 3.5 s |
| Spiel | 244 | – | 552.8 s | 23.3 s |
| Spiel | 115 | – | 373.0 s | 23.3 s |
| Spiel | 232 | – | 267.1 s | 23.3 s |
| Provider plan | 169 | 500 | 97.2 s | 3.4 s |
| Provider plan | 252 | 735 | 68.2 s | 3.4 s |
| Provider plan | 232 | 679 | 62.2 s | 3.4 s |
| Provider narrator | 244 | 715 | 529.6 s | 9.7 s |
| Provider narrator | 115 | 345 | 361.9 s | 9.7 s |
| Provider narrator | 172 | 510 | 136.5 s | 9.7 s |
| Provider extract | 218 | 649 | 72.2 s | 5.9 s |
| Provider extract | 216 | 642 | 63.3 s | 5.9 s |
| Provider extract | 87 | 258 | 55.4 s | 5.9 s |

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
