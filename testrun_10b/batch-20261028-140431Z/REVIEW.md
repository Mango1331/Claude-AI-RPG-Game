# Unabhängiges GPT-Review – natürlicher Batch 20261028-140431Z auf .113

**Status:** Originaldaten geprüft; keine Code-, Runner-, Content- oder Teständerungen. Der dritte Run wurde ausdrücklich MANUELL abgebrochen.

## Originalbeleg und Grenzen

Original-ZIP: batch-20261028-140431Z.zip, 36.765.169 Bytes (35,1 MiB); SHA-256 1b3003e58a8c214eb689a1b794c4c4982c914ce6116f1066ae713736a574db84. 49 ZIP-Einträge, alle CRCs geprüft, kein Fehler. Unveränderte ZIP im Gespräch hochgeladen, nicht auf GitHub main archiviert. Ausgewertet: batch.json, je run.json/evaluation.json, Eventexport, Spielerinputs, betroffene Chat-/Anzeigezeilen. Keine eigene Replay- oder Testausführung. **Nachtrag:** Sol meldet zwei erfolgreich geprüfte Event-Replays und Zustandsprüfungen sowie eine erfolgreiche Gegenprobe mit reiner Schlafaktion nach der ersten Buchung; diese Fremdprüfung wurde hier nicht nochmals selbst ausgeführt.

Alle drei Profile: 4.3.0-c.6.6.113, Produktcommit 55c547f47701, sauberer Checkout, echtes GLM-5.3-Flash über SillyTavern.

| Lauf | Eingaben | Level | Ergebnis |
|---|---:|---:|---|
| Guild Warrior | 150 | 9 | Reguläres Limit von 150 Inputs |
| Guild Mage | 77 | 5 | Autoritativ gebuchter Tod bei Turn 77 |
| Guild Rogue | 0 | – | Manuell Ctrl+C vor erstem Spielerinput |

**Gesamt: 227 tatsächliche Spielerinputs, 2.947 Engineevents (Warrior 1.963 / Mage 984), 21 gestartete Encounter und 20 Siege (Warrior 14, Mage 6); 7 abgeschlossene Guildverträge (Warrior 4, Mage 3).** Der aggregierte Batchstatus interrupted bzw. Rogue process_error beschreibt den vom Nutzer manuell gestoppten dritten Prozess, nicht einen Rogue-Engine-Defekt. Bei beiden gespielten Runs: integrity OK, keine PageErrors oder ServerErrors, 0 terminale safeContinuations, laut Evaluation 0 fatale Planner-/World-Fehler. Dies ist keine unabhängig neu gefaltete Eventvalidierung.

## 1. Positive natürliche .113-Nachweise

- Beide Charaktere erstellen ihre gewünschten Klassen und Starter-Skills korrekt (Warrior Heavy Slash/Guard; Mage Arcane Bolt/Arcane Ward); keine zweite Charaktererstellung.
- Warrior T4 und Mage T5 registrieren sich an der echten Guildhall: jeweils genau eine kanonische 20-cp-Zahlung von 50 auf 30 cp, einmal guild.registered, Status Novice.
- Mage T35 kauft am Lanternrest eine Unterkunft zu 8 cp und Suppe/Brot zu 2 cp gemeinsam für 10 cp. Ein transaction.completed, eine coin.changed -10 und zwei service.granted für lodging und meal, ohne doppelte Zahlung für fehlende Leistung. T36 Frühstück zu 2 cp als eigene Mahlzeit.
- Neue sichtbare Anzeige in den originalen Chat-Displaydaten: ENTERED — Glimmerdeep Grotto, Level 1 · Rank F (Warrior); ENTERED — Old Crown Catacombs, Level 1 · Rank F (Mage, auch bei erneutem Eintritt). Eine tatsächliche E-Level-2-Anzeige wird durch diesen Batch nicht natürlich getestet.
- Mage-Dungeon: In Old Crown Catacombs wird floor 1 des cycle 1 mittels dungeon.cleared abgeschlossen, credit pc, pc 2, others 1, total 3, Engine-T36. Der entsprechende Vertrag wird abgeschlossen; 120 cp Guildpayout. Dies belegt die differenzierte Slot-Zurechnung. Kein Beweis für Sieg über den Endboss: Ebene 1 hat Gallery Warden als Guard, die zweite Ebene hat Ossuary Lord als Boss.
- Warrior erreicht L9 in 150 Inputs, gewinnt alle 14 Encounter, erledigt vier Guildjobs und akzeptiert bei T60 die seltene Passive Grit of the Cornered Hound. Basic Attack und Heavy Slash erreichen Proficiency 2. Ironkeeper Riposte wird als Entwicklung angeboten, nicht angenommen; keine Equipmentänderung im Coverage. T150 werden 2 STR und 3 VIT per #assign verteilt.
- Keine neue .113-Regression aus diesen positiven Läufen nachgewiesen; kein Level 15 oder natürlicher F-zu-E-Wechsel erreicht.

## 2. Hospizbett: Planner-Fehlinterpretation und erneute LLM-Buchung – kein P1-Hotfix

**Warrior, Temple of Saint Vered's hospice, derselbe Heiler, dieselbe Nacht, kein Schlaf zwischen den beiden Käufen.**

| Runner-Input / Engine-Turn / Chat-Index (0-basiert) | Originalaktion und Enginebuchung |
|---|---|
| **Runner 87 / Engine 77 / User 173, Reply 174** | Spieler zahlt 2 cp Behandlung und bittet zusätzlich um ein Bett für 1 cp sowie um Schlaf. Die Behandlung wird sofort gebucht, der Bettkauf im Spielerturn zunächst conditional. Deshalb ist der Schlaf im selben Turn als room not booked verweigert. In der anschließenden World-Antwort entsteht offer.t174.9, das die bedingte Kaufentscheidung tatsächlich erfüllt: weitere -1 cp (201 auf 200), transaction.completed, service.granted lodging, decision.closed accepted. Das Bett ist nun gebucht. |
| **Runner 88 / Engine 78 / User 175, Reply 176** | Spieler sagt nur **„I take the bed and sleep until morning.“** und weiß aus dem sichtbaren COIN-/SERVICE-Eintrag, dass das Bett gekauft wurde. **Der Planner erzeugt fälschlich erneut `buy` plus davon abhängigen `sleep` (`needs:1`)**, statt eine reine Schlafaktion. Der Kauf bleibt bedingt/ohne neuen Abschluss; der Schlaf wird deshalb zu Unrecht als `room not booked` verweigert. Die Narratorprosa behauptet nochmals eine Zahlung, aber **kein** weiterer Geldabzug ist gebucht. **Dies ist ein Planner-/Verständlichkeitsfehler, keine absichtliche erneute Spielerbuchung.** |
| **Runner 89 / Engine 79 / User 177, Reply 178** | Der LLM-Testspieler fordert aufgrund der irritierenden Rückmeldung ausdrücklich: „I ask the healer to book the bed ... for one copper, then sleep ...“. Das erzeugt wieder eine bedingte Kaufentscheidung, aber keinen weiteren bezahlten Service; der Schlaf wird erneut verweigert. Dies ist nun eine **ausdrückliche erneute Buchungsabsicht des Testspielers**. |
| **Runner 90 / Engine 80 / User 179, Reply 180** | Trotz bereits gebuchter Nacht führt die wiederholte ausdrückliche Buchungsabsicht über ein NEUES Angebot offer.t180.10 zu weiterer -1 cp (200 auf 199), zweitem transaction.completed und zweitem service.granted lodging für dasselbe Hospizbett und dieselbe kommende Nacht. Schlaf im selben Playerturn erneut verweigert. |
| **Runner 91 / Engine 81 / User 181, Reply 182** | Erst die reine Aktion I take the booked bed and sleep until morning ohne weiteren Kauf schläft tatsächlich 678 Minuten, HP 32 auf 215/215, Tag 3 08:00. Genau eine Nacht geschlafen. |

**Neubewertung nach Sol-Gegenreview und erneuter Originalprüfung: kein finanzieller P1-/Idempotenz-Hotfix.** Zwei **getrennte, tatsächlich gewährte** Bettkäufe wurden mechanisch korrekt als zwei Transaktionen abgewickelt; weder dieselbe Kaufentscheidung doppelt ausgeführt noch Geld ohne Service abgebucht. Der erste Kauf war bereits sichtbar bestätigt. **Der echte vermeidbare Fehler liegt am Anfang der Kette: der Planner macht aus „I take the bed and sleep“ eine neue Kaufabsicht und versperrt den Schlaf.** Erst danach fordert der LLM-Testspieler freiwillig erneut eine Buchung. Die gleichzeitig angezeigte frühere Schlafverweigerung und neu abgeschlossene Zimmerbuchung sind für Spieler irreführend. Keine .113-Regression und keine verpflichtende neue Buchungssperre ableiten.

**Positive Gegenprobe von Sol (nicht hier neu ausgeführt):** Auf dem tatsächlichen Zustand **nach** der ersten Buchung akzeptiert die Engine eine reine Schlafaktion, heilt den Warrior auf **215/215 HP** und belässt ihn bei **200 cp**. Die Service-/Schlafmechanik funktioniert also, sobald der Planner keinen künstlichen Kauf davorstellt. **Optional später:** Planner-Kontext für bereits bezahlte Leistungen und die Reihenfolge/Klarheit der Erfolgsanzeige verbessern. **Keine Sperre erneuter Käufe für gleichartige Nächte aus diesem Einzelverlauf**: Weitere Gäste, Nächte, Zimmerwechsel und Upgrades können legitime eigenständige Leistungen sein. Kein Fix vor dem nächsten Batch erforderlich.

## 3. Mage-Tod: mechanisch erklärter Risikoverlauf

Runner-T77/Engine-T62 im Boar Wallow Hollow nach drei zuvor besiegten Thornback-Boars: Mage Level 5, bereits nur 53 HP, attackiert den verbleibenden Thornback Boar A (Level 7, 108 HP) mit Arcane Bolt. Der eigene Hit verursacht 51 Schaden (Boar 108 auf 57). Die Initiative des Ebers und First-Strike-Mechanik führen noch vor einem weiteren Spielerzug zu zwei Gore-Attacken über 26 und 29 Schaden, HP 53 auf 27 auf 0. Entity.status pc dead, encounter.ended pc_dead=true, kein XP. Die Schadenwerte und der Endstatus stimmen. **Kein Planner-/Narrator-/World-Crash und kein Beleg eines Damage-Bugs.** Gefährliche vierte Gegnerwahl bei angeschlagenen HP nicht mit pauschalem Gegner-Nerf beantworten.

## 4. Nachgeordnete P2-/Langzeitbefunde

- Mage Runner-T51: Player versucht an einen noch nicht kanonisch anwesenden Guild-Materiel-Clerk zu verkaufen. Der Planner liefert zweimal sell mit to als Objekt der Form {new: 'the Guild materiel clerk'}. Kein Verkauf bzw. Geldabgang zu einem abwesenden Verkäufer: korrekt. Die Ausgabe CANNOT SELL — [object Object] is not here zeigt das Objekt aber nutzerunfreundlich: **P2 für UI/Typdarstellung**, kein nachgewiesener finanzieller Fehler. Ein spontaner neuer Clerk darf nicht allein durch den Planner als anwesend behandelt werden.
- Mage: zwei Dungeon-Weltabwehrmeldungen dungeon_foe_refused um Runner-T45 für erzählte nicht autorisierte weitere Gegner. Die Engine verhindert deren Buchung. Zwei cull_count-Hinweise: ein Serpent-Auftragsziel zählt mechanisch 1, Texte erwähnen widersprüchlich 1/2. Kein automatischer Count-Defekt behauptet.
- Warrior: tatsächlich sichtbare Gegnerlabels Feral Dog M/N/O und später P/Q/R..., obwohl wenige Hunde gleichzeitig anwesend sind. Dies entspricht der unabhängig geprüften globalen Handle-Zählung über persistierte Entities. **Bereits geplante Idee** in 04 Ideenkatalog §7c: normale Gegner später aggregieren, Dungeon-/Boss-Slot-, Zyklus- und Creditbelege erhalten. Kein Sofort-Hotfix.
- Warrior: 10 reparierte Extractorantworten und 4 Planner-Reparaturen; Mage: 12 und 11. Keine fatalen Modellabbrüche. Sichtbare Probleme der LLM-Spieler unterscheiden von verlorenen autoritativen Enginehandlungen.
- Fortschritt: Warrior L9/150 Inputs, Mage L5/77 Inputs. Beide 0 EquipmentChanges im Evaluation-Coverage; Warrior ein angenommenes Rare-Passive, zwei Proficiency-Aufstiege, ein nicht angenommenes aktives Skillangebot. Keine Schlussfolgerung, dass Gear oder Skilllernen grundsätzlich kaputt ist; natürlicher F-zu-E-Übergang bleibt nicht abgenommen.

## 5. Priorität und Freigabegrenze

1. **Kein verpflichtender Zimmer-/Zahlungs-Fix.** Die genaue Folge ist **Runner 87–91 = Engine 77–81** (Chat-Indizes 173–182); die Buchung bei Engine 77 war korrekt, der Planner missverstand die reine Schlafaktion bei Engine 78, erst danach wiederholte der LLM-Testspieler ausdrücklich den Kauf. Sols positive reine Schlaf-Gegenprobe bestätigt den vorhandenen gültigen Weg. Allenfalls später kleine Planner-/UI-Verbesserungen, wenn sich das Muster wiederholt.
2. Kein aus Mage-Tod abgeleiteter Combat-Nerf; T51 nur P2 und nicht zwischen die Langläufe priorisieren.
3. Die bereits vorgemerkte Gegner-Verdichtung getrennt als spätere Langzeitoptimierung belassen. Für F-zu-E weitere echte Läufe Richtung Level 15 und gemeinsame Balancebetrachtung.

**Nur Review/Runindex auf main. Original-ZIP nicht committed; kein Produktcode, Runner, Test, Balance oder Host geändert.**
