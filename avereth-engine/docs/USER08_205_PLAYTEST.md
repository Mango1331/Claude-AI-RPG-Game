# Avereth 4.3.0-c.6.6.205 – spielbereite Testfassung für User-Test 8

**Basis:** `experiment/204-user07-board-dungeon-camp@52d9c04aaf9f32ae92f03a72e9686d4b662749c6`. **Testbranch:** `experiment/205-user08-playtest-ready`. **Produkt `.200` bleibt unverändert.**

Dies ist eine **Versions-/Testfreigabe**, kein neuer Gameplaypatch: Gegenüber dem bereits geprüften A–C-Kandidaten mit C-Korrekturen R1/R2 sind nur die drei Engine-Buildkennungen und diese Dokumentation aktualisiert. Enthalten sind die global gelockerten F-Boardquoten und der lesbare HUD-Kontrast (A), die präzisierte Gilden-/Dungeon-Erzählführung und gezielte Extractor-Kontextregel (B) sowie sichtbare Campausstattung, Annäherung und geschützte Mitnahme mit R1/R2-Orts-/Objektkorrektur (C).

## Freigabestand und Abnahmegrenzen

Die ursprüngliche Kandidatenabnahme meldete **3.422/3.422 Node, 2.235 Replay und ST-Standard 366/366 sowie Failsoft 372/372**. Die nachfolgende C-R1/R2-Korrektur wurde laut technischem Bericht mit **3.425/3.425 Node, 2.235 Replay ohne neue Abweichung und 32/32 isoliertem Camp-ST-Mock** abgenommen. Der [unabhängige GPT-Diffreview](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/f4b0077e785ae5a79c9da51596455ae00cf3f49c/patch_plans_10b/REVIEW_USER07_204_C_KORREKTUR_GPT_2026-11-22.md) gab die persönliche Testfortsetzung frei. Diese Zahlen beziehen sich auf den gameplay-identischen technischen Stand `52d9c04`. Durch das reine Versionieren auf `.205` wurde **keine neue vollständige Node-/Replay-/ST-Abnahme ausgeführt**.

`src/util.js::ENGINE_VERSION`, `manifest.json` und `package.json` tragen `4.3.0-c.6.6.205`. `NARRATOR_CONTRACT_REVISION` bleibt absichtlich auf `4.3.0-c.6.6.204`, da es eine separate Inhaltsvertragsrevision ist und sich die Character-Card/der Narrator-Vertrag für diesen Versionsschritt nicht geändert haben. Ebenso unverändert: Presets, Lore, Regeln, SillyTavern-Charakterdateien und gespeicherte Kampagnen.

## Neues Spiel: User-Test 8

1. Lokalen Repo-Checkout auf `experiment/205-user08-playtest-ready` bringen und den Commit kontrollieren.
2. `avereth-engine/` als lokale SillyTavern-Extension aktualisieren. Die Extension liegt unter `SillyTavern/data/<user>/extensions/avereth-engine/` (SillyTavern-Userordner ist installationsabhängig). Die Extension nach Aktualisierung neu laden.
3. In `Manage extensions` beziehungsweise im Enginepanel die vollständige Buildkennung `4.3.0-c.6.6.205` prüfen. Ein alter `.204`-Wert bedeutet, dass noch der alte Code geladen ist.
4. **Neuen Chat / neue Kampagne** beginnen, nicht den gespeicherten User07-Chat weiterverwenden. Den bisherigen aktuellen Character-Card- und Narrator-Preset-Stand weiter benutzen; kein erneuter Import nur wegen `.205` erforderlich.
5. Neue Charaktererstellung und dann normal und frei spielen. Das spontane Feedback ohne nachträgliche Glättung notieren. Besonders beobachten: freie Questwahl und verständliche Risiken, echte Dungeon-Haltepunkte, Sichtbarkeit und Mitnahme gewöhnlicher Campgegenstände, persistente NPC-/Raumfakten, gefühlte Zeit bis zur nächsten Eingabe.
6. Nach dem Run **Chat JSONL, Avereth-Events JSON, ST-Log/Debug und spontane Spielgefühlsnotizen** für User08 getrennt bereitstellen. Originaldaten unverändert archivieren, nicht mit User07 mischen.

**Nicht Teil von `.205`:** L2-Zufalls-Loot, T7-Prompt-/Tokenforschung, neue Character Description, neuer Narrator-Vertrag, weitere Provider-A/B-Tests oder ein Produktmerge. Natürliche Spielqualität und Latenz auf der persönlichen Providerroute bleiben erst mit User08 festzustellen.
