# Unabhängiger GPT-Review – Batch 11 / .115 und historische Klassenüberlebensbilanz

**Stand 29.10.2026.** Grundlage: originale hochgeladene ZIP plus überflogene historische 10B-Guild-Runreviews auf main. Nur Dokumentation, keine Implementierung oder neue Testausführung.

## 1. Originalbeleg und Enden

ZIP: batch-20261029-025441Z.zip, SHA-256: 52e206049e8f025d475c8272c4a5dd3271a5c27dd1198f2d248a8097adb3dc82. Etwa 31 MiB, 50 Einträge, vollständige CRC-Prüfung ohne Fehler. **Original-ZIP nicht auf GitHub main.** Build 4.3.0-c.6.6.115, Produktcommit 9c65e9ada6a2f9eb60632525136fbdbbd5c85f41, echte GLM-5.3-Flash-Runs über SillyTavern 1.19, sauberer Build, kein Stub. Runstatus aller Profile: integrity OK, keine PageErrors oder ServerErrors, Profil unverändert. Die ZIP enthält drei tatsächlich abgeschlossene Runnerprozesse; keiner erreichte das Ziel Level 15.

| Profil | Spielerinputs | Endlevel | Ende | Kämpfe | Gildenabschlüsse |
|---|---:|---:|---|---|---:|
| Guild-Warrior | 150 | 6 | Reguläres Inputlimit, nicht gestorben | 10/10 Siege; alle 10 Kämpfe gegen genau einen Gegner | 3 |
| Guild-Mage | 19 | 2 | Mechanischer Tod | 1/2 Siege; zuletzt 5 Hunde | 0 |
| Guild-Rogue | 23 | 1 | Mechanischer Tod | 1/2 Siege; zuletzt 3 Goblins | 1 |
| Gesamt | 192 | | 1 Limit / 2 Kampftode / 0 terminale technische Stopps | 12 Siege, 14 Encounter | 4 |

**Wichtige Einschränkung zum Warrior:** run.json weist safeContinuations=1 aus, evaluation.json modelFailures.world=1. Bei Chatindex 110 nach Runner-T55/Engine-T55 scheitert eine Extraktion nach Reparatur an einer ungültigen place.reported.place-Referenz, extract.failed wird verbucht. In der folgenden Antwort werden wieder gültige Deltas übernommen; die nicht anwendbaren Worlddeltas des fehlgeschlagenen Turns bleiben aber verloren. **150 Inputs ohne terminalen Abbruch sind nicht gleich 150 fehlerfrei angewendete Worldturns.** 133 turn.begun und 130 extract.applied stehen im Export. Eine unabhängige vollständige Event-Neufaltung wurde nicht zusätzlich ausgeführt; integrity OK ist die Originalstatusmeldung.

## 2. Was Build .115 natürlich belegt

**Positiver Habitat-Fixbeleg:** Der echte Warrior-Planner gibt mehrfach GO.within für örtliche Fortsetzungen aus; die World erzeugt old mooring posts und willow hummock unter dem etablierten millpond-reed-bank-Habitat sowie north strip, striker larder und striker den unter dem Bramblewick-Orchards-Habitat. Die dort entstandenen Whip-Tailed Strikers besitzen population_at des Orchards-Jagdgebiets und Level 4 bis 7. Der Mage erzeugt die ridge above tanning sheds als Unterort des Feral-Dog-Habitats; fünf Hunde behalten population_at und Level 6/6/6/6/7. Das ist der jetzt tatsächlich natürliche Nachweis der zusammengehörigen Planner-/Orts-/Gegner-/Questkette. Unabhängige Reiseziele bleiben separat.

**Board:** Rogue erhält nach einem initialen anderen Boardfehler einen gültigen Level-1-Dungeon-Clear für Mossback Warrens und nimmt ihn an. Der konkrete alte .114-Fehler mit der Level-2-Warnung tritt hier nicht nochmals in identischer Form auf. Die beiden initialen nichtfatalen board.failed betreffen andere Eingaben: Warrior: introductory Millpond Frog mit ungeeigneter L1-Stärke; Rogue: Novice board needs an introductory single-foe hunt. Keine neue Board-Regressionsbehauptung.

**Provider-Recovery und Warenkonsens:** Der spezifische HTTP-200-internal_server_error tritt nicht erneut auf, daher kein natürlicher 1:1-Beleg für die .115-Providerklassifikation. Der Warrior-Schema-Extractorfehler ist ein anderer Fall mit anschließender sicherer Fortsetzung. Eine gleichpreisige falsche Warenpositionenauswahl wie in .114 wurde hier nicht beobachtet; für den Handelsfix bleibt die technische Abnahme maßgeblich.

**F-Balance:** Keine Fachhändler-F-Waffenofferte und keine Ausrüstungsänderung in sämtlichen drei Profilen; die neue Waffenstaffel ist weiterhin natürlich nicht bewertet. Keine neue aktive Technik, kein Proficiency-Aufstieg. Die 50-PP-Schwelle funktioniert: Warrior Heavy Slash P1/36 und Basic P1/18; Mage Bolt P1/18; Rogue Piercing Thrust P1/18. Alle blieben unter der neuen Promotiongrenze.

## 3. Kampf-, Risiko- und Progressionsanalyse

**Warrior:** 150 Inputs, Level 6, 10/10 Siege sämtlich gegen einzelne Gegner, drei abgeschlossene Guild-Hunts (Mire Lynx: 50 cp/46 XP; zwei Orchard-Striker-Abgaben je 140 cp/300 XP). 964 Kampf-XP + 646 Quest-XP = 1.610 kumulierte XP. Endkonto 338 cp, ohne mechanisches Gear-Upgrade. L4 nach 100 Eingaben. Ein großer Teil der Eingaben entfällt auf Reise, Stadt- und NPC-Kontakte; eine 150er-Rohturnzahl misst daher nicht allein den XP-Fluss. Die sicher fortgesetzte Extractorfehlstelle ist getrennt zu beachten.

**Mage:** L1 gewinnt gegen einen L5-Hund und erhält 120 XP, erreicht L2. Auf L2 geht er mit zuvor 77/100 HP gegen fünf L6/6/6/6/7-Feral-Dogs mit ATK 19/19/19/19/21 vor. Der Spieler versucht im Text Arcane Ward und Arcane Bolt, aber die Engine gewährt keine zwei kostenlosen Hauptaktionen. Der folgende Gruppenkampf endet bei HP 0 und 0 XP für den verlorenen Encounter. Die fünf Gegner haben den korrekten Habitatbezug. **Kein nachgewiesener Damagebug oder falsches Habitatlevel**, sondern extreme Überzahl/Leveldifferenz und riskante Spielerwahl.

**Rogue:** L1 gewinnt gegen einen L1-Hund, erhält 24 Kampf-XP und schließt einen 46-XP-/40-cp-Gildenauftrag ab: L1/70 XP. Dann nimmt er freiwillig die ausdrücklich als gruppenriskant beschriebene F-Dungeon-Ebene 1 von Mossback Warrens an. Gegen drei Goblin Scouts mit L4/L3/L1, 72/63/45 MaxHP und ATK18/16/11 startet der Kampf bei 84/90 HP; die HP gehen 84→56→21→1→0. Der Spieler greift selbst bei angezeigtem 1/90 HP noch offensiv an. Rogue DEF3 gegenüber Warrior DEF8 bei L1 in diesem Batch; Gefahr durch mehrere Gegneraktionen bei kleinerer Abwehr ernst nehmen, aber nicht ohne kontrollierten Vergleich als Klassenfehler behaupten.

**Fazit zu .115:** Wieder zwei mechanische Tode, aber nicht durch eine erhöhte .114-Monsterskalierung. Warrior-Überleben profitiert in diesem Batch erheblich von Einzelgegnerwahl. XP×2, Stats7, Waffenkalibrierung und alle Monsterwerte zunächst belassen.

## 4. Historische Guild-Survival-Übersicht (ab .101; ältere Reviews überflogen)

**Explizite Stichprobendefinition:** nur tatsächlich gestartete Guildprofile mit mindestens einem echten Spielerinput aus den dokumentierten 10B-Batches .101 bis .115. Exkludiert: Exploreprofile (anderer Spielstil), frühe technisch nicht vergleichbare .100-Starts, Null-Input-Profile, manuelle Abbrüche einschließlich .110-Warrior und nicht gestartete Fälle. Die beiden separaten .113-Batches werden separat gezählt.

| Build | Warrior | Mage | Rogue |
|---|---|---|---|
| .101 / Batch 2 | 150/L7 Limit | 99/L3 Tod | **150/L8 Limit** |
| .102 / Batch 3 | 250/L10 Limit | 102/L5 technischer Stopp | 87/L2 Tod |
| .104 / Batch 4 | 137/L7 technischer Stopp | 46/L5 technischer Stopp | 29/L2 Tod |
| .106 / Batch 5 | 250/L7 Limit | 250/L10 Limit | 0 Input, ausgeschlossen |
| .112 / Batch 7 | 80/L6 **Tod auf E-Dungeon-Ebene** | 150/L8 Limit | 0 Input, ausgeschlossen |
| .113 / Batch 8 | 22/L1 Provider-429-Stopp | 0 Input, ausgeschlossen | nicht gestartet |
| .113 / Batch 9 | 150/L9 Limit | 77/L5 Tod | 0 Input, ausgeschlossen |
| .114 / Batch 10 | 72/L3 technischer Stopp | 89/L7 Tod | 58/L2 Tod |
| .115 / Batch 11 | 150/L6 Limit | 19/L2 Tod | 23/L1 Tod |

| Klasse | gestartete Guild-Runs | am Limit ohne Tod | mechanischer Tod | technischer Stopp |
|---|---:|---:|---:|---:|
| **Warrior** | **9** | **5** | **1** | **3** |
| **Mage** | **8** | **2** | **4** | **2** |
| **Rogue** | **5** | **1** | **4** | **0** |

**Wichtige Korrektur der Vermutung:** Rogue hat **doch** einen 150-Input-Lauf ohne Tod abgeschlossen: .101, Level 8, zehn gewonnene Kämpfe und sechs Gildenabschlüsse. Seine danach vier tatsächlich gestarteten Kampagnen (.102, .104, .114, .115) endeten allerdings sämtlich durch Tod – meist auf L1/2 gegen größere, höherstufige Gruppen. Warrior starb in der Vergleichskohorte nur einmal, und zwar auf einer E-Dungeon-Ebene gegen L15–17 mit Charakterlevel 6; nicht bei einer üblichen F-Gildenjagd. Der Mage weist vier gebuchte Tode auf, auch häufig nach riskanten Gruppenentscheidungen.

Die naiven Endursachen-Anteile 1/9=11,1% Warrior, 4/8=50% Mage und 4/5=80% Rogue sind **keine bereinigten Klassen-Sterbewahrscheinlichkeiten**. Laufdauer, technische Zensierung, Encounterauswahl, Gegnerlevel, Gruppen, Ausrüstung, HP vor Kampfbeginn, Flucht und Testspielerentscheidungen unterscheiden sich erheblich. Der .101-Rogue zeigt, dass Überleben möglich ist; die vier späteren Rogue-Tode rechtfertigen eine ernsthafte Fairness-/Taktikprüfung, aber keinen unkontrollierten Sofort-Buff.

**Hauptquellen im Archiv:** Batch-2-Review (batch-20261027-073917Z/REVIEW.md), Batch-3 (batch-20261027-150205Z/REVIEW.md), Batch-4 (batch-20261028-022553Z/REVIEW.md), Batch-5 (batch-20261028-051913Z/REVIEW.md), Batch-7 (batch-20261028-111133Z/REVIEW.md), Batch-8/9 (.113), Batch-10 (.114); jeweils Engine-Endursachen statt bloßer Storydeutung.

## 5. Technische Auffälligkeiten und Entscheidung vor dem nächsten Batch (29.10.2026)

**Ergebnis: Kein verpflichtender unmittelbarer Technik-Hotfix vor dem nächsten natürlichen Lauf.** Das ist eine **Priorisierungsentscheidung**, keine Behauptung eines komplett fehlerfreien Runs. Der Warrior erreichte trotz einer sicher fortgesetzten, fehlgeschlagenen World-Extraktion das 150-Input-Limit; Mage und Rogue starben mechanisch. Die bisherigen Runner-Integritätsmeldungen sind unauffällig, eine separate Neuvalidierung wurde in dieser Reviewergänzung nicht ausgeführt.

| Natürlicher Befund | Technische Einordnung | Entscheidung |
|---|---|---|
| **Warrior Runner-T55 / `extract.failed`**, Chatmessage 110: `place.reported.place` ist ungültig und bleibt auch nach Repair ungültig; `safeContinuations=1`. | **Echter, aber abgefangener Modell-/Extraktorfehler.** Die betroffenen World-Deltas des Zuges fehlen; die Engine bucht keinen ungültigen Ortszustand und die Kampagne läuft anschließend weiter bis Input 150. Der Sicherheits-/Fortsetzungspfad funktioniert, **ohne die fehlenden Informationen nachträglich zu erfinden**. Kein terminaler Engineabbruch, aber auch keine vollständige Worldübernahme. | **Beobachten, kein Sofortfix.** Erneut untersuchen, wenn dieselbe Referenzform gehäuft scheitert, gültige unabhängige Deltas systematisch mitverloren gehen oder die Spielerhandlung dauerhaft blockiert wird. |
| **Zwei zunächst fehlgeschlagene Boardgenerierungen:** Warrior bietet ungeeigneten L1-`Millpond Frog` als Intro, Rogue-Board verfehlt die einzelne Einführungssuche. | **Nichtfatale Qualität der generierten Angebote.** Die nachfolgenden Gildenboards und Aufträge sind benutzbar. Die Fälle sind **nicht** der in .115 behobene Fehler, bei dem die Warnung vor E-Ebene 2 als zusätzliches Questziel gezählt wurde. | **P2/Beobachtung, kein Sofortfix.** Gezielt erneut prüfen, wenn das Board trotz vorhandener Reparatur dauerhaft nicht zustande kommt oder der identische Generatorfehler regelmäßig wiederkehrt. |
| **Die vier .115-Korrekturbereiche:** lokaler Habitatbezug, Provider-HTTP-200-Klassifikation, Dungeon-Warntext, exakte Kaufpositionen. | **`GO.within` und korrekte Habitat-/Populationszuordnung sind natürlich positiv belegt.** Der spezielle HTTP-200-`internal_server_error`, die ursprüngliche Level-2-Warntextkonstellation und eine preisgleiche Falschauswahl von Waren treten hier nicht erneut als identische Gegenfälle auf. Die bereits dokumentierten technischen Regressionen bleiben für diese drei Punkte der Nachweis. | **Kein aus diesem Batch nachgewiesener .115-Rückfall**, kein vorsorglicher weiterer Mikrofix. Bei erneutem Auftreten Originalturns isoliert gegenüber dem gefixten Verhalten prüfen. |

**Abgrenzung zur Balance:** Die frühe Gruppensterblichkeit von Mage und Rogue ist in diesem Batch kein technischer Modell-/Kampfschadensfehler. Der erste sinnvolle nächste Schritt ist daher **ein weiterer natürlicher Lauf mit .115 und unveränderter F-Balance .114**, nicht eine weitere vorsorgliche Extractor-, Board- oder Zimmerpatchrunde. **Keine neuen Produkt-, Protokoll-, Runner- oder Balanceänderungen durch diese Entscheidung.**

## 6. Designentscheidung und Nachtests (nicht freigegeben)

- **Kein sofortiger Rogue-HP-/DEF-Buff aus 4/5** und keine Pauschalabschwächung aller Monstergruppen. Vielmehr kontrollierte Prüfung gleicher Gegner, Gruppen, HP-Ausgangslage, Gefahrenhinweise und realer Evasion-/Bewegungs-/Fluchtwege bei verschiedenen Klassen; zugleich beobachten, welche Entscheidungen der aktuelle LLM-Testspieler trifft.
- Der Rogue-L1-Tod und Mage-L2-Tod demonstrieren frühe Gruppenrisiken. Ein F-kompatibler Gildenauftrag ist **kein** Versprechen, dass ein einzelner L1-Abenteurer das gesamte Dungeonlevel allein mühelos erledigen kann.
- Den vorbereiteten Main-/Minor-Kampfpatch **getrennt** von Rogue-Klassenbuffs oder weiterem Waffenbalancing entscheiden, damit die Effekte messbar bleiben.
- .115-Habitatbeleg erhalten; konkrete Provider-200- und Handelszustimmungsfälle warten weiter auf spontane natürliche Wiederbegegnung, sind bereits technisch geprüft.
- Die .114-A+B+C-Werte unverändert belassen, bis überhaupt tatsächliche Fachhändler-F-Waffen gekauft und eingesetzt werden. Level 15 wurde weiterhin nicht natürlich erreicht.

**Dokumentationsreview ohne Produkt-/Runneränderung. Original-ZIP nicht in das Repository übernommen.**

## 7. Sol – unabhängige Gegenprüfung und Ergänzungen (29.10.2026)

Grundlage: dieselbe Original-ZIP, ihr vollständiger Chat-/Eventexport und Produktcode `9c65e9a` (.115). SHA-256 und ZIP-CRC unabhängig bestätigt. **Alle drei Kampagnen zusätzlich neu gefaltet: 2.563 Events, keine Foldfehler und keine Verletzung von `validateState` in den geprüften Zwischen- und Endzuständen.** Das ergänzt die oben ausdrücklich begrenzte GPT-Prüfung; keine neue Node-Testsuite oder ST-Smoke-Ausführung. Produkt-HEAD unverändert.

Die Enden, XP-Buchungen, Habitatzuordnung und fehlenden Gear-/Skillkäufe sind bestätigt. Ein stabiler Endzustand bedeutet weiterhin nicht, dass sämtliche Erzählereignisse übernommen wurden. T55 verliert nach ungültiger Referenz und erfolglosem Repair Worldinformationen; die sichere Fortsetzung erfindet sie nicht nachträglich. Keine daraus abgeleitete neue allgemeine Extractor-/Board-Hotfixrunde.

**Ergänzung zur Mage-Todesanalyse: Arcane Ward wurde nicht ausgeführt.** Runner-T18: Der Planner wählt Ward als erste Hauptaktion und stellt den nachfolgenden Bolt zurück. `engine.js:storyTurn()` behandelt außerhalb eines Encounters jedoch nur heilende/wiederherstellende `kind:'skill'`-Aktionen ausdrücklich; Ward fällt auf `kind:'narrative'` zurück. Es entstehen weder MP-Kosten noch Barriere. Der Narrator erzählt trotzdem einen stehenden Schutz; die sichtbare Systemzeile meldet lediglich den nicht ausgeführten Bolt. In T19 absorbiert folgerichtig keine Barriere den Hundeschaden. Das ist eine belegte Ausführungs-/Rückmeldelücke, zusätzlich zur riskanten Gruppenentscheidung. Sie beweist weder falsche Schadensrechnung noch, dass ein korrekter Ward das Überleben garantiert hätte. **Für den nächsten Kampfpatch vormerken:** nicht unterstützte defensive Skillanwendungen ausdrücklich als nicht ausgeführt melden, statt sie still zur normalen Erzählung werden zu lassen. Kein neues Prebuffsystem allein aus diesem Fall ableiten.

**Progression: besonders viel Zeit geht vor der Auszahlung verloren.** Der erste Orchard-Auftrag ist T51 READY und wird erst T114 ausgezahlt: 63 weitere Eingaben. Dazwischen wiederholte Reisen zu erzählten, mechanisch nicht gültigen Gildenstellen. Die Ablehnungen schützen den Zustand korrekt; Narrator und Testspieler halten die Umwege trotzdem lange aufrecht. Zehn Kämpfe in 150 Eingaben sind deshalb kein belastbarer Nachweis zu niedriger Kampf-XP. Eine erfolgreiche Questabgabe und eine vom Narrator behauptete lokale Abgabestelle bleiben getrennte Dinge.

**Primer und Übernachtung: Voraussetzungen fehlen tatsächlich.** Bei T139/140 ist der Warrior zwar an der kanonischen Alderwatch-Gildenhalle, aber ohne anwesenden Verkäufer. Das gespeicherte Primerangebot allein reicht nicht; die erzählten Käufe ergeben weder Abbuchung noch Buchbesitz. Auch spätere Betten werden wiederholt an einem anderen Erzählort angeboten, während der Spieler mechanisch noch an der Gilde steht. Erst nach tatsächlicher Reise und gültiger Offerte wird T149 ein Bett für 3 cp gekauft; die separat geplante Suppe scheitert am inzwischen geschlossenen Angebot. Keine doppelte Abbuchung belegt. Diese Fälle erklären fehlende Testabdeckung, rechtfertigen aber kein Entfernen von Händlerpräsenz oder Zahlungszustimmung.

**Priorität:** kein neuer verpflichtender Abbruch-Hotfix. Ward-Rückmeldung als begrenzten Befund erhalten; keine Behauptung, alle Probleme seien Anwenderfehler. .114-Waffenbalance bleibt mangels tatsächlicher Upgrades offen. Die historische Überlebenstendenz ist plausibel, aber kein kontrollierter Klassenvergleich; der erfolgreiche .101-Rogue-Lauf widerlegt „Rogue überlebt nie“.

## 8. Sol – Diskussionsvorschlag: frühe AoE-Option je Klasse

Nutzeridee vom 29.10.2026, **noch keine Produktfreigabe oder verbindlichen Zahlen**. Eine früh verfügbare Gruppenoption ist sinnvoller zu erproben als allein aus Todesanteilen pauschal HP/DEF zu erhöhen. Sie soll in die freie Starterauswahl passen; keine automatische dritte Fähigkeit, kein erzwungener AoE-Build und keine stille Änderung bereits gelernter Skills.

| Klasse | Vorschlag | Nutzen und Grenze |
|---|---|---|
| Mage | Arcane Burst als gezielte **Fern-AoE**, etwa bis MEDIUM, statt ausschließlich um den eigenen Körper | Bestehender Burst ist bereits F/C2, kostet 14 MP und trifft nur ENGAGED. Fernwirkung erlaubt Gruppenschaden, bevor der Mage umringt ist; pro Ziel unter vergleichbarem Einzelzielschaden bleiben. |
| Warrior | **Cleave**, STR-basiert, ENGAGED-AoE | Vorhandene Nahbereichs-AoE nutzbar; tatsächliche Nahkampfexposition bleibt der Preis. Keine zusätzliche kostenlose Attacke. |
| Rogue | Bevorzugt **Klingenfächer** auf SHORT; alternativ schlanker Nahbereichs-Klingenwirbel | AGI-basierte Gruppenoption mit kürzerer Reichweite als Mage. Kein zusätzliches Gift-, Munitions- oder Trefferchancensystem für die erste Variante. Niedrigere Einzelzielpower erhält den Nutzen von Piercing Thrust. |

**Technisch:** Nahbereichs-AoE existiert bereits. Für Fern-AoE ist eine begrenzte Erweiterung nötig: `skills.js` erlaubt bei Skill-Area derzeit nur `caster_engaged`; der bestehende Fern-Burst über `burstOf`/`burstCaught` wird beim Aktionsaufbau für Angriffsitems vorbereitet. Zielermittlung, mitbetroffene Personen, Trialstart und echter Kampf müssen für Skills denselben geprüften Zielkreis benutzen. Vorhandene Cluster-/Burstmechanik wiederverwenden; **gleiche Range Band allein bedeutet nicht räumliche Zusammengehörigkeit**. Keine Rasterkarte oder neue allgemeine Raumengine. Gültige Mitbetroffene einschließlich möglicher Verbündeter bleiben enginebestimmt.

**Dodge-Vermutung:** Im aktuellen Kampfsystem treffen legale Angriffe ohne Ausweichwurf (`derived.js`, `combat.js:resolveStrike`). Rogue gewinnt durch AGI Initiative und Angriffsskalierung, aber keine passive Dodgechance; Evasive Step gibt ein Band Bewegung und 25 % Schadensminderung, kostet bisher aber die Hauptaktion. Leichte Rüstung plus viele Gegneraktionen ist deshalb ein plausibler Nachteil. Dass ein bestimmter früherer Dodge-Umbau die historischen Tode verursacht hat, ist hier **nicht** durch einen Vorher-/Nachhervergleich belegt; frühere Ranger-Fernkampfoptionen sind ebenfalls ein anderer Ausgangspunkt.

AoE allein ersetzt keine brauchbare Rogue-Defensive. Der vorbereitete Main-/Minor-Plan könnte Evasive Step zusammen mit einem Angriff erst sinnvoll nutzbar machen; er ist ein eigener noch nicht implementierter Eingriff. Gegen dieselben Gegner und Startressourcen prüfen: Einzelziel, zwei/drei Gegner, verstreute Gruppen, freundliche Mitbetroffene und Rückzug. Eine neue AoE soll Gruppen handhabbarer machen, nicht fünf höherstufige Hunde für einen angeschlagenen L2-Mage automatisch gewinnbar machen.

Vor Umsetzung entscheiden: **Starteroption oder zusätzliche automatische Gewährung**, welchen bestehenden Poolplatz Warrior/Rogue ersetzen, genaue Zielgruppe/Reichweite des Fern-Bursts und Umgang mit historischen Skillinstanzen. Empfehlung: Starteroption, bestehende Zwei-Skill-Auswahl beibehalten; neue Varianten für neue Erwerbe, historische Definitionen schützen. Keine Balancewerte oder Produktdateien durch diesen Reviewnachtrag verändert.
