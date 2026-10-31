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

## 7. Reviewkorrektur `.139` (unabhängiges Feedback zu `c3fa856`)

Build **`4.3.0-c.6.6.139`**, selber Fachpatch, kein neuer Umfang. Drei Befunde geprüft und reproduziert:

- **P1 Zahlungs-Guard bestätigt:** „I'll take my fifty copper and leave.“, „Pay me fifty copper, then I leave.“, „I collect my
  wages and put the receipt in my bag.“ passierten den Guard (`leave`/`put` galten als Zahlungsabsicht) und hätten mit 200 cp
  50 cp abgebucht. Korrektur: Der Beleg wird je Handlung (Satz, Teilsatz, „and/then/but“ vor einer neuen Handlung) gelesen.
  Zahlungsverben (`pay/tip/settle/repay`) zählen selbst; jedes andere Gebeverb nur mit dem bewegten Geld (Münzwort danach,
  oder eine Zahl danach, wenn die Handlung Münzen nennt: „I have three silver—I'll give two to Bree“). Eine Handlung, die
  Geld für ihn beansprucht, zählt nicht; eine zahlende Handlung, die eine **andere anwesende Person** nennt oder einen
  **anderen Betrag** als das Kommando, belegt dieses Kommando nicht. Damit bleibt „Lohn verlangen und dem Jungen einen
  Kupfer geben“ als eigenes Trinkgeld möglich, trägt aber keine falsche Zahlung an den Auftraggeber. „Take these coins“ ist
  Übergabe, „I'll take that fifty copper“ Anspruch. `guardContext` liefert dafür die Währung.
- **P1 Bedingungen bestätigt:** „Four copper each, fifty-six copper total, if the appraiser approves.“ und „… if you want cash
  and the appraiser approves.“ ergaben verbindliche 56 cp (Gesamtsumme vor der Bedingungsprüfung; Zahlungsform-Ausnahme zu
  weit). Korrektur: Die Bedingungsprüfung gilt jetzt vor Gesamtsumme und Stückpreis gleichermaßen (ab dem ersten Münzwort).
  Offen bleibt der Preis bei `unless/depending/provided`, bei Bedingungen mit eigenem Betrag, bei Warten/Zustimmung/Prüfung
  (`wait/until/approve/check/inspect/appraise/confirm/clear`) und bei jedem Teil, dessen Subjekt nicht der Angesprochene ist.
  Eine Bedingung, die nur die eigene Wahl des Angesprochenen ist („if you want the coin more than the credit“, „if you're
  leaving them together“, „a copper a bowl, if you're wanting it“), entscheidet dessen Annahme und lässt den Betrag stehen.
  Bedingungen vor dem ersten Münzwort („If they're all of a match, I'd give you eight copper apiece“) werden wie vor .138
  nicht gelesen.
- **P2 #382 bestätigt:** Mit dem korrekten Gebot entsteht ein offenes Gebot über 150 cp, aber in dieser Antwort kein Verkauf,
  weil der Planner 150 cp als Mindestpreis an **beide** Positionen schrieb (zusammen 300; die Platten zudem mit Menge 1). Kein
  Geldverlust; Test umbenannt und erweitert: Gebot 150 cp, Geschenk zahlt nichts, **ausdrückliche Annahme zahlt genau einmal
  150 cp**, zweite Annahme nichts. Die Mindestpreis-Zuordnung des Planners bleibt außerhalb dieses Patchs.

Nachweise `.139`: neue Gegenfälle in `fix138_finance.test.js` (17 Tests; die Reviewfälle waren auf `c3fa856` reproduzierbar
falsch) inkl. World-Nachweis der Gutachterbedingung; **volle Suite 2550/2550**; Replay **2235 Fälle, 196 exakt akzeptiert,
0 offen**. Eine D-Abnahme ändert sich begründet: **b19-warrior#82** („A copper a bowl, if you're wanting it“) speichert jetzt
das Porridge-Angebot zu 1 cp statt es abzulehnen; der Eintrag trägt den neuen Fingerprint und `supersedes` mit dem alten
(Test prüft, dass dies die einzige Ersetzung ist). Während der Korrektur zeigte das Replay zwei Zwischenfehler, die vor dem
Abschluss behoben wurden (zu strenge Bedingungsregel: b17-warrior#68/#82, b18-rogue#92, b19-warrior#108; zu strenger Guard:
b17-rogue#19). Browser-Smoke OK; **echter ST-Smoke Standard 24/24, Failsoft 29/29**, keine PageErrors.

Beobachtung ohne Änderung: In b17-rogue#19 zahlt der Planner 30 cp für „I have three silver—I'll give two to Bree“; der
Guard prüft nur, dass die Handlung den Kommandobetrag nicht widerlegt (die Handlung nennt 3 Silber), nicht die
Plannerbetragswahl selbst.

## 8. Abschluss `.140` (zweites unabhängiges Feedback zu `5db8657`)

Build **`4.3.0-c.6.6.140`**. Alle drei Befunde reproduziert und an der Ursache korrigiert, ohne neue Mechanik:

- **Bree (Korpus b17-rogue#19) – Besitz ≠ Zahlung:** Der Planner lieferte richtig 20 cp; `amountErrors()` las „I have three
  silver“ als Betrag, erzwang per Repair 30 cp, die Engine buchte 30. Jetzt lesen Planner-Prüfung (`interpret.amountErrors`
  über `agency.paidAmounts`) und Guard denselben Betrag: den der **zahlenden Handlung**. Handlungen werden auch an
  Gedankenstrichen getrennt; eine bloße Zahl der Handlung („give two“) nimmt die eine Münzart ihres Satzes (20 cp). Zahlt die
  Handlung einen anderen Betrag oder eine andere Person, belegt keine lockerere Lesart desselben Textes das Kommando
  („other“). Der aufgezeichnete Lauf zahlt jetzt 20 cp ohne Repair; der alte Fingerprint (30 cp) ist gezielt ersetzt.
- **Mehrdeutige Verben:** Nur `pay/repay` sind Zahlungsverben (nicht in „pay attention/a visit/respects/heed/mind“). `settle`
  und `tip` zählen wie alle anderen Gebeverben nur mit bewegtem Geld in derselben Handlung („settle up“, „settle the bill“,
  „tip him five copper“); „I settle on the bench and collect my fifty copper“, „I tip my hat …“ zahlen nichts.
- **Bedingungen vollständig (nur für Gebote/Angebote anderer, `tradePrice(…, {npc:true})` in `world.evidenced`):** Geprüft wird
  jeder Satz des Preiszitats, auch vor dem Betrag („If the appraiser approves, four copper each …“) und über Kommas hinaus
  („…, if you want cash, and the appraiser approves“). Die Bedingung selbst bindet nur, wenn sie den Angesprochenen betrifft
  und nichts aussteht (kein `tomorrow/later/first/after/until/wait/finish/bring/return/approve/check/inspect/appraise/confirm/
  agree/allow/say/can/…`); „if you finish the work tomorrow“ bleibt offen. Mit „and/or/but“ angeschlossene weitere Teile
  setzen die Bedingung fort (eigenes Subjekt/Verb oder ausstehende Wörter → offen); ein Teil nach Komma/Strich ohne
  Konjunktion ist eine neue Aussage („two more if you want it — stew's on“). `unless/provided/depending/as long as` bleiben
  offen. Seine eigenen Worte (Kaufgrenze „if it's no more than 6 copper“, Annahme) behalten die Lesart von vor .138.
  Folge im Korpus: b19-mage#132 speichert die 12-cp-Variante „if it's gone deep enough …“ nicht mehr als verbindliches
  Angebot (Sachbedingung unbestätigt); die bedingungslose 8-cp-Leistung bleibt.

Nachweise `.140`: `fix138_finance.test.js` **18 Tests, auf `.139` 4 rot** (genau die Reviewfälle: Bedingungen, `settle`, Bree)
und 14 grün; Bree über `prepareGenerationAsync` mit den aufgezeichneten Plannerantworten (20 cp, kein Repair); Bedingungen
zusätzlich über `applyWorld` am Originalvorzustand #116. **Volle Suite 2551/2551.** Replay **2235 Fälle, 198 abweichend, alle
198 mit exaktem Fingerprint akzeptiert, 0 offen**; gegenüber `.139` zwei weitere einzeln begründete Records (b17-rogue#19,
b19-mage#132). Browser-Smoke OK; **echter ST-Smoke Standard 24/24, Failsoft 29/29**, keine PageErrors.

Grenzen: Die ausstehenden Wörter, die Zahlungsverb-Redewendungen und die Fortsetzungsregel sind kurze geschlossene
Gruppen. Sie entscheiden nur, ob ein Preis bindet oder eine Zahlung belegt ist; im Zweifel entsteht kein verbindlicher Preis
und keine Zahlung (sichtbare Ablehnung/Klärung), nie eine stille Buchung. Mehrere gleichzeitige Bedingungen in
Nominalform („if you want the plates and the gland“) gelten als erfüllt, solange nichts aussteht.


## 9. Gezielte Gegenreviewkorrektur .141

Build **`4.3.0-c.6.6.141`**, Basis `.140` / `c37a677`. Zwei weitere P1-Lücken gegen den unveränderten Stand reproduziert:

- **Gegenstände sind kein Zahlungsbeleg:** Bei einem falschen `pay` über 50 cp ließ der Guard „I give Tam two loaves and
  collect my fifty copper“ beziehungsweise „I put my hood up and collect my fifty copper“ durch; die echte
  Befehlsauflösung zog Geld ab. `paysAct` akzeptierte jede Zahl nach einem Gebeverb und `up` als allgemeines Geldwort.
  Jetzt darf eine bloße Zahl nur mit einem tatsächlich aufgelösten Geldbetrag die Münzart ihres Satzes übernehmen.
  Gegenstandsmengen liefern diesen Betrag nicht. `up` gilt nur innerhalb von `settle up`. Planner-Betragsprüfung und
  Zahlungs-Guard verwenden weiterhin denselben Betragsleser; Brees „three silver—I'll give two“ bleibt 20 cp.
- **Verknüpfte Angebotsbedingungen:** „if you want cash and I must obtain the appraiser's approval“ wurde durch die
  Sprecher-Ausnahme freigegeben; ein zweites `unless` im selben Satz wurde überhaupt nicht geprüft. Am Originalzustand
  #116 erzeugte das mit einer passenden Verkaufsentscheidung einen verbindlichen Preis und 56 cp Auszahlung.
  Jetzt werden sämtliche Bedingungsmarker des Satzes geprüft und ausstehende verknüpfte Voraussetzungen vor den
  Sprecher-/Betragsausnahmen ausgewertet. Die reine Zahlungsformwahl sowie „and I'll take all fourteen“ bleiben gültig.
  Spielerpreisgrenzen und getrennte Bemerkungen wie „— stew's on“ behalten ihre bisherige Lesart.

**Regressionen:** Zwei zusätzliche Testgruppen in `fix138_finance.test.js`: auf `.140` **18 grün / 2 rot**, nach der
Korrektur **20/20 grün**. Negative Fälle laufen durch Guard und echte Befehlsauflösung beziehungsweise `applyWorld`
mit dem aufgezeichneten Vorzustand #116; keine bloße Prüfung eines Hilfsvalidators. Gegenproben erhalten explizite
Geldübergabe, `settle up`, Brees verkürzte Münzangabe und gültige sofortige Angebotswahl.

**Abnahme:** Vollsuite **2553/2553**; Replay **2235 Fälle, 198 exakt akzeptierte Abweichungen, 0 offen**. Keine neue oder
geänderte Accepted-Ausnahme; Baseline und sämtliche Fingerprints bleiben unverändert. Browser-Mock-Smoke bestanden.
Echter ST-1.19-Smoke: **Standard 24/24** (6 Extractor-Aufrufe), **Failsoft 29/29** (8, einschließlich der absichtlich
fehlerhaften Antwort und Reparatur), keine PageErrors im erfolgreichen Lauf. Der erste Failsoft-Versuch erreichte
28/29: zwei `AbortReason`-Konsolenmeldungen aus STs Verbindungsstatusprüfung (`openai.js:4565`) ließen `noPageErrors`
scheitern; alle Funktionschecks waren grün. Kontrolllauf auf unverändertem `.140`: 29/29. Anschließende Wiederholung
auf `.141` ohne Produkt-/Teständerung: 29/29. Die anfängliche Hostbeobachtung ist damit dokumentiert, nicht ausgefiltert.

**Grenze:** Dies bleibt eine begrenzte deterministische Belegprüfung, kein allgemeines Sprachverständnis. Ungewöhnliche
Formulierungen können weiterhin eine Klärung erfordern. Keine neuen Events, Savefelder, Recovery-Budgets, Prompts oder
Spielregeln; keine Kartenaktualisierung erforderlich. Kein natürlicher GLM-Batch durch diesen Patch gestartet.
