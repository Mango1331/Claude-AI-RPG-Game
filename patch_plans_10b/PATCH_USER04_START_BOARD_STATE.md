# User04 – Fachplan: Startwerte 5, Boardprosa und autoritative Erzählzustände

**Stand: 07.11.2026 · unabhängige technische Planung, keine Implementierungsfreigabe.** Geprüfte Remote-HEADs: Produkt `2089dccdb7fd3dc08c72c5737c6b111fb6512f56` / **4.3.0-c.6.6.159**, `main` `2beca00edfcf5da5f60f97f010130b28c1215069`. Keine Änderung an Produktcode, Contentwerten oder Kanon durch diesen Plan.

**Umsetzungsstatus:** Nach Nutzerfreigabe als .160 implementiert und abgenommen; siehe §8. §§1–7 dokumentieren Planung und Gegenreview vor der Umsetzung.

## 1. Ergebnis, Quellen und Nachweisgrenzen

Die drei Änderungen sind als ein begrenztes Gameplay-/QoL-Paket sinnvoll. **A ist eine kleine Contentänderung mit einer konkret erheblichen Balancewirkung. B braucht vor allem die Korrektur einer widersprüchlichen Narratoranweisung. C braucht zwei fachlich getrennte Ableitungen im bestehenden Kontextpfad; insbesondere C2 ist mehr als der Austausch eines Wortes.** Keine zusätzliche State-Wahrheit, Modellabfrage oder Architektur nötig.

Ausgangsquellen: [User04-Review einschließlich Sol §§1–10 und GPT §11](../testrun_10b/user-20261106-072640/REVIEW.md), [Originalfeedback](../testrun_10b/user-20261106-072640/originals/user_feedback.txt), [gespeicherte Gegenproben](../testrun_10b/user-20261106-072640/PROBE_RESULTS.json), [Originalmanifest](../testrun_10b/user-20261106-072640/SOURCE_MANIFEST.md). Keine erneute Gesamtanalyse. Arbeitsweise [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), Status [03](../03_AKTUELLER_PROJEKTSTAND.md); Kanon §5 bleibt bis zur tatsächlichen Änderung bei Basis 7.

**In diesem Auftrag zusätzlich tatsächlich durchgeführt:** sechs Charaktererstellungen (drei Produkt-Starterklassen × Basis 7/5), deterministische Erstkampf-Gegenprobe, Altstart-/Fortsetzungsprobe und gezielte Zustands-/Kontext-/Boardauswertung für I52/I60/I66/I72/I82. Das [Read-only-Skript](../testrun_10b/user-20261106-072640/READ_ONLY_QOL_PLAN_PROBES.mjs) reproduziert diese Werte und prüft sie mit Assertions. Alle Assertions bestanden. Keine vollständige Node-/Replaymatrix, keine neuen ST-Hostläufe und keine Modellaufrufe.

Zusätzlich wurden die fünf relevanten **tatsächlichen ST-Requests** aus der vorhandenen Parserauswertung selektiv geprüft. Nach der bereits dokumentierten Codepagekorrektur der lokalen Leseansicht enthalten alle fünf den rekonstruierten Engineblock exakt. Die Originalbytes wurden nicht verändert. Requestnummer/Zeile im dekomprimierten Serverlog:

| Antwort | Narratorrequest | Requestbeginn | Zweck |
|---|---:|---:|---|
| I52 | 77 | 25390 | Guardian besiegt / Clear |
| I60 | 80 | 26456 | Suche nach Guardian |
| I66 | 89 | 29648 | Nachfrage nach tieferen Ebenen in der Gilde |
| I72 | 99 | 33030 | GO zur Gilde plus neues Board |
| I82 | 114 | 38453 | Titan nach Ambush-Lance |

Das mitarchivierte Skript benötigt nur Produktcheckout und User04-Archiv, nicht die großen Parser-Zwischendateien. Der ST-Requestabgleich ist hier mit den Originalfundstellen dokumentiert; er ist nicht Bestandteil dieses Node-Skripts.

## 2. Änderung A – neue Charaktere mit Basis 5

### 2.1 Ursache und tatsächlicher Datenfluss

[Produktdateien in .159](https://github.com/Mango1331/Claude-AI-RPG-Game/tree/2089dccdb7fd3dc08c72c5737c6b111fb6512f56/avereth-engine):

1. `content/campaign_start.json`, `pc.stats`: sechs explizite Werte 7. `content/rules.json.human_baseline` steht bereits auf 5; diese allgemeine NPC-/Menschenbaseline initialisiert den PC nicht.
2. `src/content.js:indexContent()` liefert die Vorlage als `content.start`.
3. `src/engine.js:startCampaign()` kopiert `content.start.pc.stats`, berechnet die anfänglichen Ressourcen mit `deriveCharacter()` und schreibt das vollständige PC-Sheet in `campaign.started`.
4. `src/state.js:applyEvent(campaign.started)` übernimmt das gespeicherte Sheet ohne Contentzugriff. `creation.class_selected` addiert **einmal +1 auf beide Favored Stats**. `src/creation.js:selectSkills()` berechnet nach Ausrüstung die vollen Abschlussressourcen; `creation.completed` speichert diese.
5. `deriveCharacter()` und `rawPower()` bleiben gemeinsame Formeln. Spätere Level-/Statvergabe arbeitet auf dem vorhandenen Sheet, nicht auf der Startvorlage.

**Original:** I0 zeigt 5, sein `campaign.started` speichert 7. Die späteren Erstellungsschritte zeigen die tatsächlichen Werte. Es liegt keine geheime Statvergabe vor.

### 2.2 Gemessene Auswirkungen und unabhängige Bewertung

Unveränderte Regeln: HP = 50 + 5 × Level + 5 × VIT; MP = 8 × INT + 4 × WIL; Initiative = floor(1,5 × AGI); STA = 100. Ausrüstung und Formeln bleiben gleich.

| L1 nach kompletter Erstellung mit Produkt-Starterkit | Basis 7 → 5: HP | MP | Initiative | DEF / MDEF |
|---|---|---|---|---|
| Warrior, Favored STR/VIT | 95 → 85 | 84 → 60 | 10 → 7 | 8/3 → 7/3 |
| Mage, Favored INT/WIL | 90 → 80 | 96 → 72 | 10 → 7 | 3/5 → 3/4 |
| Rogue, Favored AGI/PER | 90 → 80 | 84 → 60 | 12 → 9 | 3/4 → 3/4 |

Vor Klassenauswahl: 90/84 HP/MP werden 80/60. Favored endet bei 6, alle übrigen Attribute bei 5. Ausrüstungs-ATK/MATK bleiben unverändert. Beispiele für **Raw Power vor Verteidigung/Varianz**: Mage Basic Attack 24 → 21,5; Arcane Wave 28 → 25,5; Flame Lance 45 → 40,25. Keine pauschale Schadensreduktion um einen einheitlichen Prozentsatz.

**Konkreter Erstkampf statt allgemeiner Warnung:** Originalzustand unmittelbar vor I19, originale drei Skelette L5/L4/L3, originale gemappte Aktionen I19/I21/I23 (Wave, Wave, Basic Attack), gleiche initiale RNG-Daten. Für den Gegenfall ausschließlich die sechs PC-Stats um 2 vermindert und volle passende Startressourcen abgeleitet. Gegner, Skills, Reihenfolge der gewählten Handlungen und Formeln unverändert.

| Variante | Nach I19 | Nach I21 | Nach I23 |
|---|---|---|---|
| Basis 7, Kontrolle | 34 HP / 82 MP | 17 HP / 68 MP | Sieg, 17 HP / 68 MP |
| Basis 5, Gegenfall | **1 HP / 58 MP** | **Tod, 0 HP / 44 MP** | Nicht mehr ausgeführt |

Die drei Kampf-Recordlisten der Kontrolle sind exakt identisch zu den Originalrecords; alle simulierten Zustände validieren. Beim Gegenfall handeln wegen Initiative 7 alle drei Skelette vor der zweiten PC-Aktion erneut. Nach der zweiten Wave stirbt der Mage durch Skelett A vor der dritten Aktion. **Nicht nur die 10 fehlenden HP entscheiden.** Die Initiativgruppen ändern sich; dadurch ändert sich auch der Verbrauch von Tie-Break-RNG und anschließend die Schadensvarianz. Gleicher Startseed bedeutet hier keine künstlich gleichen Einzelwürfe.

Grenze: feste Originalaktionen in einem Zustandsklon, kein neuer natürlicher Run und keine Aussage, jede Spielweise oder Starterklasse müsse hier sterben. Warrior/Rogue wurden erstellt und abgeleitet, nicht durch erfundene Alternativkämpfe geschickt. Der kontrollierte Kampf führt nur die Mechanik der gewählten Aktionen aus; keine kontrafaktischen Narratortexte oder alten Extraktionen werden in den geänderten Verlauf hineinkopiert.

**Empfehlung:** Der Nutzerwunsch und GPTs isolierter Contentansatz sind technisch richtig. Basis 5 für neue Kampagnen ist weiterhin die gewählte Planung, mit dem jetzt belegten härteren Einstieg als bewusstem Abwägungspunkt für die spätere Freigabe. Kein gleichzeitiger Monster-/XP-/First-Strike-/Progressionsausgleich. Eine Überlebensgarantie wäre eine zusätzliche Designentscheidung und gehört nicht in diesen Schnitt.

### 2.3 Konkreter Eingriff, Altstände und Texte

- Nur die sechs Literale in `content/campaign_start.json.pc.stats` von 7 auf 5 setzen. Die gemeinsam verwendete Vorlage gilt für **alle neu gestarteten Kampagnen**, nicht nur einen neu eingeführten Spezialpfad. Keine Reducer-, Lade- oder Migrationsänderung.
- `tests/v4/patch_pc_start_stats.test.js` anpassen: neue Starts 5; Favored 6/5; bestehende Tests für XP, freie Punkte, Favored-Growth und NPC-Baseline erhalten. Der bisherige Altstarttest mit 5 muss insbesondere durch einen **korrekten gespeicherten 7er-Start** ergänzt/ersetzt werden; nicht nur Stats eines Events ändern und dazu unpassende Ressourcen stehenlassen.
- Altspielstände behalten ihre gespeicherten 7er-Werte. Zusätzlich geprüft: selbst eine mit 7 gestartete, noch nicht abgeschlossene Originalerstellung endet unter dem geklonten 5er-Content weiter bei Mage 90 HP / 96 MP. Keine Rücknahme der bereits gespeicherten Basis.
- Nach Implementierung und Abnahme `02_DESIGN_KANON.md` §5 auf „Basis 5 für neue Kampagnen, Favored +1“ ändern; Produktpatchnote und 03 aktualisieren. I0/der verwendete Starttext, `rules.json.human_baseline` und `classes.json.human_baseline_text` nennen bereits 5. Historische Reviews, Originale und alte Patchnotes bleiben unverändert. Keine pauschale Suche/Ersetzung beliebiger Zahlen 7.

## 3. Änderung B – Boardkarten besitzen den Katalog, Narrator erzählt die Szene

### 3.1 Originalbeleg und Ursache

I71 kombiniert Weg zur Gilde und Boardlesen. In I72 werden **fünf vollständige offizielle Questzeilen** erneut erzählt. Allein der klar abgrenzbare Katalog zwischen erstem und letztem Questtitel umfasst **1874 Zeichen / 314 durch Whitespace getrennte Wörter**, bei 3419 Zeichen Gesamtprosa. Der Provider meldet für die ganze Antwort 828 Completiontokens; die Tokens des Katalogs sind nicht separat gemessen.

Der Produktcode fordert diese Dopplung aktiv an: `src/v4/commands.js:HANDLERS['board.read']()` erzeugt die lange Action-Zeile mit **„show exactly these … present the notices in the existing title-first readable format“** und den vollständigen `rows`. `playerActionsBlock()` in `src/context.js` verlangt anschließend, die aufgelisteten Aktionen genau zu erzählen. Ein pauschales „Modell hat vorhandene Karten ignoriert“ ist deshalb als Ursachenbewertung unvollständig.

Der Kartendatenfluss ist bereits vorhanden: `ctx.boardShown` → `outcome.board` mit fünf Quest-IDs → nach bestätigter Ankunft `board.shown` in `world.js` → `hud.js:boardView()/renderBoardCards()`. **I72 ist ein bedingtes Lesen:** vor der Narration noch kein `board.shown` dieses Lesens und keine `engine_lines`-Boardkarte, nach der Extraktion eine bestätigte Gildenankunft und ein `board.shown`. Auch die **archivierten** `extra.display_text` und `extra.avereth.hud` enthalten tatsächlich je fünf `avereth-board-card`-Artikel; es handelt sich nicht nur um eine hypothetisch verfügbare UI. `boardView()` rekonstruiert fünf Karten mit 3384 Zeichen Karten-HTML. Die Karten zeigen Titel, Rang/Level, Belohnung und Gefahren; Client, Auftrag und Vertrags-ID bleiben in den aufklappbaren Details. `host.js:displaySystemPanel()` vermeidet bereits die zusätzliche Systempanel-Dopplung.

### 3.2 Gewählte Lösung und Alternativen

**Kleinste belastbare Lösung:** die Präsentationsanweisung am Entstehungsort der `board.read`-Action für den C-Produktpfad ersetzen. Den Narrator nicht abschalten und die Karten nicht verändern.

Vorgesehene Struktur der Action, sinngemäß:

> READS the Novice board [when he reaches the hall]. The engine displays the official catalogue as System cards once this read is confirmed. Narrate the reading briefly, atmosphere and relevant NPC reactions. Do not reproduce the catalogue or repeat every title, objective, reward or risk line. Specific requested details and natural discussion of individual contracts remain allowed. The reference data below is authoritative information, not a second list to output.

Danach bleiben die vorhandenen kanonischen Referenzzeilen verfügbar, klar mit **REFERENCE ONLY — NOT A PROSE CATALOGUE** bezeichnet. Bestehende Regeln zu neuem Tagesboard bzw. unverändertem Wiederlesen und zu keiner erfundenen Entnahme bleiben erhalten. Beim bedingten Lesen bleibt ausdrücklich „erst nach tatsächlicher Ankunft; andernfalls sieht er nichts“ erhalten.

**Bewertung des reinen Kurzhinweises:** Für die Ausgabesteuerung sinnvoll, aber **nicht als alleiniger Ersatz aller Questdaten im Kontext**. Vor allem I72 hat die Karte erst nach der erzählten Ankunft; außerdem sollen Clerkgespräche, gezielte Belohnungs-/Risikofragen und individuell besprochene Quests weiter auf denselben Fakten beruhen. Die Referenzdaten zu behalten ist kleiner und verlässlicher als neue Rückfrage-Erkennung oder einen separaten Questdetail-Retriever einzubauen. Erwarteter Nutzen ist hier kürzere **Ausgabe**, nicht bereits eine nachgewiesene Eingabetokenreduktion.

Ein globaler Narratorvertrag-Zusatz allein würde die konkrete widersprechende Actionanweisung bestehen lassen. Eine allgemeine Filterung von Questprosa nach der Generierung könnte sinnvolle Gespräche zerstören. Engine-only mit entfallendem Narrator würde die ausdrücklich gewünschten Atmosphäre-/NPC-/Reiseanteile verlieren. Diese Alternativen werden nicht gewählt.

### 3.3 Implementierung und Grenzen

1. In `HANDLERS['board.read']()` für `envx.c` die Aufforderung zum title-first-Katalog durch die obige knappe Aufgabenverteilung ersetzen. `rows` als Referenz erhalten; für andere historische Pfade keine beiläufige Textreform.
2. `ctx.boardShown`, Conditionals, `board.shown`, Generator/Repair, Karten/Details/Plaintextfallback und Questmechanik unverändert lassen. Erfolg-/Frischehinweise weiterhin aus `fresh` und den vorhandenen Ergebnissen ableiten.
3. Bei technischem Generatorausfall nicht behaupten, es gebe Karten. Die bestehenden frühen Fehler-/Registrierungs-/Ortsprüfungen bleiben maßgeblich.
4. Einzelauskunft bleibt ausdrücklich zulässig. Keine starre Satzanzahl oder generelles Verbot von Questtiteln: eine Rückfrage oder NPC-Empfehlung darf eine konkrete Quest benennen. Bloßes Anschauen akzeptiert weiterhin keinen Vertrag.

**Messziel nach Umsetzung:** bei einem natürlichen Boardturn Zahl gedoppelter vollständiger Questzeilen und gesamte Narrator-Completiontokens vergleichen; Atmosphäre/Dialog separat beurteilen. Der I72-Block zeigt ein erhebliches kürzbares Ausgabevolumen. Weder 1874 Zeichen in exakte Tokens umrechnen noch 828 Tokens als vollständig einsparbar ausgeben. Referenzzeilen bleiben Eingabe; daher keine fixe Kosten-/Latenzgarantie.

## 4. Änderung C – aktuelle Zustände vor älterer Szenenbeschreibung

### 4.1 C1 Titan: Awareness und Sichtkontakt ausdrücklich unterscheiden

**Originalzustand vor I82:** Titan `aware`, weiterhin lebend 97/224 HP nach der gebuchten Ambush-Lance; `scene.concealed = ['pc']`. Die Erzählung sagt „It had not found him yet“. Der spätere Extractorversuch, ihn wieder `unaware` zu setzen, wird abgewiesen.

**Tatsächlich geliefertes Paket in Request 114:** NPC-Karte **„awareness of Alaric: aware; Alaric is currently UNSEEN“**, früherer `ARRIVAL STEALTH — … SUCCESS … No further movement or attack was chosen`, Kampfstartbeschreibung **„target awareness: unaware -> true Ambush“** und `STATE NOW` mit HP/Turn, **ohne aktuelle Awareness**. Die Karte wurde nicht wegen Budget entfernt. `context.js:npcCard()` hängt den globalen Concealment-Satz ohne observerbezogene Einschränkung an. `stateNow()` nennt die aktuelle Awareness nicht. `host.js:turnBlock()` liefert zusätzlich die Korrekturen der vorherigen Antwort; die frühere Ankunftsbeobachtung ist zeitlich vor dem gerade ausgeführten Angriff einzuordnen.

`engine.js:persistCombat()` setzt alle beteiligten Nicht-PCs auf `aware`, löscht aber den globalen Concealmentmarker nicht. Die Engine benutzt Awareness für Kampf-/Ambushberechtigung; Sicht-/Identitätswissen ist nicht dasselbe. **Gegenbewertung zu Sol/GPT:** Der Versuch einer erneuten mechanischen Unaware-Buchung ist eindeutig falsch. Der einzelne Satz „not found“ ist bei gleichzeitigem UNSEEN jedoch nicht in jeder möglichen Lesart ein Beweis, dass der Titan nichts vom Angreifer weiß. Eine Korrektur darf daraus keinen garantierten Sichtkontakt, identifizierten Namen oder automatische Aufhebung von Stealth machen.

**Vorgesehener Eingriff nur in `src/context.js`:**

1. In der Kampfstartbeschreibung klar **ENTRY / BEFORE THE OPENING** kennzeichnen: das frühere `unaware` begründet den bereits verbuchten Hinterhalt, nicht den Endzustand.
2. In `stateNow()` die aktuelle observerbezogene Awareness für beteiligte, noch lebende Nicht-PCs aus `state.scene.awareness[id]` ergänzen. Bei `aware`: weiß vom Angreifer / die gebuchte Attacke hat ihn alarmiert; nicht weiter als ahnungslos oder erneut überraschbar darstellen. Präzisen Sichtkontakt nicht behaupten. Keine abwesenden Beobachter, unbekannten Werte oder zusätzlichen Kampfteilnehmer erfinden.
3. In `npcCard()` für einen aktuell kämpfenden `aware`-Beobachter den globalen Marker als **recorded concealment; does not override this observer's combat awareness** einordnen, statt uneingeschränkt „currently UNSEEN“ als dominierende Schlussfolgerung anzuhängen. Normale Nichtkampfszenen und tatsächlich `unaware`/`suspicious` gebliebene Beobachter behalten ihre jeweilige Lage.
4. In derselben aktuellen Bindungszeile klarstellen, dass frühere Arrival-Stealth-/Opening-Angaben die frühere Phase beschreiben. Keine Änderung an `turnBlock()` oder gespeicherten Korrekturen nötig.

Ein globales „nach jedem Angriff sehen ihn alle“ oder Löschen von `scene.concealed` wäre eine neue Awareness-/Stealthregel und wird verworfen. Gewünschte Prosa: Der Treffer alarmiert den Titan und er reagiert auf den Angreifer; die genaue Lokalisierung darf nur so präzise sein, wie Zustand und Szene sie tragen. Der Hinweis garantiert kein beliebiges Modellverhalten, macht die zwei Zeitebenen aber widerspruchsärmer.

### 4.2 C2 Siegel: aktuelle Freigabe auch bei späterem Gespräch liefern

**State in I52/I60/I66:** `run.floors[1].cleared = {turn:23, minute:1135, credit:'pc'}`; bekannter `sloping_worn_passage` ist Floor 2; `sealRefusal(state, passage)` liefert jeweils **null**. PC bleibt I52/I60 im Wardenraum, I66 in der Gilde. Kein Floor-2-Eintritt gebucht. Kein zusätzliches aktives Seal-/Slab-Feature gefunden.

Wichtig: `floors[1].sealed === true` bleibt bestehen. Das ist die **statische Guardian-Siegelregel**, nicht ein aktuelles „immer noch zu“. Die wirkliche Zulässigkeit berechnet `living.js:sealRefusal()` aus aktueller Etage/Clear und den bestehenden Ausnahmen. Dieses Specfeld nicht nach dem Sieg einfach auf false setzen.

**Gelieferte Informationen:**

- I52: Floor 1 `CLEARED this cycle`; zusätzlich `CLEARED NOW` mit der Manifestbeschreibung, dass Grave-light erlischt und Kreidelinien brechen. Kein eindeutiger Satz „Guardian-Siegel gibt Floor 2 jetzt frei“.
- I60: weiterhin `CLEARED`, aber der einmalige Manifesthinweis ist weg. ROOMS nennt den lokalen Rückweg, nicht den tieferen Zugang.
- I66: außerhalb des Dungeons kein geschützter aktueller Living-Floorstatus. Stattdessen kommen alte Texte aus offenen Threads/Fakten an: der Weg sei bis zum Fall des Guardians versiegelt, der Warden bewache die Slab. Diese historischen Sätze sind als Vorgeschichte plausibel, ersetzen aber keine aktuelle Freigabe. Nur `contextLines()` innerhalb des Dungeons zu ergänzen würde diesen Fall nicht lösen.

**Gewählte Lösung:** eine kleine zustandslose Access-Textfunktion in `src/v4/living.js`, aufgerufen von `src/context.js` für einen tatsächlich relevanten, bekannten Dungeon. Sie liest vorhandene Daten; sie bucht oder speichert nichts.

Konkreter Algorithmus:

1. Relevanz aus vorhandenen Quellen eingrenzen: aktueller Dungeon; andernfalls explizit genannter bekannter Dungeon bzw. bei einer Dungeonfrage die bereits ermittelte bekannte lokale Dungeonmenge (`nearDungeons`). Ein generisches „deeper levels of the dungeon“ ist nur bei eindeutiger Zuordnung zulässig; I66 besitzt diese. Kein permanenter Katalog aller entfernten Dungeons.
2. Nur bereits etablierte, dem PC bekannte Etagenverbindungen berücksichtigen (`roomKnown()`/bekannte Links und Etagenzuordnung). Verborgene tiefere Floors oder deren Gegner nicht aufdecken. Bei mehreren zulässigen Zielverbindungen nicht willkürlich einen eindeutigen Weg behaupten.
3. Für das bekannte Ziel die **bestehende `sealRefusal()`-Entscheidung** verwenden; Floorgrenzen/Ausnahmen nicht unabhängig neu formulieren. Für den freigegebenen Fall lautet die Aussage eng: „The guardian seal from floor 1 to the known floor-2 passage is released in the current cycle. Older descriptions of that seal as still binding are historical. This permits access; Alaric has not moved there.“ Eine sonstige etablierte Tür/Blockade wird dadurch nicht beseitigt und E-Rang-Gefahr nicht verharmlost.
4. Diesen aktuellen Hinweis an den bestehenden geschützten **`resolved`-Abschnitt** anhängen, nahe an der Ausgabeinstruktion, sowohl lokal als auch beim relevanten späteren Gespräch. Bei gesperrtem Weg entsprechend die aktuelle bestehende Ablehnung nennen; nach Reset neu ableiten. Keine zusätzliche Collection, persistente `open`-Flags oder Engineevents.
5. Der Status ist Narratorwissen über den vom PC erlebten Weltzustand. Er verleiht einem Clerk nicht automatisch persönliche Erinnerung oder Kenntnis. NPC-Wissensgrenzen und alte Thread-/Factevents bleiben bestehen; deren Reparatur ist ein anderer Auftrag.

**Bewertung:** GPTs Idee einer kleinen Zustandsklarstellung ist richtig, aber die Auslieferung muss für I66 außerhalb des Dungeons greifen. Ein bloßes globales „CLEARED means open“ wäre zu breit; ein Flip von `sealed` oder Löschen historischer Threads wäre fachlich falsch. Die neue Funktion darf die weiterhin gültige Freigabe melden, ohne einen direkten Weg aus einem beliebigen Raum oder eine erfolgte Ankunft zu behaupten.

### 4.3 Gemeinsamer Mechanismus, getrennte Fachlogik

Beide Hinweise nutzen den vorhandenen **geschützten Kontext / `resolved`** unmittelbar vor der Erzählung. C1 erweitert dessen bestehendes `STATE NOW`; C2 ergänzt dort einen kleinen aktuellen Zugangsstatus aus `living.js`. Kein allgemeines neues Konsistenzframework und kein weiterer Modellcall. Awareness und Dungeonzugang werden nicht in dieselbe mechanische Regel gepresst. Bestehende Budgetdiagnosen müssen die ergänzten Texte erfassen; keine pauschale Budgeterhöhung.

## 5. Implementierungsfolge, Regressionen und ST-Prüfung

Ein gemeinsamer fachlicher Patch genügt. Reihenfolge: Originalfixtures/Gegenfälle sichern → A und B → C1/C2 im bestehenden Kontextpfad → gezielte Tests → vorgeschriebene Produktabnahme. Keine automatische Buildnummer oder zusätzliche Patchserie aus diesem Dokument ableiten.

| Bereich | Konkrete Regressionen / Gegenfälle für die Implementierung |
|---|---|
| **A – Start/Bestand** | `patch_pc_start_stats.test.js`: echte Produktcontent-Ladung; Start 5 in den bisherigen Runtime-/Rulesetkombinationen; Warrior/Mage/Rogue mit 6/5, obigen HP/MP/Initiativen und vollständigen Startressourcen; Favored nicht doppelt; echte gespeicherte 7er-Events bleiben nach JSON-Fold/Reload und angefangener Erstellung unverändert; NPC-Baseline und bestehende Growth-Tests erhalten. Neue-Start-5-Assertion ist auf .159 rot. |
| **A – Erstkampf** | Original I19/I21/I23 als kontrollierte, feste Aktionsfolge; 7er-Kontrolle reproduziert Originalrecords/17 HP, 5er-Gegenfall stirbt wie oben. Der Test dokumentiert die bewusste Auswirkung und darf nicht durch einen unangekündigten Buff „repariert“ werden. Kein künstlicher Erfolgstest für jede Starterklasse. |
| **B – Ausgabeauftrag** | Board.read im Hall sowie GO+Board.read wie I71; Generator-Neuboard und Wiederlesen am selben Tag. Action enthält keine Aufforderung zum erneuten Katalog, Referenzdaten bleiben verfügbar, Frische-/Verfügbarkeitsregeln erhalten. Bestehende Karten enthalten unverändert alle fünf Angebote, Risiken/Belohnungen/Details; kein Accept-/Payout-Event beim Lesen. |
| **B – Bedingungen** | Conditional read ohne bestätigte Hallankunft zeigt keine Karte und bucht kein `board.shown`; bestätigte Ankunft zeigt fünf Karten. Keine erfundenen Karten bei Fehler/fehlender Registrierung/falschem Ort. Gezielte Nachfrage nach einer Quest bleibt erlaubt. Passend bestehende `fix157_ui_qol`-/Boardtests erweitern statt neues Boardsystem testen. |
| **C1** | Vor Hinterhalt `unaware` bleibt zulässig; nach Originalhit `aware` bei noch vorhandenem Concealment kommt die aktuelle Awareness verbindlich an. Aktueller Hinweis behauptet weder globalen Sichtkontakt noch zusätzlichen Angriff/Bewegung. Entry-Awareness zeitlich markiert. Abwesende/andere unbeteiligte `unaware`-Beobachter werden nicht umgeschrieben; keine UI-/HP-/Ambush-/Eventänderung. |
| **C2** | Vor Guardian verweigert bestehende Sperre; nach Originalclear eindeutige Freigabe in I52, weiterhin I60, sowie bei I66 außerhalb des Dungeons. PC-Ort/Floor bleibt unverändert. Reset im Zustandsklon setzt Sperrtext wieder korrekt; unbekannte/mehrdeutige Zugänge geben keine Spoiler/erfundenen Wege aus; unabhängige aktive Featureblockade bleibt erhalten. |
| **C – Transport** | Tatsächlicher `turnBlock()` bei Budget 1400 liefert die Hinweise auch mit den alten Thread-/Fact-/Stealthtexten. Kontextbau mutiert keine Events, Anwesenheit, Knowledge, Positionen oder Buchungen. Kurze zielbezogene User04-Snapshots verwenden; keinen ST-Vollserverlog in Produktfixtures kopieren. |

**Passende ST-Hostprüfung erst nach Implementierungsfreigabe:** vorhandenen echten ST1.19-C-Smoke (`tools/st_live/run_c.mjs`, Standard/Failsoft) um wenige passende Assertions bzw. eine kleine Szenenfolge erweitern. Er muss (a) Greeting → Klasse → Skills mit Basis 5 ohne Narrator-Menü, (b) GO+Boardread mit erst nach bestätigter Ankunft vorhandenen fünf Karten und unveränderten Details, (c) tatsächliche ausgehende Requestblöcke für aware-nach-Ambush und geöffnetes Siegel lokal sowie im Gildengespräch prüfen. Relevanten Reload/Swipe ohne doppelte Buchung mit vorhandenen Checks abdecken. Kein neuer langer Batch.

Ein geskripteter Provider beweist Host-/Kontext-/Darstellungsintegration, **nicht** die Zuverlässigkeit natürlicher Prosa. Das prüft anschließend der normale persönliche User-Test; keine Tokenersparnis oder vollständige Narratorkorrektheit aus dem Mock ableiten. Nach 01 gehören bei Umsetzung auch die aktuelle vollständige Node-Suite und Replay/Fingerprintprüfung zur abschließenden Abnahme. Der neue Start kann startgenerierende Fixtures betreffen; gespeicherte 7er-Events dürfen nicht rückwirkend verändert werden. Erwartete Text-/Startänderungen einzeln erklären statt alte Originalbelege oder alle Akzeptanzen pauschal umzuschreiben.

## 6. Umfang, Risiken und Freigabepunkt

**Voraussichtliche funktionale Produktdateien:** `content/campaign_start.json`, `src/v4/commands.js`, `src/context.js`, `src/v4/living.js`; dazu passende Tests, bei Bedarf kleine Originalfixtures, Produktpatchnote und spätere Kanon-/Statuspflege. `hud.js`, `host.js`, Kampfengine und Eventreducer sind nach diesem Plan nur Prüfstellen, keine vorgesehenen Umbauten. Falls die Umsetzung dort einen belegten notwendigen Eingriff findet, diesen konkret begründen.

Der größte Gameplayeffekt liegt bei A, der größte Kontextumfang innerhalb dieses kleinen Pakets bei C2. B und C senken eine konkrete Widerspruchswahrscheinlichkeit; sie garantieren kein fehlerfreies freies Sprachmodell. Keine XP-/Monster-/First-Strike-/Statprogressionsänderung, keine NPC-Witness-/Identitäts-/Presencekorrektur, keine gemischte Suche, Objektverbrauchs-/Questresetmechanik, PULSE oder Rastunterbrechung. Insbesondere keine Überlebensgarantie als verdeckte Nebenanforderung von Basis 5.

**Nächster Schritt:** unabhängiger GPT-Gegenreview dieses Plans; danach entscheidet der Nutzer über den gemeinsamen Implementierungsauftrag. Zur Abwägung liegt jetzt ausdrücklich der reproduzierte tödliche 5er-Erstkampf vor. Keine zusätzliche Mechanikentscheidung ist für die gewählte enge Lösung erforderlich, solange dieser härtere Start gewollt bleibt.

---

## 7. Unabhängiger GPT-Gegenreview – Abnahme des Fachplans mit C2-Präzisierung (07.11.2026)

**Urteil:** A, B und C1 sind mit der dokumentierten Abgrenzung **fachlich umsetzungsreif**; C2 ist **nach einer engen Präzisierung der Freigabeableitung umsetzungsreif**. Dies ist eine Planprüfung, keine Produktimplementierung und keine Nutzerfreigabe. Der bestehende Fachplan §§1–6 von Sol bleibt unverändert.

**Unabhängige Prüfbasis:** Sols vollständiger Fachplan, das neue `READ_ONLY_QOL_PLAN_PROBES.mjs` einschließlich seiner tatsächlichen Assertions, und die für den Eingriff maßgeblichen Funktionen des festgehaltenen Produktcommits `2089dcc`: `startCampaign`, `selectClass`, `selectSkills`, `deriveCharacter`, `board.read`, `playerActionsBlock`, `npcCard`, `stateNow`, `buildContext`/Abschnittsprioritäten, `living.contextLines`, `sealRefusal`, `floorRefusal`, `roomKnown` und `visited`. Die User04-Originalereignisse waren bereits im unabhängigen Originalreview §11 betrachtet. **Das neue Node-Probeskript und die ST-Requests habe ich in dieser Reviewrunde nicht nochmals selbst in einer ausführbaren Produktcheckout-Umgebung laufen lassen**; ihre berichteten Messwerte und die 7er-Recordgleichheit sind insoweit Sols Testergebnis, dessen Implementierung und Assertion-Logik ich nachgeprüft habe.

### 7.1 A – Basis 5: Empfehlung bestätigt, lethaler Einstiegsfall transparent

Der tatsächliche Startpfad kopiert nur `content.start.pc.stats` nach `campaign.started`; gespeicherte Events behalten ihre Stats. Das allgemeine `rules.json.human_baseline = 5` ist **keine zweite PC-Startregel**. Der Sechs-Literale-Schnitt und die beschriebene Altcampaign-Regel sind technisch plausibel.

Sols Gegenprobe ist in ihrem Aussageumfang richtig begrenzt: gleicher originaler Encounter L5/L4/L3, gleiche Spieleraktionen, geänderte Startwerte und daraus abgeleitete Ressourcen. **Basis 5 stirbt beim zweiten Angriffszug; Basis 7 reproduziert 17 Rest-HP.** Wesentlich ist auch die Initiativeverschiebung, nicht allein die Differenz von 10 HP. Das Skript prüft die echte 7er-Originalrecordgleichheit und die 5er-Abweichung über feste Assertions; es beweist **keine allgemeine Unspielbarkeit** von Basis 5 und auch nicht die Balance anderer Spielweisen.

**Empfehlung bleibt: Basis 5 wie gewünscht für neue Kampagnen übernehmen**, ohne versteckten Gegnermalus, First-Strike-Umbau oder globale XP-/Schadenskorrektur. Die bewusste Härte des untersuchten Level-1-gegen-L5/L4/L3-Kampfs und die verständliche Gefahrenkommunikation im späteren natürlichen User-Test beobachten. Falls normales, als sicher dargestelltes Starterspiel ebenso tödlich ausfällt, ist das ein **separates** Balancepaket. Die geplanten Altstart- und vollständigen Creation-Regressionsfälle sind erforderlich.

### 7.2 B – Board: konkrete Ursache bestätigt

In `commands.js:HANDLERS['board.read']()` verlangt die derzeitige `line` ausdrücklich die **vollständige title-first-Auflistung** der kanonischen `rows`. `context.js:playerActionsBlock()` übernimmt diese als erzählerische Handlungsanweisung. Daher liegt keine reine Modelllaune vor; Sols Vorschlag, direkt diese Ursprungsanweisung zu korrigieren, ist präziser als ein zusätzlicher globaler Narratorvertrag.

**Beibehalten:** Die fünf Questdaten bleiben der Narration als **Referenz** verfügbar, besonders bei bedingtem GO+Board-Read, dessen UI-Karten erst nach bestätigter Ankunft sichtbar werden. Die Enginekarten und die Questzustände bleiben die kanonische Ausgabe. **Abnehmen:** Eine gezielte spätere Frage nach einem einzelnen Auftrag oder ein echtes NPC-Gespräch darf weiterhin Details enthalten; nicht wahllos alle Questnamen aus der Prosa entfernen. Tokenersparnis nur für die tatsächlich gemessene Ausgabe beanspruchen, nicht automatisch für Eingabekontext oder Kosten.

### 7.3 C1 – Awareness: aktuelle Beobachterlage gegenüber altem Ambush-Kontext priorisieren

Die Unterscheidung ist fachlich notwendig: Die im alten Opening korrekt festgestellte Unkenntnis ermöglicht **diesen** Hinterhalt; danach ist der Titan mechanisch `aware`, während der globale `scene.concealed`-Marker nicht automatisch gelöscht wird. Awareness bedeutet nicht stets vollständigen visuellen Kontakt oder Namenskenntnis. Sols getrennte zeitliche Markierung und gegenwärtige `stateNow`-Angabe sind deshalb richtig.

**Kleiner Prüfschwerpunkt für die Umsetzung:** `npcCard` liegt bei laufendem Kampf als ausführliches `present` in einer **prioritätsabhängigen** Sektion, während `combat` und `resolved` verpflichtend sind. Die entscheidende aktuelle Awareness darf **nicht allein** von einer möglicherweise ausgelassenen NPC-Karte abhängen. Der geplante Einbau in `stateNow()` erfüllt dies, wenn die tatsächliche Auslieferung im User04-Kontext mit Budgetdiagnose nachgewiesen wird. Keine pauschale Concealment-Löschung oder Sichtkontakt-Erfindung.

### 7.4 C2 – konkrete notwendige Präzisierung von `sealRefusal()`

**Einziger fachlicher Korrekturpunkt zum Fachplan:** Die Aussage, eine `sealRefusal(state, target) === null`-Entscheidung sei bereits ein Beleg, dass **das Guardian-Siegel gelöst** wurde, wäre zu weit. Der Code erlaubt `null` in mehreren fachlich unterschiedlichen Situationen:

- `!above?.sealed`: Für die Verbindung existiert **gar keine** Guardian-Siegelregel.
- `x.run.floors[floor - 1]?.cleared`: Die vorherige Etage ist tatsächlich freigegeben.
- `s.places[to]?.visited`: Ein **vorher besuchter Raum** bleibt aus Kompatibilitätsgründen erreichbar, selbst wenn das aktuelle Siegel sonst blockieren würde.
- Die Funktion gibt ebenfalls `null` zurück, wenn der Ort/die Dungeonstruktur nicht zugeordnet ist; die vorgeschlagene Relevanzprüfung muss solche Fälle bereits ausgeschlossen haben.

**Anpassung vor der Implementierung:** Für den wörtlichen **RELEASED**-Hinweis mindestens explizit prüfen, dass (a) der konkrete Dungeon und seine zwei benachbarten Etagen existieren, (b) die obere Etage eine Guardian-Siegelregel `above.sealed` besitzt, (c) `x.run.floors[previous]?.cleared` im **aktuellen Cycle** tatsächlich gesetzt ist, (d) der konkrete bekannte Verbindungsweg ohne Spoiler referenziert werden darf und (e) `sealRefusal()` den Zugang nicht noch aus einem anderen Grund verweigert. `sealRefusal` bleibt die **maßgebliche Reise-/Blockadeprüfung**, aber nicht allein die semantische Begründung eines gelösten Guardian-Siegels.

**Zusätzliche rote Gegenfälle:** (1) früher besuchter unterer Raum bei nicht geclearter oberer Etage: `sealRefusal() === null` ist möglich, aber **kein** „Guardian seal released“; (2) ein regulär offener, nie versiegelter Etagenübergang: kein Text über ein angeblich gefallenes Siegel; (3) Reset mit unveränderter `floors[1].sealed`-Spezifikation und zurückgesetztem `cleared`: Status ist wieder korrekt gesperrt, ohne alte Weltfakten zu löschen.

Der in User04 belegte Fall mit tatsächlich gecleartem Floor 1 bleibt damit **positiv**: I52, I60 und I66 sollen die aktuelle Freigabe erfahren. Das gilt ausdrücklich auch beim späteren Gildengespräch außerhalb des Dungeons, ohne Clerk-Wissen zu erfinden oder Alaric still nach Floor 2 zu bewegen. Eine aktive separate Tür-/Featureblockade bleibt unverändert.

### 7.5 Umsetzungshinweise und Freigabe

Die geplanten vier funktionalen Produktdateien bleiben ausreichend, sofern sich in der konkreten Umsetzung keine neue belegte Abhängigkeit zeigt. Keine zusätzliche Enginezustandsbank, kein neuer Modellcall, keine globale Budgeterhöhung. **Priorität-0-Kontext darf bei C nicht unbemerkt weiter anschwellen:** User04 hatte schon vor diesen Hinweisen in vielen Erzählzügen verpflichtenden Budgetüberlauf. Bei der Abnahme reale Blocklängen und optionale Drops prüfen, den Text knapp halten und keine umfangreiche Dungeonchronik in den geschützten `resolved`-Abschnitt verlagern.

**GPT-Empfehlung:** Gemeinsame Umsetzung nach Nutzerfreigabe, mit dem einen C2-Hinweis bereits im Implementierungsauftrag. Die tödliche 5er-Gegenprobe ist transparent und bleibt akzeptierter Planungsbefund, **kein automatischer Anlass für einen Balancenerf**. Erst nach der tatsächlichen Umsetzung vollständige Node-/Replay- und passende ST-Host-Abnahme. Das Review selbst ändert keinen Produktcode und keine Spielregel.

## 8. Umsetzung nach Nutzerfreigabe – .160 (07.11.2026)

Die Gegenprüfung in §7 wurde bewertet und übernommen. Insbesondere begründet `sealRefusal() === null` allein keinen RELEASED-Hinweis: Der implementierte `guardianAccessLines()`-Pfad prüft zusätzlich die tatsächliche Guardian-Siegelregel, beide Etagen, den aktuellen Clear und eine bekannte begehbare Verbindung. Altbesuch, nie versiegelter Weg und Reset besitzen eigene Gegenfälle. Die übrigen Lösungen folgen dem begrenzten Plan; bestehende 7er-Starts bleiben erhalten, der tödliche 5er-Erstkampf wurde nicht durch Balanceänderungen ausgeglichen.

**Produktcommit:** [`16e7358`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/16e73581d470581982e2bc0bd6ff3d4379099be1). Die [Fachpatchnote](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/16e73581d470581982e2bc0bd6ff3d4379099be1/avereth-engine/docs/FIX160_USER04_GAMEPLAY_QOL.md) enthält die tatsächlichen Eingriffe, Regressionen, 38 einzeln nachgewiesenen Replayänderungen und die gemessenen Kontextgrößen. Abnahme: **24/24** gezielte und **2822/2822** vollständige Node-Tests; **2235** Replayfälle mit **517** exakten Akzeptanzen und **0 offen/veraltet**; echter ST1.19-Host **42/42 Standard, 47/47 Failsoft**, je **0 PageErrors**. Die fünf Kontextgegenproben erhöhen den geschätzten Umfang um 43–64 Tokens, ohne zusätzliche optionale Drops oder Budgeterhöhung. Keine natürliche Narrator-Befolgungsquote oder Kostenersparnis aus den geskripteten Smokes ableiten.

Als Nächstes unabhängiger Produkt-Diff-Gegenreview und natürlicher User-Test. Kein neuer Gesamt- oder NPC-/PULSE-Auftrag aus dieser Umsetzung.
