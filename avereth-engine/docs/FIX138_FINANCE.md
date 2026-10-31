# Fachpatch .138 – Preisinterpretation und Zahlungssicherheit

Build **`4.3.0-c.6.6.138`**, Basis `5124373` (.137). Grundlage: Batch20-Review auf `main`
(`testrun_10b/batch-20261031-140346Z/REVIEW.md`, §7 und maßgeblich §8) und der freigegebene Fachplan mit den vier
Festlegungen (gleichartige Stapel, Bedingungen zur Zahlungsform, T50 ohne gespeicherten Lohnanspruch, Replay nur einzeln
begründet). Keine neuen Preisregeln, Wirtschaftsmechaniken, Protokollfelder oder Pflichtzüge; XP, Startwerte, PP,
Gearpreise, Kampf, Populationen, NPC-Bewegungsrechte und Testspielerstrategie unverändert. Kein T149-Belegfix.

## 1. Gemeinsame Preislesart (`economy.js`, `v4/trade.js`, `v4/world.js`)

Angebotserstellung (`world.bid`/`evidenced`) und Zustimmung (`acceptanceWhy` in Planner und Command) verwenden dieselbe
Lesart (`tradePrice`) und dieselbe Stückzahl.

- **Stückpreis × Menge**: zusätzlich zu `each/apiece/per/a` gilt `<Betrag> the <Einheit>` als Stückpreis
  („four copper the plate“). Sammeleinheiten (`the lot/pair/dozen/bundle/…`) sind kein Stückpreis.
- **Bestätigende Summe**: Neben einem Stückpreis bestätigt eine genannte Summe = Stückpreis × Menge die Rechnung, statt
  den Preis ungültig zu machen (#106). Jede andere Summe (andere Ware, Geldbestand, früherer Preis) lässt ihn offen.
- **Summe ohne eigene Währung** („fifty-six the lot“) gilt in der einzigen Währung des Zitats (#116).
- **Gleichwertige Darstellungen** zählen einmal: `coinEvidence` liefert zusätzlich `sums` (gemischte Summen nur in
  fallender Einheit; „eighty-four copper—eight silver and four“ sind zwei gleiche Summen 84/84, „140 copper — that's 1 gold
  4 silver“ ist 140). `compound` verlangt jetzt ebenfalls fallende Einheiten. „eight silver and four“ am Phrasenende ist
  84 cp; „two silver and four plates“ bleibt 20.
- **Ausdrücklicher abweichender Paketpreis** bleibt zulässig („four copper each, but fifty copper for the lot“ → 50);
  zwei verschiedene Paketpreise oder Alternativen („… or three if chipped“) bleiben ungeklärt.
- **Bedingungen**: unverändert macht `unless/depending/provided` und jedes `if` den Preis offen – **außer** ein `if`,
  dessen einziger Inhalt die Wahl der Zahlungsform ist (Münze/Gutschrift/Tausch + want/prefer/rather/like/choose, ohne
  eigenen Betrag; #110). „if the appraiser approves“ bleibt offen. Ermittelt wird nur der Betrag: Der Verkauf braucht
  weiterhin seine Annahme und zahlt in Münze; nichts wird gutgeschrieben oder getauscht.
- **Gleichartige Stapel** (`sameGoods`/`rateUnits`): Mehrere Zeilen teilen einen Stückpreis nur, wenn alle eigenen
  Eigenschaften des Gegenstands gleich sind (Name, Art, Einheit, Rang, Level, Material, Wert, …; ignoriert werden nur
  Verwaltungsfelder wie id, qty, holder, source). Unterschiedliche Qualität/Einheit/Level → 0, also kein gemeinsamer
  Stückpreis. Objekt-IDs und Mengen je Zeile bleiben unverändert (#106: 7 + 14 → Rate × 21). Verschiedene Waren werden
  nie über ihre gemeinsame Stückzahl bewertet.
- **Kein Teilbetrag als Gesamtpreis**: Für eine Handelsposition mit mehr als einer Einheit, deren Worte die
  Handelslesart nicht klärt, setzt `evidenced` nicht mehr die eine genannte Münzzahl als Preis ein (#116: 4 statt 56),
  sondern lässt sie ungeklärt (`amount.unproven`, keine Buchung). Positionen mit einer Einheit, Geschenke und
  Questbelohnungen behalten ihre bisherigen Belegregeln.
- **Satzgrenze**: Zahlwörter eines Betrags enden an einer Satzgrenze („Ten and eighteen. Forty copper.“ ist 40, nicht 68;
  im Replay gefunden, Korpus b17-warrior#134).

## 2. Vollständige Geldübergaben (T109) und Zahlungsrichtung (T50)

- `coinEvidence`: Eine Ergänzung derselben Übergabe wird ausgewertet oder als unvollständig markiert: „then a fourth
  added“ (Ordinal = Anzahl + 1) → 4; „then two more“ → +2; „and another“ → +1; „a few/some more“ → `complete:false`
  (Geschenk wird abgewiesen, keine stille Teilzahlung). Eine spätere sachfremde Zahl („the fourth stall“) ändert nichts.
- `guardCommands` (Agency, zwischen Planner und Commands): `pay` bewegt eigenes Geld und braucht eine erkennbare
  freiwillige Zahlungsabsicht – im Zitat (pay/give/hand/put/slide/press/tip/settle/leave/…, „here are“, „take these
  coins“) oder, wenn das Zitat dem PC nichts beansprucht, im übrigen Beitrag. „pay me“, „pay up“, „give me“, „owe me“,
  „I'll take/collect … copper/wages“ zahlen niemanden (`not_paying`). Kein Wortfilter auf `take`: „Take these coins“
  zahlt. Keine Umwandlung in einen Geldgewinn; nur eine erzählte NPC-Übergabe zahlt über den bestehenden Weg.
- Planner-Vokabular `pay`: ein Satz und ein Negativbeispiel („I'll take that fifty copper now.“).

## 3. Klärung und Rückmeldungen

- Planner (`parsePlan`) liefert bei bekanntem Preiswiderspruch zusätzlich `tradeNote` (`priceConflictNote`); der
  bestehende sichere Klärungs-Fallback in `runtime.planMessage` zeigt dann den mechanischen Sachverhalt statt der
  allgemeinen Frage: „the smith's standing bid is 4 Copper for 14 × F-Rank Crystal Beetle Chitin Plate; you named 5 Silver
  6 Copper. Nothing changed hands. Accept the standing bid at its price, have it corrected, or deal with someone else?“
  Bei fehlender Ware/Person/Menge bleibt die allgemeine Rückfrage. Keine zusätzlichen Modellaufrufe, keine Ausführung.
- Geschenkablehnungen behaupten keine Zahlung mehr, die nicht nachgewiesen ist: „sale proceeds come only through an
  accepted bid; the sale credited here (…, 34 cp) is not paid again“ statt „these sale proceeds are already in his purse“
  (T32); ohne gebuchten Handel im Zug „the other side of a trade in this reply does not give him coin; a sale pays only
  through its accepted bid“ (T26). Regeln (`engine_booked`) und Ergebnis unverändert.

## 4. Verkauf bleibt Verkauf (Extractor)

`parseExtraction` meldet ein lokales semantisches Problem, wenn ein `coin.gift` eines NPC als Preis für Waren des PC
berichtet wird (Verkaufswort im `why`, keine Dank-/Trinkgeld-/Lohnangabe) und die genannten gehaltenen Waren von keinem
Gebot dieses Käufers in derselben Antwort gedeckt sind (oder `expected.sold:true` ohne jedes Gebot). Die bestehende
begrenzte Extractor-Reparatur fragt dann nach dem `bid`. Keine automatische Gift→Bid-Umwandlung, keine erfundenen
Mengen, kein zweites Ausführen; Nachzählungen (`repeat_of`) und eigenständige Dankeszahlungen bleiben unberührt; World
lehnt solche Geschenke wie bisher ab.

## 5. Nachweise

- **Rot/Grün** `tests/v4/fix138_finance.test.js` (16 Tests) mit Fixture `fixtures/batch20_finance138.json.gz`
  (Vorzustände aus den gespeicherten Events, aufgezeichnete Modellantworten): Originalrecords #106, #110, #116, #218,
  T50 (#99), T62-Klärung (#123), Kristall #52/#58/#64, #382; Kontrollen für Stückpreis+Summe, gleichwertige Währungen,
  Geldbestand, verschiedene Waren, Bedingungen, Paketpreis, gleichartige/ungleiche Stapel, eigene Zahlungen,
  Annahme 14/56 genau einmal, Doppelbuchungsschutz. **Auf .137: 15 rot, 1 grün** (Kontrolle #382 mit Gebot).
- **Volle Suite 2549/2549.**
- **Replay** `npm run replay:check`: 2235 Fälle, 196 abweichend, **alle 196 mit exaktem Fingerprint akzeptiert, 0 offen**.
  Neue Liste `tests/replay/accepted_f138_vs_126.json` übernimmt die 190 D-Einträge unverändert (Test) und ergänzt sechs
  einzeln begründete Records:
  - b17-warrior#134: Verkauf bucht die erzählten 40 cp statt 68 cp (Satzgrenze).
  - b19-mage#152: „Two shillings and four copper“ für zwei Waren: kein 4-cp-Schattengebot mehr, Gebot ungeklärt.
  - b17-warrior#73: „… totalling 3 cp, and pay Marta the 3 copper“ ist eine Summe zweimal; der Planner lehnt nicht mehr
    als mehrdeutig ab, die Commandschicht verweigert danach unter der bestehenden Auswahlregel (.134–.136). Weiterhin
    keine Buchung (vorher allgemeines Klärungspanel).
  - b18-rogue#196, b18-warrior#44: Verkaufserlös als `coin.gift` ohne Gebot (153 cp, 60 cp) – die bestehende Reparatur
    wird angefragt; im Replay fehlt eine aufgezeichnete Reparaturantwort, die erste Antwort gilt unverändert (gleiche
    Deltas und Ablehnungen, `extract.applied.repaired:true`).
  - b18-warrior#54: wahre Ablehnungsbegründung (nennt den tatsächlich gebuchten Verkauf), gleiches Ergebnis.
- Browser-Mock-Smoke OK; **echter ST-Smoke Standard 24/24, Failsoft 29/29**, keine PageErrors (ST 1.19.0, Mockprovider).
- Zusatzbefund Batch20: Record #382 (150 cp für 15 Platten und 4 Drüsen) war ein weiterer ungebuchter Verkauf derselben
  Art; der neue Extractor-Hinweis erfasst ihn.

## 6. Grenzen

- Die Zahlungsabsicht, die Zahlungsform-Bedingung und die Sammeleinheiten sind kurze geschlossene Wortgruppen; sie
  entscheiden nur, ob ein Betrag/eine Zahlung gilt, und erfinden nichts. Ungewöhnliche Formulierungen bleiben ungeklärt
  bzw. werden nicht gezahlt (sichtbar), statt still falsch gebucht.
- Einzelpreise verschiedener Waren ohne genannte Summe (Kristall T26: 24/6/4) bleiben ungeklärt; keine neue Pflicht,
  aber auch keine Addition in diesem Patch.
- Die Wirkung der Extractor-Reparatur ist nur am Hinweis und an Kontrollen geprüft; eine echte Reparaturantwort zeigt
  erst ein natürlicher Lauf. Mock-Smokes, kein natürlicher Batch.
