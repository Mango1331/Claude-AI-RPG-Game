# Avereth – Unabhängiger Gegenreview des 10B-Architekturaudits

**12.11.2026 · Opus 5.5 · nur Analyse: keine Implementierung, keine Freigabe, keine Kanonänderung.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD [`59f868e`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/59f868eaf3c4ed7942ddc42ba3d180fab44a72cd) (Build `4.3.0-c.6.6.179`). Am 12.11. erneut abgefragt: seit dem Audit unverändert. `main` vor diesem Dokument: `99acf87`. Zeilenangaben beziehen sich auf `59f868e` in `avereth-engine/`.

**Gegenstand:** [Fable-Audit §1–§12, V4-Nachtrag §13 und GPT-Gegenreview §14](ARCHITEKTUR_AUDIT_10B_FABLE.md), gelesen gegen [01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md), [02](../02_DESIGN_KANON.md), [03](../03_AKTUELLER_PROJEKTSTAND.md) und das [Architekturaudit `.126`](../patch_plans_10b/PATCH_ARCHITEKTUR_126_KONSOLIDIERT.md).

**Nachweisgrade:**

| Kürzel | Bedeutung |
|---|---|
| **[C]** | eigene Codeprüfung an `59f868e` (Datei und Zeile genannt) |
| **[D]** | eigene Zählung aus den Originalarchiven: Python liest die gespeicherten JSON-Dateien; keine Engine, kein Fold, kein Replay. Zahlen gelten für den jeweiligen Ursprungsbuild |
| **[Ü]** | von Fable oder GPT übernommen und nicht erneut geprüft |
| **[P]** | Schluss oder Prognose, nicht ausgeführt |

**Datengrundlage [D]:**
- Pilot 01 auf `.174`: `avereth-events.json`, `calls.json`, `chat-completions.jsonl` und `chat.jsonl` aus [`originals.tar.xz`](../testrun_10b/npc-20261109-160250Z/originals/).
- Batch 28 Warrior auf `.154`: [`001-guild-warrior.chat.jsonl.gz`](../testrun_10b/batch-20261103-171839Z/originals/).
- User04 auf `.159`: [`chat.jsonl.gz`](../testrun_10b/user-20261106-072640/originals/).

**Datensatznummern:** „recN“ ist der Zeilenindex in der Chat- bzw. Eventdatei; Spielerzeile N, Erzählerzeile N+1.

**Zugnummern:** „Z“ ist die Engine-Zugnummer aus `turn.begun`. Fables „T“ ist die Eingabenummer aus `calls.json`. Beispiele: Z56 entspricht T61, Z60 entspricht T65. Für die Preisfälle (T38–T55) behalte ich Fables Nummern bei.

**Nicht gemacht:** keine Node-Tests, kein Replay, keine ST-Smokes, keine Modellläufe, keine Produktänderung.

---

## 0. Kurzurteil

1. **Fables Grunddiagnose stimmt.** Die Probleme sitzen an wenigen Nähten, 10B ist nicht flächig überkonstruiert. Fold-Schutz, Buchungsfunktionen, Firewall-Autorität und PULSE-Wurf sind tragfähig. GPTs Korrekturen zu V2, V4, V5, V6 und V7 sind ebenfalls richtig.
2. **V1 ist nicht der große Hebel, als den beide Reviews ihn behandeln.** Fables Zählung 11 von 11 lässt sich exakt reproduzieren. Die enge V1-Klasse erklärt aber wenig:
   - Pilot: 1 von 2 „arrival pending“, 0 von 4 Chronologie-Reparaturen, 0 von 2 `met_without_arrival`.
   - Batch 28: 77 der 96 `scene_context`-Ablehnungen fallen in Züge **ohne jedes GO**.
   - V1 entfernt keinen bestehenden Pfad. Alle bleiben für neue Orte, Überland, offene Fenster, Stealth und Dungeon nötig (§3.6).
3. **Der eigentliche Treiber von `scene_context` und Chronologie-Reparaturen liegt woanders.** Die Szenenprüfung gilt auch für Meldungen, die gar keinen Ort haben: Fakten, Absprachen, Namen.
   - Im Pilot betreffen 3 der 4 Chronologie-Reparaturen nur solche Meldungen.
   - In Batch 28 sind es bis zu 47 der 96 `scene_context`-Ablehnungen.
   - Dazu kommt eine Kaskade: Eine abgelehnte Bewegung ohne GO verwirft alle späteren „here“-Meldungen der Antwort. 19 abgelehnte Bewegungen führen so zu 77 Folgeablehnungen.
4. **Statt V1 empfehle ich zwei Regeln, die bestehende Prüfungen verkleinern statt einen zweiten Ankunftspfad zu bauen:**
   - **O1:** Die Ortsprüfung gilt nur für ortsgebundene Meldungen.
   - **O2:** Teilbewegungen innerhalb desselben Gebäudes brauchen kein eigenes GO.
   - O1 folgt direkt aus Kanon §2 („ein gemeinsam erlebter Vorgang bleibt etabliert“), O2 aus Kanon §3 („gewöhnliche Teilbewegungen einer gewählten Handlung“). Beides braucht eine ausdrückliche Nutzerentscheidung.
5. **V2: GPT hat recht.** DUNGEON AHEAD entscheidet Identität und Anwesenheit, nicht den Angriff. Die Erstschlagsprüfung bleibt. In den natürlichen Daten lässt sie den Spieler eher handeln, als dass sie ihm etwas nimmt. Fables Aussage, die Straßenregel sei toter Code, ist **falsch**: Sie greift heute auf jedem Weg aus einem Dungeon hinaus.
6. **V4: §13 ist im Code bestätigt.** Drei Ergänzungen:
   - Der Designkommentar in `interpret.js:209–213` sagt „missing evidence is no error“. Der Code macht einen nicht auffindbaren Beleg trotzdem zum Planfehler.
   - Der Schutz gegen ein Gegenangebot (G2) fehlt heute auf dem häufigsten Weg ganz. Ohne Belegfeld und ohne Münzwort bucht die Engine den gespeicherten Preis.
   - 4 der 16 Planner-Reparaturen sind reine Budgeterschöpfung: Das Modell verbraucht die 2000 Ausgabetokens vollständig für Reasoning. Das ist mehr, als S1–S3 zusammen einsparen.
7. **Notwendig sind nur kleine Eingriffe:**
   - S1 (Mehrfachzitat mit gleichem Betrag).
   - `provenNumber` im Zielkauf nach `go`.
   - Rabattsperre nur mit geprüftem Betrag aufheben.
   - Erste Planner-Antwort mit größerem Ausgabebudget.
   - Guard-Bilanz nach Ursprüngen statt nach Ablehnungen.
8. **Nicht empfohlen:**
   - V1 jetzt als Kanon- und Architekturänderung.
   - Die Erstschlagsprüfung für Slot- und Fenstergegner überspringen.
   - V5 vor einem natürlichen Lauf.
   - V6 nach einer Namensliste.
   - Ein Baseline-Reset ohne historische Referenz.

---

## 1. Gesamtbewertung von Fable und GPT

### 1.1 Was Fable richtig sieht

- **Die Fehler kommen aus wenigen Ursachen, nicht aus vielen.** U1 (Zeitpunkt der Autorität), U2 (zwei Schreiber), U3 (doppelt gelesene Bedeutung) und U4 (hergeleitete statt gespeicherte Begriffe) sind ein brauchbares Analyseraster. Sie erklären die Ketten B, C und D gut.
- **„Was erhalten bleiben sollte“ (§8)** teile ich vollständig. Fold-Schutz, Events als Ergebnisse, Buchungskern, Firewall-Autoritätstabelle, Decision Ownership und PULSE vor der Erzählung sind die tragenden Teile.
- **Die Selbstkorrektur in §13** ist methodisch vorbildlich. Die Gegenbeispiele G1–G6 sind richtig abgeleitet (§5).
- **Die Guard-Bilanz (V8)** ist die wertvollste Empfehlung des Audits. Meine Zählungen in §2 zeigen das: Schon eine grobe Bilanz von `scene_context` dreht die V1-Bewertung um.
- **U6 (Prüfrhythmus):** Code-Gegenproben finden falsch-positive Fälle, natürliche Läufe finden falsch-negative. Diese Beobachtung ist richtig und wichtig.

### 1.2 Wo Fable irrt oder überzieht

| # | Aussage (Fable) | Befund | Beleg |
|---|---|---|---|
| F1 | „Fast alle Aufschub- und Chronologiemechanismen folgen aus diesem einen Punkt“ (§3.1) | **teilweise widerlegt** | Batch 28: 77 von 96 `scene_context` ohne GO [D]. Pilot: 3 von 4 Chronologie-Reparaturen betreffen ortsneutrale Meldungen [D]. `deferred`/`awaitsPurchase` (`world.js:387–393`) ordnet Übergaben einem späteren Angebot derselben Antwort zu, nicht einer Ankunft. Die `use`-Bedingung (`commands.js:962`) hängt an `take` [C] |
| F2 | V1 „schließt“ arrival pending, Gildenbedingungen, Zielkauf, `met_without_arrival` und Szenenchronologie (§9) | **widerlegt als „schließt“** | Jeder dieser Pfade bleibt für die übrigen Reisearten nötig. Für die enge Klasse entfällt keine Codezeile (§3.6) [C] |
| F3 | V1: „Ein Zug statt zwei für hingehen und handeln“ | **überwiegend widerlegt** | Nach einer Ankunft ist niemand anwesend: `scene.moved` mit `reset_present`, `world.js:2616`; Bekannte kommen nur über `met`/`enter`, `world.js:2597`. `sell` an einen abwesenden Käufer wird abgewiesen (`commands.js:1152`). `buy` ohne Preis bleibt offen (`:1145`). Von 25 „arrival pending“ in Batch 28 würden mit V1 nur etwa 2–3 im selben Zug gelingen (§2.2) [C][D][P] |
| F4 | Die Straßenregel ist für alte Kampagnen und durch `campaignSupport` unerreichbar (§3.4, §6.4, V2, V6) | **widerlegt** | `world.js:573` greift bei `!pulse.governs && auth.road === 'quiet'`. Im Dungeon gilt `governs: false` (`pulse.js:123`). Ein GO aus dem Dungeon hinaus ist ein Reiseleg; das Fenster entfällt (`dungeon_leg`, `pulse.js:394`), also `road: 'quiet'` (`:481`). Auf diesem Weg ist die Regel heute die einzige Sperre gegen neue Angreifer [C] |
| F5 | T65: Die Engine widerspricht ihrer Vorentscheidung (§3.4) | **widerlegt** (wie GPT) | DUNGEON AHEAD sagt „there he meets X … bring exactly these“ (`living.js:358`), kein Angriff. Ein PULSE-Gefahrenfenster heißt „turns on him **or bars his way**“ (`pulse.js:342`) [C] |
| F6 | „In Batch 28 wurden 30 % der Spielerbefehle nicht ausgeführt“ | **überzogen** | `pending` enthält richtige Zwischenzustände wie „WANTS — no price is known“ (`commands.js:1145`). Das ist kein Fehlschlag [C] |
| F7 | Jede fünfte Extractor-Meldung abgelehnt, als Kostenmaß | **überzogen** | Kaskaden zählen mehrfach: In Batch 28 erzeugen 19 abgelehnte Bewegungen 77 Folgeablehnungen [D]. Maßstab sollten Ursprünge sein |
| F8 | Sieben Bedingungsarten, alle aus U1 | **präzisieren** | Sechs hängen an der Ankunft (`turn_in`, `accept`, `board`, `abandon`, `give`, `spring`), dazu der Zielkauf. `use` hängt an `take` [C] |
| F9 | V4 §9 | von Fable selbst korrigiert | §13 bestätigt (§5) |

### 1.3 Was GPT richtig korrigiert

- **V1: Ein geschlossenes Fenster ist keine Ankunft.** Das ist bestätigt und lässt sich verschärfen:
  - Zum Zeitpunkt des GO-Handlers ist das Fenster **noch gar nicht entschieden**. `pulseFinish` läuft erst nach allen Handlern (`commands.js:1797` → `pulse.js:460`).
  - Eine Vorabbuchung bräuchte einen neuen, frühen PULSE-Anspruch, wie ihn `pulseClaimPause` für Pausen hat (`pulse.js:151–157`) [C].
  - Die ruhige Reisezeile sagt ausdrücklich „until he arrives **or the day's travel ends**“ (`pulse.js:363`) [C].
- **V2: Autorisierung und Vollzug sind zwei Fragen.** Bestätigt (§4).
- **V4: Die Grenzen von S1–S3.** Bestätigt. Die Voraussetzung für S3 ist prüfbar und vollständig: Nur zwei Stellen verwenden eine ungeprüfte Zahl erlaubend (§5.1) [C].
- **V5, V6, V7:** Die Auflagen sind richtig. Für V6 liefere ich mit F4 das Gegenbeispiel, das GPT abstrakt vermutet hat.
- **Fables Arbeitsregel 5 ist zu kategorisch.** Einverstanden.

### 1.4 Wo GPT zu kurz greift

| # | GPT | Einwand |
|---|---|---|
| G-a | V1 ist „die wichtigste Architekturentscheidung“ und die „höchstrangige gezielte Entwurfsprüfung“ (§14.3, §14.7) | Die Daten decken das nicht. GPT hat Fables Zählungen ausdrücklich nicht nachgerechnet und dadurch die Grundannahme übernommen, die Ankunftsnaht sei der Haupttreiber. Für die Ankunftsfrage ist sie es nicht (§2) |
| G-b | G2: Die Reparatur ist eine „zweite Chance“ | Auf dem häufigsten Weg existiert sie nicht. Mit `price_evidence: null` und einem Betrag ohne Münzwort prüft `amountErrors` nichts (`interpret.js:232`). `financeHints` greift nur bei Münzwörtern (`:257`, `economy.js:109`). Gebucht wird der gespeicherte Preis [C]. In den vier beobachteten `offer.accept`-Reparaturen hat das Modell nur Beleg- oder Zahlfeld geändert, nie die Annahme selbst [Ü, Fable §13.3] |
| G-c | Größter Reparaturposten nicht benannt | 4 von 67 ersten Planner-Antworten enden mit `finish=length`: 2000 Tokens Reasoning, 0 Zeichen Inhalt. Eine fünfte bleibt ohne Antwort. Das sind 5 der 16 Planner-Reparaturen, mehr als S1–S3 zusammen [D] |
| G-d | Reihenfolge (c) V1 vor (d) V2 | V1 gehört nach den Daten nicht in die nächste Reihenfolge. Vorher sind die ortsneutralen Meldungen zu klären (O1) |

### 1.5 Behauptungsbilanz

| Status | Behauptung |
|---|---|
| **Bestätigt** [C] | Ankunft als Naht mit vielen Aufschubwegen. `afterTravel` sperrt zehn Befehlsarten (`commands.js:1741–1742`). Zielkauf mit ungeprüftem `max_cp` (`:1751`). Rabattsperre mit ungeprüfter Zahl (`trade.js:114`). Mehrfachzitat-Fehler (`finance_evidence.js:292–295` gegen `:84`). Zugverlust nach einer gescheiterten Reparatur (`runtime.js:270–322`). PULSE-Veto mit Ausnahmen (`world.js:558–580`). `attackCommitted` als positive Verbliste (`envelope.js:184`). Dauerhaft konstante Pfadprüfungen (`runtime.js:127–147`) |
| **Bestätigt** [D] | 11 von 11 Ankünften bei geschlossenem Fenster, 0 von 5 bei offenem (Pilot). 5 der 16 Planner-Reparaturen sind Budget oder Transport; die übrigen 11 betreffen laut Fable Geld oder Preise [Ü]. 4 der 12 Extractor-Reparaturen sind Chronologie-Reparaturen, 2 weitere betreffen die Form der Ortsreferenz |
| **Widerlegt** | F1–F5 (oben), dazu die Annahmen „V1 entfernt Pfade“, „die Straßenregel ist tot“, „bei T65 widerspricht die Engine sich selbst“ und „G2 ist heute durch die Reparatur geschützt“ |
| **Offen** | Natürliche Wirkung von K4, K5a, K6b und K7 auf `.179`. Häufigkeit von Bewegungen ohne GO auf dem aktuellen Build: Batch 28 viel, Pilot und User04 keine [D]. Verlässlichkeit der Extractor-Reihenfolge (`seq`) als Szenenbeleg |

---

## 2. Eigene Messungen [D]

### 2.1 Ankunft im Pilot (16 GO-Züge zu bekanntem Ziel)

| Zug | Ziel | Expositionsart und Fenster | angekommen? | in derselben Siedlung | Folgebefehl |
|---|---|---|---|---|---|
| Z3 | Ashbridge, Gildenhalle | Szene innen, zu | ja | nein (Ankunft von außen) | – |
| Z8 | Schilfufer | Reise, **offen** (Hindernis) | nein, Halt an neuer Stelle | nein | – |
| Z10 | Hof am Schornstein | Reise, zu | ja | nein | – |
| Z12 | Schilfufer | Reise, zu | ja | nein | – |
| Z15 | Weidetor, Mühle, Halle | Reise, **offen** (Begegnung) | nur das erste von drei Zielen (Weidetor), dann Ufer | nein | `turn_in` verfällt korrekt |
| Z17 | Hessas Mühle (zwei Schritte) | Reise, zu | ja | nein | `met` am falschen Schritt |
| Z19 | Ashbridge | Reise, **offen** (Gefahr) | nein | nein | – |
| Z22 | Ashbridge (Fortsetzung) | gehalten | ja | nein | – |
| Z23 | Gildenhalle | Straße, zu | ja | **ja** | `turn_in` bedingt, ausgeführt |
| Z31 | Gildenhalle | innen, zu | ja | **ja** | – |
| Z34 | Harls Gerberei | Reise, **offen** (Begegnung) | nein | ja (Reiseleg, weil das Ziel nur aus einem Bericht bekannt war) | – |
| Z35 | Harls Gerberei | Reise, zu | ja | **ja** | – |
| Z40 | Gildenhalle | innen, zu | ja | **ja** | – |
| Z42 | Woolpack | Reise, zu | ja | **ja** (Reiseleg) | **„look for Muller“: arrival pending** |
| Z56 (T61) | Hof des Woolpack | innen, **offen** (Stadtleben) | über das Ziel hinaus (Wegkreuz) | ja | `met`, `scene_context`, `world_rule` |
| Z59 | Mossback-Bau | Wildnis, zu | ja | nein | Chronologie-Reparatur |

**Ergebnis:**
- Fables Zählung ist reproduziert: 11 von 11 bei geschlossenem, 0 von 5 bei offenem Fenster.
- Fables V1-Klasse (bekannt, siedlungsintern, zu, ohne Stealth) umfasst Z23, Z31, Z35, Z40 und Z42.
- Nur in **Z42** wurde ein Folgebefehl abgelehnt.
- Der Erzähler folgt der PULSE-Reisezeile. Bei offenem Fenster hält er an, bei geschlossenem kommt er an. Das spricht für das PULSE-Design, aber nicht für eine Vorabbuchung: Dort, wo die Engine vorab bucht, fallen fast keine Ablehnungen an.

### 2.2 Batch 28: die 25 Datensätze mit „arrival pending“

| Klasse | Datensätze | Mit V1-eng im selben Zug lösbar? |
|---|---|---|
| Suche (`activity search`) nach einem GO, meist an neuen oder wilden Orten | 11 (rec20, 94, 186, 218, 220, 392, 620, 772, 782, 784, 786) | nur siedlungsinterne bekannte Ziele: 1 (rec620) |
| Arbeit an den Fallen (`activity work`) nach einem GO | 2 (rec614, 616) | eventuell rec614 |
| Unterkunft, Bett, Essen ohne genannten Preis | 8 (rec70, 174, 228, 442, 498, 508, 626, 652) | nein: Der Preis fehlt, der Zug endet „pending“ wie heute. Nur Schlafen ohne Zimmer (rec174) würde gebucht |
| Handel mit einer Person am Ziel (`sell`, `buy`) | 2 (rec278, 292) | nein: Der Käufer ist nach der Ankunft nicht anwesend |
| `take`/`equip` aus einer Übergabe am Ziel | 2 (rec194, 198) | nein: Die Person ist nicht anwesend, und die Reihenfolge stimmt nicht |

14 der 25 Datensätze haben ein bekanntes Ziel, etwa 10 davon in derselben Siedlung. **Im selben Zug würden mit V1 etwa 2–3 gelingen** [D][P]. Die größte Klasse sind Suchen (11 von 25, auch Pilot Z42 ist eine `search`). V1-eng erfasst sie meist nicht, weil das Ziel neu oder außerhalb der Siedlung liegt.

### 2.3 Batch 28: die 96 `scene_context`-Ablehnungen

| Kontext des Zuges | Ablehnungen | Züge |
|---|---|---|
| **ohne GO** | **77** | 21 |
| GO zu bekanntem Ziel, nicht angekommen | 7 | 2 |
| GO zu neuem Ziel | 7 | 1 |
| GO zu bekanntem Ziel, angekommen | 5 | 2 |

In 18 der 21 Züge ohne GO wurde ein `arrive` mit `no_go` abgelehnt (19 Bewegungen, `firewall.js:399–410`). Danach verwarf `world.js:1022–1025` jede spätere Meldung mit `scene` leer oder „here“. Die 18 Ursprünge:

| Ursache | Züge | Beispiel |
|---|---|---|
| Arbeit oder Begleitung, die eine Person anführt (Cobb, Dremm, Fischer) | 8 | „Let's walk the lines.“ als `activity work`, die Erzählung führt ihn zu den Fallen |
| Klare Bewegung, aber kein oder ein abgewiesenes GO | 4 | rec6: „I walk toward Alderwatch's city gate …“ → Planner `{"commands": []}`. rec224: GO abgewiesen (`invalid local habitat scope`). rec830: GO `clarify` (`danger on the way`) |
| **Teilraum nach einer Zimmerbuchung** | 2 | „I take the small room“ → Erzählung führt ihn hinauf |
| Nachbarhaus im selben Ort | 2 | „I knock at the house with the green door“ |
| Lager am Dungeon, Kampf | 2 | – |

**Nach Meldungsart:** `fact` 36, `person.new` 20, `thread` 11, `enter` 6, `offer` 4, `coin.gift`/`object.new`/`aware` je 3, `memory`/`object.move`/`creature.new`/`position` je 2. Fakten und Absprachen machen **47 von 96** aus. Es sind Aussagen über Personen wie „the clerk said …“, „payment_terms“, „road_report“, keine Ortsbuchungen.

**Pilot und User04:** Im Pilot gibt es 1 `scene_context`, in User04 keine; beide haben kein `no_go`. Die Klasse hängt also stark vom Spielprofil ab: Arbeit, Begleitung und Unterkunft treiben sie. Der Mechanismus ist seit `.154` unverändert (`firewall.js` hat seit `.126` einen einzigen Commit [Ü]).

**Nebenbefund [C]:** Die Ausnahme „hinauf in das gerade bezahlte Zimmer“ (`c.6.6.4`) gilt seit `.99` nur noch für Ruleset 1: `lodgedHere: rulesetOf(s) < 2 && …` (`world.js:121`, Commit `15ebbc1`, Kommentar „current campaigns require an authorized room move“). Für alle aktuellen Kampagnen ist sie abgeschaltet. Genau diese Fälle treten in Batch 28 auf.

### 2.4 Pilot: die 4 Chronologie-Reparaturen des Extractors

| Zug | Ankunft der Antwort | Beanstandete Meldungen vor der Ankunft | ortsgebunden? |
|---|---|---|---|
| Z9 | neues Weidetor | `fact`, `fact` | nein |
| Z56 (T61) | neues Wegkreuz (offenes Fenster) | `person.named` (Fuhrmann Torv) | nein |
| Z57 | Mullers Hof | `fact` | nein |
| Z59 | Mossback-Bau | `enter`, `object.new`, `object.move`, `quest.detail` | ja (drei von vier) |

Die Fehlermeldung lautet jeweils „explicitly name this earlier scene before the later arrival; here/final scene does not establish chronology“ (`extract.js:345–348`). **3 der 4 Reparaturen hätte es ohne Szenenpflicht für ortsneutrale Meldungen nicht gegeben.** Keine der vier liegt in Fables V1-Klasse.

### 2.5 Natürliche Fälle von `attack_commitment`

| Lauf | Wortlaut der Belegstelle | Einordnung |
|---|---|---|
| Pilot Z13 | „… lips peeling higher. The gap … was four paces of open mud, and it was coming across it.“ | Anlauf, Angriff beginnt |
| Pilot Z19 | „The lead dog took one step nearer the cart, and the other two fanned out“ | **richtig abgelehnt**: Drohung |
| Pilot Z60 (T65) | „… the nearest one's weight shifted, and it came.“ | Anlauf. Auf `.174` griff zuerst die PULSE-Sperre; auf `.175` scheitert der Fall an `attack_commitment` [Ü Patchnote] |
| User04 | „Then all three moved toward him across the gravel, quickening.“ | Anlauf |

Drei der vier Fälle beschreiben den Moment vor dem Kontakt. Die Verbliste kennt `charg\w*` und `comes? at`, aber nicht „came“, „coming across“ oder „moved toward … quickening“.

**Folge einer Ablehnung:** Kein Erstschlag für den Gegner. Der Spieler entscheidet im nächsten Zug. Der Fehler fällt also zugunsten der Spielerhoheit aus.

### 2.6 Pilot: Planner-Reparaturen

| Auslöser | Anzahl |
|---|---|
| erste Antwort `finish=length`: 2000 Completion-Tokens, 7700–8500 Zeichen Reasoning, 0 Zeichen Inhalt (Eingaben 20, 23, 31, 37) | 4 |
| keine Antwort (Eingabe 41) | 1 |
| Preis- und Geldbeleg (Fable §13.3) [Ü, stichprobenhaft bestätigt] | 11 |

Das Planner-Budget wurde schon in `.51` aus demselben Grund von 900 auf 2000 angehoben (`runtime.js:53–61`). Die Wiederherstellung für zwei leere Antworten nutzt bereits 4000 (`:292`), die erste Antwort nicht.

---

## 3. V1 – Ankunft und Reise (Tiefenanalyse)

### 3.1 Was die geltende Regel schützt

[02 §2](../02_DESIGN_KANON.md): „Nur autorisierte, bestätigte und chronologisch gültige `arrive`-Deltas bewegen den PC.“ Die Regel schützt vier Dinge:
1. **Keine Teleports aus Prosa** (`.74`).
2. **Spielerhoheit über freiwillige Ziele** (§3).
3. **Erzählfreiheit für glaubwürdige Unterbrechungen** (§2: „Kompakte Reisen mit realen Zwischenereignissen sind erlaubt“).
4. **Ortsrichtigkeit von Personen und Dingen:** Wer zuerst wo gesehen wurde, wer am verlassenen Ort bleibt (`world.js:2596–2612`; Fall „Reed Flats boy … at Chandler's Row“, `:951`).

Nur Punkt 1 und 2 hängen daran, **wer** die Ankunft bucht. Punkt 3 und 4 hängen daran, **wann**.

### 3.2 Die heutige Kette im Code [C]

1. **GO-Handler** (`commands.js:592–699`). Er autorisiert, ohne zu bewegen, und erledigt dabei:
   - Ziel und Zeitkappe.
   - Stealth (`travelManner`).
   - Reiseleg für PULSE (`roadLeg`/`pulseLeg`, `:317`).
   - Gesuchte Kontakte (`goSought`).
   - Verborgene Falle, beim GO vorab gewürfelt (`pendingSpring`, `:682`).
   - Wegzeile, Ziel als Vorhaben, `KNOWN AT`.
   - Ergebniszeile „GOES … (the story decides whether and where he arrives)“ (`:698`).
2. **Folgebefehle** (`resolveCommands`):
   - `afterTravel` sperrt zehn Befehlsarten (`:1741`).
   - Zielkauf (`:1747–1758`).
   - Gildenbedingungen (`:273`, `:1335`, `:1380`, `:1449`) und Übergabe (`:936`).
3. **PULSE entscheidet erst danach** (`:1797` → `pulse.js:460`).
4. **Erzähler, dann Extractor:** `arrive` plus `expected.<seq>.arrived/met` plus `scene` je Meldung. `sceneIssues` prüft vor der Übernahme (`extract.js:328`) und löst gegebenenfalls eine Reparatur aus.
5. **`applyWorld`:**
   - Firewall mit `no_go` (`firewall.js:399–410`), dann Prüfung je Schritt und `scene_context` (`world.js:1022–1037`).
   - Der `arrive`-Fall (`:1061–1096`) ruft `arrive()` auf (`:2585–2720`): Zurückbleibende, Dungeonweg, neuer Living-Teil, Begleiter, gesuchte Kreaturen, erreichte Ziele, mitgenommene Entscheidungen, Falle, Gildenbedingungen.
   - Danach `metArrivals`, nach der Schleife Gildenabgabe-Nachlauf (`:1833`), Verfall (`:1842`), `met_without_arrival` (`:1848`), Schalterbearbeiter, Ankunfts-Stealth (`:1860`) und Mindestreisezeit (`:1718–1722`).

`arrive()` ist eine Closure über viele lokale Variablen und Hilfsfunktionen von `applyWorld` (u. a. `arrivals`, `sceneEpoch`, `conditionals`, `explicitTravel`, `freshPart`, `arrivedHall`, `deskWitnesses`, `system`, `corrections`, `soughtHere`). Eine Ankunft schon im Befehlszeitpunkt braucht deshalb entweder eine zweite Implementierung der Ankunftsfolgen oder deren Auslagerung in ein reines Modul. Das ist das größte Einzelrisiko von V1.

### 3.3 Was die Engine beim GO weiß, je Reiseart

| Reiseart | Weg, Gate | PULSE beim GO | Zeit | Anwesende am Ziel | Ankunft vorab entscheidbar? |
|---|---|---|---|---|---|
| bekannter Ort in derselben Siedlung | deterministisch (`wayRefused`) | **noch nicht entschieden**; Straße und Innenraum ohne `danger`, aber mit `meeting`, `life`, `trouble` | Untergrenze 15 min | Erzähler (`KNOWN AT` ist nur ein Hinweis) | technisch ja, mit neuem frühem PULSE-Anspruch |
| Teilraum desselben Gebäudes | deterministisch | – | trivial | teils schon anwesend | ja |
| aus der Siedlung hinaus, Überland | deterministisch | ruhig heißt „until he arrives or the day's travel ends“ | Erzähler (Kappe 7 Tage) | – | **nein** ohne Reisezeitmodell |
| bekannter Dungeonweg, alle Wege offen | `wayBetween` | Paket B: Wanderminion möglich | kurz | Slots bekannt | teilweise |
| ungesehener Dungeonteil | `livingGo` (Gate, Kapazität) | DUNGEON AHEAD | kurz | Slot | **nein**: Der Ort entsteht erst |
| neuer Ort (`to.new`) | – | – | Erzähler | – | **nein**: Der Ort existiert nicht; oft ist es eine Richtung („toward the reeds where the sound sits“) |
| Stealth | deterministisch | – | – | Entdeckung gegen die tatsächliche Population **nach** der Erzählung (`world.js:1860`) | **nein** |
| verborgene Falle unterwegs | Wurf beim GO | – | – | – | ja (heute schon vorab gewürfelt, gebucht bei Ankunft) |
| Fortsetzung, Begleitung | deterministisch | Reiseleg | Erzähler | Begleiter | nein |

In Batch 28 gehen 47 von 126 GO-Schritten zu einem neuen Ort, 79 zu einem bekannten [D]. Eine vollständige Vorabbuchung aller Reisen (V1-total) scheitert an den neuen Orten und am fehlenden Reisezeitmodell. Kanon §10 schließt eine Pathfinding-Simulation ausdrücklich aus.

### 3.4 Folgebefehle derselben Eingabe

| Folgebefehl | heute nach einem GO | mit V1-eng | hängt außerdem ab von |
|---|---|---|---|
| `turn_in`, `accept`, `board`, `abandon` an der Gildenhalle | bedingt; funktioniert (Pilot Z23) | sofort aufgelöst (`commands.js:1369`) | nichts. **Kein Spielgewinn**, nur ein anderer Weg |
| `buy` mit belegtem Limit | Zielkauf; Limit ungeprüft (B-3a) | lokaler Kauf mit `provenNumber` | Angebot in der Erzählung |
| `buy` ohne Preis | arrival pending | „WANTS — no price is known“ (`:1145`) | Preis des Händlers: nächster Zug wie heute |
| `offer.accept` am Ziel | arrival pending | nur mit anwesendem Verkäufer | Anwesenheit (nach `reset_present` niemand) |
| `sell` an einen genannten Käufer | arrival pending | „CANNOT SELL — X is not here“ (`:1152`) | Anwesenheit: **schlechter als heute** |
| `take` vom Ort | arrival pending | nur bei bekanntem Objekt | Objekte entstehen meist erst in der Erzählung |
| `activity search` | arrival pending, **zu Recht**: Der Wurf fällt am aktuellen Ort (`commands.js:822–850`) | Wurf am Ziel | – |
| `rest`/`sleep` | arrival pending | am Ziel gebucht | Zimmer (`roomSteps`, `:1620`) |
| `give` | bedingt (`hand_over`) | bedingt | Anwesenheit des Empfängers |
| `equip`/`unequip`/`use` eigener Dinge | arrival pending | lokal | ortsunabhängig |

**Anwesenheit ist der Engpass, nicht die Ankunft.** Eine vorab gebuchte Ankunft bringt den Verkäufer nicht mit. Das ist eine bewusste Entscheidung (`world.js:2597–2598`: „only the story knows whether they are still there“). Wer V1 spielerisch wirksam machen will, muss zusätzlich das **Stammpersonal eines Ortes** per Engine anwesend setzen. Das wäre eine zweite Kanonänderung mit folgender Wirkung:
- Sie überschneidet sich mit `met` aus E2-A.
- Sie erzeugt falsche Anwesenheit, wenn der Erzähler die Person abwesend zeigt.
- Sie würde `met` für Personal überflüssig machen, also tatsächlich etwas entfernen.

Dafür fehlt eine Messung. Ich empfehle sie nicht ohne Daten.

### 3.5 NPC-Anwesenheit, Zeit und Ortschronologie

- **`met`** (`world.js:2089–2112`) verlangt `expected[k].arrived === true` und `s.scene.at === g.to`. Mit V1 müsste der Schritt als „vorab angekommen“ gelten, die Belegprüfung bleibt. `met_without_arrival` entfällt nur für diese Klasse; im Pilot gab es dort keinen Fall.
- **Zeit:** Heute bucht die Engine nach der Ankunft mindestens 15 Minuten (`:1718–1722`). Mit V1 müssten die 15 Minuten vorab gebucht und die erzählten Minuten dagegen verrechnet werden, wie bei `booked_min`. Das ist machbar.
- **Chronologie:** Bleibt der Erzähler nach einer vorab gebuchten Ankunft nicht am Ziel (Z56: Hof, dann Fahrt zum Wegkreuz), entsteht ein neuer Widerspruch. Fable nennt das. Die heutigen Chronologieregeln bleiben dafür nötig.
- **Swipe:** Ein Vorteil von V1. Die Ankunft stünde im Spielerrecord fest, wie PULSE, und hinge nicht mehr am Swipe des Erzählers.
- **Replay:** Jeder Korpusfall mit einem siedlungsinternen GO würde abweichen (Ereignisse wandern vom Assistant- in den Spielerrecord) und bräuchte eine Einzelfreigabe.

### 3.6 Welche Pfade tatsächlich entfallen könnten

| Pfad | Stelle | V1-eng | V1-total | O1/O2 (eigene Alternative) |
|---|---|---|---|---|
| `afterTravel`-Ablehnung | `commands.js:1741` | bleibt (alle anderen Reisearten) | bleibt (neue Orte) | bleibt |
| Zielkauf, Entscheidung mit `destination` | `commands.js:1747–1758`, `world.js:2663–2681` | bleibt | bleibt (neue Orte) | bleibt; P1b schließt die Lücke |
| `arrive_guild_hall`-Bedingungen | `commands.js:273/1335/1380/1449`, `world.js:2684–2717`, `:1833` | bleibt (Hallen außerhalb der Siedlung, neue Hallen) | bleibt (`guild_candidate`) | bleibt |
| `hand_over`, `spring` | `commands.js:936`, `features.js:153` | bleibt | bleibt | bleibt |
| `sceneIssues` (Reparatur) | `extract.js:328–357` | bleibt | bleibt | **kleiner** (O1) |
| `scene_context`-Kaskade | `world.js:1022–1037` | bleibt | bleibt | **kleiner** (O1) |
| `met_without_arrival` | `world.js:1848`, `:2104` | bleibt | geändert | bleibt |
| Teilraumausnahme (`lodgedHere`) | `world.js:121`, `firewall.js:400` | – | – | **ersetzt** (O2) |
| `deferred`/`awaitsPurchase` | `world.js:387–393` | unabhängig | unabhängig | unabhängig |
| `implicitArrivals` (nur ohne C/Ruleset 2) | `world.js:913–942` | – | – | V6-Kandidat |

**V1-eng entfernt keine Zeile.** Es kommen hinzu: ein früher PULSE-Anspruch, eine zweite oder ausgelagerte Ankunftsimplementierung, ein `ARRIVES`-Vertrag für Erzähler und Extractor, eine Anpassung von `met` und Einzelfreigaben im Replay. Das ist genau die „Redesign-Falle“, vor der GPT gewarnt hat. Der Code bestätigt sie.

### 3.7 Vier Architekturen im Vergleich

| Kriterium | Status quo | V1-eng (Fable) | V1-total | **O-Paket (eigene)** |
|---|---|---|---|---|
| Kerngedanke | Erzählung entscheidet die Ankunft, Engine prüft | Engine bucht bekannte Ziele in der Siedlung bei geschlossenem Fenster vorab | Engine bucht jede Reise vorab | Ortsprüfung nur für ortsgebundene Meldungen (O1); Teilbewegung im Gebäude (O2); optional vorab gewürfelte Suche am Ziel (O3) |
| Abdeckung Pilot | – | 1 von 2 arrival pending, 0 von 4 Chronologie-Reparaturen | – | O1: 3 von 4 Chronologie-Reparaturen. O3: 1 von 2 arrival pending |
| Abdeckung Batch 28 | – | etwa 2–3 von 25 arrival pending, höchstens 5 von 96 `scene_context` | – | O1: bis zu 47 von 96 `scene_context`. O2: 2 von 18 Ursprüngen. O3: bis zu 11 von 25 arrival pending |
| entfallende Pfade | – | keine | einige, aber nur mit Reisezeitmodell und Ortserzeugung durch die Engine | `lodgedHere`-Sonderfall, Szenenpflicht für vier Meldungsarten |
| neue Pfade | – | früher PULSE-Anspruch, zweite Ankunft, neuer Vertrag | Reisezeitmodell, Ortserzeugung | O1: eine Typliste. O2: eine Firewall-Bedingung. O3: eine Bedingungsart nach Fallenmuster |
| Kanonänderung | – | ja (§2 Ankunft) | ja, grundlegend | O1: Präzisierung §2. O2: Präzisierung §2/§3. O3: keine (folgt §4) |
| Integritätsrisiko | – | mittel (Text und Zustand laufen auseinander, wenn der Erzähler unterbricht) | hoch | gering bis mittel (§3.8) |
| Swipe, Replay | – | Swipe stabiler; viele Replay-Abweichungen | – | wenige Replay-Abweichungen, gezielt auf Batch-28-Fälle |
| Aufwand | – | L | XL | O1 S–M, O2 S, O3 M |

**Zielkonflikte:**
- **Erzählfreiheit gegen Determinismus.** V1 nimmt dem Erzähler die Unterbrechung auf kurzen Wegen; O1 bis O3 lassen sie ihm und machen nur die Folgen robuster.
- **Tempo gegen Zustimmung.** Ein Zug weniger ist nur dort ein Gewinn, wo keine offene Zustimmung (Preis, Anwesenheit des Gegenübers) übersprungen wird. Genau diese Fälle bleiben auch mit V1 mehrzügig.
- **Glaubwürdigkeit gegen strikte Ortskanonik.** Die Kaskade verwirft, was der Spieler gelesen hat. O1 zieht Glaubwürdigkeit vor, solange keine ortsgebundene Buchung entsteht.
- **Spielerhoheit gegen Bewegungsfreiheit des Erzählers.** O2 erweitert sie nur im Gebäude; echte Ortswechsel bleiben an ein GO gebunden.

### 3.8 Eigene Alternative im Detail

**O1 – Ortsprüfung nur für ortsgebundene Meldungen.**
- **Was:** `localSceneDelta` (`extract.js:326`) nimmt ortsneutrale Meldungen aus: `fact`, `thread`, `person.named`, `quest.detail`. Für sie gibt es dann weder die Chronologie-Reparatur (`sceneIssues`) noch die `scene_context`-Kaskade (`world.js:1022–1037`).
- **Bleibt ortsgebunden:** `person.new`, `enter`, `creature.new`, `object.new`, `object.move`, `offer`, `bid`, `coin.gift`, `position`, `aware`, `hostile`, `intent`, `memory` (sie trägt den Ort), `learn` und die Persönlichkeitsanker.
- **Abhängige Aussagen bleiben geschützt:** `blockedPeople`/`npc_continuity` und `blockedCreatures` sperren weiter Fakten über eine abgelehnte Person oder Kreatur (`world.js:1009–1021`).
- **Warum:** Ein Fakt wie „der Schreiber sagte …“ oder eine Absprache mit Cobb ist wahr, egal wo Alaric kanonisch steht. Kanon §2 sagt: „Ein tatsächlich gemeinsam erlebter Vorgang bleibt etabliert, auch wenn seine technische Wissensbuchung fehlschlägt.“ Die heutige Kaskade verwirft genau solche Vorgänge.
- **Risiko:** Ein Fakt aus einer Szene, die der Erzähler unautorisiert betreten hat, wird gebucht.
  - Er beschreibt aber Personen, keinen Ort. Wissen anderer Figuren entsteht daraus nicht automatisch: `perceiveAll` vergibt nur das Aussehen (`engine.js:835–849`).
  - Restrisiko: ein Fakt mit Ortsprädikat. Optional lassen sich Fakten mit einem Ort als Subjekt ausnehmen.
- **Aufwand:** S–M. Rot/Grün mit Batch-28-rec7, rec73, rec233, rec477–545 und den vier Pilotreparaturen.
- **Urteil:** **GO nach Kanonentscheidung K-A** (§7).

**O2 – Teilbewegung innerhalb desselben Gebäudes.**
- **Was:** Ein `arrive` ohne GO ist zulässig, wenn alle folgenden Bedingungen gelten:
  - Das Ziel ist Kind, Elternteil oder Geschwister des aktuellen Ortes innerhalb desselben Gebäudes oder Anwesens (`complexOf`/`lineage`), z. B. Schankraum → Zimmer, Halle → Schalter, Gasthaus → Hof.
  - Kein Dungeon.
  - `wayRefused` meldet keinen gesperrten Weg.
  - Kein Kampf.
  - Kein offener Stealth-Schritt.
- **Ersetzt** die seit `.99` für Ruleset 2 abgeschaltete Zimmerausnahme (`world.js:121`).
- **Warum:** Kanon §3 erlaubt „gewöhnliche Teilbewegungen einer gewählten Handlung“. Die Firewall verlangt dafür heute ein GO, das der Planner bei „I take the room“ nicht erzeugt. Folge in Batch 28: Zimmer gebucht, Erzählung im Zimmer, Zustand im Schankraum, und alle Meldungen danach werden verworfen.
- **Risiko:** gering. Weiter ist keine Reise möglich, kein Ortswechsel außerhalb des Gebäudes, kein Dungeon.
- **Offene Frage:** `.99` hat diese Ausnahme bewusst abgeschaltet. Die Begründung „require an authorized room move“ war eine Strengeentscheidung ohne gemessenen Missbrauchsfall. Ihre Rücknahme braucht die Entscheidung des Nutzers.
- **Urteil:** **eingeschränktes GO** (Gebäudegrenze, kein Siedlungsumfang).

**O3 – Suche am Ziel vorab würfeln (Fallenmuster).**
- **Was:** Ein `activity search` nach einem GO wird nicht mehr mit „arrival pending“ abgewiesen.
  - Die Engine würfelt die Suche beim GO für das **Ziel**, wie bei `pendingSpring` (`features.js:153`).
  - Der Erzähler erfährt: „If he gets there, his search there succeeds / finds nothing.“
  - Bei bestätigter Ankunft werden `check.recorded` und Funde gebucht, sonst verfällt die Suche.
  - Bei einem neuen Ziel gibt es keine verborgenen Merkmale; dann zählt nur Erfolg oder Misserfolg.
- **Warum:** Heute muss der Spieler die Suche nach der Ankunft neu eingeben. Kanon §4 schließt genau das aus („keine Pflicht-Continues“).
- **Kosten:** eine weitere Bedingungsart, also additiv. Sie folgt aber einem vorhandenen Muster, und der Erzähler kennt das Ergebnis vorher. Damit trifft Fables Einwand gegen verallgemeinerte Bedingungen hier nicht zu.
- **Urteil:** **weitere Daten nötig.** Im natürlichen Lauf auf `.179` zählen, wie oft „GO + Suche“ vorkommt (Batch 28: 11 von 25, Pilot: 1 von 2). `work` und `errand` buchen Minuten vorab und bleiben bei „arrival pending“.

**O4 – Arbeit oder Begleitung, die eine anwesende Person anführt.** Das ist die größte Ursprungsklasse in Batch 28 (8 von 18). Eine Lösung wäre, dass `work` mit einem anwesenden Auftraggeber das Mitgehen autorisiert, analog zu `ROAMING` (`commands.js:57`). Das verschiebt die Grenze „neue freiwillige Ziele“ aus Kanon §3. **Weitere Daten nötig**, die Klasse hängt stark vom Spielprofil ab.

### 3.9 Urteil V1

| Variante | Urteil | Begründung |
|---|---|---|
| **V1-eng** (Fable): bekannte Ziele in der Siedlung vorab buchen | **NO-GO** (jetzt) | Ein Zug in 70 Pilot-Eingaben, etwa 2–3 von 25 in Batch 28. Kein Pfad entfällt, neue kommen hinzu. Anwesenheit und Preis bleiben der eigentliche Engpass |
| **V1 mit Stammpersonal** | **weitere Daten nötig** | Würde `met` für Personal ersetzen, also tatsächlich vereinfachen. Erfordert aber eine zweite Kanonänderung und eine Messung, wie oft der Erzähler Personal abwesend zeigt |
| **V1-total** | **NO-GO** | Neue Orte und Überlandreisen sind vorab nicht entscheidbar, ohne ein Reisezeitmodell und eine Ortserzeugung durch die Engine |
| **O1** | **GO** nach Kanonentscheidung K-A | größter belegter Hebel, verkleinert bestehende Regeln |
| **O2** | **eingeschränktes GO** (Gebäudegrenze) | ersetzt eine abgeschaltete Sonderregel |
| **O3, O4** | **weitere Daten nötig** | natürlicher Lauf auf `.179` |

V1 kann zurückkommen, wenn ein natürlicher Lauf auf dem aktuellen Build „Hingehen und Handeln in der Siedlung“ unter den drei größten Reibungen zeigt und eine Entscheidung zur Anwesenheit des Personals vorliegt.

---

## 4. V2 – Angriffsautorität

### 4.1 Vier Ebenen

| Ebene | Wer entscheidet heute | Stelle | Empfehlung |
|---|---|---|---|
| **1. Gegner darf erscheinen** | Engine für Slots (DUNGEON AHEAD), Wanderminion, PULSE-Gefahrenfenster; sonst Erzähler mit den Populationsregeln aus `.132` | `living.js:358`, `pulse.js:411–445`, `world.js` `creature.new` | unverändert |
| **2. Gegner darf angreifen** | `envelopeAllows`, Teil 1: PULSE-Sperre mit Ausnahmen, Straßenregel, `mayOpenFight` | `world.js:552–582` | Logik unverändert; Quellen optional als Tabelle darstellen |
| **3. Angriff wurde ausgeführt** | `attackCommitted` mit Verbliste | `envelope.js:184–218`, Aufruf `world.js:597` | **unverändert** |
| **4. Kampf mit Erstschlag beginnt** | angenommenes `hostile`/`intent: attack` → `combat.js` `first_strike`; Hinterhalt nur bei unaufmerksamem Ziel | `combat.js:209–212`, `:1278–1300` | unverändert |

### 4.2 Reihenfolge in `envelopeAllows` [C]

1. Unbekannte oder Nicht-Akteure werden durchgelassen (`:553`).
2. **PULSE-Sperre** für in dieser Antwort Neue (`:558–572`). Ausnahmen: laufender Kampf, Slotgegner dieses Zugs (`aheadBorn`, K1), gesuchte Kontakte und Jagdhabitat (`soughtMatch`), offenes Gefahrenfenster (erste Gruppe).
3. **Straßenregel** (`:573–580`), wenn PULSE nicht regiert und der Weg ruhig ist.
4. **Temperament** (`mayOpenFight`, `:581`).
5. **Vollzug** (`attackCommitted`, `:597`).

Die Straßenregel ist erreichbar (F4). Wer sie als tot entfernt, lässt auf jedem Weg aus einem Dungeon hinaus neue Angreifer ohne Sperre zu.

### 4.3 Bewertung

- **Fables positive Quelle** formuliert Schritt 2 und 3 logisch gleichwertig um. Sie erleichtert die Diagnose („zugelassen durch: Slot“) und bietet einen Ort für künftige Quellen. Sie entfernt keinen Code.
  - **Eingeschränktes GO:** nur zusammen mit der nächsten notwendigen Änderung an dieser Funktion, nicht als eigener Build.
- **`attackCommitted` für Slot- und Fenstergegner überspringen: NO-GO.**
  - DUNGEON AHEAD und PULSE entscheiden Anwesenheit, keinen Angriff (F5).
  - Natürliche Fehler der Prüfung sind billig: Der Spieler behält die Initiative, und die Korrektur verbietet nur Erstschlag und Schaden. Ein falsch-positiver Angriff wäre teuer: freier Erstschlag mit Schaden.
  - Die Schieflage der Verbliste ist für diesen Zweck die richtige.
- **Keine neuen Verben** („came“, „coming across“). Das wäre U3 in Reinform, und die heutige Wirkung ist nicht schädlich.
- **GPTs Modell mit zwei Toren** (Autorisierung, Vollzug) ist das Zielbild. Der Code ist bereits so gebaut; es fehlt nur die benannte Quelle in der Diagnose.
- **T65 nach K1:** Den verlorenen ersten Hieb verursachte auf `.174` die PULSE-Sperre, die die Gegner nicht buchte. Seit `.175` sind sie gebucht. Ein Angriff des Spielers im nächsten Zug eröffnet den Kampf normal [P]. Aus T65 folgt kein weiterer V2-Bedarf.

### 4.4 Eigene Option: Eröffnungslage von Engine-Begegnungen

Für Begegnungen, die die Engine selbst stellt (DUNGEON AHEAD, Wanderminion, PULSE-Gefahr), könnte sie **vor** der Erzählung entscheiden, ob die Gruppe angreifend, wachsam oder ahnungslos eröffnet. Dafür gibt es vorhandene Aufmerksamkeits- und Stealth-Regeln. Das wäre U1 richtig angewandt: Die Engine entscheidet, was sie entscheiden kann, und für diese Fälle entfiele die Verbprüfung.
- **Kosten:** eine neue Vorabentscheidung (M) und eine Kanonergänzung in §7/§8.
- **Risiko:** Dungeons wirken gescriptet.
- **Daten:** 4 natürliche Fälle in 3 Läufen, geringe Schwere.
- **Urteil: optional, weitere Daten nötig.**

### 4.5 Urteil V2

| Teil | Urteil |
|---|---|
| Zwei Tore (zugelassen / ausgeführt) als Zielbild | **GO** (beschreibt den Ist-Zustand) |
| Positive Quellentabelle statt Veto mit Ausnahmen | **eingeschränktes GO**, nur beim nächsten Anfassen |
| `attackCommitted` für Slot- und Fenstergegner überspringen | **NO-GO** |
| Straßenregel entfernen | **NO-GO** |
| Neue Angriffsverben | **NO-GO** |
| Eröffnungslage per Engine | **weitere Daten nötig** |

---

## 5. V4 – Preisbelege und Reparaturen

### 5.1 Fables §13 am Code [C]

| Befund | Stelle | bestätigt? |
|---|---|---|
| B-1: Mehrfachzitat endet bei Spielerpreisen in `quote_not_found` | `playerPrice` gibt `within: findQuote(...)` weiter (`finance_evidence.js:294`). Bei `ambiguous` fehlen `start`/`end`, also liefert `findQuote(…, within)` `missing` (`:38`). Der Zweig bei `:84` wird nie erreicht | **ja** |
| B-2: Nach der Reparatur gilt der Plan oder der Zug ist verloren | `runtime.js:270–284`, Ergebnis `:322` | **ja** |
| B-3a: Zielkauf mit ungeprüftem `max_cp` | `commands.js:1751`: `Number.isInteger(c.max_cp)` statt `provenNumber` | **ja** |
| B-3b: Rabattsperre durch ungeprüfte Zahl aufhebbar | `trade.js:114` | **ja** |
| Weitere erlaubende Nutzung einer ungeprüften Zahl? | `pay` als Kauf: nur `proven` (`commands.js:1105–1107`). Lokaler `buy`: `provenNumber` (`:1134`). `sell`: `provenNumber` (`:1170`). `acceptanceWhy`: Zahlen nur sperrend, außer bei der Rabattsperre | **nein**. Die Liste aus §13 ist vollständig |

### 5.2 Zwei weitere Befunde

**B-4 – Designkommentar und Code widersprechen sich [C].** `interpret.js:209–213` sagt: „missing evidence is no error here: the handler then treats the number as unproven (no payment, no limit, no price consent), never as given.“ Der Code unterscheidet aber zwei Fälle:
- Belegfeld fehlt: kein Fehler (`:232`).
- Belegfeld vorhanden, aber nicht auffindbar: Fehler (`:240`) mit Reparatur und möglichem Zugverlust.

Ein Modell, das sauber zitiert, wird damit härter bestraft als eines, das gar nicht zitiert. Fables S3 behebt das nur nach der Reparatur. Folgerichtig wäre: „nicht auffindbar“ wird wie „fehlt“ behandelt, also als **Hinweis** über den vorhandenen `financeHints`-Weg (eine Reparatur, danach gilt der erste Plan), nicht als Fehler.

**B-5 – Der G2-Schutz existiert auf dem häufigsten Weg nicht [C].** Beispiel: Der Spieler sagt „I'll give you ten for it“, das Angebot steht bei 14.
- Liefert der Planner `offer.accept` mit `agreed_cp: null` oder 14 und `price_evidence: null`, prüft `amountErrors` nichts.
- `financeHints` greift nicht, weil „ten“ kein Münzwort trägt (`economy.js:109`).
- `acceptanceWhy` findet keinen Widerspruch. Gebucht werden 14 cp.

Die „zweite Chance“ aus G2 besteht nur, wenn das Modell zufällig falsch zitiert. In den vier beobachteten `offer.accept`-Reparaturen (T40, T48, T54, T55) hat die Reparatur nur Beleg- oder Zahlfeld geändert, nie die Annahme selbst [Ü, Fable §13.3]. Den eigentlichen Schutz gegen ein als Annahme missverstandenes Gegenangebot liefert die Plannersemantik, nicht die Belegprüfung.

**Folgerung für S2:** Bedingung 3 („die Nachricht nennt keinen anderen Betrag“) ist als **Ausnahmebedingung** richtig, denn wer sie verfehlt, landet beim heutigen Weg. Als **allgemeine neue Sperre** für alle Annahmen wäre sie schädlich: Mengenwörter („the two pelts“, „both“, „three arrows“) würden normale Käufe blockieren. Das beantwortet GPTs offene Frage zu S2.

### 5.3 Eigene Fassung des V4-Pakets

| Teil | Inhalt | Urteil |
|---|---|---|
| **P1a = S1** | Bei `ambiguous` wertet `playerPrice` alle Fundstellen über die vorhandene `.143`-Regel in `moneyLiteral` aus. Technisch: `within` ist die ganze Nachricht statt des Trefferobjekts. Alle Fundstellen müssen denselben Gesamtbetrag ergeben | **GO**, notwendig (Bugfix, wenige Zeilen) |
| **P1b** | Zielkauf mit `provenNumber` (`commands.js:1751`); ohne belegtes Limit und ohne `any_price` gilt die heutige „arrival pending“-Zeile | **GO**, notwendig, unabhängig von V4 |
| **P1c** | Die Rabattsperre fällt nur bei geprüftem Betrag: `playerPrice` verifiziert, gleich dem Gesamtpreis. Sonst `clarify` | **GO**. Designentscheidung: geprüfte Evidenz, keine neue Pflichtbestätigung |
| **P1d = S2** | Gleichpreis-Ausnahme bei `offer.accept` mit allen vier Bedingungen aus §13.6, nur als Ausnahme | **GO** |
| **P1e = S3'** | Ein nicht auffindbarer Beleg an `max_cp`/`min_cp` ist ein Hinweis, kein Fehler. Das ist B-4 im Sinn des eigenen Designkommentars. Widersprüchliche, unvollständige und mehrdeutige Beträge mit verschiedenen Werten bleiben Fehler | **GO nach P1b** |
| **P1f** | Erste Planner-Antwort mit größerem Ausgabebudget (die Wiederherstellung nutzt schon 4000) oder eine harte Reasoning-Grenze | **GO** (Konfiguration, S); Kosten je Aufruf messen |
| **P1g** | Befehlsgenaue Planerhaltung: Ein Befehl, der nach der Reparatur noch fehlerhaft ist, entfällt mit seinen `needs`-Abhängigen und seiner Handelsgruppe; der Rest des Plans bleibt | **weitere Daten nötig** (Fall T54) |
| §9-Fassung: Beleg bei gleichem Preis immer überspringen | – | **NO-GO** (G1–G3) |
| Zahl oder Beleg lokal auf `null` setzen | – | **NO-GO** (G4, G6) |
| Bedingung 3 als allgemeine Sperre | – | **NO-GO** (blockiert Mengenwörter) |

**Wirkung im Pilot** (aus dem Code abgeleitet, nicht ausgeführt [P]):
- P1a/P1d: T40, T48 und T55 ohne Reparatur.
- P1e: T38 wird ausgeführt.
- P1a: T54 wird nach seiner Reparatur ausgeführt.
- P1f: bis zu 4 Planner-Reparaturen weniger (die fünfte war ein Transportfehler).
- Insgesamt: Planner-Reparaturen von 16 auf etwa 9, verlorene Spielerzüge von 2 auf 0.

GPTs Vorbehalt gilt weiter: Das ist eine kontrafaktische Rechnung auf wenigen Fällen.

### 5.4 Urteil V4

**Eingeschränktes GO** für P1a–P1f als ein zusammenhängender, kleiner Fachpatch, getestet Rot/Grün mit:
- den ersten Planner-Antworten von T38, T40, T48, T54 und T55;
- G1–G6 als Gegenfälle;
- B-5 als neuem Gegenfall, der vorher und nachher gleich bleiben muss;
- G5, der vor P1b rot sein muss.

---

## 6. V3, V5–V9 und D3

| | Fable | GPT | Eigene Bewertung | Urteil |
|---|---|---|---|---|
| **V3** Besitzer als Feld | anstelle des nächsten D5-Merkmals | Gefahr einer zweiten Wahrheit | GPT hat recht: Lohnt nur, wenn `owner` ausschließlich durch von der Engine gebuchte Übergaben und ein strukturiertes Extractorfeld für erzählte Ladenware gesetzt wird, und `had_pc`/`laid_by_pc` als Herleitung dafür entfallen. Nur ein natürlicher Befund (Primer, B5); `.178`/`.179` gehen auf konstruierte Gegenproben zurück | **eingeschränktes GO beim nächsten natürlichen D5-Befund**, sonst nichts |
| **V5** `met`/`handled_by` ohne positive Verblisten | nach natürlichem Lauf | kein GO | GPT hat recht. Eigene Ergänzung: Statt die Erkennung zu lockern, könnte die Engine den Schalterbearbeiter **vor** der Erzählung benennen (U1), wenn genau ein bekannter Bearbeiter in Frage kommt. Dann entfiele `deskHandlingEvidence` für die Halle | **NO-GO jetzt; weitere Daten** (Lauf `.179`) |
| **V6** Tote Pfade | konstant auflösen | Nutzungskarte zuerst | GPT hat recht; F4 ist das konkrete Gegenbeispiel. Wirklich konstant in aktuellen Kampagnen sind `rulesetOf(s) >= 2`, `privateQuestsOf(s) === false` und `explicitTravel` (`runtime.js:127–147`). Verhaltensrelevante Zweige mit „older campaigns“ im Kommentar stehen unter Vorbehalt | **eingeschränktes GO, scheibenweise**, Replay-Differenz 0 |
| **V7** Korpus und Basis | Basis neu setzen | alte Kette nicht vernichten | Der Wert liegt im Korpus, nicht in der Basis. Pilot 01, User04 und die Batch-28-Fälle mit `no_go`/`scene_context` aufnehmen; sie sind die Rot/Grün-Basis für O1 und O2. Die Basis nur mit festem Git-Tag der alten Kette erneuern | **GO** (Korpus), **eingeschränktes GO** (Basis) |
| **V8** Guard-Bilanz, Ablehnungsvertrag | notwendig | hohe Priorität | Ergänzung: **Ursprünge zählen, nicht Ablehnungen** (19:77 in Batch 28). Erste Bilanz in §2 dieses Dokuments | **GO** (Bilanz), **eingeschränktes GO** (Vertrag beim Anfassen) |
| **V9** Wachstumsgrenze `applyWorld` | Arbeitsregel | Arbeitsregel | O1 und O2 halten sie ein: keine neue gemeinsame Variable | **GO** |
| **D3** `relevant`-Teillieferung | bestätigt | eigene Option | unabhängig von diesem Review; Spielerzitate nicht pauschal streichen | **GO** als getrennter kleiner Patch |

---

## 7. Kanon- und Designänderungen

### K-A – Ortsneutrale Weltfolgen bleiben gültig (O1)

| | |
|---|---|
| **Was die Regel schützt** | §2 Ankunft: keine Weltfolgen aus einer Szene, die kanonisch nicht erreicht wurde |
| **Problem** | Die Schutzregel gilt auch für Fakten, Absprachen und Namen, die keinen Ort haben. Pilot: 3 von 4 Chronologie-Reparaturen. Batch 28: bis zu 47 von 96 Ablehnungen. Kaskade: 19 Ursprünge, 77 Folgen |
| **Alternative** | „Ortsgebundene Weltfolgen (Personen und Kreaturen in der Szene, Dinge an Orten, Angebote, Positionen, Erinnerungen) brauchen den tatsächlich erreichten Ort. Ortsneutrale Folgen (Fakten über Personen, Absprachen, Namen, Questdetails) bleiben gültig, auch wenn die Ortsbuchung scheitert.“ |
| **Was wegfällt** | Szenenpflicht für vier Meldungsarten in `sceneIssues` und in der Kaskade; damit ein Teil der Extractor-Reparaturen |
| **Neue Risiken und Abhängigkeiten** | Fakt mit Ortsbezug aus einer unautorisierten Szene; optional Fakten mit Ort als Subjekt ausnehmen |
| **Spielerfreiheit, Tempo, Glaubwürdigkeit** | Glaubwürdigkeit steigt: Was der Spieler gelesen hat, bleibt bestehen (§2). Tempo: weniger Reparaturen. Keine Wirkung auf die Spielerhoheit |
| **Nutzen gegen Aufwand** | hoch gegen S–M → **GO** |

### K-B – Teilbewegung innerhalb desselben Gebäudes (O2)

| | |
|---|---|
| **Was die Regel schützt** | keine Bewegung ohne Spielerentscheidung |
| **Problem** | „I take the small room“ führt in der Erzählung ins Zimmer; der Zustand bleibt im Schankraum, und die Meldungen danach werden verworfen. Die Ausnahme dafür ist seit `.99` für Ruleset 2 abgeschaltet |
| **Alternative** | §2 ergänzen: „Eine gewöhnliche Teilbewegung innerhalb desselben Gebäudes oder Anwesens (Zimmer, Hof, Schalter), ohne Tor, Hindernis, Dungeon, Kampf oder Stealth, gehört zur gewählten Handlung und braucht kein eigenes GO.“ (§3 konkretisiert) |
| **Was wegfällt** | `lodgedHere`/`roomOfHere` als Ruleset-1-Sonderfall (`world.js:121–122`, `firewall.js:400`) |
| **Neue Risiken und Abhängigkeiten** | Erzähler führt den PC in einen Nebenraum, den der Spieler nicht wollte. Begrenzt auf das Gebäude, keine Folgen für Geld oder Kampf |
| **Spielerfreiheit, Tempo, Glaubwürdigkeit** | Tempo und Glaubwürdigkeit steigen. Die Hoheit über echte Ortswechsel bleibt |
| **Nutzen gegen Aufwand** | mittel gegen S → **eingeschränktes GO** |

### K-C – Eine unbelegte Zahl erlaubt nie etwas (V4)

| | |
|---|---|
| **Was die Regel schützt** | Zustimmung zu Preis und Kauf (§2 Handel) |
| **Problem** | Zwei Stellen nutzen eine ungeprüfte Planner-Zahl erlaubend: Zielkauf und Rabattsperre (B-3). Gleichzeitig bestraft die Belegprüfung sauberes Zitieren härter als gar keines (B-4) |
| **Alternative** | §2 Handel ergänzen: „Eine vom Planner genannte, nicht belegte Zahl kann nur sperren. Sie erteilt keine Vorabzustimmung und hebt keinen Rabattwunsch auf. Ein nicht auffindbarer Beleg gilt als kein Beleg, nicht als Fehler.“ |
| **Was wegfällt** | Zugverluste durch Belegfehler bei `buy`/`sell`; ein Teil der Reparaturen |
| **Neue Risiken und Abhängigkeiten** | mehr Ergebnisse „Preis offen“; kein Kauf ohne Zustimmung |
| **Spielerfreiheit, Tempo, Glaubwürdigkeit** | Spielerfreiheit: Zustimmung wird strenger geschützt als heute. Tempo: weniger verlorene Züge |
| **Nutzen gegen Aufwand** | hoch gegen S → **GO** |

### K-D – Engine-bestätigte Ankunft (V1)

| | |
|---|---|
| **Was die Regel schützt** | siehe §3.1 |
| **Problem** | Folgebefehle nach einem GO brauchen einen zweiten Zug |
| **Alternative** | Fables V1 (§3.7) |
| **Was wegfällt** | nichts (§3.6) |
| **Neue Risiken und Abhängigkeiten** | zweiter Ankunftspfad, früher PULSE-Anspruch, Text und Zustand laufen bei Unterbrechung auseinander |
| **Spielerfreiheit, Tempo, Glaubwürdigkeit** | kleiner Tempogewinn (etwa 1–3 Züge pro Lauf), da Anwesenheit und Preis offen bleiben |
| **Nutzen gegen Aufwand** | gering gegen L → **NO-GO** (jetzt) |

### K-E – Eröffnungslage von Engine-Begegnungen (optional)

| | |
|---|---|
| **Was die Regel schützt** | Drohung ist kein Angriff, Erstschlag nur nach Vollzug |
| **Problem** | Anlauf-Formulierungen werden nicht als Angriff gelesen (3 von 4 natürlichen Fällen) |
| **Alternative** | Bei Begegnungen, die die Engine stellt, entscheidet sie die Eröffnungslage vor der Erzählung (§4.4) |
| **Was wegfällt** | die Verbprüfung für diese Klasse |
| **Neue Risiken und Abhängigkeiten** | Begegnungen wirken gescriptet; neue Vorabentscheidung |
| **Spielerfreiheit, Tempo, Glaubwürdigkeit** | weniger widersprüchliche Korrekturen; der Spieler verliert in diesen Fällen den Vorteil der ersten Aktion |
| **Nutzen gegen Aufwand** | gering bis mittel gegen M → **weitere Daten nötig** |

### Arbeitsregeln (zu Fable §11)

| Fable-Regel | Bewertung |
|---|---|
| 1. Die Engine entscheidet vorher, was sie vorher wissen kann | **zustimmen, mit Zusatz:** „… was sie tatsächlich weiß“. Einen Gegner zu stellen heißt nicht, seinen Angriff zu kennen; ein Weg ohne Ereignis heißt nicht, dass die Ankunft feststeht |
| 2. Eine Tatsache, ein Schreiber | zustimmen; mit GPTs Abgrenzung (originäre Erzählfolgen brauchen ihren Weg) |
| 3. Kein neues positives Vokabular | **präzisieren:** Positive Listen sind nur dort zulässig, wo ein falsch-negatives Ergebnis billig ist (Spieler behält die Wahl: Angriffsvollzug). Nicht dort, wo es legitime Handlungen oder Kontinuität blockiert (`met`, `handled_by`) |
| 4. Der zweite Fix an derselben Stelle ist ein Strukturfall | zustimmen |
| 5. Ein P2 ohne natürlichen Beleg nur bei Geld, Kampf oder Quest | GPTs Fassung übernehmen |
| 6. Jeder Patch nennt, was er entfernt | zustimmen |
| **neu: 7.** Ortsbindung nur für ortsgebundene Folgen | aus K-A |
| **neu: 8.** Ablehnungen nach Ursprung zählen | Kaskaden als eine Ursache berichten; eine Guard-Bilanz bewertet Ursprünge |

---

## 8. Priorisierte Maßnahmen

### Notwendig

| | Maßnahme | Urteil | Aufwand |
|---|---|---|---|
| N1 | **Natürlicher Lauf auf `.179`** (bereits geplant), ausgewertet mit Guard-Bilanz nach Ursprüngen (V8), Zählung „GO + Folgebefehl“ nach Klassen (§2.2) und „Bewegung ohne GO“ | **GO** | Lauf + S |
| N2 | **P1a** (S1), **P1b** (Zielkauf `provenNumber`), **P1c** (Rabattsperre geprüft) | **GO** | S |
| N3 | **P1f** Planner-Ausgabebudget der ersten Antwort | **GO** | S (Konfiguration) |

### Sinnvoll

| | Maßnahme | Urteil | Voraussetzung |
|---|---|---|---|
| S1 | **O1** Ortsprüfung nur für ortsgebundene Meldungen | **GO** | Kanonentscheidung K-A |
| S2 | **P1d** (S2) und **P1e** (S3') | **GO** | P1b |
| S3 | **V7** Korpus ergänzen (Pilot, User04, Batch-28-Ortsfälle) | **GO** | – |
| S4 | **O2** Teilbewegung im Gebäude | **eingeschränktes GO** | Kanonentscheidung K-B |
| S5 | **V6** scheibenweise, mit Nutzungskarte | **eingeschränktes GO** | Replay-Differenz 0 |
| S6 | **D3** Teillieferung | **GO** | getrennt |

### Optional

| | Maßnahme | Bedingung |
|---|---|---|
| O-1 | **O3** Suche am Ziel vorab würfeln | N1 zeigt „GO + Suche“ als häufige Reibung |
| O-2 | **O4** Mitgehen bei Arbeit oder Begleitung | N1 zeigt die Klasse auf dem aktuellen Build |
| O-3 | **V2** Quellentabelle | beim nächsten Anfassen von `envelopeAllows` |
| O-4 | **V3** Besitzerfeld | nächster natürlicher D5-Befund |
| O-5 | **V5** oder Bearbeiter vorab benennen | N1 zeigt weiter schwache Erkennung |
| O-6 | **P1g** befehlsgenaue Planerhaltung | weitere Zugverluste mit gemischten Plänen |
| O-7 | **K-E** Eröffnungslage | mehr natürliche Anlauf-Fälle mit spürbarem Nachteil |
| O-8 | **V8** Ablehnungsvertrag | beim Anfassen |

### Nicht empfohlen

| Maßnahme | Grund |
|---|---|
| V1-eng jetzt (K-D) | kein Pfad entfällt, kleiner Nutzen (§3.9) |
| V1-total | nicht entscheidbar ohne Reisezeitmodell und Ortserzeugung |
| `attackCommitted` für Slot- und Fenstergegner überspringen | Autorisierung ist nicht Vollzug (§4.3) |
| Straßenregel als tot entfernen | erreichbar (F4) |
| Neue Angriffs- oder Anwesenheitsverben | U3 |
| V4 in der §9-Fassung; lokale Normalisierung auf `null`; Bedingung 3 als allgemeine Sperre | G1–G6, Mengenwörter |
| Baseline-Reset ohne historische Referenz | GPT §14.6 |
| Neuaufteilung von `applyWorld`, WorldTxn, allgemeines Identitätssystem | weiterhin ohne belegten Nutzen |

---

## 9. Was unverändert bleiben sollte

- **Fold-Schutz `.127`**, Eventmodell, Records, Swipe- und Reload-Verhalten.
- **Buchungsfunktionen** (`bookPurchase`, `bookSale`, `acceptBid`, `pickLines`) und die Finanzregeln `.142`–`.145`: Endsumme, natives `#pay`, `max_cp` bindend auch mit `any_price`, `unitOnly`, sperrende Wirkung von `acceptanceWhy`.
- **Firewall-Autoritätstabelle**, einschließlich `no_go` für echte Ortswechsel. Nur die Gebäudegrenze (K-B) ist eine Präzisierung.
- **Decision Ownership** (`ownership.js`).
- **PULSE:** Wurf, Parameter, Fensterlogik, Rast (Paket C), Dungeon (Paket B), **Straßenregel für Wege aus dem Dungeon**.
- **DUNGEON AHEAD**, Slotidentität, K1.
- **GO-Handler und `arrive()`** mit allen Ankunftsfolgen; Gildenbedingungen, `hand_over`, vorab gewürfelte Fallen.
- **`sceneIssues` und `scene_context` für ortsgebundene Meldungen.**
- **`envelopeAllows` und `attackCommitted`** in ihrer Logik; `mayOpenFight`; Hinterhalt nur bei unaufmerksamem Ziel.
- **E2-A-Evidenz** (`metEvidence`, `deskHandlingEvidence`) bis zur natürlichen Messung auf `.179`.
- **Absprachenidentität** nach `.177`/`.178` (D1); die Grenze „gleiche Parteien, andere Sache“ akzeptieren.
- **D5 nach `.179`**: kein weiterer Herkunftsfall ohne natürlichen Beleg.
- **Agency-Guard**, Fail-soft, Recovery.
- **Replay-Mechanismus** mit Einzelfreigabe per Fingerprint.
- **Kontextbudget und Prioritäten** (D3: nur Teillieferung).

---

## 10. Abhängigkeiten, Umsetzungspakete und Nutzerentscheidungen

### 10.1 Abhängigkeiten

```
N1 natürlicher Lauf .179 ──► Guard-Bilanz ──► Entscheidung O3, O4, V5, (V1 mit Personal)
P1b Zielkauf ──► P1e (S3')
K-A ──► O1 ──► V7-Korpus mit Batch-28-Ortsfällen als Rot/Grün
K-B ──► O2
P1a, P1c, P1d, P1f: unabhängig
```

### 10.2 Mögliche Umsetzungspakete

| Paket | Inhalt | Abnahme |
|---|---|---|
| **A – Preisbelege und Budget** | P1a–P1f | Rot/Grün mit T38, T40, T48, T54, T55; G1–G6 und B-5 als Gegenfälle; G5 vor P1b rot; Vollsuite, Replay; ST-Smoke nur bei Host-Änderung. Budget: Vorher/Nachher der `finish`-Gründe im nächsten Lauf |
| **B – Ortsbindung** | O1, O2, V7-Korpus | Rot/Grün mit Batch-28-rec6/7, 73, 233, 476–545 und den vier Pilot-Chronologiereparaturen; Gegenfälle für ortsgebundene Meldungen (`person.new` an unbestätigtem Ort bleibt abgelehnt); Vollsuite, Replay mit Einzelfreigabe, ST-Smoke (Extractor-Vertrag) |
| **C – Pflege** | V6 scheibenweise, D3 | Replay-Differenz 0 (V6); D3 wie in der D3-Analyse |

**Reihenfolge:**
1. N1, der natürliche Lauf. Er misst `.175`–`.179` getrennt von neuen Änderungen.
2. Paket A.
3. Kanonentscheidungen K-A und K-B, dann Paket B.
4. Optionale Punkte nach Bilanz.

Paket A darf vor N1 laufen, wenn der Lauf ohnehin erst später möglich ist. Es berührt NPC und PULSE nicht.

### 10.3 Erforderliche Entscheidungen des Nutzers

| # | Entscheidung | Empfehlung |
|---|---|---|
| E1 | **K-A:** Ortsneutrale Folgen bleiben gültig, auch wenn die Ortsbuchung scheitert? Welche Meldungsarten? | ja; `fact`, `thread`, `person.named`, `quest.detail` |
| E2 | **K-B:** Teilbewegung im selben Gebäude ohne GO? Umfang Gebäude oder Siedlung? | ja, nur Gebäude/Anwesen |
| E3 | **Rabattsperre:** Aufheben nur mit geprüftem Betrag, oder neue Bestätigung? | geprüfter Betrag, sonst `clarify` |
| E4 | **Planner-Budget:** größere erste Ausgabe oder Reasoning-Grenze? | größere erste Ausgabe; Kosten messen |
| E5 | **V1** jetzt zurückstellen? | ja; Wiedervorlage nur mit Daten aus N1 und einer Entscheidung zur Anwesenheit des Personals |
| E6 | **Reihenfolge:** Paket A vor oder nach dem natürlichen Lauf? | nach dem Lauf, wenn er zeitnah möglich ist; sonst vorher |

---

## 11. Grenzen dieses Reviews

- **Keine Ausführung.** Alle Wirkungen geplanter Änderungen sind aus dem Code abgeleitet [P].
- **Drei Läufe auf drei Builds.** Der `scene_context`-Befund (77 von 96) stammt aus einem einzigen Lauf mit starkem Arbeits- und Unterkunftsprofil; Pilot und User04 zeigen die Klasse nicht. Der Mechanismus besteht auf `.179` unverändert. Seine Häufigkeit auf dem aktuellen Build ist offen; N1 soll sie messen.
- **Klassifikation von Hand.** Die Einordnung der 25 „arrival pending“-Datensätze und der 18 Ursprünge beruht auf Eingabetext, Befehlen und Ereignissen. Einzelne Fälle können anders gelesen werden. Die Größenordnung ist belastbar.
- **Übernommen:** Fables Zählungen zum Codewachstum (§2.1) und die Klassifikation der elf Preisreparaturen (§13.3). Stichprobenhaft bestätigt habe ich T38–T40, T48 und T54–T55 über die Codepfade, nicht jede Anfrage einzeln.
- **Nicht untersucht:** Kampfengine im Detail, Wachstum, Board, UI, Runner.
- **Keine Freigabe.** Jede Maßnahme braucht einen eigenen Auftrag; K-A und K-B zusätzlich eine Kanonentscheidung.


---

## 12. Unabhängiger GPT-Nachreview der Opus-5.5-Analyse

**12.11.2026 · eigenständiger Gegenreview; nur Dokumentation, keine Implementierung und keine Kanonentscheidung.**

**Prüfstand:** Opus-Dokument `7ac6a370be5fa7dd27ea331328fab53421214282` auf `main`; Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666` auf `59f868eaf3c4ed7942ddc42ba3d180fab44a72cd` (`.179`). Dieser Abschnitt ergänzt **die unveränderten Opus-§§0–11** und bezieht sich auf Fables §§1–13 sowie GPTs vorausgegangenen §14 in [dem Fable-Audit](ARCHITEKTUR_AUDIT_10B_FABLE.md), [Kanon 02](../02_DESIGN_KANON.md) und [Arbeitsweise 01](../01_ARBEITSWEISE_CHATGPT_CLAUDE.md).

**Unabhängig am Produktcode kontrolliert:** `src/v4/pulse.js` (`pulseBegin`/`dynamicReason`/`pulseFinish`), `commands.js` (GO, `afterTravel`, Zimmer-/Handels-/Zielkaufpfade), `world.js` (`sceneIssues`-Anwendung, `scene_context`, `fact`/`thread`/`person.named`/`quest.detail`, `envelopeAllows`), `extract.js` (`localSceneDelta`/`sceneIssues`), `firewall.js` (`no_go`), `dungeon.js` (`complexOf`), `finance_evidence.js`/`interpret.js`/`planner.js`/`trade.js`/`runtime.js` (Belege, Reparaturen, Ausgabebudget). **Nicht unabhängig neu ausgeführt:** Opus' Python-Zählung der Originalarchive, Node-/Replay-/ST-Tests oder Modellläufe. Seine historischen Quoten werden hier als **von Opus gezählte Daten** und nicht als eigene GPT-Zählung bezeichnet.

### 12.1 Gesamturteil und wesentliche Korrektur der bisherigen GPT-Priorisierung

**Opus' Gegenreview ist eine inhaltliche Verbesserung gegenüber der ursprünglichen Fable/GPT-Priorisierung.** Seine eigene Analyse der tatsächlichen Ankunfts- und `scene_context`-Fälle ist genau die zuvor fehlende Prüfung. Auf ihrer Grundlage **nehme ich meine frühere Einstufung von V1 als höchstrangiger Architekturentscheidung zurück**: Die enge vorab gebuchte Ankunft bringt in den drei analysierten historischen Läufen nach Opus wesentlich weniger unmittelbaren Gewinn, als Fables 11/11-Zahl vermuten ließ.

Die nachgemeldeten Größen – **77/96 `scene_context`-Ablehnungen in Zügen ohne GO**, **1/2 `arrival pending` im Pilot** und **ca. 2–3/25 in Batch 28** durch enges V1 unmittelbar lösbare Fälle – sind **Opus' Originaldatenzählungen**. Sie sind angesichts der vorhandenen Codepfade plausibel, in dieser GPT-Prüfung aber nicht unabhängig nachgezählt. **Keine dieser Zahlen belegt für sich eine falsche Ablehnung.** Eine verweigerte Ankunft kann vollkommen korrekt sein; davon abhängige spätere Meldungen aus der unerreichten Szene können korrekt verworfen werden.

**V1 jetzt zurückzustellen ist deshalb sinnvoll.** Die Aussage „V1 entfernt keinen bestehenden Pfad“ gilt für die **enge Fable-Variante ohne weitere strukturelle Zusammenführung**: Unbekannte Ziele, Stealth, Gate-/Dungeon- und unterbrochene Reisewege brauchen die bisherigen Pfade weiterhin. Das ist eine starke *Netto-Wartbarkeits-Einwendung*, aber **kein Beweis**, dass jede denkbare künftig gemeinsame Ankunfts-API wertlos wäre. Auf neue natürliche Daten oder einen echten Ersatz alter Pfade könnte V1 erneut geprüft werden. **Kanonänderungen bleiben ausdrücklich möglich, wenn der Nutzen dann belegt wird.**

Weitere Ergebnisse, denen GPT nach Codekontrolle zustimmt:
- **Straßenregel lebt.** Bei einem aus dem Living Dungeon ausgehenden Reiseleg kann `pulseBegin` `governs:false` setzen; `dynamicReason` ergibt `dungeon_leg`, und `pulseFinish` setzt bei Reise ohne offenes Gefahrenfenster `auth.road='quiet'`. Der `else if (!pulse?.governs && auth.road === 'quiet' …)`-Zweig in `world.js` bleibt dann erreichbar. Fables pauschaler „toter Pfad“ war falsch.
- **V2 trennt Berechtigung vom Vollzug.** `mayOpenFight`/PULSE/DUNGEON AHEAD autorisieren eine Konstellation, aber erst `attackCommitted` belegt einen **ausgeführten** Angriff. Die Verbprüfung nicht allein wegen der Slotbindung löschen. Ein Anlauf-/Drohungssatz ist nicht automatisch ein vollzogener Erstschlag.
- **V4's konkrete Codefehler bestehen.** `playerPrice` gibt bei mehrfachen Zitaten ein `within` ohne eindeutige Grenzen weiter; `amountErrors` kann reparaturpflichtig scheitern; `destinationBuy` übernimmt `max_cp` ungeprüft; `acceptanceWhy` lässt eine unbelegte gleiche Zahl ein Rabattmuster aufheben. Die normale Planner-Erstantwort erhält derzeit 2000 Ausgabetokens, die leere Wiederherstellung 4000.

### 12.2 Ein erheblicher Einwand gegen Opus' O1/K-A: „ortsneutraler Typ“ heißt nicht „ortsunabhängige Ursache“

**O1 ist die wichtigste neue Architekturidee von Opus – aber in der vorgeschlagenen pauschalen Fassung derzeit nicht freigabereif.**

Opus will `fact`, `thread`, `person.named` und `quest.detail` aus der chronologischen/örtlichen Prüfung entfernen. Dass diese Meldungsarten keine physische Ortsbewegung *buchen*, ist richtig. Daraus folgt **nicht**, dass die **im Bericht behauptete Handlung oder Information** unabhängig von einer abgelehnten Ankunft tatsächlich stattgefunden hat.

**Codebelegte Schutzgrenze:**
- `src/v4/extract.js` definiert `localSceneDelta` derzeit nach Meldungsart und verlangt für sie je nach Ankunftsfolge ein eindeutiges früheres Szenenlabel. Eine Ausnahme von diesen vier Arten würde die vorbereitende `sceneIssues`-Prüfung aufheben.
- In `src/v4/world.js` gibt es **zwei verschiedene Stellen**, die dafür relevant sind: die erste Bedingung mit `localSceneDelta(d)` für Chronologie/fehlgeschlagene Reise und **daneben** die Prüfung `origin != null && !sceneMatches(origin)` ohne `localSceneDelta`. Ein alleiniger Eingriff in `localSceneDelta` beseitigt die zweite Prüfung **nicht**. Sie einfach ebenfalls global aufzuweichen, beseitigt aber einen echten Kausalitätsschutz.
- `case 'fact'` bucht einen Fakteneintrag, wenn Identität/Ownership und weitere Regeln stimmen; der Bericht muss nicht schon durch eine belegte lokale Begegnung legitimiert sein. `case 'thread'` kann eine persönliche Zusage/Schuld erstellen oder aktualisieren; `threadEvents` schützt Parteien/IDs, **nicht** die Erzählursache einer unautorisierten Ortsänderung. `case 'person.named'` kann einen bereits bekannten NPC dauerhaft umbenennen. `case 'quest.detail'` speichert notfalls Zeitplan und Notiz. Alle vier können somit **Fakten aus einer Szene perpetuieren, die die Engine gerade als nicht erreicht bewertet hat**.

**Konkrete negative Szenarien, vor Umsetzung als Gegenfälle zu prüfen:**
1. Alaric bleibt am Gasthaus; der Narrator versetzt ihn ohne GO zur Mühle, lässt ihn dort mit Muller eine neue Schuld vereinbaren, die er anschließend als `thread` meldet. `arrive` wird mit `no_go` abgelehnt. Eine pauschale O1-Ausnahme dürfte **die dort nie geschlossene Schuld nicht als bestehende Absprache verbuchen**.
2. Ein bekannter namenloser NPC wird nur in der unerreichten Szene als „Bess“ vorgestellt. Ein freigestelltes `person.named` könnte den dauerhaften Namen trotzdem übernehmen, obwohl die Begegnung nicht stattfand.
3. Eine Questnotiz legt eine neue Route/Frist fest, die ausschließlich während einer nicht erreichten Begegnung mit dem Auftraggeber genannt wurde. Ein `quest.detail` ohne Orts-/Quellbeleg könnte dadurch falsche Vertragsinformationen fortschreiben.
4. **Positiver Gegenfall:** Eine Person am **wirklich erreichten Ausgangsort** berichtet über ein entferntes Ereignis; es wird als `fact`/`thread` aufgenommen, obwohl ein anderer, späterer und nicht erreichter Ortswechsel im selben Erzählertext scheitert. Ein solcher *unabhängiger* Bericht soll erhalten bleiben, mit korrekter Quellen-/Chronologiebindung.

Opus beruft sich auf Kanon §2 („ein tatsächlich gemeinsam erlebter Vorgang bleibt etabliert“). **Das Wort „tatsächlich“ ist entscheidend:** Ein Vorgang, dessen einziges Fundament eine *nicht autorisierte* Ortsverlegung ist, wurde im kanonischen Spiel **nicht gemeinsam erlebt**. Die bestehende Integritätsregel darf nicht versehentlich dadurch umgekehrt werden.

**GPT-Empfehlung zu E1/K-A:** **Eingeschränktes GO nur für einen kausal belegten Sonderfall**, **kein pauschales GO für die vier Typen**. Erst alle tatsächlich **unabhängigen** Ortsneutralfälle von den aus einer unerreichten Szene **abhängigen** Meldungen trennen. Dazu Originalfälle aus Batch 28 und die vier Pilot-Chronologiereparaturen konkret einzeln einstufen. Benötigt wird eine nachprüfbare Herkunfts-/Abhängigkeitsregel (etwa Quelle im erreichten Ausgangsort, belegter Fernbericht oder klarer Schritt **vor** der verweigerten Ankunft), nicht nur eine Whitelist von vier Typnamen. Wenn diese Regel zu teuer/komplex wird, lieber die bestehenden Prüfungen und präzisere Extractor-Szenenlabels beibehalten.

### 12.3 O2/K-B: Gute QoL-Idee, aber eine Topologieprüfung ist keine Spielerzustimmung

Opus begrenzt O2 auf Zielorte innerhalb desselben Gebäudes/Anwesens ohne Kampf, Dungeon, Stealth oder gesperrten Weg. Das ist **viel sicherer** als eine generelle siedlungsinterne Freigabe. Dennoch kann `complexOf` in `src/v4/dungeon.js` lediglich die Zugehörigkeit zu einer Kette von `site`-/`interior`-Orten feststellen; es belegt **keine freiwillige Spielerentscheidung**, in einen anderen Raum zu gehen.

**Risiko:** Der Spieler bestellt am Tresen ein Getränk, der Narrator verlegt ihn unbeauftragt in ein angrenzendes privates Zimmer oder in einen Hof; eine automatisch akzeptierte `arrive`-Meldung könnte dadurch Spielerhoheit verletzen, obwohl der Ort topologisch „im selben Gebäude“ liegt. Ein bekannter Zimmerweg ist außerdem nicht zwingend frei zugänglich.

**Besserer Prüfmaßstab:** Die begrenzte Teilbewegung muss **aus dem vom Spieler autorisierten Vorgang folgen**, etwa „Ich nehme das gebuchte Zimmer und gehe hinauf“ oder eine notwendige, gewöhnliche Teilausführung einer ausdrücklich gewählten Handlung. Eine frühere Buchung oder plausible räumliche Nähe **allein** autorisiert keine neue Bewegung. Offene Zutritts-/Tür-/Stealth-/NPC-Hindernisse bleiben. Aus einem bloßen „Ich nehme das Zimmer“ ergibt sich nicht zwangsläufig, dass der Spieler bereits hineinlief; die Spielregel kann dies als kleine, erwartbare Teilhandlung zulassen, **wenn der Nutzer dies als gewünschtes QoL-Verhalten entscheidet**.

**GPT-Empfehlung zu E2/K-B:** **Grundsätzlich JA für Gebäude/Anwesen, nicht ganze Siedlung; aber nur bei nachweisbarem Handlungsbezug**. Eine allumfassende Kind-/Eltern-/Geschwister-Ausnahme ohne Bezug zur Eingabe ist **NO-GO**. Dass die frühere Ausnahme in `.99` bewusst deaktiviert wurde, muss bei den Gegenfällen berücksichtigt werden.

### 12.4 V4, Planner und Preise: Opus überzeugt – die Sicherheitsbedingungen bleiben wichtig

**Positiv bestätigt:**
- Die Inkonsistenz zwischen `findQuote`/`playerPrice` und der bereits vorhandenen Toleranz in `moneyLiteral` ist eine **enge, codebelegte Fehlerursache**. **P1a/S1** verdient einen kleinen Fachpatch mit Originalfällen und negativen Mehrfachpreis-/Mehrfachaktionsfällen.
- `commands.js` eröffnet bei `buy` nach `go` eine aufgeschobene Kaufentscheidung mit einer unbewiesenen ganzzahligen `max_cp`. Das widerspricht dem Prinzip aus den direkten Kaufpfaden. **P1b** sollte den gleichen `provenNumber`-Vertrag benutzen; `any_price` und ein vorhandenes explizites Limit müssen gleichzeitig bindend bleiben.
- `trade.js acceptanceWhy` kann die Rabatt-/Gegenangebotsgrenze über den ungeprüften Vergleich `agreed_cp === total` aufheben. **P1c** sollte dies nur bei **belegter Akzeptanz** zulassen und keine zusätzliche universelle `#pay`-Bestätigung für normale Käufe einführen.
- Der `amountErrors`-Unterschied zwischen „Beleg fehlt“ und „Beleg angegeben, nicht auffindbar“ ist tatsächlich streng und kann bis zum `NOT EXECUTED` führen. **P1e/S3'** als Hinweis-/Soft-Fall ist sinnvoll **nach** allen erlaubenden Vorabzustimmungspfaden, nicht als globale Nullsetzung. Falscher Betrag, unvollständige Summe, Stückpreis, mehrdeutiges Gegenangebot und echte Preisgrenzen bleiben harte Kontrollen.

**Zwei Grenzen von Opus' Empfehlung:**
1. **Gleicher Betrag ≠ gleiche Handlung.** Zwei wörtliche „three copper“-Fundstellen können zu **verschiedenen Verkäufern, Nebenleistungen oder Zahlungen** gehören. Schon ein einzelnes korrekt zitiertes Wort beweist nicht automatisch die Zustimmung zu einem bestimmten `offer.accept`; mehrfach gleiche Zahlen verschärfen das Zuordnungsrisiko. **P1a** muss daher außer gleicher Summe auch den vorhandenen Aktions-/Artikel-/Empfänger-Scope und `quote`-Vertrag erhalten; nicht pauschal jede gleich hohe Fundstelle als Autorisierung interpretieren.
2. **P1f ist noch kein nachgewiesener Kostengewinn.** Die Opus-Zählung von vier ersten `finish=length`-Antworten bei 2000 Tokens ist ein wichtiger Befund. Eine pauschale Erhöhung aller ersten Planner-Ausgaben kann aber **die Tokenkosten der übrigen Aufrufe** vergrößern und garantiert keine JSON-Ausgabe, wenn ein Modell mehr Reasoning ausfüllt. Bevor dauerhaft auf 4000 erhöht wird: kontrollierter Vorher-/Nachhervergleich der **tatsächlichen Ausgabetokens, Reparaturquote, Latenz, Gesamtkosten und Ergebnisgültigkeit**; falls verfügbar eine begrenzte Reasoning-Einstellung als Alternative. Bevorzugt die kleinste wirksame Einstellung, nicht ein pauschales Maximum.

**Zu Opus' Wirkungsprognose** „16 auf etwa 9 Reparaturen und 2 verlorene Züge zurück“: Fable hat seine erste optimistische Schätzung in §13 bereits stark reduziert. Die vier Budgetausfälle sind historisch beobachtet, aber ihre vollständige Vermeidung durch eine größere Erstantwort ist **nicht gemessen**. T54 hatte mehrere Befehle; deren vollständige Ausführung hängt weiter an normalen Mechanik-/Zustimmungsgrenzen. Die Prognose darf daher nicht als Abnahmeziel garantiert werden.

**Empfehlung zum Preis-/Planner-Paket:** Enges **GO für P1a und die offenkundigen Autoritätslücken P1b/P1c** nach gezieltem Rot/Grün; **eingeschränktes GO für P1d/P1e** unter §13-Bedingungen und fehlendem Zulassungsverlust; **Mess-/Konfigurationsentscheidung** für P1f; **noch kein GO** für befehlsweise Teilannahme P1g. Gegenfälle müssen insbesondere G1–G6, B-5, mehrfache gleiche Beträge für verschiedene Handlungen, Rabatt trotz formell gleicher Zahl, `any_price + max_cp` sowie Zielkauf nach nicht bestätigter Ankunft enthalten.

### 12.5 V1, V2 und die langfristige Strukturentscheidung

**V1:** Auf Basis von Opus' enger Datenanalyse jetzt **zurückstellen**. Eine spätere, wirklich vereinheitlichte Reise-/Ankunftslösung ist nicht grundsätzlich ausgeschlossen. Entscheidend bleibt, dass sie den alten Aufschub- und Chronologieapparat **messbar ersetzt**, statt nur vorab gebuchte Stadtwege dazuzustellen. **Das bisherige GPT-Urteil „V1 vorrangig“ wird damit revidiert.**

**V2:** Die im Code erreichbare Straßenregel beibehalten. „DUNGEON AHEAD“ belegt die **Gegneridentität/-anwesenheit**, nicht automatisch die tatsächliche Entscheidung zum Angriff. Eine positive Quellen-Diagnose kann nützlich sein, aber den `attackCommitted`-Schutz gegen bloße Drohungen nicht entfernen. Ob die Engine später eine besondere Eröffnungslage für selbst gebuchte Gefahren entscheiden soll, ist eine eigene, zunächst datengestützte Designfrage.

**Wartbarkeit:** Die Grundthese von Fable und Opus bleibt richtig: Kein neuer WorldTxn, keine vollständige `applyWorld`-Neuaufteilung und keine allgemeine Umstellung auf `owner` oder NPC-ID-Merging ohne konkreten Integritätsvorteil. Die alte Replay-Basis ist ein Sicherheitsbeleg, nicht Müll. Den Korpus um echte NPC-/PULSE-/Handels- und Batch-28-Ortsfälle erweitern, ohne die ursprüngliche Fingerprintkette ersatzlos zu überschreiben. Bei Altpfadabbau erst die tatsächliche Laufzeit-Erreichbarkeit prüfen (die Straßenregel widerlegt eine rein textbasierte „Legacy“-Liste).

### 12.6 Bewertung der sechs Nutzerentscheidungen E1–E6

| Entscheidung aus Opus §10.3 | GPT-Empfehlung | Begründung / sichere Grenze |
|---|---|---|
| **E1: K-A/O1, `fact`/`thread`/`person.named`/`quest.detail` ohne Szenenbindung** | **Eingeschränktes GO, nicht pauschal** | Ortsneutraler Datentyp ≠ kausal unabhängiger Bericht. Nur eindeutig vor einer verweigerten Reise belegte oder legitim fernübermittelte Informationen übernehmen; unverifiziertes Geschehen im unerreichten Ziel bleibt abgelehnt. |
| **E2: K-B/O2, Teilbewegung ohne GO** | **Ja, nur Gebäude/Anwesen und nur als belegte Teilhandlung** | Räumliche Nähe und zugänglicher Weg reichen ohne Spielerentscheidung nicht. Kein Freibrief für beliebige Nebenräume oder die ganze Siedlung. |
| **E3: Rabattaufhebung** | **Ja, nur nach belegter Zustimmung zum gespeicherten Preis** | Ungeprüftes `agreed_cp` darf einen echten Rabattwunsch nicht überschreiben; normale Kaufbestätigung genügt, keine neue universelle Zahlungskarte. |
| **E4: Planner-Ausgabebudget/Reasoning** | **Erst Messvergleich, dann kleinste wirksame Änderung** | Vier Leerausgaben sind ein realer Befund; pauschal größere Tokenlimits können Kosten erhöhen. Reasoning-Cap prüfen, wenn unterstützt, sonst moderat erhöhen und evaluieren. |
| **E5: V1 zurückstellen** | **Ja** | Opus' Daten widerlegen die angenommene große Wirkung der engen Fable-Variante; ohne echte Altpfadersetzung kein guter Architekturtradeoff. |
| **E6: Paket A (Preis) vor oder nach natürlichem Lauf** | **Natürlichen Run auf unverändertem `.179` zuerst**, wenn zeitnah durchführbar | Nur so wird die Wirkung `.175`–`.179` erstmals frei modellgestützt geprüft. Anschließend Preis-/Planner-Paket mit getrenntem Vorher-/Nachher. Enger Sicherheits-Hotfix bei nachweisbarer Fehlbuchung darf die Reihenfolge ausnahmsweise ändern. |

### 12.7 Priorisierter Folgeschritt, ohne neue Mikroreview-Schleife

1. **Jetzt:** Ein natürlicher NPC-/PULSE-Lauf auf festgehaltenem `.179`, mit **Guard-Bilanz nach Ursache und Folgewirkung**. K-A/O1-Eignung nicht nur nach Delta-Typ zählen, sondern jede abgelehnte Ankunft und ihr tatsächliches Szenengeschehen nachträglich beurteilen.
2. **Danach:** Ein gebündeltes, sicherheitsgeprüftes Preis-/Planner-Paket mit P1a–P1e sowie einer kontrollierten Budget-/Reasoning-Konfigurationsprobe. Nicht unbemerkt die Zustimmungs- oder `any_price`-Semantik ändern.
3. **O1/O2:** Zwei begrenzte Designentscheidungen **erst nach negativen und positiven Originalfall-Gegenproben**. Kein unqualifiziertes „GO für alle vier Datentypen“. O2 bei Gelegenheit als klar nachweisbare Teilhandlung verbessern, nicht als automatische Siedlungsnavigation.
4. **Pflege:** V7-aktuelle Korpusabdeckung, D3-Teillieferung ohne pauschale Spielerzitatlöschung und V6-Altpfadabbau nur nach Nutzungskarte. V2/V3/V5 nur bei neuen konkreten Integrationsbefunden.

**Schluss:** Opus hat die bisherige Architekturpriorisierung sinnvoll korrigiert. **Seine pauschale O1-Freistellung ist jedoch der wichtigste noch unbewiesene Designvorschlag.** Gerade bei einem System, dessen Stärke persistente NPC-Beziehungen und verlässliche Ereignisfolgen sein sollen, darf eine nicht erreichte Szene nicht durch die Hintertür als dauerhafte persönliche Absprache, NPC-Namensgebung oder Questwahrheit zurückkehren. **Keine Implementierung auf Grundlage dieses Gegenreviews freigegeben.**
