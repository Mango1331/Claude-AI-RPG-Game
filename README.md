# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 12.11.2026.** Dieses README ist der **erste Einstieg** auf `main`, keine zusätzliche Roadmap oder technische Patchchronik.

## In 60 Sekunden zum Arbeitsstand

- **Spielengine:** SillyTavern-Erweiterung Avereth V4-C / Ruleset 2; unveränderte Spielmechanik in **`4.3.0-c.6.6.179`**, letzter Gameplay-Commit [`59f868e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd). **Entwicklungsbranch:** `claude/c-planner-prototype-2026-10-02-gpt-c666`; neuer HEAD [`bd02cd6`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bd02cd627776b9fa2e701a7815226a45002cd262) enthält **nur den dreiteiligen NPC-/PULSE-Test-Runner**, keine neue Engine-Version.
- **Dokumentation:** `main`. Beim neuen Auftrag **beide Remote-HEADs erneut prüfen**; diese Angaben sind ein belegter Snapshot, keine Zusage für künftige Aktualität.
- **Bisher letzter freier NPC-/PULSE-Pilot:** [Pilot 01 auf `.174`](testrun_10b/npc-20261109-160250Z/REVIEW.md). Ein neuer [Dreierbatch mit geselligem Warrior, vorsichtigem Rogue und wissbegierigem Mage](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd02cd627776b9fa2e701a7815226a45002cd262/avereth-engine/docs/NPC_PULSE_3_PERSONAS_RUNNER.md) ist vorbereitet, aber **noch nicht natürlich ausgeführt**. Korrekturen bis `.179` bleiben ohne freie Nachabnahme.

## Nur diese Dateien zuerst lesen

| Datei | Eine einzige Zuständigkeit |
|---|---|
| [01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) | Rollen, Freigaben, unabhängige Reviews, Test-/Commitregeln |
| [02 – Design-Kanon](02_DESIGN_KANON.md) | **Verbindliche** Regeln und ausdrücklich geplante Entscheidungen; nicht durch einen Analysevorschlag ersetzen |
| [03 – Aktueller Projektstand](03_AKTUELLER_PROJEKTSTAND.md) | **Einzige laufende Quelle** für Produktbuild, nachgewiesene Qualität, unmittelbare Aufgaben, Risiken |
| [07 – Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) | Langfristige und optionale Features mit Abhängigkeiten, nicht die aktuelle Buildhistorie |
| [06 – Fachquellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) | Links zu maßgeblichen Fachplänen, Architekturprüfungen und Reviews |
| [04 – Ideenspeicher](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) | Unpriorisierte Ideen, **keine** still freigegebenen Features |
| [Test- und Originalindex](testrun_10b/README.md) | Originaldaten, Runreviews, Quellenlage |

**Leseprinzip:** Für einen neuen Chat zunächst **README + 01 + 03**, dann **02** für Regelentscheidungen bzw. **07 + genau den relevanten Fachplan** für geplante Funktionen. Nicht alle ~200 historischen Reviews einlesen. Fachquellen stehen in 06; das historische V3-README unter `avereth-engine/` ist **kein** aktueller V4-C-Produktstand auf `main`.

## Jetzt wichtig: entwickelt ≠ getestet ≠ freigegeben

1. **Vor dem nächsten Featurepatch:** natürlicher NPC-/PULSE-Lauf auf unverändertem `.179`, Auswertung von E2-Wiederbegegnung, `handled_by`, E3-Ankern, Threads und PULSE-Dichte.
2. **Konkrete offene Integrationsoptionen:** Preis-/Planner-Absicherung P1a–P1f, D3-Teilauslieferung von `relevant`, E3-Vertragshinweis V-1 und begrenzte O1-B1-Szenennormalisierung. **Analysiert, nicht implementiert.**
3. **Geplante Spielelemente:** Monster-A1/A2-Fachplan mit Opus/GPT-Gegenreviews, Combat Main/Minor (K1) und Stealth S2. **Keine Umsetzungsfreigabe durch das bloße Vorliegen eines Plans.**
4. **Spätere Optionen:** NPC E4/E5, PULSE D erst aus Naturläufen, weitere Monsterökologie, Shops, Questvielfalt und Scaling. Siehe 07.

## Kopierbarer Startauftrag für einen neuen Entwicklungs-/Reviewchat

> Arbeite am Projekt Avereth Engine, Repository `Mango1331/Claude-AI-RPG-Game`. Lies auf `main` zuerst `README.md`, `01_ARBEITSWEISE_CHATGPT_CLAUDE.md` und `03_AKTUELLER_PROJEKTSTAND.md`. Prüfe die aktuellen Remote-HEADs von `main` und `claude/c-planner-prototype-2026-10-02-gpt-c666`. Lies danach **nur die für meinen Auftrag relevanten** Regeln (02), Roadmap (07), Fachpläne/Reviews (06) und echten Code. Unterscheide implementiert, simuliert/getestet, natürlich beobachtet, vorgeschlagen und ausdrücklich freigegeben. Ändere den Produktcode nur auf konkreten Auftrag; für Dokumentation nur `main`. Vermeide neue allgemeine Reviews, doppelte Statuslisten und unnötige Mikropatches. Berichte im Chat kompakt mit tatsächlichen Commit-/Testnachweisen.

## Archiv und Bestandsschutz

Die langen Originalreviews in `testrun_10b/`, unabhängig geprüften Analysen in `recherche/` und einzelnen Produktpatchnotes sind **Quellen**, keine zweite aktive Dokumentation. Sie werden nicht überschrieben, nur um Übersichten zu kürzen. Ältere zentrale Statusfassungen bleiben [über einen festen Git-Commit](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) erreichbar. Keine Behauptung über durch diesen Dokumentationsstand neu ausgeführte Node-, Replay- oder Modelltests.
