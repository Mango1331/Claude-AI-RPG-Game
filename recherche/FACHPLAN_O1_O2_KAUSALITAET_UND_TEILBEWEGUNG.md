# Avereth – Fachplan O1/O2: Szenenkausalität und Teilbewegung

**12.11.2026 · Opus 5.5 · technischer Entscheidungs- und Fachplan. Keine Implementierung, keine Tests, keine Produkt- oder Kanonänderung.**

**Prüfstand:** Produktbranch `claude/c-planner-prototype-2026-10-02-gpt-c666`, Remote-HEAD `59f868e` (Build `.179`), am 12.11. erneut abgefragt und unverändert. `main` vor diesem Dokument: `0f20ad4`. Zeilenangaben beziehen sich auf `59f868e` in `avereth-engine/`.

**Grundlage:** [Gegenreview Opus 5.5](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md) §§2–3, 7, 10 und GPTs Nachreview §12 darin; [Fable-Audit](ARCHITEKTUR_AUDIT_10B_FABLE.md); [Kanon 02](../02_DESIGN_KANON.md).

**Nachweisgrade:** **[C]** Code an `59f868e` gelesen · **[D]** eigene Auswertung der Originalarchive (Python liest JSON, keine Engine) · **[P]** abgeleitet, nicht ausgeführt.

**Daten [D]:**
- Pilot 01 (`.174`): `avereth-events.json`, `calls.json`, `chat-completions.jsonl` mit den vollständigen Erst- und Reparaturantworten des Extractors.
- Batch 28 Warrior (`.154`): Chat-Datei mit `extraction.raw` je Antwort, dazu `selected_completions.json` (6 archivierte Extractor-Reparaturanfragen).
- „recN“ ist der Zeilenindex der Chat-Datei; „Z“ die Engine-Zugnummer.

---

## 0. Ergebnis in Kürze

| | Empfehlung |
|---|---|
| **O1 in meiner früheren Fassung** (vier Meldungsarten ohne Szenenbindung, auch nach einer abgelehnten Ankunft) | **NO-GO, zurückgezogen.** GPTs Einwand ist am Code bestätigt: Für `fact`, `person.named` und `quest.detail` ist die Szenenprüfung der einzige Kausalitätsschutz; `thread` hat nur einen Teilschutz (§1.3) |
| **O1-C** Rettung von Meldungen nach einer abgelehnten Ankunft über eine Quellen- oder Sprecherbindung | **NO-GO.** Bräuchte neuen Zustand. Die Daten zeigen außerdem, dass diese Meldungen fast immer wirklich aus der nicht erreichten Szene stammen |
| **O1-B1** Szene aus der Erzählreihenfolge ableiten, nur bei schlüssiger Szenenkette, nur vor einer Ankunft, nur für `fact`, `thread`, `person.named`, `quest.detail` | **eingeschränktes GO** (sinnvoll, nicht notwendig) |
| **O1-B2** wie B1, für alle Meldungsarten | **weitere Daten nötig** |
| **O1-A** Status quo | sicher und zulässig. Er kostet etwa jede dritte Extractor-Reparatur im Pilot |
| **O2-alt** Zimmerausnahme von `c.6.6.4` für Ruleset 2 reaktivieren | **NO-GO** |
| **O2-move** echte Bewegung ins gebuchte Zimmer | **NO-GO**: erzeugt am nächsten Morgen neue Ablehnungen (§6.2) |
| **O2-stay** gebuchtes Zimmer gilt als Teil des Gasthauses, keine Bewegung, nur mit Handlungsbezug | **eingeschränktes GO**, niedrige Priorität |

**Was die Vorschläge leisten und was nicht:** O1-B1 und O2-stay retten zusammen nur etwa 6 der 96 `scene_context`-Ablehnungen aus Batch 28. Der Rest folgt korrekt aus abgelehnten oder nicht gemeldeten Ortswechseln. Deren Ursachen liegen außerhalb von O1/O2:
- Der Planner erzeugt kein GO für eine klare Bewegung (4 Ursprünge).
- Arbeit, die eine Person anführt (8 Ursprünge).
- Nachbarhaus (2), Dungeonlager und Kampf (2).

Der Hauptnutzen von O1-B ist ein anderer: Im Pilot entfallen 3 bzw. 4 der 12 Extractor-Reparaturen, und ein Fehlverlust wie der Name „Torv“ (Z56) tritt nicht mehr auf.

---

## 1. Bestätigte Ursachen und Codepfade

### 1.1 Der Pfad einer Meldung mit Szenenbezug [C]

| Stufe | Stelle | Wirkung |
|---|---|---|
| Normalisierung | `extract.js:391` (`scopedPlaces`), `world.js:242` (`noRoleWords(scopedPlaces(...))`) | deterministische Umschreibung von Ortsreferenzen anhand von `state.last.outcome.auth`, **identisch in Parser und Weltanwendung** |
| Vertrag | Prompt `extract.js:145` | „scene is the actual narrative setting at the end of this reply … null/omitted inherits the answer scene; use this for earlier scenes in a reply with multiple arrivals“ |
| Vertrag | Prompt `extract.js:146`, `:156`, `:216` | Ankünfte in Reihenfolge; Ereignisse vor der letzten Ankunft ausdrücklich mit ihrer Szene versehen |
| Pflichtfeld | `extract.js:512` | `answer.scene` ist Pflicht, sobald Weltfolgen gemeldet werden |
| Vorprüfung | `sceneIssues`, `extract.js:328–357` | (a) `expected.arrived` ohne passendes `arrive` (`:334–337`). (b) `scene` leer oder „here“ vor einer späteren Ankunft an einen anderen Ort (`:343–348`). (d) lokale Einführung vor ihrer eigenen Ankunft (`:350–354`). Ergebnis: **eine Reparatur** |
| Vorprüfung | `extract.js:424–437` | Mitlaufender Szenenort `stepAt`, der bei jedem `arrive` wechselt. Die Positionslogik existiert also schon für die Anwesenheitsprüfung |
| Firewall | `firewall.js:399–410` | `arrive` ohne GO, ohne Streifzug und ohne belegte äußere Ursache wird als `no_go` abgelehnt. **Der Zielort wird nicht verglichen:** auch ein `arrive` an den eigenen Ort ist `no_go` |
| Kaskade | `world.js:274`, `:1022–1025` | Jede abgelehnte Ankunft schreibt `travel.push({ok:false})`. Danach wird jede ortsbezogene Meldung mit `scene` leer oder „here“ abgelehnt (**Prüfung 1**) |
| Szenenvergleich | `world.js:1027–1037` | `origin = d.scene ?? answer.scene`. Weicht er vom Ort des Schritts ab, folgt eine Ablehnung (**Prüfung 2**), unabhängig von `localSceneDelta` |
| Abhängige Aussagen | `world.js:1009–1021` | `blockedCreatures` und `blockedPeople` sperren Aussagen über abgelehnte Personen und Kreaturen |
| Korrektur | `world.js:1906–1912` | „Part of the last reply took place in a scene the engine did not book …“ |

### 1.2 Zwei Probleme, die bisher zusammengezählt wurden

| | **Reparaturpfad** | **Kaskadenpfad** |
|---|---|---|
| Auslöser | Ankunft **gebucht**, aber Meldungen davor tragen keine eigene Szene; der Vorgabewert ist die Schlussszene | Ankunft **abgelehnt**; Meldungen danach tragen keine eigene Szene |
| Wer prüft | `sceneIssues` (b) mit Reparatur; danach Prüfung 1 über `chronology` und Prüfung 2 | Prüfung 1 (Kaskade), sonst Prüfung 2 |
| Wo spielte die Meldung tatsächlich? | am Startort oder Zwischenort. Beide Orte wurden kanonisch erreicht | fast immer am **nicht erreichten** Ort |
| Daten | Pilot: 4 von 12 Extractor-Reparaturen. Batch 28: 2 von 6 archivierten Reparaturanfragen, Gesamtzahl unbekannt | Batch 28: 70 von 96 `scene_context` |

**Selbstkorrektur:** Mein Gegenreview hat beide Pfade als ein Problem behandelt und mit dem Meldungstyp eine falsche Grenze gezogen. Ob eine Meldung kausal von einer abgelehnten Ankunft abhängt, hängt nicht an ihrem **Typ**, sondern an ihrer **Stellung in der Erzählung** relativ zu dieser Ankunft. Diese Stellung kennt die Engine bereits aus `seq`. Nach `seq` bucht sie auch Ankünfte, Geld und Kampf (`world.js:987`).

### 1.3 Schützt außer der Szenenprüfung etwas? [C]

| Typ | Handler | eigener Schutz gegen eine Szene, die nicht erreicht wurde |
|---|---|---|
| `fact` | `world.js:1305–1342` | **keiner.** Identität, Ankerregeln und Kampfstatus werden geprüft, aber keine Anwesenheit und keine Quelle |
| `person.named` | `world.js:1192–1205` | **keiner.** Nur „bekannte Person ohne anderen Namen“ |
| `quest.detail` | `world.js:1558 ff.` | **keiner.** Nur engine-eigene Klauseln und ungebuchte Tode werden entfernt |
| `thread` | `world.js:1379–1407` | **teilweise.** Alaric wird nur Partei, wenn ein NPC-Partner anwesend ist (`faceToFace`, `:1399–1404`). Der Text bleibt trotzdem gespeichert |

**GPT §12.2 ist damit bestätigt.** Eine Typ-Ausnahme bei der Kaskade würde Absprachen, Namen und Questnotizen aus einer nicht erlebten Szene dauerhaft übernehmen.

### 1.4 Originalfälle

**Reparaturpfad, Erst- gegen Reparaturantwort [D]:**

| Fall | beanstandet (Erstantwort, `scene: null`) | Reparaturergebnis | identisch mit der Szene aus `seq`? |
|---|---|---|---|
| Pilot Z9 | `fact` seq 2 und 3 vor `arrive` seq 5 (Weidetor) | Startort (überflutete Strecke) | **ja** |
| Pilot Z56 (T61) | `person.named` Fuhrmann → „Torv“ seq 2 vor `arrive` seq 3 (Wegkreuz) | Zwischenort „Woolpack yard“, für den nie ein `arrive` gemeldet wurde → Prüfung 2 lehnt ab, **der Name geht verloren** | nein; die Szene aus `seq` (Woolpack) wäre angenommen worden |
| Pilot Z57 | `fact` seq 2 vor `arrive` seq 3 (Mullers Hof) | Startort (Wegkreuz) | **ja** |
| Pilot Z59 | `enter`, `object.new`, `object.move`, `quest.detail` seq 1–4 vor `arrive` seq 5 | Startort (Mullers Hof) | **ja** |
| Batch 28, Zug 240 | `person.new`, `object.new`, `object.move`, `fact` ×2 vor `arrive` seq 6 | Startort (Gildenstube) | **ja** |
| Batch 28, Zug 268 | `fact` seq 1 vor `arrive` seq 2 | Startort (obere Fallenlinien) | **ja** |
| Batch 28 rec367 | `fact` seq 2 („Dremm finished knocking all seven poles“) vor dem **abgelehnten** `arrive` seq 4 | Reparatur ohne Wirkung → abgelehnt | Szene aus `seq` wäre richtig: Die Erzählung zeigt das Klopfen am Startufer |
| Batch 28 rec531 | `enter` Cobb seq 1 vor dem **abgelehnten** `arrive` seq 2 (Cobbs Hütte) | Reparatur ohne Wirkung → abgelehnt | Szene aus `seq` wäre richtig: „The trudging figure stopped, turned back in the mist“ an den Fallenlinien |

**Ergebnis** (Pilot und die zwei archivierten Batch-28-Reparaturen):
- In 6 von 6 erfolgreichen Reparaturen ist das Ergebnis **gleich oder schlechter** als die Szene aus `seq`.
- In 2 von 2 erfolglosen Reparaturen ging eine richtige Meldung verloren.
- **In keinem Fall hat eine Reparatur eine Meldung vom Start- an den Zielort verschoben.** Die Reparatur kann eine falsche Reihenfolge also gar nicht erkennen: Das Modell antwortet nach seiner eigenen `seq`.

**Kaskadenpfad [D]:**
- In Batch 28 betreffen 48 der 96 Ablehnungen `fact`, `thread`, `person.named` oder `quest.detail`. Davon stammen 37 aus der Kaskade, 10 aus Prüfung 2 und 1 aus einer erfolglosen Chronologiereparatur (rec367).
- Prüfung 2 umfasst fünf Antworten ohne jedes `arrive`, aber mit einer Schlussszene außerhalb des Startorts: rec253, 265, 267, 297, 615. Dort hat der Erzähler den Ort gewechselt, ohne dass eine Ankunft gemeldet wurde. **Diese Ablehnungen sind richtig.** Jede Positionsregel muss sie weiter ablehnen.
- Ein Gegenbeleg für die Verlässlichkeit von `seq`: In rec233 sagt die Wirtin „Marla keeps the Gull's Rest“ noch am Tresen. Der Extractor nummeriert die Fakten aber **hinter** das `arrive` ins Zimmer. Die Reihenfolge ist also nicht vollkommen zuverlässig. In dieser Richtung ist das harmlos (§3.3).

### 1.5 Ursachen der Teilbewegungsfälle (O2) [C][D]

- Die Zimmerausnahme `lodgedHere`/`roomOfHere` (`world.js:121–122`, `firewall.js:400`) gilt seit `.99` nur für Ruleset 1 und ist für alle aktuellen Kampagnen tot (Commit `15ebbc1`: „current campaigns require an authorized room move“).
- **Batch 28 rec72/73:** „I'll take the room, a bowl of stew, and the hot water“. `service.granted` lodging (Zug 32), Erzählung im Zimmer, `arrive` → `no_go`. Die Zimmerbeschreibung (`fact` seq 6) fällt der Kaskade zum Opfer.
- **Batch 28 rec232/233:** „I take the small room …“. Lodging gewährt (Zug 100), `arrive` → `no_go`. Fakten zur Wirtin und `leave` fallen der Kaskade zum Opfer (4).
- **Folgemorgen** (rec75, rec235): Die Antwort meldet als Schlussszene das Gasthaus bzw. „here“, keine Ablehnung. Der Status quo heilt sich also selbst, weil Alaric kanonisch nie das Gasthaus verlassen hat.
- **Pilot Z55** („I take myself up to the bed I paid for and sleep“): Der Extractor meldete gar kein `arrive`; kein Problem.

---

## 2. Lösungsvarianten für O1

### O1-A – Status quo

Unverändert. Die Reparatur bleibt für alle Typen. Kosten im Pilot: 4 von 12 Extractor-Reparaturen, rund 14 000 Prompt-Tokens und 9 Sekunden je Reparatur, dazu ein verlorener Name. Kein Risiko.

### O1-B – Szene aus der Reihenfolge ableiten, wenn die Kette schlüssig ist

Ein reiner Normalisierungsschritt nach dem Muster von `scopedPlaces`, an beiden bestehenden Stellen (`extract.js:391`, `world.js:242`). Er übernimmt die Arbeit, die die Reparatur in allen beobachteten Fällen geleistet hat, deterministisch:

1. **Schlüssigkeitsprüfung der Kette:** Die Schlussszene (`answer.scene`) ist der Ort des letzten gemeldeten `arrive`, ohne `arrive` der Startort. Zusätzlich hat jedes `expected.<k>.arrived: true` ein passendes `arrive` (Regel a). „here“ als Schlussszene zählt als Startort. Ist die Kette nicht schlüssig, gilt der Status quo.
2. **Gehen in `seq`-Reihenfolge:** Mitlaufend wird die zuletzt gemeldete Szene geführt: zuerst der Startort, nach jedem `arrive` dessen `at`.
3. **Füllen:** Hat eine Meldung eines zugelassenen Typs `scene: null` und folgt ihr noch ein `arrive`, erhält sie die mitlaufende Szene. „here“ wird nur vor dem ersten `arrive` gleich behandelt, weil es laut Vertrag den Startort meint.
4. **Nichts anderes:** Meldungen nach dem letzten `arrive` bleiben leer und erben wie heute die Schlussszene. Ausdrückliche Szenen bleiben unverändert.

**Warum das kausal sicher ist:**
- Weltseitig ändert sich keine Prüfung.
- **Meldungen nach einer abgelehnten Ankunft** liegen hinter einem `arrive` und erhalten bestenfalls dessen Ort. Prüfung 2 lehnt diesen ab, weil Alaric dort nicht steht. Ohne Füllung greift Prüfung 1 wie heute.
- **Meldungen zwischen einer abgelehnten und einer späteren Ankunft** erhalten den Ort der abgelehnten Ankunft, Prüfung 2 lehnt ab. Das ist strenger und genauer als heute.
- **Meldungen vor einer abgelehnten Ankunft** erhalten den Startort und werden angenommen (GPT-Positivfall 4).
- **Antworten ohne gemeldete Ankunft** mit fremder Schlussszene sind nicht schlüssig und bleiben beim Status quo (rec253 usw.).
- `blockedPeople`, `blockedCreatures`, Ankerregeln, Firewall und Kaskade bleiben unverändert und arbeiten auf den normalisierten Meldungen.

**B1:** nur `fact`, `thread`, `person.named`, `quest.detail`.
**B2:** alle ortsbezogenen Meldungsarten (`localSceneDelta`).

### O1-C – Rettung nach einer abgelehnten Ankunft über eine Quellenbindung

Meldungen nach einer abgelehnten Ankunft würden angenommen, wenn ihr Sprecher oder ihre Quelle am erreichten Ort anwesend war. Das bräuchte eine neue Zuordnung „wer sagte was, an welchem Schritt“, die es weder im Extractor-Vertrag noch im Zustand gibt. Außerdem gehören die Kaskadenfälle nach den Daten fast immer zur nicht erreichten Szene. **Die neue Zustandsverwaltung wäre teuer und der Nutzen gering → NO-GO.**

### Verworfen: O1 in der früheren Fassung (Typliste ohne Szenenbindung)

Sie würde die Kaskade für vier Typen aufheben und damit GPTs Negativfälle 1–3 zulassen (§1.3). **NO-GO.**

---

## 3. Sicherheits- und Spielbarkeitsvergleich

### 3.1 Übersicht

| Kriterium | O1-A | **O1-B1** | O1-B2 | O1-C | frühere Typliste |
|---|---|---|---|---|---|
| übernimmt Inhalte aus einer nicht erreichten Szene | nein | nein (außer bei falscher `seq`, §3.3) | nein (dito) | ja, gewollt | **ja** |
| neue Zustände | – | keine | keine | Quellenbindung | keine |
| Codeänderung | – | 1 Funktion, 2 Aufrufe, Promptabsatz | dito, größere Typmenge | groß | gering |
| Pilot: Chronologie-Reparaturen | 4 | **1** (Z59 bleibt) | 0 | – | – |
| Pilot: verlorene Meldung | Torv (Z56) | gerettet | gerettet | – | – |
| Batch 28: gerettete `scene_context` | 0 | 1 (rec367) | 2 (rec367, rec531) | unklar | bis zu 47, davon 46 falsch |
| Batch 28: vermiedene Reparaturen | – | Zug 268 (240 bleibt) | Zug 240 und 268 | – | – |
| Promptlast | heute | etwas kürzer | kürzer | länger | kürzer |
| Replay | – | einzelne `repaired`-Abweichungen | mehr | viele | viele |

### 3.2 Spielbarkeit

- **Pilot (O1-B1):** 3 Extractor-Aufrufe weniger auf 70 Eingaben, rund 43 000 Prompt-Tokens und 27 Sekunden [P, Mittelwerte aus Fable §2.2]. Ein NPC-Name bleibt erhalten.
- **Batch 28:** kaum spürbar. Die Kaskade bleibt, und das ist richtig.
- **Spielerhoheit:** unverändert. Es wird nichts bewegt, und nach einer abgelehnten Ankunft wird nichts übernommen.

### 3.3 Restrisiko: falsche Reihenfolge im Extractor

| Richtung | Beispiel | Folge mit O1-B | Folge heute |
|---|---|---|---|
| am Startort gesagt, `seq` nach `arrive` | rec233 („Marla keeps …“) | Ankunft gebucht: Fakt am Ziel, harmlos. Ankunft abgelehnt: Kaskade, wie heute | gleich |
| am Ziel gesagt, `seq` **vor** `arrive` | in den Daten **kein** Fall (0 von 8) | Ankunft gebucht: Fakt am Start; für B1-Typen harmlos, für B2-Typen ein falscher Ort (Person bleibt am Start zurück). Ankunft abgelehnt: Inhalt der nicht erreichten Szene am Start übernommen | Reparatur → das Modell beschriftet nach seiner eigenen `seq` mit dem Startort (6 von 6) → **gleiches Ergebnis** |

O1-B öffnet also kein neues Loch. Es übernimmt deterministisch das, was die Reparatur in jedem beobachteten Fall ohnehin ergab. Die einzige zusätzliche Exposition: Fälle, in denen die Reparatur heute zufällig scheitert und dadurch eine falsch nummerierte Meldung verwirft. In den Daten scheiterten die Reparaturen nur an richtig nummerierten Meldungen (rec367, rec531).

**B1 begrenzt das Restrisiko auf Typen, bei denen ein falscher Ort keinen Zustand verschiebt.** Für Personen, Kreaturen, Objekte und Angebote (B2) könnte eine falsche `seq` die bekannte Fehlerklasse „zuerst am falschen Ort gesehen“ auslösen (`world.js:951`). Deshalb ist B2 erst nach einer Messung vertretbar (§6.3).

---

## 4. Exakte Änderungen

### 4.1 O1-B1

| # | Datei | Änderung |
|---|---|---|
| 1 | `src/v4/extract.js` (oder `place_refs.js` neben `scopedPlaces`) | neue reine Funktion `orderScenes(value, startScene, state, content)` nach §2 O1-B, Typmenge `SCENE_BY_ORDER = {fact, thread, person.named, quest.detail}`; idempotent, verändert nur `scene: null` (und „here“ vor dem ersten `arrive`) |
| 2 | `src/v4/extract.js:391` | `orderScenes` nach `scopedPlaces` aufrufen, nur bei `sceneRequired` und Ruleset 2, vor allen semantischen Prüfungen und vor `sceneIssues` (`:513`) |
| 3 | `src/v4/world.js:242` | dieselbe Funktion nach `scopedPlaces`, Startort `state.scene.at`; damit sieht die Szenenvorprüfung bei `:305` dieselben Meldungen |
| 4 | Prompt `extract.js:145`, `:156`, `:216` | „null/omitted inherits the answer scene“ ersetzen: ortsneutrale Meldungen ohne Szene ordnet die Engine nach der Erzählreihenfolge; Personen, Kreaturen, Dinge und Angebote vor der letzten Ankunft brauchen weiter ihre Szene. Beispiel aus `:156` bleibt |
| 5 | Versionen | Extractor-Vertragsversion erhöhen (`extract-5.xx`); Narratorkarten unverändert |

**Unverändert:** `localSceneDelta`, `sceneIssues` (findet in diesen Fällen nichts mehr), Prüfung 1 und 2 in `world.js`, `blockedPeople`, Firewall, Kaskade, die Korrektur „scene the engine did not book“, die Handler.

**Was tatsächlich entfällt:**
- Die Chronologie-Reparatur für schlüssige Ketten mit ortsneutralen Meldungen.
- Etwa zwei Sätze des Extractor-Prompts.

Es entfällt **kein** Prüfpfad. Das ist ehrlich gesagt eine Effizienzverbesserung, keine Vereinfachung der Architektur.

### 4.2 O1-B2 (nur nach Messung)

Wie 4.1, `SCENE_BY_ORDER = localSceneDelta`. Regel (d) (`extract.js:350–354`) bleibt für ausdrücklich falsche Szenen bestehen.

---

## 5. Regressionen zu O1 (nicht ausgeführt)

**Positiv (soll sich ändern):**

| # | Fall | heute | erwartet |
|---|---|---|---|
| P1 | Pilot Z9, erste Extractor-Antwort aus `chat-completions.jsonl` | Chronologie-Reparatur | keine Reparatur; Fakten am Startort; Ereignisse wie nach der historischen Reparatur |
| P2 | Pilot Z56 (T61), Erstantwort | Reparatur → „Torv“ abgelehnt | keine Reparatur; `npc.carter` heißt Torv |
| P3 | Pilot Z57, Erstantwort | Reparatur | keine Reparatur; Fakt am Wegkreuz |
| P4 | Batch 28, Zug 268 (selected completion) | Reparatur | keine Reparatur |
| P5 | Batch 28 rec367, `extraction.raw` | `fact` seq 2 abgelehnt | Fakt am Startufer gebucht |
| P6 | konstruiert (GPT-Fall 4): Bericht einer anwesenden Person, danach abgelehnte Ankunft | abgelehnt oder Reparatur | angenommen |
| P7 | konstruiert: zwei gebuchte Ankünfte A (seq 2) und B (seq 5), `fact` seq 3 ohne Szene | Reparatur oder Ablehnung | Fakt an A |

**Negativ (muss wie heute bleiben):**

| # | Fall | erwartet |
|---|---|---|
| N1 | Kaskade nach `no_go`, z. B. Batch 28 rec476–545 (Cobb) | alle 70 Kaskadenablehnungen (37 ortsneutrale, 33 andere) unverändert |
| N2 | Batch 28 rec253, 265, 267, 297, 615 (kein `arrive`, fremde Schlussszene) | Kette nicht schlüssig → keine Füllung → Prüfung 2 lehnt ab |
| N3 | Batch 28 rec7 (ausdrückliche Szenen nicht erreichter Orte) | unverändert abgelehnt |
| N4 | rec367 `thread` seq 6 (Schlange an der Wehrrinne), nach der abgelehnten Ankunft | abgelehnt |
| N5 | rec531 `fact`/`memory` nach der abgelehnten Ankunft in Cobbs Hütte | abgelehnt |
| N6 | GPT-Fälle 1–3, konstruiert: `thread`, `person.named`, `quest.detail` nach einer abgelehnten Ankunft und in einer Antwort ohne `arrive` mit fremder Schlussszene | abgelehnt |
| N7 | konstruiert: Meldung zwischen einer abgelehnten und einer gebuchten Ankunft | erhält den Ort der abgelehnten Ankunft → Prüfung 2 lehnt ab |
| N8 | Pilot Z59 und Batch-28-Zug 240 (Personen und Objekte vor der Ankunft) | B1: Reparatur wie heute |
| N9 | „here“ zwischen zwei Ankünften; `expected.arrived` ohne `arrive`; Schlussszene „here“ mit `arrive` woanders | keine Füllung, Status quo |
| N10 | abgelehnte `person.new` (z. B. `collective_person`), später ein Fakt über sie | `npc_continuity` wie heute |
| N11 | rec233-Reihenfolge bei abgelehnter Ankunft | Kaskade wie heute |

**Abnahme:**
- P1–P7 rot gegen `.179`, grün danach; N1–N11 grün vorher und nachher.
- Vollsuite.
- Replay: Die zu erwartenden Abweichungen sind vor allem `repaired`-Änderungen bei Korpusfällen mit Chronologie-Reparatur; jede einzeln freigeben.
- ST-Smoke, weil sich der Extractor-Vertrag ändert.

---

## 6. O2 – autorisierte Teilbewegung

### 6.1 Schutzzweck und Maßstab

Spielerhoheit über Bewegung (Kanon §3), Hindernisse und Zugang, Dungeon- und Stealth-Regeln. GPT §12.3: **Räumliche Nähe ist keine Zustimmung.**

### 6.2 Varianten

| Variante | Regel | Bewertung |
|---|---|---|
| **O2-alt** | alte Ausnahme für Ruleset 2 wieder einschalten: Lodging am Ort in den letzten 24 h und Ziel ist ein Kindort (`interior`, `room`, `site`) → echte Bewegung | **NO-GO:** kein Bezug zur aktuellen Eingabe (gilt auch am nächsten Tag, beim Gespräch, für Hof und Nebengebäude); echte Bewegung |
| **O2-move** | wie O2-stay, aber mit echter Bewegung ins Zimmer | **NO-GO:** Am Folgemorgen meldet die Antwort wieder das Gasthaus (rec75: Schlussszene Gasthaus, Frühstücksfakt ohne Szene). Kanonisch stünde Alaric dann im Zimmer, das Frühstück würde von Prüfung 2 abgelehnt, und ein Rück-`arrive` wäre wieder `no_go`. Die Variante verschiebt das Problem |
| **O2-prompt** | Ergebniszeile der Zimmerbuchung: „the room is his; the scene stays at X“ | möglich, aber nicht deterministisch. Ignoriert der Erzähler die Zeile, bleibt alles wie heute |
| **O2-stay** | Das gebuchte Zimmer **gilt als Teil des Gasthauses**: keine Bewegung; die Zimmerreferenz der Antwort wird auf den aktuellen Ort umgeschrieben | **eingeschränktes GO** (§6.3) |

**Warum O2-stay:**
- Es bewegt niemanden. Die `.99`-Begründung (keine Raumbewegung ohne Autorisierung) bleibt also gewahrt.
- Es entspricht dem, was im Pilot ohnehin geschah (Z55: kein Zimmerort, kein Problem).
- Der Folgemorgen bleibt wie heute konsistent.
- Hindernisse und Zugang werden nicht umgangen: Es gibt keinen neuen erreichbaren Ort und keine Objekte eines Zimmerortes.

### 6.3 O2-stay im Detail

**Bedingungen (alle aus vorhandenem Zustand):**
1. **Handlungsbezug in dieser Nachricht.** Eine der beiden Bedingungen muss gelten:
   - In diesem Zug wurde ihm am aktuellen Ort Lodging gewährt: `s.services` enthält einen Eintrag mit `service: 'lodging'`, `at: s.scene.at`, `turn: s.turn` (`domain.js:185–186`).
   - Er ruht oder schläft in dieser Nachricht (`outcome.auth.rest`, gesetzt in `commands.js:787`, gespeichert in `turn.js:31`), und am Ort besteht ein gültiges Lodging (≤ 24 h).
2. **Ziel:** Alle `arrive` der Antwort zeigen auf dieselbe Referenz. Sie ist entweder neu als `{new:{kind: interior|room, parent: s.scene.at}}` oder ein bestehender Ort mit `parent === s.scene.at` und `kind: interior`.
3. Kein Kampf, kein Dungeon (`trueDungeonOf`/`dungeonOf` des aktuellen Ortes leer).
4. Sonst gilt der Status quo.

**Normalisierung:** In `arrive.at`, jeder `scene` und `answer.scene` wird diese Referenz durch `s.scene.at` ersetzt. Das ist eine reine Funktion `lodgingRoomScope(value, state)` nach dem Muster von `scopedPlaces`, an denselben zwei Stellen (`extract.js:391`, `world.js:242`).

**Firewall:** `firewall.js:400` wird ersetzt durch „ein `arrive` an den aktuellen Ort ist keine Bewegung“ (`ctx.atCurrent(d.at)` → annehmen). `world.js:1067` behandelt diesen Fall bereits: `travel.push({ok:true})`, keine Bewegung, keine Begleiter.

**Entfällt:** `lodgedHere` und `roomOfHere` in `firewallContext` (`world.js:121–122`) samt dem toten Ruleset-1-Zweig.

**Kanon:** Für die Bewegungsregel ist keine Änderung nötig, weil niemand bewegt wird. Empfohlen wird trotzdem eine ausdrückliche Nutzerentscheidung, ob „das gebuchte Zimmer ist Teil des Gasthauses“ als Spielregel gelten soll (§8, E-2).

**Folgen und Risiken:**
- Kanonisch schläft Alaric „im Gasthaus“, nicht in einem eigenen Ortsknoten. Anwesende NPCs bleiben im Szenenzustand, bis die Antwort sie mit `leave` hinausführt; das wird mit O2-stay erst möglich (rec233).
- Was er im Zimmer ablegt, liegt am Gasthaus. Ohne Diebstahlsystem ist das folgenlos.
- Der Gewinn ist klein: 2 Fälle in 3 Läufen.

### 6.4 Regressionen zu O2 (nicht ausgeführt)

**Positiv:**

| # | Fall | heute | erwartet |
|---|---|---|---|
| Q1 | Batch 28 rec72/73 (Zimmer gebucht, Zug 32) | `no_go`; `scene_context` für die Zimmerbeschreibung | keine Ablehnung außer dem unabhängigen `time_cap`; Fakt am Gasthaus |
| Q2 | Batch 28 rec232/233 (Zimmer gebucht, Zug 100) | `no_go`; 4× `scene_context` | Fakten zur Wirtin gebucht; `leave` angenommen |
| Q3 | Batch 28 rec74/75 und rec234/235 (Folgemorgen) | keine Ablehnung | unverändert keine Ablehnung |
| Q4 | Pilot Z55 (Schlaf im bezahlten Bett, kein `arrive`) | in Ordnung | unverändert |
| Q5 | konstruiert: Lodging von gestern, jetzt „I go to sleep“, Erzählung im Zimmer | `no_go` und Kaskade | normalisiert, keine Ablehnung |

**Negativ (wie heute `no_go`):**

| # | Fall |
|---|---|
| R1 | GPT-Beispiel: Getränk am Tresen, Erzähler verlegt ihn in ein privates Hinterzimmer (kein Lodging, keine Rast) |
| R2 | Lodging gültig, Nachricht ohne Buchung und ohne Rast (Gespräch), Erzählung im Keller |
| R3 | Zimmer gebucht, dieselbe Antwort führt ihn danach in den Stall (zweites Ziel) |
| R4 | laufender Kampf; aktueller Ort in einem Dungeon |
| R5 | Ziel ist kein Kindort (Nebengebäude als `site`, anderes Gasthaus) |
| R6 | ausdrückliches GO „up to my room“: GO-Pfad mit echter Bewegung, unverändert |
| R7 | alte 24-h-Regel: am nächsten Tag ohne Buchung und Rast in ein Nebenzimmer → `no_go` (Unterschied zur alten Ausnahme) |
| R8 | `arrive` an den aktuellen Ort ohne GO: angenommen, keine Bewegung, keine Kaskade; Begleiter werden nicht verschoben |

**Abnahme:** Q1–Q5 rot gegen `.179`, grün danach; R1–R8 grün davor und danach. Vollsuite, Replay mit Einzelfreigabe, ST-Smoke mit Record, Save, Reload und Swipe.

---

## 7. Abhängigkeiten, Risiken, Umsetzungspakete

**Abhängigkeiten:**
- O1-B und O2-stay sind unabhängig voneinander. Beide nutzen das vorhandene `scopedPlaces`-Muster.
- O2-stay braucht O1-B nicht, weil es die Zimmerreferenz selbst auf den aktuellen Ort abbildet.
- O1-B2 hängt an der Messung aus §5 (Fälle ohne Fehlordnung in Personen- und Objektmeldungen).

**Risiken (gesamt):**
- Vertragsänderung des Extractors: Modelle könnten Szenen seltener setzen. Für Personen und Objekte bleibt die Reparatur deshalb bestehen.
- Replay-Abweichungen bei Korpusfällen mit Chronologie-Reparatur.
- Bildet die Engine ein gemeldetes Ziel auf einen anderen Ort ab (Dungeoneingang über `entranceOf`, `viaStop`), trägt eine gefüllte Zwischenszene den gemeldeten Namen. Prüfung 2 urteilt dann genauso wie heute nach einer erfolgreichen Reparatur, die dieselbe Referenz setzen würde. Das ist kein neuer Fehler, aber ein Fall für die Regressionen (P7 mit Dungeoneingang).
- Keine neuen Zustände, keine neuen Events, keine Fold-Änderung. Save, Reload und Swipe sind nicht berührt, weil die Normalisierung vor der Buchung läuft und Records weiterhin nur gebuchte Events speichern.

**Pakete:**

| Paket | Inhalt | Aufwand | Abnahme |
|---|---|---|---|
| **K1** | O1-B1 (§4.1) | S | §5 |
| **K2** | O2-stay (§6.3) | S | §6.4 |
| **K3** (später) | O1-B2 | S | nach Messung: in den Reparaturen des nächsten natürlichen Laufs Erst- und Reparaturszene vergleichen (wie §1.4), Ziel ohne Verschiebung vom Start an das Ziel |

**Reihenfolge:**
1. Der natürliche Lauf auf `.179` (wie in GPT §12.7 empfohlen) liefert die Messdaten.
2. Danach K1 und K2 als ein kleiner Build.
3. K3 nur bei sauberem Messergebnis.

**Nicht Teil dieses Plans, aber die eigentlichen Ursachen der Batch-28-Kaskaden:**
- GO-Erkennung im Planner bei klarer Bewegung (rec6, rec224, rec830).
- Mitgehen bei Arbeit oder Begleitung, die eine Person anführt (O4, 8 Ursprünge).

Beide zuerst im natürlichen Lauf auf `.179` zählen.

---

## 8. Entscheidungsempfehlung

| | Urteil | Kurzbegründung |
|---|---|---|
| **O1** (frühere Typliste, K-A) | **NO-GO**, zurückgezogen | Ortsneutraler Typ heißt nicht kausal unabhängig. Für drei der vier Typen gibt es keinen anderen Schutz |
| **O1-C** | **NO-GO** | braucht neue Quellenbindung; Kaskadeninhalte stammen aus der nicht erreichten Szene |
| **O1-B1** | **eingeschränktes GO** | deterministisch, kein neuer Zustand, keine Prüfung gelockert; 3 von 4 Pilot-Reparaturen und ein verlorener Name. Status quo bleibt vertretbar |
| **O1-B2** | **weitere Daten nötig** | Personen und Objekte bei falscher `seq` am falschen Ort |
| **O2-alt / O2-move** | **NO-GO** | kein Handlungsbezug bzw. neue Ablehnungen am Folgemorgen |
| **O2-stay** | **eingeschränktes GO**, niedrige Priorität | keine Bewegung, enger Handlungsbezug, ersetzt eine tote Sonderregel; kleiner Gewinn |

**Nutzerentscheidungen:**
- **E-1:** O1-B1 umsetzen oder beim Status quo bleiben? Empfehlung: umsetzen nach dem natürlichen Lauf; der Status quo ist sicher.
- **E-2:** Soll ein gebuchtes Zimmer als Teil des Gasthauses gelten (O2-stay)? Empfehlung: ja, mit dem Handlungsbezug aus §6.3. Wer echte Zimmerorte will, muss O2-move mit Rückweg-Regel neu bewerten; das empfehle ich nicht.
- **E-3:** O1-B2 erst nach Messung? Empfehlung: ja.

**Gegenüber meinem Gegenreview zurückgenommen:**
- K-A in der damaligen Fassung.
- Die Angabe „bis zu 47 von 96“ als Hebel: Sicher rettbar sind 1 (B1) bzw. 2 (B2).
- Die Einstufung von O1 als „größter belegter Hebel“.
- O2 als echte Bewegung in den Kindort.

**Bestätigt:** Die Kaskade ist kein Fehler, sondern die Folge falsch-negativer Ortswechsel-Ablehnungen. Deren Ursachen gehören in Planner und O4, nicht in die Szenenprüfung.


---

## 9. Unabhängiger GPT-Gegenreview des Opus-Fachplans O1/O2

**12.11.2026 · ausschließlich Code-/Design-Gegenprüfung; keine Implementierung, keine Tests, keine neue Kanonentscheidung.**

**Basis:** Opus-Fachplan §§0–8 auf `main` bei `0765b07bf21a1725704ce1b014696d0756918fce`; Produktbuild `.179` bei `59f868eaf3c4ed7942ddc42ba3d180fab44a72cd`. Maßgebliche Grundlagen: [Opus-Gegenreview und GPT-Nachtrag §12](ARCHITEKTUR_GEGENREVIEW_10B_OPUS55.md), [Fable-Audit mit GPT-Gegenreview](ARCHITEKTUR_AUDIT_10B_FABLE.md), [Design-Kanon](../02_DESIGN_KANON.md).

**Eigene Codeprüfung:** `src/v4/extract.js` (`localSceneDelta`, `sceneIssues`, `parseExtraction`), `place_refs.js` (`placeKey`/`scopedPlaces`), `world.js` (beide `scene_context`-Bedingungen, `fact`, `thread`, `person.named`, `quest.detail`, gleichörtiges `arrive`, Firewall-Kontext), `firewall.js` (`no_go`), `domain.js` (`service.granted`) und `dungeon.js` (`complexOf`). **Nicht eigenständig neu gezählt:** Opus' Originalarchiv-Auswertungen (Pilot/Batch 28); die Zahlen und Fallklassifikationen stammen von Opus. **Keine** Node-Suite, Replay, ST-Host-Tests, Simulation oder Modellläufe ausgeführt.

### 9.1 Gesamturteil

**Opus' Selbstkorrektur ist fachlich richtig.** Die vorher vorgeschlagene pauschale Freistellung von `fact`, `thread`, `person.named` und `quest.detail` aus der Szenenprüfung ist zurückgezogen. Dies ist ein wesentlicher Sicherheitsgewinn: Eine ortsneutral speicherbare Aussage kann kausal aus einer **nicht erreichten** Szene stammen. Dagegen ist die Unterscheidung zwischen
1. **vor einer erzählten Ankunft tatsächlich verorteten Meldungen** ohne eigenes `scene`-Feld und
2. **nach einer verweigerten Ankunft** aus dem unerreichten Ort berichteten Folgen
im Code sachlich begründet.

**Neue Priorität:** O1-B1 ist eine **kleine mögliche Reparaturoptimierung**, keine große Architekturvereinfachung; O2-stay eine **lokale Darstellungskonvention**, kein genereller Reise-/Zimmer-Fix. Beide haben einen eng begrenzten belegten Nutzen. Keine weitere Architektur- oder Mikropatch-Schleife nötig, bevor der natürliche Lauf auf `.179` ausgewertet wurde.

| Option | Unabhängige GPT-Einstufung | Tragender Punkt |
|---|---|---|
| O1 alte Typliste, O1-C | **NO-GO bestätigt** | Kausalität darf nicht durch vermeintlich „ortsneutrale“ Typen übergangen werden. |
| **O1-B1** | **Eingeschränktes GO als Fachpatch-Kandidat** | `seq`-gestützte Voranordnung kann Reparaturen vermeiden, sofern Kette und Ort **tatsächlich** schlüssig sind. |
| O1-B2 | **Weitere natürliche Evidenz nötig** | Personen/Objekte können bei falscher `seq`-Ordnung an falschen Orten entstehen. |
| **O2-stay** | **Noch nicht als allgemeine Designregel freigeben** | Es verhindert eine Ortsbuchung, bildet aber ein privates Zimmer auf dieselbe physische Szene wie Gasthaus und Gäste ab. |
| O2-alt, O2-move | **NO-GO für den vorgelegten Umfang** | Alte Regel ohne aktuellen Handlungsbezug; echte Zimmerbewegung braucht folgerichtiges Rückkehr-/Raummodell. |
| Status quo | **Weiter zulässig** | Wenn Kosten/Nutzen nach `.179` zu gering, besteht kein Änderungszwang. |

### 9.2 O1-B1 – Im Code nachvollziehbar, aber die Schlüssigkeitsprüfung ist das eigentliche Sicherheitskriterium

**Positiv bestätigt:**
- `sceneIssues` betrachtet lokale Meldungen vor der späteren Ankunft und fordert mit seiner `chronology`-Regel eine eigene Szenenangabe; dadurch entstehen Reparaturanfragen.
- `scopedPlaces` wird sowohl im Extractorparser als auch zu Beginn von `applyWorld` angewendet. Eine reine, **idempotente** Normalisierung nach demselben Muster ist als Entwurfsrichtung plausibel.
- `world.js` enthält **zwei** voneinander unabhängige Szenenprüfungen: die `localSceneDelta`-/Chronologie-/Reisebedingung und zusätzlich den Vergleich `origin != null && !sceneMatches(origin)`. O1-B1 lässt beide bestehen und fügt vor ihnen bei geeignetem Beleg die bisher fehlende Stelle ein. **Dies ist deutlich sicherer** als die alte Freistellung.
- Die nach Opus archivierten sechs erfolgreichen Reparaturen belegten offenbar nur das explizite Szenenlabel, das die beobachtete Reihenfolge bereits nahelegt. Der Fall „Torv“ illustriert sogar einen möglichen Informationsverlust **durch** die zusätzliche Modellreparatur.

**Nicht übergehen:**
1. **`seq` ist ein Bericht des Extractors, kein unabhängiger Beweis der Erzählerchronologie.** Opus dokumentiert selbst eine falsche Reihenfolge in Batch 28 rec233. Ein Voranordnen nach `seq` kann deshalb einen falschen, aber syntaktisch schlüssigen `fact`- oder `thread`-Bericht persistieren. Der behauptete Satz „O1-B öffnet kein neues Loch“ ist als **absolute Sicherheitseigenschaft zu stark**; korrekt ist: Es gibt in den untersuchten erfolgreichen Reparaturen *keinen Beleg einer zusätzlichen Fehlzuordnung*. Ein positiver/negativer Gegenfall mit fehlnummerierter Aussage aus einem **nicht erreichten** Zielort gehört in die Testmatrix.
2. **`answer.scene` und `here` sind derzeit gerade für die letzte Szene der Antwort definiert.** Opus' Regel „`here` vor der ersten Ankunft = Startort“ ist daher eine **gezielte Änderung der Extractor-Konvention**, nicht lediglich eine neutrale Auflösung eines fehlenden Feldes. Die neue Interpretation braucht einen eindeutigen Vertrag, bevor beide Seiten gleich normalisieren. Wo `here` eine andere semantische Verwendung hat, unverändert reparieren statt raten.
3. **Die Konsistenzkette muss mit echten Orten verglichen werden, nicht mit bloß gleich klingenden Referenzen.** Der bestehende `placeKey` löst bekannte Orte und `{new:{...}}`-Referenzen soweit möglich auf; Dungeoneingänge, implizite Eltern und `scopedPlaces` können die Identität verändern. Die neue Normalisierung muss **vor** beiden Prüfschritten gleich arbeiten und bei unklarem Ort abbrechen (Status quo).
4. **Keine Heilung der Kaskade nach einer abgelehnten Ankunft.** Dort ist die Ablehnung kausal richtig, solange die Meldung tatsächlich aus der nicht erreichten Szene stammt. Kein stilles „backdating“ oder freies Umsortieren der `seq`-Werte, nur Ausfüllen von `scene` bei **klarer** Reihenfolge.
5. **Keine unnötige Unschärfe an Mehrfachankünften.** Die im Fachplan angegebene Regel, wonach jede `expected.arrived:true` ein passendes `arrive` hat, ist als *notwendige* Vertragsbedingung sinnvoll. Zusätzlich muss die behauptete Schlussszene dem **letzten** gemeldeten Ankunftsort entsprechen; nur bereits eindeutige Reihenfolgen auflösen. Ausdrückliche Ortsfelder niemals überschreiben.

**Empfohlener enger Umfang:** O1-B1 nur für die vier spezifizierten Typen, nur `scene:null`/fehlerfrei definierte Vor-Ankunft-`here`, nur bei schlüssiger `answer.scene`/`arrive`-/`expected`-Kette. Parser und World teilen **dieselbe reine Logik**. Keine Änderung an `firewall.js`, `localSceneDelta`, `sceneIssues`, `blockedPeople` oder den eigentlichen Szenen-/Quest-Guards. Die Option O1-B2 ausdrücklich offen lassen.

**Regressionen präzisieren:** Zusätzlich zu P1–P7 und N1–N11 eine **falsch nummerierte Meldung aus einer unerreichten Zielszene vor `arrive`** und eine **explizit abweichende Zwischen-/Schlussszene**. Die erste soll keine stillschweigende Quellenerfindung erlauben; falls der vorhandene Vertrag ihre Erkennung nicht ermöglicht, ist diese **Grenze explizit zu akzeptieren und zu dokumentieren**, statt eine neue Semantik-/Quellen-Engine zu bauen. `here`-Fälle separat von `null`-Fällen abnehmen.

**Wirkung:** Opus sagt für Pilot 01 **drei von vier** Chronologie-Reparaturen weniger und Torv-Name gerettet voraus. Dies ist **eine Prognose aus Originalnachrichten, keine von GPT ausgeführte neue Modell-/Hostabnahme**. Selbst bei bestätigter Ersparnis bleibt O1-B1 eine zielgenaue Optimierung, nicht ein notwendiger Umbau.

### 9.3 O2-stay – Mechanisch einfach, aber nicht automatisch ein stimmiger privater Zimmerort

**Positiv:** Die alte `lodgedHere`-/`roomOfHere`-Ausnahme wird durch `rulesetOf(s) < 2` in aktuellen Kampagnen deaktiviert. Der Firewall-Fall `arrive` verlangt ohne `auth.go`/`auth.roam` sonst eine belegte äußere Ursache. Ein Zimmer als **nicht buchungswirksame Unterkulisse** des Gasthauses könnte die beiden Batch-28-Fälle ohne zusätzliche Bewegung nachträglich erzählbar machen.

**Drei Design-/Codegrenzen:**
1. **Der aktuelle Ort ist zugleich ein Präsenz-/Interaktionsraum.** Wird die Zimmerreferenz auf den Gasthaus-Ort normalisiert, bleiben Figuren im selben `scene.present`-Kontext, obwohl Alaric im privaten Zimmer schlafen soll. `enter`/`leave`, Gespräch, Stealth, Suche und spätere Angebote könnten weiter so behandelt werden, als stünde er am Tresen. Auch abgelegte Gegenstände liegen dann am Gasthaus statt wirklich im Zimmer. Opus erwähnt diese Konsequenzen, gewichtet ihre mögliche spätere Auswirkung aber niedrig. **Eine gemeinsame kanonische Orts-ID bedeutet mehr als eine reine Anzeigeänderung.**
2. **Nicht jede Zimmerbuchung erlaubt eine Bewegung.** Die neue Bedingung „`service.granted` in diesem Zug“ kann auftreten, ohne dass Alaric die Treppe hinaufgehen wollte. Für O2-stay ist das nur dann akzeptabel, wenn die Engine klar kommuniziert, dass **kein eigener Zimmerraum als Zustand entsteht**, und der Erzähler weder zusätzliche freiwillige Reise noch ungewählte Interaktionen behauptet. Ein Raum-/Objektzugang darf durch diese Normalisierung nicht neu autorisiert werden.
3. **Der Testfall `R8` der Opus-Tabelle ist falsch als unveränderte grüne Negativkontrolle eingeordnet.** Ein `arrive` an den **aktuellen** Ort wird in `firewall.js` vor `world.js` mit `no_go` verworfen, solange kein GO/Roam/äußeres Ereignis vorliegt. Erst O2-stay will diesen Firewall-Fall ausdrücklich zulassen. **R8 ist somit eine erwartete Verhaltensänderung (vorher rot, danach grün)**, keine bereits vor dem Patch grüne Kontrolle. Gleichfalls können die unveränderten Positivfälle `Q3` (Folgemorgen) und `Q4` (Pilot ohne `arrive`) **nicht** pauschal „rot gegen `.179`“ sein, obwohl die Abnahmezeile dies für Q1–Q5 verlangt.

**Bewertung:** Das Modell „privates Zimmer ist nur eine narrative Unterkulisse des Gasthauses“ kann eine legitime bewusste *Abstraktion* sein, wenn der Nutzer **keine eigene Raum-/Präsenzmechanik für gewöhnliche Gasthäuser** wünscht. Diese Entscheidung muss klar als **Verzicht auf mechanisch eigenständige Zimmer** dokumentiert sein. Sie löst nicht generell das Problem unbelegter Teilbewegungen. Bei nur zwei belegten Fällen aus drei Läufen ist die Einführung jetzt **nicht zwingend**, und ein begrenzter Prompt-/Korrekturhinweis könnte billiger sein als eine dauerhafte Sondernormalisierung. Ohne bewusste Entscheidung über Privatheit/Präsenz **kein Implementierungs-GO**.

**O2-Testmatrix bereinigen:** R8 unter neue Positivfälle; Q3/Q4 als unveränderte Regressionen; getrennte Gegenfälle „Zimmer als Unterkulisse“ versus „eigenes physisches Lager-/Präsenzobjekt“, NPCs im Schankraum, Objektablage und nicht autorisiertes Betreten gesperrter Nebenräume. Nicht einen neuen Sonderfall nur deshalb implementieren, weil er einen historischen Screenshot glättet.

### 9.4 Priorität, Alternativen und die drei Nutzerentscheidungen

**O1-B1:** **Eingeschränktes GO für eine spätere gezielte Implementierung**, wenn die frischen Daten den Reparaturnutzen bestätigen oder der Pilotfall Torv als bedeutsam bewertet wird. Sicherheitsvoraussetzung: eindeutige Kette, unveränderte beide World-Prüfungen, falsches `seq` als dokumentierte Grenze. Kein neuer Zustandsbegriff, kein neues Quellensystem.

**O1-B2:** **Vorerst nicht umsetzen.** Personen-, Objekt- und Angebotsmeldung braucht stärkere Ortsbelege. Nach natürlichen Reparaturläufen neu bewerten.

**O2-stay:** **Designfrage, kein notwendiger Fix.** Die Entscheidung ist nicht nur „ein gebuchtes Zimmer zählt zum Gasthaus“, sondern: *Soll ein gewöhnliches Gästezimmer überhaupt einen eigenständigen mechanischen Ort mit eigener Anwesenheit und abgelegten Dingen darstellen?* Wenn **nein**, ist O2-stay als enge Darstellungskonvention möglich. Wenn **ja**, darf das Unterkulissen-Modell nicht still eingeführt werden; dann wäre echte Raumbewegung mit folgerichtiger Rückkehr zu planen, derzeit mit geringem Nutzen.

| Offene Frage aus Opus §8 | GPT-Empfehlung |
|---|---|
| **E-1: O1-B1 nach natürlichem Lauf umsetzen?** | **Tendenziell ja**, falls weiterhin ≥1 relevante Chronologie-Reparatur oder verlorener Fakten-/Namensbeleg entsteht; ansonsten Status quo. Keine Freigabe heute erforderlich. |
| **E-2: Zimmer als Teil des Gasthauses (O2-stay)?** | **Nur nach Designentscheidung über Raumgranularität und NPC-/Objekt-Präsenz.** Standardmäßig **zurückstellen**, statt beiläufig eine neue Weltabstraktion einzuführen. |
| **E-3: O1-B2 erst nach Messung?** | **Ja.** Auf dem aktuellen Nachweisstand kein pauschales Ausweiten auf `person.new`, `enter`, `object.move` oder Handel. |

**Was stattdessen vorrangig bleibt:** Ein natürlicher Lauf auf dem unveränderten Build `.179` mit *Ursprungs- statt bloßer Ablehnungszählung*, unabhängiger Beachtung von fehlendem GO in der Plannerantwort, geführter Arbeit/Begleitung (O4), NPC E2/E3, PULSE sowie den tatsächlich reparaturbedürftigen Preisbelegen. **V4-Preis-/Planner-Fachpatch** und gezielte Korpuspflege sind durch die bisherigen Reviews besser begründet als eine sofortige O2-Sonderregel.

**Abschluss:** Der Opus-Fachplan ist als Analyse wertvoll, gerade weil er seine zunächst zu optimistische O1-Bewertung nach echter Fallprüfung zurücknimmt. Der kleinste tragfähige Ansatz ist die **vorsichtige O1-B1-Normalisierung**, nicht das Lockerlassen der Szenen-Guards. **O2-stay ist nur dann sinnvoll, wenn die Vereinfachung gewöhnlicher Gasthauszimmer auf einen gemeinsamen mechanischen Ort ausdrücklich gewollt ist.** Produktbranch und Kanon bleiben unverändert; keine Umsetzung autorisiert.
