# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 15.11.2026.** Dieses README ist der **erste Einstieg** auf `main`, keine Roadmap und keine Patchchronik. Buildgeschichte und Abnahmen stehen nur in [03](03_AKTUELLER_PROJEKTSTAND.md).

## In 60 Sekunden zum Arbeitsstand

- **Was es ist:** eine SillyTavern-Extension für ein LLM-gestütztes Fantasy-RPG (V4-C / Ruleset 2).
  - Ein **Planner** versteht die Spielereingabe.
  - Eine **deterministische JS-Engine** prüft und bucht Zahlen, Orte, Kampf, Geld, Quests und Fähigkeiten als Events.
  - Der **Narrator** erzählt.
  - Ein **Extractor** mit Firewall übernimmt nur zulässige Weltfolgen.
  - Das Eventlog ist die einzige Wahrheit.
- **Produkt:** Build **`4.3.0-c.6.6.192`** auf `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`e7dac41`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/e7dac41).
  - `.190`: Umbau von Orten, Reisen und Dungeons (Ortsbuch, Bewegungsnachweis, B5-Dungeonabschnitte).
  - `.191`: Korrekturen aus dem Gesamt-Kontrollreview.
  - `.192`: Korrekturen aus dem natürlichen Batch vom 15.11.
- **Letzte Abnahme `.192`:** 3250/3250 Node-Tests, voller Replay 2235 Fälle (0 offen), isolierter ST1.19-Smoke 225/225 und 230/230. GPT-Kontrollreview: **GO für einen persönlichen User-Test**. Noch kein natürlicher Zug auf `.192`.
- **Letzter natürlicher Lauf:** [Batch auf `.191`](testrun_10b/npc-20261115-103140Z/REVIEW_GPT.md), nur Warrior vollständig; Rogue und Mage scheiterten am Provider-Guthaben. Die Bewegungsautorität ist natürlich bestätigt.
- **Als Nächstes:**
  - persönlicher User-Test auf `.192`;
  - Bossloot V1 umsetzen (entschieden, nicht gebaut);
  - optional die kleine Kampf-UX-Variante A.
  - Details in [03](03_AKTUELLER_PROJEKTSTAND.md).
- **Dokumentation:** nur auf `main`. Beide Remote-HEADs bei jedem neuen Auftrag erneut prüfen; die Angaben hier sind ein belegter Snapshot.

## Nur diese Dateien zuerst lesen

| Datei | Eine einzige Zuständigkeit |
|---|---|
| [01 – Arbeitsweise](01_ARBEITSWEISE_CHATGPT_CLAUDE.md) | Rollen, Freigaben, Reviews, Test- und Commitregeln |
| [02 – Design-Kanon](02_DESIGN_KANON.md) | **Verbindliche** Spielregeln und ausdrücklich geplante Entscheidungen |
| [03 – Aktueller Projektstand](03_AKTUELLER_PROJEKTSTAND.md) | **Einzige laufende Quelle** für Build, Abnahme, nächste Aufgaben, Risiken |
| [07 – Roadmap](07_ROADMAP_NACH_10B_ENTWURF.md) | Etappen, Featurefamilien, Abhängigkeiten |
| [06 – Fachquellenindex](06_PATCH10B_MASTERPLAN_UND_REVIEWS.md) | Links zu Fachplänen, Architekturprüfungen und Reviews |
| [04 – Ideenspeicher](04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md) | Unpriorisierte Ideen, **keine** Freigaben |
| [Runindex](testrun_10b/README.md) | Originaldaten, Run-Reviews, Quellenlage |

**Leseprinzip:**
- Für einen neuen Chat zuerst **README + 01 + 03** lesen.
- Danach **02** für Regelfragen bzw. **07 + genau den relevanten Fachplan** aus 06 für geplante Funktionen.
- Nicht alle historischen Reviews einlesen.
- Das V3-README unter `avereth-engine/` ist **nicht** der aktuelle Produktstand.

## Entwickelt ≠ getestet ≠ freigegeben

- **Implementiert und abgenommen:** siehe 03, Tabelle „Was technisch umgesetzt ist“.
- **Entschieden, nicht umgesetzt:** Bossloot V1 ([U1–U11](patch_plans_10b/GEGENREVIEW_BOSSLOOT_GPT_ENTSCHEIDUNGEN_2026-11-15.md)), K1 Main/Minor, Stealth S2.
- **Entscheidungsvorlagen:** [Kampf: Angriff mit Annäherung](patch_plans_10b/FACHPLAN_KAMPF_BEWEGUNG_ANGRIFF_192.md), Preis-/Planner-Belege P1a–P1e, Rang-/Qualitätskalibrierung der Ausrüstung.
- **Nur natürlich prüfbar:** Spielgefühl, NPC-Qualität, PULSE-Pacing. Geskriptete Tests, Replay und Smokes beweisen das nicht.

## Kopierbarer Startauftrag für einen neuen GPT-Chat

> Du arbeitest als unabhängiger Reviewer und Planungspartner am Projekt **Avereth Engine**, Repository `Mango1331/Claude-AI-RPG-Game`.
>
> 1. **Einlesen, in dieser Reihenfolge:** auf `main` `README.md`, `01_ARBEITSWEISE_CHATGPT_CLAUDE.md` und `03_AKTUELLER_PROJEKTSTAND.md`.
> 2. **HEADs prüfen:** die aktuellen Remote-HEADs von `main` (Dokumentation) und `claude/c-planner-prototype-2026-10-02-gpt-c666` (Produkt). Weichen sie von 03 ab, sag das zuerst und prüfe den neuen Diff.
> 3. **Zum Auftrag passend lesen:** `02_DESIGN_KANON.md` für Spielregeln, `07_ROADMAP_NACH_10B_ENTWURF.md` für Etappen, über `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` genau den relevanten Fachplan und den echten Produktcode am aktuellen HEAD. Alte Zeilennummern aus Plänen nicht übernehmen.
> 4. **Evidenzklassen trennen:** implementiert, geskriptet getestet (Node/Replay/Smoke), natürlich beobachtet (LLM-Batch oder persönlicher Test), vorgeschlagen, ausdrücklich entschieden. Behaupte keine Testzahlen, die du nicht selbst ausgeführt hast; zitiere sie als Angabe des Implementierers.
> 5. **Grenzen:**
>    - Den Produktcode änderst du nur auf ausdrücklichen Auftrag. Dokumentation gehört auf `main`.
>    - Ein Fachplan oder Review ist keine Freigabe; Kanonänderungen entscheidet der Nutzer.
>    - Keine neuen allgemeinen Architektur-Reviews, keine doppelten Statuslisten, keine Mikropatch-Serien, keine natürlichen API-Läufe ohne Auftrag.
>    - Originaldaten in `testrun_10b/` nie umschreiben.
> 6. **Aktueller Kontext:**
>    - Build `.192` mit GO für einen persönlichen User-Test; Beobachtungspunkte in 03.
>    - Bossloot V1 ist entschieden (U1–U11), aber nicht umgesetzt.
>    - Der Provider-Tarif begrenzt automatisierte Batches; Rogue und Mage des `.191`-Batches stehen aus.
> 7. **Antwortform:** kompakt auf Deutsch, mit Befund → Beleg (Datei/Commit/Originalfall) → Bewertung (bestätigt/widerlegt/präzisiert/offen) → Empfehlung. Am Ende stehen geänderte Dateien, Commit und offene Nutzerentscheidungen.

## Archiv und Bestandsschutz

- **Quellen, keine aktive Dokumentation:** die langen Originalreviews in `testrun_10b/`, die geprüften Analysen in `recherche/` und die Produktpatchnotes. Sie werden nicht überschrieben, nur um Übersichten zu kürzen.
- **Ältere zentrale Fassungen** bleiben über feste Commits erreichbar: [README vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/README.md) und [03 vor der Bereinigung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md).
- **Kein neuer Test durch diese Dokumentationspflege.**
