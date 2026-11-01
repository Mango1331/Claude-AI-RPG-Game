# .144 – Finanzvereinfachung S1+S2

01.11.2026. Basis `.143 / d2a292a`. Umsetzung des konsolidierten Fachplans
`patch_plans_10b/PATCH_FINANCE_SIMPLIFICATION.md` (main `7a5f05d`, §§6–9). Keine Balance-, Preis-, Welt- oder
Kampfänderung.

## Festlegungen (§6.1)

| Punkt | Umgesetzt |
|---|---|
| Oberfläche | eigenständige Eingabe `#pay <id>`; kein Button |
| Mehrere Personen | eine offene Karte je Empfänger aus derselben Nachricht, jede einzeln bestätigt |
| Unklare Käufe | keine Kaufkarte; die bestehenden Fachwege bleiben |
| Gültigkeit | bis zur nächsten handelnden Nachricht oder zum Ortswechsel; Panels und Reload lassen die Karte offen |
| Vorabkauf | nur eine ausdrückliche Gesamtgrenze; ein Stücklimit stoppt die Buchung mit einer Rückfrage |
| Stoppregel | Schwellen aus §9.1; erst im natürlichen Batch messbar |

## S1 – Freie Zahlungen: Karte und `#pay`

- **Text bucht keine freie Zahlung mehr** (§6.2). Trinkgeld, Gabe, Schuld oder Entschädigung werden zu einer
  **Zahlungskarte**: Richtung zum NPC, Name, Zweck, cp, Geldbestand jetzt/nach der Zahlung, ID, „NOT PAID“ und die
  kopierbare Eingabe `#pay <id>`.
  - Eine Karte entsteht nur bei anwesendem Empfänger, wenn der **vollständige Betrag in den eigenen Worten des
    Spielers** steht und keine Forderung vorliegt.
  - Eine Planner-Zahl ohne Münzworte, ein Teilbetrag, widersprechende Münzworte oder Geld für jemand anderen ergeben
    keine Karte. Der Betrag bleibt offen (`needs_amount`) und ist nicht bestätigbar.
  - Registrierung, Kauf, Angebot, Dienste und Eintrittsgebühren bleiben unverändert auf ihren Fachwegen.
- **Eine Karte je Empfänger und Nachricht.** Dieselbe Zahlung zweimal gemeldet ergibt dieselbe Karte. Verschiedene
  Beträge oder widersprüchliche Zwecke an dieselbe Person in derselben Nachricht ergeben keine Karte, keine Summe und
  kein „der Letzte gewinnt“, sondern eine Klärungsfrage. Karten für andere Personen bleiben unberührt. Eine Karte aus
  einer früheren Nachricht für dieselbe Person wird ersetzt.
- **`#pay <id>`** (`src/v4/native_pay.js`, §6.3) wirkt nur als ganze, eigenständige Spielernachricht mit genau einer
  ID; das wird vor der allgemeinen `#`-Zerlegung geprüft.
  - Zahlbar ist nur eine offene Karte (`payment` / `free` / `needs_confirmation`) aus diesem Zug, am selben Ort, bei
    lebendem anwesendem Empfänger und genug Geld. Das Geld wird bei jeder Zahlung neu geprüft; eine Vorschau ist keine
    Reservierung.
  - Gebucht werden Kartenschluss, `coin.changed` und `transaction.completed` in einem Record.
  - Kein Modellaufruf, kein Spielzug, keine Zeit. Ein zweites `#pay` zahlt nichts. Ungültige Eingaben werden sichtbar
    abgewiesen.
- **Quelle und Fold** (§6.4): Die Karte trägt ihre Quelle (Nachricht, Hash der Spielerworte, Schritt). `#pay`
  speichert einen Schnappschuss (ID, Empfänger, cp, Ort, Route, Zweck, Quelle). Der Fold prüft ihn **vor** den
  Geldereignissen: Ist die Karte gelöscht oder hat sie unter derselben ID andere Worte oder einen anderen Betrag,
  scheitert der Fold mit der vorhandenen BLOCKED-Meldung (`foldBlock`). Es gibt keine Nebenliste und keine neue
  Eventmaschine.
- **Erzähler:** Vor der nächsten Erzählung kommen alle seit dem letzten erzählten Zug per `#pay` gebuchten Zahlungen
  aus den gespeicherten Records als einmalige Faktzeile in den Kontext („PAID BEFORE THIS INPUT … It is done …
  do not pay it again“). Das funktioniert auch über Panels hinweg und für mehrere Karten.
- **Planner/Runner:** Befehlsvertrag `cmd-1.9` ohne `pay.confirmation`. Die Katalogzeile heißt `PAYMENT CARD <id> …
  only the player's own message "#pay <id>" pays it`. Ältere Antworten mit `confirmation` werden als gewöhnliches
  `pay` gelesen. `#help` und `PLAYER_COMMANDS` erklären `#pay`; die Promptgrenze bleibt gehalten (8374–8472 Zeichen).
  Der Driver bestätigt nichts.
- **B15:** Ein offenes Registrierungsangebot allein macht nur den Gebührenbetrag (oder eine Zahlung ohne Betrag) zur
  Gebühr. Ein Trinkgeld anderer Höhe wird eine normale Karte statt „NOT REGISTERED“.
- **Entfernt** (§6.5): `confirmPayment`, `paymentConsent`, `freePayment`, `paymentSources`, der `for`-Vergleich, die
  „unbewiesen“-Begründungen und jeder direkte freie Abgang aus Text.

## S2 – Neue Preise nur als klare Endsumme

- **Vertrag `delta-1.14`** (§7.1):
  - `pricing` ist `{basis:"total", quote}` mit **eigenem Münzwort** oder `unknown`.
  - Ein alter Stückpreis für genau eine Einheit wird als deren Summe gelesen.
  - Ein Stückpreis für mehrere Einheiten und Positionspreise werden als `unknown` gelesen, ein `phase:firm` daran als
    `unclear`. Dafür gibt es keinen Repair-Aufruf.
- **`priceEvidence` bei NPC-Preisen:**
  - Kein Stückpreis × Menge und keine Positionssumme (`total_required`).
  - Keine aus dem Satz geerbte Münzart (`ownCurrency`): „a copper six“ oder „fifty-six the lot“ binden nicht.
  - Die Sperre `unit_price_as_total` bleibt unverändert und wird nicht erweitert. Gemeinsame Münz- und Geschenkleser
    bleiben bestehen.
- **Rückfrage statt Sackgasse** (§7.2): Ohne Endsumme sieht der Spieler „PRICE OPEN — <Partei> for <Waren>: no binding
  total was named … ask for the total price“. Der Erzähler erhält einmal eine `PRICE CONTRACT`-Korrektur.
  Bedingungen bleiben „NOT A BINDING OFFER … conditional“.
- **Erzählervertrag im Engine-Block** (`PRICES — …`), sobald gehandelt wird. Der Abschnitt hat ein eigenes Budget und
  verdrängt keine Szenenabschnitte. Inhalt: eine Summe für genau die Waren; wer zustimmt, nennt die Summe erneut, auch
  wenn Alaric sie vorgeschlagen hat („Sixty copper it is, for all fourteen plates.“); ein bloßes „Done.“ bindet nichts.
  Die Kartenrevision des Erzählers ist unverändert.
- **Annahme** (§7.3): `tradePrice` und `positionPrices` sind entfernt; die gespeicherte gültige Auswahl kostet ihren
  gespeicherten Preis. `I have 300 copper. I buy the superior longsword.` bucht 260 cp einmal.
  - Stoppen können sie weiterhin: ausdrückliche `agreed_cp`/`max_cp`/`min_cp`, ein Rabattwunsch, Partei, Ausschlüsse,
    Auswahl und eine Menge für mehrere Positionen.
  - Nennt eine Annahme Geld ohne `agreed_cp`, bekommt der Planner einen Hinweis für den einen vorhandenen Repair.
  - Lässt der Repair einen vorher widersprechenden Preis nur weg, bleibt der Konflikt bestehen und der Spieler bekommt
    die Klärungsfrage (#123).
- **Spielergrenzen:** Sie binden nur als Gesamtsumme seiner Worte. Ein Stücklimit für mehrere Einheiten stoppt die
  Buchung mit einer konkreten Frage („NOT BOUGHT/SOLD/AGREED — "…" is a price per unit, not his total for …: name the
  total limit, or accept the other side's offer once it names its total“). Es wird weder multipliziert noch zu `null`
  gemacht und dann grenzenlos gekauft.
- **Unverändert:** `linePrice`/`pickLines` (3 × 6 = 18, 260 + 160 = 420), unteilbare Lose, `bookPurchase`/`bookSale`,
  `bidSale`, Registrierung, Gildenauszahlung, Kampfbeute, Geschenke und ein gespeicherter Preis für eine Nacht.

## Abnahme

- **Rot/Grün:** `fix144_finance.test.js` (13) und `fix144_host.test.js` (6).
  - Auf `.143` sind 17 von 19 rot. Für diese Probe stand dort ein wirkungsloser Platzhalter für `native_pay.js`
    bereit, weil `.143` kein `#pay` hat.
  - Grün sind zwei Kontrollgruppen: die `#pay`-Ablehnungen (mit dem Platzhalter trivial) und „Zustimmung ohne Summe
    bindet nichts“ (`.143` hielt das bereits).
  - Auf `.144` sind alle 19/19 grün. Sie prüfen tatsächliche Events, Records und Reload.
- **Matrix §8.2 abgedeckt:**
  - Q5 mit anderem `for` in beiden Reihenfolgen
  - normale Zahlungsformen werden dieselbe Karte
  - zwei Empfänger (Geld nach jeder Zahlung neu geprüft), doppelt gemeldete Zahlung, widersprüchliche Zahlungen
  - `#pay` bei fehlendem Betrag, Dungeon-Gebühr, unbekannter/verfallener ID, anderem Ort, abwesender Person oder zu
    wenig Geld
  - `#pay` nur eigenständig (`#status #pay …` zahlt nicht); Wiederholung zahlt nicht
  - Faktzeile nach `#pay` → `#bag` → Handlung mit zwei Zahlungen
  - Löschen der Kartennachricht sowie gleiche ID mit anderen Worten oder anderem Betrag: BLOCKED vor dem Geld
  - Reload unverändert
  - B15
  - Stück- und Positionspreise, nackte Zahl; Endsumme bindet
  - „Done.“ und „Sixty copper it is.“
  - B9 mit Limit 250, Gegengebot und Rabatt
  - 3 × 6, 260 + 160, unteilbares Los, Mengenfrage
  - Stücklimit stoppt mit Frage
  - Erzählervertrag
  - Die übrige Positivmatrix A1–A14 und Geschenke laufen über die bestehenden Suiten.
- **Bestehende Tests:** Tests, die direkte freie Abbuchungen, Freitext-Bestätigungen, Stückpreis × Menge,
  Positionssummen, geerbte Münzen oder die zweite Preislesung als Sollverhalten festhielten, wurden auf S1/S2
  umgestellt.
  - Positive freie Zahlungen sind jetzt Karte plus `#pay` (Helfer `tests/v4/pay_card.js`).
  - Batch-20-Originale (#110, #116, T62) bleiben mit einer frischen Antwort mit eigener Münz-Endsumme geprüft.
  - Die Tests der entfernten Funktion `tradePrice` sind entfallen.
- **Node:** `npm test` **2609/2609**, nichts übersprungen.
- **Replay** (§8.3): `npm run replay:check` ergibt **2235 Fälle; 398 abweichend zur .126-Baseline, alle mit exakter
  Ausgabe akzeptiert, 0 offen, 0 veraltet.** Die neue Liste ist `tests/replay/accepted_f144_vs_126.json`.
  - Sie wurde gegen den vollständigen `.143`-Replay Aufnahme für Aufnahme geprüft. 40 Aufnahmen haben sich geändert:
    35 ersetzen ihren `.143`-Eintrag mit `supersedes_143`, 5 sind neu.
  - Jede Aufnahme bleibt an ihren Fingerprint gebunden. Alle Geld- und Wareneffekte sind unten benannt. Der
    Linientest fixiert die Kategorien.

| Kategorie | Aufnahmen | Bedeutung |
|---|---|---|
| finance 144 payment card | 4 | belegte freie Zahlung (Bree 20, Hult 6, Heiler 6, Hessa 3) ist jetzt eine Karte; der Lauf hat kein `#pay` |
| finance 144 contract fields | 4 | `pay.confirmation` fällt beim Lesen weg; Ergebnis gleich |
| finance 144 acceptance hint | 4 | Annahme nennt Geld, Hinweis an den einen Repair; gleiche Befehle, gleiches Ergebnis |
| finance 144 price open | 18 | schon in `.143` ohne bindende Summe; jetzt mit PRICE OPEN/PRICE CONTRACT; kein Geld, keine Ware |
| finance 144 unit limit | 6 | Stücklimit stoppt mit der Frage nach der Gesamtgrenze (rein solche Nachrichten sind die Systemfrage ohne Geschichtszug); kein Geld, keine Ware |
| finance 144 acceptance | 3 | ausdrückliche Annahme gespeicherter Positionen mit passender Summe (Bad 3, Bett+Essen 42, Zimmer+Bad 8); `.143` lehnte sie nur über die entfernte Positionslesung ab; jetzt einmal gebucht |
| finance 144 own coin | 1 | „a copper six“ (Münze aus dem Satz) ist keine bindende Gebühr mehr: kein Angebot, PRICE OPEN |

- **Umfang:**
  - Planner-Systemprompt 40 810 → 41 094 Zeichen (+0,7 %), Extractor-Systemprompt 46 490 → 46 720 (+0,5 %).
  - Produktcode `src` gegenüber `.143`: 15 Dateien, 257 Zeilen hinzu, 223 weg, einschließlich des neuen
    `native_pay.js`.
  - Regex-/Wortmuster netto weniger: `trade.js` 22 → 13, `commands.js` 23 → 22, `finance_evidence.js` 22 → 22;
    neu sind das `#pay`-Muster und das Muster für den Annahmehinweis.
- **SillyTavern-Smokes: nicht ausgeführt, Abnahme hier offen.** In diesem Container gibt es keine SillyTavern-
  Installation. Die Installation von ST 1.19 (`npm ci` aus dem Fremdcode) wurde von der Rechteprüfung abgelehnt.
  - Die Host-Kette (Karte, `#pay`-Panel ohne Modellaufruf, Reload, Faktzeile, BLOCKED) ist nur mit dem
    Produkt-Host-Harness geprüft (`fix144_host.test.js`), nicht in echtem ST.
  - Vor dem natürlichen Batch muss `smoke:st` (Standard und Failsoft) mit dem echten `#pay`-Kurzpfad nachgeholt
    werden.

## Grenzen

- Eine falsche Modelldeutung (falsche Partei, falsche Rolle einer Summe) bleibt Restrisiko. Die Endsummenregel
  entfernt nur die Rechenrollen.
- Der Annahmehinweis kann einen zusätzlichen Repair-Aufruf kosten, wenn eine Annahme Geld nennt.
- „The toll is two copper.“ – „I pay the toll.“ ergibt keine Karte, weil der Spieler den Betrag nicht nennt. Er muss
  ihn nennen oder ein gespeichertes Angebot annehmen.
- Alte offene `.143`-Vorschläge in gespeicherten Kampagnen verfallen mit der nächsten handelnden Nachricht. Sie werden
  nicht migriert.
- Die Komfortschwellen aus §9.1 sind erst im natürlichen Batch messbar.

Nach Veröffentlichung **Stopp für den unabhängigen Gegenreview.** Es gibt keinen natürlichen Batch vor dessen
Freigabe und den nachgeholten ST-Smokes.
