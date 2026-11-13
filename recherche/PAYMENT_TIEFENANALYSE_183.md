# Avereth – Tiefenanalyse Payment- und Transaktionssystem nach dem Dreierbatch `.183`

**13.11.2026 · Claude · unabhängige Ursachenanalyse, keine Implementierung, keine Freigabe.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, HEAD [`efcad4c`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/efcad4c02f4d2a47ab5f777d6cf6581979e36e4e) (Build `.184`). Der Batch lief auf `.183` (`86465eb`). Zwischen `.183` und `.184` ändern sich nur `loot.js`, `delta.js` und `monsters.json`; der Zahlungscode ist identisch. `commands.js`, `trade.js`, `interpret.js`, `runtime.js`, `native_pay.js` und `display.js` sind seit `.179` unverändert. Zeilenangaben beziehen sich auf `efcad4c` in `avereth-engine/`.

**Quellen:**
- das vom Nutzer bereitgestellte Gegenreview-Paket `npc-batch-20261113-135417Z-CLAUDE-GEGENREVIEW.zip`; alle 32 Dateiprüfsummen aus `HASHES.json` und die drei `chat.jsonl`-Werte aus dem [Quellenmanifest](../testrun_10b/npc-20261113-135417Z/SOURCE_MANIFEST.md) stimmen;
- zum Vergleich die Originale von [Pilot 01 (`.174`)](../testrun_10b/npc-20261109-160250Z/REVIEW.md) und vom [Dreierbatch `.179`](../testrun_10b/npc-20261112-220625Z/REVIEW.md);
- [GPT-Review `.183` §4/§5](../testrun_10b/npc-20261113-135417Z/REVIEW.md), [Architekturaudit §13](ARCHITEKTUR_AUDIT_10B_FABLE.md), [Opus-Gegenreview §5](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) (P1a–P1f), [Zahlungsaudit `.141`](../patch_plans_10b/PAYMENT_SYSTEM_AUDIT.md), Patchnotes `.144` und `.180`.

**Nachweisgrade:** **[C]** am Code gelesen · **[D]** aus den Originalrecords · **[R]** reine Prüffunktion mit dem Originalwortlaut nachgerechnet (`payArgument`, `playerPrice`; kein Zustand, keine Events, keine Testsuite) · **[P]** aus Code und Daten abgeleitet, nicht ausgeführt.

**Nicht gemacht:** kein Fold, kein Replay, keine Node-Suite, kein ST-Lauf, kein Modellaufruf, keine Produktänderung. T-Nummern sind Spielereingaben.

---

## 1. Kurzurteil

1. **Das Geldbuch ist in allen geprüften Fällen richtig.** Kein Betrag wurde doppelt oder falsch gebucht. Die Buchungsfunktionen und die Schutzregeln für freie Zahlungen haben gehalten.
2. **Gebucht wird in natürlichen Läufen praktisch nur auf einem Weg:** Der Spieler nimmt ein bereits gespeichertes Angebot an (`offer.accept`), die Engine bucht vor der Erzählung. Über sieben natürliche Läufe (410 Eingaben) waren das 18 Buchungen. Alle anderen Wege sind gescheitert: **bedingter Kauf 0 von 8, `pay` 0 von 12, `#pay` 0-mal benutzt.**
3. **Mage T24 ist kein Erzählfehler.** Die Ergebniszeile der Engine für einen bedingten Kauf lautet: „when the seller names the price, he pays it and takes it“. Der Erzähler hat genau das getan. Gebucht wird erst danach und nur, wenn der Extractor in derselben Antwort ein bindendes Angebot meldet. Im Fall der Koje hat die Firewall dieses Angebot grundsätzlich abgelehnt.
4. **Rogue T39–T43 ist eine Kette aus fünf unabhängigen Lücken**, nicht ein Zahlungsverständnisproblem des Spielers: nicht gespeichertes Angebot, Kauf als freie Zahlung eingeordnet, **für den Spieler unsichtbare Zahlungskarte**, kein Wissen über die schon bezahlte Übernachtung in den Modellkontexten, Zahlungswille an einer Verbliste gescheitert. Die Extractor-Formatfehler haben den Lauf beendet, aber nicht verursacht.
5. **Ein Doppelabzug war möglich und ist nur zufällig ausgeblieben.** In T42/T43 hätte ein erkannter Zahlungswille einen bedingten Kauf über 7 cp für „stew, bread and room“ eröffnet; das Zimmer (3 cp) war seit T39 bezahlt. Es gibt keine Sperre dagegen.
6. **P1a–P1f sind alle noch offen und weiter gültig, hätten aber keinen der beiden Fälle behoben.** Sie betreffen die Belegprüfung des Planners. Die Fehler dieses Batches liegen im Ausführungsmodell, in der Anzeige und im Kontext.
7. **Empfehlung:** vier kleine, fachlich zusammenhängende Pakete (§6). Keine Lockerung von Zahlungsautorität, Firewall oder Schema; kein Umbau. Zwei Punkte brauchen eine Designentscheidung.

**Schweregrad:** P2 für Spielbarkeit und für die Designanforderung „offene Zahlung nicht als abgeschlossen erzählen“; P2 als latentes Integritätsrisiko (Doppelabzug). Keine eingetretene Fehlbuchung.

---

## 2. Rekonstruktion der Originalfälle

### 2.1 Rogue T36–T43 (Hearthstone)

| Zug | Spielereingabe (gekürzt) | Plan und Engine [D] | Erzählung und Extraktion [D] | Geld |
|---|---|---|---|---|
| **T36** | „… I'll take a room there and rest till morning.“ | `go` (neuer Ort) autorisiert; `buy` und `sleep` **„arrival pending“** | Erzähler erzählt Ankunft, Zahlung von 3 Kupfer, Nacht und Aufwachen. Extraktion scheitert an der Form | 87 |
| **T37** | „I walk to the Hearthstone, take a small room … and sleep …“ | wie T36 | Erzähler erzählt dasselbe erneut. Extraktion: Ankunft gebucht, Zimmerangebot 3 cp gespeichert, `overreach` gemeldet, +600 min. Korrektur: „… (He paid her the three coppers for the room); it did not happen.“ | 87 |
| **T38** | „… stew and bread for me too …“ | `buy` → „WANTS — no price is known“ | Wirtin: „Stew and bread, **four copper the pair** … your room's still three on the slate“. Extractor meldet nur `expected.1.priced: true`, **kein `offer`**. „NOT BOUGHT — no agreed price or price limit“ | 87 |
| **T39** | „A bowl of that stew and bread, then — four copper, and I'll settle the room with it too.“ | `offer.accept` Zimmer → **gebucht, −3 cp**, `service.granted lodging`. `buy` Eintopf mit belegtem `max_cp: 4` → **bedingt**: „BUYS … when the seller names the price, he pays it and takes it“ | Wirtin: „Four for the bowl and loaf, three for the room, so seven all told.“ Er zählt ihr das Geld hin, sie schöpft. Kein `offer` vom Extractor. „NOT BOUGHT — … no single valid canonical offer at the reached shop“ | **84** |
| **T40** | „I set four copper on the counter. "The stew and bread, at the four you named — that's my order."“ | `pay` 4 cp → **freie Zahlungskarte** `dec.pay.t38.1` | Wirtin: „Four for the bowl and loaf … You want the room settled too, that's another three on top.“ Angebot „settling for the room“ abgelehnt (`currency_missing`) | 84 |
| **T41** | „Settled, then — stew, bread, and the room, seven copper all told …“ | Karte verfällt. Planner: `buy "the room for the night"` → „WANTS — no price is known“ | Wirtin nennt sauber „four copper … three copper … Seven copper the lot“. Extraktion scheitert an der Form | 84 |
| **T42** | „… I count seven copper into her palm and take the bowl and bread.“ | `pay` 7 cp → „NOT PAID — confirm the purchase with the seller; no free payment was proposed.“ | Wirtin wiederholt die Rechnung. Extraktion scheitert | 84 |
| **T43** | „I count seven copper into the innkeeper's palm for the stew, bread and room …“ | wie T42 | wie T42; Runner bricht ab | 84 |

**Befunde zu dieser Kette:**

- **Die 3 cp wurden genau einmal gebucht (T39).** Der Spieler notiert trotzdem „Room charge was booked twice“: Für ihn war das Zimmer seit T36/T37 bezahlt, weil der Erzähler es zweimal so erzählt hatte.
- **Der Eintopf war nie buchbar.** In T38 nennt die Wirtin eine einwandfreie Endsumme mit Münzwort; der Extractor setzt nur `priced: true` und meldet kein Angebot. Eine Prüfung, die diesen Widerspruch bemerkt, gibt es nicht. In T39 und T40 fehlt dem Preis das Münzwort („Four for the bowl and loaf“); nach `.144` S2 bindet er dann nicht.
- **T39: Die Engine lässt die Zahlung erzählen.** Die Zeile für den bedingten Kauf (`commands.js:1141`) weist den Erzähler an, bei passendem Preis Zahlung und Übergabe zu zeigen. Gebucht wird erst in `offerLines` (`world.js:3111` ff.), wenn ein `offer` derselben Antwort passt. Kommt keines, bleibt die Erzählung „bezahlt und gegessen“, der Zustand „nicht gekauft“.
- **T40: Ein Kauf wird zur freien Zahlung.** `pay` ordnet nach einer Leiter ein (`commands.js:1045`–`1123`): Gebühr, Kauf, offenes Angebot, sonst freie Zahlung. Als Kauf gilt eine Zahlung nur, wenn `for`/`quote` ein Wort aus `ROOM_WORDS` oder „buy/purchase/offered/quoted“ enthält oder eine offene Kaufentscheidung bzw. ein Angebot passt. „that's my order“ fällt durch; die Kaufentscheidung aus T39 war am Antwortende verfallen (`world.js:1788`). Ergebnis: Karte für Trinkgeld, Gabe oder Schuld.
- **T40/T41: Die Karte ist für den Spieler unsichtbar.** Das Panel zeigt nur `UNDERSTOOD — "I set four copper …" → pay (open: payment_unconfirmed)`. Karten-ID und `#pay` stehen ausschließlich in der Ergebniszeile für den Erzähler. Im Bildschirmtext, den der Spieler in T41 sieht, kommt „#pay“ nicht vor [D]. `display.js` rendert keine Zahlungskarte [C]; der Host-Test zu `.144` prüft die „sichtbare Karte“ an `outcome.actions`, nicht am Panel (`tests/v4/fix144_host.test.js:41`).
- **T41: Die Karte lenkt den Planner um.** Er sieht sie als OPEN DECISION („no command pays or confirms it“) und weicht aus: „The card blocks the 4 cp … buy room“. So entsteht ein Kaufwunsch für das bereits bezahlte Zimmer.
- **T40–T43: Niemand weiß, dass das Zimmer bezahlt ist.** `service.granted` landet in `state.services` (`domain.js:186`); verwendet wird das nur für die PULSE-Rastsicherheit (`pulse.js:105`). Weder Erzählerblock noch Planner- oder Extractor-Katalog nennen die bezahlte Übernachtung [D, Prompts T40–T42]. Die Wirtin verlangt die 3 cp deshalb viermal erneut.
- **T42/T43: Der Zahlungswille scheitert an der Verbliste.** „room“ führt in den Kaufzweig, der `will` verlangt (`commands.js:1103`). `payArgument` liefert für „I count seven copper into her palm“ den Betrag als geprüft, den Akt aber als `unclear` [R]. Die mit `.180` ergänzten Muster verlangen eine Ablagefläche (Theke, Tisch); eine Hand zählt nicht. Der erste Plan von T42 scheitert zusätzlich an `money_ambiguous` [R]: „seven copper“ steht zweimal, und die Empfängerprüfung macht die erste Fundstelle zu `other`.
- **Latenter Doppelabzug [P].** Wäre `will` erkannt worden, hätte `pay` einen `buy` mit `max_cp: 7` für „stew, bread and room“ eröffnet. Ein Angebot der Wirtin über beide Positionen passt darauf (`purchaseLines`), 7 ≤ 7: gebucht würden 7 cp, das Zimmer zum zweiten Mal. Verhindert haben das nur die Verbliste und die Extractor-Fehler.
- **Extractor T41–T43.** Die Antworten verlieren die Hülle: Antwortschlüssel `"1"`/`"2"` auf oberster Ebene, `offer` als Objekt statt als Meldung, eigene Feldnamen (`price`, `unit`, `phase`), einmal Markdown. Die Reparaturanfrage nennt nur die Verstöße, nicht das verlangte Gerüst. Das ist ein eigener Befund (§4 U6); er beendet den Lauf, erklärt aber T38–T40 nicht.

**Einordnung gegenüber GPT §4:** Die Trennung „3 cp gebucht, 4 cp offen, 7 cp falsch“ stimmt. Nicht richtig ist, dass der Spieler den Befehl „nicht verwendet“: Er konnte ihn nicht sehen. Und T40 war kein Trinkgeld, sondern ein Kauf, den die Engine mangels gespeichertem Angebot falsch einsortiert hat.

### 2.2 Mage T23–T25 (Koje im Gildenhaus)

| Zug | Geschehen [D] |
|---|---|
| **T23** | Der Erzähler lässt den älteren Schreiber eine Koje anbieten: „Bunk room's got three free. One copper …“. Der Extractor meldet das Angebot korrekt (1 cp, `said` mit Münzwort). **Die Firewall lehnt ab: `guild_canon_price`.** Eine Korrektur an den Erzähler entsteht nicht |
| **T24** | „I accept the bunk room at one copper … and ask the clerk to log me in for the night.“ Plan: `buy` mit belegtem `max_cp: 1` → **bedingt**; `sleep` → „room not booked … tell no night“. Erzähler: „One copper, then.“ Die Münze wechselt die Theke, Eintrag ins Buch, Führung zur Koje; keine Nacht. Extractor: `priced: true`, kein `offer`. „NOT BOUGHT — … no single valid canonical offer at the reached shop“ |
| **T25** | „… settle into a free bunk and sleep until morning.“ `sleep` → **gebucht**: 755 Minuten, volle Erholung. Geld unverändert |

**Warum der Erzähler die Zahlung als abgeschlossen zeigt:** Er folgt der Ergebniszeile. Sie sagt für den bedingten Kauf wörtlich, dass Alaric zahlt und nimmt, sobald der Verkäufer einen Preis im Limit nennt [C, `commands.js:1141`]. Der Preis kam („One copper, then.“), also erzählt er die Zahlung. Die Anweisung „tell no night“ hat er befolgt.

**Warum nicht gebucht wurde:** Das Angebot war nicht buchbar. `guild_canon_price` greift, wenn der Verkäufer eine Gildenperson ist und die Ware ein Wort aus `GUILD_CANON_ITEM` enthält (`firewall.js:34`, `:197`). Die Liste enthält `member\w*`; die Ware hieß „bunk … for traveling **members**“. Gemeint sind Registrierung, Plakette und Vertragsschein. Der Extractor hat das Angebot in T24 nicht wiederholt; er hätte dieselbe Ablehnung erhalten.

**Folge:** erzählt 1 cp bezahlt, gebucht 0 cp, geschlafen wurde trotzdem. Die Zimmerbindung des Schlafs gilt nur innerhalb derselben Nachricht (`roomSteps`, `commands.js:1620`).

### 2.3 Weitere Zahlungsfälle desselben Batches

- **Mage T7 – Registrierung scheitert erneut an der Belegprüfung.** „"I'd like to register, Marta." I count out two silver onto the counter.“ Plan richtig (`guild.register` + `pay` 20 cp, `recipient_quote: "Marta"`). Ergebnis „NOT REGISTERED“ und „he has not agreed to pay“. Ursache [R]: `payArgument` sucht den Empfänger nur im Satz des Geldes; „Marta“ steht im Satz davor, der Akt wird `other`. Ohne `recipient_quote` wäre er `outgoing`. `.180` hat für genau diese Fallklasse Muster ergänzt; die nächste natürliche Formulierung fällt wieder durch.
- **Mage T6:** nicht auffindbares Geldzitat (`no_action_anchor`) plus abgeschnittene Antworten → „NOT EXECUTED“, ganzer Zug verloren.
- **Mage T8:** Reparatur, weil `party_words: "Marta"` nicht zum Verkäufer „guild“ des Registrierungsangebots passt.
- **Rogue T24:** `sell` mit `min_cp` und dem Zitat „sixteen copper the lot“ (Nachricht: „sixteen copper for the lot“) → `quote_not_found`, Reparatur setzt Zahl und Beleg auf `null`; der Mindestpreis des Spielers ist weg.
- **Warrior T17, T30; Rogue T28:** Verkäufe über gespeicherte Gebote, sauber gebucht; die nacherzählte Münzübergabe wird korrekt als bereits gebucht abgelehnt.

---

## 3. Systematischer Befund über sieben natürliche Läufe

Gezählt aus Pilot 01 (`.174`), Dreierbatch `.179` und Dreierbatch `.183`: 410 Spielereingaben [D].

| Weg | Anzahl | gebucht |
|---|---:|---:|
| `offer.accept` auf ein gespeichertes Angebot oder Gebot | 24 | **18** (5 „not enough coin“, 1 ohne Auflösung) |
| `buy` bedingt („if the price is at most N“) | 8 | **0** |
| `buy` offen (`no_price`) / „arrival pending“ | 3 / 5 | 0 |
| `pay` | 12 | **0** (5 ohne Zahlungswillen, 2 `no_amount`, 2 `no_price`, 2 Karte, 1 Empfänger fehlt) |
| `#pay <id>` | 0 | – |
| `sell` direkt | 17 | 1 (8 `no_price`, 5 „arrival pending“, 2 nicht im Besitz, 1 Stückpreis) |

| Angebote und Gebote des Extractors | Anzahl |
|---|---:|
| gespeichert | 23 |
| abgelehnte Zeilen | 25 |
| davon Preis ohne Münzwort (`currency_missing`) | **10** |
| davon `scene_context` | 6 |
| davon zu Recht unverbindlich (bedingt, kein Betrag, mehrere Beträge, Käufer fehlt) | 8 |
| davon `guild_canon_price` | 1 |

| Erzählt, aber nicht gebucht | Anzahl |
|---|---:|
| Korrektur „NOT BOUGHT“ | 12 |
| Korrektur wegen erzählter Entscheidung (`overreach`) | 6 |

**Die acht bedingten Käufe:** Pilot T57 (Abendessen; Angebot blieb bedingt), `.179` Warrior T21/T22 (Ringpanzer; erst kein Angebot, dann Umpreisung über das Limit), Warrior T63 (Langschwert), Rogue T20/T21 (Zimmer), `.183` Rogue T39 (Eintopf), Mage T24 (Koje). In keinem Fall lag am Ende der Antwort ein gespeichertes, bindendes, passendes Angebot im Limit vor. Für fünf davon ist der Grund oben belegt; Warrior T63 und Rogue T20/T21 habe ich nicht einzeln nachvollzogen.

**Lesart:** Zuverlässig ist genau der Weg, auf dem die Engine vor der Erzählung entscheidet. Jeder Weg, der die Buchung von der Erzählung und ihrer Rückübersetzung abhängig macht, scheitert an mindestens einem von fünf Gliedern: Münzwort des Erzählers, Meldung des Extractors, Form der Meldung, Firewall, Zuordnung zur Entscheidung.

---

## 4. Gemeinsame Ursachen

| | Ursache | Belege |
|---|---|---|
| **U1** | **Der bedingte Kauf lässt erzählen, bevor gebucht ist.** Die Engine erteilt dem Erzähler die Ausführung („he pays it and takes it“) und macht die Buchung von einer späteren Extractor-Meldung abhängig | `commands.js:1141`, `world.js:3111`–`3146`, `:1788`; Rogue T39, Mage T24; 0 von 8 |
| **U2** | **Das Angebot ist der einzige Träger des Preises, und es kommt oft nicht an.** Preis ohne Münzwort, ausgelassene Meldung, Formfehler, zu breite Kanonregel | 10 × `currency_missing`; Rogue T38 (`priced: true` ohne `offer`); Mage T23 (`member\w*`); Rogue T41–T43 |
| **U3** | **Zahlungswille und Kaufzweck werden aus Wortlisten gelesen.** `will` verlangt ein Übergabeverb unmittelbar vor dem Geld oder eine Ablagefläche danach, den Empfänger im selben Satz; „Kauf“ verlangt bestimmte Wörter | `finance_evidence.js:223`–`226` und `payArgument`; `commands.js:62`, `:1098`–`1103`; Mage T7, Rogue T40, T42, T43 [R]; `.179` Warrior T5, Rogue T5 |
| **U4** | **Bezahltes ist für die Modelle nicht sichtbar, und nichts sperrt eine Wiederholung.** Nach dem Buchungszug gibt es keine Zeile „bezahlt“ in Erzählerblock und Katalogen | `domain.js:186`, `pulse.js:105`; Prompts Rogue T40–T42; Planner T41 |
| **U5** | **Die Zahlungskarte erreicht den Spieler nicht.** Sie steht nur im Erzählerprompt und im Planner-Katalog | `display.js` (`commandLines`), `catalog.js:210`; Bildschirmtext Rogue T41 |
| **U6** | **Meldungen nennen den falschen oder keinen Grund.** „no single valid canonical offer at the reached shop“ stammt aus dem Pfad für Gildenhandbücher (`world.js:2923`) und erscheint bei jedem gescheiterten bedingten Kauf. „confirm the purchase with the seller“ nach einer ausdrücklichen Zahlung. Die Extractor-Reparatur nennt die Hülle nicht | `world.js:1785`, `commands.js:1103`; 12 × „NOT BOUGHT“ |

U1, U2 und U3 sind die Zahlungsform der Ursachen U1–U3 aus dem [Architekturaudit §4](ARCHITEKTUR_AUDIT_10B_FABLE.md): Entscheidung nach der Erzählung, zwei Schreiber für eine Tatsache, positive Wortlisten. U4 und U5 sind neu und zahlungsspezifisch.

**Abgrenzung – was richtig gearbeitet hat:**
- **`.144` S1 (freie Zahlung nur per Karte):** hat in T40–T43 jede Buchung aus Prosa verhindert, auch die falschen 7 cp. Die Regel ist richtig; ihr fehlt die Anzeige.
- **`.144` S2 (Endsumme mit eigenem Münzwort):** Die zehn Ablehnungen sind regelgerecht. Das Problem ist, dass der Erzähler die Regel erst nach dem Fehlschlag erfährt.
- **`overreach`:** hat die erzählte Zimmerzahlung in T37 erkannt; die Korrektur hat gewirkt (T38: „your room's still three on the slate“).
- **`coin_already_received` und `guild_payout`:** haben nacherzählte Verkaufserlöse korrekt nicht doppelt gebucht.
- **Planner:** In Rogue T39, T40, T42, T43 und Mage T7, T24 war der erste Plan fachlich richtig. Ein Planner-Fehler ist nur T41 (Kauf des Zimmers), und der folgt aus U4 und U5.
- **Modellverhalten, kein Enginefehler:** Der Erzähler erzählt in Rogue T36/T37 Zahlung und Nacht trotz „NOT DONE“; der Extractor lässt in T38 das Angebot aus und verliert in T41–T43 die Form.

---

## 5. Bewertung von P1a–P1f

Alle sechs sind am HEAD **nicht umgesetzt**; die betroffenen Dateien sind seit `.179` unverändert [C].

| | Inhalt (Opus §5.3) | Stand | Bewertung nach `.183` |
|---|---|---|---|
| **P1a** | Mehrfachzitat mit gleichem Betrag gilt bei `price_evidence` als belegt | offen; `playerPrice` liefert für den Pilotfall T55 weiter `quote_not_found` [R] | **gültig.** `.180` hat dasselbe nur für `pay.money` gebaut. Zu ergänzen: Dort macht die Empfängerprüfung je Fundstelle die Regel wieder unwirksam (Rogue T42) |
| **P1b** | Zielkauf nach `go` mit `provenNumber` | offen (`commands.js:1751`–`1754`) | **gültig**, kein natürlicher Fall in sieben Läufen. Wird mit Z2 (§6) teilweise gegenstandslos, bleibt als Autoritätslücke zu schließen |
| **P1c** | Rabattsperre fällt nur bei geprüftem Betrag | offen (`trade.js:114`) | **gültig**, kein natürlicher Fall |
| **P1d** | Gleichpreis-Ausnahme bei `offer.accept` | offen | **gültig, nachrangig.** Auf `.183` kein Fall; neu ist die verwandte Reparatur wegen `party_words` gegen den Verkäufer „guild“ (Mage T8) |
| **P1e** | Nicht auffindbarer Beleg an `max_cp`/`min_cp` ist Hinweis, kein Fehler | offen | **gültig und zu erweitern auf `pay.money`.** Rogue T24 verliert den Mindestpreis durch die Reparatur; Mage T6 verliert den ganzen Zug an `no_action_anchor` |
| **P1f** | Ausgabebudget der ersten Planner-Antwort | offen (`runtime.js:61`: 2000) | **gültig.** Auf `.183` 9 leere Planner-Antworten mit `finish_reason=length` in 152 Eingaben, davon 7 erste Antworten; Mage T6 geht dabei verloren |
| P1g | Befehlsgenaue Planerhaltung („weitere Daten nötig“) | offen | **jetzt belegt:** Mage T6 (Belegfehler am `pay` verwirft auch `guild.register`), zuvor Pilot T54. Hochstufen auf sinnvoll |

**Zu korrigieren ist die Erwartung an das Paket.** P1a–P1f verbessern die Belegprüfung zwischen Planner und Handler. Keiner der Punkte hätte Rogue T38–T43 oder Mage T24 behoben: Dort war der Plan richtig und der Beleg geprüft. Das P1-Paket ist deshalb weiter sinnvoll, aber nicht „der Zahlungsfix“.

**Zu `.180`:** Der Patch hat die beiden Originalfälle geschlossen, indem er die Verbmuster erweitert hat. Der im [Batchreview `.179` §8.4](../testrun_10b/npc-20261112-220625Z/REVIEW.md) vorgeschlagene strukturelle Weg wurde mit Verweis auf GPT §9 verworfen. Auf `.183` ist dieselbe Klasse in Mage T7 und Rogue T42/T43 mit drei neuen Formulierungen wieder aufgetreten. Das spricht dafür, die Frage neu zu entscheiden (§7 E-2).

---

## 6. Patchplan

Vier Pakete. Z1 und Z3 ändern keine Regel. Z2 und Z4 brauchen je eine Entscheidung. Reihenfolge nach Nutzen je Risiko.

### Z1 – Sichtbar und wahr (notwendig, klein)

**Z1.1 Zahlungskarte im Spielerpanel.** Eine offene Karte erscheint im System-Panel der Antwort: Empfänger, Zweck, Betrag, Börse vorher/nachher, „NOT PAID“ und die kopierbare Eingabe `#pay <id>`. Das ist die in `.144` beschriebene Karte; bisher fehlt nur die Anzeige.
- **Grenze:** keine Änderung an Kartenregeln, Gültigkeit oder `#pay`.
- **Rot:** Panel von Rogue T40 enthält weder ID noch `#pay`. **Grün:** beides steht im Panel. Gegenfall: nach Verfall keine Karte mehr.

**Z1.2 Bezahltes ist bekannt und wird nicht doppelt verkauft.**
- Erzählerblock und Planner-/Extractor-Katalog erhalten eine kurze Zeile zu gültigen gebuchten Diensten am Ort, zum Beispiel: „PAID HERE — small room for the night, 3 cp to the innkeeper: settled; it is not owed, quoted or charged again.“
- Sperre: Ein Kauf oder eine Annahme, die eine Übernachtung beim selben Anbieter am selben Ort umfasst, solange eine gebuchte dort gültig ist, wird nicht gebucht. Die Zeile nennt den Grund und, bei mehreren Positionen, den Rest.
- **Grenze:** nur `service: lodging`, selber Anbieter, selber Ort, dasselbe 24-Stunden-Fenster, das `pulse.js:105` schon benutzt. Eine ausdrücklich weitere Nacht bleibt möglich (§7 E-3).
- **Rot:** Planner T41 erhält keine Information und kauft das Zimmer erneut; konstruierter Folgefall „`buy` 7 cp für stew, bread and room, Angebot 4 + 3“ bucht 7. **Grün:** Zimmer nicht erneut gebucht, Eintopf 4 cp.

**Z1.3 Zutreffende Gründe.**
- Gescheiterter bedingter Kauf: der tatsächliche Grund statt „no single valid canonical offer at the reached shop“ (kein bindender Preis gemeldet / Preis ohne Münzwort / bedingt / über dem Limit).
- `pay` im Kaufzweig ohne erkannten Willen: sagen, was fehlt.
- Offene Kauf- und Verkaufsentscheidungen: Die Zeile verlangt vom Verkäufer **eine Endsumme mit Münzwort** („four copper“), bevor der Fehlschlag eintritt.
- **Rot/Grün:** Wortlaut der Zeilen in Rogue T38, T39, T42 und Mage T24.

### Z2 – Der bedingte Kauf erzählt keine Zahlung (notwendig; Entscheidung E-1)

**Änderung:** Die Zeile für `priced_within` erlaubt dem Erzähler, den Verkäufer die Endsumme nennen zu lassen, und verbietet Münzübergabe und Warenübergabe in dieser Antwort. Die Buchung am Antwortende bleibt wie heute (`offerLines`). Wurde gebucht, steht es sofort im Panel und als Tatsache im nächsten Engineblock, nach dem Muster von `paidCardFacts` (`native_pay.js`): „BOUGHT AFTER THE LAST REPLY — … it is done; show the hand-over, ask for nothing more.“ Wurde nicht gebucht, steht der Grund im Panel (Z1.3).

**Warum:** Nur so ist die Anforderung erfüllbar, dass der Erzähler eine offene Zahlung nicht als abgeschlossen zeigt. Heute verlangt die Engine das Gegenteil. Der Fehlerfall wird harmlos: Preis genannt, nichts gezahlt, Spieler kann annehmen.

**Grenzen:** Kaufautorität, Limitprüfung, `any_price`, Zustimmungsfenster und Buchungsfunktion bleiben. Dasselbe gilt sinngemäß für den bedingten Verkauf (`commands.js:1174`). P1b (Zielkauf) wird im selben Zug mit `provenNumber` geschlossen.

**Preis der Änderung:** Der erfolgreiche Fall braucht erzählerisch einen Takt länger; gebucht wird weiterhin im selben Zug.

**Rot:** Erzählerprompt von Mage T24 und Rogue T39 enthält „he pays it and takes it“. **Grün:** Prompt verbietet die Übergabe; eine dennoch erzählte Zahlung ist `overreach`. Gegenfälle: gespeichertes Angebot vorhanden → `buy` bucht wie heute vor der Erzählung; Preis über dem Limit → nicht gebucht.

### Z3 – Das Angebot kommt an (notwendig, klein; stärkt den funktionierenden Weg)

**Z3.1 Abgleich `priced` gegen `offer`.** Meldet der Extractor zu einem Kauf- oder Verkaufsschritt `priced: true`, aber kein `offer`/`bid` dieses Gegenübers, ist das ein Hinweis für die eine vorhandene Reparatur, wie bei `expected.arrived` ohne `arrive`.
- **Rot:** Rogue T38 und Mage T24 (Originalantworten) laufen ohne Rückfrage durch. **Grün:** eine Reparaturanfrage mit genau diesem Grund.

**Z3.2 Münzwort vorab.** Folgt aus Z1.3; zehn der 25 abgelehnten Angebotszeilen.

**Z3.3 `guild_canon_price` auf den Kanon begrenzen.** Die Regel gilt für Registrierung, Plakette, Vertragsschein und Rang, nicht für eine Dienstleistung `lodging` oder `meal`, die zufällig „members“ enthält.
- **Grenze:** keine andere Firewallregel; Registrierungsgebühr und Dokumente bleiben geschützt.
- **Rot:** Mage T23. **Grün:** Angebot gespeichert, T24 wird `offer.accept` über 1 cp. Gegenfälle: „registration fee“ und „Guild plate“ von einem Schreiber bleiben abgelehnt.

**Z3.4 Reparaturanfrage des Extractors nennt das Gerüst** (`scene`, `expected` mit den Schrittnummern, `deltas` als Liste). Optional dazu: Antwortschlüssel, die exakt erwartete Schrittnummern sind und auf oberster Ebene stehen, werden unter `expected` gelesen, als reine Form wie in `.182`.
- **Rot/Grün:** die sechs Originalantworten aus Rogue T41–T43.

### Z4 – Zahlungswille ohne Verbliste, wo die Engine den Preis kennt (notwendig; Entscheidung E-2)

**Änderung:** Für eine **von der Engine bepreiste, offene Verpflichtung** gilt ein `pay`-Befehl mit geprüftem Betrag in genau dieser Höhe als Zahlungswille. Das betrifft die Registrierungsgebühr bei offener Registrierung und ein offenes gespeichertes Angebot des Empfängers. Ein Übergabeverb ist dafür nicht nötig. Zusätzlich wird `recipient_quote` im Zitat des Befehls gesucht, nicht nur im Satz des Geldes.

**Was bleibt:** Für freie Zahlungen bleibt `payArgument` unverändert; dort entscheidet ohnehin `#pay`. Forderungen (`claim`), fremde Empfänger, falscher Betrag (Regel aus 8.4.2) und Fragen bleiben gesperrt. Ob ein Satz eine Frage ist, entscheidet wie heute die Agency-Guard, nicht die Verbliste.

**Grenze:** kein Kauf ohne gespeichertes Angebot über diesen Weg; dafür gilt Z2.

**Rot:** Mage T7, Rogue T42 (erster Plan), `.179` Warrior T5 und Rogue T5 im Original gegen `.179`-Stand der Muster. **Grün:** je eine Buchung. Gegenfälle: „Two silver, was it?“ ohne Übergabe; „one silver“ für die Gebühr; „Hobb still owes me two silver“; Trinkgeld neben offener Registrierung (B15).

### Z5 – P1-Paket (sinnvoll, unverändert gültig)

P1a, P1b (mit Z2), P1c und P1e (auf `pay.money` erweitert) als kleiner Belegpatch; P1f als Konfigurationsprobe mit Vorher/Nachher der `finish`-Gründe; P1g und P1d danach. Bedingungen aus [Architekturaudit §13.6](ARCHITEKTUR_AUDIT_10B_FABLE.md) und [Opus §5.3](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) gelten weiter.

### Reihenfolge und Abhängigkeiten

1. **Z1** (Anzeige, Gedächtnis, Texte): unabhängig, kein Regelrisiko, schließt den latenten Doppelabzug.
2. **Z3** (Angebot kommt an): unabhängig; erhöht die Quote des einzigen funktionierenden Wegs.
3. **Z2** nach E-1, **Z4** nach E-2.
4. **Z5** danach oder parallel zu Z3.

Abnahme je Paket wie in [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md): Originalfälle rot/grün, angrenzende Finanzsuiten, Vollsuite, Replay; ST-Smoke bei Z1.1 (Panel) und Z2 (Erzählervorgabe). Danach ein natürlicher Lauf mit Gasthaus- und Händlerszenen; zu messen sind die Zeilen der Tabelle in §3.

---

## 7. Notwendig, optional, nicht empfohlen; offene Entscheidungen

| Einstufung | Maßnahme |
|---|---|
| **Notwendig** | Z1.1 Karte im Panel · Z1.2 Bezahltes bekannt und gesperrt · Z1.3 zutreffende Gründe · Z2 bedingter Kauf ohne erzählte Zahlung · Z3.1 Abgleich `priced`/`offer` · Z4 Zahlungswille bei bekanntem Enginepreis · aus Z5: P1a, P1b, P1c |
| **Sinnvoll** | Z3.3 Kanonregel begrenzen · Z3.4 Gerüst in der Reparaturanfrage · P1e (mit `pay.money`) · P1f · P1g |
| **Optional** | P1d · Anheben oberster Antwortschlüssel (Z3.4, zweiter Teil) |
| **Nicht empfohlen** | 7 cp oder irgendeinen Betrag aus Prosa buchen · eine Karte durch Worte bestätigen lassen · die Münzwortregel aus `.144` S2 lockern · Extractor-Schema oder `scene_context` allgemein lockern · weitere Verbmuster in `payArgument` ergänzen · Zahl oder Beleg lokal auf `null` setzen · ein Transaktions- oder Shopsystem als Nebenfolge dieses Befunds |

**Offene Designentscheidungen:**

- **E-1 (zu Z2):** Darf der Erzähler bei einem bedingten Kauf die Übergabe erst im Folgezug zeigen? Ja erfüllt die Anforderung und kostet einen erzählerischen Takt. Nein belässt die heutige Vorgabe und damit Fälle wie Mage T24.
- **E-2 (zu Z4):** Soll ein `pay` mit geprüftem, exakt passendem Betrag für eine offene, von der Engine bepreiste Verpflichtung ohne Verbprüfung gelten? Das hebt die Entscheidung aus `.180` für genau diesen engen Fall auf. Alternative: weitere Muster je Befund, mit absehbarer Wiederholung.
- **E-3 (zu Z1.2):** Wie lange gilt eine bezahlte Übernachtung als „bezahlt“? Vorschlag: bis zum Ende des 24-Stunden-Fensters oder bis zum Verlassen der Siedlung; eine ausdrücklich weitere Nacht ist ein neuer Kauf.
- **E-4 (Randfall, außerhalb des Plans):** Mage T25 schläft ohne gebuchte Koje im Gildenhaus mit voller Erholung. Ob Schlaf an einem Ort, der Übernachtung verkauft, eine Buchung voraussetzt, ist eine Regelfrage zu [02 §4](../02_DESIGN_KANON.md), kein Zahlungsfehler.
- **E-5 (Hinweis, keine Empfehlung):** Der [Engine-Shop-Entwurf](../patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md) nimmt Unterkunft ausdrücklich aus. Die Daten zeigen, dass gerade Zimmer und Mahlzeiten die häufigsten gescheiterten Käufe sind (fünf der acht bedingten Käufe). Ob Standardpreise dafür gewünscht sind, ist eine eigene Entscheidung und nicht Voraussetzung für Z1–Z4.

---

## 8. Grenzen dieser Analyse

- **Keine Ausführung des Spielpfads.** Verhalten ist aus Records, Prompts und Code gelesen. Nachgerechnet sind nur vier Originaleingaben mit `payArgument` und eine mit `playerPrice` am HEAD.
- **Der latente Doppelabzug ist abgeleitet**, nicht reproduziert. Er setzt voraus, dass Zahlungswille erkannt und ein Zwei-Zeilen-Angebot gespeichert wird; beides ist im Lauf ausgeblieben.
- **Die Zählung in §3** umfasst sieben Läufe auf drei Builds mit einem Modell. Die Größenordnung (0 von 8, 0 von 12) ist eindeutig, die Einzelzahlen können um eins abweichen, wo ein Befehl in zwei Kategorien fällt.
- **Wirkung der Pakete** ist nicht gemessen. Z2 ändert die Erzählervorgabe; ob Modelle die neue Zeile befolgen, zeigt nur ein natürlicher Lauf.
- **Nicht untersucht:** Gildenauszahlung, Loot- und Ausrüstungspreise, Kampf, NPC E3, PULSE. Die Extractor-Formfehler nur, soweit sie Angebote betreffen.
- **Keine Freigabe.** Jedes Paket braucht einen eigenen Auftrag; frühere Vorschläge (P1a–P1f, §13) sind hier bewertet, nicht freigegeben.
