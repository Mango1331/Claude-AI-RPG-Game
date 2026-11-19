# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Dokumentationsabgleich 19.11.2026; Produkt `.200` eingefroren, Entwicklungsbuild `.203` technisch abgenommen, User06 durch Charaktertod beendet (Originalreview ausstehend).** **Dies ist die einzige laufende Statusquelle**, keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Zielbild 08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| Thema | Verifizierter Stand / Grenze |
|---|---|
| **Eingefrorenes Produkt** | **4.3.0-c.6.6.200**, Branch `claude/c-planner-prototype-2026-10-02-gpt-c666`, [HEAD 0cd1480](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). **Kein Merge von .203.** |
| **Aktuelle Entwicklungs-/Testbasis** | **4.3.0-c.6.6.203**, Branch `experiment/action-hud-200-v1`, [HEAD 5e5b827](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/5e5b8272412b51b91f75b6e37c5b94d95c9fae11): F-Bindung, Kampf-HUD, AoE, Items, direkte Questannahme, Weltstatus/Save und enge Kontextfixes. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/5e5b8272412b51b91f75b6e37c5b94d95c9fae11/avereth-engine/docs/PATCH_USER05_FIX_QOL_203.md). |
| **Technische Abnahme .203** | Implementiererbericht: 64/64 gezielte, **3.398/3.398 Node**, **2.235 Replay ohne neue Abweichung**, **108/108 ST gezielt**, **337/337 Standard**, **343/343 Failsoft**, 0 PageErrors. Unabhängiger Code-Diffreview: GO für persönlichen Spieltest. **Keine erneut unabhängig ausgeführte Gesamtsuite und keine allgemeine natürliche Qualitätsfreigabe.** |
| **User05** | Persönlicher .202-Run, nach Phase C bewusst beendet; 26 Inputs, 341 Events, 64 Requests, fünf F-Bindungsverweigerungen. [Originale](testrun_10b/user-20261118-011503/README.md) · [Gegenreview](recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md). |
| **User06** | Persönlicher .203-Run, **am 19.11. laut Nutzer durch Charaktertod beendet**. [Vier Originaldateien und die Performance-Vorauswertung](testrun_10b/user-20261119-010838/README.md) sind nun auf `main` archiviert. Die Todesursache/Fairness und das abschließende Spielgefühl sind **nicht** vollständig geprüft. **Kein aktiver Spieltest.** |
| **Forschung** | [Unabhängige Work-Performanceanalyse 19.11.](recherche/AVERETH_203_PERFORMANCE_EFFIZIENZ_UNABHAENGIGE_RECHERCHE_2026-11-19.md) · [alle Forschungsberichte](recherche/README.md). Noch keine natürliche Leistungssteigerung durch neuen Patch nachgewiesen. |
| **Historische Architekturversuche** | B/C1 und dynamischer GM [archiviert](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md), nicht als aktuelle Produktmigration freigegeben. |

## Was technisch umgesetzt ist

Details stehen nur an der verlinkten Quelle.

| Bereich | Build | Stand |
|---|---|---|
| **Orte, Reisen, Dungeons** | `.190–.192` | Ortsbuch, Bewegungsnachweis je GO, B5-Dungeonabschnitte, D1b/D2/D3, N1/N2/N4 ([Patchnote .190](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/9635f722e8fb843ae65a7b271cfd3b73241e98b3/avereth-engine/docs/BUILD_190_LOCATION.md), Kanon §§2, 7). `.191`: Ebenenende, Gebäudesperre, Zimmerhoheit, widerlegte Berichte, Halte auf dem Weg ([Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/b8d3be52c40e540ea1f11fb187914c5eddda12a5/avereth-engine/docs/FOLLOWUP_190_191.md)). `.192`: Slot-Einladung der Dungeon-Karte, Thread-Wächter, Stadt-Jagdorte, `met` am erreichten Ort, TRAVEL-Zeile |
| **Bossloot V1 / U10** | `.193–.194` | U1–U11 im bestehenden Lootpfad, einschließlich historischem `solo`-Merkmal; [PR #15](https://github.com/Mango1331/Claude-AI-RPG-Game/pull/15) regulär gemergt. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/BOSSLOOT_V1_193.md) |
| **PC-Statwachstum** | `.195` | Startbasis5 und zwei einmalige Favored-Boni; pro Level5 freie Punkte, keine automatischen Favored-Punkte. Keine NPC-/XP-/Klassenentwicklungsänderung. [Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/STAT_GROWTH_195.md) |
| **Monster A1/A2** | `.184–.186` | Spezialorgane nur mit Beleg; humanoide Monster mit fester Waffe für Kampf, Anzeige und Beute. A2-4 (Waffen in DUNGEON AHEAD) zurückgestellt. [Fachplan](patch_plans_10b/FACHPLAN_MONSTER_ANATOMIE_LOOT_A1_A2.md) |
| **Kauf, Zahlung, Dienste** | `.185–.189` | `#pay`-Karte, bedingter Kauf, `PAID HERE`, Arbeit ist kein Kauf, angeheuerter Jäger. [`.185`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/d556580347432a45b8cb47c8c82b34a4e6ea8764/avereth-engine/docs/STABILIZATION_185.md) · [`.187`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd52d2f9a002c62e321634ae1e8894fefd3918f6/avereth-engine/docs/BATCH186_FIXES_187.md) · [`.189`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/44382419d2539f2a398f9c7df5139571c12d6d73/avereth-engine/docs/FOLLOWUP_187_189.md) |
| **Batch-Korrekturen** | `.180–.183` | Registrierung/Planner, PULSE-Reisehalt, Queststatus, Extractor-Formen, E3-V-1. [Gegenreview §11](testrun_10b/npc-20261112-220625Z/REVIEW.md) |
| **NPC E0–E3** | `.158–.179` | Sofortkontinuität; Wiederanwesenheit und Absprachen (E2); Persönlichkeitsanker (E3, natürlich belegt seit `.183`). [Fachplan](patch_plans_10b/NPC_E2_E3_FACHPLAN.md) |
| **PULSE A/B/C** | `.162–.168` | gemeinsames Fenster, ROAD AHEAD, Rastunterbrechung, Dungeonwanderer. Paket D erst nach natürlichen Daten. [Fachplan](patch_plans_10b/PULSE_W5_W7_TECHNISCHER_UMSETZUNGSPLAN.md) |
| **Gameplay/QoL** | `.155–.161` | Stealth S1, Board- und Dungeonanzeigen, editierbare Eingabeentwürfe. Stealth S2 **pausiert** |
| **Balance/Power** | `.196–.198` | Angepasste Waffenqualität im F-Rang, normales menschliches NPC-Statbudget und F-fine-Schild; siehe Produktpatchnotes |
| **PULSE/NPC-Kompaktkarten** | `.199–.200` | PULSE-Schutz für bekannte zurückkehrende NPCs, enger Hesse-Präsenzbeleg und vollständige E3-Felder in kompakten NPC-Köpfen; siehe Produktpatchnotes |

## Unmittelbare nächste Arbeit – begrenzter persönlicher A/B-Performancevergleich

User06 ist beendet und seine Originale sind archiviert; eine vollständige fachliche Gameplay-/UI-/Balancebewertung steht noch aus. Keine pauschale Folgerung aus dem Charaktertod. Neue Gameplayfeatures [07](07_ROADMAP_NACH_10B_ENTWURF.md) bleiben pausiert.

Der unabhängige [GPT-Gegenreview der .203-Performance-Suite](recherche/GEGENREVIEW_203_PERFORMANCE_SUITE_GPT_2026-11-19.md) empfiehlt ein **begrenztes persönliches A/B-Performanceexperiment** mit zwei isolierten ST-1.19-Installationen als nächsten Schritt, **nicht** einen Produktmerge oder ein allgemeines Gameplay-GO. Kandidat ist `experiment/203-performance-optimization-suite` auf [8df38d3](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8df38d3fe4b62eafc2b746ada81e5f2470956dea), Referenz bleibt `.203 / 5e5b827`. S1, B1, der verkürzte P-/X-Marktkatalog, der begrenzte Board-Erstentwurf und der Save-Patch sind integriert; der normale Extractorvertrag und das ursprüngliche Preset sind Standard. X2 und Karte-vor-Lore sind optionale, natürlich noch nicht validierte Versuchsvarianten. [Codex-Etappenbericht](recherche/AVERETH_203_OPTIMIERUNGSSUITE_2026-11-19.md) · [Windows-Vorbereitung](recherche/performance_suite_203/AB_WINDOWS.md).

**Fachlich offen:** Die Torwache von User06 I18 bleibt trotz anderslautender Erzählung in der gebuchten Anwesenheit; das ist bereits auf der Referenz beobachtet und kein neuer Performancefehler. Für ein allgemeines Gameplay-GO bleibt die Originalprüfung von Präsenz, Todesursache und Fairness erforderlich. Echte GLM-Antwortqualität, Latenz, Cachetreffer und Reparaturhäufigkeit der neuen Varianten sind noch nicht gemessen. Kein persönlicher Test ist bereits angelaufen, und kein Produktmerge erfolgte.

## Natürliche Läufe – Kurzüberblick

| Lauf | Kernaussage | Quelle |
|---|---|---|
| **User06 · 19.11. · `.203`** | Laut Nutzer durch Charaktertod beendet. [Vier Originale und Performance-Vorauswertung](testrun_10b/user-20261119-010838/README.md); noch keine unabhängige Todesursachenprüfung oder natürliche Gesamt-Abnahme. | [Run und Auswertung](testrun_10b/user-20261119-010838/README.md) |
| **User05 · 18.11. · `.202`** | Bewusst nach Phase C beendet. Funktionierender Grundspielbogen, F-HUD-P1 und wesentliche UI-/Statusprobleme; keine Questabgabe, kein allgemeines Gameplay-GO. | [Run](testrun_10b/user-20261118-011503/README.md) · [Gegenreview](recherche/GEGENREVIEW_USER05_ACTION_HUD_202_FIX_QOL_2026-11-18.md) |
| **Persönliche GM Alpha · 17.11. · `d8baa91`** | Gilden-GO verstanden; neuer NPC/Dialog natürlich erzählt, durch formale Prüfung abgewiesen, Korrektur ebenfalls ohne Abschluss. **3 physische LLM-Aufrufe, 0 veröffentlichte Antworten.** | [Experimentarchiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md); Original-ST-Log im persönlichen Test, nicht auf GitHub |
| **Persönlicher Lauf 16.11. · `.200`** | Mage-Erstellung korrekt; erzählte Waldankunft bleibt nach Extractor-Timeout ungebucht; Concurrency 429. Architektur-Warnsignal, keine abgeschlossene Spielevaluation | [Audit §4](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) |
| `.191` · 15.11. | Bewegungsautorität bestätigt; fünf Szenenepisoden; T70-Thread; Guthabenstopps | [Review](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md) · [Gegenreview](testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md) |
| `.188` · 14.11. | 70/70/70; mehrzügige Ortsdrift, Dungeon-Passage-Schleife, Ortskatalog → Anlass für `.190` | [Review](testrun_10b/npc-20261114-161005Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-161005Z/GEGENREVIEW_OPUS.md) |
| `.186` · 14.11. | 70/70/70; Arbeitsangebot als Kauf (−14 cp), Warrior-Ortsdrift → `.187` | [Review](testrun_10b/npc-20261114-094810Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md) |
| `.183` · 13.11. | 9 E3-Anker; Rogue-Extractorstopp; Mage-Questwiderspruch → `.185` | [Review](testrun_10b/npc-20261113-135417Z/REVIEW.md) |
| `.179` / Pilot `.174` | 0 E3-Anker; P2-Ortsdrift und Plannerblocker → `.180–.182` | [`.179`](testrun_10b/npc-20261112-220625Z/REVIEW.md) · [Pilot](testrun_10b/npc-20261109-160250Z/REVIEW.md) |
| User04 · 06.11. · `.159` | vorheriger längerer persönlicher Spieltest: Level 1→8, Dungeon-Clear; Wünsche zu Bossbeute, Basis 5, stärkeren Bossen | [Review](testrun_10b/user-20261106-072640/REVIEW.md) |

Alle weiteren Runs stehen im [Runindex](testrun_10b/README.md).

## Architekturgrenzen und offene Designentscheidung

- **Produkt .200 bleibt eingefroren, Entwicklungsstand .203 ist getrennt geprüft.** Der [Kanon 02](02_DESIGN_KANON.md) wird durch Performanceexperimente nicht still verändert. [08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) ist die historische Ideengrundlage.
- **Bewährten Kern schützen:** Kampfrechnung, HP/XP/Leveln, RNG, Loot, NPC-Kontinuität, Quests, HUD, Eventlog, Edit/Swipe/Regenerate. Nicht für eine neue Architektur nochmals aufbauen.
- **Featherless:** 4 verfügbare gewichtete Einheiten, 4 pro GLM-Request im persönlichen Setup; ein lokaler Timeout ist kein bestätigter Remoteabschluss. Gesamtwartezeit und Zahl **physischer** Requests messen.
- **Experimenttechnik selektiv nutzen:** Kapazitätssperren, Journale, Wiederaufnahme und Commit-vor-Publikation sind wertvoll, rechtfertigen keine Übernahme der fehlgeschlagenen GM-Alpha.
- **Mock ist kein natürlicher Erfolg.** Bei Tests sichtbare Erzählung von tatsächlich gebuchten Events und bestätigter Persistenz unterscheiden. [Zielbild](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md).

## Historische Detailquellen

Die vorige, ausführliche Fassung dieser Datei steht im [Git-Snapshot vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md). Sie enthält die Detailabsätze zu `.186–.189` und die damaligen Prioritäten. Ältere Stände: [Snapshot ec0969b](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) und das [Archiv bis 24.10.](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Testzahlen stehen in den Produktpatchnotes. **Dokumentationspflege 19.11.2026:** .203-/User06-/Performance-Status berichtigt; historische Quellen bewahrt. **Keine Produkt-, LLM- oder Testausführung** durch diese Pflege.
