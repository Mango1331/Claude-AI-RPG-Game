# Avereth Engine – Tiefenaudit der Zahlungs- und Handelsarchitektur

**31.10.2026 · Claude · Analyse und Fachplan, keine Implementierung.** Prüfstand: Entwicklungsbranch
`claude/c-planner-prototype-2026-10-02-gpt-c666`, **Build `.141` / `3d8f062`** (vor Beginn erneut abgerufen). Grundlage: Produktcode
`.141`, Diffs `.137→.138→.139→.140→.141`, `avereth-engine/docs/FIX138_FINANCE.md`,
[Batch20-Review §§5, 7, 8](../testrun_10b/batch-20261031-140346Z/REVIEW.md), Sols Feedback zu `.141`, die Finanz-/Handelsregressionen
und die Originalrecords des Replay-Korpus (b16–b19, zehn Läufe) sowie Batch20-Warrior.

**Methode und Nachweisgrade.** Kein Produkt-, Test-, Prompt- oder Fingerprintstand wurde verändert. Keine Suite, kein Replay-Lauf,
kein Batch. Read-only: Code gelesen, einzelne Originalrecords mit ihrem gefalteten Vorzustand durch `applyWorld()`
beziehungsweise Guard → `resolveCommands()` geschickt, Korpus statistisch ausgewertet.

| Kürzel | Bedeutung |
|---|---|
| **[R]** | auf `.141` mit realem Vorzustand reproduziert (Engine-Events beobachtet) |
| **[C]** | am Code bestätigt (Datei/Funktion genannt) |
| **[D]** | aus gespeicherten Originalevents des Korpus gezählt (Ergebnis der jeweiligen Ursprungsbuilds) |
| **[P]** | plausibles künftiges Risiko, nicht reproduziert |

Zeilenangaben beziehen sich auf `3d8f062`.

---

## 0. Kurzfassung

1. **Die Buchungsfunktionen sind nicht das Problem.** `bookPurchase()`, `bookSale()`, `bidSale()` und `acceptBid()` prüfen
   gespeichertes Angebot, Zeilen, Mengen, Besitz, Anwesenheit, Preis und Geld atomar. Kein untersuchter Fehler entsteht dort.
   Die Fehler entstehen davor: **an den Stellen, an denen aus Text ein verbindlicher Betrag, eine Richtung oder eine Bindung wird.**
2. **Die Engine rekonstruiert Bedeutung, die die Modelle bereits strukturiert liefern.** Planner und Extractor legen Richtung
   (Kommando-/Deltatyp), Gegenpartei, Ware, Menge und Gesamtbetrag fest. Die Engine liest danach dieselbe Prosa erneut, an
   sieben Stellen mit eigenen Wortlisten, und versucht Rolle, Richtung, Stück-/Paketpreis und Bedingung selbst zu verstehen.
   Positive Wortlisten („diese Verben beweisen eine Zahlung“, „diese Muster sind ein Paketpreis“) sind in einer offenen
   Sprache prinzipiell unvollständig. Deshalb findet jeder Review neue Sätze.
3. **Fallbacks erhöhen die Verbindlichkeit.** `world.evidenced()` ersetzt ein fehlendes oder unpassendes Zitat durch eine
   Suche in der ganzen Antwort; nennt die Antwort gar keinen Betrag, bleibt die Extractor-Zahl stehen. Damit werden
   Bedingungsprüfung und alle Verbesserungen davor umgangen [R: Fälle B, C, D, G].
4. **Die Engine verwirft häufiger korrekte Modellwerte, als sie falsche abfängt.** Von 8 Preis-Ablehnungen realer Gebote im
   Korpus hatte der Extractor 6-mal den richtigen Betrag [D]. Darunter ist Batch20 **#380** („One hundred fifty copper —
   fifteen silver — for everything on the counter“), das auch auf `.141` abgelehnt wird [R]. Jede Fehlablehnung startet eine
   Kaskade: Der Erzähler erzählt den Verkauf trotzdem, der Extractor meldet ihn als `coin.gift`/`expected.sold`, beides wird
   zu Recht abgelehnt, und der Verkauf bleibt ungebucht (T58, #382).
5. **Ausgehende freie Zahlungen sind selten, aber dort sitzt das teuerste Risiko.** 13 `pay`-Kommandos im ganzen Korpus;
   2 davon falsch (T50 Richtung durch den Planner; Bree-Betrag durch die Engine selbst umgelenkt) [D]. Ein Sprachguard kann die
   Richtung grundsätzlich nicht zuverlässig beweisen: Sols acht Gegenfälle buchen auf `.141` −50 cp [R].
6. **Empfehlung (Variante C):** Die Modelle behalten die Bedeutung. Ein kleiner zentraler deterministischer **Finanzbeleg**
   prüft nur, was mechanisch prüfbar ist: Fundstelle, Betrag, Währungsrechnung, Stückzahl × Satz, Positionssumme.
   Er liefert einen **expliziten Unsicherheitszustand**. **Bindungsstufen** entscheiden, welcher Buchungsweg welchen Beleg
   braucht. Ein Fallback darf nie hochstufen. Ein einziges neues Vertragsfeld (`condition` an Gebot/Angebot) macht die Bindung
   ausdrücklich. Freie Zahlungen oberhalb einer kleinen Schwelle oder ohne Beleg gehen über eine Bestätigung, nicht über
   immer breitere Verblisten. Die positiven Wortlisten von `.139–.141` entfallen weitgehend.

---

## 1. Bestandsaufnahme

### 1.1 Alle Wege, auf denen Geld bewegt wird

| # | Weg | Auslöser | Code | Betrag stammt aus | Zustimmung | Gegenbuchung |
|---|---|---|---|---|---|---|
| O1 | Freie Zahlung `pay` | Planner-Kommando | `commands.js:896` `pay` → `coin.changed` | Planner `amount_cp` | Spielertext, geprüft durch `agency.guardCommands` | keine Ware |
| O2 | Annahme eines gespeicherten NPC-Angebots | `offer.accept` / `buy` / `pay`→Offer | `commands.js:1016`, `bookPurchase` `trade.js:326` | gespeichertes Angebot | Spielerkommando + `acceptanceWhy` | Ware/Service atomar |
| O3 | Vorab-Kaufzustimmung + Angebot in derselben Antwort | `buy{max_cp}` → `decision` | `world.js offer()` (~2627) → `bookPurchase` | **Extractor-Angebot** nach `evidenced` | Spieler-Limit `max_cp` | atomar |
| O4 | Kanonische Ware (Manuals) | `decision` | `world.js:2445 settleCanonicalPurchases` | Enginepreis | Limit | atomar |
| O5 | Zwang (Strafe, Raub) | Extractor `coerce` | `world.js:~2733` | Extractor, Hüllkurve `mayTake` | keine (Autorität/Feind) | – |
| I1 | Annahme eines gespeicherten Gebots | `offer.accept` / `sell`→Bid | `acceptBid` `commands.js:297` → `bookSale` `trade.js:395` | gespeichertes Gebot | Spielerkommando + `acceptanceWhy` | Ware atomar |
| I2 | Vorab-Verkaufszustimmung + Gebot in derselben Antwort | `sell{min_cp}` → `decision` | `world.js:2664 bid()` (explicitTravel) → `bookSale` | **Extractor-Gebot** nach `evidenced` | Spieler-Minimum `min_cp` | atomar |
| I3 | Geldgeschenk | Extractor `coin.gift` | `world.js:1323` | `coinEvidence(said)` (freier Modus); `evidenced` (Legacy privat) | keine nötig | – |
| I4 | Gilde, Privatjob, Beute | Engine | `guild.js:556`, `world.js:1712`, `loot.js:133` | Engine | Engine | – |

(`src/delta.js:712/820` ist der V3-Altpfad, hier nicht Gegenstand.)

### 1.2 Datenfluss und Autoritätsmatrix

| Stufe | Instanz | Liest freie Sprache? | Entscheidet Bedeutung? | Kann verbindlich machen? | Bekannter Informationsverlust |
|---|---|---|---|---|---|
| 1 Spielertext | Spieler/LLM | – | ja | – | – |
| 2 Planner | LLM | ja | **Richtung (Typ), Partei, Betrag, Zitat** | nein | keine Rolle des Betrags, keine Unsicherheit |
| 3 Planner-Validierung | `planner.parsePlan`, `interpret.amountErrors` (`interpret.js:203`), `acceptanceWhy` (`trade.js:81`) | **ja** (`tradePrice`, `paidAmounts`, `coinFromWords`) | **ja, ersetzt den Modellbetrag per Repair-Hinweis** | indirekt (lenkt Repair) | Bree: 20 → 30 [D, in `.140` behoben] |
| 4 Agency-Guard | `agency.guardCommands` (`agency.js:383`) mit `paysAct/actAmount/payEvidence` | **ja**, 8 Wortlisten | **ja** (Richtung, Rolle) | ja: ein behaltenes `pay` wird sofort gebucht | Rolle des Geldes im Satz |
| 5 Commands | `commands.js pay/offer.accept/buy/sell` | gering (`ROOM_WORDS`, `independentPayment`, `paymentFor`) | Routing Zahlung→Kauf | **ja (O1, O2, I1)** | – |
| 6 Erzähler | LLM | – | erzählt | nein | erzählt auch Abgelehntes weiter |
| 7 Extractor | LLM | ja | **Typ (bid/offer/gift), Partei, Ware, Menge, Gesamtpreis, `said`** | nein | **Bindung nur durch Weglassen ausdrückbar**; `said` = selbstgewählter Teilstring |
| 8 Parser/Semantik | `extract.parseExtraction`, `saleProceeds` (`extract.js:251`) | gering | Hinweise → bestehender Repair | nein | – |
| 9 Firewall | `firewall.js` | Muster | Eigentum/Engine-Fakten | blockiert | – |
| 10 World | `evidenced` (`world.js:2408`), `tradePrice{npc}` (`trade.js:186`), `openCondition` (`trade.js:154`), `coinRefusal` (`world.js:1891`) | **ja**, Regex + Fallback-Leiter | **ja** (Stück/Paket, Bedingung, Äquivalenz) | **ja (O3, I2 sofort; Speicherung für O2/I1)** | Teilzitat, ganze Antwort als Fallback |
| 11 Buchung | `bookPurchase`, `bookSale`, `bidSale`, `pay` | nein | nein | **ja – letzter Übergang** | keiner gefunden |
| 12 Events/Fold/Replay | `state.applyEvent`, `domain` credits | nein | nein | – | deterministisch, keine Befunde |

**Kernaussage:** Bedeutung wird an drei Stellen festgelegt: Modell, Validierung, World. Diese Stellen widersprechen sich. Die
autoritative Buchung (Stufe 11) übernimmt ungeprüft, was Stufe 4 oder 10 als verbindlich durchlässt.

### 1.3 Inventar der Sprachleser im Finanzbereich

| Funktion | Datei | Entscheidet | Seit |
|---|---|---|---|
| `coinEvidence` / `coinFromWords` / `coinMentions` | `economy.js:72/153` | Beträge, Währung, Vollständigkeit, Summen, Zuschlag („a fourth added“) | Patch 3, erweitert `.138` |
| `tradePrice` (+ `PER_THE`, Summenmarker, nackte Summen, Raten) | `trade.js:186` | Stück- vs. Paketpreis, Äquivalenz, Widerspruch | `.107`, stark erweitert `.138` |
| `openCondition` (+ `YOU`, `SPEAKER`, `PENDING`, `FURTHER`, `choicePart`) | `trade.js:154` | ob ein NPC-Preis bindet | `.138–.141` |
| `acceptanceWhy` / `selectionWhy` / `positionPrices` | `trade.js:81/57/37` | ob Spielerworte zu Angebot/Positionen passen | D (`.133–.136`), `.138` |
| `paysAct` / `actAmount` / `payEvidence` / `claimsOwn` (+ `PAY_VERB`, `GIVE_VERB`, `HANDING`, `COIN_WORDS`, `NUMBER`, `CLAIM`, `NOT_HIS`, `SPLIT`) | `agency.js:305–380` | Richtung und Betrag einer Zahlung | `.138–.141` |
| `amountErrors` | `interpret.js:203` | ob der Planner-Betrag zu „seinen Worten“ passt | `.107`, `.140` |
| `pay`-Routing (`ROOM_WORDS`, `independentPayment`, `paymentFor`, `settlingDebt`) | `commands.js:245–270, 896ff` | Zahlung = Kauf? | ältere Builds |
| `coinRefusal` (Schlüsselwortvergleich `paidSale`) | `world.js:1891` | Nachzählung vs. neue Zahlung | ältere Builds, Texte `.138` |
| `saleProceeds` | `extract.js:251` | Geschenk ist eigentlich Verkaufserlös | `.138` |

`.138–.141` haben in `src/` und `content/` netto **≈ 400 Zeilen** hinzugefügt (`.138` +205/−30, `.139` +71/−21, `.140` +97/−50,
`.141` +28/−24) [C], überwiegend in diesen Lesern.

### 1.4 Was nachweislich trägt (nicht ersetzen)

- **Buchung** `bookPurchase/bookSale/bidSale/acceptBid`: gespeichertes Angebot frisch nachgeschlagen, Auswahl/Preis erneut
  berechnet, Besitz und Stapelteilung geprüft, Zustimmung (`purchaseDecisionMatches`, `max_cp`) gegengeprüft, Ware und Geld
  in einem Schritt [C].
- **Gespeicherte Angebote werden bei Annahme nicht neu bepreist.** `bidSale` nimmt `offer.price_cp`, `pickLines` die
  Zeilenpreise; `acceptanceWhy` vergleicht nur die Spielerworte mit dem gespeicherten Preis [C]. Ausnahme ohne Geldwirkung:
  `rateUnits` liest bei Annahme die aktuellen Objekteigenschaften, um die Stückzahl für den Spielerwortvergleich zu bilden.
- **Firewall/Hüllkurve:** Eigentum des Spielers verlässt ihn nur durch eigenes Kommando oder legitimierten Zwang;
  Gildengeld nur durch die Engine [C, D: 7 korrekte Gilden-Ablehnungen].
- **Geschenk im freien Modus** (`world.js:1323`): Zitat muss in der Antwort stehen, ausdrücklicher vollständiger Betrag,
  keine Versprechen/Nachzählungen; Nachzählschutz über `repeat_of`, Geschenk-ID, `counterparts`, Credits [C, D: 13 korrekt
  abgewiesene Nachzählungen].
- **Replay/Fold:** Geld entsteht nur aus Events; Fingerprints zeigen deterministische Wiederholung [C].
- **Konkrete Klärung** bei Preiskonflikt (`priceConflictNote`, `.138`) und wahrheitsgemäße Ablehnungstexte (`.138`).
- **Währungsumrechnung durch die Engine:** 19 Angebote und 2 Gebote im Korpus hatten Extractor-Beträge ×10 zu hoch
  („2 silver“ → 200 cp); die Engine korrigierte mechanisch auf 20 [D]. Das ist erwünschte Arithmetik, keine Semantik.

---

## 2. Fehlerursachen

### W1 – Die Engine versteht Semantik selbst, statt Belege zu prüfen [C]
Die Modelle liefern Typ, Partei, Menge, Gesamtbetrag. Was fehlt, ist kein Verständnis, sondern **ein überprüfbarer
Zusammenhang** zwischen Zahl und Text. Statt diesen Zusammenhang arithmetisch zu prüfen, bestimmt die Engine Rolle und Bindung
neu: Ist „copper the plate“ ein Stückpreis? Ist „give … for fifty copper“ eine Zahlung? Ist „once the appraiser approves“ eine
Bedingung? Jede Antwort darauf ist eine Wortliste. **Positive Listen (Akzeptoren)** – „diese Verben/Marker beweisen X“ – sind
in offener Sprache unvollständig. Darum fand jeder Review neue Sätze (`.139`: `leave/put`, `.140`: `settle`, `.141`: Mengen,
`up`, verknüpfte Bedingungen; jetzt: Geld als Gegenwert, Belege, Einstecken, `once/pending/subject to`).

### W2 – Ergebnisformen ohne Unsicherheitszustand [C]
`tradePrice` liefert `{cp:null, handled:true}` (Widerspruch/offen) **oder** `{cp, handled:false}` (nicht zuständig) – der Aufrufer
fällt bei `handled:false` auf allgemeine Leser zurück. `actAmount` liefert `null` für „kein Betrag genannt“ **und** für „nicht
lesbar“; `payEvidence` lässt `null` als „passt“ durch (`agency.js:357ff`). `coinFromWords` liefert `null` sowohl ohne Betrag als
auch bei uneindeutiger Kurzform („two silver, one time“) [D: 31 reale Angebote landen so ohne Betrag]. **„Unbekannt“ und
„nicht vorhanden“ sind nicht unterscheidbar; der Aufrufer wählt dann die großzügige Deutung.**

### W3 – Die Fallback-Leiter erhöht Verbindlichkeit [C, R]
`world.evidenced` (`world.js:2408`):

1. `tradePrice(said)` – nur wenn das Zitat in der Antwort steht.
2. `coinFromWords(said)`.
3. Steht das Zitat **nicht** in der Antwort oder nennt es keinen Betrag: **ganze Antwort** – Betrag zählt, wenn er
   irgendwo als Münzbetrag **oder als beliebige Zahl** (`numbersIn`) vorkommt, oder **wenn die Antwort überhaupt keinen
   Münzbetrag nennt** (dann bleibt die Extractor-Zahl stehen).
4. „Eine Münzeinheit daneben“.

Stufe 3 ist für Geschenke im Legacy-Privatmodus entworfen („presses a few coins into his hand“). Für Gebote/Angebote macht
sie einen **unbelegten** Betrag verbindlich und übergeht `openCondition` vollständig.

### W4 – Teilzitat ist keine Vertragsaussage [C, R]
`said` ist der vom Extractor gewählte Teilstring. „Four copper each“ ist wortgetreu, die Bedingung steht direkt dahinter.
Die Schnittstelle kann die Bindung strukturell nicht übertragen: Der Extractor darf laut Regel bedingte Preise **nur weglassen**
(`extract.js:127–128`); meldet er sie trotzdem, gibt es kein Feld dafür.

### W5 – Engine überschreibt korrekte Modellwerte [D, R]
- **Preis-Ablehnungen realer Gebote: 8; davon 6 mit korrektem Extractorwert** (b18-warrior#164 Äquivalenz, Batch20 #52
  Positionssumme, #106, #110, **#380** ausdrückliche Gesamtsumme, #438 Positionsraten). `.138` behob #106/#110; **#380 und #52
  werden auch auf `.141` abgewiesen** [R für #380/#438].
- `amountErrors` erzwang für Bree 30 cp aus dem Besitz („three silver“) per Repair [D, `.140` behoben].
- b17-warrior#134: „Ten and eighteen. Forty copper.“ wurde bis `.137` als 68 gebucht (Zahlwörter über Satzgrenze) [D, `.138`
  behoben].

### W6 – Sofortbuchung nutzt dieselbe schwache Evidenz wie die Anzeige [C, R]
O3/I2 buchen in derselben Antwort, sobald ein Angebot/Gebot gespeichert wird und eine Vorabzustimmung passt. Die
Zustimmung begrenzt den Betrag (`max_cp`/`min_cp`), prüft aber weder Bindung noch Belegqualität [R: Fälle A–D, F, G].

### W7 – Kaskade aus Fehlablehnung [D]
Gebot abgelehnt → **keine Erzählerkorrektur für abgelehnte Gebote** (`world.js bid()` ruft nur `reject`, kein
`corrections.push`; Angebote haben „No price was recorded …“) [C] → Erzähler erzählt den Verkauf → Extractor meldet
`coin.gift`/`expected.sold` → korrekt abgelehnt → ungebuchter Verkauf, Wiederholungsschleifen. Belegt: T53/T55→T58 (7 Platten),
#380→#382 (150 cp). Korpus: 36 `coin.gift`, davon nur ≈3 echte Geschenke; 16 `expected.sold`, 14 abgelehnt [D].

### W8 – Planner-Richtungsfehler bei freien Zahlungen [D]
T50 „I'll take that fifty copper now“ → `pay 50`. Selten (1/13), aber der einzige Weg, auf dem der Spieler ohne gespeicherte
Verpflichtung Geld verliert. Im freien Modus gibt es keinen gespeicherten Lohnanspruch, gegen den die Richtung geprüft werden
könnte [C].

### W9 – Unabhängig: Zustimmungsgrenzen je Position (Planner) [R]
#381/#382: Der Planner schrieb „sell … for the 150 copper“ als `min_cp:150` an **beide** Positionen (Platten zusätzlich mit
Menge 1). Folge: Das korrekte Gebot hätte die Vorabzustimmung nicht erfüllt. Kein Geldverlust, aber Blockade.

### Warum `.139–.141` die Klasse nicht schließen
Alle drei Builds arbeiten in W1 und fügen **Akzeptoren** (neue Verben, neue Ausnahmen) und **Vetos** (neue Wörter) hinzu.
Akzeptoren lassen neue Fehlbuchungen zu, Vetos neue Fehlablehnungen. Gleichzeitig bleibt W3 offen, sodass ein unpassendes
oder leeres Zitat alle Verbesserungen umgeht. W2 sorgt dafür, dass jede Lücke still in die großzügige Richtung fällt.

---

## 3. Befundmatrix

| Fall | Eingabe / Antwort (gekürzt) | Ergebnis `.141` | Klasse | Ursache | Schwere | Heutiger Schutz | Nachweis |
|---|---|---|---|---|---|---|---|
| T50 | „I'll take that fifty copper now“ → `pay 50` | gesperrt (`not_paying`) | korrekte Sicherheitsablehnung | W8 | P1 (Klasse) | `CLAIM` | R |
| Sol 1 | „I give Tam two plates for the fifty copper.“ + falsches `pay 50`, 200 cp | **−50 cp** | unzulässige Fehlbuchung | W1/W8 | **P1** | keiner | R |
| Sol 2 | „I put the fifty copper in my purse.“ | **−50 cp** | Fehlbuchung | W1 | **P1** | keiner | R |
| Sol 3 | „Here's the receipt for fifty copper, Tam.“ | **−50 cp** | Fehlbuchung | W1 | **P1** | keiner | R |
| Bree | „I have three silver—I'll give two to Bree“ | 20 cp (`.140`) | vorher Engine-Fehlbuchung 30 | W5 | behoben | `paidAmounts` | D/R |
| A | Gebot `said:"Four copper each"`, Antwort „…, once the appraiser approves“, Verkaufszustimmung | **Gebot 56, +56 cp sofort** | Fehlbuchung | W4/W6 | **P1** | keiner | R |
| B | `said` nicht in Antwort, Antwort nennt keinen Betrag | **Gebot 56, +56 cp** | Fehlbuchung (erfundener Betrag) | W3 | **P1** | keiner | R |
| C | `said` ohne Betrag; „fifty-six nails“ irgendwo | **Gebot 56, +56 cp** | Fehlbuchung | W3 (`numbersIn`) | **P1** | keiner | R |
| D | `said` nicht in Antwort; Antwort „fifty-six copper, if the guild master signs it tomorrow“ | **Gebot 56, +56 cp** | Fehlbuchung trotz Bedingung | W3 | **P1** | keiner | R |
| F | Kauf mit `max_cp 10`; „Eight copper, once my apprentice finds one“ | **−8 cp, Kauf gebucht** | Fehlbuchung (im Limit) | W4/W6 | P2 | Spielerlimit | R |
| G | Kauf mit `max_cp 10`; Angebot 8, Antwort ohne jeden Betrag | **−8 cp** | Fehlbuchung (erfundener Preis, im Limit) | W3 | P2 | Spielerlimit | R |
| E/H | korrektes festes Gebot/Angebot | gebucht | korrekte Buchung | – | – | – | R |
| #380 | „Four copper a plate, sixty for the lot. The glands at twenty a sac, eighty. One hundred fifty copper — fifteen silver — for everything on the counter.“ Gebot 150 | **abgelehnt** | Fehlablehnung | W1/W5 | **P1 (Blockade, Kaskade)** | – | R |
| #382 | Verkauf erzählt, `coin.gift 150` | abgelehnt; `.138` fordert Repair | korrekte Ablehnung, Folgefehler | W7 | P2 | `saleProceeds` | D |
| #52 (T26) | Positionen 24/6/4, Gebot 34 | abgelehnt | Fehlablehnung | W1 | P2 | – | D |
| #438 | „two copper the plate. Venom glands three silver each, if they're not burst.“ Gebot 162 = 21×2+4×30 | abgelehnt (Betrag) | Ablehnung aus falschem Grund; Bedingung echt | W1 | P3 | – | R |
| b18-w#164 | „Eighty-five copper. Eight silver five if you want it in silver“ | Ursprungsbuild abgelehnt | Fehlablehnung (Äquivalenz) | W1 | P3 | `.138` sums | D |
| #106/#110/#116 | Batch20 Plattenschleife | 84/28/56 gespeichert | `.138` behoben | W1/W3 | behoben | – | R (`.138`) |
| #218 | „Three coppers, then a fourth added“ | 4 | `.138` behoben | W2 | behoben | `coinEvidence` | R |
| T58 7 Platten / Kristall | Verkauf als `coin.gift`/`expected.sold` | abgelehnt, Repair-Hinweis | korrekte Ablehnung | W7 | P2 | `saleProceeds` | D |
| T149 | falsche NPC-ID, Text „spoken“ | abgelehnt | korrekt, irreführende Meldung | – | P3 | – | R (Batch20 §7) |
| x10-Umrechnung | „2 silver“ als 200 cp gemeldet | auf 20 korrigiert | korrekte Engine-Korrektur | – | – | `coinFromWords` | D (21×) |
| Klärungen | Konsensfallback | 21 Rückfragen im Korpus, 13 davon Batch20 | teils Folge von W3/W5 | W5 | P2 | `priceConflictNote` | D |
| `if you can count them now` | harmloser Händlerzusatz | Gebot nicht bindend | Fehlablehnung | W1 (`PENDING`) | P3 | – | R (Review `.141`) |

---

## 4. Korpusdaten (b16–b19 zehn Läufe + Batch20-Warrior, ≈2 900 Records) [D]

| Größe | Wert |
|---|---|
| Planner-Kommandos `pay / buy / sell / offer.accept` | 13 / 29 / 102 / 80 |
| `pay` gebucht / abgelehnt / offen | 7 / 5 / 1 – **2 inhaltlich falsch** (T50, Bree) |
| `offer.accept` gebucht | 77 von 80 |
| Extractor `bid` / gespeichert | 53 / 27; Ablehnungen: Preisbeleg 8, Käufer nicht da 9, nicht sein Gegenstand 7, Szene 3, Rat Dritter 1 |
| Extractor `offer`-Zeilen / gespeicherte Angebote | 199 Zeilen / 120 Angebote; Preis-Ablehnung „price the reply does not name“ 10 |
| `coin.gift` gemeldet / gebucht | 36 / ≈3; Rest korrekt abgewiesen (Nachzählung 13, ohne Beleg 9, Gilde 7, Erlös 4) |
| `expected.sold` / abgewiesen | 16 / 14 |
| Konsens-Klärungen | 21 |
| `said` nicht wörtlich in der Antwort | Gebote 4/53 (davon 2 mit `…`-Auslassung), Geschenke 1/36, Angebote 0/194 |
| Bedingungswort im selben Satz außerhalb `said` | 25 Zeilen; ganz überwiegend harmlose Wahl („if you want“, „if you like“), vereinzelt echte (Behandlung bei Komplikation, Maßanfertigung „three days and eleven silver“) |

**Belegbarkeit realer Preise mit einer rein arithmetischen Prüfung** (Betrag im Zitat; Stückzahl × Satz; nackte Zahl mit der
einzigen Währung der Antwort; Summe genannter Positionsbeträge; ×10-Umrechnung): Angebote ≈ 90 % (171/189), Gebote ≈ 66 %
(35/53). Der Rest: Zahlen ohne Währungskontext, wirklich widersprüchliche Angaben, Extractorfehler (1234 cp).
**Folgerung:** Eine strenge Belegpflicht ist für Sofortbuchungen tragfähig. Würde ein fehlender Beleg das Angebot aber
**verwerfen**, entstünden viele neue Fehlablehnungen. Unbelegte Angebote müssen deshalb sichtbar, aber nur ausdrücklich annehmbar
bleiben.

---

## 5. Architekturvergleich

### A – Heutige Struktur konsolidieren
Parser/Guards vereinheitlichen, Fallbacks streichen, Listen bereinigen; Semantik bleibt in JS.
- **+** wenig Vertragsänderung, keine Promptänderung.
- **−** W1 bleibt: Richtung, Rolle und Bedingung weiter per Regex. Neue Formulierungen erzeugen weiter Fehlbuchungen oder
  Fehlablehnungen; der Review-Kreislauf geht weiter.

### B – Semantik vollständig strukturiert vom LLM
Neue Felder für Richtung, Betragsrolle, Bindung, Unsicherheit in Planner und Extractor; JS bucht, was strukturiert kommt.
- **+** Bedeutung dort, wo sie verstanden wird; einfache Engine.
- **−** Ein Feld macht das Modell nicht unfehlbar (T50 hätte `direction: out` bekommen). Mehr Prompt-/Schemaumfang,
  Migrations- und Replayaufwand. Ohne mechanische Gegenprüfung kein Schutz gegen erfundene Beträge.

### C – Begrenzte Kombination (empfohlen)
Modelle liefern Bedeutung inklusive **einer** fehlenden Information (Bindung). Ein kleiner zentraler **Finanzbeleg** prüft nur
Mechanisches: Fundstelle, Betrag, Währung, Arithmetik. Er liefert `belegt | unbelegt | widersprochen`. **Bindungsstufen**
regeln, welcher Buchungsweg welche Stufe braucht. Freie Zahlungen ohne Engine-Verpflichtung bekommen ab einer kleinen Schwelle
eine **Bestätigung**. Sprachlisten bleiben nur als **Vetos, die herabstufen**, nie als Akzeptoren.

### D – „Alles bestätigen“ (Variante, nicht empfohlen)
Jede neue Transaktion als Bestätigungspanel. Sicher, aber verletzt Spielerfreiheit/Kurzabläufe massiv (≈200 Handelsschritte im
Korpus).

| Kriterium | A | B | C | D |
|---|---|---|---|---|
| Schutz vor Fehlbuchungen | mittel (offenes Ende) | mittel (Modellfehler ungeprüft) | **hoch** (Arithmetik + Stufen + Bestätigung) | sehr hoch |
| Robustheit bei freier Sprache | niedrig | hoch | **hoch** | hoch |
| Unnötige Rückfragen/Schleifen | mittel–hoch (Fehlablehnungen) | niedrig | **niedrig** (nur unbelegt/groß) | sehr hoch |
| Wiederverwendung | hoch | mittel | **hoch** (Buchung, Decisions, Repair, Klärung bleiben) | hoch |
| Komplexität/Wartung | wächst | mittel | **sinkt** (Listen entfallen) | niedrig |
| Risiko neuer Fehlablehnungen | hoch | mittel | **niedrig** (unbelegt ≠ verworfen) | – |
| Prompt/Token/Repairs | 0 | + | **+1 Feld, weniger Repairs** | + Züge |
| Replay/Reload/Swipe | unverändert | Migration | **ein Eventfeld mit Altdefault** | unverändert |
| Erweiterbarkeit (Waren/Services/NPCs) | schlecht | gut | **gut** | gut |

---

## 6. Empfohlenes Zielbild (Variante C)

### 6.1 Grundsatz
**Das Modell entscheidet Bedeutung; die Engine prüft Beleg, Zustand und Zustimmung. Die Engine ersetzt nie eine Bedeutung,
nur Arithmetik** (Währungsumrechnung, Stück × Menge, Positionssumme). Ein schwächerer Beleg kann eine Buchung nur **verhindern
oder herabstufen**, nie ermöglichen.

### 6.2 Ein zentraler Finanzbeleg (Konsolidierung, kein neues Framework)
Eine Funktion (z. B. `financeEvidence(claim, cited, context)` in `trade.js` oder einem kleinen eigenen Modul), die alle
Betragsprüfungen ersetzt: `evidenced`, `tradePrice` (NPC-Seite), `paidAmounts/actAmount`, `amountErrors` (Betragsteil).

- **Eingabe:** behaupteter Betrag/Mengen (Modell), zitierte Worte, Quelltext (Antwort oder Spielertext), Zeilenmengen.
- **Fundstelle:** wörtlich; zusätzlich zulässig sind nur durch `…` getrennte Teilstücke in Reihenfolge (2 der 4 realen
  „nicht gefunden“-Gebote). Danach wird die Fundstelle mechanisch auf den **ganzen Satz** erweitert (für Anzeige, Audit, Veto).
- **Beträge:** `coinEvidence`-Summen (bleibt), nackte Zahlen im Zitat nur mit der **einzigen** Währung derselben Antwort.
- **Belegt**, wenn der Betrag gleich ist: einer genannten Summe, oder Satz × Stückzahl, oder der Summe aller genannten
  Positionsbeträge bei bekannten Zeilenmengen (keine beliebigen Teilmengen), oder einer reinen Umrechnung desselben genannten
  Betrags (dann **korrigiert**, wie heute bei ×10).
- **Widersprochen**, wenn das Zitat Beträge nennt, von denen keiner diese Rechnungen trägt und kein weiterer Betrag
  gleichwertig ist (Geldbestand, andere Ware).
- **Unbelegt**, wenn nicht gefunden oder ohne Betrag.
- **Kein** Lesen der übrigen Antwort, keine `numbersIn`-Treffer, keine Übernahme der Modellzahl mangels Gegenbeleg.

Damit entfallen Stück-/Paket-**Erkennung** per Regex (`PER_THE`, Summenmarker, nackte-Summe-Logik, Raten-Regex): Das Modell sagt
Menge und Gesamtbetrag, die Engine prüft nur, ob eine der zulässigen Rechnungen aufgeht. #106, #110, #116, #380, #52, #438
wären belegt (#438 dann über die Bedingung zu behandeln, s. 6.4).

### 6.3 Bindungsstufen und zulässige Wege

| Stufe gespeicherter Angebote/Gebote | Wann | Anzeige | Sofortbuchung unter Vorabzustimmung (O3/I2) | Ausdrückliche Annahme (O2/I1) |
|---|---|---|---|---|
| **fest** | belegt, `condition` null, kein Veto | normal | **ja** | ja |
| **zu bestätigen** | unbelegt, oder Veto (6.6) | „Preis nicht sicher belegt: X“ | nein | ja, **nur wenn der Spieler den Preis selbst nennt** (`agreed_cp` = gespeicherter Preis, belegt in seinen Worten) |
| **bedingt** | `condition` gesetzt | „bedingt: …“ | nein | nein; ein späteres festes Gebot/Angebot ersetzt es |
| **verworfen** | widersprochen | konkrete Erzählerkorrektur | – | – |

Die Stufe wird als Feld am `offer.created`-Event gespeichert (z. B. `terms: 'firm'|'confirm'|'conditional'`). Alte Events ohne
Feld gelten als `firm` (unverändertes Altverhalten, keine Umwertung archivierter Events). Engine-bepreiste Gear-/Gilden-/
Manual-Angebote bleiben `firm` (eigener, unveränderter Pfad).

### 6.4 Vertragsänderung Extractor (eine)
`bid` und jede `offer`-Zeile erhalten **`condition: string|null`**: „was noch geschehen muss, bevor dieser Preis bindet
(Zustimmung/Prüfung Dritter, Lieferung, späterer Zeitpunkt, Zustand der Ware); null, wenn nur Alarics Annahme fehlt“.

- **Aufgabe:** macht „bedingt“ ausdrückbar, statt es nur durch Weglassen zu kodieren (W4).
- **Validierung:** String, frei; die Engine wertet nur `null` vs. nicht `null` aus und zeigt den Text an.
- **Auswirkung:** `deltaVocab` → `delta-1.13`, eine Regelzeile statt der heutigen Halbsätze in `SALES`/`Trade evidence`;
  Replay-Konverter wie bei C/D setzt bei alten Antworten `condition: null`.
- **Keine** Felder `direction`/`amount_role`: Richtung ist durch den Typ kodiert (`bid` = er wird bezahlt, `offer` = er zahlt,
  `coin.gift` = er erhält); die Rollenfehler entstanden in der Engine (W5), nicht im Modell.

### 6.5 Ausgehende freie Zahlungen (`pay`)
- **Gebundene Zahlungen** (offenes Angebot, Kaufentscheidung, Gildengebühr, Zimmer) laufen wie heute über O2.
- **Freie Zahlung** (Trinkgeld, Geschenk, Entschädigung, Schuld): Betrag über den Finanzbeleg im Zitat; Ergebnis
  `belegt/unbelegt/widersprochen`.
  - **belegt, kein Veto, Betrag ≤ Schwelle** (Vorschlag: ≤ 10 cp) → sofort buchen (Trinkgeld bleibt ein Zug).
  - **sonst** → **Bestätigung** als offene Zahlungsentscheidung (bestehender `decision kind: 'payment'`): „Alaric würde Tam
    50 cp geben (Börse 200 → 150). Gilt das?“ Ein nächstes `pay` an dieselbe Person über denselben Betrag bucht; alles andere
    schließt die Entscheidung. Keine Schleife: die Entscheidung trägt Empfänger und Betrag.
  - **widersprochen** → nicht buchen, konkrete Rückmeldung.
- **Veto (herabstufend, nicht ablehnend):** nur `CLAIM` (Anspruch auf eigenes Geld) bleibt als kurze negative Liste;
  Treffer → Bestätigung statt Buchung.
- **Korpuswirkung:** Die Bestätigung hätte genau die beiden fehlerhaften Fälle T50 und Bree (30) erfasst. Von den elf übrigen
  `pay` sind sieben ≤ 6 cp, zwei Gildengebühren und einer ein Schwertkauf (gebunden, Weg O2); einer hatte keinen Betrag [D].
- `amountErrors` lenkt nie mehr auf einen engine-gelesenen Betrag um; es meldet nur „widersprochen“ (mit beiden Beträgen).

### 6.6 Bedingungen ohne Sprachrekonstruktion
- **Primär:** `condition` des Extractors.
- **Sicherheitsnetz nur für Sofortbuchungen:** Enthält der **ganze Satz** des Zitats ein Konditional-Bindewort (`if, unless,
  once, when, after, until, pending, provided, assuming, subject to, as soon as`) und meldet der Extractor `condition: null`,
  wird die Stufe auf **zu bestätigen** gesetzt: keine Sofortbuchung, aber ausdrücklich annehmbar. Ein Fehltreffer („if you
  want it“, „Registration's two silver, once“) kostet höchstens den Annahmeschritt, nie Geld.
- Sols Einwand gegen eine globale Wortsuche („approved yesterday“) trifft dieses Netz nicht: Es sucht Bindewörter im Preissatz
  und stuft nur herab.
- `openCondition`, `YOU`, `SPEAKER`, `PENDING`, `FURTHER`, `choicePart` entfallen.

### 6.7 Eingehendes Geld und Kaskaden
- `coin.gift` im freien Modus unverändert (streng, zitatgebunden). Legacy-Privatmodus: `evidenced`-Fallback für Löhne wird
  durch den Finanzbeleg ersetzt (Lohnhöhe ist ohnehin am Job gespeichert).
- `saleProceeds`-Hinweis bleibt.
- **Neu:** Für **verworfene oder bedingte Gebote** eine Erzählerkorrektur wie bei Angeboten („No bid was recorded … / The bid
  is conditional …; nothing was sold“). Das bricht W7 an der Quelle.
- Da unbelegte Gebote künftig als „zu bestätigen“ gespeichert statt verworfen werden, entfällt der Hauptauslöser der Kaskaden
  (#380, #52).

### 6.8 Was ausdrücklich gleich bleibt
`bookPurchase`, `bookSale`, `bidSale`, `acceptBid`, `pickLines`, `linePrice`, `selectionWhy`/`positionPrices` (Auswahl, D),
Zustimmungsentscheidungen, Firewall/Hüllkurve, Gildengeld, Beute, `coinEvidence`-Tokenizer inklusive `.138`-Verbesserungen
(Summen in fallender Einheit, Satzgrenze, „N silver and M“, Zuschlag), `priceConflictNote`, wahrheitsgemäße Ablehnungstexte,
`saleProceeds`, Replay/Fold.

---

## 7. Umsetzungsschnitt – ein zusammenhängender Finanzpatch

| Schritt | Inhalt | Abhängig von | Abnahme |
|---|---|---|---|
| F1 | Finanzbeleg (6.2) mit Tri-State; `coinEvidence` unverändert als Tokenizer | – | Einheitstabellen der Originalzitate; keine Prosa-Fallbacks |
| F2 | `world.evidenced` → F1; Prosa-Leiter für Gebote/Angebote entfernt; Umrechnungskorrektur bleibt | F1 | Fälle B, C, D, G nicht mehr gebucht; ×10-Fälle weiter korrigiert |
| F3 | `terms` am `offer.created`; Sofortbuchungswege (O3/I2) nur `firm`; Annahmeweg für `confirm` mit Preisnennung | F1, F2 | A, F nicht sofort gebucht; #380 gespeichert (`firm`), Annahme bucht 150 einmal |
| F4 | Extractor-Feld `condition`, `delta-1.13`, eine Regelzeile, Replay-Konverter (`condition:null` für Altantworten) | – | Schema/Repair unverändert stabil; Promptlänge +≈1 Zeile |
| F5 | Konditional-Bindewort-Netz für Sofortbuchung (6.6) | F3 | „once/pending/subject to“-Fälle nicht sofort gebucht, aber annehmbar |
| F6 | `pay`: F1 im Zitat, Schwelle, Bestätigungsentscheidung, `CLAIM` als Herabstufung; `amountErrors` ohne Umlenkung | F1 | Sols acht `pay`-Fälle: keine Buchung ohne Bestätigung; Trinkgeld ≤ Schwelle sofort |
| F7 | Erzählerkorrektur für verworfene/bedingte Gebote | F3 | Kaskade #380→#382 unterbrochen |
| F8 | Rückbau: `PAY_VERB/GIVE_VERB/HANDING/COIN_WORDS/NUMBER/NOT_HIS/SPLIT/acts`-Akzeptoren, `openCondition`-Familie, `tradePrice`-Paket-/Ratenerkennung für NPC-Worte | F1–F6 | Diff netto negativ in `agency.js`/`trade.js` |
| F9 | Doku, Build, Replay-Begründungen, ST-Smokes | alle | s. §8 |

Ein Build, eine Patchnote. Keine Zwischenveröffentlichung einzelner Schritte.

---

## 8. Regressionen und Abnahme

**Eigenschaften (gegen die Fehlerklasse, nicht gegen Einzelsätze):**
1. Ohne Beleg wird kein Betrag gebucht; ein Fallback stuft nie hoch.
2. Gegenstandsübergaben, Belege, Einstecken und Ansprüche erzeugen ohne Bestätigung keinen Geldabgang.
3. Beträge aus anderen Handlungen, aus dem Geldbestand oder aus anderen Waren legitimieren keine Transaktion.
4. Bedingte Preise werden nie sofort gebucht; feste, belegte Preise mit Vorabzustimmung schon.
5. Gespeicherte Angebote werden bei Annahme nicht neu bepreist; jede Annahme bucht höchstens einmal.
6. Unabhängige Geschenke neben Käufen/Verkäufen bleiben möglich; Nachzählungen zahlen nicht.

**Rot/Grün mit Originalvorzuständen:** Batch20 #99 (T50), #106, #110, #116, #218, #380/#382, #52, #438, Kristall #52/#58/#64;
Korpus b17-rogue#19 (Bree), b17-warrior#134, b18-warrior#164, b16-rogue-sale#78 (Auslassungszitat, 17 cp); synthetische Fälle
A–H dieses Audits und Sols acht `pay`-Sätze, jeweils über Guard → `resolveCommands` bzw. `applyWorld` bis zu den Events.

**Positive Kontrollen:** Trinkgeld 1 cp; „I pay her two silver“ an offenes Angebot; Gildengebühr; Zimmer; Bree 20 cp nach
Bestätigung; festes Gebot mit Vorabzustimmung bucht sofort; „Supper's two more if you want it“; Paket-/Stückpreise; Stapel 7+14;
×10-Korrektur; `.134–.136`-Auswahlfälle; Reload/Swipe/Replay einer bestätigten Zahlung.

**Replay:** erwartete begründete Änderungen nur bei Records, die heute über die Prosa-Leiter speichern oder buchen, bei
Fehlablehnungen mit korrektem Extractorwert und bei `pay` über der Schwelle. Jede Änderung einzeln begründen, keine pauschale
Neuerzeugung. **Danach** echte ST-Smokes Standard/Failsoft und ein kurzer natürlicher Handelsabschnitt (Freigabe durch Nutzer).

---

## 9. Wortlisten nach der strukturellen Korrektur

| Liste | Heute | Danach |
|---|---|---|
| `PAY_VERB`, `GIVE_VERB`, `HANDING`, `COIN_WORDS`, `NUMBER`, `NOT_HIS`, `SPLIT`/`acts` (`agency.js`) | Akzeptoren für Zahlungsrichtung | **entfallen** (Bestätigung statt Beweis) |
| `CLAIM` (`agency.js:316`) | Ablehnungsveto | **bleibt** als herabstufendes Veto |
| `YOU`, `SPEAKER`, `PENDING`, `FURTHER`, `choicePart`, `openCondition` (`trade.js`) | Bindungsentscheidung | **entfallen** (Feld `condition` + Bindewort-Netz) |
| `PER_THE`, Summenmarker, nackte Summen, Raten-Regex (`tradePrice`) | Stück/Paket-Erkennung | **entfallen** für NPC-Worte (Arithmetik); für Spielerworte in `acceptanceWhy` nur Betragsbeleg |
| Alternativen-/Spannen-Regex (`between … and`, `X or Y`) | Widerspruch | **bleibt** (mechanisch: zwei Beträge) |
| `coinEvidence`-Regeln (Kurzform, „N silver and M“, Zuschlag, Satzgrenze) | Tokenizer | **bleiben** (Arithmetik) |
| `ROOM_WORDS`, `independentPayment`, `paymentFor` (`commands.js`) | Routing Zahlung→Kauf | **bleiben** (nicht Teil der Fehlerklasse) |
| `saleProceeds`-Wörter, `coinRefusal`-Schlüsselwörter | Repair-Hinweis / Nachzählung | **bleiben** (lösen nur Repair/Ablehnung aus, nie Buchung) |
| Bindewort-Netz (6.6) | – | **neu, ≈11 Wörter, nur herabstufend** |

---

## 10. Ausdrückliche Nichtziele

Keine Änderung an Kampf, XP, PP, Progression, Welt, NPC-Memory, Population, Dungeons, Reisen. Keine Gearpreise, keine
Gilden-/Registrierungslogik, keine neue Wirtschaftsmechanik, kein Kredit-/Banksystem, kein Tausch, kein universeller Parser.
Keine zusätzlichen Pflicht-Modellaufrufe; Bestätigungen nur für freie Zahlungen über der Schwelle oder ohne Beleg sowie für
die Annahme unbelegter Preise. Keine Umwertung archivierter Events. Buchungsfunktionen bleiben.

---

## 11. Offene Entscheidungen für die Freigabe

1. **Schwelle** für sofortige freie Zahlungen (Vorschlag ≤ 10 cp; Alternative: ≤ 10 % der Börse).
2. **Bedingte Angebote:** gar nicht annehmbar (Vorschlag) oder annehmbar mit Bestätigung.
3. **„Zu bestätigen“ speichern oder verwerfen:** Vorschlag speichern; Verwerfen würde laut Korpus ≈ 10 % der Angebote und
   ≈ 34 % der Gebote blockieren.
4. **Itemisierte Positionssumme** als Beleg zulassen (Vorschlag ja, nur Gesamtsumme aller genannten Positionen).
5. **W9** (Planner schreibt Losgrenze an jede Position) im selben Patch als Zustimmungsfix oder getrennt.

**Unsicherheiten dieses Audits:** Die Korpuszahlen stammen aus den Events der jeweiligen Ursprungsbuilds. Die
Belegbarkeitsquote wurde mit einem vereinfachten Klassifikator geschätzt, nicht mit dem künftigen Code. Natürliche Häufigkeit
echter Drittbedingungen ist im Korpus gering; die schweren Bedingungsfälle sind konstruiert, aber über reale Vorzustände
reproduziert. Die Positionssummen-Schätzung in §4 ließ beliebige Teilmengen genannter Beträge zu; die hier empfohlene strengere
Regel (Summe aller genannten Positionen) kann für Gebote niedriger liegen.
