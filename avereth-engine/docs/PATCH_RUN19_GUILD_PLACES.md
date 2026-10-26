# Run 19 – Gildenziele und kanonische Orte (.95)

Basis `.94`, `21f3822`. Fachlich getrennt vom [Handelspaket und gemeinsamer Abnahme](PATCH_RUN19_TRADE_CONSENT.md).

T59: `go()` ersetzte jeden neuen Zieltext mit dem Wort Guild durch eine bekannte Halle, notfalls in der Vertragsstadt. Ein Gasthaus nahe der Gilde wurde dadurch zur Reise nach Asterhall. T20: World kannte „Guild branch“ nicht als Hallensynonym und legte eine parallele funktionslose Filiale an.

Die kleine gemeinsame Funktion `domain.js:guildDestination` erkennt vollständige Gilden-Zielbezeichnungen statt beliebiger Worttreffer. GO und World verwenden dieselbe Ortsbedeutung: Hall/Branch/Desk/Counter/Reception beziehen sich auf vorhandene kanonische Hallen. Ein explizit benanntes Settlement entscheidet; ohne passende Halle erfolgt kein stiller Ersatz durch eine andere Stadt. Ein eigenständiges Gasthaus oder Geschäft mit Guild als Landmarke bleibt ein normales Ortsziel. Für eine unqualifizierte Gildenreise bleibt die bisherige eindeutige aktuelle/Vertragsfilial-Auflösung bestehen.

`hallOf` und formale Abgabe-/Auszahlungsprüfungen bleiben unverändert. Echte Hallen-Innenräume funktionieren weiterhin über ihre Vorfahren. Thornbury/Marrowbridge erhalten keine erfundenen Filialen. Keine automatische Umschreibung alter Orte oder Saves, keine Änderung von Quest-XP oder Regeln.

Regressionen: Original T59 und Landmarkenvarianten; explizite Stadt ohne Filiale; Asterhall-Gildenalias; Original T20 ohne Parallelgebäude; vorhandene Innenräume; Phantom-Abgabe T75 ohne Auszahlung; Event-Replay und JSON-Reload. Gemeinsame Testergebnisse in der Handelspatchnote.

Offen bleiben historische falsche Ortsanlagen in bereits gespielten Kampagnen sowie der falsche Bürokratie-Thread aus Run 19. Es werden keine freien Erinnerungen pauschal gelöscht und keine Gildenstatus aus Prosa abgeleitet. Für die natürliche Abnahme eine neue Kampagne verwenden. Kein zusätzlicher Runnerumbau.
