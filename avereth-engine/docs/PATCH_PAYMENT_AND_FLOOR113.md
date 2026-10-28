# Build .113 — Kaufzahlungen und sichtbarer Ebenenwechsel

Basis `.112` / `d9c259f`, Nutzerfreigabe nach Originalreview von Batch `20261028-111133Z`. Keine Änderungen an Dungeonwegen, Gegnern, Kampf, XP, Skills oder Testspieler.

## Kaufzahlung

Der Mage zahlte in T143 acht Kupfer ausdrücklich für das angebotene Zimmer. Ein gültiges Zimmerangebot fehlte jedoch im Zustand; der Extractor hatte in T142 nur das Porridge-Angebot erfasst. `pay` fand kein passendes Angebot und buchte deshalb einen gewöhnlichen Geldtransfer. Schlaf wurde mangels Zimmerbuchung korrekt verweigert. T145 kostete die erste tatsächliche Buchung weitere acht Kupfer. Die Originalaktion erzeugte auf `.110` dasselbe Ergebnis; keine neue .112-Regression.

`commands.js` unterscheidet vor diesem Rückfall erkennbare Kaufzahlungen von unabhängigen Transfers. Grundlage sind vorhandene Angebote und Kaufentscheidungen, ausdrücklich angebotene/gekaufte Waren sowie das bereits vorhandene Zimmer-/Bettvokabular. Erkannte Käufe verwenden den bestehenden `buy`-Handler mit dem genannten Betrag als Preislimit und dem genannten Verkäufer:

- Ein passendes verfügbares Angebot bucht seine ausgewählten Positionen und die Gegenleistung atomar über `offer.accept`/`bookPurchase`.
- Fehlt das Angebot, bleibt die Zahlung im bestehenden Kauf-/Preisentscheidungsweg; zunächst kein Geldabzug. Ein neues tatsächlich passendes Angebot kann den bestehenden bedingten Kauf erfüllen.
- Andere Verkäufer, Orte und zu hohe Preise werden weiterhin geprüft. Ein Zimmer aus einem mehrzeiligen Angebot kauft nicht zusätzlich dessen Essen.
- Ein Kauf ohne identifizierten Zahlungszweck fragt nach, statt das Geld frei zu übertragen.
- Explizite unabhängige Geschenke, Trinkgelder und Schuldentilgungen bleiben normale Zahlungen. Keine rückwirkende Gutschrift alter Transfers und keine neue Teilzahlungs-/Reservierungsverwaltung.

Das bestehende Ablösen einer überholten Kaufentscheidung ist in einer kleinen gemeinsamen Funktion zusammengefasst; der bisherige `buy`-Pfad inklusive Verkäuferauflösung bleibt erhalten. Replay benötigt keine neuen Eventtypen oder Save-Migration.

## Dungeonanzeige

`display.js` leitet nach einem tatsächlich gebuchten `scene.moved` aus dem kanonischen Dungeon, der Ebene und deren Rangfenster eine Anzeige ab, etwa:

`ENTERED — Mossback Warrens, Level 2 · Rank E`

Sie erscheint beim ersten Eintritt auf eine Ebene und bei Ebenen-/Dungeonwechseln. Keine Wiederholung bei einem Raumwechsel derselben Ebene, kein Hinweis aus Prosa, einem pending-Zug oder einer abgewiesenen Ankunft. Das vorhandene Gate-Panel bleibt bestehen. Die Anzeige erzeugt weder Bewegung noch Bestätigungsdialoge, Events oder Zugkosten.

## Regressionen

14 neue Fälle in `patch_payment_floor113.test.js` mit Originalzuständen/-antworten in `fixtures/batch7_payment_stairs.json`: auf unveränderter `.112` **9 rot / 5 Kontrollen grün**, danach **14/14**. Enthalten: Originalzahlung, gesamte Originalkette T143–145 (nur acht Kupfer für eine Zimmerbuchung), Angebot/Preis/Verkäufer, mehrere Angebotspositionen, angebotene Ware ohne Angebot, fehlender Zweck, Trinkgeld/Schuld, erste Ebene/Ebenenwechsel/gleiche Ebene/nicht erfolgte Ankunft. Serialisiertes Event-Replay ist identisch.

Angrenzende Lodging-/Prebatch-Tests inklusive neuer Fälle: **56/56**. Die ältere `.51`-Regression erwartete ausdrücklich eine Geldabbuchung ohne Zimmerbuchung und bei unzureichendem Teilbetrag. Diese fachlich überholte Erwartung ist ersetzt durch unverändertes Geld; die ursprünglichen Schutzprüfungen gegen ungebuchten Schlaf und die positive vollständige Buchung bleiben erhalten. Ein im ersten Gesamtlauf entdeckter Fehler beim Ablösen alter Kaufentscheidungen wurde korrigiert; der entsprechende `.99`-Test blieb unverändert.

## Grenzen und Umfang

Der Fix erkennt Käufe aus vorhandenen strukturierten Bezügen und ausdrücklichen Zahlungsangaben, nicht durch universelles Sprachverständnis. Nicht erkannte oder widersprüchlich vom Modell bezeichnete Zwecke bleiben mögliche Fehlinterpretationen. Kein neues Handelsframework und kein automatisches Rückbuchen historischer Geldtransfers. Alte Saves bleiben ladbar; bereits gebuchte Zahlungen bleiben ihre Geschichte. Die zusätzliche Ebenenanzeige ist eine Bedienverbesserung, keine Einstufung des Warrior-Tods als Schadens- oder Spawnfehler.

Geändert: `src/v4/commands.js`, `src/display.js`, Buildnummern in `src/util.js`, `manifest.json`, `package.json`, die genannte neue Regression/Fixture, `tests/v4/c6651_lodging.test.js` und diese Note. Keine Prompt-/Kartenrevision erforderlich. Kein natürlicher GLM-Lauf gestartet.

## Gesamtabnahme

Vollständiger Testumfang des `npm test`-Scripts mit explizit vor den Dateinamen gesetzter Node-Testparallelität 4 und TAP-Reporter: **2211/2211**, Exit 0. Diff-/Whitespaceprüfung ohne unbeabsichtigte Änderungen. Der erste ST-1.19-Mock-Smoke bestand alle 21 fachlichen Checks und hatte fünf Extraktionen, war insgesamt aber **rot**: `noPageErrors` scheiterte an zwei Abbrüchen der ST-Verbindungsstatusprüfung (`openai.js:4565`). Dieses Ergebnis wird nicht als bestanden gewertet.

Der anschließende unveränderte ST-1.19-Mock-Smoke nach Abschluss der Node-Suite bestand **22/22**: fünf Extractor-Aufrufe, `extractPerReply` und `fightOpened` erfolgreich, keine PageErrors, Status `.113`. Keine Abschwächung der Smoke-Prüfung vorgenommen. Ein Mock ist kein natürlicher GLM-Nachweis.
