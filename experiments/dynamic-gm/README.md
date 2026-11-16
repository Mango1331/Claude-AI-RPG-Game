# Dynamischer GM – aktiver Architektur-/Modellbranch

**Stand 16.11.2026.** Branch `experiment/dynamic-gm-model`. Startcommit [`80d5fcb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/80d5fcb8cf799061b7f8ab1842f1258ce9d94f1c); darin Produktbasis [`.200` / `0cd1480`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/0cd14806cd0c7fe2ab0d54b8463c486ee572714b) und der vorhandene **isolierte B/C1-Experimentcode** `experiments/architecture201/`.

**Keine fertige neue dynamische GM-Implementierung.** Dieser Branch ist bewusst der einzige neue Arbeits-/Experimentbranch; `main` enthält die zentrale Dokumentation, der lange `claude/c-planner-prototype-2026-10-02-gpt-c666` bleibt unveränderter Produkt-/Rückfallstand.

## Aktives Ziel

Ein **kreatives LLM als tatsächlicher Spielleiter**, das freie NPC- und Weltreaktionen gestaltet, wichtige Gedächtnisänderungen **mit** der Erzählung liefert und nur erforderliche mechanische Auflösungen über Engine-Werkzeuge anfordert. Der deterministische RPG-Kern bleibt autoritativ für Würfel, Kampf, Stealth-Checks, Level/Stats, Ressourcen, Inventar/Geld/Loot und dauerhaft gespeichertes Figuren-/Weltwissen. Spieler entscheidet über seine eigenen freiwilligen Handlungen.

Das alte stets dreistufige Planner–Narrator–Extractor-Protokoll ist **kein verbindliches Zukunftsdesign**. Ein Aufruf pro gewöhnlichem Spielzug ist ein **Ziel, keine Zusage**; mechanische Toolfortsetzungen oder zielgerichtete zweite Leser dürfen bedarfsabhängig notwendig sein.

## Verbindliche Quellen auf `main`

- [Aktueller Projekt- und Arbeitsstand](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/03_AKTUELLER_PROJEKTSTAND.md).
- [Neue Rollen-/Architekturentscheidung, Astra Ultra](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md).
- [Architekturaudit `.200`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/ARCHITEKTUR_AUDIT_REDESIGN_ENTSCHEIDUNG_2026-11-16.md).
- [Pausierte Roadmap](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/07_ROADMAP_NACH_10B_ENTWURF.md).

Der vorhandene [B/C1-Prototypvergleich](../architecture201/README.md) ist **technische Vergleichsbasis**, keine natürliche Modellqualitätsprüfung. Seine beiden semantisch fehlgeschlagenen C1-Gegenfälle (widersprüchliche Ankunft, ausgelassene NPC-Zusage) bleiben Pflicht-Gegenbelege. Sein Scheduler/Journal und die einmalige Buchung sind Bausteine, kein Grund, die feste B-Pipeline zu erhalten.

## Nächster isolierter Durchstich

Vier kurze Fälle, fachlich im [Astra-Ultra-Bericht §8](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/recherche/ARCHITEKTUR_NEUBEWERTUNG_LLM_SPIELLEITER_ENGINE_2026-11-16.md) beschrieben:

1. **Wat:** neue Zusage und spätere Wiederbegegnung ohne ursprünglichen Chattext; vollständiges Gedächtnis, keine erfundene PC-Zustimmung oder fremdes Metawissen.
2. **Waldreise:** unbekanntes Reiseziel, tatsächliche Ankunft/Unterbrechung/Ortsneuschöpfung; Narration und bestätigte Position stimmen überein.
3. **Gemischte Spielerhandlung:** Ablenkung plus bedingte Schlüsselentnahme; Engineauflösung vor abhängiger Fortsetzung.
4. **NPC-Eigeninitiative:** Angriff oder Gegenstandsübergabe; Engine entscheidet mechanische Folgen, kein neuer Wurf oder Doppeltransfer bei Timeout/Retry.

Zunächst nur **offline mit gekennzeichneten Antwortfixtures und simulierten Provider-/Savefehlern**. Kein natürlicher Modellaufruf. Danach isolierter echter ST1.19-Hostdurchstich mit Mockprovider, danach ein **separat freizugebender** kleiner natürlicher GM-/B-Vergleich. Keine persönliche ST-Installation, keine unverifizierte Streaming-Veröffentlichung.

## Roadmap- und Git-Grenzen

Die gesamte bisherige Gameplay-Roadmap (NPC E4/E5, PULSE D, K1, Stealth S2, Balance, Shop/Preis/Quest/QoL) ist **ON HOLD**, bis über die neue Architektur entschieden und eine natürliche Spielqualitätsprobe bewertet wurde. Keine parallelen Gameplaypatches oder Änderungen am Produktbranch.

Keine Merges in Produkt oder `main` ohne Auftrag. Dokumentation in `main`, experiment-spezifische technische README/Tests hier. Frühere alte Arbeitsbranches dürfen nach gesicherter Archivierung gelöscht werden; die [aktuelle Löschklassifikation](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/05_BRANCH_HISTORIE_UND_ARCHIVBEWERTUNG.md) schützt vier nicht integrierte Sonderstände, darunter die alten GM-Tools-Entwürfe.