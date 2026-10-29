# Build .119 — Geldbelege und natürliche Gildenfilialen

29.10.2026 · Basis `.118 / 1da4756` · Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`.

## Originalbefunde und Korrektur der Review

Batch14 `batch-20261029-131555Z`, Original-ZIP als Chatupload unabhängig geprüft: SHA-256 `4ca6fe95aa7213b19dbd6ce6d024addc3d6831a3eb25591a4ac1e5fe0a2f6ada`. Kein GitHub-Upload des ZIP behauptet. Die Regression enthält gespeicherte Originalevents, Plannerbefehle, Narratorprosa und Extractorantworten.

- **Mage T51–52, ST101–104, Extractor146:** Verkauf an Hemm zahlt 163cp, Geldstand269→432. Das anschließende Einstecken derselben Einnahmen erzeugt fälschlich `coin.gift +100`, 432→532. Beim anwesenden NPC kehrte `coinRefusal` vor der Prüfung früherer Engine-Gutschriften zurück. Außerdem enthielt `credits` weder Käufer noch Waren/Angebot; der Extractor sah nur frühere Geschenke als bereits bezahlt.
- **Warrior T18, ST35–36, Extractor49:** Der Extractor meldet18cp, zitiert aber nur „eight copper and the silver“. Der Rechner erkennt8cp und behandelt den nicht bezifferten Silberrest als null. Zusätzlich ergab die vollständig bezifferte Form „a single silver“ bislang fälschlich zwei Silberstücke.
- **Mage T117, ST233–234, Extractor336:** GO benennt `loc.marsh_hollow`, sein Originalzitat ausdrücklich die dortige Gildenhalle. Die Abgabe wurde sofort verweigert. Die gültige Extraktion etabliert Halle, anwesenden Clerk und Berufsdaten, lässt das optionale `guild.branch` aber aus. Die Halle bleibt deshalb funktionslos.

**Präzisierung gegenüber Sols erster Batchbewertung:** Der letzte Vertrag ist an dieser Stelle **nicht READY**. Seit Annahme zählen erst3/6 gültige Strider-Kills; ältere Kills und die erzählte Behauptung „six of six“ ersetzen diese Zählung nicht. Der unveränderte T117-Fall muss die Filiale anerkennen und den Abgabewunsch prüfen, aber140cp weiterhin verweigern. Die spätere Auszahlung T135 ist kein Beleg, dass T117 bereits hätte zahlen dürfen. Der positive Zahlungs-/Swipe-Kontrollfall setzt ausdrücklich nur die erforderliche Zahl auf die bereits belegten drei Kills; er wird nicht als natürlicher Zahlungserfolg ausgegeben.

## Umsetzung

**Geld, vorhandene Transaktionen statt neues Zahlungssystem:**

- `domain.js`: Die weiterhin auf sechs Einträge begrenzten `credits` übernehmen ID, Zeitpunkt, Gegenpartei, Warenzweck, Angebots- und Questbezug aus `transaction.completed`. Das funktioniert auch beim Fold historischer Events; neue Eventtypen oder Änderungen alter Geldbuchungen entstehen nicht.
- `catalog.js`, `extract.js`: Bereits gebuchte Verkäufe und Gildenauszahlungen erscheinen zusammen mit Geschenken beim Extractor. `repeat_of` verweist auf den vorhandenen Beleg. Ein neues, eigenständiges Geschenk bleibt auch bei gleichem Geber/Betrag zulässig.
- `world.js`: Vor dem bisherigen Freigabepfad für anwesende NPCs werden Zahlungen für bereits verkaufte Waren derselben Gegenpartei am betreffenden Ort abgeglichen. Explizite zusätzliche Geschenke/Prämien werden davon unterschieden. Die vorhandene Transaktions- und Inventarverarbeitung bleibt erhalten.
- `economy.js`, `world.js`: Geldbelege kennzeichnen nicht bezifferte Währungsanteile als unvollständig. Neue freie Geldübergaben erhalten dann **keine Teilgutschrift**; weder die unbekannte Menge noch ein gemeldeter Restbetrag werden erfunden. Ein vollständig belegtes „eight copper and a single silver piece“ zahlt18cp. Historische Privatjob-/Legacy-Auswertung bleibt erhalten.

**Gildenfilialen, bestehende Orte und Abgabemechanik:**

- `domain.js`, `catalog.js`, `agency.js`, `commands.js`: Ein GO auf eine Siedlungs-ID mit ausdrücklich genanntem Gildenziel wird über die bestehende Gildenzielauflösung auf deren Halle ausgerichtet. Das gilt auch innerhalb derselben Siedlung. Die Agency-Prüfung behält den aktuellen Abgabewunsch; Ankunft und Zahlung werden dadurch nicht gebucht.
- `world.js`: Neben dem weiterhin unterstützten expliziten `guild.branch` kann eine lokal etablierte Halle anhand ihres vorhandenen Ortsobjekts, eines kanonisch anwesenden lebenden Clerk/Registrar/Receptionist und aktueller narrativer Personalbeschreibung anerkannt werden. Die Rolle stammt aus Berufsfakten beziehungsweise der strukturierten Einführungsrolle, nicht aus beliebigen historischen Beschreibungen. Das berücksichtigt den Originalfall, in dem „clerk“ als Faktobjekt auf den NPC selbst aufgelöst wurde. Keine allgemeine Änderung des Faktenresolvers.
- Beide Anerkennungswege verwenden dieselbe Ortsaktualisierung: eine funktionale Filiale je Siedlung, identische IDs, keine Umkehr von Vorfahrenbeziehungen. Schild, Gerücht, Zukunft, abwesendes Personal und nicht autorisierte Reise reichen nicht.
- Erst nach bestätigter Ankunft, Anerkennung und den unveränderten `contractReady`-Prüfungen läuft die aktuelle bedingte Abgabe über `completeContract`. Keine Auszahlung aus Narratorbehauptungen, kein neuer Questabschluss und keine automatisch erzeugten Boards.

Extractorrevision **5.19**, Deltavokabular unverändert1.8. Keine Änderung des Narrator-Vertrags und keine Aktualisierung der persönlichen Karte erforderlich. Kampf, XP, AoE, Preise, Boardverteilung und Testspieler bleiben unverändert.

## Abnahme

- **25 neue Regressionen** in `tests/v4/patch_batch14_integrity119.test.js`: auf unveränderter `.118` **11 rot / 14 grüne Kontrollen**, danach25/25. Das sind Tests mehrerer Übergänge derselben Ursachen, keine elf unabhängigen Livefehler.
- Originale T51/T52, T18 und T117; vollständig bezifferter Verkaufsrecount unabhängig von der Betragsprüfung; eigenständiges gleich hohes Geschenk, zusätzliche Prämie, anderer Geber, expliziter Wiederholungsbeleg und historische knappe Credits.
- Filialanerkennung ohne zusätzliches Delta; Originalzählung3/6 verweigert korrekt; READY-Kontrolle zahlt einmal140cp. Schild/fehlendes Personal, abwesendes Personal, falsche/fehlende Ankunft, bloßer Stadtbesuch, gewöhnlicher Laden, zitierte/zukünftige/verneinte Personalbehauptung und Ruleset1 bleiben geschützt. `.117/.118`-Identitäts-, Vorfahren-, Board- und Auszahlungsregressionen unverändert grün.
- Runtime-Kette: Originalinput→Planner/Agency→Commands→Originalextraktion→gespeicherter Record; JSON-Reload, erneuter Extractor-Aufruf und Swipe/Rückwechsel ohne doppelte Zahlung. Event-Replay und `validateState` grün.
- **Vollständige npm-test-Dateiliste: 2323/2323**, Node-Testparallelität4. Erster Gesamtlauf2320/2321: der verlängerte Katalogtitel überschritt ein bestehendes Kontextbudget; Titel gekürzt, Budgettest unverändert. Danach vollständiger grüner Abschlusslauf.
- **Echter ST1.19-Mock-Smoke: 23/23**, sechs Extractor-Aufrufe, keine PageErrors, angezeigter Build`.119`. Erster Start fand den lokalen Playwright-Browser nicht; nach Setzen des vorhandenen Browserpfads erfolgreich, nach finaler Produktfassung erneut grün. Dieser Host-Smoke ist kein natürlicher GLM-Nachweis der neuen Filiale; diese ist über die Runtime-Integration geprüft.

## Grenzen

Keine rückwirkende Korrektur bereits gespeicherter Fehlzahlungen. Ein unvollständiger Geldbeleg bleibt ungebucht, bis ein vollständiger tatsächlicher Betrag belegt ist. Der automatische Verkaufsabgleich arbeitet mit dem bestehenden begrenzten Belegbestand und den extrahierten Waren-/Zweckangaben; er ist kein vollständiger Sprachbeweis für jede mögliche Umschreibung. Explizite Wiederholungen bleiben über `repeat_of` ausgeschlossen. Die lokale Filialanerkennung ersetzt weder NPC-Präsenz noch Reisebelege; die erste Boardabfrage/Registrierung kann weiterhin einen eigenen folgenden Spielerzug erfordern. Kein natürlicher Batch durch Sol gestartet.
