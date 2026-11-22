# Batch 17 – Sols unabhängige Gegenprüfung

**30.10.2026 · nur Analyse, keine Produktänderungen oder neue Testabnahme.** Die [GPT-Originalreview](REVIEW.md) bleibt unverändert. Aktueller Produkt- und tatsächlicher Runstand: **.122 / [013e0dc](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/013e0dca9e7b76519e03a2424651d54a0393a0f8)**. Kein neuer Produktcommit seit der letzten Abnahme.

## Unabhängiger Nachweis

Original-Chatupload vollständig geprüft: **66.677.316 Bytes, 48 ZIP-Einträge**, CRC fehlerfrei, SHA-256 **`348be2c9325fb61d4e67eb5c9892824435153b5892131c22c1ee6f03d93e93c9`**. Die ZIP liegt nicht auf GitHub. Chat, Requests, Player-Aktionen und Events wurden gemeinsam ausgewertet.

Zusätzlich zu GPTs arithmetischer Auswertung wurden **alle 5556 Events mit dem tatsächlichen .122-Code neu gefaltet**: Zwischenzustände nach jeder Nachricht mit `validateState` und auf Ortsbaumzyklen geprüft, Endzustände gegen `foldChat` verglichen. **Keine Fold-, Zustands-, Referenz- oder Zyklusfehler.** Alle XP-, Level- und Geldübergänge separat nachgerechnet; alle 16 Gildenabschlüsse eindeutig ihren einmaligen Auszahlungen zugeordnet. Dies belegt Zustandskonsistenz, nicht die vollständige Übernahme jedes erzählten Vorgangs.

| Profil | Inputs | Ende | Gesamt-XP | Geld | Siege / Guild |
|---|---:|---|---:|---:|---:|
| Warrior | 168 | L15 / 90 Rest-XP | 10.590 | 777 cp | 15/15 · 6 |
| Mage | 106 | L15 / 120 Rest-XP | 10.620 | 752 cp | 15/15 · 5 |
| Rogue | 140 abgeschlossen, 141 angesetzt | L13 / 895 Rest-XP, manueller Stopp | 8695 | 741 cp | 18/18 · 5 |

**GPTs Gesamturteil stimmt:** zwei echte Level-15-Erfolge innerhalb von 200 Eingaben, 48/48 Siege, kein terminaler Enginefehler. Der letzte Rogue-Planner bleibt wegen Ctrl+C unbeantwortet; das ist kein nachgewiesener Provider-/Engineabbruch. In insgesamt **1141 Modellaufrufen** keine gespeicherte Antwort mit `finish_reason:length` oder leerem Inhalt. Warrior hat drei sicher unausgeführte Plannerfehler; Mage/Rogue keinen solchen Fortsetzungsfall. Keine PageErrors.

## Gear: Nachweis gelungen, Vergleich eingeschränkt

Der Warrior sucht anfangs mit 30 cp erfolglos nach erschwinglicher Ausrüstung. Nach dem ersten Gildenabschluss geht er mit **169 cp auf Level 7** erneut zum Schmied, kauft in Input61 und rüstet zwei Teile aus. Das bestätigt den vorgesehenen Einkaufsversuch natürlich; der Kauf liegt nicht mehr auf Level1.

**Superior Longsword 60 cp + Fine Plate Armor 30 cp:** eine gültige 90-cp-Transaktion, korrekter Geldabgang und zwei `item.equipped`. ATK10→18, Rüstungs-DEF6→7, MDEF2 unverändert. Die regulären Fine-/Superior-/Exceptional-Schwertangebote für 140/260/480 cp existieren gleichzeitig. Die Erzählung liefert ein erheblich günstigeres zusätzliches Angebot; seine betroffenen Zeilen tragen bereits den Auditvermerk „far below the guideline“.

[`items.js:priceAudit`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/013e0dca9e7b76519e03a2424651d54a0393a0f8/avereth-engine/src/v4/items.js#L256) ist bewusst kein Preisverbot. Deshalb **kein Zahlungs- oder Inventarexploit**, aber ein erheblicher Einfluss auf den Balancevergleich. Der Warrior hätte zu diesem Zeitpunkt auch das reguläre Fine-Schwert für 140 cp bei 20 cp Reserve kaufen können; Superior-Schwert plus Rüstung zum regulären Vergleichspreis wären noch nicht erschwinglich gewesen.

Mage und Rogue bleiben bei Startergear; beide fragen keine passenden Fachhändler-Upgrades an. Aus den unterschiedlichen Läufen kann man daher weder einen kontrollierten Klassengearvergleich noch die Überlegenheit dieses konkreten Einkaufsleitfadens in jeder Kampagne ableiten. Der mechanische Pfad Händler→Angebot→Kauf→Ausrüsten ist jedoch erstmals natürlich belegt.

## PP: konkrete Ursache statt bloßer Vermutung

Die P1-Endstände sind **keine nachgewiesene PP-Regression**. [`skills.js:fightQualifies`](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/013e0dca9e7b76519e03a2424651d54a0393a0f8/avereth-engine/src/skills.js#L432) verlangt sowohl einen Gegner mindestens auf PC-Level minus zwei als auch einen tatsächlichen Gegnerangriff. Aus Encounter-Snapshots und Aktionsrecords ergibt sich:

| Profil | Kämpfe mit PP | Ohne PP: Gegner zu niedrig | Ohne PP: passend stark, aber kein Gegnerangriff |
|---|---:|---:|---:|
| Warrior, 15 Kämpfe | 5 | 8 | 2 |
| Mage, 15 Kämpfe | 2 | 4 | 9 |
| Rogue, 18 Kämpfe | 5 | 11 | 2 |

Die Kategorien sind hier exklusiv: Bei zu niedrigen Gegnern wird nicht zusätzlich der fehlende Angriff gezählt. Die 12 qualifizierenden Kämpfe liefern zusammen 18 Skill-Progress-Events. Kein unerklärtes Ausbleiben einer Gutschrift aus diesen Bedingungen gefunden.

**Präzisierung zu GPT:** Beim Mage liegt es überwiegend nicht am Bekämpfen zu schwacher Gegner, sondern am erfolgreichen Ausschalten vor deren Angriff. Selbst angemessene oder höhere Level geben dann keine PP. Ein bloßes Multiplizieren der PP-Menge behebt diesen Zugangsausschluss nicht. Defensive Skills müssen tatsächlich unter Angriff eingesetzt werden; für offensive Skills kann dieselbe globale Bedingung taktisch gutes Spiel benachteiligen. Das ist eine **Designentscheidung zur nächsten Progressionsrunde**, kein Auftrag zum heimlichen Entfernen des Anti-Farming-Schutzes.

Die Endstände stimmen: Warrior Basic 36/Cleave 54 PP auf P1, Mage Bolt 36/Wave 36 auf P1, Rogue Razor Cut P2/40 PP. Cleave benötigt wegen C2 **75 PP** zur Beförderung; 54 PP sind kein übersehener Aufstieg. Es wird in keinem Lauf gezielt trainiert oder neues Lernmaterial angefragt. Keine neue aktive Technik ist daher auch kein Nachweis eines kaputten Lehrer-/Lernpfads.

48 Siege bedeuten zudem nicht gleichmäßige Schwierigkeit: Der Mage verliert in 13/15 Encountern keine HP, fällt gegen die erste stärkere Gnollgruppe aber auf 23 HP. Der Warrior überlebt früh zwei Wölfe mit 21 HP und erhält später korrekt die angenommene Rare-Passive **Wolfbitten Resolve**. Gegnerzahl, Erstschlag, Reichweite und Gruppen unterscheiden die Kämpfe erheblich. Daraus keine pauschale Schadenssenkung/-erhöhung ableiten.

## Technische Präzisierungen und ein ausgelassener Weltvorgang

- **Mage-Abgabe T100–106:** Nach T100 steht die Engine in `loc.ashbridge`, nicht in der Gildenhalle. Der Planner hat nur GO zur Stadt gebucht. Das anschließend erzählte Warten auf einen besonderen Schalter, Verills Rückfragen und Auszahlungssperren ändern diese Voraussetzungen nicht; entsprechende Autoritätsbehauptungen werden abgewiesen. T106 bringt ihn ausdrücklich in die echte Halle und zahlt 300 cp. Somit nicht „Engine hält eine gültige Hallenabgabe zurück“, sondern verlorene letzte Reiseetappe plus fortgesetzte Narrator-/Spielerdrift. Sichtbarer Ortsstatus und bestehende Abgabeautorität bleiben maßgeblich; keine zusätzliche Schalterpflicht nötig.
- **Rogue, angeblicher fünfter Strider:** Nach der neuen Annahme existieren tatsächlich nur vier passende neue Kills L/M/N/O. Erzähltes READY, Zeugen oder frühere Kills ersetzen den fünften nicht. Die Ablehnung ist korrekt. Der Lauf wurde manuell beendet, bevor die Suche weiter beobachtet werden konnte.
- **Rogue `group_turns`, T99 / `enc.t87`:** Beide Mineral Slimes sterben bereits im einzigen Fan-of-Blades-Erstschlag. Der Evaluator setzt neben „alle tot oder gehandelt“ zusätzlich mindestens einen Gegnerakteur voraus; deshalb entsteht die Meldung mit leerer Gegnerliste. **Hier Fehlalarm der Diagnose, kein fehlender Gegnerzug.** Der Dungeon-Clear und dessen60cp/115XP bleiben korrekt. Die Friendly-Fire-Episode T8 dagegen ist real: Der Fan trifft neben der Schlange die Waschfrau für 23 Schaden; die ausdrücklich gewählte 30 cp-Zahlung ist gebucht.
- **Warrior-Planner T60/65/134:** nichtleere Antworten, keine Reasoning-Budgeterschöpfung. T60 enthält zusätzliche `equip`-Kommandos mit `object:null`; T65 falsch modellierte Verkaufsbeträge; T134 die mehrdeutige Preisform „one silver ten“. Die Engine führt jeweils nichts davon aus. Ausrüstungskauf und Verkauf gelingen später, ohne vorangehenden Geldverlust. Das sind reale Bedien-/Modellreibungen, keine drei neuen Integritätsdefekte.
- **Zusätzlich gefunden: Warrior T9 / Chatindex18, 20cp-Vorschuss.** Die Prosa zeigt Ellwins Rückkehr und tatsächliche Übergabe zweier Silberstücke, der Kontostand bleibt 30 cp. Die Extraktion zitiert nur „Half of four is two“ und lässt sein `enter` nach dem zuvor gebuchten Abgang aus. Funktionssonde auf dem unveränderten Originalzustand: vollständiger Betragsbeleg allein genügt weiterhin nicht, weil Ellwin kanonisch fehlt; mit beiden vorhandenen Angaben, `enter` und wörtlichem Silberbeleg, verbucht derselbe Code korrekt +20 cp. **Bestätigte Extraktionslücke, kein Rechenfehler oder weiterer Privatjob-Sonderbedarf.** GPTs korrekte Saldenprüfung bedeutet nicht, dass sämtliche erzählten Zahlungen übernommen wurden. Als P2-Beobachtung festhalten; Präsenz-/Geldbelege dafür nicht pauschal lockern und keinen neuen Recoverypfad ohne weiteren Auftrag bauen.

## Empfehlung

**XP×5 beibehalten; keine weitere Erhöhung.** Das bisher nur hochgerechnete Levelziel ist natürlich erreicht. Eine angenommene E-Klassenentwicklung wurde dabei noch nicht getestet: Beide erfolgreichen Läufe enden unmittelbar bei L15; `class.evolved` kommt nicht vor.

Als nächste Designarbeit zuerst **PP-Zugangsbedingung und offensiven Lernfortschritt**, danach **verlässliche Gearpreise bei regulären Händlern versus erlaubte individuelle Rabatte** entscheiden. Keine automatische Gegnerskalierung nach Spielerlevel und keine harte Preisuntergrenze allein aus diesem Review. Ein weiterer unveränderter Vergleichsbatch ist vertretbar; es gibt keinen nachgewiesenen neuen P1-Blocker, der vorher eine weitere Hotfixserie erfordert.

Keine Produktdateien geändert, keine neuen Tests, kein neuer npm-/ST-Lauf. Originalreview und ZIP unverändert; die beschriebenen Sonden arbeiten nur auf Kopien des Originalzustands.
