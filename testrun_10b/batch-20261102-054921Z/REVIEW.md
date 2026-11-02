# Batch24 – unabhängiger Originalreview auf Build .150

**02.11.2026 · Sol · ausschließlich Analyse.** Produkt [bdaacc8](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/bdaacc807fbbf2c69dbb9babba3a4c725f546c4b), Build 4.3.0-c.6.6.150. Alle drei Originalexporte bestätigen denselben Commit und einen sauberen Arbeitsbaum.

## 1. Quellen, Methode und Ergebnis

Original-Chatupload: `batch-20261102-054921Z(1).zip`, interner Ordner `batch-20261102-054921Z`, **131.618.884 Bytes**, SHA-256 **`4557c902b300e6afc4c2148a6f65a39b6d0853d2f97eb836032f039fdfd7371f`**; ZIP-CRC fehlerfrei. **Die ZIP wurde mit diesem Review nicht auf main archiviert.** Für einen späteren unabhängigen Originalreview ist der Upload oder eine gesonderte Archivierung erforderlich.

Chat, Events, Modellrequests/-antworten, Runnerprotokolle, Zustände und wichtige Spielerschleifen aller drei Profile ausgewertet. Sämtliche Chats mit dem unveränderten .150-Code neu gefaltet und nach jedem Eventrecord validiert; Ereignisexporte stimmen mit dem Chat überein. Zwei strittige Übergänge zusätzlich über den tatsächlichen Produktpfad und Originalvorzustand reproduziert. Kein GPT-Review dieses Batches lag zum Prüfzeitpunkt auf main; deshalb keine angebliche Gegenprüfung eines nicht vorliegenden Reviews. Keine Produktänderung, Testsuite, ST-Smoke oder neuer natürlicher Run.

**Notation:** T = gesendete Spielerinputnummer pro Profil; I = nullbasierter Chatindex ohne JSONL-Metadatenzeile. I ist kein einzelner Eventindex.

| Profil | Inputs / Enginezüge | Ende | Fortschritt | Unabhängiger Fold/Validator |
|---|---:|---|---|---|
| Warrior | **282 / 264** | done | L15 und L16 bei T235; **L18, E-Klasse Ironhide Vanguard bei T282** | 0 Foldfehler, 0 Probleme; auch kein zwischenzeitlicher Validierungsfehler |
| Mage | **120 / 88** | Tod T120 | L6 | ebenso fehlerfrei; Kampf-/Todesrechnung konsistent |
| Rogue | **314 / 279** | **planner_failed / Failed to fetch T314** | L15 T252; final L17, E-Angebot vorhanden, nicht angenommen | ebenso fehlerfrei; letzter Input hat keine Engineevents |

**716 Inputs, 631 Enginezüge, 9.204 Events, 48 geschlossene Kämpfe.** Warrior19 Siege, Mage4 Siege/ein Tod, Rogue24 Siege. Kein Windows-EPERM oder Browser-PageError im Export. Zwei ST-AbortError-Logeinträge im Rogueprofil sind gesonderte Infrastrukturbelege.

**Gesamturteil:** Deutlicher Fortschritt gegenüber Batch23 bei Zustandsintegrität und langen funktionsfähigen Handels-/Questketten. **Kein Nachweis einer neuen schweren Fehlbuchung oder Gasthaus-Dungeon-Verfälschung.** Ein technischer Endabbruch bleibt; der Mage-Tod ist kein eigener technischer Abbruch. Zwei von drei Profilen enden ohne technische Zwangsbeendigung, aber ein einzelner Batch begründet keine allgemeine Zuverlässigkeitsquote. Ein integer weiterlaufender Datensatz und ein vollständig störungsarmer Spielverlauf sind weiterhin verschiedene Dinge.

## 2. .150-Nachprüfung

### Dungeon- und Ortsidentität

Warrior spielt diesmal überwiegend Outdoorjagden und etabliert keinen Living Dungeon. Mage bleibt bei **einer** kanonischen Wurzel `loc.mossback_warrens`; Rogue bei **einer** `loc.glimmerdeep_grotto`. Keine zweite Dungeonpopulation unter einem Gasthaus gefunden.

Das ist ein positiver Nichtwiederholungsbeleg, **keine natürliche Wiederholung der exakten I73→I74-Kette aus Batch23**. Deren vollständiger Rückkehr-/CLEAR-/Auszahlungsnachweis bleibt die gezielte .150-Regression. Die beiden Dungeonverträge werden in diesem Batch nicht abgeschlossen; dies allein beweist keinen kaputten Turn-in.

Keine persistierten unbekannten konkreten Ortsfakten mit Validierungsfolgen gefunden. Der neue Endbericht weist für alle drei Profile `integrity.ok:true` aus; die unabhängige vollständige Prüfung bestätigt das. Die Endprüfung ist aber keine Garantie gegen jede fachlich falsche Erzählung oder Weltinterpretation.

### Handel und Gesamtpreise

**71 Transaktionen:** 34 Käufe einschließlich der drei Registrierungen, 19 Verkäufe, 16 Gildenabgaben, zwei eigenständige Geldgeschenke. Keine wiederholte Angebots-/Positions- oder Questtransaktion gefunden. Start jeweils50 cp; sämtliche gebuchten Coin-Deltas ergeben exakt:

| | Warrior | Mage | Rogue |
|---|---:|---:|---:|
| Nettoänderung | +2211 cp | +7 cp | +770 cp |
| Endguthaben | **2261 cp** | **57 cp** | **820 cp** |

Kein Wiederauftreten von `unit_price_as_total` als falscher Ablehnungsgrund gefunden. Mengen-/Losverkäufe, Mehrartikelkäufe, Ausrüstungswechsel und spätere Verkäufe funktionieren. Das beweist nicht jede mögliche freie Finanzformulierung, rechtfertigt aber **keinen weiteren allgemeinen Finanzpatch**.

Die noch vorkommenden Preisablehnungen passen überwiegend zur bewusst beschlossenen S2-Grenze: „butter's three“, „a room for eight“, Stückpreise oder eine Endsumme ohne eigenen Währungsbeleg. Rogue T115–117 muss einen Verkauf nachbessern, T217–218 eine Endsumme klarstellen. Das kostet Eingaben, ist jedoch kein Nachweis falscher Geldbuchung. Bestehende Verkäufe werden nicht nochmals als erzählte Geldübergabe ausgezahlt.

`#pay` wurde in den drei natürlichen Chats nicht verwendet. Keine neue Behauptung einer natürlichen Edit-/Swipe-/Pay-Abnahme; dafür gelten weiterhin die dokumentierten gezielten Hosttests.

### AoE: endlich eine natürliche Gegenprobe mit Personen im selben Band

24 tatsächlich gebuchte Spieler-Flächenangriffe: Warrior12, Mage4, Rogue8. Kein NPC getroffen.

Zwei Fälle sind stärker als ein bloßes „kein Friendly Fire gesehen“:

- **Warrior T183/I365:** Cleave im **ENGAGED**-Band trifft die Reedcat. Der kanonisch anwesende Junge `npc.npcostrey_boy` steht ebenfalls ENGAGED und wird nicht getroffen.
- **Rogue T130/I259:** Fan of Blades im **SHORT**-Band trifft zwei Reedsnakes. `npc.tam` steht SHORT und wird verschont.

Damit ist die gewöhnliche AoE-Schonung unselektierter Personen erstmals in diesem Vergleich natürlich belegt. NPC-AoE-Parität, absichtliche NPC-Gruppenangriffe sowie Umwelt-/Wurfgegenstände werden daraus nicht zusätzlich als natürlich getestet ausgegeben.

## 3. Technischer Endabbruch: Rogue T314

Spielerinput: nach günstiger Unterkunft fragen, dorthin gehen und bis zum Morgen schlafen. Daran ist kein offensichtlicher Bedienfehler erkennbar. **Kein Plannerkommando wurde erfolgreich übernommen; keine Engineaktion und kein Kauf fanden statt.**

Originalrecord **I627**:

- `plan`: Fehler `Failed to fetch`, gemessen2394 ms.
- `plan_recovery`: derselbe Fehler, 4 ms.
- Beide Einträge `error_kind:"transport", unclassified:true`.
- `events:[]`, kein `planner_not_executed`-Fortsetzungsmarker.
- Runner meldet nach dem Warten auf eine Antwort insgesamt rund309 Sekunden und beendet mit `planner_failed`.
- Letzter archivierter Server-Modellcall938 hat keine Antwort; im ST-Log steht zeitnah ein AbortError. Das beweist weder ein ausgeschöpftes Modellbudget noch die konkrete Ursache des Verbindungsabbruchs.

**Read-only reproduziert:** Den echten Originalchat vor I627 mit einem `TypeError("Failed to fetch")` aus dem Modelladapter durch `prepareGenerationAsync()` geschickt: genau `plan` und `plan_recovery`, anschließend `action:"abort"`, kein Kommandoevent und kein Fortsetzungsmarker.

**Codeursache der harten Behandlung:** `v4/runtime.js:ask()` markiert nicht näher klassifizierte Fetchfehler als `unclassified`. Der Hard-Guard beim fehlgeschlagenen Planner lässt dann absichtlich keinen sicheren Fortsetzungsmarker zu. `tools/st_live/live/evaluator.mjs:softExtractionFailure()` verlangt diesen Marker; der Runner stoppt. Das ist die vorhandene konservative Sicherheitsentscheidung, keine .150-Preis-/Dungeon-Regression.

**Einordnung: Klasse C, hohe Stabilitätspriorität.** Der wirtschaftliche Zustand bleibt geschützt. Eine Verbindungsstörung vor jeder Engineausführung kann dennoch einen fast abgeschlossenen Langlauf beenden.

**Begrenzter nächster Technikschritt, noch nicht umgesetzt:** Den echten Fetch-/Hostfehler am Adapter mit Anfragephase, Signal-/Chatgültigkeit und eindeutig nicht ausgeführtem Plannerstatus klassifizieren. Nur für einen belegten Netzwerkfehler vor dem Commit die vorhandene begrenzte Fortsetzung/Speicherprüfung nutzen; im Zweifel bestehender Stopp. Keine Freigabe aller unbekannten Exceptions und keine Wiederholung bereits ausgeführter Engineaktionen. Die bestehende zweite Modellanfrage wurde hier bereits versucht; eine größere Retryzahl allein ist keine Ursachenkorrektur. Ob die ursprüngliche Netz-/Hoststörung dabei verschwindet, bleibt offen.

Nicht die Unterkunftssprache, den Questparser oder weitere Finanzbegriffe als Ersatz reparieren.

## 4. Zwei sicher fortgesetzte Modellfehler

- **Warrior T235/I470:** Extractor und Repair liefern kein gültiges `place.reported`-Delta; unter anderem fehlt `how`. Die Narrationsextraktion wird versiegelt verworfen, der Lauf geht weiter. **Bereits vorher durch die Engine gebuchte Gildenabgabe, XP/Level und Klassenangebote bleiben erhalten.** „World not recorded“ heißt hier nicht, dass die Engineauszahlung verloren wäre. Verloren geht der betreffende Weltbericht. Klasse A.
- **Mage T60/I119:** Planner meldet die optionale AoE-Zielliste in einer nicht zulässigen Form. Die vorhandene Validierung weist das zurück; die Folgeeingabe setzt das Spiel fort. Kein illegales Ziel und keine verbrauchte Angriffsressource aus dem abgewiesenen Input. Klasse A.

**Kein `finish_reason:length` im gesamten Modellarchiv.** Von2092 archivierten Serverrequests haben2090 regulär `stop`; zwei Rogue-Requests sind ohne Antwort archiviert (Board T155 und Planner T314). Kein pauschaler Reasoning-/Tokenbudget-Fix daraus ableitbar.

Rogue hat tatsächlich längere Antwortzeiten: Narrator-Median11,6s, Maximum323,1s; Extractor-Median8,5s, Maximum107,9s. Das ist ein Pacing-/Providerbefund, keine bewiesene Finanz- oder Zustandsursache. Einzelne lange erfolgreiche Antworten sind nicht automatisch technische Runabbrüche.

## 5. Mage-Tod: berechneter Tod nach falscher Gefahrenentscheidung; neutrale Dungeonkreaturen separat bewerten

Die L1-Scouts und Warband wurden besiegt; der kanonische L1-Chief lebt im tatsächlichen State weiter. Der Narrator behauptet später wiederholt, der Chief sei längst tot. Diese Erzählung vollendet den CLEAR-Vertrag nicht. Seine Nichtauszahlung ist korrekt.

**T102/I204:** Der Spieler folgt der kühlen Hauptrinne „down the gentle slope“. Die Engine meldet ausdrücklich:

> ENTERED — Mossback Warrens, Level 2 · Rank E

Sie materialisiert die drei kanonischen L2-Goblinwarriors mit L16/18/19; der Spieler zieht sich vor ihnen zurück. Floor2 ist für diesen Dungeon nicht versiegelt. Der Abstieg ohne L1-CLEAR ist daher kein nachgewiesener Seal-Fehler. Spätere Hallen sind weiterhin mechanisch auf Ebene2, auch wenn die Prosa bzw. der Spieler sie wieder als L1-Ziel behandeln. Keine erneute Sperre jeder „down“-Formulierung empfehlen.

### Warum der zusätzliche Mossback überhaupt existiert

T111/I222 registriert die Extraktion einen entfernten Mossback mit `present:false`; das erzeugt keinen lokalen Kampfgegner. T114 wird ein anwesender bedrohlicher Mossback korrekt als nicht kanonischer Dungeongegner abgewiesen.

**T117/I234** liefert die Extraktion dagegen `creature.new` mit **`threat:false`** und einem neuen Ref. Die Engine nimmt die Kreatur als neutrale/defensive Dungeonfauna an. Ihr E-Level wird aus dem tatsächlichen L2-Minionspan gezogen: **L17, HP294, ATK54, MDEF7**.

**Mit dem Originalvorzustand über applyWorld reproduziert:** `threat:false` erzeugt genau diese lokale Kreatur; dieselbe Antwort mit `threat:true` wird als `dungeon_foe` verworfen.

Das ist eine **bestehende ausdrücklich kommentierte und getestete Ausnahme** in `world.js:newEntity()` und `living.js:slotForNew()`: harmlose Ratten/Fledermäuse und andere neutrale Kreaturen dürfen außerhalb der feindlichen Slots existieren. Sie sind anschließend nicht gegen absichtliche Spielerangriffe immun. Es ist keine neue .150-Regel und nicht der alte Fehler „present:false erzeugt trotzdem lokale drei Gegner“.

**Bewertung:** Der Narrator/Extractor nutzt für einen wiederholt als Guardian beschriebenen gefährlichen Einzelgegner eine Zuordnung, die für neutrale Fauna gedacht ist. Das zeigt eine unklare Designgrenze; die mechanische Annahme folgt jedoch der aktuellen Ausnahme. Nicht vorschnell als neuer allgemeiner Spawn-P1 oder als Anlass für eine Guardian-Wortliste einstufen. Eine spätere bewusste Entscheidung könnte diese Ausnahme enger abgrenzen; eine globale NPC-/Tierimmunität oder ein Verbot sämtlicher nicht feindlicher Dungeonwesen wäre ein größerer Verlust an Sandboxfreiheit.

### Der eigentliche Kampf

Der Spieler greift den zunächst nicht angreifenden Mossback T118 gezielt mit Arcane Bolt an:

| Input | Bolt-Schaden | PC-HP nach Gegenangriff |
|---|---:|---:|
| T118 | 49 | 127→81 |
| T119 | 48 | 81→36 |
| T120 | 55 | 36→0 |

Drei Gegenangriffe verursachen46/45/45. Der Mossback hat am Ende noch142 HP. Keine zusätzliche erfundene mechanische Attacke und kein Friendly Fire gefunden. Der Spieler bleibt trotz der ersten46 Schaden und des noch deutlich überlegenen Gegnerzustands beim Angriff.

**Tod unter den aktuellen Regeln plausibel und korrekt gerechnet**, mit gefährlicher narrativer Zielverwirrung und schlechter Gefahrenentscheidung des Testspielers. Keine Ableitung „Mage generell zu schwach“ oder pauschaler Startwerte-/Schadensbuff. Die tatsächliche Levelzahl neutraler Kreaturen wird im ACTIVE-SCENE-Hinweis nicht ausgewiesen; die E-Etage war aber zuvor deutlich bestätigt. Eine künftige knappe Risikowahrnehmung kann sinnvoll sein, ist keine automatische technische Fehlerfreigabe.

## 6. Warum die Runs nach L15 weiterlaufen: Testspieler, nicht XP

Warrior erreicht das Levelziel T235, nimmt die Klasse erst T282 an: **47 zusätzliche Inputs**. Rogue erreicht L15 T252 und spielt bis zum technischen Stopp T314 weiter: **62 zusätzliche Inputs**, ohne Klassenwahl. Teile davon sind sinnvolle laufende Kämpfe/Quests, nicht109 technisch „verschwendete“ Inputs.

Entscheidend: **Beide Klassenangebote waren bereits gebucht UND auf dem tatsächlich gelieferten Spielerscreen sichtbar.**

- Warrior erhält bei T235 Bulwark Breaker / Ironhide Vanguard; der Screen vor T236/T237 nennt ausdrücklich `POSSIBLE CLASS`, „choose one, or postpone (#class)“.
- Rogue erhält bei T252 Iron Rogue / Keen Rogue / Steadfast Rogue; vor T253 stehen diese Optionen ebenfalls im Engine-Abschnitt.

Kein verschwundenes Klassenangebot und kein fehlender E-Content. Der Warrior liest erst T281 `#class`; Rogue tut es nie. Aus seiner eigenen späteren Notiz bleibt häufig `open_run_level` als Arbeitsziel stehen.

**Codebezug:** `players.mjs` liefert dem Spieler die statische Etappenliste und eigene jüngste Notizen. Das verkürzte Recoveryprompt wählt die zuletzt vom Spieler selbst genannte Etappe; `run_live.mjs` übergibt an `player.decide()` nur turn/maxTurns, kein aktualisiertes abgeschlossenes Etappenziel. Der Auswerter erkennt L15 bereits, dieser Fortschritt wird aber nicht als kompakter aktueller Zielhinweis an den Spieler zurückgereicht.

**Empfehlung für bessere Datensammlung:** Eine kurze, aktuelle Erinnerung direkt vor der nächsten Entscheidung: „Level15 bestätigt; nächstes Ziel: nach laufender Gefahr angebotene E-Klasse ansehen und frei wählen.“ Nur bekannte sichtbare Meilensteine/Informationen verwenden; keine automatische Klassenannahme, neue feste Route, versteckte Tatenbuchdaten oder still umgeschriebene Eingabe. Das ist zielgerichteter als ein weiteres langes Bedienhandbuch oder mehr XP.

Zusätzlich mischt Warrior mehrfach `#assign` in längere Freitextaktionen. Der Systembefehl wird so nicht ausgeführt, der Narrator behauptet teilweise trotzdem die Wertezuweisung. Spätere echte alleinstehende `#assign`-Inputs verbuchen die Punkte; final keine freien Punkte mehr. Hauptsächlich Bedien-/Erzählfehler, kein Grund, jede denkbare Systembefehl-Einbettung in der Engine zu parsen.

## 7. Skill- und Gearentwicklung, Balance

### Skills

| Profil | Endstand |
|---|---|
| Warrior | **Basic Attack P5**, Guard P1/0, Cleave P2/51 |
| Mage | Basic P1/0, Arcane Bolt P2/4, Arcane Wave P1/36 |
| Rogue | Basic P3/26, Razor Cut P2/40, Fan of Blades P1/54 |

Zwei echte organische **Breakthrough-Angebote**: Warrior **Iron Guard Riposte T134**, Rogue **Rushing Keen Strike T169**. Keines wird angenommen. Kein neues Lernziel, keine Skill-Evolution gebucht.

Basic Attack erreicht beim Warrior nachvollziehbar P5. Basic Attack evolviert nach der bestehenden Regel **nicht selbst**, sondern bietet eine neue Technik daneben an; genau dies geschieht hier. Die übrigen Skills erreichen noch nicht P5. Daher kein nachgewiesener Evolutionsbug. Der Rogue verwendet später überwiegend Basic Attack und besiegt zunehmend deutlich schwächere Gegner; selten benutzte bzw. nicht mehr qualifizierende Skills wachsen nicht einfach mit dem Level.

Für die nächste Datensammlung offene Skillangebote bewusst prüfen und freiwillig annehmen oder ablehnen lassen. Keine garantierte neue Technik, zusätzliche PP oder Evolution allein wegen L15. Die Engine liefert Angebote; die Testspieler lassen diese neuen Funktionen gerade ungetestet.

### Gear und Geld

- Warrior: Fine-Mail72cp bei T58; Fine-Langschwert140cp plus Fine-Chainmail72cp als vollständiger 212-cp-Kauf T99; **Superior-Langschwert260cp T155, Superior-Mail88cp T157**. Mit früherer Ausrüstung statt erst kurz vor Laufende. Final2261cp.
- Rogue: Common-Dolch80cp T80, Fine-Lederrüstung56cp T82, **Superior-Light-Armor72cp T204, Superior-Shortsword260cp T206**; Fine-Dolch140cp bereits T111 gekauft. Final820cp.
- Mage bleibt beim Startergear und verkauft kein Kampfloot. Er kommt während der langen Dungeonphase kaum zu einem sinnvollen Stadt-/Ausrüstungszyklus zurück; das ist nicht der Beweis, dass Magierkäufe technisch scheitern.

Die hohen Endguthaben von Warrior und Rogue und das Verbleiben bei Superior-Gear sind interessante spätere Shop-/Economyfragen. Der Batch belegt Kaufbarkeit und Upgrades, nicht bereits einen gut austarierten Geldabfluss über F und E.

### XP/Pacing

L15 bei **T235 Warrior / T252 Rogue** liegt näher am200-Input-Wunsch als die bloßen282/314 Endzahlen vermuten lassen. Checkpoint T100: WarriorL7, MageL6, RogueL6. Kampf-XP Warrior8415, Mage1520, Rogue8425, dazu bestehende Quest-XP.

Viele Eingaben gehen auf Suche, Reise, Gespräch, Ruhe, Ziel-/Reichweitenkorrekturen und bestehende Handlungsschleifen. **Keine neue XP-Erhöhung aus diesem Batch empfehlen.** Zuerst die Testspieler beim bereits erreichten Etappenziel halten und Skillangebote tatsächlich testen. Spätere Balanceentscheidung aus mehreren vergleichbaren Kampagnen, nicht aus dem Netzwerk-Endgrund oder den Eingaben nach L15.

## 8. Priorität und nächste Schritte – keine Implementierung

| Priorität | Empfehlung | Begründung |
|---|---|---|
| Hoch, Technik | Rogue-I627: Klassifikation und Fortsetzbarkeit des nachweislich vor Commit gescheiterten Fetch-/Plannerwegs prüfen | Ein einzelner Transportfehler beendet den langen integeren Run. Bestehende Retry-/Abbruchregeln gezielt nutzen, keine pauschale Unknown-Exception-Freigabe |
| Hoch, Datensammlung | Aktuelles erreichtes Etappenziel beim Spieler sichtbar halten; nach L15 freie E-Auswahl und offene Skillangebote bewusst prüfen | Angebote sind vorhanden und sichtbar, werden aber ignoriert. Kein Engine-/XP-Fix |
| Offen, Design | Grenzen neutraler unabhängiger Dungeonfauna und verständliche Gefahrenwahrnehmung | `threat:false` kann auch eine gefährliche verteidigende Kreatur zulassen. Bestehende Ausnahme, vor Änderung Sandboxverlust abwägen |
| Vorerst beibehalten | S1/S2-Handel, .150-Ortsfix, AoE, XP×5, PP/LP/Startwerte | Keine neue bestätigte Finanz- oder Balancefehlbuchung; natürliche positive AoE-Gegenproben und funktionierende Gearketten |

**10B noch nicht allein aufgrund dieses Batches abschließen.** Der Fortschritt ist real: keine nachgewiesene schwere persistente Verfälschung wie im vorherigen Warriorlauf, sichere lokale Fortsetzung nach zwei Modellfehlern, natürliche AoE-Schonung und funktionierende Upgrades. Der verbliebene Transport-Endabbruch und die verfehlte Testspieler-Etappenführung sind die konkreten nächsten Ansatzpunkte. Keine erneute allgemeine Finanz-, Parser- oder Kampfarchitekturprüfung und keine automatische Umsetzung dieses Reviews.
