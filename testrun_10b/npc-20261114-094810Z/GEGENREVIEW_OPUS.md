# Unabhängiger Opus-Gegenreview – natürlicher Dreierbatch `.186` (14.11.2026)

**Gegenstand:** [GPT-Review](REVIEW.md) des Batches `npc-batch-20261114-094810Z` auf Build `.186` (`1382491`). Quellenbelege: [SOURCE_MANIFEST.md](SOURCE_MANIFEST.md). Vergleich: [`.183`-Batch](../npc-20261113-135417Z/REVIEW.md).

**Eigene Datengrundlage:** `npc-batch-20261114-094810Z-OPUS-GEGENREVIEW.zip` (Nutzerauszug). Daraus gelesen: alle drei unveränderten `chat.jsonl` mit den gespeicherten Records, `npc-pulse.json`, `calls.json` und `chat-completions-FOCUS.jsonl` (ausgewählte, unveränderte Modellaufrufe; Auswahl laut `MANIFEST.json`). Dazu der Produktcode bei `1382491`, nur lesend. Isolierte Nachrechnungen gab es für die Verwertbarkeits- und Geweihwürfe (`hash32`).

**Evidenzgrenzen:**
- Rohrequests liegen nur in den FOCUS-Fenstern vor: Warrior Aufrufe 15–23 und 26–43, Rogue 45–58, Mage 38–51. Die Zahlen der `turn`-Spalte sind dort Aufrufzähler, nicht Chatindizes.
  - Der Rogue-Planner-Request zu I59 (Chat #117) und der Narrator-Request danach liegen **außerhalb** des Fensters. Für sie gelten die gespeicherten Records (`plan.raw`, `outcome.actions`, Panel).
- Keine Node-Suite, kein Replay, kein ST-Smoke, kein eigener Fold.
- Chatindizes `#n` zählen ab der Begrüßung (#0); Spielerinput In = #(2n−1).

## 1. Gesamturteil

**GPTs Hauptlinie hält:** `.186` ist technisch fortsetzbar, es gibt einen echten falsch gerichteten Geldabzug (Rogue), und Monster A2 läuft natürlich wie vereinbart. Drei Punkte stelle ich jedoch anders dar:

| GPT-Befund | Urteil | Abweichung |
|---|---|---|
| **P1 Rogue I59 −14 cp** | **bestätigt, Kausalität präzisiert** | Die Geldrichtung hat nicht „die Engine festgelegt“. Der Extractor hat gegen seinen eigenen Vertrag eine **Arbeit Alarics** als `offer` gemeldet, und ein `offer` heißt „Alaric zahlt“. Der Planner nahm das Angebot an, die Engine buchte eine formal gültige Annahme. Die eigentliche **Enginelücke** ist eng: Die vorhandene Sperre `work_not_purchase` greift nur bei Wach- und Arbeitswörtern. Die spätere Ablehnung der Auszahlung (`engine_booked`) ist nach geltender Regel **korrekt**, nur eine Folge. |
| **P2 Mage-Unterkunft per `#pay`** | **kein Payment-Fehler, sondern eine Kette kleiner Fehler mit harmlosem Ergebnis** | GPT liest die „zeitweise Abwesenheit des Bauern“ als Erzählung. Tatsächlich hatte die Engine den Bauern beim Betreten des Hauses **verloren**: `arrive.with` war `null` und `reset_present` setzte die Anwesenden zurück. Der Erzähler **erfand** die Abwesenheit, um `CANNOT PAY — not here` zu erfüllen. Dazu kommen ein Fehlalarm der Agency („I let him take the two copper“ gilt als Geldforderung) und ein Angebotsbereich, der den Eltern-Ort nicht kennt. Bezahlt wurden 2 cp mit ausdrücklicher Bestätigung an den richtigen Empfänger. |
| **Monster A2** | **bestätigt** | Zusätzlich nachgerechnet: Beide „broken“ sind regelkonforme Würfe (808 und 579 ≥ 550). Die Gruppenwaffe der Dreiergruppe ist im Text belegt. Die Dreiergruppe hat nie gekämpft. |
| **E3 3 statt 9 Anker** | **Zahl stimmt, eine Teilaussage nicht** | Dass die Karte des Ledger keepers den Anker „nicht trägt“, ist **kein Auslieferungsfehler**: Er war nach #112 nicht mehr anwesend, und es gab keine spätere Begegnung. |
| **`handled_by` 0** | **stimmt, Ursache genauer** | Der Schalterzeuge entsteht bereits **im Spielerzug**: `f.pc.accepted.quest…`, Quelle `witnessed`, bei jeder Annahme. Die Ablehnungen betreffen nur die Belegqualität des Extractors (Pronomen ohne Namen, zusammengesetzte Zitate). Ein echter Wissensverlust bleibt nur bei Abgaben. |
| **Corven-Thread** | **bestätigt: Evaluatorartefakt** | `thread.set` steht an Eventindex 10, `scene.left(npc.corven)` erst an Index 12. |
| **PULSE 93/21/6** | **Zahlen bestätigt; Einordnung als Heuristik richtig** | Ein Fall gehört zu einer bekannten Design-Grenze: Ein Bauernhaus außerhalb einer Siedlung hat den Rahmen `wild`, die Spur-Fenster kommen also „aus dem Land“, während Alaric drinnen sitzt. |
| **Von GPT übersehen** | **neu** | **Warrior #117–#130: natürliche Ortsdrift** wie in `.179`. Der Planner hat zweimal kein GO gemeldet, der Erzähler ist trotzdem angekommen, die Engine hat das korrekt abgewiesen. Folge: rund fünf Züge Torwache, Wachhaus und Bren ohne gespeicherte Welt (21 `scene_context`-Ablehnungen im Warrior-Lauf). Außerdem gab es viele Längenabbrüche (`finish=length`) bei Extractor und Planner. |

**Tatsächlicher Bedarf:** **ein P1** (Arbeitsangebot als Kauf, enge Sperre an zwei Stellen) und **ein P2** (Ortsdrift ohne GO, Planner-/Erzählerseite, wie `.179`). Alles Übrige ist sinnvoll oder zu beobachten.

## 2. Beweistabelle der entscheidenden Originalfälle

| Fall | Spielerinput | Modellantwort | Engineentscheidung | Event / Folge |
|---|---|---|---|---|
| Rogue #114 (Kontrast) | „whatever the cooper thinks fair …“ | Küfer zählt **8 Kupfer in die Hand** | Extractor `coin.gift` | `coin.changed +8`, `transaction.completed to:pc` – **richtiger Weg für Dankeslohn** |
| Rogue #116 | „If it's worth coin, I'd rather take him now …“ | Küfer: „Fourteen coppers … That's the goose and the gander both, **for the village**“, Geld nur hingehalten. Extractor (FOCUS n174/n175): `offer` von `npc.npccooper`, Zeile „**kill the gander on the west road, for the village**“, `service: other`, 14 cp, `firm` | Firewall/World nehmen das Angebot an; `work_not_purchase` greift nicht (Muster nur „you keep/guard/watch/work … / pay you“, `world.js:2991–2996`) | `offer.created offer.t116.6`. Der Extractorvertrag sagt ausdrücklich: angebotener Lohn ist Tatsache oder Versprechen, `offer` ist „what THEY would sell … (he would pay)“ → **Vertragsverstoß des Extractors** |
| Rogue #117 (I59) | „**I accept the fourteen coppers**, fetch the barrow …“ | Planner (`json_repaired`, erste Antwort leer): `offer.accept offer.t116.6`, `agreed_cp 14` | `offer.accept` bucht wie jeder Kauf; Narratorzeile „**ACCEPTS the offer — kill the gander … for 14 cp; he pays the cooper**“ | `transaction.completed cp 14 seller cooper`, `coin.changed 40→26 (−14)`, `service.granted other`; Panel „PURCHASE COMPLETE · −14 copper“ |
| Rogue #118 | – | Erzähler folgt der Zeile: „The coppers went the other way than expected …“, erfindet „the bird's price“ | korrekt nach Vorgabe | – |
| Rogue #129/#130 (I65) | „Fourteen coppers, like you said“, Hand auf | Küfer zählt 14 in die Hand. Extractor: `coin.gift relation: trade_settlement`, why „payment for the feral grey goose carcass“ (übernimmt #118) | Firewall `engine_booked`: Handelsrestgeld nie als Geschenk – **regelkonform** | kein `+14` |
| Rogue #133/#134 (Kontrast) | „One copper for the loft … I'll take it“ | Erzähler nennt die Summe und zeigt **keine** Übergabe („waiting on the coin“) | bedingter Kauf am Antwortende gebucht | `−1`, `service.granted lodging` – **Z2 natürlich korrekt** |
| Mage #88 | „A bed for the night … I'll pay“ | Bauer: „Two copper … pallet by the hearth, and porridge at dawn **if you're up when I am**“. Extractor zuerst `firm` (n140); die Reparatur der Engine (`openConditionNear`: „when I“) erzwingt `conditional` (n141) | Angebot nicht bindend | `offer.t88.6 terms conditional` |
| Mage #91/#92 | „I pay … two copper … follow him inside“ | Planner: `pay` → Kaufzweig → bedingter Kauf, `go` (needs 1). Erzähler: keine Übergabe, der Bauer nennt im Haus erneut 2 cp. Extractor: nur `fact … offer`, kein `offer`; `arrive.with: null`; `met` des Bauern | Kauf läuft ab (Entscheidung am Hof, Szene im Haus); `met_without_arrival`, weil das GO auf einen **neuen** Ort zeigt (`g.to` leer, `world.js:2155`) | `scene.moved … inside_the_farmhouse reset_present:true` → **Bauer nicht mehr anwesend** |
| Mage #93–#96 | „I pay the farmer two copper.“ | – | `CANNOT PAY — the one he means to pay is not here` (zweimal) | Erzähler erfindet „The farmer was gone from the doorway“ |
| Mage #97/#98 | „I let him **take** the two copper from my palm.“ | Erzähler: „The coins clicked into the farmer's palm“ | Agency verwirft `pay` als `not_paying` (CLAIM-Muster „take … copper“) | **ungebuchte Übergabe erzählt**, nicht korrigiert |
| Mage #101–#104 | „Two copper, agreed …“, dann `#pay dec.pay.t47.1` | – | `pay` → **freie Karte**, weil das Angebot am Hof liegt und der Kaufabgleich nur `o.at === scene.at` prüft. Schlaf gebucht, eine Unterkunft ist dafür nicht nötig (E-4) | `−2`, `native:true`, kein `service.granted` – mit Zustimmung, richtiger Empfänger |
| Warrior #64–#83 | Kampf gegen zwei Lookouts | Karten im Erzählerrequest: „armed: crude spear / crude knife“ (n115/118/121) | `profile.gear` `default`, Slotschlüssel; `attack.name` = Waffe, `raw_text` „Crude spear Raw = ATK 21“ (L5) / „Crude knife … 11“ (L1) | Beute „… broken, nothing worth taking“ ×2. Nachgerechnet: `hash32(enc.t32|id|gear|salvage)%1000` = 808 / 579 ≥ 550 |
| Warrior #112 | GO zur Köhlerhütte, PULSE-Fenster `danger` | „three moss-green goblins … **spears leveled**“ | `armed: spear` für alle drei (K3 belegt), `source: stated` | Gruppe verfolgt Alaric bis #134, **kein Kampf** |
| Warrior #117–#128 | „I keep backing up … toward the gate palisade“, Rede zur Wache, „follow … to the watch-house“ | Planner #117/#119: `commands: []`. Erzähler: Ankunft an Palisade, Torwache, Wachhaus, Bren, Vessa | `no_go` (2×), `scene_context` (21 im Lauf), `place: a interior cannot lie in Duskreach`; #126 Extraktion gescheitert (`length`); #128 zieht die Erzählung auf den Pfad zurück | Welt und Erzählung laufen etwa fünf Züge auseinander; Kauf bei Vessa trotzdem korrekt gebucht (−2) |

## 3. Bewertung je Priorität

### 3.1 Rogue −14 cp (Priorität 1)

- **Spielerabsicht:** Belohnung annehmen. **NPC:** die Dorfbewohner zahlen Alaric für die Tötung des Ganters. **Narrator-Kontext #116:** „FREE HELP“ (keine privaten Quests); Spielerzug ohne Befehl.
- **Ursache:** Der Extractor meldet eine Leistung, die **Alaric erbringt**, als `offer` des Küfers. Das verstößt gegen den Vertrag („offered wages are ordinary facts, promises …“). Der Planner liest den Katalogeintrag `OFFERS: … kill the gander … 14 cp` und „I accept the fourteen coppers“ als Annahme. Die Agency kann die Richtung nicht erkennen. Die Engine bucht, und ihre einzige Gegenprobe (`work_not_purchase` in `offerLines`, `ambiguousWork` in `offer.accept`) kennt nur „guard/watch/keep/work/shift“.
- **Nachweisgrad:** Extractorantwort im Original belegt (FOCUS n174/n175). Planner-Rohantwort im Record belegt (`plan.raw`), nicht als Request. Buchung im Eventlog belegt.
- **Schweregrad:** **P1.** Spielgeld ist gegen den Willen von Spieler und Erzählung falsch gebucht und wird nicht korrigiert. Das Eventlog ist nicht beschädigt.
- **Positive Gegenfälle (schützen):** #114 Dankeslohn per `coin.gift`; #63 Zimmer und Abendessen 3 cp per `offer.accept`; #134 Loft per bedingtem Kauf; Warrior #46 Fellverkauf an Corven per Gebot (+60 cp, beim Spielerzug #45 angenommen, in der Antwort gebucht).
- **Engste Korrekturgrenze:** keine neue Handelsarchitektur, keine Rückzahlung aus Prosa.
  1. **Extractorvertrag:** ein Satz an `offer`: eine Arbeit, die Alaric **für** den anderen erledigt („kill/hunt/clear … for the village / for us“), ist nie ein `offer`, sondern Tatsache, Thread oder Versprechen; eine Auszahlung ist `coin.gift`, wenn sie übergeben wird.
  2. **Engine, zweite Linie:** `work_not_purchase` in `offerLines` und `offer.accept` erweitern auf Dienstzeilen `other`, deren Text eine Tat Alarics für den Anbieter beschreibt: Tatverb am Anfang plus „for the village/us/me/you“ oder Lohnwort („bounty, reward“) im Satz. Folge: abgelehnt bzw. Rückfrage, kein Geld bewegt.
  3. **Rot/grün:** Original #116/#117; Gegenfälle „a shave and a bath“, Heilung, Führer gegen Bezahlung (Alaric kauft die Führung), Unterkunft.

### 3.2 Mage-Unterkunft und `#pay` (Priorität 2)

| Glied | Art | Nachweis |
|---|---|---|
| `conditional` durch die Reparatur der Engine („if you're up when I am“ gilt nur für das Frühstück) | vertretbarer Schutzfall (die Zeile bündelt eine bedingte Beigabe) | n140 → n141 |
| Bauer beim Betreten nicht mitgenommen (`with: null`) | **Extractorfehler**; `met` ist nicht der Weg für Begleiter (für neue Orte gibt es keine „known_at“-Personen) | n148, #92 |
| `CANNOT PAY — not here` | **korrekte Ablehnung** auf falschem Zustand; Erzähler erfindet die Abwesenheit | #93–#96 |
| „I let him take the two copper“ → `not_paying` | **Agency-Fehlalarm** (CLAIM-Muster ohne Subjektprüfung) | #97 |
| erzählte Übergabe ohne Buchung | **Erzählerüberschreitung**, nicht korrigiert | #98 |
| freie Karte statt Kauf | **Lücke im Angebotsbereich:** Angebot am Hof (Eltern-Ort), Kaufabgleich nur am eigenen Ort | #101 |
| Schlaf ohne gebuchte Unterkunft | bewusst offen (E-4) | #101 |

**Ergebnis:** kein Enginefehler bei Geld. **Kein Pflichtfix.** Die freie Zahlungskarte hat natürlich funktioniert (sichtbar, benutzt, exakt gebucht). Sinnvoll, jeweils eng: CLAIM nicht bei „let him/her/them take“; Angebote desselben Anbieters am direkten Eltern-Ort beim Kaufabgleich zulassen. Ob ein Bündel mit bedingter Beigabe insgesamt bedingt sein soll, ist eine Designfrage, keine Pflicht.

### 3.3 Monster A2 (Priorität 3)

- **Profile:** Lookout A `Crude spear`, B `Crude knife` (`default`, Slotschlüssel `c1_l1_e1`); Dreiergruppe `Spear` (`stated`).
- **Kampfwerte:** ATK nach Ankerskala (Goblin L1 11, L5 21). `skill_name` und `raw_text` nennen die Waffe; der Erzähler erhält „armed: …“.
- **Die zwei „broken“:** regelkonform (nachgerechnet). Keine zweite Waffe, kein Objekt vor dem Tod.
- **K3:** durch „spears leveled“ für alle drei belegt.
- **Natürlich ungetestet:** gelungene Verwertung, Fokus/Schamane, Oger/Troll-Keule, „unbewaffnet“ (nur 1 von 10), gemeldete Waffe im Kampf (die Dreiergruppe kämpfte nicht), Altprofil (D5).
- **A1:** Hirsch mit Geweih im Text, Geweih ist erlaubt (`only_if`); gezogen 0 von [0, 2] (nachgerechnet), nur Fell.
- **Kein eigener Fehler.** Keine Balance-Empfehlung.

### 3.4 NPC E2/E3 und PULSE (Priorität 4)

| Kennzahl | Prüfung | Urteil |
|---|---|---|
| E3 3 Anker | Warrior #38 Clerk `manner` (an Karten n55/n59 ausgeliefert, Clerk anwesend); Warrior #110 Ledger keeper `voice` (inhaltlich eher `manner`, danach nie wieder anwesend); Mage #106 Bauer `manner` (Auslieferung außerhalb des FOCUS-Fensters, Runner zählt 1 Karte). Abgelehnt: #18 `anchor_first_contact` (korrekt), Mage #108 `anchor_value` (82 Zeichen > 80, korrekt). Rogue: **kein Vorschlag** des Extractors, keine Ablehnung | keine Funktionsregression; die Rate hängt an Begegnungen und Modellwahl. Qualität (`voice` mit Handlungen): beobachten |
| `handled_by` 0 | `knowledge.gained … source witnessed` bei jeder Annahme im Spielerzug (Warrior #17, #39; Rogue #13). Ablehnungen `desk_handler`: „no one is named before the pronoun“ (2×), „quote joins several places“ (2×), „no Guild person present“ (1×) | überwiegend **Evaluator-Messung** (zählt Spielerzug-Wissen nicht) plus strenge, aber begründete Belegregel. Echter Verlust nur bei Abgaben. Keine Lockerung |
| Corven-Thread | Eventreihenfolge #46: `thread.set` (10) vor `scene.left` (12) | **Evaluatorartefakt** |
| PULSE | 21+36+36 = 93 Würfe, 3+8+10 = 21 offen, 6 „nicht erzählt“ (Warrior #110, Rogue #10, #100, Mage #32, #98, #110) | Heuristik. Mage #98: Spurfenster `wild` im Bauernhaus (Rahmen `inside` gibt es nur in Siedlungen, `pulse.js sceneFrame`). Der Erzähler hat es zu Recht nicht gezeigt. Keine Lockerung, beobachten |

## 4. Weitere Befunde und technische Gesamtkontrolle

- **Ortsdrift Warrior #117–#130 (von GPT übersehen):** Der Planner liefert für „I keep backing up … toward the gate palisade“ und die folgende Rede kein GO. Der Erzähler lässt Alaric dennoch ankommen. Die Engine weist das korrekt ab (`no_go`, `scene_context`, `place`). Das spätere GO zum Wachhaus scheitert an einem Innenraum ohne Siedlung. Nach der gescheiterten Extraktion (#126) holt der Zustandshinweis den Erzähler auf den Pfad zurück (#128). Im Rogue-Lauf gibt es drei weitere `no_go`-Fälle (#56, #76, #98), nicht einzeln geprüft. **Einordnung:** Planner- und Erzählerfehler, korrekte Engine-Ablehnungen, P2 für Spielbarkeit; gleiche Klasse wie die `.179`-Ortsdrift.
- **Längenabbrüche:** `finish=length` bei Extractor 13/19/15 und Planner 5/8/5 (Warrior/Rogue/Mage). Sie haben Reparaturen verbraucht (Mage #92: die eine Reparatur ging an die leere Antwort, Z3.1 konnte nicht mehr wirken) und zwei Extraktionen beendet (Warrior #58, #126). Das entspricht P1f (Ausgabebudget) aus dem Architekturaudit.
- **Planner-Nichtausführungen:** Warrior #9 (JSON), #43 (Verkaufs-`min_cp`); Mage #89 (`quote_not_found` für „Two copper“, Klasse P1a/P1e), #131/#133 (Stealth-Bewegung plus Angriff; Klärungsregel aus S1, Stealth S2 offen). Der Rogue-Lauf hat keine.
- **Fortsetzbarkeit `.183` → `.186`:** alle drei Läufe 70/70, Rogue ohne einen gescheiterten Zug. Die Reparatur mit Gerüst (`.185`) ist im Rogue mehrfach genutzt worden (z. B. n144, n162, n175), jeweils mit gültiger zweiter Antwort.
- **Grenze des Vergleichs:** Der Mage-Tod in `.183` war reguläres Spiel und kein technischer Ausfall. Ein Lauf je Profil ist keine Rate.
- **`.185`-Funktionen natürlich gesehen:** Z2 (#134 Rogue, #92 Mage: keine erzählte Übergabe vor der Buchung), Z1.1 (`#pay` aus dem Panel benutzt), Z1.3 (zutreffende Gründe in den Panels).

## 5. Priorisierte Korrekturen

| Stufe | Maßnahme |
|---|---|
| **Pflicht** | **P1 Arbeitsangebot ≠ Kauf** (§3.1): Satz im Extractorvertrag plus erweitertes `work_not_purchase` in `offerLines` und `offer.accept`; rot/grün mit Original #116/#117 und den Gegenfällen. Kein Rück-Payout |
| **Sinnvoll** | **P2 Ortsdrift:** am Original #117/#119 prüfen, warum der Planner „backing up … toward the gate palisade“ nicht als GO meldet; Erzählerzeile bei NOTHING TO BOOK („no arrival anywhere“). **P1f Ausgabebudget** messen (Längenabbrüche). Agency-CLAIM ohne „let him/her take“. Kaufabgleich mit Angeboten desselben Anbieters am Eltern-Ort. `arrive.with`-Hinweis für Gastgeber, die Alaric hineinführen |
| **Beobachten** | E3-Rate und Qualität von `voice`; Abgabe-Zeugen am Schalter; PULSE-Rahmen `wild` für Häuser außerhalb von Siedlungen; Bündel mit bedingter Beigabe; A2-Statistik (gelungene Verwertung, Fokus, Oger) |
| **Nicht notwendig** | Lockerung von `handled_by`/`met`/`enter`; PULSE-Frequenz; Änderung an `#pay`, freier Karte, `engine_booked`; Monsterbalance; neue Handels- oder Shoparchitektur |

## 6. Vergleich `.183` → `.186`

| | `.183` (13.11.) | `.186` (14.11.) | Nachweisgrenze |
|---|---|---|---|
| Inputs / Ende | 70 / 43 (Modellausfall) / 39 (Tod) | 70 / 70 / 70 | je ein Lauf, andere Wege |
| Extractor-Abbruchkette | Rogue T41–T43 | keine; Reparatur mit Gerüst greift | Gerüst-Wirkung plausibel, nicht isoliert gemessen |
| Zahlungen | Doppelabzug latent, Karte unsichtbar, „he pays it and takes it“ | Karte sichtbar und benutzt, Z2 befolgt; **ein echter −14-cp-Fehler** neuer Klasse (Arbeit als Kauf) | der neue Fehler ist kein Rückschritt durch `.185`, sondern eine alte Lücke im natürlichen Fall |
| Questannahme | T22/T27 als Frage verworfen | kein entsprechender Fall | nicht provoziert |
| E3 | 9 Anker / 152 | 3 Anker / 210 | keine kontrollierte Rate |
| A2 | – | 5 bewaffnete Goblins, 2 Kämpfe, 2 regelkonforme Fehlschläge | keine erfolgreiche Verwertung |
| Ortsdrift | `.179` belegt, `.183` nicht in derselben Form | Warrior #117–#130 wieder belegt | Planner-/Erzählerseite |

## 7. Empfehlung zum nächsten Patch

Ein enger **P1-Patch „Arbeitsangebot ist kein Kauf“** (§3.1): Extractorvertrag und eine erweiterte `work_not_purchase`-Sperre an beiden Buchungsstellen, mit dem Original als Regression und den genannten positiven Gegenfällen, dazu angrenzende Finanztests, Replay mit Einzelfreigabe und isoliertem ST-Smoke. **Nicht** im selben Patch: Mage-Ketten-Kleinkorrekturen und die Ortsdrift. Die Ortsdrift verdient vorher eine kurze Originalanalyse (Planner-Request #117 liegt außerhalb des FOCUS-Auszugs; die große Original-ZIP bzw. `chat-completions.jsonl` wäre dafür nötig). Danach eine gezielte natürliche Probe mit Belohnungs-, Gasthaus- und Ortswechselszenen statt sofort eines weiteren großen Dreierbatches.

**Keine Produktänderung durch diesen Gegenreview.**
