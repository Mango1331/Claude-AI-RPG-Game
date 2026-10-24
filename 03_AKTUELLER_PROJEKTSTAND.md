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

**Ausgewertet ist der erste natürliche `.66`-Lauf** ([Run 6](testrun_10b/20261024-104654Z-current_test/REVIEW.md)): 35 Inputs, regulärer Charaktertod, Host-/Quest-/Dungeon-Hauptpfad bis dahin positiv. **Nächster Schritt:** weitere unveränderte natürliche `current_test`-Läufe für die 100-Züge-Zuverlässigkeit und andere Startklassen sammeln oder auf ausdrücklichen Auftrag einen bereits getrennt geplanten 10B-Fachpatch priorisieren. Die freigegebene XP-Verdopplung auf .67 ist der erste Balanceversuch; ihre Spielwirkung im nächsten natürlichen Run beobachten. Weitere Zahlenänderungen sind nicht freigegeben. Screenshot-/Swipe-Reentry/Reload und früher sporadische PageErrors bleiben gesonderte Testfelder.

**Noch nicht implementiert:** Kampfeskalation/Kampfchronik und Gildenboard-Authority (10B-3), Narrator-Leerantwort-Recovery (10B-4d), kleiner F60-2-Klausel-Restfall. [Fachindex](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_REMAINING_WORK_SOL_IMPLEMENTATION_INDEX.md) verlinkt die Pläne und Entscheidungspunkte. Monsteranatomie/Loot und Chase sind gesonderte **Designkandidaten ohne Codefreigabe**; Zahlenbalance, Sapienz/Sondereffekte, Worldclock und weitere QoL erst nach Evidenz und Nutzerentscheidung.

**Quellcode bei konkreter Aufgabe:** `src/v4/planner.js`/`runtime.js` für Planung und Turn; `world.js` für Firewall; `world_jobs.js` für Chat-/Reply-/Swipe-/Hash-/Turn-/Save-Grenzen. Erzählter Erfolg ersetzt keine persistierten Engine-Events. Archive [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md)/[05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) und [06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) gezielt nachschlagen.
