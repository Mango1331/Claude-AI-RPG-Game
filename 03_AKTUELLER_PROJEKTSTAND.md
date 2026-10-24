# Avereth Engine – Aktueller Projekt- und Abnahmestand

**Stand:** 24.10.2026. Einzige aktuelle Statusübersicht; Git-HEAD vor technischen Aussagen prüfen. Einstieg nach [01 Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md); weitere Quellen nur auftragsbezogen. Frühere Statusberichte stehen vollständig im [historischen Archiv](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md).

## Produkt

- **Repository:** [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game).
- **Entwicklungsbranch:** `claude/c-planner-prototype-2026-10-02-gpt-c666`; `main` führt Dokumentation/Archive. Spätere Dokumentationscommits ändern den Produktstand nicht.
- **Letzter verifizierter Produktcommit:** [`21207207`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/212072073e1026d86763d7784b90275b8487a4a0), Build **4.3.0-c.6.6.68** in `src/util.js`, `manifest.json`, `package.json`. Narrator-Vertrag **.55**.
- **Aktiver Pfad:** V4-C/semantischer Planner, Regelstand 2 für neue Kampagnen; Regelstand 1 bleibt Legacy.

Das LLM gestaltet und interpretiert die Welt; die Engine kontrolliert Zahlen, Aktionen und persistenten Zustand. Vorhanden sind Living Dungeons, Gildenquests, Auto-Loot sowie die freigegebenen Patch-9-Grundlagen: Warrior/Mage/Rogue, zwei wählbare Starter-Skills plus Basic Attack, organischer Skill-/Passive-Erwerb, Proficiency, Skill-Evolution und F→E-Klassenentwicklung. Höhere Klassenränge und endgültige Zahlenbalance sind offen. Kanon: [02](02_DESIGN_KANON.md).

**10B umgesetzt:** Fakten-/Registrierungsfix `.58`; Delivery/Übergaben `.59–.60`; Planner-Recovery `.61`; Extractor-/Host-/Reload-Recovery und Telemetrie `.62–.65`; initiale ST-Swipe-ID-Normalisierung `.66`; auf ausdrücklichen Nutzerauftrag Kampf-/Quest-XP ×2 nach Rundung `.67` ([Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_XP_REWARDS.md)). Technische Einzelbelege sind über das [10B-Journal §§13–26](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#13-sols-unabhängiger-drei-run-gegenreview-folgeabstimmung-und-der-erste-implementierungsauftrag-24102026) erreichbar. Die [frühere technische Übergabe](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B_SOL_REVIEW_AND_NEXT_PATCH_HANDOFF_20261024.md) ist historisch.

## Abnahme

| Nachweis | Verifizierter Umfang und Grenze |
|---|---|
| **Node/ST .68, von Sol ausgeführt** | **1452/1452 Node**, 23 neue 3B-Regressionen (auf .67 elf rot/zwölf grün); echter ST-1.19-Mock-Smoke **21/21**, fünf Extractor-Calls, keine PageErrors; vier aktuelle gespeicherte Story-Records jeweils einmal `extract.applied`. Noch kein natürlicher .68-GLM-Lauf. |
| **Node .67, von Sol ausgeführt** | **1429/1429**, darunter drei neue XP-Regressionen (vorher 3/3 rot, danach grün). Kein neuer .67-ST-/GLM-Lauf. |
| **Node .66, von Sol ausgeführt** | 1426/1426 gesamt, World-Jobs 19/19. ChatGPT prüfte Diff/Testcode unabhängig, wiederholte diese Läufe dabei nicht. |
| **ST .66, echter Browser, Mockprovider** | Finaler `smoke:st:c` 21/21, fünf Extractor-Calls; vier aktuelle gespeicherte Story-Records jeweils einmal `extract.applied`. .65-Gegenprobe scheiterte. Erster .66-Versuch 20/21 wegen zweier PageErrors; Ursache offen. |
| **Natürliche GLM-Runs** | Vier historische .57-Runs endeten nach 26/25/21/61 Inputs. .65-Run 5 blockierte bei `pending` nach 3 Inputs; in .66 adressiert. **Run 6 auf .66: 35/100 natürliche Inputs, 32/32 Story-Extraktionen angewendet, 1 vollständiger Hound-Cull-/Guild-Payout, dann regelkonformer Tod im ersten Dungeon-Encounter** (3 Skelette Lv4/3/2 gegen Mage Lv1). **Kein 100-Züge-Abnahmelauf**, kein neuer Host-Hänger. [Originalreview](testrun_10b/20261024-104654Z-current_test/REVIEW.md). |
| **F→E-Klassenentwicklung** | Gezielter .57-ST/GLM-Fixture-Lauf: 23 Züge, 5/5, Save/Reload. Level-1–14-Vorgeschichte synthetisch; keine natürlich gespielte Gesamtlaufbahn. |
| **Kampfsimulator** | Reproduzierbar vorhanden; frühere umfangreiche Messungen durch PC-/NPC-Taktikasymmetrie begrenzt, keine Balancefreigabe. |

Vollständige .66-Testfolge einschließlich Fehlversuch und Save-Prüfung: [Hotfixnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/claude/c-planner-prototype-2026-10-02-gpt-c666/avereth-engine/docs/PATCH10B4C2_SWIPE_ZERO_HOTFIX.md); unabhängiges Codeurteil: [06 §26.2](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md#262-unabhängiges-chatgpt-gegenreview-zu-build-66-24102026). Originalruns und jeweiliger ZIP-Archivstatus: [Testindex](testrun_10b/README.md). Run-4/5-ZIP-Upload zuletzt nicht bestätigt.

## Offen und nächster Schritt

**Neuster echter GLM-Test:** [Run 8 auf `.68`](testrun_10b/20261024-142854Z-current_test/REVIEW.md): **75/100** Inputs, Ende `planner_failed` vor Narrator. **61/61 `extract.applied`**, 961 Engine-Events, Integrität OK, 0 Page-/Serverfehler. Positiv: echter `quest.delivered` und Guild-Payout, echtes Novice-Board, Mage **Level 3 schon in Input 39**, 288 Kampf-XP aus Dreiergegner-Sieg plus 46 Quest-XP, seltene Passive erworben. Kein vollständiger `.68`-100-Züge-Pass.

**Priorität vor erneutem Langlauf:** gezielter Planner-Ownership-/Sequenz-Hotfix: Werkzeug aus dem Workroom wird in einem `take→attempt`-Reparaturvorschlag aufgegriffen, aber `parsePlan` validiert `attempt.tool` weiterhin ausschließlich gegen den Inventarsnapshot **vor** `take` und bricht nach Reparatur ab. Keine Lockerung fremden Besitzes. Danach den bereits vorgesehenen **10B-3A-Kampf-/Chronik-Fachpatch** um den Run-8-Befund erweitern: ein per `dungeon_foe` zurecht abgelehnter Phantomgegner wird im Narrator weiter als reale Gefahr und notwendiger Schlüsselträger geführt, wodurch mehrere sinnlose `ATTACK — TARGET NEEDED` entstehen. P2: privater Queststatus nach Rettung noch aktiv und nicht gebuchte Guild-Bunk-Zahlung wird trotzdem erzählt. **Keine weitere XP- oder HP-/Monster-Balanceänderung.**

**10B-3B im natürlichen Run teilweise positiv:** realer Lieferbeleg und einmalige Guild-Zahlung sowie Tagesboard erfolgreich; private Erwerbsarbeit nicht getestet. `10B-4D` bleibt gesondert offen. Details und Belege nur im verlinkten Run-Review; unveränderte Original-ZIP für Run 8 hier geprüft, Git-Binärupload noch offen.

**Quellcode bei konkretem Auftrag:** `src/v4/delivery.js` für gebundene Originalfracht/Ziel-NPC/Ort, die vorhandenen Guild-/Board-/Private-Offer-/Transaction-Pfade sowie die betroffenen Quest-/World-Consumer. Narrator-Prosa ersetzt keine persistierten `quest.delivered`-/`transaction.completed`-Events. Archive [04](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md)/[05](05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md)/[06](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) nur gezielt nachschlagen.
