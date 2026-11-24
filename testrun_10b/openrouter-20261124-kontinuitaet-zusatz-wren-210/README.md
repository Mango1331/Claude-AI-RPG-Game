# Zusatzbogen mit Mother Wren auf dem Rückweg

Dieser eigenständige natürliche Verlauf beginnt exakt nach der frisch erzeugten [C19/B-Entscheidung](../openrouter-20261124-kontinuitaet-fokus/tasche/B/SOURCE_MANIFEST.md). Die 43 importierten Nachrichten gehören zum gemeinsamen historischen Präfix und der einmalig bezahlten Fokushälfte. Nur nachfolgende Spielereingaben und deren physische Modellantworten werden hier gezählt. Wren hatte die Tasche wieder auf ihre eigene Schulter genommen und Alaric am umgestürzten Baum nach einer Wegentscheidung gefragt.

Im ersten Zug prüfte Alaric mit dem Stab den Rand des Hindernisses und bat Wren, mit dem Licht stehen zu bleiben. Die Szene blieb bei beiden am Einschnitt der Ridge Road; die Untersuchung brachte keine sichere Umgehung. Im zweiten nahm Wren die Hilfe über den Stamm an und behielt ihre eigene Tasche. In beiden Fällen meldete das Modell keine unvereinbare Eigentumsübertragung. Die gespeicherten Objekte enthielten weiter dieselbe Satchel-ID und keinen zweiten gleichnamigen Gegenstand.

Im dritten Zug wählte Alaric die Weiterreise mit Wren; die verdächtigen Spuren ließ er liegen. Die Prosa führte beide auf den Halloran-Hof und ließ Marta die beiden begrüßen. Der gespeicherte Hof und Wrens Anwesenheit bestätigen die Reise. Marta wurde nicht als neue Anwesende gebucht: Ein `met_not_known_here` und drei `scene_context`-Ablehnungen schränkten die Übereinstimmung ein. Im Chat wurde zusätzlich ein fehlgeschlagener Hinderniswurf angezeigt. Ein narrativ fortgesetzter Weg belegt für sich allein keinen Regelverstoß nach einer solchen Probe. Die explizite Wegwahl, die Ankunft und Wrens unveränderte Eigentumsentscheidung sind über drei neue gespeicherte Züge nachvollziehbar. Eine freiwillige Übergabe an den PC kam hier nicht vor.


| Zug | Vorab ausgefüllte Spielerentscheidung | Ort nach Reload | Anwesende | Halter der bestehenden Satchel | Aufrufe | Erste Prosa / sichere Eingabe (s) |
|---:|---|---|---|---|---:|---:|
| 1 | Keep the lantern on the high bank a moment, Wren. I'll look for a way round the root end, testing the turf with my staff. Wait here till I can see whether there's room for you to walk round without climbing over the tree. | loc.ridge_road_cutting | pc, npc.mother_wren | {'entity': 'npc.mother_wren'} | 3 | 5.5 / 16.5 |
| 2 | I saw it too. It showed me enough bog to last the night. I come back to the trunk and offer Wren my shoulder for a step, so she can sit on the willow and swing her legs over. I'll steady her on the far side if she wants the help. | loc.ridge_road_cutting | pc, npc.mother_wren | {'entity': 'npc.mother_wren'} | 3 | 9.9 / 21.2 |
| 3 | Fast and quiet. Tam's been waiting long enough. I climb over to Wren and walk that last half mile beside her, keeping an eye on the track in her lantern light. At Marta's I'll knock and tell her we've brought help. | loc.halloran_steading | pc, npc.mother_wren | {'entity': 'npc.mother_wren'} | 4 | 7.5 / 30.0 |

OpenRouter meldete für die 10 physischen Requests ({'planner': 3, 'narrator': 3, 'extractor': 4}) 132125 Input- und 3807 Outputtokens, darunter 94016 Cache- und 792 Reasoningtokens. Gesamtkosten 0.0044874309 USD. Alle 3 gespeicherten Eingaben wurden verifiziert und neu geladen.

[Originale, Modellroute und SHA-256](SOURCE_MANIFEST.md) · [Einzelne Buchungen und Ablehnungen](zugauswertung.json.gz)
