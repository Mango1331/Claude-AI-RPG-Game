# Avereth – Originalruns und Reviews (10B)

**Archivindex, keine zweite Status- oder Patchplanung.** Aktuelle Prioritäten: [03](../03_AKTUELLER_PROJEKTSTAND.md), offene Fachthemen: [06](../06_PATCH10B_MASTERPLAN_UND_REVIEWS.md), unverbindliche Skalierung: [GPT](scaling_gpt.md) · [Sol](ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md) · [Balancebeobachtungen](BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md).

Frühere ausführliche Zeilen mit SHA-256-/Git-Blob-Prüfungen und allen technischen Einzelbemerkungen: [unveränderte README am Git-Commit 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/testrun_10b/README.md). **Die folgende ZIP-Spalte wurde anhand des tatsächlichen main-Dateibaums neu überprüft**, nicht anhand alter damaliger Uploadstatus-Sätze.

## Einzelruns

| Run | Build | Kurzes Ergebnis | Original-ZIP auf main |
|---|---|---|---|
| [20261026-132758Z-current_test](20261026-132758Z-current_test/) | .98 | 73 Inputs, 8/8 Siege, 2 Guild-Abgaben. [Review](20261026-132758Z-current_test/REVIEW.md) | [ZIP](20261026-132758Z-current_test/20261026-132758Z-current_test.zip) |
| [20261026-114135Z-current_test](20261026-114135Z-current_test/) | .97 | 90 Inputs, 14/14 Einzelsiege, Guild 1 Abschluss. [Review](20261026-114135Z-current_test/REVIEW.md) | [ZIP](20261026-114135Z-current_test/20261026-114135Z-current_test.zip) |
| [20261024-030002Z-current_test](20261024-030002Z-current_test/) | .57 | 26/100 Züge. [Review](20261024-030002Z-current_test/REVIEW.md) | [ZIP](20261024-030002Z-current_test/20261024-030002Z-current_test.zip) |
| [20261024-033325Z-current_test](20261024-033325Z-current_test/) | .57 | 25/100 Züge. [Review](20261024-033325Z-current_test/REVIEW.md) | [ZIP](20261024-033325Z-current_test/20261024-033325Z-current_test.zip) |
| [20261024-041150Z-current_test](20261024-041150Z-current_test/) | .57 | 21/100 Spielerinputs (20 abgewickelte Züge), Planner-Ausfall nach zwei leeren Length-Antworten. [Review](20261024-041150Z-current_test/REVIEW.md) | [ZIP](20261024-041150Z-current_test/20261024-041150Z-current_test.zip) |
| [20261024-044642Z-current_test](20261024-044642Z-current_test/) | .57 | 61/100 Spielerinputs, 60 Story-/Engineantworten, 58 verbuchte Engine-Turns. [Review](20261024-044642Z-current_test/REVIEW.md) | [ZIP](20261024-044642Z-current_test/20261024-044642Z-current_test.zip) |
| [20261024-093931Z-current_test](20261024-093931Z-current_test/) | .65 | 3/100 Spielerinputs. [Review](20261024-093931Z-current_test/REVIEW.md) | [ZIP](20261024-093931Z-current_test/20261024-093931Z-current_test.zip) |
| [20261024-104654Z-current_test](20261024-104654Z-current_test/) | .66 | 35/100 echte Inputs, regulärer Tod gegen 3 Skeletons Lv4/3/2 in Old Crown. [Review](20261024-104654Z-current_test/REVIEW.md) | [ZIP](20261024-104654Z-current_test/20261024-104654Z-current_test.zip) |
| [20261024-120700Z-current_test](20261024-120700Z-current_test/) | .67 | 100/100 Inputs regulär done. [Review](20261024-120700Z-current_test/REVIEW.md) | [ZIP](20261024-120700Z-current_test/20261024-120700Z-current_test.zip) |
| [20261024-142854Z-current_test](20261024-142854Z-current_test/) | .68 | 75/100 Inputs, planner_failed wegen take→attempt mit vorher nicht gehaltenem Tool. [Review](20261024-142854Z-current_test/REVIEW.md) | [ZIP](20261024-142854Z-current_test/20261024-142854Z-current_test.zip) |
| [20261024-202508Z-current_test](20261024-202508Z-current_test/) | .71 | 30/100, regulärer Tod gegen 3 Goblins Lv5/4/2 (SHORT). [Review](20261024-202508Z-current_test/REVIEW.md) | Nicht vorhanden |
| [20261024-235637Z-current_test](20261024-235637Z-current_test/) | .72 | 75/100, PC-Tod im 5-Wespenkampf. [Review](20261024-235637Z-current_test/REVIEW.md) | Nicht vorhanden |
| [20261025-020335Z-current_test](20261025-020335Z-current_test/) | .76 | 100/100, 95 Engine-Turns, regulär done. [Review](20261025-020335Z-current_test/REVIEW.md) | Nicht vorhanden |
| [20261025-044431Z-current_test](20261025-044431Z-current_test/) | .78 | 100/100, 86 Engine-Turns, regulär done, integrity OK. [Review](20261025-044431Z-current_test/REVIEW.md) | [ZIP](20261025-044431Z-current_test/20261025-044431Z-current_test.zip) |
| [20261025-081303Z-current_test](20261025-081303Z-current_test/) | .82 | 100/100 Inputs, regulär done, 3 Siege. [Review](20261025-081303Z-current_test/REVIEW.md) | [ZIP](20261025-081303Z-current_test/20261025-081303Z-current_test.zip) |
| [20261025-113248Z-current_test](20261025-113248Z-current_test/) | .85 | 22/100 Eingaben, extractor_failed nach ungültigem object.move und fehlgeschlagenem Repair. [Review](20261025-113248Z-current_test/REVIEW.md) | [ZIP](20261025-113248Z-current_test/20261025-113248Z-current_test.zip) |
| [20261025-124809Z-current_test](20261025-124809Z-current_test/) | .87 | 100/100, regulär done, 3 Siege/7 Kills, 3 Gildenjagden READY→COMPLETED und +140 cp. [Review](20261025-124809Z-current_test/REVIEW.md) | [ZIP](20261025-124809Z-current_test/20261025-124809Z-current_test.zip) |
| [20261025-232041Z-current_test](20261025-232041Z-current_test/) | .91 | 58/100, kein Tod, 6 Siege/10 registrierte Kills, 2 Gildenaufträge. [Review](20261025-232041Z-current_test/REVIEW.md) | [ZIP](20261025-232041Z-current_test/20261025-232041Z-current_test.zip) |
| [20261026-012245Z-current_test](20261026-012245Z-current_test/) | .92 | 57/100, kein Tod, 5/5 Siege, 9 Kills, 2 abgeschlossene Gildenjagden, am Ende 98 cp. P1: T56 coinFromWords liest…. [Review](20261026-012245Z-current_test/REVIEW.md) | [ZIP](20261026-012245Z-current_test/20261026-012245Z-current_test.zip) |
| [20261026-031107Z-current_test](20261026-031107Z-current_test/) | .93 | 58/100, fünf Siege, zwei Gildenabschlüsse, Tod gegen Level-28/E-Skelett am erstmals betretenen Dungeonroot,…. [Review](20261026-031107Z-current_test/REVIEW.md) | [ZIP](20261026-031107Z-current_test/20261026-031107Z-current_test.zip) |
| [20261026-044406Z-current_test](20261026-044406Z-current_test/) | .94 | 89 Eingaben, kein Tod, acht Siege/15 Gegner, drei echte Gildenabschlüsse, vierter READY. [Review](20261026-044406Z-current_test/REVIEW.md) | [ZIP](20261026-044406Z-current_test/20261026-044406Z-current_test.zip) |
| [20261026-063907Z-current_test](20261026-063907Z-current_test/) | .95 | 30/30 Encounters gewonnen, 44 Kills, 10 Guild-Abschlüsse, 3.124 XP (1.636 Kampf / 1.488 Quest), Dungeon Floor 1…. [Review](20261026-063907Z-current_test/REVIEW.md) | Nicht vorhanden |

## Sechs Läufe im ersten Batch

- [Batch vom 27.10.2026, Build .100](batch-20261027-030034Z/README.md): **sechs gestartet**, fünf autonome technische Abbrüche, sechster manuell gestoppt. [GPT-Review](batch-20261027-030034Z/REVIEW.md), [unabhängiger Gegenreview mit .101-Patchplanung](batch-20261027-030034Z/SOL_COUNTERREVIEW.md), [Laufindex](batch-20261027-030034Z/BATCH_INDEX.json). Die Original-Batch-ZIP liegt **laut aktuellem main-Dateibaum nicht** in diesem Ordner; archivierte Textdateien sind kein Ersatz für den Export.

## Batch 2 (.101) – fünf regulär ausgewertete Runs

[**Batch-2-Review, Ordner batch-20261027-073917Z**](batch-20261027-073917Z/REVIEW.md) · [Lauf- und Quellenindex](batch-20261027-073917Z/README.md). Guild-Warrior und Guild-Rogue jeweils 150 Eingaben bis Level 7/8, Guild-Mage regulärer Tod T99, Explore-Warrior Narrator-Providerfehler T87, Explore-Mage Planner-/Handelsfehler T123. **Nur die ersten fünf beurteilt; Run 6 durch Nutzer manuell abgebrochen und ausdrücklich ausgeschlossen.** Original-ZIP als Upload vollständig CRC-/SHA-geprüft, **nicht als Binärdatei auf main archiviert**. Build .101 / c9e3fa5, 609 bewertete Eingaben, zwei technische Endabbrüche.

## Batch 3 (.102) – natürlicher Guild-Dreierbatch

[**Batch-3-Review**](batch-20261027-150205Z/REVIEW.md) · [Quellenindex](batch-20261027-150205Z/README.md). Warrior 250 Inputs/L10 reguläres Limit, Mage 102/L5 fataler Planner-Zimmerpreisfehler (4 statt 40 cp), Rogue 87/L2 regelgebuchter Tod. Ein echter Narrator-Provider-Retry beim Mage erfolgreich. Ein Dungeon-Floor-Clear vergütete zwei gleichzeitig aktive Verträge. **439 Inputs**, Original-ZIP als Upload geprüft, nicht auf main archiviert.

## Batch 4 (.104) – natürlicher Guild-Dreierbatch

[**Batch-4-Review und Fail-soft-Einordnung**](batch-20261028-022553Z/REVIEW.md) · [Quellenindex](batch-20261028-022553Z/README.md). Warrior 137 Inputs/L7 Planner-Abbruch bei Stückpreisen/Quote, Mage 46/L5 Extractor-Abbruch nach unautorisierter Gasthaus-Szene und ungültigen Place-Refs, Rogue 29/L2 mechanischer Tod gegen vier L6/7-Wölfe. **212 Inputs, 617 LLM-Aufrufe, 2.998 Events, 107 Rejections**. Original-ZIP 35,5 MB CRC/SHA-geprüft, **nicht auf main**; keine Produktänderungen.

## Umgang mit neuen Runs

- Unveränderte ZIP im nach der Original-Run-ID benannten Ordner sichern. Format und Hash bei Übertragung prüfen; niemals vorhandene Originaldateien oder Reviews still überschreiben.
- Ein ausführliches Review **beim betreffenden Run** mit Engine-Events, Original-Calls, Narration und tatsächlichem Spielerinput; technische Fehler, natürliche Tode, manuelle Stopps und Balancehypothesen getrennt ausweisen.
- Im Index nur **eine neue kompakte Zeile** anlegen: Run, Build/Commit, Inputs/Ende, Hauptbefund, Review, verifizierter ZIP-Pfad. Lange Diskussionen und SHA-Listen bleiben im Einzelreview beziehungsweise in der historisch verlinkten Fassung.
- Original-Exporte können lokale Pfade und Logs enthalten; vor dem Commit Geheimnisse prüfen. Keine API-Keys in Git.
