# Run 19 – Handelszustimmung und sichere Klärung (.95)

Basis: `.94`, `21f3822`; Original und aktualisierter Gegenreview auf `main` unter `testrun_10b/20261026-044406Z-current_test/`. Umsetzung 26.10.2026, gemeinsam mit dem [Guild-Ortspaket](PATCH_RUN19_GUILD_PLACES.md). Keine Runner- oder Balanceänderung.

## Ursache und Umsetzung

T82: Zwei verständliche Einzelpreise wurden als unauflösbarer Gesamtbetrag behandelt. `trade.js:acceptanceWhy` kann jetzt getrennte Preis-Klauseln eindeutig ausgewählten Angebotspositionen zuordnen. Jede Position muss genau einmal mit ihrem tatsächlichen Mengenpreis belegt sein. Unklare Zuordnung fällt auf die bestehende konservative Prüfung zurück; falsche Einzelpreise, Rabatte, Parteien und Mengen bleiben geschützt. Keine blinde Addition aller Beträge.

T89: Planner und Repair wählten Bett und Frühstück zur sofortigen Zahlung, obwohl nur das Bett jetzt bezahlt wurde. Die Planner-Anweisung trennt aktuelle Zahlung von späterer Bestellung und fordert die passende Zahlungsquote. Ein korrektes Bett-Only-Kommando bucht unverändert 2 cp; Frühstück bleibt unbezahlt. Schlaf folgt nur nach erfolgreichem Kauf über vorhandene Abhängigkeiten.

Bleibt nach dem bestehenden Repair ausschließlich ein Handelszustimmungs-Konflikt in einem ansonsten schema-validen Plan außerhalb des Kampfes, liefert `planMessage` eine normale System-Klärung statt eines Hard-Abbruchs. `parsePlan` kennzeichnet diese Fehler strukturiert; kein Matching von Fehlermeldungstexten. Beide verworfenen Pläne bleiben diagnostisch erhalten. Kein Kauf, Geld, Schlaf, Reise, Weltzug oder Narrator-Aufruf wird ausgeführt. Ein neuer Spielerinput kann präzisieren. Ungültiges JSON, zusätzliche Schemafehler und fehlgeschlagene Provider-/Repair-Aufrufe bleiben echte Abbrüche. Kein automatisches Neusenden oder Editieren von Spielertexten, keine zusätzlichen Modellaufrufe.

## Abnahme beider Pakete

15 neue Regressionen auf unverändertem `.94`: fünf rot, zehn grüne Gegenfälle. Auf `.95` alle grün; angrenzend 167/167. Originale T20, T59, T75, T82 und beide T89-Pläne stammen aus dem archivierten Export. Geprüft sind richtige/falsche Einzelpreise, Gesamtpreis, Mischwährung, Mengen, Empfänger, sichere Klärung, defekte Repairs, Kauf→Schlaf, Regenerate, Reload und Neuberechnung nach Input-Edit.

Echter SillyTavern-1.19-Mock-Smoke: 21/21, fünf Extractor-Aufrufe, keine PageErrors. Vier aktuelle Story-Replies auf Platte jeweils `applied` und genau ein `extract.applied`. Das prüft Host und Speicherung, nicht die Semantik eines natürlichen GLM-Laufs. Narrator-Karte bleibt Revision .85.

Finale Vollsuite unverändert wiederholt: **1.846/1.846 grün**, keine übersprungenen Tests. Ein Zwischenlauf mit 1.845/1.845 war grün. Der folgende Lauf mit allen 15 neuen Fällen hatte einen intermittierenden Fehler im unveränderten Runner-Reload-Mock (`API connection failed (connected)`); isoliert anschließend 5/5. Kein Produkt-/Testfix für diesen Nebenbefund.

## Grenzen

Zeitliche Sprachinterpretation bleibt Aufgabe des Planners. Die falschen Originalpläne führen sicher zur Rückfrage; eine automatische deterministische Auswahl der Bettposition wird bewusst nicht vorgetäuscht. Natürliche GLM-Abnahme steht aus. Das fehlerhafte alternative T88-Frühstücksangebot (l3) ist nicht repariert; es ist für T89 nicht ursächlich und gehört zur späteren strukturierten Angebotserzeugung. Keine Event-/Save-Migration, neue Währung oder veränderten Recovery-Budgets.
