# Batch26 — Originalreview .152: kein technischer Endabbruch, ein lokaler Objektintegritätsfehler

03.11.2026. Quelle: Chatupload `batch-20261103-015806Z.zip`. Alle Profile auf **4.3.0-c.6.6.152 / 339f88a5165fd120e4babfdb4f4c82dafbf9e485**, sauberer Produktbranch; aktueller Produkt-HEAD identisch. 01 und 03 auf main gelesen. **Nur Analyse und Dokumentation; kein Produktpatch, keine Testsuite und kein neuer Livebatch.**

**Gesamturteil:** Deutlicher technischer Fortschritt: drei Läufe ohne erzwungenen Endabbruch, Warrior/Mage mit ausdrücklicher E-Klassenannahme und sieben sicheren Fortsetzungen. Der .152-Kartenfix wird erstmals natürlich positiv getroffen. Trotzdem nicht „vollständig fehlerfrei“: Beim Warrior entstehen durch eine falsche Objekt-/Template-Referenz zwei physische Rüstungsobjekte aus einem. Die Endvalidierung verdeckt den zwischenzeitlichen Fehler. Das ist ein enger Objektidentitätsdefekt, kein Grund für die nächste umfassende Finanz- oder Parserprüfung.

## 1. Quelle, Methode und Grenzen

- ZIP **119.337.409 Bytes**, SHA-256 `c58f4717b20b5463a994ad8a6e651e6d6ad50c3754bce2cc6de1ba05fc5b4bac`, vollständiger CRC-Test ohne Fehler.
- Originalchats und gespeicherte Events, run/evaluation, Playerentscheidungen, Completion-Requests/-Antworten sowie relevante Codepfade geprüft. Alle drei separaten Eventexports stimmen mit den Chatrecords überein.
- Jeder Eventrecord unabhängig reduziert und danach `validateState()` ausgeführt; zusätzlich vollständiger `foldChat()` mit Host-/Quellenprüfungen. Temporäre Originalvorzustands-Reproduktionen für den Rüstungsfehler; keine Veränderungen der Originalarchive oder Produktdateien.
- **I** = nullbasierter Chatindex ohne JSONL-Metadatenkopf; **T** = Spielereingabe, nicht Engine-Turn. Validierung pro Record ist nicht dasselbe wie nur der gültige Endzustand.
- Noch kein separater Review dieses Batches auf main vorhanden. Die automatischen Findings sind Prüfhinweise, keine übernommenen Diagnosen.
- Die ZIP ist aus dem Chatupload unabhängig geprüft, **nicht als GitHub-Binärarchiv hochgeladen**. Spätere Gegenreviews benötigen für eine eigene Originalprüfung diesen Export; die Reviewdatei allein ersetzt ihn nicht.

## 2. Ergebnisse und Stabilitätsmaßstab

| Profil | Inputs / Engine-Turns | Levelziel → Ende | Endgrund | Unabhängige Integrität |
|---|---:|---|---|---|
| Warrior | 338 / 309 | L15 T324 → Unbroken Bulwark T338 | Regulär done | Endfold/Endstate gültig; I479/I480 lokal ungültiges Inventar, danach zwei Rüstungsobjekte statt eines |
| Mage | 183 / 155 | L15 T180 → Ley-Attuned Savant T183 | Regulär done | Alle geprüften Recordzustände und Endfold fehlerfrei |
| Rogue | 131 / 114 | L10 | Tod beim Angriff auf sechs Boars | Alle geprüften Recordzustände und Endfold fehlerfrei |

**652 Inputs, 578 Engine-Turns, 8.685 exportierte Events.** Keine Foldfehler in den drei Endchats; 2/3 Läufe mit durchgehend fehlerfreier Statevalidierung, ein weiterer mit lokalem Integritätsfehler. Keine PageErrors laut natürlichen Runexporten. Die separaten Servermeldungen/Providerprobleme wurden überwunden.

Damit **0/3 technische Endabbruchfälle, 2/3 reguläre Zielabschlüsse, 1/3 regelgerechter Tod**. Das ist ein guter neuer Langlaufnachweis, keine allgemeine Zuverlässigkeitsquote und kein automatischer Abschluss von 10B. Insbesondere darf die grüne Endintegrität des Warrior nicht als Beleg eines durchgehend fehlerfreien Verlaufs gelten. Kleine lokale Fehler und harte Stopper bleiben getrennte Kategorien.

## 3. .152 und sichere Modellfortsetzungen

### Natürlicher positiver Nachweis des Kartenfixes

**Warrior T18/I35:** „I pay the carter two copper for the dawn ride, then go to the inn …“. Engine eröffnet `dec.pay.t18.1` an der tatsächlichen Spielernachricht. **I36** bestätigt die Ankunft `loc.colders_cross.the_inn_at_colders_cross`, emittiert `decision.closed/expired`, eröffnet die freie Karte **nicht** im Assistantrecord neu. Keine Abbuchung und kein Foldfehler; der Lauf geht weiter. Genau die in Batch25 fehlerhafte Kombination funktioniert nun natürlich.

Weitere freie Karten verfallen beim nächsten handelnden Input: Warrior I235→I237 und I357→I359, Rogue I87→I89. Diese Fälle sind **nicht** zusätzliche Beweise derselben Arrival-Grenze. Es gibt in der Transaktionsaufstellung keine native #pay-Auszahlung. Ein Narrator, der dennoch Münzen als bezahlt beschreibt, ersetzt die fehlende Bestätigung nicht.

### Sieben sichere Fortsetzungen

| Profil / Stelle | Belegter Fehler | Verhalten / Bewertung |
|---|---|---|
| W T133/I266 | Extractor: fehlendes `scene`, bekannte Person unzulässig neu eingeführt; eine Repairantwort erschöpft 4000 Tokens, letzte Antwort weiterhin unzulässig | Worldbericht verworfen, bereits gebuchter Kampf bleibt; weitergespielt |
| W T134/I268 | Repair ohne erforderliches `deltas`-Array | Worldbericht verworfen; zweiter sicherer Weiterlauf, kein Runstop |
| W T185/I369 | Planner belegt „the supper for 2“ ohne Währung nicht eindeutig | Kein Engineevent; neue Entscheidung statt stiller Zahlung |
| M T47/I93 | Ungültige explizite AoE-Zielliste nach Repair | Kein Skill ausgeführt; sichere neue Entscheidung |
| M T62/I124 | Ungültige Objekt-ID in einem Verkaufsgebot, eine leere/length-Repairantwort | Keine aus dem ungültigen Worldbericht erfundene Verkaufsauszahlung; Weiterlauf |
| R T84/I167 | Ungültige AoE-Zielliste | Kein Engineevent; sichere Fortsetzung |
| R T92/I183 | „260 plus 72 … 3 Silver 32 Copper total“: Planner meldet 332, zitierter Währungsbetrag entspricht 62 | Echte widersprüchliche Spielerpreisangabe; korrekte Klärung statt Buchung nach Wunschzahl |

Die vier Planner-Nichtausführungen haben jeweils leere Eventlisten, die drei verworfenen Worldberichte nur ihren Fehlerrecord. Die tatsächlichen Playeraktionen werden nicht automatisch doppelt ausgeführt. Keine neue generische Recovery-Schicht aus diesen Fällen ableiten.

Zusätzlich gelingt die **bestehende** einmalige Planner-Transportrecovery: W T189 zunächst HTTP502/ETIMEDOUT, danach gültig; M T75 zunächst Timeout nach120s, danach gültige Antwort. Das ist **kein** natürlicher Nachweis der .151-Klassifikation für zweimaliges natives `Failed to fetch`: Dieser genaue Fehler tritt hier nicht auf.

Archiviert sind **1.018/520/371 Spielmodellrequests** W/M/R. Zwei Extractorantworten mit `finish_reason:length` (W T133, M T62), keine belegte generelle Planner-Reasoning-Erschöpfung. Längste gemessene Narratoranfragen etwa104,4s/206,8s/95,1s. Lange Providerantworten, Schemafehler und Statefehler getrennt bewerten; die Latenzen führten hier nicht zum Endabbruch.

## 4. Bestätigter lokaler Defekt: dynamische Rüstung als Templatealias verarbeitet

### Originalablauf

**Warrior T240/I479**, nach Kauf einer Superior-Mail und Kontrolle mit `#equipment`:

> I put on the superior chain mail I just bought and ask the smith to take the old fine mail as trade or store it for me.

Der gespeicherte Planner liefert zuerst `equip obj.t251.superior_f_rank_chain_mail`, danach `give item.obj.t143.fine_f_rank_chain_mail` an den anwesenden Schmied. Die ältere Superior-Mail war bereits im Besitz; ein später noch einmal gekauftes gleichwertiges Stück ist eine eigene Ware, keine doppelte Buchung desselben Kaufs.

1. EQUIP zieht das vorher getragene Fine-Objekt `obj.t143.…` korrekt in den PC-Besitz zurück (`object.moved`) und rüstet die Superior-Mail aus.
2. GIVE verarbeitet `item.obj.t143.…` als Sheet-Template: `item.changed -1` entfernt den Inventareintrag, `object.created obj.t479.…` erzeugt beim Schmied eine neue Rüstung.
3. Das echte alte Objekt bleibt zugleich mit **holder PC, qty1, aber ohne Inventareintrag** bestehen. `validateState()` meldet nach **I479 und I480** exakt diesen Fehler.
4. **T241/I481** akzeptiert der Spieler ein Gebot über4cp. `bookSale()` sieht am Original weiterhin `holder PC/qty1`, bewegt es ebenfalls zum Schmied und zahlt4cp. Danach ist die lokale Statevalidierung grün, weil beide Objekte beim NPC liegen. Die vorherige falsche Verdoppelung wird dadurch nicht rückgängig gemacht.

**Kein doppelter Transaktionsrecord und keine zweite4cp-Auszahlung:** Die ökonomische Inkonsistenz besteht darin, dass ein bereits als übergeben gebuchtes Stück nochmals als eigener Bestand verkaufbar bleibt. Es liegen am Ende zwei Objektidentitäten aus derselben physischen Rüstung vor; eine Kopie hat außerdem nicht das originale vollständige Gearprofil. Aus einem konsistenten Wallet folgt hier keine konsistente Eigentumsbuchung.

### Exakte Codeursache

- `src/v4/catalog.js:sheetObjects()` um180–188: Getragene dynamische Gearobjekte werden mit `item.${ref.id}` ausgeschrieben. Das legitime Modell bekommt also selbst `item.obj.…` als erlaubte Referenz.
- `src/v4/trade.js:tradeObject()` um312–320: Jedes `item.` wird als Template gelesen, obwohl der Suffix eine vorhandene physische `obj.`-Identität sein kann. Nach dem vorangegangenen EQUIP existiert deren Inventarzahl; der falsche Templatezweig wird dadurch ausführbar.
- `src/v4/commands.js:give()` / `transferTemplate()` um840 bzw.160: Verwendet `o.template` und erzeugt eine neue physische Einheit, statt das bestehende Objekt über `transferCargo()` zu bewegen.
- `trade.js:heldUnits()` / `bookSale()` um323/349: Der spätere direkte Objektpfad vertraut dem noch bestehenden PC-Holder. Das macht den liegengebliebenen Originaldatensatz wieder verkaufbar.

Das ist eine **inkonsistente Referenz-/Repräsentationsgrenze zwischen getragenem Gear, Sheetinventar und physischen Objekten**, kein fehlerhafter Preisparser. Der Planner folgt hier dem Katalog; es ist nicht ausreichend, ihn nur zu „besseren IDs“ aufzufordern.

### Read-only-Reproduktion und Gegenhypothese

Originalchat bis I478 fehlerfrei gefaltet. Anschließend I479 mit originalem Spielertext und originaler Plannerantwort erneut durch `prepareGenerationAsync()` ausgeführt: genau eine Plananfrage, `action:context`, kein Foldfehler, aber reproduzierbarer Inventar-/Holderfehler. Originalgebot I480 und Annahme I481 anschließend wieder durch den Produktpfad:4cp Zugang und zwei Objekte beim Schmied, Statevalidator wieder grün. Kein Produktcode und kein Originalrecord verändert.

Gegenprobe: Nur die Planner-ID durch das rohe `obj.t143.…` zu ersetzen, reicht im vollständigen Hostpfad **nicht** — dieser getragene Gegenstand ist vor der Handlung unter dieser ID nicht im zulässigen Objectkatalog, der Planner-Parse lehnt ihn ab. Auf der **direkten Command-Ebene** zeigt derselbe Equip→Give-Ablauf mit kanonischer Objekt-ID dagegen den vorhandenen korrekten Transferpfad: ein Objekt bewegt, keine Kopie, State gültig. Das grenzt die Ursache auf die Referenzübersetzung ein; es ist kein Beweis, dass eine bloße Promptänderung genügen würde.

### Bewertung und begrenzter Lösungsweg

**Realer P2-Integritätsfehler, für den nächsten gezielten Technikpatch empfohlen.** Der konkrete Lauf bleibt fortsetzbar; belegte Geldgröße4cp und ein zusätzliches NPC-Objekt. Keine große Geldkaskade oder unbegrenzt wiederholte Ausnutzung in diesem Export nachgewiesen. Nach dem vom Nutzer gewünschten Toleranzmaßstab kein gleichwertiger schwerer Runstopper wie Batch25, aber auch kein harmloser Erzählfehler.

Empfohlen: dynamisches Gear über getragen→abgelegt→übertragen/verkauft an **derselben physischen Identität** halten. Katalog und bestehende Objektauflösung müssen dieselbe Referenzbedeutung haben; `item.<echtes Template>` bleibt für normale Sheetwaren zulässig. Kontrollierte Aliasauflösung und Mengen-/Buchungspfad gemeinsam prüfen, nicht nur den Katalogtext ändern oder `item.obj.*` ungeprüft als neue Ware akzeptieren. Vorhandene Transfer-/Sale-Funktionen wiederverwenden. Kein allgemeines Eigentumsframework, keine neuen Preisregeln.

Abnahme eines später freizugebenden Fixes: Original-I479→I481; Equip→Give/Drop/Sell in kombinierten und getrennten Inputs; nur eine physische Einheit, gültiges Inventar nach jedem Record, kein Verkauf einer bereits übertragenen Einheit; echte Templates, Objektstapel und mehrere tatsächlich erworbene Einheiten bleiben nutzbar. Getragene Ware darf erst durch den erlaubten Equip-/Unequip-Ablauf in den Transfer gelangen. Replay/Reload und neue/alte Aliasreferenzen ausdrücklich abgrenzen.

## 5. Handel, Guild, Dungeon und Spielerschleifen

**70 Transaktionen:** 31 Käufe einschließlich Registrierungen/Services, 16 Verkäufe und23 Guildauszahlungen. Keine doppelte identische Angebots-/Zeilentransaktion oder Questauszahlung gefunden. Wallet-Rechnung aus Start50 und protokollierten Coin-Änderungen stimmt mit **W125/M1121/R71cp** überein. Der Objektfehler aus §4 bleibt trotz dieser Zahlen bestehen.

Gearkäufe/-ausrüstung sind natürlich belegt: W Superior Longsword und Superior Chain Mail; M Fine Staff/Fine Robes; R Superior Dagger/Common Jerkin. Kein neuer allgemeiner Kauf- oder Paketpreisstopper. Der Warrior kauft teils gleichwertige Ware nochmals, weil er offenbar getragenes und bereits gekauftes Gear nicht ausreichend vergleicht; das ist kein Beweis für eine doppelte automatische Kaufbuchung.

**Warrior T174–183: unnötige Register-/Gebührenschleife.** `#quest Barrow Boars in the Field Margins` zeigt I350 ein abgeschlossenes3-Boar-Geschäft. Das ist korrekt: genau dieser Vertrag wurde bereits **I316 mit140cp ausgezahlt**. Ein anderer aktiver Vier-Boar-Kontext und die Erzählung werden damit vermischt. Der Narrator erfindet eine „dropped record“-Reparatur, Registry und Verifikationsgebühr; der Player folgt dem, statt die bestätigte Auszahlung und richtige aktuelle Quest auseinanderzuhalten. Keine fehlende Auszahlung und kein belegter Fehler dieses konkreten #quest-Panels. Die geprüfte Hypothese „der Panelresolver wählt hier eine gleichnamige falsche Quest“ bestätigt sich nicht: Zum betreffenden Zeitpunkt existiert nur dieser eine Vertrag mit exakt diesem Titel. Die falsche Gebühr wird nicht abgebucht. Spielgefühl/Pacing schlecht, aber kein Anlass für eine weitere automatisierte Auszahlung oder neue Gebührenmechanik.

Mage-Boards scheitern T3 und T55 einschließlich Repair, später kommen gültige Boards. Generator-/Repair-Reibung gesondert beobachten; die Ablehnung eines Boards allein beweist keinen unberechtigten Engine-Guard. Keine Quest-/Board-Umgestaltung aus diesem Batch freigegeben.

Das automatische Mage-Finding „3 unslotted Dungeon creatures“ betrifft **einen** Extractordelta mit drei eingepferchten swamp-fowls, ausdrücklich `threat:false` und `population:independent` (T37/I74). Das ist die bekannte Neutralfauna-Ausnahme, keine zweite reguläre Slotgegnergruppe. Der Anchor `feline` für Vögel ist eine schlechte Modellzuordnung, aber kein neuer belegter Dungeon-Doppelspawn. Diese Ausnahme wurde bewusst vorerst beibehalten; nicht aus dem Finding automatisch einen Spawn-P1 ableiten.

## 6. Rogue-Tod: tödliche Gruppe, aber auch eine Awareness-Lücke im Modellbericht

PC L10 startet T131 mit **96/140HP** gegen sechs sichtbare Orchard Boars: L8,9,9,10,11 und einen starken L11 mit148HP/ATK42. Der Auftrag ist als `dangerous` eingeordnet. Der Narrator verrechnet sich bei der Gruppenzahl sprachlich; das Enginepanel vor dem Angriff zeigt korrekt **„6 visible“**, alle sechs HP-Werte und SHORT. Vertragsziel5 bedeutet nicht automatisch eine Fünfergruppe oder einen sicheren Solokampf.

Fan of Blades trifft regelgerecht alle sechs Gegner im SHORT-Band, verursacht57–71 Schaden und tötet keinen. Die ersten drei Überlebenden handeln **einmal in Round1**:39,30,28 Schaden, HP96→57→27→0. Kein Phantomgegner, keine zusätzliche Kampfrunde, kein Fehler der Flächenregel nachgewiesen.

Der als Hinterhalt formulierte Angriff erhält **keinen Ambushbonus**, weil der gewählte Sow-Target mechanisch `unknown` ist. Der vorherige Extractor meldet nur den großen Boar ausdrücklich als `unaware`, nicht die dozing Sow oder die übrigen vier Tiere. Die vorherige Stealthprobe war vor deren Materialisierung automatisch erfolgreich („nobody present to notice“). Daher nicht pauschal behaupten, die ganze beabsichtigte Hinterhaltslage sei technisch als solche etabliert gewesen. `combat.js` liest die gespeicherte Awareness des konkreten Ziels korrekt; die Lücke liegt in der Übersetzung der erzählten Lage. Kein automatischer Ambush aus dem Wort „dozing“ und kein neuer Regex-Fix empfohlen. Einfluss einer korrekt anders etablierten Awareness auf den gesamten Kampf hier nicht als Gegenfaktum gemessen.

Auch die Erholung blieb unvollständig: T120 „find inn, take room, sleep“ verweigert Kauf/Schlaf zunächst wegen `arrival pending`; die Erzählung behauptet anschließend Bezahlung. Es gibt dort keine entsprechende Zahlungs-/Recoverybuchung. T121 zieht der Spieler weiter, statt die offenen Voraussetzungen zu erfüllen. Der HUD-HP-Stand ist maßgeblich. Die gemeinsame Ursache des Todes ist somit eine gefährliche Gruppe bei unvollständiger Erholung und ein nicht tatsächlich gebuchter Ziel-Hinterhalt — kein belastbarer pauschaler Rogue-Klassenvergleich.

## 7. Pacing, Skillwachstum und nächste Schritte

| Profil | Combat-XP / Quest-XP | Gewonnene Kämpfe | Hauptfortschritt am Ende |
|---|---:|---:|---|
| W | 8280 / 3285 | 20 | BasicP4/48PP, CleaveP2/69PP, Quick SlashP1/18PP |
| M | 6780 / 4320 | 18 | BoltP3/8PP, WaveP2/15PP |
| R | 2775 / 1730 | 8, danach Tod | Razor CutP2/4PP, FanP1/36PP |

Warrior benötigt338 Inputs, Mage183, obwohl beide eine ähnliche Gesamt-XP-Menge für L15 sammeln. Beim Warrior sind9/12 abgeschlossene Quests Level1/minor, drei Level5/standard; dazu Reisen, Handelsanläufe und die falsche Registryschleife. Mage erhält mit weniger Abgaben mehr Quest-XP. Das spricht stärker für **Wahl/Pacing/Inhalt** als für eine allgemein zu hohe Levelkurve. XP×5 deshalb jetzt nicht erneut pauschal erhöhen.

L15→E: W14 zusätzliche Inputs, M3. Die .151-Erinnerung ist im unveränderten Runner vorhanden, erzwingt aber keine Entscheidung. Die Playerlogs archivieren den vollständigen Entscheidungsprompt nicht; die tatsächliche Reminderzeile wird deshalb nicht als aus einem Originalrequest gelesener Nachweis ausgegeben. Keine garantierten Klassenangebote oder automatische Annahme ergänzen.

29 tatsächliche AoE-Aktionen (W14/M11/R4), kein NPC in diesen Trefferlisten. Das ist ein weiterer positiver Naturbefund, keine vollständige Gegenprüfung aller Same-band-/NPC-AoE-Szenarien. Keine gezeigte Fähigkeit erreicht hier P5; eine fehlende Skill-Evolution ist deshalb kein belegter Buchungsdefekt. Das längerfristige F-Skillpacing bleibt ein späteres Designthema, nicht durch diese Review neu entschieden.

**Priorisierung:**

1. **Nächster begrenzter Technikpunkt:** Objekt-/Templatealias aus §4 konsistent behandeln und am Original-Hostpfad regressieren. Keine erneute Finanz-Gesamtprüfung; keine Implementierung ohne Freigabe.
2. **Weiter natürlich beobachten:** korrekt etablierte Awareness/Hinterhalte, optionale Gebührenerzählungen und ein wirklich gebuchter Schlaf; daraus nicht sofort weitere Wortlisten oder verpflichtende Player-Routinen ableiten.
3. **Beibehalten:** aktuelle XP-/PP-/LP-Werte, Preise, AoE, Kampfreihenfolge, .151/.152 und freie Etappenwahl. Keine vorsorgliche neue Reihe von Mikrofixes.

**Abnahmeurteil:** Batch26 belegt erstmals in dieser aktuellen Folge drei Enden ohne technischen Zwangsstopp und zwei vollständige F→E-Kampagnen. **Runfortsetzbarkeit deutlich verbessert, Integrität aber nicht perfekt.** Der lokal begrenzte Rüstungsfehler ist nach dem vereinbarten Toleranzmaßstab kein automatischer Grund, natürliche Datensammlung komplett anzuhalten. Für den nächsten gezielten Codepatch sollte er dennoch sauber geschlossen werden. Ob diese Serie für den formalen Abschluss von10B genügt, bleibt eine ausdrückliche gemeinsame Nutzerentscheidung.

---

## 8. GPT-Gegenreview – unabhängiger Codeabgleich und 10B-Stabilitätswertung (03.11.2026)

**Prüfumfang und Grenzen:** Den vollständigen Sol-Originalreview §§1–7 gelesen; aktuelle Produktbranch-Version .152 (`339f88a`) mit GitHub abgeglichen und die betroffenen Codepfade eigenständig untersucht: `src/v4/catalog.js:sheetObjects`, `src/v4/trade.js:tradeObject/heldUnits/bookSale`, `src/v4/commands.js:give/drop/transferTemplate`, `src/v4/domain.js:object.created/object.moved/mirror` sowie `src/validate.js`. **Die originale 119-MB-ZIP liegt nicht im Repository und wurde von GPT nicht erneut eingelesen oder abgespielt.** T-/I-Belege, Event- und Finanzsummen, Gegenproben am Originalprefix, sieben Recoverybelege und exakte Endegründe stammen aus Sols Originalprüfung. Diese Ergänzung ist eine **unabhängige statische Code- und Fachgegenbewertung**; kein neues Node-/Replay-/ST-Testergebnis und kein Produktpatch.

### 8.1 10B: technischer Endabbruch und Integrität getrennt zählen

**Batch26 ist ein deutlicher Stabilitätsfortschritt, aber nicht vollkommen fehlerfrei.**

| Kennzahl | Bewertung |
|---|---|
| Technisch erzwungener Endabbruch | **0/3** – Warrior und Mage regulär nach E-Klassenannahme abgeschlossen; Rogue durch regelgerechten Kampftod beendet |
| Sichere Modellfortsetzungen | **7** – laut Originalreview vier Planner-Nichtausführungen und drei verworfene Worldberichte, jeweils ohne illegale Engineausführung oder Doppelbuchung |
| Durchgehend gültige Recordzustände | **2/3** (Mage, Rogue); beim Warrior **I479/I480 tatsächlich ungültige Zwischenzustände**, anschließend wieder gültiger Endfold/Endzustand |
| Schadensklasse des Warrior-Befunds | **Fortsetzbarer, aber integritätsbeschädigender technischer Vorfall** – nicht bloß kosmetisch und nicht technisch erzwungener Abbruch |
| Natürlicher Nachweis .152 | Freie Zahlkarte verfällt am Ankunftsort ohne erneute Eröffnung, ohne Debit und ohne folgenden Foldstop; **positiv bestätigt** |

Für die 10B-Quote sind somit mindestens **drei Auswertungsachsen** nötig: (1) ohne technischen Endabbruch; (2) ohne gravierenden Zustands-/Buchungsintegritätsfehler; (3) sichere fortsetzbare lokale Modell-/Providerfehler und ihre Häufung. **Ein grüner Endfold allein ist kein Beleg durchgehender Integrität.** Bei Warrior bleiben die frühere Inventarverletzung und die künstlich verdoppelte physische Rüstung bestehen, obwohl später beide Rüstungsidentitäten beim Schmied liegen und der Validator wieder grün meldet. Die 70 ledgerkorrekten Transaktionen widerlegen diese Eigentumsabweichung nicht.

In den unmittelbar vorausgegangenen Batches23–25 trat jeweils ein technischer Endstopper auf; Batch26 ist in dieser Folge der erste Batch ohne einen solchen Stopp. Die Builds, Laufdauern und Fehlerbedingungen unterscheiden sich, weshalb daraus **noch keine belastbare produktbezogene Erfolgsquote und keine automatische 10B-Abschlussentscheidung** abzuleiten sind. Der Fortschritt ist trotzdem konkret und für das gesetzte Ziel relevant.

### 8.2 Objektidentität: Sols Diagnose wird durch die Codeverträge bestätigt

**Katalog vs. Auflösung:**
- `catalog.js:sheetObjects()` listet die am Körper getragenen Gearreferenzen als `item.<ref>`, also bei dynamischem Gear auch als **`item.obj.<physische-id>`**. Das ist ein vom System selbst angebotener Katalogeintrag; nicht automatisch eine frei erfundene Modell-ID.
- `trade.js:tradeObject()` interpretiert **jede** `item.`-Referenz über den Sheet-Templatezweig (`inventory[ref.slice(5)]`), selbst wenn der Suffix eine vorhandene physische `obj.`-ID ist. `heldUnits()` unterscheidet ebenfalls nur anhand des `item.`-Präfixes. Damit können Katalogreferenz, Holderobjekt und tatsächliche Menge unterschiedliche Bedeutungen bekommen.
- `commands.js:give()` ruft den gemeinsamen `objectOf`-Resolver auf und wählt bei `o.template` die **Template-Materialisierung** statt der vorhandenen `transferCargo`-/`object.moved`-Route. `transferTemplate()` zieht einen Sheetbestand ab und legt unter neuer `obj.`-ID ein weiteres physisches Objekt an. Dies ist für echte Sheet-Templates legitim, für ein bereits vorhandenes Rüstungsobjekt **falsch**.
- `domain.js:mirror()` und `validate.js` verlangen dagegen beim echten Objekt, dessen Holder `pc` ist, einen entsprechenden Inventareintrag **unter dessen originaler Objekt-ID**. Nach der falschen Templateabbuchung bleibt der PC-Holder des Originals bestehen; die lokale Validierung muss anschlagen. Ein späterer Verkauf über die rohe Objekt-ID kann das Original zusätzlich übertragen und so die Zwischendifferenz im Endinventar verschleiern.

**Wichtiges Gegenargument zur falschen Schnellkorrektur:** Nur den Katalogeintrag auf `obj.` umzuschreiben genügt nicht, sofern das Eingabeschema vor dem kombinierten Equip→Give nur die aktuell katalogisierten IDs akzeptiert. Sols Originalgegenprobe berichtet genau diesen Parse-Block. Der Fix muss daher **Katalogvertrag, Auflösung und Befehlsausführung im selben Zug** konsistent halten. Keine neue frei erfundene Aliasart und kein nachträgliches Umschreiben von bereits gebuchten Originalevents.

**Fachliche Zielregel:** Eine durch Kauf erworbene physische Rüstung behält beim Tragen, Ablegen, Weitergeben, Fallenlassen und Verkaufen **dieselbe Objektidentität**. Normale `item.<template>`-Waren (Pfeile/Verbrauchsgüter usw.) behalten dagegen die bisherige Template-/Mengenlogik. Eine `item.obj.<id>`-Aliasreferenz darf ausschließlich auf ein **tatsächlich vorhandenes, zuordenbares `obj.<id>`** auflösen, nicht auf einen neuen Templateeintrag. Besitzer-, Mengen- und Ausrüstungsbedingungen müssen auch über den Alias geprüft werden. Bei bereits getragener Ware ist der im Spiel vorgesehene Equip-/Unequip-Ablauf einzuhalten; der Alias darf keinen Schutz gegen unzulässiges Direktübertragen umgehen.

### 8.3 Priorität P2 vs. Stabilitätsklasse: kein Widerspruch

**P2 als Implementierungspriorität unterstütze ich.** Die konkrete Kampagne endet nicht technisch, die bisher nachgewiesene finanzielle Folge ist lokal begrenzt, und es ist **keine** großflächige wiederholte Exploitserie belegt. Der Fix muss nicht alle weiteren Naturtests blockieren.

**Aber:** Die tatsächlich entstandene **zusätzliche physische Einheit und die erneute Veräußerbarkeit** machen den Fall zu einem *Integritätsfehler* und nicht zu einem tolerierbaren kleinen Narrationsfehler. Der Warrior zählt für Batch26 als **ohne technischen Endabbruch**, nicht als **durchgehend integritätsfehlerfrei**. Die Frage, wann ein solcher P2 nachzuziehen ist, ist eine **Patch-/Terminentscheidung**; die Frage, wie der Run in 10B gewertet wird, ist eine **Messentscheidung**. Beides unabhängig halten.

Ein späterer 10B-Abschluss darf den konkreten Vorfall entweder durch engen Fix schließen oder ausdrücklich als noch offenes Restrisiko mit seiner belegten Schwere akzeptieren. Ein unbemerktes Wegzählen wegen des später grünen Zustands wäre mit dem neuen 10B-Maßstab unvereinbar.

### 8.4 Eng abgegrenzte spätere Regressionen

**Pflichtfall:** Original-I479→I481 mit originalem Katalog und mehreren Befehlen in derselben Spielereingabe. Über die echten Interpreter-/Planner-/Command-/Hostpfade sicherstellen: Superior-Mail wird angelegt; vorheriges Fine-Objekt wird nur **einmal** abgelegt/übergeben; kein neues physisches Rüstungsobjekt entsteht, Inventar/Holder sind nach jedem Record gültig; die übergebene Einheit darf nicht erneut verkauft werden; keine unberechtigte zweite Auszahlung. Das alternative alte `obj.`-Format und die angezeigte `item.obj.`-Aliasform müssen an derselben kanonischen Identität enden.

**Kontrastfälle:** getrenntes Equip→Give, Equip→Drop, direkter Verkauf physischer Ware, echtes `item.<template>` und dessen Mengen-/Materialisierungsregeln, Inventarstapel, zwei **tatsächlich separat erworbene** gleiche Rüstungen, bereits getragene Ware ohne erlaubtes Ablegen, fehlende oder fremde Objekt-ID, NPC- und Ortswechsel, Swap/Edit/Reload/Replay. Nur eine interne Helper-Regression ohne **Katalog/Planner und persistierten Hostrecord** wäre unvollständig. Keine Veränderung der Preise, Coin-Ledger oder allgemeinen Angebotslogik erforderlich.

### 8.5 Andere Batch26-Befunde und nächste Aktion

**Rogue-Tod:** Laut Originalreview sieht der Spieler sechs Gegner und startet mit 96HP den Kampf. Die drei überlebenden Erstgegner fügen einmalig Round-1-Schaden zu, der regelgerecht tötet. Die nur narrativ „dozing“ beschriebene Sow war nicht als unaware im Enginezustand etabliert. Das ist ein begrenzter Befund zur **Awareness-Übertragung**, kein Nachweis eines fehlerhaften Initiativ-/AoE-/Schadenssystems. Der nicht gebuchte Schlaf erklärt zusätzlich die unvollständige Heilung. Kein automatischer Ambushbonus anhand eines Einzelworts und keine pauschale Klassenanpassung.

**Wirtschaft:** Gute natürliche Abdeckung durch 70 Buchungen, Gearkäufe und konsistente Wallets; keine nachgewiesene Doppelzahlung. Gerade deshalb den Objektalias als **Eigentums-/Repräsentationsfehler** isoliert korrigieren und nicht in einen neuen Gesamt-Audit der Preisparser abgleiten.

**Modell-Recoveries:** Sieben sichere Fortsetzungen sind ein positiver Funktionsnachweis der vorhandenen Fail-soft-Grenzen. Die einmaligen HTTP502/Timeout-Recoveries sind zusätzliche überwundene Transportvorfälle, aber **kein** natürlicher Test von zweimal `Failed to fetch` und der neuen .151-Fortsetzungsbedingung.

**Pacing:** Warrior338 vs. Mage183 Inputs für L15/E trotz ähnlicher Gesamt-XP – ein starker Hinweis auf unterschiedliche Inhalte, Vertrags-/Gegnerwahl und Bedien-/Erzählschleifen. Die Zahlen allein tragen keine erneute allgemeine XP-, PP- oder LP-Erhöhung. Skill-Evolution ohne P5 nicht als defektes Angebot ausgeben.

**Meine Priorisierung:** (1) enges P2-Objektalias-/Identitätsproblem bei nächster sinnvoller technischer Gelegenheit beseitigen und mit Originalkette absichern; (2) weitere natürliche Batches **dürfen** parallel laufen, solange das verbleibende Risiko in Reviews benannt und separat gezählt wird; (3) die nun erreichte Abbruchfreiheit über weitere aktuelle Batches überprüfen; (4) 10B **noch nicht automatisch beenden** oder neue Roadmap vorwegnehmen. Keine zusätzlichen vorsorglichen Kampf-, Finanz- oder Runnermaßnahmen aus diesem einen Batch.

**Status:** Unabhängiger GitHub-Codeabgleich und fachliche Gegenbewertung auf Basis der Sol-Originalanalyse; **keine** neue Original-ZIP-Prüfung, kein vollständiger Testdurchlauf, **keine Produktcodeänderung und keine automatische Implementierungsfreigabe**.
