# Batch 1 – Recovery, Ortsidentität und verbindliche Transaktionen (.101)

27.10.2026 · Basis `54b6e086734d719db35b12aab901e2f666229101` / Produkt .100. Umsetzung der abschließend freigegebenen Pakete A–C aus [Sols Gegenreview §§11–12](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/main/testrun_10b/batch-20261027-030034Z/SOL_COUNTERREVIEW.md), einschließlich der drei Schutzbedingungen des letzten ChatGPT-Feedbacks. Keine Änderungen an Balance, XP, Startwerten, Skills, Ausrüstung oder Testspielerstrategie.

## A – Begrenzte Recovery nach Fehlerart

`runtime.runExtraction` verarbeitet höchstens drei Provideraufrufe und höchstens einen Wiederholungsversuch nach vorübergehendem Transportfehler. Eine nichtleere ungültige Antwort bleibt Reparaturgrundlage, auch wenn der nächste Versuch leer ist oder einen Transportfehler liefert. Zwei tatsächlich ungültige Antworten beenden die gewöhnliche Schema-Reparatur. Abbruchsignale sowie permanente Providerfehler, insbesondere HTTP400/401, werden nicht erneut angefragt; HTTP408/429/5xx dürfen einmal wiederholt werden. Der Planner berücksichtigt dieselbe Fehlerklassifikation bei seinem bestehenden Transportretry. Budgets und 120-Sekunden-Timeout bleiben unverändert.

Nur der ausgewählte validierte Kandidat gelangt einmal zur World-Verarbeitung. Bereits vorhandene sichere Teilverarbeitung und Identity-/Stale-/Commit-Gates bleiben bestehen. Schemafehler werden nicht durch freie Textannahmen ersetzt.

`narrator_recovery.js` führt bei leerer Story höchstens einen normalen ST-`regenerate` aus. Es wartet auf das Ende der Hostgenerierung, speichert die Versuchszahl im vorhandenen User-Record und verwendet dessen Engine-Events erneut. Kein erneutes Senden des Spielerinputs. Chatwechsel, Edit, Swipe, neuer Auftrag oder Stop invalidieren den wartenden Versuch. Voraussetzung: aktivierte bestehende Recovery-Einstellung und Einzelchat; Gruppen bleiben ausgenommen. Nach erneut leerem Ergebnis bleibt manuelle Recovery nötig.

## B – Ein Bewegungsnachweis und gemeinsame Ortsbedeutung

Neue Ruleset-2/V4-C-Extraktionen bewegen den Spieler ausschließlich an expliziten `arrive`-Deltas in ihrer tatsächlichen Reihenfolge. `Expected`, `scene` und vergangene Reisezeit erzeugen keine eigene Bewegung mehr. Auch ein erreichter Straßenabschnitt wird ausdrücklich gemeldet. Ein positives Expected ohne passendes `arrive` löst gezielte Reparatur aus; bleibt der Widerspruch bestehen, wird er sichtbar zurückgewiesen. Gültige andere lokale Vorgänge dürfen erhalten bleiben.

`place_refs.js` bündelt die nebenwirkungsfreie Ortsidentität für Parserdiagnose, Szenenvergleich und bestehende Ortserzeugung: bekannte ID, äquivalenter strukturierter Ref und JSON-Feldreihenfolge haben dieselbe Bedeutung. Populationen bleiben auch über verschachtelte Teilorte ihre Habitat-Vorfahren. Eindeutige bekannte Gate-Aliasse werden innerhalb des richtigen Reichs wiederverwendet; mehrdeutige Eingänge und unterschiedliche Dungeonräume werden nicht verschmolzen. Der Vergleich erzeugt keine Ortsknoten.

GO-Autorisierung, Forced Movement, Eintrittskosten, Siegel, Fallen, Slotidentitäten und NPC-Eigeninitiative bleiben erhalten. Für Fallen am expliziten Arrival gelten die vorhandenen Conditional-Ownership-Gates. Gespeicherte alte Events werden unverändert gefaltet; Ruleset1 beziehungsweise Nicht-C behalten ihre bisherige Reportverarbeitung.

## C – Ein Verkaufsweg, aktuelle Zustimmung, mechanische Jagden

Neue Verkäufe verwenden das vorhandene konkrete `bid`: Käufer, Los, Mengen, Preis und Ort werden am Handelsereignis geprüft. Eine passende aktuelle Mindestpreis-Zusage kann das Gebot sofort akzeptieren. Ohne Zustimmung bleibt das Angebot offen. `Expected.sold` ist Zusammenfassung und kann weder einen abweichenden Preis noch eine zweite Zahlung erzeugen. `bookSale` prüft alle Positionen vor dem ersten Transfer; ungültige Mengen, abwesende Käufer oder veraltete Gebote buchen nichts. Historische Transaktionen bleiben replayfähig.

Kauf-/Verkaufszustimmungen gelten nur für diese Antwort und werden anschließend geschlossen. Sie wandern nicht pauschal mit. **GO → Zimmer bis zehn Kupfer** bleibt als eine autorisierte Handlung möglich: Zustimmung ist an das genannte Ziel gebunden, tatsächliche Ankunft und ein eindeutiges passendes Angebot sind erforderlich. Falscher Ort, fehlende Ankunft, Mehrdeutigkeit oder Preisüberschreitung führen zu keiner Zahlung. Explizite spätere Angebotsannahme bleibt möglich.

Neue automatisch generierte Jagden erhalten `count_hunt_clear`, genau ein quantitatives `DEFEAT`-Ziel und die gespeicherte Zählregel `killed`. Aufgabe und Endzustand werden daraus formuliert. Tatsächliche passende Kills erfüllen den Auftrag ohne zusätzliche Story-READY-Bedingung; Flucht oder eine erzählte Alternativlösung ersetzen die veröffentlichte Regel nicht. Der Spieler gibt weiterhin ausdrücklich an der Gilde ab. Die bestehende 4+1-/5-Verteilung, Populationseignung und Belohnungen bleiben bestehen.

Alte Boards, Mischaufträge, Delivery und Dungeon-Clearance behalten ihre bisherigen Regeln. Eine bereits autorisierte bedingte Gildenabgabe wird nach zurückgestellten READY-/Nachweisprüfungen noch einmal ausgewertet, solange der Spieler am richtigen Schalter ist. Kein automatischer Abschluss nach Verlassen des Orts und keine doppelte Auszahlung.

## Abnahme

- **47 neue Regressionen**, vollständig grün: Recovery11, Host7, World9, Handel12, Guild8.
- **Rot/Grün:** 38 gegen unveränderten .100-Code ausführbare Fälle: **28 rot / 10 grüne Kontrollen**, danach38/38. Sieben Tests des neuen Hosthelfers und zwei ergänzende Ortshelferprüfungen wurden separat grün ausgeführt; deren fehlende Module werden nicht als fachlicher Rotnachweis gezählt.
- Originaltexte aus Batch001 C92/93,003 C10/11 und005 C58/59 prüfen die gemischten Fehlermuster mit anschließend kontrolliert gültiger Reparatur. Fixture enthält ausschließlich Originalantworttexte und Call-/Runzuordnung. Dies ist eine Runtime-Recovery-Regression, kein nachträglich erfolgreich erklärter natürlicher Lauf. Transportvarianten sind gesondert simuliert.
- Vollständiges `npm test`: **1984/1984**, keine übersprungenen Tests. Enthält bestehende Delivery-, Dungeon-, Agency-, Replay-/Reload- und Legacy-Regressionssuiten.
- Echter **SillyTavern1.19** mit Chromium und Mock-Provider: normaler `npm run smoke:st:c` **21/21**, fünf Extractor-Aufrufe, keine PageErrors. Vier gespeicherte Story-Records jeweils `applied` mit genau einem `extract.applied`.
- Zusätzlicher echter Hostlauf mit `AVERETH_SMOKE_EMPTY_NARRATOR=1`: **22/22**, genau eine automatische Narratorwiederholung, weiterhin fünf Extraktionen, kein zusätzlicher Planner-/Enginezug, keine PageErrors. Bestehender manueller Swipe verwendet weiterhin den gebuchten Zug.
- Ein früher Smokeversuch war wegen fehlendem Browserpfad blockiert. Der erste Leere-Antwort-Smoke erfasste den Zustand zu früh zwischen Generierungsende und Recovery; der Smoke wartet jetzt fortlaufend auf ruhige UI und abgeschlossene Extraktion. Der natürliche Driver besitzt bereits diese Ruheprüfung und wurde nicht verändert.

Historische geskriptete Testantworten, die Reisen ausschließlich in Expected meldeten, werden im Testharness auf das neue explizite Wire-Format übertragen. Einzelne Chronologiefixtures wurden entsprechend angepasst. Originalarchive und gespeicherte Events bleiben unverändert. Negative Tests für unvollständige aktuelle Antworten umgehen diese Testdatenmigration und prüfen Parser/Runtime/World direkt.

## Versionen und Grenzen

Build `4.3.0-c.6.6.101`; Extractor5.13, Board5.4. Command1.6, Delta1.6 und Narrator-Vertrag.85 bleiben bestehen; keine neue persönliche Karte erforderlich. Produktänderungen liegen in Runtime/Host-Recovery, Extractor/Ortsauflösung, World/Commands/Trade/Guild, Katalog, Ownership und Zustandsvalidierung; Teständerungen einschließlich optionalem Smoke-Fehlerfall gehören zur Abnahme.

Noch **keine natürliche GLM- oder Sechserbatch-Abnahme**. Die Begrenzung verhindert Endlosschleifen und doppelte Buchungen, garantiert aber weder rechtzeitige Providerantworten noch semantisch richtige Extraktion. Bei erneutem Versagen bleibt der Fehler sichtbar. Der nächste natürliche Batch soll diese Grenzen messen; kein vorsorglicher weiterer Architektur- oder Balancepatch.
