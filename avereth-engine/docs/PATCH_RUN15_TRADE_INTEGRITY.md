# Run 15 – Patch A: Handelsintegrität (.88)

Basis: `.87`, `1584dd735c19d771098f7aff901bfdb71eee505a`. Produkt: **4.3.0-c.6.6.88**.
Vokabular **cmd-1.6**, Extractor **extract-5.8**. Delta-Schema **delta-1.5**, Planner **plan-c0.1** und Narrator-Vertrag **.85** unverändert.

## Anlass und Umsetzung

| Originalfall | Ursache | Korrektur |
|---|---|---|
| T97/i193: zweimal 80 cp für einen Artikel | Nach `offer.accept` war die Offerte geschlossen; zusätzliches `pay` wurde gewöhnliche Zahlung. Außerdem enthielt die Zustimmung eine Rabattbedingung. | Zugehörige Commands verwenden denselben vorhandenen Kaufpfad. Das Original mit unbestätigtem Rabatt bezahlt zunächst nichts; ein unbedingter 80-cp-Kauf einschließlich Geldübergabe bezahlt einmal. |
| T29/i57: Hessel zugestimmt, an Doss verkauft | Offerten-ID war gültig, abweichende Gegenpartei wurde nicht geprüft. | Gemeinsame Zustimmungsprüfung im Planner und Handler. Wörtliche Gegenpartei und expliziter Gesamtpreis müssen zur ausgewählten Offerte passen. Keine andere Offerte wird ersatzweise angenommen. |
| T26/i52: vier Platten für 1 statt 4 cp | Extractor meldete korrekt 4 cp; `evidenced` überschrieb den Gesamtpreis mit dem gelesenen Stückpreis. | Handelsbezogener Preisnachweis unterscheidet einen Stücksatz von einem Lospreis. Das Original behält 4 cp. Reine Währungsumrechnung bleibt unverändert. |
| T17/i34 und T18/i36: Empfehlung als eigenes Angebot | Preise fremder Anbieter wurden als bindende Offerte der anwesenden Auskunftsperson übernommen. | Explizite Drittpersonenauskunft, bekannte entfernte Dienstleistungsorte und abweichende benannte Anbieter werden abgegrenzt. Ausdrücklich angebotene Buchung/Vermittlung bleibt zulässig. |
| T94/i187: GIVE vor Verkauf | Die Ware ging vor der Preisprüfung verloren; der folgende Verkauf scheiterte an fehlendem Besitz. | Ein kommerzieller Übergabe-/Verkaufsvorgang bucht Waren und Preis gemeinsam über `bookSale`; eine noch verlangte Begutachtung lässt die Ware beim PC. Tatsächliche Geschenke bleiben möglich. |

### Commands und Ausführung

`offer.accept` erhält zwei nullable Belegfelder: `party_words` (exakt aus dem Spielertext) und `agreed_cp` (ausdrücklich vereinbarter Gesamtpreis). Fehlende Felder alter Antworten werden weiter normalisiert. `parsePlan` meldet Widersprüche zur bestehenden Reparatur; `acceptanceWhy` prüft vor der Buchung nochmals. Eine eindeutige direkte Anrede wie „Done, Hessel“ bleibt auch ohne neues Feld prüfbar. Belegfelder dürfen widersprüchliche zitierte Namen oder Preise nicht verdecken. Namen werden nicht aus bloßen Erwähnungen in Beschreibungen als Alias übernommen.

`resolveCommands` verknüpft die eindeutig zusammengehörigen Kauf-, Zahlungs- und Verkaufsübergabeschritte nur während dieses Aufrufs. Die vorhandene Offerten-ID, gewählte Zeilen und Menge identifizieren den Handel. Ein Zahlungszweck muss zur Ware passen; Gegenpartei und gleicher Betrag allein reichen nicht. Eine zwecklose mögliche Zusatzabbuchung wird zur offenen Frage. Eigenständige Käufe, Trinkgeld und Geschenke bleiben getrennt, auch beim selben Händler und Betrag. „Spear tip“ ist dabei eine Ware, kein Trinkgeld.

Die bestehenden Handler prüfen weiterhin Präsenz, Besitz, Preis, Budget und vorausgehende Bedingungen. Eine verknüpfte Zahlung darf Kaufvoraussetzungen nicht umgehen. Gebuchte Unterkunft gilt auch bei umgekehrter Command-Reihenfolge für das abhängige Schlafen. Ein Einzelverkauf nimmt kein ungepreistes Mehrwarenlos an. `buy.max_cp` und `sell.min_cp` gelten auch bei Weiterleitung an eine Offerte.

Die erfolgreiche Buchung verwendet weiterhin `bookPurchase` bzw. `bookSale`, dieselben Events und den bisherigen Coin-/Inventarzustand. Es gibt weder dauerhaftes neues Handelsregister noch zusätzliche LLM-Aufrufe oder Retry-Stufen. Zwei unabhängige Käufe gleichnamiger Waren erhalten bei einer tatsächlichen ID-Kollision deterministische Suffixe, statt nach einer Teilbuchung am zweiten `object.created` zu scheitern.

### Preise und Angebotserfassung

`tradePrice` ergänzt ausschließlich die Nachweisprüfung von `offer`/`bid` auf dem aktuellen C-/Ruleset-2-Pfad:

- Ein eindeutiger Stückpreis wird mit der betroffenen Menge verrechnet.
- Ein ausdrücklicher Gesamt-/Lospreis wird unverändert als Gesamtpreis gelesen; einzelne davor genannte Stückpreise werden nicht zusätzlich addiert.
- Preisbereiche und mehrere nicht zusammengeführte Stücksätze ergeben keinen festen Preis.
- Ein Satz „pro Platte“ kann nicht zusätzlich eine andere Warenart desselben Bids bepreisen.
- „Drei für neun“ bleibt drei Einheiten für insgesamt neun cp.

Das vorhandene `said` soll die kommerzielle Klausel mit Anbieterbezug und Bedingungen enthalten. Empfehlungen bleiben normale Informationen über Fakten bzw. `place.reported`; sie berechtigen nicht zur Zahlung am falschen Schalter. Eigene Angebote in erzählter dritter Person und ausdrücklich angebotene Vermittlung bleiben zulässig. Keine zusätzliche Personen- oder Ortsverwaltung.

## Regressionen und tatsächliche Abnahme

`tests/v4/fixtures/run15_trade.json` enthält sechs unveränderte gefaltete Vorzustände und die zugehörigen Originalcommands/-antworten aus Run 15, kein synthetisch als natürlich ausgegebener Lauf. Quelle: Original-ZIP SHA-256 `7a251693c750643116a8e298f248b4c2b3393003009196ba9cdff10afbea3032`. Original-ZIP und Review auf `main` bleiben unverändert.

- **45 neue Tests:** gegen die unveränderten `.87`-Produktdateien **30 rot / 15 grüne Kontrollen**, danach **45/45 grün**.
- **Angrenzende Gruppe: 305/305 grün**, einschließlich Planner, alter Handels-/Preisfälle, Ownership, freier NPC-Hilfe, Delivery und World-Schutz.
- **Vollständiges `npm test`: 1736/1736 grün.**
- **Finaler echter ST-1.19-Mock-Smoke (`npm run smoke:st:c`): 21/21 grün**, fünf Extractor-Aufrufe, `extractPerReply` und `fightOpened` erfolgreich, keine PageErrors. Vier auf Platte gespeicherte Story-Replies jeweils `applied` und genau ein `extract.applied`.
- Ein vorausgehender Smoke auf einem Zwischenstand erreichte 20/21: ausschließlich `noPageErrors` scheiterte an zweimal `AbortReason @ openai.js:4565` aus ST. Fünf Extraktionen waren erfolgt. Unverändert wiederholt 21/21 ohne PageErrors; der anschließende finale Quellstand besteht ebenfalls 21/21. Keine unbelegte dauerhafte Behebung dieses intermittierenden Hostfehlers behauptet.
- Produktpfad geprüft: einmaliger Kauf, zwischengespeicherte Interpretation ohne weiteren Provideraufruf, JSON-Reload sowie alternative Antwort/Swipe ohne zweite Abbuchung. Ereignis-Replay ergibt denselben Zustand.
- Zwei frühere versionengebundene Tests wurden nur auf `cmd-1.6` bzw. `extract-5.8` aktualisiert; bestehende fachliche Erwartungen bleiben erhalten.

## Kompatibilität, Umfang und Grenzen

Neue Handelsprüfungen sind auf C/Ruleset 2 begrenzt. Vorhandene Events und alte Offerten werden nicht rückwirkend geändert oder neu bepreist; Replay führt keine neue Textinterpretation aus. Ruleset 1 behält seine frühere Zahlungssemantik. Kollisionsfreie bestehende Objekt-IDs bleiben gleich.

Unverändert: Gearprofile und Ausrüstungsslots (**Patch B ist nicht begonnen**), Gildenboard, Delivery, Kampf, XP, Testspieler, Recovery-Budgets und Host-Lifecycle. Keine neue persönliche Erzählerkartenrevision durch Patch A.

Die Prüfung ist kein allgemeiner Beweis beliebiger natürlicher Sprache. Sie verarbeitet die dokumentierten Preisformen und klare Belegwidersprüche; unerkannte oder vom LLM ausgelassene semantische Angaben bleiben ein Risiko für den nächsten natürlichen Lauf. Es gibt bewusst keine automatische Preisverhandlung oder freie Reise aus Prosa. Der ST-Smoke prüft den echten Host mit Mockprovider, nicht GLMs Verständnis der neuen Handelsregeln. Vor Patch B folgt der unabhängige Gegenreview; kein natürlicher Langlauf gestartet.
