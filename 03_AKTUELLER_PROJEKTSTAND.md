# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Stand: 31.10.2026 · einzige laufende Statusquelle.** [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Designkanon](02_DESIGN_KANON.md) · [Fachindex 10B](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalruns](testrun_10b/README.md). Historische Zahlen, vollständige Reviews und alte Patchfolgen stehen in den verlinkten Fachquellen, nicht hier.

## Produkt und technische Nachweise

| Gegenstand | Aktueller Stand |
|---|---|
| Code | [Produktbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/claude/c-planner-prototype-2026-10-02-gpt-c666); zuletzt **Build `.136`, Produktcommit [8efb926](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926)**. Der zuletzt geprüfte Dev-HEAD [019c32b](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/019c32b) ändert nur Dokumentation. Ein Start-Hotfix ist beauftragt, **noch nicht als umgesetzt bestätigt**. |
| Protokoll | V4-C / Ruleset 2; Board 5.5, Extractor 5.22, Delta 1.12; Narrator-Vertragsrevision .85. |
| Architekturplan nach .126 | **A Foldintegrität, B1 aktive Regelvariante, C Population/Alter/Identität, D Gearangebote/Kaufzustimmung implementiert und im Diff gegengeprüft.** [Umsetzungsspezifikation](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md); [D-Abschluss und ST-Bericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). |
| Node / Replay | Für .136 laut Implementierungsabschluss **2.523/2.523 Node-Tests**, **2.235 Replayfälle**, 190 exakt akzeptierte, unveränderte Fingerprints (142 C + 48 D), keine offenen/stale Abweichungen. |
| Echter ST-Host | Auf .136 **Standard-Smoke 24/24** (zweimal), **Failsoft 29/29**, ST 1.19.0 / Chromium, Mockprovider; null PageErrors. Gespeicherte Chats offline ohne Fold-/Validierungsfehler neu gefaltet. **Kein echter Modell-/Gearkauf-Langtest; keine Browser-Reload-Probe.** [Abnahmebeleg](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/019c32b). |
| Naturtests | Letzter verwertbarer natürlicher Langlauf: **Batch 19 auf .125**, nicht auf C/D. Aktueller Batch vom **31.10.2026** wurde beim ersten Zug vollständig blockiert (siehe unten). |

**Grundsatz:** LLM entwirft Welt und Erzählung; JS-Engine entscheidet und persistiert Mechanik. Drei Startklassen, Skills/Passives, Living Dungeons, F-Gear und technisch möglicher F→E-Wechsel sind vorhanden. Natürliches Level 15 wurde in Batch 17 von Warrior und Mage erreicht; die **natürliche E-Klassenannahme** und die gemeinsame F→E-Balance sind weiterhin offen. Kein altes Kampagnenformat muss weiter unterstützt oder migriert werden.

## Aktueller Blocker – Start mit SillyTavern-Makros

**Original:** `batch-20261031-125921Z.zip` (lokaler Upload, noch kein Git-Archiv). Drei neue Guildkampagnen (Warrior, Mage, Rogue) endeten jeweils bei **Eingabe 1**, ohne Charaktererstellung, Planner-, Narrator- oder Extractoraufruf. Engine: `CAMPAIGN START HIDDEN`; alle drei sind **Start-/Integrationsabbrüche**, keine Gameplay-/Balancebefunde.

Die Karte nutzt `{{user}}` und `{{pick::...}}`. Der Startrecord erhielt den Hash des **unaufgelösten** Begrüßungstexts, SillyTavern zeigte anschließend den aufgelösten Text. `messageEvents()` blendet den nun abweichenden Start aus; der in [.131 / cc71256](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/cc71256) eingeführte **richtige Doppeltstartschutz** blockiert einen zweiten Start. Beim Warrior wich außerdem der mechanisch gebuchte Seed-Fallbackort (Ashbridge) vom sichtbaren Makro-Ort (Alderwatch) ab. Der statische ST-Smoke deckt diesen Lifecycle nicht ab.

**Beauftragter enger Hotfix:** tatsächlichen Makro-/Begrüßungs-Lifecycle und Startort korrigieren, Doppeltstartschutz behalten; **zuerst gezielte Regression plus kurzen echten ST-Makro-Start** (Erstellung und erster normaler Spielzug), **danach** einmal volle Node-/Replayprüfung und passende Host-Smokes. Nicht voreilig Codefreigabe oder Testgrün behaupten. Keine B2-/E-/Balancearbeiten währenddessen.

## Nächste Reihenfolge

1. **Makro-Startfehler reproduzieren, minimal beheben und real in ST nachweisen.** Nur bestätigten Commit/Build anschließend hier aktualisieren.
2. **Nutzer startet Paket F lokal:** `npm run live:st:batch`, nacheinander `guild-warrior`, `guild-mage`, `guild-rogue`; keine künstlichen Level-/Zustandsfixtures. Der Runner verfolgt **Charaktererstellung → Level 15 → ausdrücklich angenommene E-Klasse** (`class.evolved`). Die erste kurze Startgegenprobe kann `--max-turns 5` verwenden, ist aber **kein Ersatz für den vollständigen natürlichen Batch**. [Runner-Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6cc09cd/avereth-engine/docs/LIVE_RUNNER.md).
3. **Unabhängige Auswertung der Originalexports:** Population/Alter/Jagdcredit, einzelne Gearprofile, Paket- und Preiszustimmung, Quest-/Geld-/XP-/PP-Buchungen, E-Klasse, Spieltempo; Modellfehler, Bedienfehler, korrekten Tod und Technikprobleme trennen. Vergleich mit [Batch 17–19](testrun_10b/README.md).
4. **Danach entscheiden:** B2 (Privatquest-Restpfade) und E (Legacy-Runtimeabbau) sind nicht begonnen, **blockieren F nicht**. Größere Designarbeit wie Main/Minor, F/E-Scaling, Monsterdesign und NPC-Memory bleibt eigenständig und benötigt Freigabe. [Offene Kandidaten](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

## Historische Referenzen statt doppelter Protokolle

- **Frühere Builds, natürliche Batches 1–19:** [Runindex](testrun_10b/README.md), [Originalarchiv](testrun_10b/ARCHIV_BATCHES.md) und [10B-Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).
- **Aktuelle Architektur A/B1/C/D:** [konsolidierter Plan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md), [Produkt-Patchnote D samt Nachweisen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md).
- **Ausführliche vor dieser Kürzung gültige Statusfassung:** [Commit 6142f24](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/03_AKTUELLER_PROJEKTSTAND.md).

Keinen Produktcommit mit einem reinen Dokumentationscommit auf `main` verwechseln. Echte ST-Smokes mit Mockprovider sind Integrationsnachweise, kein natürlicher Modell-Livetest.
