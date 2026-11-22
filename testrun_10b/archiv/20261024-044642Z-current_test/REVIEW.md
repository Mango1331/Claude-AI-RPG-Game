# Avereth Engine – Patch 10B / Ausführlicher Live-Review Run 4

**Run-ID:** 20261024-044642Z-current_test  
**Auswertung:** 24.10.2026 · eigenständige ChatGPT-Analyse des hochgeladenen unveränderten Original-ZIP (nicht nur des automatisch generierten Runner-Berichts).  
**Original:** 20261024-044642Z-current_test.zip · **10.186.984 Bytes** · SHA-256 **f1ad027ce2722b79e97e4c3978d9252c123abfd7ec47259b41482194a4903b07** · lokaler Git-Blob-SHA1 **c848c5fe1437590733e929a82f8908893b0def69**.  
**Git-Archivierung:** Dieser Review liegt im vorgesehenen Run-Ordner. **Die binäre Original-ZIP wurde hier nicht durch einen GitHub-Dateiupload bestätigt; der Nutzer soll dieselbe unveränderte ZIP in den Ordner hochladen.** Nicht behaupten, sie sei allein durch das Anlegen des Reviews auf GitHub gespeichert worden.

**Wichtige zeitliche Abgrenzung:** **Engine .57**, lokaler **Entwicklungscommit 3181c8112ec6**, vor der Implementierung von **10B-1 (.58/e6c76b4)**, vor 10B-2/3/4. Dies ist ein vierter unabhängiger **Vor-Patch-Befund**, kein Live-Abnahmelauf von .58. Der gegenwärtig neuere Git-Stand darf nicht in diesen Run hineinprojiziert werden.

**Quellenbasis:** aus der Original-ZIP tatsächlich gelesen: run.json, evaluation.json, report.md, chat.jsonl, avereth-events.json, player.jsonl, calls.json sowie gezielt die Completion-Aufzeichnungen. Der Runner-Bericht ist die erste Orientierung; bestätigte Aktionen, Objektbesitz, XP, Geld, Quests und reale Orte werden mit **avereth-events.json** abgeglichen. **T** = 1-basierter Versuch eines Runner-Spielerzugs; **E** = Feld i eines Eintrags in avereth-events.json / Chat-Nachrichtenindex, also **kein** Zug. Der Engine-Zähler unterscheidet sich nach gescheiterter Verarbeitung vom 1-basierten Runner-Turn.

---

## 1. Abschluss, Testumgebung und belastbare Gesamtbilanz

| Kriterium | Run-4-Original |
|---|---|
| Runner-Ende | **narrator_empty** in **T61**: Storyantwort ohne Text, **finish_reason length**, 8.192/8.192 Completion-Tokens, **35.577 Zeichen Reasoning, 0 Zeichen Inhalt**; Runner stoppt ohne Swipe oder Regeneration |
| Runner-Spielereingaben / Beobachtungsfenster | **61/100 versucht**, freies Ziel nicht erreicht. **T1–T60** lieferten jeweils eine Engine- oder Narrator-Antwort; T61 hatte keine Storyantwort |
| Tatsächlich verzeichnete Engine-Turns | **58 turn.begun**; drei fehlgeschlagene Extraktionen und ein fehlgeschlagener Narrator lassen Runner-, Story- und Engine-Zähler auseinanderfallen; nicht „61 vollständig persistierte Züge“ behaupten |
| Gesamtzeit | **80:18 min**; Spielbearbeitung **70:12**, Testspielerentscheidungen **8:34**, Einrichtung ca. **0:31** |
| Charakter | **Alaric Red**, **Mage**, frei gewählt, Flame Lance + Arcane Ward; Regelstand **2**, Level **2** erreicht; keine Fixture, kein synthetischer XP-Zuschuss |
| Integrität / Nachrichten | **877 autoritative Engineevents**; Status meldet **integrity: OK**; **187** Modellaufrufe (60 Planner, 56 Narrator, 68 Extractor, 3 Board) |
| Kämpfe | **3/3 gewonnen**, jeweils eine einzelne erfasste Kreatur, **12 + 12 + 15 = 39 Combat-XP** |
| Erledigte Gildenverträge | **3** (sealed ledger, medicine, feral dogs), auf dem Enginepfad tatsächlich **completed** und ausgezahlt |
| Questbelohnungen | **40 cp / 23 XP**, **40 cp / 23 XP**, **50 cp / 23 XP**; dazu die 39 Combat-XP → 108 XP gesamt vor weiteren Änderungen; keine doppelte Auszahlung festgestellt |
| Gildenregistrierung | In T6 **20 cp genau einmal** bezahlt, Novice-Mitgliedschaft gebucht |
| Provider / Host | SillyTavern **1.19.0**, Chrome, GLM-5.3-Flash über lokalen OpenAI-kompatiblen Endpoint; Preset **8.192** Narrator-Completion-Tokens, Context 131.072, Reasoning „low“ |
| Runner / Profil | Automatischer **lokaler** echter SillyTavern-Lauf, isolierte Instanz, LLM-Testspieler mit sichtbarem Chat/HUD; unverändertes lokales Nutzerprofil gemeldet, Secret-Scan laut run report sauber |
| Fehlerstatus | **0 PageErrors**, aber **2 Server-AbortError-Zeilen** in run.json; drei Engine-Events **extract.failed** (E52, E118, E120) plus finaler leerer Narrator; keine kausale Entlastung des Host-/Providerpfads allein aus dem Namen „AbortError“ |

**Wichtig:** „T60 hat eine Storyantwort“ bedeutet **nicht**, dass T60 eine erfolgreiche Weltbuchung abgeschlossen hat. Der zugrunde liegende Extraktor scheiterte (E120). Der letzte gültig begonnene Engine-Turn ist **58** (E121, Versuch T61); er endet mit einer verweigerten Annahme des nicht existierenden „Tally Cellar“-Auftrags, aber ohne gültige Erzählerantwort.

**Genauere Datengrenze:** Die Laufzeit- und Modellzahlen sind aus dem ZIP, **nicht** aus einer in dieser Review-Sitzung neu gestarteten API/Provider-Simulation. Kein neues npm test, kein ST-Smoke und keine Änderung am Engine-Code wurden für diesen Review ausgeführt.

## 2. Der tatsächlich gespielte Verlauf (T1–T61)

| Phase | Ereignis und autoritative Buchung | Einordnung |
|---|---|---|
| **T1–T7** | Mage mit Flame Lance/Arcane Ward erstellt; Stadt und Gilde erreicht; Registrierung T6 E11 **einmal 20 cp**; erstes Board E13 fünf kanonische Listings | Starker natürlicher Start; kein künstlicher Guide-Fortschritt |
| **T8–T12** | „Courier the Warden's Sealed Ledger“ E15 aktiviert, echtes Ledger E16 erschaffen, E17 PC nimmt es; **E23 object.moved an npc.npcpriory_brother_herbs**; E24 **quest.ready** | Erstes positives Liefer-Gegenbeispiel zu Run 3: tatsächlicher Objekttransfer vor READY. Empfänger im Objekt-Event ist ein Priory-Bruder, nicht formal Warden Ambrose; der Vertrag beschreibt die Priory als Ziel |
| **T13–T21** | Warden gibt zusätzliche **courtesy note** (E26); PC nimmt sie (E27); will sie bei Gildenclerk abgeben, aber GIVE wird E29/E41 wegen unbekannter oder nicht präsenter Person verweigert; **E41** vollständiger Ledger-Questabschluss, **+40 cp / +23 XP** | Lieferung selbst funktioniert, aber Nebendokument bleibt beim PC; keine neue Pflicht zur Rückgabe erfinden. Spieler erhält Geld auch ohne wirksame Note-GIVE |
| **T22–T27** | Neues echtes Board E43; Medicine-Quest E45 aktiv; Paket E46 durch autorisierten Transfer zum PC, Reise E47/E48, **direktes GIVE E49 an npc.bertho**, E50 READY, **E54** Turn-in nach GO→Guild mit **+40 cp/+23 XP**, completed | Zweiter robuster positiver Lieferungskontrollfall; gerade für 10B-2 Pflicht-Regression |
| **T28–T36** | Culling-Quest E57 angenommen (DEFEAT 3); drei reale Einzeltreffer/Kämpfe E63, E65, E71, jeweils gewonnen; Loot und XP enginegebucht; **E72 quest.ready** | Kein Beleg, dass der Mage zu schwach ist; drei Gegner sind echte getrennte Kampfauslösungen, kein bewiesener Gruppencombat-Fehler |
| **T37–T41** | Rückweg, Bunk/Stew gekauft (E77 −8 cp), Nacht geschlafen, MP regeneriert, Rückkehr und Dog-Quest E80 erfolgreich **+50 cp/+23 XP**; Level-up auf 2, anschließendes **#assign** funktioniert | In einem langen natürlichen Run sind Schlaf, Bezahlung, Kampf, XP und Level-up tatsächlich benutzbar |
| **T42–T45** | Erzähler führt **bereits erledigte** Kurier- und Medizin-Aufträge **erneut als sichtbare Board-Angebote** auf (Chat E85), obwohl Engine sie E41 und E54 abgeschlossen hat; Player versucht Medicine noch einmal; System E87/E89 zeigt korrekt andere echte verfügbare Quests; keine erneute Buchung | **Deutlicher offizieller Board-/Narrator-Wahrheitsbruch.** Die System-CLARIFY ist hier Schutz der Authority, nicht Beleg fehlerhafter Questpersistenz |
| **T46–T55** | Player-LLM verwechselt sein eigenes Früher mit einem fremden Auftrag, bestreitet Ledger und Medicine; Narrator formt daraus einen komplexen Impostor-/Doppelgänger-Plot; mehrere Story-Fakten und Threads werden gespeichert, obwohl der Mechanikstatus „completed“ bleibt | **Falsche Chronik des Testspielers** + Narrator-Zustandsdrift + Story-Memory-Persistenz. Die Identitätsdiebstahlshypothese ist **nicht** durch die gebuchten Quests belegt |
| **T52–T54** | Ein Besucher-Tagebuch wird erschaffen und T52/E103 wirklich vom PC genommen. T55 im Nutzerzählmaßstab (Engine T53/E111–112) ausdrücklich freiwillige Rückgabe an Maren, aber **give conditional**, **object.move als pc_inventory verweigert**; Narrator erzählt, Maren habe es hinter dem Tresen abgelegt | **Neuer konkreter 10B-2-Reproduktionsfall**, diesmal kein Questcargo: PC besitzt Tagebuch mechanisch weiter |
| **T56–T60** | Quartier bei Widow Sarra, sechs Kupfer für ein Zimmer autoritativ E115 bezahlt. Extraktor scheitert bei T59 (E118, Abbruch nach rund 120 s); T60 PC hängt Pouch auf und will zur Gilde (E119: DROP gebucht, GO **nur autorisiert**); Extraktor scheitert **erneut E120** nach rund 188 s | **Narrative Ankunft ohne scene.moved**; der tatsächliche Ort bleibt nach diesen Events Sarra-Zimmer. Folgeprobleme nicht als eine erfolgreiche Weltbewegung zählen |
| **T60–T61** | Narrator T60 versetzt Alaric dennoch in die Guild Hall und nennt **Tally Cellar Vermin**, **Repair the Guild's Fence**, **Copy the Watch's Duty Ledger** als neue offizielle Aufträge, obwohl für sie kein Guild-Board-Event/Quest vorhanden ist; Player greift nach Tally; T61/E121 quest.accept **refused: no such contract**; Narrator call **187** läuft leer | **Zwei gekoppelte, aber eigene Blocker:** falsch dargestellte Welt-/Boardwahrheit und Provider-/Narrator-Leerantwort. E121 wurde gebucht; es gab danach keine neue erfolgreiche Story-/World-Extraktion |

**Bewertung der Spielbarkeit:** Bis etwa T41 entwickelt sich eine erstaunlich erfolgreiche, zusammenhängende freie Kampagne mit echten Fortschritten. Ab T42 kippt sie erheblich in falsch erinnerte und persistierte Scheinprobleme; T60/T61 endet in einem echten Hardstop. Mehr Spielzüge allein beweisen deshalb noch keine konsistente Langzeiterfahrung.

## 3. P0/P1 – Geschlossene Quests werden als neue „offizielle“ Boardangebote erzählt

**Nachweis mit festen Quellstellen:**
1. **E41:** Ledger Courier von aktiv → **completed**, Auszahlung 40 cp, +23 XP.
2. **E54:** Medicine Delivery von aktiv → **completed**, Auszahlung 40 cp, +23 XP.
3. **E80:** Dog Cull von aktiv → **completed**, Auszahlung 50 cp, +23 XP.
4. **E43** ist die echte neu erzeugte Gildenliste, einschließlich Reed Flats Bog Striders, Upper Catacombs, Dyer's Cart, Medicine und Dog Cull. **Ab T42 sind Medicine und Dog Cull bereits abgeschlossen, Ledger noch länger abgeschlossen.** Ein späteres gültiges neues Board hätte diese bereits abgeschlossenen Jobs nicht als erneut verfügbar ausweisen dürfen.
5. **Chat E85 / T42:** Narrator beschreibt **Feral Dog Cull, Ledger Courier und Medicine Delivery** als Board-Zettel; „That one's still hanging“, „you took the ledger and the medicine both yesterday“. Keine passende neue Boardbuchung dieses Turns.
6. **E87 und E89 / T43 und T44:** System antwortet mit **CLARIFY** und drei echten auswählbaren Angeboten (Bog Striders, Upper Catacombs, Dyer's Cart). Das entspricht der Engine-Liste; der Spieler wertet den richtigen Systemschutz fälschlich als „System-/Board-Mismatch“.
7. **Chat E91–E93** rationalisiert erst die erledigte Medicine als „versehentlich wieder aufgehängt“ und anschließend die erledigte Ledger als angeblich **weiter offenen** Auftrag.
8. **E92/E94/E96/E98/E100** erstellen beziehungsweise ändern daraufhin Threads und Fakten über einen angeblich nicht zugestellten Ledger beziehungsweise einen Betrugsverdacht. Bestimmte **engine_owned_fact**-Deltas werden zu Recht abgewiesen (z. B. E100). Die frei formulierte Plot-Behauptung kann aber als **Thread/Text** erhalten bleiben.

**Gesicherte Fehlerklasse:** *Die sichtbare offizielle Welt widerspricht der autoritativen Engine-Welt*. Das spätere CLARIFY ist keine Engine-Inkonsistenz, sondern Folge einer **nicht zulässigen Narrator-Board-Erfindung**. Den Quests wurden nicht heimlich erneut Belohnungen zugeteilt und sie sind nicht wieder aktiv geworden.

**Wichtige Differenzierung:** Ein Narrator darf **private** neue Aufträge, Gerüchte, Missverständnisse und sogar einen echten Intrigenplot improvisieren, sofern sie nicht fälschlich als **vorliegende offizielle Guild-Listings oder erwiesene historische Spielerhandlungen** ausgegeben werden. Kreativität ist nicht das Problem; Autoritätsanmaßung gegenüber Board/Quests ist es. Die einmal begonnene Doppelgänger-Erzählung als mechanisch wahre Weltgeschichte zu reparieren wäre die falsche Richtung.

**Regressionsidee für 10B-3:** Auf dem realen Katalog mit bereits abgeschlossenen Aufträgen den tatsächlichen sichtbaren Narrator-Text prüfen: keine geschlossenen Guildjobs als verfügbare Brettangebote, keine falsche Aussage „formal noch offen“, keine Story-Threads, die eine bestätigte completed-Quest als open oder nie geliefert behaupten. Nicht nur testen, dass der Engine-Handler eine Annahme abweist. Der Engine-Output und die vom Spieler **gelesene** Antwort müssen übereinstimmen.

## 4. P1 – Der Testspieler verliert seine eigene abgeschlossene Geschichte

**Kernbefund:** Die Testspielerentscheidung T43 hält ausdrücklich fest, er habe „only ever took the dog cull“. T47/T48 behauptet er sogar, Ledger und Medicine **niemals gebucht** zu haben. Der Originalchat beweist das Gegenteil: T8–T21 und T23–T27 sind genau seine selbst erzeugten Spielerhandlungen, mit Übergaben und Zahlungen. Der frühere **Road Stranger** war ebenfalls real erzählt (T9–T12); der Testspieler erklärt später, ihn nie getroffen zu haben.

Der Runner ist korrekt getrennt: **driver.mjs:view()** zeigt die letzten **zwei Spieler-Nachrichten mit Antworten** und das aktuelle HUD; **players.mjs:notesText()** komprimiert alles Ältere auf **Milestone-Bereiche**, behält nur die **letzten sechs** ausgeschriebenen Notizen. Der LLM-Testspieler darf keine Engineevents direkt lesen. Das ist eine sinnvolle Schutzregel gegen Test-Cheating, liefert bei über 40 Spielzügen aber **zu wenig verlässliches Langzeitgedächtnis über abgeschlossenes persönliches Handeln**.

**Zur HUD-Deutung:** Eine Anzeige **„Quests: —“** nach einem erfolgreich abgegebenen Vertrag bedeutet zunächst, dass **kein aktiver Auftrag** verbleibt – nicht, dass der Charakter nie einen Vertrag angenommen hätte. Ebenso ist „kein Ledger mehr im Inventar“ nach tatsächlichem GIVE an das Priory **genau der zu erwartende Zustand**. Der Testspieler verwendet beide Statusinformationen fälschlich als Gegenbeweis für seine eigenen früheren Handlungen.

**Kausalkette (vorsichtig formuliert):** Kürzung früherer Testspieler-Züge/Notizen → Player-LLM kann frühere Erfolge nicht mehr sicher rekonstruieren → Narrator übernimmt die vom Player gelieferte falsche Erinnerung und dessen Gildenbehauptungen → Extractor persistiert davon freie Story-Fakten und Threads. Dieser Ablauf ist in den Originaltexten gut beobachtbar; **welcher einzelne Prompt/Context-Mechanismus beim Narrator den ersten falschen Boardtext auslöste, ist damit noch nicht isoliert bewiesen.** Erst der Narrator schrieb E85 das falsche Board. Der Spieler verstärkte es danach.

**Design- und Testrunner-Konsequenz:** Nicht einfach dem Testspieler Engineevents, alle Quests oder den gesamten Replayzustand zugänglich machen; das würde eine künstliche QA-Figur statt eines echten Spielers schaffen. Besser eine sehr kleine, **nur aus tatsächlich früher sichtbaren Nachrichten/HUD- und eigenen Handlungen** gespeiste Langzeit-Erinnerung des automatischen Testspielers, falls ein gezielter Vergleichslauf diesen Mangel als Runnerursache bestätigt. Ein menschlicher Spieler erinnert sich meist an drei selbst ausgeführte Quests; der Runner muss für einen 100-Züge-Beobachtungslauf nicht zwingend vor 40 Zügen abgeschlossene Handlungen vergessen. **Noch kein Runner-Änderungsauftrag, kein Umbau des freien Guides allein wegen Run 4.**

**Abgrenzung zu 10B-3:** Die Engine muss autoritative Guild-Fakten selbst dann schützen, wenn der Spieler irrt oder bewusst lügt. Umgekehrt beseitigt eine strengere Guild-Authority nicht die Gedächtnisursache beim automatischen Testspieler.

## 5. P0/P1 – Zwei Extractor-Abbrüche erzeugen Ghost-Travel und unmittelbar den finalen Ghost-Quest

**Separater Fehlerpfad am Run-Ende (nicht mit dem Boardfehler T42 verwechseln):**

- **T59 / Engine-Turn 56 / E118:** Extraktor-Antwort **extract.failed** nach ca. **120,0 Sekunden** („signal is aborted without reason“). Die vorherige Narrator-Antwort ist als Story sichtbar; keine gültige Weltverarbeitung folgt.
- **T60 / Engine-Turn 57 / E119:** User legt Small Pouch im Zimmer ab und will zum Guildhall gehen. Die Engine bucht tatsächlich den **DROP**, und der GO-Schritt wird **authorized**. Ein GO ist noch **keine gebuchte Ankunft**.
- **E120:** Wieder **extract.failed**, diesmal nach ca. **188,5 Sekunden**, gleiche Abbruchklasse. In E120 steht **kein scene.moved/scene.entered**. Folglich gibt es keinen autoritativen Ortswechsel aus Sarra-Zimmer zurück zur Gilde.
- **Chat E121 / T60 Antwort:** Narrator schildert dennoch die Rückkehr in die Gilde. Maren legt dort drei neue „offizielle“ Slips aus: Tally Cellar Vermin (4 Silver), Repair Guild Fence (3 Silver 5 Copper), Copy Watch Duty Ledger (3 Silver). **Keiner dieser drei Jobs erscheint in diesem Zug als quest.created, board.shown oder gültiges Guild-Listing.**
- **T61 / E121:** Testspieler wählt Tally Cellar. Planner/Resolver lehnt korrekt **„no such contract“** ab.
- **Call 187 / T61:** Narrator verbraucht 8.192 Completion-Tokens mit **35.577 Zeichen Reasoning**, **0 Textzeichen**, **finish_reason length**. Runner stoppt als **narrator_empty**. E121 enthält zwar ein enginegebuchtes turn.begun und einen abgelehnten Befehl, aber keine erfolgreiche Narrator-/Extractor-Fortsetzung.

**Konkrete Spielerwirkung:** Der Testspieler reagiert auf eine scheinbar erreichte neue Location und ein plausibel klingendes Questangebot. Die Engine hat aber **weder den Ortswechsel noch die angeblichen Guildangebote** gebucht. Der nächste natürliche Spielerzug kann daher nicht funktionieren, obwohl der Spieler aus seiner Bildschirmrealität vernünftig handelt.

**Verbindungen zu 10B-3/4:**
- 10B-3 muss offizielle Gildenangebote als Engine-owned kenntlich halten **und die für den Spieler sichtbare Prosa absichern**; nicht nur später ungebuchte Quests verweigern.
- 10B-4 muss Extractor- und Narrator-Ausfälle getrennt klassifizieren und nach Provider-Abbruch die **nicht gebuchte Ankunft/Objektänderung** unmissverständlich darstellen. Ein leerer Narrator darf nicht einen zweiten Engine-Commit auslösen. Eine zulässige enge Regeneration betrifft allein Storytext desselben bereits gebuchten Zuges; Host-Stale-/Swipe-Schutz zuvor prüfen.
- Die beiden **Server-AbortError**-Zeilen im Run sind Indizien für ein mögliches Host-/Provider-/Timeoutproblem, **kein Nachweis** einer bestimmten Git-Regression. Nicht pauschal die JS-Engine, die ST-Webseite oder das Modell allein verantwortlich erklären.

**Kleine positive Tatsache:** Die Engine weigerte sich trotz erfundener Tally-Quest, den Auftrag anzunehmen; es gab **keine Phantomzahlung**. Die bestehende Authority-Firewall funktioniert auf der Mechanikseite.

## 6. P1 – Freiwillige GIVE-Übergabe abermals nicht vollzogen (10B-2-Kontrollfall)

**Direkt gelungene Beispiele:**
- **E23**: explizites Ledger-GIVE an den anwesenden Priory-Bruder; **object.moved** ist vor E24 READY gebucht. Die spätere Erzählung über Warden Ambrose nicht mit dem tatsächlichen Object Holder verwechseln.
- **E49**: explizites GIVE des Medizinpakets an Bertho, **object.moved zu npc.bertho**, E50 READY. E54 hat den Vertrag **einmalig** bezahlt und abgeschlossen.

Diese beiden Fälle beweisen, dass nicht jede Lieferung defekt ist. **10B-2 darf sie nicht durch neue zusätzliche Player-Schritte oder retroaktive Proof-Anforderungen zerstören**. Für D8 in §14 des Masterplans konkrete positive Run-4-Fälle zusätzlich zu Run 1/2 aufnehmen.

**Negatives Gegenbeispiel T55 (Engine T53, E111–E112):**
- Player: „I believe this day-book is yours to file. I hand it over.“
- E111 Planner: **GO zur Guildhall** plus **GIVE des Besucher-Tagebuchs an Maren**, mit **needs: 1**; GIVE erhält nur **conditional: hand_over**, obwohl der Nutzer einen unmittelbaren Abschluss anstrebt.
- E112 Narrator: Maren nimmt das Tagebuch und **stellt es hinter dem Tresen ab**.
- E112 Extractor: passendes **object.move** wird mit **pc_inventory** abgewiesen („he hands it over only to the one he went to, there“), außerdem folgt **cmd.expired**.
- Gebuchter Object Holder bleibt **PC**, obwohl die Story glaubhaft und endgültig abgegeben erzählt. T56–T60 weist der Testspieler zurecht mehrfach auf die Bestandsabweichung hin.

Das ist ein **zweiter Run mit der gleichen Klasse bedingter GIVE-/GO→GIVE-Probleme**, hier ausdrücklich kein Vertrags-DELIVER. Deshalb soll 10B-2 nicht nur den speziellen Krankenkistenfall aus Run 3 „hart codieren“, sondern den allgemeinen **autorisierenden Kommando-/Empfänger-/Ortspfad** minimal richtig zusammenführen. Keinesfalls global pc_inventory abschalten.

**Weitere leichte Unstimmigkeit:** In T15 und T21 bleibt die zusätzliche courtesy note im PC-Inventar, weil ein GIVE an „desk clerk“/„Maren“ ohne eindeutige anwesende NPC-ID scheitert. Der Ledger-Vertrag wird trotzdem rechtmäßig abgeschlossen. Ein freiwillig übergebener Beleg ist nicht automatisch ein neues Quest-Objective.

## 7. P1/P2 – Kampfpraxis, Progression, Zeit und andere kleinere Auffälligkeiten

**Positiv:** 
- T32, T33 und T36: drei vom Spieler initiierte Flame-Lance-Angriffe, jeweils echte gebuchte Kämpfe (enc.t32/33/36), die Engine kreditiert **39 Combat-XP** und konsistente Pelz-/Fang-Lootstapel. Keine Scheinkills aus Erzählerprosa.
- Der Cull-Objective-Zähler erreicht **3/3**, E72 READY, E80 Turn-in +50 cp/+23 XP. Der erzählte vierte Hund bleibt am Rand stehen; der Auftrag verlangte **drei**, nicht die Ausrottung sämtlicher vier Hunde. **Kein nachgewiesener Zählbug**.
- Gebühren, Verpflegung und Lodging werden als reale Geld-/Serviceevents gebucht; T40 Schlaf regeneriert die dokumentierte MP; Levelaufstieg und **#assign** erfolgen nachvollziehbar.

**Nicht überinterpretieren:**
- HP nach Level-up teilweise unter neuem Maximum (z. B. 80/85): Max-HP-Anstieg ohne automatische Heilung kann beabsichtigt sein. Nur nach genauer Regel-/Eventprüfung als HP-Fehler einordnen.
- Kleinere Inkonsistenzen bei Ortsschildern, „Here“-Threads über den Chapel-Hollow-Road Stranger innerhalb der Stadt, NPC-Fallback-Labels wie „Npc.npctanner“ und coin-Anzeigedenominationen sind echte QoL-Hinweise, aber **keine belastbaren P0-Mechanikursachen** aus diesem Lauf.
- Dass drei Hunde in drei einzelnen Kampfrunden/Encounter starten, obwohl die Prosa eine Gruppe erwähnt, ist ohne Gruppenkohäsions-/Awareness-Prüfung **kein hinreichender Beweis** für einen weiteren Monstergruppenbug.
- **Keine numerische Mage-Balanceentscheidung** auf Grundlage dieses Laufs. Hier überlebt er und steigt auf; die Run-1-Todesursache lag u. a. bei vorzeitiger Narrator-/Extractor-Eskalation.

**Messbare Provider-/Stabilitätslast:**
- **13** als repaired gezählte Extractor-Vorfälle, **2** Planner-Reparaturen, **3** extract.failed; Runner meldet **33** unbrauchbare erste Spieler-LLM-Antworten, die dessen eigene Entscheidungs-JSON-Reparatur auslösten. Diese Player-Repairs sind nicht Engine-/Story-Reparaturen.
- Die Game-Latenz beträgt **Median 39,2 s**, **p90 157,6 s**, max **216,0 s** (T60); relevante langsame Narrator-Turns: T49 **196,9 s**, T61 **188,5 s**; langsamer Extractor bis **111,1 s** in den dokumentierten Antwortpaaren. Nicht aus hohen Modell-/Providerzeiten eine langsame deterministische JS-Kampfengine ableiten.
- Call 187 ist ein genauer Wiederholungsbefund der **Reasoning-only Length-Empty**-Klasse aus Run 2, diesmal nach erfolgreichem 60-Turn-Spielverlauf.

## 8. Einordnung in den bereits geplanten Patch 10B

| Paket/Arbeitsbereich | Konkreter Beitrag von Run 4 | Unmittelbare Konsequenz |
|---|---|---|
| **10B-1** (Fakten-IDs, Registrierungs-dependencies) | Test lief auf **.57**, Registrierung war hier bereits erfolgreich. Keine Aussage darüber, ob spätere .58-Fixes live funktionieren | **Keine rückwirkende .58-Abnahme**, kein zusätzlicher Patchauftrag aus dieser Beobachtung |
| **10B-2** (freiwillige Übergabe/Liefer-Authority) | Zwei echte **positive Delivery/Turn-in-Kontrollen** (E23–24/E41, E49–50/E54) und ein echter **negativer GIVE-Conditional-Fall** (E111–112) | Diese Fälle als **neue konkretisierte Regressionen** in den Auftrag aufnehmen, ohne den Scope auf Questcargo einzuengen |
| **10B-3** (offizielles Board, Narrative Authority) | Vorher completed Jobs werden als offizielle Board-Angebote gezeigt; ein Narrator/Player-Irrtum wird trotz zurückgewiesener quest-owned-Fakten in Story-Threads konserviert | **Spielersicht** ausdrücklich testen. Nicht reale Privatquests verbieten; mechanische Queststatus-Wahrheit und freie Drama-Ideen trennen |
| **10B-4** (LLM-Ausfall/Recovery) | 2 späte Extractor-Abbrüche (E118/E120) gefolgt von Ghost-Travel und leerem Narrator (T61/Call 187); E52 früherer Schemafehler | Fehlerphasen separat klassifizieren; single-commit-Zustand schützen; leere Narratorantwort nicht als vollendeten Spielzug ausgeben |
| **Testspieler-Langzeitgedächtnis** (Beobachtungs-/Runnerkandidat) | Ab T43 leugnet LLM-Testspieler zwei von ihm selbst abgewickelte Quests und interpretiert „Quests: —“ als „nie angenommen“ | **Als eigenständige Hypothese festhalten**, keine neuen Cheats/Engine-Zustandsinjektion. Kleines natürliches Erinnern nur aus seiner eigenen sichtbaren Geschichte prüfen |
| **Monster/Chase/Balancing** | Drei erfolgreiche Kämpfe, natürliche Level-2-Progression und kein Wipe | Noch keine automatische Monster-/Skalierungs- oder Chase-Änderung aus Run 4 |

**Keine ungefragte Änderung an 10B-1 bis -4 aufgrund dieses Reviews.** Der bereits ausformulierte 10B-2-Auftrag wird um **konkrete positive und negative Regressionen** ergänzt; andere Teilpatches bleiben zur Einzelbeauftragung offen.

## 9. Präzise Regressionen / offene Prüfungen

**R4-A – Boardwahrheit:** Nach E41/E54/E80 abgeschlossene Aufträge dürfen nicht erneut als verfügbare offizielle Board-Angebote narrativ erscheinen; das sichtbare Listing entspricht dem Engine-Katalog. Positive Option: NPC darf ein altes, verlegtes Papier als veralteten Zettel erwähnen, aber nicht als offenes Questangebot verkaufen.

**R4-B – Completed-Historie in Dialog und Memory:** Bei abgeschlossenem Ledger/Medicine und Player-Aussage „I never took it“ dürfen Dialog und Threads keine mechanische Wiedereröffnung oder beweisloses „unzugestellt“ als autoritative Geschichte persistieren. Eine in-world-Lüge oder ein nachvollziehbares Missverständnis kann erzählt werden, **unter Erhalt der abgeschlossenen Quest- und Transferfakten**.

**R4-C – Runner-Gedächtnis (nur beobachten/isoliert testen):** Gleicher sichtbarer Chat/HUD, 40+ Turns, die letzten Notizen enthalten nur aktuelle Ereignisse: Kann der Testspieler anhand einer kleinen, ausschließlich zuvor **für ihn sichtbaren** chronologischen Erinnerung drei abgeschlossene Jobs korrekt einordnen, ohne Engineevents zu sehen oder neue Spielerentscheidungen zu erzwingen? Guide unverändert lassen.

**R4-D – Positive Delivery:** Ledger E23 und Medicine E49 bleiben mit genau einem Objekttransfer, einem gültigen READY und genau einem gebuchten Turn-in erfolgreich. Empfänger/Ort/Menge aus dem echten Transfer nutzen, nicht aus freier Narrator-Formulierung.

**R4-E – Freiwilliges Tagebuch-GIVE:** GO→GIVE an dieselbe bekannte Clerk Maren, am wirklichen Ort und mit eindeutigem Objekt, muss bei bestätigter Ankunft den Transfer genau einmal buchen; nicht wegen neu benanntem „Maren“ gegenüber vorhandener NPC-ID blockieren. Narrator darf bei weiterhin abgelehnter Bewegung die Abgabe nicht als vollzogen behaupten.

**R4-F – Extraktor-Timeout → Ghost-Travel:** GO authorized und Narrator beschreibt Guildhall; Extractor fällt aus. Erwartet: keine szenische Ankunft im autoritativen Zustand, klar verständliche Rückmeldung, keine Guild-Board-Erfindung aus narrativem Aufenthaltsort. Der Nutzer soll bei Bedarf natürlich erneut handeln können; keine unbestellte Zwangswiederholung.

**R4-G – Leerer Narrator nach verweigertem Quest.accept:** Ein Planner-/Guard-Refusal darf weder in einem unkontrollierten zweiten Commit enden noch bei Narrator-Ausfall als erfolgreiches Questangebot erscheinen. Der Harness nennt narrator_empty unabhängig von früheren zwei Extractor-Abbrüchen.

**R4-H – Regression der realen Kampf-/Fortschrittsstrecke:** Drei Flame-Lance-Siege 12+12+15 XP, 3/3 Cull, 50 cp Auszahlung, Schlaf, #assign und bestehende Geldbuchungen bleiben nach den Patches erhalten. Kein statisches 60-Züge-Fixture in den offenen Guide einbauen.

**Offene Evidenzfragen:**
1. Welcher genaue Kontext-/Promptpfad erlaubte E85 trotz E43/E80, die abgeschlossenen offiziellen Jobs als Brettangebote darzustellen? Reale Promptnachricht, Katalog und History-Pruning gegeneinander halten.
2. Warum löste E111 das korrekte Nutzer-GIVE als conditional mit neuem ungebundenem Empfängernamen aus und ließ der World-Applier E112 die gültige Objektänderung nicht zu? ID-/Ort-Auflösung genau messen.
3. Welche Timeouts/AbortController- oder Providerantworten stehen hinter E118 und E120? Systemlog, phase-role, finish_reason und response body korrelieren; aus AbortError allein keine eindeutige Ursache annehmen.
4. Welcher begrenzte, nicht cheatende Testspieler-Memorymechanismus würde nach 40+ Zügen das Vergessen selbst gespielter Erfolge verhindern? Erst durch vergleichbaren Run nachweisen.
5. Wie verhält sich ein aktiv spielender Mensch bei identischen HUD-Hinweisen, und darf ein Narrator unter eindeutiger historischer Engine-Quelle eine persönliche falsche Erinnerung als Irrtum behandeln, statt sofort einen objektiven Doppelgängerkanon aufzubauen?

---

## 10. Schlussbewertung und nächste Schritte

**Run 4 ist spielerisch der bislang produktivste echte freie .57-Lauf:** Er zeigt, dass Registrieren, Gildenaufträge, echte Lieferungen, eigenes Kampftempo, Loot, Schlaf, Auszahlungen und Level-2-Progression im organischen Spiel zusammenspielen können. Das ist ein wesentlich stärkeres positives Ergebnis als bei den ersten drei kurzen Abbrüchen.

**Die neue schwerste Fehlerspirale ist nicht die eigentliche Questpersistenz**, sondern eine Diskrepanz zwischen **sichtbarer Board-/Dialog-Wahrheit**, einem **nach vielen Zügen vergessenden automatischen Testspieler**, und weiterhin persistierter **Narrator-Story-Memory**. Die spätere Extraktor-Recovery-Schwäche führt zusätzlich zu Ghost-Travel/Phantom-Aufträgen; danach beendet ein bekannter leeren Reasoning-only Narrator den Lauf.

**Arbeitsregel:** Unverändertes Original archivieren, Run-Review und 10B-Masterplan nachziehen, 10B-2 um Regressionen ergänzen, für 10B-3/4 als neue Evidenz bereithalten. **Keine neuen Engine- oder Runner-Änderungen aus dieser Review-Datei heraus freigeben.** Aus 61 Versuchen keine 100-Turn-Abnahme und aus einem Vor-.58-Run keine Abnahme von 10B-1 ableiten.
