# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Stand: 31.10.2026 · einzige laufende Statusquelle.** [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Designkanon](02_DESIGN_KANON.md) · [Fachindex 10B](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Originalruns](testrun_10b/README.md). Historische Zahlen, vollständige Reviews und alte Patchfolgen stehen in den verlinkten Fachquellen, nicht hier.

## Produkt und technische Nachweise

| Gegenstand | Aktueller Stand |
|---|---|
| Code | [Produktbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/claude/c-planner-prototype-2026-10-02-gpt-c666); zuletzt **Build `.141`, Produktcommit [3d8f062](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/3d8f062143956b4932398c4583f8962c9dfcffdd)**: Gegenreviewkorrektur für Nichtgeld-Handlungen und verknüpfte Angebotsbedingungen. [Finanzpatch und Nachweise §§6–9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3d8f062143956b4932398c4583f8962c9dfcffdd/avereth-engine/docs/FIX138_FINANCE.md). Davor .140 [c37a677](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c37a677), Makro-Startfix .137 [5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5124373), D-Abschluss .136 [8efb926](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8efb926). |
| Protokoll | V4-C / Ruleset 2; Board 5.5, Extractor 5.22, Delta 1.12; Narrator-Vertragsrevision .85. |
| Architekturplan nach .126 | **A Foldintegrität, B1 aktive Regelvariante, C Population/Alter/Identität, D Gearangebote/Kaufzustimmung implementiert und im Diff gegengeprüft.** [Umsetzungsspezifikation](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md); [D-Abschluss und ST-Bericht](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md). |
| Node / Replay | Auf .141 **2.553/2.553 Node-Tests**, Finanzregressionen **20/20** (zwei neue Gruppen auf .140 rot). **2.235 Replayfälle**, 198 exakt akzeptierte Fingerprints, keine offenen oder neuen Abweichungen; Accepted-Liste unverändert. |
| Echter ST-Host | Auf .141 **Standard 24/24, Failsoft 29/29**, ST 1.19.0 / Chromium / Mockprovider; erfolgreiche Läufe ohne PageErrors. Erster Failsoft-Lauf 28/29 wegen zweier ST-Statusprüfungs-`AbortReason`-Meldungen; Kontrolllauf .140 und unveränderte .141-Wiederholung grün. [Details §9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3d8f062143956b4932398c4583f8962c9dfcffdd/avereth-engine/docs/FIX138_FINANCE.md). Makro-Starttest .137 weiterhin 26/26. |
| Naturtests | **[Batch20 auf .137](testrun_10b/batch-20261031-140346Z/REVIEW.md)**: Warrior260/L12 Limit, Mage9/L1 manuell unterbrochen, Rogue nicht gestartet. Start funktioniert, Warrior24/24Siege, fünf Guildabschlüsse und drei Gearwechsel. Preis-/Zahlungsrichtungsfehler bestätigt; Claude und Sol haben gegengeprüft (§7/§8). T149 ist eine falsche Extractor-ID, kein mehrsätziger Belegfehler. Finanzfolgepatch als [.138](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c3fa856) umgesetzt; zwei externe Feedbackrunden bestätigt und in [.139](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5db8657) und [.140](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/c37a677) korrigiert (Lohnforderung, Bedingungen, Besitz ≠ Zahlbetrag). Original-ZIP und Hashmanifest archiviert. |

**Grundsatz:** LLM entwirft Welt und Erzählung; JS-Engine entscheidet und persistiert Mechanik. Drei Startklassen, Skills/Passives, Living Dungeons, F-Gear und technisch möglicher F→E-Wechsel sind vorhanden. Natürliches Level 15 wurde in Batch 17 von Warrior und Mage erreicht; die **natürliche E-Klassenannahme** und die gemeinsame F→E-Balance sind weiterhin offen. Kein altes Kampagnenformat muss weiter unterstützt oder migriert werden.

## Geschlossener Startblocker – Makro-Lifecycle (.137)

**Original:** `batch-20261031-125921Z.zip` (lokaler Upload). Warrior, Mage und Rogue stoppten auf .136 jeweils vor der Charaktererstellung mit `CAMPAIGN START HIDDEN`: die Engine hatte `campaign.started` auf dem **rohen** Begrüßungstext mit `{{user}}`/`{{pick}}` angelegt, SillyTavern danach den sichtbaren Text aufgelöst. Der .131-Doppeltstartschutz verweigerte korrekt einen zweiten Start; beim Warrior wich der gebuchte Seed-Ort (Ashbridge) vom angezeigten Ort (Alderwatch) ab.

**Fix [.137 / 5124373](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/512437369242fcc498c27051514525c78c4f153b):** nur **vor dem ersten Start** verwendet die Engine SillyTaverns eigene `substituteParams`-Auflösung; genau ein Record mit passendem Ort/Hash. Spätere echte Änderungen bleiben geschützt. Runner prüft Startrecord/Ort **vor Spielerzug 1**. Laut Claude: 9 gezielte Regressionen (5 zuvor rot), 2.532/2.532 Node, Replay grün, ST Standard 24/24, Failsoft 29/29 und **makrohaltiger ST-Start 26/26** mit Warrior/Mage/Rogue und Skillwahl. Die früheren beschädigten .136-Chats werden bewusst nicht repariert – neue Kampagne starten. Claude führte keinen natürlichen Langlauf aus. Der spätere Nutzerlauf Batch20 bestätigt den Start bei Warrior/Mage; Rogue bleibt natürlich offen.

## Nächste Reihenfolge

1. **Finanz-Gegenreview abgeschlossen und zwei weitere P1-Lücken in .141 korrigiert** ([Patchnote §9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/3d8f062143956b4932398c4583f8962c9dfcffdd/avereth-engine/docs/FIX138_FINANCE.md)): Gegenstandsanzahl und „hood up“ belegen keine Zahlung; verknüpfte Voraussetzungen und weitere Bedingungsmarker verhindern vorzeitige Preisbindung. Keine Änderung an Runner, XP×5, Startwerten oder Balance. Nächster Schritt ist der natürliche Batch auf .141; keine weitere vorsorgliche Patchrunde.
2. **Natürlichen Batch F danach fortsetzen:** Warrior/Mage/Rogue bis Erstellung → Level15 → ausdrückliche E-Klassenannahme; Batch20 prüfte weder L15 noch E und erlaubt keine vollständige Drei-Klassen-Balanceaussage. [Runner-Anleitung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6cc09cd/avereth-engine/docs/LIVE_RUNNER.md).
3. **B2/E bleiben nachrangig und nicht begonnen.** Main/Minor, F/E-Scaling, Monsterdesign und NPC-Memory sind eigene Themen mit eigener Freigabe. [Offene Kandidaten](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md).

## Historische Referenzen statt doppelter Protokolle

- **Frühere Builds, natürliche Batches 1–19:** [Runindex](testrun_10b/README.md), [Originalarchiv](testrun_10b/ARCHIV_BATCHES.md) und [10B-Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).
- **Aktuelle Architektur A/B1/C/D:** [konsolidierter Plan](patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md), [Produkt-Patchnote D samt Nachweisen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/019c32b/avereth-engine/docs/PATCH_ARCH_D133_GEAR_OFFERS.md).
- **Ausführliche vor dieser Kürzung gültige Statusfassung:** [Commit 6142f24](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/6142f24/03_AKTUELLER_PROJEKTSTAND.md).

Keinen Produktcommit mit einem reinen Dokumentationscommit auf `main` verwechseln. Echte ST-Smokes mit Mockprovider sind Integrationsnachweise, kein natürlicher Modell-Livetest.
