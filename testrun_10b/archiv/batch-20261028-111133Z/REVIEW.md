# GPT-Review – Natürlicher Batch 7 auf .112, 28.10.2026

**Status:** unabhängige ZIP-/Original-Event-Auswertung, keine Code-, Test-, Runner- oder Balanceänderung. Dritter Run wurde nach Nutzerangabe und Originalstatus **bewusst** vor der ersten Eingabe gestoppt.

## 1. Originalquelle und Laufklassifikation

Original: batch-20261028-111133Z.zip, **38.624.587 Bytes** (36,83 MiB), SHA-256 **12135c1eae8af2092311a037c8bac233175784fa01cab81c3b3ddcba2e02fdb6**, 49 Einträge, vollständiger Python-ZIP-CRC-Test **fehlerfrei**. Grundlage: batch.json, alle run.json und evaluation.json, gezielte Prüfung der avereth-events.json, Chat-, Spieler- und Modellprotokolle. **Original-ZIP bleibt im Chat und ist nicht auf GitHub main gespeichert.**

Alle Runs: **4.3.0-c.6.6.112**, Produktcommit **d9c259f98f2d**, sauberer Checkout. Die folgenden Befunde sind **keine automatische Aussage**, welche Abweichung bereits in .106 oder .111 bestand.

| Run | Inputs | Level | Endgrund | Guild |
|---|---:|---:|---|---|
| Warrior | **80** | 6 | **Gebuchter PC-Tod** im Kampf, Runner-T80 / Engine-T73 | Ashbridge, Novice, T5 |
| Mage | **150** | 8 | Konfiguriertes **150-Input-Limit**, aktueller Kampf noch offen | Alderwatch, Novice, T5 |
| Rogue | **0** | – | **Manuell Ctrl+C vor jeder Eingabe** | Keine Erstellung oder Mitgliedschaft |

**230 gespielte Inputs, 3.090 Engine-Events** (Warrior 1.135, Mage 1.955), 26 begonnene Kämpfe, davon 24 Siege (9+15), ein PC-Tod, ein beim Mage offener Kampf; **11 abgeschlossene Guild-Aufträge** (4+7). Kein fataler Planner-/World-Abbruch laut Auswertung. Beide gespielten Run-Protokolle haben leere pageErrors/serverErrors und melden Integrity OK. Dies ist keine eigenständige vollständige validateState-/Replay-Nachprüfung durch GPT. Rogue hat nur den Startzustand und keine LLM-Aufrufe; das übergreifende batch.json interrupted beruht auf diesem **manuellen** Stop, nicht einem Rogue-Defekt.

## 2. .111/.112-Gildenstart – positives natürliches Ergebnis

Warrior und Mage führen in **Runner-T3 einen tatsächlichen GO in die Guildhall** aus: loc.ashbridge.guild_hall bzw. loc.alderwatch.guild_hall. In T4 öffnet die Engine jeweils das kanonische offer.registration mit 20 cp; **Runner-T5** bucht jeweils genau einmal transaction.completed für dieses Angebot, coin.changed **50 → 30 cp**, guild.registered (Novice) und die offizielle Guild-Platte. Questannahmen beginnen danach autoritativ und ohne Phantommitgliedschaft.

Warrior behält **Heavy Slash + Guard**, Mage **Arcane Bolt + Arcane Ward**. Keine erneut erfundene Charaktererstellung oder unberechtigte Starter-Skill-Buchung im jeweiligen Einstieg sichtbar. Dies ist **positive Evidenz** für den konsolidierten Gildenstart, aber kein Beweis, dass die vormals problematische wörtliche Frage nach dem Registrierungsweg in einem natürlichen Reparaturlauf oder ein pay mit leerem for hier isoliert getestet wurde. Beide Startläufe nennen Bewegung und spätere Registrierung relativ eindeutig.

## 3. P1-Prüfkandidat: Mage zahlt zweimal für dieselbe Nacht

**Wheatsheaf in Alderwatch, NPC npc.npcwheatsheaf_widow.** Die konkreten Originalaktionen und autoritativen Eventbuchungen zeigen:

| Runner / Engine | Zahlungs- und Leistungsereignis |
|---|---|
| **T142 / E130** | GO zum Wheatsheaf und bis 8 cp beabsichtigter Zimmerkauf; Kauf **conditional**, Schlaf wegen arrival pending nicht ausgeführt. Ein gültig angenommenes Zimmerangebot liegt noch nicht vor. |
| **T143 / E131** | Spieler: I pay the innkeeper the eight copper for the room she offered, then go up and sleep. Planner erzeugt **pay** an die NPC, Zweck the room. **coin.changed −8 cp: 424 → 416**, transaction.completed. **Kein service.granted.** Sleep ausdrücklich **refused: room not booked**. |
| **T144 / E132** | Spieler betont, das Geld sei für das Bett. Neuer Kauf wird pending; erst jetzt entsteht das passende **Zimmerangebot offer.t288.12** zu 8 cp. Alte Zahlung wird nicht als Leistung angerechnet. |
| **T145 / E133** | Annahme des Offers bucht **noch einmal −8 cp: 416 → 408**, transaction.completed und **genau ein service.granted lodging**; erst jetzt erfolgt der Schlaf. |

**Ergebnis: 16 cp Geldabgang für eine gebuchte Zimmernacht**, ohne Beleg für ein Trinkgeld oder eine absichtlich zweite Nacht. Der erste freie Geldtransfer wird unabhängig verbucht, obwohl die Zimmerleistung nicht erbracht und der anschließende Schlaf verweigert wird. Dies ist ein **konkreter Zahlungssicherheits-/Leistungskopplungs-Prüfkandidat** beim gewöhnlichen Servicepfad, nicht bei der Guild-Registrierung. Keine Aussage, dass .112 diesen Fehler neu eingeführt hätte.

**Gezielte spätere Regressionen (nicht implementiert):** Offenes passendes Zimmerangebot und bezahlte Buchung müssen atomar zusammenlaufen; Zahlung für ein noch nicht buchbares Zimmer darf nicht unwiederbringlich als freie Überweisung enden; Wiederholung der gleichen Nacht darf nicht erneut kosten. Echte unabhängige Geschenke/Trinkgelder, andere Termine, andere Dienstleistungen und bestehende normale Zahlungen müssen möglich bleiben. Vor Umsetzung das Original gegen ältere Produkt-Builds sondieren; bestehende Offer-/Buy-/Pay-/Service-Strukturen statt eines neuen Zahlungssystems verwenden.

## 4. Warrior: Tod auf Ebene 2 nach Annahme eines Level-1-Auftrags

**Runner-T71**: Der Warrior nimmt die Guild-Quest **Clear Mossback Warrens Level 1** an, deren kanonisches Ziel **floor: 1** ist. Sie warnt ausdrücklich vor Gruppen und stärkeren Gegnern; auch die Clerk warnt in der Erzählung, dass ein Solo-Dungeon gefährlich ist. T76 erreicht er die Warrens, T77 betritt er das Innere mit einem Vorraum und einer Gabelung: links eine absteigende Treppe, rechts ein ebener Tunnel. **T78** wählt der Spieler die Treppe ausdrücklich mit dem Ziel **toward level 1**. Die Engine gibt dafür **dungeon.ahead floor: 2, slot guards** vor.

**Runner-T79 / Engine-T72:** Encounter gegen drei bewaffnete Goblins **Level 15, 16 und 17, alle Rang E**; Warrior Level 6/F mit max. 195 HP und DEF 11. Er greift den Cleaver-Träger mit Heavy Slash an. Sein HP-Wert sinkt von **195 auf 87**. **Runner-T80 / Engine-T73:** erneuter Heavy Slash; Goblins töten ihn, **HP 0, entity.status dead, encounter.ended pc_dead=true, keine Kampf-XP**. Das ist ein autoritativ verbuchter Tod, **kein Crash**. Eine fehlerhafte Schadensrechnung wird aus dem Export nicht nachgewiesen.

**Offene Hypothese:** Der Spieler erwartet Level 1, die Engine führt ihn auf der gewählten Treppe aber zu floor 2. Möglicherweise führt die Treppe korrekt vom Floor-1-Eingangsraum nach Floor 2, oder Floor-Label und Spieler-/Questinformation sind unzureichend abgestimmt. Die Quest-Gefahrenwarnung ist real, aber der konkrete **E-Rang-Levelsprung** wird vor Betreten dieser Treppe nicht eindeutig vermittelt. Vor jeder Balanceänderung ursprüngliche Living-Dungeon-Vorstände, Etagenzählung, Raumverbindung und Gefahrenkommunikation prüfen; weder alle starken Goblins herabskalieren noch unzulässige Gegner pauschal verbieten. Der Spieler kann riskante Entscheidungen treffen, muss aber ihren Ort und die erkennbaren Risiken nachvollziehen können.

**Monsterdesign-Querverweis:** Der Narrator zeigt zwei Speere und einen Cleaver. In allen drei autoritativen Combat-Snapshots heißt der Angriff jedoch **Natural/unarmed strike**. Konkret belegte Diskrepanz zwischen Narrativ-Waffen und Kampfprofil; als **Designbeobachtung** zum bestehenden Monsterdesign-Gegenreview führen. Die Bewaffnung darf nicht aus beliebigen Text-Keywords als mechanischer Angriff oder garantierter Drop erfunden werden. Kein Teil des jetzigen Zahlungs-P1.

## 5. Robustheit, Spielentwicklung und Grenzen

- Warrior: **ein erfolgreich aufgefangener Narrator-Retry**, neun reparierte Extractorantworten aus den Events, einige Planner-Reparaturen. Mage: **eine leere Extractorantwort (Runner-T16)** nach Length-Ende, als applied repariert, keine terminale Fail-soft-Continuation nachgewiesen. Kein fataler Planner-/World-Fehler in beiden Runs.
- **101 delta.rejected-Events** (41 Warrior, 60 Mage) sind Schutz-/Validierungsablehnungen und nicht gleich viele sichtbare Spielerblockaden. Sichtbare Runner-Panels: Warrior **2 CLARIFY / 1 NOT TAKEN**, Mage **2 CLARIFY / 3 NOT TAKEN / 1 REFUSED**.
- **Level 15/F→E und Rogue nicht getestet**. Kein kontrollierter Klassenvergleich. Warrior endet bei L6, Mage bei L8. Der Mage erreicht das 150-Input-Limit während eines neuen Ghoul-Encounters, nicht im Zustand eines besiegten oder abgeschlossenen Kampfes.
- In den Evaluation-Coverage-Daten beider Runs **0 Ausrüstungswechsel**; der Mage zeigt einen Skill-Proficiency-Fortschritt, kein natürlicher Nachweis neuer aktiver Skills oder Passives. Fehlende gezielte Gear-/Trainingstests beweisen keinen Defekt des Gear- oder Lernsystems. Repetitive Guildjagden bleiben eine Gameplaybeobachtung, kein Argument für pauschale XP-Erhöhung.
- Einige Kaufanfragen enden als Clarify/Not Taken, beim Warrior beispielsweise zwei aufeinanderfolgende Zimmeranfragen T73/T74, bevor T75 das Zimmer/Supper-Paket erfolgreich bucht. Diese Friktion ist vom **wirklichen Mage-Geldverlust T143–145** getrennt.
- Laufzeit inklusive Setup: Warrior **34:44**, Mage **64:12**; zusammen rund **98:56 Minuten**. Kein normierter Vergleich mit anderen Builds.

## 6. Fachpriorität ohne Freigabe

**Zuerst** Mage-T143–145 als finanzielle Integritätsfrage isoliert gegen ältere Engines prüfen und mit positiven/negativen Regressionen absichern. **Danach** Warrior-T76–80 auf Level-1-Quest versus Floor-2-Abstieg und sichtbare Gefahrenhinweise untersuchen. Positives Ergebnis der beiden natürlichen .112-Gildenregistrierungen festhalten, aber nicht als vollständige natürliche Abnahme sämtlicher .111/.112-Gegenfälle ausgeben. Keine neue große Promptänderung oder Zahlenskalierung allein aus diesem Batch.

**Stand:** unveränderte Originaldaten; Review und Runindex allein auf main. Keine Engine-, Test-, Runner-, Wirtschafts- oder Balancemodifikation.