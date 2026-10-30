# Geplante Fachpatches – Engine-Anzeige für Gildenboard und Handel

**Zurückgestellter Fachplan, keine aktuelle Umsetzungsfreigabe.** Planbasis 25.10.2026/.90; keine eigene Produktabnahme. Bestehende Engine-Boardkarten und Offerten sind nicht gleichbedeutend mit der hier vorgeschlagenen vollständigen Pipeline. Vor neuer Arbeit späteren Handel/Guild-Code abgleichen; Status und Priorität in [03](../03_AKTUELLER_PROJEKTSTAND.md).

## Entscheidungsvorschlag und Bewertung des Feedbacks

Das LLM gestaltet Aufträge, Waren, Preise und Gespräche. Verbindliche Angebote veröffentlicht ausschließlich die Engine nach erfolgreicher Prüfung. Spieler wählen weiterhin natürlich per Sprache; Buttons oder neue Menüpflichten sind nicht erforderlich.

Das Feedback vom 25.10.2026 bestätigt die richtige Richtung, beschreibt aber teilweise bereits vorhandene Funktionen: `guild.js` erzeugt/prüft/bucht Boards; `commands.js:boardCard` und `display.js` zeigen kanonische Daten. Neu ist vor allem, dass diese Anzeige die freie Wiedergabe ersetzt. Händlerangebote dagegen entstehen heute aus `world.js:offerLines`/`bid` nach der Extraktion. Der Hinweis auf bedingte Käufe ist bestätigt: `buy` öffnet eine Entscheidung; `offerLines` kann anschließend unmittelbar `bookPurchase` aufrufen.

**Übernommen:** Engine-Anzeige aus gespeichertem Zustand, strukturierte Händlerangebote, vorhandene Buchungen/Events, tatsächliche Anwesenheit, stabile Offerten, unterschiedliche Teilresultatregeln für Board und Handel.

**Präzisiert:** Ein zusätzlicher strukturierter Händlerkatalog bei unverändert verbindlichen Prosa-Offerten wäre keine vollständige Vereinfachung. Paket B muss alle neuen kommerziellen Offerten auf dem aktuellen C-/Ruleset-2-Pfad auf dieselbe Quelle umstellen. Verhandlungen benötigen dafür keine dritte Handelsmechanik: Ein Gegenangebot wird durch denselben Angebotsgenerator bestätigt oder abgelehnt. Spontane Warenhinweise bleiben unverbindliche Weltinformation, bis ein gültiges Angebot veröffentlicht wird.

**Nicht zugesagt:** Automatisch weniger Latenz, universelles Sprachverständnis oder die Abschaffung des World-Extractors. Eine neue Sortimentsabfrage benötigt weiterhin Modellarbeit. Numerische Marktpreise bleiben kreative Vorschläge mit deterministischer Währungs-/Mengenprüfung, keine neue Wirtschaftssimulation.

## Gemeinsamer Vertrag

- Verbindlich sind veröffentlichte Board-/Offerten-IDs, Mengen, Preise, Ziele und Engine-Profile. Ausschließlich bestätigte Vorschläge werden als verfügbare Auswahl angezeigt. Die Anzeige stammt aus den gebuchten Daten, nicht aus ungeprüftem JSON oder Prosa.
- Ein erwähnter Gegenstand ist noch kein Angebot. Prosa darf Atmosphäre, weitere Waren und unverbindliche Möglichkeiten beschreiben; sie autorisiert keine Zahlung, Besitzänderung, Questannahme oder neuen Gearwert. Falsche ausdrückliche Preis-/Kaufbehauptungen bleiben Erzählfehler; keine neue Regex-Sammlung zu deren vollständiger Erkennung.
- Die Engine wechselt bei Widerspruch nicht still auf andere Ware, einen anderen Anbieter oder einen anderen Preis. Gewöhnliche Ware wird nicht als mechanisches Upgrade ausgewiesen. Bestehende Slots, Profile und Ranggrenzen gelten.
- Reine Listenabfragen zeigen ein System-Panel. Gemischte Handlungen behalten Narrator und erforderliche Extraktion; Angebote werden dabei nicht nochmals frei ausgeschrieben. Zustandsänderungen werden erst nach Engine-Buchung erzählt.

## Paket A – Gildenboard direkt anzeigen

**Ziel:** Die vorhandenen kanonischen Verträge einmal verbindlich darstellen. Generator, 4+1-/5+0-Profil, Reparatur, Annahme, Fortschritt und Auszahlung bleiben erhalten.

1. In `commands.js` die vorhandene `boardCard`-Formatierung für direkte Anzeige und Anzeige nach Ankunft wiederverwenden. Karte mit eindeutiger Auswahl, Auftrag, Ziel/Menge, Rang, Belohnung und vorhandenen Risikohinweisen aus gespeicherten Verträgen; keine neuen Aussagen zur Sicherheit.
2. `runtime.js:plannedTurn`/`prepareGenerationAsync`, `turn.js` und `index.js`: Ein tatsächlich ausführbares, reines `board.read` kann nach normaler Buchung über den vorhandenen Panelpfad antworten. Kein Narrator-/Extractor-Aufruf nur zur Wiedergabe der Liste. Die bestehende Planner-Interpretation bleibt bei natürlicher Sprache nötig; keine zusätzliche Board-UI-Engine.
3. Bei `GO → board.read` bleibt der Reisezug erhalten. Die vorbereiteten Verträge sind erst nach bestätigter Ankunft und `board.shown` sichtbar. Nach gültiger Extraktion die Karte in derselben Antwort anzeigen; kein zusätzlicher Spieler-Leerlaufzug. Gescheiterte Ankunft zeigt keine Verträge des unerreichten Orts.
4. Narrator-Anweisungen zur vollständigen freien Abschrift der fünf Angebote entfernen; vorhandene Guild-Authority weiterverwenden. Gespräche, Schalterpersonal und Atmosphäre bleiben möglich. Ein bereits vorhandenes Board unverändert anzeigen; kein neuer Generatoraufruf für bloßes Wiederlesen.
5. Generatorfehler bleiben sichtbar: höchstens die vorhandene Reparatur, keine erfundenen Ersatzaufträge. Die Veröffentlichung eines neuen Boards bleibt vollständig/atomar. Vorherige gültige Daten nicht durch ungültige Vorschläge zerstören. Keine Änderung der bisherigen Zeit-/Fortschrittsbuchungen nebenbei.

**Betroffen:** `src/v4/commands.js`, `runtime.js`, `turn.js`, `src/display.js`, `context.js`, `index.js`; bestehende Boardtests und ST-Smoke. `guild.js` nur für tatsächlich benötigte Wiederverwendung, kein Generatorumbau.

## Paket B – Eine verbindliche Quelle für Händlerangebote

**Ziel:** Das LLM schlägt direkt strukturierte kommerzielle Angebote vor. Die Engine veröffentlicht sie über bestehende Offerten und bucht Käufe/Verkäufe unverändert. Kein dauerhaftes zweites Sortimentssystem.

1. **Gezielte Anfrage:** Ein kleiner Planner-Befehl `shop.read` mit Gegenpartei und optionalem Warenwunsch dient Sortiments-/Preisanfragen, ohne Kaufzustimmung. Bestehende `buy`, `sell`, `pay` und `offer.accept` bleiben. Eindeutig angebotene vorhandene Zeilen benötigen keinen Generator. Neue Warenwünsche, gewünschte Ankaufspreise und Gegenangebote benutzen denselben begrenzten Handelsgenerator.
2. **Identität und Struktur:** Gegenpartei und Ereignisort werden von der Engine aus kanonischen Personen/Präsenz festgelegt. Bei mehreren möglichen Händlern gezielt klären. Das Modell kann nicht einen fremden Anbieter unter einer bekannten Anfrage einschleusen. Pro Anfrage liefert es Verkaufszeilen mit Art, Menge und Gesamtpreis in Kupfer beziehungsweise ein Ankaufsangebot für exakte gehaltene Objekt-IDs/Mengen; nötige vorhandene `effect`-/`teaches`-/`equipment`-Angaben bleiben möglich. Keine Slots oder Gearwerte vom LLM.
3. **Prüfung und Veröffentlichung:** Bestehende `itemProfile`, `gearOfferWhy`, Rang-/Quellenprüfung, `priceAudit` und Offertenregeln verwenden. Nur benötigte gemeinsame Zeilenprüfung aus `world.js` nach `trade.js` herausziehen; keine Kopie der gesamten World-Verarbeitung. Numerische Vorschläge direkt prüfen, keine künstliche `said`-Prosa als Preisbeweis erzeugen. Ganzzahliger Gesamtpreis und Menge sind eindeutig; keine zusätzliche Stückpreis-Inferenz nötig. Gültige Händlerzeilen dürfen bei ungültigen Nachbarzeilen bestehen bleiben; ungültige Grundstruktur wird nicht teilinterpretiert. Höchstens eine Schema-Reparatur, keine Retry-Kette.
4. **Eine Quelle:** `world.js:offerLines` und `bid` dürfen auf dem neuen C-/Ruleset-2-Pfad keine neuen bindenden kommerziellen Offerten aus Narrator-Prosa buchen. Ebenso dort keine automatische Warenbuchung aus einem extrahierten Preis. Extractor-/Narrator-Verträge entsprechend scopen; unerwartete alte Offer-Deltas begrenzt verwerfen, übrige gültige Weltvorgänge nicht verlieren. Legacy behält seinen bisherigen Pfad.
5. **Zustimmung und Verhandlungen:** Reine Sortiments-/Preisfragen kaufen nichts. Ein Rabattwunsch ändert keine Offerte. Ein geänderter Vorschlag ersetzt ein altes Angebot erst nach erfolgreicher Prüfung/Buchung; unveränderte Angebote nicht erneut erzeugen. `acceptanceWhy`, Teilmengen, Grenzen und die Handelsverknüpfung aus .88/.89 bleiben verbindlich. Explizites `max_cp`/`any_price` darf nach erfolgreicher strukturierter Quotierung weiterhin den vorautorisierten Kauf über denselben geprüften Kaufpfad erlauben. Ein Preislimit autorisiert weder Anbieterwechsel noch andere Ware/Menge.
6. **Buchung:** `offer.created`/`offer.closed`, Entscheidungen, `bookPurchase`/`bookSale` und bestehende Servicebuchungen weiterverwenden. Keine neue Transaktionsart. Auch der bedingte Kauf durchläuft Gegenpartei, aktuelle Präsenz, Profil, Menge, Geld und vorausgehende Bedingungen; keine erneute Parallelbuchung im Extractor. Ankaufsangebote prüfen tatsächlichen PC-Besitz unmittelbar vor Verkauf.
7. **Spontane Angebote und Services:** Unverbindliche NPC-Angebote dürfen im Gespräch entstehen. Bei Interesse oder einer konkreten Zustimmung wird daraus eine strukturierte Anfrage; der vom Spieler genannte Preis wird nicht als bereits bestätigter Händlerpreis übernommen. Unbestätigte Abweichung: keine Buchung, gültiges Gegenangebot anzeigen. Dieselbe Quelle gilt auch für neue kommerzielle Dienstleistungen/Ankaufsgebote, damit Unterkunft und Lootverkauf keine Hintertür bilden. Engine-eigene kanonische Angebote wie Registrierung, Dungeongebühr und bestehende Contentangebote bleiben Engine-eigen. Freie Geschenke, Dankeszahlungen, Loot und gewöhnliche eigenständige Zahlungen bleiben unverändert.
8. **Ort und gemischte Züge:** Bei bereits anwesender Gegenpartei vor der Handelsauflösung quotieren. Bei einer erst zu bestätigenden Reise vorhandene Conditionals nutzen. Nach gültiger Ankunft/präziser NPC-Einführung die Quotierung im bestehenden World-Job auf dessen privatem Folgezustand abschließen; Aktualität vor Commit erneut prüfen. Keine neue Jobverwaltung. Ein Quotierungsfehler darf eine gültige Ankunft oder ein Geschenk nicht verwerfen; dann nur keine neue Offerte/Kaufbuchung. Keine Erzeugung eines fehlenden Händlers und keine Ankunft aus einem Szenenlabel. Reine, bereits lokal mögliche Abfragen brauchen keine Narrator-Rahmenerzählung.
9. **Persistenz und Aufwand:** Vorhandene Offerten bleiben die Angebotsquelle; wiederholtes Anzeigen erzeugt keine neue Ware/Preise. Ergebnisse einschließlich Fehlern/akzeptierter Zeilen am vorhandenen Turnrecord für Regenerate/Swipe wiederverwenden, gegen den relevanten Anfragestand prüfen. Aktuell ausführbare Anfragen bündeln, kein Aufruf pro Warenzeile. Je gebündelter Anfrage ein Generatoraufruf und höchstens eine Reparatur; eine spätere echte Ankunft bei einer anderen Gegenpartei ist eine neue Anfrage, kein Retry. Neuen LLM-Purpose und Telemetrie sauber registrieren. Nach `await` bestehende Aktualitäts-/Commit-Sicherungen erhalten. Keine zusätzliche Tagesauffüllung oder simulierte Lagerwirtschaft.

**Betroffen:** `content/commands.json`, Planner/Guard/Katalog, `src/v4/runtime.js`, `trade.js`, `commands.js`, `world.js`, `extract.js`, `items.js`, `src/context.js`, `display.js`, `index.js`; bei Bedarf ein kleines Modul ausschließlich für Anfrage/Schema des Handelsgenerators. Keine allgemeine Framework-/World-Neugestaltung. Erforderliche Protokoll-/Vertragsrevisionen erst mit der tatsächlichen Implementierung festlegen; bei geändertem Narrator-Vertrag die persönliche ST-Karte ausdrücklich aktualisieren.

## Kompatibilität und Abnahme

Neue Semantik für neue Antworten im C-/Ruleset-2-Pfad; gespeicherte Events nicht neu interpretieren. Alte Boards, offene Offerten, angenommene Verträge und Inventar bleiben gültig. Keine pauschale Save-Migration oder zusätzliche Kampagnen-Zustandsmaschine. Noch offene alte Kaufentscheidungen ausschließlich mit gültiger neuer Quotierung und erneuter Prüfung ausführen. Keine automatische Wiederholung bereits gebuchter Transaktionen.

| Prüfung | Erwartung |
|---|---|
| Board hier / Wiederlesen / fehlgeschlagener Generator | Nur kanonische vollständige Liste; Wiederlesen ohne neue Generierung; keine Prosa-Ersatzangebote |
| `GO → Board/Shop`, Erfolg und Ablehnung | Anzeige erst nach tatsächlicher Ankunft; kein zusätzlicher Pflichtzug und keine ungültige lokale NPC-Erzeugung |
| Neues Sortiment, wiederholte Anfrage, Teilresultat | Stabile veröffentlichte Angebote; gültige Händlerzeilen bleiben; kein unvollständiges neues Guild-Board |
| Fremder Anbieter, falscher Slot, kosmetische Ware | Keine falsche Offerte/Buchung oder erfundene Schutzwirkung; ordinary merchandise weiterhin zulässig |
| Preisfrage/Rabatt versus Zustimmung/Limit | Keine Zahlung durch Frage; bestätigte neue Preise und ausdrücklich vorautorisierte Käufe funktionieren genau einmal |
| Prosa-`offer`/`bid` inklusive bedingtem Kauf | Kein kommerzieller Commit über die alte Hintertür; tatsächliche Weltgeschenke und Geldübergaben bleiben möglich |
| Lootverkauf, Unterkunft, Training, kanonische Gebühren | Bestehende Mengen, Besitz-/Service- und Berechtigungsregeln bleiben erhalten; keine doppelte Buchung |
| Kauf → Equip einschließlich Stapel | Bestehende Profile/Slots, .90-Teilmengenfix und tatsächliche Werte erhalten |
| Reload, Replay, Regenerate, Swipe, Edit/Chatwechsel | Keine Neubepreisung, Doppelzahlung, doppelte Panels oder veralteten Commits; direkte Panels nicht extrahieren |
| Natürlicher Folgeinput nach Panel | Planner und Narrator kennen die veröffentlichten Angebote aus dem Zustand; System-Panel muss dafür nicht als Story extrahiert werden |

Gezielte Regressionen zuerst gegen die jeweilige Basis, dann angrenzende Tests und vollständiges `npm test`. Echte ST-Abnahme ist wegen Panel-/Host- und Protokolländerungen für beide Pakete erforderlich. Aufrufzahlen für neue und wiederholte Abfragen getrennt messen; keine Einsparung aus der bloßen Architektur behaupten. Anschließend natürlicher Lauf für Angebotsqualität, freie Dialoge und Kauf→Gear-Nutzen; keine erzwungene Erfolgsfolge im Testspieler.

## Reihenfolge und Grenzen

**A zuerst**, da vorhandene Generierung/Anzeige mit überschaubarer Integration. **B danach als geschlossenes Handelsfachpaket**, nicht als Katalog-Hintertür neben alten bindenden Prosa-Angeboten. Keine dritte obligatorische Verhandlungsphase und kein neuer Befehl zur Bestätigung jeder gewöhnlichen Auskunft. Beide Pakete benötigen vor Umsetzung eine ausdrückliche Freigabe; der bereits geplante natürliche .90-Lauf bleibt davon unberührt.

Unverändert: Boardzusammensetzung, Jagd-/Delivery-/Dungeonmechanik, Quest-XP, Kampf-/Monsterwerte, Marktpreisbalance, Gearslots, Testspieler und freie NPC-Hilfe. Das besprochene Tolerieren erzählerischer Ungenauigkeiten ist keine Autorisierung falscher Besitz-, Preis- oder Erfolgsbuchungen.
