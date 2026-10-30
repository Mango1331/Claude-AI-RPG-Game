# Avereth Engine – Patch 10B: Fachthemen und Quellenwegweiser

**Stand: 30.10.2026.** Kein zweiter Produktstatus: Build, Tests und nächste Schritte stehen in [03](03_AKTUELLER_PROJEKTSTAND.md), Regeln in [02](02_DESIGN_KANON.md), Originalreviews im [Runindex](testrun_10b/README.md). Alte „offen“-/„als Nächstes“-Angaben sind historische Momentaufnahmen, keine Freigaben.

## 1. Laufende Fachbereiche und Entscheidungsgrenzen

| Bereich | Maßgebliche Quelle / Grenze |
|---|---|
| Architektur nach .126 | [Konsolidierter Fachplan aus vier Reviews](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md). Integrität/Testbasis, Variantenabbau, Kreaturen/Jagd, Gearangebote; **letzte Gegenprüfung, keine Produktfreigabe**. Alte Kampagnen keine Kompatibilitätsgrenze; Delivery bleibt ruhend. [Originalkorpus Batch1–19](testrun_10b/ARCHIV_BATCHES.md). |
| Natürliche GLM-/ST-Langläufe | [Runindex](testrun_10b/README.md). Technische Stopps, sichere Fortsetzung, verlorene Aktion, regelgebuchter Tod und manuelles Ende unterscheiden. Nächster Schritt nur in 03. |
| Combat Main/Minor | [Fachplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md), [02 §5](02_DESIGN_KANON.md#5-kampf-und-progression). Design beschlossen, **nicht implementiert**; Planbasis .104 vor Freigabe neu abgleichen. |
| F-/E-Balance | F-Testpolicy und AoE sind bereits implementiert; endgültiges Balancing und natürlicher Level-15-Übergang offen. [Balancebeobachtungen](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md), [Sol-Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [GPT-Entwurf](testrun_10b/scaling_gpt.md). Historische Vorschlagszahlen sind kein aktueller Sollwert. |
| Spätere Erweiterungen | [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md): Monsterdesign, Gedächtnis, Rastgefahr, Zustandsverdichtung, freiere Quests. Keine automatische Implementierungsfreigabe. |

## 2. Produktgeschichte: nur die für 10B relevanten Fixketten

Abgeschlossene Arbeit nicht aus alten Plänen erneut starten. Die verlinkten **Produktcommits/Fachpatchnotes** beschreiben die tatsächliche Umsetzung; Testzahlen werden hier nicht dupliziert.

| Builds | Ergebnis | Produktbeleg |
|---|---|---|
| .58–.66 | Delivery-/Guardnachweise, Recovery, ST-Host-/Swipe-Lifecycle | [Archiv §§19–26](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), [.66](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/4cd9b338773783644a79a39f367629e6aaeead05) |
| .67, .91 | XP×2; neue PC-Basiswerte7 | [.67 Notiz](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_XP_REWARDS.md), [.91](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b55a897) |
| .79–.82 | Dungeon-Slotidentität/Anwesenheit, Lieferdeskriptoren, szenengebundene World-/Questbelege | [abgeschlossener Run-12-Plan](patch_plans_10b/PATCH_RUN12_DUNGEON_GUILD_WORLD.md) |
| .83–.87 | Keine neuen formalen Privatquests; NPC-Kontinuität, World-Objektreferenzen, Board4+1 / 5 ohne neue Deliveries | [.83](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b70bd1f), [.85](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/2bab566), [.86](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/64f11dc), [.87](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1584dd7) |
| .88–.100 | Handel/Ziel-/Ortsautorität, Dungeon-Erstkontakt, erreichbare F-Lernquellen, Habitate und Vorbatch-Kauf-/Ankunftsregeln | [.96](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f50ca4e), [.97](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b51a6f1), [.98](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c1ed54b), [.99/.100](patch_plans_10b/PATCH_PRE_BATCH_TECHNICAL_RUN22.md) |
| .101–.110 | Recovery/Handelsverträge, sichere Modellfehlerfortsetzung, Persistenz-/Erzählbelege; keine Combat-Neuarchitektur | [.101](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c9e3fa5), [.103](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/48bdf5d), [.104](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9ffa2c), [.105–.110](patch_plans_10b/PATCH_FAILSOFT_AND_BATCH4.md) |
| .111–.113 | Registrierungsgebühr atomar, abgeschlossene Charaktererstellung im Kontext, zweckgebundene Zahlungen und Dungeon-Floor-Anzeige | [.111](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/f93bb84), [.112](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d9c259f), [.113](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/55c547f) |
| .114–.116 | Experimentelle F-Waffen-/PP-/Lohnkalibrierung, Provider-/Habitat-/Boardkorrekturen, AoE-Starterversuch | [.114](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/89aaf08), [.115](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/9c65e9a), [.116](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/41a17fc) |
| .117–.120 | Generative Gildenfilialen, Vorfahren-/Geldschutz, kanonische Hallenziele, vorläufig keine doppelten gezählten Jagden | [.117](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a9a76eb), [.118](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/1da4756), [.119](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b09274c), [.120](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f) |
| .121 | Gemeinsamer XP-Faktor2→5, unveränderte Levelschwellen; bereits gebuchte Beträge bleiben erhalten. Warrior-Einkaufsversuch aus7f96131 enthalten. | [00fa7f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f11567067da59f8a89e94a49f4c2618464f), [XP-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00fa7f11567067da59f8a89e94a49f4c2618464f/avereth-engine/docs/PATCH10B_XP_REWARDS.md) |
| .122 | Batch16: eigene Ich-/Wir-Preisofferte, präzise Dungeon-Hinderniszuordnung und eindeutige NPC-Kurznamen; vorhandene Mechaniken bleiben erhalten. | [013e0dc](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/013e0dca9e7b76519e03a2424651d54a0393a0f8), [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/013e0dca9e7b76519e03a2424651d54a0393a0f8/avereth-engine/docs/PATCH_BATCH16_FALSE_REFUSALS.md) |

## 3. Natürliche Batchkette und neueste Rückschlüsse

Einmaliger chronologischer Index: **[testrun_10b/README.md](testrun_10b/README.md)**. Dort und bei den Originalreviews stehen Builds, Stopps, Gegenbewertungen und ZIP-Verfügbarkeit. Keine zweite Run-Tabelle hier. Aktuelle Rückschlüsse und nächste Beobachtung in 03; ältere Detailfassung dieses Indexes [auf 7994fa4](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## 4. Spätere Designfragen – vorgemerkt, nicht zur Implementierung freigegeben

Maßgeblich im [Ideenkatalog04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md), nicht doppelt hier planen. Insbesondere: kein vollständiger Spezieskatalog, keine automatische Monster-Levelanpassung, kein pauschaler XP-/Farmnerf und keine neue NPC-Simulation. Gegnerverdichtung muss individuelle Quest-/Slot-/Bosscredits sowie Replay/Swipe schützen. Überlappende Jagden mit individueller Kill-Zuteilung bleiben Zukunftsidee.

## 5. Pflege- und Reviewregel

[01](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) regelt die Arbeit. Ein Review oder Plan ist keine Codefreigabe. Technik nur in der Fachpatchnote, Originalanalyse beim Run, aktueller Status in 03. Das ausführliche frühere Journal mit §§0–32 bleibt [auf 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) erhalten; frühere Ketten nur bei konkretem Bedarf lesen.

