# Kampf: Hauptaktion und Nebenaktion – Analyse und technischer Fachplan

**Stand:** 28.10.2026. **Status: Planung, keine Produktimplementierung oder Testausführung.** Auftrag: Feedback bewerten, vollständigen technischen Weg vorbereiten; Umsetzung folgt als eigener Arbeitsabschnitt. Der parallel gestartete natürliche Vergleichsbatch bleibt auf seinem tatsächlich gestarteten Build.

**Geprüfte Codebasis:** Entwicklungsbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Build **4.3.0-c.6.6.104**, [Commit b9ffa2c](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/b9ffa2c1bfe7c6e00c760d5a115f9d53eec95016). `main` vor diesem Dokument: `10918bd`. Grundlage ist außerdem das Nutzerfeedback `Chatgpt Feedback(20261028-022433).md`. Das Feedback wird hier bewertet, nicht als unabhängiger Testnachweis ausgegeben.

## 1. Bewertung und vorgeschlagener Umfang

Die Idee ist sinnvoll: Ein ausdrücklich geeigneter Mobilitätsskill soll nicht immer den gesamten Angriffszug verdrängen. Dafür genügt die vorhandene Initiative-/Turn-/Eventarchitektur. Es ist aber **ein mittlerer Fachpatch mit mehreren eng verbundenen Integrationsstellen**, kein kleiner Planner-Komfortfix. Zahlen, Monsterstärken, XP, Starterwerte und Ausrüstung werden dadurch nicht nebenbei verändert.

| Feedback | Urteil und Konsequenz |
|---|---|
| Aktionsart ausdrücklich pro Skill festlegen | Übernehmen. Keine Ableitung aus `Utility`, `Defensive`, Name oder LLM-Einschätzung. |
| Blink, Evasive Step, Quickstep als erste Kandidaten | Übernehmen; vier konkrete Content-IDs, siehe unten. Kein neuer Skillbesitz. |
| Schutzwirkung nicht ungeprüft zusätzlich zum Angriff freigeben | Übernehmen. Mechanik zunächst mit aktuellen Werten vergleichen; diese sind noch kein bestätigtes neues Balanceoptimum. |
| Trainierte NPCs sollen dieselbe Aktionsökonomie haben | Übernehmen. Gleiche Berechtigung/Kosten, aber weiterhin eigene deterministische Taktikwahl und nur tatsächlich bekannte Skills. |
| Gesamtkosten vor Ausführung prüfen | Präzisieren: die ganze gewählte Phase privat in Reihenfolge auflösen und erst bei Erfolg übernehmen. Eine einfache Summe würde Kostenreduktion, Reihenfolge und echte Ressourcenwiederherstellung falsch behandeln. |
| Mehrere Kommandos in Spielerreihenfolge | Übernehmen. `seq` existiert bereits; kein neues Zwei-Aktionen-JSON vom Modell erforderlich. Eine kleine Richtungsergänzung ist dennoch nötig, siehe §4. |
| Dynamische Skills nicht automatisch umklassifizieren | Übernehmen. Bestehende Definitionen/Composer bleiben Hauptaktionen. |
| Natürlicher .104-Batch als Vergleichsbasis | Übernehmen. Der Batch und dessen deployte Engine bleiben während dieser Planung/Entwicklung unverändert; Implementierung und eigene Smokes in getrenntem Checkout/ST-Profil. |

**Gegenreview vom 28.10.2026 (`Chatgpt Feedback(20261028-024940).md`):** Die fünf Ergänzungen sind nach gezielter Codeprüfung übernommen: alle drei Kampfeinstiege (§4), keine erfundene Bewegungsrichtung (§4), sequentielles Staging bis zum tatsächlichen Kampfende (§5), Skillzählung getrennt von NPC-Phasensperre (§7) und defensive Doppelwirkung im Vergleich (§11). Zwei Präzisierungen zur Einordnung: `pending_combat` setzt `planContext().fight` bereits auf `true`; `false` ist vor allem für die offene Erstattacke relevant. Zwei verschiedene 25-%-Effekte reduzieren rechnerisch um 43,75 % **vor** weiteren Pipeline-Schritten, Rundung und Mindestschaden. Das Feedback ist kein zusätzlicher Testlauf.

Eine Entwicklung im getrennten Checkout kann wie vom Nutzer gewünscht parallel zum .104-Batch stattfinden; ein vollständiges Abwarten ist technisch nicht nötig. Der laufende Batch erhält jedoch weder einen neuen Engine-Deploy noch veränderte Spielerinstruktionen.

**Balancepräzisierung:** Blink ist technisch nicht wirkungslos, aber kein garantierter Sicherheitsgewinn: MEDIUM-Angriffe erreichen auch ENGAGED; es gibt keinen allgemeinen Fernkampfmalus im Nahkampf. Ein Nahkämpfer kann einen einzelnen Rückwärtsschritt oft mit seinem normalen Schritt ausgleichen. Evasive Step/Quickstep schützen zusätzlich gegen mehrere tatsächliche Treffer. Gleiche Aktionsbudgets für NPCs beweisen deshalb noch keine Klassenbalance; normale Tiere besitzen diese Skills nicht. Warrior ohne geeigneten Skill erhält zunächst nur die zusätzliche *Kapazität*, keine erfundene Nebenaktion.

### Vorgeschlagene feste Regeln der ersten Umsetzung

- Pro **eigenem normalen Turn**, nicht pro globaler Runde: höchstens **eine Hauptaktion + eine Nebenaktion + ein ausdrücklich autorisierter normaler Bewegungsschritt**. Kein Tausch einer ungenutzten Hauptaktion gegen eine zweite Nebenaktion.
- Die Reihenfolge der gewählten Aktionen bleibt erhalten. Kein automatisches Evasive Step, kein automatisch ergänzter Angriff. Eine Nebenaktion allein ist erlaubt, beendet aber diesen Turn; der freie Hauptplatz wird nicht für eine weitere Spielernachricht gespeichert.
- `mage.blink`, `rogue.evasive_step`, `duelist.evasive_step`, `ranger.quickstep` sind die ersten Nebenaktionskandidaten. Duelist/Ranger sind vorhandene Legacy-Content-IDs, keine wieder eingeführten Starterklassen. Regelstand 1 bleibt bei seiner bisherigen Ökonomie.
- Guard, Deflect, Ward, Focused Ward, Feint/Focus Aim, Heilung, Ressourcen-Skills, Tränke und offensive Items bleiben Hauptaktionen. Eine passende Hauptaktion kann mit einer ausdrücklich gewählten zulässigen Nebenaktion kombiniert werden; ihre sonstigen Einschränkungen bleiben bestehen.
- **Flee bleibt ein ganzer Turn.** Keine zusätzliche defensive Nebenaktion zur Flucht in diesem Patch. Bestehendes `coversFlight()` darf eine erklärte Flucht weiterhin vor bloß begleitender Deckungsprosa schützen.
- Normaler Schritt und ausdrückliche Skill-Repositionierung sind verschiedene Budgets: höchstens einmal normal ein Band, zusätzlich einmal das im gewählten Skill geschriebene Band. Kein zweiter normaler Schritt durch Kombination zweier Resolver. EXTRA-BAND-Angriffe behalten nur ihre ausdrücklich vorhandene Zusatzbewegung.
- Aktuelle Kosten und Effekte sind die Ausgangswerte der Vergleichsmessung, keine vorab beschlossenen Buff-/Nerfwerte. Insbesondere Blink zunächst weiter 8 MP/ein Band, Evasive Step 5 STA/25 %, Quickstep 5 STA/20 %.

## 2. Ist-Ablauf und tatsächliche Änderungsstellen

Quellbezüge dieses Abschnitts gelten für `.104`, nicht für den älteren Produktcode auf `main`.

| Übergang | Aktueller Code | Bedeutung für die Umsetzung |
|---|---|---|
| Sprache → Kommandos | `src/v4/planner.js`: `parsePlan()`, `guardCommands()` in `src/v4/agency.js`; `use_skill` hat `skill,target,quote`, separate `move` hat `dir,target,quote` | Mehrere Skills/`seq` bereits darstellbar. Schema kennt aber keine unabhängige Richtung eines Repositionsskills. |
| Kommandos → ein Intent | `mapPlan()` ab ca. 683, Auswahl ca. 775–854 | Erster Main gewinnt, alle weiteren werden NOT TAKEN. Ein `move` dient bei Angriff als normaler Schritt, bei Reposition zugleich als Skillrichtung. Das darf nicht doppelt gezählt werden. |
| Intent → Kampf | `src/engine.js`: `playerTurn()`, `storyTurn()`, `pcActionOf()` ca. 294 | Ein Intent wird auf ein einzelnes `pcAction` verengt. Unklare/abwesende Angriffsziele werden vor einer Buchung abgefangen. |
| Kampfstart/Teilnehmer | `combatTurn()` ca. 502–613, `caughtBy()`, `areaLegal()`, `materialise()` | Trial-Start existiert. Frische Ziele, Gruppen und AoE-Mitbetroffene werden heute anhand dieser einen Aktion vorbereitet. Ein Blink *vor* einem AoE verändert diese Voraussetzungen. |
| Eigener Turn | `src/combat.js`: `runCombat()` ca. 1247–1357 | Ein PC-Record, dann `endTurn()` und `advance()`; `pcActed` verhindert eine zweite PC-Aktion derselben Nachricht. Diese Schranke muss eine ganze Phase umfassen. |
| Einzelaktionen | `attackAction()`, `skillAction()`, `itemAction()`, `worldAction()`, `moveAction()` | Kosten, Schaden, Ammo, Bewegung, Effekte bereits implementiert. Wiederverwenden; keine zweite Schadenspipeline. |
| NPCs | `npcAct()` ca. 1009, `npcTactic()` ca. 1075 | Taktik ersetzt heute den Angriff. Höchstens drei taktische Einsätze/Kampf, keine zwei direkt hintereinander; bisher an einzelne Logrecords gekoppelt. |
| Wirkung/Dauer | `startTurn()`, `endTurn()`, `advance()` ca. 1133 | Effekte laufen an der Quelle ihres nächsten Turns ab. Nicht vor jedem Teil der neuen Phase erneut starten/ablaufen lassen. |
| Startsonderfälle | `initEncounter()` ca. 172, `runCombat()` Opening/First Strike | True Ambush ist ein zusätzlicher einzelner Angriff; First Strike ist bereits der verbrauchte Round-1-Turn (`enc.spent`). Das sind unterschiedliche Budgets. |
| Progression | `src/skills.js`: `noteUse()` ca. 332, `usePatterns()`, `fightProgress()`; `src/v4/skill_growth.js` | Jeder PC-Record löscht aktuell wartende Verteidigungs-/Antwortmarker. Zwei eigene Records würden sich gegenseitig Belege wegnehmen. |
| Persistenz | `persistCombat()` ca. 669, `encounter.started/updated/ended`, `src/state.js` | Der Encounter-Snapshot und Ressourcen werden bereits deterministisch gebucht. Kein Nebenaktions-Eventtyp und kein eigener Weltzustand erforderlich. |
| Anzeige/Kontext | `src/hud.js:combatHud()`, `display.js:optionsLine()/recordLines()`, `context.js:combatBlock()/recordLine()/skillSummary()` | Aktionstyp und tatsächlich ausgeführte Reihenfolge sichtbar machen. Keine Empfehlung als bereits ausgeführte Aktion erzählen. |

**Zusätzlicher belegter Integrationsbedarf:** `combatTurn()` spiegelt normale Bewegung zu Nichtkombattanten über den **ersten** passenden Record (`res.records.find(...)`); Skill-Repositionierung wird dort nicht allgemein als Bewegungsfolge behandelt. Mit zwei Aktionen wäre sowohl eine veraltete AoE-Auswahl als auch eine nur teilweise gespeicherte Szenenbewegung möglich. Deshalb muss die neue Phase *alle tatsächlich ausgeführten Bewegungen in Reihenfolge* berücksichtigen. Es genügt nicht, zwei `runCombat()`-Aufrufe zu verketten.

## 3. Kleiner Datenvertrag, Kompatibilität und Autorität

### Skillklassifikation

Das bestehende Feld **`activation`** verwenden: fehlend bzw. `action` = Hauptaktion; `minor_action` = ausdrücklich berechtigte Nebenaktion. Keine zusätzliche parallele Kategorie `Utility → minor`.

1. In `content/classes.json` ausschließlich die vier genannten statischen IDs mit `activation:'minor_action'` kennzeichnen; Kosten/Effekte zunächst nicht ändern.
2. `schemas/classes.schema.json` ist geschlossen und kennt `activation` bislang nicht: optionales Enum `action|minor_action` ergänzen. Contentprüfung muss die vier Markierungen und das Fehlen ungewollter offensiver/Item-Freigaben prüfen.
3. Eine kleine reine Slotfunktion in einem bestehenden Skillmodul verwenden, gemeinsam von Planner, Combat, HUD und NPC-Auswahl. Die Engine prüft die Berechtigung erneut; vom Planner gelieferte Slotangaben sind nicht autoritativ.
4. `skillDefErrors()` akzeptiert für dynamische Erwerbe weiterhin nur `activation:'action'`. Composer/Forge vergeben keine Nebenaktion und übernehmen sie nicht aus Tags oder einem ähnlichen Namen. Die vier Mobilitätsskills haben derzeit ohnehin keinen passenden Evolutionsschritt in `STEPS`; kein neuer Mobility-Composer in diesem Patch.

### Encountergebundene Regelversion

- Neue V4-C/Regelstand-2-Encounter erhalten einen kleinen Snapshotmarker, beispielsweise `action_economy:'main_minor_v1'`. In den `fixed.actions` der Charaktere die ermittelte Slotberechtigung als Snapshotmetadatum sichern; neue Eintragskopien bilden, nicht die von `actionsOf()` übernommenen Sheet-Skillobjekte verändern. Später beitretende Charaktere nutzen dieselbe Encounterpolicy.
- Ein gespeicherter laufender Encounter ohne Marker bleibt ein Ein-Aktions-Encounter bis zu seinem Ende. Neue Begegnungen einer vorhandenen Regelstand-2-Kampagne können die neue Regel verwenden. Regelstand 1 und der alte V3-/Interpreterpfad bleiben unverändert.
- Alte Events werden nicht neu ausgewürfelt oder umgeschrieben. `encounter.updated` speichert weiterhin den gesamten Snapshot; zusätzliche Felder sind rückwärtslesbar. `validateState()` prüft neue Marker/Slots nur, wenn sie vorhanden sind.
- Kein persistentes `minor_remaining`, kein Budget über mehrere Inputs, kein zweites Kampfsystem. Die Phase wird innerhalb eines Engineaufrufs abgeschlossen oder als abgelehnt zurückgegeben.

### Internes Phasenformat

Nur der deterministische Adapter baut etwa folgende interne Struktur; das LLM schreibt weiter einzelne Kommandos:

```js
{
  kind: 'combat_phase',
  steps: [
    { kind: 'attack', skill: 'rogue.razor_cut', target: 'mon.wolf_a' },
    { kind: 'skill', skill: 'rogue.evasive_step', dir: 'away', target: null }
  ]
}
```

Die Slotklasse kommt aus der Skilldefinition/Encounterbibliothek, nicht aus `steps`. Alte Einzelintents bleiben zulässig und werden auf dem neuen Pfad intern wie eine Phase mit einem Schritt behandelt. Keine Formatänderung an gespeicherten Altintents notwendig.

## 4. Planner und Bewegung eindeutig abbilden

1. Den bisherigen Einzelschritt-Mapper für Ziel-, Skill-, Item- und Handleprüfung als lokale wiederverwendbare Funktion herausziehen. Nicht `mapPlan()` rekursiv mehrfach aufrufen: dabei würden fremde Notes, freie Handlungsteile und Bewegungen erneut ausgewertet.
2. In ursprünglicher `seq`-Reihenfolge höchstens die erste Haupt- und erste berechtigte Nebenaktion wählen. Weitere Aktionen sichtbar NOT TAKEN melden; eine zweite Nebenaktion wird nicht zur Hauptaktion umgedeutet. Unbekannte Skills und mehrdeutige/abwesende Ziele der gewählten Schritte verweigern/klären die ganze PC-Phase, ohne Ersatzskill oder Ersatzziel.
3. **`use_skill.dir` optional ergänzen:** `closer|away|null`, nur bei einem tatsächlich repositionierenden Skill sinnvoll. In `FIELDS.use_skill` erlauben, über die vorhandene Nullable-Normalisierung fehlende Werte auf `null` setzen und geschlossen prüfen. Alte Antworten ohne Feld bleiben gültig. `target` ist bei Bewegung nur der ausdrückliche Fokus, kein heimliches Angriffsziel.
   Fehlend/`null` bleibt für alte Plannerantworten **syntaktisch** gültig, ist aber auf dem neuen Pfad keine Zustimmung zu einer Bewegung nach `away`. `skillAction()` und `mapPlan()` verwenden heute genau diesen Default. Für eine auszuführende Repositionierung muss die Richtung aus dem Skillkommando oder einer eindeutig dazugehörenden autorisierten Bewegungsangabe hervorgehen; andernfalls die gesamte gewählte PC-Phase vor Ausgaben mit `clarify` anhalten. „I use Blink“ allein berechtigt keinen Rückwärtssprung. Ein Zielwunsch wie „to safety“ ersetzt keine eindeutige Richtung/einen nötigen Fokus. Alte Encounter behalten ihre bisherige Semantik.
4. Prompt: Die Bewegung *durch Blink/Evasive Step/Quickstep* gehört zu diesem `use_skill` und dessen Richtung; dafür kein zusätzliches normales `move` erzeugen. Ein unabhängig erklärter gewöhnlicher Schritt bleibt ein eigenes Kommando mit eigener Quote und Position in `seq`.
5. Historische Antworten mit `move` als bloßer Richtung desselben Skills dürfen diesen Schritt genau einmal dem Skill zuordnen, wenn dieselbe verankerte Handlung eindeutig gemeint ist. Bei zwei unterschiedlichen möglichen Bewegungen klären; weder doppelt buchen noch aus einer langen Wortfilterliste eine zweite Bewegung erfinden.
6. Ein normaler Schritt ist ein eigener Phasenschritt oder wird **einmal** an den vorhandenen passenden Resolver gebunden. Nicht vorher `moveAction()` und anschließend nochmals `attackAction({move:'closer'})` ausführen. EXTRA-BAND bleibt die explizite Ausnahme des betreffenden Angriffs, kein Reset des normalen Budgets.
7. Repositionieren vor einem Angriff kann diesen erst legal machen; Rückzug nach einem Angriff darf dessen vorherige Reichweite nicht rückwirkend ungültig machen. Begrenzungen ENGAGED/LONG bleiben unverändert. Unterschiedliche Foki dürfen nicht heimlich alle Gegner verschieben.
8. Draußen bleibt ein isolierter Mobilitätsgebrauch im bisherigen World-Pfad. Eine explizite Kombinationsphase mit einem tatsächlich präsenten angegriffenen Ziel kann einen Kampf eröffnen; GO zu einem noch abwesenden Ziel berechtigt weiterhin keinen vorgezogenen Angriff.

**Drei Einstiegspfade gesondert erhalten und testen:**

- **Aktiver Encounter:** die ganze Phase über `pcActionOf()` bis zum aktuellen eigenen Turn transportieren, nicht auf deren erste Aktion verkürzen.
- **Offener First Strike aus der Szene:** `planContext().fight` darf hier `false` sein. Die Slotberechtigung folgt der Policy für den neu zu eröffnenden Encounter, nicht ausschließlich diesem Kontextflag. `storyTurn()` erkennt die tatsächliche Attacke innerhalb von `combat_phase.steps`; der erste Schritt kann Blink sein. Ziel/Skill des Angriffs für den bestehenden Trigger ableiten, aber die vollständige Phase für Trialstart und echten Start weiterreichen. Der alte Aufruf `pcAction:null` darf sie nicht verlieren. Kein zusätzliches persistentes „Primärziel“ neben den Schritten speichern.
- **`pending_combat`:** `isFight()` setzt bereits `fight:true`, auch ohne laufenden Encounter. Den bestehenden NPC-Trigger und dessen Initiative beibehalten, die vollständige PC-Phase als spätere eigene Deklaration weiterreichen. Ein früherer NPC-Angriff oder der Tod des PC darf durch die Kombination nicht ausgelöscht werden.

Diese Pfade bekommen jeweils eine positive Kombinationsregression und einen passenden Ablehnungsgegenfall. Nur ein Test innerhalb eines bereits laufenden Kampfes wäre keine ausreichende Adapterabnahme.

`PLANNER_VERSION` nicht allein wegen dieses abwärtskompatiblen optionalen Feldes ändern; die tatsächlichen Prompt-/Parseränderungen dokumentieren. Neue Schemafelder nur auf diesem gezielten Skillkommando, keine neue Commandfamilie oder LLM-Abfrage.

## 5. Atomare Auflösung, RNG und Teilnehmer

### Eine Phase, einmaliger Turnabschluss

In `combat.js` eine kleine Phasenauflösung um die bestehenden Einzelresolver legen. `runCombat()` ruft sie **einmal am aktuellen eigenen Turn** auf; anschließend einmal `endTurn()`/`advance()`. NPC-Phasen nutzen dieselbe Budget-/Ausführungsprüfung. `startTurn()` darf keine Wirkung zwischen Haupt- und Nebenaktion entfernen.

```text
anstehende fremde Turns nach bestehender Initiative ausführen
am eigenen Turn: Phase/Slots/Autorisierung prüfen
  privaten Encounter + erforderlichen Szenenstand + Dice(seed, n) vorbereiten
  gewählte Schritte in Reihenfolge auf der Kopie auflösen
  Kosten, Munition, Besitz, Ziele, Reichweite und Wirkung jedes Schritts prüfen
  bei illegalem Schritt: komplette eigene Phase verwerfen
  sonst: vorbereitete Änderungen/Records/RNG genau einmal übernehmen
eigener Turn endet einmal; danach bestehende Gegner-/Reaktionsschleife
```

**Ressourcenregel:** Eine strukturierte/autorisierte Phase wird in Spielerreihenfolge bis zum tatsächlichen Kampfende geprüft und aufgelöst; kein pauschales Reservieren aller später genannten Kosten vor Schritt 1. Summe der tatsächlich ausgeführten Kosten darf die verfügbaren Ressourcen nicht überschreiten. Bereits der erste Schritt kann eine Ressource ändern; eine Engine-geprüfte Wiederherstellung vor dem zweiten Skill darf berücksichtigt werden. Kein Geld-/Quest-/Erzählversprechen finanziert einen Skill. Scheitert Schritt 2, gibt es auch keinen heimlich schon bezahlten oder gewürfelten Schritt 1.

Die Kopie muss einen konsistenten Stand besitzen: insbesondere `staged.state.encounter` und `staged.enc` müssen auf denselben aktuellen Encounter zeigen, weil die vorhandenen Szenenhelfer teilweise über den State lesen. Neue Dice-Logs an die bereits real angefallenen Logs anhängen; Trial-Logs nie zusätzlich übernehmen.

Die private Auflösung ist die tatsächliche einmalige Berechnung, kein zweiter Kampf mit anschließend erneut gewürfelten Ergebnissen. Übernommen werden Snapshotänderungen, vorbereitete Events, Records sowie genau der benutzte RNG-Cursor **und** dessen Logs. Verworfenes Staging darf keinen RNG-Fortschritt, Initiativewurf, Ammo- oder PP-Beleg hinterlassen. Bestehende Trial-Starts/`areaLegal()` bleiben rein und dürfen keine Provideraufrufe auslösen.

**Vorher tatsächlich ausgeführte NPC-Turns werden nicht zurückgerollt.** Wenn ein NPC zuerst angreift und danach die PC-Phase mangels STA scheitert, bleibt der NPC-Angriff gültig. Der PC-Turn wartet unverbraucht; das gewöhnliche Speichern des Spielerinputs/Outcomes ist dadurch nicht verboten. Systemtexte müssen zwischen „keine PC-Aktion verbucht“ und „überhaupt nichts passiert“ unterscheiden. Bei einem von Anfang an unmöglichen PC-Kampfstart gilt weiter: kein neuer Kampf, keine Materialisierung oder Ausgaben.

### AoE, neue Ziele und Szenenpositionen

Das ist die wichtigste Engine-/Combat-Verbindung des Fachpatches:

- Alle Teilnehmerprüfungen müssen die Position **im Moment des Angriffs** verwenden, nicht stets die Eingangsposition der ganzen Nachricht.
- `caughtBy()`, `areaLegal()`, `burstOf()`, `groupJoiners()` und `materialise()` bleiben zuständig. Ihre Vorbereitung für eine gewählte Attacke wird bei Bedarf am betreffenden Phasenschritt gegen den gestagten Stand ausgeführt. Dafür reicht ein eng begrenzter Vorbereitungsaufruf vom Combat-Schritt in die bestehende Engine-Orchestrierung; kein generischer Eventbus oder neues Spawnmodul.
- Staging umfasst auch diese Materialisierungs-/Definitions-/Join-Ereignisse. Erst bei gültiger Phase an den bestehenden `emit` übergeben, in gültiger Reihenfolge (`skill.defined` vor `entity.sheet_set` vor Encounter-Snapshot). Eine abgelehnte Kombination zieht keine neuen Gegner in den Kampf.
- Bewegungen auf der Kopie ändern sowohl die Kampfpositionen als auch die relevanten Beziehungen zu tatsächlich präsenten Nichtkombattanten. Nichtkombattanten werden dadurch nicht automatisch zu Gegnern. Nur die bisher gültige AoE-/Angriffs-/Gruppenregel kann sie hinzufügen.
- Die bisherige Suche nach dem ersten Bewegungsrecord durch Auswertung aller ausgeführten Bewegungen in Reihenfolge ersetzen; explizite `scene.position`-Änderungen genau einmal übernehmen. Ein Fokus auf Wolf A bewegt Wolf B nicht ohne passende Regel.
- Testpflicht: Blink vor Arcane Burst, Arcane Burst vor Blink, normaler Schritt plus Minor, außerhalb stehender ENGAGED-Begleiter, neutrale Person und ein wegen Kosten verworfener AoE. Dieselben Teilnehmer müssen im Trial, echten Snapshot und nach Fold vorliegen.

Das isolierte Verketten zweier `runCombat()`-Aufrufe wird verworfen: es würde Initiative, Gegnerantworten und Effektablauf zwischen die Spieleraktionen schieben.

### Ende der Phase

**Die beiden Fälle sind ausdrücklich verschieden:**

1. Eine legale Hauptattacke beendet den Kampf tatsächlich; für den nachfolgenden bekannten Blink fehlt MP. Die Attacke samt RNG/Abschluss bleibt gültig. Blink wird als wegen Kampfende nicht ausgeführt markiert; seine Laufzeitvoraussetzungen und Kosten müssen nicht mehr erfüllt sein.
2. Der Gegner überlebt; derselbe nachfolgende Blink scheitert an MP, Reichweite oder einer anderen noch relevanten Ausführungsbedingung. Die ganze eigene Phase wird verworfen, einschließlich Hauptattacke, ihrer Kosten, HP-Änderung, RNG und Belegen. Bereits vorher geschehene fremde Turns bleiben wie oben beschrieben bestehen.

Syntax, Spielerautorisierung und Slotbegrenzungen bleiben vorgelagerte Prüfungen; eine bloß erwartete Tötung legitimiert weder erfundene Skills noch unautorisierte Folgeschritte. Laufzeitbedingungen nach einem **tatsächlich** terminalen Schritt werden dagegen nicht weiter ausgewertet. Richtungsklärung findet vor der Phase statt; ihre Auslassung ist kein Ersatz für bestätigtes Kampfende.

Ist der Kampf nach einem Schritt tatsächlich beendet, folgen keine weiteren Kosten oder Aktionen aus der Nachricht. Ein nach dem letzten Kill geplanter Blink wird ausdrücklich als nicht mehr ausgeführt ausgewiesen. Bestehende fällige Reaktionen neutraler/verbündeter Getroffener (`reactionsDue()`) sind dabei zu berücksichtigen; `terminal()` allein darf eine noch geschuldete Reaktion nicht verschwinden lassen. Nach dem endgültigen Abschluss keine automatische Ersatzattacke oder Übertragung des freien Slots in die Weltphase.

## 6. First Strike, Ambush und Wirkungslaufzeit

| Situation | Geplanter Umgang |
|---|---|
| Normaler eigener Turn | Ganze gewählte Phase; genau ein Start, Ende und Initiativefortschritt. |
| Offener First Strike | Die zulässige vollständige Phase des Angreifers kann den Kampf eröffnen. Sie ist dessen Round-1-Turn; `enc.spent` überspringt **diesen ganzen Turn** einmal. Kein weiterer Main/Minor bei seiner Round-1-Position. |
| True Ambush Opening | Weiterhin **genau eine eröffnende Attacke**, mit bestehendem Critical-Verfahren; kein zusätzliches Minorbudget in Runde 0. |
| Explizite Kombination bei True Ambush | Erste Umsetzung: Kombination vor Ausgaben mit klarem Hinweis zurückweisen; weder Blink wegwerfen und trotzdem angreifen noch automatisch auf den Ambushbonus verzichten. Einzelne Opening-Attacke bleibt möglich, Kombination am folgenden normalen Turn. Diese bewusste Umfangsgrenze vermeidet zwei kostenlose volle Phasen. |
| NPC-Ambush, Gegnerzüge vor PC | Bisheriger Ablauf bleibt; PC-Eingabe löscht kein bereits zugesagtes Ereignis. NPCs bekommen ebenfalls keine freie Minor im zusätzlichen Ambush-Angriff. |
| Spätes Hinzukommen/Reaktion | Kein zusätzlicher eigener Zug durch zwei Records; vorhandene Join-/`spent`-Regeln weiterverwenden. |

Effekte aus beiden Aktionen werden bis zum bestehenden Ablaufzeitpunkt behalten. `start_of_source_next_turn` bedeutet den nächsten tatsächlichen Turn dieser Quelle, nicht die nächste Aktion oder eine beliebige neue globale Runde. First-Strike-Effekte dürfen nicht beim nur übersprungenen Round-1-Platz verschwinden. Alte Einzel-Opening-Effekte behalten ihren bisherigen Ablauf. Angriff → Evasion und Evasion → Angriff müssen beide ihre jeweiligen Schutz-/Angriffsbelege behalten.

Die Ambush-Kombinationsgrenze ist ein gezielter Erstumfang, kein neuer Kampfmodus. Falls später auch Runde 0 eine volle Phase erlauben soll, ist das eine zusätzliche Balanceentscheidung und gehört nicht still in diesen Patch.

## 7. NPC-Taktik und Proficiency gezielt anpassen

### NPCs

- `npcTactic()` trennt Auswahl einer Haupttaktik von einer zulässigen Minorergänzung. Creature-Naturangriffe und Zivilisten bekommen keinen Skill und keine zusätzlichen Würfe.
- Vorhandene Haupttaktik bleibt Hauptaktion und ersetzt den Angriff. Eine tatsächlich bekannte Minor kann nur in einem passenden normalen Angriffs-/Haupttaktikturn ergänzt werden; `flee`, `retreat`, `surrender`, `hold`/Cover werden nicht ungefragt durch Angriffskombinationen ersetzt.
- Evasive/Quickstep: zunächst vorhandene konkrete Bedrohungsheuristik verwenden (seit letztem eigenen Turn getroffen, höchstens 75 % HP, keine entsprechende eigene Schutzwirkung). Bei legalem Angriff ist Angriff → Minor ein geeigneter deterministischer Standard; keine zufällige Kombination und kein jederzeitiger Dauerspam.
- Blink nur bei einem konkreten Reichweitenvorteil wählen, nicht weil der freie Slot existiert: beispielsweise nach einem legalen Fernangriff aus SHORT auf MEDIUM gegen den zuvor beobachteten Nahkampfangriff. Ein bloßes ENGAGED→SHORT, das der Gegner direkt wieder schließen kann, begründet allein keine taktische Priorität. Kein neues Verfolgungssystem und kein Wissen über unbekannte PC-Skills.
- **Zwei getrennte Zählregeln:** `NPC_TACTICS_PER_FIGHT = 3` zählt tatsächlich ausgeführte taktische Nichtangriffs-Skills, nicht Phasen und nicht sämtliche Angriffsskills. Guard + Evasive Step verbraucht zwei Einsätze, ein Angriff + Evasive Step einen. Zurückgewiesene oder nach Kampfende übersprungene Teile verbrauchen keinen. Zähler erst bei erfolgreicher Phasenübernahme erhöhen.
- „Nicht an zwei aufeinanderfolgenden eigenen Phasen“ bleibt zusätzlich eine **Phasensperre**: mindestens ein taktischer Einsatz markiert die ganze Phase; ihr nachfolgender Angriffsrecord hebt das nicht auf. Den letzten eigenen Phasenbezug aus den vorhandenen Records auswerten, kein zweites KI-Zustandssystem.
- Vor Auswahl einer Kombination das verbleibende Taktikbudget reservieren: bei nur einem verbleibenden Einsatz nicht Guard + Evasion wählen, sondern die nach bestehender Priorität passende Einzel-Haupttaktik oder Angriff + Minor. Die konkrete Auswahl bleibt deterministisch. Diese KI-Entscheidungsgrenzen ändern die allgemeine mechanische Slotkapazität nicht.
- Reicht das Budget nicht für die Kombination, entscheidet die NPC-Auswahl **vorab** für einen legalen Einzelangriff oder die bisherige Taktik. Sie verändert keine schon erklärte PC-Aktion. Gleiche legale Phase ergibt für PC und NPC dieselben Kosten/Effekte.

### PP und Entwicklungsmuster

`noteUse()` muss auf dem neuen Pfad zwischen **Phasenbeginn** und **einzelnem Aktionsrecord** unterscheiden. Der aktuelle pauschale Reset bei jedem PC-Record ist ungeeignet:

- Verteidigungsnachweise nach Evasion → Angriff dürfen nicht durch den Angriff gelöscht werden; Angriffsnachweise nach Angriff → Evasion nicht durch Evasion.
- In einer Phase können zwei echte Schutzskills wirken (z. B. Guard + Evasion). Kleine begrenzte Mengen wartender Skill-IDs innerhalb des bestehenden `enc.pp` reichen; kein neues kampfübergreifendes Belegsystem.
- Ein eingehender echter gegnerischer Angriff löst die vorhandene Bedeutungskontrolle für die tatsächlich wartenden Verteidigungen aus. Abgelehnte, übersprungene oder nur erzählte Aktionen erzeugen keinen Beleg.
- PP bleiben höchstens einmal je Skill/Kampf, nach derselben Challenge-Prüfung am Ende. Anzahl der Aktionen ist kein zusätzlicher PP-Multiplikator.
- Die bisherige Paarentwicklung aus Skills aufeinanderfolgender eigener Turns wird nicht ungefragt in „jede Main+Minor-Kombination erzeugt neue Entwicklung“ umgedeutet. Phasengrenze für `pp.last/pairs` erhalten; bei einem Minor-only-Turn dessen tatsächlichen Skill berücksichtigen. `answer/guarding` müssen in derselben Phase nebeneinander bestehen können.
- Alte Encounter-/PP-Snapshots bleiben lesbar. Nur der markierte neue Pfad verwendet die Phasengruppierung; keine Änderungen bereits vergebener PP, LP oder Entwicklungshistorien.

## 8. Events, UI, Regeln und Runner

- Einzelne bestehende Attack-/Skill-/Move-/Item-Records beibehalten. Für neue Phasen optional `action_slot` und einen deterministischen Phasenbezug ergänzen; beide Skillrecords gehören zu demselben eigenen Turn. Kein neuer Ereignistyp, keine aus der Recordanzahl abgeleitete zusätzliche Runde.
- `usedUp()` nur für tatsächlich ausgeführte Item-Mains, genau einmal. `endEncounterEvents()`, XP, Loot, Guild-Tally und Auszahlung bleiben bei ihrem bisherigen einmaligen Abschluss.
- `src/hud.js` und `display.js`: wirksame Haupt-/Nebenaktionsklasse und Kosten anzeigen; ein kurzer Hinweis auf höchstens Main+Minor+normalen Schritt reicht. Keine exhaustive Liste aller Kombinationen. Das gilt auch bei einer noch alten Ein-Aktions-Begegnung: deren Snapshotregel anzeigen.
- `context.js`: genaue aufgelöste Reihenfolge, abgelehnte/übersprungene Teile und tatsächliche Bewegung. Zwei Aktionen sind keine zwei eigenen Turns und keine Einladung für zusätzliche Narrator-Attacken.
- `#skill/#skills` müssen die Klassifikation konsistent zum aktiven Encounter bzw. künftigen neuen Kampf zeigen. `skillSummary()` nicht blind globale Contentwerte als aktuell nutzbaren Slot ausgeben lassen.
- `content/rules_text.json`: vorhandenen Mechanismus `ruleset/replaces` für gezielte Regelstand-2-Ergänzungen zu Core 12/24 nutzen; Regelstand-1-Texte unverändert. Im Engineblock hat die konkrete aktive Encounterpolicy Vorrang, auch bei älteren R2-Snapshots. Keine vollständige Kopie des Core-Regelwerks.
- V4-Narrator-Vertrag nur kurz präzisieren und bei tatsächlicher Änderung Revision erhöhen: ausgeführte Haupt-/Nebenaktion in Reihenfolge, kein freier weiterer Skill. Aktuell ist die Karte Revision **.85**, Produktbuild **.104**; die Versionsnummern sind nicht gleichzusetzen. Bei Umsetzung die persönlich verwendete Karte und isolierte Smoke-Karte nachvollziehbar aktualisieren; V3-Vertrag beibehalten.
- Testspieler später genau einen Bedienhinweis geben: eine im HUD erlaubte Nebenaktion darf ausdrücklich mit einer Hauptaktion kombiniert werden, Systemresultat prüfen. Keine bestimmte Skillwahl, keine Pflicht zu Evasion, keine Änderung der drei Guildprofile oder des laufenden Batchprompts.
- Provider-Budgets, Extractor-Schema, World-/Quest-/Handelsautorität und Narrator-Recovery werden nicht geändert. Der Extractor erfindet keine zweite Kampfaktion und bucht keinen Kampfschaden.

## 9. Umsetzungsschritte und betroffene Dateien

Ein zusammenhängender Produktpatch; die Schritte sind Arbeitsreihenfolge, keine neue Mikro-Patchserie.

| Schritt | Dateien/Funktionen | Konkretes Ergebnis |
|---|---|---|
| 1. Baseline und rote Fälle | Neue gezielte Combat-/Planner-Integrationstests; wiederverwendete Batch-3-Rogue-Situation | Auf `.104` zeigen, dass die zweite zulässige Aktion verloren geht; grüne Kontrollen zu Überbudget, Legacy und Einzelschritt beibehalten. |
| 2. Klassifikation/Snapshot | `content/classes.json`, `schemas/classes.schema.json`, Slothelper in `src/skills.js`, `characterCombatant/initEncounter/addCombatant`, `validateState()` | Geschlossene Minorberechtigung, neuer Encounter-Marker, keine Altdefinition umklassifiziert. |
| 3. Reine Phase | `src/combat.js`: Einzelresolver, `runCombat`, `start/endTurn` | Staging/RNG und Budget einer eigenen Phase; bestehender Einzelschrittpfad bleibt Kontrollreferenz. |
| 4. Engine-Orchestrierung | `src/engine.js`: `pcActionOf/storyTurn/combatTurn`, Trialstart, `caughtBy/areaLegal`, Bewegungsspiegelung, Persistenz | Aktuelle Teilnehmer/Positionen für jeden Schritt, keine Phantomjoins oder Teilcommits. |
| 5. Planner-Anbindung | `src/v4/planner.js`: `FIELDS/NULLABLE/parsePlan/mapPlan`, Katalog und kurze Regeln; Agency nur falls nachweislich nötig | Optionale Skillrichtung, geordnete Main/Minor-Auswahl, bisherige Ziel-/Eigentums-/Quoteprüfungen erhalten. |
| 6. NPC und PP | `npcAct/npcTactic`, `src/skills.js:noteUse/usePatterns`, gezielt `skill_growth.js` | Gleiche mechanische Slots, begrenzte KI-Policy, Phasen statt Recordreset als Nachweisgrenze. |
| 7. Sichtbarkeit/Vertrag | HUD, Display, Context, Regeln und V4-Karte; danach ein Runnerhinweis | Erkennbare Aktionsklasse und Ergebnis; keine neue natürliche Teststrategie. |
| 8. Vergleich und Abnahme | bestehender `tools/sim/combat.mjs`, zugehörige Tests, gezielter ST-Smoke | Tatsächliche Balance-/Replaybelege, voller Node-/Hostabschluss, kritischer Diffreview. |

Bei der Umsetzung keine Buildnummer vorab als bestanden ausgeben. Die nächste freie Buildnummer vom dann aktuellen HEAD nehmen, Produktpatch auf Dev, eine passende technische Patchnote; `main` nur mit entscheidungs-/statusrelevanten Kurzverweisen aktualisieren.

## 10. Rot-/Grün-Regressionen und Gegenfälle

Die folgenden Fälle sind **zu schreiben und auszuführen**. Dieser Plan behauptet keine neuen grünen Tests oder simulierten Siege.

| Gruppe | Muss nach Umsetzung funktionieren | Unverzichtbarer Gegenfall |
|---|---|---|
| Parser/Agency | Razor Cut → Evasive; Blink näher → Bolt; umgekehrte Reihenfolge; Richtung ohne separaten normalen Schritt | „I use Blink“ ohne Richtung klärt, statt `away` zu buchen; widersprüchliche Richtung oder doppelt beschriebene Bewegung ebenfalls. Wunsch, Frage, fremder Akteur und späterer Plan geben keine Minor. Keine Ersatzhandlung. |
| Budgets | Main+Minor, Minor-only, expliziter normaler Schritt+Main+Minor | Zwei Angriffe, zwei Minors, doppeltes normales Move, Item als Minor, Flee+Minor nicht zulassen. Sichtbarer NOT-TAKEN-Hinweis. |
| Kosten/Staging | Effektive Kosten beider Skills, Proficiency/Passive-Rundung, getrennte MP/STA | Genug für Skill 1, zu wenig für Skill 2: keine PC-Änderung/RNG/PP; vorherige echte NPC-Aktion bleibt. Trank erst dann verbraucht, wenn gewählte Phase gültig. |
| Position/Reichweite | Neue Reichweite nach vorherigem Blink; Angriff vor Rückzug; explizites EXTRA-BAND | Keine doppelte Bewegung, keine heimliche Wahl eines anderen Fokus; LONG/ENGAGED-Grenzen, voller Sichtschutz und ungültiges Ziel erhalten. |
| Teilnehmer/AoE | Blink → Burst mit präsenten Außenstehenden; Burst → Blink; enges Gruppenmitglied tritt einmal bei | Verweigerte Phase materialisiert niemanden, kein Gegner aus anderem Ort, kein Doppeljoin, keine pauschale Feindmarkierung neutraler Getroffener. |
| Turn/Effekte | Beide eigenen Aktionen vor nächstem Gegner; Schutz bis nächstem tatsächlichen Quellturn | Kein NPC-Turn zwischen den beiden Aktionen, kein doppeltes `advance`, kein vorzeitiger Ablauf am übersprungenen First-Strike-Platz. |
| Start/Ende | Aktiver Encounter, offene Erstattacke bei `fight:false` und `pending_combat` getrennt mit kompletter Phase; First Strike verbraucht ganzen Round-1-Turn; einzelner Ambush wie bisher | Ambush-Kombination abweisen. Tödliche Main + unbezahlbarer nachfolgender Blink: Main gültig, Blink ungenutzt; nicht tödliche Main + unbezahlbarer Blink: eigene Phase komplett verworfen. Fällige neutrale Reaktion bleibt. |
| NPC | Bekannter Minor+legaler Main, gleiche Kosten/Bewegung; Guard+Evasion zählt zwei Taktiken, Angriff+Evasion eine | Bei Restbudget eins keine zwei Taktiken; verworfene/übersprungene Aktion zählt null. Keine Taktik in der direkt folgenden eigenen Phase, auch wenn der letzte eigene Record Angriff war; kein geschenkter Skill. |
| PP/Entwicklung | Beide Reihenfolgen erhalten bedeutsame Angriffs-/Schutzbelege; gleiche PP je Skill/Kampf wie bisher | Kein PP-Multiplikator, kein Beleg aus Trial/Refusal, keine neuen Paarangebote allein durch zusätzlichen Record derselben Phase. |
| Persistenz/Legacy | Fold serialisierter Events, Reload vor/nach Phase, Swipe/Regenerate, alte PP-Form | Gleicher Seed → gleiche Events/RNG; keine doppelten Kosten/XP/Loot/Items; aktiver Altencounter und R1 bleiben Ein-Aktions-Fälle. |
| Anzeige/Host | HUD/Planner/Narrator zeigen echte Slots, Reihenfolge und Nichtausführung | Keine Doppelattacke aus Prosa, keine zusätzliche Narrator-/Extractor-Anfrage, kein ungültiger Vertragsstand. |

Als gezielte Testdateien genügen eine Combat-/Engine-Datei und eine Planner-/UI-Datei; bestehende Start-, AoE-, Item-, NPC-, Ownership-, 9B-/9C- und Runtime-Suiten wiederverwenden. Keine Kopie sämtlicher früherer Regressionen und keine Testflut für bloß andere Skillnamen.

## 11. Balancevergleich vor Freigabe

Den vorhandenen Simulator erweitern, statt eine zweite Simulationsengine zu bauen. `choose()` kennt bisher nur einzelne Basic/Skill/Defense/Resource-Aktionen und testet sie unmittelbar mit Einzelresolvern; damit würde es die neue Mechanik nicht ausnutzen und falsche Vergleiche liefern. Auswahl künftig gegen dieselbe reine Phasenprüfung testen; Auswahl selbst darf weder Zustand noch RNG verändern.

**Vergleichsaufbau:** feste dokumentierte Seeds/Startzustände, gleiche echte Gearwerte/Skillstände/Gegner; Referenzlauf unter altem Budget und neuer Lauf mit ausdrücklicher Minorpolitik. Gespiegelte PC/NPC-Duelle und Kämpfe gegen unveränderte echte Monstergruppen. Level 1/5/10, P1 und ein höherer tatsächlich zulässiger Proficiency-Vergleich, ENGAGED/SHORT/MEDIUM; je ein Nah- und Fernkampfgegner sowie zwei/vier Gegner. Eine überschaubare reproduzierbare Matrix genügt, keine neue allgemeine Balanceplattform.

**Messen:** Sieg/Tod/Flucht/Abbruch, gegnerische und eigene Phasen, HP-Verlust, effektive Kosten/Restressourcen, Minor-Nutzung, tatsächlich vermiedener Schaden/Distanzvorteil. Damage-Reduction-Rundung pro Treffer und tatsächliche gegnerische Reichweite berücksichtigen. Nicht aus einem gewonnenen Duell auf alle Klassen schließen.

**Prüffragen:**

- Wird Evasion+Angriff zur fast immer dominanten Rogue-Lösung, und liegt der Gewinn an Bewegung, Schadensreduktion oder beidem?
- Hat Blink neben normaler Bewegung realen Nutzen oder verbraucht es nur MP? Verändert der Nutzen sich bei mehreren Gegnern/aus SHORT?
- Bleiben Guard/Deflect/Ward als Hauptaktionen in Situationen sinnvoll, oder verdrängt die günstigere Minor sie unverhältnismäßig? Kein automatischer Buff dieser Skills als Ausgleich.
- **Defensive Kombinationen ausdrücklich vergleichen:** Deflect + Evasive Step sowie Guard + Evasive Step, jeweils gegen die Einzelaktionen und Angriff + Evasion, auch bei zwei/vier Gegnern. Deflect + Evasion wendet zwei verschieden benannte 25-%-Effekte nacheinander an: `0,75 × 0,75 = 0,5625`, also 43,75 % rechnerische Reduktion vor Rundung/Mindestschaden. Guard erhöht dagegen zuvor DEF; nicht als weitere pauschale Prozentreduktion rechnen. Jede Kombination verbraucht weiterhin die Hauptaktion, verursacht selbst keinen Angriff und kostet beide Skills. Nur mit tatsächlich bekannten Fähigkeiten prüfen; keine allgemeine klassenübergreifende Freischaltung. Unterdrückten Schaden, Überlebensgewinn **und** verlorenen eigenen Schaden pro Phase ausweisen. Kein neues Stacking-Cap ohne Messergebnis.
- Wie stark verschiebt sich Warrior ohne Minor gegenüber Mage/Rogue, und wie wirken trainierte Gegner mit demselben Budget?

Die Werte 25/20 % werden zunächst **nicht vorsorglich reduziert**. Ein deutlicher problematischer Befund wird mit den Vergleichsdaten benannt; eine nötige Änderung wäre auf diese konkret umgestellten Mobilitätsskills zu begrenzen. Keine versteckten Gegner-/XP-/Statänderungen, um gewünschte Siegquoten zu erzeugen. Ohne solchen Vergleich ist die Mechanik technisch testbar, aber nicht als balanciert freizugeben.

**Technische Abschlussabnahme nach Umsetzung:** Zieltests rot auf `.104`/dann aktuellem unverändertem Ausgangsstand, grün auf Patch; angrenzende Suiten; vollständiges `npm test`; echter isolierter ST-1.19-Smoke mit geordneter Main/Minor-Kombination, ursprünglichem Host-/Extractor-Abschluss und gespeicherten Records. Auch nach grünem Mock-Smoke bleibt die natürliche GLM-Abnahme getrennt. Der unveränderte .104-Batch liefert die Vergleichsbasis; nächster Batch erst nach deploytem neuen Produktstand und aktualisierter Karte/kurzem Bedienhinweis.

## 12. Entscheidung und verbleibende Grenzen

**Empfehlung:** Die Änderung als einen eigenen Combat-Fachpatch umsetzen; vor dem endgültigen F→E-Scaling. Die Kernarchitektur beibehalten. Die realen Risiken liegen an der bisherigen Einzelschrittannahme in Adapter, Teilnehmerauswahl, Ressourcenübernahme und PP – nicht an einem fehlenden neuen Kampfframework.

Dieser Plan legt nutzbare Implementierungsdefaults fest: ein Main/ein Minor, vier markierte statische IDs, zusätzliche ausdrücklich autorisierte Skillbewegung, Flee unverändert, einzelner True-Ambush-Angriff, First Strike als ganze Round-1-Phase, Legacy-Snapshotschutz, bestehende NPC-Taktikgrenzen. **Offen bleibt die zahlenmäßige Balancefreigabe nach dem beschriebenen Vergleich**, nicht ein vorab erfundener neuer Kosten-/Schutzwert. Spätere Minor-Erwerbe/Evolutionen und eine volle Ambush-Kombinationsphase gehören ausdrücklich nicht zum Erstumfang.

**In diesem Schritt geändert:** ausschließlich dieser Fachplan und kurze Verweise in 03/06 auf `main`. Keine Produktdatei, kein Runnerprompt, kein Vertrag, keine Mechanik und kein laufender Test verändert. Die `.104`-Testergebnisse bleiben historische Abnahme dieser unveränderten Version, kein Nachweis der geplanten Kampfregel.
