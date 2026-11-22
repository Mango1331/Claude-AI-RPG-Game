# Batch 13 – unabhängiger Review des natürlichen .116-AoE-Laufs

Stand 29.10.2026. Original: batch-20261029-091447Z.zip; 59.942.725 Bytes, 49 Einträge, CRC vollständig OK; SHA-256 8007684c6a6ea8fae5590a88779d8fe0b1cbbf21be93dc247b100ba5c7b798c0. Als Chatupload geprüft, nicht auf GitHub abgelegt. Basis: run.json, evaluation.json, avereth-events.json, player.jsonl und produktseitige Guild-/AoE-Regeln. Eine unabhängige vollständige foldChat-/validateState-Ausführung fand nicht statt. Dokumentation, keine Codeänderung.

## 1. Enden und Build

Alle drei Profile: 4.3.0-c.6.6.116, echte GLM-5.3-Flash-Spieler, starter_aoe:true und f_balance:true, keine modifizierten Produktdateien, keine Server-/PageErrors, letzte Engine-Integritätsmeldungen OK. Produkt-HEAD **846a7c3ce0be**, ein reiner Runner-Shopping-Folgecommit auf den AoE-Patch 41a17fc; keine neue AoE-Engineversion. Jeweils Basic Attack zusätzlich zur Auswahl von Warrior Guard+Cleave, Mage Arcane Bolt+Arcane Wave und Rogue Evasive Step+Fan of Blades.

| Profil | Inputs | Engine-Turns | Endlevel/Ende | Kämpfe | Guildabschlüsse |
|---|---:|---:|---|---|---:|
| Warrior | 150 | 136 | L1, Inputlimit lebend | 1 Sieg/1 Begegnung | 0 |
| Mage | 150 | 133 | L8, Inputlimit lebend | 17 Siege/17 Begegnungen, 27 besiegte Gegner | 6 |
| Rogue | 52 | 45 | L1, mechanischer Tod | 0 Siege/1 Begegnung | 0 |
| **Gesamt** | **352** | **314** | 2 Limits, 1 Tod, kein terminaler Technikstopp | **18 Siege/19** | **6** |

4.940 Originalevents: 1.834 Warrior, 2.469 Mage, 637 Rogue. Sichere Fehlermodell-Fortsetzungen: Mage 2, Rogue 1, Warrior 0. Das ist keine vollständig fehlerfreie Serie.

## 2. AoE – echte Mehrzielwirksamkeit und Friendly Fire

| Skill | Erfolgreiche Anwendungen | Einzeltreffer | Mehrzielaktionen |
|---|---:|---:|---:|
| Cleave (Warrior) | 0 | 0 | 0 |
| Arcane Wave (Mage) | **12** | **29** | **8** |
| Fan of Blades (Rogue) | 0 | 0 | 0 |

**Mage-Nachweise:** Im ersten Glimmerdeep-Dungeonkampf trifft Arcane Wave zunächst vier Beetles auf SHORT mit 25/26/27/25 Final Damage, dann dieselben vier auf ENGAGED mit 29/25/29/29. Jede Aktivierung kostet **einmal 14 MP**. Spätere 2er- und 3er-Gruppen werden ebenso getroffen. Zwölf Aktivierungen entsprechen insgesamt 168 MP über verschiedene Ressourcen-/Rastphasen. Zielbandwechsel und separate Schadensberechnung sind natürlich belegt; der zuvor kaum verwendete neue Skill ist im zweiten Batch praktisch nutzbar.

**Drei tatsächliche NPC-Verletzungen:** In den Original-Engineaktionen bei Chatindex 109 trifft Arcane Wave im gewählten SHORT-Band drei Wölfe und zusätzlich die NPCs Hesta (**35 Schaden; danach 50 HP**) und Wat (**34; danach 51 HP**). Bei Chatindex 293 trifft eine SHORT-Wave den Wolf mit 46 sowie den Jungen Dane mit **47; danach 38 HP**. Entsprechende resource.changed-HP-Buchungen vorhanden; Hesta und Wat werden zusätzlich wary. Der Runner erkennt die eigene Verursachung anschließend ausdrücklich an und entschuldigt sich, vermeidet sie aber vorher nicht zuverlässig.

**Wertung:** Das ist die beschlossene Regel „alle gültigen Ziele in genau einem gewählten Reichweitenband“, kein nachgewiesener Zielfilter-/Doppelkostenfehler. Aber ein erhebliches taktisches Risiko: Vor neuer Balanceänderung prüfen, ob die Positionen/Neutralen dem LLM vor der Wahl klar sichtbar waren. Keinen heimlichen Gegner-only-Filter ergänzen. Cleave und Fan wurden zwar gebucht, aber nie eingesetzt: Dieser Batch liefert keine Aussage zur realen Klassenwirkung dieser beiden Fähigkeiten.

## 3. Warrior – gravierende Guild-Stagnation statt XP-Fehlformel

Warrior erschlägt bereits bei Engine-T13 einen Wolf L1 mit Basic Attack (31 Final Damage), erhält 30 Kampf-XP und erfüllt den ursprünglich an der **Glassmere-Gilde** angenommenen Vertrag „Slay the Lamb-Rending Wolf of Stonebrook“. Der Auftrag ist READY und bleibt es; insgesamt fünf quest.ready-Einträge. **Kein** quest.completed, keine der vertraglichen 40 cp und keine Quest-XP. Trotz 150 Inputs L1/30 XP. Die 50 Startkupfer gehen nach Guildregistrierung (20 cp) und echten Dienstleistungen (30 cp) auf **0 cp** zurück.

**Ursache im Original:** Es sind **43** cmd.resolved für quest.turn_in vorhanden, **alle verweigert**: 41-mal „not at a Guild hall“, je einmal „needs step 1“ und „needs step 2“. Der Narrator erzeugt/erzählt wiederholt Guildhallen, Branches und Kassenschalter in Stonebrook, Millbrook, Milldale, Millhaven und Marlow Ford. Diese Orte erfüllen jedoch nicht die kanonische Hallenprüfung (src/v4/domain.js hallOf sucht einen Place mit guild_hall-Tag in der Ortslinie). Der Player wird wiederholt in neue angebliche Quittungs-/Scheine-/Kassenprozesse verwickelt, statt zu einer tatsächlich anerkannten Gildenhalle zurückzukehren oder andere Einkommensmöglichkeiten zu wählen. **Die Engine verweigert die nicht autorisierte Auszahlung korrekt**, der Spielverlauf stagniert aber nach dem frühen READY-Kill über mehr als hundert Inputs.

**Priorität P2 hoch / konkreter Langlauf-Blocker:** Originalturns für die erste und wiederholte Refusal, kanonische Zielhallen und sichtbares Spielerfeedback gezielt untersuchen. Eine wirksame Korrektur soll den Unterschied zwischen Guildkulisse und autorisierter Halle transparent machen und die echte Route beziehungsweise sinnvoll anderen Fortschritt ermöglichen. **Keine pauschale Vergabe des guild_hall-Tags an beliebige Hallenerzählungen; keine ortsunabhängige Auszahlung, keine erfundenen 40 cp oder XP.** Aus diesem Run nicht die XP-Multiplikatoren erhöhen. Die Runner-Shopping-Änderung 846a7c kann bei 0 cp keinen Warenupgrade-Nachweis produzieren.

## 4. Mage – substantieller Fortschritt ohne Ausrüstungsupgrade

17/17 Kämpfe gewonnen, 27 besiegte Feinde, sechs tatsächlich bezahlte Guildaufträge. Glimmerdeep Grotto Ebene1 mit gebuchtem dungeon.cleared (PC-credit, Zyklus1, drei Slots inklusive Boss/Guardian). **3.076 kumulierte XP** = 2.292 Kampf- plus 784 Quest-XP, **Level8, 276/800 aktuelle XP**. Bei 100 Inputs Level6 und 1.092 cp, am Ende **1.252 cp**. Die Einnahmen aus Gildenaufträgen und echten Lootverkäufen sind autoritativ. Trotz sehr guter Kassenlage **kein equip-Event und kein hochwertiger F-Waffenkauf**; weiterhin Starterstaff und Starterrobe. Mage Basic Attack erreicht P2, Arcane Wave sammelt PP; kein neuer erlernter aktiver Skill. Ein hoher Kontostand belegt die Lücke zwischen ökonomischem Fortschritt und tatsächlicher Ausrüstung, aber nicht den Grund: Händlerofferten, Qualität, Preise und Player-Auswahl noch konkret vergleichen.

**Zwei sichere Planner-Fortsetzungen (T90/T91)** betreffen misslungene Loot-Verkaufs-Commands: ambige Mengen-/Preisdefinition und nicht wortgetreue quote. Keine rechtswidrige Transaktion; spätere Verkäufe funktionieren. Kein fataler Provider-/Engineabbruch, aber diese Inputs waren nicht produktiv. Wiederholung als eigene enge Rot-/Grün-Sonde vormerken, nicht jeden Sell-Fehler sofort global fixen.

## 5. Rogue – Solo-Tod ohne benutzte Starteroptionen

Rogue wählt Evasive Step und Fan of Blades, aber keine offensive Einzeltarget-Startertechnik. Vor dem einzigen Encounter 52 Eingaben mit Guildkontakten, Board- und Reiseproblemen, Handel und Angeln, **0 Questabschlüsse, 0 Kampf-XP**. Der tatsächlich angegriffene **Millpond Snapper A ist L7, HP79, ATK26**, gegenüber L1 Rogue HP90, DEF3. Rogue nutzt Basic Attack dreimal mit **19/22/21 Schaden**, der Snapper bleibt mit 17 HP am Leben; vier Bisse mit **25/22/24/23** verursachen den mechanisch gebuchten Tod. Der Spieler nutzt weder Evasive Step noch Fan of Blades noch Flucht. **Kein Schadenformel- oder Fan-Defekt belegt**. Einzelgegner-Level und ungenutzte Defensive sind entscheidend.

Technische Begleitfälle: zwei initiale nichtfatale board.failed, weil vorgeschlagener Boar und River Eel die geforderte schwache Intro-Einzelbegegnung nicht erfüllen; später gültiges Board. Eine nach Repair weiterhin ungültige quest.detail-Extraktion (`new` statt `id`) führt zu extract.failed und sicherer Fortsetzung, nicht zum Tod. Das sind Daten für Board-Generatorqualität und World-Schema-Fail-soft, keine AoE-Regression.

## 6. Bewertung, Prioritäten und Abgrenzung

- **Keine sofortige AoE-/Monster-/XP-/DEF-Zahlenänderung**. Mage-AoE hat gute natürliche Mehrzielabnahme; Warrior/Rogue-AoE bleiben ohne Benutzung ungetestet. Kein Level15-Beleg.
- **Wichtigster unmittelbarer Prüfauftrag ist die Guild-Hall-Schleife des Warriors.** 43 verhinderte Auszahlungen bei tatsächlich READY sind ein gravierendes Produktivitätsproblem trotz korrekter autoritativer Geldsperre. Eng gegen die Originalkommandos untersuchen, bevor weitere 150er-Läufe daran verloren gehen.
- **Freundbeschuss bewusst behalten**, aber LLM-Erkennbarkeit und Folgekommunikation nachvollziehen; drei HP-Änderungen sind nicht bloß Story.
- **Gear bleibt offen**, trotz Mage 1.252 cp. Händler- und Shopping-Entscheidungen konkret nachvollziehen; keine unbewiesene Waffenpreis- oder Schadensbehauptung.
- **Technik:** zwei abgefangene Mage-Plannerfehler, ein Rogue-Extractorfehler, zwei Rogue-Boardschleifen; keine terminale Technikstörung und gemeldete Integrität OK. Kein Anlass, Autoritätsprüfungen für Guild/Handel/Dungeon aufzugeben.

**Nur diese Reviewdatei und der Index werden auf main publiziert; Original-ZIP nicht hochgeladen, Produktcode und Runner nicht verändert.**
