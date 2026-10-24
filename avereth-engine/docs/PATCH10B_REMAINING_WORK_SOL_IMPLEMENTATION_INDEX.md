# Avereth Engine – Patch 10B: offene Fachpläne

**Fachindex, keine Implementierungsfreigabe.** Aktueller Produkt-, Test- und Abnahmestand ausschließlich in [03](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md); verbindliche Arbeitsweise in [01](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/01_ARBEITSWEISE_CHATGPT_CLAUDE.md). Der Entwicklungsbranch kann seit dem datierten Entwurf fortgeschritten sein: HEAD, Build und Originalrun vor Auswahl prüfen. Die historischen Implementierungs- und Testnachweise stehen im [10B-Journal §13–26](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md); die [technische .58–.66-Übergabe](PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md) ist eine **datierte Nachschlagequelle**, keine Pflichtlektüre.

## Fachpläne und Entscheidungen

| Fachpaket | Direkte Spezifikation | Offener Entscheidungspunkt |
|---|---|---|
| **10B-3 Combat und Kampfchronik** | [Kampfeskalation/Truth](PATCH10B3_COMBAT_ESCALATION_AND_TRUTH_PLAN.md) | Drohung ≠ Angriff; echte Ambushes zulassen, Phantom-Aktionen nicht speichern; noch nicht implementiert |
| **10B-3 Guild-Authority** | [Offizielles Board](PATCH10B3_GUILD_BOARD_AUTHORITY_PLAN.md) | Keine erfundenen offiziellen Listings, private NPC-Aufträge weiterhin zulässig; noch nicht implementiert |
| **10B-4d Narrator-Recovery** | [Leere Story-Antwort](PATCH10B4D_NARRATOR_EMPTY_RECOVERY_PLAN.md) | Vor Umsetzung ST-Host-Swipe/Regenerate-Lifecycle nachweisen; keine doppelten Playerturns |
| **Monster und Loot** | [Anatomie-korrektes Auto-Loot](PATCH10B_MONSTER_ANATOMY_AND_LOOT_CANDIDATE.md) | **Design-/Bugfixkandidat, nicht freigegeben**; freie Species und bestehende Anker erhalten |
| **Chase und Flucht** | [Bestehenden Chase nutzen](PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md) | **Designkandidat, nicht freigegeben**; kein zweites Bewegungssystem |

Die jeweiligen Fachdateien enthalten **Problem, relevante Sourcepfade, Positiv-/Negativfälle und Abnahmegrenzen**. Bei Auftrag nur die passende Fachspezifikation und betroffene Originalquellen lesen. Die neuen Pläne wurden bisher nur geschrieben, nicht als Feature umgesetzt oder live abgenommen.

## Reihenfolge

1. **Vor nächster Produktfreigabe:** echten natürlichen `.66`-`current_test` anhand der vollständigen ZIP auswerten (Build/Git-SHA, Chat, Events, Completion-Requests, Recovery- und Hostfehler); die vergangene `.65`-Timeout-Ursache nicht mit einer bestandenen .66-GLM-Kampagne verwechseln.
2. Neue bestätigte P0-Integrationsfehler zuerst eingrenzen; sonst **ein** sachlich zusammenhängendes Fachpaket nach Spielerwirkung und ausdrücklicher Nutzerfreigabe umsetzen. Unabhängiger Diff-Review danach, ST-Smoke bei Host-/World-Job-Änderungen. Keine Minipatch-Pflicht.
3. Monster-/Chase-/Balancingmaßnahmen erst nach eigener Designfreigabe. Neue Spielmechaniken bleiben Ruleset-2-spezifisch; Legacy/Replay/Swipe schützen.

**Kleiner offener Wartungspunkt F60-2:** `src/v4/world.js:additionalContainerReturn` erkennt nicht jede erst nachträglich erfundene Behälterrückgabe. Negative/positive Regressionen: `You must bring back the empty crate` und `The crate must go back` unberechtigt neu → verhindern; `The wagon must be back by noon` oder im Originalvertrag ausdrücklich vereinbarte Rückgabe → nicht verbieten. Kein globaler `must/back`-Filter und kein neues Questregelwerk. Nach Freigabe als kleine Ergänzung zur bestehenden [Delivery-Folgepatchnote](PATCH10B2B_DELIVERY_FOLLOWUP.md), nicht als Großpatch.

**Weitere offene Optionen:** XP/Farming, Wirtschaft/Stonepreise, Monster-Sapienz/-Effekte, Blink, Reise-/Tageszeit, Performance und 100/500/1.000-Züge-Stabilität. Befundstand in [03](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md), Designabwägung bei Bedarf [06 §§5–11](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md); keine stillschweigende Zahlenfreigabe. Neue technische Ergebnisse in der jeweiligen **bestehenden Patchnote**, kurze Statusänderung in 03 und gegebenenfalls Entscheidung/Link in 06.
