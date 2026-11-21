# Avereth Engine – Einstieg

**Stand 21.11.2026.** Die einzige aktuelle Statusquelle ist [03](03_AKTUELLER_PROJEKTSTAND.md); ältere Analysen bleiben als historische Belege erhalten.

## Aktueller Stand

- **Eingefrorenes Produkt:** Build **4.3.0-c.6.6.200**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, [HEAD 0cd1480](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). Die aktuelle Entwicklung wird nicht gemergt.
- **Entwicklungs- und Spieltestbasis:** Build **4.3.0-c.6.6.204** auf `experiment/action-hud-200-v1` und `experiment/204-b-playtest-ready`, beide [b51e850](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b51e850bfa233b32f10ba01c563002ab26061c85).
  - Enthalten: Action-HUD, natives Streaming, Einzelslot-Boardrepair, Extractor-/Katalogänderungen, bestätigter Save mit Read-back.
  - Vorlauf: die autonome Codex-Kampagne mit 41 Eingaben und geprüftem Reload ([Spielbericht](testrun_10b/codex-204-glassmere-20261120/README.md)); unabhängiges GO für den persönlichen Test.
- **Läuft gerade: persönlicher User-Test 7 auf `.204`** ([Run](testrun_10b/user-20261121-171341-204/README.md)):
  - **Phase 1** (bis zum Questboard): Codex-Gegenreview abgeschlossen; danach die Nutzer-/GPT-Designentscheidung, starre Board-Kompositionsquoten zu lockern.
  - **Phase 2** (bis Mossback Warrens L1, `l1_s3`, Level 4): [GPT-Review](testrun_10b/user-20261121-171341-204/REVIEW_GPT_PHASE2_2026-11-21.md) abgeschlossen.
  - **Ausstehend:** die eigenständige Codex-Prüfung der Phase-2-Originale und der Gegenreview zum GPT-Review. Danach entscheiden Nutzer und GPT gemeinsam über einen Patch.
  - **Noch keine Codeänderung.**
- **Ältere persönliche Runs:**
  - [User06](testrun_10b/user-20261119-010838/README.md) (`.203`) endete mit dem Tod des Charakters; der Gameplayreview steht aus.
  - [User05](testrun_10b/user-20261118-011503/README.md) (`.202`) wurde nach Phase C bewusst beendet.
- **Forschung:** [Forschungswegweiser](recherche/README.md). Die B-Performanceforschung ist vorerst abgeschlossen.

## Einstiegsquellen

[01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [03 – Projektstand](03_AKTUELLER_PROJEKTSTAND.md) · [02 – Kanon](02_DESIGN_KANON.md) · [06 – Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [07 – pausierte Gameplay-Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Rechercheindex](recherche/README.md) · [Userruns](testrun_10b/README.md).

[08 – Spielfluss-Zielbild vom 17.11.](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) ist **historische Entscheidungsgrundlage**, nicht der aktuelle Implementierungsstand.

## Kopierbarer Startauftrag für einen neuen GPT-Chat

Den aktuellen, vollständigen Startauftrag schreibt Claude bei jedem Statuswechsel neu (zuletzt für User07 Phase 2). Kurzfassung:

> Projekt Avereth Engine, `Mango1331/Claude-AI-RPG-Game`. Lies auf `main` README, 01 und 03, dann den Runordner `testrun_10b/user-20261121-171341-204/` (README, Phase-2-Manifest, GPT-Review Phase 2, Feedbackbewertung, Phase-1-Codex-Gegenreview, Board-Designnachtrag). Prüfe die HEADs von `main`, Produkt `.200` und Entwicklung `.204`. Wir sind mitten in User-Test 7: Der GPT-Review der Phase 2 ist fertig, die eigenständige Codex-Prüfung und der Gegenreview stehen aus. Trenne Evidenzklassen, behaupte keine eigenen Testzahlen, ändere keinen Code. Fasse zuerst den Stand zusammen und schlage die nächsten Schritte vor.

**Schutz:**
- Historische Berichte, User-Originale und Spielregeln nicht still verändern.
- Code nur auf einem gesonderten Entwicklungs- oder Experimentbranch, mit gezielten Tests und unabhängigem Diffreview vor einem Merge.
- Dokumentationspflege auf `main` ist erlaubt; sie ist keine Produktfreigabe.
