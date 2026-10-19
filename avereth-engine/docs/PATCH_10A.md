# Patch 10A – HUD/QoL (vorgezogen, display-only)

**Stand:** 20.10.2026 · **Build:** `4.3.0-c.6.6.13-10a.3` · Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`

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


## Patch 10A.2 – Spielerfreundliche Engine-Nachrichten

**Warum:** Der V4-Systemblock war bislang zugleich Spielanzeige und Debugprotokoll. Bei gewöhnlichen Extraktor-Korrekturen stand über jeder Erzählung beispielsweise „ENGINE REFUSED … see #audit“, obwohl die Engine den überflüssigen/nichtkanonischen Fakt bereits korrekt abgelehnt hatte. Ein solches Ereignis verlangt keine neue Handlung vom Spieler.

**Umsetzung:**
- Der **Standard-V4-Systemblock** zeigt nur die wichtigen Gameplay-Ergebnisse und echte Handlungsprobleme: Kampf, Checks, Belohnungen, tatsächlich verweigerte oder unklare Spieleraktionen und schwerwiegende Speicher-/Extractor-Ausfälle („WORLD NOT RECORDED“, ggf. Swipe/Regenerate).
- Routinezeilen wie \`UNDERSTOOD\` für normale Kommandos, \`NOT A DECISION\`, \`NOT APPLIED\`, \`ENGINE REFUSED\`, \`NON-CANON FACT\` sowie redundante \`TIME\`-Buchungen werden **nur aus der sichtbaren Systemkarte** entfernt.
- Target-CLARIFY/Target-needed-Systemfragen bleiben **unverändert sichtbar**. Gleiches gilt für nicht ausführbare eigene Aktionen.
- Der **ungefilterte Paneltext** bleibt im Nachrichtenrecord (\`extra.avereth.panel\`), die eigentlichen \`delta.rejected\`-Events bleiben erhalten. Der Filter wird nur auf der V4-Darstellung angewandt. V3 und \`#\`-Systemkommandos bleiben unverändert.
- \`#audit\` benennt explizit aufgezeichnete Ablehnungsregeln samt Begründung. Die zuvor irreführende pauschale \`see #audit\`-Aufforderung entfällt aus der normalen Spielanzeige.
- Beim erneuten Rendern nach einem Swipe/Edit wird dieselbe ruhige V4-Anzeige verwendet.

**Regressionen:** \`tests/unit/display_10a.test.js\` prüft das Herausfiltern interner Meldungen, das Sichtbarbleiben echter Fehler, separate Zielklärungsfragen, die V3-Anzeige und die Ausgabe von \`#audit\`.

Die Mechanik, die Regeln, der Narrator-/Extractor-Prompt und die LLM-Aufrufzahl bleiben unverändert. Neue Tests und vollständige Smokes konnten über die GitHub-Dateischnittstelle nicht lokal ausgeführt werden; vor Patch 6 bzw. beim nächsten Live-Test nachholen.


## Patch 10A.3 – Kleine HUD-/Audit-Nacharbeiten vor Patch 6

**Ausgangslage:** In der Rückschau auf die bisherigen Live-Test-Wünsche fiel auf: (1) Das Welt-HUD begrenzt lange Questlisten, aber der Charakter-HUD enthielt noch alle Quests und sämtliche getragenen Items. (2) Ein `#audit` konnte leer aussehen, obwohl ein Extraktor fehlgeschlagen war oder der Narrator eigenmächtig eine Spielerhandlung beschrieben hatte. (3) „ACTION NEEDS CLARIFICATION“ war nicht wie andere echte Handlungsprobleme hervorgehoben.

**Änderungen:**
- Charakter-HUD: maximal acht Inventareinträge (Rest `#bag`) und drei angebotene/aktive Quests (Rest `#quests`). Die vollständigen kanonischen Informationen bleiben unverändert; nur die UI-Vorschau wird begrenzt.
- `extract.failed` und `overreach.noted` ergänzen jetzt ausschließlich `state.last` um **temporäre Audit-Diagnosen** (`extract_error` / `overreach`), die bei `turn.begun` wie alle anderen letzten-Turn-Meldungen zurückgesetzt werden. Keine Änderung an Spielerressourcen, Persistenzregeln, Ablehnungen oder Narrator-Verhalten.
- `#audit` kann dadurch „World report FAILED“ sowie „Narrator overreach […]“ mit konkretem Grund anzeigen, statt diese technischen Probleme nur im Eventexport sichtbar zu machen.
- Eine echte `ACTION NEEDS CLARIFICATION` wird als System-Warnung formatiert. Die normale ruhige V4-Standardanzeige aus 10A.2 bleibt erhalten.

**Tests:** `tests/unit/qol_10a3.test.js`: kurze Listen, konkrete Audit-Einträge und Reset zum nächsten Turn, sichtbare/markierte Handlungsrückfrage.

**Bewusst nicht vorgezogen:** die Balance der Novice-Aufträge (z. B. mehr Monster-Culling und Escort-Einsätze) sowie der `creature.new more:true`-Einzeltierfall. Letzterer ist bereits als Punkt 17 im Patch-6-Auftrag enthalten. Patch 6 soll hierauf und auf den neuesten Branch-HEAD aufbauen.

**Teststatus:** GitHub-Dateien und Syntax geprüft; ein vollständiger Node-Testlauf und die SillyTavern-Smokes können aus dieser GitHub-Verbindung nicht direkt gestartet werden. Vor Patch 6 nachholen.
