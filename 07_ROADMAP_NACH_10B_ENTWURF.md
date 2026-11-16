# Avereth Engine – Roadmap nach 10B

**Stand 16.11.2026 · **ON HOLD** bis zum Abschluss der dynamischen GM-/Modellarchitekturprototypen. Diese Datei bleibt ein **pausierter Themen- und Ideenspeicher**, keine aktive Arbeitsreihenfolge.** [Start](README.md) · [aktuelle Abnahme 03](03_AKTUELLER_PROJEKTSTAND.md) · [verbindliche Regeln 02](02_DESIGN_KANON.md) · [Fachquellen 06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Alle historischen Kennungen bleiben auffindbar, **keine automatische Rangfolge oder Freigabe**.

## 1. Fachliche Etappen – vollständig pausiert

**Aktive Architektur-Reihenfolge statt Gameplaypatches:** isolierter dynamischer GM-/Engine-Prototyp auf [`experiment/dynamic-gm-model`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model) → angepasster isolierter ST-1.19-Hostdurchstich (Mockprovider) → separat freizugebender kleiner natürlicher LLM-Qualitätsvergleich → erst danach Produktentscheidung und Repriorisierung. [Astra-Ultra-Grundsatzentscheidung](recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md) · [Status 03](03_AKTUELLER_PROJEKTSTAND.md). **Nicht parallel an den folgenden Gameplaythemen implementieren.**

| Etappe | Stand / verbleibende Entscheidung |
|---|---|
| **Späterer persönlicher User-Test** | **Pausiert bis zu Architektur- und Providerklärung**; bisherige Beobachtungspunkte ([GPT-Kontrollreview .192](patch_plans_10b/REVIEW_BUILD192_GPT_KONTROLLPRUEFUNG.md)). Schwerpunkte: B5-Ebenenwechsel und Boss, Stadt- gegen Außenjagd, NPC-Wiedersehen, Kampfgefühl. Kein Automatik-Vollbatch nur wegen `.192` |
| **Bossloot V1** | **Umgesetzt .193/.194 und regulär gemergt** ([Entscheidungen](patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md) · [Fachplan](patch_plans_10b/FACHPLAN_BOSSLOOT_BESONDERE_BELOHNUNGEN.md)). Aktueller Abnahmestand ausschließlich in [03](03_AKTUELLER_PROJEKTSTAND.md) |
| **Kampf: Angriff mit Annäherung** | [Kampffachplan .192](patch_plans_10b/FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md): Variante A (offene Reichweitenentscheidung, keine Buchung) als kleiner UX-Schritt möglich. B (Teilbewegung außerhalb des Kampfes) nach Designentscheidung. C/D (Konter, Teilbewegung im Kampf) erst mit K1 |
| **Rang-/Qualitätskalibrierung der Ausrüstung** | [Analyse .195](recherche/AUSRUESTUNG_KAMPFBALANCE_ANALYSE_195_2026-11-15.md) mit echten Werten und Simulationen vorhanden; Varianten unbeschlossen, keine Nebenänderung |
| **Orte/Reisen/Dungeons** | `.190–.192` umgesetzt, Bewegungsautorität natürlich bestätigt. Offen: natürliche B5-Ebenenwechsel und Boss, Elternszenen-Verluste (Schutz bleibt); der enge Witwe-Hesse-Präsenzfall wurde in `.199` korrigiert |
| **Natürliche NPC-/PULSE-Qualität** | `.191`-Batch nur Warrior vollständig. Rogue/Mage nach Provider-Guthaben neu; E3 seit `.183` natürlich belegt, E4/E5 und PULSE D erst danach |
| **Preis-/Planner-Belege V4** | P1a–P1e codebelegt, nicht umgesetzt ([Architekturaudit §13](recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md) · [Opus/GPT](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md)); aus P1f nur die enge Planner-Behandlung in `.187` |
| **K1 Main/Minor** | Designbeschlossen, nicht implementiert; [Fachplan auf `.104`](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) vor Codearbeit auf den aktuellen HEAD abgleichen |
| **Stealth S2** | S1 implementiert; heimliche Search/TAKE nach [S1/S2-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md) |
| **Erkundungsloot, Tatenbuch, Bossstärke, weitere Klassen-/Statprogression** | Eigene spätere Entscheidungen; PC 5+0 bereits umgesetzt, NPC-Angleichung/Rare+-Wachstum weiterhin offen |

**Sperre:** Keiner dieser Punkte ist während der GM-Architekturphase freigegeben – auch nicht als scheinbar kleiner Nebenfix in einem getrennten Checkout. Natürliche NPC-/PULSE- und Kampf-/Balancebewertungen sowie Wiederaufnahme der Feature-Roadmap erst nach ausdrücklicher Nutzerentscheidung. Bereits implementierte Builds bleiben als Baseline unverändert.

## 2. NPC- und PULSE-Reihenfolge

| Phase | Technischer Stand / nächste inhaltliche Grenze |
|---|---|
| **E0/E1** – Diagnose/Sofortkontinuität | In `.158` umgesetzt. |
| **E2-A/B** – Präsenz, Schalterwissen, Absprachen | In `.169–.173` umgesetzt, Pilotkorrekturen bis `.179`; `met` am erreichten Ort seit `.192`. Belegprüfung kennt Ankunftsverben nicht (Falsch-Negativ, beobachten). |
| **E3** – veränderbare `voice/manner/interest` | In `.174` umgesetzt, V-1 in `.183`; natürlich belegt seit `.183` (9 Anker), Ankeränderung kaum abgedeckt. [Audit](recherche/NPC_E2_E3_KONTINUITAETSAUDIT_OPUS55.md) |
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
| **K2** | Anatomie und Bewaffnung/Beute A1/A2 umgesetzt ([Fachplan](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md)); **Bossloot V1 umgesetzt** ([U1–U11](patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md)). |
| **K3** | Sapienz, Population, Lage-/Fluchtverhalten getrennt; keine pauschale Aggressivität. |
| **K4** | Später einzelne ausführbare Signaturfähigkeiten/Resistenzen/Bosse; Main/Minor nur wo Aktionsökonomie betroffen. [Designanalyse](recherche/MONSTERDESIGN_ANALYSE_20261028.md). |
| **K5** | World-Skills (Licht, Barriere, Umwelt) mit belegten Effects. |
| **K6** | Summons/Begleiter erst nach Kosten-/Präsenz-/Aktionsautorität. |
| **K7** | Mehrband-AoE/Geometrie nur bei konkretem Bedarf; bestehende Band-AoE nicht neu bauen. |
| **K8** | F→E-/Wirtschafts-/Skillbalance aus repräsentativen Spielen, kein pauschaler Buff oder XP-Farmnerf; dazu die Rang-/Qualitätskalibrierung der Ausrüstung. |
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

- **Vor allen alten Gates:** dynamischen GM-Prototyp, isolierten Hostdurchstich und kleinen natürlichen Qualitätsvergleich abschließen; anschließend die gesamte bisherige Fachroadmap neu priorisieren oder ändern. Die folgenden Gates sind historische fachliche Abhängigkeiten, derzeit **nicht aktiv**.
- **Natürliche E2/E3-/PULSE-Qualität** vor E4/E5 und PULSE D; technische Regressionen sind dafür kein vollständiger Ersatz.
- **Kampf-K1** vor breiten Boss-/Summon-/Spezialaktiven, sofern deren Aktionsökonomie tatsächlich davon abhängt; kein prinzipielles Verbot isolierter kleiner Technikprototypen.
- **Monster A1/A2** umgesetzt (`.184`/`.186`); offen nur A2-4 und die Nachjustierung der Designzahlen. **Bossloot V1** einschließlich U1–U11 umgesetzt; weitere Balanceänderungen bleiben getrennt zu entscheiden.
- **Preisbelege und Spielerhoheit** vor Komfort-Shortcuts; nicht durch neue UI-Aktionen umgehen.
- **Quelle und Einzelfall** statt vorsorglicher Großrefactors. Originalbelege im [Runindex](testrun_10b/README.md), weitere offene Brainstormings in [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

[Vorherige ausführliche Roadmap mit denselben historischen IDs](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/07_ROADMAP_NACH_10B_ENTWURF.md) · [ältester vollständiger Kandidatenstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/834fcd33de0f5043becf981bb16d675a6cdf0f73/07_ROADMAP_NACH_10B_ENTWURF.md). Keine neue Automatikfreigabe durch die Redaktion.
