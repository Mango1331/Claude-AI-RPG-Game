# Avereth Engine – Roadmap nach 10B

**Stand 12.11.2026 · bewertete Entwicklungsoptionen, keine zweite Statuschronik.** [Start](README.md) · [aktuelle Abnahme 03](03_AKTUELLER_PROJEKTSTAND.md) · [verbindliche Regeln 02](02_DESIGN_KANON.md) · [Fachquellen 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Alle historischen Kennungen bleiben auffindbar, **keine automatische Rangfolge oder Freigabe**.

## 1. Nächste fachliche Etappen

| Etappe | Bereits gesichert / verbleibende Entscheidung |
|---|---|
| **Natürliche NPC-/PULSE-Qualität auf `.179`** | E2/E3 und PULSE A/B/C technisch umgesetzt; **freie Nachprüfung der letzten Korrekturen `.175–.179` fehlt**. [Pilot und Messfragen](recherche/NPC_E2_E3_KONTINUITAETSAUDIT_OPUS55.md) |
| **Preis-/Planner-Belege V4** | Codebefunde mit Schutzauflagen P1a–P1f: [Architekturaudit §13](recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) · [Opus/GPT](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md). Noch kein Patch |
| **Kontext und E3-Extraktion** | `relevant`-Teillieferung D3, enger E3-V-1-Hinweis (80-Zeichen-Validatorgrenze, echte spätere Präsenz), erst nach klarer Nachweistrennung; kein neues NPC-Speichersystem |
| **Ortschronologie O1-B1** | Kleine schlüssige `seq`-Normalisierung als möglicher Fachpatch; O1-Whitelist und V1-Frühankunft nicht empfehlen. [Fachplan einschließlich Gegenreviews](recherche/FACHPLAN_O1_O2_KAUSALITAET_UND_TEILBEWEGUNG.md). O2-stay nur nach Raumgranularitätsentscheidung |
| **K2 Monster A1/A2** | [Technischer Fachplan mit Opus/GPT §§8–9](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md). A1 fachlich bereit als Empfehlung; A2 abhängig von Loadouts, Verwertbarkeit, Altprofilen, gemischten Gruppen. Waffen in `DUNGEON AHEAD` vorerst zurückgestellt |
| **K1 Main/Minor** | Designbeschlossen, aber nicht implementiert; [umfangreicher Fachplan auf `.104`](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md), vor Codearbeit auf aktuellen Produkt-HEAD abgleichen |
| **Stealth S2** | S1 ist implementiert; lokale heimliche Search/TAKE zusätzlich nach [S1/S2-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md) auswählen und umsetzen |

Keine der aktuellen Empfehlungen ändert ohne ausdrücklichen Auftrag den Kanon oder Produktcode. Ein natürlicher NPC-/PULSE-Lauf ist für dessen *Pacing* nötig, blockiert aber keine unabhängige Entwicklerarbeit in getrenntem Checkout.

## 2. NPC- und PULSE-Reihenfolge

| Phase | Technischer Stand / nächste inhaltliche Grenze |
|---|---|
| **E0/E1** – Diagnose/Sofortkontinuität | In `.158` umgesetzt. |
| **E2-A/B** – Präsenz, Schalterwissen, Absprachen | In `.169–.173` umgesetzt, Pilotkorrekturen bis `.179`; natürliche Nachmessung offen. |
| **E3** – veränderbare `voice/manner/interest` | In `.174` umgesetzt, aber Pilot `.174` speicherte **0 Anker**; natürliche Nutzung offen. [Audit](recherche/NPC_E2_E3_KONTINUITAETSAUDIT_OPUS55.md) |
| **E4** – automatische Salienz, Beziehung | Noch keine Umsetzungsfreigabe. Erst nach realen E2/E3-Daten; optionale Pins getrennt. |
| **E5** – begrenzte Eigeninitiative/PULSE-Verbindung | Noch keine Umsetzung. Agenden mit kleinen glaubwürdigen Konsequenzen, keine NPC-Tick-Agenten. |
| **PULSE A/C/B** | Implementiert `.162–.168`. ROAD AHEAD nutzt das gemeinsame Fenster, Rast und Dungeonwanderungen sind integriert. [Fachplan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) |
| **PULSE D** | Später: natürliche Ereignisdichte, Unterbrechungen, Dungeonwanderer und Spielgefühl messen; erst danach Parameter ändern. |

## 3. Langfristige Kandidaten – historische IDs, bewusst knapp

Diese Kennungen sind Such-/Diskussionshilfen. Der ausführliche alte [33-Kandidaten-Katalog](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/07_ROADMAP_NACH_10B_ENTWURF.md) bewahrt historische Aufwandsschätzungen und Gegenreviews.

### NPCs und Welt

| ID | Noch relevante Idee |
|---|---|
| **W1** | Freie NPC-Livetests über mehrere Tage; nicht nur geplante Dialogfolgen. |
| **W2** | Persönliche Episoden, Absprachen, Entwicklung – kein zweites Dossier. |
| **W3** | Wiederkehrende Stadtfiguren/Orte auf vorhandenen Identitäten. |
| **W4** | Eigene NPC-Agenden, später kleine begrenzte Folgen. |
| **W5** | **PULSE A/B umgesetzt**; Ereignisdichte erst in D nach natürlichen Daten. |
| **W6** | **ROAD AHEAD umgesetzt**; keine zweite Reise-Ereignisuhr. |
| **W7** | **Rastunterbrechungen C/B umgesetzt**, sichere Unterkunft bleibt geschützt. |
| **W8** | Wenige spätere NPC-/Fraktionsuhren, keine passive Vollsimulation. |
| **W9** | Gerüchte aus legitimen Wissensquellen, Geheimnisse/Vermutung trennen. |
| **W10** | Story Sifting: nur Hinweise aus echten Events, keine neuen Quests/Fakten. |
| **T4** | Spielgefühl/Dialogsinn aus persönlichem Feedback, keine permanente LLM-Bewertung. |

### Handel, Tempo, Bedienung

| ID | Weiteres Ziel |
|---|---|
| **Q1** | Alternative Engine-Shops mit eigener Identität/Katalog/Preis; [Fachplan](patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md), nicht als Fallback für ungültige Belege. |
| **Q2** | Bekannte Boards/Offerten direkt sichtbar, keine neuen Preise/Quests. [Fachplan](patch_plans_10b/PATCH_ENGINE_BOARD_AND_TRADE_OFFERS.md) |
| **Q3** | Sichere Engine-only Rest-/Wait-/Reisewege, keine Teleports. |
| **Q4** | Search/Erkundung und echte Chase-/Flucht-Enden: vorhandene Mechanik natürlich prüfen, C0 vor neuer Terrain-/Speed-Simulation. |
| **Q5** | UI: `.161` Quest-/TAKE-Entwürfe umgesetzt, weiteres Journal/Karten-/Shop-QoL optional. |
| **T1** | Echtzeit/Kosten/Cache/Repair pro sinnvoller Handlung messen. |

### Kampf, Monster und organische Entwicklung

| ID | Weiteres Ziel |
|---|---|
| **K1** | Main/Minor designbeschlossen, technisch offen; [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md). |
| **K2** | Glaubwürdige Anatomie und Bewaffnung/Beute A1/A2; [aktueller Fachplan](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md). |
| **K3** | Sapienz, Population, Lage-/Fluchtverhalten getrennt; keine pauschale Aggressivität. |
| **K4** | Später einzelne ausführbare Signaturfähigkeiten/Resistenzen/Bosse; Main/Minor nur wo Aktionsökonomie betroffen. [Designanalyse](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **K5** | World-Skills (Licht, Barriere, Umwelt) mit belegten Effects. |
| **K6** | Summons/Begleiter erst nach Kosten-/Präsenz-/Aktionsautorität. |
| **K7** | Mehrband-AoE/Geometrie nur bei konkretem Bedarf; bestehende Band-AoE nicht neu bauen. |
| **K8** | F→E-/Wirtschafts-/Skillbalance aus repräsentativen Spielen, kein pauschaler Buff oder XP-Farmnerf. |
| **K9** | Spätere Ränge E→D bis S; offene B+-Budgetregeln, keine Pflichtskillbäume. |

### Quests, Abenteuer und technische Pflege

| ID | Weiteres Ziel |
|---|---|
| **Q6** | Höhere Gildenquests mit prüfbaren zusätzlichen Objectives. |
| **Q7** | Ruhende Delivery/Escort-Angebote nur nach konkreten Gegenfällen reaktivieren. |
| **Q8** | Überlappende Jagden erst ohne Doppelzählung/-zahlung. |
| **Q9** | Mehr Dungeonvielfalt statt eines fixen Kampf-/Raumkorridors. |
| **T2** | Gegner-/History-Kompression nur bei gemessenem Wachstum, IDs und Replay schützen. |
| **T3** | Legacy/B2/E-Reste erst nach echter Nutzungskarte entfernen. |
| **T5** | Gen4/Crafting/Resolver-/KI-Alternativen nur als expliziter isolierter Auftrag. |

## 4. Entscheidungsgates und Historie

- **Natürliche E2/E3-/PULSE-Qualität** vor E4/E5 und PULSE D; technische Regressionen sind dafür kein vollständiger Ersatz.
- **Kampf-K1** vor breiten Boss-/Summon-/Spezialaktiven, sofern deren Aktionsökonomie tatsächlich davon abhängt; kein prinzipielles Verbot isolierter kleiner Technikprototypen.
- **Monster A1/A2** unabhängig vom NPC-Test planbar; A2 verlangt die im Fachplan aufgeführten Designentscheidungen und Replay-/Legacy-Gegenproben.
- **Preisbelege und Spielerhoheit** vor Komfort-Shortcuts; nicht durch neue UI-Aktionen umgehen.
- **Quelle und Einzelfall** statt vorsorglicher Großrefactors. Originalbelege im [Runindex](testrun_10b/README.md), weitere offene Brainstormings in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

[Vorherige ausführliche Roadmap mit denselben historischen IDs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/07_ROADMAP_NACH_10B_ENTWURF.md) · [ältester vollständiger Kandidatenstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md). Keine neue Automatikfreigabe durch die Redaktion.
