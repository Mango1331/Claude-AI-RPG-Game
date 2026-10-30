# Avereth Engine – aktueller Projekt- und Abnahmestand

**Stand: 30.10.2026.** Führende Quelle für Produktstand, Abnahme und nächste Schritte. [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [10B-Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) · [Runindex](testrun_10b/README.md).

## 1. Engine und verbindliche Trennung

| Punkt | Verifizierter Stand |
|---|---|
| Repository | [Mango1331/Claude-AI-RPG-Game](https://github.com/Mango1331/Claude-AI-RPG-Game) |
| Produktbranch | `claude/c-planner-prototype-2026-10-02-gpt-c666` |
| Letzter Produktcommit | **[ca7a78f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece), Build `4.3.0-c.6.6.120`** |
| Dokumentation/Reviews | `main`; dessen neuere Dokumentationscommits erhöhen den Produktbuild nicht |
| Protokolle | Board `5.5`, Extractor `5.19`; Narrator-Vertragsrevision `.85`, durch .120 kein Kartenupdate |
| Produktpfad | SillyTavern, V4-C/semantischer Planner, Ruleset 2; Ruleset-1-Legacy bleibt kompatibel |

Das LLM gestaltet die Welt; JavaScript berechnet und persistiert Mechanik. Events und bestätigte Systemmeldungen sind maßgeblich. Drei Startklassen, organische Skills/Passives, Proficiency, Living Dungeons und technische F→E-Klassenentwicklung sind vorhanden. **Natürliches Level 15 und abschließendes F→E-Balancing sind weiterhin nicht abgenommen.** Vor technischen Aussagen beide Remote-HEADs und den tatsächlichen Produktcode prüfen.

**Letzter Patch .120:** Kanonische Gildenidentität statt erneuter Deutung beschreibender Ortsnamen; erfüllter Originalvertrag T141 zahlt nach bestätigter Ankunft einmal 40 cp. Neue doppelte gezählte Jagden werden bei Boardprüfung/Repair und Annahme verhindert. Mechanisch getrennte Ziele und bereits angenommene Altverträge bleiben gültig. [Technik, Regressionen und Grenzen](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece/avereth-engine/docs/PATCH_GUILD120_IDENTITY_AND_HUNT_DUPLICATES.md).

## 2. Verfügbare Nachweise – die jüngsten zuerst

| Nachweis | Ergebnis und Grenze |
|---|---|
| **.120 technische Abnahme** | 25 neue Tests: auf .119 **16 rot / 9 grüne Kontrollen**, danach **25/25**; angrenzend **114/114**; vollständige npm-test-Dateiliste **2348/2348**, Testparallelität 4. Echter ST-1.19-Mock-Smoke abschließend **23/23**, 6 Extraktionen, keine PageErrors. Ein Zwischenlauf **22/23** wegen ST-`AbortError`, unveränderter Wiederholungslauf grün. Details in der Fachpatchnote oben. **Kein natürlicher .120-Lauf.** |
| **Batch 15, natürlicher .119-Lauf** | Warrior **73 Inputs/L3/Tod**, Mage **150/L8/Limit**, Rogue **33/L2/Tod**; **17/19 Siege**, 10 Gildenabschlüsse, kein terminaler technischer Fehler. Alle **3845 Events** unabhängig neu gefaltet und validiert. Echte Filialgründung belegt, dennoch T141 unbezahlt; in .120 korrigiert. Dieselben sechs Kills erfüllten zwei Altverträge; neue Duplikate jetzt gesperrt. Kein Gearupgrade. [Review samt Gegenprüfung](testrun_10b/batch-20261029-174048Z/REVIEW.md). |
| **Batch 14, natürlicher .117-Lauf** | Warrior150/L8, Mage150/L9, Rogue116 abgeschlossene Inputs/L6, danach manueller Stopp; **37/37 Siege**, 16 Gildenabschlüsse. Geld-/Filialbefunde führten zu .119. **T117 hatte erst 3/6 Kills, dort noch keine Auszahlung fällig.** [Review](testrun_10b/batch-20261029-131555Z/REVIEW.md). |

Original-ZIPs der jüngsten Batches wurden als Chatupload geprüft, sind **nicht auf GitHub archiviert**. Ein neuer Chat ohne diese Dateien kann deren Originalprüfung nicht wiederholen. Review, technische Sonde, Mock-Smoke und natürlicher GLM-Lauf sind unterschiedliche Nachweise. Ältere Ergebnisse stehen im [Runindex](testrun_10b/README.md) und in der [Statusfassung vor dieser Kürzung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7994fa42b115f21b705c0b770e2b4e31fde67f77/03_AKTUELLER_PROJEKTSTAND.md); sie werden hier nicht nochmals als Abnahmetabelle geführt.

## 3. Aktuelle Entscheidungen und nächste Arbeit

1. **Nächster Schritt:** unabhängiger Diff-Gegenreview von .120, danach natürlicher Vergleichsbatch. Besonders kanonische/neue Filialen, GO→READY-Abgabe, unterschiedliche Jagdziele, Repair und einmalige Vergütung beobachten. Keine weiteren vorsorglichen Mikrofixes vor diesem Test.
2. **Runner:** Standardbatch `guild-warrior`, `guild-mage`, `guild-rogue`, nacheinander. `current_test` zielt auf Level 15; 100 Inputs sind Vergleichspunkt, technische Guidegrenze 1000. Tatsächliche CLI-Limits können früher beenden – die jüngsten Läufe endeten bei 150. Freie Quest-/Buildwahl, Lootverkauf, frühe Gearprüfung, Lernen und Recovery; eine der zwei Starterwahlen ist derzeit der jeweilige AoE für den Vergleich. Runner-Folgecommit [846a7c3](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/846a7c3). Auf .120 unverändert. Während eines lokalen Batches keinen Pull in dessen laufender Umgebung; separate Entwicklung/Pushes sind möglich.
3. **Offene Beobachtungen:** Gearupgrades trotz Einkaufsanweisung bislang nicht natürlich belegt; frühe Kampftode nicht pauschal als Enginefehler oder Klassenbalancebeweis behandeln. Sichere Fortsetzung, verlorene Aktion, fehlende World-Übernahme und mechanische Integrität getrennt auswerten. Sallows ungebuchte 4-cp-Kurzform ist ein älterer Beleggrenzfall, keine nachgewiesene .119-Regression. Mehr Details beim Run.
4. **Vorbereitet, nicht implementiert:** [Main-/Minor-Kampfplan](patch_plans_10b/PATCH_COMBAT_MAIN_MINOR_ACTIONS.md): normale Bewegung und Mobility teilen den Minor-Slot, PC-/NPC-Parität und Legacy schützen. Vor Umsetzung neue Freigabe und Abgleich der .104-Planbasis mit aktuellem Code. E-Scaling, Monsterdesign, NPC-Langzeitgedächtnis und freiere Questüberschneidungen sind spätere Themen, keine Nebenaufträge.

**Auftragsgrenze:** .120 ist umgesetzt; kein natürlicher Batch durch Sol gestartet. Review oder vorhandener Plan allein autorisiert keine Produktänderung. XP×2, Startwerte 7, F-Balanceversuch, AoE, Gear und Geldbelege werden ohne Auftrag nicht weiter verändert.

## 4. Pflege und Archivgrenze

Arbeitsregeln nur in **01**, Kanon nur in **02**, laufender Stand hier, technische Umsetzung in der jeweiligen **Dev-Fachpatchnote**, Originalbewertung beim **Run**. **04** enthält spätere Ideen, **06** den Fachindex. Historische Quellen bei Bedarf gezielt öffnen: [Patch 8/9](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md), [altes 10B-Journal](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0ebf4496f185a69ebac235a337ab9dd2e2b470c7/06_PATCH10B_MASTERPLAN_UND_REVIEWS.md). Keine vollständige Archivlektüre als Chatstart.
