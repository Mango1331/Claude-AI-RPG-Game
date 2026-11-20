# Avereth Engine – Einstieg

**Stand 20.11.2026.** Die einzige aktuelle Statusquelle ist [03](03_AKTUELLER_PROJEKTSTAND.md); ältere Analysen bleiben als historische Belege erhalten.

## Aktueller Stand

- **Eingefrorenes Produkt:** Build **4.3.0-c.6.6.200**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, [HEAD 0cd1480](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). Kein Merge der aktuellen Entwicklung.
- **Entwicklungs- und Spieltestbasis** ist Build **4.3.0-c.6.6.204**, `experiment/action-hud-200-v1` und `experiment/204-b-playtest-ready` auf `b51e850`. Die natürliche Codex-Kampagne umfasst 41 Eingaben mit geprüftem Reload. [Spielbericht und Installationsanleitung](testrun_10b/codex-204-glassmere-20261120/README.md)
- **Persönliche Runs:** [User05](testrun_10b/user-20261118-011503/README.md) auf .202 nach Phase C bewusst beendet. **User06 auf .203 ist durch Charaktertod beendet; [vier Originaldateien und eine erste Performanceauswertung](testrun_10b/user-20261119-010838/README.md) sind archiviert. Ein vollständiger Gameplay-/Balance-Gegenreview steht noch aus.** Der Todesfall wurde weder als Fehler noch als regelgerecht geprüft. Kein persönlicher Test läuft aktuell.
- **Forschung:** [Aktueller Work-Performancebericht](recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md), [Forschungswegweiser](recherche/README.md).

## Spielbare Entwicklung

Die .204 übernimmt natives Streaming, den geprüften Einzelslotrepair der Gildentafel, die Extractor- und Katalogänderungen sowie den bestätigten Save mit Read-back. Der ursprüngliche Extractorvertrag und das originale Narrator-Preset bleiben die getesteten Einstellungen. [Forschungsabschlüsse](recherche/README.md)

## Einstiegsquellen

[01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [03 – Projektstand](03_AKTUELLER_PROJEKTSTAND.md) · [02 – Kanon](02_DESIGN_KANON.md) · [06 – Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [07 – pausierte Gameplay-Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Rechercheindex](recherche/README.md) · [Userruns](testrun_10b/README.md).

[08 – Spielfluss-Zielbild vom 17.11.](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) ist **historische Entscheidungsgrundlage**, nicht der aktuelle Implementierungsstand.

**Schutz:** Historische Berichte, User-Originale und Spielregeln nicht still verändern. Code nur auf gesondertem Entwicklungs-/Experimentbranch, gezielte Tests und unabhängiger Diffreview vor einem Merge. Dokumentationspflege auf main ist erlaubt; sie ist keine Produktfreigabe.
