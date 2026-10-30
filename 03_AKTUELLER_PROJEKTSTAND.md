# Avereth Engine – aktueller Projekt- und Abnahmestand

**Stand: 30.10.2026.** Führende Quelle für Produktstand, Abnahme und nächste Schritte. [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [10B-Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Runindex](testrun_10b/README.md).

## 1. Engine und verbindliche Trennung

| Punkt | Verifizierter Stand |
|---|---|
| Repository | [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game) |
| Produktbranch | `claude/c-planner-prototype-2026-10-02-gpt-c666` |
| Letzter Enginepatch | **[00fa7f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f11567067da59f8a89e94a49f4c2618464f), Build `4.3.0-c.6.6.121`** |
| Aktueller Entwicklungs-HEAD | [00fa7f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f11567067da59f8a89e94a49f4c2618464f); enthält auch den Warrior-Runner-Folgecommit7f96131 |
| Dokumentation/Reviews | `main`; dessen neuere Dokumentationscommits erhöhen den Produktbuild nicht |
| Protokolle | Board `5.5`, Extractor `5.19`; Narrator-Vertragsrevision `.85`, durch .121 kein Kartenupdate |
| Produktpfad | SillyTavern, V4-C/semantischer Planner, Ruleset 2; Ruleset-1-Legacy bleibt kompatibel |

Das LLM gestaltet die Welt; JavaScript berechnet und persistiert Mechanik. Events und bestätigte Systemmeldungen sind maßgeblich. Drei Startklassen, organische Skills/Passives, Proficiency, Living Dungeons und technische F→E-Klassenentwicklung sind vorhanden. **Natürliches Level 15 und abschließendes F→E-Balancing sind weiterhin nicht abgenommen.** Vor technischen Aussagen beide Remote-HEADs und den tatsächlichen Produktcode prüfen.

**Letzter Patch .121:** Gemeinsamer XP-Faktor5 statt2 für neue Kampf-/Questberechnungen, damit 2,5-mal die bisherigen Belohnungen. Levelschwellen, PP/LP, Geld, Gear und Kampfwerte unverändert. Alte Eventbeträge und bereits fixierte Encounter-DefeatXP werden nicht neu berechnet. [Technik, Beispiele und Testanpassungen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00fa7f11567067da59f8a89e94a49f4c2618464f/avereth-engine/docs/PATCH10B_XP_REWARDS.md). Die Gilden-/Duplikatkorrekturen aus.120 und der Warrior-Einkaufsversuch bleiben enthalten.

## 2. Verfügbare Nachweise – die jüngsten zuerst

| Nachweis | Ergebnis und Grenze |
|---|---|
| **.121 technische Abnahme** | Drei vorhandene XP-Kalibrierungsfälle auf.120 rot, danach3/3 grün; abschließend **2348/2348** Node, Testparallelität4. Erster Gesamtlauf2325/2348 hatte alte Zahlen-/Levelannahmen; Original-JSON-Fixtures unverändert. Zusätzlich alle3845 Batch15-Events neu gefaltet, drei historische Endzustände identisch und gültig. Kein neuer ST-Smoke bei reiner XP-Kalibrierung, **kein natürlicher .121-Lauf**. [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/00fa7f11567067da59f8a89e94a49f4c2618464f/avereth-engine/docs/PATCH10B_XP_REWARDS.md). |
| **.120 technische Abnahme** | 25 neue Tests: auf .119 **16 rot / 9 grüne Kontrollen**, danach **25/25**; angrenzend **114/114**; vollständige npm-test-Dateiliste **2348/2348**, Testparallelität 4. Echter ST-1.19-Mock-Smoke abschließend **23/23**, 6 Extraktionen, keine PageErrors. Ein Zwischenlauf **22/23** wegen ST-`AbortError`, unveränderter Wiederholungslauf grün. Details in der Fachpatchnote oben. **Kein natürlicher .120-Lauf.** |
| **Batch 15, natürlicher .119-Lauf** | Warrior **73 Inputs/L3/Tod**, Mage **150/L8/Limit**, Rogue **33/L2/Tod**; **17/19 Siege**, 10 Gildenabschlüsse, kein terminaler technischer Fehler. Alle **3845 Events** unabhängig neu gefaltet und validiert. Echte Filialgründung belegt, dennoch T141 unbezahlt; in .120 korrigiert. Dieselben sechs Kills erfüllten zwei Altverträge; neue Duplikate jetzt gesperrt. Kein Gearupgrade. [Review samt Gegenprüfung](testrun_10b/batch-20261029-174048Z/REVIEW.md). |
| **Batch 14, natürlicher .117-Lauf** | Warrior150/L8, Mage150/L9, Rogue116 abgeschlossene Inputs/L6, danach manueller Stopp; **37/37 Siege**, 16 Gildenabschlüsse. Geld-/Filialbefunde führten zu .119. **T117 hatte erst 3/6 Kills, dort noch keine Auszahlung fällig.** [Review](testrun_10b/batch-20261029-131555Z/REVIEW.md). |

Original-ZIPs der jüngsten Batches wurden als Chatupload geprüft, sind **nicht auf GitHub archiviert**. Ein neuer Chat ohne diese Dateien kann deren Originalprüfung nicht wiederholen. Review, technische Sonde, Mock-Smoke und natürlicher GLM-Lauf sind unterschiedliche Nachweise. Ältere Ergebnisse stehen im [Runindex](testrun_10b/README.md) und in der [Statusfassung vor dieser Kürzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/03_AKTUELLER_PROJEKTSTAND.md); sie werden hier nicht nochmals als Abnahmetabelle geführt.

## 3. Aktuelle Entscheidungen und nächste Arbeit

1. **Nächster Schritt:** unabhängiger Diff-Gegenreview von .121, danach natürlicher Vergleichsbatch einschließlich der noch offenen natürlichen .120-Gildenabnahme. XP-Tempo Richtung Level15 in etwa200 Eingaben beobachten; keine Garantie aus der Hochrechnung. Besonders kanonische/neue Filialen, GO→READY-Abgabe, unterschiedliche Jagdziele, Repair und einmalige Vergütung beobachten. Keine weiteren vorsorglichen Mikrofixes vor diesem Test.
2. **Runner:** Standardbatch `guild-warrior`, `guild-mage`, `guild-rogue`, nacheinander. `current_test` zielt auf Level15; 100 Inputs sind Vergleichspunkt, Guidegrenze1000, explizite CLI-Limits können früher beenden. Aktueller [Warrior-Gearversuch7f96131](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7f96131fd3790607cf138988d639a018334e9493): Nur Guild-Warrior sucht beim sicheren Siedlungsbesuch ab100cp vorrangig einen Schmied, vergleicht Waffen/Rüstung und kauft/rüstet sinnvolle bezahlbare Upgrades aus; 20cp bleiben für Erholung. Hinweis auch nahe jeder Entscheidung und in Short-/Minimal-Prompts; kein Endloskaufversuch oder erfundener Erfolg. Mage/Rogue, Explore und normaler Einzelguide bleiben unverändert. Runner-Suite132/132, volle Node-Suite2348/2348; kein neuer ST-Smoke bei reiner Spielerpromptänderung. Natürliche Wirksamkeit noch offen. Die AoE-Startervorgabe und freie Abenteuerwahl bleiben. Während eines lokalen Batches keinen Pull in dessen laufender Umgebung; separate Entwicklung/Pushes sind möglich.
3. **Offene Beobachtungen:** Gearupgrades trotz Einkaufsanweisung bislang nicht natürlich belegt; frühe Kampftode nicht pauschal als Enginefehler oder Klassenbalancebeweis behandeln. Sichere Fortsetzung, verlorene Aktion, fehlende World-Übernahme und mechanische Integrität getrennt auswerten. Sallows ungebuchte 4-cp-Kurzform ist ein älterer Beleggrenzfall, keine nachgewiesene .119-Regression. Mehr Details beim Run.
4. **Vorbereitet, nicht implementiert:** [Main-/Minor-Kampfplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md): normale Bewegung und Mobility teilen den Minor-Slot, PC-/NPC-Parität und Legacy schützen. Vor Umsetzung neue Freigabe und Abgleich der .104-Planbasis mit aktuellem Code. E-Scaling, Monsterdesign, NPC-Langzeitgedächtnis und freiere Questüberschneidungen sind spätere Themen, keine Nebenaufträge.

**Auftragsgrenze:** .121 ist umgesetzt; kein natürlicher Batch durch Sol gestartet. Review oder vorhandener Plan allein autorisiert keine Produktänderung. XP×5, Startwerte 7, F-Balanceversuch, AoE, Gear und Geldbelege werden ohne Auftrag nicht weiter verändert.

## 4. Pflege und Archivgrenze

Arbeitsregeln nur in **01**, Kanon nur in **02**, laufender Stand hier, technische Umsetzung in der jeweiligen **Dev-Fachpatchnote**, Originalbewertung beim **Run**. **04** enthält spätere Ideen, **06** den Fachindex. Historische Quellen bei Bedarf gezielt öffnen: [Patch 8/9](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md), [altes 10B-Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Keine vollständige Archivlektüre als Chatstart.
