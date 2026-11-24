# Beobachtungsjournal – noch keine abschließende Fehlerbewertung

Diese Notizen dokumentieren die bisherigen automatischen Runs; **kein Patchauftrag**. Originale und unabhängige spätere Verifikation haben Vorrang vor einer Einzellauf-Diagnose.

## 1. Infrastruktur und Runner

1. **Früher Run (6 Eingaben, `a1361d73`):** Extractor erreichte in Zug 5 mehrfach das Ausgabelimit, ohne verwendbares JSON. Der Runner schickte nach der blockierten Weltfortsetzung noch eine weitere Eingabe, die ohne Antwort blieb. Danach wurden festes `wafer/us`, `reasoning_effort: low` und die Runner-Abbruchsicherung eingeführt.
2. **Zweiter Run (14 Eingaben, `099cd420`):** OpenRouter-Routing funktionierte schnell und stabil; die Spielfigur starb, nachdem der automatische Mage einen überlegenen Mehrgegnerkampf fortgesetzt hatte. Nicht automatisch ein Balancefehler; spätere Runner-Starts erhielten einen expliziten, ausschließlich lokalen Attributbonus.
3. **Dritter Run (58 Eingaben, `1d3171d7`):** Die 170 Engine-Modellaufrufe verwendeten einheitlich festes Wafer-Routing und niedriges Reasoning. Der Charakter erreichte Engine-Level 5. Der Lauf stoppte bei Zug 58 am fehlgeschlagenen Weltabgleich, ohne noch einen weiteren Spielzug abzusenden.

4. **Vierter Run (24 Eingaben, `1d3171d7`):** Die ersten 23 Eingaben führen zu 18 regulären Erzählabschlüssen, vier System-/Engineantworten und einer sicher fortgesetzten Planner-Nichtausführung. Nach dem Gespräch mit der Wächterin scheitern wiederholt Ankünfte an der ersten Galerie: fünf `arrive`-Deltas mit `passage`, 17 zusätzliche `scene_context`-Ablehnungen aus der damit verknüpften Beschreibung. Ein einzelnes Reise-/Ortsscopeproblem entsteht so mehrfach; es sind keine 22 unabhängigen Fehler. Bei T24 liefert X zunächst eine fehlerhafte `scene`-/`at`-Referenz (`{"new":"first true gallery"}` statt verschachteltem `{"new":{...}}`). Der Reparaturaufruf erhält Wafer-HTTP-429, der Remoteabschluss bleibt unbekannt. Der Runner stoppt sicher ohne zusätzlichen Spielerzug. **Kein Reasoning-Tokenlimitabbruch.** Laufzeit 6:23 min, 73 physische Engine-Aufrufe, Level 1; 7 Planner- und 5 Extractor-Repairs dokumentiert. [Quellen](SOURCE_MANIFEST.json) · [LLM-/User-Vergleich](VERGLEICH_HISTORISCHE_10B_UND_PERSOENLICHE_USERTESTS.md).

## 2. Spielfluss: zu beobachten, nicht reflexhaft korrigieren

- **Zahlungen und Absprachen:** Der automatische Testspieler erzeugte wiederholt Reibung durch die Unterscheidung zwischen gesprochener Zustimmung, tatsächlicher Buchung, Angebot und `#pay`. Persönliche Userläufe sind hier oft flüssiger, weil ein erfahrener Spieler typische Fehler erkennt und seine Eingaben angepasst formuliert. Daher **UX-/Runnerfriktion separat von mechanischem Fehlverhalten** auswerten.
- **Quest `Thin the Crystal-Field Moth Swarm` (58er-Lauf, Chatindex 115):** Nach der erzählten achten Motte meldete die echte Extraktion `status: applied` mit einem `quest.ready`-Delta, dessen `seq: 1` auf sich selbst als `depends_on: ["1"]` verweist. Die Engine verwarf genau dieses Delta mit `rule: quest_dependency` und dem Hinweis, der referenzierte Zwischenschritt sei nicht akzeptiert. Der Queststatus blieb `active`. **Ungewöhnlicher Originalbeleg, keine nachgewiesene Häufigkeit oder gesamte Fehlerklasse.** Später anhand des archivierten JSONL und eines unabhängigen Nachspiels prüfen, nicht jetzt schon einen Patch ableiten.
- **Zug 58:** Die Erzählung schilderte einen Heimweg bis zur Gilde sowie Abschluss/Belohnung; die Extractor-Reparatur meldete keine gültige vollständige Deltafolge. Der Weltabgleich stoppte mit `$.deltas: expected array, got undefined` und einer unbelegten Ankunft. Nicht als gebuchte Auszahlung zählen.
- **Ausrüstung:** Bis zum Ende des 58er-Laufs meldet der Runner **keine Verkäufe und keine Ausrüstungswechsel**, obwohl Levelprogression stattfand. Das bleibt ein noch unzureichend beobachtetes Testziel, nicht automatisch ein Engine-Gear-Bug.
- **Positive Gelegenheiten:** Level 1→5, mehrere Kämpfe, Reise-/NPC-Kontakte. Ihre reale Persistenz ist bei der späteren Gesamtauswertung an Eventlog, Save und Chat zu kontrollieren; die Anzahl allein ist kein Qualitätsurteil.

## 3. Bewertungsmaßstab für die spätere Gesamtauswertung

Nicht nach jedem Einzelfehler patchen. Seltene, fortsetzbare Narrator- oder NPC-Ungereimtheiten sind gegebenenfalls tolerierbar. **Häufigkeit, Spielauswirkung, Wiederholbarkeit und menschliche Umgehbarkeit** getrennt bewerten. Echte Save-/Währungs-/Quest-/Inventar-Integritätsverletzungen benötigen dagegen auch bei wenigen Vorkommen eine schärfere Prüfung; selten allein heißt nicht ungefährlich.

**Vereinbarter Ablauf:** weitere automatische Läufe → **ein neuer persönlicher User-Test** → gemeinsamer unabhängiger Gegenreview, Priorisierung und nur dann gezielte Implementierungen. Keine Änderungen an produktiven Enginefunktionen während dieser Beobachtungsphase.
