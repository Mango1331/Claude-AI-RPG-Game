# Batch 16 – Sols unabhängige Gegenprüfung

**30.10.2026. Nur Analyse; keine Produktänderung, keine neuen Tests oder Abnahmen.** Die [GPT-Originalreview](REVIEW.md) bleibt unverändert. Geprüft wurde der Chatupload gegen den tatsächlichen Runstand **.120 / [ca7a78f](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece)** sowie die betroffenen Funktionen auf dem aktuellen Produktstand **.121 / [00fa7f1](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/00fa7f11567067da59f8a89e94a49f4c2618464f)**.

## Prüfgrundlage und Gesamturteil

Original-ZIP: **55.380.015 Bytes, 49 Einträge**, vollständiger CRC-Test fehlerfrei; SHA-256 **`2afff5e2f0961e778891df747d604830bf142bd189e8b558f8b00f5c412571bc`**. Das ZIP liegt weiterhin nur als Chatupload vor, nicht auf GitHub. Requests, Chat, Spielerentscheidungen und Events wurden gemeinsam ausgewertet. Zusätzlich wurden **alle 4424 Events** mit dem tatsächlichen .120-Code neu gefaltet und die Zwischenzustände nach jeder Nachricht mit `validateState` sowie auf Ortsbaumzyklen geprüft: **keine Zustands-/Referenzfehler, keine Elternzyklen oder Foldfehler**. Gezielte Funktionssonden liefen ausschließlich auf Zustandskopien außerhalb des Repositorys; kein `npm test`, kein ST-Smoke.

| Lauf | Inputs / Engine-Turns | Events | Ende | Siege | Guild | Gesamt-XP | Geld |
|---|---:|---:|---|---:|---:|---:|---:|
| Warrior | 29 / 28 | 418 | L1, Tod | 1/2 | 1 | 70 | 120 cp |
| Mage | 150 / 132 | 2172 | L9, lebt / Limit | 16/16 | 8 | 3942 | 995 cp |
| Rogue | 150 / 134 | 1834 | L8, lebt / Limit | 13/13 | 6 | 3182 | 626 cp |

**GPTs Gesamturteil trägt:** 329 Inputs, 30/31 Siege und 15 Gildenabschlüsse ohne terminalen Technikabbruch. XP, Levelüberträge und alle 30 Geldtransaktionen sind konsistent. Coldwell liefert den natürlichen Nachweis einer neuen, später wiederverwendeten Gildenhalle einschließlich eigener Boardabfrage und zwei korrekter Auszahlungen. Die Sperre gleichzeitig aktiver identischer Jagden wurde dabei nicht gezielt ausgelöst.

Die Gegenprüfung präzisiert den Verkaufsfehler und bestätigt zwei weitere begrenzte Fehlablehnungen. Keiner der drei Fälle ist ein beschädigter Save, eine doppelte Auszahlung oder ein Grund für einen Architekturumbau.

## 1. P2 – Eigener Kaufpreis wird wegen „I'd“ als Drittanbieterberatung verworfen

**Rogue, Runner-T39/40 = Engine-T36/37, Chatindex 77–80.** Die anwesende Gildenangestellte bietet selbst 17 cp für vier Felle und neun Fangzähne. Der Extractor liefert die richtige Käuferin, beide Warenpositionen und den Gesamtpreis. Trotzdem verwirft `world.js` das `bid` als fremde Preisberatung; der spätere Verkauf bleibt ungebucht.

**Exakte Ursache:** [`trade.js:offerAdvice`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece/avereth-engine/src/v4/trade.js#L122) sucht großgeschriebene Namen vor `pay/sell/...`. In „same as **I'd pay** the next man“ erkennt die Regex **`I'd` als Personennamen**. Die Ausnahme für `I` greift nicht. Damit wird die eigene Preisofferte als Aussage über einen anderen Käufer behandelt.

**Sonde mit Originalzustand und -extraktion:**

- Originalformulierung: kein angenommenes Gebot.
- Ausschließlich „I'd pay“ in Prosa und Beleg zu „I would pay“ ausgeschrieben: gültiges Gebot über **17 cp mit zwei Positionen**.
- Derselbe anschließend gespeicherte Plannerplan mit zweimal `min_cp:17` auf diesem korrigierten Gebotszustand: **genau eine Transaktion über 17 cp**, keine 34 cp. Die bestehende Verkaufsabwicklung akzeptiert das gesamte Gebot.
- Erneute Annahme: **keine zweite Transaktion**. Echte Fremdberatung („He will pay“, „Halvard pays“) bleibt als solche erkannt.

**Abweichung zur GPT-Empfehlung:** Die spätere Preiszerlegung muss für diesen Originalfall nicht als zweiter Fehler behoben werden. Bereits der bestehende Gesamtgebotspfad wickelt ihn korrekt ab, sobald das berechtigte Gebot erhalten bleibt. Zuerst die Verwechslung von Ich-Kurzform und Personennamen gezielt korrigieren; keine neue Paketpreislogik oder gelockerten Geldbelege daraus ableiten. Im Original bleiben Waren und Geld unangetastet: sichere, aber falsche Ablehnung eines legitimen Geschäfts.

## 2. P2 – Hindernis rechts blockiert den linken Durchgang

**Mage, Runner-T149/150, Chatindex 297/299.** Am Fork beneath the rough pillar liegt das aktive Hindernis `feat.4`, **„fitted slab across the right passage“**. Die Erzählung unterscheidet links den freien, sauberen Gang und rechts die Platte. Der Spieler wählt links; die Engine verweigert die Bewegung wegen dieser rechten Platte.

**Exakte Ursache:** [`commands.js:dungeonGo`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece/avereth-engine/src/v4/commands.js#L337) behandelt ein noch nicht kanonisch zugeordnetes Ziel bereits als blockiert, wenn **irgendein Wort** seines Namens im Hindernisnamen vorkommt. Das gemeinsame Wort **`passage`** genügt; die tatsächliche Zuordnung rechts geht verloren. Explizite Passageverbindungen waren hier noch nicht gespeichert.

**Sonde auf dem Originalzustand:** „the left-hand passage“ wird blockiert; „the unblocked route to the left“ wird autorisiert; „the right-hand sloping passage“ bleibt korrekt blockiert.

Damit ist dies **mehr als der in GPTs Review vermutete Kontinuitätsfall**: eine reproduzierte falsche Zielsperre. Bei späterer Korrektur vorhandene Passage-/Featurezuordnung bevorzugen; ein beliebiges gemeinsames Gattungswort darf allein keine Sperre begründen. Echte Hindernisse und der Schutz vor Umgehung durch Umbenennung müssen erhalten bleiben. Keine neue Raumengine und keine automatische Bewegung aus Prosa erforderlich.

## 3. Nachrangig – „Marla“ identifiziert die bekannte „Marla Otterwell“ nicht

**Mage, Runner-T71, Chatindex 142.** Die Antwort zeigt die wiederbesuchte Marla bei ihrer Gartenarbeit. Der Extractor referenziert korrekt `npc.marla_otterwell`; im Zustand existiert genau eine Marla. Dennoch werden ihre Anwesenheit und anschließend eine abhängige Erinnerung abgewiesen: „the quoted clause does not name them“.

[`world.js:personLabels`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece/avereth-engine/src/v4/world.js#L374) liefert den vollen Namen und andere Labels, aber keinen passenden Vornamen. [`narratedPresence`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/ca7a78f400b1cc0ccf47860fcdaf559fe3bc7ece/avereth-engine/src/v4/narration_evidence.js#L143) verlangt die maßgeblichen Wörter eines Labels vollständig im Beleg. Ausschließlich „Marla“ zu „Marla Otterwell“ in Prosa und Beleg erweitert: dieselbe Einführung wird akzeptiert.

Das ist eine echte Identifikations-Fehlablehnung mit begrenzter Auswirkung; die Gildenabgabe funktioniert trotzdem. Falls später behoben, eindeutige vorhandene Namensauflösung wiederverwenden. Mehrere gleichnamige Personen dürfen nicht verschmolzen und tatsächlich erzählte Anwesenheit darf nicht entbehrlich werden. Kein dringender Folgepatch allein für diesen Fall.

## Betrieb, Kampf und Balance

**Provider:** 935 Modellaufrufe. Keine gespeicherte Antwort endet mit `finish_reason:length`; der frühere Reasoning-Budgetfehler ist hier nicht reproduziert. Der einzelne Mage-`internal_server_error` lässt sich **Extractor-Repair-Call 281** zuordnen; Call 282 ist erfolgreich. Keine belegte Narrator-Recovery daraus ableiten. Zwei andere Mage-World-Extraktionen bleiben nach gescheiterter Reparatur sicher unausgeführt: ungültiges `place.reported` bei T33 und `passage.to` bei T147. Der Lauf lebt weiter, die betreffende zusätzliche Weltinformation fehlt trotzdem.

**Kampf:** 4/3/19 abgelehnte Reichweitenaktionen bei Warrior/Mage/Rogue sind nachvollziehbare Bedienfehler. Dafür weder Reichweiten noch Kampfautorität lockern. Der L1-Warrior stirbt gegen zwei L7-Eber mit je 90 HP und ATK 26; der gewählte Vertrag ist Level 5. Das allein belegt keinen Schadens- oder Klassenfehler. Mage nutzt Wave siebenmal, darunter drei Mehrzielaktionen; Rogue Fan viermal, darunter eine Mehrzielaktion. Gegnerauswahl und Positionierung bleiben wesentliche Einflussgrößen.

**Gear und XP:** Kein neuer Ausrüstungsgegenstand gekauft oder ausgerüstet; kein passendes Gearangebot erzeugt. Daher weiterhin keine natürliche Bewertung der Upgradepreise/-wirkung. Der Warrior besitzt nach T19 tatsächlich **120 cp in Alderwatch** und zieht T20 zur Jagd weiter. Der nachträglich eingeführte 100-cp-Schmiedhinweis hätte hier einen konkreten Anwendungsfall; dass das Modell ihm folgt, ist noch nicht getestet. Mage und Rogue enden zahlungskräftig, ohne Fachhändlerbesuch für Upgrades.

**Beide neuen Versuche fehlen in diesem Export:** Warrior-Einkaufsanweisung und .121-XP-Faktor 5 wurden erst danach ergänzt. Bei unveränderten XP-Ereignissen entsprächen Mage und Rogue rechnerisch L14 bzw. L13; höhere Level ändern aber den weiteren Verlauf. Keine natürliche Level-15-Abnahme und kein Grund für eine weitere XP-/Startwertänderung aus diesem alten Batch.

## Empfehlung

Die bestehende Architektur beibehalten. Falls ein weiterer Fachfix beauftragt wird: **zuerst eigene Preisofferte vs. Drittanbieterberatung**, danach die **konkret falsche Hinderniszuordnung**; Marlas Kurzname ist nachrangig. Alle drei Ursachen bestehen in .121 weiter, dessen Produktänderung gegenüber .120 nur XP-Faktor und Buildnummer betrifft. Keine Umsetzung allein aufgrund dieses Reviews. Den neuen .121-Batch als Vergleich für XP und Warrior-Gear nutzen; Reichweitenfehlversuche nicht als neue Hotfixserie behandeln.
