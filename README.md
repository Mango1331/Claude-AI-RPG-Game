# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 13.11.2026.** Dieses README ist der **erste Einstieg** auf `main`, keine zusätzliche Roadmap oder technische Patchchronik.

## In 60 Sekunden zum Arbeitsstand

- **Spielengine:** Avereth V4-C / Ruleset 2, aktueller **Build `4.3.0-c.6.6.182`**, Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` auf [`49694db`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/49694db3a225155d0d5b6612c00be49e70d783c7). `.180`: Registrierung/Planner; `.181`: PULSE-Reisehalt; `.182`: Queststatus-Korrektur und eng begrenzte Extractor-Formstabilität. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/49694db3a225155d0d5b6612c00be49e70d783c7/avereth-engine/docs/BATCH1112_182_QUEST_STATUS_FORMS.md) · [unabhängiger Code- und Originalreview §11](testrun_10b/npc-20261112-220625Z/REVIEW.md). **Kein natürlicher Nachtest auf `.182`; isolierter ST1.19-Smoke seit `.180` offen.**
- **Dokumentation:** `main`. Beim neuen Auftrag **beide Remote-HEADs erneut prüfen**; diese Angaben sind ein belegter Snapshot, keine Zusage für künftige Aktualität.
- **Letzter natürlicher NPC-/PULSE-Test:** [Dreierbatch auf `.179`](testrun_10b/npc-20261112-220625Z/REVIEW.md) (70/70/48 Eingaben; dritter Mage-Lauf bricht ab; **0 E3-Anker**, P2-Orts-/Questdrift). [Pilot 01 auf `.174`](testrun_10b/npc-20261109-160250Z/REVIEW.md) bleibt historische Vergleichsquelle. Runner mit drei Profilen [`bd02cd6`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bd02cd627776b9fa2e701a7815226a45002cd262); die Korrekturen `.180–.182` sind umgesetzt, ihre Wirkung im natürlichen Spiel noch nicht erneut überprüft.

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

1. **P2-1 bis P2-5 aus dem Dreierbatch soweit freigegeben umgesetzt auf `.180–.182`** (P2-5 nur bedeutungsneutral; keine Delta-Teilannahme). [Aktueller unabhängiger Review §11](testrun_10b/npc-20261112-220625Z/REVIEW.md) mit tatsächlich geprüften Original-Extractorantworten. **Als Nächstes NPC E3-V-1** (80-Zeichen-Grenze und Folgepräsenz), danach isolierter ST-Smoke und natürliche Nachprüfung. Kein weiterer allgemeiner Fachplan nötig.
2. **Konkrete offene Integrationsoptionen:** Preis-/Planner-Absicherung P1a–P1f, D3-Teilauslieferung von `relevant`, E3-Vertragshinweis V-1 und begrenzte O1-B1-Szenennormalisierung. **Analysiert, nicht implementiert.**
3. **Geplante Spielelemente:** Monster-A1/A2-Fachplan mit Opus/GPT-Gegenreviews, Combat Main/Minor (K1) und Stealth S2. **Keine Umsetzungsfreigabe durch das bloße Vorliegen eines Plans.**
4. **Spätere Optionen:** NPC E4/E5, PULSE D erst aus Naturläufen, weitere Monsterökologie, Shops, Questvielfalt und Scaling. Siehe 07.

## Kopierbarer Startauftrag für einen neuen Entwicklungs-/Reviewchat

> Arbeite am Projekt Avereth Engine, Repository `Mango1331/Claude-AI-RPG-Game`. Lies auf `main` zuerst `README.md`, `01_ARBEITSWEISE_CHATGPT_CLAUDE.md` und `03_AKTUELLER_PROJEKTSTAND.md`. Prüfe die aktuellen Remote-HEADs von `main` und `claude/c-planner-prototype-2026-10-02-gpt-c666`. Lies danach **nur die für meinen Auftrag relevanten** Regeln (02), Roadmap (07), Fachpläne/Reviews (06) und echten Code. Unterscheide implementiert, simuliert/getestet, natürlich beobachtet, vorgeschlagen und ausdrücklich freigegeben. Ändere den Produktcode nur auf konkreten Auftrag; für Dokumentation nur `main`. Vermeide neue allgemeine Reviews, doppelte Statuslisten und unnötige Mikropatches. Berichte im Chat kompakt mit tatsächlichen Commit-/Testnachweisen.

## Archiv und Bestandsschutz

Die langen Originalreviews in `testrun_10b/`, unabhängig geprüften Analysen in `recherche/` und einzelnen Produktpatchnotes sind **Quellen**, keine zweite aktive Dokumentation. Sie werden nicht überschrieben, nur um Übersichten zu kürzen. Ältere zentrale Statusfassungen bleiben [über einen festen Git-Commit](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) erreichbar. Keine Behauptung über durch diesen Dokumentationsstand neu ausgeführte Node-, Replay- oder Modelltests.
