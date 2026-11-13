# GPT-Gegenreview: Payment-Tiefenanalyse nach NPC-Dreierbatch .183

**Stand:** 13.11.2026. **Gegenstand:** [Fable-Tiefenanalyse](PAYMENT_TIEFENANALYSE_183.md) (auf `main`, Commit `f65891e`); natürliche Primärquelle [Dreierbatch .183](../testrun_10b/npc-20261113-135417Z/REVIEW.md); echter Produktcode bei `efcad4c` (Build .184, Paymentpfad seit .183 unverändert). **Nur unabhängiger Review; keine Produktänderung, keine Freigabe.**

**Eigener Prüfungsumfang:** Fable-Dokument vollständig gelesen; auf Produkt-HEAD `src/v4/commands.js`, `src/v4/native_pay.js`, `src/display.js`, `src/v4/catalog.js`, `src/v4/domain.js`, `src/v4/trade.js`, `src/v4/world.js`, `src/v4/finance_evidence.js`, `src/v4/firewall.js`, `src/v4/pulse.js` gezielt gegen die Behauptungen geprüft. **Keine eigene Node-Suite, kein erneuter vollständiger Runner-/ST-/Replaylauf; Zahlen über sieben Läufe (410 Eingaben, 18 Buchungen, 0/8, 0/12) stammen aus Fables Originalzählung und wurden nicht unabhängig nachgezählt.** Frühere lokale Originalreviews und ZIP bleiben getrennte Nachweise.

## Urteil

**Die Richtung von Z1–Z5 ist fachlich tragfähig; Fable hat die zentralen Zahlungsblocker präziser als der frühere GPT-Runreview identifiziert.** Insbesondere ist kein eingetretener Doppelabzug nachgewiesen. Der bisher beobachtete Fehlzustand ist eine **Autoritäts-/Anzeige-/Kontextinkonsistenz**, keine falsche Münzbuchung. Keine pauschale Lockerung der Zahlungskarten, der Münzwortprüfung oder des Extractorschemas.

**Zwei Hauptursachen am Produktcode bestätigt:**

1. **Unsichtbare Karte:** `commands.js` eröffnet für freie Zahlung `decision.opened` mit `payment_unconfirmed` und benennt `#pay <id>` in `resolution.line` / Modellkontext; `catalog.js` nennt sie im `openDecisionTexts`. `src/display.js` `commandLines()` rendert jedoch nur Typ/Status/Grund der Resolution und nicht den Text der Karte; `planLines()` zeigt ebenfalls keine Paymentkarten. Das erklärt die fehlende Spielerhandlung besser als „Spieler hat #pay nicht benutzt“.
2. **Bedingt, aber schon erzählt:** `commands.js` `buy()` gibt dem Narrator für `priced_within` ausdrücklich „when the seller names the price, he pays it and takes it“; `world.js` `offerLines()` bucht erst nach der Modellantwort bei gültigem Angebot. Daher kann die Erzählung wahrheitswidrig vollzogen wirken, auch wenn der Narrator der Engineanweisung gefolgt ist. Der Fall Mage T24 ist entsprechend **ein Ablauf-/Anweisungsproblem**; der zuvor berichtete „Narrator-Fehler“ muss korrigiert werden.

**Weitere Codebestätigung:** `firewall.js` `GUILD_CANON_ITEM` enthält `member\w*`, und `offer`-Zeilen werden für Gildenverkäufer hierüber gesperrt, auch wenn `members` nur die Unterkunft beschreibt. `domain.js` `service.granted` speichert `service/by/at/turn/minute`, aber nicht Preis oder genaue Servicebeschreibung. `trade.js` `bookPurchase()` bucht die ausgewählten Angebotszeilen und ihren Gesamtpreis; es gibt dort keine Sperre für eine innerhalb des Leistungsfensters bereits gewährte Übernachtung. Fables **latenter** 7-cp-Doppelabzug ist deshalb plausibel, aber weder im Original eingetreten noch als positiver Host-/Eventfall getestet.

## Präzisierungen an den vorgeschlagenen Paketen

| Paket | Unabhängiges Urteil | Schutzauflage |
|---|---|---|
| **Z1.1** | **GO als UI-Defizit.** Sichtbare gültige `#pay <id>`-Karte unbedingt zuerst. | An tatsächliche noch offene Entscheidung binden, Empfänger/Betrag/Zweck/Wallet zeigen, nie aus abgelaufener oder bereits akzeptierter Karte erneut zahlbar machen. Im realen ST-Panel und nach Reload prüfen, nicht nur `outcome.actions`. |
| **Z1.2** | **GO zur gezielten Planung**, aber **nicht bloße Darstellung**: eine Doppelbuchungssperre ist eine neue Transaktions-Guardregel und bedarf präziser Entscheidung E-3. | `service.granted` enthält keinen `what`-/`cp`-Snapshot. Verlässliche Zuordnung zu Anbieter, Leistungsort, gebuchter Position und Zeitraum über belegte Transaktion/Offerlinie oder ein enges persistentes Servicebelegfeld herstellen. Bloßer gemeinsamer `service=lodging` darf andere Leistungen nicht sperren. |
| **Z1.3** | **GO.** Fehlergründe und Preis-/Münzwort-Hinweise sind sinnvoll. | Reale Ablehnungsursache nennen; nicht „angeboten“ oder „bezahlt“ aus einem bloßen `priced` ableiten. |
| **Z3.1** | **Bedingtes GO.** `priced:true` ohne passenden `offer` ist im Original verdächtig, aber allein kein Beweis eines bindenden Angebots. | **Eine begrenzte Reparatur**, die wörtliche Preis-/Verkäufer-/Bindungsbelege verlangt und bei Nichtvorliegen den Status korrigiert – **kein** automatisch erzeugtes Angebot und keine unbegrenzte Reparaturschleife. |
| **Z3.3** | **GO zur gezielten Korrektur**, aber ebenfalls **Regelwirkung**: Die Grenze der kanonischen Gildensperre wird verändert. | Der tatsächliche Dienst `lodging/meal` und die angebotene Position müssen maßgeblich sein; Guild-Gebühr, Plakette, Rang und Vertragsdokumente bleiben streng exklusiv. Nicht durch eine vom Extractor falsch markierte Servicekategorie solche Dokumente freigeben. |
| **Z3.4** | Gerüst in Reparaturprompt **GO**; Top-Level-`expected`-Heilung **erst separat nach Originalgegenfällen**. | Keine Schemaaufweichung oder erfundene Sequenzen/Referenzen. |
| **Z2** | **E-1: Ja, mit Klarstellung.** Narrator darf keine ungebuchte Übergabe zeigen; die Engine darf weiterhin am Antwortende autoritativ buchen. | Nach dem Report das echte Ergebnis **sofort im Spielerpanel** zeigen; die spätere Erzählung kann diesen bereits gebuchten Vorgang bestätigen, **ohne neuen Kaufbefehl oder zusätzliche Zahlung**. Auch Verkauf und Produktübergabe gleichartig prüfen. |
| **Z4** | **E-2: Nur bedingt Ja.** Der Betrag allein darf keine Autorisierung sein. | Beschränkung auf ein **affirmatives, aktuelles, an genau diese Verpflichtung gerichtetes Spieler-`pay`** mit geprüfter identischer Summe, Empfänger und bekannten Angebots-/Gebührendaten. Fragen, hypothetische/negative Äußerungen, bloße Preisnennungen, Forderungen an den Spieler und Dritte bleiben ausgeschlossen. Nicht einfach jedes vom Modell versehentlich als `pay` etikettierte Zahlzitat buchen. |
| **Z5** | Weiterhin eigener Beleg-/Budgetpatch, keine Ersatzlösung für Z1–Z4. | P1a/P1e können Einzelsymptome von Rogue T42 mildern, aber ohne Ausführungskorrektur nicht den Zahlungspfad reparieren. P1f zunächst mit tatsächlichen Budget-/Abbruchbelegen prüfen. |

### Entscheidung E-3: Dauer und Umfang der bereits bezahlten Übernachtung

**Empfehlung:** Ein bereits gebuchter Aufenthalt gilt als **eine** Übernachtungsleistung beim selben Anbieter/im selben Unterkunftsbetrieb für ein erstes enges **24-Stunden-Spielzeitfenster** ab tatsächlicher Buchung; diese Grenze entspricht als vorhandener Prototyp dem `pulse.js`-Lodgingzeitfenster von 1440 Minuten (dort allerdings für die Dachsicherheit). Eine **ausdrücklich zusätzlich gebuchte Nacht** ist erlaubt. Das **Verlassen der Siedlung** sollte eine bereits bezahlte Nacht nicht automatisch verfallen lassen: Ein Spieler kann vor dem Schlafengehen die Unterkunft verlassen und zurückkehren. Als Designentscheidung ausdrücklich bestätigen; nicht aus `pulse.js` eine allgemeine Vertragslaufzeit ableiten.

**Mehrpositionskauf:** Schon bezahlte 3 cp für das Zimmer plus ein Angebot für 4 cp Essen **nicht still auf 4 cp herabrechnen**, wenn nur ein verbindlicher Gesamtpreis von 7 cp angeboten wurde. Nur eindeutig einzeln bepreiste und autorisierte verbleibende Positionen dürfen separat gebucht werden; sonst **gesamtes neues Geschäft anhalten und gezielt klären**, ohne bereits Gezahltes ein zweites Mal einzuziehen. Der Regressionstest „7 cp → nur 4 cp Essen“ benötigt diesen Nachweis und ist **kein** allgemeingültiger grüner Fall.

### E-4 und E-5 bleiben eigene Designfragen

Dass Mage T25 auch ohne gebuchte Koje einschlief, ist nach dem bestehenden `roomSteps()`-Code (Kontrolle nur für im **gleichen Zug** neu genommenen Schlafplatz) plausibel; eine dauerhafte „jeder Schlaf in einer Herberge benötigt Buchung“-Regel wäre ein neues Design. Ebenso sind Standardpreise für Mahlzeiten/Zimmer nicht Voraussetzung für diese Fehlerheilung.

### Abgrenzung zum Monster-A1-Review

Der separate [Monster-A1-Gegenreview](../patch_plans_10b/REVIEW_MONSTER_A1_184_PRODUKTDIFF_GPT.md) beschreibt **R1**: `creature.traits` können über `envelope.mayTake()` unberechtigte `fine/confiscation`-Wegnahme eröffnen. Das ist **nicht** derselbe freiwillige Kauf-/Bezahlpfad wie Fables Analyse. Als eigenständigen engen Integritätstest behandeln; keine pauschale Zusammenführung zum großen Payment-Refactor.

## Vorgehen

1. **Z1.1/Z1.3 und enges Z3 (sichtbare Karte, wahre Hinweise, Angebots-/Reparaturqualität)** als zusammenhängenden Implementierungsauftrag vorbereiten; Z1.2 und Z3.3 nur unter den obigen neuen Guard-/Kanonbedingungen. Rote Originalfälle/positive Gegenfälle und ST-Panel-Lesbarkeit prüfen.
2. **Nach Nutzerentscheidung E-1/E-2/E-3** Z2/Z4 einschließlich Multiline-Zahlungs- und Nicht-Autorisierungsschutz implementieren. `#pay` für freie Zahlungen, `offer.accept` für bereits gespeicherte Kaufangebote und die bestehende Münzautorität bleiben unangetastet.
3. **Z5** als getrenntes P1-Sammelpaket. Unveränderten natürlichen Gasthaus-/Handelsrun anschließend gegen Originalprobleme messen, statt geskriptete Grünfälle als Modellfreigabe zu werten.

**Keine unabhängige Zahlungssystem-Abnahme durch diesen Review.** Die nächste Entscheidung ist eine ausdrückliche Nutzerfreigabe der engen Designvarianten, nicht eine automatisch wirksame Empfehlung.
