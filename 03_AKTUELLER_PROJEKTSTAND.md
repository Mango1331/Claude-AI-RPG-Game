# Avereth Engine – aktueller Projektstand und nächste Abnahme

**Stand:** 27.10.2026. **Diese Datei ist die einzige aktuelle Status-/Nächste-Schritte-Quelle.** Vor Arbeit an der Engine den Entwicklungs-HEAD erneut mit Git vergleichen. Der Stand dieses Dokuments ist eine Momentaufnahme; spätere Dokumentationscommits auf main sind **keine** neuen Produktversionen. [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [verbindlicher Design-Kanon](02_DESIGN_KANON.md), [10B-Quellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## 1. Produkt und Architektur

- **Repository:** [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game); **Dev-Branch:** claude/c-planner-prototype-2026-10-02-gpt-c666. **main**: Dokumentation, Langlauf-Reviews und Archive.
- **Letzter hier überprüfter Produktstand:** **Build 4.3.0-c.6.6.101**, [Commit c9e3fa5](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6). V4-C/semantischer Planner, Regelstand 2 für neue Kampagnen, historischer Regelstand 1 kompatibel.
- **Spiel und Progression:** LLM erzählt die Welt; deterministische Engine kontrolliert Kampf, Zahlen und Kanon. Living Dungeons, Guild-Board, Loot, drei Starterklassen (Warrior/Mage/Rogue), zwei wählbare Starter-Skills plus Basic Attack, dynamische Fähigkeiten/Passives, Proficiency, Skill-Evolution und technische F→E-Entwicklung vorhanden. **Höhere Ränge und endgültiges F→E-Zahlen-/Gear-/Ökonomie-Scaling nicht freigegeben**.
- **Patch .101** bündelt Recovery nach Fehlerart, einmalige Narrator-Regeneration unter Hostschutz, explizit autorisierte arrive-Deltas, nebenwirkungsfreie gemeinsame Ortsidentität, sichere Ereignisreihenfolge und einheitliche Handels-/Guild-Beweispfade. Neue Zähljagden sind mechanisch; alte Verträge bleiben kompatibel. **Keine Balance-/Runnerstrategieänderung** in diesem Produktpatch. [Einzige detaillierte Patchnote einschließlich Grenzen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md).

Die Patch-8-/9-Entwicklung ist **abgeschlossen**, nicht erneut zu planen: [kompakte Historie](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Historische 10B-Fixes .58–.100: [kompakter Quellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Frühere lange Status- und Abnahmetabellen: [unveränderte alte Fassung auf Git-Commit 0ebf449](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/03_AKTUELLER_PROJEKTSTAND.md).

## 2. Abnahme – nur aktuelle Vergleichswerte

| Bereich | Nachweis / tatsächliche Grenze |
|---|---|
| **.101 Node** | Von Sol gemeldet: **47 neue Prüfungen grün**. Von 38 gegen .100 vergleichbaren Fällen zuvor **28 rot / 10 grün**, nach Fix **38/38 grün**. Vollständiges npm test: **1.984/1.984**. Diese Messungen hier **nicht erneut selbst ausgeführt**. |
| **.101 SillyTavern-1.19-Smokes** | Gemeldet: **21/21** regulär und **22/22** Narrator-Recovery, je fünf Extraktionen, kein PageError und die gespeicherten Story-Records jeweils nur einmal gebucht. Mock-Provider: **keine natürliche GLM-/Langlaufabnahme**. [Details](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/c9e3fa58bb57894e839ddd0df6db0f62a661d4a6/avereth-engine/docs/PATCH_BATCH1_WORLD_CONTRACTS.md). |
| **Erster Batch auf .100** | Neun Profile ursprünglich geplant; **sechs gestartet**. Fünf autonome technische Stopps (3 Extractor, 2 Narrator); sechster manuell unterbrochen. Level 15 nicht erreicht. [GPT-Review](testrun_10b/batch-20261027-030034Z/REVIEW.md), [Sols Ursachenanalyse](testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md), [Batchindex](testrun_10b/batch-20261027-030034Z/README.md). **Dieser Lauf beweist nicht die Wirkung von .101.** |
| **Neuer sechsteiliger Runner** | [Runnerstand 54b6e08](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/54b6e086734d719db35b12aab901e2f666229101): Guild und Explore, je Warrior/Mage/Rogue, keine separaten Dungeonprofile. Explore soll ohne routinemäßige Guild-Mitgliedschaft Reisen/Entdeckungen/außergildliches Einkommen suchen. Diese Fassung **noch nicht natürlich im neuen Sechserbatch geprüft**. |
| **F→E-Entwicklung** | Gezielter .57-Fixture-Lauf technisch bestätigt (einschließlich Reload); synthetische Vorgeschichte, kein natürliches Level-1→15- oder Zahlenbalanceurteil. [frühere Abnahme](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). |
| **Simulator / ältere Runs** | Offline-Basis vorhanden; ältere PC-/NPC-Taktikasymmetrie begrenzt den Balancevergleich. Einzelruns und Originaldateistatus: [testrun_10b/README.md](testrun_10b/README.md). |

**Nachweisdisziplin:** Rot-/Grün-, Smoke- und Testzahlen hier sind aus den verlinkten Implementierungs-/Run-Berichten übernommen; kein neuer Testlauf durch diese Dokumentationspflege. Ein echtes GLM-Ergebnis, ein Mock-Smoke und ein Fixture sind **drei unterschiedliche Nachweisarten**.

## 3. Aktueller Schwerpunkt und nächster Schritt

1. **Technische Stabilität zuerst:** die offenen natürlichen Provider-/Extractor-/Narrator-/World-Konflikte mit dem unveränderten .101-Stand messen; keine blinden weiteren Budget-, Prompt- oder World-Patches. Der neue sechsprofilige Batch ist das Vergleichsexperiment.
2. **Runner-Messqualität:** Vor dem nächsten Batch ist ein **kleiner, noch nicht implementierter Runner-Nachtrag** fachlich empfohlen: sichtbare Engine-System-Panels getrennt von NARRATOR darstellen, Narrator-Recovery im Bericht erfassen, Entscheidungs-JSON mit einem klaren Gesamtbeispiel erklären, Szenarien sinnvoll alternieren und bestätigte Explore-Orte/Begegnungen/Verkäufe/Gear/Skill-Entwicklung **nur beobachten**. Keine neue Retry-Schleife und kein längerer Spielerleitfaden. Der Dev-HEAD ist vor jedem Auftrag erneut zu prüfen.
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
