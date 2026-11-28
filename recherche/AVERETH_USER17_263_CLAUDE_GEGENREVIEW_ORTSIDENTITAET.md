# Avereth .263 · User17 – unabhängiger Claude-Gegenreview zu Ortsidentität und Reisekette

Stand 28.11.2026. Produkt `4.3.0-c.6.6.263`, Commit [`928172b9`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/928172b9bbaae3d133bad7097100dc2127334b8e) auf `experiment/211-openrouter-helper-single-runner` (unverändert). GPT-Erstreview: [REVIEW.md](../testrun_10b/user-20261128-051828-263/REVIEW.md). Keine Produktimplementierung, keine Kanonänderung, kein Providerrequest. Alle Proben liefen offline in einer isolierten Analysekopie mit den archivierten Modellantworten. Skripte: [claude_user17_263/](claude_user17_263/).

## Kurzurteil

1. **GPT hat die Hauptursache richtig verortet: T9, Extractor, falsche Identität des Ziels.** Bis T8 ist alles regelkonform. In T9 erreicht die Erzählung das Tor des bekannten Dungeons. Der Extractor meldet es als neue `site` „Ruined chapel above the ford“ unter dem Realm. T10 und T11 sind Folgefehler auf diesem falschen Ortsgraphen. Die T11-Ablehnung ist berechtigter Schutz gegen einen bereits falschen Zustand.
2. **Die Ursache ist keine reine Modellschwäche.** Drei Engineanteile machen aus einer missverständlichen Antwort einen dauerhaften Zustand:
   - **Kontextlücke.** X sieht den GO ohne Ziel-ID („GOES — to Old Crown Catacombs“). Dass die Dungeon-ID zugleich ihr Tor ist, steht nirgends. Gezeigt wird nur „beneath a ruined chapel“, und das legt eine eigene Kapelle nahe.
   - **Der Repair seit .254 bietet die Ausflucht ausdrücklich an:** „Report the actual stop **or correct the objective answer**“. X kippt `arrived:true` auf `false`. Dadurch wird dieselbe falsche Kapelle über `onTheWay` zu einem gültigen Zwischenhalt.
   - **Die Identität wird aus Wörtern abgeleitet,** obwohl die Engine das Ziel des Schritts kennt. Der seit Patch 8 vorhandene Fix für genau diese Kapelle (`entranceOf`) greift nur bei exaktem Tornamen.
3. **Persistente Schwäche, kein reiner .263-Fehler.** Dieselbe Doppelkapelle entstand schon am 06.11. User16 zeigt das gleiche Ablehnungsmuster am Mossback-Eingang. Die Fixes .222 und .225 (`approaching`) sowie Patch 8 (`entranceOf`) behandeln Symptome derselben Wurzel. **.254 hat das Symptom verschärft:** Ohne den neuen Repair wäre T9 abgelehnt worden (Szene verloren, Spieler wiederholt). Mit ihm bleibt die falsche Identität dauerhaft.
4. **Empfehlung: gezielte Konsolidierung vor dem nächsten persönlichen Test, keine neue Architektur.** Variante B wird so umgesetzt: Die Identität eines bekannten Ziels kommt aus dem gebuchten Schritt, die Ankunft bleibt die Aussage des Modells. Dazu kommen Kontext und Repairtext aus A. Extract und World bekommen dieselbe Identitätsprüfung. Der Prototyp besteht 3662 von 3662 Produkttests, reproduziert User17 korrekt bis in den Dungeon und hält die Gegenproben. Eine Restlücke ist offen und benannt.

## 1. Quellen und Verfahren

| Quelle | Bytes | SHA-256 | Ergebnis |
|---|---:|---|---|
| Chat-JSONL | 392.833 | `562259c8…353c` | identisch mit Manifest |
| Eventexport | 104.319 | `213d64ba…75bf` | identisch mit Manifest |
| ST-Log (UTF-16LE) | 3.442.686 | `9cf42757…867e` | identisch mit Manifest |
| Feedback | 895 (Archiv) | `a4b0b651…99db` | **nicht byteidentisch** mit Manifest (897 B, `dab604a7…`); Originalupload lag mir nicht vor |

- **Modellantworten:** Aus dem ST-Log habe ich alle **28 physischen Request/Response-Paare** in Chatreihenfolge zugeordnet ([st_answers.py](claude_user17_263/st_answers.py)). Die 9 Erzählantworten sind textgleich mit dem Chat, die Prompttokenzahlen jedes P/X-Aufrufs stimmen mit den Chatrecords.
- **Treue Reproduktion:** Die echte Runtime aus `928172b9` verarbeitet alle 20 Engineschritte M1–M22 mit diesen Antworten ([replay17.mjs](claude_user17_263/replay17.mjs)). **Alle 20 erzeugen dieselben normalisierten Events wie das Original,** einschließlich T9-Repair und T11-Ablehnungen. Ergebniszustand, Orte und `link.1` sind identisch.
- **Gegenproben** ersetzen gezielt einzelne archivierte Antworten durch kontrollierte Antworten ([probes.mjs](claude_user17_263/probes.mjs), [adapt_*.mjs](claude_user17_263/)). Planner- und Erzählerantworten bleiben archiviert, außer wo ausdrücklich ersetzt.
- **Was die Proben nicht ersetzen:** Prompttexte verändern das Modellverhalten. Ihre Wirkung (A) ist offline nicht messbar und braucht eine echte Modellprobe.

## 2. Rekonstruktion T8–T11

M zählt Chatnachrichten ohne Header ab 0. Die Zeiten sind die gespeicherten Stufenzeiten, nachgerechnet gleich GPT.

### T8 · M15/M16 · „*i make my way over to the Catacombs*“

| Stufe | Inhalt |
|---|---|
| P | `go to:"loc.old_crown_catacombs"` (4,2 s). Bekannte ID, korrekt. |
| Engine | `dungeon.established` (Torname: ruined chapel, chapel stair, chapel yard, chapel lodge; Gebühr 0). `auth.go`: `mode:dungeon`, `enter:{root, gate:false}`, `scope:root`. PULSE Reise 50,75 % gegen 46,51 → **offen, `trace`**. |
| N | Weg nach Westen. Die Kapelle wird sichtbar. „Still a good twenty minutes out“ folgt der tote Hund. Halt (26,4 s). |
| X | `arrived:false`; `arrive {new: roadside west of Alderwatch, wilderness, parent realm}`; Fakt Kadaver; Thread Zeichen (24,1 s, kein Repair). |
| Gebucht | Neuer Ort `loc.roadside_west_of_alderwatch`, `scene.moved`. **60 min** Reise (Untergrenze `go_min_elsewhere`, X nannte keine Minuten). `scene.approaching = loc.old_crown_catacombs` ([state.js:169](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/state.js#L169)). |

**Bewertung:** legitimer PULSE-Halt. Die Kontinuität bleibt erhalten.
- **Nebenbefund Kadaverfakt:** Er hängt am falschen Subjekt (`loc.alderwatch.verge` statt dem neuen Straßenort).
- **Nebenbefund Zeit:** 60 min für ein Stück, das laut Erzählung 20 min vor dem Ziel endet.

### T9 · M17/M18 · „*i ignore it and continue onward to the catacombs*“

| Stufe | Inhalt |
|---|---|
| P | `go to:"loc.old_crown_catacombs"` (6,2 s). Bekannte ID, korrekt. |
| Engine | Gleicher Schritt wie T8, `enter.gate:false`. PULSE Szene 20 % gegen 59,08 → geschlossen. |
| N-Kontext | „TRAVEL THIS TURN — GOES — to Old Crown Catacombs“. Questgedächtnis: „known destination: … beneath a ruined chapel an hour's ride west“. **Kein Torblock, keine Tornamen.** |
| N | Ruine am Furtufer, gepflegter Hof, Ossler, „Stair's through the chapel“. Er führt Alaric durch die Tür zum Treppenkopf. Stopp: „waiting to see whether the young mage meant to go down now“ (31,8 s). Das N-Reasoning plant bewusst den Halt am Tor. **Erzählerisch sauber.** |
| X-Kontext | `PLAYER ACTIONS: 1. GOES — to Old Crown Catacombs` (**ohne ID**). `PLACES: loc.old_crown_catacombs (… a Dungeon … beneath a ruined chapel an hour's ride west of Alderwatch)`. Die Regel „When Alaric reaches a place he set off for (the GO's place id), that id is where he arrived, however the reply describes it“ steht im Systemprompt ([deltas.json:45](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/content/deltas.json#L45)). Die ID des GO wird aber nirgends ausgewiesen. |
| X 1. Versuch (42,2 s) | `expected 1 arrived:true` mit der Begründung „reached catacombs site“. `arrive {new: Ruined chapel above the ford, site, parent realm}`. `person.new Ossler at {new:"Ruined chapel above the ford"}` (Kurzform). `arrive {new: Chapel stairwell…, interior, parent {new:"Ruined chapel…"}}`. `passage from {new:"Chapel stairwell…"}` (Kurzform) `to {new: Old Crown Catacombs, first level door, parent loc.old_crown_catacombs}`. Dazu Öl und 60 min Zeit. |
| Repairanforderung | Drei Schemafehler (verkürzte Ortsreferenzen bei `person.new.at`, `arrive.at`, `passage.from`) und der semantische Fehler „GO 1 reports its objective reached without its corresponding arrive delta. **Report the actual stop or correct the objective answer.**“ ([extract.js:718](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/extract.js#L718)) |
| X Repair (39,3 s) | Reasoning: „He reached the chapel and stairwell, **not the catacombs proper** … I'll say arrived false, with intermediate arrives.“ Die Referenzen werden ausgeschrieben, die falsche Kapelle bleibt. |
| Gebucht | Acht Deltas, null Ablehnungen. Neue Orte: Kapelle (site, Realm), Treppe (interior, Kapelle) und **„Old Crown Catacombs, first level door“ (interior im echten Dungeon, `level:1`)**. `link.1` verbindet Dungeonwurzel und Tür ([world.js:3041](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L3041): „from outside, a way in starts at the dungeon itself“). 60 min Reise (Zeitangabe von X). Szene: Treppe. `approaching` bleibt gesetzt. |

**Bewertung:**
- **Warum der erste Versuch abgelehnt wurde:** Die Prüfung in `extract.js` vergleicht den Endpunkt des GO (`loc.old_crown_catacombs`) mit den Ortsschlüsseln der Ankünfte. Eine neue Kapelle hat einen anderen Schlüssel. Die Engine hatte also recht, dass Aussage und Ort nicht zusammenpassen.
- **Warum der Repair durchkam:** Die World prüft `allowedArrival` ([movement.js:121–157](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/movement.js#L121-L157)). Bei `arrived:false` gilt `onTheWay`: Eine neue Stätte im selben Realm ist ein zulässiger Halt vor dem Ziel. Bei `arrived:true` greift die Regel nicht, die Ankunft wird abgelehnt.
- **Der Repair entscheidet also nicht über den Ort, sondern nur darüber, welcher Prüfpfad gilt.** Probe B2 (§5) zeigt das direkt: Bei sonst gleichem Inhalt bucht die Engine dasselbe, egal ob `arrived` true oder false ist. `expected.go.arrived` ist ein Schalter, kein Wahrheitswert.

### T10 · M19/M20 · „*i nod and then go down*“

| Stufe | Inhalt |
|---|---|
| P | `go {new:"down the stairwell beneath the altar slab"}`. Reasoning: „dungeon-like, EXITS not listed“. Die Engine resolviert das nicht auf die Dungeon-ID. `mode:travel`, `enter:null`, `scope:null`. |
| N | Lampe und Öl mit eigener Zündung. Das ist ein kleiner Übergriff: Alaric nimmt das Öl ohne Wahl, ein Besitz wird nicht gebucht. Abstieg, Stopp vor der geschlossenen Tür (34,9 s). |
| X | `arrived:true`; `arrive {new: Landing before the iron-banded door, interior, parent loc.ruined_chapel_above_the_ford}` (19,9 s). |
| Gebucht | Neuer Ort unter der falschen Kapelle, 15 min (Untergrenze `go_min_same_settlement`). **`scene.approaching` wird gelöscht.** `scene.moved` ohne GO mit `enter.root` setzt ihn nicht neu ([state.js:163–170](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/state.js#L163-L170)). |

Jetzt existieren **zwei Türen**: „Landing before the iron-banded door“ unter der Kapelle und „first level door“ im Dungeon, verbunden mit der Wurzel. Keine Komponente verbindet sie.

### T11 · M21/M22 · „*i enter the dungeon*“

| Stufe | Inhalt |
|---|---|
| P | `go {new:"the dungeon beyond the iron-banded door"}`. PLACES enthält `loc.old_crown_catacombs`, HERE zeigt den falschen Kapellenpfad, es gibt keine Zeile „DUNGEON DESTINATION“ (der Anker fehlt). |
| Engine | `mode:travel`, `enter:null`. Probe P13: An diesem falschen Ort löst die Engine weder „the dungeon“ noch den langen Text auf, nur „the catacombs“. An der Straße (T8-Zustand) lösen „the dungeon“, „the ruined chapel“ und „the chapel stair“ alle auf die ID auf (P12). |
| N | Tür, Gang, erste Halle mit zwei Wegen (26,8 s). |
| X | `arrived:true`, `arrive {new: First hall…, interior, parent loc.old_crown_catacombs}`, zwei Fakten, ein Thread, zwei Passagen mit Kurzform-Referenzen (30,4 s). |
| Gebucht | **Abgelehnt:** `passage` „First hall … lies in Old Crown Catacombs, where he did not set out for“ ([world.js:2866](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L2866)). Dazu drei `scene_context`-Folgeablehnungen, zwei Schemaablehnungen und `arrival_evidence`. Kein `scene.moved`, Alaric bleibt am falschen Treppenabsatz. |

**Zustand nach jedem Zug** (aus der treuen Reproduktion):

| nach | `scene.at` | `approaching` | Uhr | neue Orte (Elternteil) |
|---|---|---|---|---|
| T8 | roadside_west_of_alderwatch | old_crown_catacombs | 10:15 | roadside (Realm) |
| T9 | ruined_chapel….chapel_stairwell | old_crown_catacombs | 11:15 | Kapelle (Realm), Treppe (Kapelle), first_level_door (**Dungeon, L1**) |
| T10 | ruined_chapel….landing | – | 11:30 | landing (Kapelle) |
| T11 | unverändert | – | 11:30 | – |

## 3. Einordnung der Befunde

| # | Befund | Kategorie |
|---|---|---|
| 1 | X erzeugt für das Tor des bekannten Ziels eine neue Stätte | **Modellfehler bei unvollständigem, irreführendem Kontext**: GO-ID nicht ausgewiesen, Tor ≙ Dungeon-ID nirgends genannt, „beneath a ruined chapel“ |
| 2 | Repair bietet „correct the objective answer“ an; X kippt `arrived` und behält den Ort | **fehlerhafter Engineübergang**: semantische Prüfung ohne Ziel-ID, mit Ausflucht, seit .254 |
| 3 | `arrived:false` + neue Stätte im Realm wird als Halt akzeptiert | **für sich korrekte Regel**: P4a (echter Halt) braucht sie; falsch nur im Zusammenspiel mit #1/#2 |
| 4 | Identität des Ziels aus Wörtern (`entranceOf`, Ortsbuch) statt aus dem Schritt | **fehlerhafter Engineübergang/Architekturlücke**: verletzt die eigene .190-Regel „none of them works the target out again from the reply's words“ ([movement.js:1–9](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/movement.js#L1-L9)) |
| 5 | Kurzform `{"new":"Name"}` für einen im selben Bericht angelegten Ort ist ein Schemafehler | **überflüssige Validierung**: der Bezug ist eindeutig. Sie erzwang in T9 den Repair und öffnete damit #2. Mit .261 wird sie für sich allein teilabgelehnt (B-Proben: kein Repair nötig). |
| 6 | Erzählter Raum „first level door“ entsteht im Living Dungeon mit Ebene 1 | **fehlender Schutz**: `passage()` erkennt den Living Dungeon nur an Szene/ID-Strings, nicht an `{new, parent: root}` ([world.js:3016–3020](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L3016-L3020)). Laut Code macht ein sektionsloser Raum der Ebene die Ebene zum „older save“-Fall (`pure(level)` in `livingGo`). |
| 7 | `approaching` wird beim ersten Zug ohne `enter.root` gelöscht | **fehlerhafter Engineübergang**: der Anker hält nur einen Zug weit |
| 8 | T10 P wählt `{new}` statt Dungeon | **Folgefehler** auf falschem Zustand. Kein eigenständiger P-Fehler: am korrekten Ort (Kette A) macht dieselbe P-Antwort das Richtige. |
| 9 | T11 Ablehnung `where he did not set out for` | **berechtigter Schutz** gegen den bereits falschen Graphen; nicht abschalten (GPT richtig) |
| 10 | T11 drei `scene_context`-Folgeablehnungen | **berechtigte Kaskade** (G4 der Grundanalyse 14.11) |
| 11 | 135 min Reisezeit | **fehlerhafter Engineübergang** (Zeitbuchung ohne Streckenbudget), §7 |
| 12 | T10 Öl und Lampe ohne Wahl | **Modellfehler N**, klein, unabhängig |

**Wo GPT vereinfacht oder etwas übersehen hat:**
- Die Rolle des **.254-Repairtexts** (#2) fehlt. Ebenso die Feststellung, dass `arrived` den gebuchten Ort nicht ändert.
- GPT nennt `approaching`, `sectionArrival` und `gateCheck` als „vorhandene Mechanismen“, nicht aber **`entranceOf`**. Das ist der Patch-8-Fix für genau diese Kapelle, und er scheitert an der Wortlautabhängigkeit.
- **Die Kontextlücke (#1)** und der Schutzmangel im Living Dungeon (#6) fehlen.
- GPTs Formulierung „X-Repair darf eine falsche Ortsidentität nicht bloß mittels `arrived:false` umdeuten“ trifft den Kern. Eine Sperre allein reicht aber nicht: Bei einem echten Halt (P4a, Pilot T61) ist genau dieser Wechsel korrekt. Unterscheiden kann nur die Zielidentität, nicht das Feld.

## 4. Verantwortung entlang der Kette

| Komponente | Soll | in T9 tatsächlich |
|---|---|---|
| Planner GO | bekannte ID wählen | ✔ `loc.old_crown_catacombs` |
| GO-Handler / `stepFields` | Schritt festlegen: Ziel, `enter`, `scope`, Tor | ✔ `mode:dungeon`, `enter.gate:false` (Name ohne Torwort ⇒ hinein durch das Tor) |
| Ortsbuch / bekannte Wege | Planner-Worte auflösen | ✔ an der Straße; ✘ später am falschen Ort (P13) |
| PULSE | Reiseunterbrechung | ✔ T8 offen, T9 geschlossen |
| `scene.approaching` | Dungeonziel über Außenhalte halten | ✔ T8/T9, ✘ ab T10 gelöscht |
| Narrator | Weg erzählen, an echter Wahl stoppen | ✔ stoppt am Tor (wahrnehmbare Entscheidung) |
| X-Kontext | Ziel-ID und Bedeutung des Ziels | ✘ ID nicht in PLAYER ACTIONS, Tor nicht beschrieben |
| Identität (`placeIdentity` → `entranceOf` → Ortsbuch) | Bericht auf bekannte Orte abbilden | ✘ nur Namensstufen; „ruined chapel“ exakt hätte gegriffen (P11), „Ruined chapel above the ford“ nicht |
| `expected.go.arrived` + Repair | Ankunftsaussage prüfen | ✘ Ausflucht „correct the objective answer“ |
| `allowedArrival` | Ort gegen Schritt prüfen | regelkonform, aber auf falscher Identität |
| `sectionArrival` | Tor und Abschnitte | hätte gegriffen, wenn Alaric an der Wurzel gestanden hätte („AT THE GATE“, [world.js:2939–2943](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/world.js#L2939-L2943)) |
| Passage-/Dungeonschutz | Living-Dungeon-Wege gehören der Engine | ✘ Lücke bei `{new, parent: root}` (#6) |
| Zeit | erzählte oder Mindestzeit | ✘ ohne Streckenbudget |

**Warum verliert ein bekanntes, autorisiertes Ziel bei gewöhnlicher Erzählung seine Identität?** Die Engine kennt das Ziel des Schritts sicher, entscheidet die Identität des erreichten Orts aber erneut aus den Wörtern des Berichts. Dass ein Bericht das bekannte Ziel sein könnte, prüft sie nur über Namensähnlichkeit: Tornamen exakt, Dungeonname im Text oder ein Elternteil gleich der Dungeon-ID. Sobald das Modell den Ort anders beschreibt, entsteht ein neuer Ort. Die Ankunftsaussage des Modells (`arrived`) wird dann nur noch als Schalter zwischen zwei Prüfungen genutzt.

**Gibt es eine Lösung, die nicht konsequent genutzt wird?** Ja, gleich mehrere Teillösungen:
- **Regel 35 im X-Prompt.** Das Ziel ist die ID, wie immer es beschrieben wird. X fehlt aber die ID am Schritt.
- **`sectionArrival` „AT THE GATE“.** Ein Ort, der als Teil des Dungeons erzählt wird, ist das Tor. Das gilt aber erst, wenn Alaric schon an der Wurzel steht.
- **`entranceOf`.** Hängt am Namen.
- **`gateAlias`.** Eine Wortliste.
- **`approaching`.** Hält nur einen Zug.
- **Grundanalyse 14.11, A2.** Dort ist empfohlen, dass der Bewegungsplan Identität und Eltern vorgibt. Mit .190 wurde das für Ziel, Modus und Scope umgesetzt, **nicht aber für die Identität des erreichten Ziels**.

## 5. Offline-Gegenproben

Alle Proben laufen auf der Runtime `928172b9` (Basis) oder einer Analysekopie mit Variante B. B ist hinter der Umgebungsvariable `U17_VARIANT=B` geschaltet; ohne sie ist die Kopie identisch mit dem Produkt ([Diff](claude_user17_263/variant_B_target_identity.analysis.diff)).

| Probe | Basis .263 | Variante B |
|---|---|---|
| **Treue Reproduktion** M1–M22 | 20/20 Schritte eventgleich | T9 → Tor `loc.old_crown_catacombs`, kein Repair; T11 → `l1_s1` |
| **Kette A**: nur T9-X kanonisch (`arrive at: loc.old_crown_catacombs`), danach archivierte P/N | T10 P (archiviert) → Abschnitt 1 mit Torbegegnung `bones`; T11 → Abschnitt 2; null Ablehnungen | gleich |
| **P1** T9 Original-Erstantwort | falsche Kapelle (Repair-Kipp) | **Tor**, ein X-Aufruf statt zwei |
| **P2** Erstantwort schon `arrived:false` + Kapelle | falsche Kapelle | **falsche Kapelle** (Restlücke, §6) |
| **P11** exakter Torname „ruined chapel“ | Tor, aber Treppe abgelehnt, Öl/Passage verloren (Teilerfolg) | Tor, vollständig |
| **P4a** wirklich andere Kapelle auf dem Weg, `arrived:false` | Halt akzeptiert | Halt akzeptiert |
| **P4b** andere Kapelle, fälschlich `arrived:true` | abgelehnt + Repair | **an Tor gebunden** (Restrisiko, §6) |
| **P8** Torziel („catacombs entrance“, `enter.gate:true`) | – | Tor, nicht drinnen |
| **P3** am Tor „go down“ | (Folgefehler) | Abschnitt 1 mit Torbegegnung. Hinweis: `ENTER` enthält `down`/`on`/`onward` ([sections.js:86](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/sections.js#L86)); die gefegte Wärtertreppe ist kein eigener Torort |
| **P7** Torgebühr 20 cp (Analysekopie) | – | „go down“ → ENTRY FEE pending, bleibt am Tor ✔ |
| **P6** Rückweg aus Abschnitt 2 nach Alderwatch | – | CLARIFY: Rückweg durch Abschnitt 1 mit den Skeletten ✔ (Beschriftung zeigt interne Ref `old_crown_catacombs_c1_l1_e1 1`) |
| **P12/P13** Plannerfreitext | Straße: alle vier Formen → Dungeon-ID; falscher Absatz: nur „the catacombs“ | – |
| **Kette B** falscher Zustand, T11 P mit Dungeon-ID | Eintritt in `l1_s1`, **aber**: unnötiger Repair; Record „movement was not booked“, obwohl gebucht; **keine Torbegegnung** | – |
| **B2** wie B, Repair kippt `arrived:false` | dieselbe Buchung | – |
| **P14** von echtem Außenhalt (Straße) direkt hinein erzählt | Eintritt ohne `dungeon.ahead` (Torbegegnung fehlt), ohne Gebührenzeile im Befehl; Repair + falscher Record | – |
| **P14 mit Gebühr** | World verweigert (✔), Narrator kannte die Gebühr nicht; Abschnittsknoten `l1_s1` trotz Ablehnung angelegt | – |
| **ohne .254-Prüfung** (Analyseumschalter) | T9 Kapelle abgelehnt, Ossler verloren, 9 Ablehnungen, Alaric bleibt an der Straße | – |
| **Produktsuite** `npm test` | 3662/3662 | **3662/3662** (eingeschränkte Fassung; die erste, breitere Fassung fiel in 3 Tests, darunter Pilot01 T61) |

**Nicht ausgeführt:** Partyreisen mit echten Begleitern (es gibt keine im Run; B ändert nur Ortsreferenzen, `arrive.with` bleibt) und mehrere gleich plausible Dungeons (dort entscheidet weiterhin CLARIFY vor dem Schritt). Beide gehören in Codex' Abnahme.

**Werkzeugbefund:** `tools/replay/user16_scene.mjs`, die einzige vorhandene Kettenreplay für einen Dungeonzugang von außen, läuft auf .263 nicht mehr („unused mock at M28“, gleich mit und ohne B). Sie ist nicht Teil von `npm test`.

## 6. Vergleich mit früheren Fällen

| Fall | Muster | damaliger Fix | Bezug |
|---|---|---|---|
| Patch 8 (live 21.10.) | Kapelle über Old Crown als eigener Ort | `entranceOf` (Tornamen, Name+Lage, Elternteil) | **derselbe Fall**, wortlautabhängig gelöst |
| User 06.11. | „Ruined chapel above Old Crown Catacombs“ als eigene `site`, parallel Ankunft an der ID | – (folgenlos, weil X zusätzlich die ID nutzte) | doppelte Identität schon damals |
| .186/.188 (Grundanalyse 14.11) | G2 „Der Extractor ist Kartograf“, doppelte Orte, K1 Engine widerspricht sich | .190 Ortsbuch + Bewegungsnachweis | Kern der Empfehlung nur teilweise umgesetzt |
| User16 (.220) T15/T16 | Echter Außenhalt am Mossback, Freitext-GO ohne `enter`, X meldet Innenraum, Ablehnung `where he did not set out for` + `scene_context` | .222/.225 `approaching` (Anker + Zitat endet auf Dungeonnamen) | **dasselbe T11-Muster**; Anker trägt nur einen Zug, Zitatheuristik |
| .252/.254 | `expected.go.arrived` entscheidet bei unbekanntem Ziel über die Erledigung | .254 semantische Ankunftsprüfung mit Ausweg | hat User17 vom Ablehnungs- zum Identitätsfehler verschoben |

**Urteil:** Die früheren Fixes behandeln Symptome derselben Wurzel: Die Identität eines bekannten Ziels entsteht aus Wörtern, und Ankunftsaussage und Ankunftsort sind zwei konkurrierende Meldungen. Die Grundanalyse vom 14.11. hat beides benannt („`expected.<seq>.arrived` neben `arrive` … zusammenführen“; „Steht ein Bewegungsplan dahinter, gibt dieser die Eltern vor“). Beides ist für den Fall „bekanntes Ziel erreicht“ offen.

**Konkurrierende Wahrheiten über dieselbe Spielerhandlung:**
- `extract.js` erkennt die Ankunft nur über den Ortsschlüssel oder den Abschnittsvorschau-Pfad.
- `world.js` (`sectionArrival` von außen) bucht denselben Bericht als Eintritt.
- Folge: ein unnötiger Repair mit etwa 30 s und der Record „movement was not booked“ neben einem gebuchten `scene.moved` (Kette B, P14).

Außerhalb der Reise zeigt das ältere Muster aus dem Population-Repair, dass es auch anders geht. Dort darf ein Repair eine schon erklärte Zugehörigkeit nicht verwerfen, nur um die Prüfung zu bestehen ([extract.js:678–686](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/v4/extract.js#L678-L686)).

## 7. Reisezeit, Laufzeit, Prompt

**135 min statt etwa 65–75 min:**
- **T8: 60 min.** Das ist die Untergrenze `go_min_elsewhere` ([rules.json:566](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/content/rules.json#L566)) für einen PULSE-Halt, laut Text 20 min vor dem Ziel, also etwa 40 min tatsächlich.
- **T9: 60 min.** So viel nannte X für die restlichen 20 min. Die Engine akzeptiert die Angabe, weil ein Reiseabschnitt gebucht wurde (der falsche).
- **T10: 15 min.** Untergrenze `go_min_same_settlement` (Straße und Kapelle liegen beide in keiner Siedlung) für eine Wendeltreppe.

Die Engine zählt also nichts doppelt. Ihr fehlt ein **Streckenbudget**: Die bekannte Gesamtdauer („an hour's ride“, als Fußweg nicht unterschieden) wird nicht über Teilstücke verrechnet. Mit B bucht T9 15 min (die 60 min von X werden mangels Abschnitt abgelehnt). Das ist näher, aber auch nur eine Untergrenze. Ein Streckenbudget gehört nicht in denselben Fix, sollte aber als eigener kleiner Punkt folgen.

**Laufzeit:** T9 hatte 119,4 s Komponentenzeit (P 6,2, N 31,8, X 42,2 + 39,3). Der Repair (39 s) entsteht direkt aus #2 und #5. Mit B entfällt er (P1: ein X-Aufruf). Kette B und P14 zeigen einen weiteren vermeidbaren Repair, der durch die konkurrierenden Prüfungen entsteht. Die Promptgröße (etwa 14,7k Token pro X) ist hier nicht ursächlich.

## 8. HUD und kleiner CSS-Leitfaden

| Beobachtung | Ursache im Code |
|---|---|
| Party-Button weiß, schlecht lesbar | Er sitzt im HUD jeder Nachricht ([hud.js:328](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/hud.js#L328), `button[data-avereth-party]`). Die gemeinsame Schwarz/Weiß-Regel zählt Buttons einzeln per Attribut auf; `[data-avereth-party]` fehlt ([style.css:187–196](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/style.css#L187-L196)). Ebenso fehlen die Buttons im Partydialog (`#avereth-party-panel`, im `body`). |
| Party über dem World-HUD, andere HUDs unten | Party ist Teil des Nachrichten-HUDs, Rasten/Wege/Handel sind Teil des Composers über dem Eingabefeld. Zwei Orte nach Bauart, nicht nach Bedeutung. Daher erscheint der Button auch bei jeder Nachricht. |
| „Bekannte Wege“ falsch eingerückt | `details` ohne Klasse `avereth-shop`, während „Rasten“ sie hat ([action_composer.js:71–73](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/action_composer.js#L71-L73)) |
| „Gespeichert/Weltabgleich“ an zweiter Stelle | `#avereth-action-status` steht im zweiten `div` nach `#avereth-action-home` ([action_composer.js:25](https://github.com/Mango1331/Claude-AI-RPG-Game/blob/928172b9bbaae3d133bad7097100dc2127334b8e/avereth-engine/src/action_composer.js#L25)) |
| viele Klappleisten | Rasten, Wege, Handel und Party wachsen einzeln hinzu |

**Leitfaden-Vorschlag (klein):**
1. Eine Basisklasse für jeden Engine-Button (`.avereth-btn`) und eine für jede Klappleiste (`.avereth-panel`) statt Attributlisten. Neue Komponenten erben dann automatisch.
2. Feste Reihenfolge im Composer: Status → aktuelle Handlung → gesammelte Klappleisten (eine Leiste „Weitere Aktionen“ mit Rasten, Wege, Handel, Party).
3. Party einmal im Composer, nicht in jedem Nachrichten-HUD. Im Nachrichten-HUD höchstens eine Textzeile.
4. Ein Snapshot-Test im isolierten ST-Smoke prüft Kontrast und Reihenfolge.

Das ist vom Ortsbefund getrennt und kein Blocker. Die Einschränkung des Nutzers („während der Reise weniger HUDs“) spricht gegen ein großes Redesign.

## 9. Lösungsvarianten

**A – gezielter kleiner Fix (Kontext + Repairtext).**
- X sieht am GO die Ziel-ID und bei einem echten Dungeon dessen Tortext aus dem Content („the stair beneath the ruined chapel, watched by the temple wardens“). Dazu der Satz: „Being at its way in is arrive at loc.old_crown_catacombs, not inside.“
- Der semantische Repair nennt die ID und streicht die Ausflucht.
- *Pro:* winzig, keine neue Mechanik. *Contra:* nur Prompt, Wirkung offline nicht nachweisbar. Lässt P2 offen, wenn das Modell trotzdem „nicht erreicht“ antwortet. Behebt Kette B und P14 nicht.

**B – konsequente Bindung an das autorisierte Ziel.**
- Meldet ein Bericht für einen Schritt mit bekannter Ziel-ID die Ankunft (`arrived:true`) und nennt keine Ankunft an dieser ID, aber genau eine neue Außenstätte neben ihr, dann ist diese Stätte das Ziel. Alle Bezüge im Bericht werden auf die ID umgeschrieben.
- Ziel und neue Stätte müssen außerhalb jeder Siedlung liegen, der Elternteil der neuen Stätte muss Realm, Region oder Wildnis sein.
- *Claim + State:* Die Aussage (erreicht) ist die des Modells, die Identität die des gebuchten Schritts. Kein Namensabgleich mit Weltorten; Namensgleichheit nur innerhalb desselben Berichts (Rückbezug).
- *Gemessen:* §5, 3662/3662.

**C – vereinfachte Zuständigkeit.** Für Schritte mit bekanntem Ziel liefert X keinen Ankunftsort mehr, sondern nur eine Ankunftsaussage je Schritt (`reached: target | stop | none`). Die Engine setzt die Identität. Das ist die vollständige Umsetzung der Empfehlung vom 14.11. Sauberer, aber ein Vertragswechsel mit Migrationsaufwand für Korpus und Repair.

**Empfehlung: B + A, ergänzt um eine gemeinsame Identitätsfunktion für Extract und World.** Das ist kein Bündel von Sonderfällen, sondern genau ein Prinzip: **Ein bekanntes Ziel behält seine ID von der Autorisierung bis zur bestätigten Ankunft.** Dieses Prinzip wird an den drei Stellen angewandt, die heute jede für sich raten. C bleibt das mittelfristige Ziel, falls B im Spiel trägt. Es verträgt sich mit B, weil B genau die Abbildung `reached: target → ID` vorwegnimmt.

**Risiken der Empfehlung:**
- **P4b in offenem Land:** Eine falsche Erreicht-Aussage an einem anderen Ort führt zur Bindung an das Tor. Dasselbe Risiko besteht heute schon, wenn X direkt die ID schreibt. B fügt keine neue Fehlerklasse hinzu, entfernt aber einen Repair, der das teilweise abfing.
  - *Abmilderung:* B nur, wenn in diesem Zug kein PULSE offen war, denn PULSE ist die Hauptquelle echter Zwischenhalte. Außerdem ist Alaric danach am Tor, nie drinnen.
- **P2** (ehrlich mehrdeutige Erstantwort `arrived:false`) löst nur A. Das braucht eine Modellprobe.
- Innerhalb von Siedlungen bleibt B bewusst aus: Pilot01 T61 und die .190-Regel „scope ist kein Ziel“.

**Behalten:**
- `allowedArrival` mit `onTheWay` (echte Halte)
- `sectionArrival` inklusive „AT THE GATE“
- `gateCheck`/`wayRefused` (Gebühr, Kapazität)
- die T11-Schutzregel
- PULSE
- bekannte Wege, Ortsbuch, `entranceOf` für Berichte (`place.reported`)

**Zusammenführen:** die Ankunftsprüfung in `extract.js` (L691–722) mit der World-Identität. Beide rufen dieselbe Funktion „Endpunkt dieses Schritts“ auf, einschließlich Eintritt von außen.

**Später entfernen** (nach einem Lauf mit B ohne Treffer): `gateAlias` (Wortliste, durch B ersetzt) und die Zitatheuristik aus .225 (`entry.endsWith(name)`). Den Anker `approaching` behalten, aber nicht weiter mit Wortregeln ausbauen.

**Nicht tun:** keine Wortlisten für Kapelle, Treppe oder Tür, kein globales Fuzzy-Matching, kein automatisches Betreten, kein pauschales Annehmen von `arrive`, keine nachträgliche Zuordnung bestehender Orte zu Dungeons.

## 10. Minimale Umsetzung (für Codex)

1. **`movement.js`: `targetIdentity(answer, s)`**, aufgerufen am Anfang von `newPlaceScope` (wirkt damit in `parseExtraction` und `applyWorld`). Ausgangspunkt ist der Analyseprototyp, rund 25 Zeilen. Dazu die PULSE-Bedingung.
2. **`extract.js` L691–722:** Die Ankunftsprüfung nutzt dieselbe Endpunktlogik wie die World, einschließlich Eintritt von außen in einen Living Dungeon. Der Repairtext nennt die Ziel-ID: „GO 1 went to loc.X. If the reply's place is it or its way in, use that id; if he stopped short, arrived false.“ Die Ausflucht „correct the objective answer“ entfällt.
3. **X-Kontext (`commands.js` GO-Zeile für X oder `catalog.js`):** die ID am Schritt („GOES — to Old Crown Catacombs (loc.old_crown_catacombs)“) und bei echtem Dungeon den Tortext aus `living.gate.text` (Content, keine neue Wortliste).
4. **`world.js` `passage()`:** Wurzel auch aus `{new, parent}` erkennen, damit kein erzählter Raum im Living Dungeon entsteht (#6).
5. **Getrennt, klein:** Beim Eintritt von außen per Name (P14) laufen Torprüfung und `aheadEvents` wie beim Eintritt vom Tor. Nach einer abgelehnten Ankunft bleibt kein angelegter Abschnitt zurück.
6. **Getrennt, nicht blockierend:** Streckenbudget (§7) und HUD-Leitfaden (§8).

## 11. Gegenproben für die Abnahme

Codex soll sie als **Kettenreplay im Testlauf** ausführen. Die User17-Originale und meine Harness liegen bereit. Dabei sollen erste Antwort, Repair und Folgezüge laufen, nicht nur T11.

1. User17 treu: M1–M22 ab Original, T9 bindet an das Tor, T11 betritt Abschnitt 1 mit Torbegegnung; höchstens ein X-Aufruf in T9.
2. Kette A unverändert (Tor, „go down“, Eintritt, zweite Halle).
3. P4a echter Halt an anderer Kapelle bleibt Halt; P4b mit offenem PULSE wird nicht gebunden.
4. Pilot01 T61, Ashbridge „cooper lane“ (.190), Woolpack-Hof: unverändert abgelehnt.
5. Torziel mit Torwort endet am Tor; `enter.gate:true` bleibt.
6. Gebühr: am Tor, beim Eintritt vom Außenhalt (P14) und nach B; der Narrator erhält die Gebührenzeile, kein verwaister Abschnitt.
7. Unbekannter Dungeon (GO `{new}`): B greift nicht.
8. Zwei mögliche Dungeons im Realm: CLARIFY vor dem Schritt, B greift nicht.
9. Rückweg aus dem Dungeon über bekannte Abschnitte, Hindernis-CLARIFY, mit lesbarer Gegnerbezeichnung.
10. Party/Eskorte zum Dungeon: `arrive.with` bleibt, Begleiter stehen am Tor.
11. Save/Reload und Swipe nach T9: gleiche Identität.
12. Modellprobe (mit Freigabe): T9-Erstantwort mit neuem X-Kontext, mindestens 10 Wiederholungen, Anteil `arrive at: ID` gegen neue Kapelle; P2-Fall gezielt.
13. `user16_scene.mjs` reparieren und zusammen mit der User17-Kette in `npm test` aufnehmen.

## 12. Warum die Tests es nicht fanden

- Unit- und Szenariotests verwenden für das Tor die ID oder exakte Tornamen (der Patch-8-Fall). Die freie Beschreibung „Ruined chapel above the ford“ kommt nicht vor.
- Die automatischen Modellserien erreichen Old Crown fast immer direkt als Abschnitt (`l1_s1` …). Den Zwischenschritt „am Tor stehen und erzählerisch anhalten“ prüft keine Serie.
- **Repairtexte werden nicht auf semantische Ausfluchten geprüft.** Die .254-Prüfung wurde gegen Fälle abgenommen, in denen `arrived:false` die richtige Antwort war.
- Die einzige Kettenreplay mit Dungeonzugang von außen (User16) ist veraltet und nicht in `npm test`. Kettenfehler über mehrere Züge (falsche Identität in T9, Ablehnung in T11) fallen so in keinem Einzeltest auf.

**Künftig ganze Ortsketten testen:** Jeder persönliche Spieltest mit Ortsproblem wird als archivierte Kette in den Testlauf aufgenommen (Originalantworten plus wenige kontrollierte Ersatzantworten wie hier). Geprüft wird je Zug der Zustand (Ort, Eltern, Anker, Abschnitt), nicht nur die Ablehnungsliste.

## 13. Antworten auf die Abschlussfragen

1. **GPT-Befunde:**
   - **Bestätigt:** T9 als Ursprung, falsche Kapelle, Repair behält sie, acht Deltas ohne Ablehnung, `link.1` zur Wurzel, T10 ohne Dungeonbezug, T11 als berechtigter Schutz, Zeiten (T9 119,358 s, T11 63,812 s), R2-Verdacht Reisezeit.
   - **Teilweise:** „Modell erzeugt neue Kapelle“. Die Kontextlücke und der .254-Repairtext sind gleichrangige Ursachen. Ebenso die Empfehlung, Repairs beim Kippen von `arrived` zu sperren: Das Feld kann nicht unterscheiden, nur die Zielidentität.
   - **Übersehen:** `entranceOf` (Patch 8), die Wirkungslosigkeit von `arrived` auf die Buchung, der Schutzmangel bei `{new, parent: root}`, die konkurrierende Ankunftsprüfung Extract/World und der Eintritt von außen ohne Torbegegnung.
   - **Nichts Falsches gefunden.**
2. **Erste tatsächliche Ursache:** T9. X meldet das Tor des autorisierten Ziels als neue Stätte, weil die Engine ihm die Ziel-ID am Schritt nicht nennt und die Identität nur über Namen herstellt. Der .254-Repair macht den Widerspruch dann gültig.
3. **Regression oder Schwäche:** persistente Schwäche (Patch 8, 06.11., User16); durch .254 von „Ankunft abgelehnt“ zu „falsche Identität dauerhaft“ verschoben.
4. **Warum ungetestet:** §12.
5. **Behalten / zusammenführen / entfernen:** §9.
6. **Bevorzugte Variante:** B + A mit gemeinsamer Identitätsfunktion. Ein Prinzip statt Einzelregeln, im Sinne von Claim + State und der .190-Architektur, offline nachgewiesen.
7. **Risiken:** P4b in offenem Land (mit PULSE-Bedingung gemildert), P2 nur über A, Prompteffekt von A unbelegt.
8. **Minimale Umsetzung:** §10, Punkte 1–4 zusammen (etwa 60–80 Zeilen). Die Punkte 5 und 6 folgen getrennt.
9. **Gegenproben:** §11.
10. **Kleiner Fix oder Konsolidierung:** **gezielte Konsolidierung vor dem nächsten persönlichen Test.** Ein reiner Textfix (A) würde wieder auf Modellverhalten wetten. Ein weiterer Namens- oder Wortfix wäre der vierte Anlauf für dieselbe Kapelle. Die Punkte 1–4 sind klein, betreffen nur bekannte Ziele außerhalb von Siedlungen und passen ohne neue Architektur in die vorhandenen Funktionen. Für lange Kampagnen ist genau dieser Fall entscheidend: ein bekanntes Ziel, gewöhnlich erzählt.

## Anhang · Archivergänzung

[Archiv User17](../testrun_10b/user-20261128-051828-263/README.md): `originals/chat.jsonl` und `originals/avereth-events.json` byteidentisch mit dem Manifest. `originals/st-log.txt.gz` ist das redigierte UTF-16LE-Log.
- **Redigiert:** genau eine lokale Pfadangabe (Windows-Benutzername → `<redacted>`). BOM erhalten. +10 Bytes, entpackt 3.442.696 B, SHA-256 `e119dd16…7bdca`.
- **Unverändert:** Der Hash des privaten Originals bleibt nur als Herkunftsangabe. Weitere Pfade, Schlüssel oder Endpunkte sind im Log nicht enthalten (`127.0.0.1` ist der lokale ST-Server).
- **Prüfung:** [restore_log.py](../testrun_10b/user-20261128-051828-263/restore_log.py) prüft alle Dateien gegen [source_checksums.json](../testrun_10b/user-20261128-051828-263/source_checksums.json).
- **Feedbacktext:** bleibt unverändert, seine Byteidentität ist ausdrücklich **nicht** belegt.
