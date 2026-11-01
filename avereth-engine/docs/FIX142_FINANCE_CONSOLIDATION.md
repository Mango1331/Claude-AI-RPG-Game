# Fachpatch .142 – Finanzkonsolidierung

Build **`4.3.0-c.6.6.142`**, Basis `3d8f062` (.141). Verbindliche Grundlage: `patch_plans_10b/PATCH_PAYMENT_CONSOLIDATION.md`
(main `b547e55`), ergänzt durch `PAYMENT_SYSTEM_AUDIT.md` (insbesondere Sols Gegenreview §§12–13). Ein zusammenhängender
Architekturpatch: **Bedeutung** (Modellvertrag), **Beleg** (ein reiner Prüfer), **Verbindlichkeit** (gespeicherte `terms`)
und **Buchung** (bestehende Bucher) sind getrennt. Die Wort-/Regex-Leser von .138–.141 für Zahlungsrichtung und NPC-Preise
sind entfernt, nicht ergänzt. Bestehende Kauf-/Verkaufsfunktionen, Spielerfreiheit, Sofortgeschäfte und unabhängige
Geschenke bleiben; keine pauschale Bestätigungspflicht, keine Balance-, Preis- oder Narratorvertragsänderung.

## 1. Ursachen, die beseitigt sind

| Ursache (Audit) | Bisher | Jetzt |
|---|---|---|
| Richtung und Betrag einer Zahlung aus Verben + irgendeiner Zahl (`paysAct`, `actAmount`, `GIVE_VERB`-Katalog) | „I give Tam two plates for the fifty copper“ buchte −50 | Das Modell nennt das Geld der Handlung (`money`); ein enger Kern prüft, ob genau dieses Geld unmittelbar hinter dem Gebeverb steht |
| Fehlender Beleg → großzügigere Suche (`world.evidenced`: Zahl irgendwo in der Antwort, sonst die gemeldete) | erfundene Preise (Sol B/C/G, b19-warrior#78 „a modest few coppers“ → 3 cp) | kein Rückfall; fehlender Beleg = nicht belegt, für jeden frischen Erzeuger auf allen Pfaden |
| „bindend“ nur als Abwesenheit einer erkannten Bedingung | „pending the appraiser“, falsches `said` umgingen alles | `phase`/`condition` vom Modell, gespeichert als `terms`; ein enger Widerspruchscheck stuft nur herab |
| Preisbasis geraten (`tradePrice` NPC-Modus) | 4 statt 56, #380 abgewiesen | Modell nennt die Rolle (`pricing`: total/unit/positions), der Prüfer rechnet nur diese |
| Geschenk vs. Erlös über die Person (`counterparts`) | Dank neben Handel verloren, Erlöse über Schlüsselwörter | `relation` vom Modell + Prüfungen gegen gutgeschriebene Verkäufe und gehaltene Waren |

## 2. Modellvertrag (Bedeutung)

- **Kommandos `cmd-1.8`** (`content/commands.json`): `pay.money {quote, currency_quote}`, `pay.recipient_quote`,
  `pay.confirmation` (ID eines offenen Zahlungsvorschlags); `buy/sell/offer.accept.price_evidence {basis: total|unit, quote,
  currency_quote}`. Alle nullable; null heißt unbelegt, nie erfüllt (`interpret.js` Schema, `softMoney`).
- **Deltas `delta-1.13` / `extract-5.23`**: `bid` und jede `offer`-Zeile tragen `phase` (firm/conditional/unclear),
  `condition`, `pricing` (total/unit/positions/unknown); `coin.gift` trägt `phase` (transferred/promised/unclear),
  `relation` (independent/trade_settlement/recount/unclear), `money`. Formatregeln im Extractor-Prompt.
- **Fehlende Felder (§4.4)**: Frische Antworten ohne die neuen Felder werden auf unklar/null normalisiert und erhalten
  **einen** Hinweis an den bestehenden Repair (Extractor wie bisher; Planner und Interpreter neu als weicher Hinweis:
  `financeHints`). Bleibt die Information offen, gilt die erste gültige Antwort mit unbelegter Zahl; keine weitere
  Schleife, kein höheres Budget. Unabhängige Handlungen laufen weiter.

## 3. Ein Belegprüfer (`src/v4/finance_evidence.js`, neu)

Reine Funktionen ohne Zustand; Ergebnis immer `verified | missing | incomplete | contradicted` mit Quelle (rohe Offsets),
gemeldeter und abgeleiteter Zahl. Nur `verified` kann Geld bewegen.

- `findQuote`: Fundstelle auf normalisierter Sicht mit Rohoffsets, ganze Wörter; mehrdeutig bleibt mehrdeutig.
- `moneyLiteral`: vollständige Geldgruppe (`economy.coinEvidence`); Fortsetzung („and the silver“, „then a fourth“) →
  incomplete; Spanne/Schätzung („a copper or two“, „five or so“) → contradicted; Münzen verschiedener Art nur mit
  „and/plus“ verbunden sind eine Summe („eight copper and a single silver“ = 18); gleiche Art doppelt → contradicted;
  dieselben Geldworte mehrfach nur, wenn jede Stelle gleich liest; **nackte Zahl** nur mit `currency_quote` und genau
  einer Münzart im eigenen Satz oder in den eigenen Handelsworten des Deltas (`said`) – Brees „two“ + „silver“ = 20;
  `economy.numberRuns` zählt „twenty-four“ als eine Zahl.
- `priceEvidence`: total, unit (× Einheiten; mehrere Stapel nur bei `sameGoods`/`rateUnits`), positions (jede Zeile
  einmal). Ein Stückpreismarker direkt hinter dem Geld („each“, „apiece“, „per …“, „a night“, „a <Ware>“) macht `total`
  für mehr als eine Einheit widersprüchlich (Prüfgate 2: 4 ist nie der Lospreis von 14). „a fair deal“ ist kein Satz.
- `openConditionNear`: nur Herabstufung. Konnektoren noch offener Ereignisse (unless, pending, provided, assuming,
  subject to, as soon as, depending on, once/after/when + Subjekt ohne Vergangenheitsform, only if/for, approve…,
  tomorrow) im Preissatz und im Folgesatz, Letzterer nur ohne eigenen Preis. „The appraiser approved yesterday“, „she said
  when he caught her eye“, „if you would rather have coin“ binden.
- `payArgument`: Akt um das Geld: `outgoing` nur im engen Kern (pay/repay/tip/give/hand/toss/slide/press [+ over/back]
  [+ Empfänger] + Geld; „here's/take these“; Münzen auf Tresen/Tisch gelegt); Forderung → `claim`; anderer Empfänger oder
  anderer Betrag → `other`/contradicted; alles andere `unclear`.

## 4. Freie Zahlungen (`commands.js pay`, §5)

- **Bekannte Verpflichtung** (Angebot, Registrierung, Kauf/Service): bisheriges Routing; der Wille muss ausgehend sein.
  Eine Zahlung „für“ eine Ware geht als Kauf weiter; das belegte Geld ist dessen Limit (`price_evidence`), sonst keines.
- **Klare eigene Übergabe** (`verified` + `outgoing` + Betrag = Kommando): sofort gebucht, wie bisher.
- **Ungeklärt**: keine Abbuchung. Konkreter Vorschlag als `decision kind:payment, state needs_confirmation` (Empfänger,
  Betrag, Zweck, Börse vorher/nachher) bzw. `needs_amount`. Bestätigung nur per ID in der nächsten Nachricht; verfällt
  bei Forderung, späterer Nachricht, Orts- oder Empfängerwechsel, anderem Betrag/Zweck; gebucht genau einmal, mit
  Entscheidungs-ID in `transaction.completed`. Kein Pflichtzug für klare Zahlungen.
- Agency-Guard: nur noch die Forderung (`payArgument` → claim) wird verworfen; die alte Annahmelogik .138–.141 ist entfernt.

## 5. Angebote, Gebote, Handel (`world.js`, `trade.js`, `commands.js`)

- `dealTerms` speichert je Gebot bzw. Angebotszeile `terms` (firm/conditional/unverified), `condition` und kompakte
  `evidence` (Quellrecord, Hash, Spannen, Basis, abgeleiteter Betrag). Widersprüchliche Preisworte → nicht erfasst.
  Ein Umrechnungsfehler des Modells (Worte in Silber/Gold, „two silver, ten copper“ als 25) wird wie bisher auf die Worte
  korrigiert (`amount.corrected`); eine abweichende reine Kupfersumme (Kassenbestand, anderer Artikel) ist widersprüchlich.
- **Alle frischen Angebote** laufen über `dealTerms` – Planner-Pfad, V4-A und Ruleset 1. `evidenced` bleibt nur für den
  Legacy-Privatquest-Pfad (Questbelohnung, Legacy-Geschenk).
- `tradeTermsWhy` an allen Ausführungswegen: `offer.accept`, `buy`/`sell` mit Vorabzustimmung, `acceptBid`,
  `offerAvailability`, Katalog, **`bookPurchase`/`bookSale` unmittelbar vor den Buchungen**. Nicht bindende Zeilen bleiben
  sichtbar („NOT BINDING“), sind aber keine kaufbare Position; ein Spieler-„I accept“ macht sie nicht bindend.
- Ein unverifiziertes Gebot ersetzt nie ein festes; ein festes oder bedingtes ersetzt überlappende Lose wie bisher.
- Spielerlimits (`max_cp`/`min_cp`/`agreed_cp`) gelten nur so weit, wie seine Worte sie tragen (`provenNumber`).
- `tradePrice` liest nur noch seine eigenen Worte als blockierende Zustimmungsprüfung in `acceptanceWhy`; der NPC-Modus ist
  entfernt.

## 6. Eingehende Geldübergaben (`world.js giftFree`, §7)

Gebucht nur bei `phase:transferred`, `relation:independent`, `verified` Geld (gesucht zuerst in `said`), anwesendem Geber
und ohne Wiederholungsbezug. `recount`/`repeat_of` → nie wieder; `trade_settlement` → nur über das Geschäft; `promised`,
`unclear` → nichts; derselbe Handover zweimal im selben Reply → einmal (Spannen); Record-ID wie bisher über `said`.
Widerspruchsprüfungen trotz `independent`: ein `why`, das das Geld als Zahlung für einen hier gutgeschriebenen Verkauf
dieses Gebers nennt, oder als Preis für Waren, die Alaric noch hält (T26), ist kein Geschenk. `counterparts` (Person
allein) gilt nur noch im Legacy-Privatquest-Pfad; ein Dank des Handelspartners neben dem Geschäft zahlt.

## 7. Offengelegte Übersetzung alter Antworten (`tools/replay/contract_f.mjs`, neu)

Für Replay und Skripttests (§9.3). Alte Antworten bekommen die Bedeutung ihres alten Vertrags (gemeldetes Gebot/Angebot =
firm, `coin.gift` = transferred; neben einem Geschäft desselben Gebers `relation: unclear`, mit `repeat_of` `recount`),
Belege nur bei genau einer Lesart der aufgezeichneten Worte: Summe = Zahl, Einheit × Menge, ein eindeutiger
Münzeinheitenfehler, eine Silber-/Gold-Summe ohne weitere Preiszahl, oder eine nackte Zahl mit der einen Münze ihres
Satzes. Ohne `said` (im alten Vertrag nullable) wird – wie in der alten Engine – die Antwort gelesen, satz- bzw.
klauselweise; dieselben Worte für zwei Zeilen benennen keine. Keine Teilsummensuche. Planner-Antworten ebenso
(Spielernachricht als Quelle). Was nicht deterministisch rekonstruierbar ist, bleibt unbelegt und erscheint im Replay
(„Vertragsfall nicht abgedeckt“). Die Übersetzung ist **kein Beleg** für die Klassifikation frischer Antworten; die prüft
`fix142_finance.test.js` mit Antworten im neuen Vertrag. `contractValue/contractText` (Paket C) reichen den Antworttext durch.

## 8. Abnahme

**Rot/Grün** (`tests/v4/fix142_finance.test.js`, 21 Tests; nur Einstiegspunkte, die auch .141 hat: Guard →
`resolveCommands`, `applyWorld`): auf unverändertem .141 **3 grün / 18 rot**, auf .142 **21/21**.
- Rot mit tatsächlich falschen Events auf .141 (11): acht Gegenfälle −50 cp; Warenpreis −5; „three copper and the silver“
  −3 (Teilbetrag); Zahlung neben gleich hohem Angebot −50; 14×4 = 56 nicht gespeichert; T26-Positionen 34 abgewiesen;
  nackte Zahl mit fremder Kasse als 56 gespeichert; „pending the appraiser“ mit falschem firm bindend; Cash-Wahl ohne
  eigenen Preissatz abgewiesen; #380 (150) abgewiesen; Dank neben Handel desselben NPC abgewiesen (200 statt 205).
- Rot durch neuen Vertrag/Designänderung, kein Defektnachweis (7): Vorschlag statt Sofortzahlung außerhalb des Kerns,
  Bestätigungsprotokoll, Stückpreis über verschiedene Qualitäten (.141 nahm die genannte Summe), Antwort ohne neue Felder,
  #438 als bedingt gespeichert, `terms` im Fold, fehlendes Modul.
- Grün auf beiden (Positivkontrollen): Forderung + getrenntes Trinkgeld; klare eigene Zahlungen sofort; T109 = 4.

**Host-Integration** (`tests/v4/fix142_trade_host.test.js`, 4/4, Produkt-Hostpfad bis zum gespeicherten Record und
Reload per Fold): klare Transaktion; falscher pay-Bericht (kein Abgang, Entscheidung gespeichert); bedingtes Angebot
(„NOT AGREED … conditional“), später festes Angebot gekauft; Verkauf über Gebot + Dank daneben + erzählte Erlöse +
doppelte Annahme (+6 einmal, +1 Dank, Erlös und zweite Annahme nichts).

**Volle Node-Suite: 2580/2580 bestanden.**

**Angepasste ältere Tests** (keine pauschale Übernahme; Kommentar `Build .142` an jeder Stelle):
- Skriptantworten aus der Zeit vor dem Vertrag laufen über die offengelegte Übersetzung (`tests/v4/finance_legacy.js`,
  `harness.js`, `patch8_lib.js`, Wrapper in den bisherigen Dateien).
- Fixtures, deren Antwort den gemeldeten Preis gar nicht nennt, nennen ihn jetzt (c6651_lodging, c664, c665, patch81 –
  die Fackel war nicht im Text –, patch_run12_world, patch_run17, review_4_1, patch_batch101_trade); Limits ohne Münzwort
  („not under 20“) tragen es jetzt.
- Verhaltensänderungen mit Erwartung neu: Ruleset-1-Doppelzahlung ohne Betrag wird Vorschlag (patch_run15_trade);
  verblose Trinkgelder und „leave her five copper“ werden Vorschläge, verbale Formen zahlen sofort (patch_run15_trade,
  patch842); „i pay the copper“ ohne erfasstes Angebot wird Vorschlag (live_0930); „Supper's two more“ ist keine
  Preisangabe, die Zeilen-ID verschiebt sich (patch_prebatch99); Gold V12 t8: Bad „two more“ bleibt, „another copper“
  und „stew's two“ nicht (golden_v12, Gold-Datei unverändert); Ferry-Limit ohne Worte keine Vorabzustimmung
  (c6651_lodging); Geschenke in patch_batch14_integrity119/patch_free_help im neuen Vertrag geschrieben.
- fix138_finance: Originalketten über die Übersetzung; die Tests der entfernten Leser (`tradePrice`-NPC, `paysOut`) sind
  durch dieselben Phrasen gegen `priceEvidence/openConditionNear/payArgument` ersetzt.
- Vertragsversionen (patch9c_completion, fixes_4_1_5); P0-Spikes sprechen den aktuellen Vertrag (S1-Mock, S2-Gold für
  delta-1.13 statt der festen Version 1.12).

**Replay/Fingerprint** (`npm run replay:check`, neue Liste `tests/replay/accepted_f142_vs_126.json`): 2235 Fälle,
**394 abweichend, alle 394 mit exaktem Fingerabdruck akzeptiert, 0 offen, 0 veraltet**. Jeder Record wurde zusätzlich
gegen ein Replay von unverändertem .141 verglichen (die .141-Liste stimmt dort 198/198):
- 192 Records unterscheiden sich von .141 **nur** durch die Vertragsfelder der Übersetzung (154 neu als
  `finance 142 contract fields`, 38 frühere Einträge mit Vermerk `finance_142`); 55 frühere Einträge tragen insgesamt
  `supersedes` mit ihrem alten Fingerabdruck.
- 60 Records mit **Verhaltensänderung**, jeder mit eigener Begründung (`finance 142`): erzählerische Korrektur zu bereits
  abgewiesenen Geschenken/Nachzählungen (11); Erlöse neben Handel jetzt `coin_relation` (4); Repair-Hinweis ohne
  aufgezeichnete Repair-Antwort, erste Antwort gilt (6); Gear-Auditnotiz entfällt (5); nur Ablehnungstext (3); Textkorrektur
  „[object Object]“ (8); übrige 23 einzeln, darunter: Preise, deren Worte sie nicht
  tragen, nicht mehr erfasst (u. a. b19-warrior#78 erfundene 3 cp, b18-warrior#320 halber Lospreis, b19-mage#146
  „shillings“-Schattenpreis 4 cp, Folgesatz ohne Münze) – oder jetzt erfasst (b18-warrior#164 85 cp, #226 6 cp,
  b18-rogue#130 6 cp); .141 nicht ausgeführte Planner-Antworten laufen jetzt (b18-rogue#193/#341, b17-warrior#129/#267);
  b19-warrior#114 Schärfangebot „when it wants sharpening“
  unverbindlich; b17-rogue#26 (18 cp nur als Positionen 12+6, alte Antwort ohne Positionen: Vertragsfall nicht abgedeckt).
- b17-warrior#73 entspricht wieder der .126-Baseline (Klärungsanzeige wie im Originallauf) und ist als `returned` vermerkt.
- Die Übersetzung bleibt sichtbar: 4 aufgezeichnete Antworten bleiben ungenutzt, Repairs im Korpus Planner 26 → 29
  (von 688 Planner-Records), Extractor 72 → 90 (von 1030) – mit alten Antworten, denen die Felder fehlen.

**Smokes**: Browser-Mock-Smoke OK. **Echter ST-Smoke (SillyTavern 1.19, Mockprovider): Standard 24/24**, 18 Modellaufrufe
(6 Planner, 6 Erzähler, 6 Extractor; wie .140). **Failsoft**: erster Lauf alle 28 Fachprüfungen grün, aber ein Seitenfehler
aus SillyTavern selbst („AbortError: The user aborted a request. @ openai.js:4565“) → FAILED; Wiederholung **29/29 OK**,
24 Aufrufe (9/7/8; wie .140). Der Abbruch stammt aus STs eigenem Request-Abbruch im Failsoft-Szenario, nicht aus der Engine;
als einmaliger Befund festgehalten.

**Umfang**: Planner-Systemprompt 38 700 → 40 247 Zeichen (+4,0 %), Extractor-Systemprompt 43 197 → 45 735 (+5,9 %),
Delta-Schema +4,7 %, Kommando-Schema +10,6 %; Planner-Nutzernachricht unverändert. Ob frische Modellantworten mehr oder
weniger Repairs brauchen, zeigt erst ein natürlicher Lauf; die Korpuszahlen oben stammen aus alten Antworten.

## 9. Grenzen

- Ein konsistent falsch gesetzter Rahmen ist durch Fundstellenvergleich nicht ausschließbar (§5.2 „Wichtige Grenze“):
  ein falsches `relation: independent` ohne Warenbezug im `why`, oder ein falsches `phase: firm` bei einer
  Qualitätsbedingung wie #438 „if they're not burst“, bleiben Modellverantwortung.
- Herabstufungen können falsch positiv sein („when it wants sharpening“ ist ein späteres Angebot, korrekt unverbindlich;
  ein Folgesatz ohne Preis mit einem Konnektor kann ein festes Angebot unverbindlich machen) – nie umgekehrt.
- „another copper“ allein, „stew's two“ (Münze nur im Vorsatz) und Gratisangebote (0 cp ohne Geldworte) werden nicht als
  Preise erfasst; Formulierungen außerhalb des engen Zahlungskerns kosten einen Bestätigungszug.
- Natürliche Langläufe stehen aus (vereinbart: erst nach Sols unabhängigem Gegenreview).
