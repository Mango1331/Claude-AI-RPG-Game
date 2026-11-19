# Avereth .203 · Performancezyklus 3

**Empfehlung für den unabhängigen Gegenreview.** Der Kandidat verkürzt den Ausrüstungskatalog in jedem betroffenen Planner- und Extractorrequest um 121 GLM-Inputtokens. Für die zehn archivierten B-Hauptzüge ergibt das gegenüber B3 weitere 2.541 Tokens bei derselben Zahl physischer Requests. Die tatsächliche Antwortqualität und Wartezeit einer neuen Generierung sind offen.

Vergleichsbasis war der gegenreviewte B3-Stand `6d9770f9b31e78d37567719bf1c06d8a4942288c`. Vor Beginn zeigte der Remote-Abgleich auf main den zwischenzeitlichen [Gegenreview](GEGENREVIEW_203_PERFORMANCE_ZYKLUS2_GPT_2026-11-19.md) bei `9705b29a0a77f57bbfb14d7ddd10b2a4fe6205c4`. Der neue Branch heißt `experiment/203-performance-cycle3`. Sein Commit ist `25c46bc9d342c9ed6cf87f8ac59e11c85ab4de18`.

## Fachpläne und Entscheidungen

| Versuch | Vergleich und Qualitätskriterium | Messung | Entscheidung |
|---|---|---|---|
| Gleichlautende Namen im Maschinenkatalog | Nur dort, wo ID und Anzeigename zeichenweise identisch sind, die ID einmal ausgeben. Abweichende Namen als ID=name beibehalten. Alle Artikel müssen in Reihenfolge und Schreibweise rekonstruierbar sein. Kategorien, Preise, Qualitätsstufen und Narratorauftrag mit B3 vergleichen. | 46 von 59 Paaren lassen sich zusammenziehen. Alle 59 wurden exakt zurückgewonnen, einschließlich `hand_axe=hand-axe`. Jeder der 54 untersuchten P-/X-Inputs spart nach Einführung der Legende netto 121 Tokens. | **GO** für den Experimentbranch |
| Extractor ohne erwartete Aktionsantwort überspringen | Bei leeren `expectedKeys` den Zustand ohne Verarbeitung der laufenden Antwort mit der vollständig gefalteten und erneut geladenen B3-Welt vergleichen. | 17/32 Revisionen erfüllten die Voraussetzung. Alle 17 hätten unterschiedliche Zustände. Die Protokolle enthalten unter anderem 16 Erinnerungsereignisse, sechs Thread-Ereignisse und zwei Kampfabsichten. Bei einer Revision protokollierte die Engine ausschließlich Ablehnungen außerhalb ihrer Abschlussdiagnose. | **NO-GO** |
| Plannerergebnis nach identischem Spielertext wiederverwenden | Bei exakt gleichem Text die echten Befehlssätze der beiden historischen Arme abgleichen. Nur identische gültige Befehle in ihrem jeweiligen Weltstand kämen für Wiederverwendung infrage. | Sechs Paare hatten identischen Text. Bei Zug 5 ergab derselbe kombinierte Text einmal eine Suche und einmal keine Mechanik. Bei Zug 9 unterschieden sich die Ziele der Bewegung. Stochastik und divergierende Welten sind beide mögliche Ursachen. | **NO-GO** für Spielertext als Schlüssel |
| Beim X-Repair nur das fehlerhafte Delta zurücksenden | Am Archivinput den vorherigen Antworttext durch das betroffene erste Delta ersetzen. Prüfen, welche unabhängigen Teile die damalige gültige Antwort übernommen hat. | Für #24 lässt sich der ursprüngliche Text #23 nicht eindeutig als JSON zerlegen. Für #41 spart der Ausschnitt 111 Inputtokens, entfernt aber aus der wiederholten Antwort die in #41 tatsächlich erhaltenen Angaben zu Heddas Notiz und zum Zeitfortschritt. Die Prosa wäre weiterhin vorhanden. Ob das Modell beides zuverlässig neu extrahiert, bleibt offen. | **NO-GO** für die Übernahme |
| Feldlisten im X-Systemauftrag enger setzen | Separater Versuch nach der Katalogkürzung. Nur Leerzeichen nach Feldtrennern in den typisierten Deltazeilen entfernen. | Bei 34 X-Inputs jeweils 36 Feldlisten und 15 weitere Tokens. Für diese wesentlich dichter gesetzten Typangaben fehlt ein Qualitätsnachweis mit neu generierten Reparaturantworten. | **Zurückgestellt**, bisherige lesbare Darstellung beibehalten |

## Was sich bei festen Antworten ändert

Alle 86 ursprünglich versendeten Inputs ließen sich mit dem gepinnten GLM-Tokenizer und Chattemplate exakt auf die gemeldete Providerlänge abbilden. Für den Vergleich wurden beide historischen Arme auf den B3-Maschinenkatalog und den B3-X-Ausgabeauftrag projiziert. Der durch B3 bereits entfallene Repair #31 wurde ausgeschlossen. Die folgende Differenz stammt ausschließlich aus der Darstellung der Artikel. Andere Teile der archivierten Inputs wurden für beide Varianten identisch gehalten.

| Korpus | Betroffene physische Requests | Inputtokens weniger | Requests weniger |
|---|---:|---:|---:|
| Zehn B-Hauptzüge, gleicher Verlauf wie im B3-Replay | 10 Planner + 11 Extractor | 2.541 | 0 |
| Zehn A-Hauptzüge, auf B3 projiziert | 10 Planner + 11 Extractor | 2.541 | 0 |
| Zusatzrevisionen aus dem natürlichen Lauf | 12 Extractor | 1.452 | 0 |
| Gesamt | 20 Planner + 34 Extractor | 6.534 | 0 |

Im zehnzügigen B-Korpus ergibt sich aus der B3-Gegenrechnung von 417.581 Input- und 8.193 Outputtokens ein Kandidat mit **415.040 Input- und 8.193 Outputtokens**, zusammen **423.233 bei 33 physischen Requests**. Das entspricht rund 0,60 Prozent weniger Gesamttokens gegenüber B3. Ausgabetokens und Requestzahl setzen die archivierten Modellantworten voraus. Es gab in diesem Zyklus null Provideranfragen. Es liegen keine neu gemessenen Sekundenersparnisse oder Cachetreffer vor. [B3-Rechnung](AVERETH_203_PERFORMANCE_ZYKLUS2_2026-11-19.md) · [Natürlicher Originalvergleich](AVERETH_203_NATUERLICHER_FEATHERLESS_AB_2026-11-19.md)

## Qualität und Abnahme

Für alle 20 Haupt- und zwölf Zusatzrevisionen wurden die ursprünglichen Antworten durch beide echten X-Pfade eingespeist. Die Tests prüfen auf Anwendungserfolg, gleiche Zahl und Reihenfolge der Requests, identischen Nachrichteninhalt außerhalb der Katalogzeile, komplette Welt und geordnete Ereignisse nach Serialisierung und Laden. Bei 32/32 stimmen beide Stände überein, einschließlich der Welt aus dem historischen Chat. Bei #30 genügt in beiden Ständen die erste Antwort. Die verbleibenden X-Reparaturen #24 und #41 bleiben erforderlich. Wiederholte Zusatzrevisionen sind keine unabhängigen Spielerlebnisse.

Der kontrollierte User06-I20-Folgetext kombiniert Kampf, neue Händlerin, einen feinen Buckler zu 64 Kupfer, eine Geschenkübergabe und eine persönliche Zusage. Die bestehende Mischprobe bestand gegen B3 und den neuen Kandidaten einschließlich Reload. Diese künstliche Fortsetzung deckt Handel während eines Kampfes ab. Für den ursprünglichen natürlichen Spielbogen fehlen vergleichbare reale Ausrüstungskäufe. Bekannt bleiben die Anwesenheitsfragen zur User06-Torwache und zum Müllerjungen. Auch ein identischer Weltzustand kann einen bereits bestehenden Fehler enthalten.

| Selbst ausgeführte Abnahme | Ergebnis |
|---|---|
| Katalogregression auf B3, dann Kandidat | Vorher 22/23, neue Prüfung rot. Danach 28/28 einschließlich Pilot01-Katalogkontext |
| Vollständige Node-Suite | 3.412/3.412 |
| Replay-Fingerprints | 2.235/2.235 entsprechend den erwarteten Fingerprints. Alle 1.131 bekannten Unterschiede exakt akzeptiert, null neue |
| Isolierte SillyTavern-1.19.0-Smokes | action_finance 36/36, user05_review 108/108, narrator_streaming 59/59. In allen drei Läufen null unerwartete Browserfehler |

Die Browserabnahme verwendet ST `7e8663cd9c184a550b37238218bdd32c6efc68e9` und einen lokalen Mock. Zum Wiederholen im Kandidaten unter `avereth-engine` zuerst `npm test` und `npm run replay:check` ausführen. Dann `npm run smoke:st:isolated -- --mode MODE` für die drei genannten Modi nacheinander ausführen. Die komplette Standard-/Failsoft-Sammlung aus Zyklus 2 wurde für die einzelne Darstellungskorrektur nicht erneut ausgeführt. Der vom ST-Host aufgezeichnete Plannerrequest enthält die neue Legende und die explizite Bindung für die Handaxt. [Browser- und Suite-Ergebnisse](performance_cycle3_203/gates.json)

## Nächste kleine natürliche Messung

Nach unabhängigem Gegenreview wären drei identische gespeicherte Szenen mit B3 und dem neuen Kandidaten aussagekräftig. Eine ausdrücklich angebotene feine Rüstung prüfen, einen bedingten Kauf mit zusammengesetzter Artikel-ID sowie eine freie Handlung mit NPC-Zusage und Geschenk im Kampf. Jeweils denselben Plannerinput und separat denselben vollständigen Extractor-Ausgangszustand samt Prosa verwenden. Paare abwechselnd B3–Kandidat und Kandidat–B3 ausführen. Vorab Sollwerte für Artikel-ID, Qualität, Preisbindung, Zahlung, freiwillige PC-Handlung und NPC-Gedächtnis festlegen. Zusätzlich Requests, Reparaturen, Usage und Median der paarweisen Zeiten bis zum bestätigten Save erfassen. Drei Paare liefern eine gezielte Qualitätsprobe, keine allgemeine Latenzschätzung.

Voraussetzungen sind ein für automatisierte Benchmarks berechtigter Zugang und eine neue ausdrückliche Budgetfreigabe. Vorgeschlagen sind höchstens 18 weltweit seriell ausgeführte Generierungen einschließlich Repairs, maximal 20.000 Input- und 4.000 Outputtokens pro Request und insgesamt 0,10 USD. Der zuletzt bestätigte Chat-Tarif schließt diese Automatisierung aus. Unbekannter Remoteabschluss beendet den Versuch. Die ursprüngliche Promptreihenfolge ist in allen Vergleichen beibehalten. [Tarif- und Cacheanalyse](AVERETH_203_FEATHERLESS_CACHE_ZYKLUS2_2026-11-19.md)

## Reproduktion

Die beiden Skripte verwenden dieselben Originale und die beiden per SHA-256 gepinnten GLM-Dateien wie Zyklus 2. `BASE`, `NEXT` und `MAIN` sind absolute Pfade zu B3, dem Kandidaten und dem Dokumentationscheckout. Im Verzeichnis `recherche/performance_cycle3_203` ausführen.

```sh
work=$(mktemp -d)
tar -xzf "$MAIN/recherche/performance_natural_ab_203/laufdaten.tar.gz" -C "$work"
node compare.mjs "$BASE" "$NEXT" "$MAIN" "$work" "$work/comparison.json"
"$GLMPY" measure.py "$work" "$work/comparison.json" "$TOKENIZER" "$TEMPLATE" "$work/results.json"
cmp "$work/results.json" results.json
node "$MAIN/recherche/performance_suite_203/mixed.mjs" "$MAIN" "$NEXT" "$BASE"
```

[Einzelergebnisse](performance_cycle3_203/results.json) · [Weltvergleich](performance_cycle3_203/compare.mjs) · [Promptmessung](performance_cycle3_203/measure.py) · [Tokenizer und ST-Einrichtung](performance_cycle2_203/README.md)
