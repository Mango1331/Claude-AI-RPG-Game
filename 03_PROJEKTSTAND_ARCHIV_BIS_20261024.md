# Avereth Engine – komprimierte historische Chronik bis 24.10.2026

**Historisches Archiv – kein aktueller Projektstand.** Für den jeweils gültigen Produktstand: [03_AKTUELLER_PROJEKTSTAND.md](03_AKTUELLER_PROJEKTSTAND.md). Für verbindliche Regeln: [02_DESIGN_KANON.md](02_DESIGN_KANON.md).

**Vollständige alte Dokumentation dauerhaft über Git auffindbar:** [Frühere, rund 226 KB lange Fassung (Commit 0ebf449)](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Dort bleiben **alle ursprünglichen Testzahlen, Ableitungen, damaligen Einschränkungen, Planvarianten und Begründungen** unverändert lesbar. Dieses Dokument ist nur der Einstieg in die Historie, nicht deren Ersatz.

## Patch 8 – Dungeon- und Hostgrundlagen (Builds .25–.32, 21.–22.10.2026)

| Stand | Ergebnis und damaliger Nachweis | Vertiefung |
|---|---|---|
| 8 / 8.1, .25–.26 | Living Dungeon, Gate-/Etagenlogik, Gruppen-/Encounter-Mechanik, Quest-Killcredit und UI; erste natürliche GLM-Tests zeigten Dungeon-, Erzähl- und Gruppeninkonsistenzen | [historische Analyse §4–5d](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#4-patch-8-25-implementiert-und-im-code-dokumentiert), [Patch 8.1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c6baa06e159f16069efd728844c7afe7c7dc186a) |
| 8.2, .27 | Telemetrie für Completion, Reasoning/Length und Empty-Replies; Optimierung war durch die ersten Messungen **nicht** kausal bestätigt | [Patchcommit ef4a819](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ef4a819), [damalige Providerbewertung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#5f-patch-82-implementiert-27-21102026--neuer-technischer-iststand) |
| 8.3, .28 | Dungeon-Root/Floor-/Culls korrigiert; echter GLM-Glimmerdeep-Lauf zeigte wiederholte Solo-Ambushes und widersprüchliche Mengen im Questtext | [Commit 70cbb5e](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/70cbb5e), [Livetest-Review](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#5j-erster-echter-28-glm-livetest-glimmerdeep-vier-beetles-questturnin-22102026) |
| 8.4, .29–.31 | Gruppenalarmierung, Cull-Text, Runner- und ST-Integrationsschritte; echter kompletter Living-Dungeon-Lauf mit Queen und Gildenabschluss, weitere Randfälle bei Kapazität/Rückzug | [Patch 8.4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4d08d4f), [vollständiger Living-Dungeon-Test](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#erster-automatisierter-kompletter-living-dungeon-livetest-31--22102026-run-20261022-090042z-patch_8_dungeon_full) |
| 8.4.3, .32 | Kapazitätsprüfung einschließlich Spieler, räumlicher Rückzug, Resthinweis und Runner-Guardiananzeige nachgezogen. **Patch-8-Entwicklungsphase abgeschlossen**, kein neuer genereller Patch-8-Auftrag | [Enginecommit 211ee65](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/211ee659e93072ff8f3e359be13eca93f8fecab3), [damaliger Abschluss](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#patch-8-final--843-umgesetzt-und-im-git-geprüft-übergang-zu-patch-9-22102026) |

**Beweisgrenze:** Ein bestandener ST-Smoke ist nicht gleich einer natürlichen Langzeitabnahme aller Dungeons oder Klassen. Die spezifischen Originalbelege und Einschränkungen stehen in der verlinkten alten Fassung.

## Patch 9 – organische Charakterentwicklung (Builds .33–.57, 22.–24.10.2026)

| Block | Dauerhaftes Ergebnis | Quellen |
|---|---|---|
| **9A / 9A.1, .33–.35** | Drei neue Starterklassen Warrior, Mage, Rogue; zwei frei aus Klassenpool gewählte Starter-Skills plus Basic Attack; Starterkit, neue NPC-Rollen und deren Kampfprofile. Alte fünf Startklassen nur in Legacy-Saves | [Commit 9A](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/25ffe95), [damalige Entwicklung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#patch-9--umsetzungsstand-stand-23102026) |
| **9B, .36–.39** | Dynamische Skilldefinition/-auflösung, Effekte, Proficiency und frühe Passives; noch kein freier automatischer Erwerb aller Fähigkeiten | [9B-1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b632011), [9B-2](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/6fb6176) |
| **9C, .40–.54** | Lernen/Lehren und Forge, Stone/Material, Passive-/Skill-Erwerb, Evolution, NPC-Techniken; Teilbereiche gezielt live erprobt, darunter Stone und ein entwickelter Combat-Skill | [Abschluss 9C .52](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/79c8e36), [damalige Serie](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#9c-abschluss-52-reviewkorrektur-c50da2d-git-geprüft--kurztest-freigegeben-23102026) |
| **9D, .55–.57** | F→E-Klassenidentität, Evolution, Feats und Klassenvermächtnis. Fixture-ST-/GLM-Abnahme mit Save/Reload; synthetische Level-1–14-Vorgeschichte, also **kein echter natürlicher Level-15-Langlauf** | [damalige 9D-/Fixture-Kette](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md#9d-57--echter-zweiter-fixture-livetest-fe-vollständig-abgenommen-24102026) |

**Maßgeblich:** Designgrundsätze nur in [02](02_DESIGN_KANON.md), spätere F→E-Numerik in [Scaling-Audit](testrun_10b/scaling_gpt.md) und [Sols Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md). Alte Patch-9-Sätze „noch nicht implementiert“ sind historische Momentaufnahmen.

## Früher Übergang zu 10B (24.10.2026)

- Natürliche, offene GLM-Kampagnen wurden statt ausschließlich geskripteter Fixtures eingeführt; Original-ZIPs, einzelne Reviews und spätere Runs liegen unter [testrun_10b](testrun_10b/README.md).
- Reproduzierbarer Offline-Kampfsimulator eingeführt; alte PC-vs.-NPC-Taktikasymmetrie verhindert einen unmittelbaren allgemeinen Klassenbalancebeweis.
- Aus Run 1–6 wurden konkret abgegrenzte Vertrauens-, Reise-, Liefer-, Guild- und Host-/LLM-Probleme abgeleitet; die nachfolgenden Produktfixes sind **nicht** mehr in diesem historischen Ausgangsstand nachzutragen.
- [10B-Quellen- und Patchindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) für die spätere Entwicklung; [Originalfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_PROJEKTSTAND_ARCHIV_BIS_20261024.md) für jede detaillierte frühere Ursachenkette.

## Archivregeln

Historische Messungen bleiben historische Messungen; keine alten „aktuell“-, „ausstehend“- oder „nächster Patch“-Formulierungen wiederverwenden. Neue Status- und Abnahmedaten gehören ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md). Keine Testarchive umschreiben oder commitbasierte Referenzen ohne Abgleich ersetzen.
