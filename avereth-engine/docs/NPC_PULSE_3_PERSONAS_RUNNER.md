# NPC-/PULSE-Runner: drei frei spielende Persönlichkeiten

**12.11.2026 · Runner-only-Änderung auf dem Entwicklungsbranch; Engine-Version bleibt 4.3.0-c.6.6.179.**

## Anlass

Der erste freie NPC-/PULSE-Pilot war ein einzelner sozialer Warrior-Lauf. Für eine neue natürliche Stichprobe stehen jetzt drei unabhängige Profile bereit, ohne das Spiel künstlich auf bestimmte NPCs, Quests oder PULSE-Ereignisse hinzusteuern.

| Profil | Klasse | Fokus |
|---|---|---|
| `npc-sociable` | Warrior | Menschen kennenlernen, gemeinsame Abenteuer, Hilfe und spätere Begegnungen |
| `npc-wary` | Rogue | Vorsicht, nachvollziehbare Zusagen, Verhandlung, Erkundung und Rückzug |
| `npc-inquisitive` | Mage | Wissen, Zweifel, Ortsgeschichte, Gerüchte und eigenständige Erkundung |

**Vergleichsbasis erhalten:** Die ersten beiden Style-Prompts wurden unverändert übernommen. Der dritte wurde im selben Guide als zusätzliche optionale Persona eingefügt. `SCENARIOS` (Guild- und Explore-Modus), die sechs bisherigen Klassen-/Modusprofile, Meilensteine, Engine-Regeln, NPC-/PULSE-Auswertung und die CLI bleiben unverändert. `runBatch` liest die Profilanzahl dynamisch; es war keine neue Batcharchitektur nötig.

## Geänderte Pfade

- `tools/st_live/live/scenarios.mjs` – drittes NPC-Profil `npc-inquisitive` (Mage)
- `tools/st_live/live/guides/npc_pulse_test.json` – dieselbe dritte Persona für Einzelruns ohne Szenariovorgabe
- `tools/st_live/live/batch.mjs` – Kommentar/Dokumentation der dynamischen Dreierfolge, keine Ablaufänderung
- `tests/live_runner/npc_pulse_runner.test.js` – 3 Profile, 3 Klassen, verschiedene Prompts, Seedfolge 7/8/9, Bericht, Guild-Batch unverändert
- `tests/live_runner/npc_pulse_failure.test.js` – eine fehlgeschlagene Auswertung unter drei vollständig exportierten Läufen
- `docs/LIVE_RUNNER.md` – aktuelle Verwendung und Abgrenzung zum historischen Zweierbatch

## Bedienung

```powershell
npm run live:st:npc -- --list
npm run live:st:npc -- --headed
npm run live:st -- --guide npc_pulse_test --scenario npc-inquisitive --headed
```

**Nachweisgrenze:** Diese Patchnote dokumentiert den vorgesehenen Code-/Testumfang. Ohne lokal ausgeführte Node-/ST-/LLM-Tests sind keine grünen Gesamttests, natürliches Spielgefühl oder bestandene E2/E3-/PULSE-Abnahme behauptet. Ein fertiger Batch bedeutet drei getrennt ausgewertete Läufe, nicht drei erfolgreich bestandene Inhaltsprüfungen.
