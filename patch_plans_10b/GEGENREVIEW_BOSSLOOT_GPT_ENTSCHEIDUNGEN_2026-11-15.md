# Avereth – GPT-Gegenreview und Designentscheidungen U1–U11 zum Bossloot V1

**15.11.2026 · Entscheidung für das V1-Design, noch keine Implementierung.** Basis: [vollständiger Claude-Fachplan](FACHPLAN_BOSSLOOT_BESONDERE_BELOHNUNGEN.md), Produktbuild `.192` (`e7dac41`), drei originale persönliche Userfeedbacks 04./05./06.11., [Design-Kanon](../02_DESIGN_KANON.md). Dieser Gegenreview wurde nach lesender GitHub-Codeprüfung erstellt, **ohne eigene Node-/Replay-/ST-Ausführung**.

## 1. Urteil

**GO für einen kleinen eigenständigen Bossloot-V1-Patch mit folgenden verbindlichen Abweichungen von Claudes Empfehlung.** Der Kern (zusätzlicher, deterministisch gebuchter Loot nach einem tatsächlichen Sieg, ohne Lootbox-Öffnung, ohne Modellaufruf) trifft das gewünschte Videospielgefühl und die technische Ein-Quellen-/Eventlog-Architektur. Sonderbeute darf die weiter geplante F-Balancekorrektur (Favoritengrowth +7 → +5) nicht mit mächtigen Alltagsdrops überfahren.

Der Fachplan sagt selbst, dass `F exceptional`-Waffen/Foki (ATK/MATK 22) sogar `E exceptional` (20) übersteigen, weil F eine besondere Waffenbalancetabelle verwendet. Das ist ein **echter Rank-/Qualitäts-Progressionskonflikt** des vorhandenen Shops, kein exklusiver Fehler des Bossloots. Bis zu einer separaten Kalibrierung **Exceptional nur sehr selten** droppen lassen; weder nebenbei E-Zahlen ändern noch außergewöhnliche Effekte erfinden.

Ein thematisch glaubwürdiger Fund soll aus der Welt folgen und möglichst brauchbar sein; das Spiel soll nicht in ein reines, perfekt klassenoptimiertes Belohnungsautomaten-System kippen. Normale Körpermaterialien, Ausrüstung/Geld und Return Stones bleiben unangetastet.

## 2. U1–U11 – endgültige V1-Entscheidungen

| ID | Entscheidung | Begründung |
|---|---|---|
| **U1** | **Nur ausdrücklich enginegebuchte Elite-Monster (`profile.type === 'elite'`)**, außerdem Slot-`guard` und Slot-`boss` mit eigenen Kategorien. Ein gewöhnliches hochstufiges oder `qtype:major`-Jagdmonster wird nicht allein dadurch Elite. | Die Welt passt ihren Gegnerstatus nicht an die Questdramaturgie oder den Spieler an. Ein tatsächlich als Elite gebuchter Blackmane Bear ist berechtigt; eine nur „große“ Quest ist es nicht. Menschliche NPCs ohne entsprechende explizite Engine-Kategorie sind **nicht** still als Elite zu behandeln; Erweiterung später separat. |
| **U2** | **Chancengrundmodell übernehmen, Qualitätsverteilung maßvoll abändern**, siehe Tabellen unten. Richtwerte bleiben konfigurierbar; keine heimliche Gleichsetzung von Rang und Qualität. | Erstes Erfolgserlebnis verlässlich, Wiederholung wertvoll aber nicht trivial; Rare-Machtsprünge kontrollieren. |
| **U3** | **Erste eigenhändige bezwungene Dungeonrollen-Begegnung garantiert**, je Kampagne und Dungeon+Ebene+Rolle; bei späteren Zyklen **35 % Guardian / 60 % Endboss**, Elite stets 25 %. Früher belegte Siege zählen, kein Nachreichen. | Belohnung des ersten riskanten Sieges, keine erzwungene Dauerschleife für ein garantiertes Gearstück. Ein Reset darf trotzdem lohnend sein. |
| **U4** | **Hybrid, nicht rein klassenoptimiert:** Bei einem Gear-Fund ca. **70 % nach sinnvoller Klassen-/Verwendungsgruppe, 30 % aus einem zum Gegner/Dungeon passenden Pool**. Keine Änderung von Gegner/Slot/Werten wegen Alarics Klasse. Beute kann als vorgefundener Hort/Altbesitz erscheinen, muss nicht vom Körper stammen. | Brauchbare Belohnungen für Spieler, aber eine lebendige Welt mit gelegentlich überraschendem, nicht optimalem Fund. Für V1 wenige feste Körperplan-/Themenpools, keine neue generative Itemdatenbank. Exakte Poolvalidität vor Implementierung prüfen. |
| **U5** | **Exceptional zulassen, aber deutlich seltener:** Elite **0 %**, Guardian erster Sieg **2 %**, Guardian Wiederholung **0 %**, Endboss erster Sieg **10 %**, Endboss Wiederholung **3 %** von Gear-Funden. Die übrigen Qualitäten entsprechend anpassen. | Superior ist bereits ein großer Upgrade-Schritt (ATK 18 ggü. Starter 10). Exceptional 22 ist besonders mächtig und stärker als aktuelle E-exceptional-Waffen. Der Überraschungsfund soll selten, nicht Standard sein. |
| **U6** | **Kein Gegenstand eines höheren Power Ranks** in V1. | Solche Stücke sind zunächst nicht benutzbar; vor allem das E-vs-F-Weapon-Balancing ist inkonsistent. Das höhere Ranggefühl gehört zu späterem Progressionsdesign. |
| **U7** | **Seltene Skill Stones ja:** Guardian erster/wiederholter Sieg **2 % / 1 %**, Endboss **6 % / 3 %**, Elite 0 %. **Ein Skill Stone ersetzt den regulären Sonderfund**, er kommt nicht zusätzlich; vorgeschlagene `fn`-Tabelle als Startpunkt, final mit den echten Funktionen prüfen. | Dein früherer ausdrücklicher Wunsch nach extrem seltenen wertvollen Funden; vorhandener `skill_source`-/`stoneActivation`-Pfad ist nutzbar. Bereits bekannte Techniken bleiben bekannterweise nicht lernbar; kein Neuwurf. |
| **U8** | **Passive Stones nein** in V1. | Der Objekt-/Use-Pfad ist noch nicht geschlossen; Passive-Stones sollen sehr selten und besonders bleiben, frühestens nach eigenem E+-Fachplan. |
| **U9** | **Automatische Beute wie bisher** und eigener `SPECIAL REWARD`-HUD-Bereich. Der Narrator darf eine Kiste/Hort atmosphärisch beschreiben; keine Öffnungsaktion, keine weiteren erzählten Gegenstände. | Spieler möchte Loot als Freude, nicht als technisch erzwungene Eingabe oder zusätzlichen Modellzug. |
| **U10** | **Volle Bossbelohnung auch bei NPC-Verbündeten**, wenn Alarics Seite den Sieg tatsächlich erkämpfte und bisheriger Loot-Credit gilt; **`solo` nur als historischer Tatbeleg**, kein Extra-Loot und kein Tatenbuch in V1. | Erhalt der vorhandenen Gruppen- und Lootregeln, keine künstliche Strafe für Begleitung. Unbeteiligte und fremde Siege bleiben ohne Credit. |
| **U11** | **Eine erkennbare, thematische Erst-Endboss-Trophäe garantiert, ohne Spielmechanik**, mit Richtwert **60 cp auf F**, als separater materieller Fund. **Nicht bei jeder Reset-Wiederholung garantiert**; bei Wiederholungen nur vorhandenes normales Material und der Sonderwurf nach U2/U3. | Ein besonderer erster Sieg bleibt ein Erinnerungsstück, aber nicht jeder 3-Tage-Zyklus erzeugt denselben künstlichen 60-cp-Geldtoken. Keine Unterschrift/Pflichttrophäe als Questsiegel. |

## 3. Angepasste V1-Starttabellen

**Chance auf genau einen besonderen Hauptfund (vor Skill-Stone-Sonderwurf):**

| Gegnerklasse | Erster eigener Sieg | Wiederholter Sieg |
|---|---:|---:|
| regulärer Gegner / Dungeon-Minions | 0 % | 0 % |
| expliziter Elite außerhalb des Dungeons | 25 % | 25 % |
| Dungeon-Guardian | **100 %** | **35 %** |
| Dungeon-Endboss | **100 %** | **60 %** |

**Belohnungsart, wenn ein Hauptfund fällt** (Skill-Stone-Wurf ersetzt ihn vorher, falls erfolgreich):

| Kategorie | Ausrüstung | Trankbündel | besonderes Material |
|---|---:|---:|---:|
| Elite | 50 % | 30 % | 20 % |
| Guardian erst / wiederholt | 65 % | 20 % | 15 % |
| Endboss erst | 100 % | 0 % | 0 % |
| Endboss wiederholt | 70 % | 30 % | 0 % |

**Qualität NUR bei einem Ausrüstungsfund:**

| Kategorie | Fine | Superior | Exceptional |
|---|---:|---:|---:|
| Elite | 90 % | 10 % | **0 %** |
| Guardian erstmals | 50 % | 48 % | **2 %** |
| Guardian wiederholt | 75 % | 25 % | **0 %** |
| Endboss erstmals | 0 % | 90 % | **10 %** |
| Endboss wiederholt | 60 % | 37 % | **3 %** |

Die **erste Endboss-Trophäe** (U11) ist *zusätzlich* zum besonderen Hauptfund, auch wenn dieser durch einen Skill Stone ersetzt wird. Bei Wiederholungen keine garantierte Trophäe. Guardian-/Elite-Material als ausgewürfelter Hauptfund ist eine Ressource, keine zusätzliche zweite Belohnung.

Skill-Stone-Wurf: Elite 0 %, Guardian 2/1 %, Endboss 6/3 %; bei Erfolg genau **ein** Stone statt des regulären Hauptfunds. Erster Endboss und Guardian erhalten also in jedem Fall einen besonderen Hauptfund, entweder Gear oder Stone (Guardian ggf. Trank/Material). Tränke/Material/F-Werte bleiben soweit im Originalplan vorgeschlagen. `value_cp` ist Richtwert und **kein garantierter Verkaufspreis**.

## 4. Verbindliche technische Nacharbeiten VOR Umsetzung

1. **Echte Nutzbarkeit der Gegenstände belegen.** `itemProfile` (`balance:true` für F-Waffen/Foki), `gearBases`, `useOf`, `itemTraits`, `profileOf`, `rankRefusal`, Potion-`restoreOf`, `skillSource` (erfordert `teaches.source`/gültige Funktion) und `stoneActivation` verwenden. Ein `object.created` ohne korrekte `use`/`profile` ist noch keine benutzbare Belohnung. Original-HUD-Vorschau und tatsächliche Ausrüstungs-/Stone-/Potion-Nutzung testen.
2. **Die Spezialbelohnung als strukturierte Ausgabe halten.** `lootEvents` liefert derzeit `{events,lines}`, `engine.js` fügt `loot.lines` in `outcome.loot` und macht aus den Zeichenketten `booked.grants`. Ein `SPECIAL REWARD`-Kopf, Wertevergleich oder Meta-Label darf **nicht** als vermeintlicher Itemname in `booked.grants` geraten. Separat `reward`/`rewardLines` und echte `grantNames` übermitteln; jede Buchung gegen den tatsächlichen `object.created`-/`item.changed`-Record prüfen, keine zweite Quelle der Objektwahrheit.
3. **Beleg/Kanon/Ortsbezug:** Von der Kreatur getragene Ausrüstung und ein narrativ zulässiger Schatzhort sind verschieden. Wenn ein Dungeon-Boss einen Stab oder eine Rüstung hinterlässt, die er nicht getragen hat, dürfen Erzähler und Extractor nicht behaupten, er habe damit gekämpft. Ein Hort ist nur Darstellungsrahmen; kein zusätzliches Schatzzimmer/Öffnen. Feste, kleine Themenpools statt frei benannter magischer Gegenstände.
4. **Garantie/Historie korrekt erkennen.** `entity.looted` markiert den Boss bereits; `slot.ref` enthält die Zyklen. Die Erstbezwingung wird aus historischer Dungeon-ID + Ebene + Rolle + **tatsächlichen PC-Loot-/Kampfbelegen** abgeleitet, ohne `c2` als neu ersten Boss zu missverstehen. Alte besiegte Bosse ohne neues Reward-Metadatum zählen als historische Siege. Ein `taken`-Slot durch andere Gruppen ist **kein** PC-Erstsieg, nimmt ihm also nicht seine Erstbezwingungsgarantie, solange es später noch eine echte eigene Erstbezwingung geben kann.
5. **Wiederholbarkeit, Rank/F-Fall, RNG:** Unabhängige Schlüssel für Lootwahlen, keine zusätzliche RNG-Fortschaltung, normale Drops bytegleich. `hash32` aus Kampagnen-Seed + Dungeon-ID/Zyklus/Slot/Foe, beziehungsweise stabiler Encounter-ID. Fixierte IDs, kein Doppelbuchungsweg und keine nachträgliche Lootgabe bei älteren gespielten Begegnungen.
6. **Kampf-Beteiligung und spätere Taten:** `solo` aus tatsächlich enginegebuchten Teilnehmern, nicht aus erzählter „ich war allein“-Prosa. Bestehende Creditbedingung nicht ohne Auftrag verändern. Keine Pflicht zu Solo für normale Belohnungen und kein noch nicht implementiertes Tatenbuch nebenher.
7. **Rankkalibrierung als separater Punkt festhalten:** F-exceptional-Waffe mit 22 > E-exceptional mit 20 ist ein echter Progressionskonflikt. Die vorliegende V1 ändert diese Werte **nicht**; außergewöhnliche Qualität bleibt stark begrenzt. Vor breiterem E+-Loot gesonderter Fachvergleich der Ausrüstung über Ränge und Qualitäten, sonst könnten später höhere Ränge schlechter sein.
8. **Keine Garantie, dass 1 historischer Fingerprint alles abdeckt.** Ursprünglicher Korpus enthält nur eine Endboss-Tötung, persönlicher Warden-Originalfall separat; durch Änderungen an `booked.grants` oder neuer HUD-Struktur können weitere geprüfte Ausgaben betroffen sein. Änderungen einzeln begründen und alle Tests tatsächlich laufen lassen.

## 5. Umsetzung/Abnahme nach Entscheidung

Vor Produktänderung den **aktuellen Remote-HEAD** sichern und die `.192`-Regressionen unangetastet lassen. Implementiere V1 fachlich isoliert mit:
- Unit-/negativen Tests pro Stufe, Erst-/Wiederholungsfall, Rank und Qualität, ausrüstungsspezifischer korrekter Verwendung;
- Warden User04 und `b17-rogue` Queen als Originalbelege;
- saved/reload/swipe/regenerate, Altbestand und `taken` anderer Gruppen;
- Rundumtest der neuen UI-/Context-/Extractor-Fundbuchung;
- voller `npm test`, Replay (2235 Fälle, Fingerprints individuell), isolierter ST1.19-Standard/Failsoft-Smoke;
- **keinen neuen natürlichen API-Batch** als Voraussetzung.

**Abgrenzung:** Statprogression 7→5 ist ein gesonderter Patch; Bossstärke, Boss-Bodyplan, Kampffähigkeiten, Explorationsloot, Tatenbuch, Shop-/E-Rang-Ausrüstungskalibrierung und Rangstufengrenzen ändern sich **nicht** mit diesem Auftrag. Der nächste persönliche Balancing-Test kann beide Änderungen getrennt beobachten.

**Kurzurteil:** Bossloot V1 mit diesen elf Entscheidungen fachlich freigegeben. Code-Implementierung erst als separater Produktauftrag; dies ist Dokumentation und die Grundlage dafür, nicht die Behauptung eines bereits umgesetzten Builds.
