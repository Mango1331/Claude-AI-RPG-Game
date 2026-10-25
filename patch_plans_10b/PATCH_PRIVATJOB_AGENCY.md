# Patch 10B – Privatjobs: Auftragsannahme ≠ Leistung (Fach-Patchnote)

**Status:** IMPLEMENTIERT auf dem Entwicklungsbranch, Build **.76**, [Produktcommit `96c75eb`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/96c75ebceb32adb172bb3f8cf2afecd963e2a40c). Node-Suite und echter ST-Mock-Smoke bestanden. Technische Umsetzung, Zahlen und Grenzen einmalig in der [Fach-Patchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/96c75ebceb32adb172bb3f8cf2afecd963e2a40c/avereth-engine/docs/PATCH10B_PRIVATE_JOB_AGENCY.md). Natürlicher GLM-Arbeitsquest-Fall bleibt offen; kein neuer Langlauf gestartet.

**Historische Planungsbasis:** natürlicher [Run 10](../testrun_10b/20261024-235637Z-current_test/REVIEW.md), tatsächlich Build .72; Produktstand bei Planung `2ca214fe24` (.74). Die Umsetzung setzt auf `ebcc010` (.75) auf und erhält dessen Board-/Delivery-Änderungen. Die folgenden Abschnitte bleiben als ursprünglicher Auftrag erhalten.

## 1. Fehler und reproduzierbare Ausgangslage

Run 10, **Input 48 / Record 96**: `quest.an_hour_of_pushing_the_stuck_cart_to_market` (privater Auftrag einer Bäuerin, Karren befreien und zum Markt schieben). **Input 49 / Record 97**: Spieler: *“I accept the hour of pushing the cart to market.”* Autorisiert und gebucht ist **nur `quest.accept`** – kein `go`, keine Arbeitsaktivität. **Record 98:** Narrator behauptet Schieben und Ankunft am Markt; Engine **verweigert `arrive` mit `no_go`**, bucht dennoch 45 Minuten, `quest.status active→completed` und **+3 cp**. Tatsächlicher Ort bleibt `loc.lower_wall_of_the_south_terraces`. Auftrag, Erzählung und State widersprechen einander.

**Bestätigte technische Schwachstelle:** `src/v4/world.js`, `case 'quest.close'` (um Zeile 1133): Bei privatem `completed` reicht aktuell, dass `d.by` der ursprüngliche Giver ist. Die tatsächlich **autorisierten** Spielerhandlungen und die konkret erfüllte Arbeit werden dabei nicht hinreichend geprüft. `coin.gift` wird separat verarbeitet. **Keine allgemeine Regel „Privatquests dürfen nicht vom Narrator abgeschlossen werden“:** Der NPC darf wirklich geleistete Arbeit beurteilen und bezahlen.

## 2. Verbindliche Korrektur

1. **Questannahme begrenzen:** `quest.accept` bedeutet nur `offered→active`. Allein aus der Annahme folgt weder die Handlung, Reise, abgelaufene Arbeitszeit noch ein Abschluss. Der Narrator darf nur die zur angenommenen Aufgabe passende unmittelbare Reaktion erzählen (z. B. Bäuerin stimmt zu und zeigt Karren/Route).
2. **Tatsächliche Leistung vor Abschluss:** Private `quest.close:completed` braucht eine zum vereinbarten Ziel passende, **belegte** Leistung des PC. Bei einer Reise-/Arbeitsquest sind das mindestens eine entsprechend autorisierte Handlung und ein legitimer Orts-/Arbeitserfolg; eine vom Narrator frei erfundene Tätigkeit oder allein `quest.progress`/`quest.detail` ist kein Ersatz. Vorhandene `go`, `activity`, Ergebnis-/Eventdaten und Questziele wiederverwenden. Keine allgemeine zweite Quest-/Proof-Engine einführen.
3. **Eine natürliche kombinierte Handlung bleibt möglich:** *“I help push the cart all the way to the market.”* kann als legitime **eine** Reise mit Arbeitsschritten ohne zusätzliche „I continue“-Runden ausgeführt werden, **sofern die Player-Action das wirklich autorisiert** und der GO-/Zeitpfad die Ankunft belegt. Nicht starr separate `GO` plus `activity` erzwingen, wenn das denselben fortlaufenden Willensakt unnötig aufteilt.
4. **Privatlohn nur bei realer Berechtigung:** Verhindern, dass ein als Werklohn erkennbares `coin.gift` den nicht belegten Jobabschluss umgeht. **Echte Geschenke, Almosen, Fundgeld und ungebundene NPC-Zahlungen müssen legal bleiben.** Gleiche private Leistung darf weder durch `quest.close` noch durch ein doppeltes `coin.gift` zweimal bezahlt werden; Preis/Menge bleiben so, wie der NPC sie vorher verbindlich vereinbart hat.
5. **Kein unautorisiertes Teleportieren:** `arrive:no_go` ist korrekt und bleibt geschützt. Danach keine `completed`-Buchung, die den noch unerreichten Zielort voraussetzt. Fortschritt kann innerhalb einer tatsächlich gewählten Handlung erzählt werden; er ersetzt keine eingebaute `scene.moved`-/Zeitbuchung.
6. **Andere Privatquests nicht beschädigen:** Gespräch/Information, Reparatur am aktuellen Standort, freies Helfen oder einmalige direkte Gefälligkeit dürfen weiter erfüllbar bleiben, sobald der PC sie real ausführt. Keine neue Gildenregistrierung, Pflichtunterschrift, künstliche Quittung oder starre Bürokratie für Privatjobs.

**Zuständigkeit/Scope:** `src/v4/world.js` (`quest.close`, relevante `coin.gift`-Abgrenzung), `src/v4/commands.js` (`quest.accept` und tatsächlicher `go`/`activity`-Nachweis), ggf. `src/v4/planner.js`/`src/v4/agency.js`, `src/v4/ownership.js` und sparsam Narrator-/Extractor-Kontext. Auf **Sols dann aktuellem Board-/Delivery-Code** aufsetzen; keine parallele Änderung dieser Bereiche.

## 3. Mindestregressionen

- **PJ1 – Originalfall rot→grün:** Nur `quest.accept` bei Karrenjob; Narrator behauptet eine Fahrt, `arrive:no_go`; **Quest bleibt aktiv**, Karren-/Markt-Ort unverändert, kein Werklohn.
- **PJ2 – legitime Erfüllung:** PC schiebt Karren durch **explizite** GO-/Arbeitsentscheidung tatsächlich zum Markt; gültiger Abschluss und **einmaliger** vereinbarter Lohn.
- **PJ3 – kein Doppelabschluss:** Wiederholte `quest.close`/`coin.gift`-Extraktionen, Reload, Swipe und Replay vervielfachen Status/Geld nicht.
- **PJ4 – falscher Empfänger/Ort/Leistung:** Giver stimmt voreilig zu; Ziel nicht erreicht oder Arbeit nicht erfolgt → kein Abschluss. Ausdrücklich anderes Ziel darf nicht stillschweigend übernommen werden.
- **PJ5 – unabhängiges Geschenk:** NPC gibt tatsächlich Geld unabhängig vom Privatjob; nicht pauschal wegen aktivem Auftrag sperren.
- **PJ6 – andere Privatquests:** lokale Reparatur, Gesprächsdienst, schlichte Hilfsarbeit ohne Transport und spontane NPC-Aufträge weiter legal; Gildenquest-Belohnungen/Delivery unverändert.
- **PJ7 – Entscheidung in einem Satz:** Natürliches *„Ich schiebe den Wagen zum Markt“* funktioniert ohne künstliche Trennung in mehrere Zusatzinputs, aber nur mit tatsächlicher Engine-Bewegung/Arbeitsausführung.

**Abnahme:** gezielte Rot-/Grün-Suite mit Run-10-Eventfall; `npm test`, bei Narrator-/Host-Vertragsänderung echter `npm run smoke:st:c`; kurzer natürlicher Arbeitsquest-Fall. Ergebnis/Tests/Commit **erst nach Implementierung** eintragen. **Kein Code- oder Testpass durch diese Patchnote.**
