# Run 21 – Habitatbindung und gültige Quest-Ortsreferenzen (.98)

Basis `.97` / `b51a6f1`, Build **4.3.0-c.6.6.98**, 26.10.2026. Zwei begrenzte technische Korrekturen; XP, Startwerte, Skillsystem, F-Balance, Runner und LLM-Budgets unverändert.

## Habitat-Guard

Run 21 i62/i74: Das Wolfsjagdgebiet besitzt die richtige Population (Wolf, L4–7); Artabgleich und `populationAt` funktionieren. Beim Anlegen des Baus wird das Gebiet für die Navigation mit `rooms:true` markiert. Der `.96`-Guard in `engine.js:materialise` verwendete `dungeonOf`, das auch solche gewöhnlichen Raumkomplexe erfasst, und übersprang dadurch das Habitat.

Nur dieser Ausschluss verwendet jetzt `trueDungeonOf`: Ein gewöhnlicher Bau und seine Unterorte behalten ihre Navigation, passende erstmals materialisierte Wölfe erhalten das bestehende Levelband und `population_at`. Echte Dungeons behalten ihre Rang-/Slotregeln. Bestehende Profile, explizite niedrige Level, fremde Arten und Gegner anderer Herkunft werden nicht nachträglich aufgewertet oder umgebucht. Der vorhandene Guild-Zähler zählt die markierten, tatsächlich besiegten Individuen weiterhin genau einmal; kein neuer Zählpfad.

## Katalogkorrektur für T90

Der aktive Jagdvertrag nennt seinen bereits besuchten Zielort per ID, dieser fiel jedoch aus den lokalen beziehungsweise gemeldeten PLACES heraus. Der Extractor durfte dieselbe ID deshalb trotz QUESTS-Eintrag nicht verwenden. `catalogPlaces` führt jetzt die bestehenden `hunt.at`-Orte aktiver Gildenverträge zusätzlich auf. Planner und Extractor verwenden denselben Katalog; Deduplizierung, Existenzprüfung und Raum-Sichtbarkeit bleiben im vorhandenen `add`. Keine Aufnahme aller Weltorte und keine neuen Orte aus freiem Questtext; regulär höchstens drei aktive Verträge.

Die unveränderte originale Erstantwort von Call 263 besteht damit die Prüfung und bucht die bestätigte Ankunft. Ein Runtime-Szenario mit dieser Antwort benötigt genau einen Extractor-Aufruf. Die ungültigen Place-Objekte als `fact.s` aus Call 264 bleiben verboten. Kein zusätzlicher Retry, keine Schema-/Authority-Lockerung und keine Ortsänderung allein durch den Katalog.

## Abnahme und Grenzen

- Acht neue Regressionen: auf unverändertem `.97` **sechs rot/zwei grüne Kontrollen**, danach **8/8**; angrenzend **43/43**, vollständiges **npm test: 1889/1889**.
- Original i62/i74 über `applyWorld` mit ursprünglicher Orts-/Populationshierarchie; T90-Originalantwort, gemeinsame Referenzen, einmalige Killzählung, Bewegung mit unveränderter Herkunft, Replay/Reload und Swipes. Gegenfälle für echte Dungeons, fremde Arten/Orte, explizit schwache und bereits fixierte Profile, Legacy, verborgene Räume, unbekannte Orts-IDs, ungültige Faktensubjekte und fehlendes GO.
- Fixture: Original-States vor i62/i74/i180, unveränderte Antworten und Prosa aus `20261026-114135Z-current_test.zip` (SHA-256 `a25e0a59505babd76345155fc489a142889a3d5998d3ad0062348e7887cb2a4b`). Nur Erinnerungen, Wissen und Claims aus den State-Projektionen entfernt. Runtime-/Swipe-Szenario mit fokussiertem Kampagnenaufbau und originaler T90-Erstantwort. Original-ZIP und Reviews unverändert; kein neuer Git-Binärupload.
- Echter ST1.19-Mock-Smoke **21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte aktuelle Story-Records jeweils `applied` und genau einmal `extract.applied`. Kein natürlicher `.98`-GLM-Lauf gestartet; Mock-Smoke belegt keine allgemeine semantische Zuverlässigkeit des Providers.
- Keine Save-/Eventmigration: Bereits gespeicherte schwache Gegner beziehungsweise fehlende Herkunftsmarker aus Run 21 werden nicht rückwirkend korrigiert. Für die natürliche F-Abnahme eine frische Kampagne verwenden. GO→SEARCH-Chronologie und Board-Repair-Diagnose bleiben die getrennten P2-Befunde des Gegenreviews; keine Umsetzung in diesem Patch.

Extractor 5.11, Board 5.2 und Narrator-Vertrag .85 bleiben unverändert; keine neue persönliche Kartenrevision erforderlich.
