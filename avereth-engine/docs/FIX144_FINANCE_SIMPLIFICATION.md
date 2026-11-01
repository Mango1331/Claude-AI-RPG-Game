# .144 – Finanzvereinfachung S1+S2

01.11.2026. Basis `.143 / d2a292a`. Umsetzung von `patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md` (main `94ab3c4`)
§6 S1+S2, §7 und §10. Keine Balance-, Preis-, Welt- oder Kampfänderung.

## Getroffene Entscheidungen (§8, §10.5)

Für die offenen Punkte wurden die Empfehlungen des Fachplans umgesetzt:

| Entscheidung | Umgesetzt |
|---|---|
| S1 freie Zahlungen nur per Engine-Aktion | ja: `#pay <id>`, kein Button |
| Mehrere Karten pro Nachricht (§10.1 Nr. 2) | pro Empfänger; das globale Schließen anderer Karten ist entfernt |
| Karte auch für unklare Fachzahlungen (§10.1 Nr. 8) | **nicht** umgesetzt (vorbereitete Ausweichrichtung) |
| S2 neue NPC-Preise nur als Endsumme | ja, inklusive Entfernung der zweiten Preislesung bei der Annahme |
| Spieler-Stücklimit (§10.2 Nr. 3) | nur eine Gesamtgrenze bindet; ein Stücklimit ist ein Wunsch |
| Schwellen der Stoppregel (§10.3) | **offen**: vor dem natürlichen Batch freigeben |

## S1 – Freie Zahlungen nur über `#pay`

- **Text bucht keine freie Zahlung mehr.** Trinkgeld, Gabe, Schuld oder Entschädigung werden zu einer
  **Zahlungskarte**: Empfänger, Betrag, Zweck, Geldbestand vorher/nachher, ID, „NOT PAID“ und die exakte Eingabe
  `#pay <id>`. Kauf, Angebot, Registrierung, Dienste und Eintrittsgebühren bleiben unverändert auf ihren Fachwegen.
- **`#pay <id>`** (`src/v4/native_pay.js`) gilt nur als ganze, eigenständige Nachricht mit genau einer ID. Es läuft
  ohne Modellaufruf und ohne Geschichtszug. Es zahlt nur `kind:payment`, `route:free`, `state:needs_confirmation`, und
  nur im selben Zug wie die Karte, am selben Ort, bei anwesendem Empfänger und ausreichendem Geld.
  Kartenschluss, `coin.changed` und `transaction.completed` werden gemeinsam gebucht. `#status #pay …`, Zitate oder
  Prosa zahlen nichts.
- **Gültigkeitsfenster:** Die vorhandene Regel bleibt. Eine Karte verfällt mit der nächsten handelnden Nachricht oder
  beim Ortswechsel; Statuspanels und andere `#`-Befehle lassen sie offen. Ein „Yes, I pay“ in Worten zahlt nichts und
  lässt die Karte verfallen. Nennt der Text einen Betrag, entsteht eine neue Karte.
- **Pro Empfänger und Nachricht höchstens eine Karte.** Eine zweite Zahlung an dieselbe Person in derselben Nachricht
  wird nicht gebucht (`clarify`) und wartet auf eine eigene Nachricht. Eine Karte einer früheren Nachricht für dieselbe
  Person wird ersetzt. Karten für andere Personen bleiben offen.
- **Fold-Schutz statt Nebenliste:** `#pay` schließt die Karte mit einem Schnappschuss
  (`decision.closed.expect`: Route, Empfänger, cp). Fehlt diese Karte beim Fold, etwa weil ihre Nachricht gelöscht
  wurde, scheitert der Fold mit der vorhandenen BLOCKED-Meldung (`foldBlock`). Das alte Geld wird dann nicht
  nachgebucht. Swipes ändern keine Karte, weil der Host das Record der Spielernachricht wiederverwendet.
- **Erzähler:** Der Vorschlagszug sagt weiter „Narrate no handover of coin“. Nach `#pay` erhält die nächste
  Geschichtsnachricht einmal aus dem Eventrecord „PAID BEFORE THIS INPUT … It is done“ (`src/host.js`).
- **Planner:** Befehlsvertrag `cmd-1.9` ohne `pay.confirmation`; die Katalogzeile heißt jetzt
  `PAYMENT CARD <id> … only the player's own message "#pay <id>" pays it`. Ältere Antworten mit `confirmation` werden
  als gewöhnliches `pay` gelesen (Planner und Interpreter).
- **Runner:** Eine Zeile in `PLAYER_COMMANDS` erklärt `#pay`. Die Promptgrenze von 8500 Zeichen bleibt gehalten
  (8374–8472). Der Driver erzeugt und bestätigt keine Karten.
- **B15:** Ein offenes Registrierungsangebot allein macht nur den Gebührenbetrag (oder eine Zahlung ohne Betrag) zur
  Gebühr. Ein Trinkgeld anderer Höhe wird eine normale Karte statt „NOT REGISTERED“.
- **Entfernt:** `confirmPayment`, `paymentConsent`, `freePayment`, `paymentSources`, der `for`-Vergleich, die
  „unbewiesen“-Begründungen und jeder direkte freie Abgang aus Text.

**Abweichung von §10.1 Nr. 7, bewusst:** Nennt der Spielertext keine Münzen (Planner-Betrag ohne `money`), entsteht
trotzdem eine Karte mit dem Planner-Betrag. Der Betrag ist sichtbar und wird nur per `#pay` gezahlt. Grund: die
häufige Form „The toll is two copper.“ – „I pay the toll.“ Eine Karte bleibt aus, wenn die eigenen Münzworte
unvollständig sind oder widersprechen (`clarify`), wenn eine Forderung vorliegt oder wenn das Geld an jemand anderen
geht.

## S2 – Neue NPC-Preise nur als Endsumme

- **Vertrag `delta-1.14`:** `pricing` ist `{basis:"total", quote}` oder `unknown`. Ein alter Stückpreis für genau eine
  Einheit wird als deren Summe gelesen. Ein Stückpreis für mehrere Einheiten und Positionspreise werden als `unknown`
  gelesen, `phase:firm` als `unclear`. Dafür gibt es keinen Repair-Aufruf.
- **`priceEvidence`:** Ein Stückpreis gilt nur für eine Einheit. Bei mehreren Einheiten und bei `positions` ist das
  Ergebnis `total_required`. Die vorhandene Sperre `unit_price_as_total` (Stückpreis als Gesamtpreis) bleibt
  unverändert und wird nicht erweitert.
- **Rückfrage statt Sackgasse:** Ohne Endsumme sieht der Spieler `PRICE OPEN — <Partei> for <Waren>: no binding total
  was named … ask for the total price`. Der Erzähler erhält einmal eine `PRICE CONTRACT`-Korrektur.
- **Erzähler-Endpreisvertrag** im Engine-Block (`PRICES — …`), sobald gehandelt wird. Der Abschnitt hat ein eigenes
  Budget, verdrängt also keine Szenenabschnitte. Er enthält: eine Summe für genau die Waren; wer zustimmt, nennt die
  Summe erneut; ein bloßes „Done.“ bindet nichts. Die Kartenrevision des Erzählers ist unverändert, also ist keine
  Kartenaktualisierung nötig.
- **Annahme (§4.2):** `tradePrice` und `positionPrices` sind entfernt. Die Annahme bucht den gespeicherten Preis.
  Stoppen können sie nur noch ausdrückliche Grenzen und Gegengebote des Befehls (`agreed_cp`, `max_cp`, `min_cp`),
  ein Rabattwunsch, die Partei, die Auswahl und eine Menge für mehrere Positionen.
  `I have 300 copper. I buy the superior longsword.` bucht 260 cp einmal.
- **Damit ein ausdrückliches Gegengebot nicht still verloren geht:** Nennt eine Annahme Geld ohne `agreed_cp`, bekommt
  der Planner einen Hinweis für den einen vorhandenen Repair. Lässt der Repair einen vorher widersprechenden Preis nur
  weg, bleibt der Konflikt bestehen und der Spieler bekommt eine Klärungsfrage (#123).
- **Spielergrenzen:** `max_cp`/`min_cp`/`agreed_cp` binden nur als Gesamtsumme seiner Worte. Ein Stückpreis für mehrere
  Einheiten ist ein Wunsch: kein Fehler, kein Repair, keine Vorabzustimmung.
- **Unverändert:** `linePrice`/`pickLines` (3 × 6 = 18, 260 + 160 = 420), unteilbare Lose, `bookPurchase`/`bookSale`,
  `bidSale`, Registrierung, Gildenauszahlung, Kampfbeute und Geschenke.

## Abnahme

- **Rot/Grün:** `fix144_finance.test.js` (13) und `fix144_host.test.js` (4).
  - Auf `.143` sind 15 von 17 rot. Für diese Probe stand dort ein wirkungsloser Platzhalter für `native_pay.js`
    bereit, weil `.143` kein `#pay` hat.
  - Grün sind zwei Kontrollgruppen: die `#pay`-Ablehnungen (mit dem Platzhalter trivial) und „Zustimmung ohne Summe
    bindet nichts“ (`.143` hielt das bereits).
  - Auf `.144` sind alle 17/17 grün.
- **Pflichtfälle §7/§10.4 abgedeckt:**
  - Q5 mit anderem `for` in beiden Reihenfolgen
  - normale Zahlungsformen werden dieselbe Karte
  - zwei Empfänger, zweite Zahlung an dieselbe Person
  - `#pay` bei fehlendem Betrag, Gebühr, unbekannter/verfallener ID, anderem Ort, abwesender Person oder zu wenig Geld
  - `#pay` nur eigenständig; Wiederholung zahlt nicht
  - Faktzeile für den Erzähler; Löschen der Kartennachricht führt zu BLOCKED
  - B15
  - „four each“ und Teilpreise; Endsumme bindet
  - „Done.“ und „Sixty copper it is.“
  - B9 mit Grenze, Gegengebot und Rabatt
  - Engine-Arithmetik und Mengenfrage
  - Spieler-Stücklimit
  - Erzählervertrag
- **Bestehende Tests:** Tests, die direkte freie Abbuchungen, Freitext-Bestätigungen, Stückpreis × Menge,
  Positionssummen oder die zweite Preislesung als Sollverhalten festhielten, wurden auf S1/S2 umgestellt.
  - Freie Zahlungen sind jetzt Karte plus `#pay`; die positive Buchung bleibt jeweils geprüft (Helfer
    `tests/v4/pay_card.js`).
  - Stückpreisfälle prüfen jetzt „keine Bindung, PRICE OPEN“ und die Bindung der Endsumme.
  - Batch-20-Originale (#110, #116, T62) bleiben mit der frischen Endsummenantwort geprüft.
  - Die Tests der entfernten Funktion `tradePrice` sind entfallen.
- **Node:** `npm test` **2607/2607**, nichts übersprungen.
- **Replay:** `npm run replay:check` ergibt **2235 Fälle; 398 abweichend zur .126-Baseline, alle mit exakter Ausgabe
  akzeptiert, 0 offen, 0 veraltet.** Die neue Liste ist `tests/replay/accepted_f144_vs_126.json`.
  - Sie wurde gegen den vollständigen `.143`-Replay Aufnahme für Aufnahme geprüft. 39 Aufnahmen haben sich geändert:
    34 ersetzen ihren `.143`-Eintrag mit `supersedes_143`, 5 sind neu.
  - Kategorien statt Einzelbegründung, wie in §10.2 Nr. 5 vorgesehen; der Linientest fixiert sie.

| Kategorie | Aufnahmen | Bedeutung |
|---|---|---|
| finance 144 payment card | 4 | belegte freie Zahlung (Bree 20, Hult 6, Heiler 6, Hessa 3) ist jetzt eine Karte; der Lauf hat kein `#pay` |
| finance 144 contract fields | 4 | `pay.confirmation` fällt beim Lesen weg; Ergebnis gleich |
| finance 144 acceptance hint | 4 | Annahme nennt Geld, Hinweis an den einen Repair; gleiche Befehle, gleiches Ergebnis |
| finance 144 price open | 18 | schon in `.143` ohne bindende Summe; jetzt mit PRICE OPEN/PRICE CONTRACT; kein Geld, keine Ware |
| finance 144 unit limit | 6 | Stücklimit ist ein Wunsch; Verkauf wartet auf die Summe oder wird aus eigenem Grund abgelehnt; zuvor teils wegen ungültigem Plan nicht ausgeführt |
| finance 144 acceptance | 3 | ausdrückliche Annahme gespeicherter Positionen mit passender Summe (Bad 3, Bett+Essen 42, Zimmer+Bad 8); `.143` lehnte sie nur über die entfernte Positionslesung ab; jetzt einmal gebucht |

- **Umfang:**
  - Planner-Systemprompt 40 810 → 41 094 Zeichen (+0,7 %), Extractor-Systemprompt 46 490 → 46 643 (+0,3 %).
  - Produktcode `src` 169 Zeilen hinzu, 235 weg, dazu `native_pay.js` (54 Zeilen).
  - Regex-/Wortmuster netto weniger: `trade.js` 22 → 13, `commands.js` 23 → 22, `finance_evidence.js` 22 → 22;
    neu sind das `#pay`-Muster und das Muster für den Annahmehinweis.
- **SillyTavern-Smokes: nicht ausgeführt.** In diesem Container gibt es keine SillyTavern-Installation. Die
  Installation von ST 1.19 (`npm ci` aus dem Fremdcode) wurde von der Rechteprüfung abgelehnt.
  - Die Host-Kette (Karte, `#pay`-Panel ohne Modellaufruf, Reload, Faktzeile, BLOCKED) ist nur mit dem
    Produkt-Host-Harness geprüft (`fix144_host.test.js`), nicht in echtem ST.
  - Vor dem natürlichen Batch muss `smoke:st` (Standard und Failsoft) in einer Umgebung mit ST nachgeholt werden.

## Grenzen

- Eine falsche Modelldeutung (falsche Partei, falsche Rolle einer Summe) bleibt Restrisiko. Die Endsummenregel
  entfernt nur die Rechenrollen.
- Eine Karte mit Planner-Betrag ohne Münzworte kann einen falschen Betrag zeigen. Sie zahlt nur per `#pay`.
- Der Annahmehinweis kann einen zusätzlichen Repair-Aufruf kosten, wenn eine Annahme Geld nennt.
- Alte offene `.143`-Vorschläge in gespeicherten Kampagnen verfallen mit der nächsten handelnden Nachricht. Sie werden
  nicht migriert.
- Natürliche Läufe müssen zeigen, wie oft Erzähler und Extractor die Endsumme liefern. Erst dann sind die Schwellen
  aus §10.3 anwendbar.

Nach Veröffentlichung **Stopp für den unabhängigen Gegenreview.** Es gibt keinen natürlichen Batch, bevor die Schwellen
aus §10.3 freigegeben und die ST-Smokes nachgeholt sind.
