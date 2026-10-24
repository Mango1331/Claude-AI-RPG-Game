# Avereth Engine – Aktueller Projekt- und Abnahmestand

**Stand:** 24.10.2026. Einzige aktuelle Statusübersicht; Git-HEAD vor technischen Aussagen prüfen. Einstieg nach [01 Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md); weitere Quellen nur auftragsbezogen. Frühere Statusberichte stehen vollständig im [historischen Archiv](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md).

## Produkt

- **Repository:** [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game).
- **Entwicklungsbranch:** `claude/c-planner-prototype-2026-10-02-gpt-c666`; `main` führt Dokumentation/Archive. Spätere Dokumentationscommits ändern den Produktstand nicht.
- **Letzter verifizierter Produktcommit:** [`7bfb7f25`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7bfb7f25e4d1dd2130d5f01f35a0d7c1bf880cdd), Build **4.3.0-c.6.6.67** in `src/util.js`, `manifest.json`, `package.json`. Narrator-Vertrag **.55**.
- **Aktiver Pfad:** V4-C/semantischer Planner, Regelstand 2 für neue Kampagnen; Regelstand 1 bleibt Legacy.

Das LLM gestaltet und interpretiert die Welt; die Engine kontrolliert Zahlen, Aktionen und persistenten Zustand. Vorhanden sind Living Dungeons, Gildenquests, Auto-Loot sowie die freigegebenen Patch-9-Grundlagen: Warrior/Mage/Rogue, zwei wählbare Starter-Skills plus Basic Attack, organischer Skill-/Passive-Erwerb, Proficiency, Skill-Evolution und F→E-Klassenentwicklung. Höhere Klassenränge und endgültige Zahlenbalance sind offen. Kanon: [02](02_DESIGN_KANON.md).

**10B umgesetzt:** Fakten-/Registrierungsfix `.58`; Delivery/Übergaben `.59–.60`; Planner-Recovery `.61`; Extractor-/Host-/Reload-Recovery und Telemetrie `.62–.65`; initiale ST-Swipe-ID-Normalisierung `.66`; auf ausdrücklichen Nutzerauftrag Kampf-/Quest-XP ×2 nach Rundung `.67` ([Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_XP_REWARDS.md)). Technische Einzelbelege sind über das [10B-Journal §§13–26](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#13-sols-unabhängiger-drei-run-gegenreview-folgeabstimmung-und-der-erste-implementierungsauftrag-24102026) erreichbar. Die [frühere technische Übergabe](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md) ist historisch.

## Abnahme

| Nachweis | Verifizierter Umfang und Grenze |
|---|---|
| **Node .67, von Sol ausgeführt** | **1429/1429**, darunter drei neue XP-Regressionen (vorher 3/3 rot, danach grün). Kein neuer .67-ST-/GLM-Lauf. |
| **Node .66, von Sol ausgeführt** | 1426/1426 gesamt, World-Jobs 19/19. ChatGPT prüfte Diff/Testcode unabhängig, wiederholte diese Läufe dabei nicht. |
| **ST .66, echter Browser, Mockprovider** | Finaler `smoke:st:c` 21/21, fünf Extractor-Calls; vier aktuelle gespeicherte Story-Records jeweils einmal `extract.applied`. .65-Gegenprobe scheiterte. Erster .66-Versuch 20/21 wegen zweier PageErrors; Ursache offen. |
| **Natürliche GLM-Runs** | Vier historische .57-Runs endeten nach 26/25/21/61 Inputs. .65-Run 5 blockierte bei `pending` nach 3 Inputs; in .66 adressiert. **Run 6 auf .66: 35/100 natürliche Inputs, 32/32 Story-Extraktionen angewendet, 1 vollständiger Hound-Cull-/Guild-Payout, dann regelkonformer Tod im ersten Dungeon-Encounter** (3 Skelette Lv4/3/2 gegen Mage Lv1). **Kein 100-Züge-Abnahmelauf**, kein neuer Host-Hänger. [Originalreview](testrun_10b/20261024-104654Z-current_test/REVIEW.md). |
| **F→E-Klassenentwicklung** | Gezielter .57-ST/GLM-Fixture-Lauf: 23 Züge, 5/5, Save/Reload. Level-1–14-Vorgeschichte synthetisch; keine natürlich gespielte Gesamtlaufbahn. |
| **Kampfsimulator** | Reproduzierbar vorhanden; frühere umfangreiche Messungen durch PC-/NPC-Taktikasymmetrie begrenzt, keine Balancefreigabe. |

Vollständige .66-Testfolge einschließlich Fehlversuch und Save-Prüfung: [Hotfixnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C2_SWIPE_ZERO_HOTFIX.md); unabhängiges Codeurteil: [06 §26.2](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#262-unabhängiges-chatgpt-gegenreview-zu-build-66-24102026). Originalruns und jeweiliger ZIP-Archivstatus: [Testindex](testrun_10b/README.md). Run-4/5-ZIP-Upload zuletzt nicht bestätigt.

## Offen und nächster Schritt

**Neuester natürlicher Abnahmestand:** [Run 7 auf .67](testrun_10b/20261024-120700Z-current_test/REVIEW.md): **100/100 freie Spielerinputs**, Ende `done`, **95/95 Storyextraktionen gebucht**, Engine 1.460 Events/`integrity:OK`, keine Page-/Serverfehler und kein technischer Host-Blocker. **Level 2 erst nach vier Wolfsiegen** (4×24 Combat-XP) und einem Gildenabschluss (46 Quest-XP): 142 Gesamt-XP → Level 2, 42 Rest-XP, 5 verteilte Statpunkte. Ein weiterer DELIVERY-Auftrag wurde trotz echter Kofferübergabe nicht verbucht und später aufgegeben. Details/Originalbelege ausschließlich im Run-Review.

**Nächster sinnvoller Fachpatch: 10B-3B** (nach ausdrücklicher Codefreigabe), mit drei tatsächlich belegten Eingriffen: **P1-Guild-Lieferbeweis** (Koffer an Quest gebunden, `object.moved` zu Garrett, wegen falschem `cargoMatches` aber kein `quest.delivered`), **P1 Erwerbsarbeit vs. bezahlter Service** (falsche `coin.changed`-Abbuchungen) und **Phantom-Board-Listings** (angezeigte, nicht tatsächlich autorisierte Angebote). Beleg und Negativfälle im [Run-7-Review](testrun_10b/20261024-120700Z-current_test/REVIEW.md); Fachspezifikation auf Dev in `docs/PATCH10B3_GUILD_BOARD_AUTHORITY_PLAN.md`. **Keinen separaten Mini-Hotfix und keine weitere XP- oder HP-Korrektur vor dieser Ursachenbehebung.** 10B-3A (Combat-Truth) und 10B-4D (Narrator-Empty-Recovery) sind unabhängig weiterhin nicht implementiert; Monster/Loot und Chase bleiben nicht freigegebene Designkandidaten.

**Quellcode bei konkretem Auftrag:** `src/v4/delivery.js` für gebundene Originalfracht/Ziel-NPC/Ort, die vorhandenen Guild-/Board-/Private-Offer-/Transaction-Pfade sowie die betroffenen Quest-/World-Consumer. Narrator-Prosa ersetzt keine persistierten `quest.delivered`-/`transaction.completed`-Events. Archive [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md)/[05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md)/[06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) nur gezielt nachschlagen.
