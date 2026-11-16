# Avereth Engine – Projektstart und Einstieg für neue Chats

**Stand: 16.11.2026.** Dieses README ist der **erste Einstieg** auf `main`, keine Roadmap und keine Patchchronik. Buildgeschichte und Abnahmen stehen nur in [03](03_AKTUELLER_PROJEKTSTAND.md).

## In 60 Sekunden zum Arbeitsstand

- **Was es ist:** eine SillyTavern-Extension für ein LLM-gestütztes Fantasy-RPG (V4-C / Ruleset 2). Im unveränderten aktuellen Produkt interpretiert der Planner, die deterministische Engine bucht, der Narrator erzählt und der Extractor erfasst Weltfolgen. **Als neues, noch nicht integriertes Ziel** wird ein kreativer dynamischer GM mit Engine-Werkzeugen und direkt erstelltem Weltgedächtnis untersucht.
- **Produkt eingefroren:** Build **`4.3.0-c.6.6.200`** auf `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b). Bossloot, 5 freie Punkte/Level, Balance `.196–.198`, PULSE/NPC `.199–.200` sind im Produkt enthalten.
- **Technische Produktbelege:** `.200`-Patchnote: **3345/3345** Node, **2235/2235** Replay; isolierte ST1.19-Mock-Smokes nach Merge laut Abnahmebericht **231/231** Standard, **236/236** Failsoft, keine PageErrors. Keine erneute Ausführung in dieser Dokumentationsrunde. Die echten Provider-/Browserbedingungen sind damit nicht abgesichert.
- **Persönlicher Test 16.11. auf `.200`:** Nach korrekter Mage-Erstellung scheiterte die Waldreise an Extractor-Timeout/Concurrency; die sichtbare Ankunft wurde nicht gebucht. [Architekturaudit](recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md). **Keine weiteren persönlichen Spieletests bis zur Architekturklärung.**
- **Drei Zielbranches:** `main` für Dokumentation; Produktbranch `.200` als Referenz/Rückfallstand; [`experiment/dynamic-gm-model`](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/experiment/dynamic-gm-model) für den neuen GM-Prototyp. Der Modellbranch enthält den bisherigen isolierten B/C1-Prototyp von [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c), **keine** neue Produktversion.
- **Aktive Priorität:** **Gameplay-Roadmap ON HOLD.** Zuerst isolierter dynamischer GM-/Engine-Prototyp mit vier Szenarien; anschließend angepasste echte ST-Hostprobe mit Mockprovider und separat freizugebender natürlicher Qualitätsvergleich. [Grundsatzanalyse](recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md) · [Status 03](03_AKTUELLER_PROJEKTSTAND.md).
- **Dokumentation:** nur auf `main`; alle drei aktuellen HEADs bei neuen Aufträgen prüfen.

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

- **Aktiv:** der neue dynamische GM-Modellprototyp auf dem dritten Branch, **kein Gameplayfeature für `.200`**.
- **Pausiert:** sämtliche bisher geplanten fachlichen Ergänzungen aus [07](07_ROADMAP_NACH_10B_ENTWURF.md), insbesondere K1, Stealth S2, E4/E5, PULSE D, Ausrüstungs-/Kampfbalance, Planner-/Preis- und Shopausbau.
- **Bewährt, nicht neu zu bauen:** Kampf/Mathematik, XP/Stats, Inventar/Geld/Loot, persistente Personen/Fakten/Absprachen und HUD. Ihre neue Verbindung mit einem kreativen LLM ist Gegenstand des Experiments.
- **Noch zu beweisen:** vom GM vollständig verfasste Erinnerung, keine versteckte Mechanik oder Metawissen, reale ST-Host-Integration, semantische Konsistenz und natürliche Erzählqualität; positive Mocktests allein reichen nicht.

## Kopierbarer Startauftrag für einen neuen GPT-Chat

> Du arbeitest als unabhängiger Reviewer und Planungspartner am Projekt **Avereth Engine**, Repository `Mango1331/Claude-AI-RPG-Game`.
>
> 1. **Einlesen:** auf `main` `README.md`, `01_ARBEITSWEISE_CHATGPT_CLAUDE.md` und `03_AKTUELLER_PROJEKTSTAND.md`; für die Architektur `recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md` sowie bei Bedarf das ältere Audit und den B/C1-Vergleich.
> 2. **HEADs prüfen:** `main` für Dokumentation, `claude/c-planner-prototype-2026-10-02-gpt-c666` (Produkt `.200` / `0cd1480`), `experiment/dynamic-gm-model` (von `80d5fcb` abgezweigt).
> 3. **Hauptauftrag:** Die Gameplay-Roadmap ist **ON HOLD**. Nur den isolierten dynamischen GM-/Engine-Prototyp bearbeiten, wenn ausdrücklich beauftragt. Ein Engine-Werkzeug und ein gemeinsamer Weltabschluss sind **Vorschläge**, keine fertige Lösung.
> 4. **Zieltrennung:** Engine ist autoritativ für Math, Kampf, Checks, Stats, Inventar und persistentes Wissen; LLM verantwortet glaubwürdige kreative Welt/NPC-Reaktionen; Spieler entscheidet über seine freiwilligen Handlungen.
> 5. **Fachquellen:** `02_DESIGN_KANON.md` für bestehende Regeln, `07_ROADMAP_NACH_10B_ENTWURF.md` als pausierten Ideenvorrat, `06_PATCH10B_MASTERPLAN_UND_REVIEWS.md` für gezielte Quellen, echte Produktmodule am aktuellen SHA lesen. Alte Reviews nicht pauschal neu lesen.
> 6. **Abnahme:** Skript-/Mocktests von natürlichen Rollenspiel- und Providerbelegen unterscheiden; echte Memory-/Agency-Gegenfälle und LLM-Requestzählung. Keine neuen Providerläufe, keine produktiven ST-/Codeänderungen und keine PR-Merges ohne Auftrag.
> 7. **Abschluss:** knapp auf Deutsch mit Beleg, Bewertung, offenen Grenzen, geändertem Branch/Commit, Teststatus und nötiger Nutzerentscheidung.

## Archiv und Bestandsschutz

- **Quellen, keine aktive Dokumentation:** die langen Originalreviews in `testrun_10b/`, die geprüften Analysen in `recherche/` und die Produktpatchnotes. Sie werden nicht überschrieben, nur um Übersichten zu kürzen.
- **Ältere zentrale Fassungen** bleiben über feste Commits erreichbar: [README vor der Bereinigung vom 15.11.](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/README.md) und [03 vor der Bereinigung](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/af7c77eea7df3a81e0a961dc80f0ba2f81e131c9/03_AKTUELLER_PROJEKTSTAND.md).
- **Diese Aktualisierung:** reine Dokumentation/Branchvorbereitung; keine neu ausgeführten ST-/LLM-/Node-/Replayläufe.
