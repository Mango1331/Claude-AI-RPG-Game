# NPC E2/E3 – implementierungsreifer Fachplan

**Stand: 08.11.2026 · Plan, keine Freigabe.** Grundlage ist die [Ist- und Ursachenanalyse auf .168](../recherche/NPC_E2_E3_ISTANALYSE_20261108.md) (Befunde F1–F10, Beleglage [B]/[C]/[H]/[E]). Produktbuild `4.3.0-c.6.6.168` ([`8c7ee1f`](https://github.com/Mango1331/Claude-AI-RPG-Game/commit/8c7ee1f55f3d4c052d2baacb3790919e2396c980)) bleibt unverändert. Die [historische NPC-Analyse](../recherche/NPC_KONTINUITAET_ANALYSE_20261104.md) mit allen GPT-/Sol-Reviews bleibt Entscheidungsgeschichte. Etappennamen folgen [07 §2](../07_ROADMAP_NACH_10B_ENTWURF.md#2-npc-kontinuität--neue-fachliche-reihenfolge) (E2 Wiederbegegnungen/Absprachen, E3 Persönlichkeitsanker), nicht der alten E4–E6-Zählung.

Drei getrennt baubare und abnehmbare Pakete: **E2-A Integrität**, **E2-B Kontinuität**, **E3 Persönlichkeitsanker**.

---

## 1. Zielbild und Ausschlüsse

**Zielbild (spielerisch):**

1. Kehrt Alaric an einen Ort zurück, erkennt der Erzähler die dort bekannten Menschen **mit ihrem Wissen und ihrer gemeinsamen Geschichte**, ohne dass die Engine ihre Anwesenheit behauptet. Zeigt die Antwort sie, sind sie danach auch im Zustand anwesend.
2. Wer einen Auftrag am Schalter tatsächlich bearbeitet, weiß davon; ein danebenstehender Gast wird nicht zum Bearbeiter.
3. Zwei Schreiber bleiben zwei Menschen. Eine Gruppe ist Szenenfarbe, bis einer von ihnen handelt.
4. Ausdrückliche Absprachen zwischen Alaric und einer Person gehören zu dieser Person, bleiben bis zur Erledigung auf ihrer Karte und verschwinden danach nicht ins Ungefähre.
5. Wenige belegte, dauerhafte Merkmale (Stimme, Umgang, Interesse) machen wiederkehrende Personen unterscheidbar.

**Ausschlüsse (verbindlich):**

- Keine automatische Anwesenheit aus Arbeitsplatz oder `at`; Anwesenheit nur über erzählte und extrahierte Belege.
- Keine zweite autoritative NPC-Datenbank, keine Agenten pro NPC, kein zusätzlicher oder permanenter LLM-Prüfer, kein neuer Modellaufruf.
- Kein Beziehungs- oder Sympathiesystem, keine `attitude`-Kalibrierung (kampfwirksam über `sideOf`), keine Flirtpunkte.
- Keine formalen Privatquests aus Absprachen; keine Engine-Buchung von Versprechen.
- Kein `#npc pin`, keine Salienzskala über E3 hinaus (E4).
- Keine pauschale Budgeterhöhung.
- Keine Migration historischer Daten (Sammelpersonen, alte Faktobjekte bleiben, wie sie sind).
- Stealth S2, Kampf, Wirtschaft, PULSE D bleiben unberührt; PULSE A/C/B ohne Redesign.
- Die .158- und .168-Abnahmen werden nicht umgedeutet; bestehende Tests und Replayakzeptanzen werden nur ergänzt, nie gelockert.

---

## 2. Bestehende Regeln und neue Regeln

**Bestehende Regeln, die gelten und geschützt werden:** Kanon 02 (NPC-Wissen nur aus eigener Wahrnehmung; Gesprächskontinuität; Flirt ohne automatische Zuneigung). Decision Ownership: Vertragsstatus, Auszahlung, XP, Rang gehören der Engine (`stripOwned`). `witnessEvents` nur für Anwesende, kein rückwirkendes Wissen. Bekannte Personen von anderswo nur mit erzähltem Beleg (`absentKnown` + `presenceInReply`). Exakter Faktresolver (.158). Kompaktkarte höchstens vier Zeilen (.158). Ereignisquelle Record; Swipe, Reload und Replay deterministisch.

**Neue Regeln:**

| ID | Regel | Paket |
|---|---|---|
| R1 | Eine GO-Antwort meldet in `expected.<seq>.met` die Personen aus der angebotenen `KNOWN AT`-Liste, die die Antwort am erreichten Ort **zeigt**. Die Engine nimmt nur IDs an, die (a) im selben Zustand von `knownAt` für genau diesen Ort geliefert werden, (b) lebend, (c) nicht anwesend sind und (d) deren Ankunft gebucht wurde. | E2-A |
| R2 | Bei Annahme und Abgabe am Schalter meldet der Extractor in `expected.<seq>.handled_by` die Gildenperson, die die Antwort den Auftrag bearbeiten zeigt. Die Engine prüft Anwesenheit nach den Deltas, Gildenfunktion und Gildenhalle und gibt nur dieser Person das vorhandene Annahme-/Abschlusswissen als `witnessed`. Der wörtliche .158-Beleg bleibt Rückfall. | E2-A |
| R3 | `person.new` beschreibt genau einen Menschen. Eine Gruppe („two clerks“, „the guards“) wird nicht als Person gespeichert. | E2-A |
| R4 | `keptHere` bildet nie auf eine Person ab, die `distinct_from` ausschließt, und nie auf eine historische Sammelperson. | E2-A |
| R5 | Freie NPC-Aussagen/-Handlungen (Prädikate außerhalb der Record-/Funktionsprädikate) erscheinen im Abruf mit Sprecher und als Erzählung, nicht als Kampagnenwahrheit. | E2-A |
| R6 | Bei autorisiertem GO an einen Ort mit bekannten Personen erhalten diese die Gesprächspartnerslots als **Ankunftskarten** („NOT YET SHOWN“); die verlassene Person behält nur ihre Zeile in `present`. | E2-B |
| R7 | Ausdrückliche Absprachen sind `promise`/`debt`-Threads mit `who` (ein bis zwei NPC-IDs). Kein zusätzlicher freier Fakt für dieselbe Absprache. | E2-B |
| R8 | Die Karte zeigt offene Absprachen mit dieser Person. Ist eine erledigte Absprache jünger als die letzte bedeutsame Erinnerung, ersetzt die Zeile „settled“ in der Kompaktkarte die Zeile `last meaningful` (die vollständige Detailkarte behält beide). | E2-B |
| R9 | Eine Erinnerung verliert nur den Engine-Teil eines gemischten Satzglieds; ein sozialer Rest mit direkter Rede oder mindestens sechs Wörtern bleibt. | E2-B |
| R10 | `voice`, `manner`, `interest` sind Record-Prädikate mit je einem Wert. Sie werden nur aus gezeigtem Verhalten der anwesenden Person angenommen, nicht beim Erstkontakt, nicht als Stimmung, nicht als Meinung über Alaric. | E3 |

---

## 3. Architekturentscheidung

**Variante A**: bestehende Stores erweitern, strukturierte Extractorfelder in bestehenden Shapes, kompakte Kartenzeilen. Begründung in Analyse §8: Alle Befunde liegen an Übergängen (Beleg, Bindung, Auswahl), nicht an fehlendem Speicher. Variante B (eigener Beziehungs-/Gedächtnisspeicher) verletzt die Vorgabe gegen eine zweite autoritative Datenbank und vergrößert Budget, Migration und Konfliktfläche.

**Konkret:** keine neuen Eventtypen. Neue optionale Felder nur in bestehenden Shapes: `expected.go.met`, neues `expected`-Shape `desk` (`handled_by`), `thread.who`. Neue Record-Prädikate `manner`, `interest`. Alle übrigen Änderungen betreffen Firewall-Prüfungen und Kontextdarstellung. Wer in E2-A per `met`/`handled_by` eintritt oder Wissen erhält, tut das über die vorhandenen Events `scene.entered`, `entity.updated` und `knowledge.gained`.

---

## 4. Module und Funktionen

### E2-A Integrität

| Datei | Änderung |
|---|---|
| `content/deltas.json` | `expected.go`: Feld `met` (Liste von IDs aus `KNOWN AT` oder `null`) mit Summary „who of KNOWN AT this reply shows at the reached place (speaking, working, seen there); not those remembered, expected or said to be away“. Neues `expected.desk` `{handled_by}`: „the Guild person this reply shows handling Alaric's contract at the desk (taking/stamping the slip, paying out): an id, a ref of this answer's person.new, or null“. `person.new.summary`: „one individual; a group is scene colour until one of them acts, then that one is a person.new“. `distinct_from`: auch „a different person in the same role at this place“. |
| `src/v4/extract.js` | `EXPECTED_SHAPES.go` um `met: nullable string[]`; neues Shape `desk: {handled_by: nullable string}`. |
| `src/v4/commands.js` | `quest.accept` (L1292) und `quest.turn_in` (L1333): `ctx.expectedKeys[seq] = 'desk'`, wenn der Schritt am Schalter einer Gildenhalle stattfindet. GO unverändert (`KNOWN AT` bleibt). |
| `src/v4/world.js` | **`metArrivals()`** einmal nach Abschluss aller Ankunftsbuchungen der Antwort (`applyExpected` L857 ff., `arrive`-Deltas L993/L1016, Ankunftsprüfung L1578 ff.): für jede GO-`seq` mit `met`, deren gebuchtes Ziel dem aktuellen `scene.at` entspricht, `knownAt(stateVorAnkunft, content, ort)` neu berechnen (deterministisch auf demselben Zustand wie in `commands.go`, kein neues Outcomefeld) und jede `met`-ID gegen R1 prüfen, gültige über `v3({enter:[id]})` mit identischem Folgepfad wie `enter` (inkl. Abschlussnachtrag L1147). Ungültige → `reject(…, 'met_not_known_here' / 'met_without_arrival')`, keine Korrektur. **`deskHandler()`** nach allen Personen-/Anwesenheitsdeltas: `handled_by` über `mapRef`/`refs` auflösen; gültig nur anwesend, NPC, lebend, `firewallContext(s,content).isGuildPerson(id)`, `hallOf(s, s.scene.at)`. Dann `knowledge.gained {who, about: f.pc.accepted.<q> bzw. f.pc.completed.<q>, stance:'knows', source:'witnessed'}`, falls noch unbekannt. Ungültig → `reject(…, 'desk_handler')`. **`collectivePerson(d)`** in `case 'person.new'` vor allen Zuordnungen → `refusePerson('collective_person', …)`. **`keptHere(d)`** (L1945): Kandidaten ohne `d.distinct_from` und ohne Sammelpersonen. |
| `src/v4/domain.js` | `collectivePerson(role, desc)`: Zahlwort/Gruppenquantor am Anfang (`two`, `three`, `several`, `both`, `a pair of`, `a group of`, `a handful of`, `a crowd of`) **oder** Kopfnomen der Rolle ist die Pluralform eines Personennomens (`SERVICE_ROLE`-Plurale sowie `guards`, `soldiers`, `adventurers`, `workers`, `villagers`, `brothers`, `sisters`). Gleiche Funktion markiert Altbestände für R4. |
| `src/context.js` | Abrufitem `kind:'fact'` (L440): bei NPC-Subjekt und Prädikat außerhalb `RECORD_PREDICATES ∪ FUNCTIONAL` Label `<Sprecher> (story account, not engine state): <p> <o>`. |

### E2-B Kontinuität

| Datei | Änderung |
|---|---|
| `src/context.js` | **`arrivalPeople(state, content, outcome)`**: letzte autorisierte GO des Zugs mit `KNOWN AT`, Kandidaten = `knownAt(state, content, ziel)`, Rang: benannt > offene Absprache mit Alaric > bedeutsame gemeinsame Erinnerung > jüngste Begegnung; höchstens zwei. `buildContext`: liegen Ankunftspersonen vor, ersetzt Abschnitt `npc_arrival` (Prio 0, Kopf „ARRIVING AT <Ort> — people known there; NOT YET SHOWN: present only if the story shows them there“) den Abschnitt `npc_compact`. Die verlassene Person bleibt nur in `present`. E0 schreibt `npcIds`/`focusNpcIds` wie bisher. **`compactNpcCard`**: Reihenfolge `toward Alaric:` → `open between them:` / `settled between them:` (eine Zeile) → `last meaningful:` (entfällt, wenn `settled` nach R8 jünger ist) → `knows:` → `also remembers:`, die ersten drei vorhandenen, je 170 Zeichen (Vier-Zeilen-Grenze bleibt). Ankunftskarte ohne Position/Wahrnehmung (`absent`-Modus). **`npcCard`**: Zeilen `open between them:` (offene `promise`/`debt` mit `who ∋ id`, höchstens zwei, neueste zuerst) und `settled between them:` (R8). `KNOWN AT` im Erzählerblock nur noch für Personen ohne Ankunftskarte; der Extractor sieht die vollständige Liste weiter über `ctx.extra`. Abrufitem `kind:'thread'` (L451/452): `entities: t.who || []`. |
| `content/deltas.json` | `thread.fields.who` (nullable, ≤ 2 Refs). Summary für `promise`/`debt`: nur ausdrückliche Zusage zwischen Alaric und einer Person, inklusive ausdrücklich aufgeschobener Einladung mit Bedingung. Nicht: unbeantwortete Bitte, Höflichkeitsfloskel, abgelehntes Angebot, öffentliches Angebot (Board), engine-gebuchter Handel oder Auftrag. Regel „PERSON CONTINUITY“ um „an agreement is one thread, never also a fact“. |
| `src/v4/world.js` | `case 'thread'` (L1299): `who` über `mapRef` (auch Refs aus `person.new` dieser Antwort); nur existierende lebende NPCs, `pc` und Unbekanntes fallen aus dem Feld, der Thread selbst bleibt. Aktualisierung per `id` ohne `who` übernimmt das bisherige `who`. |
| `src/v4/ownership.js` | `stripOwned(text, {store:'memory'})` (L384): Ein besessenes Satzglied wird zusätzlich an Koordinationsgrenzen außerhalb von Anführungszeichen (`, and `, ` and `, `; `, `, then `) geteilt. Teilglieder ohne Besitzmuster bleiben mit dem Satzsubjekt des Glieds, aber nur mit direkter Rede oder ≥ 6 Wörtern (R9). Andere Stores unverändert. |
| `src/commands.js` | `#npc` (L329): Zeile „Open between you:“ aus Threads mit `who ∋ id` (Alaric ist Partei; keine Erzählerkarte, keine Geheimnisse). Nur bei Entscheidung D1 = ja. |

### E3 Persönlichkeitsanker

| Datei | Änderung |
|---|---|
| `src/knowledge.js` | `FUNCTIONAL` um `manner`, `interest`; `PRED_SYNONYMS`: `temperament`, `demeanor`, `demeanour`, `personality`, `disposition` → `manner`; `interests`, `hobby`, `cares_about`, `passion` → `interest`. |
| `src/context.js` | `RECORD_PREDICATES` um `manner`, `interest`. `npcCues` liefert `manner`, `interest`. Kopfzeile in `npcCard`: `• <Handle> — person, <Rolle>; voice: …; manner: …; interest: …; <look>`, also Anker vor `look`; der 170-Zeichen-Schnitt trifft zuerst den Einführungstext. |
| `src/v4/world.js` | `case 'fact'` mit NPC-Subjekt und `p ∈ {voice, manner, interest}`: R10-Prüfung **`anchorAllowed(id)`**: anwesend nach den Anwesenheitsdeltas dieser Antwort; Salienz nach Entscheidung D3 (benannt **oder** bedeutsame gemeinsame Erinnerung aus früherer Szene **oder** offene Absprache); `o` ≤ 80 Zeichen, nennt nicht Alaric/`pc`, besteht `stripOwned(store:'note')` ohne Besitzteil; höchstens ein Wert je Prädikat und Antwort. Sonst `reject(…, 'anchor_first_contact' / 'anchor_scope')` ohne Korrektur. |
| `content/deltas.json` | `fact`-Summary: „voice/manner/interest of a person: only a lasting trait this reply SHOWS in their own words or conduct and that would still hold next week; never this moment's mood, never Alaric's view of them, never invented backstory; a new value only when the reply shows a different lasting trait“. |

---

## 5. Daten- und Eventflüsse

**Rückkehr (E2-A + E2-B):**
Spieler „ich gehe zur Gildenhalle“ → Planner `go` → `commands.go`: Autorisierung, `KNOWN AT` in `ctx.extra`, `expectedKeys[seq]='go'` → Kontext: `npc_arrival` mit bis zu zwei Ankunftskarten (Wissen, Erinnerung, offene Absprache), Kennzeichnung NOT YET SHOWN → Narration → Extractor `expected.go = {arrived:true, at, with, met:[ids]}` → World: Ankunft (bestehend) → `metArrivals` → `scene.entered`, ggf. `entity.updated(at)`, ggf. Abschlussnachtrag → Fold → nächster Zug: Gesprächspartner sind die gezeigten Personen.

**Schalter (E2-A):**
`quest.accept`/`quest.turn_in` → Engine bucht Status, Fakt und bestehendes `witnessEvents` für Anwesende (unverändert), `expectedKeys[seq]='desk'` → Narration → Extractor `person.new`/`enter`/`met` + `expected.desk.handled_by` → World nach allen Personendeltas: `deskHandler` → `knowledge.gained(witnessed)` für den Bearbeiter → Karte des Bearbeiters zeigt die Annahme/Abgabe.

**Absprache (E2-B):**
Narration zeigt Zusage → Extractor `thread {id:null, kind:'promise', status:'open', text, who:[id]}` → World `thread.set` mit `who` → Karte `open between them` → spätere Erfüllung: `thread {id, status:'resolved', resolution}` → `who` bleibt → Karte `settled between them` (R8), bis eine jüngere bedeutsame Erinnerung mit der Person existiert.

**Anker (E3):**
Narration zeigt wiederholt eine Eigenart → Extractor `fact {s:id, p:'manner', o}` → World `anchorAllowed` → `fact.asserted` (funktional: ein neuer Wert beendet den alten) → Kartenkopf.

---

## 6. Felder und Autorität

| Feld | Speicher | Schreibt | Autorität / Prüfung | Sichtbar |
|---|---|---|---|---|
| `expected.go.met` | nur Antwort, wird zu `scene.entered` | Extractor | Engine: R1 gegen `knownAt` des Zustands | Erzähler (Folgezug), E0 |
| `expected.desk.handled_by` | nur Antwort, wird zu `knowledge.gained` | Extractor | Engine: anwesend, Gildenperson, Gildenhalle | Karte des Bearbeiters |
| `thread.who` | `threads[id].who` | Extractor | Engine: existierende lebende NPCs | Erzählerkarte, `#npc` (D1), Abruf |
| `fact manner/interest/voice` | `facts` (funktional) | Extractor | Engine: R10 | Kartenkopf |
| Ankunftskarte | nur Kontext | Engine | nicht autoritativ, keine Anwesenheit | Erzähler, E0 |
| Sprecherlabel | nur Kontext | Engine | Darstellung | Erzähler (Abruf) |

Kein Feld ist Spielerentscheidung; keines bucht Geld, Gegenstände, Zeit, Kampf oder Status.

---

## 7. Auswahl, Speicherung, Aktualisierung, Abruf

- **Auswahl Ankunftskarten:** nur bei autorisiertem GO mit nicht-leerem `KNOWN AT`; Kandidaten exakt `knownAt` (höchstens vier, bereits durch Ort/Leben/Abwesenheit gefiltert); Rang wie §4; Gleichstand nach `id`. Mehrteilige Reise: letzte Etappe mit `KNOWN AT`. Abgelehnte GO → keine Ankunftskarten.
- **Gesprächspartner danach:** unverändert `interlocutors` über `scene.present`; per `met` Eingetretene sind normale Anwesende.
- **Speicherung Absprachen:** ein Thread je Absprache; Update und Erledigung per Thread-ID. Kein Fakt `promise`/`offer` für dieselbe Sache (Extractor-Anleitung; die Engine verhindert Dopplungen nicht hart, siehe Risiko §11).
- **Erledigte Absprachen:** Karte zeigt `settled between them`, solange keine jüngere bedeutsame Erinnerung mit der Person existiert (D4); danach nur noch im Abruf (`Resolved thread …`, bestehend).
- **Anker:** funktional, jüngster gültiger Wert gilt; alter Wert bleibt als Fakt-Historie (`until`).
- **Abruf:** Threads mit `who` erhalten `entities`, damit `retrieveRelevant` sie bei Erwähnung der Person bevorzugt; keine Gewichtsänderung.

---

## 8. Wissens-, Anwesenheits- und Identitätsschutz

| Schutz | Umsetzung | Gegenfall |
|---|---|---|
| Keine erfundene Anwesenheit | `met` nur nach gebuchter Ankunft und nur für IDs aus `knownAt` dieses Orts; Ankunftskarten sind ausdrücklich NOT YET SHOWN | `met` mit Wirtin des Ausgangsorts, mit Toten, mit Harl Vess (`at = null`) → abgelehnt |
| Kein rückwirkendes Wissen | per `met` Eingetretene erhalten nur das, was sie selbst bezeugen (Abschlussnachtrag mit gleichem Szenen-/Epochenschutz) | später eintretender NPC ohne Bearbeitung → kein Wissen (.158-Test L132 bleibt) |
| Bystander bleibt Bystander | `handled_by` verlangt Gildenfunktion; `witnessEvents` für Anwesende bleibt unverändert (D9) | `handled_by` = wiry woman → abgelehnt |
| Identität | keine neuen Sammelpersonen; `keptHere` respektiert `distinct_from`, nie auf Sammelperson; Altbestand bleibt | „a clerk“ (Singular), „Tam Ostler“, Rolle „boss“/„mistress“ → normal |
| Erzählerkarte ≠ Spielerpanel | `#npc` zeigt nur Absprachen, an denen Alaric Partei ist | Geheimnisse/Agenda bleiben im Panel unsichtbar |
| Haltung unverändert | kein `attitude`, kein `relations`-Schreiben | `sideOf` unverändert |

---

## 9. Budget und Kosten

**Messbasis (Analyse §8):** Kompaktkarte ≈ 80–100 Tokens je Person; `budgetedTokens` der Rekonstruktionen 1278–2047 bei Budget 1400; Pflichtüberlauf entsteht überwiegend aus Gilden-/Markt-/Auflösungstexten.

| Paket | Erzählerkontext | Extractorprompt | Modellaufrufe |
|---|---|---|---|
| E2-A | 0 (nur Label im optionalen Abruf, ± 5 je Item) | ≈ +130 Tokens Regeltext; Shapes nur in Zügen mit GO/Schalter | 0 zusätzlich |
| E2-B | GO-Züge: Ankunftskarten ersetzen den Kompaktslot; `KNOWN AT` im Erzählerblock nur für Personen ohne Karte. Ziel ≤ +40 Tokens je GO-Zug. Absprachezeile ersetzt eine andere Kartenzeile (± 10) | ≈ +60 | 0 |
| E3 | Anker innerhalb des 170-Zeichen-Kopfs (± 10) | ≈ +60 | 0 |

**Messverfahren (Pflicht vor jedem Build):** `recherche/npc_e2_e3_probes/probe_context.mjs` vor und nach der Änderung auf User01 I61/I62/I69, User02 I62/I63/I73, User04 I71/I72/I73. Je Fall `budgetedTokens`, gelieferte/verworfene Abschnitte und NPC-IDs dokumentieren. **Abnahmegrenze:** kein neuer Prio-0-Abschnitt außer dem ersetzenden `npc_arrival`; GO-Züge ≤ +40 Tokens; Nicht-GO-Züge ≤ +15 Tokens. Bei Überschreitung zuerst Kartenzeilen kürzen, nie das Budget erhöhen. Extractorprompt-Zuwachs mit dem bestehenden Requestmessweg der PULSE-Pakete belegen.

---

## 10. Pakete

| Paket | Inhalt | Umfang | Voraussetzung | Eigenständig abnehmbar |
|---|---|---|---|---|
| **E2-A Integrität** | R1 `met`, R2 `handled_by`, R3 Sammelpersonen, R4 `keptHere`, R5 Sprecherlabel | **M** (≈ 5 Dateien, Kern in `world.js`; ≈ 12 Regressionen) | .158/.168 | ja: Anwesenheit/Wissen/Identität ohne Kontextumbau |
| **E2-B Kontinuität** | R6 Ankunftskarten, R7/R8 Absprachen mit `who`, Kartenreihenfolge, R9 Erinnerungsrest, `#npc`-Zeile (D1) | **M** (≈ 5 Dateien, Kern in `context.js`/`ownership.js`; ≈ 10 Regressionen) | E2-A | ja |
| **E3 Persönlichkeitsanker** | R10 `manner`/`interest`/`voice`, Kopfzeile, Salienzschwelle | **S–M** (≈ 4 Dateien; ≈ 8 Regressionen) | E2-A; Salienz nutzt `thread.who` aus E2-B, ohne E2-B nur Name/Erinnerung | ja |

**Reihenfolge: E2-A → E2-B → E3.** E2-A zuerst, weil Ankunftskarten und Absprachen auf falscher Identität oder fehlender Anwesenheit den Fehler vergrößern würden (Analyse §4.3). E2-A ist außerdem der kleinste Schritt mit direkt belegtem Spielfehler (User04 I64/I72/I74). Jedes Paket hat eigenen Build, eigene Patchnote und eigene Abnahme und endet mit Stopp.

---

## 11. Abhängigkeiten, Risiken, Integrationsprüfungen

| Risiko | Wirkung | Gegenmaßnahme |
|---|---|---|
| Extractor füllt `met` zu großzügig **[H]** | Person anwesend, die die Antwort nur erwähnt | nur angebotene IDs desselben Orts; Summary schließt Erinnerung/Erwartung aus; natürlicher Test zählt Fehlbuchungen |
| Extractor lässt `met`/`handled_by` leer **[H]** | Verbesserung bleibt aus, kein Schaden | Rückfall auf heutiges Verhalten (wörtlicher Beleg) |
| Sammelpersonenregel trifft Einzelne | Person fehlt | enge Wortliste, Singularkontrolle, Gegenfälle §12 |
| Ankunftskarten verdrängen nötigen Kontext | Budget | Ersatz statt Zusatz, Messgrenze §9 |
| Absprachen-Inflation | Karten voller Floskeln | enge Summary, `who` Pflicht für Kartenanzeige, natürlicher Test |
| Dopplung Fakt + Thread bleibt | doppelte Zeile im Abruf | Anleitung; harte Engine-Deduplizierung erst bei Messbefund |
| `stripOwned`-Teilung lässt Besitz durch | zweite Wahrheit in Erinnerung | nur `store:'memory'`, Besitzprüfung je Teilglied, bestehende Ownershiptests unverändert grün |
| Anker aus Einzelreaktion | starre Figur | Salienzschwelle D3, funktionales Ersetzen |

**Integrationsprüfungen je Paket:** vollständige `npm test`-Suite. Replay gegen `.126`-Baseline (2235 Fälle) mit kategorisierter neuer Akzeptanzliste je Paket; alte Listen bleiben unverändert. Erwartete Verschiebungen: E2-A Sammelpersonen in historischen Antworten werden abgelehnt, Folgereferenzen darauf verschieben sich; E2-B Thread-`who` nur bei neuen Antworten, historische Threads ohne `who`. PULSE-Akzeptanzen `accepted_pulse164/167` unverändert. `heldThreats` liest nur Bedrohungen. ST-Smokes (Start, GO mit `KNOWN AT`, Schalter, Swipe/Regenerate mit E0-Aktualisierung, Save/Reload). Fold alter Saves (Threads ohne `who`, keine Anker). Stealth-S1-Beobachter: per `met` Eingetretene zählen als Anwesende, Ankunftskarten nicht.

---

## 12. Testmatrix (Rot/Grün) und Host-Abnahme

**Rot** = auf .168 als fehlschlagend erwartet: belegt durch eine Probe der Analyse (A4, A5, B1, B3, B4) oder weil das geprüfte Feld/Verhalten auf .168 nicht existiert (A1–A3, A6, B2, C1). Der Fehlschlag ist vor der Umsetzung als Test tatsächlich nachzuweisen. Grundlage sind Originalzustände und Originalprosa der Fixtures/Läufe mit synthetischen Extractorantworten, wie in `fix158_continuity.test.js` und `probe_keep.mjs`.

| ID | Paket | Ausgangszustand | Handlung | Erwartete autoritative Events | Erwartete Kontextauslieferung | Gegenfälle |
|---|---|---|---|---|---|---|
| A1 **rot** | E2-A | User04 nach I71 (GO zur Halle) | Prosa I72, `expected.1 = {arrived:true, at:hall, met:[crossbowman]}` | `scene.entered(npc.npcbench_crossbowman)` | I73: Crossbowman als Gesprächspartnerkandidat | `met:[npc.npcoar_innkeeper]` → `met_not_known_here`; `arrived:false` + `met` → kein Eintritt; Toter; `npc.harl_vess` (`at=null`) → abgelehnt |
| A2 **rot** | E2-A | User04 nach I73 (Annahme), Halle | Prosa I74, `person.new` älterer Schreiber + `expected.desk.handled_by = ref` | Eintritt + `knowledge.gained(<neu>, f.pc.accepted.quest.slay_the_marsh_titan…, witnessed)` | Bearbeiterkarte `knows: … accepted …` | `handled_by = npc.npcnpcwiry_woman` → `desk_handler`; abwesende ID → abgelehnt; ohne `handled_by` → heutiges Verhalten (kein Wissen) |
| A3 **rot** | E2-A | User04 vor I64-Antwort | Originalprosa I64 („She counted …“), `enter` Schreiber wie im Original, zusätzlich `expected.desk.handled_by = npc.npcguild_clerks` | `knowledge.gained(npc.npcguild_clerks, f.pc.completed.…catacombs…, witnessed)` | I66: Karte mit Abschlusswissen | ohne `handled_by` bleibt der .158-Literaltest maßgeblich (false); Bearbeiter erst nach anderer Person eingetreten → kein Wissen |
| A4 **rot** | E2-A | User04 vor I6-Antwort | `person.new` „Two clerks working the long counter …“ | `delta.rejected(collective_person)`, keine Entität | — | „the nearer clerk — a grey-haired woman …“ → Entität; „a clerk“; Rolle „boss“; benannte Gruppe „the Brannock brothers“ → abgelehnt |
| A5 **rot** | E2-A | User04 nach I71 (Probe `probe_keep` a) | `person.new` unbenannter Schreiber „older man …“ | neue Entität statt `scene.entered(npc.npcguild_clerks)` (R4: nie auf Sammelperson) | — | Einzelperson als einziger Kandidat **ohne** `distinct_from` → weiter Abbildung (heutiges Verhalten); **mit** `distinct_from` → neue Entität |
| A6 **rot** | E2-A | User04 Endzustand | Abruf mit „catacombs posting“ | — | Abrufzeile beginnt mit Sprecher, als Erzählung gekennzeichnet | Record-Prädikate (`occupation`) und Funktionsfakten unverändert |
| B1 **rot** | E2-B | User01 nach I61 (GO zur Halle) | Kontextaufbau | — | `npc_arrival` mit Brenna (+ Doran), NOT YET SHOWN, Wissen/Erinnerung; **keine** Kompaktkarte Marda; E0 `npcIds` enthält Brenna; Extractor-Actions enthalten volle `KNOWN AT` | GO an neuen Ort ohne `KNOWN AT` → heutiges Verhalten; abgelehnte GO → keine Ankunftskarte; tote Person → keine Karte; Budgetgrenze §9 |
| B2 **rot** | E2-B | User02 vor I54-Antwort | `thread {kind:'promise', who:[Tam]}`; später I58 Erledigung per `id` ohne `who` | `thread.set` mit `who:[npc.npcguild_clerk]`; nach I58 `who` erhalten, `status:'resolved'` | Tams Karte I55 `open between them: …`; I72/I73 `settled between them: …` statt der alten Versprechenserinnerung | `who` = unbekannte Ref → Feld fällt weg, Thread bleibt; `who:['pc']` → fällt weg |
| B3 **rot** | E2-B | User01 I69 | Kontextaufbau | — | Brennas Karte: `knows` vor `also remembers` | Person ohne Wissen → unverändert; Vier-Zeilen-Grenze bleibt |
| B4 **rot** | E2-B | User02 I14 | Erinnerung „Tam Ostler stamped the Glimmerdeep contract active and wished Alaric luck: '…settle that drink.'“ | `memory.recorded` „Tam Ostler wished Alaric luck: '…'“ | — | „paid him sixty copper and nodded“ → weiter abgelehnt (Rest zu kurz); Besitzmuster im Rest → abgelehnt; I10 → „Tam Ostler handed him his Guild plate“ oder Ablehnung nach Entscheidung des Besitzmusters für Gegenstände |
| B5 | E2-B | User04 nach I66 | `#npc` zur Person mit `who`-Thread (D1) | — | Panel „Open between you: …“, keine Geheimnisse | Thread ohne Alaric als Partei → nicht im Panel |
| C1 **rot** | E3 | User01 Brenna anwesend, benannt | synthetisch `fact {s:Brenna, p:'manner', o:'dry, unhurried, keeps strangers at a ledger's length'}` | `fact.asserted` | Kopf `…; manner: …; <look gekürzt>` ≤ 170 | unbenannter Erstkontakt → `anchor_first_contact`; abwesend → abgelehnt; `o` nennt Alaric → abgelehnt; > 80 Zeichen → abgelehnt; zwei `manner` in einer Antwort → nur der erste |
| C2 | E3 | wie C1 | später anderer `manner` | alter Fakt `until`, neuer gilt | Kopf mit neuem Wert | `temperament` → `manner` normalisiert |
| C3 | E3 | beliebig | ganze Suite | keine `attitude`/`relations`-Events durch E3 | — | `sideOf` unverändert |

**Host-Abnahme je Paket (natürlicher Lauf, vom Nutzer gespielt):**

1. Mit einer Schreiberin sprechen, den Ort verlassen, schlafen, zurückkehren: Sie wird erkannt (Name/Wissen), ist nach der Antwort anwesend (E2-A), ihre Karte erscheint schon in der Ankunftsantwort (E2-B).
2. Annahme und Abgabe mit frei formulierter Bearbeitung („she took the slip …“): Bearbeiter weiß davon.
3. Zwei Schreiber werden unterscheidbar geführt.
4. Eine Absprache treffen und später einlösen: Karte zeigt offen, danach erledigt; keine Floskeln als Absprachen.
5. Wiederkehrende benannte Person: ab der zweiten Szene höchstens wenige Anker, kein Erstkontakt-Profil (E3).
6. E0 zeigt keine neue Überlaufquelle; keine erfundene Anwesenheit; Swipe/Reload ohne Abweichung.

---

## 13. Offene Designentscheidungen mit Empfehlung

| # | Frage | Empfehlung |
|---|---|---|
| D1 | Zeigt `#npc` offene Absprachen mit der Person? | **Ja**, nur Threads mit Alaric als Partei; keine Erzählerkarte |
| D2 | Persönlichkeit nur aus Narration, nicht aus Spielerbehauptung? | **Ja**, nur gezeigtes Verhalten der Person |
| D3 | Schwelle für Anker | **ab zweiter Szene** (benannt, frühere bedeutsame Erinnerung oder offene Absprache); Alternative „sofort“ nur bei Messbefund |
| D4 | Wie lange bleibt eine erledigte Absprache auf der Karte? | bis eine jüngere bedeutsame Erinnerung mit der Person existiert |
| D5 | Historische Sammelpersonen | **keine Migration**; bleiben nutzbar, nie Ziel von `keptHere` |
| D6 | Zählt ein ausdrücklich aufgeschobenes Angebot mit Bedingung (Brenna-Dinner) als Absprache? | **Ja**, als `promise` mit `who`; ohne Bedingung nur Erinnerung |
| D7 | `#npc pin` | außerhalb E2/E3 (E4) |
| D8 | Budgeterhöhung | **nein**; Ersatzprinzip und Messgrenze §9 |
| D9 | Behält ein anwesender Bystander das Annahmewissen (wiry woman I73)? | **ja**, sie war anwesend und aufmerksam; nur der Bearbeiter kommt hinzu |
| D10 | Soziale Erinnerungen einer abgelehnten, nicht angeforderten Szenenverlagerung (Tam I56) | **beibehalten wie .158**; kein E2-Punkt |
| D11 | Gilt das Weitergeben einer Guild-Plakette als Engine-Besitz (B4-Gegenfall I10)? | am bestehenden Besitzmuster entscheiden; keine neue Besitzkategorie in E2-B |

---

## 14. Freigabegrenze

- **Mit diesem Dokument ist nichts freigegeben.** Produktcode, Tests, Replayakzeptanzen und Build .168 bleiben unverändert.
- Jedes Paket (E2-A, E2-B, E3) braucht eine **eigene ausdrückliche Freigabe** und endet mit eigenem Build, Patchnote, Rot/Grün-Nachweis, Suite, kategorisiertem Replay, ST-Smokes, Budgetmessung nach §9 und Stopp.
- Ein Paket darf die Grenzen der anderen nicht vorziehen; Abweichungen vom Plan werden in der Patchnote begründet.
- Nicht Teil von E2/E3: Beziehungsverlauf, Salienzskala, Pinning, NPC-Eigenleben, PULSE D, Stealth S2, Kampf, Wirtschaft.
