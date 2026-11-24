# Natürlicher ST-Pilot · nach sieben abgeschlossenen Zügen verworfener Kandidat

Alaric begann auf dem Halloran-Hof während eines Regenschauers. Der Farmarbeiter Dann hatte ihn eingeladen, vor einer möglichen Reise mit Tams Mutter zu sprechen. Beide Versionen begannen nach denselben 19 gespeicherten Nachrichten (Welt-SHA-256 `85861134feda7a75017a6077efa2a549a81461e127857a74f4ba28b4fa716335`, Ereignis-SHA-256 `1359467c1b35a4121c15a8c73ead809d7f4db731da51dccc12b2fac11f5d9ec1`). Die eigene Spielserie umfasst 7 neue Eingaben. 7 erhielten einen Narrator- und Weltabschluss mit gemessener sicherer Folgeeingabe. Die archivierte Einleitung zählt nicht als neue Modellleistung. Alle 7 gespeicherten Ergebnisse wurden zusätzlich neu geladen und mit Welt- sowie Ereignisstand vor dem Reload verglichen.

## Spielqualität und Folgen

- B1 verwendete wort- und absichtsgleich die erste Entscheidung der Referenz. Das GO erreichte mit Dann die Hausküche. B2 sagte dem Botengang zu, blieb aber beim Feuer, während Dann den Weg beschrieb. Erst B3 brach Alaric auf und untersuchte den Zustand der beschädigten Dammquerung, bevor er in B4 ausdrücklich hinüberging. Die nachgeladenen Orte lauten Halloran-Küche, Mill Causeway und gegenüberliegendes Ufer. So bleiben die Entscheidungen über Aufbruch und Überquerung als eigene Spielmomente erhalten.
- Bei der Abreise in B3 drückte die Halloran-Familie Alaric Brot und eingewickelten Käse in die Hand. Der Extractor meldete ein neu erzeugtes Objekt direkt im PC-Inventar. `pc_inventory` wies das ab. Ein NPC-Geschenk ist über die vorhandene Autorität möglich, wenn die Extraktion Quelle und tatsächlichen Transfer darstellt. Die Szene zeigt eine fehlende Buchung trotz plausibler Prosa und gleichzeitig den Nutzen des bestehenden Eigentumsschutzes.
- B5 verschob eine Reparatur ausdrücklich und ging nach Ashbridge. Unterwegs stellten drei Hunde den Wanderer. B6 bat den Besitzer um Durchlass, B7 setzte den Weg nach dem Wegnehmen der Hunde fort. B7 endete erzählerisch vor Wrens grüner Tür. Der gespeicherte HUD-Ort hieß Ashbridge; dort blieben die drei Hunde als anwesend eingetragen. Das schränkt die belegte räumliche Kontinuität ein.
- Nach dem siebten bestätigten Save stoppte die Versuchsleitung diesen Piloten wegen eines separat deterministisch belegten Fehlers der Objektzuordnung im damaligen Kandidaten. Die sieben natürlich gespielten Züge belegen diesen speziellen Truhen-/Taschenfehler selbst nicht. Die Abschlüsse und Kosten sind separat gezählt.


## Neue Eingaben

Die sichtbare Erzählung, die feste Vorababsicht, die Buchungen beider Nachrichtenseiten und der verifizierte Endzustand stehen nebeneinander in der [Zugauswertung](zugauswertung.json.gz). Die Ortsangaben in der Tabelle sind gespeicherte Bewegungsereignisse. Physische Aufrufe einschliesslich Repairs sind dem betreffenden Spielerentschluss zugerechnet.

| Zug | Tatsächliche Eingabe | Gebuchte Ankunft | Ablehnungsregeln im Narratorslot | Requests | Sichere Eingabe (s) |
|---:|---|---|---|---:|---:|
| 1 | Lead on, Dann. I'll come as far as the house and hear what your mother wants to say. We can talk about the fee by the fire. | loc.halloran_steading.halloran_house_kitchen | – | 3 | 46.52 |
| 2 | Keep the five silver for Wren. I'll take your message for the price of getting warm at this fire. Dann, how do I get past the mill ford safely? I don't fancy being the next one you send her for. | – | – | 3 | 59.13 |
| 3 | I repeat 'left at the leaning oak' to fix it in my head, thank them both, and set off downhill. I want a good look at the mill causeway and the state of that rail before I put a foot on it. | loc.mill_causeway | pc_inventory | 4 | 54.67 |
| 4 | I wave to the woman and make my way across on the crowns of the stones, keeping clear of the rotten post. On the far bank I ask if the rail can be mended before Mother Wren comes back this way. | loc.far_bank_of_the_mill_causeway | – | 4 | 57.25 |
| 5 | The rail will have to wait, I'm afraid. I'll remember about the upper stones. I take the left at the leaning oak and follow Dann's river road toward the east gate of Ashbridge. | loc.shepherds_cot | attack_commitment ×3 | 3 | 26.31 |
| 6 | I keep my staff still and call to the person at the door. Could you call your dogs in, please? I'm headed for Mother Wren on the Hallorans' errand and I'll be out of your way as soon as I can pass. | – | – | 3 | 23.65 |
| 7 | Much obliged. I pass the dogs at a walk, and follow the river on my right into Ashbridge. I take the lane behind the tithe barn to Wren's green door. | loc.ashbridge | met_evidence | 3 | 27.98 |

## Kosten, Zeit und Originale

Engine `0b713579c146167e83f992af6a7a5d0fb212292e`, SillyTavern 1.19.0 bei `7e8663cd9c184a550b37238218bdd32c6efc68e9`, OpenRouter über `relace/fp4`, Modell `z-ai/glm-5.3-flash`. 23 physische Aufrufe (planner 7, narrator 7, extractor 9). Wiederholte Rollenaufrufe je Zug: extractor 2. OpenRouter meldete 300290 Input-, 11874 Output-, 160768 Cache- und 3474 Reasoningtokens sowie insgesamt 0.0107577542 USD. Cache und Reasoning sind Teilmengen der jeweiligen Tokenarten. Je Eingabe sind Wartezeiten, Usage und Kosten nachvollziehbar; je Request bleiben Input, volle Originalantwort, Abschluss und Dauer einsehbar.

Der Median über 7 beobachtete sichtbare erste Sätze beträgt 9.90 s. Die sichere Eingabe nach Speichern/Read-back lag im Median über 7 Narrationszüge bei 46.52 s. Eine zusätzliche Prüf-Neuladung nach der Freigabe wird zeitlich separat erfasst. Vollständige Verteilungen stehen in [Messwerten](messwerte.json) und [Browserzeiten](browserzeiten.json). Die erzählerischen Verläufe und Antwortlängen unterscheiden sich. Geschwindigkeit ist damit beschreibbar; eine kausale Beschleunigung benötigt kontrollierte Paare.

[Originale und SHA-256](SOURCE_MANIFEST.md) · [Begrenzung, Originalpräfixe und Wiederholung](../../recherche/kontinuitaet_209_naturtest/VERSUCHSPROTOKOLL.md)
