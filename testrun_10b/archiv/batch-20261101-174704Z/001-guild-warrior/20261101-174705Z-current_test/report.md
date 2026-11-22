# Avereth Live-Test 20261101-174705Z-current_test

## Kurzfassung

- **Laufprofil:** guild-warrior; Startklasse Warrior, Schwerpunkt guild. Freie Entscheidungen innerhalb des Schwerpunkts, keine Fixture.
- **Ergebnis:** Niederlage — turn 32: he died
- **Etappen:** 1/3 Pflicht erreicht
- **Offen:** open_run_level (nicht erreicht) · class_accepted (nicht erreicht)
- **Progressionsziel:** Level 15; tatsächlich Level 2. Sicherheitsgrenzen: 1000 Eingaben / 1440 Minuten. Ein Limitabbruch erfüllt das Ziel nicht.
- **Vergleich nach 100 Eingaben:** noch nicht erreicht.
- **Charakter:** warrior (warrior.guard, warrior.cleave) · Regelstand 2 (Warrior, Mage, Rogue)
- **Leitfaden:** current_test („Open-world progression — natural Level 1 through E class evolution“)
- **Spieler:** LLM zai-org/GLM-5.3-Flash (127.0.0.1:5050, Temperatur 0.8), Stil: curious adventurer: follow interesting opportunities without forcing dangerous encounters
- **Züge:** 32 · **Dauer:** 17:21 min · **LLM-Aufrufe der Engine/des Erzählers:** 98
- **Beobachtete Abdeckung:** 11 unterschiedliche gebuchte Reiseziele · 2 Kämpfe · 1 Verkäufe (6 cp Umsatz, ohne Questzahlungen/Geschenke) · 0 Ausrüstungswechsel · 0 Skill-Erwerbe/Evolutionen/Proficiency-Aufstiege. Keine zusätzlichen Erfolgsbedingungen.
- **Auffälligkeiten:** 10 · **Niederlage** in Zug 32: he died
- **Profil unverändert:** ja · **Geheimnis-Scan:** sauber

## Aufbau

| | |
|---|---|
| Build (Erweiterung) | 4.3.0-c.6.6.146 |
| Git | 9136f8ff664a (claude/c-planner-prototype-2026-10-02-gpt-c666) — sauber |
| SillyTavern | 1.19.0 (C:\Users\mmitr\Silly\SillyTavern-Launcher\SillyTavern), isolierte Instanz auf Port 8123, Start 19.4 s |
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
| Kampagne | Chat „Avereth Live 20261101-174705Z-current_test“, Seed 1346262523 |

## Etappen

| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |
|---|---|---|---:|---:|---:|
| creation_complete | ja | ✔ | 2 | 3 | 8 |
| open_run_level | ja | – |  |  |  |
| class_accepted | ja | – |  |  |  |

## Spielereingaben

| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |
|---:|---|---|---|---|---|---|---:|
| 1 | Warrior | Engine (Menü/Rückfrage) | creation_complete | Choose Warrior base class | public roadside verge outside Glassmere | 90/84 | 2.3 s |
| 2 | I choose Cleave and Guard as my two skills. | Engine (Menü/Rückfrage) | creation_complete | Select Cleave and Guard | public roadside verge outside Glassmere | 95/84 | 2.2 s |
| 3 | I walk toward the city gate of Glassmere and enter the city. | Erzähler | open_run_level | Enter Glassmere to find the Guild and work | Glassmere | 95/84 | 25.4 s |
| 4 | I enter the Adventurers' Guild hall and look for the contract board and a registration clerk. | Erzähler | open_run_level | Register with the Guild and find a starter contract | Adventurers' Guild hall, Glassmere | 95/84 | 46.9 s |
| 5 | "Alaric Red. Register me, please." I put two silver on the counter. | Erzähler | open_run_level | Register with the Guild for two silver | Adventurers' Guild hall, Glassmere | 95/84 | 27.8 s |
| 6 | I take the Guild plate and thank the clerk, then head to the market square to look for a blacksmith or armourer. | Erzähler | open_run_level | Pick up plate and shop for gear | Hallvan's Armoury | 95/84 | 44.2 s |
| 7 | I step inside the armoury and ask Hallvan what he'd charge for a better longsword and breastplate than my starter gear. | Erzähler | open_run_level | Compare affordable weapon and armour upgrades | Hallvan's Armoury | 95/84 | 43.5 s |
| 8 | I'll take the fine longsword and the fine breastplate — that's twenty-one silver and two copper in total, right? Here's the coin. | Erzähler | open_run_level | Buy fine longsword and fine breastplate | Hallvan's Armoury | 95/84 | 31.4 s |
| 9 | I'll take just the fine longsword for fourteen silver — here's the coin. | Erzähler | open_run_level | Buy fine longsword within budget | Hallvan's Armoury | 95/84 | 21.8 s |
| 10 | I thank Hallvan and head to the Adventurers' Guild hall to pick a starter contract from the board. | Erzähler | open_run_level | Earn income via a Guild contract to afford gear | Adventurers' Guild hall, Glassmere | 95/84 | 62.2 s |
| 11 | I take the fen cat notice to the clerk and ask her to accept the contract for me. | Erzähler |  | Accept the lowest-risk starter contract | Adventurers' Guild hall, Glassmere | 95/84 | 63.9 s |
| 12 | I leave the Guild hall and head south past the willow line to the eel stakes to hunt the fen cat. | Erzähler | open_run_level | Travel to the eel stakes for the active contract | the eel stakes south of Glassmere | 95/84 | 68.0 s |
| 13 | I thank the fisher and walk the walkways out toward the far end of the stakes, watching for the fen cat. | Erzähler | open_run_level | Hunt the fen cat at the far end of the eel stakes | the far platform of the eel stakes | 95/84 | 28.6 s |
| 14 | I wade into the reeds toward the trampled hummock, sword ready in case the fen cat bursts out. | Erzähler | open_run_level | Hunt the fen cat at its hummock | the trampled hummock | 95/84 | 44.1 s |
| 15 | I swing my longsword at the fen cat as it springs at me. | Erzähler | open_run_level | Fight the fen cat for the active contract | the trampled hummock | 95/84 | 13.3 s |
| 16 | I swing my longsword at the fen cat as it comes at me. | Erzähler | open_run_level | Attack the fen cat now that it is in range | the trampled hummock | 91/84 | 14.1 s |
| 17 | I finish it with a Basic Attack at the wounded fen cat. | Erzähler | open_run_level | Kill the fen cat for the contract | the trampled hummock | 91/84 | 13.8 s |
| 18 | I collect myself and walk back north along the walkways to the fisher at the eel stakes, then head for the Guild hall in Glassmere to turn i… | Erzähler | open_run_level | Return to Glassmere and turn in the completed contract | Adventurers' Guild hall, Glassmere | 91/84 | 29.5 s |
| 19 | #assign STR 2 VIT 2 AGI 1 | System (Befehl) | open_run_level | Spend level-up stat points | Adventurers' Guild hall, Glassmere | 91/84 | 2.1 s |
| 20 | I ask the clerk what contracts are on the board suitable for a Novice. | Erzähler | open_run_level | Pick the next Guild contract | Adventurers' Guild hall, Glassmere | 91/84 | 14.3 s |
| 21 | I take the Boar Sounder contract slip and ask the clerk to accept it. | Erzähler | open_run_level | Accept the boar cull contract | Adventurers' Guild hall, Glassmere | 91/84 | 14.3 s |
| 22 | I ask the clerk where I can find a blacksmith or weaponsmith in Glassmere. | Erzähler | open_run_level | Find a smith to check gear before the boar hunt | Adventurers' Guild hall, Glassmere | 91/84 | 16.7 s |
| 23 | I walk to the Harrow Lane forge and ask Master Ellery what weapons and armor he has suitable for a Novice warrior. | Erzähler | open_run_level | Check gear upgrades before the boar hunt | Harrow Lane forge | 91/84 | 23.3 s |
| 24 | "Nothing I can afford today, Master Ellery — I'll keep my starter gear for now. Do you buy fen cat pelts and claws?" | Erzähler | open_run_level | Try to sell surplus loot, since affordable gear is out of reach at 7 silver | Harrow Lane forge | 91/84 | 21.2 s |
| 25 | "Six copper the lot — done, Master Ellery." I hand over the pelt and both claws and take the coins, then set off for the Tallowwood to hunt … | Engine (Menü/Rückfrage) | open_run_level | Sell the fen cat loot for 6 cp and travel to the boar contract area | Harrow Lane forge | 91/84 | 7.0 s |
| 26 | I sell the fen cat pelt and both claws to Master Ellery for six copper total, then leave for the Tallowwood. | Erzähler | open_run_level | Complete the loot sale, then travel to the boar contract area | the Tallowwood east of Glassmere | 91/84 | 37.7 s |
| 27 | I follow the freshest boar trail deeper into the trees, moving quietly and watching ahead for the sounder. | Erzähler | open_run_level | Track the boar sounder | Boar wallow hollow | 91/84 | 30.1 s |
| 28 | I back away quietly from the hollow before the sow catches my scent, then circle to look for boar separated from the sounder. | Erzähler | open_run_level | Avoid fighting six boar at once; split the sounder | Boar wallow hollow | 91/84 | 18.3 s |
| 29 | I brace behind a thick oak trunk and use Cleave on the lead sow as she closes within reach. | Erzähler | open_run_level | Fight the advancing sounder from a defensible spot | Boar wallow hollow | 91/84 | 16.8 s |
| 30 | I swing Cleave at the charging sow (Boar A) as she reaches my reach. | Erzähler | open_run_level | Fight the engaged lead sow with Cleave | Boar wallow hollow | 60/84 | 23.0 s |
| 31 | I use Cleave at the two engaged boars (A and B), then Guard against their counterattacks. | Erzähler | open_run_level | Fight the sounder with AoE and defense | Boar wallow hollow | 28/84 | 23.2 s |
| 32 | I use Cleave again on the two engaged boars (A and B). | Erzähler | open_run_level | Finish the engaged boars before the rest close in | Boar wallow hollow | 0/84 | 16.0 s |

**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):

- zu Zug 8 (notiert vor Zug 9): Only 3 silver on hand; engine prices in cp (140 cp = 14 silver), so affordable gear must wait for income.
- zu Zug 9 (notiert vor Zug 10): Engine prices are in copper; I have only 30 cp, so affordable upgrades must wait for contract income. Gear check already done this visit; noted and continuing.
- zu Zug 11 (notiert vor Zug 12): Fen cat contract confirmed active in HUD with 40 cp reward; only 3 silver on hand, so gear upgrades must wait for this income.
- zu Zug 23 (notiert vor Zug 24): Common longsword costs 80 cp; I hold only 70 cp, so no useful affordable upgrade unless pelts sell.
- zu Zug 31 (notiert vor Zug 32): Guard was refused last round (one main action per turn); HP down to 28, must end this fast.

## Kämpfe

| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |
|---|---:|---:|---|---|---:|---|
| enc.t16 | 16 | 1 | – | nein | 1 | gewonnen, 60 XP |
| enc.t28 | 30 | 6 | – | nein | 0 | **tot** |

## Quests

- **Cull the Fen Cat at the Eel Stakes** — active (Zug 11) → completed (Zug 18)
  - Aufgabe: Kill 1 mangy fen cat at the eel stakes south of Glassmere. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 mangy fen cat killed at the eel stakes south of Glassmere.
- **Thin the Boar Sounder in the Tallowwood** — active (Zug 21)
  - Aufgabe: Kill 4 wild boar of the Tallowwood sounder at the Tallowwood east of Glassmere. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 4 wild boar of the Tallowwood sounder killed at the Tallowwood east of Glassmere.

## Auffälligkeiten

- Zug 3, Nachricht 6 (extraction_repaired): the extractor's first answer needed a repair
- Zug 4, Nachricht 7 (board_failed): the board generator failed
- Zug 4, Nachricht 8 (extraction_repaired): the extractor's first answer needed a repair
- Zug 5, Nachricht 9 (planner_repaired): the planner's first answer needed a repair
- Zug 6, Nachricht 12 (extraction_repaired): the extractor's first answer needed a repair
- Zug 8, Nachricht 15 (planner_repaired): the planner's first answer needed a repair
- Zug 9, Nachricht 17 (planner_repaired): the planner's first answer needed a repair
- Zug 18, Nachricht 36 (extraction_repaired): the extractor's first answer needed a repair
- Zug 25, Nachricht 49 (planner_repaired): the planner's first answer needed a repair
- Zug 26, Nachricht 51 (planner_repaired): the planner's first answer needed a repair
- Runner-Hinweis (dem Spieler nicht gezeigt): Rename ChatRenaming chat…
- Spieler: 11× keine gültige JSON-Entscheidung (Züge 2, 5, 7, 8, 9, 14, 15, 16, 23, 25, 28)

System-Panels: CLARIFY 1, NOT TAKEN 2, REFUSED 0, BLOCKED 0, FAILED 0. Zurückgewiesene Deltas: guild_canon_price 1, engine_owned_fact 2, attack_commitment 1, guild_completion 1, engine_owned_memory 1, group_unclear 1, world_rule 8.
Soft-Extractor-Fehler mit Fortsetzung: 0. Ein Dialogzug kann trotz leerer Planner-Commands neue NPCs, Gaben oder Ereignisse enthalten; der fortgesetzte Test beweist **keine** vollständige Weltübernahme.
Recovery-Beobachtung: Planner leer 0, Transport 0, davon erfolgreich mit 0 Commands 0; Extractor leer 0, Transport 0, davon angewendet mit 0 Deltas 0. Null-Ergebnisse sind Prüfhinweise, keine bewiesenen Spielweltfehler.

Narrator-Recovery: 0 gespeicherte Versuchsmarkierungen (kein Nachweis gestarteter Provideraufrufe); danach 0 mit Erzähltext, 0 leer, 0 ohne Antwort; 0 mit Erzähltext und angewendeter Extraktion.

Spieler-JSON: 11/32 Erstantworten ungültig (34.4 %); 11 Zusatzanfragen; 0 Entscheidungen ohne brauchbare Antwort.

## Performance

| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| plan | 34 | 5 | 3.0 s | 10.4 s | 12489 | 10464 | 83 | – | stop 34 | 0 |
| narrator | 28 | 0 | 9.7 s | 21.7 s | 11616 | 8703 | 394 | – | stop 28 | 0 |
| extract | 32 | 4 | 6.4 s | 17.5 s | 13823 | 11015 | 349 | – | stop 32 | 0 |
| board | 4 | 2 | 12.0 s | 28.5 s | 3231 | 2712 | 1260 | – | stop 4 | 0 |

## Laufzeit (gemessen)

| | Zeit |
|---|---:|
| Gesamt (Start bis Ende des Spiels) | 17:21 min |
| Einrichtung bis zum ersten Zug (davon SillyTavern-Start 19.4 s) | 0:34 min |
| 32 Züge, Spiel (Senden bis HUD nach der Extraktion) | 14:07 min — Median 23.1 s, p90 46.9 s, max 68.0 s |
| 32 Züge, Spieler-Entscheidung | 2:13 min — Median 2.8 s, 11 unbrauchbare Antworten |
| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | 2:32 min / 1:01 min / 5:04 min / 4:21 min / 0:00 min |
| Ø je Zug (Spiel + Spieler) | 30.6 s |
| Hochrechnung bei diesem Tempo | 40 Züge ≈ 20:26 min, 80 Züge ≈ 40:51 min (ohne Einrichtung) |

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
