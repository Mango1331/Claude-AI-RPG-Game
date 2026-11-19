# Avereth Engine – Einstieg

**Stand 19.11.2026.** Die einzige aktuelle Statusquelle ist [03](03_AKTUELLER_PROJEKTSTAND.md); ältere Analysen bleiben als historische Belege erhalten.

## Aktueller Stand

- **Eingefrorenes Produkt:** Build **4.3.0-c.6.6.200**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, [HEAD 0cd1480](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). Kein Merge der aktuellen Entwicklung.
- **Entwicklungs- und Spieltestbasis:** Build **4.3.0-c.6.6.203**, Branch `experiment/action-hud-200-v1`, [HEAD 5e5b827](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5e5b8272412b51b91f75b6e37c5b94d95c9fae11). F-HUD-Bindung, gemeinsame Kampfbedienung, Band-AoE, Questannahme, Weltstatus/Save und enge Kontextfixes sind technisch umgesetzt und mit isolierten ST-Mocks geprüft. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md). **Kein natürliches Gesamt-GO.**
- **Persönliche Runs:** [User05](testrun_10b/user-20261118-011503/README.md) auf .202 nach Phase C bewusst beendet. **User06 auf .203 ist durch Charaktertod beendet; [vier Originaldateien und eine erste Performanceauswertung](testrun_10b/user-20261119-010838/README.md) sind archiviert. Ein vollständiger Gameplay-/Balance-Gegenreview steht noch aus.** Der Todesfall wurde weder als Fehler noch als regelgerecht geprüft. Kein persönlicher Test läuft aktuell.
- **Forschung:** [Aktueller Work-Performancebericht](recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md), [Forschungswegweiser](recherche/README.md).

## Nächste begrenzte Performance-GOs

1. **N-Streaming:** Natives SillyTavern-1.19-Streaming **ohne Smooth Streaming** gegen gepufferten Narrator vergleichen; erste sichtbare Prosa und sichere nächste Sendefreigabe separat messen. Stop, unvollständiger Stream, Swipe, Weltabschluss und Save absichern.
2. **Gildenboard:** Nur bei einem eindeutig isolierten ungültigen Listing einen Ersatz anfordern, danach **alle** bestehenden Boardprüfungen auf dem Gesamtset erneut anwenden. Bei strukturellen/globalen Fehlern bisheriger Vollrepair; höchstens zwei physische Requests.
3. **Extractor:** Zuerst den Offlinebenchmark mit vollständigen HUD-/Revisionsmetadaten und aussagekräftiger Weltprüfung reparieren; erst danach kompaktes JSON als **eigenständigen Versuch** vergleichen. Kein pauschales Abschalten des Extractors.

Diese GOs betreffen **isolierte Experimente und Abnahme**, noch keinen Produktmerge oder kostenpflichtigen Providervergleich. Charakterbeschreibung, Preset, Lorebook und globale Enginebudgets bleiben bis zu eigenständigen Qualitäts-/Performancebelegen unverändert.

## Einstiegsquellen

[01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [03 – Projektstand](03_AKTUELLER_PROJEKTSTAND.md) · [02 – Kanon](02_DESIGN_KANON.md) · [06 – Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [07 – pausierte Gameplay-Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Rechercheindex](recherche/README.md) · [Userruns](testrun_10b/README.md).

[08 – Spielfluss-Zielbild vom 17.11.](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) ist **historische Entscheidungsgrundlage**, nicht der aktuelle Implementierungsstand.

**Schutz:** Historische Berichte, User-Originale und Spielregeln nicht still verändern. Code nur auf gesondertem Entwicklungs-/Experimentbranch, gezielte Tests und unabhängiger Diffreview vor einem Merge. Dokumentationspflege auf main ist erlaubt; sie ist keine Produktfreigabe.
