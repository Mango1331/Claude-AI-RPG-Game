# .143 – Finanz-Buchungsgrenzen

01.11.2026. Basis `.142 / f84e6e5`; Umsetzung von `patch_plans_10b/PATCH_FINANCE_REVIEW142.md` auf main einschließlich §7. Keine Balance-, Preis-, Welt- oder Runneränderung.

## Verhalten und Ursachen

- **Q1–Q3:** Preise, Geschenke und freie Zahlungen bleiben an ihr tatsächlich gefundenes `said`/`quote` gebunden. Fehlende oder ungültige Bereiche werden nicht durch Ganztextsuche ersetzt. Ein ungültiger Bereich ist auch im reinen Belegprüfer kein unbegrenzter Suchauftrag. Ein fehlender Zahlungsanker belegt keinen Zahlungswillen für eine bekannte Verpflichtung.
- **G1–G3:** Ein Zahlen-/Währungspräfix eines Warenarguments zahlt nicht. Der begrenzte Direktzahlungskern prüft auch den Argumentabschluss. Eine unvollständig zitierte gemischte Geldgruppe wird beidseitig zurückgewiesen: weder 20 noch 5 aus einer einzigen Übergabe von 25 cp. Vollständige Mischbeträge zahlen direkt. Beim Prüfen der umgebenden Gruppe zählt ein vorheriger Warenzählwert ohne Währung nicht als Münzbestandteil (`a fine one, forty copper`). Innerhalb eines Bindestrich-Zahlworts wird keine zweite Geldfundstelle begonnen (`four` in `eighty-four`).
- **Q4/Q5:** Erfolgreich gebuchte freie Geldfundstellen werden im vorhandenen Aufrufkontext verbraucht, nicht in einem neuen persistenten Ledger. Überlappende Zitate zahlen denselben Empfänger nicht erneut. Eine passende direkte Zahlung erledigt den noch offenen Vorschlag; eine vorangestellte Bestätigung verwendet die zugehörige direkte Geldfundstelle. Zwei tatsächlich getrennte Zahlungen gleicher Höhe bleiben möglich.
- **Z1:** Nur ein kurzes Ja als eigene Aussage oder die belegte gleiche Geldhandlung bestätigt. Die ID allein, Ablehnung, Aufschub, Inspektion oder Forderung buchen nichts. Empfänger, Betrag, Zweck, Ort, Präsenz und Gültigkeit bleiben geprüft.
- **Z2:** Registrierung, Kauf und Service gehen vor der freien Klärung in die vorhandenen Fachwege. Dafür entsteht kein freier Zahlungsvorschlag. Neue freie Vorschläge speichern `route: free`; nur diese Route kann durch freie Bestätigung buchen. Historische Vorschläge ohne Route werden sicher verworfen, nicht migriert. Registrierung in der Halle, Sofortkäufe und Services behalten ihre bestehenden Bucher und Schutzprüfungen.
- **Vertrag:** Extractor `5.24` verlangt für neue nichtkanonische Finanzclaims einen auffindbaren vollständigen Handlungsanker. Fehlende Anker oder außerhalb liegende Geldzitate erhalten den bestehenden einmaligen Repair. Keine zusätzliche unbeschränkte Retryfolge. Vokabularfelder und Narrator-Vertragsrevision bleiben unverändert; keine Kartenaktualisierung erforderlich.
- **Währungszone:** NPC-Positionspreise dürfen die Währung im eigenen vollständigen Handels-`said` verwenden (T26). Bree20 bleibt korrekt. Fremde Antwortteile liefern keine Währung. Spieler-Preisbelege mit einer bloßen Zahl können weiterhin ungeklärt bleiben, wenn ihr eigener Beleg die Münzart nicht trägt; daraus wird kein verbindliches Limit erfunden.

Bestehende Angebote werden weder umgewertet noch neu interpretiert. Geschenke und echte spätere Übergaben bleiben erlaubt; die bisherige ausschließlich ablehnende Erlös-/Warenprüfung wurde nicht erweitert.

## Rot/Grün und Integration

- `fix143_finance.test.js`: acht neue Testgruppen auf unverändertem `.142` **8/8 rot**, auf `.143` **8/8 grün**. Sie prüfen tatsächliche `coin.changed`/Transaktionen sowie Gegenfälle für getrennte Handlungen, vollständige Geldgruppen und gültige Annahme. G3 ist auch als zwei Kommandos abgesichert; Q5 in beiden Reihenfolgen.
- `fix143_host.test.js`: **2/2 grün**. Frische Produkt-Hostkampagne, Vorschlag → Ablehnung/Annahme → identischer Reload; Registrierung außerhalb der Halle ohne Abbuchung oder freien Vorschlag.
- Zusammen mit den vorhandenen 21 Finanz- und vier Hosttests: **35/35 grün**. Weitere vorhandene Guild-, Service-, Agency- und Handelsprüfungen laufen in der Gesamtsuite.
- Historische positive Skriptantworten wurden in den betroffenen Tests ausdrücklich um passende aktuelle `said`-Anker ergänzt; Originalarchive/JSON-Fixtures bleiben unverändert. Abweichender Testspielertext wurde nicht länger mit einer alten, dazu widersprüchlichen Nachricht simuliert. Die falschen Quellen der neuen Negativfälle werden nicht automatisch angereichert.
- Vollständiges `npm test`: **2591/2591**, keine übersprungenen Tests.

## Replay – keine pauschale Fingerprintaktualisierung

`npm run replay:check`: **2235 Fälle; 393 abweichend zur .126-Baseline, 393 exakt akzeptiert, 0 offen, 0 veraltet.** Die neue Liste `tests/replay/accepted_f143_vs_126.json` lässt 384 frühere Einträge unverändert. Neun Einträge ersetzen mit `supersedes_142` und eigener Begründung ihre Fingerprints; ein Record kehrt zur Baseline zurück. Die alte .142-Liste bleibt unverändert. Ein zusätzlicher Linientest fixiert genau diese zehn IDs.

Gegenvergleich mit dem vollständigen originalen .142-Replay, einschließlich dessen eigenem unveränderten Vertragsadapter:

| Records | Begründete Änderung |
|---|---|
| b16-rogue-sale#78 | Ellipsen-`said` ist kein auffindbarer Handlungsanker; historisches Gebot wird nicht mehr rekonstruiert. Frische korrekt verankerte 17-cp-Offerte bleibt separat getestet. |
| b17-rogue#170, b19-warrior#328 | Ein Zimmer bleibt; weitere nackte Preise ohne Währung im eigenen `said` entfallen. Keine Buchung. |
| b18-warrior#166, #260 | Fehlende Währung beziehungsweise mehrdeutiger Anker: kein neues bindendes Gebot/Angebot aus anderer Prosa. |
| b18-rogue#341 | Historische Antworten belegen ein Preislimit mit `one` aus `one pile`. Die vorhandene Reparatur liefert denselben unbelegten Zusammenhang: keine Ausführung statt erfundenem Mindestpreis. |
| b17-rogue#138, b18-warrior#160, b19-rogue#32 | Bisherige Ablehnungen bleiben; zusätzlicher einmaliger Anker-Repair. Die Guild-Auszahlung bei #32 bleibt genau 40 cp. |
| b18-warrior#52 | Weiterhin Ablehnung wegen fehlender Verfügungsgewalt; der Adapter übernimmt zusätzlich kein fremdes `a copper` mehr. Entspricht wieder der .126-Baseline. |

Der historische Adapter erfindet kein `said` und liest Preise ohne Anker nicht aus der ganzen Antwort. Im Originalkorpus steigt die Zahl als repariert markierter angewandter Extraktionen von **90 auf 97**; das sind alte Antworten, keine gemessene neue GLM-Fehlerquote. Ein natürlicher Lauf muss erst zeigen, wie zuverlässig aktuelle Modelle den Vertrag liefern.

## Echter SillyTavern-Host

ST 1.19 mit Mockprovider, keine natürliche GLM-Abnahme:

- Standard: **24/24**, keine PageErrors; `extractPerReply`, Kampfstart und Speicherung grün.
- Failsoft: **29/29**, keine PageErrors; sichtbare Nichtausführung, terminale World-Recovery, Speicherprüfung und keine doppelte Kampfausführung grün.
- Insgesamt sechs Extractor-Anfragen im Standardprotokoll und acht im Failsoftprotokoll einschließlich Fehlerproben; keine Finanz-Repair-Schleife in diesem Szenario.
- Ein vorheriger .143-Standardlauf hatte **23/24**: alle Fachprüfungen grün, aber zwei `AbortReason`-Meldungen aus ST `openai.js:4565`. Eine unveränderte Wiederholung und der abschließende Standardlauf waren 24/24. Der Erstfehllauf wird nicht als bestanden gewertet; kein Produkt- oder Testfilter dafür eingebaut.

## Grenzen und Stopp

Die JS-Prüfung beweist kein durchgängig falsches semantisches Modellbild (Partei, Bindung, Relation). Ungewöhnliche freie Geldargumente bleiben konkrete Vorschläge; unvollständige oder nicht zuordenbare Preisbelege bleiben unverbindlich. Kein neuer allgemeiner Sprachparser und keine Behauptung vollständiger semantischer Sicherheit.

Nach Veröffentlichung **Stopp für den unabhängigen Gegenreview**, kein natürlicher Batch und keine vorsorglichen Folgekorrekturen. Findet dieser erneut strukturelle P1-Lücken der vereinbarten Klassen, gilt §7.4 des Fachplans: Designvereinfachung gesondert entscheiden, keine erneute sprachliche Mikrofixserie.

Geänderte Produktbereiche: `finance_evidence.js`, `commands.js`, `world.js`, `extract.js`, Versionsdateien. Prüfbereiche: neue Finanz-/Hostregressionen, ausdrücklich angepasste positive Handelsskripte, Replayadapter, neue Akzeptanzliste und Replay-Linientest. Vollständige Dateiliste steht im Produktcommit.
