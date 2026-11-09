# Avereth Engine – 10B-Fachindex und historische Entscheidungen

**Stand: 05.11.2026.** Quellenwegweiser, keine zweite laufende Status- oder Testliste. [Aktueller Stand 03](03_AKTUELLER_PROJEKTSTAND.md) · [Kanon 02](02_DESIGN_KANON.md) · [Roadmap 07](07_ROADMAP_NACH_10B_ENTWURF.md) · [Originalruns](testrun_10b/README.md).

## Teilabnahme 04.11.2026

10B begann als Balance-/Pacingarbeit und wurde durch natürliche Langläufe hauptsächlich zur technischen Integrations- und Persistenzstabilisierung. **.154 / `2482da2` ist auf Nutzerentscheidung als Zwischenstand für persönliche Spieltests teilabgenommen.** Daraus folgt keine Endprodukt-, Balance- oder automatische Featurefreigabe. Weitere Zuverlässigkeit bleibt laufende Arbeit; zusätzliche große Batchserien sind keine Pflicht.

Alte Schwellenideen und deren Diskussion werden nicht erneut als Entscheidungsgate verwendet. [Ungekürzter Stand vor dieser Straffung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [ursprüngliches Journal §§0–32](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf449/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Historische Zahlen bleiben Originalbefunde, keine heute neu gemessenen Quoten.

## Fortbestehendes Qualitätsziel: zuverlässige natürliche Kampagnen

| Befundklasse | Bewertungsmaßstab |
|---|---|
| **A – fortsetzbar, Integrität erhalten** | Sichere Recovery oder lokaler Erzählfehler kann tolerierbar sein; Häufung, verlorene Handlungen und Zusatzschritte bewerten. |
| **B – fortsetzbar, Integrität verletzt** | Falsche Geld-/Waren-/Quest-/Kampf-/Worldbuchung ist trotz laufendem Prozess kein intakter Erfolg. Schwere und Fortwirkung entscheiden. |
| **C – technisch blockiert/abgebrochen** | Terminaler Host-/Save-/Modellfehler oder unauflösbare Handlungsschleife; auch ein deshalb manueller Stopp zählt als technische Blockade. |

B und C können gemeinsam vorliegen. Regelgerechter Tod, reguläres Limit oder freier manueller Stopp sind für sich keine Technikfehler; kurze Tode liefern wenig Langlaufabdeckung. Engine-, Modell-, Provider-/Windows- und Runnerursachen trennen. Ein grüner Validator beweist keine semantisch richtige Handlung, ein `completed`-Runnerstatus keinen erreichten Levelmeilenstein. Prüfablauf und Evidenzarten ausschließlich in [01](01_ARBEITSWEISE_CHATGPT_CLAUDE.md).

## Fachpläne und Quellenwegweiser 10B

| Fachgebiet | Maßgebliche Detailquelle |
|---|---|
| Architektur A/B1/C/D, Population/Alter und Handelsautorität | [Konsolidierter Architekturplan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). A/B1/C/D sind Produktgrundlagen; B2/E-Historikbereinigung nur nach konkretem Auftrag. |
| Start-/Makro-, Host- und Failsoft-Fixkette | [Historischer Fachindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#produktgeschichte--nur-commitwegweiser), [Failsoft-Fachplan](patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md). |
| Freie Zahlungen und verbindliche Endpreise | [Finanzvereinfachung](patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md), [.144 Umsetzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX144_FINANCE_SIMPLIFICATION.md), [.145 Persistenz](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX145_PAYMENT_PERSISTENCE.md). |
| Handels-/Boardintegration und Save-/Kaufauswahl | [.146](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX146_BATCH21_TRADE_BOARD.md), [.147](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX147_BATCH22_SAVE_SELECTION.md). Ein späterer Engine-Shop ist ein eigener Entwurf. |
| Kampf-QoL und organische Skillentwicklung | [.148 AoE/Seitenschutz](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/DESIGN148_COMBAT_QOL.md), [.149 Skillwachstum](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/DESIGN149_SKILL_GROWTH.md), [Designgrundlage](patch_plans_10b/DESIGN_BATCH22_COMBAT_PROGRESS_SHOPS.md). |
| Stealth als Vorgehensweise | [S1/S2-Fachplan](patch_plans_10b/PATCH_STEALTH_ACTION_MANNER.md), [.155](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX155_STEALTH_MOVEMENT.md), [.156](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX156_STEALTH_MANNER.md). Produkt-/Naturtestgrenzen in 03. |
| User01-UI und Band-AoE | [U1–U3-Fachplan](patch_plans_10b/PATCH_USER01_UI_QOL.md), [.157 Umsetzung/Abnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/FIX157_USER01_UI_QOL.md). |
| **.159 User03-Boardfix** | [Repair- und Verfügbarkeitskorrektur samt Implementiererabnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/2089dccdb7fd3dc08c72c5737c6b111fb6512f56/avereth-engine/docs/FIX159_USER03_BOARD.md). Introgrenzen und Zahl der Generatorversuche unverändert. |
| **.158 User02-Technik + NPC E0/E1** | [Produktpatchnote und Implementiererabnahme](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/82c2e7e90bd8425d00ef2e8ab3a2dcb66b64adc6/avereth-engine/docs/FIX158_USER02_NPC_CONTINUITY.md). Unabhängiger Gegenreview und längere natürliche Kontinuitätsabnahme stehen aus; der kurze User03 liefert erste positive Auslieferungsdaten. |
| NPC-/PULSE-Live-Runner (`2449990`/`2a8b54e`) | [Unabhängiger Kontrollreview und Nachreview des Auswerterfixes §7](patch_plans_10b/REVIEW_NPC_PULSE_RUNNER_2449990_GPT.md). Natürlicher Pilotlauf vorbereitet; seltener P3-Statusrandfall bei fehlendem Laufarchiv offen. Spielengine bleibt `.174`. |
| NPC E2-A / E2-B / E3 – neue Fachpakete | [Fachplan und Entscheidungen](patch_plans_10b/NPC_E2_E3_FACHPLAN.md), [E2-B `.173`-Kontrollreview](patch_plans_10b/REVIEW_NPC_E2B173_PRODUKTDIFF_GPT.md), [E3 `.174`-Kontrollreview](patch_plans_10b/REVIEW_NPC_E3_174_PRODUKTDIFF_GPT.md). Produktpatchnotes und Testzahlen im jeweiligen Review; aktueller Stand nur in 03. |
| NPC-Kontext, freie Fakten und Gildenwissen | [Brenna-Ursachenanalyse einschließlich GPT-/Sol-Gegenreviews §§9–10](recherche/NPC_KONTINUITAET_ANALYSE_20261104.md); [User02-Sol-Nachtrag §8](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md#8-abgeschlossener-sol-gegenreview--originalfold-requests-und-ursachenprüfung) ergänzt tatsächliche Tam-Requestnachweise. |
| Dungeon-/Floorgrenze, Exit und Raumsuche | [User02-Originalreview und Gegenproben](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md#8-abgeschlossener-sol-gegenreview--originalfold-requests-und-ursachenprüfung), [Messdaten](testrun_10b/user-20261105-050449/SOL_PROBE_RESULTS.json). Ausgangsbefund für .158. |
| Bekannte NPC-verwahrte Gegenstände im Ankunftskatalog | [Batch28 §3](testrun_10b/batch-20261103-171839Z/REVIEW.md#3-rüstungsidentität-153-übergabe-funktioniert-rückgabe-verliert-den-objektkontext), [Gegenproben](testrun_10b/batch-20261103-171839Z/PROBE_RESULTS.json). |
| Kampf-Flucht/Chase | [Vorhandene Mechanik und C0/C1–C3-Abgrenzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b31123ffb4d3f5c404d6add85449ea869ed415ee/avereth-engine/docs/PATCH10B_CHASE_ESCAPE_PACING_CANDIDATE.md). Kein neues Chase-System beschlossen. |
| Main/Minor und spätere Erweiterungen | [Main/Minor-Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md), [Roadmap 07](07_ROADMAP_NACH_10B_ENTWURF.md), [Ideenarchiv 04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md). |

## Produktgeschichte – nur Commitwegweiser

Abgeschlossene Patchketten und alte Testzahlen werden hier nicht erneut ausgeschrieben. [Fixierter Index bis .157](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/55d20eaf65f521a25ea3e85cfa3390e215270683/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#produktgeschichte--nur-commitwegweiser) führt zu jedem Fachabschluss; die jeweilige Produktpatchnote beschreibt Implementierung, Regressionen und damalige Abnahme. Ältere Branchversuche in [05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md), Stand bis 24.10. in [03-Archiv](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md).

## Natürliche Originalbelege

Aktuelle Einstiegspunkte: [User02/.157](testrun_10b/user-20261105-050449/REVIEW_CHATGPT.md), [User01/.155](testrun_10b/user-20261104-162404/REVIEW.md) und [Batch28/.154](testrun_10b/batch-20261103-171839Z/REVIEW.md). Sämtliche weiteren Zuordnungen im [Runindex](testrun_10b/README.md); Originalarchive im [Archivindex](testrun_10b/ARCHIV_BATCHES.md). Keine zweite vollständige Runchronik hier.

**Pflege:** Neue Fachquellen hier verlinken; Tests und Umsetzung in Produktpatchnotes, Originalbewertungen beim Run, laufenden Status nur in 03 pflegen. Eine neue Review ändert weder Produktcode noch Freigabestatus.
