# Avereth Engine – aktueller Produkt- und Arbeitsstand

**Letzte verifizierte Abfrage: 16.11.2026.** **Dies ist die einzige laufende Statusquelle**, keine Patchchronik. [Startseite](README.md) · [Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) · [Kanon](02_DESIGN_KANON.md) · [Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) · [Fachindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md).

## Produkt und letzte technische Abnahme

| | Bestätigter Stand |
|---|---|
| **Produkt** | **`4.3.0-c.6.6.200`**, eingefrorener Produktstand. `.193/.194` Bossloot V1, `.195` Basis 5 + einmalig zwei Favored +1, je weiterem Level 5 frei; `.196–.198` Gear-/NPC-/Schildbalance, `.199` PULSE × NPC-Begegnungsbuchung, `.200` vollständige E3-Kompaktkarten. [Balance .198](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/BALANCE_198.md) · [Encounter .199](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/ENCOUNTER199.md) · [NPC .200](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/0cd14806cd0c7fe2ab0d54b8463c486ee572714b/avereth-engine/docs/NPC200.md) |
| **Produktbranch** | `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b), Merge von PR #19. **Keine neuen Gameplaypatches während des Architekturprototyps.** |
| **Experimenteller Modellbranch** | [`experiment/dynamic-gm-model`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model), angelegt von [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c). Beinhaltet unverändertes Produkt `.200` und den bestehenden isolierten B/C1-Prototyp `experiments/architecture201`. **Kein neues Produktbuild und noch keine dynamische GM-Implementierung.** |
| **Dokumentation** | `main`. [Dynamische-GM-Neubewertung](recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md), [älteres Architekturaudit](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md), [B/C1-Prototypbericht auf Modellbranch](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/experiment/dynamic-gm-model/recherche/ARCHITEKTUR_PROTOTYP_B_C1_VERGLEICH_2026-11-16.md) |
| **Heutige Produktarchitektur** | V4-C / Ruleset 2: Planner → deterministische Engine → Narrator → Extractor/Firewall. Eventlog autoritativ. **Geplante Zielrichtung** separat: dynamischer kreativer GM mit Engine-Werkzeugen und gemeinsam verfasstem Weltgedächtnis; noch nicht produktiv. |
| **Letzte technische Produktbelege** | `.200`-Patchnote: **3345/3345** Node und **2235/2235** Replay, 0 neue/offene/veraltete Fingerprints. Isolierter ST1.19-Mock-Smoke nach `.200`-Merge laut Abnahmebericht: Standard **231/231**, Failsoft **236/236**, 0 PageErrors. Diese Zahlen wurden **in dieser Dokumentationsrunde nicht neu ausgeführt**. |
| **Persönlicher Realtest** | **16.11.2026 auf `.200`**: Erstellung korrekt (Mage INT 6/WIL 6), erste Waldreise narrativ sichtbar, Extractor nach ca. 121 s fehlgeschlagen, anschließend drei `concurrency_limit_exceeded`-Ablehnungen. Der Waldort wurde **nicht** gebucht. Gesichert ist ein Provider-Concurrencyproblem, **nicht** ein Creditverbrauch. Siehe [Architekturaudit §4](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md). Persönliche Spieltests vorerst pausiert. |
| **Letzter gesonderter NPC-/PULSE-Naturlauf** | [Batch auf `.191`](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md): Warrior 70/70, Rogue 22/70, Mage 0/70. Kein vollständiger Dreiernachweis. |
| **Modellarchitektur-Experimente** | Isolierter B/C1-Durchstich [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c): **61/61** Prototyptests und **47/47** ausgewählte Engine-Tests laut Experimentbericht; C1-Semantik **nicht bestanden**. Dynamischer GM nun **nächster Prototyp**, nicht Produktfreigabe. |

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

**ENTWICKLUNGSSTOPP FÜR DIE BESTEHENDE GAMEPLAY-ROADMAP (ON HOLD, Beschluss 16.11.2026).** Das derzeitige Produkt `.200` wird als Referenz und Rückfallstand erhalten. **Kein automatischer Fortgang** von NPC E4/E5, PULSE D, Kampferweiterungen K1, Stealth S2, Balance, Preis-/Shop-Patches, Quests oder weiteren Featurefamilien. Frühere Analysen/Entscheidungen bleiben als Quellen gültig; die Reihenfolge wird erst nach der Architekturentscheidung neu bewertet ([07](07_ROADMAP_NACH_10B_ENTWURF.md)).

**Aktive Arbeit ausschließlich auf dem dritten Branch `experiment/dynamic-gm-model`:**

1. **Kleiner isolierter dynamischer GM-/Engine-Prototyp:** eine kreative LLM-Spielleiterrolle mit bedarfsabhängigen Engine-Werkzeugen und gemeinsamem narrativen/gedächtnisbezogenen Abschluss; Pflichtfälle: Wat-Zusage/Wiedersehen, unbekannte Waldreise, zusammengesetzte Spielerhandlung, NPC-Eigeninitiative mit mechanischer Folge.
2. **Sicherheit aus dem B/C1-Experiment übernehmen:** gewichtete Requeststeuerung, dauerhaftes Turnjournal, idempotente Wirkung, Wiederaufnahme und Speichern vor Veröffentlichung. Keine Übernahme der festen B-Pipeline als Langfristarchitektur.
3. **Danach** isolierter echter ST-1.19-Hostdurchstich mit Mockprovider für denselben GM-Vertrag; anschließend **separat freizugebender** kleiner natürlicher Roleplay-Vergleich. Keine Provideraufrufe ohne Auftrag.
4. **Nur nach bestandener Architektur- und Gameplay-Abnahme:** Zielarchitektur/Implementierungsfachplan und bewusstes Wiederaufnehmen/Repriorisieren der pausierten Roadmap.

**Offen und nicht stillschweigend lösen:** wichtige Erinnerungen trotz gemeinsamer Ausgabe ausgelassen; Metawissen; falsch erkannte freiwillige Spielerhandlung; Narration/Weltzustand widersprüchlich; 32k Provider-Kontext, vier gewichtete Concurrency-Einheiten; echte ST-Swipes und Windows-Persistenz. Die Vorversuche belegen technische Machbarkeit einzelner Komponenten, **keine** natürliche Qualitätsüberlegenheit oder Produktabnahme.

## Natürliche Läufe – Kurzüberblick

| Lauf | Kernaussage | Quelle |
|---|---|---|
| **Persönlicher Lauf 16.11. · `.200`** | Mage-Erstellung korrekt; erzählte Waldankunft bleibt nach Extractor-Timeout ungebucht; Concurrency 429. Architektur-Warnsignal, keine abgeschlossene Spielevaluation | [Audit §4](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md) |
| `.191` · 15.11. | Bewegungsautorität bestätigt; fünf Szenenepisoden; T70-Thread; Guthabenstopps | [Review](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md) · [Gegenreview](testrun_10b/npc-20261115-103140Z/GEGENREVIEW_OPUS.md) |
| `.188` · 14.11. | 70/70/70; mehrzügige Ortsdrift, Dungeon-Passage-Schleife, Ortskatalog → Anlass für `.190` | [Review](testrun_10b/npc-20261114-161005Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-161005Z/GEGENREVIEW_OPUS.md) |
| `.186` · 14.11. | 70/70/70; Arbeitsangebot als Kauf (−14 cp), Warrior-Ortsdrift → `.187` | [Review](testrun_10b/npc-20261114-094810Z/REVIEW.md) · [Gegenreview](testrun_10b/npc-20261114-094810Z/GEGENREVIEW_OPUS.md) |
| `.183` · 13.11. | 9 E3-Anker; Rogue-Extractorstopp; Mage-Questwiderspruch → `.185` | [Review](testrun_10b/npc-20261113-135417Z/REVIEW.md) |
| `.179` / Pilot `.174` | 0 E3-Anker; P2-Ortsdrift und Plannerblocker → `.180–.182` | [`.179`](testrun_10b/npc-20261112-220625Z/REVIEW.md) · [Pilot](testrun_10b/npc-20261109-160250Z/REVIEW.md) |
| User04 · 06.11. · `.159` | vorheriger längerer persönlicher Spieltest: Level 1→8, Dungeon-Clear; Wünsche zu Bossbeute, Basis 5, stärkeren Bossen | [Review](testrun_10b/user-20261106-072640/REVIEW.md) |

Alle weiteren Runs stehen im [Runindex](testrun_10b/README.md).

## Architekturgrenzen

- **Aktuell vs. Ziel:** Die heutige P–N–X-Pipeline bleibt auf dem eingefrorenen Produktbranch; die kreative-GM-Zielarchitektur ist ein isoliertes Experiment, keine automatische Lockerung bestehender Fachguards.
- **Roadmap-Pause:** Einzelne dokumentierte Fehlersymptome sind keine Freigabe für neue Gameplaypatches; nur prototypnotwendige, isolierte Untersuchungen.
- **Ankunft:** Nur autorisierte, bestätigte und chronologisch gültige Ankünfte bewegen Alaric (Kanon §2). Eine vorab gebuchte Ankunft (V1/A4) ist nicht umgesetzt (D4).
- **Angriff:** Autorisierung und tatsächlich ausgeführter Angriff bleiben getrennt. Anwesenheit in einem Dungeon-Slot ist kein Erstschlag.
- **Szenen:** Die `scene_context`-Firewall bleibt bestehen. Eine Elternszene gilt nicht als „hier“ (Gegenbeleg im `.191`-Korpus).
- **Vorgehen:** Tests am Originalfall statt großer Generalreviews ([Architekturprüfungen](recherche/ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md)).

## Historische Detailquellen

Die vorige, ausführliche Fassung dieser Datei steht im [Git-Snapshot vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md). Sie enthält die Detailabsätze zu `.186–.189` und die damaligen Prioritäten. Ältere Stände: [Snapshot ec0969b](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ec0969b816249211bc71b3c53b10eb1faf11716a/03_AKTUELLER_PROJEKTSTAND.md) und das [Archiv bis 24.10.](03_PROJEKTSTAND_ARCHIV_BIS_20261024.md). Testzahlen stehen in den Produktpatchnotes. **Dokumentationspflege am 16.11.2026:** Keine neue Testausführung und keine produktive Codeänderung; verifizierte Produkt- und Branch-HEADs und die verlinkten bestehenden Nachweise.
