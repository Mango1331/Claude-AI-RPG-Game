# Run 15 – unabhängiger Gegenreview von Build .89 (Gear und Handelsnachbesserung)

**Datum:** 25.10.2026  
**Produkt:** Avereth Engine 4.3.0-c.6.6.89, Commit [05696b4](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/05696b4b4ff00578074d7336bb04f6948865def5); Basis .88 / a25fd5e  
**Run-Ursprung:** `20261025-124809Z-current_test`, Original-Export und bisheriges `REVIEW.md` auf main.  
**Prüfgrundlage:** Produktcommit samt Diffs, `PATCH_RUN15_GEAR_MARKET.md`, Ergänzung `PATCH_RUN15_TRADE_INTEGRITY.md`, `patch_run15_gear.test.js`, `patch_run15_trade_review.test.js`, betroffene Codepfade `items.js`, `world.js`, `trade.js`, `commands.js`, `domain.js`, `catalog.js` und `context.js`.  
**Prüfgrenze:** **Statische unabhängige Repository-/Regressionen-Gegenprüfung; keine eigene Ausführung von Node, ST-Smoke oder natürlichem GLM-Spiel.** Gemeldete Testzahlen sind als dokumentierte Implementierergebnisse gekennzeichnet. Keine Produktänderung durch ChatGPT.

## Gesamtbefund

**Die Auftragsziele von Patch B und die beiden konkreten offenen .88-Gegenreviewfälle sind im Code nachvollziehbar umgesetzt. Freigabe für den nächsten natürlichen GLM-Langlauf empfohlen.** Keine neue Ausrüstungsarchitektur, keine neuen Slots, keine Umdeutung separater Schienbeinschützer zu Ganzkörperrüstung, kein Eingriff in Guild/Delivery/Kampf/XP. Das weiterbestehende Host-`AbortError`-Phänomen ist offengelegt und bei unverändertem Code im zweiten ST-Smoke nicht aufgetreten.

Der neue natürliche Lauf muss weiterhin nachweisen, dass GLM **tatsächlich** geeignete Gearangebote formuliert und Spieler sie kaufen und anlegen, ohne die neue Restriktion durch anderslautende Prosa zu umgehen.

## 1. Handelskorrekturen aus Patch-A-Gegenreview

**A. Stückpreise und rabattierte Endpreise:** `trade.js:acceptanceWhy` verwendet für ausdrückliche Preiszustimmung jetzt `tradePrice` mit der konkreten ausgewählten Menge. Der Fall „vier Platten, ein Kupfer pro Platte, Gesamtpreis vier Kupfer“ wird durch Tests mit und ohne `agreed_cp:4` angenommen; abweichende Raten gesperrt. Eine bloße nicht vereinbarte Rabattforderung akzeptiert weiterhin keine alte Offerte; ein bereits aktualisierter und ausdrücklich angenommener Endpreis wird akzeptiert und einmal gebucht.

**B. Auskünfte über fremde Händler:** `offerAdvice` erkennt neu ausdrücklich namentlich bezeichnete abweichende Anbieter („Hessel sells ...“). Es existieren Gegenkontrollen für Verkauf der **eigenen** Ware, erlaubte explizite Vermittlung und dritte Person in der Erzählung über den tatsächlich anbietenden Verkäufer. Es bleibt bewusst ein begrenztes System klarer Evidenz, keine universelle Spracherkennung.

`patch_run15_trade_review.test.js`: **10 neue Fälle**; laut Patchnote auf .88 fünf rot/fünf grün, auf .89 **10/10 grün**. Zusammen mit Patch A werden 55 Handelsregressionen beschrieben.

## 2. Gear-Veröffentlichung und Profil

- `items.js:gearOfferWhy` erkennt fehlende gültige Profile und separat angebotene Rüstungsteile ohne Slot. Unterstützte Kategorien und Slots werden aus dem bestehenden Content abgeleitet; **kein neuer Slot**.
- `extract.js`/`content/deltas.json` ergänzen ausschließlich nullable `offer_line.equipment: boolean|null`, **keinen** frei eingebbaren Slot oder Zahlen. Für bestehende alte Extractorantworten wird fehlendes Feld normalisiert.
- `world.js:offerLines` prüft neue Angebote unter Ruleset 2/C **vor der Veröffentlichung**. Eine nicht unterstützte Gear-Zeile wird abgewiesen; andere gültige Offer-Zeilen bleiben möglich. `equipment:false` darf gewöhnliche dekorative Gegenstände ohne Kampfversprechen zulassen.
- `itemProfile` bestimmt weiterhin Rang, Slot und Werte; das veröffentlichte Profil wird beim Kauf durch `bookPurchase` konserviert. Bei ausdrücklich gewöhnlicher Ware wird `profile:null` als Negativkennzeichen mitgeführt, sodass spätere Namensinferenz keine Kampfwerte erfindet.
- `catalog.js`, `interpret.js` und `context.js` stellen dem Modell unterstützte Gear-Kategorien und für bestehende Angebote Profil/Slot/Werte bereit; Marktinformation für den Narrator wird situativ eingeblendet. Keine zusätzliche Provider-Anfrage.

Abweichungen von alten, bereits veröffentlichten Angeboten oder historischen Inventargegenständen werden nicht durch eine rückwirkende Migration korrigiert. Das entspricht dem Auftrag.

## 3. Kauf → Equip: deterministische Autorität

- `commands.js:offer.accept` verweigert neu deklarierte, als `equipment:true` markierte Waren ohne gültiges Profil und vorhandenen Slot **vor Zahlungsbuchung**.
- `commands.js:equip` prüft `c.slot` gegen den tatsächlichen Profilslot **vor** `object.consumed`/Ausrüstungswechsel. Beispiel: Chainmail darf nicht in `leg` oder `weapon` gebucht werden.
- Bei einem eindeutigen Kauf und anschließendem `equip {new:"fine chainmail"}` im **selben Turn** wird nur das tatsächlich durch den Kauf angelegte Objekt benutzt. Fremder Besitz oder zwei gleichnamige Neukäufe lassen keine willkürliche Auswahl zu.
- Der echte Zustand aus `item.equipped` fließt in die Charakterwerte ein; Tests vergleichen das gespeicherte Profil und die Änderung von DEF. Getrennte Kontrolle für Dekoration, Werkzeug, Nahrung, Trank, Ranganforderung, Altangebote, Ruleset 1 und Replay/Reload.

**Wichtig für den natürlichen Lauf:** Nicht jede verkäufliche Sache ist automatisch mechanische Ausrüstung. Der Händler darf weiterhin ein dekoratives oder praktisches Teil verkaufen; er darf es nicht als vorhandenen neuen Kampfslot bzw. mit erfundenen Schutzwerten anbieten.

## 4. Eng abgegrenzter offener Edge Case – Gear-Mengenstapel

Bei gezielter Quelltextprüfung zeigt sich ein **noch nicht durch die neuen Gear-Tests abgedeckter Mengenfall**:

- `trade.js:bookPurchase` erzeugt für `p.units > 1` auch bei mechanischer Ausrüstung **ein** `object.created` mit `qty:p.units` und `stack:true`.
- `commands.js:equip` emittiert für solch ein eigenes Objekt **`object.consumed` ohne `qty`**.
- `domain.js:object.consumed` setzt bei fehlendem `qty` den **ganzen Objekthalter auf consumed**, auch wenn `o.qty > 1`. Das dürfte beim Kauf von zwei identischen Rüstungen als einem Posten und anschließenden Anlegen nur einer Rüstung den zweiten Gegenstand ungewollt aus dem nutzbaren Inventar entfernen.

**Status:** Codegestützte konkrete Hypothese, **kein bereits ausgeführter reproduzierter Test** und kein Run-15-Originalfehler; natürlicher Testlauf nicht davon abhängig. Als **P2-Randfall** im nächsten gezielten Regressionsturn prüfen: `qty:2` Gear als ein Posten kaufen, eines anlegen, genau eines im Inventar behalten; danach ablegen und erneut anlegen; Replay stabil. Keine globale Stack- oder Equip-Architektur daraus ableiten.

## 5. Testbelege und verbleibende Grenzen

| Nachweis | Durch Sol berichtet, im Repository dokumentiert |
|---|---|
| Handelsgegenreview | 10 Fälle auf .88: 5 rot/5 grün; auf .89 10/10 |
| Gear | 19 Fälle gegen .88 mit A-Korrekturen: 12 rot/7 grün; auf .89 19/19 |
| Angrenzende Tests | 334/334 |
| Gesamtsuite | **1765/1765** |
| Echter ST-1.19-Mock-Smoke | abschließend **21/21**, fünf Extractor-Aufrufe, vier gespeicherte Antworten je einmal angewendet, keine PageErrors |
| Vorheriger ST-Smoke | **20/21** wegen sporadischem `AbortError @ openai.js:4565`, auf demselben finalen Produktstand unverändert wiederholt 21/21 |
| Natürlicher .89-GLM-Lauf | **Noch nicht durchgeführt** |

Die 19 Gearfälle liegen teilweise in `for`-Tests; die Anzahl der einzelnen `test()`-Deklarationen ist deshalb niedriger. Die Testtexte decken insbesondere Original-T55/T96, Gegenstand ohne Gearprofil, `equipment:false`, richtige/falsche Slots, Rang, eindeutigen Sofort-Equip, Mehrdeutigkeit und Replay ab.

**Kein neuer Blocker für den natürlichen Run.** Die testspezifische Gegenprüfung stellt nicht sicher, dass freie GLM-Erzählungen über 100 Eingaben kohärent bleiben, tatsächliche Kaufzusagen erkannt werden oder sinnvolle Händlerangebote regelmäßig vorkommen. Für die nächsten 100 Eingaben die ursprünglichen Run-15-Ziele beibehalten: Gilden-/Kampfzyklus, mindestens ein echter Händler-Gearkauf mit tatsächlichem Equip und Wertänderung, Vermeidung von Doppelzahlung/falscher Gegenpartei, freie Geschenke und Scene-/GO-Integrität. Original-ZIP/REVIEW.md und Testspielerleitfaden unverändert lassen.

## Entscheidung

**Build .89 ist für den nächsten natürlichen GLM-Langlauf fachlich freigegeben.** Keine prophylaktische Änderung von Questboard, Delivery, XP, Kampfbalance, Slots oder Grundarchitektur. Den konkret benannten Multi-Gear-Stapel nur gezielt nachtesten, nicht als bereits erwiesenen Blocker oder als Grund für einen generellen Umbau darstellen.
