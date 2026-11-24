# Beobachtungsjournal – noch keine abschließende Fehlerbewertung

Diese Notizen dokumentieren die bisherigen automatischen Runs; **kein Patchauftrag**. Originale und unabhängige spätere Verifikation haben Vorrang vor einer Einzellauf-Diagnose.

## 1. Infrastruktur und Runner

1. **Früher Run (6 Eingaben, `a1361d73`):** Extractor erreichte in Zug 5 mehrfach das Ausgabelimit, ohne verwendbares JSON. Der Runner schickte nach der blockierten Weltfortsetzung noch eine weitere Eingabe, die ohne Antwort blieb. Danach wurden festes `wafer/us`, `reasoning_effort: low` und die Runner-Abbruchsicherung eingeführt.
2. **Zweiter Run (14 Eingaben, `099cd420`):** OpenRouter-Routing funktionierte schnell und stabil; die Spielfigur starb, nachdem der automatische Mage einen überlegenen Mehrgegnerkampf fortgesetzt hatte. Nicht automatisch ein Balancefehler; spätere Runner-Starts erhielten einen expliziten, ausschließlich lokalen Attributbonus.
3. **Dritter Run (58 Eingaben, `1d3171d7`):** Die 170 Engine-Modellaufrufe verwendeten einheitlich festes Wafer-Routing und niedriges Reasoning. Der Charakter erreichte Engine-Level 5. Der Lauf stoppte bei Zug 58 am fehlgeschlagenen Weltabgleich, ohne noch einen weiteren Spielzug abzusenden.

## 2. Spielfluss: zu beobachten, nicht reflexhaft korrigieren

- **Zahlungen und Absprachen:** Der automatische Testspieler erzeugte wiederholt Reibung durch die Unterscheidung zwischen gesprochener Zustimmung, tatsächlicher Buchung, Angebot und `#pay`. Persönliche Userläufe sind hier oft flüssiger, weil ein erfahrener Spieler typische Fehler erkennt und seine Eingaben angepasst formuliert. Daher **UX-/Runnerfriktion separat von mechanischem Fehlverhalten** auswerten.
- **Quest `Thin the Crystal-Field Moth Swarm`:** Der Queststatus blieb laut Runner nach den Kämpfen `active`, obwohl die Erzählung einen erfüllten Zähler/Abschluss beschrieb. Ein gemeldeter `quest.ready`-Schritt wurde nicht gültig übernommen; dieser Befund ist **ungewöhnlich und für späteren Original-Review markiert**, aber noch keine Aussage über Häufigkeit oder eine gesamte Fehlerklasse.
- **Zug 58:** Die Erzählung schilderte einen Heimweg bis zur Gilde sowie Abschluss/Belohnung; die Extractor-Reparatur meldete keine gültige vollständige Deltafolge. Der Weltabgleich stoppte mit `$.deltas: expected array, got undefined` und einer unbelegten Ankunft. Nicht als gebuchte Auszahlung zählen.
- **Ausrüstung:** Bis zum Ende des 58er-Laufs meldet der Runner **keine Verkäufe und keine Ausrüstungswechsel**, obwohl Levelprogression stattfand. Das bleibt ein noch unzureichend beobachtetes Testziel, nicht automatisch ein Engine-Gear-Bug.
- **Positive Gelegenheiten:** Level 1→5, mehrere Kämpfe, Reise-/NPC-Kontakte. Ihre reale Persistenz ist bei der späteren Gesamtauswertung an Eventlog, Save und Chat zu kontrollieren; die Anzahl allein ist kein Qualitätsurteil.

## 3. Bewertungsmaßstab für die spätere Gesamtauswertung

Nicht nach jedem Einzelfehler patchen. Seltene, fortsetzbare Narrator- oder NPC-Ungereimtheiten sind gegebenenfalls tolerierbar. **Häufigkeit, Spielauswirkung, Wiederholbarkeit und menschliche Umgehbarkeit** getrennt bewerten. Echte Save-/Währungs-/Quest-/Inventar-Integritätsverletzungen benötigen dagegen auch bei wenigen Vorkommen eine schärfere Prüfung; selten allein heißt nicht ungefährlich.

**Vereinbarter Ablauf:** weitere automatische Läufe → **ein neuer persönlicher User-Test** → gemeinsamer unabhängiger Gegenreview, Priorisierung und nur dann gezielte Implementierungen. Keine Änderungen an produktiven Enginefunktionen während dieser Beobachtungsphase.
