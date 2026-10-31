# Avereth Engine – 10B-Fachindex und Quellenwegweiser

**Stand: 31.10.2026.** Keine zweite Aufgaben-/Teststatistik: [03 enthält allein den aktuellen Stand](03_AKTUELLER_PROJEKTSTAND.md); [02 die verbindlichen Regeln](02_DESIGN_KANON.md), [04 offene Ideen](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). [Vollständige historische Indexfassung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [altes Journal mit §§0–32](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Fachpläne: fachlich umgesetzt oder ausdrücklich offen

| Bereich | Stand / maßgebliche Quelle |
|---|---|
| Architektur A → B1 → C → D | **Implementiert bis Build .136**, Code- und Replaynachweise sowie ST-Host-Smokes in [03](03_AKTUELLER_PROJEKTSTAND.md), [ursprüngliche Umsetzungsspezifikation](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). Produktkommits: [A .127](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/167e2e9), [B1 .130](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59e1305), [B1-Startschutz .131](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc71256), [C .132](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8908850), [D .133](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bc44df1), [D-Reviewabschluss .136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926). |
| Start mit Makros | **Behoben in [.137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373)**: Start auf aufgelöster ST-Begrüßung mit korrektem Ort; echter ST-Makro-Start 26/26, Fullsuite und Replay grün laut Implementierung. Der ursprüngliche .136-Batch ist als abgebrochener Beleg erhalten. [03](03_AKTUELLER_PROJEKTSTAND.md). |
| Paket F / natürliche Batchprüfung | **Offen**; Nutzer startet drei Guildprofile lokal auf .137 (ggf. zuerst kurze eigene Gegenprobe). [Runner](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6cc09cd/avereth-engine/docs/LIVE_RUNNER.md), [Runindex](testrun_10b/README.md). |
| B2 / E | **Nicht begonnen und nicht Voraussetzung für F.** B2 entfernt rein historische formale Privatquestreste; E den größeren ungenutzten V3/V4-A/Ruleset1-Pfad nach Nutzungskarte. [Fachplan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). |
| Main/Minor | Beschlossener, **noch nicht implementierter** [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md). Vor der Umsetzung alte Kompatibilitätsstellen aktualisieren. |
| F-/E-Scaling, Monster, NPC-Langzeitwissen, Questfreiheit | **Spätere Themen ohne aktuelle Freigabe.** [Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). |

## Produktgeschichte – nur Commitwegweiser

Keine erneuten Patchdetails oder historischen Testzahlen in diesem Index; Implementierung und ursprüngliche Abnahme beim jeweiligen Commit beziehungsweise in der dortigen Fachpatchnote.

| Builds | Ergebnis / Commit |
|---|---|
| .58–.87 | Delivery-/Guard- und Dungeon-/Gildenmechanik, organische Entwicklung, World-/NPC-Kontinuität: [altes 10B-Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [.66](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cd9b33), [.85](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2bab566), [.87](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1584dd7). |
| .88–.113 | Frühere Handel-/Ort-/Händlerregeln, Recovery, Failsoft, Registrierungs- und Dungeon-UI: [.96](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f50ca4e), [.103](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/48bdf5d), [.105–.110](patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md), [.113](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/55c547f). |
| .114–.120 | F-Balanceversuch, Band-AoE, Gildenfilialen, vorläufiger Doppeljagdschutz: [.114](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/89aaf08), [.116](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/41a17fc), [.117](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9a76eb), [.120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f). |
| .121–.126 | XP×5, false-refusal-Fixes, PP/Gear-Testpreise, Gebiets-/Populationskohärenz: [.121](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f1), [.122](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/013e0dc), [.123](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c300f3d), [.124](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/97d0976), [.126](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b8d2af4). |
| .127–.136 | Architektur A/B1/C/D: [oben](#fachpläne-fachlich-umgesetzt-oder-ausdrücklich-offen), [D-Fachpatchnote samt Host-Smokes](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). |

## Natürliche Originalbelege

Alle vorherigen Batches und Gegenreviews stehen **nur** im [Runindex](testrun_10b/README.md) und im [Originalarchiv 1–19](testrun_10b/ARCHIV_BATCHES.md). Der erste Batch vom 31.10.2026 ist auf .136 vor der Charaktererstellung technisch abgebrochen; .137 behebt den Start, aber noch kein natürlicher A–D-Langbatch. Seinen Status in [03](03_AKTUELLER_PROJEKTSTAND.md) verfolgen.

**Pflege:** Ein neuer Nachweis gehört in Run-Review oder Dev-Fachpatchnote, der Status in 03. Hier nur neue Fachquellen oder wesentliche Abschlüsse kurz verlinken. Keine historische Patchkette neu erzählen.
