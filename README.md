# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 13.11.2026.** Dieses README ist der **erste Einstieg** auf `main`, keine zusätzliche Roadmap oder technische Patchchronik.

## In 60 Sekunden zum Arbeitsstand

- **Spielengine:** Avereth V4-C / Ruleset 2, aktueller **Build `4.3.0-c.6.6.185`**, Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` auf [`d556580`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d556580347432a45b8cb47c8c82b34a4e6ea8764). `.180`: Registrierung/Planner; `.181`: PULSE-Reisehalt; `.182`: Queststatus-Korrektur und eng begrenzte Extractor-Formstabilität ([Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/999b423a7b983c6483ecb0a02066fb0406066bf6/avereth-engine/docs/BATCH1112_182_QUEST_STATUS_FORMS.md), [Review §11](testrun_10b/npc-20261112-220625Z/REVIEW.md)); **`.183`: NPC E3-V-1** (80-Zeichen-Grenze und `LATER ENCOUNTER`-Hinweis im Extractorvertrag, [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/86465eb2a75e6b2b661e3e72d8ce3b7248f9ac5a/avereth-engine/docs/NPC_E3_V1_183.md)); **`.184`: Monster A1** (Spezialorgane nur mit Beleg und ohne eigene Verneinung, Horn, volle Kreaturbeschreibung, [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/efcad4c02f4d2a47ab5f777d6cf6581979e36e4e/avereth-engine/docs/MONSTER_A1_184.md)). **`.185`: Stabilisierung nach dem Dreierbatch** (sichtbare `#pay`-Karte, bedingter Kauf ohne ungebuchte Übergabe, `PAID HERE` und Mehrpositionsklärung, Gildenkoje, Questannahme T22, Extractor-Reparaturgerüst, R1; [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/d556580347432a45b8cb47c8c82b34a4e6ea8764/avereth-engine/docs/STABILIZATION_185.md); nur geskriptet geprüft). **Natürlicher NPC-/PULSE-Dreierbatch auf `.183` jetzt [unabhängig ausgewertet](testrun_10b/npc-20261113-135417Z/REVIEW.md): 9 E3-Anker, Rogue-Extractorstopp und Mage-Dungeon-Tod. `.184` und `.185` waren nicht Teil dieses Tests. Separater isolierter ST1.19-Standard-/Failsoft-Smoke weiterhin offen.**
- **Dokumentation:** `main`. Beim neuen Auftrag **beide Remote-HEADs erneut prüfen**; diese Angaben sind ein belegter Snapshot, keine Zusage für künftige Aktualität.
- **Letzter natürlicher NPC-/PULSE-Test:** [Dreierbatch auf `.183`](testrun_10b/npc-20261113-135417Z/REVIEW.md), **70/43/39 Eingaben, 9 E3-Anker (6/2/1), eine Ankeränderung**. Rogue stoppt technisch nach drei Extraktorfehlern; Mage stirbt im Dungeon. Neuer Originalfall Mage T22/T27: falsche erzählte Questannahme, nicht gebucht. [Vorgänger auf `.179`](testrun_10b/npc-20261112-220625Z/REVIEW.md): 0 Anker und P2-Ortsdrift. [Pilot `.174`](testrun_10b/npc-20261109-160250Z/REVIEW.md) historisch. **Keine vollständige E3-/PULSE-Abnahme.**

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

1. **P2-1 bis P2-5 auf `.180–.182` korrigiert, E3-V-1 in `.183` umgesetzt; neuer natürlicher Dreierbatch geprüft.** Nächster Schritt ist der **gezielte unabhängige Gegenreview der konkreten `.183`-Blockaden** (Rogue T39–T43, Mage T22/T27 und T24) sowie der Qualität der 9 Anker; [Review und Gegenreview-Auftrag](testrun_10b/npc-20261113-135417Z/REVIEW.md). Kein weiteres allgemeines Audit. Isolierter ST-Standard-/Failsoft-Smoke bleibt getrennt offen.
2. **Konkrete offene Integrationsoptionen:** Preis-/Planner-Absicherung P1a–P1f, D3-Teilauslieferung von `relevant` und begrenzte O1-B1-Szenennormalisierung. **Analysiert, nicht implementiert.**
3. **Geplante Spielelemente:** Monster A1 ist in `.184` umgesetzt, sein Randfall R1 in `.185` geschlossen; **A2** (Bewaffnung) folgt separat und bleibt Fachplan mit offenen Entscheidungen. Combat Main/Minor (K1) und Stealth S2 geplant. **Keine Umsetzungsfreigabe durch das bloße Vorliegen eines Plans.**
4. **Spätere Optionen:** NPC E4/E5, PULSE D erst aus Naturläufen, weitere Monsterökologie, Shops, Questvielfalt und Scaling. Siehe 07.

## Kopierbarer Startauftrag für einen neuen Entwicklungs-/Reviewchat

> Arbeite am Projekt Avereth Engine, Repository `Mango1331/Claude-AI-RPG-Game`. Lies auf `main` zuerst `README.md`, `01_ARBEITSWEISE_CHATGPT_CLAUDE.md` und `03_AKTUELLER_PROJEKTSTAND.md`. Prüfe die aktuellen Remote-HEADs von `main` und `claude/c-planner-prototype-2026-10-02-gpt-c666`. Lies danach **nur die für meinen Auftrag relevanten** Regeln (02), Roadmap (07), Fachpläne/Reviews (06) und echten Code. Unterscheide implementiert, simuliert/getestet, natürlich beobachtet, vorgeschlagen und ausdrücklich freigegeben. Ändere den Produktcode nur auf konkreten Auftrag; für Dokumentation nur `main`. Vermeide neue allgemeine Reviews, doppelte Statuslisten und unnötige Mikropatches. Berichte im Chat kompakt mit tatsächlichen Commit-/Testnachweisen.

## Archiv und Bestandsschutz

Die langen Originalreviews in `testrun_10b/`, unabhängig geprüften Analysen in `recherche/` und einzelnen Produktpatchnotes sind **Quellen**, keine zweite aktive Dokumentation. Sie werden nicht überschrieben, nur um Übersichten zu kürzen. Ältere zentrale Statusfassungen bleiben [über einen festen Git-Commit](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) erreichbar. Keine Behauptung über durch diesen Dokumentationsstand neu ausgeführte Node-, Replay- oder Modelltests.
