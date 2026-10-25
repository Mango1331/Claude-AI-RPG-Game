# Run 13 – getrennte Dungeonjagd und Räumung (.84)

## Befund und Korrektur

Basis .83 / b70bd1f. Originalquelle: Run 13 `20261025-081303Z-current_test`, unveränderte Providerantworten 17/18 (T8) und 128/129 (T47). Die beiden ersten Antworten enthalten die richtige Verteilung. `parseBoard` zählt jedoch bereits die nummerierte Dungeonjagd gegen die historische Grenze „ein Dungeonauftrag“ und verweigert die zusätzliche Räumung. Die Reparaturantworten enthalten anschließend drei Jagden und zwei Lieferungen trotz geeignetem bekannten Dungeon; diese Verteilung ist zu Recht ungültig.

Im festen Ruleset-2/C-Boardprofil begrenzt die Engine jetzt die **Räumungskategorie**, nicht sämtliche Arbeit in Dungeons. Nummerierte Jagden dürfen daneben bestehen. Dieselbe Einteilung gilt für vorhandene Aushänge, Generatorhinweise, Validierung und die unveränderte einmalige Reparatur. Geeignete bekannte Dungeons, zulässige Ebenen und vorhandene Jagdpopulation bleiben verbindlich. Ohne geeigneten Dungeon gilt weiterhin 3+2 statt 2+2+1. Historische Profile behalten die alte Dungeonbegrenzung.

Keine Änderungen an Belohnungen, XP, Räumungsfortschritt, Materialisierung, Privatquests oder Liefernachweisen. Der historische Patch-7-Test benennt jetzt zwei tatsächliche, explizit nummerierte Räumungsaufträge statt eines mehrdeutigen „Scour upper tunnels“.

## Nachweise

`patch_run13_board.test.js`: 11 Tests mit den vier Originalantworten und Originalzuständen, doppelter Räumung, Teilnachfüllung, fehlendem geeignetem Dungeon, falscher Reparaturverteilung, Rang-/Populationsschutz, Legacy sowie Veröffentlichung → Annahme → vorhandener Turn-in/Payout und Event-Replay. Der Abschluss-Szenariotest setzt eine autoritative READY-Vorbedingung; er behauptet keinen natürlichen Kampfnachweis.

Erster Rotlauf auf unverändertem Produktcode: 3/9 rot, 6/9 grün. Die zwei später ergänzten negativen Kontrollen prüfen unveränderte Schutzmechanismen. Nach Korrektur: 11/11 grün; angrenzende Board-/Delivery-Tests 42/42 und Patch 7 27/27. Vollständiges `npm test`: 1652/1652 grün.

Kein Host-/Narrator-/Extractorprotokoll geändert; Vertrag bleibt Revision .83. Der echte ST-Smoke wird mit dem anschließenden NPC-Paket erneut ausgeführt. Kein natürlicher GLM-Lauf gestartet. LLM-Generatoren können weiterhin andere ungültige Antworten liefern; diese bleiben begrenzt reparierbar und werden bei erneutem Fehler nicht veröffentlicht.
