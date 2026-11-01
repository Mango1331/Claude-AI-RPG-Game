# Avereth Live-Test 20261101-180428Z-current_test

## Kurzfassung

- **Laufprofil:** guild-mage; Startklasse Mage, Schwerpunkt guild. Freie Entscheidungen innerhalb des Schwerpunkts, keine Fixture.
- **Ergebnis:** Niederlage — turn 20: he died
- **Etappen:** 1/3 Pflicht erreicht
- **Offen:** open_run_level (nicht erreicht) · class_accepted (nicht erreicht)
- **Progressionsziel:** Level 15; tatsächlich Level 2. Sicherheitsgrenzen: 1000 Eingaben / 1440 Minuten. Ein Limitabbruch erfüllt das Ziel nicht.
- **Vergleich nach 100 Eingaben:** noch nicht erreicht.
- **Charakter:** mage (mage.arcane_bolt, mage.arcane_wave) · Regelstand 2 (Warrior, Mage, Rogue)
- **Ziel-Dungeon:** Glimmerdeep Grotto, Ebene 1 (Vertrag quest.clear_glimmerdeep_grotto_level_1)
- **Leitfaden:** current_test („Open-world progression — natural Level 1 through E class evolution“)
- **Spieler:** LLM zai-org/GLM-5.3-Flash (127.0.0.1:5050, Temperatur 0.8), Stil: curious adventurer: follow interesting opportunities without forcing dangerous encounters
- **Züge:** 20 · **Dauer:** 7:48 min · **LLM-Aufrufe der Engine/des Erzählers:** 51
- **Beobachtete Abdeckung:** 5 unterschiedliche gebuchte Reiseziele · 2 Kämpfe · 0 Verkäufe (0 cp Umsatz, ohne Questzahlungen/Geschenke) · 0 Ausrüstungswechsel · 0 Skill-Erwerbe/Evolutionen/Proficiency-Aufstiege. Keine zusätzlichen Erfolgsbedingungen.
- **Auffälligkeiten:** 3 · **Niederlage** in Zug 20: he died
- **Profil unverändert:** ja · **Geheimnis-Scan:** sauber

## Aufbau

| | |
|---|---|
| Build (Erweiterung) | 4.3.0-c.6.6.146 |
| Git | 9136f8ff664a (claude/c-planner-prototype-2026-10-02-gpt-c666) — sauber |
| SillyTavern | 1.19.0 (C:\Users\mmitr\Silly\SillyTavern-Launcher\SillyTavern), isolierte Instanz auf Port 8123, Start 17.3 s |
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
| Kampagne | Chat „Avereth Live 20261101-180428Z-current_test“, Seed 1346262524 |

## Etappen

| Etappe | Pflicht | erreicht | Zug | Nachricht | Budget |
|---|---|---|---:|---:|---:|
| creation_complete | ja | ✔ | 2 | 3 | 8 |
| open_run_level | ja | – |  |  |  |
| class_accepted | ja | – |  |  |  |

## Spielereingaben

| Zug | Eingabe | Antwort | Etappe (Spieler) | Absicht | Ort danach | HP/MP | Zug-Zeit |
|---:|---|---|---|---|---|---|---:|
| 1 | I choose Mage. | Engine (Menü/Rückfrage) | creation_complete | Select Mage base class | public roadside verge outside Glassmere | 90/84 | 2.3 s |
| 2 | I select Arcane Wave and Arcane Bolt as my two skills. | Engine (Menü/Rückfrage) | creation_complete | Finish Mage creation with required Arcane Wave | public roadside verge outside Glassmere | 90/96 | 2.1 s |
| 3 | I walk to the gates of Glassmere and enter the city. | Erzähler | open_run_level | Reach Glassmere to find the Guild | Glassmere | 90/96 | 32.0 s |
| 4 | I head toward the taller building with the carved lintel, looking for the Adventurers' Guild. | Erzähler | open_run_level | Find the Guild and register | Adventurers' Guild hall, Glassmere | 90/96 | 22.6 s |
| 5 | I place two silver on the counter. "Registration, please." | Erzähler | open_run_level | Register at the Guild | Adventurers' Guild hall, Glassmere | 90/96 | 17.5 s |
| 6 | I walk to the contract board and read the low contracts available to a Novice. | Erzähler | open_run_level | Choose a first Guild contract | Adventurers' Guild hall, Glassmere | 90/96 | 28.4 s |
| 7 | I return to the counter and ask the clerk to take the contract "A Single Strangler in the Reeds." | Erzähler | open_run_level | Accept first achievable Guild contract | Adventurers' Guild hall, Glassmere | 90/96 | 17.6 s |
| 8 | I set out east on the river road toward the Aldwyn Crossing. | Erzähler | open_run_level | Travel to the contract site | the ford stones of the Aldwyn Crossing | 90/96 | 17.2 s |
| 9 | I move to the bank within casting range of the reeds around the middle stones and cast Arcane Wave into the still water there. | Engine (Menü/Rückfrage) | open_run_level | Draw out and attack the marsh constrictor with AoE at the ford stones | the ford stones of the Aldwyn Crossing | 90/96 | 5.8 s |
| 10 | I wade carefully along the ford stones toward the middle of the crossing, watching the still water among the reeds, ready to cast Arcane Wav… | Erzähler | open_run_level | Get the constrictor to appear so it becomes a valid target | the ford stones of the Aldwyn Crossing | 85/96 | 20.7 s |
| 11 | I cast Arcane Bolt at the marsh constrictor. | Erzähler | open_run_level | Attack the engaged constrictor | the ford stones of the Aldwyn Crossing | 85/86 | 22.7 s |
| 12 | I thank the carter and take the road back west toward the Guild hall in town to turn in the contract. | Erzähler | open_run_level | Return to town and turn in the completed contract | Adventurers' Guild hall, Glassmere | 85/86 | 26.5 s |
| 13 | #assign INT 2 WIL 2 VIT 1 | System (Befehl) | open_run_level | Spend level-up stat points | Adventurers' Guild hall, Glassmere | 85/86 | 2.1 s |
| 14 | I take the wrapping from the shelf and bind the bite on my forearm, then ask the clerk what contracts are on the Novice board today. | Erzähler | open_run_level | Treat the wound and look for the next contract | Adventurers' Guild hall, Glassmere | 85/86 | 21.3 s |
| 15 | I tell the clerk: "I'll take the Glimmerdeep Grotto contract — stamp the slip for me, please." | Erzähler | open_run_level | Accept the Level-1 grotto clearing contract | Adventurers' Guild hall, Glassmere | 85/86 | 18.1 s |
| 16 | "I am. Fourteen silver and glowing crystal sounds better than boar tusks alone — but if you want to split it, the reward splits too. Coming,… | Erzähler | open_run_level | Travel to Glimmerdeep Grotto, possibly with the archer | Glimmerdeep Grotto | 85/86 | 24.0 s |
| 17 | "Light's mine — stay a step behind and loose at anything that skitters." I step into the grotto, staff raised, and head into the outer galle… | Erzähler | open_run_level | Enter the dungeon and begin clearing level 1 | outer galleries | 85/86 | 32.6 s |
| 18 | I cast Arcane Wave at the cluster of beetles, hoping to catch all three. | Engine (Menü/Rückfrage) | open_run_level | Open the fight with AoE on the three beetles | outer galleries | 85/86 | 4.5 s |
| 19 | I cast Arcane Wave at Crystal Beetle A, Crystal Beetle B and Crystal Beetle C — the whole cluster. | Erzähler | open_run_level | Retry AoE naming the three beetles as targets | outer galleries | 21/72 | 18.5 s |
| 20 | I grab the staff and hit Crystal Beetle A with my Basic Attack to finish it off. | Erzähler | open_run_level | Kill the weakened beetle while Brenna is hostile | outer galleries | 0/72 | 17.6 s |

**Beobachtungen des Spielers** (nur aus dem, was er auf dem Bildschirm sah; jeweils zum Ergebnis des Zugs davor):

- zu Zug 5 (notiert vor Zug 6): Only 30 copper left, below the 100 cp gear-shopping threshold.
- zu Zug 7 (notiert vor Zug 8): HUD shows 3 Silver while earlier ENGINE RESULT said 30 cp after registration — likely equivalent; watch for further coin inconsistencies.
- zu Zug 11 (notiert vor Zug 12): Contract marked READY for turn-in after one Arcane Bolt kill; loot (skin, 2 fangs) added automatically. 3 Silver confirmed on HUD.
- zu Zug 13 (notiert vor Zug 14): Coin inconsistency again: ENGINE RESULT said 7 Silver, HUD still showed 7 Silver; clerk narrated 4 copper but System credited 4 Silver.
- zu Zug 14 (notiert vor Zug 15): Coin 7 Silver = 70 copper, below the 100 cp gear-check threshold; will recheck after grotto income.
- zu Zug 19 (notiert vor Zug 20): Friendly fire: Arcane Wave hit Brenna and she turned hostile; she deals ~28 per hit and Alaric is at 21 HP — may need to flee or knock her out.

## Kämpfe

| Kampf | Zug | Gegner im Kampf | Gruppe draußen | verborgen | besiegt | Ergebnis |
|---|---:|---:|---|---|---:|---|
| enc.t9r | 10 | 1 | – | nein | 1 | gewonnen, 60 XP |
| enc.t16 | 19 | 4 | – | nein | 3 | **tot** |

## Quests

- **A Single Strangler in the Reeds** — active (Zug 7) → completed (Zug 12), READY
  - Aufgabe: Kill 1 marsh constrictor at the ford stones of the Aldwyn Crossing. Only engine-recorded kills of this population count. Return to the Guild to claim payment.
  - Endzustand: 1 marsh constrictor killed at the ford stones of the Aldwyn Crossing.
- **Clear Glimmerdeep Grotto Level 1** — active (Zug 15), Dungeon loc.glimmerdeep_grotto Ebene 1
  - Aufgabe: Clear level 1 of Glimmerdeep Grotto. Risk: groups and stronger foes; a matching rank does not guarantee a safe solo expedition.
  - Endzustand: Level 1 of Glimmerdeep Grotto is clear.

## Auffälligkeiten

- Zug 12, Nachricht 24 (extraction_repaired): the extractor's first answer needed a repair
- Zug 16, Nachricht 32 (extraction_repaired): the extractor's first answer needed a repair
- Zug 17, Nachricht 34 (extraction_repaired): the extractor's first answer needed a repair
- Runner-Hinweis (dem Spieler nicht gezeigt): Rename ChatRenaming chat…
- Spieler: 2× keine gültige JSON-Entscheidung (Züge 7, 9)

System-Panels: CLARIFY 0, NOT TAKEN 1, REFUSED 0, BLOCKED 0, FAILED 0. Zurückgewiesene Deltas: ambient 1, guild_canon 2, engine_owned_memory 1, engine_owned_fact 3, group_unclear 1, world_rule 3, engine_owned_combat 1.
Soft-Extractor-Fehler mit Fortsetzung: 0. Ein Dialogzug kann trotz leerer Planner-Commands neue NPCs, Gaben oder Ereignisse enthalten; der fortgesetzte Test beweist **keine** vollständige Weltübernahme.
Recovery-Beobachtung: Planner leer 0, Transport 0, davon erfolgreich mit 0 Commands 0; Extractor leer 0, Transport 0, davon angewendet mit 0 Deltas 0. Null-Ergebnisse sind Prüfhinweise, keine bewiesenen Spielweltfehler.

Narrator-Recovery: 0 gespeicherte Versuchsmarkierungen (kein Nachweis gestarteter Provideraufrufe); danach 0 mit Erzähltext, 0 leer, 0 ohne Antwort; 0 mit Erzähltext und angewendeter Extraktion.

Spieler-JSON: 2/20 Erstantworten ungültig (10.0 %); 2 Zusatzanfragen; 0 Entscheidungen ohne brauchbare Antwort.

## Performance

| Rolle | Aufrufe | Reparaturen | Median | p90 | Prompt-Tokens (Median) | davon Cache | Antwort-Tokens (Median) | Reasoning (Median) | finish_reason | leer |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| plan | 17 | 0 | 2.5 s | 4.0 s | 12424 | 10423 | 82 | – | stop 17 | 0 |
| narrator | 15 | 0 | 8.3 s | 11.7 s | 11728 | 0 | 390 | – | stop 15 | 0 |
| extract | 18 | 3 | 5.9 s | 8.8 s | 13758 | 10954 | 368 | – | stop 18 | 0 |
| board | 1 | 0 | 12.0 s | 12.0 s | 2602 | 2602 | 1156 | – | stop 1 | 0 |

## Laufzeit (gemessen)

| | Zeit |
|---|---:|
| Gesamt (Start bis Ende des Spiels) | 7:48 min |
| Einrichtung bis zum ersten Zug (davon SillyTavern-Start 17.3 s) | 0:45 min |
| 20 Züge, Spiel (Senden bis HUD nach der Extraktion) | 5:54 min — Median 18.3 s, p90 32.0 s, max 32.6 s |
| 20 Züge, Spieler-Entscheidung | 0:52 min — Median 2.2 s, 2 unbrauchbare Antworten |
| davon laut Records: Planner / Board / Erzähler / Extraktor / Warten | 1:00 min / 0:12 min / 2:09 min / 1:50 min / 0:00 min |
| Ø je Zug (Spiel + Spieler) | 20.3 s |
| Hochrechnung bei diesem Tempo | 40 Züge ≈ 13:33 min, 80 Züge ≈ 27:07 min (ohne Einrichtung) |

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
