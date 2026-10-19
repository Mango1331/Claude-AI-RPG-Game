# Patch 10A – HUD/QoL (vorgezogen, display-only)

**Stand:** 20.10.2026 · **Build:** `4.3.0-c.6.6.13-10a.1` · Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`

## Warum jetzt?

Der große Patch 6 (Exploration & Hazards) steht noch aus. Da die Implementierung in Claude Code wegen des verfügbaren Tokenkontingents pausiert, wurde ein **kleiner, risikoarmer Teil des ursprünglich für Patch 10 geplanten HUD-/QoL-Polishs** separat vorgezogen. Er läuft bewusst auf **demselben Entwicklungsbranch**, damit der nächste Mechanik-Patch auf dem neuesten Stand aufbauen kann.

Patch 10A ändert **nur Darstellung**, keine autoritativen Spielregeln, LLM-Prompts, Extraktoren, Würfel, Event-State-Strukturen oder Charakterentwicklung. Der vollständige Patch 10 (Balancing, Performance, Integration und weitere UI-Arbeit) bleibt später auf der Roadmap.

## Was geändert wurde

- **Welt-HUD:** identische Namen für Ort/Reich/aktuellen Spot nicht doppelt anzeigen (beispielsweise statt „Duskreach, Duskreach — Cave“ nur „Duskreach — Cave“). Derselbe Helfer versorgt die eingeklappte und die ausführliche Ortsanzeige.
- **Lange Listen:** im Welt-HUD höchstens drei aktive Quests und drei Ziele zeigen; zusätzliche Einträge über `#quests` bzw. `#journal` erreichbar. Bestehende Anzeige von Deadlines bleibt vollständig.
- **Ortswissen:** der Welt-HUD berücksichtigt öffentliche harte Fakten auch zum tatsächlich besuchten Unterort (`scene.at`), nicht nur zum übergeordneten `scene.location`.
- **Kampf-HUD:** bereits im Encounter beteiligte nichtfeindliche Figuren erscheinen unter „Other combatants · not hostile“ mit ihren existierenden HP-/Range-/Cover-Werten, getrennt von Feinden und bloßen Zuschauern. Das ist rein read-only: keine automatische Freundschaft, Feindseligkeit oder Kampfteilnahme.
- **Schmale Displays:** unter 480 px wird die Kampftabelle als dreispaltige Zeile mit eigenem Namen und klaren „HP“, „Range“, „Cover“-Labels dargestellt. Die im Live-Test positiv bewerteten Engine/System-Nachrichten und ihre CSS-Regeln wurden nicht umgestaltet.

## Tests und Grenzen

Die zusätzlichen Regressionstests liegen unter `tests/unit/hud_10a.test.js` (Ortsnamen, Kurzlisten, weitere Kampfteilnehmer, CSS-Regeln). Die bestehenden HUD-Tests bleiben unverändert.

**Testhinweis:** Diese Änderung wurde über die GitHub-Verbindung direkt im Repository erstellt; ein vollständiger lokaler Node-Testlauf beziehungsweise ein echter SillyTavern-Browser-Smoke konnte in dieser Umgebung nicht durchgeführt werden. Diesen Nachweis vor dem nächsten Live-Test bzw. bei Patch 6 nachholen.

**Weiterarbeit:** Patch 6 soll auf dem dann aktuellen Branch-HEAD aufbauen, die Anzeigeänderungen erhalten und sich auf Exploration/Hazards beschränken. Patch 10A ersetzt nicht den späteren vollständigen Patch 10.
