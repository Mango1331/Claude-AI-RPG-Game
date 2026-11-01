# Batch 22 – unabhängiger Originalreview auf Build .146

**Quelle:** `batch-20261101-174704Z.zip`, drei natürliche GLM-5.3-Flash-Kampagnen, Produktcommit [`9136f8f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/9136f8ff664ad12e29fc74190f5d8a0909e3d4eb). Alle drei Exporte einschließlich Chat, Completions/Requests, Engineevents, Spielerentscheidungen und Serverlogs geprüft; kritische Befunde gegen diesen Produktcode abgeglichen. Kein Produktpatch, keine neue Testsuite und kein natürlicher Lauf ausgeführt. Zeiten/Indizes beziehen sich auf den Export: **T = Spielerinput, I = Nachrichtenindex in `avereth-events.json` bzw. Chat ohne Metadatenzeile**. Engine-Turn und Spielerinput sind unterschiedliche Zähler.

## 1. Gesamturteil

**Ein deutlicher Fortschritt, aber keine drei bestandenen Läufe.** Rogue erreicht auf natürlichem Weg Level 15 und nimmt die normale E-Klasse **Bloodhound Rogue** an. Warrior und Mage sterben jeweils im zweiten Kampf. Der Rogue-Lauf endet unmittelbar nach der Klassenannahme an einem echten SillyTavern-/Windows-Speicherfehler, nicht an einem Extractor- oder Geldparserabbruch.

Handel funktioniert grundsätzlich: Rogue verkauft elfmal Loot/Altgear und tätigt 16 Käufe, darunter mehrere Waffen-/Rüstungsupgrades, einen echten Zweiteilekauf, Unterkunft und Manuals. Dennoch besteht eine **reproduzierte falsche Einzelkaufablehnung** in `selectionWhy()`. „Kaufen funktioniert weiterhin gar nicht“ wäre falsch; „alle Handelsblockaden sind erledigt“ ebenfalls.

| Profil | Spielerinputs / Engine-Turns | Ergebnis | Kämpfe | Guildabschlüsse | Geld zuletzt |
|---|---:|---|---:|---:|---:|
| Warrior | 32 / 30 | Tod, Level 2 | 1 Sieg, 1 Niederlage | 1 | 76 cp |
| Mage | 20 / 17 | Tod, Level 2 | 1 Sieg, 1 Niederlage | 1 | 70 cp |
| Rogue | 282 / 246 | L15 bei T276, E-Klasse bei T282; danach Speicherabbruch | 21/21 Siege | 7 | 480 cp |

Die Original-Endgründe lauten `defeat`, `defeat`, `ui: chat persistence failed`. Der Batch ist als `completed` markiert, weil seine drei Läufe beendet sind. **Keiner dieser Endgründe wird hier als manueller Abbruch umgedeutet.** Beim Rogue meldet der Evaluator 3/3 Etappen; die Events belegen das, aber der fehlgeschlagene abschließende Datenträgersave verhindert die Behauptung einer vollständig bestandenen Neustart-/Persistenzabnahme.

## 2. Nachweise und Integrität

- Originalarchiv: **61.070.612 Bytes**, SHA-256 `ce1bb79b3a6d7ea312c8f2406feb66daebb9c35b8d752e3b7ac2f48c2b513406`; ZIP-CRC sämtlicher Dateien gültig. Byteidentisch in acht Teilen archiviert; [Zusammensetzen und Prüfen](ARCHIVE.md), Einzelhashes in [MANIFEST.json](MANIFEST.json).
- Alle **4.191 Engineevents** (476/334/3.381) aus den drei gespeicherten Chats mit dem tatsächlichen `.146`-`foldChat()` rekonstruiert: **keine Foldfehler**; anschließend `validateState()` mit Produktcontent: **keine Fehler**. Das prüft die exportierten Daten, nicht den nach dem EPERM tatsächlich auf Windows vorhandenen letzten Save.
- Keine Treffer bei einem Scan auf bekannte Token-/Authorizationmuster; alle drei Runnerexporte melden `secretHits: 0`. Das Archiv wurde nicht verändert. Ein Musterscan beweist keine absolute Abwesenheit unbekannter Geheimnisformate.
- Die nachstehend genannten Sonden sind Read-only-Aufrufe vorhandener Produktfunktionen mit Originaldaten. Keine neuen Regressionen geschrieben; Node-Vollsuite, Replaykorpus und ST-Smokes wurden für diesen Review **nicht** wiederholt.

## 3. Technische Befunde – priorisiert und getrennt

| Befund / Originalbeleg | Einstufung | Tatsächliche Bewertung |
|---|---|---|
| Rogue T282, `server.timed.log` 21:34:20 UTC | **Hohe Priorität: Host-/Infrastrukturfehler** | Windows verweigert `rename` der temporären Chatdatei auf die Zieldatei (`EPERM`, `write-file-atomic` → ST `trySaveChat`). HTTP-Speichern scheitert, PageError in `saveChat`/`index.js:onMessageReceived`, Runner stoppt korrekt. Welcher externe Prozess bzw. welche Sperre ursächlich ist, ist nicht belegt. |
| Rogue T75–77, I149–153, vorhandenes `offer.t146.15`, Zeile `l4` | **Bestätigter Enginefehler, wiederholte QoL-Blockade** | Planner wählt den richtigen Common-Dolch für 80 cp. `trade.selectionWhy()` interpretiert das Verb **hand** in „I hand over the coins“ als Auswahl der ebenfalls angebotenen **hand-axe**. Die richtige Dolchauswahl wird deshalb als unvollständiger Mehrartikelkauf abgelehnt. T77 mit „I pay …“ funktioniert. Keine falsche Abbuchung, aber zwei vermeidbare Klärungsrunden. |
| Rogue T76/77, `party_words: "Smith B"` | **Zusätzliche Integrationsreibung** | `acceptanceWhy()` vergleicht gegen „smith, broad man in a scorched leather apron“ und lehnt die abweichende Bezeichnung ab. Der Repair entfernt `party_words`; das allein heilt T76 wegen des Hand-Axt-Problems nicht. Nicht mit einem falschen Preis oder fehlendem Geld verwechseln. |
| Rogue T69, Completions beider Planner-Versuche | **Begrenzte Fehlablehnung / bewusste Parsergrenze** | Beide Antworten meinen korrekt 25 cp aus „Two and a half silver“. Die vorhandene Geldbelegprüfung kann diesen Bruchbetrag nicht vollständig belegen; Repair verkürzt das Zitat erfolglos. Ein `NOT EXECUTED` und sichere Fortsetzung, kein Geld-/Warenverlust. Danach neues klares Gebot, Verkauf T71 für 20 cp. Keine neue Bruchzahl-Regexserie empfohlen. |
| Rogue T81–83, I162/164/166 | **Identitäts-/Belegkonflikt, kein pauschales Händlerverbot** | Wren war zuvor im Schmiede-Kontext als Helferin angelegt worden. In der Apotheke beschreibt die erste Prosa nur eine unbenannte Frau; die zweisätzige Enter-Evidenz passt nicht zu den etablierten Identitätslabels. I164 meldet erneut `person.new` für die bekannte Abwesende. Später wird sie korrekt an der Apotheke gebucht. Nicht als erneuter Nachweis „bekannte Händler können nie zurückkehren“ werten. |
| Rogue T210/T232, Extractor-Calls 623/681 | **Recovery erfolgreich; Transportproblem** | Zunächst keine aufgezeichnete Response; die erneuten Calls 624/682 liefern gültige Antworten. Keine endlose Pending-Schleife, kein Runabbruch. Aus den Nullantworten allein folgt keine Reasoning-Erschöpfung. |
| Rogue T115/T172/T242/T244 | **Provider-/Laufzeitproblem** | Einzelne Narratoraufrufe dauern ca. 362/136/125/530 Sekunden. Beim 530-Sekunden-Aufruf kommt eine nichtleere Antwort mit `finish_reason: stop`; keine belegte Tokenbudget-Erschöpfung. Langsamkeit nicht durch neue Preisparser behandeln. |
| Warrior erstes Board bei T4 | **Korrekte Schutzablehnung; Generation/Repair scheitern einmal** | Die Einstiegsjagd überschreitet die schwache L1-Grenze HP35/ATK10. Board wird nicht unzulässig freigegeben. Spätere Abfrage erzeugt gültige fünf Angebote. Im Rogue-Lauf kein `board.failed`. Kein erneuter Singular-/Pluralfehler wie Batch21 nachgewiesen. |
| Warrior T8/T9 | **Korrekte Ablehnung / Spielerfehler** | Nur 30 cp vorhanden, gewünschtes Fine-Schwert kostet 140 cp; Paket noch teurer. Der Spieler versucht trotzdem zu bezahlen. Keine Kaufbuchung ist hier richtig. |
| Rogue T64–71 | **Gemischte Ursachen** | Erzähler und Spieler führen einen bereits verkauften Wolfspelz erneut im Los auf; zwei Skins liegen zudem als getrennte Objekt-IDs vor. T68 bestellt qty2 von einer einzelnen qty1-ID. Erst falscher Bestand/Zuordnung, danach Bruchbetrag und wechselnde Preise. Das ist keine einzelne falsche Preisrechnung der Engine. |
| Rogue T34–36 und T92–94 | **S2-Sicherheitsentscheidung plus Modellreibung** | Preise wie „say five …“ bzw. „Hot stew's four“ enthalten im abgegebenen Geldargument keinen hinreichenden Währungsbeleg. Nicht blind buchen. Ein Teil der späteren Käufe gelingt mit klarem gespeicherten Angebot. Der Narrator hält die bestehende Endpreisregel nicht zuverlässig ein. |

### Der reproduzierte Auswahlfehler genauer

`src/v4/trade.js:selectionWhy()` gewinnt pro Angebotszeile vermeintlich unterscheidende Wörter aus `what`, `service` **und `said`**. Ein Treffer eines einzelnen solchen Wortes zählt als Artikelwunsch in einer Kaufklausel. Im Originalangebot sind u. a. Common/Fine shortsword, Common hand-axe, Common/Fine dagger enthalten. Der Token `hand` ist für die Hand-Axt unterscheidend. Die Klausel „I'll take the common dagger for 80 copper — I hand over the coins and take it“ trifft damit diese zusätzliche Position.

Read-only mit dem **Originalangebot und `acceptanceWhy()`**: T75 und T76 liefern „selected goods omit a position in his explicit order“; T77 liefert `null` und wird im Original tatsächlich gebucht. Das Ergebnis hängt nicht von einem erfundenen Testhändler oder fehlendem Guthaben ab.

**Konsequenz:** Nicht weitere Ausnahmen für „hand over“ ergänzen. Artikelidentifikation muss Produktbezeichnungen/ausgewählte Positionen von Handlungstext unterscheiden; Wörter aus Preiszitaten sind keine gleichwertigen Produktidentitäten. Bei einem späteren Engine-Shop diese Auswahlprüfung ausdrücklich mitbewerten: Ein strukturierter Katalog allein entfernt den heutigen nachgelagerten Fehlvergleich nicht. Eine Korrektur muss den wirklichen Mehrartikelwunsch („buy sword; add armor“) weiterhin schützen. Hier dokumentiert, nicht implementiert.

### Speicherabbruch und E-Klasse getrennt beurteilen

I563 enthält das echte `class.evolved` mit **Bloodhound Rogue**, Rank E, Qualität normal und der Klasseneigenschaft ATK+4 / Martial-STA-Kosten −8 %. Der vollständige exportierte Fold enthält diese Evolution. Die folgenden Narrator-/Extractorvorgänge erzeugen keinen zweiten Klassenwechsel. Der Fehler liegt beim ST-Dateisave, nicht im Klassenreducer.

Die Sammlung erlaubt deshalb: **„Natürliche E-Annahme im Export bewiesen“**. Sie erlaubt nicht: „Der letzte Windows-Save war erfolgreich und nach Prozessneustart geprüft“. Ein begrenzter, identischer Speicherwiederholungsversuch bei transientem EPERM/EBUSY wäre ein möglicher Host-/Runner-Folgeansatz; **keine neue Generierung und kein erneutes Ausführen des Enginezugs**. Vor Umsetzung erst die Save-Reihenfolge und Quelle der Dateisperre klären. Kein Erfolg vortäuschen, solange der Save weiterhin scheitert.

## 4. Kampftode: Regeln, Entscheidungen und Design

### Warrior – zu große Gruppe, kein nachgewiesener Rechenfehler

Nach L1-Fenkatze und erster Guildabgabe ist er L2. Er findet sechs Wildschweine, versucht zunächst Abstand zu gewinnen, wird laut Prosa entdeckt und greift dann an. Kampf I59: Gegnerlevel **4, 7, 4, 4, 7, 6**, HP **79/90/66/66/90/82**. Das ist für einen L2-Warrior mit Starterwaffe keine passende Solo-Gruppe. Cleave trifft zunächst nur einen tatsächlich ENGAGED stehenden Gegner, später zwei; die übrigen schließen regelgerecht auf. Tod nach drei eigenen Kampfrunden, kein Gegner getötet.

T31 wünscht Cleave **und** Guard. Die gegenwärtige Aktionsökonomie gewährt daraus keine zweite volle Skillaktion; Guard wird nicht gebucht. Nicht mit der noch separat diskutierten Main-/Minor-Änderung verwechseln. Aus diesem Tod folgt weder eine notwendige globale XP-Erhöhung noch ein Beweis falscher Warrior-Schadensberechnung. Sinnvolle Folgefrage wäre verständliche Gefahreninformation bzw. bessere Nutzung vorhandener Rückzugsoptionen, nicht automatisches Herunterskalieren jeder gefundenen Gruppe.

### Mage – Friendly Fire und Begleiterstatus

L2-Mage betritt mit Brenna die Grotte. Drei Käfer und Brenna stehen mechanisch **SHORT**. T18 hat keinen gültigen konkreten Zielhandle und verbraucht nichts; T19 benennt die Käfer korrekt. Arcane Wave trifft nach bestehender Zielbandregel **alle** in diesem Band, darunter Brenna für **28 Schaden**; Käfer erhalten **33/31/34**, zwei sterben, einer bleibt mit 1 HP.

`combat.js:areaVictim()` schließt im C-Pfad Freunde/Neutrale nicht aus. `engine.js` nimmt Mitgetroffene mit auf, `scene_handles.js:sideOf()` verwendet den gespeicherten Beziehungsstatus. Brenna ist **neutral**, keine gebuchte Verbündete mit Haltung ≥20. `combat.js:asideTurn()` lässt eine getroffene neutrale Person zurückschlagen; im Event ausdrücklich `turned: "struck by his Arcane Wave"`, danach Warrior Charge. Der Mage stirbt beim folgenden eigenen Zug an ihr, nachdem der letzte Käfer fällt.

Das ist kein Phantomgegner oder erfundener Extractorschaden: **die Engine erzeugt diese Konsequenz selbst**. Es zeigt aber eine relevante Design-/Transparenzschwäche: „Begleiterin hinter mir“ bedeutet mechanisch weder Verbündetenstatus noch anderes Zielband. Ein Flächenangriff auf „die drei Käfer“ selektiert nicht nur diese drei. Falls das gewünschte Spielgefühl anders ist, braucht es eine ausdrückliche Friendly-Fire-/Begleiterentscheidung, keine heimliche Sonderbehandlung für diesen Run. Als erster kleinerer Ansatz wäre klare Anzeige der tatsächlich mitbetroffenen Person vor einer vermeidbaren Eskalation zu prüfen. Keine solche Änderung ist hier beschlossen.

## 5. Handel und Geld – tatsächlich gebucht

| Rogue-Vorgang | Anzahl | Summe |
|---|---:|---:|
| Loot-/Altgearverkäufe | 11 | +436 cp |
| Guildabgaben | 7 | +855 cp |
| Selbstständige NPC-Dankeszahlung | 1 | +10 cp |
| Käufe | 16 | −851 cp |
| Registrierung | 1 | −20 cp |

**Bilanz: 50 Start +436 +855 +10 −851 −20 = 480 cp.** Zu den Käufen gehören fünf Geartransaktionen mit sechs Gearstücken, zwei Manuals, zwei Salven-/Bandagenangebote, drei Zimmer und vier Mahlzeiten. Nicht acht Ausrüstungswechsel mit acht Käufen verwechseln; darunter ist auch Aus-/Wiederausrüsten.

Konkrete positive Ketten:

- T38/39: Common-Jerkin 48 cp gekauft und ausgerüstet.
- T77/78: Common-Dolch 80 cp gekauft und ausgerüstet, danach Starterdolch T79 für 10 cp verkauft. Das vorhandene Sheet-Item funktioniert im natürlichen Lauf.
- T146: Fänge verschiedener eigener Lootobjekte gemeinsam für 54 cp verkauft, anschließend **Fine-Dolch + Fine-Leichtrüstung als zwei Gegenstände für zusammen 196 cp** gekauft. Verkauf und Kauf sind separate korrekte Geldereignisse im selben Input.
- T169: Superior-Jerkin 72 cp; T279/280: Superior-Dolch 260 cp, danach drei Altgearteile für 50 cp verkauft und neuer Dolch ausgerüstet.
- T104: Harl zahlt nach erledigter Hilfe tatsächlich 10 cp, ohne formale Privatquest. Erhaltene Geschenke bleiben also möglich.

Erzählte Preise weichen öfter von den verbindlichen Engine-Gearpreisen ab. Beispiel: Superior-Jerkin erzählerisch 180 cp, gebucht zum Engineprofilpreis 72 cp. Das ist nicht automatisch ein Rechenfehler; entscheidend sind die gespeicherte Offerte und Preiszustimmung. Ein voller Saldo ist kein alleiniger Beweis jeder einzelnen Erzählsemantik, aber **keine systematische Doppelbuchung, kein freier Geldabgang und keine Warenmengenüberschreitung sind hier belegt**. `#pay` wird in diesem Batch nicht natürlich getestet.

**Engine-Shop-Bewertung nach diesem Batch:** Die Idee bleibt sinnvoll als Vereinfachung für Katalog, Händlerverfügbarkeit und neue verbindliche Standardangebote. Dieser Batch rechtfertigt jedoch nicht die Behauptung, die Buchungsfunktionen müssten komplett ersetzt werden. Der konkrete Auswahlfehler sitzt nachgelagert und muss bei jedem Shopkonzept berücksichtigt werden. S2-Verluste, NPC-Kontinuität und Windows-Speichern verschwinden ebenfalls nicht allein durch einen Preiskatalog. [Vorbereiteter Plan](../../patch_plans_10b/FACHPLAN_ENGINE_SHOPS.md) bleibt ohne Umsetzungsfreigabe.

## 6. Spieltempo, XP, Skills und Balance

Der Rogue erhält **11.935 XP**, davon **7.315 Kampf-XP** und **4.620 Quest-XP**. L15-Schwellenverbrauch 10.500, Rest 1.435 – rechnerisch konsistent. 21 Siege in 282 Eingaben sind etwa ein Kampf je 13,4 Inputs, nicht 282 effektive Kampfrunden.

| Fortschritt | Spielerinput |
|---|---:|
| L5 | 26 |
| L7 | 60 |
| L8 | 121 |
| L10 | 141 |
| L12 | 200 |
| L13 | 244 |
| L15 | 276 |
| E-Klasse angenommen | 282 |

**Der auffällige Stillstand L7→L8 dauert 61 Eingaben.** Dazwischen liegen lange Handels-/Ausrüstungs-/Erholungswege und eine schwache L1-Wolfbegegnung; nicht 61 angemessene Kämpfe ohne XP. Weitere wiederholte Wolfaufträge bringen je nur 60 Kampf-XP. Später bringen die Sablewood-Begegnungen 185–700 XP; der passende Vier-Boar-Vertrag zahlt 2.025 Quest-XP beim Abschluss. Die Welt muss nicht jede Begegnung ans aktuelle PC-Level anpassen; der Spieler verbringt aber sehr lange in denselben Novice-Gebieten.

Die XP-Kurve ist damit **nicht als kaputt nachgewiesen**. Für ein Ziel „L15 ungefähr innerhalb 200 Inputs“ ist dieser Lauf zu langsam, doch erst sinnlose Handelswiederholungen, fehlgeleitete Angebote und Auswahl höherer sinnvoller Ziele betrachten. Nochmals pauschal XP erhöhen würde auch erfolgreiche zielgerichtete Läufe beschleunigen und die schwache Skillentwicklung weiter vom Leveltempo abkoppeln.

Skillstand am Ende: Piercing Thrust **P3/8 PP**, Fan of Blades **P1/36 PP**, Basic Attack **P1/36 PP**. Keine Skill-Evolution, kein neuer Skill gelernt. Guard wird aus dem Manual als Ziel geöffnet, steht am Ende aber erst **40/100 LP**; zwei Manualkäufe sind keine zwei erlernten Skills. Nur drei `growth.noted`-Kampfbelege im gesamten Lauf. Das bleibt eine konkrete Beobachtung zur organischen Entwicklung, kein Beweis, dass alle Lernregeln fehlerhaft sind. Klasse entwickelt sich korrekt, vorhandene Skills/PP bleiben erhalten.

Zwei frühe Tode gegenüber einem langen Rogue-Erfolg erlauben **keinen Klassenstärkevergleich**: andere Encountergrößen, Friendly Fire, unterschiedliche Vorbereitungen und Entscheidungen dominieren. Die Käfergruppe ist exakt dreifach materialisiert; Brenna ist die mitgetroffene vierte Person, kein doppelter Dungeonslot. Für ein allgemeines Dungeon-Balanceurteil liefert der Rogue keine weitere Dungeonabdeckung.

## 7. Modellzuverlässigkeit und Runner

Aufgezeichnete Engine-/Narratorcalls: Warrior **98**, Mage **51**, Rogue **820**. Rogue: 30 Plannerrepairs und 28 Extractorrepairs; ein nicht sicher interpretierter Plannerturn, anschließend `soft_continued`, zwei Transportwiederholungen des Extractors. **Keine Response mit `finish_reason: length` gefunden.** Die vier besonders langsamen Narratorantworten verbrauchen zusammen rund 19 Minuten; das erklärt reale Wartezeit, nicht zusätzliche Spielerinputs.

Der Runner bricht bei ungesicherter Chatpersistenz richtig ab. Seine Drei-Etappen-Erkennung funktioniert fachlich, doch die Zusammenfassung muss „Etappe im aktuellen/exportierten Zustand erreicht“ von „abschließender Save bestätigt“ unterscheiden. Die gespeicherten Fehlermeldungen dürfen nicht durch `done` verdrängt werden.

Der Spieler verfolgt tatsächlich Gear und Loot, aber teilweise ineffizient: sehr früher Wunsch nach unerschwinglichem Fine-Gear; wiederholte Handelsgespräche mit falschen Beständen; Kauf eines weiteren Guard-Manuals bei bereits offenem Lernziel; nach L15 erst weitere Ausrüstung und dann Klassenwahl. Keine neue umfassende Runnersteuerung allein daraus ableiten. Sinnvolle spätere Präzisierungen wären vorhandenes Lernziel nutzen statt dasselbe Manual erneut kaufen und erfüllbare Voraussetzungen von sprachlicher Umformulierung unterscheiden. Freundbeschuss bleibt eine sichtbare Regel-/Designfrage und soll nicht nur durch versteckte Runnerweisungen kaschiert werden.

## 8. Empfehlung für die nächste Entscheidung

1. **Speicherfehler als Infrastrukturthema zuerst abgrenzen.** Original-EPERM sichern; identischen Save ggf. begrenzt wiederholen, ohne eine Transaktion/einen Modellzug erneut auszuführen. Die Engine-Geldarchitektur dafür nicht umbauen. Welche Windows-Sperre vorlag, bleibt offen.
2. **Kauf-Auswahlfehler fachlich gezielt behandeln oder in den freizugebenden Shoppatch aufnehmen.** Objektbezeichnungen und Handlungstext trennen; positives Original T75, echte Mehrartikelwünsche und die bereits geschützten Teilkauf-Gegenfälle gemeinsam abnehmen. Keine neue Serie englischer Ausnahmewörter.
3. **Friendly Fire/Begleiterstatus bewusst entscheiden**, bevor weitere Mage-Tode als Klassenbalanceproblem zählen. Bestehende Regel wird korrekt gerechnet; Erkennbarkeit und gewünschtes Sandboxverhalten sind die offenen Fragen.
4. **XP, Startwerte, Preise und Runner zunächst nicht aus diesem einzelnen Batch erneut verändern.** Der natürliche F→E-Weg ist belegt; nächste Datensammlung sollte Handelsreibung, sinnvolle höhere Ziele, PP/Lernen und bestätigte Saves separat messen.

**Abgrenzung:** Keine Produktänderung, keine neuen Parserregeln, keine neuen Preise und keine Patchfreigabe durch diesen Review. Die Originaldaten und automatisch erzeugten Originalberichte bleiben unverändert. Die vorliegende Bewertung ist der unabhängige Review zu diesem Upload; ein noch nicht vorliegender fremder Gegenreview wird nicht behauptet.
