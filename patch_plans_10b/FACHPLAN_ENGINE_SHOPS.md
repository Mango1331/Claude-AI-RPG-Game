# Fachentwurf – Engine-Shops für den Standardhandel

**01.11.2026 · Analysebasis .146 / 9136f8f · Status: ENTWURF, nicht implementiert.**

Der Nutzer hat die Präzisierung der Idee und diesen technischen Fachplan beauftragt. **Das ist keine Implementierungsfreigabe und kein Beschluss der hier empfohlenen neuen Spielregeln.** Die aktuelle .146-Abnahme und der nächste natürliche Batch bleiben bestehen. Vor Umsetzung die offenen Entscheidungen in §10 bestätigen und den tatsächlichen Produkt-HEAD prüfen.

[Ideenkatalog](../04_IDEENKATALOG_REVIEWS_UND_PATCHPLAN.md#handel--engine-shop-fallback) · [aktueller Stand](../03_AKTUELLER_PROJEKTSTAND.md) · [Batch21](../testrun_10b/batch-20261101-152756Z/REVIEW.md) · [geprüfter Produktcode](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/9136f8ff664ad12e29fc74190f5d8a0909e3d4eb/avereth-engine).

## 1. Ziel und bewusste Vereinfachung

Für gewöhnliche Ladenware und klar definierte Standardloot-Ankäufe soll die Engine Sortiment, Profile, Mengenrechnung und verbindliche Preise liefern. Der Narrator gestaltet Geschäft, Personal, Atmosphäre und Dialog. Der Planner versteht die natürliche Auswahl; die vorhandene Engine bucht Geld und Gegenstände.

**Das Zielbild ersetzt die freie Preis-/Angebotserzeugung für diesen abgegrenzten Standardhandel.** Es ist keine zweite Standardhandelsengine und kein automatischer Notpfad „wenn das Modell scheitert, trotzdem zahlen“. Persönliche Geschenke, freie NPC-Hilfe, Gildenbelohnungen und Registrierung behalten ihre bisherigen Wege.

Erwarteter Nutzen: weniger Preisextraktion und Repairs, eindeutige Ausrüstung, stabile Wiederbesuche und bessere Messbarkeit der Wirtschaft. Bewusster Verlust: keine spontanen verbindlichen Sonderpreise und kein freies Feilschen im Standardshop. Der Narrator kann trotzdem irren; eine falsche Erzählung ändert keinen Preis und erzeugt keine Ware. Verbindliche Engineanzeige und Erzählkontext sollen den Fehler sichtbar begrenzen.

## 2. Was im Code bereits vorhanden ist

| Vorhandener Pfad auf .146 | Nutzen / notwendige Grenze |
|---|---|
| src/v4/items.js: openEquipmentStock(), gearOfferProfile(), gearRetailPrice() | Kleine F-Fachhändlerangebote und Engineprofile existieren schon. Der aktuelle Generator hängt aber an anwesendem NPC, Rollen-/Ladennamen und Tages-ID; er ist noch kein allgemeiner Shopkatalog. |
| src/v4/guild.js: openGuildManuals() | Beispiel für feste Waren durch bestehende Angebote. Gildenmanuals bleiben ein eigener Fachweg. |
| src/v4/trade.js: purchaseLines(), pickLines(), acceptanceWhy(), offerAvailability(), bookPurchase(), bidSale(), bookSale(), tradeObject() | Auswahl, Mengen, Zustimmung, Besitz und Buchung wiederverwenden. Keine zweite Wallet oder Kauf-/Verkaufsbuchung. |
| src/v4/commands.js: buy, sell, offer.accept | Natürliche Kauf-/Verkaufsabsichten besitzen bereits Kommandos; kein neuer Pflichtbefehl oder Menüzwang nötig. |
| src/v4/world.js: arrive(), settleCanonicalPurchases(), offerLines(), bid() | Bestätigte Ankunft und bedingte Käufe sind vorhanden. settleCanonicalPurchases ist aktuell auf Gildenmanuals begrenzt; seine chronologische Abwicklung kann gezielt erweitert werden. |
| src/v4/catalog.js / src/context.js / src/display.js | Autoritative Waren, Angebote und bereits gebuchte Ergebnisse an Planner, Narrator und Spieler liefern. |
| src/v4/domain.js / src/state.js / src/v4/ownership.js | Vorhandene Orts-/Angebots-/Entscheidungs-/Transaktionsevents und Fold verwenden; neue Shopmetadaten ausdrücklich validieren. |

**Zwei Codegrenzen sind entscheidend:** offerAvailability setzt bei gewöhnlichen Angeboten NPC-Anwesenheit voraus; bookSale prüft ebenfalls einen anwesenden Käufer. Diese Stellen müssten für einen geprüften Shopbetrieb begrenzt angepasst werden. Außerdem schließt bookPurchase ein Angebot nach Annahme vollständig: Ein dauerhaftes Sortiment darf daher nicht durch beliebiges Wiederöffnen alter Angebote simuliert werden.

## 3. Empfohlener erster Umfang

- F-Standardgear aus den vorhandenen unterstützten Waffen-, Fokus-, Rüstungs- und Offhandprofilen; nur vorhandene Slots. Bestehende F-Verkaufspreise erhalten.
- Kleine, ausdrücklich konfigurierte Auswahl gewöhnlicher Verbrauchs-/Gebrauchswaren, soweit deren Profile bereits unterstützt sind. Sortiment nach Ladentyp, Ort und bestehender Spezialisierung; bei F-Betrieben passende F-Auswahl für verschiedene Builds, kein persönlicher Komplettausstatter und kein automatisches Mitwachsen bei jedem PC-Level.
- Standardloot-Ankauf nach freizugebenden Preisregeln und zulässigem Ladentyp; physische obj.*- und freie item.<template>-Einheiten gleich behandeln.
- Zunächst nur tatsächlich etablierte gewöhnliche Läden. Keine pauschale Verwandlung jeder Erwähnung eines Schmieds oder Marktstands in einen funktionalen Shop.

**Nicht Teil des ersten Umfangs:** Unterkunfts-/Arbeitsverträge, Training, Kredit, Banken, Preise für besondere Artefakte, Tauschgeschäfte, Rabattsimulation, Händlervermögen oder Versorgungsketten. E+-Sortimente erst mit eigener Contententscheidung. Ein einzigartiger Gegenstand ohne beschlossene Preisregel erhält keinen geratenen Standardpreis.

Empfehlung zur Vereinfachung: Standardware ist innerhalb des gespeicherten Katalogs regulär bestellbar; zunächst **keine endliche Händlerlagerverwaltung**. Das bedeutet reproduzierbare Warenverfügbarkeit, keine kostenlose Ware und kein automatisches Kaufen. Besondere begrenzte Einzelstücke bleiben außerhalb dieses Systems. Wer stattdessen endliche Bestände möchte, muss diese Entscheidung und ihre zusätzlichen Regeln vor Umsetzung treffen.

## 4. Identität, Ladenbetrieb und minimale Persistenz

### 4.1 Der Betrieb ist die wirtschaftliche Gegenpartei

Empfehlung: Die kanonische Orts-ID des tatsächlichen Ladens ist seine Geschäftsidentität. Ein Geschäft und sein Verkaufszimmer benutzen denselben Shopwurzelort; nicht jeder Schalter erhält ein neues Sortiment. Zwei tatsächlich unterschiedliche Geschäfte derselben Stadt bleiben verschieden. Keine Zusammenführung allein über „blacksmith“ oder einen ähnlichen Namen.

Die Engine erfindet dafür keinen Verkäufer-NPC. Personen behalten normale Identität, Geschichte, Anwesenheit und persönliche Geschenke. Ein Wechsel von „die Schmiedin“ zu „die Händlerin“ soll aber einen bestehenden Standardkauf nicht ungültig machen, wenn derselbe Betrieb handelt.

**Dies ist eine echte, noch zu bestätigende Designänderung:** Standardhandel setzt einen erreichbaren, als bedient etablierten Betrieb voraus; nicht bei jeder Transaktion erneut die korrekte ID einer Nebenfigur. Ein geschlossenes, unbedientes oder aufgegebenes Geschäft darf nicht handeln. Ein Gerücht, Schild oder bloßer Arbeitsplatzvermerk begründet keinen bedienten Betrieb.

Betriebsstatus ist grob, keine Personalsimulation: offen/bedient oder geschlossen/unbedient. Explizit etablierte Schließung beendet die Verfügbarkeit. Das Verlassen durch den PC schließt keinen Laden. Aus „ein Mitarbeiter geht“ folgt nicht automatisch „alle Bedienung verschwunden“; ebenso wenig dürfen bekannte Schließung oder Tod des ausdrücklich einzigen Betreibers ignoriert werden. Keine automatische Wiederöffnung durch Wiederbesuch oder Zeitablauf.

### 4.2 Vorhandenen Ortszustand erweitern

Vorgeschlagene, kleine Shopmetadaten am kanonischen Place, **keine parallele state.shops- und Lagerdatenbank**:

- feste Shopkennung durch die vorhandene Place-ID;
- freigegebener Ladentyp / Sortimentsprofil;
- Betriebsstatus und Quelle seiner Etablierung;
- gespeicherter Katalog mit Revision, stabilen Artikelkennungen, Profilen und verbindlichen Kupferpreisen;
- freigegebene Ankaufskategorien und deren Preisregelversion.

Die genauen Feldnamen sind Implementierungsdetails. Geld, Eigentum und ausgeführte Geschäfte bleiben ausschließlich in den vorhandenen Events. Bereits gespeicherte Preise werden beim Laden eines Saves nicht aus inzwischen geänderten Contenttabellen neu berechnet.

Eine begrenzte neue Extractor-Deltaform kann Ort, Ladentyp, Betriebsstatus und exakte Erzählevidenz melden. **Sie liefert weder freie Preise noch Werte noch Kaufzustimmung.** World prüft Quelle, tatsächlichen Schauplatz, bestehende Ortsidentität und bestätigte Ankunft; erst danach schreibt es Shopmetadaten über die bestehenden Place-Events. Die Architektur von guild.branch ist ein Vorbild für funktionale Orte, keine zu duplizierende zweite Filialverwaltung.

## 5. Katalog, Angebote und Geld strikt trennen

### 5.1 Katalog ist keine Zahlung

Der Shopkatalog enthält Produkte und bekannte Preise. Er ist dauerhaft wiederverwendbar; ein konkretes angenommenes Angebot bleibt dagegen abgeschlossen.

Für eine neue ausdrücklich autorisierte Bestellung erstellt die Engine aus der passenden Katalogrevision ein **neues transaktionsbezogenes Angebot** mit genau diesen Positionen, Mengen und Gesamtsumme. Es benutzt die vorhandenen Offer-/Decision-/Transaction-Daten. Keine Reaktivierung eines alten accepted-Angebots und kein beliebiges Offenhalten desselben Kaufangebots für wiederholte Abbuchungen.

Die Angebotsidentität muss an die tatsächliche Spielerquelle und ausgewählte Bestellung gebunden sein; Regenerate derselben Quelle verwendet dieselbe Entscheidung, ein neuer Auftrag kann ein neues Angebot erhalten. Mehrere Kommandos für dieselbe wirtschaftliche Handlung derselben Quelle dürfen nicht mehrere Quotes erzeugen. Tatsächlich verschiedene Bestellungen bleiben möglich; die vorhandene Quellen-/Aktionsbindung wiederverwenden, kein Mengen-/Namensvergleich über spätere unabhängige Züge. Ein reiner Blick ins Sortiment erzeugt keine Geldbewegung.

Katalogartikel-ID und Angebots-ID haben damit unterschiedliche Aufgaben. Der Planner darf einen Artikel auswählen, aber keine verbindlichen Profile oder Preise mitschreiben. Die Umsetzung soll die vorhandenen buy-/sell-/offer.accept-Kommandos gezielt erweitern, statt ein zweites Kommandosystem einzuführen.

### 5.2 Konkrete Shopangebote markieren

Vorgeschlagene eindeutige Quelle am Offer: engine_shop, Referenz auf Shopwurzel und Katalogrevision. seller bezeichnet dabei den Betrieb. **Nicht einfach canon:true setzen:** Dieses Flag aktiviert heute Gildenhallenvoraussetzungen.

Der Shopzweig von offerAvailability prüft gespeicherten Betrieb, aktuellen kanonischen Ort einschließlich gültigem Verkaufsinnenraum, Betriebsstatus, verbindliche Katalogquelle und offenen Angebotsstatus. Er ersetzt die NPC-Präsenzprüfung **nur für solche Engine-Shop-Angebote**. Freie NPC-Angebote und persönliche Zahlungen erhalten keine Ausnahme.

Am letzten Buchungsübergang gelten weiterhin: vollständige passende Auswahl, tatsächliches Geld/Eigentum, erlaubte Mengen, gültige Quelle, aktuelle Zustimmung und einheitliche Buchung. Ein vom Extractor erfundenes source- oder shop-Feld darf diese Autorität nicht erzeugen.

### 5.3 Ein- und Verkauf

**Kauf:** bekannte Produkte und Gesamtpreis → tatsächliche Spielerzustimmung → engineerzeugtes Offer → vorhandenes bookPurchase. Bekannter Katalogpreis mal ausdrücklich ausgewählte Menge ist erlaubte deterministische Rechnung, kein S2-Prosa-Preisparser.

**Verkauf:** unterstützte, tatsächlich gehaltene Dinge und ausgewählte Mengen → passender Ankaufstyp → gespeicherter Engine-Gesamtpreis als bid → tatsächliche Annahme bzw. bereits vorhandene ausdrückliche Verkaufsautorisierung → bookSale. Der Business-Zweig muss dort dieselbe Shopverfügbarkeit erneut prüfen. Unbekannte Waren werden sichtbar nicht bewertet; kein stiller Rückfall auf erzählte Preise oder coin.gift.

**Preisregeln:** gearRetailPrice für vorhandenes F-Gear weiterverwenden. Andere Verkaufspreise und insbesondere Loot-Ankaufspreise brauchen ausdrücklich freigegebene Werte/Formeln. value_cp, Loot-Richtwert und tatsächlicher Ankaufspreis sind nicht automatisch identisch. Keine ungefragten Wirtschaftsfaktoren. Bei dauerhaft bestellbarer Standardware müssen Ankaufsregeln ungewollte positive Kauf-/Rückverkaufszyklen ausschließen; identische Ware darf nicht allein durch wiederholtes Kaufen und sofortiges Verkaufen unbegrenzt Geld erzeugen. Das ist eine Preis-Konsistenzprüfung, keine neue Händlervermögenssimulation.

**Preiszustimmung:** vorhandene Grenzen und D-/S1-/S2-Sicherungen gelten. Eine größere Menge oder ein neuer Preis darf nicht über einen ursprünglich engeren Auftrag bezahlt werden. any_price hebt kein vorhandenes max_cp auf. Kein stummer Teilkauf eines tatsächlich bestellten Pakets.

**Verkaufen und danach Kaufen:** Sind beide Handlungen unabhängig autorisiert, dürfen sie in einer Eingabe nacheinander über vorhandene Buchungsfunktionen laufen; der Kauf sieht den bereits gebuchten Verkaufserlös. Das macht zwei Geschäfte nicht automatisch zu einem all-or-nothing-Tausch. „Ich verkaufe nur, wenn ich dafür das Schwert bekomme“ ist eine verknüpfte Bedingung: im ersten Umfang vor jeder Teilbuchung klären, kein neuer Tausch-/Vertragsmechanismus.

### 5.4 Bereits bezahlte Erlöse und echte Geschenke

Geschäftsidentität darf keine Lücke bei den bestehenden Credit-/Nachzählungsprüfungen öffnen: Der Shop kann wirtschaftlicher Zahler sein, während der Narrator einen benannten Kassierer die Münzen aushändigen lässt.

bookSale/transaction.completed müssen den vorhandenen Credit so kennzeichnen, dass diese körperliche Aushändigung weiterhin derselbe Verkaufserlös ist. Kontext und Extractor erhalten die bereits gebuchte Transaktions-/Creditreferenz; repeat_of und trade_settlement erzeugen keine zweite Zahlung. **Die bestehende coinRefusal-Prüfung vergleicht unter anderem c.from === from; auf diesen NPC-Gleichheitsvergleich darf der neue Business-Pfad nicht allein vertrauen.**

Eine tatsächliche, gesonderte persönliche Dankeszahlung durch einen anwesenden NPC bleibt über coin.gift möglich. Nicht alle Geschenke desselben Mitarbeiters sperren. Quellen- und Handlungsbindung wiederverwenden, keine neue Kette sprachlicher Verkaufswortlisten.

## 6. Ablauf: erster Ladenbesuch und Wiederbesuch

| Situation | Engineverhalten |
|---|---|
| Bekannter, kanonisch aktueller und bedienter Laden | Gespeicherten Katalog bereits vor der Narration zeigen; eindeutige Bestellung kann sofort gebucht werden. |
| Spieler reist zu bekanntem Laden | Katalog darf vorab als Zielinformation erscheinen; Zugänglichkeit/Zahlung erst nach gültiger Ankunft prüfen. Keine Fernzahlung durch Vorschau. |
| Narrator etabliert erstmals einen Laden | Engine kennt die neue Funktion erst nach der Extraktion. Danach Shop und Katalog einmal speichern und autoritativ anzeigen. Eine garantierte Vorabkenntnis für diese erste Prosa ist ohne zusätzlichen Ablauf nicht möglich und wird nicht versprochen. |
| Erste Ankunft mit bereits klar begrenzter Kaufabsicht | Nach gültiger Ankunft/Shopetablierung dieselbe aktuelle bedingte Kaufentscheidung gegen passende Engineware prüfen. Reicht Zustimmung/Limit nicht, Angebot zeigen; kein automatischer Kauf. |
| Wiederbesuch / anderer Schalter / anderes Personal | Dieselbe Shopwurzel und Katalogrevision verwenden. Keine neuen Würfelangebote oder Tagesauffüllung allein durch den Besuch. |
| Geschäft geschlossen oder Ankunft abgewiesen | Keine Buchung; gegebenenfalls vorhandene Kataloginformation bleibt Wissen, keine aktuelle Kaufberechtigung. |

Die derzeitige automatische F-Gear-Erzeugung läuft am Ende von applyWorld. Sie muss für Engine-Shops in die Katalogversorgung überführt werden; nicht zusätzlich mit Tagesangeboten daneben laufen. Die vorhandene nachgelagerte bedingte Abwicklung aus settleCanonicalPurchases ist erst nach Shop-/Ankunftsprüfung zu erweitern. Ein gewöhnlicher klarer Einkauf braucht keinen neuen Pflichtzug und keinen zusätzlichen Modellaufruf.

## 7. Verhältnis zu bestehendem freien Handel

- Für als Engine-Shop freigegebene Standardware kommt das verbindliche Angebot ausschließlich aus dem Enginekatalog. Narrator-/Extractor-offer oder bid dürfen es nicht überschreiben, doppeln oder über eine andere Schreibweise umgehen.
- Eine reine Preisbehauptung wird dort zur unverbindlichen Erzählung bzw. einer knappen Enginekorrektur, **nicht** zum Anlass, denselben freien Preis immer wieder reparieren zu lassen. Ein echter Widerspruch über Ort/Betrieb/Spielerzustimmung bleibt gesondert zu prüfen.
- Verkäufe benötigen keine NPC-erzählte Gebotssumme mehr. Shopankauf ist ein vorhandenes Engine-bid, kein Geschenk.
- Gildenregistrierung, Gildenmanuals, Dungeongebühren, Questbelohnungen, freie #pay-Karten und persönliche NPC-Geschenke bleiben Fachwege.
- Besondere individuelle Abmachungen außerhalb des ersten Umfangs bekommen keine automatische Engine-Shop-Bewertung. Eine spätere Ausnahmeregel braucht eigene Abgrenzung; kein stiller Wechsel zum alten Standardhandel nach einer Ablehnung.

Einführung empfohlen zunächst für ausdrücklich neue Kampagnen, mit einem am campaign.started fixierten Handelsmodus. Das ist eine kleine Variantenkennung, kein allgemeines Featureflag-Framework. Bestehende .146-Runs dürfen für den Vergleich weiterlaufen; keine rückwirkende Umschreibung veröffentlichter Angebote oder Walletwerte. Alte Formate müssen dafür nicht umfassend migriert werden.

## 8. Technischer Umsetzungsschnitt – ein Fachpatch

| Schritt | Betroffene Stellen | Konkreter Inhalt |
|---|---|---|
| 1. Regeln und Quelldaten festlegen | content/gear.json, content/rules.json; vorhandene Profile aus items.js | Unterstützte Shoptypen, Standardartikel, Ankaufskategorien und freigegebene Preise; keine neuen Slots. Referenzszenarien und Freigabe aus §10 zuerst festhalten. |
| 2. Shopidentität / Etablierung | content/deltas.json, src/v4/extract.js, world.js, domain.js, ownership.js, validate.js | Kleine funktionale Shopmeldung samt Evidenz; kanonischen Ortswurzelbetrieb speichern. Keine Preis-/Buchungsrechte des Extractors. Zustand und Ort eindeutig validieren. |
| 3. Katalog und Angebotsbildung | items.js; ggf. ein kleines shops.js für reine Shopfunktionen | Existierende Profile/Preise verwenden, Katalog einmal persistieren. Angebotsquelle und neue Bestellungen deterministisch binden; kein zweites Inventory-/Walletmodell. Neue Datei nur bei tatsächlich besserer Lesbarkeit. |
| 4. Fachbuchung anschließen | commands.js: buy/sell/offer.accept; trade.js: offerAvailability/bookPurchase/bookSale | Business-Referenz gezielt auflösen; Berechtigungen und Summen erneut prüfen. Persönliche NPC-Fälle unverändert. Bestehende Funktionen statt zweiter Buchungsengine. |
| 5. Ankunft und Kommunikation | world.js: arrive/settleCanonicalPurchases; catalog.js, planner.js/interpret.js, items.js: offerCard(), src/context.js, src/display.js | Vorhandene bedingte Entscheidungen nach bestätigter Ankunft erfüllen. Katalog/Preis/gebuchte Ergebnisse sichtbar; natürliche Warenwahl und kombinierte Handlungen erhalten. |
| 6. Preisprosa ablösen | world.js: offerLines/bid/coinRefusal; extract.js; openEquipmentStock | Standardshop-Prosa hat keine Angebotshoheit mehr. Alte F-Tagesangebote hier nicht parallel erzeugen. Credit-/Kassiererbindung und echte Extrageschenke absichern. |
| 7. Abnahme und Doku | vorhandene Tests und tools/st_live | Originalketten, negative Gegenfälle, vollständige Node-Suite, Replay und echte Host-Smokes; ein Produktbuild, eine Fachpatchnote. |

Abhängigkeiten: Shopidentität und Katalog vor Businessbuchung; Buchung vor kombinierter Ankunftsabwicklung; Ablösung des alten Standardpfads vor natürlichem Vergleich. Kein großer Umbau der restlichen Finanzarchitektur und keine unabhängig veröffentlichte Mikrofixserie.

## 9. Regressionen und Abnahmekriterien

**Zuerst rote Fälle auf der freigegebenen Basis, danach grün; positive Kontrollen nicht künstlich umschreiben.**

1. Batch21 T40–56 als Integrationsvorbild: tatsächliche Wiederkehr in denselben Shop, vorhandene Ersatzrüstung verkaufen, ausreichend Geld, passende260cp-Waffe kaufen/ausrüsten, normal weiterspielen. Shop funktioniert auch bei bloßem Personalbezeichnungswechsel; kein Phantom-NPC.
2. Erstbesuch, entfernter Bericht, abgewiesenes GO, neues Verkaufszimmer desselben Ladens, zwei echte verschiedene Läden sowie ausdrücklich geschlossener/unbedienter Betrieb.
3. Erzählter180cp-Preis ändert keinen gespeicherten260cp-Preis. Menge2 benutzt den bekannten Artikelpreis; Ware/Qualität/Slot/Profile bleiben unverändert. Auswahl mehrerer Artikel ist vollständig oder vor der Buchung geklärt.
4. Template-Inventar, physische Objekte, Teilmengen, fehlende Ware, ausgerüstete Gegenstände, begrenzte Kaufkraft und unzulässige Käuferkategorien.
5. Neue unabhängige zweite Bestellung ist möglich; wiederholte Annahme einer bereits geschlossenen konkreten Offerte zahlt nicht erneut. Doppelte Kommandos derselben wirtschaftlichen Handlung, Regenerate, Swipe, Edit, Delete und Reload erhalten die Quellen-/Fold-Sicherungen.
6. Verkaufserlös durch einen benannten Kassierer wird nicht zusätzlich als coin.gift bezahlt. Gleichzeitiges und späteres echtes persönliches Geschenk bleibt möglich; Versprechen zahlen nichts.
7. Keine Zustandsänderung aus reinem Browsen, Katalogvorschau, unbekanntem Preis oder nicht autorisiertem Paket. Bei ausdrücklich verknüpftem Tausch keine einseitige Teilbuchung.
8. Altpfade: Registrierung, Manuals, Dienste, Guild-Reward und S1/#pay weiter korrekt; bestehende .146-Angebote werden nicht neu bewertet. Konsistenztest für Kauf/Rückverkauf desselben Standardartikels: kein positiver Geldkreislauf durch feste Katalogpreise.

**Technische Abnahme:** Vollsuite und Fingerprint-Replay, wirtschaftliche Änderungen einzeln begründet, frühere Listen nicht pauschal überschreiben. Echte ST-Standard-/Failsoft-Smokes plus mindestens eine Shopfolge mit Erstetablierung, Wiederbesuch, Verkauf/Kauf, Reload und anschließendem normalen Spielzug. Modellanzahl und Speicherabschluss gesondert prüfen; ein Node-Mock beweist keine natürliche Modellqualität.

**Natürlicher Vergleich:** .146 als Ausgangsdaten behalten. Messen: Inputs bis gültigem Geschäft, erfolgreich erworbene/ausgerüstete Ware, Preis-/Präsenzrepairs, Wiederholung desselben Ablehnungsgrundes und aktive Spielhandlungen bis Level15/E-Annahme. Ziel: kein systematischer Geld-/Eigentumsfehler und keine wiederkehrende Sackgasse im Standardhandel. Seltene lokale Prosaunschönheiten bleiben toleriert. Keine Prozentverbesserung oder neue numerische Abbruchschwelle als bereits bewiesen/beschlossen ausgeben.

## 10. Vor Implementierung zu bestätigende Designentscheidungen

| Entscheidung | Empfehlung dieses Entwurfs | Konsequenz |
|---|---|---|
| Ist Engine-Shop nur Notfall oder regulärer Standardhandel? | Regulärer Weg für den ausdrücklich definierten Shopumfang, kein automatischer technischer Fallback. | Dort keine konkurrierenden freien verbindlichen Preise. |
| Wer ist Handelspartner? | Der kanonische bediente Laden, Personal bleibt erzählerisch/persönlich. | Bewusste begrenzte Ablösung der wiederholten NPC-ID-Prüfung für Standardgeschäfte; keine erfundene NPC-Anwesenheit. |
| Warenverfügbarkeit | Kleiner persistierter Standardkatalog ohne endliche Händlerlager-/Nachschubsimulation. | Neue Bestellungen erhalten eigene Angebote; keine gratis/doppelte Buchung. Begrenzte Einzelstücke bleiben außerhalb. |
| Ankauf | Definierte Standardloot-Kategorien und passende Ladentypen; vorhandenes F-Gear-Verkaufspreissystem erhalten. | Ankaufspreise/Formeln und Umfang verkäuflicher Alt-Ausrüstung müssen ausdrücklich festgelegt werden. |
| Preisverhandlung | Im ersten Umfang keine verbindliche Preisverhandlung. | Dialog frei; akzeptieren oder anderes Angebot suchen. Spätere Rabatte nur als neue Engineofferte nach eigener Freigabe. |
| Neue Kampagnen / Bestand | Neue Kampagnen mit festem Handelsmodus; laufende Vergleichsbatches unverändert lassen. | Keine Pflichtmigration aller früheren Kampagnen. |

**Einordnung:** Mittlerer, begrenzter Fachpatch mit hohem Nutzen für Standardgeschäfte, kein Zwei-Zeilen-Hotfix. Ein besseres Preisangebot allein löst NPC-/Ort-/Eigentumsfehler nicht; die geplante Geschäftsidentität und gemeinsame Buchungsgrenze sind deshalb wesentlich. Der .146-Batch muss für diese Planung nicht verschoben werden. Eine Umsetzung benötigt weiterhin ausdrückliche Freigabe; finanzielle Werte und die obigen Designentscheidungen werden durch dieses Dokument nicht verbindlich.
