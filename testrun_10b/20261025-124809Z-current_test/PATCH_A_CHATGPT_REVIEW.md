# Run 15 – Unabhängiger Code-Gegenreview: Handelsintegrität Build .88

**Datum:** 25.10.2026  
**Produktcommit:** [a25fd5e9ae368a06e28d5f82fa5b831c076c3d84](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/a25fd5e9ae368a06e28d5f82fa5b831c076c3d84)  
**Vergleich:** Build .87 / 1584dd7 → .88 / a25fd5e  
**Prüfgrundlage:** Produkt-Diff, vollständige Fachpatchnote `PATCH_RUN15_TRADE_INTEGRITY.md`, neue Regressionen `patch_run15_trade.test.js`, wichtige Bestandsfunktionen aus Commands, Planner, Trade, World und Economy; Run-15-Original-REVIEW.  
**Grenze:** Statische Gegenprüfung über GitHub; die gemeldeten Node-/ST-Testläufe wurden von ChatGPT nicht selbst ausgeführt. Die folgenden zusätzlichen Gegenbeispiele sind aus dem Code abgeleitet, **nicht** als tatsächlich ausgeführte Regression oder natürlicher Run ausgegeben.

## Gesamturteil

Der beauftragte Patch A ist substanziell umgesetzt und im Kern fachlich richtig. Die gemeinsamen Buchungspfade `bookPurchase`/`bookSale` bleiben erhalten, zusätzliche Zahlung/GIVE werden antwortlokal mit der Transaktion verknüpft, die ausdrückliche Gegenpartei/Preiserklärung wird mit `acceptanceWhy` erneut geprüft, Stückpreise erhalten `tradePrice`, Drittanbieterauskünfte `offerAdvice`. Ein zweites persistentes Handelsregister wurde nicht geschaffen.

Die 45 neuen Tests umfassen die Originale T97/T29/T26/T17/T18/T94 sowie wichtige Positiv- und Negativkontrollen: identische versus unabhängige Käufe, Trinkgeld, unzureichendes Geld, Teilmengen, Gegenparteien und Preisgrenzen, echte Geschenke, Legacy und Replay/Reload/Swipe. Laut dokumentierter Abnahme: auf .87 30 rot/15 grün, danach 45/45; angrenzend 305/305, vollständig 1736/1736, finaler ST-Mock-Smoke 21/21. Der zuvor aufgetretene 20/21-Smoke mit `AbortReason` wurde korrekt offengelegt, nicht als dauerhaft behobener Hostdefekt verkauft.

**Freigabestand:** Fachlich weitgehend positiv; vor vorbehaltloser Abnahme zwei eng begrenzte, nicht durch die vorhandenen Tests abgedeckte Preis-/Angebotsfälle unabhängig reproduzieren. Kein Anlass für ein neues Handelssystem oder großflächiges Refactoring.

## Bestätigte Implementierungszüge

1. **Einmalige Buchung:** `commands.js:resolveCommands` bildet antwortlokale Gruppen aus Offer-ID, Auswahl/Menge, Gegenpartei und Leistungszweck. Das zugehörige `pay` wird nicht erneut abgebucht. Eine ausdrücklich unabhängige Zahlung bleibt möglich. Bei mehrdeutigen Zuordnungen kann der Turn klären statt zusätzlich zu zahlen.
2. **Zustimmung:** `commands.json` ergänzt nullable `party_words`/`agreed_cp`; `planner.js:parsePlan` und der Offer-Handler nutzen `acceptanceWhy`. Anderslautende eindeutige Händleransprache wird nicht still zur gespeicherten Offerte umgedeutet.
3. **Preisnachweis:** `world.js:evidenced` nutzt bei Trade-Events die neue `tradePrice`-Prüfung statt einen Stücksatz unbesehen als Gesamtsumme zu lesen. `coinFromWords` bleibt eine reine Währungsfunktion.
4. **Sachübergabe:** Das voreilige kommerzielle `give` wird abgegrenzt; echte freiwillige Geschenke bleiben erhalten. Es gilt weiterhin die bereits bestehende Inventar-/Anwesenheitsautorität.
5. **Persistenz:** Keine nachträgliche Uminterpretation alter gespeicherter Transaktionen. `bookPurchase` verhindert zudem konkrete neue Objekt-ID-Kollisionen bei eigenständigen gleichnamigen Waren.

## Zwei gezielte offene Gegenproben vor Patch B

### A. Zustimmung mit korrektem Stückpreis gegen gespeicherten Gesamtpreis

In `src/v4/trade.js:acceptanceWhy` werden die im Spielerzitat gefundenen Münzbeträge mit `coinMentions`/`coinFromWords` gelesen und anschließend **ohne mengenbezogene Unterscheidung** mit dem gespeicherten Offer-Gesamtpreis verglichen. Die differenzierende Logik in `tradePrice` wird bei der Zustimmung nicht verwendet.

**Statisches Beispiel:** Gespeichertes Angebot: *vier Platten, ein Kupfer je Platte, zusammen vier Kupfer*. Spieler: „Deal, alle vier für einen Kupfer pro Platte.“ `coinFromWords` ergibt 1 cp, während `pickLines` 4 cp ergibt. `acceptanceWhy` meldet damit einen Preiswiderspruch, obwohl tatsächlich derselbe Preis akzeptiert wurde. Auch ein korrekt gesetztes `agreed_cp:4` kann als Widerspruch zum zitierten Stückpreis 1 gelten. Das berührt ausgerechnet die Art des T26-Preisfehlers.

**Daneben:** Der frühe Rabatt-Regex lehnt jeden Zitattext mit „... off“ ab, selbst wenn die Offerte bereits nachweislich auf den neuen Preis geändert wurde und der Spieler diesen explizit annimmt. Die Sperre gegen die **bloße Rabattforderung** ist richtig, darf aber eine **ausdrücklich bestätigte rabattierte Offerte** nicht generell unhandelbar machen.

**Geforderte Rot-/Grün-Gegenproben:** (a) gültige Zustimmung zu 4 × 1 cp = 4 cp, (b) echte Abweichung der Stückrate bleibt gesperrt, (c) unbestätigte Rabattforderung bucht nichts, (d) bereits aktualisierter Rabatt-Endpreis mit eindeutiger Annahme kann genau einmal bezahlt werden. Nur die konkret belegbare Zuordnungslogik ergänzen; kein neuer allgemeiner Sprachparser.

### B. Namentliche Drittpersonenauskunft über Waren als eigene Offerte

`world.js:offerLines` ruft `offerAdvice` für `kind:'goods'` mit `what:''` und `places:[]` auf. In `trade.js:offerAdvice` greifen dann weder eine fremde Anbieterangabe über `what` noch Ortsprüfung. Die verbleibende gesprochene-Drittpersonen-Erkennung verlangt spezielle Pronomenmuster („he/she/they will ...“), **nicht einen ausdrücklich genannten fremden Verkäufer**.

**Statisches Beispiel:** Gildenfrau sagt: „Hessel sells an iron sword for eight silver.“ Der Extractor ordnet diese Stelle irrtümlich als `offer` der Gildenfrau mit `kind:'goods'` und `said` gleich dem Aussagesatz zu. `offerAdvice` findet darin keine der vorhandenen Bedingungen und kann die Offerte als eigene Offerte durchlassen. Genau diese Unterscheidung zwischen Information und Bindung war Teil des Patch-Auftrags.

**Geforderte Rot-/Grün-Gegenproben:** (a) klar namentlich fremdes Warenangebot als bloße Information wird nicht als Offerte des Sprechers veröffentlicht, (b) Verkäufer bietet seine eigene Ware an, (c) ausdrücklich zugelassene Vermittlung bleibt möglich, (d) dritte-Person-Erzählform über den tatsächlich anbietenden Händler bleibt gültig. Keine bloße Wortliste für sämtliche Händlernamen und kein globaler Verzicht auf Warenangebote.

## Nicht als neue Fehler behaupten

- Die Original-Fälle der doppelten 80-cp-Zahlung, Hessel/Doss-Verwechslung und 1-cp-Plattenbewertung sind durch vorhandene Rot-/Grün-Regressionen adressiert. Der Review behauptet **nicht**, diese Originalfälle seien weiterhin reproduzierbar.
- Die beiden zusätzlichen Fallfamilien sind aus Implementierung und Testabdeckung abgeleitete Risiken; ihre technische Rot-/Grün-Reproduktion ist noch offen.
- Unveränderte .85-Erzählerkarte, unveränderte Delivery-, XP-, Kampf-, Board- und Gear-Mechanik entsprechen dem Auftrag. Für Patch B keine Slot- oder Architekturänderung vornehmen.

## Empfehlung

Sols **Patch B für Händlerausrüstung** kann vom bestehenden .88-Code ausgehen. Vor der abschließenden Freigabe für den nächsten natürlichen Langlauf sollten die beiden präzisierten Handelsgrenzen mit gezielten Regressionen verifiziert und gegebenenfalls innerhalb des **bestehenden Handelsfachbereichs** eng korrigiert werden. Kein dritter Großpatch, kein vorsorglicher Umbau. Den finalen kombinerten Stand erneut mit Vollsuite und echtem ST-Mock-Smoke abnehmen.

Dies ist ein zusätzlicher Gegenreview zum vorhandenen Run-15-Ordner; Original-ZIP, `REVIEW.md` und vorherige Produktdateien bleiben unverändert.
