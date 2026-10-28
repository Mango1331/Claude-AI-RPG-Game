# Avereth Engine – aktueller Projektstand und nächste Abnahme

**Stand:** 28.10.2026. **Diese Datei ist die einzige aktuelle Status-/Nächste-Schritte-Quelle.** Vor Arbeit an der Engine den Entwicklungs-HEAD erneut mit Git vergleichen. Der Stand dieses Dokuments ist eine Momentaufnahme; spätere Dokumentationscommits auf main sind **keine** neuen Produktversionen. [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [verbindlicher Design-Kanon](02_DESIGN_KANON.md), [10B-Quellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## 1. Produkt und Architektur

- **Repository:** [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game); **Dev-Branch:** claude/c-planner-prototype-2026-10-02-gpt-c666. **main**: Dokumentation, Langlauf-Reviews und Archive.
- **Letzter hier überprüfter Produktstand:** **Build 4.3.0-c.6.6.104**, [Commit b9ffa2c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016). V4-C/semantischer Planner, Regelstand 2 für neue Kampagnen, historischer Regelstand 1 kompatibel.
- **Spiel und Progression:** LLM erzählt die Welt; deterministische Engine kontrolliert Kampf, Zahlen und Kanon. Living Dungeons, Guild-Board, Loot, drei Starterklassen (Warrior/Mage/Rogue), zwei wählbare Starter-Skills plus Basic Attack, dynamische Fähigkeiten/Passives, Proficiency, Skill-Evolution und technische F→E-Entwicklung vorhanden. **Höhere Ränge und endgültiges F→E-Zahlen-/Gear-/Ökonomie-Scaling nicht freigegeben**.
- **Patch .104:** ein aktiver Clear-Vertrag pro Dungeon/Etage, auch filialübergreifend und bei bedingter Annahme; historische aktive Duplikate bleiben gültig. Neue Guild-Transaktionen/Quest-XP tragen die Quest-ID; alte mehrdeutige Sammelrecords werden entsprechend ausgewiesen. Autorisierte Käufe aus vorhandenem kanonischem Manualbestand werden nach bestätigter Ankunft und Verkäuferpräsenz erfüllt, andernfalls ausdrücklich als nicht gekauft gemeldet. **Kampfaktionsregeln, XP-Höhe und drei Guildprofile unverändert.** [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016/avereth-engine/docs/PATCH_BATCH3_GUILD_CLEAR_AND_CANON_PURCHASES.md).

Die Patch-8-/9-Entwicklung ist **abgeschlossen**, nicht erneut zu planen: [kompakte Historie](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Historische 10B-Fixes .58–.100: [kompakter Quellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Frühere lange Status- und Abnahmetabellen: [unveränderte alte Fassung auf Git-Commit 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_AKTUELLER_PROJEKTSTAND.md).

## 2. Abnahme – nur aktuelle Vergleichswerte

| Bereich | Nachweis / tatsächliche Grenze |
|---|---|
| **.104 Node** | **20 neue Prüfungen**, auf .103 **11 rot / 9 grüne Kontrollen**, nachher **20/20**. Vollständiges `npm test` selbst ausgeführt: **2.065/2.065**, keine übersprungenen Tests. Originalfälle T150/T153/T196, Altverträge, bedingte Annahmen, Kauf/Lernquelle, Chronologie, Handover-Deduplikation und Replay. [Details](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016/avereth-engine/docs/PATCH_BATCH3_GUILD_CLEAR_AND_CANON_PURCHASES.md). |
| **.104 ST 1.19 / Runner** | Echter ST-Smoke mit Mockprovider **22/22**, fünf Extraktionen, keine PageErrors; vier gespeicherte Story-Records jeweils einmal angewandt. Die unveränderte Dreiermatrix hat auf .102 den Stub-Batch **3/3** bestanden. **Noch kein natürlicher .104-GLM-Nachweis.** |
| **.101 Node (historisch)** | Von Sol gemeldet: **47 neue Prüfungen grün**. Von 38 gegen .100 vergleichbaren Fällen zuvor **28 rot / 10 grün**, nach Fix **38/38 grün**. Vollständiges npm test: **1.984/1.984**. Diese Messungen hier **nicht erneut selbst ausgeführt**. |
| **.101 SillyTavern-1.19-Smokes** | Gemeldet: **21/21** regulär und **22/22** Narrator-Recovery, je fünf Extraktionen, kein PageError und die gespeicherten Story-Records jeweils nur einmal gebucht. Mock-Provider: **keine natürliche GLM-/Langlaufabnahme**. [Details](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md). |
| **Erster Batch auf .100** | Neun Profile ursprünglich geplant; **sechs gestartet**. Fünf autonome technische Stopps (3 Extractor, 2 Narrator); sechster manuell unterbrochen. Level 15 nicht erreicht. [GPT-Review](testrun_10b/batch-20261027-030034Z/REVIEW.md), [Sols Ursachenanalyse](testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md), [Batchindex](testrun_10b/batch-20261027-030034Z/README.md). **Dieser Lauf beweist nicht die Wirkung von .101.** |
| **Zweiter Batch auf .101** | Fünf auswertbare Läufe: Guild Warrior L7/150 Inputs, Mage L3/Tod nach 99, Rogue L8/150; Explore Warrior nach 87 mit Narrator-Serverfehler, Mage nach 123 mit Handels-/Planner-Konflikt. Sechster Lauf manuell abgebrochen. [GPT-Review](testrun_10b/batch-20261027-073917Z/REVIEW.md). Dieser Batch lag vor dem Runner-Nachtrag `8189b87` und dem .102-Fix. |
| **Dritter Batch auf .102** | Original-ZIP unabhängig geprüft: Warrior **L10/250 Inputs**, Mage **L5/102, Plannerabbruch**, Rogue **L2/87, Tod**. Natürliche Provider-Recovery einmal bestätigt. Original-Mageantworten werden auf .103 bereits zu CLARIFY ohne Buchung; noch kein natürlicher .103-Nachweis. Doppelte Clear-Verträge vergüten dieselbe Leistung; Neuannahmen ab .104 gesperrt, Altverträge bleiben gültig. Manual-Kauf-/Lernkette ab .104 bei tatsächlicher Präsenz unterstützt. [GPT](testrun_10b/batch-20261027-150205Z/REVIEW.md), [Sol](testrun_10b/batch-20261027-150205Z/SOL_COUNTERREVIEW.md). |
| **F→E-Entwicklung** | Gezielter .57-Fixture-Lauf technisch bestätigt (einschließlich Reload); synthetische Vorgeschichte, kein natürliches Level-1→15- oder Zahlenbalanceurteil. [frühere Abnahme](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). |
| **Simulator / ältere Runs** | Offline-Basis vorhanden; ältere PC-/NPC-Taktikasymmetrie begrenzt den Balancevergleich. Einzelruns und Originaldateistatus: [testrun_10b/README.md](testrun_10b/README.md). |

**Nachweisdisziplin:** Die Messungen sind dem jeweiligen Produktstand und verlinkten Bericht zugeordnet. Ein natürliches GLM-Ergebnis, ein technischer ST-Mock-Smoke und ein Fixture sind **drei unterschiedliche Nachweisarten**.

## 3. Aktueller Schwerpunkt und nächster Schritt

1. **Vergleichsabnahme:** natürlicher .104-Batch mit drei Guild-Kampagnen Richtung Level 15; dessen gestarteten Produkt-/Runnerstand während des Laufs unverändert lassen. Clear-Verträge, questgenaue Belohnungen und Manual-Käufe/Lernquellen anhand gespeicherter Events bewerten. **Separater nächster Fachpatch:** [Haupt-/Nebenaktionsplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md) ist nach Codeanalyse vorbereitet; noch keine Produktimplementierung oder neue Tests. Entwicklung/Smokes getrennt vom laufenden Batch, keine weiteren vorsorglichen Mikrofixes.
2. **Runnerstand:** Nachtrag `8189b87` ist umgesetzt (getrennte sichtbare Engine-Panels, Recovery-Beobachtung, konkretes Entscheidungs-JSON und Fortschrittsmessung). .102 verkürzt die automatische Matrix auf Guild Warrior/Mage/Rogue; Explore bleibt ausdrücklich wählbarer Einzellauf. Startbefehle unverändert. Laufende Batches erst beenden, danach aktualisieren.
3. **F→E-Scaling im Anschluss anhand gültiger Daten:** Levelkurve, Gegnerstufen/Regionen, NPCs, Skills/Spellwirkung, Gear, Preise, Loot, Questvergütungen und spätere E-Rank-Fähigkeiten zusammen bewerten. [GPT-Scaling](testrun_10b/scaling_gpt.md), [Sols Entwurf](testrun_10b/ENTWURF_F_RANG_PROGRESSION_UND_E_UEBERGANG.md), [erste Beobachtungen](testrun_10b/BALANCE_ERSTEINDRUECKE_XP_STARTWERTE_20261026.md). **Noch keine numerische Neuordnung freigegeben.**
4. **Nachgeordnet:** Monsteranatomie/-Sapienz, Chase-/Pacing- und Komfortideen sowie vertiefte NPC-Memory – [Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md); keines davon ohne gesonderten Auftrag vorziehen.

**Testziel:** echte, frei gespielte Kampagnen Richtung Level 15; 100 Inputs sind Vergleichscheckpoint, nicht zwingendes Ende. Original-Run-ZIPs und detaillierte technische Einzelreviews beim jeweiligen Lauf belassen; hier nur Ergebnis und die aktuelle Entscheidung aktualisieren.

## 4. Dokumentation und Quellenpflege

- [01 Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md): Vorgehen und Test-/Quellenregel.
- [02 Designkanon](02_DESIGN_KANON.md): verbindliche Gameplay-Entscheidungen; **keine** automatischen Updates aus historischen Reviews.
- **03 hier:** einziger aktueller Build-/Abnahme-/Nächste-Schritte-Status.
- [03 Archiv](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md): Patch 8/9 als Kurzchronik mit festen Commits.
- [04 Ideenkatalog](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md): Vorschläge, keine Implementierung.
- [06 10B-Index](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md): frühere Fachpatches und ungelöste technische/Scaling-Bereiche.
- [Testarchive](testrun_10b/README.md), [technische Engine-Dokumentation](avereth-engine/docs/ARCHITEKTUR.md) und Patchnotes im Entwicklungsbranch: Belege, **keine** parallelen Statusquellen.

**Archivschutz:** Die frühere ausführliche 03-Fassung ist [unter 0ebf449 komplett vorhanden](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_AKTUELLER_PROJEKTSTAND.md); gelöschte Zwischenüberschriften werden nicht als aktuelle Aufgaben übernommen.
