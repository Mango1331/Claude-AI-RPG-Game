# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Stand: 31.10.2026 · einzige laufende Statusquelle.** [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Designkanon](02_DESIGN_KANON.md) · [Fachindex 10B](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalruns](testrun_10b/README.md). Historische Zahlen, vollständige Reviews und alte Patchfolgen stehen in den verlinkten Fachquellen, nicht hier.

## Produkt und technische Nachweise

| Gegenstand | Aktueller Stand |
|---|---|
| Code | [Produktbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/claude/c-planner-prototype-2026-10-02-gpt-c666); zuletzt **Build `.137`, Produktcommit [5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/512437369242fcc498c27051514525c78c4f153b)** (Makro-Startfix). D-Abschluss [.136 / 8efb926](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926). |
| Protokoll | V4-C / Ruleset 2; Board 5.5, Extractor 5.22, Delta 1.12; Narrator-Vertragsrevision .85. |
| Architekturplan nach .126 | **A Foldintegrität, B1 aktive Regelvariante, C Population/Alter/Identität, D Gearangebote/Kaufzustimmung implementiert und im Diff gegengeprüft.** [Umsetzungsspezifikation](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md); [D-Abschluss und ST-Bericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). |
| Node / Replay | Für .137 laut Implementierungsabschluss **2.532/2.532 Node-Tests**, **2.235 Replayfälle**, 190 exakt akzeptierte Fingerprints (142 C + 48 D), keine offenen Abweichungen. |
| Echter ST-Host | Auf .136 und erneut .137 **Standard-Smoke 24/24**, **Failsoft 29/29**, ST 1.19.0 / Chromium, Mockprovider; null PageErrors. Auf .137 zusätzlich **echter ST-Makro-Starttest 26/26** mit drei Klassen und Skillwahl. **Kein natürlicher Modell-/Gearkauf-Langtest.** [D-Host-Abnahme .136](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/019c32b), [Startfix .137](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373). |
| Naturtests | Letzter verwertbarer natürlicher Langlauf: **Batch 19 auf .125**, nicht auf C/D. Erster .136-Batch vom **31.10.2026** brach beim Start ab; **.137 korrigiert die Ursache**, aber ein neuer natürlicher Langbatch ist noch offen. |

**Grundsatz:** LLM entwirft Welt und Erzählung; JS-Engine entscheidet und persistiert Mechanik. Drei Startklassen, Skills/Passives, Living Dungeons, F-Gear und technisch möglicher F→E-Wechsel sind vorhanden. Natürliches Level 15 wurde in Batch 17 von Warrior und Mage erreicht; die **natürliche E-Klassenannahme** und die gemeinsame F→E-Balance sind weiterhin offen. Kein altes Kampagnenformat muss weiter unterstützt oder migriert werden.

## Geschlossener Startblocker – Makro-Lifecycle (.137)

**Original:** `batch-20261031-125921Z.zip` (lokaler Upload). Warrior, Mage und Rogue stoppten auf .136 jeweils vor der Charaktererstellung mit `CAMPAIGN START HIDDEN`: die Engine hatte `campaign.started` auf dem **rohen** Begrüßungstext mit `{{user}}`/`{{pick}}` angelegt, SillyTavern danach den sichtbaren Text aufgelöst. Der .131-Doppeltstartschutz verweigerte korrekt einen zweiten Start; beim Warrior wich der gebuchte Seed-Ort (Ashbridge) vom angezeigten Ort (Alderwatch) ab.

**Fix [.137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/512437369242fcc498c27051514525c78c4f153b):** nur **vor dem ersten Start** verwendet die Engine SillyTaverns eigene `substituteParams`-Auflösung; genau ein Record mit passendem Ort/Hash. Spätere echte Änderungen bleiben geschützt. Runner prüft Startrecord/Ort **vor Spielerzug 1**. Laut Claude: 9 gezielte Regressionen (5 zuvor rot), 2.532/2.532 Node, Replay grün, ST Standard 24/24, Failsoft 29/29 und **makrohaltiger ST-Start 26/26** mit Warrior/Mage/Rogue und Skillwahl. Die früheren beschädigten .136-Chats werden bewusst nicht repariert – neue Kampagne starten. Kein natürlicher Langlauf durch Claude; dessen Nachweis ist noch offen.

## Nächste Reihenfolge

1. **Makro-Startfix .137 beim nächsten lokalen Kurzstart gegenprüfen.** Originalbegrüßung, tatsächlicher Startort und die erste gültige Aktion; keine alten .136-Fehlstarts fortsetzen.
2. **Nutzer startet Paket F lokal auf .137:** `npm run live:st:batch`, nacheinander `guild-warrior`, `guild-mage`, `guild-rogue`; keine künstlichen Level-/Zustandsfixtures. Der Runner verfolgt **Charaktererstellung → Level 15 → ausdrücklich angenommene E-Klasse** (`class.evolved`). Die erste kurze Startgegenprobe kann `--max-turns 5` verwenden, ist aber **kein Ersatz für den vollständigen natürlichen Batch**. [Runner-Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6cc09cd/avereth-engine/docs/LIVE_RUNNER.md).
3. **Unabhängige Auswertung der Originalexports:** Population/Alter/Jagdcredit, einzelne Gearprofile, Paket- und Preiszustimmung, Quest-/Geld-/XP-/PP-Buchungen, E-Klasse, Spieltempo; Modellfehler, Bedienfehler, korrekten Tod und Technikprobleme trennen. Vergleich mit [Batch 17–19](testrun_10b/README.md).
4. **Danach entscheiden:** B2 (Privatquest-Restpfade) und E (Legacy-Runtimeabbau) sind nicht begonnen, **blockieren F nicht**. Größere Designarbeit wie Main/Minor, F/E-Scaling, Monsterdesign und NPC-Memory bleibt eigenständig und benötigt Freigabe. [Offene Kandidaten](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

## Historische Referenzen statt doppelter Protokolle

- **Frühere Builds, natürliche Batches 1–19:** [Runindex](testrun_10b/README.md), [Originalarchiv](testrun_10b/ARCHIV_BATCHES.md) und [10B-Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).
- **Aktuelle Architektur A/B1/C/D:** [konsolidierter Plan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md), [Produkt-Patchnote D samt Nachweisen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md).
- **Ausführliche vor dieser Kürzung gültige Statusfassung:** [Commit 6142f24](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/03_AKTUELLER_PROJEKTSTAND.md).

Keinen Produktcommit mit einem reinen Dokumentationscommit auf `main` verwechseln. Echte ST-Smokes mit Mockprovider sind Integrationsnachweise, kein natürlicher Modell-Livetest.
