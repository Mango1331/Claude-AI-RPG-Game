# Run 14 – Objektverknüpfung, Szenen und Sachgeschenke (.86)

Basis .85 / 6b9ac65. Quellen: unveränderte Run-14-ZIP (SHA256 10edf1719366ca107f9f464014d88234f16189acab6f4ccc3b6b62e41e0946c9), Originalreview und Sols Gegenreview auf main. Originalquellen bleiben unverändert.

## Befund und Umsetzung

Calls 58/59 enthalten vollständiges JSON, aber einen unbekannten `object.move.object`-String. Der Repair ergänzt ein unzulässiges `object.new.ref`. Das Schema muss beide Antworten ablehnen. Es gibt keinen belegten Budget-/Providerfehler.

**Bestehende Referenz reicht aus:** `{new:exact object.new name}` verarbeitet das Originalgeschenk. Kein neues ref-Feld, kein Aliasregister und keine erfundenen Engine-IDs. Parserdiagnostik nennt nun den konkreten erlaubten Verweis und eine tatsächlich zuvor deklarierte Objektbezeichnung. Der Prompt zeigt das Muster. Ein falscher String bleibt ungültig; es findet keine Umdeutung anhand seines Suffixes statt.

Bei zwei noch offenen Deklarationen gleichen Namens wird der Name als mehrdeutig behandelt, statt den zuletzt erzeugten Gegenstand zu wählen. Eine vollständig gebuchte Übergabe beendet ihre lokale Deklaration; spätere eigenständige gleichnamige Geschenke funktionieren weiter. Teilmengen behalten die ursprüngliche Deklaration. Bekannte Objekt-IDs bleiben eindeutig. Ein wiederholtes `object.move` zum PC erzeugt keine zweite Buchung.

**Zeitliche Zuordnung:** Das vorhandene scene-Feld pro Delta bleibt maßgeblich. Bei einer aktuellen Ruleset-2-Extraktion mit späterer expliziter Ankunft an einem anderen Ort verlangt der Parser für frühere lokale Vorgänge eine ausdrückliche Szene. Remote-Erwähnungen, Zeit und reine Ortsberichte sind ausgenommen. Der Parser erteilt damit keine Reiseerlaubnis: `applyWorld` prüft weiterhin die tatsächlich erreichte Szene und autorisierte Ankunft. Ältere direkte Parseraufrufe ohne startScene behalten ihre historische Lesesemantik. Der Request erläutert die Folge enter → Geschenk am Ausgangsort → autorisierte Ankunft; Präsenz gilt am Ereignisschritt.

**Physische Sachgeschenke:** Im C-Pfad/Ruleset 2 braucht NPC→PC eine gegenwärtige, nicht durch eine verworfene Einführung gesperrte Geberfigur. Entfernte Menschen dürfen existieren und Besitz halten. Die .85-Sperre umfasst jetzt auch object.new.holder; object.move prüft seinen tatsächlichen Objekthalter. Eigenständiges enter benötigt weiterhin keinen PC-GO. Kauf-Deduplizierung läuft vorher und bleibt erhalten; Geldgeschenke verwenden ihre unveränderte vorhandene Prüfung. Keine neue Quest-, Auszahlungs- oder Reisemechanik.

Extractor extract-5.7; JSON-Vokabular unverändert delta-1.5. Kein neues Wire-Feld. Narrator-Vertrag bleibt .85. Keine Änderung von Budgets, Requestanzahl, Runner-Leitfaden, Kampfwerten, XP oder Delivery.

## Regressionen

16 neue Tests in `patch_run14_world.test.js`, gegen unverändertes .85 zuerst acht rot/acht grüne Kontrollen, anschließend 16/16 grün. Enthalten: beide Originalantworten und die konkrete Repair-Nachricht; korrektes bisheriges Objektformat; unbekannte/vorzeitige/doppelte Namen; anwesende/abwesende Geber; verworfene NPC-Einführung; autonomes enter; falsche Szene/kein GO; vollständige Originalsequenz mit technischen Korrekturen bis genau einmal 40 Kupfer; Inventar, sieben bereits vorhandene Loot-Einheiten, JSON-Reload/Event-Replay und alternative Antwort; historische Parser-/Ruleset-1-Kontrolle. Die aus dem Original projizierte Fixture hält Chattexte/Events und beide Providerantworten, keine Requests/Geheimnisse. Ein bestehender Kauf-Test prüft zusätzlich drei nacheinander übergebene gleichnamige Steine.

Der erfolgreiche 40-Kupfer-Fall ist weiterhin ein deterministischer Szenariotest, kein natürlicher Providernachweis. Die strikten Originalantworten werden nicht nachträglich automatisch gültig gemacht. Ein Mock-Repair liefert die korrekt referenzierte und annotierte Antwort; echte Modellzuverlässigkeit muss der nächste natürliche Lauf zeigen.

## Abnahme

Abschluss: 16/16 neue Tests; angrenzend 100/100 (World/NPC/Free-Help/Recovery), zusätzlich 21/21 inklusive bestehender Kauf-/Geschenkfälle. Vollständiges `npm test`: **1681/1681**. Echter ST-1.19-Mock-Smoke: **21/21**, fünf Extractor-Aufrufe, keine PageErrors; vier gespeicherte Antworten jeweils applied/genau ein extract.applied. Kritischer Diff und diff --check geprüft. Keine pauschale Teilübernahme ungültiger Extraktionen. Ein erneuter Modellfehler kann weiterhin sicher abbrechen. Semantisch falsch explizit annotierte Aussagen bleiben eine LLM-Grenze; Reisen, Besitz und Auszahlung bleiben geschützt.
