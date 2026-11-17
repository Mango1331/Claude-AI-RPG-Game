# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Dokumentationsabgleich 17.11.2026; unveränderte Produktreferenz und ältere Testbelege.** **Dies ist die einzige laufende Statusquelle**, keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Zielbild 08](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| | Bestätigter Stand |
|---|---|
| **Produkt** | **`4.3.0-c.6.6.200`**, eingefrorener Produktstand. `.193/.194` Bossloot V1, `.195` Basis 5 + einmalig zwei Favored +1, je weiterem Level 5 frei; `.196–.198` Gear-/NPC-/Schildbalance, `.199` PULSE × NPC-Begegnungsbuchung, `.200` vollständige E3-Kompaktkarten. [Balance .198](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/BALANCE_198.md) · [Encounter .199](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/ENCOUNTER199.md) · [NPC .200](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/NPC200.md) |
| **Produktbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). **Unveränderte Basis für die laufende `.200`-Vereinfachungsanalyse; kein neuer Produktbuild beauftragt.** |
| **Archivierter Experimentbranch** | [`experiment/dynamic-gm-model`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model), zuletzt [`d8baa91`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/d8baa91ffa595ecf6076266ceed9e04ef164778e). Enthält den B/C1-Durchstich und die dynamische GM-Alpha. **Nicht mehr als Produkt- oder Zielarchitektur geplant.** [Archiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md). |
| **Dokumentation** | `main`: [aktuelles Nutzerziel / Ideen](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md) und [Archiv beider Versuche](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md). [Audit](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) und [frühere Neubewertung](recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md) sind **Quellen mit historischen Empfehlungen**, nicht mehr richtungsweisend. |
| **Heutige Produktarchitektur** | `.200` V4-C / Ruleset 2: Planner → deterministische Engine → Narrator → Extractor/Firewall; plus gegebenenfalls Reparaturrequests. Dieselben GLM-Funktionen sind **getrennte physische Requests**. **Kein dynamischer GM als beschlossene Zielarchitektur.** |
| **Letzte technische Produktbelege** | `.200`-Patchnote: **3345/3345** Node und **2235/2235** Replay, 0 neue/offene/veraltete Fingerprints. Isolierter ST1.19-Mock-Smoke nach `.200`-Merge laut Abnahmebericht: Standard **231/231**, Failsoft **236/236**, 0 PageErrors. Diese Zahlen wurden **in dieser Dokumentationsrunde nicht neu ausgeführt**. |
| **Persönlicher Realtest** | **16.11.2026 auf `.200`**: Erstellung korrekt (Mage INT 6/WIL 6), erste Waldreise narrativ sichtbar, Extractor nach ca. 121 s fehlgeschlagen, anschließend drei `concurrency_limit_exceeded`-Ablehnungen. Der Waldort wurde **nicht** gebucht. Gesichert ist ein Provider-Concurrencyproblem, **nicht** ein Creditverbrauch. Siehe [Architekturaudit §4](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md). Persönliche Spieltests vorerst pausiert. |
| **Letzter gesonderter NPC-/PULSE-Naturlauf** | [Batch auf `.191`](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md): Warrior 70/70, Rogue 22/70, Mage 0/70. Kein vollständiger Dreiernachweis. |
| **Archivierte Architekturversuche** | B/C1: 61/61 isolierte technische Tests, C1-Semantik nicht bestanden. Dynamische GM-Alpha nach `d8baa91`: 57/57 Node und ST-Mocks, **aber natürliche Gildenreise am 17.11. trotz drei Modellrequests ohne veröffentlichte Antwort**. Keine Produkt-/Spielqualitätsabnahme. [Archiv](recherche/ARCHITEKTUR_EXPERIMENTE_ARCHIV_2026-11-17.md). |

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

## Unmittelbare nächste Arbeit

**Aktiv: Abschlussanalyse zur gezielten Vereinfachung der vorhandenen `.200`.** Die frühere dynamische-GM-Produktlinie wird nicht weiter verfolgt. Neue Gameplayfeatures aus 07 pausieren; kein Codeauftrag bis zum gemeinsamen Review.

1. **Astra Ultra** untersucht die bestehende Engine, reale Reise-/Payment-/Repairfälle, den Nutzen und Aufwand aller drei normalen LLM-Phasen und zusätzlicher Reparaturen sowie die Erkenntnisse aus beiden Experimenten. Nutzerziel: **weniger überstrenge Spielregeln, mehr Narratorfreiheit und Spielerhilfe**, nicht dieselbe Strenge schneller durchsetzen. [Briefing](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md).
2. **GPT-Gegenreview** prüft Originalcode und historische Gründe der Guards; bewertet auch bewusst lockerere Alternativen und ihre echten Risiken. Keine automatische Implementierungsempfehlung aus einem Bericht.
3. **Nutzer entscheidet** über zulässige Orts-/Weltübernahme, einfache Zahlungen, Spielervorschläge und mechanische Kontrollgrenzen. Erst dann begrenzter `.200`-basierter Versuch und früher natürlicher Test.
4. **HUD-/Spielerhilfe als bevorzugt zu untersuchende Möglichkeit:** Skills und Gegner bereits in der Combat-HUD bekannt, per Buttons mit IDs auswählen; **freier Begleiter-/Rollenspieltext bleibt in derselben Eingabe**. Bei eindeutiger HUD-Aktion möglicher Entfall des Plannerrequests; Extractor nur bei relevantem Welt-/Memorybedarf prüfen.
5. **Bei Unsicherheit** Vorschlag im Textfeld mit **„So übernehmen“ / „Bearbeiten“** statt weiterer API-Reparatur; für einfache Tavernen/Shopangebote vorbereitete Preise und `#pay`-Komfort prüfen. **Automatischer Weltabschlussstatus** „Erzählung sichtbar / Weltabgleich läuft / bestätigt gespeichert / Fehler“; Folgeeingabe darf geschrieben, aber vor Persistenz nicht ausgeführt werden. Swipe/Regenerate und Eventexport erhalten.

**Status:** Alle Vorschläge sind zur Analyse freigegeben, **nicht als geänderte Kanonregel oder Implementierungsauftrag**. Der unveränderte `.200`-Kanon bleibt bis zur bewussten Entscheidung gültig.

## Natürliche Läufe – Kurzüberblick

| Lauf | Kernaussage | Quelle |
|---|---|---|
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

- **Heute gilt `.200`:** der strenge Ankunfts-/Orts-, Zahlungs-, Combat- und Agency-Kanon aus [02](02_DESIGN_KANON.md). **Neu geprüft:** kontrollierte Lockerung, Spielerbestätigung, geringere Repairpflicht. Kein stillschweigender Produktregelwechsel.
- **Bewährten Kern schützen:** Kampfrechnung, HP/XP/Leveln, RNG, Loot, NPC-Kontinuität, Quests, HUD, Eventlog, Edit/Swipe/Regenerate. Nicht für eine neue Architektur nochmals aufbauen.
- **Featherless:** 4 verfügbare gewichtete Einheiten, 4 pro GLM-Request im persönlichen Setup; ein lokaler Timeout ist kein bestätigter Remoteabschluss. Gesamtwartezeit und Zahl **physischer** Requests messen.
- **Experimenttechnik selektiv nutzen:** Kapazitätssperren, Journale, Wiederaufnahme und Commit-vor-Publikation sind wertvoll, rechtfertigen keine Übernahme der fehlgeschlagenen GM-Alpha.
- **Mock ist kein natürlicher Erfolg.** Bei Tests sichtbare Erzählung von tatsächlich gebuchten Events und bestätigter Persistenz unterscheiden. [Zielbild](08_SPIELFLUSS_VEREINFACHUNG_200_ANALYSEBRIEF_2026-11-17.md).

## Historische Detailquellen

Die vorige, ausführliche Fassung dieser Datei steht im [Git-Snapshot vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md). Sie enthält die Detailabsätze zu `.186–.189` und die damaligen Prioritäten. Ältere Stände: [Snapshot ec0969b](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) und das [Archiv bis 24.10.](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Testzahlen stehen in den Produktpatchnotes. **Dokumentationspflege am 17.11.2026:** Nutzerziel und natürlicher Alpha-Gegenbeleg ergänzt, frühere Modellversuche archiviert. **Keine Produkt-, LLM- oder Testausführung** durch diese Dokumentationspflege.
