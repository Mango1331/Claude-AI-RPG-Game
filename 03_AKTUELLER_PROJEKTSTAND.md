# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Letzte verifizierte Abfrage: 15.11.2026.** **Dies ist die einzige laufende Statusquelle**, keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| | Bestätigter Stand |
|---|---|
| **Produkt** | `4.3.0-c.6.6.195`: Bossloot V1 einschließlich U10 sowie fünf freie Statpunkte ohne automatische Favored-Levelpunkte. [Bossloot-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/BOSSLOOT_V1_193.md) · [Stat-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/STAT_GROWTH_195.md) |
| **Produktbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`7044d29ba461a777dc758fcab9f8ca9394dd5a46`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/7044d29ba461a777dc758fcab9f8ca9394dd5a46). Regulärer Merge von [PR #16](https://github.com/Mango1331/Claude-AI-RPG-Game/pull/16), freigegebener Patch `f1abcf3`; Historie erhalten |
| **Dokumentation** | `main`. Den aktuellen HEAD vor jeder Bearbeitung abfragen |
| **Architektur** | SillyTavern-Extension V4-C / Ruleset 2. Ablauf: Planner → deterministische Buchung → Narrator → Extractor/Firewall. Das Eventlog ist autoritativ |
| **Letzte Produktabnahme** | `.195`: **3290/3290** Node-Tests, voller Replay **2235 Fälle**, 1131 exakt begründete Abweichungen gegen `.126`, **0 offen/0 veraltet**; selbst ausgeführt in der vorherigen Implementierungsrunde, [Quelle](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/STAT_GROWTH_195.md). Unabhängiger Produktdiff-Review laut Nutzer: **GO für Merge**. Letzter ST-Beleg auf `.193`: Standard 231/231, Failsoft 236/236, 0 PageErrors ([Quelle](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/7044d29ba461a777dc758fcab9f8ca9394dd5a46/avereth-engine/docs/BOSSLOOT_V1_193.md)); **keine ST-Abnahme auf `.194`/`.195`**, gesammelte Smokes folgen nach der Entwicklungsrunde. Kein neuer natürlicher Zug oder persönlicher Spieltest-GO |
| **Letzter natürlicher Lauf** | [NPC-/PULSE-Batch 15.11. auf `.191`](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md): Warrior **70/70**; Rogue **22/70** (Provider-Guthabenstopp); Mage **0/70** (Guthabenstopp). Das ist keine Dreierabnahme. [Opus-Gegenreview](testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md) und [GPT-Gegenbewertung](testrun_10b/npc-20261115-103140Z/GEGENBEWERTUNG_GPT_ZU_OPUS.md): Die Bewegungsautorität ist natürlich bestätigt (25/26 Schritte erreicht, 0 von der Engine verworfen; Folgeablehnungen nach verweigerter Ankunft 7 statt 40/53 in `.186`/`.188`). Die vier daraus abgeleiteten Fehler sind in `.192` behoben |
| **Runner** | [Drei getrennte LLM-Spieler](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/bd02cd627776b9fa2e701a7815226a45002cd262/avereth-engine/docs/NPC_PULSE_3_PERSONAS_RUNNER.md) (Warrior/Rogue/Mage) mit 5-Sekunden-Lesepause seit `4ed8bf2` |

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
| **Gameplay/QoL** | `.155–.161` | Stealth S1, Board- und Dungeonanzeigen, editierbare Eingabeentwürfe. Stealth S2 geplant |

## Unmittelbare nächste Arbeit

1. **Entwicklungsrunde auf `.195` fortsetzen; gesammelte ST-Smokes danach.** Die Analyse unten ist keine persönliche Spieltestfreigabe. Für einen später freigegebenen Spieltest bleiben die Beobachtungspunkte aus dem [GPT-Kontrollreview](patch_plans_10b/REVIEW_BUILD192_GPT_KONTROLLPRUEFUNG.md):
   - **Dungeon:** weitergehen, Kampf mit hörbaren weiteren Gegnern, erster Ebenenwechsel, später der Boss.
   - **Orte:** Gildenauftrag in der Stadt gegen einen außerstädtischen; NPC-Einladung ohne eigenen Aufbruch.
   - **NPCs:** Wiedersehen mit einer bekannten Person bei einem Ziel in Worten. Witwe Hesse bleibt ein bekannter Falsch-Negativfall (`met_evidence`, „came“).
   - **Kampf:** Konter bei SHORT und Sturmangriff aus LONG (die ganze Eingabe wird heute verworfen).
   - **Szenen:** verbleibende Elternszenen-Verluste.
2. **Balanceentscheidung vorbereiten:** [Ausrüstungs-/Kampfbalanceanalyse .195](recherche/AUSRUESTUNG_KAMPFBALANCE_ANALYSE_195_2026-11-15.md), echte Werte und 21.000 vollständige Engine-Simulationen. Drei unbeschlossene Varianten; keine Balanceänderung implementiert. NPC-Statbudget, F→E-Waffen und F-fine-Schild gezielt entscheiden.
3. **Kleine Kampf-UX (Variante A),** optional vor dem User-Test: Ein Angriff, der nur an der Reichweite scheitert, wird zur offenen Entscheidung ohne Zugbuchung ([Kampffachplan](patch_plans_10b/FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md)). Varianten B–D erst nach Designentscheidung.
4. **Natürliche Läufe nachholen:** Rogue und Mage nach wiederhergestelltem Provider-Guthaben, mit neuem Runnerordner und Seed. Kein Warrior-Lauf nur zur Vervollständigung.
5. **Separat zu entscheiden:**
   - **Rang-/Qualitätskalibrierung der Ausrüstung:** F exceptional ATK/MATK 22 übersteigt E exceptional 20; Gleichstände und NPC-Asymmetrie in der [neuen Analyse](recherche/AUSRUESTUNG_KAMPFBALANCE_ANALYSE_195_2026-11-15.md) quantitativ geprüft. Kein Beschluss über deren Varianten.
   - **Preis-/Planner-Belege P1a–P1e:** codebelegt, nicht umgesetzt ([Fable §13 + GPT §14](recherche/ARCHITEKTUR_AUDIT_10B_FABLE.md)).
   - **D3-`relevant`-Teillieferung und O1-B1-Szenennormalisierung:** analysiert, nicht umgesetzt.

**Bewusst nicht vorgesehen:** pauschale Lockerung von `scene_context`, Zusammenlegen von Planner/Narrator/Extractor, ein weiterer automatischer Vollbatch nur wegen `.192`.

## Natürliche Läufe – Kurzüberblick

| Lauf | Kernaussage | Quelle |
|---|---|---|
| `.191` · 15.11. | Bewegungsautorität bestätigt; fünf Szenenepisoden; T70-Thread; Guthabenstopps | [Review](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md) · [Gegenreview](testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md) |
| `.188` · 14.11. | 70/70/70; mehrzügige Ortsdrift, Dungeon-Passage-Schleife, Ortskatalog → Anlass für `.190` | [Review](testrun_10b/npc-20261114-161005Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-161005Z/GEGENREVIEW_OPUS.md) |
| `.186` · 14.11. | 70/70/70; Arbeitsangebot als Kauf (−14 cp), Warrior-Ortsdrift → `.187` | [Review](testrun_10b/npc-20261114-094810Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md) |
| `.183` · 13.11. | 9 E3-Anker; Rogue-Extractorstopp; Mage-Questwiderspruch → `.185` | [Review](testrun_10b/npc-20261113-135417Z/REVIEW.md) |
| `.179` / Pilot `.174` | 0 E3-Anker; P2-Ortsdrift und Plannerblocker → `.180–.182` | [`.179`](testrun_10b/npc-20261112-220625Z/REVIEW.md) · [Pilot](testrun_10b/npc-20261109-160250Z/REVIEW.md) |
| User04 · 06.11. · `.159` | letzter persönlicher Spieltest: Level 1→8, Dungeon-Clear; Wünsche zu Bossbeute, Basis 5, stärkeren Bossen | [Review](testrun_10b/user-20261106-072640/REVIEW.md) |

Alle weiteren Runs stehen im [Runindex](testrun_10b/README.md).

## Architekturgrenzen

- **Ankunft:** Nur autorisierte, bestätigte und chronologisch gültige Ankünfte bewegen Alaric (Kanon §2). Eine vorab gebuchte Ankunft (V1/A4) ist nicht umgesetzt (D4).
- **Angriff:** Autorisierung und tatsächlich ausgeführter Angriff bleiben getrennt. Anwesenheit in einem Dungeon-Slot ist kein Erstschlag.
- **Szenen:** Die `scene_context`-Firewall bleibt bestehen. Eine Elternszene gilt nicht als „hier“ (Gegenbeleg im `.191`-Korpus).
- **Vorgehen:** Tests am Originalfall statt großer Generalreviews ([Architekturprüfungen](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md)).

## Historische Detailquellen

Die vorige, ausführliche Fassung dieser Datei steht im [Git-Snapshot vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md). Sie enthält die Detailabsätze zu `.186–.189` und die damaligen Prioritäten. Ältere Stände: [Snapshot ec0969b](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) und das [Archiv bis 24.10.](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Testzahlen stehen in den Produktpatchnotes. **Diese Runde:** ausschließlich die im Analysebericht ausgewiesenen lokalen Engineberechnungen/-simulationen; keine neuen vollständigen Node-/Replay-Suiten, ST-Smokes oder natürlichen Modellläufe.
